/**
 * Security characterization: public/protected API boundaries.
 *
 * These tests are the acceptance contract for the P0 authentication boundary.
 * Protected-route and cross-organization assertions must remain enforced.
 */

const request = require('supertest');
const { createTestApp } = require('../../setup/testApp');
const { createMockSupabase, createQueryBuilder } = require('../../setup/mockSupabase');

jest.mock('../../../server/services/anthropic', () => ({
  initialize: jest.fn().mockReturnValue(true),
  isAvailable: jest.fn().mockReturnValue(true),
  chat: jest.fn().mockResolvedValue({
    content: 'characterization response',
    model: 'claude-sonnet-4-5-20250929',
    usage: { input_tokens: 1, output_tokens: 1 }
  }),
  streamChat: jest.fn().mockImplementation(async function* () {
    yield { type: 'text', content: 'characterization response' };
    yield { type: 'done', usage: { input_tokens: 1, output_tokens: 1 } };
  })
}));

jest.mock('../../../server/services/openai', () => ({
  initialize: jest.fn().mockReturnValue(true),
  isAvailable: jest.fn().mockReturnValue(true),
  chat: jest.fn().mockResolvedValue({
    content: 'characterization response',
    model: 'gpt-4o',
    usage: { input_tokens: 1, output_tokens: 1 }
  }),
  streamChat: jest.fn().mockImplementation(async function* () {
    yield { type: 'text', content: 'characterization response' };
    yield { type: 'done', usage: { input_tokens: 1, output_tokens: 1 } };
  }),
  generateImage: jest.fn().mockResolvedValue({
    images: [{ url: 'https://example.test/image.png' }],
    model: 'gpt-image-1'
  })
}));

jest.mock('../../../server/services/perplexity', () => ({
  initialize: jest.fn().mockReturnValue(true),
  isAvailable: jest.fn().mockReturnValue(true),
  chat: jest.fn().mockResolvedValue({
    content: 'characterization response',
    model: 'sonar-pro',
    usage: { input_tokens: 1, output_tokens: 1 }
  }),
  streamChat: jest.fn().mockImplementation(async function* () {
    yield { type: 'text', content: 'characterization response' };
    yield { type: 'done', usage: { input_tokens: 1, output_tokens: 1 } };
  })
}));

