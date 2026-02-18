/**
 * TransformAssetModal - Transform prompts/content into Insight 360 assets
 *
 * Two-step modal:
 *   Step 1: Input content + select target type (Auto/Skill/Voice/ICP/Agent)
 *   Step 2: Preview transformed result + edit fields + save
 *
 * Used by ChatAssetCreator from the chat page.
 *
 * @extends ModalBase
 * @version 1.0.0
 */
class TransformAssetModal extends ModalBase {

    static TYPE_CONFIG = {
        auto:     { icon: 'sparkles', label: 'Auto',  description: 'Auto-detect best format' },
        skill:    { icon: 'wand-2',   label: 'Skill', description: 'Reusable workflow with triggers' },
        voice_dna:{ icon: 'mic',      label: 'Voice', description: 'Brand voice & writing style' },
        icp:      { icon: 'users',    label: 'ICP',   description: 'Ideal customer profile' },
        agent:    { icon: 'bot',      label: 'Agent', description: 'AI agent with role & capabilities' }
    };

    constructor(options = {}) {
        super({
            ...options,
            title: options.title || 'Transform into Asset',
            draggable: true,
            resizable: true,
            closeOnOverlayClick: false,
            width: 720,
            height: 620,
            minSize: { width: 500, height: 450 },
            className: `i360-transform-asset-modal ${options.className || ''}`.trim()
        });

        this.callbacks = {
            onSave: options.onSave || null,
            onCancel: options.onCancel || null
        };

        // Initial state
        this._sourceContent = options.sourceContent || '';
        this._sourceName = options.sourceName || '';
        this._preselectedType = options.targetType || null;
        this._currentStep = 1;
        this._selectedType = this._preselectedType || 'auto';
        this._isTransforming = false;
        this._transformedData = null;
        this._detectedType = null;
        this._analysisTimeout = null;
    }

    // =========================================================================
    // DOM CREATION
    // =========================================================================

    _createElements() {
        super._createElements();

        // Update title with icon
        this.elements.title.innerHTML = `
            <i data-lucide="sparkles" style="width:20px;height:20px;color:var(--primary);"></i>
            Transform into Asset
        `;

        // Build step containers
        this._createStep1();
        this._createStep2();
        this._createFooter();

        // Show initial step
        this._showStep(1);

        // If content is pre-filled, run analysis
        if (this._sourceContent) {
            setTimeout(() => this._analyzeContent(), 300);
        }

        // If type is preselected, skip to auto-transform
        if (this._preselectedType && this._sourceContent) {
            this._selectedType = this._preselectedType;
            setTimeout(() => this._doTransform(), 500);
        }
    }

