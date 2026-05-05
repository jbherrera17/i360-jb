/* chat conversations — list/load/create/save/delete + filter/star/archive/export + bulk */
/**
 * Load conversations from API
 */
async function loadConversations(filterOverrides = {}) {
    try {
        let url;
        if (conversationScope === 'all' && isPlatformAdmin) {
            // Admin view - get all conversations across organizations
            url = '/api/conversations/admin/all?limit=50';
            if (selectedOrgFilter) {
                url += `&org_id=${selectedOrgFilter}`;
            }
        } else {
            // User view - own conversations or org-wide
            const params = new URLSearchParams({ limit: '50' });
            if (filterOverrides.starredOnly) params.set('starredOnly', 'true');
            if (filterOverrides.archivedOnly) params.set('archivedOnly', 'true');
            if (filterOverrides.search) params.set('search', filterOverrides.search);
            if (conversationScope === 'org' && userOrgId) params.set('org_id', userOrgId);
            url = `/api/conversations?${params.toString()}`;
        }

        const response = await authFetch(url);
        const data = await response.json();

        if (data.success) {
            // Admin endpoint returns data array, user endpoint returns conversations array
            conversations = data.conversations || data.data || [];
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

    // Apply local search filter
    let filtered = conversations;
    if (conversationSearchQuery) {
        filtered = filtered.filter(c =>
            c.title?.toLowerCase().includes(conversationSearchQuery) ||
            c.users?.display_name?.toLowerCase().includes(conversationSearchQuery) ||
            c.users?.email?.toLowerCase().includes(conversationSearchQuery)
        );
    }

    if (filtered.length === 0) {
        const emptyMsg = conversationSearchQuery ? 'No matching conversations' :
            conversationFilter === 'archived' ? 'No archived conversations' :
            conversationFilter === 'starred' ? 'No starred conversations' :
            'No conversations yet';
        conversationList.innerHTML = `
            <div class="empty-conversations">
                <p>${emptyMsg}</p>
            </div>
        `;
        return;
    }

    const isArchiveView = conversationFilter === 'archived';
    const selectModeClass = isBulkMode ? ' select-mode' : '';

    // Separate starred and non-starred for section rendering (only in 'all' view)
    const starred = (conversationFilter === 'all') ? filtered.filter(c => c.is_starred) : [];
    const nonStarred = (conversationFilter === 'all') ? filtered.filter(c => !c.is_starred) : filtered;

    let html = '';

    // Starred section header
    if (starred.length > 0) {
        html += `<div class="conversation-section-header">Starred</div>`;
        html += starred.map(conv => renderConversationItem(conv, isArchiveView, selectModeClass)).join('');
        if (nonStarred.length > 0) {
            html += `<div class="conversation-section-header">Recent</div>`;
        }
    }

    // Main list
    html += nonStarred.map(conv => renderConversationItem(conv, isArchiveView, selectModeClass)).join('');

    conversationList.innerHTML = html;
    lucide.createIcons();
}

/**
 * Render a single conversation item
 */
function renderConversationItem(conv, isArchiveView, selectModeClass) {
        // Get user display name if available (show when viewing org or admin conversations)
        const userName = conv.users?.display_name || conv.users?.email || '';
        const userDisplay = (conversationScope !== 'mine') && userName ? `<span class="conversation-user">${escapeHtml(userName)}</span>` : '';

        // Get org name for admin view
        const orgName = conv.users?.organization?.name || '';
        const orgDisplay = (conversationScope === 'all' && orgName) ? `<span class="conversation-org">${escapeHtml(orgName)}</span>` : '';

        const archiveBtn = isArchiveView
            ? `<button class="conversation-action" onclick="event.stopPropagation(); unarchiveConversation('${conv.id}')" title="Restore">
                    <i data-lucide="archive-restore"></i>
                </button>`
            : `<button class="conversation-action" onclick="event.stopPropagation(); archiveConversation('${conv.id}')" title="Archive">
                    <i data-lucide="archive"></i>
                </button>`;

        const bulkCheckbox = isBulkMode
            ? `<input type="checkbox" class="conversation-checkbox" ${bulkSelectedIds.has(conv.id) ? 'checked' : ''} onclick="toggleBulkSelect('${conv.id}', event)" />`
            : '';

        return `
        <div class="conversation-item ${conv.id === currentConversationId ? 'active' : ''}${selectModeClass}"
             onclick="${isBulkMode ? `toggleBulkSelect('${conv.id}', event)` : `loadConversation('${conv.id}')`}"
             data-id="${conv.id}">
            <div class="conversation-title-row">
                ${bulkCheckbox}
                <button class="conversation-star${conv.is_starred ? ' active' : ''}" onclick="event.stopPropagation(); toggleStarConversation('${conv.id}')" title="${conv.is_starred ? 'Unstar' : 'Star'}">
                    <i data-lucide="star"></i>
                </button>
                <span class="conversation-title">${escapeHtml(conv.title)}${orgDisplay}</span>
            </div>
            <div class="conversation-meta">
                <div class="conversation-info">
                    ${userDisplay}
                    <span class="conversation-date">${formatDate(conv.updated_at)}</span>
                </div>
                <div class="conversation-actions">
                    <button class="conversation-action" onclick="renameConversation('${conv.id}', event)" title="Rename">
                        <i data-lucide="pencil"></i>
                    </button>
                    ${archiveBtn}
                    <button class="conversation-action" onclick="event.stopPropagation(); exportConversation('${conv.id}')" title="Export">
                        <i data-lucide="download"></i>
                    </button>
                    <button class="conversation-action conversation-delete" onclick="event.stopPropagation(); deleteConversation('${conv.id}')" title="Delete">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Load a specific conversation
 */
async function loadConversation(conversationId) {
    try {
        // Use admin endpoint if viewing all conversations as admin
        const endpoint = (isPlatformAdmin && showAllConversations)
            ? `/api/conversations/admin/${conversationId}`
            : `/api/conversations/${conversationId}`;
        const response = await authFetch(endpoint);
        const data = await response.json();

        // Admin endpoint returns data, user endpoint returns conversation
        const conversation = data.conversation || data.data;

        if (data.success && conversation) {
            currentConversationId = conversationId;
            conversationHistory = conversation.messages.map(m => ({
                role: m.role,
                content: m.content
            }));

            // Update model if conversation has one
            if (conversation.model && modelSelect) {
                currentModel = conversation.model;
                modelSelect.value = currentModel;
                updateModelIndicator();
            }

            // Render messages
            renderMessages(conversation.messages);

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
        const response = await authFetch('/api/conversations', {
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
        await authFetch(`/api/conversations/${currentConversationId}/messages`, {
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
    let confirmed = false;
    if (typeof ModalService !== 'undefined') {
        confirmed = await ModalService.confirm({
            title: 'Delete Conversation',
            message: 'Delete this conversation? This cannot be undone.',
            confirmText: 'Delete',
            confirmClass: 'btn-danger'
        });
    } else {
        confirmed = confirm('Delete this conversation?');
    }
    if (!confirmed) return;

    try {
        const response = await authFetch(`/api/conversations/${conversationId}`, {
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

    // Use raw markdown if available (preserves formatting in markdown-aware editors)
    const rawMarkdown = contentDiv.dataset.rawContent || contentDiv.innerText;
    const html = contentDiv.innerHTML;

    try {
        // Write both HTML and plain text (markdown) to clipboard
        // HTML enables rich paste in Word/Google Docs; markdown enables clean paste in code editors
        try {
            const clipboardItem = new ClipboardItem({
                'text/html': new Blob([html], { type: 'text/html' }),
                'text/plain': new Blob([rawMarkdown], { type: 'text/plain' })
            });
            await navigator.clipboard.write([clipboardItem]);
        } catch (clipErr) {
            // Fallback for browsers that don't support ClipboardItem
            await navigator.clipboard.writeText(rawMarkdown);
        }

        // Visual feedback - change icon temporarily
        // Lucide replaces <i> with <svg>, so we need to handle both cases
        const icon = button.querySelector('i, svg');
        if (icon) {
            // Replace the icon with a check mark
            button.innerHTML = '<i data-lucide="check"></i>';
            lucide.createIcons({ nodes: [button] });
        }
        button.classList.add('copied');

        setTimeout(() => {
            // Restore original copy icon
            button.innerHTML = '<i data-lucide="copy"></i>';
            lucide.createIcons({ nodes: [button] });
            button.classList.remove('copied');
        }, 2000);

        setStatus('Copied to clipboard');
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

    let newTitle;
    if (typeof ModalService !== 'undefined') {
        const result = await ModalService.form({
            title: 'Rename Conversation',
            fields: [
                { name: 'title', label: 'Title', type: 'text', required: true, value: conversation.title }
            ],
            submitText: 'Rename'
        });
        if (!result) return;
        newTitle = result.title;
    } else {
        newTitle = prompt('Enter new conversation title:', conversation.title);
    }
    if (!newTitle || newTitle.trim() === '' || newTitle === conversation.title) return;

    try {
        const response = await authFetch(`/api/conversations/${conversationId}`, {
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
                <h2>Welcome to ${(typeof BrandingService !== 'undefined') ? BrandingService.getAssistantName() : 'Higgins'}</h2>
                <p>I'm your AI guide to ${(typeof BrandingService !== 'undefined') ? BrandingService.getAppName() : 'Insight 360'}, powered by the model you select above. Ask me anything about the system, or let me help with any other task.</p>
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

// ============================================
// Conversation Filter & Search State
// ============================================
let conversationFilter = 'all'; // 'all', 'starred', 'archived'
let conversationSearchQuery = '';
let bulkSelectedIds = new Set();
let isBulkMode = false;

/**
 * Filter conversations locally by search query
 */
function filterConversationsLocal() {
    const input = document.getElementById('conversationSearchInput');
    const clearBtn = document.getElementById('searchClearBtn');
    conversationSearchQuery = (input?.value || '').trim().toLowerCase();
    if (clearBtn) clearBtn.style.display = conversationSearchQuery ? 'block' : 'none';
    renderConversationList();
}

/**
 * Clear conversation search
 */
function clearConversationSearch() {
    const input = document.getElementById('conversationSearchInput');
    if (input) input.value = '';
    conversationSearchQuery = '';
    const clearBtn = document.getElementById('searchClearBtn');
    if (clearBtn) clearBtn.style.display = 'none';
    renderConversationList();
}

/**
 * Set active filter (all, starred, archived)
 */
function setConversationFilter(filter) {
    conversationFilter = filter;
    // Update pill button active state
    document.querySelectorAll('.conversation-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    // Reload from API for archive filter (different query)
    if (filter === 'archived') {
        loadConversations({ archivedOnly: true });
    } else if (filter === 'starred') {
        loadConversations({ starredOnly: true });
    } else {
        loadConversations();
    }
}

/**
 * Toggle star on a conversation
 */
async function toggleStarConversation(conversationId) {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;

    const newValue = !conv.is_starred;
    try {
        const response = await authFetch(`/api/conversations/${conversationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_starred: newValue })
        });

        if (response.ok) {
            conv.is_starred = newValue;
            renderConversationList();
            setStatus(newValue ? 'Conversation starred' : 'Conversation unstarred');
        }
    } catch (error) {
        console.error('Error toggling star:', error);
    }
}

