/**
 * INSIGHT 360 - Align 120 Integration Service
 * Version: 1.0.0
 *
 * Orchestrates data flow from Align 120 modules to downstream systems:
 * - DIGM (Dynamic Integrity Governance Model)
 * - Strategy 120 (S2E - Strategy to Execution)
 * - Parthenon (OKR/Action Framework)
 * - Integrity Dashboard (Metrics & Alerts)
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID: uuidv4 } = require('crypto');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * Align120IntegrationService
 *
 * Syncs module outputs to downstream systems for a unified
 * data model across the Insight 360 platform.
 */
class Align120IntegrationService {
    /**
     * Sync Module 1 (AI Assessment) outputs
     * @param {string} sessionId - Session UUID
     * @param {Object} outputs - Module 1 outputs
     * @param {string} userId - User UUID
     */
    async syncModule1(sessionId, outputs, userId) {
        const syncResults = {
            integrity: null,
            strategy: null,
            errors: []
        };

        try {
            // Get or create company profile ID
            const companyProfileId = await this.getCompanyProfileId(sessionId);

            // 1. Risk Register → Integrity Dashboard (alerts)
            if (outputs.risk_register && Array.isArray(outputs.risk_register)) {
                try {
                    const alerts = outputs.risk_register
                        .filter(risk => risk.severity === 'High' || risk.severity === 'Critical')
                        .map(risk => ({
                            id: uuidv4(),
                            user_id: userId,
                            company_profile_id: companyProfileId,
                            alert_type: 'ai_risk',
                            severity: risk.severity?.toLowerCase() || 'medium',
                            title: risk.risk || risk.description,
                            description: risk.mitigation || 'Risk identified during AI assessment',
                            source: 'align120_module1',
                            source_id: sessionId,
                            status: 'active',
                            created_at: new Date().toISOString()
                        }));

                    if (alerts.length > 0) {
                        const { data, error } = await supabase
                            .from('align_integrity_alerts')
                            .upsert(alerts, { onConflict: 'source_id,alert_type' })
                            .select();

                        if (error) throw error;
                        syncResults.integrity = { alerts_created: data?.length || 0 };
                    }
                } catch (err) {
                    syncResults.errors.push({ target: 'align_integrity_alerts', error: err.message });
                }
            }

            // 2. Opportunities → Strategy 120 (initiatives)
            if (outputs.opportunities && Array.isArray(outputs.opportunities)) {
                try {
                    const initiatives = outputs.opportunities
                        .filter(opp => opp.priority <= 5) // Top 5 opportunities
                        .map((opp, index) => ({
                            id: uuidv4(),
                            user_id: userId,
                            company_profile_id: companyProfileId,
                            title: opp.area || opp.name || `AI Opportunity ${index + 1}`,
                            description: opp.description || `${opp.area} - Impact: ${opp.impact}, Feasibility: ${opp.feasibility}`,
                            category: 'ai_transformation',
                            priority: opp.priority || index + 1,
                            status: 'proposed',
                            source: 'align120_module1',
                            source_id: sessionId,
                            impact_score: this.parseScore(opp.impact),
                            feasibility_score: this.parseScore(opp.feasibility),
                            created_at: new Date().toISOString()
                        }));

                    if (initiatives.length > 0) {
                        const { data, error } = await supabase
                            .from('strategic_initiatives')
                            .upsert(initiatives, { onConflict: 'source_id,title' })
                            .select();

                        if (error) throw error;
                        syncResults.strategy = { initiatives_created: data?.length || 0 };
                    }
                } catch (err) {
                    syncResults.errors.push({ target: 'strategic_initiatives', error: err.message });
                }
            }

            // 3. Store maturity assessment
            if (outputs.maturity_score !== undefined) {
                try {
                    await supabase
                        .from('ai_maturity_assessments')
                        .upsert({
                            id: uuidv4(),
                            session_id: sessionId,
                            company_profile_id: companyProfileId,
                            user_id: userId,
                            overall_score: outputs.maturity_score,
                            maturity_level: outputs.maturity_level || this.getMaturityLevel(outputs.maturity_score),
                            dimension_scores: outputs.dimension_scores || {},
                            ai_inventory: outputs.current_inventory || [],
                            risk_register: outputs.risk_register || [],
                            opportunity_backlog: outputs.opportunities || [],
                            recommended_services: outputs.recommended_services || [],
                            created_at: new Date().toISOString()
                        }, { onConflict: 'session_id' });
                } catch (err) {
                    syncResults.errors.push({ target: 'ai_maturity_assessments', error: err.message });
                }
            }

        } catch (error) {
            console.error('Error syncing Module 1:', error);
            syncResults.errors.push({ target: 'general', error: error.message });
        }

        return syncResults;
    }

