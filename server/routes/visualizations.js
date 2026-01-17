/**
 * INSIGHT 360 - Visualization API Routes
 * Version: 2.0.0
 *
 * Endpoints for generating charts and visualizations:
 *
 * RADAR CHARTS:
 * - POST /api/visualizations/radar - Generate radar chart
 * - POST /api/visualizations/tech-radar - Generate technology assessment radar
 * - POST /api/visualizations/capability - Generate capability comparison
 * - POST /api/visualizations/risk - Generate risk assessment radar
 *
 * BAR CHARTS:
 * - POST /api/visualizations/bar - Generate bar chart
 * - POST /api/visualizations/bar/comparison - Generate comparison bar chart
 * - POST /api/visualizations/bar/grouped - Generate grouped bar chart
 *
 * LINE CHARTS:
 * - POST /api/visualizations/line - Generate line chart
 * - POST /api/visualizations/line/area - Generate area chart
 * - POST /api/visualizations/line/trend - Generate trend chart with target
 *
 * PIE/DONUT CHARTS:
 * - POST /api/visualizations/pie - Generate pie chart
 * - POST /api/visualizations/donut - Generate donut chart
 *
 * COMBO CHARTS:
 * - POST /api/visualizations/combo - Generate bar + line combo chart
 *
 * UTILITIES:
 * - POST /api/visualizations/auto - Auto-detect chart type
 * - POST /api/visualizations/process - Process agent output for chart data
 * - GET /api/visualizations/colors - Get color palettes
 */

const express = require('express');
const router = express.Router();
const radarChartService = require('../services/radarChartService');
const chartService = require('../services/chartService');

/**
 * POST /api/visualizations/radar
 * Generate a generic radar chart
 *
 * Body:
 * {
 *   "title": "Chart Title",
 *   "labels": ["Label1", "Label2", ...],
 *   "datasets": [{ "label": "Dataset", "data": [1, 2, 3, ...] }],
 *   "max": 5,
 *   "format": "url" | "config" | "all"
 * }
 */