/**
 * Archive a conversation
 */
async function archiveConversation(conversationId) {
    try {
        const response = await authFetch(`/api/conversations/${conversationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_archived: true })
        });

        if (response.ok) {
            conversations = conversations.filter(c => c.id !== conversationId);
            if (currentConversationId === conversationId) {
                currentConversationId = null;
                conversationHistory = [];
                showWelcomeMessage();
            }
            renderConversationList();
            // Show undo toast
            if (typeof showToast === 'function') {
                showToast('Conversation archived. <a href="#" onclick="unarchiveConversation(\'' + conversationId + '\'); return false;" style="color:var(--primary);text-decoration:underline;">Undo</a>', 'success', 5000);
            } else {
                setStatus('Conversation archived');
            }
        }
    } catch (error) {
        console.error('Error archiving conversation:', error);
    }
}

/**
 * Unarchive a conversation
 */
async function unarchiveConversation(conversationId) {
    try {
        const response = await authFetch(`/api/conversations/${conversationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_archived: false })
        });

        if (response.ok) {
            conversations = conversations.filter(c => c.id !== conversationId);
            renderConversationList();
            setStatus('Conversation restored');
        }
    } catch (error) {
        console.error('Error unarchiving conversation:', error);
    }
}

/**
 * Export a single conversation
 */
