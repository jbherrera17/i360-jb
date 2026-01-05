/**
 * Integration Tests - Chat Routes
 * Tests HTTP endpoints for multi-LLM chat functionality
 */

const request = require('supertest');
const { createTestApp } = require('../../setup/testApp');

// Mock all LLM services before requiring chat routes
jest.mock('../../../server/services/anthropic', () => ({
  initialize: jest.fn().mockReturnValue(true),
  chat: jest.fn().mockResolvedValue({
    content: 'Test response from Claude',
    model: 'claude-sonnet-4-5-20250929',
    usage: { input_tokens: 100, output_tokens: 50 }
  }),
  streamChat: jest.fn().mockImplementation(async function* () {
    yield { type: 'text', content: 'Streamed ' };
    yield { type: 'text', content: 'response' };
    yield { type: 'done', usage: { input_tokens: 100, output_tokens: 50 } };
  })
}));

jest.mock('../../../server/services/openai', () => ({
  initialize: jest.fn().mockReturnValue(true),
  chat: jest.fn().mockResolvedValue({
    content: 'Test response from GPT',
    model: 'gpt-4o',
    usage: { input_tokens: 100, output_tokens: 50 }
  }),
  streamChat: jest.fn().mockImplementation(async function* () {
    yield { type: 'text', content: 'GPT ' };
    yield { type: 'text', content: 'response' };
    yield { type: 'done', usage: { input_tokens: 100, output_tokens: 50 } };
  })
}));

jest.mock('../../../server/services/perplexity', () => ({
  initialize: jest.fn().mockReturnValue(true),
  chat: jest.fn().mockResolvedValue({
    content: 'Test response from Perplexity',
    model: 'llama-3.1-sonar-large-128k-online',
    citations: ['https://example.com/1'],
    usage: { input_tokens: 100, output_tokens: 50 }
  }),
  streamChat: jest.fn().mockImplementation(async function* () {
    yield { type: 'text', content: 'Perplexity ' };
    yield { type: 'text', content: 'response' };
    yield { type: 'citations', citations: ['https://example.com'] };
    yield { type: 'done', usage: { input_tokens: 100, output_tokens: 50 } };
  })
}));

