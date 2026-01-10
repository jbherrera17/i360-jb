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
    departments: [],
    selectedAsset: null,
    filters: {
        department: '',
        type: '',
        search: '',
        status: 'current'
    },
    isDirty: false,
    generateAbortController: null,
    isGenerating: false,
    importAbortController: null,
    isImporting: false
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
    await loadDepartments();
    await loadAssets();

    // Set up event listeners
    setupEventListeners();

    // Show empty state on initial load (no asset selected)
    showEmptyState();
    
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

async function loadDepartments() {
    try {
        const response = await apiCall('/api/departments');
        state.departments = response.data || [];
        populateDepartmentFilter();
        console.log(`Loaded ${state.departments.length} departments`);
    } catch (error) {
        console.error('Failed to load departments:', error);
        state.departments = [];
    }
}

function populateDepartmentFilter() {
    const select = document.getElementById('departmentFilter');
    if (!select) return;

    select.innerHTML = '<option value="">All Departments</option>';
    state.departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.id;
        option.textContent = dept.name;
        select.appendChild(option);
    });

    // Also populate the form department dropdown
    const formSelect = document.getElementById('assetDepartment');
    if (formSelect) {
        formSelect.innerHTML = '<option value="">No Department (Available to all)</option>';
        state.departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name;
            formSelect.appendChild(option);
        });
    }
}

