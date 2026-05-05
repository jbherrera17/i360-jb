/* chat messages — render, scroll, citations, guardrail blocks, status */
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

    const _assistantName = (typeof BrandingService !== 'undefined') ? BrandingService.getAssistantName() : 'Higgins';
    const _assistantAvatar = (typeof BrandingService !== 'undefined') ? BrandingService.getAssistantAvatar() : '/assets/25-08-20 - Higgins Mona Lisa Smile-T.png';
    const avatar = role === 'user' ? '👤' : `<img src="${_assistantAvatar}" alt="${_assistantName}" class="higgins-avatar">`;
    const label = role === 'user' ? 'You' : _assistantName;

    // Loading spinner HTML for assistant messages
    const loadingSpinner = `
        <div class="message-loading">
            <img src="/assets/loading-spinner.svg" alt="Loading" class="loading-spinner">
            <span class="loading-text"></span>
        </div>
    `;

    const messageContent = isLoading ? loadingSpinner : formatMessage(content);

    const artifactButton = role === 'assistant' ? `
                <button class="message-action" onclick="openArtifactModal(this)" title="Create artifact">
                    <i data-lucide="package-plus"></i>
                </button>` : '';

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-body">
            <div class="message-header">
                <span class="message-author">${label}</span>
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
                <button class="message-action" title="Copy message">
                    <i data-lucide="copy"></i>
                </button>
                ${artifactButton}
            </div>
            <div class="message-content">${messageContent}</div>
        </div>
    `;

    // Store raw markdown on the content element for export/copy
    if (content && !isLoading) {
        const contentEl = messageDiv.querySelector('.message-content');
        if (contentEl) {
            contentEl.dataset.rawContent = content;
        }
    }

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
 * Format citations from Perplexity into a sources section
 * Render a guardrail block message with styled container
 * @param {object} data - { category, brightLine, message, severity }
 * @returns {string} HTML for guardrail block display
 */
function renderGuardrailBlock(data) {
    const isInjection = data.category === 'prompt_injection';
    const icon = isInjection ? 'shield-alert' : 'shield-x';
    const label = isInjection ? 'Security Protection' : (data.brightLine || 'Guardrail Triggered');
    const cssClass = isInjection ? 'guardrail-blocked injection' : 'guardrail-blocked';

    return `<div class="${cssClass}">
        <div class="guardrail-header">
            <i data-lucide="${icon}"></i>
            <span class="guardrail-label">${label}</span>
        </div>
        <div class="guardrail-message">${data.message || 'This request was blocked by organizational guardrails.'}</div>
    </div>`;
}

/**
 * @param {Array} citations - Array of citation URLs
 * @returns {string} Markdown formatted sources section
 */
function formatCitations(citations) {
    if (!citations || citations.length === 0) return '';

    let sourcesMarkdown = '\n\n---\n\n**Sources:**\n';

    citations.forEach((citation, index) => {
        // Citation can be a string (URL) or an object with url/title
        const url = typeof citation === 'string' ? citation : citation.url;
        let title;
        if (typeof citation === 'object' && citation.title) {
            title = citation.title;
        } else {
            // Extract domain from URL
            try {
                const urlObj = new URL(url);
                title = urlObj.hostname.replace(/^www\./, '');
            } catch {
                title = url;
            }
        }
        sourcesMarkdown += `${index + 1}. [${title}](${url})\n`;
    });

    return sourcesMarkdown;
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

