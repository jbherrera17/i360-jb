/* global authFetch */
/**
 * Insight 360 - Organization Switcher Component
 * Provides a dropdown for switching between organizations
 *
 * Usage:
 * 1. Include this script: <script src="/js/org-switcher.js"></script>
 * 2. Add element with id="org-switcher-container" where you want the dropdown
 * 3. Listen for 'orgChanged' custom event for updates
 *
 * Events:
 * - 'orgChanged': Fired when organization changes, detail contains { org, orgId }
 * - 'orgsLoaded': Fired when organizations list is loaded, detail contains { orgs }
 */

(function() {
    'use strict';

    // State
    let organizations = [];
    let currentOrgId = null;
    let initialized = false;

    /**
     * Get current organization ID from localStorage
     */
    function getCurrentOrgId() {
        return localStorage.getItem('currentOrgId');
    }

    /**
     * Set current organization ID in localStorage
     */
    function setCurrentOrgId(orgId) {
        localStorage.setItem('currentOrgId', orgId);
        currentOrgId = orgId;
    }

    /**
     * Get current organization object
     */
    function getCurrentOrg() {
        return organizations.find(o => o.id === currentOrgId);
    }

    /**
     * Load organizations from API
     */
    async function loadOrganizations() {
        try {
            const response = await (typeof authFetch === 'function' ? authFetch : fetch)('/api/organizations');
            const result = await response.json();

            if (result.success) {
                organizations = result.data;

                // Set current org if not set or invalid
                const savedOrgId = getCurrentOrgId();
                const validOrg = organizations.find(o => o.id === savedOrgId);

                if (!validOrg && organizations.length > 0) {
                    setCurrentOrgId(organizations[0].id);
                } else if (validOrg) {
                    currentOrgId = savedOrgId;
                }

                // Dispatch loaded event
                document.dispatchEvent(new CustomEvent('orgsLoaded', {
                    detail: { orgs: organizations }
                }));

                return organizations;
            }
        } catch (error) {
            console.error('Failed to load organizations:', error);
        }
        return [];
    }

    /**
     * Switch to a different organization
     */
    function switchOrganization(orgId) {
        if (orgId === currentOrgId) return;

        const org = organizations.find(o => o.id === orgId);
        if (!org) return;

        setCurrentOrgId(orgId);

        // Dispatch change event
        document.dispatchEvent(new CustomEvent('orgChanged', {
            detail: { org, orgId }
        }));

        // Update UI
        renderSwitcher();
    }

    /**
     * Render the organization switcher dropdown
     */
    function renderSwitcher() {
        const container = document.getElementById('org-switcher-container');
        if (!container) return;

        const currentOrg = getCurrentOrg();

        container.innerHTML = `
            <div class="org-switcher-wrapper">
                <select class="org-switcher-select" onchange="window.I360OrgSwitcher.switchOrg(this.value)">
                    ${organizations.map(org => `
                        <option value="${org.id}" ${org.id === currentOrgId ? 'selected' : ''}>
                            ${escapeHTML(org.name)}${org.settings?.is_personal ? ' (Personal)' : ''}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;

        // Inject styles if not already present
        if (!document.getElementById('org-switcher-styles')) {
            const style = document.createElement('style');
            style.id = 'org-switcher-styles';
            style.textContent = `
                .org-switcher-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .org-switcher-select {
                    padding: 0.5rem 1rem;
                    border: 1px solid var(--border, #d2d2d7);
                    border-radius: 6px;
                    background: var(--bg-secondary, #f5f5f7);
                    color: var(--text-primary, #1d1d1f);
                    font-size: 0.9rem;
                    font-weight: 500;
                    cursor: pointer;
                    min-width: 180px;
                    max-width: 250px;
                }

                .org-switcher-select:focus {
                    outline: none;
                    border-color: var(--primary, #6366f1);
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
                }

                .org-switcher-select:hover {
                    border-color: var(--primary, #6366f1);
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Escape HTML for security
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
     * Initialize the org switcher
     */
    async function init() {
        if (initialized) return;
        initialized = true;

        await loadOrganizations();
        renderSwitcher();
    }

    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose public API
    window.I360OrgSwitcher = {
        init,
        loadOrganizations,
        switchOrg: switchOrganization,
        getCurrentOrgId,
        getCurrentOrg,
        getOrganizations: () => organizations,
        render: renderSwitcher
    };

})();
