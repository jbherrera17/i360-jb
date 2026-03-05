/**
 * Insight 360 Server - v2.31.0
 * Values-Based AI Ecosystem
 *
 * Features:
 * - Multi-LLM support (Anthropic Claude, OpenAI GPT)
 * - Voice input/output (Speech-to-Text, Text-to-Speech)
 * - Web search integration (Brave, Tavily, Serper)
 * - File/image processing
 * - Streaming responses
 * - Conversation persistence (Supabase)
 * - System health monitoring
 * - Context Assets management (Phase 3)
 * - Agent Framework (Phase 3)
 * - Observability & Monitoring (Phase 14)
 */

require('dotenv').config();

// ============================================
// ENVIRONMENT VALIDATION
// ============================================
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
validateEnvironment();

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const logger = require('./services/logger');
const metrics = require('./services/metrics');
const { observabilityMiddleware, errorLogger } = require('./middleware/observability');
const agentsRoutes = require('./routes/agents');
const injectionRoutes = require('./routes/injection');
const conversationsRoutes = require('./routes/conversations');
const parthenonRoutes = require('./routes/parthenon');
const s2eRoutes = require('./routes/s2e');
const actionsRoutes = require('./routes/actions');
const skillsRoutes = require('./routes/skills');
const briefingRoutes = require('./routes/briefing');
const promptsRoutes = require('./routes/prompts');
const align120Routes = require('./routes/align120');
const strategy120Routes = require('./routes/strategy120');
const execute120Routes = require('./routes/execute120');
const authRoutes = require('./routes/auth');
const onboardingRoutes = require('./routes/onboarding');
const businessRolesRoutes = require('./routes/business-roles');
const departmentsRoutes = require('./routes/departments');
const departmentStrategyRoutes = require('./routes/department-strategy');
const governanceRoutes = require('./routes/governance');
const integrityRoutes = require('./routes/integrity');
const workflowsRoutes = require('./routes/workflows');
const tagsRoutes = require('./routes/tags');
const departmentRolesRoutes = require('./routes/department-roles');
const userProfileRoutes = require('./routes/user-profile');
const synerginexusRoutes = require('./routes/synerginexus');
const thoughtLeadershipRoutes = require('./routes/thought-leadership');
const oauthRoutes = require('./routes/oauth');
const modelAvailabilityRoutes = require('./routes/model-availability');
const visualizationsRoutes = require('./routes/visualizations');
const researchStudioRoutes = require('./routes/researchStudio');
const usersRoutes = require('./routes/users');
const organizationsRoutes = require('./routes/organizations');
const orgMembersRoutes = require('./routes/org-members');
const clientsRoutes = require('./routes/clients');
const connectionsRoutes = require('./routes/connections');
const orgCustomizationRoutes = require('./routes/orgCustomization');
const clientPortalRoutes = require('./routes/clientPortal');
const agencyAnalyticsRoutes = require('./routes/agencyAnalytics');
const platformAdminRoutes = require('./routes/platformAdmin');
const pricingRoutes = require('./routes/pricing');
const modulesRoutes = require('./routes/modules');
const resourceAccessRoutes = require('./routes/resourceAccess');
const integrationsRoutes = require('./routes/integrations');
const webhooksRoutes = require('./routes/webhooks');
const soulConfigRoutes = require('./routes/soulConfig');
const socialPublishRoutes = require('./routes/social-publish');
const easyStartRoutes = require('./routes/easyStart');
const openBrainRoutes = require('./routes/openBrain');
const platformMcpRoutes = require('./routes/platformMcp');
const mcpRoutes = require('./routes/mcp');
const integrationRegistry = require('./services/integrations');
const createModuleAccessMiddleware = require('./middleware/moduleAccess');
const schedulerService = require('./services/schedulerService');

