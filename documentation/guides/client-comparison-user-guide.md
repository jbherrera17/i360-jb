# Client Comparison User Guide

**For:** Agency Administrators and Consultants
**Last Updated:** Wednesday, February 12, 2026

---

## Why Client Comparison Is Important

For agencies managing multiple clients, comparison views provide:

- **Portfolio Overview**: See all clients at a glance
- **Performance Benchmarking**: Compare progress across clients
- **Resource Allocation**: Identify which clients need attention
- **Reporting**: Generate cross-client analytics

This enables data-driven agency management and client prioritization.

---

## What It Does

The Client Comparison page lets you:

| Action | Description |
|--------|-------------|
| **View Summary** | See aggregate stats across all clients |
| **Compare Progress** | Compare OKR and health scores |
| **Export** | Generate cross-client reports *(Planned)* |
| **Navigate** | Click through to individual client dashboards |

---

## Step by Step Use

### Accessing Client Comparison

1. Click **Client Comparison** in the Agency section of the sidebar
2. Ensure you have an organization selected (use the org switcher if needed)

### Understanding Summary Cards

The top row shows four summary metrics:

| Card | What It Shows |
|------|---------------|
| **Total Clients** | Count of all clients in your organization |
| **Active Clients** | Clients with "active" status |
| **Avg OKR Progress** | Average OKR completion across all clients *(currently placeholder/demo data)* |
| **Avg Health Score** | Average strategic health score *(currently placeholder/demo data)* |

### Reading the Comparison Table

The table shows one row per client:

| Column | Description |
|--------|-------------|
| **Client** | Name with status indicator (green=active, gray=inactive, red=archived) |
| **Status** | Current client status |
| **OKR Progress** | Progress bar and percentage *(currently placeholder/demo data)* |
| **Health Score** | Health indicator bar and percentage *(currently placeholder/demo data)* |
| **Active Workflows** | Number of running workflows |
| **Last Activity** | Time since last recorded activity |
| **Actions** | Link to client's dashboard |

### Color-Coding Progress

Progress bars use color to indicate performance:

| Color | Range | Meaning |
|-------|-------|---------|
| Green (Excellent) | 80-100% | On track or ahead |
| Light Green (Good) | 60-79% | Generally healthy |
| Yellow (Fair) | 40-59% | Needs attention |
| Red (Poor) | 0-39% | At risk |

### Switching Organizations

If you manage multiple organizations:
1. Use the **Organization** dropdown in the header
2. Select the organization to view
3. The table refreshes with that org's clients

### Exporting Reports *(Planned)*

The Export Report button is present but export functionality is not yet implemented. Clicking it will display a "coming soon" message. Full export support is planned for a future release.

---

## Charts Section *(Planned)*

The chart areas are present on the page but currently display "Chart visualization coming soon" placeholder text. When implemented, they will include:

- **Client Distribution by Status** - A pie chart showing percentages of active, inactive, and archived clients
- **OKR Progress Trend** - A line chart showing OKR progress over time across your client portfolio

---

## Tips for Best Results

### Identifying At-Risk Clients

Look for:
- Low OKR progress (red/yellow bars)
- Low health scores
- Long time since last activity
- Decreasing trend lines

### Prioritizing Attention

Use this page to:
1. Check health scores for strategic alignment issues
2. Review last activity for disengaged clients
3. Balance attention across your portfolio

### Using for Client Reviews

This page is excellent for:
- Weekly portfolio reviews
- Monthly business reviews
- Quarterly planning sessions
- Client prioritization meetings

---

## What's Happening Behind the Scenes

The comparison view retrieves data from:

1. `clients` table for client list and status
2. `company_profiles` for each client's profile

Some metrics are planned to query from the database but are currently generated client-side with placeholder data:

- OKR progress (planned: `okrs` table aggregations)
- Health scores (planned: `health_checks` and strategy data)
- Activity timestamps (planned: various execution tables)

---

## Common Questions

**Q: Why don't I see any clients?**
A: Ensure you have an organization selected. If you do, you may not have clients added yet.

**Q: How often is the data refreshed?**
A: Data loads fresh each time you visit the page. Statistics reflect current state.

**Q: Can I filter to see only active clients?**
A: Currently, all clients are shown. Use the status column to identify active ones.

**Q: What's the difference between OKR Progress and Health Score?**
A: OKR Progress tracks objective completion. Health Score measures strategic alignment and system health.

**Q: Can I compare specific clients side-by-side?**
A: The table shows all clients for comparison. For deeper analysis, use individual dashboards.

**Q: How is "Last Activity" calculated?**
A: It shows the most recent timestamp from any tracked activity (workflow execution, agent chat, briefing generation, etc.).

---

## Related Features

- **Company Dashboard** - Individual client deep dive
- **Clients Management** - Add and manage client records
- **Strategy 120** - OKR management
- **Strategy Governance** - Health score details
- **Organization Settings** - Manage your agency
