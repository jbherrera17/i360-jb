# Role Architecture Streamlining - Test Plan

**QA Analyst:** Morgan (PM QA Analyst)
**Date:** 2026-03-13
**WF-06:** Feature Review & Remediation
**Status:** Ready for Review

---

## 1. Test Matrix - Role Combinations

Every row represents a user persona that must be tested across all four phases. These are the minimum distinct role configurations the system must handle correctly.

### 1.1 Primary Personas

| ID | Persona | `users.role` | `platform_admins` | `organization_members.role` | `org_members.status` | `users.business_role` | `users.status` |
|----|---------|-------------|-------------------|---------------------------|---------------------|----------------------|---------------|
| P1 | Legacy Admin | `admin` | not present | `member` | `active` | `manager` | `active` |
| P2 | New-Style Platform Admin | `user` | `super_admin` (active) | `owner` | `active` | `executive` | `active` |
| P3 | Platform Support | `user` | `support` (active) | not a member | n/a | `ic` | `active` |
| P4 | Org Owner | `user` | not present | `owner` | `active` | `director` | `active` |
| P5 | Org Admin | `user` | not present | `admin` | `active` | `manager` | `active` |
| P6 | Org Member | `user` | not present | `member` | `active` | `ic` | `active` |
| P7 | Org Viewer | `viewer` | not present | `viewer` | `active` | `ic` | `active` |
| P8 | Multi-Org User (Admin/Member) | `user` | not present | `admin` in Org-A, `member` in Org-B | `active` in both | `manager` | `active` |
| P9 | Invited User (premature active) | `user` | not present | `member` | `active` (BUG) | null | `invited` |
| P10 | Invited User (correct pending) | `user` | not present | `member` | `pending` | null | `invited` |
| P11 | No-Org User | `user` | not present | no rows | n/a | null | `active` |
| P12 | Suspended User | `user` | not present | `member` | `active` | `ic` | `suspended` |
| P13 | Deactivated Platform Admin | `user` | `admin` (is_active=false) | `owner` | `active` | `executive` | `active` |
| P14 | Removed Org Member | `user` | not present | `member` | `removed` | `ic` | `active` |

### 1.2 Compound Edge Cases

| ID | Scenario | Why It Matters |
|----|----------|---------------|
| C1 | P1 after Phase 1 deploys | Legacy admin must not lose access if `users.role` stops being checked |
| C2 | P2 with `users.role = 'user'` | Must gain admin access through `platform_admins` alone |
| C3 | P8 switching default org from Org-A to Org-B | `org_role` in `/me` response must reflect the new default org |
| C4 | P9 during Phase 3 migration | Premature `active` status must be corrected to `pending` |
| C5 | P13 attempting platform admin actions | Deactivated admin must be rejected by `is_platform_admin()` |
| C6 | User is P4 in one org and P7 in another | Module access must be scoped to the org in context, not the default org |

---

## 2. Access Control Verification

### 2.1 Routes Using `requireAdmin` from `server/middleware/auth.js` (Reads `users.role`)

These routes check `req.userRole === 'admin'` which comes from `users.role`. Phase 1 must replace these.

| Route | File | Current Gate | BEFORE (who has access) | AFTER (who should have access) |
|-------|------|-------------|------------------------|-------------------------------|
| `POST /api/models/availability/check` | `model-availability.js:44` | `requireAdmin` (middleware) | `users.role = 'admin'` | `platform_admins` OR `organization_members.role IN ('owner','admin')` |
| `GET /api/models/availability/config` | `model-availability.js:66` | `requireAdmin` (middleware) | `users.role = 'admin'` | `platform_admins` OR `organization_members.role IN ('owner','admin')` |
| `PUT /api/models/availability/config` | `model-availability.js:84` | `requireAdmin` (middleware) | `platform_admins` only (write is sensitive) | `platform_admins` only |

### 2.2 Routes Using Local `requireAdmin` in `server/routes/auth.js` (Hybrid Check)

