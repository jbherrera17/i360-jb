/**
 * AlertModal - Simple alert dialog
 * @extends ModalBase
 * @version 1.0.0
 */

class AlertModal extends ModalBase {
    /**
     * Create an alert modal
     * @param {Object} options - Alert options
     * @param {string} options.title - Alert title
     * @param {string} options.message - Alert message
     * @param {string} [options.buttonText='OK'] - Button text
     * @param {string} [options.type='info'] - Alert type: info, success, warning, error
     * @param {Function} [options.onClose] - Callback when closed
     */
    constructor(options = {}) {
        super({
            ...options,
            title: options.title || 'Alert',
            draggable: options.draggable !== false,
            resizable: false,
            maximizable: false,
            className: `i360-alert-modal i360-alert-${options.type || 'info'} ${options.className || ''}`.trim()
        });

        this.alertOptions = {
            message: options.message || '',
            buttonText: options.buttonText || 'OK',
            type: options.type || 'info',
            onClose: options.onClose
        };
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
            <div class="i360-alert-content">
                ${icon ? `<div class="i360-alert-icon">${icon}</div>` : ''}
                <div class="i360-alert-message">${this._escapeHtml(this.alertOptions.message)}</div>
            </div>
        `;

        // Show footer with button
        this.elements.footer.style.display = '';
        this.elements.footer.innerHTML = `
            <button type="button" class="i360-btn i360-btn-primary i360-alert-ok" autofocus>
                ${this._escapeHtml(this.alertOptions.buttonText)}
            </button>
        `;

        // Bind button click
        this.elements.okButton = this.elements.footer.querySelector('.i360-alert-ok');
        this.elements.okButton.addEventListener('click', () => this.close());
    }

    /**
     * Get icon SVG for alert type
     * @private
     * @returns {string}
     */
    _getIcon() {
        const icons = {
            info: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>`,
            success: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>`,
            warning: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>`,
            error: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>`
        };

        return icons[this.alertOptions.type] || icons.info;
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
     * Override close to call callback
     * @param {*} result
     * @returns {Promise<void>}
     */
    async close(result) {
        await super.close(result);
        if (typeof this.alertOptions.onClose === 'function') {
            this.alertOptions.onClose();
        }
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlertModal;
}
