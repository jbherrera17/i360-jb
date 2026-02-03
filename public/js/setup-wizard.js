/**
 * Setup Wizard Component
 * Phase 46: Administrator Page Reorganization
 *
 * Step-by-step wizard for setting up new organizations.
 * Guides administrators through initial configuration.
 */

const SetupWizard = {
    // Wizard configuration
    steps: [
        {
            id: 'org-details',
            title: 'Organization Details',
            icon: 'building-2',
            description: 'Basic information about the organization'
        },
        {
            id: 'tier-select',
            title: 'Select Tier',
            icon: 'layers',
            description: 'Choose subscription tier and limits'
        },
        {
            id: 'admin-user',
            title: 'Admin User',
            icon: 'user-check',
            description: 'Set up the organization admin'
        },
        {
            id: 'departments',
            title: 'Departments',
            icon: 'git-branch',
            description: 'Create initial departments (optional)'
        },
        {
            id: 'complete',
            title: 'Complete',
            icon: 'check-circle',
            description: 'Review and finish setup'
        }
    ],

    // State
    currentStep: 0,
    formData: {},
    tiers: [],
    container: null,

    /**
     * Initialize the wizard
     * @param {HTMLElement} container - Container element
     */
    async init(container) {
        this.container = container;
        this.currentStep = 0;
        this.formData = {
            name: '',
            slug: '',
            tier: 'starter',
            adminEmail: '',
            adminName: '',
            departments: []
        };

        // Load tiers
        await this.loadTiers();
        this.render();
    },

    /**
     * Load subscription tiers
     */
    async loadTiers() {
        try {
            const token = localStorage.getItem('insight360_token');
            const response = await fetch('/api/platform/tiers', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                this.tiers = data.data || [];
            }
        } catch (error) {
            console.warn('Could not load tiers:', error);
            // Default tiers fallback
            this.tiers = [
                { id: 'starter', name: 'Starter', max_members: 3, max_agents: 5 },
                { id: 'business', name: 'Business', max_members: 10, max_agents: 25 },
                { id: 'enterprise', name: 'Enterprise', max_members: 100, max_agents: 100 },
                { id: 'agency', name: 'Agency', max_members: 50, max_clients: 100, max_agents: 200 }
            ];
        }
    },

    /**
     * Render the wizard
     */
    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="setup-wizard">
                <!-- Progress Steps -->
                <div class="wizard-progress">
                    ${this.steps.map((step, index) => `
                        <div class="wizard-step ${index < this.currentStep ? 'completed' : ''} ${index === this.currentStep ? 'active' : ''}">
                            <div class="step-indicator">
                                <i data-lucide="${index < this.currentStep ? 'check' : step.icon}"></i>
                            </div>
                            <div class="step-label">${step.title}</div>
                        </div>
                        ${index < this.steps.length - 1 ? '<div class="step-connector"></div>' : ''}
                    `).join('')}
                </div>

                <!-- Step Content -->
                <div class="wizard-content">
                    <h2 class="wizard-step-title">
                        <i data-lucide="${this.steps[this.currentStep].icon}"></i>
                        ${this.steps[this.currentStep].title}
                    </h2>
                    <p class="wizard-step-description">${this.steps[this.currentStep].description}</p>

                    <div class="wizard-form">
                        ${this.renderStepContent()}
                    </div>
                </div>

                <!-- Navigation -->
                <div class="wizard-navigation">
                    <button class="btn btn-secondary" onclick="SetupWizard.previousStep()" ${this.currentStep === 0 ? 'disabled' : ''}>
                        <i data-lucide="chevron-left"></i>
                        Back
                    </button>
                    <div class="wizard-step-counter">
                        Step ${this.currentStep + 1} of ${this.steps.length}
                    </div>
                    ${this.currentStep === this.steps.length - 1 ? `
                        <button class="btn btn-success" onclick="SetupWizard.complete()">
                            <i data-lucide="check"></i>
                            Complete Setup
                        </button>
                    ` : `
                        <button class="btn btn-primary" onclick="SetupWizard.nextStep()">
                            Next
                            <i data-lucide="chevron-right"></i>
                        </button>
                    `}
                </div>
            </div>
        `;

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    /**
     * Render step content based on current step
     */
    renderStepContent() {
        switch (this.steps[this.currentStep].id) {
            case 'org-details':
                return this.renderOrgDetailsStep();
            case 'tier-select':
                return this.renderTierSelectStep();
            case 'admin-user':
                return this.renderAdminUserStep();
            case 'departments':
                return this.renderDepartmentsStep();
            case 'complete':
                return this.renderCompleteStep();
            default:
                return '<p>Unknown step</p>';
        }
    },

    /**
     * Step 1: Organization Details
     */
    renderOrgDetailsStep() {
        return `
            <div class="form-group">
                <label for="orgName">Organization Name *</label>
                <input type="text" id="orgName" class="form-input" value="${this.escapeHtml(this.formData.name)}"
                       onchange="SetupWizard.updateField('name', this.value); SetupWizard.generateSlug()"
                       placeholder="e.g., Acme Corporation">
            </div>
            <div class="form-group">
                <label for="orgSlug">URL Slug *</label>
                <input type="text" id="orgSlug" class="form-input" value="${this.escapeHtml(this.formData.slug)}"
                       onchange="SetupWizard.updateField('slug', this.value)"
                       placeholder="e.g., acme-corp">
                <small>This will be used in URLs: /org/${this.formData.slug || 'your-slug'}</small>
            </div>
            <div class="form-group">
                <label for="orgDescription">Description (optional)</label>
                <textarea id="orgDescription" class="form-input" rows="3"
                          onchange="SetupWizard.updateField('description', this.value)"
                          placeholder="Brief description of the organization">${this.escapeHtml(this.formData.description || '')}</textarea>
            </div>
        `;
    },

    /**
     * Step 2: Tier Selection
     */
    renderTierSelectStep() {
        return `
            <div class="tier-selection">
                ${this.tiers.map(tier => `
                    <div class="tier-option ${this.formData.tier === tier.id ? 'selected' : ''}"
                         onclick="SetupWizard.selectTier('${tier.id}')">
                        <div class="tier-option-header">
                            <span class="tier-badge tier-${tier.id}">${tier.name}</span>
                            ${this.formData.tier === tier.id ? '<i data-lucide="check-circle" class="tier-check"></i>' : ''}
                        </div>
                        <div class="tier-option-limits">
                            <div><strong>${tier.max_members === -1 ? 'Unlimited' : (tier.max_members || 0)}</strong> Members</div>
                            <div><strong>${tier.max_agents === -1 ? 'Unlimited' : (tier.max_agents || 0)}</strong> Agents</div>
                            ${tier.max_clients ? `<div><strong>${tier.max_clients === -1 ? 'Unlimited' : tier.max_clients}</strong> Clients</div>` : ''}
                        </div>
                        ${tier.description ? `<div class="tier-option-description">${tier.description}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Step 3: Admin User
     */
    renderAdminUserStep() {
        return `
            <div class="form-group">
                <label for="adminEmail">Admin Email *</label>
                <input type="email" id="adminEmail" class="form-input" value="${this.escapeHtml(this.formData.adminEmail)}"
                       onchange="SetupWizard.updateField('adminEmail', this.value)"
                       placeholder="admin@example.com">
            </div>
            <div class="form-group">
                <label for="adminName">Admin Name *</label>
                <input type="text" id="adminName" class="form-input" value="${this.escapeHtml(this.formData.adminName)}"
                       onchange="SetupWizard.updateField('adminName', this.value)"
                       placeholder="John Doe">
            </div>
            <div class="form-info">
                <i data-lucide="info"></i>
                <span>An invitation email will be sent to this address with login instructions.</span>
            </div>
        `;
    },

    /**
     * Step 4: Departments (Optional)
     */
    renderDepartmentsStep() {
        const defaultDepts = [
            { name: 'Marketing', icon: 'megaphone' },
            { name: 'Sales', icon: 'trending-up' },
            { name: 'Engineering', icon: 'code' },
            { name: 'Operations', icon: 'settings' },
            { name: 'Human Resources', icon: 'users' }
        ];

        return `
            <p class="step-info">Select common departments to add, or skip this step to add departments later.</p>

            <div class="department-options">
                ${defaultDepts.map(dept => `
                    <label class="department-option">
                        <input type="checkbox" ${this.formData.departments.includes(dept.name) ? 'checked' : ''}
                               onchange="SetupWizard.toggleDepartment('${dept.name}')">
                        <span class="department-option-content">
                            <i data-lucide="${dept.icon}"></i>
                            ${dept.name}
                        </span>
                    </label>
                `).join('')}
            </div>

            <div class="form-group" style="margin-top: 1.5rem;">
                <label>Custom Department</label>
                <div class="input-group">
                    <input type="text" id="customDept" class="form-input" placeholder="Enter department name">
                    <button class="btn btn-secondary" onclick="SetupWizard.addCustomDepartment()">Add</button>
                </div>
            </div>

            ${this.formData.departments.length > 0 ? `
                <div class="selected-departments">
                    <strong>Selected (${this.formData.departments.length}):</strong>
                    ${this.formData.departments.map(d => `<span class="dept-tag">${d}</span>`).join('')}
                </div>
            ` : ''}
        `;
    },

    /**
     * Step 5: Review and Complete
     */
    renderCompleteStep() {
        const tier = this.tiers.find(t => t.id === this.formData.tier);

        return `
            <div class="review-section">
                <h4>Organization</h4>
                <div class="review-item">
                    <span class="review-label">Name:</span>
                    <span class="review-value">${this.escapeHtml(this.formData.name)}</span>
                </div>
                <div class="review-item">
                    <span class="review-label">Slug:</span>
                    <span class="review-value">${this.escapeHtml(this.formData.slug)}</span>
                </div>
            </div>

            <div class="review-section">
                <h4>Subscription</h4>
                <div class="review-item">
                    <span class="review-label">Tier:</span>
                    <span class="review-value">
                        <span class="tier-badge tier-${this.formData.tier}">${tier?.name || this.formData.tier}</span>
                    </span>
                </div>
            </div>

            <div class="review-section">
                <h4>Administrator</h4>
                <div class="review-item">
                    <span class="review-label">Name:</span>
                    <span class="review-value">${this.escapeHtml(this.formData.adminName)}</span>
                </div>
                <div class="review-item">
                    <span class="review-label">Email:</span>
                    <span class="review-value">${this.escapeHtml(this.formData.adminEmail)}</span>
                </div>
            </div>

            ${this.formData.departments.length > 0 ? `
                <div class="review-section">
                    <h4>Departments (${this.formData.departments.length})</h4>
                    <div class="review-departments">
                        ${this.formData.departments.map(d => `<span class="dept-tag">${d}</span>`).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="review-notice">
                <i data-lucide="info"></i>
                <span>Click "Complete Setup" to create the organization and send an invitation to the admin.</span>
            </div>
        `;
    },

    /**
     * Update form field
     */
    updateField(field, value) {
        this.formData[field] = value;
    },

    /**
     * Generate slug from name
     */
    generateSlug() {
        const name = this.formData.name || '';
        const slug = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        this.formData.slug = slug;
        const slugInput = document.getElementById('orgSlug');
        if (slugInput) slugInput.value = slug;
    },

    /**
     * Select tier
     */
    selectTier(tierId) {
        this.formData.tier = tierId;
        this.render();
    },

    /**
     * Toggle department selection
     */
    toggleDepartment(deptName) {
        const idx = this.formData.departments.indexOf(deptName);
        if (idx === -1) {
            this.formData.departments.push(deptName);
        } else {
            this.formData.departments.splice(idx, 1);
        }
        this.render();
    },

    /**
     * Add custom department
     */
    addCustomDepartment() {
        const input = document.getElementById('customDept');
        const name = input?.value?.trim();
        if (name && !this.formData.departments.includes(name)) {
            this.formData.departments.push(name);
            input.value = '';
            this.render();
        }
    },

    /**
     * Validate current step
     */
    validateStep() {
        const step = this.steps[this.currentStep];

        switch (step.id) {
            case 'org-details':
                if (!this.formData.name?.trim()) {
                    this.showError('Organization name is required');
                    return false;
                }
                if (!this.formData.slug?.trim()) {
                    this.showError('URL slug is required');
                    return false;
                }
                return true;

            case 'tier-select':
                if (!this.formData.tier) {
                    this.showError('Please select a tier');
                    return false;
                }
                return true;

            case 'admin-user':
                if (!this.formData.adminEmail?.trim()) {
                    this.showError('Admin email is required');
                    return false;
                }
                if (!this.formData.adminName?.trim()) {
                    this.showError('Admin name is required');
                    return false;
                }
                return true;

            default:
                return true;
        }
    },

    /**
     * Go to next step
     */
    nextStep() {
        if (!this.validateStep()) return;

        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.render();
        }
    },

    /**
     * Go to previous step
     */
    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.render();
        }
    },

    /**
     * Complete the wizard
     */
    async complete() {
        if (!this.validateStep()) return;

        try {
            const token = localStorage.getItem('insight360_token');

            // Create organization
            const orgResponse = await fetch('/api/organizations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: this.formData.name,
                    slug: this.formData.slug,
                    description: this.formData.description,
                    subscription_tier: this.formData.tier
                })
            });

            if (!orgResponse.ok) {
                const data = await orgResponse.json();
                throw new Error(data.error || 'Failed to create organization');
            }

            const orgData = await orgResponse.json();
            const orgId = orgData.data?.id;

            // Create departments if any
            if (orgId && this.formData.departments.length > 0) {
                for (const deptName of this.formData.departments) {
                    await fetch('/api/departments', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'x-org-id': orgId
                        },
                        body: JSON.stringify({ name: deptName })
                    }).catch(e => console.warn('Could not create department:', deptName, e));
                }
            }

            // TODO: Send admin invitation email

            this.showSuccess('Organization created successfully!');

            // Reset wizard
            setTimeout(() => {
                window.location.href = 'admin-org-settings.html';
            }, 1500);

        } catch (error) {
            console.error('Error completing setup:', error);
            this.showError(error.message || 'Failed to complete setup');
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        if (typeof showToast === 'function') {
            showToast(message, 'error');
        } else {
            alert(message);
        }
    },

    /**
     * Show success message
     */
    showSuccess(message) {
        if (typeof showToast === 'function') {
            showToast(message, 'success');
        } else {
            alert(message);
        }
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
    module.exports = SetupWizard;
}
