# Insight 360 Release Notes
## Unified Runtime Backbone v1
**Release date:** March 11, 2026  
**Audience:** Business users, team leads, and admins

## What’s new
Insight 360 now runs Agents, Actions, Skills, and Workflows through one shared execution foundation. This gives us a more consistent experience across the platform while keeping your existing screens and flows the same.

## Why this matters
- **More reliable outcomes:** Fewer module-specific differences, so behavior is more predictable.
- **Faster where possible:** Simple requests can run in a faster path, while complex requests can still use full AI processing.
- **Safer rollout:** We can turn features on/off by module and by organization without impacting the whole platform.
- **Better stability under stress:** Problems in one area are less likely to slow down other areas.
- **Improved visibility:** Operations teams now have clearer runtime status and health indicators.

## What users will notice
- Existing Agent, Action, Skill, and Workflow features still work as before.
- Response formats remain compatible with current integrations.
- In some cases, responses may be faster for simpler tasks.
- During controlled rollout, behavior may vary slightly by organization based on feature flag settings.

## Admin and governance improvements
- New controls allow selective enablement per module (Agents, Actions, Workflows, Skills, Execute120).
- Module-level kill switches can safely stop one area without shutting down others.
- Runtime status view now shows high-level health, controls, and protection status.

## Safety and rollout approach
This release is designed for phased rollout with safeguards:
- Feature flags for gradual adoption
- Shadow mode checks for parity validation
- Isolation controls to limit cross-module impact

## Known v1 boundaries
Some advanced workflow control patterns are not fully active in v1 and will return explicit “not supported in v1” behavior rather than failing silently.

## No action required
No immediate end-user action is required. Admin teams can proceed with staged enablement and monitoring.

## Recommended next step
Run the Postman UAT collection in staging before broad production enablement:
- `documentation/test-plans/unified-runtime-v1.postman_collection.json`
- `documentation/test-plans/unified-runtime-v1-postman.md`
