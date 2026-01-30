/**
 * Resource Access Control Utility
 * Phase 45: Per-User Resource Access Control
 *
 * Implements a two-layer access control system:
 * Layer 1: Module check (system resources only) - checks can_access_module()
 * Layer 2: Visibility check (all resources) - ownership, org, dept, role
 *
 * Visibility levels: private → team → organization → public
 */

/**
 * Build Supabase query filter for resource access control
 *
 * Access is granted if ANY of these conditions are true:
 * 1. User owns the resource (user_id = current user)
 * 2. Resource is public (visibility = 'public')
 * 3. User is in same org AND visibility is 'organization' or 'public'
 * 4. User is in same department AND visibility is 'team'
 * 5. Resource has null user_id (system resources - further filtered by module check)
 *
 * @param {Object} query - Supabase query builder
 * @param {Object} options - Access context
 * @param {string} options.userId - Current user ID
 * @param {string} options.orgId - User's organization ID
 * @param {string[]} options.departmentIds - User's department IDs
 * @param {string} options.businessRole - User's business role
 * @returns {Object} Modified query with access filters
 */
function buildResourceAccessFilter(query, { userId, orgId, departmentIds = [], businessRole }) {
    if (!userId) {
        // Anonymous users: public only
        return query.eq('visibility', 'public');
    }

    // Build OR conditions for access
    const conditions = [
        `user_id.eq.${userId}`,  // Owner
        `visibility.eq.public`   // Public
    ];

    // Organization-level access
    if (orgId) {
        conditions.push(`and(org_id.eq.${orgId},visibility.in.(organization,public))`);

        // Team-level access (same department)
        if (departmentIds.length > 0) {
            const deptList = departmentIds.join(',');
            conditions.push(`and(department_id.in.(${deptList}),visibility.eq.team)`);
        }
    }

    // Also include resources with null user_id (system resources)
    // These will be further filtered by module access on the backend
    conditions.push('user_id.is.null');

    return query.or(conditions.join(','));
}

/**
 * Build access filter for agents (uses junction table for departments)
 * Agents don't have direct department_id, they use department_agents table
 *
 * @param {Object} query - Supabase query builder
 * @param {Object} options - Access context
 * @returns {Object} Modified query with access filters
 */
function buildAgentAccessFilter(query, { userId, orgId, departmentIds = [], businessRole }) {
    if (!userId) {
        return query.eq('visibility', 'public');
    }

    const conditions = [
        `user_id.eq.${userId}`,
        `visibility.eq.public`
    ];

    if (orgId) {
        conditions.push(`and(org_id.eq.${orgId},visibility.in.(organization,public))`);
        // Note: Team-level filtering for agents requires a subquery or post-processing
        // due to the department_agents junction table
    }

    conditions.push('user_id.is.null');

    return query.or(conditions.join(','));
}

/**
 * Get user's department IDs from their roles
 *
 * @param {Object} supabase - Supabase client
 * @param {string} userId - User ID
 * @returns {Promise<string[]>} Array of department IDs
 */
async function getUserDepartmentIds(supabase, userId) {
    if (!userId) return [];

    const { data } = await supabase
        .from('user_roles')
        .select('department_roles(department_id)')
        .eq('user_id', userId);

    if (!data) return [];

    return [...new Set(data.map(r => r.department_roles?.department_id).filter(Boolean))];
}

/**
 * Get user's access context (org, departments, role)
 *
 * @param {Object} supabase - Supabase client
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Access context or null if user not found
 */
async function getUserAccessContext(supabase, userId) {
    if (!userId) return null;

    const { data: user } = await supabase
        .from('users')
        .select('id, default_org_id, business_role')
        .eq('id', userId)
        .single();

    if (!user) return null;

    const departmentIds = await getUserDepartmentIds(supabase, userId);

    return {
        userId: user.id,
        orgId: user.default_org_id,
        departmentIds,
        businessRole: user.business_role
    };
}

/**
 * Check if user can access a specific resource (single item check)
 * Uses the database function can_access_resource()
 *
 * @param {Object} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} resourceType - 'agent', 'skill', 'context_asset', 'workflow'
 * @param {string} resourceId - Resource ID
 * @returns {Promise<boolean>} Whether user can access the resource
 */
async function canAccessResource(supabase, userId, resourceType, resourceId) {
    if (!userId || !resourceId) return false;

    const { data, error } = await supabase
        .rpc('can_access_resource', {
            p_user_id: userId,
            p_resource_type: resourceType,
            p_resource_id: resourceId
        });

    if (error) {
        console.error('Error checking resource access:', error);
        return false;
    }

    return data === true;
}

/**
 * Filter system resources by module access
 * This is called after the initial query to remove system resources
 * that the user doesn't have module access to
 *
 * @param {Object} supabase - Supabase client
 * @param {Array} resources - Array of resources from query
 * @param {string} userId - User ID
 * @param {string} orgId - Organization ID
 * @returns {Promise<Array>} Filtered resources
 */
