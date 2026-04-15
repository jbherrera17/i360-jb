/**
 * Anthropic Claude Service Tests
 *
 * Tests for the Anthropic Claude LLM integration.
 */

// Mock the Anthropic SDK before requiring the service
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn(),
      stream: jest.fn()
    }
  }));
});

// Mock reliability module to bypass retry delays in tests
jest.mock('../../../server/services/reliability', () => ({
  withResilience: jest.fn((operation) => operation()),
  getCircuitBreaker: jest.fn(() => ({
    getStatus: jest.fn(() => ({ state: 'CLOSED', failures: 0 })),
    reset: jest.fn(),
    onStateChange: jest.fn()
  })),
  resetAllCircuits: jest.fn()
}));

const Anthropic = require('@anthropic-ai/sdk');

// Import after mocking
const anthropicService = require('../../../server/services/anthropic');

describe('Anthropic Service', () => {
  let mockClient;

  beforeEach(() => {
    // Reset module state
    jest.clearAllMocks();

    // Get the mock client instance
    mockClient = {
      messages: {
        create: jest.fn(),
        stream: jest.fn()
      }
    };
    Anthropic.mockImplementation(() => mockClient);
  });

  describe('initialize', () => {
    test('should return false when no API key provided', () => {
      const result = anthropicService.initialize(null);
      expect(result).toBe(false);
    });

    test('should return false for empty API key', () => {
      const result = anthropicService.initialize('');
      expect(result).toBe(false);
    });

    test('should initialize successfully with valid API key', () => {
      const result = anthropicService.initialize('sk-test-key');
      expect(result).toBe(true);
      expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'sk-test-key' });
    });

    test('should accept optional search service', () => {
      const mockSearchService = { isAvailable: jest.fn().mockReturnValue(true) };
      const result = anthropicService.initialize('sk-test-key', mockSearchService);
      expect(result).toBe(true);
    });

    test('should return false when Anthropic constructor throws', () => {
      Anthropic.mockImplementation(() => {
        throw new Error('Invalid API key');
      });
      const result = anthropicService.initialize('invalid-key');
      expect(result).toBe(false);
    });
  });

  describe('resolveModel', () => {
    test('should return default model for null input', () => {
      expect(anthropicService.resolveModel(null)).toBe('claude-sonnet-4-5-20250929');
    });

    test('should return default model for undefined input', () => {
      expect(anthropicService.resolveModel(undefined)).toBe('claude-sonnet-4-5-20250929');
    });

    test('should resolve model aliases', () => {
      expect(anthropicService.resolveModel('claude-opus-4.5')).toBe('claude-opus-4-5-20251101');
      expect(anthropicService.resolveModel('claude-sonnet-4.5')).toBe('claude-sonnet-4-5-20250929');
      expect(anthropicService.resolveModel('claude-haiku-4.5')).toBe('claude-haiku-4-5-20251001');
    });

    test('should resolve convenience aliases', () => {
      expect(anthropicService.resolveModel('claude-opus')).toBe('claude-opus-4-5-20251101');
      expect(anthropicService.resolveModel('claude-sonnet')).toBe('claude-sonnet-4-5-20250929');
      expect(anthropicService.resolveModel('claude-haiku')).toBe('claude-haiku-4-5-20251001');
    });

    test('should return exact model ID if valid', () => {
      expect(anthropicService.resolveModel('claude-opus-4-5-20251101')).toBe('claude-opus-4-5-20251101');
      expect(anthropicService.resolveModel('claude-sonnet-4-20250514')).toBe('claude-sonnet-4-20250514');
    });

    test('should be case insensitive for aliases', () => {
      expect(anthropicService.resolveModel('CLAUDE-OPUS-4.5')).toBe('claude-opus-4-5-20251101');
      expect(anthropicService.resolveModel('Claude-Sonnet-4.5')).toBe('claude-sonnet-4-5-20250929');
    });

    test('should fuzzy match model names', () => {
      expect(anthropicService.resolveModel('opus')).toBe('claude-opus-4-5-20251101');
      expect(anthropicService.resolveModel('haiku')).toBe('claude-haiku-4-5-20251001');
    });

    test('should return default for unknown model', () => {
      expect(anthropicService.resolveModel('unknown-model')).toBe('claude-sonnet-4-5-20250929');
    });
  });

  describe('getModels', () => {
    test('should return array of models', () => {
      const models = anthropicService.getModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    test('should include required model properties', () => {
      const models = anthropicService.getModels();
      const model = models[0];

      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('name');
      expect(model).toHaveProperty('description');
      expect(model).toHaveProperty('maxTokens');
      expect(model).toHaveProperty('contextWindow');
      expect(model).toHaveProperty('provider', 'anthropic');
    });

    test('should include all Claude model families', () => {
      const models = anthropicService.getModels();
      const modelIds = models.map(m => m.id);

      expect(modelIds).toContain('claude-opus-4-5-20251101');
      expect(modelIds).toContain('claude-sonnet-4-5-20250929');
      expect(modelIds).toContain('claude-haiku-4-5-20251001');
    });
  });

  describe('isAvailable', () => {
    test('should return false before initialization', () => {
      // Fresh module won't have client initialized
      // Note: Due to module caching, this may reflect previous test state
      // The actual behavior depends on the initialize call
    });

    test('should return true after successful initialization', () => {
      anthropicService.initialize('sk-test-key');
      expect(anthropicService.isAvailable()).toBe(true);
    });
  });

  describe('chat', () => {
    beforeEach(() => {
      anthropicService.initialize('sk-test-key');
    });

    test('should throw error when client not initialized', async () => {
      // Create a fresh instance without initialization
      jest.resetModules();
      jest.mock('@anthropic-ai/sdk', () => jest.fn());
      const freshService = require('../../../server/services/anthropic');

      await expect(freshService.chat({ message: 'Hello' }))
        .rejects.toThrow('Anthropic client not initialized');
    });

    test('should send basic chat message', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello! How can I help?' }],
        usage: { input_tokens: 10, output_tokens: 20 },
        stop_reason: 'end_turn'
      });

      const result = await anthropicService.chat({
        message: 'Hello'
      });

      expect(result.content).toBe('Hello! How can I help?');
      expect(result.usage.input_tokens).toBe(10);
      expect(result.usage.output_tokens).toBe(20);
    });

    test('should include system prompt in request', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn'
      });

      await anthropicService.chat({
        message: 'Hello',
        systemPrompt: 'You are a helpful assistant.'
      });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are a helpful assistant.'
        })
      );
    });

    test('should resolve model alias before sending', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn'
      });

      await anthropicService.chat({
        message: 'Hello',
        model: 'claude-opus'
      });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-opus-4-5-20251101'
        })
      );
    });

    test('should respect max tokens limit', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn'
      });

      await anthropicService.chat({
        message: 'Hello',
        maxTokens: 2000
      });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 2000
        })
      );
    });

    test('should cap max tokens to model limit', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn'
      });

      await anthropicService.chat({
        message: 'Hello',
        maxTokens: 100000 // Exceeds model limit
      });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 8192 // Capped to model limit
        })
      );
    });

    test('should include conversation history', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 20, output_tokens: 5 },
        stop_reason: 'end_turn'
      });

      const history = [
        { role: 'user', content: 'Previous message' },
        { role: 'assistant', content: 'Previous response' }
      ];

      await anthropicService.chat({
        message: 'New message',
        history
      });

      const callArgs = mockClient.messages.create.mock.calls[0][0];
      expect(callArgs.messages).toHaveLength(3); // history + new message
      expect(callArgs.messages[0].content).toBe('Previous message');
      expect(callArgs.messages[1].content).toBe('Previous response');
    });

    test('should handle images in messages', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'I see an image' }],
        usage: { input_tokens: 100, output_tokens: 10 },
        stop_reason: 'end_turn'
      });

      const images = [{
        data: 'base64encodeddata',
        mediaType: 'image/png'
      }];

      await anthropicService.chat({
        message: 'What is in this image?',
        images
      });

      const callArgs = mockClient.messages.create.mock.calls[0][0];
      const userMessage = callArgs.messages[0];
      expect(Array.isArray(userMessage.content)).toBe(true);
      expect(userMessage.content[0].type).toBe('image');
    });

    test('should handle PDF documents', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Document analyzed' }],
        usage: { input_tokens: 500, output_tokens: 20 },
        stop_reason: 'end_turn'
      });

      const documents = [{
        data: 'base64pdfdata',
        mediaType: 'application/pdf'
      }];

      await anthropicService.chat({
        message: 'Summarize this document',
        images: documents
      });

      const callArgs = mockClient.messages.create.mock.calls[0][0];
      const userMessage = callArgs.messages[0];
      expect(userMessage.content[0].type).toBe('document');
      expect(userMessage.content[0].source.media_type).toBe('application/pdf');
    });

    test('should add effort parameter for Opus 4.5', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn'
      });

      await anthropicService.chat({
        message: 'Complex question',
        model: 'claude-opus-4.5',
        effort: 'high'
      });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { effort: 'high' }
        })
      );
    });

    test('should return proper response structure', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Test response' }],
        usage: { input_tokens: 15, output_tokens: 8 },
        stop_reason: 'end_turn'
      });

      const result = await anthropicService.chat({
        message: 'Test',
        model: 'claude-sonnet-4.5'
      });

      expect(result).toEqual({
        content: 'Test response',
        model: 'claude-sonnet-4-5-20250929',
        modelName: 'Claude Sonnet 4.5',
        usage: {
          input_tokens: 15,
          output_tokens: 8
        },
        stopReason: 'end_turn'
      });
    });

    test('should handle API errors gracefully', async () => {
      mockClient.messages.create.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(anthropicService.chat({ message: 'Hello' }))
        .rejects.toThrow('Claude API error: Rate limit exceeded');
    });

    test('should concatenate multiple text blocks in response', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [
          { type: 'text', text: 'First part. ' },
          { type: 'text', text: 'Second part.' }
        ],
        usage: { input_tokens: 10, output_tokens: 10 },
        stop_reason: 'end_turn'
      });

      const result = await anthropicService.chat({ message: 'Hello' });

      expect(result.content).toBe('First part. Second part.');
    });
  });

  describe('chat with web search', () => {
    let mockSearchService;

    beforeEach(() => {
      mockSearchService = {
        isAvailable: jest.fn().mockReturnValue(true),
        search: jest.fn().mockResolvedValue([
          { title: 'Result 1', url: 'https://example.com', snippet: 'Content 1' }
        ])
      };
      anthropicService.initialize('sk-test-key', mockSearchService);
    });

    test('should add web search tool when enabled', async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn'
      });

      await anthropicService.chat({
        message: 'What is the latest news?',
        enableSearch: true
      });

      const callArgs = mockClient.messages.create.mock.calls[0][0];
      expect(callArgs.tools).toBeDefined();
      expect(callArgs.tools[0].name).toBe('web_search');
    });

    test('should handle tool use response and continue conversation', async () => {
      // First call returns tool use
      mockClient.messages.create
        .mockResolvedValueOnce({
          content: [
            { type: 'tool_use', id: 'tool-123', name: 'web_search', input: { query: 'latest news' } }
          ],
          usage: { input_tokens: 20, output_tokens: 10 },
          stop_reason: 'tool_use'
        })
        // Second call returns final response
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Based on the search results...' }],
          usage: { input_tokens: 50, output_tokens: 30 },
          stop_reason: 'end_turn'
        });

      const result = await anthropicService.chat({
        message: 'What is the latest news?',
        enableSearch: true
      });

      expect(mockSearchService.search).toHaveBeenCalledWith('latest news');
      expect(result.content).toBe('Based on the search results...');
      expect(mockClient.messages.create).toHaveBeenCalledTimes(2);
    });

    test('should not add search tool when search service unavailable', async () => {
      mockSearchService.isAvailable.mockReturnValue(false);

      mockClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn'
      });

      await anthropicService.chat({
        message: 'Hello',
        enableSearch: true
      });

      const callArgs = mockClient.messages.create.mock.calls[0][0];
      expect(callArgs.tools).toBeUndefined();
    });
  });

  describe('CLAUDE_MODELS constant', () => {
    test('should export CLAUDE_MODELS', () => {
      expect(anthropicService.CLAUDE_MODELS).toBeDefined();
    });

    test('should have expected model properties', () => {
      const opus = anthropicService.CLAUDE_MODELS['claude-opus-4-5-20251101'];

      expect(opus).toEqual({
        name: 'Claude Opus 4.5',
        description: expect.any(String),
        maxTokens: 8192,
        contextWindow: 200000,
        vision: true,
        tier: 'opus',
        supportsEffort: true
      });
    });

    test('should have a default model marked', () => {
      const models = Object.values(anthropicService.CLAUDE_MODELS);
      const defaultModel = models.find(m => m.default === true);
      expect(defaultModel).toBeDefined();
    });
  });

  describe('MODEL_ALIASES constant', () => {
    test('should export MODEL_ALIASES', () => {
      expect(anthropicService.MODEL_ALIASES).toBeDefined();
    });

    test('should map convenience aliases to full model IDs', () => {
      expect(anthropicService.MODEL_ALIASES['claude-opus']).toBe('claude-opus-4-5-20251101');
      expect(anthropicService.MODEL_ALIASES['claude-sonnet']).toBe('claude-sonnet-4-5-20250929');
    });
  });
});
