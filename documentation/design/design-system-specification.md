# Insight 360 Design System Specification

**Version:** 1.0.0
**Status:** Draft
**Last Updated:** March 19, 2026
**Authors:** JB Herrera (Vision), Higgins (Synthesis), Avery (Orchestration)

---

## About This Document

This is the design specification for Insight 360's user interface. It is a blueprint, not a codebase — it defines what the experience should be, independent of current implementation. The team builds from this document. Code conforms to this document, not the other way around.

The specification is organized in seven parts, progressing from vision to implementation detail. Each layer builds on the one above it.

| Part | Name | Purpose |
|------|------|---------|
| 1 | Vision & Principles | Why we make the decisions we make |
| 2 | Agent Experience Layer | How the AI collaborator manifests in the interface |
| 3 | Design Tokens | The atomic visual building blocks |
| 4 | Component Anatomy | Reusable interface elements |
| 5 | Layout Patterns | Page-level compositions |
| 6 | Interaction Vocabulary | Behavioral patterns |
| 7 | Data Contracts | The interface between data and presentation |

---

# Part 1 — Vision & Principles

## 1.1 The North Star

Insight 360's design vision is the **Knowledge Navigator** — Apple's 1987 concept of a personalized AI collaborator that works alongside the user through natural conversation, proactively surfaces relevant information, connects people and data, and restructures the experience around the user's intent.

The Knowledge Navigator was a tablet-like device with an AI agent — a bow-tied character with presence, personality, and memory. The user (a professor) never navigated menus. He spoke his intent. The agent responded by assembling the right information in the right form: research papers, data visualizations overlaid on maps, a live video call with a colleague. The interface was the conversation. The conversation shaped the interface.

In 1987, this was science fiction. In 2026, this is Insight 360.

### What This Means for Us

- **Higgins is the Knowledge Navigator agent.** Not a chat widget bolted onto a dashboard — a collaborator with personality, values, contextual memory, and the ability to compose the experience around what the user needs.

- **Soul Configuration is the personality engine.** It infuses each organization's AI collaborator with their values, vision, voice, ethical constraints, and domain expertise. What JB has built with Higgins, every Insight 360 customer gets for their organization.

- **Conversation is the primary interaction model.** Traditional page navigation coexists, but the conversational interface is where the user's intent meets the system's capability. The user says what they need; the system responds with information, action, and context — not a page redirect.

- **The interface restructures around intent.** The agent doesn't just answer questions in a chat panel. It surfaces visualizations, opens relevant views, assembles data from multiple sources, connects workflows, and presents decision frameworks — all within the flow of dialogue.

- **Every organization gets their own Knowledge Navigator.** This is the platform's value proposition. Soul Config + Higgins + multi-LLM orchestration = a personalized AI collaborator for every team, shaped by their values and tuned to their domain.

## 1.2 Design Principles

The principles are organized in three groups: how the system looks and feels, how it behaves, and how it earns trust. Every design decision — from token values to page layouts to agent interactions — should be traceable to one or more of these principles.

### Foundation Principles
*How the system looks and feels*

---

#### Principle 1: Hierarchy — Content Over Chrome

The interface exists to elevate the user's content, data, and decisions. Navigation, toolbars, and system chrome recede. When the user is reading an agent's output, examining a dashboard metric, or reviewing a strategic plan — that content is the interface. Everything else is infrastructure.

The design system serves the data. The data does not serve the design system.

**Derived from:** Apple HIG (Hierarchy, Deference)

**Applied as:**
- Content areas receive the most visual weight (size, contrast, position)
- Navigation and toolbars use subdued colors and minimal visual mass
- Modal overlays dim the background to focus attention on the content
- Agent responses are the most prominent element in any conversational view
- Status indicators, badges, and metadata are secondary to the primary content

---

#### Principle 2: Harmony — One Product, One Mind

Every page, every modal, every interaction feels like it was designed by the same team on the same day. Not just consistent buttons — a consistent personality, vocabulary, and rhythm. A user moving from Parthenon to Chat to Agents should never feel a seam.

Harmony extends beyond visual consistency to behavioral consistency. The same mental model works everywhere.

**Derived from:** Apple HIG (Harmony)

**Applied as:**
- A single design token system governs all visual decisions
- Component behavior is identical across all pages (a card is a card everywhere)
- Transitions and animations follow the same timing and easing curves
- Language and terminology are consistent (the same concept is never called two different things)
- The agent's voice and personality are consistent regardless of which page the user is on

---

#### Principle 3: Separation of Intent and Presentation

The design system defines *how* things are presented, independent of *what* data fills them. An entity list works for agents, workflows, skills, context assets, or any concept that hasn't been invented yet.

Patterns are composed from components. Components are styled by tokens. Data flows into patterns through contracts. None of these layers know about specific features. The data layer and the experience layer are completely independent.

**Derived from:** Insight 360 architecture principle

**Applied as:**
- Layout patterns are named by their function (entity list, detail view, dashboard), never by their content (agents page, workflow page)
- Components accept data through defined contracts, not hardcoded fields
- New features can be built entirely from existing patterns without new CSS or components
- A change to a pattern automatically applies everywhere that pattern is used
- The backend can evolve its data model without requiring UI redesign

---

#### Principle 4: Accessibility as Quality, Not Feature

An accessible interface is intuitive, perceivable, and adaptable. These are not accommodations for edge cases — they are quality standards that make the interface better for everyone.

A platform admin using a screen reader, a coach on a low-contrast laptop, a consultant navigating by keyboard — they all experience the same quality of interaction.

**Derived from:** Apple HIG (Accessibility)

**Applied as:**
- WCAG AA minimum compliance on all interfaces
- Minimum interactive target size: 44x44pt (28x28pt absolute minimum)
- Color contrast: 4.5:1 for body text, 3:1 for large text and UI components
- Color is never the sole indicator of state or meaning — always paired with shape, icon, or text
- All interactive elements are keyboard navigable with visible focus indicators
- Dynamic text sizing supported (minimum 200% enlargement without breaking layout)
- Reduce-motion preference respected (no auto-playing animations, gentler transitions)
- All images and icons have appropriate alt text or ARIA labels
- Screen reader navigation tested on all pages

---

### Behavioral Principles
*How the system acts*

---

#### Principle 5: Workflow-First, Not Feature-First

Pages are organized around what the user needs to do next, not what the system can do. The user's current task is the starting point. Configuration, history, and settings are available but secondary.

The interface answers "what should I do now?" before "what can I do?"

**Derived from:** Insight 360 established principle

**Applied as:**
- Lead with the current task or most time-sensitive information
- One primary call-to-action per view — make the next step obvious
- Results appear inline, not in separate pages or modals (unless complex)
- Configuration and settings are accessible but never block the primary workflow
- Navigation reflects the user's workflow, not the database schema
- Temporal hierarchy: time-sensitive items surface first

---

#### Principle 6: Conversation as Navigation

The user can express intent through dialogue, and the system responds with the right information in the right form. The interface restructures itself around what the user needs — not just what page they clicked.

Traditional navigation (sidebar, breadcrumbs, links) coexists with conversational navigation. Neither replaces the other. The user chooses their preferred mode of interaction, and the system supports both seamlessly.

**Derived from:** Apple Knowledge Navigator (1987)

**Applied as:**
- Higgins can open pages, surface data, create visualizations, and trigger workflows from conversation
- Conversational responses include actionable elements (buttons, links, embedded views), not just text
- Context from the conversation persists as the user navigates — the agent remembers what was discussed
- The user can always say "show me X" as an alternative to finding X in the navigation
- Agent-initiated suggestions ("I noticed you haven't reviewed the Q1 OKRs") link directly to the relevant view

---

#### Principle 7: The System Brings Things Together

An agentic interface doesn't make the user assemble information from multiple pages. It composes the experience — connecting data sources, surfacing relevant context, presenting synthesized views.

The user asks a question; the system delivers an answer composed from agents, data, documents, analysis, and external sources. The user sees the answer, not the plumbing.

**Derived from:** Apple Knowledge Navigator (1987)

