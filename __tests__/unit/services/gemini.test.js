/**
 * Gemini Service Tests
 * Tests for Google Gemini API wrapper
 */

// Mock the reliability service before requiring the module
jest.mock('../../../server/services/reliability', () => ({
    withRetry: jest.fn((fn) => fn()),
    CircuitBreaker: jest.fn().mockImplementation(() => ({
        execute: jest.fn((fn) => fn()),
        getStatus: jest.fn(() => ({ state: 'CLOSED', failures: 0 })),
        reset: jest.fn()
    }))
}));

jest.mock('../../../server/services/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const geminiService = require('../../../server/services/gemini');
const logger = require('../../../server/services/logger');

describe('Gemini Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
    });

    describe('initialize', () => {
        it('should initialize with valid API key', () => {
            expect(() => {
                geminiService.initialize('test-api-key');
            }).not.toThrow();
            expect(logger.info).toHaveBeenCalledWith(
                'Google Gemini initialized with reliability features'
            );
        });

        it('should throw error without API key', () => {
            expect(() => {
                geminiService.initialize(null);
            }).toThrow('Google AI API key is required');
        });

        it('should throw error with empty API key', () => {
            expect(() => {
                geminiService.initialize('');
            }).toThrow('Google AI API key is required');
        });
    });

    describe('isInitialized', () => {
        it('should return true after initialization', () => {
            geminiService.initialize('test-key');
            expect(geminiService.isInitialized()).toBe(true);
        });
    });

    describe('getModels', () => {
        it('should return array of models', () => {
            const models = geminiService.getModels();
            expect(Array.isArray(models)).toBe(true);
            expect(models.length).toBeGreaterThan(0);
        });

        it('should include model id in each model', () => {
            const models = geminiService.getModels();
            models.forEach(model => {
                expect(model).toHaveProperty('id');
                expect(model).toHaveProperty('name');
                expect(model).toHaveProperty('provider', 'google');
            });
        });

        it('should include gemini-3-flash-preview as default', () => {
            const models = geminiService.getModels();
            const flashModel = models.find(m => m.id === 'gemini-3-flash-preview');
            expect(flashModel).toBeDefined();
            expect(flashModel.default).toBe(true);
        });

        it('should include all Gemini model families', () => {
            const models = geminiService.getModels();
            const modelIds = models.map(m => m.id);

            // Gemini 3 family
            expect(modelIds).toContain('gemini-3-pro-preview');
            expect(modelIds).toContain('gemini-3-flash-preview');

            // Gemini 2.5 family
            expect(modelIds).toContain('gemini-2.5-pro');
            expect(modelIds).toContain('gemini-2.5-flash');

            // Gemini 2.0 family
            expect(modelIds).toContain('gemini-2.0-flash');
            expect(modelIds).toContain('gemini-2.0-flash-lite');
        });
    });

    describe('GEMINI_MODELS', () => {
        it('should export GEMINI_MODELS constant', () => {
            expect(geminiService.GEMINI_MODELS).toBeDefined();
            expect(typeof geminiService.GEMINI_MODELS).toBe('object');
        });

        it('should have correct structure for each model', () => {
            Object.entries(geminiService.GEMINI_MODELS).forEach(([id, model]) => {
                expect(model).toHaveProperty('name');
                expect(model).toHaveProperty('provider', 'google');
                expect(model).toHaveProperty('description');
                expect(model).toHaveProperty('maxTokens');
                expect(model).toHaveProperty('contextWindow');
                expect(model).toHaveProperty('capabilities');
                expect(Array.isArray(model.capabilities)).toBe(true);
            });
        });
    });

    describe('chat', () => {
        beforeEach(() => {
            geminiService.initialize('test-api-key');
        });

        it('should throw error if not initialized', async () => {
            // Create a fresh module without initialization
            jest.resetModules();

            // Re-mock dependencies
            jest.mock('../../../server/services/reliability', () => ({
                withRetry: jest.fn((fn) => fn()),
                CircuitBreaker: jest.fn().mockImplementation(() => ({
                    execute: jest.fn((fn) => fn())
                }))
            }));
            jest.mock('../../../server/services/logger', () => ({
                info: jest.fn(),
                error: jest.fn(),
                debug: jest.fn(),
                warn: jest.fn()
            }));

            const freshGemini = require('../../../server/services/gemini');

            await expect(freshGemini.chat({ message: 'Hello' }))
                .rejects.toThrow('Gemini service not initialized');
        });

        it('should make successful chat request', async () => {
            const mockResponse = {
                candidates: [{
                    content: {
                        parts: [{ text: 'Hello! How can I help you?' }]
                    },
                    finishReason: 'STOP'
                }],
                usageMetadata: {
                    promptTokenCount: 10,
                    candidatesTokenCount: 8,
                    totalTokenCount: 18
                }
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await geminiService.chat({
                message: 'Hello',
                model: 'gemini-2.0-flash'
            });

            expect(result).toHaveProperty('content', 'Hello! How can I help you?');
            expect(result).toHaveProperty('model', 'gemini-2.0-flash');
            expect(result).toHaveProperty('usage');
            expect(result.usage).toEqual({
                promptTokens: 10,
                completionTokens: 8,
                totalTokens: 18
            });
        });

        it('should include system prompt in request', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: 'Response' }] } }],
                    usageMetadata: {}
                })
            });

            await geminiService.chat({
                message: 'Hello',
                systemPrompt: 'You are a helpful assistant'
            });

            expect(mockFetch).toHaveBeenCalled();
            const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(requestBody).toHaveProperty('systemInstruction');
            expect(requestBody.systemInstruction.parts[0].text)
                .toBe('You are a helpful assistant');
        });

        it('should handle history in request', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: 'Response' }] } }],
                    usageMetadata: {}
                })
            });

            await geminiService.chat({
                message: 'Continue',
                history: [
                    { role: 'user', content: 'Hello' },
                    { role: 'assistant', content: 'Hi there!' }
                ]
            });

            const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(requestBody.contents).toHaveLength(3); // 2 history + 1 current
            expect(requestBody.contents[0].role).toBe('user');
            expect(requestBody.contents[1].role).toBe('model');
        });

        it('should handle images in request', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: 'I see an image' }] } }],
                    usageMetadata: {}
                })
            });

            await geminiService.chat({
                message: 'What is in this image?',
                images: [{
                    data: 'base64encodeddata',
                    mediaType: 'image/png'
                }]
            });

            const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            const lastMessage = requestBody.contents[requestBody.contents.length - 1];
            expect(lastMessage.parts).toHaveLength(2); // image + text
            expect(lastMessage.parts[0]).toHaveProperty('inline_data');
        });

        it('should handle API errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => ({
                    error: { message: 'Invalid request' }
                })
            });

            await expect(geminiService.chat({ message: 'Hello' }))
                .rejects.toThrow('Invalid request');
        });

        it('should handle malformed error response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => { throw new Error('Parse error'); }
            });

            await expect(geminiService.chat({ message: 'Hello' }))
                .rejects.toThrow('Gemini API error: 500');
        });

        it('should respect maxTokens parameter', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: 'Response' }] } }],
                    usageMetadata: {}
                })
            });

            await geminiService.chat({
                message: 'Hello',
                maxTokens: 1000
            });

            const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(requestBody.generationConfig.maxOutputTokens).toBe(1000);
        });

        it('should cap maxTokens at model limit', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: 'Response' }] } }],
                    usageMetadata: {}
                })
            });

            await geminiService.chat({
                message: 'Hello',
                model: 'gemini-2.0-flash',
                maxTokens: 100000 // Way over the 8192 limit
            });

            const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(requestBody.generationConfig.maxOutputTokens).toBe(8192);
        });

        it('should use temperature parameter', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: 'Response' }] } }],
                    usageMetadata: {}
                })
            });

            await geminiService.chat({
                message: 'Hello',
                temperature: 0.5
            });

            const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(requestBody.generationConfig.temperature).toBe(0.5);
        });

        it('should resolve model aliases', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: 'Response' }] } }],
                    usageMetadata: {}
                })
            });

            const result = await geminiService.chat({
                message: 'Hello',
                model: 'gemini' // alias
            });

            expect(result.model).toBe('gemini-3-flash-preview');
        });
    });

    describe('streamChat', () => {
        beforeEach(() => {
            geminiService.initialize('test-api-key');
        });

        it('should throw error if not initialized', async () => {
            jest.resetModules();
            jest.mock('../../../server/services/reliability', () => ({
                withRetry: jest.fn((fn) => fn()),
                CircuitBreaker: jest.fn().mockImplementation(() => ({
                    execute: jest.fn((fn) => fn())
                }))
            }));
            jest.mock('../../../server/services/logger', () => ({
                info: jest.fn(),
                error: jest.fn(),
                debug: jest.fn(),
                warn: jest.fn()
            }));

            const freshGemini = require('../../../server/services/gemini');
            const generator = freshGemini.streamChat({ message: 'Hello' });

            await expect(generator.next()).rejects.toThrow('Gemini service not initialized');
        });

        it('should yield text chunks during streaming', async () => {
            // Create a mock readable stream
            const mockChunks = [
                'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}\n\n',
                'data: {"candidates":[{"content":{"parts":[{"text":" World"}]},"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":5,"candidatesTokenCount":2,"totalTokenCount":7}}\n\n'
            ];

            let chunkIndex = 0;
            const mockReader = {
                read: jest.fn().mockImplementation(() => {
                    if (chunkIndex < mockChunks.length) {
                        const chunk = new TextEncoder().encode(mockChunks[chunkIndex]);
                        chunkIndex++;
                        return Promise.resolve({ done: false, value: chunk });
                    }
                    return Promise.resolve({ done: true, value: undefined });
                })
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                body: { getReader: () => mockReader }
            });

            const generator = geminiService.streamChat({ message: 'Hello' });
            const chunks = [];

            for await (const chunk of generator) {
                chunks.push(chunk);
            }

            expect(chunks.length).toBeGreaterThan(0);
            expect(chunks.some(c => c.type === 'text')).toBe(true);
            expect(chunks.some(c => c.type === 'done')).toBe(true);
        });

        it('should handle streaming errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ error: { message: 'Server error' } })
            });

            const generator = geminiService.streamChat({ message: 'Hello' });
            const chunks = [];

            for await (const chunk of generator) {
                chunks.push(chunk);
            }

            expect(chunks.some(c => c.type === 'error')).toBe(true);
        });

        it('should include system prompt in streaming request', async () => {
            const mockReader = {
                read: jest.fn()
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"candidates":[{"content":{"parts":[{"text":"Hi"}]},"finishReason":"STOP"}]}\n\n')
                    })
                    .mockResolvedValueOnce({ done: true })
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                body: { getReader: () => mockReader }
            });

            const generator = geminiService.streamChat({
                message: 'Hello',
                systemPrompt: 'Be helpful'
            });

            // Consume the generator
            for await (const chunk of generator) { /* consume */ }

            const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
            expect(requestBody).toHaveProperty('systemInstruction');
        });
    });

    describe('model resolution', () => {
        it('should resolve "gemini" alias', () => {
            const models = geminiService.getModels();
            const defaultModel = models.find(m => m.default);
            expect(defaultModel.id).toBe('gemini-3-flash-preview');
        });

        it('should resolve "gemini-pro" alias', async () => {
            geminiService.initialize('test-key');
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: 'Response' }] } }],
                    usageMetadata: {}
                })
            });

            const result = await geminiService.chat({
                message: 'Hello',
                model: 'gemini-pro'
            });

            expect(result.model).toBe('gemini-3-pro-preview');
        });

        it('should resolve "gemini-flash" alias', async () => {
            geminiService.initialize('test-key');
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: 'Response' }] } }],
                    usageMetadata: {}
                })
            });

            const result = await geminiService.chat({
                message: 'Hello',
                model: 'gemini-flash'
            });

            expect(result.model).toBe('gemini-3-flash-preview');
        });

        it('should pass through unknown models unchanged', async () => {
            geminiService.initialize('test-key');
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: 'Response' }] } }],
                    usageMetadata: {}
                })
            });

            const result = await geminiService.chat({
                message: 'Hello',
                model: 'custom-model'
            });

            expect(result.model).toBe('custom-model');
        });
    });
});
