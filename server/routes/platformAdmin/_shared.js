/**
 * Platform Admin — shared middleware factory.
 *
 * Both middlewares were originally closure-scoped inside platformAdmin.js.
 * Extracted here so every sub-router can wire `requireAdminWrite` per-route
 * while the coordinator applies `requirePlatformAdmin` once at the parent.
 */

module.exports = function createMiddlewares(supabase) {
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

    return { requirePlatformAdmin, requireAdminWrite };
};
