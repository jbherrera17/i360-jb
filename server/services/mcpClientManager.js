/**
 * MCP Client Manager
 * Manages a pool of MCP SDK Client instances, one per org connection.
 * Handles lifecycle: connect, discover capabilities, heartbeat, reconnect, disconnect.
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const credentialCrypto = require('./mcpCredentialCrypto');

const HEARTBEAT_INTERVAL = 60000; // 60s
const CONNECT_TIMEOUT = 30000;    // 30s

class MCPClientManager {
    constructor() {
        this._pool = new Map();            // connectionId → { client, transport, catalog, meta }
        this._connecting = new Map();       // connectionId → Promise (dedup in-flight connects)
        this._heartbeatTimers = new Map();
    }

    /**
     * Get or create an MCP client for a connection.
     * @param {string} connectionId - UUID from mcp_org_connections
     * @param {object} connectionRecord - DB record from mcp_org_connections
     * @param {object} catalogRecord - DB record from mcp_server_catalog
     * @returns {object} { client, capabilities }
     */
    async getClient(connectionId, connectionRecord, catalogRecord) {
        // Return existing connection
        if (this._pool.has(connectionId)) {
            return this._pool.get(connectionId);
        }

        // Dedup concurrent connection attempts
        if (this._connecting.has(connectionId)) {
            return this._connecting.get(connectionId);
        }

        const connectPromise = this._createClient(connectionId, connectionRecord, catalogRecord);
        this._connecting.set(connectionId, connectPromise);

        try {
            const result = await connectPromise;
            this._connecting.delete(connectionId);
            return result;
        } catch (err) {
            this._connecting.delete(connectionId);
            throw err;
        }
    }

    /**
     * Get an already-pooled client (no DB lookup).
     * @param {string} connectionId
     * @returns {object|null} The SDK Client instance or null
     */
    getPooledClient(connectionId) {
        const entry = this._pool.get(connectionId);
        return entry ? entry.client : null;
    }

    /**
     * Disconnect a specific connection.
     */
    async disconnectClient(connectionId) {
        this._stopHeartbeat(connectionId);

        const entry = this._pool.get(connectionId);
        if (entry) {
            try {
                await entry.client.close();
            } catch (err) {
                console.warn(`[MCP] Error closing client ${connectionId}:`, err.message);
            }
            if (entry.transport && typeof entry.transport.close === 'function') {
                try {
                    await entry.transport.close();
                } catch (err) {
                    console.warn(`[MCP] Error closing transport ${connectionId}:`, err.message);
                }
            }
            this._pool.delete(connectionId);
        }
    }

    /**
     * Disconnect all connections for an org.
     */
    async disconnectOrg(orgId) {
        const promises = [];
        for (const [connId, entry] of this._pool) {
            if (entry.meta?.orgId === orgId) {
                promises.push(this.disconnectClient(connId));
            }
        }
        await Promise.allSettled(promises);
    }

    /**
     * Refresh capabilities for a connected client.
     * @returns {object} { tools, resources, prompts }
     */
    async refreshCapabilities(connectionId) {
        const entry = this._pool.get(connectionId);
        if (!entry) throw new Error(`Connection ${connectionId} not in pool`);

        const [toolsResult, resourcesResult, promptsResult] = await Promise.allSettled([
            entry.client.listTools(),
            entry.client.listResources(),
            entry.client.listPrompts()
        ]);

        const capabilities = {
            tools: toolsResult.status === 'fulfilled' ? (toolsResult.value.tools || []) : [],
            resources: resourcesResult.status === 'fulfilled' ? (resourcesResult.value.resources || []) : [],
            prompts: promptsResult.status === 'fulfilled' ? (promptsResult.value.prompts || []) : []
        };

        entry.capabilities = capabilities;
        return capabilities;
    }

    /**
     * Get pool status summary for health endpoint.
     */
    getPoolStatus() {
        const connections = [];
        for (const [connId, entry] of this._pool) {
            connections.push({
                connectionId: connId,
                orgId: entry.meta?.orgId,
                catalogSlug: entry.catalog?.slug,
                connectedAt: entry.meta?.connectedAt,
                lastHeartbeat: entry.meta?.lastHeartbeat
            });
        }
        return { totalConnections: this._pool.size, connections };
    }

    // ─────────────────────────────────────────
    // Private
    // ─────────────────────────────────────────

    async _createClient(connectionId, connectionRecord, catalogRecord) {
        const transport = this._buildTransport(connectionRecord, catalogRecord);

        const client = new Client(
            { name: 'insight-360', version: '1.0.0' },
            { capabilities: {} }
        );

        // Connect with timeout
        await Promise.race([
            client.connect(transport),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('MCP connection timeout')), CONNECT_TIMEOUT)
            )
        ]);

        // Discover capabilities
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

        const entry = {
            client,
            transport,
            catalog: catalogRecord,
            capabilities,
            meta: {
                orgId: connectionRecord.org_id,
                connectedAt: new Date().toISOString(),
                lastHeartbeat: new Date().toISOString()
            }
        };

        this._pool.set(connectionId, entry);
        this._startHeartbeat(connectionId);

        return entry;
    }

    _buildTransport(connectionRecord, catalogRecord) {
        if (catalogRecord.transport_type !== 'streamable_http') {
            throw new Error(`Transport type "${catalogRecord.transport_type}" not yet supported. Only streamable_http is available.`);
        }

        // Decrypt credentials
        let credentials = {};
        if (connectionRecord.credentials_encrypted) {
            try {
                credentials = JSON.parse(credentialCrypto.decrypt(connectionRecord.credentials_encrypted));
            } catch (err) {
                throw new Error(`Failed to decrypt credentials: ${err.message}`);
            }
        }

        const url = credentials.url || catalogRecord.default_url;
        if (!url) {
            throw new Error('No URL configured for MCP server');
        }

        // Build headers based on auth type
        const headers = {};
        const authType = catalogRecord.auth_type || 'none';

        if (authType === 'api_key' && credentials.api_key) {
            headers['Authorization'] = `Bearer ${credentials.api_key}`;
        } else if (authType === 'bearer' && credentials.token) {
            headers['Authorization'] = `Bearer ${credentials.token}`;
        }

        // Add any custom headers from credentials
        if (credentials.headers && typeof credentials.headers === 'object') {
            Object.assign(headers, credentials.headers);
        }

        return new StreamableHTTPClientTransport(
            new URL(url),
            { requestInit: { headers } }
        );
    }

    _startHeartbeat(connectionId) {
        this._stopHeartbeat(connectionId);
        const timer = setInterval(async () => {
            const entry = this._pool.get(connectionId);
            if (!entry) {
                this._stopHeartbeat(connectionId);
                return;
            }
            try {
                await entry.client.ping();
                entry.meta.lastHeartbeat = new Date().toISOString();
            } catch (err) {
                console.warn(`[MCP] Heartbeat failed for ${connectionId}:`, err.message);
                entry.meta.heartbeatFailures = (entry.meta.heartbeatFailures || 0) + 1;
                if (entry.meta.heartbeatFailures >= 2) {
                    console.error(`[MCP] Connection ${connectionId} lost after 2 heartbeat failures`);
                    this._stopHeartbeat(connectionId);
                    this._pool.delete(connectionId);
                }
            }
        }, HEARTBEAT_INTERVAL);

        this._heartbeatTimers.set(connectionId, timer);
    }

    _stopHeartbeat(connectionId) {
        const timer = this._heartbeatTimers.get(connectionId);
        if (timer) {
            clearInterval(timer);
            this._heartbeatTimers.delete(connectionId);
        }
    }

    /**
     * Shutdown all connections (for graceful server shutdown).
     */
    async shutdown() {
        const promises = [];
        for (const connId of this._pool.keys()) {
            promises.push(this.disconnectClient(connId));
        }
        await Promise.allSettled(promises);
    }
}

// Singleton
module.exports = new MCPClientManager();