The auth.js route file defines its **own** `requireAdmin` (line 771) that already checks both `users.role` AND `platform_admins`. Phase 1 must remove the `users.role` check from this function.

| Route | Line | Current Gate | BEFORE | AFTER |
|-------|------|-------------|--------|-------|
| `GET /api/auth/users` | 839 | local `requireAdmin` | `users.role = 'admin'` OR `platform_admins` | `platform_admins` OR `org_members.role IN ('owner','admin')` |
| `PUT /api/auth/users/:id/role` | 912 | local `requireAdmin` | same | `platform_admins` only (role changes are sensitive) |
| `POST /api/auth/users` | 971 | local `requireAdmin` | same | `platform_admins` OR `org_members.role IN ('owner','admin')` |
| `PUT /api/auth/users/:id` | 1107 | local `requireAdmin` | same | `platform_admins` OR `org_members.role IN ('owner','admin')` |
| `POST /api/auth/users/:id/reset-password` | 1175 | local `requireAdmin` | same | `platform_admins` only |
| `DELETE /api/auth/users/:id` | 1251 | local `requireAdmin` | same | `platform_admins` only |
| `POST /api/auth/sync-users` | 1376 | local `requireAdmin` | same | `platform_admins` only |
| `GET /api/auth/debug-user/:email` | 1465 | local `requireAdmin` | same | `platform_admins` only |
| `GET /api/auth/cache-stats` | 1522 | local `requireAdmin` | same | `platform_admins` only |
| `GET /api/auth/roles-summary` | 1541 | local `requireAdmin` | same | `platform_admins` OR `org_members.role IN ('owner','admin')` |

### 2.3 Routes Using `requirePlatformAdmin` from `moduleAccess.js` (Already Correct)

These routes already use the `platform_admins` table and are **not affected** by Phase 1. Verify they continue to work.

| Route | File | Notes |
|-------|------|-------|
| All `/api/platform/*` routes | `platformAdmin.js` | Uses `requirePlatformAdmin()` and `requireAdminWrite` (which calls `requirePlatformAdmin(['super_admin','admin'])`) |

### 2.4 `canEditAgent` / `canDeleteAgent` (middleware/auth.js lines 224-245)

Currently checks `userRole === 'admin'` where `userRole` comes from `users.role`.

| Action | BEFORE | AFTER |
|--------|--------|-------|
| Edit system agent | `users.role = 'admin'` | `platform_admins` OR `org_members.role IN ('owner','admin')` |
| Edit own agent | Any authenticated user | No change |
| Delete system agent | `users.role = 'admin'` | Same as edit system agent |

### 2.5 `/me` Endpoint Response Shape (Phase 2)

**Current response:**
```json
{
  "user": {
    "id": "...",
    "role": "admin",           // from users.role
    "is_admin": true,          // derived: users.role=admin OR platform_admin OR org_role in [admin,owner]
    "is_platform_admin": true,
    "platform_admin_role": "super_admin",
    "org_role": "owner"
  }
}
```

**Target response (Phase 2):**
```json
{
  "user": {
    "id": "...",
    "role": "user",                    // users.role (kept for backward compat but deprecated)
    "is_platform_admin": true,
    "platform_role": "super_admin",
    "org_role": "owner",
    "is_admin": true                   // DEPRECATED: computed for backward compat during transition
  }
}
```

**Frontend consumers of `is_admin` (must be updated in Phase 2):**

| File | Line | Current Usage | Required Change |
|------|------|---------------|----------------|
| `public/admin.html` | 2700 | `if (!user.is_admin)` gate page access | Check `is_platform_admin` or `org_role` |
| `public/agents.html` | 2952 | `currentUser?.role === 'admin'` for system agent editing | Check `is_platform_admin` or `org_role in ['admin','owner']` |
| `public/js/navigation.js` | 326 | `user.role === 'admin' \|\| user.is_platform_admin \|\| org_role...` | Simplify to structured check |
| `public/js/navigation.js` | 669 | `stored.is_admin = data.user.is_admin` | Store `is_platform_admin` + `org_role` |
| `public/js/direction-modal.js` | 43 | `user.role === 'admin'` | Check `is_platform_admin` or `org_role` |
| `public/js/dashboard.js` | 219-220 | `userRole === 'admin' \|\| 'owner'` | No change needed (already checks both) |

