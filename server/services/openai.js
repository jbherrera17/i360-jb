/**
 * OpenAI Service - Phase 16 Enhanced
 *
 * OpenAI SDK v6.x with current GPT models, o-series reasoning, audio, and image generation
 * Includes reliability features: retry, circuit breaker, timeout
 */

const OpenAI = require('openai');
const { withResilience, getCircuitBreaker } = require('./reliability');
const logger = require('./logger');

// Circuit breaker configuration for OpenAI API
const OPENAI_CIRCUIT_CONFIG = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute before attempting recovery
    volumeThreshold: 3,
    errorPercentageThreshold: 50,
};

// Retry configuration for OpenAI API
const OPENAI_RETRY_CONFIG = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
};

// Available OpenAI models (December 2025)
const OPENAI_MODELS = {
    // GPT-5.2 Family (Latest - December 2025)
    'gpt-5.2': {
        name: 'GPT-5.2 Thinking',
        description: 'Best for structured work like coding and planning',
        maxTokens: 128000,
        contextWindow: 400000,
        vision: true,
        reasoning: true,
        tier: 'flagship',
        default: true
    },
    'gpt-5.2-chat-latest': {
        name: 'GPT-5.2 Instant',
        description: 'Faster at writing and information seeking',
        maxTokens: 128000,
        contextWindow: 400000,
        vision: true,
        tier: 'flagship'
    },
    'gpt-5.2-pro': {
        name: 'GPT-5.2 Pro',
        description: 'Most accurate answers for difficult questions',
        maxTokens: 128000,
        contextWindow: 400000,
        vision: true,
        reasoning: true,
        tier: 'premium'
    },
    // GPT-4o Family
    'gpt-4o': {
        name: 'GPT-4o',
        description: 'Multimodal with text, vision, and audio',
        maxTokens: 16384,
        contextWindow: 128000,
        vision: true,
        audio: true,
        tier: 'standard'
    },
    'gpt-4o-mini': {
        name: 'GPT-4o Mini',
        description: 'Affordable multimodal - great for simple tasks',
        maxTokens: 16384,
        contextWindow: 128000,
        vision: true,
        tier: 'efficient'
    },
    // Audio Models
    'gpt-4o-audio-preview': {
        name: 'GPT-4o Audio',
        description: 'Audio input/output support - voice conversations',
        maxTokens: 16384,
        contextWindow: 128000,
        vision: true,
        audio: true,
        tier: 'audio'
    },
    // O-Series Reasoning Models
    'o1': {
        name: 'o1',
        description: 'Advanced reasoning model - complex analysis and math',
        maxTokens: 100000,
        contextWindow: 200000,
        vision: true,
        reasoning: true,
        tier: 'reasoning'
    },
    'o1-mini': {
        name: 'o1-mini',
        description: 'Fast reasoning - great for math and coding',
        maxTokens: 65536,
        contextWindow: 128000,
        vision: false,
        reasoning: true,
        tier: 'reasoning'
    },
    // Legacy
    'gpt-4-turbo': {
        name: 'GPT-4 Turbo',
        description: 'Previous flagship with vision',
        maxTokens: 4096,
        contextWindow: 128000,
        vision: true,
        tier: 'legacy'
    }
};

// Image generation models
const IMAGE_MODELS = {
    'gpt-image-1.5': {
        name: 'GPT Image 1.5',
        description: 'Latest image generation with better instruction-following',
        sizes: ['1024x1024', '1024x1792', '1792x1024'],
        qualities: ['standard', 'hd'],
        styles: ['vivid', 'natural'],
        default: true
    },
    'dall-e-3': {
        name: 'DALL-E 3',
        description: 'High quality image generation with detailed prompts',
        sizes: ['1024x1024', '1024x1792', '1792x1024'],
        qualities: ['standard', 'hd'],
        styles: ['vivid', 'natural']
    },
    'dall-e-2': {
        name: 'DALL-E 2',
        description: 'Fast image generation, supports variations and edits',
        sizes: ['256x256', '512x512', '1024x1024'],
        qualities: ['standard'],
        styles: []
    }
};

