# Insight 360 — UI/UX Principles

**Version:** 1.0.0
**Status:** Active
**Last Updated:** April 2, 2026
**Author:** Taylor (UI/UX Lead), commissioned by Avery (PM Orchestrator)
**Authority:** This document is the definitive reference for all UI/UX decisions. The Design System Specification (Parts 1–7) defines the *vision*. This document defines the *rules*.

---

## How to Use This Document

This is a working rulebook, not a philosophy paper. Every principle here was earned — most from production incidents, client demos gone wrong, or UX debt that compounded across phases.

If you're building a new page, modifying an existing one, or reviewing a PR that touches frontend code, scan the relevant sections. If a decision contradicts something here, it needs explicit justification and JB's approval.

The principles are organized from foundational (always apply) to situational (apply in specific contexts).

---

# I. Foundational Principles

These apply to every page, every component, every interaction. No exceptions.

---

## 1. Human-First Design

Every decision starts with: **"Does this make the human's job easier?"**

The human is the person clicking buttons, reading dashboards, and configuring agents in Insight 360. Not the system. Not the architecture. Not the roadmap.

**Rules:**
- Features exist to serve the user's workflow, not to demonstrate the system's capabilities
- When a design creates tension between two user needs (simplicity vs. power), escalate — don't resolve autonomously
- The exec-level Decision Quality Criteria ranks Human Impact #1, above values alignment, strategic fit, and financial viability
- Every department translates this principle to their domain (marketing: messaging accuracy; sales: tier recommendations matching user needs; finance: pricing not gating features humans need; support: actually solving the problem; ops: never degrading UX for cost savings)

**Traces to:** Design System Principle P5 (Workflow-First), P11 (Human Directs, Agent Executes)

---

## 2. Workflow-First, Not Feature-First

Pages are organized around what the user needs to **do**, not what the system **can** do.

**The 8 Rules:**

| # | Rule | What It Means |
|---|------|---------------|
| 1 | Lead with the current task | Open on the active item (this week's article, today's briefing), not profile/settings |
| 2 | One primary CTA at a time | Show ONE contextual action based on pipeline status (Generate → Review → Publish), not a grid of 6 equal options |
| 3 | Pipeline as navigation | Make workflow steps interactive and clickable, not decorative status displays |
| 4 | Results inline, not in modals | Generated content deserves page-level presence — don't bury it in a modal that closes |
| 5 | Calendar is reference, not hero | Emphasize THIS week + next 3. Planning is secondary to execution |
| 6 | Configuration is secondary | Profile, settings, voice DNA, LLM preferences are set-once items. Don't let them compete with workflow actions |
| 7 | Status drives the UI | Show/hide sections based on pipeline state. Don't show publish options before content exists |
| 8 | Temporal hierarchy | Time-sensitive items (this week, pending reviews, deadlines) above reference material (profiles, history, settings) |

**Test:** Can the user answer "what's my next action?" within 3 seconds of landing on any page? If not, the page layout is wrong.

**Traces to:** Design System Principle P5

---

## 3. Consistency Over Cleverness

The same action looks and behaves the same way everywhere. Predictability builds trust.

**Rules:**
- A delete button is always red, always confirms, always in the same position
- "Delete" on one page is never "Remove" on another for the same action
- Primary actions are always in the same position relative to content
- Multi-step wizards use the same UI pattern for ALL steps — never mix styled cards in Step 5 with raw checkboxes in Step 6
- New interaction patterns are adopted system-wide or not at all — no one-off experiments
- Navigation patterns are identical across all modules

**Traces to:** Design System Principle P13

---

## 4. No Dead Ends

Every state the user can reach must have a clear path forward.

| State | Required Response |
|-------|-------------------|
| **Empty** | Suggest specific actions ("No agents yet. Create your first agent →") |
| **Error** | Explain what went wrong AND what to do ("Connection failed. Check your API key in Settings →") |
| **Complete** | Show what's next ("Workflow complete. View results → or Run again →") |
| **Access denied** | Explain why and where to go ("This module requires Business tier. View upgrade options →") |
| **Loading failure** | Offer a retry and an alternative path |

**Absolute rule:** No stub buttons, no "coming soon" placeholders, no blank screens. If a button exists, it must work. If a feature isn't ready, hide the button entirely. "Coming in Phase 2" notices are acceptable ONLY for entire deferred sections, never for individual buttons within an active feature.

**Traces to:** Design System Principle P9

