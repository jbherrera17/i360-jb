# Open Brain Visual Dashboard -- PRD & Implementation Brief

**Author:** Reese (PM Spec Writer)
**Date:** 2026-03-16
**Status:** Draft
**Target Page:** `public/open-brain.html` (redesign of existing page)

---

## 1. Problem Statement

The current Open Brain page is a functional but flat three-tab interface (Capture, Browse, Templates) with a floating chat modal. It treats all thoughts identically -- a chronological list with type badges. Users cannot see the shape of their knowledge at a glance, cannot explore by category, and must open a separate modal to interact conversationally with their data.

The chat modal is disconnected from the display: searching in chat does not filter the main view, and capturing in chat does not visibly update the browse list without a manual refresh of the underlying tab. The Templates tab, while useful for onboarding, occupies a full tab for static reference content.

**Core pain points:**
- No spatial organization -- all thoughts live in one flat list
- Chat is a modal overlay, not a workspace companion
- No way to see "all my ideas" or "everything about Rachel" without manual filter gymnastics
- Stats bar parses raw text strings from MCP responses -- fragile and limited

---

## 2. Goals & Non-Goals

### Goals
1. Organize thoughts into four meaningful visual categories: Ideas, Content, People, Projects
2. Embed the chat panel as a persistent sidebar, making it the primary interaction surface
3. Enable chat commands to drive the display (chat-to-view reactivity)
4. Surface key metrics in a scannable stats bar
5. Preserve all existing functionality (capture, browse, search, templates)

### Non-Goals
- No new API endpoints -- use existing `/api/open-brain/*` and `/api/chat/stream`
- No changes to the Open Brain MCP service or data model
- No drag-and-drop or manual re-categorization of thoughts
- No real-time collaboration or multi-user features
- No mobile-specific layout (responsive is fine, mobile-first is not a goal)

---

## 3. User Stories & Acceptance Criteria

### US-1: Category Views
**As a** user, **I want to** see my thoughts organized by Ideas, Content, People, and Projects **so that** I can find and reason about related thoughts together.

**Acceptance Criteria:**
- Four category tabs/buttons are visible below the stats bar
- "Ideas" shows thoughts where `type=idea`, displayed as visual cards
- "Content" shows thoughts where `type=observation` OR `type=reference`
- "People" shows thoughts that have a non-empty `people[]` array, grouped by person name
- "Projects" shows thoughts where `type=task` OR topics contain project-related keywords
- Each category shows a count badge with the number of matching thoughts
- An "All" option shows all thoughts in a unified feed (default view)
- Switching categories does not lose scroll position in other categories
- Empty categories show an appropriate empty state with guidance

### US-2: Persistent Embedded Chat Panel
**As a** user, **I want** the chat to be a persistent side panel (not a modal popup) **so that** I can converse with my brain while viewing my thoughts simultaneously.

**Acceptance Criteria:**
- Chat panel is fixed on the right side of the page, always visible
- Panel has a collapsible toggle (keyboard shortcut: `Ctrl+/` or `Cmd+/`)
- When collapsed, a thin vertical strip with a chat icon remains clickable
- Chat uses `/api/chat/stream` (SSE) with Open Brain context injection (the existing Higgins integration already injects Open Brain context into chat)
- Chat supports both search and capture modes (existing mode toggle preserved)
- Chat history persists for the session (not across page reloads)
- Panel width is approximately 380px and does not compress the main content below usable thresholds
- On viewports below 1024px, chat becomes a slide-over drawer instead of a fixed panel

### US-3: Chat-to-Display Reactivity
**As a** user, **I want** my chat commands to filter and update the main display **so that** I can explore my data conversationally.

