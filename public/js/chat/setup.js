/* chat setup — DOM event wiring, textarea autosize, URL param parsing */
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

    // LLM Health: gray out unavailable model options
    document.addEventListener('llm-health-change', () => {
        if (!modelSelect || !window.LLMHealth) return;
        const providerMap = {
            anthropic: 'anthropic', openai: 'openai',
            perplexity: 'perplexity', google: 'google'
        };
        for (const option of modelSelect.options) {
            if (!option.value) continue;
            const optGroup = option.closest('optgroup');
            const groupLabel = optGroup?.label?.toLowerCase() || '';
            let provider = null;
            if (groupLabel.includes('claude') || groupLabel.includes('anthropic')) provider = 'anthropic';
            else if (groupLabel.includes('gpt') || groupLabel.includes('openai') || groupLabel.includes('o1') || groupLabel.includes('o3')) provider = 'openai';
            else if (groupLabel.includes('perplexity') || groupLabel.includes('sonar')) provider = 'perplexity';
            else if (groupLabel.includes('gemini') || groupLabel.includes('google')) provider = 'google';
            // Fallback: detect from model ID
            if (!provider) {
                const val = option.value.toLowerCase();
                if (val.startsWith('claude')) provider = 'anthropic';
                else if (val.startsWith('gpt') || val.startsWith('o1') || val.startsWith('o3') || val.startsWith('o4')) provider = 'openai';
                else if (val.startsWith('sonar')) provider = 'perplexity';
                else if (val.startsWith('gemini') || val.startsWith('nano-banana')) provider = 'google';
            }
            if (!provider) continue;
            const available = LLMHealth.isProviderAvailable(provider);
            if (!available) {
                option.disabled = true;
                option.style.opacity = '0.5';
                if (!option.dataset.originalText) {
                    option.dataset.originalText = option.textContent;
                }
                if (!option.textContent.includes('(unavailable)')) {
                    option.textContent = option.dataset.originalText + ' (unavailable)';
                }
            } else {
                option.disabled = false;
                option.style.opacity = '';
                if (option.dataset.originalText) {
                    option.textContent = option.dataset.originalText;
                }
            }
        }
    });

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

        // Event delegation for copy buttons (more reliable than inline onclick)
        chatMessages.addEventListener('click', function(e) {
            const copyBtn = e.target.closest('.message-action[title="Copy message"]');
            if (copyBtn) {
                e.preventDefault();
                e.stopPropagation();
                copyMessage(copyBtn);
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

    // Pre-fill prompt from URL param (used by Execute 120 Quick Start)
    const promptText = params.get('prompt');
    if (promptText && chatInput) {
        chatInput.value = promptText;
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
        chatInput.focus();
    }
}

