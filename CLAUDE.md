# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Insight 360 is a values-based AI command center and multi-LLM orchestration platform. It provides agent management, context injection, integrity metrics, workflow automation, and the Parthenon governance framework.

**Tech Stack:** Node.js 18+ / Express, Supabase (PostgreSQL), Anthropic Claude, OpenAI GPT, Perplexity

## Commands

```bash
npm start           # Production server (port 3000)
npm run dev         # Development with nodemon auto-reload
npm test            # Run Jest test suite
npm test -- --watch # Watch mode for tests
npm run lint        # ESLint validation
npm run lint -- --fix # Auto-fix lint issues
```

## Architecture

### Server Structure (`server/`)

**Entry Point:** `server/index.js` (v2.31.0) - Express app with Helmet CSP, CORS, compression, cookie auth

**Routes (31 files in `server/routes/`):**
- `chat.js` - Multi-LLM chat with streaming (SSE)
- `agents.js` - Agent CRUD and execution
- `actions.js` - Parthenon action framework
- `context.js` - Context asset management
- `align120.js`, `strategy120.js`, `execute120.js` - Strategy-to-Execution pipeline
- `skills.js` - Agent skills management
- `briefing.js` - Daily briefing generation
- `workflows.js` - Workflow engine operations

**Services (25 files in `server/services/`):**
- `anthropic.js`, `openai.js`, `perplexity.js` - LLM API wrappers with circuit breaker
- `llmRegistry.js` - Centralized model definitions and capabilities
- `agentService.js` - Agent execution engine
- `contextInjection.js` - Runtime context assembly with token budgeting
- `reliability.js` - Retry logic, circuit breaker (CLOSED → OPEN → HALF_OPEN), timeout wrappers
- `notionService.js` - Notion API integration
- `workflowEngine.js` - YAML/JSON workflow execution

### Frontend (`public/`)

Vanilla JavaScript architecture with 34 HTML pages. Key files:
- `js/chat.js` (46KB) - Multi-model chat UI with streaming
- `js/context.js` (67KB) - Context asset management UI
- `js/navigation.js` - Sidebar and routing
- `css/styles.css` (43KB) - Main stylesheet with theme system

### Database (`db/`)

85+ SQL migration files with progressive schema evolution:
- `schema.sql` - Core tables (users, agents, conversations, messages)
- `phase3-schema.sql` through `phase25-schema.sql` - Feature-specific extensions
- `seed.sql` - Initial data including starter agents

Core tables use Row Level Security (RLS) for multi-tenancy.

### Tests (`__tests__/`)

Jest with 50% coverage threshold. Test structure:
- `unit/` - Service and middleware tests (8 files)
- `integration/` - Route tests (7 files)
- `setup/jest.setup.js` - Test configuration

Run a single test file:
```bash
npm test -- __tests__/unit/services/anthropic.test.js
```

## Key Patterns

### Multi-LLM Orchestration
Models are registered in `llmRegistry.js` with capabilities (vision, streaming, function calling). Services in `anthropic.js`/`openai.js` implement provider-specific logic with automatic fallback.

### Context Injection
`contextInjection.js` assembles runtime context with:
- Token-aware budgeting
- Priority-based ordering
- Conditional injection rules
- ReDoS-safe regex validation

### Reliability
`reliability.js` provides:
- `withRetry()` - Exponential backoff with configurable attempts
- `CircuitBreaker` - Prevents cascade failures
- `withTimeout()` - Request timeout wrapper

### Streaming Responses
Chat uses Server-Sent Events (SSE). Compression middleware skips SSE streams. Frontend handles `data:` events in `public/js/chat.js`.

### Enterprise Multi-Tenancy (Phase 44)

The platform supports a complete multi-tenant architecture with subscription tiers and module-based access control.

**Hierarchy Structure:**
```
Synergi (Platform Owner)
    └── Organizations (Clients/Agencies)
            ├── Departments
            │       └── Users (with business roles)
            └── Clients (for Agency tier only)
```

**Subscription Tiers:**
| Tier | Members | Clients | Agents | Workflows | Key Features |
|------|---------|---------|--------|-----------|--------------|
| Starter | 3 | 0 | 5 | 3 | Basic modules only |
| Business | 10 | 0 | 25 | 15 | +Align120, Research Studio, TL |
| Enterprise | 100 | 0 | 100 | 50 | +SSO, Priority Support |
| Agency | 50 | 100 | 200 | 100 | +White-label, Client Portal |

