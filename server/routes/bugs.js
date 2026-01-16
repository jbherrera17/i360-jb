/**
 * Bug Tracker Routes - Insight 360
 * Integrates with Notion Bug Tracker database (two-way sync)
 *
 * Endpoints:
 * - GET  /api/bugs/summary  - Bug counts by status and severity
 * - GET  /api/bugs          - List bugs (paginated, filterable)
 * - GET  /api/bugs/open     - List only open bugs
 * - GET  /api/bugs/:id      - Get single bug by ID
 * - POST /api/bugs          - Create new bug in Notion
 * - PATCH /api/bugs/:id     - Update bug in Notion
 *
 * Features:
 * - Authentication required (requireAuth middleware)
 * - Caching with configurable TTL (BUG_CACHE_TTL_MS env var)
 * - Cursor-based pagination
 * - Cache invalidation on mutations
 *
 * Version: 2.0.0
 * Phase: 27 (Notion Bug Tracker Integration)
 */

const express = require('express');
const router = express.Router();
const logger = require('../services/logger');
const { requireAuth } = require('../middleware/auth');

// Notion Bug Tracker Database ID
const NOTION_BUG_TRACKER_ID = '2e1baf03-1ec8-80ca-8ee7-e5f46449321b';

// Notion API configuration
const NOTION_API_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// Cache configuration
const CACHE_TTL_MS = parseInt(process.env.BUG_CACHE_TTL_MS) || 10000; // 10 seconds default
const cache = new Map();

/**
 * Get cached data or null if expired/missing
 */
function getCached(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

/**
 * Store data in cache with TTL
 */
function setCache(key, data) {
    cache.set(key, {
        data,
        expiresAt: Date.now() + CACHE_TTL_MS
    });
}

/**
 * Invalidate cache (called after mutations)
 */
function invalidateCache() {
    cache.clear();
}


/**
 * Make a request to Notion API
 */
async function notionRequest(endpoint, method = 'GET', body = null) {
    const apiKey = process.env.NOTION_API_KEY;

    if (!apiKey) {
        throw new Error('NOTION_API_KEY not configured');
    }

    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Notion-Version': NOTION_VERSION,
            'Content-Type': 'application/json'
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${NOTION_API_URL}${endpoint}`, options);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Notion API error: ${response.status}`);
    }

    return response.json();
}

/**
 * Query the bug tracker database (with caching and pagination)
 * @param {object} filter - Notion filter object
 * @param {array} sorts - Notion sorts array
 * @param {object} pagination - { pageSize, startCursor }
 */
async function queryBugTracker(filter = null, sorts = null, pagination = {}) {
    const { pageSize = 100, startCursor = null } = pagination;

    // Create cache key from all parameters
    const cacheKey = `bugs:${JSON.stringify({ filter, sorts, pageSize, startCursor })}`;

    // Check cache first
    const cached = getCached(cacheKey);
    if (cached) {
        logger.info('Bug tracker cache hit', { cacheKey });
        return cached;
    }

    const body = { page_size: Math.min(pageSize, 100) }; // Notion max is 100
    if (filter) body.filter = filter;
    if (sorts) body.sorts = sorts;
    if (startCursor) body.start_cursor = startCursor;

    const result = await notionRequest(`/databases/${NOTION_BUG_TRACKER_ID}/query`, 'POST', body);

    // Cache the result
    setCache(cacheKey, result);

    return result;
}

/**
 * GET /api/bugs/summary
 * Returns aggregated bug statistics from Notion
 */
router.get('/summary', requireAuth, async (req, res) => {
    try {
        // Query all bugs from Notion
        const result = await queryBugTracker();
        const bugs = result.results || [];

        // Initialize counters
        const bySeverity = {
            Critical: { total: 0, fixed: 0 },
            High: { total: 0, fixed: 0 },
            Medium: { total: 0, fixed: 0 },
            Low: { total: 0, fixed: 0 },
            Trivial: { total: 0, fixed: 0 }
        };

        const byStatus = {
            New: 0,
            Triaged: 0,
            'In Progress': 0,
            'Ready for Testing': 0,
            Testing: 0,
            Resolved: 0,
            Closed: 0,
            Reopened: 0,
            "Won't Fix": 0
        };

        let totalBugs = 0;
        let fixedBugs = 0;

        // Process each bug
        bugs.forEach(bug => {
            const props = bug.properties || {};
            const severity = props.Severity?.select?.name || 'Unknown';
            const status = props.Status?.select?.name || 'Unknown';

            totalBugs++;

            // Count by severity
            if (bySeverity[severity]) {
                bySeverity[severity].total++;
                if (status === 'Resolved' || status === 'Closed') {
                    bySeverity[severity].fixed++;
                    fixedBugs++;
                }
            }

            // Count by status
            if (byStatus.hasOwnProperty(status)) {
                byStatus[status]++;
            }
        });

        // Build summary response
        const summary = {
            success: true,
            total: totalBugs,
            fixed: fixedBugs,
            open: totalBugs - fixedBugs,
            bySeverity: Object.entries(bySeverity).map(([name, data]) => ({
                severity: name,
                total: data.total,
                fixed: data.fixed,
                open: data.total - data.fixed
            })).filter(s => s.total > 0),
            byStatus: Object.entries(byStatus)
                .filter(([_, count]) => count > 0)
                .map(([status, count]) => ({ status, count })),
            lastUpdated: new Date().toISOString()
        };

        res.json(summary);

    } catch (error) {
        logger.error('Error fetching bug summary from Notion', { error: error.message });

        // Return a graceful fallback if Notion is unavailable
        res.status(503).json({
            success: false,
            error: 'Unable to fetch bug data from Notion',
            message: error.message,
            fallback: true
        });
    }
});

