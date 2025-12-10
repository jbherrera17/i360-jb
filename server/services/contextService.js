/**
 * Context Assets Service
 * Handles all database operations for context assets
 * 
 * Insight 360 - Phase 3
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// ============================================================
// ASSET TYPES
// ============================================================

/**
 * Get all active context asset types
 * @returns {Promise<Array>} Array of asset types
 */
async function getAssetTypes() {
    const { data, error } = await supabase
        .from('context_asset_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (error) throw error;
    return data;
}

/**
 * Get a single asset type by key
 * @param {string} typeKey - The type key (e.g., 'voice_dna')
 * @returns {Promise<Object>} Asset type object
 */
async function getAssetTypeByKey(typeKey) {
    const { data, error } = await supabase
        .from('context_asset_types')
        .select('*')
        .eq('type_key', typeKey)
        .single();

    if (error) throw error;
    return data;
}

// ============================================================
// CONTEXT ASSETS - CRUD
// ============================================================

/**
 * Get all context assets for a user
 * @param {string} userId - User UUID
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} Array of assets
 */
async function getAssets(userId, options = {}) {
    const {
        assetType = null,
        tags = null,
        search = null,
        includeArchived = false,
        limit = 100,
        offset = 0,
        sortBy = 'updated_at',
        sortOrder = 'desc'
    } = options;

    let query = supabase
        .from('context_assets')
        .select(`
            *,
            context_asset_types (
                display_name,
                icon,
                description
            )
        `)
        .eq('user_id', userId)
        .eq('is_current', true);

    // Apply filters
    if (assetType) {
        query = query.eq('asset_type', assetType);
    }

    if (tags && tags.length > 0) {
        query = query.overlaps('tags', tags);
    }

    if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,content_text.ilike.%${search}%`);
    }

    if (!includeArchived) {
        query = query.neq('visibility', 'archived');
    }

    // Apply sorting and pagination
    query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;
    return data;
}

/**
 * Get a single context asset by ID
 * @param {string} assetId - Asset UUID
 * @param {string} userId - User UUID (for authorization)
 * @returns {Promise<Object>} Asset object
 */
async function getAssetById(assetId, userId) {
    const { data, error } = await supabase
        .from('context_assets')
        .select(`
            *,
            context_asset_types (
                display_name,
                icon,
                description,
                json_schema
            )
        `)
        .eq('id', assetId)
        .eq('user_id', userId)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Create a new context asset
 * @param {string} userId - User UUID
 * @param {Object} assetData - Asset data
 * @returns {Promise<Object>} Created asset
 */
async function createAsset(userId, assetData) {
    const {
        asset_type,
        name,
        description = null,
        content_json = {},
        content_text = null,
        tags = [],
        visibility = 'private'
    } = assetData;

    // Validate asset type exists
    const assetType = await getAssetTypeByKey(asset_type);
    if (!assetType) {
        throw new Error(`Invalid asset type: ${asset_type}`);
    }

    // Generate content_text from JSON if not provided
    const finalContentText = content_text || generateContentText(content_json);

    const { data, error } = await supabase
        .from('context_assets')
        .insert({
            user_id: userId,
            asset_type,
            name,
            description,
            content_json,
            content_text: finalContentText,
            tags,
            visibility,
            version: 1,
            is_current: true,
            created_by: userId
        })
        .select(`
            *,
            context_asset_types (
                display_name,
                icon,
                description
            )
        `)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update a context asset (triggers auto-versioning via database trigger)
 * @param {string} assetId - Asset UUID
 * @param {string} userId - User UUID (for authorization)
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated asset
 */
async function updateAsset(assetId, userId, updates) {
    // First verify ownership
    const existing = await getAssetById(assetId, userId);
    if (!existing) {
        throw new Error('Asset not found or access denied');
    }

    // Prepare update object (only allowed fields)
    const allowedFields = ['name', 'description', 'content_json', 'content_text', 'tags', 'visibility'];
    const updateData = {};
    
    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            updateData[field] = updates[field];
        }
    }

    // Regenerate content_text if content_json changed
    if (updateData.content_json && !updateData.content_text) {
        updateData.content_text = generateContentText(updateData.content_json);
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
        .from('context_assets')
        .update(updateData)
        .eq('id', assetId)
        .eq('user_id', userId)
        .select(`
            *,
            context_asset_types (
                display_name,
                icon,
                description
            )
        `)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete (archive) a context asset
 * @param {string} assetId - Asset UUID
 * @param {string} userId - User UUID (for authorization)
 * @param {boolean} hardDelete - If true, permanently delete
 * @returns {Promise<boolean>} Success status
 */
async function deleteAsset(assetId, userId, hardDelete = false) {
    // Verify ownership first
    const existing = await getAssetById(assetId, userId);
    if (!existing) {
        throw new Error('Asset not found or access denied');
    }

    if (hardDelete) {
        const { error } = await supabase
            .from('context_assets')
            .delete()
            .eq('id', assetId)
            .eq('user_id', userId);

        if (error) throw error;
    } else {
        // Soft delete - set visibility to archived
        const { error } = await supabase
            .from('context_assets')
            .update({ 
                visibility: 'archived',
                updated_at: new Date().toISOString()
            })
            .eq('id', assetId)
            .eq('user_id', userId);

        if (error) throw error;
    }

    return true;
}

/**
 * Restore an archived asset
 * @param {string} assetId - Asset UUID
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Restored asset
 */
async function restoreAsset(assetId, userId) {
    const { data, error } = await supabase
        .from('context_assets')
        .update({ 
            visibility: 'private',
            updated_at: new Date().toISOString()
        })
        .eq('id', assetId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ============================================================
// VERSION HISTORY
// ============================================================

/**
 * Get version history for an asset
 * @param {string} assetId - Asset UUID
 * @param {string} userId - User UUID (for authorization)
 * @returns {Promise<Array>} Array of versions
 */
async function getAssetVersions(assetId, userId) {
    // First verify ownership
    const existing = await getAssetById(assetId, userId);
    if (!existing) {
        throw new Error('Asset not found or access denied');
    }

    const { data, error } = await supabase
        .from('context_asset_versions')
        .select('*')
        .eq('asset_id', assetId)
        .order('version', { ascending: false });

    if (error) throw error;

    // Include current version at the top
    return [
        {
            id: existing.id,
            asset_id: assetId,
            version: existing.version,
            content_json: existing.content_json,
            content_text: existing.content_text,
            change_summary: 'Current version',
            created_at: existing.updated_at,
            is_current: true
        },
        ...data.map(v => ({ ...v, is_current: false }))
    ];
}

/**
 * Rollback to a previous version
 * @param {string} assetId - Asset UUID
 * @param {string} userId - User UUID
 * @param {number} targetVersion - Version number to restore
 * @returns {Promise<Object>} Updated asset
 */
async function rollbackToVersion(assetId, userId, targetVersion) {
    // Verify ownership
    const existing = await getAssetById(assetId, userId);
    if (!existing) {
        throw new Error('Asset not found or access denied');
    }

    // Get the target version
    const { data: versionData, error: versionError } = await supabase
        .from('context_asset_versions')
        .select('*')
        .eq('asset_id', assetId)
        .eq('version', targetVersion)
        .single();

    if (versionError || !versionData) {
        throw new Error(`Version ${targetVersion} not found`);
    }

    // Update with the old content (this will trigger auto-versioning)
    return updateAsset(assetId, userId, {
        content_json: versionData.content_json,
        content_text: versionData.content_text
    });
}

// ============================================================
// USAGE TRACKING
// ============================================================

/**
 * Increment usage count for an asset
 * @param {string} assetId - Asset UUID
 */
async function incrementUsage(assetId) {
    const { error } = await supabase.rpc('increment_asset_usage', { 
        asset_id: assetId 
    });

    // If RPC doesn't exist, do it manually
    if (error) {
        await supabase
            .from('context_assets')
            .update({ 
                usage_count: supabase.sql`usage_count + 1`,
                last_used_at: new Date().toISOString()
            })
            .eq('id', assetId);
    }
}

/**
 * Get assets by type for a user
 * @param {string} userId - User UUID
 * @param {string} assetType - Asset type key
 * @returns {Promise<Array>} Array of assets
 */
async function getAssetsByType(userId, assetType) {
    return getAssets(userId, { assetType });
}

// ============================================================
// BULK OPERATIONS
// ============================================================

/**
 * Create multiple assets at once
 * @param {string} userId - User UUID
 * @param {Array} assets - Array of asset data objects
 * @returns {Promise<Array>} Created assets
 */
async function bulkCreateAssets(userId, assets) {
    const preparedAssets = assets.map(asset => ({
        user_id: userId,
        asset_type: asset.asset_type,
        name: asset.name,
        description: asset.description || null,
        content_json: asset.content_json || {},
        content_text: asset.content_text || generateContentText(asset.content_json || {}),
        tags: asset.tags || [],
        visibility: asset.visibility || 'private',
        version: 1,
        is_current: true,
        created_by: userId
    }));

    const { data, error } = await supabase
        .from('context_assets')
        .insert(preparedAssets)
        .select();

    if (error) throw error;
    return data;
}

/**
 * Export all assets for a user
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Export data
 */
async function exportAssets(userId) {
    const assets = await getAssets(userId, { limit: 1000 });
    
    return {
        exported_at: new Date().toISOString(),
        version: '1.0',
        asset_count: assets.length,
        assets: assets.map(a => ({
            asset_type: a.asset_type,
            name: a.name,
            description: a.description,
            content_json: a.content_json,
            tags: a.tags
        }))
    };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Generate plain text from JSON content for search
 * @param {Object} json - JSON content
 * @returns {string} Plain text representation
 */
function generateContentText(json) {
    if (!json || typeof json !== 'object') return '';
    
    const extractText = (obj, prefix = '') => {
        let text = [];
        
        for (const [key, value] of Object.entries(obj)) {
            if (value === null || value === undefined) continue;
            
            if (typeof value === 'string') {
                text.push(value);
            } else if (Array.isArray(value)) {
                value.forEach(item => {
                    if (typeof item === 'string') {
                        text.push(item);
                    } else if (typeof item === 'object') {
                        text.push(extractText(item));
                    }
                });
            } else if (typeof value === 'object') {
                text.push(extractText(value));
            }
        }
        
        return text.join(' ');
    };
    
    return extractText(json).substring(0, 10000); // Limit to 10k chars
}

/**
 * Validate content against JSON schema
 * @param {Object} content - Content to validate
 * @param {Object} schema - JSON schema
 * @returns {Object} Validation result {valid: boolean, errors: array}
 */
function validateContent(content, schema) {
    // Basic validation - can be enhanced with ajv or similar
    const errors = [];
    
    if (!schema || !schema.properties) {
        return { valid: true, errors: [] };
    }
    
    // Check required fields
    if (schema.required && Array.isArray(schema.required)) {
        for (const field of schema.required) {
            if (content[field] === undefined || content[field] === null || content[field] === '') {
                errors.push(`Missing required field: ${field}`);
            }
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    // Asset Types
    getAssetTypes,
    getAssetTypeByKey,
    
    // CRUD
    getAssets,
    getAssetById,
    createAsset,
    updateAsset,
    deleteAsset,
    restoreAsset,
    
    // Versions
    getAssetVersions,
    rollbackToVersion,
    
    // Usage
    incrementUsage,
    getAssetsByType,
    
    // Bulk
    bulkCreateAssets,
    exportAssets,
    
    // Helpers
    generateContentText,
    validateContent
};
