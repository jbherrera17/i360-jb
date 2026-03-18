/**
 * INSIGHT 360 - Agent Service
 * Version: 2.4.0
 * 
 * Handles agent execution with context injection and LLM provider integration.
 * Supports both synchronous and streaming responses.
 */

const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { randomUUID: uuidv4 } = require('crypto');
const { assembleContext, estimateTokens } = require('./contextInjection');
const mindstudioService = require('./mindstudioService');
const gemini = require('./gemini');
const guardrailEnforcement = require('./guardrailEnforcementService');
const llmRegistry = require('./llmRegistry');
const { resolveModelWithFallback } = require('./fallbackService');
const mcpConnectionService = require('./mcpConnectionService');
const mcpToolBridge = require('./mcpToolBridge');
const { runAnthropicToolLoop, streamAnthropicToolLoop } = require('./agentToolLoop');

// Initialize clients
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Perplexity uses OpenAI-compatible API
const perplexity = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: 'https://api.perplexity.ai'
});

// Initialize Gemini (with error handling to prevent server crashes)
if (process.env.GOOGLE_API_KEY) {
    try {
        gemini.initialize(process.env.GOOGLE_API_KEY);
    } catch (error) {
        console.error('⚠️  Gemini initialization failed in agentService:', error.message);
        console.error('   Gemini models will be unavailable for agent execution');
    }
}

// Valid Claude model mappings for legacy model names
const CLAUDE_MODEL_ALIASES = {
    // Legacy Claude 3.x models
    'claude-3-5-sonnet-20241022': 'claude-sonnet-4-20250514',
    'claude-3-5-sonnet': 'claude-sonnet-4-20250514',
    'claude-3-opus': 'claude-opus-4-20250514',
    'claude-3-sonnet': 'claude-sonnet-4-20250514',
    'claude-3-haiku': 'claude-haiku-4-5-20251001',
    // Short aliases (matching anthropic.js)
    'claude-opus-4.5': 'claude-opus-4-5-20251101',
    'claude-sonnet-4.5': 'claude-sonnet-4-5-20250929',
    'claude-haiku-4.5': 'claude-haiku-4-5-20251001',
    'claude-opus-4.1': 'claude-opus-4-1-20250805',
    'claude-sonnet-4': 'claude-sonnet-4-20250514',
    'claude-opus-4': 'claude-opus-4-20250514',
    'claude-haiku-4': 'claude-haiku-4-5-20251001',
    // Default convenience aliases
    'claude-opus': 'claude-opus-4-5-20251101',
    'claude-sonnet': 'claude-sonnet-4-5-20250929',
    'claude-haiku': 'claude-haiku-4-5-20251001'
};

const DEFAULT_CLAUDE_MODEL = llmRegistry.getDefaultModel('anthropic');

// All valid current Claude models
const VALID_CLAUDE_MODELS = Object.keys(llmRegistry.ANTHROPIC_MODELS);

/**
 * Resolve model name to a valid API model ID
 * @param {string} modelInput - Model name from agent config
 * @returns {string} - Valid model ID for API call
 */
function resolveModel(modelInput) {
    if (!modelInput) return DEFAULT_CLAUDE_MODEL;

    // Check if it's already a valid current model
    if (VALID_CLAUDE_MODELS.includes(modelInput)) {
        return modelInput;
    }

    // Check aliases for legacy model names
    if (CLAUDE_MODEL_ALIASES[modelInput]) {
        console.log(`Model alias resolved: ${modelInput} -> ${CLAUDE_MODEL_ALIASES[modelInput]}`);
        return CLAUDE_MODEL_ALIASES[modelInput];
    }

    // If model starts with claude but not recognized, use default
    if (modelInput.startsWith('claude')) {
        console.warn(`Unknown Claude model: ${modelInput}, using default: ${DEFAULT_CLAUDE_MODEL}`);
        return DEFAULT_CLAUDE_MODEL;
    }

    // For non-Claude models, return as-is (OpenAI, etc.)
    return modelInput;
}

/**
 * Get agent configuration by ID
 * @param {string} agentId - Agent UUID
 * @returns {object} - Agent configuration
 */
