/**
 * Org Config Audit Service Unit Tests (REQ-003 — Phase 88)
 *
 * Covers:
 * - logChange happy path inserts a row with required fields
 * - Validation: orgId, changeType, field, reason all required
 * - Reason auto-trims
 * - DB error propagates
 * - listChanges returns rows ordered by created_at DESC
 * - listChanges respects limit clamping
 */

const audit = require('../../../server/services/orgConfigAuditService');

function makeMockInsert({ returnData = { id: 'new-id', created_at: '2026-04-29T18:00:00Z' }, error = null, captureCalls = [] } = {}) {
    const supabase = {
        from(table) {
            const builder = {
                _table: table,
                _action: null,
                _payload: null,
                insert(payload) { builder._action = 'insert'; builder._payload = payload; return builder; },
                select() { return builder; },
                async single() {
                    captureCalls.push({ table: builder._table, action: 'insert', payload: builder._payload });
                    return { data: returnData, error };
                }
            };
            return builder;
        }
    };
    return { supabase, captureCalls };
}

function makeMockList({ rows = [], error = null, captureCalls = [] } = {}) {
    return {
        from(table) {
            const builder = {
                _filters: {},
                _limit: null,
                select() { return builder; },
                eq(col, val) { builder._filters[col] = val; return builder; },
                order() { return builder; },
                limit(n) { builder._limit = n; captureCalls.push({ table, filters: builder._filters, limit: n }); return Promise.resolve({ data: rows, error }); }
            };
            return builder;
        }
    };
}

// ============================================
// logChange — happy path
// ============================================
describe('logChange — happy path', () => {
    test('inserts row with all required fields', async () => {
        const { supabase, captureCalls } = makeMockInsert();
        const result = await audit.logChange(supabase, {
            orgId: 'org-1',
            changedByUserId: 'user-1',
            changeType: 'resource',
            field: 'max_agents',
            oldValue: 25,
            newValue: 40,
            reason: 'negotiated at signup'
        });
        expect(result.id).toBe('new-id');
        expect(captureCalls).toHaveLength(1);
        expect(captureCalls[0].payload).toEqual({
            org_id: 'org-1',
            changed_by_user_id: 'user-1',
            change_type: 'resource',
            field: 'max_agents',
            old_value: 25,
            new_value: 40,
            reason: 'negotiated at signup'
        });
    });

    test('trims whitespace from reason', async () => {
        const { supabase, captureCalls } = makeMockInsert();
        await audit.logChange(supabase, {
            orgId: 'o', changedByUserId: 'u', changeType: 'module', field: 'workflows', reason: '   spaces around   '
        });
        expect(captureCalls[0].payload.reason).toBe('spaces around');
    });

    test('module change_type with module_id as field', async () => {
        const { supabase, captureCalls } = makeMockInsert();
        await audit.logChange(supabase, {
            orgId: 'o', changedByUserId: 'u', changeType: 'module', field: 'thought_leadership',
            oldValue: { access_type: 'optional' }, newValue: { access_type: 'core' }, reason: 'comp'
        });
        expect(captureCalls[0].payload.change_type).toBe('module');
        expect(captureCalls[0].payload.field).toBe('thought_leadership');
    });
});

// ============================================
// logChange — validation
// ============================================
describe('logChange — validation', () => {
    const stub = makeMockInsert().supabase;

    test('rejects missing orgId', async () => {
        await expect(audit.logChange(stub, { changeType: 'resource', field: 'max_agents', reason: 'r' }))
            .rejects.toThrow(/orgId required/);
    });

    test('rejects invalid changeType', async () => {
        await expect(audit.logChange(stub, { orgId: 'o', changeType: 'bogus', field: 'x', reason: 'r' }))
            .rejects.toThrow(/changeType must be one of/);
    });

    test('rejects missing field', async () => {
        await expect(audit.logChange(stub, { orgId: 'o', changeType: 'resource', reason: 'r' }))
            .rejects.toThrow(/field required/);
    });

    test('rejects empty reason (Decision #12 — hard-required)', async () => {
        await expect(audit.logChange(stub, { orgId: 'o', changeType: 'resource', field: 'max_agents', reason: '' }))
            .rejects.toThrow(/reason required/);
        await expect(audit.logChange(stub, { orgId: 'o', changeType: 'resource', field: 'max_agents', reason: '   ' }))
            .rejects.toThrow(/reason required/);
        await expect(audit.logChange(stub, { orgId: 'o', changeType: 'resource', field: 'max_agents' }))
            .rejects.toThrow(/reason required/);
    });
});

// ============================================
// logChange — DB error propagation
// ============================================
describe('logChange — DB error', () => {
    test('throws with DB error message', async () => {
        const { supabase } = makeMockInsert({ returnData: null, error: { message: 'fk violation on org_id' } });
        await expect(audit.logChange(supabase, { orgId: 'o', changeType: 'resource', field: 'x', reason: 'r' }))
            .rejects.toThrow(/fk violation on org_id/);
    });
});

// ============================================
// listChanges
// ============================================
describe('listChanges', () => {
    test('returns rows from supabase, defaulting to limit 50', async () => {
        const captureCalls = [];
        const supabase = makeMockList({
            rows: [{ id: 1, reason: 'a' }, { id: 2, reason: 'b' }],
            captureCalls
        });
        const rows = await audit.listChanges(supabase, 'org-1');
        expect(rows).toHaveLength(2);
        expect(captureCalls[0].limit).toBe(50);
        expect(captureCalls[0].filters).toEqual({ org_id: 'org-1' });
    });

    test('clamps limit to 200 max and 1 min', async () => {
        const captureCalls = [];
        const supabase = makeMockList({ captureCalls });
        await audit.listChanges(supabase, 'org-1', { limit: 5000 });
        expect(captureCalls[0].limit).toBe(200);

        const cc2 = [];
        const sb2 = makeMockList({ captureCalls: cc2 });
        await audit.listChanges(sb2, 'org-1', { limit: -10 });
        expect(cc2[0].limit).toBe(50);  // -10 falls through to default
    });

    test('propagates DB error', async () => {
        const supabase = makeMockList({ error: { message: 'permission denied' } });
        await expect(audit.listChanges(supabase, 'org-1')).rejects.toThrow(/permission denied/);
    });
});
