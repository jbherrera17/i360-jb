/**
 * Resource Visibility Modal Component
 * Phase 45: Per-User Resource Access Control
 *
 * Provides a reusable modal for editing resource visibility settings.
 * Works with ModalService to show visibility options.
 */

const ResourceVisibilityModal = {
    // Cached data
    departments: null,

    /**
     * Show the visibility edit modal for a resource
     * @param {string} resourceType - 'agent', 'skill', 'context_asset', 'workflow'
     * @param {string} resourceId - Resource UUID
     * @param {object} currentSettings - Current visibility settings
     * @returns {Promise<object|null>} Updated settings or null if cancelled
     */
    async show(resourceType, resourceId, currentSettings = {}) {
        // Load departments if not cached
        if (!this.departments) {
            await this.loadDepartments();
        }

        const result = await ModalService.form({
            title: 'Set Resource Visibility',
            width: 450,
            fields: [
                {
                    name: 'visibility',
                    label: 'Who can see this resource?',
                    type: 'select',
                    value: currentSettings.visibility || 'private',
                    options: [
                        { value: 'private', label: 'Private - Only me' },
                        { value: 'team', label: 'Team - My department members' },
                        { value: 'organization', label: 'Organization - All org members' },
                        { value: 'public', label: 'Public - Everyone' }
                    ],
                    required: true
                },
                {
                    name: 'department_id',
                    label: 'Assign to Department (optional)',
                    type: 'select',
                    value: currentSettings.department_id || '',
                    options: [
                        { value: '', label: 'No department' },
                        ...(this.departments || []).map(d => ({ value: d.id, label: d.name }))
                    ]
                },
                {
                    name: 'min_business_role',
                    label: 'Minimum Role Required (optional)',
                    type: 'select',
                    value: currentSettings.min_business_role || '',
                    options: [
                        { value: '', label: 'No requirement' },
                        { value: 'ic', label: 'Individual Contributor' },
                        { value: 'supervisor', label: 'Supervisor' },
                        { value: 'manager', label: 'Manager' },
                        { value: 'director', label: 'Director' },
                        { value: 'executive', label: 'Executive' }
                    ]
                }
            ],
            submitText: 'Update Visibility'
        });

        if (result) {
            // Apply the updates
            const success = await this.updateVisibility(resourceType, resourceId, result);
            if (success) {
                return result;
            }
        }

        return null;
    },

    /**
     * Load departments for the select dropdown
     */
    async loadDepartments() {
        try {
            const response = await fetch('/api/departments', {
                headers: this.getHeaders()
            });
            const data = await response.json();
            this.departments = data.success ? (data.data || []) : [];
        } catch (error) {
            console.error('Error loading departments:', error);
            this.departments = [];
        }
    },

    /**
     * Update resource visibility via API
     * @param {string} resourceType - Resource type
     * @param {string} resourceId - Resource ID
     * @param {object} settings - New settings
     * @returns {Promise<boolean>} Success status
     */
    async updateVisibility(resourceType, resourceId, settings) {
        try {
            // Update visibility via bulk update endpoint (works for single resources too)
            const updateResponse = await fetch('/api/resource-access/bulk-update', {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    resources: [{ type: resourceType, id: resourceId }],
                    visibility: settings.visibility,
                    department_id: settings.department_id || null
                })
            });

            if (!updateResponse.ok) {
                throw new Error('Failed to update visibility');
            }

            // Update role requirement if specified
            if (settings.min_business_role !== undefined) {
                await fetch('/api/resource-access/role-requirement', {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify({
                        resource_type: resourceType,
                        resource_id: resourceId,
                        min_business_role: settings.min_business_role || null
                    })
                });
            }

            return true;
        } catch (error) {
            console.error('Error updating visibility:', error);
            if (typeof showToast === 'function') {
                showToast('Failed to update visibility', 'error');
            }
            return false;
        }
    },

    /**
     * Get authorization headers
     */
    getHeaders() {
        const token = localStorage.getItem('auth_token') || this.getCookie('auth_token');
        const orgId = localStorage.getItem('selected_org_id');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            'x-org-id': orgId || ''
        };
    },

    /**
     * Get cookie value
     */
    getCookie(name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : null;
    },

    /**
     * Format visibility label
     */
    formatVisibility(visibility) {
        const labels = {
            'private': 'Private',
            'team': 'Team',
            'organization': 'Organization',
            'public': 'Public'
        };
        return labels[visibility] || visibility;
    },

    /**
     * Get visibility badge HTML
     */
    getVisibilityBadge(visibility) {
        const v = visibility || 'private';
        return `<span class="visibility-badge ${v}">${this.formatVisibility(v)}</span>`;
    },

    /**
     * Clear cached data (call when switching orgs)
     */
    clearCache() {
        this.departments = null;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResourceVisibilityModal;
}
