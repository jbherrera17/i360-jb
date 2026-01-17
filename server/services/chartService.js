/**
 * INSIGHT 360 - Chart Visualization Service
 * Version: 1.0.0
 *
 * Generates various chart types for data visualization:
 * - Bar charts (vertical, horizontal, stacked, grouped)
 * - Line charts (basic, area, multi-line)
 * - Pie/Donut charts
 * - Combo charts (bar + line)
 *
 * Supports:
 * - QuickChart.io URL generation (works in any markdown renderer)
 * - Chart.js configuration objects (for frontend rendering)
 */

const DEFAULT_COLORS = [
    { background: 'rgba(99, 102, 241, 0.7)', border: 'rgb(99, 102, 241)' },   // Indigo
    { background: 'rgba(16, 185, 129, 0.7)', border: 'rgb(16, 185, 129)' },   // Emerald
    { background: 'rgba(245, 158, 11, 0.7)', border: 'rgb(245, 158, 11)' },   // Amber
    { background: 'rgba(239, 68, 68, 0.7)', border: 'rgb(239, 68, 68)' },     // Red
    { background: 'rgba(139, 92, 246, 0.7)', border: 'rgb(139, 92, 246)' },   // Violet
    { background: 'rgba(59, 130, 246, 0.7)', border: 'rgb(59, 130, 246)' },   // Blue
    { background: 'rgba(236, 72, 153, 0.7)', border: 'rgb(236, 72, 153)' },   // Pink
    { background: 'rgba(34, 197, 94, 0.7)', border: 'rgb(34, 197, 94)' }      // Green
];

const PIE_COLORS = [
    'rgba(99, 102, 241, 0.8)',
    'rgba(16, 185, 129, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(59, 130, 246, 0.8)',
    'rgba(236, 72, 153, 0.8)',
    'rgba(34, 197, 94, 0.8)'
];

// ============================================================================
// BAR CHARTS
// ============================================================================

/**
 * Generate a bar chart
 * @param {Object} config - Chart configuration
 * @param {string} config.title - Chart title
 * @param {string[]} config.labels - X-axis labels
 * @param {Object[]} config.datasets - Data sets [{label, data, color}]
 * @param {string} config.orientation - 'vertical' or 'horizontal'
 * @param {boolean} config.stacked - Whether to stack bars
 * @param {Object} config.options - Additional Chart.js options
 * @returns {Object} Chart URL and config
 */
function generateBarChart(config) {
    const {
        title = '',
        labels = [],
        datasets = [],
        orientation = 'vertical',
        stacked = false,
        showValues = false,
        width = 600,
        height = 400
    } = config;

    const isHorizontal = orientation === 'horizontal';
    const chartType = isHorizontal ? 'horizontalBar' : 'bar';

    const chartDatasets = datasets.map((ds, i) => ({
        label: ds.label || `Dataset ${i + 1}`,
        data: ds.data,
        backgroundColor: ds.backgroundColor || ds.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length].background,
        borderColor: ds.borderColor || DEFAULT_COLORS[i % DEFAULT_COLORS.length].border,
        borderWidth: ds.borderWidth || 1
    }));

    const chartConfig = {
        type: chartType,
        data: {
            labels,
            datasets: chartDatasets
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
                },
                datalabels: showValues ? {
                    display: true,
                    anchor: 'end',
                    align: 'top',
                    font: { weight: 'bold' }
                } : { display: false }
            },
            scales: {
                x: {
                    stacked,
                    grid: { display: false }
                },
                y: {
                    stacked,
                    beginAtZero: true
                }
            },
            indexAxis: isHorizontal ? 'y' : 'x'
        }
    };

    const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
    const chartUrl = `https://quickchart.io/chart?c=${encodedConfig}&w=${width}&h=${height}&bkg=white`;

    return {
        title,
        labels,
        datasets: chartDatasets,
        chartUrl,
        chartConfig: {
            ...chartConfig,
            options: {
                ...chartConfig.options,
                responsive: true,
                maintainAspectRatio: true
            }
        }
    };
}

/**
 * Generate a comparison bar chart (side-by-side categories)
 * @param {Object} config - Configuration
 * @param {string} config.title - Chart title
 * @param {string[]} config.categories - Category names
 * @param {Object} config.data - Data object {category: value}
 * @param {string} config.color - Optional color
 * @returns {Object} Chart data
 */
function generateComparisonBar(config) {
    const { title, categories, data, color } = config;

    return generateBarChart({
        title,
        labels: categories,
        datasets: [{
            label: title || 'Values',
            data: categories.map(cat => data[cat] || 0),
            color
        }]
    });
}

