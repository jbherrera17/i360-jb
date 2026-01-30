#!/usr/bin/env node
/**
 * Push Blueprint v3.31 and Roadmap v3.31 to Notion "Insight 360 System" page
 * Usage: node scripts/push-blueprint-roadmap-v331.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('@notionhq/client');

const PAGE_ID = 'ed6d0d51-5b0e-45c2-9057-d16db93d583c';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Import markdownToBlocks from notionService
const notionService = require('../server/services/notionService');

async function main() {
    if (!process.env.NOTION_API_KEY) {
        console.error('ERROR: NOTION_API_KEY not set in .env');
        process.exit(1);
    }

    // 1. Verify page access
    console.log('Verifying access to Insight 360 System page...');
    try {
        const page = await notion.pages.retrieve({ page_id: PAGE_ID });
        const title = page.properties?.title?.title?.[0]?.plain_text || 'Unknown';
        console.log(`  Found page: ${title} (${page.url})\n`);
    } catch (err) {
        console.error('ERROR: Cannot access page:', err.message);
        process.exit(1);
    }

    // 2. Read files
    const blueprintPath = path.join(__dirname, '../documentation/blueprints/I360 Blueprint v3-31 2026-01-29.md');
    const roadmapPath = path.join(__dirname, '../documentation/Roadmap/I360-ROADMAP 2026-01-29.md');

    const blueprintMd = fs.readFileSync(blueprintPath, 'utf-8');
    const roadmapMd = fs.readFileSync(roadmapPath, 'utf-8');

    console.log(`Blueprint: ${blueprintMd.length} chars`);
    console.log(`Roadmap: ${roadmapMd.length} chars\n`);

    // 3. Push Blueprint as toggle heading (blue background)
    console.log('Creating Blueprint toggle heading...');
    await pushAsToggle(
        'Blueprint v3.31 - External Integrations Framework (Jan 29, 2026)',
        blueprintMd,
        'blue_background'
    );
    console.log('  Blueprint pushed successfully.\n');

    // 4. Push Roadmap as toggle heading (green background)
    console.log('Creating Roadmap toggle heading...');
    await pushAsToggle(
        'Roadmap v3.31 - External Integrations Framework (Jan 29, 2026)',
        roadmapMd,
        'green_background'
    );
    console.log('  Roadmap pushed successfully.\n');

    console.log('Done! Both documents pushed to Notion.');
}

async function pushAsToggle(title, markdown, color) {
    // Create toggle heading_1
    const toggleBlock = {
        object: 'block',
        type: 'heading_1',
        heading_1: {
            rich_text: [{ type: 'text', text: { content: title } }],
            is_toggleable: true,
            color: color
        }
    };

    const toggleResult = await notion.blocks.children.append({
        block_id: PAGE_ID,
        children: [toggleBlock]
    });

    const toggleId = toggleResult.results[0].id;
    console.log(`  Toggle created: ${toggleId}`);

    // Convert markdown to blocks
    const contentBlocks = notionService.markdownToBlocks(markdown, { useToggles: false });
    console.log(`  Content blocks: ${contentBlocks.length}`);

    // Append in chunks of 100
    for (let i = 0; i < contentBlocks.length; i += 100) {
        const chunk = contentBlocks.slice(i, i + 100);
        await notion.blocks.children.append({
            block_id: toggleId,
            children: chunk
        });
        console.log(`  Appended chunk ${Math.floor(i / 100) + 1} (${chunk.length} blocks)`);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
