# Manual Test Suite: Phase 54 - Organization & Agency Onboarding

**Version:** 1.0.0
**Phase:** 54 - Soul Configuration & Human Values Definition System
**Last Updated:** 2024-01-15

---

## Overview

This manual test suite covers end-to-end testing of organization and agency onboarding workflows, including soul configuration setup, multi-tenant hierarchy, and the SCU Ethics Framework integration.

### Prerequisites

- [ ] Platform admin account (Synergi super_admin)
- [ ] Access to Supabase dashboard for data verification
- [ ] Local development server running (`npm run dev`)
- [ ] Browser with developer tools open (Network tab)

---

## Part 1: New Organization Onboarding

### Scenario: Onboard "Acme Manufacturing" as a Business Tier Customer

---

### 1.1 Platform Admin: Create Organization

**As:** Platform Admin (Synergi)
**Location:** `/admin-platform.html`

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.1.1 | Navigate to Platform Admin Dashboard | Dashboard loads with Organizations tab visible | |
| 1.1.2 | Click "Create Organization" button | Organization creation modal opens | |
| 1.1.3 | Fill in organization details: | | |
| | - Name: "Acme Manufacturing" | | |
| | - Slug: "acme-manufacturing" | | |
| | - Industry: "Manufacturing" | | |
| | - Org Type: "client" (not agency) | | |
| 1.1.4 | Select Subscription Tier: "Business" | Tier features displayed (10 members, 25 agents, etc.) | |
| 1.1.5 | Click "Create" | Success toast, org appears in list | |
| 1.1.6 | Verify in Supabase: `organizations` table | New row with correct tier_id, org_type | |

**Notes:**
```sql
-- Verification query
SELECT o.*, st.name as tier_name
FROM organizations o
JOIN subscription_tiers st ON o.subscription_tier = st.id
WHERE o.slug = 'acme-manufacturing';
```

---

### 1.2 Create Organization Admin User

**As:** Platform Admin
**Location:** `/admin-platform.html` → Organization Details

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.2.1 | Click on "Acme Manufacturing" org | Org detail view opens | |
| 1.2.2 | Go to "Members" tab | Empty member list | |
| 1.2.3 | Click "Invite Admin" | Invite modal opens | |
| 1.2.4 | Enter email: admin@acme.example.com | | |
| 1.2.5 | Select Role: "admin" | | |
| 1.2.6 | Click "Send Invite" | Success message, pending invite shown | |
| 1.2.7 | Verify in Supabase: `org_members` | Row with role='admin', invited_at set | |

---

### 1.3 Soul Configuration Setup (Soul Wizard)

**As:** Org Admin (admin@acme.example.com)
**Location:** `/soul-wizard.html`

#### Step 1: Organization Profile

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.3.1 | Navigate to Soul Wizard | Step 1 "Organization Profile" displayed | |
| 1.3.2 | Verify org name pre-filled | "Acme Manufacturing" shown | |
| 1.3.3 | Fill AI Identity: | | |
| | - Name: "Ace" | | |
| | - Role: "Manufacturing Operations Partner" | | |
| | - Archetype: "Trusted Advisor" | | |
| | - Temperament: "Professional" | | |
| 1.3.4 | Click "Next" | Progress to Step 2, completeness updates | |

#### Step 2: Core Values Definition

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.3.5 | Add Value 1: | | |
| | - Name: "Quality First" | | |
| | - Meaning: "Never compromise on product quality" | | |
| | - Priority: 1 (Highest) | | |
| | - Non-negotiable: Yes | | |
| | - Behavior: "Verify specifications before any commitment" | | |
| 1.3.6 | Add Value 2: | | |
| | - Name: "Customer Success" | | |
| | - Meaning: "Our success is measured by customer outcomes" | | |
| | - Priority: 2 | | |
| | - Non-negotiable: No | | |
| | - Behavior: "Follow up on every delivery" | | |
| 1.3.7 | Add Value 3: | | |
| | - Name: "Safety Always" | | |
| | - Meaning: "Zero tolerance for safety shortcuts" | | |
| | - Priority: 3 | | |
| | - Non-negotiable: Yes | | |
| | - Behavior: "Flag any safety concerns immediately" | | |
| 1.3.8 | Click "Next" | Progress to Step 3 | |

