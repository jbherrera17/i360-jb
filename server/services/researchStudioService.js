/**
 * INSIGHT 360 - Research Studio Service
 * Version: 1.0.0
 *
 * Core service for Research Studio (NotebookLM-style) functionality.
 * Handles CRUD operations, source management, and context assembly.
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID: uuidv4 } = require('crypto');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Constants
const CHARS_PER_TOKEN = 4;
const DEFAULT_CHUNK_SIZE = 500; // tokens
const MAX_CONTEXT_TOKENS = 100000; // Conservative limit for context assembly

/**
 * Estimate token count from text
 * @param {string} text - Text to estimate
 * @returns {number} - Estimated token count
 */
function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// =====================================================
// RESEARCH STUDIO CRUD
// =====================================================

/**
 * Create a new research studio
 * @param {object} data - Studio data
 * @param {string} data.title - Studio title
 * @param {string} [data.description] - Studio description
 * @param {object} [data.settings] - Studio settings
 * @param {string} [userId] - User ID (optional)
 * @returns {Promise<object>} - Created studio
 */
async function createStudio({ title, description, settings }, userId = null) {
    const { data, error } = await supabase
        .from('research_studios')
        .insert({
            user_id: userId,
            title,
            description,
            settings: settings || {
                default_model: 'claude-sonnet-4-20250514',
                chunk_size: DEFAULT_CHUNK_SIZE,
                citation_style: 'numbered'
            }
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating studio:', error);
        throw new Error(`Failed to create studio: ${error.message}`);
    }

    // Create default conversation
    await supabase
        .from('studio_conversations')
        .insert({
            studio_id: data.id,
            title: 'Main Chat',
            is_active: true
        });

    return data;
}

/**
 * Get a research studio by ID with sources and outputs
 * @param {string} studioId - Studio ID
 * @param {string} [userId] - User ID for authorization
 * @returns {Promise<object>} - Studio with related data
 */
async function getStudio(studioId, userId = null) {
    // Get studio
    const { data: studio, error: studioError } = await supabase
        .from('research_studios')
        .select('*')
        .eq('id', studioId)
        .single();

    if (studioError) {
        if (studioError.code === 'PGRST116') {
            throw new Error('Studio not found');
        }
        throw new Error(`Failed to get studio: ${studioError.message}`);
    }

    // Get sources
    const { data: sources, error: sourcesError } = await supabase
        .from('studio_sources')
        .select('id, title, source_type, file_name, file_size, is_selected, processing_status, metadata, created_at')
        .eq('studio_id', studioId)
        .order('created_at', { ascending: false });

    if (sourcesError) {
        console.error('Error getting sources:', sourcesError);
    }

    // Get outputs
    const { data: outputs, error: outputsError } = await supabase
        .from('studio_outputs')
        .select('id, output_type, title, status, created_at')
        .eq('studio_id', studioId)
        .order('created_at', { ascending: false });

    if (outputsError) {
        console.error('Error getting outputs:', outputsError);
    }

    // Get active conversation
    const { data: conversations, error: convoError } = await supabase
        .from('studio_conversations')
        .select('id, title, is_active, created_at')
        .eq('studio_id', studioId)
        .order('created_at', { ascending: false });

    if (convoError) {
        console.error('Error getting conversations:', convoError);
    }

    return {
        ...studio,
        sources: sources || [],
        outputs: outputs || [],
        conversations: conversations || []
    };
}

/**
 * List all studios for a user
 * @param {string} [userId] - User ID
 * @param {object} [options] - Query options
 * @returns {Promise<object[]>} - List of studios
 */
async function listStudios(userId = null, options = {}) {
    const { includeArchived = false, limit = 50, offset = 0 } = options;

    let query = supabase
        .from('research_studios')
        .select(`
            id, title, description, is_archived, created_at, updated_at,
            studio_sources(count),
            studio_outputs(count)
        `, { count: 'exact' });

    if (userId) {
        query = query.eq('user_id', userId);
    }

    if (!includeArchived) {
        query = query.eq('is_archived', false);
    }

    const { data, error, count } = await query
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        throw new Error(`Failed to list studios: ${error.message}`);
    }

    // Transform count aggregates
    const studios = data.map(studio => ({
        ...studio,
        source_count: studio.studio_sources?.[0]?.count || 0,
        output_count: studio.studio_outputs?.[0]?.count || 0,
        studio_sources: undefined,
        studio_outputs: undefined
    }));

    return { studios, total: count };
}

