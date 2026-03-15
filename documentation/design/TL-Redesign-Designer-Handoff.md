# Thought Leadership UI Redesign — Designer Handoff

**Project:** Insight 360 — Phase 75: "This Week" Focused Experience
**Date:** March 15, 2026
**Prepared by:** Avery (PM Orchestrator) with inputs from Quinn (Metrics), Taylor (UI/UX), Reese (Spec)
**For:** UI/UX Designer

---

## 1. Executive Summary

The Thought Leadership module needs a UX restructuring. The current page shows 7 sections at equal visual weight on a single scrolling page. Users report it's "comprehensive but confusing." The redesign separates **weekly execution** (95% of visits) from **configuration** (5% of visits).

**The core insight:** The user's weekly task is simple — "generate this week's content package and publish it." The interface should reflect this simplicity.

**North star metric:** Time from page load to published package. Target: under 3 minutes (current flow: estimated 10-15 minutes across multiple interactions).

---

## 2. Current State (What's Wrong)

The user currently sees all 7 sections at once when they land on the page:

```
┌──────────────────────────────────────────┐
│ 1. Setup Wizard (4 steps)                │  ← Only for first-time users
│ 2. Your Position + AI Visibility Score   │  ← Rarely changes (monthly)
│ 3. Content Pillars                       │  ← Rarely changes (quarterly)
│ 4. Content Calendar (month grid)         │  ← Reference, not action
│ 5. Weekly Pipeline (6 steps, HARDCODED)  │  ← The actual workflow
│ 6. Publish (4 target toggles)            │  ← Part of the workflow
│ 7. Quick Actions (5 cards)               │  ← Duplicates pipeline steps
└──────────────────────────────────────────┘
```

**Problems identified:**
1. No clear primary action — everything competes for attention
2. Weekly Pipeline is static (hardcoded "Week of January 13, 2026" — doesn't know what week it is)
3. Calendar doesn't connect to the pipeline (clicking an entry doesn't start generation)
4. Quick Actions duplicate pipeline steps
5. Setup infrastructure always visible even when unchanged for months
6. No "this week" context — user must mentally recall their planned topic
7. Publish is disconnected from the generation flow
8. 45-90 second generation time has no progress indication

---

## 3. Proposed Design: Two Modes

### Mode 1: "This Week" (Default — 95% of visits)

This is what the user sees when they land on the page. It answers one question: **"What do I need to do this week?"**

```
┌──────────────────────────────────────────────────────────┐
│  Thought Leadership                          [?] [⚙]    │
│  Week 11 of 52 · March 16, 2026                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ THIS WEEK'S CONTENT ─────────────────────────────┐  │
│  │                                                    │  │
│  │  Building Trust Between Teams and Their            │  │
│  │  AI Tools                                          │  │
│  │                                                    │  │
│  │  ┌──────────────┐  ┌──────────────┐               │  │
│  │  │ Pillar       │  │ Format       │               │  │
│  │  │ Human-       │  │ Medium       │               │  │
│  │  │ Aligned      │  │ 1000-1500    │               │  │
│  │  │ Intelligence │  │ words        │               │  │
│  │  └──────────────┘  └──────────────┘               │  │
│  │  Theme: Human-AI Collaboration (March)             │  │
│  │  Cornerstone: AI in Service of Humanity (#3)       │  │
│  │  Type: Extension (week 3 of 4 in series)           │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ GENERATE ─────────────────────────────────────────┐  │
│  │                                                    │  │
│  │  ● Image API    ● Notion    ● Social    ○ Substack │  │
│  │    GPT Image 1.5  Connected   3 platforms  Not set │  │
│  │                                                    │  │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐      │  │
│  │  │ ✓  │ │    │ │    │ │    │ │    │ │    │      │  │
│  │  │Topic│ │Rsch│ │Art.│ │Img │ │LI  │ │Pub │      │  │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘      │  │
│  │                                                    │  │
│  │  Estimated time: ~90 seconds                       │  │
│  │                                                    │  │
│  │       [  Generate This Week's Package  ]           │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ RESULTS (appears after generation) ───────────────┐  │
│  │                                                    │  │
│  │  ✓ Article    1,247 words      [Preview] [Edit]   │  │
│  │  ✓ AI Version Structured       [Preview]           │  │
│  │  ✓ Image      Professional     [Preview] [Regen]  │  │
│  │  ✓ LinkedIn   5 posts Mon-Fri  [Preview]           │  │
│  │                                                    │  │
│  │  Publish to: ☑ Blog  ☑ Notion  ☑ Social  ☐ Sub.  │  │
│  │                                                    │  │
│  │          [  Publish Package  ]                      │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ UPCOMING ─────────────────────────────────────────┐  │
│  │  ▪ Wk12  The Hierarchy of AI Assistance             │  │
│  │         Short · Practical · Apr 1                    │  │
│  │  ▪ Wk13  Why Misaligned AI Creates Drift            │  │
│  │         Long · Cornerstone · Apr 8                   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ RECENT ───────────────────────────────────────────┐  │
│  │  ✓ Wk10  Human-in-the-Loop Imperative   Published  │  │
│  │  ✓ Wk9   AI in Service of Humanity      Published  │  │
│  │  ✓ Wk8   The Alignment Audit            Published  │  │
│  │  ○ Wk7   Stated Values vs Stress Values Draft      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Mode 2: "Settings" (Behind gear icon — 5% of visits)

```
┌──────────────────────────────────────────────────────────┐
│  Thought Leadership Settings            [← Back]  [?]   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [Position] [Pillars] [Calendar] [Visibility]            │
│  [Publishing & Integrations]                             │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Tab content area:                                       │
│                                                          │
│  - Position: Core thesis, atomic claim, edit buttons     │
│  - Pillars: Pillar cards grid, add/edit/delete           │
│  - Calendar: Full 52-week editorial calendar view        │
│    (annual theme, quarterly pillars, monthly themes,     │
│     weekly entries with edit capability)                  │
│  - Visibility: AI visibility score + research runner     │
│  - Publishing & Integrations: Image model preference,    │
│    default publish targets, Substack credentials,        │
│    Notion sync config, Postiz config, social connections │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Generation Progress State