**Key Database Tables (Phase 44):**
- `subscription_tiers` - Tier definitions with limits and features
- `platform_modules` - Module definitions with tier/role requirements
- `org_module_access` - Per-org module overrides
- `platform_admins` - Synergi super-admin users
- `role_module_access` - Role-to-module mapping

**Helper Functions:**
- `can_access_module(user_id, module_id, org_id)` - Check module access
- `get_user_modules(user_id, org_id)` - Get accessible modules
- `check_org_limits(org_id, resource_type)` - Check resource limits
- `is_platform_admin(user_id)` - Check platform admin status

**Routes:**
- `/api/platform/*` - Platform admin operations (tiers, modules, admins, orgs)
- `/api/modules` - User's accessible modules for dynamic navigation

**Middleware (`server/middleware/moduleAccess.js`):**
```javascript
// Protect routes by module
const { requireModule } = createModuleAccessMiddleware(supabase);
router.get('/research', requireModule('research_studio'), handler);

// Check resource limits before creation
const { checkResourceLimit } = createModuleAccessMiddleware(supabase);
router.post('/', checkResourceLimit('agents'), handler);

// Require platform admin
const { requirePlatformAdmin } = createModuleAccessMiddleware(supabase);
router.get('/stats', requirePlatformAdmin(), handler);
```

**Admin Pages:**
- `admin-platform.html` - Platform admin dashboard (Synergi only)
- `admin-tier-setup.html` - Tier configuration and limits

## Frontend Development Guidelines

**IMPORTANT:** When creating or modifying HTML pages in `public/`, follow these patterns for consistency:

### Required Components for New HTML Pages

1. **Navigation Panel** - Always include the sidebar navigation:
   ```html
   <script src="js/navigation.js"></script>
   ```
   And add the nav container in body:
   ```html
   <nav id="sidebar" class="sidebar"></nav>
   ```

2. **Modal Service** - Always use ModalService for dialogs (never inline HTML modals):
   ```html
   <script src="js/modal-service-loader.js"></script>
   ```

   **Usage Examples:**
   ```javascript
   // Confirmation dialog
   const confirmed = await ModalService.confirm({
       title: 'Delete Item',
       message: 'Are you sure you want to delete this item?',
       confirmText: 'Delete',
       confirmClass: 'btn-danger'
   });

   // Form dialog
   const result = await ModalService.form({
       title: 'Add New Item',
       fields: [
           { name: 'name', label: 'Name', type: 'text', required: true },
           { name: 'type', label: 'Type', type: 'select', options: [...] }
       ],
       submitText: 'Create'
   });

   // Alert dialog
   await ModalService.alert({
       title: 'Success',
       message: 'Operation completed successfully'
   });
   ```

3. **Toast Notifications** - Use showToast() for feedback:
   ```javascript
   showToast('Operation successful', 'success');
   showToast('Something went wrong', 'error');
   ```

### Standard HTML Template Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title - Insight 360</title>
    <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&family=Orbitron:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/styles.css">
    <link rel="stylesheet" href="/css/help-modal.css">
    <script src="/js/navigation.js"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body>
    <div class="app-container">
        <aside class="sidebar"></aside>

        <main class="main-content">
            <header class="page-header">
                <div class="header-content">
                    <h1>
                        <i data-lucide="icon-name" style="width:28px;height:28px;color:var(--primary);"></i>
                        Page Title
                    </h1>
                    <p class="header-subtitle">Page description goes here</p>
                </div>
                <div class="header-actions">
                    <button class="help-btn" onclick="HelpModal.open()" title="Help">
                        <i data-lucide="help-circle"></i>
                    </button>
                    <!-- Additional action buttons -->
                </div>
            </header>

            <!-- Content with 2rem padding (use existing classes or inline) -->
            <div style="padding: var(--spacing-xl);">
                <!-- Page content -->
            </div>
        </main>
    </div>

    <script src="/js/modal-service-loader.js"></script>
    <script src="/js/help-modal.js"></script>
    <script src="/js/help-registry.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', async () => {
            const savedTheme = localStorage.getItem('insight360-theme') || 'dark';
            document.documentElement.setAttribute('data-theme', savedTheme);
            if (typeof initNavigation === 'function') await initNavigation();
            if (typeof lucide !== 'undefined') lucide.createIcons();
            // Initialize page...
        });
    </script>
