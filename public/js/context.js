/**
 * Context Assets Admin - Insight 360
 * Phase 3: Context Asset Management UI
 * Version: 2.2.2 - Fixed API response handling
 */

// ============================================
// STATE MANAGEMENT
// ============================================

const state = {
    assets: [],
    assetTypes: [],
    selectedAsset: null,
    filters: {
        type: '',
        search: '',
        status: 'current'
    },
    isDirty: false
};

// ============================================
// API HELPER
// ============================================

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Context Admin initializing...');
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Load data
    await loadAssetTypes();
    await loadAssets();
    
    // Set up event listeners
    setupEventListeners();
    
    // Make plain text editor read-only
    const plainTextEditor = document.getElementById('plainTextEditor');
    if (plainTextEditor) {
        plainTextEditor.readOnly = true;
        plainTextEditor.style.backgroundColor = 'var(--bg-tertiary)';
        plainTextEditor.style.cursor = 'not-allowed';
        plainTextEditor.placeholder = 'Auto-generated from JSON content (read-only)';
    }
    
    console.log('Context Admin ready');
});

// ============================================
// DATA LOADING
// ============================================

async function loadAssetTypes() {
    try {
        const response = await apiCall('/api/context/types');
        // API returns { success: true, data: [...] }
        state.assetTypes = response.data || [];
        populateTypeFilters();
        console.log(`Loaded ${state.assetTypes.length} asset types`);
    } catch (error) {
        console.error('Failed to load asset types:', error);
        // Use fallback types if API fails
        state.assetTypes = getDefaultAssetTypes();
        populateTypeFilters();
    }
}

async function loadAssets() {
    try {
        const params = new URLSearchParams();
        if (state.filters.type) params.append('type', state.filters.type);
        if (state.filters.search) params.append('search', state.filters.search);
        if (state.filters.status === 'archived') {
            params.append('archived', 'true');
        } else {
            params.append('current', 'true');
        }
        
        const response = await apiCall(`/api/context/assets?${params}`);
        // API returns { success: true, data: [...] }
        state.assets = response.data || [];
        renderAssetList();
        updateStats();
        console.log(`Loaded ${state.assets.length} assets`);
    } catch (error) {
        console.error('Failed to load assets:', error);
        state.assets = [];
        renderAssetList();
    }
}

// ============================================
// DEFAULT ASSET TYPES (Fallback)
// ============================================

function getDefaultAssetTypes() {
    return [
        { type_key: 'voice_dna', icon: '🎤', display_name: 'VoiceDNA', category: 'core' },
        { type_key: 'icp', icon: '👤', display_name: 'ICP', category: 'core' },
        { type_key: 'products', icon: '📦', display_name: 'Products', category: 'core' },
        { type_key: 'company_description', icon: '🏢', display_name: 'Company Description', category: 'core' },
        { type_key: 'why_we_win', icon: '🏆', display_name: 'Why We Win', category: 'core' },
        { type_key: 'core_values', icon: '💎', display_name: 'Core Values', category: 'core' },
        { type_key: 'pain_points', icon: '🎯', display_name: 'Pain Points', category: 'core' },
        { type_key: 'custom_processes', icon: '⚙️', display_name: 'Custom Processes', category: 'core' },
        { type_key: 'competitors', icon: '⚔️', display_name: 'Competitors', category: 'extended' },
        { type_key: 'case_studies', icon: '📖', display_name: 'Case Studies', category: 'extended' },
        { type_key: 'faqs', icon: '❓', display_name: 'FAQs', category: 'extended' },
        { type_key: 'team_bios', icon: '👥', display_name: 'Team Bios', category: 'extended' },
        { type_key: 'industry_context', icon: '🌐', display_name: 'Industry Context', category: 'extended' },
        { type_key: 'terminology', icon: '📚', display_name: 'Terminology', category: 'extended' },
        { type_key: 'templates', icon: '📝', display_name: 'Templates', category: 'extended' },
        { type_key: 'pricing', icon: '💰', display_name: 'Pricing', category: 'extended' },
        { type_key: 'brand_guidelines', icon: '🎨', display_name: 'Brand Guidelines', category: 'extended' },
        { type_key: 'personas', icon: '🎭', display_name: 'Personas', category: 'extended' }
    ];
}

// ============================================
// UI POPULATION
// ============================================