### 2.6 Regression Matrix

For each persona (P1-P14), verify these operations after all phases:

| Operation | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8(A) | P8(B) | P9 | P10 | P11 | P12 |
|-----------|----|----|----|----|----|----|----|----|-----|----|----|-----|-----|
| Login | Y | Y | Y | Y | Y | Y | Y | Y | Y | N* | N* | Y | N |
| `/me` returns 200 | Y | Y | Y | Y | Y | Y | Y | Y | Y | - | - | Y | - |
| View agents | Y | Y | Y | Y | Y | Y | RO | Y | Y | - | - | Y | - |
| Edit system agent | **Y->N** | Y | N | N | N | N | N | N | N | - | - | N | - |
| Admin user list | **Y->N** | Y | Y | Y | Y | N | N | Y | N | - | - | N | - |
| Platform admin pages | N | Y | Y* | N | N | N | N | N | N | - | - | N | - |
| Invite org members | N | Y | N | Y | Y | N | N | Y | N | - | - | N | - |
| Access module (by tier) | Y | Y | Y | Y | Y | Y | Y | Y | Y | - | - | N | - |

Legend: Y=allowed, N=denied, RO=read-only, Y->N=currently allowed but SHOULD be denied after phase 1, N*=should be blocked by invite flow, Y*=read-only support access

**Critical regressions to watch:**
- P1 (Legacy Admin): Loses admin access after Phase 1. **Mitigation required:** Before Phase 1, all `users.role = 'admin'` users must be added to `platform_admins` table.
- P9 (premature active invite): Phase 3 must fix existing records, not just future invites.

---

## 3. Data Integrity Tests

### 3.1 Pre-Migration Verification Queries

Run these BEFORE any migration to establish baseline:

```sql
-- 3.1.1: Count users with admin role who are NOT in platform_admins
SELECT u.id, u.email, u.role, u.status
FROM users u
WHERE u.role = 'admin'
AND u.id NOT IN (SELECT user_id FROM platform_admins WHERE is_active = true);
-- EXPECTED: These users need platform_admins rows BEFORE Phase 1

-- 3.1.2: Count invited users with premature active org membership
SELECT u.id, u.email, u.status AS user_status, om.status AS org_status, om.org_id
FROM users u
JOIN organization_members om ON om.user_id = u.id
WHERE u.status = 'invited'
AND om.status = 'active';
-- EXPECTED: These records will be fixed in Phase 3

-- 3.1.3: Baseline business_role distribution
SELECT u.business_role, COUNT(*) as cnt
FROM users u
WHERE u.business_role IS NOT NULL
GROUP BY u.business_role;
-- EXPECTED: All values are one of: executive, director, manager, supervisor, ic

-- 3.1.4: Users in multiple orgs
SELECT u.id, u.email, COUNT(om.org_id) as org_count,
       array_agg(om.role) as roles, array_agg(om.org_id) as orgs
FROM users u
JOIN organization_members om ON om.user_id = u.id
WHERE om.status = 'active'
GROUP BY u.id, u.email
HAVING COUNT(om.org_id) > 1;
```

### 3.2 Post-Phase-1 Integrity Checks

```sql
-- 3.2.1: Every former users.role='admin' user must be in platform_admins
SELECT u.id, u.email
FROM users u
WHERE u.role = 'admin'
AND u.id NOT IN (SELECT user_id FROM platform_admins WHERE is_active = true);
-- EXPECTED: 0 rows

-- 3.2.2: Application code no longer references users.role for auth decisions
-- (Manual grep verification - see checklist section)

-- 3.2.3: All requireAdmin middleware callers still work for platform admins
-- (Automated test - see test cases section)
```

