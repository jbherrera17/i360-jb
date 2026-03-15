/**
 * INSIGHT 360 - Substack Publishing Service (BETA)
 * Version: 1.0.0
 *
 * Publishes articles to Substack using reverse-engineered API endpoints.
 * Uses cookie-based authentication (substack.sid, connect.sid).
 *
 * WARNING: This uses unofficial API endpoints that may change without notice.
 * Session cookies expire and require manual renewal.
 *
 * Security: Cookies are encrypted at rest using AES-256-GCM (same pattern
 * as linkedinService.js and postizService.js).
 */

const crypto = require('crypto');
const logger = require('./logger');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Encryption (same pattern as linkedinService/postizService)
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY
    ? Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'hex')
    : crypto.randomBytes(32);

function encryptCookie(cookie) {
    if (!cookie) return null;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(cookie, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptCookie(encryptedCookie) {
    if (!encryptedCookie) return null;
    try {
        const [ivHex, authTagHex, encrypted] = encryptedCookie.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        logger.error('[Substack] Cookie decryption failed:', error);
        return null;
    }
}

/**
 * Get Substack credentials for an organization
 */
async function getCredentials(orgId) {
    const { data, error } = await supabase
        .from('substack_credentials')
        .select('*')
        .eq('org_id', orgId)
        .eq('status', 'active')
        .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
}

/**
 * Check if Substack is configured for an org
 */
async function isConfigured(orgId) {
    const creds = await getCredentials(orgId);
    return !!creds;
}

/**
 * Store Substack credentials (encrypted)
 */
async function configureSubstack(orgId, userId, publicationUrl, cookies) {
    const encryptedCookie = encryptCookie(JSON.stringify(cookies));

    const { data, error } = await supabase
        .from('substack_credentials')
        .upsert({
            org_id: orgId,
            configured_by: userId,
            publication_url: publicationUrl.replace(/\/$/, ''),
            cookie_encrypted: encryptedCookie,
            cookie_expires_at: cookies.expires_at || null,
            status: 'active',
            updated_at: new Date().toISOString()
        }, { onConflict: 'org_id' })
        .select()
        .single();

    if (error) throw error;
    logger.info(`[Substack] Configured for org ${orgId}: ${publicationUrl}`);
    return data;
}

/**
 * Make an authenticated request to the Substack API
 */
async function substackRequest(orgId, method, path, body = null) {
    const creds = await getCredentials(orgId);
    if (!creds) throw new Error('Substack not configured for this organization');

    const cookies = JSON.parse(decryptCookie(creds.cookie_encrypted));
    if (!cookies) throw new Error('Failed to decrypt Substack cookies');

    const baseUrl = creds.publication_url.replace(/\/$/, '');
    const url = `${baseUrl}/api/v1${path}`;

    // Build cookie header
    const cookieHeader = Object.entries(cookies)
        .filter(([k]) => k !== 'expires_at')
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader,
            'User-Agent': 'Insight360/1.0'
        }
    };

    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            const errorText = await response.text();

            // Check for auth failures
            if (response.status === 401 || response.status === 403) {
                // Mark credentials as expired
                await supabase
                    .from('substack_credentials')
                    .update({ status: 'expired', last_error: `Auth failed: ${response.status}` })
                    .eq('org_id', orgId);

                throw new Error('Substack session expired. Please refresh your cookies in Thought Leadership settings.');
            }

            throw new Error(`Substack API error: ${response.status} - ${errorText.substring(0, 200)}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            return response.json();
        }
        return response.text();
    } catch (error) {
        // Update last error
        await supabase
            .from('substack_credentials')
            .update({
                last_error: error.message,
                last_used_at: new Date().toISOString()
            })
            .eq('org_id', orgId);

        throw error;
    }
}

/**
 * Convert markdown article to Substack's body JSON format
 * Substack uses a ProseMirror-compatible document format
 */
function markdownToSubstackBody(markdown) {
    const lines = markdown.split('\n');
    const content = [];

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];

        // Skip empty lines
        if (line.trim() === '') {
            i++;
            continue;
        }

        // Horizontal rule
        if (line.match(/^---+$/)) {
            content.push({ type: 'horizontal_rule' });
            i++;
            continue;
        }

        // Headings
        const h1Match = line.match(/^# (.+)/);
        if (h1Match) {
            content.push({
                type: 'heading',
                attrs: { level: 1 },
                content: [{ type: 'text', text: h1Match[1].replace(/\*\*/g, '') }]
            });
            i++;
            continue;
        }

        const h2Match = line.match(/^## (.+)/);
        if (h2Match) {
            content.push({
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: h2Match[1].replace(/\*\*/g, '') }]
            });
            i++;
            continue;
        }

        const h3Match = line.match(/^### (.+)/);
        if (h3Match) {
            content.push({
                type: 'heading',
                attrs: { level: 3 },
                content: [{ type: 'text', text: h3Match[1].replace(/\*\*/g, '') }]
            });
            i++;
            continue;
        }

        // Blockquote
        if (line.startsWith('> ')) {
            content.push({
                type: 'blockquote',
                content: [{
                    type: 'paragraph',
                    content: [{ type: 'text', text: line.slice(2) }]
                }]
            });
            i++;
            continue;
        }

        // Bulleted list item
        if (line.match(/^[\-\*] /)) {
            const items = [];
            while (i < lines.length && lines[i].match(/^[\-\*] /)) {
                items.push({
                    type: 'list_item',
                    content: [{
                        type: 'paragraph',
                        content: parseInlineMarks(lines[i].slice(2))
                    }]
                });
                i++;
            }
            content.push({ type: 'bullet_list', content: items });
            continue;
        }

        // Numbered list item
        if (line.match(/^\d+\. /)) {
            const items = [];
            while (i < lines.length && lines[i].match(/^\d+\. /)) {
                items.push({
                    type: 'list_item',
                    content: [{
                        type: 'paragraph',
                        content: parseInlineMarks(lines[i].replace(/^\d+\. /, ''))
                    }]
                });
                i++;
            }
            content.push({ type: 'ordered_list', content: items });
            continue;
        }

        // Regular paragraph
        content.push({
            type: 'paragraph',
            content: parseInlineMarks(line)
        });
        i++;
    }

    return { type: 'doc', content };
}

/**
 * Parse inline markdown marks (bold, italic) into Substack text nodes
 */
function parseInlineMarks(text) {
    const nodes = [];
    let remaining = text;

    while (remaining.length > 0) {
        // Bold **text**
        const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
        if (boldMatch) {
            nodes.push({
                type: 'text',
                marks: [{ type: 'strong' }],
                text: boldMatch[1]
            });
            remaining = remaining.slice(boldMatch[0].length);
            continue;
        }

        // Italic *text*
        const italicMatch = remaining.match(/^\*(.+?)\*/);
        if (italicMatch) {
            nodes.push({
                type: 'text',
                marks: [{ type: 'em' }],
                text: italicMatch[1]
            });
            remaining = remaining.slice(italicMatch[0].length);
            continue;
        }

        // Regular text up to next special char
        const nextSpecial = remaining.search(/\*/);
        if (nextSpecial === -1) {
            nodes.push({ type: 'text', text: remaining });
            break;
        } else if (nextSpecial === 0) {
            nodes.push({ type: 'text', text: remaining[0] });
            remaining = remaining.slice(1);
        } else {
            nodes.push({ type: 'text', text: remaining.slice(0, nextSpecial) });
            remaining = remaining.slice(nextSpecial);
        }
    }

    return nodes.length > 0 ? nodes : [{ type: 'text', text: text }];
}

/**
 * Publish an article to Substack
 * Three-step process: create draft → prepublish → publish
 *
 * @param {string} orgId - Organization ID
 * @param {Object} article - Article data
 * @param {string} article.title - Article title
 * @param {string} article.subtitle - Article subtitle
 * @param {string} article.markdown - Article content in markdown
 * @param {string} article.headerImageUrl - Header/cover image URL
 * @returns {Object} - { success, postId, url, substackUrl }
 */
async function publishArticle(orgId, article) {
    const { title, subtitle, markdown, headerImageUrl } = article;

    if (!title || !markdown) {
        throw new Error('Title and markdown content are required');
    }

    logger.info(`[Substack] Publishing article: "${title}" for org ${orgId}`);

    // Step 1: Create draft
    const body = markdownToSubstackBody(markdown);

    const draftPayload = {
        draft_title: title,
        draft_subtitle: subtitle || '',
        draft_body: JSON.stringify(body),
        type: 'newsletter',
        audience: 'everyone'
    };

    if (headerImageUrl) {
        draftPayload.cover_image = headerImageUrl;
    }

    const draft = await substackRequest(orgId, 'POST', '/drafts', draftPayload);
    const draftId = draft.id;

    if (!draftId) {
        throw new Error('Failed to create Substack draft — no ID returned');
    }

    logger.info(`[Substack] Draft created: ${draftId}`);

    // Step 2: Prepublish (validates the draft)
    try {
        await substackRequest(orgId, 'POST', `/drafts/${draftId}/prepublish`, {});
    } catch (prepubErr) {
        logger.warn(`[Substack] Prepublish step failed (may be optional): ${prepubErr.message}`);
        // Some Substack instances don't require prepublish — continue
    }

    // Step 3: Publish
    const published = await substackRequest(orgId, 'POST', `/drafts/${draftId}/publish`, {
        send: true
    });

    // Update last used
    await supabase
        .from('substack_credentials')
        .update({
            last_used_at: new Date().toISOString(),
            last_error: null
        })
        .eq('org_id', orgId);

    const creds = await getCredentials(orgId);
    const substackUrl = published.canonical_url ||
        `${creds.publication_url}/p/${published.slug || draftId}`;

    logger.info(`[Substack] Published: ${substackUrl}`);

    return {
        success: true,
        postId: published.id || draftId,
        slug: published.slug,
        url: substackUrl,
        substackUrl
    };
}

module.exports = {
    isConfigured,
    configureSubstack,
    getCredentials,
    publishArticle,
    encryptCookie,
    decryptCookie,
    markdownToSubstackBody
};