    /**
     * Sync Module 2 (Values/Vision/Mission) outputs
     * @param {string} sessionId - Session UUID
     * @param {Object} outputs - Module 2 outputs
     * @param {string} userId - User UUID
     */
    async syncModule2(sessionId, outputs, userId) {
        const syncResults = {
            digm: null,
            strategy: null,
            parthenon: null,
            errors: []
        };

        try {
            const companyProfileId = await this.getCompanyProfileId(sessionId);

            // 1. Core Values → DIGM Identity Layer
            if (outputs.core_values) {
                try {
                    const { error } = await supabase
                        .from('digm_layers')
                        .upsert({
                            id: uuidv4(),
                            company_profile_id: companyProfileId,
                            user_id: userId,
                            layer_type: 'identity',
                            layer_data: {
                                values: outputs.core_values,
                                source: 'align120_module2',
                                updated_at: new Date().toISOString()
                            },
                            created_at: new Date().toISOString()
                        }, { onConflict: 'company_profile_id,layer_type' });

                    if (error) throw error;
                    syncResults.digm = { identity_updated: true };
                } catch (err) {
                    syncResults.errors.push({ target: 'digm_identity', error: err.message });
                }
            }

            // 2. Vision & Mission → Strategy 120 Foundation
            if (outputs.vision_statement || outputs.mission_statement) {
                try {
                    const { error } = await supabase
                        .from('strategic_foundations')
                        .upsert({
                            id: uuidv4(),
                            company_profile_id: companyProfileId,
                            user_id: userId,
                            vision: outputs.vision_statement || null,
                            vision_horizon: outputs.vision_horizon || '5 years',
                            vision_pillars: outputs.vision_pillars || [],
                            mission: outputs.mission_statement || null,
                            core_values: outputs.core_values || [],
                            company_directions: outputs.company_directions || [],
                            source: 'align120_module2',
                            created_at: new Date().toISOString()
                        }, { onConflict: 'company_profile_id' });

                    if (error) throw error;
                    syncResults.strategy = { foundation_updated: true };
                } catch (err) {
                    syncResults.errors.push({ target: 'strategic_foundations', error: err.message });
                }
            }

            // 3. Preliminary OKRs → Parthenon (company-level)
            if (outputs.preliminary_okrs && Array.isArray(outputs.preliminary_okrs)) {
                try {
                    const okrs = outputs.preliminary_okrs.map((okr, index) => ({
                        id: uuidv4(),
                        company_profile_id: companyProfileId,
                        user_id: userId,
                        level: 'company',
                        objective: okr.objective,
                        key_results: okr.key_results || [],
                        status: 'draft',
                        priority: index + 1,
                        source: 'align120_module2',
                        source_id: sessionId,
                        created_at: new Date().toISOString()
                    }));

                    const { data, error } = await supabase
                        .from('parthenon_okrs')
                        .upsert(okrs, { onConflict: 'source_id,objective' })
                        .select();

                    if (error) throw error;
                    syncResults.parthenon = { okrs_created: data?.length || 0 };
                } catch (err) {
                    syncResults.errors.push({ target: 'parthenon_okrs', error: err.message });
                }
            }

            // 4. Store business fundamentals
            try {
                await supabase
                    .from('business_fundamentals')
                    .upsert({
                        id: uuidv4(),
                        session_id: sessionId,
                        company_profile_id: companyProfileId,
                        user_id: userId,
                        discovered_values: outputs.core_values || [],
                        vision_statement: outputs.vision_statement,
                        mission_statement: outputs.mission_statement,
                        process_inventory: outputs.process_inventory || [],
                        economic_baseline: outputs.unit_economics || {},
                        kpi_alignment_matrix: outputs.kpi_alignment || {},
                        created_at: new Date().toISOString()
                    }, { onConflict: 'session_id' });
            } catch (err) {
                syncResults.errors.push({ target: 'business_fundamentals', error: err.message });
            }

        } catch (error) {
            console.error('Error syncing Module 2:', error);
            syncResults.errors.push({ target: 'general', error: error.message });
        }

        return syncResults;
    }

