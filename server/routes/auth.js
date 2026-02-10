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
const cache = require('../services/cacheService');
const { validateBody, loginSchema, registerSchema, resetPasswordSchema } = require('../middleware/validate');

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
    router.post('/register', validateBody(registerSchema), async (req, res) => {
        try {
            const { email, password, display_name } = req.body;

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
    router.post('/login', validateBody(loginSchema), async (req, res) => {
        try {
            const { email, password } = req.body;

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

            // Get user profile with role and status
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('id, email, display_name, role, preferences, status, suspended_reason')
                .eq('id', data.user.id)
                .single();

            if (profileError) {
                if (profileError.code !== 'PGRST116') {
                    console.error('Profile fetch error:', profileError);
                } else {
                    console.log('User profile not found in public.users, using defaults for:', email);
                }
            } else {
                console.log('Login profile loaded:', { email, role: profile?.role, status: profile?.status, hasProfile: !!profile });
            }

            // Check if user account is suspended or inactive
            if (profile?.status && profile.status !== 'active') {
                // Sign out the user since we're rejecting the login
                await supabase.auth.signOut();

                let errorMessage = 'Your account is not active.';
                if (profile.status === 'suspended') {
                    errorMessage = profile.suspended_reason
                        ? `Your account has been suspended: ${profile.suspended_reason}`
                        : 'Your account has been suspended. Please contact support.';
                } else if (profile.status === 'inactive') {
                    errorMessage = 'Your account is inactive. Please contact support to reactivate.';
                } else if (profile.status === 'pending_deletion') {
                    errorMessage = 'Your account is scheduled for deletion. Please contact support if this is an error.';
                }

                return res.status(403).json({
                    success: false,
                    error: errorMessage,
                    code: 'ACCOUNT_NOT_ACTIVE',
                    status: profile.status
                });
            }

            const userResponse = {
                id: data.user.id,
                email: data.user.email,
                display_name: profile?.display_name || data.user.user_metadata?.display_name || email.split('@')[0],
                role: profile?.role || 'user',
                preferences: profile?.preferences || {}
            };

            // Cache the profile for subsequent requests
            cache.cacheProfile(data.user.id, userResponse);

            // Cache token validation result
            cache.cacheTokenValidation(data.session.access_token, { user: data.user });

            // Set auth cookie with security flags (httpOnly prevents JS access)
            const isProduction = process.env.NODE_ENV === 'production';
            const cookieOptions = [
                `auth_token=${data.session.access_token}`,
                'Path=/',
                'HttpOnly',
                'SameSite=Lax',
                `Max-Age=${7 * 24 * 60 * 60}`, // 7 days
                isProduction ? 'Secure' : ''
            ].filter(Boolean).join('; ');
            res.setHeader('Set-Cookie', cookieOptions);

            res.json({
                success: true,
                session: {
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                    expires_at: data.session.expires_at
                },
                user: userResponse
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
     * POST /api/auth/forgot-password
     * Send password reset email
     */
    router.post('/forgot-password', async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    error: 'Email is required'
                });
            }

            // Send password reset email via Supabase
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${process.env.APP_URL || 'http://localhost:3000'}/login.html?reset=true`
            });

            if (error) {
                console.error('Password reset error:', error);
                // Don't reveal if email exists or not for security
            }

            // Always return success to prevent email enumeration
            res.json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent.'
            });

        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process request'
            });
        }
    });

    /**
     * POST /api/auth/reset-password
     * Reset password with token (called after user clicks email link)
     */
    router.post('/reset-password', validateBody(resetPasswordSchema), async (req, res) => {
        try {
            const { access_token, new_password } = req.body;

            let currentUser = null;

            // If access_token provided, use it to set the session first
            if (access_token) {
                const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                    access_token,
                    refresh_token: access_token // Supabase uses same token for reset
                });

                if (sessionError) {
                    console.error('Session error:', sessionError);
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid or expired reset token'
                    });
                }

                currentUser = sessionData?.user;
            }

            // Update the password
            const { data: updateData, error } = await supabase.auth.updateUser({
                password: new_password
            });

            if (error) {
                console.error('Password update error:', error);
                return res.status(400).json({
                    success: false,
                    error: error.message || 'Failed to reset password'
                });
            }

            // Ensure user exists in public.users table (sync from auth)
            // IMPORTANT: Preserve existing role if user already exists
            const user = currentUser || updateData?.user;
            if (user) {
                // First check if user exists and get their current role
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('id, role')
                    .eq('id', user.id)
                    .single();

                const { error: syncError } = await supabase
                    .from('users')
                    .upsert({
                        id: user.id,
                        email: user.email,
                        display_name: user.user_metadata?.display_name || user.email.split('@')[0],
                        role: existingUser?.role || 'user', // Preserve existing role or default to 'user'
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'id',
                        ignoreDuplicates: false
                    });

                if (syncError) {
                    console.warn('User sync warning (non-fatal):', syncError);
                } else {
                    console.log('User synced to public.users:', user.email, 'role:', existingUser?.role || 'user');
                }
            }

            res.json({
                success: true,
                message: 'Password has been reset successfully. You can now log in with your new password.'
            });

        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to reset password'
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

                // Get user ID to invalidate cache
                const cachedValidation = cache.getCachedTokenValidation(token);
                if (cachedValidation?.user?.id) {
                    cache.invalidateUser(cachedValidation.user.id, token);
                }

                // Set the auth token for the request
                const { error } = await supabase.auth.signOut();
                if (error) {
                    console.error('Logout error:', error);
                }
            }

            // Clear auth cookie
            res.setHeader('Set-Cookie', 'auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');

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

            // Check token validation cache first
            let user = null;
            const cachedValidation = cache.getCachedTokenValidation(token);

            if (cachedValidation) {
                user = cachedValidation.user;
            } else {
                // Verify token with Supabase
                const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

                if (authError || !authUser) {
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid or expired token'
                    });
                }

                user = authUser;
                // Cache the validation result
                cache.cacheTokenValidation(token, { user });
            }

            // Check profile cache
            let cachedProfile = cache.getCachedProfile(user.id);

            if (cachedProfile) {
                return res.json({
                    success: true,
                    user: {
                        ...cachedProfile,
                        is_admin: cachedProfile.role === 'admin'
                    }
                });
            }

            // Get user profile with role from database
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('id, email, display_name, role, preferences, created_at')
                .eq('id', user.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                console.error('Profile fetch error:', profileError);
            }

            const userResponse = {
                id: user.id,
                email: user.email,
                display_name: profile?.display_name || user.user_metadata?.display_name || user.email.split('@')[0],
                role: profile?.role || 'user',
                preferences: profile?.preferences || {},
                created_at: profile?.created_at || user.created_at
            };

            // Cache the profile
            cache.cacheProfile(user.id, userResponse);

            res.json({
                success: true,
                user: {
                    ...userResponse,
                    is_admin: userResponse.role === 'admin'
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
                .select('id, email, display_name, role, department_id, business_role, created_at, updated_at')
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

            // Invalidate cached profile since role changed
            cache.invalidateProfile(id);

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
     *
     * Optional: Include org_id and org_role to automatically add user to an organization
     */
    router.post('/users', requireAdmin, async (req, res) => {
        try {
            const { email, password, display_name, role, org_id, org_role } = req.body;

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

            // Validate org_role if provided
            const validOrgRoles = ['admin', 'consultant', 'viewer'];
            if (org_role && !validOrgRoles.includes(org_role)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid organization role. Must be one of: ${validOrgRoles.join(', ')}`
                });
            }

            // Validate org_id if provided
            if (org_id) {
                const { data: org, error: orgError } = await supabase
                    .from('organizations')
                    .select('id, name')
                    .eq('id', org_id)
                    .single();

                if (orgError || !org) {
                    return res.status(400).json({
                        success: false,
                        error: 'Organization not found'
                    });
                }
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
                        role: userRole,
                        default_org_id: org_id || null
                    });

                if (profileError) {
                    console.error('Profile creation error:', profileError);
                }

                // Add user to organization if org_id was provided
                if (org_id) {
                    const { error: memberError } = await supabase
                        .from('organization_members')
                        .insert({
                            org_id: org_id,
                            user_id: authData.user.id,
                            role: org_role || 'consultant',
                            status: 'active',
                            invited_by: req.user.id,
                            joined_at: new Date().toISOString()
                        });

                    if (memberError) {
                        console.error('Organization membership error:', memberError);
                        // Don't fail the whole operation, user is created
                    }
                }
            }

            res.json({
                success: true,
                message: org_id ? 'User created and added to organization' : 'User created successfully',
                data: {
                    id: authData.user.id,
                    email: authData.user.email,
                    display_name: display_name || email.split('@')[0],
                    role: userRole,
                    org_id: org_id || null,
                    org_role: org_id ? (org_role || 'consultant') : null
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
            const { display_name, role, department_id } = req.body;

            const updates = { updated_at: new Date().toISOString() };

            if (display_name !== undefined) {
                updates.display_name = display_name;
            }

            if (department_id !== undefined) {
                updates.department_id = department_id;
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
     * POST /api/auth/users/:id/reset-password
     * Admin: Reset a user's password
     */
    router.post('/users/:id/reset-password', requireAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { new_password } = req.body;

            if (!new_password || new_password.length < 6) {
                return res.status(400).json({
                    success: false,
                    error: 'Password must be at least 6 characters'
                });
            }

            // Verify user exists
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, email')
                .eq('id', id)
                .single();

            if (userError || !user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Update password via Supabase admin API
            const { error: authError } = await supabase.auth.admin.updateUserById(id, {
                password: new_password
            });

            if (authError) {
                console.error('Admin password reset error:', authError);
                return res.status(500).json({
                    success: false,
                    error: authError.message || 'Failed to reset password'
                });
            }

            console.log(`Password reset by admin for user: ${user.email}`);

            res.json({
                success: true,
                message: 'Password has been reset successfully'
            });

        } catch (error) {
            console.error('Admin password reset error:', error);
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
     * POST /api/auth/sync-users
     * Admin: Sync users from Supabase Auth to public.users table
     */
    router.post('/sync-users', requireAdmin, async (req, res) => {
        try {
            // Get all users from Supabase Auth
            const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

            if (authError) {
                console.error('List auth users error:', authError);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to fetch users from authentication system'
                });
            }

            if (!authUsers || !authUsers.users || authUsers.users.length === 0) {
                return res.json({
                    success: true,
                    message: 'No users found in authentication system',
                    synced: 0,
                    failed: 0
                });
            }

            // Get existing users from public.users
            const { data: existingUsers } = await supabase
                .from('users')
                .select('id, role');

            const existingUserMap = new Map();
            (existingUsers || []).forEach(u => existingUserMap.set(u.id, u));

            let synced = 0;
            let failed = 0;
            const results = [];

            // Sync each auth user to public.users
            for (const authUser of authUsers.users) {
                try {
                    const existing = existingUserMap.get(authUser.id);

                    const { error: upsertError } = await supabase
                        .from('users')
                        .upsert({
                            id: authUser.id,
                            email: authUser.email,
                            display_name: authUser.user_metadata?.display_name || authUser.email.split('@')[0],
                            role: existing?.role || 'user', // Preserve existing role or default to 'user'
                            updated_at: new Date().toISOString()
                        }, {
                            onConflict: 'id',
                            ignoreDuplicates: false
                        });

                    if (upsertError) {
                        console.error(`Sync error for ${authUser.email}:`, upsertError);
                        failed++;
                        results.push({ email: authUser.email, status: 'failed', error: upsertError.message });
                    } else {
                        synced++;
                        results.push({ email: authUser.email, status: existing ? 'updated' : 'created' });
                    }
                } catch (err) {
                    console.error(`Sync exception for ${authUser.email}:`, err);
                    failed++;
                    results.push({ email: authUser.email, status: 'failed', error: err.message });
                }
            }

            res.json({
                success: true,
                message: `Synced ${synced} users, ${failed} failed`,
                synced,
                failed,
                total: authUsers.users.length,
                results
            });

        } catch (error) {
            console.error('Sync users error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/auth/debug-user/:email
     * Admin: Debug user role by email
     */
    router.get('/debug-user/:email', requireAdmin, async (req, res) => {
        try {
            const { email } = req.params;

            // Get from auth.users via admin API
            const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
            const authUser = authUsers?.users?.find(u => u.email === email);

            // Get from public.users
            const { data: publicUser, error: publicError } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            // Also try by ID if we found auth user
            let publicUserById = null;
            if (authUser) {
                const { data } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', authUser.id)
                    .single();
                publicUserById = data;
            }

            res.json({
                success: true,
                debug: {
                    email,
                    authUser: authUser ? {
                        id: authUser.id,
                        email: authUser.email,
                        created_at: authUser.created_at
                    } : null,
                    authError: authError?.message,
                    publicUserByEmail: publicUser,
                    publicUserById: publicUserById,
                    publicError: publicError?.message,
                    idMatch: authUser && publicUser ? authUser.id === publicUser.id : null,
                    idMatchById: authUser && publicUserById ? authUser.id === publicUserById.id : null
                }
            });

        } catch (error) {
            console.error('Debug user error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/auth/cache-stats
     * Admin: Get cache statistics
     */
    router.get('/cache-stats', requireAdmin, async (req, res) => {
        try {
            res.json({
                success: true,
                data: cache.getCacheStats()
            });
        } catch (error) {
            console.error('Cache stats error:', error);
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

    // ============================================================================
    // USER PROFILE ENDPOINTS (Self-service)
    // ============================================================================

    /**
     * PUT /api/auth/profile
     * Update own profile (display_name, avatar, department, preferences)
     */
    router.put('/profile', async (req, res) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const token = authHeader.substring(7);
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);

            if (authError || !user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid or expired token'
                });
            }

            const { display_name, avatar_url, department_id, preferences } = req.body;

            const updates = {
                updated_at: new Date().toISOString()
            };

            if (display_name !== undefined) updates.display_name = display_name;
            if (avatar_url !== undefined) updates.avatar_url = avatar_url;
            if (department_id !== undefined) updates.department_id = department_id;
            if (preferences !== undefined) updates.preferences = preferences;

            const { data, error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', user.id)
                .select(`
                    id,
                    email,
                    display_name,
                    avatar_url,
                    role,
                    department_id,
                    preferences,
                    created_at,
                    updated_at,
                    department:departments!users_department_id_fkey(id, name, icon, color)
                `)
                .single();

            if (error) throw error;

            // Invalidate cached profile since it was updated
            cache.invalidateProfile(user.id);

            res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/auth/profile
     * Get full profile with department info
     */
    router.get('/profile', async (req, res) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const token = authHeader.substring(7);
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);

            if (authError || !user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid or expired token'
                });
            }

            // Try with default_org_id first, fall back without it if column doesn't exist
            let profile = null;
            let error = null;
            const fullSelect = `
                id, email, display_name, avatar_url, role, department_id,
                default_org_id, preferences, created_at, updated_at,
                department:departments!users_department_id_fkey(id, name, icon, color)
            `;
            const basicSelect = `
                id, email, display_name, avatar_url, role, department_id,
                preferences, created_at, updated_at,
                department:departments!users_department_id_fkey(id, name, icon, color)
            `;

            ({ data: profile, error } = await supabase
                .from('users')
                .select(fullSelect)
                .eq('id', user.id)
                .single());

            // If the query failed (e.g. default_org_id column missing), retry without it
            if (error && error.code !== 'PGRST116') {
                console.warn('Full profile query failed, retrying without org fields:', error.message);
                ({ data: profile, error } = await supabase
                    .from('users')
                    .select(basicSelect)
                    .eq('id', user.id)
                    .single());
                if (error && error.code !== 'PGRST116') throw error;
            }

            // Fetch organization separately (safely - table may not exist)
            let organization = null;
            if (profile?.default_org_id) {
                try {
                    const { data: org } = await supabase
                        .from('organizations')
                        .select('id, name, slug')
                        .eq('id', profile.default_org_id)
                        .single();
                    organization = org || null;
                } catch (e) {
                    console.warn('Could not fetch organization:', e.message);
                }
            }

            // Check platform admin status (safely - table may not exist)
            let is_platform_admin = false;
            let platform_admin_role = null;
            try {
                const { data: adminRecord } = await supabase
                    .from('platform_admins')
                    .select('role')
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .maybeSingle();
                if (adminRecord) {
                    is_platform_admin = true;
                    platform_admin_role = adminRecord.role;
                }
            } catch (e) {
                console.warn('Could not check platform admin status:', e.message);
            }

            // If profile doesn't exist, return basic info from auth
            if (!profile) {
                return res.json({
                    success: true,
                    data: {
                        id: user.id,
                        email: user.email,
                        display_name: user.user_metadata?.display_name || user.email.split('@')[0],
                        avatar_url: null,
                        role: 'user',
                        department_id: null,
                        preferences: {},
                        created_at: user.created_at,
                        department: null,
                        organization: null,
                        is_platform_admin,
                        platform_admin_role
                    }
                });
            }

            res.json({
                success: true,
                data: { ...profile, organization, is_platform_admin, platform_admin_role }
            });

        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================
    // IMPERSONATION (Platform Admin "Act As")
    // ============================================

    // In-memory impersonation store (ephemeral, clears on restart)
    const impersonationStore = new Map();

    /**
     * POST /api/auth/impersonate
     * Start impersonating an org/role (platform admins only)
     */
    router.post('/impersonate', async (req, res) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }

            const token = authHeader.substring(7);
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);
            if (authError || !user) {
                return res.status(401).json({ success: false, error: 'Invalid token' });
            }

            // Verify platform admin
            const { data: adminRecord } = await supabase
                .from('platform_admins')
                .select('role')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .maybeSingle();

            if (!adminRecord) {
                return res.status(403).json({ success: false, error: 'Platform admin access required' });
            }

            const { org_id, role } = req.body;
            if (!org_id || !role) {
                return res.status(400).json({ success: false, error: 'org_id and role are required' });
            }

            // Validate org exists
            const { data: org } = await supabase
                .from('organizations')
                .select('id, name, slug, subscription_tier')
                .eq('id', org_id)
                .single();

            if (!org) {
                return res.status(404).json({ success: false, error: 'Organization not found' });
            }

            const validRoles = ['owner', 'admin', 'consultant', 'viewer', 'user'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ success: false, error: `Invalid role. Must be: ${validRoles.join(', ')}` });
            }

            // Store impersonation
            impersonationStore.set(user.id, {
                org_id: org.id,
                org_name: org.name,
                org_slug: org.slug,
                subscription_tier: org.subscription_tier,
                role,
                started_at: new Date().toISOString(),
                real_user_id: user.id
            });

            console.log(`[Impersonation] Platform admin ${user.id} now acting as ${role} in ${org.name}`);

            res.json({
                success: true,
                data: impersonationStore.get(user.id)
            });
        } catch (error) {
            console.error('Impersonate error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/auth/impersonate
     * Get current impersonation state
     */
    router.get('/impersonate', async (req, res) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }

            const token = authHeader.substring(7);
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);
            if (authError || !user) {
                return res.status(401).json({ success: false, error: 'Invalid token' });
            }

            const state = impersonationStore.get(user.id) || null;
            res.json({ success: true, data: state });
        } catch (error) {
            console.error('Get impersonation error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/auth/impersonate
     * Stop impersonating
     */
    router.delete('/impersonate', async (req, res) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }

            const token = authHeader.substring(7);
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);
            if (authError || !user) {
                return res.status(401).json({ success: false, error: 'Invalid token' });
            }

            const wasImpersonating = impersonationStore.has(user.id);
            impersonationStore.delete(user.id);

            if (wasImpersonating) {
                console.log(`[Impersonation] Platform admin ${user.id} ended impersonation`);
            }

            res.json({ success: true, data: { ended: wasImpersonating } });
        } catch (error) {
            console.error('End impersonation error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/auth/impersonate/orgs
     * List all organizations (platform admins only, for the Act As dropdown)
     */
    router.get('/impersonate/orgs', async (req, res) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }

            const token = authHeader.substring(7);
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);
            if (authError || !user) {
                return res.status(401).json({ success: false, error: 'Invalid token' });
            }

            // Verify platform admin
            const { data: adminRecord } = await supabase
                .from('platform_admins')
                .select('role')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .maybeSingle();

            if (!adminRecord) {
                return res.status(403).json({ success: false, error: 'Platform admin access required' });
            }

            const { data: orgs } = await supabase
                .from('organizations')
                .select('id, name, slug, subscription_tier, is_active')
                .eq('is_active', true)
                .order('name');

            res.json({ success: true, data: orgs || [] });
        } catch (error) {
            console.error('List orgs error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Export impersonation store for middleware access
    router.impersonationStore = impersonationStore;

    return router;
};
