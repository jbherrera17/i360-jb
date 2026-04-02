# Insight 360 — User Interface Specification v1

**Version:** 1.0.0
**Status:** Active (Current Production System)
**Last Updated:** April 2, 2026
**Platform Version:** v2.31.0
**Author:** Taylor (UI/UX Lead), commissioned by Avery (PM Orchestrator)

---

## About This Document

This is the specification for Insight 360's user interface **as it exists today** — the v1 system running in production. It documents what is built, how it works, and how its pieces connect.

The companion document — *Design System Specification v1.0.0* (Parts 1–7) — defines the **v2 vision**: the Knowledge Navigator, two-panel architecture, command palette, 3D avatar, and voice-first interaction. That document is the future. This document is the present.

Everything described here is implemented and deployed. If the code contradicts this document, the code is authoritative.

---

# Part 1 — Architecture Overview

## 1.1 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla JavaScript (no framework), HTML5, CSS3 |
| **Styling** | Custom CSS with CSS custom properties (design tokens) |
| **Icons** | Lucide (loaded from unpkg CDN) |
| **Fonts** | Google Fonts: Source Sans 3, Orbitron, Fira Code |
| **Backend** | Node.js 18+ / Express v2.31.0 |
| **Database** | Supabase (PostgreSQL) with Row Level Security |
| **LLM Providers** | Anthropic Claude, OpenAI GPT, Perplexity |
| **Real-time** | Server-Sent Events (SSE) for streaming |
| **Hosting** | Railway (deploys from `develop` branch) |

## 1.2 Frontend Architecture

The frontend is a **multi-page application (MPA)** — each feature is a standalone HTML page that loads shared JavaScript services. There is no client-side router, no bundler, no build step. Pages are served as static files from the `public/` directory.

**Shared infrastructure is injected at runtime:**
- `navigation.js` injects the sidebar into every page
- `auth-fetch.js` provides authenticated API calls
- `modal-service/` provides the unified dialog system
- `theme-toggle.js` manages dark/light mode
- `branding-service.js` applies white-label customization

**Page-specific logic** lives in dedicated JS files (e.g., `chat.js` for chat.html, `context.js` for context.html). Most page controllers follow a state-object pattern:

```javascript
const state = { items: [], filters: {}, selectedItem: null, isLoading: false };
// Functions modify state, then call render()
```

## 1.3 Page Inventory

**84 total pages** (80 application + 4 demo/test).

| Category | Count | Key Pages |
|----------|-------|-----------|
| Core AI | 7 | chat, agents, context, skills, actions, workflows, prompt-transformer |
| Execution | 4 | execute120, agent-runner, workflow-builder, workflow-run |
| Business Modules | 9 | align120, strategy, research-studio, thought-leadership, briefing, social-media, digest, digest-sources, easy-start |
| Dashboards | 5 | index (home), company-dashboard, integrity, strategy-governance, agency-dashboard |
| Administration | 20 | administrator, admin-platform, admin-org-settings, admin-org-members, admin-departments, admin-tier-setup, admin-resource-access, admin-role-audit, etc. |
| Soul Configuration | 2 | soul-wizard, soul-configuration |
| Knowledge & Assets | 5 | open-brain, artifacts, tags, asset-types, guides |
| Support & Client | 8 | support-dashboard, support-conversations, support-settings, client-portal, client-report-viewer, client-comparison, conversation-review |
| Governance | 2 | parthenon, synerginexus |
| User | 3 | login, profile, my-capabilities |
| Roles & Structure | 1 | roles |
| Integrations | 3 | integrations, mcp-connections, admin-mcp-catalog |
| Test/Dev | 3 | modal-test, modal-test-automated, prototype-higgins2 |

**Largest pages by file size:** admin-platform.html (149K), thought-leadership.html (149K), agents.html (118K), parthenon.html (115K), admin.html (105K), admin-org-settings.html (101K).

---

# Part 2 — Layout System

## 2.1 Application Shell

Every page shares the same outer structure:

```
┌──────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌──────────────────────────────────────┐│
│ │           │ │  PAGE HEADER                         ││
│ │           │ │  Title + Subtitle    [Help] [Actions]││
│ │  SIDEBAR  │ ├──────────────────────────────────────┤│
│ │  (260px)  │ │                                      ││
│ │           │ │  CONTENT AREA                        ││
│ │  Nav      │ │  (padding: 2rem)                     ││
│ │  Groups   │ │                                      ││
│ │           │ │                                      ││
│ │           │ │                                      ││
│ │ ┌────────┐│ │                                      ││
│ │ │Profile ││ │                                      ││
│ │ │Theme   ││ │                                      ││
│ │ │Logout  ││ │                                      ││
│ │ └────────┘│ │                                      ││
│ └──────────┘ └──────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

**HTML structure:**
```html
<div class="app-container">
    <aside class="sidebar"></aside>
    <main class="main-content">
        <header class="page-header">...</header>
        <div style="padding: var(--spacing-xl);">...</div>
    </main>
