/**
 * Agent Streaming Endpoint Integration Tests - Extension Source
 *
 * Tests POST /api/agents/:id/execute/stream as called by the extension's
 * api.js streamAgentChat() method.
 *
 * Key extension-specific concerns:
 *   - Bearer token auth (no cookie)
 *   - X-Extension-Version header is present
 *   - source: 'extension' field in request body
 *   - SSE response format (Content-Type: text/event-stream)
 *   - Streaming token events and [DONE] terminator
 */

const request = require('supertest');
const { createTestApp, createAuthenticatedTestApp } = require('../../setup/testApp');
const { createMockSupabase } = require('../../setup/mockSupabase');

// ---------------------------------------------------------------------------
// Service mocks
// ---------------------------------------------------------------------------

jest.mock('../../../server/services/contextInjection', () => ({
  assembleContext: jest.fn().mockResolvedValue({
    systemPrompt: 'You are a helpful assistant.',
    contextBlocks: [],
    totalTokens: 50,
  }),
  estimateTokens: jest.fn().mockReturnValue(20),
}));

jest.mock('../../../server/services/agentService', () => ({
  executeAgent: jest.fn().mockResolvedValue({
    response: 'Here is my answer.',
    model: 'claude-sonnet-4-5',
    usage: { input_tokens: 50, output_tokens: 30 },
  }),

  // streamAgent signature (as called by the route):
  //   streamAgent(agentId, { userMessage, conversationHistory, userId,
  //                          modelOverride, onToken, onComplete, onError })
  streamAgent: jest.fn().mockImplementation(
    async (agentId, options = {}) => {
      const { onToken, onComplete, onError } = options;
      const tokens = ['Hello', ' from', ' the', ' agent', '.'];
      let full = '';
      for (const t of tokens) {
        full += t;
        if (onToken) onToken(t);
      }
      if (onComplete) onComplete({ content: full, usage: { input_tokens: 40, output_tokens: 20 } });
      return full;
    }
  ),
}));

