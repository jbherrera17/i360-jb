/**
 * Conversation Service - Insight 360
 * Handles conversation and message persistence
 * Version: 1.1.0 - Added admin query methods
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
 * @returns {array} List of conversations with user info
 */
async function getConversations(options = {}) {
    const {
        limit = 50,
        offset = 0,
        userId = null,
        includeUserInfo = true,
        includeArchived = false,
        starredOnly = false,
        archivedOnly = false,
        search = null
    } = options;

    let query = supabase
        .from('conversations')
        .select(`
            id,
            title,
            model,
            metadata,
            created_at,
            updated_at,
            user_id,
            is_archived,
            is_starred
        `)
        .order('is_starred', { ascending: false })
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

    // Filter by user_id if provided
    if (userId) {
        query = query.eq('user_id', userId);
    }

    // Archive filtering
    if (archivedOnly) {
        query = query.eq('is_archived', true);
    } else if (!includeArchived) {
        query = query.eq('is_archived', false);
    }

    // Starred filter
    if (starredOnly) {
        query = query.eq('is_starred', true);
    }

    // Search by title
    if (search) {
        query = query.ilike('title', `%${search}%`);
    }

    const { data: conversations, error } = await query;

    if (error) {
        console.error('Error fetching conversations:', error);
        throw new Error(`Failed to fetch conversations: ${error.message}`);
    }

    if (!conversations || conversations.length === 0) {
        return [];
    }

    // Optionally include user info
    if (includeUserInfo) {
        const userIds = [...new Set(conversations.map(c => c.user_id).filter(Boolean))];

        if (userIds.length > 0) {
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id, email, display_name')
                .in('id', userIds);

            if (userError) {
                console.error('Error fetching user info for conversations:', userError);
            }

            if (users && users.length > 0) {
                const userMap = new Map(users.map(u => [u.id, u]));
                return conversations.map(conv => ({
                    ...conv,
                    users: conv.user_id ? (userMap.get(conv.user_id) || null) : null
                }));
            }
        }
    }

    // Return conversations with null users so frontend doesn't break
    return conversations.map(conv => ({ ...conv, users: null }));
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
    const allowedFields = ['title', 'model', 'is_starred', 'is_archived'];
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

/**
 * Get all conversations for admin (with user, department, and org info)
 * @param {object} options - Query options
 * @returns {array} List of conversations with user details
 */
async function getAdminConversations(options = {}) {
    const {
        limit = 100,
        offset = 0,
        departmentId = null,
        businessRole = null,
        userId = null,
        orgId = null,
        search = null
    } = options;

    try {
        // Pre-filter user IDs at the database level when org/dept/role filters are applied.
        // Users belong to orgs via organization_members (not a direct column on users).
        // Platform admins are in platform_admins and should appear under the Synergi org.
        let filteredUserIds = null;

        if (orgId) {
            // Get users who are members of this organization
            const { data: orgMembers, error: omError } = await supabase
                .from('organization_members')
                .select('user_id')
                .eq('org_id', orgId)
                .eq('status', 'active');

            if (omError) {
                console.error('Error querying organization_members:', omError);
                throw new Error(`Failed to filter org members: ${omError.message}`);
            }

            filteredUserIds = (orgMembers || []).map(m => m.user_id);

            // Also include platform admins — they belong to the Synergi (platform) org
            // but may not have an organization_members row
            const { data: platformAdmins, error: paError } = await supabase
                .from('platform_admins')
                .select('user_id')
                .eq('is_active', true);

            if (!paError && platformAdmins) {
                for (const pa of platformAdmins) {
                    if (!filteredUserIds.includes(pa.user_id)) {
                        filteredUserIds.push(pa.user_id);
                    }
                }
            }
        }

        if (businessRole) {
            // business_role IS a direct column on users
            const { data: roleUsers, error: roleError } = await supabase
                .from('users')
                .select('id')
                .eq('business_role', businessRole);

            if (roleError) {
                console.error('Error filtering by business_role:', roleError);
            } else {
                const roleUserIds = (roleUsers || []).map(u => u.id);
                // Intersect with existing filter if org filter was also applied
                if (filteredUserIds) {
                    filteredUserIds = filteredUserIds.filter(id => roleUserIds.includes(id));
                } else {
                    filteredUserIds = roleUserIds;
                }
            }
        }

        if (departmentId) {
            // Departments use department_members junction table
            const { data: deptMembers, error: deptError } = await supabase
                .from('department_members')
                .select('user_id')
                .eq('department_id', departmentId);

            if (deptError) {
                // Fall back: some setups may not have department_members, ignore gracefully
                console.error('Error filtering by department:', deptError);
            } else {
                const deptUserIds = (deptMembers || []).map(m => m.user_id);
                if (filteredUserIds) {
                    filteredUserIds = filteredUserIds.filter(id => deptUserIds.includes(id));
                } else {
                    filteredUserIds = deptUserIds;
                }
            }
        }

        if (filteredUserIds !== null && filteredUserIds.length === 0) {
            return [];
        }

        // Build conversation query
        let query = supabase
            .from('conversations')
            .select(`
                id,
                title,
                model,
                metadata,
                created_at,
                updated_at,
                user_id
            `)
            .order('updated_at', { ascending: false });

        // Apply user filter directly if provided
        if (userId) {
            query = query.eq('user_id', userId);
        }

        // Apply pre-filtered user IDs at database level
        if (filteredUserIds) {
            query = query.in('user_id', filteredUserIds);
        }

        // Apply pagination AFTER database-level filters
        query = query.range(offset, offset + limit - 1);

        const { data: conversations, error } = await query;

        if (error) {
            console.error('Error fetching admin conversations:', error);
            throw new Error(`Failed to fetch admin conversations: ${error.message}`);
        }

        if (!conversations || conversations.length === 0) {
            return [];
        }

        // Get unique user IDs from results
        const userIds = [...new Set(conversations.map(c => c.user_id).filter(Boolean))];

        // Fetch user info
        let users = [];
        if (userIds.length > 0) {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select(`
                    id,
                    email,
                    display_name,
                    business_role,
                    default_org_id
                `)
                .in('id', userIds);

            if (!userError && userData) {
                users = userData;
            }
        }

        // Fetch org membership for these users
        let userOrgMap = new Map();
        if (userIds.length > 0) {
            const { data: memberships, error: memError } = await supabase
                .from('organization_members')
                .select('user_id, org_id')
                .in('user_id', userIds)
                .eq('status', 'active');

            if (!memError && memberships) {
                for (const m of memberships) {
                    userOrgMap.set(m.user_id, m.org_id);
                }
            }
        }

        // Fetch organization info
        const orgIdSet = new Set([
            ...users.map(u => u.default_org_id).filter(Boolean),
            ...Array.from(userOrgMap.values())
        ]);
        let organizations = [];
        if (orgIdSet.size > 0) {
            const { data: orgData, error: orgError } = await supabase
                .from('organizations')
                .select('id, name')
                .in('id', Array.from(orgIdSet));

            if (!orgError && orgData) {
                organizations = orgData;
            }
        }

        // Create lookup maps
        const orgMap = new Map(organizations.map(o => [o.id, o]));
        const userMap = new Map(users.map(u => {
            const memberOrgId = userOrgMap.get(u.id);
            const effectiveOrgId = memberOrgId || u.default_org_id;
            return [u.id, {
                ...u,
                org_id: effectiveOrgId,
                organization: effectiveOrgId ? orgMap.get(effectiveOrgId) : null
            }];
        }));

        // Merge data
        let result = conversations.map(conv => ({
            ...conv,
            users: conv.user_id ? userMap.get(conv.user_id) : null
        }));

        // Apply search filter (text search still done in JS for flexibility)
        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(c =>
                c.title?.toLowerCase().includes(searchLower) ||
                c.users?.email?.toLowerCase().includes(searchLower) ||
                c.users?.display_name?.toLowerCase().includes(searchLower)
            );
        }

        return result;
    } catch (err) {
        console.error('getAdminConversations error:', err);
        throw err;
    }
}

