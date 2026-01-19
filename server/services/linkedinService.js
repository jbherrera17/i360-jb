/**
 * INSIGHT 360 - LinkedIn Service
 * Version: 1.0.0
 *
 * Handles LinkedIn OAuth 2.0 authentication and content publishing via Share API.
 * Supports personal profile posting and optional organization page posting.
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const logger = require('./logger');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// LinkedIn API endpoints
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_API_URL = 'https://api.linkedin.com/v2';
const LINKEDIN_REST_API_URL = 'https://api.linkedin.com/rest';

// LinkedIn API version header
const LINKEDIN_API_VERSION = '202401';

// OAuth scopes required for posting
const LINKEDIN_SCOPES = [
    'openid',
    'profile',
    'email',
    'w_member_social'  // Required for posting
];

// Token encryption (using app-level key)
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY ?
    Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'hex') :
    crypto.randomBytes(32);

/**
 * Encrypt a token for database storage
 */
function encryptToken(token) {
    if (!token) return null;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a token from database storage
 */
function decryptToken(encryptedToken) {
    if (!encryptedToken) return null;

    try {
        const [ivHex, authTagHex, encrypted] = encryptedToken.split(':');

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        logger.error('[LinkedIn] Token decryption failed:', error);
        return null;
    }
}

/**
 * Generate a secure state parameter for OAuth
 */
function generateState(userId) {
    const stateData = {
        userId,
        timestamp: Date.now(),
        nonce: crypto.randomBytes(16).toString('hex')
    };
    return Buffer.from(JSON.stringify(stateData)).toString('base64url');
}

/**
 * Verify and decode state parameter
 */
function verifyState(state, maxAgeMs = 600000) {  // 10 minutes
    try {
        const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());

        if (Date.now() - stateData.timestamp > maxAgeMs) {
            throw new Error('State expired');
        }

        return stateData;
    } catch (error) {
        logger.error('[LinkedIn] State verification failed:', error);
        throw new Error('Invalid OAuth state');
    }
}

/**
 * Get OAuth authorization URL
 */
function getAuthUrl(userId) {
    const state = generateState(userId);

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.LINKEDIN_CLIENT_ID,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
        state: state,
        scope: LINKEDIN_SCOPES.join(' ')
    });

    return {
        url: `${LINKEDIN_AUTH_URL}?${params.toString()}`,
        state
    };
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code) {
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI
    });

    const response = await fetch(LINKEDIN_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('[LinkedIn] Token exchange failed:', error);
        throw new Error(`LinkedIn token exchange failed: ${response.status}`);
    }

    const tokens = await response.json();

    return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresIn: tokens.expires_in,
        scope: tokens.scope
    };
}

/**
 * Refresh an expired access token
 */
async function refreshAccessToken(refreshToken) {
    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET
    });

    const response = await fetch(LINKEDIN_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('[LinkedIn] Token refresh failed:', error);
        throw new Error('LinkedIn token refresh failed');
    }

    const tokens = await response.json();

    return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || refreshToken,
        expiresIn: tokens.expires_in
    };
}

/**
 * Get user's LinkedIn profile information
 */
async function getUserInfo(accessToken) {
    // Get basic profile using userinfo endpoint
    const response = await fetch(`${LINKEDIN_API_URL}/userinfo`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        const error = await response.text();
        logger.error('[LinkedIn] Failed to get user info:', error);
        throw new Error('Failed to get LinkedIn user info');
    }

    const userInfo = await response.json();

    return {
        sub: userInfo.sub,  // LinkedIn member ID
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture
    };
}

/**
 * Store OAuth connection in database
 */
