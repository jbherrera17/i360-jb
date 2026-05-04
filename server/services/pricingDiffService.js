/**
 * INSIGHT 360 - Pricing Diff Service
 * Version: 1.0.0
 * Phase: 87 (REQ-003)
 *
 * Compares two pricing-tiers.json payloads and produces a human-readable
 * Markdown summary of the changes. The output goes into the PR body of
 * the website sync PR so JB can review the diff before merging.
 *
 * Sections (only included if non-empty):
 *   1. Pricing changes        — price_monthly, price_yearly per tier
 *   2. Marketing copy changes — name, tagline, target_customer, cta_label,
 *                               feature_highlights, is_featured
 *   3. Module access changes  — Core ↔ Optional ↔ None per tier per module
 *   4. Add-on price changes   — addon_price_monthly per (tier, module)
 *   5. New / Removed tiers    — full additions or deletions
 *   6. New / Removed modules  — full additions or deletions
 *
 * No external diff library — keeps the service light and the output
 * format under our control.
 */

/**
 * Top-level diff entry point.
 *
 * @param {object|null} prev - Previous payload (or null if this is the first sync ever)
 * @param {object}      next - The new payload being synced
 * @returns {string} Markdown diff. Empty string means no meaningful changes.
 */
function diffPayloads(prev, next) {
    if (!next || typeof next !== 'object') {
        throw new Error('diffPayloads: next payload is required');
    }

    if (!prev) {
        return renderInitialSync(next);
    }

    const sections = [];

    const tierAddRem = diffTierMembership(prev.tiers, next.tiers);
    if (tierAddRem.length) sections.push(['New / Removed Tiers', tierAddRem.join('\n')]);

    const moduleAddRem = diffModuleMembership(prev.modules_meta, next.modules_meta);
    if (moduleAddRem.length) sections.push(['New / Removed Modules', moduleAddRem.join('\n')]);

    const priceLines = diffTierPrices(prev.tiers, next.tiers);
    if (priceLines.length) sections.push(['Pricing Changes', priceLines.join('\n')]);

    const marketingLines = diffMarketingCopy(prev.tiers, next.tiers);
    if (marketingLines.length) sections.push(['Marketing Copy Changes', marketingLines.join('\n')]);

    const accessLines = diffModuleAccess(prev, next);
    if (accessLines.length) sections.push(['Module Access Changes', accessLines.join('\n')]);

    const addonLines = diffAddonPrices(prev, next);
    if (addonLines.length) sections.push(['Add-on Price Changes', addonLines.join('\n')]);

    if (!sections.length) {
        return '_No meaningful changes detected. Sync may have been triggered by a non-data field._';
    }

    const body = sections.map(([title, content]) => `## ${title}\n\n${content}`).join('\n\n');
    return `# Pricing Sync — ${next.generated_at || 'now'}\n\n${body}`;
}

// ============================================
// Section: initial sync (no prev to compare against)
// ============================================

function renderInitialSync(next) {
    const tierCount = (next.tiers || []).length;
    const moduleCount = (next.modules_meta || []).length;
    return [
        `# Pricing Sync — Initial Snapshot (${next.generated_at || 'now'})`,
        '',
        'No prior pricing-tiers.json exists in the synergi-website repo. This PR establishes the initial snapshot.',
        '',
        `- **Tiers:** ${tierCount}`,
        `- **Modules:** ${moduleCount}`,
        '',
        'Tier list:',
        ...(next.tiers || []).map(t => `- ${t.name} (${t.id}) — $${fmtPrice(t.price_monthly)}/mo${t.is_featured ? ' ⭐ Featured' : ''}`)
    ].join('\n');
}

// ============================================
// Section: tier membership
// ============================================

function diffTierMembership(prevTiers = [], nextTiers = []) {
    const prevIds = new Set(prevTiers.map(t => t.id));
    const nextIds = new Set(nextTiers.map(t => t.id));
    const lines = [];
    for (const t of nextTiers) {
        if (!prevIds.has(t.id)) lines.push(`- ➕ **Added tier**: ${t.name} (${t.id}) at $${fmtPrice(t.price_monthly)}/mo`);
    }
    for (const t of prevTiers) {
        if (!nextIds.has(t.id)) lines.push(`- ➖ **Removed tier**: ${t.name} (${t.id})`);
    }
    return lines;
}

// ============================================
// Section: module membership
// ============================================

function diffModuleMembership(prevModules = [], nextModules = []) {
    const prevIds = new Set(prevModules.map(m => m.id));
    const nextIds = new Set(nextModules.map(m => m.id));
    const lines = [];
    for (const m of nextModules) {
        if (!prevIds.has(m.id)) lines.push(`- ➕ **Added module**: ${m.name} (${m.id})`);
    }
    for (const m of prevModules) {
        if (!nextIds.has(m.id)) lines.push(`- ➖ **Removed module**: ${m.name} (${m.id})`);
    }
    return lines;
}

// ============================================
// Section: tier prices
// ============================================

