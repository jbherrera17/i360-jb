/**
 * Onboarding Checklist Component
 * Phase 46: Administrator Page Reorganization
 *
 * Tracks onboarding progress for organizations.
 * Shows checklist of setup tasks with completion status.
 */

const OnboardingChecklist = {
    // Checklist items with check functions
    checklistItems: [
        {
            id: 'org-created',
            title: 'Organization Created',
            description: 'Basic organization information configured',
            icon: 'building-2',
            link: 'admin-org-settings.html',
            check: (data) => !!data.organization
        },
        {
            id: 'admin-assigned',
            title: 'Admin User Assigned',
            description: 'At least one admin user configured',
            icon: 'user-check',
            link: 'admin-org-members.html',
            check: (data) => data.members?.some(m => m.role === 'admin' || m.role === 'owner')
        },
        {
            id: 'tier-configured',
            title: 'Subscription Tier Configured',
            description: 'Appropriate tier selected for organization',
            icon: 'layers',
            link: 'admin-tier-setup.html',
            check: (data) => data.organization?.subscription_tier && data.organization.subscription_tier !== 'none'
        },
        {
            id: 'departments-created',
            title: 'Departments Created',
            description: 'At least one department set up',
            icon: 'git-branch',
            link: 'admin-org-settings.html#departments',
            check: (data) => data.departments?.length > 0
        },
        {
            id: 'roles-defined',
            title: 'Roles Defined',
            description: 'Department roles configured',
            icon: 'shield',
            link: 'admin-org-settings.html#roles',
            check: (data) => data.roles?.length > 0
        },
        {
            id: 'users-invited',
            title: 'Team Members Invited',
            description: 'Additional team members added',
            icon: 'users',
            link: 'admin-org-members.html',
            check: (data) => data.members?.length > 1
        },
        {
            id: 'branding-configured',
            title: 'Branding Configured',
            description: 'Organization logo and colors set',
            icon: 'palette',
            link: 'admin-org-customization.html',
            check: (data) => !!data.organization?.logo_url || !!data.organization?.primary_color
        },
        {
            id: 'resources-assigned',
            title: 'Resources Configured',
            description: 'Agents or skills assigned to organization',
            icon: 'puzzle',
            link: 'admin-resource-access.html',
            check: (data) => data.hasResources
        }
    ],

    // State
    orgId: null,
    orgData: null,
    organizations: [],
    container: null,
    isPlatformAdmin: false,
    showAllOrgs: false,

    /**
     * Initialize the checklist
     * @param {HTMLElement} container - Container element
     * @param {string} orgId - Organization ID (optional, defaults to selected org)
     */
    async init(container, orgId = null) {
        this.container = container;
        // Check multiple localStorage keys for compatibility
        this.orgId = orgId || localStorage.getItem('selected_org_id') || localStorage.getItem('currentOrgId');

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
            const [orgRes, membersRes, deptsRes, rolesRes, agentsRes] = await Promise.allSettled([
                fetch(orgEndpoint, { headers }),
                fetch('/api/org-members', { headers }),
                fetch('/api/departments', { headers }),
                fetch('/api/department-roles', { headers }),
                fetch('/api/agents?limit=1', { headers })
            ]);

            this.orgData = {
                organization: null,
                members: [],
                departments: [],
                roles: [],
                hasResources: false
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
                this.orgData.hasResources = (data.data?.length || 0) > 0;
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
     * Get completion percentage
     */
    getCompletionPercentage() {
        const results = this.evaluateChecklist();
        const completed = results.filter(r => r.completed).length;
        return Math.round((completed / results.length) * 100);
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

        const results = this.evaluateChecklist();
        const completed = results.filter(r => r.completed).length;
        const percentage = this.getCompletionPercentage();

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
                    ${completed} of ${results.length} tasks completed
                </div>

                <!-- Checklist Items -->
                <div class="checklist-items">
                    ${results.map(item => this.renderChecklistItem(item)).join('')}
                </div>

                ${percentage === 100 ? `
                    <div class="checklist-complete-message">
                        <i data-lucide="party-popper"></i>
                        <span>Congratulations! Onboarding is complete.</span>
                    </div>
                ` : `
                    <div class="checklist-help">
                        <i data-lucide="info"></i>
                        <span>Click on incomplete items to configure them.</span>
                    </div>
                `}
            </div>
        `;

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    /**
     * Render a single checklist item
     */
    renderChecklistItem(item) {
        return `
            <div class="checklist-item ${item.completed ? 'completed' : 'pending'}"
                 ${!item.completed ? `onclick="window.location.href='${item.link}'"` : ''}>
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
