/**
 * INSIGHT 360 - Website Sync Service
 * Version: 1.0.0
 * Phase: 87 (REQ-003)
 *
 * Builds the canonical pricing-tiers.json payload that the synergi-website
 * marketing site consumes. The payload is a snapshot of the four public
 * tiers (subscription_tiers WHERE is_public=TRUE) plus their per-tier
 * module access matrix (tier_module_access) plus the metadata for every
 * referenced module (platform_modules).
 *
 * ============================================================
 * CRITICAL — ORG ISOLATION INVARIANT
 * ============================================================
 * This service produces PUBLIC marketing data. Per Decision #10
 * (REQ-003), per-org configuration overrides MUST NEVER appear in
 * the synced payload — they are private to the platform admin.
 *
 * The invariant is enforced three ways:
 *   1. We only query subscription_tiers + tier_module_access +
 *      platform_modules. We NEVER query organizations,
 *      org_module_overrides, or org_resource_overrides.
 *   2. assertNoOrgTablesInQuery() runtime guard scans every SQL
 *      string this service constructs and throws if a forbidden
 *      table name appears. This catches future regressions.
 *   3. validatePayload() Zod schema rejects any payload containing
 *      keys named org_id, org_overrides, or organization.
 *
 * If you add a new query to this service, the assertion will scan it.
 * If you legitimately need org data, this is the wrong service —
 * use effectiveConfigResolver instead.
 * ============================================================
 */

const crypto = require('crypto');
const { z } = require('zod');

const PAYLOAD_SCHEMA_VERSION = 1;

const FORBIDDEN_TABLES = ['organizations', 'org_module_overrides', 'org_resource_overrides', 'org_config_change_log'];

// ============================================
// Org-isolation runtime guard
// ============================================

/**
 * Throws if any forbidden table name appears as a word in the SQL string.
 * Called at the top of every query method in this service.
 *
 * @param {string} sql - The SQL or PostgREST resource path being executed
 * @throws {Error} if a forbidden table name is present
 */
function assertNoOrgTablesInQuery(sql) {
    if (typeof sql !== 'string' || sql.length === 0) return;
    for (const t of FORBIDDEN_TABLES) {
        // Word-boundary match so a column called "organization_name" doesn't false-positive,
        // but the table name "organizations" does match.
        const pattern = new RegExp(`\\b${t}\\b`, 'i');
        if (pattern.test(sql)) {
            throw new Error(
                `websiteSyncService.assertNoOrgTablesInQuery: forbidden table "${t}" referenced. ` +
                `This service must not read org-level data. Use effectiveConfigResolver instead.`
            );
        }
    }
}

// ============================================
// Zod payload schema
// ============================================

const TierModuleEntrySchema = z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string().nullable(),
    nav_group: z.string().nullable(),
    addon_price_monthly: z.number().nullable().optional(),
    addon_price_yearly: z.number().nullable().optional(),
    addon_description: z.string().nullable().optional(),
    resource_overrides: z.record(z.any()).optional()
});

const TierSchema = z.object({
    id: z.string(),
    name: z.string(),
    tagline: z.string().nullable(),
    target_customer: z.string().nullable(),
    tier_group: z.string().nullable(),
    display_order: z.number(),
    is_featured: z.boolean(),
    price_monthly: z.number().nullable(),
    price_yearly: z.number().nullable(),
    cta_label: z.string(),
    cta_url: z.string().nullable(),
    limits: z.record(z.number().nullable()),
    features: z.record(z.any()),
    feature_highlights: z.array(z.string()),
    modules: z.object({
        core: z.array(TierModuleEntrySchema),
        optional: z.array(TierModuleEntrySchema)
    })
});

const ComparisonCellSchema = z.object({
    access: z.enum(['core', 'optional', 'none']),
    addon_price_monthly: z.number().nullable().optional(),
    note: z.string().nullable().optional()
});

const ComparisonModuleSchema = z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string().nullable(),
    tiers: z.record(ComparisonCellSchema)
});

const ComparisonGroupSchema = z.object({
    id: z.string(),
    label: z.string(),
    modules: z.array(ComparisonModuleSchema)
});

const PayloadSchema = z.object({
    schema_version: z.literal(PAYLOAD_SCHEMA_VERSION),
    generated_at: z.string(),
    generated_by: z.string().nullable(),
    tiers: z.array(TierSchema),
    modules_meta: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().nullable(),
        icon: z.string().nullable(),
        nav_group: z.string().nullable(),
        category: z.string().nullable()
    })),
    comparison: z.object({
        groups: z.array(ComparisonGroupSchema)
    })
}).strict();

