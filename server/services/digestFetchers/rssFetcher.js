/**
 * INSIGHT 360 - RSS Feed Fetcher
 * Parses RSS/Atom feeds and extracts items.
 */

const Parser = require('rss-parser');
const parser = new Parser({
    timeout: 15000,
    maxRedirects: 3,
    headers: {
        'User-Agent': 'Insight360-Digest/1.0'
    }
});

/**
 * Fetch items from an RSS/Atom feed
 * @param {object} source - digest_sources row
 * @returns {Array} - Array of item objects
 */
async function fetch(source) {
    const { url, max_items } = source.config;

    if (!url) throw new Error('RSS source requires a URL');

    const feed = await parser.parseURL(url);
    const limit = max_items || 50;

    const items = (feed.items || []).slice(0, limit).map(entry => ({
        external_id: entry.guid || entry.link || entry.id,
        title: entry.title || 'Untitled',
        url: entry.link || null,
        author: entry.creator || entry.author || entry['dc:creator'] || null,
        published_at: entry.pubDate || entry.isoDate || new Date().toISOString(),
        raw_content: stripHtml(entry['content:encoded'] || entry.content || entry.contentSnippet || entry.summary || ''),
        categories: entry.categories || [],
        metadata: {
            feed_title: feed.title,
            feed_url: url,
            feed_description: feed.description
        }
    }));

    return items;
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
