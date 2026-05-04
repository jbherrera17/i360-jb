/**
 * Thought Leadership API Routes — coordinator.
 *
 * Endpoints:
 *   - Pre-flight Check (1)
 *   - Profile Management (4)
 *   - Content Pillars (4)
 *   - AI Visibility Research (3)
 *   - Content Calendar (9)
 *   - Content Generation (9)
 *   - Image Generation (4)
 *   - Publishing Pipeline (Phase 72) (4)
 *   - Legacy Publishing & Scheduling (6)
 *   - Outputs (2)
 *
 * Total: 46 routes.
 *
 * The original 2900-line thought-leadership.js was split by section. This
 * file applies the Phase 44 module-access gate once at the parent and
 * mounts each sub-router in source order.
 */

const express = require('express');
const { createModuleAccessMiddleware } = require('./_shared');

const preflightRoutes = require('./preflight');
const profileRoutes = require('./profile');
const pillarsRoutes = require('./pillars');
const visibilityRoutes = require('./visibility');
const calendarRoutes = require('./calendar');
const generationRoutes = require('./generation');
const imagesRoutes = require('./images');
const publishingRoutes = require('./publishing');
const legacyPublishingRoutes = require('./legacy-publishing');
const outputsRoutes = require('./outputs');

module.exports = function (supabase) {
    const router = express.Router();

    // Phase 44: gate every sub-router with the module-access check.
    router.use(createModuleAccessMiddleware(supabase));

    // Mount in source-file order.
    router.use(preflightRoutes(supabase));
    router.use(profileRoutes(supabase));
    router.use(pillarsRoutes(supabase));
    router.use(visibilityRoutes(supabase));
    router.use(calendarRoutes(supabase));
    router.use(generationRoutes(supabase));
    router.use(imagesRoutes(supabase));
    router.use(publishingRoutes(supabase));
    router.use(legacyPublishingRoutes(supabase));
    router.use(outputsRoutes(supabase));

    return router;
};
