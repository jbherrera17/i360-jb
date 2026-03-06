/**
 * Insight 360 - Authenticated Fetch with Token Auto-Refresh
 *
 * Provides window.authFetch() as a drop-in replacement for fetch() that:
 *  1. Attaches Authorization header from localStorage token
 *  2. On 401, attempts to refresh via /api/auth/refresh
 *  3. Retries the original request once with the new token
 *  4. Redirects to login if refresh also fails
 *
 * Also runs a proactive refresh timer so tokens are renewed before expiry.
 *
 * Loaded dynamically by navigation.js on all authenticated pages.
 *
 * Version: 1.0.0
 */

// Guard against double-loading (navigation.js may run twice)
if (typeof window.AuthFetch !== 'undefined') {
    // Already loaded — skip re-declaration
} else {

window.AuthFetch = (function () {
    'use strict';

    const TOKEN_KEY    = 'insight360_token';
    const EXPIRY_KEY   = 'insight360_token_expires_at';

    let _refreshPromise = null; // Dedup concurrent refresh calls
    let _refreshTimer   = null;
    let _initialized    = false;

    // ====================================================================
    // Public API
    // ====================================================================

    /**
     * Authenticated fetch with automatic 401 retry.
     * Same signature as window.fetch().
     */
    async function authFetch(url, options) {
        options = options || {};
        const token = localStorage.getItem(TOKEN_KEY);

        if (!token) {
            _redirectToLogin();
            throw new Error('Not authenticated');
        }

        // Merge Authorization header (preserve caller's headers like Content-Type)
        options.headers = Object.assign(
            { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            options.headers || {}
        );

        var response = await fetch(url, options);

        // If 401, try refreshing once then retry
        if (response.status === 401) {
            var refreshed = await _tryRefresh();
            if (refreshed) {
                var newToken = localStorage.getItem(TOKEN_KEY);
                options.headers['Authorization'] = 'Bearer ' + newToken;
                response = await fetch(url, options);
            }

            // Still 401 after refresh attempt — session is dead
            if (response.status === 401) {
                _redirectToLogin();
                throw new Error('Session expired');
            }
        }

        return response;
    }

    /**
     * Initialize proactive refresh timer.
     * Call once after login or on page load.
     */
    function init() {
        if (_initialized) return;
        _initialized = true;
        _scheduleProactiveRefresh();
    }

    // ====================================================================
    // Token Refresh
    // ====================================================================

    /**
     * Attempt to refresh the access token.
     * Deduplicates concurrent calls (e.g. multiple parallel fetches all hit 401).
     * Returns true if refresh succeeded.
     */
    function _tryRefresh() {
        if (_refreshPromise) return _refreshPromise;

        _refreshPromise = _doRefresh().finally(function () {
            _refreshPromise = null;
        });

        return _refreshPromise;
    }

    async function _doRefresh() {
        try {
            var res = await fetch('/api/auth/refresh', {
                method: 'POST',
                credentials: 'same-origin' // send HttpOnly cookies
            });

            if (!res.ok) return false;

            var data = await res.json();
            if (!data.success || !data.access_token) return false;

            // Update localStorage with new token
            localStorage.setItem(TOKEN_KEY, data.access_token);
            if (data.expires_at) {
                localStorage.setItem(EXPIRY_KEY, String(data.expires_at));
            }

            // Reschedule proactive refresh
            _scheduleProactiveRefresh();

            return true;
        } catch (e) {
            console.warn('AuthFetch: token refresh failed', e);
            return false;
        }
    }

    // ====================================================================
    // Proactive Refresh Timer
    // ====================================================================

    function _scheduleProactiveRefresh() {
        if (_refreshTimer) {
            clearTimeout(_refreshTimer);
            _refreshTimer = null;
        }

        var expiresAt = Number(localStorage.getItem(EXPIRY_KEY));
        if (!expiresAt) return;

        // expires_at from Supabase is Unix epoch in seconds
        var expiresMs = expiresAt * 1000;
        var now = Date.now();
        var ttl = expiresMs - now;

        if (ttl <= 0) {
            // Already expired — refresh immediately
            _tryRefresh();
            return;
        }

        // Refresh at 80% of remaining TTL (e.g. 48 min into a 60-min token)
        var refreshIn = Math.max(ttl * 0.8, 30000); // at least 30s from now
        _refreshTimer = setTimeout(function () {
            _tryRefresh();
        }, refreshIn);
    }

    // ====================================================================
    // Helpers
    // ====================================================================

    function _redirectToLogin() {
        // Avoid redirect loops on the login page itself
        if (window.location.pathname.includes('/login')) return;

        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EXPIRY_KEY);
        localStorage.removeItem('insight360_user');
        document.cookie = 'auth_token=; path=/; max-age=0';
        window.location.href = '/login.html?expired=true';
    }

    // ====================================================================
    // Expose
    // ====================================================================

    return {
        fetch: authFetch,
        init: init
    };
})();

// Expose globally
window.authFetch = window.AuthFetch.fetch;

} // end double-load guard
