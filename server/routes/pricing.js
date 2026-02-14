/**
 * Public Pricing API Routes
 * Serves tier and module pricing data for public-facing pricing pages.
 * These endpoints are unauthenticated (whitelisted in auth middleware).
 */

const express = require('express');
const router = express.Router();

// Nav group alias mapping (matches navigation.js lines 158-161)
const NAV_GROUP_ALIASES = {
    'systems': 'ai-systems',
    'components': 'ai-systems',
    'tools': 'modules'
};

const NAV_GROUP_LABELS = {
    'primary': 'Primary',
    'ai-systems': 'AI 360 Systems',
    'dashboards': 'Dashboards',
    'modules': 'Modules',
    'agency': 'Agency',
    'admin': 'Administration'
};

// Tier ordering for comparison
const TIER_ORDER = ['starter', 'business', 'enterprise', 'agency'];

function resolveNavGroup(dbNavGroup) {
    return NAV_GROUP_ALIASES[dbNavGroup] || dbNavGroup || 'other';
}

module.exports = function(supabase) {

    /**
     * GET /api/pricing/tiers
     * Returns all active subscription tiers with prices, limits, and features.
     */
    router.get('/tiers', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('subscription_tiers')
                .select('*')
                .eq('is_active', true)
                .order('display_order');

            if (error) throw error;

            // Filter out platform-internal tier
            const tiers = (data || []).filter(t => t.id !== 'platform');

            res.json({
                success: true,
                data: tiers
            });
        } catch (error) {
            console.error('Error fetching pricing tiers:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to load pricing tiers'
            });
        }
    });

    /**
     * GET /api/pricing/modules
     * Returns all active modules grouped by nav_group with tier requirements and addon pricing.
     */
    router.get('/modules', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('platform_modules')
                .select('id, name, description, icon, nav_group, display_order, min_tier, category, is_addon_purchasable, addon_price_monthly, addon_price_yearly, addon_description')
                .eq('is_active', true)
                .order('display_order');

            if (error) throw error;

            const modules = data || [];

            // Group by resolved nav_group
            const grouped = {};
            for (const mod of modules) {
                const group = resolveNavGroup(mod.nav_group);
                if (!grouped[group]) {
                    grouped[group] = {
                        id: group,
                        label: NAV_GROUP_LABELS[group] || group,
                        modules: []
                    };
                }
                grouped[group].modules.push({
                    id: mod.id,
                    name: mod.name,
                    description: mod.description,
                    icon: mod.icon,
                    min_tier: mod.min_tier,
                    is_addon_purchasable: mod.is_addon_purchasable || false,
                    addon_price_monthly: mod.addon_price_monthly,
                    addon_price_yearly: mod.addon_price_yearly,
                    addon_description: mod.addon_description
                });
            }

            res.json({
                success: true,
                data: {
                    modules,
                    grouped
                }
            });
        } catch (error) {
            console.error('Error fetching pricing modules:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to load pricing modules'
            });
        }
    });

    /**
     * GET /api/pricing/comparison
     * Returns a tier x module matrix showing which tier includes which modules.
     */
    router.get('/comparison', async (req, res) => {
        try {
            // Fetch tiers and modules in parallel
            const [tiersResult, modulesResult] = await Promise.all([
                supabase
                    .from('subscription_tiers')
                    .select('id, name, display_order')
                    .eq('is_active', true)
                    .neq('id', 'platform')
                    .order('display_order'),
                supabase
                    .from('platform_modules')
                    .select('id, name, icon, nav_group, display_order, min_tier, is_addon_purchasable, addon_price_monthly, addon_price_yearly')
                    .eq('is_active', true)
                    .order('display_order')
            ]);

            if (tiersResult.error) throw tiersResult.error;
            if (modulesResult.error) throw modulesResult.error;

            const tiers = tiersResult.data || [];
            const modules = modulesResult.data || [];

            // Build tier order map for comparison
            const tierOrderMap = {};
            for (const tier of tiers) {
                tierOrderMap[tier.id] = tier.display_order;
            }

            // Build comparison matrix grouped by nav_group
            const comparison = {};
            for (const mod of modules) {
                const group = resolveNavGroup(mod.nav_group);
                if (!comparison[group]) {
                    comparison[group] = {
                        id: group,
                        label: NAV_GROUP_LABELS[group] || group,
                        modules: []
                    };
                }

                const tierAccess = {};
                for (const tier of tiers) {
                    if (mod.min_tier === null) {
                        tierAccess[tier.id] = 'included';
                    } else {
                        const minOrder = tierOrderMap[mod.min_tier];
                        const tierOrder = tierOrderMap[tier.id];
                        if (minOrder !== undefined && tierOrder !== undefined && tierOrder >= minOrder) {
                            tierAccess[tier.id] = 'included';
                        } else if (mod.is_addon_purchasable) {
                            tierAccess[tier.id] = 'addon';
                        } else {
                            tierAccess[tier.id] = 'unavailable';
                        }
                    }
                }

                comparison[group].modules.push({
                    id: mod.id,
                    name: mod.name,
                    icon: mod.icon,
                    addon_price_monthly: mod.addon_price_monthly,
                    addon_price_yearly: mod.addon_price_yearly,
                    tiers: tierAccess
                });
            }

            res.json({
                success: true,
                data: {
                    tiers: tiers.map(t => ({ id: t.id, name: t.name })),
                    comparison
                }
            });
        } catch (error) {
            console.error('Error fetching pricing comparison:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to load pricing comparison'
            });
        }
    });

    return router;
};