---

## 5. Render the Final Form

Content appears as it will be used. Never show raw data, markdown source, unstyled text, or intermediate formats to users.

**Rules:**
- Generated articles render as formatted HTML, never raw markdown
- YAML front matter renders as a styled metadata block, never raw text
- Image previews appear as hero content ABOVE text, not inline or buried in metadata
- Quality feedback is actionable ("Generate the cornerstone article first, then regenerate this extension"), not just scores ("Score: 72/100")
- Data visualizations are styled and labeled, not raw chart output
- Exported content matches what the user saw on screen

**Traces to:** Design System Principle P10

---

## 6. Right Way, Not Fast Way

Quality over speed in every decision. Don't ship a pattern that works for one page if it won't work for ten.

**Rules:**
- Every new component is evaluated for reusability before adoption
- Visual shortcuts (hardcoded values, one-off styles) are treated as defects
- The design system evolves slowly and deliberately
- All changes are reviewed against the Design System Specification before shipping
- When stuck between "ship it now with hacks" and "take another day to do it right," choose right

**Traces to:** Design System Principle P14

---

# II. Layout & Spacing

---

## 7. The Standard Page Template

Every page follows this structure. No exceptions.

```html
<div class="app-container">          <!-- NEVER "app-layout" -->
    <aside class="sidebar"></aside>   <!-- Auto-populated by navigation.js -->
    <main class="main-content">
        <header class="page-header">
            <div class="header-content">
                <h1><i data-lucide="icon-name"></i> Page Title</h1>
                <p class="header-subtitle">Description</p>
            </div>
            <div class="header-actions">
                <button class="help-btn" onclick="HelpModal.open()" title="Help">
                    <i data-lucide="help-circle"></i>
                </button>
            </div>
        </header>
        <div style="padding: var(--spacing-xl);">
            <!-- Content here -->
        </div>
    </main>
</div>
```

**Non-negotiable elements:**
- `navigation.js` for sidebar (never custom nav HTML)
- Help button in every page header
- ModalService for all dialogs (never inline `<div class="modal">`, never `window.confirm()`)
- Toast notifications via `showToast()` for feedback

---

## 8. Spacing System

All spacing uses CSS variables. No magic numbers.

| Variable | Value | Use For |
|----------|-------|---------|
| `--spacing-xs` | 0.25rem (4px) | Inline element gaps, icon-to-text |
| `--spacing-sm` | 0.5rem (8px) | Tight groupings, badge padding |
| `--spacing-md` | 1rem (16px) | Default element spacing, form groups |
| `--spacing-lg` | 1.5rem (24px) | Grid gaps between cards/sections |
| `--spacing-xl` | 2rem (32px) | **Main content padding — the standard** |
| `--spacing-2xl` | 3rem (48px) | Large section separators |

**The 2rem rule:** Content padding is always `var(--spacing-xl)`. This ensures equal spacing between the sidebar and content (left), and content and window edge (right). Use `padding: var(--spacing-xl)` inline or the `.dashboard-grid` class (which includes it).

**Grid gaps** between cards and sections: `gap: var(--spacing-lg)` (1.5rem).

---

## 9. CSS Variable Discipline

Use the defined token system. Never invent variables or use raw values.

### Correct Variable Names

| Category | Variables |
|----------|-----------|
| **Backgrounds** | `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-code`, `--bg-hover` |
| **Text** | `--text-primary`, `--text-secondary`, `--text-muted` |
| **Borders** | `--border`, `--border-light` |
| **Colors** | `--primary`, `--primary-dark`, `--primary-light`, `--secondary`, `--accent` |
| **Semantic** | `--success`, `--warning`, `--danger`, `--info` |
| **Radius** | `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (12px), `--radius-xl` (16px), `--radius-full` |
| **Shadows** | `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl` |
| **Transitions** | `--transition-fast` (150ms), `--transition-base` (200ms), `--transition-slow` (300ms) |

### Common Mistakes (These Variables Do NOT Exist)

| Wrong | Use Instead |
|-------|-------------|
| `--border-color` | `--border` |
| `--card-bg` | `--bg-secondary` |
| `--text-tertiary` | `--text-muted` |
| `--primary-10` | `rgba(99, 102, 241, 0.1)` |
| `--primary-30` | `rgba(99, 102, 241, 0.3)` |
| `--info-bg` | `rgba(59, 130, 246, 0.1)` |
| `--success-bg` | `rgba(16, 185, 129, 0.1)` |
| `--danger-bg` | `rgba(239, 68, 68, 0.1)` |

Undefined CSS variables silently fail — they render as transparent/none with no error. This is insidious. Always verify your variable names against the token list.

---

# III. Component Standards

---

## 10. Icons: Lucide Only

- **Lucide** is the sole icon library. Load via `https://unpkg.com/lucide@latest`
- Syntax: `<i data-lucide="icon-name"></i>`
- Size override: `style="width:28px;height:28px;"` for header icons
- Call `lucide.createIcons()` after DOM updates
- **Never use emojis** in UI elements — not in buttons, not in badges, not in nav items
- Store icon names as strings in the database (e.g., "compass", "shield")
- Icon picker pattern: text input + live preview + clickable chip grid

