# Context Assets for PM Agent Team

This document defines the context assets that support the PM agent team.
Each agent receives only the assets relevant to its task via injection modes.

## Shared Context Assets (All Agents)

### 1. Platform Access Model
**Asset Type:** `custom_processes`
**Injection Mode:** `always` (priority: 90)
**Max Tokens:** 1500

```json
{
  "title": "Insight 360 Access Model",
  "subscription_tiers": {
    "starter": { "members": 3, "agents": 5, "workflows": 3 },
    "business": { "members": 10, "agents": 25, "workflows": 15 },
    "enterprise": { "members": 100, "agents": 100, "workflows": 50 },
    "agency": { "members": 50, "clients": 100, "agents": 200, "workflows": 100 }
  },
  "role_hierarchy": ["owner", "admin", "manager", "member"],
  "access_layers": [
    "Organization membership roles",
    "Business role levels (strategic, operational, tactical)",
    "Subscription tier gates",
    "Module-level access checks (requireModule middleware)",
    "Row Level Security (database-enforced)"
  ],
  "key_middleware": "server/middleware/moduleAccess.js",
  "key_function": "can_access_module(user_id, module_id, org_id)"
}
```

### 2. Codebase Architecture
**Asset Type:** `terminology`
**Injection Mode:** `always` (priority: 85)
**Max Tokens:** 2000

```json
{
  "title": "Insight 360 Architecture Reference",
  "stack": "Node.js 18+ / Express / Supabase (PostgreSQL) / Vanilla JS frontend",
  "entry_point": "server/index.js",
  "key_directories": {
    "server/routes/": "31 route files — API endpoints",
    "server/services/": "25 service files — business logic, LLM wrappers",
    "server/middleware/": "Auth, module access, rate limiting",
    "public/": "34 HTML pages, vanilla JS, Lucide icons",
    "public/js/": "Frontend logic — chat.js, context.js, navigation.js",
    "public/css/": "styles.css (theme system), help-modal.css",
    "db/": "85+ SQL migration files (phase-numbered)",
    "documentation/": "Blueprints, guides, roadmap"
  },
  "key_patterns": {
    "multi_tenancy": "Org -> Department -> User hierarchy with RLS",
    "agent_department_mapping": "Junction table department_agents (many-to-many)",
    "context_injection": "Token-budgeted, priority-ordered, conditional injection",
    "streaming": "SSE for chat responses, compression skips SSE",
    "reliability": "Circuit breaker, retry with backoff, timeout wrappers",
    "modals": "ModalService — never inline HTML modals",
    "navigation": "navigation.js — never custom nav HTML"
  },
  "deploy": {
    "target": "Railway",
    "branch": "develop (NOT main)",
    "main_branch_status": "stale (Phase 3) — historical only"
  }
}
```

### 3. Active Constraints
**Asset Type:** `custom_processes`
**Injection Mode:** `always` (priority: 80)
**Max Tokens:** 1000

```json
{
  "title": "Active Product Constraints",
  "known_issues": [
    "Soul config DB trigger has race condition — completeness is one update behind",
    "AI Digest has no automatic background scheduling yet",
    "Admin digest module route registered but not implemented",
    "Documentation can drift from migration files — always verify"
  ],
  "technical_debt": [
    "Some roadmap phase numbering is non-linear vs migration naming",
    "chat.js is 46KB — needs decomposition",
    "context.js is 67KB — needs decomposition",
    "styles.css is 43KB — needs theme extraction"
  ],
  "conventions_to_follow": [
    "Use ModalService for all dialogs — never window.confirm or inline modals",
    "Use navigation.js for sidebar — never custom nav HTML",
    "Use Lucide icons — never emojis in UI",
    "All new pages need help button registered in help-registry.js",
    "All new user guides must be whitelisted in docs.js ALLOWED_DOCS"
  ]
}
```

## Agent-Specific Context Assets

### 4. Product Roadmap (Spec Writer, Orchestrator)
**Asset Type:** `custom_processes`
**Injection Mode:** `on_demand` (priority: 70)
**Max Tokens:** 2000
**Trigger Keywords:** ["roadmap", "phase", "planned", "upcoming", "priority", "backlog"]

```json
{
  "title": "Product Roadmap Snapshot",
  "current_version": "v3.63",
  "current_phase": "Phase 65 (documented), Phases 66-68 in progress",
  "active_work": {
    "phase_66": "AI Digest — schema and docs present",
    "phase_67": "Digest Discovery — in progress",
    "phase_68": "Tags Organization Scoping — in progress"
  },
  "note": "This snapshot may be stale. Always verify against documentation/Roadmap/ files and db/phase*.sql for current state."
}
```

