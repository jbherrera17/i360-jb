/**
 * Insight 360 - Session Timeout Manager
 * Auto-logout after inactivity with warning modal and cross-tab sync.
 * Loaded dynamically by navigation.js on all authenticated pages.
 *
 * Version: 1.0.0
 */

const SessionTimeout = (function () {
    'use strict';

    // ========================================================================
    // Configuration
    // ========================================================================
    const TIMEOUT_MS  = 30 * 60 * 1000;   // 30 minutes of inactivity
    const WARNING_MS  = 2 * 60 * 1000;    // Show warning 2 min before timeout
    const THROTTLE_MS = 1000;              // Throttle activity resets to 1/sec
    const STREAMING_DEFER_MS = 30 * 1000;  // Defer warning 30s while streaming

    const STORAGE_ACTIVITY_KEY = 'insight360_last_activity';
    const STORAGE_TOKEN_KEY    = 'insight360_token';

    // ========================================================================
    // State
    // ========================================================================
    let _timeoutTimer     = null;
    let _warningTimer     = null;
    let _countdownInterval = null;
    let _warningVisible   = false;
    let _lastThrottle     = 0;
    let _initialized      = false;
    let _warningOverlay   = null;

    const ACTIVITY_EVENTS = [
        'mousemove', 'mousedown', 'keydown',
        'scroll', 'touchstart', 'wheel'
    ];

    // ========================================================================
    // Public API
    // ========================================================================

    function init() {
        if (_initialized) return;

        // Skip on login page
        if (window.location.pathname.includes('/login')) return;

        // Skip if not authenticated
        if (!localStorage.getItem(STORAGE_TOKEN_KEY)) return;

        // Attach throttled activity listeners
        ACTIVITY_EVENTS.forEach(function (evt) {
            document.addEventListener(evt, _onActivity, { passive: true });
        });
        window.addEventListener('scroll', _onActivity, { passive: true });

        // Cross-tab sync
        window.addEventListener('storage', _onStorageChange);

        // Set initial activity timestamp
        _setActivityTimestamp();

        // Start timers
        _resetTimers();

        _initialized = true;
    }

    function destroy() {
        if (!_initialized) return;

        ACTIVITY_EVENTS.forEach(function (evt) {
            document.removeEventListener(evt, _onActivity);
        });
        window.removeEventListener('scroll', _onActivity);
        window.removeEventListener('storage', _onStorageChange);

        _clearAllTimers();
        _hideWarning();

        _initialized = false;
    }

    // ========================================================================
    // Activity Tracking
    // ========================================================================

    function _onActivity() {
        var now = Date.now();
        if (now - _lastThrottle < THROTTLE_MS) return;
        _lastThrottle = now;

        _setActivityTimestamp();

        if (_warningVisible) {
            _hideWarning();
        }

        _resetTimers();
    }

    function _setActivityTimestamp() {
        try {
            localStorage.setItem(STORAGE_ACTIVITY_KEY, String(Date.now()));
        } catch (e) { /* localStorage full or unavailable */ }
    }

    // ========================================================================
    // Timer Management
    // ========================================================================

    function _resetTimers() {
        _clearAllTimers();

        _warningTimer = setTimeout(function () {
            _tryShowWarning();
        }, TIMEOUT_MS - WARNING_MS);

        _timeoutTimer = setTimeout(function () {
            _performLogout();
        }, TIMEOUT_MS);
    }

    function _clearAllTimers() {
        if (_warningTimer)      { clearTimeout(_warningTimer);      _warningTimer = null; }
        if (_timeoutTimer)      { clearTimeout(_timeoutTimer);      _timeoutTimer = null; }
        if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null; }
    }

    // ========================================================================
    // Warning Modal
    // ========================================================================

    function _tryShowWarning() {
        // Defer if streaming is active (e.g. chat SSE)
        if (typeof window.isStreaming !== 'undefined' && window.isStreaming === true) {
            _warningTimer = setTimeout(_tryShowWarning, STREAMING_DEFER_MS);
            return;
        }
        _showWarning();
    }

    function _showWarning() {
        if (_warningVisible) return;
        _warningVisible = true;

        var deadline = Date.now() + WARNING_MS;

        // Build the fallback overlay (works everywhere, no ModalService dependency)
        _warningOverlay = _createWarningOverlay(deadline);
        document.body.appendChild(_warningOverlay);

        // Live countdown
        _countdownInterval = setInterval(function () {
            var remaining = Math.max(0, deadline - Date.now());
            var el = document.getElementById('st-countdown');
            if (el) {
                var mins = Math.floor(remaining / 60000);
                var secs = Math.floor((remaining % 60000) / 1000);
                el.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
            }
            if (remaining <= 0) {
                clearInterval(_countdownInterval);
                _countdownInterval = null;
            }
        }, 1000);
    }

    function _hideWarning() {
        _warningVisible = false;
        if (_countdownInterval) {
            clearInterval(_countdownInterval);
            _countdownInterval = null;
        }
        if (_warningOverlay && _warningOverlay.parentNode) {
            _warningOverlay.parentNode.removeChild(_warningOverlay);
        }
        _warningOverlay = null;
    }

    function _createWarningOverlay(deadline) {
        var remaining = Math.max(0, deadline - Date.now());
        var mins = Math.floor(remaining / 60000);
        var secs = Math.floor((remaining % 60000) / 1000);

        var overlay = document.createElement('div');
        overlay.id = 'session-timeout-warning';
        overlay.style.cssText = [
            'position: fixed',
            'inset: 0',
            'background: rgba(0,0,0,0.6)',
            'display: flex',
            'align-items: center',
            'justify-content: center',
            'z-index: 999999',
            'backdrop-filter: blur(4px)',
            'animation: st-fadein 0.2s ease'
        ].join(';');

        var card = document.createElement('div');
        card.style.cssText = [
            'background: var(--bg-secondary, #1a1a2e)',
            'border: 1px solid var(--border-color, #2a2a40)',
            'border-radius: 16px',
            'padding: 2rem',
            'max-width: 400px',
            'width: 90%',
            'text-align: center',
            'box-shadow: 0 20px 60px rgba(0,0,0,0.4)',
            'color: var(--text-primary, #fff)'
        ].join(';');

        card.innerHTML = [
            '<div style="margin-bottom:1rem;">',
            '  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--warning, #f59e0b);">',
            '    <circle cx="12" cy="12" r="10"/>',
            '    <polyline points="12 6 12 12 16 14"/>',
            '  </svg>',
            '</div>',
            '<h3 style="margin:0 0 0.5rem;font-size:1.25rem;font-weight:600;">Session Expiring</h3>',
            '<p style="margin:0 0 1.5rem;color:var(--text-secondary, #a0a0b0);font-size:0.95rem;">',
            '  Your session will expire due to inactivity in',
            '  <strong id="st-countdown" style="color:var(--warning, #f59e0b);font-variant-numeric:tabular-nums;">' + mins + ':' + (secs < 10 ? '0' : '') + secs + '</strong>',
            '</p>',
            '<div style="display:flex;gap:0.75rem;justify-content:center;">',
            '  <button id="st-stay-btn" style="',
            '    padding:0.6rem 1.5rem;',
            '    background:var(--primary, #6366f1);',
            '    color:#fff;',
            '    border:none;',
            '    border-radius:8px;',
            '    font-size:0.9rem;',
            '    font-weight:600;',
            '    cursor:pointer;',
            '    transition:opacity 0.2s;',
            '  ">Stay Logged In</button>',
            '  <button id="st-logout-btn" style="',
            '    padding:0.6rem 1.5rem;',
            '    background:transparent;',
            '    color:var(--text-secondary, #a0a0b0);',
            '    border:1px solid var(--border-color, #2a2a40);',
            '    border-radius:8px;',
            '    font-size:0.9rem;',
            '    font-weight:500;',
            '    cursor:pointer;',
            '    transition:all 0.2s;',
            '  ">Log Out Now</button>',
            '</div>'
        ].join('\n');

        overlay.appendChild(card);

        // Add fade-in keyframes
        var style = document.createElement('style');
        style.textContent = '@keyframes st-fadein { from { opacity: 0; } to { opacity: 1; } }';
        overlay.appendChild(style);

        // Button handlers
        setTimeout(function () {
            var stayBtn = document.getElementById('st-stay-btn');
            var logoutBtn = document.getElementById('st-logout-btn');

            if (stayBtn) {
                stayBtn.addEventListener('click', function () {
                    _hideWarning();
                    _onActivity();
                });
            }
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function () {
                    _performLogout();
                });
            }
        }, 0);

        return overlay;
    }

    // ========================================================================
    // Logout
    // ========================================================================

    function _performLogout() {
        _clearAllTimers();
        _hideWarning();
        _initialized = false;

        // Use existing handleLogout from navigation.js if available
        if (typeof window.handleLogout === 'function') {
            window.handleLogout();
            return;
        }

        // Fallback: manual cleanup
        try {
            fetch('/api/auth/logout', { method: 'POST' }).catch(function () {});
        } catch (e) { /* ignore */ }

        localStorage.removeItem('insight360_user');
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        localStorage.removeItem(STORAGE_ACTIVITY_KEY);
        localStorage.removeItem('insight360_org_id');
        localStorage.removeItem('insight360_org');
        document.cookie = 'auth_token=; path=/; max-age=0';
        window.location.href = '/login.html';
    }

    // ========================================================================
    // Cross-Tab Sync
    // ========================================================================

    function _onStorageChange(e) {
        // Another tab logged out — follow suit
        if (e.key === STORAGE_TOKEN_KEY && !e.newValue) {
            _clearAllTimers();
            _hideWarning();
            _initialized = false;
            window.location.href = '/login.html';
            return;
        }

        // Another tab registered activity — reset our timers
        if (e.key === STORAGE_ACTIVITY_KEY && e.newValue) {
            if (_warningVisible) {
                _hideWarning();
            }
            _resetTimers();
        }
    }

    // ========================================================================
    // Expose
    // ========================================================================

    return {
        init: init,
        destroy: destroy,
        resetTimers: _resetTimers
    };
})();