async function getAgent(agentId) {
    const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();
    
    if (error) throw error;
    if (!data) throw new Error('Agent not found');
    
    return data;
}

/**
 * Build the system prompt with injected context
 * @param {object} agent - Agent configuration
 * @param {string} context - Assembled context
 * @returns {string} - Complete system prompt
 */
function buildSystemPrompt(agent, context) {
    let prompt = agent.system_prompt || '';
    
    if (context) {
        prompt += '\n\n---\n\n# Context Information\n\n';
        prompt += 'Use the following context to inform your responses:\n\n';
        prompt += context;
    }
    
    return prompt;
}

/**
 * Build messages array for LLM call
 * @param {string} userMessage - Current user message
 * @param {array} conversationHistory - Previous messages
 * @returns {array} - Messages array
 */
function buildMessages(userMessage, conversationHistory = []) {
    const messages = [];
    
    // Add conversation history
    conversationHistory.forEach(msg => {
        messages.push({
            role: msg.role,
            content: msg.content
        });
    });
    
    // Add current message
    messages.push({
        role: 'user',
        content: userMessage
    });
    
    return messages;
}

/**
 * Fetch MCP tools for an agent's org and prepare them for LLM injection.
 * Returns { tools, connectionMap } or empty if no MCP tools available.
 */
async function getMcpToolsForAgent(agent) {
    if (!agent.org_id) return { tools: [], connectionMap: new Map() };
    try {
        const mcpTools = await mcpConnectionService.getOrgMcpTools(supabase, agent.org_id);
        if (!mcpTools.length) return { tools: [], connectionMap: new Map() };

        const connectionMap = new Map();
        const anthropicTools = [];

        for (const t of mcpTools) {
            connectionMap.set(t.connectionId, true);
            anthropicTools.push(mcpToolBridge.toAnthropicTool(t.connectionId, t.tool));
        }

        return { tools: anthropicTools, connectionMap };
    } catch (e) {
        console.warn('[MCP] Failed to load tools for agent:', e.message);
        return { tools: [], connectionMap: new Map() };
    }
}

/**
 * Execute agent with Anthropic Claude
 * @param {object} agent - Agent configuration
 * @param {string} systemPrompt - Complete system prompt
 * @param {array} messages - Conversation messages
 * @returns {object} - Response with metadata
 */
async function executeWithAnthropic(agent, systemPrompt, messages) {
    const startTime = Date.now();
    const resolvedModel = resolveModel(agent.llm_model);

    // Check for MCP tools
    const { tools: mcpTools, connectionMap } = await getMcpToolsForAgent(agent);

    if (mcpTools.length > 0) {
        // Use tool loop when MCP tools are available
        const result = await runAnthropicToolLoop(anthropic, {
            model: resolvedModel,
            max_tokens: agent.max_tokens || 4096,
            temperature: agent.temperature || 0.7,
            system: systemPrompt,
            messages,
            tools: mcpTools
        }, {
            supabase,
            orgId: agent.org_id,
            connectionMap
        });

        return {
            content: result.content,
            model: agent.llm_model,
            provider: 'anthropic',
            usage: result.usage,
            duration_ms: result.duration_ms,
            stop_reason: result.stop_reason,
            mcp_tool_calls: result.toolCallCount
        };
    }

    // Standard single-call path (no tools)
    const response = await anthropic.messages.create({
        model: resolvedModel,
        max_tokens: agent.max_tokens || 4096,
        temperature: agent.temperature || 0.7,
        system: systemPrompt,
        messages: messages
    });

    const duration = Date.now() - startTime;

    return {
        content: response.content[0].text,
        model: agent.llm_model,
        provider: 'anthropic',
        usage: {
            prompt_tokens: response.usage.input_tokens,
            completion_tokens: response.usage.output_tokens,
            total_tokens: response.usage.input_tokens + response.usage.output_tokens
        },
        duration_ms: duration,
        stop_reason: response.stop_reason
    };
}

/**
 * Execute agent with OpenAI GPT
 * @param {object} agent - Agent configuration
 * @param {string} systemPrompt - Complete system prompt
 * @param {array} messages - Conversation messages
 * @returns {object} - Response with metadata
 */