During the 45-90 second generation, the Generate card transforms into a progress view:

```
┌─ GENERATING ──────────────────────────────────────────┐
│                                                        │
│  Building Trust Between Teams and Their AI Tools       │
│                                                        │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│  │ ✓  │ │ ✓  │ │ ◉  │ │    │ │    │ │    │          │
│  │Topic│ │Rsch│ │Art.│ │Img │ │LI  │ │Pub │          │
│  │ 0s  │ │ 0s │ │25s │ │    │ │    │ │    │          │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘          │
│                                                        │
│  ◉ Generating article... (step 3 of 5)                │
│  ████████████░░░░░░░░░░░░░░  ~45 seconds remaining    │
│                                                        │
│  Usually takes about 90 seconds for a full package.    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Step states:**
- Empty circle: Not started
- Spinning/pulsing circle (◉): In progress (with elapsed time)
- Green check (✓): Completed (with elapsed time)
- Red X: Failed (with retry button)

---

## 5. Empty States

### No Calendar Entry for This Week
```
┌─ THIS WEEK'S CONTENT ─────────────────────────────────┐
│                                                        │
│  ┌─────────────────────────────────────────┐           │
│  │         (calendar icon, muted)          │           │
│  │                                         │           │
│  │  No content planned for Week 11         │           │
│  │                                         │           │
│  │  Set up your editorial calendar to      │           │
│  │  plan weekly content in advance.        │           │
│  │                                         │           │
│  │  [Go to Calendar Settings]              │           │
│  └─────────────────────────────────────────┘           │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### First-Time User (No Profile)
Shows the existing 4-step Setup Wizard (unchanged). After completing setup, transitions to "This Week" view.

### No Recent Weeks
```
RECENT
  No content published yet. Generate your first
  package above to start your publishing streak.
```

---

## 6. Interaction Specifications

### Generate Flow
1. User lands on page → "This Week" card auto-populated from editorial calendar
2. Pre-flight dots load automatically (ambient — no button click needed)
3. User clicks **"Generate This Week's Package"**
4. Button disabled, progress view appears with step-by-step animation
5. Steps run sequentially: Article → AI Optimization → Image → LinkedIn Posts
6. Each step shows elapsed time and updates the step indicator
7. If a step fails: step shows red X with **[Retry]** button; completed steps preserved
8. On completion: Results card appears with preview/edit/regen options
9. User clicks **[Preview]** → ModalService dialog with rendered content
10. User clicks **[Edit]** → ModalService dialog with textarea, save updates the article
11. User clicks **"Publish Package"** → publishes to all checked targets
12. Per-target results shown inline (green check with link, or red X with error)

