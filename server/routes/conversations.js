/**
 * Conversations Routes - Insight 360
 * API endpoints for conversation management
 * Version: 1.0.0
 */

const express = require('express');
const router = express.Router();
const conversationService = require('../services/conversationService');

/**
 * GET /api/conversations
 * List all conversations
 */
router.get('/', async (req, res) => {
    try {
        const { limit = 50, offset = 0, includeArchived = false } = req.query;

        const conversations = await conversationService.getConversations({
            limit: parseInt(limit),
            offset: parseInt(offset),
            includeArchived: includeArchived === 'true'
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
 * Create a new conversation
 */
router.post('/', async (req, res) => {
    try {
        const { title, model, systemPrompt, metadata } = req.body;

        const conversation = await conversationService.createConversation({
            title,
            model,
            systemPrompt,
            metadata
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
 * Get a conversation with its messages
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const conversation = await conversationService.getConversation(id);

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