</div>
```

**Key CSS classes:**

| Class | Role | Key Properties |
|-------|------|----------------|
| `.app-container` | Root flex container | `display: flex; height: 100%; overflow: hidden` |
| `.sidebar` | Fixed left nav panel | `width: 260px; position: fixed; top: 0; left: 0; height: 100vh; z-index: 100` |
| `.sidebar-collapsed` | Narrow sidebar state | `width: 72px` (icons only, text hidden) |
| `.main-content` | Scrollable content area | `flex: 1; margin-left: 260px; height: 100%; overflow-y: auto` |
| `.page-header` | Top bar with title/actions | `padding: var(--spacing-xl); display: flex; justify-content: space-between; border-bottom: 1px solid var(--border)` |
| `.page-container` | Standard content wrapper | `padding: var(--spacing-xl)` |

## 2.2 Content Layout Patterns

The platform uses four primary content layout patterns:

### Pattern A: Dashboard Grid
Used by: index.html, company-dashboard, administrator, integrity

```
┌──────────┐ ┌──────────┐ ┌──────────┐
│  Card 1  │ │  Card 2  │ │  Card 3  │
└──────────┘ └──────────┘ └──────────┘
┌──────────┐ ┌──────────┐
│  Card 4  │ │  Card 5  │
└──────────┘ └──────────┘
```

```css
.dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-lg);
    padding: var(--spacing-xl);
}
```

### Pattern B: List + Detail (Master-Detail)
Used by: agents, context, skills, actions

```
┌─────────────────────────────────────────────┐
│  FILTER TOOLBAR  [Search] [Filters] [+New]  │
├──────────────┬──────────────────────────────┤
│              │                              │
│  ITEM LIST   │  DETAIL / EDIT PANEL        │
│  (scrollable)│  (selected item)            │
│              │                              │
│  > Item 1   │  Name: ___________           │
│    Item 2   │  Type: ___________           │
│    Item 3   │  Description: ____           │
│    ...      │                              │
│              │                              │
└──────────────┴──────────────────────────────┘
```

```html
<div class="filter-toolbar">...</div>
<div style="display: flex; flex: 1; overflow: hidden;">
    <div class="asset-list-panel">
        <div class="asset-list"><!-- .asset-item * N --></div>
    </div>
    <div class="editor-panel"><!-- Detail/edit form --></div>
</div>
```

### Pattern C: Tabbed Sections
Used by: administrator, parthenon, admin-org-settings, strategy

```
┌──────────────────────────────────────────┐
│  [Tab 1]  [Tab 2]  [Tab 3]  [Tab 4]     │
├──────────────────────────────────────────┤
│                                          │
│  TAB CONTENT                             │
│  (changes per active tab)                │
│                                          │
└──────────────────────────────────────────┘
```

### Pattern D: Three-Panel
Used by: research-studio

```
┌────────────┬─────────────────┬────────────┐
│            │                 │            │
│  SOURCES   │    EDITOR       │  OUTPUTS   │
│  PANEL     │    PANEL        │  PANEL     │
│            │                 │            │
└────────────┴─────────────────┴────────────┘
```

### Pattern E: Chat
Used by: chat.html, easy-start.html

```
┌───────────────────────────┬──────────────┐
│                           │              │
│  CONVERSATION AREA        │  HISTORY     │
│  (scrollable messages)    │  PANEL       │
│                           │  (resizable) │
│                           │              │
├───────────────────────────┤              │
│  [Input] [Attach] [Send]  │              │
└───────────────────────────┴──────────────┘
```

## 2.3 Content Spacing

All content areas use `var(--spacing-xl)` (2rem / 32px) for padding. This creates equal spacing between the sidebar edge and content, and between content and the window edge.

Grid gaps between cards and sections use `var(--spacing-lg)` (1.5rem / 24px).

---

# Part 3 — Navigation System

## 3.1 Sidebar Structure

The sidebar is injected by `navigation.js` into the `<aside class="sidebar">` element on every page. It contains:

1. **Header** — Logo and "Insight 360" branding
2. **Primary nav items** — Always visible, not collapsible
3. **Grouped nav items** — Collapsible categories with chevron toggle
4. **Footer** — User profile card, theme toggle, logout

## 3.2 Navigation Hierarchy

**Primary Items (always visible):**

| Item | Icon | Path |
|------|------|------|
| Higgins | graduation-cap | /chat.html |
| My Capabilities | sparkles | /my-capabilities.html |
| Execute 120 | rocket | /execute120.html |

**AI 360 Systems** (icon: cpu)

| Item | Icon | Path |
|------|------|------|
| Agent Library | bot | /agents.html |
| Context Assets | database | /context.html |
| Actions | zap | /actions.html |
| Skills | wand-2 | /skills.html |
| Workflows | git-branch | /workflows.html |
| Prompt Transformer | file-code | /prompt-editor.html |

**Dashboards** (icon: gauge)

| Item | Icon | Path |
|------|------|------|
| Dashboard | layout-dashboard | / |
| Company Dashboard | building | /company-dashboard.html |
| Integrity Dashboard | activity | /integrity.html |
| Strategy Governance | shield-check | /strategy-governance.html |

**Modules** (icon: boxes)

| Item | Icon | Path |
|------|------|------|
| Easy Start | sparkles | /easy-start.html |
| Align 120 | compass | /align120.html |
| Strategy (S2E) | milestone | /strategy.html |
| Research Studio | book-open-text | /research-studio.html |
| Thought Leadership | lightbulb | /thought-leadership.html |
| Briefing | newspaper | /briefing.html |
| Social Media | share-2 | /social-media.html |
| AI Digest | rss | /digest.html |

**Agency** (icon: building, adminOnly: true)

| Item | Icon | Path |
|------|------|------|
| Agency Dashboard | gauge | /agency-dashboard.html |
| Customization | palette | /admin-org-customization.html |
| Portal Users | user-check | /admin-client-users.html |
| Client Comparison | bar-chart-3 | /client-comparison.html |

**Administration** (icon: settings, adminOnly: true)

| Item | Icon | Path |
|------|------|------|
| Administrator | shield | /administrator.html |
| Resource Access | shield-check | /admin-resource-access.html |
| Role Audit | file-clock | /admin-role-audit.html |
| Integrations | plug | /integrations.html |
| MCP Connections | plug-zap | /mcp-connections.html |

## 3.3 Data Sources

Navigation uses a dual-source system:

1. **Primary:** Dynamic API call to `/api/modules` — returns modules filtered by the user's subscription tier and business role
2. **Fallback:** Static `navConfig` object hardcoded in `navigation.js` — used when auth isn't available or the API fails

The API response is transformed by `convertModulesToNavConfig()` into the same structure as the static config. This means the sidebar adapts to the user's access level while maintaining a consistent experience.

## 3.4 Navigation Behavior

- **Active state:** Current page highlighted with `.nav-item.active` (indigo background, white text)
- **Collapse persistence:** Group expanded/collapsed state saved to `localStorage` key `insight360_nav_collapsed`
- **Sidebar collapse:** Full sidebar can collapse to 72px icon-only mode, persisted to `localStorage` key `insight360_sidebar_collapsed`
- **Admin filtering:** Groups with `adminOnly: true` are hidden for non-admin users
- **Deep linking:** Pages that support tabs/filters accept hash parameters (e.g., `/parthenon.html#processes?dept=Support`)
- **Impersonation:** When a platform admin impersonates another user, a banner displays at the top of the sidebar

