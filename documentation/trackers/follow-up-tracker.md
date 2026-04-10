# Synergi AI — Follow-Up Tracker

> **Purpose:** Persistent log of scheduled follow-ups, performance triggers, and time-based check-ins across all departments. Any orchestrator can add entries. The `biz-follow-up` skill manages this file.
>
> **Last Reviewed:** 2026-03-17
> **Next Scheduled Review:** 2026-03-24

---

## How This Works

1. **Any skill/orchestrator** adds a follow-up when it identifies a trigger condition, deadline, or recurring check-in need
2. **biz-follow-up** (Marley) reviews this tracker during weekly reviews and flags items that are due or overdue
3. **Orchestrators** reference this tracker at the start of their workflows (Sloan's WF-SUP01, Tatum's WF-S04, Marlowe's WF-F03, Riley-O's WF-OPS01)
4. **Items are resolved** by updating status to `RESOLVED` with resolution notes and date — never deleted

---

## Status Key

| Status | Meaning |
|--------|---------|
| `ACTIVE` | Monitoring — trigger condition not yet met |
| `TRIGGERED` | Condition met — action required |
| `IN PROGRESS` | Action underway |
| `RESOLVED` | Completed — includes resolution notes |
| `ESCALATED` | Passed to human PM for decision |
| `DEFERRED` | Intentionally postponed with reason and new date |

---

## Active Follow-Ups

### FU-001: Annie Overage → Upgrade Conversation
- **Source:** Kendall (biz-pricing) — Annie Phase 2 Pricing Analysis
- **Owner:** Tatum (sales-orchestrator)
- **Category:** Revenue / Expansion
- **Trigger:** Any widget with overage billing for 3 consecutive months
- **Action:** Tatum initiates tier upgrade conversation with the org admin. Prepare upgrade proposal (Drew) showing cost savings of higher tier vs. continued overage.
- **Check Frequency:** Monthly (align with Harley's WF-F03 revenue review)
- **Created:** 2026-03-17
- **Status:** `ACTIVE`
- **Notes:** Overage rate is intentionally below 65% margin floor — it's a bridge to upgrade, not a profit center. If >30% of Annie revenue comes from overage for 2+ months, escalate pricing model review to Kendall.

### FU-002: Annie Email Channel Margin Watch
- **Source:** Kendall (biz-pricing) — Annie Phase 2 Pricing Analysis
- **Owner:** Rowan-O (ops-cost-analyst)
- **Category:** Cost / Margin
- **Trigger:** Email channel cost exceeds $29/mo add-on revenue for any org (negative margin on email)
- **Action:** Rowan-O flags to Riley-O. Options: (a) adjust email pricing, (b) tighten email message ceiling, (c) trigger upgrade to Business tier where email is included.
- **Check Frequency:** Monthly
- **Created:** 2026-03-17
- **Status:** `ACTIVE`
- **Notes:** Email messages count against existing message ceiling. Monitor SendGrid/Mailgun costs separately from LLM costs.

### FU-003: Annie Pilot — Weekly Check-Ins
- **Source:** Drew (sales-proposal) — Healthcare PoV Proposal
- **Owner:** Peyton (biz-customer-success)
- **Category:** Customer Success / Onboarding
- **Trigger:** Time-based — every Monday during active Annie pilot
- **Action:** Review pilot metrics (call deflection %, leads captured, bookings made). Tune knowledge base. Prepare weekly summary for practice.
- **Check Frequency:** Weekly (during pilot)
- **Expires:** 90 days after pilot start
- **Created:** 2026-03-17
- **Status:** `ACTIVE`
- **Notes:** Template: Week 1-2 (setup), Week 3-6 (Win 1 focus), Week 7-10 (Win 2), Week 11-13 (Win 3 + final report).

### FU-004: Annie Pilot — 90-Day Review & Tier Recommendation
- **Source:** Drew (sales-proposal) — Healthcare PoV Proposal
- **Owner:** Tatum (sales-orchestrator)
- **Category:** Sales / Conversion
- **Trigger:** Pilot day 85 (5 days before pilot ends)
- **Action:** Tatum delegates to Drew for subscription recommendation. Assemble pilot results. Schedule closing call with prospect. Prepare upgrade options (continue Starter vs. Business).
- **Check Frequency:** One-time (day 85 of pilot)
- **Created:** 2026-03-17
- **Status:** `ACTIVE`
- **Notes:** If pilot didn't deliver 3 wins, honor guarantee — no charge. Document lessons learned.

---

## Follow-Up Templates

### Financial Trigger
```
### FU-{NNN}: {Title}
- **Source:** {skill/agent that identified this}
- **Owner:** {orchestrator or specialist responsible}
- **Category:** Finance / {sub-category}
- **Trigger:** {specific measurable condition — e.g., "AP aging >45 days for any vendor"}
- **Action:** {what to do when triggered}
- **Check Frequency:** {daily/weekly/monthly}
- **Created:** {date}
- **Status:** `ACTIVE`
- **Notes:** {context}
```

### Operational Drift
```
### FU-{NNN}: {Title}
- **Source:** {skill/agent that identified this}
- **Owner:** {orchestrator or specialist responsible}
- **Category:** Operations / Drift
- **Trigger:** {specific deviation — e.g., "SLA compliance drops below 97% for 2 consecutive weeks"}
- **Action:** {what to do when triggered}
- **Check Frequency:** {weekly/monthly}
- **Created:** {date}
- **Status:** `ACTIVE`
- **Notes:** {context}
```

### Documentation Drift
```
### FU-{NNN}: {Title}
- **Source:** Parker (pm-docs-sync)
- **Owner:** Parker (pm-docs-sync)
- **Category:** Documentation / Drift
- **Trigger:** {specific drift — e.g., "user guide references feature that changed in release X"}
- **Action:** {update guide, verify help registry, check ALLOWED_DOCS}
- **Check Frequency:** Post-release
- **Created:** {date}
- **Status:** `ACTIVE`
- **Notes:** {context}
```

### Customer Health
```
### FU-{NNN}: {Title}
- **Source:** Peyton (biz-customer-success)
- **Owner:** Peyton + {relevant orchestrator}
- **Category:** Customer Success / {Churn Risk | Expansion | Onboarding}
- **Trigger:** {health score condition — e.g., "health score drops below 5 for any account"}
- **Action:** {intervention plan}
- **Check Frequency:** {weekly/monthly}
- **Created:** {date}
- **Status:** `ACTIVE`
- **Notes:** {context, notify list}
```

### Policy Override Pattern
```
### FU-{NNN}: {Title}
- **Source:** Dallas (sup-policy-tuner)
- **Owner:** Sloan (sup-orchestrator)
- **Category:** Support / Policy
- **Trigger:** {override condition — e.g., "refund override rate exceeds 15% for 30 days"}
- **Action:** {policy review, threshold adjustment recommendation}
- **Check Frequency:** Monthly
- **Created:** {date}
- **Status:** `ACTIVE`
- **Notes:** {context}
```

---

## Resolved Follow-Ups

*(Move completed items here with resolution notes)*

---

## Review Log

| Date | Reviewer | Items Reviewed | Actions Taken |
|------|----------|:--------------:|---------------|
| 2026-03-17 | Marley (biz-follow-up) | 4 | Initial seeding from Annie Phase 2 analysis |
