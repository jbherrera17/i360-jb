/**
 * Bug Tracker Routes - Insight 360
 * Integrates with Notion Bug Tracker database
 *
 * Provides:
 * - /api/bugs/summary - Bug counts by status and severity
 * - /api/bugs - List all bugs (paginated)
 *
 * Version: 1.0.0
 */

const express = require('express');
const router = express.Router();
const logger = require('../services/logger');

// Notion Bug Tracker Database ID
const NOTION_BUG_TRACKER_ID = '2e1baf03-1ec8-80ca-8ee7-e5f46449321b';

// Notion API configuration
const NOTION_API_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

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
 * Query the bug tracker database
 */
async function queryBugTracker(filter = null, sorts = null) {
    const body = {};
    if (filter) body.filter = filter;
    if (sorts) body.sorts = sorts;

    return notionRequest(`/databases/${NOTION_BUG_TRACKER_ID}/query`, 'POST', body);
}

/**
 * GET /api/bugs/summary
 * Returns aggregated bug statistics from Notion
 */
router.get('/summary', async (req, res) => {
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
 * Returns list of bugs with optional filtering
 */
router.get('/', async (req, res) => {
    try {
        const { status, severity, limit = 100 } = req.query;

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

        // Query with sorting by severity and date
        const result = await queryBugTracker(filter, [
            { property: 'Date Reported', direction: 'descending' }
        ]);

        // Transform bugs for response
        const bugs = (result.results || []).slice(0, parseInt(limit)).map(bug => {
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
            bugs
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
router.get('/open', async (req, res) => {
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

module.exports = router;
