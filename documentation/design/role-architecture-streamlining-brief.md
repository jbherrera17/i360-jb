# Role Architecture Streamlining - Implementation Brief

**Author:** Reese (PM Spec Writer)
**Date:** 2026-03-13
**Status:** DRAFT - Ready for Engineering Review
**WF-06:** Feature Review & Remediation

---

## 1. Executive Summary

Insight 360 has accumulated four overlapping role systems across its schema evolution. This brief defines the target architecture that keeps the two correct systems (`platform_admins` and `organization_members.role`), deprecates the vestigial system (`users.role`), and relocates the misplaced system (`users.business_role` -> `organization_members.business_role`). It also fixes the broken invite flow and the conflated `is_admin` boolean.

---

## 2. Current State: Four Role Systems

| # | System | Location | Values | Scope | Verdict |
|---|--------|----------|--------|-------|---------|
| 1 | Legacy System Role | `users.role` | admin, user, viewer | Global/platform | **DEPRECATE** - replaced by `platform_admins` + `organization_members.role` |
| 2 | Business Role | `users.business_role` | executive, director, manager, supervisor, ic | Global (bug: should be per-org) | **MOVE** to `organization_members.business_role` |
| 3 | Org Member Role | `organization_members.role` | owner, admin, member, viewer | Per-org | **KEEP** - correct |
| 4 | Platform Admin | `platform_admins.role` | super_admin, admin, support | Platform | **KEEP** - correct |

### Current `is_admin` Conflation

The `/me` endpoint (line 751 of `server/routes/auth.js`) returns:

```javascript
is_admin: userResponse.role === 'admin' || is_platform_admin || ['admin', 'owner'].includes(org_role)
```

This merges three completely different privilege levels into a single boolean, making it impossible for the frontend to distinguish between a Synergi platform admin, an org owner, and a user who happened to get `users.role = 'admin'` from the legacy system.

---

## 3. Target State: Streamlined Role Architecture

### Final Role Model

```
+-----------------------------------------------------------+
|                    PLATFORM LAYER                          |
|  platform_admins table (unchanged)                        |
|  Roles: super_admin | admin | support                     |
|  Scope: Synergi staff only, cross-org visibility          |
|  Check: is_platform_admin() SQL function                  |
|  Middleware: requirePlatformAdmin() in moduleAccess.js     |
+-----------------------------------------------------------+
                            |
+-----------------------------------------------------------+
|                 ORGANIZATION LAYER                         |
|  organization_members table                                |
|  Org Role:      owner | admin | member | viewer            |
|  Business Role: executive | director | manager |           |
|                 supervisor | ic                             |
|  Scope: Per user, per org (a user can be admin in Org A    |
|         and member in Org B, executive in A, ic in B)      |
|  Check: query organization_members for the active org      |
+-----------------------------------------------------------+
                            |
+-----------------------------------------------------------+
|                    MODULE LAYER                             |
|  can_access_module() function (updated)                    |
|  Reads business_role from organization_members             |
|  instead of users table                                    |
+-----------------------------------------------------------+
```

### What Gets Removed

- `users.role` column: soft-deprecate (keep column, stop reading it, backfill with DEFAULT 'user')
- `users.business_role` column: soft-deprecate after migrating data to `organization_members`
- `requireAdmin()` in `middleware/auth.js`: remove entirely
- `requireRole()` in `middleware/auth.js`: remove entirely
- `canEditAgent()` / `canDeleteAgent()` in `middleware/auth.js`: refactor to use org membership
- `requireAdmin` (local) in `routes/auth.js`: replace with `requirePlatformAdmin()`
- `isAdmin()` / `isAdminAsync()` in `utils/auth.js`: replace with context-specific checks
- `is_admin` boolean in `/me` response: replace with structured roles object

---

## 4. Implementation Phases

### Phase 1: Deprecate `users.role`

**Goal:** Stop reading `users.role` anywhere in the codebase. Replace all checks with the correct authority source.

#### Files That Read `users.role`

