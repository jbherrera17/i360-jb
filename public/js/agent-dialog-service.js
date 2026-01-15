/**
 * Agent Dialog Service
 *
 * Provides a modal chat interface for running AI agents with:
 * - Interactive conversation with agents
 * - Streaming responses
 * - Conversation history persistence
 * - Result storage for strategy and integrity
 * - Drag and resize functionality
 *
 * @version 2.1.0
 * @author Insight 360
 */

class AgentDialogService {
    /**
     * Initialize the Agent Dialog Service
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            containerId: options.containerId || 'agent-dialog-container',
            allowClose: options.allowClose !== false,
            onClose: options.onClose || null,
            onError: options.onError || this.defaultErrorHandler.bind(this),
            minWidth: options.minWidth || 400,
            minHeight: options.minHeight || 400,
            defaultWidth: options.defaultWidth || 600,
            closeOnOverlayClick: options.closeOnOverlayClick !== false
        };

        this.state = {
            isOpen: false,
            isStreaming: false,
            currentAgent: null,
            conversationHistory: [],
            conversationId: null,
            sessionId: null,
            moduleNum: null,
            result: null,
            error: null,
            abortController: null
        };

        // Drag and resize state
        this.dragState = {
            isDragging: false,
            isResizing: false,
            resizeDirection: null,
            startX: 0,
            startY: 0,
            startWidth: 0,
            startHeight: 0,
            startLeft: 0,
            startTop: 0,
            startBottom: 0,
            startRight: 0,
            justFinishedInteraction: false
        };

        this.callbacks = {
            onAccept: null,
            onEdit: null,
            onRegenerate: null
        };

        this.elements = {};

        // Bind drag/resize handlers
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);

        this.init();
    }

    /**
     * Initialize the dialog container
     */
    init() {
        let container = document.getElementById(this.options.containerId);

        if (!container) {
            container = document.createElement('div');
            container.id = this.options.containerId;
            document.body.appendChild(container);
        }

        container.innerHTML = this.getModalHTML();
        this.cacheElements(container);
        this.bindEvents();
        this.addResizeHandles();
        this.bindDragResizeEvents();
    }

    /**
     * Cache element references
     */
    cacheElements(container) {
        this.elements = {
            container: container,
            overlay: container.querySelector('.agent-dialog-overlay'),
            dialog: container.querySelector('.agent-dialog'),
            header: container.querySelector('.agent-dialog-header'),
            title: container.querySelector('.agent-dialog-title'),
            subtitle: container.querySelector('.agent-dialog-subtitle'),
            closeBtn: container.querySelector('.agent-dialog-close'),
            messagesContainer: container.querySelector('.agent-dialog-messages'),
            inputContainer: container.querySelector('.agent-dialog-input-container'),
            input: container.querySelector('.agent-dialog-input'),
            sendBtn: container.querySelector('.agent-dialog-send'),
            typingIndicator: container.querySelector('.agent-dialog-typing'),
            actions: container.querySelector('.agent-dialog-actions'),
            acceptBtn: container.querySelector('.agent-dialog-accept'),
            cancelBtn: container.querySelector('.agent-dialog-cancel')
        };
    }

