/**
 * Insight 360 - Shared Navigation Component
 * Injects consistent sidebar navigation across all pages
 *
 * Features:
 * - Collapsible category groups
 * - Primary items always visible
 * - Role-based visibility (admin items)
 * - Persistent collapse state via localStorage
 *
 * Usage:
 * 1. Include this script in your page: <script src="/js/navigation.js"></script>
 * 2. Have a <aside class="sidebar"></aside> element in your page
 * 3. The navigation will be auto-injected on DOMContentLoaded
 */

// Navigation structure with categories
const navConfig = {
    // Primary items - always visible at top level
    primary: [
        { href: '/chat.html', icon: 'graduation-cap', label: 'Higgins' },
        { href: '/', icon: 'layout-dashboard', label: 'Dashboard' },
        { href: '/agents.html', icon: 'bot', label: 'Agent Library' },
        { href: '/strategy120.html', icon: 'brain', label: 'Strategy Agents' }
    ],

    // Grouped items - collapsible categories
    groups: [
        {
            id: 'dashboards',
            label: 'Dashboards',
            icon: 'gauge',
            items: [
                { href: '/company-dashboard.html', icon: 'building', label: 'Company' },
                { href: '/strategy-governance.html', icon: 'shield-check', label: 'Governance' },
                { href: '/integrity.html', icon: 'activity', label: 'Integrity' }
            ]
        },
        {
            id: 'strategy',
            label: 'I360 Systems',
            icon: 'target',
            items: [
                { href: '/align120.html', icon: 'compass', label: 'Align 120' },
                { href: '/strategy.html', icon: 'milestone', label: 'Strategy (S2E)' },
                { href: '/execute120.html', icon: 'rocket', label: 'Execute 120' }
            ]
        },
        {
            id: 'components',
            label: 'Components',
            icon: 'puzzle',
            items: [
                { href: '/context.html', icon: 'database', label: 'Context Assets' },
                { href: '/actions.html', icon: 'zap', label: 'Actions' },
                { href: '/skills.html', icon: 'wand-2', label: 'Skills' },
                { href: '/workflows.html', icon: 'git-branch', label: 'Workflows' },
                { href: '/prompt-editor.html', icon: 'file-code', label: 'Prompt Transformer' }
            ]
        },
        {
            id: 'tools',
            label: 'Modules',
            icon: 'wrench',
            items: [
                { href: '/research-studio.html', icon: 'book-open-text', label: 'Research Studio' },
                { href: '/briefing.html', icon: 'newspaper', label: 'Briefing' },
                { href: '/thought-leadership.html', icon: 'lightbulb', label: 'Thought Leadership' },
                { href: '/guides.html', icon: 'book-open', label: 'Guides' }
            ]
        },
        {
            id: 'agency',
            label: 'Agency',
            icon: 'building',
            adminOnly: true,
            items: [
                { href: '/agency-dashboard.html', icon: 'gauge', label: 'Agency Dashboard' },
                { href: '/admin-org-customization.html', icon: 'palette', label: 'Customization' },
                { href: '/admin-client-users.html', icon: 'user-check', label: 'Portal Users' },
                { href: '/client-comparison.html', icon: 'bar-chart-3', label: 'Client Comparison' }
            ]
        },
        {
            id: 'admin',
            label: 'Administration',
            icon: 'settings',
            adminOnly: true,
            items: [
                { href: '/administrator.html', icon: 'shield', label: 'Administrator' },
                { href: '/admin-resource-access.html', icon: 'shield-check', label: 'Resource Access' },
                { href: '/my-capabilities.html', icon: 'sparkles', label: 'My Capabilities' }
            ]
        }
    ]
};

// Flatten all items for path matching (from static config)
let allNavItems = [
    ...navConfig.primary,
    ...navConfig.groups.flatMap(g => g.items)
];

// Dynamic navigation state
let dynamicNavConfig = null;
let modulesLoaded = false;

/**
 * Fetch accessible modules from API
 * Returns grouped modules for navigation
 */
async function fetchAccessibleModules() {
    try {
        const token = localStorage.getItem('insight360_token');
        if (!token) {
            console.log('Navigation: No auth token, using static nav');
            return null;
        }

        const orgId = localStorage.getItem('insight360_org_id');
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        if (orgId) {
            headers['x-org-id'] = orgId;
        }

        const response = await fetch('/api/modules', { headers });

        if (!response.ok) {
            console.warn('Navigation: Failed to fetch modules, using static nav');
            return null;
        }

        const result = await response.json();
        if (!result.success || !result.data) {
            return null;
        }

        return result.data;
    } catch (error) {
        console.warn('Navigation: Error fetching modules:', error);
        return null;
    }
}

