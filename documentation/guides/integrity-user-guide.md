# Integrity Dashboard User Guide

**For:** Insight 360 Users
**Last Updated:** Wednesday, February 12, 2026

---

## Why Integrity Measurement Is Important

The Integrity Dashboard quantifies your organization's ethics posture through the **Integrity Yield** framework. Traditional compliance approaches are binary -- you either violated a rule or you didn't. Integrity Yield goes further by measuring the ongoing health of your ethical practices, surfacing drift before it becomes a crisis. This dashboard helps you:

- **Quantify ethics posture**: See a composite score (0-100) that reflects how well your organization lives its stated values
- **Detect drift early**: Leading indicators warn you when integrity trends are moving in the wrong direction
- **Track what matters**: Monitor the gap between stated values and behavior under pressure
- **Measure the invisible**: Quantify the ROI of "nothing went wrong" through counterfactual value

---

## What It Does

| Feature | Description |
|---------|-------------|
| **Integrity Yield Score** | Composite score (0-100) measuring overall organizational ethics health |
| **Component Scores** | Four weighted pillars: Trust Velocity, Intervention Effectiveness, Alignment Audit, Counterfactual Value |
| **Leading Indicators** | Early warning signals that predict future integrity issues |
| **Lagging Indicators** | Reference context from past events |
| **Integrity Assets Grid** | Status of the seven Context Assets that feed the dashboard |
| **Recommended Actions** | Prioritized action items drawn from the integrity yield data |
| **Setup Wizard** | Guided onboarding when no integrity assets exist yet |

---

## Step by Step Use

### Getting Started (First-Time Setup)

When you first open the Integrity Dashboard, the page checks for an existing `integrity_yield` Context Asset. If none exists, you see the setup wizard with two options and a Quick Start Guide.

1. Navigate to **Integrity** in the sidebar
2. You will see the empty state with a shield icon and setup instructions
3. Choose one of the two buttons:
   - **Soul Configuration Wizard** -- Opens the 7-step soul wizard (`soul-wizard.html`) to define your organization's values and bright lines
   - **Manage Soul Config** -- Opens the soul configuration management page for more advanced setup
4. Follow the Quick Start Guide below the buttons to configure your foundation assets

### Quick Start Guide (Setup Wizard)

The setup wizard displays four sequential steps, each with a button that takes you to the Context Assets page to create the appropriate asset:

**Step 1: Define Your Bright Lines**
1. Click **Configure** on the Bright Lines card
2. You are redirected to Context Assets (`context.html?create=bright_lines`)
3. Document your non-negotiable ethical boundaries -- the lines you will not cross regardless of business pressure
4. Examples: "No misleading customers", "No safety shortcuts"

**Step 2: Map Your Values**
1. Click **Configure** on the Values Map card
2. You are redirected to Context Assets (`context.html?create=values_map`)
3. Document your stated values (what you claim to value)
4. Document your stress values (what you actually do under pressure)
5. Identify the gaps between them

**Step 3: Start Your Close Call Log**
1. Click **Start Log** on the Close Call card
2. You are redirected to Context Assets (`context.html?create=close_call_log`)
3. Begin documenting near-misses -- the crises that did not happen because someone intervened
4. Record what could have gone wrong and who stepped in

**Step 4: Research Industry Baseline**
1. Click **Research** on the Industry Baseline card
2. You are redirected to Context Assets (`context.html?create=industry_baseline`)
3. Document industry incidents and failures
4. Quantify costs of ethical lapses in your industry for comparison

### The Integrity Yield Score

Once integrity assets are configured, the dashboard displays the full ethics measurement view. The central metric is the **Integrity Yield** score (0-100), shown as a ring gauge:

| Score | Interpretation | Visual Status |
|-------|----------------|---------------|
| **80-100** | Strong Integrity Posture | Green |
| **60-79** | Adequate with Opportunities | Blue |
| **40-59** | Significant Gaps | Yellow |
| **0-39** | Critical Attention Needed | Red |

The score also shows a **trend indicator** comparing the current period to the prior period (improving, stable, or declining).

**Score Components (Weighted Formula):**

| Component | Weight | What It Measures |
|-----------|--------|-----------------|
| Trust Velocity | 30% | Are stakeholder relationships compounding or eroding? |
| Intervention Effectiveness | 25% | How well does human oversight work in automated systems? |
| Alignment Audit | 25% | Do stated values match behavior under pressure? |
| Counterfactual Value | 20% | What is the ROI on integrity investments? |

Each component displays its own score (0-100), weight percentage, a description, and a progress bar.

