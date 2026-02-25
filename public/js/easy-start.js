/**
 * INSIGHT 360 - Easy Start Frontend
 * Version: 1.0.0
 *
 * Simplified chat UI for conversational onboarding.
 * Handles SSE streaming with tool-use events and resource card rendering.
 */

// ============================================
// STATE
// ============================================

let conversationHistory = [];
let currentConversationId = null;
let isStreaming = false;
let createdResources = [];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Apply theme
    const savedTheme = localStorage.getItem('insight360-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Initialize navigation
    if (typeof initNavigation === 'function') await initNavigation();
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Load ModalService
    if (typeof ModalServiceLoader !== 'undefined') await ModalServiceLoader.load();

    // Configure marked.js
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true
        });
    }

    // Set up event listeners
    setupEventListeners();

    // Check for existing conversation in URL
    const params = new URLSearchParams(window.location.search);
    const conversationId = params.get('conversation_id');
    if (conversationId) {
        await loadConversation(conversationId);
    }

    // Auto-resize textarea
    setupTextareaResize();
});

function setupEventListeners() {
    const input = document.getElementById('esInput');
    const sendBtn = document.getElementById('esSendBtn');

    sendBtn.addEventListener('click', sendMessage);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

function setupTextareaResize() {
    const textarea = document.getElementById('esInput');
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    });
}

// ============================================
// CONVERSATION MANAGEMENT
// ============================================

async function createConversation() {
    try {
        const response = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5-20250929',
                title: 'Easy Start Session'
            })
        });
        const data = await response.json();
        if (data.success) {
            currentConversationId = data.conversation.id;
            // Store resource data keyed by conversation
            localStorage.setItem(`es-resources-${currentConversationId}`, JSON.stringify([]));
            return data.conversation;
        }
    } catch (error) {
        console.error('Error creating conversation:', error);
    }
    return null;
}

