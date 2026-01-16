/**
 * Model Availability Service - Insight 360
 *
 * Daily checks of LLM provider availability with on-demand admin checks.
 * Stores results in database and exposes via API.
 *
 * Version: 1.0.0
 */

const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const logger = require('./logger');

// Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Provider clients (initialized lazily)
let anthropicClient = null;
let openaiClient = null;
let perplexityApiKey = null;
let googleApiKey = null;

// Cron job reference
let scheduledJob = null;

// Configuration defaults
const DEFAULT_CONFIG = {
    id: '00000000-0000-0000-0000-000000000001',
    schedule_time: '06:00:00',
    timezone: 'America/New_York',
    is_enabled: true
};

// Perplexity API base URL
const PERPLEXITY_BASE_URL = 'https://api.perplexity.ai';

/**
 * Initialize provider clients
 */
function initializeClients() {
    // Anthropic
    if (process.env.ANTHROPIC_API_KEY && !anthropicClient) {
        try {
            anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        } catch (error) {
            logger.error('Failed to initialize Anthropic client for availability checks', { error: error.message });
        }
    }

    // OpenAI
    if (process.env.OPENAI_API_KEY && !openaiClient) {
        try {
            openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        } catch (error) {
            logger.error('Failed to initialize OpenAI client for availability checks', { error: error.message });
        }
    }

    // Perplexity (just store the key)
    if (process.env.PERPLEXITY_API_KEY) {
        perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    }

    // Google Gemini (just store the key)
    if (process.env.GOOGLE_API_KEY) {
        googleApiKey = process.env.GOOGLE_API_KEY;
    }
}

/**
 * Check Anthropic API availability using minimal tokens
 * Uses Claude Haiku 4.5 (cheapest model)
 */
async function checkAnthropicAvailability() {
    if (!anthropicClient) {
        return {
            provider: 'anthropic',
            status: 'unavailable',
            error_message: 'API key not configured',
            response_time_ms: 0
        };
    }

    const startTime = Date.now();

    try {
        await anthropicClient.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }]
        });

        return {
            provider: 'anthropic',
            status: 'available',
            error_message: null,
            response_time_ms: Date.now() - startTime
        };
    } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error.message || 'Unknown error';

        // Determine status based on error
        let status = 'unavailable';
        if (errorMessage.includes('deprecated')) {
            status = 'deprecated';
        } else if (error.status === 401 || error.status === 403) {
            status = 'auth_error';
        } else if (error.status === 429) {
            status = 'rate_limited';
        }

        return {
            provider: 'anthropic',
            status,
            error_message: errorMessage,
            response_time_ms: responseTime
        };
    }
}

/**
 * Check OpenAI API availability using minimal tokens
 * Uses GPT-4o-mini (cheapest model)
 */
async function checkOpenAIAvailability() {
    if (!openaiClient) {
        return {
            provider: 'openai',
            status: 'unavailable',
            error_message: 'API key not configured',
            response_time_ms: 0
        };
    }

    const startTime = Date.now();

    try {
        await openaiClient.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }]
        });

        return {
            provider: 'openai',
            status: 'available',
            error_message: null,
            response_time_ms: Date.now() - startTime
        };
    } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error.message || 'Unknown error';

        // Determine status based on error
        let status = 'unavailable';
        if (errorMessage.includes('deprecated') || errorMessage.includes('not supported')) {
            status = 'deprecated';
        } else if (error.status === 401 || error.status === 403) {
            status = 'auth_error';
        } else if (error.status === 429) {
            status = 'rate_limited';
        }

        return {
            provider: 'openai',
            status,
            error_message: errorMessage,
            response_time_ms: responseTime
        };
    }
}

/**
 * Check Perplexity API availability using minimal tokens
 * Uses sonar (cheapest model)
 */
