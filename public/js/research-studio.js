/**
 * INSIGHT 360 - Research Studio Frontend
 * Version: 1.0.0
 *
 * Handles all frontend logic for the Research Studio (NotebookLM-style) interface.
 */

// API Base URL
const API_BASE = '/api/research-studios';

// State
let currentStudio = null;
let currentConversationId = null;
let sources = [];
let outputs = [];
let isStreaming = false;
let loadingMessageController = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Load studios list
    await loadStudios();

    // Set up drag and drop for file upload
    setupDragAndDrop();

    // Check URL for studio ID
    const urlParams = new URLSearchParams(window.location.search);
    const studioId = urlParams.get('id');
    if (studioId) {
        await loadStudio(studioId);
    }
});

// ============================================================================
// STUDIO MANAGEMENT
// ============================================================================

/**
 * Load all studios for the user
 */
async function loadStudios() {
    try {
        const response = await fetch(API_BASE);
        const result = await response.json();

        if (result.success) {
            renderStudioList(result.data);
        } else {
            console.error('Failed to load studios:', result.error);
        }
    } catch (error) {
        console.error('Error loading studios:', error);
    }
}

/**
 * Render the studio list
 */
function renderStudioList(studios) {
    const container = document.getElementById('studioList');
    const createBtn = container.querySelector('.create-studio-btn');

    // Clear existing cards (except create button)
    const cards = container.querySelectorAll('.studio-card');
    cards.forEach(card => card.remove());

    // Add studio cards before create button
    studios.forEach(studio => {
        const card = document.createElement('div');
        card.className = 'studio-card';
        card.onclick = () => loadStudio(studio.id);

        const date = new Date(studio.updated_at).toLocaleDateString();
        card.innerHTML = `
            <h3>${escapeHtml(studio.title)}</h3>
            <p>${escapeHtml(studio.description || 'No description')}</p>
            <div class="studio-card-meta">
                <span><i data-lucide="files" style="width:14px;height:14px;"></i> ${studio.source_count || 0} sources</span>
                <span><i data-lucide="sparkles" style="width:14px;height:14px;"></i> ${studio.output_count || 0} outputs</span>
                <span>Updated ${date}</span>
            </div>
        `;
        container.insertBefore(card, createBtn);
    });

    // Reinitialize icons
    lucide.createIcons();
}

/**
 * Load a specific studio
 */
async function loadStudio(studioId) {
    try {
        const response = await fetch(`${API_BASE}/${studioId}`);
        const result = await response.json();

        if (result.success) {
            currentStudio = result.data;
            sources = result.data.sources || [];
            outputs = result.data.outputs || [];

            // Get active conversation (find the one marked as active, or use first one)
            if (result.data.conversations && result.data.conversations.length > 0) {
                const activeConvo = result.data.conversations.find(c => c.is_active);
                currentConversationId = activeConvo ? activeConvo.id : result.data.conversations[0].id;
            }

            // Update URL
            window.history.pushState({}, '', `?id=${studioId}`);

            // Show studio interface
            document.getElementById('studioSelector').style.display = 'none';
            document.getElementById('studioContainer').style.display = 'flex';

            // Update UI
            document.getElementById('studioTitleInput').value = currentStudio.title;
            renderSources();
            renderOutputs();
            updateContextInfo();

            // Load chat history if exists
            if (currentConversationId) {
                await loadChatHistory();
            }
        } else {
            alert('Failed to load studio: ' + result.error);
        }
    } catch (error) {
        console.error('Error loading studio:', error);
        alert('Error loading studio');
    }
}

/**
 * Show the create studio modal
 */
function showCreateStudioModal() {
    document.getElementById('newStudioTitle').value = '';
    document.getElementById('newStudioDescription').value = '';
    showModal('createStudioModal');
}

/**
 * Create a new studio
 */
async function createStudio(event) {
    event.preventDefault();

    const title = document.getElementById('newStudioTitle').value.trim();
    const description = document.getElementById('newStudioDescription').value.trim();

    if (!title) {
        alert('Please enter a title');
        return;
    }

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description })
        });

        const result = await response.json();

        if (result.success) {
            hideModal('createStudioModal');
            await loadStudio(result.data.id);
        } else {
            alert('Failed to create studio: ' + result.error);
        }
    } catch (error) {
        console.error('Error creating studio:', error);
        alert('Error creating studio');
    }
}

/**
 * Update studio title
 */
async function updateStudioTitle() {
    if (!currentStudio) return;

    const newTitle = document.getElementById('studioTitleInput').value.trim();
    if (!newTitle || newTitle === currentStudio.title) return;

    try {
        const response = await fetch(`${API_BASE}/${currentStudio.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle })
        });

        const result = await response.json();

        if (result.success) {
            currentStudio.title = newTitle;
        } else {
            document.getElementById('studioTitleInput').value = currentStudio.title;
            alert('Failed to update title');
        }
    } catch (error) {
        console.error('Error updating title:', error);
        document.getElementById('studioTitleInput').value = currentStudio.title;
    }
}

/**
 * Show the studio list
 */
function showStudioList() {
    currentStudio = null;
    currentConversationId = null;
    sources = [];
    outputs = [];

    document.getElementById('studioContainer').style.display = 'none';
    document.getElementById('studioSelector').style.display = 'block';

    window.history.pushState({}, '', window.location.pathname);
    loadStudios();
}

// ============================================================================
// SOURCE MANAGEMENT
// ============================================================================

/**
 * Render sources list
 */
function renderSources() {
    const container = document.getElementById('sourcesList');
    const countBadge = document.getElementById('sourceCount');

    if (sources.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="file-plus"></i>
                <p>No sources yet</p>
            </div>
        `;
        countBadge.textContent = '0';
        lucide.createIcons();
        return;
    }

    countBadge.textContent = sources.length;

    container.innerHTML = sources.map(source => `
        <div class="source-item ${source.is_selected ? 'selected' : ''}" data-id="${source.id}">
            <div class="source-checkbox">
                <input type="checkbox" ${source.is_selected ? 'checked' : ''} onchange="event.stopPropagation(); toggleSource('${source.id}', this.checked)">
            </div>
            <div class="source-type-icon ${source.source_type}" onclick="viewSource('${source.id}')">
                <i data-lucide="${getSourceIcon(source.source_type)}"></i>
            </div>
            <div class="source-info" onclick="viewSource('${source.id}')">
                <div class="source-title">${escapeHtml(source.title)}</div>
                <div class="source-meta">${formatFileSize(source.file_size || 0)} · ${source.source_type.toUpperCase()}</div>
            </div>
            <div class="source-actions">
                <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); editSource('${source.id}')" title="Edit">
                    <i data-lucide="pencil"></i>
                </button>
                <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); deleteSource('${source.id}')" title="Delete">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
    updateContextInfo();
}

/**
 * Get icon for source type
 */
function getSourceIcon(type) {
    const icons = {
        pdf: 'file-text',
        docx: 'file-type',
        txt: 'file',
        markdown: 'file-code',
        csv: 'table',
        url: 'link',
        text: 'file-text'
    };
    return icons[type] || 'file';
}

/**
 * Show add source modal
 */
function showAddSourceModal() {
    switchSourceTab('file');
    showModal('addSourceModal');
}

/**
 * Switch source tab in modal
 */
function switchSourceTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.source-tab').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tab));
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tab}Tab`).classList.add('active');
}

/**
 * Set up drag and drop for file upload
 */
function setupDragAndDrop() {
    const uploadZone = document.getElementById('uploadZone');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.classList.remove('dragover');
        });
    });

    uploadZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            uploadFile(files[0]);
        }
    });
}

/**
 * Handle file selection
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        uploadFile(file);
    }
}

/**
 * Upload a file as source
 */
