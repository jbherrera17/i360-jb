/**
 * CreateAssetModal - Modal for creating context assets via AI generation or import
 * @extends ModalBase
 * @version 1.0.0
 */

class CreateAssetModal extends ModalBase {
    /**
     * Create a create asset modal
     * @param {Object} options - Modal options
     * @param {Array} options.assetTypes - Available asset types [{value, label}]
     * @param {Function} options.onGenerate - Callback for generate action
     * @param {Function} options.onImport - Callback for import action
     * @param {Function} [options.onCancel] - Callback when cancelled
     */
    constructor(options = {}) {
        super({
            ...options,
            title: 'Create Context Asset',
            draggable: options.draggable !== false,
            resizable: false,
            closeOnOverlayClick: false,
            width: 520,
            className: `i360-create-asset-modal ${options.className || ''}`.trim()
        });

        this.assetOptions = {
            assetTypes: options.assetTypes || [],
            onGenerate: options.onGenerate,
            onImport: options.onImport,
            onCancel: options.onCancel
        };

        this._activeTab = 'generate';
        this._isProcessing = false;
        this._selectedFile = null;
    }

    /**
     * Create modal elements
     * @protected
     */
    _createElements() {
        super._createElements();

        // Add icon to title
        this.elements.title.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px; vertical-align: middle;">
                <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.816 1.915a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.816-1.915a2 2 0 001.272-1.272L12 3z"/>
            </svg>
            Create Context Asset
        `;

        // Create tabs
        this._createTabs();

        // Create tab contents
        this._createGenerateTab();
        this._createImportTab();

        // Create status area
        this._createStatusArea();

        // Create footer
        this._createFooter();
    }

    /**
     * Create tab navigation
     * @private
     */
    _createTabs() {
        this.elements.tabs = document.createElement('div');
        this.elements.tabs.className = 'i360-create-asset-tabs';
        this.elements.tabs.innerHTML = `
            <button type="button" class="i360-create-asset-tab active" data-tab="generate">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 4V2m0 2v2m0-2h-4.5M5 18h14a2 2 0 002-2v-3m-3-5.5V2M4 9l3 3-3 3"/>
                    <path d="M9 17v1a2 2 0 002 2h10a2 2 0 002-2V8a2 2 0 00-2-2h-1"/>
                </svg>
                Generate New
            </button>
            <button type="button" class="i360-create-asset-tab" data-tab="import">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <line x1="10" y1="9" x2="8" y2="9"/>
                </svg>
                Import Content
            </button>
        `;

        // Insert tabs after header
        this.elements.container.insertBefore(this.elements.tabs, this.elements.body);

        // Bind tab click events
        this.elements.tabs.querySelectorAll('.i360-create-asset-tab').forEach(tab => {
            tab.addEventListener('click', () => this._switchTab(tab.dataset.tab));
        });
    }

    /**
     * Create generate tab content
     * @private
     */
    _createGenerateTab() {
        this.elements.generateTab = document.createElement('div');
        this.elements.generateTab.className = 'i360-create-asset-tab-content active';
        this.elements.generateTab.dataset.tab = 'generate';

        const typeOptions = this.assetOptions.assetTypes
            .map(t => `<option value="${this._escapeHtml(t.value)}">${this._escapeHtml(t.label)}</option>`)
            .join('');

        this.elements.generateTab.innerHTML = `
            <p class="i360-create-asset-description">Select an asset type and describe what you want. AI will generate the content for you.</p>

            <div class="i360-form-field">
                <label class="i360-form-label">Asset Type</label>
                <select class="i360-form-select" id="${this.id}-generate-type">
                    <option value="">Select Type...</option>
                    ${typeOptions}
                </select>
            </div>

            <div class="i360-form-field">
                <label class="i360-form-label">Company/Context Name</label>
                <input type="text" class="i360-form-input" id="${this.id}-generate-company" placeholder="e.g., Synergi AI, Acme Corp">
            </div>

            <div class="i360-form-field">
                <label class="i360-form-label">Description / Instructions</label>
                <textarea class="i360-form-textarea" id="${this.id}-generate-prompt" rows="4" placeholder="Describe your company, product, or what this asset should contain..."></textarea>
            </div>
        `;

        this.elements.body.appendChild(this.elements.generateTab);
    }

    /**
     * Create import tab content
     * @private
     */
    _createImportTab() {
        this.elements.importTab = document.createElement('div');
        this.elements.importTab.className = 'i360-create-asset-tab-content';
        this.elements.importTab.dataset.tab = 'import';

        const typeOptions = this.assetOptions.assetTypes
            .map(t => `<option value="${this._escapeHtml(t.value)}">${this._escapeHtml(t.label)}</option>`)
            .join('');

        this.elements.importTab.innerHTML = `
            <p class="i360-create-asset-description">Paste any business content (SOPs, processes, product info, etc.) and AI will convert it into a structured context asset.</p>

            <div class="i360-form-field">
                <label class="i360-form-label">Content Type (Optional)</label>
                <select class="i360-form-select" id="${this.id}-import-type">
                    <option value="">Auto-detect best type...</option>
                    ${typeOptions}
                </select>
                <small class="i360-form-hint">Leave empty to let AI determine the best asset type</small>
            </div>

            <div class="i360-form-field">
                <label class="i360-form-label">Content Source (Optional)</label>
                <input type="text" class="i360-form-input" id="${this.id}-import-source" placeholder="e.g., Sales Playbook, Onboarding Doc, Website Copy">
            </div>

            <div class="i360-form-field">
                <label class="i360-form-label">Paste Your Content</label>
                <textarea class="i360-form-textarea" id="${this.id}-import-content" rows="6" placeholder="Paste your content here...

Examples:
- An SOP or process document
- Product/service descriptions
- Company information
- Team bios
- FAQ content
- Any business document you want to structure"></textarea>
            </div>

            <div class="i360-form-field">
                <label class="i360-form-label">Or upload a file</label>
                <div class="i360-file-upload-area" id="${this.id}-file-upload">
                    <input type="file" id="${this.id}-file-input" accept=".txt,.md,.json,.csv" style="display: none;">
                    <div class="i360-file-upload-content">
                        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M4 14.899A7 7 0 1115.71 8h1.79a4.5 4.5 0 012.5 8.242"/>
                            <path d="M12 12v9"/>
                            <path d="M8 17l4-5 4 5"/>
                        </svg>
                        <span>Click or drag to upload</span>
                        <small>.txt, .md, .json, .csv</small>
                    </div>
                    <div class="i360-file-selected" style="display: none;">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <path d="M9 15l2 2 4-4"/>
                        </svg>
                        <span class="i360-file-name"></span>
                        <button type="button" class="i360-file-clear" aria-label="Clear file">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.elements.body.appendChild(this.elements.importTab);

        // Setup file upload after adding to DOM
        setTimeout(() => this._setupFileUpload(), 0);
    }