// ============================================
// INITIALIZE EXPRESS APP
// ============================================

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// ============================================
// SECURITY MIDDLEWARE
// ============================================

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://cdn.sheetjs.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            mediaSrc: ["'self'", "blob:", "https:"],
            connectSrc: [
                "'self'",
                "https://api.anthropic.com",
                "https://api.openai.com",
                "https://*.supabase.co",
                "https://unpkg.com",
                "https://cdn.jsdelivr.net",
                "https://cdn.sheetjs.com",
                "https://api.mindstudio.ai"
            ],
            frameSrc: [
                "'self'",
                "https://app.mindstudio.ai",
                "https://*.mindstudio.ai",
                "https://www.youtube.com",
                "https://youtube.com",
                "https://player.vimeo.com",
                "https://vimeo.com"
            ]
        }
    },
    // HSTS: enforce HTTPS for 1 year, include subdomains
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// ============================================
// COMPRESSION & CORS
// ============================================

// Skip compression for SSE streaming endpoints to allow real-time token delivery
app.use(compression({
    filter: (req, res) => {
        // Don't compress SSE streams (they need to be unbuffered)
        if (req.headers.accept === 'text/event-stream') {
            return false;
        }
        if (req.path === '/api/chat/stream' || req.path === '/api/easy-start/stream') {
            return false;
        }
        // Use default compression for everything else
        return compression.filter(req, res);
    }
}));

app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim());
        // In production, require explicit ALLOWED_ORIGINS
        if (process.env.NODE_ENV === 'production' && (!allowedOrigins || allowedOrigins.length === 0)) {
            return callback(new Error('ALLOWED_ORIGINS must be configured in production'));
        }
        // Allow requests with no origin (server-to-server, curl, mobile apps)
        if (!origin) return callback(null, true);
        // In development without ALLOWED_ORIGINS, allow all
        if (!allowedOrigins || allowedOrigins.length === 0) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true
}));

// ============================================
// BODY PARSING
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// PAGE AUTHENTICATION (before static files)
// ============================================

// Protected HTML pages - must authenticate before serving
const protectedPages = ['/', '/index.html', '/chat', '/chat.html', '/agents', '/agents.html',
    '/briefing', '/briefing.html', '/context', '/context.html', '/parthenon', '/parthenon.html',
    '/actions', '/actions.html', '/skills', '/skills.html', '/align120', '/align120.html',
    '/strategy120', '/strategy120.html', '/execute120', '/execute120.html',
    '/guides', '/guides.html', '/admin', '/admin.html', '/profile', '/profile.html',
    '/workflow-run', '/workflow-run.html', '/workflow-builder', '/workflow-builder.html',
    '/system-health', '/system-health.html', '/synerginexus', '/synerginexus.html',
    '/tags', '/tags.html', '/roles', '/roles.html',
    '/research-studio', '/research-studio.html',
    '/admin-org-settings', '/admin-org-settings.html',
    '/admin-org-members', '/admin-org-members.html',
    '/admin-clients', '/admin-clients.html',
    '/admin-responsibilities', '/admin-responsibilities.html',
    '/admin-responsibility-ai', '/admin-responsibility-ai.html',
    '/admin-department-ai', '/admin-department-ai.html',
    '/admin-okr-capabilities', '/admin-okr-capabilities.html',
    '/my-capabilities', '/my-capabilities.html',
    '/client-comparison', '/client-comparison.html',
    '/integrations', '/integrations.html',
    '/easy-start', '/easy-start.html'];

// Page auth middleware - runs before static file serving
app.use((req, res, next) => {
    // Only check HTML page requests, not static assets
    const isProtectedPage = protectedPages.some(page => req.path === page);

    if (!isProtectedPage) {
        return next();
    }

    // Development mode bypass
    if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
        return next();
    }

    // Check for auth token in cookie
    const cookies = req.headers.cookie || '';
    const tokenMatch = cookies.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
        return res.redirect('/login');
    }

    // Token exists - let it through (Supabase validation happens in API routes)
    next();
});

