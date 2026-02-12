/**
 * INSIGHT 360 - Chart Renderer Component
 * Version: 1.0.0
 *
 * Frontend component for rendering various chart types using Chart.js.
 * Supports: Bar, Line, Pie, Donut, Area, Combo, and Radar charts.
 *
 * Usage:
 * 1. Include Chart.js: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
 * 2. Include this file: <script src="/js/charts/chartRenderer.js"></script>
 * 3. Render: ChartRenderer.render(containerId, config)
 *
 * Or use the API:
 * const data = await ChartRenderer.fetchChart('/api/visualizations/bar', { ... });
 * ChartRenderer.render('myChart', data.chartConfig);
 */

const ChartRenderer = (function() {
    'use strict';

    // Store chart instances for cleanup
    const chartInstances = new Map();

    // Color palettes
    const COLORS = [
        { background: 'rgba(99, 102, 241, 0.7)', border: 'rgb(99, 102, 241)' },   // Indigo
        { background: 'rgba(16, 185, 129, 0.7)', border: 'rgb(16, 185, 129)' },   // Emerald
        { background: 'rgba(245, 158, 11, 0.7)', border: 'rgb(245, 158, 11)' },   // Amber
        { background: 'rgba(239, 68, 68, 0.7)', border: 'rgb(239, 68, 68)' },     // Red
        { background: 'rgba(139, 92, 246, 0.7)', border: 'rgb(139, 92, 246)' },   // Violet
        { background: 'rgba(59, 130, 246, 0.7)', border: 'rgb(59, 130, 246)' },   // Blue
        { background: 'rgba(236, 72, 153, 0.7)', border: 'rgb(236, 72, 153)' },   // Pink
        { background: 'rgba(34, 197, 94, 0.7)', border: 'rgb(34, 197, 94)' }      // Green
    ];

    const PIE_COLORS = COLORS.map(c => c.background);

    // ========================================================================
    // CORE RENDERING
    // ========================================================================

    /**
     * Render a chart in the specified container
     * @param {string|HTMLElement} container - Container ID or element
     * @param {Object} config - Chart.js configuration
     * @returns {Chart} Chart.js instance
     */
    function render(container, config) {
        const containerEl = typeof container === 'string'
            ? document.getElementById(container)
            : container;

        if (!containerEl) {
            console.error('ChartRenderer: Container not found:', container);
            return null;
        }

        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('ChartRenderer: Chart.js is not loaded');
            containerEl.innerHTML = '<p class="chart-error">Chart.js library not loaded</p>';
            return null;
        }

        // Create canvas if not present
        let canvas = containerEl.querySelector('canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            containerEl.appendChild(canvas);
        }

        // Destroy existing chart if any
        const containerId = containerEl.id || `chart-${Date.now()}`;
        if (chartInstances.has(containerId)) {
            chartInstances.get(containerId).destroy();
        }

        // Create chart
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, config);

        chartInstances.set(containerId, chart);
        return chart;
    }

    /**
     * Render chart from API response
     * @param {string|HTMLElement} container - Container
     * @param {Object} apiResponse - API response with chartConfig
     * @returns {Chart} Chart instance
     */
    function renderFromApi(container, apiResponse) {
        const config = apiResponse.chartConfig || apiResponse.data?.chartConfig || apiResponse;
        return render(container, config);
    }

    // ========================================================================
    // CHART TYPE HELPERS
    // ========================================================================

    /**
     * Create a bar chart
     * @param {string|HTMLElement} container - Container
     * @param {Object} options - Chart options
     */
    function barChart(container, options) {
        const {
            title,
            labels,
            datasets,
            horizontal = false,
            stacked = false
        } = options;

        const config = {
            type: 'bar',
            data: {
                labels,
                datasets: datasets.map((ds, i) => ({
                    label: ds.label || `Dataset ${i + 1}`,
                    data: ds.data,
                    backgroundColor: ds.backgroundColor || COLORS[i % COLORS.length].background,
                    borderColor: ds.borderColor || COLORS[i % COLORS.length].border,
                    borderWidth: 1
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: horizontal ? 'y' : 'x',
                plugins: {
                    title: { display: !!title, text: title, font: { size: 16, weight: 'bold' } },
                    legend: { display: datasets.length > 1, position: 'bottom' }
                },
                scales: {
                    x: { stacked, grid: { display: false } },
                    y: { stacked, beginAtZero: true }
                }
            }
        };

        return render(container, config);
    }

    /**
     * Create a line chart
     * @param {string|HTMLElement} container - Container
     * @param {Object} options - Chart options
     */
    function lineChart(container, options) {
        const {
            title,
            labels,
            datasets,
            smooth = true,
            showPoints = true,
            fill = false
        } = options;

        const config = {
            type: 'line',
            data: {
                labels,
                datasets: datasets.map((ds, i) => ({
                    label: ds.label || `Series ${i + 1}`,
                    data: ds.data,
                    borderColor: ds.borderColor || COLORS[i % COLORS.length].border,
                    backgroundColor: fill ? (ds.backgroundColor || COLORS[i % COLORS.length].background) : 'transparent',
                    borderWidth: 2,
                    fill: ds.fill !== undefined ? ds.fill : fill,
                    tension: smooth ? 0.4 : 0,
                    pointRadius: showPoints ? 4 : 0,
                    pointHoverRadius: 6
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: { display: !!title, text: title, font: { size: 16, weight: 'bold' } },
                    legend: { display: datasets.length > 1, position: 'bottom' }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true }
                },
                interaction: { intersect: false, mode: 'index' }
            }
        };

        return render(container, config);
    }

    /**
     * Create an area chart (filled line chart)
     * @param {string|HTMLElement} container - Container
     * @param {Object} options - Chart options
     */
    function areaChart(container, options) {
        return lineChart(container, { ...options, fill: true });
    }

    /**
     * Create a pie chart
     * @param {string|HTMLElement} container - Container
     * @param {Object} options - Chart options
     */
    function pieChart(container, options) {
        const { title, labels, data, colors } = options;

        const config = {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors || PIE_COLORS.slice(0, labels.length),
                    borderColor: 'white',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: { display: !!title, text: title, font: { size: 16, weight: 'bold' } },
                    legend: { display: true, position: 'right' }
                }
            }
        };

        return render(container, config);
    }

    /**
     * Create a donut chart
     * @param {string|HTMLElement} container - Container
     * @param {Object} options - Chart options
     */
    function donutChart(container, options) {
        const { title, labels, data, colors, cutout = 50 } = options;

        const config = {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors || PIE_COLORS.slice(0, labels.length),
                    borderColor: 'white',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: `${cutout}%`,
                plugins: {
                    title: { display: !!title, text: title, font: { size: 16, weight: 'bold' } },
                    legend: { display: true, position: 'right' }
                }
            }
        };

        return render(container, config);
    }

    /**
     * Create a combo chart (bar + line)
     * @param {string|HTMLElement} container - Container
     * @param {Object} options - Chart options
     */
    function comboChart(container, options) {
        const { title, labels, barDatasets = [], lineDatasets = [] } = options;

        const datasets = [
            ...barDatasets.map((ds, i) => ({
                type: 'bar',
                label: ds.label || `Bar ${i + 1}`,
                data: ds.data,
                backgroundColor: ds.backgroundColor || COLORS[i % COLORS.length].background,
                borderColor: ds.borderColor || COLORS[i % COLORS.length].border,
                borderWidth: 1,
                order: 2
            })),
            ...lineDatasets.map((ds, i) => ({
                type: 'line',
                label: ds.label || `Line ${i + 1}`,
                data: ds.data,
                borderColor: ds.borderColor || COLORS[(barDatasets.length + i) % COLORS.length].border,
                backgroundColor: 'transparent',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 4,
                order: 1
            }))
        ];

        const config = {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: { display: !!title, text: title, font: { size: 16, weight: 'bold' } },
                    legend: { display: true, position: 'bottom' }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true }
                }
            }
        };

        return render(container, config);
    }

    // ========================================================================
    // API INTEGRATION
    // ========================================================================

    /**
     * Fetch chart data from API and render
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body
     * @returns {Promise<Object>} API response
     */
    async function fetchChart(endpoint, data) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to generate chart');
            }

            return result.data;
        } catch (error) {
            console.error('ChartRenderer: API error:', error);
            throw error;
        }
    }

    /**
     * Fetch and render a bar chart
     * @param {string|HTMLElement} container - Container
     * @param {Object} options - Chart options
     */
    async function fetchBarChart(container, options) {
        const data = await fetchChart('/api/visualizations/bar', options);
        return renderFromApi(container, data);
    }

    /**
     * Fetch and render a line chart
     * @param {string|HTMLElement} container - Container
     * @param {Object} options - Chart options
     */
    async function fetchLineChart(container, options) {
        const data = await fetchChart('/api/visualizations/line', options);
        return renderFromApi(container, data);
    }

    /**
     * Fetch and render a pie chart
     * @param {string|HTMLElement} container - Container
     * @param {Object} options - Chart options
     */
    async function fetchPieChart(container, options) {
        const data = await fetchChart('/api/visualizations/pie', options);
        return renderFromApi(container, data);
    }

    /**
     * Fetch and render a donut chart
     * @param {string|HTMLElement} container - Container
     * @param {Object} options - Chart options
     */
    async function fetchDonutChart(container, options) {
        const data = await fetchChart('/api/visualizations/donut', options);
        return renderFromApi(container, data);
    }

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    /**
     * Create a chart container element
     * @param {Object} options - Container options
     * @returns {HTMLElement} Container element
     */
    function createContainer(options = {}) {
        const {
            width = 400,
            height = 300,
            className = 'chart-container',
            id
        } = options;

        const container = document.createElement('div');
        container.className = className;
        container.id = id || `chart-${Date.now()}`;
        container.style.cssText = `width: ${width}px; height: ${height}px; margin: 20px auto;`;

        return container;
    }

    /**
     * Get QuickChart.io URL for embedding
     * @param {Object} config - Chart configuration
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {string} QuickChart URL
     */
    function getEmbedUrl(config, width = 600, height = 400) {
        const encodedConfig = encodeURIComponent(JSON.stringify(config));
        return `https://quickchart.io/chart?c=${encodedConfig}&w=${width}&h=${height}&bkg=white`;
    }

    /**
     * Destroy a chart instance
     * @param {string} containerId - Container ID
     */
    function destroy(containerId) {
        if (chartInstances.has(containerId)) {
            chartInstances.get(containerId).destroy();
            chartInstances.delete(containerId);
        }
    }

    /**
     * Destroy all chart instances
     */
    function destroyAll() {
        chartInstances.forEach((chart) => chart.destroy());
        chartInstances.clear();
    }

    /**
     * Update chart data
     * @param {string} containerId - Container ID
     * @param {Object} newData - New data object
     */
    function update(containerId, newData) {
        const chart = chartInstances.get(containerId);
        if (chart) {
            if (newData.labels) chart.data.labels = newData.labels;
            if (newData.datasets) chart.data.datasets = newData.datasets;
            chart.update();
        }
    }

    /**
     * Get chart instance by container ID
     * @param {string} containerId - Container ID
     * @returns {Chart|undefined} Chart instance
     */
    function getInstance(containerId) {
        return chartInstances.get(containerId);
    }

    // ========================================================================
    // CHAT AUTO-DETECTION
    // ========================================================================

    // Chart types that this renderer handles (radar is handled by radarChart.js)
    const SUPPORTED_TYPES = ['bar', 'line', 'area', 'pie', 'doughnut', 'donut', 'combo'];

    /**
     * Parse chart JSON from message content
     * Looks for JSON code blocks containing chart configuration
     * @param {string} html - Message innerHTML
     * @returns {Object|null} Chart config or null
     */
    function parseChartData(html) {
        // Look for JSON code blocks with chart or chart_config markers
        const jsonMatch = html.match(/```(?:json)?\s*\n(\{[\s\S]*?"(?:chart|chart_config|chartConfig|visualization)"[\s\S]*?\})\s*\n```/);

        if (jsonMatch) {
            try {
                const data = JSON.parse(jsonMatch[1]);
                return data.chart || data.chart_config || data.chartConfig || data.visualization || data;
            } catch (e) {
                // Try extracting from code element (marked renders code blocks as <pre><code>)
            }
        }

        // Also try parsing from rendered <code> elements
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const codeBlocks = temp.querySelectorAll('pre code');
        for (const code of codeBlocks) {
            const text = code.textContent || '';
            if (text.includes('"type"') && text.includes('"labels"')) {
                try {
                    const data = JSON.parse(text);
                    const chartData = data.chart || data.chart_config || data.chartConfig || data.visualization || data;
                    if (chartData && chartData.type && SUPPORTED_TYPES.includes(chartData.type)) {
                        return chartData;
                    }
                } catch (e) {
                    // Not valid JSON, skip
                }
            }
        }

        return null;
    }

    /**
     * Render a chart from parsed data using the appropriate helper
     * @param {HTMLElement} container - Container element
     * @param {Object} chartData - Parsed chart data
     * @returns {Chart|null} Chart instance
     */
    function renderFromData(container, chartData) {
        const type = chartData.type;

        // Normalize donut → doughnut
        if (type === 'donut' || type === 'doughnut') {
            return donutChart(container, {
                title: chartData.title,
                labels: chartData.labels || chartData.data?.labels || [],
                data: chartData.data?.datasets?.[0]?.data || chartData.values || chartData.data || [],
                cutout: chartData.cutout || 50
            });
        }

        if (type === 'pie') {
            return pieChart(container, {
                title: chartData.title,
                labels: chartData.labels || chartData.data?.labels || [],
                data: chartData.data?.datasets?.[0]?.data || chartData.values || chartData.data || []
            });
        }

        if (type === 'bar') {
            return barChart(container, {
                title: chartData.title,
                labels: chartData.labels || chartData.data?.labels || [],
                datasets: chartData.datasets || chartData.data?.datasets || [],
                horizontal: chartData.horizontal || false,
                stacked: chartData.stacked || false
            });
        }

        if (type === 'line') {
            return lineChart(container, {
                title: chartData.title,
                labels: chartData.labels || chartData.data?.labels || [],
                datasets: chartData.datasets || chartData.data?.datasets || [],
                smooth: chartData.smooth !== false,
                fill: chartData.fill || false
            });
        }

        if (type === 'area') {
            return areaChart(container, {
                title: chartData.title,
                labels: chartData.labels || chartData.data?.labels || [],
                datasets: chartData.datasets || chartData.data?.datasets || [],
                smooth: chartData.smooth !== false
            });
        }

        if (type === 'combo') {
            return comboChart(container, {
                title: chartData.title,
                labels: chartData.labels || chartData.data?.labels || [],
                barDatasets: chartData.barDatasets || [],
                lineDatasets: chartData.lineDatasets || []
            });
        }

        // Fallback: try rendering as raw Chart.js config
        if (chartData.data && chartData.options) {
            return render(container, chartData);
        }

        return null;
    }

    /**
     * Process a message element and render any embedded charts
     * @param {HTMLElement} messageEl - Message content element
     */
    function processMessage(messageEl) {
        // Skip if already processed
        if (messageEl.dataset.chartProcessed) return;

        const chartData = parseChartData(messageEl.innerHTML);

        if (chartData && chartData.type && SUPPORTED_TYPES.includes(chartData.type)) {
            // Create chart container
            const chartContainer = document.createElement('div');
            chartContainer.className = 'chart-render-container';
            chartContainer.id = `chart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            chartContainer.style.cssText = 'max-width: 600px; height: 350px; margin: 20px auto; padding: 16px; background: rgba(255,255,255,0.05); border-radius: 12px;';

            // Find the JSON code block and replace it with the chart
            const codeBlock = Array.from(messageEl.querySelectorAll('pre code')).find(code => {
                const text = code.textContent || '';
                return text.includes('"type"') && text.includes('"labels"');
            });

            if (codeBlock) {
                codeBlock.parentElement.replaceWith(chartContainer);
            } else {
                messageEl.appendChild(chartContainer);
            }

            // Render the chart
            renderFromData(chartContainer, chartData);
            messageEl.dataset.chartProcessed = 'true';
        }
    }

    /**
     * Initialize auto-detection for chat messages
     * @param {string} containerSelector - Selector for messages container
     */
    function init(containerSelector = '#chatMessages') {
        const container = document.querySelector(containerSelector);
        if (!container) {
            console.warn('ChartRenderer: Container not found:', containerSelector);
            return;
        }

        // Process existing messages
        container.querySelectorAll('.message-content').forEach(processMessage);

        // Watch for new messages
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.classList?.contains('message-content')) {
                            processMessage(node);
                        } else {
                            node.querySelectorAll?.('.message-content')?.forEach(processMessage);
                        }
                    }
                });
            });
        });

        observer.observe(container, {
            childList: true,
            subtree: true
        });

        console.log('ChartRenderer: Auto-detection initialized for chat');
    }

    // Public API
    return {
        // Core
        render,
        renderFromApi,

        // Chart types
        barChart,
        lineChart,
        areaChart,
        pieChart,
        donutChart,
        comboChart,

        // Chat auto-detection
        init,
        parseChartData,
        processMessage,
        renderFromData,

        // API integration
        fetchChart,
        fetchBarChart,
        fetchLineChart,
        fetchPieChart,
        fetchDonutChart,

        // Utilities
        createContainer,
        getEmbedUrl,
        destroy,
        destroyAll,
        update,
        getInstance,

        // Constants
        COLORS,
        PIE_COLORS
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartRenderer;
}
