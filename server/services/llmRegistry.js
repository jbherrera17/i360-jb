/**
 * LLM Registry Service - Insight 360
 *
 * Centralized registry of supported LLM models across providers.
 * Uses provider service exports so the UI and validation only expose models
 * that the execution layer can actually send.
 */

const anthropic = require('./anthropic');
const openai = require('./openai');
const perplexity = require('./perplexity');
const gemini = require('./gemini');

function buildAnthropicModels() {
    return Object.fromEntries(
        Object.entries(anthropic.CLAUDE_MODELS).map(([id, model]) => [
            id,
            {
                ...model,
                provider: 'anthropic',
                capabilities: [
                    'vision',
                    'pdf',
                    'tool_use',
                    ...(model.supportsEffort ? ['reasoning'] : [])
                ]
            }
        ])
    );
}

function buildOpenAIModels() {
    return Object.fromEntries(
        Object.entries(openai.OPENAI_MODELS).map(([id, model]) => [
            id,
            {
                ...model,
                provider: 'openai',
                capabilities: [
                    ...(model.vision ? ['vision'] : []),
                    ...(model.audio ? ['audio'] : []),
                    ...(model.reasoning ? ['reasoning'] : [])
                ]
            }
        ])
    );
}

function buildPerplexityModels() {
    return Object.fromEntries(
        Object.entries(perplexity.PERPLEXITY_MODELS).map(([id, model]) => [
            id,
            {
                ...model,
                provider: 'perplexity',
                capabilities: [
                    ...(model.search ? ['search'] : []),
                    ...(model.reasoning ? ['reasoning'] : []),
                    ...(model.research ? ['research'] : [])
                ]
            }
        ])
    );
}

function buildGeminiModels() {
    return Object.fromEntries(
        Object.entries(gemini.GEMINI_MODELS).map(([id, model]) => [
            id,
            {
                ...model,
                provider: 'google',
                capabilities: Array.isArray(model.capabilities) ? [...model.capabilities] : []
            }
        ])
    );
}

function buildImageModels() {
    return Object.fromEntries(
        Object.entries(openai.IMAGE_MODELS).map(([id, model]) => [
            id,
            {
                ...model,
                provider: 'openai'
            }
        ])
    );
}

const ANTHROPIC_MODELS = buildAnthropicModels();
const OPENAI_MODELS = buildOpenAIModels();
const PERPLEXITY_MODELS = buildPerplexityModels();
const GEMINI_MODELS = buildGeminiModels();
const IMAGE_MODELS = buildImageModels();

const ALL_MODELS = {
    ...ANTHROPIC_MODELS,
    ...OPENAI_MODELS,
    ...PERPLEXITY_MODELS,
    ...GEMINI_MODELS
};

const DEPRECATED_MODEL_MAP = {
    'sonar-reasoning': 'sonar-reasoning-pro'
};

const MODEL_ALIASES = {
    ...anthropic.MODEL_ALIASES,
    ...openai.MODEL_ALIASES,
    ...perplexity.MODEL_ALIASES,
    ...gemini.MODEL_ALIASES
};

function getModelsByProvider(provider) {
    switch (provider) {
        case 'anthropic':
            return ANTHROPIC_MODELS;
        case 'openai':
            return OPENAI_MODELS;
        case 'perplexity':
            return PERPLEXITY_MODELS;
        case 'google':
            return GEMINI_MODELS;
        default:
            return {};
    }
}

function getModel(modelId) {
    return ALL_MODELS[modelId] || null;
}

function getProvider(modelId) {
    if (!modelId) return 'anthropic';

    const resolved = resolveModelId(modelId);
    if (resolved.valid && resolved.model) {
        return ALL_MODELS[resolved.model]?.provider || 'anthropic';
    }

    const normalized = String(modelId).toLowerCase();
    if (normalized.startsWith('claude')) return 'anthropic';
    if (
        normalized.startsWith('gpt') ||
        normalized.startsWith('o1') ||
        normalized.startsWith('o3') ||
        normalized.startsWith('o4') ||
        normalized.startsWith('dall-e')
    ) {
        return 'openai';
    }
    if (
        normalized.startsWith('sonar') ||
        normalized.startsWith('pplx') ||
        normalized.startsWith('perplexity')
    ) {
        return 'perplexity';
    }
    if (normalized.startsWith('gemini') || normalized.startsWith('nano-banana')) {
        return 'google';
    }

    return 'anthropic';
}

function getDefaultModel(provider) {
    const models = getModelsByProvider(provider);
    for (const [id, model] of Object.entries(models)) {
        if (model.default) return id;
    }
    return Object.keys(models)[0] || null;
}

