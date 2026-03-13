/**
 * INSIGHT 360 - Digest Source Discovery Service
 * Version: 1.0.0
 *
 * AI-powered discovery of relevant content sources for a given topic.
 * Uses Anthropic Claude to generate candidates, validates each URL,
 * and deduplicates against the org's existing sources.
 */

const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// URL patterns that strongly indicate an RSS/Atom feed
const RSS_PATH_PATTERNS = [
    /\/feed\/?$/i,
    /\/rss\/?$/i,
    /\/atom\/?$/i,
    /\/feed\.xml$/i,
    /\/rss\.xml$/i,
    /\/atom\.xml$/i,
    /\.rss$/i
];

// Domains known to require subscriptions
const SUBSCRIPTION_DOMAINS = [
    'wsj.com', 'ft.com', 'economist.com', 'nytimes.com',
    'bloomberg.com', 'hbr.org', 'thetimes.co.uk', 'washingtonpost.com',
    'theatlantic.com', 'wired.com', 'businessinsider.com'
];

// ============================================================================
// MAIN DISCOVERY
// ============================================================================

/**
 * Discover relevant content sources for a topic using Claude.
 * @param {string} topic
 * @param {string|null} hints - Optional comma-separated domain/source hints
 * @param {string} orgId
 * @returns {{ sources: DiscoveredSource[] }}
 */
async function discoverSources(topic, hints, orgId) {
    if (!topic || topic.trim().length < 2) {
        throw new Error('Topic must be at least 2 characters');
    }

    const trimmedTopic = topic.trim().substring(0, 200);
    const trimmedHints = hints ? hints.trim().substring(0, 500) : null;

    console.log(`[DigestDiscovery] Discovering sources for topic: "${trimmedTopic}"`);

    // 1. Ask Claude for source candidates
    const rawCandidates = await askClaudeForSources(trimmedTopic, trimmedHints);

    // 2. Validate URLs in parallel (batched HEAD requests)
    const validated = await validateAllUrls(rawCandidates);

    // 3. Flag subscription requirements
    const withSubscriptionFlags = validated.map(s => ({
        ...s,
        is_subscription: isSubscriptionRequired(s.url)
    }));

    // 4. Check which are already in the org's digest
    const existingUrls = await getOrgSourceUrls(orgId);
    const withDupeFlags = withSubscriptionFlags.map(s => ({
        ...s,
        already_added: existingUrls.has(normalizeUrl(s.url))
    }));

    // 5. Sort: accessible first, then by relevance_score desc
    withDupeFlags.sort((a, b) => {
        if (a.accessible !== b.accessible) return a.accessible ? -1 : 1;
        return (b.relevance_score || 0) - (a.relevance_score || 0);
    });

    return { sources: withDupeFlags };
}

// ============================================================================
// CLAUDE PROMPT
// ============================================================================

async function askClaudeForSources(topic, hints) {
    const hintsBlock = hints
        ? `\n\nThe user has provided these domain/source hints to prioritize or include:\n${hints}`
        : '';

    const prompt = `You are a content source research specialist. Your task is to identify the best online content sources for the following topic.

Topic: ${topic}${hintsBlock}

Return 10-16 high-quality, real content sources. Include a mix of:
- RSS feeds from authoritative blogs, publications, and industry sites
- Websites/news sites with strong editorial coverage
- Newsletters from recognized experts or organizations

Rules:
1. Only include sources that genuinely exist and are publicly accessible
2. Prefer sources with RSS feeds when available — include the direct feed URL (e.g. https://blog.example.com/feed)
3. Include at least 3-4 RSS sources
4. For websites without feeds, include the main URL or specific section URL
5. Do NOT invent sources — only include real, well-known sources you are confident about
6. Relevance score should reflect how directly and consistently this source covers the topic

Return ONLY valid JSON in this exact format:
{
  "sources": [
    {
      "name": "Publication or Feed Name",
      "url": "https://example.com/feed.xml",
      "description": "What this source covers and why it is relevant to the topic",
      "source_type": "rss",
      "relevance_score": 92,
      "reason": "One sentence on why this is a top source for this topic"
    }
  ]
}

source_type must be one of: "rss", "website", "newsletter"
relevance_score is an integer 0-100
Return ONLY the JSON object. No markdown fences, no explanation.`;

    const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0]?.text || '';

    try {
        let json = text.trim();
        if (json.startsWith('```')) {
            json = json.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }
        const parsed = JSON.parse(json);
        return Array.isArray(parsed.sources) ? parsed.sources : [];
    } catch (err) {
        console.error('[DigestDiscovery] Failed to parse Claude response:', err.message);
        return [];
    }
}

