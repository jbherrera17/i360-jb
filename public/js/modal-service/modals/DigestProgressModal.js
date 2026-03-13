/**
 * DigestProgressModal - Real-time progress tracking modal for AI Digest generation
 *
 * Displays live status as digest sections are processed via SSE. The modal is
 * non-closable during generation and unlocks a "View Digest" button on completion.
 *
 * @extends ModalBase
 * @version 1.0.0
 */

class DigestProgressModal extends ModalBase {
    /**
     * Create a digest progress modal
     * @param {Object} options
     * @param {number} [options.totalSections] - Total number of sections expected
     * @param {Function} [options.onClose] - Callback when user closes after completion
     * @param {string} [options.digestUrl='/digest.html'] - URL for the "View Digest" button
     */
    constructor(options = {}) {
        super({
            title: 'Generating Digest',
            closable: false,
            closeOnEscape: false,
            closeOnOverlayClick: false,
            draggable: false,
            resizable: false,
            maximizable: false,
            width: 460,
            animate: true,
            className: 'i360-digest-progress-modal',
            ...options,
            // Always enforce these — they must not be overrideable by spread
            closable: false,
            closeOnEscape: false,
            closeOnOverlayClick: false,
            draggable: false,
            resizable: false
        });

        this._digestOptions = {
            totalSections: options.totalSections || 0,
            onClose: options.onClose || null,
            digestUrl: options.digestUrl || '/digest.html'
        };

        this._sections = [];        // { name, status: 'pending'|'processing'|'complete'|'failed', item_count }
        this._completedCount = 0;
        this._isFinished = false;
        this._isErrored = false;
    }

    // ─────────────────────────────────────────────
    // DOM Construction
    // ─────────────────────────────────────────────

    /**
     * Create modal elements
     * @protected
     */
    _createElements() {
        super._createElements();
        this._buildBody();
        this._injectStyles();
    }

    /**
     * Build the modal body content
     * @private
     */
    _buildBody() {
        this.elements.body.innerHTML = '';
        this.elements.body.style.padding = '0';

        // Progress header area
        const progressArea = document.createElement('div');
        progressArea.className = 'dpm-progress-area';

        // Sparkles icon + status text row
        const statusRow = document.createElement('div');
        statusRow.className = 'dpm-status-row';

        const iconWrap = document.createElement('span');
        iconWrap.className = 'dpm-sparkle-icon';
        iconWrap.innerHTML = '<i data-lucide="sparkles"></i>';

        this.elements.statusText = document.createElement('span');
        this.elements.statusText.className = 'dpm-status-text';
        this.elements.statusText.textContent = this._digestOptions.totalSections
            ? `Processing section 0 of ${this._digestOptions.totalSections}`
            : 'Initializing\u2026';

        statusRow.appendChild(iconWrap);
        statusRow.appendChild(this.elements.statusText);

        // Progress bar track
        const barTrack = document.createElement('div');
        barTrack.className = 'dpm-bar-track';

        this.elements.barFill = document.createElement('div');
        this.elements.barFill.className = 'dpm-bar-fill';
        this.elements.barFill.style.width = '0%';

        barTrack.appendChild(this.elements.barFill);

        progressArea.appendChild(statusRow);
        progressArea.appendChild(barTrack);

        // Section list
        this.elements.sectionList = document.createElement('ul');
        this.elements.sectionList.className = 'dpm-section-list';
        this.elements.sectionList.setAttribute('aria-label', 'Digest sections');

        this.elements.body.appendChild(progressArea);
        this.elements.body.appendChild(this.elements.sectionList);

        // Footer (hidden until complete)
        this.elements.footer.style.display = 'none';
        this.elements.footer.className = 'i360-modal-footer dpm-footer';
        this.elements.footer.innerHTML = `
            <button type="button" class="dpm-view-btn" id="dpm-view-btn">
                <i data-lucide="external-link" style="width:16px;height:16px;"></i>
                View Digest
            </button>
        `;

        this.elements.footer.querySelector('#dpm-view-btn').addEventListener('click', () => {
            if (typeof this._digestOptions.onClose === 'function') {
                this._digestOptions.onClose();
            }
            this.close();
            window.location.href = this._digestOptions.digestUrl;
        });
    }

