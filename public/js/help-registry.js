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
        // Department Management
        '/admin-departments': {
            file: '/api/docs/departments-user-guide.md',
            title: 'Department Management Help'
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
        },
        // Agency Model (Phase 40-43)
        '/agency-dashboard': {
            file: '/api/docs/agency-dashboard-user-guide.md',
            title: 'Agency Dashboard Help'
        },
        '/admin-org-customization': {
            file: '/api/docs/admin-org-customization-user-guide.md',
            title: 'Organization Customization Help'
        },
        '/admin-client-users': {
            file: '/api/docs/admin-client-users-user-guide.md',
            title: 'Client Portal Users Help'
        },
        // Enterprise Multi-Tenancy (Phase 44)
        '/admin-platform': {
            file: '/api/docs/admin-platform-user-guide.md',
            title: 'Platform Administration Help'
        },
        '/admin-tier-setup': {
            file: '/api/docs/admin-tier-setup-user-guide.md',
            title: 'Tier Setup Help'
        },
        // Phase 45: Resource Access Control
        '/admin-resource-access': {
            file: '/api/docs/admin-resource-access-user-guide.md',
            title: 'Resource Access Management Help'
        },
        // Phase 46: Administrator
        '/administrator': {
            file: '/api/docs/administrator-user-guide.md',
            title: 'Administrator Help'
        },
        // Phase 48: Integrations
        '/integrations': {
            file: '/api/docs/integrations-user-guide.md',
            title: 'Integrations Help'
        },
        // Phase 54: Soul Configuration
        '/soul-wizard': {
            file: '/api/docs/soul-configuration-user-guide.md',
            title: 'Soul Configuration Help'
        },
        '/soul-configuration': {
            file: '/api/docs/soul-configuration-user-guide.md',
            title: 'Soul Configuration Help'
        },
        // Agent Categories
        '/admin-agent-categories': {
            file: '/api/docs/admin-agent-categories-user-guide.md',
            title: 'Agent Categories Help'
        },
        '/synerginexus': {
            file: '/api/docs/synerginexus-user-guide.md',
            title: 'SynergiNexus Help'
        },
        // Thought Leadership
        '/thought-leadership': {
            file: '/api/docs/thought-leadership-user-guide.md',
            title: 'Thought Leadership Help'
        },
        // Tag Management
        '/tags': {
            file: '/api/docs/tags-user-guide.md',
            title: 'Tag Management Help'
        },
        // Title Management
        '/roles': {
            file: '/api/docs/roles-user-guide.md',
            title: 'Title Management Help'
        },
        // Workflows
        '/workflows': {
            file: '/api/docs/workflow-user-guide.md',
            title: 'Workflows Help'
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
