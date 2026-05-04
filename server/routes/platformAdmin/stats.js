/**
 * Platform Admin — Platform Statistics.
 *
 * requirePlatformAdmin is applied by the coordinator. requireAdminWrite is per-route.
 */

const express = require('express');

module.exports = function (supabase, _requireAdminWrite) {
    const router = express.Router();

    /**
     * GET /api/platform/stats
     * Get platform-wide statistics.
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



    return router;
};
