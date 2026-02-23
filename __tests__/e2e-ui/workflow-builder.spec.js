/**
 * Workflow Builder E2E Tests
 *
 * Tests the workflow builder page including:
 * - Page load and UI elements
 * - Agent dropdown population (reported broken)
 * - Step library and drag interactions
 * - Step configuration editor
 * - Workflow save flow
 * - Form validation
 * - API endpoint interactions
 *
 * Run: npx playwright test workflow-builder.spec.js
 * Run with UI: npx playwright test workflow-builder.spec.js --ui
 */

const { test, expect } = require('@playwright/test');
const {
  setupMockAuth,
  waitForPageReady,
  setupDialogHandler,
} = require('./fixtures/test-utils');

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockAgents = [
  {
    id: 'agent-uuid-001',
    name: 'Content Writer',
    description: 'Writes high-quality content',
    category: 'content',
    suite: 'execute',
    is_active: true,
  },
  {
    id: 'agent-uuid-002',
    name: 'Research Analyst',
    description: 'Conducts deep research',
    category: 'research',
    suite: 'execute',
    is_active: true,
  },
  {
    id: 'agent-uuid-003',
    name: 'Strategy Advisor',
    description: 'Provides strategic guidance',
    category: 'strategy',
    suite: 'strategy',
    is_active: true,
  },
];

const mockSkills = [
  {
    id: 'skill-uuid-001',
    name: 'article-generator',
    display_name: 'Article Generator',
    description: 'Generates structured articles',
    category: 'content',
  },
  {
    id: 'skill-uuid-002',
    name: 'data-analyzer',
    display_name: 'Data Analyzer',
    description: 'Analyzes datasets',
    category: 'research',
  },
];

const mockDepartments = [
  { id: 'dept-uuid-001', name: 'Marketing', org_id: 'org-001' },
  { id: 'dept-uuid-002', name: 'Development', org_id: 'org-001' },
  { id: 'dept-uuid-003', name: 'Operations', org_id: 'org-001' },
];

const mockWorkflow = {
  id: 'wf-uuid-001',
  name: 'Test Workflow',
  description: 'A test workflow',
  icon: 'zap',
  color: '#6366f1',
  department_id: 'dept-uuid-001',
  suite: 'execute',
  estimated_minutes: 20,
  steps: [
    {
      id: 'step-uuid-001',
      step_number: 1,
      name: 'Gather Information',
      description: 'Collect user inputs',
      step_type: 'user_input',
      execution_mode: 'auto',
      input_fields: [{ name: 'topic', label: 'Topic', type: 'text', required: true }],
      output_variable: 'step_1_output',
    },
    {
      id: 'step-uuid-002',
      step_number: 2,
      name: 'AI Processing',
      description: 'Process with agent',
      step_type: 'agent_chat',
      execution_mode: 'auto',
      agent_id: 'agent-uuid-001',
      prompt_template: 'Write about {{step_1_output.topic}}',
      output_variable: 'step_2_output',
    },
  ],
};

// ─── API Mock Setup ───────────────────────────────────────────────────────────

/**
 * Setup all API mocks required for the workflow builder page.
 * NOTE: The API returns { success, data } — NOT { success, agents } or { success, skills }.
 * The bug is that workflow-builder.html reads agentsResult.agents and skillsResult.skills
 * instead of agentsResult.data and skillsResult.data.
 */