// Sanity check: payload must not contain forbidden keys at any nesting depth
function assertNoForbiddenKeys(value, path = '$') {
    const forbidden = ['org_id', 'org_overrides', 'organization', 'organizations'];
    if (Array.isArray(value)) {
        value.forEach((v, i) => assertNoForbiddenKeys(v, `${path}[${i}]`));
    } else if (value && typeof value === 'object') {
        for (const k of Object.keys(value)) {
            if (forbidden.includes(k)) {
                throw new Error(`websiteSyncService payload contains forbidden key "${k}" at ${path}.${k}`);
            }
            assertNoForbiddenKeys(value[k], `${path}.${k}`);
        }
    }
}

/**
 * Validate the payload against the Zod schema and the no-forbidden-keys rule.
 * Throws ZodError with details on validation failure.
 *
 * @param {object} payload
 */
function validatePayload(payload) {
    PayloadSchema.parse(payload);
    assertNoForbiddenKeys(payload);
}

// ============================================
// Data loaders (each calls assertNoOrgTablesInQuery)
// ============================================

const TIERS_QUERY = 'subscription_tiers';
const TMA_QUERY = 'tier_module_access';
const MODULES_QUERY = 'platform_modules';

async function loadPublicTiers(supabase) {
    assertNoOrgTablesInQuery(TIERS_QUERY);
    const { data, error } = await supabase
        .from(TIERS_QUERY)
        .select('id, name, description, tagline, target_customer, tier_group, display_order, is_featured, is_public, price_monthly, price_yearly, cta_label, cta_url, max_members, max_clients, max_agents, max_workflows, max_skills, max_context_assets, max_research_studios, max_monthly_api_calls, max_storage_gb, features, feature_highlights')
        .eq('is_public', true)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

    if (error) throw new Error(`loadPublicTiers failed: ${error.message}`);
    return data || [];
}

async function loadTierModuleMatrix(supabase) {
    assertNoOrgTablesInQuery(TMA_QUERY);
    const { data, error } = await supabase
        .from(TMA_QUERY)
        .select('tier_id, module_id, access_type, addon_price_monthly, addon_price_yearly, addon_description, resource_overrides, display_order_override');

    if (error) throw new Error(`loadTierModuleMatrix failed: ${error.message}`);
    return data || [];
}

