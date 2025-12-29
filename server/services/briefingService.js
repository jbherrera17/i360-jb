/**
 * INSIGHT 360 - Briefing Service
 * Version: 1.0.0
 *
 * Orchestrates multi-agent briefing generation.
 * Executes configured agents sequentially to build briefing sections.
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID: uuidv4 } = require('crypto');
const { executeAgent } = require('./agentService');
const { assembleContext } = require('./contextInjection');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * Get or create briefing configuration for a user
 * @param {string} userId - User ID
 * @returns {Object} - Briefing configuration
 */
async function getOrCreateConfig(userId) {
    // Try to get existing config
    const { data: existing, error: fetchError } = await supabase
        .from('briefing_configs')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (existing) {
        return existing;
    }

    // Create default config if none exists
    const { data: newConfig, error: createError } = await supabase
        .from('briefing_configs')
        .insert({
            user_id: userId,
            is_enabled: false, // Disabled by default until configured
            schedule_time: '06:00:00',
            timezone: 'America/New_York'
        })
        .select()
        .single();

    if (createError) {
        throw new Error(`Failed to create briefing config: ${createError.message}`);
    }

    return newConfig;
}

/**
 * Get briefing configuration with sections
 * @param {string} userId - User ID
 * @returns {Object} - Config with sections
 */
async function getConfigWithSections(userId) {
    const config = await getOrCreateConfig(userId);

    const { data: sections, error } = await supabase
        .from('briefing_sections')
        .select(`
            *,
            agent:agents(id, name, display_name, icon)
        `)
        .eq('config_id', config.id)
        .order('sort_order', { ascending: true });

    if (error) {
        throw new Error(`Failed to fetch sections: ${error.message}`);
    }

    return {
        ...config,
        sections: sections || []
    };
}

/**
 * Update briefing configuration
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Object} - Updated config
 */
