/**
 * Context Assets Routes
 * API endpoints for managing context assets
 * 
 * Insight 360 - Phase 3
 * 
 * Endpoints:
 *   GET    /api/context/types              - List all asset types
 *   GET    /api/context/types/:typeKey     - Get single asset type
 *   GET    /api/context/assets             - List user's assets
 *   GET    /api/context/assets/:id         - Get single asset
 *   POST   /api/context/assets             - Create new asset
 *   PUT    /api/context/assets/:id         - Update asset
 *   DELETE /api/context/assets/:id         - Delete/archive asset
 *   POST   /api/context/assets/:id/restore - Restore archived asset
 *   GET    /api/context/assets/:id/versions - Get version history
 *   POST   /api/context/assets/:id/rollback/:version - Rollback to version
 *   POST   /api/context/assets/bulk        - Bulk create assets
 *   GET    /api/context/export             - Export all assets
 */

const express = require('express');
const router = express.Router();
const contextService = require('../services/contextService');

// ============================================================
// MIDDLEWARE - Authentication Check
// ============================================================

/**
 * Middleware to verify user is authenticated
 * Compatible with main auth middleware (uses req.userId)
 */
const requireAuth = (req, res, next) => {
    // Development mode bypass
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        if (!req.userId) {
            req.userId = process.env.DEV_USER_ID || 'dev-user-001';
        }
        return next();
    }
    
    // Check for userId (set by main auth middleware)
    if (!req.userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    next();
};

// Apply auth to all routes
router.use(requireAuth);

// ============================================================
// ASSET TYPES ENDPOINTS
// ============================================================

/**
 * GET /api/context/types
 * List all active context asset types
 */
router.get('/types', async (req, res) => {
    try {
        const types = await contextService.getAssetTypes();
        
        res.json({
            success: true,
            data: types,
            count: types.length
        });
    } catch (error) {
        console.error('Error fetching asset types:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch asset types',
            details: error.message
        });
    }
});

/**
 * GET /api/context/types/:typeKey
 * Get a single asset type by key
 */
router.get('/types/:typeKey', async (req, res) => {
    try {
        const { typeKey } = req.params;
        const type = await contextService.getAssetTypeByKey(typeKey);
        
        if (!type) {
            return res.status(404).json({
                success: false,
                error: 'Asset type not found'
            });
        }
        
        res.json({
            success: true,
            data: type
        });
    } catch (error) {
        console.error('Error fetching asset type:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch asset type',
            details: error.message
        });
    }
});

// ============================================================
// CONTEXT ASSETS ENDPOINTS
// ============================================================

/**
 * GET /api/context/assets
 * List all context assets for the authenticated user
 * 
 * Query params:
 *   - type: Filter by asset type (e.g., 'voice_dna')
 *   - tags: Filter by tags (comma-separated)
 *   - search: Search in name, description, content
 *   - archived: Include archived assets (default: false)
 *   - limit: Max results (default: 100)
 *   - offset: Pagination offset (default: 0)
 *   - sortBy: Sort field (default: 'updated_at')
 *   - sortOrder: 'asc' or 'desc' (default: 'desc')
 */
router.get('/assets', async (req, res) => {
    try {
        const userId = req.userId;
        
        // Parse query parameters
        const options = {
            assetType: req.query.type || null,
            tags: req.query.tags ? req.query.tags.split(',') : null,
            search: req.query.search || null,
            includeArchived: req.query.archived === 'true',
            limit: parseInt(req.query.limit) || 100,
            offset: parseInt(req.query.offset) || 0,
            sortBy: req.query.sortBy || 'updated_at',
            sortOrder: req.query.sortOrder || 'desc'
        };
        
        const assets = await contextService.getAssets(userId, options);
        
        res.json({
            success: true,
            data: assets,
            count: assets.length,
            pagination: {
                limit: options.limit,
                offset: options.offset,
                hasMore: assets.length === options.limit
            }
        });
    } catch (error) {
        console.error('Error fetching assets:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch assets',
            details: error.message
        });
    }
});

/**
 * GET /api/context/assets/:id
 * Get a single context asset by ID
 */