async function executeWithOpenAI(agent, systemPrompt, messages) {
    const startTime = Date.now();
    
    // Prepend system message
    const fullMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
    ];
    
    const response = await openai.chat.completions.create({
        model: agent.llm_model,
        max_tokens: agent.max_tokens || 4096,
        temperature: agent.temperature || 0.7,
        messages: fullMessages
    });
    
    const duration = Date.now() - startTime;
    
    return {
        content: response.choices[0].message.content,
        model: agent.llm_model,
        provider: 'openai',
        usage: {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens
        },
        duration_ms: duration,
        stop_reason: response.choices[0].finish_reason
    };
}

/**
 * Execute agent with Perplexity
 * @param {object} agent - Agent configuration
 * @param {string} systemPrompt - Complete system prompt
 * @param {array} messages - Conversation messages
 * @returns {object} - Response with metadata
 */
async function executeWithPerplexity(agent, systemPrompt, messages) {
    const startTime = Date.now();

    // Prepend system message
    const fullMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
    ];

    // Default to sonar model if not specified or invalid
    const model = agent.llm_model && agent.llm_model.startsWith('sonar')
        ? agent.llm_model
        : 'sonar';

    const response = await perplexity.chat.completions.create({
        model: model,
        max_tokens: agent.max_tokens || 4096,
        temperature: agent.temperature || 0.7,
        messages: fullMessages
    });

    const duration = Date.now() - startTime;

    return {
        content: response.choices[0].message.content,
        model: model,
        provider: 'perplexity',
        usage: {
            prompt_tokens: response.usage?.prompt_tokens || 0,
            completion_tokens: response.usage?.completion_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0
        },
        duration_ms: duration,
        stop_reason: response.choices[0].finish_reason
    };
}

/**
 * Execute agent with Google Gemini
 * @param {object} agent - Agent configuration
 * @param {string} systemPrompt - Complete system prompt
 * @param {array} messages - Conversation messages
 * @returns {object} - Response with metadata
 */
async function executeWithGemini(agent, systemPrompt, messages) {
    const startTime = Date.now();

    // Convert messages to history format for Gemini
    const history = messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        content: msg.content
    }));

    const userMessage = messages[messages.length - 1]?.content || '';

    const response = await gemini.chat({
        message: userMessage,
        model: agent.llm_model,
        systemPrompt: systemPrompt,
        history: history,
        maxTokens: agent.max_tokens || 8192,
        temperature: agent.temperature || 0.7
    });

    const duration = Date.now() - startTime;

    return {
        content: response.content,
        model: response.model || agent.llm_model,
        provider: 'google',
        usage: {
            prompt_tokens: response.usage?.promptTokens || 0,
            completion_tokens: response.usage?.completionTokens || 0,
            total_tokens: response.usage?.totalTokens || 0
        },
        duration_ms: duration,
        stop_reason: response.finishReason || 'stop'
    };
}

/**
 * Stream agent response with Anthropic Claude
 * @param {object} agent - Agent configuration
 * @param {string} systemPrompt - Complete system prompt
 * @param {array} messages - Conversation messages
 * @param {function} onToken - Callback for each token
 * @returns {object} - Final response metadata
 */
