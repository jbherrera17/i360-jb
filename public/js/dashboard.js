/**
 * Dashboard - Insight 360
 * System status, model listing, and quick actions
 * Version: 2.2.0
 */

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Load system status
    await checkSystemStatus();

    // Load available models
    await loadModels();

    // Refresh status every 30 seconds
    setInterval(checkSystemStatus, 30000);
});

// ============================================
// SYSTEM STATUS
// ============================================

async function checkSystemStatus() {
    const statusBadge = document.getElementById('overallStatus');
    const serviceContainer = document.getElementById('serviceStatus');

    try {
        const response = await fetch('/api/health');
        const data = await response.json();

        if (!response.ok) {
            throw new Error('Health check failed');
        }

        // Update overall status badge
        const allOperational = Object.values(data.services).every(s => s === true);
        const someOperational = Object.values(data.services).some(s => s === true);

        if (allOperational) {
            statusBadge.textContent = 'All Systems Go';
            statusBadge.className = 'status-badge status-operational';
        } else if (someOperational) {
            statusBadge.textContent = 'Partial';
            statusBadge.className = 'status-badge status-partial';
        } else {
            statusBadge.textContent = 'Offline';
            statusBadge.className = 'status-badge status-offline';
        }

        // Render service list
        const services = [
            { key: 'anthropic', name: 'Claude (Anthropic)', icon: 'brain' },
            { key: 'openai', name: 'GPT (OpenAI)', icon: 'sparkles' },
            { key: 'voice', name: 'Voice (TTS/STT)', icon: 'mic' },
            { key: 'search', name: 'Web Search', icon: 'search' },
            { key: 'supabase', name: 'Database', icon: 'database' }
        ];

        serviceContainer.innerHTML = services.map(service => {
            const isOnline = data.services[service.key] === true;
            return `
                <div class="service-item">
                    <div class="service-info">
                        <i data-lucide="${service.icon}"></i>
                        <span>${service.name}</span>
                    </div>
                    <span class="service-status ${isOnline ? 'online' : 'offline'}">
                        ${isOnline ? '● Online' : '○ Offline'}
                    </span>
                </div>
            `;
        }).join('');

        // Reinitialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

    } catch (error) {
        console.error('Failed to check system status:', error);
        
        statusBadge.textContent = 'Error';
        statusBadge.className = 'status-badge status-offline';
        
        serviceContainer.innerHTML = `
            <div class="service-error">
                <i data-lucide="alert-triangle"></i>
                <span>Unable to fetch system status</span>
            </div>
        `;

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

// ============================================
// MODELS
// ============================================

async function loadModels() {
    const modelCount = document.getElementById('modelCount');
    const modelList = document.getElementById('modelList');

    try {
        const response = await fetch('/api/chat/models');
        const data = await response.json();

        if (!response.ok) {
            throw new Error('Failed to load models');
        }

        // Count total models
        let total = 0;
        const allModels = [];

        if (data.models) {
            if (data.models.anthropic) {
                total += data.models.anthropic.length;
                data.models.anthropic.forEach(m => allModels.push({ ...m, provider: 'Claude' }));
            }
            if (data.models.openai) {
                total += data.models.openai.length;
                data.models.openai.forEach(m => allModels.push({ ...m, provider: 'GPT' }));
            }
        }

        modelCount.textContent = total;

        // Render model list (show first 6)
        const displayModels = allModels.slice(0, 6);
        
        modelList.innerHTML = displayModels.map(model => `
            <div class="model-item">
                <div class="model-info">
                    <span class="model-name">${model.name}</span>
                    <span class="model-provider">${model.provider}</span>
                </div>
                <span class="model-tier tier-${model.tier || 'standard'}">${model.tier || 'standard'}</span>
            </div>
        `).join('');

        // Add "view all" link if more models exist
        if (allModels.length > 6) {
            modelList.innerHTML += `
                <a href="/chat.html" class="view-all-link">
                    View all ${total} models →
                </a>
            `;
        }

    } catch (error) {
        console.error('Failed to load models:', error);
        
        modelCount.textContent = '0';
        modelList.innerHTML = `
            <p class="no-models">Unable to load models</p>
        `;
    }
}

// ============================================
// STYLES (injected)
// ============================================

const styles = `
    /* Service List */
    .service-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .service-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: var(--bg-tertiary, #252540);
        border-radius: 8px;
    }

    .service-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: var(--text-secondary, #a0a0b0);
    }

    .service-info i {
        width: 18px;
        height: 18px;
        color: var(--text-muted, #6b6b80);
    }

    .service-status {
        font-size: 0.85rem;
        font-weight: 500;
    }

    .service-status.online {
        color: #10b981;
    }

    .service-status.offline {
        color: #ef4444;
    }

    .service-error {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem;
        color: var(--text-muted, #6b6b80);
    }

    .service-error i {
        width: 18px;
        height: 18px;
        color: #f59e0b;
    }

    /* Status Badges */
    .status-badge {
        padding: 0.35rem 0.75rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
    }

    .status-loading {
        background: rgba(107, 107, 128, 0.2);
        color: #6b6b80;
    }

    .status-operational {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
    }

    .status-partial {
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
    }

    .status-offline {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
    }

    /* Model List */
    .model-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .model-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.6rem 0.75rem;
        background: var(--bg-tertiary, #252540);
        border-radius: 6px;
    }

    .model-info {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
    }

    .model-name {
        font-weight: 500;
        color: var(--text-primary, #ffffff);
        font-size: 0.9rem;
    }

    .model-provider {
        font-size: 0.75rem;
        color: var(--text-muted, #6b6b80);
    }

    .model-tier {
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
    }

    .tier-premium {
        background: rgba(139, 92, 246, 0.2);
        color: #8b5cf6;
    }

    .tier-default {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
    }

    .tier-standard {
        background: rgba(99, 102, 241, 0.2);
        color: #6366f1;
    }

    .tier-fast {
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
    }

    .tier-efficient {
        background: rgba(59, 130, 246, 0.2);
        color: #3b82f6;
    }

    .tier-flagship {
        background: rgba(236, 72, 153, 0.2);
        color: #ec4899;
    }

    .tier-reasoning {
        background: rgba(20, 184, 166, 0.2);
        color: #14b8a6;
    }

    .view-all-link {
        display: block;
        text-align: center;
        padding: 0.75rem;
        color: var(--primary, #6366f1);
        text-decoration: none;
        font-size: 0.9rem;
        transition: color 0.2s;
    }

    .view-all-link:hover {
        color: var(--primary-dark, #4f46e5);
    }

    .no-models {
        text-align: center;
        color: var(--text-muted, #6b6b80);
        padding: 1rem;
    }

    .count-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        height: 24px;
        padding: 0 0.5rem;
        background: var(--primary, #6366f1);
        color: white;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 600;
    }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);
