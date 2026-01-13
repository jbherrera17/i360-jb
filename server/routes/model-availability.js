/**
 * Model Availability Routes - Insight 360
 *
 * API endpoints for LLM provider availability checks.
 *
 * Endpoints:
 * - GET  /api/models/availability       - Get latest check results (any user)
 * - POST /api/models/availability/check - Trigger on-demand check (admin only)
 * - GET  /api/models/availability/config - Get scheduler config (admin only)
 * - PUT  /api/models/availability/config - Update scheduler config (admin only)
 *
 * Version: 1.0.0
 */

const express = require('express');
const router = express.Router();
const modelAvailabilityService = require('../services/modelAvailabilityService');
const { requireAdmin } = require('../middleware/auth');
const logger = require('../services/logger');

/**
 * GET /api/models/availability
 * Get the latest model availability check results
 * Available to all authenticated users
 */
router.get('/availability', async (req, res) => {
    try {
        const results = await modelAvailabilityService.getLastCheckResults();
        res.json(results);
    } catch (error) {
        logger.error('Failed to get model availability', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to get model availability status'
        });
    }
});

/**
 * POST /api/models/availability/check
 * Trigger an on-demand model availability check
 * Admin only
 */
router.post('/availability/check', requireAdmin, async (req, res) => {
    try {
        const results = await modelAvailabilityService.runCheck();
        res.json({
            success: true,
            message: 'Model availability check completed',
            ...results
        });
    } catch (error) {
        logger.error('Failed to run model availability check', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to run model availability check'
        });
    }
});

/**
 * GET /api/models/availability/config
 * Get scheduler configuration
 * Admin only
 */
router.get('/availability/config', requireAdmin, async (req, res) => {
    try {
        const result = await modelAvailabilityService.getConfig();
        res.json(result);
    } catch (error) {
        logger.error('Failed to get model check config', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to get scheduler configuration'
        });
    }
});

/**
 * PUT /api/models/availability/config
 * Update scheduler configuration
 * Admin only
 */
router.put('/availability/config', requireAdmin, async (req, res) => {
    try {
        const { schedule_time, timezone, is_enabled } = req.body;

        // Validate inputs
        if (schedule_time && !/^\d{2}:\d{2}(:\d{2})?$/.test(schedule_time)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid schedule_time format. Use HH:MM or HH:MM:SS'
            });
        }

        const updates = {};
        if (schedule_time !== undefined) updates.schedule_time = schedule_time;
        if (timezone !== undefined) updates.timezone = timezone;
        if (is_enabled !== undefined) updates.is_enabled = is_enabled;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid updates provided'
            });
        }

        const result = await modelAvailabilityService.updateConfig(updates);
        res.json(result);
    } catch (error) {
        logger.error('Failed to update model check config', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to update scheduler configuration'
        });
    }
});

module.exports = router;
