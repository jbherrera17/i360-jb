/**
 * INSIGHT 360 - Newsletter Fetcher
 * Parses pasted email/newsletter content into digest source items.
 */

/**
 * Parse newsletter content into a source item
 * @param {object} source - digest_sources row
 * @returns {Array} - Array of item objects
 */
async function fetch(source) {
    const { content, subject, sender } = source.config || {};

    if (!content) throw new Error('Newsletter source requires content');

    const cleanedContent = stripHtml(content);
    const title = subject || extractSubjectFromContent(cleanedContent) || 'Newsletter';

    return [{
        external_id: `newsletter-${Date.now()}-${hashContent(cleanedContent).slice(0, 8)}`,
        title,
        url: null,
        author: sender || null,
        published_at: new Date().toISOString(),
        raw_content: cleanedContent,
        metadata: {
            source_type: 'newsletter',
            original_length: content.length,
            cleaned_length: cleanedContent.length,
            has_html: content !== cleanedContent
        }
    }];
}

/**
 * Extract a likely subject line from the first line of content
 */
function extractSubjectFromContent(text) {
    if (!text) return null;
    const firstLine = text.split('\n')[0].trim();
    if (firstLine.length > 0 && firstLine.length <= 200) return firstLine;
    return null;
}

/**
 * Simple content hash for deduplication
 */
function hashContent(text) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(text || '').digest('hex');
}

/**
 * Basic HTML tag stripping (preserves text content)
 */
function stripHtml(html) {
    if (!html) return '';
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

module.exports = { fetch };
