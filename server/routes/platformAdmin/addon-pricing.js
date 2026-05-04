/**
 * Platform Admin — Module Add-on Pricing.
 *
 * requirePlatformAdmin is applied by the coordinator. requireAdminWrite is per-route.
 */

const express = require('express');

module.exports = function (supabase, requireAdminWrite) {
    const router = express.Router();

    // ============================================
    // MODULE ADD-ON PRICING MANAGEMENT
    // ============================================

    /**
     * PUT /api/platform/modules/:id/addon-pricing
     * Set or update addon pricing for a module
     */
    router.put('/modules/:id/addon-pricing', requireAdminWrite, async (req, res) => {
        try {
            const { id } = req.params;
            const { is_addon_purchasable, addon_price_monthly, addon_price_yearly, addon_description } = req.body;

            const updates = {};
            if (typeof is_addon_purchasable === 'boolean') updates.is_addon_purchasable = is_addon_purchasable;
            if (addon_price_monthly !== undefined) updates.addon_price_monthly = addon_price_monthly;
            if (addon_price_yearly !== undefined) updates.addon_price_yearly = addon_price_yearly;
            if (addon_description !== undefined) updates.addon_description = addon_description;

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ success: false, error: 'No fields to update' });
            }

            const { data, error } = await supabase
                .from('platform_modules')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating module addon pricing:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/platform/orgs/:orgId/addons
     * List an org's purchased add-on modules
     */
    router.get('/orgs/:orgId/addons', async (req, res) => {
        try {
            const { orgId } = req.params;

            const { data, error } = await supabase
                .from('org_module_purchases')
                .select(`
                    *,
                    module:platform_modules(id, name, icon, description)
                `)
                .eq('org_id', orgId)
                .order('purchased_at', { ascending: false });

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error fetching org addons:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/platform/orgs/:orgId/addons
     * Purchase an add-on module for an org
     */
    router.post('/orgs/:orgId/addons', requireAdminWrite, async (req, res) => {
        try {
            const { orgId } = req.params;
            const { module_id, billing_period } = req.body;

            if (!module_id) {
                return res.status(400).json({ success: false, error: 'module_id is required' });
            }

            // Verify module exists and is purchasable
            const { data: moduleData, error: moduleError } = await supabase
                .from('platform_modules')
                .select('id, name, is_addon_purchasable, addon_price_monthly, addon_price_yearly')
                .eq('id', module_id)
                .single();

            if (moduleError || !moduleData) {
                return res.status(404).json({ success: false, error: 'Module not found' });
            }

            if (!moduleData.is_addon_purchasable) {
                return res.status(400).json({ success: false, error: 'This module is not available as an add-on' });
            }

            const period = billing_period || 'monthly';
            const price = period === 'yearly' ? moduleData.addon_price_yearly : moduleData.addon_price_monthly;

            const { data, error } = await supabase
                .from('org_module_purchases')
                .upsert({
                    org_id: orgId,
                    module_id,
                    billing_period: period,
                    price_at_purchase: price,
                    status: 'active',
                    purchased_by: req.userId,
                    purchased_at: new Date().toISOString(),
                    cancelled_at: null
                }, { onConflict: 'org_id,module_id' })
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error purchasing addon:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/platform/orgs/:orgId/addons/:moduleId
     * Cancel an add-on module for an org
     */
    router.delete('/orgs/:orgId/addons/:moduleId', requireAdminWrite, async (req, res) => {
        try {
            const { orgId, moduleId } = req.params;

            const { data, error } = await supabase
                .from('org_module_purchases')
                .update({
                    status: 'cancelled',
                    cancelled_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('org_id', orgId)
                .eq('module_id', moduleId)
                .eq('status', 'active')
                .select()
                .single();

            if (error) throw error;

            if (!data) {
                return res.status(404).json({ success: false, error: 'Active addon not found' });
            }

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error cancelling addon:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });


    return router;
};
