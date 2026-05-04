/**
 * Platform Admin — Per-Org Configuration Overrides.
 *
 * requirePlatformAdmin is applied by the coordinator. requireAdminWrite is per-route.
 */

const express = require('express');

const effectiveConfigResolver = require('../../services/effectiveConfigResolver');
const orgConfigAuditService = require('../../services/orgConfigAuditService');
const tierChangeAlertService = require('../../services/tierChangeAlertService');

module.exports = function (supabase, requireAdminWrite) {
    const router = express.Router();


    // ============================================
    // PER-ORG CONFIGURATION OVERRIDES (Phase 88 — REQ-003)
    // ============================================
    // CRUD for org_module_overrides + org_resource_overrides + audit log
    // viewer + tier-default-change alert management. Every mutation
    // requires a non-empty reason (Decision #12) and writes to
    // org_config_change_log.

    const RESOURCE_FIELDS = [
        'max_members','max_agents','max_workflows','max_skills',
        'max_context_assets','max_research_studios',
        'max_monthly_api_calls','max_storage_gb','max_clients'
    ];

    /**
     * GET /api/platform/orgs/:orgId/effective-config
     * Returns the merged tier defaults + org overrides + trial overlay.
     * Powers the side-by-side view on admin-org-config.html.
     */
    router.get('/orgs/:orgId/effective-config', async (req, res) => {
        try {
            const config = await effectiveConfigResolver.getEffectiveConfig(supabase, req.params.orgId);
            res.json({ success: true, data: config });
        } catch (error) {
            console.error('Error fetching effective config:', error);
            const status = /not found/.test(error.message) ? 404 : 500;
            res.status(status).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/platform/orgs/:orgId/overrides
     * Returns just the override rows (separate resource + module arrays).
     * Used by the override editor UI to render the "what's overridden" view.
     */
    router.get('/orgs/:orgId/overrides', async (req, res) => {
        try {
            const { orgId } = req.params;
            const [resourcesResult, modulesResult] = await Promise.all([
                supabase.from('org_resource_overrides')
                    .select('id, field, override_value, override_reason, created_by, created_at, updated_at')
                    .eq('org_id', orgId)
                    .order('field'),
                supabase.from('org_module_overrides')
                    .select('id, module_id, access_type, resource_overrides, override_reason, created_by, created_at, updated_at')
                    .eq('org_id', orgId)
                    .order('module_id')
            ]);
            if (resourcesResult.error) throw resourcesResult.error;
            if (modulesResult.error) throw modulesResult.error;

            res.json({
                success: true,
                data: {
                    resource: resourcesResult.data || [],
                    module: modulesResult.data || []
                }
            });
        } catch (error) {
            console.error('Error fetching org overrides:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/platform/orgs/:orgId/overrides/resource
     * Body: { field, override_value, reason }
     * Upsert a resource limit override + write audit log entry.
     */
    router.put('/orgs/:orgId/overrides/resource', requireAdminWrite, async (req, res) => {
        try {
            const { orgId } = req.params;
            const { field, override_value, reason } = req.body || {};

            if (!RESOURCE_FIELDS.includes(field)) {
                return res.status(400).json({ success: false, error: `field must be one of ${RESOURCE_FIELDS.join(', ')}` });
            }
            if (!Number.isInteger(override_value)) {
                return res.status(400).json({ success: false, error: 'override_value must be an integer (-1 = unlimited)' });
            }
            if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
                return res.status(400).json({ success: false, error: 'reason is required (Decision #12)' });
            }

            // Read prior value for the audit log
            const { data: prior } = await supabase
                .from('org_resource_overrides')
                .select('override_value')
                .eq('org_id', orgId).eq('field', field)
                .maybeSingle();

            const { data, error } = await supabase
                .from('org_resource_overrides')
                .upsert({
                    org_id: orgId,
                    field,
                    override_value,
                    override_reason: reason.trim(),
                    created_by: req.userId
                }, { onConflict: 'org_id,field' })
                .select()
                .single();
            if (error) throw error;

            await orgConfigAuditService.logChange(supabase, {
                orgId,
                changedByUserId: req.userId,
                changeType: 'resource',
                field,
                oldValue: prior ? { override_value: prior.override_value } : null,
                newValue: { override_value },
                reason
            });

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error upserting resource override:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/platform/orgs/:orgId/overrides/module/:moduleId
     * Body: { access_type, resource_overrides?, reason }
     * Upsert a module access override + write audit log entry.
     */
    router.put('/orgs/:orgId/overrides/module/:moduleId', requireAdminWrite, async (req, res) => {
        try {
            const { orgId, moduleId } = req.params;
            const { access_type, resource_overrides = {}, reason } = req.body || {};

            if (!['core','optional','none'].includes(access_type)) {
                return res.status(400).json({ success: false, error: 'access_type must be core | optional | none' });
            }
            if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
                return res.status(400).json({ success: false, error: 'reason is required (Decision #12)' });
            }

            const { data: prior } = await supabase
                .from('org_module_overrides')
                .select('access_type, resource_overrides')
                .eq('org_id', orgId).eq('module_id', moduleId)
                .maybeSingle();

            const { data, error } = await supabase
                .from('org_module_overrides')
                .upsert({
                    org_id: orgId,
                    module_id: moduleId,
                    access_type,
                    resource_overrides: resource_overrides || {},
                    override_reason: reason.trim(),
                    created_by: req.userId
                }, { onConflict: 'org_id,module_id' })
                .select()
                .single();
            if (error) throw error;

            await orgConfigAuditService.logChange(supabase, {
                orgId,
                changedByUserId: req.userId,
                changeType: 'module',
                field: moduleId,
                oldValue: prior ? { access_type: prior.access_type, resource_overrides: prior.resource_overrides } : null,
                newValue: { access_type, resource_overrides },
                reason
            });

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error upserting module override:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/platform/orgs/:orgId/overrides/resource/:field
     * Body: { reason }
     * Reset a resource override (delete row) + audit log.
     */
    router.delete('/orgs/:orgId/overrides/resource/:field', requireAdminWrite, async (req, res) => {
        try {
            const { orgId, field } = req.params;
            const { reason } = req.body || {};

            if (!RESOURCE_FIELDS.includes(field)) {
                return res.status(400).json({ success: false, error: `field must be one of ${RESOURCE_FIELDS.join(', ')}` });
            }
            if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
                return res.status(400).json({ success: false, error: 'reason is required for reset' });
            }

            const { data: prior } = await supabase
                .from('org_resource_overrides')
                .select('override_value')
                .eq('org_id', orgId).eq('field', field)
                .maybeSingle();

            if (!prior) {
                return res.json({ success: true, reset: false, reason: 'no override existed for this field' });
            }

            const { error } = await supabase
                .from('org_resource_overrides')
                .delete()
                .eq('org_id', orgId).eq('field', field);
            if (error) throw error;

            await orgConfigAuditService.logChange(supabase, {
                orgId,
                changedByUserId: req.userId,
                changeType: 'reset',
                field,
                oldValue: { override_value: prior.override_value },
                newValue: null,
                reason
            });

            res.json({ success: true, reset: true });
        } catch (error) {
            console.error('Error resetting resource override:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/platform/orgs/:orgId/overrides/module/:moduleId
     * Body: { reason }
     * Reset a module override (delete row) + audit log.
     */
    router.delete('/orgs/:orgId/overrides/module/:moduleId', requireAdminWrite, async (req, res) => {
        try {
            const { orgId, moduleId } = req.params;
            const { reason } = req.body || {};

            if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
                return res.status(400).json({ success: false, error: 'reason is required for reset' });
            }

            const { data: prior } = await supabase
                .from('org_module_overrides')
                .select('access_type, resource_overrides')
                .eq('org_id', orgId).eq('module_id', moduleId)
                .maybeSingle();

            if (!prior) {
                return res.json({ success: true, reset: false, reason: 'no override existed for this module' });
            }

            const { error } = await supabase
                .from('org_module_overrides')
                .delete()
                .eq('org_id', orgId).eq('module_id', moduleId);
            if (error) throw error;

            await orgConfigAuditService.logChange(supabase, {
                orgId,
                changedByUserId: req.userId,
                changeType: 'reset',
                field: moduleId,
                oldValue: { access_type: prior.access_type, resource_overrides: prior.resource_overrides },
                newValue: null,
                reason
            });

            res.json({ success: true, reset: true });
        } catch (error) {
            console.error('Error resetting module override:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/platform/orgs/:orgId/override-history?limit=50
     * Returns audit log entries for the org, newest first.
     */
    router.get('/orgs/:orgId/override-history', async (req, res) => {
        try {
            const { orgId } = req.params;
            const limit = parseInt(req.query.limit, 10);
            const rows = await orgConfigAuditService.listChanges(supabase, orgId, { limit });
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error('Error fetching override history:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });


    // ============================================
    // TIER DEFAULT CHANGE ALERTS (Decision #11)
    // ============================================

    /**
     * GET /api/platform/orgs/:orgId/alerts?include_acknowledged=false
     * List tier-default-change alerts for one org. Default: unacknowledged only.
     */
    router.get('/orgs/:orgId/alerts', async (req, res) => {
        try {
            const { orgId } = req.params;
            const includeAck = req.query.include_acknowledged === 'true';

            let query = supabase
                .from('tier_default_change_alerts')
                .select('id, module_id, tier_id, change_type, old_access_type, new_access_type, old_addon_price_monthly, new_addon_price_monthly, acknowledged_by_user_id, acknowledged_at, created_at')
                .eq('org_id', orgId)
                .order('created_at', { ascending: false })
                .limit(100);

            if (!includeAck) query = query.is('acknowledged_at', null);

            const { data, error } = await query;
            if (error) throw error;
            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error fetching alerts:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/platform/orgs/:orgId/alerts/count
     * Count of unacknowledged alerts. Powers the badge on admin-org-config.html.
     */
    router.get('/orgs/:orgId/alerts/count', async (req, res) => {
        try {
            const count = await tierChangeAlertService.countUnacknowledgedForOrg(supabase, req.params.orgId);
            res.json({ success: true, data: { unacknowledged_count: count } });
        } catch (error) {
            console.error('Error counting alerts:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/platform/alerts/:alertId/acknowledge
     * Mark one alert as acknowledged by the current platform admin.
     */
    router.post('/alerts/:alertId/acknowledge', requireAdminWrite, async (req, res) => {
        try {
            const data = await tierChangeAlertService.acknowledgeAlert(supabase, req.params.alertId, req.userId);
            res.json({ success: true, data });
        } catch (error) {
            console.error('Error acknowledging alert:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
