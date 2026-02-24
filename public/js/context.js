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
// ICON RENDERING HELPER
// ============================================

/**
 * Render icon - handles both Lucide icons and legacy emojis
 * @param {string} icon - Icon name or emoji
 * @returns {string} - HTML string for the icon
 */
function renderTypeIcon(icon) {
    if (!icon) return '<i data-lucide="file" width="20" height="20"></i>';

    // Check if it's a valid Lucide icon name (lowercase letters, numbers, and hyphens only)
    const isValidLucideIcon = /^[a-z0-9-]+$/.test(icon);

    if (isValidLucideIcon) {
        // It's a Lucide icon name
        return `<i data-lucide="${escapeHtml(icon)}" width="20" height="20"></i>`;
    }

    // It's an emoji or other character - render as text
    return `<span style="font-size: 1.25rem;">${escapeHtml(icon)}</span>`;
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Context Admin initializing...');

    // Apply saved theme
    const savedTheme = localStorage.getItem('insight360-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Initialize navigation
    if (typeof initNavigation === 'function') await initNavigation();

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Initialize usage nudge (soft-limit warnings)
    if (typeof UsageNudge !== 'undefined') UsageNudge.init();

    // Load data
    await loadAssetTypes();
    await loadDepartments();
    await loadAssets();

    // Set up event listeners
    setupEventListeners();

    // Show empty state on initial load (no asset selected)
    showEmptyState();

    // Make plain text editor editable for non-technical users
    const plainTextEditor = document.getElementById('plainTextEditor');
    if (plainTextEditor) {
        plainTextEditor.readOnly = false;
        plainTextEditor.style.backgroundColor = 'var(--bg-primary)';
        plainTextEditor.style.cursor = 'text';
        plainTextEditor.placeholder = 'Edit your content in markdown format here...';
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
        { type_key: 'voice_dna', icon: 'mic', display_name: 'VoiceDNA', category: 'core' },
        { type_key: 'icp', icon: 'user', display_name: 'ICP', category: 'core' },
        { type_key: 'products', icon: 'package', display_name: 'Products', category: 'core' },
        { type_key: 'company_description', icon: 'building-2', display_name: 'Company Description', category: 'core' },
        { type_key: 'why_we_win', icon: 'trophy', display_name: 'Why We Win', category: 'core' },
        { type_key: 'core_values', icon: 'gem', display_name: 'Core Values', category: 'core' },
        { type_key: 'pain_points', icon: 'target', display_name: 'Pain Points', category: 'core' },
        { type_key: 'custom_processes', icon: 'settings', display_name: 'Custom Processes', category: 'core' },
        { type_key: 'competitors', icon: 'swords', display_name: 'Competitors', category: 'extended' },
        { type_key: 'case_studies', icon: 'book-open', display_name: 'Case Studies', category: 'extended' },
        { type_key: 'faqs', icon: 'help-circle', display_name: 'FAQs', category: 'extended' },
        { type_key: 'team_bios', icon: 'users', display_name: 'Team Bios', category: 'extended' },
        { type_key: 'industry_context', icon: 'globe', display_name: 'Industry Context', category: 'extended' },
        { type_key: 'terminology', icon: 'library', display_name: 'Terminology', category: 'extended' },
        { type_key: 'templates', icon: 'file-text', display_name: 'Templates', category: 'extended' },
        { type_key: 'pricing', icon: 'dollar-sign', display_name: 'Pricing', category: 'extended' },
        { type_key: 'brand_guidelines', icon: 'palette', display_name: 'Brand Guidelines', category: 'extended' },
        { type_key: 'personas', icon: 'drama', display_name: 'Personas', category: 'extended' }
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
                <div class="empty-icon"><i data-lucide="package" style="width:48px;height:48px;opacity:0.4;"></i></div>
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
                        { icon: 'file', display_name: asset.asset_type };
        const updatedDate = asset.updated_at ? formatRelativeDate(asset.updated_at) : '';
        const isTemplate = asset.is_template || (asset.tags || []).includes('template');
        const templateBadge = isTemplate ? '<span class="asset-template-badge">Template</span>' : '';
        const templateClass = isTemplate ? ' is-template' : '';

        return `
            <div class="asset-item${templateClass} ${state.selectedAsset?.id === asset.id ? 'selected' : ''}"
                 onclick="selectAsset('${asset.id}')">
                <div class="asset-icon">${renderTypeIcon(typeInfo.icon)}</div>
                <div class="asset-info">
                    <div class="asset-name">${escapeHtml(asset.name)}</div>
                    <div class="asset-meta">
                        ${typeInfo.display_name} • v${asset.version || 1}${updatedDate ? ` • ${updatedDate}` : ''}
                    </div>
                </div>
                ${templateBadge}
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

    // Generate and display plain text - make it EDITABLE
    if (plainTextEditor) {
        const plainText = generatePlainText(asset.content_json || {});
        plainTextEditor.value = plainText;
        // Make plain text editor editable for non-technical users
        plainTextEditor.readOnly = false;
        plainTextEditor.style.backgroundColor = 'var(--bg-primary)';
        plainTextEditor.style.cursor = 'text';
        plainTextEditor.placeholder = 'Edit your content in markdown format here...';
    }

    // Update preview
    updatePreview();
    updateTokenCount();

    // Update editor header with proper icon rendering
    const editorTitle = document.getElementById('editorTitle');
    if (editorTitle) {
        const typeInfo = state.assetTypes.find(t => t.type_key === asset.asset_type) ||
                        { icon: 'file', display_name: 'Asset' };
        editorTitle.innerHTML = `<span class="editor-title-icon">${renderTypeIcon(typeInfo.icon)}</span><span class="editor-title-text">${escapeHtml(asset.name)}</span>`;
        // Re-render Lucide icons
        if (typeof lucide !== 'undefined') lucide.createIcons();
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

    // Show/hide template callout banner
    const isTemplate = asset.is_template || (asset.tags || []).includes('template');
    let templateCallout = document.getElementById('templateCallout');
    if (isTemplate) {
        if (!templateCallout) {
            templateCallout = document.createElement('div');
            templateCallout.id = 'templateCallout';
            templateCallout.className = 'template-callout';
            templateCallout.innerHTML = `
                <i data-lucide="bookmark" style="width:16px;height:16px;flex-shrink:0;color:var(--warning, #f59e0b);"></i>
                <span><strong>Template:</strong> Duplicate and customize this for your organization.</span>
                <button class="btn-duplicate" onclick="duplicateAsset()">
                    <i data-lucide="copy" style="width:14px;height:14px;"></i> Duplicate
                </button>
            `;
            const editorContent = document.getElementById('editorContent');
            if (editorContent) {
                editorContent.parentNode.insertBefore(templateCallout, editorContent);
            }
        }
        templateCallout.style.display = 'flex';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } else {
        if (templateCallout) templateCallout.style.display = 'none';
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
        editorTitle.innerHTML = '<i data-lucide="plus-circle" style="width:16px;height:16px;vertical-align:middle;margin-right:0.4rem;"></i>New Asset';
        if (typeof lucide !== 'undefined') lucide.createIcons();
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
        showToast('Please enter a name', 'error');
        nameInput?.focus();
        return;
    }
    
    if (!asset_type) {
        showToast('Please select an asset type', 'error');
        typeSelect?.focus();
        return;
    }
    
    // Parse JSON
    let content_json;
    try {
        content_json = JSON.parse(jsonEditor?.value || '{}');
    } catch (e) {
        showToast('Invalid JSON: ' + e.message, 'error');
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
            showToast('Asset updated successfully', 'success');
        } else {
            // Guard new creation against plan limits
            if (typeof UsageNudge !== 'undefined' && !(await UsageNudge.checkBeforeCreate('context_assets'))) return;
            // Create new
            result = await apiCall('/api/context/assets', {
                method: 'POST',
                body: JSON.stringify(assetData)
            });
            showToast('Asset created successfully', 'success');
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
        showToast('Failed to save: ' + error.message, 'error');
    }
}

async function deleteAsset(id) {
    const asset = state.assets.find(a => a.id === id);
    if (!asset) return;

    // First, check for dependencies
    try {
        showToast('Checking dependencies...', 'info');
        const response = await apiCall(`/api/context/assets/${id}/dependencies`);
        const deps = response.data;

        // Build confirmation message with dependencies
        const confirmed = await showDeleteConfirmation(asset, deps);
        if (!confirmed) return;

        // Proceed with deletion
        await apiCall(`/api/context/assets/${id}?hard=true`, {
            method: 'DELETE'
        });

        showToast('Asset deleted', 'success');

        if (state.selectedAsset?.id === id) {
            state.selectedAsset = null;
            showCreateModal();
        }

        await loadAssets();

    } catch (error) {
        showToast('Failed to delete: ' + error.message, 'error');
    }
}

/**
 * Duplicate the currently selected asset as a non-template copy
 */
async function duplicateAsset() {
    const asset = state.selectedAsset;
    if (!asset) return;

    try {
        const duplicateName = `Copy of ${asset.name}`;
        const cleanTags = (asset.tags || []).filter(t => t !== 'template');
        const assetData = {
            name: duplicateName,
            asset_type: asset.asset_type,
            description: asset.description || '',
            content_json: asset.content_json || {},
            tags: cleanTags,
            department_id: asset.department_id || null,
            is_template: false
        };

        const result = await apiCall('/api/context/assets', {
            method: 'POST',
            body: JSON.stringify(assetData)
        });

        showToast(`Duplicated as "${duplicateName}"`, 'success');
        await loadAssets();

        if (result.data?.id) {
            selectAsset(result.data.id);
        }
    } catch (error) {
        showToast('Failed to duplicate: ' + error.message, 'error');
    }
}

/**
 * Show delete confirmation modal with dependency information using ModalService
 * @param {Object} asset - The asset being deleted
 * @param {Object} deps - Dependencies object from API
 * @returns {Promise<boolean>} - Whether user confirmed deletion
 */
async function showDeleteConfirmation(asset, deps) {
    // If no dependencies, use simple confirmDanger
    if (!deps.hasAny) {
        return ModalService.confirm({
            title: 'Delete Asset',
            message: `Are you sure you want to delete "${asset.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger'
        });
    }

    // Build dependency list HTML for content modal
    let depsHtml = `
        <div class="delete-confirm-content">
            <p style="margin-bottom: 16px;">Are you sure you want to delete <strong>${escapeHtml(asset.name)}</strong>?</p>

            <div style="background: var(--bg-tertiary, #f5f5f7); border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #f59e0b;">
                <div style="font-weight: 600; color: #f59e0b; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    This asset is used by ${deps.counts.total} object${deps.counts.total !== 1 ? 's' : ''}
                </div>
    `;

    if (deps.agents.length > 0) {
        depsHtml += `
            <div style="margin-bottom: 10px;">
                <strong style="color: var(--text-secondary, #6e6e73);">Agents (${deps.agents.length}):</strong>
                <ul style="margin: 4px 0 0 20px; color: var(--text-primary, #1d1d1f);">
                    ${deps.agents.map(a => `<li>${escapeHtml(a.name)}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    if (deps.workflows.length > 0) {
        depsHtml += `
            <div style="margin-bottom: 10px;">
                <strong style="color: var(--text-secondary, #6e6e73);">Workflows (${deps.workflows.length}):</strong>
                <ul style="margin: 4px 0 0 20px; color: var(--text-primary, #1d1d1f);">
                    ${deps.workflows.map(w => `<li>${escapeHtml(w.name)}${w.is_required ? ' <span style="color: #ef4444;">(required)</span>' : ''}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    if (deps.actions.length > 0) {
        depsHtml += `
            <div style="margin-bottom: 10px;">
                <strong style="color: var(--text-secondary, #6e6e73);">Actions (${deps.actions.length}):</strong>
                <ul style="margin: 4px 0 0 20px; color: var(--text-primary, #1d1d1f);">
                    ${deps.actions.map(a => `<li>${escapeHtml(a.name)}${a.is_required ? ' <span style="color: #ef4444;">(required)</span>' : ''}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    depsHtml += `
                <p style="margin-top: 12px; font-size: 0.85rem; color: var(--text-secondary, #6e6e73);">
                    Deleting this asset will remove it from these objects. They may not function correctly without it.
                </p>
            </div>

            <p style="color: var(--text-secondary, #6e6e73); font-size: 0.9rem;">
                This action cannot be undone.
            </p>

            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border, #d2d2d7);">
                <button class="i360-btn i360-btn-secondary" id="deleteConfirmCancel" style="padding: 10px 20px; border-radius: 8px; border: 1px solid var(--border, #d2d2d7); background: var(--bg-secondary, #f5f5f7); cursor: pointer;">
                    Cancel
                </button>
                <button class="i360-btn i360-btn-danger" id="deleteConfirmOk" style="padding: 10px 20px; border-radius: 8px; border: none; background: #ef4444; color: white; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    Delete Anyway
                </button>
            </div>
        </div>
    `;

    // Use content modal with custom buttons
    return new Promise((resolve) => {
        const modal = ModalService.content({
            title: 'Delete Asset',
            content: depsHtml,
            contentType: 'html',
            width: 500,
            resizable: false
        });

        // Add click handlers after modal renders
        setTimeout(() => {
            const cancelBtn = document.getElementById('deleteConfirmCancel');
            const okBtn = document.getElementById('deleteConfirmOk');

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    modal.close();
                    resolve(false);
                });
            }

            if (okBtn) {
                okBtn.addEventListener('click', () => {
                    modal.close();
                    resolve(true);
                });
            }
        }, 100);

        // Also resolve false if modal is closed via X button
        modal.on('close', () => {
            resolve(false);
        });
    });
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
// MARKDOWN/PLAIN TEXT HANDLING
// ============================================

