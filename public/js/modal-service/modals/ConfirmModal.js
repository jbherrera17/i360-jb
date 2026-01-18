/**
 * ConfirmModal - Confirmation dialog with confirm/cancel buttons
 * @extends ModalBase
 * @version 1.0.0
 */

class ConfirmModal extends ModalBase {
    /**
     * Create a confirmation modal
     * @param {Object} options - Confirm options
     * @param {string} options.title - Dialog title
     * @param {string} options.message - Confirmation message
     * @param {string} [options.confirmText='Confirm'] - Confirm button text
     * @param {string} [options.cancelText='Cancel'] - Cancel button text
     * @param {string} [options.type='info'] - Type: info, warning, danger
     * @param {Function} [options.onConfirm] - Callback when confirmed
     * @param {Function} [options.onCancel] - Callback when cancelled
     */
    constructor(options = {}) {
        super({
            ...options,
            title: options.title || 'Confirm',
            draggable: options.draggable !== false,
            resizable: false,
            maximizable: false,
            closeOnOverlayClick: false, // Require explicit decision
            className: `i360-confirm-modal i360-confirm-${options.type || 'info'} ${options.className || ''}`.trim()
        });

        this.confirmOptions = {
            message: options.message || '',
            confirmText: options.confirmText || 'Confirm',
            cancelText: options.cancelText || 'Cancel',
            type: options.type || 'info',
            onConfirm: options.onConfirm,
            onCancel: options.onCancel
        };

        this._confirmed = false;
        this._callbackCalled = false;  // Prevent double callback
    }

    /**
     * Create modal elements
     * @protected
     */
    _createElements() {
        super._createElements();

        // Add icon based on type
        const icon = this._getIcon();

        // Set body content
        this.elements.body.innerHTML = `
            <div class="i360-confirm-content">
                ${icon ? `<div class="i360-confirm-icon">${icon}</div>` : ''}
                <div class="i360-confirm-message">${this._escapeHtml(this.confirmOptions.message)}</div>
            </div>
        `;

        // Get button class based on type
        const confirmBtnClass = this.confirmOptions.type === 'danger'
            ? 'i360-btn-danger'
            : 'i360-btn-primary';

        // Show footer with buttons
        this.elements.footer.style.display = '';
        this.elements.footer.innerHTML = `
            <button type="button" class="i360-btn i360-btn-secondary i360-confirm-cancel">
                ${this._escapeHtml(this.confirmOptions.cancelText)}
            </button>
            <button type="button" class="i360-btn ${confirmBtnClass} i360-confirm-ok" autofocus>
                ${this._escapeHtml(this.confirmOptions.confirmText)}
            </button>
        `;

        // Bind button clicks
        this.elements.cancelButton = this.elements.footer.querySelector('.i360-confirm-cancel');
        this.elements.confirmButton = this.elements.footer.querySelector('.i360-confirm-ok');

        this.elements.cancelButton.addEventListener('click', () => this._handleCancel());
        this.elements.confirmButton.addEventListener('click', () => this._handleConfirm());
    }

    /**
     * Get icon SVG for confirm type
     * @private
     * @returns {string}
     */
    _getIcon() {
        const icons = {
            info: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>`,
            warning: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>`,
            danger: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>`
        };

        return icons[this.confirmOptions.type] || icons.info;
    }

    /**
     * Escape HTML for safe display
     * @private
     * @param {string} str
     * @returns {string}
     */
    _escapeHtml(str) {
        if (typeof Sanitize !== 'undefined' && Sanitize.escapeHtml) {
            return Sanitize.escapeHtml(str);
        }
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Handle confirm button click
     * @private
     */
    async _handleConfirm() {
        this._confirmed = true;
        await this.close(true);
    }

    /**
     * Handle cancel button click
     * @private
     */
    async _handleCancel() {
        this._confirmed = false;
        await this.close(false);
    }

    /**
     * Override close to call appropriate callback
     * @param {boolean} result
     * @returns {Promise<void>}
     */
    async close(result) {
        // Store elements before close (in case they get cleared)
        const overlay = this.elements.overlay;
        const container = this.elements.container;

        // Call parent close to remove DOM elements
        await super.close(result);

        // Force remove elements if they still exist in DOM (belt and suspenders)
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }

        // Prevent multiple callback calls
        if (this._callbackCalled) {
            return;
        }

        // Mark callback as called and call the appropriate callback
        this._callbackCalled = true;
        if (this._confirmed) {
            if (typeof this.confirmOptions.onConfirm === 'function') {
                this.confirmOptions.onConfirm();
            }
        } else {
            if (typeof this.confirmOptions.onCancel === 'function') {
                this.confirmOptions.onCancel();
            }
        }
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfirmModal;
}
