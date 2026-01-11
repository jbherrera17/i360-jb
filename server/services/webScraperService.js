/**
 * INSIGHT 360 - Web Scraper Service
 * Version: 1.0.0
 *
 * Service for analyzing company websites to extract brand identity,
 * voice, ICP, and competitive positioning for Module 4 (Brand Analysis).
 *
 * Uses a combination of:
 * - HTTP fetching with proper headers
 * - HTML parsing to extract text content
 * - LLM analysis for brand extraction
 */

const agentService = require('./agentService');

/**
 * WebScraperService
 *
 * Crawls and analyzes company websites to extract brand-related information
 * for the Align 120 Brand Analysis module.
 */
class WebScraperService {
    constructor() {
        // Default pages to crawl
        this.defaultPages = [
            '', // Home page
            '/about',
            '/about-us',
            '/company',
            '/products',
            '/services',
            '/solutions',
            '/why-us',
            '/customers',
            '/blog'
        ];

        // User agent for requests
        this.userAgent = 'Mozilla/5.0 (compatible; Insight360BrandAnalyzer/1.0; +https://insight360.ai)';

        // Timeout for requests
        this.timeout = 10000; // 10 seconds
    }

    /**
     * Analyze a company website
     * @param {string} baseUrl - Company website URL
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} - Extracted brand information
     */
    async analyzeWebsite(baseUrl, options = {}) {
        const {
            pages = this.defaultPages,
            maxPages = 5,
            userId = null,
            includeRawContent = false
        } = options;

        // Normalize base URL
        const normalizedUrl = this.normalizeUrl(baseUrl);

        const results = {
            url: normalizedUrl,
            pages_analyzed: [],
            raw_content: {},
            analysis: null,
            errors: []
        };

        // Fetch and parse pages
        const pageContents = [];
        let pagesAnalyzed = 0;

        for (const page of pages) {
            if (pagesAnalyzed >= maxPages) break;

            const pageUrl = this.joinUrl(normalizedUrl, page);

            try {
                const content = await this.fetchPage(pageUrl);
                if (content && content.text.length > 100) {
                    pageContents.push({
                        url: pageUrl,
                        title: content.title,
                        text: content.text,
                        headings: content.headings,
                        links: content.links
                    });
                    results.pages_analyzed.push(pageUrl);

                    if (includeRawContent) {
                        results.raw_content[pageUrl] = content.text.substring(0, 2000);
                    }

                    pagesAnalyzed++;
                }
            } catch (error) {
                results.errors.push({
                    url: pageUrl,
                    error: error.message
                });
            }
        }

        // If no pages were successfully fetched, return error
        if (pageContents.length === 0) {
            return {
                ...results,
                analysis: null,
                error: 'Could not fetch any pages from the website'
            };
        }

        // Analyze content with LLM
        try {
            const analysis = await this.analyzeBrandContent(pageContents, userId);
            results.analysis = analysis;
        } catch (error) {
            results.errors.push({
                stage: 'analysis',
                error: error.message
            });
        }

        return results;
    }