#### Step 3: Bright Lines (Non-Negotiables)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.3.9 | Verify platform bright lines shown (read-only) | "Human Safety First", "No Deception", "Privacy Protection" visible, greyed out | |
| 1.3.10 | Add Org Bright Line 1: | | |
| | - Name: "No Competitor Sharing" | | |
| | - Description: "Never share proprietary info with competitors" | | |
| | - Test Question: "Would this benefit a competitor?" | | |
| 1.3.11 | Add Org Bright Line 2: | | |
| | - Name: "Regulatory Compliance" | | |
| | - Description: "Always comply with manufacturing regulations" | | |
| | - Test Question: "Is this compliant with ISO/OSHA?" | | |
| 1.3.12 | Click "Next" | Progress to Step 4 | |

#### Step 4: Guardrails

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.3.13 | Set Communication Guardrails: | | |
| | - "Use manufacturing terminology appropriately" | | |
| | - "Avoid overpromising delivery timelines" | | |
| 1.3.14 | Set Decision Guardrails: | | |
| | - "Recommend human review for orders over $50k" | | |
| | - "Escalate supply chain disruptions immediately" | | |
| 1.3.15 | Set Scope Guardrails: | | |
| | - "Do not provide legal advice" | | |
| | - "Stay within manufacturing domain" | | |
| 1.3.16 | Set Emotional Guardrails: | | |
| | - "Recognize stress in rush orders" | | |
| | - "Maintain calm during production issues" | | |
| 1.3.17 | Click "Next" | Progress to Step 5 | |

#### Step 5: Voice & Personality

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.3.18 | Set Tone: | | |
| | - Primary: "Professional" | | |
| | - Secondary: "Helpful" | | |
| | - Tertiary: "Efficient" | | |
| 1.3.19 | Set Avoid: | | |
| | - "Corporate jargon" | | |
| | - "Unnecessary pleasantries" | | |
| 1.3.20 | Set Personality Temperature: 0.4 | Slider shows "Reserved/Professional" | |
| 1.3.21 | Click "Next" | Progress to Step 6 | |

#### Step 6: Domain Knowledge

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.3.22 | Set Industry: "Manufacturing" | | |
| 1.3.23 | Add Products/Services: | | |
| | - "Precision components" | | |
| | - "Custom fabrication" | | |
| | - "Quality assurance" | | |
| 1.3.24 | Add Key Terms: | | |
| | - "ISO 9001", "Six Sigma", "Lead time" | | |
| | - "BOM", "RFQ", "MOQ" | | |
| 1.3.25 | Click "Next" | Progress to Step 7 | |

#### Step 7: Review & Publish

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.3.26 | Review all sections displayed | All entered data shown correctly | |
| 1.3.27 | Verify completeness score | Should be 85%+ (all sections filled) | |
| 1.3.28 | Click "Save as Draft" | Success, config saved as draft | |
| 1.3.29 | Click "Publish" | Confirmation modal appears | |
| 1.3.30 | Confirm publish | Success, config is now active | |
| 1.3.31 | Verify in DB: `soul_configurations` | Row with is_draft=false, is_active=true | |

**Verification Query:**
```sql
SELECT id, scope_type, identity->>'name' as ai_name,
       completeness_score, is_draft, is_active, version
FROM soul_configurations
WHERE org_id = (SELECT id FROM organizations WHERE slug = 'acme-manufacturing')
  AND scope_type = 'organization';
```

---

### 1.4 Verify Soul Configuration Inheritance

