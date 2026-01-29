/**
 * INSIGHT 360 - Integrations Frontend
 * Version: 1.0.0
 *
 * Manages the integrations settings page UI.
 */

const state = {
    providers: [],
    userIntegrations: [],
    orgIntegrations: []
};

async function apiCall(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    const orgId = localStorage.getItem('insight360_org_id');
    if (orgId) headers['x-org-id'] = orgId;

    const response = await fetch(endpoint, { headers, ...options });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `alert-banner ${type}`;
    toast.style.cssText = 'min-width:300px;animation:slideIn 0.3s ease;';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

const PROVIDER_ICONS = {
    google: 'G',
    microsoft: 'M',
    salesforce: 'SF',
    hubspot: 'HS',
    slack: '#'
};

const PROVIDER_DESCRIPTIONS = {
    google: 'Gmail, Drive, Calendar, Docs, Sheets',
    microsoft: 'Outlook, OneDrive, Teams, SharePoint',
    salesforce: 'Contacts, Accounts, Opportunities, Activities',
    hubspot: 'Contacts, Companies, Deals, Activities',
    slack: 'Messages, Channels, Notifications'
};

function getIconClass(slug) {
    return ['google', 'microsoft', 'salesforce', 'hubspot', 'slack'].includes(slug) ? slug : 'default';
}

async function loadIntegrations() {
    try {
        const [providersRes, userRes] = await Promise.all([
            apiCall('/api/integrations/providers'),
            apiCall('/api/integrations/user')
        ]);

        state.providers = providersRes.data || [];
        state.userIntegrations = userRes.data || [];

        // Try loading org integrations
        try {
            const orgRes = await apiCall('/api/integrations/org');
            state.orgIntegrations = orgRes.data || [];
        } catch { /* no org context */ }

        renderIntegrations();
    } catch (error) {
        console.error('Failed to load integrations:', error);
        document.getElementById('available-grid').innerHTML = `
            <div class="empty-state">
                <i data-lucide="alert-triangle" style="width:32px;height:32px;"></i>
                <p>Failed to load integrations. Please try again.</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function renderIntegrations() {
    const connectedMap = new Map();
    state.userIntegrations.forEach(ui => {
        connectedMap.set(ui.integration_providers?.slug || ui.provider_id, ui);
    });

    const connected = [];
    const available = [];

    state.providers.forEach(provider => {
        if (connectedMap.has(provider.slug)) {
            connected.push({ provider, integration: connectedMap.get(provider.slug) });
        } else {
            available.push(provider);
        }
    });

    // Connected section
    const connectedSection = document.getElementById('connected-section');
    const connectedGrid = document.getElementById('connected-grid');
    const connectedCount = document.getElementById('connected-count');

    if (connected.length > 0) {
        connectedSection.style.display = '';
        connectedCount.textContent = connected.length;
        connectedGrid.innerHTML = connected.map(({ provider, integration }) => renderConnectedCard(provider, integration)).join('');
    } else {
        connectedSection.style.display = 'none';
    }

    // Org section
    const orgSection = document.getElementById('org-section');
    const orgGrid = document.getElementById('org-grid');
    const orgCount = document.getElementById('org-count');

    if (state.orgIntegrations.length > 0) {
        orgSection.style.display = '';
        orgCount.textContent = state.orgIntegrations.length;
        orgGrid.innerHTML = state.orgIntegrations.map(oi => renderOrgCard(oi)).join('');
    } else {
        orgSection.style.display = 'none';
    }

    // Available section
    const availableGrid = document.getElementById('available-grid');
    if (available.length > 0) {
        availableGrid.innerHTML = available.map(p => renderAvailableCard(p)).join('');
    } else {
        availableGrid.innerHTML = `
            <div class="empty-state">
                <i data-lucide="check-circle" style="width:32px;height:32px;color:var(--success);"></i>
                <p>All available integrations are connected!</p>
            </div>
        `;
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderConnectedCard(provider, integration) {
    const statusClass = integration.status === 'active' ? 'connected' : 'error';
    const statusText = integration.status === 'active' ? 'Connected' : integration.status;
    const syncInfo = integration.last_sync_at
        ? `Last synced: ${new Date(integration.last_sync_at).toLocaleDateString()}`
        : 'Not synced yet';

    return `
        <div class="integration-card connected">
            <div class="integration-card-header">
                <div class="integration-icon ${getIconClass(provider.slug)}">
                    ${PROVIDER_ICONS[provider.slug] || '?'}
                </div>
                <div>
                    <div class="integration-name">${provider.name}</div>
                    <div class="integration-category">${provider.category}</div>
                </div>
            </div>
            <div class="integration-description">
                ${integration.external_email ? `<strong>${integration.external_email}</strong><br>` : ''}
                ${PROVIDER_DESCRIPTIONS[provider.slug] || ''}
            </div>
            <span class="integration-status ${statusClass}">
                <i data-lucide="${statusClass === 'connected' ? 'check' : 'alert-circle'}" style="width:12px;height:12px;"></i>
                ${statusText}
            </span>
            <div class="sync-info">${syncInfo}</div>
            <div class="integration-card-footer">
                <button class="btn btn-sm btn-outline" onclick="syncIntegration('${provider.slug}')">
                    <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> Sync
                </button>
                <button class="btn btn-sm btn-danger-outline" onclick="disconnectIntegration('${provider.slug}', '${provider.name}')">
                    <i data-lucide="unplug" style="width:14px;height:14px;"></i> Disconnect
                </button>
            </div>
        </div>
    `;
}

function renderOrgCard(orgIntegration) {
    const provider = orgIntegration.integration_providers || {};
    const healthClass = orgIntegration.health_status === 'healthy' ? 'connected'
        : orgIntegration.health_status === 'degraded' ? 'beta' : 'disconnected';

    return `
        <div class="integration-card">
            <div class="integration-card-header">
                <div class="integration-icon ${getIconClass(provider.slug)}">
                    ${PROVIDER_ICONS[provider.slug] || '?'}
                </div>
                <div>
                    <div class="integration-name">${orgIntegration.instance_name || provider.name}</div>
                    <div class="integration-category">Organization &bull; ${provider.category}</div>
                </div>
            </div>
            <div class="integration-description">
                ${orgIntegration.instance_url || 'No endpoint configured'}
            </div>
            <span class="integration-status ${healthClass}">
                ${orgIntegration.health_status || 'unknown'}
            </span>
            <div class="integration-card-footer">
                <button class="btn btn-sm btn-outline" onclick="configureOrgIntegration('${provider.slug}')">
                    <i data-lucide="settings" style="width:14px;height:14px;"></i> Configure
                </button>
            </div>
        </div>
    `;
}

function renderAvailableCard(provider) {
    const isBeta = provider.status === 'beta';
    const price = provider.base_monthly_price
        ? `<strong>$${provider.base_monthly_price}</strong>/mo`
        : 'Included';

    return `
        <div class="integration-card">
            <div class="integration-card-header">
                <div class="integration-icon ${getIconClass(provider.slug)}">
                    ${PROVIDER_ICONS[provider.slug] || '?'}
                </div>
                <div>
                    <div class="integration-name">${provider.name}</div>
                    <div class="integration-category">${provider.category}</div>
                </div>
            </div>
            <div class="integration-description">
                ${PROVIDER_DESCRIPTIONS[provider.slug] || JSON.stringify(provider.capabilities?.entities || []).replace(/[\[\]"]/g, '')}
            </div>
            ${isBeta ? '<span class="integration-status beta"><i data-lucide="flask-conical" style="width:12px;height:12px;"></i> Beta</span>' : ''}
            <div class="integration-card-footer">
                <div class="integration-price">${price}</div>
                <button class="btn btn-sm btn-primary" onclick="connectIntegration('${provider.slug}')" ${!provider.implemented ? 'disabled title="Coming soon"' : ''}>
                    <i data-lucide="plus" style="width:14px;height:14px;"></i>
                    ${provider.implemented ? 'Connect' : 'Coming Soon'}
                </button>
            </div>
        </div>
    `;
}

async function connectIntegration(slug) {
    try {
        const result = await apiCall(`/api/integrations/user/${slug}/connect`, {
            method: 'POST',
            body: JSON.stringify({})
        });

        if (result.authUrl) {
            // OAuth flow - redirect to provider
            window.location.href = result.authUrl;
        } else {
            showToast('Connected successfully!', 'success');
            await loadIntegrations();
        }
    } catch (error) {
        showToast(`Failed to connect: ${error.message}`, 'error');
    }
}

async function disconnectIntegration(slug, name) {
    if (typeof ModalService !== 'undefined') {
        const confirmed = await ModalService.confirm({
            title: 'Disconnect Integration',
            message: `Are you sure you want to disconnect ${name}? This will remove your connection and any stored credentials.`,
            confirmText: 'Disconnect',
            confirmClass: 'btn-danger'
        });
        if (!confirmed) return;
    }

    try {
        await apiCall(`/api/integrations/user/${slug}`, { method: 'DELETE' });
        showToast(`${name} disconnected`, 'success');
        await loadIntegrations();
    } catch (error) {
        showToast(`Failed to disconnect: ${error.message}`, 'error');
    }
}

async function syncIntegration(slug) {
    try {
        showToast('Syncing...', 'info');
        await apiCall(`/api/integrations/${slug}/sync`, {
            method: 'POST',
            body: JSON.stringify({ syncType: 'incremental' })
        });
        showToast('Sync completed', 'success');
        await loadIntegrations();
    } catch (error) {
        showToast(`Sync failed: ${error.message}`, 'error');
    }
}

async function configureOrgIntegration(slug) {
    if (typeof ModalService === 'undefined') return;

    const result = await ModalService.form({
        title: `Configure ${slug} Integration`,
        fields: [
            { name: 'instanceUrl', label: 'Instance URL', type: 'text', placeholder: 'https://...' },
            { name: 'instanceName', label: 'Display Name', type: 'text' },
            { name: 'adminApiKey', label: 'Admin API Key', type: 'password' }
        ],
        submitText: 'Save'
    });

    if (!result) return;

    try {
        await apiCall(`/api/integrations/org/${slug}`, {
            method: 'POST',
            body: JSON.stringify(result)
        });
        showToast('Integration configured', 'success');
        await loadIntegrations();
    } catch (error) {
        showToast(`Configuration failed: ${error.message}`, 'error');
    }
}