function populateTypeFilters() {
    const filterSelect = document.getElementById('typeFilter');
    const createSelect = document.getElementById('assetType');
    
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">All Types</option>';
        state.assetTypes.forEach(type => {
            filterSelect.innerHTML += `<option value="${type.type_key}">${type.icon} ${type.display_name}</option>`;
        });
    }
    
    if (createSelect) {
        createSelect.innerHTML = '<option value="">Select Type...</option>';
        
        // Core types
        const coreTypes = state.assetTypes.filter(t => t.category === 'core');
        if (coreTypes.length > 0) {
            createSelect.innerHTML += '<optgroup label="Core Types">';
            coreTypes.forEach(type => {
                createSelect.innerHTML += `<option value="${type.type_key}">${type.icon} ${type.display_name}</option>`;
            });
            createSelect.innerHTML += '</optgroup>';
        }
        
        // Extended types
        const extendedTypes = state.assetTypes.filter(t => t.category === 'extended');
        if (extendedTypes.length > 0) {
            createSelect.innerHTML += '<optgroup label="Extended Types">';
            extendedTypes.forEach(type => {
                createSelect.innerHTML += `<option value="${type.type_key}">${type.icon} ${type.display_name}</option>`;
            });
            createSelect.innerHTML += '</optgroup>';
        }
    }
}

