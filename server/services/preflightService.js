/**
 * INSIGHT 360 - Pre-Flight Check Service
 * Version: 1.0.0
 *
 * Validates all downstream integrations BEFORE starting multi-step workflows.
 * Returns a status map so users know what will and won't work upfront.
 *
 * Platform-wide UX principle: Never let users discover failures at the end
 * of a long workflow. Check everything first, inform, then proceed.
 */

const openaiService = require('./openai');
const notionService = require('./notionService');
const postizService = require('./postizService');
const linkedinService = require('./linkedinService');
const logger = require('./logger');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Status constants
const STATUS = {
    READY: 'ready',
    DEGRADED: 'degraded',
    UNAVAILABLE: 'unavailable',
    EXPIRED: 'expired',
    NOT_CONFIGURED: 'not_configured'
};

/**
 * Check image generation API availability
 * Verifies the selected model is accessible and the API key is valid
 */
async function checkImageGeneration(preferredModel = 'gpt-image-1.5') {
    const result = {
        service: 'image_generation',
        status: STATUS.UNAVAILABLE,
        model: preferredModel,
        availableModels: [],
        message: ''
    };

    try {
        // Check if OpenAI service is initialized
        if (!openaiService.isAvailable()) {
            result.message = 'OpenAI API key not configured';
            return result;
        }

        // Check circuit breaker status
        const circuitStatus = openaiService.getCircuitStatus();
        if (circuitStatus?.state === 'OPEN') {
            result.status = STATUS.DEGRADED;
            result.message = `OpenAI circuit breaker is open (too many recent failures). Resets at ${circuitStatus.nextAttempt || 'unknown'}`;
            return result;
        }

        // List available image models
        const imageModels = openaiService.getImageModels();
        result.availableModels = imageModels.map(m => ({
            id: m.id,
            name: m.name,
            default: m.default || false
        }));

        // Check if preferred model exists
        const modelExists = imageModels.some(m => m.id === preferredModel);
        if (!modelExists) {
            // Fall back to default
            const defaultModel = imageModels.find(m => m.default) || imageModels[0];
            if (defaultModel) {
                result.model = defaultModel.id;
                result.status = STATUS.DEGRADED;
                result.message = `Preferred model "${preferredModel}" not available. Using "${defaultModel.name}" instead.`;
            } else {
                result.message = 'No image models available';
                return result;
            }
        } else {
            result.status = STATUS.READY;
            const modelInfo = imageModels.find(m => m.id === preferredModel);
            result.message = `${modelInfo.name} ready`;
        }

        // Check for DALL-E 3 deprecation warning
        if (preferredModel === 'dall-e-3') {
            result.status = STATUS.DEGRADED;
            result.message = 'DALL-E 3 is deprecated (May 2026). Consider switching to GPT Image 1.5 in your profile settings.';
            result.deprecationWarning = true;
        }
    } catch (error) {
        logger.error('[Preflight] Image generation check failed:', error);
        result.message = `Image API check failed: ${error.message}`;
    }

    return result;
}

/**
 * Check Notion API connectivity and database access
 */
async function checkNotion() {
    const result = {
        service: 'notion',
        status: STATUS.UNAVAILABLE,
        message: ''
    };

    try {
        if (!process.env.NOTION_API_KEY) {
            result.status = STATUS.NOT_CONFIGURED;
            result.message = 'Notion API key not configured. Set NOTION_API_KEY in environment.';
            return result;
        }

        if (!notionService.isCalendarConfigured()) {
            result.status = STATUS.NOT_CONFIGURED;
            result.message = 'Notion Content Calendar database not configured.';
            return result;
        }

        // Test actual database access with a lightweight query
        const schema = await notionService.getCalendarSchema();
        if (schema && schema.id) {
            result.status = STATUS.READY;
            result.message = `Connected to "${schema.title}"`;
            result.databaseId = schema.id;
        } else {
            result.message = 'Notion database accessible but returned no schema';
            result.status = STATUS.DEGRADED;
        }
    } catch (error) {
        logger.error('[Preflight] Notion check failed:', error);
        if (error.message?.includes('unauthorized') || error.status === 401) {
            result.message = 'Notion API key is invalid or expired';
        } else if (error.message?.includes('not_found') || error.status === 404) {
            result.message = 'Content Calendar database not found. Check NOTION_CONTENT_CALENDAR_DB_ID.';
        } else {
            result.message = `Notion API error: ${error.message}`;
        }
    }

    return result;
}

/**
 * Check Postiz social media integration
 */
