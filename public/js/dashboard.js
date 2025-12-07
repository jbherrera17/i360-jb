/**
 * Dashboard JavaScript
 * Insight 360 - AI Command Center
 * 
 * Handles system status display and available models
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Initialize dashboard
    checkSystemStatus();
    loadAvailableModels();
    
    // Refresh status every 30 seconds
    setInterval(checkSystemStatus, 30000);
});

/**
 * Check system status and update UI
 */
async function checkSystemStatus() {
    const statusGrid = document.getElementById('serviceStatus') || document.getElementById('status-grid');
    const overallStatus = document.getElementById('overallStatus');
    
    if (!statusGrid) {
        console.warn('Status grid element not found');
        return;
    }

    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        
        // Update service status indicators
        updateServiceStatus('anthropic', data.services?.anthropic, 'Claude');
        updateServiceStatus('openai', data.services?.openai, 'OpenAI');
        updateServiceStatus('search', data.services?.search, 'Web Search');
        updateServiceStatus('supabase', data.services?.supabase, 'Database');
        updateServiceStatus('voice', data.services?.voice, 'Voice');
        
        // Update overall status badge
        if (overallStatus) {
            overallStatus.className = 'status-badge';
            if (data.status === 'all_operational') {
                overallStatus.textContent = 'All Systems Go';
                overallStatus.classList.add('status-ok');
            } else if (data.status === 'partial') {
                overallStatus.textContent = 'Partial';
                overallStatus.classList.add('status-warning');
            } else {
                overallStatus.textContent = 'Offline';
                overallStatus.classList.add('status-error');
            }
        }
        
        // If using the older dashboard format with status dots
        const statusDots = {
            'status-anthropic': data.services?.anthropic,
            'status-openai': data.services?.openai,
            'status-search': data.services?.search,
            'status-supabase': data.services?.supabase
        };
        
        for (const [id, isActive] of Object.entries(statusDots)) {
            const dot = document.getElementById(id);
            if (dot) {
                dot.classList.toggle('active', isActive);
                dot.classList.toggle('inactive', !isActive);
            }
        }
        
    } catch (error) {
        console.error('Failed to check system status:', error);
        if (overallStatus) {
            overallStatus.textContent = 'Error';
            overallStatus.className = 'status-badge status-error';
        }
    }
}

/**
 * Update individual service status
 */
function updateServiceStatus(service, isActive, label) {
    const serviceList = document.getElementById('serviceStatus');
    if (!serviceList) return;
    
    let serviceItem = document.getElementById(`service-${service}`);
    
    if (!serviceItem) {
        // Create service item if it doesn't exist
        serviceItem = document.createElement('div');
        serviceItem.id = `service-${service}`;
        serviceItem.className = 'service-item';
        serviceList.appendChild(serviceItem);
    }
    
    serviceItem.innerHTML = `
        <span class="service-indicator ${isActive ? 'active' : 'inactive'}"></span>
        <span class="service-name">${label}</span>
        <span class="service-status">${isActive ? 'Online' : 'Offline'}</span>
    `;
}

/**
 * Load available models from API
 */
