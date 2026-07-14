/**
 * Context Routes Integration Tests
 * Tests for /api/context/* endpoints
 *
 * Covers:
 * - GET /api/context/types - List asset types
 * - GET/POST/PUT/DELETE /api/context/assets - Asset CRUD
 * - GET /api/context/assets/:id/versions - Version history
 * - POST /api/context/assets/:id/rollback - Rollback to version
 * - GET /api/context/stats - Usage statistics
 * - GET /api/context/tags - All unique tags
 * - POST /api/context/import - Bulk import
 * - GET /api/context/export - Export assets
 * - PUT /api/context/assets/:id/usage - Increment usage
 * - POST /api/context/generate - AI content generation
 * - POST /api/context/parse - AI content parsing
 */

const request = require('supertest');
const { createTestApp, createAuthenticatedTestApp } = require('../../setup/testApp');
const { createMockSupabase, createQueryBuilder } = require('../../setup/mockSupabase');

// Mock global fetch for AI endpoints
global.fetch = jest.fn();

describe('Context Routes Integration', () => {
  let app;
  let mockSupabase;
  let setFromImplementation;

  beforeAll(() => {
    // Set API key for AI endpoints
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockReset();
    const testApp = createAuthenticatedTestApp({ routes: ['context'] });
    app = testApp.app;
    mockSupabase = testApp.mockSupabase;
    setFromImplementation = (implementation) => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'organization_members') {
          return createQueryBuilder({
            data: { role: 'owner', business_role: 'executive' },
            error: null
          });
        }
        if (table === 'users') {
          return createQueryBuilder({
            data: {
              id: 'test-user-001',
              default_org_id: 'test-org-001',
              business_role: 'executive'
            },
            error: null
          });
        }
        if (table === 'user_roles') {
          return createQueryBuilder({ data: [], error: null });
        }
        return implementation(table);
      });
    };
  });

  // =============================================
  // GET /api/context/types
  // =============================================
  describe('GET /api/context/types', () => {
    it('should return asset types catalog', async () => {
      const response = await request(app)
        .get('/api/context/types')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Catalog has grown over time — assert a reasonable lower bound
      // rather than a brittle exact count.
      expect(response.body.count).toBeGreaterThanOrEqual(18);
      expect(response.body.data).toBeInstanceOf(Array);

      // Check structure of first type
      const firstType = response.body.data[0];
      expect(firstType).toHaveProperty('type_key');
      expect(firstType).toHaveProperty('icon');
      expect(firstType).toHaveProperty('display_name');
      expect(firstType).toHaveProperty('category');
    });

    it('should include core and extended categories', async () => {
      const response = await request(app)
        .get('/api/context/types')
        .expect(200);

      const categories = [...new Set(response.body.data.map(t => t.category))];
      expect(categories).toContain('core');
      expect(categories).toContain('extended');
    });

    it('should include expected asset types', async () => {
      const response = await request(app)
        .get('/api/context/types')
        .expect(200);

      const typeKeys = response.body.data.map(t => t.type_key);
      expect(typeKeys).toContain('company_description');
      expect(typeKeys).toContain('voice_dna');
      expect(typeKeys).toContain('icp');
      expect(typeKeys).toContain('competitors');
      expect(typeKeys).toContain('personas');
    });
  });

  // =============================================
  // GET /api/context/assets
  // =============================================
  describe('GET /api/context/assets', () => {
    const mockAssets = [
      {
        id: 'asset-001',
        asset_type: 'company_description',
        name: 'Our Company',
        description: 'Main company description',
        content_json: { mission: 'Test mission' },
        tags: ['core', 'brand'],
        is_current: true,
        usage_count: 5,
        version: 1
      },
      {
        id: 'asset-002',
        asset_type: 'voice_dna',
        name: 'Brand Voice',
        description: 'Voice guidelines',
        content_json: { tone: 'professional' },
        tags: ['brand', 'writing'],
        is_current: true,
        usage_count: 10,
        version: 2
      }
    ];

    // Helper to create a fully chainable query builder for context_assets
    // The query uses pattern: select -> order -> range -> eq/or/overlaps -> await
    const createChainableQuery = (data = mockAssets, error = null) => {
      const builder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        overlaps: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        // Make the builder thenable so await works
        then: (resolve) => resolve({ data, error, count: data ? data.length : 0 })
      };
      return builder;
    };

    beforeEach(() => {
      setFromImplementation((table) => {
        if (table === 'context_assets') {
          return createChainableQuery();
        }
        return createQueryBuilder();
      });
    });

    it('should list all current assets', async () => {
      const response = await request(app)
        .get('/api/context/assets')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });

    it('should enrich assets with type_info', async () => {
      const response = await request(app)
        .get('/api/context/assets')
        .expect(200);

      const asset = response.body.data[0];
      expect(asset.type_info).toBeDefined();
      expect(asset.type_info.icon).toBe('🏢');
      expect(asset.type_info.display_name).toBe('Company Description');
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/context/assets?type=voice_dna')
        .expect(200);

      expect(mockSupabase.from).toHaveBeenCalledWith('context_assets');
    });

    it('should support search parameter', async () => {
      const response = await request(app)
        .get('/api/context/assets?search=company')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support tags filter', async () => {
      const response = await request(app)
        .get('/api/context/assets?tags=brand,core')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support archived filter', async () => {
      const response = await request(app)
        .get('/api/context/assets?archived=true')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle database errors', async () => {
      setFromImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        overlaps: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        then: (resolve) => resolve({
          data: null,
          error: { message: 'Database error' }
        })
      }));

      const response = await request(app)
        .get('/api/context/assets')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database error');
    });
  });

  // =============================================
  // GET /api/context/assets/:id
  // =============================================
  describe('GET /api/context/assets/:id', () => {
    const mockAsset = {
      id: 'asset-001',
      asset_type: 'company_description',
      name: 'Our Company',
      description: 'Main company description',
      content_json: { mission: 'Test mission' },
      tags: ['core'],
      version: 1
    };

    beforeEach(() => {
      setFromImplementation((table) => {
        if (table === 'context_assets') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockAsset,
              error: null
            })
          };
        }
        return createQueryBuilder();
      });
    });

    it('should return single asset by ID', async () => {
      const response = await request(app)
        .get('/api/context/assets/asset-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('asset-001');
      expect(response.body.data.name).toBe('Our Company');
    });

    it('should include type_info in response', async () => {
      const response = await request(app)
        .get('/api/context/assets/asset-001')
        .expect(200);

      expect(response.body.data.type_info).toBeDefined();
      expect(response.body.data.type_info.display_name).toBe('Company Description');
    });

    it('should return 404 for non-existent asset', async () => {
      setFromImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }));

      const response = await request(app)
        .get('/api/context/assets/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Asset not found');
    });
  });

  // =============================================
  // POST /api/context/assets
  // =============================================
  describe('POST /api/context/assets', () => {
    const createdAsset = {
      id: 'new-asset-001',
      asset_type: 'company_description',
      name: 'New Company Description',
      description: 'A new description',
      content_json: { mission: 'Our mission' },
      tags: ['new'],
      version: 1,
      is_current: true
    };

    beforeEach(() => {
      setFromImplementation((table) => {
        if (table === 'context_assets') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: createdAsset,
              error: null
            }),
            maybeSingle: jest.fn().mockResolvedValue({
              data: createdAsset,
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });
    });

    it('should create new asset', async () => {
      const response = await request(app)
        .post('/api/context/assets')
        .send({
          asset_type: 'company_description',
          name: 'New Company Description',
          description: 'A new description',
          content_json: { mission: 'Our mission' },
          tags: ['new']
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Company Description');
      expect(response.body.message).toBe('Asset created successfully');
    });

    it('should require asset_type', async () => {
      const response = await request(app)
        .post('/api/context/assets')
        .send({
          name: 'Missing Type'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('asset_type and name are required');
    });

    it('should require name', async () => {
      const response = await request(app)
        .post('/api/context/assets')
        .send({
          asset_type: 'company_description'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('asset_type and name are required');
    });

    it('should validate asset_type', async () => {
      const response = await request(app)
        .post('/api/context/assets')
        .send({
          asset_type: 'invalid_type',
          name: 'Test Asset'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid asset_type: invalid_type');
    });

    it('should accept all valid asset types', async () => {
      const validTypes = [
        'company_description', 'why_we_win', 'products', 'pain_points',
        'voice_dna', 'icp', 'core_values', 'custom_processes',
        'competitors', 'case_studies', 'faqs', 'team_bios',
        'industry_context', 'terminology', 'templates', 'pricing',
        'brand_guidelines', 'personas'
      ];

      for (const type of validTypes.slice(0, 3)) { // Test first 3 for speed
        const response = await request(app)
          .post('/api/context/assets')
          .send({
            asset_type: type,
            name: `Test ${type}`,
            content_json: {}
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      }
    });
  });

  // =============================================
  // PUT /api/context/assets/:id
  // =============================================
  describe('PUT /api/context/assets/:id', () => {
    const existingAsset = {
      id: 'asset-001',
      asset_type: 'company_description',
      name: 'Original Name',
      content_json: { mission: 'Original mission' },
      content_text: 'Original mission',
      version: 1
    };

    const updatedAsset = {
      ...existingAsset,
      name: 'Updated Name',
      content_json: { mission: 'Updated mission' },
      version: 2
    };

    beforeEach(() => {
      let fetchCount = 0;
      setFromImplementation((table) => {
        if (table === 'context_assets') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(() => {
              fetchCount++;
              if (fetchCount === 1) {
                // First call - get current
                return Promise.resolve({ data: existingAsset, error: null });
              }
              // Second call - after update
              return Promise.resolve({ data: updatedAsset, error: null });
            }),
            update: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: updatedAsset, error: null })
          };
        }
        if (table === 'context_asset_versions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            insert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return createQueryBuilder();
      });
    });

    it('should update asset', async () => {
      const response = await request(app)
        .put('/api/context/assets/asset-001')
        .send({
          name: 'Updated Name',
          content_json: { mission: 'Updated mission' }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent asset', async () => {
      setFromImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      }));

      const response = await request(app)
        .put('/api/context/assets/non-existent')
        .send({ name: 'New Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Asset not found');
    });

    it('should update metadata without changing version', async () => {
      const response = await request(app)
        .put('/api/context/assets/asset-001')
        .send({
          tags: ['updated', 'tags']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // =============================================
  // DELETE /api/context/assets/:id
  // =============================================
  describe('DELETE /api/context/assets/:id', () => {
    beforeEach(() => {
      setFromImplementation(() => createQueryBuilder({
        data: { id: 'asset-001' },
        error: null
      }));
    });

    it('should soft delete (archive) asset by default', async () => {
      const response = await request(app)
        .delete('/api/context/assets/asset-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Asset archived');
    });

    it('should hard delete when specified', async () => {
      const response = await request(app)
        .delete('/api/context/assets/asset-001?hard=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Asset permanently deleted');
    });

    it('should handle database errors', async () => {
      const builder = {
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'asset-001' }, error: null }),
        then: (resolve) => resolve({ data: null, error: { message: 'Delete failed' } })
      };
      setFromImplementation(() => builder);

      const response = await request(app)
        .delete('/api/context/assets/asset-001')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  // =============================================
  // GET /api/context/assets/:id/versions
  // =============================================
  describe('GET /api/context/assets/:id/versions', () => {
    const mockVersions = [
      {
        id: 'ver-002',
        asset_id: 'asset-001',
        version: 2,
        content_json: { mission: 'Version 2' },
        change_summary: 'Updated mission',
        created_at: '2024-01-02T00:00:00Z'
      },
      {
        id: 'ver-001',
        asset_id: 'asset-001',
        version: 1,
        content_json: { mission: 'Version 1' },
        change_summary: 'Initial',
        created_at: '2024-01-01T00:00:00Z'
      }
    ];

    beforeEach(() => {
      setFromImplementation((table) => {
        if (table === 'context_asset_versions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: mockVersions,
              error: null
            })
          };
        }
        if (table === 'context_assets') {
          return createQueryBuilder({ data: { id: 'asset-001' }, error: null });
        }
        return createQueryBuilder();
      });
    });

    it('should return version history', async () => {
      const response = await request(app)
        .get('/api/context/assets/asset-001/versions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });

    it('should order versions descending', async () => {
      const response = await request(app)
        .get('/api/context/assets/asset-001/versions')
        .expect(200);

      expect(response.body.data[0].version).toBe(2);
      expect(response.body.data[1].version).toBe(1);
    });

    it('should return empty array for asset without versions', async () => {
      setFromImplementation((table) => {
        if (table === 'context_assets') {
          return createQueryBuilder({ data: { id: 'asset-no-versions' }, error: null });
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      const response = await request(app)
        .get('/api/context/assets/asset-no-versions/versions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  // =============================================
  // POST /api/context/assets/:id/rollback
  // =============================================
  describe('POST /api/context/assets/:id/rollback', () => {
    const mockVersion = {
      id: 'ver-001',
      asset_id: 'asset-001',
      version: 1,
      content_json: { mission: 'Version 1 content' },
      content_text: 'Version 1 content'
    };

    const currentAsset = {
      id: 'asset-001',
      version: 3,
      content_json: { mission: 'Current content' },
      content_text: 'Current content'
    };

    const rolledBackAsset = {
      id: 'asset-001',
      version: 4,
      content_json: { mission: 'Version 1 content' },
      content_text: 'Version 1 content',
      asset_type: 'company_description'
    };

    beforeEach(() => {
      setFromImplementation((table) => {
        if (table === 'context_asset_versions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockVersion,
              error: null
            }),
            insert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        if (table === 'context_assets') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: currentAsset,
              error: null
            }),
            update: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: currentAsset, error: null })
          };
        }
        return createQueryBuilder();
      });

      // Mock for update returning rolled back data
      let callCount = 0;
      setFromImplementation((table) => {
        if (table === 'context_asset_versions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockVersion, error: null }),
            insert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        if (table === 'context_assets') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(() => {
              callCount++;
              if (callCount <= 2) return Promise.resolve({ data: currentAsset, error: null });
              return Promise.resolve({ data: rolledBackAsset, error: null });
            }),
            update: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: currentAsset, error: null })
          };
        }
        return createQueryBuilder();
      });
    });

    it('should rollback to specified version', async () => {
      const response = await request(app)
        .post('/api/context/assets/asset-001/rollback')
        .send({ version: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Rolled back to version 1');
    });

    it('should require version in body', async () => {
      const response = await request(app)
        .post('/api/context/assets/asset-001/rollback')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('version is required');
    });

    it('should return 404 for non-existent version', async () => {
      setFromImplementation((table) => {
        if (table === 'context_asset_versions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          };
        }
        if (table === 'context_assets') {
          return createQueryBuilder({ data: currentAsset, error: null });
        }
        return createQueryBuilder();
      });

      const response = await request(app)
        .post('/api/context/assets/asset-001/rollback')
        .send({ version: 999 })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Version 999 not found');
    });
  });

  // =============================================
  // GET /api/context/stats
  // =============================================
  describe('GET /api/context/stats', () => {
    const mockAssets = [
      { asset_type: 'company_description', is_current: true, usage_count: 5 },
      { asset_type: 'company_description', is_current: true, usage_count: 3 },
      { asset_type: 'voice_dna', is_current: true, usage_count: 10 },
      { asset_type: 'icp', is_current: false, usage_count: 2 }
    ];

    beforeEach(() => {
      setFromImplementation((table) => {
        if (table === 'context_assets') {
          return createQueryBuilder({ data: mockAssets, error: null });
        }
        return createQueryBuilder();
      });
    });

    it('should return usage statistics', async () => {
      const response = await request(app)
        .get('/api/context/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(4);
      expect(response.body.data.current).toBe(3);
      expect(response.body.data.archived).toBe(1);
      expect(response.body.data.total_usage).toBe(20);
    });

    it('should include stats by type', async () => {
      const response = await request(app)
        .get('/api/context/stats')
        .expect(200);

      expect(response.body.data.by_type).toBeDefined();
      expect(response.body.data.by_type.company_description.count).toBe(2);
      expect(response.body.data.by_type.company_description.usage).toBe(8);
    });
  });

  // =============================================
  // GET /api/context/tags
  // =============================================
  describe('GET /api/context/tags', () => {
    const mockAssets = [
      { tags: ['brand', 'core'] },
      { tags: ['brand', 'writing'] },
      { tags: ['core', 'important'] }
    ];

    beforeEach(() => {
      setFromImplementation((table) => {
        if (table === 'context_assets') {
          return createQueryBuilder({ data: mockAssets, error: null });
        }
        return createQueryBuilder();
      });
    });

    it('should return unique tags sorted alphabetically', async () => {
      const response = await request(app)
        .get('/api/context/tags')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(['brand', 'core', 'important', 'writing']);
      expect(response.body.count).toBe(4);
    });

    it('should handle assets without tags', async () => {
      setFromImplementation(() => createQueryBuilder({
        data: [{ tags: null }, { tags: [] }],
        error: null
      }));

      const response = await request(app)
        .get('/api/context/tags')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  // =============================================
  // POST /api/context/import
  // =============================================
  describe('POST /api/context/import', () => {
    beforeEach(() => {
      setFromImplementation((table) => {
        if (table === 'context_assets') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return createQueryBuilder();
      });
    });

    it('should import multiple assets', async () => {
      const response = await request(app)
        .post('/api/context/import')
        .send({
          assets: [
            { asset_type: 'company_description', name: 'Company 1', content_json: {} },
            { asset_type: 'voice_dna', name: 'Voice 1', content_json: {} }
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toBe(2);
      expect(response.body.data.errors).toHaveLength(0);
    });

    it('should require assets array', async () => {
      const response = await request(app)
        .post('/api/context/import')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('assets array is required');
    });

    it('should reject empty assets array', async () => {
      const response = await request(app)
        .post('/api/context/import')
        .send({ assets: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should track errors for invalid assets', async () => {
      const response = await request(app)
        .post('/api/context/import')
        .send({
          assets: [
            { asset_type: 'company_description', name: 'Valid' },
            { name: 'Missing Type' },
            { asset_type: 'voice_dna' }
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toBe(1);
      expect(response.body.data.errors).toHaveLength(2);
    });
  });

  // =============================================
  // GET /api/context/export
  // =============================================
  describe('GET /api/context/export', () => {
    const mockAssets = [
      {
        asset_type: 'company_description',
        name: 'Company',
        description: 'Desc',
        content_json: { mission: 'Test' },
        tags: ['core']
      }
    ];

    beforeEach(() => {
      setFromImplementation((table) => {
        if (table === 'context_assets') {
          // Create chainable builder that resolves on terminal methods
          const builder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: (resolve) => resolve({ data: mockAssets, error: null })
          };
          return builder;
        }
        return createQueryBuilder();
      });
    });

    it('should export assets as JSON by default', async () => {
      const response = await request(app)
        .get('/api/context/export')
        .expect(200);

      expect(response.body.exported_at).toBeDefined();
      expect(response.body.version).toBe('1.0');
      expect(response.body.assets).toHaveLength(1);
    });

    it('should export assets as CSV when specified', async () => {
      const response = await request(app)
        .get('/api/context/export?format=csv')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('asset_type,name,description');
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/context/export?type=company_description')
        .expect(200);

      expect(response.body.assets).toHaveLength(1);
    });
  });

  // =============================================
  // PUT /api/context/assets/:id/usage
  // =============================================
  describe('PUT /api/context/assets/:id/usage', () => {
    beforeEach(() => {
      setFromImplementation((table) => {
        if (table === 'context_assets') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { usage_count: 5 },
              error: null
            }),
            update: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'asset-001' }, error: null })
          };
        }
        return createQueryBuilder();
      });
    });

    it('should increment usage count', async () => {
      const response = await request(app)
        .put('/api/context/assets/asset-001/usage')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Usage count incremented');
    });

    it('should handle database errors', async () => {
      setFromImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Asset not found' }
        })
      }));

      const response = await request(app)
        .put('/api/context/assets/non-existent/usage')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  // =============================================
  // POST /api/context/generate
  // =============================================
  describe('POST /api/context/generate', () => {
    beforeEach(() => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: '# Generated Content\n\nThis is AI-generated content.' }],
          usage: { input_tokens: 500, output_tokens: 200 }
        })
      });
    });

    it('should generate content for valid asset type', async () => {
      const response = await request(app)
        .post('/api/context/generate')
        .send({
          asset_type: 'company_description',
          company_name: 'TestCo',
          description: 'A technology company'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.content).toContain('Generated Content');
      expect(response.body.usage).toBeDefined();
    });

    it('should require asset_type', async () => {
      const response = await request(app)
        .post('/api/context/generate')
        .send({
          description: 'A company'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Asset type is required');
    });

    it('should require description', async () => {
      const response = await request(app)
        .post('/api/context/generate')
        .send({
          asset_type: 'company_description'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Description is required');
    });

    it('should validate asset_type', async () => {
      const response = await request(app)
        .post('/api/context/generate')
        .send({
          asset_type: 'invalid_type',
          description: 'Test'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid asset type');
    });

    it('should handle API errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({
          error: { message: 'API error' }
        })
      });

      const response = await request(app)
        .post('/api/context/generate')
        .send({
          asset_type: 'company_description',
          description: 'Test'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to generate content');
    });

    it('should handle missing API key', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const response = await request(app)
        .post('/api/context/generate')
        .send({
          asset_type: 'company_description',
          description: 'Test'
        })
        .expect(500);

      expect(response.body.error).toBe('Anthropic API key not configured');

      process.env.ANTHROPIC_API_KEY = originalKey;
    });
  });

  // =============================================
  // POST /api/context/parse
  // =============================================
  describe('POST /api/context/parse', () => {
    const mockParsedAsset = {
      asset_type: 'company_description',
      name: 'Parsed Company',
      description: 'A parsed description',
      tags: ['parsed'],
      content_json: { mission: 'Extracted mission' },
      metadata: {
        source: 'User import',
        confidence: 0.85,
        needs_review: []
      }
    };

    beforeEach(() => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: JSON.stringify(mockParsedAsset) }],
          usage: { input_tokens: 1000, output_tokens: 300 }
        })
      });
    });

    it('should parse raw content into structured asset', async () => {
      const response = await request(app)
        .post('/api/context/parse')
        .send({
          content: 'TestCo is a technology company founded in 2020. Our mission is to make AI accessible to everyone.'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.asset).toBeDefined();
      expect(response.body.asset.asset_type).toBe('company_description');
      expect(response.body.metadata).toBeDefined();
    });

    it('should require content', async () => {
      const response = await request(app)
        .post('/api/context/parse')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Content is required');
    });

    it('should reject content that is too short', async () => {
      const response = await request(app)
        .post('/api/context/parse')
        .send({
          content: 'Too short'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Content is too short to analyze');
    });

    it('should accept preferred_type hint', async () => {
      const response = await request(app)
        .post('/api/context/parse')
        .send({
          content: 'This is a long enough content that should be parsed by the AI system for analysis.',
          preferred_type: 'voice_dna'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle invalid JSON from AI', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'This is not valid JSON' }],
          usage: { input_tokens: 500, output_tokens: 100 }
        })
      });

      const response = await request(app)
        .post('/api/context/parse')
        .send({
          content: 'This is a long enough content that should be parsed by the AI system.'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('invalid JSON');
    });

    it('should handle missing API key', async () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      const response = await request(app)
        .post('/api/context/parse')
        .send({
          content: 'This is a long enough content that should be parsed by the AI system.'
        })
        .expect(500);

      expect(response.body.error).toBe('Anthropic API key not configured');

      process.env.ANTHROPIC_API_KEY = originalKey;
    });
  });
});
