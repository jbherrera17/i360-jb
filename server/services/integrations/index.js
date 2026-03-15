/**
 * INSIGHT 360 - Integration Registry & Factory
 *
 * Central registry for all integration providers.
 * Provides factory methods to instantiate and manage providers.
 */

const logger = require('../logger');

// Provider registry
const providers = new Map();

/**
 * Register a provider class
 */
function registerProvider(slug, ProviderClass) {
    providers.set(slug, ProviderClass);
    logger.info(`[Integrations] Registered provider: ${slug}`);
}

/**
 * Get an instantiated provider
 */
function getProvider(slug, supabase) {
    const ProviderClass = providers.get(slug);
    if (!ProviderClass) return null;
    return new ProviderClass({ supabase });
}

/**
 * List all registered provider slugs
 */
function listProviders() {
    return Array.from(providers.keys());
}

/**
 * Check if a provider is registered
 */
function hasProvider(slug) {
    return providers.has(slug);
}

/**
 * Get available providers from database with registration status
 */
async function getAvailableProviders(supabase) {
    const { data, error } = await supabase
        .from('integration_providers')
        .select('*')
        .in('status', ['active', 'beta'])
        .order('name');

    if (error) {
        logger.error('[Integrations] Failed to fetch providers:', error.message);
        return [];
    }

    return data.map(p => ({
        ...p,
        implemented: providers.has(p.slug)
    }));
}

/**
 * Get a user's connected integrations
 */
async function getUserIntegrations(supabase, userId) {
    const { data, error } = await supabase
        .from('user_integrations')
        .select('*, integration_providers(*)')
        .eq('user_id', userId);

    if (error) {
        logger.error('[Integrations] Failed to fetch user integrations:', error.message);
        return [];
    }

    return data;
}

/**
 * Get an organization's integrations
 */
async function getOrgIntegrations(supabase, orgId) {
    const { data, error } = await supabase
        .from('org_integrations')
        .select('*, integration_providers(*)')
        .eq('org_id', orgId);

    if (error) {
        logger.error('[Integrations] Failed to fetch org integrations:', error.message);
        return [];
    }

    return data;
}

// Auto-register providers that exist
function initializeProviders() {
    const providerModules = {
        google: './providers/google',
        calendly: './providers/calendly',
        salesforce: './providers/crm/salesforce',
        hubspot: './providers/crm/hubspot',
        espocrm: './providers/crm/espocrm',
        strapi: './providers/cms/strapi'
    };

    for (const [slug, modulePath] of Object.entries(providerModules)) {
        try {
            registerProvider(slug, require(modulePath));
        } catch (err) {
            logger.warn(`[Integrations] ${slug} provider not loaded:`, err.message);
        }
    }
    logger.info(`[Integrations] Registry initialized with ${providers.size} providers`);
}

module.exports = {
    registerProvider,
    getProvider,
    listProviders,
    hasProvider,
    getAvailableProviders,
    getUserIntegrations,
    getOrgIntegrations,
    initializeProviders
};