/**
 * Generate a grouped bar chart for period-over-period comparison
 * @param {Object} config - Configuration
 * @param {string} config.title - Chart title
 * @param {string[]} config.periods - Period labels (e.g., ['Q1', 'Q2', 'Q3'])
 * @param {Object[]} config.metrics - Metrics to compare [{name, values: []}]
 * @returns {Object} Chart data
 */
function generateGroupedBar(config) {
    const { title, periods, metrics } = config;

    return generateBarChart({
        title,
        labels: periods,
        datasets: metrics.map((metric, i) => ({
            label: metric.name,
            data: metric.values,
            backgroundColor: DEFAULT_COLORS[i % DEFAULT_COLORS.length].background,
            borderColor: DEFAULT_COLORS[i % DEFAULT_COLORS.length].border
        }))
    });
}

// ============================================================================
// LINE CHARTS
// ============================================================================

/**
 * Generate a line chart
 * @param {Object} config - Chart configuration
 * @param {string} config.title - Chart title
 * @param {string[]} config.labels - X-axis labels (time periods, categories)
 * @param {Object[]} config.datasets - Data sets [{label, data, color, fill}]
 * @param {boolean} config.smooth - Use bezier curves
 * @param {boolean} config.showPoints - Show data points
 * @param {Object} config.yAxis - Y-axis configuration {min, max, label}
 * @returns {Object} Chart URL and config
 */
function generateLineChart(config) {
    const {
        title = '',
        labels = [],
        datasets = [],
        smooth = true,
        showPoints = true,
        fill = false,
        width = 600,
        height = 400,
        yAxis = {}
    } = config;

    const chartDatasets = datasets.map((ds, i) => ({
        label: ds.label || `Series ${i + 1}`,
        data: ds.data,
        borderColor: ds.borderColor || ds.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length].border,
        backgroundColor: ds.fill ? (ds.backgroundColor || DEFAULT_COLORS[i % DEFAULT_COLORS.length].background) : 'transparent',
        borderWidth: ds.borderWidth || 2,
        fill: ds.fill !== undefined ? ds.fill : fill,
        tension: smooth ? 0.4 : 0,
        pointRadius: showPoints ? 4 : 0,
        pointHoverRadius: 6,
        pointBackgroundColor: ds.borderColor || ds.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length].border
    }));

    const chartConfig = {
        type: 'line',
        data: {
            labels,
            datasets: chartDatasets
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
                x: {
                    grid: { display: false }
                },
                y: {
                    beginAtZero: yAxis.beginAtZero !== false,
                    min: yAxis.min,
                    max: yAxis.max,
                    title: yAxis.label ? {
                        display: true,
                        text: yAxis.label
                    } : { display: false }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    };

    const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
    const chartUrl = `https://quickchart.io/chart?c=${encodedConfig}&w=${width}&h=${height}&bkg=white`;

    return {
        title,
        labels,
        datasets: chartDatasets,
        chartUrl,
        chartConfig: {
            ...chartConfig,
            options: {
                ...chartConfig.options,
                responsive: true,
                maintainAspectRatio: true
            }
        }
    };
}

/**
 * Generate an area chart (line with fill)
 * @param {Object} config - Same as generateLineChart
 * @returns {Object} Chart data
 */
function generateAreaChart(config) {
    return generateLineChart({
        ...config,
        fill: true,
        datasets: (config.datasets || []).map(ds => ({
            ...ds,
            fill: true
        }))
    });
}

/**
 * Generate a trend line chart with optional target line
 * @param {Object} config - Configuration
 * @param {string} config.title - Chart title
 * @param {string[]} config.periods - Time periods
 * @param {number[]} config.values - Actual values
 * @param {number} config.target - Optional target value (horizontal line)
 * @param {string} config.metricName - Name of the metric
 * @returns {Object} Chart data
 */
function generateTrendChart(config) {
    const { title, periods, values, target, metricName = 'Value' } = config;

    const datasets = [{
        label: metricName,
        data: values,
        borderColor: DEFAULT_COLORS[0].border,
        backgroundColor: DEFAULT_COLORS[0].background,
        fill: true
    }];

    // Add target line if specified
    if (target !== undefined) {
        datasets.push({
            label: 'Target',
            data: new Array(periods.length).fill(target),
            borderColor: 'rgba(239, 68, 68, 0.8)',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false
        });
    }

    return generateLineChart({
        title,
        labels: periods,
        datasets
    });
}

// ============================================================================
// PIE / DONUT CHARTS
// ============================================================================

/**
 * Generate a pie chart
 * @param {Object} config - Chart configuration
 * @param {string} config.title - Chart title
 * @param {string[]} config.labels - Segment labels
 * @param {number[]} config.data - Segment values
 * @param {string[]} config.colors - Optional custom colors
 * @param {boolean} config.showPercentages - Show percentage labels
 * @returns {Object} Chart URL and config
 */
function generatePieChart(config) {
    const {
        title = '',
        labels = [],
        data = [],
        colors,
        showPercentages = true,
        width = 500,
        height = 500
    } = config;

    const backgroundColor = colors || PIE_COLORS.slice(0, labels.length);

    const chartConfig = {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor,
                borderColor: 'white',
                borderWidth: 2
            }]
        },
        options: {
            plugins: {
                title: title ? {
                    display: true,
                    text: title,
                    font: { size: 16, weight: 'bold' }
                } : { display: false },
                legend: {
                    display: true,
                    position: 'right'
                },
                datalabels: showPercentages ? {
                    display: true,
                    formatter: (value, ctx) => {
                        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return percentage + '%';
                    },
                    color: 'white',
                    font: { weight: 'bold' }
                } : { display: false }
            }
        }
    };

    const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
    const chartUrl = `https://quickchart.io/chart?c=${encodedConfig}&w=${width}&h=${height}&bkg=white`;

    // Calculate percentages for the result
    const total = data.reduce((a, b) => a + b, 0);
    const percentages = data.map(v => total > 0 ? ((v / total) * 100).toFixed(1) : 0);

    return {
        title,
        labels,
        data,
        percentages,
        total,
        chartUrl,
        chartConfig: {
            ...chartConfig,
            options: {
                ...chartConfig.options,
                responsive: true,
                maintainAspectRatio: true
            }
        }
    };
}