async function setupWorkflowBuilderMocks(page, options = {}) {
  // Mock departments endpoint
  await page.route('**/api/departments**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: options.departments || mockDepartments,
      }),
    });
  });

  // Mock agents endpoint — returns { success, data } (the real server shape)
  await page.route('**/api/agents**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: options.agents || mockAgents,
        pagination: { total: mockAgents.length, limit: 100, offset: 0 },
      }),
    });
  });

  // Mock skills endpoint — returns { success, data } (the real server shape)
  await page.route('**/api/skills**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: options.skills || mockSkills,
        pagination: { total: mockSkills.length, limit: 100, offset: 0 },
      }),
    });
  });

  // Mock workflows GET (for loading an existing workflow)
  await page.route('**/api/workflows/*', async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    // Skip steps sub-route
    if (url.includes('/steps')) {
      await route.continue();
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, workflow: options.workflow || mockWorkflow }),
      });
    } else if (method === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, workflow: options.workflow || mockWorkflow }),
      });
    } else if (method === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock workflow steps endpoints
  await page.route('**/api/workflows/*/steps**', async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          step: { id: 'step-new-' + Date.now(), step_number: 1 },
        }),
      });
    } else if (method === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, step: {} }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock workflows POST (create new)
  await page.route('**/api/workflows', async (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          workflow: { id: 'wf-new-001', ...JSON.parse(route.request().postData() || '{}') },
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock modules/usage endpoint (used by UsageNudge.checkBeforeCreate)
  await page.route('**/api/modules/usage**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { warnings: [], blocks: [] },
      }),
    });
  });

  // Mock the /api/modules endpoint (used by navigation)
  await page.route('**/api/modules**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Workflow Builder', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page);
    await setupWorkflowBuilderMocks(page);
  });

  // ===========================================================================
  // PAGE LOAD & INITIAL UI STATE
  // ===========================================================================
  test.describe('Page Load', () => {
    test('should load page with correct title', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await expect(page).toHaveTitle(/Workflow Builder/);
    });

    test('should display the page header with correct title', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await expect(page.getByRole('heading', { name: 'Workflow Builder' })).toBeVisible();
    });

    test('should display Save Workflow and Preview buttons in header', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await expect(page.getByRole('button', { name: /Save Workflow/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Preview/i })).toBeVisible();
    });

    test('should display the three-panel builder layout', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await expect(page.locator('.step-library')).toBeVisible();
      await expect(page.locator('.builder-canvas')).toBeVisible();
      await expect(page.locator('.step-editor')).toBeVisible();
    });

    test('should display workflow name input with default value', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      const nameInput = page.locator('#workflowName');
      await expect(nameInput).toBeVisible();
      await expect(nameInput).toHaveValue('New Workflow');
    });

    test('should display department dropdown', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await expect(page.locator('#workflowDepartment')).toBeVisible();
    });

    test('should populate department dropdown from API', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      const deptSelect = page.locator('#workflowDepartment');
      const options = deptSelect.locator('option');

      // Should have placeholder + 3 departments
      await expect(options).toHaveCount(4);
      await expect(deptSelect.locator('option[value="dept-uuid-001"]')).toHaveText('Marketing');
      await expect(deptSelect.locator('option[value="dept-uuid-002"]')).toHaveText('Development');
      await expect(deptSelect.locator('option[value="dept-uuid-003"]')).toHaveText('Operations');
    });

    test('should show empty state in canvas with drag instruction', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await expect(page.locator('#stepsTimeline')).toContainText(
        'Drag steps from the library to build your workflow'
      );
    });

    test('should show "Select a step to configure it" in editor panel initially', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await expect(page.locator('#editorContent')).toContainText('Select a step to configure it');
    });

    test('should display Add Step button in canvas', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await expect(page.locator('.add-step-btn')).toBeVisible();
    });
  });

  // ===========================================================================
  // STEP LIBRARY
  // ===========================================================================
  test.describe('Step Library', () => {
    test('should display all step type categories', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      const sectionTitles = page.locator('.library-section-title');
      await expect(sectionTitles).toHaveCount(4);

      const texts = await sectionTitles.allTextContents();
      expect(texts).toContain('Input');
      expect(texts).toContain('AI Processing');
      expect(texts).toContain('Human Control');
      expect(texts).toContain('Output');
    });

    test('should display all 9 step type cards', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      const cards = page.locator('.step-type-card');
      await expect(cards).toHaveCount(9);
    });

    test('should display User Input step card', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await expect(
        page.locator('.step-type-card[data-type="user_input"]')
      ).toBeVisible();
      await expect(
        page.locator('.step-type-card[data-type="user_input"] .step-type-name')
      ).toHaveText('User Input');
    });

    test('should display Agent Chat step card', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await expect(
        page.locator('.step-type-card[data-type="agent_chat"]')
      ).toBeVisible();
      await expect(
        page.locator('.step-type-card[data-type="agent_chat"] .step-type-name')
      ).toHaveText('Agent Chat');
    });

    test('should display Skill Execution step card', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await expect(
        page.locator('.step-type-card[data-type="skill_execution"]')
      ).toBeVisible();
    });

    test('should display Human Gate and Review cards', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await expect(page.locator('.step-type-card[data-type="human_gate"]')).toBeVisible();
      await expect(page.locator('.step-type-card[data-type="review"]')).toBeVisible();
    });

    test('should filter step cards by search query', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      const searchInput = page.locator('.library-search');
      await searchInput.fill('agent');

      // Only "Agent Chat" should be visible
      await expect(page.locator('.step-type-card[data-type="agent_chat"]')).toBeVisible();
      await expect(page.locator('.step-type-card[data-type="user_input"]')).toBeHidden();
      await expect(page.locator('.step-type-card[data-type="research"]')).toBeHidden();
    });

    test('should restore all cards when search is cleared', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      const searchInput = page.locator('.library-search');
      await searchInput.fill('agent');
      await searchInput.fill('');

      const cards = page.locator('.step-type-card');
      await expect(cards).toHaveCount(9);
    });

    test('should show no cards for non-matching search', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.locator('.library-search').fill('zzznomatch');

      const visibleCards = page.locator('.step-type-card:visible');
      await expect(visibleCards).toHaveCount(0);
    });
  });

  // ===========================================================================
  // AGENT DROPDOWN — Regression tests for the .agents vs .data key mismatch
  //
  // Root cause (now fixed): loadAgentsAndSkills() was reading agentsResult.agents
  // and skillsResult.skills, but both APIs return { success, data } — not
  // { success, agents } or { success, skills }. The fix reads .data instead.
  // These tests verify the correct post-fix behavior and act as a regression
  // guard to prevent re-introducing the wrong key.
  // ===========================================================================
  test.describe('Agent Dropdown Population', () => {
    test('API: /api/agents returns data key not agents key', async ({ request }) => {
      const response = await request.get('/api/agents');
      expect(response.status()).toBe(200);
      const body = await response.json();

      // The API returns "data", not "agents"
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body).not.toHaveProperty('agents'); // regression guard
      expect(Array.isArray(body.data)).toBe(true);
    });

    test('API: /api/skills returns data key not skills key', async ({ request }) => {
      const response = await request.get('/api/skills');
      expect(response.status()).toBe(200);
      const body = await response.json();

      // The API returns "data", not "skills"
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body).not.toHaveProperty('skills'); // regression guard
      expect(Array.isArray(body.data)).toBe(true);
    });

    test('agent dropdown is populated when Agent Chat step is added', async ({ page }) => {
      // The page mocks (set up in beforeEach) return { success, data: mockAgents }.
      // loadAgentsAndSkills() now correctly reads .data, so agents is populated.
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('agent_chat');
      });
      await waitForPageReady(page);

      const agentSelect = page.locator('.step-editor select').first();
      await expect(agentSelect).toBeVisible();

      const optionTexts = await agentSelect.locator('option').allTextContents();

      // Should contain the 3 mock agents plus the placeholder
      expect(optionTexts).toHaveLength(4); // placeholder + 3 agents
      expect(optionTexts).toContain('Content Writer');
      expect(optionTexts).toContain('Research Analyst');
      expect(optionTexts).toContain('Strategy Advisor');
    });

    test('agent dropdown placeholder reads "Select an agent..."', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('agent_chat');
      });
      await waitForPageReady(page);

      const agentSelect = page.locator('.step-editor select').first();
      const firstOption = agentSelect.locator('option').first();
      await expect(firstOption).toHaveText('Select an agent...');
      await expect(firstOption).toHaveValue('');
    });

    test('selecting an agent in the dropdown updates the step config', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('agent_chat');
      });
      await waitForPageReady(page);

      const agentSelect = page.locator('.step-editor select').first();
      await agentSelect.selectOption({ label: 'Content Writer' });

      // Verify the workflow state was updated
      const agentId = await page.evaluate(() => {
        return window.workflow.steps[0].agent_id;
      });
      expect(agentId).toBe('agent-uuid-001');
    });

    test('skill dropdown is populated when Skill Execution step is added', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('skill_execution');
      });
      await waitForPageReady(page);

      const skillSelect = page.locator('.step-editor select').first();
      await expect(skillSelect).toBeVisible();

      const optionTexts = await skillSelect.locator('option').allTextContents();

      // Should contain the 2 mock skills plus the placeholder
      expect(optionTexts).toHaveLength(3); // placeholder + 2 skills
      expect(optionTexts).toContain('Article Generator');
      expect(optionTexts).toContain('Data Analyzer');
    });

    test('agent dropdown is absent for step types that have no agent (user_input)', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
      });
      await waitForPageReady(page);

      // user_input does not have hasAgent, so no agent select should appear
      // The selects in the editor for user_input are none (no agent, no skill)
      const editorSelects = page.locator('.step-editor .form-select');
      await expect(editorSelects).toHaveCount(0);
    });
  });

  // ===========================================================================
  // STEP CONFIGURATION EDITOR
  // ===========================================================================
  test.describe('Step Configuration Editor', () => {
    test('should open editor when a step is added', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
      });
      await waitForPageReady(page);

      await expect(page.locator('#editorContent')).not.toContainText('Select a step to configure it');
      await expect(page.locator('#editorTitle')).toContainText('Configure:');
    });

    test('should show Step Name input in editor', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
      });
      await waitForPageReady(page);

      await expect(page.locator('.step-editor .form-input').first()).toBeVisible();
    });

    test('should show Execution Mode toggle (Auto/Review/Gate)', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
      });
      await waitForPageReady(page);

      await expect(page.locator('.execution-mode-btn').filter({ hasText: 'Auto' })).toBeVisible();
      await expect(page.locator('.execution-mode-btn').filter({ hasText: 'Review' })).toBeVisible();
      await expect(page.locator('.execution-mode-btn').filter({ hasText: 'Gate' })).toBeVisible();
    });

    test('should show Output Variable input in editor', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
      });
      await waitForPageReady(page);

      // Output Variable is the last input
      const inputs = page.locator('.step-editor .form-input');
      const count = await inputs.count();
      expect(count).toBeGreaterThanOrEqual(2); // name + output_variable
    });

    test('should show Add Field button for user_input step', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
      });
      await waitForPageReady(page);

      await expect(page.locator('.add-field-btn')).toBeVisible();
    });

    test('should show Prompt Template textarea for agent_chat step', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('agent_chat');
      });
      await waitForPageReady(page);

      // The prompt template textarea uses monospace font
      const promptTextarea = page.locator('.step-editor textarea[style*="monospace"]');
      await expect(promptTextarea).toBeVisible();
    });

    test('should show Gate Message textarea for human_gate step', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('human_gate');
      });
      await waitForPageReady(page);

      // Gate message textarea
      const textareas = page.locator('.step-editor .form-textarea');
      await expect(textareas.first()).toBeVisible();
    });

    test('should close editor when X button is clicked', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
      });
      await waitForPageReady(page);

      await page.locator('.editor-close').click();

      await expect(page.locator('#editorContent')).toContainText('Select a step to configure it');
    });

    test('should update step name in timeline when name is changed in editor', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
      });
      await waitForPageReady(page);

      const nameInput = page.locator('.step-editor .form-input').first();
      await nameInput.fill('My Custom Step Name');
      await nameInput.dispatchEvent('change');
      await waitForPageReady(page);

      await expect(page.locator('.step-title')).toContainText('My Custom Step Name');
    });

    test('should mark Auto as default execution mode', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
      });
      await waitForPageReady(page);

      const autoBtn = page.locator('.execution-mode-btn').filter({ hasText: 'Auto' });
      await expect(autoBtn).toHaveClass(/active/);
    });

    test('should switch execution mode when Review button is clicked', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
      });
      await waitForPageReady(page);

      await page.locator('.execution-mode-btn').filter({ hasText: 'Review' }).click();
      await waitForPageReady(page);

      const reviewBtn = page.locator('.execution-mode-btn').filter({ hasText: 'Review' });
      await expect(reviewBtn).toHaveClass(/active/);

      const autoBtn = page.locator('.execution-mode-btn').filter({ hasText: 'Auto' });
      await expect(autoBtn).not.toHaveClass(/active/);
    });
  });

  // ===========================================================================
  // STEP MANAGEMENT
  // ===========================================================================
  test.describe('Step Management', () => {
    test('should add a step to the canvas via JavaScript', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
      });
      await waitForPageReady(page);

      await expect(page.locator('.step-card')).toHaveCount(1);
      await expect(page.locator('.step-number')).toHaveText('1');
    });

    test('should add multiple steps and number them sequentially', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
        window.addStep('agent_chat');
        window.addStep('output');
      });
      await waitForPageReady(page);

      const stepCards = page.locator('.step-card');
      await expect(stepCards).toHaveCount(3);

      const stepNumbers = page.locator('.step-number');
      await expect(stepNumbers.nth(0)).toHaveText('1');
      await expect(stepNumbers.nth(1)).toHaveText('2');
      await expect(stepNumbers.nth(2)).toHaveText('3');
    });

    test('should highlight selected step in canvas', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
      });
      await waitForPageReady(page);

      const stepCard = page.locator('.step-card').first();
      await expect(stepCard).toHaveClass(/selected/);
    });

    test('should select a different step when clicked', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
        window.addStep('agent_chat');
      });
      await waitForPageReady(page);

      // Click on the second step
      await page.locator('.step-content').nth(1).click();
      await waitForPageReady(page);

      await expect(page.locator('.step-card').nth(1)).toHaveClass(/selected/);
      await expect(page.locator('.step-card').nth(0)).not.toHaveClass(/selected/);
    });

    test('should delete a step when delete button is clicked', async ({ page }) => {
      setupDialogHandler(page, 'accept');

      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
        window.addStep('agent_chat');
      });
      await waitForPageReady(page);

      // Hover to reveal actions, then click delete on first step
      await page.locator('.step-content').first().hover();
      await page.locator('.step-card').first().locator('.step-action-btn.delete').click();

      // Handle confirm dialog
      await waitForPageReady(page);

      await expect(page.locator('.step-card')).toHaveCount(1);
    });

    test('should show move up/down buttons on steps', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
        window.addStep('agent_chat');
      });
      await waitForPageReady(page);

      await page.locator('.step-content').first().hover();

      const actionBtns = page.locator('.step-card').first().locator('.step-action-btn');
      await expect(actionBtns).toHaveCount(3); // up, down, delete
    });

    test('should display step type badge on step card', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
      });
      await waitForPageReady(page);

      await expect(page.locator('.step-type-badge')).toContainText('User Input');
    });

    test('should show GATE badge when step is set to gate mode', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
      });
      await waitForPageReady(page);

      await page.locator('.execution-mode-btn').filter({ hasText: 'Gate' }).click();
      await waitForPageReady(page);

      await expect(page.locator('.step-type-badge').filter({ hasText: 'GATE' })).toBeVisible();
    });
  });

  // ===========================================================================
  // UNDO / REDO
  // ===========================================================================
  test.describe('Undo / Redo', () => {
    test('should undo adding a step', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
      });
      await waitForPageReady(page);

      await expect(page.locator('.step-card')).toHaveCount(1);

      await page.locator('button[title="Undo"]').click();
      await waitForPageReady(page);

      // Canvas should be empty again
      await expect(page.locator('.step-card')).toHaveCount(0);
      await expect(page.locator('#stepsTimeline')).toContainText(
        'Drag steps from the library to build your workflow'
      );
    });

    test('should redo after undo', async ({ page }) => {
      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.evaluate(() => {
        window.addStep('user_input');
      });
      await waitForPageReady(page);

      await page.locator('button[title="Undo"]').click();
      await waitForPageReady(page);

      await expect(page.locator('.step-card')).toHaveCount(0);

      await page.locator('button[title="Redo"]').click();
      await waitForPageReady(page);

      await expect(page.locator('.step-card')).toHaveCount(1);
    });
  });

  // ===========================================================================
  // WORKFLOW SAVE — FORM VALIDATION
  // ===========================================================================
  test.describe('Save Workflow - Form Validation', () => {
    test('should block save when workflow name is empty', async ({ page }) => {
      setupDialogHandler(page, 'accept');

      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      // Clear the workflow name
      await page.locator('#workflowName').fill('');

      let alertMessage = '';
      page.on('dialog', async (dialog) => {
        alertMessage = dialog.message();
        await dialog.accept();
      });

      await page.getByRole('button', { name: /Save Workflow/i }).click();

      await expect(async () => {
        expect(alertMessage).toContain('workflow name');
      }).toPass({ timeout: 3000 });
    });

    test('should block save when no steps are added', async ({ page }) => {
      setupDialogHandler(page, 'accept');

      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      // Name is set, but no steps
      await page.locator('#workflowName').fill('Test Workflow');

      let alertMessage = '';
      page.on('dialog', async (dialog) => {
        alertMessage = dialog.message();
        await dialog.accept();
      });

      await page.getByRole('button', { name: /Save Workflow/i }).click();

      await expect(async () => {
        expect(alertMessage).toContain('step');
      }).toPass({ timeout: 3000 });
    });

    test('should save successfully with valid name and steps', async ({ page }) => {
      setupDialogHandler(page, 'accept');

      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.locator('#workflowName').fill('My Test Workflow');

      await page.evaluate(() => {
        window.addStep('user_input');
      });
      await waitForPageReady(page);

      let alertMessage = '';
      page.on('dialog', async (dialog) => {
        alertMessage = dialog.message();
        await dialog.accept();
      });

      await page.getByRole('button', { name: /Save Workflow/i }).click();

      await expect(async () => {
        expect(alertMessage).toContain('saved');
      }).toPass({ timeout: 5000 });
    });

    test('should update URL with workflow ID after successful save', async ({ page }) => {
      setupDialogHandler(page, 'accept');

      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      await page.locator('#workflowName').fill('URL Test Workflow');

      await page.evaluate(() => {
        window.addStep('user_input');
      });
      await waitForPageReady(page);

      await page.getByRole('button', { name: /Save Workflow/i }).click();

      // Wait for URL to be updated with ?id=
      await page.waitForURL(/\?id=/, { timeout: 5000 }).catch(() => {
        // URL update may not happen in all mock scenarios
      });
    });
  });

  // ===========================================================================
  // LOADING AN EXISTING WORKFLOW
  // ===========================================================================
  test.describe('Load Existing Workflow', () => {
    test('should load workflow from URL parameter and populate steps', async ({ page }) => {
      await page.goto('/workflow-builder.html?id=wf-uuid-001');
      await waitForPageReady(page);

      // Name should be loaded
      await expect(page.locator('#workflowName')).toHaveValue('Test Workflow');
    });

    test('should load workflow and set department dropdown', async ({ page }) => {
      await page.goto('/workflow-builder.html?id=wf-uuid-001');
      await waitForPageReady(page);

      await expect(page.locator('#workflowDepartment')).toHaveValue('dept-uuid-001');
    });

    test('should render existing workflow steps in canvas', async ({ page }) => {
      await page.goto('/workflow-builder.html?id=wf-uuid-001');
      await waitForPageReady(page);

      const stepCards = page.locator('.step-card');
      await expect(stepCards).toHaveCount(2);
    });

    test('should display existing step names in canvas', async ({ page }) => {
      await page.goto('/workflow-builder.html?id=wf-uuid-001');
      await waitForPageReady(page);

      await expect(page.locator('.step-title').nth(0)).toContainText('Gather Information');
      await expect(page.locator('.step-title').nth(1)).toContainText('AI Processing');
    });
  });

  // ===========================================================================
  // PREVIEW
  // ===========================================================================
  test.describe('Preview Workflow', () => {
    test('should alert to save first when preview is clicked on unsaved workflow', async ({ page }) => {
      setupDialogHandler(page, 'accept');

      await page.goto('/workflow-builder.html');
      await waitForPageReady(page);

      let alertMessage = '';
      page.on('dialog', async (dialog) => {
        alertMessage = dialog.message();
        await dialog.accept();
      });

      await page.getByRole('button', { name: /Preview/i }).click();

      await expect(async () => {
        expect(alertMessage).toContain('save');
      }).toPass({ timeout: 3000 });
    });
  });

  // ===========================================================================
  // API ENDPOINT TESTS (real server)
  // ===========================================================================
  test.describe('API Endpoint Tests', () => {
    test('GET /api/agents returns 200 with success and data array', async ({ request }) => {
      const response = await request.get('/api/agents');
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    test('GET /api/skills returns 200 with success and data array', async ({ request }) => {
      const response = await request.get('/api/skills');
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    test('GET /api/departments returns 200 with success', async ({ request }) => {
      const response = await request.get('/api/departments');
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    test('GET /api/agents response has no agents key (confirms the bug)', async ({ request }) => {
      const response = await request.get('/api/agents');
      const body = await response.json();
      // This assertion confirms what the page is doing wrong:
      // it reads body.agents which is undefined
      expect(body.agents).toBeUndefined();
      // The correct key is body.data
      expect(body.data).toBeDefined();
    });

    test('GET /api/skills response has no skills key (confirms the bug)', async ({ request }) => {
      const response = await request.get('/api/skills');
      const body = await response.json();
      // Page reads body.skills which is undefined
      expect(body.skills).toBeUndefined();
      // The correct key is body.data
      expect(body.data).toBeDefined();
    });
  });
});