    /**
     * Inject scoped CSS for this modal into the document head (once only)
     * @private
     */
    _injectStyles() {
        const STYLE_ID = 'dpm-styles';
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            /* DigestProgressModal styles */

            @keyframes dpm-spin {
                from { transform: rotate(0deg); }
                to   { transform: rotate(360deg); }
            }

            .i360-digest-progress-modal .i360-modal-body {
                padding: 0;
                overflow: hidden;
            }

            /* Progress area */
            .dpm-progress-area {
                padding: 1.25rem 1.5rem 1rem;
                border-bottom: 1px solid var(--border);
            }

            .dpm-status-row {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 0.625rem;
            }

            .dpm-sparkle-icon {
                display: flex;
                align-items: center;
                color: var(--primary);
                flex-shrink: 0;
            }

            .dpm-sparkle-icon svg {
                width: 16px;
                height: 16px;
            }

            .dpm-status-text {
                font-size: 0.9375rem;
                font-weight: 600;
                color: var(--text-primary);
                line-height: 1.3;
            }

            /* Progress bar */
            .dpm-bar-track {
                height: 6px;
                border-radius: 9999px;
                background: var(--border);
                overflow: hidden;
            }

            .dpm-bar-fill {
                height: 100%;
                border-radius: 9999px;
                background: var(--primary);
                width: 0%;
                transition: width 400ms ease, background 600ms ease;
            }

            .dpm-bar-fill.is-complete {
                background: var(--success);
            }

            /* Section list */
            .dpm-section-list {
                list-style: none;
                margin: 0;
                padding: 0;
                max-height: 320px;
                overflow-y: auto;
            }

            .dpm-section-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.625rem 1.5rem;
                border-top: 1px solid var(--border);
            }

            .dpm-section-item:first-child {
                border-top: none;
            }

