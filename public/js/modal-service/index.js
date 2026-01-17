/**
 * ModalService - Central modal management service for Insight 360
 *
 * Provides unified modal management with:
 * - Z-index stack management
 * - Cascade positioning
 * - Focus management
 * - Keyboard navigation
 * - Factory methods for common modal types
 *
 * @version 1.0.0
 */

const ModalService = (function() {
    'use strict';

    // Private state
    let _modals = new Map();
    let _zIndexBase = 1000;
    let _zIndexStep = 10;
    let _cascadeOffset = 30;
    let _cascadeCount = 0;
    let _initialized = false;

    /**
     * Initialize the service
     * @private
     */
    function _init() {
        if (_initialized) return;

        // Global escape key handler for topmost modal
        document.addEventListener('keydown', _handleGlobalKeydown);

        // Handle window resize - reposition modals if needed
        window.addEventListener('resize', _handleWindowResize);

        _initialized = true;
    }

    /**
     * Handle global keydown events
     * @private
     */
    function _handleGlobalKeydown(e) {
        if (e.key === 'Escape') {
            const topModal = _getTopModal();
            if (topModal && topModal.options.closeOnEscape && topModal.state.isOpen) {
                // Let the modal handle its own escape, but prevent bubbling
                // Modal's own handler will close it
            }
        }
    }

    /**
     * Handle window resize
     * @private
     */
    function _handleWindowResize() {
        _modals.forEach(modal => {
            if (modal.state.isOpen && !modal.state.isMaximized) {
                // Constrain modals to viewport on resize
                _constrainToViewport(modal);
            }
        });
    }

    /**
     * Constrain a modal to the viewport
     * @private
     */
    function _constrainToViewport(modal) {
        if (!modal.elements.container) return;

        const container = modal.elements.container;
        const rect = container.getBoundingClientRect();
        const padding = 10;
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        let needsUpdate = false;
        let newLeft = rect.left;
        let newTop = rect.top;

        // Check right edge
        if (rect.right > viewport.width - padding) {
            newLeft = viewport.width - rect.width - padding;
            needsUpdate = true;
        }

        // Check bottom edge
        if (rect.bottom > viewport.height - padding) {
            newTop = viewport.height - rect.height - padding;
            needsUpdate = true;
        }

        // Check left edge
        if (newLeft < padding) {
            newLeft = padding;
            needsUpdate = true;
        }

        // Check top edge
        if (newTop < padding) {
            newTop = padding;
            needsUpdate = true;
        }

        if (needsUpdate) {
            container.style.left = `${newLeft}px`;
            container.style.top = `${newTop}px`;
            container.style.transform = 'none';
            modal.state.position = { x: newLeft, y: newTop };
        }
    }

    /**
     * Get the topmost modal
     * @private
     * @returns {ModalBase|null}
     */
    function _getTopModal() {
        let topModal = null;
        let highestZ = -1;

        _modals.forEach(modal => {
            if (modal.state.isOpen && modal._zIndex > highestZ) {
                highestZ = modal._zIndex;
                topModal = modal;
            }
        });

        return topModal;
    }

    /**
     * Calculate next z-index
     * @private
     * @returns {number}
     */
    function _getNextZIndex() {
        let maxZ = _zIndexBase;

        _modals.forEach(modal => {
            if (modal._zIndex >= maxZ) {
                maxZ = modal._zIndex + _zIndexStep;
            }
        });

        return maxZ;
    }

    /**
     * Calculate cascade position
     * @private
     * @returns {{x: number, y: number}}
     */
    function _getCascadePosition() {
        const offset = (_cascadeCount % 10) * _cascadeOffset;
        _cascadeCount++;

        return {
            x: 50 + offset,
            y: 50 + offset
        };
    }

    // Public API
    return {
        /**
         * Register a modal with the service
         * @param {ModalBase} modal - Modal instance
         * @returns {ModalBase}
         */
        register(modal) {
            _init();

            if (!modal.id) {
                modal.id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }

            _modals.set(modal.id, modal);

            // Set z-index
            modal._zIndex = _getNextZIndex();

            // Handle cascade positioning
            if (modal.options.position === 'cascade') {
                modal.options.position = _getCascadePosition();
            }

            // Listen for close to potentially unregister
            modal.on('close', () => {
                if (modal.options.destroyOnClose !== false) {
                    this.unregister(modal.id);
                }
            });

            return modal;
        },

        /**
         * Unregister a modal
         * @param {string} modalId - Modal ID
         */
        unregister(modalId) {
            const modal = _modals.get(modalId);
            if (modal) {
                modal.destroy();
                _modals.delete(modalId);
            }
        },

        /**
         * Get a modal by ID
         * @param {string} modalId - Modal ID
         * @returns {ModalBase|undefined}
         */
        get(modalId) {
            return _modals.get(modalId);
        },

        /**
         * Get all open modals
         * @returns {ModalBase[]}
         */
        getOpenModals() {
            return Array.from(_modals.values()).filter(m => m.state.isOpen);
        },

        /**
         * Bring a modal to the front
         * @param {ModalBase|string} modalOrId - Modal instance or ID
         */
        bringToFront(modalOrId) {
            const modal = typeof modalOrId === 'string'
                ? _modals.get(modalOrId)
                : modalOrId;

            if (!modal) return;

            const newZ = _getNextZIndex();
            modal.setZIndex(newZ);
        },

        /**
         * Close all open modals
         * @param {boolean} force - Close even non-closable modals
         */
        closeAll(force = false) {
            _modals.forEach(modal => {
                if (modal.state.isOpen && (force || modal.options.closable)) {
                    modal.close();
                }
            });
        },

        /**
         * Close the topmost modal
         */
        closeTop() {
            const topModal = _getTopModal();
            if (topModal && topModal.options.closable) {
                topModal.close();
            }
        },

        // ============================================
        // Factory Methods for Common Modal Types
        // ============================================

        /**
         * Show an alert modal
         * @param {Object} options - Alert options
         * @param {string} options.title - Alert title
         * @param {string} options.message - Alert message
         * @param {string} [options.buttonText='OK'] - Button text
         * @param {string} [options.type='info'] - Alert type: info, success, warning, error
         * @returns {Promise<void>}
         */
        alert(options) {
            return new Promise(resolve => {
                const modal = new AlertModal({
                    title: options.title || 'Alert',
                    message: options.message,
                    buttonText: options.buttonText || 'OK',
                    type: options.type || 'info',
                    onClose: resolve
                });

                this.register(modal);
                modal.init().open();
            });
        },

        /**
         * Show a confirmation modal
         * @param {Object} options - Confirm options
         * @param {string} options.title - Confirm title
         * @param {string} options.message - Confirm message
         * @param {string} [options.confirmText='Confirm'] - Confirm button text
         * @param {string} [options.cancelText='Cancel'] - Cancel button text
         * @param {string} [options.type='info'] - Type: info, warning, danger
         * @returns {Promise<boolean>}
         */
        confirm(options) {
            return new Promise(resolve => {
                const modal = new ConfirmModal({
                    title: options.title || 'Confirm',
                    message: options.message,
                    confirmText: options.confirmText || 'Confirm',
                    cancelText: options.cancelText || 'Cancel',
                    type: options.type || 'info',
                    onConfirm: () => resolve(true),
                    onCancel: () => resolve(false)
                });

                this.register(modal);
                modal.init().open();
            });
        },

        /**
         * Show a prompt modal
         * @param {Object} options - Prompt options
         * @param {string} options.title - Prompt title
         * @param {string} options.message - Prompt message
         * @param {string} [options.placeholder] - Input placeholder
         * @param {string} [options.defaultValue] - Default input value
         * @param {string} [options.inputType='text'] - Input type
         * @param {string} [options.confirmText='OK'] - Confirm button text
         * @param {string} [options.cancelText='Cancel'] - Cancel button text
         * @returns {Promise<string|null>}
         */
        prompt(options) {
            return new Promise(resolve => {
                const modal = new PromptModal({
                    title: options.title || 'Input',
                    message: options.message || '',
                    placeholder: options.placeholder || '',
                    defaultValue: options.defaultValue || '',
                    inputType: options.inputType || 'text',
                    confirmText: options.confirmText || 'OK',
                    cancelText: options.cancelText || 'Cancel',
                    onConfirm: (value) => resolve(value),
                    onCancel: () => resolve(null)
                });

                this.register(modal);
                modal.init().open();
            });
        },

        /**
         * Show a form modal
         * @param {Object} options - Form options
         * @param {string} options.title - Form title
         * @param {Array} options.fields - Field definitions
         * @param {string} [options.submitText='Submit'] - Submit button text
         * @param {string} [options.cancelText='Cancel'] - Cancel button text
         * @param {Function} [options.validate] - Custom validation function
         * @returns {Promise<Object|null>} Form values or null if cancelled
         */
        form(options) {
            return new Promise(resolve => {
                const modal = new FormModal({
                    title: options.title || 'Form',
                    fields: options.fields || [],
                    submitText: options.submitText || 'Submit',
                    cancelText: options.cancelText || 'Cancel',
                    validate: options.validate,
                    width: options.width,
                    height: options.height,
                    onSubmit: (values) => resolve(values),
                    onCancel: () => resolve(null)
                });

                this.register(modal);
                modal.init().open();
            });
        },

        /**
         * Create a content modal
         * @param {Object} options - Content options
         * @param {string} options.title - Modal title
         * @param {string} options.content - Content to display
         * @param {string} [options.contentType='html'] - Content type: html, markdown, code, image, video
         * @returns {ContentModal}
         */
        content(options) {
            const modal = new ContentModal({
                title: options.title || '',
                content: options.content || '',
                contentType: options.contentType || 'html',
                language: options.language,
                copyable: options.copyable,
                imageAlt: options.imageAlt,
                autoplay: options.autoplay,
                loop: options.loop,
                muted: options.muted,
                controls: options.controls,
                poster: options.poster,
                width: options.width,
                height: options.height,
                resizable: options.resizable
            });

            this.register(modal);
            modal.init().open();
            return modal;
        },

        /**
         * Create a chat modal
         * @param {Object} options - Chat options
         * @returns {ChatModal}
         */
        chat(options) {
            const modal = new ChatModal(options);
            this.register(modal);
            modal.init().open();
            return modal;
        },

        /**
         * Create an agent modal
         * @param {Object} options - Agent options
         * @returns {AgentModal}
         */
        agent(options) {
            const modal = new AgentModal(options);
            this.register(modal);
            modal.init().open();
            return modal;
        },

        /**
         * Create a custom modal
         * @param {Object} options - Modal options
         * @returns {ModalBase}
         */
        create(options) {
            const modal = new ModalBase(options);
            this.register(modal);
            return modal.init();
        },

        /**
         * Show a loading modal
         * @param {Object} options - Loading options
         * @param {string} [options.message='Loading...'] - Loading message
         * @returns {ModalBase} - Modal instance (call .close() to dismiss)
         */
        loading(options = {}) {
            const modal = new ModalBase({
                title: '',
                content: `
                    <div class="i360-modal-loading">
                        <img src="/assets/loading-spinner.svg" alt="Loading" class="i360-modal-spinner-svg" />
                        <p>${options.message || 'Loading...'}</p>
                    </div>
                `,
                closable: false,
                closeOnEscape: false,
                closeOnOverlayClick: false,
                draggable: false,
                className: 'i360-modal-loading-container',
                width: 220
            });

            this.register(modal);
            modal.init().open();
            return modal;
        },

        /**
         * Show a toast notification (non-modal)
         * @param {Object} options - Toast options
         * @param {string} options.message - Toast message
         * @param {string} [options.type='info'] - Toast type: info, success, warning, error
         * @param {number} [options.duration=3000] - Duration in ms
         */
        toast(options) {
            const type = options.type || 'info';
            const duration = options.duration || 3000;

            const toast = document.createElement('div');
            toast.className = `i360-toast i360-toast-${type}`;
            toast.textContent = options.message;

            // Ensure container exists
            let container = document.querySelector('.i360-toast-container');
            if (!container) {
                container = document.createElement('div');
                container.className = 'i360-toast-container';
                document.body.appendChild(container);
            }

            container.appendChild(toast);

            // Animate in
            requestAnimationFrame(() => {
                toast.classList.add('is-visible');
            });

            // Auto dismiss
            setTimeout(() => {
                toast.classList.remove('is-visible');
                toast.classList.add('is-hiding');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        },

        // ============================================
        // Helper Methods
        // ============================================

        /**
         * Show a success alert
         * @param {string} message - Success message
         * @param {string} [title='Success'] - Alert title
         * @returns {Promise<void>}
         */
        success(message, title = 'Success') {
            return this.alert({ title, message, type: 'success' });
        },

        /**
         * Show an error alert
         * @param {string} message - Error message
         * @param {string} [title='Error'] - Alert title
         * @returns {Promise<void>}
         */
        error(message, title = 'Error') {
            return this.alert({ title, message, type: 'error' });
        },

        /**
         * Show a warning alert
         * @param {string} message - Warning message
         * @param {string} [title='Warning'] - Alert title
         * @returns {Promise<void>}
         */
        warning(message, title = 'Warning') {
            return this.alert({ title, message, type: 'warning' });
        },

        /**
         * Show an info alert
         * @param {string} message - Info message
         * @param {string} [title='Info'] - Alert title
         * @returns {Promise<void>}
         */
        info(message, title = 'Info') {
            return this.alert({ title, message, type: 'info' });
        },

        /**
         * Show a danger confirmation
         * @param {string} message - Confirmation message
         * @param {string} [title='Confirm'] - Confirm title
         * @returns {Promise<boolean>}
         */
        confirmDanger(message, title = 'Confirm') {
            return this.confirm({ title, message, type: 'danger' });
        },

        // ============================================
        // Configuration
        // ============================================

        /**
         * Configure service options
         * @param {Object} config - Configuration options
         */
        configure(config) {
            if (config.zIndexBase !== undefined) _zIndexBase = config.zIndexBase;
            if (config.zIndexStep !== undefined) _zIndexStep = config.zIndexStep;
            if (config.cascadeOffset !== undefined) _cascadeOffset = config.cascadeOffset;
        },

        /**
         * Reset cascade counter
         */
        resetCascade() {
            _cascadeCount = 0;
        }
    };
})();

// Expose globally
if (typeof window !== 'undefined') {
    window.ModalService = ModalService;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalService;
}