router.get('/assets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        
        const asset = await contextService.getAssetById(id, userId);
        
        if (!asset) {
            return res.status(404).json({
                success: false,
                error: 'Asset not found'
            });
        }
        
        res.json({
            success: true,
            data: asset
        });
    } catch (error) {
        console.error('Error fetching asset:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch asset',
            details: error.message
        });
    }
});

/**
 * POST /api/context/assets
 * Create a new context asset
 * 
 * Body:
 *   - asset_type: (required) Asset type key
 *   - name: (required) Display name
 *   - description: (optional) Brief description
 *   - content_json: (required) JSON content
 *   - content_text: (optional) Plain text version
 *   - tags: (optional) Array of tags
 *   - visibility: (optional) 'private', 'shared', 'public'
 */
router.post('/assets', async (req, res) => {
    try {
        const userId = req.userId;
        const { asset_type, name, description, content_json, content_text, tags, visibility } = req.body;
        
        // Validate required fields
        if (!asset_type) {
            return res.status(400).json({
                success: false,
                error: 'asset_type is required'
            });
        }
        
        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'name is required'
            });
        }
        
        // Get asset type for schema validation
        const assetType = await contextService.getAssetTypeByKey(asset_type);
        if (!assetType) {
            return res.status(400).json({
                success: false,
                error: `Invalid asset type: ${asset_type}`
            });
        }
        
        // Validate content against schema if provided
        if (assetType.json_schema && content_json) {
            const validation = contextService.validateContent(content_json, assetType.json_schema);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: 'Content validation failed',
                    details: validation.errors
                });
            }
        }
        
        const asset = await contextService.createAsset(userId, {
            asset_type,
            name,
            description,
            content_json: content_json || {},
            content_text,
            tags: tags || [],
            visibility: visibility || 'private'
        });
        
        res.status(201).json({
            success: true,
            data: asset,
            message: 'Asset created successfully'
        });
    } catch (error) {
        console.error('Error creating asset:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create asset',
            details: error.message
        });
    }
});

/**
 * PUT /api/context/assets/:id
 * Update an existing context asset
 * Triggers automatic versioning if content changes
 * 
 * Body: Any of the following fields
 *   - name
 *   - description
 *   - content_json
 *   - content_text
 *   - tags
 *   - visibility
 */
router.put('/assets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const updates = req.body;
        
        // Validate at least one field to update
        const allowedFields = ['name', 'description', 'content_json', 'content_text', 'tags', 'visibility'];
        const hasValidField = allowedFields.some(field => updates[field] !== undefined);
        
        if (!hasValidField) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update',
                allowedFields
            });
        }
        
        const asset = await contextService.updateAsset(id, userId, updates);
        
        res.json({
            success: true,
            data: asset,
            message: 'Asset updated successfully',
            version: asset.version
        });
    } catch (error) {
        console.error('Error updating asset:', error);
        
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: 'Asset not found or access denied'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to update asset',
            details: error.message
        });
    }
});

/**
 * DELETE /api/context/assets/:id
 * Delete or archive a context asset
 * 
 * Query params:
 *   - hard: If 'true', permanently delete (default: soft delete/archive)
 */
router.delete('/assets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const hardDelete = req.query.hard === 'true';
        
        await contextService.deleteAsset(id, userId, hardDelete);
        
        res.json({
            success: true,
            message: hardDelete ? 'Asset permanently deleted' : 'Asset archived successfully'
        });
    } catch (error) {
        console.error('Error deleting asset:', error);
        
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: 'Asset not found or access denied'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to delete asset',
            details: error.message
        });
    }
});

/**
 * POST /api/context/assets/:id/restore
 * Restore an archived asset
 */
router.post('/assets/:id/restore', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        
        const asset = await contextService.restoreAsset(id, userId);
        
        res.json({
            success: true,
            data: asset,
            message: 'Asset restored successfully'
        });
    } catch (error) {
        console.error('Error restoring asset:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to restore asset',
            details: error.message
        });
    }
});

// ============================================================
// VERSION HISTORY ENDPOINTS
// ============================================================

/**
 * GET /api/context/assets/:id/versions
 * Get version history for an asset
 */
