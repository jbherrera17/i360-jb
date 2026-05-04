/**
 * Thought Leadership — Pre-flight Check.
 *
 * Module-access gating is applied by the coordinator (see ./index.js).
 */

const express = require('express');
const preflightService = require('../../services/preflightService');

module.exports = function (supabase) {
    const router = express.Router();

    // ============================================================================
    // PRE-FLIGHT CHECK ENDPOINT
    // ============================================================================

    /**
     * GET /api/thought-leadership/preflight
     * Run pre-flight checks on all downstream integrations before starting a workflow.
     * Returns status map so users know what will/won't work upfront.
     *
     * Query params:
     *   targets - comma-separated list (default: image,notion,social,substack,linkedin,web)
     */
    router.get('/preflight', async (req, res) => {
        try {
            const userId = req.userId;
            const orgId = req.headers['x-org-id'] || req.orgId || null;

            // Parse requested targets
            const targetsParam = req.query.targets || 'image,notion,social,substack,linkedin,web';
            const targets = targetsParam.split(',').map(t => t.trim());

            // Get user's preferred image model
            let preferredImageModel = 'gpt-image-1.5';
            if (userId) {
                const { data: profile } = await supabase
                    .from('thought_leadership_profiles')
                    .select('preferred_image_model')
                    .eq('user_id', userId)
                    .single();
                if (profile?.preferred_image_model) {
                    preferredImageModel = profile.preferred_image_model;
                }
            }

            const result = await preflightService.runPreflightChecks({
                orgId,
                userId,
                targets,
                preferredImageModel
            });

            res.json(result);
        } catch (err) {
            console.error('Error running preflight checks:', err);
            res.status(500).json({ error: err.message });
        }
    });


    return router;
};
