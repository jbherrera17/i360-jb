/**
 * Onboarding Checklist Component
 * Phase 46: Administrator Page Reorganization
 * Updated Phase 54i: Priority-grouped items with "You're Ready!" state
 *
 * Tracks onboarding progress for organizations.
 * Groups items into Required, Recommended, and Optional sections.
 * Required items must all complete to reach "You're Ready!" state.
 */

const OnboardingChecklist = {
    // Priority group definitions
    priorityGroups: [
        { key: 'required', label: 'Required', icon: 'alert-circle', description: 'Must complete to unlock your organization' },
        { key: 'recommended', label: 'Recommended', icon: 'star', description: 'Strongly suggested for best results' },
        { key: 'optional', label: 'Optional', icon: 'sparkles', description: 'Enhance your experience when ready' }
    ],

    // Checklist items with priority and check functions
    checklistItems: [
        // === REQUIRED ===
        {
            id: 'org-created',
            title: 'Organization Created',
            description: 'Basic organization information configured',
            icon: 'building-2',
            link: 'admin-org-settings.html',
            priority: 'required',
            check: (data) => !!data.organization
        },
        {
            id: 'admin-assigned',
            title: 'Admin User Assigned',
            description: 'At least one admin user configured',
            icon: 'user-check',
            link: 'admin-org-members.html',
            priority: 'required',
            check: (data) => data.members?.some(m => m.role === 'admin' || m.role === 'owner')
        },
        {
            id: 'tier-configured',
            title: 'Subscription Tier Configured',
            description: 'Appropriate tier selected for organization',
            icon: 'layers',
            link: 'admin-tier-setup.html',
            priority: 'required',
            check: (data) => data.organization?.subscription_tier && data.organization.subscription_tier !== 'none'
        },
        {
            id: 'soul-config',
            title: 'Soul Configuration',
            description: 'Values, ethics, and voice configured for the organization',
            icon: 'heart',
            link: 'soul-configuration.html',
            priority: 'required',
            check: (data) => !!data.soulConfig
        },
        {
            id: 'departments-created',
            title: 'Departments Created',
            description: 'At least one department set up',
            icon: 'git-branch',
            link: 'admin-org-settings.html#departments',
            priority: 'required',
            check: (data) => data.departments?.length > 0
        },
        {
            id: 'users-invited',
            title: 'Invite Team Members',
            description: 'At least one team member added to the organization',
            icon: 'users',
            link: 'admin-org-members.html',
            action: 'inviteTeamMember',
            priority: 'required',
            check: (data) => data.members?.length >= 2
        },

        // === RECOMMENDED ===
        {
            id: 'roles-defined',
            title: 'Roles Defined',
            description: 'Department roles configured for team structure',
            icon: 'shield',
            link: 'admin-org-settings.html#roles',
            priority: 'recommended',
            check: (data) => data.roles?.length > 0
        },
        {
            id: 'branding-configured',
            title: 'Branding Configured',
            description: 'Organization logo and colors set',
            icon: 'palette',
            link: 'admin-org-customization.html',
            priority: 'recommended',
            check: (data) => !!data.organization?.logo_url || !!data.organization?.primary_color
        },
        {
            id: 'first-agent',
            title: 'First Agent Created',
            description: 'Create or configure your first AI agent',
            icon: 'bot',
            link: 'agents.html',
            priority: 'recommended',
            check: (data) => data.agentCount > 0
        },
        {
            id: 'context-assets',
            title: 'Context Assets Added',
            description: 'Upload documents, URLs, or knowledge for agents to use',
            icon: 'file-text',
            link: 'context.html',
            priority: 'recommended',
            check: (data) => data.contextCount > 0
        },
        {
            id: 'resources-assigned',
            title: 'Resources Configured',
            description: 'Configure resource visibility so team members see the right agents and assets',
            icon: 'puzzle',
            link: 'admin-resource-access.html',
            priority: 'recommended',
            check: (data) => data.hasResources
        },

        // === OPTIONAL ===
        {
            id: 'first-conversation',
            title: 'First Conversation',
            description: 'Start a chat with Higgins to explore the platform',
            icon: 'message-circle',
            link: 'chat.html',
            priority: 'optional',
            check: (data) => data.hasConversations
        }
    ],

    // State
    orgId: null,
    orgData: null,
    organizations: [],
    container: null,
    isPlatformAdmin: false,
    showAllOrgs: false,
    collapsedGroups: { optional: true },

    /**
     * Initialize the checklist
     * @param {HTMLElement} container - Container element
     * @param {string} orgId - Organization ID (optional, defaults to selected org)
     */
    async init(container, orgId = null) {
        this.container = container;
        // Check multiple localStorage keys for compatibility
        this.orgId = orgId || localStorage.getItem('selected_org_id') || localStorage.getItem('currentOrgId');

        // Restore collapsed state
        try {
            const saved = localStorage.getItem('onboarding_collapsed_groups');
            if (saved) this.collapsedGroups = JSON.parse(saved);
        } catch (e) { /* ignore */ }

        // Check if user is a platform admin
        await this.checkPlatformAdmin();

        // Always load organizations list for the selector
        await this.loadOrganizations();

        if (!this.orgId && this.organizations.length > 0) {
            // Auto-select first org if none selected
            this.orgId = this.organizations[0].id;
        }

        if (!this.orgId) {
            this.renderNoOrg();
            return;
        }

        await this.loadOrgData();
        this.render();
    },

    /**
     * Check if user is a platform admin
     */
    async checkPlatformAdmin() {
        const token = localStorage.getItem('insight360_token');
        if (!token) {
            this.isPlatformAdmin = false;
            return;
        }

        try {
            const response = await fetch('/api/platform/config', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            this.isPlatformAdmin = response.ok;
        } catch (error) {
            this.isPlatformAdmin = false;
        }
    },

    /**
     * Toggle show all organizations
     */
    async toggleShowAllOrgs(checked) {
        this.showAllOrgs = checked;
        await this.loadOrganizations();
        // Reset selection if current org is no longer in list
        if (!this.organizations.find(o => o.id === this.orgId)) {
            this.orgId = this.organizations[0]?.id || null;
        }
        if (this.orgId) {
            await this.loadOrgData();
            this.render();
        } else {
            this.renderNoOrg();
        }
    },

    /**
     * Load organizations list for selector
     */
    async loadOrganizations() {
        const token = localStorage.getItem('insight360_token');
        if (!token) {
            this.organizations = [];
            return;
        }

        try {
            // Use platform API if admin and toggle is on
            const endpoint = (this.isPlatformAdmin && this.showAllOrgs)
                ? '/api/platform/organizations'
                : '/api/organizations';

            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.organizations = result.data || [];
            }
        } catch (error) {
            console.error('Error loading organizations:', error);
            this.organizations = [];
        }
    },

    /**
     * Load organization data for checklist evaluation
     */
    async loadOrgData() {
        const token = localStorage.getItem('insight360_token');
        const headers = {
            'Authorization': `Bearer ${token}`,
            'x-org-id': this.orgId
        };

        // Use platform API for org details if admin and showing all orgs
        const orgEndpoint = (this.isPlatformAdmin && this.showAllOrgs)
            ? `/api/platform/organizations/${this.orgId}`
            : `/api/organizations/${this.orgId}`;

        try {
            // Load data in parallel
            const [orgRes, membersRes, deptsRes, rolesRes, agentsRes, contextRes, soulRes, convoRes] = await Promise.allSettled([
                fetch(orgEndpoint, { headers }),
                fetch('/api/org-members', { headers }),
                fetch('/api/departments', { headers }),
                fetch('/api/department-roles', { headers }),
                fetch('/api/agents?limit=100', { headers }),
                fetch('/api/context?limit=1', { headers }),
                fetch(`/api/soul-config?org_id=${this.orgId}&scope=organization`, { headers }),
                fetch('/api/conversations?limit=1', { headers })
            ]);

            this.orgData = {
                organization: null,
                members: [],
                departments: [],
                roles: [],
                agentCount: 0,
                contextCount: 0,
                hasResources: false,
                soulConfig: null,
                hasConversations: false
            };

            if (orgRes.status === 'fulfilled' && orgRes.value?.ok) {
                const data = await orgRes.value.json();
                this.orgData.organization = data.data || data;
            }

            if (membersRes.status === 'fulfilled' && membersRes.value?.ok) {
                const data = await membersRes.value.json();
                this.orgData.members = data.data || [];
            }

            if (deptsRes.status === 'fulfilled' && deptsRes.value?.ok) {
                const data = await deptsRes.value.json();
                this.orgData.departments = data.data || data.departments || [];
            }

            if (rolesRes.status === 'fulfilled' && rolesRes.value?.ok) {
                const data = await rolesRes.value.json();
                this.orgData.roles = data.data || [];
            }

            if (agentsRes.status === 'fulfilled' && agentsRes.value?.ok) {
                const data = await agentsRes.value.json();
                const agents = data.data || [];
                this.orgData.agentCount = agents.length;
                this.orgData.hasResources = agents.length > 0;
            }

            if (contextRes.status === 'fulfilled' && contextRes.value?.ok) {
                const data = await contextRes.value.json();
                const items = data.data || [];
                this.orgData.contextCount = items.length;
            }

            if (soulRes.status === 'fulfilled' && soulRes.value?.ok) {
                const data = await soulRes.value.json();
                const config = data.data || data;
                // Consider soul config present if it has at least identity or values
                this.orgData.soulConfig = (config && (config.identity || config.values)) ? config : null;
            }

            if (convoRes.status === 'fulfilled' && convoRes.value?.ok) {
                const data = await convoRes.value.json();
                const convos = data.data || data.conversations || [];
                this.orgData.hasConversations = convos.length > 0;
            }

        } catch (error) {
            console.error('Error loading org data for checklist:', error);
        }
    },

    /**
     * Evaluate checklist and get results
     */
    evaluateChecklist() {
        return this.checklistItems.map(item => ({
            ...item,
            completed: item.check(this.orgData)
        }));
    },

    /**
     * Get items grouped by priority
     */
    getGroupedResults() {
        const results = this.evaluateChecklist();
        const groups = {};
        for (const group of this.priorityGroups) {
            groups[group.key] = results.filter(r => r.priority === group.key);
        }
        return groups;
    },

    /**
     * Get completion stats for a priority group
     */
    getGroupStats(items) {
        const completed = items.filter(r => r.completed).length;
        return { completed, total: items.length, percentage: items.length ? Math.round((completed / items.length) * 100) : 100 };
    },

    /**
     * Check if all required items are complete
     */
    isReady() {
        const results = this.evaluateChecklist();
        return results.filter(r => r.priority === 'required').every(r => r.completed);
    },

    /**
     * Get overall completion percentage
     */
    getCompletionPercentage() {
        const results = this.evaluateChecklist();
        const completed = results.filter(r => r.completed).length;
        return Math.round((completed / results.length) * 100);
    },

    /**
     * Toggle group collapse
     */
    toggleGroup(groupKey) {
        this.collapsedGroups[groupKey] = !this.collapsedGroups[groupKey];
        localStorage.setItem('onboarding_collapsed_groups', JSON.stringify(this.collapsedGroups));
        this.render();
    },

    /**
     * Render organization selector
     */
    renderOrgSelector() {
        if (this.organizations.length === 0 && !this.isPlatformAdmin) return '';

        const platformToggle = this.isPlatformAdmin ? `
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-left: auto;">
                <input type="checkbox" id="onboarding-show-all-orgs"
                    ${this.showAllOrgs ? 'checked' : ''}
                    onchange="OnboardingChecklist.toggleShowAllOrgs(this.checked)"
                    style="width: 16px; height: 16px; cursor: pointer;">
                <label for="onboarding-show-all-orgs" style="font-size: 0.85rem; cursor: pointer; white-space: nowrap;">Show all orgs</label>
            </div>
        ` : '';

        return `
            <div class="onboarding-org-selector">
                <label for="onboarding-org-select">Organization:</label>
                <select id="onboarding-org-select" onchange="OnboardingChecklist.handleOrgChange(this.value)">
                    ${this.organizations.map(org => {
                        // Detect personal orgs from settings or slug pattern
                        const isPersonal = org.settings?.is_personal || org.slug?.startsWith('personal-');
                        return `
                            <option value="${org.id}" ${org.id === this.orgId ? 'selected' : ''}>
                                ${this.escapeHtml(org.name)}${isPersonal ? ' (Personal)' : ''}
                            </option>
                        `;
                    }).join('')}
                </select>
                ${platformToggle}
            </div>
        `;
    },

    /**
     * Handle organization change from selector
     */
    async handleOrgChange(orgId) {
        if (!orgId) return;
        this.orgId = orgId;
        // Save to both keys for compatibility
        localStorage.setItem('selected_org_id', orgId);
        localStorage.setItem('currentOrgId', orgId);
        await this.loadOrgData();
        this.render();
    },

    /**
     * Render the checklist
     */
    render() {
        if (!this.container) return;

        const grouped = this.getGroupedResults();
        const percentage = this.getCompletionPercentage();
        const allResults = this.evaluateChecklist();
        const totalCompleted = allResults.filter(r => r.completed).length;
        const ready = this.isReady();

        this.container.innerHTML = `
            <div class="onboarding-checklist">
                <!-- Organization Selector -->
                ${this.renderOrgSelector()}

                <!-- Progress Header -->
                <div class="checklist-header">
                    <div class="checklist-title">
                        <h3>Onboarding Progress</h3>
                        <span class="checklist-org">${this.escapeHtml(this.orgData?.organization?.name || 'Organization')}</span>
                    </div>
                    <div class="checklist-progress-circle" data-percentage="${percentage}">
                        <svg viewBox="0 0 36 36">
                            <path class="progress-bg"
                                d="M18 2.0845
                                a 15.9155 15.9155 0 0 1 0 31.831
                                a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path class="progress-fill"
                                stroke-dasharray="${percentage}, 100"
                                d="M18 2.0845
                                a 15.9155 15.9155 0 0 1 0 31.831
                                a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                        </svg>
                        <span class="progress-text">${percentage}%</span>
                    </div>
                </div>

                <!-- Progress Bar -->
                <div class="checklist-progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="checklist-summary">
                    ${totalCompleted} of ${allResults.length} tasks completed
                </div>

                ${ready ? this.renderReadyBanner() : ''}

                <!-- Priority Groups -->
                ${this.priorityGroups.map(group => {
                    const items = grouped[group.key];
                    if (!items || items.length === 0) return '';
                    return this.renderPriorityGroup(group, items);
                }).join('')}

                ${!ready ? `
                    <div class="checklist-help">
                        <i data-lucide="info"></i>
                        <span>Complete all required items to unlock your organization. Click incomplete items to configure them.</span>
                    </div>
                ` : ''}
            </div>
        `;

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    /**
     * Render the "You're Ready!" banner
     */
    renderReadyBanner() {
        const percentage = this.getCompletionPercentage();
        const allDone = percentage === 100;

        return `
            <div class="checklist-ready-banner${allDone ? ' all-complete' : ''}">
                <div class="ready-banner-icon">
                    <i data-lucide="${allDone ? 'party-popper' : 'rocket'}"></i>
                </div>
                <div class="ready-banner-content">
                    <div class="ready-banner-title">${allDone ? 'Onboarding Complete!' : "You're Ready!"}</div>
                    <div class="ready-banner-message">
                        ${allDone
                            ? 'Congratulations! All onboarding tasks are complete. Your organization is fully configured.'
                            : 'All required items are done. Your organization is ready to use! Complete recommended and optional items to get the most out of the platform.'
                        }
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render a priority group section
     */
    renderPriorityGroup(group, items) {
        const stats = this.getGroupStats(items);
        const isCollapsed = this.collapsedGroups[group.key];
        const allComplete = stats.completed === stats.total;

        return `
            <div class="checklist-group ${group.key}${allComplete ? ' group-complete' : ''}">
                <div class="checklist-group-header" onclick="OnboardingChecklist.toggleGroup('${group.key}')">
                    <div class="group-header-left">
                        <i data-lucide="${isCollapsed ? 'chevron-right' : 'chevron-down'}" class="group-toggle-icon"></i>
                        <i data-lucide="${group.icon}" class="group-icon"></i>
                        <span class="group-label">${group.label}</span>
                        <span class="group-count">${stats.completed}/${stats.total}</span>
                    </div>
                    <div class="group-header-right">
                        ${allComplete ? '<i data-lucide="check-circle" class="group-done-icon"></i>' : ''}
                        <div class="group-progress-bar">
                            <div class="group-progress-fill" style="width: ${stats.percentage}%"></div>
                        </div>
                    </div>
                </div>
                ${!isCollapsed ? `
                    <div class="checklist-items">
                        ${items.map(item => this.renderChecklistItem(item)).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Render a single checklist item
     */
    renderChecklistItem(item) {
        const clickHandler = !item.completed
            ? (item.action
                ? `onclick="OnboardingChecklist.handleAction('${item.action}', event)"`
                : `onclick="window.location.href='${item.link}'"`)
            : '';

        return `
            <div class="checklist-item ${item.completed ? 'completed' : 'pending'}"
                 ${clickHandler}>
                <div class="checklist-item-status">
                    <i data-lucide="${item.completed ? 'check-circle' : 'circle'}"></i>
                </div>
                <div class="checklist-item-icon">
                    <i data-lucide="${item.icon}"></i>
                </div>
                <div class="checklist-item-content">
                    <div class="checklist-item-title">${item.title}</div>
                    <div class="checklist-item-description">${item.description}</div>
                </div>
                ${!item.completed ? `
                    <div class="checklist-item-action">
                        <i data-lucide="chevron-right"></i>
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Handle inline actions for checklist items
     */
    async handleAction(action, event) {
        event.stopPropagation();

        if (action === 'inviteTeamMember') {
            await this.showInviteModal();
        }
    },

    /**
     * Inline invite modal for the "Invite Team Members" checklist item
     */
    async showInviteModal() {
        if (typeof ModalService === 'undefined') {
            window.location.href = 'admin-org-members.html';
            return;
        }

        const result = await ModalService.form({
            title: 'Invite Team Member',
            fields: [
                {
                    name: 'email',
                    label: 'Email Address',
                    type: 'email',
                    required: true,
                    placeholder: 'colleague@company.com',
                    help: 'Enter their email. If they don\'t have an account yet, they\'ll receive an invitation to join.'
                },
                {
                    name: 'role',
                    label: 'Role',
                    type: 'select',
                    options: [
                        { value: 'member', label: 'Member' },
                        { value: 'admin', label: 'Admin' },
                        { value: 'viewer', label: 'Viewer' }
                    ],
                    value: 'member',
                    help: 'Admin: Full access | Member: Active team member | Viewer: Read-only'
                }
            ],
            submitText: 'Send Invitation',
            cancelText: 'Cancel',
            width: 500
        });

        if (!result) return;

        try {
            const token = localStorage.getItem('insight360_token');
            const response = await fetch(`/api/org-members/${this.orgId}/invite`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: result.email, role: result.role })
            });

            const data = await response.json();

            if (response.ok) {
                if (typeof showToast === 'function') {
                    showToast('Invitation sent successfully!', 'success');
                }
                // Refresh checklist to update completion state
                await this.refresh();
            } else {
                if (typeof showToast === 'function') {
                    showToast(data.error || 'Failed to send invitation', 'error');
                }
            }
        } catch (error) {
            console.error('Invite error:', error);
            if (typeof showToast === 'function') {
                showToast('Failed to send invitation', 'error');
            }
        }
    },

    /**
     * Render no organization state
     */
    renderNoOrg() {
        if (!this.container) return;

        // If we have organizations, show selector
        if (this.organizations.length > 0) {
            this.container.innerHTML = `
                <div class="onboarding-checklist">
                    ${this.renderOrgSelector()}
                    <div class="no-org-message" style="margin-top: 2rem;">
                        <i data-lucide="building-2"></i>
                        <h3>Select an Organization</h3>
                        <p>Choose an organization above to view its onboarding progress.</p>
                    </div>
                </div>
            `;
        } else {
            // No organizations exist
            this.container.innerHTML = `
                <div class="onboarding-checklist no-org">
                    <div class="no-org-message">
                        <i data-lucide="building-2"></i>
                        <h3>No Organization Selected</h3>
                        <p>Select an organization to view onboarding progress, or create a new one.</p>
                        <a href="admin-org-settings.html" class="btn btn-primary">
                            <i data-lucide="plus"></i>
                            Create Organization
                        </a>
                    </div>
                </div>
            `;
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    /**
     * Refresh checklist
     */
    async refresh() {
        await this.loadOrgData();
        this.render();
    },

    /**
     * Switch to different organization
     */
    async switchOrg(orgId) {
        this.orgId = orgId;
        await this.loadOrgData();
        this.render();
    },

    /**
     * Escape HTML
     */
    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[char]));
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OnboardingChecklist;
}
