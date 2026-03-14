/**
 * Support Policy Service
 * Phase 71: Customer Support Agent System
 *
 * Pure data service — reads policies from `processes` table with TTL cache.
 * No LLM calls. Evaluates refund, escalation, and tier change decisions.
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// ── Cache ────────────────────────────────────────────────────
const policyCache = new Map(); // policyName -> { data, timestamp }
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get a support policy by name (cached)
 * @param {string} policyName - e.g. 'Support: Refund Policy'
 * @returns {object|null}
 */
async function getPolicy(policyName) {
    const cached = policyCache.get(policyName);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
    }

    const { data, error } = await supabase
        .from('processes')
        .select('*')
        .eq('name', policyName)
        .eq('status', 'active')
        .single();

    if (error || !data) {
        logger.warn(`Policy not found: ${policyName}`, { error: error?.message });
        return null;
    }

    policyCache.set(policyName, { data, timestamp: Date.now() });
    return data;
}

/**
 * Evaluate refund eligibility
 * @param {object} params
 * @param {number} params.amount - Refund amount in dollars
 * @param {number} params.daysSincePurchase - Days since original purchase
 * @param {number} params.priorRefundsIn90Days - Count of refunds in last 90 days
 * @param {string} params.reason - Customer's reason
 * @param {string} params.orgId - Organization ID
 * @returns {object} { decision, rationale, rules_checked }
 */
async function evaluateRefundEligibility({ amount, daysSincePurchase, priorRefundsIn90Days, reason, orgId }) {
    const rulesChecked = [];
    let decision = 'denied';
    let rationale = '';

    // Rule: max 3 refunds per 90 days
    if (priorRefundsIn90Days >= 3) {
        rulesChecked.push('max_refunds_90d');
        return {
            decision: 'denied',
            rationale: 'Customer has reached the maximum of 3 refunds in 90 days.',
            rules_checked: rulesChecked
        };
    }
    rulesChecked.push('max_refunds_90d_pass');

    // Rule: amount-based thresholds
    if (amount > 200) {
        rulesChecked.push('amount_over_200');
        return {
            decision: 'requires_approval',
            rationale: `Refund of $${amount} exceeds the $200 auto-approval threshold. Requires human approval.`,
            rules_checked: rulesChecked
        };
    }

    if (amount >= 50 && amount <= 200) {
        rulesChecked.push('amount_50_200');
        if (daysSincePurchase <= 14) {
            decision = 'approved';
            rationale = `Refund of $${amount} auto-approved (within 14-day window for $50-$200 range).`;
        } else if (daysSincePurchase <= 30) {
            decision = 'requires_approval';
            rationale = `Refund of $${amount} is ${daysSincePurchase} days old (15-30 day review window). Flagged for human review.`;
        } else {
            decision = 'denied';
            rationale = `Refund of $${amount} denied — ${daysSincePurchase} days since purchase exceeds 30-day policy window.`;
        }
    } else if (amount < 50) {
        rulesChecked.push('amount_under_50');
        if (daysSincePurchase <= 30) {
            decision = 'approved';
            rationale = `Refund of $${amount} auto-approved (under $50, within 30-day window).`;
        } else {
            decision = 'denied';
            rationale = `Refund of $${amount} denied — ${daysSincePurchase} days since purchase exceeds 30-day policy window.`;
        }
    }

    rulesChecked.push('date_check');
    return { decision, rationale, rules_checked: rulesChecked };
}

/**
 * Evaluate whether escalation is required
 * @param {object} params
 * @param {string} params.sentiment - Current sentiment
 * @param {string} params.intent - Detected intent
 * @param {number} params.failedAttempts - Number of failed resolution attempts
 * @param {boolean} params.humanRequested - Customer explicitly asked for human
 * @param {string} params.customerTier - Customer tier (e.g. 'vip')
 * @returns {object} { should_escalate, trigger, sla_minutes }
 */
async function evaluateEscalationRequired({ sentiment, intent, failedAttempts, humanRequested, customerTier }) {
    // Priority-ordered trigger evaluation
    if (humanRequested) {
        return {
            should_escalate: true,
            trigger: 'customer_requested_human',
            sla_minutes: 60
        };
    }

    if (sentiment === 'frustrated') {
        return {
            should_escalate: true,
            trigger: 'frustrated_sentiment',
            sla_minutes: 15
        };
    }

    if (failedAttempts >= 3) {
        return {
            should_escalate: true,
            trigger: 'failed_resolution_attempts',
            sla_minutes: 60
        };
    }

    if (intent === 'legal' || intent === 'compliance') {
        return {
            should_escalate: true,
            trigger: 'legal_compliance_inquiry',
            sla_minutes: 60
        };
    }

    if (intent === 'security' || intent === 'data_breach') {
        return {
            should_escalate: true,
            trigger: 'security_incident',
            sla_minutes: 15
        };
    }

    if (customerTier === 'vip' || customerTier === 'enterprise') {
        return {
            should_escalate: true,
            trigger: 'vip_customer',
            sla_minutes: 15
        };
    }

    return { should_escalate: false, trigger: null, sla_minutes: null };
}

/**
 * Evaluate tier change request
 * @param {object} params
 * @param {string} params.currentTier
 * @param {string} params.requestedTier
 * @param {number} params.daysOnCurrentTier
 * @returns {object} { decision, rationale, requires_human_approval }
 */
async function evaluateTierChange({ currentTier, requestedTier, daysOnCurrentTier }) {
    const tierOrder = ['starter', 'business', 'enterprise', 'agency'];
    const currentIdx = tierOrder.indexOf(currentTier);
    const requestedIdx = tierOrder.indexOf(requestedTier);

    if (currentIdx === -1 || requestedIdx === -1) {
        return {
            decision: 'denied',
            rationale: `Invalid tier: ${currentIdx === -1 ? currentTier : requestedTier}`,
            requires_human_approval: false
        };
    }

    if (currentTier === requestedTier) {
        return {
            decision: 'denied',
            rationale: 'Already on the requested tier.',
            requires_human_approval: false
        };
    }

    // Upgrade: auto-approve
    if (requestedIdx > currentIdx) {
        return {
            decision: 'approved',
            rationale: `Upgrade from ${currentTier} to ${requestedTier} approved. Takes effect immediately with pro-rated billing.`,
            requires_human_approval: false
        };
    }

    // Downgrade: check minimum tenure
    if (daysOnCurrentTier < 30) {
        return {
            decision: 'denied',
            rationale: `Downgrade denied — must be on ${currentTier} tier for at least 30 days (currently ${daysOnCurrentTier} days).`,
            requires_human_approval: false
        };
    }

    return {
        decision: 'approved',
        rationale: `Downgrade from ${currentTier} to ${requestedTier} approved. Takes effect at end of current billing cycle.`,
        requires_human_approval: true
    };
}

/**
 * Clear the policy cache (for testing)
 */
function clearCache() {
    policyCache.clear();
}

module.exports = {
    getPolicy,
    evaluateRefundEligibility,
    evaluateEscalationRequired,
    evaluateTierChange,
    clearCache
};
