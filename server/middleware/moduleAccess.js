/**
 * Module Access Middleware
 *
 * Provides middleware for checking module access and resource limits
 * based on subscription tiers and business roles.
 */

/**
 * Create middleware that requires access to a specific module
 *
 * @param {string} moduleId - The module ID to check access for
 * @returns {Function} Express middleware function
 *
 * @example
 * // Protect a route that requires Research Studio module
 * router.get('/research', requireModule('research_studio'), async (req, res) => {...});
 */
function createModuleAccessMiddleware(supabase) {

    const requireModule = (moduleId) => {
        return async (req, res, next) => {
            try {
                const userId = req.userId;
                const orgId = req.headers['x-org-id'] || req.query.org_id || req.body?.org_id;

                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required'
                    });
                }

                // Check module access using the database function
                const { data: canAccess, error } = await supabase
                    .rpc('can_access_module', {
                        p_user_id: userId,
                        p_module_id: moduleId,
                        p_org_id: orgId || null
                    });

                if (error) {
                    console.error('Module access check error:', error);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to verify module access'
                    });
                }

                if (!canAccess) {
                    // Get module details for the error message
                    const { data: module } = await supabase
                        .from('platform_modules')
                        .select('name, min_tier, min_business_role')
                        .eq('id', moduleId)
                        .single();

                    return res.status(403).json({
                        success: false,
                        error: 'Module not available for your subscription tier or role',
                        module: module?.name || moduleId,
                        requirements: {
                            min_tier: module?.min_tier,
                            min_business_role: module?.min_business_role
                        }
                    });
                }

                next();
            } catch (error) {
                console.error('Module access middleware error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Module access check failed'
                });
            }
        };
    };

    /**
     * Middleware that checks resource limits before allowing creation
     *
     * @param {string} resourceType - The resource type to check ('agents', 'workflows', etc.)
     * @returns {Function} Express middleware function
     *
     * @example
     * // Check agent limit before creating a new agent
     * router.post('/', checkResourceLimit('agents'), async (req, res) => {...});
     */
    const checkResourceLimit = (resourceType) => {
        return async (req, res, next) => {
            try {
                const userId = req.userId;
                const orgId = req.headers['x-org-id'] || req.query.org_id || req.body?.org_id;

                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required'
                    });
                }

                // If no org context, skip limit check (legacy behavior)
                if (!orgId) {
                    return next();
                }

                // Check if within limits
                const { data, error } = await supabase
                    .rpc('check_org_limits', {
                        p_org_id: orgId,
                        p_resource_type: resourceType
                    });

                if (error) {
                    console.error('Resource limit check error:', error);
                    // Don't block on error, just log it
                    return next();
                }

                const limitData = data?.[0];

                if (limitData && !limitData.within_limits) {
                    return res.status(403).json({
                        success: false,
                        error: `${resourceType} limit reached`,
                        details: {
                            current: limitData.current_count,
                            max: limitData.max_allowed,
                            usage_percent: limitData.usage_percent
                        },
                        upgrade_required: true
                    });
                }

                // Attach limit info to request for potential use in handler
                req.resourceLimits = limitData;

                next();
            } catch (error) {
                console.error('Resource limit middleware error:', error);
                // Don't block on error
                next();
            }
        };
    };

    /**
     * Middleware that requires platform admin access
     *
     * @param {string[]} [roles] - Optional array of allowed roles. If not provided, any platform admin role is accepted.
     * @returns {Function} Express middleware function
     *
     * @example
     * // Require any platform admin
     * router.get('/stats', requirePlatformAdmin(), async (req, res) => {...});
     *
     * // Require super_admin or admin role
     * router.put('/config', requirePlatformAdmin(['super_admin', 'admin']), async (req, res) => {...});
     */
    const requirePlatformAdmin = (roles = null) => {
        return async (req, res, next) => {
            try {
                const userId = req.userId;

                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required'
                    });
                }

                // Check if user is a platform admin
                const { data: isAdmin, error: adminError } = await supabase
                    .rpc('is_platform_admin', { p_user_id: userId });

                if (adminError || !isAdmin) {
                    return res.status(403).json({
                        success: false,
                        error: 'Platform admin access required'
                    });
                }

                // If specific roles required, check the role
                if (roles && roles.length > 0) {
                    const { data: adminRole, error: roleError } = await supabase
                        .rpc('get_platform_admin_role', { p_user_id: userId });

                    if (roleError || !roles.includes(adminRole)) {
                        return res.status(403).json({
                            success: false,
                            error: `Required role: ${roles.join(' or ')}`
                        });
                    }

                    req.platformAdminRole = adminRole;
                }

                next();
            } catch (error) {
                console.error('Platform admin middleware error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to verify admin status'
                });
            }
        };
    };

    /**
     * Middleware that checks if a feature is enabled for the organization's tier
     *
     * @param {string} featureName - The feature name to check (e.g., 'white_label', 'sso')
     * @returns {Function} Express middleware function
     *
     * @example
     * // Check if SSO feature is enabled
     * router.post('/sso/configure', requireFeature('sso'), async (req, res) => {...});
     */
    const requireFeature = (featureName) => {
        return async (req, res, next) => {
            try {
                const userId = req.userId;
                const orgId = req.headers['x-org-id'] || req.query.org_id || req.body?.org_id;

                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required'
                    });
                }

                if (!orgId) {
                    return res.status(400).json({
                        success: false,
                        error: 'Organization context required'
                    });
                }

                // Get org's tier
                const { data: org, error: orgError } = await supabase
                    .from('organizations')
                    .select('subscription_tier')
                    .eq('id', orgId)
                    .single();

                if (orgError || !org) {
                    return res.status(404).json({
                        success: false,
                        error: 'Organization not found'
                    });
                }

                // Get tier's features
                const { data: tier, error: tierError } = await supabase
                    .from('subscription_tiers')
                    .select('features')
                    .eq('id', org.subscription_tier)
                    .single();

                if (tierError) {
                    console.error('Tier lookup error:', tierError);
                    return next(); // Don't block on error
                }

                const features = tier?.features || {};

                if (!features[featureName]) {
                    return res.status(403).json({
                        success: false,
                        error: `Feature '${featureName}' requires a higher subscription tier`,
                        current_tier: org.subscription_tier,
                        upgrade_required: true
                    });
                }

                next();
            } catch (error) {
                console.error('Feature check middleware error:', error);
                next(); // Don't block on error
            }
        };
    };

    /**
     * Middleware that attaches organization context to the request
     * Useful for routes that need org info but don't require a specific module
     *
     * @returns {Function} Express middleware function
     */
    const attachOrgContext = () => {
        return async (req, res, next) => {
            try {
                const userId = req.userId;
                const orgId = req.headers['x-org-id'] || req.query.org_id;

                if (!userId || !orgId) {
                    return next();
                }

                // Get org details with tier info
                const { data: org, error } = await supabase
                    .from('organizations')
                    .select(`
                        id,
                        name,
                        slug,
                        subscription_tier,
                        org_type,
                        settings
                    `)
                    .eq('id', orgId)
                    .single();

                if (!error && org) {
                    req.organization = org;

                    // Get tier features
                    const { data: tier } = await supabase
                        .from('subscription_tiers')
                        .select('features, max_members, max_clients, max_agents')
                        .eq('id', org.subscription_tier)
                        .single();

                    if (tier) {
                        req.tierFeatures = tier.features || {};
                        req.tierLimits = {
                            max_members: tier.max_members,
                            max_clients: tier.max_clients,
                            max_agents: tier.max_agents
                        };
                    }
                }

                next();
            } catch (error) {
                console.error('Org context middleware error:', error);
                next();
            }
        };
    };

    return {
        requireModule,
        checkResourceLimit,
        requirePlatformAdmin,
        requireFeature,
        attachOrgContext
    };
}

module.exports = createModuleAccessMiddleware;
