# Modal Service Manual Testing Plan

This document provides a comprehensive manual testing checklist for the ModalService implementation across all Insight 360 pages.

## Prerequisites

1. Start the development server: `npm run dev`
2. Open browser DevTools console to monitor for errors
3. Test in both light and dark themes (toggle via theme switcher)

---

## Page-Specific Tests

### 1. Actions Page (`/actions.html`)

#### 1.1 Create Action Modal ✅
- [x] Click "New Action" button
- [x] Verify modal opens centered on screen
- [x] Verify title "Create Action" displays correctly
- [x] Template selection grid (6 templates with category tags)
- [x] Department dropdown ("Assign to Department")
- [x] Close button (X) works
- [x] Press ESC → verify modal closes

#### 1.2 Execute Action Modal ✅
- [x] Click on action template (e.g., "Thought Leadership", "Sales Enablement")
- [x] Verify modal shows action name as title
- [x] Verify EXECUTE badge and description display
- [x] Verify "Your Input" textarea with placeholder
- [x] Maximize button present
- [x] Textarea is resizable
- [x] Close button works

#### 1.3 Edit Action Modal
- N/A - No edit functionality in current UI

#### 1.4 Delete Action Confirmation
- N/A - No delete functionality in current UI

---

### 2. Roles Page (`/roles.html`)

#### 2.1 Edit Title Modal ⚠️ BUGS FOUND
- [x] Modal opens with 3-column layout (Basic Info, Responsibilities, Tags)
- [x] Department dropdown (required) - works
- [x] Level dropdown (required) - works
- [x] Title Name field (required) - works
- [x] Description textarea - works
- [x] Responsibilities list with checkboxes - displays correctly
- [x] Associated Tags list with checkboxes - displays correctly
- **🐛 BUG: Add responsibility button (purple) does not save new responsibilities**
- **🐛 BUG: Modal is missing footer with Save/Cancel buttons - cannot save changes**

#### 2.2 Create Title Modal
- [ ] Test "New Title" button if available
- [ ] Verify same form structure as edit

#### 2.3 Delete Title
- [ ] Test delete functionality if available

---

### 3. Admin Page (`/admin.html`)

#### 3.1 Add User Modal ⚠️ BUG FOUND
- [x] Modal opens with title "Add User"
- [x] Email field - works
- [x] Password field (masked) - works
- [x] Display Name field - works
- [x] System Role dropdown with helper text - works
- [x] Business Role dropdown with helper text - works
- [x] Department dropdown - works
- **🐛 BUG: Modal is missing footer with Save/Cancel buttons - cannot submit new user**

#### 3.2 Edit User Modal ⚠️ BUGS FOUND
- [x] Modal opens with title "Edit User"
- [x] Email field (pre-filled) - works
- [x] Display Name field (pre-filled) - works
- [x] System Role dropdown - works
- [x] Business Role dropdown - works
- [x] Department dropdown - displays
- **🐛 BUG: Department selection is not saving**
- **🐛 BUG: Modal appears to be missing footer with Save/Cancel buttons**

#### 3.3 Delete User Confirmation
- [ ] Test delete functionality if available

#### 3.4 Categories Management
- [ ] Test if available

#### 3.5 Roadmap Modal
- [ ] Test if available

---

### 4. Agents Page (`/agents.html`)

#### 4.1 New Agent Modal ⚠️ BUG FOUND
- [x] Modal opens with title "New Agent"
- [x] Name field with placeholder - works
- [x] Icon picker - works
- [x] Suite dropdown (required) - works
- [x] Category dropdown (required) - shows validation message
- [x] Description textarea - works
- [x] Platform dropdown - works
- [x] Status dropdown - works
- [x] Department dropdown - **works here (unlike Admin page)**
- [x] Native Configuration section
- [x] System Prompt textarea - works
- [x] Introduction Message textarea - works
- **🐛 BUG: Modal is missing footer with Save/Cancel buttons - cannot create agent**

#### 4.2 Edit Agent Modal ⚠️ BUG FOUND
- [x] Modal opens with title "Edit Agent"
- [x] All fields pre-populated correctly
- [x] Model dropdown (Claude Sonnet 4.5) - works
- [x] Temperature field - works
- [x] Conversation Starters textarea - works
- **🐛 BUG: Modal is missing footer with Save/Cancel buttons - cannot save changes**

