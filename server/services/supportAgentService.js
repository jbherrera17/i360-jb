/**
 * Support Agent Service
 * Phase 71: Customer Support Agent System
 *
 * Core AI execution engine for customer support. Uses direct Anthropic API calls
 * with tool_use for actions (refund, escalation, tier change, lookups).
 * Separate persistence model from agentService — dedicated support_* tables.
 */

const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const { randomUUID: uuidv4 } = require('crypto');
const guardrailEnforcement = require('./guardrailEnforcementService');
const supportPolicy = require('./supportPolicyService');
const metrics = require('./metrics');
const { withRetry, withTimeout } = require('./reliability');
const logger = require('./logger');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

const SUPPORT_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOOL_ITERATIONS = 5;

// ── Conversation Lock (FM-F003) ──────────────────────────────
// In-process mutex using Promise chains per conversation
const conversationLocks = new Map();

async function withConversationLock(conversationId, fn) {
    const prev = conversationLocks.get(conversationId) || Promise.resolve();
    const current = prev.then(fn, fn); // run fn after previous completes, even on error
    conversationLocks.set(conversationId, current.catch(() => {})); // prevent unhandled rejection
    try {
        return await current;
    } finally {
        // Clean up if this was the last in the chain
        if (conversationLocks.get(conversationId) === current.catch(() => {})) {
            conversationLocks.delete(conversationId);
        }
    }
}

// ── Tool Definitions ─────────────────────────────────────────

const SUPPORT_TOOLS = [
    {
        name: 'lookup_customer',
        description: 'Look up customer information by email or name. Returns account details, subscription tier, and recent activity.',
        input_schema: {
            type: 'object',
            properties: {
                email: { type: 'string', description: 'Customer email address' },
                name: { type: 'string', description: 'Customer name' }
            },
            required: []
        }
    },
    {
        name: 'search_knowledge_base',
        description: 'Search the organization knowledge base for relevant articles, FAQs, and documentation.',
        input_schema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query' },
                category: { type: 'string', description: 'Optional category filter' }
            },
            required: ['query']
        }
    },
    {
        name: 'process_refund',
        description: 'Initiate a refund for a customer. Will be evaluated against the refund policy and may require human approval.',
        input_schema: {
            type: 'object',
            properties: {
                amount: { type: 'number', description: 'Refund amount in dollars' },
                reason: { type: 'string', description: 'Reason for refund' },
                days_since_purchase: { type: 'number', description: 'Days since the original purchase' },
                prior_refunds_90d: { type: 'number', description: 'Number of refunds in the last 90 days' }
            },
            required: ['amount', 'reason']
        }
    },
    {
        name: 'change_tier',
        description: 'Request a subscription tier change for a customer. Will be evaluated against the tier change policy.',
        input_schema: {
            type: 'object',
            properties: {
                current_tier: { type: 'string', description: 'Current subscription tier' },
                requested_tier: { type: 'string', description: 'Requested subscription tier' },
                days_on_current_tier: { type: 'number', description: 'Days on current tier' }
            },
            required: ['current_tier', 'requested_tier']
        }
    },
    {
        name: 'escalate_to_human',
        description: 'Escalate the conversation to a human support agent. Use when unable to resolve or customer requests human help.',
        input_schema: {
            type: 'object',
            properties: {
                reason: { type: 'string', description: 'Why escalation is needed' },
                priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], description: 'Escalation priority' }
            },
            required: ['reason']
        }
    }
];

// ── Intent & Sentiment Classification ────────────────────────

const INTENT_KEYWORDS = {
    refund: ['refund', 'money back', 'reimburse', 'charge back', 'return', 'charged wrongly', 'overcharged'],
    billing: ['bill', 'invoice', 'charge', 'payment', 'subscription', 'pricing', 'cost'],
    tier_change: ['upgrade', 'downgrade', 'change plan', 'switch tier', 'change subscription'],
    technical: ['bug', 'error', 'broken', 'not working', 'crash', 'issue', 'problem', 'help'],
    account: ['account', 'login', 'password', 'reset', 'access', 'locked out', 'sign in'],
    cancellation: ['cancel', 'unsubscribe', 'close account', 'delete account', 'stop service'],
    legal: ['legal', 'lawyer', 'lawsuit', 'compliance', 'regulation', 'gdpr', 'privacy'],
    security: ['security', 'breach', 'hacked', 'compromised', 'unauthorized', 'data leak'],
    general: ['question', 'how to', 'information', 'learn', 'guide']
};

