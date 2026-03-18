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

// Available OpenAI models (February 2026)
const OPENAI_MODELS = {
    // GPT-5.3 Family (Latest - February 2026)
    'gpt-5.3-codex': {
        name: 'GPT-5.3 Codex',
        description: 'Most capable agentic coding model - real-world software engineering',
        maxTokens: 128000,
        contextWindow: 400000,
        vision: true,
        reasoning: true,
        tier: 'flagship',
        apiNote: 'Phased API rollout - may not be available to all developers yet'
    },
    // GPT-5.2 Family
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
    'gpt-5.2-codex': {
        name: 'GPT-5.2 Codex',
        description: 'Optimized for code generation and understanding',
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
    // O-Series Reasoning Models (Latest)
    'o3': {
        name: 'o3',
        description: 'Powerful reasoning - math, science, coding, and visual reasoning',
        maxTokens: 100000,
        contextWindow: 200000,
        vision: true,
        reasoning: true,
        tier: 'reasoning'
    },
    'o3-pro': {
        name: 'o3-pro',
        description: 'Extended reasoning - more compute for consistently better answers',
        maxTokens: 100000,
        contextWindow: 200000,
        vision: true,
        reasoning: true,
        tier: 'reasoning'
    },
    'o4-mini': {
        name: 'o4-mini',
        description: 'Fast reasoning - efficient performance in coding and visual tasks',
        maxTokens: 100000,
        contextWindow: 200000,
        vision: true,
        reasoning: true,
        tier: 'reasoning'
    },
    // Legacy O-Series
    'o1': {
        name: 'o1',
        description: 'Previous reasoning model - complex analysis and math',
        maxTokens: 100000,
        contextWindow: 200000,
        vision: true,
        reasoning: true,
        tier: 'legacy'
    },
    'o1-mini': {
        name: 'o1-mini',
        description: 'Previous fast reasoning model',
        maxTokens: 65536,
        contextWindow: 128000,
        vision: false,
        reasoning: true,
        tier: 'legacy'
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
        sizes: ['1024x1024', '1024x1536', '1536x1024', 'auto'], // GPT Image 1.5 specific sizes
        qualities: ['low', 'medium', 'high', 'auto'],
        styles: [], // GPT Image doesn't support style parameter
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
    'gpt-5.3-codex': 'gpt-5.3-codex',
    'gpt-5.2': 'gpt-5.2',
    'gpt-5.2-chat-latest': 'gpt-5.2-chat-latest',
    'gpt-5.2-codex': 'gpt-5.2-codex',
    'gpt-5.2-pro': 'gpt-5.2', // gpt-5.2-pro is NOT a chat model, redirect to gpt-5.2
    'gpt-4o': 'gpt-4o',
    'gpt-4o-mini': 'gpt-4o-mini',
    'gpt-4-turbo': 'gpt-4-turbo',
    'o3': 'o3',
    'o3-pro': 'o3-pro',
    'o4-mini': 'o4-mini',
    'o1': 'o1',
    'o1-mini': 'o1-mini',
    // Convenience aliases
    'gpt5': 'gpt-5.2',
    'gpt5-pro': 'gpt-5.2', // gpt-5.2-pro is NOT a chat model
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
        // Initialize circuit breaker with health monitoring bridge
        const cb = getCircuitBreaker('openai', OPENAI_CIRCUIT_CONFIG);
        cb.onStateChange((oldState, newState) => {
            try {
                const { updateProviderStatus } = require('./modelAvailabilityService');
                if (newState === 'OPEN') {
                    updateProviderStatus('openai', 'unavailable', 'Circuit breaker tripped');
                } else if (newState === 'CLOSED') {
                    updateProviderStatus('openai', 'available');
                }
            } catch (e) {
                // Non-blocking: availability service may not be loaded yet
            }
        });
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
        maxTokens = 16384,
        enableSearch = false,
        reasoningEffort = null,
        mcpTools = []
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
    if (
        resolvedModel.startsWith('gpt-5') ||
        resolvedModel.startsWith('o1') ||
        resolvedModel.startsWith('o3') ||
        resolvedModel.startsWith('o4')
    ) {
        requestParams.max_completion_tokens = tokenLimit;
    } else {
        requestParams.max_tokens = tokenLimit;
    }

    // Add reasoning effort for o-series models
    if (reasoningEffort && modelInfo.reasoning) {
        requestParams.reasoning_effort = reasoningEffort;
    }
    
    // Collect all tools (web search + MCP)
    const allTools = [];

    if (enableSearch && searchService && searchService.isAvailable()) {
        allTools.push({
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
        });
    }

    if (mcpTools.length > 0) {
        allTools.push(...mcpTools);
    }

    if (allTools.length > 0) {
        requestParams.tools = allTools;
        requestParams.tool_choice = 'auto';
    }

    // Callback for MCP tool execution
    const onMcpToolUse = options.onMcpToolUse || null;

    // Use resilience wrapper for API call
    const makeApiCall = async () => {
        let response = await client.chat.completions.create(requestParams);
        let responseMessage = response.choices[0].message;
        let loopCount = 0;
        const MAX_TOOL_LOOPS = 5;

        // Handle tool calls (web search + MCP)
        while (responseMessage.tool_calls && responseMessage.tool_calls.length > 0 && loopCount < MAX_TOOL_LOOPS) {
            loopCount++;
            const toolCall = responseMessage.tool_calls[0];
            const args = JSON.parse(toolCall.function.arguments);
            let toolResultContent;

            if (toolCall.function.name === 'web_search') {
                const searchResults = await searchService.search(args.query);
                toolResultContent = JSON.stringify(searchResults);
            } else if (toolCall.function.name.startsWith('mcp__') && onMcpToolUse) {
                const mcpResult = await onMcpToolUse(toolCall.function.name, args);
                toolResultContent = mcpResult.content;
            } else {
                toolResultContent = JSON.stringify({ error: `Unknown tool: ${toolCall.function.name}` });
            }

            // Continue with tool result
            const continueMessages = [
                ...messages,
                responseMessage,
                {
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: toolResultContent,
                },
            ];

            response = await client.chat.completions.create({
                ...requestParams,
                messages: continueMessages,
            });
            responseMessage = response.choices[0].message;
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
        maxTokens = 16384,
        enableSearch = false,
        mcpTools = []
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
    if (
        resolvedModel.startsWith('gpt-5') ||
        resolvedModel.startsWith('o1') ||
        resolvedModel.startsWith('o3') ||
        resolvedModel.startsWith('o4')
    ) {
        requestParams.max_completion_tokens = tokenLimit;
    } else {
        requestParams.max_tokens = tokenLimit;
    }

    // Collect all tools (web search + MCP)
    const allTools = [];

    if (enableSearch && searchService && searchService.isAvailable()) {
        allTools.push({
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
        });
    }

    if (mcpTools.length > 0) {
        allTools.push(...mcpTools);
    }

    if (allTools.length > 0) {
        requestParams.tools = allTools;
        requestParams.tool_choice = 'auto';
    }
    
    // Callback for MCP tool execution
    const onMcpToolUse = options.onMcpToolUse || null;

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
                if (toolDelta.function?.name && !toolCallBuffer) {
                    toolCallBuffer = {
                        id: toolDelta.id,
                        name: toolDelta.function.name,
                        arguments: ''
                    };
                    if (toolDelta.function.name === 'web_search') {
                        yield { type: 'search_start', query: '' };
                    } else if (toolDelta.function.name.startsWith('mcp__')) {
                        yield { type: 'mcp_tool_start', toolName: toolDelta.function.name };
                    }
                }
                if (toolDelta.function?.arguments && toolCallBuffer) {
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
                    let toolResultContent;

                    if (toolCallBuffer.name === 'web_search') {
                        yield { type: 'search_query', query: args.query };
                        const searchResults = await searchService.search(args.query);
                        yield { type: 'search_complete', results: searchResults };
                        toolResultContent = JSON.stringify(searchResults);
                    } else if (toolCallBuffer.name.startsWith('mcp__') && onMcpToolUse) {
                        const mcpResult = await onMcpToolUse(toolCallBuffer.name, args);
                        yield { type: 'mcp_tool_result', toolName: toolCallBuffer.name, isError: mcpResult.isError };
                        toolResultContent = mcpResult.content;
                    } else {
                        toolResultContent = JSON.stringify({ error: `Unknown tool: ${toolCallBuffer.name}` });
                    }

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
                            content: toolResultContent
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
 * @param {Buffer|File} audioInput - Audio data (Buffer from multer or File-like object)
 * @param {Object} options - { model, language, prompt, filename, mimeType }
 */
async function transcribeAudio(audioInput, options = {}) {
    if (!client) {
        throw new Error('OpenAI client not initialized');
    }

    const {
        model = 'gpt-4o-transcribe',
        language = null,
        prompt = null,
        filename = 'audio.webm',
        mimeType = 'audio/webm'
    } = options;

    try {
        // OpenAI SDK v6 expects a File-like object with name property
        let file = audioInput;
        if (Buffer.isBuffer(audioInput)) {
            file = new File([audioInput], filename, { type: mimeType });
        }

        const requestParams = { file, model };
        if (language) requestParams.language = language;
        if (prompt) requestParams.prompt = prompt;

        const response = await client.audio.transcriptions.create(requestParams);

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
 * Normalize size parameter to model-specific format
 * Handles user-friendly terms like "16:9", "9:16", "square", "landscape", "portrait"
 */
function normalizeImageSize(size, model) {
    const isGptImage = model.startsWith('gpt-image');

    // User-friendly aliases
    const aliases = {
        '16:9': isGptImage ? '1536x1024' : '1792x1024',
        '9:16': isGptImage ? '1024x1536' : '1024x1792',
        'landscape': isGptImage ? '1536x1024' : '1792x1024',
        'portrait': isGptImage ? '1024x1536' : '1024x1792',
        'square': '1024x1024',
        '1:1': '1024x1024',
        'auto': isGptImage ? 'auto' : '1024x1024'
    };

    // Check aliases first
    const lowerSize = size?.toLowerCase();
    if (aliases[lowerSize]) {
        return aliases[lowerSize];
    }

    // Map DALL-E sizes to GPT Image sizes if needed
    if (isGptImage) {
        const gptImageSizeMap = {
            '1792x1024': '1536x1024', // landscape
            '1024x1792': '1024x1536', // portrait
        };
        if (gptImageSizeMap[size]) {
            return gptImageSizeMap[size];
        }
    }

    return size || '1024x1024';
}

/**
 * Generate an image using OpenAI image models
 */
async function generateImage(prompt, options = {}) {
    if (!client) {
        throw new Error('OpenAI client not initialized');
    }

    const {
        model = 'gpt-image-1.5',
        size: rawSize = '1024x1024',
        quality = 'standard',
        style = 'vivid',
        n = 1,
        responseFormat = 'url'
    } = options;

    const modelInfo = IMAGE_MODELS[model];
    if (!modelInfo) {
        throw new Error(`Unknown image model: ${model}. Available: ${Object.keys(IMAGE_MODELS).join(', ')}`);
    }

    // Normalize size (handles aliases and cross-model mapping)
    const size = normalizeImageSize(rawSize, model);

    // Validate size
    if (!modelInfo.sizes.includes(size)) {
        throw new Error(`Invalid size for ${model}: ${size}. Available: ${modelInfo.sizes.join(', ')}`);
    }

    try {
        const requestParams = {
            model,
            prompt,
            size
        };

        // GPT Image models (gpt-image-1.5, etc.) have different API than DALL-E
        const isGptImage = model.startsWith('gpt-image');

        if (isGptImage) {
            // GPT Image models: use 'low', 'medium', 'high', 'auto' for quality
            requestParams.n = 1;
            // Map DALL-E quality values to GPT Image values
            const qualityMap = { 'standard': 'medium', 'hd': 'high' };
            requestParams.quality = qualityMap[quality] || quality || 'auto';
        } else if (model === 'dall-e-3') {
            // DALL-E 3: supports quality, style, response_format
            requestParams.n = 1;
            requestParams.quality = quality;
            requestParams.response_format = responseFormat === 'base64' ? 'b64_json' : 'url';
            if (modelInfo.styles.includes(style)) {
                requestParams.style = style;
            }
        } else {
            // DALL-E 2: supports n, response_format
            requestParams.n = Math.min(n, 10);
            requestParams.response_format = responseFormat === 'base64' ? 'b64_json' : 'url';
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
