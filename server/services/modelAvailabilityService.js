/**
 * Model Availability Service - Insight 360
 *
 * Real-time LLM provider health monitoring with 5-minute interval checks,
 * in-memory status cache, and EventEmitter for instant status change notifications.
 *
 * Version: 2.0.0
 */

const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { EventEmitter } = require('events');
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

// 5-minute interval reference
let healthCheckInterval = null;

// Configuration defaults
const DEFAULT_CONFIG = {
    id: '00000000-0000-0000-0000-000000000001',
    schedule_time: '06:00:00',
    timezone: 'America/New_York',
    is_enabled: true
};

// Perplexity API base URL
const PERPLEXITY_BASE_URL = 'https://api.perplexity.ai';

// ============================================
// In-Memory Status Cache & Event Emitter
// ============================================

/**
 * In-memory provider status cache
 * { [provider]: { status, responseTime, error, updatedAt } }
 */
const providerStatusCache = {};

/**
 * EventEmitter for health status changes
 * Emits 'status-change' with { provider, oldStatus, newStatus, error, updatedAt }
 */
const healthEventEmitter = new EventEmitter();
healthEventEmitter.setMaxListeners(50); // Support many SSE connections

/**
 * Check if a provider is healthy (reads from cache)
 * Empty cache = assume healthy (startup grace period)
 */
function isProviderHealthy(provider) {
    const cached = providerStatusCache[provider];
    if (!cached) return true; // Startup grace: assume healthy until first check
    return cached.status === 'available';
}

/**
 * Update a provider's status from external callers (e.g., circuit breaker bridge)
 */
function updateProviderStatus(provider, status, error = null) {
    const oldStatus = providerStatusCache[provider]?.status || null;
    const now = new Date().toISOString();

    providerStatusCache[provider] = {
        status,
        responseTime: providerStatusCache[provider]?.responseTime || 0,
        error,
        updatedAt: now
    };

    // Emit event only if status actually changed
    if (oldStatus !== status) {
        logger.info(`Provider status changed: ${provider} ${oldStatus || 'unknown'} -> ${status}`, { error });
        healthEventEmitter.emit('status-change', {
            provider,
            oldStatus: oldStatus || 'unknown',
            newStatus: status,
            error,
            updatedAt: now
        });
    }
}

/**
 * Get the full provider status cache
 */
function getProviderStatusCache() {
    return { ...providerStatusCache };
}

// ============================================
// Provider Check Functions
// ============================================

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
 * Check all providers and store results + update cache
 */
async function checkAllProviders() {
    initializeClients();

    const results = await Promise.all([
        checkAnthropicAvailability(),
        checkOpenAIAvailability(),
        checkGoogleAvailability(),
        checkPerplexityAvailability()
    ]);

    // Update in-memory cache and emit events for status changes
    const now = new Date().toISOString();
    for (const result of results) {
        updateProviderStatus(
            result.provider,
            result.status,
            result.error_message
        );
        // Also update response time in cache
        providerStatusCache[result.provider].responseTime = result.response_time_ms;
        providerStatusCache[result.provider].updatedAt = now;
    }

    // Store results in database
    const records = results.map(result => ({
        ...result,
        checked_at: now
    }));

    try {
        const { error } = await supabase
            .from('model_availability_checks')
            .insert(records);

        if (error) {
            if (error.code === 'PGRST205' || error.message.includes('not find')) {
                logger.warn('Model availability tables not yet created. Results not persisted.');
            } else {
                logger.error('Failed to store model availability check results', { error: error.message });
            }
        } else {
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
        const { data: checks, error: checksError } = await supabase
            .from('model_availability_checks')
            .select('*')
            .order('checked_at', { ascending: false })
            .limit(10);

        if (checksError) {
            if (checksError.code === 'PGRST205' || checksError.message.includes('not find')) {
                logger.warn('Model availability tables not yet created.');
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

        const { data: config, error: configError } = await supabase
            .from('model_check_config')
            .select('*')
            .eq('id', DEFAULT_CONFIG.id)
            .single();

        if (configError && configError.code !== 'PGRST116') {
            throw configError;
        }

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
    const [hours, minutes] = timeStr.split(':').map(Number);
    return `${minutes} ${hours} * * *`;
}

/**
 * Initialize the scheduler (daily cron + 5-minute health interval)
 */
async function initializeScheduler() {
    // Stop existing cron job if any
    if (scheduledJob) {
        scheduledJob.stop();
        scheduledJob = null;
    }

    // Stop existing interval if any
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
    }

    try {
        const { config } = await getConfig();

        // Daily cron for database-persisted checks (admin-configurable)
        if (config.is_enabled) {
            const cronExpression = timeToCron(config.schedule_time, config.timezone);
            scheduledJob = cron.schedule(cronExpression, async () => {
                logger.info('Running scheduled model availability check');
                await checkAllProviders();
            }, {
                timezone: config.timezone || 'America/New_York'
            });
            logger.info(`Model availability daily scheduler initialized - runs at ${config.schedule_time} ${config.timezone}`);
        }

        // 5-minute interval for real-time health monitoring
        healthCheckInterval = setInterval(async () => {
            try {
                await checkAllProviders();
            } catch (err) {
                logger.error('5-minute health check failed', { error: err.message });
            }
        }, 5 * 60 * 1000);

        // Run initial check on startup (non-blocking)
        checkAllProviders().catch(err => {
            logger.error('Initial health check failed', { error: err.message });
        });

        logger.info('Model availability 5-minute health monitoring started');
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
    runCheck,
    // New exports for health monitoring
    healthEventEmitter,
    isProviderHealthy,
    updateProviderStatus,
    getProviderStatusCache
};