    /**
     * Sync Module 3 (Training Needs) outputs
     * @param {string} sessionId - Session UUID
     * @param {Object} outputs - Module 3 outputs
     * @param {string} userId - User UUID
     */
    async syncModule3(sessionId, outputs, userId) {
        const syncResults = {
            parthenon: null,
            digm: null,
            integrity: null,
            errors: []
        };

        try {
            const companyProfileId = await this.getCompanyProfileId(sessionId);

            // 1. Skills Matrix → Parthenon Roles
            if (outputs.skills_matrix && Array.isArray(outputs.skills_matrix)) {
                try {
                    const roles = outputs.skills_matrix.map(skill => ({
                        id: uuidv4(),
                        company_profile_id: companyProfileId,
                        user_id: userId,
                        role_name: skill.role,
                        skill_scores: {
                            prompt_engineering: skill.prompt_engineering,
                            ai_evaluation: skill.ai_evaluation,
                            data_literacy: skill.data_literacy,
                            ai_governance: skill.ai_governance,
                            tool_proficiency: skill.tool_proficiency
                        },
                        source: 'align120_module3',
                        created_at: new Date().toISOString()
                    }));

                    const { data, error } = await supabase
                        .from('parthenon_roles')
                        .upsert(roles, { onConflict: 'company_profile_id,role_name' })
                        .select();

                    if (error) throw error;
                    syncResults.parthenon = { roles_synced: data?.length || 0 };
                } catch (err) {
                    syncResults.errors.push({ target: 'parthenon_roles', error: err.message });
                }
            }

            // 2. Change Readiness → DIGM Adaptation Layer
            if (outputs.change_readiness) {
                try {
                    const { error } = await supabase
                        .from('digm_layers')
                        .upsert({
                            id: uuidv4(),
                            company_profile_id: companyProfileId,
                            user_id: userId,
                            layer_type: 'adaptation',
                            layer_data: {
                                change_readiness: outputs.change_readiness,
                                source: 'align120_module3',
                                updated_at: new Date().toISOString()
                            },
                            created_at: new Date().toISOString()
                        }, { onConflict: 'company_profile_id,layer_type' });

                    if (error) throw error;
                    syncResults.digm = { adaptation_updated: true };
                } catch (err) {
                    syncResults.errors.push({ target: 'digm_adaptation', error: err.message });
                }
            }

            // 3. Adoption Blockers (high severity) → Integrity Dashboard (incidents)
            if (outputs.adoption_blockers && Array.isArray(outputs.adoption_blockers)) {
                try {
                    const incidents = outputs.adoption_blockers
                        .filter(blocker => blocker.severity === 'High' || blocker.severity === 'Critical')
                        .map(blocker => ({
                            id: uuidv4(),
                            company_profile_id: companyProfileId,
                            user_id: userId,
                            incident_type: 'adoption_blocker',
                            severity: blocker.severity?.toLowerCase() || 'medium',
                            category: blocker.category,
                            description: blocker.description,
                            mitigation: blocker.mitigation,
                            source: 'align120_module3',
                            source_id: sessionId,
                            status: 'identified',
                            created_at: new Date().toISOString()
                        }));

                    if (incidents.length > 0) {
                        const { data, error } = await supabase
                            .from('align_integrity_incidents')
                            .upsert(incidents, { onConflict: 'source_id,description' })
                            .select();

                        if (error) throw error;
                        syncResults.integrity = { incidents_created: data?.length || 0 };
                    }
                } catch (err) {
                    syncResults.errors.push({ target: 'align_integrity_incidents', error: err.message });
                }
            }

            // 4. Store team readiness assessment
            try {
                await supabase
                    .from('team_readiness_assessments')
                    .upsert({
                        id: uuidv4(),
                        session_id: sessionId,
                        company_profile_id: companyProfileId,
                        user_id: userId,
                        skills_matrix: outputs.skills_matrix || [],
                        skills_gaps: outputs.skills_gaps || [],
                        training_roadmap: outputs.training_recommendations || [],
                        change_readiness: outputs.change_readiness || {},
                        adoption_blockers: outputs.adoption_blockers || [],
                        ways_of_working: outputs.ai_ways_of_working || {},
                        created_at: new Date().toISOString()
                    }, { onConflict: 'session_id' });
            } catch (err) {
                syncResults.errors.push({ target: 'team_readiness_assessments', error: err.message });
            }

        } catch (error) {
            console.error('Error syncing Module 3:', error);
            syncResults.errors.push({ target: 'general', error: error.message });
        }

        return syncResults;
    }