async function uploadFile(file) {
    if (!currentStudio) {
        alert('Please select or create a studio first');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        hideModal('addSourceModal');

        // Show loading state
        const sourcesList = document.getElementById('sourcesList');
        sourcesList.innerHTML = `
            <div class="source-item">
                <div class="source-type-icon">
                    <i data-lucide="loader-2" class="spin"></i>
                </div>
                <div class="source-info">
                    <div class="source-title">Uploading ${escapeHtml(file.name)}...</div>
                    <div class="source-meta">Processing...</div>
                </div>
            </div>
        ` + sourcesList.innerHTML;
        lucide.createIcons();

        const response = await fetch(`${API_BASE}/${currentStudio.id}/sources`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            sources.unshift(result.data);
            renderSources();
        } else {
            alert('Failed to upload file: ' + result.error);
            renderSources();
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        alert('Error uploading file');
        renderSources();
    }
}

/**
 * Add URL as source
 */
async function addUrlSource() {
    if (!currentStudio) {
        alert('Please select or create a studio first');
        return;
    }

    const url = document.getElementById('sourceUrl').value.trim();
    if (!url) {
        alert('Please enter a URL');
        return;
    }

    try {
        hideModal('addSourceModal');

        const response = await fetch(`${API_BASE}/${currentStudio.id}/sources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const result = await response.json();

        if (result.success) {
            sources.unshift(result.data);
            renderSources();
            document.getElementById('sourceUrl').value = '';
        } else {
            alert('Failed to add URL: ' + result.error);
        }
    } catch (error) {
        console.error('Error adding URL:', error);
        alert('Error adding URL');
    }
}

/**
 * Add text as source
 */
async function addTextSource() {
    if (!currentStudio) {
        alert('Please select or create a studio first');
        return;
    }

    const title = document.getElementById('textTitle').value.trim();
    const text = document.getElementById('textContent').value.trim();

    if (!text) {
        alert('Please enter some text');
        return;
    }

    try {
        hideModal('addSourceModal');

        const response = await fetch(`${API_BASE}/${currentStudio.id}/sources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, title })
        });

        const result = await response.json();

        if (result.success) {
            sources.unshift(result.data);
            renderSources();
            document.getElementById('textTitle').value = '';
            document.getElementById('textContent').value = '';
        } else {
            alert('Failed to add text: ' + result.error);
        }
    } catch (error) {
        console.error('Error adding text:', error);
        alert('Error adding text');
    }
}

/**
 * Toggle source selection
 */
