/**
 * Authentication Utilities
 * Shared helpers for user identification across routes
 */

/**
 * Get the authenticated user's ID from the request
 * Standardized across all routes to ensure consistent behavior
 *
 * Priority:
 * 1. req.userId (set by auth middleware from JWT verification)
 * 2. req.user?.id (Supabase user object if available)
 * 3. DEFAULT_USER_ID (development fallback - only in dev mode)
 * 4. null (anonymous/unauthenticated in production)
 *
 * @param {Request} req - Express request object
 * @returns {string|null} User ID or null if not authenticated
 */
function getUserId(req) {
    const userId = req.userId || req.user?.id;

    // In development, fall back to DEFAULT_USER_ID to prevent null UUID errors
    // Check for null, undefined, empty string, or 'anonymous' (which is not a valid UUID)
    const isValidUserId = userId && userId !== 'anonymous' && userId !== 'null';

    if (!isValidUserId && process.env.NODE_ENV !== 'production') {
        return process.env.DEFAULT_USER_ID || process.env.DEV_USER_ID || null;
    }

    return isValidUserId ? userId : null;
}

/**
 * Check if the request is from an authenticated user
 * @param {Request} req - Express request object
 * @returns {boolean} True if user is authenticated
 */
function isAuthenticated(req) {
    return !req.isAnonymous && getUserId(req) !== null;
}

/**
 * Get the user's role from the request
 * @param {Request} req - Express request object
 * @returns {string} User role ('admin', 'user', 'viewer') or 'anonymous'
 */
function getUserRole(req) {
    if (!isAuthenticated(req)) {
        return 'anonymous';
    }
    return req.userRole || 'user';
}

/**
 * Check if the user has admin privileges
 * @param {Request} req - Express request object
 * @returns {boolean} True if user is an admin
 */
function isAdmin(req) {
    return getUserRole(req) === 'admin';
}

/**
 * Check if the user has admin privileges (async version that checks database)
 * Use this when req.userRole may not be set (e.g., development mode)
 * @param {Request} req - Express request object
 * @param {object} supabase - Supabase client
 * @returns {Promise<boolean>} True if user is an admin
 */
async function isAdminAsync(req, supabase) {
    // First check if already set on request
    if (req.userRole === 'admin') {
        return true;
    }

    const userId = getUserId(req);
    if (!userId) {
        return false;
    }

    try {
        const { data } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        return data?.role === 'admin';
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

/**
 * Get the organization ID from the request
 * Standardized across all routes to ensure consistent org-scoping.
 *
 * Priority:
 * 1. req.query.org_id (explicit query param)
 * 2. req.headers['x-org-id'] (header from authFetch or manual)
 * 3. req.orgId (set by auth middleware from user's default_org_id)
 * 4. null (no org context)
 *
 * @param {Request} req - Express request object
 * @returns {string|null} Organization ID or null
 */
function getOrgId(req) {
    return req.query.org_id || req.headers['x-org-id'] || req.orgId || null;
}

module.exports = {
    getUserId,
    getOrgId,
    isAuthenticated,
    getUserRole,
    isAdmin,
    isAdminAsync
};
