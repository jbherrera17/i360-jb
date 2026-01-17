# Radar Chart Visualization - Agent Integration Guide

This guide explains how to integrate radar chart visualizations into any Insight 360 agent.

## Overview

The radar chart system provides three integration methods:
1. **QuickChart URL** - Embed a chart image URL in markdown (works everywhere)
2. **Chart.js Config** - Rich interactive charts in the Insight 360 UI
3. **API Endpoint** - Generate charts server-side

---

## Method 1: Agent Prompt Instructions (Recommended)

Add these instructions to any agent's system prompt to enable radar chart output:

### For Technology Assessment Agents

```markdown
## VISUALIZATION OUTPUT

When providing assessments, include a radar chart visualization using this format:

### Chart Data Block

After your analysis, output a JSON code block with chart data:

\`\`\`json
{
  "radar_chart": {
    "type": "radar",
    "data": {
      "labels": ["Maturity", "Relevance", "Capability", "Low Risk"],
      "datasets": [{
        "label": "[Technology Name]",
        "data": [MATURITY_SCORE, RELEVANCE_SCORE, 5-CAPABILITY_GAP, 5-RISK_SCORE]
      }]
    },
    "options": {
      "scales": { "r": { "beginAtZero": true, "max": 5 } }
    }
  }
}
\`\`\`

### Or use QuickChart URL

Include an embedded image:

![Technology Assessment](https://quickchart.io/chart?c={type:'radar',data:{labels:['Maturity','Relevance','Capability','Low Risk'],datasets:[{data:[4,5,3,4]}]}}&w=400&h=400)
```

### For Capability Comparison Agents

```markdown
## VISUALIZATION OUTPUT

For capability comparisons, output:

\`\`\`json
{
  "radar_chart": {
    "type": "radar",
    "data": {
      "labels": ["Dimension1", "Dimension2", "Dimension3", "Dimension4"],
      "datasets": [
        { "label": "Entity A", "data": [4, 3, 5, 2] },
        { "label": "Entity B", "data": [3, 5, 2, 4] }
      ]
    }
  }
}
\`\`\`
```

---

## Method 2: API Integration

### Generate Technology Radar

```javascript
// POST /api/visualizations/tech-radar
const response = await fetch('/api/visualizations/tech-radar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        name: 'Claude 3.5 Sonnet',
        maturity: 4,
        relevance: 5,
        capabilityGap: 2,
        riskProfile: 2,
        ring: 'adopt',
        quadrant: 'ai_ml',
        format: 'all'  // Returns URL, config, ASCII, and markdown
    })
});

const { data } = await response.json();
// data.chartUrl - QuickChart URL
// data.chartConfig - Chart.js config object
// data.asciiChart - ASCII representation
// data.markdown - Complete markdown section
```

### Generate Capability Comparison

```javascript
// POST /api/visualizations/capability
const response = await fetch('/api/visualizations/capability', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        title: 'LLM Comparison',
        dimensions: ['Speed', 'Accuracy', 'Cost', 'Context', 'Multimodal'],
        entities: [
            { name: 'Claude', scores: { Speed: 4, Accuracy: 5, Cost: 3, Context: 5, Multimodal: 4 } },
            { name: 'GPT-4', scores: { Speed: 3, Accuracy: 5, Cost: 2, Context: 4, Multimodal: 5 } }
        ]
    })
});
```

### Process Agent Output

```javascript
// POST /api/visualizations/process
// Automatically detects chart type from agent's JSON output
const response = await fetch('/api/visualizations/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agentJsonOutput)
});
```

---

## Method 3: Frontend JavaScript

### Render Chart in Container

```javascript
// Include Chart.js and radarChart.js
RadarChart.render('myContainer', {
    title: 'Assessment',
    data: {
        labels: ['Maturity', 'Relevance', 'Capability', 'Low Risk'],
        datasets: [{
            label: 'Technology X',
            data: [4, 5, 3, 4]
        }]
    },
    max: 5
});
```

### Render Technology Assessment

```javascript
RadarChart.renderTechRadar('container', {
    name: 'LangChain',
    maturity: 3,
    relevance: 5,
    capabilityGap: 3,
    riskProfile: 2
});
```

### Auto-detect Charts in Chat

```javascript
// Initialize once after page load
RadarChart.init('#chatMessages');

// Charts in agent responses are automatically rendered
```

---

## Complete Agent Prompt Example

Here's a complete agent prompt with radar visualization:

```markdown
# Technology Assessment Agent

You are a technology analyst who evaluates emerging technologies for enterprise adoption.

## YOUR TASK

When asked to assess a technology, provide:
1. Executive summary
2. Detailed analysis across 4 dimensions
3. Radar visualization
4. Recommendation

## ASSESSMENT DIMENSIONS

Score each dimension from 1-5:
- **Maturity**: Production readiness, stability, ecosystem
- **Relevance**: Strategic fit, use case alignment
- **Capability Gap**: Internal readiness (5 = ready, 1 = major gap)
- **Risk Profile**: Overall risk level (5 = high risk, 1 = low risk)

## OUTPUT FORMAT

### 1. Summary
[2-3 sentences]

### 2. Assessment Scores
| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Maturity | X/5 | [reason] |
| Relevance | X/5 | [reason] |
| Capability Gap | X/5 | [reason] |
| Risk Profile | X/5 | [reason] |

### 3. Radar Visualization

\`\`\`json
{
  "radar_chart": {
    "type": "radar",
    "data": {
      "labels": ["Maturity", "Relevance", "Capability", "Low Risk"],
      "datasets": [{
        "label": "[TECHNOLOGY_NAME]",
        "data": [MATURITY, RELEVANCE, 5-CAPABILITY_GAP, 5-RISK]
      }]
    },
    "options": {
      "scales": { "r": { "beginAtZero": true, "max": 5 } },
      "plugins": { "title": { "display": true, "text": "Technology Assessment: [NAME]" } }
    }
  }
}
\`\`\`

### 4. Recommendation
**Position**: [ADOPT / TRIAL / ASSESS / HOLD]
[Rationale and next steps]
```

---

## API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/visualizations/radar` | POST | Generic radar chart |
| `/api/visualizations/tech-radar` | POST | Technology assessment radar |
| `/api/visualizations/capability` | POST | Capability comparison |
| `/api/visualizations/risk` | POST | Risk assessment radar |
| `/api/visualizations/process` | POST | Auto-detect from agent output |
| `/api/visualizations/colors` | GET | Available color palettes |
| `/api/visualizations/tech-radar/options` | GET | Ring and quadrant options |

---

## Styling

Charts automatically adapt to light/dark theme. Custom styling available via CSS:

```css
.radar-chart-container {
    max-width: 500px;
    margin: 20px auto;
}

.radar-position-badge.adopt { color: var(--success); }
.radar-position-badge.trial { color: var(--primary); }
.radar-position-badge.assess { color: var(--warning); }
.radar-position-badge.hold { color: var(--danger); }
```

---

## Files

- **Backend Service**: `server/services/radarChartService.js`
- **API Routes**: `server/routes/visualizations.js`
- **Frontend Component**: `public/js/charts/radarChart.js`
- **Styles**: `public/css/styles.css` (radar chart section)
