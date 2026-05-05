/**
 * Effective Config Resolver Unit Tests (REQ-003)
 *
 * Covers:
 * - Tier defaults pass-through when no overrides
 * - Org module overrides win over tier defaults
 * - Org resource overrides win over tier defaults
 * - Trial overlay upgrades effective tier to 'business'
 * - Trial expiry returns to assigned tier
 * - getEffectiveModuleAccess shortcut
 * - getEffectiveResourceLimit shortcut
 * - Graceful behavior when Phase 88 tables don't exist (code 42P01)
 */

const resolver = require('../../../server/services/effectiveConfigResolver');

// ---------- Fixture data ----------

const STARTER_TIER = {
    id: 'starter', name: 'Starter',
    max_members: 3, max_clients: 0, max_agents: 5, max_workflows: 0,
    max_skills: 10, max_context_assets: 25, max_research_studios: 0,
    max_monthly_api_calls: 500, max_storage_gb: 1
};
const BUSINESS_TIER = {
    id: 'business', name: 'Business',
    max_members: 10, max_clients: 0, max_agents: 25, max_workflows: 15,
    max_skills: 50, max_context_assets: 150, max_research_studios: 5,
    max_monthly_api_calls: 3000, max_storage_gb: 10
};

const STARTER_TMA = [
    { module_id: 'chat', access_type: 'core', addon_price_monthly: null, addon_price_yearly: null, addon_description: null, resource_overrides: {} },
    { module_id: 'workflows', access_type: 'none', addon_price_monthly: null, addon_price_yearly: null, addon_description: null, resource_overrides: {} },
    { module_id: 'thought_leadership', access_type: 'optional', addon_price_monthly: 39, addon_price_yearly: 390, addon_description: 'TL', resource_overrides: {} }
];
const BUSINESS_TMA = [
    { module_id: 'chat', access_type: 'core', addon_price_monthly: null, addon_price_yearly: null, addon_description: null, resource_overrides: {} },
    { module_id: 'workflows', access_type: 'core', addon_price_monthly: null, addon_price_yearly: null, addon_description: null, resource_overrides: {} },
    { module_id: 'thought_leadership', access_type: 'core', addon_price_monthly: null, addon_price_yearly: null, addon_description: null, resource_overrides: {} }
];

// ---------- Mock Supabase chain builder ----------

function makeMockSupabase({ org, tier, tma, moduleOverrides = [], resourceOverrides = [], tableErrors = {} }) {
    const calls = [];
    const supabase = {
        from(table) {
            calls.push(table);

            const builder = {
                _table: table,
                _filters: {},
                select() { return builder; },
                eq(col, val) { builder._filters[col] = val; return builder; },
                async maybeSingle() {
                    if (tableErrors[table]) return { data: null, error: tableErrors[table] };
                    if (table === 'organizations') return { data: org, error: null };
                    if (table === 'subscription_tiers') return { data: tier, error: null };
                    if (table === 'tier_module_access') {
                        const row = (tma || []).find(r => r.module_id === builder._filters.module_id);
                        return { data: row || null, error: null };
                    }
                    if (table === 'org_module_overrides') {
                        const row = (moduleOverrides || []).find(r => r.module_id === builder._filters.module_id);
                        return { data: row || null, error: null };
                    }
                    if (table === 'org_resource_overrides') {
                        const row = (resourceOverrides || []).find(r => r.field === builder._filters.field);
                        return { data: row || null, error: null };
                    }
                    return { data: null, error: null };
                },
                async then(resolve) {
                    if (tableErrors[table]) return resolve({ data: null, error: tableErrors[table] });
                    if (table === 'tier_module_access') return resolve({ data: tma || [], error: null });
                    if (table === 'org_module_overrides') return resolve({ data: moduleOverrides || [], error: null });
                    if (table === 'org_resource_overrides') return resolve({ data: resourceOverrides || [], error: null });
                    return resolve({ data: [], error: null });
                }
            };
            return builder;
        },
        _calls: calls
    };
    return supabase;
}