## 3.5 Sidebar Footer

The sidebar footer contains:
- **User profile card** — Avatar (initials), name, business role
- **Theme toggle** — 56x28px switch for dark/light mode
- **Help/Support link**
- **Logout button** — Clears auth tokens and redirects to login

---

# Part 4 — Design Tokens

## 4.1 Color Palette

### Brand Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#6366f1` (Indigo) | CTAs, active states, primary actions, links |
| `--primary-dark` | `#4f46e5` | Hover states for primary elements |
| `--primary-light` | `#818cf8` | Lighter accents, secondary highlights |
| `--primary-hover` | `var(--primary-dark)` | Alias for hover state |
| `--primary-muted` | `rgba(99, 102, 241, 0.15)` | Selected states, subtle backgrounds |
| `--secondary` | `#8b5cf6` (Purple) | Secondary accents, gradient endpoints |
| `--accent` | `#06b6d4` (Cyan) | Tertiary accents |

### Semantic Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--success` | `#10b981` (Green) | Positive states, confirmations, healthy |
| `--warning` | `#f59e0b` (Amber) | Caution states, pending, attention needed |
| `--danger` | `#ef4444` (Red) | Destructive actions, errors, critical |
| `--info` | `#3b82f6` (Blue) | Informational states, neutral alerts |

### Gradients
| Token | Value | Usage |
|-------|-------|-------|
| `--gradient-primary` | `linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)` | Hero elements, feature highlights |

### LLM Provider Colors
| Provider | Dark Theme | Light Theme |
|----------|-----------|-------------|
| Claude/Anthropic | `#d97706` (amber) | `#c2410c` (deep orange) |
| OpenAI | `#10b981` (green) | `#059669` (dark green) |
| Perplexity | `#8b5cf6` (purple) | `#7c3aed` (dark purple) |

## 4.2 Theme System

Two themes are supported: **dark** (default) and **light**.

| Token | Dark | Light |
|-------|------|-------|
| `--bg-primary` | `#0f0f1a` | `#ffffff` |
| `--bg-secondary` | `#1a1a2e` | `#f8f9fa` |
| `--bg-tertiary` | `#252540` | `#e9ecef` |
| `--bg-code` | `#0d0d14` | `#f1f3f4` |
| `--bg-hover` | `rgba(99, 102, 241, 0.15)` | `rgba(99, 102, 241, 0.08)` |
| `--sidebar-bg` | `var(--bg-secondary)` | `var(--bg-secondary)` |
| `--text-primary` | `#ffffff` | `#1a1a2e` |
| `--text-secondary` | `#a0a0b0` | `#4a4a5a` |
| `--text-muted` | `#6b6b80` | `#6b6b80` |
| `--border` | `#2a2a40` | `#dee2e6` |
| `--border-light` | `#3a3a55` | `#e9ecef` |

**Implementation:**
- Theme stored in `localStorage` as `insight360-theme`
- Applied via `data-theme` attribute on `<html>` element
- CSS variables automatically switch via `html[data-theme="light"]` selector
- Toggle widget: 56x28px slider in sidebar footer

## 4.3 Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-body` | `'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | All body text, labels, descriptions |
| `--font-heading` | `'Orbitron', 'Source Sans 3', sans-serif` | Page titles, section headings, branding |
| `--font-mono` | `'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', monospace` | Code blocks, version badges, API output |

**Weight scale:** 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

**Font loading:**
```html
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&family=Orbitron:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
```

## 4.4 Spacing

| Token | Value | Common Usage |
|-------|-------|-------------|
| `--spacing-xs` | `0.25rem` (4px) | Icon-to-text gaps, inline elements |
| `--spacing-sm` | `0.5rem` (8px) | Badge padding, tight groupings |
| `--spacing-md` | `1rem` (16px) | Form group margins, default spacing |
| `--spacing-lg` | `1.5rem` (24px) | Grid gaps, card spacing |
| `--spacing-xl` | `2rem` (32px) | **Content padding standard** |
| `--spacing-2xl` | `3rem` (48px) | Large section separators |

## 4.5 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Tags, small badges, icon containers |
| `--radius-md` | `8px` | Inputs, nav items, buttons |
| `--radius-lg` | `12px` | Cards, panels, modals |
| `--radius-xl` | `16px` | Large cards, feature sections |
| `--radius-full` | `9999px` | Pill badges, avatars, circular buttons |

