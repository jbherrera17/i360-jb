# Insight 360 Visualization System

**Version:** 2.0.0
**Date:** January 17, 2026

The Visualization System provides comprehensive chart generation capabilities for data visualization across Insight 360. This guide covers all chart types, API endpoints, and frontend integration.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Chart Types](#chart-types)
4. [API Reference](#api-reference)
5. [Frontend Integration](#frontend-integration)
6. [Examples](#examples)

---

## Overview

The visualization system supports:
- **Bar Charts** - Vertical, horizontal, stacked, grouped
- **Line Charts** - Basic, area, multi-line, trend with target
- **Pie Charts** - Standard pie charts with percentages
- **Donut Charts** - Pie charts with center cutout
- **Combo Charts** - Mixed bar and line charts
- **Radar Charts** - Multi-dimensional comparisons

All charts can be generated as:
- **QuickChart.io URLs** - Embeddable images for markdown/reports
- **Chart.js Configurations** - Interactive charts for the UI

---

## Quick Start

### Backend (Node.js)

```javascript
const chartService = require('./services/chartService');

// Generate a bar chart
const chart = chartService.generateBarChart({
    title: 'Monthly Sales',
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    datasets: [{
        label: 'Revenue',
        data: [100, 120, 115, 140]
    }]
});

// Get the embeddable URL
console.log(chart.chartUrl);

// Get Chart.js config for frontend
console.log(chart.chartConfig);
```

### Frontend (JavaScript)

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="/js/charts/chartRenderer.js"></script>

<div id="myChart" style="width: 600px; height: 400px;"></div>

<script>
// Direct rendering
ChartRenderer.barChart('myChart', {
    title: 'Monthly Sales',
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    datasets: [{
        label: 'Revenue',
        data: [100, 120, 115, 140]
    }]
});

// Or fetch from API
ChartRenderer.fetchBarChart('myChart', {
    title: 'Monthly Sales',
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    datasets: [{ label: 'Revenue', data: [100, 120, 115, 140] }]
});
</script>
```

### API (cURL)

```bash
curl -X POST http://localhost:3000/api/visualizations/bar \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Monthly Sales",
    "labels": ["Jan", "Feb", "Mar", "Apr"],
    "datasets": [{"label": "Revenue", "data": [100, 120, 115, 140]}]
  }'
```

---

## Chart Types

### Bar Charts

Best for: Comparing categories, showing rankings, period comparisons.

#### Basic Bar Chart
```javascript
chartService.generateBarChart({
    title: 'Sales by Region',
    labels: ['North', 'South', 'East', 'West'],
    datasets: [{
        label: 'Q4 Sales',
        data: [120, 90, 110, 80]
    }]
});
```

#### Horizontal Bar Chart
```javascript
chartService.generateBarChart({
    title: 'Employee Performance',
    labels: ['Alice', 'Bob', 'Charlie', 'Diana'],
    datasets: [{ label: 'Score', data: [95, 87, 92, 88] }],
    orientation: 'horizontal'
});
```

#### Stacked Bar Chart
```javascript
chartService.generateBarChart({
    title: 'Revenue by Product',
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
        { label: 'Product A', data: [40, 45, 50, 55] },
        { label: 'Product B', data: [30, 35, 30, 40] },
        { label: 'Product C', data: [20, 25, 30, 25] }
    ],
    stacked: true
});
```

#### Grouped Comparison
```javascript
chartService.generateGroupedBar({
    title: 'Year over Year',
    periods: ['Q1', 'Q2', 'Q3', 'Q4'],
    metrics: [
        { name: '2024', values: [100, 120, 115, 140] },
        { name: '2023', values: [90, 100, 105, 120] }
    ]
});
```

---

### Line Charts

Best for: Trends over time, continuous data, comparisons across time.

#### Basic Line Chart
```javascript
chartService.generateLineChart({
    title: 'Website Traffic',
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
        label: 'Visitors',
        data: [1200, 1400, 1100, 1600, 1800, 2200, 1900]
    }],
    smooth: true,
    showPoints: true
});
```

#### Multi-Line Comparison
```javascript
chartService.generateLineChart({
    title: 'Traffic Sources',
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
        { label: 'Organic', data: [400, 450, 500, 550, 600, 650] },
        { label: 'Paid', data: [200, 250, 300, 280, 350, 400] },
        { label: 'Social', data: [100, 120, 150, 180, 200, 250] }
    ]
});
```

#### Area Chart
```javascript
chartService.generateAreaChart({
    title: 'Revenue Over Time',
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [{
        label: 'Revenue ($K)',
        data: [100, 120, 115, 130, 145]
    }]
});
```

#### Trend with Target
```javascript
chartService.generateTrendChart({
    title: 'Monthly KPI Progress',
    periods: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    values: [85, 88, 92, 90, 95, 97],
    target: 90,
    metricName: 'Customer Satisfaction (%)'
});
```

---

### Pie Charts

Best for: Part-to-whole relationships, proportions, distributions.

#### Basic Pie Chart
```javascript
chartService.generatePieChart({
    title: 'Market Share',
    labels: ['Company A', 'Company B', 'Company C', 'Others'],
    data: [45, 25, 20, 10],
    showPercentages: true
});
```

#### Custom Colors
```javascript
chartService.generatePieChart({
    title: 'Budget Allocation',
    labels: ['Marketing', 'R&D', 'Operations', 'Sales'],
    data: [30, 25, 25, 20],
    colors: [
        'rgba(99, 102, 241, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)'
    ]
});
```

---

### Donut Charts

Best for: Same as pie, but with center text for total/summary.

#### Basic Donut
```javascript
chartService.generateDonutChart({
    title: 'Resource Allocation',
    labels: ['Development', 'Design', 'Marketing', 'Support'],
    data: [40, 20, 25, 15],
    cutout: 60
});
```

#### With Center Text
```javascript
chartService.generateDonutChart({
    title: 'Budget Spent',
    labels: ['Used', 'Remaining'],
    data: [75000, 25000],
    cutout: 70,
    centerText: '$75K'
});
```

---

### Combo Charts

Best for: Showing relationship between different metrics (e.g., revenue and growth rate).

```javascript
chartService.generateComboChart({
    title: 'Revenue vs Growth Rate',
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    barDatasets: [{
        label: 'Revenue ($M)',
        data: [100, 120, 130, 150]
    }],
    lineDatasets: [{
        label: 'Growth Rate (%)',
        data: [10, 20, 8, 15]
    }]
});
```

---

## API Reference

### Base URL
```
/api/visualizations
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bar` | Generate bar chart |
| POST | `/bar/comparison` | Generate comparison bar chart |
| POST | `/bar/grouped` | Generate grouped bar chart |
| POST | `/line` | Generate line chart |
| POST | `/line/area` | Generate area chart |
| POST | `/line/trend` | Generate trend chart with target |
| POST | `/pie` | Generate pie chart |
| POST | `/donut` | Generate donut chart |
| POST | `/combo` | Generate combo chart |
| POST | `/auto` | Auto-detect chart type |
| POST | `/radar` | Generate radar chart |
| POST | `/tech-radar` | Generate technology radar |
| POST | `/capability` | Generate capability comparison |
| POST | `/risk` | Generate risk radar |
| GET | `/chart-types` | List available chart types |
| GET | `/colors` | Get color palettes |

### Response Format

All endpoints return:
```json
{
    "success": true,
    "data": {
        "title": "Chart Title",
        "labels": [...],
        "datasets": [...],
        "chartUrl": "https://quickchart.io/chart?c=...",
        "chartConfig": { /* Chart.js config */ }
    }
}
```

### Bar Chart Request

```json
POST /api/visualizations/bar
{
    "title": "Chart Title",
    "labels": ["Label1", "Label2", "Label3"],
    "datasets": [
        {
            "label": "Dataset Name",
            "data": [10, 20, 30]
        }
    ],
    "orientation": "vertical",  // or "horizontal"
    "stacked": false,
    "showValues": false,
    "width": 600,
    "height": 400
}
```

### Line Chart Request

```json
POST /api/visualizations/line
{
    "title": "Chart Title",
    "labels": ["Jan", "Feb", "Mar"],
    "datasets": [
        {
            "label": "Series 1",
            "data": [10, 20, 15],
            "fill": false
        }
    ],
    "smooth": true,
    "showPoints": true,
    "yAxis": {
        "min": 0,
        "max": 100,
        "label": "Value"
    }
}
```

### Pie/Donut Chart Request

```json
POST /api/visualizations/pie
{
    "title": "Distribution",
    "labels": ["A", "B", "C", "D"],
    "data": [25, 35, 20, 20],
    "showPercentages": true
}

