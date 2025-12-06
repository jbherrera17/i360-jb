/**
 * Insight 360 - Chat Interface JavaScript
 * Phase 2.1 - With conversation persistence
 */

// State
let currentModel = 'claude-sonnet-4-5-20250929';
let currentConversationId = null;
let conversationHistory = [];
let attachedFiles = [];
let isStreaming = false;
let mediaRecorder = null;
let audioChunks = [];

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const modelSelect = document.getElementById('modelSelect');
const modelIndicator = document.getElementById('modelIndicator');
const enableSearch = document.getElementById('enableSearch');
const enableVoice = document.getElementById('enableVoice');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const voiceInputBtn = document.getElementById('voiceInputBtn');
const voiceModal = document.getElementById('voiceModal');
const voicePlayback = document.getElementById('voicePlayback');
const statusText = document.getElementById('statusText');
const claudeModels = document.getElementById('claudeModels');
const gptModels = document.getElementById('gptModels');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadModels();
    setupEventListeners();
    lucide.createIcons();
    
    // Load conversations after supabase.js initializes
    setTimeout(() => {
        if (window.supabaseDB) {
            window.supabaseDB.renderConversationList();
        }
    }, 500);
});

// Load available models from server
async function loadModels() {
    try {
        const response = await fetch('/api/chat/models');
        const data = await response.json();
        
        if (data.success) {
            populateModelSelect(data.data);
            
            // Update voice button visibility
            if (data.data.voiceEnabled) {
                voiceInputBtn?.classList.remove('hidden');
                voicePlayback?.classList.remove('hidden');
            }
            
            // Enable search checkbox if available
            if (!data.data.searchEnabled && enableSearch) {
                enableSearch.disabled = true;
                enableSearch.parentElement.title = 'Web search not configured';
            }
        }
    } catch (error) {
        console.error('Failed to load models:', error);
        addDefaultModels();
    }
}

// Populate model select dropdown
function populateModelSelect(data) {
    if (!claudeModels || !gptModels) return;
    
    claudeModels.innerHTML = '';
    gptModels.innerHTML = '';
    
    // Add Claude models
    if (data.grouped?.anthropic) {
        const tiers = ['opus', 'sonnet', 'haiku'];
        for (const tier of tiers) {
            const models = data.grouped.anthropic[tier] || [];
            for (const model of models) {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                if (model.default) {
                    option.selected = true;
                    currentModel = model.id;
                }
                claudeModels.appendChild(option);
            }
        }
    }
    
    // Add GPT models
    if (data.grouped?.openai) {
        const tiers = ['flagship', 'efficient', 'reasoning', 'audio', 'fast', 'legacy'];
        for (const tier of tiers) {
            const models = data.grouped.openai[tier] || [];
            for (const model of models) {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                gptModels.appendChild(option);
            }
        }
    }
    
    updateModelIndicator();
}

