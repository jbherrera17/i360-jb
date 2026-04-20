# REQ-002c — Voice Mode + Stripe Billing + Kevin Intro

**Status:** BLOCKED (needs Q3/Q4/Q5 answered before scoping)
**Created:** 2026-04-17
**Parent:** [REQ-002 Index](REQ-002-INDEX.md)

---

## Scope (Phase C Future Work, XL tier — own initiative)

| ID | Feature | T-shirt | Blocking question |
|----|---------|---------|-------------------|
| F2 | Voice mode (STT + TTS) | XL | Q4: provider — OpenAI Realtime / ElevenLabs / Deepgram / Web Speech? |
| F3 | Stripe billing | XL | Q5: model — flat + hard cap / flat + overage / pure usage-based? |
| F12 | Overage billing | M | Depends on F3 |
| F6 | Kevin intro flow | ? | Q3: what IS "Kevin intro"? No spec exists. |

## Open Questions (BLOCKING)

- **Q3** Kevin intro spec — definition + acceptance criteria
- **Q4** Voice provider choice (drives cost model + latency budget)
- **Q5** Stripe pricing model (drives schema + webhook handling complexity)

## Pre-work

- `pricing-strategist` agent should produce overage pricing recommendation respecting 65% margin floor before Stripe build starts.
- Voice mode prototype with chosen provider before full integration commits.

## Definition of Done

Each feature is a separate epic. This REQ stays open as a tracker until F2/F3/F6/F12 each have their own implementation REQ.
