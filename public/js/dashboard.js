/**
 * Dashboard JavaScript - Insight 360
 * Handles system status and available models display
 * Version: 2.4.0
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

async function initializeDashboard() {
    await loadSystemStatus();
    await loadAvailableModels();
    await loadLLMProviderStatus();
}

/**
 * Load and display system status from health endpoint
 */
async function loadSystemStatus() {
    const serviceStatusEl = document.getElementById('serviceStatus');
    const overallStatusEl = document.getElementById('overallStatus');
    
    if (!serviceStatusEl || !overallStatusEl) return;
    
    try {
        const response = await fetch('/api/health');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Health API response:', data); // Debug logging
        
        // Handle various response formats
        let services = null;
        
        if (data.services) {
            // Expected format: { success: true, services: { ... } }
            services = data.services;
        } else if (data.status && typeof data.status === 'object') {
            // Alternative format: { status: { anthropic: true, ... } }
            services = data.status;
        } else if (typeof data === 'object' && !data.success && !data.error) {
            // Direct object format: { anthropic: true, openai: true, ... }
            services = data;
        }
        
        if (services) {
            let allOperational = true;
            let html = '';
            
            // Define service display order and icons (Lucide icon names)
            const serviceConfig = {
                anthropic: { name: 'Claude (Anthropic)', icon: 'bot' },
                openai: { name: 'GPT (OpenAI)', icon: 'brain' },
                gemini: { name: 'Gemini (Google)', icon: 'sparkles' },
                voice: { name: 'Voice (TTS/STT)', icon: 'mic' },
                search: { name: 'Web Search', icon: 'search' },
                supabase: { name: 'Database', icon: 'database' }
            };
            
            for (const [key, config] of Object.entries(serviceConfig)) {
                const isActive = services[key] === true;
                if (!isActive) allOperational = false;
                
                html += `
                    <div class="service-item ${isActive ? 'active' : 'inactive'}">
                        <span class="service-icon"><i data-lucide="${config.icon}" style="width:18px;height:18px;"></i></span>
                        <span class="service-name">${config.name}</span>
                        <span class="service-status">${isActive ? '✓ Ready' : '○ Offline'}</span>
                    </div>
                `;
            }
            
            serviceStatusEl.innerHTML = html;

            // Initialize Lucide icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // Update overall status badge
            if (allOperational) {
                overallStatusEl.textContent = 'All Systems Operational';
                overallStatusEl.className = 'status-badge status-operational';
            } else {
                overallStatusEl.textContent = 'Partial';
                overallStatusEl.className = 'status-badge status-partial';
            }
        } else {
            console.error('Unexpected response format:', data);
            throw new Error('Invalid response format - no services data found');
        }
    } catch (error) {
        console.error('Failed to load system status:', error);
        serviceStatusEl.innerHTML = '<p class="error-message">Unable to fetch system status</p>';
        overallStatusEl.textContent = 'Error';
        overallStatusEl.className = 'status-badge status-error';
    }
}

/**
 * Load and display available models from chat endpoint
 */
