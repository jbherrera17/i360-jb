# Support System Dashboard User Guide

**For:** Insight 360 Admins
**Last Updated:** 2026-04-20

---

## Why This Page Matters

The Support System Dashboard is your at-a-glance operating view for every conversation handled by Annie and the Support AI system. It surfaces conversation volume, escalations, CSAT, and actions Annie is waiting for you to approve or deny — so you can spot issues before they snowball.

## What It Does

| Section | What it shows |
|---------|---------------|
| **Stats row** | Total conversations, currently open, escalated, resolved, and average customer satisfaction score. |
| **Recent Conversations** | The 10 most recent conversations across all widgets. Click any row to open the full conversation thread. |
| **Pending Actions** | Actions Annie detected (refunds, escalations, policy exceptions, etc.) that need admin approval before execution. |

---

## Step by Step Use

### Review today's conversations

1. Open the **Support System Dashboard**.
2. Scan the **stats row** — if any number is alarming (e.g. spike in escalations), click through to investigate.
3. In **Recent Conversations**, click a row to open the full conversation thread on the Conversation Detail page.

### Approve or deny a pending action

1. In **Pending Actions**, read the action detail — it describes what Annie wants to do (and, if applicable, the dollar amount).
2. Click **Approve** to execute or **Deny** to reject.
3. Confirm in the modal. The action runs immediately; the list refreshes automatically.

---

## Tips & Best Practices

- **Don't ignore Pending Actions.** Annie won't execute refunds or escalations without approval — a growing queue means customers are waiting.
- **Track CSAT trends.** A dropping average over a week is a leading indicator of a policy issue or widget misconfiguration.
- **"All Conversations" button** (top right) takes you to the filterable conversation list — use it for investigations beyond today's 10 most recent.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Stats row all zeros | Either no conversations yet, or a multi-tenant scoping issue — refresh. If it persists, check the browser console for 401/403. |
| Pending Actions empty | Expected if Annie hasn't flagged anything for review. Not an error. |
| Approve button does nothing | Check browser console — the server may be rejecting the POST. Verify you're logged in as a role with approval permission (executive, director, manager, supervisor). |
| Page redirects to login | Your session expired. Log in again. |
