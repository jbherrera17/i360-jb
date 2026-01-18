/**
 * ModalBase - ModalService
 * Abstract base class for all modal types
 * @version 1.0.0
 */

class ModalBase {
    /**
     * Default options for all modals
     * @static
     */
    static defaults = {
        title: '',
        content: '',
        closable: true,
        closeOnEscape: true,
        closeOnOverlayClick: true,
        draggable: true,
        resizable: false,
        maximizable: false,
        persist: false,
        modal: true, // Show overlay
        width: 'auto',
        height: 'auto',
        minSize: { width: 300, height: 200 },
        maxSize: null, // Will use viewport
        position: 'center', // 'center', {x, y}, or 'cascade'
        className: '',
        zIndex: null, // Managed by ModalService
        animate: true,
        focusTrap: true,
        ariaLabel: null,
        ariaDescribedBy: null
    };

    /**
     * Create a new modal instance
     * @param {Object} options - Modal configuration
     */
    constructor(options = {}) {
        this.id = options.id || `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.options = { ...ModalBase.defaults, ...options };

        this.state = {
            isOpen: false,
            isDragging: false,
            isResizing: false,
            isMaximized: false,
            position: { x: 0, y: 0 },
            size: { width: 0, height: 0 }
        };

        this.elements = {};
        this._eventListeners = new Map();
        this._boundHandlers = {};

        // Will be set by ModalService
        this._zIndex = options.zIndex || 1000;
    }

    /**
     * Initialize the modal (create DOM elements)
     * @returns {ModalBase}
     */
    init() {
        this._createElements();
        this._bindEvents();
        this._initMixins();
        return this;
    }

    /**
     * Create modal DOM structure
     * @protected
     */
    _createElements() {
        // Create overlay
        if (this.options.modal) {
            this.elements.overlay = document.createElement('div');
            this.elements.overlay.className = 'i360-modal-overlay';
            this.elements.overlay.setAttribute('aria-hidden', 'true');
        }

        // Create container
        this.elements.container = document.createElement('div');
        this.elements.container.className = `i360-modal-container ${this.options.className}`.trim();
        this.elements.container.id = this.id;
        this.elements.container.setAttribute('role', 'dialog');
        this.elements.container.setAttribute('aria-modal', 'true');

        if (this.options.ariaLabel) {
            this.elements.container.setAttribute('aria-label', this.options.ariaLabel);
        }

        // Set initial size
        if (this.options.width !== 'auto') {
            this.elements.container.style.width = typeof this.options.width === 'number'
                ? `${this.options.width}px`
                : this.options.width;
        }
        if (this.options.height !== 'auto') {
            this.elements.container.style.height = typeof this.options.height === 'number'
                ? `${this.options.height}px`
                : this.options.height;
        }

        // Create header
        this.elements.header = document.createElement('div');
        this.elements.header.className = 'i360-modal-header';

        // Create title
        this.elements.title = document.createElement('h2');
        this.elements.title.className = 'i360-modal-title';
        this.elements.title.id = `${this.id}-title`;
        this.elements.title.textContent = this.options.title;
        this.elements.container.setAttribute('aria-labelledby', `${this.id}-title`);

        // Create header actions container
        this.elements.headerActions = document.createElement('div');
        this.elements.headerActions.className = 'i360-modal-header-actions';

        // Create close button
        if (this.options.closable) {
            this.elements.closeButton = document.createElement('button');
            this.elements.closeButton.type = 'button';
            this.elements.closeButton.className = 'i360-modal-close';
            this.elements.closeButton.setAttribute('aria-label', 'Close');
            this.elements.closeButton.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            `;
            this.elements.headerActions.appendChild(this.elements.closeButton);
        }

        this.elements.header.appendChild(this.elements.title);
        this.elements.header.appendChild(this.elements.headerActions);

        // Create body
        this.elements.body = document.createElement('div');
        this.elements.body.className = 'i360-modal-body';
        this.elements.body.id = `${this.id}-body`;

        if (this.options.ariaDescribedBy) {
            this.elements.container.setAttribute('aria-describedby', this.options.ariaDescribedBy);
        } else {
            this.elements.container.setAttribute('aria-describedby', `${this.id}-body`);
        }