// ============================================
// resolveEffectiveTierId (internal helper)
// ============================================
describe('resolveEffectiveTierId', () => {
    const { resolveEffectiveTierId } = resolver._internal;

    test('null org → tier_id null, on_trial false', () => {
        const r = resolveEffectiveTierId(null);
        expect(r).toEqual({ tier_id: null, on_trial: false, trial_expires_at: null });
    });

    test('no trial → assigned tier passes through', () => {
        const r = resolveEffectiveTierId({ subscription_tier: 'starter', trial_expires_at: null });
        expect(r.tier_id).toBe('starter');
        expect(r.on_trial).toBe(false);
    });

    test('expired trial → assigned tier passes through', () => {
        const past = new Date(Date.now() - 86400_000).toISOString();
        const r = resolveEffectiveTierId({ subscription_tier: 'starter', trial_expires_at: past });
        expect(r.tier_id).toBe('starter');
        expect(r.on_trial).toBe(false);
    });

    test('active trial → effective tier upgrades to business', () => {
        const future = new Date(Date.now() + 86400_000).toISOString();
        const r = resolveEffectiveTierId({ subscription_tier: 'starter', trial_expires_at: future });
        expect(r.tier_id).toBe('business');
        expect(r.on_trial).toBe(true);
        expect(r.trial_expires_at).toBe(future);
    });
});

// ============================================
// getEffectiveConfig
// ============================================
describe('getEffectiveConfig', () => {
    test('starter org with no overrides → tier defaults', async () => {
        const supabase = makeMockSupabase({
            org: { id: 'o1', subscription_tier: 'starter', trial_expires_at: null },
            tier: STARTER_TIER,
            tma: STARTER_TMA
        });
        const cfg = await resolver.getEffectiveConfig(supabase, 'o1');
        expect(cfg.effective_tier_id).toBe('starter');
        expect(cfg.on_trial).toBe(false);
        expect(cfg.resource_limits.max_agents).toBe(5);
        expect(cfg.modules.core).toContain('chat');
        expect(cfg.modules.excluded).toContain('workflows');
        expect(cfg.modules.optional.find(m => m.module_id === 'thought_leadership').addon_price_monthly).toBe(39);
    });

    test('active trial → effective tier becomes business + business modules apply', async () => {
        const future = new Date(Date.now() + 86400_000).toISOString();
        const supabase = makeMockSupabase({
            org: { id: 'o1', subscription_tier: 'starter', trial_expires_at: future },
            tier: BUSINESS_TIER,
            tma: BUSINESS_TMA
        });
        const cfg = await resolver.getEffectiveConfig(supabase, 'o1');
        expect(cfg.tier_id).toBe('starter');
        expect(cfg.effective_tier_id).toBe('business');
        expect(cfg.on_trial).toBe(true);
        expect(cfg.modules.core).toContain('workflows');
        expect(cfg.resource_limits.max_agents).toBe(25);
    });

    test('org resource override wins over tier default', async () => {
        const supabase = makeMockSupabase({
            org: { id: 'o1', subscription_tier: 'starter', trial_expires_at: null },
            tier: STARTER_TIER,
            tma: STARTER_TMA,
            resourceOverrides: [{ field: 'max_agents', override_value: 40, override_reason: 'enterprise discount' }]
        });
        const cfg = await resolver.getEffectiveConfig(supabase, 'o1');
        expect(cfg.resource_limits.max_agents).toBe(40);
        expect(cfg.applied_overrides.resource).toContain('max_agents');
    });

    test('org module override flips Optional to Core', async () => {
        const supabase = makeMockSupabase({
            org: { id: 'o1', subscription_tier: 'starter', trial_expires_at: null },
            tier: STARTER_TIER,
            tma: STARTER_TMA,
            moduleOverrides: [{ module_id: 'thought_leadership', access_type: 'core', resource_overrides: {}, override_reason: 'comp' }]
        });
        const cfg = await resolver.getEffectiveConfig(supabase, 'o1');
        expect(cfg.modules.core).toContain('thought_leadership');
        expect(cfg.modules.optional.find(m => m.module_id === 'thought_leadership')).toBeUndefined();
        expect(cfg.applied_overrides.module).toContain('thought_leadership');
    });

    test('Phase 88 tables missing (42P01) → no overrides applied, no error', async () => {
        const supabase = makeMockSupabase({
            org: { id: 'o1', subscription_tier: 'starter', trial_expires_at: null },
            tier: STARTER_TIER,
            tma: STARTER_TMA,
            tableErrors: {
                org_module_overrides: { code: '42P01', message: 'relation "org_module_overrides" does not exist' },
                org_resource_overrides: { code: '42P01', message: 'relation "org_resource_overrides" does not exist' }
            }
        });
        const cfg = await resolver.getEffectiveConfig(supabase, 'o1');
        expect(cfg.applied_overrides.resource).toEqual([]);
        expect(cfg.applied_overrides.module).toEqual([]);
        expect(cfg.modules.core).toContain('chat');
    });

    test('throws if org not found', async () => {
        const supabase = makeMockSupabase({ org: null, tier: STARTER_TIER, tma: [] });
        await expect(resolver.getEffectiveConfig(supabase, 'missing')).rejects.toThrow(/not found/);
    });
});

