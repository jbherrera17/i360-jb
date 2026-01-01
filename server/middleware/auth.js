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
        '/api/context'  // Phase 3: Allow context access during development
    ];
    
    if (publicPaths.some(path => req.path.startsWith(path))) {
        return next();
    }
    
    // Get Supabase client from request
    const supabase = req.supabase;
    
    // If no Supabase configured, allow anonymous access
    if (!supabase) {
        req.userId = null;
        req.isAnonymous = true;
        return next();
    }
    
    // Check for authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        // Check for user ID header (simple auth for development)
        const userId = req.headers['x-user-id'];
        if (userId) {
            req.userId = userId;
            req.isAnonymous = false;
            return next();
        }
        
        // Allow anonymous access but mark it
        req.userId = null;
        req.isAnonymous = true;
        return next();
    }
    
    // Parse bearer token
    if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        try {
            // Verify JWT with Supabase
            const { data: { user }, error } = await supabase.auth.getUser(token);

            if (error) {
                console.warn('Auth token verification failed:', error.message);
                req.userId = null;
                req.userRole = null;
                req.isAnonymous = true;
            } else {
                req.userId = user.id;
                req.user = user;
                req.isAnonymous = false;

                // Fetch user role from database
                try {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', user.id)
                        .single();

                    req.userRole = profile?.role || 'user';
                } catch (profileError) {
                    console.warn('Could not fetch user role:', profileError.message);
                    req.userRole = 'user'; // Default to user role
                }
            }
        } catch (error) {
            console.error('Auth error:', error);
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
    // Development mode bypass
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
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
    // Development mode bypass with admin role
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        if (!req.userId) {
            req.userId = process.env.DEV_USER_ID || 'dev-user-001';
            req.userRole = 'admin';
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

    if (req.userRole !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Admin access required',
            code: 'ADMIN_REQUIRED'
        });
    }

    next();
}

/**
 * Check if user can edit an agent
 * Admins can edit all agents; users can only edit their own non-system agents
 */
function canEditAgent(userRole, userId, agent) {
    // Admins can edit everything
    if (userRole === 'admin') {
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
function canDeleteAgent(userRole, userId, agent) {
    return canEditAgent(userRole, userId, agent);
}

/**
 * Middleware factory for role-based access
 * @param {string[]} allowedRoles - Array of allowed roles
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        // Development mode bypass
        if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
            if (!req.userId) {
                req.userId = process.env.DEV_USER_ID || 'dev-user-001';
                req.userRole = 'admin';
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

        if (!allowedRoles.includes(req.userRole)) {
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
 * Rate limiting by user (basic implementation)
 * Phase 5 will have more sophisticated rate limiting
 */
const rateLimits = new Map();

function rateLimit(options = {}) {
    const {
        windowMs = 60000,  // 1 minute
        max = 60,          // 60 requests per minute
        message = 'Too many requests, please try again later'
    } = options;
    
    return (req, res, next) => {
        const key = req.userId || req.ip;
        const now = Date.now();
        
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
    optionalAuth,
    requireAdmin,
    requireRole,
    canEditAgent,
    canDeleteAgent,
    rateLimit
};
