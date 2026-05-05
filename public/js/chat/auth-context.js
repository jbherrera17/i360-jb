/* chat auth-context — platform admin verification and org/scope context */
/**
 * Check if current user is a platform admin
 */
async function checkPlatformAdmin() {
    try {
        const response = await authFetch('/api/platform/admin/verify', {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        isPlatformAdmin = response.ok;

        if (isPlatformAdmin) {
            // Add "All Organizations" option to scope selector
            const scopeSelect = document.getElementById('conversationScope');
            if (scopeSelect) {
                const allOption = document.createElement('option');
                allOption.value = 'all';
                allOption.textContent = 'All Organizations';
                scopeSelect.appendChild(allOption);
            }
            // Load organizations for the admin org filter dropdown
            await loadOrganizations();
        }
    } catch (error) {
        isPlatformAdmin = false;
    }
}

/**
 * Load organizations for admin filter
 */
async function loadOrganizations() {
    try {
        const response = await authFetch('/api/platform/organizations');
        const data = await response.json();

        if (data.success && data.data) {
            organizations = data.data;
            const orgSelect = document.getElementById('orgFilter');
            if (orgSelect) {
                orgSelect.innerHTML = '<option value="">All Organizations</option>' +
                    organizations.map(org =>
                        `<option value="${org.id}">${escapeHtml(org.name)}</option>`
                    ).join('');
            }
        }
    } catch (error) {
        console.error('Error loading organizations:', error);
    }
}

/**
 * Handle conversation scope change (My / Org / All Organizations)
 */
async function changeConversationScope() {
    const scopeSelect = document.getElementById('conversationScope');
    conversationScope = scopeSelect?.value || 'mine';

    // Derive legacy flags from scope
    showAllConversations = (conversationScope === 'all');

    // Show org filter dropdown only for "All Organizations" scope
    const scopeOrgFilter = document.getElementById('scopeOrgFilter');
    if (scopeOrgFilter) {
        scopeOrgFilter.style.display = (conversationScope === 'all') ? 'block' : 'none';
    }

    // Reset org filter when leaving "all" scope
    if (conversationScope !== 'all') {
        selectedOrgFilter = '';
        const orgSelect = document.getElementById('orgFilter');
        if (orgSelect) orgSelect.value = '';
    }

    await loadConversations();
}

/**
 * Filter conversations by organization (admin - within "All Organizations" scope)
 */
async function filterByOrganization() {
    const orgSelect = document.getElementById('orgFilter');
    selectedOrgFilter = orgSelect?.value || '';
    await loadConversations();
}

/**
 * Toggle the conversation history panel open/closed
 */
function toggleConversationPanel() {
    const panel = document.querySelector('.chat-history-panel');
    if (!panel) return;

    isPanelCollapsed = !isPanelCollapsed;
    panel.classList.toggle('collapsed', isPanelCollapsed);
    localStorage.setItem('chat-panel-collapsed', isPanelCollapsed);
    updatePanelToggleIcon();
}

/**
 * Update the panel toggle button icon based on state
 */
function updatePanelToggleIcon() {
    const btn = document.getElementById('panelToggleBtn');
    if (!btn) return;
    const iconName = isPanelCollapsed ? 'panel-right-close' : 'panel-right-open';
    btn.innerHTML = `<i data-lucide="${iconName}"></i>`;
    btn.title = isPanelCollapsed ? 'Show conversations panel' : 'Hide conversations panel';
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Detect the current user's organization and set up scope selector
 */
async function detectUserOrg() {
    try {
        const response = await authFetch('/api/conversations/user-org');
        const data = await response.json();
        if (data.success && data.org_id) {
            userOrgId = data.org_id;
            // Add "Organization" option to scope selector
            const scopeSelect = document.getElementById('conversationScope');
            if (scopeSelect) {
                const orgOption = document.createElement('option');
                orgOption.value = 'org';
                orgOption.textContent = 'Organization';
                // Insert before "All Organizations" if it exists, otherwise append
                const allOption = scopeSelect.querySelector('option[value="all"]');
                if (allOption) {
                    scopeSelect.insertBefore(orgOption, allOption);
                } else {
                    scopeSelect.appendChild(orgOption);
                }
            }
        }
        // Show scope bar if user has an org OR is admin (more than just "mine" available)
        const scopeBar = document.getElementById('conversationScopeBar');
        const scopeSelect = document.getElementById('conversationScope');
        if (scopeBar && scopeSelect && scopeSelect.options.length > 1) {
            scopeBar.style.display = 'block';
        }
    } catch (error) {
        // No org context available — scope bar stays hidden, only "mine" available
    }
}

