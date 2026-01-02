/**
 * LLM Registry Service - Insight 360
 *
 * Centralized registry of all supported LLM models across providers.
 * Single source of truth for model definitions used throughout the application.
 */

// ============================================================================
// ANTHROPIC (CLAUDE) MODELS
// ============================================================================
const ANTHROPIC_MODELS = {
    // Claude 4.5 Family (Latest)
    'claude-opus-4-5-20251101': {
        name: 'Claude Opus 4.5',
        provider: 'anthropic',
        description: 'Most intelligent model - maximum capability with practical performance',
        maxTokens: 8192,
        contextWindow: 200000,
        capabilities: ['vision', 'pdf', 'tool_use'],
        tier: 'premium',
        supportsEffort: true
    },
    'claude-sonnet-4-5-20250929': {
        name: 'Claude Sonnet 4.5',
        provider: 'anthropic',
        description: 'Best for complex agents and coding - highest intelligence',
        maxTokens: 8192,
        contextWindow: 200000,
        capabilities: ['vision', 'pdf', 'tool_use'],
        tier: 'default',
        default: true
    },
    'claude-haiku-4-5-20251001': {
        name: 'Claude Haiku 4.5',
        provider: 'anthropic',
        description: 'Fastest model - near-frontier performance at lowest cost',
        maxTokens: 8192,
        contextWindow: 200000,
        capabilities: ['vision', 'pdf', 'tool_use'],
        tier: 'fast'
    },
    // Claude 4.1 Family
    'claude-opus-4-1-20250805': {
        name: 'Claude Opus 4.1',
        provider: 'anthropic',
        description: 'Deep reasoning for complex tasks - catches subtle bugs',
        maxTokens: 8192,
        contextWindow: 200000,
        capabilities: ['vision', 'pdf', 'tool_use'],
        tier: 'premium'
    },
    // Claude 4 Family
    'claude-sonnet-4-20250514': {
        name: 'Claude Sonnet 4',
        provider: 'anthropic',
        description: 'Balanced performance and speed - great for general use',
        maxTokens: 8192,
        contextWindow: 200000,
        capabilities: ['vision', 'pdf', 'tool_use'],
        tier: 'standard'
    },
    'claude-opus-4-20250514': {
        name: 'Claude Opus 4',
        provider: 'anthropic',
        description: 'Powerful reasoning and analysis',
        maxTokens: 8192,
        contextWindow: 200000,
        capabilities: ['vision', 'pdf', 'tool_use'],
        tier: 'premium'
    }
};

// ============================================================================
// OPENAI (GPT) MODELS
// ============================================================================
const OPENAI_MODELS = {
    // GPT-5.2 Family (Latest - December 2025)
    'gpt-5.2': {
        name: 'GPT-5.2 Thinking',
        provider: 'openai',
        description: 'Best for structured work like coding and planning',
        maxTokens: 128000,
        contextWindow: 400000,
        capabilities: ['vision', 'reasoning', 'image_gen'],
        tier: 'flagship',
        default: true
    },
    'gpt-5.2-chat-latest': {
        name: 'GPT-5.2 Instant',
        provider: 'openai',
        description: 'Faster at writing and information seeking',
        maxTokens: 128000,
        contextWindow: 400000,
        capabilities: ['vision', 'image_gen'],
        tier: 'flagship'
    },
    'gpt-5.2-pro': {
        name: 'GPT-5.2 Pro',
        provider: 'openai',
        description: 'Most accurate answers for difficult questions',
        maxTokens: 128000,
        contextWindow: 400000,
        capabilities: ['vision', 'reasoning', 'image_gen'],
        tier: 'premium'
    },
    // GPT-4o Family
    'gpt-4o': {
        name: 'GPT-4o',
        provider: 'openai',
        description: 'Multimodal with text, vision, and audio',
        maxTokens: 16384,
        contextWindow: 128000,
        capabilities: ['vision', 'audio', 'image_gen'],
        tier: 'standard'
    },
    'gpt-4o-mini': {
        name: 'GPT-4o Mini',
        provider: 'openai',
        description: 'Affordable multimodal - great for simple tasks',
        maxTokens: 16384,
        contextWindow: 128000,
        capabilities: ['vision', 'image_gen'],
        tier: 'efficient'
    },
    // O-Series Reasoning Models
    'o1': {
        name: 'o1',
        provider: 'openai',
        description: 'Advanced reasoning model - complex analysis and math',
        maxTokens: 100000,
        contextWindow: 200000,
        capabilities: ['vision', 'reasoning'],
        tier: 'reasoning'
    },
    'o1-mini': {
        name: 'o1-mini',
        provider: 'openai',
        description: 'Fast reasoning - great for math and coding',
        maxTokens: 65536,
        contextWindow: 128000,
        capabilities: ['reasoning'],
        tier: 'reasoning'
    },
    // Legacy
    'gpt-4-turbo': {
        name: 'GPT-4 Turbo',
        provider: 'openai',
        description: 'Previous flagship with vision',
        maxTokens: 4096,
        contextWindow: 128000,
        capabilities: ['vision', 'image_gen'],
        tier: 'legacy'
    }
};