/**
 * Convert API modules to navigation config format
 */
function convertModulesToNavConfig(modulesData) {
    const modules = modulesData.modules || [];
    const grouped = modulesData.grouped || {};

    // Map nav_group to our group structure
    const groupMap = {
        'primary': { id: 'primary', label: 'Primary', items: [] },
        'dashboards': { id: 'dashboards', label: 'Dashboards', icon: 'gauge', items: [] },
        'systems': { id: 'systems', label: 'I360 Systems', icon: 'target', items: [] },
        'components': { id: 'components', label: 'Components', icon: 'puzzle', items: [] },
        'tools': { id: 'tools', label: 'Modules', icon: 'wrench', items: [] },
        'agency': { id: 'agency', label: 'Agency', icon: 'building', items: [] },
        'admin': { id: 'admin', label: 'Administration', icon: 'settings', items: [] }
    };

    // Convert modules to nav items
    modules.forEach(module => {
        const navItem = {
            href: module.route_path,
            icon: module.icon || 'circle',
            label: module.module_name,
            moduleId: module.module_id,
            isBeta: module.is_beta
        };

        const group = module.nav_group || 'other';
        if (groupMap[group]) {
            groupMap[group].items.push(navItem);
        } else {
            // Add to components as fallback
            groupMap.components.items.push(navItem);
        }
    });

    // Build config
    const primary = groupMap.primary.items;
    const groups = Object.values(groupMap)
        .filter(g => g.id !== 'primary' && g.items.length > 0);

    return { primary, groups };
}

/**
 * Get current organization ID from localStorage
 */
function getCurrentOrgId() {
    try {
        return localStorage.getItem('insight360_org_id');
    } catch (e) {
        return null;
    }
}

/**
 * Get current organization tier from localStorage
 */
function getCurrentTier() {
    try {
        const orgData = localStorage.getItem('insight360_org');
        if (orgData) {
            const org = JSON.parse(orgData);
            return org.subscription_tier || 'starter';
        }
    } catch (e) {
        // Ignore
    }
    return 'starter';
}

/**
 * Determine which nav item is active based on current path
 */
function getActivePath() {
    const path = window.location.pathname;

    // Exact match first
    const exactMatch = allNavItems.find(item => item.href === path);
    if (exactMatch) return exactMatch.href;

    // Handle .html variations
    const pathWithHtml = path.endsWith('.html') ? path : path + '.html';
    const htmlMatch = allNavItems.find(item => item.href === pathWithHtml);
    if (htmlMatch) return htmlMatch.href;

    // Handle index variations
    if (path === '/' || path === '/index.html') return '/';

    // Partial match for nested routes
    const partialMatch = allNavItems.find(item =>
        item.href !== '/' && path.startsWith(item.href.replace('.html', ''))
    );
    if (partialMatch) return partialMatch.href;

    return null;
}

/**
 * Get which group contains the active item
 */
function getActiveGroup() {
    const activePath = getActivePath();
    if (!activePath) return null;

    for (const group of navConfig.groups) {
        if (group.items.some(item => item.href === activePath)) {
            return group.id;
        }
    }
    return null;
}

/**
 * Get current user data from localStorage
 */
function getCurrentUser() {
    try {
        const userData = localStorage.getItem('insight360_user');
        if (userData) {
            return JSON.parse(userData);
        }
    } catch (e) {
        console.warn('Could not parse user data');
    }
    return null;
}

/**
 * Get current user role from localStorage
 */
function getCurrentUserRole() {
    const user = getCurrentUser();
    return user?.role || 'user';
}

/**
 * Get user initials for avatar
 */
function getUserInitials(user) {
    if (!user) return '?';
    if (user.display_name) {
        const parts = user.display_name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return parts[0].substring(0, 2).toUpperCase();
    }
    if (user.email) {
        return user.email.substring(0, 2).toUpperCase();
    }
    return '?';
}

/**
 * Handle user logout
 */
async function handleLogout() {
    try {
        // Call logout API
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
        console.warn('Logout API call failed:', e);
    }
    // Clear local storage
    localStorage.removeItem('insight360_user');
    localStorage.removeItem('insight360_token');
    // Redirect to login
    window.location.href = '/login.html';
}

/**
 * Get sidebar collapsed state from localStorage
 */
function getSidebarCollapsed() {
    try {
        return localStorage.getItem('insight360_sidebar_collapsed') === 'true';
    } catch (e) {
        return false;
    }
}

