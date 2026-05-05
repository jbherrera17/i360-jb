/**
 * Pricing Diff Service Unit Tests (REQ-003)
 *
 * Covers:
 * - Initial sync (prev=null) renders snapshot
 * - No-change diff returns the "no meaningful changes" placeholder
 * - Tier price change shows arrows
 * - Marketing copy changes show old → new
 * - Module access changes (Core ↔ Optional ↔ None)
 * - Add-on price changes
 * - New / Removed tier
 * - New / Removed module
 */

const diffService = require('../../../server/services/pricingDiffService');

function basePayload() {
    return {
        schema_version: 1,
        generated_at: '2026-04-29T18:00:00Z',
        generated_by: 'jb@x',
        tiers: [
            { id: 'starter', name: 'Starter', tagline: 'For individuals', target_customer: 'Solos',
              tier_group: 'standard', display_order: 1, is_featured: false,
              price_monthly: 49, price_yearly: 490, cta_label: 'Try', cta_url: 'https://x',
              limits: { max_agents: 5 }, features: {}, feature_highlights: ['a','b'],
              modules: { core: [], optional: [] } },
            { id: 'business', name: 'Business', tagline: 'For teams', target_customer: 'SMB',
              tier_group: 'standard', display_order: 2, is_featured: true,
              price_monthly: 249, price_yearly: 2490, cta_label: 'Try', cta_url: 'https://y',
              limits: { max_agents: 25 }, features: {}, feature_highlights: ['c','d'],
              modules: { core: [], optional: [] } }
        ],
        modules_meta: [
            { id: 'chat', name: 'Chat', description: 'AI chat', icon: 'msg', nav_group: 'primary', category: 'system' },
            { id: 'workflows', name: 'Workflows', description: 'Auto', icon: 'git', nav_group: 'tools', category: 'tool' }
        ],
        comparison: {
            groups: [
                { id: 'primary', label: 'Core', modules: [
                    { id: 'chat', name: 'Chat', icon: 'msg', tiers: {
                        starter: { access: 'core' },
                        business: { access: 'core' }
                    }}
                ]},
                { id: 'tools', label: 'Tools', modules: [
                    { id: 'workflows', name: 'Workflows', icon: 'git', tiers: {
                        starter: { access: 'none' },
                        business: { access: 'core' }
                    }}
                ]}
            ]
        }
    };
}

describe('diffPayloads — initial sync', () => {
    test('null prev → renders snapshot summary', () => {
        const out = diffService.diffPayloads(null, basePayload());
        expect(out).toMatch(/Initial Snapshot/);
        expect(out).toMatch(/\*\*Tiers:\*\* 2/);
        expect(out).toMatch(/Business.*Featured/);
    });
});

describe('diffPayloads — no changes', () => {
    test('identical prev/next → "no meaningful changes" placeholder', () => {
        const p = basePayload();
        const out = diffService.diffPayloads(p, basePayload());
        expect(out).toMatch(/No meaningful changes/);
    });
});

describe('diffPayloads — pricing changes', () => {
    test('monthly price increase shows up arrow', () => {
        const prev = basePayload();
        const next = basePayload();
        next.tiers[1].price_monthly = 299;
        const out = diffService.diffPayloads(prev, next);
        expect(out).toMatch(/Pricing Changes/);
        expect(out).toMatch(/Business.*\$249.*\$299.*⬆/);
    });

    test('yearly price decrease shows down arrow', () => {
        const prev = basePayload();
        const next = basePayload();
        next.tiers[0].price_yearly = 350;
        const out = diffService.diffPayloads(prev, next);
        expect(out).toMatch(/Starter.*yearly.*\$490.*\$350.*⬇/);
    });
});

describe('diffPayloads — marketing copy', () => {
    test('tagline change is reported', () => {
        const prev = basePayload();
        const next = basePayload();
        next.tiers[1].tagline = 'New tagline';
        const out = diffService.diffPayloads(prev, next);
        expect(out).toMatch(/Marketing Copy Changes/);
        expect(out).toMatch(/tagline/);
    });

    test('feature_highlights array change is reported as count delta', () => {
        const prev = basePayload();
        const next = basePayload();
        next.tiers[1].feature_highlights = ['c','d','e','f'];
        const out = diffService.diffPayloads(prev, next);
        expect(out).toMatch(/feature_highlights.*2.*4 bullets/);
    });
});

describe('diffPayloads — module access changes', () => {
    test('Workflows flipping None → Core for Starter is reported', () => {
        const prev = basePayload();
        const next = basePayload();
        next.comparison.groups[1].modules[0].tiers.starter = { access: 'core' };
        const out = diffService.diffPayloads(prev, next);
        expect(out).toMatch(/Module Access Changes/);
        expect(out).toMatch(/workflows.*starter.*none.*core.*more inclusive/);
    });

    test('Chat flipping Core → None for Business is reported', () => {
        const prev = basePayload();
        const next = basePayload();
        next.comparison.groups[0].modules[0].tiers.business = { access: 'none' };
        const out = diffService.diffPayloads(prev, next);
        expect(out).toMatch(/chat.*business.*core.*none.*less inclusive/);
    });
});

describe('diffPayloads — add-on price changes', () => {
    test('addon price change on optional cell is reported', () => {
        const prev = basePayload();
        prev.comparison.groups[1].modules[0].tiers.starter = { access: 'optional', addon_price_monthly: 49 };
        const next = basePayload();
        next.comparison.groups[1].modules[0].tiers.starter = { access: 'optional', addon_price_monthly: 79 };
        const out = diffService.diffPayloads(prev, next);
        expect(out).toMatch(/Add-on Price Changes/);
        expect(out).toMatch(/workflows.*starter.*\$49.*\$79.*⬆/);
    });
});

describe('diffPayloads — tier and module membership', () => {
    test('new tier is reported as added', () => {
        const prev = basePayload();
        const next = basePayload();
        next.tiers.push({ id: 'enterprise', name: 'Enterprise', tagline: '', target_customer: '',
            tier_group: 'standard', display_order: 3, is_featured: false,
            price_monthly: 799, price_yearly: 7990, cta_label: 'Demo', cta_url: 'https://e',
            limits: {}, features: {}, feature_highlights: [], modules: { core: [], optional: [] }});
        const out = diffService.diffPayloads(prev, next);
        expect(out).toMatch(/New \/ Removed Tiers/);
        expect(out).toMatch(/➕.*Enterprise.*\$799/);
    });

    test('removed module is reported', () => {
        const prev = basePayload();
        const next = basePayload();
        next.modules_meta = next.modules_meta.filter(m => m.id !== 'workflows');
        const out = diffService.diffPayloads(prev, next);
        expect(out).toMatch(/New \/ Removed Modules/);
        expect(out).toMatch(/➖.*Workflows/);
    });
});

describe('helpers', () => {
    const { fmtPrice, accessArrow, shorten } = diffService._internal;
    test('fmtPrice handles null and integers', () => {
        expect(fmtPrice(null)).toBe('—');
        expect(fmtPrice(49)).toBe('49');
        expect(fmtPrice(49.5)).toBe('49.50');
    });
    test('accessArrow ranks core > optional > none', () => {
        expect(accessArrow('none', 'core')).toMatch(/more inclusive/);
        expect(accessArrow('core', 'none')).toMatch(/less inclusive/);
        expect(accessArrow('core', 'core')).toBe('↔');
    });
    test('shorten truncates long strings', () => {
        const long = 'a'.repeat(100);
        expect(shorten(long)).toMatch(/…"$/);
        expect(shorten('short')).toBe('"short"');
        expect(shorten(null)).toBe('_(empty)_');
    });
});