async function filterByModuleAccess(supabase, resources, userId, orgId) {
    if (!resources || resources.length === 0) return resources;
    if (!userId || !orgId) return resources.filter(r => !r.is_system);

    // Get user's accessible modules
    const { data: userModules } = await supabase
        .rpc('get_user_modules', { p_user_id: userId, p_org_id: orgId });

    const accessibleModuleIds = new Set((userModules || []).map(m => m.module_id));

    return resources.filter(resource => {
        // User-created resources pass through
        if (!resource.is_system) return true;

        // System resources without module_id are accessible
        if (!resource.module_id) return true;

        // Check if user has access to the required module
        return accessibleModuleIds.has(resource.module_id);
    });
}

/**
 * Get visibility counts for admin dashboard
 *
 * @param {Object} supabase - Supabase client
 * @param {string} tableName - Table name
 * @param {string} orgId - Organization ID
 * @returns {Promise<Object>} Counts by visibility level
 */
async function getVisibilityCounts(supabase, tableName, orgId) {
    const counts = {
        private: 0,
        team: 0,
        organization: 0,
        public: 0
    };

    for (const visibility of Object.keys(counts)) {
        let query = supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true })
            .eq('visibility', visibility);

        if (orgId) {
            query = query.or(`org_id.eq.${orgId},org_id.is.null`);
        }

        const { count } = await query;
        counts[visibility] = count || 0;
    }

    return counts;
}

/**
 * Validate visibility value
 *
 * @param {string} visibility - Visibility value to validate
 * @returns {boolean} Whether the value is valid
 */
function isValidVisibility(visibility) {
    return ['private', 'team', 'organization', 'public'].includes(visibility);
}

/**
 * Get default visibility for new resources based on org tier
 *
 * @param {Object} supabase - Supabase client
 * @param {string} orgId - Organization ID
 * @returns {Promise<string>} Default visibility level
 */
async function getDefaultVisibility(supabase, orgId) {
    if (!orgId) return 'private';

    const { data: org } = await supabase
        .from('organizations')
        .select('subscription_tier_id')
        .eq('id', orgId)
        .single();

    if (!org?.subscription_tier_id) return 'private';

    const { data: tier } = await supabase
        .from('subscription_tiers')
        .select('default_resource_visibility')
        .eq('tier_id', org.subscription_tier_id)
        .single();

    return tier?.default_resource_visibility || 'organization';
}

/**
 * Check if organization allows public resources
 *
 * @param {Object} supabase - Supabase client
 * @param {string} orgId - Organization ID
 * @returns {Promise<boolean>} Whether public resources are allowed
 */
async function canCreatePublicResources(supabase, orgId) {
    if (!orgId) return false;

    const { data: org } = await supabase
        .from('organizations')
        .select('subscription_tier_id')
        .eq('id', orgId)
        .single();

    if (!org?.subscription_tier_id) return false;

    const { data: tier } = await supabase
        .from('subscription_tiers')
        .select('allow_public_resources')
        .eq('tier_id', org.subscription_tier_id)
        .single();

    return tier?.allow_public_resources === true;
}

/**
 * Filter resources by business role level
 * Phase 50: Generic role-based filtering for any resource type
 *
 * Checks the {resourceType}_roles junction table for minimum role requirements.
 * Resources with no role mappings are accessible to all roles.
 *
 * @param {Object} supabase - Supabase client
 * @param {Array} resources - Array of resource objects (must have .id)
 * @param {string} userId - User ID to look up business role
 * @param {string} resourceType - 'agent', 'skill', 'workflow', or 'action'
 * @returns {Array} Filtered resources the user's role can access
 */
async function filterByBusinessRole(supabase, resources, userId, resourceType) {
    if (!resources || resources.length === 0) return resources;
    if (!userId) return resources;

    // Look up user's business role level
    const { data: user } = await supabase
        .from('users')
        .select('business_role')
        .eq('id', userId)
        .single();

    if (!user?.business_role) return resources; // No role = no filtering

    const { data: roleData } = await supabase
        .from('business_role_levels')
        .select('level')
        .eq('id', user.business_role)
        .single();

    const userLevel = roleData?.level || 1;

    // Determine junction table and FK column
    const junctionTable = `${resourceType}_roles`;
    const fkColumn = `${resourceType}_id`;
    const roleColumn = 'role_level';

    const filtered = [];
    for (const resource of resources) {
        const { data: roleReqs } = await supabase
            .from(junctionTable)
            .select(roleColumn)
            .eq(fkColumn, resource.id);

        // No role requirements = accessible to all
        if (!roleReqs?.length) {
            filtered.push(resource);
            continue;
        }

        const { data: levels } = await supabase
            .from('business_role_levels')
            .select('level')
            .in('id', roleReqs.map(r => r[roleColumn]).filter(Boolean));

        if (!levels?.length) {
            filtered.push(resource);
            continue;
        }

        const minLevel = Math.min(...levels.map(l => l.level));
        if (userLevel >= minLevel) {
            filtered.push(resource);
        }
    }

    return filtered;
}

module.exports = {
    buildResourceAccessFilter,
    buildAgentAccessFilter,
    getUserDepartmentIds,
    getUserAccessContext,
    canAccessResource,
    filterByModuleAccess,
    filterByBusinessRole,
    getVisibilityCounts,
    isValidVisibility,
    getDefaultVisibility,
    canCreatePublicResources
};
