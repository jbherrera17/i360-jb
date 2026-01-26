/**
 * Platform Admin API Routes
 * Manages platform-level configuration for Synergi administrators
 *
 * These routes are restricted to platform admins (super_admin, admin, support roles)
 */

const express = require('express');
const router = express.Router();

module.exports = function(supabase) {

    /**
     * Middleware: Check if user is a platform admin
     */
    const requirePlatformAdmin = async (req, res, next) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const { data, error } = await supabase
                .rpc('is_platform_admin', { p_user_id: userId });

            if (error || !data) {
                return res.status(403).json({
                    success: false,
                    error: 'Platform admin access required'
                });
            }

            // Get admin role for further permission checks
            const { data: roleData } = await supabase
                .rpc('get_platform_admin_role', { p_user_id: userId });

            req.platformAdminRole = roleData;
            next();
        } catch (error) {
            console.error('Platform admin check error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to verify admin status'
            });
        }
    };

    /**
     * Middleware: Require super_admin or admin role (not support)
     */
    const requireAdminWrite = (req, res, next) => {
        if (!['super_admin', 'admin'].includes(req.platformAdminRole)) {
            return res.status(403).json({
                success: false,
                error: 'Admin role required for this action'
            });
        }
        next();
    };

    // Apply platform admin check to all routes
    router.use(requirePlatformAdmin);


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
                allow_self_upgrade,
                is_active
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
            if (allow_self_upgrade !== undefined) updateData.allow_self_upgrade = allow_self_upgrade;
            if (is_active !== undefined) updateData.is_active = is_active;

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


    // ============================================
    // PLATFORM MODULES
    // ============================================

    /**
     * GET /api/platform/modules
     * List all platform modules
     */
    router.get('/modules', async (req, res) => {
        try {
            const { category } = req.query;

            let query = supabase
                .from('platform_modules')
                .select('*')
                .order('display_order');

            if (category) {
                query = query.eq('category', category);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error fetching modules:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/platform/modules/:id
     * Update a platform module
     */
    router.put('/modules/:id', requireAdminWrite, async (req, res) => {
        try {
            const { id } = req.params;
            const {
                name,
                description,
                icon,
                route_path,
                min_tier,
                min_business_role,
                requires_modules,
                category,
                nav_group,
                display_order,
                is_active,
                is_beta
            } = req.body;

            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (description !== undefined) updateData.description = description;
            if (icon !== undefined) updateData.icon = icon;
            if (route_path !== undefined) updateData.route_path = route_path;
            if (min_tier !== undefined) updateData.min_tier = min_tier;
            if (min_business_role !== undefined) updateData.min_business_role = min_business_role;
            if (requires_modules !== undefined) updateData.requires_modules = requires_modules;
            if (category !== undefined) updateData.category = category;
            if (nav_group !== undefined) updateData.nav_group = nav_group;
            if (display_order !== undefined) updateData.display_order = display_order;
            if (is_active !== undefined) updateData.is_active = is_active;
            if (is_beta !== undefined) updateData.is_beta = is_beta;

            const { data, error } = await supabase
                .from('platform_modules')
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
            console.error('Error updating module:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });


    // ============================================
    // PLATFORM ADMINS
    // ============================================

    /**
     * GET /api/platform/admins
     * List all platform admins
     */
    router.get('/admins', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('platform_admins')
                .select(`
                    *,
                    user:user_id (
                        id,
                        email,
                        display_name
                    ),
                    granted_by_user:granted_by (
                        id,
                        email,
                        display_name
                    )
                `)
                .order('granted_at', { ascending: false });

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error fetching platform admins:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/platform/admins
     * Add a new platform admin
     */
    router.post('/admins', async (req, res) => {
        try {
            // Only super_admin can add new admins
            if (req.platformAdminRole !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Only super admins can add platform admins'
                });
            }

            const { user_id, role, notes } = req.body;

            if (!user_id) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            // Validate role
            if (role && !['super_admin', 'admin', 'support'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid role. Must be super_admin, admin, or support'
                });
            }

            const { data, error } = await supabase
                .from('platform_admins')
                .insert({
                    user_id,
                    role: role || 'admin',
                    notes,
                    granted_by: req.userId
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    return res.status(409).json({
                        success: false,
                        error: 'User is already a platform admin'
                    });
                }
                throw error;
            }

            res.status(201).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error adding platform admin:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/platform/admins/:id
     * Update a platform admin
     */
    router.put('/admins/:id', async (req, res) => {
        try {
            if (req.platformAdminRole !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Only super admins can modify platform admins'
                });
            }

            const { id } = req.params;
            const { role, is_active, notes } = req.body;

            const updateData = {};
            if (role !== undefined) updateData.role = role;
            if (is_active !== undefined) updateData.is_active = is_active;
            if (notes !== undefined) updateData.notes = notes;

            const { data, error } = await supabase
                .from('platform_admins')
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
            console.error('Error updating platform admin:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/platform/admins/:id
     * Remove a platform admin
     */
    router.delete('/admins/:id', async (req, res) => {
        try {
            if (req.platformAdminRole !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Only super admins can remove platform admins'
                });
            }

            const { id } = req.params;

            // Prevent removing yourself
            const { data: admin } = await supabase
                .from('platform_admins')
                .select('user_id')
                .eq('id', id)
                .single();

            if (admin?.user_id === req.userId) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot remove yourself as platform admin'
                });
            }

            const { error } = await supabase
                .from('platform_admins')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({
                success: true,
                message: 'Platform admin removed'
            });
        } catch (error) {
            console.error('Error removing platform admin:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });


    // ============================================
    // ORGANIZATIONS (ADMIN VIEW)
    // ============================================

    /**
     * GET /api/platform/organizations
     * List all organizations (admin view with tier details)
     */
    router.get('/organizations', async (req, res) => {
        try {
            const { tier, status, org_type, search, limit = 50, offset = 0 } = req.query;

            let query = supabase
                .from('org_tier_details')
                .select('*');

            if (tier) {
                query = query.eq('subscription_tier', tier);
            }

            if (status) {
                query = query.eq('subscription_status', status);
            }

            if (org_type) {
                query = query.eq('org_type', org_type);
            }

            if (search) {
                query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
            }

            query = query
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            const { data, error, count } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: count
                }
            });
        } catch (error) {
            console.error('Error fetching organizations:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/platform/organizations/:id/tier
     * Change an organization's subscription tier
     */
    router.put('/organizations/:id/tier', requireAdminWrite, async (req, res) => {
        try {
            const { id } = req.params;
            const { tier, status } = req.body;

            if (!tier) {
                return res.status(400).json({
                    success: false,
                    error: 'Tier is required'
                });
            }

            // Validate tier exists
            const { data: tierData, error: tierError } = await supabase
                .from('subscription_tiers')
                .select('id')
                .eq('id', tier)
                .single();

            if (tierError || !tierData) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid tier'
                });
            }

            const updateData = {
                subscription_tier: tier
            };

            if (status) {
                updateData.subscription_status = status;
            }

            // If upgrading to agency tier, set org_type
            if (tier === 'agency') {
                updateData.org_type = 'agency';
            }

            const { data, error } = await supabase
                .from('organizations')
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
            console.error('Error changing org tier:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/platform/stats
     * Get platform-wide statistics
     */
    router.get('/stats', async (req, res) => {
        try {
            // Get org counts by tier
            const { data: tierCounts, error: tierError } = await supabase
                .from('organizations')
                .select('subscription_tier')
                .eq('is_active', true);

            if (tierError) throw tierError;

            const tierStats = tierCounts.reduce((acc, org) => {
                acc[org.subscription_tier] = (acc[org.subscription_tier] || 0) + 1;
                return acc;
            }, {});

            // Get total counts
            const { count: totalOrgs } = await supabase
                .from('organizations')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            const { count: totalUsers } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true });

            const { count: totalClients } = await supabase
                .from('clients')
                .select('*', { count: 'exact', head: true })
                .neq('status', 'archived');

            const { count: totalAgents } = await supabase
                .from('agents')
                .select('*', { count: 'exact', head: true });

            res.json({
                success: true,
                data: {
                    organizations: {
                        total: totalOrgs || 0,
                        by_tier: tierStats
                    },
                    users: totalUsers || 0,
                    clients: totalClients || 0,
                    agents: totalAgents || 0
                }
            });
        } catch (error) {
            console.error('Error fetching platform stats:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });


    return router;
};
