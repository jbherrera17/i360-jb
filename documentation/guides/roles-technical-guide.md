# Role Management Technical Guide

**For:** Developers and System Administrators
**Version:** 3.0
**Last Updated:** January 9, 2026

---

## Overview

The Role Management system enables department-specific role templates with hierarchical levels, tag assignments, and responsibility mappings. Roles determine what agents, workflows, and content users can access.

---

## Architecture

### Database Schema

| Table | Purpose |
|-------|---------|
| `department_roles` | Role definitions with department and level |
| `role_tags` | Many-to-many: roles ↔ tags |
| `responsibilities` | Hierarchical responsibility definitions |
| `role_responsibilities` | Many-to-many: roles ↔ responsibilities |
| `user_roles` | Many-to-many: users ↔ roles |
| `user_responsibilities` | User-specific responsibility selections |

### Role Structure

```sql
CREATE TABLE department_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  role_level VARCHAR(20) NOT NULL CHECK (role_level IN ('ic', 'manager', 'director', 'vp', 'c-level')),
  is_system_template BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Endpoints

### Base URL: `/api/roles`

### List Roles

```
GET /
GET /?department_id=uuid&role_level=manager&search=sales
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `department_id` | uuid | Filter by department |
| `role_level` | string | Filter by level |
| `search` | string | Search by name |
| `include_inactive` | boolean | Include inactive roles |
| `limit` | number | Pagination limit (default: 100) |
| `offset` | number | Pagination offset (default: 0) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "department_id": "uuid",
      "name": "Sales Manager",
      "description": "Manages sales team and pipeline",
      "role_level": "manager",
      "is_system_template": true,
      "is_active": true,
      "sort_order": 3,
      "department": {
        "id": "uuid",
        "name": "Sales",
        "icon": "trending-up",
        "color": "#f59e0b"
      },
      "tag_count": 5
    }
  ],
  "pagination": {
    "total": 34,
    "limit": 100,
    "offset": 0
  }
}
```

### Get Single Role

```
GET /:id
```

Returns role with tags and responsibilities populated.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Sales Manager",
    "role_level": "manager",
    "department": {...},
    "tags": [
      { "id": "uuid", "name": "sales", "category": "domain" }
    ],
    "responsibilities": [
      { "id": "uuid", "name": "Pipeline Management", "level": 2 }
    ]
  }
}
```

### Get Role Templates

```
GET /templates
```

Returns system-defined role templates grouped by department.

### Get Role Levels

```
GET /levels
```

Returns available role levels.

**Response:**
```json
{
  "success": true,
  "data": [
    { "value": "ic", "label": "Individual Contributor", "order": 1 },
    { "value": "manager", "label": "Manager", "order": 2 },
    { "value": "director", "label": "Director", "order": 3 },
    { "value": "vp", "label": "Vice President", "order": 4 },
    { "value": "c-level", "label": "C-Level Executive", "order": 5 }
  ]
}
```

### Create Role

```
POST /
```

**Body:**
```json
{
  "department_id": "uuid",
  "name": "Account Executive",
  "description": "Closes deals and manages customer relationships",
  "role_level": "ic",
  "tag_ids": ["uuid", "uuid"],
  "responsibility_ids": ["uuid"]
}
```

### Update Role

```
PUT /:id
```

**Body:**
```json
{
  "name": "Senior Account Executive",
  "description": "Updated description",
  "role_level": "ic",
  "is_active": true
}
```

### Delete Role

```
DELETE /:id
```

Soft-deletes by setting `is_active = false`. Roles with assigned users cannot be deleted.

### Assign Tags to Role

```
POST /:id/tags
```

**Body:**
```json
{
  "tag_ids": ["uuid", "uuid", "uuid"]
}
```

Replaces all existing tag assignments.

### Assign Responsibilities to Role

```
POST /:id/responsibilities
```

**Body:**
```json
{
  "responsibility_ids": ["uuid", "uuid"]
}
```

---

## Responsibilities API

### Base URL: `/api/roles/responsibilities`

### List All Responsibilities

```
GET /all
```

Returns hierarchical responsibility structure.

### Create Responsibility

```
POST /
```

**Body:**
```json
{
  "name": "Budget Oversight",
  "description": "Manage department budget",
  "parent_id": "uuid",
  "level": 2
}
```

---

## Role Levels

| Level | Code | Typical Access |
|-------|------|----------------|
| Individual Contributor | `ic` | Personal tasks, team resources |
| Manager | `manager` | Team oversight, direct reports |
| Director | `director` | Department strategy, cross-team |
| Vice President | `vp` | Division leadership, org-wide |
| C-Level Executive | `c-level` | Enterprise strategy, full access |

