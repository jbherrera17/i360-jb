/**
 * Insight 360 - Modal Manager
 * Provides drag and resize functionality for modal dialogs
 * Version: 1.0.0
 */

class ModalManager {
    constructor(options = {}) {
        this.modal = null;
        this.header = null;
        this.overlay = null;
        this.isDragging = false;
        this.isResizing = false;
        this.resizeDirection = null;
        this.startX = 0;
        this.startY = 0;
        this.startWidth = 0;
        this.startHeight = 0;
        this.startLeft = 0;
        this.startTop = 0;

        // Default options
        this.options = {
            minWidth: 400,
            minHeight: 300,
            defaultWidth: 560,
            closeOnOverlayClick: true,
            ...options
        };

        // Bind methods
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
    }

    /**
     * Initialize a modal with drag and resize functionality
     * @param {string} modalId - ID of the modal container
     * @param {string} headerId - ID of the modal header (drag handle)
     * @param {string} overlayId - ID of the overlay element
     */
    init(modalId, headerId, overlayId) {
        this.modal = document.getElementById(modalId);
        this.header = document.getElementById(headerId);
        this.overlay = document.getElementById(overlayId);

        if (!this.modal || !this.header) {
            console.warn('ModalManager: Modal or header element not found');
            return;
        }

        // Add resize handles if not present
        this.addResizeHandles();

        // Drag handlers
        this.header.addEventListener('mousedown', this.startDrag.bind(this));

        // Resize handlers
        const handles = this.modal.querySelectorAll('.resize-handle');
        handles.forEach(handle => {
            handle.addEventListener('mousedown', this.startResize.bind(this));
        });

        // Global mouse events
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);

