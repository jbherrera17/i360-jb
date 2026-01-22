/**
 * Organization Members API Routes
 * Manages members within organizations
 */

const express = require('express');
const router = express.Router();

module.exports = function(supabase) {

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
                return res.status(403).json({
                    success: false,
                    error: 'Not a member of this organization'
                });
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
                    created_at,
                    users (
                        id,
                        email,
                        display_name,
                        avatar_url
                    )
                `)
                .eq('org_id', orgId)
                .order('joined_at', { ascending: true });

            if (error) throw error;

            // Flatten user data
            const members = data.map(m => ({
                id: m.id,
                user_id: m.user_id,
                role: m.role,
                status: m.status,
                invited_by: m.invited_by,
                joined_at: m.joined_at,
                created_at: m.created_at,
                email: m.users?.email,
                display_name: m.users?.display_name,
                avatar_url: m.users?.avatar_url
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
            const { email, role = 'consultant' } = req.body;

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
            const validRoles = ['admin', 'consultant', 'viewer'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
                });
            }

            // Check if user exists
            const { data: invitee } = await supabase
                .from('users')
                .select('id, email')
                .eq('email', email)
                .single();

            if (!invitee) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found. They must create an account first.'
                });
            }

            // Check if already a member
            const { data: existingMember } = await supabase
                .from('organization_members')
                .select('id, status')
                .eq('org_id', orgId)
                .eq('user_id', invitee.id)
                .single();

            if (existingMember) {
                if (existingMember.status === 'active') {
                    return res.status(400).json({
                        success: false,
                        error: 'User is already a member of this organization'
                    });
                }
                // Reactivate if previously removed
                const { data, error } = await supabase
                    .from('organization_members')
                    .update({
                        role,
                        status: 'active',
                        invited_by: userId,
                        joined_at: new Date().toISOString()
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
                    status: 'active',
                    invited_by: userId,
                    joined_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

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

            // Validate role
            const validRoles = ['owner', 'admin', 'consultant', 'viewer'];
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

            // Soft delete - set status to inactive
            const { error } = await supabase
                .from('organization_members')
                .update({ status: 'inactive' })
                .eq('id', memberId);

            if (error) throw error;

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
                .update({ status: 'inactive' })
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
