/**
 * Resource Access Management Routes
 * Phase 45: Per-User Resource Access Control
 *
 * Provides admin API endpoints for managing resource visibility,
 * bulk updates, role requirements, and onboarding templates.
 */

const express = require('express');
const router = express.Router();
const {
    getVisibilityCounts,
    isValidVisibility,
    canCreatePublicResources
} = require('../utils/resourceAccess');

module.exports = function(supabase) {

    /**
     * GET /api/resource-access/summary
     * Get visibility summary for admin dashboard
     *
     * Response: { success: true, data: { agents: {...}, skills: {...}, ... } }
     */
    router.get('/summary', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'];

            const summary = {
                agents: await getVisibilityCounts(supabase, 'agents', orgId),
                skills: await getVisibilityCounts(supabase, 'skills', orgId),
                context_assets: await getVisibilityCounts(supabase, 'context_assets', orgId),
                workflows: await getWorkflowVisibilityCounts(supabase, orgId)
            };

            res.json({ success: true, data: summary });
        } catch (error) {
            console.error('Error getting visibility summary:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/resource-access/resources
     * Get all resources with their visibility settings for admin management
     *
     * Query params: type (agent|skill|context_asset|workflow), visibility, search
     */
    router.get('/resources', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'];
            const { type, visibility, search, department_id, limit = 50, offset = 0 } = req.query;

            let resources = [];

            // Get resources based on type filter
            const types = type ? [type] : ['agent', 'skill', 'context_asset', 'workflow'];

            for (const resourceType of types) {
                const tableData = await getResourcesForType(
                    supabase, resourceType, orgId, { visibility, search, department_id, limit, offset }
                );
                resources = resources.concat(tableData.map(r => ({ ...r, resource_type: resourceType })));
            }

            // Sort by name
            resources.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            res.json({ success: true, data: resources });
        } catch (error) {
            console.error('Error getting resources:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/resource-access/bulk-update
     * Update visibility for multiple resources
     *
     * Body: { resources: [{ type, id }], visibility, department_id? }
     */
    router.post('/bulk-update', async (req, res) => {
        try {
            const { resources, visibility, department_id } = req.body;
            const orgId = req.headers['x-org-id'];

            if (!resources || !Array.isArray(resources) || resources.length === 0) {
                return res.status(400).json({ success: false, error: 'No resources specified' });
            }

            if (!isValidVisibility(visibility)) {
                return res.status(400).json({ success: false, error: 'Invalid visibility value' });
            }

            // Check if org allows public resources
            if (visibility === 'public') {
                const canPublic = await canCreatePublicResources(supabase, orgId);
                if (!canPublic) {
                    return res.status(403).json({
                        success: false,
                        error: 'Your subscription tier does not allow public resources'
                    });
                }
            }

            const results = [];
            for (const resource of resources) {
                const table = getTableName(resource.type);
                if (!table) {
                    results.push({ ...resource, success: false, error: 'Invalid resource type' });
                    continue;
                }

                const updateData = { visibility };
                if (department_id !== undefined) {
                    updateData.department_id = department_id || null;
                }

                const { error } = await supabase
                    .from(table)
                    .update(updateData)
                    .eq('id', resource.id);

                results.push({ ...resource, success: !error, error: error?.message });
            }

            const successCount = results.filter(r => r.success).length;
            res.json({
                success: true,
                message: `Updated ${successCount} of ${resources.length} resources`,
                data: results
            });
        } catch (error) {
            console.error('Error in bulk update:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/resource-access/role-requirement
     * Set minimum business role for a resource
     *
     * Body: { resource_type, resource_id, min_business_role }
     */
    router.post('/role-requirement', async (req, res) => {
        try {
            const { resource_type, resource_id, min_business_role } = req.body;
            const userId = req.userId || req.headers['x-user-id'];
            const orgId = req.headers['x-org-id'];

            if (!resource_type || !resource_id) {
                return res.status(400).json({ success: false, error: 'Resource type and ID required' });
            }

            const validRoles = ['ic', 'supervisor', 'manager', 'director', 'executive'];
            if (min_business_role && !validRoles.includes(min_business_role)) {
                return res.status(400).json({ success: false, error: 'Invalid business role' });
            }

            if (!min_business_role) {
                // Remove role requirement
                const { error } = await supabase
                    .from('role_resource_visibility')
                    .delete()
                    .eq('resource_type', resource_type)
                    .eq('resource_id', resource_id);

                if (error) throw error;

                return res.json({ success: true, message: 'Role requirement removed' });
            }

            // Upsert role requirement
            const { data, error } = await supabase
                .from('role_resource_visibility')
                .upsert({
                    org_id: orgId,
                    resource_type,
                    resource_id,
                    min_business_role,
                    created_by: userId
                }, { onConflict: 'resource_id,resource_type' })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error setting role requirement:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/resource-access/role-requirements
     * Get all role requirements for an organization
     */
    router.get('/role-requirements', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'];

            const { data, error } = await supabase
                .from('role_resource_visibility')
                .select('*')
                .eq('org_id', orgId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error getting role requirements:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/resource-access/templates
     * Get available onboarding templates
     */
    router.get('/templates', async (req, res) => {
        try {
            const templates = [
                {
                    id: 'starter',
                    name: 'Starter Pack',
                    description: 'Basic agents with organization visibility',
                    agents: ['content-writer', 'email-composer'],
                    skills: ['article-generator', 'email-draft'],
                    visibility: 'organization'
                },
                {
                    id: 'business',
                    name: 'Business Pack',
                    description: 'Strategy and research agents with department visibility',
                    agents: ['content-writer', 'strategy-advisor', 'research-analyst'],
                    skills: ['article-generator', 'market-research', 'competitive-analysis'],
                    visibility: 'organization'
                },
                {
                    id: 'enterprise',
                    name: 'Enterprise Pack',
                    description: 'All system agents with role-based access',
                    agents: '*',
                    skills: '*',
                    visibility: 'organization'
                }
            ];

            res.json({ success: true, data: templates });
        } catch (error) {
            console.error('Error getting templates:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/resource-access/apply-template
     * Apply onboarding template to organization
     *
     * Body: { template_id }
     */
    router.post('/apply-template', async (req, res) => {
        try {
            const { template_id } = req.body;
            const orgId = req.headers['x-org-id'];

            if (!template_id) {
                return res.status(400).json({ success: false, error: 'Template ID required' });
            }

            const templates = {
                'starter': {
                    agents: ['content-writer', 'email-composer'],
                    skills: ['article-generator', 'email-draft'],
                    visibility: 'organization'
                },
                'business': {
                    agents: ['content-writer', 'strategy-advisor', 'research-analyst'],
                    skills: ['article-generator', 'market-research', 'competitive-analysis'],
                    visibility: 'organization'
                },
                'enterprise': {
                    agents: '*',
                    skills: '*',
                    visibility: 'organization'
                }
            };

            const template = templates[template_id];
            if (!template) {
                return res.status(400).json({ success: false, error: 'Unknown template' });
            }

            let updatedCount = 0;

            // Update agents
            if (template.agents === '*') {
                const { count } = await supabase
                    .from('agents')
                    .update({ visibility: template.visibility, org_id: orgId })
                    .eq('is_system', true)
                    .select('*', { count: 'exact', head: true });
                updatedCount += count || 0;
            } else {
                for (const agentSlug of template.agents) {
                    await supabase
                        .from('agents')
                        .update({ visibility: template.visibility, org_id: orgId })
                        .eq('is_system', true)
                        .ilike('name', `%${agentSlug.replace('-', '%')}%`);
                    updatedCount++;
                }
            }

            // Update skills
            if (template.skills === '*') {
                const { count } = await supabase
                    .from('skills')
                    .update({ visibility: template.visibility, org_id: orgId })
                    .eq('is_system', true)
                    .select('*', { count: 'exact', head: true });
                updatedCount += count || 0;
            } else {
                for (const skillSlug of template.skills) {
                    await supabase
                        .from('skills')
                        .update({ visibility: template.visibility, org_id: orgId })
                        .eq('is_system', true)
                        .ilike('name', `%${skillSlug.replace('-', '%')}%`);
                    updatedCount++;
                }
            }

            res.json({
                success: true,
                message: `Applied ${template_id} template. Updated ${updatedCount} resources.`
            });
        } catch (error) {
            console.error('Error applying template:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/resource-access/tier-settings
     * Get visibility settings for current tier
     */
    router.get('/tier-settings', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'];

            const { data: org } = await supabase
                .from('organizations')
                .select('subscription_tier_id')
                .eq('id', orgId)
                .single();

            if (!org?.subscription_tier_id) {
                return res.json({
                    success: true,
                    data: {
                        default_resource_visibility: 'private',
                        allow_public_resources: false
                    }
                });
            }

            const { data: tier } = await supabase
                .from('subscription_tiers')
                .select('tier_id, tier_name, default_resource_visibility, allow_public_resources')
                .eq('tier_id', org.subscription_tier_id)
                .single();

            res.json({ success: true, data: tier || {} });
        } catch (error) {
            console.error('Error getting tier settings:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};

// Helper functions

function getTableName(resourceType) {
    const tables = {
        'agent': 'agents',
        'skill': 'skills',
        'context_asset': 'context_assets',
        'workflow': 'workflows'
    };
    return tables[resourceType];
}

async function getResourcesForType(supabase, resourceType, orgId, filters) {
    const table = getTableName(resourceType);
    if (!table) return [];

    let query = supabase
        .from(table)
        .select('id, name, visibility, department_id, user_id, org_id, is_system, module_id, created_at')
        .order('name');

    // Filter by org (include system resources with null org_id)
    if (orgId) {
        query = query.or(`org_id.eq.${orgId},org_id.is.null`);
    }

    if (filters.visibility && filters.visibility !== 'all') {
        query = query.eq('visibility', filters.visibility);
    }

    if (filters.department_id) {
        query = query.eq('department_id', filters.department_id);
    }

    if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
    }

    query = query.range(parseInt(filters.offset), parseInt(filters.offset) + parseInt(filters.limit) - 1);

    const { data, error } = await query;

    if (error) {
        console.error(`Error getting ${resourceType} resources:`, error);
        return [];
    }

    return data || [];
}

async function getWorkflowVisibilityCounts(supabase, orgId) {
    // Workflows use is_public instead of visibility
    const counts = {
        private: 0,
        public: 0
    };

    let privateQuery = supabase
        .from('workflows')
        .select('*', { count: 'exact', head: true })
        .eq('is_public', false);

    let publicQuery = supabase
        .from('workflows')
        .select('*', { count: 'exact', head: true })
        .eq('is_public', true);

    if (orgId) {
        privateQuery = privateQuery.or(`org_id.eq.${orgId},org_id.is.null`);
        publicQuery = publicQuery.or(`org_id.eq.${orgId},org_id.is.null`);
    }

    const [privateResult, publicResult] = await Promise.all([privateQuery, publicQuery]);

    counts.private = privateResult.count || 0;
    counts.public = publicResult.count || 0;

    return counts;
}