router.post('/radar', (req, res) => {
    try {
        const { title, labels, datasets, max = 5, format = 'all', width, height } = req.body;

        if (!labels || !datasets) {
            return res.status(400).json({
                success: false,
                error: 'labels and datasets are required'
            });
        }

        const result = {
            title,
            labels,
            datasets
        };

        if (format === 'url' || format === 'all') {
            result.chartUrl = radarChartService.generateQuickChartUrl({
                title,
                labels,
                datasets,
                max,
                width: width || 500,
                height: height || 500
            });
        }

        if (format === 'config' || format === 'all') {
            result.chartConfig = radarChartService.generateChartJsConfig({
                title,
                labels,
                datasets,
                max
            });
        }

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('Error generating radar chart:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/visualizations/tech-radar
 * Generate a technology assessment radar chart
 *
 * Body:
 * {
 *   "name": "Technology Name",
 *   "maturity": 4,
 *   "relevance": 5,
 *   "capabilityGap": 2,
 *   "riskProfile": 2,
 *   "ring": "adopt|trial|assess|hold",
 *   "quadrant": "ai_ml|platforms|languages|patterns",
 *   "comparison": { ... optional comparison data ... },
 *   "format": "url" | "config" | "ascii" | "all"
 * }
 */
router.post('/tech-radar', (req, res) => {
    try {
        const {
            name,
            maturity,
            relevance,
            capabilityGap,
            riskProfile,
            ring,
            quadrant,
            comparison,
            format = 'all'
        } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'name is required'
            });
        }

        // Validate scores are in range
        const validateScore = (score, field) => {
            if (score !== undefined && (score < 1 || score > 5)) {
                throw new Error(`${field} must be between 1 and 5`);
            }
        };

        validateScore(maturity, 'maturity');
        validateScore(relevance, 'relevance');
        validateScore(capabilityGap, 'capabilityGap');
        validateScore(riskProfile, 'riskProfile');

        const result = radarChartService.generateTechRadar(
            {
                name,
                maturity: maturity || 3,
                relevance: relevance || 3,
                capabilityGap: capabilityGap || 3,
                riskProfile: riskProfile || 3,
                ring,
                quadrant
            },
            comparison,
            format
        );

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('Error generating tech radar:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/visualizations/capability
 * Generate a capability comparison radar chart
 *
 * Body:
 * {
 *   "title": "Capability Comparison",
 *   "dimensions": ["Dimension1", "Dimension2", ...],
 *   "entities": [
 *     { "name": "Entity1", "scores": { "Dimension1": 4, "Dimension2": 3 } },
 *     { "name": "Entity2", "scores": { "Dimension1": 3, "Dimension2": 5 } }
 *   ],
 *   "format": "url" | "config" | "all"
 * }
 */
router.post('/capability', (req, res) => {
    try {
        const { title, dimensions, entities, format = 'all' } = req.body;

        if (!dimensions || !entities) {
            return res.status(400).json({
                success: false,
                error: 'dimensions and entities are required'
            });
        }

        if (!Array.isArray(entities) || entities.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'entities must be a non-empty array'
            });
        }

        const result = radarChartService.generateCapabilityRadar(
            { title, dimensions, entities },
            format
        );

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('Error generating capability radar:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/visualizations/risk
 * Generate a risk assessment radar chart
 *
 * Body:
 * {
 *   "title": "Risk Assessment",
 *   "risks": {
 *     "Technical Risk": 3,
 *     "Vendor Risk": 2,
 *     "Security Risk": 4,
 *     "Compliance Risk": 2
 *   },
 *   "format": "url" | "config" | "all"
 * }
 */
router.post('/risk', (req, res) => {
    try {
        const { title, risks, format = 'all' } = req.body;

        if (!risks || typeof risks !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'risks object is required'
            });
        }

        const result = radarChartService.generateRiskRadar(
            risks,
            title || 'Risk Assessment',
            format
        );

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('Error generating risk radar:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/visualizations/process
 * Process agent output and extract/generate chart data
 *
 * Body: Agent's structured JSON output
 *
 * Automatically detects:
 * - technology_radar outputs
 * - capability assessment outputs
 * - risk assessment outputs
 * - generic score-based outputs
 */
router.post('/process', (req, res) => {
    try {
        const agentOutput = req.body;

        if (!agentOutput || typeof agentOutput !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Agent output object is required'
            });
        }

        const result = radarChartService.processAgentOutput(agentOutput);

        if (!result) {
            return res.status(400).json({
                success: false,
                error: 'Could not extract chart data from agent output'
            });
        }

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('Error processing agent output:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/visualizations/colors
 * Get available color palettes
 */
router.get('/colors', (req, res) => {
    res.json({
        success: true,
        data: radarChartService.DEFAULT_COLORS
    });
});

/**
 * GET /api/visualizations/tech-radar/options
 * Get available technology radar options (rings and quadrants)
 */
router.get('/tech-radar/options', (req, res) => {
    res.json({
        success: true,
        data: {
            rings: radarChartService.TECH_RADAR_RINGS,
            quadrants: radarChartService.TECH_RADAR_QUADRANTS
        }
    });
});

// ============================================================================
// BAR CHART ENDPOINTS
// ============================================================================

/**
 * POST /api/visualizations/bar
 * Generate a bar chart
 *
 * Body:
 * {
 *   "title": "Chart Title",
 *   "labels": ["Jan", "Feb", "Mar"],
 *   "datasets": [{ "label": "Sales", "data": [100, 120, 150] }],
 *   "orientation": "vertical" | "horizontal",
 *   "stacked": false,
 *   "showValues": false
 * }
 */
router.post('/bar', (req, res) => {
    try {
        const { title, labels, datasets, orientation, stacked, showValues, width, height } = req.body;

        if (!labels || !datasets) {
            return res.status(400).json({
                success: false,
                error: 'labels and datasets are required'
            });
        }

        const result = chartService.generateBarChart({
            title,
            labels,
            datasets,
            orientation,
            stacked,
            showValues,
            width,
            height
        });

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('Error generating bar chart:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/visualizations/bar/comparison
 * Generate a comparison bar chart
 *
 * Body:
 * {
 *   "title": "Sales by Region",
 *   "categories": ["North", "South", "East", "West"],
 *   "data": { "North": 100, "South": 80, "East": 120, "West": 90 }
 * }
 */
router.post('/bar/comparison', (req, res) => {
    try {
        const { title, categories, data, color } = req.body;

        if (!categories || !data) {
            return res.status(400).json({
                success: false,
                error: 'categories and data are required'
            });
        }

        const result = chartService.generateComparisonBar({ title, categories, data, color });

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('Error generating comparison bar chart:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/visualizations/bar/grouped
 * Generate a grouped bar chart for period-over-period comparison
 *
 * Body:
 * {
 *   "title": "Quarterly Performance",
 *   "periods": ["Q1", "Q2", "Q3", "Q4"],
 *   "metrics": [
 *     { "name": "Revenue", "values": [100, 120, 110, 150] },
 *     { "name": "Expenses", "values": [80, 90, 85, 100] }
 *   ]
 * }
 */
router.post('/bar/grouped', (req, res) => {
    try {
        const { title, periods, metrics } = req.body;

        if (!periods || !metrics) {
            return res.status(400).json({
                success: false,
                error: 'periods and metrics are required'
            });
        }

        const result = chartService.generateGroupedBar({ title, periods, metrics });

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('Error generating grouped bar chart:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// LINE CHART ENDPOINTS
// ============================================================================

/**
 * POST /api/visualizations/line
 * Generate a line chart
 *
 * Body:
 * {
 *   "title": "Monthly Trends",
 *   "labels": ["Jan", "Feb", "Mar", "Apr", "May"],
 *   "datasets": [
 *     { "label": "2024", "data": [100, 120, 115, 130, 145] },
 *     { "label": "2023", "data": [90, 100, 95, 110, 120] }
 *   ],
 *   "smooth": true,
 *   "showPoints": true
 * }
 */
router.post('/line', (req, res) => {
    try {
        const { title, labels, datasets, smooth, showPoints, fill, yAxis, width, height } = req.body;

        if (!labels || !datasets) {
            return res.status(400).json({
                success: false,
                error: 'labels and datasets are required'
            });
        }

        const result = chartService.generateLineChart({
            title,
            labels,
            datasets,
            smooth,
            showPoints,
            fill,
            yAxis,
            width,
            height
        });

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('Error generating line chart:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/visualizations/line/area
 * Generate an area chart (filled line chart)
 *
 * Body: Same as /line
 */
router.post('/line/area', (req, res) => {
    try {
        const { title, labels, datasets, smooth, showPoints, yAxis, width, height } = req.body;

        if (!labels || !datasets) {
            return res.status(400).json({
                success: false,
                error: 'labels and datasets are required'
            });
        }

        const result = chartService.generateAreaChart({
            title,
            labels,
            datasets,
            smooth,
            showPoints,
            yAxis,
            width,
            height
        });

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('Error generating area chart:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/visualizations/line/trend
 * Generate a trend chart with optional target line
 *
 * Body:
 * {
 *   "title": "Revenue Trend",
 *   "periods": ["Jan", "Feb", "Mar", "Apr", "May"],
 *   "values": [100, 120, 115, 130, 145],
 *   "target": 125,
 *   "metricName": "Revenue ($K)"
 * }
 */
router.post('/line/trend', (req, res) => {
    try {
        const { title, periods, values, target, metricName } = req.body;

        if (!periods || !values) {
            return res.status(400).json({
                success: false,
                error: 'periods and values are required'
            });
        }

        const result = chartService.generateTrendChart({
            title,
            periods,
            values,
            target,
            metricName
        });

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('Error generating trend chart:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// PIE/DONUT CHART ENDPOINTS
// ============================================================================

/**
 * POST /api/visualizations/pie
 * Generate a pie chart
 *
 * Body:
 * {
 *   "title": "Market Share",
 *   "labels": ["Product A", "Product B", "Product C", "Others"],
 *   "data": [45, 25, 20, 10],
 *   "showPercentages": true
 * }
 */
router.post('/pie', (req, res) => {
    try {
        const { title, labels, data, colors, showPercentages, width, height } = req.body;

        if (!labels || !data) {
            return res.status(400).json({
                success: false,
                error: 'labels and data are required'
            });
        }

        const result = chartService.generatePieChart({
            title,
            labels,
            data,
            colors,
            showPercentages,
            width,
            height
        });

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('Error generating pie chart:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/visualizations/donut
 * Generate a donut chart
 *
 * Body:
 * {
 *   "title": "Budget Allocation",
 *   "labels": ["Marketing", "R&D", "Operations", "Sales"],
 *   "data": [30, 25, 25, 20],
 *   "cutout": 60,
 *   "centerText": "$1.2M"
 * }
 */
router.post('/donut', (req, res) => {
    try {
        const { title, labels, data, colors, showPercentages, cutout, centerText, width, height } = req.body;

        if (!labels || !data) {
            return res.status(400).json({
                success: false,
                error: 'labels and data are required'
            });
        }

        const result = chartService.generateDonutChart({
            title,
            labels,
            data,
            colors,
            showPercentages,
            cutout,
            centerText,
            width,
            height
        });

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('Error generating donut chart:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// COMBO CHART ENDPOINTS
// ============================================================================

/**
 * POST /api/visualizations/combo
 * Generate a bar + line combo chart
 *
 * Body:
 * {
 *   "title": "Revenue vs Growth Rate",
 *   "labels": ["Q1", "Q2", "Q3", "Q4"],
 *   "barDatasets": [
 *     { "label": "Revenue ($M)", "data": [100, 120, 130, 150] }
 *   ],
 *   "lineDatasets": [
 *     { "label": "Growth Rate (%)", "data": [10, 20, 8, 15] }
 *   ]
 * }
 */
router.post('/combo', (req, res) => {
    try {
        const { title, labels, barDatasets, lineDatasets, width, height } = req.body;

        if (!labels || (!barDatasets && !lineDatasets)) {
            return res.status(400).json({
                success: false,
                error: 'labels and at least one of barDatasets or lineDatasets are required'
            });
        }

        const result = chartService.generateComboChart({
            title,
            labels,
            barDatasets: barDatasets || [],
            lineDatasets: lineDatasets || [],
            width,
            height
        });

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('Error generating combo chart:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// AUTO-DETECT ENDPOINT
// ============================================================================

/**
 * POST /api/visualizations/auto
 * Auto-detect chart type based on data structure
 *
 * Body:
 * {
 *   "data": { ... chart data ... },
 *   "hint": "bar" | "line" | "pie" | "donut" | "area" | "trend" | "combo" (optional)
 * }
 */
router.post('/auto', (req, res) => {
    try {
        const { data, hint } = req.body;

        if (!data) {
            return res.status(400).json({
                success: false,
                error: 'data object is required'
            });
        }

        const result = chartService.autoGenerateChart(data, hint);

        if (!result) {
            return res.status(400).json({
                success: false,
                error: 'Could not generate chart from provided data'
            });
        }

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('Error auto-generating chart:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/visualizations/chart-types
 * Get list of available chart types with descriptions
 */
router.get('/chart-types', (req, res) => {
    res.json({
        success: true,
        data: {
            radar: {
                types: ['radar', 'tech-radar', 'capability', 'risk'],
                description: 'Multi-dimensional data comparison'
            },
            bar: {
                types: ['bar', 'comparison', 'grouped'],
                description: 'Categorical comparisons'
            },
            line: {
                types: ['line', 'area', 'trend'],
                description: 'Trends and time series'
            },
            pie: {
                types: ['pie', 'donut'],
                description: 'Part-to-whole relationships'
            },
            combo: {
                types: ['combo'],
                description: 'Mixed bar and line charts'
            }
        }
    });
});

module.exports = router;
