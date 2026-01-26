/**
 * Users API Routes - Insight 360
 * Admin endpoints for user management
 * Version: 1.0.0
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

/**
 * GET /api/users
 * List all users (admin only)
 */
router.get('/', async (req, res) => {
    try {
        const { limit = 100, offset = 0, department_id, business_role, search } = req.query;

        let query = supabase
            .from('users')
            .select(`
                id,
                email,
                display_name,
                business_role,
                department_id,
                created_at
            `)
            .order('display_name', { ascending: true });

        // Apply filters
        if (department_id) {
            query = query.eq('department_id', department_id);
        }

        if (business_role) {
            query = query.eq('business_role', business_role);
        }

        if (search) {
            query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
        }

        // Apply pagination
        query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch users: ${error.message}`);
        }

        // Get department info separately to avoid join issues
        const deptIds = [...new Set((data || []).map(u => u.department_id).filter(Boolean))];
        let departments = [];

        if (deptIds.length > 0) {
            const { data: deptData } = await supabase
                .from('departments')
                .select('id, name')
                .in('id', deptIds);
            departments = deptData || [];
        }

        const deptMap = new Map(departments.map(d => [d.id, d]));

        // Merge department info
        const usersWithDepts = (data || []).map(user => ({
            ...user,
            departments: user.department_id ? deptMap.get(user.department_id) : null
        }));

        res.json({
            success: true,
            data: usersWithDepts,
            count: usersWithDepts.length
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
 * GET /api/users/unified
 * Get all users with their organization assignments (platform, org members, client portal)
 * For unified user management UI
 */
router.get('/unified', async (req, res) => {
    try {
        const { limit = 100, offset = 0, search, filter } = req.query;

        // Build base users query
        let query = supabase
            .from('users')
            .select(`
                id,
                email,
                display_name,
                business_role,
                department_id,
                created_at
            `)
            .order('display_name', { ascending: true });

        if (search) {
            query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
        }

        query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        const { data: users, error: usersError } = await query;

        if (usersError) {
            throw new Error(`Failed to fetch users: ${usersError.message}`);
        }

        if (!users || users.length === 0) {
            return res.json({
                success: true,
                data: [],
                count: 0
            });
        }

        const userIds = users.map(u => u.id);

        // Fetch platform admin status
        const { data: platformAdmins } = await supabase
            .from('platform_admins')
            .select('user_id, role, is_active')
            .in('user_id', userIds)
            .eq('is_active', true);

        // Fetch organization memberships with org names
        const { data: orgMemberships } = await supabase
            .from('organization_members')
            .select(`
                id,
                user_id,
                org_id,
                role,
                status,
                organizations!inner(id, name)
            `)
            .in('user_id', userIds)
            .neq('status', 'removed');

        // Fetch client portal access with client and org names
        const { data: clientAccess } = await supabase
            .from('client_users')
            .select(`
                id,
                auth_user_id,
                client_id,
                email,
                name,
                role,
                status,
                clients!inner(id, name, org_id)
            `)
            .in('auth_user_id', userIds)
            .neq('status', 'removed');

        // Fetch departments
        const deptIds = [...new Set(users.map(u => u.department_id).filter(Boolean))];
        let deptMap = new Map();
        if (deptIds.length > 0) {
            const { data: depts } = await supabase
                .from('departments')
                .select('id, name')
                .in('id', deptIds);
            deptMap = new Map((depts || []).map(d => [d.id, d]));
        }

        // Build maps for efficient lookup
        const platformAdminMap = new Map(
            (platformAdmins || []).map(pa => [pa.user_id, { role: pa.role }])
        );

        const orgMembershipMap = new Map();
        (orgMemberships || []).forEach(om => {
            if (!orgMembershipMap.has(om.user_id)) {
                orgMembershipMap.set(om.user_id, []);
            }
            orgMembershipMap.get(om.user_id).push({
                membership_id: om.id,
                org_id: om.org_id,
                org_name: om.organizations?.name,
                role: om.role,
                status: om.status
            });
        });

        const clientAccessMap = new Map();
        (clientAccess || []).forEach(ca => {
            if (!clientAccessMap.has(ca.auth_user_id)) {
                clientAccessMap.set(ca.auth_user_id, []);
            }
            clientAccessMap.get(ca.auth_user_id).push({
                client_user_id: ca.id,
                client_id: ca.client_id,
                client_name: ca.clients?.name,
                org_id: ca.clients?.org_id,
                role: ca.role,
                status: ca.status
            });
        });

        // Merge all data
        const unifiedUsers = users.map(user => ({
            ...user,
            department: user.department_id ? deptMap.get(user.department_id) : null,
            platform_admin: platformAdminMap.get(user.id) || null,
            organization_memberships: orgMembershipMap.get(user.id) || [],
            client_portal_access: clientAccessMap.get(user.id) || []
        }));

        // Apply filter if specified
        let filteredUsers = unifiedUsers;
        if (filter === 'platform') {
            filteredUsers = unifiedUsers.filter(u => u.platform_admin);
        } else if (filter === 'agency') {
            filteredUsers = unifiedUsers.filter(u => u.organization_memberships.length > 0);
        } else if (filter === 'client') {
            filteredUsers = unifiedUsers.filter(u => u.client_portal_access.length > 0);
        }

        res.json({
            success: true,
            data: filteredUsers,
            count: filteredUsers.length
        });
    } catch (error) {
        console.error('Error fetching unified users:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/users/:id
 * Get a single user
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: user, error } = await supabase
            .from('users')
            .select(`
                id,
                email,
                display_name,
                business_role,
                department_id,
                created_at
            `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            throw error;
        }

        // Get department info
        if (user.department_id) {
            const { data: dept } = await supabase
                .from('departments')
                .select('id, name')
                .eq('id', user.department_id)
                .single();
            user.departments = dept;
        }

        res.json({
            success: true,
            data: user
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
 * PUT /api/users/:id
 * Update a user (admin only)
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { display_name, business_role, department_id } = req.body;

        const updates = {};
        if (display_name !== undefined) updates.display_name = display_name;
        if (business_role !== undefined) updates.business_role = business_role;
        if (department_id !== undefined) updates.department_id = department_id;

        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update user: ${error.message}`);
        }

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/users/:id/assignments
 * Update user's organization assignments (platform admin, org memberships, client access)
 */
router.put('/:id/assignments', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            platform_admin,
            add_org_memberships,
            remove_org_memberships,
            add_client_access,
            remove_client_access
        } = req.body;

        const results = {
            platform_admin: null,
            org_memberships_added: [],
            org_memberships_removed: [],
            client_access_added: [],
            client_access_removed: []
        };

        // Verify user exists
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email')
            .eq('id', id)
            .single();

        if (userError || !user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Handle platform admin assignment
        if (platform_admin !== undefined) {
            if (platform_admin === null) {
                // Remove platform admin status
                const { error: removeError } = await supabase
                    .from('platform_admins')
                    .update({ is_active: false })
                    .eq('user_id', id);

                if (removeError) {
                    console.error('Error removing platform admin:', removeError);
                }
                results.platform_admin = { removed: true };
            } else if (platform_admin.role) {
                // Add or update platform admin
                const { data: existing } = await supabase
                    .from('platform_admins')
                    .select('id')
                    .eq('user_id', id)
                    .single();

                if (existing) {
                    // Update existing
                    const { error: updateError } = await supabase
                        .from('platform_admins')
                        .update({ role: platform_admin.role, is_active: true })
                        .eq('user_id', id);

                    if (updateError) throw updateError;
                } else {
                    // Insert new
                    const { error: insertError } = await supabase
                        .from('platform_admins')
                        .insert({
                            user_id: id,
                            role: platform_admin.role,
                            is_active: true
                        });

                    if (insertError) throw insertError;
                }
                results.platform_admin = { role: platform_admin.role };
            }
        }

        // Handle adding org memberships
        if (add_org_memberships && add_org_memberships.length > 0) {
            for (const membership of add_org_memberships) {
                // Check if already a member
                const { data: existing } = await supabase
                    .from('organization_members')
                    .select('id, status')
                    .eq('org_id', membership.org_id)
                    .eq('user_id', id)
                    .single();

                if (existing && existing.status !== 'removed') {
                    // Already active member, update role if different
                    const { error: updateError } = await supabase
                        .from('organization_members')
                        .update({ role: membership.role })
                        .eq('id', existing.id);

                    if (!updateError) {
                        results.org_memberships_added.push({
                            org_id: membership.org_id,
                            role: membership.role,
                            updated: true
                        });
                    }
                } else if (existing && existing.status === 'removed') {
                    // Reactivate
                    const { error: reactivateError } = await supabase
                        .from('organization_members')
                        .update({
                            role: membership.role,
                            status: 'active',
                            joined_at: new Date().toISOString()
                        })
                        .eq('id', existing.id);

                    if (!reactivateError) {
                        results.org_memberships_added.push({
                            org_id: membership.org_id,
                            role: membership.role,
                            reactivated: true
                        });
                    }
                } else {
                    // Create new membership
                    const { error: insertError } = await supabase
                        .from('organization_members')
                        .insert({
                            org_id: membership.org_id,
                            user_id: id,
                            role: membership.role,
                            status: 'active',
                            invited_by: req.userId,
                            invited_at: new Date().toISOString(),
                            joined_at: new Date().toISOString()
                        });

                    if (!insertError) {
                        results.org_memberships_added.push({
                            org_id: membership.org_id,
                            role: membership.role,
                            created: true
                        });
                    }
                }
            }
        }

        // Handle removing org memberships
        if (remove_org_memberships && remove_org_memberships.length > 0) {
            for (const membershipId of remove_org_memberships) {
                const { error: removeError } = await supabase
                    .from('organization_members')
                    .update({ status: 'removed' })
                    .eq('id', membershipId)
                    .eq('user_id', id);

                if (!removeError) {
                    results.org_memberships_removed.push(membershipId);
                }
            }
        }

        // Handle adding client access
        if (add_client_access && add_client_access.length > 0) {
            for (const access of add_client_access) {
                // Check if already has access
                const { data: existing } = await supabase
                    .from('client_users')
                    .select('id, status')
                    .eq('client_id', access.client_id)
                    .eq('auth_user_id', id)
                    .single();

                if (existing && existing.status !== 'removed') {
                    // Update role
                    const { error: updateError } = await supabase
                        .from('client_users')
                        .update({ role: access.role })
                        .eq('id', existing.id);

                    if (!updateError) {
                        results.client_access_added.push({
                            client_id: access.client_id,
                            role: access.role,
                            updated: true
                        });
                    }
                } else if (existing && existing.status === 'removed') {
                    // Reactivate
                    const { error: reactivateError } = await supabase
                        .from('client_users')
                        .update({
                            role: access.role,
                            status: 'active'
                        })
                        .eq('id', existing.id);

                    if (!reactivateError) {
                        results.client_access_added.push({
                            client_id: access.client_id,
                            role: access.role,
                            reactivated: true
                        });
                    }
                } else {
                    // Create new client user entry linked to platform user
                    const { error: insertError } = await supabase
                        .from('client_users')
                        .insert({
                            client_id: access.client_id,
                            auth_user_id: id,
                            email: user.email,
                            name: access.name || user.display_name,
                            role: access.role,
                            status: 'active',
                            invited_by: req.userId
                        });

                    if (!insertError) {
                        results.client_access_added.push({
                            client_id: access.client_id,
                            role: access.role,
                            created: true
                        });
                    }
                }
            }
        }

        // Handle removing client access
        if (remove_client_access && remove_client_access.length > 0) {
            for (const clientUserId of remove_client_access) {
                const { error: removeError } = await supabase
                    .from('client_users')
                    .update({ status: 'removed' })
                    .eq('id', clientUserId)
                    .eq('auth_user_id', id);

                if (!removeError) {
                    results.client_access_removed.push(clientUserId);
                }
            }
        }

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error updating user assignments:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
