/**
 * CORS Integration Tests - Chrome Extension Origins
 *
 * Verifies that the server accepts chrome-extension:// origins under the
 * rules defined in server/index.js:
 *   - In development (NODE_ENV !== 'production'), any chrome-extension:// origin passes.
 *   - In production, only IDs listed in ALLOWED_EXTENSION_IDS (or '*') pass.
 *
 * These tests mount the CORS middleware directly so they remain unit-fast
 * without needing a running Supabase instance.
 *
 * IMPORTANT: Because Jest sets NODE_ENV=test, the CORS logic
 * `process.env.NODE_ENV !== 'production'` evaluates to TRUE in all test
 * environments. To test "production mode" we inject the env values directly
 * into a parameterized corsOriginFn factory, mirroring how the live server
 * reads them. This avoids global env pollution between parallel tests.
 */

const express = require('express');
const cors = require('cors');
const request = require('supertest');

// ---------------------------------------------------------------------------
// Helper: build an Express app with an inline (not env-reading) CORS function
// ---------------------------------------------------------------------------

/**
 * @param {object} config
 * @param {string[]} config.allowedOrigins   - Web origins whitelist
 * @param {string[]} config.allowedExtIds    - Extension IDs whitelist (may include '*')
 * @param {'development'|'production'} config.nodeEnv - Simulated NODE_ENV
 */