// ============================================================================
// URL VALIDATION
// ============================================================================

/**
 * Validate a single URL via HEAD request with 5s timeout.
 */
async function validateUrl(url) {
    if (!url) return { accessible: false, source_type: 'website', status_code: null };

    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch {
        return { accessible: false, source_type: 'website', status_code: null };
    }

    const detectedType = detectSourceType(url);

    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve({ accessible: false, source_type: detectedType, status_code: null });
        }, 5000);

        const lib = parsedUrl.protocol === 'https:' ? https : http;
        const req = lib.request(
            {
                hostname: parsedUrl.hostname,
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'HEAD',
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                headers: { 'User-Agent': 'Insight360-Digest/1.0 (source discovery)' },
                timeout: 4500
            },
            (res) => {
                clearTimeout(timeout);
                const code = res.statusCode;
                // 405 Method Not Allowed means server is up but doesn't support HEAD — still accessible
                const accessible = code < 400 || code === 405;
                resolve({ accessible, source_type: detectedType, status_code: code });
            }
        );

        req.on('error', () => {
            clearTimeout(timeout);
            resolve({ accessible: false, source_type: detectedType, status_code: null });
        });

        req.on('timeout', () => {
            clearTimeout(timeout);
            req.destroy();
            resolve({ accessible: false, source_type: detectedType, status_code: null });
        });

        req.end();
    });
}

/**
 * Validate all candidates in parallel, batched to avoid flooding connections.
 */
async function validateAllUrls(candidates) {
    const BATCH_SIZE = 6;
    const results = [];

    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
        const batch = candidates.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
            batch.map(async (candidate) => {
                if (!candidate.url) return { ...candidate, accessible: false };
                const validation = await validateUrl(candidate.url);
                return {
                    name: candidate.name || 'Unknown Source',
                    url: candidate.url,
                    description: candidate.description || '',
                    source_type: candidate.source_type || validation.source_type,
                    relevance_score: Math.min(100, Math.max(0, parseInt(candidate.relevance_score) || 50)),
                    reason: candidate.reason || '',
                    accessible: validation.accessible,
                    status_code: validation.status_code
                };
            })
        );
        results.push(...batchResults);
    }

    return results;
}

// ============================================================================
// HISTORY
// ============================================================================

/**
 * Log a discovery session.
 */
async function logSession(orgId, userId, topic, hints, sourcesFound, sourcesAdded) {
    await supabase
        .from('digest_discovery_sessions')
        .insert({
            org_id: orgId,
            user_id: userId,
            topic,
            hints: hints || null,
            results_count: sourcesFound,
            sources_added_count: sourcesAdded
        });
}

/**
 * Get discovery history for an org.
 */
async function getDiscoveryHistory(orgId, limit = 20) {
    const { data, error } = await supabase
        .from('digest_discovery_sessions')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw new Error(`Failed to get history: ${error.message}`);
    return data || [];
}

// ============================================================================
// HELPERS
// ============================================================================

function detectSourceType(url) {
    if (!url) return 'website';
    for (const pattern of RSS_PATH_PATTERNS) {
        if (pattern.test(url)) return 'rss';
    }
    return 'website';
}

function isSubscriptionRequired(url) {
    if (!url) return false;
    try {
        const { hostname } = new URL(url);
        const bare = hostname.replace(/^www\./, '');
        return SUBSCRIPTION_DOMAINS.some(d => bare === d || bare.endsWith('.' + d));
    } catch {
        return false;
    }
}

function normalizeUrl(url) {
    if (!url) return '';
    try {
        const u = new URL(url);
        return (u.hostname.replace(/^www\./, '') + u.pathname).replace(/\/$/, '').toLowerCase();
    } catch {
        return url.toLowerCase();
    }
}

async function getOrgSourceUrls(orgId) {
    if (!orgId) return new Set();
    const { data } = await supabase
        .from('digest_sources')
        .select('config')
        .eq('org_id', orgId);

    const urls = new Set();
    for (const row of data || []) {
        if (row.config?.url) urls.add(normalizeUrl(row.config.url));
    }
    return urls;
}

module.exports = {
    discoverSources,
    validateUrl,
    logSession,
    getDiscoveryHistory
};
