/**
 * Agent Dialog Service
 *
 * Provides a modal interface for running AI agents with:
 * - Progress tracking and streaming responses
 * - Workflow orchestration (multiple agents in sequence)
 * - Result display with accept/edit/regenerate actions
 * - Interactive Q&A during execution
 *
 * @version 1.0.0
 * @author Insight 360
 */

class AgentDialogService {
    /**
     * Initialize the Agent Dialog Service
     * @param {Object} options - Configuration options
     * @param {string} options.containerId - Container element ID (default: 'agent-dialog-container')
     * @param {boolean} options.allowClose - Allow closing during execution (default: false)
     * @param {Function} options.onClose - Callback when dialog closes
     * @param {Function} options.onError - Global error handler
     */
    constructor(options = {}) {
        this.options = {
            containerId: options.containerId || 'agent-dialog-container',
            allowClose: options.allowClose || false,
            onClose: options.onClose || null,
            onError: options.onError || this.defaultErrorHandler.bind(this)
        };

        this.state = {
            isOpen: false,
            isRunning: false,
            currentAgent: null,
            currentWorkflow: null,
            workflowStep: 0,
            result: null,
            error: null,
            abortController: null
        };

        this.callbacks = {
            onAccept: null,
            onEdit: null,
            onRegenerate: null
        };

        this.elements = {};
        this.init();
    }

    /**
     * Initialize the dialog container
     */
    init() {
        // Check if container already exists
        let container = document.getElementById(this.options.containerId);

        if (!container) {
            container = document.createElement('div');
            container.id = this.options.containerId;
            document.body.appendChild(container);
        }

        // Inject modal HTML
        container.innerHTML = this.getModalHTML();

        // Cache element references
        this.elements = {
            container: container,
            overlay: container.querySelector('.agent-dialog-overlay'),
            dialog: container.querySelector('.agent-dialog'),
            header: container.querySelector('.agent-dialog-header'),
            title: container.querySelector('.agent-dialog-title'),
            subtitle: container.querySelector('.agent-dialog-subtitle'),
            closeBtn: container.querySelector('.agent-dialog-close'),
            body: container.querySelector('.agent-dialog-body'),
            preparing: container.querySelector('.agent-dialog-preparing'),
            running: container.querySelector('.agent-dialog-running'),
            complete: container.querySelector('.agent-dialog-complete'),
            error: container.querySelector('.agent-dialog-error'),
            progressBar: container.querySelector('.agent-dialog-progress-bar'),
            progressPercent: container.querySelector('.agent-dialog-progress-percent'),
            statusText: container.querySelector('.agent-dialog-status-text'),
            responseStream: container.querySelector('.agent-dialog-response-stream'),
            responseContent: container.querySelector('.agent-dialog-response-content'),
            resultContent: container.querySelector('.agent-dialog-result-content'),
            errorMessage: container.querySelector('.agent-dialog-error-message'),
            workflowList: container.querySelector('.agent-workflow-list'),
            actions: container.querySelector('.agent-dialog-actions'),
            acceptBtn: container.querySelector('.agent-dialog-accept'),
            editBtn: container.querySelector('.agent-dialog-edit'),
            regenerateBtn: container.querySelector('.agent-dialog-regenerate'),
            cancelBtn: container.querySelector('.agent-dialog-cancel'),
            retryBtn: container.querySelector('.agent-dialog-retry')
        };

        // Bind event handlers
        this.bindEvents();
    }