| File | How It Uses `users.role` | Replacement |
|------|-------------------------|-------------|
| `server/middleware/auth.js` line 107 | `authenticate()` fetches `role` from users table, sets `req.userRole` | Fetch org membership role for `req.orgId` instead. Set `req.orgRole`. |
| `server/middleware/auth.js` line 189 | `requireAdmin()` checks `req.userRole !== 'admin'` | **Delete entirely.** All callers must migrate to `requirePlatformAdmin()` or org-role checks. |
| `server/middleware/auth.js` line 209 | `requireAdmin` body: `req.userRole !== 'admin'` | (covered above) |
| `server/middleware/auth.js` line 224-226 | `canEditAgent()` checks `userRole === 'admin'` | Check org membership: `org_role in ('owner','admin')` for the agent's org |
| `server/middleware/auth.js` line 251 | `requireRole()` checks `req.userRole` | **Delete entirely.** Not used by any active route. |
| `server/routes/auth.js` line 676, 751 | `/me` builds `is_admin` from `userResponse.role === 'admin'` | Remove `is_admin`, add structured `roles` object (see Phase 2) |
| `server/routes/auth.js` line 736 | `/me` returns `role: profile?.role \|\| 'user'` | Remove from response (or keep as deprecated field with deprecation warning) |
| `server/routes/auth.js` line 793-798 | Local `requireAdmin` checks `profile?.role === 'admin'` | Replace with `requirePlatformAdmin()` from `moduleAccess.js` |
| `server/routes/auth.js` line 844 | `/users` list: `isPlatformAdmin = req.userRole === 'admin'` | Check `platform_admins` table only |
| `server/routes/auth.js` line 917 | `/users/:id/role` validates `['admin','user','viewer']` | **Remove endpoint entirely** or repurpose for org-role updates |
| `server/routes/model-availability.js` line 18, 44, 66, 84 | Imports and uses `requireAdmin` from `middleware/auth.js` | Change to `requirePlatformAdmin()` from `moduleAccess.js` |
| `server/routes/agents.js` line 762, 862 | `canEditAgent(userRole, userId, agent)` | Refactor to check org membership role |
| `server/utils/auth.js` lines 47-93 | `getUserRole()`, `isAdmin()`, `isAdminAsync()` all read `req.userRole` / `users.role` | Replace with `getOrgRole(req)` and `isPlatformAdmin(req, supabase)` |
| `server/routes/auth.js` line 352 | `reset-password` preserves `existingUser?.role` on upsert | Remove `role` field from upsert; stop writing to `users.role` |
| `server/routes/auth.js` line 864, 876, 890 | `/users` list selects `role` from users table | Remove `role` from select, or keep for backward compat during transition |

#### Auth Route Local `requireAdmin` (line 771-833)

This is a **duplicate** of the middleware version with extra `platform_admins` logic. It protects these endpoints:

- `GET /api/auth/users` (line 839)
- `PUT /api/auth/users/:id/role` (line 912)
- `POST /api/auth/users` (line 971)
- `PUT /api/auth/users/:id` (line 1107)
- `POST /api/auth/users/:id/reset-password` (line 1175)
- `DELETE /api/auth/users/:id` (line 1251)
- `POST /api/auth/sync-users` (line 1376)
- `GET /api/auth/debug-user/:email` (line 1465)
- `GET /api/auth/cache-stats` (line 1522)
- `GET /api/auth/roles-summary` (line 1541)

**All of these** should use `requirePlatformAdmin()` from `moduleAccess.js`, with org-admin users getting scoped access via a new `requireOrgAdmin()` middleware.

#### Migration Path

1. Add `requireOrgAdmin()` middleware to `moduleAccess.js` that checks `organization_members.role in ('owner','admin')` for the current org context
2. Replace all `requireAdmin` imports and usages across the codebase
3. Stop setting `req.userRole` from `users.role` in `authenticate()` middleware
4. Add `req.orgRole` (from `organization_members`) to `authenticate()` middleware
5. **Do NOT drop `users.role` column yet** -- leave it in the schema as a deprecated field with DEFAULT 'user'

---

### Phase 2: Fix `/me` Response Shape

**Goal:** Replace the conflated `is_admin` boolean with structured role information.

#### Current Response Shape (Broken)

```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "...",
    "display_name": "...",
    "role": "admin",           // <-- vestigial users.role
    "is_admin": true,          // <-- conflates 3 concepts
    "is_platform_admin": true,
    "platform_admin_role": "super_admin",
    "org_role": "owner"
  }
}
```

