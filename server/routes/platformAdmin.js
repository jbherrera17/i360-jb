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
    // ADMIN VERIFICATION
    // ============================================

    /**
     * GET /api/platform/admin/verify
     * Lightweight check — if this returns 200, the user is a platform admin.
     * The requirePlatformAdmin middleware (applied to all routes) handles the 401/403.
     */
    router.get('/admin/verify', (req, res) => {
        res.json({ success: true, role: req.platformAdminRole });
    });

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
            if (integration_addons !== undefined) updateData.integration_addons = integration_addons;
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
     * POST /api/platform/modules
     * Create a new platform module
     */
    router.post('/modules', requireAdminWrite, async (req, res) => {
        try {
            const {
                id,
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

            // Validate required fields
            if (!id || !name) {
                return res.status(400).json({
                    success: false,
                    error: 'Module ID and name are required'
                });
            }

            // Validate ID format (lowercase, underscores only)
            if (!/^[a-z][a-z0-9_]*$/.test(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Module ID must start with a letter and contain only lowercase letters, numbers, and underscores'
                });
            }

            // Get max display_order if not provided
            let orderValue = display_order;
            if (orderValue === undefined) {
                const { data: maxOrder } = await supabase
                    .from('platform_modules')
                    .select('display_order')
                    .order('display_order', { ascending: false })
                    .limit(1)
                    .single();
                orderValue = (maxOrder?.display_order || 0) + 10;
            }

            const insertData = {
                id,
                name,
                description: description || null,
                icon: icon || 'puzzle',
                route_path: route_path || null,
                min_tier: min_tier || 'starter',
                min_business_role: min_business_role || null,
                requires_modules: requires_modules || null,
                category: category || 'tools',
                nav_group: nav_group || null,
                display_order: orderValue,
                is_active: is_active !== false,
                is_beta: is_beta || false
            };

            const { data, error } = await supabase
                .from('platform_modules')
                .insert(insertData)
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    return res.status(409).json({
                        success: false,
                        error: 'A module with this ID already exists'
                    });
                }
                throw error;
            }

            res.status(201).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error creating module:', error);
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

    /**
     * DELETE /api/platform/modules/:id
     * Delete or deactivate a platform module
     * By default, soft-deletes (sets is_active = false)
     * Use ?hard=true for permanent deletion
     */
    router.delete('/modules/:id', requireAdminWrite, async (req, res) => {
        try {
            const { id } = req.params;
            const { hard } = req.query;

            // Check if module exists
            const { data: existing, error: checkError } = await supabase
                .from('platform_modules')
                .select('id, name')
                .eq('id', id)
                .single();

            if (checkError || !existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Module not found'
                });
            }

            if (hard === 'true') {
                // Hard delete - permanently remove
                const { error } = await supabase
                    .from('platform_modules')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                res.json({
                    success: true,
                    message: `Module "${existing.name}" permanently deleted`
                });
            } else {
                // Soft delete - deactivate
                const { data, error } = await supabase
                    .from('platform_modules')
                    .update({ is_active: false })
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw error;

                res.json({
                    success: true,
                    message: `Module "${existing.name}" deactivated`,
                    data
                });
            }
        } catch (error) {
            console.error('Error deleting module:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/platform/tiers/:id/modules
     * Get modules available for a specific tier
     * Returns modules where min_tier allows access for this tier
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


    // ============================================
    // PLATFORM ADMINS
    // ============================================

    /**
     * GET /api/platform/admins
     * List all platform admins
     */
    router.get('/admins', async (req, res) => {
        try {
            // Try query with user relationship first
            let { data, error } = await supabase
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

            // If table doesn't exist (Phase 44 not deployed), return empty with note
            if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
                console.log('platform_admins table not found - Phase 44 schema not deployed');
                return res.json({
                    success: true,
                    data: [],
                    note: 'Platform admins table not found. Deploy Phase 44 schema to enable this feature.'
                });
            }

            // If relationship error, try simpler query and manually fetch user info
            if (error && error.message?.includes('relationship')) {
                console.log('platform_admins relationship not found, using fallback query');

                const simpleResult = await supabase
                    .from('platform_admins')
                    .select('*')
                    .order('granted_at', { ascending: false });

                if (simpleResult.error) throw simpleResult.error;

                // Fetch user info separately for each admin
                const adminsWithUsers = await Promise.all((simpleResult.data || []).map(async (admin) => {
                    let user = null;
                    let granted_by_user = null;

                    if (admin.user_id) {
                        const { data: userData } = await supabase
                            .from('users')
                            .select('id, email, display_name')
                            .eq('id', admin.user_id)
                            .single();
                        user = userData;
                    }

                    if (admin.granted_by) {
                        const { data: grantedByData } = await supabase
                            .from('users')
                            .select('id, email, display_name')
                            .eq('id', admin.granted_by)
                            .single();
                        granted_by_user = grantedByData;
                    }

                    return { ...admin, user, granted_by_user };
                }));

                return res.json({
                    success: true,
                    data: adminsWithUsers
                });
            }

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

            // Try to use the view first (Phase 44), fall back to direct query
            let data, error;

            // First attempt: use org_tier_details view
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

            const viewResult = await query;
            data = viewResult.data;
            error = viewResult.error;

            // Fallback: if view doesn't exist, query organizations table directly
            if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
                console.log('org_tier_details view not found, using fallback query');

                let fallbackQuery = supabase
                    .from('organizations')
                    .select(`
                        id,
                        name,
                        slug,
                        org_type,
                        subscription_tier,
                        subscription_status,
                        settings,
                        created_at,
                        is_active
                    `);

                if (tier) {
                    fallbackQuery = fallbackQuery.eq('subscription_tier', tier);
                }

                if (status) {
                    fallbackQuery = fallbackQuery.eq('subscription_status', status);
                }

                if (org_type) {
                    fallbackQuery = fallbackQuery.eq('org_type', org_type);
                }

                if (search) {
                    fallbackQuery = fallbackQuery.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
                }

                fallbackQuery = fallbackQuery
                    .order('created_at', { ascending: false })
                    .range(offset, offset + limit - 1);

                const fallbackResult = await fallbackQuery;

                if (fallbackResult.error) throw fallbackResult.error;

                // Add placeholder tier info since we don't have the view
                data = (fallbackResult.data || []).map(org => ({
                    ...org,
                    tier_name: org.subscription_tier,
                    max_members: null,
                    max_clients: null,
                    current_members: null,
                    current_clients: null
                }));
                error = null;
            }

            if (error) throw error;

            res.json({
                success: true,
                data: data || [],
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: data?.length || 0
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
     * GET /api/platform/organizations/:id
     * Get a single organization's details (admin view)
     */
    router.get('/organizations/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return res.status(404).json({
                        success: false,
                        error: 'Organization not found'
                    });
                }
                throw error;
            }

            // Fetch tier features
            let tier_features = {};
            if (data.subscription_tier) {
                const { data: tierData } = await supabase
                    .from('subscription_tiers')
                    .select('features')
                    .eq('id', data.subscription_tier)
                    .single();
                if (tierData?.features) {
                    tier_features = tierData.features;
                }
            }

            res.json({
                success: true,
                data: {
                    ...data,
                    member_role: 'platform_admin', // Platform admin viewing
                    tier_features
                }
            });
        } catch (error) {
            console.error('Error fetching organization:', error);
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

            // Valid tiers (fallback if table doesn't exist)
            const validTiers = ['starter', 'business', 'enterprise', 'agency_starter', 'agency_professional', 'agency_enterprise', 'free', 'pro'];

            // Try to validate tier from database
            const { data: tierData, error: tierError } = await supabase
                .from('subscription_tiers')
                .select('id')
                .eq('id', tier)
                .single();

            // If table doesn't exist, validate against known tiers
            if (tierError && (tierError.code === '42P01' || tierError.message?.includes('does not exist'))) {
                if (!validTiers.includes(tier)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid tier'
                    });
                }
            } else if (tierError || !tierData) {
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

            // If upgrading to any agency tier, set org_type
            if (tier.startsWith('agency')) {
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
     * PUT /api/platform/organizations/:id/modules
     * Configure which modules are enabled for an organization
     */
    router.put('/organizations/:id/modules', requireAdminWrite, async (req, res) => {
        try {
            const { id } = req.params;
            const { modules } = req.body; // Array of enabled module IDs

            if (!Array.isArray(modules)) {
                return res.status(400).json({
                    success: false,
                    error: 'modules must be an array of module IDs'
                });
            }

            // Get all available modules
            const { data: allModules, error: modError } = await supabase
                .from('platform_modules')
                .select('id');

            if (modError) {
                // If platform_modules table doesn't exist, use known module IDs
                console.warn('platform_modules table not found, using provided list');
            }

            const allModuleIds = allModules ? allModules.map(m => m.id) : modules;
            const userId = req.userId;

            // Upsert each module: enabled if in the list, disabled if not
            const upserts = allModuleIds.map(moduleId => ({
                org_id: id,
                module_id: moduleId,
                is_enabled: modules.includes(moduleId),
                enabled_by: modules.includes(moduleId) ? userId : null,
                enabled_at: modules.includes(moduleId) ? new Date().toISOString() : null,
                disabled_by: !modules.includes(moduleId) ? userId : null,
                disabled_at: !modules.includes(moduleId) ? new Date().toISOString() : null
            }));

            const { error: upsertError } = await supabase
                .from('org_module_access')
                .upsert(upserts, { onConflict: 'org_id,module_id' });

            if (upsertError) throw upsertError;

            res.json({
                success: true,
                message: `${modules.length} modules enabled for organization`,
                data: { enabled: modules }
            });
        } catch (error) {
            console.error('Error configuring org modules:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/platform/organizations/:id
     * Delete an organization (platform admin only)
     */
    router.delete('/organizations/:id', requireAdminWrite, async (req, res) => {
        try {
            const { id } = req.params;

            // Check if org exists
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .select('id, name, is_platform_owner')
                .eq('id', id)
                .single();

            if (orgError || !org) {
                return res.status(404).json({
                    success: false,
                    error: 'Organization not found'
                });
            }

            // Cannot delete platform owner org
            if (org.is_platform_owner) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot delete the platform owner organization'
                });
            }

            // Delete the organization (cascades to members, etc.)
            const { error: deleteError } = await supabase
                .from('organizations')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            res.json({
                success: true,
                message: `Organization "${org.name}" deleted successfully`
            });
        } catch (error) {
            console.error('Error deleting organization:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================
    // USER MANAGEMENT
    // ============================================

    /**
     * GET /api/platform/users
     * List all users with status and organization memberships
     */
    router.get('/users', async (req, res) => {
        try {
            const { status, org_id, search, limit = 50, offset = 0 } = req.query;

            // Try to use platform_users_overview view first
            let query = supabase
                .from('platform_users_overview')
                .select('*');

            if (status) {
                query = query.eq('status', status);
            }

            if (search) {
                query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
            }

            query = query
                .order('created_at', { ascending: false })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            let { data, error } = await query;

            // Fallback if view doesn't exist or permission denied
            if (error && (error.code === '42P01' || error.code === '42501' || error.message?.includes('does not exist') || error.message?.includes('schema cache') || error.message?.includes('permission denied'))) {
                console.log('platform_users_overview unavailable, using fallback query:', error.message);

                // First try with status columns (Phase 47 deployed)
                let fallbackQuery = supabase
                    .from('users')
                    .select('id, email, display_name, role, status, suspended_at, suspended_reason, created_at, updated_at');

                if (status) {
                    fallbackQuery = fallbackQuery.eq('status', status);
                }

                if (search) {
                    fallbackQuery = fallbackQuery.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
                }

                fallbackQuery = fallbackQuery
                    .order('created_at', { ascending: false })
                    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

                let fallbackResult = await fallbackQuery;

                // If status column doesn't exist, try without it (Phase 47 not deployed)
                if (fallbackResult.error && (fallbackResult.error.message?.includes('status') || fallbackResult.error.message?.includes('does not exist'))) {
                    console.log('Status column not found, using basic user query');

                    let basicQuery = supabase
                        .from('users')
                        .select('id, email, display_name, role, created_at, updated_at');

                    if (search) {
                        basicQuery = basicQuery.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
                    }

                    basicQuery = basicQuery
                        .order('created_at', { ascending: false })
                        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

                    fallbackResult = await basicQuery;
                }

                if (fallbackResult.error) throw fallbackResult.error;

                // Fetch organization memberships for each user
                data = await Promise.all((fallbackResult.data || []).map(async (user) => {
                    const { data: memberships } = await supabase
                        .from('organization_members')
                        .select(`
                            org_id,
                            role,
                            status,
                            organization:organizations!inner(id, name, slug, settings)
                        `)
                        .eq('user_id', user.id);

                    const orgs = (memberships || []).map(m => ({
                        org_id: m.org_id,
                        org_name: m.organization?.name,
                        org_slug: m.organization?.slug,
                        member_role: m.role,
                        member_status: m.status,
                        is_personal: m.organization?.settings?.is_personal || m.organization?.slug?.startsWith('personal-')
                    }));

                    return {
                        ...user,
                        // Ensure status fields have defaults if Phase 47 not deployed
                        status: user.status || 'active',
                        suspended_at: user.suspended_at || null,
                        suspended_reason: user.suspended_reason || null,
                        organizations: orgs,
                        active_org_count: orgs.filter(o => o.member_status === 'active').length,
                        is_platform_admin: false // Would need separate query
                    };
                }));

                error = null;
            }

            if (error) throw error;

            // Filter by org_id if provided (post-filter since it's in JSON)
            let filteredData = data || [];
            if (org_id) {
                filteredData = filteredData.filter(user => {
                    const orgs = user.organizations || [];
                    return orgs.some(o => o.org_id === org_id);
                });
            }

            res.json({
                success: true,
                data: filteredData,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: filteredData.length
                }
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/platform/users/suspended
     * Get only suspended users
     */
    router.get('/users/suspended', async (req, res) => {
        try {
            const { search, limit = 50, offset = 0 } = req.query;

            let query = supabase
                .from('users')
                .select('id, email, display_name, role, status, suspended_at, suspended_reason, created_at')
                .eq('status', 'suspended')
                .order('suspended_at', { ascending: false });

            if (search) {
                query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
            }

            query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            const { data, error } = await query;

            // If status column doesn't exist, return empty (Phase 47 not deployed)
            if (error && (error.message?.includes('status') || error.message?.includes('does not exist'))) {
                return res.json({
                    success: true,
                    data: [],
                    message: 'User status feature requires Phase 47 migration',
                    pagination: { limit: parseInt(limit), offset: parseInt(offset), total: 0 }
                });
            }

            if (error) throw error;

            res.json({
                success: true,
                data: data || [],
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: data?.length || 0
                }
            });
        } catch (error) {
            console.error('Error fetching suspended users:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/platform/users/:id
     * Get a single user's details with org memberships
     */
    router.get('/users/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Get user
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single();

            if (userError) {
                if (userError.code === 'PGRST116') {
                    return res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                }
                throw userError;
            }

            // Get org memberships
            const { data: memberships } = await supabase
                .from('organization_members')
                .select(`
                    org_id,
                    role,
                    status,
                    joined_at,
                    organization:organizations!inner(id, name, slug, settings, subscription_tier)
                `)
                .eq('user_id', id);

            // Check if platform admin
            const { data: platformAdmin } = await supabase
                .from('platform_admins')
                .select('role, is_active')
                .eq('user_id', id)
                .single();

            res.json({
                success: true,
                data: {
                    ...user,
                    organizations: (memberships || []).map(m => ({
                        org_id: m.org_id,
                        org_name: m.organization?.name,
                        org_slug: m.organization?.slug,
                        subscription_tier: m.organization?.subscription_tier,
                        member_role: m.role,
                        member_status: m.status,
                        joined_at: m.joined_at,
                        is_personal: m.organization?.settings?.is_personal || m.organization?.slug?.startsWith('personal-')
                    })),
                    platform_admin: platformAdmin ? {
                        role: platformAdmin.role,
                        is_active: platformAdmin.is_active
                    } : null
                }
            });
        } catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/platform/users/:id/status
     * Change a user's status (suspend, reactivate, etc.)
     */
    router.put('/users/:id/status', requireAdminWrite, async (req, res) => {
        try {
            const { id } = req.params;
            const { status, reason } = req.body;

            if (!status || !['active', 'suspended', 'inactive', 'pending_deletion'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid status required: active, suspended, inactive, pending_deletion'
                });
            }

            const updateData = {
                status,
                updated_at: new Date().toISOString()
            };

            // Set suspended fields based on action
            if (status === 'suspended') {
                updateData.suspended_at = new Date().toISOString();
                updateData.suspended_reason = reason || 'Suspended by platform admin';
            } else if (status === 'active') {
                // Clear suspension info when reactivating
                updateData.suspended_at = null;
                updateData.suspended_reason = null;
            }

            const { data, error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            // If status column doesn't exist (Phase 47 not deployed)
            if (error && (error.message?.includes('status') || error.message?.includes('does not exist'))) {
                return res.status(400).json({
                    success: false,
                    error: 'User status management requires Phase 47 migration. Please run db/phase47-user-status.sql'
                });
            }

            if (error) throw error;

            // Log the action
            console.log(`User ${id} status changed to ${status} by admin ${req.userId}${reason ? `: ${reason}` : ''}`);

            res.json({
                success: true,
                data,
                message: `User ${status === 'active' ? 'reactivated' : status}`
            });
        } catch (error) {
            console.error('Error updating user status:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/platform/users
     * Invite a new user via email (Platform Admin only)
     * Sends Supabase invitation email — user sets their own password
     */
    router.post('/users', requireAdminWrite, async (req, res) => {
        try {
            const { email, display_name, org_id, role } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    error: 'Email is required'
                });
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email format'
                });
            }

            // Build redirect URL for invitation acceptance
            const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
            const redirectTo = `${appUrl}/login.html`;

            // Invite user via Supabase Auth (sends email)
            const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
                email,
                {
                    redirectTo,
                    data: {
                        display_name: display_name || email.split('@')[0],
                        invited_by_admin: req.userId,
                        org_id: org_id || null
                    }
                }
            );

            if (authError) {
                console.error('Auth error inviting user:', authError);
                // Handle rate limit errors with a clear message
                const isRateLimit = authError.message?.toLowerCase().includes('rate') ||
                    authError.status === 429;
                return res.status(isRateLimit ? 429 : 400).json({
                    success: false,
                    error: isRateLimit
                        ? 'Email rate limit reached. Please wait before sending more invitations.'
                        : authError.message
                });
            }

            const userId = authData.user.id;

            // Create user record in users table
            const { data: userData, error: userError } = await supabase
                .from('users')
                .insert({
                    id: userId,
                    email,
                    display_name: display_name || email.split('@')[0],
                    status: 'invited',
                    invited_at: new Date().toISOString(),
                    invited_by: req.userId,
                    default_org_id: org_id || null
                })
                .select()
                .single();

            if (userError) {
                console.error('Error creating user record:', userError);
                // User was created in auth but not in users table - try to clean up
                await supabase.auth.admin.deleteUser(userId);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to create user record: ' + userError.message
                });
            }

            // If org_id provided, add user to organization
            if (org_id) {
                const { error: memberError } = await supabase
                    .from('organization_members')
                    .insert({
                        user_id: userId,
                        org_id,
                        role: role || 'member',
                        status: 'active',
                        invited_by: req.userId,
                        joined_at: new Date().toISOString()
                    });

                if (memberError) {
                    console.error('Error adding user to org:', memberError);
                    // User invited, just org membership failed - log but continue
                }
            }

            console.log(`User ${email} invited by admin ${req.userId}`);

            res.status(201).json({
                success: true,
                data: userData,
                message: 'Invitation email sent successfully. User will set their own password.'
            });
        } catch (error) {
            console.error('Error inviting user:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/platform/users/:id/resend-invite
     * Resend invitation email to a user in 'invited' status
     */
    router.post('/users/:id/resend-invite', requireAdminWrite, async (req, res) => {
        try {
            const { id } = req.params;

            // Get user details
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, email, status')
                .eq('id', id)
                .single();

            if (userError || !user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            if (user.status !== 'invited') {
                return res.status(400).json({
                    success: false,
                    error: 'Can only resend invitations to users with invited status'
                });
            }

            // Build redirect URL
            const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
            const redirectTo = `${appUrl}/login.html`;

            // Resend invitation via Supabase
            const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
                user.email,
                { redirectTo }
            );

            if (inviteError) {
                console.error('Error resending invitation:', inviteError);
                const isRateLimit = inviteError.message?.toLowerCase().includes('rate') ||
                    inviteError.status === 429;
                return res.status(isRateLimit ? 429 : 400).json({
                    success: false,
                    error: isRateLimit
                        ? 'Email rate limit reached. Please wait before sending more invitations.'
                        : inviteError.message
                });
            }

            // Update invited_at timestamp
            await supabase
                .from('users')
                .update({ invited_at: new Date().toISOString() })
                .eq('id', id);

            console.log(`Invitation resent to ${user.email} by admin ${req.userId}`);

            res.json({
                success: true,
                message: 'Invitation email resent successfully'
            });
        } catch (error) {
            console.error('Error resending invitation:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/platform/users/:id/add-to-org
     * Add a user to an organization
     */
    router.post('/users/:id/add-to-org', requireAdminWrite, async (req, res) => {
        try {
            const { id } = req.params;
            const { org_id, role = 'member' } = req.body;

            if (!org_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Organization ID is required'
                });
            }

            // Check if already a member
            const { data: existing } = await supabase
                .from('organization_members')
                .select('id, status')
                .eq('user_id', id)
                .eq('org_id', org_id)
                .single();

            if (existing) {
                if (existing.status === 'active') {
                    return res.status(409).json({
                        success: false,
                        error: 'User is already a member of this organization'
                    });
                }

                // Reactivate membership
                const { data, error } = await supabase
                    .from('organization_members')
                    .update({ status: 'active', role })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (error) throw error;

                // Also reactivate user if suspended
                await supabase
                    .from('users')
                    .update({
                        status: 'active',
                        suspended_at: null,
                        suspended_reason: null
                    })
                    .eq('id', id)
                    .eq('status', 'suspended');

                return res.json({
                    success: true,
                    data,
                    message: 'Membership reactivated'
                });
            }

            // Create new membership
            const { data, error } = await supabase
                .from('organization_members')
                .insert({
                    user_id: id,
                    org_id,
                    role,
                    status: 'active',
                    invited_by: req.userId,
                    joined_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // Reactivate user if suspended
            await supabase
                .from('users')
                .update({
                    status: 'active',
                    suspended_at: null,
                    suspended_reason: null
                })
                .eq('id', id)
                .eq('status', 'suspended');

            res.json({
                success: true,
                data,
                message: 'User added to organization'
            });
        } catch (error) {
            console.error('Error adding user to org:', error);
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

            // Get user status breakdown (graceful fallback if status column doesn't exist)
            let userStatusCounts = { active: totalUsers || 0 };
            const { data: userStatusData, error: userStatusError } = await supabase
                .from('users')
                .select('status');

            if (!userStatusError && userStatusData) {
                userStatusCounts = userStatusData.reduce((acc, u) => {
                    const status = u.status || 'active';
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                }, {});
            }

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
                    users: {
                        total: totalUsers || 0,
                        by_status: userStatusCounts
                    },
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


    // ============================================
    // MODULE ADD-ON PRICING MANAGEMENT
    // ============================================

    /**
     * PUT /api/platform/modules/:id/addon-pricing
     * Set or update addon pricing for a module
     */
    router.put('/modules/:id/addon-pricing', requireAdminWrite, async (req, res) => {
        try {
            const { id } = req.params;
            const { is_addon_purchasable, addon_price_monthly, addon_price_yearly, addon_description } = req.body;

            const updates = {};
            if (typeof is_addon_purchasable === 'boolean') updates.is_addon_purchasable = is_addon_purchasable;
            if (addon_price_monthly !== undefined) updates.addon_price_monthly = addon_price_monthly;
            if (addon_price_yearly !== undefined) updates.addon_price_yearly = addon_price_yearly;
            if (addon_description !== undefined) updates.addon_description = addon_description;

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ success: false, error: 'No fields to update' });
            }

            const { data, error } = await supabase
                .from('platform_modules')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating module addon pricing:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/platform/orgs/:orgId/addons
     * List an org's purchased add-on modules
     */
    router.get('/orgs/:orgId/addons', async (req, res) => {
        try {
            const { orgId } = req.params;

            const { data, error } = await supabase
                .from('org_module_purchases')
                .select(`
                    *,
                    module:platform_modules(id, name, icon, description)
                `)
                .eq('org_id', orgId)
                .order('purchased_at', { ascending: false });

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error fetching org addons:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/platform/orgs/:orgId/addons
     * Purchase an add-on module for an org
     */
    router.post('/orgs/:orgId/addons', requireAdminWrite, async (req, res) => {
        try {
            const { orgId } = req.params;
            const { module_id, billing_period } = req.body;

            if (!module_id) {
                return res.status(400).json({ success: false, error: 'module_id is required' });
            }

            // Verify module exists and is purchasable
            const { data: moduleData, error: moduleError } = await supabase
                .from('platform_modules')
                .select('id, name, is_addon_purchasable, addon_price_monthly, addon_price_yearly')
                .eq('id', module_id)
                .single();

            if (moduleError || !moduleData) {
                return res.status(404).json({ success: false, error: 'Module not found' });
            }

            if (!moduleData.is_addon_purchasable) {
                return res.status(400).json({ success: false, error: 'This module is not available as an add-on' });
            }

            const period = billing_period || 'monthly';
            const price = period === 'yearly' ? moduleData.addon_price_yearly : moduleData.addon_price_monthly;

            const { data, error } = await supabase
                .from('org_module_purchases')
                .upsert({
                    org_id: orgId,
                    module_id,
                    billing_period: period,
                    price_at_purchase: price,
                    status: 'active',
                    purchased_by: req.userId,
                    purchased_at: new Date().toISOString(),
                    cancelled_at: null
                }, { onConflict: 'org_id,module_id' })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error purchasing addon:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/platform/orgs/:orgId/addons/:moduleId
     * Cancel an add-on module for an org
     */
    router.delete('/orgs/:orgId/addons/:moduleId', requireAdminWrite, async (req, res) => {
        try {
            const { orgId, moduleId } = req.params;

            const { data, error } = await supabase
                .from('org_module_purchases')
                .update({
                    status: 'cancelled',
                    cancelled_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('org_id', orgId)
                .eq('module_id', moduleId)
                .eq('status', 'active')
                .select()
                .single();

            if (error) throw error;

            if (!data) {
                return res.status(404).json({ success: false, error: 'Active addon not found' });
            }

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error cancelling addon:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });


    return router;
};
