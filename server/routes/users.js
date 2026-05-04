/**
 * Users API Routes - Insight 360
 * Admin endpoints for user management
 * Version: 1.1.0
 */

const express = require('express');
const { requireOrgContext } = require('../middleware/orgContext');

module.exports = function(supabase) {
const router = express.Router();

// Validate org membership on all routes
router.use(requireOrgContext(supabase));

/**
 * Authorization middleware for user management routes.
 * Requires platform admin OR org owner/admin role.
 * Write operations (PUT assignments) require platform admin only.
 */
const requireUserManagementAccess = async (req, res, next) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        // Check platform admin first
        const { data: isAdmin } = await supabase
            .rpc('is_platform_admin', { p_user_id: userId });

        if (isAdmin) {
            req.isPlatformAdmin = true;
            return next();
        }

        // For non-platform-admins, check org admin role
        const orgId = req.verifiedOrgId;
        if (orgId) {
            const { data: membership } = await supabase
                .from('organization_members')
                .select('role')
                .eq('org_id', orgId)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (membership && ['owner', 'admin'].includes(membership.role)) {
                req.isPlatformAdmin = false;
                req.orgRole = membership.role;
                return next();
            }
        }

        return res.status(403).json({
            success: false,
            error: 'Platform admin or organization admin access required'
        });
    } catch (error) {
        console.error('User management auth error:', error);
        return res.status(500).json({ success: false, error: 'Authorization check failed' });
    }
};

/**
 * Stricter middleware for sensitive operations (platform admin, assignments).
 * Requires platform admin only.
 */
const requirePlatformAdminAccess = async (req, res, next) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const { data: isAdmin } = await supabase
            .rpc('is_platform_admin', { p_user_id: userId });

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Platform admin access required'
            });
        }

        req.isPlatformAdmin = true;
        next();
    } catch (error) {
        console.error('Platform admin auth error:', error);
        return res.status(500).json({ success: false, error: 'Authorization check failed' });
    }
};

/**
 * Log role changes to the role_change_audit table.
 */
async function logRoleChange({ target_user_id, changed_by, change_type, entity_type, entity_id, old_value, new_value, reason }) {
    try {
        await supabase.from('role_change_audit').insert({
            target_user_id,
            changed_by,
            change_type,
            entity_type,
            entity_id,
            old_value,
            new_value,
            reason
        });
    } catch (err) {
        console.error('Failed to log role change:', err);
        // Non-blocking — don't fail the request if audit logging fails
    }
}

/**
 * GET /api/users
 * List all users (admin only)
 */
router.get('/', requireUserManagementAccess, async (req, res) => {
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
router.get('/unified', requireUserManagementAccess, async (req, res) => {
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
                status,
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

        // Fetch organization memberships with org names, tier, and type
        const { data: orgMemberships } = await supabase
            .from('organization_members')
            .select(`
                id,
                user_id,
                org_id,
                role,
                status,
                organizations!inner(id, name, subscription_tier, org_type)
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
                org_type: om.organizations?.org_type,
                subscription_tier: om.organizations?.subscription_tier,
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
router.get('/:id', requireUserManagementAccess, async (req, res) => {
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
router.put('/:id', requirePlatformAdminAccess, async (req, res) => {
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

        // Also update business_role in organization_members if changed
        if (business_role !== undefined) {
            const orgId = req.verifiedOrgId;
            if (orgId) {
                // Update for specific org
                await supabase
                    .from('organization_members')
                    .update({ business_role })
                    .eq('user_id', id)
                    .eq('org_id', orgId)
                    .eq('status', 'active');
            } else {
                // Update all active memberships (backward compat)
                await supabase
                    .from('organization_members')
                    .update({ business_role })
                    .eq('user_id', id)
                    .in('status', ['active', 'pending']);
            }
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
router.put('/:id/assignments', requirePlatformAdminAccess, async (req, res) => {
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
                await logRoleChange({
                    target_user_id: id,
                    changed_by: req.userId,
                    change_type: 'platform_admin_removed',
                    entity_type: 'platform_admins',
                    entity_id: id,
                    old_value: 'active',
                    new_value: 'inactive',
                    reason: 'Platform admin status removed via assignments endpoint'
                });
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
                await logRoleChange({
                    target_user_id: id,
                    changed_by: req.userId,
                    change_type: existing ? 'platform_admin_updated' : 'platform_admin_granted',
                    entity_type: 'platform_admins',
                    entity_id: id,
                    old_value: existing ? 'existing' : null,
                    new_value: platform_admin.role,
                    reason: 'Platform admin assigned via assignments endpoint'
                });
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

return router;
};
