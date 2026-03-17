# Open Brain Visual Dashboard Redesign -- Test Plan

**QA Analyst:** Morgan
**Date:** 2026-03-16
**Feature:** Two-panel layout redesign of `public/open-brain.html`
**Status:** Pre-implementation

---

## 1. Scope

This test plan covers the frontend redesign of the Open Brain page from a tab-based layout (Capture / Browse / Templates) with a floating chat FAB into a two-panel layout:

- **Left panel (72%):** Visual dashboard with category pills, filter strip, and card grid
- **Right panel (28%):** Persistent embedded chat panel using `/api/chat/stream` (SSE)

Backend APIs are unchanged. The redesign introduces:
- Client-side category mapping (Ideas, Content, People, Projects)
- Chat-to-display integration (natural language triggers dashboard filters)
- Capture-via-chat flow ("capture: ..." creates a thought and refreshes the grid)
- Card detail slide-over
- Quick action chips
- Responsive breakpoints at 1200px and 900px

### Out of Scope
- Backend API changes
- Open Brain MCP server internals
- Database schema changes
- Auth middleware implementation (tracked separately; tested here only as access gating)

---

## 2. Test Environment Prerequisites

| Requirement | Detail |
|---|---|
| Open Brain MCP running | `OPEN_BRAIN_MCP_URL` and `OPEN_BRAIN_MCP_KEY` set in `.env` |
| Seeded thoughts | At least 5 thoughts per type (observation, task, idea, reference, person_note) |
| Platform admin user | User with `platform_admins` record (the module has `platform_admin_only = TRUE`) |
| Non-admin user | User WITHOUT platform admin status, for access denial tests |
| Browsers | Chrome 120+, Firefox 120+, Safari 17+ |
| Viewports | 1440px (desktop), 1024px (tablet), 768px (mobile) |

---

## 3. Functional Test Cases

### 3.1 Page Load and Layout

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| PL-01 | Two-panel layout renders | Load `/open-brain.html` at 1440px viewport | Left panel occupies ~72% width; right panel occupies ~28% width; no horizontal scroll |
| PL-02 | Stats bar populates from `/api/open-brain/stats` | Load page | Stats pills show thought counts parsed from MCP response text (total, per-type breakdown) |
| PL-03 | Category pills render | Load page | Four pills visible: Ideas, Content, People, Projects; none selected by default (all thoughts shown) |
| PL-04 | Default card grid loads | Load page | Grid populated via `GET /api/open-brain/thoughts?limit=20`; cards display content, type badge, date, topics, people |
| PL-05 | Chat panel renders on load | Load page | Right panel shows chat header, hint text, message area, and input row; no FAB button present |
| PL-06 | Lucide icons render | Load page | All icons render as SVGs (brain, search, send, etc.); no missing icon placeholders |
| PL-07 | Theme respects localStorage | Set `insight360-theme` to `light`, reload | Page renders in light theme; toggle to dark and verify |

### 3.2 Category Switching

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| CS-01 | Single category select -- Ideas | Click "Ideas" pill | Pill becomes active; grid filters to thoughts where `type=idea` only; other pills deselected |
| CS-02 | Single category select -- Content | Click "Content" pill | Grid shows thoughts where `type IN (observation, reference)` |
| CS-03 | Single category select -- People | Click "People" pill | Grid shows thoughts where `type=person_note` |
| CS-04 | Single category select -- Projects | Click "Projects" pill | Grid shows thoughts where `type=task` |
| CS-05 | Multi-select with Shift+click | Click "Ideas", then Shift+click "People" | Both pills active; grid shows `type IN (idea, person_note)` |
| CS-06 | Deselect returns to all | Click active pill to deselect | No pills active; grid shows all thought types |
| CS-07 | Shift+click all four | Shift+click each pill sequentially | All active; equivalent to no filter (all types shown) |
| CS-08 | Category + filter strip interaction | Select "Ideas" then set time filter to "Last 7 days" | Grid shows ideas from last 7 days only; both filters applied as AND condition |
| CS-09 | Category switch preserves filter strip | Select "Ideas" with "Last 7 days" active, switch to "People" | Time filter remains "Last 7 days"; grid updates to person_notes from last 7 days |