async function toggleSource(sourceId, isSelected) {
    try {
        const response = await fetch(`${API_BASE}/${currentStudio.id}/sources/${sourceId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_selected: isSelected })
        });

        const result = await response.json();

        if (result.success) {
            const source = sources.find(s => s.id === sourceId);
            if (source) {
                source.is_selected = isSelected;
            }
            updateContextInfo();
        }
    } catch (error) {
        console.error('Error toggling source:', error);
    }
}

/**
 * View a source in a modal
 */
async function viewSource(sourceId) {
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    // Check if ContentModal is available
    if (typeof ContentModal === 'undefined') {
        console.error('ContentModal not available');
        alert('View functionality not available');
        return;
    }

    // Determine content type and format
    let contentType = 'markdown';
    let content = source.content || '';
    let modalTitle = source.title;

    // For URL sources, show the URL and any extracted content
    if (source.source_type === 'url') {
        content = `**Source URL:** [${source.url}](${source.url})\n\n---\n\n${content || '*No content extracted*'}`;
    }

    // For file sources without content, show metadata
    if (!content && (source.source_type === 'pdf' || source.source_type === 'docx')) {
        content = `**File:** ${source.file_name || source.title}\n\n**Size:** ${formatFileSize(source.file_size || 0)}\n\n**Type:** ${source.source_type.toUpperCase()}\n\n*Content extraction may still be processing...*`;
    }

    // Add metadata header
    const metadata = `
> **Type:** ${source.source_type.toUpperCase()} | **Size:** ${formatFileSize(source.file_size || 0)} | **Added:** ${new Date(source.created_at).toLocaleDateString()}

---

`;

    // Use ModalService.content() instead of direct ContentModal instantiation
    const modal = ModalService.content({
        title: modalTitle,
        content: metadata + content,
        contentType: 'markdown',
        resizable: true,
        width: 700,
        height: 500
    });

}

/**
 * Edit a source using the modal service
 */
async function editSource(sourceId) {
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    // Check if ModalService is available
    if (typeof ModalService === 'undefined') {
        console.error('ModalService not available');
        alert('Edit functionality not available');
        return;
    }

    // Build fields based on source type
    const fields = [
        {
            name: 'title',
            label: 'Title',
            type: 'text',
            required: true,
            placeholder: 'Source title',
            value: source.title
        }
    ];

    // Only show content field for text-based sources
    if (source.source_type === 'text' || source.source_type === 'markdown') {
        fields.push({
            name: 'content',
            label: 'Content',
            type: 'textarea',
            rows: 12,
            placeholder: 'Source content',
            value: source.content || ''
        });
    }

    const values = await ModalService.form({
        title: `Edit Source: ${source.title}`,
        fields: fields,
        submitText: 'Save Changes',
        cancelText: 'Cancel'
    });

    // If user cancelled, values will be null
    if (!values) return;

    try {
        const updateData = { title: values.title };
        if (values.content !== undefined) {
            updateData.content = values.content;
        }

        const response = await fetch(`${API_BASE}/${currentStudio.id}/sources/${sourceId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        const result = await response.json();

        if (result.success) {
            // Update local source
            Object.assign(source, updateData);
            renderSources();
        } else {
            throw new Error(result.error || 'Failed to update source');
        }
    } catch (error) {
        console.error('Error updating source:', error);
        alert('Error updating source: ' + error.message);
    }
}

/**
 * Delete a source
 */
async function deleteSource(sourceId) {
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    // Use ModalService for confirmation if available
    let confirmed = false;
    if (typeof ModalService !== 'undefined') {
        confirmed = await ModalService.confirm({
            title: 'Delete Source',
            message: `Are you sure you want to delete "${source.title}"? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger'
        });
    } else {
        confirmed = confirm('Are you sure you want to delete this source?');
    }

    if (!confirmed) return;

    try {
        const response = await fetch(`${API_BASE}/${currentStudio.id}/sources/${sourceId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            sources = sources.filter(s => s.id !== sourceId);
            renderSources();
        } else {
            if (typeof ModalService !== 'undefined') {
                ModalService.error(result.error || 'Failed to delete source', 'Delete Failed');
            } else {
                alert('Failed to delete source: ' + result.error);
            }
        }
    } catch (error) {
        console.error('Error deleting source:', error);
        if (typeof ModalService !== 'undefined') {
            ModalService.error('An error occurred while deleting the source', 'Delete Failed');
        } else {
            alert('Error deleting source');
        }
    }
}

/**
 * Toggle all sources selection
 */
document.getElementById('selectAllSources')?.addEventListener('change', async function() {
    const isSelected = this.checked;

    for (const source of sources) {
        if (source.is_selected !== isSelected) {
            await toggleSource(source.id, isSelected);
        }
    }

    renderSources();
});

/**
 * Update context info display
 */
function updateContextInfo() {
    const selectedCount = sources.filter(s => s.is_selected).length;
    document.getElementById('selectedSourcesInfo').textContent = `${selectedCount} source${selectedCount !== 1 ? 's' : ''} selected`;
}

// ============================================================================
// CHAT FUNCTIONALITY
// ============================================================================

/**
 * Load suggested questions from sources
 */
async function loadSuggestedQuestions() {
    if (!currentStudio) return;

    const selectedSources = sources.filter(s => s.is_selected);
    if (selectedSources.length === 0) return;

    try {
        const response = await fetch(`${API_BASE}/${currentStudio.id}/suggested-questions?count=4`);
        const result = await response.json();

        if (result.success && result.data.questions) {
            renderSuggestedQuestions(result.data.questions);
        }
    } catch (error) {
        console.error('Error loading suggested questions:', error);
    }
}

/**
 * Render suggested questions in the welcome area or after messages
 */
function renderSuggestedQuestions(questions) {
    const container = document.getElementById('suggestedQuestions');
    if (!container) return;

    container.innerHTML = questions.map(q => `
        <button class="suggested-question" onclick="askSuggested(this)">
            ${escapeHtml(q)}
        </button>
    `).join('');
}

/**
 * Render follow-up questions after an assistant message
 */
function renderFollowUpQuestions(questions, messageDiv) {
    if (!questions || questions.length === 0) return;

    const followUpHtml = `
        <div class="follow-up-questions">
            <span class="follow-up-label">Follow up:</span>
            ${questions.map(q => `
                <button class="follow-up-btn" onclick="askSuggested(this)">${escapeHtml(q)}</button>
            `).join('')}
        </div>
    `;

    messageDiv.insertAdjacentHTML('beforeend', followUpHtml);
}

/**
 * Load chat history
 */
async function loadChatHistory() {
    if (!currentConversationId) return;

    try {
        const response = await fetch(`${API_BASE}/${currentStudio.id}/conversations/${currentConversationId}/messages`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            const container = document.getElementById('chatMessages');
            container.innerHTML = '';

            result.data.forEach(message => {
                appendMessage(message.role, message.content, message.citations);
            });
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

/**
 * Handle input keydown
 */
function handleInputKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

/**
 * Auto-resize input textarea
 */
function autoResizeInput(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

/**
 * Send a chat message
 */
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message || isStreaming) return;
    if (!currentStudio) {
        alert('Please select or create a studio first');
        return;
    }

    const selectedSources = sources.filter(s => s.is_selected);
    if (selectedSources.length === 0) {
        alert('Please select at least one source');
        return;
    }

    isStreaming = true;
    input.value = '';
    input.style.height = 'auto';
    document.getElementById('sendBtn').disabled = true;

    // Clear welcome message if present
    const welcomeEl = document.querySelector('.studio-chat-welcome');
    if (welcomeEl) {
        welcomeEl.remove();
    }

    // Append user message
    appendMessage('user', message);

    // Append placeholder for assistant
    const assistantDiv = appendMessage('assistant', '');
    const contentDiv = assistantDiv.querySelector('.studio-message-content') || assistantDiv;

    // Show loading spinner with rotating messages (like chat.html)
    contentDiv.innerHTML = `
        <div class="message-loading">
            <img src="/assets/loading-spinner.svg" alt="Loading" class="loading-spinner">
            <span class="loading-text"></span>
        </div>
    `;

    // Start rotating loading messages
    if (typeof LoadingMessages !== 'undefined') {
        const loadingTextEl = contentDiv.querySelector('.loading-text');
        if (loadingTextEl) {
            if (loadingMessageController) {
                loadingMessageController.stop();
            }
            loadingMessageController = LoadingMessages.start(loadingTextEl, {
                preset: 'chat',
                interval: 2500
            });
        }
    }

    try {
        // Get selected model (function defined in research-studio.html)
        const model = typeof getSelectedModel === 'function' ? getSelectedModel() : 'claude-sonnet-4-20250514';

        const response = await fetch(`${API_BASE}/${currentStudio.id}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                conversationId: currentConversationId,
                model
            })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let citations = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));

                        if (data.type === 'chunk') {
                            // Stop loading messages on first content
                            if (fullContent === '') {
                                stopLoadingMessages();
                            }
                            fullContent += data.content;
                            contentDiv.innerHTML = formatMarkdown(fullContent);
                            scrollToBottom();
                        } else if (data.type === 'context') {
                            document.getElementById('tokenInfo').textContent = `${data.tokenCount.toLocaleString()} tokens`;
                        } else if (data.type === 'done') {
                            citations = data.citations || [];
                            currentConversationId = data.conversationId;

                            // Format content with highlighted citations
                            let formattedContent = highlightCitations(formatMarkdown(fullContent), citations);

                            // Add citations with quotes
                            if (citations.length > 0) {
                                const citationsHtml = `
                                    <div class="message-citations">
                                        <div class="citations-header"><strong>Sources cited:</strong></div>
                                        ${citations.map(c => `
                                            <div class="citation-item" onclick="highlightSourceInList('${c.source_id}')">
                                                <span class="citation-badge">[${c.source_index || '?'}]</span>
                                                <span class="citation-title">${escapeHtml(c.source_title)}</span>
                                                ${c.quote ? `<span class="citation-quote">"${escapeHtml(c.quote.substring(0, 100))}${c.quote.length > 100 ? '...' : ''}"</span>` : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                `;
                                formattedContent += citationsHtml;
                            }

                            contentDiv.innerHTML = formattedContent;

                            // Add follow-up questions if provided
                            if (data.followUpQuestions && data.followUpQuestions.length > 0) {
                                renderFollowUpQuestions(data.followUpQuestions, assistantDiv);
                            }
                        } else if (data.type === 'error') {
                            stopLoadingMessages();
                            contentDiv.innerHTML = `<span style="color: var(--danger);">Error: ${escapeHtml(data.error)}</span>`;
                        }
                    } catch (e) {
                        // Ignore parse errors for incomplete JSON
                    }
                }
            }
        }
    } catch (error) {
        console.error('Chat error:', error);
        stopLoadingMessages();
        contentDiv.innerHTML = `<span style="color: var(--danger);">Error: ${error.message}</span>`;
    } finally {
        isStreaming = false;
        stopLoadingMessages();
        document.getElementById('sendBtn').disabled = false;
    }
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
 * Append a message to the chat
 */
function appendMessage(role, content, citations = []) {
    const container = document.getElementById('chatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = `studio-message ${role}`;

    // Format content with highlighted citations for assistant messages
    let formattedContent = formatMarkdown(content);
    if (role === 'assistant' && citations && citations.length > 0) {
        formattedContent = highlightCitations(formattedContent, citations);
    }

    const avatar = role === 'user' ? '👤' : '🔬';
    const label = role === 'user' ? 'You' : 'Research Assistant';
    const time = new Date().toLocaleTimeString();
    const messageId = `msg-${Date.now()}`;

    // Action buttons - assistant messages get save as source button
    const saveAsSourceBtn = role === 'assistant' ? `
        <button class="studio-message-action" onclick="saveMessageAsSource('${messageId}')" title="Save as Source">
            <i data-lucide="file-plus"></i>
        </button>` : '';

    let html = `
        <div class="studio-message-avatar">${avatar}</div>
        <div class="studio-message-body">
            <div class="studio-message-header">
                <span class="studio-message-author">${label}</span>
                <span class="studio-message-time">${time}</span>
                <div class="studio-message-actions">
                    <button class="studio-message-action" onclick="copyMessageContent('${messageId}')" title="Copy">
                        <i data-lucide="copy"></i>
                    </button>
                    ${saveAsSourceBtn}
                </div>
            </div>
            <div class="studio-message-content" id="${messageId}">${formattedContent}</div>
    `;

    if (citations && citations.length > 0) {
        html += `
            <div class="message-citations">
                <div class="citations-header"><strong>Sources cited:</strong></div>
                ${citations.map(c => `
                    <div class="citation-item" onclick="highlightSourceInList('${c.source_id}')">
                        <span class="citation-badge">[${c.source_index || '?'}]</span>
                        <span class="citation-title">${escapeHtml(c.source_title || 'Source')}</span>
                        ${c.quote ? `<span class="citation-quote">"${escapeHtml(c.quote.substring(0, 100))}${c.quote.length > 100 ? '...' : ''}"</span>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    html += `</div>`;

    messageDiv.innerHTML = html;
    container.appendChild(messageDiv);

    // Initialize Lucide icons for the new message
    lucide.createIcons();

    scrollToBottom();

    return messageDiv;
}

/**
 * Copy message content to clipboard
 */
function copyMessageContent(messageId) {
    const contentEl = document.getElementById(messageId);
    if (contentEl) {
        const text = contentEl.innerText;
        navigator.clipboard.writeText(text).then(() => {
            // Show brief feedback
            const btn = contentEl.closest('.studio-message').querySelector('.studio-message-action[title="Copy"]');
            if (btn) {
                const originalIcon = btn.innerHTML;
                btn.innerHTML = '<i data-lucide="check"></i>';
                lucide.createIcons();
                setTimeout(() => {
                    btn.innerHTML = originalIcon;
                    lucide.createIcons();
                }, 1500);
            }
        });
    }
}

/**
 * Save a message as a new source
 */
async function saveMessageAsSource(messageId) {
    if (!currentStudio) {
        alert('Please select or create a studio first');
        return;
    }

    const contentEl = document.getElementById(messageId);
    if (!contentEl) {
        console.error('Message element not found:', messageId);
        alert('Could not find message content');
        return;
    }

    const content = contentEl.innerText;
    if (!content || content.trim().length === 0) {
        alert('No content to save');
        return;
    }

    const model = typeof getSelectedModel === 'function' ? getSelectedModel() : 'Unknown';
    const title = `Research Response - ${new Date().toLocaleDateString()} (${model})`;

    // Show loading state on button
    const btn = contentEl.closest('.studio-message')?.querySelector('.studio-message-action[title="Save as Source"]');
    let originalIcon = null;
    if (btn) {
        originalIcon = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i>';
        btn.disabled = true;
        lucide.createIcons();
    }

    try {
        const response = await fetch(`${API_BASE}/${currentStudio.id}/sources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: content,
                title: title
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error:', response.status, errorText);
            throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            // Add to sources list
            sources.unshift(result.data);
            renderSources();
            updateContextInfo();

            // Show success feedback
            if (btn) {
                btn.innerHTML = '<i data-lucide="check"></i>';
                btn.title = 'Saved!';
                btn.disabled = false;
                lucide.createIcons();
                setTimeout(() => {
                    btn.innerHTML = originalIcon;
                    btn.title = 'Save as Source';
                    lucide.createIcons();
                }, 2000);
            }
        } else {
            throw new Error(result.error || 'Failed to save source');
        }
    } catch (error) {
        console.error('Error saving as source:', error);
        alert('Error saving as source: ' + error.message);

        // Reset button on error
        if (btn && originalIcon) {
            btn.innerHTML = originalIcon;
            btn.disabled = false;
            lucide.createIcons();
        }
    }
}

/**
 * Highlight citations in text with interactive badges
 */
function highlightCitations(html, citations) {
    if (!citations || citations.length === 0) return html;

    // Replace [Source N] patterns with clickable badges
    return html.replace(/\[Source (\d+)\]/g, (match, num) => {
        const citation = citations.find(c => c.source_index === parseInt(num));
        if (citation) {
            return `<span class="inline-citation" onclick="highlightSourceInList('${citation.source_id}')" title="${escapeHtml(citation.source_title)}">[${num}]</span>`;
        }
        return match;
    });
}

/**
 * Highlight a source in the sources list
 */
function highlightSourceInList(sourceId) {
    // Remove previous highlights
    document.querySelectorAll('.source-item.highlighted').forEach(el => {
        el.classList.remove('highlighted');
    });

    // Find and highlight the source
    const sourceItem = document.querySelector(`.source-item[data-id="${sourceId}"]`);
    if (sourceItem) {
        sourceItem.classList.add('highlighted');
        sourceItem.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Remove highlight after 3 seconds
        setTimeout(() => {
            sourceItem.classList.remove('highlighted');
        }, 3000);
    }
}

/**
 * Ask a suggested question
 */
function askSuggested(button) {
    const question = button.textContent.trim();
    document.getElementById('chatInput').value = question;
    sendMessage();
}

/**
 * Clear chat
 */
async function clearChat() {
    // Use ModalService for confirmation if available
    let confirmed = false;
    if (typeof ModalService !== 'undefined') {
        confirmed = await ModalService.confirm({
            title: 'Clear Chat',
            message: 'Are you sure you want to clear all messages in this conversation?',
            confirmText: 'Clear',
            cancelText: 'Cancel',
            type: 'warning'
        });
    } else {
        confirmed = confirm('Clear all messages in this conversation?');
    }

    if (!confirmed) return;

    document.getElementById('chatMessages').innerHTML = `
        <div class="studio-chat-welcome">
            <h2>Welcome to Research Studio</h2>
            <p>Upload your sources and start asking questions. I'll analyze them and provide answers with citations.</p>
            <div class="suggested-questions" id="suggestedQuestions">
                <button class="suggested-question" onclick="askSuggested(this)">
                    What are the main themes across these sources?
                </button>
                <button class="suggested-question" onclick="askSuggested(this)">
                    Summarize the key findings
                </button>
                <button class="suggested-question" onclick="askSuggested(this)">
                    What questions do these sources answer?
                </button>
            </div>
        </div>
    `;
}

/**
 * Scroll chat to bottom
 */
function scrollToBottom() {
    const container = document.getElementById('chatMessages');
    container.scrollTop = container.scrollHeight;
}

// ============================================================================
// CHAT HISTORY MANAGEMENT
// ============================================================================

// Chat history state
let conversations = [];
let chatHistoryVisible = false;

/**
 * Toggle chat history panel visibility
 */
function toggleChatHistory() {
    const panel = document.getElementById('chatHistoryPanel');
    chatHistoryVisible = !chatHistoryVisible;

    if (chatHistoryVisible) {
        panel.style.display = 'flex';
        loadChatHistoryList();
    } else {
        panel.style.display = 'none';
    }
}

/**
 * Load chat history list
 */
async function loadChatHistoryList() {
    if (!currentStudio) return;

    const container = document.getElementById('chatHistoryList');
    container.innerHTML = '<div class="chat-history-empty"><i data-lucide="loader-2" class="spin"></i> Loading...</div>';
    lucide.createIcons();

    try {
        const response = await fetch(`${API_BASE}/${currentStudio.id}/conversations`);
        const result = await response.json();

        if (result.success) {
            conversations = result.data;
            renderChatHistoryList();
        } else {
            container.innerHTML = '<div class="chat-history-empty">Failed to load conversations</div>';
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        container.innerHTML = '<div class="chat-history-empty">Error loading conversations</div>';
    }
}

/**
 * Render chat history list
 */
function renderChatHistoryList() {
    const container = document.getElementById('chatHistoryList');

    if (conversations.length === 0) {
        container.innerHTML = '<div class="chat-history-empty">No conversations yet</div>';
        return;
    }

    container.innerHTML = conversations.map(convo => {
        const date = new Date(convo.updated_at).toLocaleDateString();
        const isActive = convo.id === currentConversationId;

        return `
            <div class="chat-history-card ${isActive ? 'active' : ''}"
                 data-id="${convo.id}"
                 onclick="switchToConversation('${convo.id}')">
                <div class="chat-history-card-header">
                    <span class="chat-history-card-title">${escapeHtml(convo.title)}</span>
                    <div class="chat-history-card-actions">
                        <button class="btn btn-icon btn-sm" onclick="event.stopPropagation(); renameConversation('${convo.id}')" title="Rename">
                            <i data-lucide="pencil"></i>
                        </button>
                        <button class="btn btn-icon btn-sm" onclick="event.stopPropagation(); deleteConversation('${convo.id}')" title="Delete">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </div>
                <div class="chat-history-card-preview">${escapeHtml(convo.preview)}</div>
                <div class="chat-history-card-meta">
                    <span><i data-lucide="message-square"></i> ${convo.message_count} messages</span>
                    <span><i data-lucide="calendar"></i> ${date}</span>
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

/**
 * Start a new chat conversation
 */
async function startNewChat() {
    if (!currentStudio) {
        alert('Please select or create a studio first');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/${currentStudio.id}/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const result = await response.json();

        if (result.success) {
            currentConversationId = result.data.id;

            // Clear chat display
            document.getElementById('chatMessages').innerHTML = `
                <div class="studio-chat-welcome">
                    <h2>Welcome to Research Studio</h2>
                    <p>Upload your sources and start asking questions. I'll analyze them and provide answers with citations.</p>
                    <div class="suggested-questions" id="suggestedQuestions">
                        <button class="suggested-question" onclick="askSuggested(this)">
                            What are the main themes across these sources?
                        </button>
                        <button class="suggested-question" onclick="askSuggested(this)">
                            Summarize the key findings
                        </button>
                        <button class="suggested-question" onclick="askSuggested(this)">
                            What questions do these sources answer?
                        </button>
                    </div>
                </div>
            `;

            // Refresh chat history if visible
            if (chatHistoryVisible) {
                await loadChatHistoryList();
            }
        } else {
            alert('Failed to create new chat: ' + result.error);
        }
    } catch (error) {
        console.error('Error creating new chat:', error);
        alert('Error creating new chat');
    }
}

/**
 * Switch to a specific conversation
 */
async function switchToConversation(conversationId) {
    if (!currentStudio || conversationId === currentConversationId) return;

    try {
        // Activate the conversation on the server
        const response = await fetch(`${API_BASE}/${currentStudio.id}/conversations/${conversationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: true })
        });

        const result = await response.json();

        if (result.success) {
            currentConversationId = conversationId;

            // Load messages for this conversation
            await loadChatHistory();

            // Update chat history list highlight
            if (chatHistoryVisible) {
                document.querySelectorAll('.chat-history-card').forEach(card => {
                    card.classList.toggle('active', card.dataset.id === conversationId);
                });
            }

            // Close the history panel
            toggleChatHistory();
        } else {
            alert('Failed to switch conversation: ' + result.error);
        }
    } catch (error) {
        console.error('Error switching conversation:', error);
        alert('Error switching conversation');
    }
}

/**
 * Rename a conversation
 */
async function renameConversation(conversationId) {
    const convo = conversations.find(c => c.id === conversationId);
    if (!convo) return;

    const newTitle = prompt('Enter new name for this conversation:', convo.title);
    if (!newTitle || newTitle === convo.title) return;

    try {
        const response = await fetch(`${API_BASE}/${currentStudio.id}/conversations/${conversationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle })
        });

        const result = await response.json();

        if (result.success) {
            // Update local state
            convo.title = newTitle;
            renderChatHistoryList();
        } else {
            alert('Failed to rename conversation: ' + result.error);
        }
    } catch (error) {
        console.error('Error renaming conversation:', error);
        alert('Error renaming conversation');
    }
}

/**
 * Delete a conversation
 */
async function deleteConversation(conversationId) {
    const convo = conversations.find(c => c.id === conversationId);
    if (!convo) return;

    // Use ModalService for confirmation if available
    let confirmed = false;
    if (typeof ModalService !== 'undefined') {
        confirmed = await ModalService.confirm({
            title: 'Delete Conversation',
            message: `Are you sure you want to delete "${convo.title}"? This will permanently delete all messages in this conversation.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger'
        });
    } else {
        confirmed = confirm(`Delete conversation "${convo.title}"? This cannot be undone.`);
    }

    if (!confirmed) return;

    try {
        const response = await fetch(`${API_BASE}/${currentStudio.id}/conversations/${conversationId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            // Remove from local state
            conversations = conversations.filter(c => c.id !== conversationId);

            // If we deleted the current conversation, create a new one
            if (conversationId === currentConversationId) {
                await startNewChat();
            } else {
                renderChatHistoryList();
            }
        } else {
            alert('Failed to delete conversation: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting conversation:', error);
        alert('Error deleting conversation');
    }
}

// ============================================================================
// OUTPUT GENERATION
// ============================================================================

/**
 * Generate an output
 */
async function generateOutput(type) {
    if (!currentStudio) {
        alert('Please select or create a studio first');
        return;
    }

    const selectedSources = sources.filter(s => s.is_selected);
    if (selectedSources.length === 0) {
        alert('Please select at least one source');
        return;
    }

    // Mark button as generating
    const btn = document.querySelector(`.output-btn[onclick="generateOutput('${type}')"]`);
    if (btn) {
        btn.classList.add('generating');
        btn.innerHTML = `<i data-lucide="loader-2" class="icon spin"></i><span class="label">Generating...</span>`;
        lucide.createIcons();
    }

    try {
        // Get selected model (function defined in research-studio.html)
        const model = typeof getSelectedModel === 'function' ? getSelectedModel() : 'claude-sonnet-4-20250514';

        const response = await fetch(`${API_BASE}/${currentStudio.id}/outputs/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model })
        });

        const result = await response.json();

        if (result.success) {
            outputs.unshift(result.data);
            renderOutputs();
            showOutputPreview(result.data);
        } else {
            alert('Failed to generate output: ' + result.error);
        }
    } catch (error) {
        console.error('Error generating output:', error);
        alert('Error generating output');
    } finally {
        // Reset button
        if (btn) {
            btn.classList.remove('generating');
            btn.innerHTML = `<i data-lucide="${getOutputIcon(type)}" class="icon"></i><span class="label">${capitalizeFirst(type)}</span>`;
            lucide.createIcons();
        }
    }
}

