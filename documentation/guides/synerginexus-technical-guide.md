# SynergiNexus Technical Guide

**For:** Developers and System Administrators
**Version:** 3.0
**Last Updated:** Wednesday, February 12, 2026

---

## Overview

SynergiNexus is the values-driven intelligence governance system for Insight 360. It implements the Disciplined Intelligence Governance Model (DIGM) which provides a structured approach to ensuring AI outputs align with organizational values.

---

## Architecture

### Database Schema

SynergiNexus uses the following tables in Supabase PostgreSQL:

| Table | Purpose |
|-------|---------|
| `digm_config` | DIGM layer configurations (identity, cognitive, voice, adaptation) |
| `governance_values` | Organizational values with non-negotiable flags |
| `governance_principles` | Constraints derived from values |
| `governance_conflicts` | Conflict logging and tracking |
| `escalation_rules` | Severity-based escalation routing |

### DIGM Layers

The four DIGM layers control AI behavior:

1. **Identity Layer**: Role definition, authority boundaries, ethical posture
2. **Cognitive Layer**: Reasoning frameworks, evidence standards, assumption surfacing
3. **Voice Layer**: Allowed/prohibited tones, expression guidelines
4. **Adaptation Layer**: Contextual flexibility, non-adaptable elements

---

## API Endpoints

### Base URL: `/api/synerginexus`

### Dashboard
```
GET /dashboard
```
Returns summary counts for all governance components.

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "digm_configs": 13,
      "governance_values": 10,
      "governance_principles": 15,
      "open_conflicts": 0
    }
  }
}
```

### DIGM Configuration

```
GET /digm
```
Returns all DIGM configurations grouped by layer.

```
GET /digm/:layer/:key
```
Returns a specific configuration.

```
PUT /digm/:layer/:key
```
Updates a DIGM configuration.

**Body:**
```json
{
  "config_value": { ... },
  "is_active": true
}
```

```
POST /digm
```
Creates a new DIGM configuration.

**Body:**
```json
{
  "layer": "identity|cognitive|voice|adaptation",
  "config_key": "string",
  "config_value": { ... }
}
```

```
GET /digm/prompt
```
Returns the combined prompt injection text from all active DIGM configs.

### Governance Values

```
GET /values
GET /values?non_negotiable=true
```
Returns governance values with optional filtering.

```
GET /values/:id
```
Returns a single value with associated principles.

```
POST /values
```
Creates a new governance value.

**Body:**
```json
{
  "name": "string",
  "plain_meaning": "string",
  "why_it_matters": "string",
  "is_non_negotiable": false
}
```

```
PUT /values/:id
```
Updates a governance value.

### Governance Principles

```
GET /principles
GET /principles?value_id=uuid&constraint_type=requirement&digm_touchpoint=context
```
Returns principles with optional filtering.

```
POST /principles
```
Creates a new principle.

**Body:**
```json
{
  "value_id": "uuid",
  "statement": "string",
  "constraint_type": "prohibition|requirement|disclosure|boundary",
  "applies_when": "string",
  "digm_touchpoint": "context|decomposition|reasoning|alternatives|synthesis"
}
```

```
PUT /principles/:id
DELETE /principles/:id
```

### Conflicts

```
GET /conflicts
GET /conflicts?status=pending&severity=high&agent_id=uuid
```
Returns conflicts with optional filtering.

```
GET /conflicts/stats
```
Returns conflict statistics by status and severity.

```
GET /conflicts/:id
```
Returns a specific conflict.

```
POST /conflicts
```
Logs a new conflict.

**Body:**
```json
{
  "description": "string (required)",
  "context": { "note": "string" },
  "severity": "low|medium|high|critical"
}
```

```
PUT /conflicts/:id/resolve
```
Updates conflict status/resolution.

**Body:**
```json
{
  "status": "pending|escalated|resolved|dismissed",
  "resolution_notes": "string",
  "resolved_by": "uuid"
}
```

### Escalation Rules

```
GET /escalation-rules
```
Returns all escalation rules.

```
PUT /escalation-rules/:severity
```
Updates escalation rule for a severity level.

**Body:**
```json
{
  "resolver_level": "department_admin|system_admin|super_admin",
  "auto_escalate_after_hours": 24,
  "notification_channels": ["email", "in_app", "slack"]
}
```

### Ethical Lenses (SCU Framework)

The platform integrates the Santa Clara University (SCU) Ethics Framework, providing six ethical lenses for evaluating AI decisions and outputs.

```
GET /api/soul-config/ethical-lenses
```
Returns all available ethical lenses.

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Rights", "description": "Respects and protects individual rights" },
    { "id": "uuid", "name": "Justice", "description": "Ensures fair and equitable treatment" },
    { "id": "uuid", "name": "Utilitarian", "description": "Maximizes overall benefit and minimizes harm" },
    { "id": "uuid", "name": "Common Good", "description": "Promotes conditions beneficial to all" },
    { "id": "uuid", "name": "Virtue", "description": "Aligns with character traits we value" },
    { "id": "uuid", "name": "Care Ethics", "description": "Prioritizes relationships and responsibilities of care" }
  ]
}
```

