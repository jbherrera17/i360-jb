/**
 * INSIGHT 360 - Strategy-to-Execution (S2E) Service
 * Version: 1.0.0
 *
 * Business logic for S2E module including:
 * - Strategic foundation hierarchy management
 * - Strategy map assembly
 * - Alignment reporting
 * - Health scoring algorithms
 * - Strategy health analysis
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PERSPECTIVES = [
    {
        name: 'Financial',
        perspective_type: 'financial',
        guiding_question: 'How must we perform financially to sustain the mission?',
        icon: 'banknote',
        color: '#10b981',
        sort_order: 1
    },
    {
        name: 'Customer & Stakeholder',
        perspective_type: 'customer',
        guiding_question: 'Who must trust us, and why?',
        icon: 'users',
        color: '#3b82f6',
        sort_order: 2
    },
    {
        name: 'Internal Processes',
        perspective_type: 'internal_process',
        guiding_question: 'What must we excel at operationally?',
        icon: 'settings',
        color: '#f59e0b',
        sort_order: 3
    },
    {
        name: 'Learning & Growth',
        perspective_type: 'learning_growth',
        guiding_question: 'What capabilities must we build next?',
        icon: 'graduation-cap',
        color: '#8b5cf6',
        sort_order: 4
    }
];

const HEALTH_THRESHOLDS = {
    DRIFT_PROGRESS_THRESHOLD: 30,    // OKR progress below this when period > 50% = drift
    DRIFT_PERIOD_THRESHOLD: 50,      // % through period before drift detection kicks in
    OVERLOAD_OKR_COUNT: 5,           // More than this many OKRs per objective = overload
    LOW_ALIGNMENT_THRESHOLD: 50,     // Alignment score below this = concern
    AT_RISK_PROGRESS_THRESHOLD: 40   // Progress below this = at-risk
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate strategic foundation data
 * @param {Object} data - Foundation data
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validateFoundation(data) {
    const errors = [];

    if (!data.vision?.trim()) {
        errors.push('Vision is required');
    }
    if (!data.mission?.trim()) {
        errors.push('Mission is required');
    }
    if (!data.planning_period?.trim()) {
        errors.push('Planning period is required');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validate strategic theme data
 * @param {Object} data - Theme data
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validateTheme(data) {
    const errors = [];

    if (!data.foundation_id) {
        errors.push('Foundation ID is required');
    }
    if (!data.name?.trim()) {
        errors.push('Name is required');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validate BSC perspective data
 * @param {Object} data - Perspective data
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validatePerspective(data) {
    const errors = [];
    const validTypes = ['financial', 'customer', 'internal_process', 'learning_growth'];

    if (!data.foundation_id) {
        errors.push('Foundation ID is required');
    }
    if (!data.name?.trim()) {
        errors.push('Name is required');
    }
    if (!data.perspective_type) {
        errors.push('Perspective type is required');
    } else if (!validTypes.includes(data.perspective_type)) {
        errors.push(`Invalid perspective type. Must be one of: ${validTypes.join(', ')}`);
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validate BSC objective data
 * @param {Object} data - Objective data
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validateObjective(data) {
    const errors = [];

    if (!data.perspective_id) {
        errors.push('Perspective ID is required');
    }
    if (!data.name?.trim()) {
        errors.push('Name is required');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validate OKR strategic link data
 * @param {Object} data - Link data
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validateOKRLink(data) {
    const errors = [];
    const validLinkTypes = ['supports', 'measures', 'enables', 'validates'];

    if (!data.okr_id) {
        errors.push('OKR ID is required');
    }
    if (!data.bsc_objective_id) {
        errors.push('BSC Objective ID is required');
    }
    if (data.link_type && !validLinkTypes.includes(data.link_type)) {
        errors.push(`Invalid link type. Must be one of: ${validLinkTypes.join(', ')}`);
    }
    if (data.alignment_score !== undefined) {
        if (data.alignment_score < 0 || data.alignment_score > 100) {
            errors.push('Alignment score must be between 0 and 100');
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validate key result indicator data
 * @param {Object} data - Indicator data
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validateIndicator(data) {
    const errors = [];
    const validTypes = ['leading', 'lagging'];

    if (!data.okr_id) {
        errors.push('OKR ID is required');
    }
    if (data.key_result_index === undefined || data.key_result_index === null) {
        errors.push('Key result index is required');
    }
    if (!data.indicator_type) {
        errors.push('Indicator type is required');
    } else if (!validTypes.includes(data.indicator_type)) {
        errors.push(`Invalid indicator type. Must be one of: ${validTypes.join(', ')}`);
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validate health check data
 * @param {Object} data - Health check data
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validateHealthCheck(data) {
    const errors = [];
    const validCheckTypes = ['monthly', 'quarterly', 'annual', 'adhoc'];

    if (!data.foundation_id) {
        errors.push('Foundation ID is required');
    }
    if (!data.check_type) {
        errors.push('Check type is required');
    } else if (!validCheckTypes.includes(data.check_type)) {
        errors.push(`Invalid check type. Must be one of: ${validCheckTypes.join(', ')}`);
    }

    // Validate scores if provided
    ['alignment_score', 'execution_score', 'learning_score'].forEach(field => {
        if (data[field] !== undefined && data[field] !== null) {
            if (data[field] < 0 || data[field] > 100) {
                errors.push(`${field} must be between 0 and 100`);
            }
        }
    });

    return { valid: errors.length === 0, errors };
}

// ============================================================================
// FOUNDATION & HIERARCHY FUNCTIONS
// ============================================================================

/**
 * Get the current foundation with full hierarchy
 * @param {string} userId - User ID
 * @returns {Object|null} - Foundation with themes, perspectives, and objectives
 */