async function streamWithAnthropic(agent, systemPrompt, messages, onToken) {
    const startTime = Date.now();
    const resolvedModel = resolveModel(agent.llm_model);

    // Check for MCP tools
    const { tools: mcpTools, connectionMap } = await getMcpToolsForAgent(agent);

    if (mcpTools.length > 0) {
        // Use streaming tool loop when MCP tools are available
        const result = await streamAnthropicToolLoop(anthropic, {
            model: resolvedModel,
            max_tokens: agent.max_tokens || 4096,
            temperature: agent.temperature || 0.7,
            system: systemPrompt,
            messages,
            tools: mcpTools
        }, onToken, {
            supabase,
            orgId: agent.org_id,
            connectionMap
        });

        return {
            content: result.content,
            model: agent.llm_model,
            provider: 'anthropic',
            usage: result.usage,
            duration_ms: result.duration_ms,
            mcp_tool_calls: result.toolCallCount
        };
    }

    // Standard streaming path (no tools)
    let fullContent = '';
    let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    const stream = await anthropic.messages.stream({
        model: resolvedModel,
        max_tokens: agent.max_tokens || 4096,
        temperature: agent.temperature || 0.7,
        system: systemPrompt,
        messages: messages
    });

    for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text;
            fullContent += text;
            onToken(text);
        }
        if (event.type === 'message_delta' && event.usage) {
            usage.completion_tokens = event.usage.output_tokens;
        }
        if (event.type === 'message_start' && event.message.usage) {
            usage.prompt_tokens = event.message.usage.input_tokens;
        }
    }

    const duration = Date.now() - startTime;
    usage.total_tokens = usage.prompt_tokens + usage.completion_tokens;

    return {
        content: fullContent,
        model: agent.llm_model,
        provider: 'anthropic',
        usage,
        duration_ms: duration
    };
}

/**
 * Stream agent response with OpenAI GPT
 * @param {object} agent - Agent configuration
 * @param {string} systemPrompt - Complete system prompt
 * @param {array} messages - Conversation messages
 * @param {function} onToken - Callback for each token
 * @returns {object} - Final response metadata
 */
async function streamWithOpenAI(agent, systemPrompt, messages, onToken) {
    const startTime = Date.now();
    let fullContent = '';
    
    const fullMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
    ];
    
    const stream = await openai.chat.completions.create({
        model: agent.llm_model,
        max_tokens: agent.max_tokens || 4096,
        temperature: agent.temperature || 0.7,
        messages: fullMessages,
        stream: true
    });
    
    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
            fullContent += content;
            onToken(content);
        }
    }
    
    const duration = Date.now() - startTime;
    
    // Estimate tokens for streaming (OpenAI doesn't provide usage in streams)
    const estimatedPromptTokens = estimateTokens(systemPrompt + messages.map(m => m.content).join(' '));
    const estimatedCompletionTokens = estimateTokens(fullContent);
    
    return {
        content: fullContent,
        model: agent.llm_model,
        provider: 'openai',
        usage: {
            prompt_tokens: estimatedPromptTokens,
            completion_tokens: estimatedCompletionTokens,
            total_tokens: estimatedPromptTokens + estimatedCompletionTokens
        },
        duration_ms: duration
    };
}

/**
 * Stream agent response with Perplexity
 * @param {object} agent - Agent configuration
 * @param {string} systemPrompt - Complete system prompt
 * @param {array} messages - Conversation messages
 * @param {function} onToken - Callback for each token
 * @returns {object} - Final response metadata
 */
async function streamWithPerplexity(agent, systemPrompt, messages, onToken) {
    const startTime = Date.now();
    let fullContent = '';

    const fullMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
    ];

    // Default to sonar model if not specified or invalid
    const model = agent.llm_model && agent.llm_model.startsWith('sonar')
        ? agent.llm_model
        : 'sonar';

    const stream = await perplexity.chat.completions.create({
        model: model,
        max_tokens: agent.max_tokens || 4096,
        temperature: agent.temperature || 0.7,
        messages: fullMessages,
        stream: true
    });

    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
            fullContent += content;
            onToken(content);
        }
    }

    const duration = Date.now() - startTime;

    // Estimate tokens for streaming
    const estimatedPromptTokens = estimateTokens(systemPrompt + messages.map(m => m.content).join(' '));
    const estimatedCompletionTokens = estimateTokens(fullContent);

    return {
        content: fullContent,
        model: model,
        provider: 'perplexity',
        usage: {
            prompt_tokens: estimatedPromptTokens,
            completion_tokens: estimatedCompletionTokens,
            total_tokens: estimatedPromptTokens + estimatedCompletionTokens
        },
        duration_ms: duration
    };
}

/**
 * Stream agent response with Google Gemini
 * @param {object} agent - Agent configuration
 * @param {string} systemPrompt - Complete system prompt
 * @param {array} messages - Conversation messages
 * @param {function} onToken - Callback for each token
 * @returns {object} - Final response metadata
 */
