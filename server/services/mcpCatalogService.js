/**
 * MCP Catalog Service
 * Platform admin CRUD for the MCP server catalog.
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

/**
 * List catalog entries with optional filters.
 */
async function listCatalog(supabase, filters = {}) {
    let query = supabase
        .from('mcp_server_catalog')
        .select('*')
        .order('created_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.transport_type) query = query.eq('transport_type', filters.transport_type);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

/**
 * Get a single catalog entry by ID.
 */
async function getCatalogEntry(supabase, id) {
    const { data, error } = await supabase
        .from('mcp_server_catalog')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

/**
 * Create a new catalog entry.
 */
async function createCatalogEntry(supabase, entryData, adminUserId) {
    const { data, error } = await supabase
        .from('mcp_server_catalog')
        .insert({
            slug: entryData.slug,
            name: entryData.name,
            description: entryData.description,
            icon: entryData.icon || 'plug',
            transport_type: entryData.transport_type,
            default_url: entryData.default_url,
            auth_type: entryData.auth_type || 'none',
            auth_config: entryData.auth_config || {},
            command: entryData.command,
            args: entryData.args || [],
            env_schema: entryData.env_schema || {},
            min_tier: entryData.min_tier || null,
            platform_admin_only: entryData.platform_admin_only || false,
            created_by: adminUserId
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update a catalog entry.
 */
async function updateCatalogEntry(supabase, id, updateData) {
    const allowed = [
        'name', 'description', 'icon', 'transport_type',
        'default_url', 'auth_type', 'auth_config',
        'command', 'args', 'env_schema',
        'min_tier', 'platform_admin_only'
    ];

    const updates = {};
    for (const key of allowed) {
        if (updateData[key] !== undefined) updates[key] = updateData[key];
    }

    const { data, error } = await supabase
        .from('mcp_server_catalog')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Approve a catalog entry.
 */
async function approveCatalogEntry(supabase, id, adminUserId) {
    const { data, error } = await supabase
        .from('mcp_server_catalog')
        .update({
            status: 'approved',
            approved_by: adminUserId,
            approved_at: new Date().toISOString(),
            rejection_reason: null
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Reject a catalog entry.
 */
async function rejectCatalogEntry(supabase, id, reason) {
    const { data, error } = await supabase
        .from('mcp_server_catalog')
        .update({
            status: 'rejected',
            rejection_reason: reason || null
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete a catalog entry.
 */
async function deleteCatalogEntry(supabase, id) {
    const { error } = await supabase
        .from('mcp_server_catalog')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}

/**
 * Test a catalog entry by creating a throwaway MCP client.
 * Returns discovered capabilities without persisting a connection.
 */
async function testCatalogEntry(supabase, id, testCredentials = {}) {
    const entry = await getCatalogEntry(supabase, id);
    if (!entry) throw new Error('Catalog entry not found');

    if (entry.transport_type !== 'streamable_http') {
        throw new Error(`Testing not yet supported for transport: ${entry.transport_type}`);
    }

    const url = testCredentials.url || entry.default_url;
    if (!url) throw new Error('No URL provided for testing');

    const headers = {};
    if ((entry.auth_type === 'api_key' || entry.auth_type === 'bearer') && testCredentials.api_key) {
        headers['Authorization'] = `Bearer ${testCredentials.api_key}`;
    }

    const transport = new StreamableHTTPClientTransport(
        new URL(url),
        { requestInit: { headers } }
    );

    const client = new Client(
        { name: 'insight-360-test', version: '1.0.0' },
        { capabilities: {} }
    );

    try {
        await Promise.race([
            client.connect(transport),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection timeout (30s)')), 30000)
            )
        ]);

        const [toolsResult, resourcesResult, promptsResult] = await Promise.allSettled([
            client.listTools(),
            client.listResources(),
            client.listPrompts()
        ]);

        const capabilities = {
            tools: toolsResult.status === 'fulfilled' ? (toolsResult.value.tools || []) : [],
            resources: resourcesResult.status === 'fulfilled' ? (resourcesResult.value.resources || []) : [],
            prompts: promptsResult.status === 'fulfilled' ? (promptsResult.value.prompts || []) : []
        };

        // Cache capabilities on the catalog entry
        await supabase
            .from('mcp_server_catalog')
            .update({
                tool_schemas: capabilities.tools,
                resource_schemas: capabilities.resources,
                prompt_schemas: capabilities.prompts
            })
            .eq('id', id);

        return {
            success: true,
            serverInfo: client.getServerVersion ? client.getServerVersion() : null,
            capabilities
        };
    } finally {
        try { await client.close(); } catch (e) { /* ignore */ }
        try { if (transport.close) await transport.close(); } catch (e) { /* ignore */ }
    }
}

/**
 * Get connection count per catalog entry (for admin stats).
 */
async function getConnectionCounts(supabase) {
    const { data, error } = await supabase
        .from('mcp_org_connections')
        .select('catalog_id, status');

    if (error) throw error;

    const counts = {};
    for (const row of (data || [])) {
        if (!counts[row.catalog_id]) counts[row.catalog_id] = { total: 0, connected: 0 };
        counts[row.catalog_id].total++;
        if (row.status === 'connected') counts[row.catalog_id].connected++;
    }
    return counts;
}

module.exports = {
    listCatalog,
    getCatalogEntry,
    createCatalogEntry,
    updateCatalogEntry,
    approveCatalogEntry,
    rejectCatalogEntry,
    deleteCatalogEntry,
    testCatalogEntry,
    getConnectionCounts
};
