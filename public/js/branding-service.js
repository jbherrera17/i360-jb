/**
 * Branding Service - Runtime white-label branding injection
 *
 * Loads org branding from the API and applies it to the DOM:
 * - CSS custom properties for colors, fonts
 * - Sidebar logo/name updates
 * - Favicon and page title
 * - AI assistant name/avatar for chat
 *
 * Usage: await BrandingService.load()  (called automatically by navigation.js)
 */
const BrandingService = (() => {
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    let _branding = null;
    let _loaded = false;

    function _getOrgId() {
        return localStorage.getItem('currentOrgId');
    }

    function _getCacheKey() {
        const orgId = _getOrgId();
        return orgId ? `insight360_branding_${orgId}` : null;
    }

    function _getFromCache() {
        const key = _getCacheKey();
        if (!key) return null;
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return null;
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp > CACHE_TTL) {
                localStorage.removeItem(key);
                return null;
            }
            return data;
        } catch {
            return null;
        }
    }

    function _saveToCache(data) {
        const key = _getCacheKey();
        if (!key) return;
        try {
            localStorage.setItem(key, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch { /* quota exceeded — ignore */ }
    }

    function _getAuthToken() {
        const token = localStorage.getItem('insight360_token') || localStorage.getItem('auth_token');
        if (token) return token;
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'auth_token') return value;
        }
        return null;
    }

    async function _fetchBranding() {
        const orgId = _getOrgId();
        if (!orgId) return null;

        const token = _getAuthToken();
        if (!token) return null;

        try {
            const response = await fetch(`/api/org-customization/${orgId}/branding`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) return null;
            const result = await response.json();
            return result.success ? result.data : null;
        } catch {
            return null;
        }
    }

    function _applyColors(branding) {
        const root = document.documentElement;
        const colorMap = {
            primary_color: '--primary',
            secondary_color: '--secondary',
            accent_color: '--accent',
            sidebar_color: '--sidebar-bg'
        };

        for (const [field, cssVar] of Object.entries(colorMap)) {
            if (branding[field]) {
                root.style.setProperty(cssVar, branding[field]);
            }
        }

        // Generate hover/muted variants from primary
        if (branding.primary_color) {
            root.style.setProperty('--primary-hover', _adjustBrightness(branding.primary_color, -15));
            root.style.setProperty('--primary-muted', branding.primary_color + '26'); // ~15% opacity
        }
    }

    function _adjustBrightness(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + percent));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
        const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
        return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function _applyFonts(branding) {
        const root = document.documentElement;

        if (branding.heading_font) {
            root.style.setProperty('--font-heading', `'${branding.heading_font}', sans-serif`);
            _loadGoogleFont(branding.heading_font);
        }
        if (branding.body_font) {
            root.style.setProperty('--font-body', `'${branding.body_font}', sans-serif`);
            _loadGoogleFont(branding.body_font);
        }
        if (branding.font_size_base) {
            root.style.setProperty('--font-size-base', branding.font_size_base);
        }
    }

    function _loadGoogleFont(fontName) {
        // Don't load fonts already in the page
        const existingLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
        for (const link of existingLinks) {
            if (link.href.includes(fontName.replace(/\s+/g, '+'))) return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700&display=swap`;
        document.head.appendChild(link);
    }

    function _updateSidebar(branding) {
        // Update logo
        const logoImg = document.querySelector('.sidebar .logo-image');
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';

        if (logoImg) {
            const logoUrl = (currentTheme === 'dark' && branding.logo_dark_url)
                ? branding.logo_dark_url
                : branding.logo_url;
            if (logoUrl) {
                logoImg.src = logoUrl;
                logoImg.alt = branding.app_name || 'Insight 360';
                logoImg.style.display = '';
            }
        }

        // Update app name
        const logoText = document.querySelector('.sidebar .logo-text');
        if (logoText && branding.app_name) {
            logoText.textContent = branding.app_name;
        }
    }

    function _updateFavicon(branding) {
        if (!branding.favicon_url) return;

        let link = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = branding.favicon_url;
    }

    function _updatePageTitle(branding) {
        if (!branding.app_name) return;
        const title = document.title;
        if (title.includes('Insight 360')) {
            document.title = title.replace('Insight 360', branding.app_name);
        } else if (title.includes('| ')) {
            // Replace suffix after |
            document.title = title.replace(/\|[^|]+$/, `| ${branding.app_name}`);
        }
    }

    // Public API
    return {
        /**
         * Load branding for the current org and apply to the page.
         * Loads from cache first, then refreshes from API in background.
         */
        async load() {
            const orgId = _getOrgId();
            if (!orgId) return;

            // Try cache first for instant render
            const cached = _getFromCache();
            if (cached) {
                _branding = cached;
                this.apply();
            }

            // Fetch fresh data from API
            const fresh = await _fetchBranding();
            if (fresh) {
                _branding = fresh;
                _saveToCache(fresh);
                this.apply();
            }

            _loaded = true;
        },

        /**
         * Apply current branding to the DOM
         */
        apply() {
            if (!_branding) return;
            _applyColors(_branding);
            _applyFonts(_branding);
            _updateSidebar(_branding);
            _updateFavicon(_branding);
            _updatePageTitle(_branding);
        },

        /**
         * Re-apply sidebar branding (e.g., after theme toggle for dark/light logo swap)
         */
        updateSidebar() {
            if (_branding) _updateSidebar(_branding);
        },

        /**
         * Get custom AI assistant name or default
         */
        getAssistantName() {
            return _branding?.ai_assistant_name || 'Higgins';
        },

        /**
         * Get custom AI assistant avatar URL or default
         */
        getAssistantAvatar() {
            return _branding?.ai_assistant_avatar_url || '/assets/25-08-20 - Higgins Mona Lisa Smile-T.png';
        },

        /**
         * Get custom app name or default
         */
        getAppName() {
            return _branding?.app_name || 'Insight 360';
        },

        /**
         * Get custom tagline or default
         */
        getTagline() {
            return _branding?.app_tagline || 'AI-Powered Command Center';
        },

        /**
         * Get custom welcome message or default
         */
        getWelcomeMessage() {
            return _branding?.portal_welcome_message || null;
        },

        /**
         * Get the raw branding data
         */
        getBranding() {
            return _branding;
        },

        /**
         * Whether branding has been loaded
         */
        isLoaded() {
            return _loaded;
        },

        /**
         * Clear cached branding (e.g., after saving new branding)
         */
        clearCache() {
            const key = _getCacheKey();
            if (key) localStorage.removeItem(key);
            _branding = null;
            _loaded = false;
        }
    };
})();
