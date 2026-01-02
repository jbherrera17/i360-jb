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
        { href: '/', icon: 'layout-dashboard', label: 'Dashboard' },
        { href: '/chat.html', icon: 'message-square', label: 'Multi-LLM Chat' },
        { href: '/agents.html', icon: 'bot', label: 'Agent Library' }
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
            label: 'Strategy',
            icon: 'target',
            items: [
                { href: '/align120.html', icon: 'compass', label: 'Align 120' },
                { href: '/strategy.html', icon: 'milestone', label: 'Strategy (S2E)' },
                { href: '/strategy120.html', icon: 'brain', label: 'Strategy 120' }
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
                { href: '/prompt-editor.html', icon: 'file-code', label: 'Prompt Transformer' }
            ]
        },
        {
            id: 'tools',
            label: 'Tools',
            icon: 'wrench',
            items: [
                { href: '/parthenon.html', icon: 'landmark', label: 'Parthenon' },
                { href: '/briefing.html', icon: 'newspaper', label: 'Briefing' },
                { href: '/guides.html', icon: 'book-open', label: 'Guides' }
            ]
        },
        {
            id: 'admin',
            label: 'Administration',
            icon: 'settings',
            adminOnly: true,
            items: [
                { href: '/admin.html', icon: 'users', label: 'User Management' }
            ]
        }
    ]
};

// Flatten all items for path matching
const allNavItems = [
    ...navConfig.primary,
    ...navConfig.groups.flatMap(g => g.items)
];

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
 * Get current user role from localStorage
 */
function getCurrentUserRole() {
    try {
        const userData = localStorage.getItem('insight360_user');
        if (userData) {
            const user = JSON.parse(userData);
            return user.role || 'user';
        }
    } catch (e) {
        console.warn('Could not parse user data');
    }
    return 'user';
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
 */
function generateNavHTML() {
    const activePath = getActivePath();
    const activeGroup = getActiveGroup();
    const userRole = getCurrentUserRole();
    const collapsed = getCollapsedGroups();

    let html = '';

    // Primary items (always visible)
    html += '<div class="nav-section nav-primary">';
    navConfig.primary.forEach(item => {
        html += generateNavItemHTML(item, activePath);
    });
    html += '</div>';

    // Grouped items
    html += '<div class="nav-section nav-groups">';

    navConfig.groups
        .filter(group => !group.adminOnly || userRole === 'admin')
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
 * Generate full sidebar HTML
 */
function generateSidebarHTML() {
    return `
        <div class="sidebar-header">
            <a href="/" class="logo">
                <img src="/assets/I360-180T.png" alt="Insight 360" class="logo-image" onerror="this.style.display='none'">
                <span class="logo-text">Insight 360</span>
            </a>
        </div>
        <nav class="sidebar-nav">
            ${generateNavHTML()}
        </nav>
        <div class="sidebar-footer">
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
function initNavigation() {
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

    // Inject navigation
    sidebar.innerHTML = generateSidebarHTML();

    // Re-initialize Lucide icons if available
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Update theme toggle icon based on current theme
    updateThemeToggleIcon();
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
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        const href = item.getAttribute('href');
        item.classList.toggle('active', href === activePath);
    });

    // Expand group containing active item
    if (activeGroup) {
        const groupEl = document.querySelector(`[data-nav-group="${activeGroup}"]`);
        if (groupEl) {
            groupEl.classList.remove('collapsed');
        }
    }
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
window.toggleTheme = toggleTheme;
window.updateThemeToggleIcon = updateThemeToggleIcon;

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
