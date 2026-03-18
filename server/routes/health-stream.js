/**
 * Health Stream Routes - Insight 360
 * SSE endpoint for real-time LLM provider health status
 *
 * Version: 1.0.0
 */

const express = require('express');
const router = express.Router();
const { healthEventEmitter, getProviderStatusCache } = require('../services/modelAvailabilityService');

/**
 * GET /api/health/stream
 * Server-Sent Events endpoint for real-time health status updates
 */
router.get('/stream', (req, res) => {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send initial state
    const currentStatus = getProviderStatusCache();
    res.write(`event: init\ndata: ${JSON.stringify(currentStatus)}\n\n`);

    // Subscribe to status changes
    const onStatusChange = (event) => {
        if (!res.writableEnded) {
            res.write(`event: status-change\ndata: ${JSON.stringify(event)}\n\n`);
        }
    };
    healthEventEmitter.on('status-change', onStatusChange);

    // Heartbeat every 30s to keep connection alive
    const heartbeat = setInterval(() => {
        if (!res.writableEnded) {
            res.write(`:heartbeat\n\n`);
        }
    }, 30000);

    // Clean up on client disconnect
    req.on('close', () => {
        healthEventEmitter.off('status-change', onStatusChange);
        clearInterval(heartbeat);
    });
});

module.exports = router;
