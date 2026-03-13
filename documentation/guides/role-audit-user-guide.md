# Role Change Audit Trail User Guide

**For:** Org Admins, Org Owners, and Platform Administrators
**Last Updated:** 2026-03-13

---

## Why the Audit Trail Matters

Every time a membership or role changes in your organization — an invitation, a promotion, a suspension, a removal — that event is permanently logged. The Role Change Audit Trail gives you a transparent, searchable record of who changed what, when, and why. This supports governance, compliance, and accountability across all user management actions.

---

## What It Tracks

| Change Type | What It Means |
|-------------|---------------|
| **Member Invited** | A new user was invited to the organization |
| **Member Role Changed** | A member's organizational role was updated (e.g., member → admin) |
| **Member Activated** | A suspended or inactive member was re-activated |
| **Member Suspended** | A member's access was suspended |
| **Member Removed** | A member was removed from the organization |
| **Ownership Transferred** | Org ownership was transferred to another user |
| **Business Role Changed** | A member's business role was updated |
| **Client Access Granted** | A member was granted access to a client |
| **Client Access Role Changed** | A member's client access role was updated |
| **Client Access Removed** | A member's access to a client was removed |
| **Platform Admin Granted** | (Platform admins only) A user was granted platform admin status |
| **Platform Admin Role Updated** | (Platform admins only) A platform admin's role was changed |
| **Platform Admin Removed** | (Platform admins only) Platform admin access was revoked |

---

## How to Use

### For Org Admins and Owners

Navigate to **Admin > Role Audit** from the sidebar (or go to `/admin-role-audit`). You will see:

1. **Summary cards** showing activity in the last 30 days
2. **Filter controls** to narrow by change type and date range
3. **Search** to find entries by user name or email
4. A **paginated table** showing all role changes within your organization

### For Platform Administrators

Open the **Platform Administration** page and click the **Role Audit** tab. Platform admins see all changes across every organization on the platform. Additional filters include:
- Filter by organization
- Filter by change type
- Filter by date range

---

## Reading the Audit Table

| Column | What It Shows |
|--------|---------------|
| **Date / Time** | When the change was recorded |
| **Changed By** | The user who performed the action (name and email) |
| **User Affected** | The user whose role or membership was changed |
| **Organization** | Which organization the change belongs to (platform admin view only) |
| **Change Type** | A color-coded badge indicating the kind of change |
| **Details** | The old value → new value of the change (e.g., `member → admin`) |
| **Reason** | An optional note explaining why the change was made |

### Change Type Badge Colors

- **Blue** — invitation actions
- **Amber** — role change actions
- **Red** — removal actions
- **Purple** — ownership transfers
- **Indigo** — platform admin changes
- **Green** — activation or client access actions

---

## Filtering and Searching

### By Change Type
Use the **Change Type** dropdown to focus on a specific category of events (e.g., show only removals or only invitations).

### By Date Range
Use the **Date Range** dropdown to limit results to:
- Last 7 days
- Last 30 days (default)
- Last 90 days
- Last 365 days
- All time

### By Search
Type any name or email address into the search box to filter results in real time.

---

## Tips and Best Practices

- Review the audit trail **regularly** to catch unexpected role escalations.
- Use the **Reason** column when making changes — this makes the audit trail much more useful for compliance and accountability.
- If you see a change you don't recognize, check with the person listed in the **Changed By** column.
- Platform admins can use the **Organization** filter to investigate a specific client's activity.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Audit trail shows "Failed to load" | The Phase 70 database migration may not be deployed yet. Contact your platform administrator. |
| No entries visible | Check that date range filters aren't excluding recent changes. Try selecting "All time". |
| "Access Denied" shown | You need org admin or owner permissions to view this page. |
| Old changes missing | The audit trail only records changes made after Phase 70 was deployed. Historical changes before that point are not available. |