### 3.3 Filter Strip

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| FS-01 | Time filter dropdown | Select "Last 7 days" | Grid reloads with `days=7` parameter; cards outside range disappear |
| FS-02 | Tag filter dropdown | Select a tag from dropdown (populated from stats) | Grid reloads with `topic=X` parameter |
| FS-03 | Sort dropdown | Toggle between "Newest first" and "Oldest first" | Card order reverses |
| FS-04 | Filter reset | Click a "clear filters" action (if present) or deselect all | Grid returns to unfiltered default state |
| FS-05 | Combined filters | Set category=Ideas + time=30 days + tag=X | API call includes `type=idea&days=30&topic=X`; only matching thoughts shown |
| FS-06 | Empty result from filters | Set impossible filter combination | Empty state displays with appropriate message and icon; no JS errors |

### 3.4 Card Grid and Detail Slide-over

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| CG-01 | Card displays all metadata | Inspect a card with full metadata | Shows: content preview (truncated), type badge with correct color, date, topic tags, people tags |
| CG-02 | Type badge colors | View cards of each type | idea=amber/warning, observation=default, reference=green/success, person_note=purple/secondary, task=blue/primary |
| CG-03 | Card click opens slide-over | Click any thought card | Slide-over panel animates in from right; shows full content, all metadata, captured date |
| CG-04 | Slide-over close via X | Click close button on slide-over | Panel animates out; grid remains in previous state |
| CG-05 | Slide-over close via Escape | Press Escape while slide-over is open | Panel closes |
| CG-06 | Slide-over close via backdrop click | Click outside slide-over | Panel closes |
| CG-07 | Grid card count | Load page with 25+ thoughts | Grid shows up to the configured limit (e.g., 20); verify pagination or "load more" behavior if designed |
| CG-08 | Card content with special characters | Thought contains `<script>`, `&amp;`, quotes | Content is HTML-escaped; no XSS injection |

### 3.5 Chat Panel (Persistent, Right Side)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| CP-01 | Chat panel visible on load | Load page | Chat panel is visible in the right 28% without needing to click a FAB |
| CP-02 | Chat input accepts text | Type in chat input | Text appears; input auto-resizes up to max height |
| CP-03 | Send via Enter | Type message, press Enter | Message sends; input clears; user bubble appears |
| CP-04 | Shift+Enter creates newline | Press Shift+Enter in input | Newline inserted; message does not send |
| CP-05 | Send button disabled during request | Send a message | Button disables while streaming; re-enables when response completes |
| CP-06 | System welcome message | Load page | System message appears: instructional hint about search and capture |

### 3.6 Chat-to-Display Integration

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| CD-01 | Natural language filter -- type | Type "show me ideas from last week" | Chat responds with results AND dashboard left panel filters update (Ideas pill active, time=7 days) |
| CD-02 | Natural language filter -- person | Type "what do I know about Rachel?" | Dashboard filters to People category; search results displayed in grid |
| CD-03 | Natural language filter -- topic | Type "show me thoughts about onboarding" | Grid filters by topic; chat shows summary |
| CD-04 | Filter update reflects in pills | After CD-01 | Ideas pill is visually active; time filter dropdown shows "Last 7 days" |
| CD-05 | Search-only (no filter intent) | Type "What did I decide about the launch?" | Chat shows search results; dashboard does NOT change filters (pure search, not a filter command) |
| CD-06 | Ambiguous input | Type "ideas" | System interprets reasonably (search for "ideas" or filter to Ideas category); no error |

### 3.7 Capture via Chat

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| CC-01 | Capture with prefix | Type "capture: Met with design team about rebrand" | Thought saved; confirmation message in chat; new card appears in grid; stats update |
| CC-02 | Capture with "save:" prefix | Type "save: quarterly review notes" | Same behavior as CC-01 |
| CC-03 | Capture with "remember:" prefix | Type "remember: Marcus prefers async communication" | Same behavior as CC-01 |
| CC-04 | Capture with "note:" prefix | Type "note: budget approved for Q3 hire" | Same behavior as CC-01 |
| CC-05 | Grid refresh after capture | Complete CC-01 | New thought appears at top of grid (if sorted by newest); stats pill count increments |
| CC-06 | Capture failure | Disconnect MCP, then attempt capture | Chat shows error message; grid does not change; no JS crash |
| CC-07 | Empty capture | Type "capture:" (no content after prefix) | Appropriate error message in chat; no API call with empty content |

### 3.8 Quick Action Chips

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| QA-01 | Chip triggers filter | Click "Recent ideas" chip | Equivalent to setting category=Ideas + time=recent; grid and pills update |
| QA-02 | Chip triggers search | Click "People mentioned this week" chip | Triggers search/filter for person_note type in last 7 days |
| QA-03 | Chip interaction with existing filters | Have "Projects" category active, click a chip | Chip overrides or combines with existing filters (verify intended behavior) |
| QA-04 | All chips functional | Click each available chip | Each triggers the correct API call and grid update; no stub chips |