async function updateConfig(userId, updates) {
    const config = await getOrCreateConfig(userId);

    const allowedFields = ['is_enabled', 'schedule_time', 'timezone'];
    const sanitized = {};
    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            sanitized[field] = updates[field];
        }
    }

    const { data, error } = await supabase
        .from('briefing_configs')
        .update(sanitized)
        .eq('id', config.id)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update config: ${error.message}`);
    }

    return data;
}

/**
 * Add a new section to the briefing
 * @param {string} userId - User ID
 * @param {Object} sectionData - Section configuration
 * @returns {Object} - Created section
 */
async function addSection(userId, sectionData) {
    const config = await getOrCreateConfig(userId);

    // Get max sort order
    const { data: maxOrder } = await supabase
        .from('briefing_sections')
        .select('sort_order')
        .eq('config_id', config.id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

    const nextOrder = (maxOrder?.sort_order || 0) + 1;

    // Generate slug from name if not provided
    const slug = sectionData.slug || sectionData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const { data, error } = await supabase
        .from('briefing_sections')
        .insert({
            config_id: config.id,
            name: sectionData.name,
            slug,
            description: sectionData.description,
            icon: sectionData.icon || 'file-text',
            agent_id: sectionData.agent_id,
            prompt_template: sectionData.prompt_template,
            context_assets: sectionData.context_assets || [],
            max_tokens: sectionData.max_tokens || 2000,
            sort_order: nextOrder,
            is_enabled: sectionData.is_enabled !== false
        })
        .select(`
            *,
            agent:agents(id, name, display_name, icon)
        `)
        .single();

    if (error) {
        throw new Error(`Failed to add section: ${error.message}`);
    }

    return data;
}

/**
 * Update a section
 * @param {string} userId - User ID
 * @param {string} sectionId - Section ID
 * @param {Object} updates - Fields to update
 * @returns {Object} - Updated section
 */
async function updateSection(userId, sectionId, updates) {
    // Verify ownership through config
    const config = await getOrCreateConfig(userId);

    const allowedFields = [
        'name', 'slug', 'description', 'icon', 'agent_id',
        'prompt_template', 'context_assets', 'max_tokens',
        'sort_order', 'is_enabled'
    ];

    const sanitized = {};
    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            sanitized[field] = updates[field];
        }
    }

    const { data, error } = await supabase
        .from('briefing_sections')
        .update(sanitized)
        .eq('id', sectionId)
        .eq('config_id', config.id)
        .select(`
            *,
            agent:agents(id, name, display_name, icon)
        `)
        .single();

    if (error) {
        throw new Error(`Failed to update section: ${error.message}`);
    }

    return data;
}

/**
 * Delete a section
 * @param {string} userId - User ID
 * @param {string} sectionId - Section ID
 */
async function deleteSection(userId, sectionId) {
    const config = await getOrCreateConfig(userId);

    const { error } = await supabase
        .from('briefing_sections')
        .delete()
        .eq('id', sectionId)
        .eq('config_id', config.id);

    if (error) {
        throw new Error(`Failed to delete section: ${error.message}`);
    }
}

/**
 * Reorder sections
 * @param {string} userId - User ID
 * @param {Array} sectionIds - Section IDs in new order
 */
async function reorderSections(userId, sectionIds) {
    const config = await getOrCreateConfig(userId);

    // Update sort_order for each section
    const updates = sectionIds.map((id, index) => ({
        id,
        sort_order: index
    }));

    for (const update of updates) {
        await supabase
            .from('briefing_sections')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id)
            .eq('config_id', config.id);
    }
}

/**
 * Generate a single section using its assigned agent
 * @param {Object} section - Section configuration
 * @param {Object} options - Generation options
 * @returns {Object} - Generated section content
 */
async function generateSection(section, options = {}) {
    const { onProgress } = options;

    if (!section.agent_id) {
        return {
            slug: section.slug,
            name: section.name,
            content: '*No agent assigned to this section.*',
            tokens_used: 0,
            status: 'skipped'
        };
    }

    try {
        // Build the prompt for this section
        const prompt = section.prompt_template ||
            `Generate content for the "${section.name}" section of today's daily briefing. Be concise and actionable.`;

        // Execute the agent
        const result = await executeAgent(section.agent_id, {
            userMessage: prompt,
            includeOnDemand: section.context_assets || [],
            userId: options.userId
        });

        return {
            slug: section.slug,
            name: section.name,
            icon: section.icon,
            content: result.response,
            agent_id: section.agent_id,
            tokens_used: result.usage?.total_tokens || 0,
            status: 'completed'
        };
    } catch (error) {
        console.error(`Error generating section ${section.slug}:`, error);
        return {
            slug: section.slug,
            name: section.name,
            icon: section.icon,
            content: `*Error generating this section: ${error.message}*`,
            tokens_used: 0,
            status: 'failed',
            error: error.message
        };
    }
}

/**
 * Generate a complete briefing
 * @param {string} userId - User ID
 * @param {Object} options - Generation options
 * @returns {Object} - Complete briefing
 */
