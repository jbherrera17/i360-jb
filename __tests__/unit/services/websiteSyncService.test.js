/**
 * Website Sync Service Unit Tests (REQ-003)
 *
 * Covers:
 * - buildPricingPayload assembles tiers + matrix + comparison correctly
 * - Inactive modules excluded from per-tier sections
 * - Optional cells include addon pricing
 * - Validation passes for well-formed payload
 * - Validation rejects forbidden keys
 * - SHA-256 is stable across builds with the same data (idempotency)
 * - SHA-256 ignores generated_at / generated_by (those change every build)
 *
 * Org-isolation invariant tests live in websiteSyncService.orgIsolation.test.js.
 */

const sync = require('../../../server/services/websiteSyncService');

// ---------- Fixtures ----------

const TIERS = [
    { id: 'starter', name: 'Starter', tagline: 'For individuals', target_customer: 'Solos', tier_group: 'standard',
      display_order: 1, is_featured: false, is_public: true, price_monthly: 49, price_yearly: 490,
      cta_label: 'Try', cta_url: 'https://x', max_members: 3, max_clients: 0, max_agents: 5, max_workflows: 0,
      max_skills: 10, max_context_assets: 25, max_research_studios: 0, max_monthly_api_calls: 500, max_storage_gb: 1,
      features: { sso: false }, feature_highlights: ['Multi-LLM chat', 'Up to 5 agents'] },
    { id: 'business', name: 'Business', tagline: 'For growing teams', target_customer: 'SMB', tier_group: 'standard',
      display_order: 2, is_featured: true, is_public: true, price_monthly: 249, price_yearly: 2490,
      cta_label: 'Try', cta_url: 'https://y', max_members: 10, max_clients: 0, max_agents: 25, max_workflows: 15,
      max_skills: 50, max_context_assets: 150, max_research_studios: 5, max_monthly_api_calls: 3000, max_storage_gb: 10,
      features: { sso: false }, feature_highlights: ['Strategy 120', 'Research Studio'] }
];

const MATRIX = [
    { tier_id: 'starter', module_id: 'chat', access_type: 'core', addon_price_monthly: null, addon_price_yearly: null, addon_description: null, resource_overrides: {} },
    { tier_id: 'starter', module_id: 'workflows', access_type: 'none', addon_price_monthly: null, addon_price_yearly: null, addon_description: null, resource_overrides: {} },
    { tier_id: 'starter', module_id: 'thought_leadership', access_type: 'optional', addon_price_monthly: 39, addon_price_yearly: 390, addon_description: '4 articles/mo', resource_overrides: {} },
    { tier_id: 'business', module_id: 'chat', access_type: 'core', addon_price_monthly: null, addon_price_yearly: null, addon_description: null, resource_overrides: {} },
    { tier_id: 'business', module_id: 'workflows', access_type: 'core', addon_price_monthly: null, addon_price_yearly: null, addon_description: null, resource_overrides: {} },
    { tier_id: 'business', module_id: 'thought_leadership', access_type: 'core', addon_price_monthly: null, addon_price_yearly: null, addon_description: null, resource_overrides: {} }
];

const MODULES = [
    { id: 'chat', name: 'Chat', description: 'AI chat', icon: 'message', nav_group: 'primary', category: 'system', is_active: true },
    { id: 'workflows', name: 'Workflows', description: 'Automation', icon: 'git-branch', nav_group: 'tools', category: 'tool', is_active: true },
    { id: 'thought_leadership', name: 'Thought Leadership', description: 'TL', icon: 'edit-3', nav_group: 'modules', category: 'tool', is_active: true }
];

function makeSupabase({ tiers = TIERS, matrix = MATRIX, modules = MODULES } = {}) {
    return {
        from(table) {
            const builder = {
                _filters: {},
                _orderField: null,
                select() { return builder; },
                eq(col, val) { builder._filters[col] = val; return builder; },
                order() { return builder; },
                async then(resolve) {
                    if (table === 'subscription_tiers') {
                        const filtered = tiers.filter(t =>
                            (builder._filters.is_public === undefined || t.is_public === builder._filters.is_public) &&
                            (builder._filters.is_active === undefined || true)
                        );
                        return resolve({ data: filtered, error: null });
                    }
                    if (table === 'tier_module_access') {
                        return resolve({ data: matrix, error: null });
                    }
                    if (table === 'platform_modules') {
                        return resolve({ data: modules.filter(m => m.is_active), error: null });
                    }
                    return resolve({ data: [], error: null });
                }
            };
            return builder;
        }
    };
}

