/**
 * Insight 360 - Postiz Bridge Service
 * Phase 60: Social Media Publishing
 *
 * Wraps the Postiz REST API (/public/v1) for multi-platform social media
 * posting. Each organization gets its own Postiz org with an isolated API key.
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const logger = require('./logger');
const { withResilience } = require('./reliability');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Postiz API base URL (set via env, points to Railway internal network)
const POSTIZ_API_URL = process.env.POSTIZ_API_URL || 'http://localhost:3001';
const POSTIZ_API_VERSION = 'v1';

// Encryption (same pattern as linkedinService.js)
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY
    ? Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'hex')
    : crypto.randomBytes(32);

function encryptApiKey(apiKey) {
    if (!apiKey) return null;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptApiKey(encryptedKey) {
    if (!encryptedKey) return null;
    try {
        const [ivHex, authTagHex, encrypted] = encryptedKey.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        logger.error('[Postiz] API key decryption failed:', error);
        return null;
    }
}

/**
 * Get the Postiz API key for an organization
 */
async function getOrgApiKey(orgId) {
    const { data, error } = await supabase
        .from('organizations')
        .select('postiz_api_key_encrypted, postiz_org_id')
        .eq('id', orgId)
        .single();

    if (error || !data?.postiz_api_key_encrypted) {
        throw new Error('Social publishing not configured for this organization');
    }

    const apiKey = decryptApiKey(data.postiz_api_key_encrypted);
    if (!apiKey) {
        throw new Error('Failed to decrypt Postiz API key');
    }

    return { apiKey, postizOrgId: data.postiz_org_id };
}

/**
 * Make an authenticated request to the Postiz API
 */
async function postizRequest(orgId, method, path, body = null) {
    const { apiKey } = await getOrgApiKey(orgId);
    const url = `${POSTIZ_API_URL}/public/${POSTIZ_API_VERSION}${path}`;

    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    };

    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    return withResilience(
        async () => {
            const response = await fetch(url, options);

            if (!response.ok) {
                const errorText = await response.text();
                const error = new Error(`Postiz API error: ${response.status} - ${errorText}`);
                error.status = response.status;
                throw error;
            }

            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                return response.json();
            }
            return response.text();
        },
        {
            operationName: `Postiz ${method} ${path}`,
            timeout: 30000,
            circuitBreaker: 'postiz-api',
            retryOptions: { maxRetries: 2 }
        }
    );
}

// ============================================
// Organization Setup
// ============================================

/**
 * Store Postiz configuration for an organization
 */
async function configureOrg(orgId, postizOrgId, apiKey) {
    const encryptedKey = encryptApiKey(apiKey);

    const { error } = await supabase
        .from('organizations')
        .update({
            postiz_org_id: postizOrgId,
            postiz_api_key_encrypted: encryptedKey
        })
        .eq('id', orgId);

    if (error) {
        logger.error('[Postiz] Failed to configure org:', error);
        throw error;
    }

    logger.info(`[Postiz] Configured org ${orgId} with Postiz org ${postizOrgId}`);
    return { success: true };
}

/**
 * Check if an organization has Postiz configured
 */
async function isConfigured(orgId) {
    const { data } = await supabase
        .from('organizations')
        .select('postiz_org_id, postiz_api_key_encrypted')
        .eq('id', orgId)
        .single();

    return !!(data?.postiz_org_id && data?.postiz_api_key_encrypted);
}

// ============================================
// Integrations (Connected Accounts)
// ============================================

/**
 * Get all connected social platform integrations
 */
async function getIntegrations(orgId) {
    return postizRequest(orgId, 'GET', '/integrations');
}

/**
 * Sync Postiz integrations with local social_platform_connections table
 */
