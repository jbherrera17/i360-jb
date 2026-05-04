/**
 * Base middleware setup for the Express app.
 *
 * Order is significant: helmet → compression → cors → body parsing →
 * page-auth → static files → observability → supabase request attachment.
 * Routes are registered separately (see server/routes/registry.js).
 */

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const { observabilityMiddleware } = require('./observability');

// Protected HTML pages — must authenticate before serving.
const PROTECTED_PAGES = [
    '/', '/index.html', '/chat', '/chat.html', '/agents', '/agents.html',
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
    '/easy-start', '/easy-start.html',
    '/digest', '/digest.html', '/digest-sources', '/digest-sources.html',
    '/artifacts', '/artifacts.html',
];

function _applyHelmet(app) {
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
                    "https://api.mindstudio.ai",
                ],
                frameSrc: [
                    "'self'",
                    "https://app.mindstudio.ai",
                    "https://*.mindstudio.ai",
                    "https://www.youtube.com",
                    "https://youtube.com",
                    "https://player.vimeo.com",
                    "https://vimeo.com",
                ],
            },
        },
        // HSTS: enforce HTTPS for 1 year, include subdomains.
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        },
    }));
}

function _applyCompression(app) {
    // Skip compression for SSE streaming endpoints to allow real-time token delivery.
    app.use(compression({
        filter: (req, res) => {
            if (req.headers.accept === 'text/event-stream') {
                return false;
            }
            if (
                req.path === '/api/chat/stream' ||
                req.path === '/api/easy-start/stream' ||
                req.path === '/api/digest/generate/stream' ||
                req.path === '/api/health/stream' ||
                req.path.match(/^\/api\/support\/conversations\/[^/]+\/stream$/) ||
                req.path.match(/^\/api\/chat\/public\/[^/]+\/stream$/)
            ) {
                return false;
            }
            return compression.filter(req, res);
        },
    }));
}

function _applyCors(app) {
    app.use(cors({
        origin: function(origin, callback) {
            const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim());
            // In production, require explicit ALLOWED_ORIGINS.
            if (process.env.NODE_ENV === 'production' && (!allowedOrigins || allowedOrigins.length === 0)) {
                return callback(new Error('ALLOWED_ORIGINS must be configured in production'));
            }
            // Allow requests with no origin (server-to-server, curl, mobile apps).
            if (!origin) return callback(null, true);
            // In development without ALLOWED_ORIGINS, allow all.
            if (!allowedOrigins || allowedOrigins.length === 0) return callback(null, true);
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            // Allow Chrome extension origins.
            if (origin && origin.startsWith('chrome-extension://')) {
                const allowedExtensions = process.env.ALLOWED_EXTENSION_IDS?.split(',').map(id => id.trim()) || [];
                const extId = origin.replace('chrome-extension://', '');
                if (allowedExtensions.includes(extId) || allowedExtensions.includes('*')) {
                    return callback(null, true);
                }
                // In development, allow all extensions.
                if (process.env.NODE_ENV !== 'production') {
                    return callback(null, true);
                }
            }
            return callback(new Error(`Origin ${origin} not allowed by CORS`));
        },
        credentials: true,
    }));
}

function _applyPageAuth(app) {
    app.use((req, res, next) => {
        // Only check HTML page requests, not static assets.
        const isProtectedPage = PROTECTED_PAGES.some(page => req.path === page);

        if (!isProtectedPage) {
            return next();
        }

        // Development mode bypass.
        if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
            return next();
        }

        // Check for auth token in cookie.
        const cookies = req.headers.cookie || '';
        const tokenMatch = cookies.match(/auth_token=([^;]+)/);
        const token = tokenMatch ? tokenMatch[1] : null;

        if (!token) {
            return res.redirect('/login');
        }

        // Token exists — let it through (Supabase validation happens in API routes).
        next();
    });
}

function _applyStaticFiles(app) {
    app.use(express.static(path.join(__dirname, '../../public')));
    app.use('/documentation', express.static(path.join(__dirname, '../../documentation')));
    app.use('/site', express.static(path.join(__dirname, '../../website')));
}

function _applySupabaseAttachment(app, getSupabase) {
    app.use((req, res, next) => {
        req.supabase = getSupabase();
        next();
    });
}

/**
 * Apply all base middleware to the app in the correct order.
 * @param {import('express').Express} app
 * @param {() => any} getSupabase  Returns the current Supabase client (or null
 *   if not yet initialized). Called at request time so middleware reads the
 *   live value rather than a stale snapshot.
 */
function applyBaseMiddleware(app, getSupabase) {
    _applyHelmet(app);
    _applyCompression(app);
    _applyCors(app);
    app.use(express.json({ limit: '15mb' }));
    app.use(express.urlencoded({ extended: true, limit: '15mb' }));
    _applyPageAuth(app);
    _applyStaticFiles(app);
    app.use(observabilityMiddleware);
    _applySupabaseAttachment(app, getSupabase);
}

module.exports = { applyBaseMiddleware };
