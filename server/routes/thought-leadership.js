/**
 * INSIGHT 360 - Thought Leadership API Routes
 * Version: 1.0.0
 *
 * Endpoints:
 *   - Profile Management (4 endpoints)
 *   - Content Pillars (4 endpoints)
 *   - AI Visibility Research (3 endpoints)
 *   - Content Calendar (6 endpoints)
 *   - Content Generation (3 endpoints)
 */

const express = require('express');
const { randomUUID: uuidv4 } = require('crypto');
const notionService = require('../services/notionService');
const { executeAgent } = require('../services/agentService');
const tlImageService = require('../services/tlImageService');
const linkedinService = require('../services/linkedinService');
const schedulerService = require('../services/schedulerService');

// TL Agent IDs (from seed-thought-leadership-agents.sql)
const TL_AGENTS = {
    STRATEGY_ARCHITECT: 'a0000001-0000-4000-a000-000000000301',
    VISIBILITY_RESEARCHER: 'a0000001-0000-4000-a000-000000000302',
    PILLAR_DESIGNER: 'a0000001-0000-4000-a000-000000000303',
    ARTICLE_WRITER: 'a0000001-0000-4000-a000-000000000304',
    LINKEDIN_GENERATOR: 'a0000001-0000-4000-a000-000000000305'
};