// ============================================
// STATIC FILES
// ============================================

app.use(express.static(path.join(__dirname, '../public')));
app.use('/documentation', express.static(path.join(__dirname, '../documentation')));
app.use('/site', express.static(path.join(__dirname, '../website')));

// ============================================
// OBSERVABILITY MIDDLEWARE (Phase 14)
// ============================================

// Add correlation IDs, request logging, and metrics collection
app.use(observabilityMiddleware);

// ============================================
// SUPABASE CLIENT
// ============================================

let supabase = null;
let supabaseConfigured = false;

function initializeSupabase() {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        try {
            const { createClient } = require('@supabase/supabase-js');

            // Security: Prefer service key for server-side operations (bypasses RLS)
            // Fall back to anon key but warn - admin operations may fail
            const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
            const usingServiceKey = !!process.env.SUPABASE_SERVICE_KEY;

            if (usingServiceKey) {
                console.log('🔑 Using SUPABASE_SERVICE_KEY (RLS bypassed)');
            } else if (process.env.NODE_ENV === 'production') {
                console.warn('⚠️  WARNING: SUPABASE_SERVICE_KEY not set. Using ANON_KEY - admin operations may fail due to RLS.');
            } else {
                console.log('⚠️  Using ANON_KEY (RLS enforced)');
            }

            supabase = createClient(
                process.env.SUPABASE_URL,
                supabaseKey,
                {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    },
                    // Force the Authorization header to always use the service key
                    // This prevents user sessions from overriding it
                    global: {
                        headers: {
                            Authorization: `Bearer ${supabaseKey}`
                        }
                    }
                }
            );
            supabaseConfigured = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize Supabase:', error.message);
            return false;
        }
    }
    return false;
}

// Attach Supabase to requests
app.use((req, res, next) => {
    req.supabase = supabase;
    next();
});

// ============================================
// SERVICES INITIALIZATION
// ============================================

// Service status tracking
const serviceStatus = {
    anthropic: false,
    openai: false,
    perplexity: false,
    gemini: false,
    search: false,
    voice: false,
    supabase: false
};