    /**
     * Generate modal HTML structure - Chat-based UI
     */
    getModalHTML() {
        return `
            <div class="agent-dialog-overlay">
                <div class="agent-dialog agent-dialog-chat" role="dialog" aria-modal="true">
                    <!-- Header -->
                    <div class="agent-dialog-header">
                        <div class="agent-dialog-header-content">
                            <div class="agent-dialog-avatar">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
                                    <path d="M12 8v4l3 3"/>
                                </svg>
                            </div>
                            <div>
                                <h2 class="agent-dialog-title">AI Agent</h2>
                                <p class="agent-dialog-subtitle">Ready to assist</p>
                            </div>
                        </div>
                        <button class="agent-dialog-close" aria-label="Close dialog">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    <!-- Chat Messages Area -->
                    <div class="agent-dialog-body">
                        <div class="agent-dialog-messages"></div>

                        <!-- Typing Indicator -->
                        <div class="agent-dialog-typing" style="display: none;">
                            <div class="typing-dots">
                                <span></span><span></span><span></span>
                            </div>
                            <span class="typing-text">Agent is thinking...</span>
                        </div>
                    </div>

                    <!-- Input Area -->
                    <div class="agent-dialog-input-container">
                        <textarea class="agent-dialog-input"
                                  placeholder="Type your message..."
                                  rows="1"></textarea>
                        <button class="agent-dialog-send" title="Send message">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                            </svg>
                        </button>
                    </div>

                    <!-- Footer Actions -->
                    <div class="agent-dialog-actions">
                        <button class="agent-dialog-action agent-dialog-cancel">Cancel</button>
                        <button class="agent-dialog-action primary agent-dialog-accept">Save & Continue</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        // Close button
        this.elements.closeBtn.addEventListener('click', () => {
            if (!this.state.isStreaming || this.options.allowClose) {
                this.confirmClose();
            }
        });

        // Overlay click to close
        this.elements.overlay.addEventListener('click', (e) => {
            // Don't close if we just finished resizing or dragging
            if (this.dragState.justFinishedInteraction) {
                this.dragState.justFinishedInteraction = false;
                return;
            }
            if (e.target === this.elements.overlay && this.options.closeOnOverlayClick) {
                if (!this.state.isStreaming || this.options.allowClose) {
                    this.confirmClose();
                }
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state.isOpen) {
                if (!this.state.isStreaming || this.options.allowClose) {
                    this.confirmClose();
                }
            }
        });

        // Send button
        this.elements.sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter to send (Shift+Enter for new line)
        this.elements.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        this.elements.input.addEventListener('input', () => {
            this.autoResizeInput();
        });

        // Accept button
        this.elements.acceptBtn.addEventListener('click', () => {
            this.acceptResults();
        });

        // Cancel button
        this.elements.cancelBtn.addEventListener('click', () => {
            this.confirmClose();
        });
    }

    /**
     * Run an interactive agent chat session
     * @param {string} agentId - Agent ID or identifier
     * @param {Object} context - Context data for the agent
     * @param {Object} options - Execution options
     */
    async runAgent(agentId, context, options = {}) {
        const config = {
            title: options.title || 'AI Agent',
            subtitle: options.subtitle || 'Ready to assist',
            endpoint: options.endpoint || '/api/chat/stream',
            systemPrompt: options.systemPrompt || null,
            initialMessage: options.initialMessage || null,
            onAccept: options.onAccept || null,
            onEdit: options.onEdit || null,
            onRegenerate: options.onRegenerate || null
        };

        // Store callbacks
        this.callbacks = {
            onAccept: config.onAccept,
            onEdit: config.onEdit,
            onRegenerate: config.onRegenerate
        };

        // Store context
        this.state.currentAgent = agentId;
        this.state.sessionId = context.sessionId;
        this.state.moduleNum = context.moduleNum;
        this.state.conversationHistory = [];
        this.state.endpoint = config.endpoint;
        this.state.systemPrompt = config.systemPrompt;
        this.state.context = context;

        // Open modal
        this.open(config.title, config.subtitle);

        // Add initial context message if provided
        if (config.initialMessage) {
            this.addMessage('system', config.initialMessage);
        }

        // Send initial greeting/prompt to agent
        await this.startAgentConversation(context);

        return new Promise((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    /**
     * Start the agent conversation with initial context
     */
    async startAgentConversation(context) {
        const initialPrompt = this.buildInitialPrompt(context);

        // Add as system context (not shown as user message)
        this.state.conversationHistory.push({
            role: 'user',
            content: initialPrompt
        });

        // Get agent's initial response
        await this.streamAgentResponse();
    }

    /**
     * Build initial prompt from context
     */
    buildInitialPrompt(context) {
        let prompt = `You are running an assessment session.`;

        if (context.companyName) {
            prompt += `\n\nCompany: ${context.companyName}`;
        }

        if (context.moduleNum) {
            const moduleNames = {
                1: 'AI Audit & Assessment',
                2: 'Business Fundamentals',
                3: 'Team UpSkilling',
                4: 'Brand Alignment',
                5: 'Corporate Alignment'
            };
            prompt += `\n\nModule: ${context.moduleNum} - ${moduleNames[context.moduleNum] || 'Assessment'}`;
        }

        if (context.companyContext) {
            prompt += `\n\n${context.companyContext}`;
        }

        prompt += `\n\nPlease begin the assessment by introducing yourself and asking the first question. Guide the user through the assessment conversationally, asking one question at a time. After gathering sufficient information, provide your analysis and recommendations.`;

        return prompt;
    }

    /**
     * Send a user message
     */
    async sendMessage() {
        const message = this.elements.input.value.trim();
        if (!message || this.state.isStreaming) return;

        // Clear input
        this.elements.input.value = '';
        this.autoResizeInput();

        // Add user message to UI and history
        this.addMessage('user', message);
        this.state.conversationHistory.push({
            role: 'user',
            content: message
        });

        // Get agent response
        await this.streamAgentResponse();
    }

    /**
     * Stream agent response
     */
    async streamAgentResponse() {
        this.state.isStreaming = true;
        this.showTypingIndicator(true);
        this.elements.sendBtn.disabled = true;

        try {
            this.state.abortController = new AbortController();

            const response = await fetch(this.state.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify({
                    messages: this.state.conversationHistory,
                    model: 'claude-sonnet-4-5-20250929',
                    systemPrompt: this.state.systemPrompt,
                    context: this.state.context,
                    stream: true
                }),
                signal: this.state.abortController.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Create assistant message element
            const messageEl = this.addMessage('assistant', '', true);
            const contentEl = messageEl.querySelector('.message-content');
            let fullResponse = '';

            // Process stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.type === 'content' || data.text) {
                                const text = data.content || data.text || '';
                                fullResponse += text;
                                contentEl.innerHTML = this.formatMarkdown(fullResponse);
                                this.scrollToBottom();
                            } else if (data.type === 'done' || data.type === 'complete') {
                                // Stream complete
                            } else if (data.type === 'error') {
                                throw new Error(data.error || 'Stream error');
                            }
                        } catch (parseError) {
                            // Handle non-JSON lines or partial chunks
                            if (!parseError.message.includes('JSON')) {
                                console.error('Stream parse error:', parseError);
                            }
                        }
                    }
                }
            }

            // Add to conversation history
            if (fullResponse) {
                this.state.conversationHistory.push({
                    role: 'assistant',
                    content: fullResponse
                });
            }

            this.showTypingIndicator(false);
            messageEl.classList.remove('streaming');

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Stream aborted');
            } else {
                console.error('Stream error:', error);
                this.addMessage('system', `Error: ${error.message}. Please try again.`);
            }
            this.showTypingIndicator(false);
        } finally {
            this.state.isStreaming = false;
            this.elements.sendBtn.disabled = false;
            this.state.abortController = null;
        }
    }

    /**
     * Add a message to the chat
     */
    addMessage(role, content, isStreaming = false) {
        const messageEl = document.createElement('div');
        messageEl.className = `agent-message ${role}${isStreaming ? ' streaming' : ''}`;

        const avatar = role === 'assistant'
            ? `<div class="message-avatar agent"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></div>`
            : role === 'user'
            ? `<div class="message-avatar user"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>`
            : '';

        messageEl.innerHTML = `
            ${avatar}
            <div class="message-body">
                <div class="message-content">${this.formatMarkdown(content)}</div>
            </div>
        `;

        this.elements.messagesContainer.appendChild(messageEl);
        this.scrollToBottom();

        return messageEl;
    }

    /**
     * Format markdown to HTML
     */
    formatMarkdown(text) {
        if (!text) return '';

        return text
            // Code blocks first (before other transformations)
            .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
            // Headers
            .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Horizontal rule
            .replace(/^---$/gm, '<hr>')
            // Unordered lists
            .replace(/^\s*[-*]\s+(.*$)/gm, '<li>$1</li>')
            // Numbered lists
            .replace(/^\s*(\d+)\.\s+(.*$)/gm, '<li>$2</li>')
            // Paragraphs (double newline)
            .replace(/\n\n/g, '</p><p>')
            // Line breaks
            .replace(/\n/g, '<br>');
    }

    /**
     * Show/hide typing indicator
     */
    showTypingIndicator(show) {
        this.elements.typingIndicator.style.display = show ? 'flex' : 'none';
        if (show) this.scrollToBottom();
    }

    /**
     * Scroll messages to bottom
     */
    scrollToBottom() {
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }

    /**
     * Auto-resize input textarea
     */
    autoResizeInput() {
        const input = this.elements.input;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    }

    /**
     * Open the dialog
     */
    open(title, subtitle) {
        this.state.isOpen = true;
        this.state.error = null;
        this.state.conversationHistory = [];

        // Clear previous messages and input
        this.elements.messagesContainer.innerHTML = '';
        this.elements.input.value = '';
        this.autoResizeInput();

        this.elements.title.textContent = title || 'AI Agent';
        this.elements.subtitle.textContent = subtitle || 'Ready to assist';

        // Reset and center modal
        this.resetModalSize();

        this.elements.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Focus input and center after DOM update
        setTimeout(() => {
            this.centerModal();
            this.elements.input.focus();
        }, 50);
    }

    /**
     * Confirm before closing if there's conversation history
     */
    confirmClose() {
        if (this.state.conversationHistory.length > 1) {
            const confirmed = confirm('You have an active conversation. Are you sure you want to close without saving?');
            if (!confirmed) return;
        }
        this.close();
    }

    /**
     * Close the dialog
     */
    close() {
        // Abort any streaming
        if (this.state.abortController) {
            this.state.abortController.abort();
        }

        this.state.isOpen = false;
        this.elements.overlay.classList.remove('active');
        document.body.style.overflow = '';

        // Resolve promise with null (cancelled)
        if (this.resolvePromise) {
            this.resolvePromise(null);
            this.resolvePromise = null;
        }

        if (this.options.onClose) {
            this.options.onClose();
        }
    }

    /**
     * Accept and save results
     */
    async acceptResults() {
        const result = {
            conversationHistory: this.state.conversationHistory,
            moduleNum: this.state.moduleNum,
            sessionId: this.state.sessionId,
            agentId: this.state.currentAgent,
            completedAt: new Date().toISOString()
        };

        // Extract key outputs from conversation
        result.outputs = this.extractOutputs();

        // Call onAccept callback
        if (this.callbacks.onAccept) {
            await this.callbacks.onAccept(result);
        }

        // Resolve promise with result
        if (this.resolvePromise) {
            this.resolvePromise(result);
            this.resolvePromise = null;
        }

        this.close();
    }

    /**
     * Extract key outputs from conversation for storage
     */
    extractOutputs() {
        const outputs = {};
        const assistantMessages = this.state.conversationHistory
            .filter(m => m.role === 'assistant')
            .map(m => m.content);

        // Combine all assistant responses
        outputs.fullResponse = assistantMessages.join('\n\n---\n\n');
        outputs.messageCount = this.state.conversationHistory.length;
        outputs.assistantMessages = assistantMessages.length;

        return outputs;
    }

    /**
     * Default error handler
     */
    defaultErrorHandler(error) {
        console.error('AgentDialogService error:', error);
    }

    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ================================
    // Drag and Resize Functionality
    // ================================

    /**
     * Add resize handles to the modal
     */
    addResizeHandles() {
        // Remove any existing resize handles
        this.elements.dialog.querySelectorAll('.resize-handle').forEach(h => h.remove());

        // Add all 8 resize handles (edges + corners)
        const handles = [
            'top', 'bottom', 'left', 'right',
            'top-left', 'top-right', 'bottom-left', 'bottom-right'
        ];

        handles.forEach(dir => {
            const handle = document.createElement('div');
            handle.className = `resize-handle ${dir}`;
            handle.dataset.resize = dir;
            this.elements.dialog.appendChild(handle);
        });
    }

    /**
     * Bind drag and resize event handlers
     */
    bindDragResizeEvents() {
        // Drag by header
        this.elements.header.addEventListener('mousedown', this.startDrag.bind(this));

        // Resize by handles
        const handles = this.elements.dialog.querySelectorAll('.resize-handle');
        handles.forEach(handle => {
            handle.addEventListener('mousedown', this.startResize.bind(this));
        });

        // Global mouse events
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
    }

    /**
     * Center the modal in the viewport
     */
    centerModal() {
        if (!this.elements.dialog || !this.elements.overlay) return;

        const overlayRect = this.elements.overlay.getBoundingClientRect();
        const dialogRect = this.elements.dialog.getBoundingClientRect();

        const left = (overlayRect.width - dialogRect.width) / 2;
        const top = (overlayRect.height - dialogRect.height) / 2;

        this.elements.dialog.style.left = `${Math.max(0, left)}px`;
        this.elements.dialog.style.top = `${Math.max(20, top)}px`;
    }

    /**
     * Reset modal to default size and center
     */
    resetModalSize() {
        if (!this.elements.dialog) return;
        this.elements.dialog.style.width = `${this.options.defaultWidth}px`;
        this.elements.dialog.style.height = '';
        this.elements.dialog.style.maxHeight = '80vh';
        this.centerModal();
    }

    /**
     * Start dragging the modal
     */
    startDrag(e) {
        // Don't drag if clicking interactive elements
        if (e.target.closest('.agent-dialog-close') ||
            e.target.closest('button') ||
            e.target.closest('input') ||
            e.target.closest('textarea')) return;

        this.dragState.isDragging = true;
        this.dragState.startX = e.clientX;
        this.dragState.startY = e.clientY;

        const rect = this.elements.dialog.getBoundingClientRect();
        const overlayRect = this.elements.overlay.getBoundingClientRect();

        this.dragState.startLeft = rect.left - overlayRect.left;
        this.dragState.startTop = rect.top - overlayRect.top;

        this.elements.dialog.style.transition = 'none';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    }

    /**
     * Start resizing the modal
     */
    startResize(e) {
        e.stopPropagation();
        e.preventDefault();

        this.dragState.isResizing = true;
        this.dragState.resizeDirection = e.target.dataset.resize;
        this.dragState.startX = e.clientX;
        this.dragState.startY = e.clientY;

        const rect = this.elements.dialog.getBoundingClientRect();
        const overlayRect = this.elements.overlay.getBoundingClientRect();

        this.dragState.startWidth = rect.width;
        this.dragState.startHeight = rect.height;
        this.dragState.startLeft = rect.left - overlayRect.left;
        this.dragState.startTop = rect.top - overlayRect.top;

        // Store initial edges for anchoring
        this.dragState.startBottom = this.dragState.startTop + this.dragState.startHeight;
        this.dragState.startRight = this.dragState.startLeft + this.dragState.startWidth;

        this.elements.dialog.style.transition = 'none';
        document.body.style.userSelect = 'none';
    }

    /**
     * Handle mouse move for drag/resize
     */
    onMouseMove(e) {
        if (this.dragState.isDragging) {
            const deltaX = e.clientX - this.dragState.startX;
            const deltaY = e.clientY - this.dragState.startY;

            const newLeft = this.dragState.startLeft + deltaX;
            const newTop = this.dragState.startTop + deltaY;

            // Keep modal within viewport
            const maxLeft = this.elements.overlay.clientWidth - 100;
            const maxTop = this.elements.overlay.clientHeight - 50;

            this.elements.dialog.style.left = `${Math.max(-100, Math.min(maxLeft, newLeft))}px`;
            this.elements.dialog.style.top = `${Math.max(0, Math.min(maxTop, newTop))}px`;
        }

        if (this.dragState.isResizing) {
            const deltaX = e.clientX - this.dragState.startX;
            const deltaY = e.clientY - this.dragState.startY;
            const dir = this.dragState.resizeDirection;
            const minWidth = this.options.minWidth;
            const minHeight = this.options.minHeight;

            let newWidth = this.dragState.startWidth;
            let newHeight = this.dragState.startHeight;
            let newLeft = this.dragState.startLeft;
            let newTop = this.dragState.startTop;

            // Handle right edge
            if (dir.includes('right')) {
                newWidth = Math.max(minWidth, this.dragState.startWidth + deltaX);
            }

            // Handle left edge
            if (dir.includes('left')) {
                const potentialWidth = this.dragState.startWidth - deltaX;
                if (potentialWidth >= minWidth) {
                    newWidth = potentialWidth;
                    newLeft = this.dragState.startLeft + deltaX;
                } else {
                    newWidth = minWidth;
                    newLeft = this.dragState.startRight - minWidth;
                }
            }

            // Handle bottom edge
            if (dir.includes('bottom')) {
                newHeight = Math.max(minHeight, this.dragState.startHeight + deltaY);
            }

            // Handle top edge
            if (dir.includes('top')) {
                const potentialHeight = this.dragState.startHeight - deltaY;
                if (potentialHeight >= minHeight) {
                    newHeight = potentialHeight;
                    newTop = this.dragState.startTop + deltaY;
                } else {
                    newHeight = minHeight;
                    newTop = this.dragState.startBottom - minHeight;
                }
            }

            this.elements.dialog.style.width = `${newWidth}px`;
            this.elements.dialog.style.height = `${newHeight}px`;
            this.elements.dialog.style.left = `${newLeft}px`;
            this.elements.dialog.style.top = `${newTop}px`;
            this.elements.dialog.style.maxHeight = 'none';
        }
    }

    /**
     * Handle mouse up to end drag/resize
     */
    onMouseUp() {
        // Track if we were interacting to prevent overlay click from closing
        if (this.dragState.isDragging || this.dragState.isResizing) {
            this.dragState.justFinishedInteraction = true;
            // Reset flag after a short delay
            setTimeout(() => {
                this.dragState.justFinishedInteraction = false;
            }, 100);
        }

        this.dragState.isDragging = false;
        this.dragState.isResizing = false;
        this.dragState.resizeDirection = null;
        document.body.style.userSelect = '';

        if (this.elements.dialog) {
            this.elements.dialog.style.transition = '';
        }
    }

    /**
     * Destroy and clean up event listeners
     */
    destroy() {
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AgentDialogService;
}
