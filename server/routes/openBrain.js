/**
 * INSIGHT 360 - Open Brain Routes
 * Version: 1.0.0
 *
 * REST API wrapper around Open Brain MCP tools.
 *
 * Endpoints:
 *   POST /api/open-brain/capture        - Save a thought
 *   GET  /api/open-brain/search?q=      - Semantic search
 *   GET  /api/open-brain/thoughts       - List recent thoughts (with filters)
 *   GET  /api/open-brain/stats          - Summary counts and top topics
 *   GET  /api/open-brain/status         - Check if Open Brain is configured
 */

const express = require('express');
const router = express.Router();
const openBrain = require('../services/openBrainService');

/**
 * GET /api/open-brain/status
 * Health check — confirms Open Brain is reachable and configured.
 */
router.get('/status', async (_req, res) => {
    if (!openBrain.isConfigured()) {
        return res.json({
            success: false,
            configured: false,
            message: 'Open Brain MCP is not configured. Set OPEN_BRAIN_MCP_URL and OPEN_BRAIN_MCP_KEY.'
        });
    }

    try {
        const stats = await openBrain.thoughtStats();
        res.json({ success: true, configured: true, stats });
    } catch (error) {
        console.error('[OpenBrain] Status check failed:', error.message);
        res.status(502).json({ success: false, configured: true, error: error.message });
    }
});

/**
 * POST /api/open-brain/capture
 * Save a thought to Open Brain.
 *
 * Body: { content: string }
 *
 * Tip: Write content as a clear, standalone statement — it should make sense
 * when retrieved by any AI with no surrounding context.
 * e.g. "Decided to use Supabase SSE for the Open Brain integration in i360 (March 2026)"
 */
router.post('/capture', async (req, res) => {
    const { content } = req.body || {};

    if (!content || typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ success: false, error: 'content is required' });
    }

    if (!openBrain.isConfigured()) {
        return res.status(503).json({ success: false, error: 'Open Brain MCP is not configured' });
    }

    try {
        const result = await openBrain.captureThought(content);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[OpenBrain] Capture failed:', error.message);
        res.status(502).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/open-brain/search
 * Semantic search across captured thoughts.
 *
 * Query params:
 *   q         {string}  Search query (required)
 *   limit     {number}  Max results (default 10)
 *   threshold {number}  Similarity threshold 0-1 (default 0.5)
 */
router.get('/search', async (req, res) => {
    const { q, limit, threshold } = req.query;

    if (!q || !q.trim()) {
        return res.status(400).json({ success: false, error: 'q (query) is required' });
    }

    if (!openBrain.isConfigured()) {
        return res.status(503).json({ success: false, error: 'Open Brain MCP is not configured' });
    }

    try {
        const options = {};
        if (limit)     options.limit     = parseInt(limit, 10);
        if (threshold) options.threshold = parseFloat(threshold);

        const result = await openBrain.searchThoughts(q, options);
        res.json({ success: true, query: q, data: result });
    } catch (error) {
        console.error('[OpenBrain] Search failed:', error.message);
        res.status(502).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/open-brain/thoughts
 * List recent thoughts with optional filters.
 *
 * Query params:
 *   limit  {number}  Max results (default 10)
 *   type   {string}  observation | task | idea | reference | person_note
 *   topic  {string}  Filter by topic tag
 *   person {string}  Filter by person mentioned
 *   days   {number}  Only thoughts from last N days
 */
router.get('/thoughts', async (req, res) => {
    if (!openBrain.isConfigured()) {
        return res.status(503).json({ success: false, error: 'Open Brain MCP is not configured' });
    }

    try {
        const { limit, type, topic, person, days } = req.query;
        const filters = {};
        if (limit)  filters.limit  = parseInt(limit, 10);
        if (type)   filters.type   = type;
        if (topic)  filters.topic  = topic;
        if (person) filters.person = person;
        if (days)   filters.days   = parseInt(days, 10);

        const result = await openBrain.listThoughts(filters);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[OpenBrain] List thoughts failed:', error.message);
        res.status(502).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/open-brain/stats
 * Summary of all captured thoughts: totals, types, top topics, people.
 */
router.get('/stats', async (_req, res) => {
    if (!openBrain.isConfigured()) {
        return res.status(503).json({ success: false, error: 'Open Brain MCP is not configured' });
    }

    try {
        const result = await openBrain.thoughtStats();
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[OpenBrain] Stats failed:', error.message);
        res.status(502).json({ success: false, error: error.message });
    }
});

module.exports = router;
