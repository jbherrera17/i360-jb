/**
 * Platform Admin — Platform Admin Management.
 *
 * requirePlatformAdmin is applied by the coordinator. requireAdminWrite is per-route.
 */

const express = require('express');

module.exports = function (supabase, _requireAdminWrite) {
    const router = express.Router();

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


    return router;
};
