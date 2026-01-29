/**
 * Integration Registry Unit Tests
 *
 * Tests provider registration, factory instantiation,
 * and database queries for available/user/org integrations.
 */

// Mock logger to prevent output
jest.mock('../../../server/services/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const { createMockSupabase } = require('../../setup/mockSupabase');

describe('Integration Registry', () => {
  let registry;

  beforeEach(() => {
    // Fresh module for each test to reset registry state
    jest.resetModules();
    jest.mock('../../../server/services/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }));
    registry = require('../../../server/services/integrations');
  });

  describe('registerProvider / getProvider', () => {
    it('should register and retrieve a provider', () => {
      class TestProvider {
        constructor(config) { this.slug = 'test'; this.supabase = config.supabase; }
      }

      registry.registerProvider('test', TestProvider);
      expect(registry.hasProvider('test')).toBe(true);

      const mockSupabase = createMockSupabase();
      const provider = registry.getProvider('test', mockSupabase);
      expect(provider).toBeInstanceOf(TestProvider);
      expect(provider.supabase).toBe(mockSupabase);
    });

    it('should return null for unregistered provider', () => {
      expect(registry.getProvider('nonexistent', {})).toBeNull();
    });

    it('should list registered providers', () => {
      class P1 { constructor() {} }
      class P2 { constructor() {} }

      registry.registerProvider('p1', P1);
      registry.registerProvider('p2', P2);

      const list = registry.listProviders();
      expect(list).toContain('p1');
      expect(list).toContain('p2');
    });
  });

  describe('getAvailableProviders', () => {
    it('should fetch providers from database and mark implemented ones', async () => {
      class MockProvider { constructor() {} }
      registry.registerProvider('google', MockProvider);

      const mockSupabase = createMockSupabase();
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            { slug: 'google', name: 'Google', status: 'active' },
            { slug: 'slack', name: 'Slack', status: 'beta' }
          ],
          error: null
        })
      }));

      const providers = await registry.getAvailableProviders(mockSupabase);
      expect(providers).toHaveLength(2);
      expect(providers[0].implemented).toBe(true);  // google is registered
      expect(providers[1].implemented).toBe(false);  // slack is not
    });

    it('should return empty array on database error', async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Connection failed' }
        })
      }));

      const providers = await registry.getAvailableProviders(mockSupabase);
      expect(providers).toEqual([]);
    });
  });

  describe('getUserIntegrations', () => {
    it('should fetch user integrations with provider details', async () => {
      const mockSupabase = createMockSupabase();
      const mockIntegrations = [
        { id: 'int-1', user_id: 'user-1', status: 'active', integration_providers: { slug: 'google', name: 'Google' } }
      ];

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: mockIntegrations,
          error: null
        })
      }));

      const result = await registry.getUserIntegrations(mockSupabase, 'user-1');
      expect(result).toHaveLength(1);
      expect(result[0].integration_providers.slug).toBe('google');
    });
  });

  describe('getOrgIntegrations', () => {
    it('should fetch org integrations', async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 'org-int-1', org_id: 'org-1' }],
          error: null
        })
      }));

      const result = await registry.getOrgIntegrations(mockSupabase, 'org-1');
      expect(result).toHaveLength(1);
    });
  });
});