jest.mock('../../../server/services/llmRegistry', () => ({
  getProvider: jest.fn().mockImplementation((model) => {
    if (model && model.includes('gpt')) return 'openai';
    if (model && (model.includes('sonar') || model.includes('llama'))) return 'perplexity';
    return 'anthropic';
  }),
  getAvailableModels: jest.fn().mockReturnValue({
    anthropic: [{ id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' }],
    openai: [{ id: 'gpt-4o', name: 'GPT-4o' }],
    perplexity: [{ id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large' }]
  }),
  getAllChatModels: jest.fn().mockReturnValue([
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', provider: 'anthropic' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
    { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large', provider: 'perplexity' }
  ]),
  getDefaultModel: jest.fn().mockReturnValue('claude-sonnet-4-5-20250929')
}));

jest.mock('../../../server/services/agentService', () => ({
  executeAgent: jest.fn().mockResolvedValue({
    response: 'Agent response',
    model: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    usage: { input_tokens: 150, output_tokens: 75 }
  })
}));

jest.mock('../../../server/services/search', () => ({
  search: jest.fn().mockResolvedValue([
    { title: 'Result 1', snippet: 'Snippet 1', url: 'https://example.com/1' },
    { title: 'Result 2', snippet: 'Snippet 2', url: 'https://example.com/2' }
  ])
}));

// Get mocked modules for assertions
const anthropic = require('../../../server/services/anthropic');
const openai = require('../../../server/services/openai');
const perplexity = require('../../../server/services/perplexity');
const agentService = require('../../../server/services/agentService');
const search = require('../../../server/services/search');

describe('Chat Routes Integration Tests', () => {
  let app;

  beforeAll(() => {
    // Set API key environment variables for the routes to initialize
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const testApp = createTestApp({ routes: ['chat'] });
    app = testApp.app;
  });

  // ============================================================================
  // GET /api/chat/models
  // ============================================================================
  describe('GET /api/chat/models', () => {
    it('should return available models grouped by provider', async () => {
      const response = await request(app)
        .get('/api/chat/models')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.models).toBeDefined();
      expect(response.body.models.anthropic).toBeDefined();
      expect(response.body.default).toBe('claude-sonnet-4-5-20250929');
    });
  });

  // ============================================================================
  // GET /api/chat/models/all
  // ============================================================================
  describe('GET /api/chat/models/all', () => {
    it('should return flat list of all chat models', async () => {
      const response = await request(app)
        .get('/api/chat/models/all')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.models)).toBe(true);
      expect(response.body.models.length).toBe(3);
      expect(response.body.models[0]).toHaveProperty('provider');
    });
  });

  // ============================================================================
  // POST /api/chat
  // ============================================================================
  describe('POST /api/chat', () => {
    it('should return 400 when message is missing', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Message is required');
    });

    it('should execute direct chat with Claude (default)', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Hello!' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.response).toBe('Test response from Claude');
      expect(response.body.provider).toBe('anthropic');
      expect(anthropic.chat).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Hello!'
      }));
    });

    it('should use specified model', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Hello!', model: 'gpt-4o' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.response).toBe('Test response from GPT');
      expect(response.body.provider).toBe('openai');
      expect(openai.chat).toHaveBeenCalled();
    });

    it('should include system prompt', async () => {
      await request(app)
        .post('/api/chat')
        .send({
          message: 'Hello!',
          systemPrompt: 'You are a helpful assistant.'
        })
        .expect(200);

      expect(anthropic.chat).toHaveBeenCalledWith(expect.objectContaining({
        systemPrompt: 'You are a helpful assistant.'
      }));
    });

    it('should append context to system prompt', async () => {
      await request(app)
        .post('/api/chat')
        .send({
          message: 'Hello!',
          systemPrompt: 'Base prompt',
          context: 'Additional context here'
        })
        .expect(200);

      expect(anthropic.chat).toHaveBeenCalledWith(expect.objectContaining({
        systemPrompt: expect.stringContaining('Additional context here')
      }));
    });

    it('should execute agent-based chat when agent_id provided', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Hello!',
          agent_id: 'agent-123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.response).toBe('Agent response');
      expect(agentService.executeAgent).toHaveBeenCalledWith('agent-123', expect.objectContaining({
        userMessage: 'Hello!'
      }));
    });

    it('should return 500 when agent execution fails', async () => {
      agentService.executeAgent.mockRejectedValueOnce(new Error('Agent failed'));

      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Hello!',
          agent_id: 'agent-123'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Agent failed');
    });

    it('should use Perplexity provider for sonar models', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Hello!',
          model: 'llama-3.1-sonar-large-128k-online'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.provider).toBe('perplexity');
      expect(perplexity.chat).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // POST /api/chat/message
  // ============================================================================
  describe('POST /api/chat/message', () => {
    it('should return 400 when messages array is missing', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Messages array is required');
    });

    it('should return 400 when messages is empty array', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ messages: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should process simple text messages', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          messages: [
            { role: 'user', content: 'Hello!' }
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.response).toBe('Test response from Claude');
      expect(anthropic.chat).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Hello!',
        history: []
      }));
    });

    it('should handle conversation history', async () => {
      await request(app)
        .post('/api/chat/message')
        .send({
          messages: [
            { role: 'user', content: 'First message' },
            { role: 'assistant', content: 'First response' },
            { role: 'user', content: 'Second message' }
          ]
        })
        .expect(200);

      expect(anthropic.chat).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Second message',
        history: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'First message' }),
          expect.objectContaining({ role: 'assistant', content: 'First response' })
        ])
      }));
    });

    it('should handle multimodal messages (images)', async () => {
      await request(app)
        .post('/api/chat/message')
        .send({
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'What is in this image?' },
                { type: 'image', source: { media_type: 'image/png', data: 'base64data' } }
              ]
            }
          ]
        })
        .expect(200);

      expect(anthropic.chat).toHaveBeenCalledWith(expect.objectContaining({
        message: 'What is in this image?',
        images: expect.arrayContaining([
          expect.objectContaining({ mediaType: 'image/png', data: 'base64data' })
        ])
      }));
    });

    it('should handle PDF documents', async () => {
      await request(app)
        .post('/api/chat/message')
        .send({
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Summarize this document' },
                { type: 'document', source: { media_type: 'application/pdf', data: 'pdfbase64' } }
              ]
            }
          ]
        })
        .expect(200);

      expect(anthropic.chat).toHaveBeenCalledWith(expect.objectContaining({
        images: expect.arrayContaining([
          expect.objectContaining({ mediaType: 'application/pdf', data: 'pdfbase64' })
        ])
      }));
    });

    it('should use specified model', async () => {
      await request(app)
        .post('/api/chat/message')
        .send({
          messages: [{ role: 'user', content: 'Hello!' }],
          model: 'gpt-4o'
        })
        .expect(200);

      expect(openai.chat).toHaveBeenCalled();
    });

    it('should return citations from Perplexity', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          messages: [{ role: 'user', content: 'Hello!' }],
          model: 'llama-3.1-sonar-large-128k-online'
        })
        .expect(200);

      expect(response.body.citations).toEqual(['https://example.com/1']);
    });
  });

  // ============================================================================
  // POST /api/chat/stream
  // ============================================================================
  describe('POST /api/chat/stream', () => {
    it('should return 400 when messages array is missing', async () => {
      const response = await request(app)
        .post('/api/chat/stream')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Messages array is required');
    });

    it('should stream response as SSE', async () => {
      const response = await request(app)
        .post('/api/chat/stream')
        .send({
          messages: [{ role: 'user', content: 'Hello!' }]
        })
        .expect(200)
        .expect('Content-Type', /text\/event-stream/);

      expect(response.text).toContain('data:');
      expect(response.text).toContain('[DONE]');
    });

    it('should use Anthropic streaming for Claude models', async () => {
      await request(app)
        .post('/api/chat/stream')
        .send({
          messages: [{ role: 'user', content: 'Hello!' }],
          model: 'claude-sonnet-4-5-20250929'
        })
        .expect(200);

      expect(anthropic.streamChat).toHaveBeenCalled();
    });

    it('should use OpenAI streaming for GPT models', async () => {
      await request(app)
        .post('/api/chat/stream')
        .send({
          messages: [{ role: 'user', content: 'Hello!' }],
          model: 'gpt-4o'
        })
        .expect(200);

      expect(openai.streamChat).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // POST /api/chat/with-search
  // ============================================================================
  describe('POST /api/chat/with-search', () => {
    it('should return 400 when messages array is missing', async () => {
      const response = await request(app)
        .post('/api/chat/with-search')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should perform web search when searchQuery provided', async () => {
      const response = await request(app)
        .post('/api/chat/with-search')
        .send({
          messages: [{ role: 'user', content: 'Tell me about AI' }],
          searchQuery: 'artificial intelligence news 2024'
        })
        .expect(200);

      expect(search.search).toHaveBeenCalledWith('artificial intelligence news 2024');
      expect(response.body.searchResults).toHaveLength(2);
    });

    it('should include search results in system prompt', async () => {
      await request(app)
        .post('/api/chat/with-search')
        .send({
          messages: [{ role: 'user', content: 'Tell me about AI' }],
          searchQuery: 'AI news'
        })
        .expect(200);

      expect(anthropic.chat).toHaveBeenCalledWith(expect.objectContaining({
        systemPrompt: expect.stringContaining('Web Search Results')
      }));
    });

    it('should work without searchQuery', async () => {
      const response = await request(app)
        .post('/api/chat/with-search')
        .send({
          messages: [{ role: 'user', content: 'Hello!' }]
        })
        .expect(200);

      expect(search.search).not.toHaveBeenCalled();
      expect(response.body.searchResults).toBeNull();
    });

    it('should continue even if search fails', async () => {
      search.search.mockRejectedValueOnce(new Error('Search failed'));

      const response = await request(app)
        .post('/api/chat/with-search')
        .send({
          messages: [{ role: 'user', content: 'Hello!' }],
          searchQuery: 'test query'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.response).toBeDefined();
    });

    it('should return Perplexity citations when using Perplexity model', async () => {
      const response = await request(app)
        .post('/api/chat/with-search')
        .send({
          messages: [{ role: 'user', content: 'Hello!' }],
          model: 'llama-3.1-sonar-large-128k-online'
        })
        .expect(200);

      expect(response.body.citations).toEqual(['https://example.com/1']);
    });
  });

  // ============================================================================
  // POST /api/chat/voice/transcribe
  // ============================================================================
  describe('POST /api/chat/voice/transcribe', () => {
    it('should return not implemented message', async () => {
      const response = await request(app)
        .post('/api/chat/voice/transcribe')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not yet implemented');
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================
  describe('Error Handling', () => {
    it('should handle LLM service errors gracefully', async () => {
      anthropic.chat.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Hello!' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('API rate limit exceeded');
    });

    it('should handle unknown provider error', async () => {
      const llmRegistry = require('../../../server/services/llmRegistry');
      llmRegistry.getProvider.mockReturnValueOnce('unknown');

      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Hello!', model: 'unknown-model' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Unknown provider');
    });
  });
});