async function saveMessage(role, content) {
    if (!currentConversationId) return;
    try {
        await fetch(`/api/conversations/${currentConversationId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role,
                content,
                model: 'claude-sonnet-4-5-20250929'
            })
        });
    } catch (error) {
        console.error('Error saving message:', error);
    }
}

async function loadConversation(conversationId) {
    try {
        const response = await fetch(`/api/conversations/${conversationId}`);
        const data = await response.json();
        if (!data.success) return;

        currentConversationId = conversationId;
        const messages = data.conversation.messages || [];

        // Remove welcome message
        const welcome = document.getElementById('esWelcome');
        if (welcome) welcome.remove();

        // Rebuild UI and history
        conversationHistory = [];
        for (const msg of messages) {
            conversationHistory.push({ role: msg.role, content: msg.content });
            addMessage(msg.role, msg.content);
        }

        // Restore resource cards from localStorage
        const stored = localStorage.getItem(`es-resources-${conversationId}`);
        if (stored) {
            createdResources = JSON.parse(stored);
            createdResources.forEach(r => renderResourceCard(r.type, r, true));
            if (createdResources.length > 0) {
                showHandoff();
            }
        }
    } catch (error) {
        console.error('Error loading conversation:', error);
    }
}

// ============================================
// SEND MESSAGE
// ============================================

async function sendMessage() {
    const input = document.getElementById('esInput');
    const message = input.value.trim();
    if (!message || isStreaming) return;

    // Remove welcome message on first send
    const welcome = document.getElementById('esWelcome');
    if (welcome) welcome.remove();

    // Create conversation if needed
    if (!currentConversationId) {
        const conv = await createConversation();
        if (!conv) {
            showToastMessage('Failed to start conversation', 'error');
            return;
        }
    }

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Add user message to UI and history
    addMessage('user', message);
    conversationHistory.push({ role: 'user', content: message });
    saveMessage('user', message);

    // Stream the response
    await streamResponse();
}

// ============================================
// SSE STREAMING
// ============================================

async function streamResponse() {
    isStreaming = true;
    updateSendButton(true);

    // Add loading assistant message
    const { messageEl, contentEl } = addMessage('assistant', '', true);
    let fullResponse = '';

    try {
        const orgId = localStorage.getItem('insight360-org-id') || '';

        const response = await fetch('/api/easy-start/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-org-id': orgId
            },
            body: JSON.stringify({
                messages: conversationHistory
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(data);

                    if (parsed.type === 'content' && parsed.text) {
                        // Remove loading indicator on first content
                        removeLoadingIndicator(messageEl);
                        fullResponse += parsed.text;
                        contentEl.innerHTML = formatMarkdown(fullResponse);
                        scrollToBottom();
                    } else if (parsed.type === 'tool_start') {
                        // Show creation indicator
                        showCreationIndicator(parsed.tool);
                    } else if (parsed.type === 'resource_created') {
                        // Remove creation indicator
                        removeCreationIndicator();
                        if (parsed.success && parsed.data) {
                            renderResourceCard(parsed.data.type, parsed.data);
                            // Store for persistence
                            createdResources.push(parsed.data);
                            localStorage.setItem(
                                `es-resources-${currentConversationId}`,
                                JSON.stringify(createdResources)
                            );
                            showHandoff();
                        } else if (!parsed.success) {
                            renderErrorCard(parsed.tool, parsed.error);
                        }
                    } else if (parsed.type === 'guardrail_blocked') {
                        removeLoadingIndicator(messageEl);
                        fullResponse = parsed.message || 'This request was blocked by organizational guardrails.';
                        contentEl.innerHTML = `<div class="es-guardrail-blocked">${escapeHtml(fullResponse)}</div>`;
                    } else if (parsed.type === 'error') {
                        throw new Error(parsed.error);
                    }
                } catch (e) {
                    if (e.message && !e.message.includes('Unexpected')) {
                        throw e;
                    }
                    // Skip invalid JSON
                }
            }
        }

        // Finalize
        removeLoadingIndicator(messageEl);
        if (fullResponse) {
            contentEl.innerHTML = formatMarkdown(fullResponse);
            conversationHistory.push({ role: 'assistant', content: fullResponse });
            saveMessage('assistant', fullResponse);
        }

        // Re-render icons in new content
        if (typeof lucide !== 'undefined') lucide.createIcons();

    } catch (error) {
        console.error('Easy Start stream error:', error);
        removeLoadingIndicator(messageEl);
        contentEl.innerHTML = `<p style="color: var(--danger);">Something went wrong: ${escapeHtml(error.message)}</p>`;
    } finally {
        isStreaming = false;
        updateSendButton(false);
    }
}

// ============================================
// UI RENDERING
// ============================================

function addMessage(role, content, isLoading = false) {
    const container = document.getElementById('easyStartMessages');

    const messageEl = document.createElement('div');
    messageEl.className = `es-message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'es-message-avatar';

    if (role === 'user') {
        avatar.innerHTML = '<i data-lucide="user" style="width:16px;height:16px;"></i>';
    } else {
        avatar.innerHTML = '<i data-lucide="bot" style="width:16px;height:16px;"></i>';
    }

    const contentEl = document.createElement('div');
    contentEl.className = 'es-message-content';

    if (isLoading) {
        contentEl.innerHTML = `
            <div class="es-loading">
                <div class="es-loading-dot"></div>
                <div class="es-loading-dot"></div>
                <div class="es-loading-dot"></div>
            </div>
        `;
    } else {
        contentEl.innerHTML = formatMarkdown(content);
    }

    messageEl.appendChild(avatar);
    messageEl.appendChild(contentEl);
    container.appendChild(messageEl);

    // Re-render icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
    scrollToBottom();

    return { messageEl, contentEl };
}

function removeLoadingIndicator(messageEl) {
    const loading = messageEl?.querySelector('.es-loading');
    if (loading) loading.remove();
}

function showCreationIndicator(toolName) {
    const container = document.getElementById('easyStartMessages');
    const existing = container.querySelector('.es-creation-indicator');
    if (existing) existing.remove();

    const typeLabel = {
        create_agent: 'agent',
        create_action: 'action',
        create_workflow: 'workflow'
    }[toolName] || 'resource';

    const indicator = document.createElement('div');
    indicator.className = 'es-creation-indicator';
    indicator.innerHTML = `
        <i data-lucide="loader-2"></i>
        <span>Creating ${typeLabel}...</span>
    `;
    container.appendChild(indicator);
    if (typeof lucide !== 'undefined') lucide.createIcons();
    scrollToBottom();
}

function removeCreationIndicator() {
    const indicators = document.querySelectorAll('.es-creation-indicator');
    indicators.forEach(el => el.remove());
}

// ============================================
// RESOURCE CARDS
// ============================================

function renderResourceCard(type, data, skipAnimation = false) {
    const container = document.getElementById('resourceCards');
    const emptyState = document.getElementById('esEmptyState');
    if (emptyState) emptyState.remove();

    const cardClass = {
        agent: 'es-agent-card',
        action: 'es-action-card',
        workflow: 'es-workflow-card'
    }[type] || '';

    const iconName = {
        agent: 'bot',
        action: data.icon || 'zap',
        workflow: data.icon || 'git-branch'
    }[type] || 'package';

    const badgeLabel = {
        agent: 'Agent',
        action: 'Action',
        workflow: 'Workflow'
    }[type] || 'Resource';

    const linkText = {
        agent: 'Chat with agent',
        action: 'Run action',
        workflow: 'Run workflow'
    }[type] || 'View';

    const linkIcon = {
        agent: 'message-circle',
        action: 'play',
        workflow: 'play'
    }[type] || 'external-link';

    const card = document.createElement('div');
    card.className = `es-resource-card ${cardClass}`;
    if (skipAnimation) card.style.animation = 'none';

    card.innerHTML = `
        <div class="es-resource-card-header">
            <div class="es-resource-card-icon">
                <i data-lucide="${iconName}"></i>
            </div>
            <h4>${escapeHtml(data.name)}</h4>
            <span class="es-resource-card-badge">${badgeLabel}</span>
        </div>
        ${data.description ? `<p>${escapeHtml(data.description)}</p>` : ''}
        ${data.link ? `
            <a href="${data.link}" class="es-resource-card-link">
                <i data-lucide="${linkIcon}"></i>
                ${linkText}
            </a>
        ` : ''}
    `;

    container.appendChild(card);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Toast notification
    if (!skipAnimation) {
        showToastMessage(`Created: ${data.name}`, 'success');
    }
}

function renderErrorCard(toolName, error) {
    const container = document.getElementById('resourceCards');
    const emptyState = document.getElementById('esEmptyState');
    if (emptyState) emptyState.remove();

    const typeLabel = {
        create_agent: 'Agent',
        create_action: 'Action',
        create_workflow: 'Workflow'
    }[toolName] || 'Resource';

    const card = document.createElement('div');
    card.className = 'es-resource-card es-error-card';
    card.innerHTML = `
        <div class="es-resource-card-header">
            <div class="es-resource-card-icon">
                <i data-lucide="alert-triangle"></i>
            </div>
            <h4>${typeLabel} creation failed</h4>
        </div>
        <p>${escapeHtml(error || 'Unknown error')}</p>
    `;

    container.appendChild(card);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function showHandoff() {
    const handoff = document.getElementById('esHandoff');
    if (handoff) handoff.classList.remove('hidden');
}

// ============================================
// UTILITIES
// ============================================

function formatMarkdown(text) {
    if (!text) return '';
    if (typeof marked !== 'undefined') {
        return marked.parse(text);
    }
    // Fallback: basic formatting
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    const container = document.getElementById('easyStartMessages');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function updateSendButton(disabled) {
    const btn = document.getElementById('esSendBtn');
    if (btn) btn.disabled = disabled;
}

function showToastMessage(message, type = 'info') {
    // Use global showToast if available
    if (typeof showToast === 'function') {
        showToast(message, type);
        return;
    }
    // Use ModalService toast if available
    if (typeof ModalService !== 'undefined' && ModalService.toast) {
        ModalService.toast({ message, type, duration: 3000 });
        return;
    }
    // Minimal fallback toast
    const toast = document.createElement('div');
    const bgVar = type === 'success' ? 'var(--success, #10b981)' : type === 'error' ? 'var(--danger, #ef4444)' : 'var(--primary, #6366f1)';
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; z-index: 9999;
        padding: 12px 20px; border-radius: var(--radius-md, 8px); font-size: 0.9rem;
        color: white; animation: esFadeIn 0.3s ease;
        background: ${bgVar};
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
