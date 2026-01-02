# Insight 360 Blueprint v2.25

**Version:** 2.25
**Date:** January 1, 2026
**Status:** Phase 8.1 | Help System & Documentation Hub

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.25

### Help System Enhancements

Phase 8.1 introduces comprehensive documentation and an improved help system to guide users through the platform's core concepts.

#### New Documentation Guide

Created **"How To Use Insight 360"** - a comprehensive guide explaining the four building blocks:

| Component | What It Is | Analogy |
|-----------|------------|---------|
| **System Prompts** | Raw instruction text for a single chat | A sticky note |
| **Context Assets** | Reusable information (brand voice, ICPs, etc.) | A reference document |
| **Skills** | Reusable workflow templates | A recipe |
| **Agents** | AI personas that execute work | A specialist employee |

#### Architecture Explained

```
CONTEXT ASSETS          SKILLS
(the knowledge)         (the workflow)
      │                      │
      └──────────┬───────────┘
                 │
                 ▼
              AGENTS
         (the executor)
                 │
                 ▼
          CONVERSATIONS
          (the output)
```

#### Practical Workflow Example

The guide includes a complete email campaign workflow demonstrating:

1. **Context Assets Setup**
   - Brand Voice (`voice_dna`) - tone, vocabulary, personality
   - ICP Profile (`icp`) - pain points, goals, communication style

2. **Skill Creation**
   - Email Campaign Generator with instructions, required context, output format

3. **Agent Configuration**
   - Email Campaign Specialist combining skill + context mappings

4. **Repeated Use**
   - User prompts agent, which assembles brand voice + ICP + skill instructions

---

### Documentation Hub (/guides)

New dedicated page for accessing all user documentation in one place.

```
┌─────────────────────────────────────────────────────────────────────┐
│  INSIGHT 360 GUIDES                                                  │
│  Documentation & User Guides                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  GETTING STARTED                                                     │
│  ┌────────────────────┐  ┌────────────────────┐                     │
│  │ How To Use i360    │  │ Dashboard Guide    │                     │
│  │ Learn the building │  │ Navigate the       │                     │
│  │ blocks             │  │ command center     │                     │
│  └────────────────────┘  └────────────────────┘                     │
│                                                                      │
│  CORE FEATURES                                                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ Chat Guide   │ │ Agents Guide │ │ Context      │ │ Skills     │ │
│  │              │ │              │ │ Assets Guide │ │ Guide      │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
│                                                                      │
│  STRATEGIC PLANNING                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │
│  │ Parthenon    │ │ Actions      │ │ Strategy 120 │                 │
│  │ Guide        │ │ Guide        │ │ Guide        │                 │
│  └──────────────┘ └──────────────┘ └──────────────┘                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Dashboard Enhancement

Added "Getting Started" card to the main dashboard with prominent links:

```
┌─────────────────────────────────────────────────────────────────────┐
│  🚀 Getting Started                          View All Guides →      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  New to Insight 360? Learn how to build powerful AI workflows       │
│  with Context Assets, Skills, and Agents.                           │
│                                                                      │
│  [📖 Read the Guide] [Context Assets] [Skills] [Agents]             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

### UI Improvements

#### Strategy 120 Page Fixes

- Added help button to header with proper registry entry
- Added `help-modal.css` stylesheet for consistent button styling
- Added Google Fonts import for Orbitron font family
- Theme toggle now works correctly in both light/dark modes

#### Context Assets Help Button

- Moved help button from action buttons row to title row
- Now displays right-justified on same line as "Context Assets (count)"
- Cleaner visual hierarchy

```
Before:                          After:
┌────────────────────────┐      ┌────────────────────────┐
│ Context Assets (27)    │      │ Context Assets (27) [?]│
│ [Filter] [Search]      │      │ [Filter] [Search]      │
│ [Generate][↑][↓][?]    │      │ [Generate] [↑] [↓]     │
└────────────────────────┘      └────────────────────────┘
```

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `documentation/guides/how-to-use-insight-360.md` | Comprehensive user guide |
| `documentation/guides/strategy120-user-guide.md` | Strategy 120 documentation |
| `public/guides.html` | Documentation hub page |

### Modified Files

| File | Changes |
|------|---------|
| `server/routes/docs.js` | Added new docs to whitelist |
| `public/js/help-registry.js` | Added `/strategy120` entry |
| `public/strategy120.html` | Help button, CSS, fonts |
| `public/context.html` | Help button repositioned |
| `public/index.html` | Getting Started card added |
| `server/index.js` | Added `/guides` route |

---

## Architecture Overview

### Help System Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Page Load   │────▶│ HelpRegistry │────▶│ Page Config  │
│              │     │ .js          │     │ (file, title)│
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  HelpModal   │◀────│  /api/docs/  │◀────│ docs.js      │
│  .open()     │     │  {filename}  │     │ whitelist    │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │ Markdown     │
                                          │ File (.md)   │
                                          └──────────────┘
```

### Component Relationships

```
System Prompts    Context Assets    Skills         Agents
(per-conversation) (reusable info)  (workflows)   (executors)
      │                 │               │              │
      │                 └───────┬───────┘              │
      │                         │                      │
      │                         ▼                      │
      │                    ┌─────────┐                 │
      │                    │ Actions │◀────────────────┘
      │                    │ (Parthenon)               │
      │                    └─────────┘                 │
      │                         │                      │
      ▼                         ▼                      ▼
┌─────────────────────────────────────────────────────────┐
│                    CONVERSATIONS                         │
│                    (AI Execution)                        │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Reference

### When to Use What

| I want to... | Use |
|--------------|-----|
| Experiment quickly | System Prompt in Chat |
| Store reusable information | Context Asset |
| Define a repeatable workflow | Skill |
| Execute with consistent quality | Agent |
| Link to business structure (OKRs, depts) | Action |

### Key Differences

| Feature | System Prompt | Skill | Agent |
|---------|--------------|-------|-------|
| Reusable | No | Yes | Yes |
| Versioned | No | Yes | No |
| Has context mappings | No | No | Yes |
| Linked to LLM config | No | No | Yes |
| Can attach skills | No | N/A | Yes |

---

## Next Steps

- [ ] Create user guides for remaining pages (Briefing, Align 120)
- [ ] Add interactive tutorials for first-time users
- [ ] Implement search within documentation
- [ ] Add video walkthroughs for complex workflows

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.25 | Jan 1, 2026 | Help system & documentation hub |
| v2.24 | Jan 1, 2026 | User management & RBAC |
| v2.23 | Dec 31, 2025 | Strategy 120 enhancements |
| v2.22 | Dec 30, 2025 | Align 120 implementation |
