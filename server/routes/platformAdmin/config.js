/**
 * Platform Admin — Platform Configuration.
 *
 * requirePlatformAdmin is applied by the coordinator. requireAdminWrite is per-route.
 */

const express = require('express');

module.exports = function (supabase, requireAdminWrite) {
    const router = express.Router();


    // ============================================
    // PLATFORM CONFIGURATION
    // ============================================

    /**
     * GET /api/platform/config
     * Get platform configuration
     */
    router.get('/config', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('platform_config')
                .select('*')
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            res.json({
                success: true,
                data: data || {
                    platform_name: 'Insight 360',
                    default_tier: 'starter',
                    trial_duration_days: 14,
                    maintenance_mode: false
                }
            });
        } catch (error) {
            console.error('Error fetching platform config:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/platform/config
     * Update platform configuration
     */
    router.put('/config', requireAdminWrite, async (req, res) => {
        try {
            const {
                platform_name,
                default_tier,
                trial_duration_days,
                feature_flags,
                maintenance_mode,
                maintenance_message,
                maintenance_ends_at,
                stripe_enabled
            } = req.body;

            // Get existing config
            const { data: existing } = await supabase
                .from('platform_config')
                .select('id')
                .limit(1)
                .single();

            const updateData = {};
            if (platform_name !== undefined) updateData.platform_name = platform_name;
            if (default_tier !== undefined) updateData.default_tier = default_tier;
            if (trial_duration_days !== undefined) updateData.trial_duration_days = trial_duration_days;
            if (feature_flags !== undefined) updateData.feature_flags = feature_flags;
            if (maintenance_mode !== undefined) updateData.maintenance_mode = maintenance_mode;
            if (maintenance_message !== undefined) updateData.maintenance_message = maintenance_message;
            if (maintenance_ends_at !== undefined) updateData.maintenance_ends_at = maintenance_ends_at;
            if (stripe_enabled !== undefined) updateData.stripe_enabled = stripe_enabled;

            let result;
            if (existing?.id) {
                result = await supabase
                    .from('platform_config')
                    .update(updateData)
                    .eq('id', existing.id)
                    .select()
                    .single();
            } else {
                result = await supabase
                    .from('platform_config')
                    .insert(updateData)
                    .select()
                    .single();
            }

            if (result.error) throw result.error;

            res.json({
                success: true,
                data: result.data
            });
        } catch (error) {
            console.error('Error updating platform config:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
};
