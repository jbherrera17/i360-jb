/**
 * INSIGHT 360 - Context Injection API Routes
 * Phase 3 Step 3.9
 * 
 * Exposes context injection service via REST endpoints
 * Used by Agent Launcher and external integrations
 */

const express = require('express');
const router = express.Router();
const { 
    assembleContext, 
    getAvailableContext, 
    estimateTokens 
} = require('../services/contextInjection');

/**
 * Initialize routes with Supabase client
 */
module.exports = (supabase) => {

    // =========================================================================
    // CONTEXT ASSEMBLY ENDPOINTS
    // =========================================================================

    /**
     * POST /api/injection/assemble/:agentId
     * Assemble context for an agent
     */
    router.post('/assemble/:agentId', async (req, res) => {
        try {
            const { agentId } = req.params;
            const { maxTokens, userQuery, requestedAssets, format } = req.body;

            const result = await assembleContext(agentId, {
                maxTokens,
                userQuery,
                includeOnDemand: requestedAssets || [],
                format,
                returnDetails: true
            }, supabase);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Error assembling context:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/injection/preview/:agentId
     * Preview context assembly
     */
    router.get('/preview/:agentId', async (req, res) => {
        try {
            const { agentId } = req.params;
            const { maxTokens, userQuery, format } = req.query;

            const result = await assembleContext(agentId, {
                maxTokens: maxTokens ? parseInt(maxTokens) : 8000,
                userQuery: userQuery || '',
                format: format || 'markdown',
                returnDetails: true
            }, supabase);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Error previewing context:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/injection/available/:agentId
     * Get available context assets for an agent
     */
    router.get('/available/:agentId', async (req, res) => {
        try {
            const { agentId } = req.params;

            const result = await getAvailableContext(agentId, supabase);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Error getting available context:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/injection/estimate-tokens
     * Estimate token count for a text string
     */
    router.post('/estimate-tokens', async (req, res) => {
        try {
            const { text } = req.body;

            if (!text) {
                return res.status(400).json({
                    success: false,
                    error: 'text is required'
                });
            }

            const tokens = estimateTokens(text);

            res.json({
                success: true,
                data: {
                    text_length: text.length,
                    estimated_tokens: tokens
                }
            });

        } catch (error) {
            console.error('Error estimating tokens:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
};