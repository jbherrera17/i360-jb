/**
 * Anthropic Claude Service - Phase 2 Fixed
 * 
 * All current Claude models with streaming, vision, and tool use support
 */

const Anthropic = require('@anthropic-ai/sdk');

// Available Claude models (November 2025)
const CLAUDE_MODELS = {
    // Claude 4.5 Family
    'claude-opus-4-5-20251101': {
        name: 'Claude Opus 4.5',
        description: 'Most intelligent model - maximum capability with practical performance',
        maxTokens: 8192,
        contextWindow: 200000,
        vision: true,
        tier: 'opus',
        supportsEffort: true
    },
    'claude-sonnet-4-5-20250929': {
        name: 'Claude Sonnet 4.5',
        description: 'Best for complex agents and coding - highest intelligence',
        maxTokens: 8192,
        contextWindow: 200000,
        vision: true,
        tier: 'sonnet',
        default: true
    },
    'claude-haiku-4-5-20251001': {
        name: 'Claude Haiku 4.5',
        description: 'Fastest model - near-frontier performance at lowest cost',
        maxTokens: 8192,
        contextWindow: 200000,
        vision: true,
        tier: 'haiku'
    },
    // Claude 4.1 Family
    'claude-opus-4-1-20250805': {
        name: 'Claude Opus 4.1',
        description: 'Deep reasoning for complex tasks - catches subtle bugs',
        maxTokens: 8192,
        contextWindow: 200000,
        vision: true,
        tier: 'opus'
    },
    // Claude 4 Family
    'claude-sonnet-4-20250514': {
        name: 'Claude Sonnet 4',
        description: 'Balanced performance and speed - great for general use',
        maxTokens: 8192,
        contextWindow: 200000,
        vision: true,
        tier: 'sonnet'
    },
    'claude-opus-4-20250514': {
        name: 'Claude Opus 4',
        description: 'Powerful reasoning and analysis',
        maxTokens: 8192,
        contextWindow: 200000,
        vision: true,
        tier: 'opus'
    }
};

// Model aliases for convenience
const MODEL_ALIASES = {
    'claude-opus-4.5': 'claude-opus-4-5-20251101',
    'claude-sonnet-4.5': 'claude-sonnet-4-5-20250929',
    'claude-haiku-4.5': 'claude-haiku-4-5-20251001',
    'claude-opus-4.1': 'claude-opus-4-1-20250805',
    'claude-sonnet-4': 'claude-sonnet-4-20250514',
    'claude-opus-4': 'claude-opus-4-20250514',
    // Default aliases
    'claude-opus': 'claude-opus-4-5-20251101',
    'claude-sonnet': 'claude-sonnet-4-5-20250929',
    'claude-haiku': 'claude-haiku-4-5-20251001'
};

let client = null;
let searchService = null;

/**
 * Initialize the Anthropic client
 */
function initialize(apiKey, searchSvc = null) {
    if (!apiKey) {
        console.warn('Anthropic API key not provided');
        return false;
    }
    
    try {
        client = new Anthropic({ apiKey });
        searchService = searchSvc;
        console.log('✓ Anthropic Claude initialized');
        return true;
    } catch (error) {
        console.error('Failed to initialize Anthropic:', error.message);
        return false;
    }
}

/**
 * Resolve model alias to actual model ID
 */
function resolveModel(modelInput) {
    if (!modelInput) return 'claude-sonnet-4-5-20250929';
    
    const normalized = modelInput.toLowerCase();
    
    // Check aliases first
    if (MODEL_ALIASES[normalized]) {
        return MODEL_ALIASES[normalized];
    }
    
    // Check if it's already a valid model ID
    if (CLAUDE_MODELS[modelInput]) {
        return modelInput;
    }
    
    // Fuzzy match - find model containing the input
    for (const [id, info] of Object.entries(CLAUDE_MODELS)) {
        if (id.includes(normalized) || info.name.toLowerCase().includes(normalized)) {
            return id;
        }
    }
    
    // Default to Sonnet 4.5
    return 'claude-sonnet-4-5-20250929';
}

/**
 * Build messages array with vision support
 */
function buildMessages(message, history = [], images = []) {
    const messages = [];
    
    // Add conversation history
    for (const msg of history) {
        messages.push({
            role: msg.role,
            content: msg.content
        });
    }
    
    // Build current message content
    const content = [];
    
    // Add images if provided
    if (images && images.length > 0) {
        for (const img of images) {
            content.push({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: img.mediaType || 'image/jpeg',
                    data: img.data
                }
            });
        }
    }
    
    // Add text content
    content.push({
        type: 'text',
        text: message
    });
    
    messages.push({
        role: 'user',
        content: images && images.length > 0 ? content : message
    });
    
    return messages;
}

/**
 * Send a chat message and get a response
 */
