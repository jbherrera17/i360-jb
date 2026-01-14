/**
 * Chat Interface - Insight 360
 * Multi-LLM chat with streaming, voice, and file support
 */

// State
let currentModel = 'claude-sonnet-4-5-20250929';
let conversationHistory = [];
let isStreaming = false;
let attachedFiles = [];
let currentConversationId = null;
let conversations = [];
let loadingMessageController = null; // Controller for rotating loading messages
let modelCapabilities = {}; // Store model capabilities for UI display

// DOM Elements
const chatInput = document.getElementById('chatInput');
const chatMessages = document.getElementById('chatMessages');
const sendBtn = document.getElementById('sendBtn');
const modelSelect = document.getElementById('modelSelect');
const modelIndicator = document.getElementById('modelIndicator');
const enableSearch = document.getElementById('enableSearch');
const enableVoice = document.getElementById('enableVoice');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const voiceInputBtn = document.getElementById('voiceInputBtn');
const statusText = document.getElementById('statusText');

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Load available models
    await loadModels();

    // Load saved conversations
    await loadConversations();

    // Set up event listeners
    setupEventListeners();

    // Check URL params for initial state
    checkUrlParams();

    // Auto-resize textarea
    setupTextareaResize();
});

/**
 * Load available models from API
 */
async function loadModels() {
    try {
        const response = await fetch('/api/chat/models');
        const data = await response.json();

        if (data.success && data.models) {
            const claudeGroup = document.getElementById('claudeModels');
            const gptGroup = document.getElementById('gptModels');
            const perplexityGroup = document.getElementById('perplexityModels');

            // Build capabilities map and populate dropdowns
            if (data.models.anthropic) {
                data.models.anthropic.forEach(m => {
                    modelCapabilities[m.id] = m;
                });
                if (claudeGroup) {
                    claudeGroup.innerHTML = data.models.anthropic.map(m =>
                        `<option value="${m.id}" ${m.id === data.default ? 'selected' : ''}>${m.name}</option>`
                    ).join('');
                }
            }

            if (data.models.openai) {
                data.models.openai.forEach(m => {
                    modelCapabilities[m.id] = m;
                });
                if (gptGroup) {
                    gptGroup.innerHTML = data.models.openai.map(m =>
                        `<option value="${m.id}">${m.name}</option>`
                    ).join('');
                }
            }

            if (data.models.perplexity) {
                data.models.perplexity.forEach(m => {
                    modelCapabilities[m.id] = m;
                });
                if (perplexityGroup) {
                    perplexityGroup.innerHTML = data.models.perplexity.map(m =>
                        `<option value="${m.id}">${m.name}</option>`
                    ).join('');
                }
            }

            currentModel = data.default || currentModel;
            updateModelIndicator();
        }
    } catch (error) {
        console.error('Failed to load models:', error);
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Send button
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    // Enter to send (Shift+Enter for newline)
    if (chatInput) {
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Model selection
    if (modelSelect) {
        modelSelect.addEventListener('change', function() {
            currentModel = this.value;
            updateModelIndicator();
        });
    }
    
    // File input
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Voice toggle
    if (enableVoice) {
        enableVoice.addEventListener('change', function() {
            if (voiceInputBtn) {
                voiceInputBtn.classList.toggle('hidden', !this.checked);
            }
        });
    }

    // Scroll event to update scroll-to-bottom button visibility
    if (chatMessages) {
        chatMessages.addEventListener('scroll', function() {
            updateScrollToBottomButton();
        });
    }
}

/**
 * Setup textarea auto-resize
 */
function setupTextareaResize() {
    if (!chatInput) return;
    
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 150) + 'px';
    });
}

/**
 * Check URL parameters
 */
function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.get('voice') === 'true' && enableVoice) {
        enableVoice.checked = true;
        enableVoice.dispatchEvent(new Event('change'));
    }
    
    if (params.get('search') === 'true' && enableSearch) {
        enableSearch.checked = true;
    }
}

/**
 * Update model indicator badge with capability icons
 */
