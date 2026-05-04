/**
 * Thought Leadership — Legacy Publishing & Scheduling.
 *
 * Module-access gating is applied by the coordinator (see ./index.js).
 */

const express = require('express');
const linkedinService = require('../../services/linkedinService');
const schedulerService = require('../../services/schedulerService');

module.exports = function (supabase) {
    const router = express.Router();

    // ============================================================================
    // LEGACY PUBLISHING & SCHEDULING ENDPOINTS
    // ============================================================================

    /**
     * GET /api/thought-leadership/publish/optimal-time
     * Get optimal posting time recommendation
     */
    router.get('/publish/optimal-time', (req, res) => {
        try {
            const {
                platform = 'linkedin',
                content_type = 'linkedin_post',
                timezone = 'America/New_York'
            } = req.query;

            const recommendation = schedulerService.getOptimalPublishTime(
                platform,
                timezone,
                content_type
            );

            res.json(recommendation);
        } catch (err) {
            console.error('Error getting optimal time:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/publish/schedule
     * Schedule content for future publication
     */
    router.post('/publish/schedule', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const {
                calendar_entry_id,
                output_id,
                platform,
                scheduled_at,
                timezone = 'America/New_York',
                content_type,
                content_text,
                content_json,
                media_urls,
                use_optimal_time = false
            } = req.body;

            if (!platform || !content_type || !content_text) {
                return res.status(400).json({
                    error: 'platform, content_type, and content_text are required'
                });
            }

            // Check if user has connected the platform
            if (platform === 'linkedin') {
                const isConnected = await linkedinService.isConnected(userId);
                if (!isConnected) {
                    return res.status(400).json({
                        error: 'LinkedIn not connected. Please connect your account first.',
                        code: 'PLATFORM_NOT_CONNECTED'
                    });
                }
            }

            // Determine scheduled time
            let finalScheduledAt = scheduled_at;
            let wasOptimalTime = false;
            let optimalTimeReason = null;

            if (use_optimal_time || !scheduled_at) {
                const optimal = schedulerService.getOptimalPublishTime(platform, timezone, content_type);
                finalScheduledAt = optimal.recommendedTime;
                wasOptimalTime = true;
                optimalTimeReason = optimal.reason;
            }

            // Create the scheduled publication
            const publication = await schedulerService.createScheduledPublication({
                userId,
                calendarEntryId: calendar_entry_id,
                outputId: output_id,
                platform,
                scheduledAt: finalScheduledAt,
                timezone,
                contentType: content_type,
                contentText: content_text,
                contentJson: content_json,
                mediaUrls: media_urls,
                wasOptimalTime,
                optimalTimeReason
            });

            res.json({
                success: true,
                publication: {
                    id: publication.id,
                    platform: publication.platform,
                    scheduled_at: publication.scheduled_at,
                    status: publication.status,
                    was_optimal_time: publication.was_optimal_time,
                    optimal_time_reason: publication.optimal_time_reason
                }
            });
        } catch (err) {
            console.error('Error scheduling publication:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/publish/now
     * Publish content immediately
     */
    router.post('/publish/now', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const {
                platform,
                content_text,
                image_url,
                article_url,
                article_title
            } = req.body;

            if (!platform || !content_text) {
                return res.status(400).json({
                    error: 'platform and content_text are required'
                });
            }

            let result;

            switch (platform) {
                case 'linkedin':
                    result = await linkedinService.publishPost(userId, content_text, {
                        imageUrl: image_url,
                        articleUrl: article_url,
                        articleTitle: article_title
                    });
                    break;

                default:
                    return res.status(400).json({
                        error: `Publishing to ${platform} is not yet supported`
                    });
            }

            res.json({
                success: true,
                result
            });
        } catch (err) {
            console.error('Error publishing:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/thought-leadership/publish/scheduled
     * Get all scheduled publications for user
     */
    router.get('/publish/scheduled', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { status = 'scheduled', limit = 20 } = req.query;

            const { data, error } = await supabase
                .from('scheduled_publications')
                .select(`
                    *,
                    content_calendar_entries(title)
                `)
                .eq('user_id', userId)
                .eq('status', status)
                .order('scheduled_at', { ascending: true })
                .limit(parseInt(limit));

            if (error) throw error;

            res.json({ publications: data });
        } catch (err) {
            console.error('Error fetching scheduled publications:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * DELETE /api/thought-leadership/publish/:id
     * Cancel a scheduled publication
     */
    router.delete('/publish/:id', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { id } = req.params;

            // Verify ownership
            const { data: pub } = await supabase
                .from('scheduled_publications')
                .select('user_id')
                .eq('id', id)
                .single();

            if (!pub || pub.user_id !== userId) {
                return res.status(404).json({ error: 'Publication not found' });
            }

            await schedulerService.cancelScheduledPublication(id);

            res.json({ success: true });
        } catch (err) {
            console.error('Error cancelling publication:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/thought-leadership/publish/history
     * Get publication history
     */
    router.get('/publish/history', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { platform, limit = 50 } = req.query;

            let query = supabase
                .from('publication_history')
                .select('*')
                .eq('user_id', userId)
                .order('published_at', { ascending: false })
                .limit(parseInt(limit));

            if (platform) {
                query = query.eq('platform', platform);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({ history: data });
        } catch (err) {
            console.error('Error fetching publication history:', err);
            res.status(500).json({ error: err.message });
        }
    });


    return router;
};
