/**
 * INSIGHT 360 - Soul Configuration API Routes
 * Version: 1.0.0
 * Phase: 54 - Human Values Definition System
 *
 * Endpoints:
 *   - Soul Configuration CRUD (8 endpoints)
 *   - Version Management (3 endpoints)
 *   - Soul.md Generation/Import (3 endpoints)
 *   - Ethical Framework (5 endpoints)
 *   - Values Alignment (4 endpoints)
 *   - Integrity Metrics (2 endpoints)
 */

const express = require('express');
const soulConfigService = require('../services/soulConfigService');
const ethicalContextService = require('../services/ethicalContextService');
const valuesAlignmentService = require('../services/valuesAlignmentService');

/**
 * Soul Configuration Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
module.exports = function(supabase) {
    const router = express.Router();

    // ============================================================================
    // SOUL CONFIGURATION CRUD ENDPOINTS
    // ============================================================================

    /**
     * GET /api/soul-config
     * List soul configurations with filters
     */
    router.get('/', async (req, res) => {
        try {
            const { scope_type, org_id, is_draft, is_active } = req.query;

            const filters = {};
            if (scope_type) filters.scope_type = scope_type;
            if (org_id) filters.org_id = org_id;
            if (is_draft !== undefined) filters.is_draft = is_draft === 'true';
            if (is_active !== undefined) filters.is_active = is_active === 'true';

            const configs = await soulConfigService.listSoulConfigs(filters);

            res.json({
                success: true,
                data: configs,
                count: configs.length
            });
        } catch (error) {
            console.error('Error listing soul configs:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/soul-config/:id
     * Get a specific soul configuration
     */
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const config = await soulConfigService.getSoulConfig(id);

            res.json({
                success: true,
                data: config
            });
        } catch (error) {
            console.error('Error getting soul config:', error);
            res.status(error.message === 'Soul configuration not found' ? 404 : 500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/soul-config/resolve/:orgId
     * Resolve inherited soul configuration for an organization
     */
    router.get('/resolve/:orgId', async (req, res) => {
        try {
            const { orgId } = req.params;
            const { departmentId, clientId, agentId } = req.query;

            const resolved = await soulConfigService.resolveInheritedSoulConfig({
                orgId,
                departmentId,
                clientId,
                agentId
            });

            res.json({
                success: true,
                data: resolved
            });
        } catch (error) {
            console.error('Error resolving soul config:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/soul-config
     * Create a new soul configuration
     */
    router.post('/', async (req, res) => {
        try {
            const userId = req.userId;
            const configData = req.body;

            // Validate required fields
            if (!configData.scope_type) {
                return res.status(400).json({
                    success: false,
                    error: 'scope_type is required'
                });
            }

            // Validate scope_type
            const validScopes = ['platform', 'organization', 'department', 'client', 'agent'];
            if (!validScopes.includes(configData.scope_type)) {
                return res.status(400).json({
                    success: false,
                    error: `scope_type must be one of: ${validScopes.join(', ')}`
                });
            }

            // Platform configs require admin
            if (configData.scope_type === 'platform' && !req.isPlatformAdmin) {
                return res.status(403).json({
                    success: false,
                    error: 'Only platform admins can create platform-level configurations'
                });
            }

            const config = await soulConfigService.createSoulConfig(configData, userId);

            res.status(201).json({
                success: true,
                data: config,
                message: 'Soul configuration created'
            });
        } catch (error) {
            console.error('Error creating soul config:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/soul-config/:id
     * Update a soul configuration
     */
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.userId;
            const updates = req.body;
            const changeReason = req.body.change_reason || '';

            // Remove non-config fields
            delete updates.change_reason;

            const config = await soulConfigService.updateSoulConfig(
                id,
                updates,
                userId,
                changeReason
            );

            res.json({
                success: true,
                data: config,
                message: 'Soul configuration updated'
            });
        } catch (error) {
            console.error('Error updating soul config:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/soul-config/:id/publish
     * Publish a draft soul configuration
     */
    router.post('/:id/publish', async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.userId;

            const config = await soulConfigService.publishSoulConfig(id, userId);

            res.json({
                success: true,
                data: config,
                message: 'Soul configuration published and activated'
            });
        } catch (error) {
            console.error('Error publishing soul config:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/soul-config/:id/clone
     * Clone a soul configuration to a new scope
     */
    router.post('/:id/clone', async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.userId;
            const targetScope = req.body;

            const cloned = await soulConfigService.cloneSoulConfig(id, targetScope, userId);

            res.status(201).json({
                success: true,
                data: cloned,
                message: 'Soul configuration cloned'
            });
        } catch (error) {
            console.error('Error cloning soul config:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/soul-config/:id
     * Delete (deactivate) a soul configuration
     */
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            await soulConfigService.deleteSoulConfig(id);

            res.json({
                success: true,
                message: 'Soul configuration deactivated'
            });
        } catch (error) {
            console.error('Error deleting soul config:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // VERSION MANAGEMENT ENDPOINTS
    // ============================================================================

    /**
     * GET /api/soul-config/:id/versions
     * Get version history for a soul configuration
     */
    router.get('/:id/versions', async (req, res) => {
        try {
            const { id } = req.params;
            const versions = await soulConfigService.getVersionHistory(id);

            res.json({
                success: true,
                data: versions,
                count: versions.length
            });
        } catch (error) {
            console.error('Error getting version history:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/soul-config/:id/rollback
     * Rollback to a previous version
     */
    router.post('/:id/rollback', async (req, res) => {
        try {
            const { id } = req.params;
            const { version } = req.body;
            const userId = req.userId;

            if (!version) {
                return res.status(400).json({
                    success: false,
                    error: 'version is required'
                });
            }

            const config = await soulConfigService.rollbackToVersion(id, version, userId);

            res.json({
                success: true,
                data: config,
                message: `Rolled back to version ${version}`
            });
        } catch (error) {
            console.error('Error rolling back:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // SOUL.MD GENERATION/IMPORT ENDPOINTS
    // ============================================================================

    /**
     * GET /api/soul-config/:id/export
     * Generate and export soul.md markdown
     */
    router.get('/:id/export', async (req, res) => {
        try {
            const { id } = req.params;
            const { format = 'markdown' } = req.query;

            const markdown = await soulConfigService.generateSoulMd(id);

            if (format === 'download') {
                res.setHeader('Content-Type', 'text/markdown');
                res.setHeader('Content-Disposition', 'attachment; filename="soul.md"');
                return res.send(markdown);
            }

            res.json({
                success: true,
                data: {
                    markdown,
                    format: 'markdown'
                }
            });
        } catch (error) {
            console.error('Error exporting soul config:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/soul-config/import
     * Import from soul.md markdown
     */
    router.post('/import', async (req, res) => {
        try {
            const userId = req.userId;
            const { markdown, scope_type, org_id, department_id, client_id, agent_id } = req.body;

            if (!markdown) {
                return res.status(400).json({
                    success: false,
                    error: 'markdown content is required'
                });
            }

            const config = await soulConfigService.importFromSoulMd(
                markdown,
                { scope_type, org_id, department_id, client_id, agent_id },
                userId
            );

            res.status(201).json({
                success: true,
                data: config,
                message: 'Soul configuration imported from markdown'
            });
        } catch (error) {
            console.error('Error importing soul config:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/soul-config/:id/preview
     * Preview generated soul.md without saving
     */
    router.get('/:id/preview', async (req, res) => {
        try {
            const { id } = req.params;

            // Generate but don't save
            const config = await soulConfigService.getSoulConfig(id);
            const markdown = await soulConfigService.generateSoulMd(id);

            res.json({
                success: true,
                data: {
                    config,
                    preview: markdown,
                    completenessScore: config.completeness_score
                }
            });
        } catch (error) {
            console.error('Error previewing soul config:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // ETHICAL FRAMEWORK ENDPOINTS
    // ============================================================================

    /**
     * GET /api/soul-config/ethical-lenses
     * Get all ethical lenses (SCU Framework)
     */
    router.get('/ethical-lenses', async (req, res) => {
        try {
            const lenses = await ethicalContextService.getEthicalLenses();

            res.json({
                success: true,
                data: lenses,
                count: lenses.length
            });
        } catch (error) {
            console.error('Error getting ethical lenses:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/soul-config/detect-stakes
     * Detect stakes level for a message
     */
    router.post('/detect-stakes', async (req, res) => {
        try {
            const { message, context } = req.body;

            const stakesLevel = ethicalContextService.detectStakesLevel(message, context);

            res.json({
                success: true,
                data: {
                    stakesLevel,
                    description: getStakesDescription(stakesLevel)
                }
            });
        } catch (error) {
            console.error('Error detecting stakes:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/soul-config/ethical-context
     * Assemble ethical context for a given stakes level
     */
    router.post('/ethical-context', async (req, res) => {
        try {
            const { stakesLevel, orgId, departmentId, clientId, agentId } = req.body;

            // Resolve soul config
            const resolved = await soulConfigService.resolveInheritedSoulConfig({
                orgId, departmentId, clientId, agentId
            });

            // Assemble ethical context
            const ethicalContext = await ethicalContextService.assembleEthicalContext(
                stakesLevel,
                resolved.config
            );

            // Format for injection
            const formatted = ethicalContextService.formatEthicalContext(ethicalContext);

            res.json({
                success: true,
                data: {
                    ethicalContext,
                    formatted,
                    soulConfigSources: resolved.sources
                }
            });
        } catch (error) {
            console.error('Error assembling ethical context:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/soul-config/analyze-decision
     * Analyze a decision through ethical lenses
     */
    router.post('/analyze-decision', async (req, res) => {
        try {
            const { decisionSummary, stakeholders, options } = req.body;

            if (!decisionSummary) {
                return res.status(400).json({
                    success: false,
                    error: 'decisionSummary is required'
                });
            }

            const analysis = await ethicalContextService.analyzeThroughLenses(
                decisionSummary,
                stakeholders || [],
                options || []
            );

            res.json({
                success: true,
                data: analysis
            });
        } catch (error) {
            console.error('Error analyzing decision:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/soul-config/ethical-evaluation
     * Log an ethical evaluation
     */
    router.post('/ethical-evaluation', async (req, res) => {
        try {
            const userId = req.userId;
            const evaluation = {
                ...req.body,
                userId
            };

            const logged = await ethicalContextService.logEthicalEvaluation(evaluation);

            res.status(201).json({
                success: true,
                data: logged,
                message: 'Ethical evaluation logged'
            });
        } catch (error) {
            console.error('Error logging evaluation:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // VALUES ALIGNMENT ENDPOINTS
    // ============================================================================

    /**
     * POST /api/soul-config/values-alignment/audit
     * Perform a values alignment audit
     */
    router.post('/values-alignment/audit', async (req, res) => {
        try {
            const { orgId } = req.body;

            if (!orgId) {
                return res.status(400).json({
                    success: false,
                    error: 'orgId is required'
                });
            }

            const audit = await valuesAlignmentService.performValuesAlignmentAudit(orgId);

            res.json({
                success: true,
                data: audit
            });
        } catch (error) {
            console.error('Error performing alignment audit:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/soul-config/values-alignment/history/:orgId
     * Get audit history for an organization
     */
    router.get('/values-alignment/history/:orgId', async (req, res) => {
        try {
            const { orgId } = req.params;
            const { limit = 10 } = req.query;

            const history = await valuesAlignmentService.getAuditHistory(orgId, parseInt(limit));

            res.json({
                success: true,
                data: history,
                count: history.length
            });
        } catch (error) {
            console.error('Error getting audit history:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/soul-config/values-alignment/trend/:orgId
     * Get alignment trend over time
     */
    router.get('/values-alignment/trend/:orgId', async (req, res) => {
        try {
            const { orgId } = req.params;
            const { months = 6 } = req.query;

            const trend = await valuesAlignmentService.getAlignmentTrend(orgId, parseInt(months));

            res.json({
                success: true,
                data: trend
            });
        } catch (error) {
            console.error('Error getting alignment trend:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/soul-config/values-alignment/radar/:orgId
     * Get radar chart data for values alignment
     */
    router.get('/values-alignment/radar/:orgId', async (req, res) => {
        try {
            const { orgId } = req.params;

            // Get latest audit
            const history = await valuesAlignmentService.getAuditHistory(orgId, 1);

            if (!history || history.length === 0) {
                return res.json({
                    success: true,
                    data: null,
                    message: 'No audit data available. Run an alignment audit first.'
                });
            }

            const chartData = valuesAlignmentService.generateRadarChartData(
                history[0].alignment_scores
            );

            res.json({
                success: true,
                data: chartData
            });
        } catch (error) {
            console.error('Error generating radar data:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // INTEGRITY METRICS ENDPOINTS
    // ============================================================================

    /**
     * GET /api/soul-config/integrity-metrics/:orgId
     * Get integrity metrics for an organization
     */
    router.get('/integrity-metrics/:orgId', async (req, res) => {
        try {
            const { orgId } = req.params;
            const { days = 30 } = req.query;

            const metrics = await ethicalContextService.calculateIntegrityMetrics(
                orgId,
                parseInt(days)
            );

            res.json({
                success: true,
                data: metrics
            });
        } catch (error) {
            console.error('Error calculating integrity metrics:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/soul-config/bright-line-incidents/:orgId
     * Get bright line incidents for an organization
     */
    router.get('/bright-line-incidents/:orgId', async (req, res) => {
        try {
            const { orgId } = req.params;
            const { incident_type, severity, resolved } = req.query;

            const filters = {};
            if (incident_type) filters.incidentType = incident_type;
            if (severity) filters.severity = severity;
            if (resolved !== undefined) filters.resolved = resolved === 'true';

            const incidents = await ethicalContextService.getBrightLineIncidents(orgId, filters);

            res.json({
                success: true,
                data: incidents,
                count: incidents.length
            });
        } catch (error) {
            console.error('Error getting bright line incidents:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/soul-config/bright-line-incident
     * Report a bright line incident
     */
    router.post('/bright-line-incident', async (req, res) => {
        try {
            const userId = req.userId;
            const incident = {
                ...req.body,
                reportedBy: userId
            };

            const logged = await ethicalContextService.logBrightLineIncident(incident);

            res.status(201).json({
                success: true,
                data: logged,
                message: 'Bright line incident reported'
            });
        } catch (error) {
            console.error('Error reporting incident:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/soul-config/bright-line-incident/:id/resolve
     * Resolve a bright line incident
     */
    router.put('/bright-line-incident/:id/resolve', async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.userId;
            const { resolutionNotes } = req.body;

            const resolved = await ethicalContextService.resolveBrightLineIncident(
                id,
                userId,
                resolutionNotes
            );

            res.json({
                success: true,
                data: resolved,
                message: 'Incident resolved'
            });
        } catch (error) {
            console.error('Error resolving incident:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // Helper function for stakes description
    function getStakesDescription(level) {
        const descriptions = {
            low: 'Standard interaction - no special ethical considerations needed',
            medium: 'Moderate stakes - consider organizational values in response',
            high: 'High stakes - apply full ethical framework, flag for review',
            critical: 'Critical situation - apply all safeguards, require human review'
        };
        return descriptions[level] || descriptions.low;
    }

    return router;
};
