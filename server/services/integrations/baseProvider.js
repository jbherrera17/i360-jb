/**
 * INSIGHT 360 - Base Integration Provider
 *
 * Abstract base class for all integration providers.
 * Subclasses implement provider-specific OAuth, data fetching, and sync logic.
 */

const logger = require('../logger');

class BaseIntegrationProvider {
    constructor(config) {
        this.slug = config.slug;
        this.name = config.name;
        this.authType = config.authType || 'oauth2';
        this.supabase = config.supabase;
    }

    // === OAuth Flow ===

    getAuthorizationUrl(userId, scopes, redirectUri) {
        throw new Error(`${this.slug}: getAuthorizationUrl not implemented`);
    }

    async exchangeCodeForTokens(code, redirectUri) {
        throw new Error(`${this.slug}: exchangeCodeForTokens not implemented`);
    }

    async refreshAccessToken(refreshToken) {
        throw new Error(`${this.slug}: refreshAccessToken not implemented`);
    }

    // === Connection Management ===

    async testConnection(credentials) {
        throw new Error(`${this.slug}: testConnection not implemented`);
    }

    async getProfile(credentials) {
        throw new Error(`${this.slug}: getProfile not implemented`);
    }

    async disconnect(userId) {
        logger.info(`[${this.slug}] Disconnecting user ${userId}`);
        const credentialManager = require('./credentialManager');
        return credentialManager.removeCredentials(this.supabase, userId, this.slug);
    }

    // === Data Operations ===

    async fetchData(credentials, entityType, options = {}) {
        throw new Error(`${this.slug}: fetchData not implemented for ${entityType}`);
    }

    async pushData(credentials, entityType, data) {
        throw new Error(`${this.slug}: pushData not implemented for ${entityType}`);
    }

    // === Webhook Handling ===

    validateWebhook(request) {
        return true;
    }

    async processWebhook(payload) {
        throw new Error(`${this.slug}: processWebhook not implemented`);
    }

    // === Capability Declarations ===

    getCapabilities() {
        return {
            entities: [],
            operations: [],
            features: []
        };
    }

    // === Sync Logging ===

    async logSync(supabase, { integrationId, integrationType, syncType, direction, entityType, status, results, userId, orgId }) {
        try {
            await supabase.from('integration_sync_log').insert({
                integration_id: integrationId,
                integration_type: integrationType || 'user',
                provider_slug: this.slug,
                sync_type: syncType || 'incremental',
                direction: direction || 'inbound',
                entity_type: entityType,
                status,
                records_processed: results?.processed || 0,
                records_created: results?.created || 0,
                records_updated: results?.updated || 0,
                records_failed: results?.failed || 0,
                error_details: results?.errors || null,
                completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
                user_id: userId,
                org_id: orgId
            });
        } catch (err) {
            logger.error(`[${this.slug}] Failed to log sync:`, err.message);
        }
    }
}

module.exports = BaseIntegrationProvider;
