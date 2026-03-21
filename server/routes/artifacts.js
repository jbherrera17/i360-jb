/**
 * Artifact Routes
 * REST API for browsing, creating, and managing artifact bundles.
 *
 * Phase 85: Artifact System
 */

const express = require('express');
const multer = require('multer');
const { requireOrgContext } = require('../middleware/orgContext');
const { getVerifiedOrgId } = require('../utils/orgScope');
const { createArtifactService } = require('../services/artifactService');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

module.exports = function(supabase) {
    const router = express.Router();
    const artifactService = createArtifactService(supabase);

    // All routes require org context + module access
    router.use(requireOrgContext(supabase));

    // Module access middleware
    router.use(async (req, res, next) => {
        try {
            const userId = req.userId;
            const orgId = req.verifiedOrgId;
            if (!userId) return next();

            const { data: canAccess } = await supabase
                .rpc('can_access_module', {
                    p_user_id: userId,
                    p_module_id: 'artifacts',
                    p_org_id: orgId || null
                });

            if (canAccess === false) {
                return res.status(403).json({
                    success: false,
                    error: 'Artifacts module is not available for your subscription tier',
                    module: 'artifacts',
                    upgrade_required: true
                });
            }
            next();
        } catch (err) {
            next();
        }
    });

    /**
     * GET /api/artifacts/my-recent
     * User's recent artifacts (for Execute 120 card)
     */
    router.get('/my-recent', async (req, res) => {
        try {
            const userId = req.userId;
            const orgId = getVerifiedOrgId(req);
            const limit = Math.min(parseInt(req.query.limit) || 5, 20);

            const data = await artifactService.getRecentForUser(userId, orgId, limit);
            res.json({ success: true, data });
        } catch (error) {
            console.error('GET /artifacts/my-recent error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/artifacts
     * List bundles (paginated, filterable)
     */
    router.get('/', async (req, res) => {
        try {
            const orgId = getVerifiedOrgId(req);
            const { source_type, agent_id, department_id, tags, search, page, limit } = req.query;

            const result = await artifactService.listBundles(orgId, {
                userId: req.query.user_id || null,
                sourceType: source_type,
                agentId: agent_id,
                departmentId: department_id,
                tags: tags ? tags.split(',') : null,
                search,
                page: parseInt(page) || 1,
                limit: Math.min(parseInt(limit) || 20, 100)
            });

            res.json({ success: true, ...result });
        } catch (error) {
            console.error('GET /artifacts error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/artifacts/:id
     * Bundle with all parts
     */
    router.get('/:id', async (req, res) => {
        try {
            const orgId = getVerifiedOrgId(req);
            const bundle = await artifactService.getBundleWithParts(req.params.id, orgId);

            if (!bundle) {
                return res.status(404).json({ success: false, error: 'Artifact not found' });
            }

            res.json({ success: true, data: bundle });
        } catch (error) {
            console.error('GET /artifacts/:id error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/artifacts
     * Create bundle with inline parts
     */
    router.post('/', async (req, res) => {
        try {
            const orgId = getVerifiedOrgId(req);
            const userId = req.userId;

            const bundle = await artifactService.createBundle({
                orgId,
                userId,
                name: req.body.name,
                description: req.body.description,
                sourceType: req.body.source_type,
                sourceId: req.body.source_id,
                agentId: req.body.agent_id,
                departmentId: req.body.department_id,
                tags: req.body.tags,
                visibility: req.body.visibility,
                status: req.body.status,
                modelUsed: req.body.model_used,
                tokensUsed: req.body.tokens_used,
                generationTimeMs: req.body.generation_time_ms,
                contextAssetsUsed: req.body.context_assets_used,
                skillUsed: req.body.skill_used,
                parts: req.body.parts || []
            });

            res.status(201).json({ success: true, data: bundle });
        } catch (error) {
            console.error('POST /artifacts error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PATCH /api/artifacts/:id
     * Update metadata
     */
    router.patch('/:id', async (req, res) => {
        try {
            const orgId = getVerifiedOrgId(req);
            const bundle = await artifactService.updateBundle(req.params.id, orgId, req.body);
            res.json({ success: true, data: bundle });
        } catch (error) {
            console.error('PATCH /artifacts/:id error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/artifacts/:id
     */
    router.delete('/:id', async (req, res) => {
        try {
            const orgId = getVerifiedOrgId(req);
            const userId = req.userId;
            await artifactService.deleteBundle(req.params.id, userId, orgId);
            res.json({ success: true });
        } catch (error) {
            console.error('DELETE /artifacts/:id error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/artifacts/:id/parts
     * Add inline text part to existing bundle
     */
    router.post('/:id/parts', async (req, res) => {
        try {
            const orgId = getVerifiedOrgId(req);

            // Verify bundle ownership
            const bundle = await artifactService.getBundleWithParts(req.params.id, orgId);
            if (!bundle || bundle.user_id !== req.userId) {
                return res.status(404).json({ success: false, error: 'Artifact not found' });
            }

            const { data: part, error } = await supabase
                .from('artifact_parts')
                .insert({
                    bundle_id: req.params.id,
                    name: req.body.name || 'New Part',
                    part_type: req.body.part_type || 'text',
                    content_text: req.body.content_text || null,
                    content_json: req.body.content_json || null,
                    sort_order: req.body.sort_order ?? (bundle.parts.length)
                })
                .select()
                .single();

            if (error) throw error;
            res.status(201).json({ success: true, data: part });
        } catch (error) {
            console.error('POST /artifacts/:id/parts error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/artifacts/:id/parts/upload
     * Upload binary file as part
     */
    router.post('/:id/parts/upload', upload.single('file'), async (req, res) => {
        try {
            const orgId = getVerifiedOrgId(req);
            const userId = req.userId;

            // Verify bundle ownership
            const bundle = await artifactService.getBundleWithParts(req.params.id, orgId);
            if (!bundle || bundle.user_id !== userId) {
                return res.status(404).json({ success: false, error: 'Artifact not found' });
            }

            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No file uploaded' });
            }

            const part = await artifactService.uploadPart(req.params.id, {
                name: req.body.name || req.file.originalname,
                partType: req.body.part_type || inferPartType(req.file.mimetype),
                buffer: req.file.buffer,
                mimeType: req.file.mimetype,
                filename: req.file.originalname,
                orgId,
                userId
            });

            res.status(201).json({ success: true, data: part });
        } catch (error) {
            console.error('POST /artifacts/:id/parts/upload error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/artifacts/:id/parts/:partId/download
     * Signed URL for file download
     */
    router.get('/:id/parts/:partId/download', async (req, res) => {
        try {
            const orgId = getVerifiedOrgId(req);

            // Get bundle to verify access
            const bundle = await artifactService.getBundleWithParts(req.params.id, orgId);
            if (!bundle) {
                return res.status(404).json({ success: false, error: 'Artifact not found' });
            }

            const part = bundle.parts.find(p => p.id === req.params.partId);
            if (!part || !part.file_path) {
                return res.status(404).json({ success: false, error: 'File not found' });
            }

            const signedUrl = await artifactService.getPartDownloadUrl(part.file_path);
            res.json({ success: true, data: { url: signedUrl } });
        } catch (error) {
            console.error('GET /artifacts/:id/parts/:partId/download error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/artifacts/:id/version
     * Create new version
     */
    router.post('/:id/version', async (req, res) => {
        try {
            const orgId = getVerifiedOrgId(req);
            const userId = req.userId;

            const newBundle = await artifactService.createVersion(req.params.id, userId, orgId);
            res.status(201).json({ success: true, data: newBundle });
        } catch (error) {
            console.error('POST /artifacts/:id/version error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};

/**
 * Infer part_type from MIME type
 */
function inferPartType(mimeType) {
    if (!mimeType) return 'text';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return 'spreadsheet';
    if (mimeType === 'text/csv') return 'csv';
    if (mimeType === 'text/html') return 'html';
    if (mimeType === 'application/json') return 'json';
    if (mimeType === 'text/markdown') return 'markdown';
    return 'text';
}
