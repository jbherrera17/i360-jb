/**
 * Position Utilities - ModalService
 * Modal positioning and viewport calculations
 * @version 1.0.0
 */

const Position = {
    /**
     * Get viewport dimensions
     * @returns {object} { width, height }
     */
    getViewport() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    },

    /**
     * Get element dimensions
     * @param {HTMLElement} element
     * @returns {object} { width, height }
     */
    getElementSize(element) {
        const rect = element.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height
        };
    },

    /**
     * Calculate centered position for an element
     * @param {number} elementWidth
     * @param {number} elementHeight
     * @returns {object} { x, y }
     */
    center(elementWidth, elementHeight) {
        const viewport = this.getViewport();
        return {
            x: Math.max(0, (viewport.width - elementWidth) / 2),
            y: Math.max(0, (viewport.height - elementHeight) / 2)
        };
    },

    /**
     * Calculate position based on anchor
     * @param {string} anchor - 'center', 'top', 'top-left', 'top-right', 'bottom', etc.
     * @param {number} elementWidth
     * @param {number} elementHeight
     * @param {number} offset - Offset from edges
     * @returns {object} { x, y }
     */
    fromAnchor(anchor, elementWidth, elementHeight, offset = 20) {
        const viewport = this.getViewport();

        const positions = {
            'center': {
                x: (viewport.width - elementWidth) / 2,
                y: (viewport.height - elementHeight) / 2
            },
            'top': {
                x: (viewport.width - elementWidth) / 2,
                y: offset
            },
            'top-left': {
                x: offset,
                y: offset
            },
            'top-right': {
                x: viewport.width - elementWidth - offset,
                y: offset
            },
            'bottom': {
                x: (viewport.width - elementWidth) / 2,
                y: viewport.height - elementHeight - offset
            },
            'bottom-left': {
                x: offset,
                y: viewport.height - elementHeight - offset
            },
            'bottom-right': {
                x: viewport.width - elementWidth - offset,
                y: viewport.height - elementHeight - offset
            },
            'left': {
                x: offset,
                y: (viewport.height - elementHeight) / 2
            },
            'right': {
                x: viewport.width - elementWidth - offset,
                y: (viewport.height - elementHeight) / 2
            }
        };

        return positions[anchor] || positions['center'];
    },

    /**
     * Constrain position within viewport
     * @param {number} x
     * @param {number} y
     * @param {number} elementWidth
     * @param {number} elementHeight
     * @param {number} padding - Minimum padding from edges
     * @returns {object} { x, y }
     */
    constrainToViewport(x, y, elementWidth, elementHeight, padding = 10) {
        const viewport = this.getViewport();

        return {
            x: Math.min(Math.max(padding, x), viewport.width - elementWidth - padding),
            y: Math.min(Math.max(padding, y), viewport.height - elementHeight - padding)
        };
    },

    /**
     * Calculate new position after resize
     * @param {string} handle - Resize handle direction
     * @param {number} deltaX - Mouse delta X
     * @param {number} deltaY - Mouse delta Y
     * @param {object} startPos - Starting position { x, y }
     * @param {object} startSize - Starting size { width, height }
     * @param {object} minSize - Minimum size { width, height }
     * @param {object} maxSize - Maximum size { width, height }
     * @returns {object} { x, y, width, height }
     */
    calculateResize(handle, deltaX, deltaY, startPos, startSize, minSize, maxSize) {
        let { x, y } = startPos;
        let { width, height } = startSize;

        // Handle horizontal resizing
        if (handle.includes('e')) {
            width = Math.min(Math.max(startSize.width + deltaX, minSize.width), maxSize.width);
        }
        if (handle.includes('w')) {
            const newWidth = Math.min(Math.max(startSize.width - deltaX, minSize.width), maxSize.width);
            x = startPos.x + (startSize.width - newWidth);
            width = newWidth;
        }

        // Handle vertical resizing
        if (handle.includes('s')) {
            height = Math.min(Math.max(startSize.height + deltaY, minSize.height), maxSize.height);
        }
        if (handle.includes('n')) {
            const newHeight = Math.min(Math.max(startSize.height - deltaY, minSize.height), maxSize.height);
            y = startPos.y + (startSize.height - newHeight);
            height = newHeight;
        }

        return { x, y, width, height };
    },

    /**
     * Get cursor style for resize handle
     * @param {string} handle - Handle direction
     * @returns {string} CSS cursor value
     */
    getResizeCursor(handle) {
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
     * Check if element is fully visible in viewport
     * @param {HTMLElement} element
     * @returns {boolean}
     */
    isFullyVisible(element) {
        const rect = element.getBoundingClientRect();
        const viewport = this.getViewport();

        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= viewport.height &&
            rect.right <= viewport.width
        );
    },

    /**
     * Parse size value (handles px, %, vh, vw)
     * @param {string|number} value
     * @param {string} dimension - 'width' or 'height'
     * @returns {number} Pixel value
     */
    parseSize(value, dimension = 'width') {
        if (typeof value === 'number') return value;
        if (!value || value === 'auto') return null;

        const viewport = this.getViewport();
        const str = String(value);

        if (str.endsWith('px')) {
            return parseInt(str, 10);
        }
        if (str.endsWith('%')) {
            const percent = parseInt(str, 10) / 100;
            return dimension === 'width' ? viewport.width * percent : viewport.height * percent;
        }
        if (str.endsWith('vw')) {
            return viewport.width * (parseInt(str, 10) / 100);
        }
        if (str.endsWith('vh')) {
            return viewport.height * (parseInt(str, 10) / 100);
        }

        return parseInt(str, 10) || null;
    }
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Position;
}
