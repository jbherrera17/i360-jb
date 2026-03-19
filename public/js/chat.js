/* global BrandingService, ChartRenderer, RadarChart, XLSX, LLMHealth, authFetch */
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
let imageGenerationEnabled = true; // Enable automatic image generation detection

/**
 * Detect if message is an image generation request
 */
function isImageGenerationRequest(message) {
    if (!imageGenerationEnabled) return false;
    const lowerMsg = message.toLowerCase();
    const imagePatterns = [
        /\b(create|generate|make|draw|design|produce|render)\s+(a|an|the|me|some)?\s*(image|picture|illustration|artwork|photo|graphic|visual)/i,
        /\b(image|picture|illustration|artwork|photo|graphic|visual)\s+(of|showing|depicting|with)/i,
        /\b(16:9|1:1|portrait|landscape)\s+(image|picture|illustration)/i,
        /\bcreate\s+.*\s+(image|picture|illustration)/i,
        /\bgenerate\s+.*\s+(image|picture|illustration)/i
    ];
    return imagePatterns.some(pattern => pattern.test(message));
}

/**
 * Extract image prompt from message
 */
function extractImagePrompt(message) {
    // Remove common prefixes and clean up
    let prompt = message
        .replace(/^(please\s+)?/i, '')
        .replace(/^(can you\s+)?/i, '')
        .replace(/^(create|generate|make|draw|design|produce|render)\s+(a|an|the|me|some)?\s*(image|picture|illustration|artwork|photo|graphic|visual)\s*(of|showing|depicting|with|on the theme:?)?\s*/i, '')
        .replace(/^(image|picture|illustration)\s*(of|showing|depicting)?\s*/i, '')
        .trim();

    // If prompt is now too short, use original message
    if (prompt.length < 10) {
        prompt = message;
    }
    return prompt;
}

/**
 * Generate an image via API
 */
async function generateImage(prompt, options = {}) {
    const response = await authFetch('/api/chat/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt,
            model: options.model || 'gpt-image-1.5',
            size: options.size || '16:9',
            quality: options.quality || 'standard',
            style: options.style || 'vivid'
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Image generation failed');
    }

    return response.json();
}

/**
 * Handle image generation request
 */
async function handleImageGeneration(message) {
    setStatus('Generating image...');
    isStreaming = true;

    // Create assistant message with loading indicator
    const assistantDiv = addMessage('assistant', '', true, false);
    const contentDiv = assistantDiv.querySelector('.message-content');

    // Start rotating loading messages
    if (typeof LoadingMessages !== 'undefined' && contentDiv) {
        const textSpan = contentDiv.querySelector('.loading-text');
        if (textSpan) {
            loadingMessageController = LoadingMessages.start(textSpan, {
                preset: 'chat',
                messages: [
                    'Creating your image...',
                    'Generating artwork...',
                    'Rendering visuals...',
                    'Crafting the perfect image...',
                    'Almost ready...'
                ]
            });
        }
    }

    try {
        const prompt = extractImagePrompt(message);
        console.log('[Image Generation] Extracted prompt:', prompt);

        // Detect size from message (16:9, 9:16, square)
        const sizeMatch = message.match(/\b(16:9|9:16|square|portrait|landscape|1:1)\b/i);
        const size = sizeMatch ? sizeMatch[1].toLowerCase() : '16:9';

        const result = await generateImage(prompt, {
            size,
            quality: 'medium'
        });

        // Stop loading messages
        stopLoadingMessages();

        if (result.success && result.images && result.images.length > 0) {
            const image = result.images[0];
            const imageUrl = image.url || (image.base64 ? `data:image/png;base64,${image.base64}` : null);

            if (imageUrl) {
                // Build prompt section - show both original and revised if different
                const displayPrompt = image.revisedPrompt || prompt;
                const promptSection = image.revisedPrompt && image.revisedPrompt !== prompt
                    ? `**Prompt sent:**
\`\`\`
${prompt}
\`\`\`

**Prompt used by AI:**
\`\`\`
${image.revisedPrompt}
\`\`\``
                    : `**Prompt:**
\`\`\`
${displayPrompt}
\`\`\``;

                // Build response with image
                const responseContent = `
**Generated Image** *(${size})*

![Generated Image](${imageUrl})

---

${promptSection}

*Generated with ${result.modelName || result.model} • Copy the prompt above to modify and regenerate*
`;
                if (contentDiv) {
                    contentDiv.innerHTML = formatMessage(responseContent);
                    contentDiv.dataset.rawContent = responseContent;
                }

                // Add to history
                conversationHistory.push({ role: 'assistant', content: responseContent });
                saveMessage('assistant', responseContent, result.model);

                setStatus('Image generated');
            } else {
                throw new Error('No image URL returned');
            }
        } else {
            throw new Error('Image generation failed - no images returned');
        }

    } catch (error) {
        console.error('Image generation error:', error);
        stopLoadingMessages();

        const errorMessage = `Sorry, I couldn't generate that image. Error: ${error.message}`;
        if (contentDiv) {
            contentDiv.innerHTML = `<span style="color: var(--danger);">${errorMessage}</span>`;
        }
        setStatus('Error: ' + error.message);
    } finally {
        isStreaming = false;
        stopLoadingMessages();
    }
}

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

// Admin state
let isPlatformAdmin = false;
let showAllConversations = false;
let organizations = [];
let selectedOrgFilter = '';

// Org filter state
let userOrgId = null;
let conversationScope = 'mine'; // 'mine' | 'org' | 'all'

// Panel collapse state
let isPanelCollapsed = localStorage.getItem('chat-panel-collapsed') === 'true';

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Load available models
    await loadModels();

    // Restore panel collapse state
    if (isPanelCollapsed) {
        const panel = document.querySelector('.chat-history-panel');
        if (panel) panel.classList.add('collapsed');
        updatePanelToggleIcon();
    }

    // Check if user is platform admin
    await checkPlatformAdmin();

    // Detect user's org for org filtering
    await detectUserOrg();

    // Load saved conversations
    await loadConversations();

    // Set up event listeners
    setupEventListeners();

    // Check URL params for initial state
    checkUrlParams();

    // Auto-resize textarea
    setupTextareaResize();

    // Initialize chart auto-detection for chat messages
    if (typeof ChartRenderer !== 'undefined' && ChartRenderer.init) {
        ChartRenderer.init('#chatMessages');
    }
    if (typeof RadarChart !== 'undefined' && RadarChart.init) {
        RadarChart.init('#chatMessages');
    }
});

/**
 * Check if current user is a platform admin
 */
