/**
 * INSIGHT 360 - Generic CRM Provider
 *
 * Adapter pattern for connecting to any CRM system with a REST API.
 * Supports configurable field mapping between i360 and external CRM entities.
 */

const BaseIntegrationProvider = require('../../baseProvider');
const logger = require('../../../logger');

class GenericCRMProvider extends BaseIntegrationProvider {
    constructor(config) {
        super({
            slug: config.slug,
            name: config.name,
            authType: config.authType || 'api_key',
            ...config
        });
        this.fieldMapping = config.fieldMapping || {};
        this.baseUrl = config.baseUrl || '';
    }

    /**
     * Make an authenticated API request to the CRM
     */
    async request(method, endpoint, credentials, body = null) {
        const url = `${credentials.apiEndpoint || credentials.endpoint || this.baseUrl}${endpoint}`;

        const headers = {
            'Content-Type': 'application/json'
        };

        // Support multiple auth methods
        if (credentials.accessToken) {
            headers['Authorization'] = `Bearer ${credentials.accessToken}`;
        } else if (credentials.apiKey) {
            headers['Authorization'] = `Bearer ${credentials.apiKey}`;
        }

        const options = { method, headers };
        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`CRM API error (${response.status}): ${error}`);
        }

        return response.json();
    }

    /**
     * Map fields between i360 and external system
     */
    mapFields(data, entityType, direction) {
        const mapping = this.fieldMapping[entityType];
        if (!mapping) return data;

        const fieldMap = direction === 'outbound' ? mapping.outbound : mapping.inbound;
        if (!fieldMap) return data;

        const result = {};
        for (const [key, value] of Object.entries(data)) {
            const mappedKey = fieldMap[key] || key;
            result[mappedKey] = value;
        }
        return result;
    }

    /**
     * Map an array of records
     */
    mapRecords(records, entityType, direction) {
        return records.map(r => this.mapFields(r, entityType, direction));
    }

    // === Entity Operations ===

    async getContacts(credentials, options = {}) {
        const endpoint = this.fieldMapping.contacts?.endpoint || '/contacts';
        const data = await this.request('GET', endpoint, credentials);
        const records = Array.isArray(data) ? data : (data.results || data.data || data.records || []);
        return this.mapRecords(records, 'contacts', 'inbound');
    }

    async getContact(credentials, contactId) {
        const endpoint = this.fieldMapping.contacts?.endpoint || '/contacts';
        const data = await this.request('GET', `${endpoint}/${contactId}`, credentials);
        return this.mapFields(data, 'contacts', 'inbound');
    }

    async createContact(credentials, contactData) {
        const mapped = this.mapFields(contactData, 'contacts', 'outbound');
        const endpoint = this.fieldMapping.contacts?.endpoint || '/contacts';
        return this.request('POST', endpoint, credentials, mapped);
    }

    async updateContact(credentials, contactId, contactData) {
        const mapped = this.mapFields(contactData, 'contacts', 'outbound');
        const endpoint = this.fieldMapping.contacts?.endpoint || '/contacts';
        return this.request('PUT', `${endpoint}/${contactId}`, credentials, mapped);
    }

    async getDeals(credentials, options = {}) {
        const endpoint = this.fieldMapping.deals?.endpoint || '/deals';
        const data = await this.request('GET', endpoint, credentials);
        const records = Array.isArray(data) ? data : (data.results || data.data || data.records || []);
        return this.mapRecords(records, 'deals', 'inbound');
    }

    async getActivities(credentials, options = {}) {
        const endpoint = this.fieldMapping.activities?.endpoint || '/activities';
        const data = await this.request('GET', endpoint, credentials);
        const records = Array.isArray(data) ? data : (data.results || data.data || data.records || []);
        return this.mapRecords(records, 'activities', 'inbound');
    }

    // === BaseProvider Interface ===

    async testConnection(credentials) {
        try {
            const endpoint = this.fieldMapping.test?.endpoint || '/me';
            await this.request('GET', endpoint, credentials);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getProfile(credentials) {
        try {
            const endpoint = this.fieldMapping.profile?.endpoint || '/me';
            const data = await this.request('GET', endpoint, credentials);
            return {
                id: data.id || data.userId || null,
                email: data.email || null,
                name: data.name || data.displayName || null
            };
        } catch {
            return null;
        }
    }

    async fetchData(credentials, entityType, options = {}) {
        switch (entityType) {
            case 'contacts': return this.getContacts(credentials, options);
            case 'deals': return this.getDeals(credentials, options);
            case 'activities': return this.getActivities(credentials, options);
            default: throw new Error(`Unknown entity type: ${entityType}`);
        }
    }

    async pushData(credentials, entityType, data) {
        switch (entityType) {
            case 'contacts': return this.createContact(credentials, data);
            default: throw new Error(`Push not supported for: ${entityType}`);
        }
    }

    getCapabilities() {
        return {
            entities: ['contacts', 'deals', 'activities'],
            operations: ['read', 'write', 'sync'],
            features: ['batch']
        };
    }
}

module.exports = GenericCRMProvider;