/**
 * Generate a donut chart
 * @param {Object} config - Same as generatePieChart plus cutout option
 * @param {number} config.cutout - Cutout percentage (default: 50)
 * @returns {Object} Chart data
 */
function generateDonutChart(config) {
    const {
        title = '',
        labels = [],
        data = [],
        colors,
        showPercentages = true,
        cutout = 50,
        centerText,
        width = 500,
        height = 500
    } = config;

    const backgroundColor = colors || PIE_COLORS.slice(0, labels.length);

    const chartConfig = {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor,
                borderColor: 'white',
                borderWidth: 2
            }]
        },
        options: {
            cutout: `${cutout}%`,
            plugins: {
                title: title ? {
                    display: true,
                    text: title,
                    font: { size: 16, weight: 'bold' }
                } : { display: false },
                legend: {
                    display: true,
                    position: 'right'
                },
                datalabels: showPercentages ? {
                    display: true,
                    formatter: (value, ctx) => {
                        const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return percentage + '%';
                    },
                    color: 'white',
                    font: { weight: 'bold' }
                } : { display: false }
            }
        }
    };

    // Add center text plugin for QuickChart
    if (centerText) {
        chartConfig.options.plugins.doughnutlabel = {
            labels: [{
                text: centerText,
                font: { size: 20, weight: 'bold' }
            }]
        };
    }

    const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
    const chartUrl = `https://quickchart.io/chart?c=${encodedConfig}&w=${width}&h=${height}&bkg=white`;

    // Calculate percentages for the result
    const total = data.reduce((a, b) => a + b, 0);
    const percentages = data.map(v => total > 0 ? ((v / total) * 100).toFixed(1) : 0);

    return {
        title,
        labels,
        data,
        percentages,
        total,
        centerText,
        chartUrl,
        chartConfig: {
            ...chartConfig,
            options: {
                ...chartConfig.options,
                responsive: true,
                maintainAspectRatio: true
            }
        }
    };
}

// ============================================================================
// COMBO CHARTS
// ============================================================================

/**
 * Generate a combo chart (bar + line)
 * @param {Object} config - Chart configuration
 * @param {string} config.title - Chart title
 * @param {string[]} config.labels - X-axis labels
 * @param {Object[]} config.barDatasets - Bar data sets
 * @param {Object[]} config.lineDatasets - Line data sets
 * @returns {Object} Chart URL and config
 */
