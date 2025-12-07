/**
 * Chat Interface - Insight 360
 * Frontend JavaScript for multi-LLM chat
 * Version: 2.1.2 - Added loading indicator
 */

// State
let currentConversationId = null;
let isStreaming = false;
let mediaRecorder = null;
let audioChunks = [];

// DOM Elements - will be initialized after DOM loads
let messageInput, sendBtn, messagesContainer, modelSelect, currentModelBadge;
let newChatBtn, conversationList, webSearchToggle, streamToggle;
let attachBtn, fileInput, attachmentArea, attachmentPreview, voiceBtn;

// Attached files storage
let attachedFiles = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMElements();
    initializeChat();
    setupEventListeners();
    loadConversations();
    populateModelSelect();
    
    // Initialize Lucide icons
    if (window.lucide) {
        lucide.createIcons();
    }
});

/**
 * Initialize DOM element references
 */
function initializeDOMElements() {
    messageInput = document.getElementById('chatInput');
    sendBtn = document.getElementById('sendBtn');
    messagesContainer = document.getElementById('chatMessages');
    modelSelect = document.getElementById('modelSelect');
    currentModelBadge = document.getElementById('modelIndicator');
    newChatBtn = document.getElementById('newChatBtn');
    conversationList = document.getElementById('conversationList');
    webSearchToggle = document.getElementById('enableSearch');
    streamToggle = document.getElementById('enableStream');
    attachBtn = document.getElementById('attachBtn');
    fileInput = document.getElementById('fileInput');
    attachmentArea = document.getElementById('filePreview');
    attachmentPreview = document.getElementById('filePreview');
    voiceBtn = document.getElementById('voiceInputBtn');
}

/**
 * Initialize chat interface
 */
function initializeChat() {
    // Auto-resize textarea
    if (messageInput) {
        messageInput.addEventListener('input', () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
        });
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Send message
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    if (messageInput) {
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Model selection
    if (modelSelect) {
        modelSelect.addEventListener('change', updateModelIndicator);
    }

    // File attachment
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    // Voice input
    if (voiceBtn) {
        voiceBtn.addEventListener('click', toggleVoiceInput);
    }
    
    // Show voice button if voice is enabled
    const voiceToggle = document.getElementById('enableVoice');
    if (voiceToggle && voiceBtn) {
        voiceToggle.addEventListener('change', () => {
            voiceBtn.classList.toggle('hidden', !voiceToggle.checked);
        });
    }
}

/**
 * Populate model selector from API
 */
async function populateModelSelect() {
    try {
        const response = await fetch('/api/chat/models');
        const data = await response.json();
        
        if (data.success) {
            const claudeModels = document.getElementById('claudeModels');
            const gptModels = document.getElementById('gptModels');
            
            // Clear existing options
            if (claudeModels) claudeModels.innerHTML = '';
            if (gptModels) gptModels.innerHTML = '';
            
            // Add Claude models if available
            if (data.models?.anthropic?.length > 0 && claudeModels) {
                data.models.anthropic.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.name;
                    if (model.id === data.default) option.selected = true;
                    claudeModels.appendChild(option);
                });
            }
            
            // Add OpenAI models if available
            if (data.models?.openai?.length > 0 && gptModels) {
                data.models.openai.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.name;
                    gptModels.appendChild(option);
                });
            }
            
            // If no models are available, show an error
            if (modelSelect) {
                const hasModels = (claudeModels && claudeModels.children.length > 0) || 
                                (gptModels && gptModels.children.length > 0);
                
                if (!hasModels) {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'No models available. Check API keys.';
                    option.disabled = true;
                    option.selected = true;
                    modelSelect.appendChild(option);
                    if (sendBtn) sendBtn.disabled = true;
                }
            }
            
            updateModelIndicator();
        }
    } catch (error) {
        console.error('Failed to load models:', error);
        if (modelSelect) {
            modelSelect.innerHTML = '';
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Error loading models';
            option.disabled = true;
            option.selected = true;
            modelSelect.appendChild(option);
            if (sendBtn) sendBtn.disabled = true;
        }
    }
}

/**
 * Update the model indicator badge
 */
function updateModelIndicator() {
    if (!modelSelect) return;
    
    const selectedOption = modelSelect.options[modelSelect.selectedIndex];
    if (!selectedOption || !selectedOption.value) {
        if (currentModelBadge) {
            currentModelBadge.textContent = 'No model selected';
            currentModelBadge.className = 'model-badge';
        }
        return;
    }
    
    const modelId = selectedOption.value;
    
    if (currentModelBadge) {
        currentModelBadge.textContent = selectedOption.textContent;
        currentModelBadge.className = 'model-badge';
        
        if (modelId.startsWith('claude')) {
            currentModelBadge.classList.add('model-claude');
        } else if (modelId.startsWith('gpt') || modelId.startsWith('o3') || modelId.startsWith('o4')) {
            currentModelBadge.classList.add('model-gpt');
        }
    }
}

