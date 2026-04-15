/**
 * Role Change Audit API Routes
 * Provides read access to role change audit trail
 * Version: 1.0.0
 */

const express = require('express');

module.exports = function(supabase) {
    const router = express.Router();

    /**
     * GET /api/role-audit
     * List role change audit entries
     * Platform admins see all; org admins see their org only
     */
    router.get('/', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }

            const {
                limit = 50,
                offset = 0,
                org_id,
                target_user_id,
                change_type,
                entity_type,
                start_date,
                end_date
            } = req.query;

            // Check platform admin
            const { data: isAdmin } = await supabase
                .rpc('is_platform_admin', { p_user_id: userId });

            // If not platform admin, must have org context and be org admin
            let scopedOrgId = org_id;
            if (!isAdmin) {
                if (!scopedOrgId) {
                    return res.status(403).json({
                        success: false,
                        error: 'Platform admin access required for unscoped audit queries'
                    });
                }

                // Verify org admin role
                const { data: membership } = await supabase
                    .from('organization_members')
                    .select('role')
                    .eq('org_id', scopedOrgId)
                    .eq('user_id', userId)
                    .eq('status', 'active')
                    .single();

                if (!membership || !['owner', 'admin'].includes(membership.role)) {
                    return res.status(403).json({
                        success: false,
                        error: 'Organization admin access required'
                    });
                }
            }

            // Build query
            let query = supabase
                .from('role_change_audit')
                .select(`
                    id,
                    target_user_id,
                    changed_by,
                    change_type,
                    entity_type,
                    entity_id,
                    org_id,
                    old_value,
                    new_value,
                    reason,
                    created_at
                `)
                .order('created_at', { ascending: false });

            // Apply filters
            if (scopedOrgId) {
                query = query.eq('org_id', scopedOrgId);
            }
            if (target_user_id) {
                query = query.eq('target_user_id', target_user_id);
            }
            if (change_type) {
                query = query.eq('change_type', change_type);
            }
            if (entity_type) {
                query = query.eq('entity_type', entity_type);
            }
            if (start_date) {
                query = query.gte('created_at', start_date);
            }
            if (end_date) {
                query = query.lte('created_at', end_date);
            }

            query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            const { data, error } = await query;

            if (error) throw error;

            // Enrich with user names
            const allUserIds = new Set();
            (data || []).forEach(entry => {
                if (entry.target_user_id) allUserIds.add(entry.target_user_id);
                if (entry.changed_by) allUserIds.add(entry.changed_by);
            });

            let userMap = {};
            if (allUserIds.size > 0) {
                const { data: users } = await supabase
                    .from('users')
                    .select('id, email, display_name')
                    .in('id', [...allUserIds]);

                if (users) {
                    userMap = users.reduce((acc, u) => {
                        acc[u.id] = u;
                        return acc;
                    }, {});
                }
            }

            // Enrich with org names if needed
            const orgIds = [...new Set((data || []).map(e => e.org_id).filter(Boolean))];
            let orgMap = {};
            if (orgIds.length > 0) {
                const { data: orgs } = await supabase
                    .from('organizations')
                    .select('id, name')
                    .in('id', orgIds);

                if (orgs) {
                    orgMap = orgs.reduce((acc, o) => {
                        acc[o.id] = o;
                        return acc;
                    }, {});
                }
            }

            const enriched = (data || []).map(entry => ({
                ...entry,
                target_user: userMap[entry.target_user_id] || null,
                changed_by_user: userMap[entry.changed_by] || null,
                organization: orgMap[entry.org_id] || null
            }));

            res.json({
                success: true,
                data: enriched,
                count: enriched.length
            });
        } catch (error) {
            console.error('Error fetching role audit:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/role-audit/summary
     * Get summary statistics of role changes
     * Platform admins only
     */
    router.get('/summary', async (req, res) => {
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

            const { days = 30 } = req.query;
            const sinceDate = new Date();
            sinceDate.setDate(sinceDate.getDate() - parseInt(days));

            // Get counts by change type
            const { data, error } = await supabase
                .from('role_change_audit')
                .select('change_type')
                .gte('created_at', sinceDate.toISOString());

            if (error) throw error;

            const summary = {};
            (data || []).forEach(entry => {
                summary[entry.change_type] = (summary[entry.change_type] || 0) + 1;
            });

            res.json({
                success: true,
                data: {
                    period_days: parseInt(days),
                    since: sinceDate.toISOString(),
                    total_changes: data?.length || 0,
                    by_type: summary
                }
            });
        } catch (error) {
            console.error('Error fetching role audit summary:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
};
