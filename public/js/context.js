/**
 * Context Assets Frontend - Insight 360
 * Phase 3: Context Assets Management UI
 * Version: 2.2.0
 * 
 * Handles:
 * - Asset list display and filtering
 * - Asset CRUD operations
 * - JSON editor with validation
 * - Version history and rollback
 * - Import/Export functionality
 * - Toast notifications
 */

// ============================================
// STATE MANAGEMENT
// ============================================

const state = {
    assets: [],
    selectedAsset: null,
    assetTypes: {},
    filters: {
        type: '',
        status: 'current',
        search: ''
    },
    tags: [],
    isLoading: false,
    isDirty: false
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Load asset types
    await loadAssetTypes();

    // Load assets
    await loadAssets();

    // Set up event listeners
    setupEventListeners();

    // Initialize JSON editor line numbers
    updateLineNumbers();
});

// ============================================
// API FUNCTIONS
// ============================================

const API_BASE = '/api/context';

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function loadAssetTypes() {
    try {
        const data = await apiCall('/types');
        state.assetTypes = {};
        data.types.forEach(type => {
            state.assetTypes[type.type_key] = type;
        });
    } catch (error) {
        console.error('Failed to load asset types:', error);
        // Use default types if API fails
        state.assetTypes = getDefaultTypes();
    }
}

async function loadAssets() {
    try {
        state.isLoading = true;
        updateLoadingState(true);

        const params = new URLSearchParams();
        if (state.filters.type) params.append('type', state.filters.type);
        if (state.filters.status) params.append('status', state.filters.status);
        if (state.filters.search) params.append('search', state.filters.search);

        const data = await apiCall(`/assets?${params.toString()}`);
        state.assets = data.assets || [];

        renderAssetList();
    } catch (error) {
        showToast('Failed to load assets', 'error');
        // Show empty state on error
        state.assets = [];
        renderAssetList();
    } finally {
        state.isLoading = false;
        updateLoadingState(false);
    }
}

async function loadAsset(id) {
    try {
        const data = await apiCall(`/assets/${id}`);
        return data.asset;
    } catch (error) {
        showToast('Failed to load asset', 'error');
        throw error;
    }
}

async function saveAsset(assetData) {
    try {
        const isNew = !state.selectedAsset?.id;
        const endpoint = isNew ? '/assets' : `/assets/${state.selectedAsset.id}`;
        const method = isNew ? 'POST' : 'PUT';

        const data = await apiCall(endpoint, {
            method,
            body: JSON.stringify(assetData)
        });

        showToast(isNew ? 'Asset created successfully' : 'Asset saved successfully', 'success');
        state.isDirty = false;

        // Reload assets and select the saved one
        await loadAssets();
        
        if (data.asset) {
            selectAsset(data.asset.id);
        }

        return data.asset;
    } catch (error) {
        showToast('Failed to save asset: ' + error.message, 'error');
        throw error;
    }
}

async function deleteAsset(id) {
    try {
        await apiCall(`/assets/${id}`, { method: 'DELETE' });
        showToast('Asset deleted', 'success');
        
        state.selectedAsset = null;
        hideEditor();
        await loadAssets();
    } catch (error) {
        showToast('Failed to delete asset', 'error');
    }
}

async function duplicateAsset(id) {
    try {
        const data = await apiCall(`/assets/${id}/duplicate`, {
            method: 'POST',
            body: JSON.stringify({})
        });

        showToast('Asset duplicated', 'success');
        await loadAssets();
        
        if (data.asset) {
            selectAsset(data.asset.id);
        }
    } catch (error) {
        showToast('Failed to duplicate asset', 'error');
    }
}

async function loadVersionHistory(id) {
    try {
        const data = await apiCall(`/assets/${id}/versions`);
        return data.versions || [];
    } catch (error) {
        showToast('Failed to load version history', 'error');
        return [];
    }
}