// Add default models if API fails
function addDefaultModels() {
    if (!claudeModels || !gptModels) return;
    
    const defaultClaude = [
        { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5' },
        { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
        { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' }
    ];
    
    const defaultGPT = [
        { id: 'gpt-4.1', name: 'GPT-4.1' },
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' }
    ];
    
    for (const model of defaultClaude) {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        if (model.id === 'claude-sonnet-4-5-20250929') option.selected = true;
        claudeModels.appendChild(option);
    }
    
    for (const model of defaultGPT) {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        gptModels.appendChild(option);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Send button
    sendBtn?.addEventListener('click', sendMessage);
    
    // Enter to send (Shift+Enter for newline)
    chatInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Auto-resize textarea
    chatInput?.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';
    });
    
    // Model change
    modelSelect?.addEventListener('change', (e) => {
        currentModel = e.target.value;
        updateModelIndicator();
        
        // Update conversation model if we have one
        if (currentConversationId && window.supabaseDB) {
            window.supabaseDB.updateConversation(currentConversationId, { model: currentModel });
        }
    });
    
    // File input
    fileInput?.addEventListener('change', handleFileSelect);
    
    // Voice toggle
    enableVoice?.addEventListener('change', (e) => {
        if (e.target.checked) {
            voiceInputBtn?.classList.remove('hidden');
            voicePlayback?.classList.remove('hidden');
        } else {
            voiceInputBtn?.classList.add('hidden');
            voicePlayback?.classList.add('hidden');
        }
    });
    
    // Voice input button
    voiceInputBtn?.addEventListener('click', startVoiceRecording);
    
    // Stop recording
    document.getElementById('stopRecording')?.addEventListener('click', stopVoiceRecording);
    document.getElementById('cancelRecording')?.addEventListener('click', cancelVoiceRecording);
    
    // Play response
    document.getElementById('playResponseBtn')?.addEventListener('click', playLastResponse);
}

// Update model indicator badge
function updateModelIndicator() {
    if (!modelSelect || !modelIndicator) return;
    
    const selectedOption = modelSelect.options[modelSelect.selectedIndex];
    if (selectedOption) {
        modelIndicator.textContent = selectedOption.textContent;
        
        modelIndicator.className = 'model-badge';
        if (currentModel.includes('claude')) {
            modelIndicator.classList.add('model-claude');
        } else if (currentModel.includes('gpt') || currentModel.includes('o3') || currentModel.includes('o4')) {
            modelIndicator.classList.add('model-gpt');
        }
    }
}

// Send message
async function sendMessage() {
    const message = chatInput?.value.trim();
    if (!message && attachedFiles.length === 0) return;
    if (isStreaming) return;
    
    // Hide welcome message
    const welcomeMsg = document.querySelector('.welcome-message');
    if (welcomeMsg) welcomeMsg.remove();
    
    // Create conversation if needed
    if (!currentConversationId && window.supabaseDB) {
        const title = window.supabaseDB.generateTitle(message);
        const conv = await window.supabaseDB.createConversation(title, currentModel);
        currentConversationId = conv.id;
        window.supabaseDB.renderConversationList();
    }
    
    // Add user message to UI
    addMessageToUI('user', message, attachedFiles);
    
    // Save user message to database
    if (currentConversationId && window.supabaseDB) {
        await window.supabaseDB.saveMessage(currentConversationId, 'user', message);
    }
    
    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
    // Prepare form data
    const formData = new FormData();
    formData.append('message', message);
    formData.append('model', currentModel);
    formData.append('enableSearch', enableSearch?.checked || false);
    formData.append('history', JSON.stringify(conversationHistory));
    
    // Attach files
    for (const file of attachedFiles) {
        formData.append('files', file);
    }
    
    // Clear attached files
    clearFilePreview();
    
    // Add to history
    conversationHistory.push({ role: 'user', content: message });
    
    // Create assistant message placeholder
    const assistantDiv = createMessageElement('assistant', '', true);
    chatMessages?.appendChild(assistantDiv);
    scrollToBottom();
    
    // Stream response
    isStreaming = true;
    if (statusText) statusText.textContent = 'Generating...';
    if (sendBtn) sendBtn.disabled = true;
    
    try {
        const response = await fetch('/api/chat/stream', {
            method: 'POST',
            body: formData
        });
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let tokensUsed = 0;
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.type === 'text') {
                            fullContent += data.content;
                            updateAssistantMessage(assistantDiv, fullContent);
                        } else if (data.type === 'search_start') {
                            if (statusText) statusText.textContent = 'Searching...';
                            showSearchIndicator(assistantDiv);
                        } else if (data.type === 'search_query') {
                            updateSearchIndicator(assistantDiv, data.query);
                        } else if (data.type === 'search_complete') {
                            hideSearchIndicator(assistantDiv);
                            if (statusText) statusText.textContent = 'Generating...';
                        } else if (data.type === 'done') {
                            tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
                            const tokenCountEl = document.getElementById('tokenCount');
                            if (tokenCountEl) {
                                tokenCountEl.textContent = `${tokensUsed} tokens`;
                                tokenCountEl.classList.remove('hidden');
                            }
                        } else if (data.type === 'error') {
                            showError(assistantDiv, data.error);
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                }
            }
        }
        
        // Add to history
        if (fullContent) {
            conversationHistory.push({ role: 'assistant', content: fullContent });
            
            // Save assistant message to database
            if (currentConversationId && window.supabaseDB) {
                await window.supabaseDB.saveMessage(
                    currentConversationId, 
                    'assistant', 
                    fullContent, 
                    currentModel,
                    tokensUsed
                );
            }
        }
        
        // Finalize message
        finalizeAssistantMessage(assistantDiv, fullContent);
        
    } catch (error) {
        console.error('Stream error:', error);
        showError(assistantDiv, error.message);
    }
    
    isStreaming = false;
    if (statusText) statusText.textContent = 'Ready';
    if (sendBtn) sendBtn.disabled = false;
    scrollToBottom();
}

