/**
 * Thought Leadership — Profile Management.
 *
 * Module-access gating is applied by the coordinator (see ./index.js).
 */

const express = require('express');

module.exports = function (supabase) {
    const router = express.Router();

    // ============================================================================
    // PROFILE MANAGEMENT ENDPOINTS
    // ============================================================================

    /**
     * GET /api/thought-leadership/profile
     * Get user's thought leadership profile
     */
    router.get('/profile', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { data, error } = await supabase
                .from('thought_leadership_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            res.json({ data: data || null });
        } catch (err) {
            console.error('Error fetching TL profile:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/profile
     * Create or update thought leadership profile
     */
    router.post('/profile', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const {
                core_thesis,
                atomic_claim,
                positioning_framework,
                notion_database_id,
                default_publish_targets,
                weekly_publish_day,
                status
            } = req.body;

            const profileData = {
                user_id: userId,
                core_thesis,
                atomic_claim,
                positioning_framework,
                notion_database_id,
                default_publish_targets,
                weekly_publish_day,
                status,
                updated_at: new Date().toISOString()
            };

            // Remove undefined values
            Object.keys(profileData).forEach(key =>
                profileData[key] === undefined && delete profileData[key]
            );

            const { data, error } = await supabase
                .from('thought_leadership_profiles')
                .upsert(profileData, { onConflict: 'user_id' })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (err) {
            console.error('Error saving TL profile:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * PUT /api/thought-leadership/profile/setup-step
     * Update setup progress step
     */
    router.put('/profile/setup-step', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { setup_step, setup_data, setup_completed } = req.body;

            const updates = { updated_at: new Date().toISOString() };
            if (setup_step !== undefined) updates.setup_step = setup_step;
            if (setup_data !== undefined) updates.setup_data = setup_data;
            if (setup_completed !== undefined) updates.setup_completed = setup_completed;

            const { data, error } = await supabase
                .from('thought_leadership_profiles')
                .update(updates)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (err) {
            console.error('Error updating setup step:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/thought-leadership/profile/status
     * Get profile status and setup progress
     */
    router.get('/profile/status', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { data: profile, error } = await supabase
                .from('thought_leadership_profiles')
                .select('status, setup_completed, setup_step, core_thesis, atomic_claim')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            // Count pillars
            const { count: pillarCount } = await supabase
                .from('content_pillars')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            res.json({
                has_profile: !!profile,
                status: profile?.status || 'not_started',
                setup_completed: profile?.setup_completed || false,
                setup_step: profile?.setup_step || 0,
                has_thesis: !!profile?.core_thesis,
                has_atomic_claim: !!profile?.atomic_claim,
                pillar_count: pillarCount || 0
            });
        } catch (err) {
            console.error('Error fetching profile status:', err);
            res.status(500).json({ error: err.message });
        }
    });


    return router;
};