function renderAssetList() {
    const container = document.getElementById('assetList');
    if (!container) return;
    
    if (state.assets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <h3>No Assets Found</h3>
                <p>Create your first context asset to get started.</p>
                <button onclick="showCreateModal()" class="btn-primary">
                    <i data-lucide="plus"></i> Create Asset
                </button>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }
    
    container.innerHTML = state.assets.map(asset => {
        const typeInfo = state.assetTypes.find(t => t.type_key === asset.asset_type) || 
                        { icon: '📄', display_name: asset.asset_type };
        
        return `
            <div class="asset-item ${state.selectedAsset?.id === asset.id ? 'selected' : ''}" 
                 onclick="selectAsset('${asset.id}')">
                <div class="asset-icon">${typeInfo.icon}</div>
                <div class="asset-info">
                    <div class="asset-name">${escapeHtml(asset.name)}</div>
                    <div class="asset-meta">
                        ${typeInfo.display_name} • v${asset.version || 1}
                    </div>
                </div>
                <div class="asset-actions">
                    <button onclick="event.stopPropagation(); editAsset('${asset.id}')" 
                            class="btn-icon" title="Edit">
                        <i data-lucide="edit-2"></i>
                    </button>
                    <button onclick="event.stopPropagation(); deleteAsset('${asset.id}')" 
                            class="btn-icon btn-danger" title="Delete">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateStats() {
    const countEl = document.getElementById('assetCount');
    if (countEl) {
        countEl.textContent = state.assets.length;
    }
}

// ============================================
// ASSET SELECTION & EDITING
// ============================================

async function selectAsset(id) {
    const asset = state.assets.find(a => a.id === id);
    if (!asset) return;
    
    state.selectedAsset = asset;
    renderAssetList();
    loadAssetIntoEditor(asset);
}

function loadAssetIntoEditor(asset) {
    // Update form fields
    const nameInput = document.getElementById('assetName');
    const descInput = document.getElementById('assetDescription');
    const typeSelect = document.getElementById('assetType');
    const tagsInput = document.getElementById('assetTags');
    const jsonEditor = document.getElementById('jsonEditor');
    const plainTextEditor = document.getElementById('plainTextEditor');
    
    if (nameInput) nameInput.value = asset.name || '';
    if (descInput) descInput.value = asset.description || '';
    if (typeSelect) typeSelect.value = asset.asset_type || '';
    if (tagsInput) tagsInput.value = (asset.tags || []).join(', ');
    
    // Load JSON content
    if (jsonEditor) {
        const jsonContent = asset.content_json || {};
        jsonEditor.value = JSON.stringify(jsonContent, null, 2);
    }
    
    // Generate and display plain text (read-only)
    if (plainTextEditor) {
        const plainText = generatePlainText(asset.content_json || {});
        plainTextEditor.value = plainText;
    }
    
    // Update preview
    updatePreview();
    updateTokenCount();
    
    // Update editor header
    const editorTitle = document.getElementById('editorTitle');
    if (editorTitle) {
        const typeInfo = state.assetTypes.find(t => t.type_key === asset.asset_type) || 
                        { icon: '📄', display_name: 'Asset' };
        editorTitle.textContent = `${typeInfo.icon} ${asset.name}`;
    }
    
    state.isDirty = false;
    updateSaveButtonState();
}

function editAsset(id) {
    selectAsset(id);
    // Switch to JSON tab
    switchTab('json');
}

// ============================================
// CREATE / SAVE ASSET
// ============================================

function showCreateModal() {
    state.selectedAsset = null;
    
    // Clear form
    const nameInput = document.getElementById('assetName');
    const descInput = document.getElementById('assetDescription');
    const typeSelect = document.getElementById('assetType');
    const tagsInput = document.getElementById('assetTags');
    const jsonEditor = document.getElementById('jsonEditor');
    const plainTextEditor = document.getElementById('plainTextEditor');
    
    if (nameInput) nameInput.value = '';
    if (descInput) descInput.value = '';
    if (typeSelect) typeSelect.value = '';
    if (tagsInput) tagsInput.value = '';
    if (jsonEditor) jsonEditor.value = '{\n  \n}';
    if (plainTextEditor) plainTextEditor.value = '';
    
    // Update editor header
    const editorTitle = document.getElementById('editorTitle');
    if (editorTitle) {
        editorTitle.textContent = '➕ New Asset';
    }
    
    // Clear preview
    const preview = document.getElementById('previewContent');
    if (preview) {
        preview.innerHTML = '<p class="preview-placeholder">Enter JSON content to see preview</p>';
    }
    
    state.isDirty = false;
    updateSaveButtonState();
}

async function saveAsset() {
    const nameInput = document.getElementById('assetName');
    const descInput = document.getElementById('assetDescription');
    const typeSelect = document.getElementById('assetType');
    const tagsInput = document.getElementById('assetTags');
    const jsonEditor = document.getElementById('jsonEditor');
    
    // Validation
    const name = nameInput?.value?.trim();
    const asset_type = typeSelect?.value;
    
    if (!name) {
        showNotification('Please enter a name', 'error');
        nameInput?.focus();
        return;
    }
    
    if (!asset_type) {
        showNotification('Please select an asset type', 'error');
        typeSelect?.focus();
        return;
    }
    
    // Parse JSON
    let content_json;
    try {
        content_json = JSON.parse(jsonEditor?.value || '{}');
    } catch (e) {
        showNotification('Invalid JSON: ' + e.message, 'error');
        switchTab('json');
        return;
    }
    
    // Parse tags
    const tags = (tagsInput?.value || '')
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
    
    const assetData = {
        name,
        asset_type,
        description: descInput?.value?.trim() || '',
        content_json,
        tags
    };
    
    try {
        let result;
        
        if (state.selectedAsset) {
            // Update existing
            result = await apiCall(`/api/context/assets/${state.selectedAsset.id}`, {
                method: 'PUT',
                body: JSON.stringify(assetData)
            });
            showNotification('Asset updated successfully', 'success');
        } else {
            // Create new
            result = await apiCall('/api/context/assets', {
                method: 'POST',
                body: JSON.stringify(assetData)
            });
            showNotification('Asset created successfully', 'success');
        }
        
        // Reload assets
        await loadAssets();
        
        // Select the saved asset
        if (result.data?.id) {
            selectAsset(result.data.id);
        }
        
        state.isDirty = false;
        updateSaveButtonState();
        
    } catch (error) {
        showNotification('Failed to save: ' + error.message, 'error');
    }
}

async function deleteAsset(id) {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    
    try {
        await apiCall(`/api/context/assets/${id}`, {
            method: 'DELETE'
        });
        
        showNotification('Asset deleted', 'success');
        
        if (state.selectedAsset?.id === id) {
            state.selectedAsset = null;
            showCreateModal();
        }
        
        await loadAssets();
        
    } catch (error) {
        showNotification('Failed to delete: ' + error.message, 'error');
    }
}

// ============================================
// JSON EDITOR FUNCTIONALITY
// ============================================

function handleJsonChange() {
    const jsonEditor = document.getElementById('jsonEditor');
    if (!jsonEditor) return;
    
    state.isDirty = true;
    updateSaveButtonState();
    
    // Validate and update
    if (validateJson()) {
        try {
            const json = JSON.parse(jsonEditor.value);
            
            // Update plain text (read-only display)
            const plainTextEditor = document.getElementById('plainTextEditor');
            if (plainTextEditor) {
                plainTextEditor.value = generatePlainText(json);
            }
            
            // Update preview
            updatePreview();
            updateTokenCount();
        } catch (e) {
            // Invalid JSON, already handled by validateJson
        }
    }
}

function validateJson() {
    const jsonEditor = document.getElementById('jsonEditor');
    const validationStatus = document.getElementById('validationStatus');
    
    if (!jsonEditor) return false;
    
    try {
        JSON.parse(jsonEditor.value || '{}');
        jsonEditor.classList.remove('invalid');
        if (validationStatus) {
            validationStatus.innerHTML = '<span class="valid">✓ Valid JSON</span>';
        }
        return true;
    } catch (e) {
        jsonEditor.classList.add('invalid');
        if (validationStatus) {
            validationStatus.innerHTML = `<span class="invalid">✗ ${e.message}</span>`;
        }
        return false;
    }
}

function handleJsonPaste(e) {
    // Auto-format pasted JSON after a short delay
    setTimeout(() => {
        const jsonEditor = document.getElementById('jsonEditor');
        if (!jsonEditor) return;
        
        try {
            const parsed = JSON.parse(jsonEditor.value);
            jsonEditor.value = JSON.stringify(parsed, null, 2);
            handleJsonChange();
        } catch (e) {
            // Not valid JSON, leave as-is
        }
    }, 10);
}

// ============================================
// PLAIN TEXT GENERATION
// ============================================

function generatePlainText(json) {
    if (!json || typeof json !== 'object') return '';
    return extractTextFromJson(json, '', 0);
}

function extractTextFromJson(obj, prefix = '', depth = 0) {
    if (depth > 10) return '';
    
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
    
    if (Array.isArray(obj)) {
        return obj.map((item, i) => {
            if (typeof item === 'string') return `• ${item}`;
            if (typeof item === 'object') return extractTextFromJson(item, '', depth + 1);
            return String(item);
        }).filter(Boolean).join('\n');
    }
    
    if (typeof obj === 'object' && obj !== null) {
        const lines = [];
        
        for (const [key, value] of Object.entries(obj)) {
            const formattedKey = formatKeyName(key);
            
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                lines.push(`${formattedKey}: ${value}`);
            } else if (Array.isArray(value)) {
                lines.push(`\n${formattedKey}:`);
                value.forEach(item => {
                    if (typeof item === 'string') {
                        lines.push(`  • ${item}`);
                    } else if (typeof item === 'object') {
                        lines.push('  ' + extractTextFromJson(item, '', depth + 1).replace(/\n/g, '\n  '));
                    }
                });
            } else if (typeof value === 'object' && value !== null) {
                lines.push(`\n${formattedKey}:`);
                lines.push('  ' + extractTextFromJson(value, '', depth + 1).replace(/\n/g, '\n  '));
            }
        }
        
        return lines.join('\n');
    }
    
    return '';
}

function formatKeyName(key) {
    return key
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================
// PREVIEW GENERATION
// ============================================

function updatePreview() {
    const jsonEditor = document.getElementById('jsonEditor');
    const preview = document.getElementById('previewContent');
    
    if (!jsonEditor || !preview) return;
    
    try {
        const json = JSON.parse(jsonEditor.value || '{}');
        preview.innerHTML = generatePreviewHtml(json);
    } catch (e) {
        preview.innerHTML = '<p class="preview-error">Invalid JSON - cannot generate preview</p>';
    }
}

function generatePreviewHtml(json) {
    if (!json || Object.keys(json).length === 0) {
        return '<p class="preview-placeholder">No content to preview</p>';
    }
    
    let html = '<div class="preview-content">';
    
    for (const [key, value] of Object.entries(json)) {
        const label = formatKeyName(key);
        
        if (typeof value === 'string') {
            html += renderField(label, value, 'text');
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            html += renderField(label, String(value), 'text');
        } else if (Array.isArray(value)) {
            if (key.includes('dont') || key.includes('avoid')) {
                html += renderField(label, value, 'list', 'negative');
            } else if (key.includes('do') || key.includes('signature') || key.includes('traits') || key.includes('values')) {
                html += renderField(label, value, 'pills', 'positive');
            } else {
                html += renderField(label, value, 'list');
            }
        } else if (typeof value === 'object' && value !== null) {
            html += `<div class="preview-section">
                <h4>${escapeHtml(label)}</h4>
                ${generatePreviewHtml(value)}
            </div>`;
        }
    }
    
    html += '</div>';
    return html;
}

function renderField(label, value, type, modifier = '') {
    let html = `<div class="preview-field ${modifier}">`;
    html += `<label>${escapeHtml(label)}</label>`;
    
    if (type === 'text') {
        html += `<p>${escapeHtml(String(value))}</p>`;
    } else if (type === 'pills' && Array.isArray(value)) {
        html += '<div class="pill-container">';
        value.forEach(item => {
            html += `<span class="pill ${modifier}">${escapeHtml(String(item))}</span>`;
        });
        html += '</div>';
    } else if (type === 'list' && Array.isArray(value)) {
        html += '<ul class="preview-list">';
        value.forEach(item => {
            if (typeof item === 'string') {
                html += `<li class="${modifier}">${escapeHtml(item)}</li>`;
            } else if (typeof item === 'object') {
                html += `<li>${escapeHtml(JSON.stringify(item))}</li>`;
            }
        });
        html += '</ul>';
    }
    
    html += '</div>';
    return html;
}

// ============================================
// TOKEN COUNT
// ============================================

function updateTokenCount() {
    const jsonEditor = document.getElementById('jsonEditor');
    const tokenDisplay = document.getElementById('tokenCount');
    
    if (!jsonEditor || !tokenDisplay) return;
    
    // Rough estimate: ~4 characters per token
    const charCount = jsonEditor.value.length;
    const estimatedTokens = Math.ceil(charCount / 4);
    
    tokenDisplay.textContent = `~${estimatedTokens.toLocaleString()} tokens`;
}

// ============================================
// TABS
// ============================================

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}Tab`);
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Filter changes
    const typeFilter = document.getElementById('typeFilter');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    
    if (typeFilter) {
        typeFilter.addEventListener('change', (e) => {
            state.filters.type = e.target.value;
            loadAssets();
        });
    }
    
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.filters.search = e.target.value;
                loadAssets();
            }, 300);
        });
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            state.filters.status = e.target.value;
            loadAssets();
        });
    }
    
    // JSON editor
    const jsonEditor = document.getElementById('jsonEditor');
    if (jsonEditor) {
        let jsonTimeout;
        jsonEditor.addEventListener('input', () => {
            clearTimeout(jsonTimeout);
            jsonTimeout = setTimeout(handleJsonChange, 300);
        });
        jsonEditor.addEventListener('paste', handleJsonPaste);
    }
    
    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Save button
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAsset);
    }
    
    // New asset button
    const newAssetBtn = document.getElementById('newAssetBtn');
    if (newAssetBtn) {
        newAssetBtn.addEventListener('click', showCreateModal);
    }
    
    // Import button
    const importBtn = document.getElementById('importBtn');
    const importInput = document.getElementById('importInput');
    if (importBtn && importInput) {
        importBtn.addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', handleImport);
    }
    
    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExport);
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveAsset();
        }
    });
}