POST /api/visualizations/donut
{
    "title": "Budget",
    "labels": ["Used", "Remaining"],
    "data": [75, 25],
    "cutout": 60,
    "centerText": "75%"
}
```

### Combo Chart Request

```json
POST /api/visualizations/combo
{
    "title": "Revenue vs Growth",
    "labels": ["Q1", "Q2", "Q3", "Q4"],
    "barDatasets": [
        { "label": "Revenue", "data": [100, 120, 130, 150] }
    ],
    "lineDatasets": [
        { "label": "Growth %", "data": [10, 20, 8, 15] }
    ]
}
```

---

## Frontend Integration

### Include Dependencies

```html
<!-- Chart.js (required) -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<!-- Chart Renderer -->
<script src="/js/charts/chartRenderer.js"></script>

<!-- Optional: Radar Chart Component -->
<script src="/js/charts/radarChart.js"></script>
```

### ChartRenderer API

#### Direct Rendering

```javascript
// Bar chart
ChartRenderer.barChart('containerId', {
    title: 'Sales',
    labels: ['A', 'B', 'C'],
    datasets: [{ label: 'Values', data: [10, 20, 30] }]
});

// Line chart
ChartRenderer.lineChart('containerId', {
    title: 'Trend',
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [{ label: 'Sales', data: [100, 120, 115] }]
});

