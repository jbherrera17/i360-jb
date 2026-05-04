/**
 * Thought Leadership — shared constants and middleware factory.
 *
 * Module-access gate uses Phase 44's can_access_module RPC and was originally
 * inside the parent factory closure. Extracted so the coordinator can apply
 * it once at the parent level.
 */

// TL Agent IDs (from seed-thought-leadership-agents.sql)
const TL_AGENTS = {
    STRATEGY_ARCHITECT: 'a0000001-0000-4000-a000-000000000301',
    VISIBILITY_RESEARCHER: 'a0000001-0000-4000-a000-000000000302',
    PILLAR_DESIGNER: 'a0000001-0000-4000-a000-000000000303',
    ARTICLE_WRITER: 'a0000001-0000-4000-a000-000000000304',
    LINKEDIN_GENERATOR: 'a0000001-0000-4000-a000-000000000305',
};

/**
 * Middleware factory: gate access by Phase 44 module access (`thought_leadership`).
 * Lets the request through if the module-access check fails or returns null/true;
 * blocks only on an explicit `false`. Mirrors the original behavior — a
 * permissive default with explicit denial path.
 */
function createModuleAccessMiddleware(supabase) {
    return async (req, res, next) => {
        try {
            const userId = req.userId || req.userId;
            const orgId = req.headers['x-org-id'] || req.orgId || null;

            if (!userId) {
                return next();
            }

            const { data: canAccess, error } = await supabase
                .rpc('can_access_module', {
                    p_user_id: userId,
                    p_module_id: 'thought_leadership',
                    p_org_id: orgId || null,
                });

            if (error) {
                console.error('Module access check error:', error);
                return next();
            }

            if (canAccess === false) {
                return res.status(403).json({
                    success: false,
                    error: 'Thought Leadership requires a Business tier or higher subscription',
                    module: 'thought_leadership',
                    upgrade_required: true,
                });
            }

            next();
        } catch (err) {
            console.error('Module access middleware error:', err);
            next();
        }
    };
}

module.exports = { TL_AGENTS, createModuleAccessMiddleware };