/**
 * Update a research studio
 * @param {string} studioId - Studio ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} - Updated studio
 */
async function updateStudio(studioId, updates) {
    const allowedFields = ['title', 'description', 'settings', 'is_archived'];
    const sanitizedUpdates = {};

    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            sanitizedUpdates[field] = updates[field];
        }
    }

    const { data, error } = await supabase
        .from('research_studios')
        .update(sanitizedUpdates)
        .eq('id', studioId)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update studio: ${error.message}`);
    }

    return data;
}

/**
 * Delete a research studio
 * @param {string} studioId - Studio ID
 * @returns {Promise<void>}
 */
async function deleteStudio(studioId) {
    // Delete associated files from storage first
    const { data: sources } = await supabase
        .from('studio_sources')
        .select('file_path')
        .eq('studio_id', studioId)
        .not('file_path', 'is', null);

    if (sources && sources.length > 0) {
        const filePaths = sources.map(s => s.file_path).filter(Boolean);
        if (filePaths.length > 0) {
            await supabase.storage
                .from('studio-sources')
                .remove(filePaths);
        }
    }

    // Delete outputs with files
    const { data: outputs } = await supabase
        .from('studio_outputs')
        .select('file_path')
        .eq('studio_id', studioId)
        .not('file_path', 'is', null);

    if (outputs && outputs.length > 0) {
        const outputPaths = outputs.map(o => o.file_path).filter(Boolean);
        if (outputPaths.length > 0) {
            await supabase.storage
                .from('studio-outputs')
                .remove(outputPaths);
        }
    }

    // Delete studio (cascades to related tables)
    const { error } = await supabase
        .from('research_studios')
        .delete()
        .eq('id', studioId);

    if (error) {
        throw new Error(`Failed to delete studio: ${error.message}`);
    }
}

// =====================================================
// SOURCE MANAGEMENT
// =====================================================

/**
 * Add a source to a studio
 * @param {string} studioId - Studio ID
 * @param {object} sourceData - Source data
 * @returns {Promise<object>} - Created source
 */
async function addSource(studioId, sourceData) {
    const {
        title,
        source_type,
        content,
        file_path,
        file_name,
        file_size,
        mime_type,
        url,
        metadata
    } = sourceData;

    const { data, error } = await supabase
        .from('studio_sources')
        .insert({
            studio_id: studioId,
            title,
            source_type,
            content,
            file_path,
            file_name,
            file_size,
            mime_type,
            url,
            metadata: metadata || {},
            processing_status: content ? 'complete' : 'pending'
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to add source: ${error.message}`);
    }

    // If content is provided, create chunks
    if (content) {
        await createChunksForSource(data.id, content);
    }

    return data;
}

/**
 * Create chunks for a source
 * @param {string} sourceId - Source ID
 * @param {string} content - Full text content
 * @param {number} [chunkSize] - Target tokens per chunk
 */
async function createChunksForSource(sourceId, content, chunkSize = DEFAULT_CHUNK_SIZE) {
    // Delete existing chunks
    await supabase
        .from('source_chunks')
        .delete()
        .eq('source_id', sourceId);

    // Split into chunks
    const chunks = splitIntoChunks(content, chunkSize);

    // Insert chunks
    const chunkRecords = chunks.map((chunk, index) => ({
        source_id: sourceId,
        chunk_index: index,
        content: chunk.content,
        token_count: chunk.token_count,
        metadata: chunk.metadata || {}
    }));

    if (chunkRecords.length > 0) {
        const { error } = await supabase
            .from('source_chunks')
            .insert(chunkRecords);

        if (error) {
            console.error('Error creating chunks:', error);
        }
    }

    return chunks.length;
}

/**
 * Split content into chunks
 * @param {string} content - Text content
 * @param {number} targetTokens - Target tokens per chunk
 * @returns {object[]} - Array of chunk objects
 */
