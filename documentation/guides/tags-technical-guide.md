# Tag Management Technical Guide

**For:** Developers and System Administrators
**Version:** 3.0
**Last Updated:** January 9, 2026

---

## Overview

The Tag Management system provides a hierarchical tagging framework for categorizing skills, domains, and functions within Insight 360. Tags are used to match users with relevant agents, workflows, and content.

---

## Architecture

### Database Schema

| Table | Purpose |
|-------|---------|
| `tags` | Tag definitions with category and hierarchy |
| `role_tags` | Many-to-many: roles ↔ tags |
| `agent_tags` | Many-to-many: agents ↔ tags |
| `workflow_tags` | Many-to-many: workflows ↔ tags |
| `responsibility_tags` | Many-to-many: responsibilities ↔ tags |

### Tag Structure

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL CHECK (category IN ('skill', 'domain', 'function')),
  parent_id UUID REFERENCES tags(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Endpoints

### Base URL: `/api/tags`

### List Tags

```
GET /
GET /?category=skill&parent_id=uuid&search=analytics
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category (skill, domain, function) |
| `parent_id` | uuid | Filter by parent tag |
| `search` | string | Search by name or description |
| `include_inactive` | boolean | Include inactive tags |
| `limit` | number | Pagination limit (default: 100) |
| `offset` | number | Pagination offset (default: 0) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "analytics",
      "category": "skill",
      "parent_id": null,
      "description": "Data analysis and insights",
      "is_active": true,
      "created_at": "2026-01-09T...",
      "updated_at": "2026-01-09T...",
      "parent": null
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 100,
    "offset": 0
  }
}
```

### Get Single Tag

```
GET /:id
```

Returns tag with parent and children populated.

### Create Tag

```
POST /
```

**Body:**
```json
{
  "name": "data-visualization",
  "category": "skill",
  "parent_id": "uuid-of-analytics-tag",
  "description": "Creating charts and visual data representations"
}
```

**Validation:**
- `name`: Required, unique, max 100 characters
- `category`: Required, must be skill/domain/function
- `parent_id`: Optional, must reference existing tag
- No circular parent references allowed

### Update Tag

```
PUT /:id
```

**Body:**
```json
{
  "name": "updated-name",
  "description": "Updated description",
  "parent_id": "new-parent-uuid",
  "is_active": true
}
```

### Delete Tag

```
DELETE /:id
```

Soft-deletes by setting `is_active = false`. Tags with children cannot be deleted.

### Get Tag Hierarchy

```
GET /hierarchy
```

Returns tags organized in tree structure.

**Response:**
```json
{
  "success": true,
  "data": {
    "skill": [
      {
        "id": "uuid",
        "name": "analytics",
        "children": [
          { "id": "uuid", "name": "data-interpretation", "children": [] }
        ]
      }
    ],
    "domain": [...],
    "function": [...]
  }
}
```

### Get Tag Statistics

```
GET /stats
```

Returns usage counts across entities.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_tags": 50,
    "by_category": {
      "skill": 25,
      "domain": 15,
      "function": 10
    },
    "usage": {
      "roles": 45,
      "agents": 30,
      "workflows": 20
    }
  }
}
```

---

## Tag Categories

### Skill Tags
Technical and soft skills that individuals possess.

**Examples:**
- `analytics` → `data-interpretation`, `forecasting`, `reporting`
- `writing` → `blog-writing`, `copywriting`, `technical-writing`
- `leadership` → `coaching`, `team-management`

### Domain Tags
Business domains and areas of expertise.

**Examples:**
- `marketing` → `content-marketing`, `digital-marketing`, `brand`
- `finance` → `accounting`, `financial-planning`
- `hr` → `talent-acquisition`, `employee-engagement`

### Function Tags
Work functions and responsibilities.

**Examples:**
- `content-creation`
- `data-reporting`
- `customer-support`
- `project-management`

---

## Hierarchical Structure

Tags support parent-child relationships for granular categorization:

```
marketing (domain)
├── content-marketing
├── digital-marketing
├── brand
└── product-marketing

analytics (skill)
├── data-interpretation
├── forecasting
└── reporting
```

### Hierarchy Rules

1. Tags can have one parent (or none for root tags)
2. No circular references allowed
3. Categories don't restrict hierarchy (skill can be child of skill)
4. Deleting parent requires reassigning/deleting children first

---

## Tag Matching

### Role-to-Agent Matching

Users inherit tags from their roles. Agents are matched by tag intersection:

```javascript
// Pseudocode for matching
function matchAgentsToUser(userTags, allAgents) {
  return allAgents.filter(agent => {
    const agentTags = agent.tags.map(t => t.id);
    const intersection = userTags.filter(t => agentTags.includes(t));
    return intersection.length > 0;
  });
}
```

### API for Matched Content

```
GET /api/user-profile/matched-agents
GET /api/user-profile/matched-workflows
```

Returns content filtered by user's tag intersection.

---

## Frontend Integration

### Loading Tags

```javascript
async function loadTags() {
  const response = await fetch('/api/tags');
  const { success, data } = await response.json();

  if (success) {
    renderTagsByCategory(data);
  }
}
```

### Tag Filter Component

```javascript
function filterByCategory(category) {
  const filtered = allTags.filter(tag =>
    category === 'all' || tag.category === category
  );
  renderTags(filtered);
}
```

### Tag Selection (Multi-select)

```javascript
function toggleTagSelection(tagId) {
  const index = selectedTags.indexOf(tagId);
  if (index > -1) {
    selectedTags.splice(index, 1);
  } else {
    selectedTags.push(tagId);
  }
  updateTagDisplay();
}
```

---

## Security & Permissions

### Access Control

| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| Super Admin | ✓ | ✓ | ✓ | ✓ |
| System Admin | ✓ | ✓ | ✓ | - |
| Dept Admin | - | ✓ | - | - |
| User | - | ✓ | - | - |

### RLS Policies

```sql
-- Read: All authenticated users
CREATE POLICY tags_select ON tags
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Modify: Admins only
CREATE POLICY tags_modify ON tags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Tag name already exists` | Duplicate name | Use unique name |
| `Invalid category` | Category not in allowed list | Use: skill, domain, function |
| `Parent tag not found` | Invalid parent_id | Verify parent UUID |
| `Cannot delete tag with children` | Tag has child tags | Remove/reassign children first |
| `Circular reference detected` | Tag's parent chain includes itself | Choose different parent |

---

## Performance Considerations

- Tags are typically small dataset (<500 items)
- Hierarchy queries use recursive CTE
- Tag matching uses indexed joins
- Consider caching tag list on frontend

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [Tags User Guide](./tags-user-guide.md) | End-user documentation |
| [Roles Technical Guide](./roles-technical-guide.md) | Role management API |
| [SynergiNexus Technical Guide](./synerginexus-technical-guide.md) | Governance system |