function generateComboChart(config) {
    const {
        title = '',
        labels = [],
        barDatasets = [],
        lineDatasets = [],
        width = 600,
        height = 400
    } = config;

    const datasets = [
        ...barDatasets.map((ds, i) => ({
            type: 'bar',
            label: ds.label || `Bar ${i + 1}`,
            data: ds.data,
            backgroundColor: ds.backgroundColor || DEFAULT_COLORS[i % DEFAULT_COLORS.length].background,
            borderColor: ds.borderColor || DEFAULT_COLORS[i % DEFAULT_COLORS.length].border,
            borderWidth: 1,
            order: 2
        })),
        ...lineDatasets.map((ds, i) => ({
            type: 'line',
            label: ds.label || `Line ${i + 1}`,
            data: ds.data,
            borderColor: ds.borderColor || DEFAULT_COLORS[(barDatasets.length + i) % DEFAULT_COLORS.length].border,
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 4,
            order: 1
        }))
    ];

    const chartConfig = {
        type: 'bar',
        data: {
            labels,
            datasets
        },
        options: {
            plugins: {
                title: title ? {
                    display: true,
                    text: title,
                    font: { size: 16, weight: 'bold' }
                } : { display: false },
                legend: {
                    display: true,
                    position: 'bottom'
                }
            },
            scales: {
                x: {
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    };

    const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
    const chartUrl = `https://quickchart.io/chart?c=${encodedConfig}&w=${width}&h=${height}&bkg=white`;

    return {
        title,
        labels,
        datasets,
        chartUrl,
        chartConfig: {
            ...chartConfig,
            options: {
                ...chartConfig.options,
                responsive: true,
                maintainAspectRatio: true
            }
        }
    };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate markdown with embedded chart image
 * @param {Object} chartData - Chart data from any generate function
 * @param {string} description - Optional description text
 * @returns {string} Markdown content
 */
function generateMarkdownWithChart(chartData, description = '') {
    const { title, chartUrl } = chartData;

    let markdown = '';
    if (title) {
        markdown += `## ${title}\n\n`;
    }

    markdown += `![${title || 'Chart'}](${chartUrl})\n\n`;

    if (description) {
        markdown += `${description}\n\n`;
    }

    // Add data table if available
    if (chartData.labels && chartData.data) {
        markdown += '### Data\n\n';
        markdown += '| Category | Value |\n|----------|-------|\n';
        chartData.labels.forEach((label, i) => {
            markdown += `| ${label} | ${chartData.data[i]} |\n`;
        });
    }

    return markdown;
}

/**
 * Process generic data and auto-detect best chart type
 * @param {Object} data - Input data
 * @param {string} hint - Optional hint for chart type
 * @returns {Object} Chart data with URL and config
 */
function autoGenerateChart(data, hint = null) {
    // If hint provided, use it
    if (hint) {
        switch (hint.toLowerCase()) {
            case 'bar':
                return generateBarChart(data);
            case 'line':
                return generateLineChart(data);
            case 'pie':
                return generatePieChart(data);
            case 'donut':
                return generateDonutChart(data);
            case 'area':
                return generateAreaChart(data);
            case 'trend':
                return generateTrendChart(data);
            case 'combo':
                return generateComboChart(data);
        }
    }

    // Auto-detect based on data structure
    const { labels, datasets, data: pieData, periods, values, categories } = data;

    // Single array of values with labels -> pie chart
    if (pieData && Array.isArray(pieData) && labels && !datasets) {
        return generatePieChart(data);
    }

    // Time series data -> line chart
    if (periods && values) {
        return generateTrendChart(data);
    }

    // Categories with single data set -> bar chart
    if (categories && data.data) {
        return generateComparisonBar(data);
    }

    // Multiple datasets -> grouped bar or line based on data length
    if (datasets && datasets.length > 0) {
        const avgDataLength = datasets.reduce((sum, ds) => sum + (ds.data?.length || 0), 0) / datasets.length;

        // More than 6 data points suggest a trend -> line chart
        if (avgDataLength > 6) {
            return generateLineChart(data);
        }

        // Otherwise -> bar chart
        return generateBarChart(data);
    }

    // Default to bar chart
    return generateBarChart(data);
}

module.exports = {
    // Bar charts
    generateBarChart,
    generateComparisonBar,
    generateGroupedBar,

    // Line charts
    generateLineChart,
    generateAreaChart,
    generateTrendChart,

    // Pie charts
    generatePieChart,
    generateDonutChart,

    // Combo charts
    generateComboChart,

    // Utilities
    generateMarkdownWithChart,
    autoGenerateChart,

    // Constants
    DEFAULT_COLORS,
    PIE_COLORS
};
