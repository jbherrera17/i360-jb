/**
 * FormModal - Modal with form handling and validation
 * @extends ModalBase
 * @version 1.0.0
 */

class FormModal extends ModalBase {
    /**
     * Create a form modal
     * @param {Object} options - Form modal options
     * @param {string} options.title - Modal title
     * @param {Array} options.fields - Form field definitions
     * @param {Object} [options.values] - Initial field values
     * @param {string} [options.submitText='Submit'] - Submit button text
     * @param {string} [options.cancelText='Cancel'] - Cancel button text
     * @param {Function} [options.onSubmit] - Callback with form values
     * @param {Function} [options.onCancel] - Callback when cancelled
     * @param {Function} [options.validate] - Custom validation function
     */
    constructor(options = {}) {
        super({
            ...options,
            title: options.title || 'Form',
            draggable: options.draggable !== false,
            resizable: options.resizable || false,
            closeOnOverlayClick: false,
            className: `i360-form-modal ${options.className || ''}`.trim()
        });

        // Build initial values from field definitions if not explicitly provided
        const fieldValues = {};
        (options.fields || []).forEach(f => {
            if (f.value !== undefined) fieldValues[f.name] = f.value;
        });

        this.formOptions = {
            fields: options.fields || [],
            values: { ...fieldValues, ...(options.values || {}) },
            submitText: options.submitText || 'Submit',
            cancelText: options.cancelText || 'Cancel',
            onSubmit: options.onSubmit,
            onCancel: options.onCancel,
            validate: options.validate
        };

        this._submitted = false;
        this._fieldElements = {};
        this._errorElements = {};
    }

    /**
     * Create modal elements
     * @protected
     */
    _createElements() {
        super._createElements();

        // Create form
        this.elements.form = document.createElement('form');
        this.elements.form.className = 'i360-form-modal-form';
        this.elements.form.setAttribute('novalidate', '');

        // Create fields
        this.formOptions.fields.forEach(field => {
            const fieldEl = this._createField(field);
            this.elements.form.appendChild(fieldEl);
        });

        // Set body content
        this.elements.body.innerHTML = '';
        this.elements.body.appendChild(this.elements.form);

        // Show footer with buttons
        this.elements.footer.style.display = '';
        this.elements.footer.innerHTML = `
            <button type="button" class="i360-btn i360-btn-secondary i360-form-cancel">
                ${this._escapeHtml(this.formOptions.cancelText)}
            </button>
            <button type="submit" form="${this.id}-form" class="i360-btn i360-btn-primary i360-form-submit">
                ${this._escapeHtml(this.formOptions.submitText)}
            </button>
        `;

        this.elements.form.id = `${this.id}-form`;

        // Bind events
        this.elements.cancelButton = this.elements.footer.querySelector('.i360-form-cancel');
        this.elements.submitButton = this.elements.footer.querySelector('.i360-form-submit');

        this.elements.cancelButton.addEventListener('click', () => this._handleCancel());
        this.elements.form.addEventListener('submit', (e) => this._handleSubmit(e));
    }

