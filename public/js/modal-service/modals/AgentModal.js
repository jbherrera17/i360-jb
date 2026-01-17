/**
 * AgentModal - Full agent runner in a modal window
 * Extends ChatModal with agent execution capabilities
 * @extends ChatModal
 * @version 1.0.0
 */

class AgentModal extends ChatModal {
    /**
     * Create an agent modal
     * @param {Object} options - Agent modal options
     * @param {Object} options.agent - Agent object with id, name, prompt, etc.
     * @param {Object} [options.context={}] - Initial context for agent execution
     * @param {string} [options.model] - LLM model to use
     * @param {boolean} [options.enableSearch=false] - Enable web search
     * @param {Function} [options.onComplete] - Callback when agent completes
     * @param {Function} [options.onError] - Callback on error
     */
    constructor(options = {}) {
        const agent = options.agent || {};

        super({
            ...options,
            title: agent.name || options.title || 'Agent',
            placeholder: 'Type your response...',
            className: `i360-agent-modal ${options.className || ''}`.trim(),
            width: options.width || 600,
            height: options.height || 700,
            minSize: options.minSize || { width: 450, height: 500 }
        });

        this.agentOptions = {
            agent: agent,
            context: options.context || {},
            model: options.model || 'claude-sonnet-4-5-20250929',
            enableSearch: options.enableSearch || false,
            endpoint: options.endpoint || '/api/agents/execute',
            streamEndpoint: options.streamEndpoint || '/api/chat/stream',
            onComplete: options.onComplete,
            onError: options.onError,
            autoStart: options.autoStart !== false,
            showControls: options.showControls !== false
        };

        this._abortController = null;
        this._conversationHistory = [];
        this._agentResult = null;
        this._isWaitingForInput = false;
        this._inputPromptResolve = null;
        this._attachedFiles = [];
        this._maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
        this._allowedFileTypes = options.allowedFileTypes || [
            'image/*',
            'text/*',
            'application/pdf',
            'application/json',
            'application/xml',
            '.csv', '.md', '.txt', '.json', '.xml', '.yaml', '.yml'
        ];
    }

    /**
     * Create modal elements
     * @protected
     */
    _createElements() {
        super._createElements();

        // Add agent-specific header info
        this._addAgentHeader();

        // Add control buttons to header
        if (this.agentOptions.showControls) {
            this._addControlButtons();
        }

        // Add context assets panel
        this._addContextAssetsPanel();

        // Add file attachment UI
        this._addAttachmentUI();

        // Add footer with result actions
        this._addResultActions();
    }

    /**
     * Add agent info to header
     * @private
     */
    _addAgentHeader() {
        const agent = this.agentOptions.agent;

        // Create a wrapper for avatar + title info
        const headerInfo = document.createElement('div');
        headerInfo.className = 'i360-agent-header-info';

        // Add avatar
        const avatar = document.createElement('div');
        avatar.className = 'i360-agent-avatar';
        avatar.innerHTML = `
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4l3 3"/>
            </svg>
        `;

        // Create title wrapper
        const titleWrapper = document.createElement('div');
        titleWrapper.className = 'i360-agent-title-wrapper';

        // Move title into wrapper
        const titleRow = document.createElement('div');
        titleRow.className = 'i360-agent-title-row';
        titleRow.appendChild(this.elements.title);

        // Add status indicator to title row
        this.elements.statusIndicator = document.createElement('span');
        this.elements.statusIndicator.className = 'i360-agent-status';
        this.elements.statusIndicator.textContent = 'Ready';
        titleRow.appendChild(this.elements.statusIndicator);

        titleWrapper.appendChild(titleRow);

        // Add subtitle
        const subtitle = document.createElement('span');
        subtitle.className = 'i360-agent-subtitle';
        subtitle.textContent = agent.description ? agent.description.substring(0, 60) : 'AI Agent';
        titleWrapper.appendChild(subtitle);

        // Assemble header info
        headerInfo.appendChild(avatar);
        headerInfo.appendChild(titleWrapper);

        // Insert at beginning of header
        this.elements.header.insertBefore(headerInfo, this.elements.header.firstChild);
    }

