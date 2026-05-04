/**
 * Platform Admin — Organization Management.
 *
 * requirePlatformAdmin is applied by the coordinator. requireAdminWrite is per-route.
 */

const express = require('express');

module.exports = function (supabase, requireAdminWrite) {
    const router = express.Router();


    // ============================================
    // ORGANIZATIONS (ADMIN VIEW)
    // ============================================

    /**
     * GET /api/platform/organizations
     * List all organizations (admin view with tier details)
     */
    router.get('/organizations', async (req, res) => {
        try {
            const { tier, status, org_type, search, limit = 50, offset = 0 } = req.query;

            // Try to use the view first (Phase 44), fall back to direct query
            let data, error;

            // First attempt: use org_tier_details view
            let query = supabase
                .from('org_tier_details')
                .select('*');

            if (tier) {
                query = query.eq('subscription_tier', tier);
            }

            if (status) {
                query = query.eq('subscription_status', status);
            }

            if (org_type) {
                query = query.eq('org_type', org_type);
            }

            if (search) {
                query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
            }

            query = query
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            const viewResult = await query;
            data = viewResult.data;
            error = viewResult.error;

            // Fallback: if view doesn't exist, query organizations table directly
            if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
                console.log('org_tier_details view not found, using fallback query');

                let fallbackQuery = supabase
                    .from('organizations')
                    .select(`
                        id,
                        name,
                        slug,
                        org_type,
                        subscription_tier,
                        subscription_status,
                        settings,
                        created_at,
                        is_active
                    `);

                if (tier) {
                    fallbackQuery = fallbackQuery.eq('subscription_tier', tier);
                }

                if (status) {
                    fallbackQuery = fallbackQuery.eq('subscription_status', status);
                }

                if (org_type) {
                    fallbackQuery = fallbackQuery.eq('org_type', org_type);
                }

                if (search) {
                    fallbackQuery = fallbackQuery.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
                }

                fallbackQuery = fallbackQuery
                    .order('created_at', { ascending: false })
                    .range(offset, offset + limit - 1);

                const fallbackResult = await fallbackQuery;

                if (fallbackResult.error) throw fallbackResult.error;

                // Add placeholder tier info since we don't have the view
                data = (fallbackResult.data || []).map(org => ({
                    ...org,
                    tier_name: org.subscription_tier,
                    max_members: null,
                    max_clients: null,
                    current_members: null,
                    current_clients: null
                }));
                error = null;
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
            console.error('Error fetching organizations:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/platform/organizations/:id
     * Get a single organization's details (admin view)
     */
    router.get('/organizations/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return res.status(404).json({
                        success: false,
                        error: 'Organization not found'
                    });
                }
                throw error;
            }

            // Fetch tier features
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
                    member_role: 'platform_admin', // Platform admin viewing
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
     * GET /api/platform/organizations/:id/departments
     * List departments for a specific organization (for user invite form)
     */
    router.get('/organizations/:id/departments', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('departments')
                .select('id, name, icon, color, is_active')
                .eq('org_id', id)
                .eq('is_active', true)
                .order('name');

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });
        } catch (error) {
            console.error('Error fetching org departments:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/platform/organizations/:id/tier
     * Change an organization's subscription tier
     */
    router.put('/organizations/:id/tier', requireAdminWrite, async (req, res) => {
        try {
            const { id } = req.params;
            const { tier, status } = req.body;

            if (!tier) {
                return res.status(400).json({
                    success: false,
                    error: 'Tier is required'
                });
            }

            // Valid tiers (fallback if table doesn't exist)
            const validTiers = ['starter', 'business', 'enterprise', 'agency_starter', 'agency_professional', 'agency_enterprise', 'free', 'pro'];

            // Try to validate tier from database
            const { data: tierData, error: tierError } = await supabase
                .from('subscription_tiers')
                .select('id')
                .eq('id', tier)
                .single();

            // If table doesn't exist, validate against known tiers
            if (tierError && (tierError.code === '42P01' || tierError.message?.includes('does not exist'))) {
                if (!validTiers.includes(tier)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid tier'
                    });
                }
            } else if (tierError || !tierData) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid tier'
                });
            }

            const updateData = {
                subscription_tier: tier
            };

            if (status) {
                updateData.subscription_status = status;
            }

            // If upgrading to any agency tier, set org_type
            if (tier.startsWith('agency')) {
                updateData.org_type = 'agency';
            }

            const { data, error } = await supabase
                .from('organizations')
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
            console.error('Error changing org tier:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/platform/organizations/:id/modules
     * Configure which modules are enabled for an organization
     */
    router.put('/organizations/:id/modules', requireAdminWrite, async (req, res) => {
        try {
            const { id } = req.params;
            const { modules } = req.body; // Array of enabled module IDs

            if (!Array.isArray(modules)) {
                return res.status(400).json({
                    success: false,
                    error: 'modules must be an array of module IDs'
                });
            }

            // Get all available modules
            const { data: allModules, error: modError } = await supabase
                .from('platform_modules')
                .select('id');

            if (modError) {
                // If platform_modules table doesn't exist, use known module IDs
                console.warn('platform_modules table not found, using provided list');
            }

            const allModuleIds = allModules ? allModules.map(m => m.id) : modules;
            const userId = req.userId;

            // Upsert each module: enabled if in the list, disabled if not
            const upserts = allModuleIds.map(moduleId => ({
                org_id: id,
                module_id: moduleId,
                is_enabled: modules.includes(moduleId),
                enabled_by: modules.includes(moduleId) ? userId : null,
                enabled_at: modules.includes(moduleId) ? new Date().toISOString() : null,
                disabled_by: !modules.includes(moduleId) ? userId : null,
                disabled_at: !modules.includes(moduleId) ? new Date().toISOString() : null
            }));

            const { error: upsertError } = await supabase
                .from('org_module_access')
                .upsert(upserts, { onConflict: 'org_id,module_id' });

            if (upsertError) throw upsertError;

            res.json({
                success: true,
                message: `${modules.length} modules enabled for organization`,
                data: { enabled: modules }
            });
        } catch (error) {
            console.error('Error configuring org modules:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/platform/organizations/:id
     * Delete an organization and all its data + single-org member users
     *
     * With Phase 82 CASCADE FKs, org deletion automatically removes:
     *   agents, skills, workflows, actions, conversations, context_assets,
     *   departments, okrs, soul configs, support data, integrations, etc.
     *
     * This route additionally handles user cleanup:
     *   - Identifies users who ONLY belong to this org (safe to delete)
     *   - Deletes user-scoped data (research studios, TL profiles, etc.)
     *   - Removes from public.users and auth.users
     *   - Multi-org users are preserved (only their membership is removed via CASCADE)
     */
    router.delete('/organizations/:id', requireAdminWrite, async (req, res) => {
        try {
            const { id } = req.params;

            // Check if org exists
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .select('id, name, is_platform_owner')
                .eq('id', id)
                .single();

            if (orgError || !org) {
                return res.status(404).json({
                    success: false,
                    error: 'Organization not found'
                });
            }

            // Cannot delete platform owner org
            if (org.is_platform_owner) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot delete the platform owner organization'
                });
            }

            // Step 1: Collect member user IDs BEFORE deleting org
            const { data: members } = await supabase
                .from('organization_members')
                .select('user_id')
                .eq('org_id', id);

            const allMemberIds = (members || []).map(m => m.user_id);

            // Identify single-org users (safe to delete) vs multi-org users (preserve)
            const singleOrgUserIds = [];
            const multiOrgUserIds = [];
            for (const userId of allMemberIds) {
                const { data: otherMemberships } = await supabase
                    .from('organization_members')
                    .select('org_id')
                    .eq('user_id', userId)
                    .neq('org_id', id);

                if (!otherMemberships || otherMemberships.length === 0) {
                    singleOrgUserIds.push(userId);
                } else {
                    multiOrgUserIds.push(userId);
                }
            }

            // Step 2: Delete the organization
            // CASCADE FKs (Phase 82) automatically remove:
            //   agents, skills, workflows, actions, conversations, context_assets,
            //   departments (-> processes, roles, responsibilities), okrs,
            //   align120_sessions, company_profiles, briefings, soul_configurations,
            //   support_conversations (-> support_messages), widget_configs,
            //   org_module_access, org_branding, integration configs, digest data,
            //   social posts, editorial calendars, and ~35 more tables
            const { error: deleteError } = await supabase
                .from('organizations')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            // Step 3: Clean up single-org users
            let usersDeleted = 0;
            let authUsersDeleted = 0;
            const authDeleteErrors = [];

            if (singleOrgUserIds.length > 0) {
                // Delete user-scoped tables (no org_id column, only user_id)
                const userScopedTables = [
                    'research_studios', 'thought_leadership_profiles',
                    'ai_visibility_research', 'content_pillars',
                    'content_calendar_entries', 'thought_leadership_outputs'
                ];
                for (const table of userScopedTables) {
                    await supabase
                        .from(table)
                        .delete()
                        .in('user_id', singleOrgUserIds);
                }

                // Delete from public.users (cascades to any remaining user-FK'd rows)
                const { error: userDeleteError } = await supabase
                    .from('users')
                    .delete()
                    .in('id', singleOrgUserIds);

                if (!userDeleteError) {
                    usersDeleted = singleOrgUserIds.length;
                } else {
                    console.error('[DELETE ORG] Failed to delete public.users:', userDeleteError);
                }

                // Delete from auth.users (Supabase auth system)
                for (const userId of singleOrgUserIds) {
                    try {
                        const { error } = await supabase.auth.admin.deleteUser(userId);
                        if (error) {
                            authDeleteErrors.push({ id: userId, error: error.message });
                        } else {
                            authUsersDeleted++;
                        }
                    } catch (err) {
                        authDeleteErrors.push({ id: userId, error: err.message });
                    }
                }
            }

            console.log(`[DELETE ORG] "${org.name}" deleted by ${req.userId}. ` +
                `Single-org users deleted: ${usersDeleted}/${singleOrgUserIds.length}, ` +
                `Auth deleted: ${authUsersDeleted}, ` +
                `Multi-org users preserved: ${multiOrgUserIds.length}`);

            res.json({
                success: true,
                message: `Organization "${org.name}" and all associated data deleted`,
                summary: {
                    organization: org.name,
                    users_deleted: usersDeleted,
                    auth_users_deleted: authUsersDeleted,
                    multi_org_users_preserved: multiOrgUserIds.length,
                    auth_delete_errors: authDeleteErrors.length > 0 ? authDeleteErrors : undefined
                }
            });
        } catch (error) {
            console.error('Error deleting organization:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
};