    /**
     * Create status area for processing feedback
     * @private
     */
    _createStatusArea() {
        this.elements.status = document.createElement('div');
        this.elements.status.className = 'i360-create-asset-status';
        this.elements.status.style.display = 'none';
        this.elements.status.innerHTML = `
            <div class="i360-create-asset-spinner">
                <svg viewBox="0 0 50 50" width="24" height="24">
                    <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="80, 200" stroke-linecap="round">
                        <animateTransform attributeName="transform" type="rotate" values="0 25 25;360 25 25" dur="1s" repeatCount="indefinite"/>
                    </circle>
                </svg>
            </div>
            <span class="i360-create-asset-status-text">Processing content...</span>
        `;
        this.elements.body.appendChild(this.elements.status);
    }

    /**
     * Create footer with action buttons
     * @private
     */
    _createFooter() {
        this.elements.footer.style.display = '';
        this.elements.footer.innerHTML = `
            <button type="button" class="i360-btn i360-btn-secondary i360-create-asset-cancel">Cancel</button>
            <button type="button" class="i360-btn i360-btn-ai i360-create-asset-generate">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.816 1.915a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.816-1.915a2 2 0 001.272-1.272L12 3z"/>
                </svg>
                Generate
            </button>
            <button type="button" class="i360-btn i360-btn-ai i360-create-asset-import" style="display: none;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.816 1.915a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.816-1.915a2 2 0 001.272-1.272L12 3z"/>
                </svg>
                Convert to Asset
            </button>
        `;

        // Bind button events
        this.elements.cancelBtn = this.elements.footer.querySelector('.i360-create-asset-cancel');
        this.elements.generateBtn = this.elements.footer.querySelector('.i360-create-asset-generate');
        this.elements.importBtn = this.elements.footer.querySelector('.i360-create-asset-import');

        this.elements.cancelBtn.addEventListener('click', () => this._handleCancel());
        this.elements.generateBtn.addEventListener('click', () => this._handleGenerate());
        this.elements.importBtn.addEventListener('click', () => this._handleImport());
    }

