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
const { getUserId } = require('../utils/auth');

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
            department_id,
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

        // Filter by department (show assets for this dept OR assets with no dept)
        if (department_id) {
            query = query.or(`department_id.eq.${department_id},department_id.is.null`);
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
            visibility = 'private',
            department_id = null
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
            created_by: userId,
            department_id: department_id || null
        };
        
        const { data, error } = await supabase
            .from('context_assets')
            .insert(newAsset)
            .select()
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.status(500).json({
                success: false,
                error: 'Failed to create asset'
            });
        }

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
            visibility,
            department_id
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
            // Check if this version already exists in history FIRST
            const { data: existingVersion } = await supabase
                .from('context_asset_versions')
                .select('id')
                .eq('asset_id', id)
                .eq('version', currentVersion)
                .maybeSingle(); // Use maybeSingle instead of single to avoid error if not found

            // Only insert if version doesn't exist yet
            if (!existingVersion) {
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
        if (department_id !== undefined) updateData.department_id = department_id || null;

        if (content_json !== undefined) {
            updateData.content_json = content_json;
            updateData.content_text = generateContentText(content_json);
            // Only increment version if content changed
            if (contentChanged) {
                updateData.version = newVersion;
            }
        }
        
        // Update asset
        const { data, error } = await supabase
            .from('context_assets')
            .update(updateData)
            .eq('id', id)
            .select()
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'Asset not found or update failed'
            });
        }
        
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