function diffTierPrices(prevTiers = [], nextTiers = []) {
    const prevById = new Map(prevTiers.map(t => [t.id, t]));
    const lines = [];
    for (const next of nextTiers) {
        const prev = prevById.get(next.id);
        if (!prev) continue;  // Handled by membership section
        if (prev.price_monthly !== next.price_monthly) {
            lines.push(`- **${next.name}** monthly: $${fmtPrice(prev.price_monthly)} → **$${fmtPrice(next.price_monthly)}** ${arrow(prev.price_monthly, next.price_monthly)}`);
        }
        if (prev.price_yearly !== next.price_yearly) {
            lines.push(`- **${next.name}** yearly: $${fmtPrice(prev.price_yearly)} → **$${fmtPrice(next.price_yearly)}** ${arrow(prev.price_yearly, next.price_yearly)}`);
        }
    }
    return lines;
}

// ============================================
// Section: marketing copy
// ============================================

const MARKETING_FIELDS = ['name', 'tagline', 'target_customer', 'cta_label', 'cta_url', 'is_featured'];

function diffMarketingCopy(prevTiers = [], nextTiers = []) {
    const prevById = new Map(prevTiers.map(t => [t.id, t]));
    const lines = [];
    for (const next of nextTiers) {
        const prev = prevById.get(next.id);
        if (!prev) continue;

        for (const f of MARKETING_FIELDS) {
            if (prev[f] !== next[f]) {
                lines.push(`- **${next.name}** \`${f}\`: ${shorten(prev[f])} → ${shorten(next[f])}`);
            }
        }

        const prevHL = JSON.stringify(prev.feature_highlights || []);
        const nextHL = JSON.stringify(next.feature_highlights || []);
        if (prevHL !== nextHL) {
            lines.push(`- **${next.name}** \`feature_highlights\` changed (${(prev.feature_highlights || []).length} → ${(next.feature_highlights || []).length} bullets)`);
        }
    }
    return lines;
}

// ============================================
// Section: module access (Core ↔ Optional ↔ None)
// ============================================

function diffModuleAccess(prev, next) {
    const prevCells = flattenComparison(prev.comparison);
    const nextCells = flattenComparison(next.comparison);
    const lines = [];

    for (const [key, nextCell] of nextCells.entries()) {
        const prevCell = prevCells.get(key);
        if (!prevCell) continue;
        if (prevCell.access !== nextCell.access) {
            const [tierId, moduleId] = key.split('::');
            lines.push(`- **${moduleId}** @ \`${tierId}\`: ${prevCell.access} → **${nextCell.access}** ${accessArrow(prevCell.access, nextCell.access)}`);
        }
    }
    return lines;
}

function flattenComparison(comparison) {
    const cells = new Map();
    if (!comparison || !Array.isArray(comparison.groups)) return cells;
    for (const group of comparison.groups) {
        for (const m of group.modules || []) {
            for (const [tierId, cell] of Object.entries(m.tiers || {})) {
                cells.set(`${tierId}::${m.id}`, cell);
            }
        }
    }
    return cells;
}

// ============================================
// Section: add-on prices
// ============================================

function diffAddonPrices(prev, next) {
    const prevCells = flattenComparison(prev.comparison);
    const nextCells = flattenComparison(next.comparison);
    const lines = [];

    for (const [key, nextCell] of nextCells.entries()) {
        const prevCell = prevCells.get(key);
        if (!prevCell) continue;
        if (nextCell.access !== 'optional' || prevCell.access !== 'optional') continue;
        if (prevCell.addon_price_monthly === nextCell.addon_price_monthly) continue;

        const [tierId, moduleId] = key.split('::');
        lines.push(`- **${moduleId}** @ \`${tierId}\`: add-on $${fmtPrice(prevCell.addon_price_monthly)}/mo → **$${fmtPrice(nextCell.addon_price_monthly)}/mo** ${arrow(prevCell.addon_price_monthly, nextCell.addon_price_monthly)}`);
    }
    return lines;
}

// ============================================
// Helpers
// ============================================

function fmtPrice(v) {
    if (v === null || v === undefined) return '—';
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function arrow(prev, next) {
    if (prev === null || next === null) return '';
    if (next > prev) return '⬆';
    if (next < prev) return '⬇';
    return '';
}

function accessArrow(prev, next) {
    const order = { none: 0, optional: 1, core: 2 };
    const a = order[prev], b = order[next];
    if (a == null || b == null) return '';
    if (b > a) return '⬆ (more inclusive)';
    if (b < a) return '⬇ (less inclusive)';
    return '↔';
}

function shorten(s) {
    if (s === null || s === undefined) return '_(empty)_';
    if (typeof s !== 'string') return `\`${JSON.stringify(s)}\``;
    if (s.length <= 60) return `"${s}"`;
    return `"${s.slice(0, 57)}…"`;
}

module.exports = {
    diffPayloads,
    // Exposed for unit tests
    _internal: {
        diffTierMembership,
        diffModuleMembership,
        diffTierPrices,
        diffMarketingCopy,
        diffModuleAccess,
        diffAddonPrices,
        flattenComparison,
        fmtPrice,
        arrow,
        accessArrow,
        shorten
    }
};