**As:** Org Admin
**Location:** `/soul-configuration.html`

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.4.1 | Navigate to Soul Configuration page | Config dashboard loads | |
| 1.4.2 | Click "View Resolved Config" | Shows merged platform + org config | |
| 1.4.3 | Verify platform bright lines present | All 3 platform lines shown (immutable) | |
| 1.4.4 | Verify org bright lines added | 2 org lines shown below platform | |
| 1.4.5 | Verify identity shows org override | Name: "Ace", not "Higgins" | |
| 1.4.6 | Click "Export as Markdown" | soul.md file downloads | |
| 1.4.7 | Open soul.md, verify content | All sections present, properly formatted | |

---

### 1.5 Test Ethical Context in Chat

**As:** Org Admin
**Location:** `/chat.html`

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.5.1 | Open chat with any agent | Chat interface loads | |
| 1.5.2 | Send LOW stakes message: | | |
| | "What's the weather like?" | Normal response, no ethical framing | |
| 1.5.3 | Send MEDIUM stakes message: | | |
| | "Can you recommend a strategy for our team transition?" | Response acknowledges org values | |
| 1.5.4 | Send HIGH stakes message: | | |
| | "Is this the right and fair approach for the policy?" | Full ethical framework engaged, lenses mentioned | |
| 1.5.5 | Send CRITICAL stakes message: | | |
| | "A safety incident occurred, what should we do?" | Immediate escalation language, bright lines referenced | |
| 1.5.6 | Verify in DB: `ethical_evaluations` | Logs created for HIGH/CRITICAL messages | |

---

### 1.6 Module Access Verification

**As:** Org Admin
**Location:** Navigation Sidebar

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.6.1 | Check sidebar modules | Business tier modules visible | |
| 1.6.2 | Verify accessible: | | |
| | - Command Center | ✓ | |
| | - Agent Management | ✓ | |
| | - Align 120 | ✓ (Business feature) | |
| | - Research Studio | ✓ (Business feature) | |
| | - Thought Leadership | ✓ (Business feature) | |
| 1.6.3 | Verify NOT accessible: | | |
| | - Client Portal | ✗ (Agency only) | |
| | - White Label | ✗ (Agency only) | |
| | - Platform Admin | ✗ (Platform only) | |
| 1.6.4 | Try direct URL: /client-portal.html | 403 or redirect to dashboard | |

---

### 1.7 Create Department & Department Soul Config

**As:** Org Admin
**Location:** `/organization-settings.html`

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.7.1 | Navigate to Organization Settings | Settings page loads | |
| 1.7.2 | Go to "Departments" tab | Department list (empty) | |
| 1.7.3 | Click "Create Department" | Modal opens | |
| 1.7.4 | Create "Sales Department": | | |
| | - Name: "Sales" | | |
| | - Description: "Revenue and client relationships" | | |
| 1.7.5 | Click "Create" | Department created | |
| 1.7.6 | Click "Configure Soul" on Sales dept | Soul wizard opens for department scope | |
| 1.7.7 | Only fill Voice section: | | |
| | - Tone: "Enthusiastic", "Persuasive" | | |
| | - Temperature: 0.6 (slightly warmer) | | |
| 1.7.8 | Save & Publish | Department config saved | |
| 1.7.9 | Verify inheritance test: | Shows org values + dept voice override | |

---

### 1.8 Resource Limit Testing

**As:** Org Admin
**Location:** Various

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.8.1 | Check current usage on dashboard | Shows X/25 agents, X/15 workflows | |
| 1.8.2 | Create agents until limit | 25th agent creates successfully | |
| 1.8.3 | Try to create 26th agent | Error: "Agent limit reached for your tier" | |
| 1.8.4 | Verify API returns 403 | Network tab shows 403 with limit message | |

---

## Part 2: Agency Onboarding

### Scenario: Onboard "Creative Solutions Agency" with Multiple Clients

---

### 2.1 Platform Admin: Create Agency Organization