async function syncIntegrations(orgId, userId) {
    const integrations = await getIntegrations(orgId);

    if (!Array.isArray(integrations)) {
        return [];
    }

    // Upsert each integration into our local table
    for (const integration of integrations) {
        const { error } = await supabase
            .from('social_platform_connections')
            .upsert({
                org_id: orgId,
                connected_by: userId,
                platform: integration.identifier || integration.type,
                platform_account_id: integration.id,
                platform_account_name: integration.name || integration.username,
                platform_profile_url: integration.profile || null,
                postiz_integration_id: integration.id,
                status: 'active',
                last_used_at: new Date().toISOString()
            }, {
                onConflict: 'org_id,platform,platform_account_id'
            });

        if (error) {
            logger.warn(`[Postiz] Failed to sync integration ${integration.id}:`, error);
        }
    }

    return integrations;
}

/**
 * Get connected platforms for an org (from local cache)
 */
async function getConnectedPlatforms(orgId) {
    const { data, error } = await supabase
        .from('social_platform_connections')
        .select('*')
        .eq('org_id', orgId)
        .eq('status', 'active')
        .order('platform');

    if (error) {
        logger.error('[Postiz] Failed to get connected platforms:', error);
        throw error;
    }

    return data || [];
}

// ============================================
// Post Creation & Scheduling
// ============================================

/**
 * Create and optionally schedule a post across platforms
 *
 * @param {string} orgId - Organization ID
 * @param {string} userId - User creating the post
 * @param {Object} params - Post parameters
 * @param {string[]} params.platforms - Platform identifiers to post to
 * @param {string} params.content - Post content text
 * @param {string[]} params.mediaUrls - Media file URLs
 * @param {string} params.scheduledAt - ISO 8601 date for scheduling (null = publish now)
 * @param {Object} params.platformContent - Per-platform adapted content
 * @param {string} params.sourceType - Content source (manual, thought_leadership, workflow)
 * @param {string} params.sourceId - Source entity ID
 */
async function createPost(orgId, userId, params) {
    const {
        platforms,
        content,
        mediaUrls = [],
        scheduledAt = null,
        platformContent = {},
        sourceType = 'manual',
        sourceId = null
    } = params;

    // Get integration IDs for the target platforms
    const connections = await getConnectedPlatforms(orgId);
    const targetIntegrations = connections.filter(c =>
        platforms.includes(c.platform)
    );

    if (targetIntegrations.length === 0) {
        throw new Error('No connected accounts found for the selected platforms');
    }

    // Build Postiz post payload
    const postizPayload = {
        type: scheduledAt ? 'schedule' : 'now',
        date: scheduledAt || new Date().toISOString(),
        posts: targetIntegrations.map(integration => ({
            integration: integration.postiz_integration_id,
            content: platformContent[integration.platform] || content,
            media: mediaUrls.map(url => ({ url }))
        }))
    };

    // Create post in Postiz
    const postizResult = await postizRequest(orgId, 'POST', '/posts', postizPayload);

    // Store in our local table
    const { data: localPost, error } = await supabase
        .from('social_posts')
        .insert({
            org_id: orgId,
            user_id: userId,
            content_text: content,
            media_urls: mediaUrls,
            platforms,
            platform_content: platformContent,
            status: scheduledAt ? 'scheduled' : 'publishing',
            scheduled_at: scheduledAt,
            postiz_post_id: postizResult?.id || null,
            source_type: sourceType,
            source_id: sourceId
        })
        .select()
        .single();

    if (error) {
        logger.error('[Postiz] Failed to store local post:', error);
        throw error;
    }

    logger.info(`[Postiz] Post created: ${localPost.id} -> Postiz ${postizResult?.id}`);

    return {
        ...localPost,
        postiz: postizResult
    };
}

/**
 * Get scheduled posts from Postiz
 */
async function getScheduledPosts(orgId, dateRange = {}) {
    let path = '/posts';
    const params = new URLSearchParams();
    if (dateRange.from) params.set('from', dateRange.from);
    if (dateRange.to) params.set('to', dateRange.to);

    const query = params.toString();
    if (query) path += `?${query}`;

    return postizRequest(orgId, 'GET', path);
}

