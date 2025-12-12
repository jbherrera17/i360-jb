/**
 * Context Assets Routes - Insight 360
 * Phase 3: Context Assets Management API
 * Version: 2.2.0
 * 
 * Endpoints:
 * GET    /api/context/assets       - List all assets (with filters)
 * GET    /api/context/assets/:id   - Get single asset
 * POST   /api/context/assets       - Create new asset
 * PUT    /api/context/assets/:id   - Update asset
 * DELETE /api/context/assets/:id   - Delete asset
 * GET    /api/context/types        - List asset types
 * GET    /api/context/assets/:id/versions - Get version history
 * POST   /api/context/assets/:id/rollback - Rollback to version
 * POST   /api/context/assets/import - Bulk import
 * GET    /api/context/assets/export - Bulk export
 * GET    /api/context/stats        - Usage statistics
 * POST   /api/context/assets/:id/duplicate - Duplicate asset
 * PATCH  /api/context/assets/:id/archive - Archive/unarchive asset
 */

const express = require('express');
const router = express.Router();

// Asset type configurations with icons and schemas
const ASSET_TYPES = {
    // Core Assets
    company_description: {
        type_key: 'company_description',
        display_name: 'Company Description',
        description: 'Who we are, mission, history, vision',
        icon: '🏢',
        category: 'core',
        sort_order: 1
    },
    why_we_win: {
        type_key: 'why_we_win',
        display_name: 'Why We Win',
        description: 'Competitive differentiation, unique value',
        icon: '🏆',
        category: 'core',
        sort_order: 2
    },
    products: {
        type_key: 'products',
        display_name: 'Products',
        description: 'Offerings, features, benefits, pricing',
        icon: '📦',
        category: 'core',
        sort_order: 3
    },
    pain_points: {
        type_key: 'pain_points',
        display_name: 'Pain Points We Solve',
        description: 'Customer problems we address',
        icon: '🎯',
        category: 'core',
        sort_order: 4
    },
    voice_dna: {
        type_key: 'voice_dna',
        display_name: 'VoiceDNA',
        description: 'Brand voice, tone, style rules',
        icon: '🎤',
        category: 'core',
        sort_order: 5
    },
    icp: {
        type_key: 'icp',
        display_name: 'ICP',
        description: 'Ideal Customer Profile segments',
        icon: '👤',
        category: 'core',
        sort_order: 6
    },
    core_values: {
        type_key: 'core_values',
        display_name: 'Core Values',
        description: 'Guiding principles and beliefs',
        icon: '💎',
        category: 'core',
        sort_order: 7
    },
    custom_processes: {
        type_key: 'custom_processes',
        display_name: 'Custom Processes',
        description: 'Internal workflows, methodologies',
        icon: '⚙️',
        category: 'core',
        sort_order: 8
    },
    // Extended Assets
    competitors: {
        type_key: 'competitors',
        display_name: 'Competitors',
        description: 'Competitive landscape analysis',
        icon: '⚔️',
        category: 'extended',
        sort_order: 9
    },
    case_studies: {
        type_key: 'case_studies',
        display_name: 'Case Studies',
        description: 'Success stories, testimonials',
        icon: '📖',
        category: 'extended',
        sort_order: 10
    },
    faqs: {
        type_key: 'faqs',
        display_name: 'FAQs',
        description: 'Common questions & objections',
        icon: '❓',
        category: 'extended',
        sort_order: 11
    },
    team_bios: {
        type_key: 'team_bios',
        display_name: 'Team Bios',
        description: 'Key people and expertise',
        icon: '👥',
        category: 'extended',
        sort_order: 12
    },
    industry_context: {
        type_key: 'industry_context',
        display_name: 'Industry Context',
        description: 'Market trends, regulations',
        icon: '🌐',
        category: 'extended',
        sort_order: 13
    },
    terminology: {
        type_key: 'terminology',
        display_name: 'Terminology',
        description: 'Domain-specific glossary',
        icon: '📚',
        category: 'extended',
        sort_order: 14
    },
    templates: {
        type_key: 'templates',
        display_name: 'Templates',
        description: 'Email, proposal, content templates',
        icon: '📝',
        category: 'extended',
        sort_order: 15
    },
    pricing: {
        type_key: 'pricing',
        display_name: 'Pricing',
        description: 'Pricing structure, packages',
        icon: '💰',
        category: 'extended',
        sort_order: 16
    },
    brand_guidelines: {
        type_key: 'brand_guidelines',
        display_name: 'Brand Guidelines',
        description: 'Visual identity, do\'s/don\'ts',
        icon: '🎨',
        category: 'extended',
        sort_order: 17
    },
    personas: {
        type_key: 'personas',
        display_name: 'Personas',
        description: 'Detailed buyer personas',
        icon: '🎭',
        category: 'extended',
        sort_order: 18
    }
};

