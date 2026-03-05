/**
 * Agent Tool Loop
 * Generic tool-use loop for Anthropic Claude that supports MCP tools.
 * Extracted as a reusable utility for agent execution and other tool-use contexts.
 */

const mcpClientManager = require('./mcpClientManager');
const mcpToolBridge = require('./mcpToolBridge');

/**
 * Run a Claude messages call with an automatic tool-use loop.
 * When Claude returns stop_reason='tool_use', executes the tools and re-calls.
 *
 * @param {object} anthropicClient - Anthropic SDK client
 * @param {object} params - { model, max_tokens, temperature, system, messages, tools }
 * @param {object} toolContext - { supabase, orgId, userId, agentId, conversationId, connectionMap }
 *   connectionMap: Map<connectionId, connectionRecord> for MCP tool routing
 * @param {object} options - { maxLoops: 5 }
 * @returns {object} { content, model, usage, duration_ms, stop_reason, toolCallCount }
 */
async function runAnthropicToolLoop(anthropicClient, params, toolContext = {}, options = {}) {
    const maxLoops = options.maxLoops || 5;
    const messages = [...params.messages];
    let finalContent = '';
    let totalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    let toolCallCount = 0;
    const startTime = Date.now();

    for (let i = 0; i < maxLoops; i++) {
        const response = await anthropicClient.messages.create({
            model: params.model,
            max_tokens: params.max_tokens,
            temperature: params.temperature,
            system: params.system,
            messages,
            tools: params.tools
        });

        // Accumulate usage
        if (response.usage) {
            totalUsage.prompt_tokens += response.usage.input_tokens || 0;
            totalUsage.completion_tokens += response.usage.output_tokens || 0;
        }

        // Collect text content from this response
        const textBlocks = response.content.filter(b => b.type === 'text');
        const textContent = textBlocks.map(b => b.text).join('');

        if (response.stop_reason === 'tool_use') {
            // Extract tool use blocks
            const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');

            // Add the assistant's full response (including tool_use blocks) to messages
            messages.push({ role: 'assistant', content: response.content });

            // Execute each tool and build results
            const toolResults = [];
            for (const toolBlock of toolUseBlocks) {
                toolCallCount++;
                const result = await executeToolBlock(toolBlock, toolContext);
                toolResults.push({
                    type: 'tool_result',
                    tool_use_id: toolBlock.id,
                    content: result.content,
                    is_error: result.isError
                });
            }

            // Add tool results as user message
            messages.push({ role: 'user', content: toolResults });
        } else {
            // Final response — no more tool calls
            finalContent = textContent;
            break;
        }
    }

    totalUsage.total_tokens = totalUsage.prompt_tokens + totalUsage.completion_tokens;

    return {
        content: finalContent,
        model: params.model,
        usage: totalUsage,
        duration_ms: Date.now() - startTime,
        stop_reason: 'end_turn',
        toolCallCount
    };
}

/**
 * Stream a Claude messages call with an automatic tool-use loop.
 * Streams text tokens via onToken callback, handles tool calls automatically.
 *
 * @param {object} anthropicClient - Anthropic SDK client
 * @param {object} params - { model, max_tokens, temperature, system, messages, tools }
 * @param {function} onToken - Callback for each text token
 * @param {object} toolContext - Same as runAnthropicToolLoop
 * @param {object} options - { maxLoops: 5 }
 * @returns {object} { content, model, usage, duration_ms, stop_reason, toolCallCount }
 */
async function streamAnthropicToolLoop(anthropicClient, params, onToken, toolContext = {}, options = {}) {
    const maxLoops = options.maxLoops || 5;
    const messages = [...params.messages];
    let fullContent = '';
    let totalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    let toolCallCount = 0;
    const startTime = Date.now();

    for (let i = 0; i < maxLoops; i++) {
        const stream = await anthropicClient.messages.stream({
            model: params.model,
            max_tokens: params.max_tokens,
            temperature: params.temperature,
            system: params.system,
            messages,
            tools: params.tools
        });

        let responseContent = [];
        let currentToolUse = null;
        let toolInputJson = '';
        let stopReason = 'end_turn';

        for await (const event of stream) {
            if (event.type === 'message_start' && event.message?.usage) {
                totalUsage.prompt_tokens += event.message.usage.input_tokens || 0;
            }
            if (event.type === 'message_delta') {
                if (event.usage) {
                    totalUsage.completion_tokens += event.usage.output_tokens || 0;
                }
                if (event.delta?.stop_reason) {
                    stopReason = event.delta.stop_reason;
                }
            }
            if (event.type === 'content_block_start') {
                if (event.content_block.type === 'text') {
                    responseContent.push({ type: 'text', text: '' });
                } else if (event.content_block.type === 'tool_use') {
                    currentToolUse = {
                        type: 'tool_use',
                        id: event.content_block.id,
                        name: event.content_block.name,
                        input: {}
                    };
                    toolInputJson = '';
                    responseContent.push(currentToolUse);
                }
            }
            if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') {
                    const text = event.delta.text;
                    fullContent += text;
                    const lastText = responseContent[responseContent.length - 1];
                    if (lastText && lastText.type === 'text') lastText.text += text;
                    onToken(text);
                } else if (event.delta.type === 'input_json_delta') {
                    toolInputJson += event.delta.partial_json;
                }
            }
            if (event.type === 'content_block_stop') {
                if (currentToolUse) {
                    try {
                        currentToolUse.input = JSON.parse(toolInputJson);
                    } catch (e) {
                        currentToolUse.input = {};
                    }
                    currentToolUse = null;
                    toolInputJson = '';
                }
            }
        }

        if (stopReason === 'tool_use') {
            const toolUseBlocks = responseContent.filter(b => b.type === 'tool_use');

            messages.push({ role: 'assistant', content: responseContent });

            const toolResults = [];
            for (const toolBlock of toolUseBlocks) {
                toolCallCount++;
                const result = await executeToolBlock(toolBlock, toolContext);
                toolResults.push({
                    type: 'tool_result',
                    tool_use_id: toolBlock.id,
                    content: result.content,
                    is_error: result.isError
                });
            }

            messages.push({ role: 'user', content: toolResults });
        } else {
            break;
        }
    }

    totalUsage.total_tokens = totalUsage.prompt_tokens + totalUsage.completion_tokens;

    return {
        content: fullContent,
        model: params.model,
        usage: totalUsage,
        duration_ms: Date.now() - startTime,
        stop_reason: 'end_turn',
        toolCallCount
    };
}

/**
 * Execute a single tool block.
 * Routes MCP-namespaced tools through the MCP client manager.
 */
async function executeToolBlock(toolBlock, toolContext) {
    const { supabase, orgId, userId, agentId, conversationId, connectionMap } = toolContext;

    // Check if this is an MCP tool
    const parsed = mcpToolBridge.parseToolName(toolBlock.name);
    if (parsed) {
        // Find the full connection ID from the prefix
        const connectionId = mcpToolBridge.findConnectionByPrefix(
            connectionMap || new Map(),
            parsed.connectionPrefix
        );

        if (!connectionId) {
            return { content: `MCP connection not found for tool: ${toolBlock.name}`, isError: true };
        }

        return mcpToolBridge.executeMcpTool(
            mcpClientManager,
            connectionId,
            parsed.toolName,
            toolBlock.input,
            supabase,
            { orgId, userId, agentId, conversationId }
        );
    }

    // Non-MCP tool — return error (or extend for other tool types)
    return { content: `Unknown tool: ${toolBlock.name}`, isError: true };
}

module.exports = {
    runAnthropicToolLoop,
    streamAnthropicToolLoop
};
