/**
 * Connections API Routes
 * Manages organizational → AI capability connections (Phase 40)
 *
 * Endpoints:
 * - Skill roles/tags/OKR mappings
 * - Responsibility AI mappings
 * - User AI assignments
 * - User capabilities query
 */

const express = require('express');

module.exports = function(supabase) {
    const router = express.Router();

    // ============================================================================
    // USER CAPABILITIES - What can a user access?
    // ============================================================================

    /**
     * GET /api/connections/capabilities
     * Get all AI capabilities accessible to the current user
     * Query params: type (agent|skill|workflow|action)
     *
     * This provides a simplified view of capabilities. For full access control,
     * the user_full_capabilities database view should be used.
     */
    router.get('/capabilities', async (req, res) => {
        try {
            const userId = req.userId;
            const { type } = req.query;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Gather capabilities from multiple sources
            const capabilities = [];

            // Fetch agents (all active agents for now - can be refined with role checks)
            if (!type || type === 'agent') {
                const { data: agents } = await supabase
                    .from('agents')
                    .select('id, name, description, suite, category, is_active')
                    .eq('is_active', true)
                    .order('name');

                (agents || []).forEach(agent => {
                    capabilities.push({
                        entity_type: 'agent',
                        entity_id: agent.id,
                        entity_name: agent.name,
                        description: agent.description,
                        suite: agent.suite,
                        category: agent.category,
                        access_source: 'available',
                        is_featured: false
                    });
                });
            }

            // Fetch skills
            if (!type || type === 'skill') {
                const { data: skills } = await supabase
                    .from('skills')
                    .select('id, name, description, category, status')
                    .in('status', ['active', 'published'])
                    .order('name');

                (skills || []).forEach(skill => {
                    capabilities.push({
                        entity_type: 'skill',
                        entity_id: skill.id,
                        entity_name: skill.name,
                        description: skill.description,
                        category: skill.category,
                        access_source: 'available',
                        is_featured: false
                    });
                });
            }

            // Fetch workflows
            if (!type || type === 'workflow') {
                const { data: workflows } = await supabase
                    .from('workflows')
                    .select('id, name, description, category, status')
                    .in('status', ['active', 'published'])
                    .order('name');

                (workflows || []).forEach(workflow => {
                    capabilities.push({
                        entity_type: 'workflow',
                        entity_id: workflow.id,
                        entity_name: workflow.name,
                        description: workflow.description,
                        category: workflow.category,
                        access_source: 'available',
                        is_featured: false
                    });
                });
            }

            // Fetch actions
            if (!type || type === 'action') {
                const { data: actions } = await supabase
                    .from('actions')
                    .select('id, name, description, category, status')
                    .in('status', ['active', 'published'])
                    .order('name');

                (actions || []).forEach(action => {
                    capabilities.push({
                        entity_type: 'action',
                        entity_id: action.id,
                        entity_name: action.name,
                        description: action.description,
                        category: action.category,
                        access_source: 'available',
                        is_featured: false
                    });
                });
            }

            res.json({
                success: true,
                data: capabilities
            });
        } catch (error) {
            console.error('Error getting user capabilities:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/connections/capabilities/check
     * Check if user can access a specific capability
     * Query params: type, id
     */
    router.get('/capabilities/check', async (req, res) => {
        try {
            const userId = req.userId;
            const { type, id } = req.query;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            if (!type || !id) {
                return res.status(400).json({
                    success: false,
                    error: 'Type and ID are required'
                });
            }

            const { data, error } = await supabase
                .rpc('user_can_access_capability', {
                    p_user_id: userId,
                    p_entity_type: type,
                    p_entity_id: id
                });

            if (error) throw error;

            res.json({
                success: true,
                can_access: data
            });
        } catch (error) {
            console.error('Error checking capability access:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // SKILL ROLES - Role-based skill access
    // ============================================================================

    /**
     * GET /api/connections/skills/:skillId/roles
     * Get role assignments for a skill
     */
    router.get('/skills/:skillId/roles', async (req, res) => {
        try {
            const { skillId } = req.params;

            const { data, error } = await supabase
                .from('skill_roles')
                .select(`
                    id,
                    role_level,
                    permission,
                    created_at,
                    business_role_levels (
                        id,
                        name,
                        level
                    )
                `)
                .eq('skill_id', skillId);

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });
        } catch (error) {
            console.error('Error getting skill roles:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/connections/skills/:skillId/roles
     * Add role assignment to a skill
     */
    router.post('/skills/:skillId/roles', async (req, res) => {
        try {
            const { skillId } = req.params;
            const { role_level, permission = 'execute' } = req.body;

            if (!role_level) {
                return res.status(400).json({
                    success: false,
                    error: 'role_level is required'
                });
            }

            const { data, error } = await supabase
                .from('skill_roles')
                .insert({
                    skill_id: skillId,
                    role_level,
                    permission
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    return res.status(400).json({
                        success: false,
                        error: 'Role already assigned to this skill'
                    });
                }
                throw error;
            }

            res.status(201).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error adding skill role:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/connections/skills/:skillId/roles/:roleLevel
     * Remove role assignment from a skill
     */
    router.delete('/skills/:skillId/roles/:roleLevel', async (req, res) => {
        try {
            const { skillId, roleLevel } = req.params;

            const { error } = await supabase
                .from('skill_roles')
                .delete()
                .eq('skill_id', skillId)
                .eq('role_level', roleLevel);

            if (error) throw error;

            res.json({
                success: true,
                message: 'Role assignment removed'
            });
        } catch (error) {
            console.error('Error removing skill role:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // SKILL TAGS - Tag-based skill matching
    // ============================================================================

    /**
     * GET /api/connections/skills/:skillId/tags
     * Get tags for a skill
     */
    router.get('/skills/:skillId/tags', async (req, res) => {
        try {
            const { skillId } = req.params;

            const { data, error } = await supabase
                .from('skill_tags')
                .select(`
                    skill_id,
                    tag_id,
                    tags (
                        id,
                        name,
                        category,
                        color
                    )
                `)
                .eq('skill_id', skillId);

            if (error) throw error;

            res.json({
                success: true,
                data: data?.map(st => st.tags) || []
            });
        } catch (error) {
            console.error('Error getting skill tags:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/connections/skills/:skillId/tags
     * Add tag to a skill
     */
    router.post('/skills/:skillId/tags', async (req, res) => {
        try {
            const { skillId } = req.params;
            const { tag_id } = req.body;

            if (!tag_id) {
                return res.status(400).json({
                    success: false,
                    error: 'tag_id is required'
                });
            }

            const { data, error } = await supabase
                .from('skill_tags')
                .insert({
                    skill_id: skillId,
                    tag_id
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    return res.status(400).json({
                        success: false,
                        error: 'Tag already assigned to this skill'
                    });
                }
                throw error;
            }

            res.status(201).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error adding skill tag:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/connections/skills/:skillId/tags/:tagId
     * Remove tag from a skill
     */
    router.delete('/skills/:skillId/tags/:tagId', async (req, res) => {
        try {
            const { skillId, tagId } = req.params;

            const { error } = await supabase
                .from('skill_tags')
                .delete()
                .eq('skill_id', skillId)
                .eq('tag_id', tagId);

            if (error) throw error;

            res.json({
                success: true,
                message: 'Tag removed from skill'
            });
        } catch (error) {
            console.error('Error removing skill tag:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // SKILL OKR MAPPINGS
    // ============================================================================

    /**
     * GET /api/connections/skills/:skillId/okrs
     * Get OKR mappings for a skill
     */
    router.get('/skills/:skillId/okrs', async (req, res) => {
        try {
            const { skillId } = req.params;

            const { data, error } = await supabase
                .from('skill_okr_mappings')
                .select(`
                    id,
                    contribution_type,
                    is_active,
                    created_at,
                    okrs (
                        id,
                        title,
                        scope,
                        status
                    )
                `)
                .eq('skill_id', skillId);

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });
        } catch (error) {
            console.error('Error getting skill OKR mappings:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/connections/skills/:skillId/okrs
     * Map a skill to an OKR
     */
    router.post('/skills/:skillId/okrs', async (req, res) => {
        try {
            const { skillId } = req.params;
            const userId = req.userId;
            const { okr_id, contribution_type = 'supports' } = req.body;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            if (!okr_id) {
                return res.status(400).json({
                    success: false,
                    error: 'okr_id is required'
                });
            }

            const { data, error } = await supabase
                .from('skill_okr_mappings')
                .insert({
                    user_id: userId,
                    skill_id: skillId,
                    okr_id,
                    contribution_type
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    return res.status(400).json({
                        success: false,
                        error: 'Skill already mapped to this OKR'
                    });
                }
                throw error;
            }

            res.status(201).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error mapping skill to OKR:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/connections/skills/:skillId/okrs/:okrId
     * Remove skill-OKR mapping
     */
    router.delete('/skills/:skillId/okrs/:okrId', async (req, res) => {
        try {
            const { skillId, okrId } = req.params;

            const { error } = await supabase
                .from('skill_okr_mappings')
                .delete()
                .eq('skill_id', skillId)
                .eq('okr_id', okrId);

            if (error) throw error;

            res.json({
                success: true,
                message: 'Skill-OKR mapping removed'
            });
        } catch (error) {
            console.error('Error removing skill-OKR mapping:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // RESPONSIBILITY AI MAPPINGS
    // ============================================================================

    /**
     * GET /api/connections/responsibilities/:respId/ai
     * Get all AI recommendations for a responsibility
     */
    router.get('/responsibilities/:respId/ai', async (req, res) => {
        try {
            const { respId } = req.params;

            const { data, error } = await supabase
                .from('responsibility_ai_recommendations')
                .select('*')
                .eq('responsibility_id', respId);

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });
        } catch (error) {
            console.error('Error getting responsibility AI mappings:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/connections/responsibilities/:respId/agents
     * Add agent recommendation to responsibility
     */
    router.post('/responsibilities/:respId/agents', async (req, res) => {
        try {
            const { respId } = req.params;
            const { agent_id, recommendation_strength = 'suggested', use_case_note } = req.body;

            if (!agent_id) {
                return res.status(400).json({
                    success: false,
                    error: 'agent_id is required'
                });
            }

            const { data, error } = await supabase
                .from('responsibility_agents')
                .insert({
                    responsibility_id: respId,
                    agent_id,
                    recommendation_strength,
                    use_case_note
                })
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error adding responsibility agent:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/connections/responsibilities/:respId/skills
     * Add skill recommendation to responsibility
     */
    router.post('/responsibilities/:respId/skills', async (req, res) => {
        try {
            const { respId } = req.params;
            const { skill_id, recommendation_strength = 'suggested', use_case_note } = req.body;

            if (!skill_id) {
                return res.status(400).json({
                    success: false,
                    error: 'skill_id is required'
                });
            }

            const { data, error } = await supabase
                .from('responsibility_skills')
                .insert({
                    responsibility_id: respId,
                    skill_id,
                    recommendation_strength,
                    use_case_note
                })
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error adding responsibility skill:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/connections/responsibilities/:respId/workflows
     * Add workflow recommendation to responsibility
     */
    router.post('/responsibilities/:respId/workflows', async (req, res) => {
        try {
            const { respId } = req.params;
            const { workflow_id, recommendation_strength = 'suggested', use_case_note } = req.body;

            if (!workflow_id) {
                return res.status(400).json({
                    success: false,
                    error: 'workflow_id is required'
                });
            }

            const { data, error } = await supabase
                .from('responsibility_workflows')
                .insert({
                    responsibility_id: respId,
                    workflow_id,
                    recommendation_strength,
                    use_case_note
                })
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error adding responsibility workflow:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/connections/responsibilities/:respId/:type/:entityId
     * Remove AI recommendation from responsibility
     */
    router.delete('/responsibilities/:respId/:type/:entityId', async (req, res) => {
        try {
            const { respId, type, entityId } = req.params;

            const tableMap = {
                agents: 'responsibility_agents',
                skills: 'responsibility_skills',
                workflows: 'responsibility_workflows'
            };

            const idColumn = {
                agents: 'agent_id',
                skills: 'skill_id',
                workflows: 'workflow_id'
            };

            const table = tableMap[type];
            if (!table) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid type. Must be agents, skills, or workflows'
                });
            }

            const { error } = await supabase
                .from(table)
                .delete()
                .eq('responsibility_id', respId)
                .eq(idColumn[type], entityId);

            if (error) throw error;

            res.json({
                success: true,
                message: 'AI recommendation removed'
            });
        } catch (error) {
            console.error('Error removing responsibility AI mapping:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // USER AI ASSIGNMENTS - Individual overrides
    // ============================================================================

    /**
     * GET /api/connections/users/:userId/assignments
     * Get AI assignments for a user (admin only or self)
     */
    router.get('/users/:userId/assignments', async (req, res) => {
        try {
            const { userId } = req.params;
            const currentUserId = req.userId;
            const { type } = req.query;

            if (!currentUserId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // TODO: Add admin check for viewing other users' assignments
            if (userId !== currentUserId) {
                // For now, allow admins via service key
            }

            let query = supabase
                .from('user_ai_assignments')
                .select('*')
                .eq('user_id', userId);

            if (type) {
                query = query.eq('entity_type', type);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });
        } catch (error) {
            console.error('Error getting user AI assignments:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/connections/users/:userId/assignments
     * Create AI assignment for a user (admin only)
     */
    router.post('/users/:userId/assignments', async (req, res) => {
        try {
            const { userId } = req.params;
            const currentUserId = req.userId;
            const { entity_type, entity_id, assignment_type = 'granted', reason, expires_at } = req.body;

            if (!currentUserId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            if (!entity_type || !entity_id) {
                return res.status(400).json({
                    success: false,
                    error: 'entity_type and entity_id are required'
                });
            }

            const validTypes = ['agent', 'skill', 'workflow', 'action'];
            if (!validTypes.includes(entity_type)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid entity_type. Must be one of: ${validTypes.join(', ')}`
                });
            }

            const validAssignments = ['granted', 'revoked', 'featured'];
            if (!validAssignments.includes(assignment_type)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid assignment_type. Must be one of: ${validAssignments.join(', ')}`
                });
            }

            const { data, error } = await supabase
                .from('user_ai_assignments')
                .upsert({
                    user_id: userId,
                    entity_type,
                    entity_id,
                    assignment_type,
                    assigned_by: currentUserId,
                    reason,
                    expires_at: expires_at || null,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,entity_type,entity_id'
                })
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error creating user AI assignment:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/connections/users/:userId/assignments/:assignmentId
     * Remove AI assignment (admin only)
     */
    router.delete('/users/:userId/assignments/:assignmentId', async (req, res) => {
        try {
            const { userId, assignmentId } = req.params;

            const { error } = await supabase
                .from('user_ai_assignments')
                .delete()
                .eq('id', assignmentId)
                .eq('user_id', userId);

            if (error) throw error;

            res.json({
                success: true,
                message: 'Assignment removed'
            });
        } catch (error) {
            console.error('Error removing user AI assignment:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // OKR SUPPORTING CAPABILITIES
    // ============================================================================

    /**
     * GET /api/connections/okrs/:okrId/capabilities
     * Get all capabilities supporting an OKR
     */
    router.get('/okrs/:okrId/capabilities', async (req, res) => {
        try {
            const { okrId } = req.params;

            const { data, error } = await supabase
                .from('okr_supporting_capabilities')
                .select('*')
                .eq('okr_id', okrId);

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });
        } catch (error) {
            console.error('Error getting OKR capabilities:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
};