async function checkPostiz(orgId) {
    const result = {
        service: 'social_media',
        status: STATUS.UNAVAILABLE,
        connectedPlatforms: [],
        message: ''
    };

    try {
        if (!orgId) {
            result.status = STATUS.NOT_CONFIGURED;
            result.message = 'Organization context required for social media';
            return result;
        }

        const configured = await postizService.isConfigured(orgId);
        if (!configured) {
            result.status = STATUS.NOT_CONFIGURED;
            result.message = 'Social media publishing not configured. Set up Postiz in Social Media settings.';
            return result;
        }

        // Get connected platforms
        const platforms = await postizService.getConnectedPlatforms(orgId);
        result.connectedPlatforms = platforms.map(p => ({
            platform: p.platform,
            accountName: p.platform_account_name,
            status: p.status
        }));

        if (platforms.length === 0) {
            result.status = STATUS.DEGRADED;
            result.message = 'Postiz configured but no platforms connected. Connect accounts in Social Media settings.';
        } else {
            const activeCount = platforms.filter(p => p.status === 'active').length;
            result.status = activeCount > 0 ? STATUS.READY : STATUS.DEGRADED;
            result.message = `${activeCount} platform${activeCount !== 1 ? 's' : ''} connected: ${platforms.map(p => p.platform).join(', ')}`;
        }
    } catch (error) {
        logger.error('[Preflight] Postiz check failed:', error);
        result.message = `Social media check failed: ${error.message}`;
    }

    return result;
}

/**
 * Check Substack publishing capability (beta)
 */
async function checkSubstack(orgId) {
    const result = {
        service: 'substack',
        status: STATUS.UNAVAILABLE,
        beta: true,
        message: ''
    };

    try {
        if (!orgId) {
            result.status = STATUS.NOT_CONFIGURED;
            result.message = 'Organization context required';
            return result;
        }

        // Check if Substack credentials exist for this org
        const { data, error } = await supabase
            .from('substack_credentials')
            .select('id, publication_url, cookie_expires_at, status')
            .eq('org_id', orgId)
            .eq('status', 'active')
            .single();

        if (error && error.code === 'PGRST116') {
            result.status = STATUS.NOT_CONFIGURED;
            result.message = 'Substack not configured. Add your Substack credentials in Thought Leadership settings.';
            return result;
        }

        if (error) {
            // Table might not exist yet
            if (error.message?.includes('relation') || error.code === '42P01') {
                result.status = STATUS.NOT_CONFIGURED;
                result.message = 'Substack publishing not yet set up (database migration needed)';
                return result;
            }
            throw error;
        }

        if (!data) {
            result.status = STATUS.NOT_CONFIGURED;
            result.message = 'No active Substack credentials found';
            return result;
        }

        // Check cookie expiry
        if (data.cookie_expires_at) {
            const expiresAt = new Date(data.cookie_expires_at);
            const now = new Date();
            const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

            if (expiresAt <= now) {
                result.status = STATUS.EXPIRED;
                result.message = `Substack cookies expired ${Math.abs(daysUntilExpiry)} day(s) ago. Please refresh your Substack session cookies.`;
                return result;
            }

            if (daysUntilExpiry <= 3) {
                result.status = STATUS.DEGRADED;
                result.message = `Substack cookies expire in ${daysUntilExpiry} day(s). Consider refreshing soon.`;
                result.cookieExpiresIn = daysUntilExpiry;
                return result;
            }
        }

        result.status = STATUS.READY;
        result.publicationUrl = data.publication_url;
        result.message = `Connected to ${data.publication_url} (beta)`;
    } catch (error) {
        logger.error('[Preflight] Substack check failed:', error);
        result.message = `Substack check failed: ${error.message}`;
    }

    return result;
}

/**
 * Check LinkedIn direct publishing (separate from Postiz)
 */
async function checkLinkedIn(userId) {
    const result = {
        service: 'linkedin_direct',
        status: STATUS.UNAVAILABLE,
        message: ''
    };

    try {
        if (!userId) {
            result.status = STATUS.NOT_CONFIGURED;
            result.message = 'User context required';
            return result;
        }

        const connection = await linkedinService.getConnection(userId);

        if (!connection) {
            result.status = STATUS.NOT_CONFIGURED;
            result.message = 'LinkedIn not connected. Connect your account in Social Media settings.';
            return result;
        }

        if (connection.status !== 'active') {
            result.status = STATUS.EXPIRED;
            result.message = `LinkedIn connection status: ${connection.status}. Please reconnect.`;
            return result;
        }

        // Check token expiry
        const tokenExpiry = new Date(connection.token_expires_at);
        const now = new Date();

        if (tokenExpiry <= now) {
            // Try to check if refresh is possible
            if (connection.refresh_token_encrypted) {
                result.status = STATUS.DEGRADED;
                result.message = 'LinkedIn token expired but refresh token available. Will auto-refresh on publish.';
            } else {
                result.status = STATUS.EXPIRED;
                result.message = 'LinkedIn token expired. Please reconnect your account.';
            }
            return result;
        }

        const hoursUntilExpiry = Math.ceil((tokenExpiry - now) / (1000 * 60 * 60));
        result.status = STATUS.READY;
        result.message = `Connected as ${connection.platform_username}`;

        if (hoursUntilExpiry < 24) {
            result.status = STATUS.DEGRADED;
            result.message = `Connected as ${connection.platform_username} (token expires in ${hoursUntilExpiry}h — will auto-refresh)`;
        }
    } catch (error) {
        logger.error('[Preflight] LinkedIn check failed:', error);
        result.message = `LinkedIn check failed: ${error.message}`;
    }

    return result;
}

