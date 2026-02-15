/**
 * In-Modal Help Banner Utility
 * Creates collapsible contextual help banners within modals.
 *
 * Usage:
 *   const banner = ModalHelpBanner.create({
 *       key: 'my-modal',
 *       title: 'How this works',
 *       content: 'Brief explanation of the feature...',
 *   });
 *   container.prepend(banner);
 */

const ModalHelpBanner = {
    /**
     * Create a help banner element
     * @param {Object} options
     * @param {string} options.key - Unique key for localStorage persistence
     * @param {string} options.title - Banner title (default: "How this works")
     * @param {string} options.content - Help text content (plain text)
     * @param {boolean} [options.dismissible=true] - Can be permanently dismissed
     * @param {boolean} [options.startExpanded=false] - Start in expanded state
     * @returns {HTMLElement}
     */
    create({ key, title = 'How this works', content, dismissible = true, startExpanded = false }) {
        const dismissKey = `i360-help-dismissed-${key}`;

        // If user dismissed this banner, return hidden placeholder
        if (dismissible && localStorage.getItem(dismissKey) === 'true') {
            const placeholder = document.createElement('div');
            placeholder.style.display = 'none';
            return placeholder;
        }

        const banner = document.createElement('div');
        banner.className = 'i360-modal-help-banner';
        banner.dataset.helpKey = key;

        const contentId = `help-content-${key}`;

        banner.innerHTML = `
            <button class="i360-modal-help-toggle" aria-expanded="${startExpanded}" aria-controls="${contentId}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="i360-modal-help-icon-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                <span class="i360-modal-help-title">${this._escapeHtml(title)}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="i360-modal-help-chevron"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div class="i360-modal-help-content" id="${contentId}" ${startExpanded ? '' : 'hidden'}>
                <p class="i360-modal-help-text">${this._escapeHtml(content)}</p>
                ${dismissible ? `
                    <button class="i360-modal-help-dismiss" title="Don't show this again">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        Don't show again
                    </button>
                ` : ''}
            </div>
        `;

        // Toggle expand/collapse
        const toggle = banner.querySelector('.i360-modal-help-toggle');
        const contentEl = banner.querySelector('.i360-modal-help-content');
        toggle.addEventListener('click', () => {
            const expanded = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', !expanded);
            contentEl.hidden = expanded;
        });

        // Dismiss permanently
        if (dismissible) {
            banner.querySelector('.i360-modal-help-dismiss').addEventListener('click', () => {
                localStorage.setItem(dismissKey, 'true');
                banner.style.transition = 'opacity 0.2s';
                banner.style.opacity = '0';
                setTimeout(() => banner.remove(), 200);
            });
        }

        return banner;
    },

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};