### 3.3 Post-Phase-3 Integrity Checks

```sql
-- 3.3.1: No invited users with active org membership
SELECT u.id, u.email, om.status
FROM users u
JOIN organization_members om ON om.user_id = u.id
WHERE u.status = 'invited'
AND om.status = 'active';
-- EXPECTED: 0 rows

-- 3.3.2: All invited users have pending org membership
SELECT u.id, u.email, om.status
FROM users u
JOIN organization_members om ON om.user_id = u.id
WHERE u.status = 'invited'
AND om.status != 'pending';
-- EXPECTED: 0 rows
```

### 3.4 Post-Phase-4 Integrity Checks

```sql
-- 3.4.1: business_role migrated from users to organization_members
SELECT om.user_id, om.org_id, om.business_role, u.business_role as old_business_role
FROM organization_members om
JOIN users u ON u.id = om.user_id
WHERE om.status = 'active';
-- VERIFY: om.business_role matches u.business_role for single-org users

-- 3.4.2: Multi-org users have business_role set per org
-- (Need manual verification for multi-org users - should default to users.business_role)

-- 3.4.3: can_access_module() still returns correct results
-- Test with known user/module combinations pre and post migration
SELECT can_access_module(
    '71fb8dfe-7469-4540-9a58-b96caa638da4',  -- primary user
    'research_studio',
    '57234ef8-5a4d-40e7-aec3-ca02e44db9ce'   -- Synergi org
);
```

---

## 4. Destructive Test Cases

### 4.1 Column Drop Safety

| ID | Scenario | Test Steps | Expected Result |
|----|----------|-----------|-----------------|
| D1 | `users.role` column dropped while code still references it | 1. Comment out the column in a test DB. 2. Hit all auth endpoints. | Application must not crash. Should fall back to `'user'` default gracefully. Currently line 111 in `auth.js` middleware does: `req.userRole = profile?.role \|\| 'user'` -- this would survive if `role` is undefined. But the SQL `SELECT role` would fail if column is dropped. |
| D2 | `platform_admins` table is empty | 1. Delete all rows from `platform_admins`. 2. Try to access platform admin pages. | All admin routes return 403. No 500 errors. The `is_platform_admin()` RPC must return false, not throw. |
| D3 | `platform_admins` table does not exist | 1. Drop the table. 2. Hit auth endpoints. | The try/catch on line 802-812 of `auth.js` catches this. Login should still work. Platform admin features should fail gracefully with 403. |
| D4 | `organization_members` has no rows for user's default org | 1. Set user's `default_org_id` to an org where they have no membership. 2. Call `/me`. | `org_role` should be null. `is_admin` should be based only on `platform_admins`. Should not 500. |

### 4.2 Multi-Org Context Switching

| ID | Scenario | Test Steps | Expected Result |
|----|----------|-----------|-----------------|
| D5 | Switch default org (admin->member) | 1. User P8 logs in (default_org_id = Org-A where they are admin). 2. Switch default_org to Org-B (member). 3. Call `/me`. 4. Try admin operations. | `/me` returns `org_role: 'member'`. Admin operations on Org-B return 403. |
| D6 | Switch org via header vs default | 1. User P8 sends request with `x-org-id: Org-B` header but `default_org_id = Org-A`. 2. Call `requireModule()`. | Module access checked against Org-B (header), not Org-A (default). This is current behavior via `moduleAccess.js` line 24. |
| D7 | Org ID header for org user is not a member of | 1. Send `x-org-id: random-uuid` for any user. 2. Call module-protected route. | `can_access_module()` returns false. Route returns 403. No information leak. |

### 4.3 Invite Race Conditions

