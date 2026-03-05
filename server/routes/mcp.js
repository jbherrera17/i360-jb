/**
 * MCP Connection Routes (Org Admin)
 * Manages org-level MCP connections, tool toggling, and invocation.
 * Mounted at /api/mcp
 */

const express = require('express');
const router = express.Router();

module.exports = function(supabase) {
    const createModuleAccessMiddleware = require('../middleware/moduleAccess');
    const mcpConnectionService = require('../services/mcpConnectionService');
    const mcpCatalogService = require('../services/mcpCatalogService');
    const mcpClientManager = require('../services/mcpClientManager');
    const mcpToolBridge = require('../services/mcpToolBridge');
    const { requireModule, checkResourceLimit } = createModuleAccessMiddleware(supabase);

    // Require MCP module access for all routes
    router.use(requireModule('mcp_integrations'));

    // Helper: get org_id from request
    function getOrgId(req) {
        return req.headers['x-org-id'] || req.query.org_id || req.body?.org_id;
    }

    // ─────────────────────────────────────────
    // CATALOG BROWSING (approved entries only)
    // ─────────────────────────────────────────

    /**
     * GET /api/mcp/catalog
     * List approved catalog entries for org admins to browse.
     */
    router.get('/catalog', async (req, res) => {
        try {
            const entries = await mcpCatalogService.listCatalog(supabase, { status: 'approved' });
            res.json({ success: true, data: entries });
        } catch (error) {
            console.error('[MCP] Catalog browse error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ─────────────────────────────────────────
    // CONNECTION MANAGEMENT
    // ─────────────────────────────────────────

    /**
     * GET /api/mcp/connections
     * List org's connections.
     */
    router.get('/connections', async (req, res) => {
        try {
            const orgId = getOrgId(req);
            if (!orgId) return res.status(400).json({ success: false, error: 'org_id required' });

            const connections = await mcpConnectionService.listOrgConnections(supabase, orgId);
            res.json({ success: true, data: connections });
        } catch (error) {
            console.error('[MCP] List connections error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/mcp/connections/:id
     */
    router.get('/connections/:id', async (req, res) => {
        try {
            const orgId = getOrgId(req);
            if (!orgId) return res.status(400).json({ success: false, error: 'org_id required' });

            const conn = await mcpConnectionService.getConnection(supabase, req.params.id, orgId);
            if (!conn) return res.status(404).json({ success: false, error: 'Connection not found' });

            res.json({ success: true, data: conn });
        } catch (error) {
            console.error('[MCP] Get connection error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/mcp/connections
     * Create a new connection.
     */
    router.post('/connections', checkResourceLimit('mcp_connections'), async (req, res) => {
        try {
            const orgId = getOrgId(req);
            if (!orgId) return res.status(400).json({ success: false, error: 'org_id required' });

            const { catalog_id, credentials, name } = req.body;
            if (!catalog_id) {
                return res.status(400).json({ success: false, error: 'catalog_id is required' });
            }

            const connection = await mcpConnectionService.createConnection(
                supabase, orgId, catalog_id, credentials || {}, name, req.userId
            );

            res.status(201).json({ success: true, data: connection });
        } catch (error) {
            console.error('[MCP] Create connection error:', error);
            if (error.code === '23505') {
                return res.status(409).json({ success: false, error: 'Already connected to this server' });
            }
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/mcp/connections/:id
     * Update connection credentials.
     */
    router.put('/connections/:id', async (req, res) => {
        try {
            const orgId = getOrgId(req);
            if (!orgId) return res.status(400).json({ success: false, error: 'org_id required' });

            const { credentials, name } = req.body;

            if (credentials) {
                const conn = await mcpConnectionService.updateConnectionCredentials(
                    supabase, req.params.id, orgId, credentials
                );
                if (name) {
                    await supabase
                        .from('mcp_org_connections')
                        .update({ name })
                        .eq('id', req.params.id)
                        .eq('org_id', orgId);
                }
                res.json({ success: true, data: conn });
            } else if (name) {
                const { data, error } = await supabase
                    .from('mcp_org_connections')
                    .update({ name })
                    .eq('id', req.params.id)
                    .eq('org_id', orgId)
                    .select()
                    .single();
                if (error) throw error;
                res.json({ success: true, data });
            } else {
                res.status(400).json({ success: false, error: 'credentials or name required' });
            }
        } catch (error) {
            console.error('[MCP] Update connection error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/mcp/connections/:id
     */
    router.delete('/connections/:id', async (req, res) => {
        try {
            const orgId = getOrgId(req);
            if (!orgId) return res.status(400).json({ success: false, error: 'org_id required' });

            await mcpConnectionService.deleteConnection(supabase, req.params.id, orgId);
            res.json({ success: true });
        } catch (error) {
            console.error('[MCP] Delete connection error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/mcp/connections/:id/test
     * Test / reconnect and refresh capabilities.
     */
    router.post('/connections/:id/test', async (req, res) => {
        try {
            const orgId = getOrgId(req);
            if (!orgId) return res.status(400).json({ success: false, error: 'org_id required' });

            const result = await mcpConnectionService.testConnection(supabase, req.params.id, orgId);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('[MCP] Test connection error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ─────────────────────────────────────────
    // TOOL MANAGEMENT
    // ─────────────────────────────────────────

    /**
     * POST /api/mcp/connections/:id/tools/:toolName/toggle
     * Enable or disable a specific tool.
     */
    router.post('/connections/:id/tools/:toolName/toggle', async (req, res) => {
        try {
            const orgId = getOrgId(req);
            if (!orgId) return res.status(400).json({ success: false, error: 'org_id required' });

            const { enabled } = req.body;
            const toolName = decodeURIComponent(req.params.toolName);

            let conn;
            if (enabled) {
                conn = await mcpConnectionService.enableTool(supabase, req.params.id, orgId, toolName);
            } else {
                conn = await mcpConnectionService.disableTool(supabase, req.params.id, orgId, toolName);
            }

            res.json({ success: true, data: conn });
        } catch (error) {
            console.error('[MCP] Toggle tool error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/mcp/tools
     * All enabled tools across all org connections (for agent use).
     */
    router.get('/tools', async (req, res) => {
        try {
            const orgId = getOrgId(req);
            if (!orgId) return res.status(400).json({ success: false, error: 'org_id required' });

            const tools = await mcpConnectionService.getOrgMcpTools(supabase, orgId);
            res.json({ success: true, data: tools });
        } catch (error) {
            console.error('[MCP] List tools error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/mcp/tools/invoke
     * Direct tool invocation (for testing from UI).
     */
    router.post('/tools/invoke', async (req, res) => {
        try {
            const orgId = getOrgId(req);
            if (!orgId) return res.status(400).json({ success: false, error: 'org_id required' });

            const { connection_id, tool_name, tool_input } = req.body;
            if (!connection_id || !tool_name) {
                return res.status(400).json({ success: false, error: 'connection_id and tool_name required' });
            }

            // Check monthly call limit
            const { data: limitCheck } = await supabase
                .rpc('check_org_limits', { p_org_id: orgId, p_resource_type: 'mcp_calls' });

            if (limitCheck && limitCheck[0] && !limitCheck[0].within_limits) {
                return res.status(429).json({
                    success: false,
                    error: 'Monthly MCP call limit reached',
                    usage: limitCheck[0]
                });
            }

            // Ensure connection is in pool
            const conn = await mcpConnectionService.getConnection(supabase, connection_id, orgId);
            if (!conn) return res.status(404).json({ success: false, error: 'Connection not found' });

            if (!mcpClientManager.getPooledClient(connection_id)) {
                await mcpClientManager.getClient(connection_id, conn, conn.mcp_server_catalog);
            }

            const result = await mcpToolBridge.executeMcpTool(
                mcpClientManager,
                connection_id,
                tool_name,
                tool_input || {},
                supabase,
                { orgId, userId: req.userId }
            );

            res.json({ success: true, data: result });
        } catch (error) {
            console.error('[MCP] Invoke tool error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ─────────────────────────────────────────
    // RESOURCES
    // ─────────────────────────────────────────

    /**
     * GET /api/mcp/resources
     * List available resources across all connections.
     */
    router.get('/resources', async (req, res) => {
        try {
            const orgId = getOrgId(req);
            if (!orgId) return res.status(400).json({ success: false, error: 'org_id required' });

            const connections = await mcpConnectionService.listOrgConnections(supabase, orgId);
            const resources = [];

            for (const conn of connections) {
                if (conn.status !== 'connected') continue;
                for (const resource of (conn.discovered_resources || [])) {
                    resources.push({
                        connection_id: conn.id,
                        connection_name: conn.name,
                        ...resource
                    });
                }
            }

            res.json({ success: true, data: resources });
        } catch (error) {
            console.error('[MCP] List resources error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ─────────────────────────────────────────
    // USAGE STATS
    // ─────────────────────────────────────────

    /**
     * GET /api/mcp/stats
     * Usage stats for current month.
     */
    router.get('/stats', async (req, res) => {
        try {
            const orgId = getOrgId(req);
            if (!orgId) return res.status(400).json({ success: false, error: 'org_id required' });

            const stats = await mcpConnectionService.getUsageStats(supabase, orgId);

            // Also get limits
            const { data: limitData } = await supabase
                .rpc('check_org_limits', { p_org_id: orgId, p_resource_type: 'mcp_calls' });

            const { data: connLimitData } = await supabase
                .rpc('check_org_limits', { p_org_id: orgId, p_resource_type: 'mcp_connections' });

            res.json({
                success: true,
                data: {
                    ...stats,
                    callLimit: limitData?.[0] || null,
                    connectionLimit: connLimitData?.[0] || null
                }
            });
        } catch (error) {
            console.error('[MCP] Stats error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