    /**
     * Add control buttons to header
     * @private
     */
    _addControlButtons() {
        const controls = document.createElement('div');
        controls.className = 'i360-agent-controls';

        // Model selector (simplified)
        const modelSelect = document.createElement('select');
        modelSelect.className = 'i360-agent-model-select';
        modelSelect.innerHTML = `
            <option value="claude-sonnet-4-5-20250929">Claude Sonnet</option>
            <option value="claude-opus-4-5-20251101">Claude Opus</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
        `;
        modelSelect.value = this.agentOptions.model;
        modelSelect.addEventListener('change', (e) => {
            this.agentOptions.model = e.target.value;
        });

        // Stop button
        const stopBtn = document.createElement('button');
        stopBtn.type = 'button';
        stopBtn.className = 'i360-agent-stop-btn';
        stopBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
            Stop
        `;
        stopBtn.style.display = 'none';
        stopBtn.addEventListener('click', () => this.stop());

        controls.appendChild(modelSelect);
        controls.appendChild(stopBtn);

        this.elements.headerActions.insertBefore(controls, this.elements.headerActions.firstChild);
        this.elements.modelSelect = modelSelect;
        this.elements.stopBtn = stopBtn;
    }

    /**
     * Add context assets panel
     * @private
     */
    _addContextAssetsPanel() {
        const agent = this.agentOptions.agent;
        const contextAssets = agent.context_assets || agent.contextAssets || this.agentOptions.contextAssets || [];

        // Create collapsible panel
        const panel = document.createElement('div');
        panel.className = 'i360-agent-context-panel';

        // Panel header (toggle)
        const panelHeader = document.createElement('button');
        panelHeader.type = 'button';
        panelHeader.className = 'i360-agent-context-header';
        panelHeader.innerHTML = `
            <svg class="i360-agent-context-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
            </svg>
            <span class="i360-agent-context-title">Context Assets</span>
            <span class="i360-agent-context-count">${contextAssets.length}</span>
        `;

        // Panel content
        const panelContent = document.createElement('div');
        panelContent.className = 'i360-agent-context-content';

        // Render context assets
        if (contextAssets.length > 0) {
            this._renderContextAssets(panelContent, contextAssets);
        } else {
            panelContent.innerHTML = `
                <div class="i360-agent-context-empty">
                    <span>No context assets applied</span>
                </div>
            `;
        }

        panel.appendChild(panelHeader);
        panel.appendChild(panelContent);

        // Insert panel after messages container, before input area
        const messagesContainer = this.elements.body.querySelector('.i360-chat-messages');
        const inputArea = this.elements.body.querySelector('.i360-chat-input-area');
        if (messagesContainer && inputArea) {
            this.elements.body.insertBefore(panel, inputArea);
        }

        // Toggle collapse
        panelHeader.addEventListener('click', () => {
            panel.classList.toggle('is-collapsed');
        });

        // Start collapsed if there are no assets
        if (contextAssets.length === 0) {
            panel.classList.add('is-collapsed');
        }

        // Store references
        this.elements.contextPanel = panel;
        this.elements.contextContent = panelContent;
    }

    /**
     * Render context assets in panel
     * @private
     */
    _renderContextAssets(container, assets) {
        const assetList = document.createElement('div');
        assetList.className = 'i360-agent-context-list';

        for (const asset of assets) {
            const assetEl = document.createElement('div');
            assetEl.className = 'i360-agent-context-item';
            assetEl.dataset.assetId = asset.id;

            // Get asset type info
            const typeInfo = this._getAssetTypeInfo(asset.asset_type || asset.type);

            assetEl.innerHTML = `
                <span class="i360-agent-context-icon">${typeInfo.icon}</span>
                <div class="i360-agent-context-info">
                    <span class="i360-agent-context-name">${this._escapeHtml(asset.name)}</span>
                    <span class="i360-agent-context-type">${typeInfo.displayName}</span>
                </div>
                <button type="button" class="i360-agent-context-view" title="View content">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </button>
            `;

            // View button shows asset content in a content modal
            const viewBtn = assetEl.querySelector('.i360-agent-context-view');
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._showContextAssetDetail(asset);
            });

            assetList.appendChild(assetEl);
        }

        container.appendChild(assetList);
    }

    /**
     * Get asset type display info
     * @private
     */
    _getAssetTypeInfo(assetType) {
        const types = {
            'company_description': { icon: '\ud83c\udfe2', displayName: 'Company Description' },
            'why_we_win': { icon: '\ud83c\udfc6', displayName: 'Why We Win' },
            'products': { icon: '\ud83d\udce6', displayName: 'Products' },
            'pain_points': { icon: '\ud83c\udfaf', displayName: 'Pain Points' },
            'voice_dna': { icon: '\ud83c\udfa4', displayName: 'VoiceDNA' },
            'icp': { icon: '\ud83d\udc64', displayName: 'Ideal Customer Profile' },
            'core_values': { icon: '\ud83d\udc8e', displayName: 'Core Values' },
            'custom_processes': { icon: '\u2699\ufe0f', displayName: 'Custom Processes' },
            'competitors': { icon: '\u2694\ufe0f', displayName: 'Competitors' },
            'case_studies': { icon: '\ud83d\udcd6', displayName: 'Case Studies' },
            'faqs': { icon: '\u2753', displayName: 'FAQs' },
            'team_bios': { icon: '\ud83d\udc65', displayName: 'Team Bios' },
            'industry_context': { icon: '\ud83c\udf10', displayName: 'Industry Context' },
            'terminology': { icon: '\ud83d\udcda', displayName: 'Terminology' },
            'templates': { icon: '\ud83d\udcdd', displayName: 'Templates' },
            'pricing': { icon: '\ud83d\udcb0', displayName: 'Pricing' },
            'brand_guidelines': { icon: '\ud83c\udfa8', displayName: 'Brand Guidelines' },
            'personas': { icon: '\ud83c\udfad', displayName: 'Personas' }
        };

        return types[assetType] || { icon: '\ud83d\udcc4', displayName: assetType || 'Unknown' };
    }

    /**
     * Show context asset detail in a modal
     * @private
     */
    _showContextAssetDetail(asset) {
        const typeInfo = this._getAssetTypeInfo(asset.asset_type || asset.type);

        // Format content for display
        let content = '';
        if (asset.content_text) {
            content = asset.content_text;
        } else if (asset.content_json) {
            content = typeof asset.content_json === 'string'
                ? asset.content_json
                : JSON.stringify(asset.content_json, null, 2);
        } else if (asset.content) {
            content = typeof asset.content === 'string'
                ? asset.content
                : JSON.stringify(asset.content, null, 2);
        }

        // Build markdown content
        let markdownContent = `## ${typeInfo.icon} ${asset.name}\n\n`;

        if (asset.description) {
            markdownContent += `*${asset.description}*\n\n---\n\n`;
        }

        // If content looks like JSON, format as code
        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
            markdownContent += '```json\n' + content + '\n```';
        } else {
            markdownContent += content;
        }

