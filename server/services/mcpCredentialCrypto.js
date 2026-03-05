/**
 * MCP Credential Encryption Service
 * AES-256-GCM encryption for MCP connection credentials.
 * Key sourced from MCP_CREDENTIAL_KEY env var (32-byte hex string).
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey() {
    const keyHex = process.env.MCP_CREDENTIAL_KEY;
    if (!keyHex || keyHex.length !== 64) {
        throw new Error('MCP_CREDENTIAL_KEY must be a 64-character hex string (32 bytes). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }
    return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt a plaintext string.
 * @param {string} plaintext - The credential JSON string to encrypt
 * @returns {string} Base64-encoded string: iv + authTag + ciphertext
 */
function encrypt(plaintext) {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Concatenate: iv (16) + authTag (16) + ciphertext
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64');
}

/**
 * Decrypt an encrypted string.
 * @param {string} encryptedBase64 - Base64-encoded encrypted data
 * @returns {string} Decrypted plaintext
 */
function decrypt(encryptedBase64) {
    const key = getKey();
    const combined = Buffer.from(encryptedBase64, 'base64');

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
}

/**
 * Check if encryption is configured.
 */
function isConfigured() {
    return !!(process.env.MCP_CREDENTIAL_KEY && process.env.MCP_CREDENTIAL_KEY.length === 64);
}

module.exports = { encrypt, decrypt, isConfigured };