    /**
     * Create a form field element
     * @private
     * @param {Object} field - Field definition
     * @returns {HTMLElement}
     */
    _createField(field) {
        const wrapper = document.createElement('div');
        wrapper.className = `i360-form-field i360-form-field-${field.type || 'text'}`;

        // Label
        if (field.label) {
            const label = document.createElement('label');
            label.className = 'i360-form-label';
            label.setAttribute('for', `${this.id}-${field.name}`);
            label.textContent = field.label;
            if (field.required) {
                label.innerHTML += ' <span class="i360-form-required">*</span>';
            }
            wrapper.appendChild(label);
        }

        // Input element
        let input;
        const initialValue = this.formOptions.values[field.name] ?? field.defaultValue ?? '';

        switch (field.type) {
            case 'textarea':
                input = document.createElement('textarea');
                input.rows = field.rows || 4;
                input.value = initialValue;
                break;

            case 'select':
                input = document.createElement('select');
                if (field.placeholder) {
                    const placeholder = document.createElement('option');
                    placeholder.value = '';
                    placeholder.textContent = field.placeholder;
                    placeholder.disabled = true;
                    placeholder.selected = !initialValue;
                    input.appendChild(placeholder);
                }
                (field.options || []).forEach(opt => {
                    const option = document.createElement('option');
                    option.value = typeof opt === 'object' ? opt.value : opt;
                    option.textContent = typeof opt === 'object' ? opt.label : opt;
                    option.selected = option.value === initialValue;
                    input.appendChild(option);
                });
                break;

            case 'checkbox':
                input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = !!initialValue;
                wrapper.classList.add('i360-form-field-inline');
                break;

            case 'radio':
                const radioGroup = document.createElement('div');
                radioGroup.className = 'i360-form-radio-group';
                (field.options || []).forEach((opt, idx) => {
                    const radioWrapper = document.createElement('label');
                    radioWrapper.className = 'i360-form-radio-option';

                    const radio = document.createElement('input');
                    radio.type = 'radio';
                    radio.name = `${this.id}-${field.name}`;
                    radio.value = typeof opt === 'object' ? opt.value : opt;
                    radio.checked = radio.value === initialValue;

                    radioWrapper.appendChild(radio);
                    radioWrapper.appendChild(document.createTextNode(typeof opt === 'object' ? opt.label : opt));
                    radioGroup.appendChild(radioWrapper);
                });
                input = radioGroup;
                break;

            case 'avatar':
                input = this._createAvatarField(field, initialValue);
                break;

            case 'checkbox-group':
                const checkboxGroup = document.createElement('div');
                checkboxGroup.className = 'i360-form-checkbox-group';
                checkboxGroup.id = `${this.id}-${field.name}`;
                const selectedValues = Array.isArray(initialValue) ? initialValue : [];

                (field.options || []).forEach((opt, idx) => {
                    const checkboxWrapper = document.createElement('label');
                    checkboxWrapper.className = 'i360-form-checkbox-option';

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.name = `${this.id}-${field.name}`;
                    checkbox.value = typeof opt === 'object' ? opt.value : opt;
                    checkbox.checked = selectedValues.includes(checkbox.value);
                    checkbox.addEventListener('change', () => this._clearFieldError(field.name));

                    const labelContent = document.createElement('span');
                    labelContent.className = 'i360-form-checkbox-label-content';

                    const labelText = document.createElement('span');
                    labelText.className = 'i360-form-checkbox-label';
                    labelText.textContent = typeof opt === 'object' ? opt.label : opt;
                    labelContent.appendChild(labelText);

                    if (typeof opt === 'object' && opt.description) {
                        const desc = document.createElement('span');
                        desc.className = 'i360-form-checkbox-description';
                        desc.textContent = opt.description;
                        labelContent.appendChild(desc);
                    }

                    checkboxWrapper.appendChild(checkbox);
                    checkboxWrapper.appendChild(labelContent);
                    checkboxGroup.appendChild(checkboxWrapper);
                });

                input = checkboxGroup;
                break;

            default:
                input = document.createElement('input');
                input.type = field.type || 'text';
                input.value = initialValue;
                if (field.placeholder) input.placeholder = field.placeholder;
                if (field.min !== undefined) input.min = field.min;
                if (field.max !== undefined) input.max = field.max;
                if (field.step !== undefined) input.step = field.step;
                if (field.pattern) input.pattern = field.pattern;
                break;
        }

        // Common attributes
        if (input.tagName !== 'DIV') {
            input.id = `${this.id}-${field.name}`;
            input.name = field.name;
            input.className = 'i360-form-input';
            if (field.required) input.required = true;
            if (field.disabled) input.disabled = true;
            if (field.readonly) input.readOnly = true;
            if (field.autofocus) input.autofocus = true;

            // Clear error on input
            input.addEventListener('input', () => this._clearFieldError(field.name));
        }

        wrapper.appendChild(input);
        this._fieldElements[field.name] = input;

        // Help text
        if (field.help) {
            const help = document.createElement('div');
            help.className = 'i360-form-help';
            help.textContent = field.help;
            wrapper.appendChild(help);
        }

        // Error element
        const error = document.createElement('div');
        error.className = 'i360-form-error';
        error.style.display = 'none';
        wrapper.appendChild(error);
        this._errorElements[field.name] = error;

        return wrapper;
    }

