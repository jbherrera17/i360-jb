/**
 * DraggableMixin - ModalService
 * Adds drag functionality to modals
 * @version 1.0.0
 */

const DraggableMixin = {
    /**
     * Initialize draggable functionality
     * Call this in the modal's init method after elements are created
     */
    initDraggable() {
        if (!this.options.draggable) return;

        this._dragState = {
            isDragging: false,
            startX: 0,
            startY: 0,
            startLeft: 0,
            startTop: 0
        };

        // Bind handlers
        this._onDragStart = this._onDragStart.bind(this);
        this._onDragMove = this._onDragMove.bind(this);
        this._onDragEnd = this._onDragEnd.bind(this);

        // Set cursor on header
        if (this.elements.header) {
            this.elements.header.style.cursor = 'move';
            this.elements.header.addEventListener('mousedown', this._onDragStart);
        }
    },

    /**
     * Clean up draggable handlers
     */
    destroyDraggable() {
        if (this.elements.header) {
            this.elements.header.removeEventListener('mousedown', this._onDragStart);
        }
        document.removeEventListener('mousemove', this._onDragMove);
        document.removeEventListener('mouseup', this._onDragEnd);
    },

    /**
     * Handle drag start
     * @private
     */
    _onDragStart(e) {
        // Only start drag from header, not from buttons inside header
        if (e.target.closest('button') || e.target.closest('.i360-modal-close')) {
            return;
        }

        // Prevent text selection
        e.preventDefault();

        const container = this.elements.container;
        const rect = container.getBoundingClientRect();

        this._dragState = {
            isDragging: true,
            startX: e.clientX,
            startY: e.clientY,
            startLeft: rect.left,
            startTop: rect.top
        };

        this.state.isDragging = true;
        container.classList.add('is-dragging');

        document.addEventListener('mousemove', this._onDragMove);
        document.addEventListener('mouseup', this._onDragEnd);

        // Bring to front when starting drag
        if (typeof this.bringToFront === 'function') {
            this.bringToFront();
        }
    },

    /**
     * Handle drag move
     * @private
     */
    _onDragMove(e) {
        if (!this._dragState.isDragging) return;

        const deltaX = e.clientX - this._dragState.startX;
        const deltaY = e.clientY - this._dragState.startY;

        let newLeft = this._dragState.startLeft + deltaX;
        let newTop = this._dragState.startTop + deltaY;

        // Constrain to viewport
        const container = this.elements.container;
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        const padding = 10;

        newLeft = Math.min(Math.max(padding, newLeft), viewport.width - container.offsetWidth - padding);
        newTop = Math.min(Math.max(padding, newTop), viewport.height - container.offsetHeight - padding);

        // Apply position
        container.style.left = `${newLeft}px`;
        container.style.top = `${newTop}px`;
        container.style.transform = 'none'; // Remove centering transform

        // Update state
        this.state.position = { x: newLeft, y: newTop };
    },

    /**
     * Handle drag end
     * @private
     */
    _onDragEnd(e) {
        if (!this._dragState.isDragging) return;

        this._dragState.isDragging = false;
        this.state.isDragging = false;
        this.elements.container.classList.remove('is-dragging');

        document.removeEventListener('mousemove', this._onDragMove);
        document.removeEventListener('mouseup', this._onDragEnd);

        // Emit event
        this.emit('dragEnd', {
            modal: this,
            x: this.state.position.x,
            y: this.state.position.y
        });

        // Save position if persistence is enabled
        if (typeof this._saveState === 'function') {
            this._saveState();
        }
    }
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DraggableMixin;
}
