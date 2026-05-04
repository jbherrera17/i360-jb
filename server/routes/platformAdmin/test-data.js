/**
 * Platform Admin — Test Data Reset.
 *
 * requirePlatformAdmin is applied by the coordinator. requireAdminWrite is per-route.
 */

const express = require('express');

module.exports = function (supabase, requireAdminWrite) {
    const router = express.Router();


    // ============================================
    // TEST DATA RESET
    // ============================================

    /**
     * POST /api/platform/reset-test-data
     * Deletes all organizations and users EXCEPT Synergi (platform owner).
     * Requires super_admin role. Cleans up orphaned data and auth.users entries.
     */
    router.post('/reset-test-data', requireAdminWrite, async (req, res) => {
        try {
            // Extra safety: only super_admin can reset
            if (req.platformAdminRole !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Only super_admin can reset test data'
                });
            }

            const { confirm } = req.body;
            if (confirm !== 'RESET_ALL_TEST_DATA') {
                return res.status(400).json({
                    success: false,
                    error: 'Must send { "confirm": "RESET_ALL_TEST_DATA" } to proceed'
                });
            }

            console.log(`[RESET] Test data reset initiated by user ${req.userId}`);

            // Step 1: Get non-Synergi user IDs BEFORE deletion (for auth.users cleanup)
            const { data: synergiOrg } = await supabase
                .from('organizations')
                .select('id')
                .eq('is_platform_owner', true)
                .single();

            if (!synergiOrg) {
                return res.status(500).json({
                    success: false,
                    error: 'Platform owner organization not found'
                });
            }

            // Get Synergi member IDs
            const { data: synergiMembers } = await supabase
                .from('organization_members')
                .select('user_id')
                .eq('org_id', synergiOrg.id)
                .eq('status', 'active');

            const synergiUserIds = new Set((synergiMembers || []).map(m => m.user_id));

            // Get ALL auth users to find non-Synergi ones
            const { data: authData } = await supabase.auth.admin.listUsers();
            const authUsers = authData?.users || [];
            const nonSynergiAuthUsers = authUsers.filter(u => !synergiUserIds.has(u.id));

            // Step 2: Run the SQL reset function (handles public tables)
            const { data: resetResult, error: resetError } = await supabase
                .rpc('reset_test_data');

            if (resetError) {
                console.error('[RESET] SQL function error:', resetError);
                throw resetError;
            }

            // Step 3: Delete non-Synergi users from auth.users
            let authDeleteCount = 0;
            const authDeleteErrors = [];

            for (const user of nonSynergiAuthUsers) {
                try {
                    const { error } = await supabase.auth.admin.deleteUser(user.id);
                    if (error) {
                        authDeleteErrors.push({ id: user.id, email: user.email, error: error.message });
                    } else {
                        authDeleteCount++;
                    }
                } catch (err) {
                    authDeleteErrors.push({ id: user.id, email: user.email, error: err.message });
                }
            }

            console.log(`[RESET] Complete. Orgs deleted: ${resetResult?.organizations_deleted}, Users deleted: ${resetResult?.users_deleted}, Auth users deleted: ${authDeleteCount}`);

            res.json({
                success: true,
                message: 'Test data reset complete',
                summary: {
                    ...resetResult,
                    auth_users_deleted: authDeleteCount,
                    auth_delete_errors: authDeleteErrors.length > 0 ? authDeleteErrors : undefined
                }
            });
        } catch (error) {
            console.error('[RESET] Error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });


    return router;
};