// Model aliases
const MODEL_ALIASES = {
    'gpt-5.2': 'gpt-5.2',
    'gpt-5.2-chat-latest': 'gpt-5.2-chat-latest',
    'gpt-5.2-pro': 'gpt-5.2-pro',
    'gpt-4o': 'gpt-4o',
    'gpt-4o-mini': 'gpt-4o-mini',
    'gpt-4-turbo': 'gpt-4-turbo',
    'o1': 'o1',
    'o1-mini': 'o1-mini',
    // Convenience aliases
    'gpt5': 'gpt-5.2',
    'gpt4': 'gpt-4-turbo',
    'gpt4o': 'gpt-4o',
    'gpt4-mini': 'gpt-4o-mini'
};

let client = null;
let searchService = null;

/**
 * Initialize the OpenAI client
 */
function initialize(apiKey, searchSvc = null) {
    if (!apiKey) {
        logger.warn('OpenAI API key not provided');
        return false;
    }

    try {
        client = new OpenAI({ apiKey });
        searchService = searchSvc;
        // Initialize circuit breaker
        getCircuitBreaker('openai', OPENAI_CIRCUIT_CONFIG);
        logger.info('OpenAI GPT initialized with reliability features');
        return true;
    } catch (error) {
        logger.error('Failed to initialize OpenAI', { error: error.message });
        return false;
    }
}

/**
 * Resolve model alias to actual model ID
 */
function resolveModel(modelInput) {
    if (!modelInput) return 'gpt-5.2';

    const normalized = modelInput.toLowerCase();

    if (MODEL_ALIASES[normalized]) {
        return MODEL_ALIASES[normalized];
    }

    if (OPENAI_MODELS[modelInput]) {
        return modelInput;
    }

    // Fuzzy match
    for (const [id, info] of Object.entries(OPENAI_MODELS)) {
        if (id.includes(normalized) || info.name.toLowerCase().includes(normalized)) {
            return id;
        }
    }

    return 'gpt-5.2';
}

/**
 * Build messages array with vision and audio support
 */
function buildMessages(message, history = [], images = [], systemPrompt = null) {
    const messages = [];
    
    // Add system prompt
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    
    // Add history
    for (const msg of history) {
        messages.push({
            role: msg.role,
            content: msg.content
        });
    }
    
    // Build current message
    if (images && images.length > 0) {
        const content = [];
        
        // Add images
        for (const img of images) {
            content.push({
                type: 'image_url',
                image_url: {
                    url: `data:${img.mediaType || 'image/jpeg'};base64,${img.data}`,
                    detail: 'auto'
                }
            });
        }
        
        // Add text
        content.push({ type: 'text', text: message });
        
        messages.push({ role: 'user', content });
    } else {
        messages.push({ role: 'user', content: message });
    }
    
    return messages;
}

/**
 * Send a chat message and get a response
 */
