/**
 * INSIGHT 360 - Effective Config Resolver
 * Version: 1.0.0
 * Phase: 87/88 (REQ-003)
 *
 * Resolves the *effective* configuration for an organization by merging
 * three layers in order of precedence (lowest first):
 *
 *   1. Tier defaults    — subscription_tiers + tier_module_access
 *   2. Org overrides    — org_module_overrides + org_resource_overrides (Phase 88)
 *   3. Trial overlay    — if organizations.trial_expires_at > NOW(), the
 *                         effective tier is upgraded to 'business' for
 *                         resource limits AND tier_module_access lookup
 *
 * This is the ONLY path runtime access checks should use. Direct reads
 * of subscription_tiers or platform_modules.min_tier bypass overrides
 * and are bugs — replace them with calls to the helpers below.
 *
 * IMPORTANT: This resolver intentionally exposes org-level data. It MUST
 * NOT be used by websiteSyncService (which serves the public marketing
 * site). The sync service queries subscription_tiers + tier_module_access
 * directly with no org joins.
 */

const RESOURCE_FIELDS = [
    'max_members', 'max_agents', 'max_workflows', 'max_skills',
    'max_context_assets', 'max_research_studios',
    'max_monthly_api_calls', 'max_storage_gb', 'max_clients'
];

const TRIAL_OVERLAY_TIER = 'business';

/**
 * Internal: load an organization's row including tier_id and trial info.
 * Returns null if the org doesn't exist.
 */
async function loadOrg(supabase, orgId) {
    const { data, error } = await supabase
        .from('organizations')
        .select('id, subscription_tier, trial_started_at, trial_expires_at')
        .eq('id', orgId)
        .maybeSingle();

    if (error) throw new Error(`loadOrg(${orgId}) failed: ${error.message}`);
    return data;
}

/**
 * Internal: determine the effective tier_id given an org row.
 * Returns { tier_id, on_trial, trial_expires_at } where tier_id is the
 * trial-overlaid tier if the trial is active, otherwise the assigned tier.
 */
function resolveEffectiveTierId(org) {
    if (!org) return { tier_id: null, on_trial: false, trial_expires_at: null };

    const onTrial = org.trial_expires_at
        && new Date(org.trial_expires_at).getTime() > Date.now();

    return {
        tier_id: onTrial ? TRIAL_OVERLAY_TIER : org.subscription_tier,
        on_trial: !!onTrial,
        trial_expires_at: org.trial_expires_at || null
    };
}

/**
 * Internal: load a tier row by id. Returns the full tier including
 * resource limits and features. Throws if not found.
 */
async function loadTier(supabase, tierId) {
    const { data, error } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('id', tierId)
        .maybeSingle();

    if (error) throw new Error(`loadTier(${tierId}) failed: ${error.message}`);
    if (!data) throw new Error(`loadTier(${tierId}) not found`);
    return data;
}

/**
 * Internal: load all tier_module_access rows for a tier.
 * Returns array of { module_id, access_type, addon_price_monthly,
 *   addon_price_yearly, addon_description, resource_overrides }.
 */
async function loadTierModuleAccess(supabase, tierId) {
    const { data, error } = await supabase
        .from('tier_module_access')
        .select('module_id, access_type, addon_price_monthly, addon_price_yearly, addon_description, resource_overrides, display_order_override')
        .eq('tier_id', tierId);

    if (error) throw new Error(`loadTierModuleAccess(${tierId}) failed: ${error.message}`);
    return data || [];
}

/**
 * Internal: load org-level module overrides (Phase 88).
 * Returns array of { module_id, access_type, resource_overrides, override_reason }.
 * Returns [] if the table doesn't exist (Phase 88 not yet applied).
 */
async function loadOrgModuleOverrides(supabase, orgId) {
    const { data, error } = await supabase
        .from('org_module_overrides')
        .select('module_id, access_type, resource_overrides, override_reason')
        .eq('org_id', orgId);

    if (error) {
        // Treat "relation does not exist" as no-overrides (Phase 88 not applied)
        if (error.code === '42P01') return [];
        throw new Error(`loadOrgModuleOverrides(${orgId}) failed: ${error.message}`);
    }
    return data || [];
}