/**
 * Show loading indicator
 * @param {string} modelId - The model being used
 */
function showLoadingIndicator(modelId) {
    if (!messagesContainer) return;
    
    // Remove any existing indicator
    hideLoadingIndicator();
    
    const modelName = getModelDisplayName(modelId);
    
    const indicator = document.createElement('div');
    indicator.id = 'loading-indicator';
    indicator.className = 'loading-indicator';
    indicator.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="loading-content">
            <div class="loading-received">Message received.</div>
            <div class="loading-generating">
                <span class="loading-text">${modelName} is generating a response</span>
                <span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(indicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Hide loading indicator
 */
function hideLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.remove();
    }
}

/**
 * Send a message
 */
async function sendMessage() {
    if (!messageInput) return;
    
    const content = messageInput.value.trim();
    if (!content && attachedFiles.length === 0) return;
    if (isStreaming) return;

    const model = modelSelect ? modelSelect.value : 'claude-sonnet-4-5-20250514';
    const useSearch = webSearchToggle ? webSearchToggle.checked : false;

    // Add user message to UI
    addMessage('user', content, attachedFiles);

    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    clearAttachments();

    // Hide welcome message
    if (messagesContainer) {
        const welcomeMsg = messagesContainer.querySelector('.welcome-message');
        if (welcomeMsg) welcomeMsg.style.display = 'none';
    }

    // Show loading indicator
    showLoadingIndicator(model);

    // Create or get conversation
    if (!currentConversationId && window.supabaseDB) {
        const conversation = await window.supabaseDB.createConversation(
            content.substring(0, 50) + (content.length > 50 ? '...' : ''),
            model
        );
        if (conversation) {
            currentConversationId = conversation.id;
            loadConversations();
        }
    }

    // Save user message to database
    if (currentConversationId && window.supabaseDB) {
        await window.supabaseDB.saveMessage(currentConversationId, 'user', content, null);
    }

    // Prepare messages for API
    const messages = getConversationMessages();

    try {
        await streamResponse(messages, model, useSearch);
    } catch (error) {
        console.error('Send message error:', error);
        hideLoadingIndicator();
        addMessage('assistant', 'Sorry, an error occurred. Please try again.', [], model);
    }
}

/**
 * Get conversation messages from UI
 */
function getConversationMessages() {
    const messages = [];
    if (!messagesContainer) return messages;
    
    const messageElements = messagesContainer.querySelectorAll('.message');
    
    messageElements.forEach(el => {
        const role = el.classList.contains('user-message') ? 'user' : 'assistant';
        const content = el.querySelector('.message-content')?.textContent || '';
        if (content) {
            messages.push({ role, content });
        }
    });
    
    return messages;
}

/**
 * Stream response from API
 */
async function streamResponse(messages, model, useSearch) {
    isStreaming = true;
    if (sendBtn) sendBtn.disabled = true;

    // Add placeholder for assistant message
    const messageId = addMessage('assistant', '', [], model, true);
    const messageEl = document.getElementById(messageId);
    const contentEl = messageEl ? messageEl.querySelector('.message-content') : null;

    // Track if we've hidden the loading indicator
    let indicatorHidden = false;

    try {
        const endpoint = useSearch ? '/api/chat/with-search' : '/api/chat/stream';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages,
                model,
                searchQuery: useSearch ? messages[messages.length - 1]?.content : undefined
            })
        });

        if (!response.ok) throw new Error('Stream request failed');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

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
                            // Hide loading indicator on first content chunk
                            if (!indicatorHidden) {
                                hideLoadingIndicator();
                                indicatorHidden = true;
                            }
                            
                            fullContent += parsed.text;
                            if (contentEl) {
                                contentEl.innerHTML = formatMessage(fullContent);
                            }
                            if (messagesContainer) {
                                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                            }
                        }
                    } catch (e) {
                        // Ignore parse errors for incomplete chunks
                    }
                }
            }
        }

        // Save assistant message
        if (currentConversationId && window.supabaseDB && fullContent) {
            await window.supabaseDB.saveMessage(currentConversationId, 'assistant', fullContent, model);
        }

    } catch (error) {
        console.error('Stream error:', error);
        hideLoadingIndicator();
        if (contentEl) {
            contentEl.textContent = 'Error: ' + error.message;
        }
    } finally {
        isStreaming = false;
        hideLoadingIndicator(); // Safety net
        if (sendBtn) sendBtn.disabled = false;
        if (messageEl) messageEl.classList.remove('streaming');
    }
}

