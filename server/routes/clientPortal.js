/**
 * Client Portal API Routes
 * Handles client self-service authentication and report access
 */

const express = require('express');
const crypto = require('crypto');

module.exports = function(supabase) {
    const router = express.Router();

    /**
     * Helper: Hash a token using SHA256
     */
    function hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Helper: Generate a secure random token
     */
    function generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Middleware: Authenticate client user via session token
     */
    async function authenticateClientUser(req, res, next) {
        const authHeader = req.headers.authorization;
        const sessionToken = authHeader?.replace('Bearer ', '');

        if (!sessionToken) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        const tokenHash = hashToken(sessionToken);

        // Find active session
        const { data: session, error: sessionError } = await supabase
            .from('client_portal_sessions')
            .select(`
                id,
                client_user_id,
                expires_at,
                client_users (
                    id,
                    client_id,
                    email,
                    name,
                    role,
                    status
                )
            `)
            .eq('session_token_hash', tokenHash)
            .eq('is_active', true)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (sessionError || !session) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired session'
            });
        }

        if (session.client_users.status !== 'active') {
            return res.status(403).json({
                success: false,
                error: 'Account is not active'
            });
        }

        // Update last activity
        await supabase
            .from('client_portal_sessions')
            .update({ last_activity_at: new Date().toISOString() })
            .eq('id', session.id);

        // Attach user info to request
        req.clientUser = session.client_users;
        req.sessionId = session.id;
        next();
    }

    // ==========================================
    // AUTHENTICATION ENDPOINTS
    // ==========================================

    /**
     * POST /api/client-portal/auth/request-access
     * Request a magic link to be sent to the client user
     */
    router.post('/auth/request-access', async (req, res) => {
        try {
            const { email, client_id } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    error: 'Email is required'
                });
            }

            // Find client user
            let query = supabase
                .from('client_users')
                .select('id, client_id, email, name, status')
                .eq('email', email.toLowerCase())
                .in('status', ['pending', 'active']);

            if (client_id) {
                query = query.eq('client_id', client_id);
            }

            const { data: user, error: userError } = await query.single();

            if (userError || !user) {
                // Don't reveal whether user exists
                return res.json({
                    success: true,
                    message: 'If an account exists with this email, a login link will be sent'
                });
            }

            // Generate magic link token
            const token = generateToken();
            const tokenHash = hashToken(token);

            // Create magic link token
            const { error: tokenError } = await supabase
                .from('client_access_tokens')
                .insert({
                    client_user_id: user.id,
                    token_hash: tokenHash,
                    token_type: 'magic_link',
                    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
                });

            if (tokenError) throw tokenError;

            // TODO: Send email with magic link
            // For now, return token in response (remove in production)
            const magicLink = `/client-portal?token=${token}`;

            console.log(`[Client Portal] Magic link generated for ${email}: ${magicLink}`);

            res.json({
                success: true,
                message: 'If an account exists with this email, a login link will be sent',
                // DEV ONLY - remove in production
                _dev_token: process.env.NODE_ENV === 'development' ? token : undefined,
                _dev_link: process.env.NODE_ENV === 'development' ? magicLink : undefined
            });
        } catch (error) {
            console.error('Error requesting access:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process request'
            });
        }
    });

    /**
     * POST /api/client-portal/auth/verify
     * Verify magic link token and create session
     */
    router.post('/auth/verify', async (req, res) => {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    error: 'Token is required'
                });
            }

            const tokenHash = hashToken(token);

            // Use the validation function
            const { data: validation, error: validationError } = await supabase
                .rpc('validate_client_magic_link', { p_token_hash: tokenHash });

            if (validationError) throw validationError;

            const result = validation[0];

            if (!result.valid) {
                return res.status(401).json({
                    success: false,
                    error: result.error_message || 'Invalid or expired token'
                });
            }

            // Create session
            const sessionToken = generateToken();
            const sessionTokenHash = hashToken(sessionToken);
            const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            const { error: sessionError } = await supabase
                .from('client_portal_sessions')
                .insert({
                    client_user_id: result.client_user_id,
                    session_token_hash: sessionTokenHash,
                    expires_at: sessionExpiry.toISOString(),
                    ip_address: req.ip,
                    user_agent: req.headers['user-agent']
                });

            if (sessionError) throw sessionError;

            // Log activity
            await supabase
                .from('client_activity_log')
                .insert({
                    client_user_id: result.client_user_id,
                    client_id: result.client_id,
                    activity_type: 'login',
                    ip_address: req.ip,
                    user_agent: req.headers['user-agent']
                });

            res.json({
                success: true,
                data: {
                    session_token: sessionToken,
                    expires_at: sessionExpiry.toISOString(),
                    user: {
                        id: result.client_user_id,
                        client_id: result.client_id,
                        email: result.email,
                        name: result.name,
                        role: result.role
                    }
                }
            });
        } catch (error) {
            console.error('Error verifying token:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to verify token'
            });
        }
    });

    /**
     * POST /api/client-portal/auth/logout
     * Invalidate current session
     */
    router.post('/auth/logout', authenticateClientUser, async (req, res) => {
        try {
            // Deactivate session
            await supabase
                .from('client_portal_sessions')
                .update({ is_active: false })
                .eq('id', req.sessionId);

            // Log activity
            await supabase
                .from('client_activity_log')
                .insert({
                    client_user_id: req.clientUser.id,
                    client_id: req.clientUser.client_id,
                    activity_type: 'logout'
                });

            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            console.error('Error logging out:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to logout'
            });
        }
    });

    /**
     * GET /api/client-portal/auth/me
     * Get current client user info
     */
    router.get('/auth/me', authenticateClientUser, async (req, res) => {
        try {
            const { data: client, error: clientError } = await supabase
                .from('clients')
                .select('id, name, org_id, status')
                .eq('id', req.clientUser.client_id)
                .single();

            if (clientError) throw clientError;

            res.json({
                success: true,
                data: {
                    user: req.clientUser,
                    client
                }
            });
        } catch (error) {
            console.error('Error fetching user info:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch user info'
            });
        }
    });

    // ==========================================
    // PROFILE ENDPOINTS
    // ==========================================

    /**
     * GET /api/client-portal/profile
     * Get client's company profile
     */
    router.get('/profile', authenticateClientUser, async (req, res) => {
        try {
            const { data: profile, error } = await supabase
                .from('company_profiles')
                .select('*')
                .eq('client_id', req.clientUser.client_id)
                .neq('status', 'archived')
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            res.json({
                success: true,
                data: profile || null
            });
        } catch (error) {
            console.error('Error fetching profile:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch profile'
            });
        }
    });

    /**
     * GET /api/client-portal/profile/summary
     * Get summary of all assessments for the client
     */
    router.get('/profile/summary', authenticateClientUser, async (req, res) => {
        try {
            const clientId = req.clientUser.client_id;

            // Get company profile
            const { data: profile } = await supabase
                .from('company_profiles')
                .select('id, company_name')
                .eq('client_id', clientId)
                .neq('status', 'archived')
                .single();

            if (!profile) {
                return res.json({
                    success: true,
                    data: null
                });
            }

            // Get latest assessments
            const [
                { data: maturity },
                { data: readiness },
                { data: sessions }
            ] = await Promise.all([
                supabase
                    .from('ai_maturity_assessments')
                    .select('overall_score, maturity_level, created_at')
                    .eq('company_profile_id', profile.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single(),
                supabase
                    .from('team_readiness_assessments')
                    .select('overall_readiness_score, created_at')
                    .eq('company_profile_id', profile.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single(),
                supabase
                    .from('align120_sessions')
                    .select('id, status, created_at, completed_at')
                    .eq('client_id', clientId)
                    .order('created_at', { ascending: false })
                    .limit(5)
            ]);

            res.json({
                success: true,
                data: {
                    company_name: profile.company_name,
                    maturity: maturity || null,
                    readiness: readiness || null,
                    recent_sessions: sessions || []
                }
            });
        } catch (error) {
            console.error('Error fetching profile summary:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch profile summary'
            });
        }
    });

    // ==========================================
    // REPORT ENDPOINTS
    // ==========================================

    /**
     * GET /api/client-portal/reports
     * List shared reports for the client
     */
    router.get('/reports', authenticateClientUser, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('client_report_shares')
                .select(`
                    id,
                    shared_at,
                    share_message,
                    expires_at,
                    can_download,
                    can_print,
                    view_count,
                    first_viewed_at,
                    last_viewed_at,
                    session_reports (
                        id,
                        report_type,
                        format,
                        version,
                        generated_at,
                        content
                    ),
                    align120_sessions:session_reports(
                        session_id,
                        align120_sessions (
                            company_name
                        )
                    )
                `)
                .eq('client_id', req.clientUser.client_id)
                .eq('is_active', true)
                .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
                .order('shared_at', { ascending: false });

            if (error) throw error;

            // Format response
            const reports = data.map(share => ({
                share_id: share.id,
                shared_at: share.shared_at,
                share_message: share.share_message,
                expires_at: share.expires_at,
                can_download: share.can_download,
                can_print: share.can_print,
                view_count: share.view_count,
                first_viewed_at: share.first_viewed_at,
                report: share.session_reports ? {
                    id: share.session_reports.id,
                    type: share.session_reports.report_type,
                    format: share.session_reports.format,
                    version: share.session_reports.version,
                    generated_at: share.session_reports.generated_at
                } : null
            }));

            res.json({
                success: true,
                data: reports
            });
        } catch (error) {
            console.error('Error fetching reports:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch reports'
            });
        }
    });

    /**
     * GET /api/client-portal/reports/:reportId
     * Get a specific shared report
     */
    router.get('/reports/:reportId', authenticateClientUser, async (req, res) => {
        try {
            const { reportId } = req.params;

            // Check access
            const { data: share, error: shareError } = await supabase
                .from('client_report_shares')
                .select('*')
                .eq('session_report_id', reportId)
                .eq('client_id', req.clientUser.client_id)
                .eq('is_active', true)
                .single();

            if (shareError || !share) {
                return res.status(404).json({
                    success: false,
                    error: 'Report not found or access denied'
                });
            }

            // Check expiry
            if (share.expires_at && new Date(share.expires_at) < new Date()) {
                return res.status(403).json({
                    success: false,
                    error: 'Report access has expired'
                });
            }

            // Check view limit
            if (share.max_views && share.view_count >= share.max_views) {
                return res.status(403).json({
                    success: false,
                    error: 'View limit reached'
                });
            }

            // Get report
            const { data: report, error: reportError } = await supabase
                .from('session_reports')
                .select('*')
                .eq('id', reportId)
                .single();

            if (reportError) throw reportError;

            // Record view
            await supabase.rpc('record_report_view', {
                p_client_user_id: req.clientUser.id,
                p_session_report_id: reportId
            });

            res.json({
                success: true,
                data: {
                    report,
                    share: {
                        can_download: share.can_download,
                        can_print: share.can_print,
                        expires_at: share.expires_at
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching report:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch report'
            });
        }
    });

    /**
     * GET /api/client-portal/reports/:reportId/download
     * Download a report (if permitted)
     */
    router.get('/reports/:reportId/download', authenticateClientUser, async (req, res) => {
        try {
            const { reportId } = req.params;

            // Check access and download permission
            const { data: share, error: shareError } = await supabase
                .from('client_report_shares')
                .select('*')
                .eq('session_report_id', reportId)
                .eq('client_id', req.clientUser.client_id)
                .eq('is_active', true)
                .single();

            if (shareError || !share) {
                return res.status(404).json({
                    success: false,
                    error: 'Report not found or access denied'
                });
            }

            if (!share.can_download) {
                return res.status(403).json({
                    success: false,
                    error: 'Download not permitted for this report'
                });
            }

            // Get report
            const { data: report, error: reportError } = await supabase
                .from('session_reports')
                .select('*')
                .eq('id', reportId)
                .single();

            if (reportError) throw reportError;

            // Update download count
            await supabase
                .from('client_report_shares')
                .update({
                    download_count: share.download_count + 1
                })
                .eq('id', share.id);

            // Log activity
            await supabase
                .from('client_activity_log')
                .insert({
                    client_user_id: req.clientUser.id,
                    client_id: req.clientUser.client_id,
                    activity_type: 'download_report',
                    resource_type: 'report',
                    resource_id: reportId
                });

            // Return report content based on format
            if (report.format === 'json') {
                res.json(report.content);
            } else if (report.file_path) {
                // TODO: Implement file download from storage
                res.json({
                    success: true,
                    file_path: report.file_path
                });
            } else {
                res.json(report.content);
            }
        } catch (error) {
            console.error('Error downloading report:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to download report'
            });
        }
    });

    // ==========================================
    // CLIENT USER MANAGEMENT (Admin only)
    // ==========================================

    /**
     * GET /api/client-portal/users
     * List users for the client (admin only)
     */
    router.get('/users', authenticateClientUser, async (req, res) => {
        try {
            if (req.clientUser.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Admin access required'
                });
            }

            const { data, error } = await supabase
                .from('client_users')
                .select('id, email, name, title, role, status, last_login_at, created_at')
                .eq('client_id', req.clientUser.client_id)
                .neq('status', 'removed')
                .order('name');

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch users'
            });
        }
    });

    /**
     * PUT /api/client-portal/users/:userId/settings
     * Update user settings (self or admin)
     */
    router.put('/users/:userId/settings', authenticateClientUser, async (req, res) => {
        try {
            const { userId } = req.params;
            const { notification_prefs, timezone, locale } = req.body;

            // Check permission
            if (userId !== req.clientUser.id && req.clientUser.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Cannot modify other users'
                });
            }

            const { data, error } = await supabase
                .from('client_users')
                .update({
                    notification_prefs,
                    timezone,
                    locale,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .eq('client_id', req.clientUser.client_id)
                .select()
                .single();

            if (error) throw error;

            // Log activity
            await supabase
                .from('client_activity_log')
                .insert({
                    client_user_id: req.clientUser.id,
                    client_id: req.clientUser.client_id,
                    activity_type: 'update_settings',
                    resource_type: 'user',
                    resource_id: userId
                });

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error updating settings:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update settings'
            });
        }
    });

    // ==========================================
    // AGENCY-SIDE ENDPOINTS
    // (For agency users managing client access)
    // ==========================================

    /**
     * Middleware: Check agency user has access to client
     */
    async function requireAgencyAccess(req, res, next) {
        const userId = req.userId;
        const clientId = req.params.clientId || req.body.client_id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        if (!clientId) {
            return res.status(400).json({
                success: false,
                error: 'Client ID required'
            });
        }

        // Get client's org and check membership
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('org_id')
            .eq('id', clientId)
            .single();

        if (clientError || !client) {
            return res.status(404).json({
                success: false,
                error: 'Client not found'
            });
        }

        const { data: membership, error: memberError } = await supabase
            .from('organization_members')
            .select('role')
            .eq('org_id', client.org_id)
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (memberError || !membership) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized for this client'
            });
        }

        req.clientOrgRole = membership.role;
        req.clientId = clientId;
        next();
    }

    /**
     * POST /api/client-portal/agency/invite
     * Agency invites a client user
     */
    router.post('/agency/invite', requireAgencyAccess, async (req, res) => {
        try {
            const { email, name, title, role } = req.body;
            const clientId = req.clientId;
            const agencyUserId = req.userId;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    error: 'Email is required'
                });
            }

            // Check if user already exists
            const { data: existing } = await supabase
                .from('client_users')
                .select('id, status')
                .eq('client_id', clientId)
                .eq('email', email.toLowerCase())
                .single();

            if (existing && existing.status !== 'removed') {
                return res.status(400).json({
                    success: false,
                    error: 'User already exists for this client'
                });
            }

            // Create client user
            const { data: user, error: userError } = await supabase
                .from('client_users')
                .insert({
                    client_id: clientId,
                    email: email.toLowerCase(),
                    name,
                    title,
                    role: role || 'viewer',
                    status: 'pending',
                    invited_by: agencyUserId,
                    invited_at: new Date().toISOString()
                })
                .select()
                .single();

            if (userError) throw userError;

            // Generate invitation token
            const token = generateToken();
            const tokenHash = hashToken(token);

            await supabase
                .from('client_access_tokens')
                .insert({
                    client_user_id: user.id,
                    token_hash: tokenHash,
                    token_type: 'invitation',
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
                });

            // TODO: Send invitation email

            res.status(201).json({
                success: true,
                data: {
                    user,
                    // DEV ONLY
                    _dev_invitation_link: process.env.NODE_ENV === 'development'
                        ? `/client-portal?token=${token}`
                        : undefined
                }
            });
        } catch (error) {
            console.error('Error inviting client user:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to invite user'
            });
        }
    });

    /**
     * POST /api/client-portal/agency/share-report
     * Share a report with a client
     */
    router.post('/agency/share-report', requireAgencyAccess, async (req, res) => {
        try {
            const {
                session_report_id,
                share_message,
                expires_at,
                max_views,
                can_download,
                can_print,
                requires_auth
            } = req.body;
            const clientId = req.clientId;
            const agencyUserId = req.userId;

            if (!session_report_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Report ID is required'
                });
            }

            // Verify report exists
            const { data: report, error: reportError } = await supabase
                .from('session_reports')
                .select('id')
                .eq('id', session_report_id)
                .single();

            if (reportError || !report) {
                return res.status(404).json({
                    success: false,
                    error: 'Report not found'
                });
            }

            // Create or update share
            const { data: share, error: shareError } = await supabase
                .from('client_report_shares')
                .upsert({
                    client_id: clientId,
                    session_report_id,
                    shared_by: agencyUserId,
                    shared_at: new Date().toISOString(),
                    share_message,
                    expires_at,
                    max_views,
                    can_download: can_download !== false,
                    can_print: can_print !== false,
                    requires_auth: requires_auth !== false,
                    is_active: true
                }, {
                    onConflict: 'client_id,session_report_id'
                })
                .select()
                .single();

            if (shareError) throw shareError;

            res.json({
                success: true,
                data: share
            });
        } catch (error) {
            console.error('Error sharing report:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to share report'
            });
        }
    });

    /**
     * DELETE /api/client-portal/agency/share-report/:shareId
     * Revoke a report share
     */
    router.delete('/agency/share-report/:shareId', requireAgencyAccess, async (req, res) => {
        try {
            const { shareId } = req.params;

            const { error } = await supabase
                .from('client_report_shares')
                .update({ is_active: false })
                .eq('id', shareId)
                .eq('client_id', req.clientId);

            if (error) throw error;

            res.json({
                success: true,
                message: 'Report share revoked'
            });
        } catch (error) {
            console.error('Error revoking share:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to revoke share'
            });
        }
    });

    /**
     * GET /api/client-portal/agency/client/:clientId/users
     * List client users (agency view)
     */
    router.get('/agency/client/:clientId/users', requireAgencyAccess, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('client_users')
                .select('*')
                .eq('client_id', req.clientId)
                .neq('status', 'removed')
                .order('name');

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error fetching client users:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch users'
            });
        }
    });

    /**
     * GET /api/client-portal/agency/client/:clientId/activity
     * Get client activity log (agency view)
     */
    router.get('/agency/client/:clientId/activity', requireAgencyAccess, async (req, res) => {
        try {
            const { limit = 50, offset = 0 } = req.query;

            const { data, error } = await supabase
                .from('client_activity_log')
                .select(`
                    *,
                    client_users (
                        email,
                        name
                    )
                `)
                .eq('client_id', req.clientId)
                .order('created_at', { ascending: false })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error fetching activity:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch activity'
            });
        }
    });

    return router;
};