**Applied as:**
- Agent responses can embed data from multiple modules (Parthenon + agents + context assets in a single response)
- Dashboard views synthesize across data sources, not just display one table
- Related information surfaces proactively (viewing an agent shows its recent conversations, its department, its skills)
- Cross-module navigation is seamless (from a chat mention of an OKR directly to that OKR's detail view)
- The search experience spans all modules, not each module's own search

---

#### Principle 8: Progressive Revelation Through Dialogue

Information emerges through interaction, not through hidden menus or deep navigation hierarchies. The agent's responses shape what the interface shows. A conversation with Higgins can surface a visualization, open a relevant page, or present a decision framework.

Complexity is available when requested, never imposed upfront.

**Derived from:** Apple Knowledge Navigator (1987), Apple HIG (Progressive Disclosure)

**Applied as:**
- Initial views show summary information with clear paths to detail
- Agent responses can dynamically add content to the current view (charts, tables, embedded data)
- Tier-locked features are visible but gated — the user understands what's available without being overwhelmed
- Advanced options expand on demand, never clutter the default view
- Help and documentation surface contextually through the agent, not just through static help pages

---

#### Principle 9: No Dead Ends

Every state the user can reach must have a clear path forward. The interface never leaves the user stranded.

**Derived from:** Insight 360 established principle

**Applied as:**
- Empty states suggest specific actions ("No agents yet. Create your first agent →")
- Error states explain what went wrong and what to do ("Connection failed. Check your API key in Settings →")
- Completed states show what's next ("Workflow complete. View results → or Run again →")
- Access denied states explain why and where to go instead ("This module requires Business tier. View upgrade options →")
- No stub buttons, no "coming soon" placeholders, no blank screens

---

#### Principle 10: Render the Final Form

Content appears as it will be used — never as raw data, markdown source, unstyled text, or intermediate formats. The preview is the product.

**Derived from:** Insight 360 established principle

**Applied as:**
- Agent-generated content renders in its final format (HTML email looks like an email, report looks like a report)
- Data visualizations are styled and labeled, not raw chart output
- Exported content matches what the user saw on screen
- Image previews appear above text content, not inline or after
- Quality feedback is actionable ("Tone is too formal for this persona" not "Score: 72/100")

---

### Trust Principles
*How the system earns confidence*

---

#### Principle 11: Human Directs, Agent Executes

The user always has authority. The system proposes, the user disposes. Before any consequential action — sending a message, publishing content, deleting data, executing a workflow — the interface makes the human's approval explicit and visible.

The agent is a collaborator with initiative, not an autonomous actor. The user sees what the agent is about to do and confirms it.

**Derived from:** Apple Knowledge Navigator (1987)

**Applied as:**
- Consequential actions require explicit confirmation ("Higgins will send this email to 3 recipients. Send?")
- Agent suggestions are visually distinct from completed actions
- The user can always override, edit, or cancel an agent's proposed action
- Autonomous background tasks (scheduled briefings, health checks) are logged and reviewable
- The interface never implies the agent has taken action when it's only proposing one

---

#### Principle 12: Transparency of Process

When the system is working, the user knows what it's doing and why. When it completes, the user knows what happened. When it fails, the user knows what went wrong.

Opacity destroys trust. Visibility builds it.

**Derived from:** Agentic design principle

**Applied as:**
- Loading states indicate what's happening, not just that something is happening ("Analyzing 12 context assets..." not just a spinner)
- Agent reasoning is available on request ("Why did you recommend this?" shows the decision path)
- Fallback behavior is announced ("Claude is unavailable. Using GPT-4o for this response.")
- Error messages include the cause and the remedy, not just "Something went wrong"
- Audit trails are accessible for consequential actions (who did what, when, and why)
- Multi-step processes show progress with clear stage indicators

---

#### Principle 13: Consistency Over Cleverness

The same action looks and behaves the same way everywhere. A delete button is always red, always confirms, always in the same position. Predictability builds trust. Novel interactions require a strong justification.

When a user learns how one part of Insight 360 works, they've learned how all of it works.

**Derived from:** Apple HIG (Consistency), Insight 360 established principle

**Applied as:**
- Destructive actions always use danger styling and require confirmation
- Primary actions are always in the same position relative to content
- Navigation patterns are identical across all modules
- Terminology is consistent (never "delete" on one page and "remove" on another for the same action)
- New interaction patterns are adopted system-wide or not at all — never one-off experiments

---

#### Principle 14: Right Way, Not Fast Way

Quality over speed in every design decision. Don't ship a pattern that works for one page if it won't work for ten. Don't add a shortcut that creates inconsistency. Build it once, build it right.

This principle applies to the design system itself. A component isn't added until it's been thought through for all contexts. A pattern isn't adopted until it's been evaluated for edge cases. A token isn't created until its semantic meaning is clear.

**Derived from:** Standing development order

**Applied as:**
- Every new component is evaluated for reusability before adoption
- Every pattern is tested against multiple data shapes before standardization
- Visual shortcuts (hardcoded values, one-off styles) are treated as defects
- The design system is allowed to evolve slowly and deliberately
- Jordan (Release Coordinator) reviews all changes against this specification before they ship

---

## 1.3 Principle Traceability

Every design decision in Parts 2–7 should reference the principle(s) it implements. If a decision can't be traced to a principle, it should be questioned. If a principle is never referenced, it should be reexamined.

| Decision Example | Traces To |
|-----------------|-----------|
| "Agent responses use larger font than system messages" | P1 (Content Over Chrome) |
| "All entity lists use the same card component" | P3 (Separation of Intent and Presentation) |
| "Higgins can open the Parthenon page from a chat response" | P6 (Conversation as Navigation) |
| "Delete confirmation shows what will be affected" | P11 (Human Directs), P12 (Transparency) |
| "New pattern evaluated for 5 data shapes before adoption" | P14 (Right Way, Not Fast Way) |

---

*End of Part 1 — Vision & Principles*

---

# Part 2 — The Agent Experience Layer

*How the AI collaborator manifests in the interface*

> This section defines the design patterns unique to an agentic platform — the layer that makes Insight 360 a Knowledge Navigator, not just a dashboard with a chat panel.

## 2.1 Agent Presence

The agent is the defining element of Insight 360. Every other enterprise platform has dashboards, lists, and forms. Only Insight 360 has a partner.

### 2.1.1 The Character

**Higgins** is a Pixar-quality 3D animated character — a British butler in a navy suit with tie. He has large expressive eyes, a slight mustache, a warm smile, and an open posture. His visual setting is a study or library, reinforcing wisdom and competence.

**He is deliberately animated.** Not photorealistic, not trying to pass as a real person. This is a conscious design decision: trust is built through honesty about what the system is, not by deceiving users about what it isn't. The animated style lands in the same space as a Pixar character — immediately approachable, clearly not real, yet emotionally resonant.

**Personality traits:**
- Warm yet professional — never robotic, never overly casual
- Playful but a mentor — humor serves understanding, never deflects
- Light British accent (voice interactions) — suggests refinement without pretension
- Suggests from experience — frames advice through the lens of success and failure, not just data
- Reads between the lines — always attempts to understand the meaning behind the question, because people can rarely express themselves completely and accurately
- Always concerned with the person — the user's wellbeing, growth, and success are the agent's primary orientation

**Target emotional response:** "I have a partner here. Someone I can rely on. Someone who's looking out for me."

This is not "I have a tool." Not "I have an assistant." Not "I have a search engine that talks." It's the feeling of a trusted advisor who knows your business, remembers your context, and genuinely cares about your outcomes.

### 2.1.2 Presence Modes

The user chooses how Higgins shows up. This is a user preference, not a system decision — different people want different levels of agent visibility, and different form factors have different constraints.

**Mode A: Always-Present Companion**

Higgins is visible on every page. The agent occupies a defined area of the screen — a persistent panel, a visible avatar with status indicator, and a ready input area. The user can speak or type to Higgins at any time without navigating away.

| Form Factor | Companion Layout |
|-------------|-----------------|
| **Desktop (1440px+)** | Side panel (right) — Higgins avatar at top, conversation below, input at bottom. Main content occupies the remaining width. Panel can be resized. |
| **Tablet (768–1439px)** | Slide-over panel — triggered by a persistent avatar button in the corner. Overlays the right portion of the screen. Can be pinned open or auto-dismissed. |
| **Mobile (< 768px)** | Bottom sheet — persistent avatar button at bottom-right. Tapping opens a bottom sheet that covers ~80% of the screen. Swipe down to dismiss. |

The companion panel is not just a chat window. It's Higgins's space — his avatar is present, his personality is expressed in the greeting, and his responses can embed interactive elements (buttons, cards, data previews) that affect the main content area.

**Mode C: Ambient + Active**

Higgins has a subtle presence everywhere but doesn't occupy permanent screen space. A small avatar (40px on desktop, 36px on tablet, 32px on mobile) sits in a fixed position with an ambient status indicator. The agent can pulse gently to indicate a proactive suggestion.

| State | Visual | Behavior |
|-------|--------|----------|
| **Idle** | Small avatar, subtle glow matching org's primary color | Tap/click to open full conversation |
| **Listening** | Avatar with gentle pulse animation | Active conversation in progress |
| **Suggesting** | Avatar with notification dot + brief text preview | Proactive insight available — tap to see |
| **Working** | Avatar with progress indicator | Agent is executing a task (research, generation, analysis) |
| **Unavailable** | Avatar dimmed with status icon | LLM provider issue, maintenance, etc. |

When the user engages (clicks the avatar, uses a keyboard shortcut, or speaks), the full conversational interface expands:

| Form Factor | Expansion Behavior |
|-------------|-------------------|
| **Desktop** | Panel slides in from right (same as Mode A), pushes or overlays content |
| **Tablet** | Slide-over panel from right |
| **Mobile** | Full-screen conversation view with back navigation to previous context |

**Mode B (Legacy): Chat Page Only**

This is the current implementation — Higgins lives on `chat.html`. This mode remains available but is not the recommended experience. It exists for users who prefer complete separation between their working views and their agent interactions, and as a fallback for minimal-bandwidth situations.

### 2.1.3 Agent States

Regardless of presence mode, Higgins communicates his state visually:

| State | Avatar Expression | Indicator | Voice/Text Tone |
|-------|------------------|-----------|-----------------|
| **Ready** | Warm smile, eyes forward | Solid green dot | "What can I help you with?" |
| **Thinking** | Thoughtful expression, slight head tilt | Animated dots or subtle pulse | "Let me look into that..." |
| **Responding** | Engaged, slight nod | Streaming text indicator | Content streaming in real-time |
| **Suggesting** | Raised eyebrow, slight lean forward | Notification badge | "I noticed something you might want to see..." |
| **Confirming** | Direct eye contact, serious but warm | Action confirmation UI | "Before I do that, I want to make sure..." |
| **Celebrating** | Broad smile, open posture | Success animation | "That worked well. Here's what happened..." |
| **Concerned** | Empathetic expression, slight brow furrow | Warning indicator | "I want to flag something for your attention..." |
| **Error** | Apologetic expression | Error indicator | "I ran into a problem. Here's what I know..." |

**Note on full-motion avatar:** The long-term vision is a full-motion video avatar — Higgins with fluid facial expressions, gestures, and lip-synced speech. The design system should accommodate this evolution. All avatar containers should support both static image and video formats. The state expressions described above should be achievable with either a static expression library (near-term) or animated sequences (future).

### 2.1.4 Personality Through Interface

Higgins's personality isn't just in his words — it's in how the interface behaves:

- **Greetings are contextual.** Not "Hello!" every time. "Good morning — your Q1 OKR review is due Friday. Want me to pull the latest numbers?" The greeting reflects awareness of time, pending tasks, and the user's recent activity.

- **Responses anticipate the next question.** When Higgins presents data, he includes "You might also want to know..." or offers a related action. He thinks one step ahead, like a good advisor.

- **Errors are owned, not deflected.** When something goes wrong, Higgins doesn't say "An error occurred." He says "I wasn't able to reach the Anthropic API — it looks like a billing issue on our end. Your request will work with OpenAI in the meantime. Want me to try that?"

- **Silence is respected.** When the user is working in the main content area, Higgins doesn't interrupt. Proactive suggestions appear as gentle indicators, never modals or alerts. The user engages when ready.

- **Memory is demonstrated.** "Last time we discussed this, you were concerned about the margin impact. Want me to include that analysis?" Continuity builds the feeling of a real partner.

### 2.1.5 Customization Through Soul Config

Every organization gets their own version of the agent experience. Soul Config determines:

| Aspect | What Soul Config Controls |
|--------|--------------------------|
| **Name** | The agent can be renamed per org (though Higgins is the default) |
| **Voice** | Formal, conversational, technical — calibrated to the org's culture |
| **Values emphasis** | Which ethical lenses the agent weighs most heavily in recommendations |
| **Domain knowledge** | What context the agent brings to conversations (industry, terminology, priorities) |
| **Bright lines** | What the agent will refuse to do or recommend, per org policy |
| **Greeting style** | How the agent opens conversations — task-focused, warm check-in, or data-forward |

The visual character (Higgins's appearance) remains consistent across orgs in the current design. Future evolution may allow org-level avatar customization, but the Pixar-quality animated style is the platform standard — no org can replace Higgins with a photorealistic deepfake or a corporate logo.

---

## 2.2 Conversational Patterns

The conversation between the user and Higgins is not a feature inside the interface — it is the primary mechanism through which the interface operates. The user speaks intent on the left. The world changes on the right.

### 2.2.1 The Two-Panel Architecture

On screens large enough to support it (desktop, tablet), Insight 360's primary layout is two panels:

```
┌──────────────────────────────────────────────────────┐
│ ┌──────────────┐  ┌────────────────────────────────┐ │
│ │              │  │                                │ │
│ │   HIGGINS    │  │           CANVAS               │ │
│ │   PANEL      │  │                                │ │
│ │              │  │   (data, charts, documents,    │ │
│ │  Conversation│  │    images, module views,       │ │
│ │  flows here  │  │    composite content)          │ │
│ │              │  │                                │ │
│ │              │  │                                │ │
│ │              │  │                                │ │
│ │  ┌────────┐  │  │                                │ │
│ │  │ Input  │  │  │                                │ │
│ │  └────────┘  │  │                                │ │
│ └──────────────┘  └────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**The Higgins Panel (left)** is the command surface — where the user expresses intent through text, voice, or by interacting with rich elements Higgins presents in the conversation stream. Higgins's avatar is present at the top. The conversation scrolls. The input area is at the bottom.

**The Canvas (right)** is the response surface — where the results of the conversation materialize. The canvas is polymorphic: it displays whatever Higgins produces or whatever the user navigates to.

This is the Knowledge Navigator layout. The professor spoke to the agent; the screen showed what the agent assembled.

### 2.2.2 Canvas Content Types

The canvas can display any of these content types, alone or in combination:

| Content Type | Examples | Source |
|-------------|----------|--------|
| **Data views** | Entity lists, record details, tables, filtered views | Module data via API |
| **Visualizations** | Bar charts, line charts, pie charts, timelines, org charts, animated dashboards | Generated from data |
| **Documents** | Markdown rendered as formatted text, Word/PDF preview, PowerPoint deck viewer | Generated or retrieved |
| **Images** | AI-generated images, diagrams, screenshots, logos | Generated or from assets |
| **Composite** | Image + article (thought leadership), chart + narrative (board report), data + recommendation | Multiple sources assembled |
| **Module pages** | Traditional Insight 360 pages (Parthenon, Agents, Context Assets) | Existing page content rendered in canvas |
| **External** | Web previews, embedded video, live data feeds | External sources |

**Composite content** is a key differentiator. Higgins doesn't just show one thing at a time — he can compose a canvas that combines an image he generated for an article with the article text below it, or a chart alongside its written analysis. The canvas is a workspace, not a single viewport.

### 2.2.3 Canvas Persistence and Pinning

The canvas is not disposable. When Higgins produces content on the canvas, the user can:

**Pin items** — A pin control on each canvas item keeps it visible. When the user asks a follow-up that produces new canvas content, pinned items remain. The canvas becomes a growing workspace of accumulated results.

**Arrange pinned items** — Pinned items can be reordered within the canvas. The layout adjusts responsively (stacked vertically on narrower canvases, grid on wider ones).

**Compose into a document** — The user can select multiple pinned canvas items and combine them into a single document. This document can be:
- Saved as an HTML page within the platform
- Downloaded as a formatted document (HTML, PDF)
- Stored as a context asset for future reference
- Shared with team members

**Canvas history** — Previous canvas states are accessible through the conversation history. Scrolling back to a prior Higgins response and clicking "Show on canvas" restores what was displayed at that point.

### 2.2.4 Presence Modes and the Two-Panel Layout

The user's chosen presence mode (from Section 2.1.2) determines how the two-panel layout manifests:

**Mode A: Always-Present Companion**

The Higgins panel is always visible. The two-panel layout is the default state. Traditional navigation (sidebar or nav rail) provides an additional way to direct what appears on the canvas, but Higgins is always the primary interaction surface.

| Form Factor | Layout |
|-------------|--------|
| Desktop (1440px+) | Higgins panel (~350px) + Canvas (remaining width). Panel is resizable. |
| Tablet landscape (1024–1439px) | Higgins panel (~300px) + Canvas. Panel can be collapsed to icon-width. |
| Tablet portrait (768–1023px) | Split view with Higgins panel (~280px) + Canvas, or swipe between them |
| Mobile (< 768px) | Full-screen conversation with rich responses embedded inline. Canvas items open as full-screen overlays. |

**Mode C: Ambient + Active**

The canvas takes the full width by default. A subtle Higgins presence indicator (small avatar, ~40px) sits in the upper-left corner as a superimposed shadow — always available, never intrusive. The user reaches Higgins by:
- Clicking/tapping the avatar
- Using a keyboard shortcut
- Saying "Hey Higgins" (if voice-enabled)

When activated, the Higgins panel slides in from the left, and the canvas narrows to accommodate it. When the user is done with the conversation, the panel can be dismissed and the canvas returns to full width — but pinned canvas items from the conversation remain.

| Form Factor | Activation |
|-------------|-----------|
| Desktop | Panel slides in from left, canvas narrows smoothly |
| Tablet | Panel slides over canvas (overlay) or pushes canvas (user preference) |
| Mobile | Full-screen conversation view. Return to canvas via back navigation. |

**Voice activation** — When the interface is voice-enabled, the user can summon Higgins by voice command (configurable wake phrase, default "Hey Higgins"). The Higgins panel appears and begins listening. Voice responses play through the device audio while results appear on the canvas. This mirrors the Knowledge Navigator interaction model exactly.

### 2.2.5 Navigation Integration

**RESOLVED — Command Palette Model (Hybrid)**

The traditional sidebar navigation is replaced by a **summonable Command Palette** — a modal overlay that surfaces all navigation, module access, and contextual suggestions on demand. There is no permanent sidebar or icon rail. The screen belongs to the two-panel layout (Higgins Panel + Canvas) or, in Mode C, to the canvas alone.

This is a deliberate departure from conventional SaaS navigation. The Knowledge Navigator didn't have a sidebar. The professor spoke intent, and the system responded. Insight 360 follows that model — but with multiple paths to the same destination, so no user is ever stranded.

#### The Command Palette

The Command Palette is a centered modal overlay that appears on top of the current view. It contains everything the user needs to navigate the platform, discover capabilities, and act on contextual suggestions.

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│         ┌────────────────────────────────┐           │
│         │  ┌──────────────────────────┐  │           │
│         │  │ Search / type to filter  │  │           │
│         │  └──────────────────────────┘  │           │
│         │                                │           │
│         │  SUGGESTED BY HIGGINS          │           │
│         │  ┌────────┐ ┌────────┐        │           │
│         │  │ Review  │ │ 3 OKRs │        │           │
│         │  │ Q1 OKRs │ │ overdue│        │           │
│         │  └────────┘ └────────┘        │           │
│         │                                │           │
│         │  MODULES            RECENT     │           │
│         │  ┌────┐ ┌────┐     Dashboard   │           │
│         │  │Chat│ │Agnt│     Agents      │           │
│         │  └────┘ └────┘     Parthenon   │           │
│         │  ┌────┐ ┌────┐     Soul Config │           │
│         │  │Prth│ │Ctxt│     Chat        │           │
│         │  └────┘ └────┘                 │           │
│         │  ┌────┐ ┌────┐                 │           │
│         │  │Soul│ │Wkfl│                 │           │
│         │  └────┘ └────┘                 │           │
│         │         ...                    │           │
│         └────────────────────────────────┘           │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Palette sections:**

| Section | Content | Behavior |
|---------|---------|----------|
| **Search bar** | Text input with placeholder "Where do you want to go?" | Filters all sections in real-time as the user types |
| **Suggested by Higgins** | Contextual recommendations based on time, pending tasks, recent activity | 2–4 cards with icons, short descriptions, and direct links. Updated each time the palette opens. |
| **Modules** | All modules the user has access to, filtered by tier and role | Icon grid grouped by category (Core, Strategy, Operations, Administration). Tier-locked modules shown dimmed with upgrade indicator. |
| **Recent** | Last 5 pages the user visited | Simple text list with icons. One-click return to any recent page. |
| **Quick actions** | Common actions: "Create agent", "New conversation", "Run workflow" | Appear when relevant. Filtered by permissions. |

**How the palette is summoned (four paths to the same destination):**

| Trigger | Who it serves | How it works |
|---------|--------------|-------------|
| **Ask Higgins** | Conversational users | Say or type "What can I do?", "Show me my options", "Navigate to agents", or any navigation-intent phrase. Higgins opens the palette or navigates directly if the destination is unambiguous. |
| **Click the Higgins avatar** | Mouse/touch users | In Mode C, clicking the ambient avatar opens the Command Palette as the first interaction — before a full conversation. One click to see all options. In Mode A, a navigation icon near the avatar opens it. |
| **Keyboard shortcut** | Power users | `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux) opens the palette instantly. Typing immediately filters. This is the fastest path for users who know what they want. |
| **First-visit onboarding** | New users | On first login, Higgins proactively opens the palette with a welcome message: "Here's everything you have access to. Where would you like to start?" Eliminates the blank-screen problem entirely. |

#### Why Not a Permanent Sidebar

The decision to eliminate the permanent sidebar is intentional and traces to multiple design principles:

- **P1 (Content Over Chrome)** — A sidebar consumes 240–280px on every page, whether the user needs navigation or not. The Command Palette gives that space back to content and reclaims it only when navigation is the active task.

- **P6 (Conversation as Navigation)** — If Higgins can navigate, a sidebar is redundant infrastructure. The palette unifies conversational and direct navigation into a single summonable surface.

- **P8 (Progressive Revelation)** — Navigation options appear when requested, not imposed on every view. The interface starts clean and reveals complexity on demand.

- **P2 (Harmony)** — One navigation mechanism that works identically everywhere, instead of a sidebar that varies by page or collapses differently on each breakpoint.

#### Mode-Specific Behavior

**Mode A (Always-Present Companion):**

The Higgins panel is visible. The palette is summoned via a compact navigation icon at the top of the Higgins panel (next to the avatar), via keyboard shortcut, or by asking Higgins. When the user selects a destination in the palette, the canvas updates. The Higgins panel remains, providing continuity.

```
┌──────────────────────────────────────────────────────┐
│ ┌──────────────────┐  ┌────────────────────────────┐ │
│ │ [H] [nav icon]   │  │                            │ │
│ │                  │  │         CANVAS             │ │
│ │   Conversation   │  │                            │ │
│ │                  │  │   (updates when user       │ │
│ │                  │  │    selects a destination    │ │
│ │                  │  │    from the palette)        │ │
│ │                  │  │                            │ │
│ │  ┌────────────┐  │  │                            │ │
│ │  │   Input    │  │  │                            │ │
│ │  └────────────┘  │  │                            │ │
│ └──────────────────┘  └────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**Mode C (Ambient + Active):**

The canvas takes full width. The Higgins avatar (~40px) floats in a fixed position. Clicking the avatar opens the Command Palette — not a conversation. This is the critical design decision: the avatar's *first* action is navigation/discovery, not chat. From the palette, the user can select a destination (canvas updates) or choose "Start a conversation" to open the full Higgins panel.

This solves the discoverability problem: even in the most minimal presence mode, one click on the avatar reveals everything the platform can do.

```
┌──────────────────────────────────────────────────────┐
│ [H]                                                  │
│                                                      │
│                    FULL-WIDTH CANVAS                  │
│                                                      │
│   Click avatar → Command Palette opens               │
│   Cmd+K → Command Palette opens                      │
│   "Hey Higgins" → Conversation panel slides in       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Mobile (all modes):**

The Command Palette opens as a full-screen overlay with large touch targets. The module grid uses a 2-column layout. Search is prominent at the top. The "Suggested by Higgins" section is especially valuable here — on a small screen, contextual shortcuts reduce the need to browse.

#### Palette Intelligence

The Command Palette is not a static menu — it's context-aware:

- **Time-sensitive items surface first.** If OKRs are due this week, Higgins suggests reviewing them. If a workflow failed overnight, that appears at the top.
- **Role-filtered modules.** A manager sees different modules than a supervisor. Tier-locked modules appear dimmed with "Upgrade to Business" indicators — visible but not clickable. (P9: No Dead Ends — the user understands what exists even if they can't access it yet.)
- **Frequency-weighted recents.** The "Recent" section learns which pages the user visits most, not just most recently. Over time, it becomes a personalized quick-access list.
- **Search is fuzzy and forgiving.** Typing "agent" matches "Agents", "Agent Management", and "Create New Agent." Typing "OKR" matches the Parthenon page filtered to OKRs. The palette resolves intent, not just exact strings.

#### Transition from Current Navigation

The current sidebar navigation (`navigation.js`) continues to function during the transition period. The Command Palette is built alongside it, not as a replacement on day one. The migration path:

1. **Phase 1:** Command Palette ships as an additional navigation method. Sidebar remains. Users can use either.
2. **Phase 2:** Mode C becomes the default for new users. Sidebar is available as a user preference ("Classic navigation").
3. **Phase 3:** Sidebar is deprecated. All navigation flows through the Command Palette. Classic mode removed after usage drops below threshold.

This respects P14 (Right Way, Not Fast Way) — the transition is gradual, validated by usage data, and reversible at each stage.

### 2.2.6 Rich Responses in Conversation

Within the Higgins panel itself (not just the canvas), responses can contain interactive elements:

| Element | Example | Behavior |
|---------|---------|----------|
| **Action buttons** | "Approve" / "Revise" / "Reject" | Executes the action, updates canvas |
| **Quick replies** | Suggested follow-up questions as chips | Sends the selected text as the user's next message |
| **Data cards** | Compact preview of an agent, asset, or record | Click to expand on canvas |
| **Inline charts** | Small sparkline or mini-chart | Click to expand full visualization on canvas |
| **File attachments** | Document preview with download link | Click to open on canvas or download |
| **Status updates** | Progress indicators for multi-step tasks | Updates in real-time as the task progresses |
| **Confirmation dialogs** | "I'm about to send this email to 3 people" | Approve/edit/cancel inline in conversation |

On **mobile**, where there is no separate canvas, these rich elements serve as the primary content delivery mechanism. Data cards expand inline. Charts open as full-screen overlays. Documents open in a viewer.

### 2.2.7 Persistent Context

Conversation context persists across three dimensions:

**Within a session** — The conversation maintains full context of everything discussed. Higgins references earlier parts of the conversation naturally: "Earlier you asked about the Q1 numbers — here's the updated version with March data included."

**Across pages** — When the user navigates to a different module (via nav or via Higgins), the conversation context is preserved. The user can navigate to the Parthenon page, then ask Higgins "How does this process relate to the OKR we were just discussing?" and Higgins connects the dots.

**Across sessions** — Conversations are saved and retrievable. When the user returns, Higgins can reference prior conversations: "Last Thursday you were working on the board presentation. Want to pick up where we left off?" The conversation history is searchable and browseable.

**Context signals available to Higgins:**
- Current page/module the user is viewing
- Selected or focused items on the canvas
- Recent user activity (pages visited, actions taken)
- Time of day, day of week, upcoming deadlines
- Prior conversation history
- Organization's Soul Config (values, voice, domain, guardrails)
- User's role, department, and permissions

### 2.2.8 Multi-Turn Task Flows

Some tasks are better accomplished through dialogue than through forms. Higgins supports multi-turn task flows where a complex operation unfolds as a conversation:

**Pattern: Guided Creation**
```
User:    "Create a new agent for customer onboarding"
Higgins: "I'd like to build that with you. A few questions:
          What department will this agent belong to?"
User:    "Support"
Higgins: "Good. What should the agent's primary role be?
          For example: greeting new customers, walking them
          through setup, answering common questions..."
User:    "All of the above, plus escalating to a human
          when the customer is frustrated"
Higgins: "Got it. Here's what I'm building..."
         [Canvas shows agent preview card with all settings]
Higgins: "Want me to adjust anything before I create it?"
User:    "Change the tone to more casual"
Higgins: "Done — updated the voice to conversational.
          Ready to create?"
User:    "Yes"
Higgins: "Created. The onboarding agent is live in Support.
          Want me to set up a test conversation so you can
          see how it handles a new customer?"
```

**Pattern: Iterative Generation**
```
User:    "Prepare a board presentation on Q1 results"
Higgins: "I'll pull the data together. What should I emphasize —
          revenue growth, operational efficiency, or strategic
          milestones?"
User:    "Revenue growth and the new client acquisitions"
Higgins: [Canvas shows draft deck outline]
         "Here's the structure. I've included 4 sections:
          Executive Summary, Revenue Dashboard, New Client
          Wins, and Forward Outlook. Want me to generate
          the full deck?"
User:    "Yes, but add a section on churn risk"
Higgins: [Canvas updates with full presentation]
         "Done. The churn section uses data from the last
          90 days. I also generated a header image for the
          title slide. Take a look and tell me what to revise."
User:    "The chart on slide 3 should be a bar chart, not a line"
Higgins: [Canvas updates slide 3]
         "Updated. Anything else?"
User:    "Pin this. I'll come back to it tomorrow."
Higgins: "Pinned. I'll have it ready when you return."
```

**Pattern: Investigative Analysis**
```
User:    "Why did support ticket volume spike last week?"
Higgins: [Canvas shows ticket volume chart with spike highlighted]
         "Volume was 3.2x normal between Tuesday and Thursday.
          Let me dig into the data..."
         [Canvas adds breakdown by category]
         "78% of the spike was billing-related tickets.
          Cross-referencing with the release log..."
         [Canvas adds timeline overlay]
         "This correlates with the v3.79 release on March 18.
          The new org scope selector may have triggered
          confusion for users managing multiple organizations.
          Want me to pull sample tickets so you can see
          the specific complaints?"
User:    "Yes, show me the top 5"
Higgins: [Canvas shows ticket summaries alongside the chart]
```

**Multi-turn flow principles:**
- Higgins asks one question at a time — never overwhelms with a form
- Each step shows progress on the canvas so the user sees the work building
- The user can interrupt, redirect, or abort at any point
- Higgins confirms before executing consequential actions
- The final result is always presented for review before it's committed
- The entire flow is saved in conversation history and can be replayed or continued later

### 2.2.9 Conversation-to-Artifact Pipeline

Every conversation with Higgins is potentially generative. When dialogue produces something valuable — an analysis, a document, a visualization, a composite insight, a lesson learned — the user can capture it as a **first-class artifact** in the system.

This is not "download as PDF." This is the creation of persistent, searchable, reusable knowledge from the natural flow of work.

**What can become an artifact:**

| Conversation Output | Artifact Type | Stored As |
|-------------------|--------------|-----------|
| Analysis with charts and narrative | Strategic insight | Context Asset (type: analysis) |
| Generated presentation | Deliverable | Context Asset (type: document) + downloadable file |
| Lesson learned from a failed initiative | Organizational knowledge | Context Asset (type: insight) |
| Process documented through Q&A | Standard operating procedure | Context Asset (type: process) |
| Composite of pinned canvas items | Custom document | Context Asset (type: composite) + HTML/PDF export |
| Image + article created for thought leadership | Content package | Context Asset (type: content) + publishable format |
| Investigative analysis with data and conclusions | Decision record | Context Asset (type: decision) |
| Multi-turn agent configuration | Agent template | Agent definition (saveable and cloneable) |

**The save flow:**

```
User:    [Reviews pinned canvas items from a conversation]
User:    "Save this as a lesson learned"
Higgins: "I'll create an artifact from these 3 items:
          - The churn analysis chart
          - The root cause breakdown
          - Your decision to adjust the onboarding flow

          Title: 'Q1 Churn Root Cause — Onboarding Friction'
          Type: Lesson Learned
          Department: Support
          Visibility: Team (Support department members)

          Want me to adjust anything?"
User:    "Add a tag for 'onboarding' and make it org-wide"
Higgins: "Done. Saved as a context asset, visible to the
          full organization. I'll reference this in future
          conversations about churn or onboarding.

          Want to export a copy as well?"
User:    "Yes, PDF"
Higgins: [Canvas shows PDF preview + download link]
```

**Artifact properties:**

Every artifact created from a conversation carries:

| Property | Purpose |
|----------|---------|
| **Title** | User-provided or Higgins-suggested, always editable |
| **Type** | Categorization for search and context injection |
| **Source conversation** | Link back to the conversation that produced it |
| **Created by** | The user who initiated the creation |
| **Department** | Organizational scope for visibility and relevance |
| **Tags** | User-applied tags for discoverability |
| **Visibility** | Personal, department, or organization-wide |
| **Content** | The rendered artifact — HTML that preserves the layout of the canvas items |
| **Component items** | References to the individual canvas items that compose it |

**Artifacts feed back into the system:**

Once saved, artifacts become part of the organizational knowledge base:

- **Context injection** — Higgins can reference artifacts in future conversations: "Based on the lesson learned your team saved about onboarding friction, I'd recommend a different approach here."
- **Search** — Artifacts appear in platform-wide search results alongside agents, assets, and processes.
- **Agent knowledge** — Agents can be configured to draw on specific artifact collections as part of their context.
- **Audit trail** — The source conversation is always linked, so the reasoning and discussion that produced the artifact is preserved.

**Export formats:**

| Format | Use Case |
|--------|----------|
| HTML page | Stored within the platform, viewable by team members |
| PDF | Downloadable, printable, shareable outside the platform |
| Markdown | Portable, version-controllable, integrable with other tools |
| PowerPoint | For presentations assembled through conversation |
| Composite HTML | Multiple canvas items arranged as a single formatted document |

**The principle:** The conversation is the factory. The canvas is the workbench. Artifacts are the products. Nothing valuable should be lost because the user closed a tab.

---

## 2.3 Agent-Directed Composition

*How the agent assembles views, surfaces data from multiple modules, and restructures the interface around user intent*

The canvas is not a static page. It is a surface that Higgins composes in real-time based on what the user needs. This is the core differentiator between Insight 360 and every other enterprise platform: the interface assembles itself around intent, rather than requiring the user to navigate to pre-built pages and mentally stitch information together.

### 2.3.1 Composition Model

When Higgins responds to a user request, he determines what to show on the canvas by assembling **canvas blocks** — discrete, typed units of content that snap together into a coherent view.

**Canvas block types:**

| Block Type | What It Displays | Source |
|-----------|-----------------|--------|
| **Data table** | Rows from any module — agents, processes, OKRs, assets, conversations | Supabase via API |
| **Record detail** | Full detail view of a single entity with all fields and relationships | Supabase via API |
| **Metric card** | A single KPI with current value, trend indicator, and comparison period | Calculated from data |
| **Chart** | Bar, line, pie, area, sparkline, or timeline visualization | Generated from data |
| **Narrative** | Formatted text — analysis, summary, recommendation, explanation | LLM-generated |
| **Image** | AI-generated image, diagram, uploaded asset | Generation API or storage |
| **Document** | Formatted multi-section document (report, brief, proposal) | LLM-generated, rendered HTML |
| **Action card** | A proposed action with approve/edit/reject controls | Agent recommendation |
| **Comparison** | Side-by-side or overlay of two datasets, versions, or options | Composed from data |
| **Embed** | An existing Insight 360 page rendered within the canvas frame | Internal page |
| **External** | Web content preview, video embed, live data feed | External source |

**Blocks are composable.** A single canvas view can contain multiple blocks arranged by Higgins based on the nature of the response:

```
User: "How are our Q1 OKRs tracking?"

Canvas assembles:
┌─────────────────────────────────────────────┐
│  METRIC CARDS (row)                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │On    │ │At    │ │Behind│ │Over- │      │
│  │Track │ │Risk  │ │      │ │all   │      │
│  │  7   │ │  3   │ │  2   │ │ 72%  │      │
│  └──────┘ └──────┘ └──────┘ └──────┘      │
│                                             │
│  CHART                                      │
│  ┌─────────────────────────────────────┐   │
│  │  OKR Progress Over Time (line)      │   │
│  │  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  DATA TABLE                                 │
│  ┌─────────────────────────────────────┐   │
│  │  At-Risk OKRs         Status  Owner │   │
│  │  Revenue target        67%    Sales │   │
│  │  NPS improvement       45%    Supp  │   │
│  │  Onboarding time       58%    Ops   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  NARRATIVE                                  │
│  "The primary risk is the revenue target.   │
│   March pipeline suggests a recovery path   │
│   if the 4 deals in stage 3 close by Q-end."│
│                                             │
└─────────────────────────────────────────────┘
```

Higgins chose this composition — metric cards for the headline, a trend chart for trajectory, a filtered table for items needing attention, and a narrative that synthesizes the story. The user didn't navigate to an OKR dashboard and apply filters. They asked a question and received a composed answer.

### 2.3.2 Composition Strategies

Higgins selects a composition strategy based on the nature of the user's request:

| User Intent | Strategy | Canvas Composition |
|------------|----------|-------------------|
| **Status check** ("How are OKRs tracking?") | Summary → Detail | Metric cards + trend chart + at-risk table + narrative |
| **Investigation** ("Why did support tickets spike?") | Evidence chain | Timeline chart + correlation overlay + filtered data + root cause narrative |
| **Creation** ("Write a board presentation") | Iterative build | Document outline → full document with embedded charts and images |
| **Comparison** ("Compare Q1 to Q4") | Side-by-side | Parallel metric cards + comparative chart + delta narrative |
| **Decision support** ("Should we expand to healthcare?") | Framework | SCU ethical analysis + market data + pro/con + recommendation with confidence |
| **Exploration** ("Tell me about our agents") | Entity browse | Filtered grid + summary stats + category breakdown |
| **Action** ("Send the weekly briefing") | Confirmation → Result | Preview of what will be sent + approval controls → confirmation of delivery |

### 2.3.3 Cross-Module Assembly

The most powerful compositions draw from multiple modules simultaneously. This is where the Knowledge Navigator vision comes alive — the agent connects information that would otherwise require the user to visit 4 different pages and mentally synthesize.

**Example: "Prepare me for the board meeting on Friday"**

Higgins pulls from:

| Module | Data Retrieved | Used For |
|--------|---------------|----------|
| **Parthenon** | OKR status, process health scores | Strategic progress section |
| **Agents** | Active agent count, top-performing agents, recent failures | Operations section |
| **Context Assets** | Relevant strategic documents, prior board decks | Reference and continuity |
| **Conversations** | Key decisions made in recent executive chats | Decision log section |
| **Soul Config** | Organization values and current strategic themes | Framing and narrative voice |
| **Workflows** | Active workflow statuses, completion rates | Automation health |
| **Support** | CSAT trends, ticket volume, escalation rates | Customer health section |

The canvas shows a composite document: a board-ready presentation assembled from live data, formatted in the org's voice, with narrative sections that connect the numbers to the strategic story.

**Cross-module composition rules:**

- Higgins always cites which modules contributed to a composed view ("This includes data from Parthenon, Support, and your recent conversations")
- Each canvas block carries a source indicator — a subtle label showing where the data came from
- If a module is unavailable or returns an error, Higgins notes the gap rather than silently omitting ("I couldn't pull support metrics — the API timed out. The rest of the data is current.")
- Data freshness is indicated. If the user is viewing a composed view that includes data from 3 hours ago, the stalest timestamp is visible.

### 2.3.4 Canvas Layout Engine

The canvas arranges blocks according to a layout engine that follows consistent rules:

**Layout priorities:**
1. **Most important content first** — metric cards and key findings at the top, supporting detail below
2. **Visual hierarchy** — charts and images are wider; narrative text flows full-width; data tables scroll horizontally if needed
3. **Logical grouping** — related blocks cluster together (the chart about OKRs sits above the OKR data table, not separated by unrelated content)
4. **Responsive reflow** — on narrower screens, side-by-side blocks stack vertically. The reading order remains logical.

**Block sizing:**

| Block Type | Default Width | Height |
|-----------|--------------|--------|
| Metric card | 25% (4 across) | Fixed (~120px) |
| Chart | 100% or 50% (paired) | Aspect ratio preserved (~300px) |
| Data table | 100% | Content-driven, scrollable after 8 rows |
| Narrative | 100% | Content-driven |
| Image | 100% or 50% (with text) | Aspect ratio preserved |
| Document | 100% | Paginated or scrollable |
| Action card | 100% | Content-driven (~80px) |
| Comparison | 100% (split internally) | Content-driven |

**User override:** The user can resize and rearrange blocks within the canvas. Higgins suggests the layout; the user has final control. Rearranged layouts are remembered per conversation context — if the user pins the view, the custom arrangement persists.

### 2.3.5 Dynamic Canvas Updates

The canvas is not a one-shot render. As the conversation progresses, Higgins updates it:

**Additive updates** — New blocks are added below existing ones as the conversation deepens. "Now show me the breakdown by department" adds a department chart below the existing summary.

**Replacement updates** — When the user requests a change to existing content, the affected block updates in place. "Make that a bar chart instead of a line" swaps the chart block without disrupting the rest of the canvas.

**Refinement updates** — Higgins can update blocks proactively during a multi-step task. While generating a report, the document block may show progressive rendering — outline first, then sections filling in, then charts appearing as they're generated. The user sees the work building.

**All updates are animated.** New blocks slide in. Replaced content cross-fades. Removed content collapses smoothly. The user always understands what changed and where. (P12: Transparency of Process)

### 2.3.6 Canvas and Traditional Pages

The canvas can render existing Insight 360 pages as embedded views. When the user says "Show me the Parthenon" or navigates via the Command Palette, the canvas loads the Parthenon page content — not as a full page redirect, but as a canvas embed.

**This means:**
- The Higgins panel (in Mode A) remains visible alongside the embedded page
- The user can ask Higgins questions about what they're viewing ("What's the most at-risk process on this page?")
- Higgins has context about what the user is looking at and can offer relevant suggestions
- Traditional page features (filters, sorting, inline editing) work normally within the canvas frame

**When does a full page load occur instead?**
- On mobile, where the canvas is the full screen and there's no room for a companion panel
- When the user explicitly requests it ("Open Parthenon in a new tab")
- When the embedded page requires browser-level features (file uploads, print dialogs)
- During the transition period (Phase 1–2 of the navigation migration) when some pages haven't been adapted for canvas embedding

### 2.3.7 Composition Permissions

Higgins respects the same access controls as the rest of the platform:

- **Tier gating** — Canvas blocks that require modules not in the user's subscription tier are not rendered. Higgins explains: "I'd normally include churn analysis here, but that requires the Analytics module. Want to see upgrade options?"
- **Role gating** — Data the user's role can't access doesn't appear in composed views. If a manager asks for a board-level financial summary, Higgins shows what they can see and notes: "The full P&L breakdown is available to executive roles."
- **Org scoping** — All data in composed views is scoped to the user's organization. Cross-org data never leaks into a composition, even if Higgins is pulling from multiple modules.
- **Bright line enforcement** — Soul Config bright lines apply to compositions. If the org's bright lines prohibit showing individual employee performance data in aggregate views, Higgins complies and explains the restriction.

## 2.4 Trust & Control Patterns

*How approval, transparency, and human authority are expressed visually in the agentic context*

Trust is the product. Not dashboards, not AI, not analytics — trust. If the user doesn't trust what Higgins shows them, doesn't trust what Higgins recommends, and doesn't trust that Higgins won't act without permission, the platform fails regardless of how capable it is.

This section defines the visual and behavioral patterns that earn and maintain trust throughout the agent experience.

### 2.4.1 The Consequence Spectrum

Not all agent actions carry the same weight. The trust patterns scale based on the consequence of the action:

| Level | Description | Examples | Required Pattern |
|-------|------------|----------|-----------------|
| **Observe** | Higgins reads data, retrieves information, answers questions | "Show me Q1 OKRs", "What's our CSAT score?", "Summarize this document" | No confirmation. Immediate response. Source attribution on canvas. |
| **Suggest** | Higgins proposes an action or recommendation | "I'd recommend adjusting the pricing tier", "This OKR should be flagged at-risk" | Visual distinction from completed actions. Accept/dismiss controls. |
| **Create** | Higgins generates new content or records | "Draft a board presentation", "Create an agent for onboarding" | Preview before commit. Edit capability. Explicit "Create" / "Save" button. |
| **Modify** | Higgins changes existing data or content | "Update the process status to active", "Revise the executive summary" | Show diff (before/after). Confirm button. Undo available for 30 seconds. |
| **Communicate** | Higgins sends content to other people | "Send this briefing to the executive team", "Email this report to the board" | Full preview of what will be sent, to whom, and when. Explicit "Send" button. Cannot be undone — the confirmation makes this clear. |
| **Delete** | Higgins removes data | "Archive this agent", "Delete the draft workflow" | Danger styling. Explicit confirmation with impact statement ("This will remove the agent and its 12 conversations"). Type-to-confirm for bulk deletions. |
| **Automate** | Higgins sets up recurring or triggered actions | "Send weekly briefings every Monday", "Alert me when CSAT drops below 80" | Full specification review. Test run option. Pause/cancel always available. Audit log of every execution. |

### 2.4.2 Confirmation Patterns

**Inline confirmation (Suggest, Create, Modify):**

Confirmations appear within the conversation flow in the Higgins panel, not as modal interruptions. Higgins presents what he's about to do, and the user responds:

```
Higgins: "I've drafted the weekly briefing. Here's what I'll include:"
         [Canvas shows briefing preview]

         "Ready to save this as a context asset?"

         [ Save as Asset ]  [ Edit First ]  [ Discard ]
```

The action buttons are visually distinct:
- **Primary action** (Save, Send, Create) — solid fill, org primary color
- **Secondary action** (Edit, Revise, Adjust) — outlined, neutral
- **Destructive/dismiss** (Discard, Cancel, Delete) — text-only or danger-styled

**Modal confirmation (Communicate, Delete, Automate):**

High-consequence actions break out of the conversation flow into a focused confirmation overlay. This is deliberate friction — the user must explicitly acknowledge the stakes:

```
┌──────────────────────────────────────┐
│                                      │
│  Send Weekly Briefing                │
│                                      │
│  To: 5 recipients                    │
│  - jb@synergiai.io                   │
│  - emma.chen@healthylife.co          │
│  - taylor.rowe@healthylife.co        │
│  - alex.kumar@healthylife.co         │
│  - charlie.davis@healthylife.co      │
│                                      │
│  Content: Weekly Operations Briefing │
│  (March 17–21, 2026)                 │
│                                      │
│  [Preview Full Email]                │
│                                      │
│  This cannot be unsent once          │
│  delivered.                          │
│                                      │
│  [ Cancel ]        [ Send Now ]      │
│                                      │
└──────────────────────────────────────┘
```

### 2.4.3 Transparency Indicators

Every piece of information Higgins presents carries signals that help the user evaluate trustworthiness:

**Source attribution:**

Canvas blocks display a subtle source label:

```
┌─────────────────────────────────────────┐
│  Q1 Revenue Trend                       │
│  ┌───────────────────────────────────┐  │
│  │  [chart content]                  │  │
│  └───────────────────────────────────┘  │
│  Source: Parthenon OKRs · Updated 2h ago│
└─────────────────────────────────────────┘
```

| Indicator | Meaning | Visual |
|-----------|---------|--------|
| **Source module** | Where the data came from | Small text label below the block |
| **Data freshness** | When the data was last updated | Relative timestamp ("2h ago", "live", "Mar 18") |
| **Confidence** | Higgins's confidence in AI-generated analysis | Subtle indicator for generated content: "Based on available data" vs. "Verified against source records" |
| **Generation indicator** | Whether content was retrieved or generated | Small icon distinguishing "pulled from database" vs. "generated by AI" |

**Reasoning on request:**

The user can always ask "why?" and Higgins explains his reasoning. But the interface also supports a non-conversational path: a subtle expand control on any recommendation or analysis that reveals Higgins's reasoning:

```
Higgins: "I'd recommend moving this OKR to at-risk status."

         [ Accept ]  [ Dismiss ]

         ▸ Why this recommendation?

         [expanded:]
         ▾ Why this recommendation?
         "Progress is at 45% with 3 weeks remaining.
          Historical velocity suggests 62% completion
          by quarter end. The owner hasn't updated
          status in 12 days. Similar OKRs that reached
          this state recovered only 23% of the time."
```

### 2.4.4 Agent vs. Human Attribution

The interface must always make clear what Higgins produced vs. what a human authored. This prevents the user from treating AI-generated analysis as verified fact, and ensures accountability is correctly assigned.

| Content Origin | Visual Treatment |
|---------------|-----------------|
| **Higgins-generated text** | Subtle left-border accent (agent color). Avatar indicator at the start. |
| **Higgins-generated data visualization** | "Generated" indicator. Data source cited separately. |
| **Human-authored content** | No special indicator — this is the default |
| **Mixed** (human wrote, Higgins revised) | Indicates collaboration: "Edited by Higgins from your draft" |
| **Higgins-retrieved data** | No generation indicator — the data is from the database, Higgins just surfaced it |

The key distinction: **retrieved data is treated as fact** (it came from the organization's own records). **Generated content is treated as a proposal** (it came from an LLM and warrants human review). The visual treatment reinforces this difference.

### 2.4.5 Override and Correction

The user can always override Higgins. The interface makes this easy and consequence-free:

**Editing generated content:** Any content Higgins produces on the canvas is editable. Click to enter edit mode. Changes are saved as the user's version. Higgins acknowledges: "Got it — I've noted your correction. I'll use this approach next time."

**Rejecting recommendations:** Dismissing a suggestion is one click. Higgins doesn't argue or re-suggest the same thing. If the user wants to understand why Higgins recommended something, the reasoning is available (2.4.3), but dismissal is always honored immediately.

**Correcting factual errors:** If Higgins presents incorrect information, the user can flag it. A "This isn't right" control on any canvas block opens a brief correction flow:

```
User clicks: "This isn't right" on a metric card

Higgins: "What's wrong with this data?"

         ( ) The number is incorrect
         ( ) The source is wrong
         ( ) This is outdated
         ( ) Other

         [User selects and optionally adds a note]

Higgins: "Thank you — I've flagged this for review.
          I pulled this from the Parthenon OKRs table.
          If the underlying data is wrong, it should
          be corrected there. Want me to open it?"
```

**Stopping in-progress work:** When Higgins is executing a multi-step task, a prominent "Stop" control is always visible. Stopping is immediate and non-destructive — work completed so far is preserved, and the user can resume or discard.

### 2.4.6 Audit and Accountability

Every consequential action Higgins takes is logged and reviewable:

**Action log:** Accessible from the user's profile or a dedicated "Activity" view, the action log shows:

| Field | Content |
|-------|---------|
| **Timestamp** | When the action occurred |
| **Action** | What happened ("Created agent", "Sent briefing", "Modified OKR status") |
| **Initiated by** | The user who requested it |
| **Executed by** | "Higgins" (the agent) |
| **Approved by** | The user who confirmed (may be the same as initiator) |
| **Scope** | What was affected (specific records, recipients, etc.) |
| **Reversible** | Whether the action can be undone, and until when |
| **Source conversation** | Link to the conversation where the action originated |

**For automated actions** (scheduled briefings, triggered alerts), the log includes every execution with its outcome. The user can review, pause, or cancel any automation at any time.

**Organizational audit trail:** Platform admins and users with appropriate roles can view the audit log across their organization. This supports compliance requirements and organizational accountability. The audit trail is append-only — entries cannot be modified or deleted.

### 2.4.7 Fallback Transparency

When the system can't perform as expected, the user knows exactly what's happening:

| Situation | What Higgins Shows |
|-----------|-------------------|
| **LLM provider unavailable** | "Claude is currently unavailable. I'm using GPT-4o for this response. Quality may differ slightly for complex reasoning tasks." |
| **Fallback to a different model** | "I used Haiku for speed on this lookup. Want me to re-run it with Opus for a deeper analysis?" |
| **Partial data** | "I was able to pull data from Parthenon and Support, but the Workflow API timed out. This view is incomplete — the workflow status section is missing." |
| **Rate limited** | "I've hit the API rate limit. Your request is queued and will complete in approximately 30 seconds." Visible countdown or progress indicator. |
| **Confidence uncertainty** | "I'm not confident in this analysis — the data set is small (12 records) and the trend may not be statistically significant. I'd recommend waiting for more data before acting on this." |
| **Feature not available** | "I can't generate images yet in Insight 360 — that capability is on the roadmap. Want me to describe the image so you can create it externally?" |

The pattern is always: **what happened** + **why** + **what you can do instead**. Never just a spinner, never just "Something went wrong." (P9: No Dead Ends, P12: Transparency of Process)

## 2.5 Soul Config Expression

*How an organization's values, voice, and personality manifest across the full UI experience beyond the agent character*

Soul Configuration is what transforms Insight 360 from a generic AI platform into *each organization's own* Knowledge Navigator. Section 2.1.5 covered how Soul Config shapes Higgins's character. This section defines how Soul Config permeates the entire interface — not just the agent, but the canvas, the composition logic, the language, and the ethical guardrails that the user encounters everywhere.

### 2.5.1 The Expression Hierarchy

Soul Config influences the interface at four levels, from most visible to most structural:

| Level | What It Affects | How the User Experiences It |
|-------|----------------|---------------------------|
| **Voice** | All text Higgins generates — greetings, responses, suggestions, error messages, narrative blocks | The agent sounds like *their* organization, not like a generic AI. A coaching firm's Higgins is warm and growth-oriented. A healthcare org's Higgins is precise and empathetic. A financial services firm's Higgins is measured and compliance-aware. |
| **Values** | How Higgins weighs recommendations, what ethical lenses he applies, what he proactively surfaces | When presenting a decision, Higgins frames the analysis through the org's value priorities. An org that prioritizes "Common Good" sees community impact analysis. An org that prioritizes "Rights" sees individual impact. |
| **Guardrails** | What Higgins will and won't do — the boundaries of agent behavior | The org sets bright lines ("never recommend reducing headcount without HR review") and Higgins respects them visibly. If a request approaches a guardrail, the user sees why and what alternatives exist. |
| **Domain** | The knowledge, terminology, and industry context Higgins brings to every interaction | A healthcare org's Higgins knows HIPAA terminology. A consulting firm's Higgins knows client engagement frameworks. The domain context makes conversations efficient — the user doesn't have to explain their industry every time. |

### 2.5.2 Voice Expression in the Interface

The org's voice profile (defined in Soul Config) governs all generated text. This goes beyond Higgins's conversational responses — it shapes every piece of text the system produces:

**Scope of voice application:**

| Interface Element | Voice Influence |
|------------------|----------------|
| **Higgins greetings** | Tone, formality, warmth level, whether to lead with a task or a check-in |
| **Canvas narratives** | Writing style in generated analyses, reports, summaries |
| **Suggestions and recommendations** | How advice is framed — directive ("You should...") vs. advisory ("You might consider...") vs. exploratory ("One approach could be...") |
| **Error and fallback messages** | Empathy level, technical detail, formality of recovery language |
| **Command Palette suggestions** | How Higgins phrases contextual suggestions in the palette |
| **Generated documents** | Tone and structure of board presentations, briefings, reports |
| **Email and communication drafts** | Voice calibrated to the org's external communication style |

**Voice is not cosmetic.** It shapes how recommendations land. A coaching firm that values direct, empowering language will receive "Here's what's working and where to push harder" rather than "Performance metrics indicate suboptimal achievement rates in the following areas." Same data, different experience.

**Voice calibration settings (from Soul Config):**

| Dimension | Range | Effect |
|-----------|-------|--------|
| **Formality** | Casual → Conversational → Professional → Formal | Word choice, sentence structure, greeting style |
| **Warmth** | Analytical → Balanced → Warm → Nurturing | Emotional resonance, empathy expression, personal acknowledgment |
| **Directness** | Exploratory → Advisory → Direct → Assertive | How strongly recommendations are stated |
| **Technical depth** | Simple → Moderate → Detailed → Expert | Terminology level, explanation density, assumption about user knowledge |
| **Humor** | None → Occasional → Regular | Whether Higgins uses wit, metaphor, or lightness |

### 2.5.3 Values Expression in Decisions

When Higgins presents analysis or recommendations, the org's SCU ethical lens priorities shape the framing:

**How it works in practice:**

```
User: "Should we cut the free tier to improve margins?"

Org with Justice + Common Good priority:
Higgins: "Cutting the free tier improves margins by ~18%, but
          it removes access for 340 users who may not be able
          to afford paid plans. Your values prioritize equitable
          access. Consider: could a reduced free tier preserve
          access while improving economics?"

Org with Utilitarian + Virtue priority:
Higgins: "Cutting the free tier improves margins by ~18% and
          focuses resources on users who are most engaged.
          The question is whether this decision reflects the
          kind of company you want to be. Your values emphasize
          excellence and integrity — does this serve both?"
```

Same data. Same question. Different framing based on what the organization has declared matters most. The user always gets the facts — the values influence how the analysis is presented, never what data is shown.

**Values are visible, not hidden.** When Higgins applies an ethical lens, the user can see it:

```
Higgins: "Here's my analysis of the pricing change."
         [Canvas shows full analysis]

         Values lens: Justice, Common Good
         ▸ Why these lenses?
```

Expanding reveals: "Your organization's Soul Config prioritizes Justice and Common Good. I weighed equitable access and community impact most heavily in this recommendation. You can adjust these priorities in Soul Configuration."

This transparency prevents the perception that the AI is secretly imposing values. The user knows what lenses are active and can change them.

### 2.5.4 Guardrail Expression

Guardrails are not silent restrictions — they are visible boundaries that protect the organization's values:

**When a request approaches a guardrail:**

```
User: "Draft a message to all clients announcing a 40% price increase
       effective immediately."

Higgins: "I can help with the pricing announcement, but I want to
          flag two guardrails:

          ■ Bright line: 'No pricing changes exceeding 20% without
            executive and finance review' — this change exceeds
            that threshold.

          ■ Guardrail: 'All client-facing communications require
            48-hour review period' — 'effective immediately'
            bypasses this.

          Options:
          [ Draft with 20% increase ]
          [ Draft at 40% for executive review ]
          [ Override guardrails (requires admin) ]"
```

**Guardrail visual language:**

| Guardrail Type | Visual Treatment | Behavior |
|---------------|-----------------|----------|
| **Bright line** (hard stop) | Red accent, stop icon | Cannot be overridden by the user. Requires platform admin or org admin escalation. Logged as a bright line incident. |
| **Guardrail** (soft boundary) | Amber accent, warning icon | Can be overridden with acknowledgment. Override is logged. Higgins explains the risk. |
| **Guidance** (recommendation) | Blue accent, info icon | Informational. The user can proceed without acknowledgment. Not logged unless the user requests it. |

**Guardrails are never surprising.** If the user is about to hit a guardrail during a multi-step task, Higgins surfaces it early: "Before we finalize this, I want to flag that sending it to all clients will trigger the communication review guardrail. Want to adjust the scope now, or proceed to the review step?"

### 2.5.5 Domain Expression

The org's domain configuration (industry, terminology, priorities) makes Higgins contextually intelligent:

**Terminology mapping:**

Soul Config includes a domain terminology section that maps generic terms to org-specific language. This isn't just cosmetic — it changes how Higgins understands requests and how he presents information.

| Generic Term | Coaching Firm | Healthcare Org | Financial Services |
|-------------|--------------|----------------|-------------------|
| "Customer" | "Client" | "Patient" | "Account holder" |
| "Revenue" | "Practice income" | "Revenue" | "AUM-based fees" |
| "Support ticket" | "Client concern" | "Patient inquiry" | "Service request" |
| "Churn" | "Client departure" | "Patient attrition" | "Account closure" |
| "Onboarding" | "Enrollment" | "Patient intake" | "Account opening" |

Higgins uses the org's terminology in all generated content. When the user says "How's our churn rate?", Higgins responds with the right term: "Client departures are down 12% this quarter" for a coaching firm.

**Industry context:**

Domain configuration includes industry-specific knowledge that Higgins applies automatically:

- **Compliance awareness** — A healthcare org's Higgins knows that patient data references require HIPAA considerations. He won't generate a report that includes patient names without flagging it.
- **Seasonal patterns** — A coaching firm's Higgins knows that January is peak enrollment season. His Q1 suggestions account for this.
- **Regulatory calendars** — A financial services org's Higgins knows reporting deadlines and surfaces them proactively.

### 2.5.6 Visual Theming Through Soul Config

Soul Config can influence the visual presentation within defined bounds:

**What the org can customize:**

| Element | Customizable? | Bounds |
|---------|:------------:|--------|
| **Primary accent color** | Yes | Must meet WCAG AA contrast ratios against the platform's dark and light backgrounds |
| **Organization logo** | Yes | Appears in the Command Palette header and exported documents. Size and placement are standardized. |
| **Higgins greeting style** | Yes | Task-focused, warm check-in, or data-forward. Affects the opening message, not the visual layout. |
| **Module naming** | Limited | Orgs can set display names for modules in their navigation ("Our Playbook" instead of "Parthenon"). The URL and data model remain unchanged. |

**What the org cannot customize:**

| Element | Why |
|---------|-----|
| **Layout structure** | The two-panel architecture, canvas block system, and Command Palette are platform standards. Custom layouts would break consistency and make support impossible. |
| **Typography** | Source Sans 3 and Orbitron are platform fonts. Custom fonts would break the design token system and create rendering inconsistencies. |
| **Higgins's visual character** | The Pixar-quality animated style is the platform identity. No photorealistic replacements, no corporate logos as avatars. (See 2.1.1) |
| **Component behavior** | How buttons, modals, cards, and tables behave is governed by the design system, not by org preference. |
| **Trust patterns** | Confirmation flows, consequence levels, and audit logging cannot be relaxed by org configuration. These are platform-level trust guarantees. |

This boundary is intentional. Soul Config makes the *experience* feel like the organization's own. The *infrastructure* — layout, interaction, trust — remains consistent so that platform quality, accessibility, and security are guaranteed regardless of configuration.

### 2.5.7 Soul Config Completeness and the Experience

The richness of the Soul Config directly affects the quality of the Higgins experience. An org with a fully configured Soul Config gets a deeply personalized Knowledge Navigator. An org with minimal configuration gets a competent but generic assistant.

**The interface communicates this:**

| Completeness | Higgins Behavior | User Signal |
|-------------|-----------------|-------------|
| **0–25%** | Generic responses. No domain context. No ethical framing. Default voice. | Higgins proactively suggests: "I can be much more helpful if we set up your organization's values and voice. Want to start?" Links to Soul Config wizard. |
| **25–50%** | Some personalization. Voice is calibrated. Values may not be set. | Occasional prompts: "I noticed your organization hasn't defined bright lines yet. Want me to suggest some based on your industry?" |
| **50–75%** | Good personalization. Voice, values, and some domain context active. | Full experience with occasional gaps noted: "I don't have domain-specific terminology for your industry yet. I'll use standard terms." |
| **75–100%** | Full Knowledge Navigator experience. Deep personalization across all dimensions. | No prompts. Seamless integration of voice, values, domain, and guardrails into every interaction. |

The completeness indicator appears in the Soul Config admin page, not in the daily user experience. The user shouldn't see a "completeness bar" — they should just feel the quality improving as configuration deepens.

---

*End of Part 2 — The Agent Experience Layer*

---

# Part 3 — Design Tokens

*The atomic visual building blocks*

> Design tokens are the single source of truth for every visual decision in the system. No color, spacing value, shadow, font size, or timing curve should exist in code that isn't defined here. If a value appears in CSS without a token reference, it's a defect.

## 3.1 Token Architecture

Tokens are organized in three tiers. Each tier builds on the one below it, creating a system where a single change at the foundation propagates consistently through the entire interface.

```
Tier 3: Component Tokens    (what a specific element uses)
   ↑
Tier 2: Semantic Tokens      (what a value means)
   ↑
Tier 1: Primitive Tokens     (raw values with no meaning)
```

**Tier 1 — Primitives:** Raw values. A color hex, a pixel count, a millisecond duration. These have no semantic meaning — `indigo-500` is just a color, not "the primary brand color." Primitives are never used directly in components.

**Tier 2 — Semantics:** Named by purpose. `--color-primary` means "the brand's primary interactive color." It *references* a primitive (`indigo-500`) but can be repointed without changing every component. Semantic tokens are what theme switching operates on — dark mode changes the semantic mapping, not every component.

**Tier 3 — Components:** Scoped to specific elements. `--button-bg-primary` references `--color-primary`. This tier exists so that a button's background can diverge from the global primary color if needed, without breaking the semantic layer.

**Current state:** The existing `styles.css` uses a partial semantic token system (`:root` variables). Part 3 formalizes this into the three-tier architecture and fills gaps — particularly around the new Higgins 2.0 elements (canvas blocks, Command Palette, agent presence indicators).

## 3.2 Color Tokens

### 3.2.1 Primitive Colors

The primitive palette. These values are never used directly in components — they exist only to be referenced by semantic tokens.

**Core palette:**

| Token | Value | Usage |
|-------|-------|-------|
| `--p-indigo-50` | `#eef2ff` | Lightest indigo tint |
| `--p-indigo-100` | `#e0e7ff` | |
| `--p-indigo-200` | `#c7d2fe` | |
| `--p-indigo-300` | `#a5b4fc` | |
| `--p-indigo-400` | `#818cf8` | Current `--primary-light` |
| `--p-indigo-500` | `#6366f1` | Current `--primary` |
| `--p-indigo-600` | `#4f46e5` | Current `--primary-dark` |
| `--p-indigo-700` | `#4338ca` | |
| `--p-indigo-800` | `#3730a3` | |
| `--p-indigo-900` | `#312e81` | |

**Extended palette:**

| Group | 400 | 500 | 600 | Notes |
|-------|-----|-----|-----|-------|
| **Violet** | `#a78bfa` | `#8b5cf6` | `#7c3aed` | Current `--secondary` |
| **Cyan** | `#22d3ee` | `#06b6d4` | `#0891b2` | Current `--accent` |
| **Emerald** | `#34d399` | `#10b981` | `#059669` | Current `--success` |
| **Amber** | `#fbbf24` | `#f59e0b` | `#d97706` | Current `--warning` |
| **Red** | `#f87171` | `#ef4444` | `#dc2626` | Current `--danger` |
| **Blue** | `#60a5fa` | `#3b82f6` | `#2563eb` | Current `--info` |

**Neutral palette (dark theme base):**

| Token | Value | Notes |
|-------|-------|-------|
| `--p-neutral-950` | `#0f0f1a` | Current `--bg-primary` |
| `--p-neutral-900` | `#1a1a2e` | Current `--bg-secondary` |
| `--p-neutral-800` | `#252540` | Current `--bg-tertiary` |
| `--p-neutral-700` | `#2a2a40` | Current `--border` |
| `--p-neutral-600` | `#3a3a55` | Current `--border-light` |
| `--p-neutral-500` | `#6b6b80` | Current `--text-muted` |
| `--p-neutral-400` | `#a0a0b0` | Current `--text-secondary` |
| `--p-neutral-50` | `#ffffff` | Current `--text-primary` (dark) |

**Neutral palette (light theme base):**

| Token | Value | Notes |
|-------|-------|-------|
| `--p-neutral-l-50` | `#ffffff` | Current light `--bg-primary` |
| `--p-neutral-l-100` | `#f8f9fa` | Current light `--bg-secondary` |
| `--p-neutral-l-200` | `#e9ecef` | Current light `--bg-tertiary` |
| `--p-neutral-l-300` | `#dee2e6` | Current light `--border` |
| `--p-neutral-l-900` | `#1a1a2e` | Current light `--text-primary` |

### 3.2.2 Semantic Color Tokens

These tokens define *purpose*, not *appearance*. Theme switching changes the mapping from semantic to primitive — components never need to know which theme is active.

**Brand:**

| Token | Dark Theme Maps To | Light Theme Maps To | Purpose |
|-------|-------------------|--------------------|---------|
| `--color-primary` | `--p-indigo-500` | `--p-indigo-500` | Primary brand and interactive color |
| `--color-primary-hover` | `--p-indigo-600` | `--p-indigo-600` | Hover state for primary elements |
| `--color-primary-light` | `--p-indigo-400` | `--p-indigo-400` | Lighter variant for accents, glows |
| `--color-primary-muted` | `rgba(99,102,241,0.15)` | `rgba(99,102,241,0.08)` | Tinted backgrounds, selected states |
| `--color-secondary` | `--p-violet-500` | `--p-violet-500` | Secondary brand accent |

**Surfaces:**

| Token | Dark | Light | Purpose |
|-------|------|-------|---------|
| `--surface-base` | `--p-neutral-950` | `--p-neutral-l-50` | Page background |
| `--surface-raised` | `--p-neutral-900` | `--p-neutral-l-100` | Cards, panels, sidebar |
| `--surface-overlay` | `--p-neutral-800` | `--p-neutral-l-200` | Modals, dropdowns, Command Palette |
| `--surface-sunken` | `#0d0d14` | `--p-neutral-l-200` | Code blocks, inset areas |
| `--surface-canvas` | `--p-neutral-950` | `--p-neutral-l-50` | The main canvas area |
| `--surface-higgins` | `--p-neutral-900` | `--p-neutral-l-100` | The Higgins conversation panel |

**Text:**

| Token | Dark | Light | Purpose |
|-------|------|-------|---------|
| `--text-primary` | `--p-neutral-50` | `--p-neutral-l-900` | Headings, primary content |
| `--text-secondary` | `--p-neutral-400` | `#4a4a5a` | Descriptions, secondary labels |
| `--text-muted` | `--p-neutral-500` | `--p-neutral-500` | Timestamps, metadata, hints |
| `--text-inverse` | `--p-neutral-l-900` | `--p-neutral-50` | Text on filled/primary backgrounds |
| `--text-on-primary` | `#ffffff` | `#ffffff` | Text on primary-colored backgrounds |

**Borders:**

| Token | Dark | Light | Purpose |
|-------|------|-------|---------|
| `--border-default` | `--p-neutral-700` | `--p-neutral-l-300` | Standard borders on cards, inputs, dividers |
| `--border-subtle` | `--p-neutral-600` | `--p-neutral-l-200` | Lighter separators within components |
| `--border-focus` | `--color-primary` | `--color-primary` | Focus rings on interactive elements |

**Status:**

| Token | Value | Purpose |
|-------|-------|---------|
| `--status-success` | `--p-emerald-500` | Positive outcomes, completion, health |
| `--status-warning` | `--p-amber-500` | Caution, at-risk, approaching limits |
| `--status-danger` | `--p-red-500` | Errors, failures, destructive actions |
| `--status-info` | `--p-blue-500` | Informational, neutral notices |
| `--status-success-muted` | `rgba(16,185,129,0.15)` | Background tint for success states |
| `--status-warning-muted` | `rgba(245,158,11,0.15)` | Background tint for warning states |
| `--status-danger-muted` | `rgba(239,68,68,0.15)` | Background tint for danger states |
| `--status-info-muted` | `rgba(59,130,246,0.15)` | Background tint for info states |

**Agent-specific:**

| Token | Value | Purpose |
|-------|-------|---------|
| `--agent-accent` | `--p-cyan-500` | Higgins's signature color — used for agent indicators, left borders on agent messages, glow effects |
| `--agent-accent-muted` | `rgba(6,182,212,0.15)` | Background tint for agent-attributed content |
| `--agent-avatar-glow` | `rgba(6,182,212,0.3)` | Ambient glow around Higgins avatar |
| `--agent-thinking` | `--p-violet-400` | Thinking/processing state indicator |

**Guardrail-specific (from 2.5.4):**

| Token | Value | Purpose |
|-------|-------|---------|
| `--guardrail-bright-line` | `--status-danger` | Bright line indicators — hard stops |
| `--guardrail-soft` | `--status-warning` | Soft guardrail indicators — overridable |
| `--guardrail-guidance` | `--status-info` | Guidance indicators — informational |

### 3.2.3 Org-Customizable Color Token

Soul Config allows organizations to set a primary accent color (see 2.5.6). This maps to a single override:

| Token | Default | Org Override |
|-------|---------|-------------|
| `--color-org-accent` | `--color-primary` | Org-defined color (validated for WCAG AA) |

`--color-org-accent` is used in:
- Command Palette header accent
- Org logo area background tint
- Exported document header color
- Agent avatar ambient glow (replaces `--agent-avatar-glow` hue)

It is **not** used for buttons, links, focus rings, or status indicators — those remain governed by the platform design system to ensure accessibility and consistency.

## 3.3 Typography Tokens

### 3.3.1 Font Families

| Token | Value | Purpose |
|-------|-------|---------|
| `--font-body` | `'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | All body text, labels, descriptions |
| `--font-heading` | `'Orbitron', 'Source Sans 3', sans-serif` | Page titles, section headings, brand elements |
| `--font-mono` | `'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', monospace` | Code blocks, technical data, raw values |

### 3.3.2 Type Scale

A modular scale based on 1rem (16px) base with a 1.25 ratio. All sizes are in `rem` to support dynamic text sizing (P4: Accessibility).

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `--text-xs` | `0.75rem` (12px) | 1.5 | 400 | Metadata, timestamps, fine print |
| `--text-sm` | `0.875rem` (14px) | 1.5 | 400 | Secondary labels, table cells, help text |
| `--text-base` | `1rem` (16px) | 1.6 | 400 | Body text, descriptions, default |
| `--text-md` | `1.125rem` (18px) | 1.5 | 500 | Emphasized body, card titles |
| `--text-lg` | `1.25rem` (20px) | 1.4 | 600 | Section headings, modal titles |
| `--text-xl` | `1.5rem` (24px) | 1.3 | 600 | Page subtitles, dashboard card headings |
| `--text-2xl` | `1.75rem` (28px) | 1.2 | 700 | Page titles |
| `--text-3xl` | `2rem` (32px) | 1.2 | 700 | Hero metrics, large display numbers |
| `--text-4xl` | `2.5rem` (40px) | 1.1 | 700 | Dashboard hero numbers, landing page headlines |

### 3.3.3 Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `--weight-light` | `300` | Large display text where lightness adds elegance |
| `--weight-normal` | `400` | Body text, default |
| `--weight-medium` | `500` | Emphasized text, card titles, button text |
| `--weight-semibold` | `600` | Section headings, strong emphasis |
| `--weight-bold` | `700` | Page titles, hero numbers |

### 3.3.4 Agent Conversation Typography

Within the Higgins panel, typography has specific rules:

| Element | Font | Size Token | Weight | Notes |
|---------|------|-----------|--------|-------|
| **User message** | `--font-body` | `--text-base` | `--weight-normal` | Standard body text |
| **Agent message** | `--font-body` | `--text-base` | `--weight-normal` | Same size as user — agent doesn't dominate visually |
| **Agent emphasis** | `--font-body` | `--text-base` | `--weight-semibold` | For key points, recommendations |
| **Inline code** | `--font-mono` | `--text-sm` | `--weight-normal` | Technical references within conversation |
| **Canvas block title** | `--font-body` | `--text-md` | `--weight-semibold` | Titles on chart blocks, data tables |
| **Canvas metric value** | `--font-heading` | `--text-3xl` | `--weight-bold` | Large numbers in metric cards |
| **Canvas metric label** | `--font-body` | `--text-sm` | `--weight-normal` | Label below metric value |
| **Source attribution** | `--font-body` | `--text-xs` | `--weight-normal` | "Source: Parthenon · 2h ago" |

## 3.4 Spacing Tokens

### 3.4.1 Spacing Scale

A consistent spacing scale used for all margins, paddings, and gaps. Based on a 4px unit grid.

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `--space-1` | `0.25rem` | 4px | Tight spacing — between icon and label, inline element gaps |
| `--space-2` | `0.5rem` | 8px | Compact spacing — inside small components, between related items |
| `--space-3` | `0.75rem` | 12px | Default inner padding for compact components |
| `--space-4` | `1rem` | 16px | Standard spacing — default padding, list item gaps |
| `--space-5` | `1.25rem` | 20px | Moderate spacing |
| `--space-6` | `1.5rem` | 24px | Section gaps, card padding, grid gaps between cards |
| `--space-8` | `2rem` | 32px | Page content padding, large section gaps |
| `--space-10` | `2.5rem` | 40px | Hero section padding |
| `--space-12` | `3rem` | 48px | Major section separators |
| `--space-16` | `4rem` | 64px | Page-level vertical spacing |

**Backward compatibility:** The existing `--spacing-*` tokens map to this scale:

| Legacy Token | New Token |
|-------------|-----------|
| `--spacing-xs` | `--space-1` |
| `--spacing-sm` | `--space-2` |
| `--spacing-md` | `--space-4` |
| `--spacing-lg` | `--space-6` |
| `--spacing-xl` | `--space-8` |
| `--spacing-2xl` | `--space-12` |

### 3.4.2 Layout-Specific Spacing

| Token | Value | Purpose |
|-------|-------|---------|
| `--page-padding` | `--space-8` (2rem) | Standard content padding on all pages |
| `--card-padding` | `--space-6` (1.5rem) | Internal padding of card components |
| `--card-gap` | `--space-6` (1.5rem) | Gap between cards in a grid |
| `--section-gap` | `--space-8` (2rem) | Gap between major page sections |
| `--input-padding-x` | `--space-4` (1rem) | Horizontal padding inside text inputs |
| `--input-padding-y` | `--space-2` (0.5rem) | Vertical padding inside text inputs |
| `--higgins-panel-padding` | `--space-4` (1rem) | Internal padding of the Higgins conversation panel |
| `--canvas-block-gap` | `--space-6` (1.5rem) | Gap between canvas blocks |
| `--canvas-block-padding` | `--space-6` (1.5rem) | Internal padding within a canvas block |

## 3.5 Elevation Tokens

Elevation creates depth hierarchy through shadows and layering. Higher elevation = more prominent = closer to the user.

### 3.5.1 Shadow Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift — input fields, flat cards |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` | Cards, raised surfaces |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)` | Dropdowns, popovers |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)` | Modals, Command Palette |
| `--shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)` | Full-screen overlays, high-priority elements |

### 3.5.2 Elevation Levels

| Level | Shadow Token | Z-Index | Elements |
|-------|-------------|---------|----------|
| **0 — Base** | none | `auto` | Page background, canvas surface |
| **1 — Raised** | `--shadow-sm` | `1` | Cards, Higgins panel, canvas blocks |
| **2 — Floating** | `--shadow-md` | `10` | Dropdowns, tooltips, popovers |
| **3 — Overlay** | `--shadow-lg` | `100` | Command Palette, modals, confirmation dialogs |
| **4 — Priority** | `--shadow-xl` | `1000` | Toast notifications, system alerts |

**Z-index scale:**

| Token | Value | Purpose |
|-------|-------|---------|
| `--z-base` | `1` | Raised cards and panels |
| `--z-sticky` | `5` | Sticky headers, pinned elements |
| `--z-dropdown` | `10` | Dropdown menus, tooltips |
| `--z-overlay` | `100` | Command Palette, modals |
| `--z-toast` | `1000` | Toast notifications |
| `--z-higgins-ambient` | `900` | Higgins ambient avatar (Mode C) — always above page content, below modals |

## 3.6 Border Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Small elements — tags, badges, inline indicators |
| `--radius-md` | `8px` | Default — cards, inputs, buttons, canvas blocks |
| `--radius-lg` | `12px` | Modals, Command Palette, larger containers |
| `--radius-xl` | `16px` | Hero cards, feature panels |
| `--radius-full` | `9999px` | Pills, circular avatars, rounded badges |

## 3.7 Motion Tokens

### 3.7.1 Duration

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-instant` | `100ms` | Micro-interactions — checkbox, toggle, hover color |
| `--duration-fast` | `150ms` | Button state changes, focus rings, icon swaps |
| `--duration-base` | `200ms` | Standard transitions — panel show/hide, card expand |
| `--duration-moderate` | `300ms` | Complex transitions — Command Palette open, canvas block entrance |
| `--duration-slow` | `500ms` | Large-scale layout shifts — Higgins panel slide, canvas recomposition |
| `--duration-deliberate` | `800ms` | Celebration animations, Higgins state change expressions |

### 3.7.2 Easing

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard easing — most transitions |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Elements exiting the viewport |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering the viewport |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful entrances — canvas blocks appearing, success animations |

### 3.7.3 Reduce Motion

When the user has `prefers-reduced-motion: reduce` enabled:

- All `--duration-*` tokens resolve to `0ms` except `--duration-instant` (which remains for state changes that need visual feedback)
- `--ease-spring` resolves to `--ease-default` (no bounce)
- Canvas block entrances use opacity fade only, no slide
- Higgins avatar state changes are instant, no animated transitions
- The agent thinking indicator uses a static icon instead of an animated pulse

## 3.8 Size Tokens

### 3.8.1 Interactive Target Sizes

Per P4 (Accessibility), all interactive elements meet minimum touch/click targets:

| Token | Value | Usage |
|-------|-------|-------|
| `--target-min` | `28px` | Absolute minimum — icon buttons in dense contexts |
| `--target-comfortable` | `36px` | Default — most buttons, links, interactive elements |
| `--target-touch` | `44px` | Mobile and touch-first — primary actions, navigation targets |

### 3.8.2 Layout Dimensions

| Token | Value | Purpose |
|-------|-------|---------|
| `--sidebar-width` | `260px` | Legacy sidebar (transition period) |
| `--higgins-panel-width` | `380px` | Higgins conversation panel (Mode A) |
| `--higgins-panel-min` | `300px` | Minimum resized width for Higgins panel |
| `--higgins-panel-max` | `500px` | Maximum resized width for Higgins panel |
| `--higgins-avatar-ambient` | `40px` | Ambient avatar size (Mode C, desktop) |
| `--higgins-avatar-ambient-tablet` | `36px` | Ambient avatar size (Mode C, tablet) |
| `--higgins-avatar-ambient-mobile` | `32px` | Ambient avatar size (Mode C, mobile) |
| `--command-palette-width` | `600px` | Command Palette modal width (desktop) |
| `--command-palette-max-height` | `70vh` | Command Palette maximum height |
| `--header-height` | `64px` | Page header height |
| `--canvas-block-max-width` | `1200px` | Maximum width for canvas block content |

### 3.8.3 Breakpoints

| Token | Value | Name | Layout Changes |
|-------|-------|------|---------------|
| `--bp-mobile` | `< 768px` | Mobile | Single column. Full-screen Higgins. Bottom sheet Command Palette. |
| `--bp-tablet-portrait` | `768px–1023px` | Tablet Portrait | Split or swipe between Higgins and canvas. Overlay Command Palette. |
| `--bp-tablet-landscape` | `1024px–1439px` | Tablet Landscape | Two-panel with collapsible Higgins. Standard Command Palette. |
| `--bp-desktop` | `1440px+` | Desktop | Full two-panel. Resizable Higgins panel. Standard Command Palette. |
| `--bp-wide` | `1920px+` | Wide Desktop | Canvas content centers with max-width. Additional whitespace margins. |

## 3.9 Token Governance

### 3.9.1 Rules

1. **No magic numbers.** Every visual value in CSS must reference a token. If you find `padding: 12px` instead of `padding: var(--space-3)`, it's a defect. (P14: Right Way, Not Fast Way)

2. **Semantic over primitive.** Components use semantic tokens, never primitives. `background: var(--surface-raised)` not `background: var(--p-neutral-900)`. This ensures theme switching works.

3. **Component tokens are optional.** Only create a component-level token when the component needs to diverge from the semantic value. Don't create `--card-bg` if it's always `--surface-raised`.

4. **New tokens require justification.** Before adding a token, verify that an existing token doesn't serve the purpose. The token set should grow slowly and deliberately.

5. **Deprecated tokens are aliased, then removed.** When a token is superseded, it becomes an alias pointing to the new token. After one release cycle, the alias is removed and any remaining references are updated.

### 3.9.2 Token File Structure

Tokens are defined in a dedicated CSS file (`tokens.css`) imported before all other stylesheets. Theme overrides are in separate files (`theme-dark.css`, `theme-light.css`) that remap semantic tokens to different primitives.

```
public/css/
├── tokens.css           ← Tier 1 (primitives) + Tier 2 (semantics, dark default)
├── theme-light.css      ← Semantic overrides for light theme
├── tokens-components.css ← Tier 3 (component-specific tokens, if needed)
├── styles.css           ← Components and layouts (references tokens only)
└── ...
```

**Current state → Target state:** The existing `:root` variables in `styles.css` will be migrated into `tokens.css`. During transition, `styles.css` retains its current variables as aliases. New development uses the token system from day one.

---

*End of Part 3 — Design Tokens*

---

# Part 4 — Component Anatomy

*Reusable interface elements — their structure, tokens, states, variants, and accessibility*

> Components are the vocabulary of the interface. Every screen in Insight 360 is composed from this set of elements. No component is named after a feature — a MetricCard works for OKR progress, revenue tracking, CSAT scores, or anything else that has a value and a label. (P3: Separation of Intent and Presentation)

> Each component is specified with: **anatomy** (structural elements), **tokens** (which design tokens it uses), **states** (all visual states), **variants** (size/style options), **accessibility** (keyboard, screen reader, contrast), and **do/don't** (common mistakes to avoid).

## 4.1 Foundation Components

### 4.1.1 Button

The primary interactive element. Every action in the interface flows through a button.

**Anatomy:**

```
┌──────────────────────────┐
│  [icon]  Label  [icon]   │
└──────────────────────────┘
   ← optional    optional →
```

- Optional leading icon (16px, Lucide)
- Label text (required for all variants except icon-only)
- Optional trailing icon (16px, Lucide — used for dropdowns, external links)

**Variants:**

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| **Primary** | `--color-primary` | `--text-on-primary` | none | Main CTA. One per view. "Create", "Save", "Send". |
| **Secondary** | `transparent` | `--color-primary` | `1px solid --color-primary` | Supporting actions. "Edit", "Cancel", "View Details". |
| **Ghost** | `transparent` | `--text-secondary` | none | Tertiary actions, inline actions. "Learn more", "Dismiss". |
| **Danger** | `--status-danger` | `--text-on-primary` | none | Destructive actions. "Delete", "Remove". Always requires confirmation (P11). |
| **Danger-outline** | `transparent` | `--status-danger` | `1px solid --status-danger` | Less prominent destructive. "Discard draft". |
| **Icon-only** | `transparent` | `--text-secondary` | none | Compact actions. Help button, close button, overflow menu. |

**Sizes:**

| Size | Height | Padding (x) | Font | Icon | Usage |
|------|--------|-------------|------|------|-------|
| **sm** | `28px` | `--space-3` | `--text-sm` | 14px | Dense contexts — table rows, inline actions |
| **md** | `36px` | `--space-4` | `--text-base` | 16px | Default — most buttons |
| **lg** | `44px` | `--space-6` | `--text-md` | 18px | Primary CTAs, mobile touch targets |

**States:**

| State | Visual Change | Transition |
|-------|--------------|------------|
| **Default** | As specified per variant | — |
| **Hover** | Background darkens 10% (filled) or tints `--color-primary-muted` (outlined/ghost) | `--duration-fast` |
| **Active/pressed** | Scale to `0.98`, background darkens 15% | `--duration-instant` |
| **Focus** | `2px` focus ring in `--border-focus` with `2px` offset | `--duration-fast` |
| **Disabled** | Opacity `0.5`, cursor `not-allowed` | — |
| **Loading** | Label replaced with spinner (same size as icon). Width preserved to prevent layout shift. | `--duration-base` |

**Accessibility:**
- Minimum target: `--target-min` (28px) for sm, `--target-comfortable` (36px) for md, `--target-touch` (44px) for lg
- Focus ring visible on keyboard navigation, hidden on mouse click (`:focus-visible`)
- Icon-only buttons require `aria-label`
- Disabled buttons retain `aria-disabled="true"` — not removed from tab order, so screen readers can explain why they're disabled
- Loading state announces "Loading" to screen readers via `aria-live`

**Do / Don't:**

| Do | Don't |
|----|-------|
| One primary button per view | Multiple primary buttons competing for attention |
| Danger buttons always confirm before acting | Danger button that executes immediately |
| Label describes the action ("Save agent") | Vague labels ("OK", "Submit", "Go") |
| Use loading state for async actions | Disable button with no feedback during async |

---

### 4.1.2 Input

Text entry fields for forms, search, and the Higgins conversation input.

**Anatomy:**

```
  Label (optional)
┌──────────────────────────────┐
│  [icon]  Placeholder/value   │
└──────────────────────────────┘
  Helper text or error (optional)
```

**Variants:**

| Variant | Usage |
|---------|-------|
| **Text** | Single-line text entry. Name, title, URL. |
| **Textarea** | Multi-line text entry. Descriptions, notes, agent instructions. Auto-grows to content. |
| **Search** | Text input with search icon (leading) and clear button (trailing). Used in Command Palette, entity lists, tables. |
| **Select** | Dropdown selection. Chevron trailing icon. Options in a dropdown panel. |
| **Multi-select** | Tags/chips inside the input showing selected items. Dropdown for adding more. |
| **Higgins input** | The conversation input at the bottom of the Higgins panel. Special variant — see 4.3.1. |

**Tokens:**

| Property | Token |
|----------|-------|
| Background | `--surface-raised` |
| Border | `1px solid --border-default` |
| Border (focus) | `2px solid --border-focus` |
| Border (error) | `2px solid --status-danger` |
| Text | `--text-primary` |
| Placeholder | `--text-muted` |
| Label | `--text-secondary`, `--text-sm`, `--weight-medium` |
| Helper text | `--text-muted`, `--text-sm` |
| Error text | `--status-danger`, `--text-sm` |
| Padding | `--input-padding-y` / `--input-padding-x` |
| Radius | `--radius-md` |
| Height (single-line) | `36px` (md), `44px` (lg for mobile) |

**States:**

| State | Visual |
|-------|--------|
| **Default** | Standard border, placeholder text |
| **Focus** | Border becomes `--border-focus` (2px), subtle glow shadow |
| **Filled** | Value text replaces placeholder |
| **Error** | Border becomes `--status-danger`, error message appears below |
| **Disabled** | Opacity `0.5`, `not-allowed` cursor |
| **Read-only** | No border, background transparent, text selectable but not editable |

**Accessibility:**
- Labels are associated via `for`/`id` — never placeholder-only labels
- Error messages linked via `aria-describedby`
- Required fields marked with `aria-required="true"` and visual indicator
- Keyboard: Tab to enter, Escape to clear (search variant), arrow keys for select

---

### 4.1.3 Badge

Small indicators for status, count, or category.

**Variants:**

| Variant | Background | Text | Shape | Usage |
|---------|-----------|------|-------|-------|
| **Status** | `--status-*-muted` | `--status-*` | Rounded pill (`--radius-full`) | "Active", "At Risk", "Completed" |
| **Count** | `--color-primary-muted` | `--color-primary` | Circular or pill | Notification count, item count |
| **Category** | `--surface-overlay` | `--text-secondary` | Rounded pill | Tags, types, department labels |
| **Dot** | `--status-*` | none | Circle, 8px | Inline status indicator next to text |

**Size:** `--text-xs`, `--weight-medium`, padding `--space-1` / `--space-2`, min-height `20px`.

**Accessibility:** Badges that convey meaning (not just decoration) must have screen-reader-accessible text. A red dot alone is insufficient — pair with `aria-label="Error status"`.

---

### 4.1.4 Toast

Non-blocking notification that appears temporarily to confirm actions or report results.

**Anatomy:**

```
┌──────────────────────────────────────┐
│  [status icon]  Message      [close] │
│                 Action link          │
└──────────────────────────────────────┘
```

**Tokens:**

| Property | Token |
|----------|-------|
| Background | `--surface-overlay` |
| Border-left | `4px solid --status-*` (color matches toast type) |
| Shadow | `--shadow-lg` |
| Z-index | `--z-toast` |
| Radius | `--radius-md` |

**Types:** Success, Warning, Error, Info — each uses the corresponding `--status-*` color for the left border and icon.

**Behavior:**
- Appears in bottom-right corner (desktop) or bottom-center (mobile)
- Auto-dismisses after 5 seconds (success/info) or persists until dismissed (error/warning)
- Stacks vertically if multiple toasts are active (max 3 visible, older ones queue)
- Enter: slide up + fade in, `--duration-moderate`, `--ease-out`
- Exit: slide right + fade out, `--duration-base`, `--ease-in`

**Accessibility:** `role="alert"` for error/warning, `role="status"` for success/info. Focus does not move to the toast — it's supplementary, not interruptive.

---

### 4.1.5 Modal

Focused overlay for confirmations, forms, and detailed views. Always use ModalService — never inline HTML modals.

**Anatomy:**

```
┌──────────────────────────────────────────┐
│                                          │
│   ┌──────────────────────────────────┐   │
│   │  Title                    [close]│   │
│   │──────────────────────────────────│   │
│   │                                  │   │
│   │  Content area                    │   │
│   │                                  │   │
│   │──────────────────────────────────│   │
│   │           [Cancel]  [Primary]    │   │
│   └──────────────────────────────────┘   │
│                                          │
│         (scrim / backdrop)               │
└──────────────────────────────────────────┘
```

**Tokens:**

| Property | Token |
|----------|-------|
| Scrim background | `rgba(0,0,0,0.6)` |
| Modal background | `--surface-overlay` |
| Shadow | `--shadow-lg` |
| Z-index | `--z-overlay` |
| Radius | `--radius-lg` |
| Width | `480px` (sm), `600px` (md), `800px` (lg) |
| Max-height | `85vh` |
| Padding (header/footer) | `--space-6` |
| Padding (body) | `--space-6` |

**Variants:**

| Variant | Usage |
|---------|-------|
| **Confirm** | Simple yes/no decisions. Title + message + two buttons. |
| **Form** | Data entry. Title + form fields + submit/cancel. |
| **Alert** | Information delivery. Title + message + acknowledge button. |
| **Danger** | Destructive confirmation. Red accent on primary button. Impact statement visible. |

**Behavior:**
- Enter: scrim fades in (`--duration-base`), modal scales from 0.95 to 1.0 + fades in (`--duration-moderate`, `--ease-spring`)
- Exit: reverse of enter (`--duration-base`, `--ease-in`)
- Escape key dismisses (unless it's a required confirmation)
- Click on scrim dismisses (unless it's a required confirmation)
- Scroll is locked on the body while modal is open

**Accessibility:**
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to title
- Focus trapped inside modal while open
- Focus returns to trigger element on close
- First focusable element receives focus on open (typically the close button or first input)

---

## 4.2 Data Components

### 4.2.1 Card

The universal container for displaying entity information. Cards are the building blocks of entity lists, dashboards, and detail views.

**Anatomy:**

```
┌──────────────────────────────────────┐
│  [icon/avatar]  Title        [badge] │
│                 Subtitle             │
│──────────────────────────────────────│
│                                      │
│  Body content                        │
│  (text, mini-chart, key-value pairs) │
│                                      │
│──────────────────────────────────────│
│  [action]  [action]        [overflow]│
└──────────────────────────────────────┘
```

- **Header:** Icon or avatar + title + optional badge (status, tier, count)
- **Body:** Flexible content area — text, key-value pairs, mini-charts, progress bars
- **Footer:** Action buttons (ghost or secondary, sm size) + optional overflow menu

**Tokens:**

| Property | Token |
|----------|-------|
| Background | `--surface-raised` |
| Border | `1px solid --border-default` |
| Radius | `--radius-md` |
| Shadow | `--shadow-sm` |
| Padding | `--card-padding` |
| Title | `--text-md`, `--weight-semibold` |
| Subtitle | `--text-sm`, `--text-secondary` |

**States:**

| State | Visual |
|-------|--------|
| **Default** | As specified |
| **Hover** | Border brightens to `--border-subtle`, shadow lifts to `--shadow-md` (only if card is clickable) |
| **Selected** | Border becomes `--color-primary`, background tints `--color-primary-muted` |
| **Dragging** | Elevated shadow (`--shadow-lg`), slight rotation (2deg), opacity 0.9 |

**Variants:**

| Variant | Modification | Usage |
|---------|-------------|-------|
| **Default** | As specified | Entity lists — agents, assets, processes |
| **Compact** | No body section, reduced padding (`--space-3`) | Dense lists, search results, recent items |
| **Interactive** | Cursor pointer, hover effects, full-card click | Navigable entity cards |
| **Static** | No hover effects, no click | Information display only |

**Accessibility:** Interactive cards use `role="article"` or `role="link"` with appropriate `aria-label`. If the full card is clickable, the click target covers the entire card area, not just the title.

---

### 4.2.2 MetricCard

Displays a single KPI value with context. Used in dashboards and canvas compositions.

**Anatomy:**

```
┌──────────────────────────┐
│  Label            [icon] │
│                          │
│  Value                   │
│                          │
│  ▲ +12.5%  vs last month │
│  [sparkline]             │
└──────────────────────────┘
```

- **Label:** What the metric measures (`--text-sm`, `--text-secondary`)
- **Icon:** Category indicator (Lucide, 16px, `--text-muted`)
- **Value:** The number (`--font-heading`, `--text-3xl`, `--weight-bold`)
- **Trend:** Direction arrow + percentage + comparison period (`--text-sm`)
- **Sparkline:** Optional mini-chart showing recent trend (40px tall)

**Tokens:**

| Property | Token |
|----------|-------|
| Background | `--surface-raised` |
| Border | `1px solid --border-default` |
| Radius | `--radius-md` |
| Padding | `--card-padding` |
| Value color | `--text-primary` |
| Trend up | `--status-success` |
| Trend down | `--status-danger` |
| Trend flat | `--text-muted` |

**Sizes:**

| Size | Width | Value font | Usage |
|------|-------|-----------|-------|
| **sm** | Flexible (min 140px) | `--text-xl` | Canvas metric row (4 across) |
| **md** | Flexible (min 200px) | `--text-3xl` | Dashboard cards |
| **lg** | Flexible (min 280px) | `--text-4xl` | Hero metrics, single-stat display |

**Accessibility:** The metric value, label, and trend are grouped with `role="group"` and a descriptive `aria-label` that reads naturally: "Revenue: $142,000, up 12.5% versus last month."

---

### 4.2.3 DataTable

Tabular data display with sorting, filtering, and row actions.

**Anatomy:**

```
┌──────────────────────────────────────────────────┐
│  Column A ▼    Column B     Column C    Actions  │
│──────────────────────────────────────────────────│
│  Cell          Cell         Cell        [•••]    │
│  Cell          Cell         Cell        [•••]    │
│  Cell          Cell         Cell        [•••]    │
│  Cell          Cell         Cell        [•••]    │
│──────────────────────────────────────────────────│
│  Showing 1–20 of 84            [< 1 2 3 4 5 >]  │
└──────────────────────────────────────────────────┘
```

**Tokens:**

| Property | Token |
|----------|-------|
| Header background | `--surface-overlay` |
| Header text | `--text-secondary`, `--text-sm`, `--weight-semibold` |
| Row background | `--surface-raised` |
| Row background (hover) | `--bg-hover` |
| Row background (striped alt) | `--surface-base` |
| Row border | `1px solid --border-subtle` |
| Cell text | `--text-primary`, `--text-sm` |
| Cell padding | `--space-3` vertical, `--space-4` horizontal |

**Features:**
- **Sortable columns:** Click header to sort. Arrow icon indicates direction. `aria-sort` attribute on header cells.
- **Row selection:** Checkbox in first column. Selected rows highlighted with `--color-primary-muted`.
- **Row actions:** Overflow menu (three dots) in last column. Opens a dropdown with action items.
- **Pagination:** Footer with page controls. Configurable page size (20, 50, 100).
- **Empty state:** Centered message with icon when no data matches filters. Suggests action. (P9: No Dead Ends)
- **Loading state:** Skeleton rows (animated shimmer) matching the column layout.

**Responsive:** On mobile, tables switch to a card-based layout where each row becomes a stacked card with label-value pairs.

**Accessibility:** `role="table"`, `role="row"`, `role="columnheader"`, `role="cell"`. Sortable columns are buttons. Row selection announced via `aria-selected`.

---

### 4.2.4 Chart

Data visualization component. Charts are rendered as canvas blocks or inline within cards.

**Types supported:**

| Type | Usage |
|------|-------|
| **Bar** (vertical/horizontal) | Comparisons — OKR progress, department scores |
| **Line** | Trends over time — revenue, ticket volume, CSAT |
| **Area** | Volume trends — cumulative metrics, stacked breakdowns |
| **Pie / Donut** | Proportions — category distribution, budget allocation |
| **Sparkline** | Inline mini-trend — inside MetricCards and table cells |
| **Timeline** | Chronological events — incident timeline, release history |

**Tokens:**

| Property | Token |
|----------|-------|
| Background | `transparent` (inherits from parent container) |
| Grid lines | `--border-subtle`, 1px |
| Axis labels | `--text-muted`, `--text-xs` |
| Data labels | `--text-secondary`, `--text-sm` |
| Tooltip background | `--surface-overlay` |
| Tooltip shadow | `--shadow-md` |
| Tooltip text | `--text-primary`, `--text-sm` |

**Data colors (ordered series):**

| Series | Token |
|--------|-------|
| 1 | `--color-primary` (indigo) |
| 2 | `--p-cyan-500` |
| 3 | `--p-emerald-500` |
| 4 | `--p-amber-500` |
| 5 | `--p-violet-500` |
| 6 | `--p-red-400` |

All chart colors are validated for sufficient contrast against both dark and light surface backgrounds. Series colors are never the sole differentiator — patterns (dashed lines, different shapes) or labels supplement color for accessibility (P4).

**Interaction:**
- Hover on data point shows tooltip with exact value
- Click on data point can trigger a drill-down (canvas block updates)
- Pinch/scroll to zoom on time-based charts
- Legend items are toggleable (click to hide/show a series)

**Accessibility:** Charts include a visually hidden data table equivalent (`aria-hidden="false"` on the table, `aria-hidden="true"` on the visual chart) so screen readers can access the data.

---

## 4.3 Agent Components

Components unique to the Higgins experience layer.

### 4.3.1 HigginsInput

The conversation input at the bottom of the Higgins panel. This is not a standard text input — it's the primary command surface of the platform.

**Anatomy:**

```
┌──────────────────────────────────────────┐
│  ┌──────────────────────────────┐  [mic] │
│  │  Ask Higgins anything...     │  [send]│
│  └──────────────────────────────┘        │
│  [attach]  [voice]         model: Claude │
└──────────────────────────────────────────┘
```

- **Text area:** Auto-growing, multi-line. Placeholder: "Ask Higgins anything..." (or org-customized via Soul Config)
- **Send button:** Primary icon button, appears when text is entered
- **Microphone button:** Toggles voice input (if enabled)
- **Attach button:** File attachment for images, documents
- **Model indicator:** Subtle text showing which LLM model is active

**Tokens:**

| Property | Token |
|----------|-------|
| Background | `--surface-overlay` |
| Border | `1px solid --border-default` |
| Border (focus) | `2px solid --agent-accent` (cyan, not indigo — distinguishes from standard inputs) |
| Radius | `--radius-lg` |
| Padding | `--space-3` |
| Placeholder | `--text-muted` |
| Text | `--text-primary`, `--text-base` |
| Send button | `--agent-accent` background, white icon |
| Model indicator | `--text-muted`, `--text-xs` |

**Behavior:**
- Enter sends the message (Shift+Enter for new line)
- Auto-grows up to 6 lines, then scrolls internally
- Supports paste of images (previewed as thumbnails before send)
- Submit triggers Higgins thinking state in the conversation above
- Disabled during Higgins response streaming (re-enabled when streaming completes)

**Accessibility:** `role="textbox"`, `aria-label="Message to Higgins"`, `aria-multiline="true"`. Send button has `aria-label="Send message"`.

---

### 4.3.2 MessageBubble

A single message in the Higgins conversation stream.

**Anatomy — User message:**

```
                              ┌──────────────────┐
                              │  User's message   │
                              │  text goes here   │
                              └──────────────────┘
                                        12:04 PM
```

**Anatomy — Agent message:**

```
[H avatar]
┌──────────────────────────────────┐
│  Agent's response text goes      │
│  here with full formatting.      │
│                                  │
│  [embedded rich element]         │
│                                  │
│  [action button] [action button] │
└──────────────────────────────────┘
12:05 PM · Claude Opus

        [quick reply chip] [quick reply chip]
```

**Tokens:**

| Property | User Message | Agent Message |
|----------|-------------|---------------|
| Background | `--color-primary-muted` | `--surface-raised` |
| Border | none | `1px solid --border-subtle` |
| Left border | none | `3px solid --agent-accent` |
| Text | `--text-primary` | `--text-primary` |
| Radius | `--radius-lg` | `--radius-lg` |
| Max width | `85%` of panel | `90%` of panel |
| Alignment | Right | Left |
| Padding | `--space-3` / `--space-4` | `--space-4` / `--space-5` |

**Agent message sub-elements:**

| Element | Treatment |
|---------|-----------|
| **Avatar** | 32px Higgins avatar, positioned above the bubble |
| **Timestamp** | `--text-xs`, `--text-muted`, below bubble |
| **Model indicator** | `--text-xs`, `--text-muted`, next to timestamp ("Claude Opus", "GPT-4o") |
| **Rich embeds** | Inline cards, charts, action buttons — styled per their own component specs |
| **Quick reply chips** | Outlined pills below the bubble — see 4.3.4 |
| **Streaming cursor** | Blinking `--agent-accent` cursor during response generation |

**States:**

| State | Visual |
|-------|--------|
| **Streaming** | Text appears progressively. Blinking cursor at the end. |
| **Complete** | Full message. Timestamp and model indicator appear. |
| **Error** | Red left border (`--status-danger`). Error message with retry option. |
| **Thinking** | No bubble yet — animated thinking indicator (see 4.3.3). |

**Accessibility:** Messages use `role="log"` on the container, individual messages as `role="article"`. New messages announced via `aria-live="polite"`.

---

### 4.3.3 ThinkingIndicator

Displayed while Higgins is processing a request.

**Anatomy:**

```
[H avatar]
┌────────────────────────────────┐
│  ●  ●  ●   Analyzing your     │
│            Q1 OKR data...      │
└────────────────────────────────┘
```

- **Animated dots:** Three dots that pulse in sequence, color `--agent-thinking`
- **Status text:** Describes what Higgins is doing (not just "Thinking..." — see P12: Transparency)

**Status text examples:**
- "Let me look into that..."
- "Pulling data from Parthenon and Support..."
- "Generating your board presentation..."
- "Searching across 46 context assets..."

**Tokens:**

| Property | Token |
|----------|-------|
| Background | `--surface-raised` |
| Border-left | `3px solid --agent-thinking` |
| Dot color | `--agent-thinking` |
| Text | `--text-secondary`, `--text-sm` |

**Reduced motion:** Dots show a static ellipsis instead of pulsing animation.

**Accessibility:** `aria-live="polite"`, `role="status"`. Announces the status text to screen readers.

---

### 4.3.4 QuickReplyChip

Suggested follow-up actions or questions that appear below an agent message.

**Anatomy:**

```
┌───────────────────┐  ┌──────────────┐  ┌─────────────────┐
│  Show breakdown   │  │  Export PDF   │  │  Tell me more   │
└───────────────────┘  └──────────────┘  └─────────────────┘
```

**Tokens:**

| Property | Token |
|----------|-------|
| Background | `transparent` |
| Border | `1px solid --agent-accent` |
| Text | `--agent-accent`, `--text-sm`, `--weight-medium` |
| Radius | `--radius-full` |
| Padding | `--space-1` / `--space-3` |
| Hover background | `--agent-accent-muted` |

**Behavior:** Clicking a chip sends its text as the user's next message. The chip disappears after selection. Chips scroll horizontally if they overflow the panel width (with fade indicators at edges).

---

### 4.3.5 HigginsAvatar

The agent's visual presence across all modes.

**Variants:**

| Variant | Size | Usage |
|---------|------|-------|
| **Ambient** | `--higgins-avatar-ambient` (40px desktop) | Mode C floating presence |
| **Panel** | 48px | Top of Higgins panel in Mode A |
| **Message** | 32px | Inline with agent messages |
| **Palette** | 24px | Inside Command Palette header |

**States (from 2.1.3):**

| State | Visual Treatment |
|-------|-----------------|
| **Ready** | Solid avatar, `--agent-avatar-glow` subtle glow |
| **Thinking** | Avatar + pulsing glow ring, `--agent-thinking` color |
| **Suggesting** | Avatar + notification dot (8px, `--status-info`) + text preview |
| **Working** | Avatar + circular progress indicator |
| **Unavailable** | Avatar at 50% opacity + dimmed glow |

**Ambient mode interaction:**
- Hover: glow intensifies
- Click: opens Command Palette (Mode C) or toggles Higgins panel (Mode A)
- Long-press/right-click: quick action menu (Start conversation, Open palette, Settings)

**Tokens:**

| Property | Token |
|----------|-------|
| Glow | `--agent-avatar-glow` |
| Notification dot | `--status-info` |
| Progress ring | `--agent-accent` |
| Z-index | `--z-higgins-ambient` |
| Border-radius | `--radius-full` |

---

### 4.3.6 ActionCard

Appears in the conversation or canvas when Higgins proposes a consequential action (from 2.4.1).

**Anatomy:**

```
┌──────────────────────────────────────────┐
│  [consequence icon]                      │
│                                          │
│  Title: "Send weekly briefing"           │
│  Detail: "To 5 recipients, includes      │
│           Q1 summary and OKR status"     │
│                                          │
│  [Preview]  [Edit]        [Execute]      │
│                                          │
│  ▸ View impact details                   │
└──────────────────────────────────────────┘
```

**Tokens:**

| Property | Token |
|----------|-------|
| Background | `--surface-raised` |
| Border-left | `4px solid` — color varies by consequence level |
| Radius | `--radius-md` |
| Padding | `--space-5` |

**Consequence level colors (from 2.4.1):**

| Level | Border Color |
|-------|-------------|
| Create | `--color-primary` |
| Modify | `--status-warning` |
| Communicate | `--status-info` |
| Delete | `--status-danger` |
| Automate | `--color-secondary` |

**Accessibility:** `role="group"` with descriptive `aria-label`. Execute button requires explicit activation (Enter key, not Space alone for destructive actions).

---

## 4.4 Navigation Components

### 4.4.1 CommandPalette

The central navigation and discovery surface (defined in 2.2.5). This is the most complex component in the system.

**Anatomy:**

```
┌──────────────────────────────────────────┐
│  ┌──────────────────────────────────┐    │
│  │  🔍 Where do you want to go?     │    │
│  └──────────────────────────────────┘    │
│                                          │
│  SUGGESTED BY HIGGINS                    │
│  ┌──────────┐ ┌──────────┐              │
│  │ Review    │ │ 3 deals  │              │
│  │ Q1 OKRs   │ │ at risk  │              │
│  └──────────┘ └──────────┘              │
│                                          │
│  MODULES                    RECENT       │
│  ┌────┐ ┌────┐ ┌────┐     Dashboard     │
│  │ 💬 │ │ 🤖 │ │ 🏛 │     Agents        │
│  │Chat│ │Agnt│ │Prth│     Parthenon     │
│  └────┘ └────┘ └────┘     Chat          │
│  ┌────┐ ┌────┐ ┌────┐     Context       │
│  │ 📦 │ │ 👤 │ │ ⚙️ │                   │
│  │Ctxt│ │Soul│ │Sett│                   │
│  └────┘ └────┘ └────┘                   │
│                                          │
│  QUICK ACTIONS                           │
│  + New Agent  + Start Chat  + Workflow   │
└──────────────────────────────────────────┘
```

**Tokens:**

| Property | Token |
|----------|-------|
| Backdrop | `rgba(0,0,0,0.6)` |
| Background | `--surface-overlay` |
| Shadow | `--shadow-lg` |
| Radius | `--radius-lg` |
| Width | `--command-palette-width` (600px) |
| Max-height | `--command-palette-max-height` (70vh) |
| Z-index | `--z-overlay` |
| Search input | `--text-lg`, no border, transparent background |
| Section title | `--text-xs`, `--text-muted`, `--weight-semibold`, uppercase, letter-spacing `0.05em` |

**Module tile:**

| Property | Token |
|----------|-------|
| Background | `--surface-raised` |
| Border | `1px solid --border-default` |
| Radius | `--radius-md` |
| Size | 72px × 72px |
| Icon | Lucide, 24px, `--color-primary` |
| Label | `--text-xs`, `--weight-medium` |
| Hover | border `--color-primary`, background `--color-primary-muted` |
| Locked | Opacity 0.5, lock icon overlay, no click |

**Suggestion card:**

| Property | Token |
|----------|-------|
| Background | `--agent-accent-muted` |
| Border | `1px solid --agent-accent` at 30% opacity |
| Radius | `--radius-md` |
| Padding | `--space-3` |
| Text | `--text-sm` |
| Hover | border opacity increases to 60% |

**Recent item:**

| Property | Token |
|----------|-------|
| Text | `--text-secondary`, `--text-sm` |
| Icon | Lucide, 14px, `--text-muted` |
| Hover | text `--text-primary`, background `--bg-hover` |

**Behavior:**
- Opens: `--duration-moderate`, scale from 0.95 + fade in, `--ease-spring`
- Closes: `--duration-base`, scale to 0.95 + fade out, `--ease-in`
- Typing in search instantly filters all sections
- Arrow keys navigate between items, Enter selects, Escape closes
- On selection: palette closes, canvas updates to selected destination

**Accessibility:**
- `role="dialog"`, `aria-modal="true"`, `aria-label="Command palette — navigate or search"`
- Search input has `role="combobox"`, `aria-expanded="true"`, `aria-controls` pointing to results list
- Results list: `role="listbox"`, items as `role="option"` with `aria-selected`
- Focus trap while open
- Keyboard-first design — fully operable without a mouse

**Mobile variant:** Full-screen overlay. Module tiles in 2-column grid. Search at top with large touch target. Suggested and recent sections stack vertically.

---

### 4.4.2 NavigationRail (Transition Period)

During the sidebar-to-Command-Palette migration (Phase 1–2 from 2.2.5), the legacy sidebar continues to function. Its specification is the current `navigation.js` implementation — no redesign during transition. Once Phase 3 deprecates it, this component is removed from the design system.

---

## 4.5 Canvas Components

### 4.5.1 CanvasBlock

The atomic unit of the canvas surface. Every piece of content Higgins places on the canvas is wrapped in a CanvasBlock.

**Anatomy:**

```
┌──────────────────────────────────────────────────┐
│  Title (optional)              [pin] [⋮ actions] │
│──────────────────────────────────────────────────│
│                                                  │
│  Content                                         │
│  (chart, table, narrative, image, document,      │
│   metric cards, action card, or embed)           │
│                                                  │
│──────────────────────────────────────────────────│
│  Source: Module Name · Updated 2h ago    [resize]│
└──────────────────────────────────────────────────┘
```

- **Header:** Optional title + pin control + overflow actions menu (expand, download, remove, "This isn't right")
- **Content:** The inner component — any content type from 2.3.1
- **Footer:** Source attribution line (module, freshness, confidence) + resize handle

**Tokens:**

| Property | Token |
|----------|-------|
| Background | `--surface-raised` |
| Border | `1px solid --border-default` |
| Radius | `--radius-md` |
| Shadow | `--shadow-sm` |
| Padding | `--canvas-block-padding` |
| Gap between blocks | `--canvas-block-gap` |
| Max width | `--canvas-block-max-width` |
| Title | `--text-md`, `--weight-semibold` |
| Source text | `--text-xs`, `--text-muted` |
| Generated indicator | `--agent-accent`, 12px icon |

**States:**

| State | Visual |
|-------|--------|
| **Default** | Standard card appearance |
| **Pinned** | Pin icon filled, subtle top-border accent in `--agent-accent` |
| **Entering** | Slides up from below + fades in, `--duration-moderate`, `--ease-spring` |
| **Updating** | Brief pulse of border in `--agent-accent`, content cross-fades |
| **Removing** | Collapses height + fades out, `--duration-base`, `--ease-in` |
| **Resizing** | User dragging resize handle. Content reflows responsively. |
| **Editable** | Dotted border, edit controls visible (for user-editable canvas content) |

**Actions menu (overflow):**

| Action | Icon | Behavior |
|--------|------|----------|
| Expand | `maximize-2` | Opens block content in a larger modal view |
| Download | `download` | Exports block content (PNG for charts, MD/HTML for text, CSV for tables) |
| Pin/Unpin | `pin` | Toggles pinned state |
| This isn't right | `flag` | Opens correction flow (2.4.5) |
| Remove | `x` | Removes block from canvas (with undo toast) |

**Accessibility:** Each canvas block is a `role="region"` with `aria-label` describing its content type and title. Pin state announced via `aria-pressed`.

---

### 4.5.2 CanvasComposite

When Higgins assembles multiple blocks into a composed view (2.3.1), the CanvasComposite manages their layout.

**Layout rules:**

| Content Combination | Layout |
|--------------------|--------|
| Metric cards only | Horizontal row, wrapping (4 per row on desktop, 2 on tablet, 1 on mobile) |
| Chart + narrative | Chart above, narrative below (full width) |
| Chart + data table | Side-by-side on desktop (50/50), stacked on tablet/mobile |
| Multiple charts | 2-column grid on desktop, stacked below |
| Image + text | Image above or left (configurable), text flows alongside or below |
| Mixed composition | Metrics row → charts → tables → narrative (top-to-bottom priority) |

**Tokens:**

| Property | Token |
|----------|-------|
| Gap between blocks | `--canvas-block-gap` |
| Max width | `--canvas-block-max-width` |
| Padding (outer) | `--page-padding` |

The composite itself has no visible chrome — it's a layout container. The individual CanvasBlocks provide the visual structure.

---

## 4.6 Feedback Components

### 4.6.1 EmptyState

Displayed when a view has no data. Never a blank screen. (P9: No Dead Ends)

**Anatomy:**

```
┌──────────────────────────────────────┐
│                                      │
│           [illustration/icon]        │
│                                      │
│       No agents created yet          │
│                                      │
│   Create your first agent to start   │
│   automating your workflows.         │
│                                      │
│        [ Create Agent → ]            │
│                                      │
└──────────────────────────────────────┘
```

**Tokens:**

| Property | Token |
|----------|-------|
| Icon | Lucide, 48px, `--text-muted` |
| Title | `--text-lg`, `--weight-semibold`, `--text-primary` |
| Description | `--text-base`, `--text-secondary` |
| CTA button | Primary button (md) |
| Alignment | Centered horizontally and vertically in available space |

**Rules:**
- Title states the current situation plainly
- Description suggests what to do and why
- CTA button is the obvious next action
- Never just "No data" — always explain what the user can do

---

### 4.6.2 SkeletonLoader

Placeholder content shown while data is loading. Matches the shape of the content it replaces.

**Anatomy:** Rectangular blocks matching the dimensions of the expected content — title bars, body blocks, avatar circles. Animated shimmer effect (left-to-right gradient sweep).

**Tokens:**

| Property | Token |
|----------|-------|
| Base color | `--surface-overlay` |
| Shimmer highlight | `--border-subtle` at 30% opacity |
| Animation | `1.5s` linear infinite |
| Radius | Matches the component it represents |

**Reduced motion:** Shimmer animation disabled. Static gray blocks shown instead.

**Rules:**
- Skeleton shape matches the expected content layout (don't show a generic spinner where content structure is known)
- Use for initial page loads and canvas block generation
- Don't use for actions where a button loading state is sufficient

---

### 4.6.3 GuardrailIndicator

Visual treatment for bright lines, guardrails, and guidance (from 2.5.4).

**Anatomy:**

```
┌──────────────────────────────────────────┐
│  [icon]  Guardrail type: Description     │
│                                          │
│  Explanation of what triggered it and    │
│  what the user's options are.            │
│                                          │
│  [Action 1]  [Action 2]                 │
└──────────────────────────────────────────┘
```

**Variants:**

| Variant | Icon | Border Color | Background |
|---------|------|-------------|-----------|
| **Bright line** | `octagon` (stop) | `--guardrail-bright-line` | `--status-danger-muted` |
| **Guardrail** | `alert-triangle` | `--guardrail-soft` | `--status-warning-muted` |
| **Guidance** | `info` | `--guardrail-guidance` | `--status-info-muted` |

**Tokens:**

| Property | Token |
|----------|-------|
| Border-left | `4px solid` — variant color |
| Background | Variant muted background |
| Radius | `--radius-md` |
| Padding | `--space-4` |
| Icon size | 18px |
| Title | `--text-sm`, `--weight-semibold`, variant color |
| Body | `--text-sm`, `--text-secondary` |

**Accessibility:** `role="alert"` for bright lines (immediate attention), `role="note"` for guardrails and guidance.

---

*End of Part 4 — Component Anatomy*

---

# Part 5 — Layout Patterns

*Page-level compositions — how components assemble into screens across form factors*

> Layout patterns are named by their function, never by their content. A "detail view" works for an agent, a process, an OKR, or a soul configuration. The pattern doesn't know or care what data fills it. (P3: Separation of Intent and Presentation)

## 5.1 The Master Layout

Every screen in Insight 360 shares a single master layout structure. There is no alternative chrome, no per-page frame. This is the skeleton into which all other patterns are placed.

### 5.1.1 Mode A — Always-Present Companion

The default layout for users who want Higgins always visible.

```
┌──────────────────────────────────────────────────────────┐
│ ┌──────────────────┐  ┌────────────────────────────────┐ │
│ │ [H] [nav] [⋮]    │  │  Page Header                   │ │
│ │──────────────────│  │  Title / Subtitle / Actions     │ │
│ │                  │  │────────────────────────────────│ │
│ │                  │  │                                │ │
│ │  Conversation    │  │  Canvas / Page Content         │ │
│ │  Stream          │  │                                │ │
│ │                  │  │                                │ │
│ │                  │  │                                │ │
│ │                  │  │                                │ │
│ │                  │  │                                │ │
│ │                  │  │                                │ │
│ │──────────────────│  │                                │ │
│ │ [HigginsInput]   │  │                                │ │
│ └──────────────────┘  └────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
  ← higgins-panel →     ← canvas (remaining width) ────→
```

**Structure:**

| Element | Width | Behavior |
|---------|-------|----------|
| **Higgins panel** | `--higgins-panel-width` (380px), resizable between `--higgins-panel-min` (300px) and `--higgins-panel-max` (500px) | Fixed position. Scroll independent of canvas. Contains avatar, nav icon, conversation stream, and input. |
| **Canvas** | Remaining viewport width | Scrolls independently. Contains page header + page content or composed canvas blocks. |
| **Resize handle** | 4px between panels | Draggable. Cursor `col-resize`. Double-click resets to default width. |

**Higgins panel header:**

| Element | Size | Purpose |
|---------|------|---------|
| Higgins avatar | 48px (Panel variant) | Identity, state indicator |
| Nav icon | 24px, Lucide `layout-grid` | Opens Command Palette |
| Overflow menu | 24px, Lucide `more-vertical` | Conversation history, settings, clear conversation |

### 5.1.2 Mode C — Ambient + Active

The minimal layout for users who want maximum canvas space.

```
┌──────────────────────────────────────────────────────────┐
│ [H]                                                      │
│                                                          │
│   Page Header                                            │
│   Title / Subtitle / Actions                             │
│ ─────────────────────────────────────────────────────── │
│                                                          │
│   Full-Width Canvas / Page Content                       │
│                                                          │
│                                                          │
│                                                          │
│                                                          │
│                                                          │
│                                                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Structure:**

| Element | Position | Behavior |
|---------|----------|----------|
| **Higgins avatar** | Fixed, top-left corner, `--space-4` inset | Floats above content. Z-index `--z-higgins-ambient`. Click opens Command Palette. |
| **Canvas** | Full viewport width | Standard page content or composed canvas blocks. |

**Activation flow (avatar click):**

1. First click → Command Palette opens (centered modal overlay)
2. From palette → "Start a conversation" option slides in the Higgins panel from left
3. Higgins panel overlays or pushes canvas (user preference in settings)
4. Dismiss panel → returns to ambient mode, pinned canvas items persist

**Keyboard activation:**
- `Cmd+K` → Command Palette directly
- `Cmd+H` → Higgins conversation panel directly (bypasses palette)

### 5.1.3 Responsive Behavior

| Breakpoint | Mode A | Mode C |
|------------|--------|--------|
| **Desktop (1440px+)** | Two-panel, side-by-side. Resizable. | Full canvas, ambient avatar top-left. |
| **Tablet landscape (1024–1439px)** | Two-panel, Higgins panel at minimum width (300px). | Full canvas, ambient avatar. Panel overlays on activation. |
| **Tablet portrait (768–1023px)** | Swipe between Higgins and canvas (two full-width views). Dot indicator shows which is active. | Full canvas. Panel slides over as overlay. |
| **Mobile (< 768px)** | Full-screen conversation. Canvas items open as overlays. Tab bar at bottom: Chat / Canvas / Palette. | Full canvas. Avatar bottom-right (thumb-reachable). Tap → full-screen conversation. |

**Mobile tab bar (Mode A):**

```
┌──────────────────────────────────────┐
│                                      │
│  (active view content)               │
│                                      │
│──────────────────────────────────────│
│  [💬 Chat]    [📄 Canvas]    [≡ Menu]│
└──────────────────────────────────────┘
```

- Chat tab: Full-screen Higgins conversation
- Canvas tab: Full-screen canvas with composed content or traditional page
- Menu tab: Command Palette (full-screen variant)

---

## 5.2 Page Header

Every page has a consistent header structure at the top of the canvas area.

**Anatomy:**

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  [icon]  Page Title                        [help] [act]  │
│          Subtitle / description                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Tokens:**

| Property | Token |
|----------|-------|
| Padding | `--page-padding` (2rem) horizontal, `--space-6` vertical |
| Title | `--font-heading`, `--text-2xl`, `--weight-bold` |
| Subtitle | `--font-body`, `--text-base`, `--text-secondary` |
| Icon | Lucide, 28px, `--color-primary` |
| Border-bottom | `1px solid --border-default` |
| Background | `--surface-base` (transparent, inherits from canvas) |

**Header actions (right side):**

| Element | Component | Purpose |
|---------|-----------|---------|
| Help button | Button (icon-only, ghost) with `help-circle` icon | Opens help modal (HelpModal.open()) |
| Primary action | Button (primary, md) | Page-specific CTA ("Create Agent", "New Workflow") |
| Secondary actions | Buttons (ghost, icon-only) | Filter, export, settings |

**Rules:**
- Every page has a title and help button (minimum)
- Maximum 3 action buttons in the header (use overflow menu for more)
- On mobile, subtitle collapses. Actions move to an overflow menu.

---

## 5.3 Content Patterns

These patterns fill the canvas area below the page header. Each pattern is a reusable composition of components from Part 4.

### 5.3.1 Entity List

Displays a collection of entities — agents, context assets, processes, workflows, skills, or any plural data set.

**Anatomy:**

```
┌──────────────────────────────────────────────────────────┐
│  Page Header                              [+ Create New] │
│──────────────────────────────────────────────────────────│
│                                                          │
│  [search bar]      [filter]  [sort]  [view: grid|list]  │
│                                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│  │   Card     │ │   Card     │ │   Card     │          │
│  │            │ │            │ │            │          │
│  └────────────┘ └────────────┘ └────────────┘          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│  │   Card     │ │   Card     │ │   Card     │          │
│  │            │ │            │ │            │          │
│  └────────────┘ └────────────┘ └────────────┘          │
│                                                          │
│  Showing 6 of 24                      [Load More]        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Structure:**

| Section | Components | Tokens |
|---------|-----------|--------|
| **Toolbar** | Search (Input, search variant) + Filter (Select/Button) + Sort (Select) + View toggle (Button group) | Padding: `--page-padding` horizontal, `--space-4` vertical. Background: `--surface-base`. |
| **Grid view** | Cards (Interactive variant) in CSS Grid | `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`. Gap: `--card-gap`. |
| **List view** | Cards (Compact variant) stacked vertically | Full width. Gap: `--space-2`. |
| **Footer** | Count label + pagination or Load More button | `--text-sm`, `--text-muted`. Padding: `--page-padding`. |

**Empty state:** When no entities exist, the EmptyState component replaces the grid area.

**Loading state:** SkeletonLoader cards matching the grid layout (6 skeleton cards in grid, 4 in list).

**Responsive:**
- Desktop: 3 columns
- Tablet: 2 columns
- Mobile: 1 column (list view forced)

---

### 5.3.2 Detail View

Displays a single entity with all its properties, related data, and actions.

**Anatomy:**

```
┌──────────────────────────────────────────────────────────┐
│  [← Back]  Entity Title            [Edit] [Delete] [⋮]  │
│            Status badge · Department · Created date       │
│──────────────────────────────────────────────────────────│
│                                                          │
│  ┌─────────────────────────┐  ┌────────────────────────┐│
│  │                         │  │                        ││
│  │  Primary Content        │  │  Sidebar               ││
│  │  (description, config,  │  │  (metadata, related    ││
│  │   instructions, body)   │  │   entities, activity   ││
│  │                         │  │   log, quick actions)   ││
│  │                         │  │                        ││
│  └─────────────────────────┘  └────────────────────────┘│
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │  Tabs: Overview | Configuration | History | Related  ││
│  │────────────────────────────────────────────────────── ││
│  │  Tab content area                                    ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Structure:**

| Section | Layout | Tokens |
|---------|--------|--------|
| **Header** | Back link + entity title + status + actions | Back: Ghost button with `arrow-left`. Title: `--text-2xl`. |
| **Primary + Sidebar** | 65% / 35% split on desktop. Stacked on tablet/mobile. | Gap: `--space-8`. Padding: `--page-padding`. |
| **Tabs** | Full-width tab bar below the primary content | Tab bar: `--border-default` bottom border. Active tab: `--color-primary` underline, `--weight-semibold`. |

**Back navigation:** Always present. Returns to the entity list with preserved scroll position and filters.

**Responsive:**
- Desktop: Side-by-side primary + sidebar
- Tablet: Primary full-width, sidebar collapses to expandable section below
- Mobile: Single column, all sections stacked. Tabs become a scrollable horizontal strip.

---

### 5.3.3 Dashboard

Overview page combining metrics, charts, and actionable summaries.

**Anatomy:**

```
┌──────────────────────────────────────────────────────────┐
│  Page Header                                     [date]  │
│──────────────────────────────────────────────────────────│
│                                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│  │Metric│ │Metric│ │Metric│ │Metric│                   │
│  │Card  │ │Card  │ │Card  │ │Card  │                   │
│  └──────┘ └──────┘ └──────┘ └──────┘                   │
│                                                          │
│  ┌───────────────────────────┐ ┌──────────────────────┐ │
│  │                           │ │                      │ │
│  │  Primary Chart            │ │  Secondary Chart     │ │
│  │  (line/bar, full trend)   │ │  (pie/donut/bar)     │ │
│  │                           │ │                      │ │
│  └───────────────────────────┘ └──────────────────────┘ │
│                                                          │
│  ┌───────────────────────────┐ ┌──────────────────────┐ │
│  │  Data Table               │ │  Activity Feed       │ │
│  │  (top items, at-risk)     │ │  (recent actions)    │ │
│  │                           │ │                      │ │
│  └───────────────────────────┘ └──────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Structure:**

| Section | Layout | Components |
|---------|--------|-----------|
| **Metrics row** | 4-column grid (responsive: 2 on tablet, stacked on mobile) | MetricCard (sm) |
| **Charts row** | 60/40 split (responsive: stacked) | Chart components inside Cards |
| **Details row** | 60/40 split (responsive: stacked) | DataTable + Activity list |

**Tokens:**

| Property | Token |
|----------|-------|
| Grid gap | `--card-gap` |
| Section gap | `--section-gap` |
| Padding | `--page-padding` |

**Date range selector:** Dropdown in header actions area. Options: Last 7 days, Last 30 days, This quarter, Custom range. Changing the range refreshes all dashboard data.

**Responsive:**
- Desktop: Full grid layout as shown
- Tablet: Metrics 2x2, charts and details stacked full-width
- Mobile: Everything single column, metrics in horizontal scroll strip

---

### 5.3.4 Composed Canvas

When Higgins builds a canvas response rather than the user navigating to a traditional page. This is the Knowledge Navigator in action — the canvas is filled by conversation, not by navigation.

**Anatomy:**

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  CanvasBlock: MetricCards (row)                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  CanvasBlock: Chart (full width)                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────┐ ┌────────────────────────┐    │
│  │  CanvasBlock: Table   │ │  CanvasBlock: Narrative│    │
│  │                      │ │                        │    │
│  └──────────────────────┘ └────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  CanvasBlock: ActionCard                          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

This layout is not pre-determined — it's dynamically composed by the CanvasComposite layout engine (4.5.2). The rules from 2.3.4 govern block arrangement.

**Tokens:**

| Property | Token |
|----------|-------|
| Canvas padding | `--page-padding` |
| Block gap | `--canvas-block-gap` |
| Max content width | `--canvas-block-max-width` (centered if canvas is wider) |

**No page header.** The composed canvas has no title bar — the conversation in the Higgins panel provides the context. Canvas blocks are self-describing via their titles and source attribution.

**Scroll behavior:** The canvas scrolls as a single surface. As new blocks are added (from ongoing conversation), the canvas auto-scrolls to show the newest block, unless the user has manually scrolled up (in which case, a "New content below ↓" indicator appears).

---

### 5.3.5 Wizard / Multi-Step

Guided multi-step flows for complex creation tasks (Soul Config wizard, onboarding, agent creation).

**Anatomy:**

```
┌──────────────────────────────────────────────────────────┐
│  Wizard Title                              Step 3 of 7   │
│──────────────────────────────────────────────────────────│
│                                                          │
│  ●━━━●━━━●━━━○───○───○───○                              │
│  Identity  Values  Bright  Guard  Voice  Domain  Review  │
│                    Lines   rails                         │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │                                                      ││
│  │  Step Content                                        ││
│  │  (form fields, configuration, preview)               ││
│  │                                                      ││
│  │                                                      ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  [← Previous]                              [Next Step →] │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Structure:**

| Section | Components | Tokens |
|---------|-----------|--------|
| **Progress bar** | Step indicator — circles connected by lines. Completed: filled `--color-primary`. Current: ring `--color-primary`. Future: ring `--border-default`. | Padding: `--space-6`. |
| **Step labels** | Text below circles | `--text-xs`, `--weight-medium`. Active: `--text-primary`. Inactive: `--text-muted`. |
| **Step content** | Card containing the step's form fields or configuration | Background: `--surface-raised`. Padding: `--card-padding`. Max-width: 720px, centered. |
| **Navigation** | Previous (secondary button) + Next (primary button) | Footer padding: `--page-padding`. Pinned to bottom of scroll area. |

**Rules:**
- Steps are clickable — users can jump back to any completed step
- Current step cannot be skipped (Next is disabled until required fields are filled)
- All steps use the same visual pattern (P13: Consistency Over Cleverness) — never mix card forms with inline forms between steps
- Final step is always a "Review" that shows a summary of all entered data before committing
- Progress persists — leaving the wizard and returning resumes at the last completed step

**Responsive:**
- Desktop/tablet: Progress bar horizontal, step content centered at max-width
- Mobile: Progress bar becomes a compact indicator ("Step 3 of 7") with step title. Horizontal dots visible but labels hidden. Swipe gestures for next/previous.

---

### 5.3.6 Split View

Two related content areas displayed side-by-side. Used for comparisons, editor+preview, and before/after views.

**Anatomy:**

```
┌──────────────────────────────────────────────────────────┐
│  Page Header                                             │
│──────────────────────────────────────────────────────────│
│                                                          │
│  ┌──────────────────────┐│┌────────────────────────────┐│
│  │                      │││                            ││
│  │  Left Panel          │││  Right Panel               ││
│  │  (source, editor,    │││  (target, preview,         ││
│  │   before)            │││   after)                   ││
│  │                      │││                            ││
│  │                      │││                            ││
│  └──────────────────────┘│└────────────────────────────┘│
│                          │                               │
└──────────────────────────────────────────────────────────┘
                           ↑
                    resize handle
```

**Layout:** 50/50 default split, resizable via center drag handle. Each panel scrolls independently.

**Tokens:**

| Property | Token |
|----------|-------|
| Divider | `1px solid --border-default` |
| Resize handle | `4px`, cursor `col-resize` |
| Panel padding | `--page-padding` |

**Responsive:** Below tablet portrait, panels stack vertically with a toggle to switch between them (not both visible simultaneously).

---

### 5.3.7 Settings / Configuration

Form-heavy pages for system configuration, account settings, and org administration.

**Anatomy:**

```
┌──────────────────────────────────────────────────────────┐
│  Page Header                                    [Save]   │
│──────────────────────────────────────────────────────────│
│                                                          │
│  ┌──────────────┐  ┌──────────────────────────────────┐ │
│  │  Sections     │  │  Section Title                   │ │
│  │               │  │  Section description             │ │
│  │  ● General    │  │                                  │ │
│  │  ○ Security   │  │  Label                           │ │
│  │  ○ Integratn  │  │  [input field]                   │ │
│  │  ○ Billing    │  │  Helper text                     │ │
│  │  ○ Advanced   │  │                                  │ │
│  │               │  │  Label                           │ │
│  │               │  │  [input field]                   │ │
│  │               │  │                                  │ │
│  └──────────────┘  └──────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Structure:**

| Section | Width | Components |
|---------|-------|-----------|
| **Section nav** | 200px fixed | Vertical list of section names. Active: `--color-primary`, `--weight-semibold`. Inactive: `--text-secondary`. Click scrolls to section. |
| **Form area** | Remaining width, max 640px | Stacked form fields (Inputs from 4.1.2) grouped by section with dividers. |

**Rules:**
- Save button in header (primary, md). Disabled until changes are made. Shows "Saved" confirmation after success.
- Unsaved changes indicator: dot next to Save button when there are pending changes.
- If user navigates away with unsaved changes, confirmation modal: "You have unsaved changes. Leave anyway?"
- Each section can have its own save if changes are independent (indicated by section-level save buttons instead of a global one).

**Responsive:**
- Tablet: Section nav becomes a horizontal scrollable strip above the form area.
- Mobile: Section nav becomes a select dropdown. Form area full width.

---

## 5.4 Overlay Patterns

Overlays appear on top of the master layout.

### 5.4.1 Command Palette Overlay

Defined in component detail at 4.4.1. Layout-level behavior:

- Centers horizontally and vertically in viewport
- Scrim covers the full viewport including Higgins panel
- Width: `--command-palette-width` (600px desktop, full-width on mobile)
- Max-height: `--command-palette-max-height` (70vh desktop, 100vh mobile)
- Z-index: `--z-overlay`

### 5.4.2 Modal Overlay

Standard modal (4.1.5) centering:

- Centers horizontally and vertically
- Width per variant: 480px (sm), 600px (md), 800px (lg)
- Mobile: full-width minus `--space-4` margin on each side, bottom-aligned with rounded top corners (sheet style)

### 5.4.3 Canvas Block Expanded

When a canvas block is expanded via its overflow menu (4.5.1):

- Block content renders in a large modal (800px or 90vw, whichever is smaller)
- Source attribution and actions visible in modal header
- Close returns to canvas with block in its original position
- On mobile: full-screen overlay with back navigation

---

## 5.5 Layout Governance

### 5.5.1 Rules

1. **Every page uses the master layout.** No page defines its own shell, frame, or navigation structure. The master layout (5.1) is universal.

2. **Content patterns are combinable.** A page can use a Dashboard pattern at the top and an Entity List below. The page padding and section gaps maintain consistency.

3. **No custom widths or positioning.** All widths come from the token system or from the pattern definitions in this section. No page should define its own `max-width`, `margin: 0 auto`, or absolute positioning for content areas.

4. **Responsive behavior is automatic.** Each pattern defines its own breakpoint behavior. Pages don't add their own responsive overrides — they compose patterns that already respond correctly.

5. **Canvas-first for new features.** New features should be designed as canvas block compositions first, traditional pages second. If a feature can work as a Higgins-composed canvas, that is the preferred implementation. Traditional pages exist for browse/edit workflows that are more efficient with direct manipulation than conversation.

### 5.5.2 Pattern Selection Guide

| When the user needs to... | Use pattern | Example |
|---------------------------|-------------|---------|
| Browse a collection of items | Entity List (5.3.1) | Agents page, Context Assets, Skills |
| View/edit one item in detail | Detail View (5.3.2) | Agent detail, OKR detail, Process detail |
| See a summary of status and health | Dashboard (5.3.3) | Main dashboard, Platform admin dashboard |
| Get an answer from Higgins | Composed Canvas (5.3.4) | "How are Q1 OKRs tracking?" response |
| Complete a multi-step setup | Wizard (5.3.5) | Soul Config wizard, Onboarding |
| Compare two things | Split View (5.3.6) | Version comparison, Before/after |
| Change system configuration | Settings (5.3.7) | Account settings, Org configuration |

---

*End of Part 5 — Layout Patterns*

---

# Part 6 — Interaction Vocabulary

*Behavioral patterns — how the interface responds to user input and how transitions communicate state*

> Components define what things are. Interactions define how things behave. A button's anatomy is specified in Part 4. How it responds to hover, focus, click, and keyboard — and how those responses feel — is specified here. Interactions are the personality of the interface.

## 6.1 Input Interactions

### 6.1.1 Hover

The system acknowledges the user's attention before they commit to an action.

| Element | Hover Response | Timing | Token |
|---------|---------------|--------|-------|
| **Button (filled)** | Background darkens 10% | `--duration-fast` | `--ease-default` |
| **Button (outlined/ghost)** | Background tints `--color-primary-muted` | `--duration-fast` | `--ease-default` |
| **Card (interactive)** | Border brightens, shadow lifts to `--shadow-md` | `--duration-fast` | `--ease-default` |
| **Table row** | Background `--bg-hover` | `--duration-instant` | `--ease-default` |
| **Link** | Color shifts to `--color-primary-light`, underline appears | `--duration-instant` | — |
| **Command Palette tile** | Border `--color-primary`, background `--color-primary-muted` | `--duration-fast` | `--ease-default` |
| **Quick reply chip** | Background `--agent-accent-muted` | `--duration-fast` | `--ease-default` |
| **Higgins avatar (ambient)** | Glow intensifies (opacity increases) | `--duration-base` | `--ease-default` |
| **Canvas block action** | Icon color `--text-primary` (from `--text-muted`) | `--duration-instant` | — |

**Rules:**
- Hover effects are subtle, never dramatic — a slight lift, a gentle tint, a brightened border
- Touch devices: hover states are skipped entirely (`:hover` only applies via `@media (hover: hover)`)
- Hover never reveals essential information — anything shown on hover must also be accessible via click, focus, or screen reader

### 6.1.2 Focus

Focus makes keyboard navigation visible and predictable. Every interactive element has a focus state.

**Focus ring specification:**

| Property | Value |
|----------|-------|
| Style | `2px solid --border-focus` |
| Offset | `2px` (gap between element and ring) |
| Radius | Matches the element's border-radius + 2px |
| Visibility | `:focus-visible` only — visible on keyboard focus, hidden on mouse click |

**Focus order:**
- Follows DOM order (no `tabindex` values > 0)
- Within modals and Command Palette: focus is trapped (Tab cycles within the overlay)
- Skip links: hidden link at page top, visible on focus, jumps to main content area

**Special focus behaviors:**

| Context | Behavior |
|---------|----------|
| **Command Palette** | Search input auto-focused on open. Arrow keys move through results. |
| **DataTable** | Tab moves between rows. Arrow keys move between cells. Enter activates row action. |
| **Wizard** | Tab moves through form fields. Completed step circles are focusable and activatable. |
| **Canvas blocks** | Tab moves between blocks. Each block's actions are accessible via Enter → arrow keys. |
| **Higgins conversation** | Tab from last message jumps to input. Shift+Tab from input moves to most recent message. |

### 6.1.3 Click / Tap

The primary activation gesture. Response must feel immediate.

| Element | Click Response | Visual Feedback | Timing |
|---------|---------------|----------------|--------|
| **Button** | Scale to 0.98, background darkens | Pressed state visible for at least `--duration-instant` even if action completes faster | Immediate |
| **Card (interactive)** | Navigates to detail view | Brief press state (background shift), then navigation | Immediate |
| **Toggle / Switch** | State changes | Knob slides, track color changes | `--duration-fast` |
| **Checkbox** | State changes | Check mark appears with scale-in | `--duration-fast`, `--ease-spring` |
| **Quick reply chip** | Sends as user message | Chip fills with `--agent-accent`, then disappears | `--duration-base` |
| **Command Palette tile** | Navigates to destination | Tile pulses `--color-primary`, palette closes | `--duration-base` |
| **Canvas block pin** | Toggles pinned state | Icon fills/unfills, top border accent appears/fades | `--duration-base` |

**Double-click:** Used sparingly — only for resize handle reset (double-click to restore default panel width). Never for primary actions.

**Long-press (touch):** Opens context menu on mobile. Same items as right-click context menu on desktop. Visual feedback: element scales to 0.96 during hold, then context menu slides up.

### 6.1.4 Keyboard Shortcuts

Global shortcuts available regardless of focus position:

| Shortcut | Action | Context |
|----------|--------|---------|
| `Cmd+K` / `Ctrl+K` | Open Command Palette | Always |
| `Cmd+H` / `Ctrl+H` | Toggle Higgins panel | Mode C only |
| `Escape` | Close topmost overlay / Cancel current action | When overlay is open |
| `/` | Focus search (if search is on current page) | Not when input is focused |
| `?` | Open help modal | Not when input is focused |

**Conversation shortcuts (when Higgins input is focused):**

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `Up Arrow` | Edit last sent message (if input is empty) |
| `Escape` | Blur input / collapse Higgins panel (Mode C) |

**Discoverability:** Keyboard shortcuts are listed in the help modal and shown as tooltip hints on their corresponding buttons (e.g., the Command Palette nav icon shows "⌘K" in its tooltip).

### 6.1.5 Drag

Drag interactions are used for resizing and reordering, never for primary navigation.

| Context | What is dragged | Behavior | Visual Feedback |
|---------|----------------|----------|----------------|
| **Panel resize** | Handle between Higgins panel and canvas | Panel width changes. Content reflows. | Cursor `col-resize`. Handle highlights on hover. |
| **Canvas block reorder** | Block header (pinned blocks only) | Block moves vertically. Other blocks slide to accommodate. | Shadow lifts to `--shadow-lg`. Slight rotation (2deg). Opacity 0.9. Drop zone highlighted. |
| **Split view resize** | Center divider | Panel proportions change. | Cursor `col-resize`. Divider highlights. |

**Drag constraints:**
- Panel resize: min/max width enforced (`--higgins-panel-min` to `--higgins-panel-max`)
- Canvas block reorder: vertical only, snaps to position
- All drag operations have keyboard alternatives (arrow keys when focused)

**Touch drag:** Requires long-press to initiate (prevents conflict with scroll). Haptic feedback on mobile at drag start and drop.

---

## 6.2 State Transitions

### 6.2.1 Streaming

How content progressively appears during LLM response generation.

**Text streaming (Higgins responses):**

| Phase | Visual | Duration |
|-------|--------|----------|
| **Thinking** | ThinkingIndicator appears with contextual status text | Variable (until first token arrives) |
| **First token** | ThinkingIndicator fades out, MessageBubble appears with blinking cursor | `--duration-base` crossfade |
| **Streaming** | Text appears character-by-character. Cursor moves with text. | Real-time (SSE stream rate) |
| **Complete** | Cursor disappears. Timestamp and model indicator fade in. Quick reply chips slide in. | `--duration-base` |

**Canvas block streaming (composed responses):**

| Phase | Visual | Duration |
|-------|--------|----------|
| **Announced** | Higgins says "Let me pull that together..." in conversation | — |
| **First block** | CanvasBlock slides in from below with SkeletonLoader content | `--duration-moderate`, `--ease-spring` |
| **Block populates** | Skeleton fades, real content fades in | `--duration-base`, crossfade |
| **Additional blocks** | Each subsequent block slides in below the previous | `--duration-moderate`, staggered by `100ms` |
| **Complete** | All blocks visible. Source attributions fade in. | `--duration-base` |

**Interruption:** If the user sends a new message while streaming is in progress, current streaming stops gracefully — partial content remains visible (not discarded), and Higgins begins responding to the new input.

### 6.2.2 Navigation Transitions

How the interface changes when the user moves between views.

| Transition | Animation | Duration | Easing |
|-----------|-----------|----------|--------|
| **Page to page (canvas)** | Content crossfade. Old content fades to 0, new content fades from 0. | `--duration-base` | `--ease-default` |
| **Command Palette open** | Scrim fades in. Palette scales from 0.95 + fades in. | `--duration-moderate` | `--ease-spring` |
| **Command Palette close** | Palette scales to 0.95 + fades out. Scrim fades out. | `--duration-base` | `--ease-in` |
| **Higgins panel open (Mode C)** | Panel slides in from left. Canvas narrows or panel overlays. | `--duration-slow` | `--ease-out` |
| **Higgins panel close (Mode C)** | Panel slides out to left. Canvas expands. | `--duration-moderate` | `--ease-in` |
| **Modal open** | Scrim fades in. Modal scales from 0.95 + fades in. | `--duration-moderate` | `--ease-spring` |
| **Modal close** | Reverse of open. | `--duration-base` | `--ease-in` |
| **Detail view open** | Card expands into detail view (shared-element transition on title) | `--duration-moderate` | `--ease-default` |
| **Detail view close (back)** | Reverse of open | `--duration-moderate` | `--ease-default` |

**Reduce motion:** All transitions become instant opacity fades (`--duration-instant`) or are removed entirely. No sliding, scaling, or springing.

### 6.2.3 Loading States

How the interface communicates "working" at different scopes.

| Scope | Pattern | Visual |
|-------|---------|--------|
| **Button action** | Button enters loading state (spinner replaces label, width preserved) | Inline, contained to the button |
| **Section refresh** | SkeletonLoader replaces section content | Shimmer animation matching content shape |
| **Full page load** | SkeletonLoader for entire page structure | Page header skeleton + content skeleton |
| **Canvas composition** | Blocks appear one-by-one with staggered skeleton → content transitions | Progressive reveal |
| **Background task** | Toast notification "Working on your request..." with progress bar | Non-blocking |
| **Higgins thinking** | ThinkingIndicator with descriptive status text | In conversation stream |

**Never just a spinner.** Context-free spinners violate P12 (Transparency of Process). Every loading state communicates *what* is loading, not just *that* something is loading.

### 6.2.4 Success and Error States

**Success:**

| Context | Response | Duration |
|---------|----------|----------|
| **Form save** | Button shows checkmark, reverts to label. Toast: "Saved successfully." | Checkmark: `--duration-deliberate`. Toast: 5s auto-dismiss. |
| **Entity created** | Toast: "Agent created." with link to view. Navigates to detail view or stays on list (user preference). | Toast: 5s. Navigation: immediate. |
| **Canvas action** | ActionCard border pulses green. Higgins confirms in conversation. | Pulse: `--duration-deliberate`. |
| **Message sent** | MessageBubble appears in stream. Confirmation in conversation. | Immediate. |

**Error:**

| Context | Response | Persistence |
|---------|----------|-------------|
| **Form validation** | Input border red, error message below field. First error field scrolled into view. | Until corrected |
| **API failure** | Toast (error variant). Message includes what failed and what to do. | Persists until dismissed |
| **Streaming failure** | Error MessageBubble in conversation. "I ran into a problem. [details]. Want me to try again?" with retry button. | Persistent in conversation |
| **Canvas block failure** | Block shows error state with retry button and explanation. Other blocks unaffected. | Until retried or dismissed |

**Error recovery:** Every error state includes a path forward — retry, alternative, or navigation to fix the root cause. (P9: No Dead Ends)

---

## 6.3 Agent Interaction Patterns

Behaviors specific to the Higgins experience.

### 6.3.1 Proactive Suggestions

Higgins can initiate interaction without being asked. These suggestions must be **non-intrusive** — they invite attention but never demand it.

| Mode | Notification | User Action to Engage |
|------|-------------|----------------------|
| **Mode A (panel visible)** | Suggestion appears as a new MessageBubble in the conversation, below the fold if user is scrolled up. Subtle scroll indicator shows "New suggestion ↓". | Scroll down to see, or ignore |
| **Mode C (ambient)** | Avatar notification dot appears (8px, `--status-info`). Optional text preview (2-line max) appears as a tooltip near avatar, auto-dismisses after 8 seconds. | Click avatar to read full suggestion |
| **Mobile** | System notification (if permitted) or badge on Chat tab. Never a full-screen interrupt. | Tap notification or tab |

**Frequency throttle:** Maximum 3 unsolicited suggestions per session. If the user dismisses all 3 without engaging, Higgins stops suggesting for that session.

**Suggestion types (what triggers them):**

| Trigger | Example Suggestion |
|---------|-------------------|
| Time-sensitive item | "Your Q1 OKR review is due Friday. Want me to pull the latest numbers?" |
| Anomaly detected | "Support ticket volume is 2.5x normal today. Want me to investigate?" |
| Stale data | "The board presentation hasn't been updated in 3 weeks. Want me to refresh the data?" |
| Workflow completion | "The weekly briefing workflow completed. 3 items need your review." |
| Contextual opportunity | "You're viewing the Support dashboard — I noticed 2 escalations pending. Want to see them?" |

### 6.3.2 Conversation Turn-Taking

The rhythm of the Higgins conversation follows natural turn-taking patterns.

**Pacing:**
- Higgins never sends multiple messages in rapid succession — each response is a single coherent bubble (with rich content embedded), not a stream of separate messages
- If Higgins needs to perform multiple steps, he uses a single message with progressive status updates ("Pulling data... analyzing... here's what I found:")
- After completing a response, Higgins waits for user input — he doesn't add follow-up messages unless the user has been idle for 30+ seconds and there's a relevant proactive suggestion

**Interruption handling:**
- If the user sends a message while Higgins is streaming, the stream stops gracefully
- Partial content remains visible (not deleted)
- Higgins acknowledges the interruption naturally: "Sure, let me shift to that instead." or simply responds to the new input
- Canvas blocks from the interrupted response remain visible unless the new response replaces them

**Multi-turn memory:**
- Higgins references earlier parts of the conversation naturally, not mechanically
- "Earlier you asked about..." is good. "As per my response at 10:32 AM..." is not.
- If the conversation is long and the user asks about something from early on, Higgins can quote or summarize what was said

### 6.3.3 Canvas-Conversation Coordination

How the Higgins panel and canvas work together as a synchronized pair.

**Conversation drives canvas:**

| User Action in Higgins Panel | Canvas Response |
|-----------------------------|----------------|
| Asks a question | Canvas shows composed response (blocks assemble) |
| Clicks quick reply chip | Canvas updates based on the follow-up |
| Clicks "Show on canvas" link | Canvas scrolls to or restores the referenced content |
| Selects a navigation item from conversation | Canvas navigates to that page/module |

**Canvas drives conversation:**

| User Action on Canvas | Higgins Panel Response |
|----------------------|----------------------|
| Clicks "This isn't right" on a canvas block | Correction flow appears in conversation |
| Selects data in a chart or table | Higgins acknowledges: "I see you're looking at [selection]. Want me to dig deeper?" |
| Pins a canvas block | Higgins notes: "Pinned. I'll keep that visible as we continue." |
| Navigates via Command Palette | Higgins context updates — he knows what page the user is viewing |

**Scroll independence:** The Higgins panel and canvas scroll independently. Neither's scroll position affects the other. This allows the user to scroll back through conversation history while the canvas shows current content, or vice versa.

### 6.3.4 Voice Interaction

When voice input is enabled, the interaction model extends to spoken dialogue.

**Activation:**
- Microphone button in HigginsInput component
- Wake phrase: "Hey Higgins" (configurable per org in Soul Config)
- Hardware: device microphone. No special hardware required.

**Flow:**

| Phase | Visual | Audio |
|-------|--------|-------|
| **Listening** | Microphone icon pulses. Avatar enters listening state. Waveform animation in input area. | Input audio captured |
| **Processing** | Waveform stops. ThinkingIndicator appears. | Silence |
| **Responding** | Response appears as text in conversation. Canvas updates. | Voice response plays through device speakers (optional — user can disable voice output) |
| **Complete** | Return to idle/ready. Microphone ready for next input. | Silence |

**Voice output style:** Higgins's voice is calm, warm, with a light British accent (per 2.1.1). Speech rate is natural — not artificially slowed or sped up. Technical terms are pronounced clearly.

**Fallback:** If speech recognition fails, Higgins responds: "I didn't catch that. Could you try again, or type your request?" The input area activates for text input.

**Privacy indicator:** When the microphone is active, a visible recording indicator (red dot + "Listening") appears. Recording stops immediately when the user finishes speaking or taps the microphone button again. No ambient listening — the mic only activates on explicit trigger.

---

## 6.4 Gesture Patterns (Touch)

### 6.4.1 Standard Gestures

| Gesture | Context | Action |
|---------|---------|--------|
| **Tap** | Buttons, links, cards, chips | Activation (same as click) |
| **Swipe left** | Higgins panel (tablet portrait) | Switch to canvas view |
| **Swipe right** | Canvas (tablet portrait) | Switch to Higgins panel |
| **Swipe down** | Bottom sheet (mobile), modal | Dismiss |
| **Long-press** | Canvas blocks, cards | Open context menu |
| **Pinch** | Charts, images | Zoom in/out |
| **Pull down** | List views, dashboards | Refresh data |

### 6.4.2 Gesture Feedback

Every gesture produces immediate visual feedback:

- **Tap:** Ripple effect or press state (scale 0.98) within `--duration-instant`
- **Swipe:** Content follows finger position with momentum. Rubberband at boundaries.
- **Long-press:** Element scales to 0.96 during hold. Context menu slides up from bottom on mobile.
- **Pull-to-refresh:** Spinner appears at top, pulled down with finger. Snaps to refresh position when released past threshold.

---

## 6.5 Interaction Governance

### 6.5.1 Rules

1. **Every interaction has immediate feedback.** The user must never wonder "did that work?" within 100ms of any input. Even if the result takes time, the acknowledgment is instant. (P12: Transparency)

2. **Transitions serve comprehension, not decoration.** An animation exists to help the user understand what changed and where it went. If removing the animation wouldn't confuse the user, the animation shouldn't exist.

3. **Consistency across input methods.** The same action produces the same result whether triggered by mouse, keyboard, touch, or voice. The visual feedback may differ by input method, but the outcome is identical. (P13: Consistency Over Cleverness)

4. **Interruptibility.** Any in-progress interaction can be interrupted by the user without loss. Streaming can be stopped. Drags can be cancelled (Escape). Multi-step tasks can be abandoned and resumed. (P11: Human Directs)

5. **Reduced motion is a first-class mode.** When `prefers-reduced-motion: reduce` is active, every interaction must still be comprehensible. This means state changes must be communicable through something other than animation — color change, icon swap, or text update.

6. **No surprise gestures.** Swipe-to-delete, shake-to-undo, and other discoverable-only-by-accident gestures are not used. Every gesture has a visible equivalent (button, menu item).

---

*End of Part 6 — Interaction Vocabulary*

---

# Part 7 — Data Contracts

*The interface between data and presentation — how data flows into components, how components communicate state, and how the system remains decoupled*

> Data contracts are the boundaries that keep the design system independent of the application's data model. A CanvasBlock doesn't know about "agents" or "OKRs" — it knows about a data shape with a title, a content type, and a source attribution. The application maps its domain objects into these shapes. If the data model changes, the design system doesn't. If the design system evolves, the data model doesn't. (P3: Separation of Intent and Presentation)

## 7.1 Canvas Block Contracts

Every canvas block (4.5.1) receives data through a typed contract. Higgins's composition engine (2.3) maps module data into these shapes before passing them to the canvas renderer.

### 7.1.1 Base Block Contract

All canvas blocks share a common envelope:

```json
{
  "id": "block_uuid",
  "type": "metric_card | chart | data_table | narrative | image | document | action_card | comparison | embed | external",
  "title": "Optional block title",
  "source": {
    "module": "parthenon | agents | context | support | workflows | soul_config | conversations",
    "label": "Parthenon OKRs",
    "updated_at": "2026-03-21T14:30:00Z",
    "freshness": "live | recent | stale",
    "generated": false
  },
  "pinned": false,
  "content": { /* type-specific payload — see below */ }
}
```

| Field | Required | Purpose |
|-------|:--------:|---------|
| `id` | Yes | Unique block identifier for pinning, removal, and canvas history |
| `type` | Yes | Determines which component renders the block and which content shape to expect |
| `title` | No | Displayed in block header. Omitted for inline blocks (metric rows). |
| `source.module` | Yes | Which module provided the data. Drives the source attribution label. |
| `source.label` | Yes | Human-readable source name displayed in block footer. |
| `source.updated_at` | Yes | ISO 8601 timestamp. Renderer calculates relative time ("2h ago"). |
| `source.freshness` | Yes | `live` (real-time), `recent` (< 1 hour), `stale` (> 1 hour). Drives visual staleness indicator. |
| `source.generated` | Yes | `true` if content was AI-generated (shows generation indicator). `false` if retrieved from database. |
| `pinned` | Yes | Whether the user has pinned this block. Renderer shows pin state. |
| `content` | Yes | Type-specific payload. Shape varies by `type`. |

### 7.1.2 Content Payloads by Type

**MetricCard:**

```json
{
  "type": "metric_card",
  "content": {
    "metrics": [
      {
        "label": "On Track",
        "value": 7,
        "format": "number | currency | percent | duration",
        "trend": {
          "direction": "up | down | flat",
          "value": 12.5,
          "comparison": "vs last month"
        },
        "sparkline": [44, 55, 41, 67, 52, 63, 70]
      }
    ]
  }
}
```

| Field | Required | Notes |
|-------|:--------:|-------|
| `metrics` | Yes | Array of 1–6 metrics. Layout: 4 per row on desktop, wrapping. |
| `label` | Yes | What the metric measures. |
| `value` | Yes | Raw value. Renderer formats based on `format`. |
| `format` | Yes | `number` (12,345), `currency` ($12,345), `percent` (12.5%), `duration` (2h 30m). |
| `trend` | No | If present, shows direction arrow, value, and comparison text. |
| `sparkline` | No | Array of numeric values. Rendered as a mini line chart (40px tall). |

**Chart:**

```json
{
  "type": "chart",
  "content": {
    "chart_type": "bar | line | area | pie | donut | timeline",
    "title": "OKR Progress Over Time",
    "x_axis": { "label": "Month", "values": ["Jan", "Feb", "Mar"] },
    "y_axis": { "label": "Progress %", "min": 0, "max": 100 },
    "series": [
      {
        "name": "On Track",
        "values": [65, 72, 78],
        "color": null
      },
      {
        "name": "At Risk",
        "values": [20, 18, 15],
        "color": null
      }
    ],
    "annotations": [
      { "x": "Feb", "label": "v3.79 Release", "style": "line" }
    ]
  }
}
```

| Field | Required | Notes |
|-------|:--------:|-------|
| `chart_type` | Yes | Determines chart renderer. |
| `series` | Yes | Array of data series. `color` is optional — if null, uses the data color sequence from 4.2.4. |
| `x_axis`, `y_axis` | Varies | Required for bar/line/area. Not used for pie/donut. |
| `annotations` | No | Vertical lines, callout labels, or highlighted regions on the chart. |

**DataTable:**

```json
{
  "type": "data_table",
  "content": {
    "columns": [
      { "key": "name", "label": "Name", "sortable": true, "width": "auto" },
      { "key": "status", "label": "Status", "sortable": true, "render": "badge" },
      { "key": "owner", "label": "Owner", "sortable": true },
      { "key": "progress", "label": "Progress", "sortable": true, "render": "progress_bar" }
    ],
    "rows": [
      { "id": "row_1", "name": "Revenue Target", "status": "at_risk", "owner": "Sales", "progress": 67 },
      { "id": "row_2", "name": "NPS Improvement", "status": "behind", "owner": "Support", "progress": 45 }
    ],
    "pagination": { "page": 1, "page_size": 20, "total": 84 },
    "actions": [
      { "label": "View", "action": "navigate", "target": "/detail/{id}" },
      { "label": "Edit", "action": "modal", "target": "edit_form" }
    ]
  }
}
```

| Field | Required | Notes |
|-------|:--------:|-------|
| `columns` | Yes | Column definitions. `render` specifies special rendering: `badge` (status badge), `progress_bar`, `avatar`, `link`, `date`. Default: text. |
| `rows` | Yes | Array of row objects. Keys match column `key` values. |
| `pagination` | No | If present, shows pagination controls. If absent, all rows displayed. |
| `actions` | No | Row-level actions in overflow menu. `action` type: `navigate` (canvas updates), `modal` (opens form), `api` (calls endpoint). |

**Narrative:**

```json
{
  "type": "narrative",
  "content": {
    "body": "Markdown-formatted text content...",
    "format": "markdown | html",
    "editable": false
  }
}
```

| Field | Required | Notes |
|-------|:--------:|-------|
| `body` | Yes | The text content. Rendered per `format`. |
| `format` | Yes | `markdown` is rendered to HTML by the component. `html` is rendered directly (sanitized). |
| `editable` | No | If `true`, user can click to edit. Changes saved back through the artifact pipeline. |

**Image:**

```json
{
  "type": "image",
  "content": {
    "url": "/api/assets/img_uuid.png",
    "alt": "Q1 Revenue Growth Chart",
    "width": 800,
    "height": 450,
    "caption": "Generated by Higgins · March 21, 2026"
  }
}
```

**Document:**

```json
{
  "type": "document",
  "content": {
    "body": "Full HTML document content...",
    "format": "html | markdown",
    "sections": [
      { "id": "s1", "title": "Executive Summary", "anchor": "executive-summary" },
      { "id": "s2", "title": "Revenue Analysis", "anchor": "revenue-analysis" }
    ],
    "export_formats": ["pdf", "html", "markdown", "pptx"]
  }
}
```

| Field | Required | Notes |
|-------|:--------:|-------|
| `sections` | No | If present, renders a table of contents / section navigation within the block. |
| `export_formats` | No | Available download formats. Shown in block actions menu. |

**ActionCard:**

```json
{
  "type": "action_card",
  "content": {
    "consequence_level": "create | modify | communicate | delete | automate",
    "title": "Send Weekly Briefing",
    "description": "To 5 recipients, includes Q1 summary and OKR status",
    "preview": { "type": "document", "content": { "..." : "..." } },
    "impact": "This email will be sent to 5 people and cannot be unsent.",
    "actions": [
      { "label": "Preview", "role": "secondary", "action": "show_preview" },
      { "label": "Edit", "role": "secondary", "action": "edit" },
      { "label": "Send Now", "role": "primary", "action": "execute", "confirm": true }
    ]
  }
}
```

| Field | Required | Notes |
|-------|:--------:|-------|
| `consequence_level` | Yes | Determines left-border color (from 4.3.6). |
| `preview` | No | Nested block contract — renders a preview of what will be created/sent. |
| `impact` | No | Human-readable impact statement shown before confirmation. |
| `actions[].confirm` | No | If `true`, clicking triggers a modal confirmation (2.4.2) before executing. |

**Comparison:**

```json
{
  "type": "comparison",
  "content": {
    "layout": "side_by_side | overlay",
    "left": { "label": "Q4 2025", "block": { /* any block contract */ } },
    "right": { "label": "Q1 2026", "block": { /* any block contract */ } },
    "deltas": [
      { "metric": "Revenue", "left_value": 120000, "right_value": 142000, "change": "+18.3%" }
    ]
  }
}
```

**Embed:**

```json
{
  "type": "embed",
  "content": {
    "page": "/agents.html",
    "params": { "filter": "department:support", "view": "grid" },
    "interactive": true
  }
}
```

| Field | Required | Notes |
|-------|:--------:|-------|
| `page` | Yes | Internal page path to embed in the canvas frame. |
| `params` | No | Query parameters to pre-filter or configure the embedded page. |
| `interactive` | Yes | If `true`, the embedded page is fully interactive. If `false`, rendered as a static snapshot. |

---

## 7.2 Command Palette Contract

The Command Palette (4.4.1) receives its data through a single contract, assembled each time the palette opens.

```json
{
  "suggestions": [
    {
      "id": "sug_1",
      "title": "Review Q1 OKRs",
      "description": "3 OKRs are due this Friday",
      "icon": "target",
      "action": { "type": "navigate", "target": "/parthenon.html#okrs" },
      "urgency": "high | medium | low"
    }
  ],
  "modules": [
    {
      "id": "mod_chat",
      "name": "Chat",
      "display_name": "Chat",
      "icon": "message-square",
      "category": "core | strategy | operations | administration",
      "route": "/chat.html",
      "accessible": true,
      "locked_reason": null,
      "frequency_score": 85
    },
    {
      "id": "mod_analytics",
      "name": "Analytics",
      "display_name": "Analytics",
      "icon": "bar-chart-2",
      "category": "operations",
      "route": "/analytics.html",
      "accessible": false,
      "locked_reason": "Requires Business tier",
      "frequency_score": 0
    }
  ],
  "recent": [
    {
      "title": "Agents",
      "icon": "bot",
      "route": "/agents.html",
      "visited_at": "2026-03-21T13:45:00Z"
    }
  ],
  "quick_actions": [
    {
      "label": "New Agent",
      "icon": "plus",
      "action": { "type": "navigate", "target": "/agents.html?action=create" }
    },
    {
      "label": "Start Conversation",
      "icon": "message-circle",
      "action": { "type": "open_higgins" }
    }
  ]
}
```

**Key behaviors driven by data:**

| Field | Component Behavior |
|-------|-------------------|
| `suggestions[].urgency` | `high` items show first with amber accent. `medium` is default. `low` appears only if panel has space. |
| `modules[].accessible` | `false` renders the tile dimmed with lock overlay. `locked_reason` shown on hover/tap. |
| `modules[].display_name` | Org-customized name via Soul Config (2.5.6). Falls back to `name` if not set. |
| `modules[].frequency_score` | Modules sorted by frequency within each category. Most-used modules surface first. |
| `modules[].category` | Groups modules into sections within the palette grid. |
| `recent[].visited_at` | Sorted by recency. Max 5 items. |
| `quick_actions[].action.type` | `navigate` updates canvas. `open_higgins` opens the conversation panel (Mode C) or focuses input (Mode A). `modal` opens a creation form. |

**Search filtering:** When the user types in the palette search bar, all four sections are filtered client-side. Matching is fuzzy — "agnt" matches "Agents", "prth" matches "Parthenon". Matching is performed against `name`, `display_name`, `title`, `label`, and `description` fields.

---

## 7.3 Agent State Protocol

Higgins's state (2.1.3) is communicated from the server to the client through a persistent state object, updated via SSE or WebSocket.

```json
{
  "agent_state": {
    "status": "ready | thinking | responding | suggesting | confirming | error | unavailable",
    "status_text": "Analyzing your Q1 OKR data...",
    "active_model": "claude-opus-4-6",
    "fallback_active": false,
    "fallback_model": null,
    "conversation_id": "conv_uuid",
    "canvas_blocks": ["block_uuid_1", "block_uuid_2"],
    "pending_action": null,
    "proactive_suggestion": null
  }
}
```

| Field | Purpose | UI Effect |
|-------|---------|-----------|
| `status` | Current agent state | Drives avatar expression, glow color, and ThinkingIndicator |
| `status_text` | What Higgins is doing | Displayed in ThinkingIndicator (6.2.1) |
| `active_model` | Which LLM is responding | Shown in message timestamp ("Claude Opus") |
| `fallback_active` | Whether a fallback model is in use | Triggers fallback transparency notice (2.4.7) |
| `fallback_model` | Which fallback model, if active | Included in transparency notice |
| `conversation_id` | Current conversation | Used for history, persistence, and artifact linking |
| `canvas_blocks` | Block IDs currently on canvas | Used for pin state persistence and canvas history |
| `pending_action` | ActionCard awaiting user confirmation | Renders ActionCard on canvas. Null when no action pending. |
| `proactive_suggestion` | Suggestion waiting to be shown | Triggers notification on avatar (Mode C) or new bubble (Mode A) |

**State transitions:**

```
ready → thinking      (user sends message)
thinking → responding (first token received from LLM)
responding → ready    (stream complete)
ready → suggesting    (proactive suggestion triggered)
suggesting → ready    (user engages or dismisses)
ready → confirming    (action card presented)
confirming → ready    (user approves, edits, or cancels)
* → error             (any failure)
error → ready         (user retries or error resolves)
* → unavailable       (all LLM providers down)
unavailable → ready   (provider restored)
```

---

## 7.4 Module Registration Contract

Every module in the platform registers itself through a standard contract that the Command Palette, navigation, and access control systems consume.

```json
{
  "id": "research_studio",
  "name": "Research Studio",
  "description": "Deep research with multi-source synthesis",
  "icon": "search",
  "category": "operations",
  "route_path": "/research.html",
  "nav_group": "tools",
  "display_order": 30,
  "min_tier": "business",
  "required_roles": ["executive", "director", "manager"],
  "is_active": true,
  "is_beta": false,
  "resource_type": null,
  "resource_limit_field": null
}
```

| Field | Purpose | Consumed By |
|-------|---------|-------------|
| `id` | Unique module identifier | `requireModule()` middleware, `can_access_module()` DB function |
| `name` | Display name | Command Palette tiles, admin pages |
| `icon` | Lucide icon name | Command Palette tiles, nav items |
| `category` | Grouping for navigation | Command Palette section grouping |
| `route_path` | Page URL | Navigation, Command Palette links |
| `nav_group` | Sidebar section (transition period) | Legacy navigation.js |
| `display_order` | Sort within category | Command Palette ordering (secondary to frequency_score) |
| `min_tier` | Minimum subscription tier required | Access control, locked tile display |
| `required_roles` | Business roles that can access | Access control, role-filtered palette |
| `is_active` | Whether module is enabled | Controls visibility everywhere |
| `is_beta` | Beta flag | Shows beta badge on palette tile |
| `resource_type` | If module manages a countable resource | `checkResourceLimit()` middleware |
| `resource_limit_field` | Which tier limit field applies | Limit enforcement |

**Registration location:** `platform_modules` table in Supabase. Modules are registered via SQL migration (see CLAUDE.md Module Integration Checklist).

---

## 7.5 Artifact Contract

When a conversation produces an artifact (2.2.9), the artifact is stored with this contract:

```json
{
  "id": "artifact_uuid",
  "title": "Q1 Churn Root Cause — Onboarding Friction",
  "type": "analysis | document | insight | process | composite | content | decision | agent_template",
  "created_by": "user_uuid",
  "created_at": "2026-03-21T15:30:00Z",
  "source_conversation_id": "conv_uuid",
  "department_id": "dept_uuid",
  "org_id": "org_uuid",
  "visibility": "personal | department | organization",
  "tags": ["onboarding", "churn", "q1-2026"],
  "content": {
    "html": "<div class='artifact'>...</div>",
    "component_blocks": ["block_uuid_1", "block_uuid_2", "block_uuid_3"]
  },
  "exports": {
    "pdf_url": "/api/artifacts/artifact_uuid/export/pdf",
    "markdown_url": "/api/artifacts/artifact_uuid/export/md",
    "html_url": "/api/artifacts/artifact_uuid/export/html"
  },
  "context_asset_id": "asset_uuid"
}
```

| Field | Purpose |
|-------|---------|
| `type` | Maps to context asset type. Determines icon and categorization in search. |
| `source_conversation_id` | Links back to the conversation that produced the artifact. Always preserved for audit trail. |
| `visibility` | Controls who can see the artifact. Personal = creator only. Department = department members. Organization = all org members. |
| `content.html` | The rendered artifact as HTML. Preserves the canvas layout of the component blocks. |
| `content.component_blocks` | References to the original canvas block IDs. Enables reconstruction if the artifact needs re-rendering. |
| `context_asset_id` | If the artifact was saved as a context asset, this links to the asset record. Enables context injection (2.2.9). |

---

## 7.6 Soul Config Voice Contract

When Higgins generates text, the Soul Config voice settings (2.5.2) are passed to the LLM as a structured configuration:

```json
{
  "voice": {
    "formality": "casual | conversational | professional | formal",
    "warmth": "analytical | balanced | warm | nurturing",
    "directness": "exploratory | advisory | direct | assertive",
    "technical_depth": "simple | moderate | detailed | expert",
    "humor": "none | occasional | regular",
    "terminology": {
      "customer": "client",
      "revenue": "practice income",
      "churn": "client departure",
      "onboarding": "enrollment"
    },
    "greeting_style": "task_focused | warm_checkin | data_forward"
  },
  "values": {
    "primary_lenses": ["justice", "common_good"],
    "secondary_lenses": ["virtue", "care_ethics"],
    "emphasis": "When presenting decisions, lead with equitable impact and community considerations."
  },
  "guardrails": {
    "bright_lines": [
      {
        "rule": "No pricing changes exceeding 20% without executive and finance review",
        "severity": "hard_stop",
        "response": "Flag the guardrail and offer alternatives within the threshold."
      }
    ],
    "soft_guardrails": [
      {
        "rule": "All client-facing communications require 48-hour review period",
        "severity": "warning",
        "response": "Warn the user and allow override with acknowledgment."
      }
    ]
  }
}
```

This contract is assembled by `soulConfigService.js` from the org's Soul Config hierarchy (platform → org → department → agent) and injected into the system prompt for every LLM call. The design system consumes the voice settings for:

- Higgins greeting text (HigginsInput placeholder customization)
- Error message tone calibration
- Command Palette suggestion phrasing
- Generated document voice
- Guardrail indicator rendering (which rules to show, at what severity)

---

## 7.7 Audit Event Contract

Every consequential action (2.4.6) produces an audit event:

```json
{
  "id": "event_uuid",
  "timestamp": "2026-03-21T15:45:00Z",
  "action": "agent_created | briefing_sent | okr_modified | asset_deleted | workflow_automated | guardrail_overridden | bright_line_triggered",
  "initiated_by": "user_uuid",
  "executed_by": "higgins | user",
  "approved_by": "user_uuid",
  "org_id": "org_uuid",
  "scope": {
    "entity_type": "agent | okr | process | asset | conversation | workflow",
    "entity_id": "entity_uuid",
    "entity_name": "Support Onboarding Agent",
    "affected_count": 1
  },
  "detail": {
    "description": "Created agent 'Support Onboarding Agent' in Support department",
    "changes": { "before": null, "after": { "name": "Support Onboarding Agent", "department": "Support" } }
  },
  "source_conversation_id": "conv_uuid",
  "reversible": true,
  "reverse_until": "2026-03-21T16:15:00Z"
}
```

| Field | Purpose | UI Usage |
|-------|---------|----------|
| `action` | What happened | Action log filtering, icon selection |
| `executed_by` | `higgins` or `user` | Attribution column in audit log |
| `approved_by` | Who confirmed | Shows that a human approved the action |
| `scope.affected_count` | How many entities were affected | Impact indicator in log ("Deleted 12 conversations") |
| `detail.changes` | Before/after diff | Expandable detail view in audit log |
| `source_conversation_id` | Which conversation triggered this | "View conversation" link in audit log |
| `reversible` | Whether undo is available | Shows "Undo" button if within `reverse_until` window |
| `reverse_until` | Undo deadline (30s for most, null for irreversible) | Countdown or "Expired" in audit log |

---

## 7.8 Data Contract Governance

### 7.8.1 Rules

1. **Contracts are the API between data and design.** Components never reach into the application data model directly. They receive data through these contracts. If a component needs a field that isn't in the contract, the contract is extended — the component doesn't add a special case.

2. **Contracts are versioned.** When a contract shape changes, the version is incremented. Old versions are supported for one release cycle via adapter functions, then removed. Breaking changes are never silent.

3. **Null handling is explicit.** Every optional field defines what the component does when the field is null or absent. "Omit the section" is valid. "Show a broken layout" is not. Components must render gracefully with minimal data — the base contract fields only.

4. **Type safety.** All contract fields have defined types. `value` is always a number, never a string that might be a number. `format` is always one of the enumerated options, never a freeform string. Type mismatches fail loudly in development, silently in production (with a logged error).

5. **Org scoping is inherited.** Contracts do not carry `org_id` for display purposes — org scoping is enforced at the API layer (see CLAUDE.md Multi-Tenant Data Scoping Rules). By the time data reaches a contract, it has already been validated as belonging to the requesting user's organization.

6. **Contracts are the documentation.** These shapes are the canonical reference for what data each component expects. If the code diverges from these contracts, the code is wrong.

---

*End of Part 7 — Data Contracts*

---

*End of Insight 360 Design System Specification v1.0*