// Pie chart
ChartRenderer.pieChart('containerId', {
    title: 'Share',
    labels: ['A', 'B', 'C'],
    data: [40, 35, 25]
});

// Donut chart
ChartRenderer.donutChart('containerId', {
    title: 'Budget',
    labels: ['Used', 'Free'],
    data: [75, 25],
    cutout: 60
});

// Area chart
ChartRenderer.areaChart('containerId', {
    title: 'Revenue',
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [{ label: 'Revenue', data: [100, 120, 130, 150] }]
});

// Combo chart
ChartRenderer.comboChart('containerId', {
    title: 'Performance',
    labels: ['Jan', 'Feb', 'Mar'],
    barDatasets: [{ label: 'Sales', data: [100, 120, 110] }],
    lineDatasets: [{ label: 'Target', data: [110, 110, 110] }]
});
```

#### API-Backed Rendering

```javascript
// Fetch and render
await ChartRenderer.fetchBarChart('containerId', {
    title: 'Sales',
    labels: ['A', 'B', 'C'],
    datasets: [{ label: 'Values', data: [10, 20, 30] }]
});

// Manual fetch
const data = await ChartRenderer.fetchChart('/api/visualizations/pie', {
    title: 'Share',
    labels: ['A', 'B', 'C'],
    data: [40, 35, 25]
});
ChartRenderer.renderFromApi('containerId', data);
```

#### Utility Functions

```javascript
// Create container
const container = ChartRenderer.createContainer({
    width: 500,
    height: 400,
    id: 'myChart'
});
document.body.appendChild(container);

// Update chart data
ChartRenderer.update('myChart', {
    labels: ['New', 'Labels'],
    datasets: [{ label: 'New', data: [50, 60] }]
});

// Destroy chart
ChartRenderer.destroy('myChart');

// Get embed URL
const url = ChartRenderer.getEmbedUrl(chartConfig, 800, 600);
```

---

## Examples

### Dashboard Card with Donut

```html
<div class="dashboard-card">
    <h3>Budget Status</h3>
    <div id="budgetChart"></div>
</div>

<script>
ChartRenderer.donutChart('budgetChart', {
    labels: ['Spent', 'Remaining'],
    data: [65000, 35000],
    cutout: 70
});
</script>
```

### Trend Analysis

```html
<div id="trendChart" style="width: 100%; max-width: 800px;"></div>

<script>
async function loadTrend() {
    const response = await fetch('/api/visualizations/line/trend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: 'Revenue Trend',
            periods: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            values: [100, 120, 115, 130, 145, 160],
            target: 125,
            metricName: 'Revenue ($K)'
        })
    });
    const result = await response.json();
    ChartRenderer.renderFromApi('trendChart', result.data);
}
loadTrend();
</script>
```

### Embedding in Markdown/Reports

Use the `chartUrl` from any API response to embed charts in markdown:

```markdown
## Q4 Performance Report

![Revenue by Region](https://quickchart.io/chart?c=...)

The chart above shows regional revenue distribution for Q4 2025.
```

---

## Best Practices

1. **Choose the right chart type:**
   - Bar: Categories, rankings
   - Line: Trends, time series
   - Pie/Donut: Proportions (max 6-7 segments)
   - Combo: Dual metrics with different scales

2. **Keep it simple:**
   - Limit datasets to 3-4 per chart
   - Use clear, concise labels
   - Include a descriptive title

3. **Accessibility:**
   - Use colorblind-friendly palettes
   - Include data tables alongside charts
   - Add alt text to embedded images

4. **Performance:**
   - Destroy charts when removing from DOM
   - Use QuickChart URLs for static reports
   - Use Chart.js for interactive dashboards

---

*Documentation updated January 17, 2026*
