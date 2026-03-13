/**
 * Authentication Middleware
 * Handles user authentication via Supabase
 *
 * Phase 2.1: Basic auth support
 * Phase 5: Full auth implementation with session management
 * Phase 8: Role-based access control (admin, user, viewer)
 */

/**
 * Extract and verify user from request
 * Supports both JWT bearer tokens and API keys
 */
async function authenticate(req, res, next) {
    // Skip auth for public endpoints
    const publicPaths = [
        '/api/health',
        '/api/status',
        '/api/chat/models',
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/forgot-password',
        '/api/auth/reset-password',
        '/api/auth/accept-invite',
        '/api/auth/refresh',
        '/api/pricing'
    ];

    // Use originalUrl since middleware is mounted at /api
    const requestPath = req.originalUrl || req.path;
    if (publicPaths.some(path => requestPath.startsWith(path))) {
        return next();
    }

    // Get Supabase client from request
    const supabase = req.supabase;

    // If no Supabase configured in production, reject all requests
    if (!supabase) {
        if (process.env.NODE_ENV === 'production') {
            return res.status(503).json({
                success: false,
                error: 'Authentication service unavailable',
                code: 'AUTH_UNAVAILABLE'
            });
        }
        req.userId = null;
        req.isAnonymous = true;
        return next();
    }

    // Check for authorization header
    const authHeader = req.headers.authorization;

    // Also check for auth token in cookie (for browser requests)
    const cookies = req.headers.cookie || '';
    const cookieTokenMatch = cookies.match(/auth_token=([^;]+)/);
    const cookieToken = cookieTokenMatch ? cookieTokenMatch[1] : null;

    if (!authHeader && !cookieToken) {
        // In production, reject unauthenticated API requests
        if (process.env.NODE_ENV === 'production') {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }
        // In development, allow anonymous access for testing
        req.userId = null;
        req.isAnonymous = true;
        return next();
    }

    // Use cookie token if no Authorization header
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : cookieToken;
    
    // Verify token with Supabase
    if (token) {
        try {
            // Verify JWT with Supabase
            const { data: { user }, error } = await supabase.auth.getUser(token);

            if (error) {
                console.warn('Auth token verification failed:', error.message);
                if (process.env.NODE_ENV === 'production') {
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid or expired token',
                        code: 'TOKEN_INVALID'
                    });
                }
                req.userId = null;
                req.userRole = null;
                req.isAnonymous = true;
            } else {
                req.userId = user.id;
                req.user = user;
                req.isAnonymous = false;

                // Fetch user's default org
                try {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('default_org_id')
                        .eq('id', user.id)
                        .single();

                    req.orgId = profile?.default_org_id || null;
                } catch (profileError) {
                    console.warn('Could not fetch user profile:', profileError.message);
                }

                // Fetch org membership role (replaces legacy users.role)
                if (req.orgId) {
                    try {
                        const { data: membership } = await supabase
                            .from('organization_members')
                            .select('role, business_role')
                            .eq('user_id', user.id)
                            .eq('org_id', req.orgId)
                            .eq('status', 'active')
                            .single();
                        req.orgRole = membership?.role || null;
                        req.businessRole = membership?.business_role || 'ic';
                    } catch (e) {
                        req.orgRole = null;
                        req.businessRole = 'ic';
                    }
                }

                // Check platform admin status
                try {
                    const { data: isAdmin } = await supabase
                        .rpc('is_platform_admin', { p_user_id: user.id });
                    req.isPlatformAdmin = !!isAdmin;
                } catch (e) {
                    req.isPlatformAdmin = false;
                }

                // Legacy compat: set userRole for any code that still reads it during transition
                req.userRole = req.isPlatformAdmin ? 'admin' : (req.orgRole || 'user');

                // Check for active impersonation (platform admin "Act As")
                const impersonationStore = req.app?.locals?.impersonationStore;
                if (impersonationStore) {
                    const impersonation = impersonationStore.get(user.id);
                    if (impersonation) {
                        req.realOrgRole = req.orgRole;
                        req.realOrgId = req.orgId;
                        req.orgRole = impersonation.role;
                        req.orgId = impersonation.org_id;
                        req.isImpersonating = true;
                        req.impersonation = impersonation;
                        // Legacy compat
                        req.userRole = impersonation.role;
                    }
                }
            }
        } catch (error) {
            console.error('Auth error:', error);
            if (process.env.NODE_ENV === 'production') {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication failed',
                    code: 'AUTH_ERROR'
                });
            }
            req.userId = null;
            req.userRole = null;
            req.isAnonymous = true;
        }
    }

    next();
}

/**
 * Require authentication middleware
 * Use this for endpoints that must have a logged-in user
 */
function requireAuth(req, res, next) {
    // Development mode bypass - ONLY when explicitly set to 'development'
    // Security fix: removed !process.env.NODE_ENV check to prevent auth bypass in production
    if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
        // Set a default user ID for development
        if (!req.userId) {
            req.userId = process.env.DEV_USER_ID || 'dev-user-001';
            req.isAnonymous = false;
        }
        return next();
    }
    
    if (!req.userId || req.isAnonymous) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
    }
    next();
}

/**
 * Optional auth middleware
 * Populates user info if available, but doesn't require it
 */
function optionalAuth(req, res, next) {
    // Just continue - user info already populated by authenticate()
    next();
}

/**
 * Require admin role middleware
 * Use this for endpoints that must have admin access
 */
