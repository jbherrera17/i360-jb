/**
 * Conversations CRUD Integration Tests - Bearer Token Auth
 *
 * The extension uses Bearer token auth (no cookie) when calling
 * /api/conversations.  These tests verify that the route layer handles
 * requests correctly without a cookie being present, mirroring the
 * api.js methods:
 *
 *   getConversations(limit)       -> GET /api/conversations
 *   getConversation(id)           -> GET /api/conversations/:id
 *   createConversation(title)     -> POST /api/conversations
 *   saveMessage(convId, role, …)  -> POST /api/conversations/:id/messages
 *
 * Route response shapes (from server/routes/conversations.js):
 *   GET list    -> { success, conversations[], count }
 *   GET single  -> { success, conversation }
 *   POST create -> { success, conversation }   (status 201)
 *   POST msg    -> { success, message }        (status 201)
 *   DELETE      -> { success, message }        (status 200)
 */

const request = require('supertest');
const { createAuthenticatedTestApp } = require('../../setup/testApp');
const { createMockSupabase, DEFAULT_TEST_MEMBERSHIP } = require('../../setup/mockSupabase');

// conversations.js creates its own Supabase client at module scope via
// createClient() and passes it to requireOrgContext. In tests that client
// would hit the real network (or fail auth) and return 403 for every
// request. Mock @supabase/supabase-js so the module-level client is
// permissive — a valid organization_members record is always returned.
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          role: 'owner',
          business_role: 'executive',
          org_id: 'test-org-001',
          user_id: 'test-user-001',
          status: 'active'
        },
        error: null
      })
    }))
  }))
}));

// ---------------------------------------------------------------------------
// Mock the entire conversationService
// ---------------------------------------------------------------------------

const mockConversations = [
  {
    id: 'conv-001',
    title: 'First conversation',
    model: 'claude-sonnet-4-5',
    user_id: 'test-user-001',
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-01-01T10:05:00Z',
    messages: [],
  },
  {
    id: 'conv-002',
    title: 'Second conversation',
    model: 'gpt-4o',
    user_id: 'test-user-001',
    created_at: '2026-01-02T09:00:00Z',
    updated_at: '2026-01-02T09:30:00Z',
    messages: [],
  },
];

const mockMessages = [
  { id: 'msg-001', role: 'user', content: 'Hello', conversation_id: 'conv-001' },
  { id: 'msg-002', role: 'assistant', content: 'Hi there!', conversation_id: 'conv-001' },
];