async function rollbackToVersion(assetId, version) {
    try {
        await apiCall(`/assets/${assetId}/rollback`, {
            method: 'POST',
            body: JSON.stringify({ version })
        });

        showToast(`Rolled back to version ${version}`, 'success');
        closeModal('historyModal');
        
        // Reload the asset
        const asset = await loadAsset(assetId);
        populateEditor(asset);
    } catch (error) {
        showToast('Failed to rollback', 'error');
    }
}

// ============================================
// UI RENDERING
// ============================================

function renderAssetList() {
    const listContainer = document.getElementById('assetList');
    const emptyState = document.getElementById('emptyState');

    if (state.assets.length === 0) {
        listContainer.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    listContainer.innerHTML = state.assets.map(asset => {
        const typeInfo = state.assetTypes[asset.asset_type] || { icon: '📄', display_name: asset.asset_type };
        const isSelected = state.selectedAsset?.id === asset.id;
        const timeAgo = formatTimeAgo(asset.updated_at);

        return `
            <div class="asset-item ${isSelected ? 'selected' : ''}" 
                 data-id="${asset.id}" 
                 onclick="selectAsset('${asset.id}')">
                <div class="asset-icon">${typeInfo.icon}</div>
                <div class="asset-info">
                    <div class="asset-name">${escapeHtml(asset.name)}</div>
                    <div class="asset-meta">
                        <span class="asset-version">v${asset.version}</span>
                        <span>${timeAgo}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Reinitialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function populateEditor(asset) {
    state.selectedAsset = asset;
    
    // Show editor, hide placeholder
    document.getElementById('editorPlaceholder').classList.add('hidden');
    document.getElementById('assetEditor').classList.remove('hidden');

    // Populate fields
    const typeInfo = state.assetTypes[asset.asset_type] || { icon: '📄' };
    document.getElementById('editorAssetIcon').textContent = typeInfo.icon;
    document.getElementById('assetName').value = asset.name || '';
    document.getElementById('assetVersion').textContent = `v${asset.version || 1}`;
    document.getElementById('assetType').value = asset.asset_type || 'voice_dna';
    document.getElementById('assetDescription').value = asset.description || '';

    // Populate tags
    state.tags = asset.tags || [];
    renderTags();

    // Populate JSON editor
    const jsonContent = typeof asset.content_json === 'string' 
        ? asset.content_json 
        : JSON.stringify(asset.content_json || {}, null, 2);
    document.getElementById('jsonEditor').value = jsonContent;
    updateLineNumbers();
    validateJson();

    // Populate text editor
    document.getElementById('textEditor').value = asset.content_text || '';

    // Update token count
    updateTokenCount();

    // Update last saved
    document.getElementById('lastSaved').textContent = `Last saved: ${formatTimeAgo(asset.updated_at)}`;

    // Mark as clean
    state.isDirty = false;

    // Update preview
    updatePreview();

    // Highlight selected in list
    renderAssetList();
}

function hideEditor() {
    document.getElementById('editorPlaceholder').classList.remove('hidden');
    document.getElementById('assetEditor').classList.add('hidden');
    state.selectedAsset = null;
    renderAssetList();
}

function renderTags() {
    const container = document.getElementById('tagsContainer');
    container.innerHTML = state.tags.map((tag, index) => `
        <span class="tag">
            ${escapeHtml(tag)}
            <button onclick="removeTag(${index})" type="button">&times;</button>
        </span>
    `).join('');
}

function updateLineNumbers() {
    const editor = document.getElementById('jsonEditor');
    const lineNumbers = document.getElementById('lineNumbers');
    
    if (!editor || !lineNumbers) return;

    const lines = editor.value.split('\n').length;
    lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
}

function validateJson() {
    const editor = document.getElementById('jsonEditor');
    const validation = document.getElementById('jsonValidation');
    
    if (!editor || !validation) return false;

    try {
        JSON.parse(editor.value || '{}');
        validation.className = 'validation-status valid';
        validation.innerHTML = '<i data-lucide="check-circle"></i><span>Valid JSON</span>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return true;
    } catch (e) {
        validation.className = 'validation-status invalid';
        validation.innerHTML = `<i data-lucide="x-circle"></i><span>Invalid: ${e.message}</span>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return false;
    }
}

function updateTokenCount() {
    const jsonEditor = document.getElementById('jsonEditor');
    const textEditor = document.getElementById('textEditor');
    const tokenCount = document.getElementById('tokenCount');
    
    if (!tokenCount) return;

    const content = (jsonEditor?.value || '') + (textEditor?.value || '');
    const tokens = Math.ceil(content.length / 4);
    tokenCount.textContent = `~${tokens.toLocaleString()} tokens`;
}

function updatePreview() {
    const jsonEditor = document.getElementById('jsonEditor');
    const previewContent = document.getElementById('previewContent');
    
    if (!previewContent) return;

    try {
        const json = JSON.parse(jsonEditor?.value || '{}');
        previewContent.innerHTML = renderJsonPreview(json);
    } catch (e) {
        previewContent.innerHTML = '<p class="preview-placeholder">Invalid JSON - fix errors to preview</p>';
    }
}

function renderJsonPreview(obj, depth = 0) {
    if (depth > 5) return '<span class="text-muted">...</span>';

    if (Array.isArray(obj)) {
        return `<ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
            ${obj.map(item => `<li>${typeof item === 'object' ? renderJsonPreview(item, depth + 1) : escapeHtml(String(item))}</li>`).join('')}
        </ul>`;
    }

    if (typeof obj === 'object' && obj !== null) {
        return Object.entries(obj).map(([key, value]) => {
            const displayValue = typeof value === 'object' 
                ? renderJsonPreview(value, depth + 1)
                : escapeHtml(String(value));
            return `<div style="margin: 0.5rem 0;">
                <strong style="color: var(--primary)">${escapeHtml(key)}:</strong> ${displayValue}
            </div>`;
        }).join('');
    }

    return escapeHtml(String(obj));
}

function updateLoadingState(loading) {
    const listContainer = document.getElementById('assetList');
    if (loading) {
        listContainer.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading assets...</p>
            </div>
        `;
    }
}

// ============================================
// EVENT HANDLERS
// ============================================

function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
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

    // Type filter
    const typeFilter = document.getElementById('typeFilter');
    if (typeFilter) {
        typeFilter.addEventListener('change', (e) => {
            state.filters.type = e.target.value;
            loadAssets();
        });
    }

    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            state.filters.status = e.target.value;
            loadAssets();
        });
    }

    // New asset button
    const newAssetBtn = document.getElementById('newAssetBtn');
    if (newAssetBtn) {
        newAssetBtn.addEventListener('click', openNewAssetModal);
    }

    // Import button
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        importBtn.addEventListener('click', () => openModal('importModal'));
    }

    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportAssets);
    }

    // Editor tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            switchTab(tab);
        });
    });

    // JSON editor
    const jsonEditor = document.getElementById('jsonEditor');
    if (jsonEditor) {
        jsonEditor.addEventListener('input', () => {
            updateLineNumbers();
            validateJson();
            updateTokenCount();
            updatePreview();
            state.isDirty = true;
        });

        jsonEditor.addEventListener('scroll', () => {
            const lineNumbers = document.getElementById('lineNumbers');
            if (lineNumbers) {
                lineNumbers.scrollTop = jsonEditor.scrollTop;
            }
        });

        jsonEditor.addEventListener('keydown', (e) => {
            // Handle Tab key for indentation
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = jsonEditor.selectionStart;
                const end = jsonEditor.selectionEnd;
                jsonEditor.value = jsonEditor.value.substring(0, start) + '  ' + jsonEditor.value.substring(end);
                jsonEditor.selectionStart = jsonEditor.selectionEnd = start + 2;
                updateLineNumbers();
            }
        });
    }

    // Text editor
    const textEditor = document.getElementById('textEditor');
    if (textEditor) {
        textEditor.addEventListener('input', () => {
            updateTokenCount();
            state.isDirty = true;
        });
    }

    // Asset name
    const assetName = document.getElementById('assetName');
    if (assetName) {
        assetName.addEventListener('input', () => {
            state.isDirty = true;
        });
    }

    // Tag input
    const tagInput = document.getElementById('tagInput');
    if (tagInput) {
        tagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag(tagInput.value.trim());
                tagInput.value = '';
            }
        });
    }

    // Save button
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleSave);
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', handleCancel);
    }

    // History button
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
        historyBtn.addEventListener('click', openVersionHistory);
    }

    // Preview button
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn) {
        previewBtn.addEventListener('click', () => switchTab('preview'));
    }

    // Duplicate button
    const duplicateBtn = document.getElementById('duplicateBtn');
    if (duplicateBtn) {
        duplicateBtn.addEventListener('click', () => {
            if (state.selectedAsset) {
                duplicateAsset(state.selectedAsset.id);
            }
        });
    }

    // Delete button
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', openDeleteModal);
    }

    // Import file
    const importFile = document.getElementById('importFile');
    if (importFile) {
        importFile.addEventListener('change', handleImportFile);
    }

    // Import dropzone
    const importDropzone = document.getElementById('importDropzone');
    if (importDropzone) {
        importDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            importDropzone.classList.add('dragover');
        });

        importDropzone.addEventListener('dragleave', () => {
            importDropzone.classList.remove('dragover');
        });

        importDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            importDropzone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) {
                processImportFile(file);
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (state.selectedAsset && state.isDirty) {
                handleSave();
            }
        }

        // Escape to close modals
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// ============================================
// ACTION HANDLERS
// ============================================

async function selectAsset(id) {
    if (state.isDirty) {
        if (!confirm('You have unsaved changes. Discard them?')) {
            return;
        }
    }

    try {
        const asset = await loadAsset(id);
        populateEditor(asset);
    } catch (error) {
        console.error('Failed to select asset:', error);
    }
}

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

function addTag(tag) {
    if (tag && !state.tags.includes(tag)) {
        state.tags.push(tag);
        renderTags();
        state.isDirty = true;
    }
}

function removeTag(index) {
    state.tags.splice(index, 1);
    renderTags();
    state.isDirty = true;
}

async function handleSave() {
    if (!validateJson()) {
        showToast('Please fix JSON errors before saving', 'error');
        switchTab('json');
        return;
    }

    const assetData = {
        name: document.getElementById('assetName').value,
        description: document.getElementById('assetDescription').value,
        asset_type: document.getElementById('assetType').value,
        content_json: JSON.parse(document.getElementById('jsonEditor').value || '{}'),
        content_text: document.getElementById('textEditor').value,
        tags: state.tags
    };

    if (!assetData.name) {
        showToast('Asset name is required', 'error');
        return;
    }

    await saveAsset(assetData);
}

function handleCancel() {
    if (state.isDirty) {
        if (!confirm('Discard unsaved changes?')) {
            return;
        }
    }

    if (state.selectedAsset) {
        // Reload original data
        selectAsset(state.selectedAsset.id);
    } else {
        hideEditor();
    }
}

function openNewAssetModal() {
    openModal('newAssetModal');
    document.getElementById('newAssetName').value = '';
    document.getElementById('newAssetDescription').value = '';
}

async function createNewAsset() {
    const type = document.getElementById('newAssetType').value;
    const name = document.getElementById('newAssetName').value;
    const description = document.getElementById('newAssetDescription').value;
    const template = document.querySelector('input[name="template"]:checked')?.value || 'blank';

    if (!name) {
        showToast('Asset name is required', 'error');
        return;
    }

    let content_json = {};
    
    if (template === 'template' || template === 'example') {
        try {
            const data = await apiCall(`/templates/${type}`);
            content_json = data.template || {};
        } catch (e) {
            // Use empty object if template not found
        }
    }

    closeModal('newAssetModal');

    // Create a temporary new asset object
    state.selectedAsset = {
        id: null,
        asset_type: type,
        name,
        description,
        content_json,
        content_text: '',
        tags: [],
        version: 1
    };

    populateEditor(state.selectedAsset);
    state.isDirty = true;
}

function openDeleteModal() {
    if (!state.selectedAsset) return;
    
    document.getElementById('deleteAssetName').textContent = state.selectedAsset.name;
    openModal('deleteModal');
}

async function confirmDelete() {
    if (!state.selectedAsset) return;
    
    await deleteAsset(state.selectedAsset.id);
    closeModal('deleteModal');
}

async function openVersionHistory() {
    if (!state.selectedAsset?.id) return;

    const versions = await loadVersionHistory(state.selectedAsset.id);
    const versionList = document.getElementById('versionList');

    if (versions.length === 0) {
        versionList.innerHTML = '<p class="text-muted">No version history available</p>';
    } else {
        versionList.innerHTML = versions.map(v => `
            <div class="version-item ${v.version === state.selectedAsset.version ? 'current' : ''}">
                <div class="version-info">
                    <h4>Version ${v.version}</h4>
                    <p>${v.change_summary || 'No description'} • ${formatTimeAgo(v.created_at)}</p>
                </div>
                ${v.version !== state.selectedAsset.version ? `
                    <button class="btn-secondary" onclick="rollbackToVersion('${state.selectedAsset.id}', ${v.version})">
                        Restore
                    </button>
                ` : '<span class="text-muted">Current</span>'}
            </div>
        `).join('');
    }

    openModal('historyModal');
}

async function exportAssets() {
    try {
        const data = await apiCall('/assets/export');
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `context-assets-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`Exported ${data.count} assets`, 'success');
    } catch (error) {
        showToast('Failed to export assets', 'error');
    }
}

function handleImportFile(e) {
    const file = e.target.files[0];
    if (file) {
        processImportFile(file);
    }
}

async function processImportFile(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);

        const assets = data.assets || (Array.isArray(data) ? data : [data]);

        if (assets.length === 0) {
            showToast('No assets found in file', 'error');
            return;
        }

        const result = await apiCall('/assets/import', {
            method: 'POST',
            body: JSON.stringify({ assets })
        });

        closeModal('importModal');
        showToast(`Imported ${result.imported} assets`, 'success');
        
        if (result.failed > 0) {
            showToast(`${result.failed} assets failed to import`, 'warning');
        }

        await loadAssets();
    } catch (error) {
        showToast('Failed to import: ' + error.message, 'error');
    }
}