### Settings Flow
1. User clicks gear icon (⚙) in header
2. Page transitions to Settings mode (same URL, no page load)
3. Tab bar appears with 5 tabs
4. Active tab content loads below
5. User clicks **"← Back to This Week"** → returns to default view

### Week Navigation
- Clicking a week in "Upcoming" or "Recent" loads that week's content into the "This Week" card
- This allows generating/publishing past or future weeks from the same interface
- Current week is visually highlighted in both lists

---

## 7. Design Principles

These 12 principles govern all workflow-focused modules in Insight 360. They should be treated as platform-wide UX standards.

### Principle 1: Primary Action Prominence
> The most common task should be the most visible element on the page.

If 95% of visits are to perform one action, that action gets the largest button, the highest position, and the most visual weight. "What do I do here?" should be answered in under 2 seconds.

### Principle 2: Configuration vs. Execution Separation
> Setup happens once; execution happens repeatedly. Don't show both at the same weight.

Move all configuration behind a Settings panel. The main view is for doing the thing, not configuring the thing. Configuration changes are infrequent and should feel like a deliberate detour, not a distraction.

### Principle 3: Smart Context
> The system should know what the user needs before they tell it.

Use dates, calendars, schedules, and user history to pre-populate the interface. Never ask the user to provide information the system already has. If it's Week 11 and the calendar says the topic is "Building Trust Between Teams and Their AI Tools," show that immediately.

### Principle 4: Progressive Disclosure
> Show what's needed now. Reveal more when asked.

Default to the minimum interface for the current task. Advanced options, historical data, and configuration are one click away but not cluttering the primary view. Modals for detail, inline for summary.

### Principle 5: Ambient Status
> Integration health should be visible without requiring an action.

Show status indicators that update automatically on page load. Green/yellow/red indicators tell the user at a glance what's ready. **Critical rule:** Never rely on color alone — always include text labels or icons alongside colored indicators (WCAG compliance).

### Principle 6: One-Click Workflows
> Multi-step processes should be wrapped in single actions with inline progress.

If a workflow has 4 sequential steps that always run together, present them as one button. Show progress for transparency, but don't require interaction at each step. **Caveat:** Always provide a way to retry individual steps if one fails.

### Principle 7: Results Inline
> Don't navigate away to see what you just created.

Generated content, publish results, and error messages appear in the same view where the action was taken. Modal previews for detail, but the summary stays on the page.

### Principle 8: Streak Visibility
> Show users their momentum and consistency.

For recurring workflows, show the publishing streak — how many consecutive weeks they've published. Recent entries with status (Published, Draft, Skipped) create a visual pattern that motivates consistency. Recommended for recurring workflow modules.

### Principle 9: Graceful Degradation
> If one part fails, the rest should still work.

Publishing to 4 targets where 1 fails should not block the other 3. Generating 4 content types where 1 fails should preserve the other 3. Always show what succeeded alongside what failed.

### Principle 10: Pre-flight Before Commitment
> Check everything before the user invests time.

Before a long-running workflow, verify that all required integrations, credentials, and data are available. Don't let the user wait 90 seconds only to discover Notion is down.

### Principle 11: Undo/Retry Granularity
> If step 3 of 4 fails, let the user retry step 3 — not re-run steps 1-2.

Failed steps show individual retry buttons. Completed steps are preserved. The user should never lose work because of a downstream failure.

### Principle 12: Time Expectation Setting
> Long-running operations should show estimated time and progress.

Any operation taking more than 5 seconds needs a progress indicator. Operations over 30 seconds need estimated time remaining. Users need to know whether to wait or come back.

---

## 8. Component Inventory

### Existing i360 Components to Reuse
| Component | Current Location | Use In Redesign |
|-----------|-----------------|-----------------|
| `.pipeline-steps` with step icons | thought-leadership.html line 1806 | Pipeline progress in Generate card |
| `.preflight-item` with status dots | thought-leadership.html line 1853 | Ambient integration status |
| `.publish-targets` toggle cards | thought-leadership.html line 1861 | Publish target selection in Results card |
| `.btn-primary` large CTA | styles.css | "Generate This Week's Package" button |
| `ModalService.form()` | modal-service-loader.js | Article preview and edit dialogs |
| `showToast()` | styles.css / navigation.js | Success/error notifications |
| `.page-header` with subtitle | styles.css | Header with week context |

