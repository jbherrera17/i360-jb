# Company Dashboard User Guide

**For:** Insight 360 Users
**Last Updated:** Tuesday, February 10, 2026

---

## Why Company Dashboard Is Important

The Company Dashboard provides a unified view of organizational health and OKR progress. Instead of checking multiple systems, get the complete picture in one place:

- **At-a-glance health**: See overall progress instantly
- **Department comparison**: Understand relative performance
- **Early warning**: Identify issues before they escalate
- **Activity tracking**: Know what's happening across the organization
- **Multi-tenant support**: Filter by organization or client (for agency model)

---

## What It Does

The Company Dashboard displays:

| Feature | Description |
|---------|-------------|
| **Summary Stats** | Key metrics at a glance (OKRs, progress, departments, roles, processes) |
| **OKR Health** | Progress distribution across status categories |
| **Department Scorecard** | Performance by organizational unit |
| **Attention Items** | Up to 5 issues requiring focus |
| **Recent Activity** | Latest 5 changes across the system |

---

## Step by Step Use

### Viewing the Dashboard

1. Navigate to **Company Dashboard** in the sidebar
2. If available, use the organization/client selectors at the top
3. View the filter bar with department, period, and quarter options
4. See summary statistics row
5. Review main dashboard grid below

### Understanding Summary Statistics

The top row shows five key metrics:

| Metric | Description |
|--------|-------------|
| **Total OKRs** | Count of all OKRs (reflects active filters) |
| **Avg Progress** | Mean progress percentage across OKRs |
| **Departments** | Number of active departments |
| **Roles Defined** | Total roles across organization |
| **Processes** | Documented process count |

### Filtering the View

**By Organization** (if multi-tenant):
1. Select an organization from the organization switcher dropdown
2. Dashboard updates to show only that organization's data
3. All metrics and departments update accordingly

**By Client** (if using Agency model):
1. Select a client from the client selector dropdown
2. Dashboard filters to show only that client's data
3. Useful for agencies managing multiple clients

**By Department:**
1. Click the Department dropdown
2. Select a specific department
3. All metrics update to that department
4. Select "All Departments" to reset

**By Time Period:**
1. Click the Time Period dropdown
2. Select a year (2025, 2026, etc.)
3. OKRs filter to that period

**By Quarter:**
1. Click the Quarter dropdown
2. Select Q1, Q2, Q3, or Q4
3. OKRs filter to that quarter

**Resetting Filters:**
1. Click the **Reset** button
2. All filters clear
3. Full dataset displays

**Filter Indicator:**
- "Filtered" badge appears when filters are active
- Helps you know the view is not showing complete data

### Reading OKR Health

The OKR Health section shows progress distribution:

**Status Categories:**
| Status | Progress | Color |
|--------|----------|-------|
| **Completed** | 100% or status=completed | Purple |
| **On Track** | 70%+ | Green |
| **At Risk** | 40-69% | Yellow |
| **Behind** | <40% | Red |

**Progress Distribution Bar:**
- Visual representation of the split across categories
- Green segment (70-100%) = high progress
- Yellow segment (40-69%) = medium progress
- Red segment (0-39%) = low progress
- Segments show percentage labels when > 10% of total

### Using Department Scorecard

Each department card shows:
1. **Department icon and name**
2. **OKR count** for that department
3. **Role count** in the department
4. **Process count** documented
5. **Average progress** with color indicator

**Reading the Progress Bar:**
- Green fill (70%+) = healthy
- Yellow fill (40-69%) = needs attention
- Red fill (<40%) = struggling

### Reviewing Attention Items

The Needs Attention panel highlights up to 5 issues:

**Critical Items (Red):**
- Up to 3 OKRs behind schedule (<40% progress, active status)
- Immediate action needed

**Warning Items (Yellow):**
- Up to 2 OKRs at risk (40-69% progress, active status)
- May miss targets without intervention

**Info Items (Blue):**
- Departments without OKRs (shown only if fewer than 5 critical+warning items)
- Organizational gaps to address

### Monitoring Recent Activity

The Activity panel shows the latest 5 changes across the system:
- **OKR** creation (green icon)
- **Process** documentation (yellow icon)
- **Role** definitions (blue icon)
- **Department** additions (purple icon)

Each entry shows:
- What was created
- The item name
- Time since creation (e.g., "2 hours ago")

---

## Tips for Best Results

### Daily Check
- Review attention items first
- Check for new critical issues
- Scan activity for surprises

### Weekly Review
- Compare department performance via the scorecard
- Identify patterns in at-risk OKRs
- Check trend in overall progress

### Monthly Analysis
- Use filters to review by period and quarter
- Compare Q-over-Q performance
- Identify consistently struggling areas

### Using Filters Effectively
- Start broad, then narrow
- Compare departments one at a time
- Use quarter filter for seasonal patterns
- Use organization/client selectors for multi-tenant views

---

## Related Documentation

| Document | Description | Location |
|----------|-------------|----------|
| Align 120 Guide | Foundation and readiness assessment | [align120-user-guide.md](./align120-user-guide.md) |
| Parthenon Guide | Manage OKRs and processes | [parthenon-user-guide.md](./parthenon-user-guide.md) |
| Strategy Guide | Strategic framework | [strategy-user-guide.md](./strategy-user-guide.md) |
| Dashboard Guide | Main system dashboard | [dashboard-user-guide.md](./dashboard-user-guide.md) |

---

## Troubleshooting

**No data displaying:**
- Check Parthenon for configured OKRs
- Verify departments exist
- Ensure data has been entered
- Check organization/client selection

**Filter not working:**
- Verify filter selection
- Check that matching data exists for the selected period/quarter
- Try the Reset button

**Scores seem wrong:**
- Confirm OKR progress is up to date
- Check for recently added items
- Verify filters aren't excluding data
- Note: Completed OKRs (100%) are grouped separately from On Track

**Activity list empty:**
- No recent changes in system
- Check data creation dates
- May be filtered to empty set by organization/client selection

**Dashboard shows stale data:**
- Try clicking Reset filters and wait for reload
- Organization or client change may require a moment to refresh
- Check browser developer console for error messages
