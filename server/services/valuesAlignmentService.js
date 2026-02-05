/**
 * INSIGHT 360 - Values Alignment Service
 * Version: 1.0.0
 * Phase: 54 - Human Values Definition System
 *
 * Compares stated organizational values (from Soul Configuration)
 * against discovered values (from Align 120 assessments).
 * Calculates alignment scores, detects drift, and provides recommendations.
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * Alignment thresholds
 */
const ALIGNMENT_THRESHOLDS = {
    EXCELLENT: 90,
    GOOD: 75,
    MODERATE: 60,
    CONCERNING: 40,
    CRITICAL: 0
};

/**
 * Perform a values alignment audit
 * @param {string} orgId - Organization ID
 * @returns {object} - Alignment audit result
 */
async function performValuesAlignmentAudit(orgId) {
    // Get active soul configuration for the org
    const { data: soulConfig, error: soulError } = await supabase
        .from('soul_configurations')
        .select('id, values, version')
        .eq('org_id', orgId)
        .eq('scope_type', 'organization')
        .eq('is_active', true)
        .single();

    if (soulError && soulError.code !== 'PGRST116') throw soulError;

    // Get business fundamentals with discovered values
    const { data: fundamentals, error: fundError } = await supabase
        .from('business_fundamentals')
        .select('id, discovered_values, created_at, updated_at')
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    if (fundError && fundError.code !== 'PGRST116') throw fundError;

    // If either is missing, return incomplete status
    if (!soulConfig || !fundamentals) {
        return {
            status: 'incomplete',
            message: !soulConfig
                ? 'No active soul configuration found. Complete the Soul Configuration Wizard first.'
                : 'No discovered values found. Complete Align 120 Module 2 assessment first.',
            statedValues: soulConfig?.values || [],
            discoveredValues: fundamentals?.discovered_values || []
        };
    }

    const statedValues = soulConfig.values || [];
    const discoveredValues = fundamentals.discovered_values || [];

    // Calculate alignment scores
    const alignmentScores = calculateAlignmentScores(statedValues, discoveredValues);

    // Calculate overall score
    const overallScore = calculateOverallScore(alignmentScores);

    // Detect drift
    const driftAnalysis = detectValuesDrift(statedValues, discoveredValues);

    // Generate recommendations
    const recommendations = generateRecommendations(alignmentScores, driftAnalysis);

    // Create audit record
    const auditRecord = {
        org_id: orgId,
        soul_config_id: soulConfig.id,
        business_fundamentals_id: fundamentals.id,
        audit_date: new Date().toISOString().split('T')[0],
        stated_values: statedValues,
        discovered_values: discoveredValues,
        alignment_scores: alignmentScores,
        overall_score: overallScore,
        drift_detected: driftAnalysis.driftDetected,
        drift_details: driftAnalysis,
        recommendations
    };

    // Save audit record
    const { data: savedAudit, error: saveError } = await supabase
        .from('values_alignment_audits')
        .insert(auditRecord)
        .select()
        .single();

    if (saveError) {
        console.error('Failed to save audit record:', saveError);
    }

    return {
        status: 'complete',
        auditId: savedAudit?.id,
        auditDate: auditRecord.audit_date,
        statedValues,
        discoveredValues,
        alignmentScores,
        overallScore,
        driftAnalysis,
        recommendations,
        rating: getAlignmentRating(overallScore)
    };
}

/**
 * Calculate alignment score for each stated value
 * @param {array} statedValues - Values from soul configuration
 * @param {array} discoveredValues - Values from Align 120 assessment
 * @returns {array} - Per-value alignment scores
 */
