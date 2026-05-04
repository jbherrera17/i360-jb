/**
 * App builder.
 *
 * Composes the Express app from its parts: base middleware, service
 * initialization, route registration, schedulers, and error handlers. Does
 * NOT call validateEnvironment (that runs once during bootstrap in
 * server/index.js) and does NOT start the HTTP listener.
 */

const express = require('express');
const path = require('path');
const { applyBaseMiddleware } = require('./middleware/setup');
const services = require('./services/init');
const { registerRoutes } = require('./routes/registry');
const { initializeSchedulers } = require('./scheduler/setup');
const { errorLogger } = require('./middleware/observability');

function _registerErrorHandlers(app) {
    // Error logging middleware (Phase 14)
    app.use(errorLogger);

    // 404 handler
    app.use((req, res, _next) => {
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({
                success: false,
                error: 'API endpoint not found',
            });
        }

        // Static asset requests must 404 explicitly. Without this guard the
        // SPA fallback below returns index.html for missing JS/CSS, which
        // browsers silently fail to parse — masking broken <script src> and
        // <link href> tags as runtime errors that only surface when the
        // affected feature is used.
        const isAssetPath = /^\/(js|css|img|images|fonts|assets)\//.test(req.path);
        const isAssetExt  = /\.(js|mjs|css|map|json|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf)$/.test(req.path);
        if (isAssetPath || isAssetExt) {
            return res.status(404).send('Not Found');
        }

        // Serve index.html for unknown routes (SPA support)
        res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    // Global error handler
    app.use((err, req, res, _next) => {
        console.error('Server Error:', err);

        const statusCode = err.statusCode || 500;
        const message = process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err.message;

        res.status(statusCode).json({
            success: false,
            error: message,
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
        });
    });
}

/**
 * Build the Express app and start non-blocking background services.
 *
 * @returns {import('express').Express}
 */
function buildApp() {
    const app = express();
    app.set('trust proxy', 1);

    // 1. Base middleware (security, body parsing, page auth, static, observability,
    //    Supabase request attachment via getSupabase getter so it picks up the
    //    client once initialization completes).
    applyBaseMiddleware(app, services.getSupabase);

    // 2. Initialize service providers (LLMs + Supabase).
    services.initializeProviders();
    const supabase = services.getSupabase();

    // 3. Register routes (pre-auth + frontend always; authenticated routes only
    //    when Supabase is configured).
    registerRoutes(app, supabase);

    // 4. Background schedulers (only when Supabase is configured).
    if (supabase) {
        initializeSchedulers();
    }

    console.log('\n----------------------------------------\n');

    // 5. Error handlers MUST be last in the middleware stack.
    _registerErrorHandlers(app);

    return app;
}

module.exports = { buildApp };
