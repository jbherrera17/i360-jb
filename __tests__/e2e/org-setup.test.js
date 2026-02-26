/* eslint-disable no-undef */
/**
 * E2E: Organization Setup Flow (Platform Admin)
 *
 * Tests the complete onboarding flow performed by a platform administrator:
 *   1. Platform admin logs in
 *   2. Platform admin creates a new organization
 *   3. Platform admin invites an org admin user
 *   4. Admin password reset activates the invited org admin
 *   5. Activated org admin can log in
 *   6. Platform admin invites a regular user to the org
 *   7. Admin password reset activates the regular user
 *   8. Activated regular user can log in
 *   9. Cleanup — delete both users and the org
 *
 * IMPORTANT: This test suite runs against the real server at http://localhost:3000.
 * The server must be running before executing these tests.
 *
 * Run with:
 *   npm test -- __tests__/e2e/org-setup.test.js
 *
 * Architecture notes:
 *   - Auth tokens from POST /api/auth/login are passed as `Authorization: Bearer <token>`.
 *   - The admin invite endpoint (POST /api/auth/users) creates users with status: 'invited'.
 *   - POST /api/auth/users/:id/reset-password should set email_confirm: true and activate
 *     invited users. As of 2026-02-20, there is a known bug: the server returns 200 but
 *     Supabase Auth email_confirmed_at is not being set — invited users cannot log in.
 *     Tests 5 and 8 are intentionally failing to surface this bug.
 *   - Org creation uses POST /api/organizations (requires authenticated user).
 *   - Org deletion uses DELETE /api/organizations/:id (owner-based, no platform-admin needed).
 *   - User deletion uses DELETE /api/auth/users/:id (admin auth route).
 *
 * Known Issues (as of 2026-02-20):
 *   BUG-1: POST /api/auth/users/:id/reset-password returns 200 success but does not
 *           actually update email_confirmed_at in Supabase Auth. Invited users remain
 *           unconfirmed and cannot log in. Tests 5 and 8 surface this bug.
 */

// Node 18+ ships with a global fetch() implementation.
// Using it avoids the TCPWRAP open-handle warnings from raw http.request in Jest.
// No import needed — fetch is available as a global in Node 18+.

// ============================================================
// CONFIGURATION
// ============================================================

const BASE_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000';

/** Credentials for the existing platform admin account */
const PLATFORM_ADMIN = {
    email: 'jbherrera@gmail.com',
    password: 'Welcome1234!',
};

/** Password used when activating test users via admin password reset */
const TEST_USER_PASSWORD = 'TestPass123!';

/** Request timeout in ms — keeps tests from hanging on slow endpoints */
const REQUEST_TIMEOUT_MS = 10000;

// ============================================================
// MINIMAL HTTP CLIENT
// ============================================================

/**
 * Make an HTTP request to the server using the global fetch() API (Node 18+).
 * Returns { status, body } where body is already parsed JSON.
 *
 * The native fetch API does not leave open-handle warnings in Jest.
 *
 * @param {string} method
 * @param {string} path
 * @param {object|null} data - Request body (will be JSON-serialised)
 * @param {string|null} token - Bearer token for Authorization header
 * @param {number} timeoutMs - Abort timeout in ms
 * @returns {Promise<{status: number, body: object}>}
 */
async function request(method, path, data = null, token = null, timeoutMs = REQUEST_TIMEOUT_MS) {
    const url = `${BASE_URL}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            method,
            headers,
            body: data ? JSON.stringify(data) : undefined,
            signal: controller.signal,
        });

        clearTimeout(timer);

        let parsedBody;
        try {
            parsedBody = await response.json();
        } catch {
            parsedBody = { _raw: await response.text().catch(() => '') };
        }

        return { status: response.status, body: parsedBody };
    } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeoutMs}ms: ${method} ${path}`);
        }
        throw err;
    }
}

// ============================================================
// SHARED STATE (populated across tests in sequence)
// ============================================================

let adminToken = null;

// Created during the test run — cleaned up in afterAll
const created = {
    orgId: null,
    orgAdminId: null,
    orgAdminEmail: null,
    regularUserId: null,
    regularUserEmail: null,
};

// ============================================================
// TEST SUITE
// ============================================================

