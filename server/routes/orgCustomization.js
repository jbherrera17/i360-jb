/**
 * Organization Customization API Routes
 * Manages module configs, branding, prompts, and report templates per organization
 */

const express = require('express');

module.exports = function(supabase) {
    const router = express.Router();

    /**
     * Middleware: Check org membership and admin role
     */
    async function requireOrgAdmin(req, res, next) {
        const userId = req.userId;
        const orgId = req.params.orgId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        if (!orgId) {
            return res.status(400).json({
                success: false,
                error: 'Organization ID required'
            });
        }

        const { data: membership, error } = await supabase
            .from('organization_members')
            .select('role')
            .eq('org_id', orgId)
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (error || !membership) {
            return res.status(403).json({
                success: false,
                error: 'Not a member of this organization'
            });
        }

        if (!['owner', 'admin'].includes(membership.role)) {
            return res.status(403).json({
                success: false,
                error: 'Admin privileges required'
            });
        }

        req.orgRole = membership.role;
        next();
    }

    /**
     * Middleware: Check org membership (any role)
     */
    async function requireOrgMember(req, res, next) {
        const userId = req.userId;
        const orgId = req.params.orgId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        if (!orgId) {
            return res.status(400).json({
                success: false,
                error: 'Organization ID required'
            });
        }

        const { data: membership, error } = await supabase
            .from('organization_members')
            .select('role')
            .eq('org_id', orgId)
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (error || !membership) {
            // Allow platform admins to access any org
            const { data: isAdmin } = await supabase
                .rpc('is_platform_admin', { p_user_id: userId });
            if (!isAdmin) {
                return res.status(403).json({
                    success: false,
                    error: 'Not a member of this organization'
                });
            }
            req.orgRole = 'platform_admin';
        } else {
            req.orgRole = membership.role;
        }

        next();
    }

    // ==========================================
    // MODULE CONFIGURATION ENDPOINTS
    // ==========================================

    /**
     * GET /api/org-customization/:orgId/modules
     * Get all module configurations for an organization
     */
    router.get('/:orgId/modules', requireOrgMember, async (req, res) => {
        try {
            const { orgId } = req.params;
            const { module_type } = req.query;

            let query = supabase
                .from('org_module_configs')
                .select('*')
                .eq('org_id', orgId)
                .order('display_order', { ascending: true });

            if (module_type) {
                query = query.eq('module_type', module_type);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error fetching module configs:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/org-customization/:orgId/modules/:moduleType/:moduleNumber
     * Get a specific module configuration
     */
    router.get('/:orgId/modules/:moduleType/:moduleNumber', requireOrgMember, async (req, res) => {
        try {
            const { orgId, moduleType, moduleNumber } = req.params;

            const { data, error } = await supabase
                .from('org_module_configs')
                .select('*')
                .eq('org_id', orgId)
                .eq('module_type', moduleType)
                .eq('module_number', parseInt(moduleNumber))
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            res.json({
                success: true,
                data: data || null
            });
        } catch (error) {
            console.error('Error fetching module config:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/org-customization/:orgId/modules/:moduleType/:moduleNumber
     * Update a module configuration
     */
    router.put('/:orgId/modules/:moduleType/:moduleNumber', requireOrgAdmin, async (req, res) => {
        try {
            const { orgId, moduleType, moduleNumber } = req.params;
            const userId = req.userId;
            const {
                custom_name,
                custom_description,
                custom_icon,
                custom_agents,
                agent_order,
                custom_prompts,
                is_enabled,
                is_required,
                display_order,
                time_estimate_minutes,
                skip_conditions
            } = req.body;

            const { data, error } = await supabase
                .from('org_module_configs')
                .upsert({
                    org_id: orgId,
                    module_type: moduleType,
                    module_number: parseInt(moduleNumber),
                    custom_name,
                    custom_description,
                    custom_icon,
                    custom_agents,
                    agent_order,
                    custom_prompts,
                    is_enabled,
                    is_required,
                    display_order,
                    time_estimate_minutes,
                    skip_conditions,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'org_id,module_type,module_number'
                })
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error updating module config:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/org-customization/:orgId/modules
     * Bulk update module configurations
     */
    router.put('/:orgId/modules', requireOrgAdmin, async (req, res) => {
        try {
            const { orgId } = req.params;
            const { modules } = req.body;

            if (!Array.isArray(modules)) {
                return res.status(400).json({ success: false, error: 'modules must be an array' });
            }

            // Map frontend module_key to DB module_type + module_number
            const keyMap = {
                'align_120': { module_type: 'align120', module_number: null },
                'strategy_120': { module_type: 'strategy120', module_number: null },
                'execute_120': { module_type: 'execute120', module_number: null },
                'ai_maturity': { module_type: 'align120', module_number: 1 },
                'team_readiness': { module_type: 'align120', module_number: 3 },
                'risk_assessment': { module_type: 'align120', module_number: 5 }
            };

            const results = [];
            for (const mod of modules) {
                const mapping = keyMap[mod.module_key];
                if (!mapping) continue; // Skip unknown keys

                const upsertData = {
                    org_id: orgId,
                    module_type: mapping.module_type,
                    module_number: mapping.module_number,
                    is_enabled: mod.is_enabled,
                    updated_at: new Date().toISOString()
                };
                if (mod.custom_name) upsertData.custom_name = mod.custom_name;
                if (mod.custom_description) upsertData.custom_description = mod.custom_description;
                if (mod.system_prompt_override) upsertData.custom_prompts = { system: mod.system_prompt_override };

                const { data, error } = await supabase
                    .from('org_module_configs')
                    .upsert(upsertData, { onConflict: 'org_id,module_type,module_number' })
                    .select()
                    .single();

                if (error) throw error;
                results.push(data);
            }

            res.json({ success: true, data: results });
        } catch (error) {
            console.error('Error bulk updating module configs:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ==========================================
    // BRANDING ENDPOINTS
    // ==========================================

    /**
     * GET /api/org-customization/:orgId/branding
     * Get organization branding settings
     */
    router.get('/:orgId/branding', requireOrgMember, async (req, res) => {
        try {
            const { orgId } = req.params;

            const { data, error } = await supabase
                .from('org_branding')
                .select('*')
                .eq('org_id', orgId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            // If no branding row exists yet, create one seeded from organizations.settings
            if (!data) {
                // Pull any existing branding from organizations.settings (backward compat)
                const { data: org } = await supabase
                    .from('organizations')
                    .select('settings')
                    .eq('id', orgId)
                    .single();
                const s = org?.settings || {};

                const { data: newRow } = await supabase
                    .from('org_branding')
                    .insert({
                        org_id: orgId,
                        primary_color: s.primary_color || '#6366f1',
                        secondary_color: '#4f46e5',
                        accent_color: '#22c55e',
                        text_color: '#1f2937',
                        background_color: '#ffffff',
                        sidebar_color: '#f9fafb',
                        heading_font: 'Inter',
                        body_font: 'Inter',
                        font_size_base: '16px',
                        logo_url: s.logo_url || null
                    })
                    .select()
                    .single();

                return res.json({
                    success: true,
                    data: newRow || {
                        primary_color: s.primary_color || '#6366f1',
                        secondary_color: '#4f46e5',
                        accent_color: '#22c55e',
                        text_color: '#1f2937',
                        background_color: '#ffffff',
                        sidebar_color: '#f9fafb',
                        heading_font: 'Inter',
                        body_font: 'Inter',
                        font_size_base: '16px',
                        logo_url: s.logo_url || null
                    }
                });
            }

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error fetching branding:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/org-customization/:orgId/branding
     * Update organization branding settings
     */
    router.put('/:orgId/branding', requireOrgAdmin, async (req, res) => {
        try {
            const { orgId } = req.params;
            const userId = req.userId;
            const brandingData = { ...req.body };  // Clone to avoid mutation issues

            // Remove fields that shouldn't be updated directly
            delete brandingData.id;
            delete brandingData.org_id;
            delete brandingData.created_at;

            // Validation: color fields must be valid hex
            const colorFields = ['primary_color', 'secondary_color', 'accent_color', 'text_color', 'background_color', 'sidebar_color'];
            const hexRegex = /^#[0-9a-fA-F]{6}$/;
            for (const field of colorFields) {
                if (brandingData[field] && !hexRegex.test(brandingData[field])) {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid color value for ${field}. Must be a hex color like #6366f1`
                    });
                }
            }

            // Validation: URL fields must be valid URLs or empty
            const urlFields = ['logo_url', 'logo_dark_url', 'favicon_url', 'ai_assistant_avatar_url'];
            for (const field of urlFields) {
                if (brandingData[field] && brandingData[field].trim()) {
                    try {
                        new URL(brandingData[field]);
                    } catch {
                        return res.status(400).json({
                            success: false,
                            error: `Invalid URL for ${field}`
                        });
                    }
                }
            }

            // Validation: font fields must be from allowed list
            const allowedFonts = ['Inter', 'Source Sans 3', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Nunito', 'Raleway', 'Orbitron'];
            for (const field of ['heading_font', 'body_font']) {
                if (brandingData[field] && !allowedFonts.includes(brandingData[field])) {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid font: ${brandingData[field]}. Allowed: ${allowedFonts.join(', ')}`
                    });
                }
            }

            // Tier enforcement: strip fields if org doesn't have the required feature
            // Platform tier has full access and skips enforcement
            const { data: org } = await supabase
                .from('organizations')
                .select('subscription_tier')
                .eq('id', orgId)
                .single();

            if (org?.subscription_tier && org.subscription_tier !== 'platform') {
                const { data: tierData } = await supabase
                    .from('subscription_tiers')
                    .select('features')
                    .eq('id', org.subscription_tier)
                    .single();

                const features = tierData?.features || {};

                // white_label fields require white_label feature
                if (!features.white_label) {
                    delete brandingData.ai_assistant_name;
                    delete brandingData.ai_assistant_avatar_url;
                    delete brandingData.report_header_html;
                    delete brandingData.report_footer_html;
                    delete brandingData.report_css;
                    delete brandingData.report_cover_template;
                    delete brandingData.email_from_name;
                    delete brandingData.email_from_address;
                    delete brandingData.email_signature_html;
                    delete brandingData.email_header_html;
                    delete brandingData.email_footer_html;
                    delete brandingData.portal_welcome_message;
                    delete brandingData.portal_custom_css;
                }

                // custom_branding fields require custom_branding feature
                if (!features.custom_branding) {
                    delete brandingData.app_name;
                    delete brandingData.app_tagline;
                    delete brandingData.logo_url;
                    delete brandingData.logo_dark_url;
                    delete brandingData.favicon_url;
                    delete brandingData.primary_color;
                    delete brandingData.secondary_color;
                    delete brandingData.accent_color;
                    delete brandingData.sidebar_color;
                    delete brandingData.heading_font;
                    delete brandingData.body_font;
                    delete brandingData.font_size_base;
                }
            }

            // Build update payload
            const updatePayload = {
                ...brandingData,
                updated_by: userId,
                updated_at: new Date().toISOString()
            };
            // Use explicit update (not upsert) — row is guaranteed to exist from GET auto-create
            const { data, error } = await supabase
                .from('org_branding')
                .update(updatePayload)
                .eq('org_id', orgId)
                .select()
                .single();

            if (error) throw error;

            // Sync primary_color and logo_url back to organizations.settings for backward compat
            if (brandingData.primary_color || brandingData.logo_url) {
                const { data: currentOrg } = await supabase
                    .from('organizations')
                    .select('settings')
                    .eq('id', orgId)
                    .single();

                const settings = currentOrg?.settings || {};
                if (brandingData.primary_color) settings.primary_color = brandingData.primary_color;
                if (brandingData.logo_url) settings.logo_url = brandingData.logo_url;

                await supabase
                    .from('organizations')
                    .update({ settings, updated_at: new Date().toISOString() })
                    .eq('id', orgId);
            }

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error updating branding:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // PROMPT TEMPLATE ENDPOINTS
    // ==========================================

    /**
     * GET /api/org-customization/:orgId/prompts
     * List prompt templates for an organization
     */
    router.get('/:orgId/prompts', requireOrgMember, async (req, res) => {
        try {
            const { orgId } = req.params;
            const { category, active_only } = req.query;

            let query = supabase
                .from('org_prompt_templates')
                .select('*')
                .eq('org_id', orgId)
                .order('category')
                .order('name');

            if (category) {
                query = query.eq('category', category);
            }

            if (active_only === 'true') {
                query = query.eq('is_active', true);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error fetching prompts:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/org-customization/:orgId/prompts/:templateKey
     * Get a specific prompt template by key
     */
    router.get('/:orgId/prompts/:templateKey', requireOrgMember, async (req, res) => {
        try {
            const { orgId, templateKey } = req.params;

            const { data, error } = await supabase
                .from('org_prompt_templates')
                .select('*')
                .eq('org_id', orgId)
                .eq('template_key', templateKey)
                .eq('is_active', true)
                .order('version', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            res.json({
                success: true,
                data: data || null
            });
        } catch (error) {
            console.error('Error fetching prompt template:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/org-customization/:orgId/prompts
     * Create a new prompt template
     */
    router.post('/:orgId/prompts', requireOrgAdmin, async (req, res) => {
        try {
            const { orgId } = req.params;
            const userId = req.userId;
            const {
                name,
                template_key,
                category,
                description,
                prompt_text,
                variables,
                sample_values
            } = req.body;

            if (!name || !template_key || !category || !prompt_text) {
                return res.status(400).json({
                    success: false,
                    error: 'name, template_key, category, and prompt_text are required'
                });
            }

            // Check if template_key already exists
            const { data: existing } = await supabase
                .from('org_prompt_templates')
                .select('id, version')
                .eq('org_id', orgId)
                .eq('template_key', template_key)
                .eq('is_active', true)
                .single();

            let version = 1;
            let parent_id = null;

            if (existing) {
                // Deactivate old version and create new
                await supabase
                    .from('org_prompt_templates')
                    .update({ is_active: false })
                    .eq('id', existing.id);

                version = existing.version + 1;
                parent_id = existing.id;
            }

            const { data, error } = await supabase
                .from('org_prompt_templates')
                .insert({
                    org_id: orgId,
                    name,
                    template_key,
                    category,
                    description,
                    prompt_text,
                    variables: variables || [],
                    sample_values: sample_values || {},
                    version,
                    parent_id,
                    is_active: true,
                    created_by: userId
                })
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error creating prompt template:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/org-customization/:orgId/prompts/:id
     * Update a prompt template (creates new version)
     */
    router.put('/:orgId/prompts/:id', requireOrgAdmin, async (req, res) => {
        try {
            const { orgId, id } = req.params;
            const userId = req.userId;
            const updates = req.body;

            // Get existing template
            const { data: existing, error: fetchError } = await supabase
                .from('org_prompt_templates')
                .select('*')
                .eq('id', id)
                .eq('org_id', orgId)
                .single();

            if (fetchError) throw fetchError;

            // Deactivate old version
            await supabase
                .from('org_prompt_templates')
                .update({ is_active: false })
                .eq('id', id);

            // Create new version
            const { data, error } = await supabase
                .from('org_prompt_templates')
                .insert({
                    org_id: orgId,
                    name: updates.name || existing.name,
                    template_key: existing.template_key,
                    category: updates.category || existing.category,
                    description: updates.description || existing.description,
                    prompt_text: updates.prompt_text || existing.prompt_text,
                    variables: updates.variables || existing.variables,
                    sample_values: updates.sample_values || existing.sample_values,
                    version: existing.version + 1,
                    parent_id: id,
                    is_active: true,
                    created_by: userId
                })
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error updating prompt template:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/org-customization/:orgId/prompts/:id
     * Deactivate a prompt template
     */
    router.delete('/:orgId/prompts/:id', requireOrgAdmin, async (req, res) => {
        try {
            const { orgId, id } = req.params;

            const { error } = await supabase
                .from('org_prompt_templates')
                .update({ is_active: false })
                .eq('id', id)
                .eq('org_id', orgId);

            if (error) throw error;

            res.json({
                success: true,
                message: 'Prompt template deactivated'
            });
        } catch (error) {
            console.error('Error deleting prompt template:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // REPORT TEMPLATE ENDPOINTS
    // ==========================================

    /**
     * GET /api/org-customization/:orgId/report-templates
     * List report templates for an organization
     */
    router.get('/:orgId/report-templates', requireOrgMember, async (req, res) => {
        try {
            const { orgId } = req.params;
            const { report_type, active_only } = req.query;

            let query = supabase
                .from('org_report_templates')
                .select('*')
                .eq('org_id', orgId)
                .order('report_type')
                .order('name');

            if (report_type) {
                query = query.eq('report_type', report_type);
            }

            if (active_only === 'true') {
                query = query.eq('is_active', true);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error fetching report templates:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/org-customization/:orgId/report-templates/:id
     * Get a specific report template
     */
    router.get('/:orgId/report-templates/:id', requireOrgMember, async (req, res) => {
        try {
            const { orgId, id } = req.params;

            const { data, error } = await supabase
                .from('org_report_templates')
                .select('*')
                .eq('id', id)
                .eq('org_id', orgId)
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error fetching report template:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/org-customization/:orgId/report-templates
     * Create a new report template
     */
    router.post('/:orgId/report-templates', requireOrgAdmin, async (req, res) => {
        try {
            const { orgId } = req.params;
            const userId = req.userId;
            const {
                name,
                report_type,
                description,
                sections,
                styling,
                page_size,
                orientation,
                margins,
                header_template,
                footer_template,
                include_page_numbers,
                include_toc,
                formats_available,
                default_format,
                is_default
            } = req.body;

            if (!name || !report_type || !sections) {
                return res.status(400).json({
                    success: false,
                    error: 'name, report_type, and sections are required'
                });
            }

            // If setting as default, unset other defaults for this type
            if (is_default) {
                await supabase
                    .from('org_report_templates')
                    .update({ is_default: false })
                    .eq('org_id', orgId)
                    .eq('report_type', report_type);
            }

            const { data, error } = await supabase
                .from('org_report_templates')
                .insert({
                    org_id: orgId,
                    name,
                    report_type,
                    description,
                    sections,
                    styling: styling || {},
                    page_size: page_size || 'A4',
                    orientation: orientation || 'portrait',
                    margins: margins || { top: '1in', right: '1in', bottom: '1in', left: '1in' },
                    header_template,
                    footer_template,
                    include_page_numbers: include_page_numbers !== false,
                    include_toc: include_toc !== false,
                    formats_available: formats_available || ['json', 'html', 'pdf'],
                    default_format: default_format || 'pdf',
                    is_default: is_default || false,
                    is_active: true,
                    created_by: userId
                })
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error creating report template:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/org-customization/:orgId/report-templates/:id
     * Update a report template
     */
    router.put('/:orgId/report-templates/:id', requireOrgAdmin, async (req, res) => {
        try {
            const { orgId, id } = req.params;
            const updates = req.body;

            // Remove fields that shouldn't be updated
            delete updates.id;
            delete updates.org_id;
            delete updates.created_at;
            delete updates.created_by;

            // If setting as default, unset other defaults
            if (updates.is_default && updates.report_type) {
                await supabase
                    .from('org_report_templates')
                    .update({ is_default: false })
                    .eq('org_id', orgId)
                    .eq('report_type', updates.report_type)
                    .neq('id', id);
            }

            const { data, error } = await supabase
                .from('org_report_templates')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('org_id', orgId)
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                data
            });
        } catch (error) {
            console.error('Error updating report template:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/org-customization/:orgId/report-templates/:id
     * Deactivate a report template
     */
    router.delete('/:orgId/report-templates/:id', requireOrgAdmin, async (req, res) => {
        try {
            const { orgId, id } = req.params;

            const { error } = await supabase
                .from('org_report_templates')
                .update({ is_active: false })
                .eq('id', id)
                .eq('org_id', orgId);

            if (error) throw error;

            res.json({
                success: true,
                message: 'Report template deactivated'
            });
        } catch (error) {
            console.error('Error deleting report template:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ==========================================
    // COMBINED CUSTOMIZATION ENDPOINT
    // ==========================================

    /**
     * GET /api/org-customization/:orgId
     * Get all customization settings for an organization
     */
    router.get('/:orgId', requireOrgMember, async (req, res) => {
        try {
            const { orgId } = req.params;

            const [
                { data: modules },
                { data: branding },
                { data: prompts },
                { data: reportTemplates }
            ] = await Promise.all([
                supabase
                    .from('org_module_configs')
                    .select('*')
                    .eq('org_id', orgId)
                    .order('display_order'),
                supabase
                    .from('org_branding')
                    .select('*')
                    .eq('org_id', orgId)
                    .single(),
                supabase
                    .from('org_prompt_templates')
                    .select('id, name, template_key, category, is_active')
                    .eq('org_id', orgId)
                    .eq('is_active', true),
                supabase
                    .from('org_report_templates')
                    .select('id, name, report_type, is_default, is_active')
                    .eq('org_id', orgId)
                    .eq('is_active', true)
            ]);

            res.json({
                success: true,
                data: {
                    modules: modules || [],
                    branding: branding || {},
                    prompts: prompts || [],
                    report_templates: reportTemplates || []
                }
            });
        } catch (error) {
            console.error('Error fetching org customization:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
};
