/**
 * Widget Admin Routes (Authenticated)
 * Phase 73: Embeddable Chat Widgets
 *
 * CRUD for chat widget configurations.
 * These routes require Supabase auth (registered AFTER auth middleware).
 */

const express = require('express');
const crypto = require('crypto');
const createModuleAccessMiddleware = require('../middleware/moduleAccess');
const logger = require('../services/logger');

module.exports = function (supabase) {
    const router = express.Router();
    const { requireModule, checkResourceLimit } = createModuleAccessMiddleware(supabase);

    // All routes require embeddable_chat module
    router.use(requireModule('embeddable_chat'));

    // ── LIST WIDGETS ─────────────────────────────────────────

    router.get('/', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || req.user?.org_id;
            if (!orgId) return res.status(400).json({ error: 'org_id required' });

            const { data, error } = await supabase
                .from('chat_widgets')
                .select('*')
                .eq('org_id', orgId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json({ data: data || [] });
        } catch (error) {
            logger.error('[Widgets] List failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // ── CREATE WIDGET ────────────────────────────────────────

    router.post('/', checkResourceLimit('chat_widgets'), async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || req.user?.org_id;
            if (!orgId) return res.status(400).json({ error: 'org_id required' });

            const {
                widget_name, agent_id, cors_origins, branding, limits,
                pre_chat_fields, privacy_policy, consent_text,
                data_retention_days, calendly_config, sheets_config
            } = req.body;

            if (!widget_name) {
                return res.status(400).json({ error: 'widget_name is required' });
            }

            // Generate HMAC token [SEC-01]
            const tokenSecret = crypto.randomBytes(32).toString('hex');
            const widgetId = crypto.randomUUID();
            const widgetToken = crypto
                .createHmac('sha256', tokenSecret)
                .update(widgetId)
                .digest('hex');

            const { data, error } = await supabase
                .from('chat_widgets')
                .insert({
                    id: widgetId,
                    org_id: orgId,
                    agent_id: agent_id || null,
                    widget_name,
                    widget_token: widgetToken,
                    widget_token_secret: tokenSecret,
                    cors_origins: cors_origins || [],
                    branding: branding || {},
                    limits: limits || {},
                    pre_chat_fields: pre_chat_fields || {
                        mode: 'lead_capture',
                        fields: {
                            email: { enabled: true, required: true },
                            name: { enabled: true, required: false }
                        },
                        show_consent_checkbox: true
                    },
                    privacy_policy: privacy_policy || null,
                    consent_text: consent_text || null,
                    data_retention_days: data_retention_days || 90,
                    calendly_config: calendly_config || {},
                    sheets_config: sheets_config || {}
                })
                .select()
                .single();

            if (error) throw error;
            res.status(201).json({ data });
        } catch (error) {
            logger.error('[Widgets] Create failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // ── GET WIDGET ───────────────────────────────────────────

    router.get('/:id', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || req.user?.org_id;
            const { data, error } = await supabase
                .from('chat_widgets')
                .select('*')
                .eq('id', req.params.id)
                .eq('org_id', orgId)
                .single();

            if (error || !data) return res.status(404).json({ error: 'Widget not found' });
            res.json({ data });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── UPDATE WIDGET ────────────────────────────────────────

    router.put('/:id', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || req.user?.org_id;
            const updateFields = {};
            const allowed = [
                'widget_name', 'agent_id', 'cors_origins', 'branding', 'limits',
                'pre_chat_fields', 'privacy_policy', 'consent_text',
                'data_retention_days', 'calendly_config', 'sheets_config', 'is_active'
            ];

            for (const field of allowed) {
                if (req.body[field] !== undefined) {
                    updateFields[field] = req.body[field];
                }
            }

            if (Object.keys(updateFields).length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            const { data, error } = await supabase
                .from('chat_widgets')
                .update(updateFields)
                .eq('id', req.params.id)
                .eq('org_id', orgId)
                .select()
                .single();

            if (error) throw error;
            if (!data) return res.status(404).json({ error: 'Widget not found' });
            res.json({ data });
        } catch (error) {
            logger.error('[Widgets] Update failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // ── DELETE WIDGET ────────────────────────────────────────

    router.delete('/:id', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || req.user?.org_id;

            const { error } = await supabase
                .from('chat_widgets')
                .delete()
                .eq('id', req.params.id)
                .eq('org_id', orgId);

            if (error) throw error;
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── ROTATE TOKEN ─────────────────────────────────────────

    router.post('/:id/rotate-token', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || req.user?.org_id;
            const widgetId = req.params.id;

            const newSecret = crypto.randomBytes(32).toString('hex');
            const newToken = crypto
                .createHmac('sha256', newSecret)
                .update(widgetId)
                .digest('hex');

            const { data, error } = await supabase
                .from('chat_widgets')
                .update({
                    widget_token: newToken,
                    widget_token_secret: newSecret
                })
                .eq('id', widgetId)
                .eq('org_id', orgId)
                .select()
                .single();

            if (error) throw error;
            if (!data) return res.status(404).json({ error: 'Widget not found' });
            res.json({ data, message: 'Token rotated. Update embed code on your website.' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── USAGE STATS ──────────────────────────────────────────

    router.get('/:id/usage', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || req.user?.org_id;

            const { data: widget } = await supabase
                .from('chat_widgets')
                .select('usage_stats, limits')
                .eq('id', req.params.id)
                .eq('org_id', orgId)
                .single();

            if (!widget) return res.status(404).json({ error: 'Widget not found' });

            // Count sessions
            const { count: sessionCount } = await supabase
                .from('widget_sessions')
                .select('id', { count: 'exact', head: true })
                .eq('widget_id', req.params.id);

            res.json({
                usage: widget.usage_stats,
                limits: widget.limits,
                total_sessions: sessionCount || 0
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