async function getCurrentFoundationWithHierarchy(userId) {
    // Get current foundation
    const { data: foundation, error: foundationError } = await supabase
        .from('strategic_foundations')
        .select('*')
        .eq('is_current', true)
        .single();

    if (foundationError && foundationError.code !== 'PGRST116') {
        throw foundationError;
    }

    if (!foundation) {
        return null;
    }

    // Get related themes
    const { data: themes } = await supabase
        .from('strategic_themes')
        .select('*')
        .eq('foundation_id', foundation.id)
        .eq('is_active', true)
        .order('sort_order');

    // Get perspectives with objectives
    const { data: perspectives } = await supabase
        .from('bsc_perspectives')
        .select('*')
        .eq('foundation_id', foundation.id)
        .order('sort_order');

    // Get objectives for each perspective
    const perspectivesWithObjectives = await Promise.all(
        (perspectives || []).map(async (perspective) => {
            const { data: objectives } = await supabase
                .from('bsc_objectives')
                .select('*, strategic_themes(name, color)')
                .eq('perspective_id', perspective.id)
                .order('sort_order');

            return {
                ...perspective,
                objectives: objectives || []
            };
        })
    );

    return {
        ...foundation,
        themes: themes || [],
        perspectives: perspectivesWithObjectives
    };
}

/**
 * Atomically set a foundation as current (unsetting any existing current)
 * @param {string} userId - User ID
 * @param {string} foundationId - Foundation ID to set as current
 * @returns {Object} - Updated foundation
 */
