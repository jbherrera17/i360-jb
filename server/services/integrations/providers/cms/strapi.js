/**
 * INSIGHT 360 - Strapi CMS Provider (Synergi Internal)
 *
 * Connects to Synergi's internally hosted Strapi CMS instance.
 * Manages knowledge base, templates, blog content, and brand assets.
 * Not exposed to platform clients — Synergi team use only.
 */

const BaseIntegrationProvider = require('../../baseProvider');

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';

class StrapiProvider extends BaseIntegrationProvider {
    constructor(config) {
        super({
            slug: 'strapi',
            name: 'Strapi CMS (Synergi)',
            authType: 'api_key',
            ...config
        });
    }

    /**
     * Make an authenticated request to Strapi
     */
    async request(method, endpoint, credentials = {}, body = null) {
        const baseUrl = credentials.apiEndpoint || credentials.endpoint || STRAPI_URL;
        const apiKey = credentials.apiKey || process.env.STRAPI_API_KEY;

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };

        const options = { method, headers };
        if (body && method !== 'GET') {
            options.body = JSON.stringify({ data: body });
        }

        const response = await fetch(`${baseUrl}${endpoint}`, options);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Strapi API error (${response.status}): ${error}`);
        }

        return response.json();
    }

    // === Content Operations ===

    async getEntries(credentials, contentType, options = {}) {
        const { page = 1, pageSize = 25, sort = 'updatedAt:desc' } = options;
        const params = new URLSearchParams({
            'pagination[page]': String(page),
            'pagination[pageSize]': String(pageSize),
            'sort': sort
        });

        const data = await this.request('GET', `/api/${contentType}?${params}`, credentials);
        return {
            entries: (data.data || []).map(e => ({
                id: e.id,
                ...e.attributes
            })),
            pagination: data.meta?.pagination || {}
        };
    }

    async getEntry(credentials, contentType, entryId) {
        const data = await this.request('GET', `/api/${contentType}/${entryId}`, credentials);
        return {
            id: data.data?.id,
            ...data.data?.attributes
        };
    }

    async createEntry(credentials, contentType, entryData) {
        const data = await this.request('POST', `/api/${contentType}`, credentials, entryData);
        return {
            id: data.data?.id,
            ...data.data?.attributes
        };
    }

    async updateEntry(credentials, contentType, entryId, entryData) {
        const data = await this.request('PUT', `/api/${contentType}/${entryId}`, credentials, entryData);
        return {
            id: data.data?.id,
            ...data.data?.attributes
        };
    }

    async deleteEntry(credentials, contentType, entryId) {
        return this.request('DELETE', `/api/${contentType}/${entryId}`, credentials);
    }

    // === BaseProvider Interface ===

    async testConnection(credentials) {
        try {
            await this.request('GET', '/api/content-types', credentials);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getProfile(credentials) {
        try {
            const data = await this.request('GET', '/api/users/me', credentials);
            return {
                id: data.id?.toString() || null,
                email: data.email || null,
                name: data.username || null
            };
        } catch {
            return null;
        }
    }

    async fetchData(credentials, entityType, options = {}) {
        return this.getEntries(credentials, entityType, options);
    }

    async pushData(credentials, entityType, data) {
        return this.createEntry(credentials, entityType, data);
    }

    getCapabilities() {
        return {
            entities: ['articles', 'templates', 'knowledge-base', 'brand-assets'],
            operations: ['read', 'write', 'delete'],
            features: ['search']
        };
    }
}

module.exports = StrapiProvider;