// ============================================
// buildPricingPayload
// ============================================
describe('buildPricingPayload', () => {
    test('produces well-formed payload with two tiers', async () => {
        const supabase = makeSupabase();
        const { payload, sha256 } = await sync.buildPricingPayload(supabase, { generatedBy: 'jb@x' });

        expect(payload.schema_version).toBe(1);
        expect(payload.generated_by).toBe('jb@x');
        expect(payload.tiers).toHaveLength(2);
        expect(payload.tiers.find(t => t.id === 'business').is_featured).toBe(true);
        expect(typeof sha256).toBe('string');
        expect(sha256).toHaveLength(64);
    });

    test('Starter tier has chat in core, TL in optional, workflows excluded', async () => {
        const supabase = makeSupabase();
        const { payload } = await sync.buildPricingPayload(supabase);
        const starter = payload.tiers.find(t => t.id === 'starter');
        expect(starter.modules.core.map(m => m.id)).toContain('chat');
        expect(starter.modules.optional.find(m => m.id === 'thought_leadership').addon_price_monthly).toBe(39);
        expect(starter.modules.core.map(m => m.id)).not.toContain('workflows');
    });

    test('comparison matrix has cells for every (tier, module) pair', async () => {
        const supabase = makeSupabase();
        const { payload } = await sync.buildPricingPayload(supabase);
        const allCells = payload.comparison.groups.flatMap(g => g.modules.flatMap(m => Object.entries(m.tiers)));
        // 3 modules × 2 tiers = 6 cells
        expect(allCells).toHaveLength(6);
    });

    test('inactive modules are filtered out', async () => {
        const modules = [...MODULES, { id: 'old', name: 'Old', description: '', icon: null, nav_group: 'tools', category: 'tool', is_active: false }];
        const supabase = makeSupabase({ modules });
        const { payload } = await sync.buildPricingPayload(supabase);
        expect(payload.modules_meta.find(m => m.id === 'old')).toBeUndefined();
    });
});

// ============================================
// SHA-256 / idempotency
// ============================================
describe('computeSha256', () => {
    test('is stable across two builds with the same data (different timestamps)', async () => {
        // Project setup uses jest.useFakeTimers() globally — opt this test into
        // real timers so setTimeout fires and Date.now() actually advances.
        jest.useRealTimers();
        try {
            const supabase = makeSupabase();
            const a = await sync.buildPricingPayload(supabase);
            await new Promise(r => setTimeout(r, 10));
            const b = await sync.buildPricingPayload(supabase);
            expect(a.payload.generated_at).not.toBe(b.payload.generated_at);
            expect(a.sha256).toBe(b.sha256);
        } finally {
            jest.useFakeTimers();
        }
    });

    test('changes when a tier price changes', async () => {
        const a = await sync.buildPricingPayload(makeSupabase());
        const tweakedTiers = TIERS.map(t => t.id === 'business' ? { ...t, price_monthly: 299 } : t);
        const b = await sync.buildPricingPayload(makeSupabase({ tiers: tweakedTiers }));
        expect(a.sha256).not.toBe(b.sha256);
    });

    test('stableStringify sorts object keys deterministically', () => {
        const { stableStringify } = sync._internal;
        const a = stableStringify({ b: 1, a: 2 });
        const b = stableStringify({ a: 2, b: 1 });
        expect(a).toBe(b);
        expect(a).toBe('{"a":2,"b":1}');
    });
});

// ============================================
// validatePayload
// ============================================
describe('validatePayload', () => {
    test('passes for a well-formed payload', async () => {
        const supabase = makeSupabase();
        const { payload } = await sync.buildPricingPayload(supabase);
        expect(() => sync.validatePayload(payload)).not.toThrow();
    });

    test('rejects payload with wrong schema_version', async () => {
        const supabase = makeSupabase();
        const { payload } = await sync.buildPricingPayload(supabase);
        payload.schema_version = 999;
        expect(() => sync.validatePayload(payload)).toThrow();
    });

    test('rejects payload with extra unexpected top-level key', async () => {
        const supabase = makeSupabase();
        const { payload } = await sync.buildPricingPayload(supabase);
        payload.extra_field = 'oops';
        expect(() => sync.validatePayload(payload)).toThrow();
    });
});

// ============================================
// navGroupLabel
// ============================================
describe('navGroupLabel', () => {
    const { navGroupLabel } = sync._internal;
    test('known groups get friendly labels', () => {
        expect(navGroupLabel('primary')).toBe('Core Platform');
        expect(navGroupLabel('ai-systems')).toBe('AI Systems');
        expect(navGroupLabel('agency')).toBe('Agency Tools');
    });
    test('unknown group falls back to its raw name', () => {
        expect(navGroupLabel('frobnicators')).toBe('frobnicators');
        expect(navGroupLabel(null)).toBe('Other');
    });
});
