# Manual Test Plan: Client Onboarding and Configuration

**Version:** 1.0
**Date:** January 27, 2026
**Scope:** Complete client onboarding flow from creation through full platform configuration

---

## Overview

This test plan covers the complete flow for onboarding a new client to the Insight 360 platform, including all configuration screens and the Strategy-to-Execution (S2E) pipeline.

---

## Prerequisites

- Agency organization already set up (see [Agency Setup Test Plan](agency-setup-test-plan.md))
- User logged in with Consultant or higher role
- Test client information prepared

---

## Test Flow Diagram

```
Client Creation → Basic Setup → Align 120 Assessment →
Strategy 120 Planning → Execute 120 Implementation →
Client Portal Setup → Ongoing Management
```

---

## Phase 1: Client Creation

### Test Case 1.1: Create New Client

**Screen:** [admin-clients.html](public/admin-clients.html)
**API Route:** [server/routes/clients.js](server/routes/clients.js)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Admin → Clients | Client list page loads |
| 2 | Click "Add New Client" button | Creation modal/form opens |
| 3 | Enter company name: "Test Corp" | Required field validates |
| 4 | Enter industry: "Technology" | Field accepts input |
| 5 | Enter company size: "50-200" | Selection works |
| 6 | Enter primary contact name | Field accepts input |
| 7 | Enter primary contact email | Email validates |
| 8 | Select subscription tier: Pro | Tier options available |
| 9 | Click "Create Client" | Client created, redirected to client detail |

**Validation Points:**
- Client record in `clients` table
- `organization_id` links to agency
- `created_at` timestamp set
- Client visible in client list

---

## Phase 2: Context Configuration

### Test Case 2.1: Configure Client Context Assets

**Screen:** [context.html](public/context.html)
**API Route:** [server/routes/context.js](server/routes/context.js)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Context → Assets | Context management page loads |
| 2 | Select client from context | Client filter applied |
| 3 | Click "Add Context Asset" | Asset creation form opens |
| 4 | Select category: "Company Profile" | Category selected |
| 5 | Enter asset name: "Company Overview" | Name field accepts input |
| 6 | Enter content with company description | Rich text editor works |
| 7 | Set priority: High | Priority dropdown works |
| 8 | Click "Save Asset" | Asset created, appears in list |

**Validation Points:**
- Asset stored in `context_assets` table
- Client association correct
- Asset retrievable via API

### Test Case 2.2: Configure Multiple Context Categories

| Category | Test Data | Expected Behavior |
|----------|-----------|-------------------|
| Company Profile | Mission, vision, values | Saves and displays |
| Industry Context | Market trends, competitors | Saves with rich text |
| Stakeholder Profiles | Key personas, ICPs | Saves with structured data |
| Brand Voice | Tone, style guidelines | Saves and applies to AI |
| Strategic Priorities | Goals, OKRs | Saves with priority levels |

### Test Case 2.3: Context Injection Preview

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Chat (Higgins) | Chat interface loads |
| 2 | Select client context | Context badge shows |
| 3 | Click "Preview Context" | Shows injected context |
| 4 | Verify all high-priority assets | Assets listed in preview |
| 5 | Send test message | AI response uses context |

---

## Phase 3: Align 120 Assessment

### Test Case 3.1: Complete Alignment Assessment

**Screen:** [align120.html](public/align120.html)
**API Route:** [server/routes/align120.js](server/routes/align120.js)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Align 120 | Assessment page loads |
| 2 | Select client: "Test Corp" | Client context loaded |
| 3 | Start new assessment | Assessment wizard begins |

**Section 3.1.1: Vision & Mission**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 4 | Enter company vision statement | Text field accepts input |
| 5 | Enter company mission statement | Text field accepts input |
| 6 | Rate vision clarity (1-10) | Slider/input works |
| 7 | Click "Save & Continue" | Progress saved, next section |

**Section 3.1.2: Core Values**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 8 | Add core value #1 | Value added to list |
| 9 | Add core value #2 | Second value added |
| 10 | Add core value #3 | Third value added |
| 11 | Rate values alignment | Rating saved |
| 12 | Click "Save & Continue" | Progress to next section |

**Section 3.1.3: Strategic Priorities**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 13 | Add strategic priority #1 | Priority with deadline |
| 14 | Add strategic priority #2 | Second priority added |
| 15 | Assign priority weights | Weights sum to 100% |
| 16 | Click "Save & Continue" | Progress saved |

**Section 3.1.4: Stakeholder Analysis**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 17 | Add internal stakeholder group | Group added |
| 18 | Add external stakeholder group | Group added |
| 19 | Map stakeholder interests | Matrix populated |
| 20 | Click "Complete Assessment" | Assessment finalized |

### Test Case 3.2: Generate Alignment Report

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Generate Report" | AI processing begins |
| 2 | Wait for generation | Progress indicator shows |
| 3 | View generated report | Report displays with: |
| | | - Overall alignment score |
| | | - Section-by-section analysis |
| | | - Gap identification |
| | | - Recommendations |
| 4 | Export as PDF | PDF downloads with branding |

