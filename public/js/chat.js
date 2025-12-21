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
            
            if (data.models.anthropic && claudeGroup) {
                claudeGroup.innerHTML = data.models.anthropic.map(m => 
                    `<option value="${m.id}" ${m.id === data.default ? 'selected' : ''}>${m.name}</option>`
                ).join('');
            }
            
            if (data.models.openai && gptGroup) {
                gptGroup.innerHTML = data.models.openai.map(m => 
                    `<option value="${m.id}">${m.name}</option>`
                ).join('');
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
 * Update model indicator badge
 */
function updateModelIndicator() {
    if (!modelIndicator) return;
    
    const option = modelSelect?.querySelector(`option[value="${currentModel}"]`);
    modelIndicator.textContent = option ? option.textContent : currentModel;
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

    // Add user message to UI
    addMessage('user', message);

    // Clear input
    if (chatInput) {
        chatInput.value = '';
        chatInput.style.height = 'auto';
    }

    // Add to history
    conversationHistory.push({ role: 'user', content: message });

    // Save user message to database
    saveMessage('user', message);

    // Update status
    setStatus('Thinking...');
    isStreaming = true;

    try {
        // Create assistant message placeholder with loading spinner
        const assistantDiv = addMessage('assistant', '', true);
        const contentDiv = assistantDiv.querySelector('.message-content');

        // Stream response
        const response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: conversationHistory,
                model: currentModel,
                systemPrompt: enableSearch?.checked ?
                    'You have access to web search. When the user asks for current information, use search results in your response.' :
                    undefined
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

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
                            fullResponse += parsed.text;
                            if (contentDiv) {
                                contentDiv.innerHTML = formatMessage(fullResponse);
                            }
                        } else if (parsed.type === 'error') {
                            throw new Error(parsed.error);
                        }
                    } catch (e) {
                        // Skip invalid JSON
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

        // Show error in chat
        const lastMessage = chatMessages?.lastElementChild;
        if (lastMessage?.classList.contains('assistant')) {
            lastMessage.querySelector('.message-content').innerHTML =
                `<span style="color: var(--danger);">Error: ${error.message}</span>`;
        }
    } finally {
        isStreaming = false;
    }
}

/**
 * Add message to chat UI
 * @param {string} role - 'user' or 'assistant'
 * @param {string} content - Message content
 * @param {boolean} isLoading - Show loading spinner (for assistant)
 */
function addMessage(role, content, isLoading = false) {
    if (!chatMessages) return null;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const avatar = role === 'user' ? '👤' : '🤖';
    const label = role === 'user' ? 'You' : 'Assistant';

    // Loading spinner HTML for assistant messages
    const loadingSpinner = `
        <div class="message-loading">
            <img src="/assets/loading-spinner.svg" alt="Loading" class="loading-spinner">
            <span class="loading-text">Thinking...</span>
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
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return messageDiv;
}

/**
 * Format message content (basic markdown)
 */
function formatMessage(content) {
    if (!content) return '';
    
    // Escape HTML
    let formatted = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Code blocks
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, 
        '<pre><code class="language-$1">$2</code></pre>');
    
    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Links
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, 
        '<a href="$2" target="_blank">$1</a>');
    
    // Line breaks
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
                    <i data-lucide="sparkles"></i>
                </div>
                <h2>Welcome to Multi-LLM Chat</h2>
                <p>Choose a model and start chatting. Your conversations are automatically saved.</p>
                <div class="quick-actions">
                    <button onclick="insertPrompt('Explain a complex topic simply:')" class="quick-action">
                        <i data-lucide="lightbulb"></i>
                        Explain simply
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
`;
document.head.appendChild(messageStyles);