## 4.6 Shadows

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.05)` |
| `--shadow-md` | `0 4px 6px -1px rgba(0, 0, 0, 0.1)` |
| `--shadow-lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.1)` |
| `--shadow-xl` | `0 20px 25px -5px rgba(0, 0, 0, 0.1)` |

## 4.7 Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `--transition-fast` | `150ms ease` | Hover effects, color changes |
| `--transition-base` | `200ms ease` | Most interactions |
| `--transition-slow` | `300ms ease` | Theme transitions, panel open/close |

## 4.8 Layout Constants

| Token | Value |
|-------|-------|
| `--sidebar-width` | `260px` |
| `--header-height` | `64px` |

---

# Part 5 — Component Library

## 5.1 Buttons

| Class | Appearance | Usage |
|-------|-----------|-------|
| `.btn-primary` | Solid indigo background, white text | Primary actions, CTAs |
| `.btn-secondary` | Tertiary background, border, muted text | Secondary actions, cancel |
| `.btn-danger` | Red-tinted background, red text, red border | Destructive actions |
| `.btn-icon` | 36x36px square, border, centered icon | Icon-only actions (edit, delete, expand) |
| `.btn-sm` | Reduced padding | Compact contexts, mobile |

**Hover behaviors:**
- `.btn-primary:hover` — darkens to `--primary-dark`
- `.btn-secondary:hover` — gains primary border and text color
- `.btn-danger:hover` — inverts to solid red background, white text
- `.btn-icon:hover` — background becomes `--primary`, icon turns white

## 5.2 Forms

| Class | Element | Properties |
|-------|---------|-----------|
| `.form-group` | Container div | `margin-bottom: var(--spacing-lg)` |
| `.form-group label` | Field label | `font-size: 0.85rem; font-weight: 500; color: var(--text-secondary)` |
| `.form-input` | Text input | Full width, `padding: 0.65rem 0.85rem`, border, radius-md |
| `.form-input:focus` | Focus state | `border-color: var(--primary); outline: none` |
| `.form-textarea` | Textarea | `min-height: 80px; resize: vertical` |
| `.form-row` | Two-column layout | `grid-template-columns: 1fr 1fr; gap: var(--spacing-md)` |
| `.filter-select` | Dropdown select | Styled select matching form-input appearance |

## 5.3 Cards & Panels

| Class | Purpose | Key Properties |
|-------|---------|---------------|
| `.panel` | Section wrapper | `background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg)` |
| `.panel-header` | Panel top bar | `background: var(--bg-tertiary); border-bottom: 1px solid var(--border)` |
| `.panel-body` | Panel content | `padding: var(--spacing-lg)` |
| `.panel-footer` | Panel bottom bar | `background: var(--bg-tertiary); border-top: 1px solid var(--border)` |
| `.dashboard-card` | Grid card | Same as panel, used inside `.dashboard-grid` |
| `.card-header` | Card title | `padding: var(--spacing-md) var(--spacing-lg); border-bottom` |
| `.card-content` | Card body | `padding: var(--spacing-lg)` |

## 5.4 Status Badges

| Class | Background | Text Color |
|-------|-----------|-----------|
| `.status-badge` (base) | — | `font-size: 0.8rem; border-radius: var(--radius-full); padding: 0.25rem 0.75rem` |
| `.status-badge.status-success` | `rgba(16, 185, 129, 0.15)` | `#10b981` |
| `.status-badge.status-error` | `rgba(239, 68, 68, 0.15)` | `#ef4444` |
| `.status-badge.status-pending` / `.status-loading` | `rgba(245, 158, 11, 0.15)` | `#f59e0b` |
| `.count-badge` | `var(--primary)` | white, 24px circle |

## 5.5 Tags

```css
.tags-container {
    display: flex; flex-wrap: wrap; gap: var(--spacing-xs);
    border: 1px solid var(--border); border-radius: var(--radius-md);
    min-height: 42px; padding: var(--spacing-sm);
}
.tag {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.25rem 0.5rem; background: var(--primary);
    color: white; border-radius: var(--radius-sm); font-size: 0.8rem;
}
```

## 5.6 Asset List Items

The reusable list item pattern used across agents, context assets, skills, and other entity lists:

```html
<div class="asset-item [selected]">
    <div class="asset-icon">
        <i data-lucide="icon-name"></i>
    </div>
    <div class="asset-info">
        <div class="asset-name">Item Name</div>
        <div class="asset-meta">
            <span class="asset-version">v1.0</span>
            <span>Department</span>
            <span class="status-badge status-success">Active</span>
        </div>
    </div>
</div>
```

| Class | Properties |
|-------|-----------|
| `.asset-item` | `display: flex; padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-md); cursor: pointer` |
| `.asset-item:hover` | `background: var(--bg-tertiary)` |
| `.asset-item.selected` | `background: rgba(99, 102, 241, 0.15); border-color: var(--primary)` |
| `.asset-icon` | `36x36px; background: var(--bg-tertiary); border-radius: var(--radius-sm)` |
| `.asset-name` | `font-weight: 600; font-size: 0.9rem; white-space: nowrap; text-overflow: ellipsis` |
| `.asset-meta` | `font-size: 0.75rem; color: var(--text-muted); display: flex; gap: var(--spacing-xs)` |

## 5.7 Search & Filter Toolbar

```html
<div class="filter-toolbar">
    <input class="search-input" type="text" placeholder="Search...">
    <select class="filter-select">...</select>
    <button class="btn-primary"><i data-lucide="plus"></i> Create New</button>
</div>
```

| Class | Properties |
|-------|-----------|
| `.filter-toolbar` | `display: flex; align-items: center; gap: var(--spacing-md); padding: var(--spacing-md) var(--spacing-xl); background: var(--bg-secondary); border-bottom: 1px solid var(--border); flex-wrap: wrap` |
| `.search-input` | Full width within container, transparent background, no border |

## 5.8 Help Button

Every page includes a help button in the page header:

```html
<button class="help-btn" onclick="HelpModal.open()" title="Help">
    <i data-lucide="help-circle"></i>
</button>
```

Properties: `36x36px; border: 1px solid var(--border); background: var(--bg-secondary)`. On hover: `background: var(--primary); color: white`.

The help button opens a **resizable, draggable modal** that loads markdown documentation from the help registry. Content is fetched from `/api/docs/{filename}` and rendered as formatted HTML.

## 5.9 Toast Notifications

Transient feedback messages displayed at the top-right of the viewport:

```javascript
showToast('Operation successful', 'success');
showToast('Something went wrong', 'error');
```

Types: `success` (green), `error` (red), `warning` (amber), `info` (blue). Auto-dismiss after timeout.

## 5.10 Loading States

- **Loading spinner:** CSS animation via `loading-spinner.css` — pulse effect with small/large variants
- **Loading messages:** Rotating contextual messages via `loading-messages.js` — similar to Claude's loading indicators. Supports default and custom message sets.
- **Button loading:** Button text changes + disabled state during async operations
- **Modal loading:** `ModalService.loading()` for async page initialization

---

# Part 6 — Modal System

## 6.1 Architecture

The modal system uses a mixin-based composition pattern:

```
ModalBase (abstract)
    ├── DraggableMixin      (header drag)
    ├── ResizableMixin      (edge/corner resize handles)
    ├── FullscreenMixin     (maximize/minimize)
    └── PersistenceMixin    (position/size saved to localStorage)

Modal Types
    ├── AlertModal          (message + single button)
    ├── ConfirmModal        (yes/no with callbacks)
    ├── PromptModal         (single text input)
    ├── FormModal           (multi-field form with validation)
    ├── ContentModal        (HTML/markdown/code/image/video)
    ├── ChatModal           (conversation interface)
    ├── AgentModal          (agent execution with context assets)
    ├── CreateAssetModal    (asset creation workflow)
    ├── TransformAssetModal (asset editing with AI)
    └── DigestProgressModal (streaming progress display)
```

## 6.2 Modal Service API

| Method | Purpose |
|--------|---------|
| `ModalService.alert({title, message})` | Information display |
| `ModalService.confirm({title, message, confirmText, confirmClass})` | Binary decision |
| `ModalService.confirmDanger({title, message})` | Destructive action confirmation |
| `ModalService.prompt({title, message, placeholder})` | Single text input |
| `ModalService.form({title, fields, submitText})` | Multi-field form |
| `ModalService.content({title, content, type})` | Rich content display |
| `ModalService.chat({title, onSend})` | Chat interface |
| `ModalService.agent({agentId, title})` | Agent conversation |
| `ModalService.loading({message})` | Loading indicator |
| `ModalService.success/error/warning/info({title, message})` | Status alerts |
| `ModalService.toast(message, type)` | Transient notification |

## 6.3 Modal Features

- **Z-index stacking:** Base 1000, +10 per modal layer
- **Cascade positioning:** 30px offset per stacked modal
- **Focus trapping:** Tab key cycles within active modal
- **Keyboard:** Escape closes topmost modal
- **ARIA:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- **Viewport constraint:** Resize/drag limited to visible area
- **Theme detection:** Auto-adapts to current dark/light theme
- **Position persistence:** PersistenceMixin saves position/size to localStorage

## 6.4 CSS Classes

| Class | Purpose |
|-------|---------|
| `.i360-modal-overlay` | Full-screen semi-transparent backdrop |
| `.i360-modal-container` | Modal window (bg, border, shadow, radius) |
| `.i360-modal-header` | Title bar with close button (draggable) |
| `.i360-modal-body` | Content area (scrollable) |
| `.i360-modal-footer` | Action buttons (cancel/confirm) |
| `.i360-modal-close` | Close button (X) |

## 6.5 File Locations

| File | Size | Purpose |
|------|------|---------|
| `js/modal-service/index.js` | 19K | Central service, z-index management, keyboard handling |
| `js/modal-service/ModalBase.js` | 21K | Abstract base class, lifecycle, DOM creation |
| `js/modal-service/loader.js` | 9.2K | Dynamic loading utility |
| `js/modal-service/modal-service.css` | 52K | All modal styles |
| `js/modal-service/mixins/` | 28K total | DraggableMixin, ResizableMixin, FullscreenMixin, PersistenceMixin |
| `js/modal-service/modals/` | 221K total | 10 modal type implementations |
| `js/modal-service/utils/` | 16K total | sanitize, position, helpBanner utilities |

---

# Part 7 — Page Initialization

## 7.1 Required Script Loading Order

Every page loads scripts in this order:

```html
<head>
    <!-- 1. Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:...&display=swap" rel="stylesheet">

    <!-- 2. Core CSS -->
    <link rel="stylesheet" href="/css/styles.css">
    <link rel="stylesheet" href="/css/help-modal.css">

    <!-- 3. Page-specific CSS (if any) -->
    <link rel="stylesheet" href="/css/[page].css">

    <!-- 4. Auth (must run before navigation) -->
    <script src="/js/auth-fetch-loader.js"></script>

    <!-- 5. Navigation (auto-injects sidebar) -->
    <script src="/js/navigation.js"></script>

    <!-- 6. Icons (async) -->
    <script src="https://unpkg.com/lucide@latest"></script>
</head>
```

## 7.2 DOMContentLoaded Initialization

```javascript
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Apply theme (prevents flash)
    const savedTheme = localStorage.getItem('insight360-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // 2. Initialize navigation (sets auth token + org context)
    if (typeof initNavigation === 'function') await initNavigation();

    // 3. Initialize icons
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // 4. Load ModalService (if used)
    if (typeof ModalServiceLoader !== 'undefined') await ModalServiceLoader.load();

    // 5. Page-specific initialization (NOW safe to call authFetch)
    await initPage();
});
```

**Critical constraint:** `await initNavigation()` must complete before any `authFetch()` call. Navigation initialization sets the auth token and `x-org-id` header. Without it, API calls silently fail or return empty data.

## 7.3 Authentication Flow

`auth-fetch.js` provides `window.authFetch()` — an authenticated fetch wrapper:

- Reads JWT from `localStorage` key `insight360_token`
- Attaches `Authorization: Bearer {token}` header
- Attaches `x-org-id` header from `localStorage` key `insight360_org_id`
- On 401 response: attempts token refresh via `/api/auth/refresh`, retries original request
- If refresh fails: redirects to `/login.html`
- Proactive refresh timer: refreshes token at 80% of TTL before expiry

---

# Part 8 — Responsive Design

## 8.1 Breakpoints

| Breakpoint | Width | Classification |
|-----------|-------|---------------|
| Default | > 1024px | Desktop |
| `@media (max-width: 1024px)` | 768–1024px | Tablet |
| `@media (max-width: 768px)` | 480–768px | Mobile |
| `@media (max-width: 480px)` | < 480px | Small phone |

## 8.2 Behavior at Each Breakpoint

### Desktop (> 1024px)
- Sidebar: Fixed 260px, collapsible to 72px
- Content: Offsets by sidebar width (`margin-left: 260px`)
- Grids: Multi-column auto-fit
- Forms: Two-column where `.form-row` is used

### Tablet (768–1024px)
- Sidebar: Hidden by default, slides in as overlay (`transform: translateX(-100%)`)
- Hamburger menu visible in page header
- Mobile nav backdrop overlay (`z-index: 150`)
- Content: Full width (`margin-left: 0`)
- Body scroll locked when sidebar open (`body.mobile-nav-open`)
- Sidebar collapse button hidden (always full-width when open)