            /* Status icon slot */
            .dpm-section-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                width: 18px;
                height: 18px;
                color: var(--text-muted);
            }

            .dpm-section-icon svg {
                width: 18px;
                height: 18px;
            }

            .dpm-section-icon.is-processing {
                color: var(--primary);
                animation: dpm-spin 1s linear infinite;
            }

            .dpm-section-icon.is-complete {
                color: var(--success);
                animation: none;
            }

            .dpm-section-icon.is-failed {
                color: var(--warning);
                animation: none;
            }

            /* Section name */
            .dpm-section-name {
                flex: 1;
                font-size: 0.875rem;
                color: var(--text-primary);
                font-weight: 500;
            }

            .dpm-section-item[data-status="processing"] .dpm-section-name {
                color: var(--text-primary);
            }

            .dpm-section-item[data-status="pending"] .dpm-section-name {
                color: var(--text-muted);
                font-weight: 400;
            }

            /* Item count badge */
            .dpm-item-count {
                font-size: 0.75rem;
                color: var(--text-muted);
                white-space: nowrap;
                background: var(--bg-tertiary);
                border: 1px solid var(--border);
                border-radius: var(--radius-full);
                padding: 0.125rem 0.5rem;
            }

            /* Footer */
            .dpm-footer {
                padding: 1rem 1.5rem;
                display: flex;
                justify-content: center;
                border-top: 1px solid var(--border);
            }

            .dpm-view-btn {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1.5rem;
                font-size: 0.9375rem;
                font-weight: 600;
                color: #fff;
                background: var(--primary);
                border: none;
                border-radius: var(--radius-md);
                cursor: pointer;
                transition: background 150ms ease, transform 150ms ease;
            }

            .dpm-view-btn:hover {
                background: var(--primary-dark);
                transform: translateY(-1px);
            }

            /* Error state banner */
            .dpm-error-banner {
                margin: 1rem 1.5rem 0;
                padding: 0.75rem 1rem;
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid var(--danger);
                border-radius: var(--radius-md);
                color: var(--danger);
                font-size: 0.875rem;
                display: flex;
                align-items: flex-start;
                gap: 0.5rem;
            }

            .dpm-error-banner svg {
                width: 16px;
                height: 16px;
                flex-shrink: 0;
                margin-top: 1px;
            }

            /* Close button shown only after finish/error */
            .dpm-close-btn {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1.25rem;
                font-size: 0.875rem;
                font-weight: 500;
                color: var(--text-primary);
                background: var(--bg-tertiary);
                border: 1px solid var(--border);
                border-radius: var(--radius-md);
                cursor: pointer;
                transition: background 150ms ease;
            }

            .dpm-close-btn:hover {
                background: var(--bg-secondary);
            }
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────
    // Public API — called from SSE event handlers
    // ─────────────────────────────────────────────

    /**
     * Signal that a section has started processing
     * @param {Object} params
     * @param {string} params.name  - Section display name
     * @param {number} params.index - 0-based section index
     * @param {number} [params.total] - Total sections (updates totalSections if provided)
     */
    sectionStart({ name, index, total }) {
        if (total !== undefined) {
            this._digestOptions.totalSections = total;
        }

        // Add section row if not already tracked
        if (!this._sections[index]) {
            this._sections[index] = { name, status: 'processing', item_count: null };
            this._appendSectionRow(index);
        } else {
            this._sections[index].status = 'processing';
            this._updateSectionRow(index);
        }

        // Update status text
        const total_ = this._digestOptions.totalSections;
        this.elements.statusText.textContent = total_
            ? `Processing section ${index + 1} of ${total_}`
            : `Processing: ${name}`;

        // Update bar (partial progress — each section in-progress counts as 50%)
        this._updateProgressBar();

        // Re-run lucide on new icons
        this._activateIcons();
    }

    /**
     * Signal that a section has completed (success or failed)
     * @param {Object} params
     * @param {string} params.name
     * @param {number} params.index
     * @param {number} [params.total]
     * @param {string} [params.status='complete'] - 'complete' or 'failed'
     * @param {number} [params.item_count] - Number of items fetched
     */
    sectionComplete({ name, index, total, status = 'complete', item_count }) {
        if (total !== undefined) {
            this._digestOptions.totalSections = total;
        }

        // Ensure section exists in our tracking array
        if (!this._sections[index]) {
            this._sections[index] = { name, status, item_count: item_count ?? null };
            this._appendSectionRow(index);
        } else {
            this._sections[index].status = status;
            this._sections[index].item_count = item_count ?? null;
            this._updateSectionRow(index);
        }

        if (status === 'complete') {
            this._completedCount++;
        }

        this._updateProgressBar();
        this._activateIcons();
    }

    /**
     * Signal that all sections are done; transition to completion state
     * @param {Object} params
     * @param {number} [params.total_items] - Total items across all sections
     * @param {string} [params.status='complete'] - Overall status
     */
    finish({ total_items, status = 'complete' } = {}) {
        this._isFinished = true;

        // Force bar to 100%
        this.elements.barFill.style.width = '100%';
        this.elements.barFill.classList.add('is-complete');

        // Update status text
        const total = this._digestOptions.totalSections || this._sections.length;
        const itemStr = (total_items !== undefined && total_items !== null)
            ? ` \u2014 ${total_items} item${total_items !== 1 ? 's' : ''} collected`
            : '';
        this.elements.statusText.textContent = `Complete${itemStr}`;

        // Update modal title
        this.setTitle('Digest Ready');

        // Unlock close: enable escape and overlay click
        this.options.closeOnEscape = true;
        this.options.closeOnOverlayClick = false; // Keep overlay non-clickable; use button only

        // Show footer with View Digest button
        this.elements.footer.style.display = '';

        this._activateIcons();

        this.emit('finish', { modal: this, total_items, status });
    }

    /**
     * Signal a full generation failure
     * @param {string} [message] - Error message to display
     */
    error(message = 'Digest generation failed. Please try again.') {
        this._isErrored = true;

        // Update bar to show partial failure state
        this.elements.barFill.style.width = this.elements.barFill.style.width || '0%';

        // Update status text
        this.elements.statusText.textContent = 'Generation failed';

        // Show error banner inside body
        const banner = document.createElement('div');
        banner.className = 'dpm-error-banner';
        banner.innerHTML = `
            <i data-lucide="alert-circle"></i>
            <span>${this._escapeHtml(message)}</span>
        `;
        this.elements.body.appendChild(banner);

        // Update title
        this.setTitle('Digest Error');

        // Unlock close: show a close button in footer
        this.options.closeOnEscape = true;
        this.elements.footer.style.display = '';
        this.elements.footer.innerHTML = `
            <button type="button" class="dpm-close-btn" id="dpm-close-btn">
                Close
            </button>
        `;
        this.elements.footer.querySelector('#dpm-close-btn').addEventListener('click', () => {
            if (typeof this._digestOptions.onClose === 'function') {
                this._digestOptions.onClose();
            }
            this.close();
        });

        this._activateIcons();
        this.emit('error', { modal: this, message });
    }

    // ─────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────

    /**
     * Calculate the appropriate progress percentage and update the bar
     * @private
     */
    _updateProgressBar() {
        const total = this._digestOptions.totalSections || this._sections.length;
        if (total === 0) return;

        let progress = 0;
        this._sections.forEach(s => {
            if (!s) return;
            if (s.status === 'complete' || s.status === 'failed') {
                progress += 1;
            } else if (s.status === 'processing') {
                progress += 0.4; // partial credit for in-progress sections
            }
        });

        const pct = Math.min(Math.round((progress / total) * 100), 99); // Never reach 100 until finish()
        this.elements.barFill.style.width = `${pct}%`;
    }

    /**
     * Append a new section row to the list
     * @private
     * @param {number} index
     */
    _appendSectionRow(index) {
        const section = this._sections[index];
        if (!section) return;

        const li = document.createElement('li');
        li.className = 'dpm-section-item';
        li.dataset.index = index;
        li.dataset.status = section.status;
        li.setAttribute('aria-label', `${section.name}: ${section.status}`);

        li.innerHTML = this._sectionRowHTML(section);

        this.elements.sectionList.appendChild(li);
    }

    /**
     * Update an existing section row in place
     * @private
     * @param {number} index
     */
    _updateSectionRow(index) {
        const section = this._sections[index];
        if (!section) return;

        const li = this.elements.sectionList.querySelector(`[data-index="${index}"]`);
        if (!li) {
            this._appendSectionRow(index);
            return;
        }

        li.dataset.status = section.status;
        li.setAttribute('aria-label', `${section.name}: ${section.status}`);
        li.innerHTML = this._sectionRowHTML(section);
    }

    /**
     * Return the inner HTML for a section row
     * @private
     * @param {Object} section
     * @returns {string}
     */
    _sectionRowHTML(section) {
        const iconClass = section.status === 'processing' ? 'is-processing'
            : section.status === 'complete'   ? 'is-complete'
            : section.status === 'failed'     ? 'is-failed'
            : '';

        const iconName = section.status === 'processing' ? 'loader'
            : section.status === 'complete'   ? 'check-circle'
            : section.status === 'failed'     ? 'alert-circle'
            : 'clock';

        const countBadge = (section.item_count !== null && section.item_count !== undefined)
            ? `<span class="dpm-item-count">${section.item_count} item${section.item_count !== 1 ? 's' : ''}</span>`
            : '';

        return `
            <span class="dpm-section-icon ${iconClass}" aria-hidden="true">
                <i data-lucide="${iconName}"></i>
            </span>
            <span class="dpm-section-name">${this._escapeHtml(section.name)}</span>
            ${countBadge}
        `;
    }

    /**
     * Activate Lucide icons within the modal body
     * @private
     */
    _activateIcons() {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: [this.elements.body, this.elements.footer] });
        }
    }

    /**
     * Escape HTML for safe text rendering
     * @private
     * @param {string} str
     * @returns {string}
     */
    _escapeHtml(str) {
        if (typeof str !== 'string') return String(str || '');
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DigestProgressModal;
}
