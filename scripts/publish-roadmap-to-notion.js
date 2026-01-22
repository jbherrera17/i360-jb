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
        // Get today's date for page title
        const today = new Date().toISOString().split('T')[0];
        const title = `I360 Roadmap ${today}`;

        // Step 1: Create a calendar entry in the Content Calendar database
        console.log('Creating calendar entry...');
        const entryResult = await notionService.createCalendarEntry({
            title: title,
            status: 'Published',
            contentType: 'Documentation',
            scheduledDate: today
        });

        console.log(`   Entry created: ${entryResult.pageId}`);

        // Step 2: Add the markdown content to the page
        console.log('Adding content to page...');
        await notionService.addContentToCalendarEntry(entryResult.pageId, markdown);

        console.log('\n✅ Successfully published to Notion!');
        console.log(`   Page ID: ${entryResult.pageId}`);
        console.log(`   URL: ${entryResult.url}`);
        console.log(`   Title: ${title}`);
    } catch (error) {
        console.error('\n❌ Failed to publish to Notion:', error.message);
        if (error.code === 'object_not_found') {
            console.error('\n📋 To fix this:');
            console.error('   1. Open the Notion database/page in your browser');
            console.error('   2. Click "..." menu → "Connections" → "Connect to"');
            console.error('   3. Select your Insight 360 integration');
            console.error('   4. Click "Confirm" to grant access');
            console.error('\n   Database ID: e5228731-3073-4081-a379-c09beb2a9412');
        } else if (error.code === 'validation_error') {
            console.error('\n📋 Validation error - check that NOTION_PAGE_ID points to a page (not a database view).');
        }
        process.exit(1);
    }
}

main();
