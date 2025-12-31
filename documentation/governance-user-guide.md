# Strategy Governance User Guide

**For:** Insight 360 Users
**Last Updated:** December 30, 2025

---

## Why Governance Is Important

Strategy without governance becomes drift. Governance provides the monitoring and feedback loop that keeps your organization aligned with strategic intent over time.

Key benefits:
- **Early warning**: Detect alignment issues before they become problems
- **Accountability**: Track observations and recommendations
- **Trend analysis**: See how health scores evolve
- **Automated monitoring**: Schedule regular health checks

---

## What It Does

The Governance Dashboard provides:

| Feature | Description |
|---------|-------------|
| **Health Scores** | Alignment, Execution, and Learning metrics |
| **Observations** | Issues detected in your strategy |
| **Recommendations** | Actionable items to improve health |
| **Trend Charts** | Historical score visualization |
| **Automation** | Scheduled health check generation |

---

## Step by Step Use

### Viewing Current Health

1. Navigate to **Strategy Governance** in the sidebar
2. View the four score cards at the top:
   - **Alignment Score**: OKR-to-objective linkage
   - **Execution Score**: Progress against targets
   - **Learning Score**: Improvement and adaptation
   - **Overall Health**: Combined weighted average
3. Each card shows:
   - Current score (0-100%)
   - Trend indicator (up/down/stable)
   - Comparison to prior period

### Understanding Score Meanings

| Score Range | Interpretation | Action |
|-------------|----------------|--------|
| **80-100%** | Strong | Maintain current practices |
| **60-79%** | Adequate | Monitor and optimize |
| **40-59%** | Gaps | Active improvement needed |
| **0-39%** | Critical | Immediate attention required |

### Generating a Health Check

1. Click **Generate Health Check** button
2. Wait for analysis to complete
3. View updated scores and insights
4. Review observations and recommendations

**When to Generate:**
- Before strategic planning sessions
- After significant organizational changes
- When you notice alignment issues
- Monthly for routine monitoring

### Reviewing Observations

1. Find the **Observations** panel
2. Each observation shows:
   - **Type**: Drift, Overload, Gap, or Conflict
   - **Severity**: High, Medium, or Low
   - **Description**: What the system detected
3. High severity items appear first
4. Address observations proactively

**Observation Types:**
| Type | Meaning |
|------|---------|
| **Drift** | Strategy diverging from intent |
| **Overload** | Too many priorities or goals |
| **Gap** | Missing coverage in key areas |
| **Conflict** | Competing or contradictory goals |

### Acting on Recommendations

1. Find the **Recommendations** panel
2. Each recommendation shows:
   - Action to take
   - Priority level
   - Category
3. Click the checkbox to mark as completed
4. Completed items are tracked for audit

**Working Through Recommendations:**
- Start with high priority items
- Assign owners to each action
- Set target completion dates
- Review progress weekly

### Analyzing Trends

1. View the **Score Trend** chart
2. See up to 12 historical data points
3. Three bars per period:
   - Blue: Alignment
   - Green: Execution
   - Purple: Learning
4. Identify patterns and anomalies

**What to Look For:**
- Declining scores over multiple periods
- Divergence between score types
- Correlation with organizational events

### Viewing Health Check History

1. Find the **Health Check History** panel
2. See all past health checks
3. Each entry shows:
   - Date of check
   - Check type (weekly/monthly/adhoc)
   - Individual scores
4. Click to view detailed results

### Configuring Automated Checks

1. Find the **Automated Health Checks** section
2. Toggle options:
   - **Weekly**: Runs every Monday
   - **Monthly**: Runs 1st of each month
3. Enabled checks run automatically
4. Results appear in history

---

## Health Score Components

### Alignment Score (30% weight)
Measures how well OKRs connect to strategic objectives:
- % of OKRs with strategic links
- Quality of link descriptions
- Coverage across objectives

### Execution Score (40% weight)
Measures progress and delivery:
- OKR progress percentages
- On-time completion rates
- Status distribution

### Learning Score (30% weight)
Measures adaptation and improvement:
- Feedback incorporation
- Objective updates
- Strategy refinement actions

---

## Tips for Best Results

### Regular Monitoring
- Generate health checks weekly
- Review trends monthly
- Deep-dive quarterly

### Acting on Insights
- Don't ignore low scores
- Address observations promptly
- Complete recommendations systematically

### Building Culture
- Share health scores with teams
- Celebrate improvements
- Use data in planning sessions

---

## Related Documentation

| Document | Description | Location |
|----------|-------------|----------|
| Strategy Guide | Build your strategic framework | [strategy-user-guide.md](./strategy-user-guide.md) |
| Parthenon Guide | Manage OKRs and processes | [parthenon-user-guide.md](./parthenon-user-guide.md) |
| Dashboard Guide | System overview | [dashboard-user-guide.md](./dashboard-user-guide.md) |

---

## Troubleshooting

**Scores showing as "--":**
- No health check generated yet
- Click Generate Health Check
- Verify strategic foundation exists

**Generate button not working:**
- Ensure you have a strategic foundation
- Complete S2E setup first
- Check network connectivity

**Observations not updating:**
- Generate a new health check
- Refresh the page
- Check for API errors

**Automated checks not running:**
- Verify toggles are enabled
- Check system scheduling status
- Review error logs
