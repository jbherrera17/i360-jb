/**
 * Central route registry for the Express app.
 *
 * Mounts API routes and frontend page routes in the order required for
 * correct middleware behavior:
 *   1. Pre-auth API routes (health, bugs, metrics, docs, chat, context)
 *   2. Public widget chat
 *   3. Auth middleware
 *   4. Authenticated /api/* routes (Supabase-dependent)
 *   5. Frontend page routes
 *
 * Pre-auth routes are intentionally registered before the global authenticate
 * middleware so they bypass it. Order changes here can silently break auth.
 */

const path = require('path');
const crypto = require('crypto');
const logger = require('../services/logger');
const metrics = require('../services/metrics');
const createModuleAccessMiddleware = require('../middleware/moduleAccess');
const integrationRegistry = require('../services/integrations');

// Route module imports — kept here so the registry is the single source of truth.
const agentsRoutes = require('./agents');
const injectionRoutes = require('./injection');
const conversationsRoutes = require('./conversations');
const parthenonRoutes = require('./parthenon');
const s2eRoutes = require('./s2e');
const actionsRoutes = require('./actions');
const skillsRoutes = require('./skills');
const briefingRoutes = require('./briefing');
const promptsRoutes = require('./prompts');
const align120Routes = require('./align120');
const execute120Routes = require('./execute120');
const artifactsRoutes = require('./artifacts');
const authRoutes = require('./auth');
const onboardingRoutes = require('./onboarding');
const businessRolesRoutes = require('./business-roles');
const departmentsRoutes = require('./departments');
const departmentStrategyRoutes = require('./department-strategy');
const governanceRoutes = require('./governance');
const integrityRoutes = require('./integrity');
const workflowsRoutes = require('./workflows');
const tagsRoutes = require('./tags');
const departmentRolesRoutes = require('./department-roles');
const userProfileRoutes = require('./user-profile');
const synerginexusRoutes = require('./synerginexus');
const thoughtLeadershipRoutes = require('./thought-leadership');
const blogRoutes = require('./blog');
const oauthRoutes = require('./oauth');
const modelAvailabilityRoutes = require('./model-availability');
const visualizationsRoutes = require('./visualizations');
const researchStudioRoutes = require('./researchStudio');
const usersRoutes = require('./users');
const organizationsRoutes = require('./organizations');
const orgMembersRoutes = require('./org-members');
const clientsRoutes = require('./clients');
const connectionsRoutes = require('./connections');
const orgCustomizationRoutes = require('./orgCustomization');
const clientPortalRoutes = require('./clientPortal');
const agencyAnalyticsRoutes = require('./agencyAnalytics');
const platformAdminRoutes = require('./platformAdmin');
const pricingRoutes = require('./pricing');
const modulesRoutes = require('./modules');
const resourceAccessRoutes = require('./resourceAccess');
const integrationsRoutes = require('./integrations');
const webhooksRoutes = require('./webhooks');
const soulConfigRoutes = require('./soulConfig');
const socialPublishRoutes = require('./social-publish');
const easyStartRoutes = require('./easyStart');
const openBrainRoutes = require('./openBrain');
const platformMcpRoutes = require('./platformMcp');
const mcpRoutes = require('./mcp');
const digestRoutes = require('./digest');
const roleAuditRoutes = require('./roleAudit');
const supportRoutes = require('./support');
const supportActionsRoutes = require('./supportActions');
const widgetsAdminRoutes = require('./widgets');
const conversationReviewRoutes = require('./conversationReview');
const healthStreamRoutes = require('./health-stream');
const healthRoutes = require('./health');
const bugsRoutes = require('./bugs');
const docsRoutes = require('./docs');

let widgetChatRoutes;
try { widgetChatRoutes = require('./widgetChat'); } catch (_e) { /* Widget routes not yet deployed */ }

