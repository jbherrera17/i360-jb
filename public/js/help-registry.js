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
            title: 'Multi-LLM Chat Help'
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
        }
    }, 100);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HelpRegistry;
}