async function generateBriefing(userId, options = {}) {
    const { onSectionStart, onSectionComplete, onProgress } = options;
    const startTime = Date.now();

    // Get config and sections
    const config = await getConfigWithSections(userId);
    const enabledSections = config.sections.filter(s => s.is_enabled);

    if (enabledSections.length === 0) {
        throw new Error('No sections configured for briefing. Please add at least one section.');
    }

    // Create pending briefing record
    const today = new Date().toISOString().split('T')[0];
    const { data: briefing, error: createError } = await supabase
        .from('briefings')
        .upsert({
            user_id: userId,
            date: today,
            status: 'generating',
            generation_started_at: new Date().toISOString(),
            content: { sections: [], metadata: {} }
        }, {
            onConflict: 'user_id,date'
        })
        .select()
        .single();

    if (createError) {
        throw new Error(`Failed to create briefing record: ${createError.message}`);
    }

    const generatedSections = [];
    let totalTokens = 0;
    let successCount = 0;
    let failedCount = 0;

    // Generate each section sequentially
    for (let i = 0; i < enabledSections.length; i++) {
        const section = enabledSections[i];

        if (onSectionStart) {
            onSectionStart({
                section: section.slug,
                name: section.name,
                index: i,
                total: enabledSections.length
            });
        }

        const result = await generateSection(section, { userId });
        generatedSections.push(result);
        totalTokens += result.tokens_used || 0;

        if (result.status === 'completed') {
            successCount++;
        } else if (result.status === 'failed') {
            failedCount++;
        }

        if (onSectionComplete) {
            onSectionComplete({
                section: result,
                index: i,
                total: enabledSections.length
            });
        }
    }

    // Determine overall status
    let status = 'completed';
    if (failedCount === enabledSections.length) {
        status = 'failed';
    } else if (failedCount > 0) {
        status = 'partial';
    }

    const endTime = Date.now();
    const metadata = {
        generation_time_ms: endTime - startTime,
        sections_requested: enabledSections.length,
        sections_completed: successCount,
        sections_failed: failedCount
    };

    // Update briefing with final content
    const { data: finalBriefing, error: updateError } = await supabase
        .from('briefings')
        .update({
            content: { sections: generatedSections, metadata },
            status,
            generation_completed_at: new Date().toISOString(),
            total_tokens_used: totalTokens,
            sections_generated: successCount
        })
        .eq('id', briefing.id)
        .select()
        .single();

    if (updateError) {
        console.error('Failed to update briefing:', updateError);
    }

    // Update config last run status
    await supabase
        .from('briefing_configs')
        .update({
            last_run_at: new Date().toISOString(),
            last_run_status: status
        })
        .eq('user_id', userId);

    return finalBriefing || briefing;
}

/**
 * Get the latest briefing for a user
 * @param {string} userId - User ID
 * @returns {Object|null} - Latest briefing or null
 */
async function getLatestBriefing(userId) {
    const { data, error } = await supabase
        .from('briefings')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') { // Not found error
        throw new Error(`Failed to fetch briefing: ${error.message}`);
    }

    return data || null;
}

/**
 * Get briefing by ID
 * @param {string} userId - User ID
 * @param {string} briefingId - Briefing ID
 * @returns {Object|null} - Briefing or null
 */
async function getBriefingById(userId, briefingId) {
    const { data, error } = await supabase
        .from('briefings')
        .select('*')
        .eq('id', briefingId)
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch briefing: ${error.message}`);
    }

    return data || null;
}

/**
 * Get briefing history for a user
 * @param {string} userId - User ID
 * @param {Object} options - Pagination options
 * @returns {Object} - Paginated briefings
 */
async function getBriefingHistory(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    // Get total count
    const { count } = await supabase
        .from('briefings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    // Get briefings
    const { data, error } = await supabase
        .from('briefings')
        .select('id, date, status, sections_generated, total_tokens_used, generation_completed_at')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        throw new Error(`Failed to fetch briefing history: ${error.message}`);
    }

    return {
        briefings: data || [],
        pagination: {
            page,
            limit,
            total: count || 0,
            pages: Math.ceil((count || 0) / limit)
        }
    };
}

/**
 * Get today's briefing or null
 * @param {string} userId - User ID
 * @returns {Object|null} - Today's briefing
 */
async function getTodaysBriefing(userId) {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('briefings')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch today's briefing: ${error.message}`);
    }

    return data || null;
}

module.exports = {
    // Config management
    getOrCreateConfig,
    getConfigWithSections,
    updateConfig,

    // Section management
    addSection,
    updateSection,
    deleteSection,
    reorderSections,

    // Briefing generation
    generateSection,
    generateBriefing,

    // Briefing retrieval
    getLatestBriefing,
    getBriefingById,
    getBriefingHistory,
    getTodaysBriefing
};