### New Components Needed
| Component | Description | Design Notes |
|-----------|-------------|-------------|
| **Content Card** | Shows this week's topic, pillar, theme, format, cornerstone | Card with pillar color accent, metadata in label-value pairs |
| **Generate Card** | Pre-flight status + pipeline + CTA button | Transforms into progress view during generation |
| **Results Card** | Per-step results with preview/edit/regen actions | Appears after generation, includes publish section |
| **Week Row** | Compact row for upcoming/recent lists | Left border color from pillar, title, format badge, status indicator |
| **Progress Step** | Individual step in the generation pipeline | 4 states: empty, in-progress (spinning), complete (check), failed (X with retry) |
| **Tab Bar** (Settings) | 5-tab navigation for settings mode | Horizontal tabs, underline active state, responsive to accordion on narrow screens |

---

## 9. Color & Typography Reference

### From styles.css
```css
/* Colors */
--primary: #6366f1;        /* Buttons, active states */
--success: #10b981;        /* Published, completed, ready */
--warning: #f59e0b;        /* Degraded, expiring, beta */
--danger: #ef4444;         /* Failed, unavailable, errors */
--text-muted: varies;      /* Secondary text, labels */
--bg-secondary: varies;    /* Card backgrounds */
--bg-tertiary: varies;     /* Nested card backgrounds */
--border: varies;          /* Card borders */

/* Typography */
--font-body: 'Source Sans 3';
--font-heading: 'Orbitron';

/* Spacing */
--spacing-sm: 0.5rem;      /* Inside compact elements */
--spacing-md: 1rem;         /* Standard gaps */
--spacing-lg: 1.5rem;       /* Between cards/sections */
--spacing-xl: 2rem;         /* Main content padding */

/* Radius */
--radius-md: 8px;           /* Inner elements */
--radius-lg: 12px;          /* Cards */
```

### Status Indicator Patterns
| Status | Color | Icon | Text |
|--------|-------|------|------|
| Ready | `--success` | `check-circle` | "Ready" or service name |
| Degraded | `--warning` | `alert-triangle` | Warning message |
| Unavailable | `--danger` | `x-circle` | Error message |
| Not configured | `--text-muted` | `minus-circle` | "Not configured" |
| Beta | `--warning` | none | "BETA" label |

---

## 10. Data Model Summary

### What Powers "This Week"

The page queries the `content_calendar_entries` table joined with `editorial_calendars`:

```
editorial_calendars
  ├── annual_theme: "From Alignment to Action"
  ├── quarterly_pillars: [{q:1, name:"Human-Aligned Intelligence"}]
  └── monthly_themes: [{month:3, name:"Human-AI Collaboration"}]

content_calendar_entries (for current week)
  ├── title: "Building Trust Between Teams and Their AI Tools"
  ├── week_number: 11
  ├── article_format: "medium"
  ├── series_name: "Collaboration"
  ├── is_cornerstone: false
  ├── week_position_in_month: 3 (extension 2)
  ├── cornerstone_article_id: → "AI in Service of Humanity"
  ├── status: "planned" | "drafting" | "review" | "published"
  ├── article_markdown: null (until generated)
  ├── header_image_url: null (until generated)
  └── linkedin_posts: [] (until generated)
```

### What Powers "Recent" and "Upcoming"

Same table, filtered by `week_number` relative to current week. Recent = last 4-8 entries with `status` shown. Upcoming = next 2-3 entries.

---

## 11. Editorial Calendar Hierarchy

The Content Creation System uses this structure, which the UI needs to represent in the Settings > Calendar tab:

