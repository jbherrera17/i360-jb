/**
 * Thought Leadership — Content Calendar.
 *
 * Module-access gating is applied by the coordinator (see ./index.js).
 */

const express = require('express');
const { randomUUID: uuidv4 } = require('crypto');
const notionService = require('../../services/notionService');

module.exports = function (supabase) {
    const router = express.Router();

    // ============================================================================
    // CONTENT CALENDAR ENDPOINTS
    // ============================================================================

    /**
     * GET /api/thought-leadership/calendar
     * Get calendar entries (from Notion or local cache)
     */
    router.get('/calendar', async (req, res) => {
        try {
            const userId = req.userId;
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
            const userId = req.userId;
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
            const userId = req.userId;
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
            const userId = req.userId;
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
            const userId = req.userId;
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
            const userId = req.userId;
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


    return router;
};
