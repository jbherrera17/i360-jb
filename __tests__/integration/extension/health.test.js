/**
 * Health Check Endpoint Tests - Extension Client Perspective
 *
 * The extension's api.js checkHealth() method calls GET /api/health and
 * expects res.ok (status 200) to determine whether the server is reachable.
 * The background.js token-refresh alarm also hits /api/health.
 *
 * These tests confirm the endpoint:
 *   1. Returns 200 with success JSON
 *   2. Works with no auth headers (public endpoint)
 *   3. Works with an extension-style Origin header
 *   4. Returns consistent shape (status, services, version)
 */

const request = require('supertest');
const { createAuthenticatedTestApp } = require('../../setup/testApp');
const { createMockSupabase } = require('../../setup/mockSupabase');

function buildApp() {
  const mockSupabase = createMockSupabase();
  mockSupabase.from.mockImplementation(() => ({
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
  }));

  const { app } = createAuthenticatedTestApp({
    routes: ['health'],
    mockSupabase,
  });
  return app;
}

describe('GET /api/health - Extension Health Check', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  // ---- Baseline availability -------------------------------------------

  describe('Baseline availability', () => {
    it('returns 200 OK', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
    });

    it('returns success: true', async () => {
      const res = await request(app).get('/api/health');
      expect(res.body.success).toBe(true);
    });

    it('returns a status field', async () => {
      const res = await request(app).get('/api/health');
      expect(['operational', 'partial', 'error']).toContain(res.body.status);
    });

    it('returns a version field', async () => {
      const res = await request(app).get('/api/health');
      expect(res.body.version).toBeDefined();
    });

    it('returns a timestamp', async () => {
      const res = await request(app).get('/api/health');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ---- No-auth access (matches extension behaviour) --------------------

  describe('Unauthenticated access (as called by the extension)', () => {
    it('works with no Authorization header', async () => {
      const res = await request(app)
        .get('/api/health');

      expect(res.status).toBe(200);
    });

    it('works with a chrome-extension Origin header', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'chrome-extension://abcdefghijklmnopabcdefghijklmnop');

      expect(res.status).toBe(200);
    });

    it('works with AbortSignal-style short request (no extra headers)', async () => {
      // The extension background.js uses AbortSignal.timeout(5000) but
      // supertest cannot replicate that — we verify the minimal header set works
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
    });
  });

  // ---- Response shape --------------------------------------------------

  describe('Response shape used by extension checkHealth()', () => {
    it('response is JSON', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['content-type']).toMatch(/json/);
    });

    it('contains a services object', async () => {
      const res = await request(app).get('/api/health');
      expect(res.body.services).toBeDefined();
      expect(typeof res.body.services).toBe('object');
    });

    it('res.ok logic: status 200 means server reachable', async () => {
      const res = await request(app).get('/api/health');
      // The extension's checkHealth() returns `res.ok` which is true for 200-299
      expect(res.status >= 200 && res.status < 300).toBe(true);
    });
  });

  // ---- Ping sub-route --------------------------------------------------

  describe('GET /api/health/ping', () => {
    it('returns 200 with pong message', async () => {
      const res = await request(app).get('/api/health/ping');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('pong');
    });

    it('works with no auth (background alarm style)', async () => {
      const res = await request(app)
        .get('/api/health/ping')
        .set('Origin', 'chrome-extension://abcdefghijklmnopabcdefghijklmnop');

      expect(res.status).toBe(200);
    });
  });
});