        // Overlay click to close - but not during/after resize or drag
        if (this.overlay && this.options.closeOnOverlayClick) {
            this.overlay.addEventListener('click', (e) => {
                // Don't close if we just finished resizing or dragging
                if (this.justFinishedInteraction) {
                    this.justFinishedInteraction = false;
                    return;
                }
                if (e.target === this.overlay) {
                    this.close();
                }
            });
        }
    }

    /**
     * Add resize handles to the modal, removing any existing ones first
     */
    addResizeHandles() {
        // Remove any existing resize handles to ensure we have the correct set
        this.modal.querySelectorAll('.resize-handle').forEach(h => h.remove());

        // Edge handles and all four corner handles
        const handles = [
            'top', 'bottom', 'left', 'right',
            'top-left', 'top-right', 'bottom-left', 'bottom-right'
        ];
        handles.forEach(dir => {
            const handle = document.createElement('div');
            handle.className = `resize-handle ${dir}`;
            handle.dataset.resize = dir;
            this.modal.appendChild(handle);
        });
    }

    /**
     * Center the modal in the viewport
     */
    center() {
        if (!this.modal || !this.overlay) return;

        const overlayRect = this.overlay.getBoundingClientRect();
        const modalRect = this.modal.getBoundingClientRect();

        const left = (overlayRect.width - modalRect.width) / 2;
        const top = (overlayRect.height - modalRect.height) / 2;

        this.modal.style.left = `${Math.max(0, left)}px`;
        this.modal.style.top = `${Math.max(20, top)}px`;
    }

    /**
     * Open the modal
     */
    open() {
        if (this.overlay) {
            this.overlay.classList.add('active');
        }
        // Center after a brief delay to allow DOM to update
        setTimeout(() => this.center(), 10);
    }

    /**
     * Close the modal
     */
    close() {
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
    }

    /**
     * Reset modal to default size and center
     */
    reset() {
        if (!this.modal) return;
        this.modal.style.width = `${this.options.defaultWidth}px`;
        this.modal.style.height = '';
        this.modal.style.maxHeight = '85vh';
        this.center();
    }

    startDrag(e) {
        // Don't drag if clicking the close button or other interactive elements
        if (e.target.closest('.modal-close') || e.target.closest('button') || e.target.closest('input')) return;

        this.isDragging = true;
        this.startX = e.clientX;
        this.startY = e.clientY;

        const rect = this.modal.getBoundingClientRect();
        const overlayRect = this.overlay.getBoundingClientRect();

        this.startLeft = rect.left - overlayRect.left;
        this.startTop = rect.top - overlayRect.top;

        this.modal.style.transition = 'none';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    }

    startResize(e) {
        e.stopPropagation();
        e.preventDefault();
        this.isResizing = true;
        this.resizeDirection = e.target.dataset.resize;
        this.startX = e.clientX;
        this.startY = e.clientY;

        const rect = this.modal.getBoundingClientRect();
        const overlayRect = this.overlay.getBoundingClientRect();

        this.startWidth = rect.width;
        this.startHeight = rect.height;
        this.startLeft = rect.left - overlayRect.left;
        this.startTop = rect.top - overlayRect.top;

        // Store the modal's initial bottom and right edges for anchoring
        this.startBottom = this.startTop + this.startHeight;
        this.startRight = this.startLeft + this.startWidth;

        this.modal.style.transition = 'none';
        document.body.style.userSelect = 'none';
    }

    onMouseMove(e) {
        if (this.isDragging) {
            const deltaX = e.clientX - this.startX;
            const deltaY = e.clientY - this.startY;

            const newLeft = this.startLeft + deltaX;
            const newTop = this.startTop + deltaY;

            // Keep modal within viewport
            const maxLeft = this.overlay.clientWidth - 100;
            const maxTop = this.overlay.clientHeight - 50;

            this.modal.style.left = `${Math.max(-100, Math.min(maxLeft, newLeft))}px`;
            this.modal.style.top = `${Math.max(0, Math.min(maxTop, newTop))}px`;
        }

        if (this.isResizing) {
            const deltaX = e.clientX - this.startX;
            const deltaY = e.clientY - this.startY;
            const dir = this.resizeDirection;
            const minWidth = this.options.minWidth;
            const minHeight = this.options.minHeight;

            let newWidth = this.startWidth;
            let newHeight = this.startHeight;
            let newLeft = this.startLeft;
            let newTop = this.startTop;

            // Handle right edge - width increases with positive deltaX
            if (dir.includes('right')) {
                newWidth = Math.max(minWidth, this.startWidth + deltaX);
            }

            // Handle left edge - width increases with negative deltaX, left moves with cursor
            if (dir.includes('left')) {
                const potentialWidth = this.startWidth - deltaX;
                if (potentialWidth >= minWidth) {
                    newWidth = potentialWidth;
                    newLeft = this.startLeft + deltaX;
                } else {
                    newWidth = minWidth;
                    newLeft = this.startRight - minWidth;
                }
            }

            // Handle bottom edge - height increases with positive deltaY
            if (dir.includes('bottom')) {
                newHeight = Math.max(minHeight, this.startHeight + deltaY);
            }

            // Handle top edge - height increases with negative deltaY, top moves with cursor
            if (dir.includes('top')) {
                const potentialHeight = this.startHeight - deltaY;
                if (potentialHeight >= minHeight) {
                    newHeight = potentialHeight;
                    newTop = this.startTop + deltaY;
                } else {
                    newHeight = minHeight;
                    newTop = this.startBottom - minHeight;
                }
            }

            this.modal.style.width = `${newWidth}px`;
            this.modal.style.height = `${newHeight}px`;
            this.modal.style.left = `${newLeft}px`;
            this.modal.style.top = `${newTop}px`;
            this.modal.style.maxHeight = 'none';
        }
    }

    onMouseUp() {
        // Track if we were interacting to prevent overlay click from closing
        if (this.isDragging || this.isResizing) {
            this.justFinishedInteraction = true;
        }
        this.isDragging = false;
        this.isResizing = false;
        this.resizeDirection = null;
        document.body.style.userSelect = '';
        if (this.modal) {
            this.modal.style.transition = '';
        }
    }

    /**
     * Destroy the modal manager and remove event listeners
     */
    destroy() {
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
    }
}