// ============================================
// MODAL HELPERS
// ============================================

function openModal(modalId) {
    document.getElementById(modalId)?.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}"></i>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTimeAgo(dateString) {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
}

function getDefaultTypes() {
    return {
        voice_dna: { icon: '🎤', display_name: 'VoiceDNA' },
        icp: { icon: '👤', display_name: 'ICP' },
        products: { icon: '📦', display_name: 'Products' },
        company_description: { icon: '🏢', display_name: 'Company Description' },
        why_we_win: { icon: '🏆', display_name: 'Why We Win' },
        pain_points: { icon: '🎯', display_name: 'Pain Points' },
        core_values: { icon: '💎', display_name: 'Core Values' },
        custom_processes: { icon: '⚙️', display_name: 'Custom Processes' },
        competitors: { icon: '⚔️', display_name: 'Competitors' },
        case_studies: { icon: '📖', display_name: 'Case Studies' },
        faqs: { icon: '❓', display_name: 'FAQs' },
        team_bios: { icon: '👥', display_name: 'Team Bios' },
        industry_context: { icon: '🌐', display_name: 'Industry Context' },
        terminology: { icon: '📚', display_name: 'Terminology' },
        templates: { icon: '📝', display_name: 'Templates' },
        pricing: { icon: '💰', display_name: 'Pricing' },
        brand_guidelines: { icon: '🎨', display_name: 'Brand Guidelines' },
        personas: { icon: '🎭', display_name: 'Personas' }
    };
}

// ============================================
// GLOBAL FUNCTIONS (for onclick handlers)
// ============================================

window.selectAsset = selectAsset;
window.openNewAssetModal = openNewAssetModal;
window.createNewAsset = createNewAsset;
window.closeModal = closeModal;
window.confirmDelete = confirmDelete;
window.rollbackToVersion = rollbackToVersion;
window.removeTag = removeTag;