**As:** Platform Admin (Synergi)
**Location:** `/admin-platform.html`

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 2.1.1 | Navigate to Platform Admin Dashboard | Dashboard loads | |
| 2.1.2 | Click "Create Organization" | Modal opens | |
| 2.1.3 | Fill in agency details: | | |
| | - Name: "Creative Solutions Agency" | | |
| | - Slug: "creative-solutions" | | |
| | - Industry: "Marketing & Creative" | | |
| | - Org Type: "agency" | | |
| 2.1.4 | Select Subscription Tier: "Agency" | Agency features shown (50 members, 100 clients, 200 agents) | |
| 2.1.5 | Click "Create" | Success, agency created | |
| 2.1.6 | Verify org_type = 'agency' in DB | | |

---

### 2.2 Agency Admin: Initial Setup

**As:** Agency Admin (admin@creative.example.com)
**Location:** `/soul-wizard.html`

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 2.2.1 | Complete Soul Wizard for agency: | | |
| | - Name: "Nova" | | |
| | - Role: "Creative Strategy Partner" | | |
| | - Values: Creativity, Client Success, Innovation | | |
| | - Voice: Creative, Inspiring, Professional | | |
| 2.2.2 | Publish agency soul config | Success | |

---

### 2.3 White-Label Configuration

**As:** Agency Admin
**Location:** `/org-customization.html`

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 2.3.1 | Navigate to White-Label Settings | Customization page loads | |
| 2.3.2 | Upload agency logo | Logo preview updates | |
| 2.3.3 | Set brand colors: | | |
| | - Primary: #6B46C1 (purple) | | |
| | - Secondary: #D53F8C (pink) | | |
| 2.3.4 | Set custom domain: portal.creative.example.com | Domain field saves | |
| 2.3.5 | Enable "Hide Synergi Branding" | Toggle on | |
| 2.3.6 | Save settings | Success message | |
| 2.3.7 | Preview client portal | Shows agency branding | |

---

### 2.4 Create First Client: "Local Bakery"

**As:** Agency Admin
**Location:** `/clients.html`

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 2.4.1 | Navigate to Clients page | Client list (empty) | |
| 2.4.2 | Click "Add Client" | Client creation modal | |
| 2.4.3 | Fill client details: | | |
| | - Name: "Sweet Dreams Bakery" | | |
| | - Industry: "Food & Beverage" | | |
| | - Contact: owner@sweetdreams.example.com | | |
| | - Client Type: "small_business" | | |
| 2.4.4 | Click "Create Client" | Success, client appears in list | |
| 2.4.5 | Verify in DB: `agency_clients` | Row with parent_org_id = agency id | |

---

### 2.5 Client Soul Configuration

**As:** Agency Admin
**Location:** `/soul-wizard.html` (client scope)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 2.5.1 | From client detail, click "Configure Soul" | Wizard opens with client scope | |
| 2.5.2 | Verify inheritance preview: | | |
| | - Platform bright lines (locked) | | |
| | - Agency values visible | | |
| 2.5.3 | Configure client-specific: | | |
| | - Name: "Bella" (client AI name) | | |
| | - Role: "Bakery Marketing Assistant" | | |
| | - Values: "Artisan Quality", "Community Focus" | | |
| | - Domain: Food industry, baking terms | | |
| 2.5.4 | Publish client config | Success | |
| 2.5.5 | Test resolved config: | Shows platform + agency + client merged | |

---

### 2.6 Create Additional Clients

**As:** Agency Admin
**Location:** `/clients.html`

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 2.6.1 | Create "FitLife Gym": | | |
| | - Industry: Health & Fitness | | |
| | - Configure soul: Focus on motivation, wellness | | |
| 2.6.2 | Create "Metro Law Firm": | | |
| | - Industry: Legal Services | | |
| | - Configure soul: Focus on precision, confidentiality | | |
| 2.6.3 | Verify all 3 clients in list | All show with status indicators | |
| 2.6.4 | Verify resource counts: | 3/100 clients used | |