function splitIntoChunks(content, targetTokens = DEFAULT_CHUNK_SIZE) {
    const chunks = [];
    const targetChars = targetTokens * CHARS_PER_TOKEN;

    // Split by paragraphs first
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = '';
    let chunkStart = 0;

    for (const paragraph of paragraphs) {
        const paragraphWithBreak = paragraph + '\n\n';

        if (currentChunk.length + paragraphWithBreak.length > targetChars && currentChunk.length > 0) {
            // Save current chunk
            chunks.push({
                content: currentChunk.trim(),
                token_count: estimateTokens(currentChunk),
                metadata: { start_char: chunkStart }
            });
            chunkStart += currentChunk.length;
            currentChunk = paragraphWithBreak;
        } else {
            currentChunk += paragraphWithBreak;
        }
    }

    // Add remaining content
    if (currentChunk.trim()) {
        chunks.push({
            content: currentChunk.trim(),
            token_count: estimateTokens(currentChunk),
            metadata: { start_char: chunkStart }
        });
    }

    return chunks;
}

/**
 * Get a source by ID
 * @param {string} sourceId - Source ID
 * @returns {Promise<object>} - Source with chunks
 */
async function getSource(sourceId) {
    const { data: source, error } = await supabase
        .from('studio_sources')
        .select('*')
        .eq('id', sourceId)
        .single();

    if (error) {
        throw new Error(`Failed to get source: ${error.message}`);
    }

    // Get chunks
    const { data: chunks } = await supabase
        .from('source_chunks')
        .select('id, chunk_index, content, token_count, metadata')
        .eq('source_id', sourceId)
        .order('chunk_index');

    return {
        ...source,
        chunks: chunks || []
    };
}

/**
 * Update source selection status
 * @param {string} sourceId - Source ID
 * @param {boolean} isSelected - Selection status
 * @returns {Promise<object>} - Updated source
 */
async function toggleSourceSelection(sourceId, isSelected) {
    const { data, error } = await supabase
        .from('studio_sources')
        .update({ is_selected: isSelected })
        .eq('id', sourceId)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update source: ${error.message}`);
    }

    return data;
}

/**
 * Delete a source
 * @param {string} sourceId - Source ID
 * @returns {Promise<void>}
 */
async function deleteSource(sourceId) {
    // Get file path first
    const { data: source } = await supabase
        .from('studio_sources')
        .select('file_path')
        .eq('id', sourceId)
        .single();

    // Delete from storage if exists
    if (source?.file_path) {
        await supabase.storage
            .from('studio-sources')
            .remove([source.file_path]);
    }

    // Delete source (cascades to chunks)
    const { error } = await supabase
        .from('studio_sources')
        .delete()
        .eq('id', sourceId);

    if (error) {
        throw new Error(`Failed to delete source: ${error.message}`);
    }
}

/**
 * Update source content and processing status
 * @param {string} sourceId - Source ID
 * @param {string} content - Extracted text content
 * @param {object} [metadata] - Additional metadata
 * @returns {Promise<object>} - Updated source
 */
async function updateSourceContent(sourceId, content, metadata = {}) {
    const { data, error } = await supabase
        .from('studio_sources')
        .update({
            content,
            metadata,
            processing_status: 'complete'
        })
        .eq('id', sourceId)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update source content: ${error.message}`);
    }

    // Create chunks
    await createChunksForSource(sourceId, content);

    return data;
}

// =====================================================
// CONTEXT ASSEMBLY
// =====================================================

/**
 * Calculate relevance score for a chunk based on query
 * @param {string} chunkContent - Chunk text content
 * @param {string} query - User query
 * @returns {number} - Relevance score (0-100)
 */
function calculateRelevanceScore(chunkContent, query) {
    if (!query || !chunkContent) return 50; // Default score when no query

    const queryLower = query.toLowerCase();
    const contentLower = chunkContent.toLowerCase();

    // Extract keywords from query (words > 3 chars, not stop words)
    const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'would', 'could', 'what', 'when', 'where', 'which', 'their', 'there', 'this', 'that', 'with', 'from', 'they', 'will', 'about', 'into']);
    const queryWords = queryLower
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));

    if (queryWords.length === 0) return 50;

    let score = 0;
    let exactMatches = 0;
    let partialMatches = 0;

    // Check for exact phrase match (highest value)
    if (contentLower.includes(queryLower.replace(/[^\w\s]/g, ''))) {
        score += 40;
    }

    // Check for individual keyword matches
    for (const word of queryWords) {
        // Exact word match
        const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = contentLower.match(wordRegex);
        if (matches) {
            exactMatches += matches.length;
        }

        // Partial/stem match
        if (contentLower.includes(word)) {
            partialMatches++;
        }
    }

    // Score based on matches
    score += Math.min(exactMatches * 5, 30); // Up to 30 points for exact matches
    score += Math.min((partialMatches / queryWords.length) * 20, 20); // Up to 20 points for coverage

    // Bonus for keyword density
    const wordCount = chunkContent.split(/\s+/).length;
    const density = exactMatches / Math.max(wordCount, 1);
    score += Math.min(density * 500, 10); // Up to 10 points for density

    return Math.min(Math.round(score), 100);
}

