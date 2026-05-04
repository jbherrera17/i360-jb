/**
 * Environment validation for Insight 360.
 *
 * Loaded once during bootstrap (server/index.js). Fails fast in deployed
 * environments when required env vars are missing; warns in development.
 */

function validateEnvironment() {
    const isProduction = process.env.NODE_ENV === 'production';
    const environment = process.env.ENVIRONMENT || (isProduction ? 'production' : 'development');
    const isDeployed = environment === 'production' || environment === 'staging';
    const errors = [];
    const warnings = [];

    // Always required
    if (!process.env.SUPABASE_URL) errors.push('SUPABASE_URL is required');
    if (!process.env.SUPABASE_ANON_KEY) errors.push('SUPABASE_ANON_KEY is required');

    // Required in production or staging
    if (isDeployed) {
        if (!process.env.SUPABASE_SERVICE_KEY) {
            errors.push('SUPABASE_SERVICE_KEY is required in ' + environment);
            errors.push('  → Get this from Supabase Dashboard > Project Settings > API');
        }
        if (!process.env.ALLOWED_ORIGINS) {
            errors.push('ALLOWED_ORIGINS is required in ' + environment);
            errors.push('  → Set to your domain (e.g., https://your-app.railway.app)');
        }
        if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
            errors.push('At least one LLM API key is required:');
            errors.push('  → ANTHROPIC_API_KEY (for Claude models)');
            errors.push('  → OPENAI_API_KEY (for GPT models)');
        }
        if (process.env.DEV_AUTH_BYPASS === 'true') {
            errors.push('DEV_AUTH_BYPASS must not be "true" in ' + environment);
        }
    }

    // Warnings (non-fatal) - Optional services
    if (!isDeployed) {
        if (!process.env.ANTHROPIC_API_KEY) {
            warnings.push('ANTHROPIC_API_KEY not set - Claude models unavailable');
        }
        if (!process.env.GOOGLE_API_KEY) {
            warnings.push('GOOGLE_API_KEY not set - Gemini models unavailable');
        }
        if (!process.env.PERPLEXITY_API_KEY) {
            warnings.push('PERPLEXITY_API_KEY not set - Perplexity search unavailable');
        }
        if (!process.env.BRAVE_SEARCH_API_KEY && !process.env.TAVILY_API_KEY && !process.env.SERPER_API_KEY) {
            warnings.push('No search API keys set - Web search unavailable');
        }
    }

    // Token encryption key — required in production to protect OAuth tokens
    if (isDeployed && !process.env.TOKEN_ENCRYPTION_KEY) {
        errors.push('TOKEN_ENCRYPTION_KEY is required in ' + environment);
        errors.push('  → Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    } else if (!process.env.TOKEN_ENCRYPTION_KEY) {
        warnings.push('TOKEN_ENCRYPTION_KEY not set - OAuth tokens stored with insecure default key');
    }

    // MCP credential encryption key validation
    if (isDeployed && !process.env.MCP_CREDENTIAL_KEY) {
        errors.push('MCP_CREDENTIAL_KEY is required in ' + environment);
        errors.push('  → Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    } else if (process.env.MCP_CREDENTIAL_KEY) {
        if (process.env.MCP_CREDENTIAL_KEY.length !== 64 || !/^[0-9a-fA-F]+$/.test(process.env.MCP_CREDENTIAL_KEY)) {
            errors.push('MCP_CREDENTIAL_KEY must be a 64-character hex string (32 bytes)');
            errors.push('  → Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
        }
    } else {
        warnings.push('MCP_CREDENTIAL_KEY not set - MCP credential encryption unavailable');
    }

    console.log(`\n🌐 Environment: ${environment} (NODE_ENV=${process.env.NODE_ENV || 'undefined'})`);
    if (warnings.length > 0) {
        console.log('\n⚠️  Optional services not configured:');
        warnings.forEach(w => console.log(`   ${w}`));
    }

    if (errors.length > 0) {
        console.error('\n❌ Environment validation failed:');
        errors.forEach(e => console.error(`   - ${e}`));
        if (isDeployed) {
            console.error(`\nServer cannot start in ${environment} with missing configuration.\n`);
            process.exit(1);
        } else {
            console.warn('\n⚠️  Running in development mode with missing config. Some features will be unavailable.\n');
        }
    }
}

module.exports = { validateEnvironment };
