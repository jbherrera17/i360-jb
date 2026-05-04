/**
 * Thought Leadership — Image Generation.
 *
 * Module-access gating is applied by the coordinator (see ./index.js).
 */

const express = require('express');
const tlImageService = require('../../services/tlImageService');

module.exports = function (supabase) {
    const router = express.Router();

    // ============================================================================
    // IMAGE GENERATION ENDPOINTS
    // ============================================================================

    /**
     * GET /api/thought-leadership/images/styles
     * Get available image styles
     */
    router.get('/images/styles', (req, res) => {
        res.json({
            styles: tlImageService.getImageStyles()
        });
    });

    /**
     * POST /api/thought-leadership/generate/image
     * Generate a header image for an article
     */
    router.post('/generate/image', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const {
                calendar_entry_id,
                article_content,
                style = 'professional',
                topic,
                pillar_id
            } = req.body;

            // Get article content from calendar entry if not provided directly
            let content = article_content;
            let pillarInfo = null;
            let entryTopic = topic;

            if (calendar_entry_id && !content) {
                const { data: entry } = await supabase
                    .from('content_calendar_entries')
                    .select('article_markdown, title, pillar_id')
                    .eq('id', calendar_entry_id)
                    .single();

                if (entry) {
                    content = entry.article_markdown;
                    entryTopic = entryTopic || entry.title;
                    if (entry.pillar_id) {
                        const { data: pillar } = await supabase
                            .from('content_pillars')
                            .select('name')
                            .eq('id', entry.pillar_id)
                            .single();
                        pillarInfo = pillar;
                    }
                }
            }

            // Get pillar info if pillar_id provided
            if (pillar_id && !pillarInfo) {
                const { data: pillar } = await supabase
                    .from('content_pillars')
                    .select('name')
                    .eq('id', pillar_id)
                    .single();
                pillarInfo = pillar;
            }

            if (!content && !entryTopic) {
                return res.status(400).json({
                    error: 'Either article_content, topic, or calendar_entry_id with existing article is required'
                });
            }

            // Get user's thesis for context
            const { data: profile } = await supabase
                .from('thought_leadership_profiles')
                .select('core_thesis')
                .eq('user_id', userId)
                .single();

            console.log(`[TL Image] Generating ${style} image for topic: ${entryTopic || 'article'}`);

            const result = await tlImageService.generateArticleImage(content || entryTopic, {
                style,
                topic: entryTopic,
                pillar: pillarInfo?.name,
                thesis: profile?.core_thesis,
                calendarEntryId: calendar_entry_id,
                userId
            });

            res.json({
                success: true,
                image: {
                    url: result.url,
                    prompt: result.prompt,
                    revisedPrompt: result.revisedPrompt,
                    style: result.style,
                    styleName: result.styleName
                },
                metadata: {
                    size: result.size,
                    quality: result.quality,
                    model: result.model,
                    generationTimeMs: result.generationTimeMs
                }
            });
        } catch (err) {
            console.error('Error generating image:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/thought-leadership/images/:calendar_entry_id
     * Get image generation history for a calendar entry
     */
    router.get('/images/:calendar_entry_id', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { calendar_entry_id } = req.params;

            const images = await tlImageService.getImageHistory(calendar_entry_id);

            res.json({
                images,
                currentImage: images.find(img => img.is_current) || null
            });
        } catch (err) {
            console.error('Error fetching image history:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * PUT /api/thought-leadership/images/:calendar_entry_id/current/:image_id
     * Set a specific image as current for a calendar entry
     */
    router.put('/images/:calendar_entry_id/current/:image_id', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { calendar_entry_id, image_id } = req.params;

            const image = await tlImageService.setCurrentImage(calendar_entry_id, image_id);

            res.json({
                success: true,
                image
            });
        } catch (err) {
            console.error('Error setting current image:', err);
            res.status(500).json({ error: err.message });
        }
    });


    return router;
};
