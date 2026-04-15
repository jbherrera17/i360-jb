/**
 * Parthenon Routes Integration Tests
 * Tests for /api/parthenon/* endpoints
 *
 * Covers:
 * - Departments CRUD (5 endpoints)
 * - Roles CRUD (5 endpoints)
 * - OKRs CRUD + strategic links (8 endpoints)
 * - Processes CRUD (5 endpoints)
 * - Utility endpoints (overview, seed-defaults, alignment-summary, objectives-for-linking)
 */

const request = require('supertest');
const { createTestApp, createAuthenticatedTestApp } = require('../../setup/testApp');
const { createMockSupabase, createQueryBuilder } = require('../../setup/mockSupabase');

describe('Parthenon Routes Integration', () => {
  let app;
  let mockSupabase;

  // Helper to create chainable query builder
  const createChainable = (data = null, error = null) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),
    then: (resolve) => resolve({ data, error, count: Array.isArray(data) ? data.length : 0 })
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const testApp = createAuthenticatedTestApp({ routes: ['parthenon'] });
    app = testApp.app;
    mockSupabase = testApp.mockSupabase;
  });

  // =============================================
  // DEPARTMENTS ENDPOINTS
  // =============================================
  describe('Departments', () => {
    const mockDepartments = [
      { id: 'dept-001', name: 'Executive', description: 'Leadership', icon: 'crown', color: '#8b5cf6', is_active: true, sort_order: 1 },
      { id: 'dept-002', name: 'Finance', description: 'Financial ops', icon: 'banknote', color: '#10b981', is_active: true, sort_order: 2 }
    ];

    describe('GET /api/parthenon/departments', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'departments') {
            return createChainable(mockDepartments);
          }
          return createMockSupabase().from(table);
        });
      });

      it('should list all active departments', async () => {
        const response = await request(app)
          .get('/api/parthenon/departments')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
      });

      it('should support include_children parameter', async () => {
        const response = await request(app)
          .get('/api/parthenon/departments?include_children=true')
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should support active_only filter', async () => {
        const response = await request(app)
          .get('/api/parthenon/departments?active_only=false')
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/parthenon/departments/:id', () => {
      const mockDepartment = {
        id: 'dept-001',
        name: 'Executive',
        description: 'Leadership',
        icon: 'crown',
        color: '#8b5cf6',
        is_active: true
      };

      beforeEach(() => {
        let callCount = 0;
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'departments') {
            callCount++;
            if (callCount === 1) {
              // First call - get department
              return createChainable(mockDepartment);
            } else {
              // Third call - get children
              return createChainable([]);
            }
          }
          if (table === 'roles') {
            // Second call - get roles
            return createChainable([]);
          }
          return createMockSupabase().from(table);
        });
      });

      it('should get single department with roles and children', async () => {
        const response = await request(app)
          .get('/api/parthenon/departments/dept-001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Executive');
        expect(response.body.data.roles).toBeDefined();
        expect(response.body.data.children).toBeDefined();
      });

      it('should return 404 for non-existent department', async () => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable(null));

        const response = await request(app)
          .get('/api/parthenon/departments/non-existent')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Department not found');
      });
    });

    describe('POST /api/parthenon/departments', () => {
      const createdDept = {
        id: 'new-dept-001',
        name: 'New Department',
        description: 'Test',
        icon: 'building-2',
        color: '#6366f1'
      };

      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable(createdDept));
      });

      it('should create new department', async () => {
        const response = await request(app)
          .post('/api/parthenon/departments')
          .send({
            name: 'New Department',
            description: 'Test'
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('New Department');
      });

      it('should require name', async () => {
        const response = await request(app)
          .post('/api/parthenon/departments')
          .send({
            description: 'No name'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Name is required');
      });
    });

    describe('PUT /api/parthenon/departments/:id', () => {
      const updatedDept = {
        id: 'dept-001',
        name: 'Updated Name',
        description: 'Updated'
      };

      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable(updatedDept));
      });

      it('should update department', async () => {
        const response = await request(app)
          .put('/api/parthenon/departments/dept-001')
          .send({ name: 'Updated Name' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('DELETE /api/parthenon/departments/:id', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) =>
          t === 'organization_members'
            ? createMockSupabase().from(t)
            : createChainable({ id: 'dept-001', org_id: null })
        );
      });

      it('should soft delete (deactivate) department by default', async () => {
        const response = await request(app)
          .delete('/api/parthenon/departments/dept-001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Department deactivated');
      });

      it('should hard delete when specified', async () => {
        const response = await request(app)
          .delete('/api/parthenon/departments/dept-001?hard=true')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Department permanently deleted');
      });
    });
  });

  // =============================================
  // ROLES ENDPOINTS
  // =============================================
  describe('Roles', () => {
    const mockRoles = [
      {
        id: 'role-001',
        title: 'CEO',
        department_id: 'dept-001',
        level: 'executive',
        is_active: true,
        departments: { id: 'dept-001', name: 'Executive', icon: 'crown', color: '#8b5cf6' }
      },
      {
        id: 'role-002',
        title: 'CFO',
        department_id: 'dept-002',
        level: 'executive',
        is_active: true,
        departments: { id: 'dept-002', name: 'Finance', icon: 'banknote', color: '#10b981' }
      }
    ];

    describe('GET /api/parthenon/roles', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable(mockRoles));
      });

      it('should list all roles with department info', async () => {
        const response = await request(app)
          .get('/api/parthenon/roles')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data[0].departments).toBeDefined();
      });

      it('should filter by department_id', async () => {
        const response = await request(app)
          .get('/api/parthenon/roles?department_id=dept-001')
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should filter by level', async () => {
        const response = await request(app)
          .get('/api/parthenon/roles?level=executive')
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/parthenon/roles/:id', () => {
      const mockRole = {
        id: 'role-001',
        title: 'CEO',
        reports_to: null,
        departments: { id: 'dept-001', name: 'Executive' }
      };

      beforeEach(() => {
        let callCount = 0;
        mockSupabase.from.mockImplementation((table) => {
          callCount++;
          if (table === 'roles' && callCount === 1) {
            return createChainable(mockRole);
          }
          if (table === 'roles' && callCount === 2) {
            return createChainable([]); // direct reports
          }
          if (table === 'okrs') {
            return createChainable([]); // OKRs
          }
          return createMockSupabase().from(table);
        });
      });

      it('should get single role with reporting structure', async () => {
        const response = await request(app)
          .get('/api/parthenon/roles/role-001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe('CEO');
      });

      it('should return 404 for non-existent role', async () => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable(null));

        const response = await request(app)
          .get('/api/parthenon/roles/non-existent')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Role not found');
      });
    });

    describe('POST /api/parthenon/roles', () => {
      const createdRole = {
        id: 'new-role-001',
        title: 'New Role',
        department_id: 'dept-001'
      };

      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable(createdRole));
      });

      it('should create new role', async () => {
        const response = await request(app)
          .post('/api/parthenon/roles')
          .send({
            title: 'New Role',
            department_id: 'dept-001'
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should require title and department_id', async () => {
        const response = await request(app)
          .post('/api/parthenon/roles')
          .send({
            title: 'Missing Department'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Title and department_id are required');
      });
    });

    describe('PUT /api/parthenon/roles/:id', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable({ id: 'role-001', title: 'Updated' }));
      });

      it('should update role', async () => {
        const response = await request(app)
          .put('/api/parthenon/roles/role-001')
          .send({ title: 'Updated' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('DELETE /api/parthenon/roles/:id', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : ({
          select: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
          maybeSingle: jest.fn().mockResolvedValue({ data: { org_id: null }, error: null })
        }));
      });

      it('should soft delete role by default', async () => {
        const response = await request(app)
          .delete('/api/parthenon/roles/role-001')
          .expect(200);

        expect(response.body.message).toBe('Role deactivated');
      });

      it('should hard delete when specified', async () => {
        const response = await request(app)
          .delete('/api/parthenon/roles/role-001?hard=true')
          .expect(200);

        expect(response.body.message).toBe('Role permanently deleted');
      });
    });
  });

  // =============================================
  // OKRs ENDPOINTS
  // =============================================
  describe('OKRs', () => {
    const mockOKRs = [
      {
        id: 'okr-001',
        title: 'Increase Revenue',
        scope: 'company',
        status: 'active',
        progress: 50,
        period: 'Q1-2024',
        departments: null,
        roles: null
      },
      {
        id: 'okr-002',
        title: 'Improve NPS',
        scope: 'department',
        department_id: 'dept-001',
        status: 'active',
        progress: 25,
        period: 'Q1-2024',
        departments: { id: 'dept-001', name: 'Executive' },
        roles: null
      }
    ];

    describe('GET /api/parthenon/okrs', () => {
      beforeEach(() => {
        let callCount = 0;
        mockSupabase.from.mockImplementation((table) => {
          callCount++;
          if (table === 'okrs') {
            return createChainable(mockOKRs);
          }
          if (table === 'okr_strategic_links') {
            return {
              select: jest.fn().mockReturnThis(),
              in: jest.fn().mockResolvedValue({ data: [], error: null })
            };
          }
          return createMockSupabase().from(table);
        });
      });

      it('should list all OKRs with filters', async () => {
        const response = await request(app)
          .get('/api/parthenon/okrs')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(0);
      });

      it('should filter by scope', async () => {
        const response = await request(app)
          .get('/api/parthenon/okrs?scope=company')
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should filter by status', async () => {
        const response = await request(app)
          .get('/api/parthenon/okrs?status=active')
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should filter by period', async () => {
        const response = await request(app)
          .get('/api/parthenon/okrs?period=Q1-2024')
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/parthenon/okrs/:id', () => {
      const mockOKR = {
        id: 'okr-001',
        title: 'Increase Revenue',
        scope: 'company',
        status: 'active',
        parent_okr_id: null,
        departments: null,
        roles: null
      };

      beforeEach(() => {
        let callCount = 0;
        mockSupabase.from.mockImplementation((table) => {
          callCount++;
          if (table === 'okrs') {
            if (callCount === 1) return createChainable(mockOKR);
            return createChainable([]);
          }
          if (table === 'okr_strategic_links') {
            return createChainable([]);
          }
          return createMockSupabase().from(table);
        });
      });

      it('should get single OKR with children and strategic links', async () => {
        const response = await request(app)
          .get('/api/parthenon/okrs/okr-001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe('Increase Revenue');
        expect(response.body.data.strategic_links).toBeDefined();
      });

      it('should return 404 for non-existent OKR', async () => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable(null));

        const response = await request(app)
          .get('/api/parthenon/okrs/non-existent')
          .expect(404);

        expect(response.body.error).toBe('OKR not found');
      });
    });

    describe('POST /api/parthenon/okrs', () => {
      const createdOKR = {
        id: 'new-okr-001',
        title: 'New OKR',
        period: 'Q2-2024',
        scope: 'company'
      };

      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable(createdOKR));
      });

      it('should create new OKR', async () => {
        const response = await request(app)
          .post('/api/parthenon/okrs')
          .send({
            title: 'New OKR',
            period: 'Q2-2024',
            key_results: [
              { title: 'KR1', target: 100, current: 0 }
            ]
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should require title and period', async () => {
        const response = await request(app)
          .post('/api/parthenon/okrs')
          .send({
            title: 'Missing Period'
          })
          .expect(400);

        expect(response.body.error).toBe('Title and period are required');
      });
    });

    describe('PUT /api/parthenon/okrs/:id', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable({ id: 'okr-001', progress: 75 }));
      });

      it('should update OKR', async () => {
        const response = await request(app)
          .put('/api/parthenon/okrs/okr-001')
          .send({ status: 'completed' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should calculate progress when key_results updated', async () => {
        const response = await request(app)
          .put('/api/parthenon/okrs/okr-001')
          .send({
            key_results: [
              { title: 'KR1', target: 100, current: 100 },
              { title: 'KR2', target: 50, current: 25 }
            ]
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('DELETE /api/parthenon/okrs/:id', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : ({
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null })
        }));
      });

      it('should delete OKR', async () => {
        const response = await request(app)
          .delete('/api/parthenon/okrs/okr-001')
          .expect(200);

        expect(response.body.message).toBe('OKR deleted');
      });
    });
  });

  // =============================================
  // PROCESSES ENDPOINTS
  // =============================================
  describe('Processes', () => {
    const mockProcesses = [
      {
        id: 'proc-001',
        name: 'Sales Process',
        type: 'procedure',
        status: 'active',
        departments: { id: 'dept-001', name: 'Sales' },
        roles: { id: 'role-001', title: 'Sales Manager' }
      }
    ];

    describe('GET /api/parthenon/processes', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable(mockProcesses));
      });

      it('should list all processes', async () => {
        const response = await request(app)
          .get('/api/parthenon/processes')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
      });

      it('should filter by department_id', async () => {
        const response = await request(app)
          .get('/api/parthenon/processes?department_id=dept-001')
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should support search', async () => {
        const response = await request(app)
          .get('/api/parthenon/processes?search=sales')
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/parthenon/processes/:id', () => {
      const mockProcess = {
        id: 'proc-001',
        name: 'Sales Process',
        type: 'procedure',
        steps: [{ order: 1, title: 'Step 1' }],
        departments: { id: 'dept-001', name: 'Sales' },
        roles: { id: 'role-001', title: 'Sales Manager' }
      };

      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable(mockProcess));
      });

      it('should get single process with details', async () => {
        const response = await request(app)
          .get('/api/parthenon/processes/proc-001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Sales Process');
      });

      it('should return 404 for non-existent process', async () => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable(null));

        const response = await request(app)
          .get('/api/parthenon/processes/non-existent')
          .expect(404);

        expect(response.body.error).toBe('Process not found');
      });
    });

    describe('POST /api/parthenon/processes', () => {
      const createdProcess = {
        id: 'new-proc-001',
        name: 'New Process',
        type: 'procedure'
      };

      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable(createdProcess));
      });

      it('should create new process', async () => {
        const response = await request(app)
          .post('/api/parthenon/processes')
          .send({
            name: 'New Process',
            type: 'procedure',
            steps: [{ order: 1, title: 'Step 1' }]
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should require name', async () => {
        const response = await request(app)
          .post('/api/parthenon/processes')
          .send({
            type: 'procedure'
          })
          .expect(400);

        expect(response.body.error).toBe('Name is required');
      });
    });

    describe('PUT /api/parthenon/processes/:id', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable({ id: 'proc-001', name: 'Updated' }));
      });

      it('should update process', async () => {
        const response = await request(app)
          .put('/api/parthenon/processes/proc-001')
          .send({ name: 'Updated Process' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('DELETE /api/parthenon/processes/:id', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : ({
          select: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
          maybeSingle: jest.fn().mockResolvedValue({ data: { org_id: null }, error: null })
        }));
      });

      it('should archive process by default', async () => {
        const response = await request(app)
          .delete('/api/parthenon/processes/proc-001')
          .expect(200);

        expect(response.body.message).toBe('Process archived');
      });

      it('should hard delete when specified', async () => {
        const response = await request(app)
          .delete('/api/parthenon/processes/proc-001?hard=true')
          .expect(200);

        expect(response.body.message).toBe('Process permanently deleted');
      });
    });
  });

  // =============================================
  // UTILITY ENDPOINTS
  // =============================================
  describe('Utility Endpoints', () => {
    describe('GET /api/parthenon/overview', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation((table) => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ count: 5, error: null })
        }));
      });

      it('should return organizational overview', async () => {
        const response = await request(app)
          .get('/api/parthenon/overview')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('departments');
        expect(response.body.data).toHaveProperty('roles');
        expect(response.body.data).toHaveProperty('active_okrs');
        expect(response.body.data).toHaveProperty('active_processes');
      });
    });

    describe('POST /api/parthenon/seed-defaults', () => {
      beforeEach(() => {
        const seededDepts = Array(8).fill(null).map((_, i) => ({
          id: `dept-${i}`,
          name: `Department ${i}`
        }));
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : ({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: [], error: null }), // No existing depts
          then: (resolve) => resolve({ data: seededDepts, error: null })
        }));
      });

      it('should seed default departments', async () => {
        const response = await request(app)
          .post('/api/parthenon/seed-defaults')
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('default departments created');
      });
    });

    describe('GET /api/parthenon/alignment-summary', () => {
      beforeEach(() => {
        let callCount = 0;
        mockSupabase.from.mockImplementation((table) => {
          callCount++;
          if (table === 'okrs') {
            return {
              select: jest.fn().mockReturnThis(),
              in: jest.fn().mockResolvedValue({
                data: [
                  { id: 'okr-001', title: 'OKR 1', status: 'active' },
                  { id: 'okr-002', title: 'OKR 2', status: 'active' }
                ],
                error: null
              })
            };
          }
          if (table === 'okr_strategic_links') {
            return {
              select: jest.fn().mockResolvedValue({
                data: [
                  {
                    okr_id: 'okr-001',
                    bsc_objectives: {
                      bsc_perspectives: { perspective_type: 'financial' }
                    }
                  }
                ],
                error: null
              })
            };
          }
          return createMockSupabase().from(table);
        });
      });

      it('should return alignment summary', async () => {
        const response = await request(app)
          .get('/api/parthenon/alignment-summary')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('total_okrs');
        expect(response.body.data).toHaveProperty('linked');
        expect(response.body.data).toHaveProperty('unlinked');
        expect(response.body.data).toHaveProperty('alignment_rate');
        expect(response.body.data).toHaveProperty('by_perspective');
      });
    });

    describe('GET /api/parthenon/objectives-for-linking', () => {
      const mockObjectives = [
        {
          id: 'obj-001',
          name: 'Increase Profitability',
          status: 'active',
          bsc_perspectives: { id: 'persp-001', name: 'Financial', perspective_type: 'financial', color: '#10b981' }
        },
        {
          id: 'obj-002',
          name: 'Customer Satisfaction',
          status: 'active',
          bsc_perspectives: { id: 'persp-002', name: 'Customer', perspective_type: 'customer', color: '#3b82f6' }
        }
      ];

      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable(mockObjectives));
      });

      it('should return objectives grouped by perspective', async () => {
        const response = await request(app)
          .get('/api/parthenon/objectives-for-linking')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('all');
        expect(response.body.data).toHaveProperty('grouped');
      });
    });
  });

  // =============================================
  // OKR STRATEGIC LINKS ENDPOINTS
  // =============================================
  describe('OKR Strategic Links', () => {
    describe('GET /api/parthenon/okrs/:id/strategic-links', () => {
      const mockLinks = [
        {
          id: 'link-001',
          link_type: 'supports',
          is_primary: true,
          alignment_score: 90,
          contribution_description: 'Contributes to revenue',
          created_at: '2024-01-01T00:00:00Z',
          bsc_objectives: {
            id: 'obj-001',
            name: 'Increase Profitability',
            description: 'Financial objective',
            bsc_perspectives: {
              id: 'persp-001',
              name: 'Financial',
              perspective_type: 'financial',
              color: '#10b981'
            }
          }
        }
      ];

      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : createChainable(mockLinks));
      });

      it('should return strategic links for OKR', async () => {
        const response = await request(app)
          .get('/api/parthenon/okrs/okr-001/strategic-links')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0]).toHaveProperty('objective_name');
        expect(response.body.data[0]).toHaveProperty('perspective_type');
      });
    });

    describe('POST /api/parthenon/okrs/:id/strategic-links', () => {
      const createdLink = {
        id: 'new-link-001',
        link_type: 'supports',
        is_primary: false,
        alignment_score: 85,
        bsc_objectives: {
          id: 'obj-001',
          name: 'Test Objective',
          bsc_perspectives: {
            id: 'persp-001',
            name: 'Financial',
            perspective_type: 'financial',
            color: '#10b981'
          }
        }
      };

      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : ({
          update: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: createdLink, error: null })
        }));
      });

      it('should create strategic link', async () => {
        const response = await request(app)
          .post('/api/parthenon/okrs/okr-001/strategic-links')
          .send({
            bsc_objective_id: 'obj-001',
            link_type: 'supports',
            contribution_description: 'Contributes to objective'
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('objective_name');
      });

      it('should require bsc_objective_id', async () => {
        const response = await request(app)
          .post('/api/parthenon/okrs/okr-001/strategic-links')
          .send({
            link_type: 'supports'
          })
          .expect(400);

        expect(response.body.error).toBe('bsc_objective_id is required');
      });
    });

    describe('PUT /api/parthenon/okrs/:okrId/strategic-links/:linkId', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : ({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 'link-001', is_primary: true }, error: null })
        }));
      });

      it('should update strategic link', async () => {
        const response = await request(app)
          .put('/api/parthenon/okrs/okr-001/strategic-links/link-001')
          .send({
            is_primary: true,
            alignment_score: 95
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('DELETE /api/parthenon/okrs/:okrId/strategic-links/:linkId', () => {
      beforeEach(() => {
        mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : ({
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          then: (resolve) => resolve({ error: null })
        }));
      });

      it('should delete strategic link', async () => {
        const response = await request(app)
          .delete('/api/parthenon/okrs/okr-001/strategic-links/link-001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Strategic link removed');
      });
    });
  });

  // =============================================
  // ERROR HANDLING
  // =============================================
  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockImplementation((t) => t === "organization_members" ? createMockSupabase().from(t) : ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: (resolve) => resolve({ data: null, error: { message: 'Database error' } })
      }));

      const response = await request(app)
        .get('/api/parthenon/departments')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database error');
    });
  });
});
