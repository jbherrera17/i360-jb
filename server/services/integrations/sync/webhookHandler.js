/**
 * INSIGHT 360 - Webhook Handler
 *
 * Processes incoming webhooks from external integration providers.
 * Validates, parses, and dispatches webhook events.
 */

const logger = require('../../logger');

class WebhookHandler {
    constructor(supabase) {
        this.supabase = supabase;
        this.handlers = new Map();
    }

    /**
     * Register a webhook handler for a provider
     */
    registerHandler(providerSlug, handler) {
        this.handlers.set(providerSlug, handler);
    }

    /**
     * Process an incoming webhook
     */
    async process(providerSlug, payload, headers = {}) {
        const handler = this.handlers.get(providerSlug);

        if (!handler) {
            logger.warn(`[Webhook] No handler registered for ${providerSlug}`);
            return { processed: false, reason: 'no_handler' };
        }

        try {
            const result = await handler(payload, headers, this.supabase);

            // Log the webhook event
            await this.supabase.from('integration_sync_log').insert({
                provider_slug: providerSlug,
                sync_type: 'webhook',
                direction: 'inbound',
                entity_type: payload.type || payload.event || 'unknown',
                status: 'completed',
                records_processed: 1,
                completed_at: new Date().toISOString()
            });

            return { processed: true, result };
        } catch (error) {
            logger.error(`[Webhook] Error processing ${providerSlug}:`, error.message);

            await this.supabase.from('integration_sync_log').insert({
                provider_slug: providerSlug,
                sync_type: 'webhook',
                direction: 'inbound',
                entity_type: payload.type || payload.event || 'unknown',
                status: 'failed',
                error_details: { message: error.message },
                completed_at: new Date().toISOString()
            });

            return { processed: false, error: error.message };
        }
    }
}

module.exports = WebhookHandler;
