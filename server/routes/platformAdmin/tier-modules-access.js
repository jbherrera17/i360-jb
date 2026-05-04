/**
 * Platform Admin — Tier Module Access (per-tier modules).
 *
 * requirePlatformAdmin is applied by the coordinator. requireAdminWrite is per-route.
 */

const express = require('express');

module.exports = function (supabase, _requireAdminWrite) {
    const router = express.Router();

    /**
     * GET /api/platform/tiers/:id/modules
     * Get modules available for a specific tier.
     * Returns modules where min_tier allows access for this tier.
     */
    router.get('/tiers/:id/modules', async (req, res) => {
        try {
            const { id } = req.params;
            const { include_inactive } = req.query;

            // Look up the requested tier's display_order from DB
            const { data: requestedTier, error: tierError } = await supabase
                .from('subscription_tiers')
                .select('id, display_order')
                .eq('id', id)
                .single();

            if (tierError || !requestedTier) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid tier ID'
                });
            }

            // Get all modules
            let query = supabase
                .from('platform_modules')
                .select('*')
                .order('category')
                .order('display_order');

            if (include_inactive !== 'true') {
                query = query.eq('is_active', true);
            }

            const { data: modules, error } = await query;

            if (error) throw error;

            // Build a map of tier display_orders for filtering
            const { data: allTiers } = await supabase
                .from('subscription_tiers')
                .select('id, display_order')
                .eq('is_active', true);

            const tierOrderMap = {};
            (allTiers || []).forEach(t => { tierOrderMap[t.id] = t.display_order; });

            // Filter modules available for this tier
            const availableModules = (modules || []).filter(module => {
                if (!module.min_tier) return true; // No min_tier = available to all
                const moduleMinOrder = tierOrderMap[module.min_tier];
                if (moduleMinOrder === undefined) return true; // Unknown tier = allow
                return requestedTier.display_order >= moduleMinOrder;
            });

            // Group by category
            const grouped = availableModules.reduce((acc, module) => {
                const cat = module.category || 'other';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(module);
                return acc;
            }, {});

            // Group by nav_group (matches navigation.js categories)
            const navGroupAliases = { systems: 'ai-systems', components: 'ai-systems', tools: 'modules' };
            const byNavGroup = availableModules.reduce((acc, module) => {
                const raw = module.nav_group || 'other';
                const group = navGroupAliases[raw] || raw;
                if (!acc[group]) acc[group] = [];
                acc[group].push(module);
                return acc;
            }, {});

            res.json({
                success: true,
                data: {
                    tier_id: id,
                    tier_name: id.charAt(0).toUpperCase() + id.slice(1),
                    modules: availableModules,
                    by_category: grouped,
                    by_nav_group: byNavGroup,
                    total_count: availableModules.length
                }
            });
        } catch (error) {
            console.error('Error fetching tier modules:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });



    return router;
};