function getAvailableModels(apiKeys = {}) {
    const available = {};

    if (apiKeys.anthropic) {
        available.anthropic = Object.entries(ANTHROPIC_MODELS).map(([id, model]) => ({
            id,
            name: model.name,
            description: model.description,
            tier: model.tier,
            vision: model.capabilities.includes('vision'),
            pdf: model.capabilities.includes('pdf'),
            reasoning: model.capabilities.includes('reasoning')
        }));
    }

    if (apiKeys.openai) {
        available.openai = Object.entries(OPENAI_MODELS).map(([id, model]) => ({
            id,
            name: model.name,
            description: model.description,
            tier: model.tier,
            vision: model.capabilities.includes('vision'),
            audio: model.capabilities.includes('audio'),
            imageGen: model.capabilities.includes('image_gen'),
            reasoning: model.capabilities.includes('reasoning')
        }));

        available.imageModels = Object.entries(IMAGE_MODELS).map(([id, model]) => ({
            id,
            name: model.name,
            description: model.description,
            tier: model.tier,
            sizes: model.sizes
        }));
    }

    if (apiKeys.perplexity) {
        available.perplexity = Object.entries(PERPLEXITY_MODELS).map(([id, model]) => ({
            id,
            name: model.name,
            description: model.description,
            tier: model.tier,
            search: model.capabilities.includes('search'),
            reasoning: model.capabilities.includes('reasoning'),
            research: model.capabilities.includes('research')
        }));
    }

    if (apiKeys.google) {
        available.google = Object.entries(GEMINI_MODELS).map(([id, model]) => ({
            id,
            name: model.name,
            description: model.description,
            tier: model.tier,
            vision: model.capabilities.includes('vision'),
            audio: model.capabilities.includes('audio'),
            video: model.capabilities.includes('video'),
            reasoning: model.capabilities.includes('reasoning')
        }));
    }

    return available;
}

function getAllChatModels(apiKeys = {}) {
    const models = [];

    if (apiKeys.anthropic !== false) {
        Object.entries(ANTHROPIC_MODELS).forEach(([id, model]) => {
            models.push({
                id,
                name: model.name,
                provider: 'anthropic',
                providerName: 'Anthropic',
                description: model.description,
                tier: model.tier,
                capabilities: model.capabilities,
                maxTokens: model.maxTokens,
                contextWindow: model.contextWindow
            });
        });
    }

    if (apiKeys.openai !== false) {
        Object.entries(OPENAI_MODELS).forEach(([id, model]) => {
            models.push({
                id,
                name: model.name,
                provider: 'openai',
                providerName: 'OpenAI',
                description: model.description,
                tier: model.tier,
                capabilities: model.capabilities,
                maxTokens: model.maxTokens,
                contextWindow: model.contextWindow
            });
        });
    }

    if (apiKeys.perplexity !== false) {
        Object.entries(PERPLEXITY_MODELS).forEach(([id, model]) => {
            models.push({
                id,
                name: model.name,
                provider: 'perplexity',
                providerName: 'Perplexity',
                description: model.description,
                tier: model.tier,
                capabilities: model.capabilities,
                maxTokens: model.maxTokens,
                contextWindow: model.contextWindow
            });
        });
    }

    if (apiKeys.google !== false) {
        Object.entries(GEMINI_MODELS).forEach(([id, model]) => {
            models.push({
                id,
                name: model.name,
                provider: 'google',
                providerName: 'Google',
                description: model.description,
                tier: model.tier,
                capabilities: model.capabilities,
                maxTokens: model.maxTokens,
                contextWindow: model.contextWindow
            });
        });
    }

    return models;
}

function resolveModelId(modelId) {
    if (!modelId) {
        return {
            valid: false,
            model: null,
            error: 'Model is required'
        };
    }

    if (ALL_MODELS[modelId]) {
        return {
            valid: true,
            model: modelId,
            deprecated: false
        };
    }

    const normalized = String(modelId).trim().toLowerCase();

    if (!normalized) {
        return {
            valid: false,
            model: null,
            error: 'Model is required'
        };
    }

    if (DEPRECATED_MODEL_MAP[normalized]) {
        return {
            valid: false,
            model: null,
            deprecated: true,
            replacement: DEPRECATED_MODEL_MAP[normalized],
            error: `Model '${modelId}' is deprecated. Use '${DEPRECATED_MODEL_MAP[normalized]}' instead.`
        };
    }

    const canonicalModel = MODEL_ALIASES[normalized];
    if (canonicalModel && ALL_MODELS[canonicalModel]) {
        return {
            valid: true,
            model: canonicalModel,
            deprecated: false,
            aliasUsed: canonicalModel !== modelId
        };
    }

    return {
        valid: false,
        model: null,
        error: `Unsupported model '${modelId}'.`
    };
}