async function exportConversation(conversationId, format = 'markdown') {
    try {
        const response = await authFetch(`/api/conversations/export/${conversationId}?format=${format}`);
        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = format === 'markdown' ? 'md' : 'json';
        const conv = conversations.find(c => c.id === conversationId);
        const filename = (conv?.title || 'conversation').replace(/[^a-z0-9]/gi, '_');
        a.download = `${filename}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus('Conversation exported');
    } catch (error) {
        console.error('Error exporting conversation:', error);
        setStatus('Export failed');
    }
}

// ============================================
// Bulk Operations
// ============================================

/**
 * Toggle bulk select mode
 */
function toggleBulkMode() {
    isBulkMode = !isBulkMode;
    bulkSelectedIds.clear();
    updateBulkBar();
    renderConversationList();
}

/**
 * Exit bulk select mode
 */
function exitBulkMode() {
    isBulkMode = false;
    bulkSelectedIds.clear();
    updateBulkBar();
    renderConversationList();
}

/**
 * Toggle selection of a conversation in bulk mode
 */
function toggleBulkSelect(conversationId, event) {
    if (event) event.stopPropagation();
    if (bulkSelectedIds.has(conversationId)) {
        bulkSelectedIds.delete(conversationId);
    } else {
        bulkSelectedIds.add(conversationId);
    }
    updateBulkBar();
    // Update checkbox state without full re-render
    const item = document.querySelector(`.conversation-item[data-id="${conversationId}"]`);
    if (item) {
        const cb = item.querySelector('.conversation-checkbox');
        if (cb) cb.checked = bulkSelectedIds.has(conversationId);
    }
}

/**
 * Update bulk action bar visibility and count
 */
function updateBulkBar() {
    const bar = document.getElementById('conversationBulkBar');
    const count = document.getElementById('bulkCount');
    if (bar) {
        bar.classList.toggle('visible', isBulkMode && bulkSelectedIds.size > 0);
    }
    if (count) {
        count.textContent = `${bulkSelectedIds.size} selected`;
    }
}

/**
 * Bulk star selected conversations
 */
async function bulkStarConversations() {
    if (bulkSelectedIds.size === 0) return;
    try {
        await authFetch('/api/conversations/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'star', conversationIds: [...bulkSelectedIds] })
        });
        setStatus(`${bulkSelectedIds.size} conversations starred`);
        exitBulkMode();
        await loadConversations();
    } catch (error) {
        console.error('Bulk star error:', error);
    }
}

/**
 * Bulk archive selected conversations
 */
async function bulkArchiveConversations() {
    if (bulkSelectedIds.size === 0) return;
    try {
        await authFetch('/api/conversations/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'archive', conversationIds: [...bulkSelectedIds] })
        });
        setStatus(`${bulkSelectedIds.size} conversations archived`);
        exitBulkMode();
        await loadConversations();
    } catch (error) {
        console.error('Bulk archive error:', error);
    }
}

/**
 * Bulk export selected conversations
 */
async function bulkExportConversations() {
    if (bulkSelectedIds.size === 0) return;
    for (const id of bulkSelectedIds) {
        await exportConversation(id, 'markdown');
    }
    setStatus(`${bulkSelectedIds.size} conversations exported`);
    exitBulkMode();
}

/**
 * Bulk delete selected conversations
 */
async function bulkDeleteConversations() {
    if (bulkSelectedIds.size === 0) return;
    if (typeof ModalService !== 'undefined') {
        const confirmed = await ModalService.confirm({
            title: 'Delete Conversations',
            message: `Delete ${bulkSelectedIds.size} selected conversations? This cannot be undone.`,
            confirmText: 'Delete',
            confirmClass: 'btn-danger'
        });
        if (!confirmed) return;
    } else {
        if (!confirm(`Delete ${bulkSelectedIds.size} selected conversations?`)) return;
    }

    try {
        await authFetch('/api/conversations/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', conversationIds: [...bulkSelectedIds] })
        });
        setStatus(`${bulkSelectedIds.size} conversations deleted`);
        exitBulkMode();
        await loadConversations();
    } catch (error) {
        console.error('Bulk delete error:', error);
    }
}