async function checkPerplexityAvailability() {
    if (!perplexityApiKey) {
        return {
            provider: 'perplexity',
            status: 'unavailable',
            error_message: 'API key not configured',
            response_time_ms: 0
        };
    }

    const startTime = Date.now();

    try {
        const response = await fetch(`${PERPLEXITY_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${perplexityApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'sonar',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'hi' }]
            })
        });

        const responseTime = Date.now() - startTime;

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || `HTTP ${response.status}`;

            // Determine status based on error
            let status = 'unavailable';
            if (errorMessage.includes('deprecated')) {
                status = 'deprecated';
            } else if (response.status === 401 || response.status === 403) {
                status = 'auth_error';
            } else if (response.status === 429) {
                status = 'rate_limited';
            }

            return {
                provider: 'perplexity',
                status,
                error_message: errorMessage,
                response_time_ms: responseTime
            };
        }

        return {
            provider: 'perplexity',
            status: 'available',
            error_message: null,
            response_time_ms: responseTime
        };
    } catch (error) {
        return {
            provider: 'perplexity',
            status: 'unavailable',
            error_message: error.message || 'Unknown error',
            response_time_ms: Date.now() - startTime
        };
    }
}

/**
 * Check Google Gemini API availability using minimal tokens
 * Uses gemini-2.0-flash-lite (cheapest model)
 */
async function checkGoogleAvailability() {
    if (!googleApiKey) {
        return {
            provider: 'google',
            status: 'unavailable',
            error_message: 'API key not configured',
            response_time_ms: 0
        };
    }

    const startTime = Date.now();
    const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

    try {
        const response = await fetch(`${GEMINI_BASE_URL}/models/gemini-2.0-flash-lite:generateContent?key=${googleApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
                generationConfig: { maxOutputTokens: 1 }
            })
        });

        const responseTime = Date.now() - startTime;

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || `HTTP ${response.status}`;

            // Determine status based on error
            let status = 'unavailable';
            if (errorMessage.includes('deprecated')) {
                status = 'deprecated';
            } else if (response.status === 401 || response.status === 403) {
                status = 'auth_error';
            } else if (response.status === 429) {
                status = 'rate_limited';
            }

            return {
                provider: 'google',
                status,
                error_message: errorMessage,
                response_time_ms: responseTime
            };
        }

        return {
            provider: 'google',
            status: 'available',
            error_message: null,
            response_time_ms: responseTime
        };
    } catch (error) {
        return {
            provider: 'google',
            status: 'unavailable',
            error_message: error.message || 'Unknown error',
            response_time_ms: Date.now() - startTime
        };
    }
}

/**
 * Check all providers and store results
 */
async function checkAllProviders() {
    initializeClients();

    const results = await Promise.all([
        checkAnthropicAvailability(),
        checkOpenAIAvailability(),
        checkGoogleAvailability(),
        checkPerplexityAvailability()
    ]);

    // Store results in database
    const now = new Date().toISOString();
    const records = results.map(result => ({
        ...result,
        checked_at: now
    }));

    try {
        const { error } = await supabase
            .from('model_availability_checks')
            .insert(records);

        if (error) {
            // Table might not exist yet
            if (error.code === 'PGRST205' || error.message.includes('not find')) {
                logger.warn('Model availability tables not yet created. Results not persisted. Run: db/phase25-model-availability-schema.sql');
            } else {
                logger.error('Failed to store model availability check results', { error: error.message });
            }
        } else {
            // Update last_run_at in config (only if tables exist)
            await supabase
                .from('model_check_config')
                .update({ last_run_at: now, updated_at: now })
                .eq('id', DEFAULT_CONFIG.id);
        }
    } catch (dbError) {
        logger.error('Database error storing availability checks', { error: dbError.message });
    }

    // Calculate overall status
    const hasError = results.some(r => r.status === 'unavailable' || r.status === 'auth_error');
    const hasWarning = results.some(r => r.status === 'deprecated' || r.status === 'rate_limited');
    let overallStatus = 'healthy';
    if (hasError) {
        overallStatus = 'error';
    } else if (hasWarning) {
        overallStatus = 'warning';
    }

    logger.info('Model availability check completed', {
        overall: overallStatus,
        providers: results.map(r => `${r.provider}: ${r.status}`).join(', ')
    });

    return {
        providers: results.reduce((acc, r) => {
            acc[r.provider] = {
                status: r.status,
                responseTime: r.response_time_ms,
                error: r.error_message
            };
            return acc;
        }, {}),
        overallStatus,
        checkedAt: now
    };
}

/**
 * Get the latest check results from database
 */