**Acceptance Criteria:**
- When the user types a search query in chat, the main view filters to show matching results
- When the user captures a thought via chat, the thought appears in the appropriate category view without manual refresh
- The chat panel shows an "Applied filter" chip when the display is being driven by a chat query; clicking the chip clears the filter
- Natural language intent detection for display commands:
  - "show me ideas from last week" -> switches to Ideas category, applies `days=7` filter
  - "what do I know about Rachel?" -> switches to People category, filters to Rachel
  - "find references about pricing" -> switches to Content category, applies search
  - "show everything" or "clear filters" -> resets to All view
- Intent detection runs client-side via keyword matching (not LLM) for immediate responsiveness; the LLM chat response runs in parallel for conversational context

### US-4: Visual Thought Cards
**As a** user, **I want** thought cards to be visually rich **so that** I can scan and identify relevant thoughts quickly.

**Acceptance Criteria:**
- Each card shows: type badge (color-coded), content text (truncated with expand), topic tags, people mentions, timestamp, and similarity score (when from search)
- Cards in the Ideas category use a warm accent color scheme (amber/yellow tones)
- Cards in the Content category use a cool accent (cyan/teal tones)
- Cards in the People category show the person name as a header, with a person icon
- Cards in the Projects category use the primary color scheme (indigo tones)
- Cards support a quick-action menu (three-dot icon): "Copy text", "Related thoughts" (triggers a semantic search for that thought's content), "Open in chat" (sends content to chat input for follow-up)
- Cards animate in on load (subtle fade-up, staggered)

### US-5: Stats Bar
**As a** user, **I want** a metrics bar at the top of the page **so that** I can see a summary of my brain at a glance.

**Acceptance Criteria:**
- Stats bar shows: total thoughts, count by type (ideas, observations, references, tasks, person notes), top 3 topics, top 3 people
- Stats are loaded from `GET /api/open-brain/stats`
- Stats auto-refresh after any capture event
- Each stat pill is clickable: clicking "12 ideas" switches to the Ideas category; clicking a topic name filters by that topic; clicking a person name switches to People filtered to that person
- If Open Brain is offline, stats bar shows a single "Offline" pill with a retry button

### US-6: Search & Filter Toolbar
**As a** user, **I want** a search bar and filter controls above the cards **so that** I can manually refine what I see.

**Acceptance Criteria:**
- Persistent search input with semantic search (calls `/api/open-brain/search`)
- Type filter dropdown (All, Idea, Observation, Reference, Task, Person Note)
- Time filter dropdown (All time, Today, 7 days, 30 days, 90 days)
- Active filters are shown as dismissible chips below the toolbar
- Search and filters work in combination (search within a type, search within a time range)
- Toolbar state syncs with chat-driven filters (if chat sets a filter, toolbar reflects it)

### US-7: Templates as Contextual Help
**As a** user, **I want** capture templates accessible from the capture input **so that** I can use them without navigating to a separate tab.

**Acceptance Criteria:**
- Templates are no longer a separate tab
- A "Templates" button/icon next to the chat input opens a dropdown/popover with the five existing templates
- Clicking a template inserts its starter text into the chat input in capture mode
- Templates popover includes the pattern, example, and "Use" button from the current implementation
- Templates are also accessible from a help section within the chat panel

---

## 4. Page Layout Specification

### 4.1 Top-Level Structure

```
+------------------------------------------------------------------+
| SIDEBAR | MAIN CONTENT AREA                    | CHAT PANEL       |
| (nav)   |                                      | (persistent)     |
|         | +----------------------------------+ | +-------------+  |
|         | | STATS BAR (clickable pills)      | | | Chat Header |  |
|         | +----------------------------------+ | +-------------+  |
|         | | CATEGORY TABS  | SEARCH TOOLBAR  | | | Messages    |  |
|         | +----------------------------------+ | |             |  |
|         | |                                  | | |             |  |
|         | |     CARD GRID / LIST             | | |             |  |
|         | |     (scrollable)                 | | |             |  |
|         | |                                  | | +-------------+  |
|         | |                                  | | | Templates ? |  |
|         | |                                  | | +-------------+  |
|         | +----------------------------------+ | | Input + Send |  |
|         |                                      | +-------------+  |
+------------------------------------------------------------------+
```

### 4.2 Responsive Breakpoints

| Viewport | Layout |
|----------|--------|
| >= 1280px | Three-column: sidebar + main + chat panel (380px) |
| 1024-1279px | Three-column: sidebar + main + chat panel (320px) |
| < 1024px | Two-column: sidebar + main; chat is a slide-over drawer triggered by a FAB |

### 4.3 HTML Container Hierarchy

```
div.app-container
  aside.sidebar
  main.main-content
    div.ob-layout                          (flex row)
      div.ob-main-area                     (flex: 1, flex column)
        div.ob-header                      (stats bar)
        div.ob-category-bar                (category tabs + search toolbar)
        div.ob-card-viewport               (scrollable card area)
          div.ob-card-grid                  (CSS grid or flex-wrap)
      div.ob-chat-panel                    (fixed width, flex column)
        div.ob-chat-header
        div.ob-chat-messages               (scrollable)
        div.ob-chat-templates-trigger
        div.ob-chat-input-row
```

---

## 5. Component Breakdown

### C1: StatsBar
- **Data source:** `GET /api/open-brain/stats`
- **Renders:** Pill badges for total, per-type counts, top topics, top people
- **Events emitted:** `stat-click` with payload `{ filterType, filterValue }` (consumed by CardViewport to apply filter)
- **Refresh trigger:** After any capture event (local or via chat)

### C2: CategoryBar
- **Buttons:** All | Ideas | Content | People | Projects
- **State:** `activeCategory` (string)
- **Behavior:** Clicking a category updates `activeCategory` in state, triggers data reload with appropriate filters
- **Badge counts:** Derived from stats data, not separate API calls

### C3: SearchToolbar
- **Elements:** Text input, type dropdown, time dropdown
- **State:** `{ query, typeFilter, daysFilter }`
- **Behavior:** On search/filter change, calls appropriate API (`/search` if query present, `/thoughts` with filters otherwise)
- **Sync:** Bidirectional with chat-driven filters

### C4: CardViewport
- **Layout:** CSS grid, responsive columns (`repeat(auto-fill, minmax(320px, 1fr))`)
- **People category exception:** Grouped layout -- person name as section header, their thoughts nested below
- **Loading state:** Skeleton cards (3-6 placeholders)
- **Empty state:** Category-specific message with suggested action
- **Pagination:** "Load more" button (increment limit by 20), not infinite scroll (avoids performance issues with large datasets)

### C5: ThoughtCard
- **Props:** thought object (content, type, topics, people, captured_at, _score)
- **Rendering:** Type badge, truncated content (3 lines, expand on click), topic tags, people tags, relative timestamp, similarity score
- **Actions menu:** Copy, Related, Open in Chat
- **Color scheme:** Varies by parent category context

### C6: ChatPanel
- **Layout:** Fixed-width column, flex-direction column
- **Header:** "Open Brain Chat" title, collapse toggle button
- **Messages area:** Scrollable, auto-scroll on new message
- **Mode toggle:** Search | Capture (existing pattern)
- **Templates trigger:** Button that opens a popover with the 5 templates
- **Input row:** Auto-resizing textarea + send button
- **Collapsed state:** 48px wide strip with rotate-90 "Chat" label and brain icon

### C7: FilterChipBar
- **Renders between CategoryBar and CardViewport when filters are active**
- **Shows:** Active query, type filter, time filter, chat-driven filter
- **Each chip is dismissible** (X button clears that filter)
- **"Clear all" link** when multiple filters active

---

## 6. Data Flow Diagram

```
                  +------------------+
                  |  /api/open-brain |
                  |     /stats       |-----> C1: StatsBar (pills)
                  +------------------+       |
                                             | stat-click
                                             v
+------------------+    +--------+    +-------------+
| /api/open-brain  |<---| State  |<---| C2: Category|
|   /thoughts      |    | Manager|    |    Bar      |
|   ?type=&days=   |    |        |    +-------------+
+------------------+    |        |
        |               |        |<---  C3: SearchToolbar
        v               |        |       (query, type, days)
  C4: CardViewport      |        |
    (renders cards)     |        |
                        |        |
+------------------+    |        |    +-------------+
| /api/open-brain  |<---|        |<---| C6: ChatPanel|
|   /search?q=     |    |        |    | (intent     |
+------------------+    +--------+    |  detection) |
                                      +-------------+
                                           |
                                           | capture mode
                                           v
                                    +------------------+
                                    | /api/open-brain  |
                                    |   /capture       |
                                    +------------------+
                                           |
                                    triggers stats refresh
                                    + card list refresh

                                    +------------------+
                                    | /api/chat/stream |<--- ChatPanel (conversational)
                                    +------------------+
                                           |
                                    SSE streaming response
                                    rendered in chat messages
```

### API-to-Component Mapping

| API Endpoint | Component(s) | Trigger |
|---|---|---|
| `GET /api/open-brain/stats` | StatsBar | Page load, after capture |
| `GET /api/open-brain/thoughts?type=&days=&limit=` | CardViewport | Category switch, filter change, page load |
| `GET /api/open-brain/search?q=&limit=` | CardViewport, ChatPanel | Search input, chat search query |
| `POST /api/open-brain/capture` | ChatPanel (capture mode) | Chat capture command |
| `GET /api/open-brain/status` | StatsBar (offline detection) | Page load |
| `POST /api/chat/stream` (SSE) | ChatPanel (messages) | User sends message in chat |

---

## 7. Chat-to-Display Interaction Model

### 7.1 Dual-Path Processing

When the user sends a message in the chat panel, two things happen simultaneously:

**Path A -- Intent Detection (synchronous, client-side):**
A lightweight keyword matcher runs against the user's input to detect display commands. This happens instantly, before any API call.

**Path B -- LLM Chat (asynchronous, SSE):**
The message is sent to `/api/chat/stream` which already has Open Brain context injection via the Higgins integration. The streamed response appears in the chat messages area.

These paths are independent. Path A updates the display immediately. Path B provides the conversational response. They do not block each other.

### 7.2 Intent Detection Rules

The intent detector is a prioritized list of regex/keyword patterns evaluated client-side:

| Pattern | Action | Example Input |
|---|---|---|
| `^(show\|display\|filter).*ideas?\b` | Set category=Ideas | "show me ideas" |
| `^(show\|display\|filter).*content\b` | Set category=Content | "show content from last month" |
| `^(show\|display\|filter).*people\b` | Set category=People | "show people" |
| `^(show\|display\|filter).*projects?\b` | Set category=Projects | "filter projects" |
| `\b(about\|regarding\|from)\s+([A-Z][a-z]+)` | Set category=People, filter person=$2 | "what about Rachel?" |
| `\blast\s+(week\|7\s*days)\b` | Set daysFilter=7 | "ideas from last week" |
| `\blast\s+(month\|30\s*days)\b` | Set daysFilter=30 | "show last month" |
| `\btoday\b` | Set daysFilter=1 | "what did I capture today?" |
| `^(show\s+)?every|^(clear\|reset)\s*(filter\|all)` | Reset all filters, category=All | "show everything" |
| `^(save\|capture\|remember\|note)[:\s]` | Capture mode: call `/api/open-brain/capture` | "save: Meeting with Dan..." |
| `^(find\|search)\s+(.+)` | Set search query=$2 | "find pricing discussions" |

**Fallback:** If no pattern matches, no display action is taken. The message is only sent to the LLM chat.

### 7.3 Filter Application Flow

```
User types in chat
     |
     v
Intent detector matches?
     |
    YES ──> Update State (category, filters)
     |       |
     |       v
     |   CardViewport re-renders with new filters
     |       |
     |       v
     |   FilterChipBar shows "Chat: [original query]" chip
     |
    NO ──> No display change
     |
     v  (both paths)
Send to /api/chat/stream
     |
     v
Stream response into chat messages
```

### 7.4 Capture-to-Display Flow

```
User sends capture message
     |
     v
POST /api/open-brain/capture
     |
     v
On success:
  1. Show confirmation in chat
  2. Refresh stats (GET /stats)
  3. If a category view is active and the new thought
     matches that category, prepend it to the card list
     (optimistic: insert a card with the raw content immediately,
     then replace with full data after the refresh API returns)
```

---

## 8. State Management Approach

### 8.1 Single State Object

All UI state lives in a single `OBState` object, never in DOM attributes:

```
OBState = {
  // Data
  stats: { total, types: {}, topTopics: [], topPeople: [] },
  thoughts: [],           // Currently displayed thoughts
  chatMessages: [],       // Chat history (session only)

  // View state
  activeCategory: 'all',  // 'all' | 'ideas' | 'content' | 'people' | 'projects'
  filters: {
    query: '',            // Semantic search query
    type: '',             // Type filter from dropdown
    days: '',             // Time filter from dropdown
    person: '',           // Person filter (from People category or chat)
    topic: ''             // Topic filter (from stats click or chat)
  },
  chatFilter: null,       // { label, originalQuery } -- set by chat intent detection

  // UI state
  chatPanelOpen: true,    // Chat panel expanded
  chatMode: 'search',     // 'search' | 'capture'
  loading: false,         // CardViewport loading
  page: 1,               // Pagination offset
  pageSize: 20
}
```

### 8.2 State Update Pattern

All state changes go through a central `updateState(patch)` function:

1. Merge patch into `OBState`
2. Determine which components are affected
3. Re-render only affected components
4. If `filters` or `activeCategory` changed, trigger data fetch

This is a lightweight observer pattern without a library. Components register render functions:

```
const renders = {
  statsBar: () => renderStatsBar(OBState.stats),
  categoryBar: () => renderCategoryBar(OBState.activeCategory),
  filterChips: () => renderFilterChips(OBState.filters, OBState.chatFilter),
  cardViewport: () => fetchAndRenderCards(OBState),
  chatPanel: () => renderChatMessages(OBState.chatMessages)
};
```

### 8.3 Category-to-API Filter Mapping

| Category | API Call | Parameters |
|---|---|---|
| All | `GET /thoughts` | `limit=20` + any active filters |
| Ideas | `GET /thoughts` | `type=idea` + `limit=20` + time/topic filters |
| Content | `GET /thoughts` (x2) | `type=observation` + `type=reference`, merge results, sort by date |
| People | `GET /thoughts` | `person=[name]` if filtered, else fetch all then group client-side by `people[]` |
| Projects | `GET /thoughts` | `type=task` + `limit=20` + time/topic filters |

**Content category note:** Requires two API calls (`type=observation` and `type=reference`) because the API only supports a single `type` filter. Results are merged and sorted client-side by `captured_at` descending. Consider a future API enhancement to support `type=observation,reference` (comma-separated) but do NOT build this now.

**People category note:** When no person is selected, the initial load fetches `GET /thoughts?limit=50` without a type filter, then groups client-side by the `people[]` array. Each person becomes a collapsible section header. Thoughts mentioning multiple people appear under each person.

---

## 9. Failure Scenarios

### F1: Open Brain MCP Offline
- **Detection:** `GET /api/open-brain/status` returns `configured: false` or 502
- **User experience:** Stats bar shows "Open Brain Offline" pill with a retry button. Card viewport shows a full-page empty state: "Open Brain is not reachable. Check your MCP configuration." Chat panel shows a system message: "Open Brain is offline. Chat will work but cannot search or capture thoughts."
- **Chat behavior:** Chat still sends to `/api/chat/stream` (Higgins works without Open Brain). Capture and search commands show an error in chat.
- **Recovery:** Retry button calls `/status` again. On success, full page re-initializes.

### F2: API Timeout / Slow Response
- **Detection:** `fetch()` with `AbortController` and 15-second timeout
- **User experience:** Loading skeleton stays visible. After timeout, show "Request timed out" with a retry button in the card viewport. Chat shows "Request timed out. Try again."
- **Retry:** Single automatic retry on timeout (for thoughts/search calls). No retry for capture (risk of duplicate).

### F3: MCP Returns Unparseable Text
- **Current problem:** The existing code parses raw text (`parseTextResponse`) with regex. MCP responses are text blobs, not structured JSON.
- **Mitigation:** Keep `parseTextResponse` as the primary parser. Add a fallback: if regex parsing returns 0 cards but raw text is non-empty, render the raw text in a single "raw response" card with a warning badge. Log a console warning for debugging.
- **Future:** If Open Brain MCP adds structured JSON responses, add a parallel parser path. The component layer should accept both parsed card objects and raw text.

### F4: Large Dataset (500+ Thoughts)
- **Concern:** The People category groups client-side, so fetching all thoughts is O(n).
- **Mitigation:** Limit initial fetch to 50 thoughts. Show "Load more" at the bottom of each person section. For People category with no filter, show only the top 10 people (by thought count from stats) and a "Show all people" link.
- **Concern:** Multiple API calls for Content category.
- **Mitigation:** Run the two calls in `Promise.all`. Merge and sort only the returned subsets (max 20+20=40 cards).

### F5: Chat Panel Collapsed During Chat-Driven Filter
- **Scenario:** User collapses chat, then somehow a filter chip shows "Chat: show me ideas".
- **Mitigation:** Chat-driven filters are only applied when the user sends a message. Collapsing chat does not clear the filter. The filter chip in the main area clearly shows the source. Clicking the chip clears it regardless of chat panel state.

### F6: Concurrent State Updates
- **Scenario:** User rapidly clicks Ideas, then Content, then Projects. Three API calls fire.
- **Mitigation:** Each fetch call gets a monotonically increasing `requestId`. On response, check if `requestId` matches the latest. If stale, discard the response. This prevents older, slower responses from overwriting newer results.

### F7: SSE Stream Failure (Chat)
- **Detection:** `EventSource` or `fetch` with ReadableStream errors
- **User experience:** Show "Connection lost. Retrying..." in chat. Auto-retry once after 2 seconds. On second failure, show "Could not connect. Click to retry."
- **Mitigation:** Use the same SSE streaming pattern from `public/js/chat.js` (the existing Higgins chat implementation).

---

## 10. Downstream Impact Analysis

### 10.1 Affected Files

| File | Change Type | Description |
|---|---|---|
| `public/open-brain.html` | **Major rewrite** | New layout, chat panel, category views, state management |
| `public/js/help-registry.js` | **Minor edit** | Update help entry for open-brain page if guide changes |
| `documentation/guides/open-brain-user-guide.md` | **Rewrite** | Update to reflect new layout, categories, chat panel |

### 10.2 Files NOT Affected

| File | Reason |
|---|---|
| `server/routes/openBrain.js` | No API changes |
| `server/services/openBrainService.js` | No service changes |
| `server/routes/chat.js` | Already has Open Brain context injection; no changes needed |
| `server/index.js` | No new routes |
| `public/js/navigation.js` | No nav changes (page URL stays the same) |
| `public/css/styles.css` | All styles scoped to `open-brain.html` inline styles (current pattern) |

### 10.3 Integration Points Preserved

- **Navigation:** Page remains at `/open-brain.html`, same nav entry, same module ID
- **Auth:** Must switch from raw `fetch()` to `authFetch()` (current page does NOT use authFetch -- this is a bug fix bundled with the redesign)
- **Higgins chat context:** `/api/chat/stream` already injects Open Brain search results into the system prompt when Open Brain is configured. The embedded chat panel uses this existing integration. No changes to chat.js or chat routes.
- **Help system:** Help button must be added to the page header (currently missing)

### 10.4 New Dependencies

- **`/js/auth-fetch.js`** -- must be added (currently missing from open-brain.html)
- **`/js/help-modal.js`** + `/js/help-registry.js` + `/css/help-modal.css` -- must be added (currently missing)
- **SSE streaming logic** -- Reference `public/js/chat.js` for the existing EventSource/ReadableStream pattern. Do not duplicate; extract the SSE handling into a reusable utility if not already available, or inline the pattern.

### 10.5 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| MCP text parsing breaks with new Open Brain version | Medium | High | Fallback raw-text renderer (F3) |
| Content category double-fetch is slow | Low | Medium | Promise.all, max 40 cards |
| Chat intent detection misclassifies input | Medium | Low | Intent only modifies display, never data. User can clear with chip. False negatives are fine (message just goes to LLM). |
| People grouping is slow with large datasets | Low | Medium | Limit to 50 thoughts, top 10 people (F4) |
| Chat panel makes main content too narrow on smaller screens | Medium | Medium | Responsive breakpoints collapse to drawer below 1024px |

---

## 11. Implementation Sequencing

Recommended build order for incremental delivery:

### Phase A: Layout Shell (estimate: 1 session)
1. Replace three-tab layout with the new two-column layout (main area + chat panel)
2. Implement chat panel collapse/expand toggle
3. Port existing stats bar rendering (no behavior changes yet)
4. Add `authFetch()`, help button, and missing infrastructure imports

### Phase B: Category Views (estimate: 1 session)
1. Build CategoryBar with All/Ideas/Content/People/Projects
2. Implement category-to-API filter mapping
3. Build CardViewport with category-aware rendering
4. Implement People grouping logic
5. Build FilterChipBar

### Phase C: Enhanced Cards (estimate: 1 session)
1. Redesign ThoughtCard with category-aware color schemes
2. Add card action menu (Copy, Related, Open in Chat)
3. Add card expand/collapse for long content
4. Add skeleton loading states

### Phase D: Embedded Chat (estimate: 1 session)
1. Convert modal chat to persistent panel
2. Integrate with `/api/chat/stream` SSE (replacing direct API calls)
3. Port existing capture mode logic
4. Add templates popover to chat input

### Phase E: Chat-to-Display Reactivity (estimate: 1 session)
1. Implement intent detection engine
2. Wire intent results to state manager
3. Add "Chat:" filter chips
4. Test all intent patterns

### Phase F: Polish & Docs (estimate: 0.5 session)
1. Responsive breakpoints and drawer behavior
2. Animations (card fade-in, panel slide)
3. Update user guide documentation
4. Keyboard shortcuts (Ctrl+/ for chat toggle)

---

## 12. Open Questions

1. **Stats parsing:** The current stats API returns MCP text blobs parsed with regex. Should we add a structured JSON wrapper in the route (parse server-side, return clean JSON) or keep the fragile client-side parsing? **Recommendation:** Add server-side parsing in `openBrain.js` route as a follow-up enhancement, but do not block the redesign on this.

2. **Projects category definition:** "Thoughts tagged with project-related topics" is ambiguous. The current data model has no `project` type or explicit project tags. **Recommendation:** For v1, Projects = `type=task`. If users want project grouping, a future enhancement could add a `project` tag type to Open Brain MCP.

3. **Chat LLM model:** The embedded chat will use `/api/chat/stream` which routes through the default Higgins model (Claude). Should we allow model selection in the Open Brain chat panel? **Recommendation:** No. Use the default model. Model selection adds complexity with no clear value for this use case.

4. **Persistent chat history:** Should chat messages persist across page reloads (localStorage)? **Recommendation:** No for v1. Session-only. Open Brain chat is ephemeral exploration, not a conversation archive.

---

*End of PRD. This document should be reviewed and approved before implementation begins.*
