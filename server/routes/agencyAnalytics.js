/**
 * Agency Analytics API Routes
 * Provides aggregate metrics, trends, and dashboards for organizations
 */

const express = require('express');

module.exports = function(supabase) {
    const router = express.Router();

    /**
     * Middleware: Require org membership
     */
    async function requireOrgMember(req, res, next) {
        const userId = req.userId;
        const orgId = req.params.orgId || req.query.org_id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        if (!orgId) {
            return res.status(400).json({
                success: false,
                error: 'Organization ID required'
            });
        }

        const { data: membership, error } = await supabase
            .from('organization_members')
            .select('role')
            .eq('org_id', orgId)
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (error || !membership) {
            return res.status(403).json({
                success: false,
                error: 'Not a member of this organization'
            });
        }

        req.orgId = orgId;
        req.orgRole = membership.role;
        next();
    }

    // ==========================================
    // OVERVIEW ENDPOINTS
    // ==========================================

    /**
     * GET /api/analytics/:orgId/overview
     * Get high-level overview metrics for the organization
     */
    router.get('/:orgId/overview', requireOrgMember, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('agency_overview')
                .select('*')
                .eq('org_id', req.orgId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            res.json({
                success: true,
                data: data || {
                    total_clients: 0,
                    active_clients: 0,
                    prospects: 0,
                    total_sessions: 0,
                    completed_sessions: 0,
                    avg_maturity_score: null,
                    avg_readiness_score: null,
                    avg_health_score: null
                }
            });
        } catch (error) {
            console.error('Error fetching overview:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // CLIENT METRICS ENDPOINTS
    // ==========================================

    /**
     * GET /api/analytics/:orgId/clients
     * Get per-client metrics breakdown
     */
    router.get('/:orgId/clients', requireOrgMember, async (req, res) => {
        try {
            const {
                status,
                sort_by = 'health_score',
                sort_order = 'desc',
                limit = 50,
                offset = 0
            } = req.query;

            let query = supabase
                .from('agency_client_metrics')
                .select('*')
                .eq('org_id', req.orgId);

            if (status) {
                query = query.eq('client_status', status);
            }

            // Apply sorting
            const ascending = sort_order === 'asc';
            query = query.order(sort_by, { ascending, nullsFirst: false });

            // Apply pagination
            query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            const { data, error, count } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data,
                pagination: {
                    offset: parseInt(offset),
                    limit: parseInt(limit),
                    total: count
                }
            });
        } catch (error) {
            console.error('Error fetching client metrics:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/analytics/:orgId/clients/:clientId
     * Get detailed metrics for a specific client
     */
    router.get('/:orgId/clients/:clientId', requireOrgMember, async (req, res) => {
        try {
            const { clientId } = req.params;

            // Get current metrics
            const { data: metrics, error: metricsError } = await supabase
                .from('agency_client_metrics')
                .select('*')
                .eq('client_id', clientId)
                .eq('org_id', req.orgId)
                .single();

            if (metricsError) throw metricsError;

            // Get score history (last 90 days)
            const { data: history, error: historyError } = await supabase
                .from('client_score_history')
                .select('*')
                .eq('client_id', clientId)
                .gte('score_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
                .order('score_date', { ascending: true });

            if (historyError) throw historyError;

            res.json({
                success: true,
                data: {
                    current: metrics,
                    history: history || []
                }
            });
        } catch (error) {
            console.error('Error fetching client detail:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // DISTRIBUTION ENDPOINTS
    // ==========================================

    /**
     * GET /api/analytics/:orgId/distribution/maturity
     * Get maturity level distribution
     */
    router.get('/:orgId/distribution/maturity', requireOrgMember, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('agency_maturity_distribution')
                .select('*')
                .eq('org_id', req.orgId);

            if (error) throw error;

            // Format for chart consumption
            const distribution = {
                labels: ['Nascent', 'Emerging', 'Developing', 'Advanced', 'Leading'],
                data: [0, 0, 0, 0, 0],
                percentages: [0, 0, 0, 0, 0]
            };

            data.forEach(item => {
                const index = distribution.labels.indexOf(item.maturity_level);
                if (index !== -1) {
                    distribution.data[index] = item.client_count;
                    distribution.percentages[index] = item.percentage;
                }
            });

            res.json({
                success: true,
                data: distribution
            });
        } catch (error) {
            console.error('Error fetching maturity distribution:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/analytics/:orgId/distribution/engagement
     * Get engagement status distribution
     */
    router.get('/:orgId/distribution/engagement', requireOrgMember, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('agency_client_metrics')
                .select('engagement_status')
                .eq('org_id', req.orgId)
                .neq('client_status', 'archived');

            if (error) throw error;

            // Count by engagement status
            const counts = data.reduce((acc, item) => {
                acc[item.engagement_status] = (acc[item.engagement_status] || 0) + 1;
                return acc;
            }, {});

            const total = data.length;
            const distribution = {
                labels: ['Active', 'Engaged', 'Dormant', 'New'],
                data: [
                    counts.active || 0,
                    counts.engaged || 0,
                    counts.dormant || 0,
                    counts.new || 0
                ],
                percentages: [
                    total ? Math.round(100 * (counts.active || 0) / total) : 0,
                    total ? Math.round(100 * (counts.engaged || 0) / total) : 0,
                    total ? Math.round(100 * (counts.dormant || 0) / total) : 0,
                    total ? Math.round(100 * (counts.new || 0) / total) : 0
                ]
            };

            res.json({
                success: true,
                data: distribution
            });
        } catch (error) {
            console.error('Error fetching engagement distribution:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // TRENDS ENDPOINTS
    // ==========================================

    /**
     * GET /api/analytics/:orgId/trends
     * Get historical trend data
     */
    router.get('/:orgId/trends', requireOrgMember, async (req, res) => {
        try {
            const {
                period = '90d',
                snapshot_type = 'daily'
            } = req.query;

            // Calculate date range
            const days = period === '30d' ? 30 : period === '90d' ? 90 : period === '1y' ? 365 : 90;
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('agency_metrics_snapshots')
                .select('*')
                .eq('org_id', req.orgId)
                .eq('snapshot_type', snapshot_type)
                .gte('snapshot_date', startDate)
                .order('snapshot_date', { ascending: true });

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });
        } catch (error) {
            console.error('Error fetching trends:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/analytics/:orgId/trends/clients
     * Get client-level trend data
     */
    router.get('/:orgId/trends/clients', requireOrgMember, async (req, res) => {
        try {
            const {
                client_id,
                period = '90d'
            } = req.query;

            const days = period === '30d' ? 30 : period === '90d' ? 90 : period === '1y' ? 365 : 90;
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            let query = supabase
                .from('client_score_history')
                .select('*')
                .eq('org_id', req.orgId)
                .gte('score_date', startDate)
                .order('score_date', { ascending: true });

            if (client_id) {
                query = query.eq('client_id', client_id);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });
        } catch (error) {
            console.error('Error fetching client trends:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // RANKINGS ENDPOINTS
    // ==========================================

    /**
     * GET /api/analytics/:orgId/top-performers
     * Get top performing clients
     */
    router.get('/:orgId/top-performers', requireOrgMember, async (req, res) => {
        try {
            const { limit = 10, metric = 'health' } = req.query;

            const { data, error } = await supabase
                .from('agency_top_performers')
                .select('*')
                .eq('org_id', req.orgId)
                .order(metric === 'maturity' ? 'maturity_rank' : 'health_rank', { ascending: true })
                .limit(parseInt(limit));

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });
        } catch (error) {
            console.error('Error fetching top performers:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/analytics/:orgId/needs-attention
     * Get clients that need attention (low scores, dormant, etc.)
     */
    router.get('/:orgId/needs-attention', requireOrgMember, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('agency_client_metrics')
                .select('*')
                .eq('org_id', req.orgId)
                .eq('client_status', 'active')
                .or('health_score.lt.50,engagement_status.eq.dormant')
                .order('health_score', { ascending: true, nullsFirst: true })
                .limit(10);

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });
        } catch (error) {
            console.error('Error fetching needs attention:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // EXPORT ENDPOINTS
    // ==========================================

    /**
     * GET /api/analytics/:orgId/export
     * Export analytics data
     */
    router.get('/:orgId/export', requireOrgMember, async (req, res) => {
        try {
            const { format = 'json', type = 'clients' } = req.query;

            let data;

            if (type === 'overview') {
                const { data: overview } = await supabase
                    .from('agency_overview')
                    .select('*')
                    .eq('org_id', req.orgId)
                    .single();
                data = overview;
            } else if (type === 'trends') {
                const { data: trends } = await supabase
                    .from('agency_metrics_snapshots')
                    .select('*')
                    .eq('org_id', req.orgId)
                    .order('snapshot_date', { ascending: false })
                    .limit(365);
                data = trends;
            } else {
                // Default: clients
                const { data: clients } = await supabase
                    .from('agency_client_metrics')
                    .select('*')
                    .eq('org_id', req.orgId)
                    .order('client_name');
                data = clients;
            }

            if (format === 'csv') {
                // Convert to CSV
                if (!data || (Array.isArray(data) && data.length === 0)) {
                    return res.status(204).send();
                }

                const items = Array.isArray(data) ? data : [data];
                const headers = Object.keys(items[0]);
                const csv = [
                    headers.join(','),
                    ...items.map(item =>
                        headers.map(h => {
                            const val = item[h];
                            if (val === null || val === undefined) return '';
                            if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
                            if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
                            return val;
                        }).join(',')
                    )
                ].join('\n');

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=analytics-${type}-${new Date().toISOString().split('T')[0]}.csv`);
                return res.send(csv);
            }

            res.json({
                success: true,
                data,
                exported_at: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error exporting analytics:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // SNAPSHOT TRIGGER (Admin only)
    // ==========================================

    /**
     * POST /api/analytics/:orgId/capture-snapshot
     * Manually trigger a metrics snapshot
     */
    router.post('/:orgId/capture-snapshot', requireOrgMember, async (req, res) => {
        try {
            if (!['owner', 'admin'].includes(req.orgRole)) {
                return res.status(403).json({
                    success: false,
                    error: 'Admin access required'
                });
            }

            const { snapshot_type = 'daily' } = req.body;

            // Capture org snapshot
            const { data: orgResult, error: orgError } = await supabase
                .rpc('capture_agency_metrics_snapshot', { p_snapshot_type: snapshot_type });

            if (orgError) throw orgError;

            // Capture client scores
            const { data: clientResult, error: clientError } = await supabase
                .rpc('capture_client_score_history');

            if (clientError) throw clientError;

            res.json({
                success: true,
                message: 'Snapshot captured successfully',
                data: {
                    orgs_processed: orgResult,
                    clients_processed: clientResult
                }
            });
        } catch (error) {
            console.error('Error capturing snapshot:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
};
