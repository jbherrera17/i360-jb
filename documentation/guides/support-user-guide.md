# Customer Support AI User Guide

**For:** Insight 360 Users & Administrators
**Last Updated:** March 2026

---

## Why Customer Support AI Matters

The Support AI module provides an intelligent, automated customer support agent that handles common inquiries, processes refunds, manages tier changes, and escalates complex issues to human agents — all while respecting your organization's values and policies.

---

## What It Does

| Action | Description |
|--------|-------------|
| **AI Conversations** | Automated responses to customer inquiries using your org's knowledge base and policies |
| **Refund Processing** | Evaluates and processes refunds based on configurable policy rules |
| **Tier Management** | Handles subscription upgrade/downgrade requests |
| **Smart Escalation** | Automatically detects frustrated customers and escalates to human agents |
| **Action Approval** | Queue for reviewing and approving high-value automated actions |
| **CSAT Tracking** | Collect and track customer satisfaction scores |

---

## Pages Overview

### Support Dashboard
The command center showing key metrics at a glance:
- **Stats cards**: Total conversations, open, escalated, resolved, average CSAT
- **Recent conversations**: Quick view of the latest 10 conversations
- **Pending actions**: Actions awaiting your approval (refunds, tier changes)

### Support Conversations
Full list of all customer support conversations:
1. Use filters to find conversations by status, priority, intent, or search by customer
2. Click any row to view the full conversation
3. Use "New Conversation" to manually create a support session

### Conversation Detail
The full conversation view with message thread and controls:
- **Message thread**: See the complete AI-customer dialogue
- **Customer info**: Name, email, channel, and metadata
- **Actions**: Escalate to human, resolve with summary, or update priority
- **Action log**: See all automated actions taken during the conversation

### Support Actions
Review queue for automated actions:
- **Pending**: Actions requiring human approval (e.g., refunds over $200)
- **Approve/Deny**: Take action on pending items with reason tracking
- **History**: Full audit trail of all automated actions

### Support Settings
Configure the support system:
- **Widget**: Customize appearance, welcome message, pre-chat fields
- **Connections**: Stripe (refund processing) and Slack (escalation alerts)
- **Policies**: View active refund, escalation, and tier change policies

---

## Step by Step Use

### Reviewing the Dashboard
1. Navigate to Support Dashboard
2. Check open and escalated conversation counts
3. Review pending actions that need approval
4. Click any conversation to view details

### Handling an Escalated Conversation
1. Go to Support Conversations and filter by "Escalated"
2. Click the conversation to open the detail view
3. Read the message thread to understand the issue
4. Use the input box to send a manual response if needed
5. Click "Resolve" and provide a resolution summary

### Approving a Refund Action
1. Go to Support Actions
2. Filter by "Pending" status
3. Review the refund details (amount, reason, policy evaluation)
4. Click "Approve" or "Deny" with a reason

### Creating a Manual Conversation
1. On Support Conversations, click "New Conversation"
2. Enter customer name, email, subject, priority, and channel
3. The conversation will be created and you can start messaging

---

## Refund Policy Rules

| Amount | Window | Decision |
|--------|--------|----------|
| Under $50 | Within 30 days | Auto-approved |
| $50-$200 | Within 14 days | Auto-approved |
| $50-$200 | 15-30 days | Requires review |
| Over $200 | Any | Requires human approval |
| Any | Over 30 days | Denied |
| 3+ refunds in 90 days | Any | Denied |

---

## Escalation Triggers

The AI will automatically escalate conversations when:
- Customer sentiment is "frustrated"
- 3+ failed resolution attempts
- Customer explicitly requests a human agent
- Legal or compliance inquiry detected
- Security incident mentioned
- VIP/Enterprise customer flag

---

## Tips & Best Practices

- Review the Pending Actions queue daily
- Monitor escalated conversations for quick human response
- Use CSAT scores to identify areas for improvement
- Keep policies updated in the Processes module
- Check the dashboard metrics weekly for trends

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No conversations appearing | Ensure the Support AI module is enabled for your organization |
| Actions stuck in "Pending" | Check if the action has expired (24h TTL) |
| AI not responding | Verify the Anthropic API key is configured |
| Widget not loading | Check allowed domains in Support Settings |
| Refund auto-denied unexpectedly | Review the refund policy rules and customer's refund history |