function updateSaveButtonState() {
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.disabled = !state.isDirty;
        saveBtn.classList.toggle('has-changes', state.isDirty);
    }
}

// ============================================
// IMPORT / EXPORT
// ============================================

async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Check if it's a single asset or bulk import
        if (data.assets && Array.isArray(data.assets)) {
            // Bulk import
            const result = await apiCall('/api/context/import', {
                method: 'POST',
                body: JSON.stringify({ assets: data.assets })
            });
            showNotification(`Imported ${result.data?.created || 0} assets`, 'success');
            await loadAssets();
        } else if (data.asset_type || data.content_json) {
            // Single asset - load into editor
            loadAssetIntoEditor({
                name: data.name || 'Imported Asset',
                asset_type: data.asset_type || 'custom',
                description: data.description || '',
                content_json: data.content_json || data,
                tags: data.tags || [],
                version: 1
            });
            state.selectedAsset = null;
            state.isDirty = true;
            updateSaveButtonState();
            showNotification('Asset loaded into editor - click Save to create', 'info');
        } else {
            // Raw JSON - load as content
            const jsonEditor = document.getElementById('jsonEditor');
            if (jsonEditor) {
                jsonEditor.value = JSON.stringify(data, null, 2);
                handleJsonChange();
            }
            showNotification('JSON loaded into editor', 'info');
        }
    } catch (error) {
        showNotification('Failed to import: ' + error.message, 'error');
    }
    
    // Reset input
    e.target.value = '';
}

async function handleExport() {
    try {
        const response = await apiCall('/api/context/export');
        
        const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `context-assets-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showNotification('Export downloaded', 'success');
    } catch (error) {
        showNotification('Failed to export: ' + error.message, 'error');
    }
}

// ============================================
// NOTIFICATIONS
// ============================================

function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${escapeHtml(message)}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => notification.remove(), 5000);
}

// ============================================
// UTILITIES
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}