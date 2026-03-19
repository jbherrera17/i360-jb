/* global authFetch, IconPicker */
/**
 * Asset Types Admin - Insight 360
 * CRUD operations for managing context asset types
 * Version: 3.0.0 - Using shared IconPicker component
 */

// State
let assetTypes = [];
let assetCounts = {};
let editingType = null;
let deletingType = null;
let assetTypeIconPicker = null;

/**
 * Initialize the page
 */
async function init() {
    initIconPicker();
    await loadAssetTypes();
    await loadAssetCounts();
    renderTable();
    updateStats();
}

/**
 * Initialize the shared IconPicker component
 */
function initIconPicker() {
    const container = document.getElementById('icon-picker-container');
    if (!container || typeof IconPicker === 'undefined') return;

    assetTypeIconPicker = IconPicker.create(container, {
        value: '',
        onSelect: (iconName) => {
            // Icon selected - no additional action needed
        }
    });
}

/**
 * Load asset types from API
 */
async function loadAssetTypes() {
    try {
        const response = await authFetch('/api/context/types');
        const result = await response.json();

        if (result.success) {
            assetTypes = result.data;
        } else {
            showToast('Failed to load asset types', 'error');
        }
    } catch (error) {
        console.error('Error loading asset types:', error);
        showToast('Failed to load asset types', 'error');
    }
}

/**
 * Load asset counts per type
 */
async function loadAssetCounts() {
    try {
        const response = await authFetch('/api/context/stats');
        const result = await response.json();

        if (result.success && result.data.by_type) {
            assetCounts = {};
            for (const [key, value] of Object.entries(result.data.by_type)) {
                assetCounts[key] = value.count || 0;
            }
        }
    } catch (error) {
        console.error('Error loading asset counts:', error);
    }
}

/**
 * Render icon in table - handles both Lucide icons and legacy emojis
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
    return `<span style="font-size: 1.5rem;">${escapeHtml(icon)}</span>`;
}

/**
 * Render the types table
 */
function renderTable() {
    const tbody = document.getElementById('types-table-body');
    const searchTerm = document.getElementById('search-input').value.toLowerCase();

    const filtered = assetTypes.filter(type =>
        type.type_key.toLowerCase().includes(searchTerm) ||
        type.display_name.toLowerCase().includes(searchTerm)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i data-lucide="folder-open"></i>
                        <h3>No asset types found</h3>
                        <p>${searchTerm ? 'Try a different search term' : 'Click "Add Type" to create one'}</p>
                    </div>
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }

    tbody.innerHTML = filtered.map(type => `
        <tr>
            <td><div class="type-icon-display">${renderTypeIcon(type.icon)}</div></td>
            <td><code class="type-key">${escapeHtml(type.type_key)}</code></td>
            <td>${escapeHtml(type.display_name)}</td>
            <td>
                <span class="category-badge category-${type.category}">
                    ${type.category}
                </span>
            </td>
            <td><span class="asset-count">${assetCounts[type.type_key] || 0}</span></td>
            <td>
                <div class="actions-cell">
                    <button class="btn-icon" onclick="openEditModal('${type.type_key}')" title="Edit">
                        <i data-lucide="pencil" width="16" height="16"></i>
                    </button>
                    <button class="btn-icon danger" onclick="openDeleteModal('${type.type_key}')" title="Delete">
                        <i data-lucide="trash-2" width="16" height="16"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    lucide.createIcons();
}

/**
 * Update stats display
 */
function updateStats() {
    const total = assetTypes.length;
    const core = assetTypes.filter(t => t.category === 'core').length;
    const extended = assetTypes.filter(t => t.category === 'extended').length;
    const totalAssets = Object.values(assetCounts).reduce((sum, count) => sum + count, 0);

    document.getElementById('total-types').textContent = total;
    document.getElementById('core-types').textContent = core;
    document.getElementById('extended-types').textContent = extended;
    document.getElementById('total-assets').textContent = totalAssets;
}

/**
 * Filter types based on search
 */
function filterTypes() {
    renderTable();
}

/**
 * Open create modal
 */
function openCreateModal() {
    editingType = null;

    document.getElementById('modal-title').textContent = 'Add Asset Type';
    document.getElementById('submit-btn').textContent = 'Create Type';
    document.getElementById('type-key').disabled = false;

    // Reset form
    document.getElementById('type-form').reset();

    // Reset icon picker
    if (assetTypeIconPicker) {
        assetTypeIconPicker.setValue('');
    }

    // Show modal
    document.getElementById('modal-overlay').classList.add('active');
}

/**
 * Open edit modal
 */
function openEditModal(typeKey) {
    const type = assetTypes.find(t => t.type_key === typeKey);
    if (!type) return;

    editingType = typeKey;

    document.getElementById('modal-title').textContent = 'Edit Asset Type';
    document.getElementById('submit-btn').textContent = 'Save Changes';
    document.getElementById('type-key').value = type.type_key;
    document.getElementById('type-key').disabled = true; // Can't change type key
    document.getElementById('display-name').value = type.display_name;
    document.getElementById('category').value = type.category;

    // Set icon picker value
    if (assetTypeIconPicker) {
        assetTypeIconPicker.setValue(type.icon || '');
    }

    // Show modal
    document.getElementById('modal-overlay').classList.add('active');
}

/**
 * Close modal
 */
function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    editingType = null;
}

/**
 * Handle form submit
 */
async function handleSubmit(event) {
    event.preventDefault();

    const typeKey = document.getElementById('type-key').value;
    const displayName = document.getElementById('display-name').value;
    const category = document.getElementById('category').value;
    const icon = (assetTypeIconPicker ? assetTypeIconPicker.getValue() : '') || 'file';

    const data = {
        type_key: typeKey,
        display_name: displayName,
        category: category,
        icon: icon
    };

    try {
        let response;
        if (editingType) {
            // Update existing
            response = await authFetch(`/api/context/types/${editingType}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            // Create new
            response = await authFetch('/api/context/types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }

        const result = await response.json();

        if (result.success) {
            showToast(editingType ? 'Type updated successfully' : 'Type created successfully', 'success');
            closeModal();
            await loadAssetTypes();
            renderTable();
            updateStats();
        } else {
            showToast(result.error || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Error saving asset type:', error);
        showToast('Failed to save asset type', 'error');
    }
}

/**
 * Open delete confirmation modal - using ModalService
 */
async function openDeleteModal(typeKey) {
    const type = assetTypes.find(t => t.type_key === typeKey);
    if (!type) return;

    const confirmed = await ModalService.confirm({
        title: 'Delete Asset Type',
        message: `Are you sure you want to delete <strong>${escapeHtml(type.display_name)}</strong>?<br><br><span style="color: var(--text-secondary);">This action cannot be undone. Assets with this type will retain their data but may not display correctly.</span>`,
        confirmText: 'Delete Type',
        confirmClass: 'btn-danger'
    });

    if (confirmed) {
        await performDelete(typeKey);
    }
}

/**
 * Perform the actual delete operation
 */
async function performDelete(typeKey) {
    try {
        const response = await authFetch(`/api/context/types/${typeKey}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            ModalService.success('Type deleted successfully');
            await loadAssetTypes();
            renderTable();
            updateStats();
        } else {
            ModalService.error(result.error || 'Delete failed');
        }
    } catch (error) {
        console.error('Error deleting asset type:', error);
        ModalService.error('Failed to delete asset type');
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toastIcon.setAttribute('data-lucide', type === 'success' ? 'check-circle' : 'alert-circle');
    lucide.createIcons();

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