---

## 11. Modal System (ModalService)

All dialogs go through ModalService. This is the only sanctioned dialog system.

**Loading:**
```html
<script src="/js/modal-service-loader.js"></script>
```

**Available Methods:**

| Method | Use Case |
|--------|----------|
| `ModalService.confirm()` | Binary yes/no decisions |
| `ModalService.alert()` | Information display |
| `ModalService.form()` | Multi-field data entry |
| `ModalService.content()` | Markdown/HTML/code/image/video display |
| `ModalService.chat()` | Conversational interface |
| `ModalService.agent()` | Agent interaction with file attachment |
| `ModalService.loading()` | Async data fetch indicator |
| `ModalService.success/error/warning/info()` | Status notifications |
| `ModalService.confirmDanger()` | Destructive action confirmation |
| `ModalService.toast()` | Transient notifications |

**Rules:**
- Edit/form modals MUST include `resizable: true` — users need to resize for content-heavy forms
- Never use inline HTML modals (`<div class="modal">`)
- Never use `window.confirm()` or `window.alert()`
- Always `await ModalServiceLoader.load()` before first ModalService call

**Modal Features (built-in):**
- Z-index stack management (base 1000, +10 per modal)
- Focus trapping + Escape to close
- ARIA: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- Drag and resize support
- Light/dark theme auto-detection

---

## 12. Buttons

**Variants:**

| Class | Use For | Visual |
|-------|---------|--------|
| `.btn-primary` | Primary actions, CTAs | Indigo bg, white text |
| `.btn-secondary` | Secondary actions, cancel | Tertiary bg, border |
| `.btn-danger` | Destructive actions | Red-tinted bg, red text |
| `.btn-icon` | Icon-only buttons | 36x36px, centered icon, border |
| `.btn-sm` | Compact variants | Reduced padding |

**Rules:**
- Destructive actions (`.btn-danger`) always require confirmation via `ModalService.confirmDanger()`
- Primary button is singular per context — one primary CTA, not three
- Always include `title=""` attribute on icon-only buttons for accessibility
- Minimum touch target: 36x36px (44x44px preferred per WCAG)

---

## 13. Status Badges

```css
.status-badge                    /* Base: 0.8rem font, pill shape */
.status-badge.status-success     /* Green: rgba(16, 185, 129, 0.15) bg */
.status-badge.status-error       /* Red: rgba(239, 68, 68, 0.15) bg */
.status-badge.status-loading     /* Amber: rgba(245, 158, 11, 0.15) bg */
```

**Rule:** Color is never the sole indicator of state. Always pair with text or an icon.

---

## 14. Forms

**Structure:**
```html
<div class="form-group">
    <label>Field Label</label>
    <input class="form-input" type="text" />
</div>
```

**Available classes:** `.form-group`, `.form-input`, `.form-textarea`, `.form-row` (2-column grid), `.filter-select`

**Rules:**
- Labels above inputs, always
- `form-input:focus` shows `--primary` border, no outline
- Textarea minimum height: 80px, `resize: vertical`
- Two-column layouts use `.form-row` (CSS Grid)
- Validation messages appear inline, immediately below the field

---

## 15. Cards & Panels

| Class | Use For |
|-------|---------|
| `.panel` | Section wrapper — `--bg-secondary`, border, `--radius-lg` |
| `.panel-header`, `.panel-body`, `.panel-footer` | Panel sections with appropriate spacing |
| `.dashboard-card` | Dashboard metric cards — `--bg-secondary`, overflow hidden |
| `.dashboard-grid` | Auto-fit grid: `repeat(auto-fit, minmax(300px, 1fr))` |