function _registerPreAuthApi(app) {
    // Health check route (registered before any auth so probes always succeed)
    app.use('/api/health', healthRoutes);

    // Prometheus metrics endpoint (Phase 14). This is intentionally outside
    // Supabase user auth so internal scrapers can use a dedicated bearer token.
    app.get('/metrics', requireMetricsAuth, async (req, res) => {
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
    app.use('/api/docs', docsRoutes);

}

function requireMetricsAuth(req, res, next) {
    const expectedToken = process.env.METRICS_AUTH_TOKEN;
    if (!expectedToken) {
        return res.status(503).json({
            success: false,
            error: 'Metrics authentication is not configured',
            code: 'METRICS_AUTH_UNAVAILABLE',
        });
    }

    const authHeader = req.headers.authorization || '';
    const suppliedToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const suppliedBuffer = Buffer.from(suppliedToken);
    const expectedBuffer = Buffer.from(expectedToken);
    const valid = suppliedBuffer.length === expectedBuffer.length
        && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);

    if (!valid) {
        return res.status(401).json({
            success: false,
            error: 'Metrics authentication required',
            code: 'METRICS_AUTH_REQUIRED',
        });
    }

    next();
}

function _registerPublicWidgetChat(app, supabase) {
    if (!widgetChatRoutes) return;
    try {
        // [SEC-03] Public widget chat must register BEFORE the auth middleware.
        // Endpoints use HMAC token auth, not Supabase auth.
        app.use('/api/chat/public', widgetChatRoutes(supabase));
        console.log('  ✅ Widget public chat routes registered (before auth)');
    } catch (error) {
        console.log('  ⚠️  Widget chat routes not loaded:', error.message);
    }
}

function applyApiAuthBoundary(app) {
    const { authenticate, rateLimit } = require('../middleware/auth');
    const chatRateLimit = rateLimit({
        windowMs: 60000,
        max: 30,
        message: 'Too many chat requests. Please wait a moment.',
    });

    app.use('/api', authenticate);
    app.use('/api/chat', (req, res, next) => {
        // Public model metadata is cheap and should not consume chat capacity.
        if (req.method === 'GET' && (req.path === '/models' || req.path === '/models/all')) {
            return next();
        }
        return chatRateLimit(req, res, next);
    });
    console.log('  ✅ Authentication middleware applied');
}

function _registerBoundaryProtectedApi(app, supabase) {
    // These routers also enforce auth/org membership locally so alternate
    // compositions (including tests) cannot accidentally bypass the boundary.
    app.use('/api/chat', require('./chat')(supabase));
    app.use('/api/context', require('./context')(supabase));
    app.use('/api/bugs', bugsRoutes);
}

function _registerAuthenticatedApi(app, supabase) {
    // Health stream SSE (real-time LLM health monitoring)
    app.use('/api/health', healthStreamRoutes);

    // Supabase-dependent routes
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
    app.use('/api/execute120', execute120Routes(supabase));
    app.use('/api/artifacts', artifactsRoutes(supabase));

    const authRouter = authRoutes(supabase);
    app.locals.impersonationStore = authRouter.impersonationStore;
    app.use('/api/auth', authRouter);

    app.use('/api/onboarding', onboardingRoutes(supabase));
    app.use('/api/business-roles', businessRolesRoutes(supabase));
    app.use('/api/departments', departmentsRoutes(supabase));
    app.use('/api/department-strategy', departmentStrategyRoutes(supabase));
    app.use('/api/governance', governanceRoutes(supabase));
    app.use('/api/integrity', integrityRoutes(supabase));
    app.use('/api/workflows', workflowsRoutes(supabase));
    app.use('/api/tags', tagsRoutes(supabase));
    app.use('/api/roles', departmentRolesRoutes(supabase));
    app.use('/api/user-profile', userProfileRoutes(supabase));
    app.use('/api/synerginexus', synerginexusRoutes(supabase));
    app.use('/api/thought-leadership', thoughtLeadershipRoutes(supabase));
    app.use('/blog', blogRoutes(supabase));  // Public — no auth middleware
    app.use('/api/oauth', oauthRoutes(supabase));
    app.use('/api/models', modelAvailabilityRoutes);
    app.use('/api/visualizations', visualizationsRoutes);
    app.use('/api/research-studios', researchStudioRoutes(supabase));
    app.use('/api/users', usersRoutes(supabase));
    app.use('/api/role-audit', roleAuditRoutes(supabase));
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

    // Open Brain MCP Integration (factory pattern with auth + module access)
    app.use('/api/open-brain', openBrainRoutes(supabase));

    // Phase 63: MCP Integration System
    app.use('/api/platform/mcp', platformMcpRoutes(supabase));
    app.use('/api/mcp', mcpRoutes(supabase));

    // Phase 60: Social Media Publishing (Postiz Integration)
    app.use('/api/social', socialPublishRoutes(supabase));

    // Phase 66: AI Digest — content aggregation and intelligent summarization
    app.use('/api/digest', digestRoutes(supabase));

    // Phase 71: Customer Support Agent System
    app.use('/api/support/conversations', supportRoutes(supabase));
    app.use('/api/support/actions', supportActionsRoutes(supabase));

    // Phase 73: Widget admin + conversation review (authenticated)
    app.use('/api/widgets', widgetsAdminRoutes(supabase));
    app.use('/api/widget-conversations', conversationReviewRoutes(supabase));

    // Phase 57: Public Pricing API (unauthenticated, whitelisted in auth middleware)
    app.use('/api/pricing', pricingRoutes(supabase));

    // Module access middleware available to other routes via app.get('moduleAccess').
    const moduleAccess = createModuleAccessMiddleware(supabase);
    app.set('moduleAccess', moduleAccess);

    _logRegisteredRoutes();
}

function _logRegisteredRoutes() {
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
    console.log('  ✅ Execute 120 routes registered');
    console.log('  ✅ Artifacts routes registered (Phase 85)');
    console.log('  ✅ Workflows routes registered');
    console.log('  ✅ Tags routes registered (Phase 3.0)');
    console.log('  ✅ Department Roles routes registered (Phase 3.0)');
    console.log('  ✅ User Profile routes registered (Phase 3.0)');
    console.log('  ✅ SynergiNexus routes registered (Phase 3.0)');
    console.log('  ✅ Support routes registered (Phase 71)');
}

function _registerFrontendPages(app) {
    const publicDir = path.join(__dirname, '../../public');
    const sendPage = (file) => (req, res) => res.sendFile(path.join(publicDir, file));

    app.get('/', sendPage('index.html'));
    app.get('/chat', sendPage('chat.html'));
    app.get('/agents', sendPage('agents.html'));
    app.get('/context', sendPage('context.html'));
    app.get('/parthenon', sendPage('parthenon.html'));
    app.get('/actions', sendPage('actions.html'));
    app.get('/skills', sendPage('skills.html'));
    app.get('/briefing', sendPage('briefing.html'));
    app.get('/align120', sendPage('align120.html'));
    app.get('/strategy120', (req, res) => res.redirect(301, '/execute120.html'));
    app.get('/guides', sendPage('guides.html'));
    app.get('/system-health', sendPage('system-health.html'));
    app.get('/workflow-builder', sendPage('workflow-builder.html'));
    app.get('/workflow-run', sendPage('workflow-run.html'));
    app.get('/login', sendPage('login.html'));
    app.get('/pricing', (req, res) => res.redirect('/site/pricing.html'));
    app.get('/synerginexus', sendPage('synerginexus.html'));
    app.get('/tags', sendPage('tags.html'));
    app.get('/roles', sendPage('roles.html'));
    app.get('/research-studio', sendPage('research-studio.html'));
}

/**
 * Register all routes on the app in the correct order.
 *
 * @param {import('express').Express} app
 * @param {any} supabase  Supabase client (may be null if init failed).
 */
function registerRoutes(app, supabase) {
    _registerPreAuthApi(app);
    _registerFrontendPages(app);

    if (supabase) {
        _registerPublicWidgetChat(app, supabase);
    }

    // Auth setup is mandatory. Let configuration/import failures abort startup
    // rather than continuing with protected routes exposed.
    applyApiAuthBoundary(app);
    _registerBoundaryProtectedApi(app, supabase);

    if (supabase) {
        _registerAuthenticatedApi(app, supabase);
    }
}

module.exports = { registerRoutes, healthRoutes, applyApiAuthBoundary, requireMetricsAuth };
