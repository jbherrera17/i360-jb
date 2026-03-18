/**
 * Anthropic Claude Service - Phase 16 Enhanced
 *
 * All current Claude models with streaming, vision, and tool use support
 * Includes reliability features: retry, circuit breaker, timeout
 */

const Anthropic = require('@anthropic-ai/sdk');
const { withResilience, getCircuitBreaker } = require('./reliability');
const logger = require('./logger');

// Circuit breaker configuration for Anthropic API
const ANTHROPIC_CIRCUIT_CONFIG = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute before attempting recovery
    volumeThreshold: 3,
    errorPercentageThreshold: 50,
};

// Retry configuration for Anthropic API
const ANTHROPIC_RETRY_CONFIG = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
};

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
        logger.warn('Anthropic API key not provided');
        return false;
    }

    try {
        client = new Anthropic({ apiKey });
        searchService = searchSvc;
        // Initialize circuit breaker with health monitoring bridge
        const cb = getCircuitBreaker('anthropic', ANTHROPIC_CIRCUIT_CONFIG);
        cb.onStateChange((oldState, newState) => {
            try {
                const { updateProviderStatus } = require('./modelAvailabilityService');
                if (newState === 'OPEN') {
                    updateProviderStatus('anthropic', 'unavailable', 'Circuit breaker tripped');
                } else if (newState === 'CLOSED') {
                    updateProviderStatus('anthropic', 'available');
                }
            } catch (e) {
                // Non-blocking: availability service may not be loaded yet
            }
        });
        logger.info('Anthropic Claude initialized with reliability features');
        return true;
    } catch (error) {
        logger.error('Failed to initialize Anthropic', { error: error.message });
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
 * Build messages array with vision and document support
 * Supports images (png, jpg, gif, webp) and PDFs
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

    // Add images/documents if provided
    if (images && images.length > 0) {
        for (const item of images) {
            const mediaType = item.mediaType || 'image/jpeg';

            // Check if it's a PDF document
            if (mediaType === 'application/pdf') {
                content.push({
                    type: 'document',
                    source: {
                        type: 'base64',
                        media_type: 'application/pdf',
                        data: item.data
                    }
                });
            } else {
                // It's an image
                content.push({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: mediaType,
                        data: item.data
                    }
                });
            }
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
        maxTokens = 8192,
        enableSearch = false,
        effort = null,
        mcpTools = []
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

    // Collect all tools (web search + MCP)
    const allTools = [];

    // Add web search tool if enabled and available
    if (enableSearch && searchService && searchService.isAvailable()) {
        allTools.push({
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
        });
    }

    // Add MCP tools
    if (mcpTools.length > 0) {
        allTools.push(...mcpTools);
    }

    if (allTools.length > 0) {
        requestParams.tools = allTools;
    }
    
    // Callback for MCP tool execution (injected from chat route)
    const onMcpToolUse = options.onMcpToolUse || null;

    // Use resilience wrapper for API call
    const makeApiCall = async () => {
        let response = await client.messages.create(requestParams);
        let loopCount = 0;
        const MAX_TOOL_LOOPS = 5;

        // Handle tool use loop (web search + MCP tools)
        while (response.stop_reason === 'tool_use' && loopCount < MAX_TOOL_LOOPS) {
            loopCount++;
            const toolUse = response.content.find((c) => c.type === 'tool_use');
            if (!toolUse) break;

            let toolResultContent;

            if (toolUse.name === 'web_search') {
                const searchResults = await searchService.search(toolUse.input.query);
                toolResultContent = JSON.stringify(searchResults);
            } else if (toolUse.name.startsWith('mcp__') && onMcpToolUse) {
                const mcpResult = await onMcpToolUse(toolUse.name, toolUse.input);
                toolResultContent = mcpResult.content;
            } else {
                toolResultContent = JSON.stringify({ error: `Unknown tool: ${toolUse.name}` });
            }

            // Continue conversation with tool result
            const toolResultMessages = [
                ...messages,
                { role: 'assistant', content: response.content },
                {
                    role: 'user',
                    content: [{
                        type: 'tool_result',
                        tool_use_id: toolUse.id,
                        content: toolResultContent,
                    }],
                },
            ];

            response = await client.messages.create({
                ...requestParams,
                messages: toolResultMessages,
            });
        }

        return response;
    };

    try {
        const response = await withResilience(makeApiCall, {
            operationName: 'anthropic-chat',
            timeout: 120000, // 2 minutes for complex requests
            circuitBreaker: 'anthropic',
            circuitBreakerOptions: ANTHROPIC_CIRCUIT_CONFIG,
            retryOptions: ANTHROPIC_RETRY_CONFIG,
        });

        // Extract text content
        const textContent = response.content
            .filter((c) => c.type === 'text')
            .map((c) => c.text)
            .join('');

        return {
            content: textContent,
            model: resolvedModel,
            modelName: modelInfo.name || resolvedModel,
            usage: {
                input_tokens: response.usage?.input_tokens || 0,
                output_tokens: response.usage?.output_tokens || 0,
            },
            stopReason: response.stop_reason,
        };
    } catch (error) {
        logger.error('Anthropic chat error', {
            error: error.message,
            code: error.code,
            model: resolvedModel,
        });

        // Provide user-friendly error messages
        if (error.code === 'CIRCUIT_OPEN') {
            throw new Error(
                'Claude API is temporarily unavailable. Please try again in a few minutes.'
            );
        }
        if (error.code === 'ETIMEDOUT') {
            throw new Error('Request to Claude API timed out. Please try again.');
        }

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
        maxTokens = 8192,
        enableSearch = false,
        mcpTools = []
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

    // Collect all tools (web search + MCP)
    const allTools = [];

    if (enableSearch && searchService && searchService.isAvailable()) {
        allTools.push({
            name: 'web_search',
            description: 'Search the web for current information.',
            input_schema: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'The search query' }
                },
                required: ['query']
            }
        });
    }

    if (mcpTools.length > 0) {
        allTools.push(...mcpTools);
    }

    if (allTools.length > 0) {
        requestParams.tools = allTools;
    }

    // Callback for MCP tool execution
    const onMcpToolUse = options.onMcpToolUse || null;
    
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
                    if (event.content_block.name === 'web_search') {
                        yield { type: 'search_start', query: '' };
                    } else if (event.content_block.name.startsWith('mcp__')) {
                        yield { type: 'mcp_tool_start', toolName: event.content_block.name };
                    }
                }
            } else if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') {
                    yield { type: 'text', content: event.delta.text };
                } else if (event.delta.type === 'input_json_delta' && toolUseBuffer) {
                    toolUseBuffer.input += event.delta.partial_json;
                }
            } else if (event.type === 'content_block_stop' && toolUseBuffer) {
                // Execute tool (web search or MCP)
                try {
                    const input = JSON.parse(toolUseBuffer.input);
                    let toolResultContent;

                    if (toolUseBuffer.name === 'web_search') {
                        yield { type: 'search_query', query: input.query };
                        const searchResults = await searchService.search(input.query);
                        yield { type: 'search_complete', results: searchResults };
                        toolResultContent = JSON.stringify(searchResults);
                    } else if (toolUseBuffer.name.startsWith('mcp__') && onMcpToolUse) {
                        const mcpResult = await onMcpToolUse(toolUseBuffer.name, input);
                        yield { type: 'mcp_tool_result', toolName: toolUseBuffer.name, isError: mcpResult.isError };
                        toolResultContent = mcpResult.content;
                    } else {
                        toolResultContent = JSON.stringify({ error: `Unknown tool: ${toolUseBuffer.name}` });
                    }

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
                                    content: toolResultContent
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
                    logger.error('Tool execution error', { error: e.message });
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
        logger.error('Anthropic stream error', { error: error.message });
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

/**
 * Get circuit breaker status for Anthropic API
 */
function getCircuitStatus() {
    const cb = getCircuitBreaker('anthropic');
    return cb.getStatus();
}

/**
 * Reset the circuit breaker (for admin use)
 */
function resetCircuit() {
    const cb = getCircuitBreaker('anthropic');
    cb.reset();
}

module.exports = {
    initialize,
    chat,
    streamChat,
    getModels,
    resolveModel,
    isAvailable,
    getCircuitStatus,
    resetCircuit,
    CLAUDE_MODELS,
    MODEL_ALIASES,
};