async function chat(options) {
    if (!client) {
        throw new Error('Anthropic client not initialized');
    }
    
    const {
        message,
        model = 'claude-sonnet-4-5-20250929',
        systemPrompt,
        history = [],
        images = [],
        maxTokens = 4096,
        enableSearch = false,
        effort = null
    } = options;
    
    const resolvedModel = resolveModel(model);
    const modelInfo = CLAUDE_MODELS[resolvedModel] || {};
    
    const messages = buildMessages(message, history, images);
    
    const requestParams = {
        model: resolvedModel,
        max_tokens: Math.min(maxTokens, modelInfo.maxTokens || 8192),
        messages
    };
    
    // Add system prompt if provided
    if (systemPrompt) {
        requestParams.system = systemPrompt;
    }
    
    // Add effort parameter for Opus 4.5
    if (effort && modelInfo.supportsEffort) {
        requestParams.metadata = { effort };
    }
    
    // Add web search tool if enabled and available
    if (enableSearch && searchService && searchService.isAvailable()) {
        requestParams.tools = [{
            name: 'web_search',
            description: 'Search the web for current information. Use when asked about recent events, news, or real-time data.',
            input_schema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'The search query'
                    }
                },
                required: ['query']
            }
        }];
    }
    
    try {
        let response = await client.messages.create(requestParams);
        
        // Handle tool use (web search)
        if (response.stop_reason === 'tool_use') {
            const toolUse = response.content.find(c => c.type === 'tool_use');
            
            if (toolUse && toolUse.name === 'web_search') {
                const searchResults = await searchService.search(toolUse.input.query);
                
                // Continue conversation with search results
                const toolResultMessages = [
                    ...messages,
                    { role: 'assistant', content: response.content },
                    {
                        role: 'user',
                        content: [{
                            type: 'tool_result',
                            tool_use_id: toolUse.id,
                            content: JSON.stringify(searchResults)
                        }]
                    }
                ];
                
                response = await client.messages.create({
                    ...requestParams,
                    messages: toolResultMessages
                });
            }
        }
        
        // Extract text content
        const textContent = response.content
            .filter(c => c.type === 'text')
            .map(c => c.text)
            .join('');
        
        return {
            content: textContent,
            model: resolvedModel,
            modelName: modelInfo.name || resolvedModel,
            usage: {
                input_tokens: response.usage?.input_tokens || 0,
                output_tokens: response.usage?.output_tokens || 0
            },
            stopReason: response.stop_reason
        };
    } catch (error) {
        console.error('Anthropic chat error:', error);
        throw new Error(`Claude API error: ${error.message}`);
    }
}

/**
 * Stream a chat response
 */
async function* streamChat(options) {
    if (!client) {
        throw new Error('Anthropic client not initialized');
    }
    
    const {
        message,
        model = 'claude-sonnet-4-5-20250929',
        systemPrompt,
        history = [],
        images = [],
        maxTokens = 4096,
        enableSearch = false
    } = options;
    
    const resolvedModel = resolveModel(model);
    const modelInfo = CLAUDE_MODELS[resolvedModel] || {};
    
    const messages = buildMessages(message, history, images);
    
    const requestParams = {
        model: resolvedModel,
        max_tokens: Math.min(maxTokens, modelInfo.maxTokens || 8192),
        messages,
        stream: true
    };
    
    if (systemPrompt) {
        requestParams.system = systemPrompt;
    }
    
    // Add web search tool if enabled
    if (enableSearch && searchService && searchService.isAvailable()) {
        requestParams.tools = [{
            name: 'web_search',
            description: 'Search the web for current information.',
            input_schema: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'The search query' }
                },
                required: ['query']
            }
        }];
    }
    
    try {
        const stream = await client.messages.stream(requestParams);
        
        let toolUseBuffer = null;
        let inputTokens = 0;
        let outputTokens = 0;
        
        for await (const event of stream) {
            if (event.type === 'content_block_start') {
                if (event.content_block.type === 'tool_use') {
                    toolUseBuffer = {
                        id: event.content_block.id,
                        name: event.content_block.name,
                        input: ''
                    };
                    yield { type: 'search_start', query: '' };
                }
            } else if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') {
                    yield { type: 'text', content: event.delta.text };
                } else if (event.delta.type === 'input_json_delta' && toolUseBuffer) {
                    toolUseBuffer.input += event.delta.partial_json;
                }
            } else if (event.type === 'content_block_stop' && toolUseBuffer) {
                // Execute tool
                try {
                    const input = JSON.parse(toolUseBuffer.input);
                    yield { type: 'search_query', query: input.query };
                    
                    const searchResults = await searchService.search(input.query);
                    yield { type: 'search_complete', results: searchResults };
                    
                    // Continue with tool result
                    const continueParams = {
                        ...requestParams,
                        stream: true,
                        messages: [
                            ...messages,
                            {
                                role: 'assistant',
                                content: [{
                                    type: 'tool_use',
                                    id: toolUseBuffer.id,
                                    name: toolUseBuffer.name,
                                    input
                                }]
                            },
                            {
                                role: 'user',
                                content: [{
                                    type: 'tool_result',
                                    tool_use_id: toolUseBuffer.id,
                                    content: JSON.stringify(searchResults)
                                }]
                            }
                        ]
                    };
                    
                    const continueStream = await client.messages.stream(continueParams);
                    
                    for await (const continueEvent of continueStream) {
                        if (continueEvent.type === 'content_block_delta' && 
                            continueEvent.delta.type === 'text_delta') {
                            yield { type: 'text', content: continueEvent.delta.text };
                        } else if (continueEvent.type === 'message_delta') {
                            outputTokens += continueEvent.usage?.output_tokens || 0;
                        }
                    }
                } catch (e) {
                    console.error('Tool execution error:', e);
                }
                toolUseBuffer = null;
            } else if (event.type === 'message_start') {
                inputTokens = event.message.usage?.input_tokens || 0;
            } else if (event.type === 'message_delta') {
                outputTokens += event.usage?.output_tokens || 0;
            }
        }
        
        yield {
            type: 'done',
            model: resolvedModel,
            modelName: modelInfo.name || resolvedModel,
            usage: { input_tokens: inputTokens, output_tokens: outputTokens }
        };
    } catch (error) {
        console.error('Anthropic stream error:', error);
        yield { type: 'error', error: error.message };
    }
}

/**
 * Get available models
 */
function getModels() {
    return Object.entries(CLAUDE_MODELS).map(([id, info]) => ({
        id,
        ...info,
        provider: 'anthropic'
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
    getModels,
    resolveModel,
    isAvailable,
    CLAUDE_MODELS,
    MODEL_ALIASES
};
