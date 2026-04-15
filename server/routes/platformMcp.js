/**
 * Platform Admin MCP Routes
 * Manages the MCP server catalog — available only to platform admins.
 * Mounted at /api/platform/mcp
 */

const express = require('express');

module.exports = function(supabase) {
    const router = express.Router();
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
    // MCP REGISTRY BROWSER
    // ─────────────────────────────────────────

    // In-memory cache for registry data
    let registryCache = { data: null, fetchedAt: 0 };
    const CACHE_TTL = 60 * 60 * 1000; // 1 hour

    /**
     * GET /api/platform/mcp/registry
     * Proxy the Anthropic MCP Registry and return simplified server list.
     */
    router.get('/registry', async (req, res) => {
        try {
            const now = Date.now();
            if (registryCache.data && (now - registryCache.fetchedAt) < CACHE_TTL) {
                return res.json({ success: true, data: registryCache.data, cached: true });
            }

            const servers = [];
            let cursor = null;

            // Paginate through all results
            do {
                const url = new URL('https://api.anthropic.com/mcp-registry/v0/servers');
                url.searchParams.set('version', 'latest');
                url.searchParams.set('visibility', 'commercial');
                url.searchParams.set('limit', '100');
                if (cursor) url.searchParams.set('cursor', cursor);

                const resp = await fetch(url.toString(), {
                    headers: { 'Accept': 'application/json' }
                });

                if (!resp.ok) {
                    throw new Error(`Registry returned ${resp.status}: ${resp.statusText}`);
                }

                const body = await resp.json();
                const items = body.servers || body.data || [];
                servers.push(...items);

                cursor = body.metadata?.nextCursor || null;
            } while (cursor);

            // Map to simplified format
            // The Anthropic registry nests metadata under _meta['com.anthropic.api/mcp-registry']
            const mapped = servers.map(entry => {
                const anthropicMeta = (entry._meta || {})['com.anthropic.api/mcp-registry'] || {};
                const server = entry.server || {};
                const remotes = server.remotes || [];
                const remote = remotes[0] || {};

                const displayName = anthropicMeta.displayName || server.title || server.name || 'Unknown';

                return {
                    registry_id: anthropicMeta.slug || server.name || anthropicMeta.uuid,
                    name: displayName,
                    description: server.description || anthropicMeta.oneLiner || '',
                    url: remote.url || anthropicMeta.url || null,
                    transport_type: remote.type || null,
                    auth_required: !anthropicMeta.isAuthless,
                    tools: anthropicMeta.toolNames || [],
                    permissions: anthropicMeta.permissions || [],
                    works_with: anthropicMeta.worksWith || [],
                    documentation: anthropicMeta.documentation || null,
                    icon_url: anthropicMeta.iconUrl || null,
                    icon: guessIcon(displayName)
                };
            });

            registryCache = { data: mapped, fetchedAt: now };
            res.json({ success: true, data: mapped, cached: false });
        } catch (error) {
            console.error('[MCP Registry] Fetch error:', error);
            // Return stale cache if available
            if (registryCache.data) {
                return res.json({ success: true, data: registryCache.data, cached: true, stale: true });
            }
            res.status(502).json({ success: false, error: 'Failed to fetch MCP registry: ' + error.message });
        }
    });

    /**
     * POST /api/platform/mcp/catalog/bulk
     * Bulk-create catalog entries from registry imports.
     */
    router.post('/catalog/bulk', async (req, res) => {
        try {
            const { entries } = req.body;
            if (!Array.isArray(entries) || entries.length === 0) {
                return res.status(400).json({ success: false, error: 'entries array is required' });
            }

            const result = await mcpCatalogService.bulkCreateCatalogEntries(supabase, entries, req.userId);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            console.error('[MCP Catalog] Bulk create error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * Guess a Lucide icon name from the server name.
     */
    function guessIcon(name) {
        const n = name.toLowerCase();
        const iconMap = {
            github: 'github', git: 'git-branch',
            slack: 'slack', database: 'database', postgres: 'database',
            file: 'file', filesystem: 'folder', folder: 'folder',
            search: 'search', brave: 'search', google: 'search',
            web: 'globe', fetch: 'globe', browser: 'globe',
            memory: 'brain', puppeteer: 'monitor',
            sentry: 'bug', linear: 'layout-list',
            notion: 'book-open', stripe: 'credit-card',
            cloudflare: 'cloud', aws: 'cloud',
            docker: 'container', kubernetes: 'container',
            email: 'mail', smtp: 'mail',
            calendar: 'calendar', time: 'clock',
            map: 'map', location: 'map-pin',
        };
        for (const [key, icon] of Object.entries(iconMap)) {
            if (n.includes(key)) return icon;
        }
        return 'plug';
    }

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