---

### 2.7 Client Portal Access Testing

**As:** Client User (owner@sweetdreams.example.com)
**Location:** `/client-portal.html`

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 2.7.1 | Login as client user | Redirected to client portal | |
| 2.7.2 | Verify branding | Agency branding visible, not Synergi | |
| 2.7.3 | Verify limited navigation | Only client-appropriate modules visible | |
| 2.7.4 | Chat with client AI | Uses client soul config ("Bella") | |
| 2.7.5 | Cannot access other clients | Only own client data visible | |
| 2.7.6 | Cannot access agency admin | Admin pages not accessible | |

---

### 2.8 Agency Dashboard: Multi-Client View

**As:** Agency Admin
**Location:** `/agency-dashboard.html`

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 2.8.1 | Navigate to Agency Dashboard | Dashboard loads with all clients | |
| 2.8.2 | View client metrics overview | All 3 clients shown with stats | |
| 2.8.3 | Filter by client | Can isolate individual client | |
| 2.8.4 | View cross-client analytics | Aggregate usage across clients | |
| 2.8.5 | Access any client's workspace | Can switch context to each client | |

---

### 2.9 Bright Line Incident Workflow

**As:** Agency Admin managing "Metro Law Firm"
**Location:** `/chat.html` → Incident occurs

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 2.9.1 | Simulate bright line crossing: | | |
| | User asks for advice that crosses "No Legal Advice" line | | |
| 2.9.2 | AI refuses appropriately | Response explains limitation | |
| 2.9.3 | Check incident logged | Entry in `bright_line_incidents` table | |
| 2.9.4 | Navigate to Integrity Dashboard | Incident visible | |
| 2.9.5 | Click incident to review | Details shown: | |
| | - Bright line crossed | | |
| | - Message content | | |
| | - Severity assessment | | |
| 2.9.6 | Add resolution notes | | |
| 2.9.7 | Mark as resolved | Incident closed, resolved_at set | |

---

### 2.10 Values Alignment Audit

**As:** Agency Admin
**Location:** `/soul-configuration.html` → Audit

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 2.10.1 | Click "Run Values Audit" for a client | Audit process starts | |
| 2.10.2 | Review stated vs discovered values | | |
| | - Shows configured values | | |
| | - Shows values inferred from conversations | | |
| 2.10.3 | Check alignment score | Percentage match displayed | |
| 2.10.4 | Review drift indicators | Any misalignments highlighted | |
| 2.10.5 | View audit history | Previous audits listed | |
| 2.10.6 | Verify in DB: `values_alignment_audits` | Audit record created | |

---

## Part 3: Cross-Cutting Concerns

### 3.1 Version History & Rollback

**Location:** `/soul-configuration.html`

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 3.1.1 | Make change to published config | New version created | |
| 3.1.2 | View version history | All versions listed with changes | |
| 3.1.3 | Click "Rollback" to previous version | Confirmation modal | |
| 3.1.4 | Confirm rollback | Config reverted, new version created | |
| 3.1.5 | Verify DB: `soul_config_versions` | Version chain maintained | |

---

### 3.2 Ethical Evaluation Logging

**Location:** Various chat interfaces

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 3.2.1 | Generate HIGH stakes conversation | Ethical evaluation logged | |
| 3.2.2 | Check `ethical_evaluations` table | Entry with: | |
| | - stakes_level | | |
| | - lenses_applied | | |
| | - decision_summary | | |
| | - outcome_assessment | | |
| 3.2.3 | View in Integrity Dashboard | Evaluations listed | |

---

### 3.3 Integrity Metrics Dashboard

**Location:** `/integrity-dashboard.html`

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 3.3.1 | Navigate to Integrity Dashboard | Dashboard loads | |
| 3.3.2 | Review metrics: | | |
| | - Total evaluations | | |
| | - By stakes level | | |
| | - Bright line incidents | | |
| | - Values alignment score | | |
| 3.3.3 | Filter by date range | Metrics update | |
| 3.3.4 | Export report | CSV/PDF downloads | |

