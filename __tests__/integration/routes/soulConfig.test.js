/**
 * Soul Configuration Routes Integration Tests
 *
 * Tests API endpoints for:
 * - Soul Configuration CRUD
 * - Version Management
 * - Ethical Framework endpoints
 * - Values Alignment endpoints
 */

const request = require('supertest');
const { createTestApp, createAuthenticatedTestApp, mockResponses } = require('../../setup/testApp');
const { createMockSupabase, createQueryBuilder } = require('../../setup/mockSupabase');
const {
  testSoulConfigurations,
  testEthicalLenses,
  testEthicalEvaluations,
  testBrightLineIncidents,
  testValuesAlignmentAudits
} = require('../../fixtures/testData');

// Mock the services that the routes use
jest.mock('../../../server/services/soulConfigService');
jest.mock('../../../server/services/ethicalContextService');
jest.mock('../../../server/services/valuesAlignmentService');

const soulConfigService = require('../../../server/services/soulConfigService');
const ethicalContextService = require('../../../server/services/ethicalContextService');
const valuesAlignmentService = require('../../../server/services/valuesAlignmentService');

describe('Soul Configuration Routes Integration Tests', () => {
  let app, mockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabase();
    const testApp = createAuthenticatedTestApp({
      routes: ['soul-config'],
      mockSupabase,
      userId: 'test-user-001',
      userRole: 'user'
    });
    app = testApp.app;
    mockSupabase = testApp.mockSupabase;
  });

  // ============================================
  // GET /api/soul-config (List)
  // ============================================
  describe('GET /api/soul-config', () => {
    test('should list all soul configurations', async () => {
      const mockConfigs = [
        testSoulConfigurations.platform,
        testSoulConfigurations.acmeOrg
      ];
      soulConfigService.listSoulConfigs.mockResolvedValue(mockConfigs);

      const response = await request(app)
        .get('/api/soul-config')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
      expect(soulConfigService.listSoulConfigs).toHaveBeenCalled();
    });

    test('should filter by scope_type', async () => {
      const mockConfigs = [testSoulConfigurations.acmeOrg];
      soulConfigService.listSoulConfigs.mockResolvedValue(mockConfigs);

      const response = await request(app)
        .get('/api/soul-config?scope_type=organization')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(soulConfigService.listSoulConfigs).toHaveBeenCalledWith(
        expect.objectContaining({ scope_type: 'organization' })
      );
    });

    test('should filter by org_id', async () => {
      soulConfigService.listSoulConfigs.mockResolvedValue([]);

      await request(app)
        .get('/api/soul-config?org_id=test-org-acme-001')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(soulConfigService.listSoulConfigs).toHaveBeenCalledWith(
        expect.objectContaining({ org_id: 'test-org-acme-001' })
      );
    });

    test('should filter by is_active', async () => {
      soulConfigService.listSoulConfigs.mockResolvedValue([]);

      await request(app)
        .get('/api/soul-config?is_active=true')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(soulConfigService.listSoulConfigs).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: true })
      );
    });

    test('should return 500 on service error', async () => {
      soulConfigService.listSoulConfigs.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/soul-config')
        .set('Cookie', 'auth_token=valid-token')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database error');
    });
  });

  // ============================================
  // GET /api/soul-config/:id (Get Single)
  // ============================================
  describe('GET /api/soul-config/:id', () => {
    test('should return specific soul configuration', async () => {
      soulConfigService.getSoulConfig.mockResolvedValue(testSoulConfigurations.acmeOrg);

      const response = await request(app)
        .get('/api/soul-config/test-soul-acme-001')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('test-soul-acme-001');
      expect(soulConfigService.getSoulConfig).toHaveBeenCalledWith('test-soul-acme-001');
    });

    test('should return 404 when not found', async () => {
      soulConfigService.getSoulConfig.mockRejectedValue(new Error('Soul configuration not found'));

      const response = await request(app)
        .get('/api/soul-config/nonexistent')
        .set('Cookie', 'auth_token=valid-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Soul configuration not found');
    });
  });

  // ============================================
  // GET /api/soul-config/resolve/:orgId (Resolve Inheritance)
  // ============================================
  describe('GET /api/soul-config/resolve/:orgId', () => {
    test('should resolve inherited configuration', async () => {
      const resolvedConfig = {
        resolved: true,
        sources: [{ id: 'test-soul-platform-001', scope_type: 'platform' }],
        config: testSoulConfigurations.platform
      };
      soulConfigService.resolveInheritedSoulConfig.mockResolvedValue(resolvedConfig);

      const response = await request(app)
        .get('/api/soul-config/resolve/test-org-acme-001')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resolved).toBe(true);
      expect(soulConfigService.resolveInheritedSoulConfig).toHaveBeenCalledWith({
        orgId: 'test-org-acme-001',
        departmentId: undefined,
        clientId: undefined,
        agentId: undefined
      });
    });

    test('should pass additional scope parameters', async () => {
      const resolvedConfig = { resolved: true, sources: [], config: {} };
      soulConfigService.resolveInheritedSoulConfig.mockResolvedValue(resolvedConfig);

      await request(app)
        .get('/api/soul-config/resolve/test-org-acme-001?departmentId=dept-001&agentId=agent-001')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(soulConfigService.resolveInheritedSoulConfig).toHaveBeenCalledWith({
        orgId: 'test-org-acme-001',
        departmentId: 'dept-001',
        clientId: undefined,
        agentId: 'agent-001'
      });
    });
  });

  // ============================================
  // POST /api/soul-config (Create)
  // ============================================
  describe('POST /api/soul-config', () => {
    test('should create organization soul configuration', async () => {
      const newConfig = {
        scope_type: 'organization',
        org_id: 'test-org-acme-001',
        identity: { name: 'New Bot' },
        values: []
      };
      const createdConfig = { id: 'new-config-id', ...newConfig };
      soulConfigService.createSoulConfig.mockResolvedValue(createdConfig);

      const response = await request(app)
        .post('/api/soul-config')
        .set('Cookie', 'auth_token=valid-token')
        .send(newConfig)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('new-config-id');
      expect(response.body.message).toBe('Soul configuration created');
    });

    test('should return 400 when scope_type is missing', async () => {
      const response = await request(app)
        .post('/api/soul-config')
        .set('Cookie', 'auth_token=valid-token')
        .send({ identity: { name: 'Test' } })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('scope_type is required');
    });

    test('should return 400 for invalid scope_type', async () => {
      const response = await request(app)
        .post('/api/soul-config')
        .set('Cookie', 'auth_token=valid-token')
        .send({ scope_type: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('scope_type must be one of');
    });

    test('should return 403 when creating platform config without admin', async () => {
      const response = await request(app)
        .post('/api/soul-config')
        .set('Cookie', 'auth_token=valid-token')
        .send({ scope_type: 'platform' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('platform admins');
    });
  });

  // ============================================
  // PUT /api/soul-config/:id (Update)
  // ============================================
  describe('PUT /api/soul-config/:id', () => {
    test('should update soul configuration', async () => {
      const updates = {
        values: [{ name: 'New Value', meaning: 'Test' }],
        change_reason: 'Added new value'
      };
      const updatedConfig = { ...testSoulConfigurations.acmeOrg, ...updates };
      soulConfigService.updateSoulConfig.mockResolvedValue(updatedConfig);

      const response = await request(app)
        .put('/api/soul-config/test-soul-acme-001')
        .set('Cookie', 'auth_token=valid-token')
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Soul configuration updated');
      expect(soulConfigService.updateSoulConfig).toHaveBeenCalledWith(
        'test-soul-acme-001',
        expect.not.objectContaining({ change_reason: expect.anything() }),
        'test-user-001',
        'Added new value'
      );
    });
  });

  // ============================================
  // POST /api/soul-config/:id/publish (Publish)
  // ============================================
  describe('POST /api/soul-config/:id/publish', () => {
    test('should publish draft configuration', async () => {
      const publishedConfig = {
        ...testSoulConfigurations.draftConfig,
        is_draft: false,
        is_active: true
      };
      soulConfigService.publishSoulConfig.mockResolvedValue(publishedConfig);

      const response = await request(app)
        .post('/api/soul-config/test-soul-draft-001/publish')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Soul configuration published and activated');
    });
  });

  // ============================================
  // DELETE /api/soul-config/:id (Delete)
  // ============================================
  describe('DELETE /api/soul-config/:id', () => {
    test('should deactivate soul configuration', async () => {
      soulConfigService.deleteSoulConfig.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/soul-config/test-soul-acme-001')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Soul configuration deactivated');
    });
  });

  // ============================================
  // GET /api/soul-config/:id/versions (Version History)
  // ============================================
  describe('GET /api/soul-config/:id/versions', () => {
    test('should return version history', async () => {
      const versions = [
        { version: 2, change_summary: 'Updated values' },
        { version: 1, change_summary: 'Initial creation' }
      ];
      soulConfigService.getVersionHistory.mockResolvedValue(versions);

      const response = await request(app)
        .get('/api/soul-config/test-soul-acme-001/versions')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });
  });

  // ============================================
  // POST /api/soul-config/:id/rollback (Rollback)
  // ============================================
  describe('POST /api/soul-config/:id/rollback', () => {
    test('should rollback to specified version', async () => {
      const rolledBackConfig = { ...testSoulConfigurations.acmeOrg, version: 3 };
      soulConfigService.rollbackToVersion.mockResolvedValue(rolledBackConfig);

      const response = await request(app)
        .post('/api/soul-config/test-soul-acme-001/rollback')
        .set('Cookie', 'auth_token=valid-token')
        .send({ version: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Rolled back to version 1');
    });

    test('should return 400 when version is missing', async () => {
      const response = await request(app)
        .post('/api/soul-config/test-soul-acme-001/rollback')
        .set('Cookie', 'auth_token=valid-token')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('version is required');
    });
  });

  // ============================================
  // GET /api/soul-config/ethical-lenses (Get Lenses)
  // ============================================
  describe('GET /api/soul-config/ethical-lenses', () => {
    test('should return all ethical lenses', async () => {
      const lenses = Object.values(testEthicalLenses);
      ethicalContextService.getEthicalLenses.mockResolvedValue(lenses);

      const response = await request(app)
        .get('/api/soul-config/ethical-lenses')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(6);
      expect(response.body.count).toBe(6);
    });
  });

  // ============================================
  // POST /api/soul-config/detect-stakes (Detect Stakes)
  // ============================================
  describe('POST /api/soul-config/detect-stakes', () => {
    test('should detect stakes level from message', async () => {
      ethicalContextService.detectStakesLevel.mockReturnValue('high');

      const response = await request(app)
        .post('/api/soul-config/detect-stakes')
        .set('Cookie', 'auth_token=valid-token')
        .send({ message: 'Should we fire this employee?', context: {} })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stakesLevel).toBe('high');
      expect(response.body.data.description).toBeDefined();
    });
  });

  // ============================================
  // POST /api/soul-config/ethical-evaluation (Log Evaluation)
  // ============================================
  describe('POST /api/soul-config/ethical-evaluation', () => {
    test('should log ethical evaluation', async () => {
      const evaluation = testEthicalEvaluations.mediumStakes;
      ethicalContextService.logEthicalEvaluation.mockResolvedValue(evaluation);

      const response = await request(app)
        .post('/api/soul-config/ethical-evaluation')
        .set('Cookie', 'auth_token=valid-token')
        .send({
          agentId: 'test-agent-001',
          decisionSummary: 'Test decision',
          stakesLevel: 'medium'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Ethical evaluation logged');
    });
  });

  // ============================================
  // POST /api/soul-config/values-alignment/audit (Run Audit)
  // ============================================
  describe('POST /api/soul-config/values-alignment/audit', () => {
    test('should perform values alignment audit', async () => {
      const audit = testValuesAlignmentAudits.acmeAudit;
      valuesAlignmentService.performValuesAlignmentAudit.mockResolvedValue(audit);

      const response = await request(app)
        .post('/api/soul-config/values-alignment/audit')
        .set('Cookie', 'auth_token=valid-token')
        .send({ orgId: 'test-org-acme-001' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overall_score).toBe(86.5);
    });

    test('should return 400 when orgId is missing', async () => {
      const response = await request(app)
        .post('/api/soul-config/values-alignment/audit')
        .set('Cookie', 'auth_token=valid-token')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('orgId is required');
    });
  });

  // ============================================
  // GET /api/soul-config/values-alignment/history/:orgId (Audit History)
  // ============================================
  describe('GET /api/soul-config/values-alignment/history/:orgId', () => {
    test('should return audit history', async () => {
      const history = [testValuesAlignmentAudits.acmeAudit];
      valuesAlignmentService.getAuditHistory.mockResolvedValue(history);

      const response = await request(app)
        .get('/api/soul-config/values-alignment/history/test-org-acme-001')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    test('should respect limit parameter', async () => {
      valuesAlignmentService.getAuditHistory.mockResolvedValue([]);

      await request(app)
        .get('/api/soul-config/values-alignment/history/test-org-acme-001?limit=5')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(valuesAlignmentService.getAuditHistory).toHaveBeenCalledWith(
        'test-org-acme-001',
        5
      );
    });
  });

  // ============================================
  // GET /api/soul-config/integrity-metrics/:orgId (Integrity Metrics)
  // ============================================
  describe('GET /api/soul-config/integrity-metrics/:orgId', () => {
    test('should return integrity metrics', async () => {
      const metrics = {
        period: { days: 30 },
        evaluations: { total: 10, highStakes: 2 },
        incidents: { total: 1, violations: 0 },
        metrics: { integrityYield: 95 }
      };
      ethicalContextService.calculateIntegrityMetrics.mockResolvedValue(metrics);

      const response = await request(app)
        .get('/api/soul-config/integrity-metrics/test-org-acme-001')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metrics.integrityYield).toBe(95);
    });

    test('should respect days parameter', async () => {
      ethicalContextService.calculateIntegrityMetrics.mockResolvedValue({});

      await request(app)
        .get('/api/soul-config/integrity-metrics/test-org-acme-001?days=60')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(ethicalContextService.calculateIntegrityMetrics).toHaveBeenCalledWith(
        'test-org-acme-001',
        60
      );
    });
  });

  // ============================================
  // GET /api/soul-config/bright-line-incidents/:orgId (Get Incidents)
  // ============================================
  describe('GET /api/soul-config/bright-line-incidents/:orgId', () => {
    test('should return bright line incidents', async () => {
      const incidents = [testBrightLineIncidents.nearMiss, testBrightLineIncidents.violation];
      ethicalContextService.getBrightLineIncidents.mockResolvedValue(incidents);

      const response = await request(app)
        .get('/api/soul-config/bright-line-incidents/test-org-acme-001')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });

    test('should filter by incident_type', async () => {
      ethicalContextService.getBrightLineIncidents.mockResolvedValue([]);

      await request(app)
        .get('/api/soul-config/bright-line-incidents/test-org-acme-001?incident_type=violation')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(ethicalContextService.getBrightLineIncidents).toHaveBeenCalledWith(
        'test-org-acme-001',
        expect.objectContaining({ incidentType: 'violation' })
      );
    });
  });

  // ============================================
  // POST /api/soul-config/bright-line-incident (Report Incident)
  // ============================================
  describe('POST /api/soul-config/bright-line-incident', () => {
    test('should report bright line incident', async () => {
      const incident = testBrightLineIncidents.violation;
      ethicalContextService.logBrightLineIncident.mockResolvedValue(incident);

      const response = await request(app)
        .post('/api/soul-config/bright-line-incident')
        .set('Cookie', 'auth_token=valid-token')
        .send({
          orgId: 'test-org-acme-001',
          brightLineName: 'Regulatory Compliance',
          incidentType: 'violation',
          description: 'Compliance issue found',
          severity: 'high'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Bright line incident reported');
    });
  });

  // ============================================
  // PUT /api/soul-config/bright-line-incident/:id/resolve (Resolve Incident)
  // ============================================
  describe('PUT /api/soul-config/bright-line-incident/:id/resolve', () => {
    test('should resolve bright line incident', async () => {
      const resolvedIncident = {
        ...testBrightLineIncidents.violation,
        status: 'resolved',
        resolution_notes: 'Issue fixed'
      };
      ethicalContextService.resolveBrightLineIncident.mockResolvedValue(resolvedIncident);

      const response = await request(app)
        .put('/api/soul-config/bright-line-incident/test-incident-002/resolve')
        .set('Cookie', 'auth_token=valid-token')
        .send({ resolutionNotes: 'Issue fixed' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Incident resolved');
    });
  });

  // ============================================
  // GET /api/soul-config/:id/export (Export Soul.md)
  // ============================================
  describe('GET /api/soul-config/:id/export', () => {
    test('should export as JSON with markdown', async () => {
      const markdown = '# Test Soul Configuration\n\nContent here...';
      soulConfigService.generateSoulMd.mockResolvedValue(markdown);

      const response = await request(app)
        .get('/api/soul-config/test-soul-acme-001/export')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.markdown).toBe(markdown);
      expect(response.body.data.format).toBe('markdown');
    });

    test('should export as downloadable file', async () => {
      const markdown = '# Test Soul Configuration';
      soulConfigService.generateSoulMd.mockResolvedValue(markdown);

      const response = await request(app)
        .get('/api/soul-config/test-soul-acme-001/export?format=download')
        .set('Cookie', 'auth_token=valid-token')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/markdown; charset=utf-8');
      expect(response.headers['content-disposition']).toBe('attachment; filename="soul.md"');
      expect(response.text).toBe(markdown);
    });
  });
});