**SCU Lens Descriptions:**

| Lens | Key Question |
|------|-------------|
| **Rights** | Does this respect the rights and dignity of all affected parties? |
| **Justice** | Is this fair and equitable across all stakeholders? |
| **Utilitarian** | Does this produce the greatest good for the greatest number? |
| **Common Good** | Does this contribute to the well-being of the community as a whole? |
| **Virtue** | Does this reflect the character and values we aspire to? |
| **Care Ethics** | Does this honor our responsibilities to those who depend on us? |

These lenses are used by the `ethicalContextService.js` to evaluate stakes in AI decisions and generate ethical context that is injected into agent prompts when high-stakes situations are detected.

---

## Prompt Injection System

The DIGM configurations generate prompt injection text that is prepended to AI requests:

```javascript
// Example: Get combined prompt
const response = await fetch('/api/synerginexus/digm/prompt');
const { data } = await response.json();

// data.combined_prompt contains the full injection text
// data.prompts_by_layer provides per-layer breakdown
```

### Integration with Agents

When creating agent prompts, inject DIGM governance:

```javascript
async function buildAgentPrompt(agentSystemPrompt, userMessage) {
  const digm = await fetch('/api/synerginexus/digm/prompt').then(r => r.json());

  return `
    ${digm.data.combined_prompt}

    ---

    ${agentSystemPrompt}

    User: ${userMessage}
  `;
}
```

---

## Constraint Types

Principles use four constraint types:

| Type | Purpose | Example |
|------|---------|---------|
| **Prohibition** | Things AI must never do | "Never fabricate data" |
| **Requirement** | Things AI must always do | "Acknowledge uncertainty" |
| **Disclosure** | Information AI must share | "Disclose limitations" |
| **Boundary** | Limits on AI behavior | "Minimize data collection" |

---

## DIGM Touchpoints

Principles can be mapped to reasoning stages:

| Touchpoint | Stage | Description |
|------------|-------|-------------|
| `context` | 1 | Establish context and assumptions |
| `decomposition` | 2 | Break down the problem |
| `reasoning` | 3 | Step-by-step logical analysis |
| `alternatives` | 4 | Consider trade-offs |
| `synthesis` | 5 | Synthesize conclusions |

---

## Conflict Resolution Flow

1. **Detection**: Conflict logged via API or agent
2. **Routing**: Escalation rules determine resolver level
3. **Notification**: Configured channels notified
4. **Resolution**: Admin resolves with notes
5. **Auto-escalation**: If unresolved within threshold

### Severity Levels

| Level | Default Resolver | Auto-Escalate After |
|-------|------------------|---------------------|
| Low | Department Admin | 48 hours |
| Medium | Department Admin | 24 hours |
| High | System Admin | 12 hours |
| Critical | Super Admin | 4 hours |

---

## Frontend Integration

### Required Files

```html
<link rel="stylesheet" href="/css/styles.css">
<link rel="stylesheet" href="/css/help-modal.css">
<script src="https://unpkg.com/lucide@latest"></script>
<script src="/js/navigation.js"></script>
<script src="/js/help-modal.js"></script>
```

### Page Structure

```html
<div class="app-layout">
  <aside class="sidebar"></aside>
  <main class="main-container">
    <!-- Page content -->
  </main>
</div>
```

### Data Loading Pattern

```javascript
async function loadDashboard() {
  const response = await fetch('/api/synerginexus/dashboard');
  const { success, data } = await response.json();

  if (success) {
    renderDashboardCards(data);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  loadDIGM();
  loadValues();
  loadConflicts();
  loadEscalationRules();
});
```

---

## Security Considerations

### Row-Level Security (RLS)

Supabase RLS policies control access:
- Super Admins: Full access to all governance data
- System Admins: Can resolve high-severity conflicts
- Department Admins: Can manage department-specific items
- Users: Read-only access to values and principles

### Authentication

All API endpoints require valid session:
- Routes check `req.session.user`
- Unauthenticated requests return 401

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid layer` | Layer not in allowed list | Use: identity, cognitive, voice, adaptation |
| `Config not found` | Key doesn't exist | Check layer and key combination |
| `Value not found` | Invalid value UUID | Verify UUID exists |
| `description is required` | Missing required field | Include description in request |

---

## Performance Considerations

- DIGM configs are typically cached client-side
- Dashboard endpoint makes optimized aggregate queries
- Conflict queries support pagination (default: 50)
- Principles queries can filter by multiple fields

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [SynergiNexus User Guide](./synerginexus-user-guide.md) | End-user documentation |
| [Tags Technical Guide](./tags-technical-guide.md) | Tag management API |
| [Roles Technical Guide](./roles-technical-guide.md) | Role management API |
| [I360 Blueprint v3.0](../blueprints/I360%20Blueprint%20v3-0%202026-01-09.md) | Full architecture spec |
