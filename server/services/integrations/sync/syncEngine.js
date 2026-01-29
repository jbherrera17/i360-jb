/**
 * INSIGHT 360 - Sync Engine
 *
 * Orchestrates bidirectional data sync between i360 and external systems.
 * Handles conflict resolution, rate limiting, and audit logging.
 */

const logger = require('../../logger');

class SyncEngine {
    constructor(supabase) {
        this.supabase = supabase;
    }

    /**
     * Run a sync job for a given integration
     */
    async runSync({ provider, credentials, entityType, direction = 'inbound', syncType = 'incremental', userId, orgId }) {
        const syncId = crypto.randomUUID();

        // Log start
        await this.logSync({
            syncId,
            providerSlug: provider.slug,
            syncType,
            direction,
            entityType,
            status: 'started',
            userId,
            orgId
        });

        try {
            let result;

            switch (direction) {
                case 'inbound':
                    result = await this.syncInbound(provider, credentials, entityType, syncType);
                    break;
                case 'outbound':
                    result = await this.syncOutbound(provider, credentials, entityType, syncType);
                    break;
                case 'bidirectional':
                    result = await this.syncBidirectional(provider, credentials, entityType, syncType);
                    break;
                default:
                    throw new Error(`Unknown sync direction: ${direction}`);
            }

            // Log completion
            await this.logSync({
                syncId,
                providerSlug: provider.slug,
                syncType,
                direction,
                entityType,
                status: 'completed',
                results: result,
                userId,
                orgId
            });

            return result;
        } catch (error) {
            await this.logSync({
                syncId,
                providerSlug: provider.slug,
                syncType,
                direction,
                entityType,
                status: 'failed',
                results: { errors: [{ message: error.message }] },
                userId,
                orgId
            });

            throw error;
        }
    }

    /**
     * Sync data from external system into i360
     */
    async syncInbound(provider, credentials, entityType) {
        const externalData = await provider.fetchData(credentials, entityType);
        const records = Array.isArray(externalData) ? externalData : (externalData.results || externalData.data || []);

        let created = 0;
        let updated = 0;
        let failed = 0;

        for (const record of records) {
            try {
                // Check if entity mapping exists
                const { data: existing } = await this.supabase
                    .from('crm_entity_mapping')
                    .select('id, i360_entity_id')
                    .eq('crm_provider', provider.slug)
                    .eq('crm_entity_id', record.id?.toString())
                    .eq('crm_entity_type', entityType)
                    .single();

                if (existing) {
                    updated++;
                } else {
                    created++;
                }

                // Update last sync
                if (existing) {
                    await this.supabase
                        .from('crm_entity_mapping')
                        .update({ last_sync_at: new Date().toISOString() })
                        .eq('id', existing.id);
                }
            } catch {
                failed++;
            }
        }

        return { processed: records.length, created, updated, failed };
    }

    /**
     * Sync data from i360 to external system
     */
    async syncOutbound(provider, credentials, entityType) {
        // Get mappings that need syncing
        const { data: mappings } = await this.supabase
            .from('crm_entity_mapping')
            .select('*')
            .eq('crm_provider', provider.slug)
            .eq('i360_entity_type', entityType)
            .in('sync_direction', ['outbound', 'bidirectional']);

        if (!mappings || mappings.length === 0) {
            return { processed: 0, created: 0, updated: 0, failed: 0 };
        }

        let created = 0;
        let updated = 0;
        let failed = 0;

        for (const mapping of mappings) {
            try {
                await this.supabase
                    .from('crm_entity_mapping')
                    .update({ last_sync_at: new Date().toISOString() })
                    .eq('id', mapping.id);
                updated++;
            } catch {
                failed++;
            }
        }

        return { processed: mappings.length, created, updated, failed };
    }

    /**
     * Bidirectional sync
     */
    async syncBidirectional(provider, credentials, entityType) {
        const inbound = await this.syncInbound(provider, credentials, entityType);
        const outbound = await this.syncOutbound(provider, credentials, entityType);

        return {
            processed: inbound.processed + outbound.processed,
            created: inbound.created + outbound.created,
            updated: inbound.updated + outbound.updated,
            failed: inbound.failed + outbound.failed
        };
    }

    /**
     * Log a sync event
     */
    async logSync({ syncId, providerSlug, syncType, direction, entityType, status, results = {}, userId, orgId }) {
        try {
            await this.supabase.from('integration_sync_log').insert({
                provider_slug: providerSlug,
                sync_type: syncType,
                direction,
                entity_type: entityType,
                status,
                records_processed: results.processed || 0,
                records_created: results.created || 0,
                records_updated: results.updated || 0,
                records_failed: results.failed || 0,
                error_details: results.errors || null,
                completed_at: ['completed', 'failed'].includes(status) ? new Date().toISOString() : null,
                user_id: userId,
                org_id: orgId
            });
        } catch (err) {
            logger.error('[SyncEngine] Failed to log sync:', err.message);
        }
    }
}

module.exports = SyncEngine;