/**
 * Internal: load org-level resource overrides (Phase 88).
 * Returns array of { field, override_value, override_reason }.
 * Returns [] if the table doesn't exist.
 */
async function loadOrgResourceOverrides(supabase, orgId) {
    const { data, error } = await supabase
        .from('org_resource_overrides')
        .select('field, override_value, override_reason')
        .eq('org_id', orgId);

    if (error) {
        if (error.code === '42P01') return [];
        throw new Error(`loadOrgResourceOverrides(${orgId}) failed: ${error.message}`);
    }
    return data || [];
}

/**
 * Get the full effective configuration for an org.
 *
 * @param {object} supabase - Supabase client (service role or authenticated)
 * @param {string} orgId    - UUID of the organization
 * @returns {Promise<{
 *   tier_id: string,
 *   effective_tier_id: string,
 *   on_trial: boolean,
 *   trial_expires_at: string|null,
 *   resource_limits: Record<string, number>,
 *   modules: { core: string[], optional: object[], excluded: string[] },
 *   applied_overrides: { resource: string[], module: string[] }
 * }>}
 */
async function getEffectiveConfig(supabase, orgId) {
    const org = await loadOrg(supabase, orgId);
    if (!org) throw new Error(`getEffectiveConfig: org ${orgId} not found`);

    const { tier_id: effectiveTierId, on_trial, trial_expires_at } = resolveEffectiveTierId(org);

    const [tier, tierModules, orgModuleOverrides, orgResourceOverrides] = await Promise.all([
        loadTier(supabase, effectiveTierId),
        loadTierModuleAccess(supabase, effectiveTierId),
        loadOrgModuleOverrides(supabase, orgId),
        loadOrgResourceOverrides(supabase, orgId)
    ]);

    // Build resource limits: tier defaults, then apply org overrides
    const resourceLimits = {};
    const overriddenResourceFields = [];
    for (const field of RESOURCE_FIELDS) {
        resourceLimits[field] = tier[field] ?? null;
    }
    for (const ov of orgResourceOverrides) {
        if (RESOURCE_FIELDS.includes(ov.field)) {
            resourceLimits[ov.field] = ov.override_value;
            overriddenResourceFields.push(ov.field);
        }
    }

    // Build module access: tier defaults indexed by module_id, then apply org overrides
    const moduleByid = new Map();
    for (const tm of tierModules) {
        moduleByid.set(tm.module_id, {
            module_id: tm.module_id,
            access_type: tm.access_type,
            addon_price_monthly: tm.addon_price_monthly,
            addon_price_yearly: tm.addon_price_yearly,
            addon_description: tm.addon_description,
            resource_overrides: tm.resource_overrides || {},
            source: 'tier'
        });
    }

    const overriddenModuleIds = [];
    for (const ov of orgModuleOverrides) {
        const existing = moduleByid.get(ov.module_id) || {
            module_id: ov.module_id,
            addon_price_monthly: null,
            addon_price_yearly: null,
            addon_description: null
        };
        moduleByid.set(ov.module_id, {
            ...existing,
            access_type: ov.access_type,
            resource_overrides: ov.resource_overrides || existing.resource_overrides || {},
            source: 'org_override'
        });
        overriddenModuleIds.push(ov.module_id);
    }

    const modules = { core: [], optional: [], excluded: [] };
    for (const m of moduleByid.values()) {
        if (m.access_type === 'core') modules.core.push(m.module_id);
        else if (m.access_type === 'optional') {
            modules.optional.push({
                module_id: m.module_id,
                addon_price_monthly: m.addon_price_monthly,
                addon_price_yearly: m.addon_price_yearly,
                addon_description: m.addon_description,
                resource_overrides: m.resource_overrides
            });
        } else if (m.access_type === 'none') {
            modules.excluded.push(m.module_id);
        }
    }

    return {
        tier_id: org.subscription_tier,
        effective_tier_id: effectiveTierId,
        on_trial,
        trial_expires_at,
        resource_limits: resourceLimits,
        modules,
        applied_overrides: {
            resource: overriddenResourceFields,
            module: overriddenModuleIds
        }
    };
}