const SENTIMENT_PATTERNS = {
    frustrated: ['frustrated', 'angry', 'furious', 'unacceptable', 'terrible', 'worst', 'ridiculous', 'outraged', 'disgusted', 'fed up', 'sick of', 'had enough', '!!!'],
    negative: ['unhappy', 'disappointed', 'annoyed', 'confused', 'upset', 'not happy', 'dissatisfied', 'poor', 'bad experience'],
    positive: ['thank', 'great', 'excellent', 'wonderful', 'amazing', 'love', 'appreciate', 'perfect', 'awesome', 'happy'],
    neutral: [] // default
};

/**
 * Classify intent from user message (keyword-based, no LLM)
 */
function classifyIntent(text) {
    if (!text) return 'general';
    const lower = text.toLowerCase();
    let bestMatch = 'general';
    let bestScore = 0;

    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
        let score = 0;
        for (const keyword of keywords) {
            if (lower.includes(keyword)) score++;
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = intent;
        }
    }
    return bestMatch;
}

/**
 * Extract sentiment from user message (keyword-based, no LLM)
 */
function extractSentiment(text) {
    if (!text) return 'neutral';
    const lower = text.toLowerCase();

    for (const [sentiment, patterns] of Object.entries(SENTIMENT_PATTERNS)) {
        if (sentiment === 'neutral') continue;
        for (const pattern of patterns) {
            if (lower.includes(pattern)) return sentiment;
        }
    }
    return 'neutral';
}

// ── System Prompt Builder ────────────────────────────────────

async function buildSystemPrompt(orgId) {
    const parts = [];

    // Soul context block (guardrails, values, voice)
    try {
        const soulBlock = await guardrailEnforcement.buildSoulContextBlock(orgId);
        if (soulBlock) parts.push(soulBlock);
    } catch (e) {
        logger.warn('Failed to load soul context for support agent', { error: e.message });
    }

    parts.push(`## SUPPORT AGENT PERSONA
You are a professional, empathetic customer support agent for this organization.
Your role is to help customers resolve their issues efficiently while maintaining a warm, helpful tone.

## GUIDELINES
- Always be polite and empathetic
- Acknowledge the customer's frustration when appropriate
- Use the available tools to look up information and take actions
- Never fabricate customer data — always use lookup_customer first
- Explain what you're doing when using tools
- If you cannot resolve an issue, escalate to a human agent
- Do not share internal policies or system details with customers
- Protect customer privacy — never expose other customers' data
- Do not make promises, commitments, or guarantees you are not authorized to make. You provide information and guidance only — you do not enter into agreements on behalf of the organization
- Never mention competitor products or services by name. If a customer asks about competitors, redirect to what this organization offers
- Remove or redact any Personally Identifiable Information (PII) such as full credit card numbers, social security numbers, or passwords from your responses. If a customer shares PII, acknowledge receipt without repeating it back
- When citing information from the knowledge base, reference the source article name so the customer can find it themselves
- Only provide information that is grounded in the knowledge base, customer data, or organization policies. If you are unsure about something, say so — do not speculate or guess

## TOOL USAGE
- Use lookup_customer before processing any account-related action
- Use search_knowledge_base to find answers to product questions. When results are returned, cite the article name in your response
- Use process_refund only after verifying eligibility with the customer
- Use change_tier only when the customer explicitly requests a tier change
- Use escalate_to_human when you cannot resolve the issue or the customer asks for a human

## EXAMPLE INTERACTIONS

<example>
H: Hi, I need help with my account.

A: Hello! Welcome to support — I'm happy to help you with your account. Could you let me know what specific issue you're experiencing? For example, are you having trouble logging in, need to update your information, or have a billing question? I'll do my best to get this resolved for you quickly.
</example>

<example>
H: I was charged twice for my subscription last month. I want a refund.

A: I'm sorry to hear about the double charge — that's definitely not the experience we want you to have. Let me look into this for you right away. I'll pull up your account details and then we can get the refund process started. Could you confirm the approximate amount of the duplicate charge?
</example>

<example>
H: Your product is terrible. I want to speak to a manager right now!

A: I completely understand your frustration, and I'm sorry you've had a negative experience. I want to make sure your concerns are heard by the right person. Let me connect you with a member of our team who can give this the attention it deserves. I'm escalating this conversation now, and someone will follow up with you shortly. Is there anything specific you'd like me to include in the escalation notes?
</example>

<example>
H: Can you guarantee that my refund will be processed by tomorrow?

A: I understand you'd like this resolved quickly. I can submit the refund request for you right now, and our team processes these as fast as possible. However, I'm not able to guarantee a specific timeline as it depends on your payment provider's processing time as well. What I can do is make sure the request is submitted with all the right details so there are no delays on our end. Would you like me to go ahead?
</example>

<example>
H: What's your competitor XYZ offering for the same price?

A: I'm not in a position to speak to other companies' offerings, but I'd love to walk you through what we provide and how it can meet your needs. Would you like me to search our knowledge base for details on our current plans and features? I'm confident we can find the right fit for you.
</example>`);

    return parts.join('\n\n');
}

