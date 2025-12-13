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
const { v4: uuidv4 } = require('uuid');
const { assembleContext, estimateTokens } = require('./contextInjection');

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
 * Execute agent with Anthropic Claude
 * @param {object} agent - Agent configuration
 * @param {string} systemPrompt - Complete system prompt
 * @param {array} messages - Conversation messages
 * @returns {object} - Response with metadata
 */
async function executeWithAnthropic(agent, systemPrompt, messages) {
    const startTime = Date.now();
    
    const response = await anthropic.messages.create({
        model: agent.llm_model,
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
 * Stream agent response with Anthropic Claude
 * @param {object} agent - Agent configuration
 * @param {string} systemPrompt - Complete system prompt
 * @param {array} messages - Conversation messages
 * @param {function} onToken - Callback for each token
 * @returns {object} - Final response metadata
 */
async function streamWithAnthropic(agent, systemPrompt, messages, onToken) {
    const startTime = Date.now();
    let fullContent = '';
    let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    
    const stream = await anthropic.messages.stream({
        model: agent.llm_model,
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
        includeOnDemand = []
    } = options;
    
    try {
        // Get agent configuration
        const agent = await getAgent(agentId);
        
        if (!agent.is_active) {
            throw new Error('Agent is not active');
        }
        
        // Assemble context
        const contextResult = await assembleContext(agentId, {
            userQuery: userMessage,
            includeOnDemand,
            returnDetails: true
        });
        
        // Build system prompt with context
        const systemPrompt = buildSystemPrompt(agent, contextResult.context);
        
        // Build messages
        const messages = buildMessages(userMessage, conversationHistory);
        
        // Execute based on provider
        let result;
        
        switch (agent.llm_provider) {
            case 'anthropic':
                result = await executeWithAnthropic(agent, systemPrompt, messages);
                break;
            case 'openai':
                result = await executeWithOpenAI(agent, systemPrompt, messages);
                break;
            default:
                throw new Error(`Unsupported provider: ${agent.llm_provider}`);
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
            duration_ms: result.duration_ms
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
        
        // Assemble context
        const contextResult = await assembleContext(agentId, {
            userQuery: userMessage,
            includeOnDemand,
            returnDetails: true
        });
        
        // Build system prompt with context
        const systemPrompt = buildSystemPrompt(agent, contextResult.context);
        
        // Build messages
        const messages = buildMessages(userMessage, conversationHistory);
        
        // Stream based on provider
        let result;
        
        switch (agent.llm_provider) {
            case 'anthropic':
                result = await streamWithAnthropic(agent, systemPrompt, messages, onToken);
                break;
            case 'openai':
                result = await streamWithOpenAI(agent, systemPrompt, messages, onToken);
                break;
            default:
                throw new Error(`Unsupported provider: ${agent.llm_provider}`);
        }
        
        // Log execution
        const executionId = await logExecution(agentId, userId, {
            userMessage,
            conversationHistory,
            contextDetails: contextResult.assets,
            temperature: agent.temperature
        }, result);
        
        // Call completion callback
        if (onComplete) {
            onComplete({
                execution_id: executionId,
                context_used: contextResult.assets,
                usage: result.usage,
                duration_ms: result.duration_ms
            });
        }
        
    } catch (error) {
        console.error('Error streaming agent:', error);
        
        // Log failed execution
        await logExecution(agentId, userId, {
            userMessage,
            conversationHistory
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
