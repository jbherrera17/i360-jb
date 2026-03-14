/**
 * Support Actions Routes
 * Phase 71: Customer Support Agent System
 *
 * Action management: list, approve, deny support actions (refunds, tier changes, etc.)
 */

const express = require('express');
const createModuleAccessMiddleware = require('../middleware/moduleAccess');

module.exports = function (supabase) {
    const router = express.Router();
    const { requireModule } = createModuleAccessMiddleware(supabase);

    // All routes require support_ai module
    router.use(requireModule('support_ai'));

    // ── LIST ACTIONS ─────────────────────────────────────────
    router.get('/', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.query.org_id;
            if (!orgId) {
                return res.status(400).json({ success: false, error: 'org_id is required' });
            }

            let query = supabase
                .from('support_actions')
                .select('*, support_conversations(subject, customer_name, customer_email)')
                .eq('org_id', orgId)
                .order('created_at', { ascending: false });

            if (req.query.status) query = query.eq('status', req.query.status);
            if (req.query.action_type) query = query.eq('action_type', req.query.action_type);
            if (req.query.limit) query = query.limit(parseInt(req.query.limit));

            const { data, error } = await query;
            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ── GET ACTION ───────────────────────────────────────────
    router.get('/:id', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('support_actions')
                .select('*, support_conversations(subject, customer_name, customer_email)')
                .eq('id', req.params.id)
                .single();

            if (error || !data) {
                return res.status(404).json({ success: false, error: 'Action not found' });
            }
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ── APPROVE ACTION (idempotent) ──────────────────────────
    router.post('/:id/approve', async (req, res) => {
        try {
            // Get current action
            const { data: action, error: fetchError } = await supabase
                .from('support_actions')
                .select('*')
                .eq('id', req.params.id)
                .single();

            if (fetchError || !action) {
                return res.status(404).json({ success: false, error: 'Action not found' });
            }

            // Idempotent: already approved/executed
            if (action.status === 'approved' || action.status === 'executed') {
                return res.json({ success: true, data: action, already_processed: true });
            }

            if (action.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    error: `Cannot approve action with status: ${action.status}`
                });
            }

            const { data, error } = await supabase
                .from('support_actions')
                .update({
                    status: 'approved',
                    approved_by: req.userId,
                    approved_at: new Date().toISOString()
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

    // ── DENY ACTION ──────────────────────────────────────────
    router.post('/:id/deny', async (req, res) => {
        try {
            const { data: action, error: fetchError } = await supabase
                .from('support_actions')
                .select('*')
                .eq('id', req.params.id)
                .single();

            if (fetchError || !action) {
                return res.status(404).json({ success: false, error: 'Action not found' });
            }

            if (action.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    error: `Cannot deny action with status: ${action.status}`
                });
            }

            const { data, error } = await supabase
                .from('support_actions')
                .update({
                    status: 'denied',
                    reason: req.body.reason || 'Denied by admin'
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

    // ── ACTIONS BY CONVERSATION ──────────────────────────────
    router.get('/conversation/:conversationId', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('support_actions')
                .select('*')
                .eq('conversation_id', req.params.conversationId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