/**
 * Get the effective access type for a single (org, module) pair.
 * Faster than getEffectiveConfig when you only need one module's status.
 *
 * @returns {Promise<{ access_type: 'core'|'optional'|'none', source: 'tier'|'org_override',
 *   addon_price_monthly: number|null, resource_overrides: object }>}
 */
async function getEffectiveModuleAccess(supabase, orgId, moduleId) {
    const org = await loadOrg(supabase, orgId);
    if (!org) throw new Error(`getEffectiveModuleAccess: org ${orgId} not found`);

    const { tier_id: effectiveTierId } = resolveEffectiveTierId(org);

    // Check org override first (it wins if present)
    const { data: ovRow, error: ovErr } = await supabase
        .from('org_module_overrides')
        .select('access_type, resource_overrides')
        .eq('org_id', orgId)
        .eq('module_id', moduleId)
        .maybeSingle();

    if (ovErr && ovErr.code !== '42P01') {
        throw new Error(`getEffectiveModuleAccess(${orgId}, ${moduleId}) override read failed: ${ovErr.message}`);
    }

    if (ovRow) {
        return {
            access_type: ovRow.access_type,
            source: 'org_override',
            addon_price_monthly: null,  // org overrides don't carry pricing
            resource_overrides: ovRow.resource_overrides || {}
        };
    }

    // Fall back to tier default
    const { data: tierRow, error: tierErr } = await supabase
        .from('tier_module_access')
        .select('access_type, addon_price_monthly, resource_overrides')
        .eq('tier_id', effectiveTierId)
        .eq('module_id', moduleId)
        .maybeSingle();

    if (tierErr) throw new Error(`getEffectiveModuleAccess(${orgId}, ${moduleId}) tier read failed: ${tierErr.message}`);

    if (!tierRow) {
        // Module has no row in tier_module_access for this tier — treat as 'none'
        return {
            access_type: 'none',
            source: 'tier',
            addon_price_monthly: null,
            resource_overrides: {}
        };
    }

    return {
        access_type: tierRow.access_type,
        source: 'tier',
        addon_price_monthly: tierRow.addon_price_monthly,
        resource_overrides: tierRow.resource_overrides || {}
    };
}

/**
 * Get the effective resource limit for a single (org, field) pair.
 *
 * @returns {Promise<{ value: number, source: 'tier'|'org_override' }>}
 */
async function getEffectiveResourceLimit(supabase, orgId, field) {
    if (!RESOURCE_FIELDS.includes(field)) {
        throw new Error(`getEffectiveResourceLimit: unknown field "${field}". Allowed: ${RESOURCE_FIELDS.join(', ')}`);
    }

    const org = await loadOrg(supabase, orgId);
    if (!org) throw new Error(`getEffectiveResourceLimit: org ${orgId} not found`);

    // Check org override first
    const { data: ovRow, error: ovErr } = await supabase
        .from('org_resource_overrides')
        .select('override_value')
        .eq('org_id', orgId)
        .eq('field', field)
        .maybeSingle();

    if (ovErr && ovErr.code !== '42P01') {
        throw new Error(`getEffectiveResourceLimit override read failed: ${ovErr.message}`);
    }

    if (ovRow) {
        return { value: ovRow.override_value, source: 'org_override' };
    }

    // Fall back to (trial-overlaid) tier default
    const { tier_id: effectiveTierId } = resolveEffectiveTierId(org);
    const tier = await loadTier(supabase, effectiveTierId);
    return { value: tier[field], source: 'tier' };
}

module.exports = {
    getEffectiveConfig,
    getEffectiveModuleAccess,
    getEffectiveResourceLimit,
    // Exposed for testing
    _internal: {
        resolveEffectiveTierId,
        RESOURCE_FIELDS,
        TRIAL_OVERLAY_TIER
    }
};