async function streamWithGemini(agent, systemPrompt, messages, onToken) {
    const startTime = Date.now();
    let fullContent = '';
    let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    // Convert messages to history format for Gemini
    const history = messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        content: msg.content
    }));

    const userMessage = messages[messages.length - 1]?.content || '';

    const stream = gemini.streamChat({
        message: userMessage,
        model: agent.llm_model,
        systemPrompt: systemPrompt,
        history: history,
        maxTokens: agent.max_tokens || 8192,
        temperature: agent.temperature || 0.7
    });

    for await (const chunk of stream) {
        if (chunk.type === 'text' && chunk.content) {
            fullContent += chunk.content;
            onToken(chunk.content);
        }
        if (chunk.type === 'done' && chunk.usage) {
            usage.prompt_tokens = chunk.usage.promptTokens || 0;
            usage.completion_tokens = chunk.usage.completionTokens || 0;
            usage.total_tokens = chunk.usage.totalTokens || 0;
        }
        if (chunk.type === 'error') {
            throw new Error(chunk.error);
        }
    }

    const duration = Date.now() - startTime;

    // If no usage from stream, estimate
    if (usage.total_tokens === 0) {
        usage.prompt_tokens = estimateTokens(systemPrompt + messages.map(m => m.content).join(' '));
        usage.completion_tokens = estimateTokens(fullContent);
        usage.total_tokens = usage.prompt_tokens + usage.completion_tokens;
    }

    return {
        content: fullContent,
        model: agent.llm_model,
        provider: 'google',
        usage,
        duration_ms: duration
    };
}

/**
 * Log execution to database
 * @param {string} agentId - Agent UUID
 * @param {string} userId - User UUID
 * @param {object} input - Input details
 * @param {object} result - Execution result
 */
async function logExecution(agentId, userId, input, result) {
    const executionData = {
        id: uuidv4(),
        agent_id: agentId,
        user_id: userId,
        user_message: input.userMessage,
        conversation_history: input.conversationHistory || [],
        context_injected: input.contextDetails || [],
        response: result.content,
        llm_provider: result.provider,
        llm_model: result.model,
        // Model tracking fields
        agent_model: input.agentModel || result.model,
        runtime_model: input.runtimeModel || result.model,
        model_overridden: input.modelOverridden || false,
        session_id: input.sessionId || null,
        temperature: input.temperature,
        prompt_tokens: result.usage?.prompt_tokens,
        completion_tokens: result.usage?.completion_tokens,
        total_tokens: result.usage?.total_tokens,
        duration_ms: result.duration_ms,
        status: result.error ? 'error' : 'success',
        error_message: result.error?.message,
        completed_at: new Date().toISOString()
    };

    try {
        await supabase
            .from('agent_executions')
            .insert(executionData);
    } catch (error) {
        console.error('Failed to log execution:', error);
    }

    return executionData.id;
}

/**
 * Execute an agent with a user message
 * @param {string} agentId - Agent UUID
 * @param {object} options - Execution options
 * @returns {object} - Execution result
 */