/**
 * Run all pre-flight checks for a Thought Leadership workflow
 *
 * @param {Object} options
 * @param {string} options.orgId - Organization ID
 * @param {string} options.userId - User ID
 * @param {string[]} options.targets - Which publish targets to check ['image', 'notion', 'social', 'substack', 'linkedin', 'web']
 * @param {string} options.preferredImageModel - Preferred image model
 * @returns {Object} Status map for all checked integrations
 */
async function runPreflightChecks(options = {}) {
    const {
        orgId,
        userId,
        targets = ['image', 'notion', 'social', 'substack', 'linkedin'],
        preferredImageModel = 'gpt-image-1.5'
    } = options;

    const startTime = Date.now();
    const checks = {};

    // Run all requested checks in parallel
    const checkPromises = [];

    if (targets.includes('image')) {
        checkPromises.push(
            checkImageGeneration(preferredImageModel)
                .then(r => { checks.image = r; })
                .catch(e => {
                    checks.image = {
                        service: 'image_generation',
                        status: STATUS.UNAVAILABLE,
                        message: `Check failed: ${e.message}`
                    };
                })
        );
    }

    if (targets.includes('notion')) {
        checkPromises.push(
            checkNotion()
                .then(r => { checks.notion = r; })
                .catch(e => {
                    checks.notion = {
                        service: 'notion',
                        status: STATUS.UNAVAILABLE,
                        message: `Check failed: ${e.message}`
                    };
                })
        );
    }

    if (targets.includes('social')) {
        checkPromises.push(
            checkPostiz(orgId)
                .then(r => { checks.social = r; })
                .catch(e => {
                    checks.social = {
                        service: 'social_media',
                        status: STATUS.UNAVAILABLE,
                        message: `Check failed: ${e.message}`
                    };
                })
        );
    }

    if (targets.includes('substack')) {
        checkPromises.push(
            checkSubstack(orgId)
                .then(r => { checks.substack = r; })
                .catch(e => {
                    checks.substack = {
                        service: 'substack',
                        status: STATUS.UNAVAILABLE,
                        beta: true,
                        message: `Check failed: ${e.message}`
                    };
                })
        );
    }

    if (targets.includes('linkedin')) {
        checkPromises.push(
            checkLinkedIn(userId)
                .then(r => { checks.linkedin = r; })
                .catch(e => {
                    checks.linkedin = {
                        service: 'linkedin_direct',
                        status: STATUS.UNAVAILABLE,
                        message: `Check failed: ${e.message}`
                    };
                })
        );
    }

    // Web publishing is always available (local, no external dependency)
    if (targets.includes('web')) {
        checks.web = {
            service: 'web_publishing',
            status: STATUS.READY,
            message: 'Blog publishing ready'
        };
    }

    await Promise.all(checkPromises);

    const duration = Date.now() - startTime;

    // Compute overall status
    const statuses = Object.values(checks).map(c => c.status);
    let overall;
    if (statuses.every(s => s === STATUS.READY)) {
        overall = STATUS.READY;
    } else if (statuses.some(s => s === STATUS.UNAVAILABLE || s === STATUS.EXPIRED)) {
        overall = STATUS.DEGRADED;
    } else {
        overall = STATUS.DEGRADED;
    }

    logger.info('[Preflight] Checks complete', {
        duration,
        overall,
        checks: Object.entries(checks).map(([k, v]) => `${k}:${v.status}`)
    });

    return {
        overall,
        checks,
        duration_ms: duration,
        checked_at: new Date().toISOString()
    };
}

module.exports = {
    runPreflightChecks,
    checkImageGeneration,
    checkNotion,
    checkPostiz,
    checkSubstack,
    checkLinkedIn,
    STATUS
};
