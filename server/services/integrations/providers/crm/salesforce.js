/**
 * INSIGHT 360 - Salesforce CRM Provider
 *
 * Connects to Salesforce via OAuth2 / REST API.
 * Handles contacts, accounts, opportunities, and activities.
 */

const GenericCRMProvider = require('./generic');
const logger = require('../../../logger');

const SF_AUTH_URL = 'https://login.salesforce.com/services/oauth2/authorize';
const SF_TOKEN_URL = 'https://login.salesforce.com/services/oauth2/token';

class SalesforceProvider extends GenericCRMProvider {
    constructor(config) {
        super({
            slug: 'salesforce',
            name: 'Salesforce',
            authType: 'oauth2',
            fieldMapping: {
                contacts: {
                    endpoint: '/services/data/v59.0/sobjects/Contact',
                    inbound: {
                        Id: 'id',
                        FirstName: 'firstName',
                        LastName: 'lastName',
                        Email: 'email',
                        Phone: 'phone',
                        Title: 'title',
                        AccountId: 'companyId'
                    },
                    outbound: {
                        firstName: 'FirstName',
                        lastName: 'LastName',
                        email: 'Email',
                        phone: 'Phone',
                        title: 'Title',
                        companyId: 'AccountId'
                    }
                },
                deals: {
                    endpoint: '/services/data/v59.0/sobjects/Opportunity'
                },
                activities: {
                    endpoint: '/services/data/v59.0/sobjects/Task'
                },
                test: {
                    endpoint: '/services/data/v59.0/sobjects'
                },
                profile: {
                    endpoint: '/services/oauth2/userinfo'
                }
            },
            ...config
        });

        this.clientId = process.env.SALESFORCE_CLIENT_ID;
        this.clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    }

    getAuthorizationUrl(userId, scopes, redirectUri, state) {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.clientId,
            redirect_uri: redirectUri,
            scope: 'full refresh_token',
            state
        });

        return `${SF_AUTH_URL}?${params.toString()}`;
    }

    async exchangeCodeForTokens(code, redirectUri) {
        const response = await fetch(SF_TOKEN_URL, {
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
            throw new Error(`Salesforce token exchange failed: ${error}`);
        }

        const data = await response.json();
        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: 7200, // Salesforce tokens typically last 2 hours
            instance_url: data.instance_url,
            scopes: ['full']
        };
    }

    async refreshAccessToken(refreshToken) {
        const response = await fetch(SF_TOKEN_URL, {
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
            throw new Error(`Salesforce token refresh failed: ${error}`);
        }

        const data = await response.json();
        return {
            access_token: data.access_token,
            expires_in: 7200
        };
    }

    async getProfile(credentials) {
        try {
            const instanceUrl = credentials.settings?.instance_url || 'https://login.salesforce.com';
            const response = await fetch(`${instanceUrl}/services/oauth2/userinfo`, {
                headers: { Authorization: `Bearer ${credentials.accessToken}` }
            });

            if (!response.ok) return null;

            const data = await response.json();
            return {
                id: data.user_id,
                email: data.email,
                name: data.name,
                organization_id: data.organization_id
            };
        } catch {
            return null;
        }
    }

    /**
     * SOQL query support
     */
    async query(credentials, soql) {
        const instanceUrl = credentials.settings?.instance_url || credentials.apiEndpoint;
        const response = await fetch(
            `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`,
            { headers: { Authorization: `Bearer ${credentials.accessToken}` } }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Salesforce query failed: ${error}`);
        }

        const data = await response.json();
        return data.records || [];
    }

    async getContacts(credentials, options = {}) {
        const limit = options.maxResults || 50;
        const records = await this.query(credentials,
            `SELECT Id, FirstName, LastName, Email, Phone, Title, AccountId FROM Contact ORDER BY LastModifiedDate DESC LIMIT ${limit}`
        );
        return this.mapRecords(records, 'contacts', 'inbound');
    }

    async getDeals(credentials, options = {}) {
        const limit = options.maxResults || 50;
        return this.query(credentials,
            `SELECT Id, Name, Amount, StageName, CloseDate, AccountId FROM Opportunity ORDER BY LastModifiedDate DESC LIMIT ${limit}`
        );
    }

    getCapabilities() {
        return {
            entities: ['contacts', 'accounts', 'opportunities', 'activities'],
            operations: ['read', 'write', 'sync'],
            features: ['oauth', 'webhooks', 'batch', 'search']
        };
    }
}

module.exports = SalesforceProvider;