### Understanding Leading and Lagging Indicators

Below the component scores, the dashboard shows two indicator panels:

**Leading Indicators (Early Warning System):**
- These predict future integrity issues before they manifest
- Each indicator has a colored status dot: green (healthy), yellow (watch), red (attention needed)
- Indicators include a name and an optional note explaining the signal
- If no integrity assets are configured, the panel shows "No leading indicators configured yet"

**Lagging Indicators (Reference Context):**
- These provide historical context from past events
- Same format as leading indicators with status dots, names, and notes

Both sets of indicators are populated from the `integrity_yield` Context Asset's `leading_indicators` field.

### Monitoring Integrity Asset Status

The **Integrity Assets** grid shows the health of all seven data sources that feed the dashboard:

| Asset | Layer | Purpose |
|-------|-------|---------|
| **Bright Lines** | Foundation | Define non-negotiable ethical boundaries |
| **Values Map** | Foundation | Document stated vs. stress values |
| **Intervention Metrics** | Measurement | Track human oversight effectiveness |
| **Trust Velocity** | Measurement | Measure relationship trends over time |
| **Close Call Log** | Measurement | Record near-misses and interventions |
| **Industry Baseline** | Comparison | External comparison data from your industry |
| **Integrity Yield** | Composite | The computed composite score and its components |

Each asset card shows:
- An icon and name
- **Configured** badge with "Updated X days ago" if the asset exists
- **Set Up** badge with the layer name if the asset does not yet exist
- Clicking any asset card navigates to Context Assets filtered to that asset type

The **Manage Assets** button in the section header navigates directly to the Context Assets page.

### Recommended Actions

When the `integrity_yield` Context Asset contains an `action_items` array, those items appear as prioritized action cards at the bottom of the dashboard. Each shows a title, description, and priority level (high or medium).

### Refreshing Data

1. Click the **Refresh** button in the page header
2. The button shows a spinning loader while data reloads
3. All scores, indicators, and asset statuses update from the latest Context Asset data
4. The button re-enables when the refresh completes

---

## Tips for Best Results

### Building Your Foundation
- Start with Bright Lines and Values Map -- these are the foundation layer
- Be honest about stress values; document actual behavior, not aspirational goals
- All integrity data lives in Context Assets -- the dashboard is a read-only view

### Maintaining the System
- Update the Close Call Log whenever a near-miss occurs
- Review and update Bright Lines quarterly as your organization evolves
- Refresh the Industry Baseline annually with current industry data
- Keep Intervention Metrics current as your oversight processes change

### Using Insights
- Share the Integrity Yield score with leadership as a governance metric
- Use component scores to identify which pillar needs the most attention
- Track trends over time to demonstrate ethics investment ROI
- Watch leading indicators for early signs of drift

### Soul Configuration Integration
- The setup wizard links directly to the Soul Configuration Wizard for defining organizational values
- Soul-based integrity metrics can supplement the Context Asset-based data when an organization ID is available

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Dashboard shows the setup wizard instead of scores** | No `integrity_yield` Context Asset exists yet. Follow the Quick Start Guide steps to create your foundation assets, then create the `integrity_yield` asset with your composite score data. |
| **Scores are all showing zero** | Assets exist but their `content_json` lacks score data. Open each asset in Context Assets and populate the score fields (e.g., `composite_score`, `components`, `leading_indicators`). |
| **Asset cards all show "Set Up"** | No integrity-related Context Assets have been created. Click each card to navigate to Context Assets and create the corresponding asset type. |
| **Indicators say "No indicators configured yet"** | The `integrity_yield` asset does not contain a `leading_indicators` array. Edit the asset in Context Assets and add indicator objects with `indicator`, `status`, and `note` fields. |
| **Refresh button does not update data** | Check browser console for network errors. Verify the Context Assets API (`/api/context/assets`) is accessible and returning data. |
| **Page loads but shows empty content** | A network error occurred while checking for assets. The page falls back to the empty state on any fetch failure. Check your connection and try refreshing. |

---

## Related Documentation

| Document | Description | Location |
|----------|-------------|----------|
| Context Guide | Managing integrity and other context assets | [context-user-guide.md](./context-user-guide.md) |
| Soul Configuration Guide | Defining organizational values and bright lines | [soul-configuration-user-guide.md](./soul-configuration-user-guide.md) |
| Dashboard Guide | Platform overview dashboard | [dashboard-user-guide.md](./dashboard-user-guide.md) |
| Governance Guide | Strategy health monitoring | [governance-user-guide.md](./governance-user-guide.md) |
