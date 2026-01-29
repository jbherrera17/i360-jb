/**
 * INSIGHT 360 - Webhooks API Routes
 * Version: 1.0.0
 *
 * Handles incoming webhooks from external integration providers.
 * Validates webhook signatures and dispatches to appropriate provider handlers.
 */

const express = require('express');
const integrationRegistry = require('../services/integrations');

module.exports = function(supabase) {
    const router = express.Router();

    /**
     * POST /api/webhooks/:provider
     * Receive and process webhooks from external providers
     */
    router.post('/:provider', express.raw({ type: '*/*' }), async (req, res) => {
        try {
            const providerSlug = req.params.provider;
            const provider = integrationRegistry.getProvider(providerSlug, supabase);

            if (!provider) {
                return res.status(404).json({ error: 'Unknown provider' });
            }

            // Validate webhook signature
            if (!provider.validateWebhook(req)) {
                return res.status(401).json({ error: 'Invalid webhook signature' });
            }

            // Parse payload
            let payload;
            try {
                payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            } catch {
                payload = req.body;
            }

            // Process asynchronously - respond quickly
            res.status(200).json({ received: true });

            // Handle in background
            provider.processWebhook(payload).catch(err => {
                console.error(`[Webhooks] Error processing ${providerSlug} webhook:`, err);
            });
        } catch (error) {
            console.error('[Webhooks] Error:', error);
            res.status(500).json({ error: 'Webhook processing failed' });
        }
    });

    return router;
};
