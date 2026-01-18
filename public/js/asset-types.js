/**
 * Asset Types Admin - Insight 360
 * CRUD operations for managing context asset types
 * Version: 2.0.0 - Using Lucide Icons
 */

// State
let assetTypes = [];
let assetCounts = {};
let editingType = null;
let deletingType = null;
let selectedIcon = '';
let allIcons = [];
let filteredIconList = [];

// Common Lucide icons for asset types (curated list)
const RECOMMENDED_ICONS = [
    'building', 'trophy', 'package', 'target', 'mic', 'user', 'gem', 'settings',
    'swords', 'book-open', 'help-circle', 'users', 'globe', 'library', 'file-text', 'dollar-sign',
    'palette', 'theater', 'bar-chart', 'trending-up', 'lightbulb', 'wrench', 'hammer', 'link',
    'mail', 'smartphone', 'laptop', 'monitor', 'folder-open', 'folder', 'archive', 'clipboard',
    'check-circle', 'star', 'rocket', 'tent', 'medal', 'award', 'briefcase', 'pin',
    'compass', 'map', 'flag', 'bookmark', 'heart', 'zap', 'flame', 'sparkles',
    'shield', 'lock', 'key', 'eye', 'search', 'filter', 'layers', 'grid',
    'calendar', 'clock', 'bell', 'message-square', 'phone', 'video', 'image', 'camera',
    'music', 'headphones', 'play', 'film', 'tv', 'radio', 'speaker', 'volume-2',
    'database', 'server', 'cloud', 'cpu', 'hard-drive', 'wifi', 'bluetooth', 'signal',
    'code', 'terminal', 'git-branch', 'github', 'box', 'boxes', 'truck', 'plane',
    'shopping-cart', 'credit-card', 'wallet', 'coins', 'banknote', 'receipt', 'tag', 'percent'
];

/**
 * Convert PascalCase to kebab-case (handles numbers like Grid2x2Check -> grid-2x2-check)
 */
function pascalToKebab(str) {
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')  // lowercase followed by uppercase
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')  // uppercase followed by uppercase+lowercase
        .replace(/([a-zA-Z])(\d)/g, '$1-$2')  // letter followed by number
        .replace(/(\d)([a-zA-Z])/g, '$1-$2')  // number followed by letter
        .toLowerCase();
}

/**
 * Initialize the page
 */
async function init() {
    await loadLucideIcons();
    setupIconPicker();
    await loadAssetTypes();
    await loadAssetCounts();
    renderTable();
    updateStats();
}

/**
 * Load all Lucide icons
 */
async function loadLucideIcons() {
    // Wait for Lucide to be fully loaded
    await new Promise(resolve => {
        if (typeof lucide !== 'undefined' && lucide.icons) {
            resolve();
        } else {
            setTimeout(resolve, 500);
        }
    });

    // Get all icons from Lucide library
    if (typeof lucide !== 'undefined' && lucide.icons) {
        allIcons = Object.keys(lucide.icons).map(name => pascalToKebab(name));
    } else {
        // Fallback to recommended icons
        allIcons = [...RECOMMENDED_ICONS];
    }

    filteredIconList = [...RECOMMENDED_ICONS]; // Start with recommended icons
}

/**
 * Setup icon picker
 */
function setupIconPicker() {
    renderIconPicker(RECOMMENDED_ICONS);

    // Setup search
    const searchInput = document.getElementById('icon-search');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query === '') {
            filteredIconList = [...RECOMMENDED_ICONS];
        } else {
            filteredIconList = allIcons.filter(icon => icon.includes(query)).slice(0, 64);
        }
        renderIconPicker(filteredIconList);
    });
}

/**
 * Render icon picker with given icons
 */
function renderIconPicker(icons) {
    const picker = document.getElementById('icon-picker');
    picker.innerHTML = icons.map(icon => `
        <button type="button" class="icon-option ${selectedIcon === icon ? 'selected' : ''}"
                data-icon="${icon}" onclick="selectIcon('${icon}')" title="${icon}">
            <i data-lucide="${icon}" width="20" height="20"></i>
        </button>
    `).join('');
    lucide.createIcons();
}

/**
 * Select an icon
 */
function selectIcon(icon) {
    selectedIcon = icon;
    document.getElementById('icon-preview').value = icon;

    // Update selected state
    document.querySelectorAll('.icon-option').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.icon === icon);
    });
}

/**
 * Load asset types from API
 */
async function loadAssetTypes() {
    try {
        const response = await fetch('/api/context/types');
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
        const response = await fetch('/api/context/stats');
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
    selectedIcon = '';

    document.getElementById('modal-title').textContent = 'Add Asset Type';
    document.getElementById('submit-btn').textContent = 'Create Type';
    document.getElementById('type-key').disabled = false;

    // Reset form
    document.getElementById('type-form').reset();
    document.getElementById('icon-preview').value = '';
    document.getElementById('icon-search').value = '';

    // Reset icon picker to recommended icons
    filteredIconList = [...RECOMMENDED_ICONS];
    renderIconPicker(filteredIconList);

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
    selectedIcon = type.icon || '';

    document.getElementById('modal-title').textContent = 'Edit Asset Type';
    document.getElementById('submit-btn').textContent = 'Save Changes';
    document.getElementById('type-key').value = type.type_key;
    document.getElementById('type-key').disabled = true; // Can't change type key
    document.getElementById('display-name').value = type.display_name;
    document.getElementById('category').value = type.category;
    document.getElementById('icon-preview').value = type.icon || '';
    document.getElementById('icon-search').value = '';

    // Reset icon picker to recommended icons and update selection
    filteredIconList = [...RECOMMENDED_ICONS];
    renderIconPicker(filteredIconList);

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
    const icon = selectedIcon || 'file';

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
            response = await fetch(`/api/context/types/${editingType}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            // Create new
            response = await fetch('/api/context/types', {
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
 * Open delete confirmation modal
 */
function openDeleteModal(typeKey) {
    const type = assetTypes.find(t => t.type_key === typeKey);
    if (!type) return;

    deletingType = typeKey;
    document.getElementById('delete-type-name').textContent = type.display_name;
    document.getElementById('delete-modal-overlay').classList.add('active');
}

/**
 * Close delete modal
 */
function closeDeleteModal() {
    document.getElementById('delete-modal-overlay').classList.remove('active');
    deletingType = null;
}

/**
 * Confirm delete
 */
async function confirmDelete() {
    if (!deletingType) return;

    try {
        const response = await fetch(`/api/context/types/${deletingType}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showToast('Type deleted successfully', 'success');
            closeDeleteModal();
            await loadAssetTypes();
            renderTable();
            updateStats();
        } else {
            showToast(result.error || 'Delete failed', 'error');
        }
    } catch (error) {
        console.error('Error deleting asset type:', error);
        showToast('Failed to delete asset type', 'error');
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