**Rule:** A card is a card everywhere. Same border radius, same background, same shadow depth. No one-off card styles.

---

# IV. Data Display Standards

---

## 16. Structured Display Formatting

All dynamically rendered text must be properly formatted. Never dump raw or unstyled content.

**Minimum requirements:**

| Data Shape | Required Pattern |
|------------|-----------------|
| **Key-value pairs** | Label/value rows with `flex` + `space-between` or `grid` alignment |
| **Lists of items** (departments, tags, roles) | Pill/tag components with `flex-wrap` — never concatenated plain text |
| **Sections** | Bordered containers with uppercase muted headers to separate groups |
| **Review summaries** | Each group in a visual container, structured rows, pills for collections |

**Anti-pattern (what NOT to do):**
```
❌ "ExecutiveOperationsLitigationClient Advisory"  (concatenated text)
❌ Raw bold label followed by unstyled inline text
❌ CSS classes with no corresponding styles
```

**Rule:** If a CSS class has no corresponding styles defined, use inline styles with CSS variables rather than shipping unstyled markup. Silent CSS failures look broken.

---

## 17. Loading & Error States

**Loading:**
- Long-running operations (>3 seconds) need a persistent, visible loading indicator with step-by-step progress
- Use `ModalService.loading()` for async page loads
- Don't rely on button text changes or subtle spinners
- Show what's happening: "Analyzing 12 context assets..." not just a spinner

**Errors:**
- Every error state offers a next step
- Image generation failed? → "Retry Image" button
- Quality gate failed? → Show what to fix and how
- API error? → Explain cause and remedy, not just "Something went wrong"
- Include the context: which operation, what went wrong, what the user can do

**Traces to:** Design System Principle P12 (Transparency of Process)

---

# V. Navigation & Information Architecture

---

## 18. Direct Navigation

When linking users to another page, take them directly to the exact place they can act. Never dump them at a generic landing page.

**Rules:**
- Use hash params and query strings to deep-link to specific tabs and filters (e.g., `/parthenon.html#processes?dept=Support`)
- Prefer inline editing or modals over full page navigation — keep the user in context
- If a cross-page link is necessary, include all context (tab, filter, selected item) in the URL
- Implement `handleDeepLink()` on any page with tabs/filters
- Pattern reference: Parthenon page supports `#tabName?dept=DeptName` deep links

---

## 19. Navigation System

**Sidebar (Current Implementation):**
- Auto-populated by `navigation.js` — never write custom nav HTML
- Dynamic data source: `/api/modules` API with static fallback config
- Role-based visibility filters (adminOnly, category-based access)
- Collapsible nav groups with localStorage persistence
- Mobile: slide-out drawer with backdrop overlay at ≤1024px

**Command Palette (Higgins 2.0 Vision):**
- Summoned via `Cmd+K` / `Ctrl+K`, avatar click, or voice
- Replaces permanent sidebar with on-demand navigation
- Includes: Higgins suggestions, module grid, recent pages, quick actions
- See Design System Specification §2.2.5 for full spec

**Admin Dashboard:**
- Every admin-managed page must have a tile on `administrator.html`
- Cross-check: nav panel and admin dashboard must be consistent
- User-facing features (Higgins, Execute 120) don't need admin tiles

---

## 20. Page Initialization Order

This order is mandatory. Race conditions here cause silent data loading failures.

```javascript
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Theme (visual flash prevention)
    const savedTheme = localStorage.getItem('insight360-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // 2. Navigation (sets auth token + org context)
    if (typeof initNavigation === 'function') await initNavigation();

    // 3. Icons
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // 4. NOW safe to make API calls
    await loadPageData();
});
```

**Critical:** `await initNavigation()` must complete BEFORE any `authFetch()` call. Without this, the auth token and `x-org-id` header aren't set, and API calls silently return empty data.

---

# VI. Theming

---

## 21. Dark/Light Theme System

**Implementation:**
- Attribute-based: `data-theme="dark"` or `data-theme="light"` on `<html>`
- Persistence: `localStorage.getItem('insight360-theme')`, default: `'dark'`
- Toggle: 56x28px switch in sidebar footer
- Transition: `var(--transition-slow)` (300ms) on color changes

**Color Architecture:**