    /**
     * Generate modal HTML structure
     */
    getModalHTML() {
        return `
            <div class="agent-dialog-overlay">
                <div class="agent-dialog" role="dialog" aria-modal="true" aria-labelledby="agent-dialog-title">
                    <!-- Header -->
                    <div class="agent-dialog-header">
                        <div class="agent-dialog-header-content">
                            <h2 id="agent-dialog-title" class="agent-dialog-title">AI Agent</h2>
                            <p class="agent-dialog-subtitle"></p>
                        </div>
                        <button class="agent-dialog-close" aria-label="Close dialog">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    <!-- Body -->
                    <div class="agent-dialog-body">
                        <!-- Preparing State -->
                        <div class="agent-dialog-preparing">
                            <div class="agent-dialog-preparing-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M12 6v6l4 2"/>
                                </svg>
                            </div>
                            <p class="agent-dialog-preparing-text">Preparing agent...</p>
                            <p class="agent-dialog-preparing-subtext">Loading context data</p>
                        </div>

                        <!-- Running State -->
                        <div class="agent-dialog-running" style="display: none;">
                            <div class="agent-dialog-progress">
                                <div class="agent-dialog-progress-header">
                                    <span class="agent-dialog-status-text">Processing...</span>
                                    <span class="agent-dialog-progress-percent">0%</span>
                                </div>
                                <div class="agent-dialog-progress-track">
                                    <div class="agent-dialog-progress-bar"></div>
                                </div>
                            </div>

                            <!-- Workflow Steps (for multi-agent execution) -->
                            <div class="agent-workflow-list" style="display: none;"></div>

                            <!-- Live Response Stream -->
                            <div class="agent-dialog-response-stream">
                                <div class="agent-dialog-response-header">
                                    <span>Live Response</span>
                                    <span class="agent-dialog-response-indicator"></span>
                                </div>
                                <div class="agent-dialog-response-content"></div>
                            </div>
                        </div>

                        <!-- Complete State -->
                        <div class="agent-dialog-complete" style="display: none;">
                            <div class="agent-dialog-complete-header">
                                <div class="agent-dialog-complete-icon success">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                        <polyline points="22 4 12 14.01 9 11.01"/>
                                    </svg>
                                </div>
                                <h3 class="agent-dialog-complete-title">Analysis Complete</h3>
                            </div>
                            <div class="agent-dialog-result">
                                <div class="agent-dialog-result-header">Results</div>
                                <div class="agent-dialog-result-content"></div>
                            </div>
                        </div>

                        <!-- Error State -->
                        <div class="agent-dialog-error" style="display: none;">
                            <div class="agent-dialog-error-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="12" y1="8" x2="12" y2="12"/>
                                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                            </div>
                            <h3 class="agent-dialog-error-title">Something went wrong</h3>
                            <p class="agent-dialog-error-message"></p>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="agent-dialog-actions">
                        <button class="agent-dialog-action agent-dialog-cancel" style="display: none;">Cancel</button>
                        <button class="agent-dialog-action agent-dialog-retry" style="display: none;">Retry</button>
                        <button class="agent-dialog-action secondary agent-dialog-regenerate" style="display: none;">Regenerate</button>
                        <button class="agent-dialog-action secondary agent-dialog-edit" style="display: none;">Edit Results</button>
                        <button class="agent-dialog-action primary agent-dialog-accept" style="display: none;">Accept & Continue</button>
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
            if (!this.state.isRunning || this.options.allowClose) {
                this.close();
            }
        });

        // Overlay click to close
        this.elements.overlay.addEventListener('click', (e) => {
            if (e.target === this.elements.overlay) {
                if (!this.state.isRunning || this.options.allowClose) {
                    this.close();
                }
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state.isOpen) {
                if (!this.state.isRunning || this.options.allowClose) {
                    this.close();
                }
            }
        });

        // Action buttons
        this.elements.acceptBtn.addEventListener('click', () => {
            if (this.callbacks.onAccept) {
                this.callbacks.onAccept(this.state.result);
            }
            this.close();
        });

        this.elements.editBtn.addEventListener('click', () => {
            if (this.callbacks.onEdit) {
                this.callbacks.onEdit(this.state.result);
            }
        });

        this.elements.regenerateBtn.addEventListener('click', () => {
            if (this.callbacks.onRegenerate) {
                this.callbacks.onRegenerate();
            }
        });

        this.elements.cancelBtn.addEventListener('click', () => {
            this.abort();
        });

        this.elements.retryBtn.addEventListener('click', () => {
            if (this.callbacks.onRegenerate) {
                this.callbacks.onRegenerate();
            }
        });
    }

    /**
     * Run a single agent with modal UI
     * @param {string} agentId - Agent ID to execute
     * @param {Object} context - Context data for the agent
     * @param {Object} options - Execution options
     * @param {string} options.title - Modal title
     * @param {string} options.subtitle - Modal subtitle
     * @param {string} options.endpoint - API endpoint (default: '/api/agents/execute')
     * @param {boolean} options.stream - Enable streaming (default: true)
     * @param {Function} options.onAccept - Accept callback
     * @param {Function} options.onEdit - Edit callback
     * @param {Function} options.onRegenerate - Regenerate callback
     * @returns {Promise<Object>} Agent result
     */
    async runAgent(agentId, context, options = {}) {
        const config = {
            title: options.title || 'AI Agent',
            subtitle: options.subtitle || 'Processing your request...',
            endpoint: options.endpoint || '/api/agents/execute',
            stream: options.stream !== false,
            onAccept: options.onAccept || null,
            onEdit: options.onEdit || null,
            onRegenerate: options.onRegenerate || null
        };

        // Store callbacks
        this.callbacks.onAccept = config.onAccept;
        this.callbacks.onEdit = config.onEdit;
        this.callbacks.onRegenerate = config.onRegenerate || (() => this.runAgent(agentId, context, options));

        // Open modal
        this.open(config.title, config.subtitle);
        this.showState('preparing');

        try {
            // Short delay for UX
            await this.delay(500);

            this.showState('running');
            this.setProgress(0, 'Initializing agent...');

            // Create abort controller for cancellation
            this.state.abortController = new AbortController();
            this.state.currentAgent = agentId;

            let result;
            if (config.stream) {
                result = await this.executeWithStreaming(agentId, context, config.endpoint);
            } else {
                result = await this.executeWithoutStreaming(agentId, context, config.endpoint);
            }

            this.state.result = result;
            this.showState('complete');
            this.displayResult(result);

            return result;
        } catch (error) {
            if (error.name === 'AbortError') {
                this.close();
                return null;
            }

            this.state.error = error;
            this.showState('error');
            this.displayError(error);
            throw error;
        } finally {
            this.state.isRunning = false;
            this.state.abortController = null;
        }
    }

    /**
     * Run a workflow (multiple agents in sequence)
     * @param {Array} agents - Array of agent configs
     * @param {Object} context - Shared context
     * @param {Object} options - Workflow options
     * @returns {Promise<Object>} Workflow results
     */
    async runWorkflow(agents, context, options = {}) {
        const config = {
            title: options.title || 'AI Workflow',
            subtitle: options.subtitle || 'Running multiple agents...',
            onAccept: options.onAccept || null,
            onEdit: options.onEdit || null,
            onRegenerate: options.onRegenerate || null,
            continueOnError: options.continueOnError || false
        };

        // Store callbacks
        this.callbacks.onAccept = config.onAccept;
        this.callbacks.onEdit = config.onEdit;
        this.callbacks.onRegenerate = config.onRegenerate || (() => this.runWorkflow(agents, context, options));

        // Open modal
        this.open(config.title, config.subtitle);
        this.showState('preparing');

        try {
            await this.delay(500);

            this.showState('running');
            this.state.currentWorkflow = agents;
            this.state.workflowStep = 0;

            // Show workflow list
            this.renderWorkflowList(agents);

            // Create abort controller
            this.state.abortController = new AbortController();

            const results = {};
            let sharedContext = { ...context };

            for (let i = 0; i < agents.length; i++) {
                if (this.state.abortController.signal.aborted) {
                    throw new DOMException('Workflow cancelled', 'AbortError');
                }

                const agent = agents[i];
                this.state.workflowStep = i;
                this.updateWorkflowStep(i, 'running');

                try {
                    // Calculate overall progress
                    const baseProgress = (i / agents.length) * 100;
                    this.setProgress(baseProgress, `Running ${agent.name || 'Agent ' + (i + 1)}...`);

                    // Merge shared context with agent-specific context
                    const agentContext = {
                        ...sharedContext,
                        ...agent.context,
                        previousResults: results
                    };

                    // Execute agent
                    const result = await this.executeWithStreaming(
                        agent.id,
                        agentContext,
                        agent.endpoint || '/api/agents/execute'
                    );

                    results[agent.id] = result;

                    // Pass results to next agent if needed
                    if (agent.passResultsAs) {
                        sharedContext[agent.passResultsAs] = result;
                    }

                    this.updateWorkflowStep(i, 'complete');
                } catch (error) {
                    this.updateWorkflowStep(i, 'error');
                    results[agent.id] = { error: error.message };

                    if (!config.continueOnError) {
                        throw error;
                    }
                }
            }

            this.state.result = results;
            this.showState('complete');
            this.displayResult(results);

            return results;
        } catch (error) {
            if (error.name === 'AbortError') {
                this.close();
                return null;
            }

            this.state.error = error;
            this.showState('error');
            this.displayError(error);
            throw error;
        } finally {
            this.state.isRunning = false;
            this.state.abortController = null;
        }
    }

    /**
     * Execute agent with streaming response
     */
    async executeWithStreaming(agentId, context, endpoint) {
        this.state.isRunning = true;
        this.elements.responseContent.textContent = '';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
            },
            body: JSON.stringify({
                agentId,
                context,
                stream: true
            }),
            signal: this.state.abortController.signal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        // Check if streaming is supported
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/event-stream')) {
            return this.processStreamResponse(response);
        } else {
            // Fallback to non-streaming
            const data = await response.json();
            this.setProgress(100, 'Complete');
            return data;
        }
    }

    /**
     * Process streaming response
     */
    async processStreamResponse(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let result = null;

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.type === 'content') {
                                fullText += data.content;
                                this.elements.responseContent.textContent = fullText;
                                this.scrollResponseToBottom();
                            } else if (data.type === 'progress') {
                                this.setProgress(data.percent, data.status);
                            } else if (data.type === 'complete') {
                                result = data.result || { response: fullText };
                                this.setProgress(100, 'Complete');
                            } else if (data.type === 'error') {
                                throw new Error(data.error);
                            }
                        } catch (parseError) {
                            // Ignore JSON parse errors for malformed chunks
                            if (parseError.message.includes('JSON')) continue;
                            throw parseError;
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        return result || { response: fullText };
    }

    /**
     * Execute agent without streaming
     */
    async executeWithoutStreaming(agentId, context, endpoint) {
        this.state.isRunning = true;
        this.setProgress(50, 'Processing...');

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                agentId,
                context,
                stream: false
            }),
            signal: this.state.abortController.signal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        this.setProgress(100, 'Complete');
        return data;
    }

    /**
     * Show result modal with accept/edit/regenerate
     * @param {Object} result - Agent/workflow result
     * @param {Function} onAccept - Accept callback
     * @param {Function} onEdit - Edit callback
     * @param {Function} onRegenerate - Regenerate callback
     */
    showResult(result, onAccept, onEdit, onRegenerate) {
        this.state.result = result;
        this.callbacks.onAccept = onAccept;
        this.callbacks.onEdit = onEdit;
        this.callbacks.onRegenerate = onRegenerate;

        this.open('Results', '');
        this.showState('complete');
        this.displayResult(result);
    }

    /**
     * Open the dialog
     */
    open(title, subtitle) {
        this.state.isOpen = true;
        this.state.error = null;

        this.elements.title.textContent = title || 'AI Agent';
        this.elements.subtitle.textContent = subtitle || '';
        this.elements.subtitle.style.display = subtitle ? 'block' : 'none';

        this.elements.overlay.classList.add('open');
        document.body.style.overflow = 'hidden';

        // Focus trap
        this.elements.dialog.focus();
    }

    /**
     * Close the dialog
     */
    close() {
        this.state.isOpen = false;
        this.elements.overlay.classList.remove('open');
        document.body.style.overflow = '';

        // Reset state
        this.resetState();

        if (this.options.onClose) {
            this.options.onClose();
        }
    }

    /**
     * Abort current execution
     */
    abort() {
        if (this.state.abortController) {
            this.state.abortController.abort();
        }
    }

    /**
     * Show a specific state
     */
    showState(stateName) {
        // Hide all states
        this.elements.preparing.style.display = 'none';
        this.elements.running.style.display = 'none';
        this.elements.complete.style.display = 'none';
        this.elements.error.style.display = 'none';

        // Hide all actions
        this.elements.cancelBtn.style.display = 'none';
        this.elements.retryBtn.style.display = 'none';
        this.elements.acceptBtn.style.display = 'none';
        this.elements.editBtn.style.display = 'none';
        this.elements.regenerateBtn.style.display = 'none';

        // Show requested state
        switch (stateName) {
            case 'preparing':
                this.elements.preparing.style.display = 'flex';
                this.elements.cancelBtn.style.display = 'block';
                break;
            case 'running':
                this.elements.running.style.display = 'block';
                this.elements.cancelBtn.style.display = 'block';
                break;
            case 'complete':
                this.elements.complete.style.display = 'block';
                this.elements.acceptBtn.style.display = 'block';
                if (this.callbacks.onEdit) {
                    this.elements.editBtn.style.display = 'block';
                }
                this.elements.regenerateBtn.style.display = 'block';
                break;
            case 'error':
                this.elements.error.style.display = 'flex';
                this.elements.retryBtn.style.display = 'block';
                this.elements.cancelBtn.style.display = 'block';
                this.elements.cancelBtn.textContent = 'Close';
                break;
        }
    }

    /**
     * Set progress bar and status
     */
    setProgress(percent, status) {
        const clampedPercent = Math.min(100, Math.max(0, percent));
        this.elements.progressBar.style.width = `${clampedPercent}%`;
        this.elements.progressPercent.textContent = `${Math.round(clampedPercent)}%`;

        if (status) {
            this.elements.statusText.textContent = status;
        }
    }

    /**
     * Display result in the modal
     */
    displayResult(result) {
        let content = '';

        if (typeof result === 'string') {
            content = this.formatMarkdown(result);
        } else if (result.response) {
            content = this.formatMarkdown(result.response);
        } else if (result.content) {
            content = this.formatMarkdown(result.content);
        } else {
            // Display structured data
            content = this.formatStructuredData(result);
        }

        this.elements.resultContent.innerHTML = content;
    }

    /**
     * Display error message
     */
    displayError(error) {
        const message = error.message || 'An unexpected error occurred';
        this.elements.errorMessage.textContent = message;
    }

    /**
     * Format markdown to HTML (basic implementation)
     */
    formatMarkdown(text) {
        if (!text) return '';

        return text
            // Headers
            .replace(/^### (.*$)/gm, '<h4>$1</h4>')
            .replace(/^## (.*$)/gm, '<h3>$1</h3>')
            .replace(/^# (.*$)/gm, '<h2>$1</h2>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            // Inline code
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // Lists
            .replace(/^\s*[-*]\s+(.*$)/gm, '<li>$1</li>')
            // Paragraphs
            .replace(/\n\n/g, '</p><p>')
            // Line breaks
            .replace(/\n/g, '<br>');
    }

    /**
     * Format structured data for display
     */
    formatStructuredData(data) {
        const formatValue = (value, depth = 0) => {
            if (value === null || value === undefined) {
                return '<span class="null">null</span>';
            }
            if (typeof value === 'boolean') {
                return `<span class="boolean">${value}</span>`;
            }
            if (typeof value === 'number') {
                return `<span class="number">${value}</span>`;
            }
            if (typeof value === 'string') {
                return `<span class="string">"${this.escapeHtml(value)}"</span>`;
            }
            if (Array.isArray(value)) {
                if (value.length === 0) return '[]';
                const items = value.map(v => formatValue(v, depth + 1)).join(', ');
                return `[${items}]`;
            }
            if (typeof value === 'object') {
                const entries = Object.entries(value)
                    .map(([k, v]) => `<div class="json-entry" style="margin-left: ${depth * 16}px;"><span class="key">"${k}"</span>: ${formatValue(v, depth + 1)}</div>`)
                    .join('');
                return `<div class="json-object">{${entries}}</div>`;
            }
            return String(value);
        };

        return `<div class="structured-data">${formatValue(data)}</div>`;
    }

    /**
     * Render workflow list for multi-agent execution
     */
    renderWorkflowList(agents) {
        this.elements.workflowList.style.display = 'block';
        this.elements.workflowList.innerHTML = agents.map((agent, index) => `
            <div class="agent-workflow-item" data-step="${index}">
                <div class="agent-workflow-item-status">
                    <span class="agent-workflow-item-number">${index + 1}</span>
                </div>
                <div class="agent-workflow-item-content">
                    <div class="agent-workflow-item-name">${agent.name || `Agent ${index + 1}`}</div>
                    ${agent.description ? `<div class="agent-workflow-item-description">${agent.description}</div>` : ''}
                </div>
            </div>
        `).join('');
    }

    /**
     * Update workflow step status
     */
    updateWorkflowStep(stepIndex, status) {
        const item = this.elements.workflowList.querySelector(`[data-step="${stepIndex}"]`);
        if (item) {
            item.className = `agent-workflow-item ${status}`;
        }
    }

    /**
     * Scroll response content to bottom
     */
    scrollResponseToBottom() {
        const container = this.elements.responseContent;
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Reset internal state
     */
    resetState() {
        this.state.isRunning = false;
        this.state.currentAgent = null;
        this.state.currentWorkflow = null;
        this.state.workflowStep = 0;
        this.state.result = null;
        this.state.error = null;

        this.elements.responseContent.textContent = '';
        this.elements.resultContent.innerHTML = '';
        this.elements.workflowList.innerHTML = '';
        this.elements.workflowList.style.display = 'none';
        this.setProgress(0, '');
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Default error handler
     */
    defaultErrorHandler(error) {
        console.error('AgentDialogService Error:', error);
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Destroy the service and clean up
     */
    destroy() {
        if (this.state.abortController) {
            this.state.abortController.abort();
        }

        if (this.elements.container) {
            this.elements.container.remove();
        }

        document.body.style.overflow = '';
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AgentDialogService;
}

// Global instance for direct usage
window.AgentDialogService = AgentDialogService;
