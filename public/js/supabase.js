/**
 * Insight 360 - Supabase Client
 * Handles database operations for conversation persistence
 */

// Supabase configuration (loaded from meta tags or defaults)
const SUPABASE_URL = document.querySelector('meta[name="supabase-url"]')?.content || '';
const SUPABASE_ANON_KEY = document.querySelector('meta[name="supabase-anon-key"]')?.content || '';

// State
let supabaseClient = null;
let currentUser = null;
let isInitialized = false;

/**
 * Initialize Supabase client
 */
async function initSupabase() {
    if (isInitialized) return supabaseClient;
    
    // Check if Supabase is configured
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.log('Supabase not configured - using local storage fallback');
        isInitialized = true;
        return null;
    }
    
    try {
        // Load Supabase library dynamically if not present
        if (typeof supabase === 'undefined') {
            await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
        }
        
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Check for existing session
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
        }
        
        // Listen for auth changes
        supabaseClient.auth.onAuthStateChange((event, session) => {
            currentUser = session?.user || null;
            if (event === 'SIGNED_IN') {
                loadConversations();
            } else if (event === 'SIGNED_OUT') {
                clearConversationList();
            }
        });
        
        isInitialized = true;
        console.log('✓ Supabase initialized');
        return supabaseClient;
    } catch (error) {
        console.error('Supabase initialization error:', error);
        isInitialized = true;
        return null;
    }
}

/**
 * Load script dynamically
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return currentUser !== null;
}

/**
 * Get current user ID (or generate anonymous ID for local storage)
 */
function getUserId() {
    if (currentUser) {
        return currentUser.id;
    }
    // Anonymous user - use localStorage ID
    let anonId = localStorage.getItem('insight360_anon_id');
    if (!anonId) {
        anonId = 'anon_' + crypto.randomUUID();
        localStorage.setItem('insight360_anon_id', anonId);
    }
    return anonId;
}

// ============================================
// CONVERSATION OPERATIONS
// ============================================

/**
 * Load all conversations for current user
 */
