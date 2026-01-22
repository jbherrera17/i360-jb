/**
 * Insight 360 - Client Selector Component
 * Provides a dropdown for filtering dashboard data by client
 *
 * Usage:
 * 1. Include this script: <script src="/js/client-selector.js"></script>
 * 2. Add element with id="client-selector-container" where you want the dropdown
 * 3. Listen for 'clientChanged' custom event for updates
 *
 * Events:
 * - 'clientChanged': Fired when client changes, detail contains { client, clientId }
 * - 'clientsLoaded': Fired when clients list is loaded, detail contains { clients }
 */

(function() {
    'use strict';

    // State
    let clients = [];
    let currentClientId = null;
    let currentOrgId = null;
    let initialized = false;

    /**
     * Get current client ID from localStorage
     */
    function getCurrentClientId() {
        return localStorage.getItem('currentClientId');
    }

    /**
     * Set current client ID in localStorage
     */
    function setCurrentClientId(clientId) {
        if (clientId) {
            localStorage.setItem('currentClientId', clientId);
        } else {
            localStorage.removeItem('currentClientId');
        }
        currentClientId = clientId;
    }

    /**
     * Get current client object
     */
    function getCurrentClient() {
        return clients.find(c => c.id === currentClientId);
    }

    /**
     * Get current org ID
     */
    function getCurrentOrgId() {
        return localStorage.getItem('currentOrgId');
    }

    /**
     * Load clients from API for current organization
     */
    async function loadClients() {
        try {
            currentOrgId = getCurrentOrgId();

            if (!currentOrgId) {
                clients = [];
                renderSelector();
                return [];
            }

            const response = await fetch(`/api/clients?org_id=${currentOrgId}`);
            const result = await response.json();

            if (result.success) {
                clients = result.data || [];

                // Validate current selection
                const savedClientId = getCurrentClientId();
                const validClient = clients.find(c => c.id === savedClientId);

                if (!validClient) {
                    setCurrentClientId(null); // "All Clients" mode
                } else {
                    currentClientId = savedClientId;
                }

                // Dispatch loaded event
                document.dispatchEvent(new CustomEvent('clientsLoaded', {
                    detail: { clients }
                }));

                return clients;
            }
        } catch (error) {
            console.error('Failed to load clients:', error);
        }
        return [];
    }

    /**
     * Switch to a different client (or all clients)
     */
    function switchClient(clientId) {
        const newClientId = clientId === 'all' ? null : clientId;

        if (newClientId === currentClientId) return;

        const client = newClientId ? clients.find(c => c.id === newClientId) : null;

        setCurrentClientId(newClientId);

        // Dispatch change event
        document.dispatchEvent(new CustomEvent('clientChanged', {
            detail: { client, clientId: newClientId }
        }));

        // Update UI
        renderSelector();
    }

    /**
     * Render the client selector dropdown
     */
    function renderSelector() {
        const container = document.getElementById('client-selector-container');
        if (!container) return;

        if (clients.length === 0) {
            container.innerHTML = `
                <div class="client-selector-wrapper">
                    <span class="client-selector-label">No clients</span>
                </div>
            `;
            return;
        }

        const currentClient = getCurrentClient();

        container.innerHTML = `
            <div class="client-selector-wrapper">
                <label class="client-selector-label">Client:</label>
                <select class="client-selector-select" onchange="window.I360ClientSelector.switchClient(this.value)">
                    <option value="all" ${!currentClientId ? 'selected' : ''}>
                        All Clients (${clients.length})
                    </option>
                    ${clients.map(client => `
                        <option value="${client.id}" ${client.id === currentClientId ? 'selected' : ''}>
                            ${escapeHTML(client.name)}${client.status !== 'active' ? ` (${client.status})` : ''}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;

        // Inject styles if not already present
        if (!document.getElementById('client-selector-styles')) {
            const style = document.createElement('style');
            style.id = 'client-selector-styles';
            style.textContent = `
                .client-selector-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .client-selector-label {
                    font-size: 0.85rem;
                    color: var(--text-secondary, #6e6e73);
                    font-weight: 500;
                }

                .client-selector-select {
                    padding: 0.5rem 1rem;
                    border: 1px solid var(--border, #d2d2d7);
                    border-radius: 6px;
                    background: var(--bg-secondary, #f5f5f7);
                    color: var(--text-primary, #1d1d1f);
                    font-size: 0.9rem;
                    font-weight: 500;
                    cursor: pointer;
                    min-width: 180px;
                    max-width: 280px;
                }

                .client-selector-select:focus {
                    outline: none;
                    border-color: var(--primary, #6366f1);
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
                }

                .client-selector-select:hover {
                    border-color: var(--primary, #6366f1);
                }

                /* Compact variant */
                .client-selector-wrapper.compact .client-selector-label {
                    display: none;
                }

                .client-selector-wrapper.compact .client-selector-select {
                    min-width: 150px;
                    font-size: 0.85rem;
                    padding: 0.4rem 0.75rem;
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
     * Initialize the client selector
     */
    async function init() {
        if (initialized) return;
        initialized = true;

        // Listen for org changes to reload clients
        document.addEventListener('orgChanged', async () => {
            await loadClients();
            renderSelector();
        });

        await loadClients();
        renderSelector();
    }

    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose public API
    window.I360ClientSelector = {
        init,
        loadClients,
        switchClient,
        getCurrentClientId,
        getCurrentClient,
        getClients: () => clients,
        render: renderSelector
    };

})();