async function loadAvailableModels() {
    const modelListEl = document.getElementById('modelList');
    const modelCountEl = document.getElementById('modelCount');
    
    if (!modelListEl) return;
    
    try {
        const response = await fetch('/api/chat/models');
        const data = await response.json();
        
        if (data.success && data.models) {
            const models = data.models;
            let totalCount = 0;
            let html = '';
            
            // Provider configurations (Lucide icon names)
            const providerConfig = {
                anthropic: { name: 'Claude (Anthropic)', icon: 'bot', color: '#6366f1' },
                openai: { name: 'GPT (OpenAI)', icon: 'brain', color: '#10b981' },
                google: { name: 'Gemini (Google)', icon: 'sparkles', color: '#4285f4' }
            };
            
            // Iterate through providers
            for (const [provider, providerModels] of Object.entries(models)) {
                if (!Array.isArray(providerModels) || providerModels.length === 0) continue;
                
                const config = providerConfig[provider] || { name: provider, icon: 'wand-2', color: '#8b5cf6' };
                totalCount += providerModels.length;
                
                html += `
                    <div class="model-provider">
                        <div class="provider-header">
                            <span class="provider-icon"><i data-lucide="${config.icon}" style="width:18px;height:18px;"></i></span>
                            <span class="provider-name">${config.name}</span>
                            <span class="provider-count">${providerModels.length} models</span>
                        </div>
                        <div class="model-items">
                `;
                
                for (const model of providerModels) {
                    const tierClass = getTierClass(model.tier);
                    html += `
                        <div class="model-item">
                            <span class="model-name">${model.name}</span>
                            <span class="model-tier ${tierClass}">${model.tier}</span>
                        </div>
                    `;
                }
                
                html += `
                        </div>
                    </div>
                `;
            }
            
            if (totalCount === 0) {
                html = '<p class="no-models">No models available. Check API keys.</p>';
            }
            
            modelListEl.innerHTML = html;

            // Initialize Lucide icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // Update model count badge
            if (modelCountEl) {
                modelCountEl.textContent = totalCount;
            }
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Failed to load available models:', error);
        modelListEl.innerHTML = '<p class="error-message">Unable to fetch models</p>';
        if (modelCountEl) {
            modelCountEl.textContent = '0';
        }
    }
}

/**
 * Get CSS class for model tier badge
 */
function getTierClass(tier) {
    const tierClasses = {
        'premium': 'tier-premium',
        'flagship': 'tier-premium',
        'default': 'tier-default',
        'standard': 'tier-standard',
        'efficient': 'tier-efficient',
        'fast': 'tier-fast',
        'reasoning': 'tier-reasoning',
        'experimental': 'tier-experimental'
    };
    return tierClasses[tier] || 'tier-default';
}

/**
 * Load and display LLM provider availability status
 */
async function loadLLMProviderStatus() {
    const statusEl = document.getElementById('llmProviderStatus');
    const badgeEl = document.getElementById('llmOverallStatus');
    const lastCheckedEl = document.getElementById('llmLastChecked');
    const checkBtnEl = document.getElementById('llmCheckNowBtn');

    if (!statusEl || !badgeEl) return;

    try {
        // Check if user is admin to show check button
        const userRole = await getCurrentUserRole();
        const user = JSON.parse(localStorage.getItem('insight360-user') || '{}');
        if (checkBtnEl && (user.is_platform_admin || userRole?.toLowerCase() === 'admin' || userRole?.toLowerCase() === 'owner')) {
            checkBtnEl.style.display = 'inline-flex';
        }

        const response = await fetch('/api/models/availability');
        const data = await response.json();

        if (data.success && data.providers) {
            const providers = data.providers;
            let html = '';

            // Provider display config
            const providerConfig = {
                anthropic: { name: 'Claude (Anthropic)', icon: '🤖' },
                openai: { name: 'GPT (OpenAI)', icon: '🧠' },
                google: { name: 'Gemini (Google)', icon: '✨' },
                perplexity: { name: 'Sonar (Perplexity)', icon: '🔍' }
            };

            for (const [key, config] of Object.entries(providerConfig)) {
                const providerData = providers[key];

                if (!providerData) {
                    html += `
                        <div class="service-item inactive">
                            <span class="service-icon">${config.icon}</span>
                            <span class="service-name">${config.name}</span>
                            <span class="service-status">○ Not Checked</span>
                        </div>
                    `;
                    continue;
                }

                const status = providerData.status;
                const statusDisplay = getProviderStatusDisplay(status);

                html += `
                    <div class="service-item ${statusDisplay.class}">
                        <span class="service-icon">${config.icon}</span>
                        <span class="service-name">${config.name}</span>
                        <span class="service-status" title="${providerData.error || ''}">${statusDisplay.text}</span>
                    </div>
                `;
            }

            statusEl.innerHTML = html;

            // Update overall status badge
            const overall = data.overallStatus || 'unknown';
            if (overall === 'healthy') {
                badgeEl.textContent = 'All Available';
                badgeEl.className = 'status-badge status-operational';
            } else if (overall === 'warning') {
                badgeEl.textContent = 'Warning';
                badgeEl.className = 'status-badge status-warning';
            } else if (overall === 'error') {
                badgeEl.textContent = 'Issues';
                badgeEl.className = 'status-badge status-error';
            } else {
                badgeEl.textContent = 'Unknown';
                badgeEl.className = 'status-badge status-partial';
            }

            // Update last checked time
            if (lastCheckedEl && data.lastChecked) {
                const lastChecked = new Date(data.lastChecked);
                lastCheckedEl.textContent = formatRelativeTime(lastChecked);
            } else if (lastCheckedEl) {
                lastCheckedEl.textContent = 'Never';
            }
        } else {
            // No data yet
            statusEl.innerHTML = '<p class="text-muted" style="font-size: 0.85rem;">No availability checks recorded yet.</p>';
            badgeEl.textContent = 'Not Checked';
            badgeEl.className = 'status-badge status-partial';
        }
    } catch (error) {
        console.error('Failed to load LLM provider status:', error);
        statusEl.innerHTML = '<p class="error-message">Unable to fetch provider status</p>';
        badgeEl.textContent = 'Error';
        badgeEl.className = 'status-badge status-error';
    }
}

/**
 * Get display properties for provider status
 */
function getProviderStatusDisplay(status) {
    const displays = {
        'available': { class: 'active', text: '✓ Available' },
        'deprecated': { class: 'warning', text: '⚠ Deprecated' },
        'unavailable': { class: 'inactive', text: '✗ Unavailable' },
        'auth_error': { class: 'inactive', text: '🔒 Auth Error' },
        'rate_limited': { class: 'warning', text: '⏳ Rate Limited' },
        'billing_error': { class: 'warning', text: '💳 Billing Issue' }
    };
    return displays[status] || { class: 'inactive', text: '○ Unknown' };
}

/**
 * Format a date as relative time (e.g., "5 minutes ago")
 */
function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
}

