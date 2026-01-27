/**
 * Admin Dashboard Component
 * Phase 46: Administrator Page Reorganization
 *
 * Provides status cards, quick actions, and recent activity
 * for the administrator dashboard tab.
 */

const AdminDashboard = {
    // Cached data
    stats: null,
    recentActivity: [],

    /**
     * Initialize the dashboard
     * @param {HTMLElement} container - Container element
     */
    async init(container) {
        this.container = container;
        await this.loadData();
        this.render();
    },

    /**
     * Load dashboard data
     */
    async loadData() {
        const token = localStorage.getItem('insight360_token');
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            // Load stats in parallel
            const [statsRes, usersRes, orgsRes, agentsRes] = await Promise.allSettled([
                fetch('/api/platform/stats', { headers }).catch(() => null),
                fetch('/api/users', { headers }),
                fetch('/api/organizations', { headers }).catch(() => null),
                fetch('/api/agents', { headers })
            ]);

            this.stats = {
                users: 0,
                organizations: 0,
                agents: 0,
                workflows: 0,
                skills: 0,
                apiHealth: 'good'
            };

            // Parse stats response
            if (statsRes.status === 'fulfilled' && statsRes.value?.ok) {
                const data = await statsRes.value.json();
                if (data.data) {
                    this.stats.users = data.data.users || 0;
                    this.stats.organizations = data.data.organizations?.total || 0;
                    this.stats.agents = data.data.agents || 0;
                }
            }

            // Fallback to direct counts if platform stats not available
            if (usersRes.status === 'fulfilled' && usersRes.value?.ok) {
                const data = await usersRes.value.json();
                if (data.data) {
                    this.stats.users = data.data.length || this.stats.users;
                }
            }

            if (agentsRes.status === 'fulfilled' && agentsRes.value?.ok) {
                const data = await agentsRes.value.json();
                if (data.data) {
                    this.stats.agents = data.data.length || this.stats.agents;
                }
            }

            // Load recent activity (from conversations or audit log)
            try {
                const activityRes = await fetch('/api/conversations?limit=5', { headers });
                if (activityRes.ok) {
                    const activityData = await activityRes.json();
                    this.recentActivity = (activityData.data || []).map(item => ({
                        type: 'conversation',
                        title: item.title || 'Conversation',
                        time: item.updated_at || item.created_at,
                        icon: 'message-circle'
                    }));
                }
            } catch (e) {
                this.recentActivity = [];
            }

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    },

    /**
     * Render the dashboard
     */
    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="admin-dashboard">
                <!-- Status Cards -->
                <div class="dashboard-stats">
                    ${this.renderStatCard('users', 'Users', this.stats.users, 'Total active users')}
                    ${this.renderStatCard('building-2', 'Organizations', this.stats.organizations, 'Active organizations')}
                    ${this.renderStatCard('bot', 'Agents', this.stats.agents, 'Created agents')}
                    ${this.renderStatCard('activity', 'API Health', this.stats.apiHealth === 'good' ? 'Good' : 'Issues', 'System status', this.stats.apiHealth)}
                </div>

                <div class="dashboard-grid">
                    <!-- Quick Actions -->
                    <div class="dashboard-section">
                        <h3 class="section-title">
                            <i data-lucide="zap"></i>
                            Quick Actions
                        </h3>
                        <div class="quick-actions">
                            ${this.renderQuickAction('user-plus', 'Add User', 'admin.html?action=add-user', 'Invite a new team member')}
                            ${this.renderQuickAction('building-2', 'Create Organization', 'admin-org-settings.html', 'Set up a new organization')}
                            ${this.renderQuickAction('users', 'Manage Members', 'admin-org-members.html', 'View and manage team members')}
                            ${this.renderQuickAction('shield', 'Resource Access', 'admin-resource-access.html', 'Configure resource visibility')}
                            ${this.renderQuickAction('puzzle', 'Configure Modules', 'admin-platform.html', 'Manage platform modules')}
                            ${this.renderQuickAction('layers', 'Tier Settings', 'admin-tier-setup.html', 'Configure subscription tiers')}
                        </div>
                    </div>

                    <!-- Recent Activity -->
                    <div class="dashboard-section">
                        <h3 class="section-title">
                            <i data-lucide="clock"></i>
                            Recent Activity
                        </h3>
                        <div class="activity-list">
                            ${this.renderActivityList()}
                        </div>
                    </div>
                </div>

                <!-- Alerts Section -->
                <div class="dashboard-alerts" id="dashboardAlerts">
                    ${this.renderAlerts()}
                </div>
            </div>
        `;

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    /**
     * Render a stat card
     */
    renderStatCard(icon, label, value, description, status = null) {
        const statusClass = status === 'good' ? 'status-good' : status === 'issues' ? 'status-warning' : '';
        return `
            <div class="stat-card ${statusClass}">
                <div class="stat-icon">
                    <i data-lucide="${icon}"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${value}</div>
                    <div class="stat-label">${label}</div>
                    <div class="stat-description">${description}</div>
                </div>
            </div>
        `;
    },

    /**
     * Render a quick action button
     */
    renderQuickAction(icon, label, href, description) {
        return `
            <a href="${href}" class="quick-action">
                <div class="quick-action-icon">
                    <i data-lucide="${icon}"></i>
                </div>
                <div class="quick-action-content">
                    <div class="quick-action-label">${label}</div>
                    <div class="quick-action-description">${description}</div>
                </div>
                <i data-lucide="chevron-right" class="quick-action-arrow"></i>
            </a>
        `;
    },

    /**
     * Render activity list
     */
    renderActivityList() {
        if (this.recentActivity.length === 0) {
            return `<div class="activity-empty">No recent activity</div>`;
        }

        return this.recentActivity.map(item => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i data-lucide="${item.icon || 'activity'}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${this.escapeHtml(item.title)}</div>
                    <div class="activity-time">${this.formatRelativeTime(item.time)}</div>
                </div>
            </div>
        `).join('');
    },

    /**
     * Render alerts section
     */
    renderAlerts() {
        const alerts = [];

        // Check for potential issues
        if (this.stats.users === 0) {
            alerts.push({
                type: 'info',
                icon: 'info',
                message: 'No users found. <a href="admin.html">Add your first user</a>'
            });
        }

        if (this.stats.organizations === 0) {
            alerts.push({
                type: 'info',
                icon: 'building-2',
                message: 'No organizations set up. <a href="admin-org-settings.html">Create one now</a>'
            });
        }

        if (alerts.length === 0) return '';

        return alerts.map(alert => `
            <div class="dashboard-alert alert-${alert.type}">
                <i data-lucide="${alert.icon}"></i>
                <span>${alert.message}</span>
            </div>
        `).join('');
    },

    /**
     * Format relative time
     */
    formatRelativeTime(dateStr) {
        if (!dateStr) return 'Unknown';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    },

    /**
     * Escape HTML
     */
    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[char]));
    },

    /**
     * Refresh dashboard data
     */
    async refresh() {
        await this.loadData();
        this.render();
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminDashboard;
}
