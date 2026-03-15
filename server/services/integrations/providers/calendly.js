/**
 * INSIGHT 360 - Calendly Integration Provider
 * Phase 73: Embeddable Chat Widgets
 *
 * Supports two auth modes:
 * - Personal Access Token (free tier, for testing)
 * - OAuth 2.0 (for production, per-org connections)
 *
 * Phase 1: Embed URL management + connection testing
 * Phase 2 (future): MCP server integration for programmatic scheduling
 */

const BaseIntegrationProvider = require('../baseProvider');
const logger = require('../../logger');

const CALENDLY_API = 'https://api.calendly.com';
const CALENDLY_AUTH_URL = 'https://auth.calendly.com/oauth/authorize';
const CALENDLY_TOKEN_URL = 'https://auth.calendly.com/oauth/token';

class CalendlyProvider extends BaseIntegrationProvider {
    constructor(config) {
        super({
            slug: 'calendly',
            name: 'Calendly',
            authType: 'oauth2',
            ...config
        });

        this.clientId = process.env.CALENDLY_CLIENT_ID;
        this.clientSecret = process.env.CALENDLY_CLIENT_SECRET;
    }

    // ── OAuth Flow ───────────────────────────────────────────

    getAuthorizationUrl(userId, scopes, redirectUri, state) {
        if (!this.clientId) {
            throw new Error('CALENDLY_CLIENT_ID not configured');
        }

        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            state
        });

        return `${CALENDLY_AUTH_URL}?${params.toString()}`;
    }

    async exchangeCodeForTokens(code, redirectUri) {
        const response = await fetch(CALENDLY_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: this.clientId,
                client_secret: this.clientSecret
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Calendly token exchange failed: ${response.status} ${error}`);
        }

        const data = await response.json();
        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            token_type: data.token_type,
            created_at: data.created_at
        };
    }

    async refreshAccessToken(refreshToken) {
        const response = await fetch(CALENDLY_TOKEN_URL, {
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
            throw new Error(`Calendly token refresh failed: ${response.status}`);
        }

        const data = await response.json();
        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token || refreshToken,
            expires_in: data.expires_in
        };
    }

    // ── Connection Management ────────────────────────────────

    async testConnection(credentials) {
        try {
            const profile = await this.getProfile(credentials);
            return { success: true, profile };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getProfile(credentials) {
        const token = credentials.access_token || credentials.api_key;
        if (!token) throw new Error('No Calendly access token or API key');

        const response = await fetch(`${CALENDLY_API}/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`Calendly API error: ${response.status}`);
        }

        const data = await response.json();
        const user = data.resource;

        return {
            uri: user.uri,
            name: user.name,
            email: user.email,
            slug: user.slug,
            scheduling_url: user.scheduling_url,
            timezone: user.timezone,
            avatar_url: user.avatar_url
        };
    }

    // ── Data Operations ──────────────────────────────────────

    async fetchData(credentials, entityType, options = {}) {
        const token = credentials.access_token || credentials.api_key;
        if (!token) throw new Error('No Calendly access token');

        switch (entityType) {
            case 'event_types':
                return this.getEventTypes(token, options);
            case 'scheduled_events':
                return this.getScheduledEvents(token, options);
            default:
                throw new Error(`Unsupported entity type: ${entityType}`);
        }
    }

    /**
     * List event types (consultation types) for the user.
     * Used to map procedures to Calendly event types.
     */
    async getEventTypes(token, options = {}) {
        // First get user URI
        const profile = await this.getProfile({ access_token: token });

        const params = new URLSearchParams({
            user: profile.uri,
            active: 'true'
        });

        const response = await fetch(`${CALENDLY_API}/event_types?${params}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`Calendly event types error: ${response.status}`);
        }

        const data = await response.json();
        return {
            event_types: (data.collection || []).map(et => ({
                uri: et.uri,
                name: et.name,
                slug: et.slug,
                scheduling_url: et.scheduling_url,
                duration: et.duration,
                description_plain: et.description_plain,
                active: et.active,
                color: et.color
            }))
        };
    }

    /**
     * List scheduled events (upcoming appointments).
     */
    async getScheduledEvents(token, options = {}) {
        const profile = await this.getProfile({ access_token: token });
        const { maxResults = 20, status = 'active' } = options;

        const params = new URLSearchParams({
            user: profile.uri,
            status,
            count: String(maxResults),
            sort: 'start_time:asc',
            min_start_time: new Date().toISOString()
        });

        const response = await fetch(`${CALENDLY_API}/scheduled_events?${params}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`Calendly scheduled events error: ${response.status}`);
        }

        const data = await response.json();
        return {
            events: (data.collection || []).map(e => ({
                uri: e.uri,
                name: e.name,
                status: e.status,
                start_time: e.start_time,
                end_time: e.end_time,
                event_type: e.event_type,
                location: e.location,
                created_at: e.created_at
            }))
        };
    }

    /**
     * Get available times for an event type.
     * Requires at least Calendly Standard plan.
     */
    async getAvailability(token, eventTypeUri, options = {}) {
        const { startTime, endTime } = options;
        const start = startTime || new Date().toISOString();
        const end = endTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const params = new URLSearchParams({
            event_type: eventTypeUri,
            start_time: start,
            end_time: end
        });

        const response = await fetch(`${CALENDLY_API}/event_type_available_times?${params}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            // Free tier may not have this endpoint
            if (response.status === 403) {
                return { available: false, reason: 'Requires Calendly Standard plan or higher' };
            }
            throw new Error(`Calendly availability error: ${response.status}`);
        }

        const data = await response.json();
        return {
            available: true,
            times: (data.collection || []).map(t => ({
                status: t.status,
                start_time: t.start_time,
                invitees_remaining: t.invitees_remaining
            }))
        };
    }
}

module.exports = CalendlyProvider;
