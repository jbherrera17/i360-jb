/**
 * Context Assets API Routes - Insight 360
 * Phase 3: Context Assets Management
 * Version: 2.2.2 - Fixed version history duplicate key issue
 * 
 * Endpoints:
 * - GET    /api/context/types          - List asset types
 * - GET    /api/context/assets         - List assets (with filters)
 * - GET    /api/context/assets/:id     - Get single asset
 * - POST   /api/context/assets         - Create asset
 * - PUT    /api/context/assets/:id     - Update asset (creates version)
 * - DELETE /api/context/assets/:id     - Delete/archive asset
 * - GET    /api/context/assets/:id/versions - Get version history
 * - POST   /api/context/assets/:id/rollback - Rollback to version
 * - GET    /api/context/stats          - Get usage statistics
 * - GET    /api/context/tags           - Get all tags
 * - POST   /api/context/import         - Bulk import
 * - GET    /api/context/export         - Export assets
 * - PUT    /api/context/assets/:id/usage - Increment usage
 */

const express = require('express');
const router = express.Router();
const { randomUUID: uuidv4 } = require('crypto');

// ============================================
// ASSET TYPE DEFINITIONS
// ============================================

const ASSET_TYPES = {
    // Core Asset Types
    company_description: { icon: '🏢', display_name: 'Company Description', category: 'core' },
    why_we_win: { icon: '🏆', display_name: 'Why We Win', category: 'core' },
    products: { icon: '📦', display_name: 'Products', category: 'core' },
    pain_points: { icon: '🎯', display_name: 'Pain Points We Solve', category: 'core' },
    voice_dna: { icon: '🎤', display_name: 'VoiceDNA', category: 'core' },
    icp: { icon: '👤', display_name: 'ICP', category: 'core' },
    core_values: { icon: '💎', display_name: 'Core Values', category: 'core' },
    custom_processes: { icon: '⚙️', display_name: 'Custom Processes', category: 'core' },
    
    // Extended Asset Types
    competitors: { icon: '⚔️', display_name: 'Competitors', category: 'extended' },
    case_studies: { icon: '📖', display_name: 'Case Studies', category: 'extended' },
    faqs: { icon: '❓', display_name: 'FAQs', category: 'extended' },
    team_bios: { icon: '👥', display_name: 'Team Bios', category: 'extended' },
    industry_context: { icon: '🌐', display_name: 'Industry Context', category: 'extended' },
    terminology: { icon: '📚', display_name: 'Terminology', category: 'extended' },
    templates: { icon: '📝', display_name: 'Templates', category: 'extended' },
    pricing: { icon: '💰', display_name: 'Pricing', category: 'extended' },
    brand_guidelines: { icon: '🎨', display_name: 'Brand Guidelines', category: 'extended' },
    personas: { icon: '🎭', display_name: 'Personas', category: 'extended' }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get Supabase client from request
 */
function getSupabase(req) {
    if (!req.supabase) {
        throw new Error('Supabase client not available');
    }
    return req.supabase;
}

/**
 * Generate plain text from JSON for search indexing
 */
function generateContentText(contentJson) {
    if (!contentJson || typeof contentJson !== 'object') return '';
    
    const extractText = (obj, depth = 0) => {
        if (depth > 10) return '';
        
        if (typeof obj === 'string') return obj;
        if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
        
        if (Array.isArray(obj)) {
            return obj.map(item => extractText(item, depth + 1)).filter(Boolean).join(' ');
        }
        
        if (typeof obj === 'object' && obj !== null) {
            return Object.entries(obj)
                .map(([key, value]) => {
                    const keyText = key.replace(/_/g, ' ');
                    const valueText = extractText(value, depth + 1);
                    return valueText ? `${keyText}: ${valueText}` : '';
                })
                .filter(Boolean)
                .join(' ');
        }
        
        return '';
    };
    
    return extractText(contentJson).trim().substring(0, 10000);
}

/**
 * Get user ID from request (with fallback for dev)
 */
function getUserId(req) {
    // Try to get from authenticated user
    if (req.user?.id) return req.user.id;
    
    // Development fallback - use a consistent dev user ID
    // In production, this should throw an error or return null
    return process.env.NODE_ENV === 'production' ? null : 'dev-user-id';
}

// ============================================
// GET /api/context/types
// List all asset types
// ============================================
router.get('/types', (req, res) => {
    const types = Object.entries(ASSET_TYPES).map(([key, value]) => ({
        type_key: key,
        ...value
    }));
    
    res.json({
        success: true,
        data: types,
        count: types.length
    });
});

// ============================================
// GET /api/context/assets
// List assets with optional filters
// ============================================
router.get('/assets', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { 
            type, 
            search, 
            tags, 
            current = 'true',
            archived,
            limit = 100, 
            offset = 0,
            sort = 'updated_at',
            order = 'desc'
        } = req.query;
        
        let query = supabase
            .from('context_assets')
            .select('*')
            .order(sort, { ascending: order === 'asc' })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
        
        // Filter by type
        if (type) {
            query = query.eq('asset_type', type);
        }
        
        // Filter by current/archived status
        if (archived === 'true') {
            query = query.eq('is_current', false);
        } else if (current === 'true') {
            query = query.eq('is_current', true);
        }
        
        // Search in name and content_text
        if (search) {
            query = query.or(`name.ilike.%${search}%,content_text.ilike.%${search}%`);
        }
        
        // Filter by tags
        if (tags) {
            const tagList = tags.split(',');
            query = query.overlaps('tags', tagList);
        }
        
        const { data, error, count } = await query;
        
        if (error) throw error;
        
        // Enrich with type info
        const enrichedData = (data || []).map(asset => ({
            ...asset,
            type_info: ASSET_TYPES[asset.asset_type] || { icon: '📄', display_name: asset.asset_type }
        }));
        
        res.json({
            success: true,
            data: enrichedData,
            count: enrichedData.length
        });
        
    } catch (error) {
        console.error('Error listing assets:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// GET /api/context/assets/:id
// Get single asset by ID
// ============================================
router.get('/assets/:id', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('context_assets')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'Asset not found'
            });
        }
        
        res.json({
            success: true,
            data: {
                ...data,
                type_info: ASSET_TYPES[data.asset_type] || { icon: '📄', display_name: data.asset_type }
            }
        });
        
    } catch (error) {
        console.error('Error getting asset:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// POST /api/context/assets
// Create new asset
// ============================================
router.post('/assets', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { 
            asset_type, 
            name, 
            description, 
            content_json, 
            tags = [],
            visibility = 'private'
        } = req.body;
        
        // Validation
        if (!asset_type || !name) {
            return res.status(400).json({
                success: false,
                error: 'asset_type and name are required'
            });
        }
        
        if (!ASSET_TYPES[asset_type]) {
            return res.status(400).json({
                success: false,
                error: `Invalid asset_type: ${asset_type}`
            });
        }
        
        // Generate content_text from JSON
        const content_text = generateContentText(content_json || {});
        
        const userId = getUserId(req);
        const assetId = uuidv4();
        
        const newAsset = {
            id: assetId,
            user_id: userId,
            asset_type,
            name,
            description: description || '',
            content_json: content_json || {},
            content_text,
            tags: Array.isArray(tags) ? tags : [],
            visibility,
            version: 1,
            is_current: true,
            usage_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: userId
        };
        
        const { data, error } = await supabase
            .from('context_assets')
            .insert(newAsset)
            .select()
            .single();
        
        if (error) throw error;
        
        // NOTE: We do NOT create a version history record on initial creation
        // Version history is only created when the asset is UPDATED
        // This prevents the duplicate key issue
        
        res.status(201).json({
            success: true,
            data: {
                ...data,
                type_info: ASSET_TYPES[data.asset_type]
            },
            message: 'Asset created successfully'
        });
        
    } catch (error) {
        console.error('Error creating asset:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// PUT /api/context/assets/:id
// Update asset (creates version history)
// ============================================
router.put('/assets/:id', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { id } = req.params;
        const { 
            name, 
            description, 
            content_json, 
            tags, 
            change_summary,
            visibility
        } = req.body;
        
        // Get current asset
        const { data: current, error: fetchError } = await supabase
            .from('context_assets')
            .select('*')
            .eq('id', id)
            .single();
        
        if (fetchError || !current) {
            return res.status(404).json({
                success: false,
                error: 'Asset not found'
            });
        }
        
        const userId = getUserId(req);
        const currentVersion = current.version || 1;
        const newVersion = currentVersion + 1;
        
        // Check if content actually changed
        const contentChanged = content_json && 
            JSON.stringify(content_json) !== JSON.stringify(current.content_json);
        
        // Only save to version history if content changed
        if (contentChanged) {
            // Save CURRENT state to version history BEFORE updating
            const versionRecord = {
                id: uuidv4(),
                asset_id: id,
                version: currentVersion, // Save as the CURRENT version number
                content_json: current.content_json,
                content_text: current.content_text,
                change_summary: change_summary || `Updated to version ${newVersion}`,
                created_at: new Date().toISOString(),
                created_by: userId
            };
            
            // Check if this version already exists in history
            const { data: existingVersion } = await supabase
                .from('context_asset_versions')
                .select('id')
                .eq('asset_id', id)
                .eq('version', currentVersion)
                .single();
            
            // Only insert if version doesn't exist yet
            if (!existingVersion) {
                const { error: versionError } = await supabase
                    .from('context_asset_versions')
                    .insert(versionRecord);
                
                if (versionError) {
                    console.error('Version history error:', versionError);
                    // Continue with update even if version history fails
                }
            }
        }
        
        // Prepare update data
        const updateData = {
            updated_at: new Date().toISOString()
        };
        
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
        if (visibility !== undefined) updateData.visibility = visibility;
        
        if (content_json !== undefined) {
            updateData.content_json = content_json;
            updateData.content_text = generateContentText(content_json);
            updateData.version = newVersion; // Only increment version if content changed
        }
        
        // Update asset
        const { data, error } = await supabase
            .from('context_assets')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            data: {
                ...data,
                type_info: ASSET_TYPES[data.asset_type] || { icon: '📄', display_name: data.asset_type }
            },
            message: contentChanged ? `Updated to version ${newVersion}` : 'Updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating asset:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// DELETE /api/context/assets/:id
// Delete asset (soft delete by default)
// ============================================
router.delete('/assets/:id', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { id } = req.params;
        const { hard = 'false' } = req.query;
        
        if (hard === 'true') {
            // Hard delete - remove from database
            // First delete version history
            await supabase
                .from('context_asset_versions')
                .delete()
                .eq('asset_id', id);
            
            // Then delete asset
            const { error } = await supabase
                .from('context_assets')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            res.json({
                success: true,
                message: 'Asset permanently deleted'
            });
        } else {
            // Soft delete - mark as archived
            const { error } = await supabase
                .from('context_assets')
                .update({ 
                    is_current: false, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', id);
            
            if (error) throw error;
            
            res.json({
                success: true,
                message: 'Asset archived'
            });
        }
        
    } catch (error) {
        console.error('Error deleting asset:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// GET /api/context/assets/:id/versions
// Get version history for an asset
// ============================================
router.get('/assets/:id/versions', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('context_asset_versions')
            .select('*')
            .eq('asset_id', id)
            .order('version', { ascending: false });
        
        if (error) throw error;
        
        res.json({
            success: true,
            data: data || [],
            count: (data || []).length
        });
        
    } catch (error) {
        console.error('Error getting versions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// POST /api/context/assets/:id/rollback
// Rollback to a specific version
// ============================================
router.post('/assets/:id/rollback', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { id } = req.params;
        const { version } = req.body;
        
        if (!version) {
            return res.status(400).json({
                success: false,
                error: 'version is required'
            });
        }
        
        // Get the version to rollback to
        const { data: versionData, error: versionError } = await supabase
            .from('context_asset_versions')
            .select('*')
            .eq('asset_id', id)
            .eq('version', version)
            .single();
        
        if (versionError || !versionData) {
            return res.status(404).json({
                success: false,
                error: `Version ${version} not found`
            });
        }
        
        // Get current asset
        const { data: current } = await supabase
            .from('context_assets')
            .select('version, content_json, content_text')
            .eq('id', id)
            .single();
        
        const userId = getUserId(req);
        const newVersion = (current?.version || 1) + 1;
        
        // Save current state to history before rollback
        if (current) {
            await supabase
                .from('context_asset_versions')
                .insert({
                    id: uuidv4(),
                    asset_id: id,
                    version: current.version,
                    content_json: current.content_json,
                    content_text: current.content_text,
                    change_summary: `Before rollback to version ${version}`,
                    created_at: new Date().toISOString(),
                    created_by: userId
                });
        }
        
        // Update asset with rolled-back content
        const { data, error } = await supabase
            .from('context_assets')
            .update({
                content_json: versionData.content_json,
                content_text: versionData.content_text,
                version: newVersion,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            data: {
                ...data,
                type_info: ASSET_TYPES[data.asset_type]
            },
            message: `Rolled back to version ${version}`
        });
        
    } catch (error) {
        console.error('Error rolling back:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// GET /api/context/stats
// Get usage statistics
// ============================================
router.get('/stats', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        
        // Get counts by type
        const { data: assets, error } = await supabase
            .from('context_assets')
            .select('asset_type, is_current, usage_count');
        
        if (error) throw error;
        
        const stats = {
            total: assets.length,
            current: assets.filter(a => a.is_current).length,
            archived: assets.filter(a => !a.is_current).length,
            total_usage: assets.reduce((sum, a) => sum + (a.usage_count || 0), 0),
            by_type: {}
        };
        
        // Count by type
        assets.forEach(asset => {
            if (!stats.by_type[asset.asset_type]) {
                stats.by_type[asset.asset_type] = { 
                    count: 0, 
                    usage: 0,
                    ...ASSET_TYPES[asset.asset_type]
                };
            }
            stats.by_type[asset.asset_type].count++;
            stats.by_type[asset.asset_type].usage += asset.usage_count || 0;
        });
        
        res.json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// GET /api/context/tags
// Get all unique tags
// ============================================
router.get('/tags', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        
        const { data, error } = await supabase
            .from('context_assets')
            .select('tags')
            .eq('is_current', true);
        
        if (error) throw error;
        
        // Flatten and deduplicate tags
        const allTags = new Set();
        (data || []).forEach(asset => {
            (asset.tags || []).forEach(tag => allTags.add(tag));
        });
        
        res.json({
            success: true,
            data: Array.from(allTags).sort(),
            count: allTags.size
        });
        
    } catch (error) {
        console.error('Error getting tags:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// POST /api/context/import
// Bulk import assets
// ============================================
router.post('/import', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { assets, mode = 'merge' } = req.body;
        
        if (!Array.isArray(assets) || assets.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'assets array is required'
            });
        }
        
        const userId = getUserId(req);
        const results = { created: 0, updated: 0, errors: [] };
        
        for (const asset of assets) {
            try {
                if (!asset.asset_type || !asset.name) {
                    results.errors.push(`Missing asset_type or name for asset`);
                    continue;
                }
                
                const content_text = generateContentText(asset.content_json || {});
                
                const newAsset = {
                    id: uuidv4(),
                    user_id: userId,
                    asset_type: asset.asset_type,
                    name: asset.name,
                    description: asset.description || '',
                    content_json: asset.content_json || {},
                    content_text,
                    tags: asset.tags || [],
                    visibility: asset.visibility || 'private',
                    version: 1,
                    is_current: true,
                    usage_count: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    created_by: userId
                };
                
                const { error } = await supabase
                    .from('context_assets')
                    .insert(newAsset);
                
                if (error) throw error;
                results.created++;
                
            } catch (err) {
                results.errors.push(`Failed to import "${asset.name}": ${err.message}`);
            }
        }
        
        res.json({
            success: true,
            data: results,
            message: `Imported ${results.created} assets`
        });
        
    } catch (error) {
        console.error('Error importing:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// GET /api/context/export
// Export assets
// ============================================
router.get('/export', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { type, format = 'json' } = req.query;
        
        let query = supabase
            .from('context_assets')
            .select('asset_type, name, description, content_json, tags')
            .eq('is_current', true);
        
        if (type) {
            query = query.eq('asset_type', type);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        const exportData = {
            exported_at: new Date().toISOString(),
            version: '1.0',
            count: data.length,
            assets: data
        };
        
        if (format === 'csv') {
            // Convert to CSV
            const headers = ['asset_type', 'name', 'description', 'tags', 'content_json'];
            const rows = data.map(a => [
                a.asset_type,
                `"${(a.name || '').replace(/"/g, '""')}"`,
                `"${(a.description || '').replace(/"/g, '""')}"`,
                `"${(a.tags || []).join(', ')}"`,
                `"${JSON.stringify(a.content_json || {}).replace(/"/g, '""')}"`
            ]);
            
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=context-assets-export.csv');
            return res.send(csv);
        }
        
        res.json(exportData);
        
    } catch (error) {
        console.error('Error exporting:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// PUT /api/context/assets/:id/usage
// Increment usage count
// ============================================
router.put('/assets/:id/usage', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { id } = req.params;
        
        // Get current usage count
        const { data: asset, error: fetchError } = await supabase
            .from('context_assets')
            .select('usage_count')
            .eq('id', id)
            .single();
        
        if (fetchError) throw fetchError;
        
        // Increment
        const { error } = await supabase
            .from('context_assets')
            .update({
                usage_count: (asset?.usage_count || 0) + 1,
                last_used_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'Usage count incremented'
        });
        
    } catch (error) {
        console.error('Error updating usage:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
