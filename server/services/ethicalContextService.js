/**
 * INSIGHT 360 - Ethical Context Service
 * Version: 1.0.0
 * Phase: 54 - Human Values Definition System
 *
 * Integrates SCU Ethics Framework into DIGM's Ethics Layer.
 * Provides ethical context assembly, stakes detection, lens analysis,
 * and ethical evaluation logging.
 *
 * SCU Framework: Six Ethical Lenses
 * 1. Rights - Moral rights and dignity
 * 2. Justice - Fairness and equal treatment
 * 3. Utilitarian - Greatest good for most
 * 4. Common Good - Community welfare
 * 5. Virtue - Character and integrity
 * 6. Care Ethics - Relationships and empathy
 */

const { createClient } = require('@supabase/supabase-js');
const valuesAlignmentService = require('./valuesAlignmentService');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * Parse a free-text financial impact string into a numeric dollar amount.
 * Returns null if unparseable.
 * Handles: "$3.7B", "£450M", "€2 billion", "3.7 billion", "$45,000"
 */
function parseFinancialImpact(text) {
    if (!text || typeof text !== 'string') return null;
    const clean = text.replace(/,/g, '').trim();
    const pattern = /[\$£€¥]?\s*([\d]+(?:\.[\d]+)?)\s*(billion|bn|million|mn|trillion|tn|B|M|T|K)?/i;
    const match = clean.match(pattern);
    if (!match) return null;
    let value = parseFloat(match[1]);
    if (isNaN(value)) return null;
    const multiplier = (match[2] || '').toLowerCase();
    if (['trillion', 'tn', 't'].includes(multiplier)) value *= 1e12;
    else if (['billion', 'bn', 'b'].includes(multiplier)) value *= 1e9;
    else if (['million', 'mn', 'm'].includes(multiplier)) value *= 1e6;
    else if (multiplier === 'k') value *= 1e3;
    return value;
}

/**
 * Stakes levels for determining ethical framework application
 */
const STAKES_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

/**
 * Keywords that trigger different stakes levels
 */
const STAKES_KEYWORDS = {
    critical: [
        'safety', 'harm', 'danger', 'emergency', 'crisis', 'legal', 'lawsuit',
        'discrimination', 'harassment', 'terminate', 'fire', 'illegal', 'fraud',
        'child', 'minor', 'death', 'suicide', 'violence', 'weapon', 'abuse'
    ],
    high: [
        'ethics', 'moral', 'right', 'wrong', 'should', 'ought', 'fair', 'unfair',
        'policy', 'compliance', 'regulation', 'confidential', 'privacy', 'sensitive',
        'decision', 'choose', 'dilemma', 'conflict', 'stakeholder', 'impact',
        'reputation', 'trust', 'integrity', 'values', 'principle'
    ],
    medium: [
        'strategy', 'recommend', 'suggest', 'advise', 'guidance', 'trade-off',
        'priority', 'resource', 'budget', 'allocation', 'change', 'transition',
        'employee', 'team', 'culture', 'communication', 'relationship'
    ]
};

/**
 * Get all active ethical lenses
 * @returns {array} - Array of ethical lens definitions
 */
