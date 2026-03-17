/**
 * Organizations API Routes
 * Manages organizations (agencies/tenants) in the multi-tenant system
 */

const express = require('express');
const router = express.Router();

module.exports = function(supabase) {

    /**
     * GET /api/organizations
     * List organizations the current user is a member of.
     * Platform admins see ALL organizations.
     * During impersonation, returns only the impersonated org.
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

            // During impersonation: return only the impersonated org
            if (req.isImpersonating && req.impersonation) {
                const { data: impOrg, error: impError } = await supabase
                    .from('organizations')
                    .select('id, name, slug, owner_id, subscription_tier, subscription_status, settings, created_at')
                    .eq('id', req.impersonation.org_id)
                    .single();

                if (impError) throw impError;

                return res.json({
                    success: true,
                    data: [{
                        ...impOrg,
                        member_role: req.impersonation.role,
                        member_status: 'active',
                        joined_at: null
                    }]
                });
            }

            // Platform admins (not impersonating): return ALL organizations
            if (req.isPlatformAdmin) {
                const { data: allOrgs, error: allError } = await supabase
                    .from('organizations')
                    .select('id, name, slug, owner_id, subscription_tier, subscription_status, settings, created_at')
                    .eq('is_active', true)
                    .order('name');

                if (allError) throw allError;

                const organizations = (allOrgs || []).map(org => ({
                    ...org,
                    member_role: 'platform_admin',
                    member_status: 'active',
                    joined_at: null
                }));

                return res.json({
                    success: true,
                    data: organizations
                });
            }

            // Regular users: return only orgs they're a member of
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
                // Allow platform admins to view any org
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
                .from('organizations')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            // Fetch tier features if org has a subscription tier
            let tier_features = {};
            if (data.subscription_tier) {
                const { data: tierData } = await supabase
                    .from('subscription_tiers')
                    .select('features')
                    .eq('id', data.subscription_tier)
                    .single();
                if (tierData?.features) {
                    tier_features = tierData.features;
                }
            }

            res.json({
                success: true,
                data: {
                    ...data,
                    member_role: membership?.role || 'platform_admin',
                    tier_features
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
                    subscription_tier: 'starter',
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

            // Check owner role or platform admin
            const { data: membership } = await supabase
                .from('organization_members')
                .select('role')
                .eq('org_id', id)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            const isOwner = membership && membership.role === 'owner';

            // Platform admins can delete any organization
            let isPlatformAdmin = false;
            if (!isOwner) {
                const { data: adminCheck } = await supabase
                    .rpc('is_platform_admin', { p_user_id: userId });
                isPlatformAdmin = !!adminCheck;
            }

            if (!isOwner && !isPlatformAdmin) {
                return res.status(403).json({
                    success: false,
                    error: 'Owner or platform admin access required'
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

            // Delete departments first — the FK is ON DELETE SET NULL
            // but org_id has a NOT NULL constraint (phase59c), causing conflicts
            const { error: deptError } = await supabase
                .from('departments')
                .delete()
                .eq('org_id', id);

            if (deptError) {
                console.warn('Warning: Could not delete departments:', deptError);
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
                // Allow platform admins to view any org's stats
                const { data: isAdmin } = await supabase
                    .rpc('is_platform_admin', { p_user_id: userId });
                if (!isAdmin) {
                    return res.status(403).json({
                        success: false,
                        error: 'Not a member of this organization'
                    });
                }
            }

            // Get counts in parallel
            const [membersResult, clientsResult, agentsResult, workflowsResult, platformAdminsResult] = await Promise.all([
                supabase.from('organization_members').select('id, user_id', { count: 'exact' }).eq('org_id', id).eq('status', 'active'),
                supabase.from('clients').select('id', { count: 'exact', head: true }).eq('org_id', id),
                supabase.from('agents').select('id', { count: 'exact', head: true }).eq('org_id', id),
                supabase.from('workflows').select('id', { count: 'exact', head: true }).eq('org_id', id),
                supabase.from('platform_admins').select('user_id').eq('is_active', true)
            ]);

            // Exclude platform admins from org member count
            const platformAdminIds = new Set((platformAdminsResult.data || []).map(pa => pa.user_id));
            const orgOnlyMembers = (membersResult.data || []).filter(m => !platformAdminIds.has(m.user_id));

            res.json({
                success: true,
                data: {
                    members: orgOnlyMembers.length,
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