// Example templates for new assets
const ASSET_TEMPLATES = {
    voice_dna: {
        brand_name: "",
        personality_traits: [],
        tone: "",
        writing_style: {
            sentence_length: "",
            vocabulary_level: "",
            perspective: ""
        },
        do: [],
        dont: [],
        signature_phrases: [],
        avoid_phrases: []
    },
    icp: {
        segments: [{
            name: "",
            priority: 1,
            demographics: {
                company_size: "",
                revenue_range: "",
                industries: [],
                geography: ""
            },
            psychographics: {
                values: [],
                motivations: [],
                fears: []
            },
            pain_points: [],
            goals: [],
            objections: [],
            buying_triggers: []
        }]
    },
    products: {
        offerings: [{
            name: "",
            type: "",
            tagline: "",
            description: "",
            components: [],
            ideal_for: [],
            differentiators: [],
            pricing_model: ""
        }]
    },
    company_description: {
        name: "",
        tagline: "",
        mission: "",
        vision: "",
        history: "",
        what_we_do: "",
        how_we_do_it: "",
        why_it_matters: ""
    }
};

/**
 * Helper: Get Supabase client from request
 */
function getSupabase(req) {
    if (!req.supabase) {
        throw new Error('Database connection not available');
    }
    return req.supabase;
}

/**
 * Helper: Estimate token count
 */
function estimateTokens(text) {
    if (!text) return 0;
    // Rough approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
}

/**
 * Helper: Generate plain text from JSON for search
 */
function jsonToText(json) {
    if (!json) return '';
    if (typeof json === 'string') return json;
    
    const extractText = (obj, depth = 0) => {
        if (depth > 10) return ''; // Prevent infinite recursion
        
        let text = '';
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                text += value + ' ';
            } else if (Array.isArray(value)) {
                text += value.map(v => typeof v === 'string' ? v : extractText(v, depth + 1)).join(' ') + ' ';
            } else if (typeof value === 'object' && value !== null) {
                text += extractText(value, depth + 1);
            }
        }
        return text;
    };
    
    return extractText(json).trim();
}

