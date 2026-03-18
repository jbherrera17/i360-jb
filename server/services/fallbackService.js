/**
 * Fallback Resolution Service - Insight 360
 *
 * Resolves the effective model+provider for a request, transparently
 * falling back to an alternative when the requested provider is down.
 *
 * Version: 1.0.0
 */

const llmRegistry = require('./llmRegistry');
const { isProviderHealthy } = require('./modelAvailabilityService');
const logger = require('./logger');

/**
 * Resolve a model request, applying fallback if the provider is unavailable.
 *
 * @param {string} requestedModel - The model ID the user/agent selected
 * @returns {object} Resolution result:
 *   - { model, provider, fallback: null }                    — healthy, no fallback
 *   - { model, provider, fallback: { original_model, ... } } — fallback used
 *   - { model, provider, unavailable: true }                 — Perplexity down, no fallback
 *   - { model, provider, allUnavailable: true }              — every provider is down
 */
function resolveModelWithFallback(requestedModel) {
    const provider = llmRegistry.getProvider(requestedModel);

    // If the provider is healthy, no fallback needed
    if (isProviderHealthy(provider)) {
        return {
            model: requestedModel,
            provider,
            fallback: null
        };
    }

    // Provider is down — check if this is Perplexity (no fallback)
    if (provider === 'perplexity') {
        logger.warn(`Perplexity unavailable, no fallback available for ${requestedModel}`);
        return {
            model: requestedModel,
            provider,
            unavailable: true
        };
    }

    // Try to find a fallback
    const fallback = llmRegistry.getFallbackModel(requestedModel);

    if (fallback) {
        const modelInfo = llmRegistry.getModelDisplayInfo(requestedModel);
        const fallbackInfo = llmRegistry.getModelDisplayInfo(fallback.model);

        logger.info(`Fallback activated: ${requestedModel} (${provider}) -> ${fallback.model} (${fallback.provider})`);

        return {
            model: fallback.model,
            provider: fallback.provider,
            fallback: {
                original_model: requestedModel,
                original_provider: provider,
                original_model_name: modelInfo?.name || requestedModel,
                fallback_model: fallback.model,
                fallback_provider: fallback.provider,
                fallback_model_name: fallbackInfo?.name || fallback.model,
                reason: `${provider} is currently unavailable`
            }
        };
    }

    // No fallback found — all providers may be down
    logger.error(`All providers unavailable for fallback from ${requestedModel}`);
    return {
        model: requestedModel,
        provider,
        allUnavailable: true
    };
}

module.exports = {
    resolveModelWithFallback
};