function updateModelIndicator() {
    if (!modelIndicator) return;

    const option = modelSelect?.querySelector(`option[value="${currentModel}"]`);
    const modelName = option ? option.textContent : currentModel;
    const caps = modelCapabilities[currentModel] || {};

    // Build capability badges with custom tooltips
    const badges = [];
    if (caps.vision) badges.push('<span class="cap-badge" data-tooltip="Vision - analyzes images">👁️</span>');
    if (caps.pdf) badges.push('<span class="cap-badge" data-tooltip="PDF - reads documents">📄</span>');
    if (caps.audio) badges.push('<span class="cap-badge" data-tooltip="Audio - voice input/output">🎤</span>');
    if (caps.imageGen) badges.push('<span class="cap-badge" data-tooltip="Image Generation">🖼️</span>');
    if (caps.reasoning) badges.push('<span class="cap-badge" data-tooltip="Advanced Reasoning">🧠</span>');
    if (caps.search) badges.push('<span class="cap-badge" data-tooltip="Built-in Web Search">🔍</span>');
    if (caps.research) badges.push('<span class="cap-badge" data-tooltip="Deep Research Mode">📚</span>');

    modelIndicator.innerHTML = `
        <span class="model-name">${modelName}</span>
        ${badges.length > 0 ? `<span class="cap-badges">${badges.join('')}</span>` : ''}
    `;
}

/**
 * Send message
 */
async function sendMessage() {
    const message = chatInput?.value.trim();
    if (!message || isStreaming) return;

    // Hide welcome message
    const welcomeMessage = chatMessages?.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }

    // Create conversation if this is the first message
    if (!currentConversationId) {
        await createConversation();
    }

    // Process attached files before sending
    let processedFiles = [];
    if (attachedFiles.length > 0) {
        setStatus('Processing files...');
        processedFiles = await processAttachedFiles(attachedFiles);
    }

    // Add user message to UI (with file indicator if applicable)
    const displayMessage = processedFiles.length > 0
        ? `${message}\n\n📎 ${processedFiles.map(f => f.name).join(', ')}`
        : message;
    // Add message without auto-scroll, then scroll to show user message at top
    const userMessageDiv = addMessage('user', displayMessage, false, false);

    // Scroll user message to top of viewport (use requestAnimationFrame to ensure DOM is updated)
    requestAnimationFrame(() => {
        scrollMessageToTop(userMessageDiv);
    });

    // Clear input and files
    if (chatInput) {
        chatInput.value = '';
        chatInput.style.height = 'auto';
    }
    clearAttachedFiles();

    // Build message content with files for API
    let messageContent = message;
    if (processedFiles.length > 0) {
        // Build content array for multimodal messages
        messageContent = buildMultimodalContent(message, processedFiles);
    }

    // Add to history
    conversationHistory.push({ role: 'user', content: messageContent });

    // Save user message to database
    saveMessage('user', message);

    // Update status
    const useSearchStatus = enableSearch?.checked;
    setStatus(useSearchStatus ? 'Searching the web...' : 'Thinking...');
    isStreaming = true;

    try {
        // Create assistant message placeholder with loading spinner (don't auto-scroll)
        const assistantDiv = addMessage('assistant', '', true, false);
        const contentDiv = assistantDiv.querySelector('.message-content');

        // Determine if we should use search
        const useSearch = enableSearch?.checked;
        const endpoint = useSearch ? '/api/chat/with-search' : '/api/chat/stream';

        // Build request body
        const requestBody = {
            messages: conversationHistory,
            model: currentModel
        };

        if (useSearch) {
            // For search endpoint, use the user's message as the search query
            requestBody.searchQuery = message;
            requestBody.systemPrompt = 'Use the web search results provided to answer the user\'s question with current, accurate information. Always cite sources when using search results.';
        }

        // Stream response (or use non-streaming for search)
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        let fullResponse = '';

        if (useSearch) {
            // Non-streaming JSON response for search endpoint
            const data = await response.json();

            // Stop loading messages
            stopLoadingMessages();

            if (!data.success) {
                throw new Error(data.error || 'Search failed');
            }

            fullResponse = data.response;

            // Show search results indicator if available
            if (data.searchResults && data.searchResults.length > 0) {
                setStatus(`Found ${data.searchResults.length} search results`);
            }

            if (contentDiv) {
                contentDiv.innerHTML = formatMessage(fullResponse);
            }
        } else {
            // Streaming SSE response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);

                            if (parsed.type === 'content' && parsed.text) {
                                // Stop loading messages on first content
                                if (fullResponse === '') {
                                    stopLoadingMessages();
                                }
                                fullResponse += parsed.text;
                                if (contentDiv) {
                                    contentDiv.innerHTML = formatMessage(fullResponse);
                                    // Auto-scroll to keep new tokens visible (if user is near bottom)
                                    autoScrollIfNearBottom();
                                    // Check if content overflows and show scroll button
                                    updateScrollToBottomButton();
                                }
                            } else if (parsed.type === 'error') {
                                stopLoadingMessages();
                                throw new Error(parsed.error);
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }
        }

        // Add to history
        conversationHistory.push({ role: 'assistant', content: fullResponse });

        // Save assistant message to database
        saveMessage('assistant', fullResponse, currentModel);

        setStatus('Ready');

    } catch (error) {
        console.error('Chat error:', error);
        setStatus('Error: ' + error.message);

        // Stop loading messages on error
        stopLoadingMessages();

        // Show error in chat
        const lastMessage = chatMessages?.lastElementChild;
        if (lastMessage?.classList.contains('assistant')) {
            lastMessage.querySelector('.message-content').innerHTML =
                `<span style="color: var(--danger);">Error: ${error.message}</span>`;
        }
    } finally {
        isStreaming = false;
        // Ensure loading messages are stopped
        stopLoadingMessages();
        // Final check for scroll button visibility
        updateScrollToBottomButton();
    }
}

