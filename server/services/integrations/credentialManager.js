/**
 * INSIGHT 360 - Integration Credential Manager
 *
 * Handles encryption/decryption of OAuth tokens and API keys,
 * automatic token refresh, and credential lifecycle management.
 */

const crypto = require('crypto');
const logger = require('../logger');

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY
    ? Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'hex')
    : crypto.randomBytes(32);

// Refresh tokens 5 minutes before expiry
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

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
        logger.error('[CredentialManager] Token decryption failed:', error.message);
        return null;
    }
}

/**
 * Generate a secure OAuth state parameter
 */
function generateOAuthState(userId, providerSlug) {
    const payload = JSON.stringify({
        userId,
        provider: providerSlug,
        nonce: crypto.randomBytes(16).toString('hex'),
        ts: Date.now()
    });
    const hmac = crypto.createHmac('sha256', ENCRYPTION_KEY).update(payload).digest('hex');
    const encoded = Buffer.from(payload).toString('base64url');
    return `${encoded}.${hmac}`;
}

/**
 * Verify and decode an OAuth state parameter
 */
function verifyOAuthState(state) {
    try {
        const [encoded, hmac] = state.split('.');
        const payload = Buffer.from(encoded, 'base64url').toString('utf8');
        const expectedHmac = crypto.createHmac('sha256', ENCRYPTION_KEY).update(payload).digest('hex');

        if (!crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHmac, 'hex'))) {
            return null;
        }

        const data = JSON.parse(payload);

        // Reject states older than 15 minutes
        if (Date.now() - data.ts > 15 * 60 * 1000) {
            return null;
        }

        return data;
    } catch {
        return null;
    }
}

/**
 * Check if credentials need refresh and return usable credentials
 */
async function getCredentials(supabase, userId, providerSlug, refreshFn) {
    const { data: integration, error } = await supabase
        .from('user_integrations')
        .select('*, integration_providers!inner(slug)')
        .eq('user_id', userId)
        .eq('integration_providers.slug', providerSlug)
        .eq('status', 'active')
        .single();

    if (error || !integration) return null;

    const now = new Date();
    const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at) : null;

    // If token is still valid, return decrypted credentials
    if (!expiresAt || (expiresAt.getTime() - now.getTime()) > TOKEN_REFRESH_BUFFER_MS) {
        return {
            accessToken: decryptToken(integration.access_token_encrypted),
            refreshToken: decryptToken(integration.refresh_token_encrypted),
            apiKey: decryptToken(integration.api_key_encrypted),
            expiresAt,
            integrationId: integration.id,
            settings: integration.settings
        };
    }

    // Token needs refresh
    if (!refreshFn || !integration.refresh_token_encrypted) {
        // Mark as expired
        await supabase
            .from('user_integrations')
            .update({ status: 'expired', last_error: 'Token expired, no refresh available' })
            .eq('id', integration.id);
        return null;
    }

    try {
        const refreshToken = decryptToken(integration.refresh_token_encrypted);
        const newTokens = await refreshFn(refreshToken);

        await supabase
            .from('user_integrations')
            .update({
                access_token_encrypted: encryptToken(newTokens.access_token),
                refresh_token_encrypted: newTokens.refresh_token
                    ? encryptToken(newTokens.refresh_token)
                    : integration.refresh_token_encrypted,
                token_expires_at: newTokens.expires_at || new Date(Date.now() + (newTokens.expires_in || 3600) * 1000).toISOString(),
                error_count: 0,
                last_error: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', integration.id);

        return {
            accessToken: newTokens.access_token,
            refreshToken: newTokens.refresh_token || refreshToken,
            expiresAt: newTokens.expires_at,
            integrationId: integration.id,
            settings: integration.settings
        };
    } catch (err) {
        const newErrorCount = (integration.error_count || 0) + 1;
        const newStatus = newErrorCount >= 3 ? 'error' : integration.status;

        await supabase
            .from('user_integrations')
            .update({
                status: newStatus,
                error_count: newErrorCount,
                last_error: err.message,
                updated_at: new Date().toISOString()
            })
            .eq('id', integration.id);

        logger.error(`[CredentialManager] Token refresh failed for ${providerSlug}:`, err.message);
        return null;
    }
}

/**
 * Store new integration credentials
 */
async function storeCredentials(supabase, { userId, providerId, orgId, tokens, profile }) {
    const record = {
        user_id: userId,
        provider_id: providerId,
        org_id: orgId || null,
        access_token_encrypted: encryptToken(tokens.access_token),
        refresh_token_encrypted: encryptToken(tokens.refresh_token),
        token_expires_at: tokens.expires_at || new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        scopes: tokens.scopes || [],
        external_user_id: profile?.id || null,
        external_email: profile?.email || null,
        external_profile: profile || null,
        status: 'active',
        error_count: 0,
        last_error: null,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('user_integrations')
        .upsert(record, { onConflict: 'user_id,provider_id' })
        .select()
        .single();

    if (error) {
        logger.error('[CredentialManager] Failed to store credentials:', error.message);
        throw error;
    }

    return data;
}

/**
 * Remove integration credentials
 */
async function removeCredentials(supabase, userId, providerSlug) {
    const { data: provider } = await supabase
        .from('integration_providers')
        .select('id')
        .eq('slug', providerSlug)
        .single();

    if (!provider) return false;

    const { error } = await supabase
        .from('user_integrations')
        .delete()
        .eq('user_id', userId)
        .eq('provider_id', provider.id);

    return !error;
}

module.exports = {
    encryptToken,
    decryptToken,
    generateOAuthState,
    verifyOAuthState,
    getCredentials,
    storeCredentials,
    removeCredentials
};