// ============================================
// POST /api/context/generate
// Generate asset content using AI
// ============================================
router.post('/generate', async (req, res) => {
    try {
        const { asset_type, company_name, description, additional_context } = req.body;

        // Validate required fields
        if (!asset_type) {
            return res.status(400).json({
                success: false,
                error: 'Asset type is required'
            });
        }

        if (!description) {
            return res.status(400).json({
                success: false,
                error: 'Description is required'
            });
        }

        // Get asset type info
        const assetTypeInfo = ASSET_TYPES[asset_type];
        if (!assetTypeInfo) {
            return res.status(400).json({
                success: false,
                error: 'Invalid asset type'
            });
        }

        // Build the prompt based on asset type
        const prompts = {
            company_description: `Create a comprehensive company description for "${company_name || 'the company'}". Include:
- Mission and vision
- What the company does
- Target market
- Key differentiators
- Company culture and values

User's context: ${description}`,

            why_we_win: `Create a compelling "Why We Win" document for "${company_name || 'the company'}". Include:
- Unique value propositions
- Competitive advantages
- Key differentiators
- Success factors
- What makes customers choose this company

User's context: ${description}`,

            products: `Create a detailed products/services overview for "${company_name || 'the company'}". Include:
- Product/service names and descriptions
- Key features and benefits
- Target use cases
- Pricing tiers (if applicable)
- Integration capabilities

User's context: ${description}`,

            pain_points: `Identify and document the pain points that "${company_name || 'the company'}" solves. Include:
- Customer challenges before using the solution
- Industry-specific pain points
- How each pain point impacts the customer
- How the company's solution addresses each pain point

User's context: ${description}`,

            voice_dna: `Create a VoiceDNA guide for "${company_name || 'the company'}". Include:
- Tone of voice characteristics
- Writing style guidelines
- Words and phrases to use
- Words and phrases to avoid
- Example sentences in the brand voice
- Personality traits

User's context: ${description}`,

            icp: `Create an Ideal Customer Profile (ICP) for "${company_name || 'the company'}". Include:
- Demographics (company size, industry, location)
- Firmographics
- Psychographics (values, goals, challenges)
- Buying behavior
- Decision-making process
- Key stakeholders

User's context: ${description}`,

            core_values: `Define the core values for "${company_name || 'the company'}". Include:
- 4-6 core values with names
- Description of what each value means
- How each value is demonstrated in practice
- Why each value matters to the company

User's context: ${description}`,

            custom_processes: `Document custom processes for "${company_name || 'the company'}". Include:
- Process name and purpose
- Step-by-step workflow
- Key stakeholders involved
- Tools and resources needed
- Success metrics

User's context: ${description}`,

            competitors: `Create a competitor analysis for "${company_name || 'the company'}". Include:
- Key competitors
- Their strengths and weaknesses
- Market positioning
- Pricing comparison
- How to differentiate against each

User's context: ${description}`,

            case_studies: `Create a case study template/example for "${company_name || 'the company'}". Include:
- Customer background
- Challenge/problem faced
- Solution implemented
- Results and metrics
- Customer quote/testimonial

User's context: ${description}`,

            faqs: `Create frequently asked questions for "${company_name || 'the company'}". Include:
- 10-15 common questions
- Clear, helpful answers
- Categories (product, pricing, support, etc.)

User's context: ${description}`,

            team_bios: `Create team bio templates for "${company_name || 'the company'}". Include:
- Professional background
- Role and responsibilities
- Expertise areas
- Personal interests
- Contact information format

User's context: ${description}`,

            industry_context: `Provide industry context for "${company_name || 'the company'}". Include:
- Industry overview
- Market trends
- Key challenges in the industry
- Regulatory considerations
- Future outlook

User's context: ${description}`,

            terminology: `Create a terminology guide for "${company_name || 'the company'}". Include:
- Industry-specific terms
- Company-specific terms
- Acronyms and abbreviations
- Clear definitions
- Usage examples

User's context: ${description}`,

            templates: `Create content templates for "${company_name || 'the company'}". Include:
- Email templates
- Social media templates
- Document templates
- Communication guidelines

User's context: ${description}`,

            pricing: `Document pricing information for "${company_name || 'the company'}". Include:
- Pricing tiers
- What's included in each tier
- Add-ons and extras
- Discounts and promotions
- Pricing strategy notes

User's context: ${description}`,

            brand_guidelines: `Create brand guidelines for "${company_name || 'the company'}". Include:
- Logo usage
- Color palette
- Typography
- Imagery style
- Voice and tone
- Do's and don'ts

User's context: ${description}`,

            personas: `Create customer personas for "${company_name || 'the company'}". Include:
- Persona name and demographics
- Goals and motivations
- Pain points and challenges
- Buying behavior
- Preferred communication channels
- How the product/service helps them

User's context: ${description}`
        };

        const userPrompt = prompts[asset_type] || `Create content for a ${assetTypeInfo.display_name} asset for "${company_name || 'the company'}".

User's context: ${description}`;

        const systemPrompt = `You are an expert business strategist and content creator. Generate professional, comprehensive content for business context assets.

Your output should be:
- Well-structured with clear sections
- Professional yet approachable tone
- Specific and actionable, not generic
- Ready to use as a business document

Format your response in clean markdown with headers, bullet points, and sections as appropriate.${additional_context ? `\n\nAdditional context to consider:\n${additional_context}` : ''}`;

        // Check for Anthropic API key
        if (!process.env.ANTHROPIC_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'Anthropic API key not configured'
            });
        }

        // Call Anthropic API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: userPrompt }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Anthropic API error:', errorData);
            return res.status(500).json({
                success: false,
                error: 'Failed to generate content: ' + (errorData.error?.message || 'API error')
            });
        }

        const data = await response.json();
        const generatedContent = data.content?.[0]?.text || '';

        res.json({
            success: true,
            content: generatedContent,
            usage: {
                input_tokens: data.usage?.input_tokens || 0,
                output_tokens: data.usage?.output_tokens || 0
            }
        });

    } catch (error) {
        console.error('Error generating content:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// POST /api/context/parse
// Parse raw content into structured asset using AI
// ============================================
router.post('/parse', async (req, res) => {
    try {
        const { content, preferred_type, source } = req.body;

        // Validate required fields
        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Content is required'
            });
        }

        if (content.length < 50) {
            return res.status(400).json({
                success: false,
                error: 'Content is too short to analyze'
            });
        }

        // Check for Anthropic API key
        if (!process.env.ANTHROPIC_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'Anthropic API key not configured'
            });
        }

        // Build the system prompt with all asset type schemas
        const systemPrompt = `You are an AI system architect for Insight 360, a values-based AI ecosystem.

Your task is to convert the provided content into a structured Context Asset in JSON format.

## AVAILABLE ASSET TYPES (18 Total)

### Core Types (8)
1. company_description - Who we are, mission, history, and vision
2. why_we_win - Competitive differentiation and unique value proposition
3. products - Offerings, features, benefits, and pricing
4. pain_points - Customer problems we address
5. voice_dna - Brand voice, tone, style rules, and writing guidelines
6. icp - Target customer segments and profiles (Ideal Customer Profile)
7. core_values - Guiding principles and organizational beliefs
8. custom_processes - Internal workflows, methodologies, and procedures

### Extended Types (10)
9. competitors - Competitive landscape and analysis
10. case_studies - Success stories and customer testimonials
11. faqs - Common questions and objection handling
12. team_bios - Key people, expertise, and backgrounds
13. industry_context - Market trends, regulations, and landscape
14. terminology - Domain-specific glossary and definitions
15. templates - Email, proposal, and content templates
16. pricing - Pricing structure, packages, and terms
17. brand_guidelines - Visual identity, colors, and usage rules
18. personas - Detailed buyer personas for targeting

## TYPE-SPECIFIC CONTENT SCHEMAS

### company_description
{ "company_name": "string", "tagline": "string", "mission": "string", "vision": "string", "history": "string", "founding_year": "integer", "headquarters": "string", "team_size": "string", "key_milestones": ["string"] }

### why_we_win
{ "value_proposition": "string", "differentiators": ["string"], "competitive_advantages": ["string"], "proof_points": ["string"], "key_stats": {} }

### products
{ "offerings": [{ "name": "string", "type": "string", "tagline": "string", "description": "string", "features": ["string"], "benefits": ["string"], "ideal_for": ["string"], "pricing_model": "string" }] }

### pain_points
{ "pain_points": [{ "problem": "string", "impact": "string", "our_solution": "string", "outcome": "string" }] }

### voice_dna
{ "brand_name": "string", "personality_traits": ["string"], "tone": "string", "writing_style": { "sentence_length": "string", "vocabulary_level": "string", "perspective": "string" }, "do": ["string"], "dont": ["string"], "signature_phrases": ["string"], "avoid_phrases": ["string"] }

### icp
{ "segments": [{ "name": "string", "priority": "integer", "demographics": { "company_size": "string", "revenue_range": "string", "industries": ["string"], "geography": "string" }, "psychographics": { "values": ["string"], "motivations": ["string"], "fears": ["string"] }, "pain_points": ["string"], "goals": ["string"], "objections": ["string"], "buying_triggers": ["string"] }] }

### core_values
{ "values": [{ "name": "string", "description": "string", "behaviors": ["string"], "anti_behaviors": ["string"] }] }

### custom_processes
{ "processes": [{ "name": "string", "purpose": "string", "steps": ["string"], "owner": "string", "frequency": "string", "tools_used": ["string"] }] }

### competitors
{ "competitors": [{ "name": "string", "website": "string", "strengths": ["string"], "weaknesses": ["string"], "positioning": "string", "our_advantage": "string" }] }

### case_studies
{ "case_studies": [{ "id": "string", "client_name": "string", "industry": "string", "challenge": "string", "solution": "string", "results": ["string"], "testimonial": "string", "metrics": {} }] }

### faqs
{ "categories": [{ "category": "string", "questions": [{ "question": "string", "answer": "string", "related_to": ["string"] }] }] }

### team_bios
{ "team_members": [{ "name": "string", "title": "string", "role": "string", "bio": "string", "expertise": ["string"], "linkedin": "string", "email": "string" }] }

### industry_context
{ "industry_name": "string", "market_size": "string", "growth_rate": "string", "key_trends": ["string"], "regulations": ["string"], "challenges": ["string"], "opportunities": ["string"] }

### terminology
{ "terms": [{ "term": "string", "definition": "string", "usage_example": "string", "related_terms": ["string"] }] }

### templates
{ "templates": [{ "name": "string", "type": "string", "purpose": "string", "content": "string", "variables": ["string"], "usage_notes": "string" }] }

### pricing
{ "pricing_model": "string", "currency": "string", "packages": [{ "name": "string", "price": "string", "billing_cycle": "string", "features": ["string"], "ideal_for": "string" }], "discounts": [{}], "terms": "string" }

### brand_guidelines
{ "logo_usage": "string", "colors": { "primary": "string", "secondary": "string", "accent": "string", "background": "string" }, "typography": { "heading_font": "string", "body_font": "string" }, "imagery_style": "string", "dos": ["string"], "donts": ["string"] }

### personas
{ "personas": [{ "name": "string", "role": "string", "demographics": {}, "goals": ["string"], "challenges": ["string"], "motivations": ["string"], "preferred_channels": ["string"], "messaging_approach": "string", "content_preferences": ["string"] }] }

## OUTPUT FORMAT

Return ONLY valid JSON with this exact structure (no markdown, no commentary):

{
  "asset_type": "<one of the 18 types above>",
  "name": "<descriptive name for this asset>",
  "description": "<1-2 sentence summary>",
  "tags": ["<relevant>", "<keywords>"],
  "content_json": {
    // Type-specific structured data matching the schema above
  },
  "metadata": {
    "source": "<where this content came from>",
    "confidence": <0.0-1.0>,
    "needs_review": ["<any fields that need human verification>"]
  }
}

## RULES

1. Output ONLY valid JSON - no markdown code blocks, no commentary
2. Select the BEST matching asset_type from the 18 available types${preferred_type ? ` (preferred: ${preferred_type})` : ''}
3. Follow the exact schema for that asset type's content_json
4. If data is unclear, use "", [], or null - do NOT invent or assume
5. Set confidence (0-1) based on how complete/certain the data is
6. List any fields needing human review in metadata.needs_review`;

        const userPrompt = `Convert this content into a structured Context Asset:

${source ? `Source: ${source}\n\n` : ''}Content:
${content.substring(0, 15000)}`;

        // Call Anthropic API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: userPrompt }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Anthropic API error:', errorData);
            return res.status(500).json({
                success: false,
                error: 'Failed to parse content: ' + (errorData.error?.message || 'API error')
            });
        }

        const data = await response.json();
        const generatedText = data.content?.[0]?.text || '';

        // Try to parse the JSON response
        let parsedAsset;
        try {
            // Remove any potential markdown code blocks
            let jsonText = generatedText.trim();
            if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
            }
            parsedAsset = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('Failed to parse AI response as JSON:', parseError);
            console.error('Raw response:', generatedText.substring(0, 500));
            return res.status(500).json({
                success: false,
                error: 'AI returned invalid JSON. Please try again.'
            });
        }

        // Validate the parsed asset has required fields
        if (!parsedAsset.asset_type || !parsedAsset.name || !parsedAsset.content_json) {
            return res.status(500).json({
                success: false,
                error: 'AI response missing required fields'
            });
        }

        // Validate asset_type is valid
        if (!ASSET_TYPES[parsedAsset.asset_type]) {
            console.error('Invalid asset type returned:', parsedAsset.asset_type);
            // Try to use preferred type or default to custom_processes
            parsedAsset.asset_type = preferred_type && ASSET_TYPES[preferred_type]
                ? preferred_type
                : 'custom_processes';
        }

        res.json({
            success: true,
            asset: {
                asset_type: parsedAsset.asset_type,
                name: parsedAsset.name,
                description: parsedAsset.description || '',
                tags: parsedAsset.tags || ['imported'],
                content_json: parsedAsset.content_json
            },
            metadata: parsedAsset.metadata || {
                source: source || 'User import',
                confidence: 0.8,
                needs_review: []
            },
            usage: {
                input_tokens: data.usage?.input_tokens || 0,
                output_tokens: data.usage?.output_tokens || 0
            }
        });

    } catch (error) {
        console.error('Error parsing content:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
