/**
 * Support Conversation Routes
 * Phase 71: Customer Support Agent System
 *
 * CRUD for support conversations + message processing + metrics
 */

const express = require('express');
const createModuleAccessMiddleware = require('../middleware/moduleAccess');
const supportAgentService = require('../services/supportAgentService');

module.exports = function (supabase) {
    const router = express.Router();
    const { requireModule, checkResourceLimit } = createModuleAccessMiddleware(supabase);

    // All routes require support_ai module
    router.use(requireModule('support_ai'));

    // ── CREATE CONVERSATION ──────────────────────────────────
    router.post('/', checkResourceLimit('support_conversations'), async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.body?.org_id;
            if (!orgId) {
                return res.status(400).json({ success: false, error: 'org_id is required' });
            }

            const {
                customer_name, customer_email, customer_metadata,
                subject, channel, priority, idempotency_key
            } = req.body;

            // Idempotency check
            if (idempotency_key) {
                const { data: existing } = await supabase
                    .from('support_conversations')
                    .select('*')
                    .eq('org_id', orgId)
                    .eq('idempotency_key', idempotency_key)
                    .single();

                if (existing) {
                    return res.status(200).json({ success: true, data: existing, deduplicated: true });
                }
            }

            const { data, error } = await supabase
                .from('support_conversations')
                .insert({
                    org_id: orgId,
                    customer_name: customer_name || null,
                    customer_email: customer_email || null,
                    customer_metadata: customer_metadata || {},
                    subject: subject || null,
                    channel: channel || 'widget',
                    priority: priority || 'normal',
                    idempotency_key: idempotency_key || null
                })
                .select()
                .single();

            if (error) throw error;
            res.status(201).json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ── LIST CONVERSATIONS ───────────────────────────────────
    router.get('/', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.query.org_id;
            if (!orgId) {
                return res.status(400).json({ success: false, error: 'org_id is required' });
            }

            let query = supabase
                .from('support_conversations')
                .select('*')
                .eq('org_id', orgId)
                .order('created_at', { ascending: false });

            if (req.query.status) query = query.eq('status', req.query.status);
            if (req.query.intent) query = query.eq('intent', req.query.intent);
            if (req.query.priority) query = query.eq('priority', req.query.priority);
            if (req.query.limit) query = query.limit(parseInt(req.query.limit));

            const { data, error } = await query;
            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ── METRICS DASHBOARD ────────────────────────────────────
    // NOTE: Must be registered BEFORE /:id to avoid Express treating "metrics" as a conversation ID
    router.get('/metrics/dashboard', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.query.org_id;
            if (!orgId) {
                return res.status(400).json({ success: false, error: 'org_id is required' });
            }

            // Aggregate metrics
            const [
                { data: totalConvs },
                { data: openConvs },
                { data: escalatedConvs },
                { data: resolvedConvs },
                { data: avgCsat },
                { data: totalActions }
            ] = await Promise.all([
                supabase.from('support_conversations').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
                supabase.from('support_conversations').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'open'),
                supabase.from('support_conversations').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'escalated'),
                supabase.from('support_conversations').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'resolved'),
                supabase.from('support_conversations').select('csat_score').eq('org_id', orgId).not('csat_score', 'is', null),
                supabase.from('support_actions').select('id', { count: 'exact', head: true }).eq('org_id', orgId)
            ]);

            const csatScores = avgCsat || [];
            const avgCsatScore = csatScores.length > 0
                ? (csatScores.reduce((sum, r) => sum + r.csat_score, 0) / csatScores.length).toFixed(2)
                : null;

            res.json({
                success: true,
                data: {
                    total_conversations: totalConvs?.length || 0,
                    open: openConvs?.length || 0,
                    escalated: escalatedConvs?.length || 0,
                    resolved: resolvedConvs?.length || 0,
                    avg_csat: avgCsatScore ? parseFloat(avgCsatScore) : null,
                    total_actions: totalActions?.length || 0
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ── GET CONVERSATION ─────────────────────────────────────
    router.get('/:id', async (req, res) => {
        try {
            const { data: conversation, error } = await supabase
                .from('support_conversations')
                .select('*')
                .eq('id', req.params.id)
                .single();

            if (error || !conversation) {
                return res.status(404).json({ success: false, error: 'Conversation not found' });
            }

            const { data: messages } = await supabase
                .from('support_messages')
                .select('*')
                .eq('conversation_id', req.params.id)
                .order('seq', { ascending: true });

            res.json({ success: true, data: { ...conversation, messages: messages || [] } });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ── UPDATE CONVERSATION ──────────────────────────────────
    router.patch('/:id', async (req, res) => {
        try {
            const allowedFields = ['subject', 'priority', 'status'];
            const updates = {};
            for (const field of allowedFields) {
                if (req.body[field] !== undefined) updates[field] = req.body[field];
            }

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ success: false, error: 'No valid fields to update' });
            }

            const { data, error } = await supabase
                .from('support_conversations')
                .update(updates)
                .eq('id', req.params.id)
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ── SEND MESSAGE (triggers AI response) ──────────────────
    router.post('/:id/messages', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.body?.org_id;
            const { message } = req.body;

            if (!message || typeof message !== 'string' || message.trim().length === 0) {
                return res.status(400).json({ success: false, error: 'message is required' });
            }

            // Verify conversation exists
            const { data: conv } = await supabase
                .from('support_conversations')
                .select('id, org_id, status')
                .eq('id', req.params.id)
                .single();

            if (!conv) {
                return res.status(404).json({ success: false, error: 'Conversation not found' });
            }

            if (conv.status === 'closed' || conv.status === 'resolved') {
                return res.status(400).json({ success: false, error: `Conversation is ${conv.status}` });
            }

            const result = await supportAgentService.processMessage(req.params.id, message.trim(), {
                orgId: orgId || conv.org_id,
                userId: req.userId
            });

            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ── SSE POLLING ENDPOINT ─────────────────────────────────
    router.get('/:id/stream', async (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const conversationId = req.params.id;
        let lastSeq = parseInt(req.query.last_seq) || 0;

        const sendMessages = async () => {
            const { data: messages } = await supabase
                .from('support_messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .gt('seq', lastSeq)
                .order('seq', { ascending: true });

            if (messages && messages.length > 0) {
                for (const msg of messages) {
                    res.write(`data: ${JSON.stringify(msg)}\n\n`);
                    lastSeq = msg.seq;
                }
            }
        };

        // Initial send
        await sendMessages();

        // Poll every 2 seconds for 30 seconds max
        const interval = setInterval(sendMessages, 2000);
        const timeout = setTimeout(() => {
            clearInterval(interval);
            res.write('data: {"type":"timeout"}\n\n');
            res.end();
        }, 30000);

        req.on('close', () => {
            clearInterval(interval);
            clearTimeout(timeout);
        });
    });

    // ── MANUAL ESCALATION ────────────────────────────────────
    router.post('/:id/escalate', async (req, res) => {
        try {
            const { reason, priority } = req.body;

            const { data, error } = await supabase
                .from('support_conversations')
                .update({
                    status: 'escalated',
                    escalated_at: new Date().toISOString(),
                    escalation_reason: reason || 'Manual escalation',
                    priority: priority || 'high'
                })
                .eq('id', req.params.id)
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ── RESOLVE CONVERSATION ─────────────────────────────────
    router.post('/:id/resolve', async (req, res) => {
        try {
            const { resolution_summary } = req.body;

            const { data, error } = await supabase
                .from('support_conversations')
                .update({
                    status: 'resolved',
                    resolved_at: new Date().toISOString(),
                    resolution_summary: resolution_summary || null
                })
                .eq('id', req.params.id)
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ── SUBMIT CSAT ──────────────────────────────────────────
    router.post('/:id/csat', async (req, res) => {
        try {
            const { score, comment } = req.body;

            if (!score || score < 1 || score > 5) {
                return res.status(400).json({ success: false, error: 'score must be between 1 and 5' });
            }

            const { data, error } = await supabase
                .from('support_conversations')
                .update({
                    csat_score: score,
                    csat_comment: comment || null
                })
                .eq('id', req.params.id)
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