// Add message to UI
function addMessageToUI(role, content, files = []) {
    const div = createMessageElement(role, content);
    
    // Add file previews if any
    if (files.length > 0) {
        const filesDiv = document.createElement('div');
        filesDiv.className = 'message-files';
        
        for (const file of files) {
            const fileItem = document.createElement('div');
            fileItem.className = 'message-file';
            
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.alt = file.name;
                fileItem.appendChild(img);
            } else {
                fileItem.innerHTML = `
                    <i data-lucide="file-text"></i>
                    <span>${file.name}</span>
                `;
            }
            
            filesDiv.appendChild(fileItem);
        }
        
        div.querySelector('.message-content')?.appendChild(filesDiv);
    }
    
    chatMessages?.appendChild(div);
    lucide.createIcons();
    scrollToBottom();
}

// Create message element
function createMessageElement(role, content, isStreaming = false) {
    const div = document.createElement('div');
    div.className = `message message-${role}`;
    
    const icon = role === 'user' ? 'user' : 'bot';
    const label = role === 'user' ? 'You' : getModelName();
    
    div.innerHTML = `
        <div class="message-avatar">
            <i data-lucide="${icon}"></i>
        </div>
        <div class="message-body">
            <div class="message-header">
                <span class="message-sender">${label}</span>
                ${role === 'assistant' ? `<span class="message-model">${getModelName()}</span>` : ''}
            </div>
            <div class="message-content ${isStreaming ? 'streaming' : ''}">
                ${isStreaming ? '<span class="cursor"></span>' : formatContent(content)}
            </div>
        </div>
    `;
    
    return div;
}

// Update assistant message during streaming
function updateAssistantMessage(div, content) {
    const contentDiv = div.querySelector('.message-content');
    if (contentDiv) {
        contentDiv.innerHTML = formatContent(content) + '<span class="cursor"></span>';
    }
    scrollToBottom();
}

// Finalize assistant message
function finalizeAssistantMessage(div, content) {
    const contentDiv = div.querySelector('.message-content');
    if (contentDiv) {
        contentDiv.classList.remove('streaming');
        contentDiv.innerHTML = formatContent(content);
    }
    
    // Add action buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';
    actionsDiv.innerHTML = `
        <button class="btn-icon" onclick="copyToClipboard(\`${escapeForAttribute(content)}\`)" title="Copy">
            <i data-lucide="copy"></i>
        </button>
        <button class="btn-icon" onclick="regenerateResponse()" title="Regenerate">
            <i data-lucide="refresh-cw"></i>
        </button>
    `;
    div.querySelector('.message-body')?.appendChild(actionsDiv);
    
    lucide.createIcons();
}

// Format content (basic markdown)
function formatContent(content) {
    if (!content) return '';
    
    // Escape HTML
    let html = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
    });
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
}

