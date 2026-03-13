# Role Change Audit Technical Guide

**For:** Developers and System Administrators
**Version:** 1.0
**Last Updated:** March 13, 2026
**Migration:** `db/phase70-role-change-audit.sql`

---

## Overview

Phase 70 introduced a tamper-resistant audit trail for every role and permission change across the platform. All writes to `platform_admins`, `organization_members`, and `client_users` that change a user's role or status are logged to `role_change_audit`. The audit log is append-only (no UPDATE or DELETE policies are exposed to application code).

---

## Database Schema

### Table: `role_change_audit`

```sql
CREATE TABLE IF NOT EXISTS role_change_audit (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    changed_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    change_type      TEXT        NOT NULL,   -- see allowed values below
    entity_type      TEXT        NOT NULL,   -- see allowed values below
    entity_id        UUID,                   -- specific record that changed
    org_id           UUID        REFERENCES organizations(id) ON DELETE SET NULL,
    old_value        TEXT,                   -- previous role/status
    new_value        TEXT,                   -- new role/status
    reason           TEXT,
    ip_address       INET,
    user_agent       TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Allowed `change_type` values

| Value | When logged |
|-------|-------------|
| `platform_admin_granted` | User added to `platform_admins` |
| `platform_admin_updated` | Existing platform admin role changed |
| `platform_admin_removed` | Platform admin deactivated |
| `org_member_invited` | New org membership created |
| `org_member_role_changed` | Org membership role updated |
| `org_member_activated` | Suspended/removed member reactivated |
| `org_member_suspended` | Member suspended |
| `org_member_removed` | Member removed (soft delete) |
| `org_ownership_transferred` | Org ownership moved to another user |
| `business_role_changed` | User's `business_role` field updated |
| `client_access_granted` | `client_users` entry created |
| `client_access_role_changed` | `client_users` role updated |
| `client_access_removed` | `client_users` entry deactivated |

### Allowed `entity_type` values

| Value | Source table |
|-------|-------------|
| `platform_admins` | `platform_admins` |
| `organization_members` | `organization_members` |
| `client_users` | `client_users` |
| `users` | `users` (business_role changes) |

### Indexes

```sql
idx_role_audit_target_user  ON (target_user_id, created_at DESC)
idx_role_audit_changed_by   ON (changed_by, created_at DESC)
idx_role_audit_org          ON (org_id, created_at DESC) WHERE org_id IS NOT NULL
idx_role_audit_type         ON (change_type, created_at DESC)
idx_role_audit_created      ON (created_at DESC)
```

### View: `role_changes_summary`

A read-optimized view that joins `role_change_audit` with `users` (for emails/names) and `organizations` (for org names). Useful for admin dashboards.

---

## RLS Policies

Row Level Security is enabled on `role_change_audit`. The service role key (used server-side) bypasses RLS for all operations.

| Policy | Access |
|--------|--------|
| Service role full access | `ALL` — server-side operations |
| Platform admins can read | `SELECT` — any entry |
| Org admins can read org entries | `SELECT` — entries where `org_id` matches an org the user owns/admins |

No `INSERT`, `UPDATE`, or `DELETE` policies are granted to authenticated users. All writes happen exclusively through the service role key from Express route handlers.

---

## Where Audit Logging Is Called

Audit entries are written by two helper functions — one per route file. Both are fire-and-forget (non-blocking); a failure to write the audit log does not fail the primary request.

### `server/routes/users.js` — `logRoleChange()`

Called for changes to `platform_admins` via `PUT /api/users/:id/assignments`:

- Platform admin granted
- Platform admin updated
- Platform admin removed

### `server/routes/org-members.js` — `logRoleChange()`

Called for all org membership lifecycle events:

- `POST /:orgId/invite` → `org_member_invited`
- `PUT /:orgId/:memberId` → `org_member_role_changed` or `org_ownership_transferred`
- `DELETE /:orgId/:memberId` → `org_member_removed`

---

## API Endpoints

Route file: `server/routes/roleAudit.js`
Mounted at: `/api/role-audit`

### GET /api/role-audit

List audit entries with optional filters. Access rules:
- Platform admins see all entries (no `org_id` required)
- Org owners/admins must supply `org_id` and are scoped to that org only

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Results per page (default: 50) |
| `offset` | number | Pagination offset (default: 0) |
| `org_id` | uuid | Scope to a specific organization |
| `target_user_id` | uuid | Filter by affected user |
| `change_type` | string | Filter by event type |
| `entity_type` | string | Filter by entity table |
| `start_date` | ISO 8601 | Filter entries after this date |
| `end_date` | ISO 8601 | Filter entries before this date |

**Response shape:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "target_user_id": "uuid",
      "changed_by": "uuid",
      "change_type": "org_member_role_changed",
      "entity_type": "organization_members",
      "entity_id": "uuid",
      "org_id": "uuid",
      "old_value": "member",
      "new_value": "admin",
      "reason": "Role changed from member to admin",
      "created_at": "2026-03-13T10:00:00Z",
      "target_user": { "id": "uuid", "email": "user@example.com", "display_name": "Jane Smith" },
      "changed_by_user": { "id": "uuid", "email": "admin@example.com", "display_name": "John Admin" },
      "organization": { "id": "uuid", "name": "Acme Corp" }
    }
  ],
  "count": 1
}
```

### GET /api/role-audit/summary

Platform admins only. Returns change-type counts for a configurable rolling window.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `days` | number | Rolling window in days (default: 30) |

**Response shape:**

```json
{
  "success": true,
  "data": {
    "period_days": 30,
    "since": "2026-02-11T10:00:00Z",
    "total_changes": 42,
    "by_type": {
      "org_member_invited": 15,
      "org_member_role_changed": 12,
      "org_member_removed": 8,
      "platform_admin_granted": 2,
      "org_ownership_transferred": 1
    }
  }
}
```

---

## Access Control Summary

| Caller | `/api/role-audit` | `/api/role-audit/summary` |
|--------|-------------------|---------------------------|
| Platform admin | All entries (no org filter needed) | Yes |
| Org owner/admin | Must supply `org_id`; sees own org only | No |
| Regular member | 403 | 403 |
| Unauthenticated | 401 | 401 |

---

## Extending the Audit Trail

To log a new type of role change from a route handler:

1. Add the new `change_type` value to the `CHECK` constraint in `role_change_audit` (new migration required).
2. Add the new `entity_type` value if the source table is new.
3. Call `logRoleChange()` from the relevant route handler after the primary operation succeeds.
4. Keep the call non-blocking (do not await in a way that blocks the response if logging fails).

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [Roles Technical Guide](./roles-technical-guide.md) | Full role architecture including Phase 70 security hardening |
| [Team Members User Guide](./admin-org-members-user-guide.md) | End-user guide for org member management |
| [Platform Administration User Guide](./admin-platform-user-guide.md) | Platform admin dashboard (users, tiers, modules) |