        // Set content
        if (typeof this.options.content === 'string') {
            this.elements.body.innerHTML = this.options.content;
        } else if (this.options.content instanceof HTMLElement) {
            this.elements.body.appendChild(this.options.content);
        }

        // Create footer (optional, can be added by subclasses or via options)
        this.elements.footer = document.createElement('div');
        this.elements.footer.className = 'i360-modal-footer';

        // Handle footer option - populate if provided
        if (this.options.footer) {
            if (typeof this.options.footer === 'string') {
                this.elements.footer.innerHTML = this.options.footer;
            } else if (this.options.footer instanceof HTMLElement) {
                this.elements.footer.appendChild(this.options.footer);
            }
            this.elements.footer.style.display = ''; // Show footer
        } else {
            this.elements.footer.style.display = 'none'; // Hidden by default
        }

        // Assemble
        this.elements.container.appendChild(this.elements.header);
        this.elements.container.appendChild(this.elements.body);
        this.elements.container.appendChild(this.elements.footer);
    }

    /**
     * Bind event handlers
     * @protected
     */
    _bindEvents() {
        // Close button
        if (this.elements.closeButton) {
            this._boundHandlers.close = () => this.close();
            this.elements.closeButton.addEventListener('click', this._boundHandlers.close);
        }

        // Handle data-action="close" buttons in footer
        if (this.elements.footer) {
            this._boundHandlers.footerClose = (e) => {
                if (e.target.closest('[data-action="close"]')) {
                    this.close();
                }
            };
            this.elements.footer.addEventListener('click', this._boundHandlers.footerClose);
        }

        // Click on modal container to bring to front (for stacking modals)
        this._boundHandlers.containerClick = (e) => {
            // Only bring to front, don't interfere with other interactions
            this.bringToFront();
        };
        this.elements.container.addEventListener('mousedown', this._boundHandlers.containerClick);

        // Overlay click
        if (this.elements.overlay && this.options.closeOnOverlayClick) {
            this._boundHandlers.overlayClick = (e) => {
                if (e.target === this.elements.overlay) {
                    this.close();
                }
            };
            this.elements.overlay.addEventListener('click', this._boundHandlers.overlayClick);
        }

        // Escape key
        if (this.options.closeOnEscape) {
            this._boundHandlers.keydown = (e) => {
                if (e.key === 'Escape' && this.state.isOpen && !this.state.isDragging && !this.state.isResizing) {
                    this.close();
                }
            };
            document.addEventListener('keydown', this._boundHandlers.keydown);
        }

        // Focus trap
        if (this.options.focusTrap) {
            this._boundHandlers.focusTrap = (e) => this._handleFocusTrap(e);
            this.elements.container.addEventListener('keydown', this._boundHandlers.focusTrap);
        }
    }

    /**
     * Initialize mixins based on options
     * @protected
     */
    _initMixins() {
        // Apply mixins
        if (typeof DraggableMixin !== 'undefined') {
            Object.assign(this, DraggableMixin);
            this.initDraggable();
        }

        if (typeof ResizableMixin !== 'undefined') {
            Object.assign(this, ResizableMixin);
            this.initResizable();
        }

        if (typeof FullscreenMixin !== 'undefined') {
            Object.assign(this, FullscreenMixin);
            this.initFullscreen();
        }

        if (typeof PersistenceMixin !== 'undefined') {
            Object.assign(this, PersistenceMixin);
            this.initPersistence();
        }
    }

    /**
     * Handle focus trap within modal
     * @protected
     */
    _handleFocusTrap(e) {
        if (e.key !== 'Tab') return;

        const focusable = this.elements.container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusable.length === 0) return;

        const firstFocusable = focusable[0];
        const lastFocusable = focusable[focusable.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            }
        } else {
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    }

    /**
     * Open the modal
     * @returns {Promise<void>}
     */
    async open() {
        if (this.state.isOpen) return;

        // Emit beforeOpen event
        const cancelled = !this.emit('beforeOpen', { modal: this });
        if (cancelled) return;

        // Add to DOM
        const container = this.options.appendTo || document.body;

        if (this.elements.overlay) {
            container.appendChild(this.elements.overlay);
        }
        container.appendChild(this.elements.container);

        // Set z-index
        this.setZIndex(this._zIndex);

        // Position modal
        this._position();

        // Trigger animation
        if (this.options.animate) {
            await this._animateIn();
        } else {
            this.elements.container.classList.add('is-open');
            if (this.elements.overlay) {
                this.elements.overlay.classList.add('is-open');
            }
        }

        this.state.isOpen = true;

        // Focus first focusable element
        this._setInitialFocus();

        // Store previous active element for restore on close
        this._previousActiveElement = document.activeElement;

        // Call onOpen callback if provided
        if (typeof this.options.onOpen === 'function') {
            try {
                this.options.onOpen(this);
            } catch (e) {
                console.error('Error in modal onOpen callback:', e);
            }
        }

        this.emit('open', { modal: this });
    }

    /**
     * Close the modal
     * @param {*} result - Optional result to pass to close handlers
     * @returns {Promise<void>}
     */
    async close(result) {
        console.log('[ModalBase] close() called, isOpen:', this.state.isOpen);
        if (!this.state.isOpen) {
            console.log('[ModalBase] Already closed, returning early');
            return;
        }

        // Emit beforeClose event
        const cancelled = !this.emit('beforeClose', { modal: this, result });
        if (cancelled) {
            console.log('[ModalBase] Close was cancelled by beforeClose handler');
            return;
        }

        // Trigger animation
        if (this.options.animate) {
            console.log('[ModalBase] Starting animation...');
            await this._animateOut();
            console.log('[ModalBase] Animation complete');
        }

        // Remove from DOM
        console.log('[ModalBase] Removing elements from DOM...');
        if (this.elements.overlay) {
            this.elements.overlay.remove();
            console.log('[ModalBase] Overlay removed');
        }
        this.elements.container.remove();
        console.log('[ModalBase] Container removed');

        this.state.isOpen = false;

        // Restore focus
        if (this._previousActiveElement && this._previousActiveElement.focus) {
            this._previousActiveElement.focus();
        }

        console.log('[ModalBase] Emitting close event');
        this.emit('close', { modal: this, result });
    }

    /**
     * Position the modal
     * @protected
     */
    _position() {
        const container = this.elements.container;
        const position = this.options.position;

        if (position === 'center') {
            container.style.left = '50%';
            container.style.top = '50%';
            container.style.transform = 'translate(-50%, -50%)';
        } else if (typeof position === 'object' && position.x !== undefined) {
            container.style.left = `${position.x}px`;
            container.style.top = `${position.y}px`;
            container.style.transform = 'none';
            this.state.position = position;
        }
        // 'cascade' position is handled by ModalService
    }

    /**
     * Animate modal in
     * @protected
     * @returns {Promise<void>}
     */
    _animateIn() {
        return new Promise(resolve => {
            // Guard against missing elements
            if (!this.elements.container) {
                console.warn('[ModalBase] _animateIn called but container is missing');
                resolve();
                return;
            }

            if (this.elements.overlay) {
                this.elements.overlay.classList.add('is-open');
            }

            requestAnimationFrame(() => {
                this.elements.container.classList.add('is-open');

                const onEnd = () => {
                    this.elements.container.removeEventListener('transitionend', onEnd);
                    resolve();
                };

                // Use transitionend since we use CSS transitions
                this.elements.container.addEventListener('transitionend', onEnd);

                // Fallback if no transition
                setTimeout(resolve, 300);
            });
        });
    }

    /**
     * Animate modal out
     * @protected
     * @returns {Promise<void>}
     */
    _animateOut() {
        return new Promise(resolve => {
            // Guard against missing elements
            if (!this.elements.container) {
                console.warn('[ModalBase] _animateOut called but container is missing');
                resolve();
                return;
            }

            this.elements.container.classList.remove('is-open');
            this.elements.container.classList.add('is-closing');

            if (this.elements.overlay) {
                this.elements.overlay.classList.remove('is-open');
                this.elements.overlay.classList.add('is-closing');
            }

            // Use transitionend instead of animationend since we use CSS transitions
            const onEnd = () => {
                this.elements.container.removeEventListener('transitionend', onEnd);
                this.elements.container.classList.remove('is-closing');
                if (this.elements.overlay) {
                    this.elements.overlay.classList.remove('is-closing');
                }
                resolve();
            };

            this.elements.container.addEventListener('transitionend', onEnd);

            // Fallback if no transition or it doesn't fire
            setTimeout(resolve, 250);
        });
    }

    /**
     * Set initial focus
     * @protected
     */
    _setInitialFocus() {
        const autofocus = this.elements.container.querySelector('[autofocus]');
        if (autofocus) {
            autofocus.focus();
            return;
        }

        const firstFocusable = this.elements.container.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) {
            firstFocusable.focus();
        } else {
            this.elements.container.focus();
        }
    }

    /**
     * Set z-index
     * @param {number} zIndex
     */
    setZIndex(zIndex) {
        this._zIndex = zIndex;
        this.elements.container.style.zIndex = zIndex;
        if (this.elements.overlay) {
            this.elements.overlay.style.zIndex = zIndex - 1;
        }
    }

    /**
     * Bring modal to front (to be called by ModalService)
     */
    bringToFront() {
        if (typeof window.ModalService !== 'undefined') {
            window.ModalService.bringToFront(this);
        }
    }

    /**
     * Set modal title
     * @param {string} title
     */
    setTitle(title) {
        this.options.title = title;
        if (this.elements.title) {
            this.elements.title.textContent = title;
        }
    }

    /**
     * Set modal content
     * @param {string|HTMLElement} content
     */
    setContent(content) {
        this.options.content = content;
        if (this.elements.body) {
            if (typeof content === 'string') {
                this.elements.body.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                this.elements.body.innerHTML = '';
                this.elements.body.appendChild(content);
            }
        }
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this._eventListeners.has(event)) {
            this._eventListeners.set(event, []);
        }
        this._eventListeners.get(event).push(callback);

        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     */
    off(event, callback) {
        if (!this._eventListeners.has(event)) return;

        const listeners = this._eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     * @returns {boolean} False if any handler called preventDefault
     */
    emit(event, data = {}) {
        if (!this._eventListeners.has(event)) return true;

        let defaultPrevented = false;
        const eventObj = {
            ...data,
            type: event,
            preventDefault: () => { defaultPrevented = true; }
        };

        this._eventListeners.get(event).forEach(callback => {
            try {
                callback(eventObj);
            } catch (e) {
                console.error(`Error in modal event handler for ${event}:`, e);
            }
        });

        return !defaultPrevented;
    }

    /**
     * Destroy the modal and clean up
     */
    destroy() {
        // Close if open
        if (this.state.isOpen) {
            this.elements.overlay?.remove();
            this.elements.container.remove();
        }

        // Remove event listeners
        if (this.elements.closeButton) {
            this.elements.closeButton.removeEventListener('click', this._boundHandlers.close);
        }
        if (this.elements.footer && this._boundHandlers.footerClose) {
            this.elements.footer.removeEventListener('click', this._boundHandlers.footerClose);
        }
        if (this.elements.container && this._boundHandlers.containerClick) {
            this.elements.container.removeEventListener('mousedown', this._boundHandlers.containerClick);
        }
        if (this.elements.overlay) {
            this.elements.overlay.removeEventListener('click', this._boundHandlers.overlayClick);
        }
        if (this._boundHandlers.keydown) {
            document.removeEventListener('keydown', this._boundHandlers.keydown);
        }

        // Destroy mixins
        if (typeof this.destroyDraggable === 'function') {
            this.destroyDraggable();
        }
        if (typeof this.destroyResizable === 'function') {
            this.destroyResizable();
        }
        if (typeof this.destroyFullscreen === 'function') {
            this.destroyFullscreen();
        }
        if (typeof this.destroyPersistence === 'function') {
            this.destroyPersistence();
        }

        // Clear listeners
        this._eventListeners.clear();

        // Clear references
        this.elements = {};
        this._boundHandlers = {};

        this.emit('destroy', { modal: this });
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalBase;
}