/**
 * Get conversation counts grouped by department
 * @returns {array} Counts by department
 */
async function getConversationStats() {
    try {
        // Get all conversations
        const { data: conversations, error } = await supabase
            .from('conversations')
            .select('id, user_id');

        if (error) {
            throw new Error(`Failed to fetch conversation stats: ${error.message}`);
        }

        const totalCount = conversations?.length || 0;

        if (totalCount === 0) {
            return {
                total: 0,
                byDepartment: [],
                byRole: []
            };
        }

        // Get unique user IDs
        const userIds = [...new Set(conversations.map(c => c.user_id).filter(Boolean))];

        // Fetch user info
        let users = [];
        if (userIds.length > 0) {
            const { data: userData } = await supabase
                .from('users')
                .select('id, department_id, business_role')
                .in('id', userIds);
            users = userData || [];
        }

        // Fetch department names
        const deptIds = [...new Set(users.map(u => u.department_id).filter(Boolean))];
        let departments = [];
        if (deptIds.length > 0) {
            const { data: deptData } = await supabase
                .from('departments')
                .select('id, name')
                .in('id', deptIds);
            departments = deptData || [];
        }

        // Create lookup maps
        const deptMap = new Map(departments.map(d => [d.id, d.name]));
        const userMap = new Map(users.map(u => [u.id, u]));

        // Aggregate by department and role
        const deptStats = {};
        const roleStats = {};

        for (const conv of conversations) {
            const user = conv.user_id ? userMap.get(conv.user_id) : null;
            const deptId = user?.department_id || 'unassigned';
            const deptName = deptId !== 'unassigned' ? deptMap.get(deptId) || 'Unknown' : 'Unassigned';
            const role = user?.business_role || 'unassigned';

            if (!deptStats[deptId]) {
                deptStats[deptId] = { id: deptId, name: deptName, count: 0 };
            }
            deptStats[deptId].count++;

            if (!roleStats[role]) {
                roleStats[role] = { role, count: 0 };
            }
            roleStats[role].count++;
        }

        return {
            total: totalCount,
            byDepartment: Object.values(deptStats),
            byRole: Object.values(roleStats)
        };
    } catch (err) {
        console.error('getConversationStats error:', err);
        throw err;
    }
}