```
Annual Theme: "From Alignment to Action — Building AI That Reflects Who You Are"
│
├── Q1: Human-Aligned Intelligence (Weeks 1-13)
│   ├── January: The Humanity Question
│   │   ├── Wk1: Before We Talk About AI... (Long, Cornerstone #1)
│   │   ├── Wk2: The Judgment Gap (Medium, Extension)
│   │   ├── Wk3: Wisdom vs. Intelligence (Medium, Extension)
│   │   └── Wk4: Five Human Capabilities (Short, Practical)
│   ├── February: The Alignment Imperative
│   │   ├── Wk5-8 ...
│   └── March: Human-AI Collaboration
│       ├── Wk9-12 ...
│
├── Q2: Ethical Architecture (Weeks 14-26)
│   ├── April: The Cost of Misalignment
│   ├── May: Integrity as Foundation
│   └── June: Bright Lines and Guardrails
│
├── Q3: Values as Strategy (Weeks 27-39)
│   ├── July: Personal Alignment
│   ├── August: Strategic Integrity
│   └── September: Ecosystem Intelligence
│
└── Q4: Sustainable Growth (Weeks 40-52)
    ├── October: Measuring What Matters
    ├── November: Sustainable Practice
    └── December: Integration and Vision
```

Each month follows a 4-week pattern:
- **Week 1:** Cornerstone (Long-form, 2000+ words) — Foundation article
- **Week 2:** Extension 1 (Medium, 1000-1500 words) — Deeper concept
- **Week 3:** Extension 2 (Medium, 1000-1500 words) — Adjacent application
- **Week 4:** Practical (Short, 500-800 words) — Actionable checklist/guide

---

## 12. Success Metrics (What the Design Should Optimize For)

| Metric | Target | How Design Affects It |
|--------|--------|----------------------|
| **Time to publish** (north star) | < 3 minutes | Fewer clicks, no scrolling past irrelevant sections, one-click generate + publish |
| **Package completion rate** | > 80% | Clear single CTA, inline results, no navigation away |
| **Settings visit rate** | < 20% of total visits | Configuration properly hidden — users shouldn't need it weekly |
| **Generation abandon rate** | < 10% | Progress indicator with time estimate prevents users from leaving during 90s wait |
| **First-time setup completion** | > 90% | Setup wizard still present for new users, clear transition to "This Week" after setup |

---

## 13. Responsive Behavior

| Viewport | Layout Changes |
|----------|---------------|
| **> 1200px** | Full layout as wireframed. Pillar/Format metadata in horizontal badges. |
| **1024-1200px** | Content Card metadata stacks to 2 columns. Pipeline steps may wrap to 2 rows. |
| **768-1024px** | Single column. Content Card metadata fully stacked. Settings tabs become vertical sidebar or accordion. |
| **< 768px** | Not primary target (enterprise dashboard). Graceful degradation — all content stacks vertically, buttons full-width. |

---

## 14. Accessibility Requirements

| Requirement | Implementation |
|------------|----------------|
| Color + text for all status indicators | Every colored dot/icon must have adjacent text label |
| Keyboard navigation through pipeline steps | Tab order: Content Card → Generate button → Results → Publish → Upcoming → Recent |
| Screen reader for progress state | `aria-live="polite"` region for generation progress updates |
| Focus management on mode toggle | When switching to Settings, focus moves to first tab. When returning, focus moves to the primary CTA. |
| Escape key closes modals | ModalService already handles this |
| Form labels in Settings tabs | All inputs in Settings must have associated `<label>` elements |

---

## 15. Open Decisions for Designer

1. **Pillar color as card accent:** Left border? Top stripe? Background tint? What treatment best conveys the pillar association without being overwhelming?

2. **Article preview format:** Should the Preview modal show rendered markdown (formatted) or raw markdown (editable)? Or a toggle between both?

3. **Week navigation interaction:** Should clicking a week in Upcoming/Recent replace the "This Week" card content? Or open a detail panel below? Or navigate to a new URL?

4. **Publishing streak visualization:** Simple counter ("8 weeks in a row")? Visual streak bar? Calendar-style heat map? What level of motivation is appropriate for this professional audience?

5. **Settings transition animation:** Instant switch? Slide transition? Fade? The mode change should feel deliberate but not slow.

---

## 16. Files for Reference

| File | What It Contains |
|------|------------------|
| `public/thought-leadership.html` | Current 3,300-line page (to be restructured) |
| `public/css/styles.css` | Design system variables, component classes |
| `server/routes/thought-leadership.js` | All API endpoints (existing + new) |
| `documentation/release-notes/v3.74-2026-03-15.md` | Phase 72 publishing pipeline details |
| `documentation/design/TL-Redesign-Designer-Handoff.md` | This document |

---

*This document is the single source of truth for the designer. All wireframes, principles, metrics, and specifications are included. The designer should produce high-fidelity mockups for both modes, all states (empty, loading, populated, error), and responsive breakpoints before implementation begins.*
