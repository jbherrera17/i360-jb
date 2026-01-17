# Managing Bugs in the Notion Bug Tracker

This document outlines the process for creating, updating, and managing bugs in the Insight 360 Notion Bug Tracker database.

## Overview

The Bug Tracker is a Notion database that serves as the central repository for all Insight 360 bugs. It supports two-way sync via the `/api/bugs` API endpoints and is displayed on the System Health page.

**Notion Database:**
- Database ID: `2e1baf03-1ec8-80ca-8ee7-e5f46449321b`
- Direct Link: Search "Bug Tracker" in Notion workspace

**API Base URL:** `/api/bugs`

---

## Prerequisites

### Environment Variables

Ensure this is set in `.env`:

```bash
NOTION_API_KEY=ntn_xxxxxxxxxxxxx
BUG_CACHE_TTL_MS=10000  # Optional, defaults to 10 seconds
```

### Authentication

All bug API endpoints require authentication. Include the session cookie or auth header.

---

## Bug Properties

### Database Schema

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| Bug Title | Title | Yes | Short descriptive title |
| Status | Select | Yes | Current bug status |
| Severity | Select | No | Impact level |
| Priority | Select | No | Fix urgency |
| I360 Module | Select | No | Affected system module |
| Date Reported | Date | Auto | When bug was created |
| Date Resolved | Date | Auto | When bug was fixed |

### Status Values

| Status | Description |
|--------|-------------|
| `New` | Just reported, not yet reviewed |
| `Triaged` | Reviewed, severity/priority assigned |
| `In Progress` | Currently being worked on |
| `Ready for Testing` | Fix implemented, needs testing |
| `Testing` | Currently being tested |
| `Resolved` | Fix verified, waiting for deployment |
| `Closed` | Deployed and confirmed fixed |
| `Reopened` | Previously closed but issue returned |
| `Won't Fix` | Decided not to address |

### Severity Values

| Severity | Description |
|----------|-------------|
| `Critical` | System unusable, data loss, security issue |
| `High` | Major feature broken, no workaround |
| `Medium` | Feature impaired, workaround exists |
| `Low` | Minor issue, cosmetic, edge case |
| `Trivial` | Very minor, nice-to-have fix |

### Priority Values

| Priority | Description |
|----------|-------------|
| `P1` | Fix immediately (same day) |
| `P2` | Fix within 1-2 days |
| `P3` | Fix within 1 week |
| `P4` | Fix when convenient |
| `P5` | Backlog |

### Module Values

| Module | Description |
|--------|-------------|
| `Chat` | Main chat interface |
| `Agents` | Agent framework, execution |
| `Align 120` | Strategic assessment |
| `Strategy 120` | Strategy planning |
| `Execute 120` | Execution tracking |
| `Parthenon` | OKR framework |
| `Workflows` | Workflow builder/engine |
| `Skills` | Skill management |
| `Context` | Context assets |
| `Auth` | Authentication/authorization |
| `System Health` | Health monitoring |
| `Navigation` | Sidebar, routing |
| `Other` | Miscellaneous |

---

## API Endpoints

### GET /api/bugs/summary

Returns aggregated bug statistics.

**Response:**
```json
{
  "success": true,
  "total": 45,
  "fixed": 32,
  "open": 13,
  "bySeverity": [
    { "severity": "Critical", "total": 5, "fixed": 5, "open": 0 },
    { "severity": "High", "total": 15, "fixed": 12, "open": 3 }
  ],
  "byStatus": [
    { "status": "New", "count": 3 },
    { "status": "In Progress", "count": 5 }
  ],
  "lastUpdated": "2026-01-16T12:00:00.000Z"
}
```

### GET /api/bugs

Returns paginated list of bugs with optional filtering.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status |
| `severity` | string | Filter by severity |
| `page_size` | number | Results per page (default 25, max 100) |
| `cursor` | string | Pagination cursor |

**Example:**
```bash
GET /api/bugs?status=In%20Progress&severity=High&page_size=10
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "bugs": [
    {
      "id": "abc-123",
      "title": "Chat input clears unexpectedly",
      "status": "In Progress",
      "severity": "High",
      "priority": "P2",
      "module": "Chat",
      "dateReported": "2026-01-15",
      "dateResolved": null,
      "url": "https://notion.so/..."
    }
  ],
  "hasMore": true,
  "nextCursor": "xyz-789"
}
```

### GET /api/bugs/open

Returns only open (non-resolved) bugs, sorted by priority and severity.

### GET /api/bugs/:id

Returns a single bug by ID.

### POST /api/bugs

Creates a new bug in Notion.

**Request Body:**
```json
{
  "title": "Agent execution fails with timeout",
  "severity": "High",
  "priority": "P2",
  "module": "Agents",
  "description": "When executing an agent with large context, the request times out after 30 seconds.",
  "stepsToReproduce": "1. Create agent with 10+ context assets\n2. Execute agent\n3. Observe timeout error"
}
```

**Response:**
```json
{
  "success": true,
  "bug": {
    "id": "new-bug-id",
    "title": "Agent execution fails with timeout",
    "status": "New",
    "severity": "High",
    "priority": "P2",
    "module": "Agents",
    "url": "https://notion.so/..."
  }
}
```

### PATCH /api/bugs/:id

Updates an existing bug.

**Request Body:**
```json
{
  "status": "Resolved",
  "dateResolved": "2026-01-16"
}
```

Note: `dateResolved` is auto-set when status changes to "Resolved" or "Closed".

---

## Process: Creating a Bug

### Option 1: Via API (Programmatic)