async function executeAgent(agentId, options = {}) {
    const {
        userMessage,
        conversationHistory = [],
        userId = null,
        includeOnDemand = [],
        modelOverride = null  // Phase 76b: { provider, model } — overrides agent's configured LLM
    } = options;

    try {
        // Get agent configuration
        const agent = await getAgent(agentId);

        if (!agent.is_active) {
            throw new Error('Agent is not active');
        }

        // Phase 76b: Apply model override if provided (validated against registry)
        if (modelOverride?.provider && modelOverride?.model) {
            const llmRegistry = require('./llmRegistry');
            const validModel = llmRegistry.getModel(modelOverride.model);
            if (validModel) {
                agent.llm_provider = modelOverride.provider;
                agent.llm_model = modelOverride.model;
                console.log(`[Agent] Model override applied: ${modelOverride.provider}/${modelOverride.model}`);
            } else {
                console.warn(`[Agent] Invalid model override: ${modelOverride.model} — using agent default`);
            }
        }

        // ── Guardrail Enforcement: Pre-screen ──
        const screenResult = await guardrailEnforcement.screenMessage(userMessage, agent.org_id, {
            agentId,
            userId
        });

        if (screenResult.blocked) {
            // Return standard response immediately — no LLM call
            const executionId = await logExecution(agentId, userId, {
                userMessage,
                conversationHistory,
                temperature: agent.temperature
            }, {
                content: screenResult.responseMessage,
                model: agent.llm_model,
                provider: 'guardrail',
                usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                duration_ms: 0
            });

            return {
                execution_id: executionId,
                response: screenResult.responseMessage,
                model: agent.llm_model,
                provider: 'guardrail',
                context_used: [],
                usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                duration_ms: 0,
                guardrail: {
                    blocked: true,
                    category: screenResult.category,
                    severity: screenResult.severity,
                    brightLine: screenResult.brightLine
                }
            };
        }

        // ── Guardrail Enforcement: Build soul context ──
        let soulContext = null;
        try {
            soulContext = await guardrailEnforcement.buildSoulContextBlock(agent.org_id, userMessage);
        } catch (e) {
            console.warn('Failed to build soul context for agent:', e.message);
        }

        // Assemble context
        const contextResult = await assembleContext(agentId, {
            userQuery: userMessage,
            includeOnDemand,
            returnDetails: true
        }, supabase);

        // Execute based on agent type
        let result;

        // Check if this is a MindStudio agent (external execution)
        if (agent.type === 'mindstudio') {
            // MindStudio agents use external API
            result = await mindstudioService.executeAgent(
                agent,
                userMessage,
                contextResult.context,
                conversationHistory
            );
        } else {
            // Native LLM execution (custom or llm type)

            // Resolve fallback if provider is down
            const resolved = resolveModelWithFallback(agent.llm_model);
            if (resolved.unavailable) {
                throw new Error(`${resolved.provider} is currently unavailable. Perplexity models have no fallback.`);
            }
            if (resolved.allUnavailable) {
                throw new Error('All LLM providers are currently unavailable. Please try again later.');
            }

            // Apply resolved model/provider
            const effectiveAgent = { ...agent };
            if (resolved.fallback) {
                effectiveAgent.llm_model = resolved.model;
                effectiveAgent.llm_provider = resolved.provider;
                console.log(`[Agent] Fallback activated: ${agent.llm_model} -> ${resolved.model}`);
            }

            // Build system prompt with context + soul context
            let systemPrompt = buildSystemPrompt(effectiveAgent, contextResult.context);
            if (soulContext) {
                systemPrompt = soulContext + '\n\n' + systemPrompt;
            }

            // Build messages
            const messages = buildMessages(userMessage, conversationHistory);

            switch (effectiveAgent.llm_provider) {
                case 'anthropic':
                    result = await executeWithAnthropic(effectiveAgent, systemPrompt, messages);
                    break;
                case 'openai':
                    result = await executeWithOpenAI(effectiveAgent, systemPrompt, messages);
                    break;
                case 'perplexity':
                    result = await executeWithPerplexity(effectiveAgent, systemPrompt, messages);
                    break;
                case 'google':
                    result = await executeWithGemini(effectiveAgent, systemPrompt, messages);
                    break;
                default:
                    throw new Error(`Unsupported provider: ${effectiveAgent.llm_provider}`);
            }

            // Attach fallback info to result
            if (resolved.fallback) {
                result.fallback = resolved.fallback;
            }
        }

        // Log execution
        const executionId = await logExecution(agentId, userId, {
            userMessage,
            conversationHistory,
            contextDetails: contextResult.assets,
            temperature: agent.temperature
        }, result);

        return {
            execution_id: executionId,
            response: result.content,
            model: result.model,
            provider: result.provider,
            context_used: contextResult.assets,
            usage: result.usage,
            duration_ms: result.duration_ms,
            fallback: result.fallback || undefined
        };

    } catch (error) {
        console.error('Error executing agent:', error);

        // Log failed execution
        await logExecution(agentId, userId, {
            userMessage,
            conversationHistory
        }, { error });

        throw error;
    }
}

/**
 * Stream an agent response
 * @param {string} agentId - Agent UUID
 * @param {object} options - Execution options with callbacks
 */