/**
 * Get current user role (admin check)
 */
async function getCurrentUserRole() {
    try {
        const token = localStorage.getItem('insight360_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch('/api/auth/me', { headers });
        const data = await response.json();
        return data.user?.business_role || data.user?.role || 'user';
    } catch (error) {
        console.error('Failed to get user role:', error);
        return 'user';
    }
}

/**
 * Run an on-demand LLM availability check (admin only)
 */
async function runLLMCheck() {
    const checkBtnEl = document.getElementById('llmCheckNowBtn');
    const badgeEl = document.getElementById('llmOverallStatus');
    const statusEl = document.getElementById('llmProviderStatus');
    const lastCheckedEl = document.getElementById('llmLastChecked');

    if (checkBtnEl) {
        checkBtnEl.disabled = true;
        checkBtnEl.innerHTML = '<i data-lucide="loader-2" style="width: 12px; height: 12px; margin-right: 4px;" class="spin"></i> Checking...';
    }

    if (badgeEl) {
        badgeEl.textContent = 'Checking...';
        badgeEl.className = 'status-badge status-loading';
    }

    try {
        const token = localStorage.getItem('insight360_token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };

        const response = await fetch('/api/models/availability/check', {
            method: 'POST',
            headers
        });

        const data = await response.json();

        if (data.success) {
            // Use the results directly from the check response
            // The POST response includes: providers, overallStatus, checkedAt
            const providers = data.providers || {};

            // Provider display config
            const providerConfig = {
                anthropic: { name: 'Claude (Anthropic)', icon: '🤖' },
                openai: { name: 'GPT (OpenAI)', icon: '🧠' },
                google: { name: 'Gemini (Google)', icon: '✨' },
                perplexity: { name: 'Sonar (Perplexity)', icon: '🔍' }
            };

            let html = '';
            for (const [key, config] of Object.entries(providerConfig)) {
                const providerData = providers[key];

                if (!providerData) {
                    html += `
                        <div class="service-item inactive">
                            <span class="service-icon">${config.icon}</span>
                            <span class="service-name">${config.name}</span>
                            <span class="service-status">○ Not Checked</span>
                        </div>
                    `;
                    continue;
                }

                const status = providerData.status;
                const statusDisplay = getProviderStatusDisplay(status);

                html += `
                    <div class="service-item ${statusDisplay.class}">
                        <span class="service-icon">${config.icon}</span>
                        <span class="service-name">${config.name}</span>
                        <span class="service-status" title="${providerData.error || ''}">${statusDisplay.text}</span>
                    </div>
                `;
            }

            if (statusEl) {
                statusEl.innerHTML = html;
            }

            // Update overall status badge
            const overall = data.overallStatus || 'unknown';
            if (badgeEl) {
                if (overall === 'healthy') {
                    badgeEl.textContent = 'All Available';
                    badgeEl.className = 'status-badge status-operational';
                } else if (overall === 'warning') {
                    badgeEl.textContent = 'Warning';
                    badgeEl.className = 'status-badge status-warning';
                } else if (overall === 'error') {
                    badgeEl.textContent = 'Issues';
                    badgeEl.className = 'status-badge status-error';
                } else {
                    badgeEl.textContent = 'Unknown';
                    badgeEl.className = 'status-badge status-partial';
                }
            }

            // Update last checked time using checkedAt from response
            if (lastCheckedEl && data.checkedAt) {
                const lastChecked = new Date(data.checkedAt);
                lastCheckedEl.textContent = formatRelativeTime(lastChecked);
            } else if (lastCheckedEl) {
                lastCheckedEl.textContent = 'Just now';
            }
        } else {
            throw new Error(data.error || 'Check failed');
        }
    } catch (error) {
        console.error('Failed to run LLM check:', error);
        if (badgeEl) {
            badgeEl.textContent = 'Check Failed';
            badgeEl.className = 'status-badge status-error';
        }
    } finally {
        if (checkBtnEl) {
            checkBtnEl.disabled = false;
            checkBtnEl.innerHTML = '<i data-lucide="refresh-cw" style="width: 12px; height: 12px; margin-right: 4px;"></i> Check Now';
            // Re-initialize lucide icons for the new icon
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }
}