/**
 * Departments API Routes
 */

const express = require('express');
const { requireOrgContext } = require('../middleware/orgContext');
const { getVerifiedOrgId } = require('../utils/orgScope');

module.exports = function(supabase) {
const router = express.Router();

// Validate org membership on all routes
router.use(requireOrgContext(supabase));

/**
 * GET /api/departments
 * List departments, scoped to the user's organization.
 * Accepts ?org_id=UUID query param or falls back to req.orgId from auth middleware.
 * Returns only departments belonging to the resolved org (filters out null org_id orphans).
 */
router.get('/', async (req, res) => {
    try {
        const orgId = getVerifiedOrgId(req) || req.query.org_id;

        // Platform admins without an org filter get all departments
        if (!orgId && req.isPlatformAdmin) {
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .not('org_id', 'is', null)
                .order('name', { ascending: true });

            if (error) throw error;
            return res.json({ success: true, data });
        }

        if (!orgId) {
            return res.status(400).json({
                success: false,
                error: 'Organization context required. Include x-org-id header.',
                code: 'ORG_CONTEXT_REQUIRED'
            });
        }

        const { data, error } = await supabase
            .from('departments')
            .select('*')
            .eq('org_id', orgId)
            .order('name', { ascending: true });

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/departments/:id
 * Get a single department
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('departments')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Verify org ownership (unless platform admin)
        if (!req.isPlatformAdmin) {
            const orgId = getVerifiedOrgId(req);
            if (orgId && data.org_id && data.org_id !== orgId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: department belongs to a different organization',
                    code: 'ORG_ACCESS_DENIED'
                });
            }
        }

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching department:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/departments/:id
 * Update a department (admin only)
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, icon, color, tagline, metrics, quick_prompts, sort_order, is_active } = req.body;

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (icon !== undefined) updates.icon = icon;
        if (color !== undefined) updates.color = color;
        if (tagline !== undefined) updates.tagline = tagline;
        if (metrics !== undefined) updates.metrics = metrics;
        if (quick_prompts !== undefined) updates.quick_prompts = quick_prompts;
        if (sort_order !== undefined) updates.sort_order = parseInt(sort_order);
        if (is_active !== undefined) updates.is_active = is_active;

        // Backfill org_id if missing
        const orgId = req.verifiedOrgId;
        if (orgId) {
            const { data: existing } = await supabase.from('departments').select('org_id').eq('id', id).maybeSingle();
            if (existing && !existing.org_id) {
                updates.org_id = orgId;
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        const { data, error } = await supabase
            .from('departments')
            .update(updates)
            .eq('id', id)
            .select()
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ success: false, error: 'Department not found' });
        }

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/departments
 * Create a new department (admin only)
 */
router.post('/', async (req, res) => {
    try {
        const { name, description, icon, color, tagline, metrics, quick_prompts, sort_order, org_id } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Department name is required'
            });
        }

        const resolvedOrgId = req.verifiedOrgId;
        if (!resolvedOrgId) {
            return res.status(400).json({
                success: false,
                error: 'Organization context is required to create a department'
            });
        }

        const { data, error } = await supabase
            .from('departments')
            .insert({
                name,
                description: description || '',
                icon: icon || 'folder',
                color: color || '#6366f1',
                tagline: tagline || '',
                metrics: metrics || [],
                quick_prompts: quick_prompts || [],
                sort_order: sort_order || 99,
                org_id: resolvedOrgId
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/departments/:id
 * Delete a department (admin only)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('departments')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Department deleted'
        });
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

return router;
};