function buildCorsApp(config = {}) {
  const {
    allowedOrigins = [],
    allowedExtIds = [],
    nodeEnv = 'development',
  } = config;

  const app = express();

  app.use(
    cors({
      origin: function (origin, callback) {
        // Inline copy of server/index.js CORS logic with captured config values
        if (nodeEnv === 'production' && allowedOrigins.length === 0) {
          return callback(
            new Error('ALLOWED_ORIGINS must be configured in production')
          );
        }

        // No origin (server-to-server, curl, etc.) — always allow
        if (!origin) return callback(null, true);

        // Allow all when no ALLOWED_ORIGINS configured (dev without config)
        if (allowedOrigins.length === 0) return callback(null, true);

        // Explicit origin match
        if (allowedOrigins.includes(origin)) return callback(null, true);

        // Chrome extension origin handling
        if (origin.startsWith('chrome-extension://')) {
          const extId = origin.replace('chrome-extension://', '');
          if (allowedExtIds.includes(extId) || allowedExtIds.includes('*')) {
            return callback(null, true);
          }
          // In non-production, allow any extension
          if (nodeEnv !== 'production') {
            return callback(null, true);
          }
        }

        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
    })
  );

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // Error handler — CORS rejections call next(error), which needs a handler
  app.use((err, req, res, next) => {
    res.status(403).json({ error: err.message });
  });

  return app;
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const KNOWN_EXT_ID = 'abcdefghijklmnopabcdefghijklmnop';
const UNKNOWN_EXT_ID = 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzz01';
const KNOWN_EXT_ORIGIN = `chrome-extension://${KNOWN_EXT_ID}`;
const UNKNOWN_EXT_ORIGIN = `chrome-extension://${UNKNOWN_EXT_ID}`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CORS - Chrome Extension Origins', () => {
  // ---- Development mode ------------------------------------------------

  describe('Development mode (nodeEnv = development)', () => {
    let app;

    beforeAll(() => {
      app = buildCorsApp({
        allowedOrigins: ['http://localhost:3000'],
        allowedExtIds: [],
        nodeEnv: 'development',
      });
    });

    it('accepts any chrome-extension:// origin', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', KNOWN_EXT_ORIGIN);

      expect(res.status).toBe(200);
    });

    it('returns CORS header with credentials support', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', KNOWN_EXT_ORIGIN);

      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('echoes the extension origin in access-control-allow-origin', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', KNOWN_EXT_ORIGIN);

      expect(res.headers['access-control-allow-origin']).toBe(KNOWN_EXT_ORIGIN);
    });

    it('accepts an extension origin not in any allowlist', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', UNKNOWN_EXT_ORIGIN);

      expect(res.status).toBe(200);
    });

    it('accepts regular allowed web origins', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('rejects unknown non-extension origins', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://evil.example.com');

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not allowed by CORS/);
    });
  });

  // ---- Production mode with ALLOWED_EXTENSION_IDS ----------------------

  describe('Production mode with ALLOWED_EXTENSION_IDS', () => {
    let app;

    beforeAll(() => {
      app = buildCorsApp({
        allowedOrigins: ['https://app.insight360.app'],
        allowedExtIds: [KNOWN_EXT_ID],
        nodeEnv: 'production',
      });
    });

    it('accepts a listed extension ID', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', KNOWN_EXT_ORIGIN);

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe(KNOWN_EXT_ORIGIN);
    });

    it('rejects an unlisted extension ID', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', UNKNOWN_EXT_ORIGIN);

      expect(res.status).toBe(403);
    });

    it('accepts wildcard (*) extension ID allowlist', async () => {
      const wildcardApp = buildCorsApp({
        allowedOrigins: ['https://app.insight360.app'],
        allowedExtIds: ['*'],
        nodeEnv: 'production',
      });

      const res = await request(wildcardApp)
        .get('/api/health')
        .set('Origin', UNKNOWN_EXT_ORIGIN);

      expect(res.status).toBe(200);
    });

    it('accepts multiple comma-separated extension IDs (second in list)', async () => {
      const multiApp = buildCorsApp({
        allowedOrigins: ['https://app.insight360.app'],
        allowedExtIds: ['other1111111111111111111111111111', KNOWN_EXT_ID],
        nodeEnv: 'production',
      });

      const res = await request(multiApp)
        .get('/api/health')
        .set('Origin', KNOWN_EXT_ORIGIN);

      expect(res.status).toBe(200);
    });

    it('accepts a regular allowed web origin', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://app.insight360.app');

      expect(res.status).toBe(200);
    });

    it('rejects an unlisted web origin', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://evil.example.com');

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not allowed by CORS/);
    });

    it('rejects an unlisted extension origin in production', async () => {
      const strictApp = buildCorsApp({
        allowedOrigins: ['https://app.insight360.app'],
        allowedExtIds: [KNOWN_EXT_ID],
        nodeEnv: 'production',
      });

      const res = await request(strictApp)
        .get('/api/health')
        .set('Origin', UNKNOWN_EXT_ORIGIN);

      expect(res.status).toBe(403);
    });
  });

  // ---- No ALLOWED_ORIGINS configured (dev without config) ---------------

  describe('Development mode with no ALLOWED_ORIGINS configured', () => {
    let app;

    beforeAll(() => {
      app = buildCorsApp({
        allowedOrigins: [],
        allowedExtIds: [],
        nodeEnv: 'development',
      });
    });

    it('allows all origins when ALLOWED_ORIGINS is empty', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://any-site.example.com');

      expect(res.status).toBe(200);
    });

    it('allows extension origins when ALLOWED_ORIGINS is empty', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', UNKNOWN_EXT_ORIGIN);

      expect(res.status).toBe(200);
    });
  });

  // ---- Preflight (OPTIONS) requests ------------------------------------

  describe('Preflight OPTIONS requests', () => {
    let app;

    beforeAll(() => {
      app = buildCorsApp({
        allowedOrigins: ['http://localhost:3000'],
        allowedExtIds: [],
        nodeEnv: 'development',
      });
    });

    it('returns 204 for preflight from extension origin', async () => {
      const res = await request(app)
        .options('/api/health')
        .set('Origin', KNOWN_EXT_ORIGIN)
        .set('Access-Control-Request-Method', 'POST')
        .set(
          'Access-Control-Request-Headers',
          'Authorization, Content-Type, X-Extension-Version'
        );

      expect([200, 204]).toContain(res.status);
      expect(res.headers['access-control-allow-origin']).toBe(KNOWN_EXT_ORIGIN);
    });

    it('allows Authorization header in preflight', async () => {
      const res = await request(app)
        .options('/api/health')
        .set('Origin', KNOWN_EXT_ORIGIN)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization');

      expect([200, 204]).toContain(res.status);
    });

    it('allows X-Extension-Version header in preflight', async () => {
      const res = await request(app)
        .options('/api/health')
        .set('Origin', KNOWN_EXT_ORIGIN)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'X-Extension-Version, X-Org-Id');

      expect([200, 204]).toContain(res.status);
    });

    it('rejects preflight from an unlisted origin in production', async () => {
      const prodApp = buildCorsApp({
        allowedOrigins: ['https://app.insight360.app'],
        allowedExtIds: [KNOWN_EXT_ID],
        nodeEnv: 'production',
      });

      const res = await request(prodApp)
        .options('/api/health')
        .set('Origin', UNKNOWN_EXT_ORIGIN)
        .set('Access-Control-Request-Method', 'POST');

      expect(res.status).toBe(403);
    });
  });
});
