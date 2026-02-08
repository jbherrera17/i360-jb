#!/usr/bin/env node
/**
 * Push Phase 54 Manual Test Suite to Notion
 * Usage: node scripts/push-phase54-manual-tests-to-notion.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const notionService = require('../server/services/notionService');

const TEST_SUITE_PATH = path.join(__dirname, '../documentation/testing/manual-test-suite-phase54.md');

async function pushToNotion() {
    console.log('Pushing Phase 54 Manual Test Suite to Notion...\n');

    if (!notionService.isConfigured()) {
        console.error('ERROR: Notion is not configured.');
        console.error('Set NOTION_API_KEY and NOTION_PAGE_ID in your .env file.');
        process.exit(1);
    }

    if (!fs.existsSync(TEST_SUITE_PATH)) {
        console.error(`ERROR: File not found: ${TEST_SUITE_PATH}`);
        process.exit(1);
    }

    const markdown = fs.readFileSync(TEST_SUITE_PATH, 'utf-8');
    const title = 'Manual Test Suite: Phase 54 - Organization & Agency Onboarding';

    console.log(`Creating subpage: ${title}`);
    console.log(`Source file: ${TEST_SUITE_PATH}`);
    console.log(`Content length: ${markdown.length} characters\n`);

    try {
        const result = await notionService.createSubpage(title, markdown);

        console.log('✓ Successfully created Notion page!');
        console.log(`  Page ID: ${result.pageId}`);
        console.log(`  URL: ${result.url}`);
        console.log(`  Blocks created: ${result.blocksCreated}`);
    } catch (err) {
        console.error('✗ Failed to create page:', err.message);
        if (err.body) {
            console.error('  Details:', JSON.stringify(err.body, null, 2));
        }
        process.exit(1);
    }

    console.log('\nDone!');
}

pushToNotion().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