// ── Tool Execution ───────────────────────────────────────────

async function executeTool(toolName, toolInput, conversationId, orgId) {
    const idempotencyKey = `${conversationId}:${toolName}:${JSON.stringify(toolInput)}`;

    // Check for duplicate action (FM-O008)
    if (['process_refund', 'change_tier', 'escalate_to_human'].includes(toolName)) {
        const { data: existing } = await supabase
            .from('support_actions')
            .select('id, status, result')
            .eq('idempotency_key', idempotencyKey)
            .single();

        if (existing) {
            return {
                tool_name: toolName,
                result: existing.result || { status: existing.status, message: 'Action already processed (duplicate detected).' },
                action_id: existing.id,
                deduplicated: true
            };
        }
    }

    switch (toolName) {
        case 'lookup_customer': {
            // Simulated lookup — in production, query CRM/user tables
            const result = {
                found: false,
                message: 'Customer lookup is configured but no external CRM is connected. Please use the customer metadata from the conversation.'
            };
            return { tool_name: toolName, result };
        }

        case 'search_knowledge_base': {
            // Search context assets as knowledge base — search name and description
            const searchTerm = `%${toolInput.query}%`;
            const { data: articles } = await supabase
                .from('context_assets')
                .select('id, name, description, type')
                .eq('org_id', orgId)
                .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
                .limit(5);

            // Also search processes (policies, procedures)
            const { data: processes } = await supabase
                .from('processes')
                .select('id, name, description')
                .eq('org_id', orgId)
                .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
                .limit(3);

            const allResults = [
                ...(articles || []).map(a => ({
                    source: a.name,
                    type: a.type || 'article',
                    summary: a.description || 'No description available'
                })),
                ...(processes || []).map(p => ({
                    source: p.name,
                    type: 'policy',
                    summary: p.description || 'No description available'
                }))
            ];

            return {
                tool_name: toolName,
                result: {
                    articles: allResults,
                    count: allResults.length,
                    query: toolInput.query,
                    instruction: 'When referencing these results in your response, cite the source name so the customer can find it.'
                }
            };
        }

        case 'process_refund': {
            const evaluation = await supportPolicy.evaluateRefundEligibility({
                amount: toolInput.amount || 0,
                daysSincePurchase: toolInput.days_since_purchase || 0,
                priorRefundsIn90Days: toolInput.prior_refunds_90d || 0,
                reason: toolInput.reason || '',
                orgId
            });

            // Create action record
            const actionStatus = evaluation.decision === 'approved' ? 'executed' :
                evaluation.decision === 'requires_approval' ? 'pending' : 'denied';

            const { data: action } = await supabase
                .from('support_actions')
                .insert({
                    conversation_id: conversationId,
                    org_id: orgId,
                    action_type: 'refund',
                    status: actionStatus,
                    idempotency_key: idempotencyKey,
                    params: toolInput,
                    result: evaluation,
                    reason: evaluation.rationale,
                    executed_at: actionStatus === 'executed' ? new Date().toISOString() : null
                })
                .select()
                .single();

            return {
                tool_name: toolName,
                result: evaluation,
                action_id: action?.id
            };
        }

        case 'change_tier': {
            const evaluation = await supportPolicy.evaluateTierChange({
                currentTier: toolInput.current_tier,
                requestedTier: toolInput.requested_tier,
                daysOnCurrentTier: toolInput.days_on_current_tier || 0
            });

            const actionStatus = evaluation.decision === 'approved' && !evaluation.requires_human_approval
                ? 'executed' : evaluation.decision === 'approved' ? 'pending' : 'denied';

            const { data: action } = await supabase
                .from('support_actions')
                .insert({
                    conversation_id: conversationId,
                    org_id: orgId,
                    action_type: 'tier_change',
                    status: actionStatus,
                    idempotency_key: idempotencyKey,
                    params: toolInput,
                    result: evaluation,
                    reason: evaluation.rationale,
                    executed_at: actionStatus === 'executed' ? new Date().toISOString() : null
                })
                .select()
                .single();

            return {
                tool_name: toolName,
                result: evaluation,
                action_id: action?.id
            };
        }

        case 'escalate_to_human': {
            // Update conversation status
            await supabase
                .from('support_conversations')
                .update({
                    status: 'escalated',
                    escalated_at: new Date().toISOString(),
                    escalation_reason: toolInput.reason,
                    priority: toolInput.priority || 'normal'
                })
                .eq('id', conversationId);

            const { data: action } = await supabase
                .from('support_actions')
                .insert({
                    conversation_id: conversationId,
                    org_id: orgId,
                    action_type: 'escalation',
                    status: 'executed',
                    idempotency_key: idempotencyKey,
                    params: toolInput,
                    result: { escalated: true, reason: toolInput.reason },
                    reason: toolInput.reason,
                    executed_at: new Date().toISOString()
                })
                .select()
                .single();

            return {
                tool_name: toolName,
                result: {
                    escalated: true,
                    message: 'Conversation has been escalated to a human agent.',
                    reason: toolInput.reason
                },
                action_id: action?.id
            };
        }

        default:
            return { tool_name: toolName, result: { error: `Unknown tool: ${toolName}` } };
    }
}

