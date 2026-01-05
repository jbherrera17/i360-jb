/**
 * Integration Tests - Auth Routes
 * Tests HTTP endpoints for authentication and user management
 */

const request = require('supertest');
const { createTestApp } = require('../../setup/testApp');
const { createMockSupabase } = require('../../setup/mockSupabase');
// Test fixtures available but using inline data for flexibility

describe('Auth Routes Integration Tests', () => {
  let app;
  let mockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabase();
    const testApp = createTestApp({ routes: ['auth'], mockSupabase });
    app = testApp.app;
  });

  // ============================================================================
  // POST /api/auth/register
  // ============================================================================
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'new-user-id', email: 'newuser@example.com' },
          session: null
        },
        error: null
      });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            upsert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'securepassword123',
          display_name: 'New User'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('created successfully');
      expect(response.body.user.email).toBe('newuser@example.com');
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ password: 'password123' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email and password are required');
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email and password are required');
    });

    it('should return 400 when password is too short', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: '12345' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Password must be at least 6 characters');
    });

    it('should return 400 when signup fails', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already exists' }
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'existing@example.com', password: 'password123' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User already exists');
    });
  });

  // ============================================================================
  // POST /api/auth/login
  // ============================================================================
  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-id', email: 'user@example.com', user_metadata: {} },
          session: {
            access_token: 'test-token',
            refresh_token: 'refresh-token',
            expires_at: 9999999999
          }
        },
        error: null
      });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'user-id',
                email: 'user@example.com',
                display_name: 'Test User',
                role: 'admin',
                preferences: { theme: 'dark' }
              },
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'password123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.session.access_token).toBe('test-token');
      expect(response.body.user.email).toBe('user@example.com');
      expect(response.body.user.role).toBe('admin');
    });

    it('should return 400 when credentials are missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email and password are required');
    });

    it('should return 401 for invalid credentials', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'wrongpassword' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should default to user role when profile not found', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-id', email: 'user@example.com', user_metadata: { display_name: 'User' } },
          session: { access_token: 'token', refresh_token: 'refresh', expires_at: 9999 }
        },
        error: null
      });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' }
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'password123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('user');
    });
  });

  // ============================================================================
  // POST /api/auth/forgot-password
  // ============================================================================
  describe('POST /api/auth/forgot-password', () => {
    it('should send reset email for existing user', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'user@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset link');
    });

    it('should return success even for non-existent email (security)', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: { message: 'User not found' }
      });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      // Should not reveal if email exists
      expect(response.body.success).toBe(true);
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email is required');
    });
  });

  // ============================================================================
  // POST /api/auth/reset-password
  // ============================================================================
  describe('POST /api/auth/reset-password', () => {
    it('should reset password successfully', async () => {
      mockSupabase.auth.setSession.mockResolvedValue({
        data: { user: { id: 'user-id', email: 'user@example.com' } },
        error: null
      });
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: { id: 'user-id', email: 'user@example.com', user_metadata: {} } },
        error: null
      });

      // Create a chainable query builder for the users table
      const usersQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'user-id', role: 'user' },
          error: null
        }),
        upsert: jest.fn().mockResolvedValue({ error: null })
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return usersQueryBuilder;
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          access_token: 'reset-token',
          new_password: 'newpassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset successfully');
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ access_token: 'token' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('New password is required');
    });

    it('should return 400 when password is too short', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ new_password: '12345' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Password must be at least 6 characters');
    });

    it('should return 400 for invalid reset token', async () => {
      mockSupabase.auth.setSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid token' }
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          access_token: 'invalid-token',
          new_password: 'newpassword123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid or expired');
    });
  });

  // ============================================================================
  // POST /api/auth/logout
  // ============================================================================
  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out');
    });

    it('should succeed even without auth header', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ============================================================================
  // GET /api/auth/me
  // ============================================================================
  describe('GET /api/auth/me', () => {
    it('should return current user profile', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-id',
            email: 'user@example.com',
            created_at: '2024-01-01T00:00:00Z'
          }
        },
        error: null
      });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'user-id',
                email: 'user@example.com',
                display_name: 'Test User',
                role: 'admin',
                preferences: { theme: 'dark' },
                created_at: '2024-01-01T00:00:00Z'
              },
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('user@example.com');
      expect(response.body.user.role).toBe('admin');
      expect(response.body.user.is_admin).toBe(true);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No authentication token');
    });

    it('should return 401 for invalid token', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid or expired');
    });
  });

  // ============================================================================
  // Admin Endpoints
  // ============================================================================
  describe('Admin Endpoints', () => {
    const setupAdminAuth = () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-id', email: 'admin@example.com' } },
        error: null
      });

      // Override from() to handle multiple tables with full chainable API
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            upsert: jest.fn().mockResolvedValue({ error: null }),
            single: jest.fn().mockResolvedValue({
              data: { id: 'admin-id', role: 'admin' },
              error: null
            })
          };
        }
        return createMockSupabase().from(table);
      });
    };

    describe('GET /api/auth/users', () => {
      it('should return list of users for admin', async () => {
        setupAdminAuth();

        const mockUsers = [
          { id: '1', email: 'admin@example.com', role: 'admin' },
          { id: '2', email: 'user@example.com', role: 'user' }
        ];

        mockSupabase.from.mockImplementation((table) => {
          if (table === 'users') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockResolvedValue({
                data: mockUsers,
                error: null
              }),
              single: jest.fn().mockResolvedValue({
                data: { id: 'admin-id', role: 'admin' },
                error: null
              })
            };
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .get('/api/auth/users')
          .set('Authorization', 'Bearer admin-token')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
      });

      it('should return 401 without auth', async () => {
        const response = await request(app)
          .get('/api/auth/users')
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should return 403 for non-admin', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-id', email: 'user@example.com' } },
          error: null
        });

        mockSupabase.from.mockImplementation((table) => {
          if (table === 'users') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { id: 'user-id', role: 'user' },
                error: null
              })
            };
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .get('/api/auth/users')
          .set('Authorization', 'Bearer user-token')
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Admin access required');
      });
    });

    describe('PUT /api/auth/users/:id/role', () => {
      it('should update user role', async () => {
        setupAdminAuth();

        mockSupabase.from.mockImplementation((table) => {
          if (table === 'users') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              update: jest.fn().mockReturnThis(),
              single: jest.fn()
                .mockResolvedValueOnce({ data: { id: 'admin-id', role: 'admin' }, error: null })
                .mockResolvedValueOnce({ data: { id: 'user-1', role: 'admin' }, error: null })
            };
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .put('/api/auth/users/user-1/role')
          .set('Authorization', 'Bearer admin-token')
          .send({ role: 'admin' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should return 400 for invalid role', async () => {
        setupAdminAuth();

        const response = await request(app)
          .put('/api/auth/users/user-1/role')
          .set('Authorization', 'Bearer admin-token')
          .send({ role: 'superadmin' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Valid role required');
      });

      it('should prevent removing last admin', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'admin-id', email: 'admin@example.com' } },
          error: null
        });

        // Track call count to return different data
        let selectCallCount = 0;
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'users') {
            selectCallCount++;
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { id: 'admin-id', role: 'admin' },
                error: null
              }),
              // Return only this admin in the list
              then: (cb) => cb({ data: [{ id: 'admin-id' }], error: null })
            };
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .put('/api/auth/users/admin-id/role')
          .set('Authorization', 'Bearer admin-token')
          .send({ role: 'user' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Cannot remove the last admin');
      });
    });

    describe('POST /api/auth/users', () => {
      it('should create new user as admin', async () => {
        setupAdminAuth();

        mockSupabase.auth.admin = {
          createUser: jest.fn().mockResolvedValue({
            data: {
              user: { id: 'new-user-id', email: 'newuser@example.com' }
            },
            error: null
          })
        };

        mockSupabase.from.mockImplementation((table) => {
          if (table === 'users') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              upsert: jest.fn().mockResolvedValue({ error: null }),
              single: jest.fn().mockResolvedValue({
                data: { id: 'admin-id', role: 'admin' },
                error: null
              })
            };
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .post('/api/auth/users')
          .set('Authorization', 'Bearer admin-token')
          .send({
            email: 'newuser@example.com',
            password: 'password123',
            display_name: 'New User',
            role: 'viewer'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.role).toBe('viewer');
      });

      it('should return 400 for missing credentials', async () => {
        setupAdminAuth();

        const response = await request(app)
          .post('/api/auth/users')
          .set('Authorization', 'Bearer admin-token')
          .send({ email: 'user@example.com' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('required');
      });
    });

    describe('DELETE /api/auth/users/:id', () => {
      it('should delete user as admin', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'admin-id', email: 'admin@example.com' } },
          error: null
        });

        mockSupabase.auth.admin = {
          deleteUser: jest.fn().mockResolvedValue({ error: null })
        };

        // Track calls to single() to return different results
        let singleCallCount = 0;
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'users') {
            const queryBuilder = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              delete: jest.fn().mockReturnThis(),
              single: jest.fn().mockImplementation(() => {
                singleCallCount++;
                if (singleCallCount === 1) {
                  // First call: admin check in requireAdmin middleware
                  return Promise.resolve({ data: { id: 'admin-id', role: 'admin' }, error: null });
                } else {
                  // Second call: target user check
                  return Promise.resolve({ data: { id: 'user-to-delete', role: 'user' }, error: null });
                }
              })
            };
            // Make delete() also return a promise when chained with eq()
            queryBuilder.delete.mockImplementation(() => ({
              eq: jest.fn().mockResolvedValue({ error: null })
            }));
            return queryBuilder;
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .delete('/api/auth/users/user-to-delete')
          .set('Authorization', 'Bearer admin-token')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('deleted');
      });

      it('should prevent self-deletion', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'admin-id', email: 'admin@example.com' } },
          error: null
        });

        mockSupabase.from.mockImplementation((table) => {
          if (table === 'users') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { id: 'admin-id', role: 'admin' },
                error: null
              })
            };
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .delete('/api/auth/users/admin-id')
          .set('Authorization', 'Bearer admin-token')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Cannot delete your own account');
      });
    });

    describe('GET /api/auth/roles-summary', () => {
      it('should return roles count', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'admin-id', email: 'admin@example.com' } },
          error: null
        });

        // Track call count to return different data
        let fromCallCount = 0;
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'users') {
            fromCallCount++;
            // First call is from requireAdmin middleware checking role
            // Second call is from the actual endpoint to get all users
            const queryBuilder = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { id: 'admin-id', role: 'admin' },
                error: null
              }),
              // Make the query builder also work as a Promise (for await without .single())
              then: (resolve) => resolve({
                data: [
                  { role: 'admin' },
                  { role: 'user' },
                  { role: 'user' },
                  { role: 'viewer' }
                ],
                error: null
              })
            };
            return queryBuilder;
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .get('/api/auth/roles-summary')
          .set('Authorization', 'Bearer admin-token')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.admin).toBe(1);
        expect(response.body.data.user).toBe(2);
        expect(response.body.data.viewer).toBe(1);
      });
    });
  });

  // ============================================================================
  // User Profile Endpoints
  // ============================================================================
  describe('User Profile Endpoints', () => {
    describe('GET /api/auth/profile', () => {
      it('should return user profile with department', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-id', email: 'user@example.com', created_at: '2024-01-01' } },
          error: null
        });

        mockSupabase.from.mockImplementation((table) => {
          if (table === 'users') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'user-id',
                  email: 'user@example.com',
                  display_name: 'Test User',
                  avatar_url: 'https://example.com/avatar.png',
                  role: 'user',
                  department_id: 'dept-1',
                  preferences: { theme: 'dark' },
                  department: { id: 'dept-1', name: 'Engineering', icon: '⚙️', color: '#3498db' }
                },
                error: null
              })
            };
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.department.name).toBe('Engineering');
      });

      it('should return basic info when profile not found', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: {
            user: {
              id: 'user-id',
              email: 'user@example.com',
              user_metadata: { display_name: 'User' },
              created_at: '2024-01-01'
            }
          },
          error: null
        });

        mockSupabase.from.mockImplementation((table) => {
          if (table === 'users') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' }
              })
            };
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.role).toBe('user');
        expect(response.body.data.department).toBe(null);
      });
    });

    describe('PUT /api/auth/profile', () => {
      it('should update user profile', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-id', email: 'user@example.com' } },
          error: null
        });

        mockSupabase.from.mockImplementation((table) => {
          if (table === 'users') {
            return {
              update: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'user-id',
                  email: 'user@example.com',
                  display_name: 'Updated Name',
                  preferences: { theme: 'light' }
                },
                error: null
              })
            };
          }
          return createMockSupabase().from(table);
        });

        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', 'Bearer valid-token')
          .send({
            display_name: 'Updated Name',
            preferences: { theme: 'light' }
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.display_name).toBe('Updated Name');
      });

      it('should return 401 without auth', async () => {
        const response = await request(app)
          .put('/api/auth/profile')
          .send({ display_name: 'New Name' })
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });
  });
});
