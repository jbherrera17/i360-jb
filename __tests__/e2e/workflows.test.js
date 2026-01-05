/**
 * End-to-End Workflow Tests
 *
 * Tests complete user workflows that span multiple API endpoints.
 * These tests verify that the system works correctly as a whole.
 *
 * Workflows tested:
 * 1. Agent Creation → Context Mapping → Chat
 * 2. Context Asset Creation → Versioning → Rollback
 * 3. Action Creation → Parthenon Linking → Execution
 * 4. Parthenon Setup → OKR Cascade → Strategic Alignment
 */

const request = require('supertest');
const { createAuthenticatedTestApp } = require('../setup/testApp');
const { createMockSupabase, createQueryBuilder } = require('../setup/mockSupabase');

// Mock all external services
jest.mock('../../server/services/anthropic', () => ({
  initialize: jest.fn().mockReturnValue(true),
  chat: jest.fn().mockResolvedValue({
    text: 'AI response with context applied',
    content: 'AI response with context applied',
    model: 'claude-sonnet-4-5-20250929',
    usage: { input_tokens: 500, output_tokens: 200 }
  }),
  streamChat: jest.fn().mockImplementation(async function* () {
    yield { type: 'text', content: 'Streaming ' };
    yield { type: 'text', content: 'response' };
    yield { type: 'done', usage: { input_tokens: 100, output_tokens: 50 } };
  })
}));

jest.mock('../../server/services/openai', () => ({
  initialize: jest.fn().mockReturnValue(true),
  chat: jest.fn().mockResolvedValue({
    text: 'OpenAI response',
    model: 'gpt-4o',
    usage: { prompt_tokens: 100, completion_tokens: 50 }
  })
}));

jest.mock('../../server/services/llmRegistry', () => ({
  getProvider: jest.fn().mockReturnValue('anthropic'),
  getModelConfig: jest.fn().mockReturnValue({ provider: 'anthropic', contextWindow: 200000 })
}));

jest.mock('../../server/services/agentService', () => ({
  getAgentWithContext: jest.fn().mockResolvedValue({
    agent: {
      id: 'agent-001',
      name: 'Test Agent',
      system_prompt: 'You are a helpful assistant',
      model: 'claude-sonnet-4-5-20250929'
    },
    contextText: 'Company: TestCo\nMission: Excellence'
  }),
  executeAgent: jest.fn().mockResolvedValue({
    response: 'AI response with context',
    usage: { input_tokens: 500, output_tokens: 200 },
    model: 'claude-sonnet-4-5-20250929'
  })
}));

