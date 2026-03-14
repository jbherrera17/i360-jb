# Insight 360 Blueprint v2.26

**Version:** 2.26
**Date:** January 2, 2026
**Status:** Phase 8.2 | Navigation Redesign & UI Consistency

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.26

### Navigation Redesign

Phase 8.2 introduces a completely redesigned sidebar navigation with collapsible category groups for improved organization and usability.

#### Collapsible Navigation Groups

The sidebar navigation now organizes pages into logical categories that can be expanded/collapsed:

```
┌─────────────────────────────────────┐
│  INSIGHT 360                        │
├─────────────────────────────────────┤
│  📊 Dashboard                       │  ← Primary (always visible)
│  💬 Multi-LLM Chat                  │
│  🤖 Agent Library                   │
├─────────────────────────────────────┤
│  ▼ Dashboards                       │  ← Collapsible Groups
│    ├─ Company                       │
│    ├─ Governance                    │
│    └─ Integrity                     │
│  ▼ Strategy                         │
│    ├─ Align 120                     │
│    ├─ Strategy (S2E)                │
│    └─ Strategy 120                  │
│  ▼ Components                       │
│    ├─ Context Assets                │
│    ├─ Actions                       │
│    ├─ Skills                        │
│    └─ Prompt Transformer            │
│  ▼ Tools                            │
│    ├─ Parthenon                     │
│    ├─ Briefing                      │
│    └─ Guides                        │
│  ▼ Administration (Admin only)      │
│    └─ User Management               │
├─────────────────────────────────────┤
│  🌙 Toggle Theme                    │  ← Theme toggle in sidebar
└─────────────────────────────────────┘
```

#### Features

| Feature | Description |
|---------|-------------|
| **Persistent State** | Collapse/expand state saved in localStorage |
| **Auto-expand** | Groups auto-expand when containing active page |
| **Role-based Visibility** | Admin group only visible to admin users |
| **Theme Toggle** | Moved from page headers to sidebar footer |

---

### Centralized Theme Management

Theme toggle functionality has been consolidated into `navigation.js` for consistent behavior across all pages.

```javascript
// navigation.js now handles all theme management
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('insight360-theme', newTheme);
    updateThemeToggleIcon();
}

// Theme applied before DOMContentLoaded to prevent flash
(function() {
    const savedTheme = localStorage.getItem('insight360-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();
```

**Migration:**
- Removed `theme-toggle.js` script references from all pages
- Replaced with `navigation.js` for unified navigation and theme handling
- Removed individual theme toggle buttons from page headers

---

### Consistent Page Headers

All dashboard and standard pages now use a consistent header pattern based on company-dashboard.html:

```html
<header class="page-header">
    <div class="header-content">
        <h1>Page Title</h1>
        <p class="header-subtitle">Page description</p>
    </div>
    <div class="header-actions">
        <button class="help-btn" onclick="HelpModal.open()" title="Help">
            <i data-lucide="help-circle"></i>
        </button>
        <!-- Optional action buttons -->
    </div>
</header>
```

#### Pages Updated

| Page | Changes |
|------|---------|
| `index.html` | Standardized header structure |
| `company-dashboard.html` | Reference implementation |
| `integrity.html` | Standardized header |
| `strategy-governance.html` | Replaced custom `.governance-header` |
| `guides.html` | Standardized header |
| `parthenon.html` | Added missing page header |
| `skills.html` | Changed `<div>` to `<header>` |
| `actions.html` | Changed `<div>` to `<header>` |
| `prompt-editor.html` | Added header-content wrapper |
| `strategy.html` | Standardized header |
| `strategy120.html` | Standardized header |
| `align120.html` | Standardized header |
| `admin.html` | Standardized header structure |

#### Tool Pages (Specialized Layouts)

These pages maintain their specialized layouts due to their unique requirements:
- `agents.html` - Three-panel agent management interface
- `chat.html` - Chat interface with conversation header
- `context.html` - Context Assets tool layout
- `briefing.html` - Briefing generation interface

---

### LLM Registry Enhancement

