/**
 * INSIGHT 360 - Org Config Audit Service
 * Version: 1.0.0
 * Phase: 88 (REQ-003)
 *
 * Append-only audit log for every per-org configuration override change.
 * Every PUT/DELETE on org_module_overrides or org_resource_overrides
 * MUST call logChange() in the same transaction-equivalent flow.
 *
 * Decision #12 (REQ-003): the `reason` field is hard-required at the API
 * layer (route handlers reject empty reasons), but this service does NOT
 * re-validate — it trusts that a non-empty reason was already enforced.
 * The DB-level `reason text NOT NULL` will catch attempts to bypass.
 *
 * Decision #10 (REQ-003): RLS restricts read access to platform admins.
 * Org owners do not see their override history.
 */

const VALID_CHANGE_TYPES = ['resource', 'module', 'reset'];

/**
 * Append a change-log entry. Throws on DB error or invalid input.
 *
 * @param {object} supabase           - Supabase client (service role recommended)
 * @param {object} args
 * @param {string} args.orgId         - UUID of the affected organization
 * @param {string} args.changedByUserId - UUID of the platform admin making the change
 * @param {string} args.changeType    - 'resource' | 'module' | 'reset'
 * @param {string} args.field         - resource field name (e.g. 'max_agents') or module_id
 * @param {*}      [args.oldValue]    - prior value (will be stored as JSONB; null/undefined OK)
 * @param {*}      [args.newValue]    - new value (will be stored as JSONB; null/undefined OK)
 * @param {string} args.reason        - non-empty justification
 * @returns {Promise<{id: string, created_at: string}>}
 */
async function logChange(supabase, args = {}) {
    const {
        orgId,
        changedByUserId = null,
        changeType,
        field,
        oldValue = null,
        newValue = null,
        reason
    } = args;

    if (!orgId) throw new Error('orgConfigAuditService.logChange: orgId required');
    if (!changeType || !VALID_CHANGE_TYPES.includes(changeType)) {
        throw new Error(`orgConfigAuditService.logChange: changeType must be one of ${VALID_CHANGE_TYPES.join(', ')}`);
    }
    if (!field || typeof field !== 'string') {
        throw new Error('orgConfigAuditService.logChange: field required (resource field name or module_id)');
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        throw new Error('orgConfigAuditService.logChange: reason required (Decision #12 — hard-required)');
    }

    const { data, error } = await supabase
        .from('org_config_change_log')
        .insert({
            org_id: orgId,
            changed_by_user_id: changedByUserId,
            change_type: changeType,
            field,
            old_value: oldValue,
            new_value: newValue,
            reason: reason.trim()
        })
        .select('id, created_at')
        .single();

    if (error) {
        throw new Error(`orgConfigAuditService.logChange DB error: ${error.message}`);
    }
    return data;
}

/**
 * List recent change-log entries for an org. Used by the admin UI
 * history panel on admin-org-config.html.
 *
 * @param {object} supabase
 * @param {string} orgId
 * @param {object} [opts]
 * @param {number} [opts.limit=50]
 * @returns {Promise<Array>}
 */
async function listChanges(supabase, orgId, opts = {}) {
    // Negative or zero limits fall through to default; valid positives clamp to 200
    const requested = Number(opts.limit);
    const limit = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 200) : 50;
    const { data, error } = await supabase
        .from('org_config_change_log')
        .select('id, changed_by_user_id, change_type, field, old_value, new_value, reason, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw new Error(`orgConfigAuditService.listChanges failed: ${error.message}`);
    return data || [];
}

module.exports = {
    logChange,
    listChanges,
    VALID_CHANGE_TYPES
};