async function chat(options) {
    if (!client) {
        throw new Error('OpenAI client not initialized');
    }
    
    const {
        message,
        model = 'gpt-4o',
        systemPrompt,
        history = [],
        images = [],
        maxTokens = 4096,
        enableSearch = false,
        reasoningEffort = null
    } = options;
    
    const resolvedModel = resolveModel(model);
    const modelInfo = OPENAI_MODELS[resolvedModel] || {};
    
    const messages = buildMessages(message, history, images, systemPrompt);
    
    const requestParams = {
        model: resolvedModel,
        messages
    };

    // GPT-5.x and o-series use max_completion_tokens, others use max_tokens
    const tokenLimit = Math.min(maxTokens, modelInfo.maxTokens || 16384);
    if (resolvedModel.startsWith('gpt-5') || resolvedModel.startsWith('o1')) {
        requestParams.max_completion_tokens = tokenLimit;
    } else {
        requestParams.max_tokens = tokenLimit;
    }

    // Add reasoning effort for o-series models
    if (reasoningEffort && modelInfo.reasoning) {
        requestParams.reasoning_effort = reasoningEffort;
    }
    
    // Add web search tool if enabled
    if (enableSearch && searchService && searchService.isAvailable()) {
        requestParams.tools = [{
            type: 'function',
            function: {
                name: 'web_search',
                description: 'Search the web for current information',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'The search query' }
                    },
                    required: ['query']
                }
            }
        }];
        requestParams.tool_choice = 'auto';
    }
    
    // Use resilience wrapper for API call
    const makeApiCall = async () => {
        let response = await client.chat.completions.create(requestParams);
        let responseMessage = response.choices[0].message;

        // Handle tool calls (web search)
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            const toolCall = responseMessage.tool_calls[0];

            if (toolCall.function.name === 'web_search') {
                const args = JSON.parse(toolCall.function.arguments);
                const searchResults = await searchService.search(args.query);

                // Continue with tool result
                const continueMessages = [
                    ...messages,
                    responseMessage,
                    {
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(searchResults),
                    },
                ];

                response = await client.chat.completions.create({
                    ...requestParams,
                    messages: continueMessages,
                });
                responseMessage = response.choices[0].message;
            }
        }

        return { response, responseMessage };
    };

    try {
        const { response, responseMessage } = await withResilience(makeApiCall, {
            operationName: 'openai-chat',
            timeout: 120000, // 2 minutes for complex requests
            circuitBreaker: 'openai',
            circuitBreakerOptions: OPENAI_CIRCUIT_CONFIG,
            retryOptions: OPENAI_RETRY_CONFIG,
        });

        return {
            content: responseMessage.content || '',
            model: resolvedModel,
            modelName: modelInfo.name || resolvedModel,
            usage: {
                prompt_tokens: response.usage?.prompt_tokens || 0,
                completion_tokens: response.usage?.completion_tokens || 0,
                total_tokens: response.usage?.total_tokens || 0,
            },
            finishReason: response.choices[0].finish_reason,
        };
    } catch (error) {
        logger.error('OpenAI chat error', {
            error: error.message,
            code: error.code,
            model: resolvedModel,
        });

        // Provide user-friendly error messages
        if (error.code === 'CIRCUIT_OPEN') {
            throw new Error(
                'OpenAI API is temporarily unavailable. Please try again in a few minutes.'
            );
        }
        if (error.code === 'ETIMEDOUT') {
            throw new Error('Request to OpenAI API timed out. Please try again.');
        }

        throw new Error(`OpenAI API error: ${error.message}`);
    }
}

/**
 * Stream a chat response
 */
