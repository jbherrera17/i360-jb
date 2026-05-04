/**
 * Platform Admin — Subscription Tiers.
 *
 * requirePlatformAdmin is applied by the coordinator. requireAdminWrite is per-route.
 */

const express = require('express');

module.exports = function (supabase, requireAdminWrite) {
    const router = express.Router();



    // ============================================
    // SUBSCRIPTION TIERS
    // ============================================

    /**
     * GET /api/platform/tiers
     * List all subscription tiers
     */
    router.get('/tiers', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('subscription_tiers')
                .select('*')
                .order('display_order');

            // If table doesn't exist, return default tiers
            if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
                console.log('subscription_tiers table not found - returning defaults');
                return res.json({
                    success: true,
                    data: [
                        { id: 'platform', name: 'Platform', description: 'Internal platform tier with unlimited resources', max_members: -1, max_clients: -1, max_agents: -1, display_order: 0 },
                        { id: 'starter', name: 'Starter', description: 'For individuals and small teams', max_members: 3, max_clients: 0, max_agents: 5 },
                        { id: 'business', name: 'Business', description: 'For growing teams', max_members: 10, max_clients: 0, max_agents: 25 },
                        { id: 'enterprise', name: 'Enterprise', description: 'For large organizations', max_members: 100, max_clients: 0, max_agents: 100 },
                        { id: 'agency_starter', name: 'Agency Starter', description: 'For small consultancies', max_members: 5, max_clients: 5, max_agents: 25 },
                        { id: 'agency_professional', name: 'Agency Professional', description: 'For growing agencies', max_members: 15, max_clients: 25, max_agents: 100 },
                        { id: 'agency_enterprise', name: 'Agency Enterprise', description: 'For large consultancies', max_members: 50, max_clients: 100, max_agents: 200 }
                    ],
                    note: 'Using default tiers. Deploy Phase 44 schema to enable tier management.'
                });
            }

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error fetching tiers:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/platform/tiers/:id
     * Get a single tier with usage stats
     */
    router.get('/tiers/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data: tier, error } = await supabase
                .from('subscription_tiers')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            // Get org count on this tier
            const { count: orgCount } = await supabase
                .from('organizations')
                .select('*', { count: 'exact', head: true })
                .eq('subscription_tier', id);

            res.json({
                success: true,
                data: {
                    ...tier,
                    organization_count: orgCount || 0
                }
            });
        } catch (error) {
            console.error('Error fetching tier:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/platform/tiers/:id
     * Update a subscription tier
     */
    router.put('/tiers/:id', requireAdminWrite, async (req, res) => {
        try {
            const { id } = req.params;
            const {
                name,
                description,
                price_monthly,
                price_yearly,
                stripe_price_id_monthly,
                stripe_price_id_yearly,
                max_members,
                max_clients,
                max_agents,
                max_workflows,
                max_skills,
                max_context_assets,
                max_research_studios,
                max_monthly_api_calls,
                max_storage_gb,
                features,
                integration_addons,
                allow_self_upgrade,
                is_active,
                // Phase 87 marketing-copy fields (REQ-003)
                tagline,
                target_customer,
                feature_highlights,
                cta_label,
                cta_url,
                is_featured,
                is_public
            } = req.body;

            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (description !== undefined) updateData.description = description;
            if (price_monthly !== undefined) updateData.price_monthly = price_monthly;
            if (price_yearly !== undefined) updateData.price_yearly = price_yearly;
            if (stripe_price_id_monthly !== undefined) updateData.stripe_price_id_monthly = stripe_price_id_monthly;
            if (stripe_price_id_yearly !== undefined) updateData.stripe_price_id_yearly = stripe_price_id_yearly;
            if (max_members !== undefined) updateData.max_members = max_members;
            if (max_clients !== undefined) updateData.max_clients = max_clients;
            if (max_agents !== undefined) updateData.max_agents = max_agents;
            if (max_workflows !== undefined) updateData.max_workflows = max_workflows;
            if (max_skills !== undefined) updateData.max_skills = max_skills;
            if (max_context_assets !== undefined) updateData.max_context_assets = max_context_assets;
            if (max_research_studios !== undefined) updateData.max_research_studios = max_research_studios;
            if (max_monthly_api_calls !== undefined) updateData.max_monthly_api_calls = max_monthly_api_calls;
            if (max_storage_gb !== undefined) updateData.max_storage_gb = max_storage_gb;
            if (features !== undefined) updateData.features = features;
            if (integration_addons !== undefined) updateData.integration_addons = integration_addons;
            if (allow_self_upgrade !== undefined) updateData.allow_self_upgrade = allow_self_upgrade;
            if (is_active !== undefined) updateData.is_active = is_active;
            // Phase 87 marketing-copy fields
            if (tagline !== undefined) updateData.tagline = tagline;
            if (target_customer !== undefined) updateData.target_customer = target_customer;
            if (feature_highlights !== undefined) updateData.feature_highlights = feature_highlights;
            if (cta_label !== undefined) updateData.cta_label = cta_label;
            if (cta_url !== undefined) updateData.cta_url = cta_url;
            if (is_featured !== undefined) updateData.is_featured = is_featured;
            if (is_public !== undefined) updateData.is_public = is_public;

            const { data, error } = await supabase
                .from('subscription_tiers')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error updating tier:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });


    return router;
};
