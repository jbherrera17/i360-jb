/**
 * Support Agent Service Tests
 * Phase 71: Customer Support Agent System
 */

// Mock logger
jest.mock('../../../server/services/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}));

// Mock metrics
jest.mock('../../../server/services/metrics', () => ({
    recordLLMRequest: jest.fn(),
    recordHttpRequest: jest.fn(),
    recordDbQuery: jest.fn(),
}));

// Mock reliability
jest.mock('../../../server/services/reliability', () => ({
    withRetry: jest.fn((fn) => fn()),
    withTimeout: jest.fn((promise) => promise),
}));

// Mock guardrail enforcement
jest.mock('../../../server/services/guardrailEnforcementService', () => ({
    screenMessage: jest.fn(() => ({ blocked: false })),
    buildSoulContextBlock: jest.fn(() => '## SOUL CONTEXT\nTest values'),
}));

// Mock support policy
jest.mock('../../../server/services/supportPolicyService', () => ({
    evaluateRefundEligibility: jest.fn(() => ({
        decision: 'approved',
        rationale: 'Auto-approved',
        rules_checked: ['test']
    })),
    evaluateEscalationRequired: jest.fn(() => ({
        should_escalate: false,
        trigger: null,
        sla_minutes: null
    })),
    evaluateTierChange: jest.fn(() => ({
        decision: 'approved',
        rationale: 'Upgrade approved',
        requires_human_approval: false
    })),
}));

// Mock Supabase
const mockRpc = jest.fn(() => ({ data: 1, error: null }));
const mockSingle = jest.fn(() => ({ data: { id: 'test-id', status: 'open', org_id: 'org-1' }, error: null }));
const mockSelect = jest.fn(() => ({ single: mockSingle, order: jest.fn(() => ({ data: [], error: null })) }));
const mockInsert = jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn(() => ({ data: { id: 'action-1' }, error: null })) })) }));
const mockUpdate = jest.fn(() => ({ eq: jest.fn(() => ({ select: jest.fn(() => ({ single: mockSingle })), data: null, error: null })) }));
const mockEq = jest.fn(() => ({
    eq: jest.fn(() => ({ single: mockSingle })),
    single: mockSingle,
    order: jest.fn(() => ({ data: [], error: null })),
    gt: jest.fn(() => ({ order: jest.fn(() => ({ data: [], error: null })) })),
    ilike: jest.fn(() => ({ limit: jest.fn(() => ({ data: [], error: null })) })),
    not: jest.fn(() => ({ data: [], error: null })),
}));

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        from: jest.fn(() => ({
            select: jest.fn(() => ({ eq: mockEq })),
            insert: mockInsert,
            update: mockUpdate,
        })),
        rpc: mockRpc,
    }))
}));

// Mock Anthropic
jest.mock('@anthropic-ai/sdk', () => {
    return jest.fn(() => ({
        messages: {
            create: jest.fn(() => ({
                content: [{ type: 'text', text: 'I can help you with that.' }],
                stop_reason: 'end_turn',
                usage: { input_tokens: 100, output_tokens: 50 }
            }))
        }
    }));
});

const {
    classifyIntent,
    extractSentiment,
    withConversationLock,
    SUPPORT_TOOLS,
} = require('../../../server/services/supportAgentService');

