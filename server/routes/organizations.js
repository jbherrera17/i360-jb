/**
 * Organizations API Routes
 * Manages organizations (agencies/tenants) in the multi-tenant system
 */

const express = require('express');
const router = express.Router();

module.exports = function(supabase) {

    /**
     * GET /api/organizations
     * List organizations the current user is a member of
     */
    router.get('/', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const { data, error } = await supabase
                .from('organization_members')
                .select(`
                    role,
                    status,
                    joined_at,
                    organizations (
                        id,
                        name,
                        slug,
                        owner_id,
                        subscription_tier,
                        subscription_status,
                        settings,
                        created_at
                    )
                `)
                .eq('user_id', userId)
                .eq('status', 'active');

            if (error) throw error;

            // Flatten the response
            const organizations = data.map(m => ({
                ...m.organizations,
                member_role: m.role,
                member_status: m.status,
                joined_at: m.joined_at
            }));

            res.json({
                success: true,
                data: organizations
            });
        } catch (error) {
            console.error('Error fetching organizations:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/organizations/:id
     * Get a single organization (must be a member)
     */
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Check membership
            const { data: membership, error: memberError } = await supabase
                .from('organization_members')
                .select('role, status')
                .eq('org_id', id)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (memberError || !membership) {
                return res.status(403).json({
                    success: false,
                    error: 'Not a member of this organization'
                });
            }

            const { data, error } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data: {
                    ...data,
                    member_role: membership.role
                }
            });
        } catch (error) {
            console.error('Error fetching organization:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/organizations
     * Create a new organization
     */
    router.post('/', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const { name, slug, settings } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Organization name is required'
                });
            }

            // Generate slug if not provided
            const orgSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            // Check if slug is unique
            const { data: existing } = await supabase
                .from('organizations')
                .select('id')
                .eq('slug', orgSlug)
                .single();

            if (existing) {
                return res.status(400).json({
                    success: false,
                    error: 'Organization slug already exists'
                });
            }

            // Create organization
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .insert({
                    name,
                    slug: orgSlug,
                    owner_id: userId,
                    subscription_tier: 'free',
                    subscription_status: 'active',
                    settings: settings || {}
                })
                .select()
                .single();

            if (orgError) throw orgError;

            // Add creator as owner member
            const { error: memberError } = await supabase
                .from('organization_members')
                .insert({
                    org_id: org.id,
                    user_id: userId,
                    role: 'owner',
                    status: 'active',
                    invited_by: userId,
                    joined_at: new Date().toISOString()
                });

            if (memberError) throw memberError;

            res.status(201).json({
                success: true,
                data: org
            });
        } catch (error) {
            console.error('Error creating organization:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/organizations/:id
     * Update an organization (admin/owner only)
     */
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Check admin/owner role
            const { data: membership } = await supabase
                .from('organization_members')
                .select('role')
                .eq('org_id', id)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (!membership || !['owner', 'admin'].includes(membership.role)) {
                return res.status(403).json({
                    success: false,
                    error: 'Admin access required'
                });
            }

            const { name, settings } = req.body;
            const updates = {};

            if (name !== undefined) updates.name = name;
            if (settings !== undefined) updates.settings = settings;
            updates.updated_at = new Date().toISOString();

            const { data, error } = await supabase
                .from('organizations')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error updating organization:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/organizations/:id
     * Delete an organization (owner only)
     */
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Check owner role
            const { data: membership } = await supabase
                .from('organization_members')
                .select('role')
                .eq('org_id', id)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (!membership || membership.role !== 'owner') {
                return res.status(403).json({
                    success: false,
                    error: 'Owner access required'
                });
            }

            // Check if it's a personal workspace (cannot delete)
            const { data: org } = await supabase
                .from('organizations')
                .select('settings')
                .eq('id', id)
                .single();

            if (org?.settings?.is_personal) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot delete personal workspace'
                });
            }

            // Get org name for the suspension reason
            const { data: orgDetails } = await supabase
                .from('organizations')
                .select('name')
                .eq('id', id)
                .single();

            const orgName = orgDetails?.name || 'Unknown';

            // Suspend orphaned users before deleting the org
            // This finds users who only belong to this org and suspends them
            const { data: suspendedUsers, error: suspendError } = await supabase
                .rpc('suspend_orphaned_users', {
                    p_org_id: id,
                    p_reason: `Organization "${orgName}" was deleted`
                });

            if (suspendError) {
                console.warn('Warning: Could not suspend orphaned users:', suspendError);
                // Continue with deletion even if suspension fails
            } else if (suspendedUsers && suspendedUsers.length > 0) {
                console.log(`Suspended ${suspendedUsers.length} orphaned users from org ${orgName}:`,
                    suspendedUsers.map(u => u.email));
            }

            const { error } = await supabase
                .from('organizations')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({
                success: true,
                message: 'Organization deleted',
                suspended_users: suspendedUsers?.length || 0
            });
        } catch (error) {
            console.error('Error deleting organization:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/organizations/:id/stats
     * Get organization statistics
     */
    router.get('/:id/stats', async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Check membership
            const { data: membership } = await supabase
                .from('organization_members')
                .select('role')
                .eq('org_id', id)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (!membership) {
                return res.status(403).json({
                    success: false,
                    error: 'Not a member of this organization'
                });
            }

            // Get counts in parallel
            const [membersResult, clientsResult, agentsResult, workflowsResult] = await Promise.all([
                supabase.from('organization_members').select('id', { count: 'exact', head: true }).eq('org_id', id).eq('status', 'active'),
                supabase.from('clients').select('id', { count: 'exact', head: true }).eq('org_id', id),
                supabase.from('agents').select('id', { count: 'exact', head: true }).eq('org_id', id),
                supabase.from('workflows').select('id', { count: 'exact', head: true }).eq('org_id', id)
            ]);

            res.json({
                success: true,
                data: {
                    members: membersResult.count || 0,
                    clients: clientsResult.count || 0,
                    agents: agentsResult.count || 0,
                    workflows: workflowsResult.count || 0
                }
            });
        } catch (error) {
            console.error('Error fetching organization stats:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
};