/**
 * Cancel a scheduled post
 */
async function cancelPost(orgId, postId) {
    // Get local post to find Postiz ID
    const { data: post } = await supabase
        .from('social_posts')
        .select('postiz_post_id')
        .eq('id', postId)
        .eq('org_id', orgId)
        .single();

    if (post?.postiz_post_id) {
        try {
            await postizRequest(orgId, 'DELETE', `/posts/${post.postiz_post_id}`);
        } catch (err) {
            logger.warn(`[Postiz] Failed to delete remote post: ${err.message}`);
        }
    }

    // Update local status
    const { data, error } = await supabase
        .from('social_posts')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', postId)
        .eq('org_id', orgId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ============================================
// Media Upload
// ============================================

/**
 * Upload media to Postiz
 */
async function uploadMedia(orgId, fileBuffer, filename, mimeType) {
    const { apiKey } = await getOrgApiKey(orgId);
    const url = `${POSTIZ_API_URL}/public/${POSTIZ_API_VERSION}/upload`;

    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append('file', blob, filename);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`
        },
        body: formData
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Media upload failed: ${response.status} - ${errorText}`);
    }

    return response.json();
}

// ============================================
// Optimal Scheduling
// ============================================

/**
 * Find optimal posting slot for a channel
 */
async function findOptimalSlot(orgId, integrationId) {
    return postizRequest(orgId, 'GET', `/find-slot/${integrationId}`);
}

// ============================================
// Local Query Helpers
// ============================================

/**
 * Get posts for an organization with filtering
 */
async function getPosts(orgId, filters = {}) {
    let query = supabase
        .from('social_posts')
        .select('*, social_post_analytics(*)')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.platform) {
        query = query.contains('platforms', [filters.platform]);
    }
    if (filters.userId) {
        query = query.eq('user_id', filters.userId);
    }
    if (filters.limit) {
        query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

/**
 * Get post by ID
 */
async function getPost(orgId, postId) {
    const { data, error } = await supabase
        .from('social_posts')
        .select('*, social_post_analytics(*)')
        .eq('id', postId)
        .eq('org_id', orgId)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get publishing analytics summary for an org
 */
async function getAnalyticsSummary(orgId, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: posts, error } = await supabase
        .from('social_posts')
        .select('platforms, status, published_at, social_post_analytics(impressions, likes, comments, shares, clicks, reach)')
        .eq('org_id', orgId)
        .gte('created_at', since);

    if (error) throw error;

    const summary = {
        totalPosts: posts?.length || 0,
        published: 0,
        scheduled: 0,
        failed: 0,
        platformBreakdown: {},
        totalEngagement: { impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0, reach: 0 }
    };

    for (const post of (posts || [])) {
        if (post.status === 'published') summary.published++;
        if (post.status === 'scheduled') summary.scheduled++;
        if (post.status === 'failed') summary.failed++;

        for (const platform of (post.platforms || [])) {
            summary.platformBreakdown[platform] = (summary.platformBreakdown[platform] || 0) + 1;
        }

        for (const analytics of (post.social_post_analytics || [])) {
            summary.totalEngagement.impressions += analytics.impressions || 0;
            summary.totalEngagement.likes += analytics.likes || 0;
            summary.totalEngagement.comments += analytics.comments || 0;
            summary.totalEngagement.shares += analytics.shares || 0;
            summary.totalEngagement.clicks += analytics.clicks || 0;
            summary.totalEngagement.reach += analytics.reach || 0;
        }
    }

    return summary;
}

module.exports = {
    // Org Setup
    configureOrg,
    isConfigured,
    encryptApiKey,
    decryptApiKey,

    // Integrations
    getIntegrations,
    syncIntegrations,
    getConnectedPlatforms,

    // Posts
    createPost,
    getScheduledPosts,
    cancelPost,
    getPosts,
    getPost,

    // Media
    uploadMedia,

    // Scheduling
    findOptimalSlot,

    // Analytics
    getAnalyticsSummary
};
