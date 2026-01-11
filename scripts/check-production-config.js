#!/usr/bin/env node

/**
 * Production Configuration Checker
 * Verifies that all required environment variables are set correctly
 * Run this before deploying to production
 */

require('dotenv').config();

const checks = [];
let hasErrors = false;
let hasWarnings = false;

console.log('\n🔍 Checking Production Configuration...\n');

// ============================================
// CRITICAL CHECKS
// ============================================

function critical(name, condition, message) {
    if (condition) {
        console.log(`  ✅ ${name}`);
        checks.push({ name, status: 'pass', type: 'critical' });
    } else {
        console.log(`  ❌ ${name}`);
        console.log(`     ${message}`);
        checks.push({ name, status: 'fail', type: 'critical', message });
        hasErrors = true;
    }
}

function warning(name, condition, message) {
    if (condition) {
        console.log(`  ✅ ${name}`);
        checks.push({ name, status: 'pass', type: 'warning' });
    } else {
        console.log(`  ⚠️  ${name}`);
        console.log(`     ${message}`);
        checks.push({ name, status: 'warn', type: 'warning', message });
        hasWarnings = true;
    }
}

function info(name, value) {
    console.log(`  ℹ️  ${name}: ${value}`);
}

console.log('Critical Configuration:');
console.log('─'.repeat(50));

critical(
    'SUPABASE_URL',
    !!process.env.SUPABASE_URL,
    'SUPABASE_URL is required. Get this from Supabase Dashboard > Project Settings > API > URL'
);

critical(
    'SUPABASE_ANON_KEY',
    !!process.env.SUPABASE_ANON_KEY,
    'SUPABASE_ANON_KEY is required. Get this from Supabase Dashboard > Project Settings > API > anon/public key'
);

critical(
    'SUPABASE_SERVICE_KEY',
    !!process.env.SUPABASE_SERVICE_KEY,
    'SUPABASE_SERVICE_KEY is CRITICAL for production! Without it, all P1 RLS bugs will occur.\n     Get this from Supabase Dashboard > Project Settings > API > service_role key (secret)'
);

critical(
    'ANTHROPIC_API_KEY',
    !!process.env.ANTHROPIC_API_KEY,
    'ANTHROPIC_API_KEY is required for Claude functionality'
);

console.log('\n' + 'Warning Checks:');
console.log('─'.repeat(50));

warning(
    'OPENAI_API_KEY',
    !!process.env.OPENAI_API_KEY,
    'OPENAI_API_KEY is recommended for GPT functionality'
);

warning(
    'NODE_ENV',
    process.env.NODE_ENV === 'production',
    'NODE_ENV should be set to "production" in production environment'
);

warning(
    'PORT',
    !!process.env.PORT,
    'PORT should be explicitly set (defaults to 3000 if not set)'
);

console.log('\n' + 'Security Checks:');
console.log('─'.repeat(50));

warning(
    'DEV_AUTH_BYPASS disabled',
    process.env.DEV_AUTH_BYPASS !== 'true',
    'DEV_AUTH_BYPASS should NOT be "true" in production! This bypasses all authentication.'
);

warning(
    'Service Key vs Anon Key',
    process.env.SUPABASE_SERVICE_KEY !== process.env.SUPABASE_ANON_KEY,
    'SUPABASE_SERVICE_KEY and SUPABASE_ANON_KEY should be different keys!'
);

console.log('\n' + 'Optional Configuration:');
console.log('─'.repeat(50));

info('BRAVE_SEARCH_API_KEY', process.env.BRAVE_SEARCH_API_KEY ? '✓ Set' : '✗ Not set');
info('TAVILY_API_KEY', process.env.TAVILY_API_KEY ? '✓ Set' : '✗ Not set');
info('SERPER_API_KEY', process.env.SERPER_API_KEY ? '✓ Set' : '✗ Not set');
info('DEEPGRAM_API_KEY', process.env.DEEPGRAM_API_KEY ? '✓ Set' : '✗ Not set');

console.log('\n' + '═'.repeat(50));

// ============================================
// SUMMARY
// ============================================

if (hasErrors) {
    console.log('\n❌ CRITICAL ERRORS FOUND');
    console.log('\nProduction deployment will FAIL without fixing these issues.');
    console.log('\nKnown issues that will occur:');
    if (!process.env.SUPABASE_SERVICE_KEY) {
        console.log('  • Align120NewStartSessionError');
        console.log('  • StrategyS2EUnabletoSaveandContinue');
        console.log('  • ContextAssetDeletionNotWorking');
        console.log('  • ParthenonDeptAddSaveError');
        console.log('  • All other RLS-related errors');
    }
    console.log('\nSee PRODUCTION_BUG_FIXES.md for resolution steps.');
    process.exit(1);
} else if (hasWarnings) {
    console.log('\n⚠️  WARNINGS FOUND');
    console.log('\nProduction deployment may work but could have issues.');
    console.log('Review warnings above and fix if possible.');
    process.exit(0);
} else {
    console.log('\n✅ ALL CHECKS PASSED');
    console.log('\nConfiguration looks good for production deployment!');
    process.exit(0);
}