```javascript
const response = await fetch('/api/bugs', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
    },
    body: JSON.stringify({
        title: 'Bug title here',
        severity: 'High',
        priority: 'P2',
        module: 'Chat',
        description: 'Detailed description...',
        stepsToReproduce: '1. Do this\n2. Do that\n3. Observe error'
    })
});

const { bug } = await response.json();
console.log('Created bug:', bug.url);
```

### Option 2: Via Node.js Script

```javascript
node -e "
require('dotenv').config();
const { Client } = require('@notionhq/client');

async function createBug() {
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const databaseId = '2e1baf03-1ec8-80ca-8ee7-e5f46449321b';

    const result = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
            'Bug Title': {
                title: [{ text: { content: 'YOUR BUG TITLE HERE' } }]
            },
            'Status': { select: { name: 'New' } },
            'Severity': { select: { name: 'High' } },
            'Priority': { select: { name: 'P2' } },
            'I360 Module': { select: { name: 'Chat' } },
            'Date Reported': { date: { start: new Date().toISOString().split('T')[0] } }
        },
        children: [
            {
                object: 'block',
                type: 'heading_2',
                heading_2: { rich_text: [{ type: 'text', text: { content: 'Description' } }] }
            },
            {
                object: 'block',
                type: 'paragraph',
                paragraph: { rich_text: [{ type: 'text', text: { content: 'YOUR DESCRIPTION HERE' } }] }
            },
            {
                object: 'block',
                type: 'heading_2',
                heading_2: { rich_text: [{ type: 'text', text: { content: 'Steps to Reproduce' } }] }
            },
            {
                object: 'block',
                type: 'numbered_list_item',
                numbered_list_item: { rich_text: [{ type: 'text', text: { content: 'Step 1' } }] }
            },
            {
                object: 'block',
                type: 'numbered_list_item',
                numbered_list_item: { rich_text: [{ type: 'text', text: { content: 'Step 2' } }] }
            }
        ]
    });

    console.log('Bug created:', result.url);
}

createBug().catch(console.error);
"
```

### Option 3: Directly in Notion

1. Open the Bug Tracker database in Notion
2. Click "+ New" to create a new entry
3. Fill in properties:
   - Bug Title (required)
   - Severity
   - Priority
   - I360 Module
4. Add content blocks for Description and Steps to Reproduce
5. Status auto-sets to "New"

---

## Process: Updating a Bug

### Via API

```javascript
// Update status to resolved
await fetch('/api/bugs/bug-id-here', {
    method: 'PATCH',
    headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
    },
    body: JSON.stringify({
        status: 'Resolved'
    })
});
```

### Status Transitions

```
New → Triaged → In Progress → Ready for Testing → Testing → Resolved → Closed
                    ↑                                          ↓
                    └────────────── Reopened ←─────────────────┘
```

---

## Process: Viewing Bug Statistics

### System Health Dashboard

The System Health page (`/system-health.html`) displays a Bug Tracker card with:
- Total bugs count
- Open vs Fixed breakdown
- Bugs by severity
- Refresh button

### Via API

```javascript
const response = await fetch('/api/bugs/summary');
const { total, open, fixed, bySeverity, byStatus } = await response.json();

console.log(`Total: ${total}, Open: ${open}, Fixed: ${fixed}`);
```

---

## Caching

The bug API implements caching to reduce Notion API calls:

- **Default TTL:** 10 seconds (configurable via `BUG_CACHE_TTL_MS`)
- **Cache invalidation:** Automatic on POST/PATCH operations
- **Manual invalidation:** `require('./routes/bugs').invalidateCache()`

---

## Bug Lifecycle

### 1. Bug Reported

- User identifies issue
- Creates bug via API, script, or Notion UI
- Status: `New`
- Date Reported: Auto-set

### 2. Bug Triaged

- Developer reviews bug
- Sets Severity and Priority
- Status: `Triaged`

### 3. Bug Fixed

- Developer implements fix
- Status: `In Progress` → `Ready for Testing`

### 4. Bug Tested

- QA verifies fix
- Status: `Testing` → `Resolved`
- Date Resolved: Auto-set

### 5. Bug Closed

- Fix deployed to production
- Status: `Closed`

### 6. Bug Reopened (if needed)

- Issue reoccurs
- Status: `Reopened`
- Re-enters the fix cycle

---

## Best Practices

### Bug Titles

Good:
- "Chat input clears when switching models"
- "Agent execution timeout with large context"
- "Login fails with special characters in password"

Bad:
- "Bug" (too vague)
- "It doesn't work" (no context)
- "Fix the thing" (not descriptive)

### Severity Guidelines

| Scenario | Severity |
|----------|----------|
| App crashes, data lost | Critical |
| Feature completely broken | High |
| Feature works but impaired | Medium |
| Minor visual issue | Low |
| Typo, cosmetic | Trivial |

### Priority Guidelines

| Scenario | Priority |
|----------|----------|
| Production down | P1 |
| Major feature blocked | P2 |
| Important but not urgent | P3 |
| Nice to have | P4 |
| Someday/maybe | P5 |

---

## Related Files

- `server/routes/bugs.js` - Bug API routes
- `public/system-health.html` - Bug Tracker dashboard card
- `server/services/notionService.js` - General Notion utilities

---

## Troubleshooting

### "NOTION_API_KEY not configured"

Set the `NOTION_API_KEY` environment variable.

### "Unable to fetch bug data from Notion"

- Check network connectivity
- Verify API key is valid
- Ensure integration has database access

### Bugs Not Appearing

- Check cache TTL (wait 10 seconds or call invalidateCache)
- Verify bug was created in the correct database
- Check filter parameters in API call

### Rate Limiting

Notion API has rate limits. If you hit them:
- Reduce request frequency
- Increase cache TTL
- Batch operations where possible

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-16 | Initial process document created |