### 5. Module Registry (Spec Writer, QA Analyst)
**Asset Type:** `terminology`
**Injection Mode:** `on_demand` (priority: 75)
**Trigger Keywords:** ["module", "access", "tier", "permission", "gate"]

```json
{
  "title": "Platform Module Registry",
  "core_modules": [
    "chat", "agents", "context_management", "skills",
    "workflows", "actions", "briefing", "research_studio",
    "align120", "strategy120", "execute120",
    "integrity_dashboard", "soul_configuration",
    "parthenon", "ai_digest"
  ],
  "admin_modules": [
    "admin_platform", "admin_tier_setup", "admin_resource_access",
    "admin_mcp_catalog"
  ],
  "access_check_pattern": "requireModule('module_key') middleware in route files"
}
```

### 6. Test Infrastructure (QA Analyst)
**Asset Type:** `custom_processes`
**Injection Mode:** `always` (priority: 85)
**Max Tokens:** 1000

```json
{
  "title": "Test Infrastructure",
  "framework": "Jest (unit + integration), Playwright (e2e)",
  "commands": {
    "unit_and_integration": "npm test",
    "e2e": "npm run test:e2e",
    "single_file": "npm test -- __tests__/unit/services/{file}.test.js",
    "lint": "npm run lint"
  },
  "directories": {
    "unit": "__tests__/unit/",
    "integration": "__tests__/integration/",
    "e2e": "__tests__/e2e/",
    "setup": "__tests__/setup/"
  },
  "coverage_threshold": "50%",
  "test_app": "__tests__/setup/testApp.js — creates isolated Express app for integration tests"
}
```

### 7. Documentation Map (Docs Sync)
**Asset Type:** `terminology`
**Injection Mode:** `always` (priority: 85)
**Max Tokens:** 1000

```json
{
  "title": "Documentation Map",
  "locations": {
    "roadmap": "documentation/Roadmap/",
    "blueprints": "documentation/blueprints/",
    "user_guides": "documentation/guides/*-user-guide.md",
    "technical_guides": "documentation/guides/*-technical-guide.md",
    "design_docs": "documentation/design/"
  },
  "help_system": {
    "registry": "public/js/help-registry.js",
    "docs_route": "server/routes/docs.js",
    "whitelist": "ALLOWED_DOCS array in docs.js"
  },
  "naming_convention": {
    "user_guides": "{page-name}-user-guide.md",
    "technical_guides": "{page-name}-technical-guide.md"
  }
}
```

### 8. Stakeholder Profiles (Release Coordinator, Orchestrator)
**Asset Type:** `personas`
**Injection Mode:** `on_demand` (priority: 60)
**Trigger Keywords:** ["stakeholder", "communicate", "update", "announce", "launch"]

```json
{
  "title": "Stakeholder Communication Guide",
  "audiences": {
    "leadership": {
      "format": "Decision-ready summary with tradeoffs table",
      "tone": "Direct, data-backed, options-oriented",
      "avoid": "Preamble, jargon, unquantified claims"
    },
    "engineering": {
      "format": "Acceptance criteria first, then context",
      "tone": "Specific, linked to files/routes",
      "avoid": "Ambiguity, vague scope, missing edge cases"
    },
    "admins": {
      "format": "What changes, what to do, what users see",
      "tone": "Step-by-step, operational",
      "avoid": "Internal jargon, assumed knowledge"
    },
    "end_users": {
      "format": "What's new, why it matters, how to use it",
      "tone": "Clear, benefit-focused",
      "avoid": "Technical details, internal references"
    }
  }
}
```

## How to Create These in Insight 360

To register these as context assets in the platform:

```
POST /api/context/assets
{
  "name": "{asset title}",
  "asset_type": "{type from above}",
  "description": "{one-line description}",
  "content_json": { ... },
  "content_text": "{markdown version for injection}",
  "tags": ["pm-agent", "avery-team"],
  "visibility": "team"
}
```

Then map them to the appropriate agent:

```
POST /api/agents/{agent_id}/context-mappings
{
  "asset_id": "{asset UUID}",
  "injection_mode": "{always | on_demand | conditional}",
  "trigger_keywords": [...],
  "priority": {0-100},
  "max_tokens": {number},
  "is_required": {true | false}
}
```
