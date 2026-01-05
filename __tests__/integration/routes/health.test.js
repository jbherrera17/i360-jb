/**
 * Health Routes Integration Tests
 * Phase 14: Observability & Monitoring
 */

const request = require('supertest');
const { createAuthenticatedTestApp, createQueryBuilder } = require('../../setup/testApp');

describe('Health Routes', () => {
  let app;
  let mockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();
    const testApp = createAuthenticatedTestApp({ routes: ['health'] });
    app = testApp.app;
    mockSupabase = testApp.mockSupabase;
  });

  // =============================================
  // GET /api/health
  // =============================================
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBeDefined();
      expect(response.body.services).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.version).toBeDefined();
    });

    it('should include uptime', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body.uptime).toBeDefined();
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should list service statuses', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body.services).toHaveProperty('anthropic');
      expect(response.body.services).toHaveProperty('openai');
      expect(response.body.services).toHaveProperty('supabase');
    });

    it('should return operational, partial, or error status', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(['operational', 'partial', 'error']).toContain(response.body.status);
    });
  });

  // =============================================
  // GET /api/health/ping
  // =============================================
  describe('GET /api/health/ping', () => {
    it('should return pong', async () => {
      const response = await request(app).get('/api/health/ping').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('pong');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  // =============================================
  // GET /api/health/live
  // =============================================
  describe('GET /api/health/live', () => {
    it('should return alive status', async () => {
      const response = await request(app).get('/api/health/live').expect(200);

      expect(response.body.alive).toBe(true);
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });

    it('should always return 200 if server is running', async () => {
      const response = await request(app).get('/api/health/live');

      expect(response.status).toBe(200);
    });
  });

  // =============================================
  // GET /api/health/ready
  // =============================================
  describe('GET /api/health/ready', () => {
    it('should return ready status structure', async () => {
      const response = await request(app).get('/api/health/ready');

      // May return 200 or 503 depending on initialization state
      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('ready');
    });

    it('should include timestamp when ready', async () => {
      const response = await request(app).get('/api/health/ready');

      if (response.status === 200) {
        expect(response.body.timestamp).toBeDefined();
      }
    });

    it('should include message when not ready', async () => {
      const response = await request(app).get('/api/health/ready');

      if (response.status === 503) {
        expect(response.body.message).toBeDefined();
      }
    });
  });

  // =============================================
  // GET /api/health/detailed
  // =============================================
  describe('GET /api/health/detailed', () => {
    beforeEach(() => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ error: null }),
      }));
    });

    it('should return detailed health information', async () => {
      const response = await request(app).get('/api/health/detailed').expect(200);

      expect(response.body.status).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
      expect(response.body.version).toBeDefined();
      expect(response.body.environment).toBeDefined();
    });

    it('should include memory information', async () => {
      const response = await request(app).get('/api/health/detailed').expect(200);

      expect(response.body.memory).toBeDefined();
      expect(response.body.memory.heapUsed).toBeDefined();
      expect(response.body.memory.heapTotal).toBeDefined();
      expect(response.body.memory.rss).toBeDefined();
      expect(response.body.memory.unit).toBe('MB');
    });

    it('should include CPU information', async () => {
      const response = await request(app).get('/api/health/detailed').expect(200);

      expect(response.body.cpu).toBeDefined();
      expect(response.body.cpu.user).toBeDefined();
      expect(response.body.cpu.system).toBeDefined();
    });

    it('should include database status', async () => {
      const response = await request(app).get('/api/health/detailed').expect(200);

      expect(response.body.database).toBeDefined();
      expect(response.body.database.status).toBeDefined();
    });

    it('should include external API configuration', async () => {
      const response = await request(app).get('/api/health/detailed').expect(200);

      expect(response.body.externalApis).toBeDefined();
      expect(typeof response.body.externalApis.anthropic).toBe('boolean');
      expect(typeof response.body.externalApis.openai).toBe('boolean');
    });

    it('should return node version', async () => {
      const response = await request(app).get('/api/health/detailed').expect(200);

      expect(response.body.node).toBeDefined();
      expect(response.body.node).toMatch(/^v\d+/);
    });
  });
});