/**
 * Get a conversation for admin (bypasses user ownership check)
 * @param {string} conversationId - Conversation UUID
 * @returns {object} Conversation with messages and user info
 */
async function getAdminConversation(conversationId) {
    try {
        // Get conversation
        const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', conversationId)
            .single();

        if (convError) {
            if (convError.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to fetch conversation: ${convError.message}`);
        }

        // Get user info if user_id exists
        let userInfo = null;
        if (conversation.user_id) {
            const { data: userData } = await supabase
                .from('users')
                .select('id, email, display_name, business_role, department_id')
                .eq('id', conversation.user_id)
                .single();

            if (userData) {
                userInfo = userData;

                // Get department info
                if (userData.department_id) {
                    const { data: deptData } = await supabase
                        .from('departments')
                        .select('id, name')
                        .eq('id', userData.department_id)
                        .single();

                    if (deptData) {
                        userInfo.departments = deptData;
                    }
                }
            }
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
            users: userInfo,
            messages: messages || []
        };
    } catch (err) {
        console.error('getAdminConversation error:', err);
        throw err;
    }
}

/**
 * Export conversation as Markdown
 * @param {object} conversation - Conversation with messages
 * @returns {string} Markdown formatted export
 */
function exportAsMarkdown(conversation) {
    const lines = [
        `# ${conversation.title}`,
        '',
        `**Model:** ${conversation.model || 'N/A'}`,
        `**Created:** ${new Date(conversation.created_at).toLocaleString()}`,
        `**Last Updated:** ${new Date(conversation.updated_at).toLocaleString()}`,
        '',
        '---',
        ''
    ];

    for (const msg of (conversation.messages || [])) {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        const time = new Date(msg.created_at).toLocaleString();
        lines.push(`### ${role} *(${time})*`);
        lines.push('');
        lines.push(msg.content);
        lines.push('');
        lines.push('---');
        lines.push('');
    }

    return lines.join('\n');
}

module.exports = {
    createConversation,
    getConversations,
    getConversation,
    updateConversation,
    deleteConversation,
    addMessage,
    getMessages,
    generateTitle,
    getAdminConversations,
    getConversationStats,
    getAdminConversation,
    exportAsMarkdown
};
