/**
 * Insight 360 - Shared Navigation Component
 * Injects consistent sidebar navigation across all pages
 *
 * Usage:
 * 1. Include this script in your page: <script src="/js/navigation.js"></script>
 * 2. Have a <aside class="sidebar"></aside> element in your page
 * 3. The navigation will be auto-injected on DOMContentLoaded
 *
 * For pages with custom nav elements (like Quick Launch dropdown):
 * - Keep the full sidebar HTML in your page
 * - The script will just update the active state
 */

const navItems = [
    { href: '/', icon: 'layout-dashboard', label: 'Dashboard' },
    { href: '/company-dashboard.html', icon: 'building', label: 'Company' },
    { href: '/align120.html', icon: 'compass', label: 'Align 120' },
    { href: '/strategy.html', icon: 'target', label: 'Strategy (S2E)' },
    { href: '/strategy-governance.html', icon: 'shield-check', label: 'Governance' },
    { href: '/chat.html', icon: 'message-square', label: 'Multi-LLM Chat' },
    { href: '/context.html', icon: 'database', label: 'Context Assets' },
    { href: '/agents.html', icon: 'bot', label: 'Agent Library' },
    { href: '/parthenon.html', icon: 'landmark', label: 'Parthenon' },
    { href: '/actions.html', icon: 'zap', label: 'Actions' },
    { href: '/skills.html', icon: 'wand-2', label: 'Skills' },
    { href: '/prompt-editor.html', icon: 'file-code', label: 'Prompt Transformer' },
    { href: '/briefing.html', icon: 'newspaper', label: 'Briefing' },
    { href: '/integrity.html', icon: 'activity', label: 'Integrity' }
];

/**
 * Determine which nav item is active based on current path
 */
function getActivePath() {
    const path = window.location.pathname;

    // Exact match first
    const exactMatch = navItems.find(item => item.href === path);
    if (exactMatch) return exactMatch.href;

    // Handle .html variations
    const pathWithHtml = path.endsWith('.html') ? path : path + '.html';
    const htmlMatch = navItems.find(item => item.href === pathWithHtml);
    if (htmlMatch) return htmlMatch.href;

    // Handle index variations
    if (path === '/' || path === '/index.html') return '/';

    // Partial match for nested routes
    const partialMatch = navItems.find(item =>
        item.href !== '/' && path.startsWith(item.href.replace('.html', ''))
    );
    if (partialMatch) return partialMatch.href;

    return null;
}

/**
 * Generate navigation HTML
 */
function generateNavHTML() {
    const activePath = getActivePath();

    return navItems.map(item => {
        const isActive = item.href === activePath;
        return `
            <a href="${item.href}" class="nav-item${isActive ? ' active' : ''}">
                <i data-lucide="${item.icon}"></i>
                <span>${item.label}</span>
            </a>
        `;
    }).join('');
}

/**
 * Generate full sidebar HTML
 */
function generateSidebarHTML() {
    return `
        <div class="sidebar-header">
            <div class="logo">
                <img src="/assets/I360-180T.png" alt="Insight 360" class="logo-image" onerror="this.style.display='none'">
                <span class="logo-text">Insight 360</span>
            </div>
        </div>
        <nav class="sidebar-nav">
            ${generateNavHTML()}
        </nav>
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

    // Check if sidebar already has content (don't override)
    if (sidebar.querySelector('.sidebar-nav')) {
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
}

/**
 * Update active nav item (for SPA-style navigation)
 */
function updateActiveNavItem() {
    const activePath = getActivePath();

    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        const href = item.getAttribute('href');
        item.classList.toggle('active', href === activePath);
    });
}

// Auto-initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initNavigation);

// Export for manual use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initNavigation, updateActiveNavItem, navItems };
}
