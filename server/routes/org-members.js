/**
 * Organization Members API Routes
 * Manages members within organizations
 */

const express = require('express');
const router = express.Router();

module.exports = function(supabase) {

    /**
     * Log role changes to the role_change_audit table.
     */
    async function logRoleChange({ target_user_id, changed_by, change_type, entity_type, entity_id, org_id, old_value, new_value, reason }) {
        try {
            await supabase.from('role_change_audit').insert({
                target_user_id,
                changed_by,
                change_type,
                entity_type,
                entity_id,
                org_id,
                old_value,
                new_value,
                reason
            });
        } catch (err) {
            console.error('Failed to log role change:', err);
        }
    }

    /**
     * GET /api/org-members/:orgId
     * List all members of an organization
     */
    router.get('/:orgId', async (req, res) => {
        try {
            const { orgId } = req.params;
            const userId = req.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Check if user is a member of this org
            const { data: membership } = await supabase
                .from('organization_members')
                .select('role')
                .eq('org_id', orgId)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (!membership) {
                // Allow platform admins to view any org's members
                const { data: isAdmin } = await supabase
                    .rpc('is_platform_admin', { p_user_id: userId });
                if (!isAdmin) {
                    return res.status(403).json({
                        success: false,
                        error: 'Not a member of this organization'
                    });
                }
            }

            const { data, error } = await supabase
                .from('organization_members')
                .select(`
                    id,
                    user_id,
                    role,
                    status,
                    invited_by,
                    joined_at,
                    created_at
                `)
                .eq('org_id', orgId)
                .neq('status', 'removed')
                .order('joined_at', { ascending: true });

            if (error) throw error;

            // Get unique user IDs to fetch user details
            const userIds = [...new Set(data.map(m => m.user_id).filter(Boolean))];

            // Fetch user details from the users table
            let usersMap = {};
            if (userIds.length > 0) {
                const { data: users } = await supabase
                    .from('users')
                    .select('id, email, display_name, avatar_url')
                    .in('id', userIds);

                if (users) {
                    usersMap = users.reduce((acc, u) => {
                        acc[u.id] = u;
                        return acc;
                    }, {});
                }
            }

            // Combine member data with user details
            const members = data.map(m => ({
                id: m.id,
                user_id: m.user_id,
                role: m.role,
                status: m.status,
                invited_by: m.invited_by,
                joined_at: m.joined_at,
                created_at: m.created_at,
                // User details from separate query
                email: usersMap[m.user_id]?.email,
                display_name: usersMap[m.user_id]?.display_name,
                avatar_url: usersMap[m.user_id]?.avatar_url
            }));

            res.json({
                success: true,
                data: members
            });
        } catch (error) {
            console.error('Error fetching organization members:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/org-members/:orgId/invite
     * Invite a new member to the organization
     */
    router.post('/:orgId/invite', async (req, res) => {
        try {
            const { orgId } = req.params;
            const userId = req.userId;
            const { email, role = 'member' } = req.body;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            if (!email) {
                return res.status(400).json({
                    success: false,
                    error: 'Email is required'
                });
            }

            // Check if user has admin/owner role
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
                    error: 'Admin access required to invite members'
                });
            }

            // Validate role
            const validRoles = ['admin', 'member', 'viewer'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
                });
            }

            // Check organization member limits (Phase 44)
            const { data: limits, error: limitError } = await supabase
                .rpc('check_org_limits', {
                    p_org_id: orgId,
                    p_resource_type: 'members'
                });

            if (!limitError && limits && limits[0] && !limits[0].within_limits) {
                return res.status(403).json({
                    success: false,
                    error: `Member limit reached (${limits[0].current_count}/${limits[0].max_allowed})`,
                    details: {
                        current: limits[0].current_count,
                        max: limits[0].max_allowed,
                        usage_percent: limits[0].usage_percent
                    },
                    upgrade_required: true
                });
            }

            // Check if user exists
            let { data: invitee } = await supabase
                .from('users')
                .select('id, email')
                .eq('email', email)
                .single();

            // If user doesn't exist, create and invite them
            if (!invitee) {
                const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
                const redirectTo = `${appUrl}/login.html`;

                // Invite via Supabase Auth (sends email)
                const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
                    email,
                    {
                        redirectTo,
                        data: {
                            display_name: email.split('@')[0],
                            invited_by_admin: userId,
                            org_id: orgId
                        }
                    }
                );

                if (authError) {
                    console.error('Error inviting new user:', authError);
                    const isRateLimit = authError.message?.toLowerCase().includes('rate') ||
                        authError.status === 429;
                    return res.status(isRateLimit ? 429 : 400).json({
                        success: false,
                        error: isRateLimit
                            ? 'Email rate limit reached. Please wait before sending more invitations.'
                            : `Failed to send invitation: ${authError.message}`
                    });
                }

                const newUserId = authData.user.id;

                // Create user record
                const { data: newUser, error: userCreateError } = await supabase
                    .from('users')
                    .insert({
                        id: newUserId,
                        email,
                        display_name: email.split('@')[0],
                        status: 'invited',
                        invited_at: new Date().toISOString(),
                        invited_by: userId,
                        default_org_id: orgId
                    })
                    .select()
                    .single();

                if (userCreateError) {
                    console.error('Error creating user record:', userCreateError);
                    await supabase.auth.admin.deleteUser(newUserId);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to create user record'
                    });
                }

                invitee = newUser;
            }

            // Check if already a member
            const { data: existingMember } = await supabase
                .from('organization_members')
                .select('id, status')
                .eq('org_id', orgId)
                .eq('user_id', invitee.id)
                .single();

            if (existingMember) {
                if (existingMember.status === 'active' || existingMember.status === 'pending') {
                    return res.status(400).json({
                        success: false,
                        error: existingMember.status === 'pending'
                            ? 'User has already been invited and is pending acceptance'
                            : 'User is already a member of this organization'
                    });
                }
                // Reactivate if previously removed
                const { data, error } = await supabase
                    .from('organization_members')
                    .update({
                        role,
                        status: 'pending',
                        invited_by: userId
                    })
                    .eq('id', existingMember.id)
                    .select()
                    .single();

                if (error) throw error;
                return res.json({ success: true, data });
            }

            // Create new membership
            const { data, error } = await supabase
                .from('organization_members')
                .insert({
                    org_id: orgId,
                    user_id: invitee.id,
                    role,
                    status: 'pending',
                    invited_by: userId
                })
                .select()
                .single();

            if (error) throw error;

            await logRoleChange({
                target_user_id: invitee.id,
                changed_by: userId,
                change_type: 'org_member_invited',
                entity_type: 'organization_members',
                entity_id: data.id,
                org_id: orgId,
                old_value: null,
                new_value: role,
                reason: `Invited to organization with role: ${role}`
            });

            res.status(201).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error inviting member:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/org-members/:orgId/:memberId
     * Update a member's role
     */
    router.put('/:orgId/:memberId', async (req, res) => {
        try {
            const { orgId, memberId } = req.params;
            const userId = req.userId;
            const { role } = req.body;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Check if user has admin/owner role
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

            // Get target member
            const { data: targetMember } = await supabase
                .from('organization_members')
                .select('user_id, role')
                .eq('id', memberId)
                .eq('org_id', orgId)
                .single();

            if (!targetMember) {
                return res.status(404).json({
                    success: false,
                    error: 'Member not found'
                });
            }

            // Cannot change owner's role (except by owner themselves)
            if (targetMember.role === 'owner' && targetMember.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Cannot change the role of the organization owner'
                });
            }

            // Owner transfer is a separate explicit operation — admins cannot promote to owner
            if (role === 'owner' && membership.role !== 'owner') {
                return res.status(403).json({
                    success: false,
                    error: 'Only the current owner can transfer ownership. Use the ownership transfer operation instead.'
                });
            }

            // Validate role
            const validRoles = ['owner', 'admin', 'member', 'viewer'];
            if (role && !validRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
                });
            }

            const updates = {};
            if (role) updates.role = role;

            const { data, error } = await supabase
                .from('organization_members')
                .update(updates)
                .eq('id', memberId)
                .select()
                .single();

            if (error) throw error;

            if (role && role !== targetMember.role) {
                await logRoleChange({
                    target_user_id: targetMember.user_id,
                    changed_by: userId,
                    change_type: role === 'owner' ? 'org_ownership_transferred' : 'org_member_role_changed',
                    entity_type: 'organization_members',
                    entity_id: memberId,
                    org_id: orgId,
                    old_value: targetMember.role,
                    new_value: role,
                    reason: `Role changed from ${targetMember.role} to ${role}`
                });
            }

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error updating member:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/org-members/:orgId/:memberId
     * Remove a member from the organization
     */
    router.delete('/:orgId/:memberId', async (req, res) => {
        try {
            const { orgId, memberId } = req.params;
            const userId = req.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Check if user has admin/owner role
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

            // Get target member
            const { data: targetMember } = await supabase
                .from('organization_members')
                .select('user_id, role')
                .eq('id', memberId)
                .eq('org_id', orgId)
                .single();

            if (!targetMember) {
                return res.status(404).json({
                    success: false,
                    error: 'Member not found'
                });
            }

            // Cannot remove owner
            if (targetMember.role === 'owner') {
                return res.status(403).json({
                    success: false,
                    error: 'Cannot remove the organization owner'
                });
            }

            // Soft delete - set status to removed
            const { error } = await supabase
                .from('organization_members')
                .update({ status: 'removed' })
                .eq('id', memberId);

            if (error) throw error;

            await logRoleChange({
                target_user_id: targetMember.user_id,
                changed_by: userId,
                change_type: 'org_member_removed',
                entity_type: 'organization_members',
                entity_id: memberId,
                org_id: orgId,
                old_value: targetMember.role,
                new_value: 'removed',
                reason: 'Member removed from organization'
            });

            res.json({
                success: true,
                message: 'Member removed from organization'
            });
        } catch (error) {
            console.error('Error removing member:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/org-members/:orgId/leave
     * Leave an organization (for current user)
     */
    router.post('/:orgId/leave', async (req, res) => {
        try {
            const { orgId } = req.params;
            const userId = req.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Get membership
            const { data: membership } = await supabase
                .from('organization_members')
                .select('id, role')
                .eq('org_id', orgId)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (!membership) {
                return res.status(404).json({
                    success: false,
                    error: 'Not a member of this organization'
                });
            }

            // Owner cannot leave - must transfer ownership first
            if (membership.role === 'owner') {
                return res.status(400).json({
                    success: false,
                    error: 'Owner cannot leave. Transfer ownership first.'
                });
            }

            // Soft delete
            const { error } = await supabase
                .from('organization_members')
                .update({ status: 'removed' })
                .eq('id', membership.id);

            if (error) throw error;

            res.json({
                success: true,
                message: 'Successfully left organization'
            });
        } catch (error) {
            console.error('Error leaving organization:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
};