    /**
     * Setup file upload functionality
     * @private
     */
    _setupFileUpload() {
        const uploadArea = this.elements.importTab.querySelector('.i360-file-upload-area');
        const fileInput = this.elements.importTab.querySelector(`#${this.id}-file-input`);
        const uploadContent = uploadArea.querySelector('.i360-file-upload-content');
        const selectedDisplay = uploadArea.querySelector('.i360-file-selected');
        const fileName = selectedDisplay.querySelector('.i360-file-name');
        const clearBtn = selectedDisplay.querySelector('.i360-file-clear');

        // Click to upload
        uploadArea.addEventListener('click', (e) => {
            if (e.target.closest('.i360-file-clear')) return;
            if (!this._selectedFile) {
                fileInput.click();
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this._handleFileSelect(files[0]);
            }
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this._handleFileSelect(e.target.files[0]);
            }
        });

        // Clear file
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._clearFile();
        });

        // Store references
        this.elements.fileInput = fileInput;
        this.elements.uploadContent = uploadContent;
        this.elements.selectedDisplay = selectedDisplay;
        this.elements.fileName = fileName;
    }

    /**
     * Handle file selection
     * @private
     * @param {File} file
     */
    _handleFileSelect(file) {
        const allowedTypes = ['.txt', '.md', '.json', '.csv'];
        const ext = '.' + file.name.split('.').pop().toLowerCase();

        if (!allowedTypes.includes(ext)) {
            if (typeof ModalService !== 'undefined') {
                ModalService.error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
            } else {
                alert(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
            }
            return;
        }

        this._selectedFile = file;
        this.elements.uploadContent.style.display = 'none';
        this.elements.selectedDisplay.style.display = 'flex';
        this.elements.fileName.textContent = file.name;

        // Read file content into textarea
        const reader = new FileReader();
        reader.onload = (e) => {
            const contentTextarea = this.elements.importTab.querySelector(`#${this.id}-import-content`);
            if (contentTextarea) {
                contentTextarea.value = e.target.result;
            }
        };
        reader.readAsText(file);
    }

    /**
     * Clear selected file
     * @private
     */
    _clearFile() {
        this._selectedFile = null;
        this.elements.fileInput.value = '';
        this.elements.uploadContent.style.display = 'flex';
        this.elements.selectedDisplay.style.display = 'none';
        this.elements.fileName.textContent = '';
    }

    /**
     * Switch between tabs
     * @private
     * @param {string} tabName
     */
    _switchTab(tabName) {
        this._activeTab = tabName;

        // Update tab buttons
        this.elements.tabs.querySelectorAll('.i360-create-asset-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab contents
        this.elements.generateTab.classList.toggle('active', tabName === 'generate');
        this.elements.importTab.classList.toggle('active', tabName === 'import');

        // Update footer buttons
        this.elements.generateBtn.style.display = tabName === 'generate' ? '' : 'none';
        this.elements.importBtn.style.display = tabName === 'import' ? '' : 'none';
    }

    /**
     * Show processing status
     * @param {string} message
     */
    showStatus(message) {
        this._isProcessing = true;
        this.elements.status.style.display = 'flex';
        this.elements.status.querySelector('.i360-create-asset-status-text').textContent = message;

        // Disable buttons
        this.elements.cancelBtn.disabled = true;
        this.elements.generateBtn.disabled = true;
        this.elements.importBtn.disabled = true;
    }

    /**
     * Hide processing status
     */
    hideStatus() {
        this._isProcessing = false;
        this.elements.status.style.display = 'none';

        // Enable buttons
        this.elements.cancelBtn.disabled = false;
        this.elements.generateBtn.disabled = false;
        this.elements.importBtn.disabled = false;
    }

    /**
     * Handle generate action
     * @private
     */
    async _handleGenerate() {
        const type = this.elements.generateTab.querySelector(`#${this.id}-generate-type`).value;
        const companyName = this.elements.generateTab.querySelector(`#${this.id}-generate-company`).value.trim();
        const prompt = this.elements.generateTab.querySelector(`#${this.id}-generate-prompt`).value.trim();

        // Validation
        if (!type) {
            if (typeof ModalService !== 'undefined') {
                ModalService.error('Please select an asset type');
            }
            return;
        }

        if (!prompt) {
            if (typeof ModalService !== 'undefined') {
                ModalService.error('Please provide a description');
            }
            return;
        }

        if (this.assetOptions.onGenerate) {
            await this.assetOptions.onGenerate({
                type,
                companyName,
                prompt,
                modal: this
            });
        }
    }

    /**
     * Handle import action
     * @private
     */
    async _handleImport() {
        const type = this.elements.importTab.querySelector(`#${this.id}-import-type`).value;
        const source = this.elements.importTab.querySelector(`#${this.id}-import-source`).value.trim();
        const content = this.elements.importTab.querySelector(`#${this.id}-import-content`).value.trim();

        // Validation
        if (!content) {
            if (typeof ModalService !== 'undefined') {
                ModalService.error('Please paste or upload content to import');
            }
            return;
        }

        if (this.assetOptions.onImport) {
            await this.assetOptions.onImport({
                type,
                source,
                content,
                file: this._selectedFile,
                modal: this
            });
        }
    }

    /**
     * Handle cancel action
     * @private
     */
    _handleCancel() {
        if (this.assetOptions.onCancel) {
            this.assetOptions.onCancel();
        }
        this.close();
    }

    /**
     * Reset the form
     */
    reset() {
        // Reset generate tab
        this.elements.generateTab.querySelector(`#${this.id}-generate-type`).value = '';
        this.elements.generateTab.querySelector(`#${this.id}-generate-company`).value = '';
        this.elements.generateTab.querySelector(`#${this.id}-generate-prompt`).value = '';

        // Reset import tab
        this.elements.importTab.querySelector(`#${this.id}-import-type`).value = '';
        this.elements.importTab.querySelector(`#${this.id}-import-source`).value = '';
        this.elements.importTab.querySelector(`#${this.id}-import-content`).value = '';
        this._clearFile();

        // Reset to generate tab
        this._switchTab('generate');

        // Hide status
        this.hideStatus();
    }

    /**
     * Update asset types
     * @param {Array} types
     */
    setAssetTypes(types) {
        this.assetOptions.assetTypes = types;

        const typeOptions = types
            .map(t => `<option value="${this._escapeHtml(t.value)}">${this._escapeHtml(t.label)}</option>`)
            .join('');

        // Update generate type select
        const generateSelect = this.elements.generateTab.querySelector(`#${this.id}-generate-type`);
        generateSelect.innerHTML = `<option value="">Select Type...</option>${typeOptions}`;

        // Update import type select
        const importSelect = this.elements.importTab.querySelector(`#${this.id}-import-type`);
        importSelect.innerHTML = `<option value="">Auto-detect best type...</option>${typeOptions}`;
    }

    /**
     * Escape HTML to prevent XSS
     * @private
     * @param {string} str
     * @returns {string}
     */
    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Get current form values
     * @returns {Object}
     */
    getValues() {
        if (this._activeTab === 'generate') {
            return {
                tab: 'generate',
                type: this.elements.generateTab.querySelector(`#${this.id}-generate-type`).value,
                companyName: this.elements.generateTab.querySelector(`#${this.id}-generate-company`).value.trim(),
                prompt: this.elements.generateTab.querySelector(`#${this.id}-generate-prompt`).value.trim()
            };
        } else {
            return {
                tab: 'import',
                type: this.elements.importTab.querySelector(`#${this.id}-import-type`).value,
                source: this.elements.importTab.querySelector(`#${this.id}-import-source`).value.trim(),
                content: this.elements.importTab.querySelector(`#${this.id}-import-content`).value.trim(),
                file: this._selectedFile
            };
        }
    }
}

// Register with ModalService if available
if (typeof ModalService !== 'undefined' && ModalService.registerType) {
    ModalService.registerType('createAsset', CreateAssetModal);
}
