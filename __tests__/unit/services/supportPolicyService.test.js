/**
 * Support Policy Service Tests
 * Phase 71: Customer Support Agent System
 */

// Mock logger
jest.mock('../../../server/services/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    eq: jest.fn(() => ({
                        single: jest.fn(() => ({ data: null, error: null }))
                    }))
                }))
            }))
        }))
    }))
}));

const {
    evaluateRefundEligibility,
    evaluateEscalationRequired,
    evaluateTierChange,
    clearCache
} = require('../../../server/services/supportPolicyService');

describe('Support Policy Service', () => {
    beforeEach(() => {
        clearCache();
    });

    // ── Refund Eligibility ────────────────────────────────────
    describe('evaluateRefundEligibility', () => {
        it('should auto-approve refunds under $50 within 30 days', async () => {
            const result = await evaluateRefundEligibility({
                amount: 25,
                daysSincePurchase: 10,
                priorRefundsIn90Days: 0,
                reason: 'Not satisfied',
                orgId: 'test-org'
            });

            expect(result.decision).toBe('approved');
            expect(result.rules_checked).toContain('amount_under_50');
        });

        it('should deny refunds under $50 after 30 days', async () => {
            const result = await evaluateRefundEligibility({
                amount: 30,
                daysSincePurchase: 45,
                priorRefundsIn90Days: 0,
                reason: 'Changed mind',
                orgId: 'test-org'
            });

            expect(result.decision).toBe('denied');
        });

        it('should auto-approve $50-$200 refunds within 14 days', async () => {
            const result = await evaluateRefundEligibility({
                amount: 100,
                daysSincePurchase: 7,
                priorRefundsIn90Days: 0,
                reason: 'Product issue',
                orgId: 'test-org'
            });

            expect(result.decision).toBe('approved');
            expect(result.rules_checked).toContain('amount_50_200');
        });

        it('should flag $50-$200 refunds at 15-30 days for review', async () => {
            const result = await evaluateRefundEligibility({
                amount: 150,
                daysSincePurchase: 20,
                priorRefundsIn90Days: 0,
                reason: 'Not as expected',
                orgId: 'test-org'
            });

            expect(result.decision).toBe('requires_approval');
        });

        it('should require approval for refunds over $200', async () => {
            const result = await evaluateRefundEligibility({
                amount: 500,
                daysSincePurchase: 5,
                priorRefundsIn90Days: 0,
                reason: 'Billing error',
                orgId: 'test-org'
            });

            expect(result.decision).toBe('requires_approval');
            expect(result.rules_checked).toContain('amount_over_200');
        });

        it('should deny when max refunds in 90 days reached', async () => {
            const result = await evaluateRefundEligibility({
                amount: 25,
                daysSincePurchase: 5,
                priorRefundsIn90Days: 3,
                reason: 'Oops',
                orgId: 'test-org'
            });

            expect(result.decision).toBe('denied');
            expect(result.rules_checked).toContain('max_refunds_90d');
        });
    });

    // ── Escalation Evaluation ────────────────────────────────
    describe('evaluateEscalationRequired', () => {
        it('should escalate when customer requests human', async () => {
            const result = await evaluateEscalationRequired({
                sentiment: 'neutral',
                intent: 'general',
                failedAttempts: 0,
                humanRequested: true,
                customerTier: null
            });

            expect(result.should_escalate).toBe(true);
            expect(result.trigger).toBe('customer_requested_human');
        });

        it('should escalate on frustrated sentiment', async () => {
            const result = await evaluateEscalationRequired({
                sentiment: 'frustrated',
                intent: 'billing',
                failedAttempts: 0,
                humanRequested: false,
                customerTier: null
            });

            expect(result.should_escalate).toBe(true);
            expect(result.trigger).toBe('frustrated_sentiment');
            expect(result.sla_minutes).toBe(15);
        });

        it('should escalate after 3+ failed attempts', async () => {
            const result = await evaluateEscalationRequired({
                sentiment: 'negative',
                intent: 'technical',
                failedAttempts: 3,
                humanRequested: false,
                customerTier: null
            });

            expect(result.should_escalate).toBe(true);
            expect(result.trigger).toBe('failed_resolution_attempts');
        });

        it('should escalate for legal/compliance inquiries', async () => {
            const result = await evaluateEscalationRequired({
                sentiment: 'neutral',
                intent: 'legal',
                failedAttempts: 0,
                humanRequested: false,
                customerTier: null
            });

            expect(result.should_escalate).toBe(true);
            expect(result.trigger).toBe('legal_compliance_inquiry');
        });

        it('should not escalate for normal interactions', async () => {
            const result = await evaluateEscalationRequired({
                sentiment: 'neutral',
                intent: 'general',
                failedAttempts: 0,
                humanRequested: false,
                customerTier: null
            });

            expect(result.should_escalate).toBe(false);
        });

        it('should escalate on knowledge gap when AI cannot answer', async () => {
            const result = await evaluateEscalationRequired({
                sentiment: 'neutral',
                intent: 'general',
                failedAttempts: 0,
                humanRequested: false,
                customerTier: null,
                knowledgeGap: true
            });

            expect(result.should_escalate).toBe(true);
            expect(result.trigger).toBe('knowledge_gap_unresolved');
            expect(result.sla_minutes).toBe(120);
        });

        it('should not escalate on knowledge gap when higher-priority trigger fires first', async () => {
            const result = await evaluateEscalationRequired({
                sentiment: 'frustrated',
                intent: 'general',
                failedAttempts: 0,
                humanRequested: false,
                customerTier: null,
                knowledgeGap: true
            });

            // Frustrated sentiment has higher priority than knowledge gap
            expect(result.should_escalate).toBe(true);
            expect(result.trigger).toBe('frustrated_sentiment');
            expect(result.sla_minutes).toBe(15);
        });
    });

    // ── Tier Change Evaluation ───────────────────────────────
    describe('evaluateTierChange', () => {
        it('should auto-approve upgrades', async () => {
            const result = await evaluateTierChange({
                currentTier: 'starter',
                requestedTier: 'business',
                daysOnCurrentTier: 5
            });

            expect(result.decision).toBe('approved');
            expect(result.requires_human_approval).toBe(false);
        });

        it('should deny downgrades under 30 days', async () => {
            const result = await evaluateTierChange({
                currentTier: 'business',
                requestedTier: 'starter',
                daysOnCurrentTier: 15
            });

            expect(result.decision).toBe('denied');
        });

        it('should approve downgrades after 30 days with human approval', async () => {
            const result = await evaluateTierChange({
                currentTier: 'enterprise',
                requestedTier: 'business',
                daysOnCurrentTier: 45
            });

            expect(result.decision).toBe('approved');
            expect(result.requires_human_approval).toBe(true);
        });

        it('should deny same-tier changes', async () => {
            const result = await evaluateTierChange({
                currentTier: 'business',
                requestedTier: 'business',
                daysOnCurrentTier: 100
            });

            expect(result.decision).toBe('denied');
        });

        it('should deny invalid tier names', async () => {
            const result = await evaluateTierChange({
                currentTier: 'nonexistent',
                requestedTier: 'business',
                daysOnCurrentTier: 30
            });

            expect(result.decision).toBe('denied');
        });
    });
});
