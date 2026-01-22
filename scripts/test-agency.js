#!/usr/bin/env node
/**
 * Agency Functionality Test Script
 * Automated testing for Organizations, Members, and Clients APIs
 *
 * Usage:
 *   node scripts/test-agency.js
 *   node scripts/test-agency.js --email user@example.com --password pass123
 */

const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.argv.includes('--email')
  ? process.argv[process.argv.indexOf('--email') + 1]
  : 'agency-test@example.com';
const TEST_PASSWORD = process.argv.includes('--password')
  ? process.argv[process.argv.indexOf('--password') + 1]
  : 'testpass123';

// Test state
let authToken = null;
let testUserId = null;
let testOrgId = null;
let testClientId = null;
let testMemberId = null;

// Results tracking
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
  const icon = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`  ${icon} ${name}${details ? ` ${colors.dim}(${details})${colors.reset}` : ''}`, color);

  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

function logSkip(name, reason) {
  log(`  ○ ${name} ${colors.dim}(skipped: ${reason})${colors.reset}`, 'yellow');
  results.tests.push({ name, passed: null, details: reason });
  results.skipped++;
}

// HTTP request helper
function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Test Suites
async function testHealthCheck() {
  log('\n📋 Health Check', 'cyan');

  try {
    const res = await request('GET', '/api/health');
    logTest('Server is running', res.status === 200, `status: ${res.status}`);
    logTest('Supabase connected', res.body?.services?.supabase === true);
    return res.status === 200;
  } catch (e) {
    logTest('Server is running', false, e.message);
    return false;
  }
}

async function testAuthentication() {
  log('\n🔐 Authentication', 'cyan');

  // Try to register (may fail if user exists)
  const registerRes = await request('POST', '/api/auth/register', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    display_name: 'Agency Test User'
  });

  if (registerRes.status === 201 || registerRes.status === 200) {
    logTest('Register new user', true);
    testUserId = registerRes.body?.data?.user?.id;
  } else if (registerRes.body?.error?.includes('already registered')) {
    logTest('User already exists', true, 'proceeding to login');
  } else {
    logTest('Register new user', false, registerRes.body?.error);
  }

  // Login
  const loginRes = await request('POST', '/api/auth/login', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  logTest('Login', loginRes.status === 200, loginRes.body?.error || '');

  if (loginRes.status === 200) {
    testUserId = loginRes.body?.user?.id;
    // Extract access token from login response
    authToken = loginRes.body?.session?.access_token;
  }

  // Get current user
  const meRes = await request('GET', '/api/auth/me');
  logTest('Get current user', meRes.status === 200 && meRes.body?.data?.id);

  return loginRes.status === 200;
}

async function testOrganizations() {
  log('\n🏢 Organizations API', 'cyan');

  // List organizations
  const listRes = await request('GET', '/api/organizations');
  logTest('List organizations', listRes.status === 200, `found ${listRes.body?.data?.length || 0}`);

  // Create organization
  const orgName = `Test Agency ${Date.now()}`;
  const createRes = await request('POST', '/api/organizations', {
    name: orgName
  });

  logTest('Create organization', createRes.status === 201, createRes.body?.error || orgName);

  if (createRes.status === 201) {
    testOrgId = createRes.body?.data?.id;

    // Get organization details
    const getRes = await request('GET', `/api/organizations/${testOrgId}`);
    logTest('Get organization details', getRes.status === 200 && getRes.body?.data?.name === orgName);
    logTest('Creator is owner', getRes.body?.data?.member_role === 'owner');

    // Get organization stats
    const statsRes = await request('GET', `/api/organizations/${testOrgId}/stats`);
    logTest('Get organization stats', statsRes.status === 200 && statsRes.body?.data?.members >= 1);

    // Update organization
    const updateRes = await request('PUT', `/api/organizations/${testOrgId}`, {
      name: `${orgName} Updated`
    });
    logTest('Update organization', updateRes.status === 200);
  } else {
    logSkip('Get organization details', 'no org created');
    logSkip('Creator is owner', 'no org created');
    logSkip('Get organization stats', 'no org created');
    logSkip('Update organization', 'no org created');
  }

  // Test validation - missing name
  const badCreateRes = await request('POST', '/api/organizations', {});
  logTest('Validation: name required', badCreateRes.status === 400);

  return !!testOrgId;
}