// Initialize services
function initializeServices() {
    console.log('\n🚀 Initializing Insight 360 Services...\n');

    // Initialize Anthropic (Claude)
    if (process.env.ANTHROPIC_API_KEY) {
        try {
            const anthropicService = require('./services/anthropic');
            if (typeof anthropicService.initialize === 'function') {
                anthropicService.initialize(process.env.ANTHROPIC_API_KEY);
            }
            serviceStatus.anthropic = true;
            console.log('  ✅ Claude (Anthropic) - Ready');
        } catch (error) {
            console.log('  ❌ Claude (Anthropic) - Failed:', error.message);
            console.log('     Check that ANTHROPIC_API_KEY is valid and has sufficient credits');
        }
    } else {
        console.log('  ⚪ Claude (Anthropic) - No API key');
    }

    // Initialize OpenAI (GPT)
    if (process.env.OPENAI_API_KEY) {
        try {
            const openaiService = require('./services/openai');
            if (typeof openaiService.initialize === 'function') {
                openaiService.initialize(process.env.OPENAI_API_KEY);
            }
            serviceStatus.openai = true;
            serviceStatus.voice = true; // Voice uses OpenAI
            console.log('  ✅ GPT (OpenAI) - Ready');
            console.log('  ✅ Voice (OpenAI Audio) - Ready');
        } catch (error) {
            console.log('  ❌ GPT (OpenAI) - Failed:', error.message);
            console.log('     Check that OPENAI_API_KEY is valid and has sufficient credits');
        }
    } else {
        console.log('  ⚪ GPT (OpenAI) - No API key');
    }

    // Initialize Perplexity (Sonar)
    if (process.env.PERPLEXITY_API_KEY) {
        try {
            const perplexityService = require('./services/perplexity');
            if (typeof perplexityService.initialize === 'function') {
                perplexityService.initialize(process.env.PERPLEXITY_API_KEY);
            }
            serviceStatus.perplexity = true;
            console.log('  ✅ Perplexity (Sonar) - Ready');
        } catch (error) {
            console.log('  ❌ Perplexity (Sonar) - Failed:', error.message);
            console.log('     Check that PERPLEXITY_API_KEY is valid and has sufficient credits');
        }
    } else {
        console.log('  ⚪ Perplexity (Sonar) - No API key');
    }

    // Initialize Google Gemini
    if (process.env.GOOGLE_API_KEY) {
        try {
            const geminiService = require('./services/gemini');
            if (typeof geminiService.initialize === 'function') {
                geminiService.initialize(process.env.GOOGLE_API_KEY);
            }
            serviceStatus.gemini = true;
            console.log('  ✅ Gemini (Google) - Ready');
        } catch (error) {
            console.log('  ❌ Gemini (Google) - Failed:', error.message);
            console.log('     Check that GOOGLE_API_KEY is valid and not expired');
        }
    } else {
        console.log('  ⚪ Gemini (Google) - No API key');
    }

    // Initialize Web Search
    const searchApiKey = process.env.BRAVE_SEARCH_API_KEY ||
                         process.env.TAVILY_API_KEY ||
                         process.env.SERPER_API_KEY;
    if (searchApiKey) {
        try {
            const searchService = require('./services/search');
            if (typeof searchService.initialize === 'function') {
                searchService.initialize({
                    braveApiKey: process.env.BRAVE_SEARCH_API_KEY,
                    tavilyApiKey: process.env.TAVILY_API_KEY,
                    serperApiKey: process.env.SERPER_API_KEY
                });
            }
            serviceStatus.search = true;
            const provider = process.env.BRAVE_SEARCH_API_KEY ? 'Brave' :
                            process.env.TAVILY_API_KEY ? 'Tavily' : 'Serper';
            console.log(`  ✅ Web Search (${provider}) - Ready`);
        } catch (error) {
            const provider = process.env.BRAVE_SEARCH_API_KEY ? 'BRAVE_SEARCH_API_KEY' :
                            process.env.TAVILY_API_KEY ? 'TAVILY_API_KEY' : 'SERPER_API_KEY';
            console.log('  ❌ Web Search - Failed:', error.message);
            console.log(`     Check that ${provider} is valid and has sufficient credits`);
        }
    } else {
        console.log('  ⚪ Web Search - No API key (set BRAVE_SEARCH_API_KEY, TAVILY_API_KEY, or SERPER_API_KEY)');
    }

    // Initialize Supabase
    if (initializeSupabase()) {
        serviceStatus.supabase = true;
        console.log('  ✅ Supabase (Database) - Ready');

        // Apply authentication middleware BEFORE routes
        try {
            const { authenticate, rateLimit } = require('./middleware/auth');
            app.use('/api', authenticate);
            app.use('/api/chat', rateLimit({
                windowMs: 60000,
                max: 30,
                message: 'Too many chat requests. Please wait a moment.'
            }));
            console.log('  ✅ Authentication middleware applied');
        } catch (error) {
            console.log('  ⚠️  Auth middleware not loaded:', error.message);
        }

        // Register Supabase-dependent routes HERE (after Supabase is initialized)
        app.use('/api/agents', agentsRoutes(supabase));
        app.use('/api/injection', injectionRoutes(supabase));
        app.use('/api/conversations', conversationsRoutes);
        app.use('/api/parthenon', parthenonRoutes(supabase));
        app.use('/api/s2e', s2eRoutes(supabase));
        app.use('/api/actions', actionsRoutes(supabase));
        app.use('/api/skills', skillsRoutes(supabase));
        app.use('/api/briefing', briefingRoutes(supabase));
        app.use('/api/prompts', promptsRoutes(supabase));
        app.use('/api/align120', align120Routes(supabase));
        app.use('/api/strategy120', strategy120Routes(supabase));
        app.use('/api/execute120', execute120Routes(supabase));
        const authRouter = authRoutes(supabase);
        app.locals.impersonationStore = authRouter.impersonationStore;
        app.use('/api/auth', authRouter);
        app.use('/api/onboarding', onboardingRoutes(supabase));
        app.use('/api/business-roles', businessRolesRoutes);
        app.use('/api/departments', departmentsRoutes);
        app.use('/api/department-strategy', departmentStrategyRoutes);
        app.use('/api/governance', governanceRoutes);
        app.use('/api/integrity', integrityRoutes);
        app.use('/api/workflows', workflowsRoutes);
        app.use('/api/tags', tagsRoutes(supabase));
        app.use('/api/roles', departmentRolesRoutes(supabase));
        app.use('/api/user-profile', userProfileRoutes(supabase));
        app.use('/api/synerginexus', synerginexusRoutes(supabase));
        app.use('/api/thought-leadership', thoughtLeadershipRoutes(supabase));
        app.use('/api/oauth', oauthRoutes(supabase));
        app.use('/api/models', modelAvailabilityRoutes);
        app.use('/api/visualizations', visualizationsRoutes);
        app.use('/api/research-studios', researchStudioRoutes(supabase));
        app.use('/api/users', usersRoutes);
        app.use('/api/organizations', organizationsRoutes(supabase));
        app.use('/api/org-members', orgMembersRoutes(supabase));
        app.use('/api/clients', clientsRoutes(supabase));
        app.use('/api/connections', connectionsRoutes(supabase));
        app.use('/api/org-customization', orgCustomizationRoutes(supabase));
        app.use('/api/client-portal', clientPortalRoutes(supabase));
        app.use('/api/analytics', agencyAnalyticsRoutes(supabase));

        // Phase 44: Enterprise Multi-Tenancy
        app.use('/api/platform', platformAdminRoutes(supabase));
        app.use('/api/modules', modulesRoutes(supabase));

        // Phase 45: Resource Access Control
        app.use('/api/resource-access', resourceAccessRoutes(supabase));

        // Phase 48: Integrations
        app.use('/api/integrations', integrationsRoutes(supabase));
        app.use('/api/webhooks', webhooksRoutes(supabase));
        integrationRegistry.initializeProviders();

        // Phase 54: Soul Configuration & Human Values System
        app.use('/api/soul-config', soulConfigRoutes(supabase));

        // Easy Start: Conversational onboarding with tool-use
        app.use('/api/easy-start', easyStartRoutes(supabase));

        // Open Brain MCP Integration
        app.use('/api/open-brain', openBrainRoutes);

        // Phase 63: MCP Integration System
        app.use('/api/platform/mcp', platformMcpRoutes(supabase));
        app.use('/api/mcp', mcpRoutes(supabase));

        // Phase 60: Social Media Publishing (Postiz Integration)
        app.use('/api/social', socialPublishRoutes(supabase));

        // Phase 57: Public Pricing API (unauthenticated, whitelisted in auth middleware)
        app.use('/api/pricing', pricingRoutes(supabase));

        // Initialize module access middleware for use in other routes
        const moduleAccess = createModuleAccessMiddleware(supabase);
        app.set('moduleAccess', moduleAccess);

        console.log('  ✅ Agent routes registered');
        console.log('  ✅ Agency Customization routes registered (Phase 41)');
        console.log('  ✅ Client Portal routes registered (Phase 42)');
        console.log('  ✅ Enterprise Multi-Tenancy routes registered (Phase 44)');
        console.log('  ✅ Resource Access Control routes registered (Phase 45)');
        console.log('  ✅ Integrations routes registered (Phase 48)');
        console.log('  ✅ Webhooks routes registered (Phase 48)');
        console.log('  ✅ Agency Analytics routes registered (Phase 43)');
        console.log('  ✅ Connection Management routes registered (Phase 40)');
        console.log('  ✅ Users routes registered');
        console.log('  ✅ Research Studio routes registered (Phase 6)');
        console.log('  ✅ Visualizations routes registered');
        console.log('  ✅ Model Availability routes registered');
        console.log('  ✅ Auth routes registered');
        console.log('  ✅ Onboarding routes registered');
        console.log('  ✅ Business Roles routes registered');
        console.log('  ✅ Departments routes registered');
        console.log('  ✅ Department Strategy routes registered');
        console.log('  ✅ Governance routes registered');
        console.log('  ✅ Integrity routes registered');
        console.log('  ✅ Conversations routes registered');
        console.log('  ✅ Parthenon routes registered');
        console.log('  ✅ S2E (Strategy-to-Execution) routes registered');
        console.log('  ✅ Actions routes registered');
        console.log('  ✅ Skills routes registered');
        console.log('  ✅ Briefing routes registered');
        console.log('  ✅ Prompts (Transformer) routes registered');
        console.log('  ✅ Align 120 routes registered');
        console.log('  ✅ Strategy 120 routes registered');
        console.log('  ✅ Execute 120 routes registered');
        console.log('  ✅ Workflows routes registered');
        console.log('  ✅ Tags routes registered (Phase 3.0)');
        console.log('  ✅ Department Roles routes registered (Phase 3.0)');
        console.log('  ✅ User Profile routes registered (Phase 3.0)');
        console.log('  ✅ SynergiNexus routes registered (Phase 3.0)');

        // Initialize briefing scheduler
        schedulerService.initializeScheduler()
            .then(() => console.log('  ✅ Briefing scheduler initialized'))
            .catch(err => console.error('  ⚠️ Briefing scheduler failed:', err.message));

        // Initialize publishing scheduler
        schedulerService.initializePublishingScheduler()
            .then(() => console.log('  ✅ Publishing scheduler initialized'))
            .catch(err => console.error('  ⚠️ Publishing scheduler failed:', err.message));
    } else {
        console.log('  ⚪ Supabase - Not configured');
    }
    
    console.log('\n----------------------------------------\n');
}

