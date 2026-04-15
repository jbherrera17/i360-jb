/**
 * OpenAI Service Tests
 *
 * Tests for the OpenAI GPT LLM integration.
 */

// Mock the OpenAI SDK before requiring the service
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    },
    audio: {
      transcriptions: {
        create: jest.fn()
      },
      speech: {
        create: jest.fn()
      }
    },
    images: {
      generate: jest.fn(),
      createVariation: jest.fn()
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

const OpenAI = require('openai');

// Import after mocking
const openaiService = require('../../../server/services/openai');

describe('OpenAI Service', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
      chat: {
        completions: {
          create: jest.fn()
        }
      },
      audio: {
        transcriptions: {
          create: jest.fn()
        },
        speech: {
          create: jest.fn()
        }
      },
      images: {
        generate: jest.fn(),
        createVariation: jest.fn()
      }
    };
    OpenAI.mockImplementation(() => mockClient);
  });

  describe('initialize', () => {
    test('should return false when no API key provided', () => {
      const result = openaiService.initialize(null);
      expect(result).toBe(false);
    });

    test('should return false for empty API key', () => {
      const result = openaiService.initialize('');
      expect(result).toBe(false);
    });

    test('should initialize successfully with valid API key', () => {
      const result = openaiService.initialize('sk-test-key');
      expect(result).toBe(true);
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'sk-test-key' });
    });

    test('should accept optional search service', () => {
      const mockSearchService = { isAvailable: jest.fn().mockReturnValue(true) };
      const result = openaiService.initialize('sk-test-key', mockSearchService);
      expect(result).toBe(true);
    });

    test('should return false when OpenAI constructor throws', () => {
      OpenAI.mockImplementation(() => {
        throw new Error('Invalid API key');
      });
      const result = openaiService.initialize('invalid-key');
      expect(result).toBe(false);
    });
  });

  describe('resolveModel', () => {
    test('should return default model for null input', () => {
      expect(openaiService.resolveModel(null)).toBe('gpt-5.2');
    });

    test('should return default model for undefined input', () => {
      expect(openaiService.resolveModel(undefined)).toBe('gpt-5.2');
    });

    test('should resolve model aliases', () => {
      expect(openaiService.resolveModel('gpt-4o')).toBe('gpt-4o');
      expect(openaiService.resolveModel('gpt-4o-mini')).toBe('gpt-4o-mini');
      expect(openaiService.resolveModel('o1')).toBe('o1');
      expect(openaiService.resolveModel('o1-mini')).toBe('o1-mini');
    });

    test('should resolve convenience aliases', () => {
      expect(openaiService.resolveModel('gpt5')).toBe('gpt-5.2');
      expect(openaiService.resolveModel('gpt4')).toBe('gpt-4-turbo');
      expect(openaiService.resolveModel('gpt4o')).toBe('gpt-4o');
      expect(openaiService.resolveModel('gpt4-mini')).toBe('gpt-4o-mini');
    });

    test('should return exact model ID if valid', () => {
      expect(openaiService.resolveModel('gpt-5.2')).toBe('gpt-5.2');
      expect(openaiService.resolveModel('gpt-4-turbo')).toBe('gpt-4-turbo');
    });

    test('should be case insensitive for aliases', () => {
      expect(openaiService.resolveModel('GPT5')).toBe('gpt-5.2');
      expect(openaiService.resolveModel('GPT4O')).toBe('gpt-4o');
    });

    test('should fuzzy match model names', () => {
      expect(openaiService.resolveModel('turbo')).toBe('gpt-4-turbo');
    });

    test('should return default for unknown model', () => {
      expect(openaiService.resolveModel('unknown-model')).toBe('gpt-5.2');
    });
  });

  describe('getModels', () => {
    test('should return array of models', () => {
      const models = openaiService.getModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    test('should include required model properties', () => {
      const models = openaiService.getModels();
      const model = models[0];

      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('name');
      expect(model).toHaveProperty('description');
      expect(model).toHaveProperty('maxTokens');
      expect(model).toHaveProperty('contextWindow');
      expect(model).toHaveProperty('provider', 'openai');
    });

    test('should include GPT and o-series models', () => {
      const models = openaiService.getModels();
      const modelIds = models.map(m => m.id);

      expect(modelIds).toContain('gpt-5.2');
      expect(modelIds).toContain('gpt-4o');
      expect(modelIds).toContain('o1');
    });
  });

  describe('getImageModels', () => {
    test('should return array of image models', () => {
      const models = openaiService.getImageModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    test('should include DALL-E models', () => {
      const models = openaiService.getImageModels();
      const modelIds = models.map(m => m.id);

      expect(modelIds).toContain('dall-e-3');
      expect(modelIds).toContain('dall-e-2');
    });

    test('should include model capabilities', () => {
      const models = openaiService.getImageModels();
      const dalle3 = models.find(m => m.id === 'dall-e-3');

      expect(dalle3).toHaveProperty('sizes');
      expect(dalle3).toHaveProperty('qualities');
      expect(dalle3).toHaveProperty('styles');
    });
  });

  describe('isAvailable', () => {
    test('should return true after successful initialization', () => {
      openaiService.initialize('sk-test-key');
      expect(openaiService.isAvailable()).toBe(true);
    });
  });

  describe('chat', () => {
    beforeEach(() => {
      openaiService.initialize('sk-test-key');
    });

    test('should throw error when client not initialized', async () => {
      jest.resetModules();
      jest.mock('openai', () => jest.fn());
      const freshService = require('../../../server/services/openai');

      await expect(freshService.chat({ message: 'Hello' }))
        .rejects.toThrow('OpenAI client not initialized');
    });

    test('should send basic chat message', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Hello! How can I help?' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
      });

      const result = await openaiService.chat({
        message: 'Hello'
      });

      expect(result.content).toBe('Hello! How can I help?');
      expect(result.usage.prompt_tokens).toBe(10);
      expect(result.usage.completion_tokens).toBe(20);
    });

    test('should include system prompt in messages', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      });

      await openaiService.chat({
        message: 'Hello',
        systemPrompt: 'You are a helpful assistant.'
      });

      const callArgs = mockClient.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages[0]).toEqual({
        role: 'system',
        content: 'You are a helpful assistant.'
      });
    });

    test('should resolve model alias before sending', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      });

      await openaiService.chat({
        message: 'Hello',
        model: 'gpt4o'
      });

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o'
        })
      );
    });

    test('should use max_completion_tokens for GPT-5.x models', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      });

      await openaiService.chat({
        message: 'Hello',
        model: 'gpt-5.2',
        maxTokens: 2000
      });

      const callArgs = mockClient.chat.completions.create.mock.calls[0][0];
      expect(callArgs.max_completion_tokens).toBe(2000);
      expect(callArgs.max_tokens).toBeUndefined();
    });

    test('should use max_completion_tokens for o-series models', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      });

      await openaiService.chat({
        message: 'Hello',
        model: 'o1',
        maxTokens: 5000
      });

      const callArgs = mockClient.chat.completions.create.mock.calls[0][0];
      expect(callArgs.max_completion_tokens).toBe(5000);
    });

    test('should use max_tokens for GPT-4 models', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      });

      await openaiService.chat({
        message: 'Hello',
        model: 'gpt-4o',
        maxTokens: 2000
      });

      const callArgs = mockClient.chat.completions.create.mock.calls[0][0];
      expect(callArgs.max_tokens).toBe(2000);
      expect(callArgs.max_completion_tokens).toBeUndefined();
    });

    test('should include conversation history', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 30, completion_tokens: 5, total_tokens: 35 }
      });

      const history = [
        { role: 'user', content: 'Previous message' },
        { role: 'assistant', content: 'Previous response' }
      ];

      await openaiService.chat({
        message: 'New message',
        history
      });

      const callArgs = mockClient.chat.completions.create.mock.calls[0][0];
      expect(callArgs.messages).toHaveLength(3); // history + new message
    });

    test('should handle images in messages', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'I see an image' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 }
      });

      const images = [{
        data: 'base64encodeddata',
        mediaType: 'image/png'
      }];

      await openaiService.chat({
        message: 'What is in this image?',
        images
      });

      const callArgs = mockClient.chat.completions.create.mock.calls[0][0];
      const userMessage = callArgs.messages[callArgs.messages.length - 1];
      expect(Array.isArray(userMessage.content)).toBe(true);
      expect(userMessage.content[0].type).toBe('image_url');
    });

    test('should add reasoning effort for o-series models', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      });

      await openaiService.chat({
        message: 'Complex problem',
        model: 'o1',
        reasoningEffort: 'high'
      });

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reasoning_effort: 'high'
        })
      );
    });

    test('should return proper response structure', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Test response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 15, completion_tokens: 8, total_tokens: 23 }
      });

      const result = await openaiService.chat({
        message: 'Test',
        model: 'gpt-4o'
      });

      expect(result).toEqual({
        content: 'Test response',
        model: 'gpt-4o',
        modelName: 'GPT-4o',
        usage: {
          prompt_tokens: 15,
          completion_tokens: 8,
          total_tokens: 23
        },
        finishReason: 'stop'
      });
    });

    test('should handle API errors gracefully', async () => {
      mockClient.chat.completions.create.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(openaiService.chat({ message: 'Hello' }))
        .rejects.toThrow('OpenAI API error: Rate limit exceeded');
    });

    test('should handle null content in response', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: null }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 }
      });

      const result = await openaiService.chat({ message: 'Hello' });
      expect(result.content).toBe('');
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
      openaiService.initialize('sk-test-key', mockSearchService);
    });

    test('should add web search tool when enabled', async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      });

      await openaiService.chat({
        message: 'What is the latest news?',
        enableSearch: true
      });

      const callArgs = mockClient.chat.completions.create.mock.calls[0][0];
      expect(callArgs.tools).toBeDefined();
      expect(callArgs.tools[0].function.name).toBe('web_search');
      expect(callArgs.tool_choice).toBe('auto');
    });

    test('should handle tool calls and continue conversation', async () => {
      // First call returns tool call
      mockClient.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: null,
              tool_calls: [{
                id: 'call-123',
                function: {
                  name: 'web_search',
                  arguments: JSON.stringify({ query: 'latest news' })
                }
              }]
            },
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 }
        })
        // Second call returns final response
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Based on the search...' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 }
        });

      const result = await openaiService.chat({
        message: 'What is the latest news?',
        enableSearch: true
      });

      expect(mockSearchService.search).toHaveBeenCalledWith('latest news');
      expect(result.content).toBe('Based on the search...');
      expect(mockClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateImage', () => {
    beforeEach(() => {
      openaiService.initialize('sk-test-key');
    });

    test('should generate image with default model', async () => {
      mockClient.images.generate.mockResolvedValue({
        data: [{
          url: 'https://example.com/image.png',
          revised_prompt: 'A beautiful sunset over mountains'
        }]
      });

      const result = await openaiService.generateImage('A sunset over mountains');

      expect(result.images).toHaveLength(1);
      expect(result.images[0].url).toBe('https://example.com/image.png');
      expect(result.images[0].revisedPrompt).toBe('A beautiful sunset over mountains');
      expect(result.model).toBe('gpt-image-1.5');
    });

    test('should respect size parameter', async () => {
      mockClient.images.generate.mockResolvedValue({
        data: [{ url: 'https://example.com/image.png' }]
      });

      await openaiService.generateImage('Test', { model: 'dall-e-3', size: '1024x1792' });

      expect(mockClient.images.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          size: '1024x1792'
        })
      );
    });

    test('should throw error for invalid size', async () => {
      await expect(
        openaiService.generateImage('Test', { size: '256x256', model: 'dall-e-3' })
      ).rejects.toThrow('Invalid size');
    });

    test('should throw error for unknown model', async () => {
      await expect(
        openaiService.generateImage('Test', { model: 'unknown-model' })
      ).rejects.toThrow('Unknown image model');
    });

    test('should support base64 response format', async () => {
      mockClient.images.generate.mockResolvedValue({
        data: [{ b64_json: 'base64data' }]
      });

      const result = await openaiService.generateImage('Test', {
        model: 'dall-e-3',
        responseFormat: 'base64'
      });

      expect(result.images[0].base64).toBe('base64data');
      expect(mockClient.images.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: 'b64_json'
        })
      );
    });

    test('should add quality and style for DALL-E 3', async () => {
      mockClient.images.generate.mockResolvedValue({
        data: [{ url: 'https://example.com/image.png' }]
      });

      await openaiService.generateImage('Test', {
        model: 'dall-e-3',
        quality: 'hd',
        style: 'natural'
      });

      expect(mockClient.images.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          quality: 'hd',
          style: 'natural'
        })
      );
    });

    test('should limit n to 1 for DALL-E 3', async () => {
      mockClient.images.generate.mockResolvedValue({
        data: [{ url: 'https://example.com/image.png' }]
      });

      await openaiService.generateImage('Test', { n: 5, model: 'dall-e-3' });

      expect(mockClient.images.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          n: 1
        })
      );
    });
  });

  describe('transcribeAudio', () => {
    beforeEach(() => {
      openaiService.initialize('sk-test-key');
    });

    test('should transcribe audio', async () => {
      mockClient.audio.transcriptions.create.mockResolvedValue({
        text: 'Hello, this is a test transcription.'
      });

      const audioBuffer = Buffer.from('fake audio data');
      const result = await openaiService.transcribeAudio(audioBuffer);

      expect(result.text).toBe('Hello, this is a test transcription.');
    });

    test('should pass language option', async () => {
      mockClient.audio.transcriptions.create.mockResolvedValue({
        text: 'Bonjour'
      });

      const audioBuffer = Buffer.from('fake audio data');
      await openaiService.transcribeAudio(audioBuffer, { language: 'fr' });

      expect(mockClient.audio.transcriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'fr'
        })
      );
    });

    test('should handle transcription errors', async () => {
      mockClient.audio.transcriptions.create.mockRejectedValue(
        new Error('Invalid audio format')
      );

      const audioBuffer = Buffer.from('fake audio data');
      await expect(openaiService.transcribeAudio(audioBuffer))
        .rejects.toThrow('Transcription failed: Invalid audio format');
    });
  });

  describe('textToSpeech', () => {
    beforeEach(() => {
      openaiService.initialize('sk-test-key');
    });

    test('should convert text to speech', async () => {
      const audioData = new Uint8Array([1, 2, 3, 4]);
      mockClient.audio.speech.create.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(audioData.buffer)
      });

      const result = await openaiService.textToSpeech('Hello world');

      expect(result.audio).toBeDefined();
      expect(result.model).toBe('gpt-4o-mini-tts');
      expect(result.voice).toBe('alloy');
    });

    test('should support different voices', async () => {
      const audioData = new Uint8Array([1, 2, 3, 4]);
      mockClient.audio.speech.create.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(audioData.buffer)
      });

      await openaiService.textToSpeech('Hello', { voice: 'nova' });

      expect(mockClient.audio.speech.create).toHaveBeenCalledWith(
        expect.objectContaining({
          voice: 'nova'
        })
      );
    });

    test('should support speed adjustment', async () => {
      const audioData = new Uint8Array([1, 2, 3, 4]);
      mockClient.audio.speech.create.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(audioData.buffer)
      });

      await openaiService.textToSpeech('Hello', { speed: 1.5 });

      expect(mockClient.audio.speech.create).toHaveBeenCalledWith(
        expect.objectContaining({
          speed: 1.5
        })
      );
    });

    test('should handle TTS errors', async () => {
      mockClient.audio.speech.create.mockRejectedValue(
        new Error('Text too long')
      );

      await expect(openaiService.textToSpeech('Hello'))
        .rejects.toThrow('Text-to-speech failed: Text too long');
    });
  });

  describe('createImageVariation', () => {
    beforeEach(() => {
      openaiService.initialize('sk-test-key');
    });

    test('should create image variation', async () => {
      mockClient.images.createVariation.mockResolvedValue({
        data: [{ url: 'https://example.com/variation.png' }]
      });

      const imageBuffer = Buffer.from('fake image data');
      const result = await openaiService.createImageVariation(imageBuffer);

      expect(result.images).toHaveLength(1);
      expect(result.images[0].url).toBe('https://example.com/variation.png');
      expect(result.model).toBe('dall-e-2');
    });

    test('should limit n to 10', async () => {
      mockClient.images.createVariation.mockResolvedValue({
        data: Array(10).fill({ url: 'https://example.com/image.png' })
      });

      const imageBuffer = Buffer.from('fake image data');
      await openaiService.createImageVariation(imageBuffer, { n: 20 });

      expect(mockClient.images.createVariation).toHaveBeenCalledWith(
        expect.objectContaining({
          n: 10
        })
      );
    });
  });

  describe('OPENAI_MODELS constant', () => {
    test('should export OPENAI_MODELS', () => {
      expect(openaiService.OPENAI_MODELS).toBeDefined();
    });

    test('should have expected model properties', () => {
      const gpt4o = openaiService.OPENAI_MODELS['gpt-4o'];

      expect(gpt4o).toEqual({
        name: 'GPT-4o',
        description: expect.any(String),
        maxTokens: 16384,
        contextWindow: 128000,
        vision: true,
        audio: true,
        tier: 'standard'
      });
    });

    test('should identify reasoning models', () => {
      const o1 = openaiService.OPENAI_MODELS['o1'];
      expect(o1.reasoning).toBe(true);
    });
  });

  describe('IMAGE_MODELS constant', () => {
    test('should export IMAGE_MODELS', () => {
      expect(openaiService.IMAGE_MODELS).toBeDefined();
    });

    test('should include DALL-E 3 with proper sizes', () => {
      const dalle3 = openaiService.IMAGE_MODELS['dall-e-3'];
      expect(dalle3.sizes).toContain('1024x1024');
      expect(dalle3.sizes).toContain('1024x1792');
    });
  });

  describe('MODEL_ALIASES constant', () => {
    test('should export MODEL_ALIASES', () => {
      expect(openaiService.MODEL_ALIASES).toBeDefined();
    });

    test('should map convenience aliases correctly', () => {
      expect(openaiService.MODEL_ALIASES['gpt5']).toBe('gpt-5.2');
      expect(openaiService.MODEL_ALIASES['gpt4']).toBe('gpt-4-turbo');
    });
  });
});