</body>
</html>
```

### Content Spacing Rules (Critical for Consistency)

All pages must follow these spacing standards:

1. **App Container**: Wrap everything in `<div class="app-container">` (NOT `app-layout`)

2. **Page Header**: Use `padding: var(--spacing-xl)` (2rem) - this is automatic with `.page-header` class

3. **Content Area**: Apply 2rem padding to content sections:
   - Use `padding: var(--spacing-xl)` inline, OR
   - Use `.dashboard-grid` class (includes 2rem padding), OR
   - Wrap content in a div with the padding

4. **Spacing Variables**:
   - `--spacing-xs`: 0.25rem (4px)
   - `--spacing-sm`: 0.5rem (8px)
   - `--spacing-md`: 1rem (16px)
   - `--spacing-lg`: 1.5rem (24px)
   - `--spacing-xl`: 2rem (32px) - **Use for main content padding**
   - `--spacing-2xl`: 3rem (48px)

5. **Grid Gaps**: Use `gap: var(--spacing-lg)` (1.5rem) between cards/sections

This ensures equal 2rem spacing between:
- The sidebar and content (left side)
- The content and window edge (right side)

### Do NOT Use
- Inline `<div class="modal">` HTML - use ModalService instead
- Direct `window.confirm()` or `window.alert()` - use ModalService
- Custom navigation HTML - use navigation.js

### Help Button (Required for All Pages)

Every page must include a help button and documentation:

1. **Include help modal CSS and JS:**
   ```html
   <link rel="stylesheet" href="/css/help-modal.css">
   <script src="/js/help-modal.js"></script>
   <script src="/js/help-registry.js"></script>
   ```

2. **Add help button in page header:**
   ```html
   <div class="header-actions">
       <button class="help-btn" onclick="HelpModal && HelpModal.open()" title="Help">
           <i data-lucide="help-circle"></i>
       </button>
       <!-- other header buttons -->
   </div>
   ```

3. **Register page in help-registry.js:**
   ```javascript
   // In public/js/help-registry.js, add entry:
   '/your-page': {
       file: '/api/docs/your-page-user-guide.md',
       title: 'Your Page Help'
   }
   ```

## Page Documentation Requirements

**IMPORTANT:** When creating a new HTML page, you MUST also create documentation:

### 1. User Guide (Required)
Create `documentation/guides/{page-name}-user-guide.md` with:

```markdown
# {Page Name} User Guide

**For:** Insight 360 Users
**Last Updated:** {Date}

---

## Why {Feature} Is Important
Brief explanation of the value this feature provides.

---

## What It Does
| Action | Description |
|--------|-------------|
| **Action 1** | What it does |
| **Action 2** | What it does |

---

## Step by Step Use

### Task 1
1. Step one
2. Step two
3. Step three

### Task 2
1. Step one
2. Step two

---

## Tips & Best Practices
- Tip 1
- Tip 2

---

## Troubleshooting
| Issue | Solution |
|-------|----------|
| Problem 1 | How to fix |
| Problem 2 | How to fix |
```

### 2. Technical Guide (Recommended for Complex Features)
Create `documentation/guides/{page-name}-technical-guide.md` with:
- Architecture overview
- Database schema details
- API endpoints
- Component interactions
- Security considerations

### 3. Register in Help System
Add entry to `public/js/help-registry.js` so the help button works.

### 4. Whitelist in Docs Route
Add the new user guide filename to the `ALLOWED_DOCS` array in `server/routes/docs.js`:
```javascript
// In server/routes/docs.js, add to ALLOWED_DOCS array:
'your-page-user-guide.md',
```
This whitelist is required for security - the docs API will return 404 for files not in this list.

### 5. Higgins Context Integration
User guides are automatically available to Higgins (chat.html) via the `/api/docs/` endpoint, enabling AI-assisted help for users. Write guides with clear, searchable language.

## Environment Variables

Required in `.env` (see `.env.example`):
```
PORT=3000
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...    # Required for admin operations
ANTHROPIC_API_KEY=...       # At least one LLM key required
OPENAI_API_KEY=...
ALLOWED_ORIGINS=http://localhost:3000
```

Optional: `BRAVE_SEARCH_API_KEY`, `TAVILY_API_KEY`, `PERPLEXITY_API_KEY`, `GOOGLE_API_KEY`

## Database Setup

In Supabase SQL Editor:
1. Run `db/schema.sql`
2. Run phase schemas as needed (`phase3-schema.sql` through `phase44-enterprise-multitenancy.sql`)
3. Run `db/seed.sql` for starter agents

**Phase 44 Migration:** Run `db/phase44-enterprise-multitenancy.sql` to enable:
- Subscription tiers with resource limits
- Module-based access control
- Platform admin roles
- Dynamic navigation based on tier/role

## Documentation

Versioned blueprints in `documentation/blueprints/` (v2.8 through v3.8). Current version: v3.8 "Chronicle" covering 26 development phases.
