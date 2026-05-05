# Org Configuration User Guide

**For:** Insight 360 Platform Administrators (Synergi only)
**Last Updated:** 2026-04-30
**Source:** REQ-003 / Phase 88

---

## Why This Page Is Important

Sometimes a customer needs a configuration that doesn't fit any standard tier. Maybe Acme Corp negotiated extra agents at signup. Maybe a launch partner gets early access to an Enterprise-only module on their Business plan. Maybe a key client needs the conversation cap raised on Customer Support AI for a holiday season push.

The Org Configuration page lets you (the platform admin) apply those exceptions per organization without changing the tier model itself. The org keeps paying their standard tier price; the override is a private concession that takes effect immediately and lives in an audit log forever.

**Visibility:** these overrides are platform-admin-only. The org's own admin sees their effective configuration but does not see that an override exists or who granted it.

---

## What It Does

| Action | Description |
|--------|-------------|
| **Pick an organization** | Dropdown of all orgs. The page loads their effective configuration (tier defaults + any overrides). |
| **Override a resource limit** | Bump max_agents from 25 → 40, give unlimited storage, etc. Requires a written reason. |
| **Override a module access** | Flip a module's access type for this org: Core (granted) / Optional (offered as add-on) / None (denied). |
| **Reset an override** | Remove a previously applied override. The org reverts to their tier default. Requires a reason. |
| **Acknowledge tier-default-change alerts** | When a tier default changes for a module the org has an override on, an alert appears here. Acknowledging it tells the system "yes, I'm aware — keeping the override." |
| **Browse history** | Audit log of every override change ever made for this org, with timestamps, who made the change, and why. |

---

## Step by Step Use

### Apply a resource limit override

1. Pick the org from the **Select an organization** dropdown.
2. The **Effective Configuration** panel on the right shows current limits. Anything overridden has a small dot (●) next to it.
3. Click **Override** next to the field you want to change (e.g., Members).
4. Enter the new value:
   - A positive integer for a specific cap (`40` = 40 agents)
   - `-1` for unlimited
5. Enter a **reason** — required. Be specific: future you (or whoever takes over CS) will read this.
6. Click **Save Override**. The change takes effect immediately for the org.

### Apply a module access override

1. Scroll to **Module Access**. Modules with overrides appear at the top, marked with a dot (●).
2. Click **Override** next to the module.
3. Pick the new access type:
   - **Core** — included at no extra cost
   - **Optional** — available as a paid add-on
   - **None** — explicitly denied
4. Enter a reason. Save.

### Reset an override

Click **Reset** next to any overridden field or module. Provide a reason (why are you removing the concession?). The org reverts to their tier default.

### Review tier-default-change alerts

When you (or anyone) edits the tier matrix in `/admin-tier-setup` for a module that one or more orgs have overrides on, an alert is generated for each affected org.

The alerts appear in a yellow panel above the history. Each alert shows:
- The change classification (UP = more inclusive, DOWN = less inclusive, LATERAL = price changed but access type didn't)
- The module and tier
- The before/after access types

Click **Acknowledge** to dismiss an alert. This signals "I've reviewed this and decided to keep the override (or already updated it)."

### Read the override history

Newest first. Each entry shows:
- Timestamp
- Change type (resource / module / reset)
- The field or module that changed
- The reason
- A short delta indicator (`new`, `updated`, `reset`)

---

## Tips & Best Practices

- **Always write a real reason.** "negotiated at signup as part of $5K/yr deal" is useful. "test" is not. The reason becomes the only context future-you has for why this org is configured this way.
- **Consider creating a Custom Tier instead when overrides multiply.** If an org has 6+ overrides, you're effectively running a one-off tier for them. The plan to support fully custom tiers (separate from the override system) is on the REQ-003 roadmap.
- **Acknowledge alerts promptly.** Stale alerts pile up and lose meaning. Either update the override to match the new tier default or acknowledge that you're keeping the divergence.
- **Resource overrides bypass billing.** Stripe still charges the tier price. If you grant Acme 100 agents on a Starter plan, they're consuming Enterprise-grade resources at a Starter price. Be deliberate about this, especially for token-heavy resources like `max_monthly_api_calls`.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Failed to load organizations" | Confirm you're logged in as a platform admin. Refresh the page. |
| Override saves but doesn't appear in Effective Configuration | Refresh the page — the effective config reload might have raced the save. |
| "Reason required" error even though I typed one | Whitespace-only reasons are rejected. Type at least one non-space character. |
| Module override has no effect on the org | The module's `is_active` flag may be FALSE in `platform_modules`. Check `/admin-platform` modules tab. |
| Resource override shows but `check_org_limits` doesn't honor it | Apply Phase 88 SQL migration if not already applied. |

---

## Related Pages

- `/admin-tier-setup` — Edit tier defaults and the per-tier-per-module matrix. Changes here propagate to every org on that tier (and may generate alerts on this page).
- `/admin-platform` — Activate/deactivate modules, manage platform admins.
- `/admin-platform-orgs` — Manage org subscriptions.
