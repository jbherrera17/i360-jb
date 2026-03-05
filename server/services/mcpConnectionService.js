/**
 * MCP Connection Service
 * Org-level connection management — bridges DB records to the MCPClientManager pool.
 */

const mcpClientManager = require('./mcpClientManager');
const credentialCrypto = require('./mcpCredentialCrypto');

/**
 * List all connections for an org.
 */
async function listOrgConnections(supabase, orgId) {
    const { data, error } = await supabase
        .from('mcp_org_connections')
        .select(`
            *,
            mcp_server_catalog (
                id, slug, name, description, icon, transport_type,
                auth_type, auth_config, status
            )
        `)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get a single connection with catalog info.
 */
async function getConnection(supabase, connectionId, orgId) {
    const { data, error } = await supabase
        .from('mcp_org_connections')
        .select(`
            *,
            mcp_server_catalog (
                id, slug, name, description, icon, transport_type,
                auth_type, auth_config, default_url, status
            )
        `)
        .eq('id', connectionId)
        .eq('org_id', orgId)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Create a new connection.
 * Encrypts credentials and attempts initial connection to validate.
 */
async function createConnection(supabase, orgId, catalogId, credentials, name, userId) {
    // Verify catalog entry exists and is approved
    const { data: catalog, error: catErr } = await supabase
        .from('mcp_server_catalog')
        .select('*')
        .eq('id', catalogId)
        .eq('status', 'approved')
        .single();

    if (catErr || !catalog) {
        throw new Error('Catalog entry not found or not approved');
    }

    // Encrypt credentials
    let credentialsEncrypted = null;
    if (credentials && Object.keys(credentials).length > 0) {
        credentialsEncrypted = credentialCrypto.encrypt(JSON.stringify(credentials));
    }

    // Insert record
    const { data: connection, error } = await supabase
        .from('mcp_org_connections')
        .insert({
            org_id: orgId,
            catalog_id: catalogId,
            name: name || catalog.name,
            credentials_encrypted: credentialsEncrypted,
            created_by: userId
        })
        .select()
        .single();

    if (error) throw error;

    // Attempt initial connection to validate and discover capabilities
    try {
        const entry = await mcpClientManager.getClient(connection.id, connection, catalog);

        // Update DB with discovered capabilities
        await supabase
            .from('mcp_org_connections')
            .update({
                status: 'connected',
                last_connected_at: new Date().toISOString(),
                discovered_tools: entry.capabilities.tools,
                discovered_resources: entry.capabilities.resources,
                discovered_prompts: entry.capabilities.prompts,
                capabilities_refreshed_at: new Date().toISOString(),
                error_count: 0,
                last_error: null
            })
            .eq('id', connection.id);

        connection.status = 'connected';
        connection.discovered_tools = entry.capabilities.tools;
        connection.discovered_resources = entry.capabilities.resources;
        connection.discovered_prompts = entry.capabilities.prompts;
    } catch (connErr) {
        // Connection failed but record created — user can retry
        await supabase
            .from('mcp_org_connections')
            .update({
                status: 'error',
                last_error: connErr.message,
                error_count: 1
            })
            .eq('id', connection.id);

        connection.status = 'error';
        connection.last_error = connErr.message;
    }

    return connection;
}

/**
 * Update connection credentials.
 */
async function updateConnectionCredentials(supabase, connectionId, orgId, credentials) {
    // Disconnect existing
    await mcpClientManager.disconnectClient(connectionId);

    const credentialsEncrypted = credentialCrypto.encrypt(JSON.stringify(credentials));

    const { data, error } = await supabase
        .from('mcp_org_connections')
        .update({
            credentials_encrypted: credentialsEncrypted,
            status: 'disconnected',
            last_error: null
        })
        .eq('id', connectionId)
        .eq('org_id', orgId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete a connection.
 */
async function deleteConnection(supabase, connectionId, orgId) {
    await mcpClientManager.disconnectClient(connectionId);

    const { error } = await supabase
        .from('mcp_org_connections')
        .delete()
        .eq('id', connectionId)
        .eq('org_id', orgId);

    if (error) throw error;
    return true;
}

/**
 * Enable a specific tool on a connection.
 */
async function enableTool(supabase, connectionId, orgId, toolName) {
    const conn = await getConnection(supabase, connectionId, orgId);
    if (!conn) throw new Error('Connection not found');

    const enabled = new Set(conn.enabled_tool_ids || []);
    enabled.add(toolName);

    const { data, error } = await supabase
        .from('mcp_org_connections')
        .update({ enabled_tool_ids: Array.from(enabled) })
        .eq('id', connectionId)
        .eq('org_id', orgId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Disable a specific tool on a connection.
 */
async function disableTool(supabase, connectionId, orgId, toolName) {
    const conn = await getConnection(supabase, connectionId, orgId);
    if (!conn) throw new Error('Connection not found');

    const enabled = new Set(conn.enabled_tool_ids || []);
    enabled.delete(toolName);

    const { data, error } = await supabase
        .from('mcp_org_connections')
        .update({ enabled_tool_ids: Array.from(enabled) })
        .eq('id', connectionId)
        .eq('org_id', orgId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Test/reconnect a connection and refresh capabilities.
 */
async function testConnection(supabase, connectionId, orgId) {
    const conn = await getConnection(supabase, connectionId, orgId);
    if (!conn) throw new Error('Connection not found');

    const catalog = conn.mcp_server_catalog;

    // Disconnect existing and reconnect fresh
    await mcpClientManager.disconnectClient(connectionId);

    try {
        const entry = await mcpClientManager.getClient(connectionId, conn, catalog);

        await supabase
            .from('mcp_org_connections')
            .update({
                status: 'connected',
                last_connected_at: new Date().toISOString(),
                discovered_tools: entry.capabilities.tools,
                discovered_resources: entry.capabilities.resources,
                discovered_prompts: entry.capabilities.prompts,
                capabilities_refreshed_at: new Date().toISOString(),
                error_count: 0,
                last_error: null
            })
            .eq('id', connectionId);

        return {
            success: true,
            capabilities: entry.capabilities
        };
    } catch (err) {
        await supabase
            .from('mcp_org_connections')
            .update({
                status: 'error',
                last_error: err.message,
                error_count: (conn.error_count || 0) + 1
            })
            .eq('id', connectionId);

        return {
            success: false,
            error: err.message
        };
    }
}

/**
 * Get all enabled MCP tools across all connected org connections.
 * Returns flat array ready for agent tool injection.
 */
async function getOrgMcpTools(supabase, orgId) {
    const { data, error } = await supabase
        .rpc('get_org_mcp_tools', { p_org_id: orgId });

    if (error) {
        console.warn('[MCP] Failed to get org tools:', error.message);
        return [];
    }

    return (data || []).map(row => ({
        connectionId: row.connection_id,
        connectionName: row.connection_name,
        catalogSlug: row.catalog_slug,
        tool: row.tool_def
    }));
}

/**
 * Get auto-inject resources from all org connections.
 */
async function getAutoInjectResources(supabase, orgId) {
    const { data: connections, error } = await supabase
        .from('mcp_org_connections')
        .select('id, name, discovered_resources')
        .eq('org_id', orgId)
        .eq('auto_inject_resources', true)
        .eq('status', 'connected');

    if (error || !connections?.length) return [];

    const resources = [];
    for (const conn of connections) {
        const client = mcpClientManager.getPooledClient(conn.id);
        if (!client) continue;

        for (const resource of (conn.discovered_resources || [])) {
            try {
                const result = await client.readResource({ uri: resource.uri });
                const text = (result?.contents || [])
                    .map(c => c.text || '')
                    .filter(Boolean)
                    .join('\n');

                if (text) {
                    resources.push({
                        connectionName: conn.name,
                        resourceUri: resource.uri,
                        resourceName: resource.name,
                        content: text
                    });
                }
            } catch (err) {
                console.warn(`[MCP] Failed to read resource ${resource.uri}:`, err.message);
            }
        }
    }

    return resources;
}

/**
 * Get usage stats for an org.
 */
async function getUsageStats(supabase, orgId) {
    const monthYear = new Date().toISOString().slice(0, 7);

    const { data, error } = await supabase
        .from('mcp_usage_stats')
        .select(`
            *,
            mcp_org_connections (name)
        `)
        .eq('org_id', orgId)
        .eq('month_year', monthYear);

    if (error) throw error;

    const totalCalls = (data || []).reduce((sum, row) => sum + (row.tool_calls || 0), 0);
    const totalFetches = (data || []).reduce((sum, row) => sum + (row.resource_fetches || 0), 0);

    return {
        month: monthYear,
        totalToolCalls: totalCalls,
        totalResourceFetches: totalFetches,
        byConnection: data || []
    };
}

module.exports = {
    listOrgConnections,
    getConnection,
    createConnection,
    updateConnectionCredentials,
    deleteConnection,
    enableTool,
    disableTool,
    testConnection,
    getOrgMcpTools,
    getAutoInjectResources,
    getUsageStats
};
