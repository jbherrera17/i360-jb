/**
 * Theme Toggle System v2.1.4
 * Insight 360 - Dark/Light Mode
 * 
 * Features:
 * - Immediate theme application (prevents flash)
 * - localStorage persistence
 * - System preference detection
 * - Cross-page synchronization
 * - Multiple toggle support per page
 */

(function() {
    'use strict';

    const STORAGE_KEY = 'insight360-theme';
    const DARK_THEME = 'dark';
    const LIGHT_THEME = 'light';

    /**
     * Get the stored theme or system preference
     */
    function getPreferredTheme() {
        // Check localStorage first
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && (stored === DARK_THEME || stored === LIGHT_THEME)) {
            return stored;
        }
        
        // Fall back to system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return LIGHT_THEME;
        }
        
        // Default to dark
        return DARK_THEME;
    }

    /**
     * Apply theme to document immediately
     */
    function applyTheme(theme) {
        // Apply to HTML element for immediate effect
        document.documentElement.setAttribute('data-theme', theme);
        
        // Store preference
        localStorage.setItem(STORAGE_KEY, theme);
        
        // Update all toggle checkboxes on the page
        updateAllToggles(theme);
        
        // Dispatch event for any listeners
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
        
        console.log(`[Theme] Applied: ${theme}`);
    }

    /**
     * Update all theme toggle checkboxes
     */
    function updateAllToggles(theme) {
        const toggles = document.querySelectorAll('.theme-toggle input[type="checkbox"], #themeToggle');
        toggles.forEach(toggle => {
            toggle.checked = (theme === LIGHT_THEME);
        });
    }

    /**
     * Toggle between themes
     */
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || DARK_THEME;
        const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
        applyTheme(newTheme);
        return newTheme;
    }

    /**
     * Initialize toggle event listeners
     */
    function initializeToggles() {
        // Find all theme toggles
        const toggles = document.querySelectorAll('.theme-toggle input[type="checkbox"], #themeToggle');
        
        toggles.forEach(toggle => {
            // Remove existing listener to prevent duplicates
            toggle.removeEventListener('change', handleToggleChange);
            
            // Add new listener
            toggle.addEventListener('change', handleToggleChange);
            
            // Set initial state
            const currentTheme = document.documentElement.getAttribute('data-theme') || DARK_THEME;
            toggle.checked = (currentTheme === LIGHT_THEME);
        });
    }

    /**
     * Handle toggle change event
     */
    function handleToggleChange(e) {
        const newTheme = e.target.checked ? LIGHT_THEME : DARK_THEME;
        applyTheme(newTheme);
    }

    /**
     * Listen for storage changes (cross-tab sync)
     */
    function initializeStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                applyTheme(e.newValue);
            }
        });
    }

    /**
     * Listen for system preference changes
     */
    function initializeSystemPreferenceListener() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
            mediaQuery.addEventListener('change', (e) => {
                // Only auto-switch if user hasn't manually set a preference
                const stored = localStorage.getItem(STORAGE_KEY);
                if (!stored) {
                    applyTheme(e.matches ? LIGHT_THEME : DARK_THEME);
                }
            });
        }
    }

    /**
     * Create theme toggle HTML
     * Call this to dynamically add a toggle to any element
     */
    function createToggleHTML() {
        return `
            <div class="theme-toggle-wrapper">
                <label class="theme-toggle" title="Toggle dark/light mode">
                    <input type="checkbox" class="theme-toggle-input">
                    <span class="theme-toggle-slider">
                        <span class="theme-toggle-icon moon">🌙</span>
                        <span class="theme-toggle-icon sun">☀️</span>
                    </span>
                </label>
            </div>
        `;
    }

    /**
     * Add toggle to an element by selector
     */
    function addToggleTo(selector, position = 'beforeend') {
        const element = document.querySelector(selector);
        if (element) {
            element.insertAdjacentHTML(position, createToggleHTML());
            initializeToggles();
            return true;
        }
        return false;
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================

    // Apply theme IMMEDIATELY (before DOM ready) to prevent flash
    applyTheme(getPreferredTheme());

    // When DOM is ready, set up event listeners
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeToggles();
            initializeStorageListener();
            initializeSystemPreferenceListener();
        });
    } else {
        // DOM already loaded
        initializeToggles();
        initializeStorageListener();
        initializeSystemPreferenceListener();
    }

    // Expose API globally
    window.InsightTheme = {
        toggle: toggleTheme,
        set: applyTheme,
        get: () => document.documentElement.getAttribute('data-theme') || DARK_THEME,
        createToggleHTML: createToggleHTML,
        addToggleTo: addToggleTo,
        DARK: DARK_THEME,
        LIGHT: LIGHT_THEME
    };

})();
