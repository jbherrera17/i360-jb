/**
 * PromptModal - Input prompt dialog
 * @extends ModalBase
 * @version 1.0.0
 */

class PromptModal extends ModalBase {
    /**
     * Create a prompt modal
     * @param {Object} options - Prompt options
     * @param {string} options.title - Dialog title
     * @param {string} [options.message] - Prompt message
     * @param {string} [options.placeholder] - Input placeholder
     * @param {string} [options.defaultValue] - Default input value
     * @param {string} [options.inputType='text'] - Input type (text, password, email, etc.)
     * @param {string} [options.confirmText='OK'] - Confirm button text
     * @param {string} [options.cancelText='Cancel'] - Cancel button text
     * @param {Function} [options.onConfirm] - Callback with input value
     * @param {Function} [options.onCancel] - Callback when cancelled
     * @param {Function} [options.validate] - Validation function (return true or error message)
     */
    constructor(options = {}) {
        super({
            ...options,
            title: options.title || 'Input',
            draggable: options.draggable !== false,
            resizable: false,
            maximizable: false,
            closeOnOverlayClick: false,
            className: `i360-prompt-modal ${options.className || ''}`.trim()
        });

        this.promptOptions = {
            message: options.message || '',
            placeholder: options.placeholder || '',
            defaultValue: options.defaultValue || '',
            inputType: options.inputType || 'text',
            confirmText: options.confirmText || 'OK',
            cancelText: options.cancelText || 'Cancel',
            onConfirm: options.onConfirm,
            onCancel: options.onCancel,
            validate: options.validate
        };

        this._confirmed = false;
        this._value = this.promptOptions.defaultValue;
    }

    /**
     * Create modal elements
     * @protected
     */
    _createElements() {
        super._createElements();

        const inputId = `${this.id}-input`;

        // Set body content
        this.elements.body.innerHTML = `
            <div class="i360-prompt-content">
                ${this.promptOptions.message
                    ? `<label for="${inputId}" class="i360-prompt-message">${this._escapeHtml(this.promptOptions.message)}</label>`
                    : ''}
                <input
                    type="${this.promptOptions.inputType}"
                    id="${inputId}"
                    class="i360-prompt-input"
                    placeholder="${this._escapeHtml(this.promptOptions.placeholder)}"
                    value="${this._escapeHtml(this.promptOptions.defaultValue)}"
                    autofocus
                />
                <div class="i360-prompt-error" style="display: none;"></div>
            </div>
        `;

        // Show footer with buttons
        this.elements.footer.style.display = '';
        this.elements.footer.innerHTML = `
            <button type="button" class="i360-btn i360-btn-secondary i360-prompt-cancel">
                ${this._escapeHtml(this.promptOptions.cancelText)}
            </button>
            <button type="button" class="i360-btn i360-btn-primary i360-prompt-ok">
                ${this._escapeHtml(this.promptOptions.confirmText)}
            </button>
        `;

        // Store element references
        this.elements.input = this.elements.body.querySelector('.i360-prompt-input');
        this.elements.errorDiv = this.elements.body.querySelector('.i360-prompt-error');
        this.elements.cancelButton = this.elements.footer.querySelector('.i360-prompt-cancel');
        this.elements.confirmButton = this.elements.footer.querySelector('.i360-prompt-ok');

        // Bind events
        this.elements.cancelButton.addEventListener('click', () => this._handleCancel());
        this.elements.confirmButton.addEventListener('click', () => this._handleConfirm());
        this.elements.input.addEventListener('keydown', (e) => this._handleInputKeydown(e));
        this.elements.input.addEventListener('input', () => this._clearError());
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
     * Handle input keydown
     * @private
     * @param {KeyboardEvent} e
     */
    _handleInputKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this._handleConfirm();
        }
    }

    /**
     * Validate input
     * @private
     * @returns {boolean}
     */
    _validate() {
        const value = this.elements.input.value;

        if (typeof this.promptOptions.validate === 'function') {
            const result = this.promptOptions.validate(value);
            if (result !== true) {
                this._showError(result || 'Invalid input');
                return false;
            }
        }

        return true;
    }

    /**
     * Show validation error
     * @private
     * @param {string} message
     */
    _showError(message) {
        this.elements.errorDiv.textContent = message;
        this.elements.errorDiv.style.display = '';
        this.elements.input.classList.add('has-error');
        this.elements.input.focus();
    }

    /**
     * Clear validation error
     * @private
     */
    _clearError() {
        this.elements.errorDiv.style.display = 'none';
        this.elements.input.classList.remove('has-error');
    }

    /**
     * Handle confirm button click
     * @private
     */
    _handleConfirm() {
        if (!this._validate()) {
            return;
        }

        this._confirmed = true;
        this._value = this.elements.input.value;
        this.close(this._value);
    }

    /**
     * Handle cancel button click
     * @private
     */
    _handleCancel() {
        this._confirmed = false;
        this._value = null;
        this.close(null);
    }

    /**
     * Get current input value
     * @returns {string}
     */
    getValue() {
        return this.elements.input ? this.elements.input.value : this._value;
    }

    /**
     * Set input value
     * @param {string} value
     */
    setValue(value) {
        if (this.elements.input) {
            this.elements.input.value = value;
        }
        this._value = value;
    }

    /**
     * Override close to call appropriate callback
     * @param {*} result
     * @returns {Promise<void>}
     */
    async close(result) {
        await super.close(result);

        if (this._confirmed) {
            if (typeof this.promptOptions.onConfirm === 'function') {
                this.promptOptions.onConfirm(this._value);
            }
        } else {
            if (typeof this.promptOptions.onCancel === 'function') {
                this.promptOptions.onCancel();
            }
        }
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromptModal;
}
