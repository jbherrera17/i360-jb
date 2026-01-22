/**
 * Agent Dialog Service
 *
 * Provides a modal chat interface for running AI agents with:
 * - Interactive conversation with agents
 * - Streaming responses
 * - Conversation history persistence
 * - Result storage for strategy and integrity
 * - Drag and resize functionality
 * - Context asset management (brand voice, ICP, etc.)
 * - Model selector (Claude, GPT, Perplexity for web search)
 *
 * @version 2.2.0
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
            defaultWidth: options.defaultWidth || 800,
            defaultHeight: options.defaultHeight || '75vh',
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

        // Context and model state
        this.contextState = {
            mappings: [],
            selectedOnDemandAssets: new Set(),
            loadedModels: [],
            selectedModelOverride: null,
            agentDefaultModel: 'claude-sonnet-4-5-20250929'
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
        this.initContextAndModelEvents();

        // Set global reference for inline onclick handlers
        window.agentDialogInstance = this;

        // Load available models on init
        this.loadModels();
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
            cancelBtn: container.querySelector('.agent-dialog-cancel'),
            // Context elements
            contextPreview: container.querySelector('#contextPreview'),
            contextToggle: container.querySelector('#contextToggle'),
            contextContent: container.querySelector('#contextContent'),
            tokenCount: container.querySelector('#tokenCount'),
            activeContextIndicator: container.querySelector('#activeContextIndicator'),
            activeContextPills: container.querySelector('#activeContextPills'),
            // Model selector elements
            modelSelector: container.querySelector('#modelSelector'),
            modelSelectorBtn: container.querySelector('#modelSelectorBtn'),
            modelSelectorMenu: container.querySelector('#modelSelectorMenu'),
            modelDisplayName: container.querySelector('#modelDisplayName'),
            dynamicModelOptions: container.querySelector('#dynamicModelOptions')
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

                        <!-- Model Selector -->
                        <div class="agent-dialog-model-selector" id="modelSelector">
                            <button class="agent-dialog-model-btn" id="modelSelectorBtn" title="Click to change model">
                                <span id="modelDisplayName">Claude Sonnet</span>
                                <svg class="chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M6 9l6 6 6-6"/>
                                </svg>
                            </button>
                            <div class="agent-dialog-model-menu" id="modelSelectorMenu">
                                <div class="model-group-label">Use Agent Default</div>
                                <div class="model-option selected" data-model="default">
                                    <span>Agent Default</span>
                                    <svg class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M20 6L9 17l-5-5"/>
                                    </svg>
                                </div>
                                <div id="dynamicModelOptions">
                                    <!-- Models loaded dynamically -->
                                </div>
                            </div>
                        </div>

                        <button class="agent-dialog-close" aria-label="Close dialog">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    <!-- Context Preview -->
                    <div class="agent-dialog-context-preview" id="contextPreview" style="display: none;">
                        <button class="agent-dialog-context-toggle" id="contextToggle">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                            </svg>
                            <span>Context Assets</span>
                            <span class="agent-dialog-token-count" id="tokenCount">0 tokens</span>
                            <svg class="toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M6 9l6 6 6-6"/>
                            </svg>
                        </button>
                        <div class="agent-dialog-context-content" id="contextContent">
                            <p class="agent-dialog-no-context">No context assets mapped.</p>
                        </div>
                    </div>

                    <!-- Active Context Indicator -->
                    <div class="agent-dialog-active-context" id="activeContextIndicator">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                            <polyline points="2 17 12 22 22 17"/>
                            <polyline points="2 12 12 17 22 12"/>
                        </svg>
                        <span>Active:</span>
                        <div class="agent-dialog-context-pills" id="activeContextPills"></div>
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
        // Close button (X in header)
        this.elements.closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
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

        // Cancel button (in footer)
        this.elements.cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
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

            // Build request body with selected model and context assets
            const requestBody = {
                messages: this.state.conversationHistory,
                model: this.getActiveModel(),
                systemPrompt: this.state.systemPrompt,
                context: this.state.context,
                stream: true
            };

            // Include context asset IDs if we have any active
            const activeContextIds = this.getActiveContextAssetIds();
            if (activeContextIds.length > 0) {
                requestBody.contextAssetIds = activeContextIds;
            }

            // Include agent ID for server-side context injection
            if (this.state.currentAgent) {
                requestBody.agentId = this.state.currentAgent;
            }

            const response = await fetch(this.state.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify(requestBody),
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

        // Action buttons for assistant messages (copy + artifact/export)
        const actionButtons = role === 'assistant' ? `
            <div class="message-actions">
                <button class="message-action-btn" onclick="window.agentDialogInstance.copyMessageContent(this)" title="Copy to clipboard">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                </button>
                <button class="message-action-btn" onclick="window.agentDialogInstance.openArtifactModal(this)" title="Export as document">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                </button>
            </div>
        ` : '';

        messageEl.innerHTML = `
            ${avatar}
            <div class="message-body">
                <div class="message-content">${this.formatMarkdown(content)}</div>
                ${actionButtons}
            </div>
        `;

        this.elements.messagesContainer.appendChild(messageEl);
        this.scrollToBottom();

        return messageEl;
    }

    /**
     * Format markdown to HTML with proper list handling
     */
    formatMarkdown(text) {
        if (!text) return '';

        // Process code blocks first (protect from other transformations)
        let html = text.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

        // Headers
        html = html
            .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>');

        // Bold and italic
        html = html
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Horizontal rule
        html = html.replace(/^---$/gm, '<hr>');

        // Process lists - wrap consecutive list items in ul/ol tags
        // First, mark list items with a placeholder
        html = html.replace(/^(\s*)[-*]\s+(.*$)/gm, '$1<__UL__>$2</__UL__>');
        html = html.replace(/^(\s*)(\d+)\.\s+(.*$)/gm, '$1<__OL__>$3</__OL__>');

        // Now wrap consecutive list items
        html = html.replace(/(<__UL__>.*?<\/__UL__>\n?)+/g, (match) => {
            const items = match.replace(/<__UL__>/g, '<li>').replace(/<\/__UL__>/g, '</li>').replace(/\n/g, '');
            return '<ul>' + items + '</ul>';
        });

        html = html.replace(/(<__OL__>.*?<\/__OL__>\n?)+/g, (match) => {
            const items = match.replace(/<__OL__>/g, '<li>').replace(/<\/__OL__>/g, '</li>').replace(/\n/g, '');
            return '<ol>' + items + '</ol>';
        });

        // Paragraphs - split by double newlines
        const blocks = html.split(/\n\n+/);
        html = blocks.map(block => {
            block = block.trim();
            // Don't wrap if already a block element
            if (block.match(/^<(h[1-6]|ul|ol|pre|hr|blockquote)/i)) {
                return block;
            }
            // Wrap in paragraph
            return block ? '<p>' + block.replace(/\n/g, '<br>') + '</p>' : '';
        }).filter(b => b).join('\n');

        return html;
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
     * Open the dialog with options object
     * @param {Object|string} optionsOrTitle - Options object or title string
     * @param {string} [subtitle] - Subtitle (only used if first param is string)
     */
    async open(optionsOrTitle, subtitle) {
        // Support both new options object format and legacy (title, subtitle) format
        let options = {};

        if (typeof optionsOrTitle === 'object' && optionsOrTitle !== null) {
            // New format: open({ agentId, title, subtitle, initialMessage, systemPrompt })
            options = optionsOrTitle;
        } else {
            // Legacy format: open(title, subtitle)
            options = {
                title: optionsOrTitle,
                subtitle: subtitle
            };
        }

        const title = options.title || 'AI Agent';
        const subtitleText = options.subtitle || 'Ready to assist';

        this.state.isOpen = true;
        this.state.error = null;
        this.state.conversationHistory = [];

        // Reset context state for new conversation
        this.contextState.mappings = [];
        this.contextState.selectedOnDemandAssets = new Set();
        this.contextState.selectedModelOverride = null;

        // Hide context preview by default
        if (this.elements.contextPreview) {
            this.elements.contextPreview.style.display = 'none';
            this.elements.contextPreview.classList.remove('expanded');
        }
        if (this.elements.activeContextIndicator) {
            this.elements.activeContextIndicator.classList.remove('visible');
        }

        // Reset model selector to default
        this.selectModel('default');

        // Clear previous messages and input
        this.elements.messagesContainer.innerHTML = '';
        this.elements.input.value = '';
        this.autoResizeInput();

        this.elements.title.textContent = title;
        this.elements.subtitle.textContent = subtitleText;

        // Reset modal - flexbox centering will handle positioning
        this.resetModalSize();

        this.elements.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Focus input after DOM update (no centering needed - flexbox handles it)
        setTimeout(() => {
            this.elements.input.focus();
        }, 50);

        // If agentId is provided, fetch agent and start conversation
        if (options.agentId) {
            try {
                // Fetch agent details
                const response = await fetch(`/api/agents/${options.agentId}`);
                if (!response.ok) {
                    throw new Error(`Failed to load agent: ${response.status}`);
                }
                const agentData = await response.json();
                const agent = agentData.data || agentData;

                // Update title if agent has a name and no custom title was provided
                if (agent.name && options.title === title) {
                    this.elements.title.textContent = agent.name;
                }

                // Store agent context
                this.state.currentAgent = options.agentId;
                this.state.systemPrompt = options.systemPrompt || agent.system_prompt || agent.prompt;
                this.state.endpoint = options.endpoint || '/api/chat/stream';
                this.state.context = options.context || {};

                // Set agent's default model
                this.contextState.agentDefaultModel = agent.llm_model || agent.model || 'claude-sonnet-4-5-20250929';
                if (this.elements.modelDisplayName) {
                    this.elements.modelDisplayName.textContent = this.getModelDisplayName(this.contextState.agentDefaultModel);
                }

                // Load context mappings for this agent
                await this.loadContextMappings(options.agentId);

                // If there's an initial message, add it and get agent response
                if (options.initialMessage) {
                    // Add user's initial message to history (not shown in UI)
                    this.state.conversationHistory.push({
                        role: 'user',
                        content: options.initialMessage
                    });

                    // Get agent's response
                    await this.streamAgentResponse();
                }
            } catch (error) {
                console.error('Error loading agent:', error);
                this.addMessage('system', `Error: ${error.message}. Please try again.`);
            }
        }

        return new Promise((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    /**
     * Confirm before closing if there's conversation history
     */
    async confirmClose() {
        // Always show confirmation when dialog is open
        if (this.state.isOpen) {
            // Wait for ModalService to be loaded if loader exists
            if (window.ModalServiceLoader && !window.ModalServiceLoader.isLoaded()) {
                try {
                    await window.ModalServiceLoader.load();
                } catch (e) {
                    console.warn('[AgentDialog] Failed to load ModalService:', e);
                }
            }

            // Use ModalService if available, otherwise fall back to native confirm
            if (window.ModalService && typeof window.ModalService.confirm === 'function') {
                const confirmed = await ModalService.confirm({
                    title: 'Close Conversation?',
                    message: 'Are you sure you want to close this conversation?',
                    confirmText: 'Close',
                    cancelText: 'Keep Open',
                    type: 'warning',
                    zIndex: 10100  // Higher than agent-dialog overlay (10000)
                });
                if (!confirmed) return;
            } else {
                const confirmed = confirm('Are you sure you want to close this conversation?');
                if (!confirmed) return;
            }
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
     * Accept and save results - keeps modal open for further interaction
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

        // Call onAccept callback if provided
        if (this.callbacks.onAccept) {
            await this.callbacks.onAccept(result);
        }

        // Show confirmation toast
        this.showToast('Results saved! Continue chatting or close when ready.');

        // Note: Modal stays open - user can continue conversation or manually close
        // The promise is NOT resolved here so the modal stays interactive
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
     * Show a toast notification within the dialog
     */
    showToast(message, duration = 3000) {
        // Remove existing toast if any
        const existingToast = this.elements.dialog.querySelector('.agent-dialog-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'agent-dialog-toast';
        toast.textContent = message;
        this.elements.dialog.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => toast.classList.add('show'));

        // Auto-remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Copy message content to clipboard
     */
    async copyMessageContent(button) {
        const messageEl = button.closest('.agent-message');
        const contentEl = messageEl.querySelector('.message-content');
        if (!contentEl) return;

        try {
            await navigator.clipboard.writeText(contentEl.innerText);
            // Show feedback
            const originalTitle = button.title;
            button.title = 'Copied!';
            button.classList.add('copied');
            setTimeout(() => {
                button.title = originalTitle;
                button.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    /**
     * Open artifact/export modal for a message
     */
    openArtifactModal(button) {
        const messageEl = button.closest('.agent-message');
        const contentEl = messageEl.querySelector('.message-content');
        if (!contentEl) return;

        // Get the message index to find raw markdown from conversation history
        const allMessages = this.elements.messagesContainer.querySelectorAll('.agent-message.assistant');
        const messageIndex = Array.from(allMessages).indexOf(messageEl);

        // Get raw markdown from conversation history
        const assistantMessages = this.state.conversationHistory.filter(m => m.role === 'assistant');
        const rawMarkdown = assistantMessages[messageIndex]?.content || '';

        this.currentArtifactMarkdown = rawMarkdown;  // Raw markdown for .md export
        this.currentArtifactContent = contentEl.innerText;  // Plain text fallback
        this.currentArtifactHtmlContent = contentEl.innerHTML;  // HTML for PDF/DOCX

        // Show artifact modal
        let modal = document.getElementById('agentArtifactModal');
        if (!modal) {
            this.createArtifactModal();
            modal = document.getElementById('agentArtifactModal');
        }
        modal.classList.add('active');
    }

    /**
     * Create the artifact export modal
     */
    createArtifactModal() {
        const modalHtml = `
            <div id="agentArtifactModal" class="artifact-modal">
                <div class="artifact-modal-content">
                    <div class="artifact-modal-header">
                        <h3>Export Content</h3>
                        <button class="artifact-modal-close" onclick="window.agentDialogInstance.closeArtifactModal()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <div class="artifact-options">
                        <div class="artifact-option" onclick="window.agentDialogInstance.exportAsDocument('markdown')">
                            <div class="artifact-option-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            </div>
                            <div class="artifact-option-content">
                                <div class="artifact-option-title">Export as Markdown</div>
                                <div class="artifact-option-desc">Download as .md file for docs or notes</div>
                            </div>
                            <div class="artifact-option-arrow">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                            </div>
                        </div>
                        <div class="artifact-option" onclick="window.agentDialogInstance.exportAsDocument('pdf')">
                            <div class="artifact-option-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6"/><path d="M9 11h6"/></svg>
                            </div>
                            <div class="artifact-option-content">
                                <div class="artifact-option-title">Export as PDF</div>
                                <div class="artifact-option-desc">Download as formatted PDF document</div>
                            </div>
                            <div class="artifact-option-arrow">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                            </div>
                        </div>
                        <div class="artifact-option" onclick="window.agentDialogInstance.exportAsDocument('docx')">
                            <div class="artifact-option-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                            </div>
                            <div class="artifact-option-content">
                                <div class="artifact-option-title">Export as Word</div>
                                <div class="artifact-option-desc">Download as .docx for Microsoft Word</div>
                            </div>
                            <div class="artifact-option-arrow">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Close on outside click
        const modal = document.getElementById('agentArtifactModal');
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeArtifactModal();
        });
    }

    /**
     * Close artifact modal
     */
    closeArtifactModal() {
        const modal = document.getElementById('agentArtifactModal');
        if (modal) modal.classList.remove('active');
    }

    /**
     * Export content as document
     */
    async exportAsDocument(format) {
        if (!this.currentArtifactMarkdown && !this.currentArtifactContent) {
            this.showToast('No content to export');
            return;
        }

        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `agent-output-${timestamp}`;

        try {
            if (format === 'markdown') {
                // Use raw markdown from conversation history
                const markdown = this.currentArtifactMarkdown || this.currentArtifactContent;
                const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
                this.downloadBlob(blob, `${filename}.md`);
            } else if (format === 'pdf') {
                // Open print dialog with professionally formatted content
                const printWindow = window.open('', '_blank');
                printWindow.document.write(this.getPrintHtml(this.currentArtifactHtmlContent));
                printWindow.document.close();
                // Small delay to ensure styles load
                setTimeout(() => printWindow.print(), 250);
            } else if (format === 'docx') {
                // Create proper Word document using HTML format Word can import
                const docContent = this.getWordHtml(this.currentArtifactHtmlContent);
                const blob = new Blob([docContent], {
                    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                });
                this.downloadBlob(blob, `${filename}.doc`);
            }

            this.closeArtifactModal();
            this.showToast(`Exported as ${format.toUpperCase()}`);
        } catch (err) {
            console.error('Export error:', err);
            this.showToast('Export failed');
        }
    }

    /**
     * Download a blob as file
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Get print-friendly HTML for PDF export
     */
    getPrintHtml(content) {
        const dateStr = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Insight 360 - Document Export</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; }

        @page {
            size: letter;
            margin: 1in;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11pt;
            line-height: 1.7;
            color: #1a1a2e;
            max-width: 100%;
            margin: 0;
            padding: 0;
        }

        /* Header */
        .document-header {
            border-bottom: 2px solid #6366f1;
            padding-bottom: 1rem;
            margin-bottom: 2rem;
        }

        .document-header h1 {
            font-size: 24pt;
            font-weight: 700;
            margin: 0 0 0.5rem 0;
            color: #1a1a2e;
        }

        .document-meta {
            font-size: 10pt;
            color: #666;
        }

        /* Typography */
        h1 { font-size: 20pt; font-weight: 700; margin: 1.5em 0 0.5em; color: #1a1a2e; }
        h2 { font-size: 16pt; font-weight: 600; margin: 1.5em 0 0.5em; color: #2a2a4a; border-bottom: 1px solid #e5e5e5; padding-bottom: 0.3em; }
        h3 { font-size: 13pt; font-weight: 600; margin: 1.25em 0 0.5em; color: #3a3a5a; }
        h4 { font-size: 11pt; font-weight: 600; margin: 1em 0 0.5em; color: #4a4a6a; }

        p { margin: 0 0 1em; }

        strong { font-weight: 600; }
        em { font-style: italic; }

        /* Lists */
        ul, ol {
            margin: 0.5em 0 1em 0;
            padding-left: 1.5em;
        }
        li {
            margin-bottom: 0.25em;
            line-height: 1.5;
        }
        li p {
            margin: 0;
        }
        /* Nested lists */
        li ul, li ol {
            margin: 0.25em 0 0.25em 0;
        }

        /* Code */
        pre {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 1em;
            overflow-x: auto;
            font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
            font-size: 9pt;
            line-height: 1.5;
            margin: 1em 0;
        }

        code {
            background: #f1f3f4;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
            font-size: 0.9em;
        }

        pre code {
            background: none;
            padding: 0;
        }

        /* Blockquotes */
        blockquote {
            border-left: 4px solid #6366f1;
            margin: 1em 0;
            padding: 0.5em 0 0.5em 1em;
            background: #f8f9ff;
            color: #4a4a6a;
            font-style: italic;
        }

        /* Horizontal rules */
        hr {
            border: none;
            border-top: 1px solid #e5e5e5;
            margin: 2em 0;
        }

        /* Tables */
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }

        th, td {
            border: 1px solid #ddd;
            padding: 0.5em 0.75em;
            text-align: left;
        }

        th {
            background: #f8f9fa;
            font-weight: 600;
        }

        /* Footer */
        .document-footer {
            margin-top: 3rem;
            padding-top: 1rem;
            border-top: 1px solid #e5e5e5;
            font-size: 9pt;
            color: #888;
            text-align: center;
        }

        /* Print-specific */
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .document-header { page-break-after: avoid; }
            h1, h2, h3, h4 { page-break-after: avoid; }
            pre, blockquote { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="document-header">
        <h1>Insight 360</h1>
        <div class="document-meta">Generated on ${dateStr}</div>
    </div>

    <div class="document-content">
        ${content}
    </div>

    <div class="document-footer">
        Generated by Insight 360 &bull; Values-Based AI Command Center
    </div>
</body>
</html>`;
    }

    /**
     * Get Word-compatible HTML for DOCX export
     */
    getWordHtml(content) {
        return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta charset="utf-8">
    <meta name="ProgId" content="Word.Document">
    <meta name="Generator" content="Insight 360">
    <!--[if gte mso 9]>
    <xml>
        <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
        body {
            font-family: 'Calibri', 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #000000;
        }
        h1 { font-size: 18pt; font-weight: bold; margin-top: 24pt; margin-bottom: 12pt; color: #1a1a2e; }
        h2 { font-size: 14pt; font-weight: bold; margin-top: 18pt; margin-bottom: 10pt; color: #2a2a4a; }
        h3 { font-size: 12pt; font-weight: bold; margin-top: 14pt; margin-bottom: 8pt; color: #3a3a5a; }
        h4 { font-size: 11pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; }
        p { margin-top: 0; margin-bottom: 10pt; }
        ul, ol { margin-top: 6pt; margin-bottom: 10pt; margin-left: 0; padding-left: 24pt; }
        li { margin-bottom: 3pt; line-height: 1.4; }
        li p { margin: 0; display: inline; }
        pre, code { font-family: 'Consolas', 'Courier New', monospace; font-size: 10pt; background-color: #f5f5f5; }
        pre { padding: 10pt; border: 1px solid #ddd; margin: 10pt 0; }
        blockquote { margin-left: 20pt; padding-left: 10pt; border-left: 3px solid #6366f1; font-style: italic; color: #555; }
        strong { font-weight: bold; }
        em { font-style: italic; }
        hr { border: none; border-top: 1px solid #ccc; margin: 20pt 0; }
    </style>
</head>
<body>
    ${content}
</body>
</html>`;
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
        this.elements.dialog.style.height = this.options.defaultHeight;
        this.elements.dialog.style.maxHeight = '90vh';
        this.elements.dialog.style.left = '';
        this.elements.dialog.style.top = '';
        // Remove positioned class so flexbox centering works
        this.elements.dialog.classList.remove('positioned');
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

        // Switch to absolute positioning when dragging
        this.elements.dialog.classList.add('positioned');
        this.elements.dialog.style.left = `${this.dragState.startLeft}px`;
        this.elements.dialog.style.top = `${this.dragState.startTop}px`;

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

        // Switch to absolute positioning when resizing
        this.elements.dialog.classList.add('positioned');
        this.elements.dialog.style.left = `${this.dragState.startLeft}px`;
        this.elements.dialog.style.top = `${this.dragState.startTop}px`;

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

    // ================================
    // Context Asset Management
    // ================================

    /**
     * Initialize context and model selector events
     */
    initContextAndModelEvents() {
        // Context toggle
        if (this.elements.contextToggle) {
            this.elements.contextToggle.addEventListener('click', () => {
                this.elements.contextPreview.classList.toggle('expanded');
            });
        }

        // Model selector toggle
        if (this.elements.modelSelectorBtn) {
            this.elements.modelSelectorBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.elements.modelSelector.classList.toggle('open');
            });

            // Close on outside click
            document.addEventListener('click', (e) => {
                if (this.elements.modelSelector && !this.elements.modelSelector.contains(e.target)) {
                    this.elements.modelSelector.classList.remove('open');
                }
            });

            // Handle model selection
            this.elements.modelSelectorMenu.addEventListener('click', (e) => {
                const option = e.target.closest('.model-option');
                if (option && option.dataset.model) {
                    this.selectModel(option.dataset.model);
                    this.elements.modelSelector.classList.remove('open');
                }
            });
        }
    }

    /**
     * Load context mappings for an agent
     */
    async loadContextMappings(agentId) {
        if (!agentId) return;

        try {
            const response = await fetch(`/api/agents/${agentId}/context/mappings`);
            const data = await response.json();

            if (data.success && data.data) {
                this.contextState.mappings = data.data;
                this.renderContextPreview();
                this.updateActiveContextIndicator();

                // Show context preview if there are mappings
                if (this.elements.contextPreview && data.data.length > 0) {
                    this.elements.contextPreview.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Failed to load context mappings:', error);
        }
    }

    /**
     * Render context preview panel
     */
    renderContextPreview() {
        const mappings = this.contextState.mappings;
        const content = this.elements.contextContent;
        const tokenCount = this.elements.tokenCount;

        if (!content || !mappings || mappings.length === 0) {
            if (content) {
                content.innerHTML = '<p class="agent-dialog-no-context">No context assets mapped.</p>';
            }
            if (tokenCount) {
                tokenCount.textContent = '0 tokens';
            }
            return;
        }

        // Calculate total tokens
        let totalTokens = 0;
        mappings.forEach(m => {
            const asset = m.context_assets || m;
            if (m.injection_mode === 'always' || this.contextState.selectedOnDemandAssets.has(asset.id)) {
                totalTokens += asset.tokens || this.estimateTokens(asset.content_text || JSON.stringify(asset.content_json || {}));
            }
        });
        tokenCount.textContent = `~${totalTokens} tokens`;

        // Render items
        content.innerHTML = mappings.map(m => {
            const asset = m.context_assets || m;
            const mode = m.injection_mode || 'always';
            const isOnDemand = mode === 'on_demand';
            const isActive = mode === 'always' || this.contextState.selectedOnDemandAssets.has(asset.id);
            const assetTokens = asset.tokens || this.estimateTokens(asset.content_text || JSON.stringify(asset.content_json || {}));

            return `
                <div class="agent-dialog-context-item ${isOnDemand ? 'on-demand' : ''} ${isActive ? 'active' : ''}" data-asset-id="${asset.id}">
                    <span class="asset-icon">${this.getAssetIcon(asset.asset_type)}</span>
                    <div class="asset-info">
                        <div class="asset-name">
                            ${this.escapeHtml(asset.name)}
                            <span class="injection-mode ${mode}">${mode.replace('_', ' ')}</span>
                        </div>
                        <div class="asset-type">${asset.asset_type || ''}</div>
                    </div>
                    <span class="asset-tokens">~${assetTokens}</span>
                    ${isOnDemand ? `
                        <label class="agent-dialog-context-switch">
                            <input type="checkbox" ${this.contextState.selectedOnDemandAssets.has(asset.id) ? 'checked' : ''}
                                   onchange="window.agentDialogInstance.toggleOnDemandAsset('${asset.id}', this.checked)">
                            <span class="slider"></span>
                        </label>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    /**
     * Toggle on-demand asset selection
     */
    toggleOnDemandAsset(assetId, isChecked) {
        if (isChecked) {
            this.contextState.selectedOnDemandAssets.add(assetId);
        } else {
            this.contextState.selectedOnDemandAssets.delete(assetId);
        }
        this.renderContextPreview();
        this.updateActiveContextIndicator();
    }

    /**
     * Update active context indicator
     */
    updateActiveContextIndicator() {
        const indicator = this.elements.activeContextIndicator;
        const pillsContainer = this.elements.activeContextPills;
        if (!indicator || !pillsContainer) return;

        const activeAssets = [];
        this.contextState.mappings.forEach(m => {
            const asset = m.context_assets || m;
            const mode = m.injection_mode || 'always';

            if (mode === 'always') {
                activeAssets.push({ name: asset.name, mode: 'always' });
            } else if (mode === 'on_demand' && this.contextState.selectedOnDemandAssets.has(asset.id)) {
                activeAssets.push({ name: asset.name, mode: 'on_demand' });
            }
        });

        if (activeAssets.length > 0) {
            indicator.classList.add('visible');
            pillsContainer.innerHTML = activeAssets.map(a => `
                <span class="agent-dialog-context-pill ${a.mode}">${this.escapeHtml(a.name)}</span>
            `).join('');
        } else {
            indicator.classList.remove('visible');
            pillsContainer.innerHTML = '';
        }
    }

    /**
     * Get active context asset IDs for API requests
     */
    getActiveContextAssetIds() {
        const ids = [];
        this.contextState.mappings.forEach(m => {
            const asset = m.context_assets || m;
            const mode = m.injection_mode || 'always';

            if (mode === 'always' || this.contextState.selectedOnDemandAssets.has(asset.id)) {
                ids.push(asset.id);
            }
        });
        return ids;
    }

    /**
     * Estimate tokens for content
     */
    estimateTokens(text) {
        if (!text) return 0;
        return Math.ceil(text.length / 4);
    }

    /**
     * Get icon for asset type
     */
    getAssetIcon(assetType) {
        const icons = {
            'company_description': '🏢',
            'why_we_win': '🏆',
            'products': '📦',
            'pain_points': '🎯',
            'voice_dna': '🎤',
            'icp': '👤',
            'core_values': '💎',
            'custom_processes': '⚙️',
            'competitors': '⚔️',
            'case_studies': '📖',
            'faqs': '❓',
            'team_bios': '👥',
            'industry_context': '🌐',
            'terminology': '📚',
            'templates': '📝',
            'pricing': '💰',
            'brand_guidelines': '🎨',
            'personas': '🎭'
        };
        return icons[assetType] || '📄';
    }

    // ================================
    // Model Selector Management
    // ================================

    /**
     * Load models from API and populate selector
     */
    async loadModels() {
        const container = this.elements.dynamicModelOptions;
        if (!container) return;

        try {
            const response = await fetch('/api/chat/models');
            const data = await response.json();

            if (data.success && data.models) {
                // API returns models grouped by provider: { anthropic: [...], openai: [...], perplexity: [...] }
                const grouped = data.models;

                // Flatten for internal use (add provider field to each model)
                const flatModels = [];
                Object.entries(grouped).forEach(([provider, models]) => {
                    if (Array.isArray(models)) {
                        models.forEach(model => {
                            flatModels.push({ ...model, provider });
                        });
                    }
                });
                this.contextState.loadedModels = flatModels;

                // Provider display names
                const providerNames = {
                    'anthropic': 'Anthropic Claude',
                    'openai': 'OpenAI GPT',
                    'perplexity': 'Perplexity (Web Search)',
                    'google': 'Google Gemini',
                    'imageModels': null // Skip image models
                };

                // Build HTML
                let html = '';
                const providerOrder = ['anthropic', 'openai', 'perplexity', 'google'];

                providerOrder.forEach(provider => {
                    if (grouped[provider] && Array.isArray(grouped[provider]) && grouped[provider].length > 0) {
                        html += `<div class="model-group-label">${providerNames[provider] || provider}</div>`;
                        grouped[provider].forEach(model => {
                            html += `
                                <div class="model-option" data-model="${model.id}">
                                    <span class="model-option-name">${model.name}</span>
                                    <svg class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M20 6L9 17l-5-5"/>
                                    </svg>
                                </div>
                            `;
                        });
                    }
                });

                container.innerHTML = html;
            }
        } catch (error) {
            console.error('Failed to load models:', error);
            container.innerHTML = '<div class="model-group-label">Failed to load models</div>';
        }
    }

    /**
     * Select a model
     */
    selectModel(modelId) {
        const menu = this.elements.modelSelectorMenu;
        const btn = this.elements.modelSelectorBtn;
        const displaySpan = this.elements.modelDisplayName;

        // Clear previous selection
        menu.querySelectorAll('.model-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        // Set new selection
        const selectedOption = menu.querySelector(`[data-model="${modelId}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }

        if (modelId === 'default') {
            this.contextState.selectedModelOverride = null;
            displaySpan.textContent = this.getModelDisplayName(this.contextState.agentDefaultModel);
            btn.classList.remove('overridden');
            btn.title = 'Using agent default model. Click to change.';
        } else {
            this.contextState.selectedModelOverride = modelId;
            displaySpan.textContent = this.getModelDisplayName(modelId) + ' ✨';
            btn.classList.add('overridden');
            btn.title = `Overriding to ${this.getModelDisplayName(modelId)}. Click to change.`;
        }
    }

    /**
     * Get display name for a model ID
     */
    getModelDisplayName(modelId) {
        // Guard against loadedModels not being initialized yet
        if (Array.isArray(this.contextState.loadedModels)) {
            const model = this.contextState.loadedModels.find(m => m.id === modelId);
            if (model) return model.name;
        }

        // Fallback display names
        const fallbacks = {
            'claude-sonnet-4-5-20250929': 'Claude Sonnet',
            'claude-opus-4-5-20250929': 'Claude Opus',
            'claude-3-5-sonnet-20241022': 'Claude Sonnet 3.5',
            'gpt-4o': 'GPT-4o',
            'gpt-4-turbo': 'GPT-4 Turbo',
            'llama-3.1-sonar-huge-128k-online': 'Perplexity Sonar'
        };
        return fallbacks[modelId] || modelId;
    }

    /**
     * Get the active model for API requests
     */
    getActiveModel() {
        return this.contextState.selectedModelOverride || this.contextState.agentDefaultModel;
    }

    /**
     * Check if model is overridden
     */
    isModelOverridden() {
        return this.contextState.selectedModelOverride !== null;
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