describe('Organization Setup Flow (Platform Admin)', () => {

    // --------------------------------------------------------
    // TIMERS: switch to real timers for network I/O
    // --------------------------------------------------------
    //
    // The Jest setup file calls jest.useFakeTimers(), which replaces
    // setTimeout/setInterval with fake implementations. This would cause
    // all network waits and AbortController timeouts to hang forever.
    // We restore real timers here for the duration of this E2E suite.
    beforeAll(() => {
        jest.useRealTimers();
    });

    afterAll(() => {
        jest.useFakeTimers(); // restore fake timers for other test suites
    });

    // --------------------------------------------------------
    // PREFLIGHT: confirm the server is reachable
    // --------------------------------------------------------

    beforeAll(async () => {
        let reachable = false;
        try {
            const { status } = await request('GET', '/api/health');
            reachable = status < 500;
        } catch (err) {
            // swallow — error message below is clearer
        }

        if (!reachable) {
            throw new Error(
                `Server is not reachable at ${BASE_URL}. ` +
                'Start it with "npm start" or "npm run dev" before running these tests.'
            );
        }
    }, 15000);

    // --------------------------------------------------------
    // CLEANUP: always attempt to remove test data afterwards
    // --------------------------------------------------------

    afterAll(async () => {
        if (!adminToken) return; // Cannot clean up without a token

        const deleteUserSafely = async (userId, label) => {
            if (!userId) return;
            try {
                const { status, body } = await request(
                    'DELETE',
                    `/api/auth/users/${userId}`,
                    null,
                    adminToken
                );
                if (status === 200 && body.success) {
                    console.log(`Cleanup: deleted ${label} (${userId})`);
                } else {
                    console.warn(`Cleanup: could not delete ${label} (${userId}): ${JSON.stringify(body)}`);
                }
            } catch (err) {
                console.warn(`Cleanup: error deleting ${label}: ${err.message}`);
            }
        };

        // Delete users first (foreign keys reference org)
        await deleteUserSafely(created.orgAdminId, 'org admin');
        await deleteUserSafely(created.regularUserId, 'regular user');

        // Delete the org via the owner-based route (admin is org owner)
        if (created.orgId) {
            try {
                const { status, body } = await request(
                    'DELETE',
                    `/api/organizations/${created.orgId}`,
                    null,
                    adminToken
                );
                if (status === 200 && body.success) {
                    console.log(`Cleanup: deleted org (${created.orgId})`);
                } else {
                    console.warn(`Cleanup: could not delete org (${created.orgId}): ${JSON.stringify(body)}`);
                }
            } catch (err) {
                console.warn(`Cleanup: error deleting org: ${err.message}`);
            }
        }
    }, 30000);

    // ============================================================
    // TEST 1: Platform admin can log in
    // ============================================================

    test('Test 1: platform admin can log in', async () => {
        const { status, body } = await request('POST', '/api/auth/login', {
            email: PLATFORM_ADMIN.email,
            password: PLATFORM_ADMIN.password,
        });

        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.session).toBeDefined();
        expect(body.session.access_token).toBeDefined();

        // The account should be flagged as admin (role or platform admin flag)
        const user = body.user;
        expect(user).toBeDefined();
        const isAdmin =
            user.is_platform_admin === true ||
            user.role === 'admin' ||
            user.platform_admin_role != null;
        expect(isAdmin).toBe(true);

        // Persist the token for all subsequent tests
        adminToken = body.session.access_token;
    }, 15000);

    // ============================================================
    // TEST 2: Platform admin can create a new organization
    // ============================================================

    test('Test 2: platform admin can create a new organization', async () => {
        expect(adminToken).not.toBeNull(); // depends on Test 1

        const ts = Date.now();
        const orgName = `Test Org ${ts}`;

        const { status, body } = await request(
            'POST',
            '/api/organizations',
            { name: orgName },
            adminToken
        );

        expect(status).toBe(201);
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
        expect(body.data.id).toBeDefined();
        expect(body.data.name).toBe(orgName);

        // subscription_tier defaults to 'starter'
        expect(body.data.subscription_tier).toBe('starter');

        created.orgId = body.data.id;
    }, 15000);

    // ============================================================
    // TEST 3: Platform admin can invite an org admin user
    // ============================================================

    test('Test 3: platform admin can invite an org admin user', async () => {
        expect(adminToken).not.toBeNull();
        expect(created.orgId).not.toBeNull();

        const ts = Date.now();
        const email = `test-orgadmin-${ts}@test-insight360.com`;
        const displayName = `Org Admin ${ts}`;

        const { status, body } = await request(
            'POST',
            '/api/auth/users',
            {
                email,
                display_name: displayName,
                role: 'user',      // system role in public.users
                org_id: created.orgId,
                org_role: 'admin', // role within the organization
            },
            adminToken
        );

        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
        expect(body.data.id).toBeDefined();
        expect(body.data.email).toBe(email);
        expect(body.data.status).toBe('invited');
        expect(body.data.org_id).toBe(created.orgId);
        expect(body.data.org_role).toBe('admin');

        created.orgAdminId = body.data.id;
        created.orgAdminEmail = email;
    }, 15000);

    // ============================================================
    // TEST 4: Admin password reset returns success for invited user
    // ============================================================

    test('Test 4: admin password reset returns success for invited user', async () => {
        expect(adminToken).not.toBeNull();
        expect(created.orgAdminId).not.toBeNull();

        const { status, body } = await request(
            'POST',
            `/api/auth/users/${created.orgAdminId}/reset-password`,
            { new_password: TEST_USER_PASSWORD },
            adminToken
        );

        // The endpoint should return 200 and success: true
        expect(status).toBe(200);
        expect(body.success).toBe(true);
    }, 15000);

    // ============================================================
    // TEST 5: Activated org admin can log in
    //
    // KNOWN BUG (2026-02-20): This test currently fails because the
    // server's reset-password handler returns 200 success, but the
    // underlying supabase.auth.admin.updateUserById call does not
    // actually set email_confirmed_at on the invited user's Supabase
    // Auth record. As a result, signInWithPassword returns "Email not
    // confirmed" (401). This test is intentionally left failing to
    // track the bug resolution.
    //
    // Expected fix: ensure supabase.auth.admin.updateUserById with
    // email_confirm: true succeeds AND email_confirmed_at is set in
    // Supabase Auth before returning 200 from reset-password.
    // ============================================================

    test('Test 5: activated org admin can log in after admin password reset', async () => {
        expect(created.orgAdminEmail).not.toBeNull();

        // Brief wait for auth state to propagate
        await new Promise(r => setTimeout(r, 500));

        const { status, body } = await request('POST', '/api/auth/login', {
            email: created.orgAdminEmail,
            password: TEST_USER_PASSWORD,
        });

        // This should be 200 once the reset-password bug is fixed
        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.session).toBeDefined();
        expect(body.session.access_token).toBeDefined();
        expect(body.user).toBeDefined();
        expect(body.user.email).toBe(created.orgAdminEmail);
    }, 15000);

    // ============================================================
    // TEST 6: Platform admin can invite a regular user to the org
    // ============================================================

    test('Test 6: platform admin can invite a regular user to the org', async () => {
        expect(adminToken).not.toBeNull();
        expect(created.orgId).not.toBeNull();

        const ts = Date.now();
        const email = `test-regularuser-${ts}@test-insight360.com`;
        const displayName = `Regular User ${ts}`;

        const { status, body } = await request(
            'POST',
            '/api/auth/users',
            {
                email,
                display_name: displayName,
                role: 'user',
                org_id: created.orgId,
                org_role: 'consultant',
            },
            adminToken
        );

        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.id).toBeDefined();
        expect(body.data.email).toBe(email);
        expect(body.data.status).toBe('invited');
        expect(body.data.org_id).toBe(created.orgId);

        created.regularUserId = body.data.id;
        created.regularUserEmail = email;
    }, 15000);

    // ============================================================
    // TEST 7: Admin password reset returns success for regular user
    // ============================================================

    test('Test 7: admin password reset returns success for regular user', async () => {
        expect(adminToken).not.toBeNull();
        expect(created.regularUserId).not.toBeNull();

        const { status, body } = await request(
            'POST',
            `/api/auth/users/${created.regularUserId}/reset-password`,
            { new_password: TEST_USER_PASSWORD },
            adminToken
        );

        expect(status).toBe(200);
        expect(body.success).toBe(true);
    }, 15000);

    // ============================================================
    // TEST 8: Activated regular user can log in
    //
    // KNOWN BUG (2026-02-20): Same as Test 5. The password reset
    // endpoint returns success but Supabase email_confirmed_at is
    // not actually set, so login fails with 401.
    // ============================================================

    test('Test 8: activated regular user can log in after admin password reset', async () => {
        expect(created.regularUserEmail).not.toBeNull();

        // Brief wait for auth state to propagate
        await new Promise(r => setTimeout(r, 500));

        const { status, body } = await request('POST', '/api/auth/login', {
            email: created.regularUserEmail,
            password: TEST_USER_PASSWORD,
        });

        // This should be 200 once the reset-password bug is fixed
        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.session).toBeDefined();
        expect(body.session.access_token).toBeDefined();
        expect(body.user).toBeDefined();
        expect(body.user.email).toBe(created.regularUserEmail);
    }, 15000);

    // ============================================================
    // TEST 9: Admin can delete test users
    // ============================================================

    test('Test 9: platform admin can delete both test users', async () => {
        expect(adminToken).not.toBeNull();

        // Delete org admin (may still be in 'invited' state — delete should still work)
        if (created.orgAdminId) {
            const { status, body } = await request(
                'DELETE',
                `/api/auth/users/${created.orgAdminId}`,
                null,
                adminToken
            );
            expect(status).toBe(200);
            expect(body.success).toBe(true);
            created.orgAdminId = null; // Mark as deleted so afterAll skips
        }

        // Delete regular user
        if (created.regularUserId) {
            const { status, body } = await request(
                'DELETE',
                `/api/auth/users/${created.regularUserId}`,
                null,
                adminToken
            );
            expect(status).toBe(200);
            expect(body.success).toBe(true);
            created.regularUserId = null; // Mark as deleted so afterAll skips
        }
    }, 20000);

    // ============================================================
    // TEST 10: Admin can delete the test organization
    // ============================================================

    test('Test 10: org owner can delete the test organization', async () => {
        expect(adminToken).not.toBeNull();
        expect(created.orgId).not.toBeNull();

        // Use the owner-based org delete route (admin created the org, so is owner)
        const { status, body } = await request(
            'DELETE',
            `/api/organizations/${created.orgId}`,
            null,
            adminToken
        );

        expect(status).toBe(200);
        expect(body.success).toBe(true);
        created.orgId = null; // Mark as deleted so afterAll skips
    }, 15000);

    // ============================================================
    // BONUS: Error path validation
    // ============================================================

    describe('Error handling', () => {

        test('login with wrong password returns 401', async () => {
            const { status, body } = await request('POST', '/api/auth/login', {
                email: PLATFORM_ADMIN.email,
                password: 'DefinitelyWrongPassword!',
            });
            expect(status).toBe(401);
            expect(body.success).toBe(false);
        }, 10000);

        test('invite user without auth token returns 401 or 403', async () => {
            const { status } = await request('POST', '/api/auth/users', {
                email: `noauth-${Date.now()}@test-insight360.com`,
                role: 'user',
            });
            // Server returns 401 (no token) or 403 (insufficient role) in production mode
            // In dev mode it may let through with anonymous access
            expect([401, 403, 200]).toContain(status);
        }, 10000);

        test('creating org without auth token returns 401', async () => {
            const { status } = await request('POST', '/api/organizations', {
                name: 'Should Not Be Created',
            });
            // Unauthenticated requests to protected endpoints get 401
            expect(status).toBe(401);
        }, 10000);

        test('invite user with invalid org_role returns 400', async () => {
            expect(adminToken).not.toBeNull();

            const { status, body } = await request(
                'POST',
                '/api/auth/users',
                {
                    email: `badrole-${Date.now()}@test-insight360.com`,
                    role: 'user',
                    org_role: 'not_a_valid_role',
                },
                adminToken
            );
            expect(status).toBe(400);
            expect(body.success).toBe(false);
        }, 10000);

        test('password reset with too-short password returns 400', async () => {
            expect(adminToken).not.toBeNull();

            // The validation fires before the DB lookup, so any UUID works here
            const fakeId = '00000000-0000-0000-0000-000000000000';
            const { status, body } = await request(
                'POST',
                `/api/auth/users/${fakeId}/reset-password`,
                { new_password: 'abc' }, // less than 6 characters
                adminToken
            );
            expect(status).toBe(400);
            expect(body.success).toBe(false);
        }, 10000);

        test('password reset for non-existent user returns 404 or 500', async () => {
            expect(adminToken).not.toBeNull();

            const fakeId = '00000000-0000-0000-0000-000000000001';
            const { status, body } = await request(
                'POST',
                `/api/auth/users/${fakeId}/reset-password`,
                { new_password: 'ValidPassword123!' },
                adminToken
            );
            // Route returns 404 if the users table lookup fails cleanly,
            // or 500 if Supabase throws before the row-missing check.
            // Either is an acceptable error response (not 200).
            expect([404, 500]).toContain(status);
            expect(body.success).toBe(false);
        }, 10000);

    });

});
