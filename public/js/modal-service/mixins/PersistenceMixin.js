/**
 * PersistenceMixin - ModalService
 * Adds state persistence (position/size) to modals using localStorage
 * @version 1.0.0
 */

const PersistenceMixin = {
    /**
     * Initialize persistence functionality
     * Call this in the modal's init method after elements are created
     */
    initPersistence() {
        if (!this.options.persist) return;

        this._persistenceKey = this._getPersistenceKey();
        this._persistedState = this._loadState();

        // If we have persisted state, set it as the initial position option
        // This ensures _position() uses the saved position instead of 'center'
        if (this._persistedState && this._persistedState.position) {
            const { x, y } = this._persistedState.position;
            const viewport = { width: window.innerWidth, height: window.innerHeight };

            // Only use persisted position if it's still within viewport
            if (x >= 0 && x < viewport.width - 100 && y >= 0 && y < viewport.height - 100) {
                this.options.position = { x, y };
                this.state.position = { x, y };
            }
        }

        // Apply persisted size to container before it opens
        if (this._persistedState && this._persistedState.size && this.elements.container) {
            const { width, height } = this._persistedState.size;
            const minSize = this.options.minSize || { width: 300, height: 200 };
            const maxSize = this.options.maxSize || {
                width: window.innerWidth - 40,
                height: window.innerHeight - 40
            };

            if (width >= minSize.width && width <= maxSize.width) {
                this.elements.container.style.width = `${width}px`;
                this.state.size = this.state.size || {};
                this.state.size.width = width;
            }
            if (height >= minSize.height && height <= maxSize.height) {
                this.elements.container.style.height = `${height}px`;
                this.state.size = this.state.size || {};
                this.state.size.height = height;
            }
        }

        // Listen for window unload to save state
        this._onBeforeUnload = this._saveState.bind(this);
        window.addEventListener('beforeunload', this._onBeforeUnload);

        // Handle maximized state after modal opens
        this.on('open', () => {
            if (this._persistedState && this._persistedState.isMaximized && typeof this.maximize === 'function') {
                setTimeout(() => this.maximize(), 0);
            }
        });

        // Save state when modal closes
        this.on('beforeClose', () => {
            this._saveState();
        });
    },

    /**
     * Clean up persistence handlers
     */
    destroyPersistence() {
        if (this._onBeforeUnload) {
            window.removeEventListener('beforeunload', this._onBeforeUnload);
        }
    },

    /**
     * Get the localStorage key for this modal
     * @private
     * @returns {string}
     */
    _getPersistenceKey() {
        const prefix = 'i360-modal-state-';
        const modalId = this.options.persistKey || this.id || this.options.id;
        return prefix + modalId;
    },

    /**
     * Save current state to localStorage
     * @private
     */
    _saveState() {
        if (!this.options.persist || !this._persistenceKey) return;
        if (!this.elements.container) return;

        try {
            // Always get position/size from DOM - this is the most reliable source
            const rect = this.elements.container.getBoundingClientRect();
            const position = { x: rect.left, y: rect.top };
            const size = { width: rect.width, height: rect.height };

            const state = {
                position: position,
                size: size,
                isMaximized: this.state.isMaximized || false,
                savedAt: Date.now()
            };

            localStorage.setItem(this._persistenceKey, JSON.stringify(state));
        } catch (e) {
            // localStorage may be full or disabled
            console.warn('Failed to save modal state:', e);
        }
    },

    /**
     * Load state from localStorage
     * @private
     * @returns {Object|null}
     */
    _loadState() {
        if (!this._persistenceKey) return null;

        try {
            const stored = localStorage.getItem(this._persistenceKey);
            if (!stored) return null;

            const state = JSON.parse(stored);

            // Expire old states (after 30 days)
            const maxAge = 30 * 24 * 60 * 60 * 1000;
            if (state.savedAt && Date.now() - state.savedAt > maxAge) {
                localStorage.removeItem(this._persistenceKey);
                return null;
            }

            return state;
        } catch (e) {
            console.warn('Failed to load modal state:', e);
            return null;
        }
    },

    /**
     * Apply saved state to the modal
     * @private
     * @param {Object} savedState
     */
    _applyState(savedState) {
        const container = this.elements.container;

        // Validate saved position is still within viewport
        if (savedState.position) {
            const { x, y } = savedState.position;
            const padding = 10;
            const viewport = {
                width: window.innerWidth,
                height: window.innerHeight
            };

            // Only apply if position is reasonable
            if (x >= 0 && x < viewport.width - 100 &&
                y >= 0 && y < viewport.height - 100) {
                container.style.left = `${Math.max(padding, x)}px`;
                container.style.top = `${Math.max(padding, y)}px`;
                container.style.transform = 'none';
                this.state.position = savedState.position;
            }
        }

        // Validate saved size
        if (savedState.size) {
            const { width, height } = savedState.size;
            const minSize = this.options.minSize || { width: 300, height: 200 };
            const maxSize = this.options.maxSize || {
                width: window.innerWidth - 40,
                height: window.innerHeight - 40
            };

            // Only apply if size is reasonable
            if (width >= minSize.width && width <= maxSize.width &&
                height >= minSize.height && height <= maxSize.height) {
                container.style.width = `${width}px`;
                container.style.height = `${height}px`;
                this.state.size = savedState.size;
            }
        }

        // Restore maximized state
        if (savedState.isMaximized && typeof this.maximize === 'function') {
            // Delay to ensure modal is fully rendered
            setTimeout(() => this.maximize(), 0);
        }
    },

    /**
     * Clear saved state
     */
    clearPersistedState() {
        if (this._persistenceKey) {
            try {
                localStorage.removeItem(this._persistenceKey);
            } catch (e) {
                // Ignore errors
            }
        }
    },

    /**
     * Clear all modal states (can be called on the mixin or any instance)
     */
    clearAllPersistedStates() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('i360-modal-state-')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (e) {
            console.warn('Failed to clear modal states:', e);
        }
    }
};

// Static helper function (can be called without an instance)
PersistenceMixin.clearAll = function() {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('i360-modal-state-')) {
                localStorage.removeItem(key);
            }
        });
    } catch (e) {
        console.warn('Failed to clear modal states:', e);
    }
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PersistenceMixin;
}