async function getLastCheckResults() {
    try {
        // Get the latest check for each provider
        const { data: checks, error: checksError } = await supabase
            .from('model_availability_checks')
            .select('*')
            .order('checked_at', { ascending: false })
            .limit(10);

        if (checksError) {
            // Table might not exist yet
            if (checksError.code === 'PGRST205' || checksError.message.includes('not find')) {
                logger.warn('Model availability tables not yet created. Run: db/phase25-model-availability-schema.sql');
                return {
                    success: true,
                    lastChecked: null,
                    providers: {},
                    overallStatus: 'unknown',
                    tablesMissing: true
                };
            }
            throw checksError;
        }

        // Get config for last_run_at
        const { data: config, error: configError } = await supabase
            .from('model_check_config')
            .select('*')
            .eq('id', DEFAULT_CONFIG.id)
            .single();

        if (configError && configError.code !== 'PGRST116') {
            // PGRST116 = no rows returned, which is OK
            throw configError;
        }

        // Group by provider, take most recent
        const providerMap = {};
        for (const check of checks || []) {
            if (!providerMap[check.provider]) {
                providerMap[check.provider] = {
                    status: check.status,
                    responseTime: check.response_time_ms,
                    error: check.error_message,
                    checkedAt: check.checked_at
                };
            }
        }

        // Calculate overall status
        const statuses = Object.values(providerMap);
        const hasError = statuses.some(r => r.status === 'unavailable' || r.status === 'auth_error');
        const hasWarning = statuses.some(r => r.status === 'deprecated' || r.status === 'rate_limited');
        let overallStatus = 'healthy';
        if (hasError) {
            overallStatus = 'error';
        } else if (hasWarning) {
            overallStatus = 'warning';
        }

        return {
            success: true,
            lastChecked: config?.last_run_at || null,
            providers: providerMap,
            overallStatus: Object.keys(providerMap).length > 0 ? overallStatus : 'unknown'
        };
    } catch (error) {
        logger.error('Failed to get last check results', { error: error.message });
        return {
            success: false,
            error: error.message,
            providers: {},
            overallStatus: 'unknown'
        };
    }
}

/**
 * Get scheduler configuration
 */
async function getConfig() {
    try {
        const { data, error } = await supabase
            .from('model_check_config')
            .select('*')
            .eq('id', DEFAULT_CONFIG.id)
            .single();

        // Table might not exist yet or no rows
        if (error && error.code !== 'PGRST116') {
            if (error.code === 'PGRST205' || error.message.includes('not find')) {
                return {
                    success: true,
                    config: DEFAULT_CONFIG,
                    tablesMissing: true
                };
            }
            throw error;
        }

        return {
            success: true,
            config: data || DEFAULT_CONFIG
        };
    } catch (error) {
        logger.error('Failed to get model check config', { error: error.message });
        return {
            success: false,
            error: error.message,
            config: DEFAULT_CONFIG
        };
    }
}

/**
 * Update scheduler configuration
 */
async function updateConfig(updates) {
    try {
        const { data, error } = await supabase
            .from('model_check_config')
            .upsert({
                id: DEFAULT_CONFIG.id,
                ...updates,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        // Reinitialize scheduler if enabled setting changed
        if ('is_enabled' in updates || 'schedule_time' in updates) {
            await initializeScheduler();
        }

        return {
            success: true,
            config: data
        };
    } catch (error) {
        logger.error('Failed to update model check config', { error: error.message });
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Convert time to cron expression
 */
function timeToCron(timeStr, timezone) {
    // Parse HH:MM:SS format
    const [hours, minutes] = timeStr.split(':').map(Number);
    // Cron format: minute hour * * *
    return `${minutes} ${hours} * * *`;
}

/**
 * Initialize the daily scheduler
 */
async function initializeScheduler() {
    // Stop existing job if any
    if (scheduledJob) {
        scheduledJob.stop();
        scheduledJob = null;
    }

    try {
        const { config } = await getConfig();

        if (!config.is_enabled) {
            logger.info('Model availability scheduler is disabled');
            return;
        }

        const cronExpression = timeToCron(config.schedule_time, config.timezone);

        scheduledJob = cron.schedule(cronExpression, async () => {
            logger.info('Running scheduled model availability check');
            await checkAllProviders();
        }, {
            timezone: config.timezone || 'America/New_York'
        });

        logger.info(`Model availability scheduler initialized - runs at ${config.schedule_time} ${config.timezone}`);
    } catch (error) {
        logger.error('Failed to initialize model availability scheduler', { error: error.message });
    }
}

/**
 * Run an on-demand check (admin only)
 */
async function runCheck() {
    logger.info('Running on-demand model availability check');
    return await checkAllProviders();
}

module.exports = {
    initializeScheduler,
    checkAllProviders,
    getLastCheckResults,
    getConfig,
    updateConfig,
    runCheck
};
