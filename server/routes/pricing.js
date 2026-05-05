/**
 * Public Pricing API Routes
 * Serves tier and module pricing data for public-facing pricing pages.
 * These endpoints are unauthenticated (whitelisted in auth middleware).
 *
 * Phase 87 (REQ-003) rewrite: sources from tier_module_access matrix
 * + marketing-copy fields. Filters WHERE is_public = TRUE so legacy
 * tiers (agency_starter/professional/enterprise, platform) and any
 * future internal tiers are excluded from the public payload.
 *
 * IMPORTANT: this route is the source the websiteSyncService payload
 * mirrors. It must NEVER read from organizations or org_*_overrides.
 */

const express = require('express');

const NAV_GROUP_ALIASES = {
    'systems': 'ai-systems',
    'components': 'ai-systems',
    'tools': 'modules'
};

const NAV_GROUP_LABELS = {
    'primary': 'Core Platform',
    'ai-systems': 'AI 360 Systems',
    'dashboards': 'Dashboards',
    'modules': 'Modules',
    'agency': 'Agency',
    'admin': 'Administration',
    'other': 'Other'
};

function resolveNavGroup(dbNavGroup) {
    return NAV_GROUP_ALIASES[dbNavGroup] || dbNavGroup || 'other';
}

module.exports = function(supabase) {
    const router = express.Router();

    /**
     * GET /api/pricing/tiers
     * Returns the four public subscription tiers with prices, limits,
     * features, and marketing-copy fields. Filters by is_public=TRUE
     * so legacy / internal tiers never appear.
     */
    router.get('/tiers', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('subscription_tiers')
                .select('id, name, description, tagline, target_customer, tier_group, display_order, price_monthly, price_yearly, max_members, max_clients, max_agents, max_workflows, max_skills, max_context_assets, max_research_studios, max_monthly_api_calls, max_storage_gb, features, feature_highlights, cta_label, cta_url, is_featured')
                .eq('is_public', true)
                .eq('is_active', true)
                .order('display_order');

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
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
     * All active modules grouped by nav_group. Includes addon pricing
     * fields from the legacy platform_modules columns for backwards
     * compatibility, but the authoritative per-tier pricing now lives
     * in /comparison (sourced from tier_module_access).
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
                data: { modules, grouped }
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
     * Tier × module matrix using the authoritative tier_module_access
     * source. Returns per-cell access type ('core' | 'optional' | 'none')
     * with addon prices and per-cell descriptions where applicable.
     *
     * Restricted to public tiers + active modules. Cells with no row in
     * tier_module_access are returned as 'none' so the matrix is dense.
     */
    router.get('/comparison', async (req, res) => {
        try {
            const [tiersResult, modulesResult, matrixResult] = await Promise.all([
                supabase
                    .from('subscription_tiers')
                    .select('id, name, display_order, is_featured')
                    .eq('is_public', true)
                    .eq('is_active', true)
                    .order('display_order'),
                supabase
                    .from('platform_modules')
                    .select('id, name, icon, nav_group, display_order, category')
                    .eq('is_active', true)
                    .order('display_order'),
                supabase
                    .from('tier_module_access')
                    .select('tier_id, module_id, access_type, addon_price_monthly, addon_price_yearly, addon_description, resource_overrides')
            ]);

            if (tiersResult.error) throw tiersResult.error;
            if (modulesResult.error) throw modulesResult.error;
            if (matrixResult.error) throw matrixResult.error;

            const tiers = tiersResult.data || [];
            const modules = modulesResult.data || [];
            const matrix = matrixResult.data || [];

            // Index matrix by (tier_id, module_id) for O(1) lookup
            const cellMap = new Map();
            for (const cell of matrix) {
                cellMap.set(`${cell.tier_id}::${cell.module_id}`, cell);
            }

            const publicTierIds = new Set(tiers.map(t => t.id));

            // Group modules by resolved nav_group, build per-cell entries
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
                    const cell = cellMap.get(`${tier.id}::${mod.id}`);
                    if (!cell) {
                        tierAccess[tier.id] = { access: 'none' };
                        continue;
                    }
                    const entry = { access: cell.access_type };
                    if (cell.access_type === 'optional') {
                        if (cell.addon_price_monthly !== null && cell.addon_price_monthly !== undefined) {
                            entry.addon_price_monthly = Number(cell.addon_price_monthly);
                        }
                        if (cell.addon_price_yearly !== null && cell.addon_price_yearly !== undefined) {
                            entry.addon_price_yearly = Number(cell.addon_price_yearly);
                        }
                        if (cell.addon_description) entry.note = cell.addon_description;
                    }
                    tierAccess[tier.id] = entry;
                }
                // Drop any non-public tier keys defensively (in case stale rows exist)
                for (const k of Object.keys(tierAccess)) {
                    if (!publicTierIds.has(k)) delete tierAccess[k];
                }

                comparison[group].modules.push({
                    id: mod.id,
                    name: mod.name,
                    icon: mod.icon,
                    tiers: tierAccess
                });
            }

            res.json({
                success: true,
                data: {
                    tiers: tiers.map(t => ({ id: t.id, name: t.name, is_featured: !!t.is_featured })),
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