        // Show in content modal
        if (typeof ModalService !== 'undefined') {
            ModalService.content({
                title: `${typeInfo.icon} ${asset.name}`,
                content: markdownContent,
                contentType: 'markdown',
                width: 600,
                height: 500,
                resizable: true
            });
        }
    }

    /**
     * Update context assets (can be called dynamically)
     * @param {Array} assets - Array of context asset objects
     */
    setContextAssets(assets) {
        if (!this.elements.contextContent) return;

        const contextAssets = assets || [];

        // Update count
        const countEl = this.elements.contextPanel.querySelector('.i360-agent-context-count');
        if (countEl) {
            countEl.textContent = contextAssets.length;
        }

        // Re-render content
        this.elements.contextContent.innerHTML = '';

        if (contextAssets.length > 0) {
            this._renderContextAssets(this.elements.contextContent, contextAssets);
            this.elements.contextPanel.classList.remove('is-collapsed');
        } else {
            this.elements.contextContent.innerHTML = `
                <div class="i360-agent-context-empty">
                    <span>No context assets applied</span>
                </div>
            `;
        }

        // Update agent options for reference
        this.agentOptions.contextAssets = contextAssets;
    }

    /**
     * Add result action buttons
     * @private
     */
    _addResultActions() {
        this.elements.footer.style.display = 'none'; // Hidden until result is ready
        this.elements.footer.className = 'i360-modal-footer i360-agent-footer';
        this.elements.footer.innerHTML = `
            <div class="i360-agent-result-actions">
                <button type="button" class="i360-btn i360-btn-secondary i360-agent-regenerate">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 4v6h6M23 20v-6h-6"/>
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                    </svg>
                    Regenerate
                </button>
                <button type="button" class="i360-btn i360-btn-secondary i360-agent-copy">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copy Result
                </button>
                <button type="button" class="i360-btn i360-btn-primary i360-agent-accept">
                    Accept Result
                </button>
            </div>
        `;

        // Bind action buttons
        this.elements.regenerateBtn = this.elements.footer.querySelector('.i360-agent-regenerate');
        this.elements.copyBtn = this.elements.footer.querySelector('.i360-agent-copy');
        this.elements.acceptBtn = this.elements.footer.querySelector('.i360-agent-accept');

        this.elements.regenerateBtn.addEventListener('click', () => this._handleRegenerate());
        this.elements.copyBtn.addEventListener('click', () => this._handleCopy());
        this.elements.acceptBtn.addEventListener('click', () => this._handleAccept());
    }

    /**
     * Add file attachment UI to the input area
     * @private
     */
    _addAttachmentUI() {
        const inputWrapper = this.elements.body.querySelector('.i360-chat-input-wrapper');
        if (!inputWrapper) return;

        // Create attachment button
        const attachBtn = document.createElement('button');
        attachBtn.type = 'button';
        attachBtn.className = 'i360-agent-attach-btn';
        attachBtn.title = 'Attach file';
        attachBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
        `;

        // Create hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.className = 'i360-agent-file-input';
        fileInput.multiple = true;
        fileInput.accept = this._allowedFileTypes.join(',');
        fileInput.style.display = 'none';

        // Create attachment preview container
        const previewContainer = document.createElement('div');
        previewContainer.className = 'i360-agent-attachments';
        previewContainer.style.display = 'none';

        // Insert attachment button before send button
        const sendBtn = inputWrapper.querySelector('.i360-chat-send');
        inputWrapper.insertBefore(attachBtn, sendBtn);
        inputWrapper.appendChild(fileInput);

        // Insert preview container above input wrapper
        const inputArea = this.elements.body.querySelector('.i360-chat-input-area');
        inputArea.insertBefore(previewContainer, inputWrapper);

        // Store references
        this.elements.attachBtn = attachBtn;
        this.elements.fileInput = fileInput;
        this.elements.attachmentPreview = previewContainer;

        // Bind events
        attachBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this._handleFileSelect(e));

        // Add drag and drop support
        this._setupDragDrop();
    }

    /**
     * Setup drag and drop for file attachments
     * @private
     */
    _setupDragDrop() {
        const inputArea = this.elements.body.querySelector('.i360-chat-input-area');
        if (!inputArea) return;

        inputArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            inputArea.classList.add('is-drag-over');
        });

        inputArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            inputArea.classList.remove('is-drag-over');
        });

        inputArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            inputArea.classList.remove('is-drag-over');

            const files = Array.from(e.dataTransfer.files);
            this._processFiles(files);
        });
    }

    /**
     * Handle file selection from input
     * @private
     */
    _handleFileSelect(event) {
        const files = Array.from(event.target.files);
        this._processFiles(files);
        // Reset input to allow selecting the same file again
        event.target.value = '';
    }

    /**
     * Process selected files
     * @private
     */
    _processFiles(files) {
        for (const file of files) {
            // Check file size
            if (file.size > this._maxFileSize) {
                this.addSystemMessage(
                    `File "${file.name}" exceeds maximum size of ${this._formatFileSize(this._maxFileSize)}`,
                    'warning'
                );
                continue;
            }

            // Check if already attached
            if (this._attachedFiles.some(f => f.name === file.name && f.size === file.size)) {
                continue;
            }

            // Add to attachments
            this._attachedFiles.push(file);
            this._renderAttachmentPreview(file);
        }

        this._updateAttachmentVisibility();
    }

    /**
     * Render attachment preview
     * @private
     */
    _renderAttachmentPreview(file) {
        const preview = document.createElement('div');
        preview.className = 'i360-agent-attachment-item';
        preview.dataset.fileName = file.name;

        const isImage = file.type.startsWith('image/');

        if (isImage) {
            // Create image thumbnail
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `
                    <div class="i360-agent-attachment-thumb">
                        <img src="${e.target.result}" alt="${this._escapeHtml(file.name)}" />
                    </div>
                    <div class="i360-agent-attachment-info">
                        <span class="i360-agent-attachment-name">${this._escapeHtml(file.name)}</span>
                        <span class="i360-agent-attachment-size">${this._formatFileSize(file.size)}</span>
                    </div>
                    <button type="button" class="i360-agent-attachment-remove" title="Remove">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                `;
                this._bindRemoveButton(preview, file);
            };
            reader.readAsDataURL(file);
        } else {
            // Non-image file icon
            preview.innerHTML = `
                <div class="i360-agent-attachment-icon">
                    ${this._getFileIcon(file.type)}
                </div>
                <div class="i360-agent-attachment-info">
                    <span class="i360-agent-attachment-name">${this._escapeHtml(file.name)}</span>
                    <span class="i360-agent-attachment-size">${this._formatFileSize(file.size)}</span>
                </div>
                <button type="button" class="i360-agent-attachment-remove" title="Remove">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            `;
            this._bindRemoveButton(preview, file);
        }

        this.elements.attachmentPreview.appendChild(preview);
    }

    /**
     * Bind remove button event
     * @private
     */
    _bindRemoveButton(preview, file) {
        const removeBtn = preview.querySelector('.i360-agent-attachment-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this._removeAttachment(file);
                preview.remove();
                this._updateAttachmentVisibility();
            });
        }
    }

    /**
     * Remove an attachment
     * @private
     */
    _removeAttachment(file) {
        const index = this._attachedFiles.findIndex(f => f.name === file.name && f.size === file.size);
        if (index !== -1) {
            this._attachedFiles.splice(index, 1);
        }
    }

    /**
     * Update attachment preview visibility
     * @private
     */
    _updateAttachmentVisibility() {
        if (this.elements.attachmentPreview) {
            this.elements.attachmentPreview.style.display =
                this._attachedFiles.length > 0 ? 'flex' : 'none';
        }

        // Update attach button appearance
        if (this.elements.attachBtn) {
            if (this._attachedFiles.length > 0) {
                this.elements.attachBtn.classList.add('has-attachments');
                this.elements.attachBtn.dataset.count = this._attachedFiles.length;
            } else {
                this.elements.attachBtn.classList.remove('has-attachments');
                delete this.elements.attachBtn.dataset.count;
            }
        }
    }

    /**
     * Get file icon SVG based on type
     * @private
     */
    _getFileIcon(mimeType) {
        if (mimeType.startsWith('text/') || mimeType === 'application/json') {
            return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
            </svg>`;
        } else if (mimeType === 'application/pdf') {
            return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <path d="M9 15v-2h2c1 0 2 .5 2 1.5s-1 1.5-2 1.5H9z"/>
            </svg>`;
        } else {
            return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
            </svg>`;
        }
    }

    /**
     * Format file size for display
     * @private
     */
    _formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Clear all attachments
     */
    clearAttachments() {
        this._attachedFiles = [];
        if (this.elements.attachmentPreview) {
            this.elements.attachmentPreview.innerHTML = '';
        }
        this._updateAttachmentVisibility();
    }

    /**
     * Get attached files
     * @returns {File[]}
     */
    getAttachments() {
        return [...this._attachedFiles];
    }

    /**
     * Override open to auto-start agent
     */
    async open() {
        await super.open();

        if (this.agentOptions.autoStart) {
            // Delay slightly for smooth animation
            setTimeout(() => this.start(), 300);
        }
    }

    /**
     * Start the agent execution
     */
    async start() {
        const agent = this.agentOptions.agent;

        this._setStatus('Starting...');
        this.setInputEnabled(false);

        // Add system message about agent
        if (agent.name) {
            this.addSystemMessage(`Starting ${agent.name}...`, 'info');
        }

        try {
            // Build initial prompt
            const initialPrompt = this._buildInitialPrompt();

            // Add to history (not displayed)
            this._conversationHistory.push({
                role: 'user',
                content: initialPrompt
            });

            // Stream initial response
            await this._streamResponse();

        } catch (error) {
            this._handleError(error);
        }
    }

    /**
     * Build initial prompt from agent and context
     * @private
     */
    _buildInitialPrompt() {
        const { agent, context } = this.agentOptions;
        let prompt = agent.prompt || agent.systemPrompt || '';

        // Inject context variables
        if (context) {
            Object.entries(context).forEach(([key, value]) => {
                const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                prompt = prompt.replace(placeholder, value);

                // Also try ${key} format
                const altPlaceholder = new RegExp(`\\$\\{${key}\\}`, 'g');
                prompt = prompt.replace(altPlaceholder, value);
            });
        }

        // Add conversation start instruction
        prompt += '\n\nPlease begin the interaction by introducing yourself and starting the task.';

        return prompt;
    }

    /**
     * Override _handleSend to add to agent conversation
     * @private
     */
    async _handleSend() {
        const content = this.elements.input.value.trim();
        const hasAttachments = this._attachedFiles.length > 0;

        // Allow send if there's content OR attachments
        if ((!content && !hasAttachments) || this._isStreaming) return;

        // If waiting for prompted input, resolve that promise
        if (this._isWaitingForInput && this._inputPromptResolve) {
            this._inputPromptResolve(content);
            this._isWaitingForInput = false;
            this._inputPromptResolve = null;
        }

        // Process attachments if any
        let attachmentData = [];
        if (hasAttachments) {
            attachmentData = await this._processAttachmentsForSend();
        }

        // Build message content with attachment info
        let messageContent = content;
        if (attachmentData.length > 0) {
            const attachmentText = attachmentData.map(a => `[Attached: ${a.name}]`).join(' ');
            if (messageContent) {
                messageContent = `${messageContent}\n\n${attachmentText}`;
            } else {
                messageContent = attachmentText;
            }
        }

        // Add user message to UI
        const userMessage = {
            role: 'user',
            content: messageContent,
            timestamp: new Date(),
            attachments: attachmentData.length > 0 ? attachmentData : undefined
        };

        this._renderUserMessageWithAttachments(userMessage);

        // Add to conversation history (include file content for text files)
        const historyContent = await this._buildHistoryContent(content, attachmentData);
        this._conversationHistory.push({
            role: 'user',
            content: historyContent
        });

        // Clear input and attachments
        this.elements.input.value = '';
        this._autoResizeInput();
        this.elements.sendButton.disabled = true;
        this.clearAttachments();

        // Stream response
        this._streamResponse();
    }

    /**
     * Process attachments for sending
     * @private
     */
    async _processAttachmentsForSend() {
        const processed = [];

        for (const file of this._attachedFiles) {
            const data = {
                name: file.name,
                type: file.type,
                size: file.size
            };

            // Read image files as base64 for preview/sending
            if (file.type.startsWith('image/')) {
                data.dataUrl = await this._readFileAsDataUrl(file);
            }

            // Read text files as text content
            if (file.type.startsWith('text/') ||
                file.type === 'application/json' ||
                file.type === 'application/xml' ||
                file.name.endsWith('.md') ||
                file.name.endsWith('.csv') ||
                file.name.endsWith('.yaml') ||
                file.name.endsWith('.yml')) {
                data.textContent = await this._readFileAsText(file);
            }

            processed.push(data);
        }

        return processed;
    }

    /**
     * Read file as data URL
     * @private
     */
    _readFileAsDataUrl(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
    }

    /**
     * Read file as text
     * @private
     */
    _readFileAsText(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => resolve(null);
            reader.readAsText(file);
        });
    }

    /**
     * Build content for conversation history including file contents
     * @private
     */
    async _buildHistoryContent(textContent, attachmentData) {
        let parts = [];

        if (textContent) {
            parts.push(textContent);
        }

        for (const att of attachmentData) {
            if (att.textContent) {
                parts.push(`\n\n--- File: ${att.name} ---\n${att.textContent}\n--- End of ${att.name} ---`);
            } else if (att.dataUrl && att.type.startsWith('image/')) {
                parts.push(`\n\n[Image attached: ${att.name}]`);
            } else {
                parts.push(`\n\n[File attached: ${att.name} (${att.type})]`);
            }
        }

        return parts.join('');
    }

    /**
     * Render user message with attachment previews
     * @private
     */
    _renderUserMessageWithAttachments(message) {
        const el = document.createElement('div');
        el.className = 'i360-chat-message i360-chat-message-user';

        if (message.id) {
            el.dataset.messageId = message.id;
        }

        let html = '';

        // Render text content
        const textParts = message.content.split(/\[Attached: [^\]]+\]/g).join('').trim();
        if (textParts) {
            html += `<div class="i360-chat-message-content">${this._escapeHtml(textParts).replace(/\n/g, '<br>')}</div>`;
        }

        // Render attachment previews
        if (message.attachments && message.attachments.length > 0) {
            html += '<div class="i360-chat-message-attachments">';
            for (const att of message.attachments) {
                if (att.dataUrl && att.type.startsWith('image/')) {
                    html += `
                        <div class="i360-chat-attachment-preview i360-chat-attachment-image">
                            <img src="${att.dataUrl}" alt="${this._escapeHtml(att.name)}" />
                            <span class="i360-chat-attachment-label">${this._escapeHtml(att.name)}</span>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="i360-chat-attachment-preview i360-chat-attachment-file">
                            ${this._getFileIcon(att.type)}
                            <span class="i360-chat-attachment-label">${this._escapeHtml(att.name)}</span>
                        </div>
                    `;
                }
            }
            html += '</div>';
        }

        // Timestamp
        if (this.chatOptions.showTimestamps && message.timestamp) {
            const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            html += `<div class="i360-chat-timestamp">${time}</div>`;
        }

        el.innerHTML = html;
        this.elements.messagesContainer.appendChild(el);
        this._scrollToBottom();

        // Store message
        if (!message.id) {
            message.id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        this.chatOptions.messages.push(message);

        return el;
    }

    /**
     * Stream response from LLM
     * @private
     */
    async _streamResponse() {
        this._setStatus('Thinking...');
        this.setInputEnabled(false);

        if (this.elements.stopBtn) {
            this.elements.stopBtn.style.display = '';
        }

        // Create abort controller
        this._abortController = new AbortController();

        try {
            const response = await fetch(this.agentOptions.streamEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: this._conversationHistory,
                    model: this.agentOptions.model,
                    stream: true
                }),
                signal: this._abortController.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Start streaming
            const stream = this.startStream('assistant');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            const content = this._extractContent(parsed);
                            if (content) {
                                fullResponse += content;
                                stream.append(content);
                            }
                        } catch (e) {
                            // Not JSON, might be raw text
                            if (data.trim()) {
                                fullResponse += data;
                                stream.append(data);
                            }
                        }
                    }
                }
            }

            // Finish streaming
            stream.finish();

            // Add to history
            this._conversationHistory.push({
                role: 'assistant',
                content: fullResponse
            });

            this._agentResult = fullResponse;
            this._setStatus('Ready');

            // Check if agent is requesting input
            if (this._isRequestingInput(fullResponse)) {
                this._setStatus('Waiting for input...');
                this.setInputEnabled(true);
                this.focusInput();
            } else {
                // Show result actions if this looks like a final response
                if (this._isCompleteResponse(fullResponse)) {
                    this._showResultActions();
                } else {
                    this.setInputEnabled(true);
                    this.focusInput();
                }
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                this.addSystemMessage('Response stopped by user.', 'warning');
                this._setStatus('Stopped');
            } else {
                throw error;
            }
        } finally {
            this._abortController = null;
            if (this.elements.stopBtn) {
                this.elements.stopBtn.style.display = 'none';
            }
        }
    }

    /**
     * Extract content from SSE response
     * @private
     */
    _extractContent(parsed) {
        // Anthropic format
        if (parsed.delta?.text) return parsed.delta.text;
        if (parsed.content?.[0]?.text) return parsed.content[0].text;

        // OpenAI format
        if (parsed.choices?.[0]?.delta?.content) return parsed.choices[0].delta.content;
        if (parsed.choices?.[0]?.message?.content) return parsed.choices[0].message.content;

        // Direct content
        if (parsed.text) return parsed.text;
        if (parsed.content && typeof parsed.content === 'string') return parsed.content;

        return null;
    }

    /**
     * Check if response is requesting user input
     * @private
     */
    _isRequestingInput(response) {
        const inputPatterns = [
            /\?$/,
            /please (provide|enter|share|tell|describe)/i,
            /what (is|are|would|do)/i,
            /can you (tell|share|provide|describe)/i,
            /\bwhat\b.*\?/i,
            /\bhow\b.*\?/i,
            /\bwhy\b.*\?/i,
            /\bwould you\b.*\?/i,
            /\bcould you\b.*\?/i
        ];

        return inputPatterns.some(pattern => pattern.test(response.trim()));
    }

    /**
     * Check if response appears complete
     * @private
     */
    _isCompleteResponse(response) {
        const completePatterns = [
            /\b(conclusion|summary|in summary|to summarize|finally)\b/i,
            /\b(here (is|are) (the|my|your) (result|analysis|recommendation))/i,
            /\b(complete|finished|done|that's all)\b/i,
            /^#+\s*(conclusion|summary|result|recommendation)/im
        ];

        // Also check length - longer responses are more likely complete
        return response.length > 500 || completePatterns.some(pattern => pattern.test(response));
    }

    /**
     * Show result action buttons
     * @private
     */
    _showResultActions() {
        this.elements.footer.style.display = '';
        this.setInputEnabled(true);
        this._setStatus('Complete');
    }

    /**
     * Request input from user (can be called programmatically)
     * @param {string} prompt - Prompt message
     * @returns {Promise<string>} User's input
     */
    async requestInput(prompt) {
        this._isWaitingForInput = true;

        if (prompt) {
            this.addMessage({
                role: 'assistant',
                content: prompt
            });
        }

        this._setStatus('Waiting for input...');
        this.setInputEnabled(true);
        this.focusInput();

        return new Promise(resolve => {
            this._inputPromptResolve = resolve;
        });
    }

    /**
     * Show a prompt modal for specific input
     * @param {Object} promptOptions - Options for PromptModal
     * @returns {Promise<string|null>}
     */
    async showInputPrompt(promptOptions) {
        // Use ModalService to show prompt over this modal
        const value = await ModalService.prompt({
            title: promptOptions.title || 'Input Required',
            message: promptOptions.message || 'Please provide the requested information:',
            placeholder: promptOptions.placeholder || '',
            defaultValue: promptOptions.defaultValue || '',
            inputType: promptOptions.inputType || 'text',
            validate: promptOptions.validate
        });

        if (value !== null) {
            // Add to conversation as if user typed it
            this.addMessage({
                role: 'user',
                content: value
            });

            this._conversationHistory.push({
                role: 'user',
                content: value
            });
        }

        return value;
    }

    /**
     * Show a form modal for complex input (multiple fields)
     * @param {Object} formOptions - Options for FormModal
     * @returns {Promise<Object|null>} Form values or null if cancelled
     */
    async showFormPrompt(formOptions) {
        return new Promise((resolve) => {
            const modal = new FormModal({
                title: formOptions.title || 'Information Required',
                fields: formOptions.fields || [],
                values: formOptions.values || {},
                submitText: formOptions.submitText || 'Submit',
                cancelText: formOptions.cancelText || 'Cancel',
                validate: formOptions.validate,
                onSubmit: (values) => {
                    // Add summary to conversation
                    if (formOptions.showInChat !== false) {
                        const summary = Object.entries(values)
                            .map(([key, val]) => `**${key}:** ${val}`)
                            .join('\n');
                        this.addMessage({
                            role: 'user',
                            content: summary
                        });
                        this._conversationHistory.push({
                            role: 'user',
                            content: summary
                        });
                    }
                    resolve(values);
                },
                onCancel: () => resolve(null)
            });

            ModalService.register(modal);
            modal.init().open();
        });
    }

    /**
     * Show a confirmation dialog
     * @param {Object} options - Confirm options
     * @returns {Promise<boolean>}
     */
    async showConfirm(options) {
        return ModalService.confirm({
            title: options.title || 'Confirm',
            message: options.message,
            confirmText: options.confirmText || 'Yes',
            cancelText: options.cancelText || 'No',
            type: options.type || 'info'
        });
    }

    /**
     * Show a selection dialog (single or multiple choice)
     * @param {Object} options - Selection options
     * @param {string} [options.title] - Dialog title
     * @param {string} [options.message] - Selection prompt message
     * @param {Array} options.options - Array of options (strings or {value, label, description})
     * @param {boolean} [options.multiple=false] - Allow multiple selections
     * @param {number} [options.minSelect] - Minimum selections required (for multiple)
     * @param {number} [options.maxSelect] - Maximum selections allowed (for multiple)
     * @param {boolean} [options.showInChat=true] - Show selection in chat
     * @returns {Promise<string|string[]|null>} Selected value(s) or null if cancelled
     */
    async showSelection(options) {
        const isMultiple = options.multiple === true;

        return new Promise((resolve) => {
            const modal = new FormModal({
                title: options.title || (isMultiple ? 'Select Options' : 'Select an Option'),
                fields: [{
                    name: 'selection',
                    type: isMultiple ? 'checkbox-group' : 'radio',
                    label: options.message || (isMultiple ? 'Select one or more:' : 'Please select:'),
                    options: options.options || [],
                    required: !isMultiple || (options.minSelect && options.minSelect > 0)
                }],
                submitText: options.submitText || 'Select',
                cancelText: options.cancelText || 'Cancel',
                validate: isMultiple ? (values) => {
                    const selected = values.selection || [];
                    const count = Array.isArray(selected) ? selected.length : 0;

                    if (options.minSelect && count < options.minSelect) {
                        return `Please select at least ${options.minSelect} option(s)`;
                    }
                    if (options.maxSelect && count > options.maxSelect) {
                        return `Please select no more than ${options.maxSelect} option(s)`;
                    }
                    return null;
                } : undefined,
                onSubmit: (values) => {
                    const selection = values.selection;

                    if (options.showInChat !== false && selection) {
                        let chatContent = '';

                        if (isMultiple && Array.isArray(selection)) {
                            // Multiple selection - show all selected items
                            const labels = selection.map(val => {
                                const opt = options.options.find(
                                    o => (typeof o === 'object' ? o.value : o) === val
                                );
                                return opt ? (typeof opt === 'object' ? opt.label : opt) : val;
                            });
                            chatContent = labels.length > 0
                                ? `Selected: ${labels.join(', ')}`
                                : 'No selection';
                        } else {
                            // Single selection
                            const selectedOption = options.options.find(
                                opt => (typeof opt === 'object' ? opt.value : opt) === selection
                            );
                            chatContent = selectedOption
                                ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption)
                                : selection;
                        }

                        this.addMessage({
                            role: 'user',
                            content: chatContent
                        });
                        this._conversationHistory.push({
                            role: 'user',
                            content: chatContent
                        });
                    }

                    resolve(selection);
                },
                onCancel: () => resolve(null)
            });

            ModalService.register(modal);
            modal.init().open();
        });
    }

    /**
     * Show a multi-selection dialog (convenience method)
     * @param {Object} options - Selection options (same as showSelection)
     * @returns {Promise<string[]|null>} Selected values or null if cancelled
     */
    async showMultiSelection(options) {
        return this.showSelection({ ...options, multiple: true });
    }

    /**
     * Stop the current streaming response
     */
    stop() {
        if (this._abortController) {
            this._abortController.abort();
        }
    }

    /**
     * Handle regenerate button
     * @private
     */
    async _handleRegenerate() {
        // Remove last assistant message from history
        if (this._conversationHistory.length > 0) {
            const last = this._conversationHistory[this._conversationHistory.length - 1];
            if (last.role === 'assistant') {
                this._conversationHistory.pop();
            }
        }

        // Remove last message from UI
        const messages = this.elements.messagesContainer.querySelectorAll('.i360-chat-message-assistant');
        if (messages.length > 0) {
            messages[messages.length - 1].remove();
        }

        // Hide footer
        this.elements.footer.style.display = 'none';

        // Stream new response
        await this._streamResponse();
    }

    /**
     * Handle copy button
     * @private
     */
    async _handleCopy() {
        if (!this._agentResult) return;

        try {
            await navigator.clipboard.writeText(this._agentResult);

            // Show feedback
            const originalText = this.elements.copyBtn.innerHTML;
            this.elements.copyBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                Copied!
            `;

            setTimeout(() => {
                this.elements.copyBtn.innerHTML = originalText;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    /**
     * Handle accept button
     * @private
     */
    _handleAccept() {
        const result = {
            agent: this.agentOptions.agent,
            result: this._agentResult,
            history: this._conversationHistory,
            timestamp: new Date()
        };

        this.emit('accept', { modal: this, ...result });

        if (typeof this.agentOptions.onComplete === 'function') {
            this.agentOptions.onComplete(result);
        }

        this.close(result);
    }

    /**
     * Handle errors
     * @private
     */
    _handleError(error) {
        console.error('Agent error:', error);

        this.addSystemMessage(`Error: ${error.message}`, 'error');
        this._setStatus('Error');
        this.setInputEnabled(true);

        if (typeof this.agentOptions.onError === 'function') {
            this.agentOptions.onError(error);
        }

        this.emit('error', { modal: this, error });
    }

    /**
     * Set status indicator
     * @private
     */
    _setStatus(status) {
        if (this.elements.statusIndicator) {
            this.elements.statusIndicator.textContent = status;

            // Add appropriate class
            this.elements.statusIndicator.className = 'i360-agent-status';
            if (status === 'Error') {
                this.elements.statusIndicator.classList.add('is-error');
            } else if (status === 'Complete') {
                this.elements.statusIndicator.classList.add('is-complete');
            } else if (status.includes('...')) {
                this.elements.statusIndicator.classList.add('is-working');
            }
        }
    }

    /**
     * Get the conversation history
     * @returns {Array}
     */
    getHistory() {
        return [...this._conversationHistory];
    }

    /**
     * Get the current result
     * @returns {string|null}
     */
    getResult() {
        return this._agentResult;
    }

    /**
     * Override destroy
     */
    destroy() {
        this.stop();
        super.destroy();
    }
}

// Static factory method for easy use
AgentModal.run = function(agent, options = {}) {
    return new Promise((resolve, reject) => {
        const modal = new AgentModal({
            agent: agent,
            ...options,
            onComplete: (result) => {
                resolve(result);
            },
            onError: (error) => {
                reject(error);
            }
        });

        ModalService.register(modal);
        modal.init().open();
    });
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AgentModal;
}
