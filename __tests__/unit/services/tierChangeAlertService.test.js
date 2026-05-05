/**
 * Tier Change Alert Service Unit Tests (REQ-003 — Phase 88)
 *
 * Covers:
 * - classifyChange: 'up' for none → optional → core
 * - classifyChange: 'down' for core → optional → none
 * - classifyChange: 'lateral' for optional with price change
 * - classifyChange: null when no meaningful change
 * - emitAlertsForTierChange: no-op when no orgs on tier
 * - emitAlertsForTierChange: no-op when no overrides exist
 * - emitAlertsForTierChange: inserts one alert per affected org
 * - emitAlertsSafe: swallows errors and returns shape with error key
 * - countUnacknowledgedForOrg: returns count, 0 on missing table
 * - Phase 88 not applied gracefully (42P01 → no-op)
 */

const tcas = require('../../../server/services/tierChangeAlertService');

// ============================================
// classifyChange — pure function
// ============================================
describe('classifyChange', () => {
    test('null prev → up if next is optional or core', () => {
        expect(tcas.classifyChange(null, { access_type: 'core' })).toBe('up');
        expect(tcas.classifyChange(null, { access_type: 'optional' })).toBe('up');
    });

    test('null prev → null if next is none (no change)', () => {
        expect(tcas.classifyChange(null, { access_type: 'none' })).toBe(null);
    });

    test('upgrades classified as up', () => {
        expect(tcas.classifyChange({ access_type: 'none' }, { access_type: 'optional' })).toBe('up');
        expect(tcas.classifyChange({ access_type: 'optional' }, { access_type: 'core' })).toBe('up');
        expect(tcas.classifyChange({ access_type: 'none' }, { access_type: 'core' })).toBe('up');
    });

    test('downgrades classified as down', () => {
        expect(tcas.classifyChange({ access_type: 'core' }, { access_type: 'none' })).toBe('down');
        expect(tcas.classifyChange({ access_type: 'core' }, { access_type: 'optional' })).toBe('down');
        expect(tcas.classifyChange({ access_type: 'optional' }, { access_type: 'none' })).toBe('down');
    });

    test('optional → optional with price change is lateral', () => {
        expect(tcas.classifyChange(
            { access_type: 'optional', addon_price_monthly: 49 },
            { access_type: 'optional', addon_price_monthly: 99 }
        )).toBe('lateral');
    });

    test('optional → optional with same price returns null (no meaningful change)', () => {
        expect(tcas.classifyChange(
            { access_type: 'optional', addon_price_monthly: 49 },
            { access_type: 'optional', addon_price_monthly: 49 }
        )).toBe(null);
    });

    test('core → core returns null', () => {
        expect(tcas.classifyChange({ access_type: 'core' }, { access_type: 'core' })).toBe(null);
    });

    test('null next returns null', () => {
        expect(tcas.classifyChange({ access_type: 'core' }, null)).toBe(null);
    });
});

// ============================================
// emitAlertsForTierChange — needs mocked supabase
// ============================================

function makeSupabase({ orgsOnTier = [], overrides = [], orgsErr = null, overridesErr = null, insertCapture = [] }) {
    return {
        from(table) {
            const builder = {
                _filters: {},
                _in: {},
                _action: null,
                _payload: null,
                select() { return builder; },
                insert(payload) { builder._action = 'insert'; builder._payload = payload; return Promise.resolve({ data: payload, error: null }); },
                eq(col, val) { builder._filters[col] = val; return builder; },
                in(col, vals) { builder._in[col] = vals; return builder; },
                async then(resolve) {
                    if (table === 'organizations') {
                        if (orgsErr) return resolve({ data: null, error: orgsErr });
                        return resolve({ data: orgsOnTier, error: null });
                    }
                    if (table === 'org_module_overrides') {
                        if (overridesErr) return resolve({ data: null, error: overridesErr });
                        return resolve({ data: overrides, error: null });
                    }
                    if (table === 'tier_default_change_alerts') {
                        // For inserts we resolve via Promise above; this then-handler is
                        // for select() chains — return empty.
                        return resolve({ data: [], error: null });
                    }
                    return resolve({ data: [], error: null });
                }
            };
            // Wrap insert to capture rows
            const origInsert = builder.insert.bind(builder);
            builder.insert = (payload) => {
                if (table === 'tier_default_change_alerts') insertCapture.push(payload);
                return origInsert(payload);
            };
            return builder;
        }
    };
}