/**
 * GET /api/bugs
 * Returns list of bugs with optional filtering and pagination
 * Query params:
 *   - status: Filter by status
 *   - severity: Filter by severity
 *   - page_size: Number of results per page (default 25, max 100)
 *   - cursor: Pagination cursor from previous response
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const { status, severity, page_size = 25, cursor } = req.query;
        const pageSize = Math.min(parseInt(page_size) || 25, 100);

        // Build filter if needed
        let filter = null;
        const conditions = [];

        if (status) {
            conditions.push({
                property: 'Status',
                select: { equals: status }
            });
        }

        if (severity) {
            conditions.push({
                property: 'Severity',
                select: { equals: severity }
            });
        }

        if (conditions.length === 1) {
            filter = conditions[0];
        } else if (conditions.length > 1) {
            filter = { and: conditions };
        }

        // Query with sorting and pagination
        const result = await queryBugTracker(
            filter,
            [{ property: 'Date Reported', direction: 'descending' }],
            { pageSize, startCursor: cursor || null }
        );

        // Transform bugs for response
        const bugs = (result.results || []).map(bug => {
            const props = bug.properties || {};
            return {
                id: bug.id,
                title: props['Bug Title']?.title?.[0]?.plain_text || 'Untitled',
                status: props.Status?.select?.name || null,
                severity: props.Severity?.select?.name || null,
                priority: props.Priority?.select?.name || null,
                module: props['I360 Module']?.select?.name || null,
                dateReported: props['Date Reported']?.date?.start || null,
                dateResolved: props['Date Resolved']?.date?.start || null,
                url: bug.url
            };
        });

        res.json({
            success: true,
            count: bugs.length,
            bugs,
            hasMore: result.has_more || false,
            nextCursor: result.next_cursor || null
        });

    } catch (error) {
        logger.error('Error fetching bugs from Notion', { error: error.message });
        res.status(503).json({
            success: false,
            error: 'Unable to fetch bugs from Notion',
            message: error.message
        });
    }
});

/**
 * GET /api/bugs/open
 * Returns only open (non-resolved) bugs
 */
router.get('/open', requireAuth, async (req, res) => {
    try {
        const filter = {
            and: [
                {
                    property: 'Status',
                    select: { does_not_equal: 'Resolved' }
                },
                {
                    property: 'Status',
                    select: { does_not_equal: 'Closed' }
                },
                {
                    property: 'Status',
                    select: { does_not_equal: "Won't Fix" }
                }
            ]
        };

        const result = await queryBugTracker(filter, [
            { property: 'Priority', direction: 'ascending' },
            { property: 'Severity', direction: 'ascending' }
        ]);

        const bugs = (result.results || []).map(bug => {
            const props = bug.properties || {};
            return {
                id: bug.id,
                title: props['Bug Title']?.title?.[0]?.plain_text || 'Untitled',
                status: props.Status?.select?.name || null,
                severity: props.Severity?.select?.name || null,
                priority: props.Priority?.select?.name || null,
                module: props['I360 Module']?.select?.name || null,
                url: bug.url
            };
        });

        res.json({
            success: true,
            count: bugs.length,
            bugs
        });

    } catch (error) {
        logger.error('Error fetching open bugs', { error: error.message });
        res.status(503).json({
            success: false,
            error: 'Unable to fetch open bugs',
            message: error.message
        });
    }
});