// Escape content for use in attribute
function escapeForAttribute(str) {
    return str.replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

// Show search indicator
function showSearchIndicator(div) {
    const indicator = document.createElement('div');
    indicator.className = 'search-indicator';
    indicator.innerHTML = `
        <div class="search-spinner"></div>
        <span>Searching the web...</span>
    `;
    div.querySelector('.message-content')?.prepend(indicator);
}

// Update search indicator
function updateSearchIndicator(div, query) {
    const indicator = div.querySelector('.search-indicator span');
    if (indicator) {
        indicator.textContent = `Searching: "${query}"`;
    }
}

// Hide search indicator
function hideSearchIndicator(div) {
    const indicator = div.querySelector('.search-indicator');
    if (indicator) indicator.remove();
}

// Show error
function showError(div, error) {
    const contentDiv = div.querySelector('.message-content');
    if (contentDiv) {
        contentDiv.classList.remove('streaming');
        contentDiv.innerHTML = `
            <div class="error-message">
                <i data-lucide="alert-circle"></i>
                <span>Error: ${error}</span>
                <button class="btn-secondary btn-sm" onclick="retryLastMessage()">Retry</button>
            </div>
        `;
    }
    lucide.createIcons();
}

// Get current model display name
function getModelName() {
    if (!modelSelect) return 'AI';
    const option = modelSelect.options[modelSelect.selectedIndex];
    return option ? option.textContent : 'AI';
}

// Handle file selection
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
        if (file.size > 20 * 1024 * 1024) {
            alert(`File ${file.name} is too large. Maximum size is 20MB.`);
            continue;
        }
        
        attachedFiles.push(file);
        addFileToPreview(file);
    }
    
    e.target.value = '';
}

// Add file to preview
function addFileToPreview(file) {
    if (!filePreview) return;
    filePreview.classList.remove('hidden');
    
    const item = document.createElement('div');
    item.className = 'file-preview-item';
    
    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        item.appendChild(img);
    } else {
        item.innerHTML = `
            <i data-lucide="file-text"></i>
            <span>${file.name}</span>
        `;
    }
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'file-remove-btn';
    removeBtn.innerHTML = '<i data-lucide="x"></i>';
    removeBtn.onclick = () => removeFile(file, item);
    item.appendChild(removeBtn);
    
    filePreview.appendChild(item);
    lucide.createIcons();
}

// Remove file
function removeFile(file, item) {
    attachedFiles = attachedFiles.filter(f => f !== file);
    item.remove();
    
    if (attachedFiles.length === 0 && filePreview) {
        filePreview.classList.add('hidden');
    }
}

// Clear file preview
function clearFilePreview() {
    attachedFiles = [];
    if (filePreview) {
        filePreview.innerHTML = '';
        filePreview.classList.add('hidden');
    }
}

// Voice recording
async function startVoiceRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (e) => {
            audioChunks.push(e.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await transcribeAudio(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        voiceModal?.classList.remove('hidden');
        const voiceStatus = document.getElementById('voiceStatus');
        if (voiceStatus) voiceStatus.textContent = 'Listening...';
        
    } catch (error) {
        console.error('Voice recording error:', error);
        alert('Could not access microphone. Please check permissions.');
    }
}

// Stop voice recording
function stopVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        const voiceStatus = document.getElementById('voiceStatus');
        if (voiceStatus) voiceStatus.textContent = 'Transcribing...';
        mediaRecorder.stop();
    }
}

// Cancel voice recording
function cancelVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        audioChunks = [];
    }
    voiceModal?.classList.add('hidden');
}

// Transcribe audio
async function transcribeAudio(audioBlob) {
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
        const response = await fetch('/api/chat/voice/transcribe', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success && chatInput) {
            chatInput.value = data.data.text;
            chatInput.focus();
        } else {
            alert('Transcription failed: ' + data.error);
        }
        
    } catch (error) {
        console.error('Transcription error:', error);
        alert('Transcription failed. Please try again.');
    }
    
    voiceModal?.classList.add('hidden');
}

// Play last response
async function playLastResponse() {
    const lastAssistant = conversationHistory.filter(m => m.role === 'assistant').pop();
    if (!lastAssistant) return;
    
    const voiceSelect = document.getElementById('voiceSelect');
    const voice = voiceSelect?.value || 'nova';
    
    try {
        if (statusText) statusText.textContent = 'Generating speech...';
        
        const response = await fetch('/api/chat/voice/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: lastAssistant.content,
                voice
            })
        });
        
        if (response.ok) {
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                if (statusText) statusText.textContent = 'Ready';
            };
            
            audio.play();
            if (statusText) statusText.textContent = 'Playing...';
        } else {
            const error = await response.json();
            alert('Speech generation failed: ' + error.error);
            if (statusText) statusText.textContent = 'Ready';
        }
        
    } catch (error) {
        console.error('TTS error:', error);
        alert('Speech generation failed.');
        if (statusText) statusText.textContent = 'Ready';
    }
}

// Copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        // Brief visual feedback could be added here
    } catch (error) {
        console.error('Copy failed:', error);
    }
}

// Regenerate last response
async function regenerateResponse() {
    if (conversationHistory.length < 2) return;
    
    // Remove last assistant message
    conversationHistory.pop();
    
    // Get last user message
    const lastUserMsg = conversationHistory[conversationHistory.length - 1];
    if (lastUserMsg.role !== 'user') return;
    
    // Remove UI messages
    const messages = chatMessages?.querySelectorAll('.message');
    if (messages && messages.length >= 2) {
        messages[messages.length - 1].remove(); // Remove assistant
    }
    
    // Resend
    chatInput.value = lastUserMsg.content;
    conversationHistory.pop(); // Remove from history (sendMessage will re-add it)
    await sendMessage();
}

// Retry failed message
function retryLastMessage() {
    const lastUserMsg = conversationHistory.filter(m => m.role === 'user').pop();
    if (!lastUserMsg) return;
    
    // Remove error message from UI
    const messages = chatMessages?.querySelectorAll('.message');
    if (messages) {
        messages[messages.length - 1].remove();
    }
    
    // Remove from history and resend
    conversationHistory = conversationHistory.filter(m => m !== lastUserMsg);
    chatInput.value = lastUserMsg.content;
    sendMessage();
}

// Scroll to bottom
function scrollToBottom() {
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Insert prompt template
function insertPrompt(prompt) {
    if (chatInput) {
        chatInput.value = prompt + ' ';
        chatInput.focus();
    }
}

// Start new chat
function startNewChat() {
    currentConversationId = null;
    conversationHistory = [];
    
    if (chatMessages) {
        chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">
                    <i data-lucide="sparkles"></i>
                </div>
                <h2>New Conversation</h2>
                <p>Choose a model and start chatting.</p>
            </div>
        `;
    }
    
    lucide.createIcons();
    chatInput?.focus();
    
    // Update conversation list
    if (window.supabaseDB) {
        window.supabaseDB.renderConversationList();
    }
}

// Switch to a conversation
async function switchConversation(conversationId) {
    if (conversationId === currentConversationId) return;
    
    currentConversationId = conversationId;
    conversationHistory = [];
    
    // Clear chat area
    if (chatMessages) {
        chatMessages.innerHTML = '<div class="loading-indicator">Loading conversation...</div>';
    }
    
    // Load messages
    if (window.supabaseDB) {
        const messages = await window.supabaseDB.loadMessages(conversationId);
        
        if (chatMessages) chatMessages.innerHTML = '';
        
        for (const msg of messages) {
            addMessageToUI(msg.role, msg.content);
            conversationHistory.push({ role: msg.role, content: msg.content });
        }
        
        // Update conversation list to show active
        window.supabaseDB.renderConversationList();
    }
    
    scrollToBottom();
}

// Confirm delete conversation
function confirmDeleteConversation(conversationId) {
    if (confirm('Delete this conversation? This cannot be undone.')) {
        deleteConversationById(conversationId);
    }
}

// Delete conversation
async function deleteConversationById(conversationId) {
    if (window.supabaseDB) {
        await window.supabaseDB.deleteConversation(conversationId);
        
        // If we deleted the current conversation, start new
        if (conversationId === currentConversationId) {
            startNewChat();
        } else {
            window.supabaseDB.renderConversationList();
        }
    }
}

// Export for global access
window.startNewChat = startNewChat;
window.insertPrompt = insertPrompt;
window.switchConversation = switchConversation;
window.confirmDeleteConversation = confirmDeleteConversation;
window.copyToClipboard = copyToClipboard;
window.regenerateResponse = regenerateResponse;
window.retryLastMessage = retryLastMessage;
window.currentConversationId = null;

// Update currentConversationId export
Object.defineProperty(window, 'currentConversationId', {
    get: () => currentConversationId,
    set: (val) => { currentConversationId = val; }
});
