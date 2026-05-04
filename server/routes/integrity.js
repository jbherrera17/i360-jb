/**
 * Integrity API Routes
 * System health monitoring, alerts, and incident tracking
 */

const express = require('express');

module.exports = function(supabase) {
const router = express.Router();

// ============================================================================
// SYSTEM HEALTH
// ============================================================================

/**
 * GET /api/integrity/health
 * Get overall system health status
 */
router.get('/health', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('integrity_system_health')
            .select('*');

        if (error) throw error;

        // Calculate overall health
        const criticalComponents = data.filter(c => c.is_critical);
        const unhealthyCount = criticalComponents.filter(c => c.status === 'unhealthy').length;
        const degradedCount = criticalComponents.filter(c => c.status === 'degraded').length;

        let overallStatus = 'healthy';
        if (unhealthyCount > 0) overallStatus = 'unhealthy';
        else if (degradedCount > 0) overallStatus = 'degraded';

        const overallScore = data.length > 0
            ? Math.round(data.reduce((sum, c) => sum + (c.health_score || 0), 0) / data.length)
            : 100;

        res.json({
            success: true,
            data: {
                overall_status: overallStatus,
                overall_score: overallScore,
                components: data,
                summary: {
                    total: data.length,
                    healthy: data.filter(c => c.status === 'healthy').length,
                    degraded: data.filter(c => c.status === 'degraded').length,
                    unhealthy: data.filter(c => c.status === 'unhealthy').length,
                    unknown: data.filter(c => c.status === 'unknown').length
                }
            }
        });
    } catch (error) {
        console.error('Error fetching system health:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * GET /api/integrity/components
 * List all monitored components
 */
router.get('/components', async (req, res) => {
    try {
        const { category, is_critical } = req.query;

        let query = supabase
            .from('integrity_components')
            .select(`
                *,
                status:integrity_component_status (
                    status, health_score, uptime_percentage,
                    last_check_at, status_changed_at, consecutive_failures
                )
            `)
            .eq('is_monitored', true)
            .order('is_critical', { ascending: false })
            .order('name', { ascending: true });

        if (category) {
            query = query.eq('category', category);
        }

        if (is_critical !== undefined) {
            query = query.eq('is_critical', is_critical === 'true');
        }

        const { data, error } = await query;

        if (error) throw error;

        // Flatten status
        const components = data.map(c => ({
            ...c,
            status: c.status?.[0]?.status || 'unknown',
            health_score: c.status?.[0]?.health_score || 0,
            uptime_percentage: c.status?.[0]?.uptime_percentage || 0,
            last_check_at: c.status?.[0]?.last_check_at,
            status_changed_at: c.status?.[0]?.status_changed_at,
            consecutive_failures: c.status?.[0]?.consecutive_failures || 0
        }));

        res.json({
            success: true,
            data: components
        });
    } catch (error) {
        console.error('Error fetching components:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/integrity/components/:componentKey
 * Get a specific component with metrics
 */
router.get('/components/:componentKey', async (req, res) => {
    try {
        const { componentKey } = req.params;

        const { data: component, error } = await supabase
            .from('integrity_components')
            .select(`
                *,
                status:integrity_component_status (*),
                metrics:integrity_metrics (*)
            `)
            .eq('component_key', componentKey)
            .single();

        if (error) throw error;

        // Get recent metric values
        if (component.metrics && component.metrics.length > 0) {
            for (const metric of component.metrics) {
                const { data: values } = await supabase
                    .from('integrity_metric_values')
                    .select('value, status, recorded_at')
                    .eq('metric_id', metric.id)
                    .order('recorded_at', { ascending: false })
                    .limit(24);

                metric.recent_values = values || [];
                metric.current_value = values?.[0]?.value;
                metric.current_status = values?.[0]?.status;
            }
        }

        res.json({
            success: true,
            data: {
                ...component,
                status: component.status?.[0] || null
            }
        });
    } catch (error) {
        console.error('Error fetching component:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/integrity/components/:componentKey/check
 * Record a health check for a component
 */
router.post('/components/:componentKey/check', async (req, res) => {
    try {
        const { componentKey } = req.params;
        const { status, health_score, message, metrics } = req.body;

        // Get component
        const { data: component, error: compError } = await supabase
            .from('integrity_components')
            .select('id')
            .eq('component_key', componentKey)
            .single();

        if (compError) throw compError;

        // Update status
        const statusUpdate = {
            status: status || 'healthy',
            health_score: health_score !== undefined ? health_score : 100,
            status_message: message,
            last_check_at: new Date().toISOString()
        };

        if (status === 'healthy') {
            statusUpdate.last_healthy_at = new Date().toISOString();
            statusUpdate.consecutive_failures = 0;
        } else if (status === 'unhealthy') {
            // Get current failures count
            const { data: currentStatus } = await supabase
                .from('integrity_component_status')
                .select('consecutive_failures')
                .eq('component_id', component.id)
                .single();

            statusUpdate.consecutive_failures = (currentStatus?.consecutive_failures || 0) + 1;
        }

        const { data: updatedStatus, error: statusError } = await supabase
            .from('integrity_component_status')
            .update(statusUpdate)
            .eq('component_id', component.id)
            .select()
            .single();

        if (statusError) throw statusError;

        // Record metrics if provided
        if (metrics && Array.isArray(metrics)) {
            for (const m of metrics) {
                // Get metric ID
                const { data: metric } = await supabase
                    .from('integrity_metrics')
                    .select('id, warning_threshold, critical_threshold, threshold_direction')
                    .eq('component_id', component.id)
                    .eq('metric_key', m.key)
                    .single();

                if (metric) {
                    // Determine status based on thresholds
                    let metricStatus = 'normal';
                    if (metric.threshold_direction === 'above') {
                        if (m.value >= metric.critical_threshold) metricStatus = 'critical';
                        else if (m.value >= metric.warning_threshold) metricStatus = 'warning';
                    } else {
                        if (m.value <= metric.critical_threshold) metricStatus = 'critical';
                        else if (m.value <= metric.warning_threshold) metricStatus = 'warning';
                    }

                    await supabase
                        .from('integrity_metric_values')
                        .insert({
                            metric_id: metric.id,
                            value: m.value,
                            status: metricStatus,
                            context: m.context || {}
                        });
                }
            }
        }

        res.json({
            success: true,
            data: updatedStatus
        });
    } catch (error) {
        console.error('Error recording health check:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// ALERTS
// ============================================================================

/**
 * GET /api/integrity/alerts
 * List alerts
 */
router.get('/alerts', async (req, res) => {
    try {
        const { status, severity, component_key, limit = 50 } = req.query;

        let query = supabase
            .from('integrity_alerts')
            .select(`
                *,
                component:integrity_components (component_key, name, icon, color),
                metric:integrity_metrics (metric_key, name, unit),
                acknowledged_by_user:users!acknowledged_by (id, email, display_name)
            `)
            .order('triggered_at', { ascending: false })
            .limit(limit);

        if (status) {
            query = query.eq('status', status);
        }

        if (severity) {
            query = query.eq('severity', severity);
        }

        if (component_key) {
            query = query.eq('component.component_key', component_key);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/integrity/alerts/active
 * Get active alerts count by severity
 */
router.get('/alerts/active', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('integrity_alerts')
            .select('severity')
            .eq('status', 'active');

        if (error) throw error;

        const summary = {
            total: data.length,
            critical: data.filter(a => a.severity === 'critical').length,
            error: data.filter(a => a.severity === 'error').length,
            warning: data.filter(a => a.severity === 'warning').length,
            info: data.filter(a => a.severity === 'info').length
        };

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Error fetching active alerts:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/integrity/alerts
 * Create a new alert
 */
router.post('/alerts', async (req, res) => {
    try {
        const {
            component_key,
            metric_key,
            alert_type,
            severity,
            message,
            threshold_value,
            actual_value
        } = req.body;

        // Get component ID
        let component_id = null;
        let metric_id = null;

        if (component_key) {
            const { data: component } = await supabase
                .from('integrity_components')
                .select('id')
                .eq('component_key', component_key)
                .single();
            component_id = component?.id;

            if (metric_key && component_id) {
                const { data: metric } = await supabase
                    .from('integrity_metrics')
                    .select('id')
                    .eq('component_id', component_id)
                    .eq('metric_key', metric_key)
                    .single();
                metric_id = metric?.id;
            }
        }

        const { data, error } = await supabase
            .from('integrity_alerts')
            .insert({
                component_id,
                metric_id,
                alert_type: alert_type || 'threshold',
                severity: severity || 'warning',
                message,
                threshold_value,
                actual_value,
                status: 'active'
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error creating alert:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/integrity/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.put('/alerts/:id/acknowledge', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        const { data, error } = await supabase
            .from('integrity_alerts')
            .update({
                status: 'acknowledged',
                acknowledged_by: user_id,
                acknowledged_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error acknowledging alert:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/integrity/alerts/:id/resolve
 * Resolve an alert
 */
router.put('/alerts/:id/resolve', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('integrity_alerts')
            .update({
                status: 'resolved',
                resolved_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error resolving alert:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// INCIDENTS
// ============================================================================

/**
 * GET /api/integrity/incidents
 * List incidents
 */
router.get('/incidents', async (req, res) => {
    try {
        const { status, severity, limit = 20 } = req.query;

        let query = supabase
            .from('integrity_incidents')
            .select(`
                *,
                component:integrity_components (component_key, name, icon, color),
                assigned_to_user:users!assigned_to (id, email, display_name),
                created_by_user:users!created_by (id, email, display_name)
            `)
            .order('started_at', { ascending: false })
            .limit(limit);

        if (status) {
            query = query.eq('status', status);
        }

        if (severity) {
            query = query.eq('severity', severity);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching incidents:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/integrity/incidents/active
 * Get active incidents
 */
router.get('/incidents/active', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('integrity_active_incidents')
            .select('*');

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching active incidents:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/integrity/incidents/:id
 * Get incident with updates
 */
router.get('/incidents/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: incident, error } = await supabase
            .from('integrity_incidents')
            .select(`
                *,
                component:integrity_components (component_key, name, icon, color),
                assigned_to_user:users!assigned_to (id, email, display_name),
                created_by_user:users!created_by (id, email, display_name),
                updates:integrity_incident_updates (
                    *,
                    author:users!created_by (id, email, display_name)
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: incident
        });
    } catch (error) {
        console.error('Error fetching incident:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/integrity/incidents
 * Create a new incident
 */
router.post('/incidents', async (req, res) => {
    try {
        const {
            component_key,
            title,
            description,
            severity,
            affected_components,
            impact_description,
            assigned_to,
            created_by
        } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                error: 'title is required'
            });
        }

        // Get component ID if provided
        let component_id = null;
        if (component_key) {
            const { data: component } = await supabase
                .from('integrity_components')
                .select('id')
                .eq('component_key', component_key)
                .single();
            component_id = component?.id;
        }

        const { data, error } = await supabase
            .from('integrity_incidents')
            .insert({
                component_id,
                title,
                description,
                severity: severity || 'medium',
                affected_components: affected_components || [],
                impact_description,
                assigned_to,
                created_by,
                status: 'investigating'
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error creating incident:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/integrity/incidents/:id
 * Update an incident
 */
router.put('/incidents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Handle status change
        if (updates.status === 'identified' && !updates.identified_at) {
            updates.identified_at = new Date().toISOString();
        } else if (updates.status === 'resolved' && !updates.resolved_at) {
            updates.resolved_at = new Date().toISOString();
        }

        delete updates.id;
        delete updates.created_at;
        delete updates.created_by;

        const { data, error } = await supabase
            .from('integrity_incidents')
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
        console.error('Error updating incident:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/integrity/incidents/:id/updates
 * Add an update to an incident
 */
router.post('/incidents/:id/updates', async (req, res) => {
    try {
        const { id } = req.params;
        const { content, update_type, new_status, created_by } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'content is required'
            });
        }

        const { data, error } = await supabase
            .from('integrity_incident_updates')
            .insert({
                incident_id: id,
                content,
                update_type: update_type || 'update',
                new_status,
                created_by
            })
            .select()
            .single();

        if (error) throw error;

        // Update incident status if new_status provided
        if (new_status) {
            await supabase
                .from('integrity_incidents')
                .update({ status: new_status })
                .eq('id', id);
        }

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error adding incident update:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

return router;
};
