/**
 * INSIGHT 360 - OAuth Routes
 * Version: 1.0.0
 *
 * Handles OAuth authentication flows for social platform connections.
 * Currently supports: LinkedIn
 * Future: X/Twitter, Substack, Buffer
 */

const express = require('express');
const linkedinService = require('../services/linkedinService');
const logger = require('../services/logger');

/**
 * OAuth Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
module.exports = function(supabase) {
    const router = express.Router();

    // ============================================================================
    // LINKEDIN OAUTH
    // ============================================================================

    /**
     * GET /api/oauth/linkedin/authorize
     * Start LinkedIn OAuth flow - returns authorization URL
     */
    router.get('/linkedin/authorize', (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            // Check if LinkedIn credentials are configured
            if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
                return res.status(503).json({
                    error: 'LinkedIn integration not configured',
                    details: 'LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET environment variables are required'
                });
            }

            const { url, state } = linkedinService.getAuthUrl(userId);

            logger.info('[OAuth] LinkedIn authorization URL generated for user:', userId);

            res.json({
                authUrl: url,
                state  // Client may need to store for CSRF verification
            });
        } catch (err) {
            logger.error('[OAuth] Error generating LinkedIn auth URL:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/oauth/linkedin/callback
     * Handle LinkedIn OAuth callback
     */
    router.get('/linkedin/callback', async (req, res) => {
        try {
            const { code, state, error, error_description } = req.query;

            // Handle OAuth errors from LinkedIn
            if (error) {
                logger.error('[OAuth] LinkedIn returned error:', error, error_description);
                return res.redirect(`/profile.html?oauth_error=${encodeURIComponent(error_description || error)}`);
            }

            if (!code || !state) {
                return res.redirect('/profile.html?oauth_error=missing_parameters');
            }

            // Verify state and extract userId
            let stateData;
            try {
                stateData = linkedinService.verifyState(state);
            } catch (stateErr) {
                logger.error('[OAuth] State verification failed:', stateErr);
                return res.redirect('/profile.html?oauth_error=invalid_state');
            }

            const userId = stateData.userId;

            // Exchange code for tokens
            const tokens = await linkedinService.exchangeCodeForTokens(code);

            // Get user info from LinkedIn
            const userInfo = await linkedinService.getUserInfo(tokens.accessToken);

            // Store connection
            await linkedinService.storeConnection(userId, tokens, userInfo);

            logger.info('[OAuth] LinkedIn connected successfully for user:', userId);

            // Redirect to profile page with success message
            res.redirect('/profile.html?oauth_success=linkedin');
        } catch (err) {
            logger.error('[OAuth] LinkedIn callback error:', err);
            res.redirect(`/profile.html?oauth_error=${encodeURIComponent(err.message)}`);
        }
    });

    /**
     * DELETE /api/oauth/linkedin/disconnect
     * Disconnect LinkedIn account
     */
    router.delete('/linkedin/disconnect', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            await linkedinService.disconnectLinkedIn(userId);

            logger.info('[OAuth] LinkedIn disconnected for user:', userId);

            res.json({ success: true, message: 'LinkedIn disconnected successfully' });
        } catch (err) {
            logger.error('[OAuth] Error disconnecting LinkedIn:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/oauth/linkedin/status
     * Check LinkedIn connection status
     */
    router.get('/linkedin/status', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const connection = await linkedinService.getConnection(userId);

            if (!connection) {
                return res.json({
                    connected: false,
                    platform: 'linkedin'
                });
            }

            res.json({
                connected: true,
                platform: 'linkedin',
                status: connection.status,
                username: connection.platform_username,
                profileUrl: connection.platform_profile_url,
                lastUsed: connection.last_used_at,
                connectedAt: connection.created_at
            });
        } catch (err) {
            logger.error('[OAuth] Error checking LinkedIn status:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // ============================================================================
    // GENERAL CONNECTION MANAGEMENT
    // ============================================================================

    /**
     * GET /api/oauth/connections
     * Get all social platform connections for user
     */
    router.get('/connections', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];

            // Available platforms info (always returned)
            const availablePlatforms = [
                {
                    id: 'linkedin',
                    name: 'LinkedIn',
                    configured: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
                    description: 'Share thought leadership content to LinkedIn'
                },
                {
                    id: 'x',
                    name: 'X (Twitter)',
                    configured: false,
                    description: 'Coming soon - Share threads and posts to X'
                },
                {
                    id: 'substack',
                    name: 'Substack',
                    configured: false,
                    description: 'Coming soon - Publish newsletters to Substack'
                }
            ];

            // If no userId or invalid UUID format, return empty connections
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!userId || !uuidRegex.test(userId)) {
                return res.json({
                    connections: [],
                    availablePlatforms
                });
            }

            const connections = await linkedinService.getAllConnections(userId);

            res.json({
                connections,
                availablePlatforms
            });
        } catch (err) {
            logger.error('[OAuth] Error getting connections:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // ============================================================================
    // PLACEHOLDER ROUTES FOR FUTURE PLATFORMS
    // ============================================================================

    /**
     * GET /api/oauth/x/authorize
     * X (Twitter) - Placeholder
     */
    router.get('/x/authorize', (req, res) => {
        res.status(501).json({
            error: 'X (Twitter) integration coming soon',
            platform: 'x'
        });
    });

    /**
     * GET /api/oauth/substack/authorize
     * Substack - Placeholder
     */
    router.get('/substack/authorize', (req, res) => {
        res.status(501).json({
            error: 'Substack integration coming soon',
            platform: 'substack'
        });
    });

    return router;
};