async function loadAssets() {
    try {
        const params = new URLSearchParams();
        if (state.filters.department) params.append('department_id', state.filters.department);
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
        const updatedDate = asset.updated_at ? formatRelativeDate(asset.updated_at) : '';

        return `
            <div class="asset-item ${state.selectedAsset?.id === asset.id ? 'selected' : ''}"
                 onclick="selectAsset('${asset.id}')">
                <div class="asset-icon">${typeInfo.icon}</div>
                <div class="asset-info">
                    <div class="asset-name">${escapeHtml(asset.name)}</div>
                    <div class="asset-meta">
                        ${typeInfo.display_name} • v${asset.version || 1}${updatedDate ? ` • ${updatedDate}` : ''}
                    </div>
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

    loadAssetIntoEditor(asset);
    renderAssetList();
}

function loadAssetIntoEditor(asset) {
    if (!asset) return;

    // Hide empty state, show editor
    hideEmptyState();

    state.selectedAsset = asset;

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

    // Set department
    const deptSelect = document.getElementById('assetDepartment');
    if (deptSelect) deptSelect.value = asset.department_id || '';
    
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

    // Update editor metadata
    const editorMeta = document.getElementById('editorMeta');
    const editorVersion = document.getElementById('editorVersion');
    const editorCreated = document.getElementById('editorCreated');
    const editorModified = document.getElementById('editorModified');

    if (editorMeta) {
        editorMeta.style.display = 'flex';
    }
    if (editorVersion) {
        editorVersion.textContent = `Version ${asset.version || 1}`;
    }
    if (editorCreated) {
        editorCreated.textContent = `Created: ${formatFullDate(asset.created_at)}`;
    }
    if (editorModified) {
        editorModified.textContent = `Modified: ${formatFullDate(asset.updated_at)}`;
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

    // Hide empty state, show editor
    hideEmptyState();

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

    // Reset department
    const deptSelect = document.getElementById('assetDepartment');
    if (deptSelect) deptSelect.value = '';
    
    // Update editor header
    const editorTitle = document.getElementById('editorTitle');
    if (editorTitle) {
        editorTitle.textContent = '➕ New Asset';
    }

    // Hide editor metadata for new assets
    const editorMeta = document.getElementById('editorMeta');
    if (editorMeta) {
        editorMeta.style.display = 'none';
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
    console.log('saveAsset called, isDirty:', state.isDirty);
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

    // Get department
    const departmentSelect = document.getElementById('assetDepartment');
    const department_id = departmentSelect?.value || null;

    const assetData = {
        name,
        asset_type,
        description: descInput?.value?.trim() || '',
        content_json,
        tags,
        department_id
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
        await apiCall(`/api/context/assets/${id}?hard=true`, {
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
        // Render markdown for text fields
        html += `<div class="preview-text">${renderMarkdown(String(value))}</div>`;
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
                // Render markdown in list items too
                html += `<li class="${modifier}">${renderMarkdown(item)}</li>`;
            } else if (typeof item === 'object') {
                html += `<li>${escapeHtml(JSON.stringify(item))}</li>`;
            }
        });
        html += '</ul>';
    }

    html += '</div>';
    return html;
}

/**
 * Simple markdown renderer for preview panel
 * Supports: bold, italic, code, links, headers, line breaks
 */
function renderMarkdown(text) {
    if (!text) return '';

    let html = escapeHtml(text);

    // Headers (must be at start of line)
    html = html.replace(/^### (.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^## (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^# (.+)$/gm, '<h3>$1</h3>');

    // Bold: **text** or __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/(?<![a-zA-Z])_([^_]+)_(?![a-zA-Z])/g, '<em>$1</em>');

    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Horizontal rule: --- or ***
    html = html.replace(/^(---|\*\*\*)$/gm, '<hr>');

    // Line breaks: double newline becomes paragraph, single newline becomes <br>
    html = html.replace(/\n\n+/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraph if not already wrapped
    if (!html.startsWith('<h') && !html.startsWith('<p>')) {
        html = '<p>' + html + '</p>';
    }

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
    const departmentFilter = document.getElementById('departmentFilter');
    const typeFilter = document.getElementById('typeFilter');
    const searchInput = document.getElementById('searchInput');

    if (departmentFilter) {
        departmentFilter.addEventListener('change', (e) => {
            state.filters.department = e.target.value;
            loadAssets();
        });
    }

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

    // Form field change listeners to enable Save button
    const formFields = ['assetName', 'assetDescription', 'assetType', 'assetTags'];
    formFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => {
                state.isDirty = true;
                updateSaveButtonState();
            });
            field.addEventListener('change', () => {
                state.isDirty = true;
                updateSaveButtonState();
            });
        }
    });

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Save button
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAsset);
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelChanges);
    }

    // Delete button
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (state.selectedAsset) {
                deleteAsset(state.selectedAsset.id);
            }
        });
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

    // Setup generate modal listeners
    setupGenerateModalListeners();
}

function updateSaveButtonState() {
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const editorContent = document.getElementById('editorContent');

    // Check if editor is visible (i.e., we're in editing/creating mode)
    const isEditorVisible = editorContent && editorContent.style.display !== 'none';

    if (saveBtn) {
        saveBtn.disabled = !state.isDirty;
        saveBtn.classList.toggle('has-changes', state.isDirty);
    }

    // Show cancel button when editor is visible (either editing or creating new asset)
    if (cancelBtn) {
        cancelBtn.style.display = isEditorVisible ? 'flex' : 'none';
    }

    // Show delete button only when editing an existing asset
    if (deleteBtn) {
        deleteBtn.style.display = state.selectedAsset ? 'flex' : 'none';
    }
}

/**
 * Show the empty state in the editor panel
 */
function showEmptyState() {
    const emptyState = document.getElementById('editorEmptyState');
    const editorContent = document.getElementById('editorContent');
    const editorHeader = document.querySelector('.editor-header');

    if (emptyState) emptyState.style.display = 'flex';
    if (editorContent) editorContent.style.display = 'none';
    if (editorHeader) editorHeader.style.display = 'none';

    state.selectedAsset = null;
    state.isDirty = false;
    renderAssetList(); // Update selection in list
}

/**
 * Hide the empty state and show editor content
 */
function hideEmptyState() {
    const emptyState = document.getElementById('editorEmptyState');
    const editorContent = document.getElementById('editorContent');
    const editorHeader = document.querySelector('.editor-header');

    if (emptyState) emptyState.style.display = 'none';
    if (editorContent) editorContent.style.display = 'flex';
    if (editorHeader) editorHeader.style.display = 'flex';
}

/**
 * Cancel current changes and reset the editor
 */
function cancelChanges() {
    if (state.isDirty) {
        if (!confirm('Discard unsaved changes?')) {
            return;
        }
    }

    if (state.selectedAsset) {
        // Reload the selected asset to discard changes
        loadAssetIntoEditor(state.selectedAsset);
        state.isDirty = false;
        updateSaveButtonState();
    } else {
        // No asset selected - go back to empty state
        showEmptyState();
    }
}

// ============================================
// IMPORT / EXPORT
// ============================================

async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const importBtn = document.getElementById('importBtn');

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Check if it's a single asset or bulk import
        if (data.assets && Array.isArray(data.assets)) {
            // Bulk import - show importing state with cancel option
            state.importAbortController = new AbortController();
            state.isImporting = true;

            // Update button to show cancel option
            if (importBtn) {
                importBtn.innerHTML = '<i data-lucide="x"></i> Cancel';
                importBtn.classList.add('btn-danger');
                importBtn.onclick = cancelImport;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }

            showNotification(`Importing ${data.assets.length} assets...`, 'info');

            const response = await fetch('/api/context/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assets: data.assets }),
                signal: state.importAbortController.signal
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            showNotification(`Imported ${result.data?.created || 0} assets`, 'success');
            await loadAssets();
        } else if (data.asset_type || data.content_json) {
            // Single asset - load into editor
            hideEmptyState();
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
            hideEmptyState();

            // Clear form fields but keep JSON
            const nameInput = document.getElementById('assetName');
            const descInput = document.getElementById('assetDescription');
            const typeSelect = document.getElementById('assetType');
            const tagsInput = document.getElementById('assetTags');

            if (nameInput) nameInput.value = '';
            if (descInput) descInput.value = '';
            if (typeSelect) typeSelect.value = '';
            if (tagsInput) tagsInput.value = '';

            // Update editor header
            const editorTitle = document.getElementById('editorTitle');
            if (editorTitle) {
                editorTitle.textContent = '➕ New Asset';
            }

            // Hide editor metadata
            const editorMeta = document.getElementById('editorMeta');
            if (editorMeta) {
                editorMeta.style.display = 'none';
            }

            // Load JSON into editor
            const jsonEditor = document.getElementById('jsonEditor');
            if (jsonEditor) {
                jsonEditor.value = JSON.stringify(data, null, 2);
                handleJsonChange();
            }

            state.selectedAsset = null;
            state.isDirty = true;
            updateSaveButtonState();
            showNotification('JSON loaded into editor - add name/type and save', 'info');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            showNotification('Import cancelled', 'info');
        } else {
            showNotification('Failed to import: ' + error.message, 'error');
        }
    } finally {
        // Reset state
        state.importAbortController = null;
        state.isImporting = false;

        // Reset button - restore original click handler
        if (importBtn) {
            importBtn.innerHTML = '<i data-lucide="upload"></i>';
            importBtn.classList.remove('btn-danger');
            // Restore the original click handler to trigger file input
            importBtn.onclick = () => {
                const input = document.getElementById('importInput');
                if (input) input.click();
            };
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    // Reset input
    e.target.value = '';
}

/**
 * Cancel the current import process
 */
function cancelImport() {
    if (state.importAbortController && state.isImporting) {
        state.importAbortController.abort();
    }
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

/**
 * Format a date as relative time (e.g., "2 hours ago", "Yesterday")
 */
function formatRelativeDate(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    // Format as date for older items
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format a date as full date string
 */
function formatFullDate(dateString) {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ============================================
// AI ASSET GENERATION
// ============================================

/**
 * Generate modal manager instance
 */
let generateModalManager = null;

/**
 * Open the generate modal
 */
function openGenerateModal() {
    console.log('Opening generate modal...');

    // Initialize modal manager if not done yet
    if (!generateModalManager && typeof ModalManager !== 'undefined') {
        generateModalManager = new ModalManager({ minWidth: 450, minHeight: 400, defaultWidth: 600 });
        generateModalManager.init('generate-modal-dialog', 'generate-modal-header', 'generateModal');
    }

    if (generateModalManager) {
        generateModalManager.open();
    } else {
        // Fallback if modal manager not available
        const modal = document.getElementById('generateModal');
        if (modal) modal.classList.add('active');
    }

    // Populate asset type dropdown
    populateGenerateTypeSelect();
    // Refresh icons in modal
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    console.log('Generate modal opened, asset types:', state.assetTypes.length);
}

/**
 * Close the generate modal
 */
function closeGenerateModal() {
    if (generateModalManager) {
        generateModalManager.close();
    } else {
        const modal = document.getElementById('generateModal');
        if (modal) modal.classList.remove('active');
    }
    // Reset form
    resetGenerateForm();
}

/**
 * Populate the asset type select in generate modal
 */
function populateGenerateTypeSelect() {
    const select = document.getElementById('generateAssetType');
    if (!select) return;

    select.innerHTML = '<option value="">Select Type...</option>';

    // Core types
    const coreTypes = state.assetTypes.filter(t => t.category === 'core');
    if (coreTypes.length > 0) {
        select.innerHTML += '<optgroup label="Core Types">';
        coreTypes.forEach(type => {
            select.innerHTML += `<option value="${type.type_key}">${type.icon} ${type.display_name}</option>`;
        });
        select.innerHTML += '</optgroup>';
    }

    // Extended types
    const extendedTypes = state.assetTypes.filter(t => t.category === 'extended');
    if (extendedTypes.length > 0) {
        select.innerHTML += '<optgroup label="Extended Types">';
        extendedTypes.forEach(type => {
            select.innerHTML += `<option value="${type.type_key}">${type.icon} ${type.display_name}</option>`;
        });
        select.innerHTML += '</optgroup>';
    }
}

/**
 * Reset the generate form
 */
function resetGenerateForm() {
    const typeSelect = document.getElementById('generateAssetType');
    if (typeSelect) typeSelect.value = '';

    const companyInput = document.getElementById('generateCompanyName');
    if (companyInput) companyInput.value = '';

    const promptInput = document.getElementById('generatePrompt');
    if (promptInput) promptInput.value = '';

    const status = document.getElementById('generateStatus');
    if (status) {
        status.style.display = 'none';
    }
}

/**
 * Generate content using AI
 */
async function generateWithAI() {
    const assetType = document.getElementById('generateAssetType')?.value;
    const companyName = document.getElementById('generateCompanyName')?.value.trim();
    const description = document.getElementById('generatePrompt')?.value.trim();
    const statusEl = document.getElementById('generateStatus');
    const generateBtn = document.getElementById('generateSubmitBtn');
    const cancelBtn = document.getElementById('generateCancelBtn');

    // Validation
    if (!assetType) {
        showNotification('Please select an asset type', 'error');
        return;
    }

    if (!description) {
        showNotification('Please provide a description', 'error');
        return;
    }

    // Create AbortController for cancellation
    state.generateAbortController = new AbortController();
    state.isGenerating = true;

    // Show generating state
    if (statusEl) {
        statusEl.style.display = 'flex';
    }
    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Generating...';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    // Update cancel button to show it will abort
    if (cancelBtn) {
        cancelBtn.innerHTML = '<i data-lucide="x"></i> Cancel Generation';
        cancelBtn.classList.add('btn-danger');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    try {
        const response = await fetch('/api/context/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                asset_type: assetType,
                company_name: companyName,
                description: description
            }),
            signal: state.generateAbortController.signal
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        if (data.success && data.content) {
            // Get the type info for the name
            const typeInfo = state.assetTypes.find(t => t.type_key === assetType) ||
                           { display_name: assetType };

            // Create content JSON from the generated markdown
            const contentJson = {
                generated: true,
                generated_at: new Date().toISOString(),
                source_description: description,
                content: data.content
            };

            // Load into editor
            loadAssetIntoEditor({
                name: `${companyName || 'New'} ${typeInfo.display_name}`,
                asset_type: assetType,
                description: `AI-generated ${typeInfo.display_name.toLowerCase()} based on: ${description.substring(0, 100)}...`,
                content_json: contentJson,
                tags: ['ai-generated'],
                version: 1
            });

            // Close modal
            closeGenerateModal();

            // Show success
            showNotification(`Generated ${typeInfo.display_name} content! Review and save when ready.`, 'success');

            // Mark as dirty so user knows to save
            state.selectedAsset = null;
            state.isDirty = true;
            updateSaveButtonState();

            // Log usage
            console.log('AI Generation usage:', data.usage);

        } else {
            throw new Error(data.error || 'Failed to generate content');
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            showNotification('Generation cancelled', 'info');
        } else {
            console.error('Generate error:', error);
            showNotification('Failed to generate: ' + error.message, 'error');
        }
    } finally {
        // Reset state
        state.generateAbortController = null;
        state.isGenerating = false;

        // Reset button states
        if (statusEl) {
            statusEl.style.display = 'none';
        }
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i data-lucide="sparkles"></i> Generate';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
        if (cancelBtn) {
            cancelBtn.innerHTML = 'Cancel';
            cancelBtn.classList.remove('btn-danger');
        }
    }
}

/**
 * Cancel the current AI generation
 */
function cancelGeneration() {
    if (state.generateAbortController && state.isGenerating) {
        state.generateAbortController.abort();
    } else {
        // Not generating, just close the modal
        closeGenerateModal();
    }
}

/**
 * Setup generate modal event listeners
 * Called from main setupEventListeners function
 */
function setupGenerateModalListeners() {
    console.log('Setting up generate modal event listeners...');

    // Open modal button (in main toolbar)
    const openBtn = document.getElementById('generateBtn');
    if (openBtn) {
        console.log('Generate button found, attaching click listener');
        openBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Generate button clicked!');
            openGenerateModal();
        });
    } else {
        console.error('Generate button not found!');
    }

    // Submit generate button (in modal)
    const submitBtn = document.getElementById('generateSubmitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', generateWithAI);
    }

    // Cancel button (in modal) - handles both closing and aborting generation
    const modalCancelBtn = document.getElementById('generateCancelBtn');
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', cancelGeneration);
    }

    // Close button (X in header)
    const closeBtn = document.getElementById('generateModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeGenerateModal);
    }

    // Close modal when clicking overlay
    const modal = document.getElementById('generateModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeGenerateModal();
            }
        });
    }

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('generateModal');
            if (modal && modal.classList.contains('active')) {
                closeGenerateModal();
            }
        }
    });

    // Tab switching
    const tabs = document.querySelectorAll('.modal-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchModalTab(tab.dataset.tab));
    });

    // Import tab - populate type select
    populateImportTypeSelect();

    // Import submit button
    const importSubmitBtn = document.getElementById('importSubmitBtn');
    if (importSubmitBtn) {
        importSubmitBtn.addEventListener('click', importContentWithAI);
    }

    // File upload handling
    setupFileUpload();
}

/**
 * Switch between Generate and Import tabs
 */
function switchModalTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    document.getElementById('generateTabContent').style.display = tabName === 'generate' ? 'block' : 'none';
    document.getElementById('importTabContent').style.display = tabName === 'import' ? 'block' : 'none';

    // Update tab content active class
    document.getElementById('generateTabContent').classList.toggle('active', tabName === 'generate');
    document.getElementById('importTabContent').classList.toggle('active', tabName === 'import');

    // Update footer buttons
    document.getElementById('generateSubmitBtn').style.display = tabName === 'generate' ? 'flex' : 'none';
    document.getElementById('importSubmitBtn').style.display = tabName === 'import' ? 'flex' : 'none';

    // Refresh icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Populate the import type select dropdown
 */
function populateImportTypeSelect() {
    const select = document.getElementById('importAssetType');
    if (!select) return;

    select.innerHTML = '<option value="">Auto-detect best type...</option>';

    // Core types
    const coreTypes = state.assetTypes.filter(t => t.category === 'core');
    if (coreTypes.length > 0) {
        select.innerHTML += '<optgroup label="Core Types">';
        coreTypes.forEach(type => {
            select.innerHTML += `<option value="${type.type_key}">${type.icon} ${type.display_name}</option>`;
        });
        select.innerHTML += '</optgroup>';
    }

    // Extended types
    const extendedTypes = state.assetTypes.filter(t => t.category === 'extended');
    if (extendedTypes.length > 0) {
        select.innerHTML += '<optgroup label="Extended Types">';
        extendedTypes.forEach(type => {
            select.innerHTML += `<option value="${type.type_key}">${type.icon} ${type.display_name}</option>`;
        });
        select.innerHTML += '</optgroup>';
    }
}

/**
 * Setup file upload drag and drop
 */
function setupFileUpload() {
    const uploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('importFileInput');
    const clearBtn = document.getElementById('clearFileBtn');

    if (!uploadArea || !fileInput) return;

    // Click to upload
    uploadArea.addEventListener('click', () => fileInput.click());

    // File selected
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // Clear file
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearSelectedFile();
        });
    }

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });
}

/**
 * Handle file selection
 */
async function handleFileSelect(file) {
    const allowedTypes = ['.txt', '.md', '.json', '.csv'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedTypes.includes(fileExt)) {
        showNotification('Please upload a .txt, .md, .json, or .csv file', 'error');
        return;
    }

    // Show file name
    const uploadContent = document.querySelector('.file-upload-content');
    const fileSelected = document.querySelector('.file-selected');
    const fileNameSpan = document.getElementById('selectedFileName');

    if (uploadContent) uploadContent.style.display = 'none';
    if (fileSelected) fileSelected.style.display = 'flex';
    if (fileNameSpan) fileNameSpan.textContent = file.name;

    // Read file content
    try {
        const content = await file.text();
        document.getElementById('importContent').value = content;

        // Update source field with filename
        const sourceInput = document.getElementById('importSource');
        if (sourceInput && !sourceInput.value) {
            sourceInput.value = file.name.replace(/\.[^/.]+$/, '');
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        console.error('Error reading file:', error);
        showNotification('Error reading file', 'error');
        clearSelectedFile();
    }
}

/**
 * Clear selected file
 */
function clearSelectedFile() {
    const uploadContent = document.querySelector('.file-upload-content');
    const fileSelected = document.querySelector('.file-selected');
    const fileInput = document.getElementById('importFileInput');

    if (uploadContent) uploadContent.style.display = 'flex';
    if (fileSelected) fileSelected.style.display = 'none';
    if (fileInput) fileInput.value = '';

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Import content using AI to convert to structured asset
 */
async function importContentWithAI() {
    const assetType = document.getElementById('importAssetType')?.value;
    const source = document.getElementById('importSource')?.value.trim();
    const content = document.getElementById('importContent')?.value.trim();
    const statusEl = document.getElementById('generateStatus');
    const statusText = document.getElementById('generateStatusText');
    const importBtn = document.getElementById('importSubmitBtn');
    const cancelBtn = document.getElementById('generateCancelBtn');

    // Validation
    if (!content) {
        showNotification('Please paste or upload content to convert', 'error');
        return;
    }

    if (content.length < 50) {
        showNotification('Content is too short. Please provide more detail.', 'error');
        return;
    }

    // Create AbortController for cancellation
    state.generateAbortController = new AbortController();
    state.isGenerating = true;

    // Show processing state
    if (statusEl) {
        statusEl.style.display = 'flex';
    }
    if (statusText) {
        statusText.textContent = 'Analyzing and structuring content...';
    }
    if (importBtn) {
        importBtn.disabled = true;
        importBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Converting...';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    if (cancelBtn) {
        cancelBtn.innerHTML = '<i data-lucide="x"></i> Cancel';
        cancelBtn.classList.add('btn-danger');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    try {
        const response = await fetch('/api/context/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: content,
                preferred_type: assetType || null,
                source: source || null
            }),
            signal: state.generateAbortController.signal
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        if (data.success && data.asset) {
            const asset = data.asset;

            // Get the type info for display
            const typeInfo = state.assetTypes.find(t => t.type_key === asset.asset_type) ||
                           { display_name: asset.asset_type, icon: '📄' };

            // Load into editor
            loadAssetIntoEditor({
                name: asset.name,
                asset_type: asset.asset_type,
                description: asset.description,
                content_json: asset.content_json,
                tags: asset.tags || ['imported'],
                version: 1
            });

            // Close modal
            closeGenerateModal();

            // Show success with confidence info
            const confidence = data.metadata?.confidence || 0;
            const confidenceText = confidence >= 0.9 ? 'high' : confidence >= 0.7 ? 'good' : 'moderate';
            showNotification(
                `Created ${typeInfo.icon} ${typeInfo.display_name} with ${confidenceText} confidence. Review and save when ready.`,
                'success'
            );

            // Mark as dirty so user knows to save
            state.selectedAsset = null;
            state.isDirty = true;
            updateSaveButtonState();

            // Log any fields needing review
            if (data.metadata?.needs_review?.length > 0) {
                console.log('Fields needing review:', data.metadata.needs_review);
            }

        } else {
            throw new Error(data.error || 'Failed to parse content');
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            showNotification('Conversion cancelled', 'info');
        } else {
            console.error('Import error:', error);
            showNotification('Failed to convert: ' + error.message, 'error');
        }
    } finally {
        // Reset state
        state.generateAbortController = null;
        state.isGenerating = false;

        // Reset button states
        if (statusEl) {
            statusEl.style.display = 'none';
        }
        if (importBtn) {
            importBtn.disabled = false;
            importBtn.innerHTML = '<i data-lucide="sparkles"></i> Convert to Asset';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
        if (cancelBtn) {
            cancelBtn.innerHTML = 'Cancel';
            cancelBtn.classList.remove('btn-danger');
        }
    }
}