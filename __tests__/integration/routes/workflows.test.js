/**
 * Workflows Routes Integration Tests
 * Tests for /api/workflows/* endpoints
 */

const request = require('supertest');
const { createAuthenticatedTestApp } = require('../../setup/testApp');

describe('Workflows Routes Integration', () => {
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
    const testApp = createAuthenticatedTestApp({ routes: ['workflows'] });
    app = testApp.app;
    mockSupabase = testApp.mockSupabase;
  });

  // =============================================
  // GET /api/workflows
  // =============================================
  describe('GET /api/workflows', () => {
    const mockWorkflows = [
      {
        id: 'wf-001',
        name: 'Content Creation',
        description: 'End-to-end content workflow',
        is_active: true
      },
      {
        id: 'wf-002',
        name: 'Research Pipeline',
        description: 'Research and analysis workflow',
        is_active: true
      }
    ];

    beforeEach(() => {
      mockSupabase.from.mockImplementation(() => createChainable(mockWorkflows, null, 2));
    });

    it('should return list of workflows', async () => {
      const response = await request(app)
        .get('/api/workflows')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Route returns 'workflows' not 'data'
      expect(Array.isArray(response.body.workflows)).toBe(true);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/workflows?category=content')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // =============================================
  // GET /api/workflows/templates
  // =============================================
  describe('GET /api/workflows/templates', () => {
    const mockTemplates = [
      { id: 'tpl-001', name: 'Article Template', is_template: true }
    ];

    it('should return workflow templates', async () => {
      mockSupabase.from.mockImplementation(() => createChainable(mockTemplates));

      const response = await request(app)
        .get('/api/workflows/templates')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // =============================================
  // GET /api/workflows/:id
  // =============================================
  describe('GET /api/workflows/:id', () => {
    const mockWorkflow = {
      id: 'wf-001',
      name: 'Content Creation',
      description: 'End-to-end content workflow',
      is_active: true,
      workflow_steps: [
        { id: 'step-1', step_number: 1, name: 'Research', step_type: 'research' }
      ]
    };

    it('should return workflow with steps', async () => {
      mockSupabase.from.mockImplementation(() => createChainable(mockWorkflow));

      const response = await request(app)
        .get('/api/workflows/wf-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Route returns 'workflow' not 'data'
      expect(response.body.workflow).toBeDefined();
    });

    it('should handle non-existent workflow', async () => {
      mockSupabase.from.mockImplementation(() => createChainable(null, { message: 'Not found' }));

      const response = await request(app)
        .get('/api/workflows/non-existent');

      // Returns 500 due to error thrown
      expect(response.status).toBe(500);
    });
  });

  // =============================================
  // POST /api/workflows
  // =============================================
  describe('POST /api/workflows', () => {
    const newWorkflow = {
      name: 'New Workflow',
      description: 'A new workflow'
    };

    beforeEach(() => {
      mockSupabase.from.mockImplementation(() => createChainable({
        id: 'wf-new',
        ...newWorkflow,
        user_id: 'test-user-001',
        is_active: true
      }));
    });

    it('should create new workflow', async () => {
      const response = await request(app)
        .post('/api/workflows')
        .send(newWorkflow)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Route returns 'workflow' not 'data'
      expect(response.body.workflow).toBeDefined();
    });
  });

  // =============================================
  // PUT /api/workflows/:id
  // =============================================
  describe('PUT /api/workflows/:id', () => {
    beforeEach(() => {
      mockSupabase.from.mockImplementation(() => createChainable({
        id: 'wf-001',
        name: 'Updated Workflow',
        user_id: 'test-user-001'
      }));
    });

    it('should update workflow', async () => {
      const response = await request(app)
        .put('/api/workflows/wf-001')
        .send({ name: 'Updated Workflow' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // =============================================
  // DELETE /api/workflows/:id
  // =============================================
  describe('DELETE /api/workflows/:id', () => {
    beforeEach(() => {
      mockSupabase.from.mockImplementation(() => ({
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

    it('should delete workflow', async () => {
      const response = await request(app)
        .delete('/api/workflows/wf-001')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // =============================================
  // POST /api/workflows/:id/execute
  // =============================================
  describe('POST /api/workflows/:id/execute', () => {
    beforeEach(() => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'workflows') {
          return createChainable({
            id: 'wf-001',
            name: 'Content Workflow',
            workflow_steps: [{ id: 'step-1', step_number: 1 }]
          });
        }
        if (table === 'workflow_executions') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'exec-001',
                workflow_id: 'wf-001',
                status: 'running',
                current_step: 1
              },
              error: null
            })
          };
        }
        return createChainable();
      });
    });

    it('should start workflow execution', async () => {
      const response = await request(app)
        .post('/api/workflows/wf-001/execute')
        .send({ variables: { topic: 'AI' } })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // =============================================
  // GET /api/workflows/executions/:executionId
  // =============================================
  describe('GET /api/workflows/executions/:executionId', () => {
    const mockExecution = {
      id: 'exec-001',
      workflow_id: 'wf-001',
      status: 'running',
      current_step: 2,
      variables: { topic: 'AI' },
      workflow: { name: 'Content Workflow' }
    };

    it('should return execution details', async () => {
      mockSupabase.from.mockImplementation(() => createChainable(mockExecution));

      const response = await request(app)
        .get('/api/workflows/executions/exec-001')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // =============================================
  // Workflow Steps CRUD
  // =============================================
  describe('Workflow Steps', () => {
    describe('POST /api/workflows/:id/steps', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => createChainable({
          id: 'step-new',
          workflow_id: 'wf-001',
          step_number: 3,
          name: 'Review',
          step_type: 'human_gate'
        }));
      });

      it('should add step to workflow', async () => {
        const response = await request(app)
          .post('/api/workflows/wf-001/steps')
          .send({
            name: 'Review',
            step_type: 'human_gate',
            step_number: 3
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('PUT /api/workflows/:wfId/steps/:stepId', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => createChainable({
          id: 'step-001',
          name: 'Updated Step'
        }));
      });

      it('should update workflow step', async () => {
        const response = await request(app)
          .put('/api/workflows/wf-001/steps/step-001')
          .send({ name: 'Updated Step' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('DELETE /api/workflows/:wfId/steps/:stepId', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation(() => ({
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null })
        }));
      });

      it('should delete workflow step', async () => {
        const response = await request(app)
          .delete('/api/workflows/wf-001/steps/step-001')
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });
});