async function streamAgent(agentId, options = {}) {
    const {
        userMessage,
        conversationHistory = [],
        userId = null,
        includeOnDemand = [],
        modelOverride = null,
        sessionId = null,
        onToken,
        onComplete,
        onError
    } = options;

    try {
        // Get agent configuration
        const agent = await getAgent(agentId);

        if (!agent.is_active) {
            throw new Error('Agent is not active');
        }

        // ── Guardrail Enforcement: Pre-screen ──
        const screenResult = await guardrailEnforcement.screenMessage(userMessage, agent.org_id, {
            agentId,
            userId,
            conversationId: sessionId
        });

        if (screenResult.blocked) {
            // Emit guardrail block event via onGuardrailBlocked or onToken fallback
            if (options.onGuardrailBlocked) {
                options.onGuardrailBlocked({
                    category: screenResult.category,
                    brightLine: screenResult.brightLine,
                    message: screenResult.responseMessage,
                    severity: screenResult.severity
                });
            } else if (onToken) {
                // Fallback: emit the blocked message as content
                onToken(screenResult.responseMessage);
            }

            // Log as execution
            const executionId = await logExecution(agentId, userId, {
                userMessage,
                conversationHistory,
                temperature: agent.temperature,
                sessionId
            }, {
                content: screenResult.responseMessage,
                model: agent.llm_model,
                provider: 'guardrail',
                usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                duration_ms: 0
            });

            if (onComplete) {
                onComplete({
                    execution_id: executionId,
                    context_used: [],
                    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                    duration_ms: 0,
                    guardrail: {
                        blocked: true,
                        category: screenResult.category,
                        severity: screenResult.severity,
                        brightLine: screenResult.brightLine
                    }
                });
            }
            return;
        }

        // ── Guardrail Enforcement: Build soul context ──
        let soulContext = null;
        try {
            soulContext = await guardrailEnforcement.buildSoulContextBlock(agent.org_id, userMessage);
        } catch (e) {
            console.warn('Failed to build soul context for agent stream:', e.message);
        }

        // Determine which model to use (override or agent default)
        const agentDefaultModel = agent.llm_model;
        const effectiveModel = modelOverride || agentDefaultModel;
        const isOverridden = modelOverride !== null && modelOverride !== agentDefaultModel;

        // Determine provider from model
        let effectiveProvider = agent.llm_provider;
        if (modelOverride) {
            // Detect provider from model name
            if (modelOverride.startsWith('claude') || modelOverride.startsWith('anthropic')) {
                effectiveProvider = 'anthropic';
            } else if (modelOverride.startsWith('gpt') || modelOverride.startsWith('o3') || modelOverride.startsWith('o4')) {
                effectiveProvider = 'openai';
            } else if (modelOverride.startsWith('gemini') || modelOverride.startsWith('nano-banana')) {
                effectiveProvider = 'google';
            } else if (modelOverride.startsWith('sonar')) {
                effectiveProvider = 'perplexity';
            }
        }

        // Log model selection
        if (isOverridden) {
            console.log(`Model override: ${agentDefaultModel} -> ${effectiveModel} (provider: ${effectiveProvider})`);
        }

        // Assemble context
        const contextResult = await assembleContext(agentId, {
            userQuery: userMessage,
            includeOnDemand,
            returnDetails: true
        }, supabase);

        // Stream based on agent type
        let result;

        // Check if this is a MindStudio agent (external execution)
        if (agent.type === 'mindstudio') {
            // MindStudio doesn't support streaming - execute and emit full response
            const startTime = Date.now();
            const msResult = await mindstudioService.executeAgent(
                agent,
                userMessage,
                contextResult.context,
                conversationHistory
            );

            // Emit the full response as a single token
            if (onToken && msResult.content) {
                onToken(msResult.content);
            }

            result = {
                content: msResult.content,
                model: 'mindstudio-workflow',
                provider: 'mindstudio',
                usage: { billing_cost: msResult.billingCost },
                duration_ms: Date.now() - startTime
            };
        } else {
            // Native LLM execution (custom or llm type)

            // Resolve fallback if provider is down
            const resolved = resolveModelWithFallback(effectiveModel);
            if (resolved.unavailable) {
                throw new Error(`${resolved.provider} is currently unavailable. Perplexity models have no fallback.`);
            }
            if (resolved.allUnavailable) {
                throw new Error('All LLM providers are currently unavailable. Please try again later.');
            }

            // Apply fallback if needed
            let resolvedModel = effectiveModel;
            let resolvedProvider = effectiveProvider;
            if (resolved.fallback) {
                resolvedModel = resolved.model;
                resolvedProvider = resolved.provider;
                console.log(`[Agent Stream] Fallback activated: ${effectiveModel} -> ${resolvedModel}`);
            }

            // Build system prompt with context + soul context
            let systemPrompt = buildSystemPrompt(agent, contextResult.context);
            if (soulContext) {
                systemPrompt = soulContext + '\n\n' + systemPrompt;
            }

            // Build messages
            const messages = buildMessages(userMessage, conversationHistory);

            // Create effective agent config with overridden model
            const effectiveAgent = {
                ...agent,
                llm_model: resolvedModel,
                llm_provider: resolvedProvider
            };

            switch (resolvedProvider) {
                case 'anthropic':
                    result = await streamWithAnthropic(effectiveAgent, systemPrompt, messages, onToken);
                    break;
                case 'openai':
                    result = await streamWithOpenAI(effectiveAgent, systemPrompt, messages, onToken);
                    break;
                case 'perplexity':
                    result = await streamWithPerplexity(effectiveAgent, systemPrompt, messages, onToken);
                    break;
                case 'google':
                    result = await streamWithGemini(effectiveAgent, systemPrompt, messages, onToken);
                    break;
                default:
                    throw new Error(`Unsupported provider: ${resolvedProvider}`);
            }

            // Attach fallback info
            if (resolved.fallback) {
                result.fallback = resolved.fallback;
            }
        }

        // Add model metadata to result
        result.agent_model = agentDefaultModel;
        result.runtime_model = effectiveModel;
        result.model_overridden = isOverridden;
        result.session_id = sessionId;

        // Log execution with model metadata
        const executionId = await logExecution(agentId, userId, {
            userMessage,
            conversationHistory,
            contextDetails: contextResult.assets,
            temperature: agent.temperature,
            agentModel: agentDefaultModel,
            runtimeModel: effectiveModel,
            modelOverridden: isOverridden,
            sessionId: sessionId
        }, result);

        // Call completion callback
        if (onComplete) {
            onComplete({
                execution_id: executionId,
                context_used: contextResult.assets,
                usage: result.usage,
                duration_ms: result.duration_ms,
                agent_model: agentDefaultModel,
                runtime_model: effectiveModel,
                model_overridden: isOverridden
            });
        }

    } catch (error) {
        console.error('Error streaming agent:', error);

        // Log failed execution
        await logExecution(agentId, userId, {
            userMessage,
            conversationHistory,
            sessionId: sessionId
        }, { error });

        if (onError) {
            onError(error);
        }
    }
}

/**
 * Get agent recommendations based on user query
 * @param {string} query - User query to match
 * @returns {array} - Recommended agents
 */
async function getRecommendedAgents(query) {
    try {
        // Simple keyword matching for now
        // Could be enhanced with embeddings/semantic search
        const { data: agents, error } = await supabase
            .from('agents')
            .select('id, name, description, icon, category')
            .eq('is_active', true)
            .limit(5);
        
        if (error) throw error;
        
        // Score agents based on query relevance
        const queryLower = query.toLowerCase();
        const scored = agents.map(agent => {
            let score = 0;
            
            if (agent.name.toLowerCase().includes(queryLower)) score += 10;
            if (agent.description?.toLowerCase().includes(queryLower)) score += 5;
            if (agent.category?.toLowerCase().includes(queryLower)) score += 3;
            
            return { ...agent, score };
        });
        
        return scored
            .filter(a => a.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
        
    } catch (error) {
        console.error('Error getting recommendations:', error);
        return [];
    }
}

module.exports = {
    executeAgent,
    streamAgent,
    getAgent,
    getRecommendedAgents
};
