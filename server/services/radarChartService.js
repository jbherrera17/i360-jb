/**
 * INSIGHT 360 - Radar Chart Visualization Service
 * Version: 1.0.0
 *
 * Generates radar charts for technology assessments, capability analysis,
 * and other multi-dimensional visualizations.
 *
 * Supports:
 * - QuickChart.io URL generation (works in any markdown renderer)
 * - Chart.js configuration objects (for frontend rendering)
 * - ASCII art fallback (for plain text contexts)
 */

const DEFAULT_COLORS = {
    primary: {
        background: 'rgba(99, 102, 241, 0.2)',
        border: 'rgb(99, 102, 241)',
        point: 'rgb(99, 102, 241)'
    },
    secondary: {
        background: 'rgba(16, 185, 129, 0.2)',
        border: 'rgb(16, 185, 129)',
        point: 'rgb(16, 185, 129)'
    },
    tertiary: {
        background: 'rgba(245, 158, 11, 0.2)',
        border: 'rgb(245, 158, 11)',
        point: 'rgb(245, 158, 11)'
    },
    danger: {
        background: 'rgba(239, 68, 68, 0.2)',
        border: 'rgb(239, 68, 68)',
        point: 'rgb(239, 68, 68)'
    }
};

const TECH_RADAR_RINGS = ['Hold', 'Assess', 'Trial', 'Adopt'];
const TECH_RADAR_QUADRANTS = ['AI/ML', 'Platforms', 'Languages', 'Patterns'];

/**
 * Generate a QuickChart.io URL for a radar chart
 * @param {Object} config - Chart configuration
 * @param {string} config.title - Chart title
 * @param {string[]} config.labels - Axis labels
 * @param {Object[]} config.datasets - Data sets to plot
 * @param {number} config.max - Maximum value for scale (default: 5)
 * @param {number} config.width - Image width (default: 500)
 * @param {number} config.height - Image height (default: 500)
 * @returns {string} QuickChart URL
 */
function generateQuickChartUrl(config) {
    const {
        title = '',
        labels = [],
        datasets = [],
        max = 5,
        width = 500,
        height = 500
    } = config;

    const colorKeys = Object.keys(DEFAULT_COLORS);

    const chartConfig = {
        type: 'radar',
        data: {
            labels,
            datasets: datasets.map((ds, i) => ({
                label: ds.label || `Dataset ${i + 1}`,
                data: ds.data,
                backgroundColor: ds.backgroundColor || DEFAULT_COLORS[colorKeys[i % colorKeys.length]].background,
                borderColor: ds.borderColor || DEFAULT_COLORS[colorKeys[i % colorKeys.length]].border,
                pointBackgroundColor: ds.pointBackgroundColor || DEFAULT_COLORS[colorKeys[i % colorKeys.length]].point,
                borderWidth: ds.borderWidth || 2,
                pointRadius: ds.pointRadius || 4
            }))
        },
        options: {
            plugins: {
                title: title ? {
                    display: true,
                    text: title,
                    font: { size: 16, weight: 'bold' }
                } : { display: false },
                legend: {
                    display: datasets.length > 1,
                    position: 'bottom'
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max,
                    ticks: {
                        stepSize: 1,
                        display: true
                    },
                    pointLabels: {
                        font: { size: 12 }
                    }
                }
            }
        }
    };

    const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
    return `https://quickchart.io/chart?c=${encodedConfig}&w=${width}&h=${height}&bkg=white`;
}

/**
 * Generate Chart.js configuration for frontend rendering
 * @param {Object} config - Chart configuration
 * @returns {Object} Chart.js configuration object
 */