// ============================================
// API ROUTES (Non-Supabase dependent)
// ============================================

// Health check route (enhanced in Phase 14)
const healthRoutes = require('./routes/health');
app.use('/api/health', healthRoutes);

// Bug tracker route (Notion integration)
const bugsRoutes = require('./routes/bugs');
app.use('/api/bugs', bugsRoutes);

// Prometheus metrics endpoint (Phase 14)
app.get('/metrics', async (req, res) => {
    try {
        const metricsData = await metrics.getMetrics();
        res.set('Content-Type', metrics.getContentType());
        res.send(metricsData);
    } catch (err) {
        logger.error('Error generating metrics', { error: err.message });
        res.status(500).send('Error generating metrics');
    }
});

// Documentation routes (for help system)
const docsRoutes = require('./routes/docs');
app.use('/api/docs', docsRoutes);

// Chat routes (multi-LLM, streaming, voice, search)
const chatRoutes = require('./routes/chat');
app.use('/api/chat', chatRoutes);

// Context Assets routes (Phase 3)
try {
    const contextRoutes = require('./routes/context');
    app.use('/api/context', contextRoutes);
    console.log('📦 Context Assets routes loaded');
} catch (error) {
    console.log('ℹ️  Context routes not yet available:', error.message);
}

// Conversation routes (if separate file exists)
try {
    const conversationRoutes = require('./routes/conversations');
    app.use('/api/conversations', conversationRoutes);
} catch (error) {
    // Conversations handled by chat routes
}

