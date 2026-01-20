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
                this.contextState.loadedModels = data.models;

                // Group models by provider
                const grouped = {};
                data.models.forEach(model => {
                    const provider = model.provider || 'other';
                    if (!grouped[provider]) grouped[provider] = [];
                    grouped[provider].push(model);
                });

                // Provider display names
                const providerNames = {
                    'anthropic': 'Anthropic Claude',
                    'openai': 'OpenAI GPT',
                    'perplexity': 'Perplexity (Web Search)',
                    'other': 'Other'
                };

                // Build HTML
                let html = '';
                const providerOrder = ['anthropic', 'openai', 'perplexity', 'other'];

                providerOrder.forEach(provider => {
                    if (grouped[provider] && grouped[provider].length > 0) {
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