async function loadAvailableModels() {
    const modelList = document.getElementById('modelList');
    const modelCount = document.getElementById('modelCount');
    
    if (!modelList) {
        console.warn('Model list element not found');
        return;
    }

    try {
        const response = await fetch('/api/chat/models');
        const data = await response.json();
        
        if (!data.models || Object.keys(data.models).length === 0) {
            modelList.innerHTML = '<p class="no-models">No models available</p>';
            if (modelCount) modelCount.textContent = '0';
            return;
        }
        
        // data.models is already grouped by provider: { anthropic: [...], openai: [...] }
        let html = '';
        let totalCount = 0;
        
        // Map provider keys to display names
        const providerNames = {
            'anthropic': 'Anthropic',
            'openai': 'OpenAI',
            'perplexity': 'Perplexity',
            'google': 'Google'
        };
        
        for (const [providerKey, models] of Object.entries(data.models)) {
            if (!Array.isArray(models) || models.length === 0) continue;
            
            const providerName = providerNames[providerKey] || providerKey;
            const providerClass = providerKey.toLowerCase();
            const providerIcon = getProviderIcon(providerName);
            
            html += `
                <div class="model-group">
                    <div class="model-group-header ${providerClass}">
                        <span class="provider-icon">${providerIcon}</span>
                        <span class="provider-name">${providerName}</span>
                        <span class="provider-count">${models.length}</span>
                    </div>
                    <div class="model-items">
            `;
            
            models.forEach(model => {
                // Handle both object format { id, name, tier } and string format
                const modelName = typeof model === 'object' ? (model.name || model.id) : model;
                const modelTier = typeof model === 'object' ? model.tier : null;
                const tierClass = getTierClass(modelTier || modelName);
                const displayTier = modelTier || getTierFromName(modelName);
                
                html += `
                    <div class="model-item">
                        <span class="model-name">${formatModelName(modelName)}</span>
                        <span class="model-tier ${tierClass}">${displayTier}</span>
                    </div>
                `;
                totalCount++;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        modelList.innerHTML = html || '<p class="no-models">No models available</p>';
        
        if (modelCount) {
            modelCount.textContent = totalCount.toString();
        }
        
    } catch (error) {
        console.error('Failed to load models:', error);
        modelList.innerHTML = '<p class="error-message">Failed to load models</p>';
    }
}

/**
 * Format model ID to readable name
 */
function formatModelName(modelId) {
    if (!modelId) return 'Unknown';
    
    // Common model name mappings
    const nameMap = {
        'claude-opus-4-5-20250929': 'Claude Opus 4.5',
        'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5',
        'claude-haiku-4-5-20250929': 'Claude Haiku 4.5',
        'claude-opus-4-20250514': 'Claude Opus 4',
        'claude-sonnet-4-20250514': 'Claude Sonnet 4',
        'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
        'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
        'gpt-4o': 'GPT-4o',
        'gpt-4o-mini': 'GPT-4o Mini',
        'gpt-4-turbo': 'GPT-4 Turbo',
        'gpt-4.1': 'GPT-4.1',
        'gpt-4.1-mini': 'GPT-4.1 Mini',
        'gpt-4.1-nano': 'GPT-4.1 Nano',
        'o1': 'o1',
        'o1-mini': 'o1 Mini',
        'o1-preview': 'o1 Preview',
        'o3': 'o3',
        'o3-mini': 'o3 Mini',
        'o4-mini': 'o4 Mini'
    };
    
    return nameMap[modelId] || modelId;
}

/**
 * Get tier from model name
 */
function getTierFromName(name) {
    const nameLower = (name || '').toLowerCase();
    if (nameLower.includes('opus')) return 'Premium';
    if (nameLower.includes('4o') && !nameLower.includes('mini')) return 'Flagship';
    if (nameLower.includes('4.1') && !nameLower.includes('mini') && !nameLower.includes('nano')) return 'Flagship';
    if (nameLower.includes('sonnet')) return 'Standard';
    if (nameLower.includes('haiku') || nameLower.includes('mini') || nameLower.includes('nano')) return 'Fast';
    if (nameLower.includes('o1') || nameLower.includes('o3') || nameLower.includes('o4')) return 'Reasoning';
    return 'Standard';
}

/**
 * Get provider icon
 */
function getProviderIcon(provider) {
    const icons = {
        'Anthropic': '🟠',
        'Claude': '🟠',
        'OpenAI': '🟢',
        'GPT': '🟢',
        'Perplexity': '🟣',
        'Google': '🔵',
        'Gemini': '🔵'
    };
    return icons[provider] || '⚪';
}

/**
 * Get tier CSS class
 */
function getTierClass(tier) {
    const tierLower = (tier || '').toLowerCase();
    if (tierLower.includes('premium') || tierLower.includes('opus')) return 'tier-premium';
    if (tierLower.includes('flagship') || tierLower.includes('4o')) return 'tier-flagship';
    if (tierLower.includes('fast') || tierLower.includes('haiku') || tierLower.includes('mini') || tierLower.includes('nano')) return 'tier-fast';
    if (tierLower.includes('reasoning') || tierLower.includes('o1') || tierLower.includes('o3') || tierLower.includes('o4')) return 'tier-reasoning';
    if (tierLower.includes('search') || tierLower.includes('sonar')) return 'tier-search';
    return 'tier-standard';
}
