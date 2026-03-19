/**
 * AuthFetch Loader - Synchronous loader for authenticated fetch
 *
 * Include this script tag in any HTML page to ensure authFetch() is available
 * BEFORE DOMContentLoaded fires. This prevents the race condition where
 * page init code calls raw fetch() because auth-fetch.js hasn't loaded yet.
 *
 * Usage (in HTML <head>):
 *   <script src="/js/auth-fetch-loader.js"></script>
 *
 * Then in page scripts:
 *   const resp = await authFetch('/api/some-endpoint');
 *
 * Phase 82: Multi-tenant data isolation hardening
 */
(function () {
    'use strict';

    // If authFetch is already available (e.g., navigation.js loaded it), skip
    if (typeof window.authFetch === 'function') return;

    // Synchronously load auth-fetch.js by injecting a blocking script
    // This ensures authFetch is defined before any DOMContentLoaded handlers run
    var script = document.createElement('script');
    script.src = '/js/auth-fetch.js';
    script.async = false; // blocking — ensures script executes before subsequent scripts
    document.head.appendChild(script);
})();
