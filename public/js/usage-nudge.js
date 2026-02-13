/**
 * Usage Nudge — Soft-limit warning banners & blocking modals
 *
 * Drop into any resource-creation page:
 *   <link href="/css/usage-nudge.css" rel="stylesheet">
 *   <script src="/js/usage-nudge.js"></script>
 *
 * Then in DOMContentLoaded:
 *   await UsageNudge.init();
 *
 * Before a create call:
 *   if (!(await UsageNudge.checkBeforeCreate('agents'))) return;
 */
const UsageNudge = (() => {
    const CACHE_KEY = 'usageNudgeCache';
    const DISMISS_KEY = 'usageNudgeDismissed';
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    let _data = null; // cached API response

    const RESOURCE_LABELS = {
        members: 'team members',
        clients: 'clients',
        agents: 'agents',
        workflows: 'workflows',
        skills: 'skills',
        context_assets: 'context assets',
        research_studios: 'research studios'
    };

    // ---- Data fetching ----

    async function fetchUsage() {
        // Check memory cache
        if (_data && _data._ts && Date.now() - _data._ts < CACHE_TTL) {
            return _data;
        }

        // Check sessionStorage cache
        try {
            const cached = sessionStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed._ts && Date.now() - parsed._ts < CACHE_TTL) {
                    _data = parsed;
                    return _data;
                }
            }
        } catch { /* ignore */ }

        // Fetch from API
        try {
            const token = localStorage.getItem('insight360_token');
            const orgId = localStorage.getItem('insight360_org_id');
            if (!token || !orgId) return null;

            const resp = await fetch('/api/modules/usage', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-org-id': orgId
                }
            });

            if (!resp.ok) return null;

            const json = await resp.json();
            if (!json.success) return null;

            _data = { ...json.data, _ts: Date.now() };
            try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(_data)); } catch { /* ignore */ }
            return _data;
        } catch {
            return null;
        }
    }

    // ---- Banner rendering ----

    function renderBanner(data) {
        // Don't render if dismissed this session
        if (sessionStorage.getItem(DISMISS_KEY)) return;

        const items = data.warnings || [];
        if (items.length === 0) return;

        // Remove existing banner if any
        const existing = document.querySelector('.usage-nudge-banner');
        if (existing) existing.remove();

        const parts = items.map(w => {
            const label = RESOURCE_LABELS[w.resource] || w.resource;
            return `<strong>${w.current}/${w.max}</strong> ${label} (${w.percent}%)`;
        });

        const banner = document.createElement('div');
        banner.className = 'usage-nudge-banner';
        banner.innerHTML = `
            <svg class="nudge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span class="nudge-text">
                Approaching plan limits: ${parts.join(', ')}.
                ${data.next_tier ? `Upgrade to <strong>${data.next_tier.name}</strong> for more capacity.` : ''}
            </span>
            ${data.tier?.allow_self_upgrade && data.next_tier ? `<a href="/pricing" class="nudge-upgrade-btn">Upgrade Plan</a>` : ''}
            <button class="nudge-dismiss" onclick="UsageNudge.dismissBanner()" title="Dismiss">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        `;

        // Insert after page header
        const header = document.querySelector('.page-header');
        if (header && header.parentNode) {
            header.parentNode.insertBefore(banner, header.nextSibling);
        }
    }

    // ---- Blocking modal ----

    async function showBlockingModal(resourceType) {
        const data = _data;
        const label = RESOURCE_LABELS[resourceType] || resourceType;
        const tierName = data?.tier?.name || 'your current plan';
        const nextName = data?.next_tier?.name;
        const canSelfUpgrade = data?.tier?.allow_self_upgrade && data?.next_tier;

        const title = `${label.charAt(0).toUpperCase() + label.slice(1)} Limit Reached`;
        const message = `You've reached the maximum number of ${label} allowed on the <strong>${tierName}</strong> plan.`
            + (nextName ? `<br><br>Upgrade to <strong>${nextName}</strong> to increase your limits.` : '<br><br>Contact your administrator to discuss plan options.');

        // Prefer ModalService, fall back to window.alert
        if (typeof ModalService !== 'undefined' && ModalService.alert) {
            await ModalService.alert({
                title,
                message,
                confirmText: canSelfUpgrade ? 'View Plans' : 'OK'
            });
            if (canSelfUpgrade) {
                window.location.href = '/pricing';
            }
        } else {
            window.alert(`${title}\n\nYou've reached the maximum number of ${label} allowed on the ${tierName} plan.`);
        }
    }

    // ---- Public API ----

    return {
        /**
         * Initialize: fetch usage data and render warning banner if applicable.
         */
        async init() {
            const data = await fetchUsage();
            if (data) renderBanner(data);
        },

        /**
         * Call before creating a resource.
         * Returns true if allowed, false if blocked (shows modal).
         */
        async checkBeforeCreate(resourceType) {
            const data = await fetchUsage();
            if (!data) return true; // Can't check — allow

            // Check blocks
            const blocked = (data.blocks || []).find(b => b.resource === resourceType);
            if (blocked) {
                await showBlockingModal(resourceType);
                return false;
            }
            return true;
        },

        /**
         * Dismiss the warning banner for this session.
         */
        dismissBanner() {
            sessionStorage.setItem(DISMISS_KEY, '1');
            const banner = document.querySelector('.usage-nudge-banner');
            if (banner) banner.remove();
        },

        /**
         * Show the blocking modal directly (e.g. when API returns upgrade_required).
         */
        showBlockingModal,

        /**
         * Force-refresh cached data.
         */
        async refresh() {
            _data = null;
            try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
            return fetchUsage();
        }
    };
})();
