/**
 * MCP Credential Crypto Tests
 *
 * Tests for AES-256-GCM credential encryption/decryption.
 */

const crypto = require('crypto');

describe('MCP Credential Crypto', () => {
    const TEST_KEY = crypto.randomBytes(32).toString('hex');
    let credentialCrypto;

    beforeAll(() => {
        process.env.MCP_CREDENTIAL_KEY = TEST_KEY;
        credentialCrypto = require('../../../server/services/mcpCredentialCrypto');
    });

    afterAll(() => {
        delete process.env.MCP_CREDENTIAL_KEY;
    });

    describe('encrypt + decrypt', () => {
        it('should round-trip a simple string', () => {
            const plaintext = 'my-secret-api-key';
            const encrypted = credentialCrypto.encrypt(plaintext);
            const decrypted = credentialCrypto.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });

        it('should round-trip a JSON credentials object', () => {
            const creds = JSON.stringify({ api_key: 'sk-123', token: 'bearer-456' });
            const encrypted = credentialCrypto.encrypt(creds);
            const decrypted = credentialCrypto.decrypt(encrypted);
            expect(JSON.parse(decrypted)).toEqual({ api_key: 'sk-123', token: 'bearer-456' });
        });

        it('should produce different ciphertext each time (random IV)', () => {
            const plaintext = 'same-input';
            const enc1 = credentialCrypto.encrypt(plaintext);
            const enc2 = credentialCrypto.encrypt(plaintext);
            expect(enc1).not.toBe(enc2);
        });

        it('should produce base64 output', () => {
            const encrypted = credentialCrypto.encrypt('test');
            // Base64 should not contain non-base64 chars
            expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
        });

        it('should handle empty string', () => {
            const encrypted = credentialCrypto.encrypt('');
            const decrypted = credentialCrypto.decrypt(encrypted);
            expect(decrypted).toBe('');
        });

        it('should handle unicode characters', () => {
            const plaintext = 'credentials with émojis 🔑 and ñ';
            const encrypted = credentialCrypto.encrypt(plaintext);
            const decrypted = credentialCrypto.decrypt(encrypted);
            expect(decrypted).toBe(plaintext);
        });
    });

    describe('decrypt with tampered data', () => {
        it('should throw on tampered ciphertext', () => {
            const encrypted = credentialCrypto.encrypt('secret');
            const buf = Buffer.from(encrypted, 'base64');
            // Flip a byte in the ciphertext portion (after iv + authTag = 32 bytes)
            if (buf.length > 33) buf[33] ^= 0xff;
            const tampered = buf.toString('base64');

            expect(() => credentialCrypto.decrypt(tampered)).toThrow();
        });
    });

    describe('isConfigured', () => {
        it('should return true when key is set', () => {
            expect(credentialCrypto.isConfigured()).toBe(true);
        });

        it('should return false when key is missing', () => {
            const saved = process.env.MCP_CREDENTIAL_KEY;
            delete process.env.MCP_CREDENTIAL_KEY;
            expect(credentialCrypto.isConfigured()).toBe(false);
            process.env.MCP_CREDENTIAL_KEY = saved;
        });

        it('should return false when key is wrong length', () => {
            const saved = process.env.MCP_CREDENTIAL_KEY;
            process.env.MCP_CREDENTIAL_KEY = 'tooshort';
            expect(credentialCrypto.isConfigured()).toBe(false);
            process.env.MCP_CREDENTIAL_KEY = saved;
        });
    });

    describe('getKey validation', () => {
        it('should throw when key is missing', () => {
            const saved = process.env.MCP_CREDENTIAL_KEY;
            delete process.env.MCP_CREDENTIAL_KEY;
            expect(() => credentialCrypto.encrypt('test')).toThrow('MCP_CREDENTIAL_KEY');
            process.env.MCP_CREDENTIAL_KEY = saved;
        });

        it('should throw when key is wrong length', () => {
            const saved = process.env.MCP_CREDENTIAL_KEY;
            process.env.MCP_CREDENTIAL_KEY = 'abc123';
            expect(() => credentialCrypto.encrypt('test')).toThrow('64-character');
            process.env.MCP_CREDENTIAL_KEY = saved;
        });
    });
});