// ============================================
// FRONTEND ROUTES
// ============================================

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve chat.html
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/chat.html'));
});

// Serve other pages
app.get('/agents', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/agents.html'));
});

app.get('/briefing', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/briefing.html'));
});

// Context management page (Phase 3)
app.get('/context', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/context.html'));
});

// Parthenon (organizational structure) page (Phase 3.5)
app.get('/parthenon', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/parthenon.html'));
});

// Actions page (Phase 4)
app.get('/actions', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/actions.html'));
});

// Skills page (Phase 5)
app.get('/skills', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/skills.html'));
});

// Briefing page (Phase 6)
app.get('/briefing', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/briefing.html'));
});

// Align 120 page (Phase 7)
app.get('/align120', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/align120.html'));
});

// Strategy 120 page (Phase 8)
app.get('/strategy120', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/strategy120.html'));
});

// Guides page (documentation hub)
app.get('/guides', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/guides.html'));
});

// System Health page (Phase 13)
app.get('/system-health', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/system-health.html'));
});

// Workflow Builder page (Phase 18)
app.get('/workflow-builder', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/workflow-builder.html'));
});

// Workflow Run page (Phase 18)
app.get('/workflow-run', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/workflow-run.html'));
});

// Login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Marketing pricing page (public)
app.get('/pricing', (req, res) => res.redirect('/site/pricing.html'));

