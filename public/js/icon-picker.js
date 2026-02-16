/**
 * IconPicker - Reusable Lucide icon selection component
 *
 * Usage (standalone):
 *   const picker = IconPicker.create(containerEl, {
 *       value: 'compass',
 *       onSelect: (iconName) => console.log('Selected:', iconName)
 *   });
 *   picker.getValue();  // 'compass'
 *   picker.setValue('rocket');
 *   picker.destroy();
 *
 * Usage (ModalService FormModal):
 *   { name: 'icon', label: 'Icon', type: 'icon-picker', value: 'puzzle' }
 *
 * @version 1.0.0
 */

const IconPicker = (() => {
    // Curated recommended icons grouped by category
    const CATEGORIES = [
        {
            label: 'People & Teams',
            icons: ['user', 'users', 'user-check', 'user-cog', 'contact', 'handshake']
        },
        {
            label: 'Business',
            icons: ['briefcase', 'building', 'building-2', 'landmark', 'wallet', 'credit-card', 'banknote', 'receipt']
        },
        {
            label: 'Communication',
            icons: ['message-square', 'message-circle', 'mail', 'phone', 'video', 'megaphone', 'bell']
        },
        {
            label: 'Analytics',
            icons: ['bar-chart-3', 'trending-up', 'pie-chart', 'activity', 'gauge', 'chart-line']
        },
        {
            label: 'Content',
            icons: ['file-text', 'book-open', 'notebook', 'pen-tool', 'type', 'quote', 'newspaper']
        },
        {
            label: 'Technology',
            icons: ['code', 'terminal', 'database', 'server', 'cpu', 'cloud', 'globe', 'wifi']
        },
        {
            label: 'Navigation',
            icons: ['compass', 'map', 'flag', 'bookmark', 'target', 'crosshair', 'navigation']
        },
        {
            label: 'Actions',
            icons: ['zap', 'rocket', 'lightbulb', 'flame', 'sparkles', 'star', 'heart', 'award', 'trophy', 'medal']
        },
        {
            label: 'Security',
            icons: ['shield', 'lock', 'key', 'eye', 'scan', 'fingerprint']
        },
        {
            label: 'Organization',
            icons: ['folder', 'layers', 'grid', 'layout', 'list', 'filter', 'tag', 'archive', 'package', 'boxes']
        },
        {
            label: 'Time',
            icons: ['calendar', 'clock', 'timer', 'hourglass', 'history']
        },
        {
            label: 'Media',
            icons: ['image', 'camera', 'palette', 'music', 'headphones', 'play']
        }
    ];

    // Flat list of all recommended icons for quick lookup
    const RECOMMENDED_SET = new Set(CATEGORIES.flatMap(c => c.icons));

    /**
     * Convert PascalCase Lucide key to kebab-case icon name
     */
    function pascalToKebab(str) {
        return str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
            .replace(/([a-zA-Z])(\d)/g, '$1-$2')
            .replace(/(\d)([a-zA-Z])/g, '$1-$2')
            .toLowerCase();
    }

    /**
     * Get all available Lucide icon names
     */
    function getAllLucideIcons() {
        if (typeof lucide !== 'undefined' && lucide.icons) {
            return Object.keys(lucide.icons).map(pascalToKebab);
        }
        return [...RECOMMENDED_SET];
    }

    /**
     * Render a single icon SVG element
     */
    function renderIcon(name) {
        const el = document.createElement('i');
        el.setAttribute('data-lucide', name);
        return el;
    }

    /**
     * Create an icon picker instance
     * @param {HTMLElement} container - DOM element to render into
     * @param {Object} options
     * @param {string} [options.value] - Initial selected icon name
     * @param {Function} [options.onSelect] - Callback when icon is selected
     * @returns {{ getValue, setValue, destroy }}
     */
    function create(container, options = {}) {
        let selectedIcon = options.value || '';
        const onSelect = options.onSelect || (() => {});

        // Build DOM
        const wrapper = document.createElement('div');
        wrapper.className = 'icon-picker-wrapper';

        // Selected preview
        const selectedRow = document.createElement('div');
        selectedRow.className = 'icon-picker-selected';
        wrapper.appendChild(selectedRow);

        // Search
        const searchWrapper = document.createElement('div');
        searchWrapper.className = 'icon-picker-search-wrapper';
        const searchIcon = document.createElement('i');
        searchIcon.setAttribute('data-lucide', 'search');
        searchIcon.className = 'icon-picker-search-icon';
        searchWrapper.appendChild(searchIcon);

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'icon-picker-search';
        searchInput.placeholder = 'Search all icons...';
        searchWrapper.appendChild(searchInput);
        wrapper.appendChild(searchWrapper);

        // Grid area (scrollable)
        const gridArea = document.createElement('div');
        gridArea.className = 'icon-picker-grid-area';
        wrapper.appendChild(gridArea);

        // Hidden input to store value (for form collection)
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = 'icon-picker-value';
        hiddenInput.value = selectedIcon;
        wrapper.appendChild(hiddenInput);

        container.appendChild(wrapper);

        // Render functions
        function updateSelectedPreview() {
            if (selectedIcon) {
                selectedRow.innerHTML = '';
                const iconBox = document.createElement('div');
                iconBox.className = 'icon-picker-selected-icon';
                const iconEl = renderIcon(selectedIcon);
                iconBox.appendChild(iconEl);
                selectedRow.appendChild(iconBox);

                const nameEl = document.createElement('span');
                nameEl.className = 'icon-picker-selected-name';
                nameEl.textContent = selectedIcon;
                selectedRow.appendChild(nameEl);
            } else {
                selectedRow.innerHTML = '<span class="icon-picker-selected-placeholder">No icon selected</span>';
            }
            if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [selectedRow] });
        }

        function renderCategorized() {
            gridArea.innerHTML = '';
            for (const category of CATEGORIES) {
                const catLabel = document.createElement('div');
                catLabel.className = 'icon-picker-category';
                catLabel.textContent = category.label;
                gridArea.appendChild(catLabel);

                const grid = document.createElement('div');
                grid.className = 'icon-picker-grid';
                for (const iconName of category.icons) {
                    grid.appendChild(createIconButton(iconName));
                }
                gridArea.appendChild(grid);
            }
            if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [gridArea] });
        }

        function renderSearchResults(query) {
            const allIcons = getAllLucideIcons();
            const results = allIcons.filter(name => name.includes(query)).slice(0, 80);

            gridArea.innerHTML = '';

            if (results.length === 0) {
                gridArea.innerHTML = '<div class="icon-picker-empty">No icons found matching "' + escapeHtml(query) + '"</div>';
                return;
            }

            const info = document.createElement('div');
            info.className = 'icon-picker-info';
            info.textContent = results.length >= 80 ? `Showing first 80 of many results` : `${results.length} result${results.length === 1 ? '' : 's'}`;
            gridArea.appendChild(info);

            const grid = document.createElement('div');
            grid.className = 'icon-picker-grid';
            for (const iconName of results) {
                grid.appendChild(createIconButton(iconName));
            }
            gridArea.appendChild(grid);

            if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [gridArea] });
        }

        function createIconButton(iconName) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'icon-picker-item' + (iconName === selectedIcon ? ' selected' : '');
            btn.title = iconName;
            btn.setAttribute('data-icon', iconName);
            btn.appendChild(renderIcon(iconName));
            btn.addEventListener('click', () => selectIcon(iconName));
            return btn;
        }

        function selectIcon(iconName) {
            selectedIcon = iconName;
            hiddenInput.value = iconName;

            // Update selected states in grid
            gridArea.querySelectorAll('.icon-picker-item').forEach(btn => {
                btn.classList.toggle('selected', btn.getAttribute('data-icon') === iconName);
            });

            updateSelectedPreview();
            onSelect(iconName);
        }

        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        }

        // Search handler
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const query = searchInput.value.toLowerCase().trim();
            searchTimeout = setTimeout(() => {
                if (query === '') {
                    renderCategorized();
                } else {
                    renderSearchResults(query);
                }
            }, 150);
        });

        // Initial render
        updateSelectedPreview();
        renderCategorized();

        // Public API
        return {
            getValue() {
                return selectedIcon;
            },
            setValue(iconName) {
                selectIcon(iconName);
            },
            destroy() {
                wrapper.remove();
            },
            /** @internal - used by FormModal to get the wrapper element */
            _getElement() {
                return wrapper;
            }
        };
    }

    return { create, CATEGORIES, RECOMMENDED_SET };
})();
