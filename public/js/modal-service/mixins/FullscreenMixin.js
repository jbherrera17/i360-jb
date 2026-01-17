/**
 * FullscreenMixin - ModalService
 * Adds maximize/restore functionality to modals
 * @version 1.0.0
 */

const FullscreenMixin = {
    /**
     * Initialize fullscreen functionality
     * Call this in the modal's init method after elements are created
     */
    initFullscreen() {
        if (!this.options.maximizable) return;

        this._fullscreenState = {
            isMaximized: false,
            previousPosition: null,
            previousSize: null
        };

        // Bind handler
        this._onMaximizeClick = this._onMaximizeClick.bind(this);

        // Create maximize button if header exists
        if (this.elements.header) {
            this._createMaximizeButton();
        }

        // Handle double-click on header to toggle maximize
        if (this.elements.header && this.options.doubleClickMaximize !== false) {
            this.elements.header.addEventListener('dblclick', this._onMaximizeClick);
        }
    },

    /**
     * Create maximize button in header
     * @private
     */
    _createMaximizeButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'i360-modal-maximize';
        button.setAttribute('aria-label', 'Maximize');
        button.innerHTML = `
            <svg class="maximize-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            </svg>
            <svg class="restore-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                <rect x="5" y="7" width="14" height="14" rx="2" ry="2"/>
                <path d="M9 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2"/>
            </svg>
        `;
        button.addEventListener('click', this._onMaximizeClick);

        // Insert before close button if it exists
        const closeButton = this.elements.header.querySelector('.i360-modal-close');
        if (closeButton) {
            closeButton.parentNode.insertBefore(button, closeButton);
        } else {
            this.elements.header.appendChild(button);
        }

        this.elements.maximizeButton = button;
    },

    /**
     * Clean up fullscreen handlers
     */
    destroyFullscreen() {
        if (this.elements.maximizeButton) {
            this.elements.maximizeButton.removeEventListener('click', this._onMaximizeClick);
            this.elements.maximizeButton.remove();
        }
        if (this.elements.header) {
            this.elements.header.removeEventListener('dblclick', this._onMaximizeClick);
        }
    },

    /**
     * Handle maximize button click
     * @private
     */
    _onMaximizeClick(e) {
        // Ignore if clicking buttons inside header
        if (e.target.closest('button') && e.type === 'dblclick') {
            return;
        }
        e.preventDefault();
        this.toggleMaximize();
    },

    /**
     * Toggle between maximized and normal state
     */
    toggleMaximize() {
        if (this._fullscreenState.isMaximized) {
            this.restore();
        } else {
            this.maximize();
        }
    },

    /**
     * Maximize the modal to fill the viewport
     */
    maximize() {
        if (this._fullscreenState.isMaximized) return;

        const container = this.elements.container;
        const rect = container.getBoundingClientRect();

        // Save current position and size
        this._fullscreenState.previousPosition = {
            x: rect.left,
            y: rect.top
        };
        this._fullscreenState.previousSize = {
            width: rect.width,
            height: rect.height
        };

        // Apply maximized state
        const padding = 10;
        container.style.left = `${padding}px`;
        container.style.top = `${padding}px`;
        container.style.width = `${window.innerWidth - (padding * 2)}px`;
        container.style.height = `${window.innerHeight - (padding * 2)}px`;
        container.style.transform = 'none';
        container.classList.add('is-maximized');

        this._fullscreenState.isMaximized = true;
        this.state.isMaximized = true;

        // Update button icon
        this._updateMaximizeIcon();

        // Disable drag when maximized
        if (this.elements.header) {
            this.elements.header.style.cursor = 'default';
        }

        // Hide resize handles
        if (this._resizeHandles) {
            Object.values(this._resizeHandles).forEach(handle => {
                handle.style.display = 'none';
            });
        }

        this.emit('maximize', { modal: this });
    },

    /**
     * Restore the modal to its previous size
     */
    restore() {
        if (!this._fullscreenState.isMaximized) return;

        const container = this.elements.container;
        const { previousPosition, previousSize } = this._fullscreenState;

        // Restore position and size
        if (previousPosition && previousSize) {
            container.style.left = `${previousPosition.x}px`;
            container.style.top = `${previousPosition.y}px`;
            container.style.width = `${previousSize.width}px`;
            container.style.height = `${previousSize.height}px`;
        }

        container.classList.remove('is-maximized');
        this._fullscreenState.isMaximized = false;
        this.state.isMaximized = false;

        // Update button icon
        this._updateMaximizeIcon();

        // Re-enable drag
        if (this.elements.header && this.options.draggable) {
            this.elements.header.style.cursor = 'move';
        }

        // Show resize handles
        if (this._resizeHandles && this.options.resizable) {
            Object.values(this._resizeHandles).forEach(handle => {
                handle.style.display = '';
            });
        }

        this.emit('restore', { modal: this });
    },

    /**
     * Update maximize button icon based on state
     * @private
     */
    _updateMaximizeIcon() {
        if (!this.elements.maximizeButton) return;

        const maximizeIcon = this.elements.maximizeButton.querySelector('.maximize-icon');
        const restoreIcon = this.elements.maximizeButton.querySelector('.restore-icon');

        if (this._fullscreenState.isMaximized) {
            if (maximizeIcon) maximizeIcon.style.display = 'none';
            if (restoreIcon) restoreIcon.style.display = '';
            this.elements.maximizeButton.setAttribute('aria-label', 'Restore');
        } else {
            if (maximizeIcon) maximizeIcon.style.display = '';
            if (restoreIcon) restoreIcon.style.display = 'none';
            this.elements.maximizeButton.setAttribute('aria-label', 'Maximize');
        }
    },

    /**
     * Check if modal is currently maximized
     * @returns {boolean}
     */
    isMaximized() {
        return this._fullscreenState?.isMaximized || false;
    }
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FullscreenMixin;
}
