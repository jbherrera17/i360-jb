/**
 * Integrations Route Integration Tests
 *
 * Tests provider discovery, user/org integrations,
 * subscriptions, OAuth callbacks, and data operations.
 */

const request = require('supertest');
const { createTestApp, createAuthenticatedTestApp } = require('../../setup/testApp');
const { createMockSupabase } = require('../../setup/mockSupabase');
const { testProviders, testIntegrations, testUsers } = require('../../fixtures/testData');

// Mock the integration registry
jest.mock('../../../server/services/integrations', () => {
  const actual = jest.requireActual('../../../server/services/integrations');
  return {
    ...actual,
    getAvailableProviders: jest.fn(),
    getUserIntegrations: jest.fn(),
    getOrgIntegrations: jest.fn(),
    getProvider: jest.fn(),
    hasProvider: jest.fn()
  };
});

// Mock credential manager
jest.mock('../../../server/services/integrations/credentialManager', () => ({
  encryptToken: jest.fn(t => `encrypted:${t}`),
  decryptToken: jest.fn(t => t ? t.replace('encrypted:', '') : null),
  generateOAuthState: jest.fn(() => 'mock-state-token'),
  verifyOAuthState: jest.fn(() => ({ userId: 'test-user-001', provider: 'google', ts: Date.now() })),
  getCredentials: jest.fn(),
  storeCredentials: jest.fn(),
  removeCredentials: jest.fn()
}));

const integrationRegistry = require('../../../server/services/integrations');
const credentialManager = require('../../../server/services/integrations/credentialManager');