function generateChartJsConfig(config) {
    const {
        title = '',
        labels = [],
        datasets = [],
        max = 5
    } = config;

    const colorKeys = Object.keys(DEFAULT_COLORS);

    return {
        type: 'radar',
        data: {
            labels,
            datasets: datasets.map((ds, i) => ({
                label: ds.label || `Dataset ${i + 1}`,
                data: ds.data,
                backgroundColor: ds.backgroundColor || DEFAULT_COLORS[colorKeys[i % colorKeys.length]].background,
                borderColor: ds.borderColor || DEFAULT_COLORS[colorKeys[i % colorKeys.length]].border,
                pointBackgroundColor: ds.pointBackgroundColor || DEFAULT_COLORS[colorKeys[i % colorKeys.length]].point,
                borderWidth: ds.borderWidth || 2,
                pointRadius: ds.pointRadius || 4,
                pointHoverRadius: 6
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: title ? {
                    display: true,
                    text: title,
                    font: { size: 16, weight: 'bold' },
                    padding: 20
                } : { display: false },
                legend: {
                    display: datasets.length > 1,
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}/${max}`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max,
                    min: 0,
                    ticks: {
                        stepSize: 1,
                        display: true,
                        backdropColor: 'transparent'
                    },
                    pointLabels: {
                        font: { size: 12, weight: '500' },
                        padding: 10
                    },
                    grid: {
                        circular: true
                    },
                    angleLines: {
                        display: true
                    }
                }
            },
            elements: {
                line: {
                    tension: 0.1
                }
            }
        }
    };
}

/**
 * Generate a technology assessment radar chart
 * @param {Object} assessment - Technology assessment data
 * @param {string} assessment.name - Technology name
 * @param {number} assessment.maturity - Maturity score (1-5)
 * @param {number} assessment.relevance - Relevance score (1-5)
 * @param {number} assessment.capabilityGap - Capability gap score (1-5, lower = smaller gap)
 * @param {number} assessment.riskProfile - Risk profile score (1-5, lower = less risk)
 * @param {string} [assessment.ring] - Radar ring position (adopt, trial, assess, hold)
 * @param {string} [assessment.quadrant] - Radar quadrant (ai_ml, platforms, languages, patterns)
 * @param {Object} [comparison] - Optional comparison data
 * @param {string} format - Output format ('url', 'config', 'ascii', 'all')
 * @returns {Object} Chart data in requested format(s)
 */
function generateTechRadar(assessment, comparison = null, format = 'all') {
    const {
        name,
        maturity,
        relevance,
        capabilityGap,
        riskProfile,
        ring,
        quadrant
    } = assessment;

    // For radar chart, invert negative metrics so higher = better
    const labels = ['Maturity', 'Relevance', 'Capability', 'Low Risk'];
    const data = [
        maturity,
        relevance,
        5 - capabilityGap,  // Invert: 5 - gap = capability readiness
        5 - riskProfile     // Invert: 5 - risk = safety
    ];

    const datasets = [{
        label: name,
        data
    }];

    // Add comparison dataset if provided
    if (comparison) {
        datasets.push({
            label: comparison.name || 'Comparison',
            data: [
                comparison.maturity,
                comparison.relevance,
                5 - comparison.capabilityGap,
                5 - comparison.riskProfile
            ],
            backgroundColor: DEFAULT_COLORS.secondary.background,
            borderColor: DEFAULT_COLORS.secondary.border,
            pointBackgroundColor: DEFAULT_COLORS.secondary.point
        });
    }

    const chartConfig = {
        title: `Technology Assessment: ${name}`,
        labels,
        datasets,
        max: 5
    };

    const result = {
        technology: name,
        scores: {
            maturity,
            relevance,
            capabilityGap,
            riskProfile,
            composite: maturity + relevance + (5 - capabilityGap) + (5 - riskProfile)
        }
    };

    if (ring) result.ring = ring;
    if (quadrant) result.quadrant = quadrant;

    // Generate requested formats
    if (format === 'url' || format === 'all') {
        result.chartUrl = generateQuickChartUrl(chartConfig);
    }

    if (format === 'config' || format === 'all') {
        result.chartConfig = generateChartJsConfig(chartConfig);
    }

    if (format === 'ascii' || format === 'all') {
        result.asciiChart = generateAsciiRadar(assessment);
    }

    if (format === 'all') {
        result.markdown = generateMarkdownWithChart(assessment, result.chartUrl);
    }

    return result;
}

/**
 * Generate ASCII art representation of a tech radar position
 * @param {Object} assessment - Technology assessment
 * @returns {string} ASCII radar visualization
 */
function generateAsciiRadar(assessment) {
    const { name, ring, quadrant } = assessment;

    // Determine position based on ring and quadrant
    const ringIndex = TECH_RADAR_RINGS.indexOf(
        ring?.charAt(0).toUpperCase() + ring?.slice(1).toLowerCase()
    );
    const quadrantIndex = TECH_RADAR_QUADRANTS.findIndex(q =>
        q.toLowerCase().replace(/[^a-z]/g, '') === quadrant?.toLowerCase().replace(/[^a-z_]/g, '').replace('_', '')
    );

    // Create the radar grid
    const radar = `
                         ADOPT
                           |
            +==============|==============+
            |              |              |
            |      +-------+-------+      |
            |      |       |       |      |
   PATTERNS |------+-------+-------+------| AI/ML
            |      |       |       |      |
            |      +-------+-------+      |
            |              |              |
            +==============|==============+
            |              |              |
            |      +-------+-------+      |
            |      |       |       |      |
  LANGUAGES |------+-------+-------+------| PLATFORMS
            |      |       |       |      |
            |      +-------+-------+      |
            |              |              |
            +==============|==============+
                           |
                         HOLD

    * ${name}
    Ring: ${ring?.toUpperCase() || 'TBD'}
    Quadrant: ${quadrant?.replace('_', '/').toUpperCase() || 'TBD'}
`;

    return radar;
}

/**
 * Generate markdown report section with embedded chart
 * @param {Object} assessment - Technology assessment
 * @param {string} chartUrl - QuickChart URL
 * @returns {string} Markdown content
 */
function generateMarkdownWithChart(assessment, chartUrl) {
    const {
        name,
        maturity,
        relevance,
        capabilityGap,
        riskProfile,
        ring,
        quadrant
    } = assessment;

    const composite = maturity + relevance + (5 - capabilityGap) + (5 - riskProfile);
    const maxComposite = 20;

    // Visual score helper
    const visualScore = (score, max = 5) => {
        const filled = Math.round(score);
        const empty = max - filled;
        return '\u2B24'.repeat(filled) + '\u25CB'.repeat(empty);
    };

    return `## Technology Radar: ${name}

![Technology Assessment Radar](${chartUrl})

### Radar Position
- **Ring:** ${ring?.toUpperCase() || 'TBD'}
- **Quadrant:** ${quadrant?.replace('_', ' / ').toUpperCase() || 'TBD'}

### Assessment Matrix

| Criterion | Score | Visual |
|-----------|-------|--------|
| **Maturity** | ${maturity}/5 | ${visualScore(maturity)} |
| **Relevance** | ${relevance}/5 | ${visualScore(relevance)} |
| **Capability Gap** | ${capabilityGap}/5 | ${visualScore(5 - capabilityGap)} |
| **Risk Profile** | ${riskProfile}/5 | ${visualScore(5 - riskProfile)} |
| **COMPOSITE** | ${composite}/${maxComposite} | |

`;
}

/**
 * Generate a capability comparison radar chart
 * @param {Object} config - Comparison configuration
 * @param {string} config.title - Chart title
 * @param {string[]} config.dimensions - Capability dimensions to compare
 * @param {Object[]} config.entities - Entities to compare [{name, scores: {}}]
 * @param {string} format - Output format
 * @returns {Object} Chart data
 */
function generateCapabilityRadar(config, format = 'all') {
    const { title, dimensions, entities } = config;

    const datasets = entities.map((entity, i) => {
        const colorKeys = Object.keys(DEFAULT_COLORS);
        const color = DEFAULT_COLORS[colorKeys[i % colorKeys.length]];

        return {
            label: entity.name,
            data: dimensions.map(dim => entity.scores[dim] || 0),
            backgroundColor: color.background,
            borderColor: color.border,
            pointBackgroundColor: color.point
        };
    });

    const chartConfig = {
        title,
        labels: dimensions,
        datasets,
        max: Math.max(...entities.flatMap(e => Object.values(e.scores)), 5)
    };

    const result = {
        title,
        dimensions,
        entities: entities.map(e => ({ name: e.name, scores: e.scores }))
    };

    if (format === 'url' || format === 'all') {
        result.chartUrl = generateQuickChartUrl(chartConfig);
    }

    if (format === 'config' || format === 'all') {
        result.chartConfig = generateChartJsConfig(chartConfig);
    }

    return result;
}

/**
 * Generate a risk assessment radar chart
 * @param {Object} risks - Risk assessment scores
 * @param {string} title - Chart title
 * @param {string} format - Output format
 * @returns {Object} Chart data
 */
function generateRiskRadar(risks, title = 'Risk Assessment', format = 'all') {
    const labels = Object.keys(risks);
    const data = Object.values(risks);

    const chartConfig = {
        title,
        labels,
        datasets: [{
            label: 'Risk Level',
            data,
            backgroundColor: DEFAULT_COLORS.danger.background,
            borderColor: DEFAULT_COLORS.danger.border,
            pointBackgroundColor: DEFAULT_COLORS.danger.point
        }],
        max: Math.max(...data, 5)
    };

    const result = { title, risks };

    if (format === 'url' || format === 'all') {
        result.chartUrl = generateQuickChartUrl(chartConfig);
    }

    if (format === 'config' || format === 'all') {
        result.chartConfig = generateChartJsConfig(chartConfig);
    }

    return result;
}

/**
 * Parse scores from agent JSON output and generate chart
 * @param {Object} agentOutput - Structured output from agent
 * @returns {Object} Chart data with URL and config
 */
function processAgentOutput(agentOutput) {
    // Handle technology radar output format
    if (agentOutput.brief_type === 'technology_radar' || agentOutput.technology_context) {
        const ctx = agentOutput.technology_context || {};
        const scores = agentOutput.scores || {};

        return generateTechRadar({
            name: ctx.technology_name || agentOutput.title?.replace('Technology Radar: ', '') || 'Unknown',
            maturity: scores.maturity || 3,
            relevance: scores.relevance || 3,
            capabilityGap: scores.capability_gap || 3,
            riskProfile: scores.risk_profile || 3,
            ring: ctx.radar_ring,
            quadrant: ctx.radar_quadrant
        });
    }

    // Handle capability assessment output
    if (agentOutput.capabilities || agentOutput.dimensions) {
        return generateCapabilityRadar({
            title: agentOutput.title || 'Capability Assessment',
            dimensions: agentOutput.dimensions || Object.keys(agentOutput.capabilities || {}),
            entities: agentOutput.entities || [{
                name: agentOutput.subject || 'Assessment',
                scores: agentOutput.capabilities || agentOutput.scores || {}
            }]
        });
    }

    // Handle risk assessment output
    if (agentOutput.risks && typeof agentOutput.risks === 'object' && !Array.isArray(agentOutput.risks)) {
        return generateRiskRadar(agentOutput.risks, agentOutput.title);
    }

    // Default: try to create a generic radar from scores
    if (agentOutput.scores && typeof agentOutput.scores === 'object') {
        return generateCapabilityRadar({
            title: agentOutput.title || 'Assessment',
            dimensions: Object.keys(agentOutput.scores),
            entities: [{
                name: agentOutput.name || 'Subject',
                scores: agentOutput.scores
            }]
        });
    }

    return null;
}

module.exports = {
    generateQuickChartUrl,
    generateChartJsConfig,
    generateTechRadar,
    generateCapabilityRadar,
    generateRiskRadar,
    generateAsciiRadar,
    generateMarkdownWithChart,
    processAgentOutput,
    DEFAULT_COLORS,
    TECH_RADAR_RINGS,
    TECH_RADAR_QUADRANTS
};