describe('Support Agent Service', () => {
    // ── Intent Classification ────────────────────────────────
    describe('classifyIntent', () => {
        it('should classify refund intent', () => {
            expect(classifyIntent('I want a refund for my order')).toBe('refund');
            expect(classifyIntent('Can I get my money back?')).toBe('refund');
        });

        it('should classify billing intent', () => {
            expect(classifyIntent('I have a question about my invoice')).toBe('billing');
            expect(classifyIntent('Why was I charged twice?')).toBe('billing');
        });

        it('should classify tier change intent', () => {
            expect(classifyIntent('I want to upgrade my plan')).toBe('tier_change');
            expect(classifyIntent('How do I change plan and switch tier?')).toBe('tier_change');
        });

        it('should classify technical intent', () => {
            expect(classifyIntent('The app is not working')).toBe('technical');
            expect(classifyIntent('I found a bug in the dashboard')).toBe('technical');
        });

        it('should classify account intent', () => {
            expect(classifyIntent('I cannot login to my account')).toBe('account');
            expect(classifyIntent('I need to reset my password')).toBe('account');
        });

        it('should classify legal intent', () => {
            expect(classifyIntent('I need to discuss a legal matter')).toBe('legal');
            expect(classifyIntent('What is your GDPR compliance policy?')).toBe('legal');
        });

        it('should classify security intent', () => {
            expect(classifyIntent('There was a security breach and data leak')).toBe('security');
            expect(classifyIntent('There was a data breach')).toBe('security');
        });

        it('should default to general for unrecognized input', () => {
            expect(classifyIntent('Hello there')).toBe('general');
            expect(classifyIntent('')).toBe('general');
            expect(classifyIntent(null)).toBe('general');
        });
    });

    // ── Sentiment Extraction ─────────────────────────────────
    describe('extractSentiment', () => {
        it('should detect frustrated sentiment', () => {
            expect(extractSentiment('This is unacceptable! I am furious!')).toBe('frustrated');
            expect(extractSentiment('I am so fed up with this service')).toBe('frustrated');
        });

        it('should detect negative sentiment', () => {
            expect(extractSentiment('I am disappointed with the service')).toBe('negative');
            expect(extractSentiment('This is a bad experience')).toBe('negative');
        });

        it('should detect positive sentiment', () => {
            expect(extractSentiment('Thank you for your help!')).toBe('positive');
            expect(extractSentiment('This is amazing!')).toBe('positive');
        });

        it('should default to neutral', () => {
            expect(extractSentiment('I have a question about my order')).toBe('neutral');
            expect(extractSentiment('')).toBe('neutral');
            expect(extractSentiment(null)).toBe('neutral');
        });
    });

    // ── Conversation Lock ────────────────────────────────────
    describe('withConversationLock', () => {
        it('should serialize concurrent calls for the same conversation', async () => {
            const order = [];
            const delay = (ms) => new Promise(r => setTimeout(r, ms));

            const p1 = withConversationLock('conv-1', async () => {
                order.push('start-1');
                await delay(50);
                order.push('end-1');
                return 'result-1';
            });

            const p2 = withConversationLock('conv-1', async () => {
                order.push('start-2');
                order.push('end-2');
                return 'result-2';
            });

            jest.useRealTimers();
            const [r1, r2] = await Promise.all([p1, p2]);
            jest.useFakeTimers();

            expect(r1).toBe('result-1');
            expect(r2).toBe('result-2');
            // Second call should start after first finishes
            expect(order.indexOf('end-1')).toBeLessThan(order.indexOf('start-2'));
        });

        it('should allow parallel calls for different conversations', async () => {
            const order = [];

            jest.useRealTimers();
            const [r1, r2] = await Promise.all([
                withConversationLock('conv-a', async () => {
                    order.push('a');
                    return 'a';
                }),
                withConversationLock('conv-b', async () => {
                    order.push('b');
                    return 'b';
                })
            ]);
            jest.useFakeTimers();

            expect(r1).toBe('a');
            expect(r2).toBe('b');
        });
    });

    // ── Tool Definitions ─────────────────────────────────────
    describe('SUPPORT_TOOLS', () => {
        it('should define 5 tools', () => {
            expect(SUPPORT_TOOLS).toHaveLength(5);
        });

        it('should have correct tool names', () => {
            const names = SUPPORT_TOOLS.map(t => t.name);
            expect(names).toContain('lookup_customer');
            expect(names).toContain('search_knowledge_base');
            expect(names).toContain('process_refund');
            expect(names).toContain('change_tier');
            expect(names).toContain('escalate_to_human');
        });

        it('should have valid input_schema on all tools', () => {
            for (const tool of SUPPORT_TOOLS) {
                expect(tool.input_schema).toBeDefined();
                expect(tool.input_schema.type).toBe('object');
                expect(tool.input_schema.properties).toBeDefined();
            }
        });
    });
});
