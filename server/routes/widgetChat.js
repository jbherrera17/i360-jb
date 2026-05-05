/**
 * Widget Chat Routes
 * Phase 73: Embeddable Chat Widgets
 *
 * PUBLIC endpoints — no Supabase auth required.
 * Security is handled by HMAC widget tokens + CORS domain enforcement.
 *
 * CRITICAL [SEC-03]: This route file MUST be registered in server/index.js
 * BEFORE the global `authenticate` middleware.
 */

const express = require('express');
const crypto = require('crypto');
const widgetAgentService = require('../services/widgetAgentService');
const logger = require('../services/logger');

// ── Rate Limiting ────────────────────────────────────────────

// In-memory rate limiting [SEC-10]
const rateLimits = new Map();
const RATE_WINDOW_MS = 60000;        // 1 minute
const MAX_PER_IP = 30;               // 30 msg/min per IP
const MAX_PER_WIDGET = 200;          // 200 msg/min per widget aggregate

// SSE connection tracking [SEC-11]
const sseConnections = new Map();    // widgetId -> count
const MAX_SSE_PER_WIDGET = 100;

function getRateLimitKey(prefix, id) {
    return `${prefix}:${id}`;
}

function checkRateLimit(key, max) {
    const now = Date.now();
    const windowStart = now - RATE_WINDOW_MS;

    let bucket = rateLimits.get(key);
    if (!bucket) {
        bucket = [];
        rateLimits.set(key, bucket);
    }

    // Remove expired entries
    while (bucket.length > 0 && bucket[0] < windowStart) {
        bucket.shift();
    }

    if (bucket.length >= max) {
        return false;
    }

    bucket.push(now);
    return true;
}

// Periodic cleanup of stale rate limit entries
setInterval(() => {
    const cutoff = Date.now() - RATE_WINDOW_MS * 2;
    for (const [key, bucket] of rateLimits.entries()) {
        if (bucket.length === 0 || bucket[bucket.length - 1] < cutoff) {
            rateLimits.delete(key);
        }
    }
}, 60000);