// CSS styles for resize handles - inject into page
const modalManagerStyles = `
/* Modal Manager Styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 2000;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s, visibility 0.3s;
}

.modal-overlay.active {
    opacity: 1;
    visibility: visible;
}

.modal,
.modal-content {
    position: absolute;
    background: var(--bg-secondary);
    border-radius: 12px;
    min-width: 400px;
    min-height: 300px;
    width: 560px;
    max-height: 85vh;
    overflow: visible;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
    border: 1px solid var(--border);
}

/* Modal body needs to handle its own overflow */
.modal > .modal-body,
.modal-content > .modal-body {
    overflow-y: auto;
    flex: 1;
    min-height: 0;
}

/* Allow inline styles to override max-height when resizing */
.modal[style*="height"],
.modal-content[style*="height"] {
    max-height: none !important;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-secondary);
    flex-shrink: 0;
    cursor: move;
    user-select: none;
    position: relative;
    z-index: 1;
}

.modal-title {
    font-weight: 600;
    font-size: 1.1rem;
    color: var(--text-primary);
}

.modal-close {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 0.5rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.modal-close:hover {
    color: var(--text-primary);
    background: var(--bg-tertiary);
}

.modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--border);
    background: var(--bg-secondary);
    flex-shrink: 0;
    position: relative;
    z-index: 1;
}

/* Resize handles - invisible edge handles */
.resize-handle {
    position: absolute;
    z-index: 10;
}

.resize-handle.top {
    top: -4px !important;
    left: 16px !important;
    right: 16px !important;
    bottom: auto !important;
    height: 8px !important;
    width: auto !important;
    cursor: ns-resize !important;
}

.resize-handle.bottom {
    bottom: -4px !important;
    left: 16px !important;
    right: 16px !important;
    top: auto !important;
    height: 8px !important;
    width: auto !important;
    cursor: ns-resize !important;
}

.resize-handle.left {
    left: -4px !important;
    top: 16px !important;
    bottom: 16px !important;
    right: auto !important;
    width: 8px !important;
    height: auto !important;
    cursor: ew-resize !important;
}

.resize-handle.right {
    right: -4px !important;
    top: 16px !important;
    bottom: 16px !important;
    left: auto !important;
    width: 8px !important;
    height: auto !important;
    cursor: ew-resize !important;
}

/* Corner resize handles - positioned outside modal boundary */
/* Using !important to override page-specific .resize-handle styles */
.resize-handle.top-left,
.resize-handle.top-right,
.resize-handle.bottom-left,
.resize-handle.bottom-right {
    width: 16px !important;
    height: 16px !important;
    z-index: 2000 !important;
    pointer-events: auto !important;
}

.resize-handle.top-left {
    top: -8px !important;
    left: -8px !important;
    right: auto !important;
    bottom: auto !important;
    cursor: nwse-resize !important;
}

.resize-handle.top-right {
    top: -8px !important;
    right: -8px !important;
    left: auto !important;
    bottom: auto !important;
    cursor: nesw-resize !important;
}

.resize-handle.bottom-left {
    bottom: -8px !important;
    left: -8px !important;
    top: auto !important;
    right: auto !important;
    cursor: nesw-resize !important;
}

.resize-handle.bottom-right {
    bottom: -8px !important;
    right: -8px !important;
    top: auto !important;
    left: auto !important;
    cursor: nwse-resize !important;
}

/* Visual indicator for bottom-right corner */
.resize-handle.bottom-right::after {
    content: '';
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 12px;
    height: 12px;
    background: linear-gradient(315deg, var(--text-muted, #888) 50%, transparent 50%);
    opacity: 0.5;
    transition: opacity 0.2s;
    border-radius: 0 0 8px 0;
    pointer-events: none;
}

.resize-handle.bottom-right:hover::after {
    opacity: 0.8;
}

.resize-handle.bottom-right:active::after {
    opacity: 1;
}

`;

// Inject styles - always update to ensure latest styles are applied
(function injectModalStyles() {
    let styleEl = document.getElementById('modal-manager-styles');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'modal-manager-styles';
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = modalManagerStyles;
})();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
}
