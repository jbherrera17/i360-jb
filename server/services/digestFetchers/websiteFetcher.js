/**
 * INSIGHT 360 - Website Fetcher
 * Scrapes web pages with SSRF protection and content extraction.
 * Reuses sourceProcessor patterns for safety.
 */

const axios = require('axios');
const dns = require('dns');
const cheerio = require('cheerio');
const { promisify } = require('util');
const dnsResolve = promisify(dns.resolve4);

/**
 * Fetch and extract content from a website URL
 * @param {object} source - digest_sources row
 * @returns {Array} - Array of item objects (usually 1 item per fetch)
 */
async function fetch(source) {
    const { url, selectors } = source.config;
    if (!url) throw new Error('Website source requires a URL');

    await validateUrlSafety(url);

    const response = await axios.get(url, {
        timeout: 20000,
        maxContentLength: 10 * 1024 * 1024,
        headers: {
            'User-Agent': 'Insight360-Digest/1.0 (content aggregation)',
            'Accept': 'text/html,application/xhtml+xml'
        }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Remove noise elements
    $('script, style, nav, footer, header, aside, .ad, .advertisement, .cookie-banner').remove();

    let title, content, author, publishedAt;

    if (selectors && selectors.content) {
        title = selectors.title ? $(selectors.title).first().text().trim() : null;
        content = selectors.content ? $(selectors.content).first().text().trim() : null;
        author = selectors.author ? $(selectors.author).first().text().trim() : null;
        publishedAt = selectors.date ? ($(selectors.date).first().attr('datetime') || $(selectors.date).first().text().trim()) : null;
    } else {
        // Auto-extraction using common article patterns
        title = $('meta[property="og:title"]').attr('content') ||
                $('h1').first().text().trim() ||
                $('title').text().trim();

        author = $('meta[name="author"]').attr('content') ||
                 $('[rel="author"]').first().text().trim() ||
                 $('[class*="author"]').first().text().trim() || null;

        publishedAt = $('meta[property="article:published_time"]').attr('content') ||
                      $('time[datetime]').first().attr('datetime') || null;

        // Extract main content: try article, then main, then body
        const contentEl = $('article').length ? $('article') :
                          $('main').length ? $('main') :
                          $('body');
        content = contentEl.text().replace(/\s+/g, ' ').trim();
    }

    if (!title && !content) {
        return []; // Nothing extracted
    }

    return [{
        external_id: url,
        title: title || 'Untitled Page',
        url,
        author: author || null,
        published_at: publishedAt || new Date().toISOString(),
        raw_content: (content || '').substring(0, 50000), // Cap at 50k chars
        metadata: {
            extraction_method: selectors ? 'selectors' : 'readability'
        }
    }];
}

/**
 * SSRF protection - validates URL is not targeting internal networks
 */
async function validateUrlSafety(url) {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    const blocked = ['localhost', '127.0.0.1', '::1', '0.0.0.0', '169.254.169.254', 'metadata.google.internal'];
    if (blocked.includes(hostname)) {
        throw new Error('URLs targeting internal addresses are not allowed');
    }

    try {
        const addresses = await dnsResolve(hostname);
        for (const ip of addresses) {
            if (isPrivateIP(ip)) {
                throw new Error('URLs targeting internal network addresses are not allowed');
            }
        }
    } catch (err) {
        if (err.message.includes('not allowed')) throw err;
    }
}

function isPrivateIP(ip) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 0) return true;
    return false;
}

module.exports = { fetch };
