#!/usr/bin/env node
/**
 * Publish Blueprint to Notion
 *
 * Usage: node scripts/publish-blueprint-to-notion.js [version]
 * Example: node scripts/publish-blueprint-to-notion.js v2-20
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const notionService = require('../server/services/notionService');

async function main() {
    // Get version from command line or use latest
    const version = process.argv[2] || 'v2-20';
    const blueprintPath = path.join(__dirname, '..', 'documentation', 'blueprints', `I360 Blueprint ${version}.md`);

    // Check if file exists
    if (!fs.existsSync(blueprintPath)) {
        console.error(`Blueprint not found: ${blueprintPath}`);
        console.error('\nAvailable blueprints:');
        const docs = fs.readdirSync(path.join(__dirname, '..', 'documentation', 'blueprints'))
            .filter(f => f.startsWith('I360 Blueprint'));
        docs.forEach(d => console.error(`  - ${d}`));
        process.exit(1);
    }

    // Check Notion configuration
    if (!notionService.isConfigured()) {
        console.error('Notion is not configured.');
        console.error('Please set NOTION_API_KEY and NOTION_PAGE_ID in your .env file.');
        process.exit(1);
    }

    console.log(`Publishing Blueprint ${version} to Notion...`);

    // Read the blueprint
    const markdown = fs.readFileSync(blueprintPath, 'utf-8');

    try {
        // Publish to Notion with toggle heading
        const result = await notionService.publishToPage(markdown, {
            toggleTitle: `Blueprint ${version}`,
            useToggles: true
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
