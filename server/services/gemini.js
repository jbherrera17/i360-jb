/**
 * Google Gemini Service - Insight 360
 * Wrapper for Google's Gemini API
 *
 * Features:
 * - Chat completions (streaming and non-streaming)
 * - Vision/multimodal support
 * - Reliability features (retry, circuit breaker)
 */

const { withRetry, CircuitBreaker } = require('./reliability');
const logger = require('./logger');

// Gemini API configuration
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Circuit breaker for Gemini API
const circuitBreaker = new CircuitBreaker('gemini', {
    failureThreshold: 3,
    timeout: 30000
});

// Bridge circuit breaker state changes to health monitoring
circuitBreaker.onStateChange((oldState, newState) => {
    try {
        const { updateProviderStatus } = require('./modelAvailabilityService');
        if (newState === 'OPEN') {
            updateProviderStatus('google', 'unavailable', 'Circuit breaker tripped');
        } else if (newState === 'CLOSED') {
            updateProviderStatus('google', 'available');
        }
    } catch (e) {
        // Non-blocking: availability service may not be loaded yet
    }
});

// API key storage
let apiKey = null;

// Supported Gemini models
const GEMINI_MODELS = {
    // Gemini 3 Family (Preview)
    'gemini-3-pro-preview': {
        name: 'Gemini 3 Pro Preview',
        provider: 'google',
        description: 'State-of-the-art reasoning and multimodal',
        maxTokens: 16384,
        contextWindow: 2000000,
        capabilities: ['vision', 'audio', 'video', 'tool_use', 'reasoning', 'agentic'],
        tier: 'premium'
    },
    'gemini-3-flash-preview': {
        name: 'Gemini 3 Flash Preview',
        provider: 'google',
        description: 'Pro-grade reasoning at Flash-level speed',
        maxTokens: 16384,
        contextWindow: 1000000,
        capabilities: ['vision', 'audio', 'tool_use', 'reasoning'],
        tier: 'standard',
        default: true
    },
    // Gemini 2.5 Family
    'gemini-2.5-pro': {
        name: 'Gemini 2.5 Pro',
        provider: 'google',
        description: 'Most capable model for complex reasoning',
        maxTokens: 16384,
        contextWindow: 1000000,
        capabilities: ['vision', 'audio', 'video', 'tool_use', 'reasoning'],
        tier: 'premium'
    },
    'gemini-2.5-flash': {
        name: 'Gemini 2.5 Flash',
        provider: 'google',
        description: 'Fast and efficient with great performance',
        maxTokens: 16384,
        contextWindow: 1000000,
        capabilities: ['vision', 'audio', 'tool_use'],
        tier: 'standard'
    },
    // Gemini 2.0 Family
    'gemini-2.0-flash': {
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        description: 'Fast multimodal model with native tool use',
        maxTokens: 8192,
        contextWindow: 1000000,
        capabilities: ['vision', 'audio', 'tool_use'],
        tier: 'standard'
    },
    'gemini-2.0-flash-lite': {
        name: 'Gemini 2.0 Flash Lite',
        provider: 'google',
        description: 'Lightweight and cost-effective',
        maxTokens: 8192,
        contextWindow: 1000000,
        capabilities: ['vision', 'tool_use'],
        tier: 'fast'
    },
    // Experimental
    'nano-banana-pro-preview': {
        name: 'Nano Banana Pro Preview',
        provider: 'google',
        description: 'Experimental lightweight model',
        maxTokens: 8192,
        contextWindow: 128000,
        capabilities: ['vision'],
        tier: 'experimental'
    }
};

const MODEL_ALIASES = {
    'gemini': 'gemini-3-flash-preview',
    'gemini-pro': 'gemini-3-pro-preview',
    'gemini-flash': 'gemini-3-flash-preview'
};

/**
 * Initialize the Gemini service
 * @param {string} key - Google AI API key
 */
function initialize(key) {
    if (!key) {
        throw new Error('Google AI API key is required');
    }
    apiKey = key;
    logger.info('Google Gemini initialized with reliability features');
}

/**
 * Check if service is initialized
 */
function isInitialized() {
    return !!apiKey;
}

/**
 * Get available models
 */
function getModels() {
    return Object.entries(GEMINI_MODELS).map(([id, model]) => ({
        id,
        ...model
    }));
}

/**
 * Resolve model alias to actual model ID
 */
function resolveModel(model) {
    return MODEL_ALIASES[model] || model;
}

/**
 * Build messages array for Gemini API
 */
