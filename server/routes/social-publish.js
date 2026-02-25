/**
 * INSIGHT 360 - Social Media Publishing API Routes
 * Phase 60: Postiz Integration
 *
 * Endpoints:
 *   - Configuration (2 endpoints)
 *   - Connected Accounts (3 endpoints)
 *   - Posts (5 endpoints)
 *   - Content Adaptation (2 endpoints)
 *   - Analytics (2 endpoints)
 *   - Media (1 endpoint)
 */

const express = require('express');
const postizService = require('../services/postizService');
const contentAdapter = require('../services/contentAdapterService');
const logger = require('../services/logger');

module.exports = function(supabase) {
    const router = express.Router();

    // Module access check for social_publishing
    router.use(async (req, res, next) => {
        try {
            const userId = req.userId;
            const orgId = req.headers['x-org-id'];

            if (!userId) {
                return next();
            }

            const { data: canAccess, error } = await supabase
                .rpc('can_access_module', {
                    p_user_id: userId,
                    p_module_id: 'social_publishing',
                    p_org_id: orgId || null
                });

            if (error) {
                logger.error('Social publishing module access check error:', error);
                return next();
            }

            if (canAccess === false) {
                return res.status(403).json({
                    error: 'Social Media Publishing requires a Business tier or higher subscription'
                });
            }

            next();
        } catch (err) {
            logger.error('Social publishing access middleware error:', err);
            next();
        }
    });

    // ============================================
    // Configuration
    // ============================================

    /**
     * GET /api/social/config
     * Check if social publishing is configured for the org
     */
    router.get('/config', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'];
            if (!orgId) {
                return res.status(400).json({ error: 'Organization ID required (x-org-id header)' });
            }

            const configured = await postizService.isConfigured(orgId);
            const platforms = contentAdapter.getSupportedPlatforms();

            res.json({
                configured,
                supportedPlatforms: platforms,
                platformLimits: contentAdapter.getPlatformLimits()
            });
        } catch (err) {
            logger.error('Social config check error:', err);
            res.status(500).json({ error: 'Failed to check social publishing configuration' });
        }
    });

    /**
     * GET /api/social/usage
     * Get current usage vs limits for social publishing
     */
    router.get('/usage', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'];
            if (!orgId) {
                return res.status(400).json({ error: 'Organization ID required' });
            }

            const [postResult, channelResult] = await Promise.all([
                supabase.rpc('check_org_limits', { p_org_id: orgId, p_resource_type: 'social_posts' }),
                supabase.rpc('check_org_limits', { p_org_id: orgId, p_resource_type: 'social_channels' })
            ]);

            res.json({
                posts: postResult.data?.[0] || { current_count: 0, max_allowed: 0, within_limits: false, usage_percent: 0 },
                channels: channelResult.data?.[0] || { current_count: 0, max_allowed: 0, within_limits: false, usage_percent: 0 }
            });
        } catch (err) {
            logger.error('Social usage check error:', err);
            res.status(500).json({ error: 'Failed to check usage limits' });
        }
    });

    /**
     * POST /api/social/config
     * Configure Postiz for an organization (admin only)
     */
    router.post('/config', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'];
            const userId = req.userId;

            if (!orgId) {
                return res.status(400).json({ error: 'Organization ID required' });
            }

            // Check admin permission
            const { data: member } = await supabase
                .from('org_members')
                .select('business_role')
                .eq('user_id', userId)
                .eq('org_id', orgId)
                .single();

            if (!member || !['owner', 'admin'].includes(member.business_role)) {
                return res.status(403).json({ error: 'Admin access required to configure social publishing' });
            }

            const { postizOrgId, apiKey } = req.body;
            if (!postizOrgId || !apiKey) {
                return res.status(400).json({ error: 'postizOrgId and apiKey are required' });
            }

            await postizService.configureOrg(orgId, postizOrgId, apiKey);

            res.json({ success: true, message: 'Social publishing configured' });
        } catch (err) {
            logger.error('Social config error:', err);
            res.status(500).json({ error: 'Failed to configure social publishing' });
        }
    });

    // ============================================
    // Connected Accounts
    // ============================================

    /**
     * GET /api/social/accounts
     * List connected social platform accounts
     */
    router.get('/accounts', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'];
            if (!orgId) {
                return res.status(400).json({ error: 'Organization ID required' });
            }

            const accounts = await postizService.getConnectedPlatforms(orgId);
            const supportedPlatforms = contentAdapter.getSupportedPlatforms();

            // Merge connection status with supported platforms list
            const platformStatus = supportedPlatforms.map(p => {
                const connection = accounts.find(a => a.platform === p.id);
                return {
                    ...p,
                    connected: !!connection,
                    accountName: connection?.platform_account_name || null,
                    status: connection?.status || 'disconnected',
                    lastUsed: connection?.last_used_at || null
                };
            });

            res.json({ platforms: platformStatus, connected: accounts });
        } catch (err) {
            logger.error('Social accounts error:', err);
            res.status(500).json({ error: 'Failed to fetch connected accounts' });
        }
    });

    /**
     * POST /api/social/accounts/sync
     * Sync connected accounts from Postiz
     */
    router.post('/accounts/sync', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'];
            const userId = req.userId;

            if (!orgId) {
                return res.status(400).json({ error: 'Organization ID required' });
            }

            // Check channel limit before syncing new connections
            const { data: channelLimit } = await supabase
                .rpc('check_org_limits', { p_org_id: orgId, p_resource_type: 'social_channels' });

            const integrations = await postizService.syncIntegrations(orgId, userId);

            // Warn if at or near channel limit
            const channelWarning = channelLimit?.[0] && channelLimit[0].usage_percent >= 80
                ? { warning: `Using ${channelLimit[0].current_count} of ${channelLimit[0].max_allowed} channels` }
                : {};

            res.json({
                success: true,
                synced: integrations.length,
                integrations,
                ...channelWarning
            });
        } catch (err) {
            logger.error('Social sync error:', err);
            res.status(500).json({ error: 'Failed to sync social accounts' });
        }
    });

    /**
     * GET /api/social/accounts/oauth-url/:platform
     * Get OAuth URL for connecting a new platform (proxied through Postiz)
     */
    router.get('/accounts/oauth-url/:platform', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'];
            if (!orgId) {
                return res.status(400).json({ error: 'Organization ID required' });
            }

            const configured = await postizService.isConfigured(orgId);
            if (!configured) {
                return res.status(400).json({ error: 'Social publishing not configured. Contact your admin.' });
            }

            // Return the Postiz OAuth connection URL for the platform
            // Users will be redirected to Postiz's OAuth flow
            const postizUrl = process.env.POSTIZ_FRONTEND_URL || process.env.POSTIZ_API_URL;
            const oauthUrl = `${postizUrl}/integrations/social/${req.params.platform}`;

            res.json({ url: oauthUrl, platform: req.params.platform });
        } catch (err) {
            logger.error('Social OAuth URL error:', err);
            res.status(500).json({ error: 'Failed to generate OAuth URL' });
        }
    });

    // ============================================
    // Posts
    // ============================================

    /**
     * POST /api/social/posts
     * Create and optionally schedule a social media post
     */
    router.post('/posts', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'];
            const userId = req.userId;

            if (!orgId) {
                return res.status(400).json({ error: 'Organization ID required' });
            }

            const { platforms, content, mediaUrls, scheduledAt, sourceType, sourceId, hashtags, articleUrl, articleTitle } = req.body;

            if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
                return res.status(400).json({ error: 'At least one platform is required' });
            }
            if (!content) {
                return res.status(400).json({ error: 'Content is required' });
            }

            // Check post volume limit
            const { data: postLimit } = await supabase
                .rpc('check_org_limits', { p_org_id: orgId, p_resource_type: 'social_posts' });
            if (postLimit && postLimit[0] && !postLimit[0].within_limits) {
                return res.status(429).json({
                    error: 'Monthly post limit reached',
                    current: postLimit[0].current_count,
                    limit: postLimit[0].max_allowed,
                    upgradeMessage: 'Upgrade your plan for more social media posts'
                });
            }

            // Adapt content for each platform
            const platformContent = contentAdapter.adaptForAllPlatforms(content, platforms, {
                hashtags: hashtags || [],
                articleUrl,
                articleTitle,
                mediaUrls: mediaUrls || []
            });

            const post = await postizService.createPost(orgId, userId, {
                platforms,
                content,
                mediaUrls: mediaUrls || [],
                scheduledAt: scheduledAt || null,
                platformContent,
                sourceType: sourceType || 'manual',
                sourceId: sourceId || null
            });

            res.status(201).json(post);
        } catch (err) {
            logger.error('Social post creation error:', err);
            res.status(500).json({ error: err.message || 'Failed to create post' });
        }
    });

    /**
     * GET /api/social/posts
     * List posts for the organization
     */
    router.get('/posts', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'];
            if (!orgId) {
                return res.status(400).json({ error: 'Organization ID required' });
            }

            const { status, platform, limit } = req.query;
            const posts = await postizService.getPosts(orgId, {
                status,
                platform,
                limit: limit ? parseInt(limit) : 50
            });

            res.json({ posts, total: posts.length });
        } catch (err) {
            logger.error('Social posts list error:', err);
            res.status(500).json({ error: 'Failed to fetch posts' });
        }
    });

    /**
     * GET /api/social/posts/:id
     * Get a single post with analytics
     */
    router.get('/posts/:id', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'];
            if (!orgId) {
                return res.status(400).json({ error: 'Organization ID required' });
            }

            const post = await postizService.getPost(orgId, req.params.id);
            if (!post) {
                return res.status(404).json({ error: 'Post not found' });
            }

            res.json(post);
        } catch (err) {
            logger.error('Social post fetch error:', err);
            res.status(500).json({ error: 'Failed to fetch post' });
        }
    });

    /**
     * DELETE /api/social/posts/:id
     * Cancel a scheduled post
     */
    router.delete('/posts/:id', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'];
            if (!orgId) {
                return res.status(400).json({ error: 'Organization ID required' });
            }

            const post = await postizService.cancelPost(orgId, req.params.id);
            res.json({ success: true, post });
        } catch (err) {
            logger.error('Social post cancel error:', err);
            res.status(500).json({ error: 'Failed to cancel post' });
        }
    });

    /**
     * GET /api/social/posts/scheduled
     * Get scheduled posts from Postiz
     */
    router.get('/scheduled', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'];
            if (!orgId) {
                return res.status(400).json({ error: 'Organization ID required' });
            }

            const { from, to } = req.query;
            const scheduled = await postizService.getScheduledPosts(orgId, { from, to });
            res.json(scheduled);
        } catch (err) {
            logger.error('Social scheduled posts error:', err);
            res.status(500).json({ error: 'Failed to fetch scheduled posts' });
        }
    });

    // ============================================
    // Content Adaptation
    // ============================================

    /**
     * POST /api/social/adapt
     * Preview content adapted for specific platforms
     */
    router.post('/adapt', async (req, res) => {
        try {
            const { content, platforms, hashtags, articleUrl, articleTitle, mediaUrls } = req.body;

            if (!content || !platforms) {
                return res.status(400).json({ error: 'content and platforms are required' });
            }

            const adapted = contentAdapter.adaptForAllPlatforms(content, platforms, {
                hashtags: hashtags || [],
                articleUrl,
                articleTitle,
                mediaUrls: mediaUrls || []
            });

            res.json({ adapted });
        } catch (err) {
            logger.error('Content adaptation error:', err);
            res.status(500).json({ error: 'Failed to adapt content' });
        }
    });

    /**
     * GET /api/social/platforms
     * Get supported platforms and their limits
     */
    router.get('/platforms', (req, res) => {
        res.json({
            platforms: contentAdapter.getSupportedPlatforms(),
            limits: contentAdapter.getPlatformLimits()
        });
    });

    // ============================================
    // Analytics
    // ============================================

    /**
     * GET /api/social/analytics
     * Get social publishing analytics summary
     */
    router.get('/analytics', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'];
            if (!orgId) {
                return res.status(400).json({ error: 'Organization ID required' });
            }

            const days = parseInt(req.query.days) || 30;
            const summary = await postizService.getAnalyticsSummary(orgId, days);

            res.json(summary);
        } catch (err) {
            logger.error('Social analytics error:', err);
            res.status(500).json({ error: 'Failed to fetch analytics' });
        }
    });

    /**
     * GET /api/social/optimal-time/:platform
     * Get optimal posting time for a platform
     */
    router.get('/optimal-time/:platform', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'];
            if (!orgId) {
                return res.status(400).json({ error: 'Organization ID required' });
            }

            const connections = await postizService.getConnectedPlatforms(orgId);
            const connection = connections.find(c => c.platform === req.params.platform);

            if (!connection) {
                return res.status(404).json({ error: `${req.params.platform} not connected` });
            }

            const slot = await postizService.findOptimalSlot(orgId, connection.postiz_integration_id);
            res.json(slot);
        } catch (err) {
            logger.error('Optimal time error:', err);
            res.status(500).json({ error: 'Failed to find optimal posting time' });
        }
    });

    // ============================================
    // Media Upload
    // ============================================

    /**
     * POST /api/social/media
     * Upload media for social posts
     */
    router.post('/media', express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'];
            if (!orgId) {
                return res.status(400).json({ error: 'Organization ID required' });
            }

            const filename = req.headers['x-filename'] || 'upload';
            const mimeType = req.headers['content-type'] || 'application/octet-stream';

            const result = await postizService.uploadMedia(orgId, req.body, filename, mimeType);
            res.json(result);
        } catch (err) {
            logger.error('Media upload error:', err);
            res.status(500).json({ error: 'Failed to upload media' });
        }
    });

    return router;
};
