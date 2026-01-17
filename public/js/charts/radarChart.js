/**
 * INSIGHT 360 - Radar Chart Component
 * Version: 1.0.0
 *
 * Frontend component for rendering radar charts using Chart.js.
 * Automatically detects and renders radar chart data in message content.
 *
 * Usage:
 * 1. Include Chart.js: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
 * 2. Include this file: <script src="/js/charts/radarChart.js"></script>
 * 3. Call RadarChart.init() to enable auto-detection in chat messages
 * 4. Or manually: RadarChart.render(containerId, config)
 */

const RadarChart = (function() {
    'use strict';

    // Store chart instances for cleanup
    const chartInstances = new Map();

    // Default styling
    const DEFAULT_OPTIONS = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    padding: 20,
                    usePointStyle: true,
                    font: { size: 12 }
                }
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: { size: 14 },
                bodyFont: { size: 13 }
            }
        },
        scales: {
            r: {
                beginAtZero: true,
                max: 5,
                min: 0,
                ticks: {
                    stepSize: 1,
                    display: true,
                    backdropColor: 'transparent',
                    font: { size: 10 }
                },
                pointLabels: {
                    font: { size: 12, weight: '500' },
                    padding: 15
                },
                grid: {
                    circular: true,
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                angleLines: {
                    display: true,
                    color: 'rgba(0, 0, 0, 0.1)'
                }
            }
        },
        elements: {
            line: { tension: 0.1 }
        }
    };

    // Color palettes
    const COLORS = {
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

    /**
     * Render a radar chart in the specified container
     * @param {string|HTMLElement} container - Container ID or element
     * @param {Object} config - Chart configuration
     * @returns {Chart} Chart.js instance
     */
    function render(container, config) {
        const containerEl = typeof container === 'string'
            ? document.getElementById(container)
            : container;

        if (!containerEl) {
            console.error('RadarChart: Container not found:', container);
            return null;
        }

        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('RadarChart: Chart.js is not loaded');
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
        const containerId = containerEl.id || `radar-${Date.now()}`;
        if (chartInstances.has(containerId)) {
            chartInstances.get(containerId).destroy();
        }

        // Merge with default options
        const chartConfig = mergeConfig(config);

        // Create chart
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, chartConfig);

        chartInstances.set(containerId, chart);
        return chart;
    }

    /**
     * Merge user config with defaults
     * @param {Object} config - User configuration
     * @returns {Object} Merged configuration
     */
    function mergeConfig(config) {
        const colorKeys = Object.keys(COLORS);

        // Process datasets to add colors if not specified
        const datasets = (config.data?.datasets || []).map((ds, i) => {
            const color = COLORS[colorKeys[i % colorKeys.length]];
            return {
                ...ds,
                backgroundColor: ds.backgroundColor || color.background,
                borderColor: ds.borderColor || color.border,
                pointBackgroundColor: ds.pointBackgroundColor || color.point,
                borderWidth: ds.borderWidth || 2,
                pointRadius: ds.pointRadius || 4,
                pointHoverRadius: ds.pointHoverRadius || 6
            };
        });

        return {
            type: 'radar',
            data: {
                labels: config.data?.labels || [],
                datasets
            },
            options: {
                ...DEFAULT_OPTIONS,
                ...config.options,
                plugins: {
                    ...DEFAULT_OPTIONS.plugins,
                    ...(config.options?.plugins || {}),
                    title: config.options?.plugins?.title || {
                        display: !!config.title,
                        text: config.title || '',
                        font: { size: 16, weight: 'bold' },
                        padding: 20
                    }
                },
                scales: {
                    r: {
                        ...DEFAULT_OPTIONS.scales.r,
                        ...(config.options?.scales?.r || {}),
                        max: config.options?.scales?.r?.max || config.max || 5
                    }
                }
            }
        };
    }

    /**
     * Create a technology assessment radar chart
     * @param {string|HTMLElement} container - Container
     * @param {Object} assessment - Assessment data
     * @returns {Chart} Chart instance
     */
    function renderTechRadar(container, assessment) {
        const {
            name,
            maturity,
            relevance,
            capabilityGap,
            riskProfile,
            comparison
        } = assessment;

        const datasets = [{
            label: name,
            data: [
                maturity,
                relevance,
                5 - (capabilityGap || 0),  // Invert: higher = better capability
                5 - (riskProfile || 0)      // Invert: higher = lower risk
            ]
        }];

        if (comparison) {
            datasets.push({
                label: comparison.name || 'Comparison',
                data: [
                    comparison.maturity,
                    comparison.relevance,
                    5 - (comparison.capabilityGap || 0),
                    5 - (comparison.riskProfile || 0)
                ],
                backgroundColor: COLORS.secondary.background,
                borderColor: COLORS.secondary.border,
                pointBackgroundColor: COLORS.secondary.point
            });
        }

        return render(container, {
            title: `Technology Assessment: ${name}`,
            data: {
                labels: ['Maturity', 'Relevance', 'Capability', 'Low Risk'],
                datasets
            },
            max: 5
        });
    }

    /**
     * Create a capability comparison radar chart
     * @param {string|HTMLElement} container - Container
     * @param {Object} config - Comparison config
     * @returns {Chart} Chart instance
     */
    function renderCapabilityRadar(container, config) {
        const { title, dimensions, entities } = config;

        const colorKeys = Object.keys(COLORS);
        const datasets = entities.map((entity, i) => ({
            label: entity.name,
            data: dimensions.map(dim => entity.scores[dim] || 0),
            ...COLORS[colorKeys[i % colorKeys.length]]
        }));

        const maxValue = Math.max(
            ...entities.flatMap(e => Object.values(e.scores)),
            5
        );

        return render(container, {
            title,
            data: { labels: dimensions, datasets },
            max: maxValue
        });
    }

    /**
     * Parse JSON from a code block in markdown content
     * @param {string} content - Content to parse
     * @returns {Object|null} Parsed data or null
     */
    function parseChartData(content) {
        // Look for JSON code blocks with radar_chart or chart_config markers
        const jsonMatch = content.match(/```(?:json)?\s*\n(\{[\s\S]*?"(?:radar_chart|chartConfig|chart_config)"[\s\S]*?\})\s*\n```/);

        if (jsonMatch) {
            try {
                const data = JSON.parse(jsonMatch[1]);
                return data.radar_chart || data.chartConfig || data.chart_config || data;
            } catch (e) {
                console.warn('RadarChart: Failed to parse chart JSON:', e);
            }
        }

        // Look for embedded chart URL pattern and convert to data
        const urlMatch = content.match(/!\[.*?\]\((https:\/\/quickchart\.io\/chart\?c=([^)]+))\)/);
        if (urlMatch) {
            try {
                const chartJson = decodeURIComponent(urlMatch[2]);
                return JSON.parse(chartJson);
            } catch (e) {
                console.warn('RadarChart: Failed to parse QuickChart URL:', e);
            }
        }

        return null;
    }

    /**
     * Process a message element and render any embedded charts
     * @param {HTMLElement} messageEl - Message element
     */
    function processMessage(messageEl) {
        // Check if already processed
        if (messageEl.dataset.radarProcessed) return;

        const content = messageEl.textContent || '';

        // Try to find chart data
        const chartData = parseChartData(messageEl.innerHTML);

        if (chartData && chartData.type === 'radar') {
            // Create chart container
            const chartContainer = document.createElement('div');
            chartContainer.className = 'radar-chart-container';
            chartContainer.id = `radar-chart-${Date.now()}`;
            chartContainer.style.cssText = 'max-width: 500px; margin: 20px auto;';

            // Find the JSON code block and replace it with the chart
            const codeBlock = messageEl.querySelector('pre code');
            if (codeBlock && codeBlock.textContent.includes('radar')) {
                codeBlock.parentElement.replaceWith(chartContainer);
            } else {
                // Append at the start of the message
                messageEl.insertBefore(chartContainer, messageEl.firstChild);
            }

            // Render the chart
            render(chartContainer, chartData);
            messageEl.dataset.radarProcessed = 'true';
        }
    }

    /**
     * Initialize auto-detection for chat messages
     * @param {string} containerSelector - Selector for messages container
     */
    function init(containerSelector = '#chatMessages') {
        const container = document.querySelector(containerSelector);
        if (!container) {
            console.warn('RadarChart: Container not found:', containerSelector);
            return;
        }

        // Process existing messages
        container.querySelectorAll('.message-content').forEach(processMessage);

        // Watch for new messages
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if it's a message or contains messages
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

        console.log('RadarChart: Auto-detection initialized');
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
     * Create an inline chart element that can be inserted into content
     * @param {Object} config - Chart configuration
     * @param {Object} options - Display options
     * @returns {HTMLElement} Chart container element
     */
    function createInlineChart(config, options = {}) {
        const {
            width = 400,
            height = 400,
            className = 'inline-radar-chart'
        } = options;

        const container = document.createElement('div');
        container.className = className;
        container.style.cssText = `width: ${width}px; height: ${height}px; margin: 20px auto;`;
        container.id = `radar-inline-${Date.now()}`;

        // Render after element is in DOM
        setTimeout(() => render(container, config), 0);

        return container;
    }

    // Public API
    return {
        render,
        renderTechRadar,
        renderCapabilityRadar,
        createInlineChart,
        parseChartData,
        processMessage,
        init,
        destroy,
        destroyAll,
        COLORS,
        DEFAULT_OPTIONS
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RadarChart;
}