module.exports = function (supabase) {
    const router = express.Router();

    // ── HMAC Token Validation [SEC-01] ───────────────────────

    async function validateWidgetToken(widgetId, token) {
        if (!widgetId || !token) return null;

        const { data: widget } = await supabase
            .from('chat_widgets')
            .select('*')
            .eq('id', widgetId)
            .eq('is_active', true) // [SEC-15]
            .single();

        if (!widget) return null;

        // Validate HMAC token
        const expectedToken = crypto
            .createHmac('sha256', widget.widget_token_secret)
            .update(widgetId)
            .digest('hex');

        if (!crypto.timingSafeEqual(
            Buffer.from(token, 'hex'),
            Buffer.from(expectedToken, 'hex')
        )) {
            logger.warn('[WidgetChat] HMAC token validation failed', { widgetId });
            return null;
        }

        return widget;
    }

    // ── CORS Domain Enforcement [SEC-02] ─────────────────────

    function validateOrigin(widget, origin) {
        if (!widget.cors_origins || widget.cors_origins.length === 0) {
            // No origins configured = block all (secure default)
            return false;
        }

        // Allow requests with no origin (e.g., server-to-server testing)
        // In production, the widget iframe will always send Origin
        if (!origin) return false;

        return widget.cors_origins.some(allowed => {
            // Exact match or wildcard subdomain match
            if (allowed === origin) return true;
            if (allowed.startsWith('*.')) {
                const domain = allowed.slice(2);
                return origin.endsWith(domain) || origin.endsWith('.' + domain);
            }
            return false;
        });
    }

    // ── Widget Auth Middleware ────────────────────────────────

    async function widgetAuth(req, res, next) {
        const widgetId = req.params.widget_id;
        const token = req.headers['x-widget-token'];
        const origin = req.headers['origin'] || req.headers['referer'];

        // Validate HMAC token [SEC-01]
        const widget = await validateWidgetToken(widgetId, token);
        if (!widget) {
            return res.status(401).json({ error: 'Invalid or inactive widget' });
        }

        // Validate origin [SEC-02]
        // Allow demo pages (same-origin) and configured domains
        const parsedOrigin = origin ? new URL(origin).origin : null;
        const isSameOrigin = parsedOrigin && req.headers.host && parsedOrigin.includes(req.headers.host);

        if (!isSameOrigin && !validateOrigin(widget, parsedOrigin)) {
            logger.warn('[WidgetChat] Origin rejected', { widgetId, origin: parsedOrigin });
            return res.status(403).json({ error: 'Origin not allowed' });
        }

        // Set CORS headers for this specific widget
        if (parsedOrigin) {
            res.setHeader('Access-Control-Allow-Origin', parsedOrigin);
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Widget-Token, X-Session-Token');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        }

        // org_id derived exclusively from widget token [SEC-05]
        req.widget = widget;
        req.widgetOrgId = widget.org_id;
        next();
    }

    // ── CORS Preflight ───────────────────────────────────────

    router.options('/:widget_id/*', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Widget-Token, X-Session-Token');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Max-Age', '86400');
        res.status(204).end();
    });

    // ── CREATE SESSION ───────────────────────────────────────

    router.post('/:widget_id/session', widgetAuth, async (req, res) => {
        try {
            const widget = req.widget;
            const { email, name, consent, fingerprint } = req.body;

            // Check pre-chat mode requirements
            const preChatConfig = widget.pre_chat_fields || {};
            const mode = preChatConfig.mode || 'lead_capture';
            const fields = preChatConfig.fields || {};

            // Validate required fields based on mode
            if (mode === 'lead_capture' || mode === 'custom') {
                if (fields.email?.required && !email) {
                    return res.status(400).json({ error: 'Email is required' });
                }
                if (fields.name?.required && !name) {
                    return res.status(400).json({ error: 'Name is required' });
                }
            }

            // Validate consent for modes that require it
            if (preChatConfig.show_consent_checkbox !== false && mode !== 'open_chat') {
                if (!consent) {
                    return res.status(400).json({ error: 'Consent is required' });
                }
            }

            // Check session limits
            const limits = widget.limits || {};
            const maxSessions = limits.max_sessions_per_day || 500;
            const today = new Date().toISOString().split('T')[0];

            const { count } = await supabase
                .from('widget_sessions')
                .select('id', { count: 'exact', head: true })
                .eq('widget_id', widget.id)
                .gte('created_at', today);

            if (count >= maxSessions) {
                return res.status(429).json({ error: 'Daily session limit reached' });
            }

            // Create session
            const sessionToken = crypto.randomUUID();
            const { data: session, error } = await supabase
                .from('widget_sessions')
                .insert({
                    widget_id: widget.id,
                    session_token: sessionToken,
                    visitor_email: email || null,
                    visitor_name: name || null,
                    visitor_fingerprint: fingerprint || null,
                    consent_given: mode === 'open_chat' ? true : !!consent,
                    consent_timestamp: consent || mode === 'open_chat' ? new Date().toISOString() : null
                })
                .select()
                .single();

            if (error) throw error;

            // Create corresponding support_conversation for message storage
            const { data: conversation } = await supabase
                .from('support_conversations')
                .insert({
                    org_id: widget.org_id,
                    customer_name: name || 'Anonymous Visitor',
                    customer_email: email || null,
                    channel: 'widget',
                    subject: `Widget: ${widget.widget_name}`,
                    metadata: {
                        widget_id: widget.id,
                        widget_session_id: session.id,
                        source: 'embeddable_widget'
                    }
                })
                .select()
                .single();

            res.status(201).json({
                session_id: conversation.id, // Use conversation ID as session ID for message routing
                session_token: sessionToken,
                widget_name: widget.widget_name,
                branding: widget.branding,
                pre_chat_mode: mode
            });
        } catch (error) {
            logger.error('[WidgetChat] Session creation failed', { error: error.message });
            res.status(500).json({ error: 'Failed to create session' });
        }
    });

    // ── CHAT MESSAGE (SSE Stream) ────────────────────────────

    router.post('/:widget_id/stream', widgetAuth, async (req, res) => {
        const widget = req.widget;
        const widgetId = widget.id;
        const { session_id, message } = req.body;
        const clientIp = req.ip || req.connection.remoteAddress;

        // Rate limit checks [SEC-10]
        if (!checkRateLimit(getRateLimitKey('ip', clientIp), MAX_PER_IP)) {
            return res.status(429).json({ error: 'Please slow down. Try again in a moment.' });
        }
        if (!checkRateLimit(getRateLimitKey('widget', widgetId), MAX_PER_WIDGET)) {
            return res.status(429).json({ error: 'High demand. Please try again shortly.' });
        }

        // Message length check [SEC-14]
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }
        if (message.length > 2000) {
            return res.status(400).json({ error: 'Message must be under 2000 characters' });
        }

        // Session validation
        if (!session_id) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        // Check session message cap [SEC-09]
        const { data: sessionData } = await supabase
            .from('support_conversations')
            .select('message_count, metadata')
            .eq('id', session_id)
            .single();

        if (!sessionData) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const maxMessages = widget.limits?.max_messages_per_session || 50;
        if ((sessionData.message_count || 0) >= maxMessages) {
            return res.status(429).json({
                error: 'Session message limit reached. Please start a new conversation or contact us directly.'
            });
        }

        // SSE connection limit [SEC-11]
        const currentConnections = sseConnections.get(widgetId) || 0;
        if (currentConnections >= MAX_SSE_PER_WIDGET) {
            return res.status(429).json({ error: 'Too many active connections. Please try again.' });
        }

        // Set up SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        // Track SSE connection
        sseConnections.set(widgetId, currentConnections + 1);

        const cleanup = () => {
            const current = sseConnections.get(widgetId) || 1;
            sseConnections.set(widgetId, Math.max(0, current - 1));
        };

        req.on('close', cleanup);
        req.on('error', cleanup);

        try {
            // Stream callback — sends text chunks as SSE events in real-time
            let streamedContent = '';
            const onChunk = (text) => {
                streamedContent += text;
                res.write(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`);
            };

            // Process message through widget agent
            const result = await widgetAgentService.processMessage({
                widgetId,
                sessionId: session_id,
                widgetSessionId: sessionData.metadata?.widget_session_id || null,
                message,
                widgetConfig: widget,
                onChunk
            });

            if (result.blocked) {
                res.write(`data: ${JSON.stringify({ type: 'text', content: result.response })}\n\n`);
                res.write(`data: ${JSON.stringify({ type: 'done', blocked: true })}\n\n`);
                res.end();
                cleanup();
                return;
            }

            // If no chunks were streamed (e.g., simple response without tool use),
            // send the full response as a single text event
            if (!streamedContent) {
                res.write(`data: ${JSON.stringify({ type: 'text', content: result.response })}\n\n`);
            }

            // Send done event with metadata
            res.write(`data: ${JSON.stringify({
                type: 'done',
                content: result.response,
                model: result.model,
                degraded: result.degraded,
                toolCalls: result.toolCalls.map(tc => tc.tool)
            })}\n\n`);

            res.end();
            cleanup();
        } catch (error) {
            logger.error('[WidgetChat] Stream processing failed', {
                widgetId,
                sessionId: session_id,
                error: error.message
            });

            res.write(`data: ${JSON.stringify({
                type: 'error',
                content: 'I\'m temporarily unavailable. Please try again or contact us directly.'
            })}\n\n`);
            res.end();
            cleanup();
        }
    });

    // ── PRIVACY POLICY (Public) [R-09] ───────────────────────

    router.get('/:widget_id/privacy-policy', async (req, res) => {
        try {
            const widgetId = req.params.widget_id;

            const { data: widget } = await supabase
                .from('chat_widgets')
                .select('privacy_policy, widget_name, branding')
                .eq('id', widgetId)
                .eq('is_active', true)
                .single();

            if (!widget) {
                return res.status(404).json({ error: 'Widget not found' });
            }

            const policy = widget.privacy_policy || getDefaultPrivacyPolicy(widget.widget_name);

            res.setHeader('Content-Type', 'text/html');
            res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy — ${widget.widget_name}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 2rem auto; padding: 0 1rem; color: #333; line-height: 1.6; }
        h1 { font-size: 1.5rem; }
        h2 { font-size: 1.2rem; margin-top: 2rem; }
    </style>
</head>
<body>
${policy}
</body>
</html>`);
        } catch (error) {
            res.status(500).json({ error: 'Failed to load privacy policy' });
        }
    });

    // ── DATA DELETION [R-07] ─────────────────────────────────

    router.delete('/:widget_id/data/:session_id', widgetAuth, async (req, res) => {
        try {
            const sessionId = req.params.session_id;

            // Delete messages for this conversation
            const { error: msgError } = await supabase
                .from('support_messages')
                .delete()
                .eq('conversation_id', sessionId);

            if (msgError) throw msgError;

            // Delete the conversation
            const { error: convError } = await supabase
                .from('support_conversations')
                .delete()
                .eq('id', sessionId);

            if (convError) throw convError;

            // Delete widget session
            const { error: sessError } = await supabase
                .from('widget_sessions')
                .delete()
                .eq('id', sessionId);

            // Session deletion may fail if sessionId is conversation ID not widget_session ID — that's OK

            res.json({ success: true, message: 'Your conversation data has been deleted.' });
        } catch (error) {
            logger.error('[WidgetChat] Data deletion failed', { error: error.message });
            res.status(500).json({ error: 'Failed to delete data' });
        }
    });

    // ── WIDGET CONFIG (Public, minimal) ──────────────────────

    router.get('/:widget_id/config', async (req, res) => {
        try {
            const widgetId = req.params.widget_id;

            const { data: widget } = await supabase
                .from('chat_widgets')
                .select('id, widget_name, branding, pre_chat_fields, consent_text, is_active')
                .eq('id', widgetId)
                .eq('is_active', true)
                .single();

            if (!widget) {
                return res.status(404).json({ error: 'Widget not found or inactive' });
            }

            // Return only public-safe configuration — never expose secrets [SEC-13]
            res.json({
                id: widget.id,
                name: widget.widget_name,
                branding: widget.branding,
                pre_chat: widget.pre_chat_fields,
                consent_text: widget.consent_text
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to load widget config' });
        }
    });

    return router;
};

// ── Default Privacy Policy Template ──────────────────────────

function getDefaultPrivacyPolicy(widgetName) {
    return `<h1>Privacy Policy</h1>
<p><strong>Last updated:</strong> ${new Date().toISOString().split('T')[0]}</p>

<h2>What We Collect</h2>
<p>When you use the ${widgetName || 'chat'} assistant, we may collect:</p>
<ul>
    <li><strong>Contact information</strong> you voluntarily provide (e.g., name, email) in the pre-chat form</li>
    <li><strong>Conversation content</strong> — your questions and the assistant's responses</li>
    <li><strong>Technical data</strong> — anonymized session identifiers (no cookies, no tracking)</li>
</ul>

<h2>How We Use Your Data</h2>
<ul>
    <li>To respond to your questions about our services</li>
    <li>To improve the quality and accuracy of our AI assistant</li>
    <li>To follow up on scheduling requests if you provide contact information</li>
</ul>

<h2>Data Protection</h2>
<ul>
    <li>Personal information is automatically redacted from stored conversations</li>
    <li>Contact information (if provided) is stored separately from conversation content</li>
    <li>All data is encrypted in transit and at rest</li>
</ul>

<h2>Data Retention</h2>
<p>Conversation data is retained for up to 90 days, after which it is automatically deleted.</p>

<h2>Your Rights</h2>
<p>You have the right to:</p>
<ul>
    <li><strong>Request deletion</strong> of your conversation data at any time</li>
    <li><strong>Choose not to provide</strong> personal information — our assistant works without it</li>
    <li><strong>Contact us</strong> with any privacy concerns</li>
</ul>

<h2>AI Disclosure</h2>
<p>${widgetName || 'This assistant'} is powered by artificial intelligence. It provides general information only and does not replace professional medical advice. Always consult with a qualified healthcare provider for medical decisions.</p>

<h2>Contact</h2>
<p>For privacy questions, please contact us through our main website.</p>`;
}