/**
 * Add a message to the chat UI
 */
function addMessage(role, content, files = [], model = null, streaming = false) {
    const messageId = 'msg-' + Date.now();
    const messageEl = document.createElement('div');
    messageEl.id = messageId;
    messageEl.className = `message ${role}-message${streaming ? ' streaming' : ''}`;

    const avatar = role === 'user' ? '👤' : '🤖';
    const modelBadge = model ? `<span class="message-model">${getModelDisplayName(model)}</span>` : '';

    messageEl.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-body">
            <div class="message-header">
                <span class="message-role">${role === 'user' ? 'You' : 'Assistant'}</span>
                ${modelBadge}
                <span class="message-time">${formatTime(new Date())}</span>
            </div>
            <div class="message-content">${formatMessage(content)}</div>
            ${files.length > 0 ? renderAttachments(files) : ''}
            <div class="message-actions">
                <button class="action-btn" onclick="copyToClipboard('${messageId}')" title="Copy">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
                ${role === 'assistant' ? `
                <button class="action-btn" onclick="regenerateResponse()" title="Regenerate">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                </button>
                ` : ''}
            </div>
        </div>
    `;

    if (messagesContainer) {
        messagesContainer.appendChild(messageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    return messageId;
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
    formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
    
    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

/**
 * Get display name for model
 */
function getModelDisplayName(modelId) {
    const modelNames = {
        'claude-opus-4-5-20251101': 'Claude Opus 4.5',
        'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5',
        'claude-haiku-4-5-20251001': 'Claude Haiku 4.5',
        'claude-opus-4-20250514': 'Claude Opus 4',
        'claude-sonnet-4-20250514': 'Claude Sonnet 4',
        'gpt-4.1': 'GPT-4.1',
        'gpt-4.1-mini': 'GPT-4.1 Mini',
        'gpt-4.1-nano': 'GPT-4.1 Nano',
        'gpt-4o': 'GPT-4o',
        'gpt-4o-mini': 'GPT-4o Mini',
        'o3': 'o3',
        'o4-mini': 'o4-mini',
        'o3-mini': 'o3-mini'
    };
    return modelNames[modelId] || modelId;
}

/**
 * Format time
 */
function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Handle file selection
 */
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
            alert(`File ${file.name} is too large. Maximum size is 10MB.`);
            return;
        }
        attachedFiles.push(file);
    });
    renderAttachmentPreview();
    if (fileInput) fileInput.value = '';
}

/**
 * Render attachment preview
 */
function renderAttachmentPreview() {
    if (!attachmentArea || !attachmentPreview) return;
    
    if (attachedFiles.length === 0) {
        attachmentArea.classList.add('hidden');
        return;
    }

    attachmentArea.classList.remove('hidden');
    attachmentPreview.innerHTML = attachedFiles.map((file, index) => `
        <div class="attachment-item">
            <span class="attachment-name">${file.name}</span>
            <button class="attachment-remove" onclick="removeAttachment(${index})">×</button>
        </div>
    `).join('');
}

/**
 * Remove attachment
 */
function removeAttachment(index) {
    attachedFiles.splice(index, 1);
    renderAttachmentPreview();
}

/**
 * Clear all attachments
 */
function clearAttachments() {
    attachedFiles = [];
    if (attachmentArea) {
        attachmentArea.classList.add('hidden');
    }
    if (attachmentPreview) {
        attachmentPreview.innerHTML = '';
    }
}

/**
 * Render attachments in message
 */
function renderAttachments(files) {
    if (!files || files.length === 0) return '';
    return `
        <div class="message-attachments">
            ${files.map(f => `<span class="attachment-badge">${f.name || f}</span>`).join('')}
        </div>
    `;
}

/**
 * Toggle voice input
 */
async function toggleVoiceInput() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        if (voiceBtn) voiceBtn.classList.remove('recording');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            audioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            stream.getTracks().forEach(track => track.stop());
            
            // Send to speech-to-text API
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            try {
                const response = await fetch('/api/chat/voice/transcribe', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.success && data.text && messageInput) {
                    messageInput.value = data.text;
                    messageInput.dispatchEvent(new Event('input'));
                }
            } catch (error) {
                console.error('Transcription error:', error);
            }
        };

        mediaRecorder.start();
        if (voiceBtn) voiceBtn.classList.add('recording');

    } catch (error) {
        console.error('Voice input error:', error);
        alert('Could not access microphone. Please check permissions.');
    }
}

/**
 * Load conversations from database
 */
async function loadConversations() {
    if (!window.supabaseDB) return;
    
    const conversations = await window.supabaseDB.loadConversations();
    renderConversationList(conversations);
}

/**
 * Render conversation list
 */
function renderConversationList(conversations) {
    if (!conversationList) return;
    
    if (!conversations || conversations.length === 0) {
        conversationList.innerHTML = '<div class="empty-conversations"><p>No conversations yet</p></div>';
        return;
    }

    conversationList.innerHTML = conversations.map(conv => `
        <div class="conversation-item ${conv.id === currentConversationId ? 'active' : ''}" 
             onclick="switchConversation('${conv.id}')">
            <div class="conversation-title">${conv.title || 'Untitled'}</div>
            <div class="conversation-meta">
                <span class="conversation-model">${getModelDisplayName(conv.model)}</span>
                <span class="conversation-date">${formatDate(conv.updated_at)}</span>
            </div>
            <button class="conversation-delete" onclick="event.stopPropagation(); confirmDeleteConversation('${conv.id}')" title="Delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </div>
    `).join('');
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) { // Less than 24 hours
        return formatTime(date);
    } else if (diff < 604800000) { // Less than 7 days
        return date.toLocaleDateString([], { weekday: 'short' });
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}

/**
 * Start a new chat
 */
function startNewChat() {
    currentConversationId = null;
    
    if (messagesContainer) {
        messagesContainer.innerHTML = `
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
        
        // Re-initialize icons
        if (window.lucide) {
            lucide.createIcons();
        }
    }
    
    // Update active state in sidebar
    document.querySelectorAll('.conversation-item').forEach(el => {
        el.classList.remove('active');
    });
}