/**
 * Render outputs list
 */
function renderOutputs() {
    const container = document.getElementById('outputsList');

    if (outputs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No outputs yet. Generate content from your sources!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = outputs.map(output => `
        <div class="output-item" onclick="showOutputPreview(${JSON.stringify(output).replace(/"/g, '&quot;')})">
            <div class="output-item-icon">
                <i data-lucide="${getOutputIcon(output.output_type)}"></i>
            </div>
            <div class="output-item-info">
                <div class="output-item-title">${escapeHtml(output.title || capitalizeFirst(output.output_type))}</div>
                <div class="output-item-meta">${new Date(output.created_at).toLocaleDateString()}</div>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

/**
 * Get icon for output type
 */
function getOutputIcon(type) {
    const icons = {
        audio: 'headphones',
        report: 'file-text',
        summary: 'file-text',
        flashcards: 'layers',
        quiz: 'help-circle',
        mindmap: 'git-branch',
        infographic: 'bar-chart-2',
        slides: 'presentation',
        table: 'table',
        briefing: 'briefcase'
    };
    return icons[type] || 'file';
}

// State for interactive outputs
let currentQuiz = null;
let quizAnswers = {};
let currentFlashcardIndex = 0;
let flashcardFlipped = false;

/**
 * Show output preview modal
 */
function showOutputPreview(output) {
    const titleEl = document.getElementById('outputPreviewTitle');
    const contentEl = document.getElementById('outputPreviewContent');

    titleEl.textContent = output.title || capitalizeFirst(output.output_type);

    // Render based on output type
    const content = output.content;
    let html = '';

    switch (output.output_type) {
        case 'report':
            html = renderReport(content);
            break;

        case 'summary':
            html = renderSummary(content);
            break;

        case 'flashcards':
            html = renderFlashcards(content, output);
            break;

        case 'quiz':
            html = renderInteractiveQuiz(content, output);
            break;

        case 'mindmap':
            html = renderMindmap(content);
            break;

        case 'slides':
            html = renderSlides(content);
            break;

        case 'table':
            html = renderTable(content);
            break;

        case 'briefing':
            html = renderBriefing(content);
            break;

        case 'infographic':
            html = renderInfographic(content);
            break;

        case 'audio':
            html = renderAudioOverview(content, output);
            break;

        default:
            html = `<pre style="white-space: pre-wrap; font-size: 0.9rem;">${escapeHtml(JSON.stringify(content, null, 2))}</pre>`;
    }

    contentEl.innerHTML = html;
    showModal('outputPreviewModal');

    // Initialize interactive elements
    if (output.output_type === 'quiz') {
        currentQuiz = output;
        quizAnswers = {};
    }
    if (output.output_type === 'flashcards') {
        currentFlashcardIndex = 0;
        flashcardFlipped = false;
    }

    lucide.createIcons();
}

/**
 * Render report output
 */
function renderReport(content) {
    let html = `<div class="output-report">`;
    html += `<h3>${escapeHtml(content.title || 'Report')}</h3>`;

    if (content.executive_summary) {
        html += `
            <div class="report-section executive-summary">
                <h4><i data-lucide="file-text"></i> Executive Summary</h4>
                <p>${escapeHtml(content.executive_summary)}</p>
            </div>
        `;
    }

    if (content.key_findings && content.key_findings.length > 0) {
        html += `
            <div class="report-section">
                <h4><i data-lucide="lightbulb"></i> Key Findings</h4>
                <ul class="findings-list">
                    ${content.key_findings.map(f => {
                        const finding = typeof f === 'object' ? f.finding : f;
                        const sources = typeof f === 'object' && f.source_refs ? f.source_refs.join(', ') : '';
                        return `<li>${escapeHtml(finding)}${sources ? ` <span class="source-ref">(${escapeHtml(sources)})</span>` : ''}</li>`;
                    }).join('')}
                </ul>
            </div>
        `;
    }

    if (content.sections && content.sections.length > 0) {
        content.sections.forEach(section => {
            html += `
                <div class="report-section">
                    <h4>${escapeHtml(section.heading)}</h4>
                    <p>${escapeHtml(section.content)}</p>
                    ${section.subsections ? section.subsections.map(sub => `
                        <div class="subsection">
                            <h5>${escapeHtml(sub.heading)}</h5>
                            <p>${escapeHtml(sub.content)}</p>
                        </div>
                    `).join('') : ''}
                </div>
            `;
        });
    }

    if (content.conclusions && content.conclusions.length > 0) {
        html += `
            <div class="report-section conclusions">
                <h4><i data-lucide="check-circle"></i> Conclusions</h4>
                <ul>
                    ${content.conclusions.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    html += `</div>`;
    return html;
}

/**
 * Render summary output
 */
function renderSummary(content) {
    let html = `<div class="output-summary">`;
    html += `<h3>${escapeHtml(content.title || 'Summary')}</h3>`;

    if (content.overview) {
        html += `<p class="overview">${escapeHtml(content.overview)}</p>`;
    }
    if (content.summary) {
        html += `<p>${escapeHtml(content.summary)}</p>`;
    }

    if (content.key_points && content.key_points.length > 0) {
        html += `
            <h4>Key Points</h4>
            <ul>${content.key_points.map(p => `<li>${escapeHtml(typeof p === 'string' ? p : p.point || p)}</li>`).join('')}</ul>
        `;
    }

    if (content.themes && content.themes.length > 0) {
        html += `
            <h4>Themes</h4>
            <div class="themes-grid">
                ${content.themes.map(t => `
                    <div class="theme-card">
                        <strong>${escapeHtml(typeof t === 'string' ? t : t.theme)}</strong>
                        ${typeof t === 'object' && t.description ? `<p>${escapeHtml(t.description)}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    if (content.takeaways && content.takeaways.length > 0) {
        html += `
            <h4>Key Takeaways</h4>
            <ul class="takeaways">${content.takeaways.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
        `;
    }

    html += `</div>`;
    return html;
}

/**
 * Render interactive flashcards
 */
function renderFlashcards(content, output) {
    const cards = content.cards || [];
    if (cards.length === 0) return '<p>No flashcards generated</p>';

    return `
        <div class="flashcards-interactive" data-output-id="${output.id}">
            <div class="flashcards-header">
                <span class="card-counter">Card <span id="currentCardNum">1</span> of ${cards.length}</span>
                <div class="flashcards-controls">
                    <button class="btn btn-sm btn-ghost" onclick="shuffleFlashcards()" title="Shuffle">
                        <i data-lucide="shuffle"></i>
                    </button>
                </div>
            </div>
            <div class="flashcard-display" onclick="flipFlashcard()">
                <div class="flashcard-inner" id="flashcardInner">
                    <div class="flashcard-front">
                        <span class="difficulty-badge ${cards[0].difficulty || 'medium'}">${cards[0].difficulty || 'medium'}</span>
                        <p class="card-question">${escapeHtml(cards[0].question)}</p>
                        <span class="flip-hint">Click to flip</span>
                    </div>
                    <div class="flashcard-back">
                        <p class="card-answer">${escapeHtml(cards[0].answer)}</p>
                        ${cards[0].source_hint ? `<span class="source-hint">${escapeHtml(cards[0].source_hint)}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="flashcards-navigation">
                <button class="btn btn-ghost" onclick="prevFlashcard()" id="prevCardBtn" disabled>
                    <i data-lucide="chevron-left"></i> Previous
                </button>
                <button class="btn btn-ghost" onclick="nextFlashcard()" id="nextCardBtn" ${cards.length <= 1 ? 'disabled' : ''}>
                    Next <i data-lucide="chevron-right"></i>
                </button>
            </div>
            <div class="flashcards-progress">
                <div class="progress-bar">
                    <div class="progress-fill" id="flashcardProgress" style="width: ${100 / cards.length}%"></div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Navigate to previous flashcard
 */
function prevFlashcard() {
    if (currentFlashcardIndex > 0) {
        currentFlashcardIndex--;
        updateFlashcardDisplay();
    }
}

/**
 * Navigate to next flashcard
 */
function nextFlashcard() {
    const cards = currentQuiz?.content?.cards || [];
    if (currentFlashcardIndex < cards.length - 1) {
        currentFlashcardIndex++;
        updateFlashcardDisplay();
    }
}

/**
 * Flip flashcard to show answer/question
 */
function flipFlashcard() {
    flashcardFlipped = !flashcardFlipped;
    const inner = document.getElementById('flashcardInner');
    if (inner) {
        inner.classList.toggle('flipped', flashcardFlipped);
    }
}

/**
 * Update flashcard display after navigation
 */
function updateFlashcardDisplay() {
    const cards = currentQuiz?.content?.cards || [];
    const card = cards[currentFlashcardIndex];
    if (!card) return;

    flashcardFlipped = false;
    const inner = document.getElementById('flashcardInner');
    if (inner) {
        inner.classList.remove('flipped');
        inner.querySelector('.card-question').textContent = card.question;
        inner.querySelector('.card-answer').textContent = card.answer;
        const badge = inner.querySelector('.difficulty-badge');
        if (badge) {
            badge.className = `difficulty-badge ${card.difficulty || 'medium'}`;
            badge.textContent = card.difficulty || 'medium';
        }
        const hint = inner.querySelector('.source-hint');
        if (hint) {
            hint.textContent = card.source_hint || '';
            hint.style.display = card.source_hint ? 'block' : 'none';
        }
    }

    document.getElementById('currentCardNum').textContent = currentFlashcardIndex + 1;
    document.getElementById('prevCardBtn').disabled = currentFlashcardIndex === 0;
    document.getElementById('nextCardBtn').disabled = currentFlashcardIndex === cards.length - 1;
    document.getElementById('flashcardProgress').style.width = `${((currentFlashcardIndex + 1) / cards.length) * 100}%`;
}

/**
 * Render interactive quiz
 */
function renderInteractiveQuiz(content, output) {
    const questions = content.questions || [];
    if (questions.length === 0) return '<p>No quiz questions generated</p>';

    return `
        <div class="quiz-interactive" data-output-id="${output.id}">
            <div class="quiz-header">
                <h4>${escapeHtml(content.title || 'Quiz')}</h4>
                <p class="quiz-meta">
                    ${questions.length} questions
                    ${content.time_limit_minutes ? ` • ${content.time_limit_minutes} min` : ''}
                    ${content.passing_score ? ` • Pass: ${content.passing_score}%` : ''}
                </p>
            </div>
            <form id="quizForm" onsubmit="submitQuiz(event, '${output.id}')">
                ${questions.map((q, idx) => `
                    <div class="quiz-question" data-question-id="${q.id}">
                        <div class="question-header">
                            <span class="question-number">Q${idx + 1}</span>
                            <span class="difficulty-badge ${q.difficulty || 'medium'}">${q.difficulty || 'medium'}</span>
                            ${q.topic ? `<span class="topic-badge">${escapeHtml(q.topic)}</span>` : ''}
                        </div>
                        <p class="question-text">${escapeHtml(q.question)}</p>
                        <div class="options-list">
                            ${(q.options || []).map(opt => {
                                const label = typeof opt === 'object' ? opt.label : opt.charAt(0);
                                const text = typeof opt === 'object' ? opt.text : opt.substring(2).trim();
                                return `
                                    <label class="option-item">
                                        <input type="radio" name="q_${q.id}" value="${label}" onchange="markQuestionAnswered(${q.id})">
                                        <span class="option-label">${escapeHtml(label)}</span>
                                        <span class="option-text">${escapeHtml(text)}</span>
                                    </label>
                                `;
                            }).join('')}
                        </div>
                        <div class="question-feedback" id="feedback_${q.id}" style="display: none;"></div>
                    </div>
                `).join('')}
                <div class="quiz-actions">
                    <button type="submit" class="btn btn-primary">
                        <i data-lucide="check-circle"></i> Submit Quiz
                    </button>
                </div>
            </form>
            <div id="quizResults" style="display: none;"></div>
        </div>
    `;
}

/**
 * Mark a quiz question as answered
 */
function markQuestionAnswered(questionId) {
    const questionDiv = document.querySelector(`[data-question-id="${questionId}"]`);
    if (questionDiv) {
        questionDiv.classList.add('answered');
    }
}

/**
 * Submit quiz and get score
 */
async function submitQuiz(event, outputId) {
    event.preventDefault();

    const form = document.getElementById('quizForm');
    const formData = new FormData(form);
    const answers = {};

    for (const [key, value] of formData.entries()) {
        const questionId = parseInt(key.replace('q_', ''));
        answers[questionId] = value;
    }

    try {
        const response = await fetch(`${API_BASE}/${currentStudio.id}/outputs/${outputId}/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers })
        });

        const result = await response.json();

        if (result.success) {
            displayQuizResults(result.data);
        } else {
            alert('Error scoring quiz: ' + result.error);
        }
    } catch (error) {
        console.error('Error submitting quiz:', error);
        alert('Error submitting quiz');
    }
}

/**
 * Display quiz results
 */
function displayQuizResults(results) {
    const form = document.getElementById('quizForm');
    const resultsDiv = document.getElementById('quizResults');

    // Disable form
    form.querySelectorAll('input').forEach(input => input.disabled = true);
    form.querySelector('button[type="submit"]').style.display = 'none';

    // Show feedback for each question
    results.results.forEach(r => {
        const feedbackDiv = document.getElementById(`feedback_${r.question_id}`);
        const questionDiv = document.querySelector(`[data-question-id="${r.question_id}"]`);

        if (feedbackDiv && questionDiv) {
            feedbackDiv.style.display = 'block';
            questionDiv.classList.add(r.is_correct ? 'correct' : 'incorrect');

            feedbackDiv.innerHTML = `
                <div class="feedback ${r.is_correct ? 'correct' : 'incorrect'}">
                    <strong>${r.is_correct ? '✓ Correct!' : '✗ Incorrect'}</strong>
                    ${!r.is_correct ? `<p>Correct answer: ${escapeHtml(r.correct_answer)}</p>` : ''}
                    ${r.explanation ? `<p class="explanation">${escapeHtml(r.explanation)}</p>` : ''}
                </div>
            `;
        }
    });

    // Show overall results
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `
        <div class="quiz-results-summary ${results.passed ? 'passed' : 'failed'}">
            <h3>${results.passed ? '🎉 Congratulations!' : '📚 Keep Learning!'}</h3>
            <div class="score-display">
                <span class="score-percentage">${results.percentage}%</span>
                <span class="score-fraction">${results.correct_count}/${results.total_questions} correct</span>
            </div>
            <p class="result-message">
                ${results.passed ? 'You passed the quiz!' : `You need ${currentQuiz?.content?.passing_score || 70}% to pass.`}
            </p>
            ${results.summary?.by_topic ? `
                <div class="topic-breakdown">
                    <h4>Performance by Topic</h4>
                    ${Object.entries(results.summary.by_topic).map(([topic, data]) => `
                        <div class="topic-row">
                            <span class="topic-name">${escapeHtml(topic)}</span>
                            <span class="topic-score">${data.correct}/${data.total}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render mind map output
 */
function renderMindmap(content) {
    let html = `<div class="output-mindmap">`;
    html += `<h3>${escapeHtml(content.central_topic || content.title || 'Mind Map')}</h3>`;
    if (content.description) {
        html += `<p class="mindmap-description">${escapeHtml(content.description)}</p>`;
    }
    if (content.branches) {
        html += `<div class="mindmap-branches">${renderMindmapBranchesEnhanced(content.branches)}</div>`;
    }
    html += `</div>`;
    return html;
}

/**
 * Render mind map branches with colors
 */
function renderMindmapBranchesEnhanced(branches) {
    return branches.map(branch => `
        <div class="mindmap-branch" style="border-left-color: ${branch.color || 'var(--primary)'}">
            <div class="branch-header" style="color: ${branch.color || 'var(--primary)'}">
                <strong>${escapeHtml(branch.topic)}</strong>
            </div>
            ${branch.subtopics ? `
                <div class="branch-subtopics">
                    ${branch.subtopics.map(sub => `
                        <div class="subtopic">
                            <span class="subtopic-name">${escapeHtml(sub.topic)}</span>
                            ${sub.details ? `<ul class="subtopic-details">${sub.details.map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            ${branch.details ? `<ul class="branch-details">${branch.details.map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul>` : ''}
        </div>
    `).join('');
}

/**
 * Render slides output
 */
function renderSlides(content) {
    const slides = content.slides || [];
    if (slides.length === 0) return '<p>No slides generated</p>';

    return `
        <div class="output-slides">
            <div class="slides-header">
                <h3>${escapeHtml(content.title || 'Presentation')}</h3>
                ${content.subtitle ? `<p class="subtitle">${escapeHtml(content.subtitle)}</p>` : ''}
                ${content.estimated_duration_minutes ? `<span class="duration">${content.estimated_duration_minutes} min</span>` : ''}
            </div>
            <div class="slides-list">
                ${slides.map((slide, i) => `
                    <div class="slide-card ${slide.type || 'content'}">
                        <div class="slide-number">${i + 1}</div>
                        <div class="slide-content">
                            <h4>${escapeHtml(slide.title)}</h4>
                            ${slide.subtitle ? `<p class="slide-subtitle">${escapeHtml(slide.subtitle)}</p>` : ''}
                            ${slide.bullet_points ? `<ul>${slide.bullet_points.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : ''}
                            ${slide.visual_suggestion ? `<span class="visual-hint"><i data-lucide="image"></i> ${escapeHtml(slide.visual_suggestion)}</span>` : ''}
                        </div>
                        ${slide.speaker_notes ? `
                            <div class="speaker-notes">
                                <strong>Notes:</strong> ${escapeHtml(slide.speaker_notes)}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Render table output
 */
function renderTable(content) {
    const columns = content.columns || [];
    const rows = content.rows || [];

    if (columns.length === 0) return '<p>No table data generated</p>';

    return `
        <div class="output-table">
            <h3>${escapeHtml(content.title || 'Data Table')}</h3>
            ${content.description ? `<p class="table-description">${escapeHtml(content.description)}</p>` : ''}
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            ${columns.map(col => `<th>${escapeHtml(typeof col === 'object' ? col.label : col)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>
                                ${(Array.isArray(row) ? row : columns.map(col => row[typeof col === 'object' ? col.key : col])).map(cell =>
                                    `<td>${escapeHtml(String(cell ?? ''))}</td>`
                                ).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${content.notes ? `<p class="table-notes">${escapeHtml(content.notes)}</p>` : ''}
        </div>
    `;
}

/**
 * Render briefing output
 */
function renderBriefing(content) {
    return `
        <div class="output-briefing">
            <div class="briefing-header">
                <h3>${escapeHtml(content.title || 'Executive Briefing')}</h3>
                ${content.date ? `<span class="briefing-date">${escapeHtml(content.date)}</span>` : ''}
                ${content.classification ? `<span class="classification">${escapeHtml(content.classification)}</span>` : ''}
            </div>

            ${content.situation_summary ? `
                <div class="briefing-section">
                    <h4><i data-lucide="info"></i> Situation</h4>
                    <p>${escapeHtml(content.situation_summary)}</p>
                </div>
            ` : ''}

            ${content.key_insights && content.key_insights.length > 0 ? `
                <div class="briefing-section">
                    <h4><i data-lucide="lightbulb"></i> Key Insights</h4>
                    ${content.key_insights.map(i => `
                        <div class="insight-item ${typeof i === 'object' ? i.impact : ''}">
                            ${escapeHtml(typeof i === 'object' ? i.insight : i)}
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${content.risks && content.risks.length > 0 ? `
                <div class="briefing-section risks">
                    <h4><i data-lucide="alert-triangle"></i> Risks</h4>
                    ${content.risks.map(r => `
                        <div class="risk-item ${typeof r === 'object' ? r.severity : ''}">
                            <strong>${escapeHtml(typeof r === 'object' ? r.risk : r)}</strong>
                            ${typeof r === 'object' && r.mitigation ? `<p class="mitigation">Mitigation: ${escapeHtml(r.mitigation)}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${content.opportunities && content.opportunities.length > 0 ? `
                <div class="briefing-section opportunities">
                    <h4><i data-lucide="trending-up"></i> Opportunities</h4>
                    ${content.opportunities.map(o => `
                        <div class="opportunity-item">
                            ${escapeHtml(typeof o === 'object' ? o.opportunity : o)}
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${content.recommendations && content.recommendations.length > 0 ? `
                <div class="briefing-section recommendations">
                    <h4><i data-lucide="check-square"></i> Recommendations</h4>
                    ${content.recommendations.map(r => `
                        <div class="recommendation-item ${typeof r === 'object' ? r.priority : ''}">
                            ${escapeHtml(typeof r === 'object' ? r.action : r)}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render audio overview output
 */
function renderAudioOverview(content, output) {
    const hasAudio = content.has_audio && content.audio?.signed_url;

    return `
        <div class="output-audio">
            <div class="audio-header">
                <h3>${escapeHtml(content.title || 'Audio Overview')}</h3>
                ${content.duration_estimate ? `<span class="duration"><i data-lucide="clock"></i> ${escapeHtml(content.duration_estimate)}</span>` : ''}
            </div>

            ${hasAudio ? `
                <div class="audio-player-container">
                    <audio controls class="audio-player" id="audioPlayer">
                        <source src="${content.audio.signed_url}" type="audio/mpeg">
                        Your browser does not support the audio element.
                    </audio>
                    <div class="audio-controls">
                        <button class="btn btn-sm btn-ghost" onclick="downloadAudio('${content.audio.signed_url}', '${escapeHtml(content.title || 'audio')}.mp3')">
                            <i data-lucide="download"></i> Download
                        </button>
                        <span class="voice-info">Voice: ${escapeHtml(content.audio.voice_used || 'nova')}</span>
                    </div>
                </div>
            ` : `
                <div class="audio-unavailable">
                    <i data-lucide="alert-circle"></i>
                    <p>${content.audio_note || content.audio_error || 'Audio generation not available'}</p>
                </div>
            `}

            ${content.description ? `<p class="audio-description">${escapeHtml(content.description)}</p>` : ''}

            ${content.segments && content.segments.length > 0 ? `
                <div class="audio-segments">
                    <h4>Segments</h4>
                    ${content.segments.map((seg, idx) => `
                        <div class="segment-item">
                            <span class="segment-number">${idx + 1}</span>
                            <div class="segment-info">
                                <strong>${escapeHtml(seg.name)}</strong>
                                ${seg.duration ? `<span class="segment-duration">${escapeHtml(seg.duration)}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <div class="script-section">
                <details>
                    <summary><i data-lucide="file-text"></i> View Script</summary>
                    <div class="script-content">
                        ${escapeHtml(content.script || '').split('\n').map(p => p ? `<p>${p}</p>` : '').join('')}
                    </div>
                </details>
            </div>
        </div>
    `;
}

/**
 * Download audio file
 */
function downloadAudio(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * Render infographic output
 */
function renderInfographic(content) {
    return `
        <div class="output-infographic" style="--primary-color: ${content.color_scheme?.[0] || '#3b82f6'}">
            <div class="infographic-header">
                <h2>${escapeHtml(content.title || 'Infographic')}</h2>
                ${content.subtitle ? `<p class="subtitle">${escapeHtml(content.subtitle)}</p>` : ''}
            </div>

            ${content.header_stat ? `
                <div class="hero-stat">
                    <span class="stat-value">${escapeHtml(content.header_stat.value)}</span>
                    <span class="stat-label">${escapeHtml(content.header_stat.label)}</span>
                    ${content.header_stat.context ? `<span class="stat-context">${escapeHtml(content.header_stat.context)}</span>` : ''}
                </div>
            ` : ''}

            ${content.sections ? `
                <div class="infographic-sections">
                    ${content.sections.map((section, idx) => `
                        <div class="info-section" style="--accent: ${content.color_scheme?.[idx % (content.color_scheme?.length || 1)] || '#3b82f6'}">
                            <h4><i data-lucide="${section.icon || 'star'}"></i> ${escapeHtml(section.heading)}</h4>
                            ${section.stats ? `
                                <div class="section-stats">
                                    ${section.stats.map(s => `
                                        <div class="stat-item ${s.trend || ''}">
                                            <span class="value">${escapeHtml(s.value)}</span>
                                            <span class="label">${escapeHtml(s.label)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            ${section.facts ? `
                                <ul class="section-facts">
                                    ${section.facts.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
                                </ul>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${content.callout ? `
                <div class="callout">
                    <p>${escapeHtml(content.callout.text)}</p>
                    ${content.callout.action ? `<span class="cta">${escapeHtml(content.callout.action)}</span>` : ''}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render mindmap branches recursively
 */
function renderMindmapBranches(branches) {
    return branches.map(branch => `
        <li>
            <strong>${escapeHtml(branch.topic)}</strong>
            ${branch.subtopics ? `<ul>${renderMindmapBranches(branch.subtopics)}</ul>` : ''}
            ${branch.details ? `<ul>${branch.details.map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul>` : ''}
        </li>
    `).join('');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Show modal
 */
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

/**
 * Hide modal
 */
function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format markdown to HTML (matches chat.js configuration)
 */
function formatMarkdown(text) {
    if (!text) return '';
    if (typeof marked !== 'undefined') {
        // Configure marked like chat.js does
        marked.setOptions({
            breaks: true,  // Convert \n to <br>
            gfm: true      // GitHub Flavored Markdown
        });
        return marked.parse(text);
    }
    // Basic fallback
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

// Add spin animation for loading icons
const style = document.createElement('style');
style.textContent = `
    .spin {
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// ============================================================================
// HELP & MODAL SERVICE INTEGRATION
// ============================================================================

/**
 * Open help for Research Studio
 */
function openHelp() {
    if (typeof HelpRegistry !== 'undefined' && HelpRegistry.hasHelp()) {
        HelpRegistry.openCurrentPageHelp();
    } else if (typeof HelpModal !== 'undefined') {
        HelpModal.open('/api/docs/research-studio-user-guide.md');
    } else {
        // Fallback: show basic help in a modal
        if (typeof ModalService !== 'undefined') {
            ModalService.content({
                title: 'Research Studio Help',
                content: `
                    <h3>Getting Started</h3>
                    <ol>
                        <li><strong>Create a Studio</strong> - Click "New Studio" to create a research workspace</li>
                        <li><strong>Add Sources</strong> - Upload PDFs, documents, URLs, or paste text</li>
                        <li><strong>Chat with AI</strong> - Ask questions about your sources</li>
                        <li><strong>Generate Outputs</strong> - Create reports, flashcards, quizzes, and more</li>
                    </ol>
                    <h3>Features</h3>
                    <ul>
                        <li><strong>Citations</strong> - AI responses include source citations</li>
                        <li><strong>Interactive Quiz</strong> - Test your knowledge with auto-scored quizzes</li>
                        <li><strong>Flashcards</strong> - Study with flip cards</li>
                        <li><strong>Mind Maps</strong> - Visualize concept relationships</li>
                    </ul>
                `,
                contentType: 'html',
                width: 600
            });
        } else {
            alert('Help is available in the documentation.');
        }
    }
}

// Make openHelp available globally
window.openHelp = openHelp;