async function loadActiveModules(supabase) {
    assertNoOrgTablesInQuery(MODULES_QUERY);
    const { data, error } = await supabase
        .from(MODULES_QUERY)
        .select('id, name, description, icon, nav_group, category, display_order, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

    if (error) throw new Error(`loadActiveModules failed: ${error.message}`);
    return data || [];
}

// ============================================
// Payload builder
// ============================================

/**
 * Build the canonical pricing-tiers.json payload.
 *
 * @param {object} supabase  - Supabase client (service role recommended for sync queries)
 * @param {object} [opts]
 * @param {string} [opts.generatedBy] - Email or identifier of the user triggering the sync
 * @returns {Promise<{ payload: object, sha256: string }>}
 */
async function buildPricingPayload(supabase, opts = {}) {
    const [tiers, matrix, modules] = await Promise.all([
        loadPublicTiers(supabase),
        loadTierModuleMatrix(supabase),
        loadActiveModules(supabase)
    ]);

    const moduleById = new Map(modules.map(m => [m.id, m]));

    // Group matrix rows by tier_id for fast per-tier lookup
    const matrixByTier = new Map();
    for (const row of matrix) {
        if (!matrixByTier.has(row.tier_id)) matrixByTier.set(row.tier_id, []);
        matrixByTier.get(row.tier_id).push(row);
    }

    // Build per-tier sections
    const tierEntries = tiers.map(t => {
        const tierMatrix = matrixByTier.get(t.id) || [];

        const core = [];
        const optional = [];
        for (const cell of tierMatrix) {
            const m = moduleById.get(cell.module_id);
            if (!m) continue;  // Module no longer active — skip for public output

            const entry = {
                id: m.id,
                name: m.name,
                icon: m.icon,
                nav_group: m.nav_group
            };

            if (cell.access_type === 'core') {
                core.push(entry);
            } else if (cell.access_type === 'optional') {
                optional.push({
                    ...entry,
                    addon_price_monthly: cell.addon_price_monthly !== null ? Number(cell.addon_price_monthly) : null,
                    addon_price_yearly: cell.addon_price_yearly !== null ? Number(cell.addon_price_yearly) : null,
                    addon_description: cell.addon_description,
                    resource_overrides: cell.resource_overrides || {}
                });
            }
            // 'none' rows are not surfaced in the per-tier section (only in comparison)
        }

        return {
            id: t.id,
            name: t.name,
            tagline: t.tagline,
            target_customer: t.target_customer,
            tier_group: t.tier_group,
            display_order: t.display_order,
            is_featured: !!t.is_featured,
            price_monthly: t.price_monthly !== null ? Number(t.price_monthly) : null,
            price_yearly: t.price_yearly !== null ? Number(t.price_yearly) : null,
            cta_label: t.cta_label || 'Get Started',
            cta_url: t.cta_url,
            limits: {
                max_members: t.max_members,
                max_clients: t.max_clients,
                max_agents: t.max_agents,
                max_workflows: t.max_workflows,
                max_skills: t.max_skills,
                max_context_assets: t.max_context_assets,
                max_research_studios: t.max_research_studios,
                max_monthly_api_calls: t.max_monthly_api_calls,
                max_storage_gb: t.max_storage_gb !== null ? Number(t.max_storage_gb) : null
            },
            features: t.features || {},
            feature_highlights: Array.isArray(t.feature_highlights) ? t.feature_highlights : [],
            modules: { core, optional }
        };
    });

    // Build comparison matrix (groups → modules → per-tier cells)
    const groupsMap = new Map();  // nav_group → { id, label, modules: [] }
    const tiersById = new Map(tiers.map(t => [t.id, t]));

    for (const m of modules) {
        const groupId = m.nav_group || 'other';
        if (!groupsMap.has(groupId)) {
            groupsMap.set(groupId, { id: groupId, label: navGroupLabel(groupId), modules: [] });
        }
        const cellsByTier = {};
        for (const t of tiers) {
            const cell = (matrixByTier.get(t.id) || []).find(c => c.module_id === m.id);
            if (!cell) {
                cellsByTier[t.id] = { access: 'none' };
                continue;
            }
            const entry = { access: cell.access_type };
            if (cell.access_type === 'optional') {
                entry.addon_price_monthly = cell.addon_price_monthly !== null ? Number(cell.addon_price_monthly) : null;
                if (cell.addon_description) entry.note = cell.addon_description;
            }
            cellsByTier[t.id] = entry;
        }
        groupsMap.get(groupId).modules.push({
            id: m.id,
            name: m.name,
            icon: m.icon,
            tiers: cellsByTier
        });
    }

    const comparisonGroups = Array.from(groupsMap.values());

    // Build modules_meta (lightweight — just what the comparison table renderer needs)
    const modulesMeta = modules.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        icon: m.icon,
        nav_group: m.nav_group,
        category: m.category
    }));

    const payload = {
        schema_version: PAYLOAD_SCHEMA_VERSION,
        generated_at: new Date().toISOString(),
        generated_by: opts.generatedBy || null,
        tiers: tierEntries,
        modules_meta: modulesMeta,
        comparison: { groups: comparisonGroups }
    };

    // Validate before returning. Throws on failure — caller handles.
    validatePayload(payload);

    const sha256 = computeSha256(payload);
    return { payload, sha256 };
}

/**
 * Compute deterministic SHA-256 of a payload. Used for sync idempotency:
 * if the new payload hashes to the most recent pricing_sync_history row,
 * the sync route short-circuits with status='skipped'.
 *
 * Note: we strip generated_at and generated_by before hashing because
 * those fields change on every build but don't represent real changes.
 *
 * @param {object} payload
 * @returns {string} hex sha-256
 */
function computeSha256(payload) {
    const { generated_at, generated_by, ...stable } = payload;
    const json = stableStringify(stable);
    return crypto.createHash('sha256').update(json).digest('hex');
}

/**
 * Deterministic JSON.stringify with sorted object keys at every depth.
 * Required for hash stability — JS objects don't guarantee key order.
 */
function stableStringify(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) {
        return '[' + value.map(stableStringify).join(',') + ']';
    }
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

/**
 * Friendly label for a nav_group ID. Mirrors the labels the navigation
 * sidebar uses so the marketing comparison table reads consistently.
 */
function navGroupLabel(navGroup) {
    const labels = {
        'primary': 'Core Platform',
        'ai-systems': 'AI Systems',
        'systems': 'AI Systems',
        'dashboards': 'Dashboards',
        'modules': 'Modules',
        'tools': 'Tools',
        'components': 'Components',
        'agency': 'Agency Tools',
        'admin': 'Administration',
        'other': 'Other'
    };
    return labels[navGroup] || (navGroup || 'Other');
}

module.exports = {
    buildPricingPayload,
    computeSha256,
    validatePayload,
    assertNoOrgTablesInQuery,
    PAYLOAD_SCHEMA_VERSION,
    FORBIDDEN_TABLES,
    // Internals exposed for unit tests
    _internal: {
        stableStringify,
        navGroupLabel,
        loadPublicTiers,
        loadTierModuleMatrix,
        loadActiveModules
    }
};
