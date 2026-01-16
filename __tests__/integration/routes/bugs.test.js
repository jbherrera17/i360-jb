/**
 * Bugs Routes Integration Tests
 * Phase 27: Notion Bug Tracker Integration
 */

const request = require('supertest');
const { createTestApp, createAuthenticatedTestApp } = require('../../setup/testApp');
const bugsRouter = require('../../../server/routes/bugs');

// Mock global fetch for Notion API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Sample Notion bug responses
const mockNotionBugs = [
  {
    id: 'bug-001',
    url: 'https://notion.so/bug-001',
    properties: {
      'Bug Title': { title: [{ plain_text: 'Login button not working' }] },
      Status: { select: { name: 'In Progress' } },
      Severity: { select: { name: 'High' } },
      Priority: { select: { name: 'P1' } },
      'I360 Module': { select: { name: 'Auth' } },
      'Date Reported': { date: { start: '2026-01-10' } },
      'Date Resolved': { date: null }
    }
  },
  {
    id: 'bug-002',
    url: 'https://notion.so/bug-002',
    properties: {
      'Bug Title': { title: [{ plain_text: 'Dashboard chart rendering issue' }] },
      Status: { select: { name: 'Resolved' } },
      Severity: { select: { name: 'Medium' } },
      Priority: { select: { name: 'P2' } },
      'I360 Module': { select: { name: 'Dashboard' } },
      'Date Reported': { date: { start: '2026-01-08' } },
      'Date Resolved': { date: { start: '2026-01-12' } }
    }
  },
  {
    id: 'bug-003',
    url: 'https://notion.so/bug-003',
    properties: {
      'Bug Title': { title: [{ plain_text: 'Critical security vulnerability' }] },
      Status: { select: { name: 'New' } },
      Severity: { select: { name: 'Critical' } },
      Priority: { select: { name: 'P0' } },
      'I360 Module': { select: { name: 'API' } },
      'Date Reported': { date: { start: '2026-01-14' } },
      'Date Resolved': { date: null }
    }
  }
];