jest.mock('../../../server/services/mindstudioService', () => ({
  generateSignedEmbedUrl: jest.fn().mockResolvedValue({ url: 'https://mindstudio.ai/embed/test' }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AGENT_ID = 'aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa';

const mockAgent = {
  id: AGENT_ID,
  name: 'Test Agent',
  description: 'Integration test agent',
  model: 'claude-sonnet-4-5',
  system_prompt: 'You are a test assistant.',
  is_active: true,
  org_id: 'org-001',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build an app with a mock Supabase that returns the given agent on lookup.
 */
function buildApp(agentOverride = mockAgent, authOpts = {}) {
  const mockSupabase = createMockSupabase();

  mockSupabase.from.mockImplementation((table) => {
    if (table === 'agents') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: agentOverride,
          error: null,
        }),
        range: jest.fn().mockResolvedValue({
          data: [agentOverride],
          error: null,
          count: 1,
        }),
      };
    }
    if (table === 'agent_context_mappings') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    }
    if (table === 'soul_configurations') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    }
    // Default fallback — delegate to mockSupabase defaults so that
    // organization_members (and other ownership-checked tables) return
    // the permissive defaults needed by Phase 82 middleware.
    return createMockSupabase().from(table);
  });

  const testApp = createAuthenticatedTestApp({
    routes: ['agents'],
    mockSupabase,
    ...authOpts,
  });

  return { app: testApp.app, mockSupabase };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/agents/:id/execute/stream - Extension Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- Request structure -------------------------------------------------

  describe('Request acceptance', () => {
    it('accepts a request with Bearer token and X-Extension-Version header', async () => {
      const { app } = buildApp();

      const res = await request(app)
        .post(`/api/agents/${AGENT_ID}/execute/stream`)
        .set('Authorization', 'Bearer mock-token-abc')
        .set('X-Extension-Version', '1.0.0')
        .set('Accept', 'text/event-stream')
        .send({
          message: 'What is 2+2?',
          conversationHistory: [],
          source: 'extension',
        });

      // Accept 200 (streaming started) or the route-specific code
      expect([200, 201]).toContain(res.status);
    });

    it('accepts a request without a cookie (Bearer-only auth)', async () => {
      const { app } = buildApp();

      const res = await request(app)
        .post(`/api/agents/${AGENT_ID}/execute/stream`)
        .set('Authorization', 'Bearer mock-token-abc')
        .send({
          message: 'Test message',
          conversationHistory: [],
          source: 'extension',
        });

      // Must not redirect to login (HTML pages redirect, API routes should respond with JSON or SSE)
      expect(res.status).not.toBe(302);
      expect(res.headers['location']).toBeUndefined();
    });

    it('includes conversationHistory in the body without error', async () => {
      const { app } = buildApp();

      const history = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];

      const res = await request(app)
        .post(`/api/agents/${AGENT_ID}/execute/stream`)
        .set('Authorization', 'Bearer mock-token-abc')
        .set('X-Extension-Version', '1.0.0')
        .send({
          message: 'Continue our conversation.',
          conversationHistory: history,
          source: 'extension',
        });

      expect([200, 201]).toContain(res.status);
    });
  });

  // ---- SSE Response format -----------------------------------------------

  describe('SSE response format', () => {
    it('returns text/event-stream content type', async () => {
      const { app } = buildApp();

      const res = await request(app)
        .post(`/api/agents/${AGENT_ID}/execute/stream`)
        .set('Authorization', 'Bearer mock-token-abc')
        .set('X-Extension-Version', '1.0.0')
        .set('Accept', 'text/event-stream')
        .send({
          message: 'Tell me something.',
          conversationHistory: [],
          source: 'extension',
        });

      // Check that the response is SSE
      expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    });

    it('response body contains data: lines', async () => {
      const { app } = buildApp();

      const res = await request(app)
        .post(`/api/agents/${AGENT_ID}/execute/stream`)
        .set('Authorization', 'Bearer mock-token-abc')
        .set('X-Extension-Version', '1.0.0')
        .set('Accept', 'text/event-stream')
        .send({
          message: 'Say hello.',
          conversationHistory: [],
          source: 'extension',
        });

      const body = res.text || '';
      // SSE frames start with "data: "
      expect(body).toMatch(/data:/);
    });

    it('response body contains a [DONE] terminator or complete event', async () => {
      const { app } = buildApp();

      const res = await request(app)
        .post(`/api/agents/${AGENT_ID}/execute/stream`)
        .set('Authorization', 'Bearer mock-token-abc')
        .set('X-Extension-Version', '1.0.0')
        .set('Accept', 'text/event-stream')
        .send({
          message: 'Finish this sentence.',
          conversationHistory: [],
          source: 'extension',
        });

      const body = res.text || '';
      // Should contain either [DONE] or a "complete" event type
      const hasDone = body.includes('[DONE]');
      const hasComplete = body.includes('"complete"') || body.includes('"type":"complete"');
      expect(hasDone || hasComplete).toBe(true);
    });

    it('SSE events are parseable JSON', async () => {
      const { app } = buildApp();

      const res = await request(app)
        .post(`/api/agents/${AGENT_ID}/execute/stream`)
        .set('Authorization', 'Bearer mock-token-abc')
        .set('X-Extension-Version', '1.0.0')
        .set('Accept', 'text/event-stream')
        .send({
          message: 'Hello.',
          conversationHistory: [],
          source: 'extension',
        });

      const body = res.text || '';
      const lines = body.split('\n').filter((l) => l.startsWith('data: '));

      let parsedCount = 0;
      for (const line of lines) {
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          JSON.parse(payload);
          parsedCount++;
        } catch (e) {
          // Allow non-JSON SSE data lines, but if they exist they shouldn't throw
        }
      }

      // At least some lines should be valid JSON
      expect(parsedCount).toBeGreaterThan(0);
    });
  });

  // ---- Error handling ----------------------------------------------------

  describe('Error handling', () => {
    it('agentService throws — route writes error event to SSE stream', async () => {
      // The stream route delegates to agentService completely.
      // When agentService throws (e.g. agent not found), the route catches
      // the error and writes an error SSE event before ending the stream.
      const { streamAgent } = require('../../../server/services/agentService');
      streamAgent.mockImplementationOnce(async (agentId, opts) => {
        // Simulate agentService throwing (agent not found, DB error, etc.)
        throw new Error('Agent not found: ' + agentId);
      });

      const { app } = buildApp();

      const res = await request(app)
        .post(`/api/agents/${AGENT_ID}/execute/stream`)
        .set('Authorization', 'Bearer mock-token-abc')
        .set('X-Extension-Version', '1.0.0')
        .send({
          message: 'Hello.',
          conversationHistory: [],
          source: 'extension',
        });

      // Route catches and writes: data: {"type":"error","error":"..."}
      const body = res.text || '';
      expect(body).toMatch(/"type":"error"/);
    });

    it('returns 400 when message is missing', async () => {
      const { app } = buildApp();

      const res = await request(app)
        .post(`/api/agents/${AGENT_ID}/execute/stream`)
        .set('Authorization', 'Bearer mock-token-abc')
        .set('X-Extension-Version', '1.0.0')
        .send({
          // message deliberately omitted
          conversationHistory: [],
          source: 'extension',
        });

      expect([400, 422]).toContain(res.status);
    });

    it('agentService signals inactive agent via onError callback', async () => {
      // The agentService calls onError when the agent is inactive.
      // The route converts this to an error SSE event.
      const { streamAgent } = require('../../../server/services/agentService');
      streamAgent.mockImplementationOnce(async (agentId, opts) => {
        if (opts.onError) {
          opts.onError(new Error('Agent is inactive'));
        }
      });

      const { app } = buildApp();

      const res = await request(app)
        .post(`/api/agents/${AGENT_ID}/execute/stream`)
        .set('Authorization', 'Bearer mock-token-abc')
        .set('X-Extension-Version', '1.0.0')
        .send({
          message: 'Are you available?',
          conversationHistory: [],
          source: 'extension',
        });

      const body = res.text || '';
      // Should contain an error event in the SSE stream
      expect(body).toMatch(/"type":"error"/);
    });
  });

  // ---- X-Extension-Version header handling ------------------------------

  describe('Extension metadata headers', () => {
    it('does not reject a request that includes X-Extension-Version', async () => {
      const { app } = buildApp();

      const res = await request(app)
        .post(`/api/agents/${AGENT_ID}/execute/stream`)
        .set('Authorization', 'Bearer mock-token-abc')
        .set('X-Extension-Version', '1.0.0')
        .set('X-Org-Id', 'org-001')
        .send({
          message: 'Test.',
          conversationHistory: [],
          source: 'extension',
        });

      expect([200, 201]).toContain(res.status);
    });

    it('works without X-Org-Id header (org resolves from token)', async () => {
      const { app } = buildApp();

      const res = await request(app)
        .post(`/api/agents/${AGENT_ID}/execute/stream`)
        .set('Authorization', 'Bearer mock-token-abc')
        .set('X-Extension-Version', '1.0.0')
        // No X-Org-Id
        .send({
          message: 'Test.',
          conversationHistory: [],
          source: 'extension',
        });

      expect([200, 201]).toContain(res.status);
    });
  });
});
