/**
 * INSIGHT 360 - Visualization API Routes
 * Version: 1.0.0
 *
 * Endpoints for generating charts and visualizations:
 * - POST /api/visualizations/radar - Generate radar chart
 * - POST /api/visualizations/tech-radar - Generate technology assessment radar
 * - POST /api/visualizations/capability - Generate capability comparison
 * - POST /api/visualizations/risk - Generate risk assessment radar
 * - POST /api/visualizations/process - Process agent output for chart data
 */

const express = require('express');
const router = express.Router();
const radarChartService = require('../services/radarChartService');

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

module.exports = router;