| Layer | Dark | Light |
|-------|------|-------|
| Background primary | `#0f0f1a` | `#ffffff` |
| Background secondary | `#1a1a2e` | `#f8f9fa` |
| Background tertiary | `#252540` | `#e9ecef` |
| Text primary | `#ffffff` | `#1a1a2e` |
| Text secondary | `#a0a0b0` | `#4a4a5a` |
| Text muted | `#6b6b80` | `#6b6b80` |
| Border | `#2a2a40` | `#dee2e6` |

**Rule:** All color references must use CSS variables — never hardcode hex values. This ensures theme switching works automatically.

**Provider colors** (consistent in both themes):
- Claude/Anthropic: Amber/Orange
- OpenAI: Green
- Perplexity: Purple

---

# VII. Typography

---

## 22. Font System

| Purpose | Font | Fallbacks |
|---------|------|-----------|
| Body text | Source Sans 3 | -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif |
| Headings | Orbitron | Source Sans 3, sans-serif |
| Code/mono | Fira Code | SF Mono, Monaco, Cascadia Code, monospace |

**Load via Google Fonts:**
```html
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&family=Orbitron:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
```

**Weight usage:**
- 300: Light accents, metadata
- 400: Body text
- 500: Labels, form labels, nav items
- 600: Subheadings, emphasis
- 700: Page titles, primary headings

---

# VIII. Onboarding & Wizards

---

## 23. Two-Phase Onboarding Pattern

| Phase | Target User | Pattern | Purpose |
|-------|-------------|---------|---------|
| 1 | Platform Admin | Wizard | Initial org setup (required steps first, linear flow) |
| 2 | Client Admin | Checklist | Post-setup refinement (grouped by priority, persistent) |

### Wizard Rules
- Maximum 8 steps
- Required steps cannot be skipped; optional steps have "Skip for now"
- Always include "Review & Complete" as final step
- Redirect to relevant page after completion
- Show visual progress indicator (Step X of Y)
- Validate each step before allowing Next
- **Visual consistency:** Every step uses the same UI pattern — if one step uses cards with borders/highlights, ALL selection-type steps must match

### Checklist Rules
- Group items: **Required** / **Recommended** / **Optional**
- Required items must complete to unlock org ("You're Ready!" state)
- Show completion percentage with progress bar/circle
- Clicking incomplete items navigates to the relevant page
- Auto-detect completion (check functions evaluate live data)
- Celebrate milestones (100% = confetti/congratulations)
- Persistent and always accessible from settings
- Don't block product usage until 100% — get to "good enough" fast

---

# IX. Multi-Tenant & Security

---

## 24. Data Scoping Rules

Every page, every API call, every database query must be scoped to the requesting user's organization. Cross-org data leakage is a security incident.

**Frontend:**
- Always use `authFetch()` — never raw `fetch()` for `/api/*` calls
- Include `auth-fetch-loader.js` in `<head>`, before other scripts
- Do NOT rely on `navigation.js` to load auth-fetch (async race condition)

**Backend:**
- Use `requireOrgContext` middleware on all org-scoped routes
- Use `scopeToOrg()` for all database queries
- NEVER write "return everything" fallbacks when `orgId` is null — fail the request
- Validate ownership on `/:id` endpoints

**Anti-patterns (will be flagged in code review):**
```javascript
// BAD: Returns all data when orgId is null
if (orgId) { query.eq('org_id', orgId); }

// BAD: Raw fetch without auth
fetch('/api/agents')

// GOOD: Scoped and authenticated
authFetch('/api/agents')
```

---

# X. Content Generation UX

---

## 25. AI-Generated Content Standards

When the platform generates content (articles, emails, reports, images), these rules apply:

1. **Render in final form** — HTML, not markdown. Styled metadata block, not raw YAML.
2. **Image first** — Hero preview ABOVE content tabs. Don't bury visuals in metadata.
3. **Actionable quality feedback** — Tell the user WHAT TO DO, not just what score they got. "Generate the cornerstone article first (Week 1), then regenerate this extension" > "Cornerstone Link: failed"
4. **Unmistakable loading state** — 60-90 second AI generation needs a persistent indicator with step-by-step progress. Not just a button text change.
5. **Preview matches publish** — What the user sees should closely match what gets published.
6. **No dead-end errors** — Every error offers a next step (Retry, alternative path, explanation of what to fix).

---

# XI. Accessibility

---

## 26. Accessibility Standards

**Target:** WCAG AA minimum compliance.

**Current Implementation:**
- Modal focus trapping and ARIA labels (`role="dialog"`, `aria-modal`, `aria-labelledby`)
- Dark/light theme with high contrast ratios (4.5:1+ for body text)
- Minimum button size: 36x36px