#### 4.3 Add Context Asset Modal ⚠️ BUG FOUND
- [x] Modal opens with title "Add Context Asset"
- [x] Asset Type dropdown with helper text - works
- [x] Select Context Asset dropdown - works
- [x] Injection Mode dropdown with detailed explanation - works
- [x] Priority field with explanation (0-100 scale) - works
- **🐛 BUG: Modal is missing footer with Save/Cancel buttons - cannot add context asset**

#### 4.4 Agent Chat Modal (AgentModal)
- [ ] Click "Test" or "Run" on an agent
- [ ] Test chat functionality

---

### 5. Context Page (`/context.html`)

#### 5.1 Context Asset Editor ⚠️ BUG FOUND
- [x] Split-panel layout (form on left, Markdown Editor on right)
- [x] Delete, Cancel, Save buttons present at top - **HAS BUTTONS (unlike other pages)**
- [x] Type dropdown (Terminology, etc.) - works
- [x] Department dropdown - works
- [x] Advanced section (collapsible) - works
- [x] Markdown Editor shows rich content with Examples, Key Concepts, Related Modules
- **🐛 BUG: Save fails with error "Failed to save: Cannot coerce the result to..."**

#### 5.2 Generate Modal
- [ ] Test "Generate" functionality if available

#### 5.3 Delete Context Asset
- [ ] Test Delete button → verify confirm dialog

---

### 6. Skills Page (`/skills.html`)

#### 6.1 Skill Detail Modal ✅ (with issues)
- [x] Modal opens when clicking a skill
- [x] Title with icon displays correctly
- [x] Description text renders
- [x] Tags display: EXECUTE, version, ACTIVE status
- [x] Required Context section - works
- [x] Optional Context section with tags (voice_dna, brand_guidelines, icp) - works
- [x] Conversation Starters section - works
- [x] Instructions Preview section - works
- [x] Footer with Export, Edit, Test Skill buttons - **HAS BUTTONS**
- **🐛 BUG: Export button fails with "Error exporting skill"**
- **🐛 BUG: Edit button navigates to skill creator page instead of modal (pre-migration behavior)**

#### 6.2 Import Skill Modal
- [ ] Test "Import" button if available

#### 6.3 Test Skill
- [ ] Test "Test Skill" button functionality

---

## Cross-Cutting Tests

### 7. Draggable Functionality

Test on any modal that supports dragging:

- [ ] Click and drag modal title bar
- [ ] Verify modal moves with cursor
- [ ] Release → modal stays in position
- [ ] Verify modal doesn't move when clicking body content
- [ ] Drag modal partially off-screen → verify boundary constraints
- [ ] Open multiple modals → drag each independently
- [ ] Verify dragged modal comes to front (z-index)

### 8. Resizable Functionality

Test on modals with `resizable: true`:

- [ ] Hover over modal edges → verify resize cursor appears
- [ ] Drag right edge → modal widens
- [ ] Drag bottom edge → modal heightens
- [ ] Drag corner → resize both dimensions
- [ ] Verify minimum size constraints
- [ ] Verify content adjusts to new size
- [ ] Resize then drag → verify both work together

### 9. Escape Key Handling

- [ ] Open any modal
- [ ] Press ESC → modal closes
- [ ] Open modal with `closeOnEscape: false` → ESC does nothing
- [ ] Open nested/stacked modals
- [ ] Press ESC → only top modal closes
- [ ] Press ESC again → next modal closes

### 10. Toast Notifications

Test toast messages across all pages:

- [ ] Trigger success action → green toast appears
- [ ] Trigger error → red toast appears
- [ ] Trigger warning → yellow/orange toast
- [ ] Verify toast auto-dismisses after ~3 seconds
- [ ] Trigger multiple toasts → verify they stack
- [ ] Click toast to dismiss early (if supported)

### 11. Confirm Dialogs

Test confirmation patterns:

- [ ] **Info confirm**: Standard confirmation
  - [ ] Verify neutral styling
  - [ ] Test Cancel and Confirm buttons

- [ ] **Warning confirm**: Caution actions
  - [ ] Verify yellow/warning styling
  - [ ] Verify warning icon displays

- [ ] **Danger confirm**: Destructive actions (delete)
  - [ ] Verify red/danger styling
  - [ ] Verify destructive icon displays
  - [ ] Confirm button should be red/danger styled