### 3.9 SSE Streaming (Chat)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| SS-01 | Streaming response renders progressively | Send a search query via chat | Text appears token-by-token in assistant bubble; no flash of complete text |
| SS-02 | Stream completes cleanly | Wait for stream to finish | Final message is complete; send button re-enables; no orphan "Searching..." text |
| SS-03 | Stream error mid-response | Simulate network drop during stream | Partial response shown with error indicator; send button re-enables |
| SS-04 | Multiple rapid messages | Send 3 messages quickly | Each queued and processed in order; no interleaved responses |
| SS-05 | SSE compression skip | Verify compression middleware config | `/api/chat/stream` responses bypass compression (existing pattern in `server/index.js`) |

---

## 4. Access Control Tests

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| AC-01 | Platform admin can access | Log in as platform admin, navigate to `/open-brain.html` | Page loads; all APIs return data |
| AC-02 | Non-admin denied (after auth fix) | Log in as non-platform-admin user, navigate to `/open-brain.html` | Redirect to unauthorized page or module-gated error; API returns 403 |
| AC-03 | Unauthenticated user denied (after auth fix) | Access `/api/open-brain/thoughts` without auth cookie | Returns 401 |
| AC-04 | Module gating on all routes | Call each Open Brain API endpoint without module access | All return 403 with `requireModule('open_brain')` |
| AC-05 | Navigation sidebar respects module access | Log in as non-admin | Open Brain does not appear in sidebar navigation |

**Note:** AC-02 through AC-05 depend on the auth middleware fix being deployed. Until then, document these as known-failing and track against the auth fix ticket.

---

## 5. Data Integrity Tests

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| DI-01 | Stats API response parsed correctly | Compare `/api/open-brain/stats` raw response with rendered pills | Total count, type breakdown, and top topics match between API response and UI |
| DI-02 | Thought list response mapped to cards | Compare `/api/open-brain/thoughts` raw text with rendered cards | Each thought block maps to one card; content, type, date, topics, people all correct |
| DI-03 | Search results scored correctly | Compare `/api/open-brain/search` match percentages with card badges | Score percentages match; cards ordered by score descending |
| DI-04 | Category mapping is correct | Filter by each category, verify types | Ideas=`idea` only; Content=`observation`+`reference`; People=`person_note`; Projects=`task` |
| DI-05 | Capture round-trip | Capture a thought, then search for it | Thought appears in search results with correct content; metadata (type, topics, people) extracted by MCP |
| DI-06 | Special characters preserved | Capture thought with Unicode, quotes, angle brackets | Stored and retrieved correctly; HTML-escaped in display |
| DI-07 | Empty fields handled | Thought with no topics or people extracted | Card renders without topic/people sections; no "undefined" or "null" text |
| DI-08 | Date parsing | Thoughts with various date formats from MCP | All dates render consistently (e.g., "Mar 16, 2026") |
| DI-09 | Long content truncation | Thought with 2000+ characters | Card shows truncated preview; slide-over shows full content |

---

## 6. Responsive and Layout Tests

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| RL-01 | Desktop (>1200px) | Set viewport to 1440px | Two-panel layout: left 72%, right 28%; card grid shows 3-4 columns |
| RL-02 | Tablet (900-1200px) | Set viewport to 1024px | Panels may stack or chat collapses to overlay; card grid shows 2-3 columns |
| RL-03 | Mobile (<900px) | Set viewport to 768px | Single-column layout; chat becomes overlay/drawer or bottom sheet; cards stack vertically |
| RL-04 | Panel resize does not overflow | Resize browser between breakpoints | No horizontal scrollbar; content reflows cleanly |
| RL-05 | Chat panel usable at small width | At 28% of 1440px (~403px) | Input is not cramped; messages readable; send button accessible |
| RL-06 | Category pills wrap | At narrow widths | Pills wrap to second line rather than overflowing |
| RL-07 | Sidebar + panels | Sidebar open at 1440px | Sidebar + left panel + right panel all fit; no overlap |
| RL-08 | Sidebar collapsed on mobile | At 768px | Sidebar is hamburger menu; full width available for content |

---

## 7. Performance Criteria

