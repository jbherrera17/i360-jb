#!/usr/bin/env node
/**
 * Publish Blueprint to Notion
 * Usage: node scripts/publish-blueprint.js [version]
 * Example: node scripts/publish-blueprint.js 2-9
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const notionService = require('../server/services/notionService');

async function publishBlueprint(version) {
    // Find the blueprint file
    const blueprintDir = path.join(__dirname, '../documentation/blueprints');
    const blueprintFile = version
        ? path.join(blueprintDir, `I360 Blueprint v${version}.md`)
        : null;

    // If no version specified, find the latest
    let targetFile = blueprintFile;
    if (!targetFile) {
        const files = fs.readdirSync(blueprintDir)
            .filter(f => f.startsWith('I360 Blueprint') && f.endsWith('.md'))
            .sort()
            .reverse();

        if (files.length === 0) {
            console.error('No Blueprint files found in documentation/');
            process.exit(1);
        }
        targetFile = path.join(blueprintDir, files[0]);
    }

    if (!fs.existsSync(targetFile)) {
        console.error(`Blueprint file not found: ${targetFile}`);
        process.exit(1);
    }

    console.log(`\n📄 Publishing Blueprint: ${path.basename(targetFile)}`);
    console.log('─'.repeat(50));

    // Check Notion configuration
    if (!notionService.isConfigured()) {
        console.error('\n❌ Notion is not configured.');
        console.error('   Set NOTION_API_KEY and NOTION_PAGE_ID in .env');
        process.exit(1);
    }

    // Read the Blueprint
    const markdown = fs.readFileSync(targetFile, 'utf-8');
    console.log(`📊 Content size: ${(markdown.length / 1024).toFixed(1)} KB`);

    // Extract version from filename for toggle title
    const filename = path.basename(targetFile, '.md');
    const versionMatch = filename.match(/v(\d+-\d+)/);
    const versionStr = versionMatch ? versionMatch[1].replace('-', '.') : 'Latest';
    const toggleTitle = `Blueprint v${versionStr} - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    try {
        console.log('⏳ Publishing to Notion...');
        console.log(`   Toggle title: "${toggleTitle}"`);

        const result = await notionService.publishToPage(markdown, {
            clearFirst: false,  // Append to existing content
            toggleTitle: toggleTitle,  // Wrap in collapsible toggle heading
            useToggles: true  // Make H2/H3 sections toggleable
        });

        console.log('\n✅ Blueprint published successfully!');
        console.log(`   📝 Blocks created: ${result.blocksCreated}`);
        console.log(`   🔗 URL: ${result.url}`);

    } catch (error) {
        console.error('\n❌ Failed to publish:', error.message);

        if (error.code === 'object_not_found') {
            console.error('\n   The page was not found. Make sure:');
            console.error('   1. NOTION_PAGE_ID is correct');
            console.error('   2. The integration has access to the page');
            console.error('   3. Share the page with your integration in Notion');
        }

        process.exit(1);
    }
}

// Get version from command line args
const version = process.argv[2];
publishBlueprint(version);