async function loadConversations() {
    const userId = getUserId();
    
    // Try Supabase first
    if (supabaseClient && currentUser) {
        try {
            const { data, error } = await supabaseClient
                .from('conversations')
                .select('id, title, model, updated_at')
                .eq('user_id', userId)
                .eq('is_archived', false)
                .order('updated_at', { ascending: false })
                .limit(50);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Failed to load conversations from Supabase:', error);
        }
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem(`insight360_conversations_${userId}`);
    return stored ? JSON.parse(stored) : [];
}

/**
 * Create a new conversation
 */
async function createConversation(title = 'New Conversation', model = 'claude-sonnet-4-5-20250929') {
    const userId = getUserId();
    const conversation = {
        id: crypto.randomUUID(),
        user_id: userId,
        title,
        model,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    // Try Supabase first
    if (supabaseClient && currentUser) {
        try {
            const { data, error } = await supabaseClient
                .from('conversations')
                .insert(conversation)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Failed to create conversation in Supabase:', error);
        }
    }
    
    // Fallback to localStorage
    const conversations = await loadConversations();
    conversations.unshift(conversation);
    localStorage.setItem(`insight360_conversations_${userId}`, JSON.stringify(conversations));
    
    return conversation;
}

/**
 * Update conversation (title, model, etc.)
 */
async function updateConversation(conversationId, updates) {
    const userId = getUserId();
    updates.updated_at = new Date().toISOString();
    
    // Try Supabase first
    if (supabaseClient && currentUser) {
        try {
            const { data, error } = await supabaseClient
                .from('conversations')
                .update(updates)
                .eq('id', conversationId)
                .eq('user_id', userId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Failed to update conversation in Supabase:', error);
        }
    }
    
    // Fallback to localStorage
    const conversations = await loadConversations();
    const index = conversations.findIndex(c => c.id === conversationId);
    if (index !== -1) {
        conversations[index] = { ...conversations[index], ...updates };
        localStorage.setItem(`insight360_conversations_${userId}`, JSON.stringify(conversations));
        return conversations[index];
    }
    
    return null;
}

/**
 * Delete a conversation
 */
async function deleteConversation(conversationId) {
    const userId = getUserId();
    
    // Try Supabase first
    if (supabaseClient && currentUser) {
        try {
            // Delete messages first
            await supabaseClient
                .from('messages')
                .delete()
                .eq('conversation_id', conversationId);
            
            // Delete conversation
            const { error } = await supabaseClient
                .from('conversations')
                .delete()
                .eq('id', conversationId)
                .eq('user_id', userId);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Failed to delete conversation from Supabase:', error);
        }
    }
    
    // Fallback to localStorage
    const conversations = await loadConversations();
    const filtered = conversations.filter(c => c.id !== conversationId);
    localStorage.setItem(`insight360_conversations_${userId}`, JSON.stringify(filtered));
    
    // Also delete messages
    localStorage.removeItem(`insight360_messages_${conversationId}`);
    
    return true;
}

// ============================================
// MESSAGE OPERATIONS
// ============================================

/**
 * Load messages for a conversation
 */
async function loadMessages(conversationId) {
    const userId = getUserId();
    
    // Try Supabase first
    if (supabaseClient && currentUser) {
        try {
            const { data, error } = await supabaseClient
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Failed to load messages from Supabase:', error);
        }
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem(`insight360_messages_${conversationId}`);
    return stored ? JSON.parse(stored) : [];
}

/**
 * Save a message to a conversation
 */
async function saveMessage(conversationId, role, content, model = null, tokensUsed = 0) {
    const message = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        role,
        content,
        model,
        tokens_used: tokensUsed,
        created_at: new Date().toISOString()
    };
    
    // Try Supabase first
    if (supabaseClient && currentUser) {
        try {
            const { data, error } = await supabaseClient
                .from('messages')
                .insert(message)
                .select()
                .single();
            
            if (error) throw error;
            
            // Update conversation timestamp
            await updateConversation(conversationId, {});
            
            return data;
        } catch (error) {
            console.error('Failed to save message to Supabase:', error);
        }
    }
    
    // Fallback to localStorage
    const messages = await loadMessages(conversationId);
    messages.push(message);
    localStorage.setItem(`insight360_messages_${conversationId}`, JSON.stringify(messages));
    
    // Update conversation timestamp
    await updateConversation(conversationId, {});
    
    return message;
}

// ============================================
// UI HELPERS
// ============================================

/**
 * Render conversation list in sidebar
 */
async function renderConversationList() {
    const listElement = document.getElementById('conversationList');
    if (!listElement) return;
    
    const conversations = await loadConversations();
    
    if (conversations.length === 0) {
        listElement.innerHTML = `
            <div class="empty-conversations">
                <p>No conversations yet</p>
            </div>
        `;
        return;
    }
    
    listElement.innerHTML = conversations.map(conv => `
        <div class="conversation-item ${conv.id === currentConversationId ? 'active' : ''}" 
             data-id="${conv.id}"
             onclick="switchConversation('${conv.id}')">
            <div class="conversation-title">${escapeHtml(conv.title)}</div>
            <div class="conversation-meta">
                <span class="conversation-model">${getModelShortName(conv.model)}</span>
                <span class="conversation-date">${formatRelativeTime(conv.updated_at)}</span>
            </div>
            <button class="conversation-delete" onclick="event.stopPropagation(); confirmDeleteConversation('${conv.id}')" title="Delete">
                <i data-lucide="trash-2"></i>
            </button>
        </div>
    `).join('');
    
    // Re-initialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Clear conversation list UI
 */
function clearConversationList() {
    const listElement = document.getElementById('conversationList');
    if (listElement) {
        listElement.innerHTML = '';
    }
}

/**
 * Get short model name for display
 */
function getModelShortName(model) {
    if (!model) return 'AI';
    if (model.includes('opus')) return 'Opus';
    if (model.includes('sonnet')) return 'Sonnet';
    if (model.includes('haiku')) return 'Haiku';
    if (model.includes('gpt-4o')) return 'GPT-4o';
    if (model.includes('gpt-4.1')) return 'GPT-4.1';
    if (model.includes('o3')) return 'o3';
    return 'AI';
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// AUTO-GENERATE TITLE
// ============================================

/**
 * Generate a title from the first user message
 */
function generateTitle(message) {
    // Take first 50 chars, trim to last word
    let title = message.substring(0, 50);
    if (message.length > 50) {
        const lastSpace = title.lastIndexOf(' ');
        if (lastSpace > 20) {
            title = title.substring(0, lastSpace);
        }
        title += '...';
    }
    return title;
}

// ============================================
// EXPORTS
// ============================================

// Make functions available globally
window.supabaseDB = {
    init: initSupabase,
    isAuthenticated,
    getUserId,
    loadConversations,
    createConversation,
    updateConversation,
    deleteConversation,
    loadMessages,
    saveMessage,
    renderConversationList,
    generateTitle
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initSupabase().then(() => {
        renderConversationList();
    });
});
