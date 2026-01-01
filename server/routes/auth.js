/**
 * INSIGHT 360 - Authentication Routes
 * Version: 1.1.0
 *
 * Endpoints:
 *   - POST /api/auth/register - Create new user account
 *   - POST /api/auth/login - Login with email/password
 *   - POST /api/auth/logout - Logout current session
 *   - GET /api/auth/me - Get current user profile with role
 *   - GET /api/auth/users - Admin: List all users
 *   - POST /api/auth/users - Admin: Create new user
 *   - PUT /api/auth/users/:id - Admin: Update user details
 *   - PUT /api/auth/users/:id/role - Admin: Update user role
 *   - DELETE /api/auth/users/:id - Admin: Delete user
 */

const express = require('express');

/**
 * Auth Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
module.exports = function(supabase) {
    const router = express.Router();

    // ============================================================================
    // AUTHENTICATION ENDPOINTS
    // ============================================================================

    /**
     * POST /api/auth/register
     * Create a new user account
     */
    router.post('/register', async (req, res) => {
        try {
            const { email, password, display_name } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email and password are required'
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    error: 'Password must be at least 6 characters'
                });
            }

            // Create user in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        display_name: display_name || email.split('@')[0]
                    }
                }
            });

            if (authError) {
                console.error('Signup error:', authError);
                return res.status(400).json({
                    success: false,
                    error: authError.message
                });
            }

            // Insert user profile into users table
            if (authData.user) {
                const { error: profileError } = await supabase
                    .from('users')
                    .upsert({
                        id: authData.user.id,
                        email: authData.user.email,
                        display_name: display_name || email.split('@')[0],
                        role: 'user' // Default role
                    });

                if (profileError) {
                    console.error('Profile creation error:', profileError);
                    // Don't fail - user can still log in
                }
            }

            res.json({
                success: true,
                message: 'Account created successfully. Please check your email for verification.',
                user: authData.user ? {
                    id: authData.user.id,
                    email: authData.user.email
                } : null
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/auth/login
     * Login with email and password
     */
    router.post('/login', async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email and password are required'
                });
            }

            // Authenticate with Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                console.error('Login error:', error);
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password'
                });
            }

            // Get user profile with role
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('id, email, display_name, role, preferences')
                .eq('id', data.user.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                console.error('Profile fetch error:', profileError);
            }

            res.json({
                success: true,
                session: {
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                    expires_at: data.session.expires_at
                },
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    display_name: profile?.display_name || data.user.user_metadata?.display_name || email.split('@')[0],
                    role: profile?.role || 'user',
                    preferences: profile?.preferences || {}
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/auth/logout
     * Logout current session
     */
    router.post('/logout', async (req, res) => {
        try {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                // Set the auth token for the request
                const { error } = await supabase.auth.signOut();
                if (error) {
                    console.error('Logout error:', error);
                }
            }

            res.json({
                success: true,
                message: 'Logged out successfully'
            });

        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/auth/me
     * Get current authenticated user profile
     */
    router.get('/me', async (req, res) => {
        try {
            // Get token from header
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'No authentication token provided'
                });
            }

            const token = authHeader.substring(7);

            // Verify token with Supabase
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);

            if (authError || !user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid or expired token'
                });
            }

            // Get user profile with role
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('id, email, display_name, role, preferences, created_at')
                .eq('id', user.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                console.error('Profile fetch error:', profileError);
            }

            res.json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    display_name: profile?.display_name || user.user_metadata?.display_name || user.email.split('@')[0],
                    role: profile?.role || 'user',
                    preferences: profile?.preferences || {},
                    created_at: profile?.created_at || user.created_at,
                    is_admin: profile?.role === 'admin'
                }
            });

        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // ADMIN ENDPOINTS
    // ============================================================================

    /**
     * Middleware to check admin role
     */
    const requireAdmin = async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const token = authHeader.substring(7);
            const { data: { user }, error } = await supabase.auth.getUser(token);

            if (error || !user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid token'
                });
            }

            // Check if user is admin
            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            if (!profile || profile.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Admin access required'
                });
            }

            req.user = user;
            req.userRole = profile.role;
            next();

        } catch (error) {
            console.error('Admin check error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    };

    /**
     * GET /api/auth/users
     * Admin: List all users with roles
     */
    router.get('/users', requireAdmin, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, email, display_name, role, created_at, updated_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });

        } catch (error) {
            console.error('List users error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/auth/users/:id/role
     * Admin: Update user role
     */
    router.put('/users/:id/role', requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { role } = req.body;

            if (!role || !['admin', 'user', 'viewer'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid role required (admin, user, viewer)'
                });
            }

            // Prevent removing last admin
            if (role !== 'admin') {
                const { data: admins } = await supabase
                    .from('users')
                    .select('id')
                    .eq('role', 'admin');

                if (admins && admins.length === 1 && admins[0].id === id) {
                    return res.status(400).json({
                        success: false,
                        error: 'Cannot remove the last admin'
                    });
                }
            }

            const { data, error } = await supabase
                .from('users')
                .update({ role, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Update role error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/auth/users
     * Admin: Create a new user
     */
    router.post('/users', requireAdmin, async (req, res) => {
        try {
            const { email, password, display_name, role } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email and password are required'
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    error: 'Password must be at least 6 characters'
                });
            }

            const userRole = role && ['admin', 'user', 'viewer'].includes(role) ? role : 'user';

            // Create user in Supabase Auth using admin API
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // Auto-confirm email for admin-created users
                user_metadata: {
                    display_name: display_name || email.split('@')[0]
                }
            });

            if (authError) {
                console.error('Admin create user error:', authError);
                return res.status(400).json({
                    success: false,
                    error: authError.message
                });
            }

            // Insert user profile into users table with specified role
            if (authData.user) {
                const { error: profileError } = await supabase
                    .from('users')
                    .upsert({
                        id: authData.user.id,
                        email: authData.user.email,
                        display_name: display_name || email.split('@')[0],
                        role: userRole
                    });

                if (profileError) {
                    console.error('Profile creation error:', profileError);
                }
            }

            res.json({
                success: true,
                message: 'User created successfully',
                data: {
                    id: authData.user.id,
                    email: authData.user.email,
                    display_name: display_name || email.split('@')[0],
                    role: userRole
                }
            });

        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/auth/users/:id
     * Admin: Update user details (display_name, role)
     */
    router.put('/users/:id', requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { display_name, role } = req.body;

            const updates = { updated_at: new Date().toISOString() };

            if (display_name !== undefined) {
                updates.display_name = display_name;
            }

            if (role !== undefined) {
                if (!['admin', 'user', 'viewer'].includes(role)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Valid role required (admin, user, viewer)'
                    });
                }

                // Prevent removing last admin
                if (role !== 'admin') {
                    const { data: admins } = await supabase
                        .from('users')
                        .select('id')
                        .eq('role', 'admin');

                    if (admins && admins.length === 1 && admins[0].id === id) {
                        return res.status(400).json({
                            success: false,
                            error: 'Cannot remove the last admin'
                        });
                    }
                }

                updates.role = role;
            }

            const { data, error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/auth/users/:id
     * Admin: Delete a user
     */
    router.delete('/users/:id', requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;

            // Prevent deleting yourself
            if (req.user.id === id) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot delete your own account'
                });
            }

            // Prevent deleting the last admin
            const { data: targetUser } = await supabase
                .from('users')
                .select('role')
                .eq('id', id)
                .single();

            if (targetUser && targetUser.role === 'admin') {
                const { data: admins } = await supabase
                    .from('users')
                    .select('id')
                    .eq('role', 'admin');

                if (admins && admins.length <= 1) {
                    return res.status(400).json({
                        success: false,
                        error: 'Cannot delete the last admin'
                    });
                }
            }

            // Delete from users table first
            const { error: profileError } = await supabase
                .from('users')
                .delete()
                .eq('id', id);

            if (profileError) {
                console.error('Delete profile error:', profileError);
            }

            // Delete from Supabase Auth
            const { error: authError } = await supabase.auth.admin.deleteUser(id);

            if (authError) {
                console.error('Delete auth user error:', authError);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to delete user from authentication system'
                });
            }

            res.json({
                success: true,
                message: 'User deleted successfully'
            });

        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/auth/roles-summary
     * Admin: Get roles summary
     */
    router.get('/roles-summary', requireAdmin, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('role');

            if (error) throw error;

            const summary = {
                admin: 0,
                user: 0,
                viewer: 0
            };

            (data || []).forEach(u => {
                if (summary[u.role] !== undefined) {
                    summary[u.role]++;
                }
            });

            res.json({
                success: true,
                data: summary
            });

        } catch (error) {
            console.error('Roles summary error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
};
