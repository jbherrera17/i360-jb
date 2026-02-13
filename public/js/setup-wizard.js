/**
 * Setup Wizard Component
 * Phase 46 → Phase 55: Enhanced Organization Setup
 *
 * 8-step wizard for setting up new organizations.
 * Guides platform administrators through initial configuration
 * including Soul Configuration templates and module access.
 */

const SetupWizard = {
    // ========================================================================
    // Soul Configuration Templates
    // ========================================================================
    soulTemplates: [
        {
            id: 'saas_tech',
            name: 'SaaS / Technology',
            icon: 'code',
            description: 'Innovation-driven values with data privacy focus',
            completeness: 62,
            values: [
                { name: 'Innovation', meaning: 'We push boundaries while maintaining reliability', priority: 1, non_negotiable: false },
                { name: 'Transparency', meaning: 'We maintain clear visibility into decisions and data usage', priority: 2, non_negotiable: true },
                { name: 'Privacy', meaning: 'We protect user data with the highest standards', priority: 3, non_negotiable: true },
                { name: 'Agility', meaning: 'We adapt quickly to changing market conditions', priority: 4, non_negotiable: false }
            ],
            bright_lines: [
                { name: 'No Data Selling', description: 'Never sell or share user data without explicit consent', level: 'organization' },
                { name: 'Uptime Commitment', description: 'Never sacrifice system reliability for feature velocity', level: 'organization' }
            ],
            voice: { archetype: 'Innovative Pragmatist', tone: ['Professional', 'Forward-thinking', 'Clear', 'Empowering'] }
        },
        {
            id: 'healthcare',
            name: 'Healthcare',
            icon: 'heart-pulse',
            description: 'Patient safety, HIPAA compliance, and care quality',
            completeness: 62,
            values: [
                { name: 'Patient Safety', meaning: 'Patient wellbeing is our absolute priority', priority: 1, non_negotiable: true },
                { name: 'Privacy', meaning: 'HIPAA-compliant data handling at all times', priority: 2, non_negotiable: true },
                { name: 'Evidence-Based', meaning: 'Decisions grounded in clinical evidence and research', priority: 3, non_negotiable: true },
                { name: 'Compassion', meaning: 'Empathetic communication in all interactions', priority: 4, non_negotiable: false }
            ],
            bright_lines: [
                { name: 'No Medical Advice', description: 'AI never provides medical diagnoses or treatment recommendations without physician review', level: 'organization' },
                { name: 'HIPAA Absolute', description: 'Zero tolerance for any PHI exposure or unauthorized access', level: 'organization' }
            ],
            voice: { archetype: 'Trusted Care Partner', tone: ['Empathetic', 'Precise', 'Reassuring', 'Professional'] }
        },
        {
            id: 'legal',
            name: 'Legal / Compliance',
            icon: 'scale',
            description: 'Precision, confidentiality, and regulatory rigor',
            completeness: 62,
            values: [
                { name: 'Accuracy', meaning: 'Every statement must be verifiable and precise', priority: 1, non_negotiable: true },
                { name: 'Confidentiality', meaning: 'Client information is sacrosanct', priority: 2, non_negotiable: true },
                { name: 'Integrity', meaning: 'Ethical practice above all commercial interests', priority: 3, non_negotiable: true },
                { name: 'Diligence', meaning: 'Thorough analysis and complete consideration of factors', priority: 4, non_negotiable: false }
            ],
            bright_lines: [
                { name: 'No Legal Advice Without Review', description: 'AI outputs never constitute legal advice without attorney review', level: 'organization' },
                { name: 'Conflict Check Required', description: 'Always verify no conflicts of interest before engaging', level: 'organization' }
            ],
            voice: { archetype: 'Authoritative Counselor', tone: ['Precise', 'Measured', 'Authoritative', 'Discreet'] }
        },
        {
            id: 'finance',
            name: 'Finance / Banking',
            icon: 'landmark',
            description: 'Fiduciary responsibility, risk management, and trust',
            completeness: 62,
            values: [
                { name: 'Fiduciary Duty', meaning: 'Client financial interests always come first', priority: 1, non_negotiable: true },
                { name: 'Risk Awareness', meaning: 'All recommendations include clear risk disclosure', priority: 2, non_negotiable: true },
                { name: 'Regulatory Compliance', meaning: 'Full adherence to financial regulations', priority: 3, non_negotiable: true },
                { name: 'Transparency', meaning: 'Clear fee structures and decision rationale', priority: 4, non_negotiable: false }
            ],
            bright_lines: [
                { name: 'No Guaranteed Returns', description: 'Never promise or imply guaranteed investment returns', level: 'organization' },
                { name: 'Suitability First', description: 'Recommendations must match client risk profile and goals', level: 'organization' }
            ],
            voice: { archetype: 'Trusted Advisor', tone: ['Confident', 'Conservative', 'Data-driven', 'Measured'] }
        },
        {
            id: 'nonprofit',
            name: 'Nonprofit / Mission-Driven',
            icon: 'hand-heart',
            description: 'Mission alignment, impact focus, and community trust',
            completeness: 62,
            values: [
                { name: 'Mission Fidelity', meaning: 'Every action serves our core mission', priority: 1, non_negotiable: true },
                { name: 'Accountability', meaning: 'Transparent stewardship of resources and donations', priority: 2, non_negotiable: true },
                { name: 'Inclusivity', meaning: 'Equitable access and representation in all programs', priority: 3, non_negotiable: false },
                { name: 'Impact', meaning: 'Measurable outcomes that advance our cause', priority: 4, non_negotiable: false }
            ],
            bright_lines: [
                { name: 'Donor Intent', description: 'Restricted funds used only for designated purposes', level: 'organization' },
                { name: 'Beneficiary Dignity', description: 'Never exploit beneficiary stories for fundraising without consent', level: 'organization' }
            ],
            voice: { archetype: 'Passionate Advocate', tone: ['Warm', 'Inspiring', 'Authentic', 'Grounded'] }
        },
        {
            id: 'agency',
            name: 'Agency / Consultancy',
            icon: 'briefcase',
            description: 'Client success, strategic insight, and brand stewardship',
            completeness: 62,
            values: [
                { name: 'Client Success', meaning: 'Our success is measured by client outcomes', priority: 1, non_negotiable: true },
                { name: 'Strategic Insight', meaning: 'Data-informed recommendations that drive results', priority: 2, non_negotiable: false },
                { name: 'Transparency', meaning: 'Honest reporting and clear communication', priority: 3, non_negotiable: true },
                { name: 'Innovation', meaning: 'Fresh approaches grounded in proven frameworks', priority: 4, non_negotiable: false }
            ],
            bright_lines: [
                { name: 'Client Data Separation', description: 'Never use one client\'s data or insights to benefit another without consent', level: 'organization' },
                { name: 'Truthful Reporting', description: 'Never manipulate metrics or misrepresent performance data', level: 'organization' }
            ],
            voice: { archetype: 'Strategic Partner', tone: ['Confident', 'Strategic', 'Results-oriented', 'Collaborative'] }
        }
    ],

    // ========================================================================
    // Platform Modules (for module access step)
    // ========================================================================
    defaultModules: [
        { id: 'higgins', name: 'Higgins (AI Chat)', icon: 'graduation-cap', category: 'Core', min_tier: null, default: true },
        { id: 'agents', name: 'Agent Library', icon: 'bot', category: 'Core', min_tier: null, default: true },
        { id: 'context_assets', name: 'Context Assets', icon: 'database', category: 'Core', min_tier: null, default: true },
        { id: 'skills', name: 'Skills', icon: 'wand-2', category: 'Core', min_tier: null, default: true },
        { id: 'actions', name: 'Actions', icon: 'zap', category: 'Core', min_tier: null, default: true },
        { id: 'briefing', name: 'Briefing', icon: 'newspaper', category: 'Core', min_tier: null, default: true },
        { id: 'prompts', name: 'Prompt Transformer', icon: 'file-code', category: 'Core', min_tier: null, default: true },
        { id: 'align120', name: 'Align 120', icon: 'compass', category: 'Strategy', min_tier: 'business', default: true },
        { id: 'strategy120', name: 'Strategy (S2E)', icon: 'milestone', category: 'Strategy', min_tier: 'business', default: true },
        { id: 'execute120', name: 'Execute 120', icon: 'rocket', category: 'Strategy', min_tier: 'business', default: true },
        { id: 'workflows', name: 'Workflows', icon: 'git-branch', category: 'Advanced', min_tier: 'business', default: true },
        { id: 'research_studio', name: 'Research Studio', icon: 'book-open-text', category: 'Advanced', min_tier: 'business', default: true },
        { id: 'thought_leadership', name: 'Thought Leadership', icon: 'lightbulb', category: 'Advanced', min_tier: 'business', default: false },
        { id: 'agency_dashboard', name: 'Agency Dashboard', icon: 'gauge', category: 'Agency', min_tier: 'agency', default: true },
        { id: 'agency_customization', name: 'White-Label', icon: 'palette', category: 'Agency', min_tier: 'agency', default: true },
        { id: 'client_portal_admin', name: 'Portal Users', icon: 'user-check', category: 'Agency', min_tier: 'agency', default: true },
        { id: 'client_comparison', name: 'Client Comparison', icon: 'bar-chart-3', category: 'Agency', min_tier: 'agency', default: false }
    ],

    // Tier ordering for comparison
    tierOrder: { starter: 1, business: 2, enterprise: 3, agency: 4 },

    // ========================================================================
    // Wizard Steps
    // ========================================================================
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
            id: 'soul-setup',
            title: 'Values & Ethics',
            icon: 'heart',
            description: 'Choose a values template for the organization'
        },
        {
            id: 'module-access',
            title: 'Features',
            icon: 'grid-3x3',
            description: 'Configure which platform modules are enabled'
        },
        {
            id: 'departments',
            title: 'Departments',
            icon: 'git-branch',
            description: 'Create initial departments (optional)'
        },
        {
            id: 'starter-resources',
            title: 'Starter Resources',
            icon: 'rocket',
            description: 'Seed agents and content (optional)'
        },
        {
            id: 'complete',
            title: 'Complete',
            icon: 'check-circle',
            description: 'Review and finish setup'
        }
    ],

    // ========================================================================
    // State
    // ========================================================================
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
            description: '',
            tier: 'starter',
            adminEmail: '',
            adminName: '',
            soulTemplate: null,
            modules: this.getDefaultModules('starter'),
            departments: [],
            seedAgents: false,
            seedContext: false
        };

        await this.loadTiers();
        this.render();
    },

    /**
     * Get default enabled modules for a tier
     */
    getDefaultModules(tierId) {
        const tierLevel = this.tierOrder[tierId] || 1;
        return this.defaultModules
            .filter(m => {
                if (!m.min_tier) return m.default;
                const minLevel = this.tierOrder[m.min_tier] || 1;
                return tierLevel >= minLevel && m.default;
            })
            .map(m => m.id);
    },

    /**
     * Check if module is available for current tier
     */
    isModuleAvailable(moduleId) {
        const mod = this.defaultModules.find(m => m.id === moduleId);
        if (!mod || !mod.min_tier) return true;
        const tierLevel = this.tierOrder[this.formData.tier] || 1;
        const minLevel = this.tierOrder[mod.min_tier] || 1;
        return tierLevel >= minLevel;
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
            this.tiers = [
                { id: 'starter', name: 'Starter', max_members: 3, max_agents: 5 },
                { id: 'business', name: 'Business', max_members: 10, max_agents: 25 },
                { id: 'enterprise', name: 'Enterprise', max_members: 100, max_agents: 100 },
                { id: 'agency', name: 'Agency', max_members: 50, max_clients: 100, max_agents: 200 }
            ];
        }
    },

    // ========================================================================
    // Rendering
    // ========================================================================

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

    renderStepContent() {
        switch (this.steps[this.currentStep].id) {
            case 'org-details': return this.renderOrgDetailsStep();
            case 'tier-select': return this.renderTierSelectStep();
            case 'admin-user': return this.renderAdminUserStep();
            case 'soul-setup': return this.renderSoulSetupStep();
            case 'module-access': return this.renderModuleAccessStep();
            case 'departments': return this.renderDepartmentsStep();
            case 'starter-resources': return this.renderStarterResourcesStep();
            case 'complete': return this.renderCompleteStep();
            default: return '<p>Unknown step</p>';
        }
    },

    // ========================================================================
    // Step 1: Organization Details
    // ========================================================================
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

    // ========================================================================
    // Step 2: Tier Selection
    // ========================================================================
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

    // ========================================================================
    // Step 3: Admin User
    // ========================================================================
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

    // ========================================================================
    // Step 4: Soul Configuration Template (NEW)
    // ========================================================================
    renderSoulSetupStep() {
        return `
            <p class="step-info">Choose a values template that best matches this organization. The admin can customize it further later.</p>

            <div class="soul-template-grid">
                ${this.soulTemplates.map(t => `
                    <div class="soul-template-card ${this.formData.soulTemplate === t.id ? 'selected' : ''}"
                         onclick="SetupWizard.selectSoulTemplate('${t.id}')">
                        <div class="soul-template-header">
                            <i data-lucide="${t.icon}"></i>
                            <h4>${t.name}</h4>
                            ${this.formData.soulTemplate === t.id ? '<i data-lucide="check-circle" class="template-check"></i>' : ''}
                        </div>
                        <p class="soul-template-desc">${t.description}</p>
                        <div class="soul-template-meta">
                            <span class="soul-template-completeness">${t.completeness}% pre-configured</span>
                            <span class="soul-template-values">${t.values.length} values</span>
                        </div>
                    </div>
                `).join('')}
            </div>

            ${this.formData.soulTemplate ? this.renderSoulPreview() : `
                <div class="form-info" style="margin-top: 1rem;">
                    <i data-lucide="info"></i>
                    <span>Select a template to see a preview. You can skip this step to configure later.</span>
                </div>
            `}
        `;
    },

    renderSoulPreview() {
        const template = this.soulTemplates.find(t => t.id === this.formData.soulTemplate);
        if (!template) return '';

        return `
            <div class="soul-preview" style="margin-top: 1.5rem; padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <h4 style="margin: 0 0 0.75rem; font-size: 0.9rem; color: var(--text-secondary);">Template Preview</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <strong style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Core Values</strong>
                        <ul style="margin: 0.5rem 0 0; padding-left: 1.25rem; font-size: 0.85rem;">
                            ${template.values.map(v => `<li>${v.name}${v.non_negotiable ? ' <span style="color: var(--danger); font-size: 0.75rem;">(non-negotiable)</span>' : ''}</li>`).join('')}
                        </ul>
                    </div>
                    <div>
                        <strong style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Bright Lines</strong>
                        <ul style="margin: 0.5rem 0 0; padding-left: 1.25rem; font-size: 0.85rem;">
                            ${template.bright_lines.map(b => `<li>${b.name}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                <div style="margin-top: 0.75rem;">
                    <strong style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Voice</strong>
                    <p style="margin: 0.25rem 0 0; font-size: 0.85rem;">${template.voice.archetype} &mdash; ${template.voice.tone.join(', ')}</p>
                </div>
            </div>
        `;
    },

    selectSoulTemplate(templateId) {
        this.formData.soulTemplate = this.formData.soulTemplate === templateId ? null : templateId;
        this.render();
    },

    // ========================================================================
    // Step 5: Module Access (NEW)
    // ========================================================================
    renderModuleAccessStep() {
        const tier = this.tiers.find(t => t.id === this.formData.tier) || { name: this.formData.tier };
        const categories = [...new Set(this.defaultModules.map(m => m.category))];

        return `
            <p class="step-info">Configure which features this organization can access. Availability is based on the <strong>${tier.name}</strong> tier.</p>

            ${categories.map(cat => {
                const modules = this.defaultModules.filter(m => m.category === cat);
                return `
                    <div class="module-category" style="margin-bottom: 1.25rem;">
                        <h4 style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem;">${cat}</h4>
                        <div class="module-list">
                            ${modules.map(mod => {
                                const available = this.isModuleAvailable(mod.id);
                                const enabled = this.formData.modules.includes(mod.id);
                                return `
                                    <label class="module-item ${!available ? 'disabled' : ''}" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-bottom: 0.35rem; cursor: ${available ? 'pointer' : 'not-allowed'}; opacity: ${available ? '1' : '0.5'}; background: ${enabled && available ? 'rgba(99, 102, 241, 0.08)' : 'transparent'};">
                                        <input type="checkbox"
                                               ${enabled ? 'checked' : ''}
                                               ${!available ? 'disabled' : ''}
                                               onchange="SetupWizard.toggleModule('${mod.id}', this.checked)"
                                               style="width: 16px; height: 16px; flex-shrink: 0;">
                                        <i data-lucide="${mod.icon}" style="width: 18px; height: 18px; flex-shrink: 0; color: ${available ? 'var(--primary)' : 'var(--text-muted)'};"></i>
                                        <div style="flex: 1; min-width: 0;">
                                            <strong style="font-size: 0.9rem;">${mod.name}</strong>
                                            ${!available ? `<span style="font-size: 0.75rem; color: var(--warning); margin-left: 0.5rem;">${mod.min_tier}+ required</span>` : ''}
                                        </div>
                                    </label>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('')}

            <div class="form-info">
                <i data-lucide="info"></i>
                <span>${this.formData.modules.length} modules enabled. The admin can adjust this in Resource Access later.</span>
            </div>
        `;
    },

    toggleModule(moduleId, enabled) {
        if (enabled && !this.formData.modules.includes(moduleId)) {
            this.formData.modules.push(moduleId);
        } else if (!enabled) {
            this.formData.modules = this.formData.modules.filter(id => id !== moduleId);
        }
        // Re-render the info line
        const info = this.container?.querySelector('.form-info span');
        if (info) info.textContent = `${this.formData.modules.length} modules enabled. The admin can adjust this in Resource Access later.`;
    },

    // ========================================================================
    // Step 6: Departments (Optional)
    // ========================================================================
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

    // ========================================================================
    // Step 7: Starter Resources (NEW, Optional)
    // ========================================================================
    renderStarterResourcesStep() {
        return `
            <p class="step-info">Optionally seed the organization with starter content to help them get productive immediately.</p>

            <div class="resource-options" style="display: flex; flex-direction: column; gap: 0.75rem;">
                <label class="resource-option" style="display: flex; align-items: flex-start; gap: 0.75rem; padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); cursor: pointer; background: ${this.formData.seedAgents ? 'rgba(99, 102, 241, 0.08)' : 'transparent'};">
                    <input type="checkbox" ${this.formData.seedAgents ? 'checked' : ''}
                           onchange="SetupWizard.updateField('seedAgents', this.checked); SetupWizard.render()"
                           style="width: 18px; height: 18px; flex-shrink: 0; margin-top: 2px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                            <i data-lucide="bot" style="width: 18px; height: 18px; color: var(--primary);"></i>
                            <strong>Seed Starter Agents</strong>
                        </div>
                        <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">Create 5 general-purpose agents (Research, Content, Strategy, Assessment, Productivity) to get the team started.</p>
                    </div>
                </label>

                <label class="resource-option" style="display: flex; align-items: flex-start; gap: 0.75rem; padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); cursor: pointer; background: ${this.formData.seedContext ? 'rgba(99, 102, 241, 0.08)' : 'transparent'};">
                    <input type="checkbox" ${this.formData.seedContext ? 'checked' : ''}
                           onchange="SetupWizard.updateField('seedContext', this.checked); SetupWizard.render()"
                           style="width: 18px; height: 18px; flex-shrink: 0; margin-top: 2px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                            <i data-lucide="database" style="width: 18px; height: 18px; color: var(--success);"></i>
                            <strong>Seed Context Templates</strong>
                        </div>
                        <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">Create starter context asset templates (ICP, Value Proposition, Brand Voice, Company Overview) for the team to fill in.</p>
                    </div>
                </label>
            </div>

            <div class="form-info" style="margin-top: 1rem;">
                <i data-lucide="info"></i>
                <span>These can also be created manually later. Seeded resources are templates the admin can customize.</span>
            </div>
        `;
    },

    // ========================================================================
    // Step 8: Review and Complete
    // ========================================================================
    renderCompleteStep() {
        const tier = this.tiers.find(t => t.id === this.formData.tier);
        const soulTemplate = this.soulTemplates.find(t => t.id === this.formData.soulTemplate);

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

            <div class="review-section">
                <h4>Values & Ethics</h4>
                <div class="review-item">
                    <span class="review-label">Template:</span>
                    <span class="review-value">${soulTemplate ? soulTemplate.name : '<em>None selected (configure later)</em>'}</span>
                </div>
            </div>

            <div class="review-section">
                <h4>Features</h4>
                <div class="review-item">
                    <span class="review-label">Modules:</span>
                    <span class="review-value">${this.formData.modules.length} enabled</span>
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

            <div class="review-section">
                <h4>Starter Resources</h4>
                <div class="review-item">
                    <span class="review-label">Seed Agents:</span>
                    <span class="review-value">${this.formData.seedAgents ? 'Yes (5 starter agents)' : 'No'}</span>
                </div>
                <div class="review-item">
                    <span class="review-label">Seed Context:</span>
                    <span class="review-value">${this.formData.seedContext ? 'Yes (4 templates)' : 'No'}</span>
                </div>
            </div>

            <div class="review-notice">
                <i data-lucide="info"></i>
                <span>Click "Complete Setup" to create the organization and send an invitation to the admin.</span>
            </div>
        `;
    },

    // ========================================================================
    // Form Helpers
    // ========================================================================

    updateField(field, value) {
        this.formData[field] = value;
    },

    generateSlug() {
        const name = this.formData.name || '';
        const slug = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        this.formData.slug = slug;
        const slugInput = document.getElementById('orgSlug');
        if (slugInput) slugInput.value = slug;
    },

    selectTier(tierId) {
        this.formData.tier = tierId;
        // Recalculate default modules for new tier
        this.formData.modules = this.getDefaultModules(tierId);
        this.render();
    },

    toggleDepartment(deptName) {
        const idx = this.formData.departments.indexOf(deptName);
        if (idx === -1) {
            this.formData.departments.push(deptName);
        } else {
            this.formData.departments.splice(idx, 1);
        }
        this.render();
    },

    addCustomDepartment() {
        const input = document.getElementById('customDept');
        const name = input?.value?.trim();
        if (name && !this.formData.departments.includes(name)) {
            this.formData.departments.push(name);
            input.value = '';
            this.render();
        }
    },

    // ========================================================================
    // Validation
    // ========================================================================

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

    // ========================================================================
    // Navigation
    // ========================================================================

    nextStep() {
        if (!this.validateStep()) return;

        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.render();
        }
    },

    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.render();
        }
    },

    // ========================================================================
    // Complete
    // ========================================================================

    async complete() {
        if (!this.validateStep()) return;

        try {
            const token = localStorage.getItem('insight360_token');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            // 1. Create organization
            const orgResponse = await fetch('/api/organizations', {
                method: 'POST',
                headers,
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

            if (!orgId) throw new Error('Organization created but no ID returned');

            const orgHeaders = { ...headers, 'x-org-id': orgId };

            // 2. Create departments if any
            if (this.formData.departments.length > 0) {
                for (const deptName of this.formData.departments) {
                    await fetch('/api/departments', {
                        method: 'POST',
                        headers: orgHeaders,
                        body: JSON.stringify({ name: deptName })
                    }).catch(e => console.warn('Could not create department:', deptName, e));
                }
            }

            // 3. Apply soul config template if selected
            if (this.formData.soulTemplate) {
                const template = this.soulTemplates.find(t => t.id === this.formData.soulTemplate);
                if (template) {
                    await fetch('/api/soul-config', {
                        method: 'POST',
                        headers: orgHeaders,
                        body: JSON.stringify({
                            scope: 'organization',
                            org_id: orgId,
                            identity: { name: this.formData.name, description: this.formData.description || '' },
                            values: template.values,
                            bright_lines: template.bright_lines,
                            voice: template.voice
                        })
                    }).catch(e => console.warn('Could not create soul config:', e));
                }
            }

            // 4. Configure module access if non-default
            if (this.formData.modules.length > 0) {
                await fetch(`/api/platform/organizations/${orgId}/modules`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({ modules: this.formData.modules })
                }).catch(e => console.warn('Could not configure modules:', e));
            }

            // 5. Seed starter agents if requested
            if (this.formData.seedAgents) {
                await fetch(`/api/agents/seed`, {
                    method: 'POST',
                    headers: orgHeaders,
                    body: JSON.stringify({ org_id: orgId })
                }).catch(e => console.warn('Could not seed agents:', e));
            }

            // 6. Seed context templates if requested
            if (this.formData.seedContext) {
                await fetch(`/api/context/seed`, {
                    method: 'POST',
                    headers: orgHeaders,
                    body: JSON.stringify({ org_id: orgId })
                }).catch(e => console.warn('Could not seed context:', e));
            }

            // TODO: Send admin invitation email

            this.showSuccess('Organization created successfully!');

            setTimeout(() => {
                window.location.href = 'admin-org-settings.html';
            }, 1500);

        } catch (error) {
            console.error('Error completing setup:', error);
            this.showError(error.message || 'Failed to complete setup');
        }
    },

    // ========================================================================
    // Utilities
    // ========================================================================

    showError(message) {
        if (typeof showToast === 'function') {
            showToast(message, 'error');
        } else if (typeof ModalService !== 'undefined' && ModalService.error) {
            ModalService.error(message);
        } else {
            alert(message);
        }
    },

    showSuccess(message) {
        if (typeof showToast === 'function') {
            showToast(message, 'success');
        } else if (typeof ModalService !== 'undefined' && ModalService.success) {
            ModalService.success(message);
        } else {
            alert(message);
        }
    },

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
