/**
 * Insight 360 Server — entry point.
 *
 * Validates environment, builds the Express app, and starts the HTTP listener.
 * App composition lives in server/app.js and the modules under
 * server/{config,middleware,routes,scheduler,services}.
 */

require('dotenv').config();

const { validateEnvironment } = require('./config/env');
validateEnvironment();

const logger = require('./services/logger');
const { buildApp } = require('./app');
const healthRoutes = require('./routes/health');

const PORT = process.env.PORT || 3000;
const app = buildApp();

logger.info('========================================');
logger.info('         INSIGHT 360 v2.31.0');
logger.info('      Values-Based AI Ecosystem');
logger.info('   Phase 14: Observability & Monitoring');
logger.info('========================================');

// Start listening immediately — async background tasks (schedulers, health
// checks) complete in the background and must not delay startup.
setImmediate(() => {
    app.listen(PORT, () => {
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
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason, _promise) => {
    logger.error('Unhandled Rejection', { reason: String(reason) });
});

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

module.exports = app;