| Metric | Target | How to Measure |
|---|---|---|
| Page load (DOMContentLoaded) | < 1.5s | Chrome DevTools Performance tab |
| Initial API calls complete (stats + thoughts) | < 2s total | Network tab; both calls fire in parallel |
| Category filter switch (client-side) | < 100ms | No visible flicker; cards re-render instantly |
| Category filter switch (API call) | < 500ms | If implementation fetches per filter, measure network round-trip |
| Chat SSE first token | < 800ms | Time from send to first streamed token rendered |
| Chat SSE total response | < 5s for typical query | End-to-end streaming time |
| Capture round-trip | < 2s | Time from click "Save" to confirmation + grid refresh |
| Slide-over animation | 60fps, < 300ms | No jank; use Chrome Performance monitor |
| Memory after 50 chat messages | < 100MB heap | Chrome DevTools Memory tab |
| Lighthouse Performance score | > 85 | Lighthouse audit on desktop |

---

## 8. Destructive and Edge Case Tests

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| DT-01 | MCP unreachable | Stop Open Brain MCP server; load page | Stats show "Offline" pill; grid shows empty state with "Open Brain unavailable" message; chat capture returns error; no unhandled promise rejections |
| DT-02 | MCP returns malformed response | MCP returns non-JSON or truncated SSE | `parseTextResponse` returns null; empty state shown; error logged to console; no crash |
| DT-03 | MCP returns empty stats | MCP returns stats with all zeros | Stats pills show "0 thoughts"; no NaN or broken layout |
| DT-04 | API returns 502 | MCP times out | User sees "Service temporarily unavailable"; retry possible |
| DT-05 | Network disconnect mid-stream | Disable network during SSE stream | Partial response shown; error message appended; send button re-enables |
| DT-06 | Rapid category toggling | Click category pills 10 times quickly | No race conditions; final state matches last click; no duplicate API calls stacking |
| DT-07 | Concurrent capture and search | Capture a thought while search is in progress | Both complete independently; grid updates correctly after both resolve |
| DT-08 | XSS via thought content | Capture thought containing `<img onerror=alert(1)>` | Content HTML-escaped via `escHtml()`; no script execution |
| DT-09 | XSS via search query | Type `<script>alert(1)</script>` in search | Input sanitized; no injection |
| DT-10 | Very long thought content | Capture 10,000-character thought | Card truncates; slide-over scrolls; no layout breakage |
| DT-11 | No thoughts in system | Empty Open Brain database | All categories show empty states; stats show "0 thoughts"; capture flow still works |
| DT-12 | 500+ thoughts | Database with 500 thoughts | Pagination or virtual scrolling handles volume; no browser freeze |
| DT-13 | Chat input paste of large text | Paste 5000 characters into chat input | Input truncates or scrolls gracefully; send works |
| DT-14 | Browser back/forward | Navigate away then press Back | Page restores with correct state; no stale data |
| DT-15 | LocalStorage quota exceeded | Fill localStorage to quota, then try theme toggle | Graceful fallback; no crash |

---

## 9. Accessibility Tests

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| A11Y-01 | Keyboard navigation | Tab through all interactive elements | Focus order: category pills, filter dropdowns, card grid, chat input, send button |
| A11Y-02 | Screen reader labels | Audit with VoiceOver/NVDA | Category pills have ARIA labels; cards are announced with content summary; chat messages have role indicators |
| A11Y-03 | Focus trap in slide-over | Open slide-over, Tab | Focus stays within slide-over; Escape closes it |
| A11Y-04 | Color contrast | Run axe-core or Lighthouse accessibility audit | All text meets WCAG AA contrast ratios in both themes |
| A11Y-05 | Reduced motion | Enable `prefers-reduced-motion` | Slide-over and card transitions are instant; no animations |

---

## 10. Acceptance Criteria Verification Checklist

This checklist must be completed before the feature is marked as done.

### Layout and Structure
- [ ] Two-panel layout renders correctly at desktop widths
- [ ] Left panel contains category pills, filter strip, and card grid
- [ ] Right panel contains persistent embedded chat (not a FAB modal)
- [ ] Sidebar navigation works and shows Open Brain for platform admins

### Category System
- [ ] Four category pills: Ideas, Content, People, Projects
- [ ] Single click selects one category (deselects others)
- [ ] Shift+click enables multi-select
- [ ] Category mapping correct: Ideas=idea, Content=observation+reference, People=person_note, Projects=task
- [ ] Deselecting all returns to showing all thoughts

