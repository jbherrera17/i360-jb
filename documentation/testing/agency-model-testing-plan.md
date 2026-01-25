# Agency Model Enhancement Testing Plan

**Version:** 1.0
**Phases:** 40-43
**Date:** January 2026

---

## Overview

This testing plan covers the Agency Model Enhancement features:
- **Phase 40:** 1:1 Client-Profile Enforcement
- **Phase 41:** Agency Customization
- **Phase 42:** Client Portal
- **Phase 43:** Agency Analytics

---

## 1. Database Testing (SQL)

### Phase 40: Client-Profile Constraint

#### Automated Tests

```sql
-- Test 1.1: Unique constraint enforcement
-- Expected: Second insert should fail with unique constraint violation
INSERT INTO company_profiles (client_id, company_name, status, org_id)
VALUES ('test-client-uuid', 'Test Company', 'active', 'test-org-uuid');

INSERT INTO company_profiles (client_id, company_name, status, org_id)
VALUES ('test-client-uuid', 'Test Company 2', 'active', 'test-org-uuid');
-- Should fail with: duplicate key value violates unique constraint

-- Test 1.2: Archived profiles don't block new ones
UPDATE company_profiles SET status = 'archived', client_id = NULL
WHERE company_name = 'Test Company';

INSERT INTO company_profiles (client_id, company_name, status, org_id)
VALUES ('test-client-uuid', 'Test Company New', 'active', 'test-org-uuid');
-- Should succeed

-- Test 1.3: get_or_create_client_profile function
SELECT get_or_create_client_profile('existing-client-uuid');
-- Should return existing profile ID

SELECT get_or_create_client_profile('new-client-uuid', 'New Company');
-- Should create and return new profile ID

-- Test 1.4: evolve_client_profile function
SELECT evolve_client_profile('client-with-profile-uuid');
-- Should archive old profile and create new version with version + 1

-- Test 1.5: validate_client_profiles integrity check
SELECT * FROM validate_client_profiles();
-- Should return empty if all data is valid
```

#### Manual Tests

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Profile versioning | 1. Create client 2. Run session 3. Evolve profile | New profile version created, old archived |
| Migration script | Run `SELECT * FROM migrate_profiles_to_clients()` | Orphaned profiles linked to clients |

---

### Phase 41: Agency Customization

#### Automated Tests

```sql
-- Test 2.1: Default module configs auto-seeded
INSERT INTO organizations (id, name) VALUES ('new-org-uuid', 'New Org');
SELECT COUNT(*) FROM org_module_configs WHERE org_id = 'new-org-uuid';
-- Should return 6 (default modules)

-- Test 2.2: get_module_config helper
SELECT get_module_config('org-uuid', 'align_120');
-- Should return JSONB with module configuration

-- Test 2.3: Branding defaults
SELECT get_org_branding('org-uuid');
-- Should return JSONB with branding or defaults

-- Test 2.4: Prompt template CRUD
INSERT INTO org_prompt_templates (org_id, name, category, prompt_text)
VALUES ('org-uuid', 'Test Prompt', 'discovery', 'Hello {company_name}');
-- Should succeed

SELECT get_prompt_template('org-uuid', 'Test Prompt');
-- Should return the prompt text
```

---

### Phase 42: Client Portal

#### Automated Tests

```sql
-- Test 3.1: Magic link creation
SELECT create_client_magic_link('client-user-uuid');
-- Should return token string

-- Test 3.2: Magic link validation (valid token)
SELECT validate_client_magic_link('valid-token-here');
-- Should return client_user_id

-- Test 3.3: Magic link expiry (after 15 minutes)
UPDATE client_access_tokens
SET expires_at = NOW() - INTERVAL '1 minute'
WHERE token = 'test-token';

SELECT validate_client_magic_link('test-token');
-- Should return NULL (expired)

-- Test 3.4: Report sharing
INSERT INTO client_report_shares (client_id, session_id, shared_by)
VALUES ('client-uuid', 'session-uuid', 'user-uuid');
-- Should succeed

-- Test 3.5: Activity logging
SELECT * FROM client_activity_log WHERE client_user_id = 'user-uuid';
-- Should show login/view activities
```

---

### Phase 43: Agency Analytics

#### Automated Tests