**Validation Points:**
- Assessment data in `align120_assessments`
- Report in `align120_reports`
- Client status updated

---

## Phase 4: Strategy 120 Planning

### Test Case 4.1: Create Strategic Plan

**Screen:** [strategy120.html](public/strategy120.html)
**API Route:** [server/routes/strategy120.js](server/routes/strategy120.js)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Strategy 120 | Planning page loads |
| 2 | Select client: "Test Corp" | Align 120 data loaded |
| 3 | Review alignment summary | Previous assessment shown |
| 4 | Click "Create Strategy" | Strategy wizard begins |

**Section 4.1.1: Strategic Objectives**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 5 | AI suggests objectives based on Align 120 | Suggestions displayed |
| 6 | Accept/modify objective #1 | Objective saved |
| 7 | Add custom objective | Manual entry works |
| 8 | Set objective timeframes | Dates validated |

**Section 4.1.2: Key Results**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 9 | Define KR for objective #1 | KR linked to objective |
| 10 | Set measurable target | Numeric target accepted |
| 11 | Set baseline value | Current state recorded |
| 12 | Add 2-3 KRs per objective | Multiple KRs supported |

**Section 4.1.3: Initiative Mapping**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 13 | Add initiative for KR #1 | Initiative created |
| 14 | Assign owner | Owner dropdown works |
| 15 | Set resource requirements | Resources documented |
| 16 | Map dependencies | Dependency graph updates |

### Test Case 4.2: Strategy Review and Approval

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Review Strategy" | Summary view displays |
| 2 | Run AI strategy analysis | AI provides feedback |
| 3 | Make adjustments | Changes saved |
| 4 | Click "Finalize Strategy" | Strategy locked, versioned |
| 5 | Export strategy document | PDF/DOCX downloads |

**Validation Points:**
- Strategy in `strategy120_plans` table
- OKRs in `strategy120_okrs` table
- Initiatives in `strategy120_initiatives` table

---

## Phase 5: Execute 120 Implementation

### Test Case 5.1: Create Execution Plan

**Screen:** [execute120.html](public/execute120.html)
**API Route:** [server/routes/execute120.js](server/routes/execute120.js)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Execute 120 | Execution page loads |
| 2 | Select client: "Test Corp" | Strategy data loaded |
| 3 | View initiative backlog | Initiatives from Strategy 120 |
| 4 | Click "Plan Execution" | Execution wizard begins |

**Section 5.1.1: Sprint/Cycle Planning**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 5 | Define execution cycle (weekly/monthly) | Cycle length set |
| 6 | Select initiatives for cycle 1 | Initiatives assigned |
| 7 | Break into tasks | Task list created |
| 8 | Assign task owners | Owners assigned |
| 9 | Set task deadlines | Dates validated |

**Section 5.1.2: Progress Tracking**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 10 | Update task status: In Progress | Status changes |
| 11 | Add progress note | Note saved with timestamp |
| 12 | Mark task complete | Completion recorded |
| 13 | View KR progress | Auto-calculated from tasks |

### Test Case 5.2: Execution Dashboard

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View execution dashboard | Dashboard loads |
| 2 | Check cycle progress | Progress bar accurate |
| 3 | View velocity metrics | Historical data shown |
| 4 | Identify blockers | Blocked items highlighted |
| 5 | Generate status report | Report with metrics |

**Validation Points:**
- Tasks in `execute120_tasks` table
- Progress in `execute120_progress` table
- Metrics calculated correctly

---

## Phase 6: Agent Configuration

### Test Case 6.1: Configure Client-Specific Agents

**Screen:** [agents.html](public/agents.html)
**API Route:** [server/routes/agents.js](server/routes/agents.js)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Agents | Agent management loads |
| 2 | Click "Create Agent" | Agent creation form |
| 3 | Enter agent name | Name accepted |
| 4 | Select agent type | Type dropdown works |
| 5 | Write system prompt | Prompt editor works |
| 6 | Assign to client | Client association set |
| 7 | Configure context injection | Context rules set |
| 8 | Save agent | Agent created |

### Test Case 6.2: Test Agent Execution

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Chat | Chat interface loads |
| 2 | Select custom agent | Agent selected |
| 3 | Select client context | Context applied |
| 4 | Send test query | Agent responds with context |
| 5 | Verify context injection | Response reflects client data |

---

## Phase 7: Workflow Configuration

### Test Case 7.1: Create Client Workflow

**Screen:** [workflow-builder.html](public/workflow-builder.html)
**API Route:** [server/routes/workflows.js](server/routes/workflows.js)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Workflows | Workflow builder loads |
| 2 | Click "New Workflow" | Builder canvas opens |
| 3 | Add trigger node | Trigger configured |
| 4 | Add action nodes | Actions added to flow |
| 5 | Connect nodes | Flow defined |
| 6 | Set client scope | Client filter applied |
| 7 | Save workflow | Workflow saved |
| 8 | Test workflow | Execution successful |

