# UX Testing Plan - Insight 360

## Overview
This document outlines a comprehensive plan for testing interactive UI elements across the Insight 360 application. The focus is on verifying that buttons, forms, modals, and other interactive components work as intended.

## Test Environment Setup

### Prerequisites
- Node.js 18+ installed
- Application running locally (`npm run dev`)
- Test user accounts (regular user + admin)
- Browser DevTools open for network/console monitoring

### Testing Tools Options
1. **Manual Testing** - Checklist-based verification
2. **Playwright/Puppeteer** - Automated E2E browser testing
3. **Cypress** - Interactive E2E testing with visual debugging

---

## Test Categories

### 1. Navigation & Layout Tests
### 2. Modal Interaction Tests
### 3. Form Submission Tests
### 4. Chat Interface Tests
### 5. CRUD Operation Tests
### 6. Panel Resize Tests
### 7. Theme & Settings Tests

---

## Detailed Test Cases

### 1. Navigation & Layout Tests

#### 1.1 Sidebar Navigation
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| NAV-001 | Click "Dashboard" link | Navigate to / (index.html) | High |
| NAV-002 | Click "Higgins" link | Navigate to /chat.html | High |
| NAV-003 | Click "Agent Library" link | Navigate to /agents.html | High |
| NAV-004 | Click collapsible group header (Dashboards) | Toggle group expand/collapse | Medium |
| NAV-005 | Click sidebar collapse button | Sidebar collapses to icons only | Medium |
| NAV-006 | Click collapsed sidebar item | Navigate to page correctly | Medium |
| NAV-007 | Active nav item highlighting | Current page is highlighted | Low |
| NAV-008 | Admin-only links visibility | Show only for admin users | High |

#### 1.2 User Menu
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| NAV-009 | Click user profile icon | User dropdown menu opens | Medium |
| NAV-010 | Click "Profile" in menu | Navigate to /profile.html | Medium |
| NAV-011 | Click "Sign Out" | Logout, redirect to /login.html | High |
| NAV-012 | Click outside dropdown | Menu closes | Low |

---

### 2. Modal Interaction Tests

#### 2.1 Modal Open/Close
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| MOD-001 | Click modal trigger button | Modal opens, centered on screen | High |
| MOD-002 | Click modal X (close) button | Modal closes | High |
| MOD-003 | Click modal overlay (backdrop) | Modal closes | Medium |
| MOD-004 | Press ESC key | Modal closes | Medium |
| MOD-005 | Click inside modal content | Modal stays open | High |

#### 2.2 Modal Drag & Resize
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| MOD-006 | Drag modal header | Modal moves with cursor | Medium |
| MOD-007 | Drag corner resize handle | Modal resizes diagonally | Low |
| MOD-008 | Drag edge resize handle | Modal resizes in one dimension | Low |
| MOD-009 | Release drag outside viewport | Modal stays within bounds | Low |

#### 2.3 Specific Modals
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| MOD-010 | Help button → Help Modal | Help content displays contextually | Medium |
| MOD-011 | Create Action → Template Modal | Template grid displays | High |
| MOD-012 | Edit Agent → Edit Modal | Form populates with agent data | High |
| MOD-013 | Voice input button → Voice Modal | Recording UI displays | Medium |

---

### 3. Form Submission Tests

#### 3.1 Login Form (/login.html)
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| FRM-001 | Submit with valid credentials | Login success, redirect to / | Critical |
| FRM-002 | Submit with invalid credentials | Error message displays | Critical |
| FRM-003 | Submit with empty fields | Validation error shows | High |
| FRM-004 | Press Enter in password field | Form submits | Medium |

#### 3.2 Agent Create/Edit Forms
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| FRM-005 | Create agent with valid data | Agent created, modal closes, list updates | High |
| FRM-006 | Create agent with missing name | Validation error displays | High |
| FRM-007 | Edit agent and save | Agent updated, changes reflected | High |
| FRM-008 | Cancel edit without saving | No changes saved, modal closes | Medium |

#### 3.3 Context Asset Forms
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| FRM-009 | Save JSON asset | Asset saved, validation passes | High |
| FRM-010 | Save invalid JSON | Error message, asset not saved | High |
| FRM-011 | Switch between JSON/Plaintext/Form tabs | Editor content preserved | Medium |
| FRM-012 | Import JSON file | Asset populated from file | Medium |
| FRM-013 | Export asset as JSON | File downloads correctly | Medium |

#### 3.4 Action Forms
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| FRM-014 | Select template in create modal | Template highlighted | High |
| FRM-015 | Create action from template | Action created, appears in list | High |
| FRM-016 | Execute action with input | Execution starts, streaming output | High |
| FRM-017 | Edit action properties | Changes saved correctly | Medium |

#### 3.5 Skill Forms
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| FRM-018 | Create skill with valid data | Skill created, list updates | High |
| FRM-019 | Create skill with missing instructions | Validation error | High |
| FRM-020 | Test skill execution | Test output displays | Medium |

