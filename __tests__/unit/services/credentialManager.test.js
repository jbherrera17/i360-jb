/**
 * Credential Manager Unit Tests
 *
 * Tests encryption/decryption, OAuth state management,
 * credential storage, and token refresh logic.
 */

// Set encryption key before requiring the module
process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes hex

const credentialManager = require('../../../server/services/integrations/credentialManager');

describe('CredentialManager', () => {

  describe('encryptToken / decryptToken', () => {
    it('should encrypt and decrypt a token roundtrip', () => {
      const token = 'ya29.test-access-token-12345';
      const encrypted = credentialManager.encryptToken(token);

      expect(encrypted).not.toBe(token);
      expect(encrypted).toContain(':'); // iv:authTag:cipher format

      const decrypted = credentialManager.decryptToken(encrypted);
      expect(decrypted).toBe(token);
    });

    it('should return null for null input', () => {
      expect(credentialManager.encryptToken(null)).toBeNull();
      expect(credentialManager.decryptToken(null)).toBeNull();
    });

    it('should return null for empty string input', () => {
      expect(credentialManager.encryptToken('')).toBeNull();
      expect(credentialManager.decryptToken('')).toBeNull();
    });

    it('should produce different ciphertexts for same plaintext (random IV)', () => {
      const token = 'same-token';
      const enc1 = credentialManager.encryptToken(token);
      const enc2 = credentialManager.encryptToken(token);

      expect(enc1).not.toBe(enc2);
      expect(credentialManager.decryptToken(enc1)).toBe(token);
      expect(credentialManager.decryptToken(enc2)).toBe(token);
    });

    it('should return null for corrupted ciphertext', () => {
      const result = credentialManager.decryptToken('invalid:data:here');
      expect(result).toBeNull();
    });

    it('should handle special characters in tokens', () => {
      const token = 'token/with+special=chars&more?yes#hash';
      const encrypted = credentialManager.encryptToken(token);
      const decrypted = credentialManager.decryptToken(encrypted);
      expect(decrypted).toBe(token);
    });

    it('should handle long tokens', () => {
      const token = 'x'.repeat(4096);
      const encrypted = credentialManager.encryptToken(token);
      const decrypted = credentialManager.decryptToken(encrypted);
      expect(decrypted).toBe(token);
    });
  });

  describe('generateOAuthState / verifyOAuthState', () => {
    it('should generate and verify a valid state', () => {
      const state = credentialManager.generateOAuthState('user-123', 'google');

      expect(state).toBeTruthy();
      expect(state).toContain('.');

      const data = credentialManager.verifyOAuthState(state);
      expect(data).not.toBeNull();
      expect(data.userId).toBe('user-123');
      expect(data.provider).toBe('google');
      expect(data.nonce).toBeTruthy();
      expect(data.ts).toBeGreaterThan(0);
    });

    it('should reject tampered state', () => {
      const state = credentialManager.generateOAuthState('user-123', 'google');
      const tampered = state.slice(0, -4) + 'xxxx';

      const result = credentialManager.verifyOAuthState(tampered);
      expect(result).toBeNull();
    });

    it('should reject expired state (older than 15 minutes)', () => {
      // Generate state, then manually create one with old timestamp
      const payload = JSON.stringify({
        userId: 'user-123',
        provider: 'google',
        nonce: 'abc123',
        ts: Date.now() - 16 * 60 * 1000 // 16 minutes ago
      });

      const crypto = require('crypto');
      const key = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'hex');
      const hmac = crypto.createHmac('sha256', key).update(payload).digest('hex');
      const encoded = Buffer.from(payload).toString('base64url');
      const oldState = `${encoded}.${hmac}`;

      const result = credentialManager.verifyOAuthState(oldState);
      expect(result).toBeNull();
    });

    it('should reject invalid format', () => {
      expect(credentialManager.verifyOAuthState('not-valid')).toBeNull();
      expect(credentialManager.verifyOAuthState('')).toBeNull();
      expect(credentialManager.verifyOAuthState(null)).toBeNull();
    });
  });

  describe('getCredentials', () => {
    let mockSupabase;

    beforeEach(() => {
      mockSupabase = {
        from: jest.fn()
      };
    });

    it('should return null when no integration found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
      });

      const result = await credentialManager.getCredentials(mockSupabase, 'user-123', 'google', null);
      expect(result).toBeNull();
    });

    it('should return decrypted credentials when token is valid', async () => {
      const accessToken = 'valid-access-token';
      const refreshToken = 'valid-refresh-token';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'integration-1',
            access_token_encrypted: credentialManager.encryptToken(accessToken),
            refresh_token_encrypted: credentialManager.encryptToken(refreshToken),
            api_key_encrypted: null,
            token_expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            status: 'active',
            settings: { some: 'setting' },
            error_count: 0
          },
          error: null
        })
      });

      const result = await credentialManager.getCredentials(mockSupabase, 'user-123', 'google', null);
      expect(result).not.toBeNull();
      expect(result.accessToken).toBe(accessToken);
      expect(result.refreshToken).toBe(refreshToken);
      expect(result.integrationId).toBe('integration-1');
      expect(result.settings).toEqual({ some: 'setting' });
    });
  });

  describe('storeCredentials', () => {
    let mockSupabase;

    beforeEach(() => {
      mockSupabase = {
        from: jest.fn().mockReturnValue({
          upsert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'new-integration-1' },
            error: null
          })
        })
      };
    });

    it('should store encrypted credentials', async () => {
      const result = await credentialManager.storeCredentials(mockSupabase, {
        userId: 'user-123',
        providerId: 'provider-1',
        orgId: 'org-1',
        tokens: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          scopes: ['email', 'profile']
        },
        profile: {
          id: 'ext-user-1',
          email: 'user@gmail.com'
        }
      });

      expect(result).toEqual({ id: 'new-integration-1' });
      expect(mockSupabase.from).toHaveBeenCalledWith('user_integrations');

      const upsertCall = mockSupabase.from().upsert.mock.calls[0];
      const record = upsertCall[0];
      expect(record.user_id).toBe('user-123');
      expect(record.provider_id).toBe('provider-1');
      expect(record.org_id).toBe('org-1');
      expect(record.external_email).toBe('user@gmail.com');
      expect(record.scopes).toEqual(['email', 'profile']);

      // Tokens should be encrypted (not plaintext)
      expect(record.access_token_encrypted).not.toBe('new-access-token');
      expect(record.access_token_encrypted).toContain(':');
    });
  });

  describe('removeCredentials', () => {
    let mockSupabase;

    it('should remove credentials by user and provider slug', async () => {
      mockSupabase = {
        from: jest.fn().mockImplementation((table) => {
          if (table === 'integration_providers') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { id: 'provider-uuid' },
                error: null
              })
            };
          }
          return {
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: (resolve) => resolve({ error: null })
          };
        })
      };

      const result = await credentialManager.removeCredentials(mockSupabase, 'user-123', 'google');
      expect(result).toBe(true);
    });

    it('should return false when provider not found', async () => {
      mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      };

      const result = await credentialManager.removeCredentials(mockSupabase, 'user-123', 'nonexistent');
      expect(result).toBe(false);
    });
  });
});