function calculateAlignmentScores(statedValues, discoveredValues) {
    const scores = [];

    // Normalize discovered values for comparison
    const discoveredMap = new Map();
    for (const dv of discoveredValues) {
        const key = normalizeValueName(typeof dv === 'string' ? dv : dv.name || dv.value);
        const strength = typeof dv === 'object' ? (dv.strength || dv.score || 50) : 50;
        discoveredMap.set(key, { original: dv, strength });
    }

    // Score each stated value
    for (const stated of statedValues) {
        const statedName = stated.name || stated;
        const normalizedName = normalizeValueName(statedName);

        const score = {
            valueName: statedName,
            statedPriority: stated.priority || 'medium',
            isNonNegotiable: stated.non_negotiable || false,
            discovered: false,
            discoveredStrength: 0,
            alignmentScore: 0,
            gap: 'not_found',
            notes: []
        };

        // Check for exact or fuzzy match in discovered values
        const match = findBestMatch(normalizedName, discoveredMap);

        if (match) {
            score.discovered = true;
            score.discoveredStrength = match.strength;
            score.matchedDiscoveredValue = match.original;

            // Calculate alignment based on strength vs priority
            const priorityWeight = getPriorityWeight(stated.priority);
            const strengthNormalized = match.strength / 100;

            // Score is how well the discovered strength matches the stated priority
            if (stated.non_negotiable) {
                // Non-negotiable values need high discovered strength
                score.alignmentScore = strengthNormalized >= 0.7 ? 100 :
                                       strengthNormalized >= 0.5 ? 70 :
                                       strengthNormalized >= 0.3 ? 40 : 20;
            } else {
                // Regular values are scored based on discovery strength
                score.alignmentScore = Math.round(strengthNormalized * 100);
            }

            // Determine gap
            if (score.alignmentScore >= 80) {
                score.gap = 'aligned';
                score.notes.push('Value is strongly present in organizational culture');
            } else if (score.alignmentScore >= 60) {
                score.gap = 'moderate';
                score.notes.push('Value is present but could be strengthened');
            } else if (score.alignmentScore >= 40) {
                score.gap = 'significant';
                score.notes.push('Gap between stated and practiced value');
            } else {
                score.gap = 'critical';
                score.notes.push('Major disconnect between stated and practiced value');
            }
        } else {
            // Value not discovered in assessment
            score.alignmentScore = 0;
            score.gap = 'not_found';

            if (stated.non_negotiable) {
                score.notes.push('CRITICAL: Non-negotiable value not observed in practice');
            } else {
                score.notes.push('Stated value not identified in organizational assessment');
            }
        }

        scores.push(score);
    }

    // Check for discovered values not in stated values
    const statedNormalized = new Set(statedValues.map(v =>
        normalizeValueName(v.name || v)
    ));

    for (const [key, discovered] of discoveredMap) {
        if (!statedNormalized.has(key)) {
            scores.push({
                valueName: typeof discovered.original === 'string'
                    ? discovered.original
                    : discovered.original.name || discovered.original.value,
                statedPriority: null,
                isNonNegotiable: false,
                discovered: true,
                discoveredStrength: discovered.strength,
                alignmentScore: null,
                gap: 'unstated',
                notes: ['Value observed in practice but not stated in soul configuration']
            });
        }
    }

    return scores;
}

/**
 * Normalize value name for comparison
 */