// ── Tool Loop ────────────────────────────────────────────────

async function runToolLoop(messages, systemPrompt, conversationId, orgId) {
    let iteration = 0;
    let currentMessages = [...messages];
    let finalText = '';
    let allToolCalls = [];

    while (iteration < MAX_TOOL_ITERATIONS) {
        iteration++;
        const startTime = Date.now();
        let response;

        try {
            response = await withTimeout(
                anthropic.messages.create({
                    model: SUPPORT_MODEL,
                    max_tokens: 2048,
                    system: systemPrompt,
                    tools: SUPPORT_TOOLS,
                    messages: currentMessages
                }),
                30000
            );
        } catch (error) {
            // Record failed LLM call (FM-O013)
            metrics.recordLLMRequest('anthropic', SUPPORT_MODEL, 0, 0, Date.now() - startTime, false);
            throw error;
        }

        // Record successful LLM call (FM-O013)
        const inputTokens = response.usage?.input_tokens || 0;
        const outputTokens = response.usage?.output_tokens || 0;
        metrics.recordLLMRequest('anthropic', SUPPORT_MODEL, inputTokens, outputTokens, Date.now() - startTime, true);

        // Extract text content
        const textBlocks = response.content.filter(b => b.type === 'text');
        if (textBlocks.length > 0) {
            finalText = textBlocks.map(b => b.text).join('\n');
        }

        // Check for tool use
        const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
        if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
            break;
        }

        // Execute tools and build tool results
        const toolResults = [];
        for (const toolUse of toolUseBlocks) {
            const toolResult = await executeTool(toolUse.name, toolUse.input, conversationId, orgId);
            allToolCalls.push({
                tool: toolUse.name,
                input: toolUse.input,
                result: toolResult.result,
                action_id: toolResult.action_id,
                deduplicated: toolResult.deduplicated || false
            });
            toolResults.push({
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: JSON.stringify(toolResult.result)
            });
        }

        // Add assistant response + tool results to messages
        currentMessages.push({ role: 'assistant', content: response.content });
        currentMessages.push({ role: 'user', content: toolResults });
    }

    return { text: finalText, toolCalls: allToolCalls, iterations: iteration };
}

// ── Main Entry Point ─────────────────────────────────────────

/**
 * Process a user message in a support conversation
 * @param {string} conversationId - UUID of the conversation
 * @param {string} userMessage - The customer's message
 * @param {object} options - { orgId, userId }
 * @returns {object} { response, intent, sentiment, toolCalls, escalated }
 */
