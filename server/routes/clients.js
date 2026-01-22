/**
 * Clients API Routes
 * Manages clients (agency customers) within organizations
 */

const express = require('express');
const router = express.Router();

module.exports = function(supabase) {

    /**
     * Middleware to check organization membership
     */
    async function checkOrgMembership(req, res, next) {
        const userId = req.userId;
        const orgId = req.query.org_id || req.body.org_id || req.params.orgId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        if (!orgId) {
            return res.status(400).json({
                success: false,
                error: 'Organization ID is required'
            });
        }

        const { data: membership } = await supabase
            .from('organization_members')
            .select('role')
            .eq('org_id', orgId)
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (!membership) {
            return res.status(403).json({
                success: false,
                error: 'Not a member of this organization'
            });
        }

        req.orgId = orgId;
        req.orgRole = membership.role;
        next();
    }

    /**
     * GET /api/clients
     * List all clients for an organization
     * Query params: org_id, status, search
     */
    router.get('/', checkOrgMembership, async (req, res) => {
        try {
            const { status, search } = req.query;

            let query = supabase
                .from('clients')
                .select('*')
                .eq('org_id', req.orgId)
                .order('name', { ascending: true });

            if (status) {
                query = query.eq('status', status);
            }

            if (search) {
                query = query.or(`name.ilike.%${search}%,contact_email.ilike.%${search}%`);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error fetching clients:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/clients/:id
     * Get a single client
     */
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const { data: client, error } = await supabase
                .from('clients')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            if (!client) {
                return res.status(404).json({
                    success: false,
                    error: 'Client not found'
                });
            }

            // Check org membership
            const { data: membership } = await supabase
                .from('organization_members')
                .select('role')
                .eq('org_id', client.org_id)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (!membership) {
                return res.status(403).json({
                    success: false,
                    error: 'Not authorized to view this client'
                });
            }

            res.json({
                success: true,
                data: client
            });
        } catch (error) {
            console.error('Error fetching client:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/clients
     * Create a new client
     */
    router.post('/', checkOrgMembership, async (req, res) => {
        try {
            const { name, contact_email, contact_name, contact_phone, notes, settings, status } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Client name is required'
                });
            }

            // Only admin/owner/consultant can create clients
            if (!['owner', 'admin', 'consultant'].includes(req.orgRole)) {
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions to create clients'
                });
            }

            const { data, error } = await supabase
                .from('clients')
                .insert({
                    org_id: req.orgId,
                    name,
                    contact_email: contact_email || null,
                    contact_name: contact_name || null,
                    contact_phone: contact_phone || null,
                    notes: notes || null,
                    status: status || 'active',
                    settings: settings || {}
                })
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error creating client:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/clients/:id
     * Update a client
     */
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.userId;
            const { name, contact_email, contact_name, contact_phone, notes, status, settings } = req.body;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Get client to check org
            const { data: client } = await supabase
                .from('clients')
                .select('org_id')
                .eq('id', id)
                .single();

            if (!client) {
                return res.status(404).json({
                    success: false,
                    error: 'Client not found'
                });
            }

            // Check org membership and role
            const { data: membership } = await supabase
                .from('organization_members')
                .select('role')
                .eq('org_id', client.org_id)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (!membership || !['owner', 'admin', 'consultant'].includes(membership.role)) {
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions'
                });
            }

            const updates = {};
            if (name !== undefined) updates.name = name;
            if (contact_email !== undefined) updates.contact_email = contact_email;
            if (contact_name !== undefined) updates.contact_name = contact_name;
            if (contact_phone !== undefined) updates.contact_phone = contact_phone;
            if (notes !== undefined) updates.notes = notes;
            if (status !== undefined) updates.status = status;
            if (settings !== undefined) updates.settings = settings;
            updates.updated_at = new Date().toISOString();

            const { data, error } = await supabase
                .from('clients')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error updating client:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/clients/:id
     * Delete a client (soft delete - set status to archived)
     */
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.userId;
            const { permanent } = req.query;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Get client to check org
            const { data: client } = await supabase
                .from('clients')
                .select('org_id')
                .eq('id', id)
                .single();

            if (!client) {
                return res.status(404).json({
                    success: false,
                    error: 'Client not found'
                });
            }

            // Check org membership - only owner/admin can delete
            const { data: membership } = await supabase
                .from('organization_members')
                .select('role')
                .eq('org_id', client.org_id)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (!membership || !['owner', 'admin'].includes(membership.role)) {
                return res.status(403).json({
                    success: false,
                    error: 'Admin access required to delete clients'
                });
            }

            if (permanent === 'true') {
                // Hard delete - only owner can do this
                if (membership.role !== 'owner') {
                    return res.status(403).json({
                        success: false,
                        error: 'Owner access required for permanent deletion'
                    });
                }

                const { error } = await supabase
                    .from('clients')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                res.json({
                    success: true,
                    message: 'Client permanently deleted'
                });
            } else {
                // Soft delete - set status to archived
                const { error } = await supabase
                    .from('clients')
                    .update({ status: 'archived', updated_at: new Date().toISOString() })
                    .eq('id', id);

                if (error) throw error;

                res.json({
                    success: true,
                    message: 'Client archived'
                });
            }
        } catch (error) {
            console.error('Error deleting client:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/clients/:id/stats
     * Get client statistics
     */
    router.get('/:id/stats', async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Get client to check org
            const { data: client } = await supabase
                .from('clients')
                .select('org_id')
                .eq('id', id)
                .single();

            if (!client) {
                return res.status(404).json({
                    success: false,
                    error: 'Client not found'
                });
            }

            // Check org membership
            const { data: membership } = await supabase
                .from('organization_members')
                .select('role')
                .eq('org_id', client.org_id)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (!membership) {
                return res.status(403).json({
                    success: false,
                    error: 'Not authorized to view this client'
                });
            }

            // Get counts in parallel
            const [sessionsResult, profilesResult] = await Promise.all([
                supabase.from('align120_sessions').select('id', { count: 'exact', head: true }).eq('client_id', id),
                supabase.from('company_profiles').select('id', { count: 'exact', head: true }).eq('client_id', id)
            ]);

            res.json({
                success: true,
                data: {
                    align120_sessions: sessionsResult.count || 0,
                    company_profiles: profilesResult.count || 0
                }
            });
        } catch (error) {
            console.error('Error fetching client stats:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
};
