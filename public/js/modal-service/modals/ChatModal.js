/**
 * ChatModal - Base class for chat-like interfaces in modals
 * @extends ModalBase
 * @version 1.0.0
 */

class ChatModal extends ModalBase {
    /**
     * Create a chat modal
     * @param {Object} options - Chat modal options
     * @param {string} options.title - Modal title
     * @param {string} [options.placeholder='Type a message...'] - Input placeholder
     * @param {Array} [options.messages=[]] - Initial messages
     * @param {boolean} [options.showTimestamps=false] - Show message timestamps
     * @param {Function} [options.onSend] - Callback when message is sent
     * @param {Function} [options.formatMessage] - Custom message formatter
     * @param {string} [options.userAvatar] - Custom avatar URL for user messages
     * @param {string} [options.assistantAvatar] - Custom avatar URL for assistant messages
     * @param {string} [options.systemAvatar] - Custom avatar URL for system messages
     * @param {boolean} [options.showUserAvatar=false] - Show avatar for user messages
     */
    constructor(options = {}) {
        super({
            ...options,
            title: options.title || 'Chat',
            draggable: options.draggable !== false,
            resizable: options.resizable !== false,
            maximizable: options.maximizable !== false,
            width: options.width || 500,
            height: options.height || 600,
            minSize: options.minSize || { width: 400, height: 400 },
            className: `i360-chat-modal ${options.className || ''}`.trim()
        });

        this.chatOptions = {
            placeholder: options.placeholder || 'Type a message...',
            messages: options.messages || [],
            showTimestamps: options.showTimestamps || false,
            onSend: options.onSend,
            formatMessage: options.formatMessage,
            userAvatar: options.userAvatar || null,
            assistantAvatar: options.assistantAvatar || null,
            systemAvatar: options.systemAvatar || '/assets/Higgins02.svg',
            showUserAvatar: options.showUserAvatar || false
        };

        this._isStreaming = false;
        this._currentStreamMessage = null;
    }