/**
 * Add message to chat UI
 * @param {string} role - 'user' or 'assistant'
 * @param {string} content - Message content
 * @param {boolean} isLoading - Show loading spinner (for assistant)
 * @param {boolean} autoScroll - Whether to auto-scroll to bottom
 */
function addMessage(role, content, isLoading = false, autoScroll = true) {
    if (!chatMessages) return null;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const avatar = role === 'user' ? '👤' : '<img src="/assets/25-08-20 - Higgins Mona Lisa Smile-T.png" alt="Higgins" class="higgins-avatar">';
    const label = role === 'user' ? 'You' : 'Higgins';

    // Loading spinner HTML for assistant messages
    const loadingSpinner = `
        <div class="message-loading">
            <img src="/assets/loading-spinner.svg" alt="Loading" class="loading-spinner">
            <span class="loading-text"></span>
        </div>
    `;

    const messageContent = isLoading ? loadingSpinner : formatMessage(content);

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-body">
            <div class="message-header">
                <span class="message-author">${label}</span>
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
                <button class="message-copy" onclick="copyMessage(this)" title="Copy message">
                    <i data-lucide="copy"></i>
                </button>
            </div>
            <div class="message-content">${messageContent}</div>
        </div>
    `;

    // Initialize icons for the copy button
    lucide.createIcons();

    chatMessages.appendChild(messageDiv);
    if (autoScroll) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Start rotating loading messages if this is a loading state
    if (isLoading && typeof LoadingMessages !== 'undefined') {
        const loadingTextEl = messageDiv.querySelector('.loading-text');
        if (loadingTextEl) {
            // Stop any previous controller
            if (loadingMessageController) {
                loadingMessageController.stop();
            }
            // Start rotating messages with chat preset
            loadingMessageController = LoadingMessages.start(loadingTextEl, {
                preset: 'chat',
                interval: 2500
            });
        }
    }

    return messageDiv;
}

/**
 * Stop loading messages rotation
 */
function stopLoadingMessages() {
    if (loadingMessageController) {
        loadingMessageController.stop();
        loadingMessageController = null;
    }
}

/**
 * Format message content using marked for full markdown support
 */
function formatMessage(content) {
    if (!content) return '';

    // Use marked for full markdown rendering
    // Configure marked for safe rendering with links opening in new tabs
    if (typeof marked !== 'undefined') {
        // Create a custom renderer to make links open in new tabs
        const renderer = new marked.Renderer();
        renderer.link = function(href, title, text) {
            // Handle both old and new marked API
            const linkHref = typeof href === 'object' ? href.href : href;
            const linkTitle = typeof href === 'object' ? href.title : title;
            const linkText = typeof href === 'object' ? href.text : text;
            const titleAttr = linkTitle ? ` title="${linkTitle}"` : '';
            return `<a href="${linkHref}" target="_blank" rel="noopener noreferrer"${titleAttr}>${linkText}</a>`;
        };

        marked.setOptions({
            breaks: true,  // Convert \n to <br>
            gfm: true,     // GitHub Flavored Markdown
            renderer: renderer
        });
        return marked.parse(content);
    }

    // Fallback to basic formatting if marked isn't loaded
    let formatted = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g,
        '<pre><code class="language-$1">$2</code></pre>');
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
}

/**
 * Set status text
 */
function setStatus(text) {
    if (statusText) {
        statusText.textContent = text;
    }
}

/**
 * Scroll to show a specific message element at the top of the viewport
 * @param {HTMLElement} messageEl - The message element to scroll into view
 */
function scrollMessageToTop(messageEl) {
    if (!messageEl || !chatMessages) return;
    // Use scrollIntoView for reliable positioning at top of container
    messageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Check if chat messages container has content below the viewport
 * @returns {boolean} - True if there's content below the visible area
 */
function hasContentBelow() {
    if (!chatMessages) return false;
    // Calculate how much content is below the current scroll position
    const scrollTop = chatMessages.scrollTop;
    const clientHeight = chatMessages.clientHeight;
    const scrollHeight = chatMessages.scrollHeight;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    // Show button if there's more than 100px of content below
    return distanceToBottom > 100;
}

/**
 * Check if user is near the bottom of the chat (within threshold)
 * Used to determine if we should auto-scroll during streaming
 * @returns {boolean} - True if user is near bottom
 */
function isNearBottom() {
    if (!chatMessages) return true;
    const scrollTop = chatMessages.scrollTop;
    const clientHeight = chatMessages.clientHeight;
    const scrollHeight = chatMessages.scrollHeight;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    // Consider "near bottom" if within 150px of the bottom
    return distanceToBottom < 150;
}

/**
 * Auto-scroll to bottom during streaming if user is near bottom
 * This keeps new tokens visible without interrupting users who scrolled up
 */
function autoScrollIfNearBottom() {
    if (isNearBottom()) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

/**
 * Show or hide the scroll-to-bottom button based on content overflow
 */
function updateScrollToBottomButton() {
    let scrollBtn = document.getElementById('scrollToBottomBtn');

    if (hasContentBelow()) {
        if (!scrollBtn) {
            scrollBtn = createScrollToBottomButton();
        }
        scrollBtn.classList.add('visible');
    } else if (scrollBtn) {
        scrollBtn.classList.remove('visible');
    }
}

/**
 * Create the scroll-to-bottom button element
 * @returns {HTMLElement} - The button element
 */
function createScrollToBottomButton() {
    const btn = document.createElement('button');
    btn.id = 'scrollToBottomBtn';
    btn.className = 'scroll-to-bottom-btn';
    btn.title = 'Scroll to bottom';
    btn.innerHTML = '<i data-lucide="chevron-down"></i>';
    btn.onclick = scrollToBottom;

    // Insert the button as a sibling to chatMessages, inside chat-main-content
    // This allows proper absolute positioning relative to the chat area
    chatMessages.insertAdjacentElement('afterend', btn);

    // Initialize the icon
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    return btn;
}

/**
 * Scroll to the bottom of the chat messages
 */
function scrollToBottom() {
    if (!chatMessages) return;
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
}

/**
 * Handle file selection
 */
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    attachedFiles = files;
    
    if (!filePreview) return;
    
    if (files.length > 0) {
        filePreview.classList.remove('hidden');
        filePreview.innerHTML = files.map(file => `
            <div class="file-item">
                <span>${file.name}</span>
                <button onclick="removeFile('${file.name}')">&times;</button>
            </div>
        `).join('');
    } else {
        filePreview.classList.add('hidden');
        filePreview.innerHTML = '';
    }
}

/**
 * Remove attached file
 */
function removeFile(filename) {
    attachedFiles = attachedFiles.filter(f => f.name !== filename);
    if (fileInput) fileInput.value = '';

    if (!filePreview) return;

    if (attachedFiles.length === 0) {
        filePreview.classList.add('hidden');
        filePreview.innerHTML = '';
    } else {
        filePreview.innerHTML = attachedFiles.map(file => `
            <div class="file-item">
                <span>${file.name}</span>
                <button onclick="removeFile('${file.name}')">&times;</button>
            </div>
        `).join('');
    }
}

/**
 * Clear all attached files
 */
function clearAttachedFiles() {
    attachedFiles = [];
    if (fileInput) fileInput.value = '';
    if (filePreview) {
        filePreview.classList.add('hidden');
        filePreview.innerHTML = '';
    }
}

/**
 * Process attached files for API submission
 * Converts files to base64 and extracts metadata
 * @param {File[]} files - Array of File objects
 * @returns {Promise<Array>} Processed file data
 */
async function processAttachedFiles(files) {
    const processed = [];

    for (const file of files) {
        try {
            const base64 = await fileToBase64(file);
            const fileType = getFileType(file);

            processed.push({
                name: file.name,
                type: file.type,
                fileType: fileType,
                size: file.size,
                data: base64
            });
        } catch (error) {
            console.error(`Failed to process file ${file.name}:`, error);
        }
    }

    return processed;
}

/**
 * Convert file to base64 string
 * @param {File} file - File object
 * @returns {Promise<string>} Base64 encoded string
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove data URL prefix (e.g., "data:image/png;base64,")
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Determine file type category
 * @param {File} file - File object
 * @returns {string} File type category
 */
function getFileType(file) {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();

    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (type.includes('text/') || name.endsWith('.txt') || name.endsWith('.md')) return 'text';
    if (name.endsWith('.csv')) return 'csv';
    if (type.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) return 'document';

    return 'file';
}

/**
 * Build multimodal content array for Claude API
 * @param {string} text - User's text message
 * @param {Array} files - Processed file data
 * @returns {Array} Content array for API
 */
function buildMultimodalContent(text, files) {
    const content = [];

    // Add files first
    for (const file of files) {
        if (file.fileType === 'image') {
            // Images go as image blocks
            content.push({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: file.type,
                    data: file.data
                }
            });
        } else if (file.fileType === 'pdf') {
            // PDFs go as document blocks (Claude supports this)
            content.push({
                type: 'document',
                source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: file.data
                }
            });
        } else if (file.fileType === 'text' || file.fileType === 'csv') {
            // Text files: decode base64 and include as text
            try {
                const textContent = atob(file.data);
                content.push({
                    type: 'text',
                    text: `[File: ${file.name}]\n\n${textContent}`
                });
            } catch (e) {
                content.push({
                    type: 'text',
                    text: `[File: ${file.name}] (Could not decode content)`
                });
            }
        } else {
            // Other files: note them but can't process directly
            content.push({
                type: 'text',
                text: `[Attached file: ${file.name} (${file.type || 'unknown type'})]`
            });
        }
    }

    // Add user's text message
    content.push({
        type: 'text',
        text: text
    });

    return content;
}

/**
 * Load conversations from API
 */
async function loadConversations() {
    try {
        const response = await fetch('/api/conversations?limit=20');
        const data = await response.json();

        if (data.success) {
            conversations = data.conversations;
            renderConversationList();
        }
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

/**
 * Render conversation list in sidebar
 */
function renderConversationList() {
    const conversationList = document.getElementById('conversationList');
    if (!conversationList) return;

    if (conversations.length === 0) {
        conversationList.innerHTML = `
            <div class="empty-conversations">
                <p>No conversations yet</p>
            </div>
        `;
        return;
    }

    conversationList.innerHTML = conversations.map(conv => `
        <div class="conversation-item ${conv.id === currentConversationId ? 'active' : ''}"
             onclick="loadConversation('${conv.id}')"
             data-id="${conv.id}">
            <div class="conversation-title">${escapeHtml(conv.title)}</div>
            <div class="conversation-meta">
                <span class="conversation-date">${formatDate(conv.updated_at)}</span>
                <div class="conversation-actions">
                    <button class="conversation-action" onclick="renameConversation('${conv.id}', event)" title="Rename">
                        <i data-lucide="pencil"></i>
                    </button>
                    <button class="conversation-action conversation-delete" onclick="event.stopPropagation(); deleteConversation('${conv.id}')" title="Delete">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

/**
 * Load a specific conversation
 */
async function loadConversation(conversationId) {
    try {
        const response = await fetch(`/api/conversations/${conversationId}`);
        const data = await response.json();

        if (data.success && data.conversation) {
            currentConversationId = conversationId;
            conversationHistory = data.conversation.messages.map(m => ({
                role: m.role,
                content: m.content
            }));

            // Update model if conversation has one
            if (data.conversation.model && modelSelect) {
                currentModel = data.conversation.model;
                modelSelect.value = currentModel;
                updateModelIndicator();
            }

            // Render messages
            renderMessages(data.conversation.messages);

            // Update conversation list to show active
            renderConversationList();

            setStatus('Conversation loaded');
        }
    } catch (error) {
        console.error('Error loading conversation:', error);
        setStatus('Error loading conversation');
    }
}

/**
 * Render messages in chat area
 */
function renderMessages(messages) {
    if (!chatMessages) return;

    if (messages.length === 0) {
        showWelcomeMessage();
        return;
    }

    chatMessages.innerHTML = '';
    messages.forEach(msg => {
        addMessage(msg.role, msg.content, false);
    });
}

/**
 * Create a new conversation
 */
async function createConversation() {
    try {
        const response = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: currentModel,
                title: 'New Conversation'
            })
        });

        const data = await response.json();

        if (data.success) {
            currentConversationId = data.conversation.id;
            conversations.unshift(data.conversation);
            renderConversationList();
            return data.conversation;
        }
    } catch (error) {
        console.error('Error creating conversation:', error);
    }
    return null;
}