---

### 4. Chat Interface Tests (Higgins)

#### 4.1 Message Input
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| CHT-001 | Type message and click Send | Message sent, appears in chat | Critical |
| CHT-002 | Type message and press Enter | Message sent, appears in chat | Critical |
| CHT-003 | Press Enter with empty input | Nothing happens | Medium |
| CHT-004 | Shift+Enter in textarea | New line inserted, no send | Medium |
| CHT-005 | Textarea auto-expands on input | Height increases with content | Low |

#### 4.2 Model Selection
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| CHT-006 | Change model dropdown | Model selection updates | High |
| CHT-007 | Model persists across messages | Same model used for conversation | High |
| CHT-008 | Unavailable model shows disabled | Cannot select grayed-out model | Medium |

#### 4.3 File Attachments
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| CHT-009 | Click paperclip icon | File dialog opens | High |
| CHT-010 | Select image file | Preview thumbnail displays | High |
| CHT-011 | Select PDF file | File name displays in preview | High |
| CHT-012 | Click X on file preview | File removed from attachments | High |
| CHT-013 | Send message with attachment | File included in message | High |

#### 4.4 Voice Features
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| CHT-014 | Enable voice toggle | Voice features activate | Medium |
| CHT-015 | Click voice input button | Recording modal opens | Medium |
| CHT-016 | Record voice → Stop | Recording stops, transcription starts | Medium |
| CHT-017 | Cancel voice recording | Modal closes, no transcription | Medium |
| CHT-018 | Change voice playback option | Selected voice stored | Low |

#### 4.5 Conversation History
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| CHT-019 | Click conversation in history | Conversation loads in main area | High |
| CHT-020 | Delete conversation (click X) | Conversation removed from list | High |
| CHT-021 | Scroll chat to bottom | Auto-scrolls with new messages | Medium |
| CHT-022 | Resize history panel | Panel width changes, persists | Low |

#### 4.6 Search Toggle
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| CHT-023 | Enable search toggle | Web search enabled for queries | Medium |
| CHT-024 | Search query shows citations | Sources listed in response | Medium |

---

### 5. CRUD Operation Tests

#### 5.1 Agents CRUD
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| CRD-001 | Create new agent | Agent appears in list | High |
| CRD-002 | Read agent details | Detail panel shows correct data | High |
| CRD-003 | Update agent | Changes reflected in list/detail | High |
| CRD-004 | Delete agent | Confirmation dialog → agent removed | High |
| CRD-005 | Filter agents by search | List filters in real-time | Medium |

#### 5.2 Context Assets CRUD
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| CRD-006 | Create new context asset | Asset appears in list | High |
| CRD-007 | Read asset in editor | Content displays correctly | High |
| CRD-008 | Update asset content | Changes saved on Save click | High |
| CRD-009 | Delete asset | Confirmation → asset removed | High |
| CRD-010 | Filter by type | List shows only matching type | Medium |
| CRD-011 | Filter by department | List shows only matching dept | Medium |

#### 5.3 Actions CRUD
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| CRD-012 | Create action from template | Action created with template config | High |
| CRD-013 | Read action details | Execute modal shows correct info | High |
| CRD-014 | Update action | Edit modal saves changes | High |
| CRD-015 | Delete action | Confirmation → action removed | High |
| CRD-016 | Filter by suite tab | Only matching suite shown | Medium |
| CRD-017 | Filter by department | Only matching dept shown | Medium |

#### 5.4 Skills CRUD
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| CRD-018 | Create new skill | Skill appears in grid | High |
| CRD-019 | Read skill details | Modal shows skill configuration | High |
| CRD-020 | Update skill | Changes saved correctly | High |
| CRD-021 | Delete skill | Confirmation → skill removed | High |
| CRD-022 | Filter by category chip | Grid shows matching skills | Medium |
| CRD-023 | Filter by suite tab | Grid shows matching suite | Medium |

---

### 6. Panel Resize Tests

#### 6.1 Three-Panel Layouts (Agents, Context)
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| PNL-001 | Drag left panel resize handle | Left panel width changes | Medium |
| PNL-002 | Drag right panel resize handle | Right panel width changes | Medium |
| PNL-003 | Drag to minimum width | Stops at minimum (e.g., 250px) | Low |
| PNL-004 | Drag to maximum width | Stops at maximum (e.g., 600px) | Low |
| PNL-005 | Resize persists after refresh | LocalStorage saves width | Low |

#### 6.2 Chat History Panel
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| PNL-006 | Drag chat panel resize handle | History panel width changes | Medium |
| PNL-007 | Collapse history panel | Panel hides completely | Low |

---

### 7. Theme & Settings Tests

#### 7.1 Theme Toggle
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| THM-001 | Click theme toggle (light→dark) | UI switches to dark mode | Medium |
| THM-002 | Click theme toggle (dark→light) | UI switches to light mode | Medium |
| THM-003 | Theme persists after refresh | LocalStorage saves preference | Medium |

