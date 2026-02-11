# Integrity Dashboard User Guide

**For:** Insight 360 Users
**Last Updated:** Tuesday, February 10, 2026

---

## Why Integrity Is Important

The Integrity Dashboard serves two purposes: it provides **system health monitoring** for your Insight 360 platform and enables **organizational ethics measurement** through the Integrity Yield framework. Together, these help you:

- **Monitor system health**: Track component uptime, alerts, and incidents
- **Measure ethics posture**: Quantify organizational integrity through the Integrity Yield score
- **Early warning**: Detect system issues and ethics drift through indicators
- **Incident response**: Track and resolve system incidents systematically

---

## What It Does

The Integrity Dashboard provides:

| Feature | Description |
|---------|-------------|
| **System Health** | Monitor platform component health and uptime |
| **Alerts** | View and manage system alerts by severity |
| **Incidents** | Track incident lifecycle from detection to resolution |
| **Integrity Yield** | Composite score measuring organizational ethics health (when configured) |
| **Component Scores** | Four pillars of integrity measurement (when configured) |
| **Indicators** | Leading warning signals for proactive management |
| **Asset Status** | Track required data sources for ethics measurement |

---

## Step by Step Use

### Understanding the Dashboard

1. Navigate to **Integrity** in the sidebar
2. If integrity assets are configured, you'll see the full ethics dashboard
3. If new, you'll see the setup wizard with a Quick Start Guide
4. The system health features are always available

### System Health Monitoring

The backend provides real-time system health data:

**Viewing Component Health:**
1. Component health scores track platform service uptime
2. Alerts are categorized by severity: Critical, Error, Warning, Info
3. Health checks record metrics against configured thresholds

**Managing Alerts:**
- View active alerts for system components
- Acknowledge alerts to indicate they're being addressed
- Resolve alerts when the issue is fixed

**Tracking Incidents:**
- Incidents track major system issues through their lifecycle
- Status progression: Investigating → Identified → Resolved
- Each incident includes impact assessment and updates

### The Integrity Yield Score

When ethics assets are configured, the central metric is the **Integrity Yield** (0-100):

| Score | Interpretation | Status |
|-------|----------------|--------|
| **80-100** | Strong Integrity Posture | Excellent |
| **60-79** | Adequate with Opportunities | Good |
| **40-59** | Significant Gaps | Needs Work |
| **0-39** | Critical Attention Needed | Urgent |

**Score Components:**
- Trust Velocity (30%) - Are stakeholder relationships compounding or eroding?
- Intervention Effectiveness (25%) - How well does human oversight work?
- Alignment Audit (25%) - Do stated values match stress values?
- Counterfactual Value (20%) - What's the ROI on integrity investments?

**Note:** The Integrity Yield score is calculated from data stored in Context Assets. You must configure the foundation assets before scores will populate.

### Setting Up Ethics Measurement

**Step 1: Define Bright Lines**
1. Click **Configure** on the Bright Lines card
2. You'll be redirected to Context Assets to create a `bright_lines` asset
3. Document your non-negotiable boundaries
4. Examples: "No misleading customers", "No safety shortcuts"

**Step 2: Map Your Values**
1. Click **Configure** on the Values Map card
2. Creates a `values_map` context asset
3. Document stated values (what you claim)
4. Document stress values (what you do under pressure)
5. Identify gaps between them

**Step 3: Start the Close Call Log**
1. Click **Start Log** on the Close Call card
2. Creates a `close_call_log` context asset
3. Document near-misses and interventions
4. Record what could have gone wrong and who intervened

**Step 4: Research Industry Baseline**
1. Click **Research** on the Industry Baseline card
2. Creates an `industry_baseline` context asset
3. Document industry incidents and failures
4. Quantify costs of ethical lapses for comparison

**Note:** These assets are managed through the Context Assets module. The Integrity Dashboard reads from them to calculate scores and display indicators.

### Viewing Component Scores

Each of the four components measures different aspects:

**Trust Velocity:** Are relationships compounding or eroding? Positive velocity = building trust.

**Intervention Effectiveness:** How well does human oversight work? High score = interventions are catching issues.

**Alignment Audit:** Do stated values match behavior under pressure? High score = walk matches talk.

**Counterfactual Value:** What's the ROI on integrity investments? Quantifies the value of "nothing went wrong."

### Monitoring Indicators

**Leading Indicators** (Early Warning):
- These predict future integrity issues
- Green = healthy signal
- Yellow = watch carefully
- Red = immediate attention

### Tracking Asset Status

The Assets grid shows data source health:
- **Configured** = Data is available and populated
- **Set Up** = Needs configuration (click to create in Context Assets)
- Last updated timestamp shows freshness

**Required Assets:**
| Asset | Purpose |
|-------|---------|
| Bright Lines | Define non-negotiable boundaries |
| Values Map | Document stated vs stress values |
| Intervention Metrics | Track human oversight effectiveness |
| Trust Velocity | Measure relationship trends |
| Close Call Log | Record near-misses |
| Industry Baseline | External comparison data |
| Integrity Yield | Composite calculation result |

### Refreshing Data

1. Click **Refresh** button in header
2. Waits for data reload from Context Assets
3. All scores and indicators update
4. Asset timestamps refresh

---

## Tips for Best Results

### Building Foundation
- Start with Bright Lines and Values Map
- Be honest about stress values
- Document actual behavior, not aspirational
- All ethics data is managed through Context Assets

### Maintaining the System
- Update Close Call Log regularly
- Review Bright Lines quarterly
- Refresh Industry Baseline annually
- Monitor system alerts daily

### Using Insights
- Share scores with leadership
- Use in strategic planning
- Track trends over time
- Celebrate improvements

---

## Related Documentation

| Document | Description | Location |
|----------|-------------|----------|
| Context Guide | Managing integrity assets | [context-user-guide.md](./context-user-guide.md) |
| Dashboard Guide | System overview | [dashboard-user-guide.md](./dashboard-user-guide.md) |
| Governance Guide | Strategy health | [governance-user-guide.md](./governance-user-guide.md) |
| Soul Configuration | Organizational values | [soul-configuration-user-guide.md](./soul-configuration-user-guide.md) |

---

## Troubleshooting

**Dashboard shows setup wizard:**
- No integrity assets configured yet
- Follow the Quick Start Guide steps
- Configure required assets through Context Assets module

**Scores showing zero:**
- Assets exist but lack data
- Review and populate asset content in Context Assets
- Ensure all four component data sources have values

**System alerts not showing:**
- Check that the integrity API is running
- Verify database connectivity
- Refresh the page

**Assets not loading:**
- Check network connectivity
- Verify the Context Assets API is accessible
- Refresh the page

**Indicators not appearing:**
- Requires the Integrity Yield context asset to be configured
- Configure all foundation assets first
- Populate the composite calculation data
