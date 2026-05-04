/**
 * Platform Admin API Routes — coordinator.
 *
 * Manages platform-level configuration for Synergi administrators.
 * All routes here are restricted to platform admins (super_admin, admin,
 * support roles). Write actions further require super_admin or admin.
 *
 * The original 3155-line platformAdmin.js was split by concern. This file
 * applies requirePlatformAdmin once at the parent level and mounts each
 * sub-router in the original-file order so Express first-match wins is
 * preserved (notably /users/suspended must precede /users/:id, but they
 * live in the same sub-router so the order is local to users.js).
 */

const express = require('express');
const createMiddlewares = require('./_shared');

const verifyRoutes = require('./verify');
const configRoutes = require('./config');
const tiersRoutes = require('./tiers');
const modulesRoutes = require('./modules');
const tierModulesAccessRoutes = require('./tier-modules-access');
const adminsRoutes = require('./admins');
const organizationsRoutes = require('./organizations');
const usersRoutes = require('./users');
const statsRoutes = require('./stats');
const addonPricingRoutes = require('./addon-pricing');
const testDataRoutes = require('./test-data');
const tierModulesMatrixRoutes = require('./tier-modules-matrix');
const pricingSyncRoutes = require('./pricing-sync');
const overridesRoutes = require('./overrides');

module.exports = function (supabase) {
    const router = express.Router();
    const { requirePlatformAdmin, requireAdminWrite } = createMiddlewares(supabase);

    // Gate every route in every sub-router.
    router.use(requirePlatformAdmin);

    // Mount in original-file source order to preserve Express match priority.
    router.use(verifyRoutes(supabase, requireAdminWrite));
    router.use(configRoutes(supabase, requireAdminWrite));
    router.use(tiersRoutes(supabase, requireAdminWrite));
    router.use(modulesRoutes(supabase, requireAdminWrite));
    router.use(tierModulesAccessRoutes(supabase, requireAdminWrite));
    router.use(adminsRoutes(supabase, requireAdminWrite));
    router.use(organizationsRoutes(supabase, requireAdminWrite));
    router.use(usersRoutes(supabase, requireAdminWrite));
    router.use(statsRoutes(supabase, requireAdminWrite));
    router.use(addonPricingRoutes(supabase, requireAdminWrite));
    router.use(testDataRoutes(supabase, requireAdminWrite));
    router.use(tierModulesMatrixRoutes(supabase, requireAdminWrite));
    router.use(pricingSyncRoutes(supabase, requireAdminWrite));
    router.use(overridesRoutes(supabase, requireAdminWrite));

    return router;
};