    /**
     * Fetch a single page and extract text content
     * @param {string} url - Page URL
     * @returns {Promise<Object>} - Extracted content
     */
    async fetchPage(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                },
                signal: controller.signal,
                redirect: 'follow'
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('text/html')) {
                throw new Error(`Not HTML content: ${contentType}`);
            }

            const html = await response.text();
            return this.parseHtml(html);

        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Parse HTML and extract meaningful content
     * @param {string} html - Raw HTML
     * @returns {Object} - Extracted content
     */
    parseHtml(html) {
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? this.cleanText(titleMatch[1]) : '';

        // Remove script, style, and other non-content elements
        let cleanedHtml = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
            .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
            .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '');

        // Extract headings
        const headings = [];
        const headingRegex = /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi;
        let match;
        while ((match = headingRegex.exec(cleanedHtml)) !== null) {
            const heading = this.cleanText(match[1]);
            if (heading.length > 2) {
                headings.push(heading);
            }
        }

        // Extract links
        const links = [];
        const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
        while ((match = linkRegex.exec(cleanedHtml)) !== null) {
            const href = match[1];
            const text = this.cleanText(match[2]);
            if (text.length > 2 && !href.startsWith('#') && !href.startsWith('javascript:')) {
                links.push({ href, text });
            }
        }

        // Extract text content
        const text = this.extractText(cleanedHtml);

        return {
            title,
            text,
            headings: headings.slice(0, 50), // Limit to 50 headings
            links: links.slice(0, 50) // Limit to 50 links
        };
    }

    /**
     * Extract text from HTML, removing tags
     * @param {string} html - HTML content
     * @returns {string} - Clean text
     */
    extractText(html) {
        // Replace block elements with newlines
        let text = html
            .replace(/<(p|div|br|li|h[1-6]|tr)[^>]*>/gi, '\n')
            .replace(/<\/?(p|div|li|h[1-6]|tr)[^>]*>/gi, '\n');

        // Remove remaining tags
        text = text.replace(/<[^>]+>/g, ' ');

        // Decode HTML entities
        text = this.decodeHtmlEntities(text);

        // Clean up whitespace
        text = text
            .replace(/\s+/g, ' ')
            .replace(/\n\s+/g, '\n')
            .replace(/\n+/g, '\n')
            .trim();

        return text;
    }

    /**
     * Analyze extracted content with LLM
     * @param {Array} pageContents - Array of page content objects
     * @param {string} userId - User UUID
     * @returns {Promise<Object>} - Brand analysis
     */
    async analyzeBrandContent(pageContents, userId) {
        // Combine page content into analysis prompt
        const combinedContent = pageContents.map(page => {
            return `
## Page: ${page.title || page.url}
URL: ${page.url}

### Headings:
${page.headings.slice(0, 20).join('\n')}

### Content:
${page.text.substring(0, 3000)}
`;
        }).join('\n\n---\n\n');

        // Build analysis prompt
        const analysisPrompt = `
Analyze the following website content to extract brand identity information.

${combinedContent}

---

Based on this website content, extract and provide the following in JSON format:

1. **brand_voice_dna**: Object with:
   - tone_attributes: Array of 3-5 tone adjectives (e.g., "Professional", "Innovative")
   - personality: String describing brand personality
   - language_rules: Object with "do" (array) and "dont" (array) guidelines
   - vocabulary: Object with "preferred_terms" (array) and "avoid_terms" (array)

2. **ideal_customer_profile**: Object with:
   - industry: Target industry/industries
   - company_size: Target company size range
   - decision_makers: Array of target roles/titles
   - pain_points: Array of pain points addressed
   - triggers: Array of purchase triggers

3. **products_services**: Array of objects with:
   - name: Product/service name
   - category: Category type
   - description: Brief description
   - differentiators: Array of key differentiators

4. **competitive_positioning**: Object with:
   - why_we_win: Array of reasons they win deals
   - competitors: Array of competitor names (if mentioned)
   - differentiation: String describing unique differentiation

5. **pain_points_solved**: Array of problems they solve

Respond with ONLY valid JSON. If information is not available, use empty arrays or "Not found" strings.
`;

        // Find the Brand Voice Extractor agent or use a generic analysis
        const { data: brandAgent } = await agentService.supabase
            .from('agents')
            .select('id')
            .eq('name', 'Brand Voice Extractor')
            .single();

        let result;
        if (brandAgent) {
            result = await agentService.executeAgent(brandAgent.id, {
                userMessage: analysisPrompt,
                userId,
                conversationHistory: []
            });
        } else {
            // Fallback to direct API call if agent not found
            result = await agentService.executeDirect({
                provider: 'anthropic',
                model: 'claude-sonnet-4-5-20250929',
                systemPrompt: 'You are a Brand Analyst extracting brand identity from website content. Always respond with valid JSON.',
                userMessage: analysisPrompt,
                temperature: 0.3,
                maxTokens: 4000
            });
        }

        // Parse JSON from response
        try {
            const jsonMatch = result.response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (parseError) {
            console.error('Error parsing brand analysis JSON:', parseError);
        }

        // Return structured placeholder if parsing fails
        return {
            brand_voice_dna: {
                tone_attributes: [],
                personality: 'Analysis could not be completed',
                language_rules: { do: [], dont: [] },
                vocabulary: { preferred_terms: [], avoid_terms: [] }
            },
            ideal_customer_profile: {
                industry: 'Not found',
                company_size: 'Not found',
                decision_makers: [],
                pain_points: [],
                triggers: []
            },
            products_services: [],
            competitive_positioning: {
                why_we_win: [],
                competitors: [],
                differentiation: 'Not found'
            },
            pain_points_solved: [],
            raw_response: result.response
        };
    }

    // ========================================
    // Helper Methods
    // ========================================

    /**
     * Normalize URL to consistent format
     */
    normalizeUrl(url) {
        // Add protocol if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        // Remove trailing slash
        url = url.replace(/\/+$/, '');

        return url;
    }

    /**
     * Join URL parts
     */
    joinUrl(base, path) {
        if (!path || path === '') return base;
        if (path.startsWith('http://') || path.startsWith('https://')) return path;

        const baseWithoutTrailing = base.replace(/\/+$/, '');
        const pathWithLeading = path.startsWith('/') ? path : '/' + path;

        return baseWithoutTrailing + pathWithLeading;
    }

    /**
     * Clean text by removing extra whitespace
     */
    cleanText(text) {
        return text
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Decode common HTML entities
     */
    decodeHtmlEntities(text) {
        const entities = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&apos;': "'",
            '&nbsp;': ' ',
            '&mdash;': '—',
            '&ndash;': '–',
            '&copy;': '©',
            '&reg;': '®',
            '&trade;': '™',
            '&hellip;': '…'
        };

        let result = text;
        for (const [entity, char] of Object.entries(entities)) {
            result = result.replace(new RegExp(entity, 'gi'), char);
        }

        // Decode numeric entities
        result = result.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
        result = result.replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));

        return result;
    }

    /**
     * Extract domain from URL
     */
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url;
        }
    }

    /**
     * Check if URL is same domain
     */
    isSameDomain(baseUrl, testUrl) {
        try {
            const baseDomain = this.extractDomain(baseUrl);
            const testDomain = this.extractDomain(testUrl);
            return baseDomain === testDomain;
        } catch {
            return false;
        }
    }
}

// Export singleton instance
module.exports = new WebScraperService();