// ============================================
// GET /api/context/types
// List all available asset types
// ============================================
router.get('/types', (req, res) => {
    try {
        const types = Object.values(ASSET_TYPES).sort((a, b) => a.sort_order - b.sort_order);
        
        res.json({
            success: true,
            types,
            count: types.length
        });
    } catch (error) {
        console.error('Error fetching asset types:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// GET /api/context/templates/:type
// Get template for asset type
// ============================================
router.get('/templates/:type', (req, res) => {
    try {
        const { type } = req.params;
        const template = ASSET_TEMPLATES[type] || {};
        
        res.json({
            success: true,
            type,
            template
        });
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// GET /api/context/assets
// List all assets with optional filters
// ============================================
router.get('/assets', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { 
            type, 
            status = 'current', 
            search, 
            tags,
            limit = 50,
            offset = 0,
            sort = 'updated_at',
            order = 'desc'
        } = req.query;

        let query = supabase
            .from('context_assets')
            .select('*', { count: 'exact' });

        // Apply filters
        if (type) {
            query = query.eq('asset_type', type);
        }

        if (status === 'current') {
            query = query.eq('is_current', true);
        } else if (status === 'archived') {
            query = query.eq('is_current', false);
        }
        // 'all' status returns everything

        if (search) {
            query = query.or(`name.ilike.%${search}%,content_text.ilike.%${search}%`);
        }

        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : tags.split(',');
            query = query.overlaps('tags', tagArray);
        }

        // Sorting
        const ascending = order === 'asc';
        query = query.order(sort, { ascending });

        // Pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        // Enhance with type info
        const enhanced = (data || []).map(asset => ({
            ...asset,
            type_info: ASSET_TYPES[asset.asset_type] || {
                icon: '📄',
                display_name: asset.asset_type
            }
        }));

        res.json({
            success: true,
            assets: enhanced,
            count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (error) {
        console.error('Error fetching assets:', error);
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

        // Add type info and token estimate
        const enhanced = {
            ...data,
            type_info: ASSET_TYPES[data.asset_type] || { icon: '📄', display_name: data.asset_type },
            estimated_tokens: estimateTokens(data.content_text || JSON.stringify(data.content_json))
        };

        res.json({
            success: true,
            asset: enhanced
        });

    } catch (error) {
        console.error('Error fetching asset:', error);
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
            content_json = {},
            content_text,
            tags = [],
            user_id
        } = req.body;

        // Validation
        if (!asset_type) {
            return res.status(400).json({
                success: false,
                error: 'Asset type is required'
            });
        }

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Asset name is required'
            });
        }

        // Generate plain text for search if not provided
        const searchableText = content_text || jsonToText(content_json);

        const assetData = {
            asset_type,
            name,
            description: description || '',
            content_json,
            content_text: searchableText,
            tags,
            version: 1,
            is_current: true,
            usage_count: 0,
            visibility: 'private',
            user_id: user_id || null,
            created_by: user_id || null
        };

        const { data, error } = await supabase
            .from('context_assets')
            .insert(assetData)
            .select()
            .single();

        if (error) throw error;

        // Create initial version record
        await supabase
            .from('context_asset_versions')
            .insert({
                asset_id: data.id,
                version: 1,
                content_json,
                content_text: searchableText,
                change_summary: 'Initial creation',
                created_by: user_id || null
            });

        res.status(201).json({
            success: true,
            asset: {
                ...data,
                type_info: ASSET_TYPES[data.asset_type] || { icon: '📄', display_name: data.asset_type }
            }
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
// Update existing asset
// ============================================
router.put('/assets/:id', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { id } = req.params;
        const {
            name,
            description,
            asset_type,
            content_json,
            content_text,
            tags,
            change_summary,
            user_id
        } = req.body;

        // Fetch current asset
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

        // Prepare update data
        const updateData = {
            updated_at: new Date().toISOString()
        };

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (asset_type !== undefined) updateData.asset_type = asset_type;
        if (tags !== undefined) updateData.tags = tags;

        // If content changed, increment version
        if (content_json !== undefined) {
            updateData.content_json = content_json;
            updateData.content_text = content_text || jsonToText(content_json);
            updateData.version = current.version + 1;

            // Save version history
            await supabase
                .from('context_asset_versions')
                .insert({
                    asset_id: id,
                    version: updateData.version,
                    content_json: content_json,
                    content_text: updateData.content_text,
                    change_summary: change_summary || 'Content updated',
                    created_by: user_id || null
                });
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
            asset: {
                ...data,
                type_info: ASSET_TYPES[data.asset_type] || { icon: '📄', display_name: data.asset_type }
            }
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
        const { hard = false } = req.query;

        if (hard === 'true') {
            // Hard delete - remove from database
            const { error } = await supabase
                .from('context_assets')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } else {
            // Soft delete - mark as archived
            const { error } = await supabase
                .from('context_assets')
                .update({ is_current: false, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
        }

        res.json({
            success: true,
            message: hard === 'true' ? 'Asset permanently deleted' : 'Asset archived'
        });

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
// Get version history for asset
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
            versions: data || [],
            count: (data || []).length
        });

    } catch (error) {
        console.error('Error fetching versions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// POST /api/context/assets/:id/rollback
// Rollback asset to specific version
// ============================================
router.post('/assets/:id/rollback', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { id } = req.params;
        const { version, user_id } = req.body;

        if (!version) {
            return res.status(400).json({
                success: false,
                error: 'Version number is required'
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
                error: 'Version not found'
            });
        }

        // Get current asset
        const { data: current, error: currentError } = await supabase
            .from('context_assets')
            .select('version')
            .eq('id', id)
            .single();

        if (currentError) throw currentError;

        const newVersion = current.version + 1;

        // Update asset with rolled back content
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

        // Create version record for rollback
        await supabase
            .from('context_asset_versions')
            .insert({
                asset_id: id,
                version: newVersion,
                content_json: versionData.content_json,
                content_text: versionData.content_text,
                change_summary: `Rolled back to version ${version}`,
                created_by: user_id || null
            });

        res.json({
            success: true,
            asset: data,
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
// POST /api/context/assets/:id/duplicate
// Duplicate an asset
// ============================================
router.post('/assets/:id/duplicate', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { id } = req.params;
        const { name, user_id } = req.body;

        // Fetch original asset
        const { data: original, error: fetchError } = await supabase
            .from('context_assets')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !original) {
            return res.status(404).json({
                success: false,
                error: 'Asset not found'
            });
        }

        // Create duplicate
        const duplicateData = {
            asset_type: original.asset_type,
            name: name || `${original.name} (Copy)`,
            description: original.description,
            content_json: original.content_json,
            content_text: original.content_text,
            tags: original.tags,
            version: 1,
            is_current: true,
            usage_count: 0,
            visibility: 'private',
            user_id: user_id || original.user_id,
            created_by: user_id || null
        };

        const { data, error } = await supabase
            .from('context_assets')
            .insert(duplicateData)
            .select()
            .single();

        if (error) throw error;

        // Create initial version
        await supabase
            .from('context_asset_versions')
            .insert({
                asset_id: data.id,
                version: 1,
                content_json: data.content_json,
                content_text: data.content_text,
                change_summary: `Duplicated from "${original.name}"`,
                created_by: user_id || null
            });

        res.status(201).json({
            success: true,
            asset: {
                ...data,
                type_info: ASSET_TYPES[data.asset_type] || { icon: '📄', display_name: data.asset_type }
            }
        });

    } catch (error) {
        console.error('Error duplicating asset:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// PATCH /api/context/assets/:id/archive
// Archive or restore an asset
// ============================================
router.patch('/assets/:id/archive', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { id } = req.params;
        const { archived = true } = req.body;

        const { data, error } = await supabase
            .from('context_assets')
            .update({ 
                is_current: !archived,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            asset: data,
            message: archived ? 'Asset archived' : 'Asset restored'
        });

    } catch (error) {
        console.error('Error archiving asset:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// POST /api/context/assets/import
// Bulk import assets from JSON
// ============================================
router.post('/assets/import', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { assets, user_id } = req.body;

        if (!Array.isArray(assets) || assets.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Assets array is required'
            });
        }

        const results = {
            success: [],
            failed: []
        };

        for (const asset of assets) {
            try {
                const assetData = {
                    asset_type: asset.asset_type,
                    name: asset.name,
                    description: asset.description || '',
                    content_json: asset.content_json || {},
                    content_text: asset.content_text || jsonToText(asset.content_json || {}),
                    tags: asset.tags || [],
                    version: 1,
                    is_current: true,
                    usage_count: 0,
                    visibility: 'private',
                    user_id: user_id || null,
                    created_by: user_id || null
                };

                const { data, error } = await supabase
                    .from('context_assets')
                    .insert(assetData)
                    .select()
                    .single();

                if (error) throw error;

                results.success.push({ name: asset.name, id: data.id });
            } catch (err) {
                results.failed.push({ name: asset.name, error: err.message });
            }
        }

        res.json({
            success: true,
            imported: results.success.length,
            failed: results.failed.length,
            results
        });

    } catch (error) {
        console.error('Error importing assets:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// GET /api/context/assets/export
// Export assets as JSON
// ============================================
router.get('/assets/export', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { type, ids } = req.query;

        let query = supabase
            .from('context_assets')
            .select('*')
            .eq('is_current', true);

        if (type) {
            query = query.eq('asset_type', type);
        }

        if (ids) {
            const idArray = ids.split(',');
            query = query.in('id', idArray);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Format for export
        const exportData = {
            exported_at: new Date().toISOString(),
            version: '2.2.0',
            count: data.length,
            assets: data.map(asset => ({
                asset_type: asset.asset_type,
                name: asset.name,
                description: asset.description,
                content_json: asset.content_json,
                tags: asset.tags
            }))
        };

        res.json(exportData);

    } catch (error) {
        console.error('Error exporting assets:', error);
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
        for (const asset of assets) {
            if (!stats.by_type[asset.asset_type]) {
                stats.by_type[asset.asset_type] = {
                    count: 0,
                    usage: 0,
                    info: ASSET_TYPES[asset.asset_type] || { icon: '📄', display_name: asset.asset_type }
                };
            }
            stats.by_type[asset.asset_type].count++;
            stats.by_type[asset.asset_type].usage += asset.usage_count || 0;
        }

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// POST /api/context/assets/:id/usage
// Increment usage count (called by agent service)
// ============================================
router.post('/assets/:id/usage', async (req, res) => {
    try {
        const supabase = getSupabase(req);
        const { id } = req.params;

        const { error } = await supabase.rpc('increment_asset_usage', { asset_id: id });

        // If RPC doesn't exist, do it manually
        if (error && error.code === 'PGRST202') {
            const { data, error: updateError } = await supabase
                .from('context_assets')
                .update({ 
                    usage_count: supabase.raw('usage_count + 1'),
                    last_used_at: new Date().toISOString()
                })
                .eq('id', id);

            if (updateError) throw updateError;
        } else if (error) {
            throw error;
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error updating usage:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
