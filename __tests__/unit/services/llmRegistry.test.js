/**
 * LLM Registry Service Tests
 * Tests for centralized model definitions and helper functions
 */

const {
    ANTHROPIC_MODELS,
    OPENAI_MODELS,
    PERPLEXITY_MODELS,
    GEMINI_MODELS,
    IMAGE_MODELS,
    ALL_MODELS,
    getModelsByProvider,
    getModel,
    getProvider,
    getDefaultModel,
    getAvailableModels,
    getAllChatModels,
    resolveModelId,
    isValidModel,
    getModelDisplayInfo
} = require('../../../server/services/llmRegistry');

describe('LLM Registry Service', () => {
    describe('Model Collections', () => {
        describe('ANTHROPIC_MODELS', () => {
            it('should contain Claude models', () => {
                expect(Object.keys(ANTHROPIC_MODELS).length).toBeGreaterThan(0);
                Object.keys(ANTHROPIC_MODELS).forEach(id => {
                    expect(id).toMatch(/^claude/);
                });
            });

            it('should have correct structure for each model', () => {
                Object.entries(ANTHROPIC_MODELS).forEach(([id, model]) => {
                    expect(model).toHaveProperty('name');
                    expect(model).toHaveProperty('provider', 'anthropic');
                    expect(model).toHaveProperty('description');
                    expect(model).toHaveProperty('maxTokens');
                    expect(model).toHaveProperty('contextWindow');
                    expect(model).toHaveProperty('capabilities');
                    expect(model).toHaveProperty('tier');
                });
            });

            it('should have a default model', () => {
                const defaultModel = Object.entries(ANTHROPIC_MODELS)
                    .find(([id, model]) => model.default);
                expect(defaultModel).toBeDefined();
            });

            it('should include Claude Sonnet 4.5 as default', () => {
                const defaultModel = Object.entries(ANTHROPIC_MODELS)
                    .find(([id, model]) => model.default);
                expect(defaultModel[0]).toBe('claude-sonnet-4-5-20250929');
            });

            it('should have correct specs for Opus 4.5', () => {
                const opus45 = ANTHROPIC_MODELS['claude-opus-4-5-20251101'];
                expect(opus45.contextWindow).toBe(200000);
                expect(opus45.maxTokens).toBe(8192);
                expect(opus45.capabilities).toContain('reasoning');
            });
        });

        describe('OPENAI_MODELS', () => {
            it('should contain GPT models', () => {
                expect(Object.keys(OPENAI_MODELS).length).toBeGreaterThan(0);
            });

            it('should have correct structure for each model', () => {
                Object.entries(OPENAI_MODELS).forEach(([id, model]) => {
                    expect(model).toHaveProperty('name');
                    expect(model).toHaveProperty('provider', 'openai');
                    expect(model).toHaveProperty('description');
                    expect(model).toHaveProperty('maxTokens');
                    expect(model).toHaveProperty('contextWindow');
                    expect(model).toHaveProperty('tier');
                });
            });

            it('should include o-series reasoning models', () => {
                expect(OPENAI_MODELS['o1']).toBeDefined();
                expect(OPENAI_MODELS['o1-mini']).toBeDefined();
                expect(OPENAI_MODELS['o1'].capabilities).toContain('reasoning');
            });

            it('should have a default model', () => {
                const defaultModel = Object.entries(OPENAI_MODELS)
                    .find(([id, model]) => model.default);
                expect(defaultModel).toBeDefined();
            });
        });

        describe('PERPLEXITY_MODELS', () => {
            it('should contain Sonar models', () => {
                expect(Object.keys(PERPLEXITY_MODELS).length).toBeGreaterThan(0);
                Object.keys(PERPLEXITY_MODELS).forEach(id => {
                    expect(id).toMatch(/^sonar/);
                });
            });

            it('should all have search capability', () => {
                Object.values(PERPLEXITY_MODELS).forEach(model => {
                    expect(model.capabilities).toContain('search');
                });
            });

            it('should have a default model', () => {
                const defaultModel = Object.entries(PERPLEXITY_MODELS)
                    .find(([id, model]) => model.default);
                expect(defaultModel).toBeDefined();
                expect(defaultModel[0]).toBe('sonar-pro');
            });
        });

        describe('GEMINI_MODELS', () => {
            it('should contain Gemini models', () => {
                expect(Object.keys(GEMINI_MODELS).length).toBeGreaterThan(0);
            });

            it('should have google as provider', () => {
                Object.values(GEMINI_MODELS).forEach(model => {
                    expect(model.provider).toBe('google');
                });
            });

            it('should have a default model', () => {
                const defaultModel = Object.entries(GEMINI_MODELS)
                    .find(([id, model]) => model.default);
                expect(defaultModel).toBeDefined();
            });
        });

        describe('IMAGE_MODELS', () => {
            it('should contain DALL-E and GPT Image models', () => {
                expect(IMAGE_MODELS['dall-e-3']).toBeDefined();
                expect(IMAGE_MODELS['dall-e-2']).toBeDefined();
                expect(IMAGE_MODELS['gpt-image-1.5']).toBeDefined();
            });

            it('should have correct image-specific properties', () => {
                Object.values(IMAGE_MODELS).forEach(model => {
                    expect(model).toHaveProperty('sizes');
                    expect(Array.isArray(model.sizes)).toBe(true);
                    expect(model).toHaveProperty('qualities');
                });
            });

            it('should have a default model', () => {
                const defaultModel = Object.entries(IMAGE_MODELS)
                    .find(([id, model]) => model.default);
                expect(defaultModel).toBeDefined();
                expect(defaultModel[0]).toBe('gpt-image-1.5');
            });
        });

        describe('ALL_MODELS', () => {
            it('should combine all provider models', () => {
                const anthropicCount = Object.keys(ANTHROPIC_MODELS).length;
                const openaiCount = Object.keys(OPENAI_MODELS).length;
                const perplexityCount = Object.keys(PERPLEXITY_MODELS).length;
                const geminiCount = Object.keys(GEMINI_MODELS).length;

                expect(Object.keys(ALL_MODELS).length).toBe(
                    anthropicCount + openaiCount + perplexityCount + geminiCount
                );
            });

            it('should not include image models', () => {
                expect(ALL_MODELS['dall-e-3']).toBeUndefined();
                expect(ALL_MODELS['gpt-image-1.5']).toBeUndefined();
            });
        });
    });

    describe('getModelsByProvider', () => {
        it('should return Anthropic models for anthropic provider', () => {
            const models = getModelsByProvider('anthropic');
            expect(models).toEqual(ANTHROPIC_MODELS);
        });

        it('should return OpenAI models for openai provider', () => {
            const models = getModelsByProvider('openai');
            expect(models).toEqual(OPENAI_MODELS);
        });

        it('should return Perplexity models for perplexity provider', () => {
            const models = getModelsByProvider('perplexity');
            expect(models).toEqual(PERPLEXITY_MODELS);
        });

        it('should return Gemini models for google provider', () => {
            const models = getModelsByProvider('google');
            expect(models).toEqual(GEMINI_MODELS);
        });

        it('should return empty object for unknown provider', () => {
            const models = getModelsByProvider('unknown');
            expect(models).toEqual({});
        });
    });

    describe('getModel', () => {
        it('should return model for valid ID', () => {
            const model = getModel('claude-sonnet-4-5-20250929');
            expect(model).toBeDefined();
            expect(model.name).toBe('Claude Sonnet 4.5');
            expect(model.provider).toBe('anthropic');
        });

        it('should return null for invalid model ID', () => {
            const model = getModel('nonexistent-model');
            expect(model).toBeNull();
        });

        it('should return null for undefined input', () => {
            const model = getModel(undefined);
            expect(model).toBeNull();
        });
    });

    describe('getProvider', () => {
        it('should return anthropic for claude models', () => {
            expect(getProvider('claude-sonnet-4-5-20250929')).toBe('anthropic');
            expect(getProvider('claude-opus-4-5-20251101')).toBe('anthropic');
            expect(getProvider('claude-haiku-4-5-20251001')).toBe('anthropic');
        });

        it('should return openai for GPT models', () => {
            expect(getProvider('gpt-5.2')).toBe('openai');
            expect(getProvider('gpt-4o')).toBe('openai');
            expect(getProvider('gpt-4o-mini')).toBe('openai');
        });

        it('should return openai for o-series models', () => {
            expect(getProvider('o1')).toBe('openai');
            expect(getProvider('o1-mini')).toBe('openai');
        });

        it('should return openai for DALL-E models', () => {
            expect(getProvider('dall-e-3')).toBe('openai');
            expect(getProvider('dall-e-2')).toBe('openai');
        });

        it('should return perplexity for Sonar models', () => {
            expect(getProvider('sonar-pro')).toBe('perplexity');
            expect(getProvider('sonar')).toBe('perplexity');
            expect(getProvider('sonar-reasoning-pro')).toBe('perplexity');
        });

        it('should return perplexity for pplx prefix', () => {
            expect(getProvider('pplx-custom')).toBe('perplexity');
        });

        it('should return google for Gemini models', () => {
            expect(getProvider('gemini-3-pro-preview')).toBe('google');
            expect(getProvider('gemini-2.5-flash')).toBe('google');
            expect(getProvider('gemini-2.0-flash')).toBe('google');
        });

        it('should return google for nano-banana models', () => {
            expect(getProvider('nano-banana-pro-preview')).toBe('google');
        });

        it('should return anthropic as default for unknown models', () => {
            expect(getProvider('unknown-model')).toBe('anthropic');
        });

        it('should return anthropic for null/undefined input', () => {
            expect(getProvider(null)).toBe('anthropic');
            expect(getProvider(undefined)).toBe('anthropic');
        });

        it('should lookup provider from ALL_MODELS if prefix does not match', () => {
            // This tests the fallback to ALL_MODELS lookup
            const result = getProvider('claude-sonnet-4-20250514');
            expect(result).toBe('anthropic');
        });
    });

    describe('getDefaultModel', () => {
        it('should return default Anthropic model', () => {
            const defaultModel = getDefaultModel('anthropic');
            expect(defaultModel).toBe('claude-sonnet-4-5-20250929');
        });

        it('should return default OpenAI model', () => {
            const defaultModel = getDefaultModel('openai');
            expect(defaultModel).toBe('gpt-5.2');
        });

        it('should return default Perplexity model', () => {
            const defaultModel = getDefaultModel('perplexity');
            expect(defaultModel).toBe('sonar-pro');
        });

        it('should return default Google model', () => {
            const defaultModel = getDefaultModel('google');
            expect(defaultModel).toBe('gemini-3-flash-preview');
        });

        it('should return null for unknown provider', () => {
            const defaultModel = getDefaultModel('unknown');
            expect(defaultModel).toBeNull();
        });
    });

    describe('getAvailableModels', () => {
        it('should return empty object when no API keys provided', () => {
            const available = getAvailableModels({});
            expect(available).toEqual({});
        });

        it('should return Anthropic models when anthropic key provided', () => {
            const available = getAvailableModels({ anthropic: true });
            expect(available.anthropic).toBeDefined();
            expect(Array.isArray(available.anthropic)).toBe(true);
            expect(available.anthropic.length).toBe(Object.keys(ANTHROPIC_MODELS).length);
        });

        it('should return OpenAI and image models when openai key provided', () => {
            const available = getAvailableModels({ openai: true });
            expect(available.openai).toBeDefined();
            expect(available.imageModels).toBeDefined();
            expect(Array.isArray(available.openai)).toBe(true);
            expect(Array.isArray(available.imageModels)).toBe(true);
        });

        it('should return Perplexity models when perplexity key provided', () => {
            const available = getAvailableModels({ perplexity: true });
            expect(available.perplexity).toBeDefined();
            expect(Array.isArray(available.perplexity)).toBe(true);
        });

        it('should return Google models when google key provided', () => {
            const available = getAvailableModels({ google: true });
            expect(available.google).toBeDefined();
            expect(Array.isArray(available.google)).toBe(true);
        });

        it('should return all providers when all keys provided', () => {
            const available = getAvailableModels({
                anthropic: true,
                openai: true,
                perplexity: true,
                google: true
            });

            expect(available.anthropic).toBeDefined();
            expect(available.openai).toBeDefined();
            expect(available.perplexity).toBeDefined();
            expect(available.google).toBeDefined();
            expect(available.imageModels).toBeDefined();
        });

        it('should include correct properties in model objects', () => {
            const available = getAvailableModels({ anthropic: true });
            const model = available.anthropic[0];

            expect(model).toHaveProperty('id');
            expect(model).toHaveProperty('name');
            expect(model).toHaveProperty('description');
            expect(model).toHaveProperty('tier');
        });

        it('should include capability flags for Anthropic models', () => {
            const available = getAvailableModels({ anthropic: true });
            const opusModel = available.anthropic.find(m => m.id.includes('opus'));

            expect(opusModel).toHaveProperty('vision');
            expect(opusModel).toHaveProperty('pdf');
        });

        it('should include capability flags for OpenAI models', () => {
            const available = getAvailableModels({ openai: true });
            const gpt4o = available.openai.find(m => m.id === 'gpt-4o');

            expect(gpt4o).toHaveProperty('vision');
            expect(gpt4o).toHaveProperty('audio');
            expect(gpt4o).toHaveProperty('imageGen');
        });
    });

    describe('getAllChatModels', () => {
        it('should return all models when no filter applied', () => {
            const models = getAllChatModels();
            expect(models.length).toBe(Object.keys(ALL_MODELS).length);
        });

        it('should exclude Anthropic when set to false', () => {
            const models = getAllChatModels({ anthropic: false });
            const anthropicModels = models.filter(m => m.provider === 'anthropic');
            expect(anthropicModels.length).toBe(0);
        });

        it('should exclude OpenAI when set to false', () => {
            const models = getAllChatModels({ openai: false });
            const openaiModels = models.filter(m => m.provider === 'openai');
            expect(openaiModels.length).toBe(0);
        });

        it('should exclude Perplexity when set to false', () => {
            const models = getAllChatModels({ perplexity: false });
            const perplexityModels = models.filter(m => m.provider === 'perplexity');
            expect(perplexityModels.length).toBe(0);
        });

        it('should exclude Google when set to false', () => {
            const models = getAllChatModels({ google: false });
            const googleModels = models.filter(m => m.provider === 'google');
            expect(googleModels.length).toBe(0);
        });

        it('should include correct properties in model objects', () => {
            const models = getAllChatModels();
            const model = models[0];

            expect(model).toHaveProperty('id');
            expect(model).toHaveProperty('name');
            expect(model).toHaveProperty('provider');
            expect(model).toHaveProperty('providerName');
            expect(model).toHaveProperty('description');
            expect(model).toHaveProperty('tier');
            expect(model).toHaveProperty('capabilities');
            expect(model).toHaveProperty('maxTokens');
            expect(model).toHaveProperty('contextWindow');
        });

        it('should have correct providerName values', () => {
            const models = getAllChatModels();

            const anthropicModel = models.find(m => m.provider === 'anthropic');
            expect(anthropicModel.providerName).toBe('Anthropic');

            const openaiModel = models.find(m => m.provider === 'openai');
            expect(openaiModel.providerName).toBe('OpenAI');

            const perplexityModel = models.find(m => m.provider === 'perplexity');
            expect(perplexityModel.providerName).toBe('Perplexity');

            const googleModel = models.find(m => m.provider === 'google');
            expect(googleModel.providerName).toBe('Google');
        });
    });

    describe('isValidModel', () => {
        it('should return true for valid Anthropic models', () => {
            expect(isValidModel('claude-sonnet-4-5-20250929')).toBe(true);
            expect(isValidModel('claude-opus-4-5-20251101')).toBe(true);
        });

        it('should return true for valid OpenAI models', () => {
            expect(isValidModel('gpt-5.2')).toBe(true);
            expect(isValidModel('gpt-4o')).toBe(true);
            expect(isValidModel('o1')).toBe(true);
        });

        it('should return true for valid Perplexity models', () => {
            expect(isValidModel('sonar-pro')).toBe(true);
            expect(isValidModel('sonar')).toBe(true);
        });

        it('should return true for valid Gemini models', () => {
            expect(isValidModel('gemini-3-flash-preview')).toBe(true);
            expect(isValidModel('gemini-2.0-flash')).toBe(true);
        });

        it('should return false for invalid models', () => {
            expect(isValidModel('fake-model')).toBe(false);
            expect(isValidModel('')).toBe(false);
            expect(isValidModel('gpt-99')).toBe(false);
        });

        it('should return false for image models (not in ALL_MODELS)', () => {
            expect(isValidModel('dall-e-3')).toBe(false);
            expect(isValidModel('gpt-image-1.5')).toBe(false);
        });
    });

    describe('resolveModelId', () => {
        it('should keep canonical model IDs unchanged', () => {
            expect(resolveModelId('gpt-4o')).toEqual(
                expect.objectContaining({
                    valid: true,
                    model: 'gpt-4o'
                })
            );
        });

        it('should normalize supported aliases to canonical models', () => {
            expect(resolveModelId('gpt4o')).toEqual(
                expect.objectContaining({
                    valid: true,
                    model: 'gpt-4o',
                    aliasUsed: true
                })
            );
        });

        it('should reject deprecated model IDs', () => {
            expect(resolveModelId('sonar-reasoning')).toEqual(
                expect.objectContaining({
                    valid: false,
                    deprecated: true,
                    replacement: 'sonar-reasoning-pro'
                })
            );
        });
    });

    describe('getModelDisplayInfo', () => {
        it('should return display info for valid model', () => {
            const info = getModelDisplayInfo('claude-sonnet-4-5-20250929');

            expect(info).toEqual({
                id: 'claude-sonnet-4-5-20250929',
                name: 'Claude Sonnet 4.5',
                provider: 'anthropic',
                description: expect.any(String),
                tier: expect.any(String),
                capabilities: expect.any(Array)
            });
        });

        it('should return null for invalid model', () => {
            const info = getModelDisplayInfo('fake-model');
            expect(info).toBeNull();
        });

        it('should include capabilities array', () => {
            const info = getModelDisplayInfo('claude-opus-4-5-20251101');
            expect(Array.isArray(info.capabilities)).toBe(true);
            expect(info.capabilities).toContain('vision');
            expect(info.capabilities).toContain('pdf');
        });

        it('should handle models without capabilities gracefully', () => {
            // All current models have capabilities, but test the fallback
            const info = getModelDisplayInfo('gpt-4o');
            expect(info.capabilities).toBeDefined();
        });
    });

    describe('Model Consistency', () => {
        it('all models should have required properties', () => {
            Object.entries(ALL_MODELS).forEach(([id, model]) => {
                expect(model).toHaveProperty('name', expect.any(String));
                expect(model).toHaveProperty('provider', expect.any(String));
                expect(model).toHaveProperty('description', expect.any(String));
                expect(model).toHaveProperty('maxTokens', expect.any(Number));
                expect(model).toHaveProperty('contextWindow', expect.any(Number));
                expect(model).toHaveProperty('tier', expect.any(String));
            });
        });

        it('all models should have valid provider value', () => {
            const validProviders = ['anthropic', 'openai', 'perplexity', 'google'];
            Object.values(ALL_MODELS).forEach(model => {
                expect(validProviders).toContain(model.provider);
            });
        });

        it('maxTokens should be less than contextWindow', () => {
            Object.entries(ALL_MODELS).forEach(([id, model]) => {
                expect(model.maxTokens).toBeLessThanOrEqual(model.contextWindow);
            });
        });
    });
});