    _createStep1() {
        const step = document.createElement('div');
        step.className = 'transform-step transform-step-1';

        // Add contextual help banner
        if (typeof ModalHelpBanner !== 'undefined') {
            const helpBanner = ModalHelpBanner.create({
                key: 'transform-asset',
                title: 'How Transform Works',
                content: 'Paste any content — a system prompt, chat response, or document excerpt — and AI will transform it into a structured Insight 360 asset. Choose a target type (Skill, Voice DNA, ICP, or Agent) or select "Auto" to let AI detect the best format. You\'ll preview and edit the result before saving.',
                startExpanded: false
            });
            step.appendChild(helpBanner);
        }

        const inner = document.createElement('div');
        inner.innerHTML = `
            <div class="transform-input-section">
                <label class="transform-label">Content to Transform</label>
                <textarea class="transform-textarea" placeholder="Paste a system prompt, chat response, or any content to transform into a structured asset..."></textarea>
                <div class="transform-analysis-bar" style="display:none;">
                    <div class="analysis-detected">
                        <i data-lucide="scan" style="width:14px;height:14px;"></i>
                        <span>Detected: <strong class="analysis-type-label">-</strong></span>
                        <span class="analysis-confidence">-</span>
                    </div>
                    <div class="analysis-stats">
                        <span class="analysis-word-count">0 words</span>
                    </div>
                </div>
            </div>
            <div class="transform-type-section">
                <label class="transform-label">Target Type</label>
                <div class="transform-type-buttons"></div>
            </div>
        `;
        while (inner.firstChild) step.appendChild(inner.firstChild);

        this.elements.body.appendChild(step);
        this.elements.step1 = step;

        // Store refs
        this.elements.textarea = step.querySelector('.transform-textarea');
        this.elements.analysisBar = step.querySelector('.transform-analysis-bar');
        this.elements.typeLabel = step.querySelector('.analysis-type-label');
        this.elements.confidence = step.querySelector('.analysis-confidence');
        this.elements.wordCount = step.querySelector('.analysis-word-count');
        this.elements.typeButtons = step.querySelector('.transform-type-buttons');

        // Fill textarea
        this.elements.textarea.value = this._sourceContent;

        // Build type buttons
        for (const [type, config] of Object.entries(TransformAssetModal.TYPE_CONFIG)) {
            const btn = document.createElement('button');
            btn.className = `transform-type-btn ${type === this._selectedType ? 'active' : ''}`;
            btn.dataset.type = type;
            btn.innerHTML = `
                <i data-lucide="${config.icon}" style="width:16px;height:16px;"></i>
                <span>${config.label}</span>
            `;
            btn.title = config.description;
            btn.addEventListener('click', () => this._selectType(type));
            this.elements.typeButtons.appendChild(btn);
        }

        // Textarea input handler for analysis
        this.elements.textarea.addEventListener('input', () => {
            this._sourceContent = this.elements.textarea.value;
            this._analyzeContent();
            this._updateFooterState();
        });
    }