/**
 * Save sidebar collapsed state to localStorage
 */
function saveSidebarCollapsed(collapsed) {
    try {
        localStorage.setItem('insight360_sidebar_collapsed', collapsed.toString());
    } catch (e) {
        console.warn('Could not save sidebar state');
    }
}

/**
 * Toggle sidebar collapsed state
 */
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    const isCollapsed = sidebar.classList.toggle('sidebar-collapsed');
    saveSidebarCollapsed(isCollapsed);

    // Update toggle button icon
    const toggleBtn = sidebar.querySelector('.sidebar-toggle-btn i');
    if (toggleBtn) {
        toggleBtn.setAttribute('data-lucide', isCollapsed ? 'panel-left-open' : 'panel-left-close');
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

/**
 * Get collapsed state from localStorage
 */
function getCollapsedGroups() {
    try {
        const state = localStorage.getItem('insight360_nav_collapsed');
        return state ? JSON.parse(state) : {};
    } catch (e) {
        return {};
    }
}

/**
 * Save collapsed state to localStorage
 */
function saveCollapsedGroups(collapsed) {
    try {
        localStorage.setItem('insight360_nav_collapsed', JSON.stringify(collapsed));
    } catch (e) {
        console.warn('Could not save nav state');
    }
}

/**
 * Toggle group collapse state
 */
function toggleNavGroup(groupId) {
    const collapsed = getCollapsedGroups();
    collapsed[groupId] = !collapsed[groupId];
    saveCollapsedGroups(collapsed);

    // Update UI
    const groupEl = document.querySelector(`[data-nav-group="${groupId}"]`);
    if (groupEl) {
        groupEl.classList.toggle('collapsed', collapsed[groupId]);
    }
}

/**
 * Generate navigation item HTML
 */
function generateNavItemHTML(item, activePath) {
    const isActive = item.href === activePath;
    return `
        <a href="${item.href}" class="nav-item${isActive ? ' active' : ''}">
            <i data-lucide="${item.icon}"></i>
            <span>${item.label}</span>
        </a>
    `;
}

/**
 * Generate navigation HTML with groups
 * Uses dynamic config if available, falls back to static config
 */
function generateNavHTML() {
    const activePath = getActivePath();
    const activeGroup = getActiveGroup();
    const userRole = getCurrentUserRole();
    const collapsed = getCollapsedGroups();

    // Use dynamic config if loaded, otherwise use static
    const config = modulesLoaded && dynamicNavConfig ? dynamicNavConfig : navConfig;

    let html = '';

    // Primary items (always visible)
    html += '<div class="nav-section nav-primary">';
    (config.primary || []).forEach(item => {
        html += generateNavItemHTML(item, activePath);
    });
    html += '</div>';

    // Grouped items
    html += '<div class="nav-section nav-groups">';

    (config.groups || [])
        .filter(group => {
            // For static config, check adminOnly
            if (!modulesLoaded && group.adminOnly && userRole !== 'admin') {
                return false;
            }
            // For dynamic config, modules are already filtered by the API
            return group.items && group.items.length > 0;
        })
        .forEach(group => {
            // Auto-expand if contains active item, otherwise use saved state
            const isExpanded = group.id === activeGroup || !collapsed[group.id];

            html += `
                <div class="nav-group${isExpanded ? '' : ' collapsed'}" data-nav-group="${group.id}">
                    <button class="nav-group-header" onclick="toggleNavGroup('${group.id}')">
                        <i data-lucide="${group.icon}" class="group-icon"></i>
                        <span class="group-label">${group.label}</span>
                        <i data-lucide="chevron-down" class="group-chevron"></i>
                    </button>
                    <div class="nav-group-items">
                        ${group.items.map(item => generateNavItemHTML(item, activePath)).join('')}
                    </div>
                </div>
            `;
        });

    html += '</div>';

    return html;
}

/**
 * Generate user profile HTML for sidebar
 */
function generateUserProfileHTML() {
    const user = getCurrentUser();

    if (!user) {
        return `
            <a href="/login.html" class="nav-item user-login-link">
                <i data-lucide="log-in"></i>
                <span>Sign In</span>
            </a>
        `;
    }

    const initials = getUserInitials(user);
    const displayName = user.display_name || user.email?.split('@')[0] || 'User';
    // Sanitize role to only allow alphanumeric characters (prevents XSS in class name)
    const role = (user.role || 'user').replace(/[^a-zA-Z0-9]/g, '');
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

    return `
        <div class="user-profile">
            <div class="user-avatar">${escapeHTML(initials)}</div>
            <div class="user-info">
                <span class="user-name">${escapeHTML(displayName)}</span>
                <span class="user-role ${escapeHTML(role)}">${escapeHTML(roleLabel)}</span>
            </div>
            <button class="user-menu-btn" onclick="toggleUserMenu()" title="User menu">
                <i data-lucide="more-vertical"></i>
            </button>
            <div class="user-menu" id="userMenu">
                <a href="/profile.html" class="user-menu-item">
                    <i data-lucide="user"></i>
                    <span>Profile</span>
                </a>
                <a href="/administrator.html" class="user-menu-item ${role !== 'admin' ? 'hidden' : ''}">
                    <i data-lucide="shield"></i>
                    <span>Administrator</span>
                </a>
                <a href="/" class="user-menu-item">
                    <i data-lucide="layout-dashboard"></i>
                    <span>Dashboard</span>
                </a>
                <button class="user-menu-item logout" onclick="handleLogout()">
                    <i data-lucide="log-out"></i>
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

/**
 * Toggle user menu visibility
 */
function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) {
        menu.classList.toggle('open');
    }
}

/**
 * Close user menu when clicking outside
 */
function setupUserMenuClose() {
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('userMenu');
        const btn = e.target.closest('.user-menu-btn');
        if (menu && !btn && !e.target.closest('.user-menu')) {
            menu.classList.remove('open');
        }
    });
}

/**
 * Generate full sidebar HTML
 */
function generateSidebarHTML() {
    const isCollapsed = getSidebarCollapsed();
    return `
        <div class="sidebar-header">
            <a href="/" class="logo">
                <img src="/assets/I360-180T.png" alt="Insight 360" class="logo-image" onerror="this.style.display='none'">
                <span class="logo-text">Insight 360</span>
            </a>
            <button class="sidebar-toggle-btn" onclick="toggleSidebar()" title="${isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}">
                <i data-lucide="${isCollapsed ? 'panel-left-open' : 'panel-left-close'}"></i>
            </button>
        </div>
        <nav class="sidebar-nav">
            ${generateNavHTML()}
        </nav>
        <div class="sidebar-footer">
            ${generateUserProfileHTML()}
            <button class="nav-item theme-toggle" id="sidebarThemeToggle" onclick="toggleTheme && toggleTheme()">
                <i data-lucide="moon"></i>
                <span>Toggle Theme</span>
            </button>
        </div>
    `;
}

/**
 * Initialize navigation
 * Call this after DOMContentLoaded
 */
async function initNavigation() {
    // Find sidebar element
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
        console.warn('Navigation: No .sidebar element found');
        return;
    }

    // Check if sidebar already has full content (don't override custom sidebars)
    if (sidebar.querySelector('.sidebar-nav .nav-group')) {
        // Just update active state
        updateActiveNavItem();
        return;
    }

    // Try to load dynamic modules from API
    try {
        const modulesData = await fetchAccessibleModules();
        if (modulesData && modulesData.modules && modulesData.modules.length > 0) {
            dynamicNavConfig = convertModulesToNavConfig(modulesData);
            modulesLoaded = true;

            // Update allNavItems for path matching
            allNavItems = [
                ...(dynamicNavConfig.primary || []),
                ...(dynamicNavConfig.groups || []).flatMap(g => g.items)
            ];

            console.log('Navigation: Loaded dynamic modules');
        }
    } catch (error) {
        console.warn('Navigation: Using static config due to error:', error);
    }

    // Inject navigation
    sidebar.innerHTML = generateSidebarHTML();

    // Apply saved collapsed state
    if (getSidebarCollapsed()) {
        sidebar.classList.add('sidebar-collapsed');
    }

    // Re-initialize Lucide icons if available
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Update theme toggle icon based on current theme
    updateThemeToggleIcon();

    // Setup user menu close on outside click
    setupUserMenuClose();

    // Setup scroll preservation for when lucide icons are replaced
    setupScrollPreservation();

    // Update active nav item and scroll into view
    updateActiveNavItem();
}

/**
 * Refresh navigation with latest modules from API
 * Can be called after tier change or module enable/disable
 */
async function refreshNavigation() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    try {
        const modulesData = await fetchAccessibleModules();
        if (modulesData && modulesData.modules) {
            dynamicNavConfig = convertModulesToNavConfig(modulesData);
            modulesLoaded = true;

            allNavItems = [
                ...(dynamicNavConfig.primary || []),
                ...(dynamicNavConfig.groups || []).flatMap(g => g.items)
            ];

            // Re-inject navigation
            sidebar.innerHTML = generateSidebarHTML();

            if (getSidebarCollapsed()) {
                sidebar.classList.add('sidebar-collapsed');
            }

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            updateThemeToggleIcon();
            updateActiveNavItem();
        }
    } catch (error) {
        console.warn('Navigation: Failed to refresh:', error);
    }
}

/**
 * Setup scroll preservation to maintain scroll position
 * when external code (like lucide.createIcons()) modifies sidebar content
 */
function setupScrollPreservation() {
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (!sidebarNav) return;

    // Use MutationObserver to detect when icons are replaced
    const observer = new MutationObserver(() => {
        // If we have a stored target scroll position, restore it
        const targetScroll = parseInt(sidebarNav.dataset.targetScroll);
        if (!isNaN(targetScroll) && targetScroll > 0) {
            // Use requestAnimationFrame to ensure DOM has settled
            requestAnimationFrame(() => {
                if (sidebarNav.scrollTop !== targetScroll) {
                    sidebarNav.scrollTop = targetScroll;
                }
            });
        }
    });

    // Observe changes to child elements (icon replacements)
    observer.observe(sidebarNav, {
        childList: true,
        subtree: true,
        attributes: false
    });

    // Also preserve scroll on manual user scrolling
    sidebarNav.addEventListener('scroll', () => {
        // Update the target scroll when user manually scrolls
        sidebarNav.dataset.targetScroll = sidebarNav.scrollTop;
    }, { passive: true });
}

/**
 * Update theme toggle icon
 */
function updateThemeToggleIcon() {
    const toggle = document.getElementById('sidebarThemeToggle');
    if (toggle) {
        const icon = toggle.querySelector('i');
        const isDark = document.body.classList.contains('dark-theme') ||
                       document.documentElement.getAttribute('data-theme') === 'dark';
        if (icon) {
            icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }
}

/**
 * Update active nav item (for SPA-style navigation)
 */
function updateActiveNavItem() {
    const activePath = getActivePath();
    const activeGroup = getActiveGroup();

    // Update item active states
    let activeItem = null;
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        const href = item.getAttribute('href');
        const isActive = href === activePath;
        item.classList.toggle('active', isActive);
        if (isActive) {
            activeItem = item;
        }
    });

    // Expand group containing active item
    if (activeGroup) {
        const groupEl = document.querySelector(`[data-nav-group="${activeGroup}"]`);
        if (groupEl) {
            groupEl.classList.remove('collapsed');
        }
    }

    // Scroll active item into view within sidebar-nav container
    if (activeItem) {
        // Wait for group expansion animation to complete before scrolling
        setTimeout(() => {
            scrollActiveItemIntoView(activeItem);
        }, 250); // Wait for group expand animation
    }
}

/**
 * Scroll the active nav item into view if it's not already visible
 * Only scrolls if item is outside the visible area of sidebar-nav
 */
function scrollActiveItemIntoView(activeItem) {
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (!sidebarNav || !activeItem) return;

    // Get positions relative to viewport
    const navRect = sidebarNav.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();

    // Check if item is already fully visible within the nav container
    const isVisible = itemRect.top >= navRect.top &&
                      itemRect.bottom <= navRect.bottom;

    if (isVisible) {
        // Item is already visible, no need to scroll
        return;
    }

    // Calculate how far to scroll to center the item
    const itemCenterY = itemRect.top + (itemRect.height / 2);
    const navCenterY = navRect.top + (navRect.height / 2);
    const scrollOffset = itemCenterY - navCenterY;

    // Apply scroll
    sidebarNav.scrollTop = Math.max(0, sidebarNav.scrollTop + scrollOffset);

    // Store the scroll position to restore if external events reset it
    sidebarNav.dataset.targetScroll = sidebarNav.scrollTop;
}

/**
 * Toggle theme between dark and light
 * This is the main theme toggle function used throughout the app
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('insight360-theme', newTheme);

    // Update toggle icon
    updateThemeToggleIcon();
}

// Apply saved theme immediately (before DOMContentLoaded)
(function() {
    const savedTheme = localStorage.getItem('insight360-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

// Make functions available globally
window.toggleNavGroup = toggleNavGroup;
window.toggleSidebar = toggleSidebar;
window.toggleTheme = toggleTheme;
window.updateThemeToggleIcon = updateThemeToggleIcon;
window.toggleUserMenu = toggleUserMenu;
window.handleLogout = handleLogout;

// Auto-initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initNavigation);

// Export for manual use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initNavigation,
        updateActiveNavItem,
        navConfig,
        toggleNavGroup,
        toggleTheme
    };
}