router.get('/assets/:id/versions', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        
        const versions = await contextService.getAssetVersions(id, userId);
        
        res.json({
            success: true,
            data: versions,
            count: versions.length
        });
    } catch (error) {
        console.error('Error fetching versions:', error);
        
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: 'Asset not found or access denied'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to fetch version history',
            details: error.message
        });
    }
});

/**
 * POST /api/context/assets/:id/rollback/:version
 * Rollback to a previous version
 */
router.post('/assets/:id/rollback/:version', async (req, res) => {
    try {
        const { id, version } = req.params;
        const userId = req.userId;
        
        const targetVersion = parseInt(version);
        if (isNaN(targetVersion) || targetVersion < 1) {
            return res.status(400).json({
                success: false,
                error: 'Invalid version number'
            });
        }
        
        const asset = await contextService.rollbackToVersion(id, userId, targetVersion);
        
        res.json({
            success: true,
            data: asset,
            message: `Rolled back to version ${targetVersion}`,
            newVersion: asset.version
        });
    } catch (error) {
        console.error('Error rolling back version:', error);
        
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to rollback version',
            details: error.message
        });
    }
});

// ============================================================
// BULK OPERATIONS
// ============================================================

/**
 * POST /api/context/assets/bulk
 * Create multiple assets at once
 * 
 * Body:
 *   - assets: Array of asset objects
 */
router.post('/assets/bulk', async (req, res) => {
    try {
        const userId = req.userId;
        const { assets } = req.body;
        
        if (!assets || !Array.isArray(assets) || assets.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'assets array is required'
            });
        }
        
        if (assets.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 100 assets per bulk operation'
            });
        }
        
        // Validate each asset has required fields
        for (let i = 0; i < assets.length; i++) {
            if (!assets[i].asset_type || !assets[i].name) {
                return res.status(400).json({
                    success: false,
                    error: `Asset at index ${i} missing required fields (asset_type, name)`
                });
            }
        }
        
        const created = await contextService.bulkCreateAssets(userId, assets);
        
        res.status(201).json({
            success: true,
            data: created,
            count: created.length,
            message: `${created.length} assets created successfully`
        });
    } catch (error) {
        console.error('Error bulk creating assets:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to bulk create assets',
            details: error.message
        });
    }
});

/**
 * GET /api/context/export
 * Export all user's context assets
 */
router.get('/export', async (req, res) => {
    try {
        const userId = req.userId;
        
        const exportData = await contextService.exportAssets(userId);
        
        // Set headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=context-assets-${Date.now()}.json`);
        
        res.json(exportData);
    } catch (error) {
        console.error('Error exporting assets:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export assets',
            details: error.message
        });
    }
});

// ============================================================
// UTILITY ENDPOINTS
// ============================================================

/**
 * GET /api/context/stats
 * Get statistics about user's context assets
 */
router.get('/stats', async (req, res) => {
    try {
        const userId = req.userId;
        
        // Get all assets to calculate stats
        const assets = await contextService.getAssets(userId, { limit: 1000 });
        
        // Calculate stats
        const stats = {
            total_assets: assets.length,
            by_type: {},
            total_versions: 0,
            most_used: null,
            recently_updated: null
        };
        
        // Group by type
        for (const asset of assets) {
            const type = asset.asset_type;
            if (!stats.by_type[type]) {
                stats.by_type[type] = {
                    count: 0,
                    icon: asset.context_asset_types?.icon || '📄'
                };
            }
            stats.by_type[type].count++;
            stats.total_versions += asset.version;
        }
        
        // Find most used
        const sorted = [...assets].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
        if (sorted.length > 0 && sorted[0].usage_count > 0) {
            stats.most_used = {
                id: sorted[0].id,
                name: sorted[0].name,
                usage_count: sorted[0].usage_count
            };
        }
        
        // Find recently updated
        if (assets.length > 0) {
            const recent = [...assets].sort((a, b) => 
                new Date(b.updated_at) - new Date(a.updated_at)
            )[0];
            stats.recently_updated = {
                id: recent.id,
                name: recent.name,
                updated_at: recent.updated_at
            };
        }
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stats',
            details: error.message
        });
    }
});

module.exports = router;