#### New Response Shape

```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "...",
    "display_name": "...",
    "preferences": {},
    "created_at": "...",

    "roles": {
      "platform": {
        "is_admin": true,
        "role": "super_admin"
      },
      "org": {
        "org_id": "57234ef8-...",
        "role": "owner",
        "business_role": "executive"
      }
    },

    "is_admin": true,          // DEPRECATED: kept for backward compat during transition
    "role": "admin"            // DEPRECATED: kept for backward compat during transition
  }
}
```

#### Frontend Files That Consume `is_admin`

| File | Usage | Required Change |
|------|-------|-----------------|
| `public/js/navigation.js` line 326 | `isCurrentUserAdmin()` checks `user.is_admin` | Update to check `user.roles.platform.is_admin \|\| ['owner','admin'].includes(user.roles.org?.role)` |
| `public/js/navigation.js` line 563 | Shows/hides Administrator link based on role/is_admin/org_role | Use `user.roles` structure |
| `public/js/navigation.js` line 669 | `refreshAuthFields()` syncs `is_admin` to localStorage | Sync `roles` object instead |
| `public/admin.html` line 2700 | `if (!user.is_admin)` gates admin page access | Check `user.roles.platform.is_admin \|\| ['owner','admin'].includes(user.roles.org?.role)` |
| `__tests__/integration/routes/auth.test.js` line 404 | `expect(response.body.user.is_admin).toBe(true)` | Update test to check new `roles` structure |

#### Migration Strategy

1. **Week 1:** Add `roles` object to `/me` response alongside existing fields (backward compatible)
2. **Week 2:** Update all frontend consumers to read from `roles`
3. **Week 3:** Add deprecation warning header when frontend sends requests that rely on `is_admin`
4. **Week 4:** Remove deprecated `is_admin` and top-level `role` from response

---

### Phase 3: Fix Invite Flow

**Goal:** Invited users should have `organization_members.status = 'pending'` until they accept the invite.

#### Current Behavior (Bug)

In `server/routes/org-members.js` line 286:
```javascript
// New membership - status is 'active' immediately
status: 'active',
```

And line 267 (reactivated members):
```javascript
status: 'active',
```

The invited user gets full `active` membership before accepting the invite. They appear in member lists and can access org resources before they've even set a password.

#### Required Changes

| File | Line | Current | Fix |
|------|------|---------|-----|
| `server/routes/org-members.js` | 286 | `status: 'active'` | `status: 'pending'` |
| `server/routes/org-members.js` | 267 | `status: 'active'` (reactivated) | `status: 'pending'` |
| `server/routes/org-members.js` | 60 | `.neq('status', 'removed')` (member list) | Keep as-is; pending members should be visible to admins with a badge |
| `server/routes/organizations.js` | 43 | `.eq('status', 'active')` (org list for user) | Keep as-is; users should only see orgs where they're `active` |
| `server/routes/auth.js` | accept-invite handler | Does not update `organization_members.status` | Add: set `status = 'active'` and `joined_at = NOW()` when invite is accepted |
| `server/routes/users.js` line 483 | `status: 'active'` in assignments endpoint | `status: 'pending'` for invites, `'active'` for direct admin assignment |

#### Accept-Invite Enhancement

The existing `POST /api/auth/accept-invite` endpoint (line 385 in auth.js) currently:
1. Verifies the token
2. Sets the password
3. Updates `users.status` to 'active'

It must also:
4. Find the user's `organization_members` records with `status = 'pending'`
5. Set them to `status = 'active'` and `joined_at = NOW()`

#### Downstream Impact

- Member count queries filtering `status = 'active'` will correctly exclude pending invitees
- `check_org_limits` will only count active members toward limits (correct behavior)
- The org member list UI should show pending members with a "Pending" badge and a "Resend Invite" action

---

### Phase 4: Move `business_role` to `organization_members`

**Goal:** Make business role per-org instead of per-user, so a user can be "executive" in one org and "manager" in another.

#### Schema Change

