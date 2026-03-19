/**
 * Organization Scoping Utilities
 *
 * Standardized helpers for applying org-level data isolation to Supabase queries.
 * Eliminates the "return everything when orgId is null" anti-pattern.
 *
 * Phase 82: Multi-tenant data isolation hardening
 *
 * Usage:
 *   const { scopeToOrg, scopeToOrgViaDept, getVerifiedOrgId } = require('../utils/orgScope');
 *
 *   // Direct org_id column
 *   const query = scopeToOrg(supabase.from('agents').select('*'), orgId);
 *
 *   // Via department join (Parthenon pattern)
 *   const deptIds = await getOrgDepartmentIds(supabase, orgId);
 *   const query = supabase.from('processes').select('*').in('department_id', deptIds);
 */

/**
 * Apply org_id filter to a Supabase query.
 * Throws if orgId is null/undefined — forces callers to handle missing org context
 * explicitly rather than silently returning cross-org data.
 *
 * @param {object} query - Supabase query builder
 * @param {string} orgId - Organization ID (must not be null)
 * @param {string} column - Column name to filter on (default: 'org_id')
 * @returns {object} Filtered query
 * @throws {Error} If orgId is null/undefined
 */
function scopeToOrg(query, orgId, column = 'org_id') {
    if (!orgId) {
        throw new Error(`scopeToOrg: orgId is required but got ${orgId}. This query would return cross-org data.`);
    }
    return query.eq(column, orgId);
}

/**
 * Get all department IDs belonging to an organization.
 * Used for the Parthenon pattern where tables don't have org_id directly
 * but relate through department_id → departments.org_id.
 *
 * @param {object} supabase - Supabase client
 * @param {string} orgId - Organization ID
 * @returns {Promise<string[]>} Array of department UUIDs
 */
async function getOrgDepartmentIds(supabase, orgId) {
    if (!orgId) {
        throw new Error('getOrgDepartmentIds: orgId is required');
    }
    const { data, error } = await supabase
        .from('departments')
        .select('id')
        .eq('org_id', orgId)
        .eq('is_active', true);

    if (error) throw error;
    return (data || []).map(d => d.id);
}

/**
 * Get the verified org ID from the request.
 * Prefers verifiedOrgId (set by requireOrgContext middleware),
 * falls back to header/auth middleware values.
 *
 * @param {object} req - Express request
 * @returns {string|null} Organization ID
 */
function getVerifiedOrgId(req) {
    return req.verifiedOrgId || req.headers['x-org-id'] || req.orgId || null;
}

module.exports = {
    scopeToOrg,
    getOrgDepartmentIds,
    getVerifiedOrgId
};