    /**
     * Sync Module 4 (Brand Analysis) outputs
     * @param {string} sessionId - Session UUID
     * @param {Object} outputs - Module 4 outputs
     * @param {string} userId - User UUID
     */
    async syncModule4(sessionId, outputs, userId) {
        const syncResults = {
            digm: null,
            strategy: null,
            errors: []
        };

        try {
            const companyProfileId = await this.getCompanyProfileId(sessionId);

            // 1. Brand Voice DNA → DIGM Voice Layer
            if (outputs.brand_voice_dna) {
                try {
                    const { error } = await supabase
                        .from('digm_layers')
                        .upsert({
                            id: uuidv4(),
                            company_profile_id: companyProfileId,
                            user_id: userId,
                            layer_type: 'voice',
                            layer_data: {
                                brand_voice: outputs.brand_voice_dna,
                                source: 'align120_module4',
                                updated_at: new Date().toISOString()
                            },
                            created_at: new Date().toISOString()
                        }, { onConflict: 'company_profile_id,layer_type' });

                    if (error) throw error;
                    syncResults.digm = { voice_updated: true };
                } catch (err) {
                    syncResults.errors.push({ target: 'digm_voice', error: err.message });
                }
            }

            // 2. Ideal Customer Profile → Strategy 120 (customer perspective)
            if (outputs.ideal_customer_profile) {
                try {
                    const { error } = await supabase
                        .from('bsc_perspectives')
                        .upsert({
                            id: uuidv4(),
                            company_profile_id: companyProfileId,
                            user_id: userId,
                            perspective: 'customer',
                            data: {
                                ideal_customer_profile: outputs.ideal_customer_profile,
                                pain_points_solved: outputs.pain_points_solved || [],
                                source: 'align120_module4',
                                updated_at: new Date().toISOString()
                            },
                            created_at: new Date().toISOString()
                        }, { onConflict: 'company_profile_id,perspective' });

                    if (error) throw error;
                    syncResults.strategy = { customer_perspective_updated: true };
                } catch (err) {
                    syncResults.errors.push({ target: 'bsc_perspectives', error: err.message });
                }
            }

            // 3. Competitive Positioning → Strategy 120 Intelligence
            if (outputs.competitive_positioning) {
                try {
                    const { error } = await supabase
                        .from('competitive_intelligence')
                        .upsert({
                            id: uuidv4(),
                            company_profile_id: companyProfileId,
                            user_id: userId,
                            positioning: outputs.competitive_positioning,
                            competitors: outputs.competitive_positioning.competitors || [],
                            differentiation: outputs.competitive_positioning.differentiation,
                            why_we_win: outputs.competitive_positioning.why_we_win || [],
                            source: 'align120_module4',
                            created_at: new Date().toISOString()
                        }, { onConflict: 'company_profile_id' });

                    if (error) throw error;
                    if (!syncResults.strategy) syncResults.strategy = {};
                    syncResults.strategy.competitive_intel_updated = true;
                } catch (err) {
                    syncResults.errors.push({ target: 'competitive_intelligence', error: err.message });
                }
            }

            // 4. Store brand alignment assessment
            try {
                await supabase
                    .from('brand_alignment_assessments')
                    .upsert({
                        id: uuidv4(),
                        session_id: sessionId,
                        company_profile_id: companyProfileId,
                        user_id: userId,
                        brand_voice: outputs.brand_voice_dna || {},
                        trust_safety_matrix: outputs.trust_messaging || {},
                        customer_sentiment: outputs.sentiment_baseline || {},
                        competitive_positioning: outputs.competitive_positioning || {},
                        ideal_customer_profile: outputs.ideal_customer_profile || {},
                        products_services: outputs.products_services || [],
                        created_at: new Date().toISOString()
                    }, { onConflict: 'session_id' });
            } catch (err) {
                syncResults.errors.push({ target: 'brand_alignment_assessments', error: err.message });
            }

        } catch (error) {
            console.error('Error syncing Module 4:', error);
            syncResults.errors.push({ target: 'general', error: error.message });
        }

        return syncResults;
    }

