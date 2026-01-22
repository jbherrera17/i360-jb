/**
 * Insight 360 - Help Content Registry
 * Maps pages to their documentation files
 * Version: 1.0.0
 *
 * This registry defines which help file should be shown for each page.
 * Add new entries as you create user guides for additional pages.
 */

const HelpRegistry = {
    // Page-to-documentation mapping
    // Key: page path (without .html), Value: { file, title }
    pages: {
        '/prompt-editor': {
            file: '/api/docs/prompt-transformer-user-guide.md',
            title: 'Prompt Transformer Help'
        },
        '/': {
            file: '/api/docs/dashboard-user-guide.md',
            title: 'Dashboard Help'
        },
        '/index': {
            file: '/api/docs/dashboard-user-guide.md',
            title: 'Dashboard Help'
        },
        '/chat': {
            file: '/api/docs/chat-user-guide.md',
            title: 'Higgins Help'
        },
        '/agents': {
            file: '/api/docs/agents-user-guide.md',
            title: 'Agent Library Help'
        },
        '/context': {
            file: '/api/docs/context-user-guide.md',
            title: 'Context Assets Help'
        },
        '/skills': {
            file: '/api/docs/skills-user-guide.md',
            title: 'Skills Help'
        },
        '/parthenon': {
            file: '/api/docs/parthenon-user-guide.md',
            title: 'Parthenon Help'
        },
        '/actions': {
            file: '/api/docs/actions-user-guide.md',
            title: 'Actions Help'
        },
        '/briefing': {
            file: '/api/docs/briefing-user-guide.md',
            title: 'Briefing Help'
        },
        '/strategy': {
            file: '/api/docs/strategy-user-guide.md',
            title: 'Strategy (S2E) Help'
        },
        '/strategy-governance': {
            file: '/api/docs/governance-user-guide.md',
            title: 'Governance Help'
        },
        '/integrity': {
            file: '/api/docs/integrity-user-guide.md',
            title: 'Integrity Dashboard Help'
        },
        '/company-dashboard': {
            file: '/api/docs/company-user-guide.md',
            title: 'Company Dashboard Help'
        },
        '/align120': {
            file: '/api/docs/align120-user-guide.md',
            title: 'Align 120 Help'
        },
        '/strategy120': {
            file: '/api/docs/strategy120-user-guide.md',
            title: 'Strategy 120 Help'
        },
        '/execute120': {
            file: '/api/docs/execute120-user-guide.md',
            title: 'Execute 120 Help'
        },
        '/profile': {
            file: '/api/docs/profile-user-guide.md',
            title: 'Profile Help'
        },
        '/workflow-run': {
            file: '/api/docs/workflow-user-guide.md',
            title: 'Workflow Execution Help'
        },
        '/workflow-builder': {
            file: '/api/docs/workflow-user-guide.md',
            title: 'Workflow Builder Help'
        },
        '/asset-types': {
            file: '/api/docs/asset-types-user-guide.md',
            title: 'Asset Types Help'
        },
        '/research-studio': {
            file: '/api/docs/research-studio-user-guide.md',
            title: 'Research Studio Help'
        },
        // Connection Management & Agency Features (Phase 40)
        '/my-capabilities': {
            file: '/api/docs/my-capabilities-user-guide.md',
            title: 'My Capabilities Help'
        },
        '/admin-responsibilities': {
            file: '/api/docs/admin-responsibilities-user-guide.md',
            title: 'Responsibilities Management Help'
        },
        '/admin-responsibility-ai': {
            file: '/api/docs/admin-responsibility-ai-user-guide.md',
            title: 'Responsibility AI Mapping Help'
        },
        '/admin-department-ai': {
            file: '/api/docs/admin-department-ai-user-guide.md',
            title: 'Department AI Configuration Help'
        },
        '/admin-okr-capabilities': {
            file: '/api/docs/admin-okr-capabilities-user-guide.md',
            title: 'OKR Capabilities Help'
        },
        '/client-comparison': {
            file: '/api/docs/client-comparison-user-guide.md',
            title: 'Client Comparison Help'
        },
        // Agency Foundation (Phase 39)
        '/admin-org-settings': {
            file: '/api/docs/admin-org-settings-user-guide.md',
            title: 'Organization Settings Help'
        },
        '/admin-org-members': {
            file: '/api/docs/admin-org-members-user-guide.md',
            title: 'Team Members Help'
        },
        '/admin-clients': {
            file: '/api/docs/admin-clients-user-guide.md',
            title: 'Client Management Help'
        }
    },

    /**
     * Get help configuration for current page
     * @returns {Object|null} - { file, title } or null if not found
     */
    getCurrentPageHelp() {
        const path = window.location.pathname.replace('.html', '');
        return this.pages[path] || null;
    },

    /**
     * Get help configuration for a specific page
     * @param {string} pagePath - Page path
     * @returns {Object|null} - { file, title } or null if not found
     */
    getPageHelp(pagePath) {
        const normalizedPath = pagePath.replace('.html', '');
        return this.pages[normalizedPath] || null;
    },

    /**
     * Check if help is available for current page
     * @returns {boolean}
     */
    hasHelp() {
        return this.getCurrentPageHelp() !== null;
    },

    /**
     * Initialize help modal for current page
     * Automatically configures HelpModal based on current page
     */
    initForCurrentPage() {
        const helpConfig = this.getCurrentPageHelp();
        if (helpConfig && typeof HelpModal !== 'undefined') {
            HelpModal.init({
                helpFile: helpConfig.file,
                title: helpConfig.title
            });
        }
    },

    /**
     * Open help for current page
     */
    openCurrentPageHelp() {
        const helpConfig = this.getCurrentPageHelp();
        if (helpConfig && typeof HelpModal !== 'undefined') {
            HelpModal.setTitle(helpConfig.title);
            HelpModal.open(helpConfig.file);
        } else {
            console.warn('HelpRegistry: No help available for this page');
        }
    }
};

// Auto-initialize on DOMContentLoaded if HelpModal is available
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure HelpModal is loaded
    setTimeout(() => {
        if (typeof HelpModal !== 'undefined') {
            HelpRegistry.initForCurrentPage();

            // Check if we need to auto-open help (from onboarding navigation)
            const autoOpenHelp = sessionStorage.getItem('insight360_open_help');
            if (autoOpenHelp) {
                sessionStorage.removeItem('insight360_open_help');
                // Delay slightly to ensure page is ready
                setTimeout(() => {
                    HelpModal.open(autoOpenHelp);
                }, 300);
            }
        }
    }, 100);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HelpRegistry;
}
