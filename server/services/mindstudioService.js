/**
 * INSIGHT 360 - MindStudio Service
 * Version: 1.0.0
 *
 * Handles execution of MindStudio AI agents via API
 * Supports both synchronous and callback-based execution
 */

const MINDSTUDIO_API_BASE = 'https://api.mindstudio.ai/developer/v2';

/**
 * Execute a MindStudio app/workflow
 * @param {object} options - Execution options
 * @param {string} options.appId - MindStudio app ID
 * @param {object} options.variables - Variables to pass to the app
 * @param {string} options.workflow - Optional workflow name (without .flow extension)
 * @param {string} options.callbackUrl - Optional callback URL for async execution
 * @param {boolean} options.includeBillingCost - Include cost in response
 * @returns {Promise<object>} - Execution result
 */
async function executeApp({ appId, variables = {}, workflow = null, callbackUrl = null, includeBillingCost = false }) {
    const apiKey = process.env.MINDSTUDIO_API_KEY;

    if (!apiKey) {
        throw new Error('MINDSTUDIO_API_KEY not configured');
    }

    if (!appId) {
        throw new Error('MindStudio appId is required');
    }

    const requestBody = {
        appId,
        variables,
        includeBillingCost
    };

    if (workflow) {
        requestBody.workflow = workflow;
    }

    if (callbackUrl) {
        requestBody.callbackUrl = callbackUrl;
    }

    try {
        const response = await fetch(`${MINDSTUDIO_API_BASE}/apps/run`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MindStudio API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('[MindStudio] Execution error:', error.message);
        throw error;
    }
}

/**
 * Execute a MindStudio agent with user message
 * Maps Insight 360 agent format to MindStudio API
 * @param {object} agent - Agent configuration from database
 * @param {string} userMessage - User's input message
 * @param {object} context - Optional context to inject
 * @param {array} conversationHistory - Previous messages for context
 * @returns {Promise<object>} - Normalized response
 */
async function executeAgent(agent, userMessage, context = null, conversationHistory = []) {
    // Extract MindStudio-specific config
    const appId = agent.mindstudio_workflow_id || agent.config?.mindstudio_app_id;
    const workflow = agent.config?.mindstudio_workflow || null;

    if (!appId) {
        throw new Error('Agent missing MindStudio app ID configuration');
    }

    // Build variables for MindStudio
    const variables = {
        userMessage,
        agentName: agent.name,
        agentDescription: agent.description || ''
    };

    // Add context if provided
    if (context) {
        variables.context = typeof context === 'string' ? context : JSON.stringify(context);
    }

    // Add conversation history if available
    if (conversationHistory && conversationHistory.length > 0) {
        variables.conversationHistory = JSON.stringify(conversationHistory);
    }

    // Add any custom variables from agent config
    if (agent.config?.mindstudio_variables) {
        Object.assign(variables, agent.config.mindstudio_variables);
    }

    const result = await executeApp({
        appId,
        variables,
        workflow,
        includeBillingCost: true
    });

    // Normalize response to match Insight 360 format
    return {
        success: result.success,
        content: result.result || '',
        threadId: result.threadId,
        billingCost: result.billingCost,
        provider: 'mindstudio',
        model: 'mindstudio-workflow',
        raw: result
    };
}

/**
 * Validate MindStudio configuration
 * @param {string} apiKey - API key to validate
 * @returns {Promise<object>} - Validation result with org info
 */
async function validateConnection(apiKey = null) {
    const key = apiKey || process.env.MINDSTUDIO_API_KEY;

    if (!key) {
        return { valid: false, error: 'No API key provided' };
    }

    try {
        const response = await fetch(`${MINDSTUDIO_API_BASE}/apps/load`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            return { valid: false, error: `API returned ${response.status}` };
        }

        const data = await response.json();
        return {
            valid: true,
            orgId: data.orgId,
            orgName: data.orgName
        };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

/**
 * Check if MindStudio is configured and available
 * @returns {boolean}
 */
function isConfigured() {
    return !!process.env.MINDSTUDIO_API_KEY;
}

/**
 * Get embed URL for iframe-based execution
 * @param {object} agent - Agent with embed configuration
 * @returns {string|null} - Embed URL or null
 */
function getEmbedUrl(agent) {
    return agent.config?.embed_url || agent.embed_url || null;
}

/**
 * Generate a signed access URL for MindStudio embed
 * Required for authenticated iframe embedding
 * @param {string} agentId - MindStudio agent/app ID
 * @param {string} userId - Unique user identifier for the session
 * @returns {Promise<object>} - Object with signed URL
 */
async function generateSignedEmbedUrl(agentId, userId = 'default-user') {
    const apiKey = process.env.MINDSTUDIO_API_KEY;

    if (!apiKey) {
        throw new Error('MINDSTUDIO_API_KEY not configured');
    }

    if (!agentId) {
        throw new Error('MindStudio agentId is required');
    }

    try {
        const response = await fetch('https://v1.mindstudio-api.com/developer/v2/generate-signed-access-url', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                agentId,
                userId
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MindStudio signed URL error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        return {
            success: true,
            url: data.url,
            agentId,
            userId
        };
    } catch (error) {
        console.error('[MindStudio] Signed URL generation error:', error.message);
        throw error;
    }
}

module.exports = {
    executeApp,
    executeAgent,
    validateConnection,
    isConfigured,
    getEmbedUrl,
    generateSignedEmbedUrl,
    MINDSTUDIO_API_BASE
};
