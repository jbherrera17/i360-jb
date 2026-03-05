/**
 * Platform Admin MCP Routes
 * Manages the MCP server catalog — available only to platform admins.
 * Mounted at /api/platform/mcp
 */

const express = require('express');
const router = express.Router();

module.exports = function(supabase) {
    const mcpCatalogService = require('../services/mcpCatalogService');
    const mcpClientManager = require('../services/mcpClientManager');

    // ─────────────────────────────────────────
    // Middleware: Require platform admin
    // ─────────────────────────────────────────
    const requirePlatformAdmin = async (req, res, next) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }

            const { data, error } = await supabase
                .rpc('is_platform_admin', { p_user_id: userId });

            if (error || !data) {
                return res.status(403).json({ success: false, error: 'Platform admin access required' });
            }

            const { data: roleData } = await supabase
                .rpc('get_platform_admin_role', { p_user_id: userId });

            req.platformAdminRole = roleData;
            next();
        } catch (error) {
            console.error('Platform admin check error:', error);
            res.status(500).json({ success: false, error: 'Failed to verify admin status' });
        }
    };

    router.use(requirePlatformAdmin);

    // ─────────────────────────────────────────
    // CATALOG CRUD
    // ─────────────────────────────────────────

    /**
     * GET /api/platform/mcp/catalog
     * List all catalog entries (all statuses).
     */
    router.get('/catalog', async (req, res) => {
        try {
            const filters = {};
            if (req.query.status) filters.status = req.query.status;
            if (req.query.transport_type) filters.transport_type = req.query.transport_type;

            const entries = await mcpCatalogService.listCatalog(supabase, filters);
            const connectionCounts = await mcpCatalogService.getConnectionCounts(supabase);

            // Attach connection counts
            const enriched = entries.map(entry => ({
                ...entry,
                connection_count: connectionCounts[entry.id]?.total || 0,
                connected_count: connectionCounts[entry.id]?.connected || 0
            }));

            res.json({ success: true, data: enriched });
        } catch (error) {
            console.error('[MCP Catalog] List error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/platform/mcp/catalog/:id
     */
    router.get('/catalog/:id', async (req, res) => {
        try {
            const entry = await mcpCatalogService.getCatalogEntry(supabase, req.params.id);
            if (!entry) return res.status(404).json({ success: false, error: 'Not found' });
            res.json({ success: true, data: entry });
        } catch (error) {
            console.error('[MCP Catalog] Get error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/platform/mcp/catalog
     * Create a new catalog entry.
     */
    router.post('/catalog', async (req, res) => {
        try {
            const { slug, name, description, icon, transport_type, default_url,
                    auth_type, auth_config, command, args, env_schema,
                    min_tier, platform_admin_only } = req.body;

            if (!slug || !name || !transport_type) {
                return res.status(400).json({
                    success: false,
                    error: 'slug, name, and transport_type are required'
                });
            }

            const entry = await mcpCatalogService.createCatalogEntry(supabase, {
                slug, name, description, icon, transport_type, default_url,
                auth_type, auth_config, command, args, env_schema,
                min_tier, platform_admin_only
            }, req.userId);

            res.status(201).json({ success: true, data: entry });
        } catch (error) {
            console.error('[MCP Catalog] Create error:', error);
            if (error.code === '23505') {
                return res.status(409).json({ success: false, error: 'A server with that slug already exists' });
            }
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/platform/mcp/catalog/:id
     */
    router.put('/catalog/:id', async (req, res) => {
        try {
            const entry = await mcpCatalogService.updateCatalogEntry(supabase, req.params.id, req.body);
            res.json({ success: true, data: entry });
        } catch (error) {
            console.error('[MCP Catalog] Update error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/platform/mcp/catalog/:id
     */
    router.delete('/catalog/:id', async (req, res) => {
        try {
            await mcpCatalogService.deleteCatalogEntry(supabase, req.params.id);
            res.json({ success: true });
        } catch (error) {
            console.error('[MCP Catalog] Delete error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ─────────────────────────────────────────
    // APPROVE / REJECT
    // ─────────────────────────────────────────

    /**
     * POST /api/platform/mcp/catalog/:id/approve
     */
    router.post('/catalog/:id/approve', async (req, res) => {
        try {
            const entry = await mcpCatalogService.approveCatalogEntry(supabase, req.params.id, req.userId);
            res.json({ success: true, data: entry });
        } catch (error) {
            console.error('[MCP Catalog] Approve error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/platform/mcp/catalog/:id/reject
     */
    router.post('/catalog/:id/reject', async (req, res) => {
        try {
            const { reason } = req.body;
            const entry = await mcpCatalogService.rejectCatalogEntry(supabase, req.params.id, reason);
            res.json({ success: true, data: entry });
        } catch (error) {
            console.error('[MCP Catalog] Reject error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ─────────────────────────────────────────
    // TEST
    // ─────────────────────────────────────────

    /**
     * POST /api/platform/mcp/catalog/:id/test
     * Test a catalog entry with provided credentials.
     */
    router.post('/catalog/:id/test', async (req, res) => {
        try {
            const { credentials } = req.body;
            const result = await mcpCatalogService.testCatalogEntry(supabase, req.params.id, credentials || {});
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('[MCP Catalog] Test error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ─────────────────────────────────────────
    // POOL STATUS
    // ─────────────────────────────────────────

    /**
     * GET /api/platform/mcp/pool/status
     * Connection pool health overview.
     */
    router.get('/pool/status', (req, res) => {
        const status = mcpClientManager.getPoolStatus();
        res.json({ success: true, data: status });
    });

    return router;
};
