# Insight 360 — Workflow UX Design Principles

**Version:** 1.0
**Date:** March 15, 2026
**Scope:** Platform-wide standards for any module with recurring, multi-step workflows
**Origin:** Thought Leadership redesign (Phase 75), validated by PM UI/UX Manager

---

## When These Apply

These principles govern any i360 module where users perform a **recurring workflow** (weekly, daily, or event-triggered). Examples:
- Thought Leadership (weekly content generation + publishing)
- AI Digest (periodic digest generation + distribution)
- Briefing (daily briefing generation + review)
- Any future module with a generate → review → publish pattern

For modules that are primarily **CRUD interfaces** (agents, context assets, settings pages), the standard i360 component patterns apply instead.

---

## The 12 Principles

### 1. Primary Action Prominence
> The most common task should be the most visible element on the page.

If 95% of visits are to perform one action, that action gets the largest button, the highest position, and the most visual weight. "What do I do here?" should be answered in under 2 seconds.

**Test:** Cover the page with your hand, then reveal it. Is the primary action the first thing your eye lands on?

---

### 2. Configuration vs. Execution Separation
> Setup happens once; execution happens repeatedly. Don't show both at the same weight.

Move all configuration (settings, preferences, connection management) behind a Settings panel or gear icon. The main view is for **doing the thing**, not configuring the thing.

**Test:** Count the sections on the page. If more than half are configuration, the separation isn't working.

---

### 3. Smart Context
> The system should know what the user needs before they tell it.

Use dates, calendars, schedules, and user history to pre-populate the interface. Never ask the user to provide information the system already has. If it's Tuesday of Week 11 and the calendar says the topic is "Building Trust," show that immediately.

**Test:** Can the user accomplish their task without typing anything? If yes, the context is smart enough.

---

### 4. Progressive Disclosure
> Show what's needed now. Reveal more when asked.

Default to the minimum interface for the current task. Advanced options, historical data, and configuration are one click away but not cluttering the primary view.

**Pattern:** Summaries inline, details in modals. Lists on the page, full records on click.

---

### 5. Ambient Status
> Integration health should be visible without requiring an action.

Show status indicators that update automatically on page load. Users should see at a glance what's ready, degraded, or unavailable — without clicking a "Check" button.

**Critical rule:** Never rely on color alone. Always include text labels, icons, or patterns alongside colored indicators (WCAG AA compliance).

**Pattern:** Small dot + service name + short status text. Green/yellow/red with corresponding icon (check-circle, alert-triangle, x-circle).

---

### 6. One-Click Workflows
> Multi-step processes should be wrapped in single actions with inline progress.

If a workflow has 4 sequential steps that always run together, present them as one button. Show progress for transparency, but don't require interaction at each step.

**Caveat:** Always provide a way to run or retry individual steps. Don't ONLY offer the bundled action — power users need granularity.

---

### 7. Results Inline
> Don't navigate away to see what you just created.

Generated content, publish results, and error messages appear in the same view where the action was taken. Modal previews for detail, but the summary stays on the page.

**Anti-pattern:** Opening a new page or tab to show results. The user should never wonder "where did my results go?"

---

### 8. Streak Visibility
> Show users their momentum and consistency.

For recurring workflows, show the user's track record — how many consecutive periods they've completed the workflow. Recent entries with status (Completed, Draft, Skipped) create a visual pattern that motivates consistency.

**Applicability:** Recommended for weekly/daily workflows. Optional for event-triggered workflows.

---

### 9. Graceful Degradation
> If one part fails, the rest should still work.

Publishing to 4 targets where 1 fails should not block the other 3. Generating 4 content types where 1 fails should preserve the other 3. Always show what succeeded alongside what failed.

**Pattern:** Per-item results with individual success/failure indicators and per-item retry.

---

### 10. Pre-flight Before Commitment
> Check everything before the user invests time.

Before a long-running workflow (>10 seconds), verify that all required integrations, credentials, and data are available. Don't let the user wait 90 seconds only to discover a dependency is down.

**Pattern:** Ambient pre-flight on page load. If a critical dependency is down, show a warning on the primary CTA but still allow proceeding with available targets.

---

### 11. Undo/Retry Granularity
> If step 3 of 4 fails, let the user retry step 3 — not re-run steps 1-2.

Failed steps show individual retry buttons. Completed steps are preserved. The user should never lose work because of a downstream failure.

**Pattern:** Each step in the progress indicator has its own state (empty, in-progress, complete, failed). Failed steps show a [Retry] button that re-runs only that step.

---

### 12. Time Expectation Setting
> Long-running operations should show estimated time and progress.

Any operation taking more than 5 seconds needs a progress indicator. Operations over 30 seconds need estimated time remaining or a step counter ("step 3 of 5"). Users need to know whether to wait or come back.

**Pattern:** Progress bar with step labels and elapsed time per step. "Usually takes about X seconds" text for first-time users.

---

## How to Apply These Principles

When designing a new workflow module:

1. **Identify the primary action** — what does the user do 95% of the time? (Principle 1)
2. **Separate config from execution** — what changes rarely vs. what runs every time? (Principle 2)
3. **Pre-populate everything possible** — what does the system already know? (Principle 3)
4. **Design the happy path first** — minimum clicks from landing to completion (Principles 4, 6)
5. **Add failure handling** — what happens when each step fails? (Principles 9, 11)
6. **Add status transparency** — how does the user know what's working? (Principles 5, 10, 12)
7. **Show history and momentum** — how does the user see their track record? (Principle 8)
8. **Keep results visible** — where do outputs appear? (Principle 7)

---

## Relationship to Existing Standards

These principles **extend** the existing i360 frontend standards documented in `CLAUDE.md`. They do not replace them. The existing standards (navigation.js, ModalService, Lucide icons, spacing variables, theme system) remain mandatory for all pages. These workflow principles add a layer of UX guidance for modules with recurring, multi-step workflows.

---

*"The best interface is the one that gets out of the way and lets you do your work."*