    /**
     * Create avatar field with photo upload and avatar selection
     * @private
     * @param {Object} field - Field definition
     * @param {string} initialValue - Initial value (URL or avatar name)
     * @returns {HTMLElement}
     */
    _createAvatarField(field, initialValue) {
        const container = document.createElement('div');
        container.className = 'i360-form-avatar-container';
        container.id = `${this.id}-${field.name}`;

        // Preview area
        const preview = document.createElement('div');
        preview.className = 'i360-form-avatar-preview';

        const previewImg = document.createElement('img');
        previewImg.className = 'i360-form-avatar-image';
        previewImg.alt = 'Avatar preview';
        if (initialValue) {
            previewImg.src = initialValue;
        } else {
            previewImg.style.display = 'none';
        }

        const placeholder = document.createElement('div');
        placeholder.className = 'i360-form-avatar-placeholder';
        placeholder.innerHTML = `
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
            </svg>
        `;
        if (initialValue) {
            placeholder.style.display = 'none';
        }

        preview.appendChild(previewImg);
        preview.appendChild(placeholder);

        // Controls
        const controls = document.createElement('div');
        controls.className = 'i360-form-avatar-controls';

        // Upload button
        const uploadBtn = document.createElement('button');
        uploadBtn.type = 'button';
        uploadBtn.className = 'i360-btn i360-btn-secondary i360-form-avatar-upload-btn';
        uploadBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload Photo
        `;

        // Hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.className = 'i360-form-avatar-file-input';
        fileInput.style.display = 'none';

        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            this._handleAvatarFileSelect(e, field.name, previewImg, placeholder);
        });

        controls.appendChild(uploadBtn);
        controls.appendChild(fileInput);

        // Avatar selection (if avatars provided)
        if (field.avatars && field.avatars.length > 0) {
            const divider = document.createElement('span');
            divider.className = 'i360-form-avatar-divider';
            divider.textContent = 'or choose';
            controls.appendChild(divider);

            const avatarGrid = document.createElement('div');
            avatarGrid.className = 'i360-form-avatar-grid';

            field.avatars.forEach(avatar => {
                const avatarOption = document.createElement('button');
                avatarOption.type = 'button';
                avatarOption.className = 'i360-form-avatar-option';
                if (initialValue === avatar.url) {
                    avatarOption.classList.add('is-selected');
                }
                avatarOption.dataset.url = avatar.url;
                avatarOption.title = avatar.name || 'Avatar';

                const avatarImg = document.createElement('img');
                avatarImg.src = avatar.url;
                avatarImg.alt = avatar.name || 'Avatar option';
                avatarOption.appendChild(avatarImg);

                avatarOption.addEventListener('click', () => {
                    this._selectAvatar(field.name, avatar.url, previewImg, placeholder, avatarGrid);
                });

                avatarGrid.appendChild(avatarOption);
            });

            controls.appendChild(avatarGrid);
        }

        // Remove button (if there's an image)
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'i360-form-avatar-remove';
        removeBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
        `;
        removeBtn.title = 'Remove avatar';
        removeBtn.style.display = initialValue ? '' : 'none';
        removeBtn.addEventListener('click', () => {
            this._clearAvatar(field.name, previewImg, placeholder, removeBtn, controls.querySelector('.i360-form-avatar-grid'));
        });

        preview.appendChild(removeBtn);

        // Hidden input to store the value
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = field.name;
        hiddenInput.value = initialValue || '';
        hiddenInput.className = 'i360-form-avatar-value';

        container.appendChild(preview);
        container.appendChild(controls);
        container.appendChild(hiddenInput);

        // Store reference to hidden input for getValue
        container._hiddenInput = hiddenInput;
        container._previewImg = previewImg;
        container._placeholder = placeholder;
        container._removeBtn = removeBtn;

        return container;
    }