/**
 * Assemble context from selected sources for a query
 * @param {string} studioId - Studio ID
 * @param {string} [query] - Optional query for relevance filtering
 * @param {number} [maxTokens] - Maximum tokens for context
 * @returns {Promise<object>} - Assembled context with source references
 */
async function assembleSourceContext(studioId, query = null, maxTokens = MAX_CONTEXT_TOKENS) {
    // Get selected sources with their chunks
    const { data: sources, error } = await supabase
        .from('studio_sources')
        .select(`
            id, title, source_type, metadata,
            source_chunks (
                id, chunk_index, content, token_count
            )
        `)
        .eq('studio_id', studioId)
        .eq('is_selected', true)
        .eq('processing_status', 'complete')
        .order('created_at');

    if (error) {
        throw new Error(`Failed to get sources for context: ${error.message}`);
    }

    // Collect all chunks with relevance scores
    let allChunks = [];

    for (const source of sources || []) {
        const chunks = source.source_chunks || [];

        for (const chunk of chunks) {
            const chunkTokens = chunk.token_count || estimateTokens(chunk.content);
            const relevanceScore = calculateRelevanceScore(chunk.content, query);

            allChunks.push({
                sourceId: source.id,
                sourceTitle: source.title,
                sourceType: source.source_type,
                chunkId: chunk.id,
                chunkIndex: chunk.chunk_index,
                content: chunk.content,
                tokens: chunkTokens,
                relevanceScore
            });
        }
    }

    // Sort by relevance score (descending) if query provided, otherwise by original order
    if (query) {
        allChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } else {
        // Sort by source then chunk index for consistent ordering
        allChunks.sort((a, b) => {
            if (a.sourceId !== b.sourceId) {
                return a.sourceTitle.localeCompare(b.sourceTitle);
            }
            return a.chunkIndex - b.chunkIndex;
        });
    }

    // Select chunks within token budget
    let contextParts = [];
    let totalTokens = 0;
    let sourceReferences = [];

    for (const chunk of allChunks) {
        if (totalTokens + chunk.tokens > maxTokens) {
            // Skip large chunks if over budget, but keep trying smaller ones
            if (contextParts.length === 0) {
                // Must include at least one chunk, truncate if needed
                const truncatedContent = chunk.content.substring(0, maxTokens * CHARS_PER_TOKEN);
                contextParts.push({
                    ...chunk,
                    content: truncatedContent,
                    tokens: estimateTokens(truncatedContent)
                });
                totalTokens += estimateTokens(truncatedContent);
            }
            continue;
        }

        contextParts.push(chunk);
        totalTokens += chunk.tokens;

        // Track source reference
        if (!sourceReferences.find(r => r.id === chunk.sourceId)) {
            sourceReferences.push({
                id: chunk.sourceId,
                title: chunk.sourceTitle,
                type: chunk.sourceType
            });
        }

        if (totalTokens >= maxTokens) {
            break;
        }
    }

    // Re-sort by source for consistent citation numbering
    contextParts.sort((a, b) => {
        const sourceIndexA = sourceReferences.findIndex(r => r.id === a.sourceId);
        const sourceIndexB = sourceReferences.findIndex(r => r.id === b.sourceId);
        if (sourceIndexA !== sourceIndexB) {
            return sourceIndexA - sourceIndexB;
        }
        return a.chunkIndex - b.chunkIndex;
    });

    // Format context for LLM with source markers
    const formattedContext = contextParts.map((part, index) => {
        return `[Source ${index + 1}: ${part.sourceTitle}]\n${part.content}`;
    }).join('\n\n---\n\n');

    return {
        context: formattedContext,
        totalTokens,
        sourceCount: sourceReferences.length,
        chunkCount: contextParts.length,
        sources: sourceReferences,
        chunks: contextParts.map(p => ({
            sourceId: p.sourceId,
            chunkId: p.chunkId,
            sourceTitle: p.sourceTitle
        }))
    };
}

