/**
 * Cache Service
 * In-memory LRU cache for user profiles and token validation
 *
 * Phase 29: Performance Optimization
 *
 * Features:
 * - TTL-based expiration
 * - LRU eviction when max size reached
 * - Separate caches for profiles and tokens
 * - Cache invalidation on user updates
 */

class LRUCache {
    constructor(maxSize = 1000, defaultTTL = 300000) { // 5 min default TTL
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTL;
        this.cache = new Map();
    }

    /**
     * Get item from cache
     * @param {string} key - Cache key
     * @returns {any|null} - Cached value or null if expired/missing
     */
    get(key) {
        const item = this.cache.get(key);

        if (!item) {
            return null;
        }

        // Check if expired
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, item);

        return item.value;
    }

    /**
     * Set item in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in ms (optional)
     */
    set(key, value, ttl = this.defaultTTL) {
        // Remove if exists (to update position)
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }

        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttl
        });
    }

    /**
     * Delete item from cache
     * @param {string} key - Cache key
     */
    delete(key) {
        this.cache.delete(key);
    }

    /**
     * Clear all items from cache
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {object} - Cache stats
     */
    stats() {
        let expired = 0;
        const now = Date.now();

        for (const [, item] of this.cache) {
            if (now > item.expiresAt) {
                expired++;
            }
        }

        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            expired,
            active: this.cache.size - expired
        };
    }
}

// Cache instances
const userProfileCache = new LRUCache(500, 5 * 60 * 1000);  // 5 min TTL
const tokenValidationCache = new LRUCache(1000, 5 * 60 * 1000); // 5 min TTL

/**
 * Get cached user profile
 * @param {string} userId - User ID
 * @returns {object|null} - Cached profile or null
 */
function getCachedProfile(userId) {
    return userProfileCache.get(`profile:${userId}`);
}

/**
 * Cache user profile
 * @param {string} userId - User ID
 * @param {object} profile - User profile data
 * @param {number} ttl - Optional TTL override
 */
function cacheProfile(userId, profile, ttl) {
    userProfileCache.set(`profile:${userId}`, profile, ttl);
}

/**
 * Invalidate cached user profile
 * @param {string} userId - User ID
 */
function invalidateProfile(userId) {
    userProfileCache.delete(`profile:${userId}`);
}

/**
 * Get cached token validation result
 * @param {string} token - JWT token (or hash)
 * @returns {object|null} - Cached user data or null
 */
function getCachedTokenValidation(token) {
    // Use first/last chars + length as key to avoid storing full token
    const tokenKey = `token:${token.substring(0, 10)}:${token.length}:${token.substring(token.length - 10)}`;
    return tokenValidationCache.get(tokenKey);
}

/**
 * Cache token validation result
 * @param {string} token - JWT token
 * @param {object} userData - Validated user data
 * @param {number} ttl - Optional TTL override
 */
function cacheTokenValidation(token, userData, ttl) {
    const tokenKey = `token:${token.substring(0, 10)}:${token.length}:${token.substring(token.length - 10)}`;
    tokenValidationCache.set(tokenKey, userData, ttl);
}

/**
 * Invalidate all cached data for a user (on logout, password change, etc.)
 * @param {string} userId - User ID
 * @param {string} token - Optional token to invalidate
 */
function invalidateUser(userId, token) {
    invalidateProfile(userId);
    if (token) {
        const tokenKey = `token:${token.substring(0, 10)}:${token.length}:${token.substring(token.length - 10)}`;
        tokenValidationCache.delete(tokenKey);
    }
}

/**
 * Get cache statistics
 * @returns {object} - Stats for both caches
 */
function getCacheStats() {
    return {
        profiles: userProfileCache.stats(),
        tokens: tokenValidationCache.stats()
    };
}

/**
 * Clear all caches
 */
function clearAllCaches() {
    userProfileCache.clear();
    tokenValidationCache.clear();
}

module.exports = {
    // Profile cache
    getCachedProfile,
    cacheProfile,
    invalidateProfile,

    // Token cache
    getCachedTokenValidation,
    cacheTokenValidation,

    // Utility
    invalidateUser,
    getCacheStats,
    clearAllCaches,

    // Export classes for testing
    LRUCache
};
