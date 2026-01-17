/**
 * ResizableMixin - ModalService
 * Adds 8-direction resize functionality to modals
 * @version 1.0.0
 */

const ResizableMixin = {
    /**
     * Initialize resizable functionality
     * Call this in the modal's init method after elements are created
     */
    initResizable() {
        if (!this.options.resizable) return;

        this._resizeState = {
            isResizing: false,
            handle: null,
            startX: 0,
            startY: 0,
            startWidth: 0,
            startHeight: 0,
            startLeft: 0,
            startTop: 0
        };

        // Bind handlers
        this._onResizeStart = this._onResizeStart.bind(this);
        this._onResizeMove = this._onResizeMove.bind(this);
        this._onResizeEnd = this._onResizeEnd.bind(this);

        // Create resize handles
        this._createResizeHandles();
    },

    /**
     * Create resize handle elements
     * @private
     */
    _createResizeHandles() {
        const handles = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
        this._resizeHandles = {};

        handles.forEach(direction => {
            const handle = document.createElement('div');
            handle.className = `i360-modal-resize-handle i360-modal-resize-${direction}`;
            handle.dataset.handle = direction;
            handle.addEventListener('mousedown', this._onResizeStart);
            this.elements.container.appendChild(handle);
            this._resizeHandles[direction] = handle;
        });
    },

    /**
     * Clean up resizable handlers
     */
    destroyResizable() {
        if (this._resizeHandles) {
            Object.values(this._resizeHandles).forEach(handle => {
                handle.removeEventListener('mousedown', this._onResizeStart);
                handle.remove();
            });
            this._resizeHandles = null;
        }
        document.removeEventListener('mousemove', this._onResizeMove);
        document.removeEventListener('mouseup', this._onResizeEnd);
    },

    /**
     * Handle resize start
     * @private
     */
    _onResizeStart(e) {
        e.preventDefault();
        e.stopPropagation();

        const handle = e.target.dataset.handle;
        if (!handle) return;

        const container = this.elements.container;
        const rect = container.getBoundingClientRect();

        this._resizeState = {
            isResizing: true,
            handle: handle,
            startX: e.clientX,
            startY: e.clientY,
            startWidth: rect.width,
            startHeight: rect.height,
            startLeft: rect.left,
            startTop: rect.top
        };

        this.state.isResizing = true;
        container.classList.add('is-resizing');

        // Set cursor on body during resize
        document.body.style.cursor = this._getResizeCursor(handle);

        document.addEventListener('mousemove', this._onResizeMove);
        document.addEventListener('mouseup', this._onResizeEnd);

        // Bring to front when starting resize
        if (typeof this.bringToFront === 'function') {
            this.bringToFront();
        }
    },

    /**
     * Handle resize move
     * @private
     */
    _onResizeMove(e) {
        if (!this._resizeState.isResizing) return;

        const { handle, startX, startY, startWidth, startHeight, startLeft, startTop } = this._resizeState;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        const minSize = this.options.minSize || { width: 300, height: 200 };
        const maxSize = this.options.maxSize || {
            width: window.innerWidth - 40,
            height: window.innerHeight - 40
        };

        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;

        // Calculate new dimensions based on handle direction
        if (handle.includes('e')) {
            newWidth = Math.min(Math.max(startWidth + deltaX, minSize.width), maxSize.width);
        }
        if (handle.includes('w')) {
            const proposedWidth = startWidth - deltaX;
            if (proposedWidth >= minSize.width && proposedWidth <= maxSize.width) {
                newWidth = proposedWidth;
                newLeft = startLeft + deltaX;
            }
        }
        if (handle.includes('s')) {
            newHeight = Math.min(Math.max(startHeight + deltaY, minSize.height), maxSize.height);
        }
        if (handle.includes('n')) {
            const proposedHeight = startHeight - deltaY;
            if (proposedHeight >= minSize.height && proposedHeight <= maxSize.height) {
                newHeight = proposedHeight;
                newTop = startTop + deltaY;
            }
        }

        // Constrain to viewport
        const padding = 10;
        newLeft = Math.max(padding, newLeft);
        newTop = Math.max(padding, newTop);

        if (newLeft + newWidth > window.innerWidth - padding) {
            newWidth = window.innerWidth - newLeft - padding;
        }
        if (newTop + newHeight > window.innerHeight - padding) {
            newHeight = window.innerHeight - newTop - padding;
        }

        // Apply new dimensions
        const container = this.elements.container;
        container.style.width = `${newWidth}px`;
        container.style.height = `${newHeight}px`;
        container.style.left = `${newLeft}px`;
        container.style.top = `${newTop}px`;
        container.style.transform = 'none';

        // Update state
        this.state.size = { width: newWidth, height: newHeight };
        this.state.position = { x: newLeft, y: newTop };

        // Emit resize event for content adjustment
        this.emit('resize', {
            modal: this,
            width: newWidth,
            height: newHeight
        });
    },

    /**
     * Handle resize end
     * @private
     */
    _onResizeEnd(e) {
        if (!this._resizeState.isResizing) return;

        this._resizeState.isResizing = false;
        this.state.isResizing = false;
        this.elements.container.classList.remove('is-resizing');

        // Reset cursor
        document.body.style.cursor = '';

        document.removeEventListener('mousemove', this._onResizeMove);
        document.removeEventListener('mouseup', this._onResizeEnd);

        // Emit event
        this.emit('resizeEnd', {
            modal: this,
            width: this.state.size.width,
            height: this.state.size.height
        });

        // Save state if persistence is enabled
        if (typeof this._saveState === 'function') {
            this._saveState();
        }
    },

    /**
     * Get cursor style for resize handle
     * @private
     */
    _getResizeCursor(handle) {
        const cursors = {
            'n': 'ns-resize',
            's': 'ns-resize',
            'e': 'ew-resize',
            'w': 'ew-resize',
            'ne': 'nesw-resize',
            'sw': 'nesw-resize',
            'nw': 'nwse-resize',
            'se': 'nwse-resize'
        };
        return cursors[handle] || 'default';
    },

    /**
     * Set modal size programmatically
     * @param {number} width - New width
     * @param {number} height - New height
     */
    setSize(width, height) {
        const minSize = this.options.minSize || { width: 300, height: 200 };
        const maxSize = this.options.maxSize || {
            width: window.innerWidth - 40,
            height: window.innerHeight - 40
        };

        width = Math.min(Math.max(width, minSize.width), maxSize.width);
        height = Math.min(Math.max(height, minSize.height), maxSize.height);

        this.elements.container.style.width = `${width}px`;
        this.elements.container.style.height = `${height}px`;
        this.state.size = { width, height };

        this.emit('resize', { modal: this, width, height });
    }
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResizableMixin;
}
