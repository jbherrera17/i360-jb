/**
 * Authentication Middleware
 * Handles user authentication via Supabase
 * 
 * Phase 2.1: Basic auth support
 * Phase 5: Full auth implementation with session management
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
        '/api/chat/models'
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
                req.isAnonymous = true;
            } else {
                req.userId = user.id;
                req.user = user;
                req.isAnonymous = false;
            }
        } catch (error) {
            console.error('Auth error:', error);
            req.userId = null;
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
    rateLimit
};
