/**
 * Perplexity AI Service - Insight 360
 *
 * Perplexity API for real-time web search and AI responses
 * Uses OpenAI-compatible API format
 */

// Perplexity uses OpenAI-compatible API
const PERPLEXITY_BASE_URL = 'https://api.perplexity.ai';

// Available Perplexity models (January 2026)
// Note: sonar-reasoning was deprecated in late 2025, use sonar-reasoning-pro instead
const PERPLEXITY_MODELS = {
    // Sonar Pro - Most capable, best factuality
    'sonar-pro': {
        name: 'Sonar Pro',
        description: 'Advanced search with grounding - best factuality (F-score 0.858)',
        maxTokens: 8192,
        contextWindow: 200000,
        search: true,
        tier: 'pro',
        default: true
    },
    // Sonar - Standard, cost-effective
    'sonar': {
        name: 'Sonar',
        description: 'Lightweight, cost-effective search with grounding (Llama 3.3 70B)',
        maxTokens: 8192,
        contextWindow: 128000,
        search: true,
        tier: 'standard'
    },
    // Sonar Reasoning Pro - Chain of Thought
    'sonar-reasoning-pro': {
        name: 'Sonar Reasoning Pro',
        description: 'Chain of Thought reasoning for complex analytical tasks',
        maxTokens: 8192,
        contextWindow: 128000,
        search: true,
        reasoning: true,
        tier: 'reasoning'
    },
    // Sonar Deep Research - Expert-level research
    'sonar-deep-research': {
        name: 'Sonar Deep Research',
        description: 'Expert-level research - exhaustive searches, comprehensive reports',
        maxTokens: 8192,
        contextWindow: 128000,
        search: true,
        research: true,
        tier: 'research'
    }
};

// Deprecated models - map to replacement
const DEPRECATED_MODELS = {
    'sonar-reasoning': 'sonar-reasoning-pro'  // Deprecated late 2025
};

// Model aliases
const MODEL_ALIASES = {
    'perplexity': 'sonar-pro',
    'perplexity-pro': 'sonar-pro',
    'perplexity-reasoning': 'sonar-reasoning-pro',
    'perplexity-research': 'sonar-deep-research',
    'pplx': 'sonar-pro',
    'pplx-pro': 'sonar-pro'
};

let apiKey = null;

/**
 * Initialize the Perplexity client
 */
function initialize(key) {
    if (!key) {
        console.warn('Perplexity API key not provided');
        return false;
    }

    apiKey = key;
    console.log('✓ Perplexity AI initialized');
    return true;
}

/**
 * Resolve model alias to actual model ID
 * Handles deprecated models by mapping to replacements
 */
function resolveModel(modelInput) {
    if (!modelInput) return 'sonar-pro';

    const normalized = modelInput.toLowerCase();

    // Check for deprecated models first - map to replacement
    if (DEPRECATED_MODELS[normalized]) {
        console.warn(`Perplexity model '${modelInput}' is deprecated, using '${DEPRECATED_MODELS[normalized]}' instead`);
        return DEPRECATED_MODELS[normalized];
    }

    // Check aliases
    if (MODEL_ALIASES[normalized]) {
        return MODEL_ALIASES[normalized];
    }

    // Check if it's already a valid model ID
    if (PERPLEXITY_MODELS[modelInput]) {
        return modelInput;
    }

    // Fuzzy match
    for (const [id, info] of Object.entries(PERPLEXITY_MODELS)) {
        if (id.includes(normalized) || info.name.toLowerCase().includes(normalized)) {
            return id;
        }
    }

    return 'sonar-pro';
}

/**
 * Build messages array for Perplexity API
 */
function buildMessages(message, history = [], systemPrompt = null) {
    const messages = [];

    // Add system prompt
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }

    // Add history
    for (const msg of history) {
        messages.push({
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        });
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    return messages;
}

/**
 * Send a chat message and get a response
 */
async function chat(options) {
    if (!apiKey) {
        throw new Error('Perplexity client not initialized');
    }

    const {
        message,
        model = 'sonar-pro',
        systemPrompt,
        history = [],
        maxTokens = 4096,
        temperature = 0.7,
        returnCitations = true,
        returnImages = false
    } = options;

    const resolvedModel = resolveModel(model);
    const modelInfo = PERPLEXITY_MODELS[resolvedModel] || {};

    const messages = buildMessages(message, history, systemPrompt);

    const requestBody = {
        model: resolvedModel,
        messages,
        max_tokens: Math.min(maxTokens, modelInfo.maxTokens || 8192),
        temperature,
        return_citations: returnCitations,
        return_images: returnImages
    };

    try {
        const response = await fetch(`${PERPLEXITY_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Perplexity API error: ${response.status}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];

        return {
            content: choice?.message?.content || '',
            model: resolvedModel,
            modelName: modelInfo.name || resolvedModel,
            citations: data.citations || [],
            images: data.images || [],
            usage: {
                prompt_tokens: data.usage?.prompt_tokens || 0,
                completion_tokens: data.usage?.completion_tokens || 0,
                total_tokens: data.usage?.total_tokens || 0
            },
            finishReason: choice?.finish_reason
        };
    } catch (error) {
        console.error('Perplexity chat error:', error);
        throw new Error(`Perplexity API error: ${error.message}`);
    }
}

/**
 * Stream a chat response
 */
async function* streamChat(options) {
    if (!apiKey) {
        throw new Error('Perplexity client not initialized');
    }

    const {
        message,
        model = 'sonar-pro',
        systemPrompt,
        history = [],
        maxTokens = 4096,
        temperature = 0.7
    } = options;

    const resolvedModel = resolveModel(model);
    const modelInfo = PERPLEXITY_MODELS[resolvedModel] || {};

    const messages = buildMessages(message, history, systemPrompt);

    const requestBody = {
        model: resolvedModel,
        messages,
        max_tokens: Math.min(maxTokens, modelInfo.maxTokens || 8192),
        temperature,
        stream: true
    };

    try {
        const response = await fetch(`${PERPLEXITY_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let promptTokens = 0;
        let completionTokens = 0;

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE messages
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
                const trimmed = line.trim();

                if (!trimmed || trimmed === 'data: [DONE]') continue;

                if (trimmed.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(trimmed.slice(6));
                        const delta = data.choices?.[0]?.delta;

                        if (delta?.content) {
                            yield { type: 'text', content: delta.content };
                        }

                        // Track usage if provided
                        if (data.usage) {
                            promptTokens = data.usage.prompt_tokens || promptTokens;
                            completionTokens = data.usage.completion_tokens || completionTokens;
                        }

                        // Check for citations in final message
                        if (data.citations) {
                            yield { type: 'citations', citations: data.citations };
                        }
                    } catch (parseError) {
                        // Skip malformed JSON
                    }
                }
            }
        }

        yield {
            type: 'done',
            model: resolvedModel,
            modelName: modelInfo.name || resolvedModel,
            usage: {
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens,
                total_tokens: promptTokens + completionTokens
            }
        };
    } catch (error) {
        console.error('Perplexity stream error:', error);
        yield { type: 'error', error: error.message };
    }
}

/**
 * Get available models
 */
function getModels() {
    return Object.entries(PERPLEXITY_MODELS).map(([id, info]) => ({
        id,
        ...info,
        provider: 'perplexity'
    }));
}

/**
 * Check if client is initialized
 */
function isAvailable() {
    return apiKey !== null;
}

module.exports = {
    initialize,
    chat,
    streamChat,
    getModels,
    resolveModel,
    isAvailable,
    PERPLEXITY_MODELS,
    MODEL_ALIASES
};