// ============================================
// getEffectiveResourceLimit
// ============================================
describe('getEffectiveResourceLimit', () => {
    test('returns tier default when no override', async () => {
        const supabase = makeMockSupabase({
            org: { id: 'o1', subscription_tier: 'starter', trial_expires_at: null },
            tier: STARTER_TIER,
            tma: []
        });
        const r = await resolver.getEffectiveResourceLimit(supabase, 'o1', 'max_agents');
        expect(r).toEqual({ value: 5, source: 'tier' });
    });

    test('returns override when present', async () => {
        const supabase = makeMockSupabase({
            org: { id: 'o1', subscription_tier: 'starter', trial_expires_at: null },
            tier: STARTER_TIER,
            tma: [],
            resourceOverrides: [{ field: 'max_agents', override_value: 99, override_reason: 'x' }]
        });
        const r = await resolver.getEffectiveResourceLimit(supabase, 'o1', 'max_agents');
        expect(r).toEqual({ value: 99, source: 'org_override' });
    });

    test('rejects unknown field', async () => {
        const supabase = makeMockSupabase({ org: {}, tier: STARTER_TIER, tma: [] });
        await expect(resolver.getEffectiveResourceLimit(supabase, 'o1', 'bogus_field'))
            .rejects.toThrow(/unknown field/);
    });
});

// ============================================
// getEffectiveModuleAccess
// ============================================
describe('getEffectiveModuleAccess', () => {
    test('returns tier default when no override', async () => {
        const supabase = makeMockSupabase({
            org: { id: 'o1', subscription_tier: 'starter', trial_expires_at: null },
            tier: STARTER_TIER,
            tma: STARTER_TMA
        });
        const r = await resolver.getEffectiveModuleAccess(supabase, 'o1', 'chat');
        expect(r.access_type).toBe('core');
        expect(r.source).toBe('tier');
    });

    test('returns "none" when module not in tier_module_access', async () => {
        const supabase = makeMockSupabase({
            org: { id: 'o1', subscription_tier: 'starter', trial_expires_at: null },
            tier: STARTER_TIER,
            tma: []
        });
        const r = await resolver.getEffectiveModuleAccess(supabase, 'o1', 'unknown_module');
        expect(r.access_type).toBe('none');
    });

    test('org override wins over tier default', async () => {
        const supabase = makeMockSupabase({
            org: { id: 'o1', subscription_tier: 'starter', trial_expires_at: null },
            tier: STARTER_TIER,
            tma: STARTER_TMA,
            moduleOverrides: [{ module_id: 'workflows', access_type: 'core', resource_overrides: {}, override_reason: 'r' }]
        });
        const r = await resolver.getEffectiveModuleAccess(supabase, 'o1', 'workflows');
        expect(r.access_type).toBe('core');
        expect(r.source).toBe('org_override');
    });
});
