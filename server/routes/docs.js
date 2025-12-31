/**
 * Insight 360 - Documentation API Routes
 * Serves markdown documentation files for the help system
 * Version: 1.0.0
 */

const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Documentation directory
const DOCS_DIR = path.join(__dirname, '../../documentation');

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
    'company-user-guide.md'
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
