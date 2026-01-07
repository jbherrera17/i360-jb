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
 * 3. null (anonymous/unauthenticated)
 *
 * Note: DEV_USER_ID fallback removed for security - use DEV_AUTH_BYPASS instead
 *
 * @param {Request} req - Express request object
 * @returns {string|null} User ID or null if not authenticated
 */
function getUserId(req) {
    return req.userId || req.user?.id || null;
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

module.exports = {
    getUserId,
    isAuthenticated,
    getUserRole,
    isAdmin
};