async function testOrganizationMembers() {
  log('\n👥 Organization Members API', 'cyan');

  if (!testOrgId) {
    logSkip('All member tests', 'no organization available');
    return false;
  }

  // List members
  const listRes = await request('GET', `/api/org-members/${testOrgId}`);
  logTest('List members', listRes.status === 200, `found ${listRes.body?.data?.length || 0}`);

  // Find current user's membership
  if (listRes.body?.data?.length > 0) {
    testMemberId = listRes.body.data[0].id;
    logTest('Owner member exists', listRes.body.data[0].role === 'owner');
  }

  // Test invite validation - missing email
  const badInviteRes = await request('POST', `/api/org-members/${testOrgId}/invite`, {});
  logTest('Validation: email required', badInviteRes.status === 400);

  // Test invite validation - invalid role
  const badRoleRes = await request('POST', `/api/org-members/${testOrgId}/invite`, {
    email: 'test@test.com',
    role: 'superadmin'
  });
  logTest('Validation: invalid role rejected', badRoleRes.status === 400 || badRoleRes.status === 404);

  // Test invite - user not found
  const notFoundRes = await request('POST', `/api/org-members/${testOrgId}/invite`, {
    email: 'nonexistent-user-12345@example.com',
    role: 'consultant'
  });
  logTest('Invite: user not found handled', notFoundRes.status === 404);

  // Test owner cannot leave
  const leaveRes = await request('POST', `/api/org-members/${testOrgId}/leave`);
  logTest('Owner cannot leave', leaveRes.status === 400 && leaveRes.body?.error?.includes('Owner'));

  return true;
}

async function testClients() {
  log('\n🤝 Clients API', 'cyan');

  if (!testOrgId) {
    logSkip('All client tests', 'no organization available');
    return false;
  }

  // List clients
  const listRes = await request('GET', `/api/clients?org_id=${testOrgId}`);
  logTest('List clients', listRes.status === 200, `found ${listRes.body?.data?.length || 0}`);

  // Create client
  const clientName = `Test Client ${Date.now()}`;
  const createRes = await request('POST', '/api/clients', {
    org_id: testOrgId,
    name: clientName,
    contact_email: 'client@example.com',
    status: 'prospect'
  });

  logTest('Create client', createRes.status === 201, createRes.body?.error || clientName);

  if (createRes.status === 201) {
    testClientId = createRes.body?.data?.id;

    // Get client details
    const getRes = await request('GET', `/api/clients/${testClientId}`);
    logTest('Get client details', getRes.status === 200 && getRes.body?.data?.name === clientName);

    // Update client
    const updateRes = await request('PUT', `/api/clients/${testClientId}`, {
      status: 'active',
      contact_name: 'John Doe'
    });
    logTest('Update client', updateRes.status === 200);

    // Get client stats
    const statsRes = await request('GET', `/api/clients/${testClientId}/stats`);
    logTest('Get client stats', statsRes.status === 200);

    // Test search/filter
    const searchRes = await request('GET', `/api/clients?org_id=${testOrgId}&search=Test`);
    logTest('Search clients', searchRes.status === 200);

    const filterRes = await request('GET', `/api/clients?org_id=${testOrgId}&status=active`);
    logTest('Filter by status', filterRes.status === 200);
  } else {
    logSkip('Get client details', 'no client created');
    logSkip('Update client', 'no client created');
    logSkip('Get client stats', 'no client created');
    logSkip('Search clients', 'no client created');
    logSkip('Filter by status', 'no client created');
  }

  // Test validation - missing org_id
  const badListRes = await request('GET', '/api/clients');
  logTest('Validation: org_id required for list', badListRes.status === 400);

  // Test validation - missing name
  const badCreateRes = await request('POST', '/api/clients', {
    org_id: testOrgId
  });
  logTest('Validation: name required', badCreateRes.status === 400);

  return !!testClientId;
}