Added centralized LLM registry for consistent model management across the application.

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM REGISTRY                              │
├─────────────────────────────────────────────────────────────┤
│  Anthropic                                                   │
│  ├─ claude-3-5-sonnet-20241022                              │
│  ├─ claude-3-5-haiku-20241022                               │
│  └─ claude-3-opus-20240229                                  │
├─────────────────────────────────────────────────────────────┤
│  OpenAI                                                      │
│  ├─ gpt-4o                                                  │
│  ├─ gpt-4o-mini                                             │
│  ├─ gpt-4-turbo                                             │
│  └─ o1 / o1-mini / o1-pro                                   │
├─────────────────────────────────────────────────────────────┤
│  Perplexity                                                  │
│  ├─ llama-3.1-sonar-small-128k-online                       │
│  ├─ llama-3.1-sonar-large-128k-online                       │
│  └─ llama-3.1-sonar-huge-128k-online                        │
└─────────────────────────────────────────────────────────────┘
```

**New Endpoints:**
- `GET /api/chat/models` - Returns models grouped by provider
- `GET /api/chat/models/all` - Flat list for agent configuration dropdowns

---

### Perplexity Integration

Added Perplexity AI as a third LLM provider with built-in web search capabilities.

```javascript
// server/services/perplexity.js
const perplexity = {
    chat: async ({ message, model, systemPrompt, history }) => { ... },
    streamChat: async function* ({ message, model, systemPrompt, history }) { ... }
};
```

**Features:**
- Native web search integration
- Citation extraction from responses
- Streaming support
- Compatible with existing chat infrastructure

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `server/services/llmRegistry.js` | Centralized LLM model configuration |
| `server/services/perplexity.js` | Perplexity AI service integration |
| `documentation/guides/onboarding-guide.md` | New user onboarding documentation |

### Modified Files

| File | Changes |
|------|---------|
| `public/js/navigation.js` | Collapsible groups, theme toggle |
| `public/css/styles.css` | Navigation group styles |
| `server/routes/chat.js` | LLM registry integration |
| `server/index.js` | Perplexity route support |
| All HTML pages | Consistent headers, navigation.js |

---

## Architecture Overview

### Navigation Configuration

```javascript
const navConfig = {
    primary: [
        { href: '/', icon: 'layout-dashboard', label: 'Dashboard' },
        { href: '/chat.html', icon: 'message-square', label: 'Multi-LLM Chat' },
        { href: '/agents.html', icon: 'bot', label: 'Agent Library' }
    ],
    groups: [
        { id: 'dashboards', label: 'Dashboards', items: [...] },
        { id: 'strategy', label: 'Strategy', items: [...] },
        { id: 'components', label: 'Components', items: [...] },
        { id: 'tools', label: 'Tools', items: [...] },
        { id: 'admin', label: 'Administration', adminOnly: true, items: [...] }
    ]
};
```

### LLM Provider Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Chat UI     │────▶│  chat.js     │────▶│  LLM         │
│  (model      │     │  (route)     │     │  Registry    │
│   selector)  │     └──────────────┘     └──────────────┘
└──────────────┘              │                   │
                              ▼                   ▼
                    ┌──────────────┐     ┌──────────────┐
                    │  Provider    │◀────│  getProvider │
                    │  Selection   │     │  ()          │
                    └──────────────┘     └──────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌──────────┐   ┌──────────┐   ┌──────────────┐
       │ Anthropic │   │  OpenAI  │   │  Perplexity  │
       │ Service   │   │  Service │   │  Service     │
       └──────────┘   └──────────┘   └──────────────┘
```

---

## Quick Reference

### CSS Classes for Page Headers

| Class | Purpose |
|-------|---------|
| `.page-header` | Container for page header |
| `.header-content` | Wraps title and subtitle |
| `.header-subtitle` | Secondary description text |
| `.header-actions` | Container for action buttons |
| `.help-btn` | Help button styling |

### Navigation localStorage Keys

| Key | Purpose |
|-----|---------|
| `insight360_nav_collapsed` | Object with group collapse states |
| `insight360-theme` | Current theme ('dark' or 'light') |
| `insight360_user` | User data including role |

---

## Next Steps

- [ ] Add keyboard navigation support for sidebar
- [ ] Implement sidebar collapse for mobile/tablet
- [ ] Add transition animations for group expand/collapse
- [ ] Create unit tests for LLM registry

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.26 | Jan 2, 2026 | Navigation redesign, UI consistency, Perplexity integration |
| v2.25 | Jan 1, 2026 | Help system & documentation hub |
| v2.24 | Jan 1, 2026 | User management & RBAC |
| v2.23 | Dec 31, 2025 | Strategy 120 enhancements |
| v2.22 | Dec 30, 2025 | Align 120 implementation |