async function getEthicalLenses() {
    const { data, error } = await supabase
        .from('ethical_lenses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

    if (error) throw error;
    return data || [];
}

/**
 * Get a specific ethical lens by short name
 * @param {string} shortName - rights, justice, utilitarian, common_good, virtue, care_ethics
 * @returns {object} - Ethical lens definition
 */
async function getEthicalLens(shortName) {
    const { data, error } = await supabase
        .from('ethical_lenses')
        .select('*')
        .eq('short_name', shortName)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Detect stakes level from user message content
 * @param {string} message - User message
 * @param {object} context - Additional context
 * @returns {string} - Stakes level (low, medium, high, critical)
 */
function detectStakesLevel(message, context = {}) {
    if (!message) return STAKES_LEVELS.LOW;

    const messageLower = message.toLowerCase();

    // Check for critical stakes keywords
    for (const keyword of STAKES_KEYWORDS.critical) {
        if (messageLower.includes(keyword)) {
            return STAKES_LEVELS.CRITICAL;
        }
    }

    // Check for high stakes keywords
    let highStakesCount = 0;
    for (const keyword of STAKES_KEYWORDS.high) {
        if (messageLower.includes(keyword)) {
            highStakesCount++;
        }
    }
    if (highStakesCount >= 2) {
        return STAKES_LEVELS.HIGH;
    }

    // Check for medium stakes keywords
    let mediumStakesCount = 0;
    for (const keyword of STAKES_KEYWORDS.medium) {
        if (messageLower.includes(keyword)) {
            mediumStakesCount++;
        }
    }
    if (mediumStakesCount >= 2 || highStakesCount >= 1) {
        return STAKES_LEVELS.MEDIUM;
    }

    // Check context for additional indicators
    if (context.agentCategory === 'governance' ||
        context.agentCategory === 'integrity' ||
        context.isDecisionContext) {
        return STAKES_LEVELS.MEDIUM;
    }

    return STAKES_LEVELS.LOW;
}

/**
 * Assemble ethical context based on stakes level
 * @param {string} stakesLevel - low, medium, high, critical
 * @param {object} soulConfig - Resolved soul configuration
 * @returns {object} - Ethical context to inject
 */
async function assembleEthicalContext(stakesLevel, soulConfig = {}) {
    const context = {
        stakesLevel,
        instructions: '',
        lenses: [],
        brightLines: [],
        decisionFramework: null
    };

    // For low stakes, minimal ethical context
    if (stakesLevel === STAKES_LEVELS.LOW) {
        context.instructions = `
Respond naturally while adhering to organization values and guidelines.
If you encounter ethical concerns, flag them and escalate if needed.`;

        // Include only bright lines for awareness
        if (soulConfig.bright_lines) {
            context.brightLines = soulConfig.bright_lines
                .filter(bl => bl.level === 'platform')
                .map(bl => bl.name);
        }

        return context;
    }

    // For medium stakes, include values awareness
    if (stakesLevel === STAKES_LEVELS.MEDIUM) {
        context.instructions = `
Consider organizational values in your response.
Be mindful of stakeholder impacts.
If uncertain about the right approach, acknowledge trade-offs.`;

        // Include values summary
        if (soulConfig.values) {
            context.values = soulConfig.values.map(v => ({
                name: v.name,
                meaning: v.meaning
            }));
        }

        // Include bright lines
        if (soulConfig.bright_lines) {
            context.brightLines = soulConfig.bright_lines.map(bl => ({
                name: bl.name,
                description: bl.description
            }));
        }

        return context;
    }

    // For high stakes, full SCU framework
    const lenses = await getEthicalLenses();

    context.instructions = `
This is a HIGH STAKES situation requiring ethical consideration.

Apply the SCU Ethics Framework:
1. Identify the ethical issues and affected parties
2. Gather relevant facts
3. Evaluate through all six ethical lenses
4. Recommend a course of action with justification
5. Note any concerns that warrant human review

Be explicit about your ethical reasoning.`;

    context.lenses = lenses.map(lens => ({
        name: lens.name,
        shortName: lens.short_name,
        keyQuestion: lens.key_question,
        criteria: lens.evaluation_criteria
    }));

    context.decisionFramework = {
        step1: 'Identify ethical issues: What values are in tension? Who is affected?',
        step2: 'Get the facts: What do we know? What don\'t we know?',
        step3: 'Evaluate through lenses: Rights, Justice, Utilitarian, Common Good, Virtue, Care',
        step4: 'Choose and test: Reversibility, Publicity, Golden Rule',
        step5: 'Reflect: What can we learn for future decisions?'
    };

    // Include full values and bright lines
    if (soulConfig.values) {
        context.values = soulConfig.values;
    }

    if (soulConfig.bright_lines) {
        context.brightLines = soulConfig.bright_lines;
    }

    // Include guardrails
    if (soulConfig.guardrails) {
        context.guardrails = soulConfig.guardrails;
    }

    return context;
}

/**
 * Format ethical context for injection into system prompt
 * @param {object} ethicalContext - Assembled ethical context
 * @returns {string} - Formatted context string
 */
function formatEthicalContext(ethicalContext) {
    const parts = [];

    parts.push('# ETHICAL CONTEXT');
    parts.push(`Stakes Level: ${ethicalContext.stakesLevel.toUpperCase()}`);
    parts.push('');

    // Instructions
    if (ethicalContext.instructions) {
        parts.push('## Guidance');
        parts.push(ethicalContext.instructions);
        parts.push('');
    }

    // Bright Lines
    if (ethicalContext.brightLines && ethicalContext.brightLines.length > 0) {
        parts.push('## Non-Negotiable Boundaries');
        for (const line of ethicalContext.brightLines) {
            if (typeof line === 'string') {
                parts.push(`- ${line}`);
            } else {
                parts.push(`- **${line.name}**: ${line.description || ''}`);
            }
        }
        parts.push('');
    }

    // Values
    if (ethicalContext.values && ethicalContext.values.length > 0) {
        parts.push('## Core Values');
        for (const value of ethicalContext.values) {
            if (value.meaning) {
                parts.push(`- **${value.name}**: ${value.meaning}`);
            } else {
                parts.push(`- ${value.name}`);
            }
        }
        parts.push('');
    }

    // For high stakes, include full framework
    if (ethicalContext.stakesLevel === STAKES_LEVELS.HIGH ||
        ethicalContext.stakesLevel === STAKES_LEVELS.CRITICAL) {

        // Decision Framework
        if (ethicalContext.decisionFramework) {
            parts.push('## Ethical Decision Framework');
            for (const [step, instruction] of Object.entries(ethicalContext.decisionFramework)) {
                parts.push(`${step.replace('step', 'Step ')}: ${instruction}`);
            }
            parts.push('');
        }

        // Ethical Lenses
        if (ethicalContext.lenses && ethicalContext.lenses.length > 0) {
            parts.push('## Ethical Lenses to Apply');
            for (const lens of ethicalContext.lenses) {
                parts.push(`### ${lens.name}`);
                parts.push(`Key Question: ${lens.keyQuestion}`);
                parts.push('');
            }
        }
    }

    // Guardrails
    if (ethicalContext.guardrails) {
        const hasGuardrails = Object.values(ethicalContext.guardrails).some(
            v => Array.isArray(v) && v.length > 0
        );

        if (hasGuardrails) {
            parts.push('## Behavioral Guardrails');
            for (const [category, rules] of Object.entries(ethicalContext.guardrails)) {
                if (rules && rules.length > 0) {
                    parts.push(`**${category.charAt(0).toUpperCase() + category.slice(1)}:**`);
                    for (const rule of rules) {
                        if (typeof rule === 'string') {
                            parts.push(`- ${rule}`);
                        } else if (rule.rule) {
                            parts.push(`- ${rule.rule}`);
                        }
                    }
                }
            }
            parts.push('');
        }
    }

    return parts.join('\n');
}

/**
 * Log an ethical evaluation for audit purposes
 * @param {object} evaluation - Evaluation details
 * @returns {object} - Created evaluation record
 */
async function logEthicalEvaluation(evaluation) {
    const {
        orgId,
        conversationId,
        agentId,
        userId,
        soulConfigVersion,
        decisionSummary,
        decisionType = 'recommendation',
        stakesLevel,
        step1Issues,
        step2Facts,
        step3LensAnalysis,
        step4ChosenOption,
        step4TestResults,
        step5Outcome,
        automated = true,
        requiresHumanReview = false
    } = evaluation;

    const { data, error } = await supabase
        .from('ethical_evaluations')
        .insert({
            org_id: orgId,
            conversation_id: conversationId,
            agent_id: agentId,
            user_id: userId,
            soul_config_version: soulConfigVersion,
            decision_summary: decisionSummary,
            decision_type: decisionType,
            stakes_level: stakesLevel,
            step_1_issues: step1Issues,
            step_2_facts: step2Facts,
            step_3_lens_analysis: step3LensAnalysis,
            step_4_chosen_option: step4ChosenOption,
            step_4_test_results: step4TestResults,
            step_5_outcome: step5Outcome,
            automated,
            requires_human_review: requiresHumanReview
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get ethical evaluations for a conversation
 * @param {string} conversationId - Conversation UUID
 * @returns {array} - Ethical evaluations
 */
async function getEvaluationsForConversation(conversationId) {
    const { data, error } = await supabase
        .from('ethical_evaluations')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get evaluations requiring human review
 * @param {string} orgId - Organization ID (optional)
 * @returns {array} - Evaluations needing review
 */
async function getPendingReviews(orgId = null) {
    let query = supabase
        .from('ethical_evaluations')
        .select(`
            *,
            conversations(id, agent_id, agents(name, org_id))
        `)
        .eq('requires_human_review', true)
        .is('reviewed_at', null)
        .order('created_at', { ascending: false });

    if (orgId) {
        // Filter by org through the conversation's agent
        query = query.eq('conversations.agents.org_id', orgId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
}

/**
 * Mark an evaluation as reviewed
 * @param {string} evaluationId - Evaluation UUID
 * @param {string} reviewedBy - Reviewer user ID
 * @param {string} reviewNotes - Optional review notes
 * @returns {object} - Updated evaluation
 */
async function markEvaluationReviewed(evaluationId, reviewedBy, reviewNotes = null) {
    const { data, error } = await supabase
        .from('ethical_evaluations')
        .update({
            reviewed_by: reviewedBy,
            reviewed_at: new Date().toISOString(),
            step_5_outcome: reviewNotes
        })
        .eq('id', evaluationId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Log a bright line incident
 * @param {object} incident - Incident details
 * @returns {object} - Created incident record
 */
async function logBrightLineIncident(incident) {
    const {
        orgId,
        soulConfigId,
        brightLineName,
        brightLineLevel = 'organization',
        incidentType = 'violation',
        description,
        severity = 'medium',
        conversationId,
        agentId,
        reportedBy
    } = incident;

    const { data, error } = await supabase
        .from('bright_line_incidents')
        .insert({
            org_id: orgId,
            soul_config_id: soulConfigId,
            bright_line_name: brightLineName,
            bright_line_level: brightLineLevel,
            incident_type: incidentType,
            description,
            severity,
            conversation_id: conversationId,
            agent_id: agentId,
            reported_by: reportedBy
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get bright line incidents for an organization
 * @param {string} orgId - Organization ID
 * @param {object} filters - { incidentType, severity, resolved }
 * @returns {array} - Incidents
 */
async function getBrightLineIncidents(orgId, filters = {}) {
    let query = supabase
        .from('bright_line_incidents')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

    if (filters.incidentType) {
        query = query.eq('incident_type', filters.incidentType);
    }

    if (filters.severity) {
        query = query.eq('severity', filters.severity);
    }

    if (filters.resolved === true) {
        query = query.not('resolved_at', 'is', null);
    } else if (filters.resolved === false) {
        query = query.is('resolved_at', null);
    }

    if (filters.createdAfter) {
        query = query.gte('created_at', filters.createdAfter);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
}

/**
 * Resolve a bright line incident
 * @param {string} incidentId - Incident UUID
 * @param {string} resolvedBy - User who resolved it
 * @param {string} resolutionNotes - Resolution details
 * @returns {object} - Updated incident
 */
async function resolveBrightLineIncident(incidentId, resolvedBy, resolutionNotes) {
    const { data, error } = await supabase
        .from('bright_line_incidents')
        .update({
            resolved_at: new Date().toISOString(),
            resolved_by: resolvedBy,
            resolution_notes: resolutionNotes
        })
        .eq('id', incidentId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Calculate integrity metrics for a time period
 * @param {string} orgId - Organization ID
 * @param {number} days - Number of days to analyze
 * @returns {object} - Integrity metrics
 */
async function calculateIntegrityMetrics(orgId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get ethical evaluations (scoped to org)
    const { data: evaluations, error: evalError } = await supabase
        .from('ethical_evaluations')
        .select('stakes_level, requires_human_review, reviewed_at')
        .eq('org_id', orgId)
        .gte('created_at', startDate.toISOString());

    if (evalError) throw evalError;

    // Get bright line incidents
    const { data: incidents, error: incidentError } = await supabase
        .from('bright_line_incidents')
        .select('incident_type, severity, resolved_at')
        .eq('org_id', orgId)
        .gte('created_at', startDate.toISOString());

    if (incidentError) throw incidentError;

    // Get real alignment audit score
    let realAlignmentScore = null;
    try {
        const auditHistory = await valuesAlignmentService.getAuditHistory(orgId, 1);
        if (auditHistory && auditHistory.length > 0) {
            realAlignmentScore = auditHistory[0].overall_score;
        }
    } catch (e) {
        // Fall back to proxy formula if service fails
    }

    // Get industry baseline for counterfactual enrichment
    let baselineFinancialTotal = 0;
    let baselineEntryCount = 0;
    try {
        const { data: baselineAssets } = await supabase
            .from('context_assets')
            .select('content_json')
            .eq('org_id', orgId)
            .eq('asset_type', 'industry_baseline')
            .limit(1);

        if (baselineAssets && baselineAssets.length > 0) {
            const entries = baselineAssets[0].content_json?.entries || [];
            baselineEntryCount = entries.length;
            for (const entry of entries) {
                const num = entry.financialImpactNumber
                    || parseFinancialImpact(entry.financialImpact)
                    || 0;
                baselineFinancialTotal += num;
            }
        }
    } catch (e) {
        // Non-critical, proceed without baseline data
    }

    // Calculate metrics
    const totalEvaluations = evaluations?.length || 0;
    const highStakesCount = evaluations?.filter(
        e => e.stakes_level === 'high' || e.stakes_level === 'critical'
    ).length || 0;
    const humanReviewRequired = evaluations?.filter(e => e.requires_human_review).length || 0;
    const humanReviewCompleted = evaluations?.filter(
        e => e.requires_human_review && e.reviewed_at
    ).length || 0;

    const totalIncidents = incidents?.length || 0;
    const violations = incidents?.filter(i => i.incident_type === 'violation').length || 0;
    const nearMisses = incidents?.filter(i => i.incident_type === 'near_miss').length || 0;
    const resolvedIncidents = incidents?.filter(i => i.resolved_at).length || 0;

    // Calculate base rates
    const incidentRate = totalEvaluations > 0 ? violations / totalEvaluations : 0;
    const reviewCompletionRate = humanReviewRequired > 0 ?
        humanReviewCompleted / humanReviewRequired : 1;
    const resolutionRate = totalIncidents > 0 ? resolvedIncidents / totalIncidents : 1;
    const highStakesRatio = totalEvaluations > 0 ? highStakesCount / totalEvaluations : 0;
    const hasActivity = totalEvaluations > 0 || totalIncidents > 0;

    // Component 1: Trust Velocity (30%) — resolution rate + low incident rate
    const trustVelocity = Math.round(
        resolutionRate * 50 + (1 - incidentRate) * 50
    );

    // Component 2: Intervention Effectiveness (25%) — review completion + detection activity
    const detectionScore = hasActivity ? Math.min(100, totalEvaluations * 2) : 0;
    const interventionEffectiveness = Math.round(
        reviewCompletionRate * 60 + (detectionScore / 100) * 40
    );

    // Component 3: Alignment Audit (25%) — real score from values alignment audit
    // Falls back to proxy formula when no audit has been run
    let alignmentAudit;
    if (realAlignmentScore !== null) {
        alignmentAudit = realAlignmentScore;
    } else {
        const activityScore = hasActivity ? Math.min(100, totalEvaluations * 3) : 0;
        alignmentAudit = Math.round(
            (activityScore / 100) * 50 + (1 - highStakesRatio) * 50
        );
    }

    // Component 4: Counterfactual Value (20%) — enriched with industry baseline
    const nearMissScore = nearMisses > 0 ? Math.min(100, nearMisses * 20) : 0;
    const cleanRecord = violations === 0 ? 100 : Math.max(0, 100 - violations * 25);
    const baselineCoverageBonus = baselineEntryCount > 0
        ? Math.min(20, Math.round((baselineEntryCount / 5) * 20))
        : 0;
    const counterfactualBase = Math.round(
        nearMissScore * 0.3 + resolutionRate * 100 * 0.35 + cleanRecord * 0.35
    );
    const counterfactualValue = Math.min(100, counterfactualBase + baselineCoverageBonus);

    // Weighted composite
    const integrityYield = Math.round(
        trustVelocity * 0.30 +
        interventionEffectiveness * 0.25 +
        alignmentAudit * 0.25 +
        counterfactualValue * 0.20
    );

    // Interpretation
    let interpretation;
    if (integrityYield >= 80) interpretation = 'strong';
    else if (integrityYield >= 60) interpretation = 'adequate';
    else if (integrityYield >= 40) interpretation = 'gaps';
    else interpretation = 'critical';

    // Fetch previous period snapshot for trend calculation
    let trend = { change: 0, direction: 'stable' };
    try {
        const { data: prevSnapshots } = await supabase
            .from('integrity_score_history')
            .select('integrity_yield, recorded_at')
            .eq('org_id', orgId)
            .eq('period_days', days)
            .order('recorded_at', { ascending: false })
            .limit(1);

        if (prevSnapshots && prevSnapshots.length >= 1) {
            const prevYield = prevSnapshots[0].integrity_yield;
            const change = integrityYield - prevYield;
            trend = {
                change: Math.abs(change),
                direction: change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable'
            };
        }
    } catch (e) {
        // Non-critical
    }

    // Save snapshot for historical trend (fire-and-forget, throttled to max once per hour)
    supabase
        .from('integrity_score_history')
        .select('recorded_at')
        .eq('org_id', orgId)
        .eq('period_days', days)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .then(({ data: recent }) => {
            const lastRecorded = recent?.[0]?.recorded_at;
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            if (lastRecorded && lastRecorded > oneHourAgo) return; // Skip if recent snapshot exists

            return supabase
                .from('integrity_score_history')
                .insert({
                    org_id: orgId,
                    period_days: days,
                    integrity_yield: integrityYield,
                    trust_velocity: trustVelocity,
                    intervention_effectiveness: interventionEffectiveness,
                    alignment_audit: alignmentAudit,
                    counterfactual_value: counterfactualValue,
                    interpretation,
                    snapshot_data: {
                        evaluations: { totalEvaluations, highStakesCount, humanReviewRequired, humanReviewCompleted },
                        incidents: { totalIncidents, violations, nearMisses, resolvedIncidents },
                        baselineEntryCount,
                        baselineFinancialTotal
                    }
                });
        })
        .catch(err => console.error('Failed to save integrity snapshot:', err));

    // Leading indicators — use real alignment data when available
    const alignmentIndicator = realAlignmentScore !== null
        ? {
            name: 'Values alignment',
            status: realAlignmentScore >= 75 ? 'positive' : realAlignmentScore >= 50 ? 'neutral' : 'negative',
            note: `Alignment score: ${realAlignmentScore}/100`
        }
        : {
            name: 'Values alignment trend',
            status: highStakesRatio < 0.3 ? 'positive' : highStakesRatio < 0.6 ? 'neutral' : 'negative',
            note: totalEvaluations > 0 ? `${Math.round((1 - highStakesRatio) * 100)}% low/medium stakes` : 'No evaluations yet'
        };

    const leadingIndicators = [
        alignmentIndicator,
        {
            name: 'Bright line awareness',
            status: violations === 0 ? 'positive' : violations <= 2 ? 'neutral' : 'negative',
            note: `${violations} violation${violations !== 1 ? 's' : ''}, ${nearMisses} near-miss${nearMisses !== 1 ? 'es' : ''}`
        },
        {
            name: 'Review completion',
            status: reviewCompletionRate >= 0.8 ? 'positive' : reviewCompletionRate >= 0.5 ? 'neutral' : 'negative',
            note: humanReviewRequired > 0 ? `${humanReviewCompleted}/${humanReviewRequired} reviews completed` : 'No reviews required'
        },
        {
            name: 'Incident resolution',
            status: resolutionRate >= 0.8 ? 'positive' : resolutionRate >= 0.5 ? 'neutral' : 'negative',
            note: totalIncidents > 0 ? `${resolvedIncidents}/${totalIncidents} incidents resolved` : 'No incidents'
        }
    ];

    return {
        period: { days, startDate: startDate.toISOString() },
        trend,
        evaluations: {
            total: totalEvaluations,
            highStakes: highStakesCount,
            requiresReview: humanReviewRequired,
            reviewsCompleted: humanReviewCompleted
        },
        incidents: {
            total: totalIncidents,
            violations,
            nearMisses,
            resolved: resolvedIncidents
        },
        metrics: {
            integrityYield,
            incidentRate: Math.round(incidentRate * 100),
            reviewCompletionRate: Math.round(reviewCompletionRate * 100),
            resolutionRate: Math.round(resolutionRate * 100)
        },
        components: {
            trustVelocity: {
                score: trustVelocity,
                weight: 0.30,
                detail: {
                    resolutionRate: Math.round(resolutionRate * 100),
                    incidentRate: Math.round(incidentRate * 100),
                    violations,
                    nearMisses,
                    resolvedIncidents,
                    totalIncidents
                }
            },
            interventionEffectiveness: {
                score: interventionEffectiveness,
                weight: 0.25,
                detail: {
                    reviewCompletionRate: Math.round(reviewCompletionRate * 100),
                    humanReviewRequired,
                    humanReviewCompleted,
                    pendingReviews: humanReviewRequired - humanReviewCompleted,
                    detectionScore: Math.round(detectionScore),
                    highStakesCount,
                    totalEvaluations
                }
            },
            alignmentAudit: {
                score: alignmentAudit,
                weight: 0.25,
                isRealScore: realAlignmentScore !== null
            },
            counterfactualValue: {
                score: counterfactualValue,
                weight: 0.20,
                detail: {
                    nearMissScore,
                    cleanRecord,
                    baselineCoverageBonus,
                    baselineEntryCount,
                    baselineFinancialTotal,
                    estimatedCostAvoided: baselineEntryCount > 0
                        ? Math.round((baselineFinancialTotal / Math.max(baselineEntryCount, 1)) * (nearMisses + 1))
                        : null
                }
            }
        },
        leadingIndicators,
        interpretation
    };
}

/**
 * Perform ethical lens analysis on a decision
 * @param {string} decisionSummary - Summary of the decision
 * @param {array} stakeholders - Affected parties
 * @param {array} options - Available options
 * @returns {object} - Analysis through each lens
 */
async function analyzeThroughLenses(decisionSummary, stakeholders = [], options = []) {
    const lenses = await getEthicalLenses();
    const analysis = {};

    for (const lens of lenses) {
        analysis[lens.short_name] = {
            lens: lens.name,
            keyQuestion: lens.key_question,
            considerations: generateLensConsiderations(lens, decisionSummary, stakeholders),
            recommendation: null  // To be filled by AI analysis
        };
    }

    return {
        decisionSummary,
        stakeholders,
        options,
        lensAnalysis: analysis,
        synthesisPrompt: generateSynthesisPrompt(analysis)
    };
}

/**
 * Generate considerations for a specific lens (template-based)
 */
function generateLensConsiderations(lens, decisionSummary, stakeholders) {
    const considerations = [];

    switch (lens.short_name) {
        case 'rights':
            considerations.push('What moral rights are at stake?');
            considerations.push('Is anyone being treated merely as a means?');
            considerations.push('Are dignity and autonomy being respected?');
            break;

        case 'justice':
            considerations.push('Are benefits and burdens distributed fairly?');
            considerations.push('Are similar cases being treated similarly?');
            considerations.push('Are there any discriminatory effects?');
            break;

        case 'utilitarian':
            considerations.push('What are the potential benefits for each stakeholder?');
            considerations.push('What are the potential harms?');
            considerations.push('Which option maximizes overall good?');
            break;

        case 'common_good':
            considerations.push('How does this affect shared interests?');
            considerations.push('Does this strengthen or weaken community bonds?');
            considerations.push('Are vulnerable members protected?');
            break;

        case 'virtue':
            considerations.push('What would a person of integrity do?');
            considerations.push('What character traits does this decision reflect?');
            considerations.push('Would I be proud to have this decision known?');
            break;

        case 'care_ethics':
            considerations.push('How are relationships affected?');
            considerations.push('Are the needs of those depending on us met?');
            considerations.push('Is empathy being shown to all parties?');
            break;
    }

    if (stakeholders.length > 0) {
        considerations.push(`Consider impact on: ${stakeholders.join(', ')}`);
    }

    return considerations;
}

/**
 * Generate synthesis prompt for AI to use
 */
function generateSynthesisPrompt(analysis) {
    return `
After analyzing through all six ethical lenses, synthesize your findings:

1. Which lens(es) point most clearly to the best option?
2. Where do the lenses conflict? How do you resolve this?
3. What is your overall recommendation?
4. What follow-up or monitoring is needed?

Apply the decision tests:
- Reversibility: Would this be acceptable if roles were reversed?
- Publicity: Would you be comfortable if this decision were made public?
- Golden Rule: Does this treat others as you would want to be treated?

Flag if this decision should be escalated for human review.`;
}

module.exports = {
    getEthicalLenses,
    getEthicalLens,
    detectStakesLevel,
    assembleEthicalContext,
    formatEthicalContext,
    logEthicalEvaluation,
    getEvaluationsForConversation,
    getPendingReviews,
    markEvaluationReviewed,
    logBrightLineIncident,
    getBrightLineIncidents,
    resolveBrightLineIncident,
    calculateIntegrityMetrics,
    analyzeThroughLenses,
    parseFinancialImpact,
    STAKES_LEVELS,
    STAKES_KEYWORDS
};
