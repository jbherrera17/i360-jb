/**
 * Platform Admin — Tier Module Matrix (cross-tier admin).
 *
 * requirePlatformAdmin is applied by the coordinator. requireAdminWrite is per-route.
 */

const express = require('express');

const tierChangeAlertService = require('../../services/tierChangeAlertService');

module.exports = function (supabase, requireAdminWrite) {
    const router = express.Router();


    // ============================================
    // TIER × MODULE ACCESS MATRIX (Phase 87 — REQ-003)
    // ============================================
    // CRUD for the per-tier-per-module Core/Optional/None matrix.
    // Writes trigger tierChangeAlertService asynchronously to surface
    // alerts to platform admin for any orgs with overrides on the
    // affected (tier, module) cell.

    /**
     * GET /api/platform/tier-modules?tier_id=<id>
     * Array of tier_module_access rows for one tier.
     */
    router.get('/tier-modules', async (req, res) => {
        try {
            const { tier_id } = req.query;
            if (!tier_id) {
                return res.status(400).json({ success: false, error: 'tier_id query parameter is required' });
            }
            const { data, error } = await supabase
                .from('tier_module_access')
                .select('*')
                .eq('tier_id', tier_id);
            if (error) throw error;
            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error fetching tier-modules:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/platform/tier-modules/matrix
     * Full matrix: every tier_module_access row with joined tier + module
     * metadata. Used by the admin matrix editor on admin-tier-setup.html.
     */
    router.get('/tier-modules/matrix', async (req, res) => {
        try {
            const [tiersResult, modulesResult, matrixResult] = await Promise.all([
                supabase.from('subscription_tiers').select('id, name, display_order, tier_group, is_public, is_active').order('display_order'),
                supabase.from('platform_modules').select('id, name, icon, nav_group, category, display_order, is_active').order('display_order'),
                supabase.from('tier_module_access').select('*')
            ]);
            if (tiersResult.error) throw tiersResult.error;
            if (modulesResult.error) throw modulesResult.error;
            if (matrixResult.error) throw matrixResult.error;

            // Index matrix by (tier_id, module_id) for the UI to look up cells fast
            const cells = {};
            for (const row of (matrixResult.data || [])) {
                cells[`${row.tier_id}::${row.module_id}`] = row;
            }

            res.json({
                success: true,
                data: {
                    tiers: tiersResult.data || [],
                    modules: modulesResult.data || [],
                    cells
                }
            });
        } catch (error) {
            console.error('Error fetching tier-module matrix:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/platform/tier-modules/:tier_id/:module_id
     * Upsert one cell. Body: { access_type, addon_price_monthly?,
     *   addon_price_yearly?, addon_description?, resource_overrides?,
     *   display_order_override? }.
     *
     * Triggers tierChangeAlertService to emit alerts for orgs with
     * overrides on this module.
     */
    router.put('/tier-modules/:tier_id/:module_id', requireAdminWrite, async (req, res) => {
        try {
            const { tier_id, module_id } = req.params;
            const {
                access_type,
                addon_price_monthly = null,
                addon_price_yearly = null,
                addon_description = null,
                resource_overrides = {},
                display_order_override = null
            } = req.body;

            if (!['core', 'optional', 'none'].includes(access_type)) {
                return res.status(400).json({ success: false, error: 'access_type must be core | optional | none' });
            }
            if (access_type === 'optional' && (addon_price_monthly === null || addon_price_monthly === undefined)) {
                return res.status(400).json({ success: false, error: 'addon_price_monthly required when access_type is optional' });
            }

            // Read prior cell (if any) so we can pass it to the alert service
            const { data: prior } = await supabase
                .from('tier_module_access')
                .select('*')
                .eq('tier_id', tier_id)
                .eq('module_id', module_id)
                .maybeSingle();

            const upsertPayload = {
                tier_id,
                module_id,
                access_type,
                addon_price_monthly: access_type === 'optional' ? addon_price_monthly : null,
                addon_price_yearly:  access_type === 'optional' ? addon_price_yearly  : null,
                addon_description:   access_type === 'optional' ? addon_description   : null,
                resource_overrides:  resource_overrides || {},
                display_order_override
            };

            const { data, error } = await supabase
                .from('tier_module_access')
                .upsert(upsertPayload, { onConflict: 'tier_id,module_id' })
                .select()
                .single();
            if (error) throw error;

            // Fire-and-forget: emit alerts (does not block the response)
            const alertResult = await tierChangeAlertService.emitAlertsSafe(supabase, {
                tierId: tier_id,
                moduleId: module_id,
                prev: prior,
                next: data
            });

            res.json({ success: true, data, alerts: alertResult });
        } catch (error) {
            console.error('Error upserting tier-module cell:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/platform/tier-modules/bulk
     * Body: { cells: [{tier_id, module_id, access_type, addon_price_monthly?, ...}, ...] }
     * Upserts many cells; runs alert generation per cell.
     */
    router.put('/tier-modules/bulk', requireAdminWrite, async (req, res) => {
        try {
            const cells = Array.isArray(req.body?.cells) ? req.body.cells : null;
            if (!cells || cells.length === 0) {
                return res.status(400).json({ success: false, error: 'cells array required' });
            }

            // Validate each cell up front; reject the whole batch on first invalid
            for (const c of cells) {
                if (!c.tier_id || !c.module_id) {
                    return res.status(400).json({ success: false, error: 'each cell needs tier_id and module_id' });
                }
                if (!['core','optional','none'].includes(c.access_type)) {
                    return res.status(400).json({ success: false, error: `invalid access_type for ${c.tier_id}/${c.module_id}` });
                }
                if (c.access_type === 'optional' && (c.addon_price_monthly === null || c.addon_price_monthly === undefined)) {
                    return res.status(400).json({ success: false, error: `addon_price_monthly required for ${c.tier_id}/${c.module_id}` });
                }
            }

            // Read prior state for all affected cells to pass to alert service
            const priorByKey = {};
            const tierIds = [...new Set(cells.map(c => c.tier_id))];
            const moduleIds = [...new Set(cells.map(c => c.module_id))];
            const { data: priorRows } = await supabase
                .from('tier_module_access')
                .select('*')
                .in('tier_id', tierIds)
                .in('module_id', moduleIds);
            for (const r of (priorRows || [])) {
                priorByKey[`${r.tier_id}::${r.module_id}`] = r;
            }

            const upsertPayload = cells.map(c => ({
                tier_id: c.tier_id,
                module_id: c.module_id,
                access_type: c.access_type,
                addon_price_monthly: c.access_type === 'optional' ? c.addon_price_monthly : null,
                addon_price_yearly:  c.access_type === 'optional' ? (c.addon_price_yearly ?? null) : null,
                addon_description:   c.access_type === 'optional' ? (c.addon_description ?? null) : null,
                resource_overrides:  c.resource_overrides || {},
                display_order_override: c.display_order_override ?? null
            }));

            const { data, error } = await supabase
                .from('tier_module_access')
                .upsert(upsertPayload, { onConflict: 'tier_id,module_id' })
                .select();
            if (error) throw error;

            // Emit alerts for each changed cell (sequential — tier_id × module_id volume is small)
            const alertResults = [];
            for (const next of (data || [])) {
                const key = `${next.tier_id}::${next.module_id}`;
                const result = await tierChangeAlertService.emitAlertsSafe(supabase, {
                    tierId: next.tier_id,
                    moduleId: next.module_id,
                    prev: priorByKey[key] || null,
                    next
                });
                if (result.alerts_created > 0 || result.error) alertResults.push({ key, ...result });
            }

            res.json({ success: true, updated: data?.length || 0, alerts: alertResults });
        } catch (error) {
            console.error('Error bulk upserting tier-modules:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });


    return router;
};