    /**
     * Sync Module 5 (Change Management) outputs
     * @param {string} sessionId - Session UUID
     * @param {Object} outputs - Module 5 outputs
     * @param {string} userId - User UUID
     */
    async syncModule5(sessionId, outputs, userId) {
        const syncResults = {
            digm: null,
            parthenon: null,
            integrity: null,
            errors: []
        };

        try {
            const companyProfileId = await this.getCompanyProfileId(sessionId);

            // 1. Governance Charter → DIGM Identity + Cognitive Layers
            if (outputs.governance_charter) {
                try {
                    // Update cognitive layer
                    const { error } = await supabase
                        .from('digm_layers')
                        .upsert({
                            id: uuidv4(),
                            company_profile_id: companyProfileId,
                            user_id: userId,
                            layer_type: 'cognitive',
                            layer_data: {
                                governance: outputs.governance_charter,
                                source: 'align120_module5',
                                updated_at: new Date().toISOString()
                            },
                            created_at: new Date().toISOString()
                        }, { onConflict: 'company_profile_id,layer_type' });

                    if (error) throw error;
                    syncResults.digm = { cognitive_updated: true };
                } catch (err) {
                    syncResults.errors.push({ target: 'digm_cognitive', error: err.message });
                }
            }

            // 2. Stakeholder Map → Parthenon Stakeholders
            if (outputs.stakeholder_map && Array.isArray(outputs.stakeholder_map)) {
                try {
                    const stakeholders = outputs.stakeholder_map.map(sh => ({
                        id: uuidv4(),
                        company_profile_id: companyProfileId,
                        user_id: userId,
                        name: sh.name,
                        role: sh.role,
                        influence: sh.influence,
                        interest: sh.interest,
                        stance: sh.stance,
                        engagement_strategy: sh.engagement_strategy,
                        source: 'align120_module5',
                        created_at: new Date().toISOString()
                    }));

                    const { data, error } = await supabase
                        .from('parthenon_stakeholders')
                        .upsert(stakeholders, { onConflict: 'company_profile_id,name' })
                        .select();

                    if (error) throw error;
                    syncResults.parthenon = { stakeholders_synced: data?.length || 0 };
                } catch (err) {
                    syncResults.errors.push({ target: 'parthenon_stakeholders', error: err.message });
                }
            }

            // 3. RACI Matrix → Parthenon OKR Assignments
            if (outputs.raci_matrix) {
                try {
                    // Store RACI as governance data
                    const { error } = await supabase
                        .from('governance_raci')
                        .upsert({
                            id: uuidv4(),
                            company_profile_id: companyProfileId,
                            user_id: userId,
                            raci_matrix: outputs.raci_matrix,
                            source: 'align120_module5',
                            created_at: new Date().toISOString()
                        }, { onConflict: 'company_profile_id' });

                    if (error) throw error;
                    if (!syncResults.parthenon) syncResults.parthenon = {};
                    syncResults.parthenon.raci_synced = true;
                } catch (err) {
                    syncResults.errors.push({ target: 'governance_raci', error: err.message });
                }
            }

            // 4. Success Metrics → Integrity Dashboard Metrics
            if (outputs.success_metrics) {
                try {
                    const metrics = Object.entries(outputs.success_metrics).map(([key, value]) => ({
                        id: uuidv4(),
                        company_profile_id: companyProfileId,
                        user_id: userId,
                        metric_name: key,
                        current_value: value.current || 0,
                        target_value: value.target || 0,
                        unit: value.unit || '%',
                        category: 'ai_transformation',
                        source: 'align120_module5',
                        source_id: sessionId,
                        created_at: new Date().toISOString()
                    }));

                    const { data, error } = await supabase
                        .from('align_integrity_metrics')
                        .upsert(metrics, { onConflict: 'company_profile_id,metric_name' })
                        .select();

                    if (error) throw error;
                    syncResults.integrity = { metrics_created: data?.length || 0 };
                } catch (err) {
                    syncResults.errors.push({ target: 'align_integrity_metrics', error: err.message });
                }
            }

            // 5. Store corporate alignment
            try {
                await supabase
                    .from('corporate_alignments')
                    .upsert({
                        id: uuidv4(),
                        session_id: sessionId,
                        company_profile_id: companyProfileId,
                        user_id: userId,
                        stakeholder_map: outputs.stakeholder_map || [],
                        raci_matrix: outputs.raci_matrix || {},
                        governance_charter: outputs.governance_charter || {},
                        policy_drafts: outputs.policy_drafts || [],
                        ai_portfolio: outputs.change_program || {},
                        roadmap_90_day: outputs.roadmap_90_day || [],
                        success_metrics: outputs.success_metrics || {},
                        created_at: new Date().toISOString()
                    }, { onConflict: 'session_id' });
            } catch (err) {
                syncResults.errors.push({ target: 'corporate_alignments', error: err.message });
            }

        } catch (error) {
            console.error('Error syncing Module 5:', error);
            syncResults.errors.push({ target: 'general', error: error.message });
        }

        return syncResults;
    }