describe('E2E Workflow Tests', () => {
  // =============================================
  // WORKFLOW 1: Agent Creation → Context Mapping → Chat
  // =============================================
  describe('Workflow: Agent Creation → Context Mapping → Chat', () => {
    let combinedApp;
    let mockSupabase;

    beforeEach(() => {
      jest.clearAllMocks();
      process.env.ANTHROPIC_API_KEY = 'test-key';

      // Create a single app with all routes for E2E testing
      const testApp = createAuthenticatedTestApp({ routes: ['agents', 'context', 'chat'] });
      combinedApp = testApp.app;
      mockSupabase = testApp.mockSupabase;
    });

    it('should complete full agent workflow: create agent → add context → chat', async () => {
      // Step 1: Create an agent
      const createdAgent = {
        id: 'new-agent-001',
        name: 'Sales Assistant',
        system_prompt: 'You help with sales inquiries',
        model: 'claude-sonnet-4-5-20250929',
        status: 'active'
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agents') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: createdAgent, error: null })
          };
        }
        return createQueryBuilder();
      });

      const createResponse = await request(combinedApp)
        .post('/api/agents')
        .send({
          name: 'Sales Assistant',
          system_prompt: 'You help with sales inquiries',
          model: 'claude-sonnet-4-5-20250929'
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.name).toBe('Sales Assistant');
      const agentId = createResponse.body.data.id;

      // Step 2: Create a context asset
      const createdAsset = {
        id: 'asset-001',
        asset_type: 'company_description',
        name: 'Company Overview',
        content_json: { mission: 'Help businesses grow' },
        content_text: 'Our mission is to help businesses grow',
        version: 1
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'context_assets') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: createdAsset, error: null })
          };
        }
        return createQueryBuilder();
      });

      const assetResponse = await request(combinedApp)
        .post('/api/context/assets')
        .send({
          asset_type: 'company_description',
          name: 'Company Overview',
          content_json: { mission: 'Help businesses grow' }
        })
        .expect(201);

      expect(assetResponse.body.success).toBe(true);
      const assetId = assetResponse.body.data.id;

      // Step 3: Map context to agent
      const contextMapping = {
        id: 'mapping-001',
        agent_id: agentId,
        asset_id: assetId,
        injection_mode: 'always'
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agent_context_mappings') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: contextMapping, error: null })
          };
        }
        if (table === 'agents') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: createdAgent, error: null })
          };
        }
        return createQueryBuilder();
      });

      const mappingResponse = await request(combinedApp)
        .post(`/api/agents/${agentId}/context`)
        .send({
          asset_id: assetId,
          injection_mode: 'always',
          priority: 100
        })
        .expect(201);

      expect(mappingResponse.body.success).toBe(true);

      // Step 4: Chat with the agent (context should be injected)
      const chatResponse = await request(combinedApp)
        .post('/api/chat')
        .send({
          agent_id: agentId,
          message: 'Tell me about the company'
        })
        .expect(200);

      expect(chatResponse.body.success).toBe(true);
      expect(chatResponse.body.response).toBeDefined();
    });

    it('should handle workflow with multiple context assets', async () => {
      const agent = {
        id: 'agent-multi-001',
        name: 'Multi-Context Agent',
        system_prompt: 'You are helpful',
        model: 'claude-sonnet-4-5-20250929'
      };

      const assets = [
        { id: 'asset-1', asset_type: 'company_description', name: 'Company', content_text: 'Company info', version: 1 },
        { id: 'asset-2', asset_type: 'voice_dna', name: 'Voice', content_text: 'Voice guidelines', version: 1 },
        { id: 'asset-3', asset_type: 'icp', name: 'ICP', content_text: 'Target customer profile', version: 1 }
      ];

      // Create agent
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'agents') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: agent, error: null })
          };
        }
        return createQueryBuilder();
      });

      const agentResponse = await request(combinedApp)
        .post('/api/agents')
        .send(agent)
        .expect(201);

      expect(agentResponse.body.success).toBe(true);

      // Create multiple assets
      for (const asset of assets) {
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'context_assets') {
            return {
              insert: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: asset, error: null })
            };
          }
          return createQueryBuilder();
        });

        const assetResp = await request(combinedApp)
          .post('/api/context/assets')
          .send(asset)
          .expect(201);

        expect(assetResp.body.success).toBe(true);
      }
    });
  });

  // =============================================
  // WORKFLOW 2: Context Asset Versioning → Rollback
  // =============================================
  describe('Workflow: Context Asset Versioning → Rollback', () => {
    let contextApp;
    let mockSupabase;

    beforeEach(() => {
      jest.clearAllMocks();
      process.env.ANTHROPIC_API_KEY = 'test-key';

      const testApp = createAuthenticatedTestApp({ routes: ['context'] });
      contextApp = testApp.app;
      mockSupabase = testApp.mockSupabase;
    });

    it('should create asset → update multiple times → rollback to specific version', async () => {
      // Step 1: Create initial asset
      const v1Asset = {
        id: 'versioned-asset-001',
        asset_type: 'company_description',
        name: 'Company Description',
        content_json: { mission: 'Version 1 mission' },
        content_text: 'Version 1 mission',
        version: 1
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'context_assets') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: v1Asset, error: null })
          };
        }
        return createQueryBuilder();
      });

      const createResponse = await request(contextApp)
        .post('/api/context/assets')
        .send({
          asset_type: 'company_description',
          name: 'Company Description',
          content_json: { mission: 'Version 1 mission' }
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.version).toBe(1);
      const assetId = createResponse.body.data.id;

      // Step 2: Update to v2
      const v2Asset = { ...v1Asset, content_json: { mission: 'Version 2 mission' }, version: 2 };
      let fetchCount = 0;

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'context_assets') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(() => {
              fetchCount++;
              if (fetchCount === 1) return Promise.resolve({ data: v1Asset, error: null });
              return Promise.resolve({ data: v2Asset, error: null });
            }),
            update: jest.fn().mockReturnThis()
          };
        }
        if (table === 'context_asset_versions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
            insert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return createQueryBuilder();
      });

      const updateResponse = await request(contextApp)
        .put(`/api/context/assets/${assetId}`)
        .send({ content_json: { mission: 'Version 2 mission' } })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);

      // Step 3: Update to v3
      fetchCount = 0;
      const v3Asset = { ...v2Asset, content_json: { mission: 'Version 3 mission' }, version: 3 };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'context_assets') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(() => {
              fetchCount++;
              if (fetchCount === 1) return Promise.resolve({ data: v2Asset, error: null });
              return Promise.resolve({ data: v3Asset, error: null });
            }),
            update: jest.fn().mockReturnThis()
          };
        }
        if (table === 'context_asset_versions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
            insert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return createQueryBuilder();
      });

      await request(contextApp)
        .put(`/api/context/assets/${assetId}`)
        .send({ content_json: { mission: 'Version 3 mission' } })
        .expect(200);

      // Step 4: Get version history
      const versions = [
        { id: 'ver-3', asset_id: assetId, version: 3, content_json: { mission: 'Version 3' } },
        { id: 'ver-2', asset_id: assetId, version: 2, content_json: { mission: 'Version 2' } },
        { id: 'ver-1', asset_id: assetId, version: 1, content_json: { mission: 'Version 1' } }
      ];

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'context_asset_versions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: versions, error: null })
          };
        }
        return createQueryBuilder();
      });

      const historyResponse = await request(contextApp)
        .get(`/api/context/assets/${assetId}/versions`)
        .expect(200);

      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.data).toHaveLength(3);

      // Step 5: Rollback to v1
      const v1Version = { id: 'ver-1', asset_id: assetId, version: 1, content_json: { mission: 'Version 1' }, content_text: 'Version 1' };
      const rolledBackAsset = { ...v1Asset, version: 4 };
      let rollbackCallCount = 0;

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'context_asset_versions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: v1Version, error: null }),
            insert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        if (table === 'context_assets') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(() => {
              rollbackCallCount++;
              if (rollbackCallCount <= 2) return Promise.resolve({ data: v3Asset, error: null });
              return Promise.resolve({ data: rolledBackAsset, error: null });
            }),
            update: jest.fn().mockReturnThis()
          };
        }
        return createQueryBuilder();
      });

      const rollbackResponse = await request(contextApp)
        .post(`/api/context/assets/${assetId}/rollback`)
        .send({ version: 1 })
        .expect(200);

      expect(rollbackResponse.body.success).toBe(true);
      expect(rollbackResponse.body.message).toBe('Rolled back to version 1');
    });
  });

  // =============================================
  // WORKFLOW 3: Action Creation → Parthenon Linking → Execution
  // =============================================
  describe('Workflow: Action Creation → Parthenon Linking → Execution', () => {
    let actionsApp, parthenonApp;
    let mockSupabase;

    beforeEach(() => {
      jest.clearAllMocks();
      process.env.ANTHROPIC_API_KEY = 'test-key';

      const actionsTestApp = createAuthenticatedTestApp({ routes: ['actions'] });
      actionsApp = actionsTestApp.app;
      mockSupabase = actionsTestApp.mockSupabase;

      const parthenonTestApp = createAuthenticatedTestApp({ routes: ['parthenon'] });
      parthenonApp = parthenonTestApp.app;
    });

    it('should create action → link to OKR and department → execute', async () => {
      // Step 1: Create a department
      const department = {
        id: 'dept-001',
        name: 'Sales',
        description: 'Sales department',
        is_active: true
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'departments') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: department, error: null })
          };
        }
        return createQueryBuilder();
      });

      const deptResponse = await request(parthenonApp)
        .post('/api/parthenon/departments')
        .send({ name: 'Sales', description: 'Sales department' })
        .expect(201);

      expect(deptResponse.body.success).toBe(true);

      // Step 2: Create an OKR
      const okr = {
        id: 'okr-001',
        title: 'Increase Revenue',
        scope: 'company',
        period: 'Q1-2024',
        status: 'active',
        progress: 0
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'okrs') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: okr, error: null })
          };
        }
        return createQueryBuilder();
      });

      const okrResponse = await request(parthenonApp)
        .post('/api/parthenon/okrs')
        .send({ title: 'Increase Revenue', period: 'Q1-2024' })
        .expect(201);

      expect(okrResponse.body.success).toBe(true);

      // Step 3: Create an action
      const action = {
        id: 'action-001',
        name: 'Sales Email Composer',
        slug: 'sales-email-composer',
        suite: 'execute',
        status: 'active',
        ai_engine: { type: 'native', native: { model: 'claude-sonnet-4' } },
        usage_count: 0
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'actions') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: action, error: null })
          };
        }
        return createQueryBuilder();
      });

      const actionResponse = await request(actionsApp)
        .post('/api/actions')
        .send({
          name: 'Sales Email Composer',
          slug: 'sales-email-composer',
          description: 'Compose sales emails'
        })
        .expect(201);

      expect(actionResponse.body.success).toBe(true);
      const actionId = actionResponse.body.data.id;

      // Step 4: Link action to department
      const deptLink = {
        id: 'link-dept-001',
        action_id: actionId,
        department_id: department.id,
        departments: department
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'action_departments') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: deptLink, error: null })
          };
        }
        return createQueryBuilder();
      });

      const deptLinkResponse = await request(actionsApp)
        .post(`/api/actions/${actionId}/departments`)
        .send({ department_id: department.id })
        .expect(201);

      expect(deptLinkResponse.body.success).toBe(true);

      // Step 5: Link action to OKR
      const okrLink = {
        id: 'link-okr-001',
        action_id: actionId,
        okr_id: okr.id,
        okrs: okr
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'action_okrs') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: okrLink, error: null })
          };
        }
        return createQueryBuilder();
      });

      const okrLinkResponse = await request(actionsApp)
        .post(`/api/actions/${actionId}/okrs`)
        .send({ okr_id: okr.id, relationship: 'supports' })
        .expect(201);

      expect(okrLinkResponse.body.success).toBe(true);

      // Step 6: Execute the action
      let execCallCount = 0;
      mockSupabase.from.mockImplementation((table) => {
        execCallCount++;
        if (table === 'actions') {
          if (execCallCount === 1) {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: action, error: null })
            };
          }
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
              data: { id: 'exec-001', status: 'completed', output_data: { response: 'Sales email generated' } },
              error: null
            })
          };
        }
        return createQueryBuilder();
      });

      const executeResponse = await request(actionsApp)
        .post(`/api/actions/${actionId}/execute`)
        .send({ input_data: { topic: 'Product demo request' } })
        .expect(200);

      expect(executeResponse.body.success).toBe(true);
      expect(executeResponse.body.data.execution_id).toBeDefined();
      expect(executeResponse.body.data.output).toBeDefined();
    });
  });

  // =============================================
  // WORKFLOW 4: Parthenon Organizational Setup
  // =============================================
  describe('Workflow: Parthenon Organizational Setup', () => {
    let parthenonApp;
    let mockSupabase;

    beforeEach(() => {
      jest.clearAllMocks();

      const testApp = createAuthenticatedTestApp({ routes: ['parthenon'] });
      parthenonApp = testApp.app;
      mockSupabase = testApp.mockSupabase;
    });

    it('should seed defaults → create roles → create OKRs → link to strategic objectives', async () => {
      // Step 1: Seed default departments
      const seededDepts = Array(8).fill(null).map((_, i) => ({
        id: `dept-${i}`,
        name: ['Executive', 'Finance', 'Operations', 'Sales', 'Marketing', 'Production', 'Service', 'Stakeholder Relations'][i],
        is_active: true
      }));

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'departments') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue({ data: seededDepts, error: null })
          };
        }
        return createQueryBuilder();
      });

      const seedResponse = await request(parthenonApp)
        .post('/api/parthenon/seed-defaults')
        .expect(201);

      expect(seedResponse.body.success).toBe(true);
      expect(seedResponse.body.message).toContain('8 default departments created');

      // Step 2: Create a role in Sales department
      const role = {
        id: 'role-001',
        title: 'Sales Manager',
        department_id: 'dept-3',
        level: 'manager',
        responsibilities: ['Lead sales team', 'Hit revenue targets']
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'roles') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: role, error: null })
          };
        }
        return createQueryBuilder();
      });

      const roleResponse = await request(parthenonApp)
        .post('/api/parthenon/roles')
        .send({
          title: 'Sales Manager',
          department_id: 'dept-3',
          level: 'manager',
          responsibilities: ['Lead sales team', 'Hit revenue targets']
        })
        .expect(201);

      expect(roleResponse.body.success).toBe(true);

      // Step 3: Create company-level OKR
      const companyOKR = {
        id: 'okr-company-001',
        title: 'Increase Annual Revenue by 30%',
        scope: 'company',
        period: '2024',
        status: 'active',
        key_results: [
          { title: 'Q1 Revenue $1M', target: 1000000, current: 0 },
          { title: 'Q2 Revenue $1.2M', target: 1200000, current: 0 }
        ]
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'okrs') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: companyOKR, error: null })
          };
        }
        return createQueryBuilder();
      });

      const companyOKRResponse = await request(parthenonApp)
        .post('/api/parthenon/okrs')
        .send({
          title: 'Increase Annual Revenue by 30%',
          scope: 'company',
          period: '2024',
          key_results: companyOKR.key_results
        })
        .expect(201);

      expect(companyOKRResponse.body.success).toBe(true);

      // Step 4: Create department OKR cascaded from company OKR
      const deptOKR = {
        id: 'okr-dept-001',
        title: 'Sales Team Quarterly Target',
        scope: 'department',
        department_id: 'dept-3',
        parent_okr_id: companyOKR.id,
        period: 'Q1-2024',
        status: 'active'
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'okrs') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: deptOKR, error: null })
          };
        }
        return createQueryBuilder();
      });

      const deptOKRResponse = await request(parthenonApp)
        .post('/api/parthenon/okrs')
        .send({
          title: 'Sales Team Quarterly Target',
          scope: 'department',
          department_id: 'dept-3',
          parent_okr_id: companyOKR.id,
          period: 'Q1-2024'
        })
        .expect(201);

      expect(deptOKRResponse.body.success).toBe(true);

      // Step 5: Link OKR to BSC strategic objective
      const strategicLink = {
        id: 'link-001',
        okr_id: companyOKR.id,
        bsc_objective_id: 'obj-financial-001',
        link_type: 'supports',
        is_primary: true,
        bsc_objectives: {
          id: 'obj-financial-001',
          name: 'Increase Profitability',
          bsc_perspectives: {
            id: 'persp-001',
            name: 'Financial',
            perspective_type: 'financial',
            color: '#10b981'
          }
        }
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'okr_strategic_links') {
          return {
            update: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: strategicLink, error: null })
          };
        }
        return createQueryBuilder();
      });

      const linkResponse = await request(parthenonApp)
        .post(`/api/parthenon/okrs/${companyOKR.id}/strategic-links`)
        .send({
          bsc_objective_id: 'obj-financial-001',
          link_type: 'supports',
          is_primary: true
        })
        .expect(201);

      expect(linkResponse.body.success).toBe(true);
      expect(linkResponse.body.data.perspective_type).toBe('financial');

      // Step 6: Get alignment summary
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'okrs') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [companyOKR, deptOKR],
              error: null
            })
          };
        }
        if (table === 'okr_strategic_links') {
          return {
            select: jest.fn().mockResolvedValue({
              data: [{
                okr_id: companyOKR.id,
                bsc_objectives: { bsc_perspectives: { perspective_type: 'financial' } }
              }],
              error: null
            })
          };
        }
        return createQueryBuilder();
      });

      const alignmentResponse = await request(parthenonApp)
        .get('/api/parthenon/alignment-summary')
        .expect(200);

      expect(alignmentResponse.body.success).toBe(true);
      expect(alignmentResponse.body.data.total_okrs).toBe(2);
      expect(alignmentResponse.body.data.linked).toBe(1);
      expect(alignmentResponse.body.data.alignment_rate).toBe(50);
    });
  });

  // =============================================
  // WORKFLOW 5: Complete Content Creation Flow
  // =============================================
  describe('Workflow: Complete Content Creation Flow', () => {
    let combinedApp;
    let mockSupabase;

    beforeEach(() => {
      jest.clearAllMocks();
      process.env.ANTHROPIC_API_KEY = 'test-key';

      // Create a single app with all routes
      const testApp = createAuthenticatedTestApp({ routes: ['context', 'actions'] });
      combinedApp = testApp.app;
      mockSupabase = testApp.mockSupabase;

      // Mock fetch for AI generation
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: '# Generated Company Description\n\nOur company excels at innovation.' }],
          usage: { input_tokens: 500, output_tokens: 200 }
        })
      });
    });

    afterEach(() => {
      delete global.fetch;
    });

    it('should generate context → create action → link context → execute', async () => {
      // Step 1: Generate context asset using AI
      const generateResponse = await request(combinedApp)
        .post('/api/context/generate')
        .send({
          asset_type: 'company_description',
          description: 'A tech startup focused on AI solutions'
        })
        .expect(200);

      expect(generateResponse.body.success).toBe(true);
      expect(generateResponse.body.content).toContain('Generated Company Description');

      // Step 2: Save generated content as asset
      const savedAsset = {
        id: 'generated-asset-001',
        asset_type: 'company_description',
        name: 'AI-Generated Company Description',
        content_text: generateResponse.body.content,
        version: 1
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'context_assets') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: savedAsset, error: null })
          };
        }
        return createQueryBuilder();
      });

      const saveResponse = await request(combinedApp)
        .post('/api/context/assets')
        .send({
          asset_type: 'company_description',
          name: 'AI-Generated Company Description',
          content_text: generateResponse.body.content
        })
        .expect(201);

      expect(saveResponse.body.success).toBe(true);

      // Step 3: Create a content creation action
      const action = {
        id: 'content-action-001',
        name: 'Blog Post Generator',
        slug: 'blog-post-generator',
        suite: 'create',
        status: 'active',
        ai_engine: { type: 'native', native: { model: 'claude-sonnet-4' } },
        usage_count: 0
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'actions') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: action, error: null })
          };
        }
        return createQueryBuilder();
      });

      const actionResponse = await request(combinedApp)
        .post('/api/actions')
        .send({
          name: 'Blog Post Generator',
          slug: 'blog-post-generator',
          suite: 'create'
        })
        .expect(201);

      expect(actionResponse.body.success).toBe(true);
      const actionId = actionResponse.body.data.id;

      // Step 4: Link context asset to action
      const assetLink = {
        id: 'link-001',
        action_id: actionId,
        asset_id: savedAsset.id,
        context_assets: savedAsset
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'action_context_assets') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: assetLink, error: null })
          };
        }
        return createQueryBuilder();
      });

      const linkResponse = await request(combinedApp)
        .post(`/api/actions/${actionId}/assets`)
        .send({
          asset_id: savedAsset.id,
          injection_mode: 'always'
        })
        .expect(201);

      expect(linkResponse.body.success).toBe(true);

      // Step 5: Execute action to generate blog post
      let execCallCount = 0;
      mockSupabase.from.mockImplementation((table) => {
        execCallCount++;
        if (table === 'actions') {
          if (execCallCount === 1) {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: action, error: null })
            };
          }
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
              data: {
                id: 'exec-001',
                status: 'completed',
                output_data: { response: 'Blog post about AI innovation...' }
              },
              error: null
            })
          };
        }
        return createQueryBuilder();
      });

      const executeResponse = await request(combinedApp)
        .post(`/api/actions/${actionId}/execute`)
        .send({
          input_data: { topic: 'AI Innovation Trends 2024' }
        })
        .expect(200);

      expect(executeResponse.body.success).toBe(true);
      expect(executeResponse.body.data.output.response).toContain('AI');
    });
  });
});