// =====================================================
// CONVERSATION MANAGEMENT
// =====================================================

/**
 * Get or create active conversation for a studio
 * @param {string} studioId - Studio ID
 * @returns {Promise<object>} - Active conversation
 */
async function getActiveConversation(studioId) {
    // Try to get existing active conversation
    let { data: conversation, error } = await supabase
        .from('studio_conversations')
        .select('*')
        .eq('studio_id', studioId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code === 'PGRST116') {
        // No active conversation, create one
        const { data: newConvo, error: createError } = await supabase
            .from('studio_conversations')
            .insert({
                studio_id: studioId,
                title: 'Chat',
                is_active: true
            })
            .select()
            .single();

        if (createError) {
            throw new Error(`Failed to create conversation: ${createError.message}`);
        }

        conversation = newConvo;
    } else if (error) {
        throw new Error(`Failed to get conversation: ${error.message}`);
    }

    return conversation;
}

/**
 * Add a message to a conversation
 * @param {string} conversationId - Conversation ID
 * @param {object} message - Message data
 * @returns {Promise<object>} - Created message
 */
async function addMessage(conversationId, message) {
    const { role, content, citations, model_used, token_count, latency_ms } = message;

    const { data, error } = await supabase
        .from('studio_messages')
        .insert({
            conversation_id: conversationId,
            role,
            content,
            citations: citations || [],
            model_used,
            token_count,
            latency_ms
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to add message: ${error.message}`);
    }

    // Update conversation timestamp
    await supabase
        .from('studio_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    return data;
}

/**
 * Get messages for a conversation
 * @param {string} conversationId - Conversation ID
 * @param {number} [limit] - Maximum messages to return
 * @returns {Promise<object[]>} - Messages
 */
async function getMessages(conversationId, limit = 100) {
    const { data, error } = await supabase
        .from('studio_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit);

    if (error) {
        throw new Error(`Failed to get messages: ${error.message}`);
    }

    return data || [];
}

/**
 * Create a new conversation for a studio
 * @param {string} studioId - Studio ID
 * @param {string} [title] - Optional conversation title
 * @returns {Promise<object>} - New conversation
 */
async function createConversation(studioId, title = null) {
    // Deactivate all existing conversations for this studio
    await supabase
        .from('studio_conversations')
        .update({ is_active: false })
        .eq('studio_id', studioId);

    // Create new conversation
    const { data, error } = await supabase
        .from('studio_conversations')
        .insert({
            studio_id: studioId,
            title: title || `Chat ${new Date().toLocaleDateString()}`,
            is_active: true
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create conversation: ${error.message}`);
    }

    return data;
}

/**
 * List all conversations for a studio
 * @param {string} studioId - Studio ID
 * @returns {Promise<object[]>} - Conversations with preview
 */
async function listConversations(studioId) {
    const { data, error } = await supabase
        .from('studio_conversations')
        .select(`
            id, title, is_active, created_at, updated_at,
            studio_messages (
                content,
                role,
                created_at
            )
        `)
        .eq('studio_id', studioId)
        .order('updated_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to list conversations: ${error.message}`);
    }

    // Transform to include message count and preview
    return (data || []).map(convo => {
        const messages = convo.studio_messages || [];
        const userMessages = messages.filter(m => m.role === 'user');
        const firstUserMessage = userMessages.length > 0 ? userMessages[0] : null;

        return {
            id: convo.id,
            title: convo.title,
            is_active: convo.is_active,
            created_at: convo.created_at,
            updated_at: convo.updated_at,
            message_count: messages.length,
            preview: firstUserMessage
                ? firstUserMessage.content.substring(0, 100) + (firstUserMessage.content.length > 100 ? '...' : '')
                : 'No messages yet'
        };
    });
}

/**
 * Switch to a specific conversation
 * @param {string} studioId - Studio ID
 * @param {string} conversationId - Conversation ID to switch to
 * @returns {Promise<object>} - The activated conversation
 */