    /**
     * Sync a specific module's outputs
     * @param {number} moduleNum - Module number (1-5)
     * @param {string} sessionId - Session UUID
     * @param {Object} outputs - Module outputs
     * @param {string} userId - User UUID
     */
    async syncModule(moduleNum, sessionId, outputs, userId) {
        switch (moduleNum) {
            case 1:
                return this.syncModule1(sessionId, outputs, userId);
            case 2:
                return this.syncModule2(sessionId, outputs, userId);
            case 3:
                return this.syncModule3(sessionId, outputs, userId);
            case 4:
                return this.syncModule4(sessionId, outputs, userId);
            case 5:
                return this.syncModule5(sessionId, outputs, userId);
            default:
                throw new Error(`Invalid module number: ${moduleNum}`);
        }
    }

    /**
     * Generate Alignment Brief (consolidated executive summary)
     * @param {string} sessionId - Session UUID
     * @returns {Promise<Object>} - Alignment brief data
     */
    async generateAlignmentBrief(sessionId) {
        try {
            // Get session
            const { data: session, error: sessionError } = await supabase
                .from('align120_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();

            if (sessionError) throw sessionError;

            const companyProfileId = session.company_profile_id;

            // Gather all module data
            const [
                { data: maturity },
                { data: fundamentals },
                { data: teamReadiness },
                { data: brandAlignment },
                { data: corporateAlignment }
            ] = await Promise.all([
                supabase.from('ai_maturity_assessments').select('*').eq('session_id', sessionId).single(),
                supabase.from('business_fundamentals').select('*').eq('session_id', sessionId).single(),
                supabase.from('team_readiness_assessments').select('*').eq('session_id', sessionId).single(),
                supabase.from('brand_alignment_assessments').select('*').eq('session_id', sessionId).single(),
                supabase.from('corporate_alignments').select('*').eq('session_id', sessionId).single()
            ]);

            // Build alignment brief
            const alignmentBrief = {
                session_id: sessionId,
                company_name: session.company_name,
                generated_at: new Date().toISOString(),

                executive_summary: {
                    ai_maturity: {
                        score: maturity?.overall_score || 0,
                        level: maturity?.maturity_level || 'Unknown',
                        top_strengths: maturity?.dimension_scores ?
                            this.getTopScores(maturity.dimension_scores, 3) : [],
                        key_gaps: maturity?.dimension_scores ?
                            this.getBottomScores(maturity.dimension_scores, 3) : []
                    },
                    strategic_foundation: {
                        vision: fundamentals?.vision_statement || 'Not defined',
                        mission: fundamentals?.mission_statement || 'Not defined',
                        core_values: fundamentals?.discovered_values?.slice(0, 5) || []
                    },
                    team_readiness: {
                        overall_score: teamReadiness?.change_readiness?.overall_score || 0,
                        key_blockers: teamReadiness?.adoption_blockers?.slice(0, 3) || [],
                        training_tracks: teamReadiness?.training_roadmap?.length || 0
                    },
                    brand_alignment: {
                        voice_defined: !!brandAlignment?.brand_voice,
                        icp_defined: !!brandAlignment?.ideal_customer_profile,
                        competitive_position: brandAlignment?.competitive_positioning?.differentiation || 'Not defined'
                    },
                    governance: {
                        charter_defined: !!corporateAlignment?.governance_charter,
                        stakeholders_mapped: corporateAlignment?.stakeholder_map?.length || 0,
                        policies_drafted: corporateAlignment?.policy_drafts?.length || 0
                    }
                },

                roadmap: corporateAlignment?.roadmap_90_day || [],

                success_metrics: corporateAlignment?.success_metrics || {},

                recommended_services: maturity?.recommended_services || [],

                next_steps: this.generateNextSteps(maturity, fundamentals, teamReadiness, brandAlignment, corporateAlignment)
            };

            // Store the brief
            await supabase
                .from('alignment_briefs')
                .upsert({
                    id: uuidv4(),
                    session_id: sessionId,
                    company_profile_id: companyProfileId,
                    brief_data: alignmentBrief,
                    created_at: new Date().toISOString()
                }, { onConflict: 'session_id' });

            return alignmentBrief;

        } catch (error) {
            console.error('Error generating alignment brief:', error);
            throw error;
        }
    }

    // ========================================
    // Helper Methods
    // ========================================

    /**
     * Get or create company profile ID for a session
     * Enforces 1:1 client-profile relationship for agency sessions
     */
    async getCompanyProfileId(sessionId) {
        const { data: session } = await supabase
            .from('align120_sessions')
            .select('company_profile_id, company_name, user_id, org_id, client_id')
            .eq('id', sessionId)
            .single();

        if (session?.company_profile_id) {
            // Ensure existing profile is linked to client if this is a client session
            if (session.client_id) {
                await supabase
                    .from('company_profiles')
                    .update({
                        client_id: session.client_id,
                        org_id: session.org_id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', session.company_profile_id)
                    .is('client_id', null); // Only update if not already linked
            }
            return session.company_profile_id;
        }

        // For client sessions, use the get_or_create_client_profile function
        // to enforce 1:1 relationship
        if (session?.client_id) {
            // Check for existing client profile first
            const { data: existingProfile } = await supabase
                .from('company_profiles')
                .select('id')
                .eq('client_id', session.client_id)
                .neq('status', 'archived')
                .single();

            if (existingProfile) {
                // Link session to existing client profile
                await supabase
                    .from('align120_sessions')
                    .update({ company_profile_id: existingProfile.id })
                    .eq('id', sessionId);
                return existingProfile.id;
            }

            // Create new profile linked to client
            const { data: newProfile, error: profileError } = await supabase
                .from('company_profiles')
                .insert({
                    id: uuidv4(),
                    user_id: session.user_id,
                    org_id: session.org_id,
                    client_id: session.client_id,
                    company_name: session.company_name,
                    status: 'active',
                    version: 1,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (profileError) throw profileError;

            // Update session with profile ID
            await supabase
                .from('align120_sessions')
                .update({ company_profile_id: newProfile.id })
                .eq('id', sessionId);

            return newProfile.id;
        }

        // For personal sessions (no client), create a standalone profile
        const { data: profile, error } = await supabase
            .from('company_profiles')
            .insert({
                id: uuidv4(),
                user_id: session.user_id,
                org_id: session.org_id,
                company_name: session.company_name,
                status: 'active',
                version: 1,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        // Update session with profile ID
        await supabase
            .from('align120_sessions')
            .update({ company_profile_id: profile.id })
            .eq('id', sessionId);

        return profile.id;
    }

    /**
     * Parse score from string or number
     */
    parseScore(value) {
        if (typeof value === 'number') return value;
        if (value === 'High') return 80;
        if (value === 'Medium') return 50;
        if (value === 'Low') return 20;
        return 50;
    }

    /**
     * Get maturity level from score
     */
    getMaturityLevel(score) {
        if (score >= 81) return 'Leading';
        if (score >= 61) return 'Advanced';
        if (score >= 41) return 'Developing';
        if (score >= 21) return 'Emerging';
        return 'Nascent';
    }

    /**
     * Get top N scores from dimension scores
     */
    getTopScores(dimensionScores, n) {
        return Object.entries(dimensionScores)
            .sort(([,a], [,b]) => b - a)
            .slice(0, n)
            .map(([key, value]) => ({ dimension: key, score: value }));
    }

    /**
     * Get bottom N scores from dimension scores
     */
    getBottomScores(dimensionScores, n) {
        return Object.entries(dimensionScores)
            .sort(([,a], [,b]) => a - b)
            .slice(0, n)
            .map(([key, value]) => ({ dimension: key, score: value }));
    }

    /**
     * Generate next steps based on assessment data
     */
    generateNextSteps(maturity, fundamentals, teamReadiness, brandAlignment, corporateAlignment) {
        const steps = [];

        // Based on maturity gaps
        if (maturity?.dimension_scores) {
            const lowestDimension = Object.entries(maturity.dimension_scores)
                .sort(([,a], [,b]) => a - b)[0];
            if (lowestDimension && lowestDimension[1] < 50) {
                steps.push({
                    priority: 1,
                    action: `Address ${lowestDimension[0]} gap (current score: ${lowestDimension[1]})`,
                    category: 'maturity'
                });
            }
        }

        // Based on blockers
        if (teamReadiness?.adoption_blockers?.length > 0) {
            const criticalBlockers = teamReadiness.adoption_blockers
                .filter(b => b.severity === 'Critical' || b.severity === 'High');
            if (criticalBlockers.length > 0) {
                steps.push({
                    priority: 2,
                    action: `Resolve ${criticalBlockers.length} critical adoption blocker(s)`,
                    category: 'change_management'
                });
            }
        }

        // Based on governance
        if (!corporateAlignment?.governance_charter) {
            steps.push({
                priority: 3,
                action: 'Establish AI governance charter',
                category: 'governance'
            });
        }

        // Based on training
        if (teamReadiness?.training_roadmap?.length > 0) {
            steps.push({
                priority: 4,
                action: `Launch training program (${teamReadiness.training_roadmap.length} tracks identified)`,
                category: 'upskilling'
            });
        }

        return steps.sort((a, b) => a.priority - b.priority);
    }
}

// Export singleton instance
module.exports = new Align120IntegrationService();