/**
 * POST /api/bugs
 * Create a new bug in Notion
 * Body: { title, severity, priority, module, description, stepsToReproduce }
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const { title, severity, priority, module, description, stepsToReproduce } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                error: 'Title is required'
            });
        }

        // Build Notion page properties
        const properties = {
            'Bug Title': {
                title: [{ text: { content: title } }]
            },
            'Status': {
                select: { name: 'New' }
            },
            'Date Reported': {
                date: { start: new Date().toISOString().split('T')[0] }
            }
        };

        // Add optional properties
        if (severity) {
            properties['Severity'] = { select: { name: severity } };
        }
        if (priority) {
            properties['Priority'] = { select: { name: priority } };
        }
        if (module) {
            properties['I360 Module'] = { select: { name: module } };
        }

        // Build children blocks for description and steps
        const children = [];
        if (description) {
            children.push({
                object: 'block',
                type: 'heading_2',
                heading_2: {
                    rich_text: [{ type: 'text', text: { content: 'Description' } }]
                }
            });
            children.push({
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [{ type: 'text', text: { content: description } }]
                }
            });
        }
        if (stepsToReproduce) {
            children.push({
                object: 'block',
                type: 'heading_2',
                heading_2: {
                    rich_text: [{ type: 'text', text: { content: 'Steps to Reproduce' } }]
                }
            });
            children.push({
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [{ type: 'text', text: { content: stepsToReproduce } }]
                }
            });
        }

        // Create page in Notion
        const body = {
            parent: { database_id: NOTION_BUG_TRACKER_ID },
            properties
        };
        if (children.length > 0) {
            body.children = children;
        }

        const result = await notionRequest('/pages', 'POST', body);

        // Invalidate cache since we modified data
        invalidateCache();

        logger.info('Bug created in Notion', { bugId: result.id, title });

        res.status(201).json({
            success: true,
            bug: {
                id: result.id,
                title,
                status: 'New',
                severity: severity || null,
                priority: priority || null,
                module: module || null,
                url: result.url
            }
        });

    } catch (error) {
        logger.error('Error creating bug in Notion', { error: error.message });
        res.status(503).json({
            success: false,
            error: 'Unable to create bug in Notion',
            message: error.message
        });
    }
});

/**
 * PATCH /api/bugs/:id
 * Update an existing bug in Notion
 * Body: { status, severity, priority, module, dateResolved }
 */
router.patch('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, severity, priority, module, dateResolved } = req.body;

        // Build properties to update
        const properties = {};

        if (status) {
            properties['Status'] = { select: { name: status } };
        }
        if (severity) {
            properties['Severity'] = { select: { name: severity } };
        }
        if (priority) {
            properties['Priority'] = { select: { name: priority } };
        }
        if (module) {
            properties['I360 Module'] = { select: { name: module } };
        }
        if (dateResolved) {
            properties['Date Resolved'] = { date: { start: dateResolved } };
        }

        // Auto-set Date Resolved when status changes to Resolved or Closed
        if ((status === 'Resolved' || status === 'Closed') && !dateResolved) {
            properties['Date Resolved'] = { date: { start: new Date().toISOString().split('T')[0] } };
        }

        if (Object.keys(properties).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid properties to update'
            });
        }

        // Update page in Notion
        const result = await notionRequest(`/pages/${id}`, 'PATCH', { properties });

        // Invalidate cache since we modified data
        invalidateCache();

        // Extract updated properties for response
        const props = result.properties || {};
        const updatedBug = {
            id: result.id,
            title: props['Bug Title']?.title?.[0]?.plain_text || 'Untitled',
            status: props.Status?.select?.name || null,
            severity: props.Severity?.select?.name || null,
            priority: props.Priority?.select?.name || null,
            module: props['I360 Module']?.select?.name || null,
            dateResolved: props['Date Resolved']?.date?.start || null,
            url: result.url
        };

        logger.info('Bug updated in Notion', { bugId: id, updates: Object.keys(properties) });

        res.json({
            success: true,
            bug: updatedBug
        });

    } catch (error) {
        logger.error('Error updating bug in Notion', { error: error.message, bugId: req.params.id });
        res.status(503).json({
            success: false,
            error: 'Unable to update bug in Notion',
            message: error.message
        });
    }
});

/**
 * GET /api/bugs/:id
 * Get a single bug by ID
 */
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await notionRequest(`/pages/${id}`, 'GET');

        const props = result.properties || {};
        const bug = {
            id: result.id,
            title: props['Bug Title']?.title?.[0]?.plain_text || 'Untitled',
            status: props.Status?.select?.name || null,
            severity: props.Severity?.select?.name || null,
            priority: props.Priority?.select?.name || null,
            module: props['I360 Module']?.select?.name || null,
            dateReported: props['Date Reported']?.date?.start || null,
            dateResolved: props['Date Resolved']?.date?.start || null,
            url: result.url
        };

        res.json({
            success: true,
            bug
        });

    } catch (error) {
        logger.error('Error fetching bug from Notion', { error: error.message, bugId: req.params.id });
        res.status(503).json({
            success: false,
            error: 'Unable to fetch bug from Notion',
            message: error.message
        });
    }
});

// Export router and cache utilities
router.invalidateCache = invalidateCache;
module.exports = router;