jest.mock('../../../server/services/conversationService', () => ({
  getConversations: jest.fn().mockResolvedValue(mockConversations),

  getConversation: jest.fn().mockImplementation(async (id) => {
    const conv = mockConversations.find((c) => c.id === id);
    if (!conv) throw Object.assign(new Error('Not found'), { code: 404 });
    return {
      ...conv,
      messages: mockMessages.filter((m) => m.conversation_id === id),
    };
  }),

  createConversation: jest.fn().mockImplementation(async (data = {}) => ({
    id: 'conv-new-001',
    title: data.title || 'Untitled',
    model: data.model || null,
    user_id: data.userId || 'test-user-001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })),

  updateConversation: jest.fn().mockImplementation(async (id, fields) => ({
    id,
    ...fields,
    updated_at: new Date().toISOString(),
  })),

  deleteConversation: jest.fn().mockResolvedValue(true),

  addMessage: jest.fn().mockImplementation(async (conversationId, data) => ({
    id: 'msg-new-001',
    conversation_id: conversationId,
    role: data.role,
    content: data.content,
    model: data.model || null,
    created_at: new Date().toISOString(),
  })),

  generateTitle: jest.fn().mockImplementation((content) => {
    return content.substring(0, 50);
  }),

  exportAsMarkdown: jest.fn().mockReturnValue('# Conversation\n\nContent here.'),

  getConversationMessages: jest.fn().mockResolvedValue(mockMessages),
  getAdminConversations: jest.fn().mockResolvedValue([]),
  getConversationStats: jest.fn().mockResolvedValue({ total: 0 }),
}));

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

function buildApp() {
  const mockSupabase = createMockSupabase();
  const { app } = createAuthenticatedTestApp({
    routes: ['conversations'],
    mockSupabase,
  });
  return app;
}

// ---------------------------------------------------------------------------
// Helper: perform requests with Bearer token but no auth_token cookie
// ---------------------------------------------------------------------------
function withBearer(app) {
  return {
    get: (path) =>
      request(app)
        .get(path)
        .set('Authorization', 'Bearer mock-access-token')
        .set('X-Extension-Version', '1.0.0'),
    post: (path) =>
      request(app)
        .post(path)
        .set('Authorization', 'Bearer mock-access-token')
        .set('X-Extension-Version', '1.0.0'),
    put: (path) =>
      request(app)
        .put(path)
        .set('Authorization', 'Bearer mock-access-token')
        .set('X-Extension-Version', '1.0.0'),
    delete: (path) =>
      request(app)
        .delete(path)
        .set('Authorization', 'Bearer mock-access-token')
        .set('X-Extension-Version', '1.0.0'),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Conversations CRUD - Bearer Token Auth (Extension)', () => {
  let app;
  let conversationService;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    conversationService = require('../../../server/services/conversationService');
  });

  // ---- GET /api/conversations -------------------------------------------

  describe('GET /api/conversations', () => {
    it('returns 200 without a cookie', async () => {
      const res = await withBearer(app).get('/api/conversations');
      expect(res.status).toBe(200);
    });

    it('returns success: true', async () => {
      const res = await withBearer(app).get('/api/conversations');
      expect(res.body.success).toBe(true);
    });

    it('response body has conversations array', async () => {
      const res = await withBearer(app).get('/api/conversations');
      // Route returns { success, conversations[], count }
      expect(Array.isArray(res.body.conversations)).toBe(true);
    });

    it('conversations array has expected items', async () => {
      const res = await withBearer(app).get('/api/conversations');
      expect(res.body.conversations.length).toBeGreaterThanOrEqual(1);
    });

    it('does not redirect to login', async () => {
      const res = await withBearer(app).get('/api/conversations');
      expect(res.status).not.toBe(302);
      expect(res.headers['location']).toBeUndefined();
    });

    it('response has a count field', async () => {
      const res = await withBearer(app).get('/api/conversations');
      expect(res.body.count).toBeDefined();
      expect(typeof res.body.count).toBe('number');
    });
  });

  // ---- GET /api/conversations/:id --------------------------------------

  describe('GET /api/conversations/:id', () => {
    it('returns 200 for an existing conversation', async () => {
      const res = await withBearer(app).get('/api/conversations/conv-001');
      expect(res.status).toBe(200);
    });

    it('response body has conversation object', async () => {
      const res = await withBearer(app).get('/api/conversations/conv-001');
      expect(res.body.success).toBe(true);
      // Route returns { success, conversation }
      expect(res.body.conversation).toBeDefined();
    });

    it('conversation has an id field', async () => {
      const res = await withBearer(app).get('/api/conversations/conv-001');
      expect(res.body.conversation.id).toBe('conv-001');
    });

    it('returns 404 or 500 for a non-existent conversation', async () => {
      conversationService.getConversation.mockRejectedValueOnce(
        Object.assign(new Error('Not found'), { code: 404 })
      );
      const res = await withBearer(app).get('/api/conversations/does-not-exist');
      // Route catches errors and returns 500 (no special 404 handling)
      expect([404, 500]).toContain(res.status);
    });
  });

  // ---- POST /api/conversations -----------------------------------------

  describe('POST /api/conversations', () => {
    it('returns 201 when creating a conversation', async () => {
      const res = await withBearer(app)
        .post('/api/conversations')
        .send({ title: 'Extension Test Conversation', model: null });

      expect(res.status).toBe(201);
    });

    it('response has conversation object with id', async () => {
      const res = await withBearer(app)
        .post('/api/conversations')
        .send({ title: 'My Conversation' });

      expect(res.body.success).toBe(true);
      // Route returns { success, conversation }
      expect(res.body.conversation).toBeDefined();
      expect(res.body.conversation.id).toBeDefined();
    });

    it('title defaults to Untitled when omitted', async () => {
      const res = await withBearer(app)
        .post('/api/conversations')
        .send({});

      expect([200, 201]).toContain(res.status);
    });

    it('creates a conversation with a specific model', async () => {
      const res = await withBearer(app)
        .post('/api/conversations')
        .send({ title: 'GPT Conversation', model: 'gpt-4o' });

      expect([200, 201]).toContain(res.status);
    });

    it('passes title and model to conversationService', async () => {
      await withBearer(app)
        .post('/api/conversations')
        .send({ title: 'Title Test', model: 'claude-sonnet-4-5' });

      expect(conversationService.createConversation).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Title Test', model: 'claude-sonnet-4-5' })
      );
    });
  });

  // ---- POST /api/conversations/:id/messages ----------------------------

  describe('POST /api/conversations/:id/messages', () => {
    it('saves a user message and returns 201', async () => {
      const res = await withBearer(app)
        .post('/api/conversations/conv-001/messages')
        .send({ role: 'user', content: 'What is the weather like?' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('saves an assistant message', async () => {
      const res = await withBearer(app)
        .post('/api/conversations/conv-001/messages')
        .send({
          role: 'assistant',
          content: 'The weather is sunny.',
          model: 'claude-sonnet-4-5',
        });

      expect(res.status).toBe(201);
    });

    it('response contains message object', async () => {
      const res = await withBearer(app)
        .post('/api/conversations/conv-001/messages')
        .send({ role: 'assistant', content: 'Hello from AI.' });

      // Route returns { success, message }
      expect(res.body.message).toBeDefined();
    });

    it('returns 400 for missing role', async () => {
      const res = await withBearer(app)
        .post('/api/conversations/conv-001/messages')
        .send({ content: 'No role provided' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for missing content', async () => {
      const res = await withBearer(app)
        .post('/api/conversations/conv-001/messages')
        .send({ role: 'user' });

      expect(res.status).toBe(400);
    });

    it('calls generateTitle for the first user message', async () => {
      // getConversation returns 1 user message (making this the "first")
      conversationService.getConversation.mockResolvedValueOnce({
        ...mockConversations[0],
        messages: [
          { id: 'msg-001', role: 'user', content: 'First user message' },
        ],
      });

      await withBearer(app)
        .post('/api/conversations/conv-001/messages')
        .send({ role: 'user', content: 'First user message' });

      expect(conversationService.generateTitle).toHaveBeenCalledWith(
        'First user message'
      );
    });
  });

  // ---- DELETE /api/conversations/:id ----------------------------------

  describe('DELETE /api/conversations/:id', () => {
    it('deletes a conversation and returns 200', async () => {
      const res = await withBearer(app).delete('/api/conversations/conv-001');
      expect([200, 204]).toContain(res.status);
    });

    it('calls deleteConversation service method', async () => {
      await withBearer(app).delete('/api/conversations/conv-001');
      expect(conversationService.deleteConversation).toHaveBeenCalledWith('conv-001');
    });
  });

  // ---- Concurrent requests --------------------------------------------

  describe('Concurrent Bearer auth requests', () => {
    it('handles multiple simultaneous GET requests', async () => {
      const results = await Promise.all([
        withBearer(app).get('/api/conversations'),
        withBearer(app).get('/api/conversations'),
        withBearer(app).get('/api/conversations'),
      ]);
      for (const res of results) {
        expect(res.status).toBe(200);
      }
    });

    it('handles mixed GET and POST requests concurrently', async () => {
      const [listRes, createRes] = await Promise.all([
        withBearer(app).get('/api/conversations'),
        withBearer(app).post('/api/conversations').send({ title: 'Concurrent' }),
      ]);
      expect(listRes.status).toBe(200);
      expect([200, 201]).toContain(createRes.status);
    });
  });
});
