/**
 * Thought Leadership — Outputs.
 *
 * Module-access gating is applied by the coordinator (see ./index.js).
 */

const express = require('express');
const { randomUUID: uuidv4 } = require('crypto');

module.exports = function (supabase) {
    const router = express.Router();

    // ============================================================================
    // OUTPUTS ENDPOINTS
    // ============================================================================

    /**
     * GET /api/thought-leadership/outputs
     * Get generated outputs
     */
    router.get('/outputs', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { calendar_entry_id, output_type, limit = 20 } = req.query;

            let query = supabase
                .from('thought_leadership_outputs')
                .select('*')
                .eq('user_id', userId)
                .eq('is_current', true)
                .order('created_at', { ascending: false })
                .limit(parseInt(limit));

            if (calendar_entry_id) {
                query = query.eq('calendar_entry_id', calendar_entry_id);
            }
            if (output_type) {
                query = query.eq('output_type', output_type);
            }

            const { data, error } = await query;
            if (error) throw error;

            res.json({ data: data || [] });
        } catch (err) {
            console.error('Error fetching outputs:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/outputs
     * Save a generated output
     */
    router.post('/outputs', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const {
                calendar_entry_id,
                output_type,
                title,
                content,
                content_format,
                post_day,
                post_theme,
                model_used,
                tokens_used,
                context_assets_used,
                skill_used
            } = req.body;

            if (!output_type || !content) {
                return res.status(400).json({ error: 'output_type and content are required' });
            }

            // Mark previous versions as not current
            if (calendar_entry_id) {
                await supabase
                    .from('thought_leadership_outputs')
                    .update({ is_current: false })
                    .eq('calendar_entry_id', calendar_entry_id)
                    .eq('output_type', output_type)
                    .eq('user_id', userId);
            }

            const outputData = {
                id: uuidv4(),
                user_id: userId,
                calendar_entry_id,
                output_type,
                title,
                content,
                content_format: content_format || 'markdown',
                post_day,
                post_theme,
                model_used,
                tokens_used,
                context_assets_used,
                skill_used,
                version: 1,
                is_current: true
            };

            const { data, error } = await supabase
                .from('thought_leadership_outputs')
                .insert(outputData)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (err) {
            console.error('Error saving output:', err);
            res.status(500).json({ error: err.message });
        }
    });


    return router;
};