/**
 * Save a message to the current conversation
 */
async function saveMessage(role, content, model = null) {
    if (!currentConversationId) return;

    try {
        await fetch(`/api/conversations/${currentConversationId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role,
                content,
                model
            })
        });

        // Refresh conversation list to update title/timestamp
        await loadConversations();
    } catch (error) {
        console.error('Error saving message:', error);
    }
}

/**
 * Delete a conversation
 */
async function deleteConversation(conversationId) {
    if (!confirm('Delete this conversation?')) return;

    try {
        const response = await fetch(`/api/conversations/${conversationId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            conversations = conversations.filter(c => c.id !== conversationId);

            if (currentConversationId === conversationId) {
                currentConversationId = null;
                conversationHistory = [];
                showWelcomeMessage();
            }

            renderConversationList();
            setStatus('Conversation deleted');
        }
    } catch (error) {
        console.error('Error deleting conversation:', error);
    }
}

/**
 * Copy message content to clipboard
 */
async function copyMessage(button) {
    const messageDiv = button.closest('.message');
    const contentDiv = messageDiv.querySelector('.message-content');

    if (!contentDiv) return;

    // Get text content (strips HTML)
    const text = contentDiv.innerText;

    try {
        await navigator.clipboard.writeText(text);

        // Visual feedback - change icon temporarily
        const icon = button.querySelector('i');
        icon.setAttribute('data-lucide', 'check');
        lucide.createIcons();
        button.classList.add('copied');

        setTimeout(() => {
            icon.setAttribute('data-lucide', 'copy');
            lucide.createIcons();
            button.classList.remove('copied');
        }, 2000);
    } catch (error) {
        console.error('Failed to copy:', error);
        setStatus('Failed to copy to clipboard');
    }
}

/**
 * Rename a conversation
 */
async function renameConversation(conversationId, event) {
    if (event) event.stopPropagation();

    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    const newTitle = prompt('Enter new conversation title:', conversation.title);
    if (!newTitle || newTitle.trim() === '' || newTitle === conversation.title) return;

    try {
        const response = await fetch(`/api/conversations/${conversationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle.trim() })
        });

        if (response.ok) {
            conversation.title = newTitle.trim();
            renderConversationList();
            setStatus('Conversation renamed');
        }
    } catch (error) {
        console.error('Error renaming conversation:', error);
        setStatus('Error renaming conversation');
    }
}

/**
 * Show welcome message
 */
function showWelcomeMessage() {
    if (chatMessages) {
        chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">
                    <i data-lucide="graduation-cap"></i>
                </div>
                <h2>Welcome to Higgins</h2>
                <p>I'm your AI guide to Insight 360, powered by the model you select above. Ask me anything about the system, or let me help with any other task.</p>
                <div class="quick-actions">
                    <button onclick="insertPrompt('How do I create a context asset?')" class="quick-action">
                        <i data-lucide="help-circle"></i>
                        i360 Help
                    </button>
                    <button onclick="insertPrompt('Help me write code for')" class="quick-action">
                        <i data-lucide="code"></i>
                        Write code
                    </button>
                    <button onclick="insertPrompt('Analyze this document:')" class="quick-action">
                        <i data-lucide="file-text"></i>
                        Analyze doc
                    </button>
                    <button onclick="insertPrompt('Search for the latest news about')" class="quick-action">
                        <i data-lucide="search"></i>
                        Search web
                    </button>
                </div>
            </div>
        `;
        lucide.createIcons();
    }
}

/**
 * Start new chat
 */
function startNewChat() {
    currentConversationId = null;
    conversationHistory = [];
    renderConversationList();
    showWelcomeMessage();
}

/**
 * Helper: Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Helper: Format date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}

/**
 * Insert prompt template
 */
function insertPrompt(text) {
    if (chatInput) {
        chatInput.value = text + ' ';
        chatInput.focus();
    }
}

// Add message styles
const messageStyles = document.createElement('style');
messageStyles.textContent = `
    .message {
        display: flex;
        gap: var(--spacing-md);
        padding: var(--spacing-md);
        margin-bottom: var(--spacing-md);
    }
    
    .message.user {
        background: var(--bg-tertiary);
        border-radius: var(--radius-lg);
    }
    
    .message.assistant {
        background: var(--bg-secondary);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border);
    }
    
    .message-avatar {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-md);
        background: var(--bg-tertiary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        flex-shrink: 0;
    }

    .higgins-avatar {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: var(--radius-md);
    }
    
    .message-body {
        flex: 1;
        min-width: 0;
    }
    
    .message-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-xs);
    }
    
    .message-author {
        font-weight: 600;
        font-size: 0.9rem;
    }
    
    .message-time {
        font-size: 0.75rem;
        color: var(--text-muted);
    }
    
    .message-content {
        font-size: 0.95rem;
        line-height: 1.6;
        color: var(--text-secondary);
    }
    
    .message-content code {
        background: var(--bg-code);
        padding: 0.15rem 0.4rem;
        border-radius: var(--radius-sm);
        font-family: var(--font-mono);
        font-size: 0.85em;
    }
    
    .message-content pre {
        background: var(--bg-code);
        padding: var(--spacing-md);
        border-radius: var(--radius-md);
        overflow-x: auto;
        margin: var(--spacing-sm) 0;
    }
    
    .message-content pre code {
        background: transparent;
        padding: 0;
    }
    
    .message-content a {
        color: var(--primary);
    }

    .message-content a:hover {
        text-decoration: underline;
    }

    /* Markdown list styling */
    .message-content ul,
    .message-content ol {
        margin: 0.5rem 0;
        padding-left: 1.5rem;
    }

    .message-content li {
        margin: 0.25rem 0;
    }

    .message-content li::marker {
        color: var(--primary);
    }

    /* Markdown headers */
    .message-content h1,
    .message-content h2,
    .message-content h3,
    .message-content h4 {
        margin: 1rem 0 0.5rem 0;
        color: var(--text-primary);
        font-weight: 600;
    }

    .message-content h1:first-child,
    .message-content h2:first-child,
    .message-content h3:first-child {
        margin-top: 0;
    }

    .message-content h2 { font-size: 1.2rem; }
    .message-content h3 { font-size: 1.1rem; }
    .message-content h4 { font-size: 1rem; }

    /* Blockquotes */
    .message-content blockquote {
        border-left: 3px solid var(--primary);
        margin: 0.75rem 0;
        padding: 0.5rem 0 0.5rem 1rem;
        color: var(--text-secondary);
        background: var(--bg-tertiary);
        border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    }

    /* Tables */
    .message-content table {
        width: 100%;
        border-collapse: collapse;
        margin: 0.75rem 0;
        font-size: 0.9rem;
    }

    .message-content th,
    .message-content td {
        padding: 0.4rem 0.6rem;
        border: 1px solid var(--border);
        text-align: left;
    }

    .message-content th {
        background: var(--bg-tertiary);
        font-weight: 600;
    }

    /* Horizontal rules */
    .message-content hr {
        border: none;
        border-top: 1px solid var(--border);
        margin: 1rem 0;
    }

    /* Paragraphs */
    .message-content p {
        margin: 0.5rem 0;
    }

    .message-content p:first-child {
        margin-top: 0;
    }

    .message-content p:last-child {
        margin-bottom: 0;
    }

    .file-item {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-xs) var(--spacing-sm);
        background: var(--bg-tertiary);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        font-size: 0.85rem;
    }
    
    .file-item button {
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 0 0.25rem;
    }
    
    .file-item button:hover {
        color: var(--danger);
    }

    /* Copy message button */
    .message-copy {
        opacity: 0;
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 0.25rem;
        margin-left: auto;
        border-radius: var(--radius-sm);
        transition: opacity 0.2s, color 0.2s, background 0.2s;
    }

    .message-copy:hover {
        color: var(--text-primary);
        background: var(--bg-tertiary);
    }

    .message-copy.copied {
        color: var(--success);
    }

    .message:hover .message-copy {
        opacity: 1;
    }

    .message-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-xs);
    }

    .message-copy i {
        width: 14px;
        height: 14px;
    }

    /* Conversation actions */
    .conversation-actions {
        display: flex;
        gap: 0.25rem;
        opacity: 0;
        transition: opacity 0.2s;
    }

    .conversation-item:hover .conversation-actions {
        opacity: 1;
    }

    .conversation-action {
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 0.25rem;
        border-radius: var(--radius-sm);
        transition: color 0.2s, background 0.2s;
    }

    .conversation-action:hover {
        color: var(--text-primary);
        background: var(--bg-tertiary);
    }

    .conversation-action.conversation-delete:hover {
        color: var(--danger);
    }

    .conversation-action i {
        width: 14px;
        height: 14px;
    }

    .conversation-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-sm);
    }

    /* Model capability badges */
    .cap-badges {
        display: inline-flex;
        gap: 2px;
        margin-left: 6px;
    }

    .cap-badge {
        position: relative;
        font-size: 0.75rem;
        cursor: help;
        opacity: 0.85;
        transition: opacity 0.2s, transform 0.2s;
    }

    .cap-badge:hover {
        opacity: 1;
        transform: scale(1.15);
    }

    .cap-badge::after {
        content: attr(data-tooltip);
        position: absolute;
        top: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-primary, #1a1a2e);
        color: var(--text-primary, #fff);
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 0.75rem;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s;
        z-index: 1000;
        border: 1px solid var(--border, #333);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        pointer-events: none;
    }

    .cap-badge::before {
        content: '';
        position: absolute;
        top: calc(100% + 2px);
        left: 50%;
        transform: translateX(-50%);
        border: 6px solid transparent;
        border-bottom-color: var(--border, #333);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s;
        z-index: 1001;
    }

    .cap-badge:hover::after,
    .cap-badge:hover::before {
        opacity: 1;
        visibility: visible;
    }

    #modelIndicator {
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }

    .model-name {
        font-weight: 500;
    }

    /* Scroll to bottom button - positioned above the chat input */
    .scroll-to-bottom-btn {
        position: fixed;
        bottom: 140px;
        left: calc(var(--sidebar-width, 260px) + (100vw - var(--sidebar-width, 260px) - var(--right-panel-width, 400px)) / 2);
        transform: translateX(-50%) translateY(20px);
        background: var(--primary);
        color: white;
        border: none;
        border-radius: 50%;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s, visibility 0.2s, transform 0.2s, background 0.2s;
        z-index: 1000;
    }

    .scroll-to-bottom-btn.visible {
        opacity: 1;
        visibility: visible;
        transform: translateX(-50%) translateY(0);
    }

    .scroll-to-bottom-btn:hover {
        background: var(--primary-hover, var(--primary));
        transform: translateX(-50%) scale(1.1);
    }

    .scroll-to-bottom-btn i {
        width: 22px;
        height: 22px;
    }

    /* Responsive: adjust position when right panel is hidden */
    @media (max-width: 1024px) {
        .scroll-to-bottom-btn {
            left: calc(var(--sidebar-width, 260px) + (100vw - var(--sidebar-width, 260px)) / 2);
        }
    }
`;
document.head.appendChild(messageStyles);