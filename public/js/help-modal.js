/**
 * Insight 360 - Help Modal Component
 * Resizable, draggable modal for displaying page-specific documentation
 * Version: 1.0.0
 *
 * Usage:
 *   1. Include help-modal.css and help-modal.js in your page
 *   2. Add a help button: <button class="help-btn" onclick="HelpModal.open()">
 *   3. Set the help file path: HelpModal.init({ helpFile: '/docs/my-page-guide.md' })
 */

const HelpModal = (function() {
    // Configuration
    let config = {
        helpFile: null,           // Path to markdown file
        title: 'Help',            // Modal title
        cacheContent: true,       // Cache loaded content
        showFooter: true,         // Show footer with doc link
        onOpen: null,             // Callback when modal opens
        onClose: null             // Callback when modal closes
    };

    // State
    let isOpen = false;
    let contentCache = null;
    let modalElement = null;
    let isDragging = false;
    let isResizing = false;
    let dragOffset = { x: 0, y: 0 };
    let resizeStart = { x: 0, y: 0, width: 0, height: 0 };

    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} - Escaped string
     */
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    /**
     * Initialize the help modal
     * @param {Object} options - Configuration options
     */
    function init(options = {}) {
        config = { ...config, ...options };
        createModalElement();
        bindEvents();
    }

    /**
     * Create the modal DOM structure
     */
    function createModalElement() {
        // Check if modal already exists
        if (document.getElementById('helpModalOverlay')) {
            modalElement = document.querySelector('.help-modal');
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'helpModalOverlay';
        overlay.className = 'help-modal-overlay';
        overlay.innerHTML = `
            <div class="help-modal" role="dialog" aria-modal="true" aria-labelledby="helpModalTitle">
                <div class="help-modal-header">
                    <h2 class="help-modal-title" id="helpModalTitle">
                        <i data-lucide="help-circle"></i>
                        <span>${config.title}</span>
                    </h2>
                    <div class="help-modal-actions">
                        <button class="help-modal-action" onclick="HelpModal.toggleFullscreen()" title="Toggle fullscreen">
                            <i data-lucide="maximize-2"></i>
                        </button>
                        <button class="help-modal-action close" onclick="HelpModal.close()" title="Close">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                </div>
                <div class="help-modal-content" id="helpModalContent">
                    <div class="help-content"></div>
                </div>
                ${config.showFooter ? `
                <div class="help-modal-footer">
                    <span>Insight 360 Documentation</span>
                    <a href="/documentation/" target="_blank">View all docs</a>
                </div>
                ` : ''}
                <div class="help-modal-resize help-modal-resize-e"></div>
                <div class="help-modal-resize help-modal-resize-s"></div>
                <div class="help-modal-resize help-modal-resize-se"></div>
            </div>
        `;

        document.body.appendChild(overlay);
        modalElement = overlay.querySelector('.help-modal');

        // Initialize Lucide icons if available
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Bind event listeners
     */
    function bindEvents() {
        const overlay = document.getElementById('helpModalOverlay');
        if (!overlay) return;

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                close();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) {
                close();
            }
        });

        // Dragging
        const header = modalElement.querySelector('.help-modal-header');
        header.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', stopDrag);

        // Resizing
        const resizeHandles = modalElement.querySelectorAll('.help-modal-resize');
        resizeHandles.forEach(handle => {
            handle.addEventListener('mousedown', startResize);
        });
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
    }

    /**
     * Open the help modal
     * @param {string} helpFile - Optional path to override config
     */
    async function open(helpFile = null) {
        if (!modalElement) {
            createModalElement();
            bindEvents();
        }

        const filePath = helpFile || config.helpFile;
        if (!filePath) {
            console.error('HelpModal: No help file specified');
            return;
        }

        const overlay = document.getElementById('helpModalOverlay');
        overlay.classList.add('open');
        isOpen = true;

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Load content
        await loadContent(filePath);

        // Callback
        if (typeof config.onOpen === 'function') {
            config.onOpen();
        }
    }

    /**
     * Close the help modal
     */
    function close() {
        const overlay = document.getElementById('helpModalOverlay');
        if (!overlay) return;

        overlay.classList.remove('open');
        isOpen = false;

        // Restore body scroll
        document.body.style.overflow = '';

        // Reset position if fullscreen
        modalElement.style.top = '';
        modalElement.style.left = '';
        modalElement.style.width = '';
        modalElement.style.height = '';
        modalElement.style.transform = '';
        modalElement.classList.remove('fullscreen');

        // Callback
        if (typeof config.onClose === 'function') {
            config.onClose();
        }
    }

    /**
     * Toggle fullscreen mode
     */
    function toggleFullscreen() {
        if (modalElement.classList.contains('fullscreen')) {
            // Exit fullscreen
            modalElement.style.top = '';
            modalElement.style.left = '';
            modalElement.style.width = '';
            modalElement.style.height = '';
            modalElement.style.transform = '';
            modalElement.classList.remove('fullscreen');
        } else {
            // Enter fullscreen
            modalElement.style.top = '2%';
            modalElement.style.left = '2%';
            modalElement.style.width = '96%';
            modalElement.style.height = '96%';
            modalElement.style.transform = 'none';
            modalElement.classList.add('fullscreen');
        }

        // Update icon
        const icon = modalElement.querySelector('.help-modal-action i[data-lucide="maximize-2"], .help-modal-action i[data-lucide="minimize-2"]');
        if (icon) {
            icon.setAttribute('data-lucide', modalElement.classList.contains('fullscreen') ? 'minimize-2' : 'maximize-2');
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }

    /**
     * Load markdown content from file
     * @param {string} filePath - Path to markdown file
     */
    async function loadContent(filePath) {
        const contentDiv = document.getElementById('helpModalContent');
        const helpContent = contentDiv.querySelector('.help-content');

        // Check cache
        if (config.cacheContent && contentCache && contentCache.path === filePath) {
            helpContent.innerHTML = contentCache.html;
            return;
        }

        // Show loading state
        contentDiv.classList.add('loading');
        helpContent.innerHTML = '';

        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load: ${response.status}`);
            }

            const markdown = await response.text();
            const html = parseMarkdown(markdown);

            helpContent.innerHTML = html;
            contentDiv.classList.remove('loading');

            // Cache content
            if (config.cacheContent) {
                contentCache = { path: filePath, html };
            }

        } catch (error) {
            console.error('HelpModal: Error loading content', error);
            contentDiv.classList.remove('loading');
            contentDiv.classList.add('error');
            // Escape error message to prevent XSS
            const safeErrorMessage = escapeHtml(error.message || 'Unknown error');
            helpContent.innerHTML = `
                <i data-lucide="alert-circle" style="width: 48px; height: 48px;"></i>
                <p>Unable to load help content</p>
                <p style="font-size: 0.85rem;">${safeErrorMessage}</p>
            `;
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }

    /**
     * Simple markdown parser
     * @param {string} markdown - Markdown content
     * @returns {string} - HTML content
     */
    function parseMarkdown(markdown) {
        let html = markdown;

        // Extract code blocks first (before HTML escaping)
        const codeBlocks = [];
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
            // Escape HTML inside code blocks
            const escapedCode = code.trim()
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            codeBlocks.push(`<pre><code class="language-${lang}">${escapedCode}</code></pre>`);
            return placeholder;
        });

        // Extract inline code (before HTML escaping)
        const inlineCodes = [];
        html = html.replace(/`([^`]+)`/g, (match, code) => {
            const placeholder = `__INLINE_CODE_${inlineCodes.length}__`;
            const escapedCode = code
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            inlineCodes.push(`<code>${escapedCode}</code>`);
            return placeholder;
        });

        // Escape HTML in remaining content
        html = html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Restore code blocks and inline code
        codeBlocks.forEach((block, i) => {
            html = html.replace(`__CODE_BLOCK_${i}__`, block);
        });
        inlineCodes.forEach((code, i) => {
            html = html.replace(`__INLINE_CODE_${i}__`, code);
        });

        // Headers
        html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        // Horizontal rules
        html = html.replace(/^---+$/gm, '<hr>');

        // Bold and italic
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Links - sanitize href to prevent javascript: XSS
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
            // Block javascript: and data: URLs to prevent XSS
            const safeUrl = /^(javascript|data|vbscript):/i.test(url.trim()) ? '#' : url;
            return `<a href="${safeUrl}" target="_blank">${text}</a>`;
        });

        // Images - sanitize src to prevent javascript: XSS
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
            // Block javascript: and data: URLs to prevent XSS
            const safeSrc = /^(javascript|data|vbscript):/i.test(src.trim()) ? '' : src;
            return `<img src="${safeSrc}" alt="${alt}">`;
        });

        // Blockquotes
        html = html.replace(/^&gt; (.+)$/gm, '<blockquote><p>$1</p></blockquote>');

        // Tables
        html = parseTable(html);

        // Unordered lists
        html = html.replace(/^(\s*)[-*] (.+)$/gm, (match, indent, content) => {
            const level = Math.floor(indent.length / 2);
            return `<li data-level="${level}">${content}</li>`;
        });

        // Wrap list items in <ul>
        html = html.replace(/((?:<li[^>]*>.*?<\/li>\n?)+)/g, '<ul>$1</ul>');

        // Ordered lists
        html = html.replace(/^(\d+)\. (.+)$/gm, '<oli>$2</oli>');
        html = html.replace(/((?:<oli>.*?<\/oli>\n?)+)/g, (match) => {
            return '<ol>' + match.replace(/<\/?oli>/g, (tag) => tag.replace('oli', 'li')) + '</ol>';
        });

        // Paragraphs (lines not already wrapped)
        html = html.replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>');

        // Clean up empty paragraphs
        html = html.replace(/<p>\s*<\/p>/g, '');

        // Fix nested lists (basic)
        html = html.replace(/<\/ul>\s*<ul>/g, '');
        html = html.replace(/<\/ol>\s*<ol>/g, '');

        return html;
    }

    /**
     * Parse markdown tables
     * @param {string} html - HTML with potential table markdown
     * @returns {string} - HTML with tables converted
     */
    function parseTable(html) {
        const tableRegex = /^(\|.+\|)\n(\|[-:\s|]+\|)\n((?:\|.+\|\n?)+)/gm;

        return html.replace(tableRegex, (match, headerRow, separatorRow, bodyRows) => {
            // Parse header
            const headers = headerRow.split('|').filter(cell => cell.trim());
            const headerHtml = headers.map(h => `<th>${h.trim()}</th>`).join('');

            // Parse body rows
            const rows = bodyRows.trim().split('\n');
            const bodyHtml = rows.map(row => {
                const cells = row.split('|').filter(cell => cell.trim());
                return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
            }).join('');

            return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
        });
    }

    /**
     * Dragging handlers
     */
    function startDrag(e) {
        if (e.target.closest('.help-modal-actions')) return;
        if (modalElement.classList.contains('fullscreen')) return;

        isDragging = true;
        const rect = modalElement.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        modalElement.style.transition = 'none';
    }

    function handleDrag(e) {
        if (!isDragging) return;

        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;

        modalElement.style.left = `${x}px`;
        modalElement.style.top = `${y}px`;
        modalElement.style.transform = 'none';
    }

    function stopDrag() {
        isDragging = false;
        modalElement.style.transition = '';
    }

    /**
     * Resizing handlers
     */
    function startResize(e) {
        if (modalElement.classList.contains('fullscreen')) return;

        isResizing = e.target.className.replace('help-modal-resize ', '');
        const rect = modalElement.getBoundingClientRect();
        resizeStart = {
            x: e.clientX,
            y: e.clientY,
            width: rect.width,
            height: rect.height,
            left: rect.left,
            top: rect.top
        };
        modalElement.style.transition = 'none';
        e.preventDefault();
    }

    function handleResize(e) {
        if (!isResizing) return;

        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;

        if (isResizing.includes('e') || isResizing.includes('se')) {
            const newWidth = Math.max(400, resizeStart.width + dx);
            modalElement.style.width = `${newWidth}px`;
        }

        if (isResizing.includes('s') || isResizing.includes('se')) {
            const newHeight = Math.max(300, resizeStart.height + dy);
            modalElement.style.height = `${newHeight}px`;
        }

        // Keep modal centered during resize if using transform
        if (modalElement.style.transform !== 'none') {
            modalElement.style.left = `${resizeStart.left}px`;
            modalElement.style.top = `${resizeStart.top}px`;
            modalElement.style.transform = 'none';
        }
    }

    function stopResize() {
        isResizing = false;
        modalElement.style.transition = '';
    }

    /**
     * Update modal title
     * @param {string} title - New title
     */
    function setTitle(title) {
        config.title = title;
        const titleSpan = modalElement?.querySelector('.help-modal-title span');
        if (titleSpan) {
            titleSpan.textContent = title;
        }
    }

    /**
     * Check if modal is currently open
     * @returns {boolean}
     */
    function isModalOpen() {
        return isOpen;
    }

    // Public API
    return {
        init,
        open,
        close,
        toggleFullscreen,
        setTitle,
        isOpen: isModalOpen
    };
})();

// Auto-export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HelpModal;
}
