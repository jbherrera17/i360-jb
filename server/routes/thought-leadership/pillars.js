/**
 * Thought Leadership — Content Pillars.
 *
 * Module-access gating is applied by the coordinator (see ./index.js).
 */

const express = require('express');
const { randomUUID: uuidv4 } = require('crypto');

module.exports = function (supabase) {
    const router = express.Router();

    // ============================================================================
    // CONTENT PILLARS ENDPOINTS
    // ============================================================================

    /**
     * GET /api/thought-leadership/pillars
     * Get all content pillars for user
     */
    router.get('/pillars', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { data, error } = await supabase
                .from('content_pillars')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;

            res.json({ data: data || [] });
        } catch (err) {
            console.error('Error fetching pillars:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/pillars
     * Create a new content pillar
     */
    router.post('/pillars', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const {
                name,
                description,
                icon,
                color,
                quarterly_focus,
                monthly_themes,
                key_topics,
                hashtags,
                sample_titles,
                notion_pillar_value,
                sort_order
            } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Pillar name is required' });
            }

            // Get profile ID
            const { data: profile } = await supabase
                .from('thought_leadership_profiles')
                .select('id')
                .eq('user_id', userId)
                .single();

            const pillarData = {
                id: uuidv4(),
                user_id: userId,
                profile_id: profile?.id,
                name,
                description,
                icon: icon || 'bookmark',
                color: color || '#3b82f6',
                quarterly_focus: quarterly_focus || [],
                monthly_themes: monthly_themes || {},
                key_topics: key_topics || [],
                hashtags: hashtags || [],
                sample_titles: sample_titles || [],
                notion_pillar_value,
                sort_order: sort_order || 0
            };

            const { data, error } = await supabase
                .from('content_pillars')
                .insert(pillarData)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (err) {
            console.error('Error creating pillar:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * PUT /api/thought-leadership/pillars/:id
     * Update a content pillar
     */
    router.put('/pillars/:id', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { id } = req.params;
            const updates = { ...req.body, updated_at: new Date().toISOString() };
            delete updates.id;
            delete updates.user_id;
            delete updates.profile_id;

            const { data, error } = await supabase
                .from('content_pillars')
                .update(updates)
                .eq('id', id)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (err) {
            console.error('Error updating pillar:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * DELETE /api/thought-leadership/pillars/:id
     * Soft delete a content pillar
     */
    router.delete('/pillars/:id', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { id } = req.params;

            const { error } = await supabase
                .from('content_pillars')
                .update({ is_active: false })
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            res.json({ success: true });
        } catch (err) {
            console.error('Error deleting pillar:', err);
            res.status(500).json({ error: err.message });
        }
    });


    return router;
};
