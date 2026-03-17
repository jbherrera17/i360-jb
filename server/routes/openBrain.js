/**
 * INSIGHT 360 - Open Brain Routes
 * Version: 2.0.0
 *
 * REST API wrapper around Open Brain MCP tools.
 * Now uses factory pattern with auth + module access middleware.
 *
 * Endpoints:
 *   POST /api/open-brain/capture        - Save a thought
 *   GET  /api/open-brain/search?q=      - Semantic search
 *   GET  /api/open-brain/thoughts       - List recent thoughts (with filters)
 *   GET  /api/open-brain/stats          - Summary counts and top topics
 *   GET  /api/open-brain/status         - Check if Open Brain is configured
 */

const express = require('express');
const openBrain = require('../services/openBrainService');
const createModuleAccessMiddleware = require('../middleware/moduleAccess');

// Valid thought types for input validation
const VALID_TYPES = ['observation', 'task', 'idea', 'reference', 'person_note'];

// Input limits
const MAX_CONTENT_LENGTH = 5000;
const MAX_QUERY_LENGTH = 500;
const MAX_LIMIT = 100;
const MAX_DAYS = 3650;
const MAX_TOPIC_LENGTH = 200;
const MAX_PERSON_LENGTH = 200;

// Simple in-memory rate limiting (per-user)
const rateLimits = new Map();

function checkRateLimit(userId, action, maxPerMinute) {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const windowMs = 60000;

    if (!rateLimits.has(key)) {
        rateLimits.set(key, []);
    }

    const timestamps = rateLimits.get(key).filter(t => now - t < windowMs);
    rateLimits.set(key, timestamps);

    if (timestamps.length >= maxPerMinute) {
        return false;
    }

    timestamps.push(now);
    return true;
}

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of rateLimits.entries()) {
        const active = timestamps.filter(t => now - t < 60000);
        if (active.length === 0) {
            rateLimits.delete(key);
        } else {
            rateLimits.set(key, active);
        }
    }
}, 300000);