async function processMessage(conversationId, userMessage, options = {}) {
    const { orgId } = options;

    return withConversationLock(conversationId, async () => {
        // Step 1: Guardrail screening
        const screenResult = await guardrailEnforcement.screenMessage(userMessage, orgId, {
            conversationId
        });

        if (screenResult.blocked) {
            return {
                response: screenResult.responseMessage,
                intent: 'blocked',
                sentiment: 'neutral',
                toolCalls: [],
                escalated: false,
                blocked: true
            };
        }

        // Step 2: Classify intent and sentiment
        const intent = classifyIntent(userMessage);
        const sentiment = extractSentiment(userMessage);

        // Step 3: Insert user message
        const { data: seqData } = await supabase.rpc('next_support_message_seq', {
            p_conversation_id: conversationId
        });
        const userSeq = seqData || 1;

        await supabase
            .from('support_messages')
            .insert({
                conversation_id: conversationId,
                seq: userSeq,
                role: 'user',
                content: userMessage
            });

        // Step 4: Update conversation with intent/sentiment
        await supabase
            .from('support_conversations')
            .update({
                intent,
                sentiment,
                message_count: userSeq
            })
            .eq('id', conversationId);

        // Step 5: Build context and run tool loop
        const systemPrompt = await buildSystemPrompt(orgId);

        // Get conversation history
        const { data: history } = await supabase
            .from('support_messages')
            .select('role, content')
            .eq('conversation_id', conversationId)
            .order('seq', { ascending: true });

        const messages = (history || []).map(m => ({
            role: m.role === 'system' ? 'user' : m.role,
            content: m.content
        }));

        const { text, toolCalls, iterations } = await runToolLoop(messages, systemPrompt, conversationId, orgId);

        // Step 6: Insert assistant message
        const { data: assistantSeq } = await supabase.rpc('next_support_message_seq', {
            p_conversation_id: conversationId
        });

        await supabase
            .from('support_messages')
            .insert({
                conversation_id: conversationId,
                seq: assistantSeq || (userSeq + 1),
                role: 'assistant',
                content: text,
                tool_calls: toolCalls,
                metadata: { iterations, model: SUPPORT_MODEL }
            });

        // Update message count
        await supabase
            .from('support_conversations')
            .update({ message_count: assistantSeq || (userSeq + 1) })
            .eq('id', conversationId);

        // Step 7: Check escalation
        const escalationCheck = await supportPolicy.evaluateEscalationRequired({
            sentiment,
            intent,
            failedAttempts: 0, // TODO: track in conversation metadata
            humanRequested: /\b(human|agent|person|representative|operator)\b/i.test(userMessage),
            customerTier: null
        });

        let escalated = false;
        if (escalationCheck.should_escalate) {
            // Only auto-escalate if not already escalated
            const { data: conv } = await supabase
                .from('support_conversations')
                .select('status')
                .eq('id', conversationId)
                .single();

            if (conv && conv.status !== 'escalated') {
                await executeTool('escalate_to_human', {
                    reason: escalationCheck.trigger,
                    priority: escalationCheck.sla_minutes <= 15 ? 'urgent' : 'normal'
                }, conversationId, orgId);
                escalated = true;
            }
        }

        // Step 8: Fire-and-forget TTL sweep
        supabase.rpc('sweep_expired_support_actions').catch(err => {
            logger.debug('TTL sweep skipped', { error: err.message });
        });

        return {
            response: text,
            intent,
            sentiment,
            toolCalls,
            escalated,
            blocked: false
        };
    });
}

/**
 * Enforce conversation volume cap for org
 */
async function enforceConversationVolumeCap(orgId) {
    const { data, error } = await supabase.rpc('check_org_limits', {
        p_org_id: orgId,
        p_resource_type: 'support_conversations'
    });

    if (error) {
        logger.warn('Failed to check conversation volume cap', { error: error.message });
        return { within_limits: true }; // fail open
    }

    const row = Array.isArray(data) ? data[0] : data;
    return {
        within_limits: row?.within_limits ?? true,
        current_count: row?.current_count ?? 0,
        max_allowed: row?.max_allowed ?? -1,
        usage_percent: row?.usage_percent ?? 0
    };
}

module.exports = {
    processMessage,
    classifyIntent,
    extractSentiment,
    enforceConversationVolumeCap,
    buildSystemPrompt,
    withConversationLock,
    // Exposed for testing
    SUPPORT_TOOLS,
    executeTool
};
