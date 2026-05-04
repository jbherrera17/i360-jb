/**
 * Conversations Routes - Insight 360
 * API endpoints for conversation management
 * Version: 1.1.1 - Fixed route ordering for admin endpoints
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const conversationService = require('../services/conversationService');
const { getUserId } = require('../utils/auth');
const { requireOrgContext } = require('../middleware/orgContext');
const { getVerifiedOrgId } = require('../utils/orgScope');

// Initialize Supabase client for org context validation
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// Validate org membership on all routes
router.use(requireOrgContext(supabase));

// ============================================
// ADMIN ENDPOINTS (must be before /:id routes)
// ============================================

/**
 * GET /api/conversations/admin/all
 * List all conversations with user info (admin only)
 */
router.get('/admin/all', async (req, res) => {
    try {
        const {
            limit = 100,
            offset = 0,
            department_id,
            business_role,
            user_id,
            search
        } = req.query;

        // Enforce org scoping — use verified org from middleware/headers, not raw query param
        const orgId = getVerifiedOrgId(req);
        if (!orgId && !req.isPlatformAdmin) {
            return res.status(400).json({
                success: false,
                error: 'Organization context required. Include x-org-id header.',
                code: 'ORG_CONTEXT_REQUIRED'
            });
        }

        const conversations = await conversationService.getAdminConversations({
            limit: parseInt(limit),
            offset: parseInt(offset),
            departmentId: department_id,
            businessRole: business_role,
            userId: user_id,
            orgId: orgId,
            search
        });

        res.json({
            success: true,
            data: conversations,
            count: conversations.length
        });
    } catch (error) {
        console.error('Error fetching admin conversations:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/conversations/admin/stats
 * Get conversation statistics by department and role
 */
router.get('/admin/stats', async (req, res) => {
    try {
        // Enforce org scoping for stats
        const orgId = getVerifiedOrgId(req);
        if (!orgId && !req.isPlatformAdmin) {
            return res.status(400).json({
                success: false,
                error: 'Organization context required. Include x-org-id header.',
                code: 'ORG_CONTEXT_REQUIRED'
            });
        }

        const stats = await conversationService.getConversationStats({ orgId });

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching conversation stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/conversations/admin/:id
 * Get a specific conversation with messages (admin - bypasses ownership)
 */
router.get('/admin/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const conversation = await conversationService.getAdminConversation(id);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        // Verify org ownership (unless platform admin)
        if (!req.isPlatformAdmin) {
            const orgId = getVerifiedOrgId(req);
            if (orgId && conversation.org_id && conversation.org_id !== orgId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: conversation belongs to a different organization',
                    code: 'ORG_ACCESS_DENIED'
                });
            }
            // Also check via user's org membership if conversation has user_id but no org_id
            if (orgId && conversation.user_id && !conversation.org_id) {
                const userOrgId = await conversationService.getUserOrgId(conversation.user_id);
                if (userOrgId && userOrgId !== orgId) {
                    return res.status(403).json({
                        success: false,
                        error: 'Access denied: conversation belongs to a different organization',
                        code: 'ORG_ACCESS_DENIED'
                    });
                }
            }
        }

        res.json({
            success: true,
            data: conversation
        });
    } catch (error) {
        console.error('Error fetching admin conversation:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/conversations/admin/:id
 * Delete a conversation (admin)
 */
router.delete('/admin/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await conversationService.deleteConversation(id);

        res.json({
            success: true,
            message: 'Conversation deleted'
        });
    } catch (error) {
        console.error('Error deleting admin conversation:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// USER ENDPOINTS
// ============================================

/**
 * POST /api/conversations/bulk
 * Bulk operations on conversations (star, archive, delete)
 */
router.post('/bulk', async (req, res) => {
    try {
        const { action, conversationIds } = req.body;
        const userId = getUserId(req);

        if (!action || !Array.isArray(conversationIds) || conversationIds.length === 0) {
            return res.status(400).json({ success: false, error: 'action and conversationIds[] required' });
        }

        let results = [];
        for (const id of conversationIds) {
            try {
                switch (action) {
                    case 'star':
                        await conversationService.updateConversation(id, { is_starred: true });
                        break;
                    case 'unstar':
                        await conversationService.updateConversation(id, { is_starred: false });
                        break;
                    case 'archive':
                        await conversationService.updateConversation(id, { is_archived: true });
                        break;
                    case 'unarchive':
                        await conversationService.updateConversation(id, { is_archived: false });
                        break;
                    case 'delete':
                        await conversationService.deleteConversation(id);
                        break;
                    default:
                        return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
                }
                results.push({ id, success: true });
            } catch (err) {
                results.push({ id, success: false, error: err.message });
            }
        }

        res.json({ success: true, results });
    } catch (error) {
        console.error('Error in bulk operation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/conversations/export/:id
 * Export a conversation with messages in specified format
 */
router.get('/export/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { format = 'json' } = req.query;
        const userId = getUserId(req);

        const conversation = await conversationService.getConversation(id, userId);
        if (!conversation) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }

        if (format === 'markdown') {
            const md = conversationService.exportAsMarkdown(conversation);
            res.setHeader('Content-Type', 'text/markdown');
            res.setHeader('Content-Disposition', `attachment; filename="${conversation.title.replace(/[^a-z0-9]/gi, '_')}.md"`);
            return res.send(md);
        }

        // Default: JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${conversation.title.replace(/[^a-z0-9]/gi, '_')}.json"`);
        res.json({
            title: conversation.title,
            model: conversation.model,
            created_at: conversation.created_at,
            updated_at: conversation.updated_at,
            messages: conversation.messages.map(m => ({
                role: m.role,
                content: m.content,
                model: m.model,
                created_at: m.created_at
            }))
        });
    } catch (error) {
        console.error('Error exporting conversation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/conversations/user-org
 * Get the current user's organization ID for org filtering
 */
router.get('/user-org', async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.json({ success: true, org_id: null });
        }
        const orgId = await conversationService.getUserOrgId(userId);
        res.json({ success: true, org_id: orgId });
    } catch (error) {
        console.error('Error getting user org:', error);
        res.json({ success: true, org_id: null });
    }
});

/**
 * GET /api/conversations
 * List all conversations for the current user (or org-wide with org_id param)
 */
router.get('/', async (req, res) => {
    try {
        const { limit = 50, offset = 0, includeArchived, starredOnly, archivedOnly, search, org_id } = req.query;
        const userId = getUserId(req);

        const conversations = await conversationService.getConversations({
            limit: parseInt(limit),
            offset: parseInt(offset),
            includeArchived: includeArchived === 'true',
            starredOnly: starredOnly === 'true',
            archivedOnly: archivedOnly === 'true',
            search: search || null,
            userId,
            orgId: org_id || null
        });

        res.json({
            success: true,
            conversations,
            count: conversations.length
        });
    } catch (error) {
        console.error('Error listing conversations:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/conversations
 * Create a new conversation for the current user
 */
router.post('/', async (req, res) => {
    try {
        const { title, model, systemPrompt, metadata } = req.body;
        const userId = getUserId(req);

        const conversation = await conversationService.createConversation({
            title,
            model,
            systemPrompt,
            metadata,
            userId
        });

        res.status(201).json({
            success: true,
            conversation
        });
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/conversations/:id
 * Get a conversation with its messages (user must own it)
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getUserId(req);

        const conversation = await conversationService.getConversation(id, userId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        res.json({
            success: true,
            conversation
        });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/conversations/:id
 * Update a conversation
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const conversation = await conversationService.updateConversation(id, updates);

        res.json({
            success: true,
            conversation
        });
    } catch (error) {
        console.error('Error updating conversation:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/conversations/:id
 * Delete a conversation
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await conversationService.deleteConversation(id);

        res.json({
            success: true,
            message: 'Conversation deleted'
        });
    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/conversations/:id/messages
 * Get messages for a conversation
 */
router.get('/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 100, offset = 0 } = req.query;

        const messages = await conversationService.getMessages(id, {
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            messages,
            count: messages.length
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/conversations/:id/messages
 * Add a message to a conversation
 */
router.post('/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;
        const { role, content, model, tokensUsed, metadata } = req.body;

        if (!role || !content) {
            return res.status(400).json({
                success: false,
                error: 'Message role and content are required'
            });
        }

        const message = await conversationService.addMessage(id, {
            role,
            content,
            model,
            tokensUsed,
            metadata
        });

        // Auto-generate title on first user message
        if (role === 'user') {
            const conversation = await conversationService.getConversation(id);
            const userMessages = conversation.messages.filter(m => m.role === 'user');

            if (userMessages.length === 1) {
                // This is the first user message, generate title
                const title = conversationService.generateTitle(content);
                await conversationService.updateConversation(id, { title });
            }
        }

        res.status(201).json({
            success: true,
            message
        });
    } catch (error) {
        console.error('Error adding message:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
