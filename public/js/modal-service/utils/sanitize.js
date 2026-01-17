/**
 * Sanitize Utilities - ModalService
 * XSS protection for user-generated content
 * @version 1.0.0
 */

const Sanitize = {
    /**
     * Escape HTML entities to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeHtml(str) {
        if (typeof str !== 'string') return str;
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };
        return str.replace(/[&<>"'`=/]/g, char => escapeMap[char]);
    },

    /**
     * Unescape HTML entities
     * @param {string} str - String to unescape
     * @returns {string} Unescaped string
     */
    unescapeHtml(str) {
        if (typeof str !== 'string') return str;
        const unescapeMap = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#039;': "'",
            '&#x2F;': '/',
            '&#x60;': '`',
            '&#x3D;': '='
        };
        return str.replace(/&(?:amp|lt|gt|quot|#039|#x2F|#x60|#x3D);/g, entity => unescapeMap[entity] || entity);
    },

    /**
     * Strip all HTML tags from string
     * @param {string} str - String to strip
     * @returns {string} Plain text
     */
    stripTags(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/<[^>]*>/g, '');
    },

    /**
     * Sanitize HTML allowing only safe tags
     * @param {string} html - HTML to sanitize
     * @param {object} options - Sanitization options
     * @returns {string} Sanitized HTML
     */
    sanitizeHtml(html, options = {}) {
        if (typeof html !== 'string') return html;

        const defaults = {
            allowedTags: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li',
                         'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
                         'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div'],
            allowedAttributes: {
                'a': ['href', 'title', 'target', 'rel'],
                'img': ['src', 'alt', 'title', 'width', 'height'],
                '*': ['class']
            },
            allowedSchemes: ['http', 'https', 'mailto']
        };

        const config = { ...defaults, ...options };

        // Create a temporary container
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Process all elements
        const processNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return;
            }

            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();

                // Remove disallowed tags (keep children)
                if (!config.allowedTags.includes(tagName)) {
                    const fragment = document.createDocumentFragment();
                    while (node.firstChild) {
                        fragment.appendChild(node.firstChild);
                    }
                    node.parentNode.replaceChild(fragment, node);
                    return;
                }

                // Remove disallowed attributes
                const allowedAttrs = [
                    ...(config.allowedAttributes[tagName] || []),
                    ...(config.allowedAttributes['*'] || [])
                ];

                Array.from(node.attributes).forEach(attr => {
                    if (!allowedAttrs.includes(attr.name)) {
                        node.removeAttribute(attr.name);
                    }
                });

                // Validate href/src schemes
                ['href', 'src'].forEach(attr => {
                    if (node.hasAttribute(attr)) {
                        const value = node.getAttribute(attr);
                        try {
                            const url = new URL(value, window.location.origin);
                            if (!config.allowedSchemes.includes(url.protocol.replace(':', ''))) {
                                node.removeAttribute(attr);
                            }
                        } catch {
                            // Invalid URL, remove it
                            if (!value.startsWith('#') && !value.startsWith('/')) {
                                node.removeAttribute(attr);
                            }
                        }
                    }
                });

                // Add rel="noopener noreferrer" to external links
                if (tagName === 'a' && node.hasAttribute('href')) {
                    const href = node.getAttribute('href');
                    if (href.startsWith('http')) {
                        node.setAttribute('rel', 'noopener noreferrer');
                        node.setAttribute('target', '_blank');
                    }
                }
            }

            // Process children
            Array.from(node.childNodes).forEach(processNode);
        };

        Array.from(temp.childNodes).forEach(processNode);

        return temp.innerHTML;
    }
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sanitize;
}
