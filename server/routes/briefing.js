/**
 * INSIGHT 360 - Briefing API Routes
 * Version: 1.0.0
 *
 * Endpoints:
 *   - Briefing CRUD (4 endpoints)
 *   - Configuration (3 endpoints)
 *   - Sections (5 endpoints)
 *   - Generation (2 endpoints)
 */

const express = require('express');
const briefingService = require('../services/briefingService');
const schedulerService = require('../services/schedulerService');

/**
 * Briefing Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
module.exports = function(supabase) {
    const router = express.Router();

    // Get user ID from auth middleware (req.userId is set by middleware/auth.js)
    const getUser = (req) => {
        return req.userId || req.headers['x-user-id'] || process.env.DEFAULT_USER_ID;
    };

    // Helper to require authentication - returns 401 if no user
    const requireAuth = (req, res) => {
        const userId = getUser(req);
        if (!userId) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return null;
        }
        return userId;
    };

    // ============================================================================
    // BRIEFING RETRIEVAL ENDPOINTS
    // ============================================================================

    /**
     * GET /api/briefing/latest
     * Get the most recent briefing for the user
     */
    router.get('/latest', async (req, res) => {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;
            const briefing = await briefingService.getLatestBriefing(userId);

            res.json({
                success: true,
                data: briefing
            });
        } catch (error) {
            console.error('Error fetching latest briefing:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/briefing/today
     * Get today's briefing (or null if not generated yet)
     */
    router.get('/today', async (req, res) => {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;
            const briefing = await briefingService.getTodaysBriefing(userId);

            res.json({
                success: true,
                data: briefing
            });
        } catch (error) {
            console.error('Error fetching today\'s briefing:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/briefing/history
     * Get briefing history with pagination
     */
    router.get('/history', async (req, res) => {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;
            const { page = 1, limit = 10 } = req.query;

            const result = await briefingService.getBriefingHistory(userId, {
                page: parseInt(page),
                limit: parseInt(limit)
            });

            res.json({
                success: true,
                data: result.briefings,
                pagination: result.pagination
            });
        } catch (error) {
            console.error('Error fetching briefing history:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // NOTE: /:id route moved to end of file to avoid matching specific routes like /config

    // ============================================================================
    // CONFIGURATION ENDPOINTS
    // ============================================================================

    /**
     * GET /api/briefing/config
     * Get user's briefing configuration with sections
     */
    router.get('/config', async (req, res) => {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;
            const config = await briefingService.getConfigWithSections(userId);

            // Add scheduler status
            const scheduleInfo = schedulerService.getUserScheduleInfo(userId);

            res.json({
                success: true,
                data: {
                    ...config,
                    scheduler: scheduleInfo
                }
            });
        } catch (error) {
            console.error('Error fetching config:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/briefing/config
     * Update briefing configuration (schedule settings)
     */
    router.put('/config', async (req, res) => {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;
            const { is_enabled, schedule_time, timezone } = req.body;

            const config = await briefingService.updateConfig(userId, {
                is_enabled,
                schedule_time,
                timezone
            });

            // Update scheduler
            if (is_enabled === true) {
                schedulerService.scheduleUserBriefing(
                    userId,
                    config.schedule_time,
                    config.timezone
                );
            } else if (is_enabled === false) {
                schedulerService.cancelSchedule(userId);
            }

            res.json({
                success: true,
                data: config,
                message: is_enabled ?
                    `Briefing scheduled for ${config.schedule_time} ${config.timezone}` :
                    'Briefing schedule disabled'
            });
        } catch (error) {
            console.error('Error updating config:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/briefing/scheduler/status
     * Get scheduler status (for health checks)
     */
    router.get('/scheduler/status', async (req, res) => {
        try {
            const status = schedulerService.getSchedulerStatus();

            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            console.error('Error fetching scheduler status:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // SECTION ENDPOINTS
    // ============================================================================

    /**
     * GET /api/briefing/sections
     * Get all sections for user's briefing
     */
    router.get('/sections', async (req, res) => {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;
            const config = await briefingService.getConfigWithSections(userId);

            res.json({
                success: true,
                data: config.sections
            });
        } catch (error) {
            console.error('Error fetching sections:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/briefing/sections
     * Add a new section
     */
    router.post('/sections', async (req, res) => {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;
            const {
                name,
                slug,
                description,
                icon,
                agent_id,
                prompt_template,
                context_assets,
                max_tokens,
                is_enabled
            } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Section name is required'
                });
            }

            const section = await briefingService.addSection(userId, {
                name,
                slug,
                description,
                icon,
                agent_id,
                prompt_template,
                context_assets,
                max_tokens,
                is_enabled
            });

            res.status(201).json({
                success: true,
                data: section,
                message: `Section "${name}" added successfully`
            });
        } catch (error) {
            console.error('Error adding section:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/briefing/sections/:id
     * Update a section
     */
    router.put('/sections/:id', async (req, res) => {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;
            const { id } = req.params;

            const section = await briefingService.updateSection(userId, id, req.body);

            res.json({
                success: true,
                data: section,
                message: 'Section updated successfully'
            });
        } catch (error) {
            console.error('Error updating section:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/briefing/sections/:id
     * Delete a section
     */
    router.delete('/sections/:id', async (req, res) => {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;
            const { id } = req.params;

            await briefingService.deleteSection(userId, id);

            res.json({
                success: true,
                message: 'Section deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting section:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/briefing/sections/reorder
     * Reorder sections
     */
    router.post('/sections/reorder', async (req, res) => {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;
            const { section_ids } = req.body;

            if (!Array.isArray(section_ids)) {
                return res.status(400).json({
                    success: false,
                    error: 'section_ids must be an array'
                });
            }

            await briefingService.reorderSections(userId, section_ids);

            res.json({
                success: true,
                message: 'Sections reordered successfully'
            });
        } catch (error) {
            console.error('Error reordering sections:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // GENERATION ENDPOINTS
    // ============================================================================

    /**
     * POST /api/briefing/generate
     * Manually trigger briefing generation (non-streaming)
     */
    router.post('/generate', async (req, res) => {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;

            const briefing = await briefingService.generateBriefing(userId);

            res.json({
                success: true,
                data: briefing,
                message: 'Briefing generated successfully'
            });
        } catch (error) {
            console.error('Error generating briefing:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/briefing/generate/stream
     * Generate briefing with SSE streaming for progress updates
     */
    router.get('/generate/stream', async (req, res) => {
        const userId = requireAuth(req, res);
        if (!userId) return;

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        // Send initial event
        res.write(`data: ${JSON.stringify({ type: 'start', message: 'Starting briefing generation...' })}\n\n`);

        try {
            const briefing = await briefingService.generateBriefing(userId, {
                onSectionStart: ({ section, name, index, total }) => {
                    res.write(`data: ${JSON.stringify({
                        type: 'section_start',
                        section,
                        name,
                        index,
                        total,
                        message: `Generating ${name}...`
                    })}\n\n`);
                },
                onSectionComplete: ({ section, index, total }) => {
                    res.write(`data: ${JSON.stringify({
                        type: 'section_complete',
                        section: section.slug,
                        name: section.name,
                        status: section.status,
                        content: section.content,
                        tokens_used: section.tokens_used,
                        index,
                        total
                    })}\n\n`);
                }
            });

            // Send completion event
            res.write(`data: ${JSON.stringify({
                type: 'complete',
                briefing_id: briefing.id,
                status: briefing.status,
                sections_generated: briefing.sections_generated,
                total_tokens: briefing.total_tokens_used,
                message: 'Briefing generation complete'
            })}\n\n`);

            res.write('data: [DONE]\n\n');
            res.end();

        } catch (error) {
            console.error('Error in streaming briefing generation:', error);
            res.write(`data: ${JSON.stringify({
                type: 'error',
                error: error.message
            })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        }
    });

    // ============================================================================
    // AGENT SUGGESTIONS (Helper endpoint)
    // ============================================================================

    /**
     * GET /api/briefing/agents
     * Get agents that can be used for briefing sections
     * Query params: category (optional filter)
     * Returns agents filtered by user's department (if set) with category info
     */
    router.get('/agents', async (req, res) => {
        try {
            const userId = getUser(req);
            const { category } = req.query;

            // Get user's department if logged in
            let userDepartmentId = null;
            if (userId) {
                const { data: userProfile } = await supabase
                    .from('users')
                    .select('department_id')
                    .eq('id', userId)
                    .single();
                userDepartmentId = userProfile?.department_id;
            }

            // Build base query
            let query = supabase
                .from('agents')
                .select('id, name, description, icon, suite, category, type')
                .eq('is_active', true);

            // Filter by category if provided
            if (category) {
                query = query.eq('category', category);
            }

            const { data: agents, error } = await query.order('name');

            if (error) throw error;

            // If user has a department, prioritize agents linked to that department
            let enrichedAgents = agents || [];
            if (userDepartmentId && agents && agents.length > 0) {
                const { data: deptAgents } = await supabase
                    .from('department_agents')
                    .select('agent_id, is_featured')
                    .eq('department_id', userDepartmentId);

                const deptAgentIds = new Set((deptAgents || []).map(da => da.agent_id));
                const featuredIds = new Set((deptAgents || []).filter(da => da.is_featured).map(da => da.agent_id));

                // Enrich agents with department relevance
                enrichedAgents = agents.map(a => ({
                    ...a,
                    is_department_agent: deptAgentIds.has(a.id),
                    is_featured: featuredIds.has(a.id)
                }));

                // Sort: featured first, then department agents, then others
                enrichedAgents.sort((a, b) => {
                    if (a.is_featured !== b.is_featured) return b.is_featured ? 1 : -1;
                    if (a.is_department_agent !== b.is_department_agent) return b.is_department_agent ? 1 : -1;
                    return a.name.localeCompare(b.name);
                });
            }

            // Get unique categories for filter dropdown
            const categories = [...new Set(agents.map(a => a.category).filter(Boolean))].sort();

            res.json({
                success: true,
                data: enrichedAgents,
                categories: categories,
                user_department_id: userDepartmentId
            });
        } catch (error) {
            console.error('Error fetching agents:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================================================
    // DYNAMIC ID ROUTE (must be last to avoid matching specific routes)
    // ============================================================================

    /**
     * GET /api/briefing/:id
     * Get a specific briefing by ID
     */
    router.get('/:id', async (req, res) => {
        try {
            const userId = requireAuth(req, res);
            if (!userId) return;
            const { id } = req.params;

            const briefing = await briefingService.getBriefingById(userId, id);

            if (!briefing) {
                return res.status(404).json({
                    success: false,
                    error: 'Briefing not found'
                });
            }

            res.json({
                success: true,
                data: briefing
            });
        } catch (error) {
            console.error('Error fetching briefing:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