async function* streamChat(options) {
    if (!client) {
        throw new Error('OpenAI client not initialized');
    }
    
    const {
        message,
        model = 'gpt-4o',
        systemPrompt,
        history = [],
        images = [],
        maxTokens = 4096,
        enableSearch = false
    } = options;
    
    const resolvedModel = resolveModel(model);
    const modelInfo = OPENAI_MODELS[resolvedModel] || {};
    
    const messages = buildMessages(message, history, images, systemPrompt);
    
    const requestParams = {
        model: resolvedModel,
        messages,
        stream: true
    };

    // GPT-5.x and o-series use max_completion_tokens, others use max_tokens
    const tokenLimit = Math.min(maxTokens, modelInfo.maxTokens || 16384);
    if (resolvedModel.startsWith('gpt-5') || resolvedModel.startsWith('o1')) {
        requestParams.max_completion_tokens = tokenLimit;
    } else {
        requestParams.max_tokens = tokenLimit;
    }

    // Add web search tool if enabled
    if (enableSearch && searchService && searchService.isAvailable()) {
        requestParams.tools = [{
            type: 'function',
            function: {
                name: 'web_search',
                description: 'Search the web for current information',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'The search query' }
                    },
                    required: ['query']
                }
            }
        }];
        requestParams.tool_choice = 'auto';
    }
    
    try {
        const stream = await client.chat.completions.create(requestParams);
        
        let toolCallBuffer = null;
        let promptTokens = 0;
        let completionTokens = 0;
        
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            
            if (delta?.content) {
                yield { type: 'text', content: delta.content };
            }
            
            // Handle streaming tool calls
            if (delta?.tool_calls) {
                const toolDelta = delta.tool_calls[0];
                if (toolDelta.function?.name === 'web_search') {
                    if (!toolCallBuffer) {
                        toolCallBuffer = {
                            id: toolDelta.id,
                            name: toolDelta.function.name,
                            arguments: ''
                        };
                        yield { type: 'search_start', query: '' };
                    }
                }
                if (toolDelta.function?.arguments) {
                    toolCallBuffer.arguments += toolDelta.function.arguments;
                }
            }
            
            // Track usage if provided
            if (chunk.usage) {
                promptTokens = chunk.usage.prompt_tokens || 0;
                completionTokens = chunk.usage.completion_tokens || 0;
            }
            
            // Check for tool call completion
            if (chunk.choices[0]?.finish_reason === 'tool_calls' && toolCallBuffer) {
                try {
                    const args = JSON.parse(toolCallBuffer.arguments);
                    yield { type: 'search_query', query: args.query };
                    
                    const searchResults = await searchService.search(args.query);
                    yield { type: 'search_complete', results: searchResults };
                    
                    // Continue with tool result
                    const continueMessages = [
                        ...messages,
                        {
                            role: 'assistant',
                            tool_calls: [{
                                id: toolCallBuffer.id,
                                type: 'function',
                                function: {
                                    name: toolCallBuffer.name,
                                    arguments: toolCallBuffer.arguments
                                }
                            }]
                        },
                        {
                            role: 'tool',
                            tool_call_id: toolCallBuffer.id,
                            content: JSON.stringify(searchResults)
                        }
                    ];
                    
                    const continueStream = await client.chat.completions.create({
                        ...requestParams,
                        messages: continueMessages,
                        stream: true
                    });
                    
                    for await (const continueChunk of continueStream) {
                        const continueDelta = continueChunk.choices[0]?.delta;
                        if (continueDelta?.content) {
                            yield { type: 'text', content: continueDelta.content };
                        }
                    }
                } catch (e) {
                    console.error('Tool execution error:', e);
                }
                toolCallBuffer = null;
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
        console.error('OpenAI stream error:', error);
        yield { type: 'error', error: error.message };
    }
}

/**
 * Transcribe audio to text
 */
async function transcribeAudio(audioBuffer, options = {}) {
    if (!client) {
        throw new Error('OpenAI client not initialized');
    }
    
    const {
        model = 'gpt-4o-transcribe',
        language = null,
        prompt = null
    } = options;
    
    try {
        const response = await client.audio.transcriptions.create({
            file: audioBuffer,
            model,
            language,
            prompt
        });
        
        return {
            text: response.text,
            model
        };
    } catch (error) {
        console.error('Transcription error:', error);
        throw new Error(`Transcription failed: ${error.message}`);
    }
}

/**
 * Convert text to speech
 */
async function textToSpeech(text, options = {}) {
    if (!client) {
        throw new Error('OpenAI client not initialized');
    }
    
    const {
        model = 'gpt-4o-mini-tts',
        voice = 'alloy',
        speed = 1.0,
        instructions = null
    } = options;
    
    try {
        const requestParams = {
            model,
            input: text,
            voice,
            speed
        };
        
        // Add instructions for gpt-4o-mini-tts
        if (instructions && model === 'gpt-4o-mini-tts') {
            requestParams.instructions = instructions;
        }
        
        const response = await client.audio.speech.create(requestParams);
        
        // Return as buffer
        const buffer = Buffer.from(await response.arrayBuffer());
        return {
            audio: buffer,
            model,
            voice
        };
    } catch (error) {
        console.error('TTS error:', error);
        throw new Error(`Text-to-speech failed: ${error.message}`);
    }
}