module.exports = function(supabase) {
    const router = express.Router();
    const { requireModule } = createModuleAccessMiddleware(supabase);

    // All Open Brain routes require authentication + module access
    router.use(requireModule('open_brain'));

    /**
     * GET /api/open-brain/status
     * Health check — confirms Open Brain is reachable and configured.
     */
    router.get('/status', async (_req, res) => {
        if (!openBrain.isConfigured()) {
            return res.json({ success: false, configured: false });
        }

        try {
            const stats = await openBrain.thoughtStats();
            res.json({ success: true, configured: true, stats });
        } catch (error) {
            console.error('[OpenBrain] Status check failed:', error.message);
            res.status(502).json({ success: false, configured: true, error: 'Open Brain service unavailable' });
        }
    });

    /**
     * POST /api/open-brain/capture
     * Save a thought to Open Brain.
     *
     * Body: { content: string }
     */
    router.post('/capture', async (req, res) => {
        const userId = req.userId;

        // Rate limit: 20 captures per minute
        if (!checkRateLimit(userId, 'capture', 20)) {
            return res.status(429).json({ success: false, error: 'Rate limit exceeded. Max 20 captures per minute.' });
        }

        const { content } = req.body || {};

        if (!content || typeof content !== 'string' || !content.trim()) {
            return res.status(400).json({ success: false, error: 'content is required' });
        }

        if (content.length > MAX_CONTENT_LENGTH) {
            return res.status(400).json({ success: false, error: `content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters` });
        }

        if (!openBrain.isConfigured()) {
            return res.status(503).json({ success: false, error: 'Open Brain MCP is not configured' });
        }

        try {
            const result = await openBrain.captureThought(content);
            console.info(`[OpenBrain] Thought captured by user=${userId}, length=${content.trim().length}`);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('[OpenBrain] Capture failed:', error.message);
            res.status(502).json({ success: false, error: 'Failed to capture thought' });
        }
    });

    /**
     * GET /api/open-brain/search
     * Semantic search across captured thoughts.
     *
     * Query params:
     *   q         {string}  Search query (required)
     *   limit     {number}  Max results (default 10, max 100)
     *   threshold {number}  Similarity threshold 0-1 (default 0.5)
     */
    router.get('/search', async (req, res) => {
        const userId = req.userId;

        // Rate limit: 30 searches per minute
        if (!checkRateLimit(userId, 'search', 30)) {
            return res.status(429).json({ success: false, error: 'Rate limit exceeded. Max 30 searches per minute.' });
        }

        const { q, limit, threshold } = req.query;

        if (!q || !q.trim()) {
            return res.status(400).json({ success: false, error: 'q (query) is required' });
        }

        if (q.length > MAX_QUERY_LENGTH) {
            return res.status(400).json({ success: false, error: `query exceeds maximum length of ${MAX_QUERY_LENGTH} characters` });
        }

        if (!openBrain.isConfigured()) {
            return res.status(503).json({ success: false, error: 'Open Brain MCP is not configured' });
        }

        try {
            const options = {};
            if (limit)     options.limit     = Math.min(parseInt(limit, 10) || 10, MAX_LIMIT);
            if (threshold) options.threshold = Math.max(0, Math.min(1, parseFloat(threshold) || 0.5));

            const result = await openBrain.searchThoughts(q, options);
            console.info(`[OpenBrain] Search by user=${userId}, query="${q.slice(0, 50)}"`);
            res.json({ success: true, query: q, data: result });
        } catch (error) {
            console.error('[OpenBrain] Search failed:', error.message);
            res.status(502).json({ success: false, error: 'Search failed' });
        }
    });

    /**
     * GET /api/open-brain/thoughts
     * List recent thoughts with optional filters.
     *
     * Query params:
     *   limit  {number}  Max results (default 10, max 100)
     *   type   {string}  observation | task | idea | reference | person_note
     *   topic  {string}  Filter by topic tag
     *   person {string}  Filter by person mentioned
     *   days   {number}  Only thoughts from last N days (max 3650)
     */
    router.get('/thoughts', async (req, res) => {
        const userId = req.userId;

        // Rate limit: 60 reads per minute
        if (!checkRateLimit(userId, 'read', 60)) {
            return res.status(429).json({ success: false, error: 'Rate limit exceeded' });
        }

        if (!openBrain.isConfigured()) {
            return res.status(503).json({ success: false, error: 'Open Brain MCP is not configured' });
        }

        try {
            const { limit, type, topic, person, days } = req.query;
            const filters = {};

            if (limit)  filters.limit  = Math.min(parseInt(limit, 10) || 10, MAX_LIMIT);

            if (type) {
                if (!VALID_TYPES.includes(type)) {
                    return res.status(400).json({ success: false, error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` });
                }
                filters.type = type;
            }

            if (topic) {
                if (topic.length > MAX_TOPIC_LENGTH) {
                    return res.status(400).json({ success: false, error: `topic exceeds maximum length of ${MAX_TOPIC_LENGTH}` });
                }
                filters.topic = topic;
            }

            if (person) {
                if (person.length > MAX_PERSON_LENGTH) {
                    return res.status(400).json({ success: false, error: `person exceeds maximum length of ${MAX_PERSON_LENGTH}` });
                }
                filters.person = person;
            }

            if (days) {
                const parsedDays = parseInt(days, 10);
                if (parsedDays > 0 && parsedDays <= MAX_DAYS) {
                    filters.days = parsedDays;
                }
            }

            const result = await openBrain.listThoughts(filters);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('[OpenBrain] List thoughts failed:', error.message);
            res.status(502).json({ success: false, error: 'Failed to list thoughts' });
        }
    });

    /**
     * GET /api/open-brain/stats
     * Summary of all captured thoughts: totals, types, top topics, people.
     */
    router.get('/stats', async (req, res) => {
        const userId = req.userId;

        // Rate limit: 60 reads per minute
        if (!checkRateLimit(userId, 'read', 60)) {
            return res.status(429).json({ success: false, error: 'Rate limit exceeded' });
        }

        if (!openBrain.isConfigured()) {
            return res.status(503).json({ success: false, error: 'Open Brain MCP is not configured' });
        }

        try {
            const result = await openBrain.thoughtStats();
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('[OpenBrain] Stats failed:', error.message);
            res.status(502).json({ success: false, error: 'Failed to retrieve stats' });
        }
    });

    return router;
};