### Level-Based Filtering

Higher role levels automatically see content from lower levels:
- C-Level sees all content
- VP sees Director, Manager, IC content
- Director sees Manager, IC content
- Manager sees IC content
- IC sees only IC-level content

---

## Role-Tag-User Flow

### Assignment Flow

1. **Admin creates role** with department and level
2. **Admin assigns tags** to role (skills, domains, functions)
3. **Admin assigns user** to role(s)
4. **System calculates** user's effective tags
5. **Content filtered** by tag intersection

### Effective Tags Calculation

```javascript
function getUserEffectiveTags(userId) {
  const userRoles = await getUserRoles(userId);
  const allTags = new Set();

  for (const role of userRoles) {
    const roleTags = await getRoleTags(role.id);
    roleTags.forEach(tag => allTags.add(tag.id));
  }

  return Array.from(allTags);
}
```

---

## User Role Assignment

### Assign Role to User

```
POST /api/admin/users/:id/roles
```

**Body:**
```json
{
  "role_ids": ["uuid", "uuid"],
  "primary_role_id": "uuid"
}
```

### Get User's Roles

```
GET /api/user-profile/roles
```

**Response:**
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": "uuid",
        "name": "Marketing Manager",
        "is_primary": true,
        "department": {...},
        "tags": [...]
      }
    ],
    "effective_tags": ["uuid", "uuid", ...]
  }
}
```

---

## Frontend Integration

### Loading Roles

```javascript
async function loadRoles() {
  const response = await fetch('/api/roles');
  const { success, data } = await response.json();

  if (success) {
    renderRolesByDepartment(data);
  }
}
```

### Role Card Component

```javascript
function renderRoleCard(role) {
  return `
    <div class="role-card" data-level="${role.role_level}">
      <div class="role-header">
        <span class="department-badge" style="background: ${role.department.color}">
          ${role.department.name}
        </span>
        <span class="level-badge">${formatLevel(role.role_level)}</span>
      </div>
      <h3>${role.name}</h3>
      <p>${role.description}</p>
      <div class="tag-count">${role.tag_count} tags assigned</div>
    </div>
  `;
}
```

### Tag Assignment Modal

```javascript
async function openTagAssignmentModal(roleId) {
  const [role, allTags] = await Promise.all([
    fetch(`/api/roles/${roleId}`).then(r => r.json()),
    fetch('/api/tags').then(r => r.json())
  ]);

  showModal({
    title: `Assign Tags: ${role.data.name}`,
    tags: allTags.data,
    selected: role.data.tags.map(t => t.id),
    onSave: (tagIds) => saveRoleTags(roleId, tagIds)
  });
}
```

---

## Security & Permissions

### Access Control

| Role | Create | Read | Update | Delete | Assign Users |
|------|--------|------|--------|--------|--------------|
| Super Admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| System Admin | ✓ | ✓ | ✓ | - | ✓ |
| Dept Admin | Dept only | ✓ | Dept only | - | Dept only |
| User | - | Own roles | - | - | - |

### RLS Policies

```sql
-- Users can see roles in their department
CREATE POLICY roles_select ON department_roles
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND (
      -- User is in same department
      department_id IN (
        SELECT department_id FROM users WHERE id = auth.uid()
      )
      -- Or user is admin
      OR EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
      )
    )
  );
```

---

## Seed Data

System templates are pre-populated for each department:

```javascript
const seedRoles = [
  // Marketing
  { department: 'Marketing', roles: ['Content Strategist', 'Content Creator', 'Marketing Analyst', 'Campaign Manager', 'Marketing Director', 'VP of Marketing', 'CMO'] },
  // Sales
  { department: 'Sales', roles: ['Sales Development Rep', 'Account Executive', 'Sales Manager', 'Sales Director', 'VP of Sales', 'CRO'] },
  // Finance
  { department: 'Finance', roles: ['Financial Analyst', 'Accountant', 'Finance Manager', 'Finance Director', 'VP of Finance', 'CFO'] },
  // ... etc
];
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Role name already exists` | Duplicate in department | Use unique name |
| `Invalid role level` | Level not in allowed list | Use: ic, manager, director, vp, c-level |
| `Department not found` | Invalid department_id | Verify department UUID |
| `Cannot delete role with users` | Users assigned to role | Reassign users first |
| `Tag not found` | Invalid tag_id in array | Verify tag UUIDs |

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [Roles User Guide](./roles-user-guide.md) | End-user documentation |
| [Tags Technical Guide](./tags-technical-guide.md) | Tag management API |
| [SynergiNexus Technical Guide](./synerginexus-technical-guide.md) | Governance system |
| [User Administration Guide](./admin-user-guide.md) | User management |