/**
 * Handle changes to the markdown/plain text editor
 * This allows non-technical users to edit content directly
 */
function handleMarkdownChange() {
    const plainTextEditor = document.getElementById('plainTextEditor');
    const jsonEditor = document.getElementById('jsonEditor');

    if (!plainTextEditor || !jsonEditor) return;

    state.isDirty = true;
    updateSaveButtonState();

    // Store the markdown content directly in JSON
    // We'll store it in a simple format that preserves the user's edits
    try {
        const markdownContent = plainTextEditor.value;
        const contentJson = {
            content: markdownContent,
            format: 'markdown',
            edited_at: new Date().toISOString()
        };

        // Update JSON editor to reflect the change
        jsonEditor.value = JSON.stringify(contentJson, null, 2);

        // Update preview
        updatePreview();
        updateTokenCount();

        // Mark as valid
        const validationStatus = document.getElementById('validationStatus');
        if (validationStatus) {
            validationStatus.innerHTML = '<span class="valid">✓ Content updated</span>';
        }
    } catch (e) {
        console.error('Error updating content:', e);
    }
}

function generatePlainText(json) {
    if (!json || typeof json !== 'object') return '';

    // If content was stored in markdown format, return it directly
    if (json.format === 'markdown' && json.content) {
        return json.content;
    }

    // Otherwise, extract text from JSON structure
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

    // Plain text editor (markdown editor for non-technical users)
    const plainTextEditor = document.getElementById('plainTextEditor');
    if (plainTextEditor) {
        let markdownTimeout;
        plainTextEditor.addEventListener('input', () => {
            clearTimeout(markdownTimeout);
            markdownTimeout = setTimeout(handleMarkdownChange, 300);
        });
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

    // Setup JSON toggle button
    setupJsonToggle();

    // Setup preview modal
    setupPreviewModal();
}

function updateSaveButtonState() {
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const previewModalBtn = document.getElementById('previewModalBtn');
    const viewJsonBtn = document.getElementById('viewJsonBtn');
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

    // Show preview and JSON modal buttons when editor is visible
    if (previewModalBtn) {
        previewModalBtn.style.display = isEditorVisible ? 'flex' : 'none';
    }
    if (viewJsonBtn) {
        viewJsonBtn.style.display = isEditorVisible ? 'flex' : 'none';
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
async function cancelChanges() {
    if (state.isDirty) {
        // Use ModalService for styled confirmation
        const confirmed = await ModalService.confirm({
            title: 'Discard Changes',
            message: 'You have unsaved changes. Are you sure you want to discard them?',
            confirmText: 'Discard',
            cancelText: 'Keep Editing',
            type: 'warning'
        });

        if (!confirmed) {
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

            showToast(`Importing ${data.assets.length} assets...`, 'info');

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

            showToast(`Imported ${result.data?.created || 0} assets`, 'success');
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
            showToast('Asset loaded into editor - click Save to create', 'info');
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
                editorTitle.innerHTML = '<i data-lucide="plus-circle" style="width:16px;height:16px;vertical-align:middle;margin-right:0.4rem;"></i>New Asset';
        if (typeof lucide !== 'undefined') lucide.createIcons();
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
            showToast('JSON loaded into editor - add name/type and save', 'info');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            showToast('Import cancelled', 'info');
        } else {
            showToast('Failed to import: ' + error.message, 'error');
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
        
        showToast('Export downloaded', 'success');
    } catch (error) {
        showToast('Failed to export: ' + error.message, 'error');
    }
}

// ============================================
// NOTIFICATIONS
// ============================================

function showToast(message, type = 'info') {
    if (typeof ModalService !== 'undefined' && ModalService.toast) {
        ModalService.toast({ message, type });
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
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
 * Generate modal instance (using ModalService)
 */
let createAssetModal = null;

/**
 * Get formatted asset types for the modal
 */
function getAssetTypesForModal() {
    return state.assetTypes.map(t => ({
        value: t.type_key,
        label: t.display_name,
        icon: t.icon
    }));
}

/**
 * Open the create asset modal using ModalService
 */
function openGenerateModal() {
    console.log('Opening create asset modal...');

    // Check if ModalService is available
    if (typeof ModalService === 'undefined' || !ModalService.createAsset) {
        console.error('ModalService.createAsset not available');
        showToast('Modal service not loaded', 'error');
        return;
    }

    // Create or reuse the modal
    createAssetModal = ModalService.createAsset({
        assetTypes: getAssetTypesForModal(),
        onGenerate: handleModalGenerate,
        onImport: handleModalImport,
        onCancel: () => {
            // Cancel any in-progress generation
            if (state.generateAbortController && state.isGenerating) {
                state.generateAbortController.abort();
            }
        }
    });

    console.log('Create asset modal opened, asset types:', state.assetTypes.length);
}

/**
 * Close the create asset modal
 */
function closeGenerateModal() {
    if (createAssetModal) {
        createAssetModal.close();
        createAssetModal = null;
    }
}

/**
 * Handle generate action from CreateAssetModal
 * @param {Object} data - { type, companyName, prompt, modal }
 */
async function handleModalGenerate(data) {
    const { type: assetType, companyName, prompt: description, modal } = data;

    // Create AbortController for cancellation
    state.generateAbortController = new AbortController();
    state.isGenerating = true;

    // Show status in modal
    modal.showStatus('Generating content with AI...');

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
            modal.close();

            // Show success
            showToast(`Generated ${typeInfo.display_name} content! Review and save when ready.`, 'success');

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
            showToast('Generation cancelled', 'info');
        } else {
            console.error('Generate error:', error);
            showToast('Failed to generate: ' + error.message, 'error');
        }
        modal.hideStatus();
    } finally {
        // Reset state
        state.generateAbortController = null;
        state.isGenerating = false;
    }
}

/**
 * Handle import action from CreateAssetModal
 * @param {Object} data - { type, source, content, file, modal }
 */
async function handleModalImport(data) {
    const { type: assetType, source, content, modal } = data;

    // Validation
    if (content.length < 50) {
        showToast('Content is too short. Please provide more detail.', 'error');
        return;
    }

    // Create AbortController for cancellation
    state.generateAbortController = new AbortController();
    state.isGenerating = true;

    // Show status in modal
    modal.showStatus('Analyzing and structuring content...');

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

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || `HTTP ${response.status}`);
        }

        if (responseData.success && responseData.asset) {
            const asset = responseData.asset;

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
            modal.close();

            // Show success with confidence info
            const confidence = responseData.metadata?.confidence || 0;
            const confidenceText = confidence >= 0.9 ? 'high' : confidence >= 0.7 ? 'good' : 'moderate';
            showToast(
                `Created ${typeInfo.icon} ${typeInfo.display_name} with ${confidenceText} confidence. Review and save when ready.`,
                'success'
            );

            // Mark as dirty so user knows to save
            state.selectedAsset = null;
            state.isDirty = true;
            updateSaveButtonState();

            // Log any fields needing review
            if (responseData.metadata?.needs_review?.length > 0) {
                console.log('Fields needing review:', responseData.metadata.needs_review);
            }

        } else {
            throw new Error(responseData.error || 'Failed to parse content');
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            showToast('Conversion cancelled', 'info');
        } else {
            console.error('Import error:', error);
            showToast('Failed to convert: ' + error.message, 'error');
        }
        modal.hideStatus();
    } finally {
        // Reset state
        state.generateAbortController = null;
        state.isGenerating = false;
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
 * Now uses ModalService - only need to set up the toolbar button
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

    // All other event handling is now managed by CreateAssetModal via ModalService
}
// ============================================
// JSON TOGGLE
// ============================================

/**
 * Setup JSON editor toggle functionality
 */
function setupJsonToggle() {
    const toggleBtn = document.getElementById('toggleJsonBtn');
    const jsonContainer = document.getElementById('jsonEditorContainer');

    if (toggleBtn && jsonContainer) {
        toggleBtn.addEventListener('click', () => {
            const isVisible = jsonContainer.style.display !== 'none';
            jsonContainer.style.display = isVisible ? 'none' : 'block';

            // Update icon
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.setAttribute('data-lucide', isVisible ? 'chevron-down' : 'chevron-up');
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        });
    }
}

// ============================================
// PREVIEW & JSON MODALS (using ModalService)
// ============================================

/**
 * Setup preview and JSON modal functionality
 */
function setupPreviewModal() {
    const previewBtn = document.getElementById('previewModalBtn');
    const viewJsonBtn = document.getElementById('viewJsonBtn');

    if (previewBtn) {
        previewBtn.addEventListener('click', openPreviewModal);
    }

    if (viewJsonBtn) {
        viewJsonBtn.addEventListener('click', openJsonModal);
    }
}

/**
 * Open the preview modal using ModalService
 * Now renders markdown content from the plainTextEditor
 */
async function openPreviewModal() {
    // Get the markdown content from the plain text editor
    const plainTextEditor = document.getElementById('plainTextEditor');
    if (!plainTextEditor) {
        console.warn('No markdown editor found');
        return;
    }

    const markdownContent = plainTextEditor.value || '';

    // Wait for ModalService to be loaded if needed
    if (window.ModalServiceLoader && !window.ModalServiceLoader.isLoaded()) {
        try {
            await window.ModalServiceLoader.load();
        } catch (e) {
            console.warn('[Context] Failed to load ModalService:', e);
            return;
        }
    }

    // Use ModalService.content() with markdown content type
    if (window.ModalService && typeof window.ModalService.content === 'function') {
        ModalService.content({
            title: 'Content Preview',
            content: markdownContent,
            contentType: 'markdown',
            width: 700,
            height: 600,
            resizable: true,
            maximizable: true
        });
    } else {
        console.warn('[Context] ModalService.content not available');
    }
}

/**
 * Open the JSON viewer modal using ModalService
 */
async function openJsonModal() {
    // Get the JSON content from the hidden JSON editor
    const jsonEditor = document.getElementById('jsonEditor');
    if (!jsonEditor) {
        console.warn('No JSON editor found');
        return;
    }

    let jsonContent = jsonEditor.value || '{}';

    // Try to format the JSON for better readability
    try {
        const parsed = JSON.parse(jsonContent);
        jsonContent = JSON.stringify(parsed, null, 2);
    } catch (e) {
        // If parsing fails, show as-is
    }

    // Wait for ModalService to be loaded if needed
    if (window.ModalServiceLoader && !window.ModalServiceLoader.isLoaded()) {
        try {
            await window.ModalServiceLoader.load();
        } catch (e) {
            console.warn('[Context] Failed to load ModalService:', e);
            return;
        }
    }

    // Use ModalService.content() with code content type
    if (window.ModalService && typeof window.ModalService.content === 'function') {
        ModalService.content({
            title: 'JSON Data',
            content: jsonContent,
            contentType: 'code',
            language: 'json',
            copyable: true,
            width: 700,
            height: 600,
            resizable: true,
            maximizable: true
        });
    } else {
        console.warn('[Context] ModalService.content not available');
    }
}