| ID | Scenario | Test Steps | Expected Result |
|----|----------|-----------|-----------------|
| D8 | Invite accepted while admin changes role | 1. Admin invites user as `member`. 2. Simultaneously: admin changes invite to `viewer` AND user accepts invite. | Final state must be consistent: either `member` (accepted before role change) or `viewer` (role change won before accept). No duplicate membership rows. |
| D9 | Double invite to same user | 1. Admin A invites user@test.com. 2. Before user accepts, Admin B invites same email. | Second invite should return "already invited" or update the pending membership role. Must not create duplicate org_member rows. Currently line 248-276 in `org-members.js` handles this with the existing member check. |
| D10 | Invite to existing active member | 1. User is already active member. 2. Admin invites same email. | Returns 400: "User is already a member" (line 256-260). Verify this still works after Phase 3. |
| D11 | Accept invite after org is deleted | 1. Invite user to org. 2. Delete org. 3. User accepts invite. | Accept should fail gracefully. Org membership insert should fail with FK constraint. |

### 4.4 Privilege Escalation Attempts

| ID | Scenario | Test Steps | Expected Result |
|----|----------|-----------|-----------------|
| D12 | Non-admin sets `users.role = 'admin'` via profile update | 1. User calls `PUT /api/auth/profile` with `{ role: 'admin' }`. | Profile update endpoint must NOT allow `role` field changes. Currently `auth.js` profile update only allows `display_name`, `avatar_url`, `preferences`. SAFE. |
| D13 | Org member updates own role via API | 1. Member calls `PUT /api/org-members/:orgId/:memberId` targeting their own record with `{ role: 'owner' }`. | Returns 403 because membership check requires `owner` or `admin` role. |
| D14 | Org admin promotes self to owner | 1. Org admin calls `PUT /api/org-members/:orgId/:selfMemberId` with `{ role: 'owner' }`. | Currently allowed (admin can set any valid role). Decision needed: should this be blocked? Owner transfer should be a separate explicit operation. |

---

## 5. Verification Checklists

### 5.1 Phase 1: Deprecate `users.role` Checklist

- [ ] **Pre-migration:** Run query 3.1.1 -- identify all `users.role='admin'` users not in `platform_admins`
- [ ] **Pre-migration:** Add those users to `platform_admins` table with appropriate role
- [ ] **Code change:** Replace `requireAdmin` in `server/middleware/auth.js` (line 189) to check `platform_admins` table OR `organization_members.role`
- [ ] **Code change:** Replace local `requireAdmin` in `server/routes/auth.js` (line 771) to stop reading `users.role`
- [ ] **Code change:** Update `authenticate()` in `server/middleware/auth.js` (line 107-111) to stop setting `req.userRole` from `users.role`
- [ ] **Code change:** Update `canEditAgent()` and `canDeleteAgent()` (lines 224-245) to use new role source
- [ ] **Code change:** Update `requireRole()` (line 251) to use new role source
- [ ] **Code change:** Remove `requireAdmin` import in `server/routes/model-availability.js` (line 18) and replace with `requirePlatformAdmin`
- [ ] **Grep verification:** `grep -r "users\.role\|req\.userRole\|userRole === 'admin'" server/` returns zero auth-decision hits
- [ ] **Test:** P1 persona can still access everything they could before (through `platform_admins` addition)
- [ ] **Test:** P2 persona gains access through `platform_admins` alone
- [ ] **Test:** P6 persona cannot access admin routes
- [ ] **Test:** Existing unit tests in `__tests__/unit/middleware/auth.test.js` updated and passing
- [ ] **Test:** Existing integration tests in `__tests__/integration/routes/auth.test.js` updated and passing
- [ ] **Test:** `model-availability` routes still work for platform admins
- [ ] **Regression:** All 14 personas tested against regression matrix (Section 2.6)

### 5.2 Phase 2: Fix `/me` Response Shape Checklist