### Filter Strip
- [ ] Time filter (Today, 7d, 30d, 90d, All time) works
- [ ] Tag filter populated from stats data
- [ ] Sort order toggle works
- [ ] Filters combine correctly with category selection

### Card Grid
- [ ] Cards show content preview, type badge, date, topics, people
- [ ] Card click opens detail slide-over
- [ ] Slide-over shows full content and all metadata
- [ ] Slide-over closes via X, Escape, and backdrop click
- [ ] Empty states render per category and for search

### Chat Panel
- [ ] Persistent in right panel (not a floating modal)
- [ ] SSE streaming from `/api/chat/stream` renders progressively
- [ ] Enter sends, Shift+Enter adds newline
- [ ] Send button disables during streaming

### Chat-to-Display Integration
- [ ] Natural language query updates dashboard filters
- [ ] Category pills reflect chat-initiated filter changes
- [ ] Filter strip dropdowns reflect chat-initiated filter changes

### Capture via Chat
- [ ] "capture:", "save:", "remember:", "note:" prefixes all work
- [ ] New thought appears in grid after capture
- [ ] Stats pills update after capture
- [ ] Error handling for failed captures

### Quick Action Chips
- [ ] All chips trigger correct filters/searches
- [ ] No stub or non-functional chips

### Responsive
- [ ] Desktop (>1200px): two-panel layout
- [ ] Tablet (900-1200px): graceful adaptation
- [ ] Mobile (<900px): single-column with chat as overlay/drawer

### Infrastructure Integration
- [ ] Uses `authFetch()` for all API calls (not raw `fetch`)
- [ ] Navigation sidebar via `navigation.js`
- [ ] ModalService for any dialogs
- [ ] Help button in header with registered guide
- [ ] User guide created and whitelisted in `docs.js`

---

## 11. Rollback Verification

| Step | Action | Verification |
|---|---|---|
| 1 | Preserve current `open-brain.html` as backup before deploying redesign | File backed up or restorable via git |
| 2 | Deploy redesign to develop branch | Page loads with new two-panel layout |
| 3 | If critical issues found, revert commit | `git revert <commit>` on develop branch |
| 4 | After revert, verify original page | Tab-based layout (Capture/Browse/Templates) renders; FAB chat works; all existing functionality intact |
| 5 | Verify no data loss | All thoughts captured during redesign period still accessible via API |
| 6 | Verify API routes unchanged | All five endpoints (`/status`, `/capture`, `/search`, `/thoughts`, `/stats`) respond identically pre- and post-rollback |

**Key rollback consideration:** Since this is a frontend-only change with no database migrations, rollback is a simple git revert of the HTML/CSS/JS changes. No data migration rollback is needed.

---

## 12. Test Execution Schedule

| Phase | Tests | Blocker? |
|---|---|---|
| Phase 1: Layout and rendering | PL-*, RL-*, A11Y-* | Yes -- must pass before functional testing |
| Phase 2: Category and filters | CS-*, FS-* | Yes -- core interaction model |
| Phase 3: Card grid and slide-over | CG-* | Yes |
| Phase 4: Chat panel and streaming | CP-*, SS-* | Yes |
| Phase 5: Chat-to-display integration | CD-*, CC-*, QA-* | Yes -- differentiating feature |
| Phase 6: Data integrity | DI-* | Yes |
| Phase 7: Access control | AC-* | Partial -- AC-01 blocks; AC-02-05 depend on auth fix |
| Phase 8: Destructive and edge cases | DT-* | No -- but DT-01, DT-08, DT-09 are high priority |
| Phase 9: Performance | Performance criteria table | No -- but page load > 3s is a blocker |

---

## 13. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| MCP text parsing is fragile (regex-based `parseTextResponse`) | Cards fail to render if MCP response format changes | Add structured JSON parsing fallback; add regression tests against known response formats |
| No auth middleware on routes (known bug) | Any user can access Open Brain data | Track auth fix separately; test AC-02-05 only after fix lands |
| Chat-to-display requires NLP intent parsing | False positives change user's filters unexpectedly | Require explicit intent signals (e.g., "filter to..." or "show me..."); provide undo |
| SSE streaming complexity | Memory leaks with long chat sessions | Test memory after 50+ messages; ensure EventSource connections close properly |
| Category mapping is client-side only | If API adds new thought types, they may not map to any category | "All" view (no category selected) should always show everything; log unmapped types |

---

*End of test plan. Total test cases: 74 across 13 functional areas.*
