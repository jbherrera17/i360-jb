/**
 * INSIGHT 360 - Google Workspace Integration Provider
 *
 * Handles Google OAuth2 flow and delegates to service-specific modules
 * (Gmail, Drive, Calendar, Docs).
 */

const BaseIntegrationProvider = require('../../baseProvider');
const logger = require('../../../logger');
const GmailService = require('./gmail');
const DriveService = require('./drive');
const CalendarService = require('./calendar');
const SheetsService = require('./sheets');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

const GOOGLE_SCOPES = {
    gmail: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.labels'
    ],
    drive: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file'
    ],
    calendar: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events'
    ],
    docs: [
        'https://www.googleapis.com/auth/documents.readonly'
    ],
    sheets: [
        'https://www.googleapis.com/auth/spreadsheets.readonly'
    ]
};

class GoogleProvider extends BaseIntegrationProvider {
    constructor(config) {
        super({
            slug: 'google',
            name: 'Google Workspace',
            authType: 'oauth2',
            ...config
        });

        this.clientId = process.env.GOOGLE_CLIENT_ID;
        this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        this.gmail = new GmailService();
        this.drive = new DriveService();
        this.calendar = new CalendarService();
        this.sheets = new SheetsService();
    }

    getAuthorizationUrl(userId, scopes, redirectUri, state) {
        const allScopes = scopes || [
            'openid', 'email', 'profile',
            ...GOOGLE_SCOPES.gmail,
            ...GOOGLE_SCOPES.drive,
            ...GOOGLE_SCOPES.calendar
        ];

        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: allScopes.join(' '),
            access_type: 'offline',
            prompt: 'consent',
            state
        });

        return `${GOOGLE_AUTH_URL}?${params.toString()}`;
    }

    async exchangeCodeForTokens(code, redirectUri) {
        const response = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Google token exchange failed: ${error}`);
        }

        const data = await response.json();
        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            scopes: data.scope ? data.scope.split(' ') : []
        };
    }

    async refreshAccessToken(refreshToken) {
        const response = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                refresh_token: refreshToken,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                grant_type: 'refresh_token'
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Google token refresh failed: ${error}`);
        }

        const data = await response.json();
        return {
            access_token: data.access_token,
            expires_in: data.expires_in
        };
    }

    async getProfile(credentials) {
        const response = await fetch(GOOGLE_USERINFO_URL, {
            headers: { Authorization: `Bearer ${credentials.accessToken}` }
        });

        if (!response.ok) return null;

        const profile = await response.json();
        return {
            id: profile.sub,
            email: profile.email,
            name: profile.name,
            picture: profile.picture
        };
    }

    async testConnection(credentials) {
        try {
            const profile = await this.getProfile(credentials);
            return { success: !!profile, profile };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async fetchData(credentials, entityType, options = {}) {
        switch (entityType) {
            case 'emails':
                return this.gmail.getRecent(credentials.accessToken, options);
            case 'files':
                return this.drive.listFiles(credentials.accessToken, options);
            case 'events':
                return this.calendar.getUpcoming(credentials.accessToken, options);
            default:
                throw new Error(`Unknown entity type: ${entityType}`);
        }
    }

    async pushData(credentials, entityType, data) {
        switch (entityType) {
            case 'emails':
                return this.gmail.send(credentials.accessToken, data);
            case 'events':
                return this.calendar.createEvent(credentials.accessToken, data);
            default:
                throw new Error(`Push not supported for: ${entityType}`);
        }
    }

    getCapabilities() {
        return {
            entities: ['emails', 'files', 'events', 'documents'],
            operations: ['read', 'write'],
            features: ['oauth', 'webhooks']
        };
    }
}

module.exports = GoogleProvider;