describe('emitAlertsForTierChange', () => {
    test('no orgs on tier → no alerts', async () => {
        const supabase = makeSupabase({ orgsOnTier: [] });
        const result = await tcas.emitAlertsForTierChange(supabase, {
            tierId: 'business', moduleId: 'workflows',
            prev: { access_type: 'core' }, next: { access_type: 'optional', addon_price_monthly: 99 }
        });
        expect(result.classification).toBe('down');
        expect(result.alerts_created).toBe(0);
    });

    test('no overrides on the module → no alerts', async () => {
        const supabase = makeSupabase({ orgsOnTier: [{ id: 'o1' }, { id: 'o2' }], overrides: [] });
        const result = await tcas.emitAlertsForTierChange(supabase, {
            tierId: 'business', moduleId: 'workflows',
            prev: { access_type: 'core' }, next: { access_type: 'none' }
        });
        expect(result.classification).toBe('down');
        expect(result.alerts_created).toBe(0);
    });

    test('inserts one alert per affected org', async () => {
        const insertCapture = [];
        const supabase = makeSupabase({
            orgsOnTier: [{ id: 'o1' }, { id: 'o2' }, { id: 'o3' }],
            overrides: [{ org_id: 'o1' }, { org_id: 'o3' }],
            insertCapture
        });
        const result = await tcas.emitAlertsForTierChange(supabase, {
            tierId: 'business', moduleId: 'workflows',
            prev: { access_type: 'optional', addon_price_monthly: 49 },
            next: { access_type: 'core' }
        });
        expect(result.classification).toBe('up');
        expect(result.alerts_created).toBe(2);
        expect(result.affected_org_ids).toEqual(['o1', 'o3']);
        expect(insertCapture).toHaveLength(1);
        expect(insertCapture[0]).toHaveLength(2);
        expect(insertCapture[0][0]).toMatchObject({
            org_id: 'o1',
            module_id: 'workflows',
            tier_id: 'business',
            change_type: 'up',
            old_access_type: 'optional',
            new_access_type: 'core'
        });
    });

    test('null classification → no DB calls beyond input validation', async () => {
        const insertCapture = [];
        const supabase = makeSupabase({ insertCapture });
        const result = await tcas.emitAlertsForTierChange(supabase, {
            tierId: 'business', moduleId: 'workflows',
            prev: { access_type: 'core' }, next: { access_type: 'core' }
        });
        expect(result.classification).toBe(null);
        expect(result.alerts_created).toBe(0);
        expect(insertCapture).toHaveLength(0);
    });

    test('Phase 88 tables missing (42P01) → graceful no-op', async () => {
        const supabase = makeSupabase({
            orgsOnTier: [{ id: 'o1' }],
            overridesErr: { code: '42P01', message: 'relation "org_module_overrides" does not exist' }
        });
        const result = await tcas.emitAlertsForTierChange(supabase, {
            tierId: 'business', moduleId: 'workflows',
            prev: { access_type: 'none' }, next: { access_type: 'core' }
        });
        expect(result.classification).toBe('up');
        expect(result.alerts_created).toBe(0);
    });

    test('rejects missing required args', async () => {
        const supabase = makeSupabase({});
        await expect(tcas.emitAlertsForTierChange(supabase, {})).rejects.toThrow(/required/);
        await expect(tcas.emitAlertsForTierChange(supabase, { tierId: 'x' })).rejects.toThrow(/required/);
    });
});

// ============================================
// emitAlertsSafe — swallows errors
// ============================================
describe('emitAlertsSafe', () => {
    test('returns error key on failure, does not throw', async () => {
        const supabase = makeSupabase({
            orgsOnTier: [{ id: 'o1' }],
            overridesErr: { code: 'XXX', message: 'unexpected DB error' }
        });
        const result = await tcas.emitAlertsSafe(supabase, {
            tierId: 'business', moduleId: 'workflows',
            prev: { access_type: 'none' }, next: { access_type: 'core' }
        });
        expect(result.classification).toBe(null);
        expect(result.alerts_created).toBe(0);
        expect(result.error).toMatch(/unexpected DB error/);
    });

    test('passes through normal results unchanged', async () => {
        const supabase = makeSupabase({ orgsOnTier: [], overrides: [] });
        const result = await tcas.emitAlertsSafe(supabase, {
            tierId: 'business', moduleId: 'workflows',
            prev: { access_type: 'optional', addon_price_monthly: 49 },
            next: { access_type: 'optional', addon_price_monthly: 99 }
        });
        expect(result.classification).toBe('lateral');
        expect(result.error).toBeUndefined();
    });
});

// ============================================
// countUnacknowledgedForOrg
// ============================================
describe('countUnacknowledgedForOrg', () => {
    function makeCountSupabase({ count = 0, error = null }) {
        return {
            from() {
                return {
                    select() { return this; },
                    eq() { return this; },
                    is() { return Promise.resolve({ count, error }); }
                };
            }
        };
    }

    test('returns count when table exists', async () => {
        const supabase = makeCountSupabase({ count: 3 });
        expect(await tcas.countUnacknowledgedForOrg(supabase, 'o1')).toBe(3);
    });

    test('returns 0 when Phase 88 not applied (42P01)', async () => {
        const supabase = makeCountSupabase({ count: null, error: { code: '42P01', message: 'missing' } });
        expect(await tcas.countUnacknowledgedForOrg(supabase, 'o1')).toBe(0);
    });

    test('throws on other DB errors', async () => {
        const supabase = makeCountSupabase({ count: null, error: { code: 'XXX', message: 'boom' } });
        await expect(tcas.countUnacknowledgedForOrg(supabase, 'o1')).rejects.toThrow(/boom/);
    });
});
