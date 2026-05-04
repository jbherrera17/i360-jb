/**
 * Governance API Routes
 * Manages feature flags, access policies, and audit logging
 */

const express = require('express');

module.exports = function(supabase) {
const router = express.Router();

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * GET /api/governance/feature-flags
 * List all feature flags
 */
router.get('/feature-flags', async (req, res) => {
    try {
        const { scope } = req.query;

        let query = supabase
            .from('feature_flags')
            .select('*')
            .order('feature_key', { ascending: true });

        if (scope) {
            query = query.eq('scope', scope);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching feature flags:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/governance/feature-flags/check/:featureKey
 * Check if a feature is enabled for the current context
 */
router.get('/feature-flags/check/:featureKey', async (req, res) => {
    try {
        const { featureKey } = req.params;
        const { user_id, department_id } = req.query;

        // Check user-specific flag first
        if (user_id) {
            const { data: userFlag } = await supabase
                .from('feature_flags')
                .select('is_enabled')
                .eq('feature_key', featureKey)
                .eq('scope', 'user')
                .eq('user_id', user_id)
                .single();

            if (userFlag) {
                return res.json({
                    success: true,
                    enabled: userFlag.is_enabled,
                    scope: 'user'
                });
            }
        }

        // Check department-specific flag
        if (department_id) {
            const { data: deptFlag } = await supabase
                .from('feature_flags')
                .select('is_enabled')
                .eq('feature_key', featureKey)
                .eq('scope', 'department')
                .eq('department_id', department_id)
                .single();

            if (deptFlag) {
                return res.json({
                    success: true,
                    enabled: deptFlag.is_enabled,
                    scope: 'department'
                });
            }
        }

        // Check global flag
        const { data: globalFlag } = await supabase
            .from('feature_flags')
            .select('is_enabled, rollout_percentage')
            .eq('feature_key', featureKey)
            .eq('scope', 'global')
            .single();

        if (globalFlag) {
            // Handle rollout percentage
            let enabled = globalFlag.is_enabled;
            if (enabled && globalFlag.rollout_percentage < 100 && user_id) {
                // Simple hash-based rollout
                const hash = user_id.split('').reduce((a, b) => {
                    a = ((a << 5) - a) + b.charCodeAt(0);
                    return a & a;
                }, 0);
                enabled = (Math.abs(hash) % 100) < globalFlag.rollout_percentage;
            }

            return res.json({
                success: true,
                enabled,
                scope: 'global'
            });
        }

        res.json({
            success: true,
            enabled: false,
            scope: 'not_found'
        });
    } catch (error) {
        console.error('Error checking feature flag:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/governance/feature-flags/:id
 * Update a feature flag (admin only)
 */
router.put('/feature-flags/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_enabled, rollout_percentage } = req.body;

        const updates = {};
        if (is_enabled !== undefined) updates.is_enabled = is_enabled;
        if (rollout_percentage !== undefined) updates.rollout_percentage = rollout_percentage;

        const { data, error } = await supabase
            .from('feature_flags')
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
        console.error('Error updating feature flag:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// ACCESS POLICIES
// ============================================================================

/**
 * GET /api/governance/policies
 * List access policies
 */
router.get('/policies', async (req, res) => {
    try {
        const { scope, department_id } = req.query;

        let query = supabase
            .from('access_policies')
            .select(`
                *,
                department:departments (id, name),
                created_by_user:users!created_by (id, email, display_name)
            `)
            .eq('is_active', true)
            .order('policy_key', { ascending: true });

        if (scope) {
            query = query.eq('scope', scope);
        }

        if (department_id) {
            query = query.eq('department_id', department_id);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching policies:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/governance/policies/:policyKey
 * Get a specific policy by key
 */
router.get('/policies/:policyKey', async (req, res) => {
    try {
        const { policyKey } = req.params;
        const { department_id } = req.query;

        // Try department-specific first, then company-wide
        let query = supabase
            .from('access_policies')
            .select('*')
            .eq('policy_key', policyKey)
            .eq('is_active', true);

        if (department_id) {
            query = query.eq('department_id', department_id);
        } else {
            query = query.eq('scope', 'company');
        }

        const { data, error } = await query.single();

        if (error && error.code === 'PGRST116') {
            // Not found - try company-wide
            const { data: companyPolicy, error: companyError } = await supabase
                .from('access_policies')
                .select('*')
                .eq('policy_key', policyKey)
                .eq('scope', 'company')
                .eq('is_active', true)
                .single();

            if (companyError) throw companyError;
            return res.json({ success: true, data: companyPolicy });
        }

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching policy:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/governance/policies/:id
 * Update an access policy (admin only)
 */
router.put('/policies/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { config, is_active, updated_by } = req.body;

        const updates = { updated_by };
        if (config !== undefined) updates.config = config;
        if (is_active !== undefined) updates.is_active = is_active;

        const { data, error } = await supabase
            .from('access_policies')
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
        console.error('Error updating policy:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// AUDIT LOG
// ============================================================================

/**
 * GET /api/governance/audit-log
 * Get audit log entries
 */
router.get('/audit-log', async (req, res) => {
    try {
        const {
            user_id,
            action_type,
            action_category,
            target_type,
            limit = 50,
            offset = 0
        } = req.query;

        let query = supabase
            .from('audit_log')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (user_id) {
            query = query.eq('user_id', user_id);
        }

        if (action_type) {
            query = query.eq('action_type', action_type);
        }

        if (action_category) {
            query = query.eq('action_category', action_category);
        }

        if (target_type) {
            query = query.eq('target_type', target_type);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching audit log:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/governance/audit-log
 * Create an audit log entry
 */
router.post('/audit-log', async (req, res) => {
    try {
        const {
            user_id,
            action_type,
            action_category,
            target_type,
            target_id,
            target_name,
            details
        } = req.body;

        if (!action_type) {
            return res.status(400).json({
                success: false,
                error: 'action_type is required'
            });
        }

        // Get user email for denormalization
        let user_email = null;
        if (user_id) {
            const { data: user } = await supabase
                .from('users')
                .select('email')
                .eq('id', user_id)
                .single();
            user_email = user?.email;
        }

        const { data, error } = await supabase
            .from('audit_log')
            .insert({
                user_id,
                user_email,
                action_type,
                action_category,
                target_type,
                target_id,
                target_name,
                details: details || {}
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error creating audit entry:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// COMPLIANCE
// ============================================================================

/**
 * GET /api/governance/compliance
 * List compliance requirements
 */
router.get('/compliance', async (req, res) => {
    try {
        const { status, category } = req.query;

        let query = supabase
            .from('compliance_requirements')
            .select(`
                *,
                owner:users!owner_id (id, email, display_name),
                verified_by_user:users!verified_by (id, email, display_name)
            `)
            .order('status', { ascending: true })
            .order('name', { ascending: true });

        if (status) {
            query = query.eq('status', status);
        }

        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching compliance:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/governance/compliance/summary
 * Get compliance summary stats
 */
router.get('/compliance/summary', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('compliance_requirements')
            .select('status');

        if (error) throw error;

        const summary = {
            total: data.length,
            compliant: data.filter(r => r.status === 'compliant').length,
            non_compliant: data.filter(r => r.status === 'non_compliant').length,
            in_progress: data.filter(r => r.status === 'in_progress').length,
            pending: data.filter(r => r.status === 'pending').length
        };

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Error fetching compliance summary:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

return router;
};
