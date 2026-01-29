/**
 * INSIGHT 360 - HubSpot CRM Provider
 *
 * Connects to HubSpot via OAuth2 / REST API v3.
 * Handles contacts, companies, deals, and activities.
 */

const GenericCRMProvider = require('./generic');
const logger = require('../../../logger');

const HUBSPOT_AUTH_URL = 'https://app.hubspot.com/oauth/authorize';
const HUBSPOT_TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token';
const HUBSPOT_API = 'https://api.hubapi.com';

class HubSpotProvider extends GenericCRMProvider {
    constructor(config) {
        super({
            slug: 'hubspot',
            name: 'HubSpot',
            authType: 'oauth2',
            baseUrl: HUBSPOT_API,
            fieldMapping: {
                contacts: {
                    endpoint: '/crm/v3/objects/contacts',
                    inbound: {
                        firstname: 'firstName',
                        lastname: 'lastName',
                        email: 'email',
                        phone: 'phone',
                        jobtitle: 'title',
                        company: 'companyName'
                    },
                    outbound: {
                        firstName: 'firstname',
                        lastName: 'lastname',
                        email: 'email',
                        phone: 'phone',
                        title: 'jobtitle',
                        companyName: 'company'
                    }
                },
                deals: {
                    endpoint: '/crm/v3/objects/deals'
                },
                activities: {
                    endpoint: '/crm/v3/objects/tasks'
                },
                test: {
                    endpoint: '/crm/v3/objects/contacts?limit=1'
                },
                profile: {
                    endpoint: '/oauth/v1/access-tokens'
                }
            },
            ...config
        });

        this.clientId = process.env.HUBSPOT_CLIENT_ID;
        this.clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    }

    getAuthorizationUrl(userId, scopes, redirectUri, state) {
        const hubSpotScopes = scopes || [
            'crm.objects.contacts.read',
            'crm.objects.contacts.write',
            'crm.objects.companies.read',
            'crm.objects.deals.read',
            'crm.objects.deals.write'
        ];

        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: redirectUri,
            scope: hubSpotScopes.join(' '),
            state
        });

        return `${HUBSPOT_AUTH_URL}?${params.toString()}`;
    }

    async exchangeCodeForTokens(code, redirectUri) {
        const response = await fetch(HUBSPOT_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uri: redirectUri
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`HubSpot token exchange failed: ${error}`);
        }

        const data = await response.json();
        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            scopes: data.token_type ? [] : []
        };
    }

    async refreshAccessToken(refreshToken) {
        const response = await fetch(HUBSPOT_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: this.clientId,
                client_secret: this.clientSecret
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`HubSpot token refresh failed: ${error}`);
        }

        const data = await response.json();
        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in
        };
    }

    async getProfile(credentials) {
        try {
            const token = credentials.accessToken || credentials.apiKey;
            const response = await fetch(`${HUBSPOT_API}/oauth/v1/access-tokens/${token}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) return null;

            const data = await response.json();
            return {
                id: data.user_id?.toString() || null,
                email: data.user || null,
                name: data.user || null,
                hub_id: data.hub_id
            };
        } catch {
            return null;
        }
    }

    async getContacts(credentials, options = {}) {
        const limit = options.maxResults || 50;
        const token = credentials.accessToken || credentials.apiKey;
        const properties = 'firstname,lastname,email,phone,jobtitle,company';

        const response = await fetch(
            `${HUBSPOT_API}/crm/v3/objects/contacts?limit=${limit}&properties=${properties}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) {
            throw new Error(`HubSpot contacts error: ${response.status}`);
        }

        const data = await response.json();
        return (data.results || []).map(r => ({
            id: r.id,
            ...this.mapFields(r.properties || {}, 'contacts', 'inbound'),
            createdAt: r.createdAt,
            updatedAt: r.updatedAt
        }));
    }

    async getDeals(credentials, options = {}) {
        const limit = options.maxResults || 50;
        const token = credentials.accessToken || credentials.apiKey;

        const response = await fetch(
            `${HUBSPOT_API}/crm/v3/objects/deals?limit=${limit}&properties=dealname,amount,dealstage,closedate`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) {
            throw new Error(`HubSpot deals error: ${response.status}`);
        }

        const data = await response.json();
        return (data.results || []).map(r => ({
            id: r.id,
            name: r.properties?.dealname,
            amount: r.properties?.amount,
            stage: r.properties?.dealstage,
            closeDate: r.properties?.closedate,
            createdAt: r.createdAt
        }));
    }

    /**
     * Search contacts
     */
    async searchContacts(credentials, query) {
        const token = credentials.accessToken || credentials.apiKey;

        const response = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts/search`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query,
                properties: ['firstname', 'lastname', 'email', 'phone', 'company'],
                limit: 20
            })
        });

        if (!response.ok) {
            throw new Error(`HubSpot search error: ${response.status}`);
        }

        const data = await response.json();
        return (data.results || []).map(r => ({
            id: r.id,
            ...this.mapFields(r.properties || {}, 'contacts', 'inbound')
        }));
    }

    getCapabilities() {
        return {
            entities: ['contacts', 'companies', 'deals', 'activities'],
            operations: ['read', 'write', 'sync'],
            features: ['oauth', 'webhooks', 'search']
        };
    }
}

module.exports = HubSpotProvider;
