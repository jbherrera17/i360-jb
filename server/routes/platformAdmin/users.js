/**
 * Platform Admin — Platform User Management.
 *
 * requirePlatformAdmin is applied by the coordinator. requireAdminWrite is per-route.
 */

const express = require('express');

module.exports = function (supabase, requireAdminWrite) {
    const router = express.Router();


    // ============================================
    // USER MANAGEMENT
    // ============================================

    /**
     * GET /api/platform/users
     * List all users with status and organization memberships
     */
    router.get('/users', async (req, res) => {
        try {
            const { status, org_id, search, limit = 50, offset = 0 } = req.query;

            // Try to use platform_users_overview view first
            let query = supabase
                .from('platform_users_overview')
                .select('*');

            if (status) {
                query = query.eq('status', status);
            }

            if (search) {
                query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
            }

            query = query
                .order('created_at', { ascending: false })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            let { data, error } = await query;

            // Fallback if view doesn't exist or permission denied
            if (error && (error.code === '42P01' || error.code === '42501' || error.message?.includes('does not exist') || error.message?.includes('schema cache') || error.message?.includes('permission denied'))) {
                console.log('platform_users_overview unavailable, using fallback query:', error.message);

                // First try with status columns (Phase 47 deployed)
                let fallbackQuery = supabase
                    .from('users')
                    .select('id, email, display_name, role, status, suspended_at, suspended_reason, created_at, updated_at');

                if (status) {
                    fallbackQuery = fallbackQuery.eq('status', status);
                }

                if (search) {
                    fallbackQuery = fallbackQuery.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
                }

                fallbackQuery = fallbackQuery
                    .order('created_at', { ascending: false })
                    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

                let fallbackResult = await fallbackQuery;

                // If status column doesn't exist, try without it (Phase 47 not deployed)
                if (fallbackResult.error && (fallbackResult.error.message?.includes('status') || fallbackResult.error.message?.includes('does not exist'))) {
                    console.log('Status column not found, using basic user query');

                    let basicQuery = supabase
                        .from('users')
                        .select('id, email, display_name, role, created_at, updated_at');

                    if (search) {
                        basicQuery = basicQuery.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
                    }

                    basicQuery = basicQuery
                        .order('created_at', { ascending: false })
                        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

                    fallbackResult = await basicQuery;
                }

                if (fallbackResult.error) throw fallbackResult.error;

                // Fetch organization memberships for each user
                data = await Promise.all((fallbackResult.data || []).map(async (user) => {
                    const { data: memberships } = await supabase
                        .from('organization_members')
                        .select(`
                            org_id,
                            role,
                            status,
                            organization:organizations(id, name, slug, settings)
                        `)
                        .eq('user_id', user.id);

                    const orgs = (memberships || []).map(m => ({
                        org_id: m.org_id,
                        org_name: m.organization?.name,
                        org_slug: m.organization?.slug,
                        member_role: m.role,
                        member_status: m.status,
                        is_personal: m.organization?.settings?.is_personal || m.organization?.slug?.startsWith('personal-')
                    }));

                    return {
                        ...user,
                        // Ensure status fields have defaults if Phase 47 not deployed
                        status: user.status || 'active',
                        suspended_at: user.suspended_at || null,
                        suspended_reason: user.suspended_reason || null,
                        organizations: orgs,
                        active_org_count: orgs.filter(o => o.member_status === 'active').length,
                        is_platform_admin: false // Would need separate query
                    };
                }));

                error = null;
            }

            if (error) throw error;

            // Filter by org_id if provided (post-filter since it's in JSON)
            let filteredData = data || [];
            if (org_id) {
                filteredData = filteredData.filter(user => {
                    const orgs = user.organizations || [];
                    return orgs.some(o => o.org_id === org_id);
                });
            }

            res.json({
                success: true,
                data: filteredData,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: filteredData.length
                }
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
     * GET /api/platform/users/suspended
     * Get only suspended users
     */
    router.get('/users/suspended', async (req, res) => {
        try {
            const { search, limit = 50, offset = 0 } = req.query;

            let query = supabase
                .from('users')
                .select('id, email, display_name, role, status, suspended_at, suspended_reason, created_at')
                .eq('status', 'suspended')
                .order('suspended_at', { ascending: false });

            if (search) {
                query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
            }

            query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            const { data, error } = await query;

            // If status column doesn't exist, return empty (Phase 47 not deployed)
            if (error && (error.message?.includes('status') || error.message?.includes('does not exist'))) {
                return res.json({
                    success: true,
                    data: [],
                    message: 'User status feature requires Phase 47 migration',
                    pagination: { limit: parseInt(limit), offset: parseInt(offset), total: 0 }
                });
            }

            if (error) throw error;

            res.json({
                success: true,
                data: data || [],
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: data?.length || 0
                }
            });
        } catch (error) {
            console.error('Error fetching suspended users:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/platform/users/:id
     * Get a single user's details with org memberships
     */
    router.get('/users/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Get user
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single();

            if (userError) {
                if (userError.code === 'PGRST116') {
                    return res.status(404).json({
                        success: false,
                        error: 'User not found'
                    });
                }
                throw userError;
            }

            // Get org memberships
            const { data: memberships } = await supabase
                .from('organization_members')
                .select(`
                    org_id,
                    role,
                    status,
                    joined_at,
                    organization:organizations!inner(id, name, slug, settings, subscription_tier)
                `)
                .eq('user_id', id);

            // Check if platform admin
            const { data: platformAdmin } = await supabase
                .from('platform_admins')
                .select('role, is_active')
                .eq('user_id', id)
                .single();

            res.json({
                success: true,
                data: {
                    ...user,
                    organizations: (memberships || []).map(m => ({
                        org_id: m.org_id,
                        org_name: m.organization?.name,
                        org_slug: m.organization?.slug,
                        subscription_tier: m.organization?.subscription_tier,
                        member_role: m.role,
                        member_status: m.status,
                        joined_at: m.joined_at,
                        is_personal: m.organization?.settings?.is_personal || m.organization?.slug?.startsWith('personal-')
                    })),
                    platform_admin: platformAdmin ? {
                        role: platformAdmin.role,
                        is_active: platformAdmin.is_active
                    } : null
                }
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
     * PUT /api/platform/users/:id/status
     * Change a user's status (suspend, reactivate, etc.)
     */
    router.put('/users/:id/status', requireAdminWrite, async (req, res) => {
        try {
            const { id } = req.params;
            const { status, reason } = req.body;

            if (!status || !['active', 'suspended', 'inactive', 'pending_deletion'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid status required: active, suspended, inactive, pending_deletion'
                });
            }

            const updateData = {
                status,
                updated_at: new Date().toISOString()
            };

            // Set suspended fields based on action
            if (status === 'suspended') {
                updateData.suspended_at = new Date().toISOString();
                updateData.suspended_reason = reason || 'Suspended by platform admin';
            } else if (status === 'active') {
                // Clear suspension info when reactivating
                updateData.suspended_at = null;
                updateData.suspended_reason = null;
            }

            const { data, error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            // If status column doesn't exist (Phase 47 not deployed)
            if (error && (error.message?.includes('status') || error.message?.includes('does not exist'))) {
                return res.status(400).json({
                    success: false,
                    error: 'User status management requires Phase 47 migration. Please run db/phase47-user-status.sql'
                });
            }

            if (error) throw error;

            // Log the action
            console.log(`User ${id} status changed to ${status} by admin ${req.userId}${reason ? `: ${reason}` : ''}`);

            res.json({
                success: true,
                data,
                message: `User ${status === 'active' ? 'reactivated' : status}`
            });
        } catch (error) {
            console.error('Error updating user status:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/platform/users
     * Invite a new user via email (Platform Admin only)
     * Sends Supabase invitation email — user sets their own password
     */
    router.post('/users', requireAdminWrite, async (req, res) => {
        try {
            const { email, display_name, org_id, role, department_id, business_role } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    error: 'Email is required'
                });
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email format'
                });
            }

            // Build redirect URL for invitation acceptance
            const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
            const redirectTo = `${appUrl}/login.html`;

            // Invite user via Supabase Auth (sends email)
            const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
                email,
                {
                    redirectTo,
                    data: {
                        display_name: display_name || email.split('@')[0],
                        invited_by_admin: req.userId,
                        org_id: org_id || null
                    }
                }
            );

            if (authError) {
                console.error('Auth error inviting user:', authError);
                // Handle rate limit errors with a clear message
                const isRateLimit = authError.message?.toLowerCase().includes('rate') ||
                    authError.status === 429;
                return res.status(isRateLimit ? 429 : 400).json({
                    success: false,
                    error: isRateLimit
                        ? 'Email rate limit reached. Please wait before sending more invitations.'
                        : authError.message
                });
            }

            const userId = authData.user.id;

            // Create user record in users table
            const { data: userData, error: userError } = await supabase
                .from('users')
                .insert({
                    id: userId,
                    email,
                    display_name: display_name || email.split('@')[0],
                    status: 'invited',
                    invited_at: new Date().toISOString(),
                    invited_by: req.userId,
                    default_org_id: org_id || null,
                    department_id: department_id || null
                })
                .select()
                .single();

            if (userError) {
                console.error('Error creating user record:', userError);
                // User was created in auth but not in users table - try to clean up
                await supabase.auth.admin.deleteUser(userId);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to create user record: ' + userError.message
                });
            }

            // If org_id provided, add user to organization
            if (org_id) {
                const memberRecord = {
                    user_id: userId,
                    org_id,
                    role: role || 'member',
                    status: 'active',
                    invited_by: req.userId,
                    joined_at: new Date().toISOString()
                };
                if (business_role) memberRecord.business_role = business_role;

                const { error: memberError } = await supabase
                    .from('organization_members')
                    .insert(memberRecord);

                if (memberError) {
                    console.error('Error adding user to org:', memberError);
                    // User invited, just org membership failed - log but continue
                }
            }

            console.log(`User ${email} invited by admin ${req.userId}`);

            res.status(201).json({
                success: true,
                data: userData,
                message: 'Invitation email sent successfully. User will set their own password.'
            });
        } catch (error) {
            console.error('Error inviting user:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/platform/users/:id/resend-invite
     * Resend invitation email to a user in 'invited' status
     */
    router.post('/users/:id/resend-invite', requireAdminWrite, async (req, res) => {
        try {
            const { id } = req.params;

            // Get user details
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, email, status')
                .eq('id', id)
                .single();

            if (userError || !user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            if (user.status !== 'invited') {
                return res.status(400).json({
                    success: false,
                    error: 'Can only resend invitations to users with invited status'
                });
            }

            // Build redirect URL
            const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
            const redirectTo = `${appUrl}/login.html`;

            // Resend invitation via Supabase
            const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
                user.email,
                { redirectTo }
            );

            if (inviteError) {
                console.error('Error resending invitation:', inviteError);
                const isRateLimit = inviteError.message?.toLowerCase().includes('rate') ||
                    inviteError.status === 429;
                return res.status(isRateLimit ? 429 : 400).json({
                    success: false,
                    error: isRateLimit
                        ? 'Email rate limit reached. Please wait before sending more invitations.'
                        : inviteError.message
                });
            }

            // Update invited_at timestamp
            await supabase
                .from('users')
                .update({ invited_at: new Date().toISOString() })
                .eq('id', id);

            console.log(`Invitation resent to ${user.email} by admin ${req.userId}`);

            res.json({
                success: true,
                message: 'Invitation email resent successfully'
            });
        } catch (error) {
            console.error('Error resending invitation:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/platform/users/:id/add-to-org
     * Add a user to an organization
     */
    router.post('/users/:id/add-to-org', requireAdminWrite, async (req, res) => {
        try {
            const { id } = req.params;
            const { org_id, role = 'member' } = req.body;

            if (!org_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Organization ID is required'
                });
            }

            // Check if already a member
            const { data: existing } = await supabase
                .from('organization_members')
                .select('id, status')
                .eq('user_id', id)
                .eq('org_id', org_id)
                .single();

            if (existing) {
                if (existing.status === 'active') {
                    return res.status(409).json({
                        success: false,
                        error: 'User is already a member of this organization'
                    });
                }

                // Reactivate membership
                const { data, error } = await supabase
                    .from('organization_members')
                    .update({ status: 'active', role })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (error) throw error;

                // Also reactivate user if suspended
                await supabase
                    .from('users')
                    .update({
                        status: 'active',
                        suspended_at: null,
                        suspended_reason: null
                    })
                    .eq('id', id)
                    .eq('status', 'suspended');

                return res.json({
                    success: true,
                    data,
                    message: 'Membership reactivated'
                });
            }

            // Create new membership
            const { data, error } = await supabase
                .from('organization_members')
                .insert({
                    user_id: id,
                    org_id,
                    role,
                    status: 'active',
                    invited_by: req.userId,
                    joined_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // Reactivate user if suspended
            await supabase
                .from('users')
                .update({
                    status: 'active',
                    suspended_at: null,
                    suspended_reason: null
                })
                .eq('id', id)
                .eq('status', 'suspended');

            res.json({
                success: true,
                data,
                message: 'User added to organization'
            });
        } catch (error) {
            console.error('Error adding user to org:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
};