/**
 * Generate an image using DALL-E
 */
async function generateImage(prompt, options = {}) {
    if (!client) {
        throw new Error('OpenAI client not initialized');
    }

    const {
        model = 'dall-e-3',
        size = '1024x1024',
        quality = 'standard',
        style = 'vivid',
        n = 1,
        responseFormat = 'url'
    } = options;

    const modelInfo = IMAGE_MODELS[model];
    if (!modelInfo) {
        throw new Error(`Unknown image model: ${model}. Available: ${Object.keys(IMAGE_MODELS).join(', ')}`);
    }

    // Validate size
    if (!modelInfo.sizes.includes(size)) {
        throw new Error(`Invalid size for ${model}: ${size}. Available: ${modelInfo.sizes.join(', ')}`);
    }

    try {
        const requestParams = {
            model,
            prompt,
            n: model === 'dall-e-3' ? 1 : Math.min(n, 10), // DALL-E 3 only supports n=1
            size,
            response_format: responseFormat === 'base64' ? 'b64_json' : 'url'
        };

        // DALL-E 3 specific options
        if (model === 'dall-e-3') {
            requestParams.quality = quality;
            if (modelInfo.styles.includes(style)) {
                requestParams.style = style;
            }
        }

        const response = await client.images.generate(requestParams);

        return {
            images: response.data.map(img => ({
                url: img.url || null,
                base64: img.b64_json || null,
                revisedPrompt: img.revised_prompt || null
            })),
            model,
            modelName: modelInfo.name
        };
    } catch (error) {
        console.error('Image generation error:', error);
        throw new Error(`Image generation failed: ${error.message}`);
    }
}

/**
 * Create image variations (DALL-E 2 only)
 */
async function createImageVariation(imageBuffer, options = {}) {
    if (!client) {
        throw new Error('OpenAI client not initialized');
    }

    const {
        n = 1,
        size = '1024x1024',
        responseFormat = 'url'
    } = options;

    try {
        const response = await client.images.createVariation({
            image: imageBuffer,
            n: Math.min(n, 10),
            size,
            response_format: responseFormat === 'base64' ? 'b64_json' : 'url'
        });

        return {
            images: response.data.map(img => ({
                url: img.url || null,
                base64: img.b64_json || null
            })),
            model: 'dall-e-2'
        };
    } catch (error) {
        console.error('Image variation error:', error);
        throw new Error(`Image variation failed: ${error.message}`);
    }
}

/**
 * Get available models
 */
function getModels() {
    return Object.entries(OPENAI_MODELS).map(([id, info]) => ({
        id,
        ...info,
        provider: 'openai'
    }));
}

/**
 * Get available image models
 */
function getImageModels() {
    return Object.entries(IMAGE_MODELS).map(([id, info]) => ({
        id,
        ...info,
        provider: 'openai'
    }));
}

/**
 * Check if client is initialized
 */
function isAvailable() {
    return client !== null;
}

/**
 * Get circuit breaker status for OpenAI API
 */
function getCircuitStatus() {
    const cb = getCircuitBreaker('openai');
    return cb.getStatus();
}

/**
 * Reset the circuit breaker (for admin use)
 */
function resetCircuit() {
    const cb = getCircuitBreaker('openai');
    cb.reset();
}

module.exports = {
    initialize,
    chat,
    streamChat,
    transcribeAudio,
    textToSpeech,
    generateImage,
    createImageVariation,
    getModels,
    getImageModels,
    resolveModel,
    isAvailable,
    getCircuitStatus,
    resetCircuit,
    OPENAI_MODELS,
    IMAGE_MODELS,
    MODEL_ALIASES,
};
