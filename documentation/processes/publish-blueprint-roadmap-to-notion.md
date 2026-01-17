# Publishing Blueprints and Roadmaps to Notion

This document outlines the process for publishing Blueprint and Roadmap documentation to the Insight 360 Notion workspace.

## Overview

Blueprints and Roadmaps are versioned documentation that track feature development and project planning. They are stored locally in the repository and synced to Notion for team visibility.

**Local Storage:**
- Blueprints: `documentation/blueprints/I360 Blueprint v{X}-{Y} {DATE}.md`
- Roadmaps: `documentation/Roadmap/I360-ROADMAP {DATE}.md`

**Notion Location:**
- Page: [Insight 360 System](https://www.notion.so/Insight-360-System-ed6d0d515b0e45c29057d16db93d583c)
- Page ID: `ed6d0d51-5b0e-45c2-9057-d16db93d583c`

---

## Prerequisites

### Environment Variables

Ensure these are set in `.env`:

```bash
NOTION_API_KEY=ntn_xxxxxxxxxxxxx
```

### Notion Integration

The Notion integration must have access to the "Insight 360 System" page. To verify:

1. Go to Notion Settings > Integrations
2. Find the Insight 360 integration
3. Ensure it has "Insert content" and "Read content" permissions
4. The integration must be connected to the target page

---

## Process

### Step 1: Create/Update Local Documentation

#### Blueprint

Create a new blueprint file following the naming convention:

```
documentation/blueprints/I360 Blueprint v{MAJOR}-{MINOR} {YYYY-MM-DD}.md
```

Example: `I360 Blueprint v3-11 2026-01-16.md`

Required sections:
- Executive Summary
- Current Implementation Status
- New Phase Details
- Architecture Overview
- Production Readiness Score
- Recent Commits
- Version History
- Next Steps

#### Roadmap

Create/update the roadmap file:

```
documentation/Roadmap/I360-ROADMAP {YYYY-MM-DD}.md
```

Example: `I360-ROADMAP 2026-01-16.md`

Required sections:
- Executive Summary
- Production Readiness Score table
- What's New in v{X}.{Y}
- Phase Structure (Completed/Pending)
- LLM Provider Support
- Success Metrics
- Version History

### Step 2: Commit and Push to Git

```bash
# Stage the files
git add documentation/blueprints/I360\ Blueprint\ v{X}-{Y}\ {DATE}.md
git add documentation/Roadmap/I360-ROADMAP\ {DATE}.md

# Commit with descriptive message
git commit -m "Add Blueprint v{X}.{Y} and Roadmap documenting {feature}

- Blueprint v{X}.{Y} documents Phase {N} {feature name}
- Roadmap updated with v{X}.{Y} features and future phases
- Production readiness score now {X}/10

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

# Push to remote
git push origin {branch-name}
```

### Step 3: Publish to Notion

#### Option A: Using Node.js Script (Recommended)

Run from the project root:

```javascript
node -e "
require('dotenv').config();
const fs = require('fs');
const { Client } = require('@notionhq/client');

async function pushToNotion() {
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const pageId = 'ed6d0d51-5b0e-45c2-9057-d16db93d583c';

    // Read files - UPDATE THESE PATHS
    const blueprintPath = './documentation/blueprints/I360 Blueprint v{X}-{Y} {DATE}.md';
    const roadmapPath = './documentation/Roadmap/I360-ROADMAP {DATE}.md';

    const blueprintContent = fs.readFileSync(blueprintPath, 'utf8');
    const roadmapContent = fs.readFileSync(roadmapPath, 'utf8');

    function createBlocks(content) {
        const lines = content.split('\n');
        const blocks = [];

        for (let i = 0; i < lines.length && blocks.length < 95; i++) {
            const line = lines[i];

            if (line.startsWith('# ')) {
                blocks.push({
                    object: 'block',
                    type: 'heading_1',
                    heading_1: { rich_text: [{ type: 'text', text: { content: line.slice(2).substring(0, 2000) } }] }
                });
            } else if (line.startsWith('## ')) {
                blocks.push({
                    object: 'block',
                    type: 'heading_2',
                    heading_2: { rich_text: [{ type: 'text', text: { content: line.slice(3).substring(0, 2000) } }] }
                });
            } else if (line.startsWith('### ')) {
                blocks.push({
                    object: 'block',
                    type: 'heading_3',
                    heading_3: { rich_text: [{ type: 'text', text: { content: line.slice(4).substring(0, 2000) } }] }
                });
            } else if (line.startsWith('- ') || line.startsWith('* ')) {
                blocks.push({
                    object: 'block',
                    type: 'bulleted_list_item',
                    bulleted_list_item: { rich_text: [{ type: 'text', text: { content: line.slice(2).substring(0, 2000) } }] }
                });
            } else if (line.startsWith('- [x] ') || line.startsWith('- [ ] ')) {
                blocks.push({
                    object: 'block',
                    type: 'to_do',
                    to_do: {
                        rich_text: [{ type: 'text', text: { content: line.slice(6).substring(0, 2000) } }],
                        checked: line.startsWith('- [x]')
                    }
                });
            } else if (line.trim() && !line.startsWith('\`\`\`') && !line.includes('|---') && !line.startsWith('---')) {
                blocks.push({
                    object: 'block',
                    type: 'paragraph',
                    paragraph: { rich_text: [{ type: 'text', text: { content: line.substring(0, 2000) } }] }
                });
            }
        }
        return blocks;
    }

    // Add Blueprint
    console.log('Adding Blueprint...');
    const blueprintToggle = await notion.blocks.children.append({
        block_id: pageId,
        children: [{
            object: 'block',
            type: 'heading_1',
            heading_1: {
                rich_text: [{ type: 'text', text: { content: 'Blueprint v{X}.{Y} - {Feature} ({Date})' } }],
                is_toggleable: true,
                color: 'blue_background'
            }
        }]
    });

    const blueprintBlocks = createBlocks(blueprintContent);
    for (let i = 0; i < blueprintBlocks.length; i += 100) {
        await notion.blocks.children.append({
            block_id: blueprintToggle.results[0].id,
            children: blueprintBlocks.slice(i, i + 100)
        });
    }
    console.log('Blueprint added!');

    // Add Roadmap
    console.log('Adding Roadmap...');
    const roadmapToggle = await notion.blocks.children.append({
        block_id: pageId,
        children: [{
            object: 'block',
            type: 'heading_1',
            heading_1: {
                rich_text: [{ type: 'text', text: { content: 'Roadmap v{X}.{Y} - {Feature} ({Date})' } }],
                is_toggleable: true,
                color: 'green_background'
            }
        }]
    });

    const roadmapBlocks = createBlocks(roadmapContent);
    for (let i = 0; i < roadmapBlocks.length; i += 100) {
        await notion.blocks.children.append({
            block_id: roadmapToggle.results[0].id,
            children: roadmapBlocks.slice(i, i + 100)
        });
    }
    console.log('Roadmap added!');

    console.log('Done! View at: https://www.notion.so/Insight-360-System-ed6d0d515b0e45c29057d16db93d583c');
}

pushToNotion().catch(console.error);
"
```

#### Option B: Using NotionService

```javascript
const notionService = require('./server/services/notionService');

// Publish blueprint
await notionService.publishToPage(blueprintContent, {
    pageId: 'ed6d0d51-5b0e-45c2-9057-d16db93d583c',
    toggleTitle: 'Blueprint v{X}.{Y} - {Feature} ({Date})'
});

// Publish roadmap
await notionService.publishToPage(roadmapContent, {
    pageId: 'ed6d0d51-5b0e-45c2-9057-d16db93d583c',
    toggleTitle: 'Roadmap v{X}.{Y} - {Feature} ({Date})'
});
```

---

## Notion Block Limits

- Maximum 100 blocks per API call (script handles chunking)
- Maximum 2000 characters per text block
- Toggle headings contain all content as children
- Code blocks and tables have limited markdown support

---

## Naming Conventions

### Toggle Title Format

```
Blueprint v{MAJOR}.{MINOR} - {Feature Summary} ({Month Day, Year})
Roadmap v{MAJOR}.{MINOR} - {Feature Summary} ({Month Day, Year})
```

Examples:
- `Blueprint v3.11 - Radar Chart Visualization (Jan 16, 2026)`
- `Roadmap v3.11 - Radar Chart Visualization (Jan 16, 2026)`

### Color Coding

| Document | Toggle Color |
|----------|--------------|
| Blueprint | `blue_background` |
| Roadmap | `green_background` |

---

## Verification

After publishing, verify:

1. **Toggle created** - New toggle heading appears at bottom of page
2. **Content complete** - Click toggle to expand and review content
3. **Formatting preserved** - Headings, lists, and paragraphs render correctly
4. **No truncation** - All major sections are present

---

## Troubleshooting

### "Invalid request URL"

The page ID may be a URL instead of a UUID. Extract the 32-character ID:

```
URL: https://www.notion.so/synai/2e1baf031ec880ca8ee7e5f46449321b?v=...
ID:  2e1baf031ec880ca8ee7e5f46449321b
```

### "Block does not support children"

The page ID points to a database, not a page. Use a page ID instead.

### "Name is not a property that exists"

You're trying to create a database entry. Use `blocks.children.append` for pages.

### Rate Limiting

Notion API has rate limits. If you hit them:
- Wait 1 minute and retry
- Reduce chunk size from 100 to 50 blocks

---

## Related Files

- `server/services/notionService.js` - Notion API wrapper
- `documentation/blueprints/` - All blueprint versions
- `documentation/Roadmap/` - All roadmap versions

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-16 | Initial process document created |
