#!/usr/bin/env node
/**
 * Push test plans to Notion as subpages
 * Usage: node scripts/push-test-plans-to-notion.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const notionService = require('../server/services/notionService');

const TEST_PLANS_DIR = path.join(__dirname, '../documentation/test-plans');

async function pushTestPlansToNotion() {
    console.log('Pushing test plans to Notion...\n');

    if (!notionService.isConfigured()) {
        console.error('ERROR: Notion is not configured.');
        console.error('Set NOTION_API_KEY and NOTION_PAGE_ID in your .env file.');
        process.exit(1);
    }

    const files = [
        'agency-setup-test-plan.md',
        'client-onboarding-test-plan.md'
    ];

    for (const file of files) {
        const filePath = path.join(TEST_PLANS_DIR, file);

        if (!fs.existsSync(filePath)) {
            console.log(`Skipping ${file} - file not found`);
            continue;
        }

        const markdown = fs.readFileSync(filePath, 'utf-8');
        const title = file.replace('.md', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        console.log(`Creating subpage: ${title}`);

        try {
            const result = await notionService.createSubpage(title, markdown);

            console.log(`  ✓ Created: ${result.url}`);
            console.log(`    Blocks created: ${result.blocksCreated}\n`);
        } catch (err) {
            console.error(`  ✗ Failed to create ${file}:`, err.message);
        }
    }

    console.log('Done!');
}

pushTestPlansToNotion().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
