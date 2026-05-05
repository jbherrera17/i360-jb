/**
 * Chat Interface — Insight 360
 * Multi-LLM chat with streaming, voice, and file support.
 *
 * This file is the orchestrator. It wires up the DOMContentLoaded
 * lifecycle and delegates to feature modules under public/js/chat/*.
 * See chat.html for the script load order.
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Ensure authFetch is available before making API calls
    if (typeof initNavigation === 'function') await initNavigation();

    // Load available models
    await loadModels();

    // Restore panel collapse state
    if (isPanelCollapsed) {
        const panel = document.querySelector('.chat-history-panel');
        if (panel) panel.classList.add('collapsed');
        updatePanelToggleIcon();
    }

    // Check if user is platform admin
    await checkPlatformAdmin();

    // Detect user's org for org filtering
    await detectUserOrg();

    // Load saved conversations
    await loadConversations();

    // Set up event listeners
    setupEventListeners();

    // Check URL params for initial state
    checkUrlParams();

    // Auto-resize textarea
    setupTextareaResize();

    // Initialize chart auto-detection for chat messages
    if (typeof ChartRenderer !== 'undefined' && ChartRenderer.init) {
        ChartRenderer.init('#chatMessages');
    }
    if (typeof RadarChart !== 'undefined' && RadarChart.init) {
        RadarChart.init('#chatMessages');
    }
});