```sql
-- Test 4.1: agency_client_metrics view
SELECT * FROM agency_client_metrics WHERE org_id = 'test-org-uuid';
-- Should return all clients with aggregated metrics

-- Test 4.2: Snapshot capture
SELECT capture_agency_metrics_snapshot('daily');
-- Should return count of orgs processed

SELECT * FROM agency_metrics_snapshots
WHERE snapshot_date = CURRENT_DATE;
-- Should have snapshot data

-- Test 4.3: Client score history
SELECT capture_client_score_history();
-- Should return count of clients processed

SELECT * FROM client_score_history
WHERE score_date = CURRENT_DATE;
-- Should have score data

-- Test 4.4: Agency overview aggregation
SELECT * FROM agency_overview WHERE org_id = 'test-org-uuid';
-- Should return aggregated org metrics

-- Test 4.5: Maturity distribution
SELECT * FROM agency_maturity_distribution WHERE org_id = 'test-org-uuid';
-- Should return counts per maturity level
```

---

## 2. API Testing

### Setup: Test Fixtures

```javascript
// test/fixtures/agency-fixtures.js
const testOrg = {
    id: 'test-org-uuid',
    name: 'Test Agency'
};

const testClient = {
    id: 'test-client-uuid',
    org_id: 'test-org-uuid',
    name: 'Test Client'
};

const testClientUser = {
    id: 'test-client-user-uuid',
    client_id: 'test-client-uuid',
    email: 'client@test.com'
};
```

### Phase 41: Organization Customization API

```javascript
// __tests__/integration/routes/orgCustomization.test.js

describe('Organization Customization API', () => {
    describe('GET /api/org-customization/:orgId/modules', () => {
        it('should return module configs for org member', async () => {
            const res = await request(app)
                .get(`/api/org-customization/${testOrg.id}/modules`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should reject non-members', async () => {
            const res = await request(app)
                .get(`/api/org-customization/${otherOrg.id}/modules`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('PUT /api/org-customization/:orgId/modules', () => {
        it('should update module configs for admin', async () => {
            const res = await request(app)
                .put(`/api/org-customization/${testOrg.id}/modules`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    modules: [{
                        module_key: 'align_120',
                        is_enabled: true,
                        custom_name: 'Strategic Alignment'
                    }]
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should reject non-admins', async () => {
            const res = await request(app)
                .put(`/api/org-customization/${testOrg.id}/modules`)
                .set('Authorization', `Bearer ${memberToken}`)
                .send({ modules: [] });

            expect(res.status).toBe(403);
        });
    });

    describe('PUT /api/org-customization/:orgId/branding', () => {
        it('should update branding', async () => {
            const res = await request(app)
                .put(`/api/org-customization/${testOrg.id}/branding`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    logo_url: 'https://example.com/logo.png',
                    primary_color: '#6366f1'
                });

            expect(res.status).toBe(200);
        });

        it('should validate color format', async () => {
            const res = await request(app)
                .put(`/api/org-customization/${testOrg.id}/branding`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    primary_color: 'not-a-color'
                });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/org-customization/:orgId/prompts', () => {
        it('should create prompt template', async () => {
            const res = await request(app)
                .post(`/api/org-customization/${testOrg.id}/prompts`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Discovery Prompt',
                    category: 'discovery',
                    prompt_text: 'Hello {company_name}'
                });

            expect(res.status).toBe(201);
            expect(res.body.data.name).toBe('Discovery Prompt');
        });
    });
});
```

### Phase 42: Client Portal API

