/**
 * INSIGHT 360 - Integrations API Routes
 * Version: 1.0.0
 *
 * Endpoints:
 *   - Provider discovery (2 endpoints)
 *   - User integrations (3 endpoints)
 *   - Organization integrations (4 endpoints)
 *   - Subscriptions (4 endpoints)
 *   - OAuth callbacks (1 endpoint)
 *   - Data operations (3 endpoints)
 *   - Sync trigger (1 endpoint)
 */

const express = require('express');
const { getUserId } = require('../utils/auth');
const integrationRegistry = require('../services/integrations');
const credentialManager = require('../services/integrations/credentialManager');

module.exports = function(supabase) {
    const router = express.Router();

    // ==========================================
    // PROVIDER DISCOVERY
    // ==========================================

    /**
     * GET /api/integrations/providers
     * List available integration providers
     */
    router.get('/providers', async (req, res) => {
        try {
            const providers = await integrationRegistry.getAvailableProviders(supabase);
            res.json({ success: true, data: providers });
        } catch (error) {
            console.error('[Integrations] Error fetching providers:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch providers' });
        }
    });

    /**
     * GET /api/integrations/providers/:slug
     * Get provider details and capabilities
     */
    router.get('/providers/:slug', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('integration_providers')
                .select('*')
                .eq('slug', req.params.slug)
                .single();

            if (error || !data) {
                return res.status(404).json({ success: false, error: 'Provider not found' });
            }

            data.implemented = integrationRegistry.hasProvider(data.slug);
            res.json({ success: true, data });
        } catch (error) {
            console.error('[Integrations] Error fetching provider:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch provider' });
        }
    });

    // ==========================================
    // USER INTEGRATIONS
    // ==========================================

    /**
     * GET /api/integrations/user
     * Get current user's connected integrations
     */
    router.get('/user', async (req, res) => {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

            const integrations = await integrationRegistry.getUserIntegrations(supabase, userId);
            res.json({ success: true, data: integrations });
        } catch (error) {
            console.error('[Integrations] Error fetching user integrations:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch integrations' });
        }
    });

    /**
     * POST /api/integrations/user/:provider/connect
     * Initiate OAuth flow or API key connection
     */
    router.post('/user/:provider/connect', async (req, res) => {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

            const providerSlug = req.params.provider;
            const provider = integrationRegistry.getProvider(providerSlug, supabase);

            if (!provider) {
                return res.status(404).json({ success: false, error: 'Provider not implemented' });
            }

            // API key auth
            if (provider.authType === 'api_key') {
                const { apiKey, endpoint } = req.body;
                if (!apiKey) {
                    return res.status(400).json({ success: false, error: 'API key required' });
                }

                const { data: providerData } = await supabase
                    .from('integration_providers')
                    .select('id')
                    .eq('slug', providerSlug)
                    .single();

                if (!providerData) {
                    return res.status(404).json({ success: false, error: 'Provider not found' });
                }

                // Test connection before storing
                const testResult = await provider.testConnection({ apiKey, endpoint });
                if (!testResult.success) {
                    return res.status(400).json({ success: false, error: 'Connection test failed', details: testResult.error });
                }

                const profile = await provider.getProfile({ apiKey, endpoint });

                await credentialManager.storeCredentials(supabase, {
                    userId,
                    providerId: providerData.id,
                    orgId: req.headers['x-org-id'] || null,
                    tokens: {
                        access_token: apiKey,
                        scopes: []
                    },
                    profile
                });

                return res.json({ success: true, message: 'Connected successfully' });
            }

            // OAuth flow - generate authorization URL
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            const state = credentialManager.generateOAuthState(userId, providerSlug);
            const scopes = req.body.scopes || undefined;
            const redirectUri = `${req.protocol}://${req.get('host')}/api/integrations/oauth/${providerSlug}/callback`;

            const authUrl = provider.getAuthorizationUrl(userId, scopes, redirectUri, state);

            res.json({ success: true, authUrl, state });
        } catch (error) {
            console.error('[Integrations] Error connecting:', error);
            res.status(500).json({ success: false, error: 'Failed to initiate connection' });
        }
    });

    /**
     * DELETE /api/integrations/user/:provider
     * Disconnect a user integration
     */
    router.delete('/user/:provider', async (req, res) => {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

            const provider = integrationRegistry.getProvider(req.params.provider, supabase);
            if (provider) {
                await provider.disconnect(userId);
            } else {
                await credentialManager.removeCredentials(supabase, userId, req.params.provider);
            }

            res.json({ success: true, message: 'Disconnected successfully' });
        } catch (error) {
            console.error('[Integrations] Error disconnecting:', error);
            res.status(500).json({ success: false, error: 'Failed to disconnect' });
        }
    });

    // ==========================================
    // OAUTH CALLBACKS
    // ==========================================

    /**
     * GET /api/oauth/:provider/callback
     * Handle OAuth redirect
     */
    router.get('/oauth/:provider/callback', async (req, res) => {
        try {
            const { code, state, error: oauthError } = req.query;

            if (oauthError) {
                return res.redirect(`/integrations.html?error=${encodeURIComponent(oauthError)}`);
            }

            if (!code || !state) {
                return res.redirect('/integrations.html?error=missing_params');
            }

            const stateData = credentialManager.verifyOAuthState(state);
            if (!stateData) {
                return res.redirect('/integrations.html?error=invalid_state');
            }

            const providerSlug = req.params.provider;
            const provider = integrationRegistry.getProvider(providerSlug, supabase);

            if (!provider) {
                return res.redirect(`/integrations.html?error=provider_not_found`);
            }

            const redirectUri = `${req.protocol}://${req.get('host')}/api/integrations/oauth/${providerSlug}/callback`;
            const tokens = await provider.exchangeCodeForTokens(code, redirectUri);
            const profile = await provider.getProfile({ accessToken: tokens.access_token });

            const { data: providerData } = await supabase
                .from('integration_providers')
                .select('id')
                .eq('slug', providerSlug)
                .single();

            await credentialManager.storeCredentials(supabase, {
                userId: stateData.userId,
                providerId: providerData.id,
                tokens,
                profile
            });

            res.redirect(`/integrations.html?connected=${providerSlug}`);
        } catch (error) {
            console.error('[Integrations] OAuth callback error:', error);
            res.redirect(`/integrations.html?error=oauth_failed`);
        }
    });

    // ==========================================
    // ORGANIZATION INTEGRATIONS (Admin only)
    // ==========================================

    /**
     * GET /api/integrations/org
     * Get organization's integrations
     */
    router.get('/org', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            if (!orgId) return res.status(400).json({ success: false, error: 'Organization ID required' });

            const integrations = await integrationRegistry.getOrgIntegrations(supabase, orgId);
            res.json({ success: true, data: integrations });
        } catch (error) {
            console.error('[Integrations] Error fetching org integrations:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch org integrations' });
        }
    });

    /**
     * POST /api/integrations/org/:provider
     * Configure an org-level integration
     */
    router.post('/org/:provider', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            if (!orgId) return res.status(400).json({ success: false, error: 'Organization ID required' });

            const { data: providerData } = await supabase
                .from('integration_providers')
                .select('id')
                .eq('slug', req.params.provider)
                .single();

            if (!providerData) {
                return res.status(404).json({ success: false, error: 'Provider not found' });
            }

            const { instanceUrl, instanceName, adminApiKey, syncSettings } = req.body;

            const record = {
                org_id: orgId,
                provider_id: providerData.id,
                instance_url: instanceUrl || null,
                instance_name: instanceName || null,
                admin_api_key_encrypted: adminApiKey ? credentialManager.encryptToken(adminApiKey) : null,
                sync_settings: syncSettings || {},
                status: 'active'
            };

            const { data, error } = await supabase
                .from('org_integrations')
                .upsert(record, { onConflict: 'org_id,provider_id' })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('[Integrations] Error configuring org integration:', error);
            res.status(500).json({ success: false, error: 'Failed to configure integration' });
        }
    });

    /**
     * PUT /api/integrations/org/:provider
     * Update org integration configuration
     */
    router.put('/org/:provider', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            if (!orgId) return res.status(400).json({ success: false, error: 'Organization ID required' });

            const { instanceUrl, instanceName, syncSettings, status } = req.body;
            const updates = { updated_at: new Date().toISOString() };

            if (instanceUrl !== undefined) updates.instance_url = instanceUrl;
            if (instanceName !== undefined) updates.instance_name = instanceName;
            if (syncSettings !== undefined) updates.sync_settings = syncSettings;
            if (status !== undefined) updates.status = status;

            const { data: providerData } = await supabase
                .from('integration_providers')
                .select('id')
                .eq('slug', req.params.provider)
                .single();

            if (!providerData) {
                return res.status(404).json({ success: false, error: 'Provider not found' });
            }

            const { data, error } = await supabase
                .from('org_integrations')
                .update(updates)
                .eq('org_id', orgId)
                .eq('provider_id', providerData.id)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('[Integrations] Error updating org integration:', error);
            res.status(500).json({ success: false, error: 'Failed to update integration' });
        }
    });

    /**
     * DELETE /api/integrations/org/:provider
     * Remove org integration
     */
    router.delete('/org/:provider', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            if (!orgId) return res.status(400).json({ success: false, error: 'Organization ID required' });

            const { data: providerData } = await supabase
                .from('integration_providers')
                .select('id')
                .eq('slug', req.params.provider)
                .single();

            if (!providerData) {
                return res.status(404).json({ success: false, error: 'Provider not found' });
            }

            const { error } = await supabase
                .from('org_integrations')
                .delete()
                .eq('org_id', orgId)
                .eq('provider_id', providerData.id);

            if (error) throw error;

            res.json({ success: true, message: 'Integration removed' });
        } catch (error) {
            console.error('[Integrations] Error removing org integration:', error);
            res.status(500).json({ success: false, error: 'Failed to remove integration' });
        }
    });

    // ==========================================
    // SUBSCRIPTIONS
    // ==========================================

    /**
     * GET /api/integrations/subscriptions
     * Get org's integration subscriptions
     */
    router.get('/subscriptions', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            if (!orgId) return res.status(400).json({ success: false, error: 'Organization ID required' });

            const { data, error } = await supabase
                .from('integration_subscriptions')
                .select('*, integration_providers(*)')
                .eq('org_id', orgId);

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('[Integrations] Error fetching subscriptions:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch subscriptions' });
        }
    });

    /**
     * POST /api/integrations/subscriptions
     * Request a new integration add-on
     */
    router.post('/subscriptions', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            if (!orgId) return res.status(400).json({ success: false, error: 'Organization ID required' });

            const { providerId, addonType } = req.body;
            if (!providerId || !addonType) {
                return res.status(400).json({ success: false, error: 'Provider ID and addon type required' });
            }

            const { data: provider } = await supabase
                .from('integration_providers')
                .select('*')
                .eq('id', providerId)
                .single();

            if (!provider) {
                return res.status(404).json({ success: false, error: 'Provider not found' });
            }

            // Look up org's tier to get admin-configured addon pricing
            let monthlyPrice = provider.base_monthly_price || 0;
            let apiCallLimit = null;
            let userLimit = null;

            const { data: org } = await supabase
                .from('organizations')
                .select('subscription_tier')
                .eq('id', orgId)
                .single();

            if (org?.subscription_tier) {
                const { data: tier } = await supabase
                    .from('subscription_tiers')
                    .select('integration_addons')
                    .eq('id', org.subscription_tier)
                    .single();

                const addonCategory = provider.addon_category || addonType;
                const addonConfig = tier?.integration_addons?.[addonCategory];
                if (addonConfig) {
                    monthlyPrice = addonConfig.monthly_price ?? monthlyPrice;
                    apiCallLimit = addonConfig.api_call_limit || null;
                    userLimit = addonConfig.user_limit || null;
                }
            }

            const { data, error } = await supabase
                .from('integration_subscriptions')
                .upsert({
                    org_id: orgId,
                    provider_id: providerId,
                    addon_type: addonType,
                    monthly_price: monthlyPrice,
                    api_call_limit: apiCallLimit,
                    user_limit: userLimit,
                    billing_status: 'active',
                    next_billing_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }, { onConflict: 'org_id,provider_id' })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('[Integrations] Error creating subscription:', error);
            res.status(500).json({ success: false, error: 'Failed to create subscription' });
        }
    });

    /**
     * DELETE /api/integrations/subscriptions/:id
     * Cancel a subscription
     */
    router.delete('/subscriptions/:id', async (req, res) => {
        try {
            const { error } = await supabase
                .from('integration_subscriptions')
                .update({
                    billing_status: 'cancelled',
                    cancelled_at: new Date().toISOString()
                })
                .eq('id', req.params.id);

            if (error) throw error;

            res.json({ success: true, message: 'Subscription cancelled' });
        } catch (error) {
            console.error('[Integrations] Error cancelling subscription:', error);
            res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
        }
    });

    // ==========================================
    // DATA OPERATIONS
    // ==========================================

    /**
     * GET /api/integrations/:provider/data/:entity
     * Fetch data from a provider
     */
    router.get('/:provider/data/:entity', async (req, res) => {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

            const provider = integrationRegistry.getProvider(req.params.provider, supabase);
            if (!provider) {
                return res.status(404).json({ success: false, error: 'Provider not implemented' });
            }

            const credentials = await credentialManager.getCredentials(
                supabase, userId, req.params.provider,
                provider.refreshAccessToken.bind(provider)
            );

            if (!credentials) {
                return res.status(401).json({ success: false, error: 'Not connected to this provider' });
            }

            const data = await provider.fetchData(credentials, req.params.entity, req.query);
            res.json({ success: true, data });
        } catch (error) {
            console.error('[Integrations] Error fetching data:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch data' });
        }
    });

    /**
     * POST /api/integrations/:provider/data/:entity
     * Push data to a provider
     */
    router.post('/:provider/data/:entity', async (req, res) => {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

            const provider = integrationRegistry.getProvider(req.params.provider, supabase);
            if (!provider) {
                return res.status(404).json({ success: false, error: 'Provider not implemented' });
            }

            const credentials = await credentialManager.getCredentials(
                supabase, userId, req.params.provider,
                provider.refreshAccessToken.bind(provider)
            );

            if (!credentials) {
                return res.status(401).json({ success: false, error: 'Not connected to this provider' });
            }

            const result = await provider.pushData(credentials, req.params.entity, req.body);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('[Integrations] Error pushing data:', error);
            res.status(500).json({ success: false, error: 'Failed to push data' });
        }
    });

    /**
     * POST /api/integrations/:provider/sync
     * Trigger a sync for a provider
     */
    router.post('/:provider/sync', async (req, res) => {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

            const provider = integrationRegistry.getProvider(req.params.provider, supabase);
            if (!provider) {
                return res.status(404).json({ success: false, error: 'Provider not implemented' });
            }

            const credentials = await credentialManager.getCredentials(
                supabase, userId, req.params.provider,
                provider.refreshAccessToken.bind(provider)
            );

            if (!credentials) {
                return res.status(401).json({ success: false, error: 'Not connected to this provider' });
            }

            const { entityType, syncType } = req.body;

            await provider.logSync(supabase, {
                integrationId: credentials.integrationId,
                syncType: syncType || 'incremental',
                direction: 'inbound',
                entityType,
                status: 'started',
                results: {},
                userId
            });

            const result = await provider.fetchData(credentials, entityType, { syncType });

            await provider.logSync(supabase, {
                integrationId: credentials.integrationId,
                syncType: syncType || 'incremental',
                direction: 'inbound',
                entityType,
                status: 'completed',
                results: result,
                userId
            });

            // Update last_sync_at
            await supabase
                .from('user_integrations')
                .update({ last_sync_at: new Date().toISOString() })
                .eq('id', credentials.integrationId);

            res.json({ success: true, data: result });
        } catch (error) {
            console.error('[Integrations] Sync error:', error);
            res.status(500).json({ success: false, error: 'Sync failed' });
        }
    });

    // ==========================================
    // USAGE & HEALTH MONITORING
    // ==========================================

    /**
     * GET /api/integrations/usage
     * Get integration usage stats for the org
     */
    router.get('/usage', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            if (!orgId) return res.status(400).json({ success: false, error: 'Organization ID required' });

            // Get subscriptions with usage
            const { data: subs } = await supabase
                .from('integration_subscriptions')
                .select('*, integration_providers(name, slug)')
                .eq('org_id', orgId)
                .eq('billing_status', 'active');

            // Get recent sync logs
            const { data: logs } = await supabase
                .from('integration_sync_log')
                .select('provider_slug, status, started_at')
                .eq('org_id', orgId)
                .order('started_at', { ascending: false })
                .limit(50);

            res.json({
                success: true,
                data: {
                    subscriptions: subs || [],
                    recentSyncs: logs || []
                }
            });
        } catch (error) {
            console.error('[Integrations] Error fetching usage:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch usage data' });
        }
    });

    /**
     * GET /api/integrations/health
     * Health check for all connected integrations
     */
    router.get('/health', async (req, res) => {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

            const integrations = await integrationRegistry.getUserIntegrations(supabase, userId);

            const healthResults = integrations.map(integration => ({
                provider: integration.integration_providers?.slug || 'unknown',
                name: integration.integration_providers?.name || 'Unknown',
                status: integration.status,
                lastSync: integration.last_sync_at,
                lastError: integration.last_error,
                errorCount: integration.error_count,
                tokenExpiry: integration.token_expires_at
            }));

            res.json({ success: true, data: healthResults });
        } catch (error) {
            console.error('[Integrations] Error checking health:', error);
            res.status(500).json({ success: false, error: 'Health check failed' });
        }
    });

    /**
     * POST /api/integrations/usage/increment
     * Increment API call count for a subscription (called internally)
     */
    router.post('/usage/increment', async (req, res) => {
        try {
            const { orgId, providerSlug } = req.body;
            if (!orgId || !providerSlug) {
                return res.status(400).json({ success: false, error: 'orgId and providerSlug required' });
            }

            const { data: provider } = await supabase
                .from('integration_providers')
                .select('id')
                .eq('slug', providerSlug)
                .single();

            if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });

            // Check limits before incrementing
            const { data: sub } = await supabase
                .from('integration_subscriptions')
                .select('*')
                .eq('org_id', orgId)
                .eq('provider_id', provider.id)
                .eq('billing_status', 'active')
                .single();

            if (sub && sub.api_call_limit && sub.api_calls_this_month >= sub.api_call_limit) {
                return res.status(429).json({ success: false, error: 'API call limit reached' });
            }

            if (sub) {
                await supabase
                    .from('integration_subscriptions')
                    .update({
                        api_calls_this_month: (sub.api_calls_this_month || 0) + 1,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', sub.id);
            }

            res.json({ success: true });
        } catch (error) {
            console.error('[Integrations] Error incrementing usage:', error);
            res.status(500).json({ success: false, error: 'Failed to increment usage' });
        }
    });

    return router;
};
