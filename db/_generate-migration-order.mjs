#!/usr/bin/env node
/**
 * Regenerate db/migration-order.md from the current contents of db/.
 *
 * Run from the repo root: node db/_generate-migration-order.mjs
 *
 * Sorts files by category (foundation → phases → seeds → migrations →
 * utilities) and within each category by natural order (numeric portions
 * sorted numerically, so phase10 sorts after phase9). Pulls a short
 * description from each file's header comment when one is present.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'migration-order.md');

// Natural sort (numeric runs compared as numbers)
const NATURAL = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const naturalSort = (a, b) => NATURAL.compare(a, b);

function readHeader(file) {
    let content;
    try {
        content = readFileSync(join(HERE, file), 'utf8');
    } catch {
        return '';
    }
    // Walk the leading comment block, collect the first non-banner line.
    for (const raw of content.split('\n').slice(0, 12)) {
        const line = raw.replace(/^--\s*/, '').trim();
        if (!line) continue;
        if (/^=+$/.test(line)) continue;          // banner lines
        if (/^[Pp]hase\s+\d/.test(line)) return line;
        if (/^[A-Z]/.test(line) && line.length > 4) return line;
    }
    return '';
}

function categorize(files) {
    const buckets = { foundation: [], phases: [], seeds: [], migrations: [], utilities: [] };
    for (const f of files) {
        if (f === 'schema.sql' || f === 'seed.sql') {
            buckets.foundation.push(f);
        } else if (f.startsWith('phase') || f === 'v3.0-combined-init.sql' || f === 'req-002a-nav-label-rename.sql') {
            buckets.phases.push(f);
        } else if (f.startsWith('seed-') || f.startsWith('import-')) {
            buckets.seeds.push(f);
        } else if (f.startsWith('migration-') || f.startsWith('fix-rls-') || f.startsWith('fix-security-')) {
            buckets.migrations.push(f);
        } else {
            // cleanup-*, verify-*, and feature-specific fix-* (e.g. fix-agent-*)
            // are one-off repair scripts, not part of the standard install path.
            buckets.utilities.push(f);
        }
    }
    for (const k of Object.keys(buckets)) {
        buckets[k].sort(naturalSort);
    }
    // Foundation order is fixed (schema before seed)
    buckets.foundation = ['schema.sql', 'seed.sql'].filter(f => files.includes(f));
    return buckets;
}

function renderSection(title, files, intro) {
    if (files.length === 0) return '';
    const lines = [`## ${title}`, '', intro, ''];
    for (const f of files) {
        const desc = readHeader(f);
        lines.push(desc ? `- \`${f}\` — ${desc}` : `- \`${f}\``);
    }
    lines.push('');
    return lines.join('\n');
}

function main() {
    const files = readdirSync(HERE).filter(f => f.endsWith('.sql'));
    const b = categorize(files);

    const out = [
        '# Insight 360 Database Migration Order',
        '',
        '> Auto-generated from `db/*.sql`. Regenerate with:',
        '> `node db/_generate-migration-order.mjs`',
        '',
        'Run the sections in order. For a greenfield install, execute each',
        'section top-to-bottom. For an existing instance, apply only the',
        'migrations not yet run — Supabase tracks completed schema in your',
        'project.',
        '',
        renderSection(
            '1. Foundation',
            b.foundation,
            'Core schema and starter data. Required before any phase migration.'
        ),
        renderSection(
            '2. Phase Migrations',
            b.phases,
            'Feature schemas in numeric order. Within a single phase, files are run alphabetically (e.g. `phase87` before `phase87b`).'
        ),
        renderSection(
            '3. Migrations & Fixes',
            b.migrations,
            'Schema corrections and security fixes. Run after phase migrations.'
        ),
        renderSection(
            '4. Seed Data',
            b.seeds,
            'Reference data and content imports. Run after schema is fully built.'
        ),
        renderSection(
            '5. Utilities (run only when needed)',
            b.utilities,
            'Cleanup, verification, and one-off repair scripts. Not part of the standard install path.'
        ),
        `_${files.length} files indexed._`,
        '',
    ].join('\n');

    writeFileSync(OUT, out);
    console.log(`Wrote ${OUT} (${files.length} files indexed)`);
}

main();
