/**
 * Digest Routes - Insight 360
 * Phase 66: AI Digest - Content aggregation and intelligent summarization
 * Version: 1.0.0
 */

const express = require('express');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

module.exports = function (supabase) {
    const router = express.Router();
    const digestSourceService = require('../services/digestSourceService');
    const digestPipeline = require('../services/digestPipeline');

    // ============================================
    // SOURCE MANAGEMENT
    // ============================================

    /** GET /api/digest/sources - List sources for org */
    router.get('/sources', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            const filters = {
                source_type: req.query.source_type,
                is_enabled: req.query.is_enabled !== undefined ? req.query.is_enabled === 'true' : undefined
            };
            const data = await digestSourceService.listSources(orgId, filters);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /** POST /api/digest/sources - Create a new source */
    router.post('/sources', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            const userId = req.userId || null;
            const data = await digestSourceService.createSource(orgId, userId, req.body);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /** GET /api/digest/sources/:id - Get single source */
    router.get('/sources/:id', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            const data = await digestSourceService.getSource(orgId, req.params.id);
            if (!data) return res.status(404).json({ success: false, error: 'Source not found' });
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /** PUT /api/digest/sources/:id - Update source */
    router.put('/sources/:id', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            const data = await digestSourceService.updateSource(orgId, req.params.id, req.body);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /** DELETE /api/digest/sources/:id - Delete source */
    router.delete('/sources/:id', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            await digestSourceService.deleteSource(orgId, req.params.id);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /** POST /api/digest/sources/:id/fetch - Trigger fetch from source */
    router.post('/sources/:id/fetch', async (req, res) => {
        try {
            const result = await digestSourceService.fetchSource(req.params.id);
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /** POST /api/digest/sources/upload - Upload document source */
    router.post('/sources/upload', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' });
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            const userId = req.userId || null;

            // Create or find the document source
            let sourceId = req.body.source_id;
            if (!sourceId) {
                const source = await digestSourceService.createSource(orgId, userId, {
                    name: req.body.name || req.file.originalname,
                    source_type: 'document',
                    config: { filename: req.file.originalname }
                });
                sourceId = source.id;
            }

            // Process the uploaded file through document fetcher
            const documentFetcher = require('../services/digestFetchers/documentFetcher');
            const items = await documentFetcher.processUpload(req.file, { orgId, sourceId });

            // Store items
            if (items && items.length > 0) {
                const source = await digestSourceService.getSource(orgId, sourceId);
                await digestSourceService.storeItems(source, items);
            }

            res.json({ success: true, data: { source_id: sourceId, items_count: items ? items.length : 0 } });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /** POST /api/digest/sources/:id/newsletter - Paste newsletter content */
    router.post('/sources/:id/newsletter', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            const { subject, sender, content } = req.body;
            if (!content) return res.status(400).json({ success: false, error: 'Content is required' });

            const data = await digestSourceService.addManualItem(orgId, req.params.id, {
                title: subject || 'Newsletter',
                author: sender || null,
                raw_content: content,
                external_id: `newsletter-${Date.now()}`
            });
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================
    // SOURCE ITEMS
    // ============================================

    /** GET /api/digest/items - List items with optional filters */
    router.get('/items', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            const options = {
                source_id: req.query.source_id,
                status: req.query.status,
                limit: parseInt(req.query.limit) || 50,
                offset: parseInt(req.query.offset) || 0
            };
            const data = await digestSourceService.listItems(orgId, options);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /** POST /api/digest/items/:id/summarize - Summarize a single item */
    router.post('/items/:id/summarize', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            const item = await digestSourceService.getItem(orgId, req.params.id);
            if (!item) return res.status(404).json({ success: false, error: 'Item not found' });

            const options = {
                orgId,
                processing_mode: req.body.processing_mode || 'ai_summary',
                summary_depth: req.body.summary_depth || 'brief',
                agent_id: req.body.agent_id,
                context_asset_ids: req.body.context_asset_ids
            };
            const result = await digestPipeline.summarizeItem(item, options);
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================
    // HEALTH
    // ============================================

    /** GET /api/digest/health - Source health overview */
    router.get('/health', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            const data = await digestSourceService.getSourceHealth(orgId);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================
    // SHARED DATA (proxy to other services)
    // ============================================

    /** GET /api/digest/agents - Available agents for digest processing */
    router.get('/agents', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            let query = supabase.from('agents').select('id, name, description, type, model').eq('is_active', true);
            if (orgId) query = query.or(`org_id.eq.${orgId},org_id.is.null`);
            const { data, error } = await query.order('name');
            if (error) throw error;
            res.json({ success: true, data: data || [] });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /** GET /api/digest/context-assets - Available context assets */
    router.get('/context-assets', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            let query = supabase.from('context_assets').select('id, name, type, description').eq('is_active', true);
            if (orgId) query = query.or(`org_id.eq.${orgId},org_id.is.null`);
            const { data, error } = await query.order('name');
            if (error) throw error;
            res.json({ success: true, data: data || [] });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================
    // DIGEST CONFIGS & SECTIONS
    // ============================================

    /** GET /api/digest/configs - List user's digest configs */
    router.get('/configs', async (req, res) => {
        try {
            const userId = req.userId || null;
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            let query = supabase.from('digest_configs').select('*').eq('is_enabled', true);
            if (userId) query = query.eq('user_id', userId);
            if (orgId) query = query.eq('org_id', orgId);
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            res.json({ success: true, data: data || [] });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /** POST /api/digest/configs - Create digest config */
    router.post('/configs', async (req, res) => {
        try {
            const userId = req.userId || null;
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            const { data, error } = await supabase.from('digest_configs')
                .insert({ ...req.body, user_id: userId, org_id: orgId })
                .select()
                .single();
            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /** PUT /api/digest/configs/:id - Update digest config */
    router.put('/configs/:id', async (req, res) => {
        try {
            const { data, error } = await supabase.from('digest_configs')
                .update(req.body)
                .eq('id', req.params.id)
                .select()
                .single();
            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /** POST /api/digest/configs/:id/sections - Add section to config */
    router.post('/configs/:id/sections', async (req, res) => {
        try {
            const { data, error } = await supabase.from('digest_sections')
                .insert({ ...req.body, config_id: req.params.id })
                .select()
                .single();
            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /** PUT /api/digest/sections/:id - Update section */
    router.put('/sections/:id', async (req, res) => {
        try {
            const { data, error } = await supabase.from('digest_sections')
                .update(req.body)
                .eq('id', req.params.id)
                .select()
                .single();
            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /** DELETE /api/digest/sections/:id - Delete section */
    router.delete('/sections/:id', async (req, res) => {
        try {
            const { error } = await supabase.from('digest_sections')
                .delete()
                .eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ============================================
    // DIGEST RETRIEVAL & GENERATION
    // ============================================

    /** GET /api/digest/latest - Get most recent digest */
    router.get('/latest', async (req, res) => {
        try {
            const userId = req.userId || null;
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            let query = supabase.from('digests').select('*').eq('status', 'completed').order('date', { ascending: false }).limit(1);
            if (userId) query = query.eq('user_id', userId);
            if (orgId) query = query.eq('org_id', orgId);
            const { data, error } = await query;
            if (error) throw error;
            res.json({ success: true, data: data && data.length > 0 ? data[0] : null });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /** GET /api/digest/history - Digest history with pagination */
    router.get('/history', async (req, res) => {
        try {
            const userId = req.userId || null;
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;
            let query = supabase.from('digests').select('id, config_id, date, status, total_items_processed, total_tokens_used, created_at');
            if (userId) query = query.eq('user_id', userId);
            if (orgId) query = query.eq('org_id', orgId);
            const { data, error } = await query.order('date', { ascending: false }).range(offset, offset + limit - 1);
            if (error) throw error;
            res.json({ success: true, data: data || [] });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /** GET /api/digest/:id - Get specific digest */
    router.get('/:id', async (req, res) => {
        try {
            const { data, error } = await supabase.from('digests')
                .select('*')
                .eq('id', req.params.id)
                .single();
            if (error) throw error;
            if (!data) return res.status(404).json({ success: false, error: 'Digest not found' });
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /** GET /api/digest/search - Full-text search across digest content */
    router.get('/search', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.orgId || null;
            const { q, type, from, to } = req.query;
            if (!q) return res.status(400).json({ success: false, error: 'Query parameter q is required' });
            const filters = { type, from, to };
            const data = await digestPipeline.searchDigest(orgId, q, filters);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /** GET /api/digest/generate/stream - Generate digest with SSE streaming */
    router.get('/generate/stream', async (req, res) => {
        const configId = req.query.config_id;
        if (!configId) return res.status(400).json({ success: false, error: 'config_id is required' });

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        let clientDisconnected = false;
        req.on('close', () => { clientDisconnected = true; });

        try {
            const callbacks = {
                onSectionStart: (section, index) => {
                    if (!clientDisconnected) {
                        res.write(`event: section_start\ndata: ${JSON.stringify({ name: section.name, index })}\n\n`);
                    }
                },
                onSectionComplete: (section, index, result) => {
                    if (!clientDisconnected) {
                        res.write(`event: section_complete\ndata: ${JSON.stringify({
                            name: section.name,
                            index,
                            items_processed: result.items_processed || 0,
                            tokens_used: result.tokens_used || 0
                        })}\n\n`);
                    }
                }
            };

            const digest = await digestPipeline.generateDigest(configId, callbacks);

            if (!clientDisconnected) {
                res.write(`event: complete\ndata: ${JSON.stringify({ digest_id: digest.id, status: digest.status })}\n\n`);
                res.end();
            }
        } catch (error) {
            if (!clientDisconnected) {
                res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
                res.end();
            }
        }
    });

    return router;
};