async function setCurrentFoundation(userId, foundationId) {
    // Unset any existing current foundation for this user
    await supabase
        .from('strategic_foundations')
        .update({ is_current: false })
        .eq('user_id', userId)
        .eq('is_current', true);

    // If no foundationId provided, just unset existing (used before creating new)
    if (!foundationId) {
        return null;
    }

    // Set the new foundation as current
    const { data, error } = await supabase
        .from('strategic_foundations')
        .update({ is_current: true })
        .eq('id', foundationId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Initialize default BSC perspectives for a foundation
 * @param {string} userId - User ID
 * @param {string} foundationId - Foundation ID
 * @returns {Array} - Created perspectives
 */
async function initializeDefaultPerspectives(userId, foundationId) {
    const perspectivesToInsert = DEFAULT_PERSPECTIVES.map(p => ({
        ...p,
        user_id: userId,
        foundation_id: foundationId
    }));

    const { data, error } = await supabase
        .from('bsc_perspectives')
        .insert(perspectivesToInsert)
        .select();

    if (error) throw error;
    return data;
}

// ============================================================================
// OKR LINK MANAGEMENT
// ============================================================================

/**
 * Atomically set a primary OKR link (unsetting any existing primary for that OKR)
 * @param {string} userId - User ID
 * @param {string} okrId - OKR ID
 * @param {string} linkId - Link ID to set as primary
 * @returns {Object} - Updated link
 */
async function setPrimaryOKRLink(userId, okrId, linkId) {
    // Unset any existing primary links for this OKR
    await supabase
        .from('okr_strategic_links')
        .update({ is_primary: false })
        .eq('okr_id', okrId);

    // Set the new link as primary
    const { data, error } = await supabase
        .from('okr_strategic_links')
        .update({ is_primary: true })
        .eq('id', linkId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get strategic links for an OKR with objective details
 * @param {string} okrId - OKR ID
 * @returns {Array} - Strategic links with objective info
 */
async function getStrategicLinksForOKR(okrId) {
    const { data, error } = await supabase
        .from('okr_strategic_links')
        .select(`
            *,
            bsc_objectives(
                id,
                name,
                description,
                bsc_perspectives(
                    id,
                    name,
                    perspective_type,
                    color
                )
            )
        `)
        .eq('okr_id', okrId)
        .order('is_primary', { ascending: false });

    if (error) throw error;

    return (data || []).map(link => ({
        id: link.id,
        objective_id: link.bsc_objective_id,
        objective_name: link.bsc_objectives?.name,
        objective_description: link.bsc_objectives?.description,
        perspective_id: link.bsc_objectives?.bsc_perspectives?.id,
        perspective_name: link.bsc_objectives?.bsc_perspectives?.name,
        perspective_type: link.bsc_objectives?.bsc_perspectives?.perspective_type,
        perspective_color: link.bsc_objectives?.bsc_perspectives?.color,
        link_type: link.link_type,
        is_primary: link.is_primary,
        alignment_score: link.alignment_score,
        contribution_description: link.contribution_description
    }));
}

// ============================================================================
// STRATEGY MAP
// ============================================================================

/**
 * Build complete strategy map with OKR links and progress
 * @param {string} userId - User ID
 * @returns {Object|null} - Strategy map data
 */
async function buildStrategyMap(userId) {
    // Get current foundation
    const { data: foundation } = await supabase
        .from('strategic_foundations')
        .select('*')
        .eq('is_current', true)
        .single();

    if (!foundation) {
        return null;
    }

    // Get themes
    const { data: themes } = await supabase
        .from('strategic_themes')
        .select('*')
        .eq('foundation_id', foundation.id)
        .eq('is_active', true)
        .order('sort_order');

    // Get perspectives with objectives
    const { data: perspectives } = await supabase
        .from('bsc_perspectives')
        .select('*')
        .eq('foundation_id', foundation.id)
        .order('sort_order');

    const perspectivesWithData = await Promise.all(
        (perspectives || []).map(async (perspective) => {
            const { data: objectives } = await supabase
                .from('bsc_objectives')
                .select('*')
                .eq('perspective_id', perspective.id)
                .order('sort_order');

            // Get linked OKRs for each objective
            const objectivesWithOKRs = await Promise.all(
                (objectives || []).map(async (obj) => {
                    const { data: links } = await supabase
                        .from('okr_strategic_links')
                        .select('*, okrs(id, title, progress, status, period, start_date, end_date)')
                        .eq('bsc_objective_id', obj.id);

                    const linkedOKRs = (links || []).map(l => ({
                        ...l.okrs,
                        link_id: l.id,
                        link_type: l.link_type,
                        is_primary: l.is_primary,
                        alignment_score: l.alignment_score
                    }));

                    // Calculate metrics
                    const avgProgress = linkedOKRs.length > 0
                        ? Math.round(linkedOKRs.reduce((sum, o) => sum + (o.progress || 0), 0) / linkedOKRs.length)
                        : null;

                    const avgAlignmentScore = linkedOKRs.length > 0
                        ? Math.round(linkedOKRs.reduce((sum, o) => sum + (o.alignment_score || 100), 0) / linkedOKRs.length)
                        : null;

                    return {
                        ...obj,
                        linked_okrs: linkedOKRs,
                        okr_count: linkedOKRs.length,
                        avg_progress: avgProgress,
                        avg_alignment_score: avgAlignmentScore,
                        causes: obj.causes || [],
                        effects: obj.effects || []
                    };
                })
            );

            // Calculate perspective-level metrics
            const totalOKRs = objectivesWithOKRs.reduce((sum, o) => sum + o.okr_count, 0);
            const avgPerspectiveProgress = objectivesWithOKRs.length > 0
                ? Math.round(
                    objectivesWithOKRs
                        .filter(o => o.avg_progress !== null)
                        .reduce((sum, o) => sum + o.avg_progress, 0) /
                    objectivesWithOKRs.filter(o => o.avg_progress !== null).length || 0
                )
                : null;

            return {
                ...perspective,
                objectives: objectivesWithOKRs,
                total_okrs: totalOKRs,
                avg_progress: avgPerspectiveProgress
            };
        })
    );

    // Calculate foundation-level metrics
    const totalLinkedOKRs = perspectivesWithData.reduce((sum, p) => sum + p.total_okrs, 0);
    const foundationAvgProgress = perspectivesWithData.length > 0
        ? Math.round(
            perspectivesWithData
                .filter(p => p.avg_progress !== null)
                .reduce((sum, p) => sum + p.avg_progress, 0) /
            perspectivesWithData.filter(p => p.avg_progress !== null).length || 0
        )
        : null;

    return {
        foundation: {
            ...foundation,
            total_linked_okrs: totalLinkedOKRs,
            avg_progress: foundationAvgProgress
        },
        themes: themes || [],
        perspectives: perspectivesWithData
    };
}

// ============================================================================
// ALIGNMENT REPORT
// ============================================================================

/**
 * Generate comprehensive OKR alignment report
 * @param {string} userId - User ID
 * @returns {Object} - Alignment report with summary and OKR details
 */
async function generateAlignmentReport(userId) {
    // Get all OKRs
    const { data: okrs } = await supabase
        .from('okrs')
        .select('*, departments(name)')
        .order('created_at', { ascending: false });

    // Get all strategic links
    const { data: links } = await supabase
        .from('okr_strategic_links')
        .select('*, bsc_objectives(name, bsc_perspectives(perspective_type, name))');

    // Get all indicators
    const { data: indicators } = await supabase
        .from('key_result_indicators')
        .select('*');

    // Build alignment report
    const report = (okrs || []).map(okr => {
        const okrLinks = (links || []).filter(l => l.okr_id === okr.id);
        const okrIndicators = (indicators || []).filter(i => i.okr_id === okr.id);

        const leadingCount = okrIndicators.filter(i => i.indicator_type === 'leading').length;
        const laggingCount = okrIndicators.filter(i => i.indicator_type === 'lagging').length;

        // Calculate weighted alignment score
        const avgAlignmentScore = okrLinks.length > 0
            ? Math.round(okrLinks.reduce((sum, l) => sum + (l.alignment_score || 100), 0) / okrLinks.length)
            : null;

        // Group links by perspective
        const linksByPerspective = {};
        okrLinks.forEach(l => {
            const perspType = l.bsc_objectives?.bsc_perspectives?.perspective_type;
            if (perspType) {
                if (!linksByPerspective[perspType]) {
                    linksByPerspective[perspType] = [];
                }
                linksByPerspective[perspType].push(l);
            }
        });

        return {
            okr_id: okr.id,
            title: okr.title,
            scope: okr.scope,
            period: okr.period,
            progress: okr.progress,
            status: okr.status,
            department: okr.departments?.name,
            start_date: okr.start_date,
            end_date: okr.end_date,
            is_strategically_linked: okrLinks.length > 0,
            link_count: okrLinks.length,
            avg_alignment_score: avgAlignmentScore,
            linked_objectives: okrLinks.map(l => ({
                id: l.bsc_objective_id,
                name: l.bsc_objectives?.name,
                perspective: l.bsc_objectives?.bsc_perspectives?.perspective_type,
                perspective_name: l.bsc_objectives?.bsc_perspectives?.name,
                link_type: l.link_type,
                is_primary: l.is_primary,
                alignment_score: l.alignment_score
            })),
            links_by_perspective: linksByPerspective,
            indicator_balance: {
                leading: leadingCount,
                lagging: laggingCount,
                total: leadingCount + laggingCount,
                ratio: laggingCount > 0 ? (leadingCount / laggingCount).toFixed(2) : null
            }
        };
    });

    // Calculate summary stats
    const linkedOKRs = report.filter(r => r.is_strategically_linked);
    const unlinkedOKRs = report.filter(r => !r.is_strategically_linked);

    // Count OKRs per perspective
    const okrsByPerspective = {
        financial: 0,
        customer: 0,
        internal_process: 0,
        learning_growth: 0
    };
    linkedOKRs.forEach(r => {
        Object.keys(r.links_by_perspective).forEach(perspType => {
            if (okrsByPerspective.hasOwnProperty(perspType)) {
                okrsByPerspective[perspType]++;
            }
        });
    });

    // Calculate average alignment score across all linked OKRs
    const overallAlignmentScore = linkedOKRs.length > 0
        ? Math.round(linkedOKRs.reduce((sum, r) => sum + (r.avg_alignment_score || 100), 0) / linkedOKRs.length)
        : 0;

    return {
        summary: {
            total_okrs: report.length,
            linked: linkedOKRs.length,
            unlinked: unlinkedOKRs.length,
            alignment_rate: report.length > 0
                ? Math.round((linkedOKRs.length / report.length) * 100)
                : 0,
            avg_alignment_score: overallAlignmentScore,
            okrs_by_perspective: okrsByPerspective
        },
        okrs: report
    };
}

// ============================================================================
// HEALTH SCORING ALGORITHMS
// ============================================================================

/**
 * Calculate alignment score for a foundation
 * Based on: % of OKRs linked to strategy, weighted by link alignment scores
 * @param {string} foundationId - Foundation ID
 * @returns {number} - Alignment score (0-100)
 */
async function calculateAlignmentScore(foundationId) {
    // Get all objectives for this foundation
    const { data: perspectives } = await supabase
        .from('bsc_perspectives')
        .select('id')
        .eq('foundation_id', foundationId);

    if (!perspectives || perspectives.length === 0) {
        return 0;
    }

    const perspectiveIds = perspectives.map(p => p.id);

    // Get all objectives for these perspectives
    const { data: objectives } = await supabase
        .from('bsc_objectives')
        .select('id')
        .in('perspective_id', perspectiveIds);

    if (!objectives || objectives.length === 0) {
        return 0;
    }

    const objectiveIds = objectives.map(o => o.id);

    // Get all links for these objectives
    const { data: links } = await supabase
        .from('okr_strategic_links')
        .select('okr_id, alignment_score')
        .in('bsc_objective_id', objectiveIds);

    // Get total OKR count
    const { count: totalOKRs } = await supabase
        .from('okrs')
        .select('*', { count: 'exact', head: true });

    if (!totalOKRs || totalOKRs === 0) {
        return 0;
    }

    // Count unique linked OKRs
    const uniqueLinkedOKRs = new Set((links || []).map(l => l.okr_id));
    const linkedCount = uniqueLinkedOKRs.size;

    // Calculate base alignment rate
    const baseRate = (linkedCount / totalOKRs) * 100;

    // Calculate quality factor (average alignment score of links)
    const avgLinkScore = links && links.length > 0
        ? links.reduce((sum, l) => sum + (l.alignment_score || 100), 0) / links.length
        : 100;

    // Final score: base rate weighted by link quality
    const alignmentScore = Math.round((baseRate * avgLinkScore) / 100);

    return Math.min(100, Math.max(0, alignmentScore));
}

/**
 * Calculate execution score for a foundation
 * Based on: Average progress of linked OKRs, adjusted for at-risk items
 * @param {string} foundationId - Foundation ID
 * @returns {number} - Execution score (0-100)
 */
async function calculateExecutionScore(foundationId) {
    // Get all objectives for this foundation
    const { data: perspectives } = await supabase
        .from('bsc_perspectives')
        .select('id')
        .eq('foundation_id', foundationId);

    if (!perspectives || perspectives.length === 0) {
        return 0;
    }

    const perspectiveIds = perspectives.map(p => p.id);

    // Get all objectives
    const { data: objectives } = await supabase
        .from('bsc_objectives')
        .select('id')
        .in('perspective_id', perspectiveIds);

    if (!objectives || objectives.length === 0) {
        return 0;
    }

    const objectiveIds = objectives.map(o => o.id);

    // Get all links with OKR data
    const { data: links } = await supabase
        .from('okr_strategic_links')
        .select('okr_id, okrs(progress, status, start_date, end_date)')
        .in('bsc_objective_id', objectiveIds);

    if (!links || links.length === 0) {
        return 0;
    }

    // Calculate progress metrics
    const now = new Date();
    let totalProgress = 0;
    let atRiskCount = 0;
    let completedCount = 0;

    const uniqueOKRs = new Map();
    links.forEach(l => {
        if (l.okrs && !uniqueOKRs.has(l.okr_id)) {
            uniqueOKRs.set(l.okr_id, l.okrs);
        }
    });

    uniqueOKRs.forEach(okr => {
        totalProgress += okr.progress || 0;

        if (okr.status === 'completed') {
            completedCount++;
        } else if (okr.start_date && okr.end_date) {
            // Calculate period progress
            const start = new Date(okr.start_date);
            const end = new Date(okr.end_date);
            const totalDuration = end - start;
            const elapsed = now - start;
            const periodProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

            // Check if at-risk (behind schedule)
            if (periodProgress > HEALTH_THRESHOLDS.DRIFT_PERIOD_THRESHOLD &&
                (okr.progress || 0) < HEALTH_THRESHOLDS.AT_RISK_PROGRESS_THRESHOLD) {
                atRiskCount++;
            }
        }
    });

    const okrCount = uniqueOKRs.size;
    if (okrCount === 0) {
        return 0;
    }

    // Base score: average progress
    const baseScore = totalProgress / okrCount;

    // Apply at-risk penalty (up to 20% reduction)
    const atRiskRatio = atRiskCount / okrCount;
    const atRiskPenalty = atRiskRatio * 20;

    // Apply completion bonus (up to 10% boost)
    const completionRatio = completedCount / okrCount;
    const completionBonus = completionRatio * 10;

    const executionScore = Math.round(baseScore - atRiskPenalty + completionBonus);

    return Math.min(100, Math.max(0, executionScore));
}

/**
 * Calculate learning score for a foundation
 * Based on: Learning & Growth perspective OKR progress
 * @param {string} foundationId - Foundation ID
 * @returns {number} - Learning score (0-100)
 */
async function calculateLearningScore(foundationId) {
    // Get learning & growth perspective
    const { data: perspective } = await supabase
        .from('bsc_perspectives')
        .select('id')
        .eq('foundation_id', foundationId)
        .eq('perspective_type', 'learning_growth')
        .single();

    if (!perspective) {
        return 0;
    }

    // Get objectives for this perspective
    const { data: objectives } = await supabase
        .from('bsc_objectives')
        .select('id')
        .eq('perspective_id', perspective.id);

    if (!objectives || objectives.length === 0) {
        return 0;
    }

    const objectiveIds = objectives.map(o => o.id);

    // Get linked OKRs
    const { data: links } = await supabase
        .from('okr_strategic_links')
        .select('okr_id, okrs(progress, status)')
        .in('bsc_objective_id', objectiveIds);

    if (!links || links.length === 0) {
        return 0;
    }

    // Calculate average progress
    const uniqueOKRs = new Map();
    links.forEach(l => {
        if (l.okrs && !uniqueOKRs.has(l.okr_id)) {
            uniqueOKRs.set(l.okr_id, l.okrs);
        }
    });

    let totalProgress = 0;
    uniqueOKRs.forEach(okr => {
        totalProgress += okr.progress || 0;
    });

    const learningScore = uniqueOKRs.size > 0
        ? Math.round(totalProgress / uniqueOKRs.size)
        : 0;

    return Math.min(100, Math.max(0, learningScore));
}

/**
 * Calculate all health scores for a foundation
 * @param {string} foundationId - Foundation ID
 * @returns {Object} - { alignment_score, execution_score, learning_score }
 */
async function calculateHealthScores(foundationId) {
    const [alignmentScore, executionScore, learningScore] = await Promise.all([
        calculateAlignmentScore(foundationId),
        calculateExecutionScore(foundationId),
        calculateLearningScore(foundationId)
    ]);

    return {
        alignment_score: alignmentScore,
        execution_score: executionScore,
        learning_score: learningScore,
        overall_score: Math.round((alignmentScore + executionScore + learningScore) / 3)
    };
}

// ============================================================================
// HEALTH ANALYSIS ENGINE
// ============================================================================

/**
 * Analyze strategy health and detect issues
 * @param {string} foundationId - Foundation ID
 * @returns {Array} - Observations array with type, description, severity
 */
async function analyzeStrategyHealth(foundationId) {
    const observations = [];

    // Get foundation hierarchy
    const { data: perspectives } = await supabase
        .from('bsc_perspectives')
        .select('id, name, perspective_type')
        .eq('foundation_id', foundationId);

    if (!perspectives || perspectives.length === 0) {
        observations.push({
            type: 'gap',
            description: 'No BSC perspectives defined for this foundation',
            severity: 'high'
        });
        return observations;
    }

    // Check each perspective
    for (const perspective of perspectives) {
        const { data: objectives } = await supabase
            .from('bsc_objectives')
            .select('id, name')
            .eq('perspective_id', perspective.id);

        if (!objectives || objectives.length === 0) {
            observations.push({
                type: 'gap',
                description: `${perspective.name} perspective has no objectives defined`,
                severity: 'medium'
            });
            continue;
        }

        // Check each objective
        for (const objective of objectives) {
            const { data: links } = await supabase
                .from('okr_strategic_links')
                .select('okr_id, okrs(id, title, progress, status, start_date, end_date)')
                .eq('bsc_objective_id', objective.id);

            if (!links || links.length === 0) {
                observations.push({
                    type: 'gap',
                    description: `Objective "${objective.name}" has no linked OKRs`,
                    severity: 'low'
                });
                continue;
            }

            // Check for overload
            if (links.length > HEALTH_THRESHOLDS.OVERLOAD_OKR_COUNT) {
                observations.push({
                    type: 'overload',
                    description: `Objective "${objective.name}" has ${links.length} linked OKRs (recommended: ${HEALTH_THRESHOLDS.OVERLOAD_OKR_COUNT} or fewer)`,
                    severity: 'medium'
                });
            }

            // Check for drift in linked OKRs
            const now = new Date();
            for (const link of links) {
                const okr = link.okrs;
                if (!okr || !okr.start_date || !okr.end_date) continue;

                const start = new Date(okr.start_date);
                const end = new Date(okr.end_date);
                const totalDuration = end - start;
                const elapsed = now - start;
                const periodProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

                if (periodProgress > HEALTH_THRESHOLDS.DRIFT_PERIOD_THRESHOLD &&
                    (okr.progress || 0) < HEALTH_THRESHOLDS.DRIFT_PROGRESS_THRESHOLD) {
                    observations.push({
                        type: 'drift',
                        description: `OKR "${okr.title}" is ${Math.round(periodProgress)}% through its period but only ${okr.progress || 0}% complete`,
                        severity: 'high',
                        okr_id: okr.id,
                        objective_id: objective.id
                    });
                }
            }
        }
    }

    // Check for perspective imbalance
    const perspectiveOKRCounts = {};
    for (const perspective of perspectives) {
        const { data: objectives } = await supabase
            .from('bsc_objectives')
            .select('id')
            .eq('perspective_id', perspective.id);

        if (!objectives) continue;

        let totalOKRs = 0;
        for (const obj of objectives) {
            const { count } = await supabase
                .from('okr_strategic_links')
                .select('*', { count: 'exact', head: true })
                .eq('bsc_objective_id', obj.id);
            totalOKRs += count || 0;
        }
        perspectiveOKRCounts[perspective.perspective_type] = totalOKRs;
    }

    // Check if any perspective has 0 OKRs while others have many
    const maxOKRs = Math.max(...Object.values(perspectiveOKRCounts));
    if (maxOKRs > 0) {
        for (const [perspType, count] of Object.entries(perspectiveOKRCounts)) {
            if (count === 0) {
                const perspName = perspectives.find(p => p.perspective_type === perspType)?.name || perspType;
                observations.push({
                    type: 'gap',
                    description: `${perspName} perspective has no linked OKRs while other perspectives do`,
                    severity: 'medium'
                });
            }
        }
    }

    return observations;
}

/**
 * Generate recommendations based on observations
 * @param {Array} observations - Health observations
 * @returns {Array} - Recommendations array with action, priority, owner
 */
function generateRecommendations(observations) {
    const recommendations = [];

    const observationsByType = {
        drift: observations.filter(o => o.type === 'drift'),
        overload: observations.filter(o => o.type === 'overload'),
        gap: observations.filter(o => o.type === 'gap'),
        conflict: observations.filter(o => o.type === 'conflict')
    };

    // Drift recommendations
    if (observationsByType.drift.length > 0) {
        recommendations.push({
            action: `Review and update ${observationsByType.drift.length} OKR(s) that are behind schedule`,
            priority: 'high',
            category: 'execution'
        });

        if (observationsByType.drift.length > 3) {
            recommendations.push({
                action: 'Consider holding a strategy review meeting to address execution gaps',
                priority: 'high',
                category: 'governance'
            });
        }
    }

    // Overload recommendations
    if (observationsByType.overload.length > 0) {
        recommendations.push({
            action: `Simplify objectives with too many linked OKRs (${observationsByType.overload.length} objectives affected)`,
            priority: 'medium',
            category: 'planning'
        });
    }

    // Gap recommendations
    const severeGaps = observationsByType.gap.filter(o => o.severity === 'high' || o.severity === 'medium');
    if (severeGaps.length > 0) {
        recommendations.push({
            action: `Address ${severeGaps.length} strategic gap(s) by linking OKRs or defining objectives`,
            priority: 'medium',
            category: 'alignment'
        });
    }

    // General recommendations based on overall health
    if (observations.length === 0) {
        recommendations.push({
            action: 'Strategy appears healthy - continue monitoring and maintain current practices',
            priority: 'low',
            category: 'governance'
        });
    } else if (observations.filter(o => o.severity === 'high').length > 3) {
        recommendations.push({
            action: 'Multiple high-severity issues detected - schedule urgent strategy review',
            priority: 'high',
            category: 'governance'
        });
    }

    return recommendations;
}

/**
 * Generate a complete health check with scores, observations, and recommendations
 * @param {string} userId - User ID
 * @param {string} foundationId - Foundation ID
 * @param {string} checkType - Check type (monthly, quarterly, annual, adhoc)
 * @returns {Object} - Created health check record
 */
async function generateHealthCheck(userId, foundationId, checkType = 'adhoc') {
    // Calculate scores
    const scores = await calculateHealthScores(foundationId);

    // Analyze health
    const observations = await analyzeStrategyHealth(foundationId);

    // Generate recommendations
    const recommendations = generateRecommendations(observations);

    // Create health check record
    const { data, error } = await supabase
        .from('strategy_health_checks')
        .insert({
            user_id: userId,
            foundation_id: foundationId,
            check_date: new Date().toISOString().split('T')[0],
            check_type: checkType,
            alignment_score: scores.alignment_score,
            execution_score: scores.execution_score,
            learning_score: scores.learning_score,
            observations,
            recommendations,
            status: 'completed',
            completed_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw error;

    return {
        ...data,
        overall_score: scores.overall_score
    };
}

// ============================================================================
// CAUSE-EFFECT RELATIONSHIPS
// ============================================================================

/**
 * Update cause relationships for an objective
 * @param {string} objectiveId - Objective ID
 * @param {Array} causeIds - Array of objective IDs that cause this objective
 * @returns {Object} - Updated objective
 */
async function updateObjectiveCauses(objectiveId, causeIds) {
    const { data, error } = await supabase
        .from('bsc_objectives')
        .update({ causes: causeIds || [] })
        .eq('id', objectiveId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update effect relationships for an objective
 * @param {string} objectiveId - Objective ID
 * @param {Array} effectIds - Array of objective IDs that are effects of this objective
 * @returns {Object} - Updated objective
 */
async function updateObjectiveEffects(objectiveId, effectIds) {
    const { data, error } = await supabase
        .from('bsc_objectives')
        .update({ effects: effectIds || [] })
        .eq('id', objectiveId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get the causal chain for an objective (both causes and effects)
 * @param {string} objectiveId - Objective ID
 * @returns {Object} - { causes: [], effects: [] } with full objective details
 */
async function getObjectiveCausalChain(objectiveId) {
    const { data: objective, error } = await supabase
        .from('bsc_objectives')
        .select('causes, effects')
        .eq('id', objectiveId)
        .single();

    if (error) throw error;

    const causeIds = objective?.causes || [];
    const effectIds = objective?.effects || [];

    // Fetch full details for causes
    let causes = [];
    if (causeIds.length > 0) {
        const { data: causeData } = await supabase
            .from('bsc_objectives')
            .select('id, name, description, bsc_perspectives(name, perspective_type, color)')
            .in('id', causeIds);
        causes = causeData || [];
    }

    // Fetch full details for effects
    let effects = [];
    if (effectIds.length > 0) {
        const { data: effectData } = await supabase
            .from('bsc_objectives')
            .select('id, name, description, bsc_perspectives(name, perspective_type, color)')
            .in('id', effectIds);
        effects = effectData || [];
    }

    return { causes, effects };
}

// ============================================================================
// HEALTH CHECK SCHEDULING
// ============================================================================

/**
 * Get health check schedule configuration for a user
 * @param {string} userId - User ID
 * @returns {Object} - Schedule configuration
 */
async function getHealthCheckSchedule(userId) {
    const { data, error } = await supabase
        .from('s2e_schedule_config')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }

    // Return default config if none exists
    if (!data) {
        return {
            user_id: userId,
            weekly_enabled: false,
            weekly_day: 1, // Monday
            monthly_enabled: true,
            monthly_day: 1, // First of month
            last_weekly_run: null,
            last_monthly_run: null,
            next_scheduled_run: null
        };
    }

    return data;
}

/**
 * Update health check schedule configuration
 * @param {string} userId - User ID
 * @param {Object} config - Schedule configuration updates
 * @returns {Object} - Updated configuration
 */
async function updateHealthCheckSchedule(userId, config) {
    const { data, error } = await supabase
        .from('s2e_schedule_config')
        .upsert({
            user_id: userId,
            ...config,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'user_id'
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ============================================================================
// BRIEFING INTEGRATION
// ============================================================================

/**
 * Generate an S2E summary for the daily briefing
 * @param {string} userId - User ID
 * @returns {Object} - Summary with text content and metadata
 */
async function generateBriefingSummary(userId) {
    try {
        // Get current foundation
        const foundation = await getCurrentFoundationWithHierarchy(userId);
        if (!foundation) {
            return {
                content_text: 'No strategic foundation is currently set. Please create and activate a strategic foundation in the Strategy module.',
                has_data: false
            };
        }

        // Get health scores
        const scores = await calculateHealthScores(foundation.id);

        // Get health analysis
        const analysis = await analyzeStrategyHealth(foundation.id);

        // Get alignment report
        const alignmentReport = await generateAlignmentReport(userId);

        // Get latest health check
        const { data: latestCheck } = await supabase
            .from('s2e_health_checks')
            .select('*')
            .eq('foundation_id', foundation.id)
            .order('check_date', { ascending: false })
            .limit(1)
            .single();

        // Build the summary text
        const parts = [];

        // Header
        parts.push(`## Strategic Health Summary`);
        parts.push(`**Foundation:** ${foundation.name}`);
        parts.push(`**Vision:** ${foundation.vision || 'Not defined'}`);
        parts.push('');

        // Health Scores
        parts.push(`### Health Scores`);
        parts.push(`- **Overall Score:** ${scores.overall}%`);
        parts.push(`- **Alignment Score:** ${scores.alignment}% (OKR to strategy linkage)`);
        parts.push(`- **Execution Score:** ${scores.execution}% (OKR progress)`);
        parts.push(`- **Learning Score:** ${scores.learning}% (L&G perspective progress)`);
        parts.push('');

        // OKR Alignment
        if (alignmentReport) {
            parts.push(`### OKR Alignment`);
            parts.push(`- **Total Active OKRs:** ${alignmentReport.totalOKRs}`);
            parts.push(`- **Linked to Strategy:** ${alignmentReport.linkedCount} (${alignmentReport.linkagePercentage}%)`);
            parts.push(`- **Unlinked OKRs:** ${alignmentReport.unlinkedCount}`);
            parts.push('');
        }

        // Strategic Observations
        if (analysis.observations && analysis.observations.length > 0) {
            parts.push(`### Strategic Observations`);
            const highPriority = analysis.observations.filter(o => o.severity === 'high');
            const mediumPriority = analysis.observations.filter(o => o.severity === 'medium');

            if (highPriority.length > 0) {
                parts.push('**High Priority Issues:**');
                highPriority.slice(0, 3).forEach(obs => {
                    parts.push(`- [${obs.type.toUpperCase()}] ${obs.description}`);
                });
            }

            if (mediumPriority.length > 0) {
                parts.push('**Attention Needed:**');
                mediumPriority.slice(0, 3).forEach(obs => {
                    parts.push(`- [${obs.type.toUpperCase()}] ${obs.description}`);
                });
            }
            parts.push('');
        }

        // Recommendations
        if (analysis.recommendations && analysis.recommendations.length > 0) {
            parts.push(`### Recommended Actions`);
            analysis.recommendations.slice(0, 3).forEach((rec, i) => {
                parts.push(`${i + 1}. ${rec}`);
            });
            parts.push('');
        }

        // Perspective Summary
        if (foundation.themes) {
            parts.push(`### Perspective Breakdown`);
            for (const theme of foundation.themes) {
                if (theme.perspectives) {
                    for (const perspective of theme.perspectives) {
                        const objCount = perspective.objectives?.length || 0;
                        parts.push(`- **${perspective.name}:** ${objCount} objectives`);
                    }
                }
            }
            parts.push('');
        }

        // Last Health Check
        if (latestCheck) {
            const checkDate = new Date(latestCheck.check_date).toLocaleDateString();
            parts.push(`### Last Health Check`);
            parts.push(`- **Date:** ${checkDate}`);
            parts.push(`- **Type:** ${latestCheck.check_type}`);
            parts.push(`- **Scores:** Alignment ${latestCheck.alignment_score}%, Execution ${latestCheck.execution_score}%, Learning ${latestCheck.learning_score || 'N/A'}%`);
        }

        return {
            content_text: parts.join('\n'),
            content_json: {
                foundation_id: foundation.id,
                foundation_name: foundation.name,
                scores,
                observations_count: analysis.observations?.length || 0,
                recommendations_count: analysis.recommendations?.length || 0,
                generated_at: new Date().toISOString()
            },
            has_data: true
        };

    } catch (error) {
        console.error('[S2E Service] Error generating briefing summary:', error);
        return {
            content_text: `Error generating S2E summary: ${error.message}`,
            has_data: false,
            error: error.message
        };
    }
}

/**
 * Get S2E metrics for briefing context
 * Returns a condensed view suitable for LLM context
 * @param {string} userId - User ID
 * @returns {Object} - Metrics object
 */
async function getBriefingMetrics(userId) {
    try {
        const foundation = await getCurrentFoundationWithHierarchy(userId);
        if (!foundation) return null;

        const scores = await calculateHealthScores(foundation.id);
        const analysis = await analyzeStrategyHealth(foundation.id);
        const alignmentReport = await generateAlignmentReport(userId);

        return {
            foundation_name: foundation.name,
            scores,
            alignment: {
                total_okrs: alignmentReport?.totalOKRs || 0,
                linked_okrs: alignmentReport?.linkedCount || 0,
                linkage_percent: alignmentReport?.linkagePercentage || 0
            },
            issues: {
                high: analysis.observations?.filter(o => o.severity === 'high').length || 0,
                medium: analysis.observations?.filter(o => o.severity === 'medium').length || 0,
                low: analysis.observations?.filter(o => o.severity === 'low').length || 0
            },
            recommendations: analysis.recommendations?.slice(0, 5) || []
        };

    } catch (error) {
        console.error('[S2E Service] Error getting briefing metrics:', error);
        return null;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    // Validation helpers
    validateFoundation,
    validateTheme,
    validatePerspective,
    validateObjective,
    validateOKRLink,
    validateIndicator,
    validateHealthCheck,

    // Foundation & hierarchy
    getCurrentFoundationWithHierarchy,
    setCurrentFoundation,
    initializeDefaultPerspectives,

    // OKR link management
    setPrimaryOKRLink,
    getStrategicLinksForOKR,

    // Strategy map
    buildStrategyMap,

    // Alignment report
    generateAlignmentReport,

    // Health scoring
    calculateAlignmentScore,
    calculateExecutionScore,
    calculateLearningScore,
    calculateHealthScores,

    // Health analysis
    analyzeStrategyHealth,
    generateRecommendations,
    generateHealthCheck,

    // Cause-effect relationships
    updateObjectiveCauses,
    updateObjectiveEffects,
    getObjectiveCausalChain,

    // Scheduling
    getHealthCheckSchedule,
    updateHealthCheckSchedule,

    // Briefing integration
    generateBriefingSummary,
    getBriefingMetrics,

    // Constants
    DEFAULT_PERSPECTIVES,
    HEALTH_THRESHOLDS
};