async function testAccessControl() {
  log('\n🔒 Access Control', 'cyan');

  // Test unauthenticated access
  const savedToken = authToken;
  authToken = null;

  const noAuthOrgRes = await request('GET', '/api/organizations');
  logTest('Organizations require auth', noAuthOrgRes.status === 401);

  const noAuthMembersRes = await request('GET', '/api/org-members/fake-org-id');
  logTest('Members require auth', noAuthMembersRes.status === 401);

  const noAuthClientsRes = await request('GET', '/api/clients?org_id=fake-org-id');
  logTest('Clients require auth', noAuthClientsRes.status === 401);

  authToken = savedToken;

  // Test accessing non-existent org
  const fakeOrgRes = await request('GET', '/api/organizations/00000000-0000-0000-0000-000000000000');
  logTest('Non-existent org returns 403/404', fakeOrgRes.status === 403 || fakeOrgRes.status === 404);

  return true;
}

async function cleanup() {
  log('\n🧹 Cleanup', 'cyan');

  // Archive test client
  if (testClientId) {
    const archiveRes = await request('DELETE', `/api/clients/${testClientId}`);
    logTest('Archive test client', archiveRes.status === 200);
  }

  // Delete test organization (if not personal workspace)
  if (testOrgId) {
    const deleteRes = await request('DELETE', `/api/organizations/${testOrgId}`);
    logTest('Delete test organization', deleteRes.status === 200 || deleteRes.status === 400);
  }

  // Logout
  const logoutRes = await request('POST', '/api/auth/logout');
  logTest('Logout', logoutRes.status === 200);
}

function printSummary() {
  log('\n' + '═'.repeat(50), 'blue');
  log('📊 Test Summary', 'blue');
  log('═'.repeat(50), 'blue');

  log(`\n  ${colors.green}Passed: ${results.passed}${colors.reset}`);
  log(`  ${colors.red}Failed: ${results.failed}${colors.reset}`);
  log(`  ${colors.yellow}Skipped: ${results.skipped}${colors.reset}`);
  log(`  Total: ${results.passed + results.failed + results.skipped}\n`);

  if (results.failed > 0) {
    log('Failed Tests:', 'red');
    results.tests
      .filter(t => t.passed === false)
      .forEach(t => log(`  • ${t.name}: ${t.details}`, 'red'));
    log('');
  }

  const passRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
  log(`Pass Rate: ${passRate}%\n`, passRate >= 80 ? 'green' : 'yellow');
}

// Main execution
async function main() {
  log('\n' + '═'.repeat(50), 'blue');
  log('🏢 Agency Functionality Test Suite', 'blue');
  log('═'.repeat(50), 'blue');
  log(`\nBase URL: ${BASE_URL}`);
  log(`Test User: ${TEST_EMAIL}`);

  try {
    // Run tests
    const serverOk = await testHealthCheck();
    if (!serverOk) {
      log('\n❌ Server not available. Aborting tests.\n', 'red');
      process.exit(1);
    }

    const authOk = await testAuthentication();
    if (!authOk) {
      log('\n⚠️  Authentication failed. Some tests will be skipped.\n', 'yellow');
    }

    await testOrganizations();
    await testOrganizationMembers();
    await testClients();
    await testAccessControl();
    await cleanup();

    printSummary();

    process.exit(results.failed > 0 ? 1 : 0);

  } catch (error) {
    log(`\n❌ Test suite error: ${error.message}\n`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
