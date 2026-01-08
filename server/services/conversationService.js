/**
 * Conversation Service - Insight 360
 * Handles conversation and message persistence
 * Version: 1.0.0
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * Create a new conversation
 * @param {object} data - Conversation data
 * @returns {object} Created conversation
 */
async function createConversation(data = {}) {
    const {
        title = 'New Conversation',
        model = 'claude-sonnet-4-5-20250929',
        userId = null
    } = data;

    const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
            title,
            model,
            user_id: userId
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating conversation:', error);
        throw new Error(`Failed to create conversation: ${error.message}`);
    }

    return conversation;
}

/**
 * Get all conversations (most recent first)
 * @param {object} options - Query options
 * @returns {array} List of conversations
 */
async function getConversations(options = {}) {
    const {
        limit = 50,
        offset = 0,
        userId = null
    } = options;

    let query = supabase
        .from('conversations')
        .select(`
            id,
            title,
            model,
            metadata,
            created_at,
            updated_at
        `)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

    // Filter by user_id if provided
    if (userId) {
        query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching conversations:', error);
        throw new Error(`Failed to fetch conversations: ${error.message}`);
    }

    return data || [];
}

/**
 * Get a single conversation with its messages
 * @param {string} conversationId - Conversation UUID
 * @param {string} userId - User ID for ownership verification (optional)
 * @returns {object} Conversation with messages
 */
async function getConversation(conversationId, userId = null) {
    // Get conversation
    let query = supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId);

    // Verify ownership if userId provided
    if (userId) {
        query = query.eq('user_id', userId);
    }

    const { data: conversation, error: convError } = await query.single();

    if (convError) {
        if (convError.code === 'PGRST116') {
            return null; // Not found or not owned by user
        }
        throw new Error(`Failed to fetch conversation: ${convError.message}`);
    }

    // Get messages
    const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (msgError) {
        throw new Error(`Failed to fetch messages: ${msgError.message}`);
    }

    return {
        ...conversation,
        messages: messages || []
    };
}

/**
 * Update a conversation
 * @param {string} conversationId - Conversation UUID
 * @param {object} updates - Fields to update
 * @returns {object} Updated conversation
 */
async function updateConversation(conversationId, updates) {
    const allowedFields = ['title', 'model'];
    const filteredUpdates = {};

    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            filteredUpdates[field] = updates[field];
        }
    }

    // Also update updated_at
    filteredUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
        .from('conversations')
        .update(filteredUpdates)
        .eq('id', conversationId)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update conversation: ${error.message}`);
    }

    return data;
}

/**
 * Delete a conversation and its messages
 * @param {string} conversationId - Conversation UUID
 * @returns {boolean} Success status
 */
async function deleteConversation(conversationId) {
    // Messages are deleted via CASCADE
    const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

    if (error) {
        throw new Error(`Failed to delete conversation: ${error.message}`);
    }

    return true;
}

/**
 * Add a message to a conversation
 * @param {string} conversationId - Conversation UUID
 * @param {object} message - Message data
 * @returns {object} Created message
 */
async function addMessage(conversationId, message) {
    const {
        role,
        content,
        model = null
    } = message;

    if (!role || !content) {
        throw new Error('Message role and content are required');
    }

    const { data, error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            role,
            content,
            model
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to add message: ${error.message}`);
    }

    // Update conversation's updated_at timestamp
    await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    return data;
}

/**
 * Get messages for a conversation
 * @param {string} conversationId - Conversation UUID
 * @param {object} options - Query options
 * @returns {array} List of messages
 */
async function getMessages(conversationId, options = {}) {
    const { limit = 100, offset = 0 } = options;

    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

    if (error) {
        throw new Error(`Failed to fetch messages: ${error.message}`);
    }

    return data || [];
}

/**
 * Generate a title for a conversation based on first message
 * @param {string} firstMessage - First user message
 * @returns {string} Generated title
 */
function generateTitle(firstMessage) {
    if (!firstMessage) return 'New Conversation';

    // Take first 50 chars, cut at word boundary
    let title = firstMessage.substring(0, 60);
    if (firstMessage.length > 60) {
        const lastSpace = title.lastIndexOf(' ');
        if (lastSpace > 30) {
            title = title.substring(0, lastSpace);
        }
        title += '...';
    }

    return title;
}

module.exports = {
    createConversation,
    getConversations,
    getConversation,
    updateConversation,
    deleteConversation,
    addMessage,
    getMessages,
    generateTitle
};