```javascript
// __tests__/integration/routes/clientPortal.test.js

describe('Client Portal API', () => {
    describe('POST /api/client-portal/auth/request-access', () => {
        it('should send magic link for valid client user', async () => {
            const res = await request(app)
                .post('/api/client-portal/auth/request-access')
                .send({ email: 'client@test.com' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should reject unknown email', async () => {
            const res = await request(app)
                .post('/api/client-portal/auth/request-access')
                .send({ email: 'unknown@test.com' });

            expect(res.status).toBe(404);
        });

        it('should rate limit requests', async () => {
            // Make 5 requests in quick succession
            for (let i = 0; i < 5; i++) {
                await request(app)
                    .post('/api/client-portal/auth/request-access')
                    .send({ email: 'client@test.com' });
            }

            const res = await request(app)
                .post('/api/client-portal/auth/request-access')
                .send({ email: 'client@test.com' });

            expect(res.status).toBe(429);
        });
    });

    describe('POST /api/client-portal/auth/verify', () => {
        it('should verify valid token and return session', async () => {
            const res = await request(app)
                .post('/api/client-portal/auth/verify')
                .send({ token: validMagicToken });

            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
        });

        it('should reject expired token', async () => {
            const res = await request(app)
                .post('/api/client-portal/auth/verify')
                .send({ token: expiredMagicToken });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/client-portal/reports', () => {
        it('should return shared reports for authenticated client', async () => {
            const res = await request(app)
                .get('/api/client-portal/reports')
                .set('Authorization', `Bearer ${clientPortalToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should only return reports for this client', async () => {
            const res = await request(app)
                .get('/api/client-portal/reports')
                .set('Authorization', `Bearer ${clientPortalToken}`);

            res.body.data.forEach(report => {
                expect(report.client_id).toBe(testClient.id);
            });
        });
    });

    describe('Agency Endpoints', () => {
        describe('POST /api/client-portal/agency/invite', () => {
            it('should invite new client user', async () => {
                const res = await request(app)
                    .post('/api/client-portal/agency/invite')
                    .set('Authorization', `Bearer ${agencyToken}`)
                    .send({
                        client_id: testClient.id,
                        email: 'newuser@client.com',
                        name: 'New User'
                    });

                expect(res.status).toBe(201);
            });

            it('should reject duplicate email for same client', async () => {
                const res = await request(app)
                    .post('/api/client-portal/agency/invite')
                    .set('Authorization', `Bearer ${agencyToken}`)
                    .send({
                        client_id: testClient.id,
                        email: 'existing@client.com'
                    });

                expect(res.status).toBe(409);
            });
        });
    });
});
```

### Phase 43: Agency Analytics API

```javascript
// __tests__/integration/routes/agencyAnalytics.test.js