function normalizeValueName(name) {
    if (!name) return '';
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

/**
 * Find best match for a value name in discovered values
 */
function findBestMatch(normalizedName, discoveredMap) {
    // Exact match
    if (discoveredMap.has(normalizedName)) {
        return discoveredMap.get(normalizedName);
    }

    // Fuzzy match - check for substring or similar
    for (const [key, value] of discoveredMap) {
        // Check if one contains the other
        if (normalizedName.includes(key) || key.includes(normalizedName)) {
            return value;
        }

        // Check for synonyms
        if (areValuesSynonymous(normalizedName, key)) {
            return value;
        }
    }

    return null;
}

/**
 * Check if two values are synonymous
 */
function areValuesSynonymous(val1, val2) {
    const synonymGroups = [
        ['integrity', 'honesty', 'ethics', 'ethical'],
        ['innovation', 'creativity', 'inventive'],
        ['collaboration', 'teamwork', 'cooperation'],
        ['excellence', 'quality', 'highstandards'],
        ['respect', 'dignity', 'inclusive'],
        ['accountability', 'responsibility', 'ownership'],
        ['transparency', 'openness', 'honesty'],
        ['customer', 'client', 'customerfocus', 'customercentr'],
        ['trust', 'reliability', 'dependable'],
        ['growth', 'learning', 'development']
    ];

    for (const group of synonymGroups) {
        const inGroup1 = group.some(syn => val1.includes(syn) || syn.includes(val1));
        const inGroup2 = group.some(syn => val2.includes(syn) || syn.includes(val2));
        if (inGroup1 && inGroup2) return true;
    }

    return false;
}

/**
 * Get weight for priority level
 */
function getPriorityWeight(priority) {
    switch (priority) {
        case 'critical':
        case 'highest':
            return 1.0;
        case 'high':
            return 0.8;
        case 'medium':
            return 0.6;
        case 'low':
            return 0.4;
        default:
            return 0.5;
    }
}

/**
 * Calculate overall alignment score
 */
function calculateOverallScore(alignmentScores) {
    const scoredValues = alignmentScores.filter(
        s => s.alignmentScore !== null && s.gap !== 'unstated'
    );

    if (scoredValues.length === 0) return 0;

    // Weight by non-negotiable status
    let totalWeight = 0;
    let weightedSum = 0;

    for (const score of scoredValues) {
        const weight = score.isNonNegotiable ? 2 : 1;
        weightedSum += score.alignmentScore * weight;
        totalWeight += weight;
    }

    return Math.round(weightedSum / totalWeight);
}

/**
 * Detect drift between stated and discovered values
 */
function detectValuesDrift(statedValues, discoveredValues) {
    const analysis = {
        driftDetected: false,
        driftSeverity: 'none',
        summary: [],
        details: {
            missingValues: [],
            weakValues: [],
            unstatedValues: [],
            strongAlignment: []
        }
    };

    const discoveredMap = new Map();
    for (const dv of discoveredValues) {
        const key = normalizeValueName(typeof dv === 'string' ? dv : dv.name || dv.value);
        const strength = typeof dv === 'object' ? (dv.strength || dv.score || 50) : 50;
        discoveredMap.set(key, strength);
    }

    // Check each stated value
    for (const stated of statedValues) {
        const name = stated.name || stated;
        const normalized = normalizeValueName(name);
        const strength = discoveredMap.get(normalized);

        if (strength === undefined) {
            // Value not found
            analysis.details.missingValues.push({
                value: name,
                isNonNegotiable: stated.non_negotiable || false
            });
        } else if (strength < 40) {
            // Value is weak
            analysis.details.weakValues.push({
                value: name,
                discoveredStrength: strength,
                isNonNegotiable: stated.non_negotiable || false
            });
        } else if (strength >= 70) {
            // Strong alignment
            analysis.details.strongAlignment.push({
                value: name,
                discoveredStrength: strength
            });
        }
    }

    // Check for unstated but discovered values
    const statedNormalized = new Set(statedValues.map(v =>
        normalizeValueName(v.name || v)
    ));

    for (const [key, strength] of discoveredMap) {
        if (!statedNormalized.has(key) && strength >= 60) {
            const original = discoveredValues.find(dv =>
                normalizeValueName(typeof dv === 'string' ? dv : dv.name || dv.value) === key
            );
            analysis.details.unstatedValues.push({
                value: typeof original === 'string' ? original : original?.name || key,
                discoveredStrength: strength
            });
        }
    }

    // Determine drift severity
    const missingCount = analysis.details.missingValues.length;
    const weakCount = analysis.details.weakValues.length;
    const missingNonNegotiable = analysis.details.missingValues.filter(v => v.isNonNegotiable).length;
    const weakNonNegotiable = analysis.details.weakValues.filter(v => v.isNonNegotiable).length;

    if (missingNonNegotiable > 0 || weakNonNegotiable > 0) {
        analysis.driftDetected = true;
        analysis.driftSeverity = 'critical';
        analysis.summary.push('Critical: Non-negotiable values are missing or weak in practice');
    } else if (missingCount >= 2 || weakCount >= 3) {
        analysis.driftDetected = true;
        analysis.driftSeverity = 'high';
        analysis.summary.push('High drift: Multiple values not observed or weak in practice');
    } else if (missingCount >= 1 || weakCount >= 2) {
        analysis.driftDetected = true;
        analysis.driftSeverity = 'moderate';
        analysis.summary.push('Moderate drift: Some values need attention');
    } else if (weakCount >= 1) {
        analysis.driftDetected = true;
        analysis.driftSeverity = 'low';
        analysis.summary.push('Low drift: Minor gaps detected');
    } else {
        analysis.summary.push('No significant drift detected');
    }

    // Add unstated values observation
    if (analysis.details.unstatedValues.length > 0) {
        analysis.summary.push(
            `${analysis.details.unstatedValues.length} strong value(s) observed but not stated in soul configuration`
        );
    }

    return analysis;
}

/**
 * Generate recommendations based on alignment analysis
 */
function generateRecommendations(alignmentScores, driftAnalysis) {
    const recommendations = [];

    // Address missing values
    for (const missing of driftAnalysis.details.missingValues) {
        recommendations.push({
            priority: missing.isNonNegotiable ? 'critical' : 'high',
            category: 'missing_value',
            value: missing.value,
            recommendation: missing.isNonNegotiable
                ? `URGENT: "${missing.value}" is a non-negotiable value but not observed in practice. Investigate root causes and implement culture initiatives.`
                : `"${missing.value}" is stated but not observed. Consider whether it's truly a core value or needs reinforcement.`
        });
    }

    // Address weak values
    for (const weak of driftAnalysis.details.weakValues) {
        recommendations.push({
            priority: weak.isNonNegotiable ? 'critical' : 'medium',
            category: 'weak_value',
            value: weak.value,
            currentStrength: weak.discoveredStrength,
            recommendation: `"${weak.value}" shows only ${weak.discoveredStrength}% strength. Consider leadership modeling, recognition programs, or process changes.`
        });
    }

    // Address unstated values
    for (const unstated of driftAnalysis.details.unstatedValues) {
        recommendations.push({
            priority: 'low',
            category: 'unstated_value',
            value: unstated.value,
            discoveredStrength: unstated.discoveredStrength,
            recommendation: `"${unstated.value}" is strongly present (${unstated.discoveredStrength}%) but not in soul configuration. Consider adding it to capture actual culture.`
        });
    }

    // Add general recommendations based on overall state
    if (driftAnalysis.driftSeverity === 'critical') {
        recommendations.push({
            priority: 'critical',
            category: 'general',
            recommendation: 'Schedule urgent values workshop with leadership team. Significant gap between stated values and organizational practice.'
        });
    } else if (driftAnalysis.driftSeverity === 'high') {
        recommendations.push({
            priority: 'high',
            category: 'general',
            recommendation: 'Include values alignment in next strategic planning session. Multiple areas need attention.'
        });
    } else if (driftAnalysis.details.strongAlignment.length >= 3) {
        recommendations.push({
            priority: 'info',
            category: 'positive',
            recommendation: `Strong alignment observed in ${driftAnalysis.details.strongAlignment.length} core values. Continue reinforcing these through recognition and storytelling.`
        });
    }

    // Sort by priority
    const priorityOrder = ['critical', 'high', 'medium', 'low', 'info'];
    recommendations.sort((a, b) =>
        priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
    );

    return recommendations;
}

/**
 * Get rating label for alignment score
 */
function getAlignmentRating(score) {
    if (score >= ALIGNMENT_THRESHOLDS.EXCELLENT) return { label: 'Excellent', color: 'green' };
    if (score >= ALIGNMENT_THRESHOLDS.GOOD) return { label: 'Good', color: 'blue' };
    if (score >= ALIGNMENT_THRESHOLDS.MODERATE) return { label: 'Moderate', color: 'yellow' };
    if (score >= ALIGNMENT_THRESHOLDS.CONCERNING) return { label: 'Concerning', color: 'orange' };
    return { label: 'Critical', color: 'red' };
}

/**
 * Get historical audits for an organization
 * @param {string} orgId - Organization ID
 * @param {number} limit - Number of records to return
 * @returns {array} - Historical audit records
 */
async function getAuditHistory(orgId, limit = 10) {
    const { data, error } = await supabase
        .from('values_alignment_audits')
        .select('*')
        .eq('org_id', orgId)
        .order('audit_date', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

/**
 * Get trend analysis over time
 * @param {string} orgId - Organization ID
 * @param {number} months - Number of months to analyze
 * @returns {object} - Trend analysis
 */
async function getAlignmentTrend(orgId, months = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data: audits, error } = await supabase
        .from('values_alignment_audits')
        .select('audit_date, overall_score, drift_detected')
        .eq('org_id', orgId)
        .gte('audit_date', startDate.toISOString().split('T')[0])
        .order('audit_date', { ascending: true });

    if (error) throw error;
    if (!audits || audits.length < 2) {
        return { trend: 'insufficient_data', data: audits };
    }

    // Calculate trend
    const firstScore = audits[0].overall_score;
    const lastScore = audits[audits.length - 1].overall_score;
    const change = lastScore - firstScore;

    let trend = 'stable';
    if (change > 10) trend = 'improving';
    else if (change < -10) trend = 'declining';

    // Calculate average
    const avgScore = Math.round(
        audits.reduce((sum, a) => sum + a.overall_score, 0) / audits.length
    );

    return {
        trend,
        change,
        averageScore: avgScore,
        dataPoints: audits.length,
        data: audits.map(a => ({
            date: a.audit_date,
            score: a.overall_score,
            driftDetected: a.drift_detected
        }))
    };
}

/**
 * Compare alignment with industry benchmarks (placeholder)
 * @param {string} orgId - Organization ID
 * @param {string} industry - Industry category
 * @returns {object} - Benchmark comparison
 */
async function compareWithBenchmarks(orgId, industry) {
    // In a full implementation, this would compare against anonymized
    // aggregate data from similar organizations.

    // For now, return placeholder benchmarks
    const benchmarks = {
        industry: industry || 'general',
        averageScore: 72,
        topQuartile: 85,
        bottomQuartile: 55,
        note: 'Benchmark data is illustrative. Full benchmarking requires broader data collection.'
    };

    // Get latest org score
    const { data: latestAudit } = await supabase
        .from('values_alignment_audits')
        .select('overall_score')
        .eq('org_id', orgId)
        .order('audit_date', { ascending: false })
        .limit(1)
        .single();

    if (latestAudit) {
        const score = latestAudit.overall_score;
        benchmarks.orgScore = score;
        benchmarks.percentile = score >= benchmarks.topQuartile ? 'top 25%' :
                               score >= benchmarks.averageScore ? 'above average' :
                               score >= benchmarks.bottomQuartile ? 'below average' :
                               'bottom 25%';
    }

    return benchmarks;
}

/**
 * Generate values radar chart data
 * @param {array} alignmentScores - Alignment scores from audit
 * @returns {object} - Radar chart data
 */
function generateRadarChartData(alignmentScores) {
    // Filter to stated values only (exclude unstated)
    const statedScores = alignmentScores.filter(s => s.gap !== 'unstated');

    return {
        labels: statedScores.map(s => s.valueName),
        datasets: [
            {
                label: 'Stated (Target)',
                data: statedScores.map(s => {
                    // Priority maps to target level
                    const priority = s.statedPriority || 'medium';
                    return priority === 'critical' || priority === 'highest' ? 100 :
                           priority === 'high' ? 85 :
                           priority === 'medium' ? 70 :
                           55;
                }),
                borderColor: 'rgba(59, 130, 246, 0.8)',
                backgroundColor: 'rgba(59, 130, 246, 0.2)'
            },
            {
                label: 'Discovered (Actual)',
                data: statedScores.map(s => s.discoveredStrength || 0),
                borderColor: 'rgba(16, 185, 129, 0.8)',
                backgroundColor: 'rgba(16, 185, 129, 0.2)'
            }
        ]
    };
}

module.exports = {
    performValuesAlignmentAudit,
    calculateAlignmentScores,
    calculateOverallScore,
    detectValuesDrift,
    generateRecommendations,
    getAlignmentRating,
    getAuditHistory,
    getAlignmentTrend,
    compareWithBenchmarks,
    generateRadarChartData,
    ALIGNMENT_THRESHOLDS
};