- [ ] **Code change:** Update `/me` endpoint in `auth.js` to return `platform_role` instead of only `platform_admin_role`
- [ ] **Code change:** Remove `is_admin` computation OR keep as deprecated computed field
- [ ] **Code change:** Ensure `/me` cache (via `cacheService`) stores new field names
- [ ] **Code change:** Update login response (`POST /api/auth/login`) to match new shape
- [ ] **Frontend:** Update `public/admin.html` (line 2700) to check new fields
- [ ] **Frontend:** Update `public/agents.html` (line 2952) to check new fields
- [ ] **Frontend:** Update `public/js/navigation.js` (lines 326, 669) to use new fields
- [ ] **Frontend:** Update `public/js/direction-modal.js` (line 43) to check new fields
- [ ] **Frontend:** Verify `public/js/navigation.js` `getCurrentUserRole()` (line 471) returns correct value
- [ ] **Test:** `/me` response includes `is_platform_admin`, `platform_role`, `org_role`
- [ ] **Test:** `/me` response for P2 shows `is_platform_admin: true, platform_role: 'super_admin'`
- [ ] **Test:** `/me` response for P4 shows `is_platform_admin: false, org_role: 'owner'`
- [ ] **Test:** `/me` response for P11 (no org) shows `org_role: null`
- [ ] **Test:** Login response matches `/me` response shape
- [ ] **Test:** Frontend admin page access works for P2, P4, P5
- [ ] **Test:** Frontend admin page blocked for P6, P7
- [ ] **Test:** Update integration test `GET /api/auth/me` in `auth.test.js` (line 404: `expect(response.body.user.is_admin).toBe(true)`)
- [ ] **Regression:** Navigation sidebar renders correctly for all personas

### 5.3 Phase 3: Fix Invite Flow Checklist

- [ ] **Pre-migration:** Run query 3.1.2 -- count affected premature-active invited users
- [ ] **Data migration:** Update all `organization_members.status` from `active` to `pending` where `users.status = 'invited'`
- [ ] **Code change:** Update `POST /api/org-members/:orgId/invite` (line 280-291) to set `status: 'pending'` instead of `status: 'active'`
- [ ] **Code change:** Add `POST /api/auth/accept-invite` endpoint (or update existing) to flip `organization_members.status` from `pending` to `active`
- [ ] **Code change:** Update the reactivation logic (line 263-276) to set `pending` for invited users
- [ ] **Code change:** Add `accept-invite` to public paths in `authenticate()` (line 24 -- already listed)
- [ ] **Test:** New invite creates org membership with `status: 'pending'`
- [ ] **Test:** Pending member cannot access org resources (list members returns 403)
- [ ] **Test:** Accept-invite flips status to `active`
- [ ] **Test:** After acceptance, member can access org resources
- [ ] **Test:** Double-accept returns idempotent success (not error)
- [ ] **Test:** P9 (premature active) records are corrected by migration
- [ ] **Post-migration:** Run query 3.3.1 -- verify 0 rows
- [ ] **Regression:** Existing active members unaffected
- [ ] **Regression:** Org member list still shows correct counts

### 5.4 Phase 4: Move `business_role` to `organization_members` Checklist

- [ ] **Pre-migration:** Run query 3.1.3 -- baseline business_role distribution
- [ ] **Schema change:** Add `business_role` column to `organization_members` table
- [ ] **Data migration:** Copy `users.business_role` to all active `organization_members` rows for each user
- [ ] **Code change:** Update `can_access_module()` SQL function to read `business_role` from `organization_members` instead of `users`
- [ ] **Code change:** Update `server/services/conversationService.js` (lines 375-382, 579, 607, 657) to read `business_role` from `organization_members` with org context
- [ ] **Code change:** Update `server/routes/users.js` (lines 23, 42-43, 109, 269, 316-320) to handle `business_role` per-org
- [ ] **Code change:** Update `server/routes/execute120.js` (lines 226, 249-268, 310-328) to read `business_role` from `organization_members`
- [ ] **Code change:** Update `server/middleware/moduleAccess.js` error message (line 63: `min_business_role`)
- [ ] **Test:** `can_access_module()` returns same results before and after migration (query 3.4.3)
- [ ] **Test:** Multi-org user P8 can have different business_roles per org
- [ ] **Test:** Module access respects per-org business_role when `x-org-id` header is set
- [ ] **Test:** Execute120 pipeline uses correct business_role for the active org
- [ ] **Test:** User profile API can update business_role per-org
- [ ] **Post-migration:** Run query 3.4.1 -- verify migration completeness
- [ ] **Regression:** Conversation service filtering still works
- [ ] **Regression:** Execute120 role-level-based content filtering still works