### 12. Theme Switching

Test modal appearance in both themes:

- [ ] Open modal in light theme
- [ ] Verify colors, borders, shadows look correct
- [ ] Switch to dark theme (without closing modal)
- [ ] Verify modal updates to dark theme styling
- [ ] Open new modal in dark theme → verify correct
- [ ] Switch back to light theme → verify updates

---

## Accessibility Tests

### 13. Keyboard Navigation

- [ ] Tab through modal → focus moves through interactive elements
- [ ] Shift+Tab → focus moves backward
- [ ] Focus trapped within modal (can't tab outside)
- [ ] Enter on buttons → activates button
- [ ] Space on checkboxes → toggles
- [ ] Arrow keys in dropdowns → navigate options

### 14. Screen Reader Compatibility

- [ ] Modal has `role="dialog"` or `role="alertdialog"`
- [ ] Modal has `aria-modal="true"`
- [ ] Modal title connected via `aria-labelledby`
- [ ] Close button has accessible label
- [ ] Focus moves to modal on open
- [ ] Focus returns to trigger on close

---

## Edge Cases

### 15. Rapid Interactions

- [ ] Open/close modal rapidly → no errors
- [ ] Double-click confirm button → only one action
- [ ] Submit form while previous submit pending → handled gracefully

### 16. Multiple Modals

- [ ] Open modal A, then modal B
- [ ] Verify B appears above A
- [ ] Close B → A still visible and functional
- [ ] Click on A → comes to front (if supported)

### 17. Large Content

- [ ] Open modal with very long content
- [ ] Verify scrolling works within modal body
- [ ] Modal footer stays fixed at bottom
- [ ] Maximize modal → content fills space

### 18. Network Errors

- [ ] Trigger action that requires API call
- [ ] Disconnect network / simulate failure
- [ ] Verify error modal/toast displays
- [ ] Verify modal state is recoverable

---

## Browser Compatibility

Test in each browser:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

For each browser verify:
- [ ] Modals render correctly
- [ ] Animations smooth
- [ ] Drag/resize works
- [ ] No console errors

---

## Performance

- [ ] Open 5+ modals in sequence → memory doesn't leak
- [ ] Close all modals → verify DOM cleanup (no orphaned elements)
- [ ] Long chat session in AgentModal → stays responsive
- [ ] Rapid modal open/close → no performance degradation

---

## Test Results Template

| Page | Test Case | Pass/Fail | Notes |
|------|-----------|-----------|-------|
| actions.html | Create Action Modal | | |
| actions.html | Execute Action Modal | | |
| actions.html | Edit Action Modal | | |
| actions.html | Delete Confirmation | | |
| roles.html | Create Role Modal | | |
| ... | ... | | |

---

## Issue Reporting

When reporting issues, include:

1. **Page URL**: Which page
2. **Steps to Reproduce**: Exact steps
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happened
5. **Console Errors**: Any JS errors
6. **Screenshots**: Visual issues
7. **Browser/OS**: Environment details

---

## Notes

- All automated tests passing: 63/63 (see `/modal-test-automated.html`)
- Test environment: Development server at `http://localhost:3000`
- Theme testing: Use theme toggle in header/sidebar

---

## Non-Modal Issues Found During Testing

### Agents Page (`/agents.html`)
- **🐛 Labeling**: "Suite" in Filters should be "i360 System"
- **🐛 Labeling**: "All Suites" dropdown should be "All i360 Systems"
- **🐛 Calculation**: MindStudio total not calculating (shows 0)

### Admin Page (`/admin.html`)
- **🐛 Data**: Department selection not saving in Edit User modal

---

## Critical Bug Summary

### Systemic Issue: Missing Modal Footers
Multiple pages have form modals that are missing their footer with Save/Cancel buttons:

| Page | Modal | Impact |
|------|-------|--------|
| roles.html | Edit Title | Cannot save changes |
| admin.html | Add User | Cannot create users |
| admin.html | Edit User | Cannot save changes |
| agents.html | New Agent | Cannot create agents |
| agents.html | Edit Agent | Cannot save changes |
| agents.html | Add Context Asset | Cannot add context |

**Root Cause Investigation Needed**: The page JavaScript files that create these modals are likely not including a `footer` option when calling `ModalService.create()` or `ModalService.form()`.
