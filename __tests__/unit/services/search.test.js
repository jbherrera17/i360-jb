/**
 * Search Service Tests
 *
 * Tests for the multi-provider web search service.
 */

// Mock global fetch
global.fetch = jest.fn();

const searchService = require('../../../server/services/search');

describe('Search Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module state by re-requiring
    jest.resetModules();
  });

  describe('initialize', () => {
    test('should return false when no API keys provided', () => {
      // Clear env vars
      delete process.env.BRAVE_SEARCH_API_KEY;
      delete process.env.TAVILY_API_KEY;
      delete process.env.SERPER_API_KEY;

      const freshService = require('../../../server/services/search');
      const result = freshService.initialize({});

      expect(result).toBe(false);
    });

    test('should initialize with Brave API key', () => {
      const freshService = require('../../../server/services/search');
      const result = freshService.initialize({ braveApiKey: 'brave-key' });

      expect(result).toBe(true);
      expect(freshService.getProvider()).toBe('brave');
    });

    test('should initialize with Tavily API key', () => {
      const freshService = require('../../../server/services/search');
      const result = freshService.initialize({ tavilyApiKey: 'tavily-key' });

      expect(result).toBe(true);
      expect(freshService.getProvider()).toBe('tavily');
    });

    test('should initialize with Serper API key', () => {
      const freshService = require('../../../server/services/search');
      const result = freshService.initialize({ serperApiKey: 'serper-key' });

      expect(result).toBe(true);
      expect(freshService.getProvider()).toBe('serper');
    });

    test('should prefer Brave over other providers', () => {
      const freshService = require('../../../server/services/search');
      const result = freshService.initialize({
        braveApiKey: 'brave-key',
        tavilyApiKey: 'tavily-key',
        serperApiKey: 'serper-key'
      });

      expect(result).toBe(true);
      expect(freshService.getProvider()).toBe('brave');
    });

    test('should read API keys from environment variables', () => {
      process.env.BRAVE_SEARCH_API_KEY = 'env-brave-key';
      const freshService = require('../../../server/services/search');
      const result = freshService.initialize({});

      expect(result).toBe(true);
      expect(freshService.getProvider()).toBe('brave');

      delete process.env.BRAVE_SEARCH_API_KEY;
    });
  });

  describe('isAvailable', () => {
    test('should return false when not initialized', () => {
      const freshService = require('../../../server/services/search');
      freshService.initialize({});
      expect(freshService.isAvailable()).toBe(false);
    });

    test('should return true when initialized with API key', () => {
      const freshService = require('../../../server/services/search');
      freshService.initialize({ braveApiKey: 'test-key' });
      expect(freshService.isAvailable()).toBe(true);
    });
  });

  describe('getProvider', () => {
    test('should return null when not initialized', () => {
      const freshService = require('../../../server/services/search');
      freshService.initialize({});
      expect(freshService.getProvider()).toBeNull();
    });

    test('should return active provider name', () => {
      const freshService = require('../../../server/services/search');
      freshService.initialize({ tavilyApiKey: 'test-key' });
      expect(freshService.getProvider()).toBe('tavily');
    });
  });

  describe('search', () => {
    test('should throw error when service not initialized', async () => {
      const freshService = require('../../../server/services/search');
      freshService.initialize({});

      await expect(freshService.search('test query'))
        .rejects.toThrow('Search service not initialized');
    });

    describe('Brave Search', () => {
      let freshService;

      beforeEach(() => {
        freshService = require('../../../server/services/search');
        freshService.initialize({ braveApiKey: 'brave-key' });
      });

      test('should search using Brave API', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({
            web: {
              results: [
                { title: 'Result 1', url: 'https://example.com/1', description: 'Description 1' },
                { title: 'Result 2', url: 'https://example.com/2', description: 'Description 2' }
              ]
            }
          })
        });

        const results = await freshService.search('test query');

        expect(results).toHaveLength(2);
        expect(results[0]).toEqual({
          title: 'Result 1',
          url: 'https://example.com/1',
          snippet: 'Description 1',
          source: 'brave'
        });
      });

      test('should pass count option', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({ web: { results: [] } })
        });

        await freshService.search('test', { count: 10 });

        const callUrl = global.fetch.mock.calls[0][0];
        expect(callUrl).toContain('count=10');
      });

      test('should include API key in headers', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({ web: { results: [] } })
        });

        await freshService.search('test');

        const callOptions = global.fetch.mock.calls[0][1];
        expect(callOptions.headers['X-Subscription-Token']).toBe('brave-key');
      });

      test('should handle API errors', async () => {
        global.fetch.mockResolvedValue({
          ok: false,
          statusText: 'Forbidden'
        });

        await expect(freshService.search('test'))
          .rejects.toThrow('Brave search failed: Forbidden');
      });

      test('should handle empty results', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({ web: { results: [] } })
        });

        const results = await freshService.search('obscure query');

        expect(results).toEqual([]);
      });

      test('should handle missing web.results', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({})
        });

        const results = await freshService.search('test');

        expect(results).toEqual([]);
      });
    });

    describe('Tavily Search', () => {
      let freshService;

      beforeEach(() => {
        freshService = require('../../../server/services/search');
        freshService.initialize({ tavilyApiKey: 'tavily-key' });
      });

      test('should search using Tavily API', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({
            results: [
              { title: 'Result 1', url: 'https://example.com/1', content: 'Content 1' }
            ]
          })
        });

        const results = await freshService.search('test query');

        expect(results).toHaveLength(1);
        expect(results[0].source).toBe('tavily');
        expect(results[0].snippet).toBe('Content 1');
      });

      test('should include AI answer when available', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({
            answer: 'AI-generated summary of results',
            results: [
              { title: 'Result 1', url: 'https://example.com/1', content: 'Content 1' }
            ]
          })
        });

        const results = await freshService.search('test query');

        expect(results).toHaveLength(2);
        expect(results[0].title).toBe('AI Summary');
        expect(results[0].snippet).toBe('AI-generated summary of results');
        expect(results[0].source).toBe('tavily-ai');
      });

      test('should use POST method', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({ results: [] })
        });

        await freshService.search('test');

        const callOptions = global.fetch.mock.calls[0][1];
        expect(callOptions.method).toBe('POST');
      });

      test('should include API key in body', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({ results: [] })
        });

        await freshService.search('test');

        const callOptions = global.fetch.mock.calls[0][1];
        const body = JSON.parse(callOptions.body);
        expect(body.api_key).toBe('tavily-key');
      });

      test('should pass search depth option', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({ results: [] })
        });

        await freshService.search('test', { searchDepth: 'advanced' });

        const callOptions = global.fetch.mock.calls[0][1];
        const body = JSON.parse(callOptions.body);
        expect(body.search_depth).toBe('advanced');
      });
    });

    describe('Serper Search', () => {
      let freshService;

      beforeEach(() => {
        freshService = require('../../../server/services/search');
        freshService.initialize({ serperApiKey: 'serper-key' });
      });

      test('should search using Serper API', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({
            organic: [
              { title: 'Result 1', link: 'https://example.com/1', snippet: 'Snippet 1' }
            ]
          })
        });

        const results = await freshService.search('test query');

        expect(results).toHaveLength(1);
        expect(results[0].source).toBe('serper');
        expect(results[0].url).toBe('https://example.com/1');
      });

      test('should include API key in headers', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({ organic: [] })
        });

        await freshService.search('test');

        const callOptions = global.fetch.mock.calls[0][1];
        expect(callOptions.headers['X-API-KEY']).toBe('serper-key');
      });
    });

    describe('Fallback behavior', () => {
      test('should fallback from Brave to Tavily on error', async () => {
        const freshService = require('../../../server/services/search');
        freshService.initialize({
          braveApiKey: 'brave-key',
          tavilyApiKey: 'tavily-key'
        });

        // First call (Brave) fails
        global.fetch
          .mockRejectedValueOnce(new Error('Brave API down'))
          // Second call (Tavily) succeeds
          .mockResolvedValueOnce({
            ok: true,
            json: jest.fn().mockResolvedValue({
              results: [
                { title: 'Tavily Result', url: 'https://example.com', content: 'Content' }
              ]
            })
          });

        const results = await freshService.search('test');

        expect(results[0].source).toBe('tavily');
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      test('should fallback to Serper as last resort', async () => {
        const freshService = require('../../../server/services/search');
        freshService.initialize({
          tavilyApiKey: 'tavily-key',
          serperApiKey: 'serper-key'
        });

        // First call (Tavily) fails
        global.fetch
          .mockRejectedValueOnce(new Error('Tavily API down'))
          // Second call (Serper) succeeds
          .mockResolvedValueOnce({
            ok: true,
            json: jest.fn().mockResolvedValue({
              organic: [
                { title: 'Serper Result', link: 'https://example.com', snippet: 'Snippet' }
              ]
            })
          });

        const results = await freshService.search('test');

        expect(results[0].source).toBe('serper');
      });

      test('should throw error when all providers fail', async () => {
        const freshService = require('../../../server/services/search');
        freshService.initialize({ braveApiKey: 'brave-key' });

        global.fetch.mockRejectedValue(new Error('API down'));

        await expect(freshService.search('test'))
          .rejects.toThrow('API down');
      });
    });
  });

  describe('formatResultsForLLM', () => {
    let freshService;

    beforeEach(() => {
      freshService = require('../../../server/services/search');
    });

    test('should return message for empty results', () => {
      const result = freshService.formatResultsForLLM([]);
      expect(result).toBe('No search results found.');
    });

    test('should return message for null results', () => {
      const result = freshService.formatResultsForLLM(null);
      expect(result).toBe('No search results found.');
    });

    test('should format single result', () => {
      const results = [
        { title: 'Test Title', url: 'https://example.com', snippet: 'Test snippet' }
      ];

      const formatted = freshService.formatResultsForLLM(results);

      expect(formatted).toContain('[1] Test Title');
      expect(formatted).toContain('URL: https://example.com');
      expect(formatted).toContain('Test snippet');
    });

    test('should format multiple results with numbering', () => {
      const results = [
        { title: 'Title 1', url: 'https://example.com/1', snippet: 'Snippet 1' },
        { title: 'Title 2', url: 'https://example.com/2', snippet: 'Snippet 2' }
      ];

      const formatted = freshService.formatResultsForLLM(results);

      expect(formatted).toContain('[1] Title 1');
      expect(formatted).toContain('[2] Title 2');
    });

    test('should handle results without URL', () => {
      const results = [
        { title: 'AI Summary', url: null, snippet: 'Generated summary' }
      ];

      const formatted = freshService.formatResultsForLLM(results);

      expect(formatted).toContain('[1] AI Summary');
      expect(formatted).not.toContain('URL:');
      expect(formatted).toContain('Generated summary');
    });

    test('should separate results with double newlines', () => {
      const results = [
        { title: 'Title 1', url: 'https://example.com/1', snippet: 'Snippet 1' },
        { title: 'Title 2', url: 'https://example.com/2', snippet: 'Snippet 2' }
      ];

      const formatted = freshService.formatResultsForLLM(results);

      expect(formatted).toContain('\n\n');
    });
  });
});