    /**
     * Create modal elements
     * @protected
     */
    _createElements() {
        super._createElements();

        // Override body structure for chat layout
        this.elements.body.className = 'i360-chat-modal-body';
        this.elements.body.innerHTML = `
            <div class="i360-chat-messages" role="log" aria-live="polite"></div>
            <div class="i360-chat-input-area">
                <div class="i360-chat-input-wrapper">
                    <textarea
                        class="i360-chat-input"
                        placeholder="${this._escapeHtml(this.chatOptions.placeholder)}"
                        rows="1"
                        aria-label="Message input"
                    ></textarea>
                    <button type="button" class="i360-chat-send" aria-label="Send message">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        // Store element references
        this.elements.messagesContainer = this.elements.body.querySelector('.i360-chat-messages');
        this.elements.inputArea = this.elements.body.querySelector('.i360-chat-input-area');
        this.elements.input = this.elements.body.querySelector('.i360-chat-input');
        this.elements.sendButton = this.elements.body.querySelector('.i360-chat-send');

        // Hide default footer
        this.elements.footer.style.display = 'none';

        // Bind events
        this._bindChatEvents();

        // Render initial messages
        this.chatOptions.messages.forEach(msg => this._renderMessage(msg));
    }

    /**
     * Bind chat-specific events
     * @private
     */
    _bindChatEvents() {
        // Send on button click
        this.elements.sendButton.addEventListener('click', () => this._handleSend());

        // Send on Enter (Shift+Enter for newline)
        this.elements.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this._handleSend();
            }
        });

        // Auto-resize textarea
        this.elements.input.addEventListener('input', () => this._autoResizeInput());

        // Enable/disable send button based on input
        this.elements.input.addEventListener('input', () => {
            this.elements.sendButton.disabled = !this.elements.input.value.trim();
        });

        // Initial state
        this.elements.sendButton.disabled = true;
    }

    /**
     * Auto-resize textarea
     * @private
     */
    _autoResizeInput() {
        const input = this.elements.input;
        input.style.height = 'auto';
        const newHeight = Math.min(input.scrollHeight, 120);
        input.style.height = `${newHeight}px`;
    }

    /**
     * Handle send message
     * @private
     */
    _handleSend() {
        const content = this.elements.input.value.trim();
        if (!content || this._isStreaming) return;

        // Add user message
        const userMessage = {
            role: 'user',
            content: content,
            timestamp: new Date()
        };

        this.addMessage(userMessage);

        // Clear input
        this.elements.input.value = '';
        this._autoResizeInput();
        this.elements.sendButton.disabled = true;

        // Emit event and call callback
        this.emit('send', { modal: this, message: userMessage });

        if (typeof this.chatOptions.onSend === 'function') {
            this.chatOptions.onSend(content, userMessage);
        }
    }

    /**
     * Render a message element
     * @private
     * @param {Object} message - Message object
     * @returns {HTMLElement}
     */
    _renderMessage(message) {
        const el = document.createElement('div');
        el.className = `i360-chat-message i360-chat-message-${message.role}`;

        if (message.id) {
            el.dataset.messageId = message.id;
        }

        // Format content
        let content = message.content;
        if (typeof this.chatOptions.formatMessage === 'function') {
            content = this.chatOptions.formatMessage(message);
        } else {
            content = this._formatMessageContent(message.content, message.role);
        }

        // Build message HTML
        let html = '';

        // Avatar rendering
        const avatarHtml = this._getAvatarHtml(message.role, message.avatar);
        if (avatarHtml) {
            html += avatarHtml;
        }

        html += `<div class="i360-chat-message-content">${content}</div>`;

        // Timestamp
        if (this.chatOptions.showTimestamps && message.timestamp) {
            const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            html += `<div class="i360-chat-timestamp">${time}</div>`;
        }

        el.innerHTML = html;
        this.elements.messagesContainer.appendChild(el);
        this._scrollToBottom();

        return el;
    }

    /**
     * Format message content
     * @private
     * @param {string} content
     * @param {string} role
     * @returns {string}
     */
    _formatMessageContent(content, role) {
        if (role === 'user') {
            return this._escapeHtml(content).replace(/\n/g, '<br>');
        }

        // For assistant, do basic markdown formatting
        let html = this._escapeHtml(content);

        // Code blocks
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Italic
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Line breaks
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    /**
     * Get avatar HTML for a message role
     * @private
     * @param {string} role - Message role (user, assistant, system)
     * @param {string} [customAvatar] - Custom avatar URL for this specific message
     * @returns {string} Avatar HTML or empty string
     */
    _getAvatarHtml(role, customAvatar) {
        let avatarUrl = customAvatar;

        // Determine avatar based on role
        if (!avatarUrl) {
            if (role === 'assistant') {
                avatarUrl = this.chatOptions.assistantAvatar;
            } else if (role === 'user' && this.chatOptions.showUserAvatar) {
                avatarUrl = this.chatOptions.userAvatar;
            } else if (role === 'system') {
                avatarUrl = this.chatOptions.systemAvatar;
            }
        }

        // User messages only show avatar if explicitly enabled
        if (role === 'user' && !this.chatOptions.showUserAvatar && !customAvatar) {
            return '';
        }

        // Assistant always shows avatar
        if (role === 'assistant' || (role === 'user' && (this.chatOptions.showUserAvatar || customAvatar))) {
            if (avatarUrl) {
                return `
                    <div class="i360-chat-avatar i360-chat-avatar-custom">
                        <img src="${this._escapeHtml(avatarUrl)}" alt="${role} avatar" />
                    </div>
                `;
            } else if (role === 'assistant') {
                // Default assistant avatar
                return `
                    <div class="i360-chat-avatar">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                        </svg>
                    </div>
                `;
            } else if (role === 'user' && this.chatOptions.showUserAvatar) {
                // Default user avatar
                return `
                    <div class="i360-chat-avatar i360-chat-avatar-user">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                    </div>
                `;
            }
        }

        return '';
    }

    /**
     * Escape HTML
     * @private
     */
    _escapeHtml(str) {
        if (!str) return '';
        if (typeof Sanitize !== 'undefined' && Sanitize.escapeHtml) {
            return Sanitize.escapeHtml(str);
        }
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Scroll messages to bottom
     * @private
     */
    _scrollToBottom() {
        const container = this.elements.messagesContainer;
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Add a message to the chat
     * @param {Object} message - Message object with role and content
     */
    addMessage(message) {
        if (!message.id) {
            message.id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        if (!message.timestamp) {
            message.timestamp = new Date();
        }

        this.chatOptions.messages.push(message);
        this._renderMessage(message);
    }

    /**
     * Start streaming a message
     * @param {string} [role='assistant'] - Message role
     * @returns {Object} Stream controller with append() and finish() methods
     */
    startStream(role = 'assistant') {
        if (this._isStreaming) {
            console.warn('Already streaming a message');
            return null;
        }

        this._isStreaming = true;
        this.setInputEnabled(false);

        // Create message element
        const message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            role: role,
            content: '',
            timestamp: new Date()
        };

        const el = this._renderMessage(message);
        const contentEl = el.querySelector('.i360-chat-message-content');

        // Add streaming indicator
        el.classList.add('is-streaming');
        contentEl.innerHTML = '<span class="i360-chat-typing-indicator"><span></span><span></span><span></span></span>';

        this._currentStreamMessage = { message, element: el, contentElement: contentEl };

        return {
            /**
             * Append content to the streaming message
             * @param {string} chunk - Content chunk
             */
            append: (chunk) => {
                if (!this._isStreaming) return;

                message.content += chunk;
                contentEl.innerHTML = this._formatMessageContent(message.content, role);
                this._scrollToBottom();
            },

            /**
             * Finish streaming
             */
            finish: () => {
                if (!this._isStreaming) return;

                el.classList.remove('is-streaming');
                this.chatOptions.messages.push(message);
                this._isStreaming = false;
                this._currentStreamMessage = null;
                this.setInputEnabled(true);
                this.elements.input.focus();

                this.emit('streamEnd', { modal: this, message });
            },

            /**
             * Cancel streaming with error
             * @param {string} [errorMessage]
             */
            error: (errorMessage) => {
                if (!this._isStreaming) return;

                el.classList.remove('is-streaming');
                el.classList.add('has-error');
                contentEl.innerHTML = `<span class="i360-chat-error">${this._escapeHtml(errorMessage || 'An error occurred')}</span>`;

                this._isStreaming = false;
                this._currentStreamMessage = null;
                this.setInputEnabled(true);

                this.emit('streamError', { modal: this, error: errorMessage });
            }
        };
    }

    /**
     * Add a system message (info, error, etc.)
     * @param {string} content - Message content
     * @param {string} [type='info'] - Message type: info, error, warning
     */
    addSystemMessage(content, type = 'info') {
        const el = document.createElement('div');
        el.className = `i360-chat-system-message i360-chat-system-${type}`;

        // Build system message HTML with avatar
        let html = '';

        // Add system avatar (Higgins02.svg)
        if (this.chatOptions.systemAvatar) {
            html += `
                <div class="i360-chat-system-avatar">
                    <img src="${this._escapeHtml(this.chatOptions.systemAvatar)}" alt="System" />
                </div>
            `;
        }

        html += `<span class="i360-chat-system-content">${this._escapeHtml(content)}</span>`;

        el.innerHTML = html;
        this.elements.messagesContainer.appendChild(el);
        this._scrollToBottom();
    }

    /**
     * Clear all messages
     */
    clearMessages() {
        this.chatOptions.messages = [];
        this.elements.messagesContainer.innerHTML = '';
    }

    /**
     * Enable or disable input
     * @param {boolean} enabled
     */
    setInputEnabled(enabled) {
        this.elements.input.disabled = !enabled;
        this.elements.sendButton.disabled = !enabled || !this.elements.input.value.trim();

        if (enabled) {
            this.elements.inputArea.classList.remove('is-disabled');
        } else {
            this.elements.inputArea.classList.add('is-disabled');
        }
    }

    /**
     * Get all messages
     * @returns {Array}
     */
    getMessages() {
        return [...this.chatOptions.messages];
    }

    /**
     * Set placeholder text
     * @param {string} placeholder
     */
    setPlaceholder(placeholder) {
        this.chatOptions.placeholder = placeholder;
        this.elements.input.placeholder = placeholder;
    }

    /**
     * Focus the input
     */
    focusInput() {
        this.elements.input.focus();
    }

    /**
     * Check if currently streaming
     * @returns {boolean}
     */
    isStreaming() {
        return this._isStreaming;
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatModal;
}
