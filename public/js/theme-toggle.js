/**
 * Theme Toggle - Dark/Light Mode
 * Insight 360 v2.1.3
 * 
 * Handles theme switching and persists preference in localStorage
 */

(function() {
    'use strict';

    const STORAGE_KEY = 'insight360-theme';
    const DARK_THEME = 'dark';
    const LIGHT_THEME = 'light';

    /**
     * Get the current theme from localStorage or system preference
     */
    function getStoredTheme() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return stored;
        }
        
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return LIGHT_THEME;
        }
        
        return DARK_THEME; // Default to dark
    }

    /**
     * Apply theme to document
     */
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        // Update toggle checkbox if it exists
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.checked = (theme === LIGHT_THEME);
        }
        
        // Store preference
        localStorage.setItem(STORAGE_KEY, theme);
        
        console.log(`Theme set to: ${theme}`);
    }

    /**
     * Toggle between dark and light themes
     */
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || DARK_THEME;
        const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
        applyTheme(newTheme);
    }

    /**
     * Initialize theme on page load
     */
    function initTheme() {
        // Apply stored theme immediately (before DOM ready to prevent flash)
        const theme = getStoredTheme();
        applyTheme(theme);
    }

    /**
     * Set up toggle event listener
     */
    function setupToggle() {
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.addEventListener('change', function() {
                const newTheme = this.checked ? LIGHT_THEME : DARK_THEME;
                applyTheme(newTheme);
            });
        }
    }

    /**
     * Listen for system theme changes
     */
    function watchSystemTheme() {
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
                // Only auto-switch if user hasn't manually set a preference
                if (!localStorage.getItem(STORAGE_KEY)) {
                    applyTheme(e.matches ? LIGHT_THEME : DARK_THEME);
                }
            });
        }
    }

    // Initialize theme immediately
    initTheme();

    // Set up toggle and system watcher when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setupToggle();
            watchSystemTheme();
        });
    } else {
        setupToggle();
        watchSystemTheme();
    }

    // Expose toggle function globally if needed
    window.toggleTheme = toggleTheme;
})();