### Mobile (< 768px)
- Dashboard grid: Single column
- Form rows: Single column
- Page header: Stacks vertically (`flex-direction: column`)
- Chat header: Stacks vertically

### Small Phone (< 480px)
- Sidebar width: `min(260px, calc(100vw - 48px))`
- Page header padding normalized

## 8.3 Mobile Navigation

```
Closed:                          Open:
┌──────────────────────┐        ┌──────────┬───────────┐
│ [☰] Page Title       │        │          │░░░░░░░░░░░│
│                      │   →    │ SIDEBAR  │░BACKDROP░░│
│  Content             │        │ (260px)  │░░░░░░░░░░░│
│                      │        │          │░░░░░░░░░░░│
└──────────────────────┘        └──────────┴───────────┘
```

- Triggered by hamburger button (`#mobile-nav-toggle`)
- Backdrop click or Escape key closes sidebar
- Nav link click auto-closes sidebar
- Scrolling disabled on body while open

---

# Part 9 — Streaming & Real-Time

## 9.1 Server-Sent Events (SSE) Endpoints

The platform uses SSE for all real-time streaming operations. These endpoints bypass compression middleware.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat/stream` | POST | Multi-LLM chat streaming (token-by-token) |
| `/api/health/stream` | GET | Real-time LLM provider health status |
| `/api/briefing/generate/stream` | GET | Briefing generation progress |
| `/api/digest/generate/stream` | GET | Digest section-by-section generation |
| `/api/agents/{id}/execute/stream` | POST | Agent execution output streaming |
| `/api/align120/sessions/{id}/run-module-stream` | POST | Strategy module execution |
| `/api/easy-start/stream` | POST | Onboarding step completion |
| `/api/support/conversations/{id}/stream` | GET | Support chat streaming |
| `/api/chat/public/{widget_id}/stream` | POST | Public widget chat (unauthenticated) |
| `/api/research-studios/*` | POST | Research progress updates |

## 9.2 Frontend SSE Handling

Chat (the primary SSE consumer) handles streaming in `public/js/chat.js`:

```javascript
// Simplified pattern:
const response = await authFetch('/api/chat/stream', { method: 'POST', body: ... });
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    // Parse SSE data: lines
    // Append to message display
}
```

Streaming responses display with a rotating loading message while chunks accumulate, then render the complete response.

---

# Part 10 — API Surface

## 10.1 Route Table

51 API route groups registered in `server/index.js`:

| Path | Purpose | Streaming |
|------|---------|-----------|
| `/api/auth` | Authentication (login, register, OAuth, refresh, impersonation) | No |
| `/api/chat` | Multi-LLM chat with streaming | Yes |
| `/api/chat/public` | Widget chat (unauthenticated) | Yes |
| `/api/agents` | Agent CRUD and execution | Yes |
| `/api/context` | Context asset management | No |
| `/api/actions` | Parthenon action framework | No |
| `/api/skills` | Skills management | No |
| `/api/workflows` | Workflow orchestration | No |
| `/api/conversations` | Conversation history | No |
| `/api/prompts` | Prompt management | No |
| `/api/briefing` | Daily briefing generation | Yes |
| `/api/align120` | OKR alignment module | Yes |
| `/api/execute120` | OKR execution module | No |
| `/api/s2e` | Strategy-to-Execution pipeline | No |
| `/api/parthenon` | Parthenon governance framework | No |
| `/api/soul-config` | Soul configuration CRUD, ethics, values alignment | No |
| `/api/research-studios` | Research workspace | Yes |
| `/api/thought-leadership` | Content strategy | No |
| `/api/social` | Social media publishing | No |
| `/api/digest` | AI digest generation | Yes |
| `/api/easy-start` | Onboarding quick-start | Yes |
| `/api/open-brain` | Knowledge capture | No |
| `/api/artifacts` | Artifact storage | No |
| `/api/tags` | Tagging system | No |
| `/api/health` | LLM health monitoring | Yes |
| `/api/integrity` | Data integrity checks | No |
| `/api/governance` | Governance rules | No |
| `/api/visualizations` | Data visualization | No |
| `/api/platform` | Platform admin (tiers, modules, orgs) | No |
| `/api/platform/mcp` | MCP server management | No |
| `/api/mcp` | MCP client connections | No |
| `/api/modules` | User's accessible modules | No |
| `/api/organizations` | Organization management | No |
| `/api/org-members` | Member roster | No |
| `/api/org-customization` | White-label branding | No |
| `/api/departments` | Department management | No |
| `/api/department-strategy` | Strategic planning | No |
| `/api/business-roles` | Role definitions | No |
| `/api/roles` | Department role access | No |
| `/api/users` | User management | No |
| `/api/user-profile` | User profile | No |
| `/api/role-audit` | Role change auditing | No |
| `/api/resource-access` | Permission management | No |
| `/api/clients` | Client management | No |
| `/api/client-portal` | Client-facing views | No |
| `/api/analytics` | Agency analytics | No |
| `/api/integrations` | Integration registry | No |
| `/api/connections` | External connections | No |
| `/api/webhooks` | Webhook handling | No |
| `/api/widgets` | Widget administration | No |
| `/api/widget-conversations` | Widget conversation review | No |
| `/api/support/conversations` | Support chat | Yes |
| `/api/support/actions` | Support actions | No |
| `/api/onboarding` | Onboarding flow | No |
| `/api/models` | Available LLM models | No |
| `/api/injection` | Prompt injection detection | No |
| `/api/bugs` | Bug tracking (Notion) | No |
| `/api/docs` | Help documentation serving | No |
| `/api/pricing` | Pricing info (public) | No |
| `/blog` | Blog (public, no auth) | No |
| `/metrics` | Prometheus metrics | No |

## 10.2 Public Routes (No Auth Required)

- `/api/health`, `/api/status`
- `/api/chat/models`
- `/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/accept-invite`, `/api/auth/refresh`
- `/api/pricing`
- `/api/chat/public/{widget_id}/stream`
- `/blog`

## 10.3 Middleware Stack

Applied in order to every request:

1. **Helmet** — Security headers (CSP, HSTS, frame restrictions)
2. **Compression** — Gzip (disabled for SSE streams)
3. **CORS** — Dynamic origin validation, credentials enabled
4. **Body parser** — JSON + URL-encoded, 15MB limit
5. **Page auth** — Cookie-based auth for HTML pages
6. **Static serving** — `public/`, `documentation/`, `website/`
7. **Observability** — Correlation IDs, request logging
8. **Supabase injection** — `req.supabase` attached to all requests
9. **API auth** — Bearer token or cookie validation (skipped for public routes)
10. **Rate limiter** — 30 req/min on `/api/chat`
11. **Error logger** — Observability service
12. **Global error handler** — Catches unhandled errors

---

# Part 11 — Onboarding System

## 11.1 Two-Phase Architecture

| Phase | User | Pattern | Entry Point |
|-------|------|---------|-------------|
| 1. Platform Setup | Platform Admin (Synergi) | Wizard | `soul-wizard.html` |
| 2. Client Onboarding | Client Admin | Checklist | `administrator.html` + onboarding widget |

## 11.2 Setup Wizard (Phase 1)

The Soul Configuration Wizard (`soul-wizard.html`, powered by `setup-wizard.js`) guides platform admins through initial organization setup:

**Steps:**
1. Organization Details (required)
2. Subscription Tier (required)
3. Admin User (required)
4. Values & Ethics / Soul Config template (required)
5. Module Access (required)
6. Departments (optional — "Skip for now")
7. Starter Resources (optional)
8. Review & Complete (required)

**UI pattern:** Step numbers with connectors, active/completed states, progress indicator. Each step validates before allowing Next.

## 11.3 Onboarding Checklist (Phase 2)

After wizard completion, client admins see a checklist on their dashboard and the administrator page:

**Required:** Complete Profile, Refine Soul Config, Create Departments, Invite Team Members
**Recommended:** Upload Branding, Create First Agent, Add Context Assets
**Optional:** Configure Integrations, Have First Conversation with Higgins

Features:
- Progress bar/circle with percentage
- Auto-detection of completed items (check functions query live data)
- Clicking incomplete items navigates to the relevant page
- 100% completion triggers celebration state
- Persistent access from settings
- Doesn't block product usage before 100%

## 11.4 Easy Start

`easy-start.html` provides a conversational onboarding experience — a two-column layout with chat on the left and a live preview on the right. Powered by `easy-start.js` with SSE streaming.

---

# Part 12 — Shared JavaScript Services

## 12.1 Service Inventory

| Service | File | Size | Purpose |
|---------|------|------|---------|
| **Auth Fetch** | `auth-fetch.js` | 6.3K | Authenticated API calls, token refresh, org header |
| **Auth Fetch Loader** | `auth-fetch-loader.js` | 1.1K | Synchronous loader (ensures authFetch before DOMContentLoaded) |
| **Navigation** | `navigation.js` | 40K | Sidebar injection, nav structure, role filtering, mobile nav |
| **Theme Toggle** | `theme-toggle.js` | 1.0K | Dark/light toggle, localStorage persistence |
| **Branding Service** | `branding-service.js` | 10K | White-label customization (colors, fonts, logo, favicon) |
| **Org Switcher** | `org-switcher.js` | 5.8K | Organization context switching |
| **Session Timeout** | `session-timeout.js` | 12K | Inactivity detection, warning, auto-logout |
| **Help Modal** | `help-modal.js` | 18K | Resizable/draggable help widget, markdown rendering |
| **Help Registry** | `help-registry.js` | 12K | Page-to-documentation mapping |
| **Modal Service** | `modal-service/` | 346K total | Complete modal system (see Part 6) |
| **Agent Dialog** | `agent-dialog-service.js` | 78K | Agent conversation modal with streaming |
| **Loading Messages** | `loading-messages.js` | 7.0K | Rotating loading message display |
| **LLM Health** | `llm-health.js` | 6.4K | Provider health check polling |
| **Icon Picker** | `icon-picker.js` | 10K | Reusable icon selection with search and categories |
| **Usage Nudge** | `usage-nudge.js` | 7.1K | Usage limit warning and blocking |
| **Client Selector** | `client-selector.js` | 7.6K | Multi-tenant client context selector |
| **Chart Renderer** | `charts/chartRenderer.js` | 24K | Chart rendering engine |
| **Radar Chart** | `charts/radarChart.js` | 14K | Spider/radar chart for capabilities |

## 12.2 Page Controllers

| Page | Controller File | Size | Key Features |
|------|----------------|------|--------------|
| Chat (Higgins) | `chat.js` | 138K | Multi-LLM, SSE streaming, voice, file upload, image generation, conversation history |
| Context Assets | `context.js` | 70K | CRUD, filtering, bulk ops, AI generation, streaming |
| Research Studio | `research-studio.js` | 93K | 3-panel layout, multi-format sources, output generation |
| Agent Runner | — (inline) | 83K page | Agent execution interface |
| Dashboard | `dashboard.js` | 18K | System status, model list, LLM health |
| Admin Dashboard | `admin-dashboard.js` | 9.7K | Service monitoring |
| Setup Wizard | `setup-wizard.js` | 51K | Multi-step form with validation |
| Onboarding Wizard | `onboarding-wizard.js` | 37K | Interactive onboarding steps |
| Onboarding Checklist | `onboarding-checklist.js` | 27K | Progress tracking, auto-completion |
| Easy Start | `easy-start.js` | 17K | Conversational onboarding with streaming |
| Chat Widget | `chat-widget.js` | 41K | Embeddable standalone chat widget |

---

# Part 13 — CSS Architecture

## 13.1 File Organization

| File | Size | Scope |
|------|------|-------|
| `css/styles.css` | 54K | Master stylesheet — tokens, layout, all shared components |
| `css/theme.css` | 18K | Theme variable definitions (dark/light) |
| `css/modal-service.css` | 52K | Modal system styles |
| `css/agents.css` | 38K | Agent Library page |
| `css/context.css` | 25K | Context Assets page |
| `css/research-studio.css` | 42K | Research Studio (3-panel) |
| `css/integrity-styles.css` | 24K | Integrity Dashboard |
| `css/agent-dialog.css` | 27K | Agent Dialog modal |
| `css/help-modal.css` | 9.4K | Help modal |
| `css/easy-start.css` | 11K | Easy Start onboarding |
| `css/dashboard-styles.css` | 3.1K | Dashboard service list |
| `css/loading-spinner.css` | 3.4K | Loading animations |
| `css/icon-picker.css` | 3.6K | Icon picker |
| `css/usage-nudge.css` | 1.8K | Usage warning |

**Total CSS:** ~313K across 14 files

## 13.2 Architecture Pattern

The CSS follows a layered approach:

1. **Tokens** (`:root` variables) — Colors, spacing, typography, radius, shadows
2. **Theme overrides** (`html[data-theme="light"]`) — Light theme variable swaps
3. **Base elements** — `body`, `*`, scrollbar styles
4. **Layout** — `.app-container`, `.sidebar`, `.main-content`, `.page-header`
5. **Shared components** — `.btn-*`, `.form-*`, `.panel`, `.dashboard-card`, `.status-badge`, `.tag`
6. **Page-specific** — Separate CSS files for complex pages (agents, context, research-studio, integrity)

There is no CSS preprocessor, no CSS-in-JS, and no utility-first framework. All styles are hand-authored with CSS custom properties for theming.

---

# Part 14 — Multi-Tenant Infrastructure

## 14.1 Tenant Isolation Model

Every authenticated request carries two identity signals:

1. **JWT token** (Bearer header) — Identifies the user
2. **x-org-id header** — Identifies the organization context

The backend validates that the user is a member of the claimed organization before processing any request.

## 14.2 Frontend Pattern

```javascript
// CORRECT: Always use authFetch (attaches both token and org ID)
const data = await authFetch('/api/agents');

// WRONG: Raw fetch leaks or omits org context
const data = await fetch('/api/agents');
```

`authFetch()` automatically attaches:
- `Authorization: Bearer {token}` from `localStorage.insight360_token`
- `x-org-id: {orgId}` from `localStorage.insight360_org_id`

## 14.3 Backend Pattern

```javascript
// Route with org scoping
const { requireOrgContext } = require('../middleware/orgContext');
const { scopeToOrg } = require('../utils/orgScope');

router.get('/', requireOrgContext(supabase), async (req, res) => {
    const query = scopeToOrg(
        supabase.from('agents').select('*'),
        req.verifiedOrgId
    );
    const { data } = await query;
    res.json(data);
});
```

`scopeToOrg()` throws if `orgId` is null — no "return everything" fallback exists.

## 14.4 Subscription Tiers

| Tier | Members | Clients | Agents | Workflows |
|------|---------|---------|--------|-----------|
| Starter | 3 | 0 | 5 | 3 |
| Business | 10 | 0 | 25 | 15 |
| Enterprise | 100 | 0 | 100 | 50 |
| Agency | 50 | 100 | 200 | 100 |

Resource limits enforced by `checkResourceLimit()` middleware on creation endpoints. Module access controlled by `requireModule()` middleware.

---

# Part 15 — White-Label Branding

## 15.1 Branding Service

`branding-service.js` loads organization-specific branding at runtime from `/api/org-customization`:

| Customizable Element | How It's Applied |
|---------------------|-----------------|
| Primary color | CSS variable override on `:root` |
| Logo | Sidebar header image replacement |
| Favicon | Dynamic `<link rel="icon">` swap |
| Platform name | Text replacement in sidebar header |
| Font family | CSS variable override |
| Chat assistant name | Replaces "Higgins" label in chat UI |

Branding is loaded after navigation initialization and applied by injecting inline style overrides.

---

# Appendix A — Accessibility Status

### Currently Implemented
- Modal focus trapping (`ModalBase`)
- Modal ARIA attributes (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`)
- Escape key closes topmost modal
- High contrast ratios in both themes (4.5:1+ for body text)
- Minimum button size: 36x36px

### Not Yet Implemented
- Visible focus indicators on all interactive elements
- `aria-expanded` on collapsible nav groups
- `aria-current` on active nav item
- `prefers-reduced-motion` media query
- Screen reader testing
- Tab index management for keyboard navigation
- Alt text on all images/icons

---

# Appendix B — Known CSS Variable Pitfalls

These variable names do **not** exist in the token system. Using them produces silent failures (transparent/none rendering):

| Does Not Exist | Use Instead |
|----------------|-------------|
| `--border-color` | `--border` |
| `--card-bg` | `--bg-secondary` |
| `--text-tertiary` | `--text-muted` |
| `--primary-10` | `rgba(99, 102, 241, 0.1)` |
| `--primary-30` | `rgba(99, 102, 241, 0.3)` |
| `--info-bg` | `rgba(59, 130, 246, 0.1)` |
| `--success-bg` | `rgba(16, 185, 129, 0.1)` |
| `--danger-bg` | `rgba(239, 68, 68, 0.1)` |

---

# Appendix C — v1 vs v2 Comparison

| Aspect | v1 (This Document) | v2 (Design System Spec) |
|--------|-------------------|------------------------|
| **Navigation** | Permanent sidebar (260px, collapsible) | Command Palette (Cmd+K, no permanent sidebar) |
| **Chat** | Dedicated page (chat.html) | Two-panel architecture (Higgins Panel + Canvas) |
| **Agent presence** | Chat page only | Always-present companion OR ambient avatar on every page |
| **Higgins avatar** | Text/icon monogram | Pixar-quality 3D animated character |
| **Voice** | Not implemented | Primary interaction mode |
| **Canvas** | N/A | Polymorphic content surface (data, charts, docs, images, composite) |
| **Framework** | Vanilla JS MPA | TBD (likely component-based) |
| **Layout model** | Sidebar + content | Higgins Panel + Canvas (two-panel) |
| **Page navigation** | Sidebar links | Conversation-driven + Command Palette |
| **Module discovery** | Sidebar groups | Higgins suggestions + palette search |

---

*End of UI Specification v1*
*Documenting the system as built and deployed, April 2026*