describe('Bugs Routes', () => {
  let app;
  let mockSupabase;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, NOTION_API_KEY: 'test-notion-key' };

    // Clear cache between tests
    bugsRouter.invalidateCache();

    const testApp = createAuthenticatedTestApp({ routes: ['bugs'] });
    app = testApp.app;
    mockSupabase = testApp.mockSupabase;

    // Default: successful Notion API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockNotionBugs })
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // =============================================
  // Authentication Tests
  // =============================================
  describe('Authentication', () => {
    it('should require authentication for /summary', async () => {
      const unauthApp = createTestApp({ routes: ['bugs'] }).app;

      const response = await request(unauthApp).get('/api/bugs/summary');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should require authentication for /bugs', async () => {
      const unauthApp = createTestApp({ routes: ['bugs'] }).app;

      const response = await request(unauthApp).get('/api/bugs');

      expect(response.status).toBe(401);
    });

    it('should require authentication for /open', async () => {
      const unauthApp = createTestApp({ routes: ['bugs'] }).app;

      const response = await request(unauthApp).get('/api/bugs/open');

      expect(response.status).toBe(401);
    });
  });

  // =============================================
  // GET /api/bugs/summary
  // =============================================
  describe('GET /api/bugs/summary', () => {
    it('should return bug summary statistics', async () => {
      const response = await request(app).get('/api/bugs/summary').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.total).toBe(3);
      expect(response.body.fixed).toBe(1);
      expect(response.body.open).toBe(2);
      expect(response.body.lastUpdated).toBeDefined();
    });

    it('should return bugs grouped by severity', async () => {
      const response = await request(app).get('/api/bugs/summary').expect(200);

      expect(response.body.bySeverity).toBeDefined();
      expect(Array.isArray(response.body.bySeverity)).toBe(true);

      const critical = response.body.bySeverity.find(s => s.severity === 'Critical');
      expect(critical).toBeDefined();
      expect(critical.total).toBe(1);
      expect(critical.open).toBe(1);
    });

    it('should return bugs grouped by status', async () => {
      const response = await request(app).get('/api/bugs/summary').expect(200);

      expect(response.body.byStatus).toBeDefined();
      expect(Array.isArray(response.body.byStatus)).toBe(true);

      const inProgress = response.body.byStatus.find(s => s.status === 'In Progress');
      expect(inProgress).toBeDefined();
      expect(inProgress.count).toBe(1);
    });

    it('should handle Notion API errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Notion API error' })
      });

      const response = await request(app).get('/api/bugs/summary');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.fallback).toBe(true);
    });

    it('should handle missing NOTION_API_KEY', async () => {
      delete process.env.NOTION_API_KEY;

      const response = await request(app).get('/api/bugs/summary');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
    });

    it('should handle empty bug list', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] })
      });

      const response = await request(app).get('/api/bugs/summary').expect(200);

      expect(response.body.total).toBe(0);
      expect(response.body.fixed).toBe(0);
      expect(response.body.open).toBe(0);
    });
  });

  // =============================================
  // GET /api/bugs
  // =============================================
  describe('GET /api/bugs', () => {
    it('should return list of bugs', async () => {
      const response = await request(app).get('/api/bugs').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(3);
      expect(response.body.bugs).toBeDefined();
      expect(Array.isArray(response.body.bugs)).toBe(true);
    });

    it('should transform bug properties correctly', async () => {
      const response = await request(app).get('/api/bugs').expect(200);

      const bug = response.body.bugs[0];
      expect(bug.id).toBeDefined();
      expect(bug.title).toBeDefined();
      expect(bug.status).toBeDefined();
      expect(bug.severity).toBeDefined();
      expect(bug.priority).toBeDefined();
      expect(bug.module).toBeDefined();
      expect(bug.url).toBeDefined();
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/bugs')
        .query({ status: 'In Progress' })
        .expect(200);

      // Verify the filter was sent to Notion (checking the fetch call)
      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.filter).toBeDefined();
      expect(body.filter.property).toBe('Status');
    });

    it('should filter by severity', async () => {
      const response = await request(app)
        .get('/api/bugs')
        .query({ severity: 'Critical' })
        .expect(200);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.filter.property).toBe('Severity');
    });

    it('should combine status and severity filters', async () => {
      const response = await request(app)
        .get('/api/bugs')
        .query({ status: 'New', severity: 'Critical' })
        .expect(200);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.filter.and).toBeDefined();
      expect(body.filter.and.length).toBe(2);
    });

    it('should include pagination info in response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results: mockNotionBugs,
          has_more: true,
          next_cursor: 'cursor-abc123'
        })
      });

      const response = await request(app).get('/api/bugs').expect(200);

      expect(response.body.hasMore).toBe(true);
      expect(response.body.nextCursor).toBe('cursor-abc123');
    });

    it('should pass page_size to Notion API', async () => {
      await request(app)
        .get('/api/bugs')
        .query({ page_size: 10 })
        .expect(200);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.page_size).toBe(10);
    });

    it('should cap page_size at 100', async () => {
      await request(app)
        .get('/api/bugs')
        .query({ page_size: 200 })
        .expect(200);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.page_size).toBe(100);
    });

    it('should pass cursor to Notion API', async () => {
      await request(app)
        .get('/api/bugs')
        .query({ cursor: 'cursor-xyz789' })
        .expect(200);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.start_cursor).toBe('cursor-xyz789');
    });

    it('should handle Notion API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Rate limited' })
      });

      const response = await request(app).get('/api/bugs');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
    });
  });

  // =============================================
  // GET /api/bugs/open
  // =============================================
  describe('GET /api/bugs/open', () => {
    it('should return only open bugs', async () => {
      const response = await request(app).get('/api/bugs/open').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.bugs).toBeDefined();
      expect(Array.isArray(response.body.bugs)).toBe(true);
    });

    it('should apply correct filter for open bugs', async () => {
      await request(app).get('/api/bugs/open').expect(200);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      // Should filter out Resolved, Closed, and Won't Fix
      expect(body.filter.and).toBeDefined();
      expect(body.filter.and.length).toBe(3);
    });

    it('should sort by priority and severity', async () => {
      await request(app).get('/api/bugs/open').expect(200);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.sorts).toBeDefined();
      expect(body.sorts.length).toBe(2);
      expect(body.sorts[0].property).toBe('Priority');
      expect(body.sorts[1].property).toBe('Severity');
    });

    it('should handle Notion API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Server error' })
      });

      const response = await request(app).get('/api/bugs/open');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
    });
  });

  // =============================================
  // POST /api/bugs (Create)
  // =============================================
  describe('POST /api/bugs', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'new-bug-001',
          url: 'https://notion.so/new-bug-001',
          properties: {}
        })
      });
    });

    it('should require authentication', async () => {
      const unauthApp = createTestApp({ routes: ['bugs'] }).app;

      const response = await request(unauthApp)
        .post('/api/bugs')
        .send({ title: 'Test Bug' });

      expect(response.status).toBe(401);
    });

    it('should create a bug with required fields', async () => {
      const response = await request(app)
        .post('/api/bugs')
        .send({ title: 'Test Bug' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.bug.id).toBe('new-bug-001');
      expect(response.body.bug.title).toBe('Test Bug');
      expect(response.body.bug.status).toBe('New');
    });

    it('should require title', async () => {
      const response = await request(app)
        .post('/api/bugs')
        .send({ severity: 'High' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Title is required');
    });

    it('should include optional properties', async () => {
      await request(app)
        .post('/api/bugs')
        .send({
          title: 'Test Bug',
          severity: 'Critical',
          priority: 'P0',
          module: 'API'
        })
        .expect(201);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.properties['Severity'].select.name).toBe('Critical');
      expect(body.properties['Priority'].select.name).toBe('P0');
      expect(body.properties['I360 Module'].select.name).toBe('API');
    });

    it('should include description as page content', async () => {
      await request(app)
        .post('/api/bugs')
        .send({
          title: 'Test Bug',
          description: 'This is a bug description'
        })
        .expect(201);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.children).toBeDefined();
      expect(body.children.length).toBeGreaterThan(0);
    });

    it('should invalidate cache after creation', async () => {
      // First, populate cache
      await request(app).get('/api/bugs/summary').expect(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Create a bug
      await request(app)
        .post('/api/bugs')
        .send({ title: 'New Bug' })
        .expect(201);

      // Cache should be invalidated, so this should call Notion again
      await request(app).get('/api/bugs/summary').expect(200);
      expect(mockFetch).toHaveBeenCalledTimes(3); // summary + create + summary again
    });

    it('should handle Notion API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Database not found' })
      });

      const response = await request(app)
        .post('/api/bugs')
        .send({ title: 'Test Bug' });

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
    });
  });

  // =============================================
  // PATCH /api/bugs/:id (Update)
  // =============================================
  describe('PATCH /api/bugs/:id', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'bug-001',
          url: 'https://notion.so/bug-001',
          properties: {
            'Bug Title': { title: [{ plain_text: 'Updated Bug' }] },
            Status: { select: { name: 'In Progress' } },
            Severity: { select: { name: 'High' } }
          }
        })
      });
    });

    it('should require authentication', async () => {
      const unauthApp = createTestApp({ routes: ['bugs'] }).app;

      const response = await request(unauthApp)
        .patch('/api/bugs/bug-001')
        .send({ status: 'In Progress' });

      expect(response.status).toBe(401);
    });

    it('should update bug status', async () => {
      const response = await request(app)
        .patch('/api/bugs/bug-001')
        .send({ status: 'In Progress' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.bug.status).toBe('In Progress');
    });

    it('should require at least one property to update', async () => {
      const response = await request(app)
        .patch('/api/bugs/bug-001')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('No valid properties to update');
    });

    it('should auto-set dateResolved when status is Resolved', async () => {
      await request(app)
        .patch('/api/bugs/bug-001')
        .send({ status: 'Resolved' })
        .expect(200);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.properties['Date Resolved']).toBeDefined();
      expect(body.properties['Date Resolved'].date.start).toBeDefined();
    });

    it('should invalidate cache after update', async () => {
      // Populate cache
      await request(app).get('/api/bugs/summary').expect(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Update a bug
      await request(app)
        .patch('/api/bugs/bug-001')
        .send({ status: 'Resolved' })
        .expect(200);

      // Cache should be invalidated
      await request(app).get('/api/bugs/summary').expect(200);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle Notion API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Page not found' })
      });

      const response = await request(app)
        .patch('/api/bugs/invalid-id')
        .send({ status: 'In Progress' });

      expect(response.status).toBe(503);
    });
  });

  // =============================================
  // GET /api/bugs/:id (Single bug)
  // =============================================
  describe('GET /api/bugs/:id', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'bug-001',
          url: 'https://notion.so/bug-001',
          properties: {
            'Bug Title': { title: [{ plain_text: 'Test Bug' }] },
            Status: { select: { name: 'New' } },
            Severity: { select: { name: 'High' } },
            Priority: { select: { name: 'P1' } },
            'I360 Module': { select: { name: 'API' } },
            'Date Reported': { date: { start: '2026-01-15' } }
          }
        })
      });
    });

    it('should require authentication', async () => {
      const unauthApp = createTestApp({ routes: ['bugs'] }).app;

      const response = await request(unauthApp).get('/api/bugs/bug-001');

      expect(response.status).toBe(401);
    });

    it('should return a single bug', async () => {
      const response = await request(app)
        .get('/api/bugs/bug-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.bug.id).toBe('bug-001');
      expect(response.body.bug.title).toBe('Test Bug');
      expect(response.body.bug.status).toBe('New');
    });

    it('should handle Notion API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Page not found' })
      });

      const response = await request(app).get('/api/bugs/invalid-id');

      expect(response.status).toBe(503);
    });
  });

  // =============================================
  // Caching
  // =============================================
  describe('Caching', () => {
    it('should cache Notion API responses', async () => {
      // First request - should call Notion
      await request(app).get('/api/bugs/summary').expect(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second request - should use cache
      await request(app).get('/api/bugs/summary').expect(200);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1, cached
    });

    it('should cache different queries separately', async () => {
      // Request with no filter
      await request(app).get('/api/bugs').expect(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Request with filter - different cache key
      await request(app).get('/api/bugs').query({ status: 'New' }).expect(200);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Same filter again - should use cache
      await request(app).get('/api/bugs').query({ status: 'New' }).expect(200);
      expect(mockFetch).toHaveBeenCalledTimes(2); // Still 2, cached
    });

    it('should invalidate cache when invalidateCache is called', async () => {
      // First request
      await request(app).get('/api/bugs/summary').expect(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Invalidate cache
      bugsRouter.invalidateCache();

      // Second request - should call Notion again
      await request(app).get('/api/bugs/summary').expect(200);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // =============================================
  // Edge Cases
  // =============================================
  describe('Edge Cases', () => {
    it('should handle bugs with missing properties', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{
            id: 'bug-incomplete',
            url: 'https://notion.so/bug-incomplete',
            properties: {}
          }]
        })
      });

      const response = await request(app).get('/api/bugs').expect(200);

      const bug = response.body.bugs[0];
      expect(bug.id).toBe('bug-incomplete');
      expect(bug.title).toBe('Untitled');
      expect(bug.status).toBeNull();
      expect(bug.severity).toBeNull();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const response = await request(app).get('/api/bugs/summary');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
    });

    it('should include correct Notion API headers', async () => {
      await request(app).get('/api/bugs/summary').expect(200);

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers['Authorization']).toBe('Bearer test-notion-key');
      expect(headers['Notion-Version']).toBe('2022-06-28');
      expect(headers['Content-Type']).toBe('application/json');
    });
  });
});
