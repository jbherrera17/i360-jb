/**
 * Service initialization.
 *
 * Initializes LLM providers (Anthropic, OpenAI, Perplexity, Gemini), web
 * search, and the Supabase client. Mutates a shared `serviceStatus` object
 * and stores the supabase client so it can be retrieved by middleware that
 * runs at request time.
 */

const serviceStatus = {
    anthropic: false,
    openai: false,
    perplexity: false,
    gemini: false,
    search: false,
    voice: false,
    supabase: false,
};

let _supabase = null;

function _initializeSupabase() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        return false;
    }
    try {
        const { createClient } = require('@supabase/supabase-js');

        // Security: Prefer service key for server-side operations (bypasses RLS).
        // Fall back to anon key but warn — admin operations may fail.
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
        const usingServiceKey = !!process.env.SUPABASE_SERVICE_KEY;

        if (usingServiceKey) {
            console.log('🔑 Using SUPABASE_SERVICE_KEY (RLS bypassed)');
        } else if (process.env.NODE_ENV === 'production') {
            console.warn('⚠️  WARNING: SUPABASE_SERVICE_KEY not set. Using ANON_KEY - admin operations may fail due to RLS.');
        } else {
            console.log('⚠️  Using ANON_KEY (RLS enforced)');
        }

        _supabase = createClient(
            process.env.SUPABASE_URL,
            supabaseKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
                // Force the Authorization header to always use the service key.
                // This prevents user sessions from overriding it.
                global: {
                    headers: {
                        Authorization: `Bearer ${supabaseKey}`,
                    },
                },
            }
        );
        return true;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error.message);
        return false;
    }
}

/**
 * Initialize all service providers (LLMs, search, Supabase).
 * Logs status for each provider. Idempotent — safe to call multiple times,
 * but typically called once during boot.
 */
function initializeProviders() {
    console.log('\n🚀 Initializing Insight 360 Services...\n');

    // Anthropic (Claude)
    if (process.env.ANTHROPIC_API_KEY) {
        try {
            const anthropicService = require('./anthropic');
            if (typeof anthropicService.initialize === 'function') {
                anthropicService.initialize(process.env.ANTHROPIC_API_KEY);
            }
            serviceStatus.anthropic = true;
            console.log('  ✅ Claude (Anthropic) - Ready');
        } catch (error) {
            console.log('  ❌ Claude (Anthropic) - Failed:', error.message);
            console.log('     Check that ANTHROPIC_API_KEY is valid and has sufficient credits');
        }
    } else {
        console.log('  ⚪ Claude (Anthropic) - No API key');
    }

    // OpenAI (GPT)
    if (process.env.OPENAI_API_KEY) {
        try {
            const openaiService = require('./openai');
            if (typeof openaiService.initialize === 'function') {
                openaiService.initialize(process.env.OPENAI_API_KEY);
            }
            serviceStatus.openai = true;
            serviceStatus.voice = true; // Voice uses OpenAI
            console.log('  ✅ GPT (OpenAI) - Ready');
            console.log('  ✅ Voice (OpenAI Audio) - Ready');
        } catch (error) {
            console.log('  ❌ GPT (OpenAI) - Failed:', error.message);
            console.log('     Check that OPENAI_API_KEY is valid and has sufficient credits');
        }
    } else {
        console.log('  ⚪ GPT (OpenAI) - No API key');
    }

    // Perplexity (Sonar)
    if (process.env.PERPLEXITY_API_KEY) {
        try {
            const perplexityService = require('./perplexity');
            if (typeof perplexityService.initialize === 'function') {
                perplexityService.initialize(process.env.PERPLEXITY_API_KEY);
            }
            serviceStatus.perplexity = true;
            console.log('  ✅ Perplexity (Sonar) - Ready');
        } catch (error) {
            console.log('  ❌ Perplexity (Sonar) - Failed:', error.message);
            console.log('     Check that PERPLEXITY_API_KEY is valid and has sufficient credits');
        }
    } else {
        console.log('  ⚪ Perplexity (Sonar) - No API key');
    }

    // Google Gemini
    if (process.env.GOOGLE_API_KEY) {
        try {
            const geminiService = require('./gemini');
            if (typeof geminiService.initialize === 'function') {
                geminiService.initialize(process.env.GOOGLE_API_KEY);
            }
            serviceStatus.gemini = true;
            console.log('  ✅ Gemini (Google) - Ready');
        } catch (error) {
            console.log('  ❌ Gemini (Google) - Failed:', error.message);
            console.log('     Check that GOOGLE_API_KEY is valid and not expired');
        }
    } else {
        console.log('  ⚪ Gemini (Google) - No API key');
    }

    // Web search
    const searchApiKey = process.env.BRAVE_SEARCH_API_KEY ||
                         process.env.TAVILY_API_KEY ||
                         process.env.SERPER_API_KEY;
    if (searchApiKey) {
        try {
            const searchService = require('./search');
            if (typeof searchService.initialize === 'function') {
                searchService.initialize({
                    braveApiKey: process.env.BRAVE_SEARCH_API_KEY,
                    tavilyApiKey: process.env.TAVILY_API_KEY,
                    serperApiKey: process.env.SERPER_API_KEY,
                });
            }
            serviceStatus.search = true;
            const provider = process.env.BRAVE_SEARCH_API_KEY ? 'Brave' :
                             process.env.TAVILY_API_KEY ? 'Tavily' : 'Serper';
            console.log(`  ✅ Web Search (${provider}) - Ready`);
        } catch (error) {
            const provider = process.env.BRAVE_SEARCH_API_KEY ? 'BRAVE_SEARCH_API_KEY' :
                             process.env.TAVILY_API_KEY ? 'TAVILY_API_KEY' : 'SERPER_API_KEY';
            console.log('  ❌ Web Search - Failed:', error.message);
            console.log(`     Check that ${provider} is valid and has sufficient credits`);
        }
    } else {
        console.log('  ⚪ Web Search - No API key (set BRAVE_SEARCH_API_KEY, TAVILY_API_KEY, or SERPER_API_KEY)');
    }

    // Supabase
    if (_initializeSupabase()) {
        serviceStatus.supabase = true;
        console.log('  ✅ Supabase (Database) - Ready');
    } else {
        console.log('  ⚪ Supabase - Not configured');
    }
}

function getSupabase() {
    return _supabase;
}

function getStatus() {
    return serviceStatus;
}

module.exports = { initializeProviders, getSupabase, getStatus };