```sql
-- Add business_role to organization_members
ALTER TABLE organization_members
ADD COLUMN business_role TEXT REFERENCES business_role_levels(id) DEFAULT 'ic';

-- Migrate existing data from users table
UPDATE organization_members om
SET business_role = COALESCE(u.business_role, 'ic')
FROM users u
WHERE om.user_id = u.id;

-- After verification, deprecate users.business_role
-- (do NOT drop yet - leave as deprecated)
COMMENT ON COLUMN users.business_role IS 'DEPRECATED: Use organization_members.business_role instead. Will be removed in Phase 70+.';
```

#### Update `can_access_module()` SQL Function

Current (line 485-486 of `phase44-enterprise-multitenancy.sql`):
```sql
SELECT business_role INTO v_business_role FROM users WHERE id = p_user_id;
```

New:
```sql
SELECT business_role INTO v_business_role
FROM organization_members
WHERE user_id = p_user_id AND org_id = v_org_id AND status = 'active';
IF v_business_role IS NULL THEN v_business_role := 'ic'; END IF;
```

#### Update `role_module_access` Table

The `role_module_access` table already references `business_role_levels(id)` and is org-scoped -- no schema change needed. The only change is in the `can_access_module()` function that reads the role from the wrong table.

#### Downstream Impact

| File | Current Usage | Required Change |
|------|--------------|-----------------|
| `server/routes/users.js` lines 31, 110 | Selects `business_role` from users | Add join to `organization_members` or accept from request context |
| `server/routes/users.js` line 321 | Updates `users.business_role` | Update `organization_members.business_role` instead, require `org_id` |
| `server/routes/auth.js` line 864, 890 | Selects `business_role` from users in admin user list | Join from `organization_members` |
| `server/routes/business-roles.js` line 207 | Reads `users.business_role` for user permissions | Read from `organization_members` with org context |
| `server/routes/modules.js` line 635 | Writes `role_module_access.business_role` | No change needed (already per-org) |
| `server/services/conversationService.js` | Reads `business_role` | Needs org context to read from `organization_members` |
| `server/routes/execute120.js` | Reads `business_role` | Needs org context |
| `server/routes/connections.js` | Reads `business_role` | Needs org context |
| `server/routes/social-publish.js` | Reads `business_role` | Needs org context |
| `server/utils/resourceAccess.js` | May reference `business_role` | Needs org context |
| `db/phase44-enterprise-multitenancy.sql` | `can_access_module()` reads from `users.business_role` | **Critical:** Update function source |

---

## 5. Downstream Impact Analysis

### What Breaks If We Just Delete `users.role`

1. **`authenticate()` middleware** stops setting `req.userRole` -> every route that reads `req.userRole` gets `undefined`
2. **`requireAdmin()` middleware** stops working -> all admin-protected routes return 403
3. **`model-availability.js`** admin routes become inaccessible
4. **Agent edit/delete** permission checks fail (return false for everyone)
5. **`/me` endpoint** returns `role: undefined`
6. **Frontend `navigation.js`** shows wrong role label, hides admin links
7. **`admin.html`** access denied for everyone

### What Breaks If We Just Delete `users.business_role`

1. **`can_access_module()`** returns FALSE for all module checks -> every `requireModule()` protected route returns 403
2. **Navigation** breaks (uses `get_user_modules()` which calls `can_access_module()`)
3. **User management UI** loses business role display
4. **Business roles admin page** loses user role data

### Safe Migration Order

The phases MUST be executed in order: 1 -> 2 -> 3 -> 4.

- Phase 1 has the widest blast radius but is self-contained once `requireOrgAdmin()` exists
- Phase 2 depends on Phase 1 (needs the new role source)
- Phase 3 is independent but logically follows the auth cleanup
- Phase 4 depends on Phase 1 (needs org-scoped auth context flowing through requests)

---

## 6. Failure Scenarios

