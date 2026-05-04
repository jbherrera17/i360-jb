/**
 * Thought Leadership — AI Visibility Research.
 *
 * Module-access gating is applied by the coordinator (see ./index.js).
 */

const express = require('express');
const { randomUUID: uuidv4 } = require('crypto');

module.exports = function (supabase) {
    const router = express.Router();

    // ============================================================================
    // AI VISIBILITY RESEARCH ENDPOINTS
    // ============================================================================

    /**
     * POST /api/thought-leadership/visibility/research
     * Create new visibility research
     */
    router.post('/visibility/research', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const {
                research_type,
                subject_name,
                visibility_score,
                key_findings,
                topics_found,
                recommended_actions,
                prompts_used,
                raw_responses,
                research_source
            } = req.body;

            if (!research_type || !subject_name) {
                return res.status(400).json({ error: 'research_type and subject_name are required' });
            }

            // Get profile ID
            const { data: profile } = await supabase
                .from('thought_leadership_profiles')
                .select('id')
                .eq('user_id', userId)
                .single();

            const researchData = {
                id: uuidv4(),
                user_id: userId,
                profile_id: profile?.id,
                research_type,
                subject_name,
                visibility_score,
                key_findings: key_findings || [],
                topics_found: topics_found || [],
                recommended_actions: recommended_actions || [],
                prompts_used: prompts_used || [],
                raw_responses: raw_responses || {},
                research_source: research_source || 'perplexity'
            };

            const { data, error } = await supabase
                .from('ai_visibility_research')
                .insert(researchData)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (err) {
            console.error('Error creating visibility research:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/thought-leadership/visibility/history
     * Get visibility research history
     */
    router.get('/visibility/history', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { research_type, limit = 20 } = req.query;

            let query = supabase
                .from('ai_visibility_research')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(parseInt(limit));

            if (research_type) {
                query = query.eq('research_type', research_type);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({ data: data || [] });
        } catch (err) {
            console.error('Error fetching visibility history:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/thought-leadership/visibility/latest
     * Get latest visibility scores
     */
    router.get('/visibility/latest', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            // Get latest personal visibility
            const { data: personal } = await supabase
                .from('ai_visibility_research')
                .select('visibility_score, key_findings, created_at')
                .eq('user_id', userId)
                .eq('research_type', 'personal')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            // Get latest competitor analyses
            const { data: competitors } = await supabase
                .from('ai_visibility_research')
                .select('subject_name, visibility_score, created_at')
                .eq('user_id', userId)
                .eq('research_type', 'competitor')
                .order('created_at', { ascending: false })
                .limit(5);

            res.json({
                personal: personal || null,
                competitors: competitors || []
            });
        } catch (err) {
            console.error('Error fetching latest visibility:', err);
            res.status(500).json({ error: err.message });
        }
    });


    return router;
};