async function switchConversation(studioId, conversationId) {
    // Deactivate all conversations for this studio
    await supabase
        .from('studio_conversations')
        .update({ is_active: false })
        .eq('studio_id', studioId);

    // Activate the target conversation
    const { data, error } = await supabase
        .from('studio_conversations')
        .update({ is_active: true })
        .eq('id', conversationId)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to switch conversation: ${error.message}`);
    }

    return data;
}

/**
 * Update conversation title
 * @param {string} conversationId - Conversation ID
 * @param {string} title - New title
 * @returns {Promise<object>} - Updated conversation
 */
async function updateConversationTitle(conversationId, title) {
    const { data, error } = await supabase
        .from('studio_conversations')
        .update({ title })
        .eq('id', conversationId)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update conversation title: ${error.message}`);
    }

    return data;
}

/**
 * Delete a conversation
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<void>}
 */
async function deleteConversation(conversationId) {
    const { error } = await supabase
        .from('studio_conversations')
        .delete()
        .eq('id', conversationId);

    if (error) {
        throw new Error(`Failed to delete conversation: ${error.message}`);
    }
}

// =====================================================
// OUTPUT MANAGEMENT
// =====================================================

/**
 * Create an output record
 * @param {string} studioId - Studio ID
 * @param {object} outputData - Output data
 * @returns {Promise<object>} - Created output
 */
async function createOutput(studioId, outputData) {
    const { output_type, title, content, file_path, file_size, mime_type, model_used, generation_params } = outputData;

    const { data, error } = await supabase
        .from('studio_outputs')
        .insert({
            studio_id: studioId,
            output_type,
            title,
            content,
            file_path,
            file_size,
            mime_type,
            model_used,
            generation_params: generation_params || {},
            status: 'complete'
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create output: ${error.message}`);
    }

    return data;
}

/**
 * Update output status
 * @param {string} outputId - Output ID
 * @param {string} status - New status
 * @param {object} [updates] - Additional updates
 * @returns {Promise<object>} - Updated output
 */
async function updateOutputStatus(outputId, status, updates = {}) {
    const { data, error } = await supabase
        .from('studio_outputs')
        .update({ status, ...updates })
        .eq('id', outputId)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update output: ${error.message}`);
    }

    return data;
}

/**
 * Get output by ID
 * @param {string} outputId - Output ID
 * @returns {Promise<object>} - Output
 */
async function getOutput(outputId) {
    const { data, error } = await supabase
        .from('studio_outputs')
        .select('*')
        .eq('id', outputId)
        .single();

    if (error) {
        throw new Error(`Failed to get output: ${error.message}`);
    }

    return data;
}

/**
 * List outputs for a studio
 * @param {string} studioId - Studio ID
 * @param {string} [outputType] - Filter by type
 * @returns {Promise<object[]>} - Outputs
 */
async function listOutputs(studioId, outputType = null) {
    let query = supabase
        .from('studio_outputs')
        .select('*')
        .eq('studio_id', studioId);

    if (outputType) {
        query = query.eq('output_type', outputType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to list outputs: ${error.message}`);
    }

    return data || [];
}

/**
 * Delete an output
 * @param {string} outputId - Output ID
 * @returns {Promise<void>}
 */
async function deleteOutput(outputId) {
    // Get file path first
    const { data: output } = await supabase
        .from('studio_outputs')
        .select('file_path')
        .eq('id', outputId)
        .single();

    // Delete from storage if exists
    if (output?.file_path) {
        await supabase.storage
            .from('studio-outputs')
            .remove([output.file_path]);
    }

    const { error } = await supabase
        .from('studio_outputs')
        .delete()
        .eq('id', outputId);

    if (error) {
        throw new Error(`Failed to delete output: ${error.message}`);
    }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    // Studios
    createStudio,
    getStudio,
    listStudios,
    updateStudio,
    deleteStudio,

    // Sources
    addSource,
    getSource,
    toggleSourceSelection,
    deleteSource,
    updateSourceContent,
    createChunksForSource,

    // Context
    assembleSourceContext,
    estimateTokens,
    splitIntoChunks,

    // Conversations
    getActiveConversation,
    addMessage,
    getMessages,
    createConversation,
    listConversations,
    switchConversation,
    updateConversationTitle,
    deleteConversation,

    // Outputs
    createOutput,
    updateOutputStatus,
    getOutput,
    listOutputs,
    deleteOutput,

    // Constants
    CHARS_PER_TOKEN,
    DEFAULT_CHUNK_SIZE,
    MAX_CONTEXT_TOKENS
};
