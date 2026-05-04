/**
 * INSIGHT 360 - Tier Default Change Alert Service
 * Version: 1.0.0
 * Phase: 88 (REQ-003)
 *
 * Decision #11 (REQ-003): when a tier_module_access cell changes for
 * a module that one or more orgs have an override on, surface an alert
 * to the platform admin (badge + per-org list on admin-org-config.html).
 *
 * Called from the tier_module_access write routes (PUT /tier-modules/:tier/:module
 * and PUT /tier-modules/bulk) AFTER the change is committed. Failure to
 * generate an alert should not block the underlying write — log and continue.
 *
 * Classification:
 *   - 'up'      — the new access is more inclusive (none → optional → core)
 *   - 'down'    — the new access is less inclusive (core → optional → none)
 *   - 'lateral' — same access type, but addon_price_monthly changed
 *
 * If access type AND price are both unchanged, no alert is generated.
 */

const ACCESS_RANK = { none: 0, optional: 1, core: 2 };

/**
 * Compare a previous and next tier_module_access cell, returning the
 * change classification — or null if no meaningful change.
 *
 * @returns {'up'|'down'|'lateral'|null}
 */
function classifyChange(prev, next) {
    if (!next) return null;
    const prevAccess = prev?.access_type ?? 'none';
    const nextAccess = next.access_type;

    if (prevAccess !== nextAccess) {
        const prevRank = ACCESS_RANK[prevAccess] ?? 0;
        const nextRank = ACCESS_RANK[nextAccess] ?? 0;
        if (nextRank > prevRank) return 'up';
        if (nextRank < prevRank) return 'down';
        return null;
    }

    // Same access type — check if optional addon price changed
    if (nextAccess === 'optional') {
        const prevPrice = prev?.addon_price_monthly !== undefined ? Number(prev.addon_price_monthly) : null;
        const nextPrice = next.addon_price_monthly !== undefined ? Number(next.addon_price_monthly) : null;
        if (prevPrice !== nextPrice) return 'lateral';
    }

    return null;
}

/**
 * Find every org with an override on the given module and emit alert rows.
 * Idempotent at the row level: each (org, module, tier, created_at) combo
 * is unique by virtue of the timestamp; we don't dedupe historical alerts.
 * The admin UI is expected to dismiss/acknowledge old alerts when a new
 * one supersedes it for the same (org, module).
 *
 * @param {object} supabase
 * @param {object} args
 * @param {string} args.tierId   - the tier whose default changed
 * @param {string} args.moduleId - the module whose access changed
 * @param {object|null} args.prev - previous tier_module_access row (or null if newly inserted)
 * @param {object} args.next     - new tier_module_access row
 * @returns {Promise<{ classification: string|null, alerts_created: number, affected_org_ids: string[] }>}
 */
async function emitAlertsForTierChange(supabase, { tierId, moduleId, prev, next } = {}) {
    if (!tierId || !moduleId || !next) {
        throw new Error('tierChangeAlertService.emitAlertsForTierChange: tierId, moduleId, next required');
    }

    const classification = classifyChange(prev, next);
    if (classification === null) {
        return { classification: null, alerts_created: 0, affected_org_ids: [] };
    }

    // Find orgs on this tier that have an override on this module
    const { data: orgs, error: orgsErr } = await supabase
        .from('organizations')
        .select('id')
        .eq('subscription_tier', tierId);

    if (orgsErr) throw new Error(`tierChangeAlertService: org lookup failed: ${orgsErr.message}`);

    if (!orgs || orgs.length === 0) {
        return { classification, alerts_created: 0, affected_org_ids: [] };
    }

    const orgIds = orgs.map(o => o.id);

    const { data: overrides, error: ovErr } = await supabase
        .from('org_module_overrides')
        .select('org_id')
        .eq('module_id', moduleId)
        .in('org_id', orgIds);

    if (ovErr) {
        // Phase 88 not applied yet — graceful no-op
        if (ovErr.code === '42P01') return { classification, alerts_created: 0, affected_org_ids: [] };
        throw new Error(`tierChangeAlertService: override lookup failed: ${ovErr.message}`);
    }

    if (!overrides || overrides.length === 0) {
        return { classification, alerts_created: 0, affected_org_ids: [] };
    }

    const affectedOrgIds = overrides.map(o => o.org_id);

    const rows = affectedOrgIds.map(orgId => ({
        org_id: orgId,
        module_id: moduleId,
        tier_id: tierId,
        change_type: classification,
        old_access_type: prev?.access_type ?? null,
        new_access_type: next.access_type,
        old_addon_price_monthly: prev?.addon_price_monthly ?? null,
        new_addon_price_monthly: next.addon_price_monthly ?? null
    }));

    const { error: insErr } = await supabase
        .from('tier_default_change_alerts')
        .insert(rows);

    if (insErr) throw new Error(`tierChangeAlertService: alert insert failed: ${insErr.message}`);

    return {
        classification,
        alerts_created: rows.length,
        affected_org_ids: affectedOrgIds
    };
}

/**
 * Wrapper that swallows errors and logs them, so a failure in alert
 * generation never blocks the underlying tier_module_access write.
 * Use this from route handlers; use emitAlertsForTierChange directly
 * from tests.
 */
async function emitAlertsSafe(supabase, args) {
    try {
        return await emitAlertsForTierChange(supabase, args);
    } catch (err) {
        console.error('[tierChangeAlertService] non-fatal alert generation failure:', err.message);
        return { classification: null, alerts_created: 0, affected_org_ids: [], error: err.message };
    }
}

/**
 * Count unacknowledged alerts for a given org. Powers the badge on
 * admin-org-config.html.
 */
async function countUnacknowledgedForOrg(supabase, orgId) {
    const { count, error } = await supabase
        .from('tier_default_change_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .is('acknowledged_at', null);

    if (error) {
        if (error.code === '42P01') return 0;  // Phase 88 not applied
        throw new Error(`tierChangeAlertService: count failed: ${error.message}`);
    }
    return count || 0;
}

/**
 * Acknowledge one alert by id. Sets acknowledged_at + acknowledged_by_user_id.
 */
async function acknowledgeAlert(supabase, alertId, userId) {
    const { data, error } = await supabase
        .from('tier_default_change_alerts')
        .update({
            acknowledged_at: new Date().toISOString(),
            acknowledged_by_user_id: userId
        })
        .eq('id', alertId)
        .select('id, acknowledged_at')
        .single();

    if (error) throw new Error(`tierChangeAlertService.acknowledgeAlert failed: ${error.message}`);
    return data;
}

module.exports = {
    emitAlertsForTierChange,
    emitAlertsSafe,
    countUnacknowledgedForOrg,
    acknowledgeAlert,
    classifyChange,
    ACCESS_RANK
};
