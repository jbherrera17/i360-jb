/* chat image-generation — detect intent, extract prompt, call API */

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

    // Ensure authFetch is available before making API calls
    if (typeof initNavigation === 'function') await initNavigation();

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

