/**
 * INSIGHT 360 - EspoCRM Provider (Synergi Internal)
 *
 * Connects to Synergi's internally hosted EspoCRM instance.
 * Not exposed to platform clients — Synergi team use only.
 */

const GenericCRMProvider = require('./generic');

class EspoCRMProvider extends GenericCRMProvider {
    constructor(config) {
        super({
            slug: 'espocrm',
            name: 'EspoCRM (Synergi)',
            authType: 'api_key',
            baseUrl: process.env.ESPOCRM_URL || 'http://localhost:8080',
            fieldMapping: {
                contacts: {
                    endpoint: '/api/v1/Contact',
                    inbound: {
                        id: 'id',
                        firstName: 'firstName',
                        lastName: 'lastName',
                        emailAddress: 'email',
                        phoneNumber: 'phone',
                        title: 'title',
                        accountId: 'companyId'
                    },
                    outbound: {
                        firstName: 'firstName',
                        lastName: 'lastName',
                        email: 'emailAddress',
                        phone: 'phoneNumber',
                        title: 'title',
                        companyId: 'accountId'
                    }
                },
                deals: {
                    endpoint: '/api/v1/Opportunity'
                },
                activities: {
                    endpoint: '/api/v1/Task'
                },
                accounts: {
                    endpoint: '/api/v1/Account'
                },
                test: {
                    endpoint: '/api/v1/App/user'
                },
                profile: {
                    endpoint: '/api/v1/App/user'
                }
            },
            ...config
        });
    }

    /**
     * Override request to use EspoCRM API key auth header format
     */
    async request(method, endpoint, credentials, body = null) {
        const url = `${credentials.apiEndpoint || credentials.endpoint || this.baseUrl}${endpoint}`;
        const apiKey = credentials.apiKey || process.env.ESPOCRM_API_KEY;

        const headers = {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey
        };

        const options = { method, headers };
        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`EspoCRM API error (${response.status}): ${error}`);
        }

        return response.json();
    }

    async getContacts(credentials, options = {}) {
        const data = await this.request('GET', '/api/v1/Contact?maxSize=50&orderBy=modifiedAt&order=desc', credentials);
        return this.mapRecords(data.list || [], 'contacts', 'inbound');
    }

    async getProfile(credentials) {
        try {
            const data = await this.request('GET', '/api/v1/App/user', credentials);
            return {
                id: data.user?.id || null,
                email: data.user?.emailAddress || null,
                name: data.user?.name || null
            };
        } catch {
            return null;
        }
    }

    getCapabilities() {
        return {
            entities: ['contacts', 'accounts', 'deals', 'activities'],
            operations: ['read', 'write', 'sync'],
            features: ['batch']
        };
    }
}

module.exports = EspoCRMProvider;