---

## Test Data Cleanup

After completing tests, optionally clean up test data:

```sql
-- Remove test organization and related data
-- WARNING: Only run in development/test environment

-- Get org IDs
SELECT id FROM organizations WHERE slug IN ('acme-manufacturing', 'creative-solutions');

-- Delete in order (respecting foreign keys)
DELETE FROM ethical_evaluations WHERE org_id IN (...);
DELETE FROM bright_line_incidents WHERE org_id IN (...);
DELETE FROM values_alignment_audits WHERE org_id IN (...);
DELETE FROM soul_config_versions WHERE config_id IN (
    SELECT id FROM soul_configurations WHERE org_id IN (...)
);
DELETE FROM soul_configurations WHERE org_id IN (...);
DELETE FROM agency_clients WHERE parent_org_id IN (...);
DELETE FROM org_members WHERE org_id IN (...);
DELETE FROM departments WHERE org_id IN (...);
DELETE FROM organizations WHERE slug IN ('acme-manufacturing', 'creative-solutions');
```

---

## Sign-Off

| Tester | Date | Environment | All Tests Passed |
|--------|------|-------------|------------------|
| | | Dev/Staging/Prod | Yes / No |

### Notes:
_Record any issues, edge cases, or observations here:_

---

## Appendix A: Quick Reference - Subscription Tier Features

| Feature | Starter | Business | Enterprise | Agency |
|---------|---------|----------|------------|--------|
| Max Members | 3 | 10 | 100 | 50 |
| Max Clients | 0 | 0 | 0 | 100 |
| Max Agents | 5 | 25 | 100 | 200 |
| Max Workflows | 3 | 15 | 50 | 100 |
| Align 120 | ✗ | ✓ | ✓ | ✓ |
| Research Studio | ✗ | ✓ | ✓ | ✓ |
| Thought Leadership | ✗ | ✓ | ✓ | ✓ |
| White-Label | ✗ | ✗ | ✗ | ✓ |
| Client Portal | ✗ | ✗ | ✗ | ✓ |
| SSO | ✗ | ✗ | ✓ | ✓ |
| Priority Support | ✗ | ✗ | ✓ | ✓ |

---

## Appendix B: Soul Configuration Inheritance Rules

```
Platform (Synergi)
├── Identity: Higgins defaults
├── Bright Lines: IMMUTABLE - cannot be overridden
├── Values: Base values (can be extended)
└── Voice: Default professional tone

    └── Organization
        ├── Identity: Override name/role/archetype
        ├── Bright Lines: Add org-specific (cannot remove platform)
        ├── Values: Override by name, add new
        └── Voice: Override tone/temperature

            └── Department/Client
                ├── Identity: Minor persona tweaks
                ├── Bright Lines: Add dept/client-specific
                ├── Values: Emphasis adjustments only
                └── Voice: Context-appropriate overrides

                    └── Agent
                        ├── Identity: Agent-specific persona
                        └── Voice: Agent personality fine-tuning
```

---

## Appendix C: Stakes Level Detection Keywords

| Level | Trigger Keywords |
|-------|-----------------|
| CRITICAL | safety, harm, danger, emergency, crisis, legal, lawsuit, discrimination, harassment, terminate, fire, illegal, fraud, child, minor, death, suicide, violence, weapon, abuse |
| HIGH | ethics, moral, right, wrong, should, ought, fair, unfair, policy, compliance, regulation, confidential, privacy, sensitive, decision, choose, dilemma, conflict, stakeholder, impact, reputation, trust, integrity, values, principle (2+ required) |
| MEDIUM | strategy, recommend, suggest, advise, guidance, trade-off, priority, resource, budget, allocation, change, transition, employee, team, culture, communication, relationship (2+ required, or 1 HIGH keyword) |
| LOW | Default - no trigger keywords detected |
