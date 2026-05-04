/**
 * Platform Admin — Admin Verification.
 *
 * requirePlatformAdmin is applied by the coordinator. requireAdminWrite is per-route.
 */

const express = require('express');

module.exports = function (_supabase, _requireAdminWrite) {
    const router = express.Router();


    // ============================================
    // ADMIN VERIFICATION
    // ============================================

    /**
     * GET /api/platform/admin/verify
     * Lightweight check — if this returns 200, the user is a platform admin.
     * The requirePlatformAdmin middleware (applied to all routes) handles the 401/403.
     */
    router.get('/admin/verify', (req, res) => {
        res.json({ success: true, role: req.platformAdminRole });
    });

    return router;
};