    /**
     * Handle avatar file selection
     * @private
     */
    _handleAvatarFileSelect(e, fieldName, previewImg, placeholder) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            this._setAvatarValue(fieldName, dataUrl, previewImg, placeholder);
        };
        reader.readAsDataURL(file);
    }

    /**
     * Select a predefined avatar
     * @private
     */
    _selectAvatar(fieldName, url, previewImg, placeholder, avatarGrid) {
        // Update selection in grid
        if (avatarGrid) {
            avatarGrid.querySelectorAll('.i360-form-avatar-option').forEach(opt => {
                opt.classList.toggle('is-selected', opt.dataset.url === url);
            });
        }

        this._setAvatarValue(fieldName, url, previewImg, placeholder);
    }

    /**
     * Set avatar value
     * @private
     */
    _setAvatarValue(fieldName, value, previewImg, placeholder) {
        const container = this._fieldElements[fieldName];
        if (!container) return;

        const hiddenInput = container._hiddenInput || container.querySelector('.i360-form-avatar-value');
        const removeBtn = container._removeBtn || container.querySelector('.i360-form-avatar-remove');

        if (hiddenInput) {
            hiddenInput.value = value;
        }

        previewImg.src = value;
        previewImg.style.display = '';
        placeholder.style.display = 'none';

        if (removeBtn) {
            removeBtn.style.display = '';
        }

        this._clearFieldError(fieldName);
    }

    /**
     * Clear avatar value
     * @private
     */
    _clearAvatar(fieldName, previewImg, placeholder, removeBtn, avatarGrid) {
        const container = this._fieldElements[fieldName];
        if (!container) return;

        const hiddenInput = container._hiddenInput || container.querySelector('.i360-form-avatar-value');

        if (hiddenInput) {
            hiddenInput.value = '';
        }

        previewImg.src = '';
        previewImg.style.display = 'none';
        placeholder.style.display = '';

        if (removeBtn) {
            removeBtn.style.display = 'none';
        }

        // Clear selection in grid
        if (avatarGrid) {
            avatarGrid.querySelectorAll('.i360-form-avatar-option').forEach(opt => {
                opt.classList.remove('is-selected');
            });
        }
    }

    /**
     * Escape HTML
     * @private
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
     * Get form values
     * @returns {Object}
     */
    getValues() {
        const values = {};

        this.formOptions.fields.forEach(field => {
            const el = this._fieldElements[field.name];
            if (!el) return;

            if (field.type === 'checkbox') {
                values[field.name] = el.checked;
            } else if (field.type === 'radio') {
                const checked = el.querySelector('input:checked');
                values[field.name] = checked ? checked.value : null;
            } else if (field.type === 'number') {
                values[field.name] = el.value ? parseFloat(el.value) : null;
            } else if (field.type === 'avatar') {
                const hiddenInput = el._hiddenInput || el.querySelector('.i360-form-avatar-value');
                values[field.name] = hiddenInput ? hiddenInput.value : '';
            } else if (field.type === 'checkbox-group') {
                const checked = el.querySelectorAll('input:checked');
                values[field.name] = Array.from(checked).map(cb => cb.value);
            } else {
                values[field.name] = el.value;
            }
        });

        return values;
    }

    /**
     * Set form values
     * @param {Object} values
     */
    setValues(values) {
        Object.entries(values).forEach(([name, value]) => {
            const el = this._fieldElements[name];
            if (!el) return;

            const field = this.formOptions.fields.find(f => f.name === name);
            if (!field) return;

            if (field.type === 'checkbox') {
                el.checked = !!value;
            } else if (field.type === 'radio') {
                const radio = el.querySelector(`input[value="${value}"]`);
                if (radio) radio.checked = true;
            } else {
                el.value = value ?? '';
            }
        });
    }

    /**
     * Validate form
     * @private
     * @returns {boolean}
     */
    _validate() {
        const values = this.getValues();
        let isValid = true;

        // Clear all errors
        this.formOptions.fields.forEach(field => {
            this._clearFieldError(field.name);
        });

        // Field-level validation
        this.formOptions.fields.forEach(field => {
            const value = values[field.name];
            const el = this._fieldElements[field.name];

            // Required check
            if (field.required) {
                const isEmpty = value === '' || value === null || value === undefined ||
                    (field.type === 'checkbox' && !value);
                if (isEmpty) {
                    this._showFieldError(field.name, field.requiredMessage || `${field.label || field.name} is required`);
                    isValid = false;
                    return;
                }
            }

            // Field-specific validation
            if (field.validate && value) {
                const result = field.validate(value, values);
                if (result !== true) {
                    this._showFieldError(field.name, result || 'Invalid value');
                    isValid = false;
                    return;
                }
            }

            // HTML5 validation
            if (el && el.validity && !el.validity.valid) {
                this._showFieldError(field.name, el.validationMessage || 'Invalid value');
                isValid = false;
            }
        });

        // Form-level validation
        if (isValid && typeof this.formOptions.validate === 'function') {
            const result = this.formOptions.validate(values);
            // Valid results: true, null, undefined, or empty object
            // Invalid results: string (error message) or object with field errors
            if (result !== true && result !== null && result !== undefined) {
                if (typeof result === 'string') {
                    // Show as general error on first field
                    const firstField = this.formOptions.fields[0];
                    if (firstField) {
                        this._showFieldError(firstField.name, result);
                    }
                    isValid = false;
                } else if (typeof result === 'object' && Object.keys(result).length > 0) {
                    Object.entries(result).forEach(([fieldName, error]) => {
                        this._showFieldError(fieldName, error);
                    });
                    isValid = false;
                }
            }
        }

        return isValid;
    }

    /**
     * Show field error
     * @private
     */
    _showFieldError(fieldName, message) {
        const errorEl = this._errorElements[fieldName];
        const fieldEl = this._fieldElements[fieldName];

        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = '';
        }

        if (fieldEl && fieldEl.classList) {
            fieldEl.classList.add('has-error');
        }
    }

    /**
     * Clear field error
     * @private
     */
    _clearFieldError(fieldName) {
        const errorEl = this._errorElements[fieldName];
        const fieldEl = this._fieldElements[fieldName];

        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }

        if (fieldEl && fieldEl.classList) {
            fieldEl.classList.remove('has-error');
        }
    }

    /**
     * Handle form submit
     * @private
     */
    _handleSubmit(e) {
        e.preventDefault();

        if (!this._validate()) {
            // Focus first error field
            const firstError = this.elements.form.querySelector('.has-error');
            if (firstError) firstError.focus();
            return;
        }

        this._submitted = true;
        this.close(this.getValues());
    }

    /**
     * Handle cancel
     * @private
     */
    _handleCancel() {
        this._submitted = false;
        this.close(null);
    }

    /**
     * Override close
     */
    async close(result) {
        await super.close(result);

        if (this._submitted) {
            if (typeof this.formOptions.onSubmit === 'function') {
                this.formOptions.onSubmit(result);
            }
        } else {
            if (typeof this.formOptions.onCancel === 'function') {
                this.formOptions.onCancel();
            }
        }
    }

    /**
     * Focus a specific field
     * @param {string} fieldName
     */
    focusField(fieldName) {
        const el = this._fieldElements[fieldName];
        if (el && el.focus) {
            el.focus();
        }
    }

    /**
     * Disable/enable submit button
     * @param {boolean} disabled
     */
    setSubmitDisabled(disabled) {
        if (this.elements.submitButton) {
            this.elements.submitButton.disabled = disabled;
        }
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormModal;
}