**Required for All New Work:**
- Interactive target size: 44x44px minimum (28x28px absolute floor)
- Color contrast: 4.5:1 for body text, 3:1 for large text and UI components
- Color is never the sole indicator of state — always pair with shape, icon, or text
- All interactive elements keyboard navigable with visible focus indicators
- `aria-expanded` on collapsible groups
- `aria-current` on active nav items
- `prefers-reduced-motion` respected (no auto-playing animations)
- All images and icons have appropriate alt text or ARIA labels

**Traces to:** Design System Principle P4

---

# XII. Responsive Design

---

## 27. Breakpoints

| Breakpoint | Target | Key Changes |
|-----------|--------|-------------|
| > 1440px | Desktop large | Full two-panel layout (Higgins + Canvas) |
| 1024–1440px | Desktop | Standard layout, sidebar visible |
| 768–1024px | Tablet | Sidebar becomes slide-out drawer, grids adjust |
| < 768px | Mobile | Single column, stacked header, full-width content |
| < 480px | Phone | Sidebar constrained to `min(260px, calc(100vw - 48px))` |

**Mobile navigation:**
- Hidden by default (`translateX(-100%)`)
- Hamburger menu button visible
- Full-width overlay with backdrop
- Body scroll locked when open (`body.mobile-nav-open`)

**Grid responsiveness:**
```css
/* Default: auto-fit with 300px minimum */
.dashboard-grid { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }

/* Mobile: single column */
@media (max-width: 768px) { .dashboard-grid { grid-template-columns: 1fr; } }
```

---

# XIII. Pre-Flight Verification

---

## 28. Before Declaring Any Page Complete

This checklist is mandatory. If any item is unchecked, the page is not done.

### Visual & UX
- [ ] Page follows the standard template (app-container, sidebar, page-header, help button)
- [ ] Content padding is `var(--spacing-xl)` (2rem)
- [ ] All data loads from APIs — nothing hardcoded
- [ ] Every button is functional (no stubs, no "coming soon")
- [ ] All cross-page links work (no 404s)
- [ ] Loading states are visible and descriptive
- [ ] Error states include actionable guidance
- [ ] Empty states suggest specific actions
- [ ] Multi-step flows are visually consistent across all steps
- [ ] Dynamic text is properly formatted (pills for lists, structured rows for key-values)

### Infrastructure
- [ ] `authFetch()` for all API calls (never raw `fetch`)
- [ ] `await initNavigation()` before any API call
- [ ] ModalService for all dialogs
- [ ] Help button opens documentation
- [ ] Admin-managed pages have tiles on `administrator.html`
- [ ] Module registered in `platform_modules` with all fields
- [ ] Role access seeded in `role_module_access`
- [ ] Route uses `requireModule()` middleware

### Documentation
- [ ] User guide in `documentation/guides/`
- [ ] Entry in `public/js/help-registry.js`
- [ ] Filename in `ALLOWED_DOCS` array in `server/routes/docs.js`

### Testing
- [ ] Server starts without errors
- [ ] Module appears in sidebar navigation
- [ ] Page loads and displays data
- [ ] Non-admin users can access (role access works)
- [ ] Dark and light themes both render correctly
- [ ] Mobile breakpoint doesn't break layout

---

# XIV. The Knowledge Navigator Vision

---

## 29. Design North Star

Everything above serves a larger purpose. Insight 360 is building toward Apple's 1987 Knowledge Navigator — a personalized AI collaborator for every organization.

**What this means for UI/UX:**
- **Higgins is the primary interface**, not the sidebar. Conversation is navigation. The user expresses intent; the system composes the response.
- **The Canvas is polymorphic** — it displays whatever Higgins produces: data views, visualizations, documents, images, or composite content assembled from multiple sources.
- **Soul Config is the personality engine** — every org gets an AI collaborator infused with their values, vision, voice, and domain expertise.
- **The interface restructures around intent** — Higgins doesn't just fill a chat panel. He surfaces visualizations, opens pages, assembles data, connects workflows.
- **Human directs, agent executes** — the user always has authority. Higgins proposes, the user disposes.

Every principle in this document serves this vision. The pages we build today are the foundation for the conversational, agent-directed experience we're building toward.

---

*End of UI/UX Principles — Taylor, UI/UX Lead*
*Commissioned by Avery, PM Orchestrator*
*Approved by JB Herrera, Product Owner*
