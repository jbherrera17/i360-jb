/* global authFetch */
/**
 * LLM Health Monitoring - Frontend Module
 *
 * Provides real-time LLM provider health status via SSE.
 * Exposes window.LLMHealth for use by model selectors and chat.
 *
 * Version: 1.0.0
 */

(function() {
    'use strict';

    const LLMHealth = {
        _status: {},
        _eventSource: null,
        _reconnectDelay: 1000,
        _maxReconnectDelay: 30000,
        _initialized: false,

        /**
         * Initialize the health monitor
         */
        init() {
            if (this._initialized) return;
            this._initialized = true;

            // Fetch initial status
            this._fetchInitialStatus();

            // Open SSE connection
            this._connectSSE();
        },

        /**
         * Check if a provider is available
         */
        isProviderAvailable(provider) {
            const info = this._status[provider];
            if (!info) return true; // Assume healthy until we know otherwise
            // billing_error is an account issue, not a provider outage — models still work
            return info.status === 'available' || info.status === 'billing_error';
        },

        /**
         * Get a provider's status info
         */
        getProviderStatus(provider) {
            return this._status[provider] || null;
        },

        /**
         * Get all provider statuses
         */
        getAllStatuses() {
            return { ...this._status };
        },

        /**
         * Fetch initial status from REST API
         */
        async _fetchInitialStatus() {
            try {
                const token = document.cookie.match(/auth_token=([^;]+)/)?.[1];
                const resp = await (typeof authFetch === 'function' ? authFetch : fetch)('/api/models/availability', {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.success && data.providers) {
                        for (const [provider, info] of Object.entries(data.providers)) {
                            this._status[provider] = info;
                        }
                        this._dispatchChange();
                    }
                }
            } catch (e) {
                // Non-critical — SSE will provide updates
            }
        },

        /**
         * Connect to SSE health stream
         */
        _connectSSE() {
            if (typeof EventSource === 'undefined') return;

            try {
                this._eventSource = new EventSource('/api/health/stream');

                this._eventSource.addEventListener('init', (e) => {
                    try {
                        const data = JSON.parse(e.data);
                        for (const [provider, info] of Object.entries(data)) {
                            this._status[provider] = info;
                        }
                        this._dispatchChange();
                        this._reconnectDelay = 1000; // Reset on successful connect
                    } catch (err) {
                        // Ignore parse errors
                    }
                });

                this._eventSource.addEventListener('status-change', (e) => {
                    try {
                        const event = JSON.parse(e.data);
                        const { provider, newStatus, error, updatedAt } = event;

                        const oldInfo = this._status[provider];
                        this._status[provider] = {
                            status: newStatus,
                            responseTime: oldInfo?.responseTime || 0,
                            error: error,
                            updatedAt: updatedAt
                        };

                        this._dispatchChange(event);
                        this._showStatusToast(event);
                    } catch (err) {
                        // Ignore parse errors
                    }
                });

                this._eventSource.onerror = () => {
                    this._eventSource.close();
                    this._eventSource = null;

                    // Exponential backoff reconnect
                    setTimeout(() => this._connectSSE(), this._reconnectDelay);
                    this._reconnectDelay = Math.min(
                        this._reconnectDelay * 2,
                        this._maxReconnectDelay
                    );
                };
            } catch (e) {
                // SSE not supported or blocked — degrade gracefully
            }
        },

        /**
         * Dispatch a custom event for UI components to listen to
         */
        _dispatchChange(detail) {
            document.dispatchEvent(new CustomEvent('llm-health-change', {
                detail: detail || { statuses: this._status }
            }));
        },

        /**
         * Show toast notification for provider status changes
         */
        _showStatusToast(event) {
            if (typeof showToast !== 'function') return;

            const providerNames = {
                anthropic: 'Anthropic (Claude)',
                openai: 'OpenAI (GPT)',
                google: 'Google (Gemini)',
                perplexity: 'Perplexity'
            };

            const name = providerNames[event.provider] || event.provider;

            if (event.newStatus === 'billing_error') {
                showToast(`${name} has a billing issue. Check your API plan and credits.`, 'warning');
            } else if (event.newStatus === 'unavailable') {
                showToast(`${name} is currently unavailable. Requests will automatically use fallback models.`, 'warning');
            } else if (event.newStatus === 'available' && (event.oldStatus === 'unavailable' || event.oldStatus === 'billing_error')) {
                showToast(`${name} is back online.`, 'success');
            }
        },

        /**
         * Clean up SSE connection
         */
        destroy() {
            if (this._eventSource) {
                this._eventSource.close();
                this._eventSource = null;
            }
            this._initialized = false;
        }
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => LLMHealth.init());
    } else {
        LLMHealth.init();
    }

    // Expose globally
    window.LLMHealth = LLMHealth;
})();