#### 7.2 Dashboard Settings
| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| SET-001 | Click "Run LLM Check" | LLM status updates | Medium |
| SET-002 | Click "Getting Started" button | Opens onboarding wizard | Medium |
| SET-003 | Complete onboarding wizard | Preferences saved | Low |

---

## Testing Execution Plan

### Phase 1: Critical Path (Day 1)
Focus on login, navigation, and primary workflows:
- FRM-001, FRM-002 (Login)
- NAV-001 through NAV-008 (Navigation)
- CHT-001, CHT-002 (Chat send)
- CRD-001 through CRD-004 (Agent CRUD)

### Phase 2: Core Features (Day 2)
Test main feature areas:
- All Modal tests (MOD-*)
- All Chat tests (CHT-*)
- Context CRUD (CRD-006 through CRD-011)

### Phase 3: Secondary Features (Day 3)
Test actions, skills, and admin:
- Actions CRUD (CRD-012 through CRD-017)
- Skills CRUD (CRD-018 through CRD-023)
- Form validation tests

### Phase 4: Polish & Edge Cases (Day 4)
Test UI polish and edge cases:
- Panel resize tests
- Theme toggle tests
- Keyboard accessibility
- Error states

---

## Automated Test Setup (Optional)

### Playwright Configuration
```javascript
// playwright.config.js
const config = {
  testDir: './__tests__/e2e-ui',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
  ],
};
```

### Sample Playwright Test
```javascript
// __tests__/e2e-ui/chat.test.js
const { test, expect } = require('@playwright/test');

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat.html');
  });

  test('should send message on Enter key', async ({ page }) => {
    const input = page.locator('#chatInput');
    await input.fill('Hello, Higgins!');
    await input.press('Enter');

    const messages = page.locator('.chat-message');
    await expect(messages).toHaveCount(1);
    await expect(messages.first()).toContainText('Hello, Higgins!');
  });

  test('should change model selection', async ({ page }) => {
    const select = page.locator('#modelSelect');
    await select.selectOption('gpt-4');
    await expect(select).toHaveValue('gpt-4');
  });
});
```

---

## Bug Reporting Template

### Bug Report Format
```
**Bug ID:** UX-XXX
**Test Case:** [Test ID from above]
**Severity:** Critical/High/Medium/Low
**Page:** [URL/Page name]
**Browser:** [Chrome/Firefox/Safari + version]

**Steps to Reproduce:**
1. ...
2. ...
3. ...

**Expected Result:**
...

**Actual Result:**
...

**Screenshots/Video:**
[Attach if available]

**Console Errors:**
[Copy any relevant errors]
```

---

## Success Criteria

### Must Pass (Release Blocker)
- All Critical priority tests pass
- All High priority tests pass
- No JavaScript errors in console during normal use

### Should Pass (Release with Known Issues)
- 95% of Medium priority tests pass
- Workarounds documented for failures

### Nice to Have
- All Low priority tests pass
- UI polish complete

---

## Appendix: Page-by-Button Reference

### Dashboard (index.html)
- Help button: `HelpModal.open()`
- LLM Check: `runLLMCheck()`
- Onboarding: `OnboardingWizard.show()`
- Navigation links: Standard `<a href="...">`

### Chat (chat.html)
- Send: `#sendBtn` click → `sendMessage()`
- File attach: Paperclip icon → `#fileInput.click()`
- Voice: `#voiceInputBtn` → `openVoiceModal()`
- Model select: `#modelSelect` → change event

### Agents (agents.html)
- Create: `showCreateModal()`
- Edit: `openEditModal(id)`
- Delete: `deleteAgent(id)`
- Card click: `selectAgent(id)`

### Context (context.html)
- New: `showCreateModal()`
- Save: `saveAsset()`
- Delete: `deleteAsset()`
- Import: `#importFile.click()`
- Export: `exportAsset()`
- Tab switch: `.tab-btn` click

### Actions (actions.html)
- Create: `showCreateModal()`
- From template: `createFromTemplateSlug(slug)`
- Execute: `openAction(slug)` → `runAction()`
- Edit: `openEditModal(id)`
- Delete: `deleteAction(id)`
- Suite tabs: `.suite-tab[data-suite]`

### Skills (skills.html)
- Create: `showCreateModal()`
- Edit: `openSkillModal(id)`
- Delete: `deleteSkill(id)`
- Test: `testSkill(id)`
- Category filter: `.category-chip` click
- Suite tabs: `.suite-tab[data-suite]`

### Admin (admin.html)
- Add category: `openAddCategoryModal()`
- Edit category: `openEditCategoryModal(id)`
- Delete category: `handleDeleteCategory(id)`
- Edit user: `openEditModal(userId)`
- Delete user: `openDeleteModal(userId)`
- Roadmap fullscreen: `toggleRoadmapFullscreen()`