    _createStep2() {
        const step = document.createElement('div');
        step.className = 'transform-step transform-step-2';
        step.style.display = 'none';
        step.innerHTML = `
            <div class="transform-result-header">
                <div class="result-type-badge">
                    <i data-lucide="check-circle" style="width:16px;height:16px;"></i>
                    <span class="result-type-name">-</span>
                </div>
            </div>
            <div class="transform-result-body">
                <div class="result-tabs">
                    <button class="result-tab active" data-tab="form">Edit</button>
                    <button class="result-tab" data-tab="json">JSON</button>
                </div>
                <div class="result-tab-content result-form-content"></div>
                <div class="result-tab-content result-json-content" style="display:none;"></div>
            </div>
        `;

        this.elements.body.appendChild(step);
        this.elements.step2 = step;

        // Store refs
        this.elements.resultTypeName = step.querySelector('.result-type-name');
        this.elements.formContent = step.querySelector('.result-form-content');
        this.elements.jsonContent = step.querySelector('.result-json-content');

        // Tab switching
        step.querySelectorAll('.result-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                step.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const tabName = tab.dataset.tab;
                this.elements.formContent.style.display = tabName === 'form' ? '' : 'none';
                this.elements.jsonContent.style.display = tabName === 'json' ? '' : 'none';
            });
        });
    }

    _createFooter() {
        this.elements.footer.style.display = '';
        this.elements.footer.innerHTML = `
            <button class="i360-modal-btn i360-modal-btn-secondary transform-cancel-btn">Cancel</button>
            <div style="display:flex;gap:8px;">
                <button class="i360-modal-btn i360-modal-btn-secondary transform-back-btn" style="display:none;">
                    <i data-lucide="arrow-left" style="width:14px;height:14px;"></i> Back
                </button>
                <button class="i360-modal-btn i360-modal-btn-primary transform-next-btn" disabled>
                    <i data-lucide="wand-2" style="width:14px;height:14px;"></i> Transform
                </button>
                <button class="i360-modal-btn i360-modal-btn-primary transform-save-btn" style="display:none;">
                    <i data-lucide="save" style="width:14px;height:14px;"></i> Save to Insight 360
                </button>
            </div>
        `;

        this.elements.cancelBtn = this.elements.footer.querySelector('.transform-cancel-btn');
        this.elements.backBtn = this.elements.footer.querySelector('.transform-back-btn');
        this.elements.nextBtn = this.elements.footer.querySelector('.transform-next-btn');
        this.elements.saveBtn = this.elements.footer.querySelector('.transform-save-btn');

        this.elements.cancelBtn.addEventListener('click', () => this._handleCancel());
        this.elements.backBtn.addEventListener('click', () => this._goBack());
        this.elements.nextBtn.addEventListener('click', () => this._doTransform());
        this.elements.saveBtn.addEventListener('click', () => this._handleSave());
    }

    // =========================================================================
    // STEP NAVIGATION
    // =========================================================================

    _showStep(num) {
        this._currentStep = num;
        this.elements.step1.style.display = num === 1 ? '' : 'none';
        this.elements.step2.style.display = num === 2 ? '' : 'none';
        this.elements.backBtn.style.display = num === 2 ? '' : 'none';
        this.elements.nextBtn.style.display = num === 1 ? '' : 'none';
        this.elements.saveBtn.style.display = num === 2 ? '' : 'none';
        this._updateFooterState();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    _goBack() {
        this._showStep(1);
    }

    _updateFooterState() {
        const content = this.elements.textarea ? this.elements.textarea.value.trim() : '';
        this.elements.nextBtn.disabled = content.length < 20 || this._isTransforming;
    }

    // =========================================================================
    // TYPE SELECTION
    // =========================================================================

    _selectType(type) {
        this._selectedType = type;
        this.elements.typeButtons.querySelectorAll('.transform-type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
    }

    // =========================================================================
    // CONTENT ANALYSIS
    // =========================================================================

    _analyzeContent() {
        const content = this.elements.textarea.value.trim();
        const wordCount = content ? content.split(/\s+/).length : 0;
        this.elements.wordCount.textContent = `${wordCount} words`;

        if (content.length < 20) {
            this.elements.analysisBar.style.display = 'none';
            return;
        }

        this.elements.analysisBar.style.display = '';

        clearTimeout(this._analysisTimeout);
        this._analysisTimeout = setTimeout(async () => {
            try {
                const response = await fetch('/api/prompts/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: content })
                });
                const data = await response.json();
                if (data.success) {
                    this._detectedType = data.data.detected_type;
                    const typeConfig = TransformAssetModal.TYPE_CONFIG[data.data.detected_type];
                    this.elements.typeLabel.textContent = typeConfig ? typeConfig.label : data.data.detected_type;
                    this.elements.confidence.textContent = data.data.confidence;
                    this.elements.confidence.className = `analysis-confidence confidence-${data.data.confidence}`;
                }
            } catch (err) {
                console.error('Analysis error:', err);
            }
        }, 500);

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // =========================================================================
    // TRANSFORMATION
    // =========================================================================

    async _doTransform() {
        const content = this.elements.textarea.value.trim();
        if (content.length < 20) return;

        this._isTransforming = true;
        this.elements.nextBtn.disabled = true;
        this.elements.nextBtn.innerHTML = '<i data-lucide="loader-2" style="width:14px;height:14px;" class="spin-icon"></i> Transforming...';
        if (typeof lucide !== 'undefined') lucide.createIcons();

        try {
            const response = await fetch('/api/prompts/transform', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: content,
                    target_type: this._selectedType,
                    save: false
                })
            });

            const data = await response.json();

            if (data.success) {
                this._transformedData = data.data;
                this._renderStep2(data.data);
                this._showStep(2);
            } else {
                this._showError(data.error || 'Transformation failed. Please try again.');
            }
        } catch (err) {
            console.error('Transform error:', err);
            this._showError('Network error during transformation.');
        } finally {
            this._isTransforming = false;
            this.elements.nextBtn.disabled = false;
            this.elements.nextBtn.innerHTML = '<i data-lucide="wand-2" style="width:14px;height:14px;"></i> Transform';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    // =========================================================================
    // STEP 2 RENDERING
    // =========================================================================

    _renderStep2(data) {
        const targetType = data.target_type;
        const transformed = data.transformed;
        const typeConfig = TransformAssetModal.TYPE_CONFIG[targetType] || TransformAssetModal.TYPE_CONFIG.auto;

        this.elements.resultTypeName.textContent = typeConfig.label;

        // Render form based on type
        switch (targetType) {
            case 'skill':
                this._renderSkillForm(transformed);
                break;
            case 'voice_dna':
                this._renderVoiceDNAForm(transformed);
                break;
            case 'icp':
                this._renderICPForm(transformed);
                break;
            case 'agent':
                this._renderAgentForm(transformed);
                break;
            default:
                this._renderGenericForm(transformed, targetType);
        }

        // Render JSON tab
        this.elements.jsonContent.innerHTML = `<pre class="transform-json-preview">${this._syntaxHighlight(JSON.stringify(transformed, null, 2))}</pre>`;
    }

    // --- Skill Form ---
    _renderSkillForm(data) {
        this.elements.formContent.innerHTML = `
            <div class="transform-form-grid">
                ${this._field('Name', 'skill_name', data.name || data.display_name || this._sourceName || '', 'text')}
                ${this._field('Display Name', 'skill_display_name', data.display_name || '', 'text')}
                ${this._field('Description', 'skill_description', data.description || '', 'textarea-sm')}
                ${this._field('Instructions', 'skill_instructions', data.instructions || '', 'textarea')}
                ${this._field('Triggers (comma-separated)', 'skill_triggers', (data.triggers || []).join(', '), 'text')}
                ${this._field('Best Practices (one per line)', 'skill_best_practices', (data.best_practices || []).join('\n'), 'textarea-sm')}
            </div>
        `;
    }

    // --- Voice DNA Form ---
    _renderVoiceDNAForm(data) {
        const ci = data.core_identity || {};
        const personality = data.personality || {};
        const tone = data.tone || {};
        this.elements.formContent.innerHTML = `
            <div class="transform-form-grid">
                ${this._field('Name', 'voice_name', this._sourceName || '', 'text', 'Enter a name for this Voice DNA')}
                <div class="form-section-label">Core Identity</div>
                ${this._field('Who You Are', 'voice_who', ci.who_you_are || '', 'text')}
                ${this._field('What You Do', 'voice_what', ci.what_you_do || '', 'text')}
                ${this._field('Your Angle', 'voice_angle', ci.your_angle || '', 'text')}
                <div class="form-section-label">Personality & Tone</div>
                ${this._field('Traits (comma-separated)', 'voice_traits', (personality.traits || []).join(', '), 'text')}
                ${this._field('Energy', 'voice_energy', personality.energy || '', 'text')}
                ${this._field('Primary Tone', 'voice_primary_tone', tone.primary_tone || '', 'text')}
                ${this._field('Secondary Tone', 'voice_secondary_tone', tone.secondary_tone || '', 'text')}
                ${this._field('Formality (1-10)', 'voice_formality', tone.how_formal || 5, 'number')}
            </div>
        `;
    }

    // --- ICP Form ---
    _renderICPForm(data) {
        const po = data.profile_overview || {};
        const demo = data.demographics || {};
        const psycho = data.psychographics || {};
        this.elements.formContent.innerHTML = `
            <div class="transform-form-grid">
                ${this._field('Name', 'icp_name', po.name || this._sourceName || '', 'text', 'Enter a name for this ICP')}
                ${this._field('One-Line Description', 'icp_description', po.one_line_description || '', 'text')}
                ${this._field('Why They Follow You', 'icp_why', po.why_they_follow_you || '', 'textarea-sm')}
                <div class="form-section-label">Demographics</div>
                ${this._field('Job Titles (comma-separated)', 'icp_jobs', (demo.job_titles || []).join(', '), 'text')}
                ${this._field('Industries (comma-separated)', 'icp_industries', (demo.industries || []).join(', '), 'text')}
                ${this._field('Experience Level', 'icp_experience', demo.experience_level || '', 'text')}
                <div class="form-section-label">Psychographics</div>
                ${this._field('Values (comma-separated)', 'icp_values', ((psycho.values || {}).list || []).join(', '), 'text')}
                ${this._field('Frustrations (comma-separated)', 'icp_frustrations', ((psycho.frustrations || {}).list || []).join(', '), 'text')}
                ${this._field('Aspirations (comma-separated)', 'icp_aspirations', ((psycho.aspirations || {}).list || []).join(', '), 'text')}
            </div>
        `;
    }

    // --- Agent Form ---
    _renderAgentForm(data) {
        const categories = ['strategy', 'operations', 'creative', 'technical', 'support', 'research', 'custom'];
        const suites = ['align', 'strategy', 'execute'];
        const providers = [
            { value: 'anthropic', label: 'Anthropic (Claude)' },
            { value: 'openai', label: 'OpenAI (GPT)' }
        ];
        const models = [
            { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
            { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
            { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
            { value: 'gpt-4o', label: 'GPT-4o' },
            { value: 'gpt-4o-mini', label: 'GPT-4o Mini' }
        ];

        this.elements.formContent.innerHTML = `
            <div class="transform-form-grid">
                <div class="form-section-label">Identity</div>
                ${this._field('Agent Name', 'agent_name', data.name || this._sourceName || '', 'text')}
                ${this._field('Description', 'agent_description', data.description || '', 'textarea-sm')}
                ${this._field('Introduction', 'agent_introduction', data.introduction || '', 'textarea-sm', 'Greeting message when users start a conversation')}
                ${this._field('Icon (emoji)', 'agent_icon', data.icon || '🤖', 'text')}
                ${this._select('Category', 'agent_category', data.category || 'custom', categories)}
                ${this._select('Suite', 'agent_suite', data.suite || 'execute', suites)}

                <div class="form-section-label">LLM Configuration</div>
                ${this._select('Provider', 'agent_provider', data.llm_provider || 'anthropic', providers)}
                ${this._select('Model', 'agent_model', data.model || data.llm_model || 'claude-sonnet-4-5-20250929', models)}
                ${this._field('Temperature', 'agent_temperature', data.temperature ?? 0.7, 'number')}
                ${this._field('Max Tokens', 'agent_max_tokens', data.max_tokens || 4096, 'number')}

                <div class="form-section-label">System Prompt</div>
                ${this._field('System Prompt', 'agent_system_prompt', data.system_prompt || '', 'textarea')}

                <div class="form-section-label">Conversation Starters</div>
                ${this._field('Starters (one per line)', 'agent_starters', (data.conversation_starters || []).join('\n'), 'textarea-sm', 'Quick-start prompts shown to users')}

                <div class="form-section-label">Guardrails</div>
                ${this._field('Allowed Topics (comma-separated)', 'agent_allowed_topics', ((data.guardrails || {}).allowed_topics || []).join(', '), 'text')}
                ${this._field('Blocked Topics (comma-separated)', 'agent_blocked_topics', ((data.guardrails || {}).blocked_topics || []).join(', '), 'text')}

                <div class="form-section-label">Visibility</div>
                ${this._select('Visibility', 'agent_visibility', 'team', [
                    { value: 'private', label: 'Private' },
                    { value: 'team', label: 'Team' },
                    { value: 'public', label: 'Public' }
                ])}

                ${this._field('Tags (comma-separated)', 'agent_tags', (data.tags || []).join(', '), 'text')}
            </div>
        `;
    }

    // --- Generic/Business Profile Form ---
    _renderGenericForm(data, targetType) {
        this.elements.formContent.innerHTML = `
            <div class="transform-form-grid">
                ${this._field('Name', 'generic_name', this._sourceName || '', 'text', 'Enter a name for this asset')}
                <div class="form-section-label">Transformed Data</div>
                <div class="transform-json-editable">
                    <textarea class="transform-textarea" id="${this.id}-generic-json"
                        style="font-family:'Fira Code',monospace;font-size:0.8rem;"
                    >${JSON.stringify(data, null, 2)}</textarea>
                </div>
            </div>
        `;
    }

    // =========================================================================
    // SAVE
    // =========================================================================

    async _handleSave() {
        if (!this._transformedData) return;

        const targetType = this._transformedData.target_type;
        const editedData = this._collectFormData(targetType);

        if (!editedData.name) {
            this._showError('Please enter a name for this asset.');
            return;
        }

        this.elements.saveBtn.disabled = true;
        this.elements.saveBtn.innerHTML = '<i data-lucide="loader-2" style="width:14px;height:14px;" class="spin-icon"></i> Saving...';
        if (typeof lucide !== 'undefined') lucide.createIcons();

        try {
            const userId = this._getUserId();
            const token = this._getAuthToken();

            if (!userId) {
                this._showError('Please log in to save assets.');
                return;
            }

            const response = await fetch('/api/prompts/transform', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-User-Id': userId
                },
                body: JSON.stringify({
                    prompt: this._sourceContent,
                    target_type: targetType,
                    name_hint: editedData.name,
                    save: true
                })
            });

            const data = await response.json();

            if (data.success && data.data.saved) {
                if (typeof showToast === 'function') {
                    showToast(`Saved "${data.data.saved.name}" as ${TransformAssetModal.TYPE_CONFIG[targetType]?.label || targetType}`, 'success');
                }
                if (this.callbacks.onSave) {
                    this.callbacks.onSave({
                        type: targetType,
                        saved: data.data.saved,
                        editedData
                    });
                }
                this.close({ saved: true, type: targetType, data: data.data.saved });
            } else {
                this._showError(data.error || 'Failed to save. Please try again.');
            }
        } catch (err) {
            console.error('Save error:', err);
            this._showError('Network error while saving.');
        } finally {
            this.elements.saveBtn.disabled = false;
            this.elements.saveBtn.innerHTML = '<i data-lucide="save" style="width:14px;height:14px;"></i> Save to Insight 360';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    _collectFormData(targetType) {
        const _val = (id) => {
            const el = this.elements.body.querySelector(`#${this.id}-${id}`);
            return el ? el.value.trim() : '';
        };
        const _csv = (id) => _val(id).split(',').map(s => s.trim()).filter(Boolean);
        const _lines = (id) => _val(id).split('\n').map(s => s.trim()).filter(Boolean);

        switch (targetType) {
            case 'skill':
                return {
                    name: _val('skill_name'),
                    display_name: _val('skill_display_name'),
                    description: _val('skill_description'),
                    instructions: _val('skill_instructions'),
                    triggers: _csv('skill_triggers'),
                    best_practices: _lines('skill_best_practices')
                };
            case 'voice_dna':
                return {
                    name: _val('voice_name'),
                    core_identity: {
                        who_you_are: _val('voice_who'),
                        what_you_do: _val('voice_what'),
                        your_angle: _val('voice_angle')
                    },
                    personality: {
                        traits: _csv('voice_traits'),
                        energy: _val('voice_energy')
                    },
                    tone: {
                        primary_tone: _val('voice_primary_tone'),
                        secondary_tone: _val('voice_secondary_tone'),
                        how_formal: parseInt(_val('voice_formality')) || 5
                    }
                };
            case 'icp':
                return {
                    name: _val('icp_name'),
                    profile_overview: {
                        name: _val('icp_name'),
                        one_line_description: _val('icp_description'),
                        why_they_follow_you: _val('icp_why')
                    },
                    demographics: {
                        job_titles: _csv('icp_jobs'),
                        industries: _csv('icp_industries'),
                        experience_level: _val('icp_experience')
                    },
                    psychographics: {
                        values: { list: _csv('icp_values') },
                        frustrations: { list: _csv('icp_frustrations') },
                        aspirations: { list: _csv('icp_aspirations') }
                    }
                };
            case 'agent':
                return {
                    name: _val('agent_name'),
                    description: _val('agent_description'),
                    introduction: _val('agent_introduction'),
                    icon: _val('agent_icon'),
                    category: _val('agent_category'),
                    suite: _val('agent_suite'),
                    llm_provider: _val('agent_provider'),
                    llm_model: _val('agent_model'),
                    temperature: parseFloat(_val('agent_temperature')) || 0.7,
                    max_tokens: parseInt(_val('agent_max_tokens')) || 4096,
                    system_prompt: _val('agent_system_prompt'),
                    conversation_starters: _lines('agent_starters'),
                    guardrails: {
                        allowed_topics: _csv('agent_allowed_topics'),
                        blocked_topics: _csv('agent_blocked_topics')
                    },
                    visibility: _val('agent_visibility'),
                    tags: _csv('agent_tags')
                };
            default:
                return { name: _val('generic_name') };
        }
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    _field(label, id, value, type = 'text', placeholder = '') {
        const fullId = `${this.id}-${id}`;
        const escapedValue = typeof value === 'string' ? value.replace(/"/g, '&quot;') : value;

        if (type === 'textarea') {
            return `
                <div class="transform-form-field transform-form-field-full">
                    <label for="${fullId}">${label}</label>
                    <textarea id="${fullId}" placeholder="${placeholder}" rows="6">${typeof value === 'string' ? value : ''}</textarea>
                </div>`;
        }
        if (type === 'textarea-sm') {
            return `
                <div class="transform-form-field transform-form-field-full">
                    <label for="${fullId}">${label}</label>
                    <textarea id="${fullId}" placeholder="${placeholder}" rows="3">${typeof value === 'string' ? value : ''}</textarea>
                </div>`;
        }
        if (type === 'number') {
            return `
                <div class="transform-form-field">
                    <label for="${fullId}">${label}</label>
                    <input type="number" id="${fullId}" value="${escapedValue}" step="0.1" placeholder="${placeholder}">
                </div>`;
        }
        return `
            <div class="transform-form-field">
                <label for="${fullId}">${label}</label>
                <input type="text" id="${fullId}" value="${escapedValue}" placeholder="${placeholder}">
            </div>`;
    }

    _select(label, id, selected, options) {
        const fullId = `${this.id}-${id}`;
        const optionHtml = options.map(opt => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const lbl = typeof opt === 'string' ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt.label;
            return `<option value="${val}" ${val === selected ? 'selected' : ''}>${lbl}</option>`;
        }).join('');

        return `
            <div class="transform-form-field">
                <label for="${fullId}">${label}</label>
                <select id="${fullId}">${optionHtml}</select>
            </div>`;
    }

    _showError(message) {
        if (typeof ModalService !== 'undefined' && ModalService.error) {
            ModalService.error(message, 'Transform Error');
        } else {
            alert(message);
        }
    }

    _syntaxHighlight(json) {
        return json
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, (match) => {
                let cls = 'json-string';
                if (/:$/.test(match)) {
                    cls = 'json-key';
                    match = match.replace(':', '');
                    return `<span class="${cls}">${match}</span>:`;
                }
                return `<span class="${cls}">${match}</span>`;
            })
            .replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
            .replace(/\bnull\b/g, '<span class="json-null">null</span>')
            .replace(/\b(-?\d+\.?\d*)\b/g, '<span class="json-number">$1</span>');
    }

    _getUserId() {
        try {
            const userData = localStorage.getItem('insight360_user');
            if (userData) return JSON.parse(userData).id;
        } catch (e) { /* ignore */ }
        return null;
    }

    _getAuthToken() {
        return localStorage.getItem('insight360_token') || '';
    }

    _handleCancel() {
        if (this.callbacks.onCancel) this.callbacks.onCancel();
        this.close(null);
    }

    /**
     * Reset modal to initial state
     */
    reset() {
        this._currentStep = 1;
        this._transformedData = null;
        this._sourceContent = '';
        this._selectedType = 'auto';
        this._isTransforming = false;
        if (this.elements.textarea) this.elements.textarea.value = '';
        if (this.elements.analysisBar) this.elements.analysisBar.style.display = 'none';
        this._showStep(1);
    }
}

// Register type if ModalService is already loaded
if (typeof ModalService !== 'undefined' && ModalService.registerType) {
    ModalService.registerType('transformAsset', TransformAssetModal);
}