/**
 * Thought Leadership Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
module.exports = function(supabase) {
    const router = express.Router();

    // ============================================================================
    // PROFILE MANAGEMENT ENDPOINTS
    // ============================================================================

    /**
     * GET /api/thought-leadership/profile
     * Get user's thought leadership profile
     */
    router.get('/profile', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { data, error } = await supabase
                .from('thought_leadership_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            res.json({ data: data || null });
        } catch (err) {
            console.error('Error fetching TL profile:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/profile
     * Create or update thought leadership profile
     */
    router.post('/profile', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const {
                core_thesis,
                atomic_claim,
                positioning_framework,
                notion_database_id,
                default_publish_targets,
                weekly_publish_day,
                status
            } = req.body;

            const profileData = {
                user_id: userId,
                core_thesis,
                atomic_claim,
                positioning_framework,
                notion_database_id,
                default_publish_targets,
                weekly_publish_day,
                status,
                updated_at: new Date().toISOString()
            };

            // Remove undefined values
            Object.keys(profileData).forEach(key =>
                profileData[key] === undefined && delete profileData[key]
            );

            const { data, error } = await supabase
                .from('thought_leadership_profiles')
                .upsert(profileData, { onConflict: 'user_id' })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (err) {
            console.error('Error saving TL profile:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * PUT /api/thought-leadership/profile/setup-step
     * Update setup progress step
     */
    router.put('/profile/setup-step', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { setup_step, setup_data, setup_completed } = req.body;

            const updates = { updated_at: new Date().toISOString() };
            if (setup_step !== undefined) updates.setup_step = setup_step;
            if (setup_data !== undefined) updates.setup_data = setup_data;
            if (setup_completed !== undefined) updates.setup_completed = setup_completed;

            const { data, error } = await supabase
                .from('thought_leadership_profiles')
                .update(updates)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (err) {
            console.error('Error updating setup step:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/thought-leadership/profile/status
     * Get profile status and setup progress
     */
    router.get('/profile/status', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { data: profile, error } = await supabase
                .from('thought_leadership_profiles')
                .select('status, setup_completed, setup_step, core_thesis, atomic_claim')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            // Count pillars
            const { count: pillarCount } = await supabase
                .from('content_pillars')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            res.json({
                has_profile: !!profile,
                status: profile?.status || 'not_started',
                setup_completed: profile?.setup_completed || false,
                setup_step: profile?.setup_step || 0,
                has_thesis: !!profile?.core_thesis,
                has_atomic_claim: !!profile?.atomic_claim,
                pillar_count: pillarCount || 0
            });
        } catch (err) {
            console.error('Error fetching profile status:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // ============================================================================
    // CONTENT PILLARS ENDPOINTS
    // ============================================================================

    /**
     * GET /api/thought-leadership/pillars
     * Get all content pillars for user
     */
    router.get('/pillars', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { data, error } = await supabase
                .from('content_pillars')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;

            res.json({ data: data || [] });
        } catch (err) {
            console.error('Error fetching pillars:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/pillars
     * Create a new content pillar
     */
    router.post('/pillars', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const {
                name,
                description,
                icon,
                color,
                quarterly_focus,
                monthly_themes,
                key_topics,
                hashtags,
                sample_titles,
                notion_pillar_value,
                sort_order
            } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Pillar name is required' });
            }

            // Get profile ID
            const { data: profile } = await supabase
                .from('thought_leadership_profiles')
                .select('id')
                .eq('user_id', userId)
                .single();

            const pillarData = {
                id: uuidv4(),
                user_id: userId,
                profile_id: profile?.id,
                name,
                description,
                icon: icon || 'bookmark',
                color: color || '#3b82f6',
                quarterly_focus: quarterly_focus || [],
                monthly_themes: monthly_themes || {},
                key_topics: key_topics || [],
                hashtags: hashtags || [],
                sample_titles: sample_titles || [],
                notion_pillar_value,
                sort_order: sort_order || 0
            };

            const { data, error } = await supabase
                .from('content_pillars')
                .insert(pillarData)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (err) {
            console.error('Error creating pillar:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * PUT /api/thought-leadership/pillars/:id
     * Update a content pillar
     */
    router.put('/pillars/:id', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { id } = req.params;
            const updates = { ...req.body, updated_at: new Date().toISOString() };
            delete updates.id;
            delete updates.user_id;
            delete updates.profile_id;

            const { data, error } = await supabase
                .from('content_pillars')
                .update(updates)
                .eq('id', id)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (err) {
            console.error('Error updating pillar:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * DELETE /api/thought-leadership/pillars/:id
     * Soft delete a content pillar
     */
    router.delete('/pillars/:id', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { id } = req.params;

            const { error } = await supabase
                .from('content_pillars')
                .update({ is_active: false })
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            res.json({ success: true });
        } catch (err) {
            console.error('Error deleting pillar:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // ============================================================================
    // AI VISIBILITY RESEARCH ENDPOINTS
    // ============================================================================

    /**
     * POST /api/thought-leadership/visibility/research
     * Create new visibility research
     */
    router.post('/visibility/research', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
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
            const userId = req.headers['x-user-id'];
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
            const userId = req.headers['x-user-id'];
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

    // ============================================================================
    // CONTENT CALENDAR ENDPOINTS
    // ============================================================================

    /**
     * GET /api/thought-leadership/calendar
     * Get calendar entries (from Notion or local cache)
     */
    router.get('/calendar', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            const { source = 'notion', status, pillar, start_date, end_date } = req.query;

            // Try Notion first if configured, with fallback to local database
            if (source === 'notion' && notionService.isCalendarConfigured()) {
                try {
                    // Attempt to fetch from Notion
                    const filters = {};
                    if (status) filters.status = status;
                    if (pillar) filters.pillar = pillar;
                    if (start_date) filters.startDate = new Date(start_date);
                    if (end_date) filters.endDate = new Date(end_date);

                    const entries = await notionService.getContentCalendarEntries(filters);
                    return res.json({ source: 'notion', data: entries });
                } catch (notionErr) {
                    // If Notion fails (e.g., access denied), fall back to local database
                    console.warn('[TL Calendar] Notion fetch failed, falling back to local:', notionErr.message);
                }
            }

            // Fetch from local database (default or fallback)
            let query = supabase
                .from('content_calendar_entries')
                .select('*')
                .order('scheduled_date', { ascending: true });

            if (userId) query = query.eq('user_id', userId);
            if (status) query = query.eq('status', status);
            if (start_date) query = query.gte('scheduled_date', start_date);
            if (end_date) query = query.lte('scheduled_date', end_date);

            const { data, error } = await query;
            if (error) throw error;

            res.json({ source: 'local', data: data || [] });
        } catch (err) {
            console.error('Error fetching calendar:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/calendar
     * Create a new calendar entry
     */
    router.post('/calendar', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { sync_to_notion = true, ...entryData } = req.body;

            // Get profile
            const { data: profile } = await supabase
                .from('thought_leadership_profiles')
                .select('id')
                .eq('user_id', userId)
                .single();

            // Create in local database
            const localEntry = {
                id: uuidv4(),
                user_id: userId,
                profile_id: profile?.id,
                ...entryData,
                sync_status: sync_to_notion ? 'pending' : 'local_only'
            };

            const { data: savedEntry, error } = await supabase
                .from('content_calendar_entries')
                .insert(localEntry)
                .select()
                .single();

            if (error) throw error;

            // Sync to Notion if requested
            if (sync_to_notion && notionService.isCalendarConfigured()) {
                try {
                    const notionResult = await notionService.createCalendarEntry(entryData);

                    // Update local entry with Notion IDs
                    await supabase
                        .from('content_calendar_entries')
                        .update({
                            notion_page_id: notionResult.pageId,
                            notion_url: notionResult.url,
                            sync_status: 'synced',
                            last_synced_at: new Date().toISOString()
                        })
                        .eq('id', savedEntry.id);

                    savedEntry.notion_page_id = notionResult.pageId;
                    savedEntry.notion_url = notionResult.url;
                    savedEntry.sync_status = 'synced';
                } catch (notionErr) {
                    console.error('Notion sync failed:', notionErr);
                    // Entry created locally, sync failed
                    savedEntry.sync_status = 'pending';
                }
            }

            res.json({ success: true, data: savedEntry });
        } catch (err) {
            console.error('Error creating calendar entry:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * PUT /api/thought-leadership/calendar/:id
     * Update a calendar entry
     */
    router.put('/calendar/:id', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { id } = req.params;
            const { sync_to_notion = true, ...updates } = req.body;

            // Update local entry
            const { data: entry, error } = await supabase
                .from('content_calendar_entries')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                    sync_status: sync_to_notion ? 'pending' : 'local_only'
                })
                .eq('id', id)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            // Sync to Notion if requested and we have a Notion page ID
            if (sync_to_notion && entry.notion_page_id && notionService.isCalendarConfigured()) {
                try {
                    await notionService.updateCalendarEntry(entry.notion_page_id, updates);

                    await supabase
                        .from('content_calendar_entries')
                        .update({
                            sync_status: 'synced',
                            last_synced_at: new Date().toISOString()
                        })
                        .eq('id', id);

                    entry.sync_status = 'synced';
                } catch (notionErr) {
                    console.error('Notion sync failed:', notionErr);
                }
            }

            res.json({ success: true, data: entry });
        } catch (err) {
            console.error('Error updating calendar entry:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * DELETE /api/thought-leadership/calendar/:id
     * Delete a calendar entry
     */
    router.delete('/calendar/:id', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { id } = req.params;
            const { delete_from_notion = false } = req.query;

            // Get entry to check for Notion page ID
            const { data: entry } = await supabase
                .from('content_calendar_entries')
                .select('notion_page_id')
                .eq('id', id)
                .eq('user_id', userId)
                .single();

            // Delete from Notion if requested
            if (delete_from_notion === 'true' && entry?.notion_page_id && notionService.isCalendarConfigured()) {
                try {
                    await notionService.deleteCalendarEntry(entry.notion_page_id);
                } catch (notionErr) {
                    console.error('Notion delete failed:', notionErr);
                }
            }

            // Delete from local database
            const { error } = await supabase
                .from('content_calendar_entries')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            res.json({ success: true });
        } catch (err) {
            console.error('Error deleting calendar entry:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/calendar/:id/sync
     * Sync a single entry with Notion
     */
    router.post('/calendar/:id/sync', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            const { id } = req.params;
            const { direction = 'to_notion' } = req.body;

            // Get local entry
            const { data: entry, error } = await supabase
                .from('content_calendar_entries')
                .select('*')
                .eq('id', id)
                .eq('user_id', userId)
                .single();

            if (error) throw error;
            if (!entry) {
                return res.status(404).json({ error: 'Entry not found' });
            }

            if (!notionService.isCalendarConfigured()) {
                return res.status(400).json({ error: 'Notion not configured' });
            }

            let result;
            if (direction === 'to_notion') {
                // Push local to Notion
                result = await notionService.syncLocalToNotion(entry);

                // Update local with Notion IDs
                await supabase
                    .from('content_calendar_entries')
                    .update({
                        notion_page_id: result.pageId,
                        notion_url: result.url,
                        sync_status: 'synced',
                        last_synced_at: new Date().toISOString()
                    })
                    .eq('id', id);

            } else if (direction === 'from_notion' && entry.notion_page_id) {
                // Pull from Notion
                const notionEntry = await notionService.getCalendarEntry(entry.notion_page_id);

                await supabase
                    .from('content_calendar_entries')
                    .update({
                        title: notionEntry.title,
                        scheduled_date: notionEntry.scheduled_date,
                        pillar: notionEntry.pillar,
                        status: notionEntry.status,
                        sync_status: 'synced',
                        last_synced_at: new Date().toISOString(),
                        notion_last_edited: notionEntry.notion_last_edited
                    })
                    .eq('id', id);

                result = notionEntry;
            }

            res.json({ success: true, data: result });
        } catch (err) {
            console.error('Error syncing entry:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/calendar/sync-all
     * Sync all entries with Notion
     */
    router.post('/calendar/sync-all', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            if (!notionService.isCalendarConfigured()) {
                return res.status(400).json({ error: 'Notion not configured' });
            }

            // Get all pending entries
            const { data: pendingEntries } = await supabase
                .from('content_calendar_entries')
                .select('*')
                .eq('user_id', userId)
                .in('sync_status', ['pending', 'conflict']);

            const results = { synced: 0, failed: 0, errors: [] };

            for (const entry of (pendingEntries || [])) {
                try {
                    const result = await notionService.syncLocalToNotion(entry);

                    await supabase
                        .from('content_calendar_entries')
                        .update({
                            notion_page_id: result.pageId,
                            notion_url: result.url,
                            sync_status: 'synced',
                            last_synced_at: new Date().toISOString()
                        })
                        .eq('id', entry.id);

                    results.synced++;
                } catch (err) {
                    results.failed++;
                    results.errors.push({ id: entry.id, error: err.message });
                }
            }

            res.json({ success: true, results });
        } catch (err) {
            console.error('Error syncing all entries:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/thought-leadership/calendar/schema
     * Get Notion database schema to check property names
     */
    router.get('/calendar/schema', async (req, res) => {
        try {
            if (!notionService.isCalendarConfigured()) {
                return res.status(400).json({ error: 'Notion not configured' });
            }

            const schema = await notionService.getCalendarSchema();
            res.json({ success: true, schema });
        } catch (err) {
            console.error('Error fetching schema:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/thought-leadership/calendar/entry/:pageId/content
     * Get the content (body text) of a Notion page as markdown
     */
    router.get('/calendar/entry/:pageId/content', async (req, res) => {
        try {
            const { pageId } = req.params;

            if (!pageId) {
                return res.status(400).json({ error: 'Page ID required' });
            }

            if (!notionService.client) {
                return res.status(400).json({ error: 'Notion not configured' });
            }

            const content = await notionService.getPageContent(pageId);
            res.json({ success: true, ...content });
        } catch (err) {
            console.error('Error fetching page content:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // Debug endpoint to check raw Notion properties
    router.get('/calendar/entry/:pageId/debug', async (req, res) => {
        try {
            const { pageId } = req.params;
            if (!notionService.client) {
                return res.status(400).json({ error: 'Notion not configured' });
            }
            const page = await notionService.client.pages.retrieve({ page_id: pageId });
            res.json({
                success: true,
                properties: page.properties,
                status_property: page.properties['Status']
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ============================================================================
    // CONTENT GENERATION ENDPOINTS
    // ============================================================================

    /**
     * POST /api/thought-leadership/generate/research
     * Research a topic using AI Visibility Researcher (with web search)
     */
    router.post('/generate/research', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { topic, focus_areas, industry } = req.body;

            if (!topic) {
                return res.status(400).json({ error: 'Topic is required' });
            }

            const prompt = `Research this thought leadership topic:

**Topic:** ${topic}
${industry ? `**Industry:** ${industry}` : ''}
${focus_areas ? `**Focus Areas:** ${focus_areas.join(', ')}` : ''}

Research requirements:
1. Current state and recent developments (last 6 months)
2. Key statistics and data points with sources
3. Expert perspectives and notable quotes
4. Case studies or real-world examples
5. Common misconceptions to address
6. Practical applications and implications
7. Contrarian viewpoints or debates in the field

Focus on credible sources. Include citations where possible.
Format as structured markdown with clear sections.`;

            const startTime = Date.now();
            const result = await executeAgent(TL_AGENTS.VISIBILITY_RESEARCHER, {
                userMessage: prompt,
                userId: userId,
                conversationHistory: []
            });

            const duration_ms = Date.now() - startTime;

            res.json({
                success: true,
                research: result.response,
                metadata: {
                    topic,
                    execution_id: result.execution_id,
                    model: result.model,
                    tokens_used: result.usage?.total_tokens,
                    duration_ms
                }
            });
        } catch (err) {
            console.error('Error researching topic:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/generate/article
     * Generate an article (calls TL Article Writer agent)
     */
    router.post('/generate/article', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const {
                topic,
                pillar_id,
                format = 'medium',
                calendar_entry_id,
                additional_context,
                research_findings
            } = req.body;

            if (!topic) {
                return res.status(400).json({ error: 'Topic is required' });
            }

            // Get pillar info if provided
            let pillarInfo = null;
            if (pillar_id) {
                const { data: pillar } = await supabase
                    .from('content_pillars')
                    .select('*')
                    .eq('id', pillar_id)
                    .single();
                pillarInfo = pillar;
            }

            // Get user's TL profile for thesis/claim context
            const { data: profile } = await supabase
                .from('thought_leadership_profiles')
                .select('core_thesis, atomic_claim, positioning_framework')
                .eq('user_id', userId)
                .single();

            // Build the prompt for the Article Writer
            const formatSpecs = {
                long: '2000+ words, comprehensive treatment with 5-7 major sections',
                medium: '1000-1500 words, standard article with 3-4 major sections',
                short: '500-800 words, focused single insight with 2-3 sections'
            };

            const prompt = `Write a thought leadership article:

**Topic:** ${topic}
**Format:** ${format} (${formatSpecs[format] || formatSpecs.medium})
${pillarInfo ? `**Content Pillar:** ${pillarInfo.name}
**Pillar Description:** ${pillarInfo.description || 'N/A'}
**Hashtags:** ${(pillarInfo.hashtags || []).join(', ') || 'N/A'}` : ''}
${profile?.core_thesis ? `**Core Thesis:** ${profile.core_thesis}` : ''}
${profile?.atomic_claim ? `**Atomic Claim:** ${profile.atomic_claim}` : ''}
${research_findings ? `**Research Findings:**
${research_findings}` : ''}
${additional_context ? `**Additional Context:**
${additional_context}` : ''}

Write the complete article now, following the Voice DNA exactly. Include:
- A hook opening that creates curiosity
- Clear thesis statement
- Supporting sections with evidence
- Specific examples
- Actionable takeaways
- Reflective close`;

            // Execute the TL Article Writer agent
            const startTime = Date.now();
            const result = await executeAgent(TL_AGENTS.ARTICLE_WRITER, {
                userMessage: prompt,
                userId: userId,
                conversationHistory: []
            });

            const duration_ms = Date.now() - startTime;

            // Optionally save to outputs table
            let savedOutput = null;
            if (calendar_entry_id) {
                const { data: output } = await supabase
                    .from('thought_leadership_outputs')
                    .insert({
                        user_id: userId,
                        calendar_entry_id,
                        output_type: 'article_human',
                        title: topic,
                        content: result.response,
                        content_format: 'markdown',
                        model_used: result.model || 'claude-sonnet',
                        tokens_used: result.usage?.total_tokens,
                        generation_time_ms: duration_ms,
                        is_current: true
                    })
                    .select()
                    .single();
                savedOutput = output;

                // Update calendar entry with article content
                await supabase
                    .from('content_calendar_entries')
                    .update({
                        article_markdown: result.response,
                        status: 'drafting'
                    })
                    .eq('id', calendar_entry_id);
            }

            res.json({
                success: true,
                article: result.response,
                metadata: {
                    topic,
                    format,
                    pillar: pillarInfo?.name,
                    execution_id: result.execution_id,
                    model: result.model,
                    tokens_used: result.usage?.total_tokens,
                    duration_ms,
                    saved_output_id: savedOutput?.id
                }
            });
        } catch (err) {
            console.error('Error generating article:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/generate/linkedin
     * Generate LinkedIn posts (calls TL LinkedIn Generator agent)
     */
    router.post('/generate/linkedin', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const {
                article_content,
                calendar_entry_id,
                pillar_id
            } = req.body;

            if (!article_content) {
                return res.status(400).json({ error: 'Article content is required' });
            }

            // Get pillar hashtags if provided
            let pillarHashtags = [];
            if (pillar_id) {
                const { data: pillar } = await supabase
                    .from('content_pillars')
                    .select('hashtags, name')
                    .eq('id', pillar_id)
                    .single();
                pillarHashtags = pillar?.hashtags || [];
            }

            // Build prompt for LinkedIn Generator
            const prompt = `Generate 5 LinkedIn posts for this article:

**Article:**
${article_content}

**Daily Theme Framework:**
- **Monday (Insight Launch)**: Lead with the counterintuitive insight from the article
- **Tuesday (Problem Spotlight)**: Highlight the pain point addressed
- **Wednesday (Framework Reveal)**: Share the practical how-to
- **Thursday (Story/Example)**: Make it concrete with a narrative from the article
- **Friday (Call to Reflect)**: End the week with meaning and reflection

**For each post:**
- Hook line under 10 words that stops the scroll
- 150-250 words total
- End with an engagement question
- Include 3-5 hashtags

${pillarHashtags.length > 0 ? `**Pillar hashtags to use:**
${pillarHashtags.join(', ')}` : ''}

Generate all 5 posts now in JSON format:
{
  "posts": [
    {"day": "monday", "theme": "insight_launch", "content": "...", "hashtags": [...]},
    ...
  ]
}`;

            // Execute the TL LinkedIn Generator agent
            const startTime = Date.now();
            const result = await executeAgent(TL_AGENTS.LINKEDIN_GENERATOR, {
                userMessage: prompt,
                userId: userId,
                conversationHistory: []
            });

            const duration_ms = Date.now() - startTime;

            // Try to parse JSON from response
            let linkedinPosts = [];
            try {
                const jsonMatch = result.response.match(/\{[\s\S]*"posts"[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    linkedinPosts = parsed.posts || [];
                }
            } catch (parseErr) {
                console.warn('Could not parse LinkedIn posts as JSON, returning raw response');
            }

            // Save to outputs and calendar if entry provided
            let savedOutput = null;
            if (calendar_entry_id) {
                const { data: output } = await supabase
                    .from('thought_leadership_outputs')
                    .insert({
                        user_id: userId,
                        calendar_entry_id,
                        output_type: 'linkedin_series',
                        title: 'Weekly LinkedIn Series',
                        content: result.response,
                        content_format: linkedinPosts.length > 0 ? 'json' : 'markdown',
                        model_used: result.model || 'claude-sonnet',
                        tokens_used: result.usage?.total_tokens,
                        generation_time_ms: duration_ms,
                        is_current: true
                    })
                    .select()
                    .single();
                savedOutput = output;

                // Update calendar entry with LinkedIn posts
                await supabase
                    .from('content_calendar_entries')
                    .update({
                        linkedin_posts: linkedinPosts.length > 0 ? linkedinPosts : [{ raw: result.response }]
                    })
                    .eq('id', calendar_entry_id);
            }

            res.json({
                success: true,
                posts: linkedinPosts.length > 0 ? linkedinPosts : null,
                raw_response: linkedinPosts.length === 0 ? result.response : undefined,
                metadata: {
                    post_count: linkedinPosts.length || 'unparsed',
                    execution_id: result.execution_id,
                    model: result.model,
                    tokens_used: result.usage?.total_tokens,
                    duration_ms,
                    saved_output_id: savedOutput?.id
                }
            });
        } catch (err) {
            console.error('Error generating LinkedIn posts:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/generate/package
     * Generate complete weekly package (article + AI-optimized + LinkedIn posts)
     */
    router.post('/generate/package', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const {
                topic,
                pillar_id,
                calendar_entry_id,
                format = 'medium',
                research_findings,
                additional_context,
                generate_image = true,
                image_style = 'professional'
            } = req.body;

            if (!topic) {
                return res.status(400).json({ error: 'Topic is required' });
            }

            const packageStartTime = Date.now();
            const results = {
                article: null,
                article_ai: null,
                linkedin_posts: null,
                header_image: null,
                errors: []
            };

            // Get pillar info
            let pillarInfo = null;
            if (pillar_id) {
                const { data: pillar } = await supabase
                    .from('content_pillars')
                    .select('*')
                    .eq('id', pillar_id)
                    .single();
                pillarInfo = pillar;
            }

            // Get user's TL profile
            const { data: profile } = await supabase
                .from('thought_leadership_profiles')
                .select('core_thesis, atomic_claim')
                .eq('user_id', userId)
                .single();

            // STEP 1: Generate Article
            console.log(`[TL Package] Step 1: Generating article for topic "${topic}"`);
            try {
                const formatSpecs = {
                    long: '2000+ words, comprehensive treatment with 5-7 major sections',
                    medium: '1000-1500 words, standard article with 3-4 major sections',
                    short: '500-800 words, focused single insight with 2-3 sections'
                };

                const articlePrompt = `Write a thought leadership article:

**Topic:** ${topic}
**Format:** ${format} (${formatSpecs[format] || formatSpecs.medium})
${pillarInfo ? `**Content Pillar:** ${pillarInfo.name}
**Pillar Description:** ${pillarInfo.description || 'N/A'}` : ''}
${profile?.core_thesis ? `**Core Thesis:** ${profile.core_thesis}` : ''}
${profile?.atomic_claim ? `**Atomic Claim:** ${profile.atomic_claim}` : ''}
${research_findings ? `**Research Findings:**
${research_findings}` : ''}
${additional_context ? `**Additional Context:**
${additional_context}` : ''}

Write the complete article now, following the Voice DNA exactly.`;

                const articleResult = await executeAgent(TL_AGENTS.ARTICLE_WRITER, {
                    userMessage: articlePrompt,
                    userId: userId,
                    conversationHistory: []
                });

                results.article = {
                    content: articleResult.response,
                    execution_id: articleResult.execution_id,
                    tokens_used: articleResult.usage?.total_tokens
                };
            } catch (articleErr) {
                console.error('[TL Package] Article generation failed:', articleErr);
                results.errors.push({ step: 'article', error: articleErr.message });
            }

            // STEP 2: Generate AI-Optimized Version (only if article succeeded)
            if (results.article) {
                console.log('[TL Package] Step 2: Generating AI-optimized version');
                try {
                    const aiOptimizePrompt = `Transform this article into AI-optimized format for maximum visibility in AI search results:

${results.article.content}

Apply these optimizations:
1. Add YAML front matter with: title, author, date, pillar, topics, key_claim, target_audience
2. Restructure section headers as clear questions
3. Make each paragraph self-contained and quotable
4. Add explicit topic sentences
5. Include author attribution markers
6. Add section summaries

Output the complete AI-optimized article.`;

                    const aiResult = await executeAgent(TL_AGENTS.ARTICLE_WRITER, {
                        userMessage: aiOptimizePrompt,
                        userId: userId,
                        conversationHistory: []
                    });

                    results.article_ai = {
                        content: aiResult.response,
                        execution_id: aiResult.execution_id,
                        tokens_used: aiResult.usage?.total_tokens
                    };
                } catch (aiErr) {
                    console.error('[TL Package] AI optimization failed:', aiErr);
                    results.errors.push({ step: 'article_ai', error: aiErr.message });
                }
            }

            // STEP 3: Generate LinkedIn Posts (only if article succeeded)
            if (results.article) {
                console.log('[TL Package] Step 3: Generating LinkedIn posts');
                try {
                    const linkedinPrompt = `Generate 5 LinkedIn posts for this article:

**Article:**
${results.article.content}

**Daily Theme Framework:**
- **Monday (Insight Launch)**: Lead with the counterintuitive insight
- **Tuesday (Problem Spotlight)**: Highlight the pain point
- **Wednesday (Framework Reveal)**: Share the practical how-to
- **Thursday (Story/Example)**: Make it concrete with narrative
- **Friday (Call to Reflect)**: End with meaning

${pillarInfo?.hashtags ? `**Pillar hashtags:** ${pillarInfo.hashtags.join(', ')}` : ''}

Generate all 5 posts in JSON format:
{"posts": [{"day": "monday", "theme": "insight_launch", "content": "...", "hashtags": [...]}, ...]}`;

                    const linkedinResult = await executeAgent(TL_AGENTS.LINKEDIN_GENERATOR, {
                        userMessage: linkedinPrompt,
                        userId: userId,
                        conversationHistory: []
                    });

                    // Parse JSON
                    let posts = [];
                    try {
                        const jsonMatch = linkedinResult.response.match(/\{[\s\S]*"posts"[\s\S]*\}/);
                        if (jsonMatch) {
                            posts = JSON.parse(jsonMatch[0]).posts || [];
                        }
                    } catch (parseErr) {
                        console.warn('[TL Package] Could not parse LinkedIn posts as JSON');
                    }

                    results.linkedin_posts = {
                        posts: posts,
                        raw: posts.length === 0 ? linkedinResult.response : undefined,
                        execution_id: linkedinResult.execution_id,
                        tokens_used: linkedinResult.usage?.total_tokens
                    };
                } catch (linkedinErr) {
                    console.error('[TL Package] LinkedIn generation failed:', linkedinErr);
                    results.errors.push({ step: 'linkedin', error: linkedinErr.message });
                }
            }

            // STEP 4: Generate Header Image (only if article succeeded and image generation enabled)
            if (results.article && generate_image) {
                console.log(`[TL Package] Step 4: Generating ${image_style} header image`);
                try {
                    const imageResult = await tlImageService.generateArticleImage(results.article.content, {
                        style: image_style,
                        topic,
                        pillar: pillarInfo?.name,
                        thesis: profile?.core_thesis,
                        calendarEntryId: calendar_entry_id,
                        userId
                    });

                    results.header_image = {
                        url: imageResult.url,
                        prompt: imageResult.prompt,
                        revisedPrompt: imageResult.revisedPrompt,
                        style: imageResult.style,
                        styleName: imageResult.styleName,
                        generationTimeMs: imageResult.generationTimeMs
                    };
                } catch (imageErr) {
                    console.error('[TL Package] Image generation failed:', imageErr);
                    results.errors.push({ step: 'image', error: imageErr.message });
                }
            }

            const totalDuration = Date.now() - packageStartTime;

            // Save outputs if calendar_entry_id provided
            const savedOutputs = [];
            if (calendar_entry_id) {
                // Save article
                if (results.article) {
                    const { data } = await supabase
                        .from('thought_leadership_outputs')
                        .insert({
                            user_id: userId,
                            calendar_entry_id,
                            output_type: 'article_human',
                            title: topic,
                            content: results.article.content,
                            content_format: 'markdown',
                            is_current: true
                        })
                        .select('id')
                        .single();
                    if (data) savedOutputs.push({ type: 'article_human', id: data.id });
                }

                // Save AI article
                if (results.article_ai) {
                    const { data } = await supabase
                        .from('thought_leadership_outputs')
                        .insert({
                            user_id: userId,
                            calendar_entry_id,
                            output_type: 'article_ai',
                            title: `${topic} (AI-Optimized)`,
                            content: results.article_ai.content,
                            content_format: 'markdown',
                            is_current: true
                        })
                        .select('id')
                        .single();
                    if (data) savedOutputs.push({ type: 'article_ai', id: data.id });
                }

                // Save LinkedIn posts
                if (results.linkedin_posts) {
                    const { data } = await supabase
                        .from('thought_leadership_outputs')
                        .insert({
                            user_id: userId,
                            calendar_entry_id,
                            output_type: 'linkedin_series',
                            title: 'Weekly LinkedIn Series',
                            content: JSON.stringify(results.linkedin_posts.posts || results.linkedin_posts.raw),
                            content_format: 'json',
                            is_current: true
                        })
                        .select('id')
                        .single();
                    if (data) savedOutputs.push({ type: 'linkedin_series', id: data.id });
                }

                // Update calendar entry
                await supabase
                    .from('content_calendar_entries')
                    .update({
                        article_markdown: results.article?.content,
                        article_ai_optimized: results.article_ai?.content,
                        linkedin_posts: results.linkedin_posts?.posts || [],
                        status: 'review'
                    })
                    .eq('id', calendar_entry_id);
            }

            const totalSteps = generate_image ? 4 : 3;
            console.log(`[TL Package] Complete in ${totalDuration}ms with ${results.errors.length} errors`);

            res.json({
                success: results.errors.length === 0,
                package: {
                    article: results.article?.content,
                    article_ai_optimized: results.article_ai?.content,
                    linkedin_posts: results.linkedin_posts?.posts || null,
                    linkedin_raw: results.linkedin_posts?.raw,
                    header_image: results.header_image || null
                },
                metadata: {
                    topic,
                    format,
                    pillar: pillarInfo?.name,
                    image_style: generate_image ? image_style : null,
                    total_duration_ms: totalDuration,
                    steps_completed: totalSteps - results.errors.length,
                    saved_outputs: savedOutputs,
                    errors: results.errors.length > 0 ? results.errors : undefined
                }
            });
        } catch (err) {
            console.error('Error generating package:', err);
            res.status(500).json({ error: err.message });
        }
    });

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
            const userId = req.headers['x-user-id'];
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
            const userId = req.headers['x-user-id'];
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
            const userId = req.headers['x-user-id'];
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

    // ============================================================================
    // PUBLISHING & SCHEDULING ENDPOINTS
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
            const userId = req.headers['x-user-id'];
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
            const userId = req.headers['x-user-id'];
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
            const userId = req.headers['x-user-id'];
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
            const userId = req.headers['x-user-id'];
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
            const userId = req.headers['x-user-id'];
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

    // ============================================================================
    // OUTPUTS ENDPOINTS
    // ============================================================================

    /**
     * GET /api/thought-leadership/outputs
     * Get generated outputs
     */
    router.get('/outputs', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { calendar_entry_id, output_type, limit = 20 } = req.query;

            let query = supabase
                .from('thought_leadership_outputs')
                .select('*')
                .eq('user_id', userId)
                .eq('is_current', true)
                .order('created_at', { ascending: false })
                .limit(parseInt(limit));

            if (calendar_entry_id) {
                query = query.eq('calendar_entry_id', calendar_entry_id);
            }
            if (output_type) {
                query = query.eq('output_type', output_type);
            }

            const { data, error } = await query;
            if (error) throw error;

            res.json({ data: data || [] });
        } catch (err) {
            console.error('Error fetching outputs:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/outputs
     * Save a generated output
     */
    router.post('/outputs', async (req, res) => {
        try {
            const userId = req.headers['x-user-id'];
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const {
                calendar_entry_id,
                output_type,
                title,
                content,
                content_format,
                post_day,
                post_theme,
                model_used,
                tokens_used,
                context_assets_used,
                skill_used
            } = req.body;

            if (!output_type || !content) {
                return res.status(400).json({ error: 'output_type and content are required' });
            }

            // Mark previous versions as not current
            if (calendar_entry_id) {
                await supabase
                    .from('thought_leadership_outputs')
                    .update({ is_current: false })
                    .eq('calendar_entry_id', calendar_entry_id)
                    .eq('output_type', output_type)
                    .eq('user_id', userId);
            }

            const outputData = {
                id: uuidv4(),
                user_id: userId,
                calendar_entry_id,
                output_type,
                title,
                content,
                content_format: content_format || 'markdown',
                post_day,
                post_theme,
                model_used,
                tokens_used,
                context_assets_used,
                skill_used,
                version: 1,
                is_current: true
            };

            const { data, error } = await supabase
                .from('thought_leadership_outputs')
                .insert(outputData)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (err) {
            console.error('Error saving output:', err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
