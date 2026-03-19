/* global authFetch */
/**
 * Insight 360 - Direction Modal Service
 * Shows navigation direction modal after successful login
 * Version: 1.0.0
 */

class DirectionModalService {
    constructor() {
        this.overlay = null;
        this.modal = null;
        this.signOutBtn = null;
    }

    /**
     * Initialize the modal service by injecting required HTML and styles
     */
    init() {
        this.injectStyles();
        this.injectHTML();
        this.overlay = document.getElementById('directionModalOverlay');
        this.modal = document.getElementById('directionModal');
        this.signOutBtn = document.querySelector('.direction-signout');

        // Prevent clicking overlay from closing modal - clicks should only work on nav buttons
        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                // Only allow clicks on navigation buttons (anchor tags with direction-btn class)
                // Prevent overlay click from doing anything
                if (e.target === this.overlay) {
                    e.stopPropagation();
                }
            });
        }
    }

    /**
     * Show the appropriate direction modal based on user role
     * @param {Object} user - User object with role, display_name, email
     */
    show(user) {
        if (!this.overlay) this.init();

        const isAdmin = user.is_platform_admin === true || ['admin', 'owner'].includes(user.org_role);
        const displayName = user.display_name || user.email?.split('@')[0] || 'User';
        const initials = this.getInitials(user);
        const roleLabel = (user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1);

        // Update user info
        document.getElementById('directionAvatar').textContent = initials;
        document.getElementById('directionName').textContent = displayName;
        document.getElementById('directionRole').textContent = roleLabel;
        document.getElementById('directionRole').className = 'direction-role' + (isAdmin ? ' admin' : '');

        // Show appropriate buttons
        const adminButtons = document.getElementById('directionAdminButtons');
        const userButtons = document.getElementById('directionUserButtons');

        if (isAdmin) {
            adminButtons.style.display = 'flex';
            userButtons.style.display = 'none';
        } else {
            adminButtons.style.display = 'none';
            userButtons.style.display = 'flex';
        }

        // Show overlay
        this.overlay.classList.add('active');

        // Re-initialize lucide icons if available
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * Hide the direction modal
     */
    hide() {
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
    }

    /**
     * Get user initials for avatar
     */
    getInitials(user) {
        if (!user) return '?';
        if (user.display_name) {
            const parts = user.display_name.trim().split(/\s+/);
            if (parts.length >= 2) {
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            }
            return parts[0].substring(0, 2).toUpperCase();
        }
        if (user.email) {
            return user.email.substring(0, 2).toUpperCase();
        }
        return '?';
    }

    /**
     * Inject modal HTML into the page
     */
    injectHTML() {
        if (document.getElementById('directionModalOverlay')) return;

        const html = `
            <div class="direction-modal-overlay" id="directionModalOverlay">
                <div class="direction-modal" id="directionModal">
                    <div class="direction-content">
                        <!-- Left Column: User Info -->
                        <div class="direction-user">
                            <div class="direction-avatar" id="directionAvatar">U</div>
                            <div class="direction-name" id="directionName">User</div>
                            <div class="direction-role" id="directionRole">User</div>
                        </div>

                        <!-- Right Column: Navigation Buttons -->
                        <div class="direction-nav">
                            <!-- Admin Buttons -->
                            <div class="direction-buttons" id="directionAdminButtons" style="display: none;">
                                <a href="/chat.html" class="direction-btn">
                                    <i data-lucide="message-circle"></i>
                                    <span>Higgins</span>
                                </a>
                                <a href="/administrator.html" class="direction-btn">
                                    <i data-lucide="shield"></i>
                                    <span>Administrator</span>
                                </a>
                                <a href="/" class="direction-btn">
                                    <i data-lucide="layout-dashboard"></i>
                                    <span>Dashboard</span>
                                </a>
                            </div>

                            <!-- User Buttons -->
                            <div class="direction-buttons" id="directionUserButtons" style="display: none;">
                                <a href="/chat.html" class="direction-btn">
                                    <i data-lucide="message-circle"></i>
                                    <span>Higgins</span>
                                </a>
                                <a href="/execute120.html" class="direction-btn">
                                    <i data-lucide="rocket"></i>
                                    <span>Execute 120</span>
                                </a>
                                <a href="/" class="direction-btn">
                                    <i data-lucide="layout-dashboard"></i>
                                    <span>Dashboard</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- Sign Out Button -->
                    <div class="direction-footer">
                        <button class="direction-signout" onclick="directionModal.signOut()">
                            <i data-lucide="log-out"></i>
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
    }

    /**
     * Inject modal styles into the page
     */
    injectStyles() {
        if (document.getElementById('direction-modal-styles')) return;

        const styles = `
            .direction-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s, visibility 0.3s;
            }

            .direction-modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            .direction-modal {
                background: var(--bg-secondary, #1a1a2e);
                border-radius: 16px;
                border: 1px solid var(--border, #2a2a40);
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                padding: 1.5rem;
                min-width: 400px;
                max-width: 500px;
            }

            .direction-content {
                display: grid;
                grid-template-columns: 120px 1fr;
                gap: 1.5rem;
                align-items: start;
            }

            .direction-user {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 0.5rem;
                border-right: 1px solid var(--border, #2a2a40);
            }

            .direction-avatar {
                width: 64px;
                height: 64px;
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
                font-weight: 600;
                color: white;
                margin-bottom: 0.75rem;
            }

            .direction-name {
                font-size: 1.1rem;
                font-weight: 600;
                color: var(--text-primary, #ffffff);
                text-align: center;
                margin-bottom: 0.25rem;
            }

            .direction-role {
                font-size: 0.85rem;
                color: var(--text-secondary, #a0a0b0);
                text-transform: capitalize;
            }

            .direction-role.admin {
                color: #f59e0b;
            }

            .direction-nav {
                display: flex;
                flex-direction: column;
                justify-content: center;
                min-height: 100%;
            }

            .direction-buttons {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }

            .direction-btn {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.875rem 1rem;
                background: var(--bg-tertiary, #252540);
                border: 1px solid var(--border, #2a2a40);
                border-radius: 10px;
                color: var(--text-primary, #ffffff);
                font-size: 0.95rem;
                font-weight: 500;
                text-decoration: none;
                transition: all 0.2s;
                cursor: pointer;
            }

            .direction-btn:hover {
                background: var(--bg-hover, #2a2a45);
                border-color: var(--primary, #6366f1);
                color: var(--primary, #6366f1);
                transform: translateX(4px);
            }

            .direction-btn i {
                width: 20px;
                height: 20px;
                flex-shrink: 0;
            }

            .direction-footer {
                display: flex;
                justify-content: flex-end;
                margin-top: 1.25rem;
                padding-top: 1rem;
                border-top: 1px solid var(--border, #2a2a40);
            }

            .direction-signout {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                background: transparent;
                border: 1px solid var(--danger, #ef4444);
                border-radius: 8px;
                color: var(--danger, #ef4444);
                font-size: 0.875rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }

            .direction-signout:hover:not(.disabled) {
                background: rgba(239, 68, 68, 0.1);
            }

            .direction-signout i {
                width: 16px;
                height: 16px;
            }

            .direction-signout.disabled {
                opacity: 0.4;
                cursor: not-allowed;
                pointer-events: none;
            }
        `;

        const styleEl = document.createElement('style');
        styleEl.id = 'direction-modal-styles';
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
    }

    /**
     * Handle sign out
     */
    async signOut() {
        const token = localStorage.getItem('insight360_token');

        try {
            await (typeof authFetch === 'function' ? authFetch : fetch)('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        }

        // Clear local storage and cookie
        localStorage.removeItem('insight360_token');
        localStorage.removeItem('insight360_user');
        document.cookie = 'auth_token=; path=/; max-age=0';

        // Hide modal and redirect to login
        this.hide();
        window.location.href = '/login.html';
    }
}

// Create global instance
const directionModal = new DirectionModalService();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DirectionModalService;
}
