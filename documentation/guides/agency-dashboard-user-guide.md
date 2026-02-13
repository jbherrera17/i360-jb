# Agency Dashboard User Guide

**For:** Insight 360 Agency Users
**Last Updated:** Wednesday, February 12, 2026

---

## Why Agency Dashboard Is Important

The Agency Dashboard provides a comprehensive overview of your organization's client portfolio. It aggregates metrics across all clients, helping you monitor engagement health, track maturity scores, and identify clients that need attention.

---

## What It Does

| Feature | Description |
|---------|-------------|
| **Overview Stats** | Total clients, sessions, average maturity, and active portal users |
| **Client Health Grid** | Visual overview of all clients with health indicators |
| **Maturity Distribution** | Breakdown of clients by AI maturity level |
| **Needs Attention** | Clients with low health scores or dormant engagement |
| **Export** | Download client data as CSV or JSON |
| **Multi-Org Support** | Switch between organizations you manage |

---

## Step by Step Use

### Viewing Organization Overview

1. Select your organization from the dropdown at the top
2. View the summary cards showing key metrics:
   - Total clients in your organization
   - Completed Sessions
   - Average AI maturity score
   - Portal Users

### Monitoring Client Health

1. The Client Health Grid shows all active clients
2. Each client card displays:
   - Client name and engagement status
   - Maturity and readiness scores
   - Last session date
   - Health score indicator

### Understanding Maturity Distribution

1. The horizontal bar chart shows how clients are distributed across maturity levels:
   - **Nascent** (0-20): Just starting AI journey
   - **Emerging** (21-40): Early adoption
   - **Developing** (41-60): Building capabilities
   - **Advanced** (61-80): Strong AI integration
   - **Leading** (81-100): Industry leaders

### Identifying At-Risk Clients

1. The "Needs Attention" section highlights clients that may need proactive outreach
2. Criteria for flagging:
   - Health score below 50
   - Engagement status is "dormant"
3. Click "View" to navigate to the client list page (/admin-clients.html)

### Exporting Data

1. Click the **Export** button in the dashboard header
2. Choose your preferred format:
   - **CSV**: Spreadsheet-compatible format for Excel, Google Sheets, etc.
   - **JSON**: Structured data format for programmatic use
3. The export includes client metrics, health scores, and engagement data for the selected organization

---

## Tips & Best Practices

- Check the dashboard weekly to stay on top of client health
- Use the maturity distribution to plan capacity and resource allocation
- Follow up with "Needs Attention" clients within 48 hours of appearing on the list
- Compare month-over-month trends using the historical snapshots

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No clients showing | Ensure clients are added to the selected organization |
| Metrics not updating | Metrics refresh every 5 minutes; click Refresh to force update |
| Missing portal users | Portal users are counted from the Client Portal Users page |
| Charts not loading | Check browser console for JavaScript errors |
