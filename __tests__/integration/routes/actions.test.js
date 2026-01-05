/**
 * Actions Routes Integration Tests
 * Tests for /api/actions/* endpoints
 *
 * Covers:
 * - Actions CRUD (8 endpoints)
 * - Action Templates (2 endpoints)
 * - Action Executions (3 endpoints)
 * - External AI Configs (4 endpoints)
 * - Stats endpoint
 * - Parthenon Context linking (OKRs, departments, processes, roles, assets)
 */

const request = require('supertest');
const { createTestApp, createAuthenticatedTestApp } = require('../../setup/testApp');
const { createMockSupabase, createQueryBuilder } = require('../../setup/mockSupabase');

// Mock anthropic service for execution tests
jest.mock('../../../server/services/anthropic', () => ({
  initialize: jest.fn().mockReturnValue(true),
  chat: jest.fn().mockResolvedValue({
    text: 'AI response to action',
    usage: { input_tokens: 100, output_tokens: 50 }
  })
}));

describe('Actions Routes Integration', () => {
  let app;
  let mockSupabase;

  // Helper to create chainable query builder
  const createChainable = (data = null, error = null, count = null) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
    then: (resolve) => resolve({ data, error, count: count ?? (Array.isArray(data) ? data.length : 0) })
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const testApp = createAuthenticatedTestApp({ routes: ['actions'] });
    app = testApp.app;
    mockSupabase = testApp.mockSupabase;
  });

  // =============================================
  // ACTIONS CRUD ENDPOINTS
  // =============================================
  describe('Actions CRUD', () => {
    const mockActions = [
      {
        id: 'action-001',
        name: 'Email Composer',
        slug: 'email-composer',
        description: 'Compose professional emails',
        suite: 'execute',
        status: 'active',
        is_public: true,
        is_featured: true,
        usage_count: 50,
        user_id: 'test-user-001'
      },
      {
        id: 'action-002',
        name: 'Content Generator',
        slug: 'content-generator',
        description: 'Generate marketing content',
        suite: 'create',
        status: 'active',
        is_public: true,
        is_featured: false,
        usage_count: 25,
        user_id: 'test-user-001'
      }
    ];

    describe('GET /api/actions', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => createChainable(mockActions, null, 2));
      });

      it('should list all actions', async () => {
        const response = await request(app)
          .get('/api/actions')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.pagination).toBeDefined();
        expect(response.body.pagination.total).toBe(2);
      });

      it('should filter by suite', async () => {
        const response = await request(app)
          .get('/api/actions?suite=execute')
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should filter by status', async () => {
        const response = await request(app)
          .get('/api/actions?status=active')
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should filter featured actions', async () => {
        const response = await request(app)
          .get('/api/actions?featured=true')
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should support search', async () => {
        const response = await request(app)
          .get('/api/actions?search=email')
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/actions?limit=10&offset=0')
          .expect(200);

        expect(response.body.pagination.limit).toBe(10);
        expect(response.body.pagination.offset).toBe(0);
      });
    });

    describe('GET /api/actions/featured', () => {
      const featuredActions = [mockActions[0]];

      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => createChainable(featuredActions));
      });

      it('should return featured actions', async () => {
        const response = await request(app)
          .get('/api/actions/featured')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(0);
      });

      it('should respect limit parameter', async () => {
        const response = await request(app)
          .get('/api/actions/featured?limit=3')
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/actions/:id', () => {
      beforeEach(() => {
        let callCount = 0;
        mockSupabase.from.mockImplementation((table) => {
          callCount++;
          if (table === 'actions' && callCount === 1) {
            return createChainable(mockActions[0]);
          }
          if (table === 'action_executions') {
            return createChainable([]);
          }
          return createQueryBuilder();
        });
      });

      it('should get single action with recent executions', async () => {
        const response = await request(app)
          .get('/api/actions/action-001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Email Composer');
        expect(response.body.data.recent_executions).toBeDefined();
      });

      it('should return 404 for non-existent action', async () => {
        mockSupabase.from.mockImplementation(() => createChainable(null));

        const response = await request(app)
          .get('/api/actions/non-existent')
          .expect(404);

        expect(response.body.error).toBe('Action not found');
      });
    });

    describe('GET /api/actions/slug/:slug', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => createChainable(mockActions[0]));
      });

      it('should get action by slug', async () => {
        const response = await request(app)
          .get('/api/actions/slug/email-composer')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.slug).toBe('email-composer');
      });

      it('should return 404 for non-existent slug', async () => {
        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
        }));

        const response = await request(app)
          .get('/api/actions/slug/non-existent')
          .expect(404);

        expect(response.body.error).toBe('Action not found');
      });
    });

    describe('POST /api/actions', () => {
      const createdAction = {
        id: 'new-action-001',
        name: 'New Action',
        slug: 'new-action',
        suite: 'execute',
        status: 'draft'
      };

      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => createChainable(createdAction));
      });

      it('should create new action', async () => {
        const response = await request(app)
          .post('/api/actions')
          .send({
            name: 'New Action',
            slug: 'new-action',
            description: 'A new action'
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('New Action');
      });

      it('should require name and slug', async () => {
        const response = await request(app)
          .post('/api/actions')
          .send({
            description: 'Missing required fields'
          })
          .expect(400);

        expect(response.body.error).toBe('Name and slug are required');
      });

      it('should return 409 for duplicate slug', async () => {
        mockSupabase.from.mockImplementation(() => ({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { code: '23505' } })
        }));

        const response = await request(app)
          .post('/api/actions')
          .send({
            name: 'Duplicate',
            slug: 'existing-slug'
          })
          .expect(409);

        expect(response.body.error).toContain('already exists');
      });
    });

    describe('POST /api/actions/from-template/:templateSlug', () => {
      const mockTemplate = {
        id: 'template-001',
        slug: 'email-template',
        name: 'Email Template',
        suite: 'execute',
        ai_engine: { type: 'native', native: { model: 'claude-sonnet-4' } }
      };

      beforeEach(() => {
        let callCount = 0;
        mockSupabase.from.mockImplementation((table) => {
          callCount++;
          if (table === 'action_templates') {
            return createChainable(mockTemplate);
          }
          if (table === 'actions') {
            return createChainable({ ...mockTemplate, id: 'new-from-template-001' });
          }
          return createQueryBuilder();
        });
      });

      it('should create action from template', async () => {
        const response = await request(app)
          .post('/api/actions/from-template/email-template')
          .send({ name: 'My Email Action' })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.template_used).toBe('email-template');
      });

      it('should return 404 for non-existent template', async () => {
        mockSupabase.from.mockImplementation(() => createChainable(null));

        const response = await request(app)
          .post('/api/actions/from-template/non-existent')
          .send({ name: 'Test' })
          .expect(404);

        expect(response.body.error).toBe('Template not found');
      });
    });

    describe('PUT /api/actions/:id', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => createChainable({ id: 'action-001', name: 'Updated' }));
      });

      it('should update action', async () => {
        const response = await request(app)
          .put('/api/actions/action-001')
          .send({ name: 'Updated Action' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('DELETE /api/actions/:id', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => ({
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null })
        }));
      });

      it('should archive action by default', async () => {
        const response = await request(app)
          .delete('/api/actions/action-001')
          .expect(200);

        expect(response.body.message).toBe('Action archived');
      });

      it('should hard delete when specified', async () => {
        const response = await request(app)
          .delete('/api/actions/action-001?hard=true')
          .expect(200);

        expect(response.body.message).toBe('Action permanently deleted');
      });
    });
  });

  // =============================================
  // ACTION TEMPLATES ENDPOINTS
  // =============================================
  describe('Action Templates', () => {
    const mockTemplates = [
      {
        id: 'template-001',
        slug: 'email-template',
        name: 'Email Template',
        suite: 'execute',
        category: 'communication',
        is_active: true
      }
    ];

    describe('GET /api/actions/templates/list', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => createChainable(mockTemplates));
      });

      it('should list all templates', async () => {
        const response = await request(app)
          .get('/api/actions/templates/list')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(0);
      });

      it('should filter by suite', async () => {
        const response = await request(app)
          .get('/api/actions/templates/list?suite=execute')
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/actions/templates/:slug', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => createChainable(mockTemplates[0]));
      });

      it('should get single template by slug', async () => {
        const response = await request(app)
          .get('/api/actions/templates/email-template')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.slug).toBe('email-template');
      });

      it('should return 404 for non-existent template', async () => {
        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
        }));

        const response = await request(app)
          .get('/api/actions/templates/non-existent')
          .expect(404);

        expect(response.body.error).toBe('Template not found');
      });
    });
  });

  // =============================================
  // ACTION EXECUTIONS ENDPOINTS
  // =============================================
  describe('Action Executions', () => {
    const mockAction = {
      id: 'action-001',
      name: 'Test Action',
      description: 'Test description',
      ai_engine: { type: 'native', native: { model: 'claude-sonnet-4' } },
      usage_count: 5
    };

    describe('POST /api/actions/:id/execute', () => {
      beforeEach(() => {
        let callCount = 0;
        mockSupabase.from.mockImplementation((table) => {
          callCount++;
          if (table === 'actions') {
            if (callCount === 1) {
              // First call - get action
              return createChainable(mockAction);
            }
            // Update usage count
            return {
              update: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ error: null })
            };
          }
          if (table === 'action_executions') {
            return {
              insert: jest.fn().mockResolvedValue({ error: null }),
              update: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { id: 'exec-001', status: 'completed' },
                error: null
              })
            };
          }
          return createQueryBuilder();
        });
      });

      it('should execute action with AI', async () => {
        const response = await request(app)
          .post('/api/actions/action-001/execute')
          .send({
            input_data: { message: 'Write an email' }
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.execution_id).toBeDefined();
        expect(response.body.data.output).toBeDefined();
        expect(response.body.data.duration_ms).toBeDefined();
      });

      it('should return 404 for non-existent action', async () => {
        mockSupabase.from.mockImplementation(() => createChainable(null));

        const response = await request(app)
          .post('/api/actions/non-existent/execute')
          .send({ input_data: {} })
          .expect(404);

        expect(response.body.error).toBe('Action not found');
      });
    });

    describe('GET /api/actions/:id/executions', () => {
      const mockExecutions = [
        { id: 'exec-001', status: 'completed', duration_ms: 500, created_at: '2024-01-01T00:00:00Z' },
        { id: 'exec-002', status: 'completed', duration_ms: 750, created_at: '2024-01-02T00:00:00Z' }
      ];

      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => createChainable(mockExecutions, null, 2));
      });

      it('should return execution history', async () => {
        const response = await request(app)
          .get('/api/actions/action-001/executions')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.pagination).toBeDefined();
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/actions/action-001/executions?limit=10&offset=0')
          .expect(200);

        expect(response.body.pagination.limit).toBe(10);
      });
    });

    describe('GET /api/actions/executions/:execId', () => {
      const mockExecution = {
        id: 'exec-001',
        status: 'completed',
        input_data: { message: 'Test' },
        output_data: { response: 'AI response' },
        actions: { id: 'action-001', name: 'Test Action', slug: 'test', suite: 'execute' }
      };

      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => createChainable(mockExecution));
      });

      it('should get single execution details', async () => {
        const response = await request(app)
          .get('/api/actions/executions/exec-001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('exec-001');
        expect(response.body.data.actions).toBeDefined();
      });

      it('should return 404 for non-existent execution', async () => {
        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
        }));

        const response = await request(app)
          .get('/api/actions/executions/non-existent')
          .expect(404);

        expect(response.body.error).toBe('Execution not found');
      });
    });
  });

  // =============================================
  // EXTERNAL AI CONFIGS ENDPOINTS
  // =============================================
  describe('External AI Configs', () => {
    const mockConfigs = [
      {
        id: 'config-001',
        name: 'Custom GPT',
        provider: 'openai',
        embed_url: 'https://example.com/gpt',
        is_active: true
      }
    ];

    describe('GET /api/actions/external-ai/list', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => createChainable(mockConfigs));
      });

      it('should list external AI configs', async () => {
        const response = await request(app)
          .get('/api/actions/external-ai/list')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(0);
      });

      it('should filter by provider', async () => {
        const response = await request(app)
          .get('/api/actions/external-ai/list?provider=openai')
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/actions/external-ai', () => {
      const createdConfig = {
        id: 'new-config-001',
        name: 'New AI Config',
        provider: 'anthropic',
        embed_url: 'https://example.com/ai'
      };

      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => createChainable(createdConfig));
      });

      it('should create external AI config', async () => {
        const response = await request(app)
          .post('/api/actions/external-ai')
          .send({
            name: 'New AI Config',
            provider: 'anthropic',
            embed_url: 'https://example.com/ai'
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should require name, provider, and embed_url', async () => {
        const response = await request(app)
          .post('/api/actions/external-ai')
          .send({
            name: 'Missing Fields'
          })
          .expect(400);

        expect(response.body.error).toContain('required');
      });
    });

    describe('PUT /api/actions/external-ai/:id', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => createChainable({ id: 'config-001', name: 'Updated' }));
      });

      it('should update external AI config', async () => {
        const response = await request(app)
          .put('/api/actions/external-ai/config-001')
          .send({ name: 'Updated Config' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('DELETE /api/actions/external-ai/:id', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => ({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null })
        }));
      });

      it('should deactivate external AI config', async () => {
        const response = await request(app)
          .delete('/api/actions/external-ai/config-001')
          .expect(200);

        expect(response.body.message).toBe('External AI configuration deactivated');
      });
    });
  });

  // =============================================
  // STATS ENDPOINT
  // =============================================
  describe('Stats', () => {
    describe('GET /api/actions/stats/overview', () => {
      beforeEach(() => {
        // Stats uses Promise.all with multiple chained queries
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'actions') {
            // Fully chainable for actions queries
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              then: (resolve) => resolve({ count: 5, error: null })
            };
          }
          if (table === 'action_executions') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              then: (resolve) => resolve({
                data: [
                  { id: 'exec-001', status: 'completed', duration_ms: 500, created_at: '2024-01-01' },
                  { id: 'exec-002', status: 'completed', duration_ms: 750, created_at: '2024-01-02' }
                ],
                count: 10,
                error: null
              })
            };
          }
          return createQueryBuilder();
        });
      });

      it('should return actions statistics', async () => {
        const response = await request(app)
          .get('/api/actions/stats/overview')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('total_actions');
        expect(response.body.data).toHaveProperty('active_actions');
        expect(response.body.data).toHaveProperty('total_executions');
        expect(response.body.data).toHaveProperty('success_rate');
        expect(response.body.data).toHaveProperty('avg_duration_ms');
      });
    });
  });

  // =============================================
  // PARTHENON CONTEXT ENDPOINTS
  // =============================================
  describe('Parthenon Context', () => {
    describe('GET /api/actions/:id/context', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation((table) => {
          if (table.startsWith('action_')) {
            return createChainable([]);
          }
          return createQueryBuilder();
        });
      });

      it('should get full Parthenon context for action', async () => {
        const response = await request(app)
          .get('/api/actions/action-001/context')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('okrs');
        expect(response.body.data).toHaveProperty('departments');
        expect(response.body.data).toHaveProperty('processes');
        expect(response.body.data).toHaveProperty('roles');
        expect(response.body.data).toHaveProperty('context_assets');
      });
    });

    describe('POST /api/actions/:id/okrs', () => {
      const createdLink = {
        id: 'link-001',
        action_id: 'action-001',
        okr_id: 'okr-001',
        okrs: { id: 'okr-001', title: 'Revenue Target', scope: 'company', period: 'Q1' }
      };

      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => createChainable(createdLink));
      });

      it('should link OKR to action', async () => {
        const response = await request(app)
          .post('/api/actions/action-001/okrs')
          .send({
            okr_id: 'okr-001',
            relationship: 'supports'
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should require okr_id', async () => {
        const response = await request(app)
          .post('/api/actions/action-001/okrs')
          .send({ relationship: 'supports' })
          .expect(400);

        expect(response.body.error).toBe('okr_id is required');
      });
    });

    describe('DELETE /api/actions/:id/okrs/:okrId', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => ({
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          then: (resolve) => resolve({ error: null })
        }));
      });

      it('should unlink OKR from action', async () => {
        const response = await request(app)
          .delete('/api/actions/action-001/okrs/okr-001')
          .expect(200);

        expect(response.body.message).toBe('OKR unlinked from action');
      });
    });

    describe('POST /api/actions/:id/departments', () => {
      const createdLink = {
        id: 'link-001',
        action_id: 'action-001',
        department_id: 'dept-001',
        departments: { id: 'dept-001', name: 'Sales', icon: 'trending-up', color: '#f59e0b' }
      };

      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => createChainable(createdLink));
      });

      it('should link department to action', async () => {
        const response = await request(app)
          .post('/api/actions/action-001/departments')
          .send({ department_id: 'dept-001' })
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should require department_id', async () => {
        const response = await request(app)
          .post('/api/actions/action-001/departments')
          .send({})
          .expect(400);

        expect(response.body.error).toBe('department_id is required');
      });
    });

    describe('DELETE /api/actions/:id/departments/:deptId', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => ({
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          then: (resolve) => resolve({ error: null })
        }));
      });

      it('should unlink department from action', async () => {
        const response = await request(app)
          .delete('/api/actions/action-001/departments/dept-001')
          .expect(200);

        expect(response.body.message).toBe('Department unlinked from action');
      });
    });

    describe('POST /api/actions/:id/processes', () => {
      const createdLink = {
        id: 'link-001',
        action_id: 'action-001',
        process_id: 'proc-001',
        processes: { id: 'proc-001', name: 'Sales Process', type: 'procedure', status: 'active' }
      };

      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => createChainable(createdLink));
      });

      it('should link process to action', async () => {
        const response = await request(app)
          .post('/api/actions/action-001/processes')
          .send({ process_id: 'proc-001' })
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should require process_id', async () => {
        const response = await request(app)
          .post('/api/actions/action-001/processes')
          .send({})
          .expect(400);

        expect(response.body.error).toBe('process_id is required');
      });
    });

    describe('DELETE /api/actions/:id/processes/:processId', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => ({
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          then: (resolve) => resolve({ error: null })
        }));
      });

      it('should unlink process from action', async () => {
        const response = await request(app)
          .delete('/api/actions/action-001/processes/proc-001')
          .expect(200);

        expect(response.body.message).toBe('Process unlinked from action');
      });
    });

    describe('POST /api/actions/:id/roles', () => {
      const createdLink = {
        id: 'link-001',
        action_id: 'action-001',
        role_id: 'role-001',
        roles: { id: 'role-001', title: 'Sales Manager', level: 'manager', department_id: 'dept-001' }
      };

      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => createChainable(createdLink));
      });

      it('should link role to action', async () => {
        const response = await request(app)
          .post('/api/actions/action-001/roles')
          .send({ role_id: 'role-001' })
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should require role_id', async () => {
        const response = await request(app)
          .post('/api/actions/action-001/roles')
          .send({})
          .expect(400);

        expect(response.body.error).toBe('role_id is required');
      });
    });

    describe('DELETE /api/actions/:id/roles/:roleId', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => ({
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          then: (resolve) => resolve({ error: null })
        }));
      });

      it('should unlink role from action', async () => {
        const response = await request(app)
          .delete('/api/actions/action-001/roles/role-001')
          .expect(200);

        expect(response.body.message).toBe('Role unlinked from action');
      });
    });

    describe('POST /api/actions/:id/assets', () => {
      const createdLink = {
        id: 'link-001',
        action_id: 'action-001',
        asset_id: 'asset-001',
        context_assets: { id: 'asset-001', name: 'Company Description', asset_type: 'company_description' }
      };

      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => createChainable(createdLink));
      });

      it('should link context asset to action', async () => {
        const response = await request(app)
          .post('/api/actions/action-001/assets')
          .send({ asset_id: 'asset-001' })
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should require asset_id', async () => {
        const response = await request(app)
          .post('/api/actions/action-001/assets')
          .send({})
          .expect(400);

        expect(response.body.error).toBe('asset_id is required');
      });
    });

    describe('DELETE /api/actions/:id/assets/:assetId', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => ({
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          then: (resolve) => resolve({ error: null })
        }));
      });

      it('should unlink context asset from action', async () => {
        const response = await request(app)
          .delete('/api/actions/action-001/assets/asset-001')
          .expect(200);

        expect(response.body.message).toBe('Asset unlinked from action');
      });
    });

    describe('GET /api/actions/:id/assembled-context', () => {
      const mockAction = {
        id: 'action-001',
        name: 'Test Action',
        suite: 'execute',
        description: 'Test'
      };

      beforeEach(() => {
        let callCount = 0;
        mockSupabase.from.mockImplementation((table) => {
          callCount++;
          if (table === 'actions') {
            return createChainable(mockAction);
          }
          // All action_* linking tables
          return createChainable([]);
        });
      });

      it('should return assembled context for action execution', async () => {
        const response = await request(app)
          .get('/api/actions/action-001/assembled-context')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('action');
        expect(response.body.data).toHaveProperty('okr_context');
        expect(response.body.data).toHaveProperty('department_context');
        expect(response.body.data).toHaveProperty('process_context');
        expect(response.body.data).toHaveProperty('role_context');
        expect(response.body.data).toHaveProperty('asset_context');
        expect(response.body.data).toHaveProperty('meta');
      });

      it('should return 404 for non-existent action', async () => {
        mockSupabase.from.mockImplementation(() => createChainable(null));

        const response = await request(app)
          .get('/api/actions/non-existent/assembled-context')
          .expect(404);

        expect(response.body.error).toBe('Action not found');
      });
    });
  });

  // =============================================
  // ERROR HANDLING
  // =============================================
  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        then: (resolve) => resolve({ data: null, error: { message: 'Database error' }, count: null })
      }));

      const response = await request(app)
        .get('/api/actions')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database error');
    });
  });
});