| Scenario | Risk Level | Mitigation |
|----------|-----------|------------|
| Platform admin loses access during Phase 1 migration | **HIGH** | Deploy `requirePlatformAdmin()` replacements first, verify access, THEN remove `requireAdmin()` |
| Existing users with `users.role = 'admin'` lose admin access | **HIGH** | Ensure all `users.role = 'admin'` users are also in `platform_admins` table BEFORE removing the check. Run audit query first. |
| `can_access_module()` returns FALSE after Phase 4 | **HIGH** | Deploy updated SQL function and backfill `organization_members.business_role` in the SAME migration transaction |
| Pending invite users lose access during Phase 3 | **MEDIUM** | Only apply `status = 'pending'` to NEW invites. Do NOT retroactively change existing `active` memberships. |
| Frontend breaks on missing `is_admin` field | **MEDIUM** | Keep `is_admin` in response during transition period (Phases 2a-2c). Remove only after all frontend code is updated. |
| Cached profiles in `cacheService` serve stale role data | **LOW** | Invalidate all profile caches when deploying each phase. Add cache version key. |
| `users.role` column has NOT NULL constraint | **LOW** | Check constraint before migration. If NOT NULL, set DEFAULT 'user' and backfill before removing reads. |

### Pre-Migration Audit Queries

```sql
-- Find all users with users.role = 'admin' who are NOT in platform_admins
SELECT u.id, u.email, u.role
FROM users u
LEFT JOIN platform_admins pa ON pa.user_id = u.id AND pa.is_active = true
WHERE u.role = 'admin' AND pa.id IS NULL;

-- Find users with business_role set but no org membership
SELECT u.id, u.email, u.business_role
FROM users u
LEFT JOIN organization_members om ON om.user_id = u.id AND om.status = 'active'
WHERE u.business_role IS NOT NULL AND om.id IS NULL;

-- Find invitees with active membership but no password set
SELECT om.user_id, u.email, om.status, u.status as user_status
FROM organization_members om
JOIN users u ON u.id = om.user_id
WHERE u.status = 'invited' AND om.status = 'active';
```

---

## 7. New Middleware Specification

### `requireOrgAdmin()`

```javascript
// Add to server/middleware/moduleAccess.js
const requireOrgAdmin = (allowedRoles = ['owner', 'admin']) => {
    return async (req, res, next) => {
        const userId = req.userId;
        const orgId = req.headers['x-org-id'] || req.query.org_id || req.orgId;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        if (!orgId) {
            return res.status(400).json({ success: false, error: 'Organization context required' });
        }

        // Platform admins bypass org role check
        const { data: isAdmin } = await supabase.rpc('is_platform_admin', { p_user_id: userId });
        if (isAdmin) return next();

        const { data: membership } = await supabase
            .from('organization_members')
            .select('role')
            .eq('org_id', orgId)
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (!membership || !allowedRoles.includes(membership.role)) {
            return res.status(403).json({
                success: false,
                error: `Org admin access required (${allowedRoles.join('/')})`
            });
        }

        req.orgRole = membership.role;
        next();
    };
};
```

### Updated `authenticate()` Middleware

Add org role fetching to the existing `authenticate()` function:

```javascript
// After fetching profile (line 105-116 in auth.js middleware)
// Also fetch org role for the user's default org
if (req.orgId) {
    try {
        const { data: membership } = await supabase
            .from('organization_members')
            .select('role, business_role')
            .eq('user_id', user.id)
            .eq('org_id', req.orgId)
            .eq('status', 'active')
            .single();

        req.orgRole = membership?.role || null;
        req.businessRole = membership?.business_role || 'ic';
    } catch (e) {
        req.orgRole = null;
        req.businessRole = 'ic';
    }
}
```

---

## 8. Acceptance Criteria

### Phase 1: Deprecate `users.role`

- [ ] `requireAdmin()` from `middleware/auth.js` is no longer imported or called anywhere
- [ ] `requireRole()` from `middleware/auth.js` is no longer imported or called anywhere
- [ ] `model-availability.js` uses `requirePlatformAdmin()` instead of `requireAdmin`
- [ ] All admin endpoints in `routes/auth.js` use `requirePlatformAdmin()` or `requireOrgAdmin()`
- [ ] `authenticate()` middleware no longer fetches `users.role`
- [ ] `req.userRole` is no longer set from `users.role` (replaced by `req.orgRole`)
- [ ] `canEditAgent()` / `canDeleteAgent()` check org membership, not `users.role`
- [ ] Pre-migration audit confirms all `users.role = 'admin'` users exist in `platform_admins`
- [ ] `server/utils/auth.js` functions updated or removed
- [ ] All existing tests pass or are updated

### Phase 2: Fix `/me` Response Shape