---

## 6. Automated Test Cases to Add

Based on the analysis of existing test coverage, the following test cases must be added or updated.

### 6.1 New Test File: `__tests__/unit/middleware/auth-role-migration.test.js`

```
describe('Phase 1: requireAdmin migration')
  it('should allow platform admin with users.role=user')
  it('should allow org owner with users.role=user')
  it('should allow org admin with users.role=user')
  it('should reject org member')
  it('should reject org viewer')
  it('should reject deactivated platform admin')
  it('should reject user with no org membership')
  it('should check org from x-org-id header, not default_org_id')

describe('canEditAgent migration')
  it('should allow platform admin to edit system agents')
  it('should allow org admin to edit system agents')
  it('should NOT allow org member to edit system agents')
  it('should still allow any user to edit own non-system agents')
```

### 6.2 Updates to Existing Tests

**`__tests__/unit/middleware/auth.test.js`:**
- Update `requireAdmin` tests (lines 279-325) to test `platform_admins` lookup instead of `req.userRole`
- Add tests for the two `requireAdmin` implementations (middleware vs auth.js local)

**`__tests__/integration/routes/auth.test.js`:**
- Update `GET /api/auth/me` test (line 404) to verify new response shape
- Add test for `/me` with `platform_admins` user who has `users.role='user'`
- Add test for `/me` with multi-org user
- Update admin endpoint tests to use `platform_admins` instead of `users.role='admin'`

**`__tests__/integration/routes/org-members.test.js`:**
- Add test: invite creates membership with `status: 'pending'`
- Add test: accept-invite endpoint flips to `active`
- Add test: pending member cannot list org members

### 6.3 New Test File: `__tests__/integration/routes/invite-flow.test.js`

```
describe('Phase 3: Invite Flow')
  it('should create org membership with status=pending')
  it('should NOT set org membership to active on invite')
  it('should activate membership on accept-invite')
  it('should return 400 if invite already accepted')
  it('should return 404 if invite token is invalid')
  it('should handle race: accept + role change simultaneously')
  it('should handle re-invite of removed member as pending')
```

---

## 7. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| Legacy admins lose access after Phase 1 | **HIGH** | High (certain if not mitigated) | Pre-migration: add all `users.role='admin'` users to `platform_admins` |
| Frontend breaks on `/me` response shape change | **HIGH** | Medium | Phase 2 can keep `is_admin` as deprecated computed field during transition |
| Invite flow change breaks existing pending invites | **MEDIUM** | Low | Phase 3 migration script handles both new and existing records |
| `can_access_module()` returns wrong results after business_role move | **HIGH** | Medium | Run query 3.4.3 for all known user/module combos before and after |
| Multi-org business_role ambiguity | **MEDIUM** | Medium | Default to `users.business_role` for backfill; require explicit per-org setting going forward |

---

## 8. Test Execution Order

Phases must be tested and deployed in order. Each phase depends on the previous.

1. **Phase 1** -- Deploy, run checklist 5.1, run regression matrix
2. **Phase 2** -- Deploy, run checklist 5.2, verify frontend
3. **Phase 3** -- Deploy migration first, then code, run checklist 5.3
4. **Phase 4** -- Deploy migration first, then code, run checklist 5.4

Each phase must have a rollback plan. For database migrations (Phases 3, 4), the migration scripts must be reversible.