function requireAdmin(req, res, next) {
    if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
        if (!req.userId) {
            req.userId = process.env.DEV_USER_ID || 'dev-user-001';
            req.isPlatformAdmin = true;
            req.isAnonymous = false;
        }
        return next();
    }

    if (!req.userId || req.isAnonymous) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
    }

    // Check platform admin or org admin/owner
    if (req.isPlatformAdmin || ['admin', 'owner'].includes(req.orgRole)) {
        return next();
    }

    return res.status(403).json({
        success: false,
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
    });
}

/**
 * Check if user can edit an agent
 * Admins can edit all agents; users can only edit their own non-system agents
 */
function canEditAgent(userRole, userId, agent, req) {
    // Platform admins and org admins can edit everything
    if (req?.isPlatformAdmin || ['admin', 'owner'].includes(req?.orgRole)) {
        return true;
    }

    // System agents cannot be edited by non-admins
    if (agent.is_system) {
        return false;
    }

    // Users can edit their own agents
    return agent.user_id === userId;
}

/**
 * Check if user can delete an agent
 * Same rules as editing
 */
function canDeleteAgent(userRole, userId, agent, req) {
    return canEditAgent(userRole, userId, agent, req);
}

/**
 * Middleware factory for role-based access
 * @param {string[]} allowedRoles - Array of allowed roles
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
            if (!req.userId) {
                req.userId = process.env.DEV_USER_ID || 'dev-user-001';
                req.isPlatformAdmin = true;
                req.isAnonymous = false;
            }
            return next();
        }

        if (!req.userId || req.isAnonymous) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        // Platform admins bypass role checks
        if (req.isPlatformAdmin) {
            return next();
        }

        const effectiveRole = req.orgRole || 'user';
        if (!allowedRoles.includes(effectiveRole)) {
            return res.status(403).json({
                success: false,
                error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
                code: 'ROLE_REQUIRED'
            });
        }

        next();
    };
}

/**
 * Page authentication middleware
 * Redirects unauthenticated users to login page for protected HTML routes
 * Checks for token in cookie or Authorization header
 */
function requirePageAuth(req, res, next) {
    // Public pages that don't require authentication
    const publicPages = ['/login', '/login.html', '/register', '/register.html', '/forgot-password'];

    // Check if current path is public
    if (publicPages.some(page => req.path === page || req.path.startsWith(page))) {
        return next();
    }

    // Development mode bypass
    if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
        return next();
    }

    // Check for auth token in cookie
    const cookies = req.headers.cookie || '';
    const tokenMatch = cookies.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    // Also check Authorization header (for API clients)
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const authToken = token || bearerToken;

    if (!authToken) {
        // No token - redirect to login
        return res.redirect('/login');
    }

    // Verify token with Supabase if available
    const supabase = req.supabase;
    if (supabase) {
        supabase.auth.getUser(authToken)
            .then(({ data: { user }, error }) => {
                if (error || !user) {
                    // Invalid token - redirect to login
                    return res.redirect('/login');
                }
                // Valid token - allow access
                req.user = user;
                req.userId = user.id;
                next();
            })
            .catch(() => {
                res.redirect('/login');
            });
    } else {
        // No Supabase - just check token exists (basic validation)
        // In production, Supabase should always be configured
        next();
    }
}

/**
 * Rate limiting by user (basic implementation)
 * Phase 5 will have more sophisticated rate limiting
 */
const rateLimits = new Map();
const RATE_LIMIT_MAX_ENTRIES = 10000; // Maximum entries to prevent memory exhaustion
const RATE_LIMIT_CLEANUP_INTERVAL = 60000; // Cleanup every minute

// Periodic cleanup of expired rate limit entries
let lastCleanup = Date.now();
function cleanupExpiredRateLimits() {
    const now = Date.now();
    // Only cleanup once per interval
    if (now - lastCleanup < RATE_LIMIT_CLEANUP_INTERVAL) return;
    lastCleanup = now;

    for (const [key, limit] of rateLimits.entries()) {
        if (now > limit.resetAt) {
            rateLimits.delete(key);
        }
    }
}

function rateLimit(options = {}) {
    const {
        windowMs = 60000,  // 1 minute
        max = 60,          // 60 requests per minute
        message = 'Too many requests, please try again later'
    } = options;

    return (req, res, next) => {
        const key = req.userId || req.ip;
        const now = Date.now();

        // Periodic cleanup to prevent unbounded memory growth
        cleanupExpiredRateLimits();

        // Hard cap on entries to prevent memory exhaustion from distributed attacks
        if (!rateLimits.has(key) && rateLimits.size >= RATE_LIMIT_MAX_ENTRIES) {
            // Under attack scenario - reject new entries
            return res.status(429).json({
                success: false,
                error: 'Server under high load, please try again later',
                code: 'RATE_LIMITED',
                retryAfter: 60
            });
        }

        if (!rateLimits.has(key)) {
            rateLimits.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        const limit = rateLimits.get(key);

        // Reset if window expired
        if (now > limit.resetAt) {
            limit.count = 1;
            limit.resetAt = now + windowMs;
            return next();
        }

        // Check limit
        if (limit.count >= max) {
            return res.status(429).json({
                success: false,
                error: message,
                code: 'RATE_LIMITED',
                retryAfter: Math.ceil((limit.resetAt - now) / 1000)
            });
        }

        limit.count++;
        next();
    };
}

/**
 * Clean up old rate limit entries periodically
 */
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimits.entries()) {
        if (now > value.resetAt + 60000) { // Clean up after 1 minute past reset
            rateLimits.delete(key);
        }
    }
}, 60000);

module.exports = {
    authenticate,
    requireAuth,
    requirePageAuth,
    optionalAuth,
    requireAdmin,
    requireRole,
    canEditAgent,
    canDeleteAgent,
    rateLimit
};
