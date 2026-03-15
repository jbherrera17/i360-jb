/**
 * Conversation Review Routes (Authenticated)
 * Phase 73: Embeddable Chat Widgets
 *
 * Widget conversation review, search, export, and knowledge feedback loop.
 */

const express = require('express');
const createModuleAccessMiddleware = require('../middleware/moduleAccess');
const logger = require('../services/logger');

module.exports = function (supabase) {
    const router = express.Router();
    const { requireModule } = createModuleAccessMiddleware(supabase);

    router.use(requireModule('embeddable_chat'));

    // ── LIST WIDGET CONVERSATIONS ────────────────────────────

    router.get('/', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.user?.org_id;
            if (!orgId) return res.status(400).json({ error: 'org_id required' });

            let query = supabase
                .from('support_conversations')
                .select('*')
                .eq('org_id', orgId)
                .eq('channel', 'widget')
                .order('created_at', { ascending: false });

            // Filters
            if (req.query.status) query = query.eq('status', req.query.status);
            if (req.query.sentiment) query = query.eq('sentiment', req.query.sentiment);
            if (req.query.widget_id) {
                query = query.contains('metadata', { widget_id: req.query.widget_id });
            }
            if (req.query.date_from) query = query.gte('created_at', req.query.date_from);
            if (req.query.date_to) query = query.lte('created_at', req.query.date_to);

            const limit = Math.min(parseInt(req.query.limit) || 50, 200);
            const offset = parseInt(req.query.offset) || 0;
            query = query.range(offset, offset + limit - 1);

            const { data, error, count } = await query;
            if (error) throw error;

            res.json({ data: data || [], total: count, limit, offset });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── SEARCH CONVERSATIONS ─────────────────────────────────

    router.get('/search', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.user?.org_id;
            if (!orgId) return res.status(400).json({ error: 'org_id required' });

            const query = req.query.q;
            if (!query || query.length < 2) {
                return res.status(400).json({ error: 'Search query must be at least 2 characters' });
            }

            const searchTerm = `%${query}%`;

            // Search in message content
            const { data: messageMatches } = await supabase
                .from('support_messages')
                .select('conversation_id, content, role, seq')
                .ilike('content', searchTerm)
                .limit(100);

            if (!messageMatches || messageMatches.length === 0) {
                return res.json({ data: [], total: 0 });
            }

            // Get unique conversation IDs
            const convIds = [...new Set(messageMatches.map(m => m.conversation_id))];

            // Fetch those conversations (only widget ones)
            const { data: conversations } = await supabase
                .from('support_conversations')
                .select('*')
                .eq('org_id', orgId)
                .eq('channel', 'widget')
                .in('id', convIds.slice(0, 50))
                .order('created_at', { ascending: false });

            // Attach matching snippets
            const results = (conversations || []).map(conv => ({
                ...conv,
                matching_messages: messageMatches
                    .filter(m => m.conversation_id === conv.id)
                    .slice(0, 3)
                    .map(m => ({
                        role: m.role,
                        content: m.content.substring(0, 200),
                        seq: m.seq
                    }))
            }));

            res.json({ data: results, total: results.length, query });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── GET CONVERSATION WITH MESSAGES ────────────────────────

    router.get('/:id', async (req, res) => {
        try {
            const { data: conversation } = await supabase
                .from('support_conversations')
                .select('*')
                .eq('id', req.params.id)
                .single();

            if (!conversation) return res.status(404).json({ error: 'Not found' });

            const { data: messages } = await supabase
                .from('support_messages')
                .select('*')
                .eq('conversation_id', req.params.id)
                .order('seq', { ascending: true });

            res.json({
                conversation,
                messages: messages || []
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── EXPORT CONVERSATIONS (CSV) ───────────────────────────

    router.get('/export/csv', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.user?.org_id;
            if (!orgId) return res.status(400).json({ error: 'org_id required' });

            let query = supabase
                .from('support_conversations')
                .select('*')
                .eq('org_id', orgId)
                .eq('channel', 'widget')
                .order('created_at', { ascending: false })
                .limit(1000);

            if (req.query.date_from) query = query.gte('created_at', req.query.date_from);
            if (req.query.date_to) query = query.lte('created_at', req.query.date_to);

            const { data: conversations } = await query;
            if (!conversations || conversations.length === 0) {
                return res.status(404).json({ error: 'No conversations found' });
            }

            // Build CSV
            const headers = ['Date', 'Customer', 'Email', 'Subject', 'Status', 'Sentiment', 'Messages', 'Widget'];
            const rows = conversations.map(c => [
                new Date(c.created_at).toISOString(),
                c.customer_name || 'Anonymous',
                c.customer_email || '',
                (c.subject || '').replace(/,/g, ';'),
                c.status || '',
                c.sentiment || '',
                c.message_count || 0,
                c.metadata?.widget_id || ''
            ]);

            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="widget-conversations-${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csv);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── EXPORT CONVERSATIONS (JSON) ──────────────────────────

    router.get('/export/json', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.user?.org_id;
            if (!orgId) return res.status(400).json({ error: 'org_id required' });

            let query = supabase
                .from('support_conversations')
                .select('*')
                .eq('org_id', orgId)
                .eq('channel', 'widget')
                .order('created_at', { ascending: false })
                .limit(500);

            if (req.query.date_from) query = query.gte('created_at', req.query.date_from);
            if (req.query.date_to) query = query.lte('created_at', req.query.date_to);

            const { data: conversations } = await query;

            // Fetch messages for each conversation
            const withMessages = await Promise.all(
                (conversations || []).map(async (conv) => {
                    const { data: messages } = await supabase
                        .from('support_messages')
                        .select('role, content, seq, created_at')
                        .eq('conversation_id', conv.id)
                        .order('seq', { ascending: true });
                    return { ...conv, messages: messages || [] };
                })
            );

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="widget-conversations-${new Date().toISOString().split('T')[0]}.json"`);
            res.json({ data: withMessages, exported_at: new Date().toISOString() });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── EXPORT TO CONTEXT ASSET ──────────────────────────────
    // Knowledge feedback loop: conversations → context asset → Annie gets smarter

    router.post('/export-to-asset', async (req, res) => {
        try {
            const orgId = req.headers['x-org-id'] || req.user?.org_id;
            if (!orgId) return res.status(400).json({ error: 'org_id required' });

            const { conversation_ids, asset_name, asset_id } = req.body;

            if (!conversation_ids || conversation_ids.length === 0) {
                return res.status(400).json({ error: 'conversation_ids required' });
            }

            // Fetch conversations and messages
            const conversations = [];
            for (const convId of conversation_ids.slice(0, 50)) {
                const { data: conv } = await supabase
                    .from('support_conversations')
                    .select('*')
                    .eq('id', convId)
                    .eq('org_id', orgId)
                    .single();

                if (!conv) continue;

                const { data: messages } = await supabase
                    .from('support_messages')
                    .select('role, content, seq')
                    .eq('conversation_id', convId)
                    .order('seq', { ascending: true });

                conversations.push({ ...conv, messages: messages || [] });
            }

            if (conversations.length === 0) {
                return res.status(404).json({ error: 'No valid conversations found' });
            }

            // Format as knowledge base content
            const sections = [];
            sections.push(`# Widget Conversation Insights`);
            sections.push(`Exported: ${new Date().toISOString()}`);
            sections.push(`Conversations: ${conversations.length}`);
            sections.push('');

            for (const conv of conversations) {
                const date = new Date(conv.created_at).toLocaleDateString();
                sections.push(`## Conversation — ${date}`);
                if (conv.subject) sections.push(`**Topic:** ${conv.subject}`);
                sections.push('');

                for (const msg of conv.messages) {
                    const role = msg.role === 'user' ? 'Visitor' : 'Assistant';
                    sections.push(`**${role}:** ${msg.content}`);
                    sections.push('');
                }
                sections.push('---');
                sections.push('');
            }

            const contentText = sections.join('\n');

            if (asset_id) {
                // Update existing asset
                const { data, error } = await supabase
                    .from('context_assets')
                    .update({
                        content_text: contentText,
                        metadata: {
                            source: 'conversation_export',
                            conversation_count: conversations.length,
                            exported_at: new Date().toISOString()
                        }
                    })
                    .eq('id', asset_id)
                    .eq('org_id', orgId)
                    .select()
                    .single();

                if (error) throw error;
                res.json({ success: true, asset: data, action: 'updated' });
            } else {
                // Create new asset
                const name = asset_name || `Widget Insights (${new Date().toLocaleDateString()})`;
                const { data, error } = await supabase
                    .from('context_assets')
                    .insert({
                        org_id: orgId,
                        name,
                        description: `Exported from ${conversations.length} widget conversation(s)`,
                        type: 'reference_data',
                        content_text: contentText,
                        metadata: {
                            source: 'conversation_export',
                            conversation_count: conversations.length,
                            exported_at: new Date().toISOString()
                        }
                    })
                    .select()
                    .single();

                if (error) throw error;
                res.json({ success: true, asset: data, action: 'created' });
            }
        } catch (error) {
            logger.error('[ConversationReview] Export to asset failed', { error: error.message });
            res.status(500).json({ error: error.message });
        }
    });

    // ── ADD INTERNAL NOTE ────────────────────────────────────

    router.post('/:id/notes', async (req, res) => {
        try {
            const { note } = req.body;
            if (!note) return res.status(400).json({ error: 'note required' });

            // Store as a system message in the conversation
            const { data: seqData } = await supabase.rpc('next_support_message_seq', {
                p_conversation_id: req.params.id
            });

            const { data, error } = await supabase
                .from('support_messages')
                .insert({
                    conversation_id: req.params.id,
                    seq: seqData || 999,
                    role: 'system',
                    content: note,
                    metadata: {
                        type: 'internal_note',
                        author: req.user?.email || 'admin',
                        created_at: new Date().toISOString()
                    }
                })
                .select()
                .single();

            if (error) throw error;
            res.status(201).json({ data });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