// ============================================================================
// PERPLEXITY (SONAR) MODELS
// ============================================================================
const PERPLEXITY_MODELS = {
    'sonar-pro': {
        name: 'Sonar Pro',
        provider: 'perplexity',
        description: 'Most capable model with advanced reasoning and search',
        maxTokens: 8192,
        contextWindow: 200000,
        capabilities: ['search'],
        tier: 'pro',
        default: true
    },
    'sonar': {
        name: 'Sonar',
        provider: 'perplexity',
        description: 'Balanced performance with web search',
        maxTokens: 8192,
        contextWindow: 128000,
        capabilities: ['search'],
        tier: 'standard'
    },
    'sonar-reasoning-pro': {
        name: 'Sonar Reasoning Pro',
        provider: 'perplexity',
        description: 'Extended thinking for complex analysis with search',
        maxTokens: 8192,
        contextWindow: 128000,
        capabilities: ['search', 'reasoning'],
        tier: 'reasoning'
    },
    'sonar-reasoning': {
        name: 'Sonar Reasoning',
        provider: 'perplexity',
        description: 'Fast reasoning with web search',
        maxTokens: 8192,
        contextWindow: 128000,
        capabilities: ['search', 'reasoning'],
        tier: 'reasoning'
    },
    'sonar-deep-research': {
        name: 'Sonar Deep Research',
        provider: 'perplexity',
        description: 'In-depth research with comprehensive web search',
        maxTokens: 8192,
        contextWindow: 128000,
        capabilities: ['search', 'research'],
        tier: 'research'
    }
};

// ============================================================================
// IMAGE GENERATION MODELS
// ============================================================================
const IMAGE_MODELS = {
    'gpt-image-1.5': {
        name: 'GPT Image 1.5',
        provider: 'openai',
        description: 'Latest image generation with better instruction-following',
        sizes: ['1024x1024', '1024x1792', '1792x1024'],
        qualities: ['standard', 'hd'],
        styles: ['vivid', 'natural'],
        tier: 'flagship',
        default: true
    },
    'dall-e-3': {
        name: 'DALL-E 3',
        provider: 'openai',
        description: 'High quality image generation with detailed prompts',
        sizes: ['1024x1024', '1024x1792', '1792x1024'],
        qualities: ['standard', 'hd'],
        styles: ['vivid', 'natural'],
        tier: 'premium'
    },
    'dall-e-2': {
        name: 'DALL-E 2',
        provider: 'openai',
        description: 'Fast image generation, supports variations and edits',
        sizes: ['256x256', '512x512', '1024x1024'],
        qualities: ['standard'],
        styles: [],
        tier: 'standard'
    }
};

// ============================================================================
// COMBINED REGISTRY
// ============================================================================
const ALL_MODELS = {
    ...ANTHROPIC_MODELS,
    ...OPENAI_MODELS,
    ...PERPLEXITY_MODELS
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all models for a specific provider
 */
function getModelsByProvider(provider) {
    switch (provider) {
        case 'anthropic':
            return ANTHROPIC_MODELS;
        case 'openai':
            return OPENAI_MODELS;
        case 'perplexity':
            return PERPLEXITY_MODELS;
        default:
            return {};
    }
}

/**
 * Get a specific model by ID
 */
function getModel(modelId) {
    return ALL_MODELS[modelId] || null;
}

/**
 * Get provider for a model ID
 */
function getProvider(modelId) {
    if (!modelId) return 'anthropic';
    if (modelId.startsWith('claude')) return 'anthropic';
    if (modelId.startsWith('gpt') || modelId.startsWith('o1') || modelId.startsWith('dall-e')) return 'openai';
    if (modelId.startsWith('sonar') || modelId.startsWith('pplx') || modelId.startsWith('perplexity')) return 'perplexity';
    return ALL_MODELS[modelId]?.provider || 'anthropic';
}

/**
 * Get default model for a provider
 */
function getDefaultModel(provider) {
    const models = getModelsByProvider(provider);
    for (const [id, model] of Object.entries(models)) {
        if (model.default) return id;
    }
    // Return first model if no default
    return Object.keys(models)[0] || null;
}

/**
 * Get all available models formatted for frontend dropdowns
 * Filters by available API keys
 */
function getAvailableModels(apiKeys = {}) {
    const available = {};

    if (apiKeys.anthropic) {
        available.anthropic = Object.entries(ANTHROPIC_MODELS).map(([id, model]) => ({
            id,
            name: model.name,
            description: model.description,
            tier: model.tier,
            vision: model.capabilities?.includes('vision'),
            pdf: model.capabilities?.includes('pdf'),
            reasoning: model.capabilities?.includes('reasoning')
        }));
    }

    if (apiKeys.openai) {
        available.openai = Object.entries(OPENAI_MODELS).map(([id, model]) => ({
            id,
            name: model.name,
            description: model.description,
            tier: model.tier,
            vision: model.capabilities?.includes('vision'),
            audio: model.capabilities?.includes('audio'),
            imageGen: model.capabilities?.includes('image_gen'),
            reasoning: model.capabilities?.includes('reasoning')
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
            search: model.capabilities?.includes('search'),
            reasoning: model.capabilities?.includes('reasoning'),
            research: model.capabilities?.includes('research')
        }));
    }

    return available;
}

/**
 * Get all chat models as a flat list (for agent configuration)
 * Includes provider info for grouping
 */
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

    return models;
}

/**
 * Validate if a model ID is valid
 */
function isValidModel(modelId) {
    return modelId in ALL_MODELS;
}

/**
 * Get model info for display
 */
function getModelDisplayInfo(modelId) {
    const model = ALL_MODELS[modelId];
    if (!model) return null;

    return {
        id: modelId,
        name: model.name,
        provider: model.provider,
        description: model.description,
        tier: model.tier,
        capabilities: model.capabilities || []
    };
}

// ============================================================================
// EXPORTS
// ============================================================================
module.exports = {
    // Model collections
    ANTHROPIC_MODELS,
    OPENAI_MODELS,
    PERPLEXITY_MODELS,
    IMAGE_MODELS,
    ALL_MODELS,

    // Helper functions
    getModelsByProvider,
    getModel,
    getProvider,
    getDefaultModel,
    getAvailableModels,
    getAllChatModels,
    isValidModel,
    getModelDisplayInfo
};
