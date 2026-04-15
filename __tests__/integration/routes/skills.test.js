/**
 * Skills Routes Integration Tests
 * Tests for /api/skills/* endpoints
 */

const request = require('supertest');
const { createAuthenticatedTestApp } = require('../../setup/testApp');
const { createMockSupabase } = require('../../setup/mockSupabase');

describe('Skills Routes Integration', () => {
  let app;
  let mockSupabase;

  const createChainable = (data = null, error = null, count = null) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),
    then: (resolve) => resolve({ data, error, count: count ?? (Array.isArray(data) ? data.length : 0) })
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const testApp = createAuthenticatedTestApp({ routes: ['skills'] });
    app = testApp.app;
    mockSupabase = testApp.mockSupabase;
  });

  // =============================================
  // GET /api/skills
  // =============================================
  describe('GET /api/skills', () => {
    const mockSkills = [
      {
        id: 'skill-001',
        name: 'article-writer',
        display_name: 'Article Writer',
        category: 'content',
        status: 'active'
      },
      {
        id: 'skill-002',
        name: 'email-composer',
        display_name: 'Email Composer',
        category: 'communication',
        status: 'active'
      }
    ];

    beforeEach(() => {
      mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable(mockSkills, null, 2));
    });

    it('should return list of skills', async () => {
      const response = await request(app)
        .get('/api/skills')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/skills?category=content')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support search', async () => {
      const response = await request(app)
        .get('/api/skills?search=article')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // =============================================
  // GET /api/skills/:id
  // =============================================
  describe('GET /api/skills/:id', () => {
    const mockSkill = {
      id: 'skill-001',
      name: 'article-writer',
      display_name: 'Article Writer',
      instructions: 'Write engaging articles',
      category: 'content',
      status: 'active'
    };

    it('should return single skill by ID', async () => {
      mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable(mockSkill));

      const response = await request(app)
        .get('/api/skills/skill-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('article-writer');
    });

    it('should handle non-existent skill', async () => {
      mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable(null, { message: 'Not found' }));

      const response = await request(app)
        .get('/api/skills/non-existent');

      // Returns 500 when error occurs
      expect(response.status).toBe(500);
    });
  });

  // =============================================
  // POST /api/skills
  // =============================================
  describe('POST /api/skills', () => {
    const newSkill = {
      name: 'new-skill',
      instructions: 'Skill instructions',
      category: 'content'
    };

    beforeEach(() => {
      mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable({
        id: 'skill-new',
        ...newSkill,
        user_id: 'test-user-001'
      }));
    });

    it('should create new skill', async () => {
      const response = await request(app)
        .post('/api/skills')
        .send(newSkill)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('new-skill');
    });

    it('should require name and instructions', async () => {
      const response = await request(app)
        .post('/api/skills')
        .send({ category: 'test' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // =============================================
  // PUT /api/skills/:id
  // =============================================
  describe('PUT /api/skills/:id', () => {
    beforeEach(() => {
      mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable({
        id: 'skill-001',
        name: 'updated-skill',
        user_id: 'test-user-001'
      }));
    });

    it('should update skill', async () => {
      const response = await request(app)
        .put('/api/skills/skill-001')
        .send({ display_name: 'Updated Skill' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // =============================================
  // DELETE /api/skills/:id
  // =============================================
  describe('DELETE /api/skills/:id', () => {
    beforeEach(() => {
      mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : ({
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: 'test-user-001' },
          error: null
        }),
        then: (resolve) => resolve({ error: null })
      }));
    });

    it('should delete skill', async () => {
      const response = await request(app)
        .delete('/api/skills/skill-001')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // =============================================
  // GET /api/skills/categories
  // =============================================
  describe('GET /api/skills/categories', () => {
    it('should return skill categories', async () => {
      mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable([
        { category: 'content', count: 5 }
      ]));

      const response = await request(app)
        .get('/api/skills/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
