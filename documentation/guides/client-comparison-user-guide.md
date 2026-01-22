# Client Comparison User Guide

**For:** Agency Administrators and Consultants
**Last Updated:** January 21, 2026

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
| **Filter by Status** | Focus on active, inactive, or archived clients |
| **Export** | Generate cross-client reports |
| **Navigate** | Click through to individual client dashboards |

---

## Step by Step Use

### Accessing Client Comparison

1. Click **Client Comparison** in the Admin section of the sidebar
2. Ensure you have an organization selected (use the org switcher if needed)

### Understanding Summary Cards

The top row shows four summary metrics:

| Card | What It Shows |
|------|---------------|
| **Total Clients** | Count of all clients in your organization |
| **Active Clients** | Clients with "active" status |
| **Avg OKR Progress** | Average OKR completion across all clients |
| **Avg Health Score** | Average strategic health score |

### Reading the Comparison Table

The table shows one row per client:

| Column | Description |
|--------|-------------|
| **Client** | Name with status indicator (green=active, gray=inactive, red=archived) |
| **Status** | Current client status |
| **OKR Progress** | Progress bar and percentage |
| **Health Score** | Health indicator bar and percentage |
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

### Exporting Reports

1. Click **Export Report**
2. Select the format (PDF or CSV)
3. The report downloads with current comparison data

---

## Charts Section

### Client Distribution by Status

The pie chart shows:
- Percentage of active clients
- Percentage of inactive clients
- Percentage of archived clients

### OKR Progress Trend

The line chart shows:
- OKR progress over time
- Trends across your client portfolio
- Seasonal patterns

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
1. Sort by OKR progress to find lowest performers
2. Check health scores for strategic alignment issues
3. Review last activity for disengaged clients
4. Balance attention across your portfolio

### Using for Client Reviews

This page is excellent for:
- Weekly portfolio reviews
- Monthly business reviews
- Quarterly planning sessions
- Client prioritization meetings

---

## What's Happening Behind the Scenes

The comparison view queries:

1. `clients` table for client list and status
2. `company_profiles` for each client's profile
3. OKR progress from `okrs` table aggregations
4. Health scores from `health_checks` and strategy data
5. Activity timestamps from various execution tables

Data is aggregated per client for the comparison view.

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