async function storeConnection(userId, tokens, userInfo) {
    // Calculate token expiry
    const expiresAt = new Date(Date.now() + (tokens.expiresIn * 1000));

    const connectionData = {
        user_id: userId,
        platform: 'linkedin',
        platform_user_id: userInfo.sub,
        platform_username: userInfo.name,
        platform_profile_url: `https://www.linkedin.com/in/${userInfo.sub}`,
        access_token_encrypted: encryptToken(tokens.accessToken),
        refresh_token_encrypted: encryptToken(tokens.refreshToken),
        token_expires_at: expiresAt.toISOString(),
        scopes: LINKEDIN_SCOPES,
        linkedin_person_urn: `urn:li:person:${userInfo.sub}`,
        status: 'active',
        last_used_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('social_connections')
        .upsert(connectionData, { onConflict: 'user_id,platform' })
        .select()
        .single();

    if (error) {
        logger.error('[LinkedIn] Failed to store connection:', error);
        throw error;
    }

    return data;
}

/**
 * Get stored connection for a user
 */
async function getConnection(userId) {
    const { data, error } = await supabase
        .from('social_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', 'linkedin')
        .single();

    if (error && error.code !== 'PGRST116') {  // Not found is OK
        logger.error('[LinkedIn] Failed to get connection:', error);
        throw error;
    }

    return data;
}

/**
 * Get valid access token (refresh if needed)
 */
async function getValidAccessToken(userId) {
    const connection = await getConnection(userId);

    if (!connection) {
        throw new Error('LinkedIn not connected');
    }

    if (connection.status !== 'active') {
        throw new Error(`LinkedIn connection status: ${connection.status}`);
    }

    const accessToken = decryptToken(connection.access_token_encrypted);
    const tokenExpiry = new Date(connection.token_expires_at);

    // Refresh if token expires in less than 5 minutes
    if (tokenExpiry < new Date(Date.now() + 5 * 60 * 1000)) {
        const refreshToken = decryptToken(connection.refresh_token_encrypted);

        if (!refreshToken) {
            // Update status to expired
            await supabase
                .from('social_connections')
                .update({ status: 'expired' })
                .eq('id', connection.id);

            throw new Error('LinkedIn token expired and no refresh token available');
        }

        try {
            const newTokens = await refreshAccessToken(refreshToken);

            // Update stored tokens
            const expiresAt = new Date(Date.now() + (newTokens.expiresIn * 1000));

            await supabase
                .from('social_connections')
                .update({
                    access_token_encrypted: encryptToken(newTokens.accessToken),
                    refresh_token_encrypted: encryptToken(newTokens.refreshToken),
                    token_expires_at: expiresAt.toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', connection.id);

            return newTokens.accessToken;
        } catch (refreshError) {
            // Update status to error
            await supabase
                .from('social_connections')
                .update({
                    status: 'error',
                    last_error: refreshError.message
                })
                .eq('id', connection.id);

            throw refreshError;
        }
    }

    return accessToken;
}

/**
 * Publish a post to LinkedIn
 *
 * @param {string} userId - User ID
 * @param {string} text - Post content (max 3000 chars)
 * @param {Object} options - Additional options
 * @param {string} options.imageUrl - Optional image URL to attach
 * @param {string} options.articleUrl - Optional article link
 * @param {string} options.articleTitle - Title for article link
 * @param {string} options.visibility - PUBLIC (default), CONNECTIONS
 */
async function publishPost(userId, text, options = {}) {
    const {
        imageUrl = null,
        articleUrl = null,
        articleTitle = null,
        visibility = 'PUBLIC'
    } = options;

    const accessToken = await getValidAccessToken(userId);
    const connection = await getConnection(userId);

    const personUrn = connection.linkedin_person_urn;

    // Build the share content
    const shareContent = {
        author: personUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
            'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                    text: text.substring(0, 3000)  // LinkedIn's max
                },
                shareMediaCategory: 'NONE'
            }
        },
        visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': visibility
        }
    };

    // Add article link if provided
    if (articleUrl) {
        shareContent.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
        shareContent.specificContent['com.linkedin.ugc.ShareContent'].media = [{
            status: 'READY',
            originalUrl: articleUrl,
            title: {
                text: articleTitle || 'Read more'
            }
        }];
    }

    // Make the API request
    const response = await fetch(`${LINKEDIN_API_URL}/ugcPosts`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify(shareContent)
    });

    if (!response.ok) {
        const errorText = await response.text();
        logger.error('[LinkedIn] Post failed:', errorText);

        // Update last error
        await supabase
            .from('social_connections')
            .update({ last_error: errorText })
            .eq('user_id', userId)
            .eq('platform', 'linkedin');

        throw new Error(`LinkedIn post failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Extract post ID from response
    const postId = result.id || response.headers.get('X-RestLi-Id');

    // Update last used timestamp
    await supabase
        .from('social_connections')
        .update({
            last_used_at: new Date().toISOString(),
            last_error: null
        })
        .eq('user_id', userId)
        .eq('platform', 'linkedin');

    logger.info('[LinkedIn] Post published successfully:', postId);

    return {
        success: true,
        postId,
        postUrl: postId ? `https://www.linkedin.com/feed/update/${postId}` : null
    };
}

/**
 * Delete (revoke) a LinkedIn connection
 */
async function disconnectLinkedIn(userId) {
    const { error } = await supabase
        .from('social_connections')
        .delete()
        .eq('user_id', userId)
        .eq('platform', 'linkedin');

    if (error) {
        logger.error('[LinkedIn] Failed to disconnect:', error);
        throw error;
    }

    return { success: true };
}

/**
 * Check if user has an active LinkedIn connection
 */
async function isConnected(userId) {
    const connection = await getConnection(userId);
    return connection && connection.status === 'active';
}

/**
 * Get all social connections for a user
 */
async function getAllConnections(userId) {
    const { data, error } = await supabase
        .from('social_connections')
        .select('id, platform, platform_username, platform_profile_url, status, last_used_at, created_at')
        .eq('user_id', userId);

    if (error) {
        logger.error('[LinkedIn] Failed to get connections:', error);
        throw error;
    }

    return data || [];
}

module.exports = {
    // OAuth Flow
    getAuthUrl,
    exchangeCodeForTokens,
    refreshAccessToken,
    verifyState,

    // User Info
    getUserInfo,

    // Connection Management
    storeConnection,
    getConnection,
    getAllConnections,
    disconnectLinkedIn,
    isConnected,

    // Publishing
    publishPost,
    getValidAccessToken
};
