/**
 * Search Service - Phase 2 Fixed
 * 
 * Web search integration supporting multiple providers:
 * - Brave Search API
 * - Tavily Search API  
 * - Serper API
 */

// Search provider clients
let braveApiKey = null;
let tavilyApiKey = null;
let serperApiKey = null;
let activeProvider = null;

/**
 * Initialize search service with available API keys
 */
function initialize(config = {}) {
    braveApiKey = config.braveApiKey || process.env.BRAVE_SEARCH_API_KEY;
    tavilyApiKey = config.tavilyApiKey || process.env.TAVILY_API_KEY;
    serperApiKey = config.serperApiKey || process.env.SERPER_API_KEY;
    
    // Determine active provider
    if (braveApiKey) {
        activeProvider = 'brave';
        console.log('✓ Web Search initialized (Brave)');
        return true;
    } else if (tavilyApiKey) {
        activeProvider = 'tavily';
        console.log('✓ Web Search initialized (Tavily)');
        return true;
    } else if (serperApiKey) {
        activeProvider = 'serper';
        console.log('✓ Web Search initialized (Serper)');
        return true;
    }
    
    console.warn('⚠ No search API keys configured - web search disabled');
    return false;
}

/**
 * Check if search is available
 */
function isAvailable() {
    return activeProvider !== null;
}

/**
 * Get active provider name
 */
function getProvider() {
    return activeProvider;
}

/**
 * Search using Brave Search API
 */
async function searchBrave(query, options = {}) {
    const { count = 5 } = options;
    
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', count.toString());
    
    const response = await fetch(url.toString(), {
        headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': braveApiKey
        }
    });
    
    if (!response.ok) {
        throw new Error(`Brave search failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return (data.web?.results || []).map(result => ({
        title: result.title,
        url: result.url,
        snippet: result.description,
        source: 'brave'
    }));
}

/**
 * Search using Tavily API
 */
async function searchTavily(query, options = {}) {
    const { count = 5, searchDepth = 'basic' } = options;
    
    const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            api_key: tavilyApiKey,
            query,
            max_results: count,
            search_depth: searchDepth,
            include_answer: true
        })
    });
    
    if (!response.ok) {
        throw new Error(`Tavily search failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    const results = (data.results || []).map(result => ({
        title: result.title,
        url: result.url,
        snippet: result.content,
        source: 'tavily'
    }));
    
    // Include AI-generated answer if available
    if (data.answer) {
        results.unshift({
            title: 'AI Summary',
            url: null,
            snippet: data.answer,
            source: 'tavily-ai'
        });
    }
    
    return results;
}

/**
 * Search using Serper API
 */
async function searchSerper(query, options = {}) {
    const { count = 5 } = options;
    
    const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': serperApiKey
        },
        body: JSON.stringify({
            q: query,
            num: count
        })
    });
    
    if (!response.ok) {
        throw new Error(`Serper search failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return (data.organic || []).map(result => ({
        title: result.title,
        url: result.link,
        snippet: result.snippet,
        source: 'serper'
    }));
}

/**
 * Perform a web search using the active provider
 */
async function search(query, options = {}) {
    if (!isAvailable()) {
        throw new Error('Search service not initialized');
    }
    
    try {
        switch (activeProvider) {
            case 'brave':
                return await searchBrave(query, options);
            case 'tavily':
                return await searchTavily(query, options);
            case 'serper':
                return await searchSerper(query, options);
            default:
                throw new Error('No search provider available');
        }
    } catch (error) {
        console.error('Search error:', error);
        
        // Try fallback providers
        if (activeProvider === 'brave' && tavilyApiKey) {
            console.log('Falling back to Tavily...');
            return await searchTavily(query, options);
        } else if (activeProvider !== 'serper' && serperApiKey) {
            console.log('Falling back to Serper...');
            return await searchSerper(query, options);
        }
        
        throw error;
    }
}

/**
 * Format search results for LLM consumption
 */
function formatResultsForLLM(results) {
    if (!results || results.length === 0) {
        return 'No search results found.';
    }
    
    return results.map((r, i) => {
        let text = `[${i + 1}] ${r.title}`;
        if (r.url) text += `\nURL: ${r.url}`;
        text += `\n${r.snippet}`;
        return text;
    }).join('\n\n');
}

module.exports = {
    initialize,
    isAvailable,
    getProvider,
    search,
    formatResultsForLLM
};