function isValidModel(modelId) {
    return !!resolveModelId(modelId).valid;
}

// ============================================
// Fallback Hierarchy (Phase 76+)
// ============================================

/**
 * Fallback map: primary model -> ordered list of fallback candidates
 * Perplexity models have NO fallback (unique search capability)
 */
const FALLBACK_MAP = {
    // Anthropic → OpenAI → Google
    'claude-sonnet-4-5-20250929': ['gpt-4o', 'gemini-2.5-pro'],
    'claude-opus-4-5-20251101': ['gpt-4o', 'claude-sonnet-4-5-20250929'],
    'claude-haiku-4-5-20251001': ['gpt-4o-mini', 'gemini-2.0-flash'],
    'claude-opus-4-1-20250805': ['gpt-4o', 'claude-sonnet-4-5-20250929'],
    'claude-sonnet-4-20250514': ['gpt-4o', 'gemini-2.5-pro'],
    'claude-opus-4-20250514': ['gpt-4o', 'claude-sonnet-4-5-20250929'],

    // OpenAI → Anthropic → Google
    'gpt-4o': ['claude-sonnet-4-5-20250929', 'gemini-2.5-pro'],
    'gpt-4o-mini': ['claude-haiku-4-5-20251001', 'gemini-2.0-flash'],
    'gpt-5.2': ['claude-sonnet-4-5-20250929', 'gemini-2.5-pro'],
    'gpt-5.2-chat-latest': ['claude-sonnet-4-5-20250929', 'gemini-2.5-pro'],
    'gpt-5.2-codex': ['claude-sonnet-4-5-20250929', 'gemini-2.5-pro'],
    'gpt-5.3-codex': ['claude-sonnet-4-5-20250929', 'gemini-2.5-pro'],
    'o1': ['claude-sonnet-4-5-20250929', 'gemini-2.5-pro'],
    'o1-mini': ['claude-haiku-4-5-20251001', 'gemini-2.0-flash'],
    'gpt-4-turbo': ['claude-sonnet-4-5-20250929', 'gemini-2.5-pro'],

    // Google → Anthropic → OpenAI
    'gemini-3-pro-preview': ['claude-sonnet-4-5-20250929', 'gpt-4o'],
    'gemini-3-flash-preview': ['claude-haiku-4-5-20251001', 'gpt-4o-mini'],
    'gemini-2.5-pro': ['claude-sonnet-4-5-20250929', 'gpt-4o'],
    'gemini-2.5-flash': ['claude-haiku-4-5-20251001', 'gpt-4o-mini'],
    'gemini-2.0-flash': ['claude-haiku-4-5-20251001', 'gpt-4o-mini'],
    'gemini-2.0-flash-lite': ['claude-haiku-4-5-20251001', 'gpt-4o-mini'],
    'nano-banana-pro-preview': ['claude-haiku-4-5-20251001', 'gpt-4o-mini'],

    // Perplexity — NO FALLBACK (unique search capability)
};

/**
 * Get the first healthy fallback model for a given model ID
 * @param {string} modelId - The primary model that is unavailable
 * @returns {{ model: string, provider: string } | null} - First healthy fallback or null
 */
function getFallbackModel(modelId) {
    const { isProviderHealthy } = require('./modelAvailabilityService');

    const candidates = FALLBACK_MAP[modelId];
    if (!candidates) return null;

    for (const candidateId of candidates) {
        const candidateModel = ALL_MODELS[candidateId];
        if (!candidateModel) continue;

        const candidateProvider = candidateModel.provider;
        if (isProviderHealthy(candidateProvider)) {
            return { model: candidateId, provider: candidateProvider };
        }
    }

    return null;
}

function getModelDisplayInfo(modelId) {
    const resolved = resolveModelId(modelId);
    const lookupId = resolved.valid ? resolved.model : modelId;
    const model = ALL_MODELS[lookupId];
    if (!model) return null;

    return {
        id: lookupId,
        name: model.name,
        provider: model.provider,
        description: model.description,
        tier: model.tier,
        capabilities: model.capabilities || []
    };
}

module.exports = {
    ANTHROPIC_MODELS,
    OPENAI_MODELS,
    PERPLEXITY_MODELS,
    GEMINI_MODELS,
    IMAGE_MODELS,
    ALL_MODELS,
    MODEL_ALIASES,
    DEPRECATED_MODEL_MAP,
    FALLBACK_MAP,
    getModelsByProvider,
    getModel,
    getProvider,
    getDefaultModel,
    getAvailableModels,
    getAllChatModels,
    resolveModelId,
    isValidModel,
    getModelDisplayInfo,
    getFallbackModel
};
