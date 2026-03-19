/**
 * Organization Context Middleware
 *
 * Validates that the requesting user is a member of the organization
 * specified in the x-org-id header. Sets req.verifiedOrgId on success.
 *
 * Phase 82: Multi-tenant data isolation hardening
 *
 * Usage:
 *   const { requireOrgContext } = require('../middleware/orgContext');
 *   router.get('/', requireOrgContext(supabase), handler);
 *
 * For platform admin routes that need cross-org access:
 *   router.get('/', requireOrgContext(supabase, { allowPlatformAdmin: true }), handler);
 */

function requireOrgContext(supabase, options = {}) {
    const { allowPlatformAdmin = false } = options;

    return async function (req, res, next) {
        // Platform admins can bypass org validation for cross-org operations
        if (allowPlatformAdmin && req.isPlatformAdmin) {
            // Still read the org header if present, but don't require it
            req.verifiedOrgId = req.headers['x-org-id'] || req.orgId || null;
            return next();
        }

        const orgId = req.headers['x-org-id'] || req.orgId;

        if (!orgId) {
            return res.status(400).json({
                success: false,
                error: 'Organization context required. Include x-org-id header.',
                code: 'ORG_CONTEXT_REQUIRED'
            });
        }

        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        // Validate user is a member of the claimed org
        try {
            const { data: membership, error } = await supabase
                .from('organization_members')
                .select('role, business_role')
                .eq('org_id', orgId)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (error || !membership) {
                return res.status(403).json({
                    success: false,
                    error: 'Not a member of this organization',
                    code: 'ORG_ACCESS_DENIED'
                });
            }

            // Set verified org context on request
            req.verifiedOrgId = orgId;
            req.verifiedOrgRole = membership.role;
            req.verifiedBusinessRole = membership.business_role || 'ic';
            next();
        } catch (err) {
            console.error('Org context validation error:', err);
            return res.status(500).json({
                success: false,
                error: 'Failed to validate organization access'
            });
        }
    };
}

module.exports = { requireOrgContext };