// SynergiNexus pages (Phase 3.0)
app.get('/synerginexus', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/synerginexus.html'));
});

app.get('/tags', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/tags.html'));
});

app.get('/roles', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/roles.html'));
});

// Research Studio page (Phase 6 - NotebookLM-style)
app.get('/research-studio', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/research-studio.html'));
});

// ============================================
// ERROR HANDLERS (registered after services init)
// ============================================

function registerErrorHandlers() {
    // Error logging middleware (Phase 14)
    app.use(errorLogger);

    // 404 handler
    app.use((req, res, next) => {
        if (req.path.startsWith('/api/')) {
            res.status(404).json({
                success: false,
                error: 'API endpoint not found'
            });
        } else {
            // Serve index.html for unknown routes (SPA support)
            res.sendFile(path.join(__dirname, '../public/index.html'));
        }
    });

    // Global error handler
    app.use((err, req, res, next) => {
        console.error('Server Error:', err);
        
        const statusCode = err.statusCode || 500;
        const message = process.env.NODE_ENV === 'production' 
            ? 'An unexpected error occurred' 
            : err.message;
        
        res.status(statusCode).json({
            success: false,
            error: message,
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
        });
    });
}

// ============================================
// SERVER STARTUP
// ============================================

function startServer() {
    // Display banner
    logger.info('========================================');
    logger.info('         INSIGHT 360 v2.31.0');
    logger.info('      Values-Based AI Ecosystem');
    logger.info('   Phase 14: Observability & Monitoring');
    logger.info('========================================');

    // Initialize all services (including Supabase-dependent routes)
    initializeServices();

    // Register error handlers AFTER all routes are set up
    registerErrorHandlers();

    // Start listening
    app.listen(PORT, () => {
        // Mark service as ready for health checks
        healthRoutes.markReady();

        logger.info(`Server running at http://localhost:${PORT}`, {
            port: PORT,
            environment: process.env.NODE_ENV || 'development',
            nodeVersion: process.version,
        });
        logger.info('Available endpoints:', {
            dashboard: `http://localhost:${PORT}/`,
            chat: `http://localhost:${PORT}/chat.html`,
            metrics: `http://localhost:${PORT}/metrics`,
            health: `http://localhost:${PORT}/api/health`,
            healthReady: `http://localhost:${PORT}/api/health/ready`,
            healthLive: `http://localhost:${PORT}/api/health/live`,
        });
        logger.info('========================================');
    });
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason: String(reason) });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    healthRoutes.markNotReady();
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    healthRoutes.markNotReady();
    process.exit(0);
});

// Start the server
startServer();

// Export for testing
module.exports = app;