- [ ] `/me` response includes `roles` object with `platform` and `org` sub-objects
- [ ] `is_admin` boolean still present (deprecated) for backward compatibility
- [ ] `public/js/navigation.js` reads from `roles` structure
- [ ] `public/admin.html` reads from `roles` structure
- [ ] `isCurrentUserAdmin()` in navigation.js uses new `roles` structure
- [ ] Auth test updated to verify new response shape
- [ ] Console deprecation warning logged when `is_admin` is the sole field checked

### Phase 3: Fix Invite Flow

- [ ] New invites create `organization_members` with `status = 'pending'`
- [ ] `POST /api/auth/accept-invite` sets `organization_members.status = 'active'`
- [ ] Existing `active` memberships are NOT retroactively changed
- [ ] Member list endpoint shows pending members to org admins
- [ ] Pending members do NOT appear in the user's org list (`GET /api/organizations`)
- [ ] `check_org_limits` counts only `active` members (verify existing behavior)
- [ ] Role validation is consistent: invite and update both accept `[owner, admin, member, viewer]`

### Phase 4: Move `business_role` to `organization_members`

- [ ] `organization_members` table has `business_role` column with FK to `business_role_levels`
- [ ] Existing `users.business_role` data migrated to all active `organization_members` records
- [ ] `can_access_module()` SQL function reads from `organization_members.business_role`
- [ ] `role_module_access` lookups still work correctly
- [ ] `users.business_role` column has deprecation comment
- [ ] User management UI shows per-org business role
- [ ] All routes that read `business_role` use org-scoped version
- [ ] Navigation module loading still works correctly

---

## 9. Effort Estimates

| Phase | Effort | Risk | Files Changed |
|-------|--------|------|---------------|
| Phase 1 | 3-4 days | High | ~12 files |
| Phase 2 | 1-2 days | Medium | ~5 files |
| Phase 3 | 1 day | Low | ~3 files |
| Phase 4 | 2-3 days | High | ~10 files + 1 SQL migration |
| **Total** | **7-10 days** | | |

---

## 10. Files Reference Index

### Server Middleware
- `/server/middleware/auth.js` -- `authenticate()`, `requireAdmin()`, `requireRole()`, `canEditAgent()`, `canDeleteAgent()`
- `/server/middleware/moduleAccess.js` -- `requirePlatformAdmin()`, `requireModule()`, `requireOrgAdmin()` (new)

### Server Routes
- `/server/routes/auth.js` -- `/me`, `/login`, local `requireAdmin`, user CRUD
- `/server/routes/agents.js` -- uses `canEditAgent()`, `canDeleteAgent()`
- `/server/routes/model-availability.js` -- imports `requireAdmin` from middleware
- `/server/routes/organizations.js` -- org CRUD, checks org membership
- `/server/routes/org-members.js` -- invite flow, member management
- `/server/routes/users.js` -- user management, reads `business_role`
- `/server/routes/business-roles.js` -- business role configuration
- `/server/routes/modules.js` -- module access, reads `business_role`
- `/server/routes/platformAdmin.js` -- uses local `requireAdminWrite` (correct pattern)
- `/server/routes/execute120.js` -- reads `business_role`
- `/server/routes/connections.js` -- reads `business_role`
- `/server/routes/social-publish.js` -- reads `business_role`
- `/server/routes/user-profile.js` -- reads `business_role`

### Server Utils/Services
- `/server/utils/auth.js` -- `getUserRole()`, `isAdmin()`, `isAdminAsync()`
- `/server/utils/resourceAccess.js` -- may reference `business_role`
- `/server/services/conversationService.js` -- reads `business_role`

### Frontend
- `/public/js/navigation.js` -- `isCurrentUserAdmin()`, `refreshAuthFields()`, role display
- `/public/admin.html` -- `is_admin` gate check

### Database
- `/db/migration-user-roles.sql` -- original `users.role` migration
- `/db/phase13-business-roles.sql` -- `business_role` system
- `/db/phase39-agency-foundation.sql` -- `organizations`, `organization_members`
- `/db/phase44-enterprise-multitenancy.sql` -- `platform_admins`, `can_access_module()`

### Tests
- `/__tests__/integration/routes/auth.test.js` -- checks `is_admin` in response