jest.mock('../../../server/services/llmRegistry', () => ({
  getProvider: jest.fn().mockReturnValue('anthropic'),
  resolveModelId: jest.fn().mockImplementation((value) => ({
    valid: true,
    model: value || 'claude-sonnet-4-5-20250929'
  })),
  getAvailableModels: jest.fn().mockReturnValue({
    anthropic: [{ id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' }]
  }),
  getAllChatModels: jest.fn().mockReturnValue([
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', provider: 'anthropic' }
  ]),
  getDefaultModel: jest.fn().mockReturnValue('claude-sonnet-4-5-20250929'),
  getModelDisplayInfo: jest.fn().mockImplementation((model) => ({
    id: model,
    name: model,
    provider: 'anthropic'
  }))
}));

jest.mock('../../../server/services/search', () => ({
  search: jest.fn().mockResolvedValue([]),
  formatResultsForLLM: jest.fn().mockReturnValue('No search results')
}));

jest.mock('../../../server/services/voice', () => ({
  initialize: jest.fn(),
  isAvailable: jest.fn().mockReturnValue(true),
  speak: jest.fn().mockResolvedValue({
    audio: Buffer.from('audio'),
    voice: 'nova',
    model: 'gpt-4o-mini-tts'
  }),
  getVoices: jest.fn().mockReturnValue([]),
  getConfig: jest.fn().mockReturnValue({ enabled: true })
}));

const USER_A = 'user-a';
const ORG_A = 'org-a';
const ORG_B = 'org-b';

function createMembershipBuilder(allowedOrgId) {
  const filters = new Map();
  const builder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn((column, value) => {
      filters.set(column, value);
      return builder;
    }),
    single: jest.fn(async () => {
      const allowed = filters.get('org_id') === allowedOrgId
        && filters.get('user_id') === USER_A
        && filters.get('status') === 'active';

      return allowed
        ? { data: { role: 'member', business_role: 'ic' }, error: null }
        : { data: null, error: { code: 'PGRST116', message: 'No membership' } };
    })
  };
  return builder;
}

function createContextAssetsBuilder() {
  const asset = {
    id: 'asset-b',
    org_id: ORG_B,
    asset_type: 'company_description',
    name: 'Organization B private context',
    content_json: { private: true },
    tags: [],
    is_current: true,
    usage_count: 0,
    version: 1
  };

  const builder = createQueryBuilder({ data: [asset], error: null });
  builder.then = (resolve, reject) => Promise.resolve({
    data: [asset],
    error: null,
    count: 1
  }).then(resolve, reject);
  return builder;
}

function createTenantAwareSupabase(allowedOrgId = ORG_A) {
  const supabase = createMockSupabase();
  supabase.from.mockImplementation((table) => {
    if (table === 'organization_members') {
      return createMembershipBuilder(allowedOrgId);
    }
    if (table === 'context_assets') {
      return createContextAssetsBuilder();
    }
    if (table === 'context_asset_types') {
      const builder = createQueryBuilder();
      builder.maybeSingle.mockResolvedValue({ data: null, error: null });
      builder.single.mockResolvedValue({
        data: {
          type_key: 'attacker_type',
          display_name: 'Attacker Type',
          icon: '📄',
          category: 'custom'
        },
        error: null
      });
      return builder;
    }
    return createQueryBuilder();
  });
  return supabase;
}

describe('API authentication and organization boundaries', () => {
  beforeAll(() => {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  });

  describe('public metadata', () => {
    it('allows anonymous callers to list chat model metadata', async () => {
      const { app } = createTestApp({
        routes: ['chat'],
        anonymous: true,
        orgId: null,
        mockSupabase: createTenantAwareSupabase()
      });

      await request(app)
        .get('/api/chat/models')
        .expect(200);
    });

    it('allows anonymous callers to list all chat model metadata', async () => {
      const { app } = createTestApp({
        routes: ['chat'],
        anonymous: true,
        orgId: null,
        mockSupabase: createTenantAwareSupabase()
      });

      await request(app)
        .get('/api/chat/models/all')
        .expect(200);
    });

    it('allows anonymous callers to list context type metadata', async () => {
      const { app } = createTestApp({
        routes: ['context'],
        anonymous: true,
        orgId: null,
        mockSupabase: createTenantAwareSupabase()
      });

      await request(app)
        .get('/api/context/types')
        .expect(200);
    });

    it('allows anonymous callers to read context type metadata by key', async () => {
      const { app } = createTestApp({
        routes: ['context'],
        anonymous: true,
        orgId: null,
        mockSupabase: createTenantAwareSupabase()
      });

      await request(app)
        .get('/api/context/types/company_description')
        .expect(200);
    });
  });

  describe('anonymous callers', () => {
    it.each([
      ['primary chat', '/api/chat', { message: 'hello' }],
      ['message chat', '/api/chat/message', {
        messages: [{ role: 'user', content: 'hello' }]
      }],
      ['streaming chat', '/api/chat/stream', {
        messages: [{ role: 'user', content: 'hello' }]
      }],
      ['search chat', '/api/chat/with-search', {
        messages: [{ role: 'user', content: 'hello' }],
        searchQuery: 'hello'
      }],
      ['image generation', '/api/chat/image/generate', { prompt: 'hello' }],
      ['text to speech', '/api/chat/voice/tts', { text: 'hello' }]
    ])('rejects anonymous access to %s', async (_name, path, body) => {
      const { app } = createTestApp({
        routes: ['chat'],
        anonymous: true,
        orgId: null,
        mockSupabase: createTenantAwareSupabase()
      });

      const response = await request(app)
        .post(path)
        .send(body)
        .expect(401);

      expect(response.body).toEqual(expect.objectContaining({
        success: false,
        code: 'AUTH_REQUIRED'
      }));
    });

    it('rejects anonymous reads of organization context assets', async () => {
      const { app } = createTestApp({
        routes: ['context'],
        anonymous: true,
        orgId: null,
        mockSupabase: createTenantAwareSupabase()
      });

      await request(app)
        .get('/api/context/assets')
        .set('x-org-id', ORG_B)
        .expect(401);
    });

    it('rejects anonymous mutation of context type configuration', async () => {
      const { app } = createTestApp({
        routes: ['context'],
        anonymous: true,
        orgId: null,
        mockSupabase: createTenantAwareSupabase()
      });

      await request(app)
        .post('/api/context/types')
        .send({
          type_key: 'attacker_type',
          display_name: 'Attacker Type',
          category: 'custom'
        })
        .expect(401);
    });
  });

  describe('authenticated callers', () => {
    it('allows a member to read context assets in their verified organization', async () => {
      const { app } = createTestApp({
        routes: ['context'],
        userId: USER_A,
        orgId: null,
        mockSupabase: createTenantAwareSupabase(ORG_A)
      });

      await request(app)
        .get('/api/context/assets')
        .set('x-org-id', ORG_A)
        .expect(200);
    });

    it('rejects a claimed organization when the user is not a member', async () => {
      const { app } = createTestApp({
        routes: ['context'],
        userId: USER_A,
        orgId: null,
        mockSupabase: createTenantAwareSupabase(ORG_A)
      });

      const response = await request(app)
        .get('/api/context/assets')
        .set('x-org-id', ORG_B)
        .expect(403);

      expect(response.body).toEqual(expect.objectContaining({
        success: false,
        code: 'ORG_ACCESS_DENIED'
      }));
    });

    it('rejects a direct context asset read from an unverified organization', async () => {
      const { app } = createTestApp({
        routes: ['context'],
        userId: USER_A,
        orgId: null,
        mockSupabase: createTenantAwareSupabase(ORG_A)
      });

      await request(app)
        .get('/api/context/assets/asset-b')
        .set('x-org-id', ORG_B)
        .expect(403);
    });

    it('requires organization context for authenticated chat', async () => {
      const { app } = createTestApp({
        routes: ['chat'],
        userId: USER_A,
        orgId: null,
        mockSupabase: createTenantAwareSupabase(ORG_A)
      });

      await request(app)
        .post('/api/chat')
        .send({ message: 'hello' })
        .expect(400);
    });

    it('rejects chat under an organization the user cannot access', async () => {
      const { app } = createTestApp({
        routes: ['chat'],
        userId: USER_A,
        orgId: null,
        mockSupabase: createTenantAwareSupabase(ORG_A)
      });

      await request(app)
        .post('/api/chat')
        .set('x-org-id', ORG_B)
        .send({ message: 'use the other organization context' })
        .expect(403);
    });
  });
});
