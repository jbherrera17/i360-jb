/**
 * INSIGHT 360 - Gmail Integration
 *
 * Read emails, send emails, manage labels via Gmail API.
 */

const logger = require('../../../logger');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

class GmailService {
    /**
     * Get recent emails
     */
    async getRecent(accessToken, options = {}) {
        const { maxResults = 10, query = '', labelIds } = options;

        const params = new URLSearchParams({
            maxResults: String(maxResults)
        });
        if (query) params.set('q', query);
        if (labelIds) params.set('labelIds', labelIds);

        const response = await fetch(`${GMAIL_API}/messages?${params}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error(`Gmail API error: ${response.status}`);
        }

        const data = await response.json();
        const messages = data.messages || [];

        // Fetch message details in parallel (limited batch)
        const details = await Promise.all(
            messages.slice(0, maxResults).map(msg => this.getMessage(accessToken, msg.id))
        );

        return {
            messages: details,
            resultSizeEstimate: data.resultSizeEstimate || 0
        };
    }

    /**
     * Get a single message with metadata
     */
    async getMessage(accessToken, messageId) {
        const response = await fetch(`${GMAIL_API}/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) return null;

        const msg = await response.json();
        const headers = {};
        (msg.payload?.headers || []).forEach(h => {
            headers[h.name.toLowerCase()] = h.value;
        });

        return {
            id: msg.id,
            threadId: msg.threadId,
            subject: headers.subject || '(no subject)',
            from: headers.from || '',
            to: headers.to || '',
            date: headers.date || '',
            snippet: msg.snippet || '',
            labelIds: msg.labelIds || []
        };
    }

    /**
     * Get full message content
     */
    async getMessageFull(accessToken, messageId) {
        const response = await fetch(`${GMAIL_API}/messages/${messageId}?format=full`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error(`Gmail API error: ${response.status}`);
        }

        const msg = await response.json();
        const headers = {};
        (msg.payload?.headers || []).forEach(h => {
            headers[h.name.toLowerCase()] = h.value;
        });

        // Extract plain text body
        let body = '';
        if (msg.payload?.body?.data) {
            body = Buffer.from(msg.payload.body.data, 'base64url').toString('utf8');
        } else if (msg.payload?.parts) {
            const textPart = msg.payload.parts.find(p => p.mimeType === 'text/plain');
            if (textPart?.body?.data) {
                body = Buffer.from(textPart.body.data, 'base64url').toString('utf8');
            }
        }

        return {
            id: msg.id,
            threadId: msg.threadId,
            subject: headers.subject || '(no subject)',
            from: headers.from || '',
            to: headers.to || '',
            date: headers.date || '',
            body,
            labelIds: msg.labelIds || []
        };
    }

    /**
     * Send an email
     */
    async send(accessToken, { to, subject, body }) {
        const email = [
            `To: ${to}`,
            `Subject: ${subject}`,
            'Content-Type: text/plain; charset=utf-8',
            '',
            body
        ].join('\r\n');

        const encoded = Buffer.from(email).toString('base64url');

        const response = await fetch(`${GMAIL_API}/messages/send`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw: encoded })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Gmail send failed: ${error}`);
        }

        return response.json();
    }

    /**
     * List labels
     */
    async getLabels(accessToken) {
        const response = await fetch(`${GMAIL_API}/labels`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error(`Gmail API error: ${response.status}`);
        }

        const data = await response.json();
        return data.labels || [];
    }

    /**
     * Format emails for agent context injection
     */
    formatForContext(messages) {
        if (!messages || messages.length === 0) return 'No recent emails.';

        return messages.map((m, i) =>
            `${i + 1}. From: ${m.from}\n   Subject: ${m.subject}\n   Date: ${m.date}\n   Preview: ${m.snippet}`
        ).join('\n\n');
    }
}

module.exports = GmailService;