/**
 * Insert a quick prompt
 */
function insertPrompt(text) {
    if (messageInput) {
        messageInput.value = text + ' ';
        messageInput.focus();
    }
}

/**
 * Switch to a conversation
 */
async function switchConversation(conversationId) {
    if (!window.supabaseDB) return;
    
    currentConversationId = conversationId;
    
    // Update active state
    document.querySelectorAll('.conversation-item').forEach(el => {
        const isActive = el.getAttribute('onclick')?.includes(conversationId);
        el.classList.toggle('active', isActive);
    });
    
    // Load messages
    const messages = await window.supabaseDB.loadMessages(conversationId);
    
    // Clear and render messages
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
        messages.forEach(msg => {
            addMessage(msg.role, msg.content, [], msg.model);
        });
    }
}

/**
 * Copy message to clipboard
 */
function copyToClipboard(messageId) {
    const messageEl = document.getElementById(messageId);
    if (!messageEl) return;
    
    const content = messageEl.querySelector('.message-content')?.textContent;
    if (!content) return;
    
    navigator.clipboard.writeText(content).then(() => {
        // Show brief feedback
        const btn = messageEl.querySelector('.action-btn');
        if (btn) {
            btn.innerHTML = '✓';
            setTimeout(() => {
                btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>`;
            }, 1500);
        }
    });
}

/**
 * Regenerate last response
 */
async function regenerateResponse() {
    if (!messagesContainer) return;
    
    // Find and remove last assistant message
    const messages = messagesContainer.querySelectorAll('.message');
    const lastAssistant = Array.from(messages).reverse().find(m => m.classList.contains('assistant-message'));
    if (lastAssistant) {
        lastAssistant.remove();
    }
    
    // Resend with current messages
    const currentMessages = getConversationMessages();
    const model = modelSelect ? modelSelect.value : 'claude-sonnet-4-5-20250514';
    const useSearch = webSearchToggle ? webSearchToggle.checked : false;
    
    // Show loading indicator for regeneration
    showLoadingIndicator(model);
    
    try {
        await streamResponse(currentMessages, model, useSearch);
    } catch (error) {
        console.error('Regenerate error:', error);
        hideLoadingIndicator();
    }
}

/**
 * Confirm and delete conversation
 */
function confirmDeleteConversation(conversationId) {
    if (confirm('Delete this conversation? This cannot be undone.')) {
        deleteConversationById(conversationId);
    }
}

/**
 * Delete conversation
 */
async function deleteConversationById(conversationId) {
    if (window.supabaseDB) {
        await window.supabaseDB.deleteConversation(conversationId);
        
        // If we deleted the current conversation, start new
        if (conversationId === currentConversationId) {
            startNewChat();
        }
        
        loadConversations();
    }
}

// Export for global access
window.startNewChat = startNewChat;
window.insertPrompt = insertPrompt;
window.switchConversation = switchConversation;
window.confirmDeleteConversation = confirmDeleteConversation;
window.copyToClipboard = copyToClipboard;
window.regenerateResponse = regenerateResponse;
window.removeAttachment = removeAttachment;
