/**
 * OpenAI Service - Phase 2 Fixed
 * 
 * All current GPT models including GPT-4.1, o-series reasoning, and audio support
 */

const OpenAI = require('openai');

// Available OpenAI models (November 2025)
const OPENAI_MODELS = {
    // GPT-4.1 Family (Latest standard models)
    'gpt-4.1': {
        name: 'GPT-4.1',
        description: 'Latest GPT model - excels at coding and instruction following',
        maxTokens: 16384,
        contextWindow: 1000000,
        vision: true,
        tier: 'flagship'
    },
    'gpt-4.1-mini': {
        name: 'GPT-4.1 Mini',
        description: 'Fast and affordable - nearly matches GPT-4o quality',
        maxTokens: 16384,
        contextWindow: 1000000,
        vision: true,
        tier: 'efficient'
    },
    'gpt-4.1-nano': {
        name: 'GPT-4.1 Nano',
        description: 'Fastest and cheapest - ideal for classification and autocomplete',
        maxTokens: 16384,
        contextWindow: 1000000,
        vision: false,
        tier: 'fast'
    },
    // GPT-4o Family (Multimodal)
    'gpt-4o': {
        name: 'GPT-4o',
        description: 'Multimodal flagship - text, vision, and audio',
        maxTokens: 16384,
        contextWindow: 128000,
        vision: true,
        tier: 'flagship',
        default: true
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
    'gpt-4o-mini-audio-preview': {
        name: 'GPT-4o Mini Audio',
        description: 'Budget audio model - voice at 1/4 the cost',
        maxTokens: 16384,
        contextWindow: 128000,
        vision: true,
        audio: true,
        tier: 'audio'
    },
    // O-Series Reasoning Models
    'o3': {
        name: 'o3',
        description: 'Most capable reasoning model - complex analysis',
        maxTokens: 100000,
        contextWindow: 200000,
        vision: true,
        reasoning: true,
        tier: 'reasoning'
    },
    'o4-mini': {
        name: 'o4-mini',
        description: 'Fast reasoning - great for math and coding',
        maxTokens: 65536,
        contextWindow: 200000,
        vision: true,
        reasoning: true,
        tier: 'reasoning'
    },
    'o3-mini': {
        name: 'o3-mini',
        description: 'Efficient reasoning for everyday problems',
        maxTokens: 65536,
        contextWindow: 200000,
        vision: false,
        reasoning: true,
        tier: 'reasoning'
    },
    // Legacy but still useful
    'gpt-4-turbo': {
        name: 'GPT-4 Turbo',
        description: 'Previous flagship - still powerful',
        maxTokens: 4096,
        contextWindow: 128000,
        vision: true,
        tier: 'legacy'
    }
};

// Model aliases
const MODEL_ALIASES = {
    'gpt-4.1': 'gpt-4.1',
    'gpt-4.1-mini': 'gpt-4.1-mini',
    'gpt-4.1-nano': 'gpt-4.1-nano',
    'gpt-4o': 'gpt-4o',
    'gpt-4o-mini': 'gpt-4o-mini',
    'gpt-4-turbo': 'gpt-4-turbo',
    'o3': 'o3',
    'o4-mini': 'o4-mini',
    'o3-mini': 'o3-mini',
    // Convenience aliases
    'gpt4': 'gpt-4.1',
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
        console.warn('OpenAI API key not provided');
        return false;
    }
    
    try {
        client = new OpenAI({ apiKey });
        searchService = searchSvc;
        console.log('✓ OpenAI GPT initialized');
        return true;
    } catch (error) {
        console.error('Failed to initialize OpenAI:', error.message);
        return false;
    }
}

/**
 * Resolve model alias to actual model ID
 */
function resolveModel(modelInput) {
    if (!modelInput) return 'gpt-4o';
    
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
    
    return 'gpt-4o';
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
        messages,
        max_tokens: Math.min(maxTokens, modelInfo.maxTokens || 16384)
    };
    
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
    
    try {
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
                        content: JSON.stringify(searchResults)
                    }
                ];
                
                response = await client.chat.completions.create({
                    ...requestParams,
                    messages: continueMessages
                });
                responseMessage = response.choices[0].message;
            }
        }
        
        return {
            content: responseMessage.content || '',
            model: resolvedModel,
            modelName: modelInfo.name || resolvedModel,
            usage: {
                prompt_tokens: response.usage?.prompt_tokens || 0,
                completion_tokens: response.usage?.completion_tokens || 0,
                total_tokens: response.usage?.total_tokens || 0
            },
            finishReason: response.choices[0].finish_reason
        };
    } catch (error) {
        console.error('OpenAI chat error:', error);
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
        max_tokens: Math.min(maxTokens, modelInfo.maxTokens || 16384),
        stream: true
    };
    
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
 * Check if client is initialized
 */
function isAvailable() {
    return client !== null;
}

module.exports = {
    initialize,
    chat,
    streamChat,
    transcribeAudio,
    textToSpeech,
    getModels,
    resolveModel,
    isAvailable,
    OPENAI_MODELS,
    MODEL_ALIASES
};