describe('Integrations Routes', () => {
  let app;
  let mockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabase();
    const testApp = createAuthenticatedTestApp({
      routes: ['integrations'],
      mockSupabase,
      userId: testUsers.regularUser.id
    });
    app = testApp.app;
    mockSupabase = testApp.mockSupabase;
  });

  // ==========================================
  // PROVIDER DISCOVERY
  // ==========================================

  describe('GET /api/integrations/providers', () => {
    it('should return available providers', async () => {
      integrationRegistry.getAvailableProviders.mockResolvedValue([
        { ...testProviders.google, implemented: true },
        { ...testProviders.salesforce, implemented: true }
      ]);

      const response = await request(app)
        .get('/api/integrations/providers')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].slug).toBe('google');
    });
  });

  describe('GET /api/integrations/providers/:slug', () => {
    it('should return provider details', async () => {
      mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: testProviders.google,
          error: null
        })
      }));
      integrationRegistry.hasProvider.mockReturnValue(true);

      const response = await request(app)
        .get('/api/integrations/providers/google')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.slug).toBe('google');
      expect(response.body.data.implemented).toBe(true);
    });

    it('should return 404 for unknown provider', async () => {
      mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      }));

      const response = await request(app)
        .get('/api/integrations/providers/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================
  // USER INTEGRATIONS
  // ==========================================

  describe('GET /api/integrations/user', () => {
    it('should return user connected integrations', async () => {
      integrationRegistry.getUserIntegrations.mockResolvedValue([testIntegrations.googleConnected]);

      const response = await request(app)
        .get('/api/integrations/user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].external_email).toBe('user@gmail.com');
    });
  });

  describe('POST /api/integrations/user/:provider/connect', () => {
    it('should return auth URL for OAuth providers', async () => {
      const mockProvider = {
        authType: 'oauth2',
        getAuthorizationUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/authorize?client_id=xxx')
      };
      integrationRegistry.getProvider.mockReturnValue(mockProvider);

      const response = await request(app)
        .post('/api/integrations/user/google/connect')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authUrl).toContain('accounts.google.com');
    });

    it('should return 404 for unimplemented provider', async () => {
      integrationRegistry.getProvider.mockReturnValue(null);

      const response = await request(app)
        .post('/api/integrations/user/unknown/connect')
        .send({})
        .expect(404);

      expect(response.body.error).toBe('Provider not implemented');
    });

    it('should handle API key auth', async () => {
      const mockProvider = {
        authType: 'api_key',
        testConnection: jest.fn().mockResolvedValue({ success: true }),
        getProfile: jest.fn().mockResolvedValue({ id: '1', email: 'user@test.com' })
      };
      integrationRegistry.getProvider.mockReturnValue(mockProvider);

      mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'provider-1' },
          error: null
        })
      }));

      credentialManager.storeCredentials.mockResolvedValue({ id: 'int-1' });

      const response = await request(app)
        .post('/api/integrations/user/custom-crm/connect')
        .send({ apiKey: 'my-api-key', endpoint: 'https://crm.example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockProvider.testConnection).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/integrations/user/:provider', () => {
    it('should disconnect an integration', async () => {
      const mockProvider = {
        disconnect: jest.fn().mockResolvedValue(true)
      };
      integrationRegistry.getProvider.mockReturnValue(mockProvider);

      const response = await request(app)
        .delete('/api/integrations/user/google')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockProvider.disconnect).toHaveBeenCalledWith(testUsers.regularUser.id);
    });
  });

  // ==========================================
  // SUBSCRIPTIONS
  // ==========================================

  describe('GET /api/integrations/subscriptions', () => {
    it('should return org subscriptions', async () => {
      mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 'sub-1', addon_type: 'productivity', monthly_price: 99 }],
          error: null
        })
      }));

      const response = await request(app)
        .get('/api/integrations/subscriptions')
        .set('x-org-id', 'org-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should return 400 without org id', async () => {
      const response = await request(app)
        .get('/api/integrations/subscriptions')
        .expect(400);

      expect(response.body.error).toBe('Organization ID required');
    });
  });

  // ==========================================
  // DATA OPERATIONS
  // ==========================================

  describe('GET /api/integrations/:provider/data/:entity', () => {
    it('should fetch data from provider', async () => {
      const mockProvider = {
        refreshAccessToken: jest.fn(),
        fetchData: jest.fn().mockResolvedValue([{ id: '1', name: 'Contact' }])
      };
      integrationRegistry.getProvider.mockReturnValue(mockProvider);
      credentialManager.getCredentials.mockResolvedValue({
        accessToken: 'token',
        integrationId: 'int-1'
      });

      const response = await request(app)
        .get('/api/integrations/salesforce/data/contacts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockProvider.fetchData).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: 'token' }),
        'contacts',
        expect.any(Object)
      );
    });

    it('should return 401 when not connected', async () => {
      const mockProvider = { refreshAccessToken: jest.fn() };
      integrationRegistry.getProvider.mockReturnValue(mockProvider);
      credentialManager.getCredentials.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/integrations/salesforce/data/contacts')
        .expect(401);

      expect(response.body.error).toBe('Not connected to this provider');
    });
  });

  // ==========================================
  // HEALTH
  // ==========================================

  describe('GET /api/integrations/health', () => {
    it('should return health status of connected integrations', async () => {
      integrationRegistry.getUserIntegrations.mockResolvedValue([
        {
          status: 'active',
          last_sync_at: '2026-01-15T10:00:00Z',
          last_error: null,
          error_count: 0,
          token_expires_at: new Date(Date.now() + 3600000).toISOString(),
          integration_providers: { slug: 'google', name: 'Google Workspace' }
        }
      ]);

      const response = await request(app)
        .get('/api/integrations/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].provider).toBe('google');
      expect(response.body.data[0].status).toBe('active');
    });
  });

  // ==========================================
  // USAGE
  // ==========================================

  describe('POST /api/integrations/usage/increment', () => {
    it('should increment API call count', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'integration_providers') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'provider-1' },
              error: null
            })
          };
        }
        if (table === 'integration_subscriptions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'sub-1', api_calls_this_month: 5, api_call_limit: 10000 },
              error: null
            }),
            update: jest.fn().mockReturnThis()
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .post('/api/integrations/usage/increment')
        .send({ orgId: 'org-001', providerSlug: 'google' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 429 when limit reached', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'integration_providers') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'provider-1' },
              error: null
            })
          };
        }
        if (table === 'integration_subscriptions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'sub-1', api_calls_this_month: 10000, api_call_limit: 10000 },
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .post('/api/integrations/usage/increment')
        .send({ orgId: 'org-001', providerSlug: 'google' })
        .expect(429);

      expect(response.body.error).toBe('API call limit reached');
    });
  });
});
