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
        this.modal.querySelectorAll('.resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', this.startResize.bind(this));
        });

        // Global mouse events
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);

        // Overlay click to close
        if (this.overlay && this.options.closeOnOverlayClick) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.close();
                }
            });
        }
    }

    /**
     * Add resize handles to the modal if not already present
     */
    addResizeHandles() {
        if (this.modal.querySelector('.resize-handle')) return;

        const handles = ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
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

        this.modal.style.transition = 'none';
        document.body.style.userSelect = 'none';
        e.preventDefault();
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

            // Handle horizontal resize
            if (dir.includes('right')) {
                newWidth = Math.max(minWidth, this.startWidth + deltaX);
            }
            if (dir.includes('left')) {
                const potentialWidth = this.startWidth - deltaX;
                if (potentialWidth >= minWidth) {
                    newWidth = potentialWidth;
                    newLeft = this.startLeft + deltaX;
                }
            }

            // Handle vertical resize
            if (dir.includes('bottom')) {
                newHeight = Math.max(minHeight, this.startHeight + deltaY);
            }
            if (dir.includes('top')) {
                const potentialHeight = this.startHeight - deltaY;
                if (potentialHeight >= minHeight) {
                    newHeight = potentialHeight;
                    newTop = this.startTop + deltaY;
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
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
    border: 1px solid var(--border);
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
}

/* Resize handles */
.resize-handle {
    position: absolute;
    z-index: 10;
}

.resize-handle.top {
    top: -4px;
    left: 10px;
    right: 10px;
    height: 8px;
    cursor: ns-resize;
}

.resize-handle.bottom {
    bottom: -4px;
    left: 10px;
    right: 10px;
    height: 8px;
    cursor: ns-resize;
}

.resize-handle.left {
    left: -4px;
    top: 10px;
    bottom: 10px;
    width: 8px;
    cursor: ew-resize;
}

.resize-handle.right {
    right: -4px;
    top: 10px;
    bottom: 10px;
    width: 8px;
    cursor: ew-resize;
}

.resize-handle.top-left {
    top: -4px;
    left: -4px;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
}

.resize-handle.top-right {
    top: -4px;
    right: -4px;
    width: 14px;
    height: 14px;
    cursor: nesw-resize;
}

.resize-handle.bottom-left {
    bottom: -4px;
    left: -4px;
    width: 14px;
    height: 14px;
    cursor: nesw-resize;
}

.resize-handle.bottom-right {
    bottom: -4px;
    right: -4px;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
}
`;

// Inject styles if not already present
if (!document.getElementById('modal-manager-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'modal-manager-styles';
    styleEl.textContent = modalManagerStyles;
    document.head.appendChild(styleEl);
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
}
