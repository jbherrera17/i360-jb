#!/usr/bin/env node
/**
 * Fix invalid agent categories
 * Run: node scripts/fix-agent-categories.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// Mapping of invalid categories to valid ones
const categoryMapping = {
    'brand': 'content',
    'customer_perspective': 'sales',
    'decision_support': 'strategy',
    'financial_perspective': 'analysis',
    'fundamentals': 'strategy',
    'intelligence': 'research',
    'investment': 'analysis',
    'learning_perspective': 'productivity',
    'marketing': 'content',
    'orchestration': 'operations',
    'planning': 'strategy',
    'platform': 'operations',
    'process_perspective': 'operations',
    'upskilling': 'productivity'
};

async function fixCategories() {
    console.log('Fixing agent categories...\n');

    for (const [oldCategory, newCategory] of Object.entries(categoryMapping)) {
        const { data, error } = await supabase
            .from('agents')
            .update({ category: newCategory })
            .eq('category', oldCategory)
            .select('id, name');

        if (error) {
            console.error(`Error updating ${oldCategory}:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`${oldCategory} -> ${newCategory}: ${data.length} agents updated`);
            data.forEach(agent => console.log(`  - ${agent.name}`));
        }
    }

    // Verify
    console.log('\n--- Verification ---');
    const validCategories = ['research', 'productivity', 'communication', 'strategy', 'development', 'governance', 'analysis', 'content', 'sales', 'operations', 'custom'];

    const { data: remaining, error: verifyError } = await supabase
        .from('agents')
        .select('id, name, category')
        .not('category', 'in', `(${validCategories.join(',')})`);

    if (verifyError) {
        console.error('Verification error:', verifyError.message);
    } else if (remaining && remaining.length > 0) {
        console.log(`\nWARNING: ${remaining.length} agents still have invalid categories:`);
        remaining.forEach(a => console.log(`  - ${a.name}: ${a.category}`));
    } else {
        console.log('\nAll agent categories are now valid!');
    }
}

fixCategories().catch(console.error);
