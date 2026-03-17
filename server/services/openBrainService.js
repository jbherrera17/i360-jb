/**
 * INSIGHT 360 - Open Brain MCP Service
 * Version: 2.0.0
 *
 * Connects i360 to Open Brain via MCP Streamable HTTP transport.
 * Open Brain stores and retrieves "thoughts" — insights, decisions,
 * client context, and captured knowledge.
 *
 * Tools exposed by Open Brain MCP:
 *   - capture_thought  : Save a thought (embeddings + metadata auto-generated)
 *   - search_thoughts  : Semantic search across captured thoughts
 *   - list_thoughts    : List recent thoughts with optional filters
 *   - thought_stats    : Summary counts and top topics/people
 */

const https = require('https');
const http = require('http');

const MCP_URL = process.env.OPEN_BRAIN_MCP_URL;
const MCP_KEY = process.env.OPEN_BRAIN_MCP_KEY;

// Warn if HTTP is used in production
if (MCP_URL && !MCP_URL.startsWith('https://')) {
    if (process.env.NODE_ENV === 'production') {
        console.error('[OpenBrain] WARNING: OPEN_BRAIN_MCP_URL is not HTTPS. This is insecure in production.');
    } else {
        console.warn('[OpenBrain] Note: OPEN_BRAIN_MCP_URL is using HTTP (acceptable for local dev only).');
    }
}

let _requestId = 1;

/**
 * Send a single JSON-RPC request to the Open Brain MCP endpoint.
 * Open Brain uses Streamable HTTP transport: POST with Accept header
 * for both application/json and text/event-stream.
 * Response comes back as SSE: "event: message\ndata: {...}\n\n"
 */
async function mcpRequest(method, params = {}) {
    if (!MCP_URL || !MCP_KEY) {
        throw new Error('Open Brain MCP is not configured.');
    }

    const url = new URL(MCP_URL);
    const id = _requestId++;
    const body = JSON.stringify({ jsonrpc: '2.0', method, id, params });

    const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'Authorization': `Bearer ${MCP_KEY}`,
            'Content-Length': Buffer.byteLength(body)
        }
    };

    return new Promise((resolve, reject) => {
        const transport = url.protocol === 'https:' ? https : http;
        const req = transport.request(options, (res) => {
            let raw = '';
            res.on('data', chunk => { raw += chunk; });
            res.on('end', () => {
                try {
                    // SSE format: strip "event: message\ndata: " prefix
                    const dataMatch = raw.match(/^event:\s*message\r?\ndata:\s*(.+)/m);
                    const jsonStr = dataMatch ? dataMatch[1].trim() : raw.trim();
                    const parsed = JSON.parse(jsonStr);

                    if (parsed.error) {
                        // Log full error server-side, throw generic message
                        console.error(`[OpenBrain] MCP error ${parsed.error.code}: ${parsed.error.message}`);
                        reject(new Error('Open Brain service returned an error'));
                    } else {
                        resolve(parsed.result);
                    }
                } catch (e) {
                    // Log full details server-side only — never expose raw MCP response to client
                    console.error(`[OpenBrain] Parse failure: ${e.message}. Raw response: ${raw.slice(0, 500)}`);
                    reject(new Error('Failed to parse Open Brain response'));
                }
            });
        });

        req.on('error', (err) => {
            console.error(`[OpenBrain] Connection error: ${err.message}`);
            reject(new Error('Open Brain service is unreachable'));
        });
        req.write(body);
        req.end();
    });
}

/**
 * Call a named tool via MCP tools/call
 */
async function callTool(toolName, toolArgs = {}) {
    return mcpRequest('tools/call', { name: toolName, arguments: toolArgs });
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Save a thought to Open Brain.
 * Open Brain auto-generates embeddings and extracts metadata (type, topics, people).
 * @param {string} content - A clear, standalone statement that will make sense when retrieved later.
 * @returns {object} - { success, thought_id, ... }
 */
async function captureThought(content) {
    if (!content || typeof content !== 'string' || !content.trim()) {
        throw new Error('content is required and must be a non-empty string');
    }
    return callTool('capture_thought', { content: content.trim() });
}

/**
 * Semantic search across captured thoughts.
 * @param {string} query - Natural language query
 * @param {object} options
 * @param {number} [options.limit=10]
 * @param {number} [options.threshold=0.5] - Similarity threshold (0-1)
 * @returns {object[]} - Array of matching thoughts
 */
async function searchThoughts(query, options = {}) {
    if (!query || typeof query !== 'string' || !query.trim()) {
        throw new Error('query is required');
    }
    return callTool('search_thoughts', {
        query: query.trim(),
        limit: options.limit || 10,
        threshold: options.threshold ?? 0.5
    });
}

/**
 * List recent thoughts with optional filters.
 * @param {object} filters
 * @param {number} [filters.limit=10]
 * @param {string} [filters.type] - 'observation' | 'task' | 'idea' | 'reference' | 'person_note'
 * @param {string} [filters.topic] - Filter by topic tag
 * @param {string} [filters.person] - Filter by person mentioned
 * @param {number} [filters.days] - Only thoughts from the last N days
 * @returns {object[]} - Array of thoughts
 */
async function listThoughts(filters = {}) {
    const args = { limit: filters.limit || 10 };
    if (filters.type)   args.type   = filters.type;
    if (filters.topic)  args.topic  = filters.topic;
    if (filters.person) args.person = filters.person;
    if (filters.days)   args.days   = filters.days;
    return callTool('list_thoughts', args);
}

/**
 * Get a summary of all captured thoughts: totals, types, top topics, people.
 * @returns {object} - Stats summary
 */
async function thoughtStats() {
    return callTool('thought_stats', {});
}

/**
 * Whether Open Brain is configured (env vars present).
 */
function isConfigured() {
    return !!(MCP_URL && MCP_KEY);
}

module.exports = {
    isConfigured,
    captureThought,
    searchThoughts,
    listThoughts,
    thoughtStats
};
