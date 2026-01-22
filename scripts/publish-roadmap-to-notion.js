#!/usr/bin/env node
/**
 * Publish Roadmap to Notion
 *
 * Usage: node scripts/publish-roadmap-to-notion.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const notionService = require('../server/services/notionService');

async function main() {
    const roadmapDir = path.join(__dirname, '..', 'documentation', 'Roadmap');

    // Find roadmap file (with or without date suffix)
    const allDocs = fs.readdirSync(roadmapDir).filter(f => f.startsWith('I360-ROADMAP'));
    const roadmapFile = allDocs.sort().reverse()[0]; // Get most recent

    if (!roadmapFile) {
        console.error('Roadmap not found in documentation/Roadmap directory');
        process.exit(1);
    }

    const roadmapPath = path.join(roadmapDir, roadmapFile);

    // Check Notion configuration
    if (!notionService.isConfigured()) {
        console.error('Notion is not configured.');
        console.error('Please set NOTION_API_KEY and NOTION_PAGE_ID in your .env file.');
        process.exit(1);
    }

    console.log('Publishing Roadmap to Notion...');

    // Read the roadmap
    const markdown = fs.readFileSync(roadmapPath, 'utf-8');

    try {
        // Publish to Notion with toggle heading
        // Publish without toggle wrapper (simpler, more reliable)
        const result = await notionService.publishToPage(markdown, {
            useToggles: false
        });

        console.log('\n✅ Successfully published to Notion!');
        console.log(`   Page ID: ${result.pageId}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Blocks created: ${result.blocksCreated}`);
    } catch (error) {
        console.error('\n❌ Failed to publish to Notion:', error.message);
        if (error.code === 'object_not_found') {
            console.error('\nThe NOTION_PAGE_ID may be incorrect or the integration does not have access.');
            console.error('Make sure the integration is connected to the page in Notion.');
        }
        process.exit(1);
    }
}

main();
