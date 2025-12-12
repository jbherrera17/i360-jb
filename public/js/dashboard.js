/**
 * Dashboard JavaScript - Insight 360
 * Handles system status and available models display
 * Version: 2.3.0
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

async function initializeDashboard() {
    await loadSystemStatus();
    await loadAvailableModels();
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
            
            // Define service display order and icons
            const serviceConfig = {
                anthropic: { name: 'Claude (Anthropic)', icon: '🤖' },
                openai: { name: 'GPT (OpenAI)', icon: '🧠' },
                voice: { name: 'Voice (TTS/STT)', icon: '🎤' },
                search: { name: 'Web Search', icon: '🔍' },
                supabase: { name: 'Database', icon: '💾' }
            };
            
            for (const [key, config] of Object.entries(serviceConfig)) {
                const isActive = services[key] === true;
                if (!isActive) allOperational = false;
                
                html += `
                    <div class="service-item ${isActive ? 'active' : 'inactive'}">
                        <span class="service-icon">${config.icon}</span>
                        <span class="service-name">${config.name}</span>
                        <span class="service-status">${isActive ? '✓ Ready' : '○ Offline'}</span>
                    </div>
                `;
            }
            
            serviceStatusEl.innerHTML = html;
            
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
            
            // Provider configurations
            const providerConfig = {
                anthropic: { name: 'Claude (Anthropic)', icon: '🤖', color: '#6366f1' },
                openai: { name: 'GPT (OpenAI)', icon: '🧠', color: '#10b981' }
            };
            
            // Iterate through providers
            for (const [provider, providerModels] of Object.entries(models)) {
                if (!Array.isArray(providerModels) || providerModels.length === 0) continue;
                
                const config = providerConfig[provider] || { name: provider, icon: '🔮', color: '#8b5cf6' };
                totalCount += providerModels.length;
                
                html += `
                    <div class="model-provider">
                        <div class="provider-header">
                            <span class="provider-icon">${config.icon}</span>
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
        'reasoning': 'tier-reasoning'
    };
    return tierClasses[tier] || 'tier-default';
}