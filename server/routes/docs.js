/**
 * Insight 360 - Documentation API Routes
 * Serves markdown documentation files for the help system
 * Version: 1.0.0
 */

const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Documentation directory (guides subfolder)
const DOCS_DIR = path.join(__dirname, '../../documentation/guides');

// Allowed documentation files (whitelist for security)
const ALLOWED_DOCS = [
    'prompt-transformer-user-guide.md',
    'prompt-transformer-guide.md',
    'prompt-transformation-rules.md',
    'dashboard-user-guide.md',
    'chat-user-guide.md',
    'agents-user-guide.md',
    'context-user-guide.md',
    'skills-user-guide.md',
    'parthenon-user-guide.md',
    'actions-user-guide.md',
    'briefing-user-guide.md',
    'strategy-user-guide.md',
    'governance-user-guide.md',
    'integrity-user-guide.md',
    'company-user-guide.md',
    'align120-user-guide.md',
    'strategy120-user-guide.md',
    'execute120-user-guide.md',
    'workflow-user-guide.md',
    'profile-user-guide.md',
    'how-to-use-insight-360.md',
    // v3.0 SynergiNexus guides
    'synerginexus-user-guide.md',
    'synerginexus-technical-guide.md',
    'tags-user-guide.md',
    'tags-technical-guide.md',
    'roles-user-guide.md',
    'roles-technical-guide.md',
    // Admin guides
    'asset-types-user-guide.md',
    // Research Studio
    'research-studio-user-guide.md',
    'research-studio-technical-guide.md',
    // Connection Management & Agency Features (Phase 39-40)
    'my-capabilities-user-guide.md',
    'admin-responsibilities-user-guide.md',
    'admin-responsibility-ai-user-guide.md',
    'admin-department-ai-user-guide.md',
    'admin-okr-capabilities-user-guide.md',
    'client-comparison-user-guide.md',
    'connection-management-technical-guide.md',
    // Agency Foundation (Phase 39)
    'admin-org-settings-user-guide.md',
    'admin-org-members-user-guide.md',
    'admin-clients-user-guide.md',
    // Agency Model Enhancement (Phase 40-43)
    'agency-dashboard-user-guide.md',
    'admin-org-customization-user-guide.md',
    'admin-client-users-user-guide.md'
];

/**
 * GET /api/docs/:filename
 * Serve a documentation markdown file
 */
router.get('/:filename', async (req, res) => {
    try {
        const { filename } = req.params;

        // Security: Only allow whitelisted files
        if (!ALLOWED_DOCS.includes(filename)) {
            return res.status(404).json({
                success: false,
                error: 'Documentation not found'
            });
        }

        // Construct safe file path
        const filePath = path.join(DOCS_DIR, filename);

        // Verify the file is within DOCS_DIR (prevent path traversal)
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(path.resolve(DOCS_DIR))) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        // Read and return the file
        const content = await fs.readFile(filePath, 'utf-8');

        // Set appropriate headers
        res.set('Content-Type', 'text/markdown; charset=utf-8');
        res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes

        res.send(content);

    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({
                success: false,
                error: 'Documentation file not found'
            });
        } else {
            console.error('Error serving documentation:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to load documentation'
            });
        }
    }
});

/**
 * GET /api/docs
 * List available documentation files
 */
router.get('/', async (req, res) => {
    try {
        const files = await fs.readdir(DOCS_DIR);

        // Filter to only include allowed user guide files that exist
        const availableDocs = ALLOWED_DOCS.filter(doc => files.includes(doc));

        res.json({
            success: true,
            data: availableDocs.map(filename => ({
                filename,
                url: `/api/docs/${filename}`,
                title: filename
                    .replace('.md', '')
                    .replace(/-/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase())
            }))
        });

    } catch (error) {
        console.error('Error listing documentation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list documentation'
        });
    }
});

module.exports = router;