describe('Agency Analytics API', () => {
    describe('GET /api/analytics/:orgId/overview', () => {
        it('should return org overview metrics', async () => {
            const res = await request(app)
                .get(`/api/analytics/${testOrg.id}/overview`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('total_clients');
            expect(res.body.data).toHaveProperty('avg_maturity_score');
        });
    });

    describe('GET /api/analytics/:orgId/clients', () => {
        it('should return client metrics', async () => {
            const res = await request(app)
                .get(`/api/analytics/${testOrg.id}/clients`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should support status filter', async () => {
            const res = await request(app)
                .get(`/api/analytics/${testOrg.id}/clients?status=active`)
                .set('Authorization', `Bearer ${authToken}`);

            res.body.data.forEach(client => {
                expect(client.client_status).toBe('active');
            });
        });
    });

    describe('GET /api/analytics/:orgId/trends', () => {
        it('should return trend data', async () => {
            const res = await request(app)
                .get(`/api/analytics/${testOrg.id}/trends`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should support date range filter', async () => {
            const res = await request(app)
                .get(`/api/analytics/${testOrg.id}/trends?days=30`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
        });
    });

    describe('GET /api/analytics/:orgId/export', () => {
        it('should export CSV data', async () => {
            const res = await request(app)
                .get(`/api/analytics/${testOrg.id}/export?format=csv`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('text/csv');
        });

        it('should export JSON data', async () => {
            const res = await request(app)
                .get(`/api/analytics/${testOrg.id}/export?format=json`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('application/json');
        });
    });
});
```

---

## 3. Frontend Testing

### Manual Test Cases

#### Agency Dashboard (`/agency-dashboard.html`)

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| AD-01 | Page load | Navigate to /agency-dashboard.html | Dashboard loads with org switcher, stats, client grid |
| AD-02 | Org switching | Select different org from dropdown | Data refreshes for selected org |
| AD-03 | Stats display | View stat cards | Shows correct counts for clients, sessions, scores |
| AD-04 | Client health grid | View client cards | Each card shows name, scores, status |
| AD-05 | Maturity chart | View donut chart | Chart shows distribution by maturity level |
| AD-06 | Needs attention | Check needs attention section | Shows clients with low engagement or declining scores |
| AD-07 | Refresh button | Click refresh button | Data reloads from API |
| AD-08 | Help button | Click help button | Help modal opens with user guide |
| AD-09 | No clients state | Load org with no clients | Shows empty state with guidance |
| AD-10 | Loading state | Trigger data load | Shows loading spinner |

#### Organization Customization (`/admin-org-customization.html`)

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| OC-01 | Tab switching | Click each tab | Content changes, active tab highlighted |
| OC-02 | Module toggle | Toggle a module on/off | Toggle state changes, unsaved flag set |
| OC-03 | Module configure | Click Configure on a module | Modal opens with fields |
| OC-04 | Branding colors | Change primary color | Preview updates in real-time |
| OC-05 | Logo preview | Enter logo URL | Logo displays in preview |
| OC-06 | Create prompt | Add new prompt template | Template appears in list |
| OC-07 | Edit prompt | Edit existing template | Modal opens with values, saves correctly |
| OC-08 | Delete prompt | Delete a template | Confirmation dialog, template removed |
| OC-09 | Report template JSON | Enter invalid JSON | Shows validation error |
| OC-10 | Save changes | Click Save Changes | All pending changes saved |
| OC-11 | Unsaved warning | Make changes, switch org | Warning dialog appears |
| OC-12 | Help button | Click help button | Help modal opens |

#### Client Portal Users (`/admin-client-users.html`)

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| CU-01 | Users list | Load page | Users displayed in table |
| CU-02 | Search users | Enter search text | List filters by name/email |
| CU-03 | Status filter | Select status filter | Shows only matching users |
| CU-04 | Client filter | Select client filter | Shows only that client's users |
| CU-05 | Invite user | Click Invite, fill form | Invitation sent, user appears |
| CU-06 | Resend invite | Click resend on invited user | Success message, new link sent |
| CU-07 | Remove user | Click remove, confirm | User status changes to Removed |
| CU-08 | Restore user | Click restore on removed user | User status changes to Active |
| CU-09 | Stats update | Add/remove users | Stats cards update correctly |
| CU-10 | Empty state | Org with no portal users | Shows empty state with invite CTA |

#### Client Portal (`/client-portal.html`)

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| CP-01 | Login form | Load page (not logged in) | Shows email input form |
| CP-02 | Request access | Enter email, submit | Shows "check email" message |
| CP-03 | Invalid email | Enter unknown email | Shows error message |
| CP-04 | Magic link | Click link from email | Verifies token, shows dashboard |
| CP-05 | Expired link | Click expired link | Shows error, prompts to request new |
| CP-06 | Dashboard load | After successful auth | Shows welcome, stats, reports |
| CP-07 | Reports list | View Your Reports section | Shows shared reports with cards |
| CP-08 | View report | Click View Report | Opens report viewer |
| CP-09 | Download report | Click download | PDF downloads |
| CP-10 | Logout | Click logout | Returns to login form |
| CP-11 | Session persist | Close and reopen tab | Still logged in |

#### Client Report Viewer (`/client-report-viewer.html`)

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| RV-01 | Report load | Open with valid report ID | Report content displays |
| RV-02 | Score display | View score cards | Shows maturity/readiness scores with rings |
| RV-03 | Section toggle | Click section header | Section collapses/expands |
| RV-04 | Back button | Click Back | Returns to client portal |
| RV-05 | Print | Click Print | Opens print dialog |
| RV-06 | Download | Click Download PDF | PDF downloads |
| RV-07 | Invalid report | Open with invalid ID | Shows error message |
| RV-08 | Unauthorized | Open report not shared with user | Shows access denied |

---

## 4. Security Testing

### Authentication & Authorization

| Test | Description | Expected |
|------|-------------|----------|
| SEC-01 | Access without auth token | API returns 401 |
| SEC-02 | Expired JWT token | API returns 401 |
| SEC-03 | Wrong org access | Non-member can't access org resources |
| SEC-04 | Role escalation | Member can't perform admin actions |
| SEC-05 | Client data isolation | Client A can't see Client B's data |
| SEC-06 | Magic link reuse | Token invalid after first use |
| SEC-07 | Magic link expiry | Token rejected after 15 minutes |
| SEC-08 | XSS in inputs | Script tags sanitized in all fields |
| SEC-09 | SQL injection | Parameterized queries prevent injection |
| SEC-10 | CORS enforcement | Cross-origin requests blocked |

### RLS Policy Testing

```sql
-- Test cross-org data isolation
SET LOCAL app.current_user_id = 'user-in-org-a';
SELECT * FROM org_module_configs WHERE org_id = 'org-b-uuid';
-- Should return 0 rows

-- Test client portal isolation
SET LOCAL app.current_client_user_id = 'client-user-a';
SELECT * FROM client_report_shares WHERE client_id = 'client-b-uuid';
-- Should return 0 rows
```

---

## 5. Performance Testing

### Load Tests

| Endpoint | Target | Threshold |
|----------|--------|-----------|
| GET /api/analytics/:orgId/overview | 100 req/s | < 200ms p95 |
| GET /api/analytics/:orgId/clients | 50 req/s | < 500ms p95 |
| GET /api/client-portal/reports | 100 req/s | < 300ms p95 |
| POST /api/client-portal/auth/verify | 50 req/s | < 100ms p95 |

### Database Query Performance

```sql
-- Monitor slow queries during testing
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- After test run, check for slow queries
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
WHERE query LIKE '%agency%' OR query LIKE '%client_portal%'
ORDER BY mean_time DESC
LIMIT 20;
```

---

## 6. Test Data Setup

### Seed Script

```sql
-- Insert test organization
INSERT INTO organizations (id, name, is_active)
VALUES ('test-org-uuid', 'Test Agency', true);

-- Insert test clients
INSERT INTO clients (id, org_id, name, status)
VALUES
    ('client-a-uuid', 'test-org-uuid', 'Client A', 'active'),
    ('client-b-uuid', 'test-org-uuid', 'Client B', 'active'),
    ('client-c-uuid', 'test-org-uuid', 'Client C', 'prospect');

-- Insert test company profiles
INSERT INTO company_profiles (id, client_id, org_id, company_name, status)
VALUES
    ('profile-a-uuid', 'client-a-uuid', 'test-org-uuid', 'Client A Inc', 'active'),
    ('profile-b-uuid', 'client-b-uuid', 'test-org-uuid', 'Client B Corp', 'active');

-- Insert test sessions with scores
INSERT INTO align120_sessions (id, client_id, org_id, company_profile_id, status)
VALUES
    ('session-a-uuid', 'client-a-uuid', 'test-org-uuid', 'profile-a-uuid', 'completed');

-- Insert test maturity assessment
INSERT INTO ai_maturity_assessments (company_profile_id, overall_score, maturity_level)
VALUES ('profile-a-uuid', 65, 'Developing');

-- Insert client portal user
INSERT INTO client_users (id, client_id, email, name, status)
VALUES ('client-user-uuid', 'client-a-uuid', 'contact@clienta.com', 'Client Contact', 'active');

-- Share a report
INSERT INTO client_report_shares (client_id, session_id, shared_by)
VALUES ('client-a-uuid', 'session-a-uuid', 'agency-user-uuid');
```

---

## 7. Test Execution Checklist

### Pre-Testing
- [ ] Database migrations applied (phase40-43 SQL files)
- [ ] Test data seeded
- [ ] Server running with test environment
- [ ] Test user accounts created

### Automated Tests
- [ ] Run: `npm test -- --grep "Organization Customization"`
- [ ] Run: `npm test -- --grep "Client Portal"`
- [ ] Run: `npm test -- --grep "Agency Analytics"`
- [ ] All tests passing

### Manual Tests
- [ ] Agency Dashboard (AD-01 through AD-10)
- [ ] Organization Customization (OC-01 through OC-12)
- [ ] Client Portal Users (CU-01 through CU-10)
- [ ] Client Portal (CP-01 through CP-11)
- [ ] Report Viewer (RV-01 through RV-08)

### Security Tests
- [ ] Authentication tests (SEC-01 through SEC-05)
- [ ] Magic link tests (SEC-06, SEC-07)
- [ ] Input validation (SEC-08, SEC-09)
- [ ] RLS policy tests

### Post-Testing
- [ ] Document any bugs found
- [ ] Clean up test data
- [ ] Performance baselines recorded

---

## 8. Bug Report Template

```markdown
## Bug Report

**ID:** BUG-XXX
**Severity:** Critical / High / Medium / Low
**Component:** Agency Dashboard / Customization / Client Portal / Analytics

### Description
Brief description of the issue.

### Steps to Reproduce
1. Step one
2. Step two
3. Step three

### Expected Behavior
What should happen.

### Actual Behavior
What actually happens.

### Environment
- Browser: Chrome 120
- Server: Node 18.x
- Database: Supabase PostgreSQL 15

### Screenshots/Logs
Attach relevant screenshots or console logs.
```