async function checkPlatformAdmin() {
    try {
        const response = await authFetch('/api/platform/admin/verify', {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        isPlatformAdmin = response.ok;

        if (isPlatformAdmin) {
            // Add "All Organizations" option to scope selector
            const scopeSelect = document.getElementById('conversationScope');
            if (scopeSelect) {
                const allOption = document.createElement('option');
                allOption.value = 'all';
                allOption.textContent = 'All Organizations';
                scopeSelect.appendChild(allOption);
            }
            // Load organizations for the admin org filter dropdown
            await loadOrganizations();
        }
    } catch (error) {
        isPlatformAdmin = false;
    }
}

/**
 * Load organizations for admin filter
 */
async function loadOrganizations() {
    try {
        const response = await authFetch('/api/platform/organizations');
        const data = await response.json();

        if (data.success && data.data) {
            organizations = data.data;
            const orgSelect = document.getElementById('orgFilter');
            if (orgSelect) {
                orgSelect.innerHTML = '<option value="">All Organizations</option>' +
                    organizations.map(org =>
                        `<option value="${org.id}">${escapeHtml(org.name)}</option>`
                    ).join('');
            }
        }
    } catch (error) {
        console.error('Error loading organizations:', error);
    }
}

/**
 * Handle conversation scope change (My / Org / All Organizations)
 */
async function changeConversationScope() {
    const scopeSelect = document.getElementById('conversationScope');
    conversationScope = scopeSelect?.value || 'mine';

    // Derive legacy flags from scope
    showAllConversations = (conversationScope === 'all');

    // Show org filter dropdown only for "All Organizations" scope
    const scopeOrgFilter = document.getElementById('scopeOrgFilter');
    if (scopeOrgFilter) {
        scopeOrgFilter.style.display = (conversationScope === 'all') ? 'block' : 'none';
    }

    // Reset org filter when leaving "all" scope
    if (conversationScope !== 'all') {
        selectedOrgFilter = '';
        const orgSelect = document.getElementById('orgFilter');
        if (orgSelect) orgSelect.value = '';
    }

    await loadConversations();
}

/**
 * Filter conversations by organization (admin - within "All Organizations" scope)
 */
async function filterByOrganization() {
    const orgSelect = document.getElementById('orgFilter');
    selectedOrgFilter = orgSelect?.value || '';
    await loadConversations();
}

/**
 * Toggle the conversation history panel open/closed
 */
function toggleConversationPanel() {
    const panel = document.querySelector('.chat-history-panel');
    if (!panel) return;

    isPanelCollapsed = !isPanelCollapsed;
    panel.classList.toggle('collapsed', isPanelCollapsed);
    localStorage.setItem('chat-panel-collapsed', isPanelCollapsed);
    updatePanelToggleIcon();
}

/**
 * Update the panel toggle button icon based on state
 */
function updatePanelToggleIcon() {
    const btn = document.getElementById('panelToggleBtn');
    if (!btn) return;
    const iconName = isPanelCollapsed ? 'panel-right-close' : 'panel-right-open';
    btn.innerHTML = `<i data-lucide="${iconName}"></i>`;
    btn.title = isPanelCollapsed ? 'Show conversations panel' : 'Hide conversations panel';
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Detect the current user's organization and set up scope selector
 */
async function detectUserOrg() {
    try {
        const response = await authFetch('/api/conversations/user-org');
        const data = await response.json();
        if (data.success && data.org_id) {
            userOrgId = data.org_id;
            // Add "Organization" option to scope selector
            const scopeSelect = document.getElementById('conversationScope');
            if (scopeSelect) {
                const orgOption = document.createElement('option');
                orgOption.value = 'org';
                orgOption.textContent = 'Organization';
                // Insert before "All Organizations" if it exists, otherwise append
                const allOption = scopeSelect.querySelector('option[value="all"]');
                if (allOption) {
                    scopeSelect.insertBefore(orgOption, allOption);
                } else {
                    scopeSelect.appendChild(orgOption);
                }
            }
        }
        // Show scope bar if user has an org OR is admin (more than just "mine" available)
        const scopeBar = document.getElementById('conversationScopeBar');
        const scopeSelect = document.getElementById('conversationScope');
        if (scopeBar && scopeSelect && scopeSelect.options.length > 1) {
            scopeBar.style.display = 'block';
        }
    } catch (error) {
        // No org context available — scope bar stays hidden, only "mine" available
    }
}

/**
 * Load available models from API
 */
async function loadModels() {
    try {
        const response = await authFetch('/api/chat/models');
        const data = await response.json();

        if (data.success && data.models) {
            const claudeGroup = document.getElementById('claudeModels');
            const gptGroup = document.getElementById('gptModels');
            const geminiGroup = document.getElementById('geminiModels');
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

            if (data.models.google) {
                data.models.google.forEach(m => {
                    modelCapabilities[m.id] = m;
                });
                if (geminiGroup) {
                    geminiGroup.innerHTML = data.models.google.map(m =>
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

    // Check if this is an image generation request
    if (isImageGenerationRequest(message)) {
        await handleImageGeneration(message);
        return;
    }

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

        // Source citation instructions for all LLMs
        const sourceCitationInstructions = `

When your response references external information, facts, statistics, or claims that would benefit from verification:
1. Include a Sources section at the end of your response
2. Format sources as a numbered list with clickable markdown links:

---

**Sources:**
1. [Source Title or Domain](https://example.com/full-url)

Only include sources when you reference specific external information. For general knowledge or reasoning, you may omit sources.`;

        // Build request body
        const requestBody = {
            messages: conversationHistory,
            model: currentModel,
            systemPrompt: sourceCitationInstructions
        };

        if (useSearch) {
            // For search endpoint, use the user's message as the search query
            requestBody.searchQuery = message;
            requestBody.systemPrompt = 'Use the web search results provided to answer the user\'s question with current, accurate information. Always cite sources when using search results.' + sourceCitationInstructions;
        }

        // Stream response (or use non-streaming for search)
        const response = await authFetch(endpoint, {
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

            // Show fallback notification if applicable
            if (data.fallback && typeof showToast === 'function') {
                const fb = data.fallback;
                showToast(
                    `${fb.original_model_name || fb.original_model} is unavailable. Using ${fb.fallback_model_name || fb.fallback_model} instead.`,
                    'warning'
                );
            }

            // Show search results indicator if available
            if (data.searchResults && data.searchResults.length > 0) {
                setStatus(`Found ${data.searchResults.length} search results`);
            }

            if (contentDiv) {
                contentDiv.innerHTML = formatMessage(fullResponse);
                contentDiv.dataset.rawContent = fullResponse;
            }
        } else {
            // Streaming SSE response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let citations = [];

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

                            if (parsed.type === 'fallback' && parsed.fallback) {
                                // Provider fallback notification
                                const fb = parsed.fallback;
                                if (typeof showToast === 'function') {
                                    showToast(
                                        `${fb.original_model_name || fb.original_model} is unavailable. Using ${fb.fallback_model_name || fb.fallback_model} instead.`,
                                        'warning'
                                    );
                                }
                            } else if (parsed.type === 'guardrail_blocked') {
                                // Guardrail or bright line enforcement blocked the message
                                stopLoadingMessages();
                                fullResponse = parsed.message || 'This request was blocked by organizational guardrails.';
                                if (contentDiv) {
                                    contentDiv.innerHTML = renderGuardrailBlock(parsed);
                                    if (typeof lucide !== 'undefined') lucide.createIcons();
                                    autoScrollIfNearBottom();
                                }
                            } else if (parsed.type === 'content' && parsed.text) {
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
                            } else if (parsed.type === 'citations' && parsed.citations) {
                                // Capture citations from Perplexity
                                citations = parsed.citations;
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

            // Append citations as sources if available (from Perplexity)
            if (citations.length > 0) {
                fullResponse += formatCitations(citations);
                if (contentDiv) {
                    contentDiv.innerHTML = formatMessage(fullResponse);
                    autoScrollIfNearBottom();
                }
            }
        }

        // Store raw markdown on the content element for export/copy
        if (contentDiv) {
            contentDiv.dataset.rawContent = fullResponse;
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

/**
 * Helper: Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Helper: Format date as day and date (e.g., "Mon, Feb 7")
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();

    // Get day name abbreviated
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const dayOfMonth = date.getDate();
    const year = date.getFullYear();
    const currentYear = now.getFullYear();

    // If same year, don't show year
    if (year === currentYear) {
        return `${dayName}, ${monthName} ${dayOfMonth}`;
    }

    // Different year, include year
    return `${dayName}, ${monthName} ${dayOfMonth}, ${year}`;
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

    /* Message action buttons (copy, artifact) */
    .message-action {
        opacity: 0;
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 0.25rem;
        border-radius: var(--radius-sm);
        transition: opacity 0.2s, color 0.2s, background 0.2s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .message-action:first-of-type {
        margin-left: auto;
    }

    .message-action:hover {
        color: var(--text-primary);
        background: var(--bg-tertiary);
    }

    .message-action.copied {
        color: var(--success);
    }

    .message:hover .message-action {
        opacity: 1;
    }

    .message-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-xs);
    }

    .message-action i,
    .message-action svg {
        width: 14px;
        height: 14px;
        pointer-events: none;
    }

    /* Artifact Modal */
    .artifact-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        align-items: center;
        justify-content: center;
    }

    .artifact-modal.active {
        display: flex;
    }

    .artifact-modal-content {
        background: var(--bg-primary);
        border-radius: var(--radius-lg);
        padding: var(--spacing-lg);
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .artifact-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-md);
    }

    .artifact-modal-header h3 {
        margin: 0;
        font-size: 1.25rem;
    }

    .artifact-modal-close {
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 0.5rem;
        border-radius: var(--radius-sm);
    }

    .artifact-modal-close:hover {
        color: var(--text-primary);
        background: var(--bg-tertiary);
    }

    .artifact-options {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }

    .artifact-option {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-md);
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all 0.2s;
    }

    .artifact-option:hover {
        border-color: var(--primary);
        background: var(--bg-tertiary);
    }

    .artifact-option-icon {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--primary-subtle);
        border-radius: var(--radius-md);
        color: var(--primary);
    }

    .artifact-option-content {
        flex: 1;
    }

    .artifact-option-title {
        font-weight: 600;
        margin-bottom: 0.25rem;
    }

    .artifact-option-desc {
        font-size: 0.85rem;
        color: var(--text-secondary);
    }

    .artifact-option-arrow {
        color: var(--text-muted);
    }

    .artifact-divider {
        padding: 8px 16px 4px;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--primary);
        border-top: 1px solid var(--border);
        margin-top: 4px;
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

// ============================================
// ARTIFACT CREATION SYSTEM
// ============================================

// Create and append artifact modal to body
const artifactModalHtml = `
<div id="artifactModal" class="artifact-modal">
    <div class="artifact-modal-content">
        <div class="artifact-modal-header">
            <h3>Artifacts and Assets</h3>
            <button class="artifact-modal-close" onclick="closeArtifactModal()">
                <i data-lucide="x"></i>
            </button>
        </div>
        <div class="artifact-options">
            <div class="artifact-section-label">Create Artifact</div>
            <div class="artifact-name-section">
                <label class="artifact-name-label" for="artifactNameInput">Export Name:</label>
                <input type="text" id="artifactNameInput" class="artifact-name-input" placeholder="Enter file name...">
            </div>
            <div class="artifact-option" onclick="exportAsDocument('markdown')">
                <div class="artifact-option-icon">
                    <i data-lucide="file-text"></i>
                </div>
                <div class="artifact-option-content">
                    <div class="artifact-option-title">Export as Markdown</div>
                    <div class="artifact-option-desc">Download as .md file for docs or notes</div>
                </div>
                <div class="artifact-option-arrow">
                    <i data-lucide="chevron-right"></i>
                </div>
            </div>
            <div class="artifact-option" onclick="exportAsDocument('pdf')">
                <div class="artifact-option-icon">
                    <i data-lucide="file-type"></i>
                </div>
                <div class="artifact-option-content">
                    <div class="artifact-option-title">Export as PDF</div>
                    <div class="artifact-option-desc">Download as formatted PDF document</div>
                </div>
                <div class="artifact-option-arrow">
                    <i data-lucide="chevron-right"></i>
                </div>
            </div>
            <div class="artifact-option" onclick="exportAsDocument('docx')">
                <div class="artifact-option-icon">
                    <i data-lucide="file-text"></i>
                </div>
                <div class="artifact-option-content">
                    <div class="artifact-option-title">Export as Word</div>
                    <div class="artifact-option-desc">Download as .docx for Microsoft Word</div>
                </div>
                <div class="artifact-option-arrow">
                    <i data-lucide="chevron-right"></i>
                </div>
            </div>
            <div class="artifact-option" onclick="exportAsDocument('xlsx')">
                <div class="artifact-option-icon">
                    <i data-lucide="table"></i>
                </div>
                <div class="artifact-option-content">
                    <div class="artifact-option-title">Export as Excel</div>
                    <div class="artifact-option-desc">Download tables as .xlsx spreadsheet</div>
                </div>
                <div class="artifact-option-arrow">
                    <i data-lucide="chevron-right"></i>
                </div>
            </div>

            <div class="artifact-section-label artifact-section-divider">Create Asset</div>

            <div class="artifact-option" onclick="ChatAssetCreator.createFromArtifact('skill')">
                <div class="artifact-option-icon" style="color: var(--primary);">
                    <i data-lucide="wand-2"></i>
                </div>
                <div class="artifact-option-content">
                    <div class="artifact-option-title">Create Skill</div>
                    <div class="artifact-option-desc">Transform into a reusable workflow skill</div>
                </div>
                <div class="artifact-option-arrow">
                    <i data-lucide="chevron-right"></i>
                </div>
            </div>
            <div class="artifact-option" onclick="ChatAssetCreator.createFromArtifact('voice_dna')">
                <div class="artifact-option-icon" style="color: var(--primary);">
                    <i data-lucide="mic"></i>
                </div>
                <div class="artifact-option-content">
                    <div class="artifact-option-title">Create Voice DNA</div>
                    <div class="artifact-option-desc">Extract brand voice & writing style</div>
                </div>
                <div class="artifact-option-arrow">
                    <i data-lucide="chevron-right"></i>
                </div>
            </div>
            <div class="artifact-option" onclick="ChatAssetCreator.createFromArtifact('icp')">
                <div class="artifact-option-icon" style="color: var(--primary);">
                    <i data-lucide="users"></i>
                </div>
                <div class="artifact-option-content">
                    <div class="artifact-option-title">Create ICP</div>
                    <div class="artifact-option-desc">Build an ideal customer profile</div>
                </div>
                <div class="artifact-option-arrow">
                    <i data-lucide="chevron-right"></i>
                </div>
            </div>
            <div class="artifact-option" onclick="ChatAssetCreator.createFromArtifact('agent')">
                <div class="artifact-option-icon" style="color: var(--primary);">
                    <i data-lucide="bot"></i>
                </div>
                <div class="artifact-option-content">
                    <div class="artifact-option-title">Create Agent</div>
                    <div class="artifact-option-desc">Create an AI agent with role & capabilities</div>
                </div>
                <div class="artifact-option-arrow">
                    <i data-lucide="chevron-right"></i>
                </div>
            </div>
        </div>
    </div>
</div>
`;

// Inject modal into DOM when script loads
document.addEventListener('DOMContentLoaded', function() {
    document.body.insertAdjacentHTML('beforeend', artifactModalHtml);
    lucide.createIcons();
});

// Store reference to current artifact content
let currentArtifactContent = '';
let currentArtifactHtmlContent = ''; // HTML content for PDF export
let currentArtifactMessageEl = null;
let currentArtifactName = '';

/**
 * Open artifact modal for a message
 */
function openArtifactModal(button) {
    const messageDiv = button.closest('.message');
    const contentDiv = messageDiv.querySelector('.message-content');

    if (!contentDiv) return;

    // Use stored raw markdown if available, otherwise fall back to innerText
    currentArtifactContent = contentDiv.dataset.rawContent || contentDiv.innerText;
    currentArtifactHtmlContent = contentDiv.innerHTML; // Store HTML for PDF export
    currentArtifactMessageEl = messageDiv;

    // Auto-generate a default name from the first heading or first meaningful line
    currentArtifactName = generateArtifactName(currentArtifactContent);

    const modal = document.getElementById('artifactModal');
    if (modal) {
        const nameInput = document.getElementById('artifactNameInput');
        if (nameInput) {
            nameInput.value = currentArtifactName;
            // Sync name on user edit
            nameInput.oninput = () => { currentArtifactName = nameInput.value.trim(); };
        }
        modal.classList.add('active');
        lucide.createIcons();
    }
}

/**
 * Generate a default artifact name from message content
 */
function generateArtifactName(content) {
    if (!content) return '';

    // Try to find the first markdown heading
    const headingMatch = content.match(/^#{1,3}\s+(.+)$/m);
    if (headingMatch) {
        return headingMatch[1].trim().substring(0, 80);
    }

    // Fall back to first non-empty line, cleaned up
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
        // Remove markdown formatting
        let name = lines[0].replace(/^[#*_>\-`]+\s*/, '').trim();
        if (name.length > 80) name = name.substring(0, 77) + '...';
        return name;
    }

    return '';
}

/**
 * Close artifact modal
 */
function closeArtifactModal() {
    const modal = document.getElementById('artifactModal');
    if (modal) {
        modal.classList.remove('active');
    }
    currentArtifactContent = '';
    currentArtifactHtmlContent = '';
    currentArtifactMessageEl = null;
    currentArtifactName = '';
}

// Close modal on outside click
document.addEventListener('click', function(e) {
    const modal = document.getElementById('artifactModal');
    if (modal && e.target === modal) {
        closeArtifactModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeArtifactModal();
    }
});

/**
 * Export message as document
 */
async function exportAsDocument(format) {
    if (!currentArtifactContent) {
        alert('No content to export');
        return;
    }

    // Read the latest name from the input (user may have edited it)
    const nameInput = document.getElementById('artifactNameInput');
    if (nameInput) currentArtifactName = nameInput.value.trim();

    const timestamp = new Date().toISOString().slice(0, 10);
    const _exportName = (typeof BrandingService !== 'undefined') ? BrandingService.getAssistantName().toLowerCase().replace(/\s+/g, '-') : 'higgins';

    // Use artifact name for filename if provided, otherwise fall back to default
    let filename;
    if (currentArtifactName) {
        filename = currentArtifactName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60);
    } else {
        filename = `${_exportName}-response-${timestamp}`;
    }

    try {
        if (format === 'markdown') {
            // Download as Markdown
            const blob = new Blob([currentArtifactContent], { type: 'text/markdown' });
            downloadBlob(blob, `${filename}.md`);
        } else if (format === 'pdf') {
            // For PDF, use professional HTML template with print styles
            const printWindow = window.open('', '_blank');
            // Use HTML content directly (preserves tables, formatting) or fallback to markdown parsing
            const formattedContent = currentArtifactHtmlContent
                ? cleanHtmlForPrint(currentArtifactHtmlContent)
                : formatContentForPrint(currentArtifactContent);
            const dateStr = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>${currentArtifactName || 'Insight 360 - AI Response'}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

                        * {
                            box-sizing: border-box;
                        }

                        @page {
                            size: letter;
                            margin: 1in 0.75in;
                        }

                        body {
                            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            font-size: 11pt;
                            line-height: 1.7;
                            color: #1a1a2e;
                            max-width: 100%;
                            margin: 0;
                            padding: 0;
                            background: #fff;
                        }

                        .document {
                            max-width: 7.5in;
                            margin: 0 auto;
                            padding: 0;
                        }

                        /* Header */
                        .document-header {
                            border-bottom: 3px solid #6366f1;
                            padding-bottom: 20px;
                            margin-bottom: 30px;
                        }

                        .document-header h1 {
                            font-size: 24pt;
                            font-weight: 700;
                            color: #1a1a2e;
                            margin: 0 0 8px 0;
                            letter-spacing: -0.5px;
                        }

                        .document-meta {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            color: #64748b;
                            font-size: 9pt;
                        }

                        .document-meta .brand {
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            font-weight: 500;
                        }

                        .document-meta .brand-icon {
                            width: 20px;
                            height: 20px;
                            background: linear-gradient(135deg, #6366f1, #8b5cf6);
                            border-radius: 4px;
                        }

                        /* Content Styling */
                        .document-content {
                            font-size: 11pt;
                        }

                        .document-content p {
                            margin: 0 0 14px 0;
                            text-align: justify;
                        }

                        .document-content h1 {
                            font-size: 18pt;
                            font-weight: 700;
                            color: #1a1a2e;
                            margin: 28px 0 14px 0;
                            padding-bottom: 8px;
                            border-bottom: 2px solid #e2e8f0;
                        }

                        .document-content h2 {
                            font-size: 14pt;
                            font-weight: 600;
                            color: #334155;
                            margin: 24px 0 12px 0;
                        }

                        .document-content h3 {
                            font-size: 12pt;
                            font-weight: 600;
                            color: #475569;
                            margin: 20px 0 10px 0;
                        }

                        .document-content h4 {
                            font-size: 11pt;
                            font-weight: 600;
                            color: #64748b;
                            margin: 16px 0 8px 0;
                        }

                        /* Lists */
                        .document-content ul,
                        .document-content ol {
                            margin: 12px 0;
                            padding-left: 24px;
                        }

                        .document-content li {
                            margin: 6px 0;
                        }

                        /* Code Blocks */
                        .document-content pre {
                            background: #f8fafc;
                            border: 1px solid #e2e8f0;
                            border-left: 4px solid #6366f1;
                            border-radius: 6px;
                            padding: 16px;
                            margin: 16px 0;
                            overflow-x: auto;
                            font-family: var(--font-mono);
                            font-size: 9pt;
                            line-height: 1.5;
                        }

                        .document-content code {
                            font-family: var(--font-mono);
                            background: #f1f5f9;
                            padding: 2px 6px;
                            border-radius: 4px;
                            font-size: 9pt;
                            color: #6366f1;
                        }

                        .document-content pre code {
                            background: transparent;
                            padding: 0;
                            color: inherit;
                        }

                        /* Blockquotes */
                        .document-content blockquote {
                            border-left: 4px solid #6366f1;
                            background: #f8fafc;
                            margin: 16px 0;
                            padding: 12px 16px;
                            font-style: italic;
                            color: #475569;
                        }

                        /* Tables */
                        .document-content table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 16px 0;
                            font-size: 10pt;
                        }

                        .document-content th,
                        .document-content td {
                            border: 1px solid #e2e8f0;
                            padding: 10px 12px;
                            text-align: left;
                        }

                        .document-content th {
                            background: #f8fafc;
                            font-weight: 600;
                            color: #334155;
                        }

                        .document-content tr:nth-child(even) td {
                            background: #fafafa;
                        }

                        /* Horizontal Rule */
                        .document-content hr {
                            border: none;
                            border-top: 1px solid #e2e8f0;
                            margin: 24px 0;
                        }

                        /* Strong/Bold */
                        .document-content strong {
                            font-weight: 600;
                            color: #1a1a2e;
                        }

                        /* Footer */
                        .document-footer {
                            margin-top: 40px;
                            padding-top: 16px;
                            border-top: 1px solid #e2e8f0;
                            font-size: 8pt;
                            color: #94a3b8;
                            text-align: center;
                        }

                        /* Print-specific */
                        @media print {
                            body {
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }

                            .document-header {
                                page-break-after: avoid;
                            }

                            .document-content h1,
                            .document-content h2,
                            .document-content h3 {
                                page-break-after: avoid;
                            }

                            .document-content pre,
                            .document-content table {
                                page-break-inside: avoid;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="document">
                        <div class="document-header">
                            <h1>${currentArtifactName || 'AI-Generated Response'}</h1>
                            <div class="document-meta">
                                <div class="brand">
                                    <div class="brand-icon"></div>
                                    <span>${(typeof BrandingService !== 'undefined') ? BrandingService.getAppName() : 'Insight 360'} | ${(typeof BrandingService !== 'undefined') ? BrandingService.getAssistantName() : 'Higgins'} AI Assistant</span>
                                </div>
                                <div class="date">${dateStr}</div>
                            </div>
                        </div>
                        <div class="document-content">
                            ${formattedContent}
                        </div>
                        <div class="document-footer">
                            Generated by Insight 360 &bull; Powered by AI &bull; For internal use
                        </div>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();

            // Wait for fonts to load before printing
            setTimeout(() => {
                printWindow.print();
            }, 500);
        } else if (format === 'docx') {
            // For DOCX, create a simple HTML-based download that Word can open
            const htmlContent = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
                <head><meta charset='utf-8'><title>${currentArtifactName || ((typeof BrandingService !== 'undefined') ? BrandingService.getAssistantName() : 'Higgins') + ' Response'}</title></head>
                <body style="font-family: Calibri, sans-serif; font-size: 11pt; line-height: 1.5;">
                <h1>${currentArtifactName || ((typeof BrandingService !== 'undefined') ? BrandingService.getAssistantName() : 'Higgins') + ' Response'}</h1>
                <p><small>Generated: ${new Date().toLocaleString()}</small></p>
                <hr>
                ${formatContentForPrint(currentArtifactContent)}
                </body></html>
            `;
            const blob = new Blob([htmlContent], { type: 'application/msword' });
            downloadBlob(blob, `${filename}.doc`);
        } else if (format === 'xlsx') {
            // Export tables as Excel spreadsheet using SheetJS
            if (typeof XLSX === 'undefined') {
                alert('Excel export library not loaded. Please refresh the page and try again.');
                return;
            }

            const workbook = XLSX.utils.book_new();
            const htmlContent = currentArtifactHtmlContent || formatContentForPrint(currentArtifactContent);

            // Parse HTML to find tables
            const temp = document.createElement('div');
            temp.innerHTML = htmlContent;
            const tables = temp.querySelectorAll('table');

            if (tables.length === 0) {
                // No HTML tables found — try parsing markdown tables from raw content
                const mdTables = extractMarkdownTables(currentArtifactContent);
                if (mdTables.length === 0) {
                    alert('No tables found in this response. Excel export works best with tabular data.');
                    return;
                }
                mdTables.forEach((table, i) => {
                    const ws = XLSX.utils.aoa_to_sheet(table.rows);
                    // Auto-size columns
                    ws['!cols'] = table.rows[0].map((_, colIdx) => ({
                        wch: Math.max(...table.rows.map(row => (row[colIdx] || '').toString().length), 10)
                    }));
                    const sheetName = table.title || `Sheet${i + 1}`;
                    XLSX.utils.book_append_sheet(workbook, ws, sheetName.slice(0, 31));
                });
            } else {
                tables.forEach((table, i) => {
                    const ws = XLSX.utils.table_to_sheet(table);
                    // Auto-size columns based on content
                    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
                    const cols = [];
                    for (let c = range.s.c; c <= range.e.c; c++) {
                        let maxLen = 10;
                        for (let r = range.s.r; r <= range.e.r; r++) {
                            const cell = ws[XLSX.utils.encode_cell({ r, c })];
                            if (cell && cell.v) maxLen = Math.max(maxLen, cell.v.toString().length);
                        }
                        cols.push({ wch: Math.min(maxLen + 2, 50) });
                    }
                    ws['!cols'] = cols;
                    const sheetName = `Sheet${i + 1}`;
                    XLSX.utils.book_append_sheet(workbook, ws, sheetName);
                });
            }

            // Also add a full text sheet with the complete response
            const textWs = XLSX.utils.aoa_to_sheet([
                [currentArtifactName || `${(typeof BrandingService !== 'undefined') ? BrandingService.getAssistantName() : 'Higgins'} AI Response`],
                [`Generated: ${new Date().toLocaleString()}`],
                [''],
                ...currentArtifactContent.split('\n').map(line => [line])
            ]);
            textWs['!cols'] = [{ wch: 100 }];
            XLSX.utils.book_append_sheet(workbook, textWs, 'Full Response');

            XLSX.writeFile(workbook, `${filename}.xlsx`);
        }

        closeArtifactModal();
        setStatus(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
        console.error('Export failed:', error);
        alert('Failed to export: ' + error.message);
    }
}

/**
 * Format content for print/export
 * Converts markdown-style content to properly formatted HTML
 */
function formatContentForPrint(text) {
    // First, handle code blocks to protect them from other transformations
    const codeBlocks = [];
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
        const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
        codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`);
        return placeholder;
    });

    // Handle markdown tables
    const tables = [];
    text = text.replace(/^(\|.+\|)\n(\|[\s:-]+\|)\n((?:\|.+\|\n?)+)/gm, (match, headerRow, separatorRow, bodyRows) => {
        const placeholder = `__TABLE_${tables.length}__`;

        // Parse header
        const headers = headerRow.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim());

        // Parse alignment from separator row
        const alignments = separatorRow.split('|').filter(cell => cell.trim() !== '').map(cell => {
            const trimmed = cell.trim();
            if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
            if (trimmed.endsWith(':')) return 'right';
            return 'left';
        });

        // Parse body rows
        const rows = bodyRows.trim().split('\n').map(row =>
            row.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim())
        );

        // Build HTML table
        let tableHtml = '<table>\n<thead>\n<tr>\n';
        headers.forEach((header, i) => {
            const align = alignments[i] || 'left';
            tableHtml += `<th style="text-align: ${align}">${header}</th>\n`;
        });
        tableHtml += '</tr>\n</thead>\n<tbody>\n';

        rows.forEach(row => {
            tableHtml += '<tr>\n';
            row.forEach((cell, i) => {
                const align = alignments[i] || 'left';
                tableHtml += `<td style="text-align: ${align}">${cell}</td>\n`;
            });
            tableHtml += '</tr>\n';
        });

        tableHtml += '</tbody>\n</table>';
        tables.push(tableHtml);
        return placeholder;
    });

    // Handle inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Handle headers (must be at start of line)
    text = text.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Handle horizontal rules (but not table separators which we've already processed)
    text = text.replace(/^---+$/gm, '<hr>');
    text = text.replace(/^\*\*\*+$/gm, '<hr>');

    // Handle bold and italic
    text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    text = text.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Handle unordered lists (detect contiguous list items)
    text = text.replace(/^[\s]*[-*+] (.+)$/gm, '<li>$1</li>');

    // Handle numbered lists
    text = text.replace(/^[\s]*\d+\. (.+)$/gm, '<li>$1</li>');

    // Wrap consecutive <li> items in <ul> or <ol>
    text = text.replace(/(<li>.*?<\/li>\n?)+/gs, (match) => {
        return '<ul>' + match + '</ul>';
    });

    // Handle blockquotes
    text = text.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    // Merge consecutive blockquotes
    text = text.replace(/<\/blockquote>\n<blockquote>/g, '<br>');

    // Handle paragraphs - split by double newlines
    const paragraphs = text.split(/\n\n+/);
    text = paragraphs.map(p => {
        p = p.trim();
        // Don't wrap if already wrapped in block element or is a placeholder
        if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<ol') ||
            p.startsWith('<pre') || p.startsWith('<blockquote') || p.startsWith('<hr') ||
            p.startsWith('__CODE_BLOCK_') || p.startsWith('__TABLE_')) {
            return p;
        }
        // Convert single newlines to <br> within paragraphs
        p = p.replace(/\n/g, '<br>');
        return `<p>${p}</p>`;
    }).join('\n');

    // Restore code blocks
    codeBlocks.forEach((block, i) => {
        text = text.replace(`__CODE_BLOCK_${i}__`, block);
    });

    // Restore tables
    tables.forEach((table, i) => {
        text = text.replace(`__TABLE_${i}__`, table);
    });

    // Clean up any empty paragraphs
    text = text.replace(/<p>\s*<\/p>/g, '');
    text = text.replace(/<p>(<h[1-4]>)/g, '$1');
    text = text.replace(/(<\/h[1-4]>)<\/p>/g, '$1');
    text = text.replace(/<p>(<table>)/g, '$1');
    text = text.replace(/(<\/table>)<\/p>/g, '$1');

    return text;
}

/**
 * Clean HTML content for print/PDF export
 * Removes interactive elements and normalizes styles for print
 */
function cleanHtmlForPrint(html) {
    // Create a temporary container to parse and clean the HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Remove any interactive elements (buttons, inputs, etc.)
    temp.querySelectorAll('button, input, select, .message-action, .copy-button').forEach(el => el.remove());

    // Remove any script tags
    temp.querySelectorAll('script').forEach(el => el.remove());

    // Remove any data attributes and event handlers by cloning
    const cleanNode = (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            // Remove onclick and other event attributes
            const attrs = Array.from(node.attributes);
            attrs.forEach(attr => {
                if (attr.name.startsWith('on') || attr.name.startsWith('data-')) {
                    node.removeAttribute(attr.name);
                }
            });
        }
    };

    temp.querySelectorAll('*').forEach(cleanNode);

    // Ensure tables have proper styling classes
    temp.querySelectorAll('table').forEach(table => {
        if (!table.classList.contains('print-table')) {
            table.classList.add('print-table');
        }
    });

    return temp.innerHTML;
}

/**
 * Extract markdown tables from raw text content
 * Returns array of { title, rows } where rows is array of arrays
 */
function extractMarkdownTables(text) {
    const tables = [];
    const tableRegex = /(?:^|\n)(?:#+\s*(.+)\n+)?(\|.+\|)\n(\|[\s:-]+\|)\n((?:\|.+\|\n?)+)/gm;
    let match;

    while ((match = tableRegex.exec(text)) !== null) {
        const title = match[1] ? match[1].trim() : null;
        const headerRow = match[2];
        const bodyText = match[4];

        // Parse header cells
        const headers = headerRow.split('|').filter(c => c.trim() !== '').map(c => c.trim());

        // Parse body rows
        const bodyRows = bodyText.trim().split('\n').map(row =>
            row.split('|').filter(c => c.trim() !== '').map(c => c.trim().replace(/\*\*/g, ''))
        );

        tables.push({
            title,
            rows: [headers, ...bodyRows]
        });
    }

    return tables;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Helper to download a blob
 */
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Save as Context Asset
 */
async function saveAsContextAsset() {
    if (!currentArtifactContent) {
        alert('No content to save');
        return;
    }

    const name = prompt('Enter a name for this Context Asset:', 'AI Response - ' + new Date().toLocaleDateString());
    if (!name) return;

    try {
        const fetchFn = window.authFetch || fetch;
        const response = await fetchFn('/api/context/assets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                asset_type: 'i360_knowledge',
                content_json: { content: currentArtifactContent },
                description: `Saved from ${(typeof BrandingService !== 'undefined') ? BrandingService.getAssistantName() : 'Higgins'} conversation`
            })
        });

        const data = await response.json();

        if (data.success) {
            closeArtifactModal();
            setStatus('Saved as Context Asset');
            alert('Context Asset created successfully!');
        } else {
            throw new Error(data.error || 'Failed to save');
        }
    } catch (error) {
        console.error('Save as Context Asset failed:', error);
        alert('Failed to save: ' + error.message);
    }
}

/**
 * Save as Snippet/Template
 */
async function saveAsSnippet() {
    if (!currentArtifactContent) {
        alert('No content to save');
        return;
    }

    const name = prompt('Enter a name for this snippet:', 'Saved Response - ' + new Date().toLocaleDateString());
    if (!name) return;

    try {
        // Save to localStorage as a simple snippet store
        const snippets = JSON.parse(localStorage.getItem('chat_snippets') || '[]');
        snippets.push({
            id: Date.now(),
            name: name,
            content: currentArtifactContent,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('chat_snippets', JSON.stringify(snippets));

        closeArtifactModal();
        setStatus('Snippet saved');
        alert('Snippet saved! You can access it from the snippets menu.');
    } catch (error) {
        console.error('Save as snippet failed:', error);
        alert('Failed to save: ' + error.message);
    }
}

// ============================================
// VOICE INPUT / OUTPUT MODULE
// ============================================

(function() {
    console.log('[Voice] Module initializing...');

    // Local toast helper — showToast doesn't exist on the chat page
    function voiceToast(message, type) {
        try {
            if (typeof ModalService !== 'undefined' && ModalService.toast) {
                ModalService.toast({ message, type });
            } else {
                console[type === 'error' ? 'warn' : 'log']('[Voice]', message);
            }
        } catch (e) {
            console.warn('[Voice] Toast failed:', message);
        }
    }

    // DOM elements
    const voiceInputBtn = document.getElementById('voiceInputBtn');
    const voiceModal = document.getElementById('voiceModal');
    const voiceStatus = document.getElementById('voiceStatus');
    const stopRecordingBtn = document.getElementById('stopRecording');
    const cancelRecordingBtn = document.getElementById('cancelRecording');
    const voicePlayback = document.getElementById('voicePlayback');
    const playResponseBtn = document.getElementById('playResponseBtn');
    const voiceSelect = document.getElementById('voiceSelect');
    const chatInputEl = document.getElementById('chatInput');
    const enableVoiceEl = document.getElementById('enableVoice');
    const voiceActions = document.getElementById('voiceActions');
    const voiceDots = document.getElementById('voiceDots');
    const voiceSpinner = document.getElementById('voiceSpinner');

    console.log('[Voice] DOM elements:', {
        voiceInputBtn: !!voiceInputBtn,
        voiceModal: !!voiceModal,
        stopRecordingBtn: !!stopRecordingBtn,
        voicePlayback: !!voicePlayback,
        playResponseBtn: !!playResponseBtn,
        enableVoiceEl: !!enableVoiceEl
    });

    // State
    let mediaRecorder = null;
    let audioChunks = [];
    let recordingStream = null;
    let currentAudio = null;
    let isPlaying = false;
    let lastAssistantText = '';
    let adminConfig = null;
    let pendingAutoRead = false;

    // Load admin voice configuration
    async function loadVoiceConfig() {
        try {
            const res = await authFetch('/api/chat/voice/config');
            const data = await res.json();
            console.log('[Voice] Config loaded:', { available: data.available, stt: data.config?.stt_enabled, tts: data.config?.tts_enabled });
            if (data.success) {
                adminConfig = data.config;
                // Apply admin defaults
                if (!data.available || !adminConfig.stt_enabled) {
                    console.log('[Voice] STT disabled — hiding mic button');
                    if (voiceInputBtn) voiceInputBtn.style.display = 'none';
                }
                if (!data.available || !adminConfig.tts_enabled) {
                    console.log('[Voice] TTS disabled — hiding playback');
                    if (voicePlayback) voicePlayback.classList.add('hidden');
                }
                // Set default voice from admin config if no user preference
                if (!localStorage.getItem('insight360-voice') && adminConfig.default_voice && voiceSelect) {
                    voiceSelect.value = adminConfig.default_voice;
                }
            }
        } catch (e) {
            console.warn('[Voice] Config fetch failed:', e.message);
        }
    }
    loadVoiceConfig();

    // Load saved voice preference
    const savedVoice = localStorage.getItem('insight360-voice');
    if (savedVoice && voiceSelect) {
        voiceSelect.value = savedVoice;
    }

    // Save voice preference on change
    if (voiceSelect) {
        voiceSelect.addEventListener('change', () => {
            localStorage.setItem('insight360-voice', voiceSelect.value);
        });
    }

    // ---- RECORDING ----

    if (voiceInputBtn) {
        voiceInputBtn.addEventListener('click', startRecording);
    }

    if (stopRecordingBtn) {
        stopRecordingBtn.addEventListener('click', stopRecording);
    }

    if (cancelRecordingBtn) {
        cancelRecordingBtn.addEventListener('click', cancelRecording);
    }

    async function startRecording() {
        console.log('[Voice] startRecording called');
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error('[Voice] getUserMedia not available — page may not be in a secure context');
                voiceToast('Voice recording requires HTTPS or localhost', 'error');
                return;
            }
            console.log('[Voice] Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('[Voice] Microphone access granted');
            recordingStream = stream;
            audioChunks = [];

            // Prefer webm/opus, fallback to whatever browser supports
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : '';
            console.log('[Voice] Using mimeType:', mimeType || '(browser default)');

            mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                // Stream cleanup happens in stop/cancel handlers
            };

            mediaRecorder.start(100); // collect data every 100ms
            console.log('[Voice] Recording started');

            // Show modal
            if (voiceModal) {
                voiceModal.style.display = '';
                voiceModal.classList.remove('hidden');
                voiceModal.classList.add('active');
            }
            if (voiceStatus) voiceStatus.textContent = 'Listening...';

        } catch (err) {
            console.error('[Voice] Microphone access error:', err);
            if (err.name === 'NotAllowedError') {
                voiceToast('Microphone access denied. Please allow microphone permission.', 'error');
            } else {
                voiceToast('Could not access microphone: ' + err.message, 'error');
            }
        }
    }

    async function stopRecording() {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

        // Switch to transcribing state: swap dots for spinner, hide buttons
        if (voiceDots) voiceDots.style.display = 'none';
        if (voiceSpinner) voiceSpinner.style.display = '';
        if (voiceStatus) voiceStatus.textContent = 'Transcribing...';
        if (voiceActions) voiceActions.style.display = 'none';

        // Wait for final data
        await new Promise(resolve => {
            mediaRecorder.onstop = resolve;
            mediaRecorder.stop();
        });

        // Stop mic stream
        if (recordingStream) {
            recordingStream.getTracks().forEach(t => t.stop());
            recordingStream = null;
        }

        // Build blob and send
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        audioChunks = [];
        console.log('[Voice] Recording stopped. Blob size:', audioBlob.size, 'mimeType:', mimeType);

        if (audioBlob.size < 1000) {
            // Too short to be useful
            hideVoiceModal();
            console.warn('[Voice] Recording too short:', audioBlob.size, 'bytes');
            voiceToast('Recording too short. Please try again.', 'error');
            return;
        }

        try {
            const formData = new FormData();
            const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'm4a' : 'wav';
            formData.append('audio', audioBlob, `recording.${ext}`);
            console.log('[Voice] Sending transcription request...');

            const response = await authFetch('/api/chat/voice/transcribe', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            console.log('[Voice] Transcription response:', { status: response.status, success: data.success, hasText: !!data.text, error: data.error });

            if (data.success && data.text) {
                // Insert transcribed text into chat input
                if (chatInputEl) {
                    chatInputEl.value = data.text;
                    chatInputEl.focus();
                    // Auto-resize textarea
                    chatInputEl.style.height = 'auto';
                    chatInputEl.style.height = chatInputEl.scrollHeight + 'px';
                }
                // Auto-enable voice mode so TTS plays the response
                if (enableVoiceEl && !enableVoiceEl.checked) {
                    enableVoiceEl.checked = true;
                    enableVoiceEl.dispatchEvent(new Event('change'));
                }
                pendingAutoRead = true;
                voiceToast('Voice transcribed', 'success');
                // Close modal first, then auto-send
                hideVoiceModal();
                if (typeof sendMessage === 'function') {
                    setTimeout(() => sendMessage(), 100);
                }
                return; // hideVoiceModal already called
            } else {
                voiceToast(data.error || 'Transcription failed', 'error');
            }
        } catch (err) {
            console.error('Transcription request error:', err);
            voiceToast('Failed to transcribe: ' + err.message, 'error');
        }

        hideVoiceModal();
    }

    function cancelRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        if (recordingStream) {
            recordingStream.getTracks().forEach(t => t.stop());
            recordingStream = null;
        }
        audioChunks = [];
        hideVoiceModal();
    }

    function hideVoiceModal() {
        console.log('[Voice] hideVoiceModal called');
        if (voiceModal) {
            voiceModal.classList.remove('active');
            voiceModal.classList.add('hidden');
            voiceModal.style.display = 'none';
        }
        // Reset to recording state for next use
        if (voiceDots) voiceDots.style.display = '';
        if (voiceSpinner) voiceSpinner.style.display = 'none';
        if (voiceActions) voiceActions.style.display = '';
        if (stopRecordingBtn) stopRecordingBtn.disabled = false;
        if (voiceStatus) voiceStatus.textContent = 'Listening...';
    }

    // ---- PLAYBACK ----

    if (playResponseBtn) {
        playResponseBtn.addEventListener('click', togglePlayback);
    }

    async function togglePlayback() {
        if (isPlaying && currentAudio) {
            currentAudio.pause();
            currentAudio = null;
            isPlaying = false;
            updatePlayButton(false);
            return;
        }

        if (!lastAssistantText) {
            voiceToast('No response to read aloud', 'error');
            return;
        }

        // Strip markdown for cleaner speech
        const cleanText = lastAssistantText
            .replace(/```[\s\S]*?```/g, ' code block ')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/#{1,6}\s/g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/[`~]/g, '')
            .trim();

        if (!cleanText) {
            voiceToast('No text content to read', 'error');
            return;
        }

        const voice = voiceSelect?.value || adminConfig?.default_voice || 'nova';
        const speed = adminConfig?.default_speed || 1.0;
        const model = adminConfig?.default_tts_model || 'gpt-4o-mini-tts';

        try {
            updatePlayButton(true);
            setStatus('Generating speech...');

            const ttsBody = { text: cleanText, voice, speed, model };
            if (adminConfig?.tts_instructions) {
                ttsBody.instructions = adminConfig.tts_instructions;
            }

            const response = await authFetch('/api/chat/voice/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ttsBody)
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: 'TTS failed' }));
                throw new Error(err.error || 'TTS request failed');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            currentAudio = new Audio(audioUrl);

            currentAudio.onended = () => {
                isPlaying = false;
                updatePlayButton(false);
                URL.revokeObjectURL(audioUrl);
                setStatus('Ready');
            };

            currentAudio.onerror = () => {
                isPlaying = false;
                updatePlayButton(false);
                URL.revokeObjectURL(audioUrl);
                voiceToast('Audio playback error', 'error');
                setStatus('Ready');
            };

            isPlaying = true;
            currentAudio.play();
            setStatus('Playing response...');

        } catch (err) {
            console.error('TTS error:', err);
            isPlaying = false;
            updatePlayButton(false);
            voiceToast('Text-to-speech failed: ' + err.message, 'error');
            setStatus('Ready');
        }
    }

    function updatePlayButton(playing) {
        if (!playResponseBtn) return;
        const icon = playResponseBtn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', playing ? 'square' : 'volume-2');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    // ---- INTEGRATION WITH CHAT ----

    // Track last assistant response for TTS
    // Override the global conversationHistory push to capture assistant messages
    const origPush = Array.prototype.push;
    const historyRef = typeof conversationHistory !== 'undefined' ? conversationHistory : null;

    if (historyRef) {
        // Use a MutationObserver on the chat messages container to detect new assistant messages
    }

    // Observe new assistant messages to capture text and show playback controls
    const chatMessagesEl = document.getElementById('chatMessages');
    if (chatMessagesEl) {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1 && node.classList?.contains('message-assistant')) {
                        // Extract text from the assistant message content
                        const contentDiv = node.querySelector('.message-content');
                        if (contentDiv) {
                            // Use a small delay to let streaming finish
                            setTimeout(() => {
                                lastAssistantText = contentDiv.textContent || '';
                                // Show playback controls if voice is enabled
                                if (enableVoiceEl?.checked && voicePlayback) {
                                    voicePlayback.classList.remove('hidden');
                                }
                            }, 500);
                        }
                    }
                }
            }
        });
        observer.observe(chatMessagesEl, { childList: true });
    }

    // Also listen for streaming completion to capture final text
    // We hook into the global isStreaming state change
    let streamCheckInterval = null;
    const origSetStatus = typeof setStatus === 'function' ? setStatus : null;

    // Poll for streaming completion and capture final assistant text
    if (chatMessagesEl) {
        setInterval(() => {
            if (typeof isStreaming !== 'undefined' && !isStreaming && enableVoiceEl?.checked) {
                const messages = chatMessagesEl.querySelectorAll('.message-assistant .message-content');
                if (messages.length > 0) {
                    const lastMsg = messages[messages.length - 1];
                    const text = lastMsg.textContent || '';
                    if (text && text !== lastAssistantText) {
                        lastAssistantText = text;
                        if (voicePlayback) voicePlayback.classList.remove('hidden');
                        // Auto-read response if voice input was used
                        if (pendingAutoRead) {
                            pendingAutoRead = false;
                            togglePlayback();
                        }
                    }
                }
            }
        }, 1000);
    }

    // Hide playback when voice is toggled off
    if (enableVoiceEl) {
        enableVoiceEl.addEventListener('change', () => {
            if (!enableVoiceEl.checked) {
                if (voicePlayback) voicePlayback.classList.add('hidden');
                if (currentAudio) {
                    currentAudio.pause();
                    currentAudio = null;
                    isPlaying = false;
                }
            }
        });
    }
})();