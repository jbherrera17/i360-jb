/**
 * MCP Tool Bridge
 * Converts MCP tool definitions to LLM provider formats
 * and handles tool name namespacing for multi-connection support.
 */

/**
 * Sanitize a tool name to match Claude's tool name regex: ^[a-zA-Z0-9_-]{1,64}$
 */
function sanitizeToolName(name) {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

/**
 * Create a namespaced tool name: mcp__{8charPrefix}__{toolName}
 * @param {string} connectionId - Full UUID of the connection
 * @param {string} toolName - Original MCP tool name
 * @returns {string} Namespaced tool name
 */
function namespaceTool(connectionId, toolName) {
    const prefix = connectionId.replace(/-/g, '').slice(0, 8);
    const sanitized = sanitizeToolName(toolName);
    const full = `mcp__${prefix}__${sanitized}`;
    return full.slice(0, 64);
}

/**
 * Parse a namespaced tool name back to its components.
 * @param {string} namespacedName - e.g. 'mcp__abc12345__search_code'
 * @returns {{ connectionPrefix: string, toolName: string } | null}
 */
function parseToolName(namespacedName) {
    if (!namespacedName || !namespacedName.startsWith('mcp__')) return null;
    const parts = namespacedName.split('__');
    if (parts.length < 3) return null;
    return {
        connectionPrefix: parts[1],
        toolName: parts.slice(2).join('__')
    };
}

/**
 * Convert an MCP tool definition to Anthropic tool format.
 * @param {string} connectionId - Connection UUID
 * @param {object} mcpToolDef - MCP tool definition from tools/list
 * @returns {object} Anthropic-compatible tool definition
 */
function toAnthropicTool(connectionId, mcpToolDef) {
    return {
        name: namespaceTool(connectionId, mcpToolDef.name),
        description: mcpToolDef.description || `MCP tool: ${mcpToolDef.name}`,
        input_schema: mcpToolDef.inputSchema || { type: 'object', properties: {} }
    };
}

/**
 * Convert an MCP tool definition to OpenAI function-calling format.
 * @param {string} connectionId - Connection UUID
 * @param {object} mcpToolDef - MCP tool definition from tools/list
 * @returns {object} OpenAI-compatible tool definition
 */
function toOpenAITool(connectionId, mcpToolDef) {
    return {
        type: 'function',
        function: {
            name: namespaceTool(connectionId, mcpToolDef.name),
            description: mcpToolDef.description || `MCP tool: ${mcpToolDef.name}`,
            parameters: mcpToolDef.inputSchema || { type: 'object', properties: {} }
        }
    };
}

/**
 * Find a connection ID from its 8-char prefix across a connections map.
 * @param {Map|object} connectionsMap - Map of connectionId → connection data
 * @param {string} prefix - 8-char prefix from namespaced tool name
 * @returns {string|null} Full connection ID
 */
function findConnectionByPrefix(connectionsMap, prefix) {
    const entries = connectionsMap instanceof Map
        ? Array.from(connectionsMap.keys())
        : Object.keys(connectionsMap);
    return entries.find(id => id.replace(/-/g, '').startsWith(prefix)) || null;
}

/**
 * Execute an MCP tool call through the client manager.
 * @param {object} mcpClientManager - The MCPClientManager instance
 * @param {string} connectionId - Full connection UUID
 * @param {string} toolName - Original (non-namespaced) MCP tool name
 * @param {object} toolInput - Tool arguments
 * @param {object} supabase - Supabase client for logging
 * @param {object} logContext - { orgId, userId, agentId, conversationId }
 * @returns {object} { content: string, isError: boolean }
 */
async function executeMcpTool(mcpClientManager, connectionId, toolName, toolInput, supabase, logContext = {}) {
    const start = Date.now();
    let result = null;

    try {
        const client = mcpClientManager.getPooledClient(connectionId);
        if (!client) {
            throw new Error(`No active MCP connection: ${connectionId}`);
        }

        result = await client.callTool({ name: toolName, arguments: toolInput });
        const duration = Date.now() - start;

        // Log invocation
        await logInvocation(supabase, {
            connectionId,
            orgId: logContext.orgId,
            userId: logContext.userId,
            agentId: logContext.agentId,
            conversationId: logContext.conversationId,
            toolName,
            toolInput,
            toolResult: result,
            status: 'success',
            durationMs: duration
        });

        // Increment usage stats
        await incrementUsage(supabase, logContext.orgId, connectionId);

        // Extract text content from MCP result
        const textContent = (result?.content || [])
            .filter(c => c.type === 'text')
            .map(c => c.text)
            .join('\n');

        return {
            content: textContent || JSON.stringify(result),
            isError: result?.isError || false
        };
    } catch (err) {
        const duration = Date.now() - start;

        await logInvocation(supabase, {
            connectionId,
            orgId: logContext.orgId,
            userId: logContext.userId,
            agentId: logContext.agentId,
            conversationId: logContext.conversationId,
            toolName,
            toolInput,
            toolResult: null,
            status: duration > 29000 ? 'timeout' : 'error',
            durationMs: duration,
            errorMessage: err.message
        });

        return {
            content: `MCP tool error: ${err.message}`,
            isError: true
        };
    }
}

async function logInvocation(supabase, data) {
    try {
        await supabase.from('mcp_tool_invocation_log').insert({
            connection_id: data.connectionId,
            org_id: data.orgId,
            user_id: data.userId,
            agent_id: data.agentId,
            conversation_id: data.conversationId,
            tool_name: data.toolName,
            tool_input: data.toolInput,
            tool_result: data.toolResult,
            status: data.status,
            duration_ms: data.durationMs,
            error_message: data.errorMessage
        });
    } catch (err) {
        console.warn('[MCP] Failed to log invocation:', err.message);
    }
}

async function incrementUsage(supabase, orgId, connectionId) {
    if (!orgId) return;
    const monthYear = new Date().toISOString().slice(0, 7);
    try {
        const { data: existing } = await supabase
            .from('mcp_usage_stats')
            .select('id, tool_calls')
            .eq('org_id', orgId)
            .eq('connection_id', connectionId)
            .eq('month_year', monthYear)
            .single();

        if (existing) {
            await supabase
                .from('mcp_usage_stats')
                .update({ tool_calls: existing.tool_calls + 1, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
        } else {
            await supabase
                .from('mcp_usage_stats')
                .insert({ org_id: orgId, connection_id: connectionId, month_year: monthYear, tool_calls: 1 });
        }
    } catch (err) {
        console.warn('[MCP] Failed to increment usage:', err.message);
    }
}

module.exports = {
    namespaceTool,
    parseToolName,
    toAnthropicTool,
    toOpenAITool,
    findConnectionByPrefix,
    executeMcpTool,
    sanitizeToolName
};
