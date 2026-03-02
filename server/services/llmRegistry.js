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
    getModelsByProvider,
    getModel,
    getProvider,
    getDefaultModel,
    getAvailableModels,
    getAllChatModels,
    resolveModelId,
    isValidModel,
    getModelDisplayInfo
};