---

## Phase 8: Client Portal Setup

### Test Case 8.1: Invite Client Users

**Screen:** [admin-client-users.html](public/admin-client-users.html)
**API Route:** [server/routes/clientPortal.js](server/routes/clientPortal.js)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to client → Users | User management shows |
| 2 | Click "Invite User" | Invitation modal opens |
| 3 | Enter client stakeholder email | Email validates |
| 4 | Set permissions | Permission levels work |
| 5 | Send invitation | Magic link emailed |
| 6 | Verify invitation status | Shows "Pending" |

### Test Case 8.2: Configure Portal Permissions

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select invited user | User detail opens |
| 2 | Configure report access | Can view Align 120 report |
| 3 | Configure dashboard access | Limited dashboard view |
| 4 | Save permissions | Permissions persisted |

### Test Case 8.3: Verify Client Portal Access

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Log in as client user | Portal loads |
| 2 | Verify branding | Agency branding applied |
| 3 | View available reports | Only permitted reports |
| 4 | Attempt restricted access | Access denied |

---

## Phase 9: Integrity Monitoring

### Test Case 9.1: Configure Integrity Metrics

**Screen:** [integrity.html](public/integrity.html)
**API Route:** [server/routes/integrity.js](server/routes/integrity.js)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Integrity | Integrity dashboard loads |
| 2 | Select client | Client context applied |
| 3 | Configure monitoring rules | Rules saved |
| 4 | Set alert thresholds | Thresholds configured |
| 5 | Enable automated checks | Checks scheduled |

### Test Case 9.2: Review Integrity Reports

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Run integrity assessment | Assessment executes |
| 2 | View integrity score | Score calculated |
| 3 | Review findings | Findings listed |
| 4 | Acknowledge/resolve items | Status updates |

---

## Phase 10: Ongoing Management

### Test Case 10.1: Daily Briefing

**Screen:** [briefing.html](public/briefing.html)
**API Route:** [server/routes/briefing.js](server/routes/briefing.js)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Briefing | Briefing page loads |
| 2 | Select client | Client context applied |
| 3 | Generate daily briefing | AI generates summary |
| 4 | Review action items | Items from all modules |
| 5 | Export briefing | PDF/email works |

### Test Case 10.2: Progress Reviews

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Run weekly review | Review dashboard loads |
| 2 | Compare KR progress | Tracking vs. targets |
| 3 | Identify at-risk items | Red/yellow highlights |
| 4 | Update forecasts | Forecasts recalculated |
| 5 | Generate client report | Report ready for sharing |

---

## Screen Inventory (All Screens in Order)

| # | Screen | Path | Purpose |
|---|--------|------|---------|
| 1 | Admin Clients | [admin-clients.html](public/admin-clients.html) | Client CRUD |
| 2 | Context Assets | [context.html](public/context.html) | Context configuration |
| 3 | Align 120 | [align120.html](public/align120.html) | Alignment assessment |
| 4 | Strategy 120 | [strategy120.html](public/strategy120.html) | Strategic planning |
| 5 | Execute 120 | [execute120.html](public/execute120.html) | Execution tracking |
| 6 | Agents | [agents.html](public/agents.html) | Agent management |
| 7 | Workflow Builder | [workflow-builder.html](public/workflow-builder.html) | Workflow automation |
| 8 | Admin Client Users | [admin-client-users.html](public/admin-client-users.html) | Client user management |
| 9 | Client Portal | [client-portal.html](public/client-portal.html) | Client-facing dashboard |
| 10 | Integrity | [integrity.html](public/integrity.html) | Values monitoring |
| 11 | Briefing | [briefing.html](public/briefing.html) | Daily briefings |
| 12 | Chat (Higgins) | [chat.html](public/chat.html) | AI assistant |

---

## Cleanup Procedures

1. Delete test tasks from `execute120_tasks`
2. Delete test initiatives from `strategy120_initiatives`
3. Delete test OKRs from `strategy120_okrs`
4. Delete test assessments from `align120_assessments`
5. Delete test context assets from `context_assets`
6. Delete test client users from `client_users`
7. Delete test client from `clients`

---

## Test Sign-Off

| Phase | Tester | Date | Status | Notes |
|-------|--------|------|--------|-------|
| 1. Client Creation | | | | |
| 2. Context Config | | | | |
| 3. Align 120 | | | | |
| 4. Strategy 120 | | | | |
| 5. Execute 120 | | | | |
| 6. Agent Config | | | | |
| 7. Workflows | | | | |
| 8. Client Portal | | | | |
| 9. Integrity | | | | |
| 10. Ongoing Mgmt | | | | |

---

## Related Documents

- [Agency Setup Test Plan](agency-setup-test-plan.md)
- [Align 120 User Guide](../guides/align120-user-guide.md)
- [Strategy 120 User Guide](../guides/strategy120-user-guide.md)
- [Execute 120 User Guide](../guides/execute120-user-guide.md)
