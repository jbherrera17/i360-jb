/**
 * Base Provider Unit Tests
 *
 * Tests abstract method contracts, disconnect behavior,
 * capability declarations, and sync logging.
 */

// Mock logger
jest.mock('../../../server/services/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const BaseIntegrationProvider = require('../../../server/services/integrations/baseProvider');
const { createMockSupabase } = require('../../setup/mockSupabase');

describe('BaseIntegrationProvider', () => {
  let provider;

  beforeEach(() => {
    provider = new BaseIntegrationProvider({
      slug: 'test-provider',
      name: 'Test Provider',
      authType: 'oauth2',
      supabase: createMockSupabase()
    });
  });

  describe('constructor', () => {
    it('should set slug, name, and authType', () => {
      expect(provider.slug).toBe('test-provider');
      expect(provider.name).toBe('Test Provider');
      expect(provider.authType).toBe('oauth2');
    });

    it('should default authType to oauth2 when not provided', () => {
      const p = new BaseIntegrationProvider({ slug: 'x', name: 'X' });
      expect(p.authType).toBe('oauth2');
    });
  });

  describe('abstract methods', () => {
    it('should throw on getAuthorizationUrl', () => {
      expect(() => provider.getAuthorizationUrl('user', [], 'uri')).toThrow('not implemented');
    });

    it('should throw on exchangeCodeForTokens', async () => {
      await expect(provider.exchangeCodeForTokens('code', 'uri')).rejects.toThrow('not implemented');
    });

    it('should throw on refreshAccessToken', async () => {
      await expect(provider.refreshAccessToken('token')).rejects.toThrow('not implemented');
    });

    it('should throw on testConnection', async () => {
      await expect(provider.testConnection({})).rejects.toThrow('not implemented');
    });

    it('should throw on getProfile', async () => {
      await expect(provider.getProfile({})).rejects.toThrow('not implemented');
    });

    it('should throw on fetchData', async () => {
      await expect(provider.fetchData({}, 'contacts')).rejects.toThrow('not implemented');
    });

    it('should throw on pushData', async () => {
      await expect(provider.pushData({}, 'contacts', {})).rejects.toThrow('not implemented');
    });

    it('should throw on processWebhook', async () => {
      await expect(provider.processWebhook({})).rejects.toThrow('not implemented');
    });
  });

  describe('disconnect', () => {
    it('should call removeCredentials via credentialManager', async () => {
      // Mock credentialManager
      jest.mock('../../../server/services/integrations/credentialManager', () => ({
        removeCredentials: jest.fn().mockResolvedValue(true)
      }));

      const result = await provider.disconnect('user-123');
      expect(result).toBe(true);
    });
  });

  describe('validateWebhook', () => {
    it('should return true by default', () => {
      expect(provider.validateWebhook({})).toBe(true);
    });
  });

  describe('getCapabilities', () => {
    it('should return empty capability arrays', () => {
      const caps = provider.getCapabilities();
      expect(caps.entities).toEqual([]);
      expect(caps.operations).toEqual([]);
      expect(caps.features).toEqual([]);
    });
  });

  describe('logSync', () => {
    it('should insert a sync log record', async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      await provider.logSync(mockSupabase, {
        integrationId: 'int-1',
        syncType: 'full',
        direction: 'inbound',
        entityType: 'contacts',
        status: 'completed',
        results: { processed: 10, created: 5, updated: 3, failed: 2 },
        userId: 'user-1',
        orgId: 'org-1'
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('integration_sync_log');
    });

    it('should not throw on logging error', async () => {
      const mockSupabase = createMockSupabase();
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockRejectedValue(new Error('DB error'))
      });

      // Should not throw
      await expect(
        provider.logSync(mockSupabase, {
          syncType: 'full',
          direction: 'inbound',
          status: 'completed',
          results: {}
        })
      ).resolves.toBeUndefined();
    });
  });
});
