/**
 * Integration Tests - Agent Routes
 * Tests HTTP endpoints for agent CRUD, context mappings, and execution
 */

const request = require('supertest');
const { createTestApp, createAuthenticatedTestApp, createAdminTestApp } = require('../../setup/testApp');
const { createMockSupabase } = require('../../setup/mockSupabase');
const { testAgents, testContextAssets } = require('../../fixtures/testData');

// Mock the services used by routes
jest.mock('../../../server/services/contextInjection', () => ({
  assembleContext: jest.fn().mockResolvedValue({
    systemPrompt: 'Test system prompt',
    contextBlocks: [],
    totalTokens: 100
  }),
  estimateTokens: jest.fn().mockReturnValue(50)
}));

jest.mock('../../../server/services/agentService', () => ({
  executeAgent: jest.fn().mockResolvedValue({
    response: 'Test response',
    model: 'claude-sonnet-4-5-20250929',
    usage: { input_tokens: 100, output_tokens: 50 }
  }),
  streamAgent: jest.fn()
}));

jest.mock('../../../server/services/mindstudioService', () => ({
  generateSignedEmbedUrl: jest.fn().mockResolvedValue({
    url: 'https://mindstudio.ai/embed/test?token=abc123'
  })
}));

describe('Agent Routes Integration Tests', () => {
  let app;
  let mockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // GET /api/agents - List Agents
  // ============================================================================
  describe('GET /api/agents', () => {
    beforeEach(() => {
      mockSupabase = createMockSupabase();
      const testApp = createTestApp({ routes: ['agents'], mockSupabase });
      app = testApp.app;
    });

    it('should return list of agents with default pagination', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agent_summary') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({
              data: [testAgents.systemAgent, testAgents.userAgent],
              error: null,
              count: 2
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .get('/api/agents')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.limit).toBe(50);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('should filter by category', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [testAgents.systemAgent],
          error: null,
          count: 1
        })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agent_summary') return mockQuery;
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .get('/api/agents?category=general')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('category', 'general');
    });

    it('should filter by suite', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agent_summary') return mockQuery;
        return createMockSupabase().from(table);
      });

      await request(app)
        .get('/api/agents?suite=execute')
        .expect(200);

      expect(mockQuery.eq).toHaveBeenCalledWith('suite', 'execute');
    });

    it('should filter by provider', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agent_summary') return mockQuery;
        return createMockSupabase().from(table);
      });

      await request(app)
        .get('/api/agents?provider=anthropic')
        .expect(200);

      expect(mockQuery.eq).toHaveBeenCalledWith('llm_provider', 'anthropic');
    });

    it('should filter by active status', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agent_summary') return mockQuery;
        return createMockSupabase().from(table);
      });

      await request(app)
        .get('/api/agents?active=true')
        .expect(200);

      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should search agents by name or description', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [testAgents.contentWriter],
          error: null,
          count: 1
        })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agent_summary') return mockQuery;
        return createMockSupabase().from(table);
      });

      await request(app)
        .get('/api/agents?search=assistant')
        .expect(200);

      expect(mockQuery.or).toHaveBeenCalledWith('name.ilike.%assistant%,description.ilike.%assistant%');
    });

    it('should search agents by name or description - with results', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [testAgents.systemAgent],
          error: null,
          count: 1
        })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agent_summary') return mockQuery;
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .get('/api/agents?search=System')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should apply custom sorting', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0
        })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agent_summary') return mockQuery;
        return createMockSupabase().from(table);
      });

      await request(app)
        .get('/api/agents?sort=created_at&order=desc')
        .expect(200);

      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should apply pagination', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 100
        })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agent_summary') return mockQuery;
        return createMockSupabase().from(table);
      });

      await request(app)
        .get('/api/agents?limit=10&offset=20')
        .expect(200);

      expect(mockQuery.range).toHaveBeenCalledWith(20, 29);
    });

    it('should return 500 on database error', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      }));

      const response = await request(app)
        .get('/api/agents')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database connection failed');
    });
  });

  // ============================================================================
  // GET /api/agents/suites - Get Suites
  // ============================================================================
  describe('GET /api/agents/suites', () => {
    beforeEach(() => {
      mockSupabase = createMockSupabase();
      const testApp = createTestApp({ routes: ['agents'], mockSupabase });
      app = testApp.app;
    });

    it('should return suite counts', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agents') {
          return {
            select: jest.fn().mockResolvedValue({
              data: [
                { suite: 'align' },
                { suite: 'align' },
                { suite: 'strategy' },
                { suite: 'execute' },
                { suite: 'execute' },
                { suite: 'execute' },
                { suite: null }
              ],
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .get('/api/agents/suites')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suites).toHaveLength(3);
      expect(response.body.data.suites[0].count).toBe(2); // align
      expect(response.body.data.suites[1].count).toBe(1); // strategy
      expect(response.body.data.suites[2].count).toBe(3); // execute
      expect(response.body.data.unassigned).toBe(1);
      expect(response.body.data.total).toBe(7);
    });
  });

  // ============================================================================
  // GET /api/agents/categories - Get Categories
  // ============================================================================
  describe('GET /api/agents/categories', () => {
    beforeEach(() => {
      mockSupabase = createMockSupabase();
      const testApp = createTestApp({ routes: ['agents'], mockSupabase });
      app = testApp.app;
    });

    it('should return active categories sorted', async () => {
      const mockCategories = [
        { id: 'content', name: 'Content', sort_order: 1 },
        { id: 'research', name: 'Research', sort_order: 2 }
      ];

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agent_categories') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: mockCategories,
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .get('/api/agents/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCategories);
    });
  });

  // ============================================================================
  // GET /api/agents/departments - Get Departments
  // ============================================================================
  describe('GET /api/agents/departments', () => {
    beforeEach(() => {
      mockSupabase = createMockSupabase();
      const testApp = createTestApp({ routes: ['agents'], mockSupabase });
      app = testApp.app;
    });

    it('should return active departments', async () => {
      const mockDepartments = [
        { id: 'marketing', name: 'Marketing', description: 'Marketing team', icon: '📣' },
        { id: 'sales', name: 'Sales', description: 'Sales team', icon: '💼' }
      ];

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'departments') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: mockDepartments,
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .get('/api/agents/departments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockDepartments);
    });
  });

  // ============================================================================
  // GET /api/agents/stats - Get Statistics
  // ============================================================================
  describe('GET /api/agents/stats', () => {
    beforeEach(() => {
      mockSupabase = createMockSupabase();
      const testApp = createTestApp({ routes: ['agents'], mockSupabase });
      app = testApp.app;
    });

    it('should return agent statistics', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agents') {
          return {
            select: jest.fn().mockResolvedValue({
              data: [
                { id: '1', is_active: true, type: 'custom' },
                { id: '2', is_active: true, type: 'custom' },
                { id: '3', is_active: false, type: 'mindstudio' },
                { id: '4', is_active: true, type: 'mindstudio' }
              ],
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .get('/api/agents/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total_agents).toBe(4);
      expect(response.body.data.active_agents).toBe(3);
      expect(response.body.data.by_platform.custom).toBe(2);
      expect(response.body.data.by_platform.mindstudio).toBe(2);
    });
  });

  // ============================================================================
  // GET /api/agents/:id - Get Single Agent
  // ============================================================================
  describe('GET /api/agents/:id', () => {
    beforeEach(() => {
      mockSupabase = createMockSupabase();
      const testApp = createTestApp({ routes: ['agents'], mockSupabase });
      app = testApp.app;
    });

    it('should return agent with context mappings', async () => {
      const mockMappings = [
        { id: 'mapping-1', asset_id: 'asset-1', priority: 100, context_assets: testContextAssets.voiceDNA }
      ];

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agents') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: testAgents.systemAgent,
              error: null
            })
          };
        }
        if (table === 'agent_context_mappings') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: mockMappings,
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .get(`/api/agents/${testAgents.systemAgent.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testAgents.systemAgent.id);
      expect(response.body.data.context_mappings).toHaveLength(1);
    });

    it('should return 404 for non-existent agent', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agents') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .get('/api/agents/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Agent not found');
    });
  });

  // ============================================================================
  // POST /api/agents - Create Agent
  // ============================================================================
  describe('POST /api/agents', () => {
    beforeEach(() => {
      mockSupabase = createMockSupabase();
      const testApp = createAuthenticatedTestApp({
        routes: ['agents'],
        mockSupabase,
        userId: 'test-user-001'
      });
      app = testApp.app;
    });

    it('should create a native agent successfully', async () => {
      const newAgent = {
        name: 'New Test Agent',
        description: 'Test description',
        system_prompt: 'You are a helpful assistant.',
        llm_provider: 'anthropic',
        llm_model: 'claude-sonnet-4-5-20250929'
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agents') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'new-agent-id', ...newAgent },
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .post('/api/agents')
        .send(newAgent)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(newAgent.name);
    });

    it('should create a MindStudio agent successfully', async () => {
      const mindstudioAgent = {
        name: 'MindStudio Agent',
        description: 'A MindStudio workflow agent',
        type: 'mindstudio',
        mindstudio_workflow_id: 'ms-workflow-123'
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agents') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'ms-agent-id', ...mindstudioAgent },
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .post('/api/agents')
        .send(mindstudioAgent)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/agents')
        .send({ description: 'No name' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Name is required');
    });

    it('should return 400 when native agent missing system_prompt', async () => {
      const response = await request(app)
        .post('/api/agents')
        .send({
          name: 'Test Agent',
          type: 'custom'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('System prompt is required for native agents');
    });

    it('should return 400 when MindStudio agent missing workflow_id', async () => {
      const response = await request(app)
        .post('/api/agents')
        .send({
          name: 'Test Agent',
          type: 'mindstudio'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('MindStudio App ID is required');
    });
  });

  // ============================================================================
  // PUT /api/agents/:id - Update Agent
  // ============================================================================
  describe('PUT /api/agents/:id', () => {
    it('should update agent when user is owner', async () => {
      mockSupabase = createMockSupabase();
      const testApp = createAuthenticatedTestApp({
        routes: ['agents'],
        mockSupabase,
        userId: 'test-user-001',
        userRole: 'user'
      });
      app = testApp.app;

      const agentId = 'agent-001';

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agents') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            single: jest.fn()
              .mockResolvedValueOnce({
                data: { id: agentId, user_id: 'test-user-001', is_system: false },
                error: null
              })
              .mockResolvedValueOnce({
                data: { id: agentId, name: 'Updated Name' },
                error: null
              })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .put(`/api/agents/${agentId}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should update any agent when user is admin', async () => {
      mockSupabase = createMockSupabase();
      const testApp = createAdminTestApp({
        routes: ['agents'],
        mockSupabase
      });
      app = testApp.app;

      const agentId = 'agent-001';

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agents') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            single: jest.fn()
              .mockResolvedValueOnce({
                data: { id: agentId, user_id: 'other-user', is_system: true },
                error: null
              })
              .mockResolvedValueOnce({
                data: { id: agentId, name: 'Updated by Admin' },
                error: null
              })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .put(`/api/agents/${agentId}`)
        .send({ name: 'Updated by Admin' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 403 when non-owner tries to edit', async () => {
      mockSupabase = createMockSupabase();
      const testApp = createAuthenticatedTestApp({
        routes: ['agents'],
        mockSupabase,
        userId: 'different-user',
        userRole: 'user'
      });
      app = testApp.app;

      const agentId = 'agent-001';

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agents') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: agentId, user_id: 'test-user-001', is_system: false },
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .put(`/api/agents/${agentId}`)
        .send({ name: 'Unauthorized Update' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 when non-admin tries to edit system agent', async () => {
      mockSupabase = createMockSupabase();
      const testApp = createAuthenticatedTestApp({
        routes: ['agents'],
        mockSupabase,
        userId: 'test-user-001',
        userRole: 'user'
      });
      app = testApp.app;

      const agentId = 'agent-001';

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agents') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: agentId, user_id: 'test-user-001', is_system: true },
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .put(`/api/agents/${agentId}`)
        .send({ name: 'Edit System Agent' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('System agents');
    });

    it('should return 404 when agent not found', async () => {
      mockSupabase = createMockSupabase();
      const testApp = createAuthenticatedTestApp({
        routes: ['agents'],
        mockSupabase
      });
      app = testApp.app;

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agents') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .put('/api/agents/non-existent')
        .send({ name: 'Update' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Agent not found');
    });
  });

  // ============================================================================
  // DELETE /api/agents/:id - Delete Agent
  // ============================================================================
  describe('DELETE /api/agents/:id', () => {
    it('should soft delete agent by default', async () => {
      mockSupabase = createMockSupabase();
      const testApp = createAuthenticatedTestApp({
        routes: ['agents'],
        mockSupabase,
        userId: 'test-user-001'
      });
      app = testApp.app;

      const agentId = 'agent-001';
      const mockUpdate = jest.fn().mockReturnThis();

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agents') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            update: mockUpdate,
            single: jest.fn().mockResolvedValue({
              data: { id: agentId, user_id: 'test-user-001', is_system: false, name: 'Test Agent' },
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .delete(`/api/agents/${agentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deactivated');
    });

    it('should hard delete agent when hard=true', async () => {
      mockSupabase = createMockSupabase();
      const testApp = createAdminTestApp({
        routes: ['agents'],
        mockSupabase
      });
      app = testApp.app;

      const agentId = 'agent-001';
      const mockDelete = jest.fn().mockReturnThis();

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agents') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            delete: mockDelete,
            single: jest.fn().mockResolvedValue({
              data: { id: agentId, user_id: 'test-user-001', is_system: false, name: 'Test Agent' },
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .delete(`/api/agents/${agentId}?hard=true`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('permanently deleted');
    });

    it('should return 403 when non-owner tries to delete', async () => {
      mockSupabase = createMockSupabase();
      const testApp = createAuthenticatedTestApp({
        routes: ['agents'],
        mockSupabase,
        userId: 'different-user'
      });
      app = testApp.app;

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agents') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'agent-001', user_id: 'test-user-001', is_system: false, name: 'Test Agent' },
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .delete('/api/agents/agent-001')
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // POST /api/agents/:id/duplicate - Duplicate Agent
  // ============================================================================
  describe('POST /api/agents/:id/duplicate', () => {
    beforeEach(() => {
      mockSupabase = createMockSupabase();
      const testApp = createAuthenticatedTestApp({
        routes: ['agents'],
        mockSupabase
      });
      app = testApp.app;
    });

    it('should duplicate an agent with new name', async () => {
      const originalAgent = testAgents.userAgent;

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agents') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            single: jest.fn()
              .mockResolvedValueOnce({
                data: originalAgent,
                error: null
              })
              .mockResolvedValueOnce({
                data: { ...originalAgent, id: 'new-id', name: 'Duplicated Agent' },
                error: null
              })
          };
        }
        if (table === 'agent_context_mappings') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null
            }),
            insert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .post(`/api/agents/${originalAgent.id}/duplicate`)
        .send({ name: 'Duplicated Agent' })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 when duplicating non-existent agent', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agents') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .post('/api/agents/non-existent/duplicate')
        .send({ name: 'Copy' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // GET /api/agents/:id/stats - Agent Statistics
  // ============================================================================
  describe('GET /api/agents/:id/stats', () => {
    beforeEach(() => {
      mockSupabase = createMockSupabase();
      const testApp = createTestApp({ routes: ['agents'], mockSupabase });
      app = testApp.app;
    });

    it('should return execution statistics', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agent_executions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockResolvedValue({
              data: [
                { status: 'success', duration_ms: 1000, total_tokens: 100, created_at: new Date().toISOString() },
                { status: 'success', duration_ms: 2000, total_tokens: 150, created_at: new Date().toISOString() },
                { status: 'error', duration_ms: 500, total_tokens: 50, created_at: new Date().toISOString() }
              ],
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .get('/api/agents/agent-001/stats?days=7')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total_executions).toBe(3);
      expect(response.body.data.successful).toBe(2);
      expect(response.body.data.failed).toBe(1);
      expect(response.body.data.avg_duration_ms).toBe(1167); // (1000+2000+500)/3
      expect(response.body.data.total_tokens_used).toBe(300);
      expect(response.body.data.period_days).toBe(7);
    });
  });

  // ============================================================================
  // Context Mapping Endpoints
  // ============================================================================
  describe('Context Mapping Endpoints', () => {
    beforeEach(() => {
      mockSupabase = createMockSupabase();
      const testApp = createAuthenticatedTestApp({
        routes: ['agents'],
        mockSupabase
      });
      app = testApp.app;
    });

    describe('GET /api/agents/:id/context', () => {
      it('should return context mappings with token estimates', async () => {
        const { estimateTokens } = require('../../../server/services/contextInjection');

        mockSupabase.from.mockImplementation((table) => {
          if (table === 'agent_context_mappings') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockResolvedValue({
                data: [{
                  id: 'mapping-1',
                  asset_id: 'asset-1',
                  priority: 100,
                  context_assets: {
                    id: 'asset-1',
                    name: 'Company Values',
                    content_text: 'Our values are...'
                  }
                }],
                error: null
              })
            };
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .get('/api/agents/agent-001/context')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data[0].estimated_tokens).toBe(50);
        expect(estimateTokens).toHaveBeenCalled();
      });
    });

    describe('POST /api/agents/:id/context', () => {
      it('should create context mapping successfully', async () => {
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'agent_context_mappings') {
            return {
              insert: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'new-mapping',
                  agent_id: 'agent-001',
                  asset_id: 'asset-001',
                  injection_mode: 'always',
                  priority: 75,
                  context_assets: { id: 'asset-001', name: 'Test Asset' }
                },
                error: null
              })
            };
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .post('/api/agents/agent-001/context')
          .send({
            asset_id: 'asset-001',
            injection_mode: 'always',
            priority: 75
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.priority).toBe(75);
      });

      it('should return 400 when asset_id is missing', async () => {
        const response = await request(app)
          .post('/api/agents/agent-001/context')
          .send({ injection_mode: 'always' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('asset_id is required');
      });

      it('should return 409 for duplicate mapping', async () => {
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'agent_context_mappings') {
            return {
              insert: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: '23505', message: 'Duplicate' }
              })
            };
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .post('/api/agents/agent-001/context')
          .send({ asset_id: 'asset-001' })
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('already mapped');
      });
    });

    describe('PUT /api/agents/:id/context/:mappingId', () => {
      it('should update context mapping', async () => {
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'agent_context_mappings') {
            return {
              update: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { id: 'mapping-1', priority: 90, injection_mode: 'keyword' },
                error: null
              })
            };
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .put('/api/agents/agent-001/context/mapping-1')
          .send({ priority: 90, injection_mode: 'keyword' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.priority).toBe(90);
      });
    });

    describe('DELETE /api/agents/:id/context/:mappingId', () => {
      it('should delete context mapping', async () => {
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'agent_context_mappings') {
            return {
              delete: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ error: null })
            };
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .delete('/api/agents/agent-001/context/mapping-1')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('removed');
      });
    });

    describe('POST /api/agents/:id/context/preview', () => {
      it('should return context preview', async () => {
        const { assembleContext } = require('../../../server/services/contextInjection');

        const response = await request(app)
          .post('/api/agents/agent-001/context/preview')
          .send({ user_message: 'Test message' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(assembleContext).toHaveBeenCalledWith(
          'agent-001',
          expect.objectContaining({ userQuery: 'Test message', returnDetails: true }),
          expect.anything()
        );
      });
    });
  });

  // ============================================================================
  // Execution Endpoints
  // ============================================================================
  describe('Execution Endpoints', () => {
    beforeEach(() => {
      mockSupabase = createMockSupabase();
      const testApp = createAuthenticatedTestApp({
        routes: ['agents'],
        mockSupabase
      });
      app = testApp.app;
    });

    describe('POST /api/agents/:id/execute', () => {
      it('should execute agent and return response', async () => {
        const { executeAgent } = require('../../../server/services/agentService');

        const response = await request(app)
          .post('/api/agents/agent-001/execute')
          .send({
            message: 'Hello!',
            conversation_history: []
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.response).toBe('Test response');
        expect(executeAgent).toHaveBeenCalledWith('agent-001', expect.objectContaining({
          userMessage: 'Hello!',
          conversationHistory: []
        }));
      });

      it('should return 400 when message is missing', async () => {
        const response = await request(app)
          .post('/api/agents/agent-001/execute')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Message is required');
      });
    });

    describe('POST /api/agents/:id/embed-url', () => {
      it('should generate embed URL for MindStudio agent', async () => {
        const { generateSignedEmbedUrl } = require('../../../server/services/mindstudioService');

        mockSupabase.from.mockImplementation((table) => {
          if (table === 'agents') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'ms-agent',
                  name: 'MindStudio Agent',
                  type: 'mindstudio',
                  mindstudio_workflow_id: 'ms-workflow-123'
                },
                error: null
              })
            };
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .post('/api/agents/ms-agent/embed-url')
          .send({ user_id: 'user-123' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.embed_url).toContain('mindstudio.ai');
        expect(generateSignedEmbedUrl).toHaveBeenCalledWith('ms-workflow-123', 'user-123');
      });

      it('should return 400 for non-MindStudio agent', async () => {
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'agents') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'native-agent',
                  type: 'custom'
                },
                error: null
              })
            };
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .post('/api/agents/native-agent/embed-url')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('not a MindStudio agent');
      });
    });

    describe('GET /api/agents/:id/executions', () => {
      it('should return execution history with pagination', async () => {
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'agent_executions') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              range: jest.fn().mockResolvedValue({
                data: [
                  { id: 'exec-1', status: 'success', created_at: new Date().toISOString() },
                  { id: 'exec-2', status: 'success', created_at: new Date().toISOString() }
                ],
                error: null,
                count: 50
              })
            };
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .get('/api/agents/agent-001/executions?limit=10&offset=0')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.pagination.total).toBe(50);
      });
    });

    describe('GET /api/agents/:id/executions/:execId', () => {
      it('should return single execution details', async () => {
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'agent_executions') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'exec-1',
                  agent_id: 'agent-001',
                  status: 'success',
                  duration_ms: 1500,
                  total_tokens: 200
                },
                error: null
              })
            };
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .get('/api/agents/agent-001/executions/exec-1')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('exec-1');
      });

      it('should return 404 for non-existent execution', async () => {
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'agent_executions') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null
              })
            };
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .get('/api/agents/agent-001/executions/non-existent')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Execution not found');
      });
    });
  });
});
