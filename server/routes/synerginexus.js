/**
 * Insight 360 - SynergiNexus API Routes
 * Phase 3.7 & 3.8: Governance Engine & Conflict Resolution
 *
 * Provides endpoints for DIGM configuration, values management,
 * principles, and conflict resolution
 */

const express = require('express');
const crypto = require('crypto');

module.exports = function(supabase) {
    const router = express.Router();

    // ==========================================
    // DIGM CONFIGURATION
    // ==========================================

    /**
     * GET /api/synerginexus/digm
     * Get all DIGM configuration
     */
    router.get('/digm', async (req, res) => {
        try {
            const { layer } = req.query;

            let query = supabase
                .from('digm_config')
                .select('*')
                .eq('is_active', true);

            if (layer) {
                query = query.eq('layer', layer);
            }

            const { data, error } = await query.order('layer').order('config_key');

            if (error) throw error;

            // Group by layer
            const grouped = {
                identity: [],
                cognitive: [],
                voice: [],
                adaptation: []
            };

            (data || []).forEach(config => {
                if (grouped[config.layer]) {
                    grouped[config.layer].push(config);
                }
            });

            res.json({
                success: true,
                data: layer ? grouped[layer] || [] : grouped
            });
        } catch (error) {
            console.error('Error getting DIGM config:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/synerginexus/digm/:layer/:key
     * Get specific DIGM configuration
     */
    router.get('/digm/:layer/:key', async (req, res) => {
        try {
            const { layer, key } = req.params;

            const { data, error } = await supabase
                .from('digm_config')
                .select('*')
                .eq('layer', layer)
                .eq('config_key', key)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (!data) {
                return res.status(404).json({
                    success: false,
                    error: 'Configuration not found'
                });
            }

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error getting DIGM config:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/synerginexus/digm/:layer/:key
     * Update DIGM configuration
     */
    router.put('/digm/:layer/:key', async (req, res) => {
        try {
            const { layer, key } = req.params;
            const { config_value, is_active } = req.body;

            const validLayers = ['identity', 'cognitive', 'voice', 'adaptation'];
            if (!validLayers.includes(layer)) {
                return res.status(400).json({
                    success: false,
                    error: `Layer must be one of: ${validLayers.join(', ')}`
                });
            }

            const updates = { updated_at: new Date().toISOString() };
            if (config_value !== undefined) updates.config_value = config_value;
            if (is_active !== undefined) updates.is_active = is_active;

            const { data, error } = await supabase
                .from('digm_config')
                .update(updates)
                .eq('layer', layer)
                .eq('config_key', key)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating DIGM config:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/synerginexus/digm
     * Create new DIGM configuration
     */
    router.post('/digm', async (req, res) => {
        try {
            const { layer, config_key, config_value } = req.body;

            if (!layer || !config_key || !config_value) {
                return res.status(400).json({
                    success: false,
                    error: 'Layer, config_key, and config_value are required'
                });
            }

            const { data, error } = await supabase
                .from('digm_config')
                .insert({
                    id: crypto.randomUUID(),
                    layer,
                    config_key,
                    config_value,
                    is_active: true
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    return res.status(409).json({
                        success: false,
                        error: 'Configuration for this layer/key already exists'
                    });
                }
                throw error;
            }

            res.status(201).json({ success: true, data });
        } catch (error) {
            console.error('Error creating DIGM config:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/synerginexus/digm/prompt
     * Get combined DIGM prompt injection text
     */
    router.get('/digm/prompt', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('digm_config')
                .select('layer, config_key, config_value')
                .eq('is_active', true)
                .order('layer');

            if (error) throw error;

            // Extract and combine prompt injections
            const prompts = [];
            const layerOrder = ['identity', 'cognitive', 'voice', 'adaptation'];

            layerOrder.forEach(layer => {
                const layerConfigs = (data || []).filter(c => c.layer === layer);
                layerConfigs.forEach(config => {
                    if (config.config_value?.prompt_injection) {
                        prompts.push(config.config_value.prompt_injection);
                    }
                });
            });

            res.json({
                success: true,
                data: {
                    combined_prompt: prompts.join('\n\n'),
                    prompts_by_layer: layerOrder.reduce((acc, layer) => {
                        acc[layer] = (data || [])
                            .filter(c => c.layer === layer && c.config_value?.prompt_injection)
                            .map(c => c.config_value.prompt_injection);
                        return acc;
                    }, {})
                }
            });
        } catch (error) {
            console.error('Error getting DIGM prompt:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ==========================================
    // GOVERNANCE VALUES
    // ==========================================

    /**
     * GET /api/synerginexus/values
     * List all governance values
     */
    router.get('/values', async (req, res) => {
        try {
            const { include_inactive = 'false', non_negotiable_only = 'false' } = req.query;

            let query = supabase
                .from('governance_values')
                .select('*');

            if (include_inactive !== 'true') {
                query = query.eq('is_active', true);
            }

            if (non_negotiable_only === 'true') {
                query = query.eq('is_non_negotiable', true);
            }

            const { data, error } = await query.order('is_non_negotiable', { ascending: false }).order('name');

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing values:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/synerginexus/values/:id
     * Get single value with its principles
     */
    router.get('/values/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data: value, error } = await supabase
                .from('governance_values')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            if (!value) {
                return res.status(404).json({
                    success: false,
                    error: 'Value not found'
                });
            }

            // Get associated principles
            const { data: principles } = await supabase
                .from('governance_principles')
                .select('*')
                .eq('value_id', id)
                .eq('is_active', true);

            // Get conflict count
            const { count: conflictCount } = await supabase
                .from('governance_conflicts')
                .select('*', { count: 'exact', head: true })
                .contains('values_involved', [id]);

            res.json({
                success: true,
                data: {
                    ...value,
                    principles: principles || [],
                    conflict_count: conflictCount || 0
                }
            });
        } catch (error) {
            console.error('Error getting value:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/synerginexus/values
     * Create new governance value
     */
    router.post('/values', async (req, res) => {
        try {
            const { name, plain_meaning, why_it_matters, is_non_negotiable = false } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Name is required'
                });
            }

            const { data, error } = await supabase
                .from('governance_values')
                .insert({
                    id: crypto.randomUUID(),
                    name,
                    plain_meaning,
                    why_it_matters,
                    is_non_negotiable,
                    is_active: true
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    return res.status(409).json({
                        success: false,
                        error: 'A value with this name already exists'
                    });
                }
                throw error;
            }

            res.status(201).json({ success: true, data });
        } catch (error) {
            console.error('Error creating value:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/synerginexus/values/:id
     * Update governance value
     */
    router.put('/values/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, plain_meaning, why_it_matters, is_non_negotiable, is_active } = req.body;

            const updates = { updated_at: new Date().toISOString() };
            if (name !== undefined) updates.name = name;
            if (plain_meaning !== undefined) updates.plain_meaning = plain_meaning;
            if (why_it_matters !== undefined) updates.why_it_matters = why_it_matters;
            if (is_non_negotiable !== undefined) updates.is_non_negotiable = is_non_negotiable;
            if (is_active !== undefined) updates.is_active = is_active;

            const { data, error } = await supabase
                .from('governance_values')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating value:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ==========================================
    // GOVERNANCE PRINCIPLES
    // ==========================================

    /**
     * GET /api/synerginexus/principles
     * List all principles
     */
    router.get('/principles', async (req, res) => {
        try {
            const { value_id, constraint_type, digm_touchpoint } = req.query;

            let query = supabase
                .from('governance_principles')
                .select(`
                    *,
                    value:value_id(id, name, is_non_negotiable)
                `)
                .eq('is_active', true);

            if (value_id) {
                query = query.eq('value_id', value_id);
            }

            if (constraint_type) {
                query = query.eq('constraint_type', constraint_type);
            }

            if (digm_touchpoint) {
                query = query.eq('digm_touchpoint', digm_touchpoint);
            }

            const { data, error } = await query.order('constraint_type').order('statement');

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error listing principles:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/synerginexus/principles
     * Create new principle
     */
    router.post('/principles', async (req, res) => {
        try {
            const { value_id, statement, constraint_type, applies_when, digm_touchpoint } = req.body;

            if (!value_id || !statement || !constraint_type) {
                return res.status(400).json({
                    success: false,
                    error: 'value_id, statement, and constraint_type are required'
                });
            }

            const validTypes = ['prohibition', 'requirement', 'disclosure', 'boundary'];
            if (!validTypes.includes(constraint_type)) {
                return res.status(400).json({
                    success: false,
                    error: `constraint_type must be one of: ${validTypes.join(', ')}`
                });
            }

            const validTouchpoints = ['context', 'decomposition', 'reasoning', 'alternatives', 'synthesis', null];
            if (digm_touchpoint && !validTouchpoints.includes(digm_touchpoint)) {
                return res.status(400).json({
                    success: false,
                    error: `digm_touchpoint must be one of: ${validTouchpoints.filter(Boolean).join(', ')}`
                });
            }

            const { data, error } = await supabase
                .from('governance_principles')
                .insert({
                    id: crypto.randomUUID(),
                    value_id,
                    statement,
                    constraint_type,
                    applies_when: applies_when || null,
                    digm_touchpoint: digm_touchpoint || null,
                    is_active: true
                })
                .select(`
                    *,
                    value:value_id(id, name)
                `)
                .single();

            if (error) throw error;

            res.status(201).json({ success: true, data });
        } catch (error) {
            console.error('Error creating principle:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/synerginexus/principles/:id
     * Update principle
     */
    router.put('/principles/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = { ...req.body };
            delete updates.id;
            delete updates.created_at;

            const { data, error } = await supabase
                .from('governance_principles')
                .update(updates)
                .eq('id', id)
                .select(`
                    *,
                    value:value_id(id, name)
                `)
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating principle:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * DELETE /api/synerginexus/principles/:id
     * Delete principle
     */
    router.delete('/principles/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('governance_principles')
                .update({ is_active: false })
                .eq('id', id);

            if (error) throw error;

            res.json({ success: true, message: 'Principle deactivated' });
        } catch (error) {
            console.error('Error deleting principle:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ==========================================
    // CONFLICTS (Phase 3.8)
    // ==========================================

    /**
     * GET /api/synerginexus/conflicts
     * List conflicts with filtering
     */
    router.get('/conflicts', async (req, res) => {
        try {
            const {
                status,
                severity,
                agent_id,
                sort = 'created_at',
                order = 'desc',
                limit = 50,
                offset = 0
            } = req.query;

            let query = supabase
                .from('governance_conflicts')
                .select(`
                    *,
                    agent:agent_id(id, name),
                    resolver:resolved_by(id, email, display_name)
                `, { count: 'exact' });

            if (status) {
                query = query.eq('status', status);
            }

            if (severity) {
                query = query.eq('severity', severity);
            }

            if (agent_id) {
                query = query.eq('agent_id', agent_id);
            }

            query = query
                .order(sort, { ascending: order === 'asc' })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            const { data, error, count } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data: data || [],
                pagination: {
                    total: count,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            });
        } catch (error) {
            console.error('Error listing conflicts:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/synerginexus/conflicts/stats
     * Get conflict statistics
     */
    router.get('/conflicts/stats', async (req, res) => {
        try {
            const { data: all, error } = await supabase
                .from('governance_conflicts')
                .select('status, severity');

            if (error) throw error;

            const stats = {
                total: (all || []).length,
                by_status: { pending: 0, escalated: 0, resolved: 0, dismissed: 0 },
                by_severity: { low: 0, medium: 0, high: 0, critical: 0 }
            };

            (all || []).forEach(c => {
                if (stats.by_status.hasOwnProperty(c.status)) {
                    stats.by_status[c.status]++;
                }
                if (stats.by_severity.hasOwnProperty(c.severity)) {
                    stats.by_severity[c.severity]++;
                }
            });

            res.json({ success: true, data: stats });
        } catch (error) {
            console.error('Error getting conflict stats:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/synerginexus/conflicts/:id
     * Get single conflict with details
     */
    router.get('/conflicts/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('governance_conflicts')
                .select(`
                    *,
                    agent:agent_id(id, name, description),
                    conversation:conversation_id(id, title),
                    resolver:resolved_by(id, email, display_name)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;

            if (!data) {
                return res.status(404).json({
                    success: false,
                    error: 'Conflict not found'
                });
            }

            // Get involved values
            if (data.values_involved && data.values_involved.length > 0) {
                const { data: values } = await supabase
                    .from('governance_values')
                    .select('id, name, is_non_negotiable')
                    .in('id', data.values_involved);

                data.values = values || [];
            } else {
                data.values = [];
            }

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error getting conflict:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/synerginexus/conflicts
     * Log new conflict
     */
    router.post('/conflicts', async (req, res) => {
        try {
            const {
                conversation_id,
                agent_id,
                conflict_description,
                values_involved = [],
                severity = 'low'
            } = req.body;

            if (!conflict_description) {
                return res.status(400).json({
                    success: false,
                    error: 'conflict_description is required'
                });
            }

            const validSeverities = ['low', 'medium', 'high', 'critical'];
            if (!validSeverities.includes(severity)) {
                return res.status(400).json({
                    success: false,
                    error: `severity must be one of: ${validSeverities.join(', ')}`
                });
            }

            const { data, error } = await supabase
                .from('governance_conflicts')
                .insert({
                    id: crypto.randomUUID(),
                    conversation_id: conversation_id || null,
                    agent_id: agent_id || null,
                    conflict_description,
                    values_involved,
                    severity,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({ success: true, data });
        } catch (error) {
            console.error('Error creating conflict:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/synerginexus/conflicts/:id
     * Update/resolve conflict
     */
    router.put('/conflicts/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { status, resolution_notes, resolved_by } = req.body;

            const updates = {};

            if (status) {
                const validStatuses = ['pending', 'escalated', 'resolved', 'dismissed'];
                if (!validStatuses.includes(status)) {
                    return res.status(400).json({
                        success: false,
                        error: `status must be one of: ${validStatuses.join(', ')}`
                    });
                }
                updates.status = status;

                if (status === 'resolved' || status === 'dismissed') {
                    updates.resolved_at = new Date().toISOString();
                    if (resolved_by) updates.resolved_by = resolved_by;
                }
            }

            if (resolution_notes !== undefined) {
                updates.resolution_notes = resolution_notes;
            }

            const { data, error } = await supabase
                .from('governance_conflicts')
                .update(updates)
                .eq('id', id)
                .select(`
                    *,
                    agent:agent_id(id, name),
                    resolver:resolved_by(id, email, display_name)
                `)
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating conflict:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ==========================================
    // ESCALATION RULES
    // ==========================================

    /**
     * GET /api/synerginexus/escalation-rules
     * Get escalation rules
     */
    router.get('/escalation-rules', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('escalation_rules')
                .select('*')
                .eq('is_active', true)
                .order('severity');

            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Error getting escalation rules:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * PUT /api/synerginexus/escalation-rules/:severity
     * Update escalation rule
     */
    router.put('/escalation-rules/:severity', async (req, res) => {
        try {
            const { severity } = req.params;
            const { resolver_level, auto_escalate_after_hours, notification_channels } = req.body;

            const updates = {};
            if (resolver_level) updates.resolver_level = resolver_level;
            if (auto_escalate_after_hours !== undefined) updates.auto_escalate_after_hours = auto_escalate_after_hours;
            if (notification_channels) updates.notification_channels = notification_channels;

            const { data, error } = await supabase
                .from('escalation_rules')
                .update(updates)
                .eq('severity', severity)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (error) {
            console.error('Error updating escalation rule:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ==========================================
    // SUMMARY DASHBOARD
    // ==========================================

    /**
     * GET /api/synerginexus/dashboard
     * Get SynergiNexus dashboard summary
     */
    router.get('/dashboard', async (req, res) => {
        try {
            // Get counts
            const [digmResult, valuesResult, principlesResult, conflictsResult] = await Promise.all([
                supabase.from('digm_config').select('layer', { count: 'exact' }).eq('is_active', true),
                supabase.from('governance_values').select('is_non_negotiable', { count: 'exact' }).eq('is_active', true),
                supabase.from('governance_principles').select('constraint_type', { count: 'exact' }).eq('is_active', true),
                supabase.from('governance_conflicts').select('status, severity')
            ]);

            // Calculate stats
            const digmByLayer = {};
            (digmResult.data || []).forEach(d => {
                digmByLayer[d.layer] = (digmByLayer[d.layer] || 0) + 1;
            });

            const valuesStats = {
                total: (valuesResult.data || []).length,
                non_negotiable: (valuesResult.data || []).filter(v => v.is_non_negotiable).length
            };

            const principlesByType = {};
            (principlesResult.data || []).forEach(p => {
                principlesByType[p.constraint_type] = (principlesByType[p.constraint_type] || 0) + 1;
            });

            const conflictStats = {
                total: (conflictsResult.data || []).length,
                pending: (conflictsResult.data || []).filter(c => c.status === 'pending').length,
                critical: (conflictsResult.data || []).filter(c => c.severity === 'critical').length
            };

            res.json({
                success: true,
                data: {
                    digm: {
                        total_configs: digmResult.count || 0,
                        by_layer: digmByLayer
                    },
                    values: valuesStats,
                    principles: {
                        total: principlesResult.count || 0,
                        by_type: principlesByType
                    },
                    conflicts: conflictStats
                }
            });
        } catch (error) {
            console.error('Error getting dashboard:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
