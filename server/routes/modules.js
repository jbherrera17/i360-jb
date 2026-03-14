/**
 * Modules API Routes
 * Manages module access for users and organizations
 */

const express = require('express');
const router = express.Router();

module.exports = function(supabase) {

    /**
     * GET /api/modules
     * Get modules accessible to the current user
     *
     * Returns modules based on:
     * - User's organization tier
     * - User's business role
     * - Organization-specific module overrides
     */
    router.get('/', async (req, res) => {
        try {
            const userId = req.userId;
            // Fallback to req.orgId (set by auth middleware from user's default_org_id)
            const orgId = req.headers['x-org-id'] || req.query.org_id || req.orgId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Use the database function to get accessible modules
            const { data, error } = await supabase
                .rpc('get_user_modules', {
                    p_user_id: userId,
                    p_org_id: orgId || null
                });

            if (error) throw error;

            // Group modules by nav_group for frontend navigation
            const grouped = {};
            (data || []).forEach(module => {
                const group = module.nav_group || 'other';
                if (!grouped[group]) {
                    grouped[group] = [];
                }
                grouped[group].push(module);
            });

            res.json({
                success: true,
                data: {
                    modules: data || [],
                    grouped
                }
            });
        } catch (error) {
            console.error('Error fetching user modules:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/modules/usage
     * Get resource usage, limits, warnings, and blocks for the current org.
     * Used by the usage-nudge frontend to show upgrade prompts.
     */
    router.get('/usage', async (req, res) => {
        try {
            const userId = req.userId;
            const orgId = req.headers['x-org-id'] || req.query.org_id || req.orgId;

            if (!userId) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }

            if (!orgId) {
                return res.status(400).json({ success: false, error: 'Organization ID required (x-org-id header)' });
            }

            // Get org's current tier
            const { data: orgData, error: orgError } = await supabase
                .from('organizations')
                .select('subscription_tier')
                .eq('id', orgId)
                .single();

            if (orgError || !orgData) {
                return res.status(404).json({ success: false, error: 'Organization not found' });
            }

            const currentTier = orgData.subscription_tier;

            // Get tier details
            const { data: tierData } = await supabase
                .from('subscription_tiers')
                .select('id, name, display_order, tier_group, allow_self_upgrade')
                .eq('id', currentTier)
                .single();

            // Get next upgrade tier (same tier_group, next display_order)
            let nextTier = null;
            if (tierData) {
                const { data: nextTierData } = await supabase
                    .from('subscription_tiers')
                    .select('id, name, price_monthly, display_order')
                    .eq('is_active', true)
                    .eq('tier_group', tierData.tier_group || 'standard')
                    .gt('display_order', tierData.display_order)
                    .order('display_order')
                    .limit(1)
                    .single();

                nextTier = nextTierData || null;
            }

            // Check limits for all resource types
            const resourceTypes = [
                'members', 'clients', 'agents', 'workflows',
                'skills', 'context_assets', 'research_studios'
            ];

            const limits = {};
            const warnings = [];
            const blocks = [];

            for (const resourceType of resourceTypes) {
                const { data, error } = await supabase
                    .rpc('check_org_limits', {
                        p_org_id: orgId,
                        p_resource_type: resourceType
                    });

                if (!error && data?.[0]) {
                    const info = data[0];
                    limits[resourceType] = info;

                    const pct = info.usage_percent || 0;
                    if (pct >= 100) {
                        blocks.push({
                            resource: resourceType,
                            current: info.current_count,
                            max: info.max_allowed,
                            percent: pct
                        });
                    } else if (pct >= 80) {
                        warnings.push({
                            resource: resourceType,
                            current: info.current_count,
                            max: info.max_allowed,
                            percent: pct
                        });
                    }
                }
            }

            res.json({
                success: true,
                data: {
                    tier: tierData ? { id: tierData.id, name: tierData.name, allow_self_upgrade: tierData.allow_self_upgrade } : { id: currentTier, name: currentTier },
                    limits,
                    warnings,
                    blocks,
                    next_tier: nextTier
                }
            });
        } catch (error) {
            console.error('Error fetching usage data:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/modules/all
     * Get all platform modules (for admin display)
     */
    router.get('/all', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const { data, error } = await supabase
                .from('platform_modules')
                .select(`
                    *,
                    min_tier_details:subscription_tiers!platform_modules_min_tier_fkey (
                        id,
                        name,
                        display_order
                    ),
                    min_role_details:business_role_levels!platform_modules_min_business_role_fkey (
                        id,
                        name,
                        level
                    )
                `)
                .eq('is_active', true)
                .order('display_order');

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error fetching all modules:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/modules/check/:moduleId
     * Check if current user can access a specific module
     */
    router.get('/check/:moduleId', async (req, res) => {
        try {
            const userId = req.userId;
            const { moduleId } = req.params;
            const orgId = req.headers['x-org-id'] || req.query.org_id || req.orgId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const { data, error } = await supabase
                .rpc('can_access_module', {
                    p_user_id: userId,
                    p_module_id: moduleId,
                    p_org_id: orgId || null
                });

            if (error) throw error;

            // If access denied, get the requirements so frontend can show upgrade info
            let requirements = null;
            if (!data) {
                const { data: moduleData } = await supabase
                    .from('platform_modules')
                    .select('id, name, min_tier, min_business_role')
                    .eq('id', moduleId)
                    .single();

                if (moduleData) {
                    requirements = {
                        min_tier: moduleData.min_tier,
                        min_business_role: moduleData.min_business_role
                    };
                }
            }

            res.json({
                success: true,
                data: {
                    module_id: moduleId,
                    can_access: data,
                    requirements
                }
            });
        } catch (error) {
            console.error('Error checking module access:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/modules/tiers
     * Get available subscription tiers (for upgrade prompts)
     */
    router.get('/tiers', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('subscription_tiers')
                .select('id, name, description, price_monthly, price_yearly, features, display_order')
                .eq('is_active', true)
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


    // ============================================
    // ORGANIZATION MODULE CONFIGURATION
    // ============================================

    /**
     * GET /api/modules/org/:orgId
     * Get module configuration for an organization
     */
    router.get('/org/:orgId', async (req, res) => {
        try {
            const userId = req.userId;
            const { orgId } = req.params;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Check membership
            const { data: membership, error: memberError } = await supabase
                .from('organization_members')
                .select('role')
                .eq('org_id', orgId)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (memberError || !membership) {
                return res.status(403).json({
                    success: false,
                    error: 'Not a member of this organization'
                });
            }

            // Get org tier details
            const { data: orgData, error: orgError } = await supabase
                .rpc('get_org_tier_details', { p_org_id: orgId });

            if (orgError) throw orgError;

            // Get all modules with org-specific overrides
            const { data: modules, error: modulesError } = await supabase
                .from('platform_modules')
                .select(`
                    *,
                    org_override:org_module_access!left (
                        is_enabled,
                        settings
                    )
                `)
                .eq('is_active', true)
                .eq('org_module_access.org_id', orgId)
                .order('display_order');

            if (modulesError) throw modulesError;

            // Get org's tier to determine available modules
            const tier = orgData?.[0]?.subscription_tier || 'starter';
            const { data: tierData } = await supabase
                .from('subscription_tiers')
                .select('display_order')
                .eq('id', tier)
                .single();

            const tierOrder = tierData?.display_order || 1;

            // Enrich modules with availability info
            const enrichedModules = await Promise.all(modules.map(async (module) => {
                // Check if module is available for this tier
                let available = true;
                if (module.min_tier) {
                    const { data: minTierData } = await supabase
                        .from('subscription_tiers')
                        .select('display_order')
                        .eq('id', module.min_tier)
                        .single();

                    available = tierOrder >= (minTierData?.display_order || 999);
                }

                // Get override if exists
                const override = module.org_override?.[0];

                return {
                    ...module,
                    org_override: undefined,
                    available_for_tier: available,
                    is_enabled: override?.is_enabled ?? true,
                    org_settings: override?.settings || {}
                };
            }));

            res.json({
                success: true,
                data: {
                    organization: orgData?.[0] || null,
                    modules: enrichedModules,
                    member_role: membership.role
                }
            });
        } catch (error) {
            console.error('Error fetching org modules:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/modules/org/:orgId/:moduleId
     * Enable or disable a module for an organization
     */
    router.put('/org/:orgId/:moduleId', async (req, res) => {
        try {
            const userId = req.userId;
            const { orgId, moduleId } = req.params;
            const { is_enabled, settings } = req.body;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Check admin/owner role
            const { data: membership, error: memberError } = await supabase
                .from('organization_members')
                .select('role')
                .eq('org_id', orgId)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (memberError || !membership || !['owner', 'admin'].includes(membership.role)) {
                return res.status(403).json({
                    success: false,
                    error: 'Admin access required'
                });
            }

            // Check if module exists
            const { data: module, error: moduleError } = await supabase
                .from('platform_modules')
                .select('id, min_tier')
                .eq('id', moduleId)
                .single();

            if (moduleError || !module) {
                return res.status(404).json({
                    success: false,
                    error: 'Module not found'
                });
            }

            // If enabling, check tier requirement
            if (is_enabled && module.min_tier) {
                const { data: orgData } = await supabase
                    .from('organizations')
                    .select('subscription_tier')
                    .eq('id', orgId)
                    .single();

                const { data: orgTier } = await supabase
                    .from('subscription_tiers')
                    .select('display_order')
                    .eq('id', orgData?.subscription_tier)
                    .single();

                const { data: minTier } = await supabase
                    .from('subscription_tiers')
                    .select('display_order')
                    .eq('id', module.min_tier)
                    .single();

                if ((orgTier?.display_order || 0) < (minTier?.display_order || 0)) {
                    return res.status(403).json({
                        success: false,
                        error: `This module requires ${module.min_tier} tier or higher`
                    });
                }
            }

            // Upsert the module access record
            const { data, error } = await supabase
                .from('org_module_access')
                .upsert({
                    org_id: orgId,
                    module_id: moduleId,
                    is_enabled: is_enabled,
                    settings: settings || {},
                    enabled_at: is_enabled ? new Date().toISOString() : null,
                    enabled_by: is_enabled ? userId : null,
                    disabled_at: !is_enabled ? new Date().toISOString() : null,
                    disabled_by: !is_enabled ? userId : null
                }, {
                    onConflict: 'org_id,module_id'
                })
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error updating org module:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });


    // ============================================
    // ROLE MODULE ACCESS
    // ============================================

    /**
     * GET /api/modules/roles/:orgId
     * Get role-module access configuration for an organization
     */
    router.get('/roles/:orgId', async (req, res) => {
        try {
            const userId = req.userId;
            const { orgId } = req.params;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Check membership
            const { data: membership } = await supabase
                .from('organization_members')
                .select('role')
                .eq('org_id', orgId)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (!membership) {
                return res.status(403).json({
                    success: false,
                    error: 'Not a member of this organization'
                });
            }

            // Get global defaults and org-specific overrides
            const { data: roleAccess, error } = await supabase
                .from('role_module_access')
                .select(`
                    *,
                    module:platform_modules (
                        id,
                        name,
                        category
                    ),
                    role:business_role_levels (
                        id,
                        name,
                        level
                    )
                `)
                .or(`org_id.eq.${orgId},org_id.is.null`)
                .order('business_role')
                .order('module_id');

            if (error) throw error;

            // Organize by role
            const byRole = {};
            roleAccess.forEach(access => {
                const roleId = access.business_role;
                if (!byRole[roleId]) {
                    byRole[roleId] = {
                        role: access.role,
                        modules: {}
                    };
                }

                // Org-specific overrides take precedence
                if (access.org_id || !byRole[roleId].modules[access.module_id]) {
                    byRole[roleId].modules[access.module_id] = {
                        module: access.module,
                        can_access: access.can_access,
                        is_org_override: !!access.org_id
                    };
                }
            });

            res.json({
                success: true,
                data: {
                    by_role: byRole,
                    raw: roleAccess
                }
            });
        } catch (error) {
            console.error('Error fetching role module access:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/modules/roles/:orgId
     * Update role-module access for an organization
     */
    router.put('/roles/:orgId', async (req, res) => {
        try {
            const userId = req.userId;
            const { orgId } = req.params;
            const { business_role, module_id, can_access } = req.body;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Check admin role
            const { data: membership } = await supabase
                .from('organization_members')
                .select('role')
                .eq('org_id', orgId)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (!membership || !['owner', 'admin'].includes(membership.role)) {
                return res.status(403).json({
                    success: false,
                    error: 'Admin access required'
                });
            }

            if (!business_role || !module_id) {
                return res.status(400).json({
                    success: false,
                    error: 'business_role and module_id are required'
                });
            }

            // Upsert role-module access
            const { data, error } = await supabase
                .from('role_module_access')
                .upsert({
                    org_id: orgId,
                    business_role,
                    module_id,
                    can_access
                }, {
                    onConflict: 'org_id,business_role,module_id'
                })
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error updating role module access:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });


    // ============================================
    // RESOURCE LIMITS
    // ============================================

    /**
     * GET /api/modules/limits/:orgId
     * Get resource usage and limits for an organization
     */
    router.get('/limits/:orgId', async (req, res) => {
        try {
            const userId = req.userId;
            const { orgId } = req.params;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Check membership
            const { data: membership } = await supabase
                .from('organization_members')
                .select('role')
                .eq('org_id', orgId)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (!membership) {
                return res.status(403).json({
                    success: false,
                    error: 'Not a member of this organization'
                });
            }

            // Get limits for each resource type
            const resourceTypes = [
                'members',
                'clients',
                'agents',
                'workflows',
                'skills',
                'context_assets',
                'research_studios'
            ];

            const limits = {};
            for (const resourceType of resourceTypes) {
                const { data, error } = await supabase
                    .rpc('check_org_limits', {
                        p_org_id: orgId,
                        p_resource_type: resourceType
                    });

                if (!error && data?.[0]) {
                    limits[resourceType] = data[0];
                }
            }

            res.json({
                success: true,
                data: limits
            });
        } catch (error) {
            console.error('Error fetching org limits:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/modules/limits/:orgId/:resourceType
     * Check if an organization can add more of a specific resource
     */
    router.get('/limits/:orgId/:resourceType', async (req, res) => {
        try {
            const userId = req.userId;
            const { orgId, resourceType } = req.params;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const { data, error } = await supabase
                .rpc('check_org_limits', {
                    p_org_id: orgId,
                    p_resource_type: resourceType
                });

            if (error) throw error;

            const limitData = data?.[0] || {
                current_count: 0,
                max_allowed: 0,
                within_limits: false,
                usage_percent: 100
            };

            res.json({
                success: true,
                data: limitData
            });
        } catch (error) {
            console.error('Error checking resource limit:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });


    return router;
};