function buildMessages(message, history = [], images = []) {
    const contents = [];

    // Add history
    for (const msg of history) {
        contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        });
    }

    // Build current message parts
    const parts = [];

    // Add images if present
    for (const img of images) {
        if (img.data && img.mediaType) {
            parts.push({
                inline_data: {
                    mime_type: img.mediaType,
                    data: img.data
                }
            });
        }
    }

    // Add text
    parts.push({ text: message });

    contents.push({
        role: 'user',
        parts
    });

    return contents;
}

/**
 * Send a chat message (non-streaming)
 * @param {object} options - Chat options
 * @returns {Promise<object>} Response with content and usage
 */
async function chat(options) {
    if (!apiKey) {
        throw new Error('Gemini service not initialized');
    }

    const {
        message,
        model = 'gemini-2.0-flash',
        systemPrompt,
        history = [],
        images = [],
        maxTokens = 8192,
        temperature = 0.7
    } = options;

    const resolvedModel = resolveModel(model);
    const modelInfo = GEMINI_MODELS[resolvedModel] || {};

    const contents = buildMessages(message, history, images);

    const requestBody = {
        contents,
        generationConfig: {
            maxOutputTokens: Math.min(maxTokens, modelInfo.maxTokens || 8192),
            temperature
        }
    };

    // Add system instruction if provided
    if (systemPrompt) {
        requestBody.systemInstruction = {
            parts: [{ text: systemPrompt }]
        };
    }

    const url = `${GEMINI_BASE_URL}/models/${resolvedModel}:generateContent?key=${apiKey}`;

    try {
        const response = await withRetry(
            async () => {
                return circuitBreaker.execute(async () => {
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                    });

                    if (!res.ok) {
                        const error = await res.json().catch(() => ({}));
                        throw new Error(error.error?.message || `Gemini API error: ${res.status}`);
                    }

                    return res.json();
                });
            },
            { maxAttempts: 3, baseDelay: 1000 }
        );

        const candidate = response.candidates?.[0];
        const content = candidate?.content?.parts?.map(p => p.text).join('') || '';

        return {
            content,
            model: resolvedModel,
            usage: {
                promptTokens: response.usageMetadata?.promptTokenCount || 0,
                completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
                totalTokens: response.usageMetadata?.totalTokenCount || 0
            },
            finishReason: candidate?.finishReason || 'stop'
        };

    } catch (error) {
        logger.error('Gemini chat error', { error: error.message, model: resolvedModel });
        throw error;
    }
}

/**
 * Stream a chat response
 * @param {object} options - Chat options
 * @yields {object} Stream chunks with type and content
 */
async function* streamChat(options) {
    if (!apiKey) {
        throw new Error('Gemini service not initialized');
    }

    const {
        message,
        model = 'gemini-2.0-flash',
        systemPrompt,
        history = [],
        images = [],
        maxTokens = 8192,
        temperature = 0.7
    } = options;

    const resolvedModel = resolveModel(model);
    const modelInfo = GEMINI_MODELS[resolvedModel] || {};

    const contents = buildMessages(message, history, images);

    const requestBody = {
        contents,
        generationConfig: {
            maxOutputTokens: Math.min(maxTokens, modelInfo.maxTokens || 8192),
            temperature
        }
    };

    if (systemPrompt) {
        requestBody.systemInstruction = {
            parts: [{ text: systemPrompt }]
        };
    }

    const url = `${GEMINI_BASE_URL}/models/${resolvedModel}:streamGenerateContent?key=${apiKey}&alt=sse`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let totalContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process SSE events
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6).trim();
                    if (jsonStr && jsonStr !== '[DONE]') {
                        try {
                            const data = JSON.parse(jsonStr);
                            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                            if (text) {
                                totalContent += text;
                                yield { type: 'text', content: text };
                            }

                            // Check for finish
                            if (data.candidates?.[0]?.finishReason) {
                                yield {
                                    type: 'done',
                                    content: totalContent,
                                    usage: {
                                        promptTokens: data.usageMetadata?.promptTokenCount || 0,
                                        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
                                        totalTokens: data.usageMetadata?.totalTokenCount || 0
                                    }
                                };
                            }
                        } catch (e) {
                            // Skip malformed JSON
                        }
                    }
                }
            }
        }

        // Final yield if no done event received
        if (totalContent) {
            yield { type: 'done', content: totalContent };
        }

    } catch (error) {
        logger.error('Gemini stream error', { error: error.message, model: resolvedModel });
        yield { type: 'error', error: error.message };
    }
}

module.exports = {
    initialize,
    isInitialized,
    getModels,
    chat,
    streamChat,
    GEMINI_MODELS,
    MODEL_ALIASES
};
