/**
 * Widget Agent Service
 * Phase 73: Embeddable Chat Widgets
 *
 * SECURITY-ISOLATED execution engine for public-facing chat widgets.
 * This service is deliberately separate from supportAgentService.js.
 *
 * Critical security properties [SEC-04]:
 * - ONLY two tools: search_knowledge_base and escalate_to_human
 * - NO access to process_refund, change_tier, lookup_customer
 * - Stripped-down system prompt — no internal org details [SEC-06]
 * - Guardrail screening on every inbound message [SEC-07]
 * - LLM output filtering for prompt leakage [SEC-08]
 * - Haiku-first routing with Sonnet escalation for cost control
 * - Conversation summarization after turn 3
 */

const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const { randomUUID: uuidv4 } = require('crypto');
const guardrailEnforcement = require('./guardrailEnforcementService');
const piiRedaction = require('./piiRedactionService');
const { withRetry, withTimeout } = require('./reliability');
const logger = require('./logger');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// ── Model Configuration ─────────────────────────────────────

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const SONNET_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOOL_ITERATIONS = 3; // Lower than support (5) — simpler interactions
const MAX_MESSAGE_LENGTH = 2000; // [SEC-14]
const SUMMARIZE_AFTER_TURN = 3;

// ── Restricted Tool Set [SEC-04] ─────────────────────────────
// ONLY these two tools. No refund, no tier_change, no lookup_customer.

const WIDGET_TOOLS = [
    {
        name: 'search_knowledge_base',
        description: 'Search the knowledge base for relevant information about procedures, services, and FAQs.',
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
        name: 'escalate_to_human',
        description: 'Offer the visitor a way to contact the practice directly when you cannot answer their question or they want to speak to someone.',
        input_schema: {
            type: 'object',
            properties: {
                reason: { type: 'string', description: 'Why escalation is needed' }
            },
            required: ['reason']
        }
    }
];

// ── Intent Classification (Haiku vs Sonnet routing) ──────────

const COMPLEX_INDICATORS = [
    // Multi-step questions
    /\b(compare|comparison|difference between|versus|vs\.?)\b/i,
    // Requires reasoning
    /\b(should I|would you recommend|what do you think|pros and cons)\b/i,
    // Multi-procedure
    /\b(both|multiple|combined|together with|along with)\b/i,
    // Detailed medical context
    /\b(my situation|my case|my condition|I have|diagnosed with)\b/i,
    // Long messages (>200 chars tend to be complex)
    /.{200,}/
];

/**
 * Classify whether a message needs Sonnet (complex) or Haiku (simple).
 * Default: Haiku (cheaper). Escalate to Sonnet only for complex queries.
 */
function classifyComplexity(message, turnCount) {
    // Multi-turn conversations always use Sonnet after turn 3
    if (turnCount > 3) return 'complex';

    // Check for complexity indicators
    for (const pattern of COMPLEX_INDICATORS) {
        if (pattern.test(message)) return 'complex';
    }

    return 'simple';
}

// ── System Prompt [SEC-06] ───────────────────────────────────
// Stripped down — NO internal org details, NO full soul config,
// NO agent IDs, NO table names, NO API keys.

function buildWidgetSystemPrompt(widgetConfig) {
    const branding = widgetConfig.branding || {};
    const widgetName = widgetConfig.widget_name || 'AI Assistant';

    return `## PERSONA
You are ${widgetName}, a helpful AI assistant embedded on this website. You provide information about the procedures and services offered by this practice.

## SCOPE
- Answer questions about procedures, recovery, preparation, and general information
- Recommend relevant videos when available
- Help visitors schedule consultations via the booking link
- Stay within the scope of the practice's services

## GUARDRAILS
- NEVER provide specific medical diagnoses or treatment recommendations for an individual's condition
- NEVER collect or ask for personal health information, insurance details, or medical records
- NEVER discuss specific pricing, financing, or payment details
- NEVER make claims about outcomes or guarantees
- Always recommend scheduling a consultation for personalized advice
- If asked about something outside your scope, politely redirect to scheduling a consultation or contacting the practice directly

## RESPONSE STYLE
- Be warm, professional, and conversational
- Keep responses concise (2-4 short paragraphs max)
- When referencing procedures, include relevant video links if available in your context
- When a visitor seems ready to book, proactively offer the scheduling link

## MEDICAL DISCLAIMER
You must never remove or contradict this disclaimer: "This AI provides general information only and does not replace professional medical advice."

## AI TRANSPARENCY
You are an AI assistant. If asked, confirm that you are AI-powered. Do not pretend to be human.

## TOOL USAGE
- Use search_knowledge_base to find answers about procedures and services
- Use escalate_to_human when you cannot answer a question or the visitor wants to speak to someone directly
- If search_knowledge_base returns no results, offer to connect the visitor with the practice team`;
}

// ── Output Filtering [SEC-08] ────────────────────────────────
// Strip system prompt fragments, internal URLs, API keys, table names.

const OUTPUT_FILTER_PATTERNS = [
    // System prompt markers
    /## (?:PERSONA|SCOPE|GUARDRAILS|RESPONSE STYLE|MEDICAL DISCLAIMER|AI TRANSPARENCY|TOOL USAGE)/gi,
    // Internal URLs (i360 admin, API endpoints)
    /https?:\/\/(?:localhost|127\.0\.0\.1)[:\d]*\/[^\s)"]*/gi,
    /https?:\/\/[^\s)"]*\.railway\.app\/[^\s)"]*/gi,
    // API keys or tokens
    /(?:sk-|pk_|key_|token_)[a-zA-Z0-9_-]{20,}/g,
    // Database table names
    /\b(?:support_conversations|support_messages|chat_widgets|widget_sessions|widget_configs|context_assets|agent_executions|organizations|organization_members)\b/gi,
    // Supabase references
    /\b(?:supabase|SUPABASE_[A-Z_]+)\b/gi,
    // Internal service names
    /\b(?:widgetAgentService|supportAgentService|guardrailEnforcement|piiRedaction|contextInjection)\b/g
];

function filterOutput(text) {
    if (!text) return text;
    let filtered = text;
    for (const pattern of OUTPUT_FILTER_PATTERNS) {
        pattern.lastIndex = 0;
        filtered = filtered.replace(pattern, '');
    }
    // Clean up any resulting double spaces or empty lines
    filtered = filtered.replace(/\n{3,}/g, '\n\n').replace(/  +/g, ' ').trim();
    return filtered;
}

// ── Conversation Summarization ───────────────────────────────
// After turn 3, summarize earlier turns to reduce token replay costs.

function summarizeHistory(messages) {
    if (messages.length <= SUMMARIZE_AFTER_TURN * 2) {
        return messages;
    }

    // Keep first message (context) and last 4 messages (recent context)
    const earlyMessages = messages.slice(0, -4);
    const recentMessages = messages.slice(-4);

    // Build a condensed summary of early messages
    const summaryParts = [];
    for (const msg of earlyMessages) {
        const role = msg.role === 'user' ? 'Visitor' : 'Assistant';
        const content = typeof msg.content === 'string'
            ? msg.content.substring(0, 100)
            : '[tool interaction]';
        summaryParts.push(`${role}: ${content}...`);
    }

    const summaryMessage = {
        role: 'user',
        content: `[Earlier conversation summary: ${summaryParts.join(' | ')}]`
    };

    return [summaryMessage, ...recentMessages];
}

// ── Tool Execution ───────────────────────────────────────────

async function executeTool(toolName, toolInput, orgId) {
    switch (toolName) {
        case 'search_knowledge_base': {
            // Split query into keywords and search for each individually
            // PostgREST .or() requires * wildcard (not %) for ilike patterns
            const keywords = toolInput.query.split(/\s+/).filter(w => w.length > 2).slice(0, 3);
            const primaryKeyword = keywords[0] || toolInput.query;
            const searchTerm = `*${primaryKeyword}*`;

            let query = supabase
                .from('context_assets')
                .select('id, name, description, asset_type, content_text')
                .eq('org_id', orgId)
                .or(`name.ilike.${searchTerm},description.ilike.${searchTerm},content_text.ilike.${searchTerm}`)
                .limit(5);

            const { data: assets } = await query;

            const results = (assets || []).map(a => ({
                source: a.name,
                type: a.asset_type || 'article',
                summary: a.description || 'No description available',
                content: a.content_text ? a.content_text.substring(0, 500) : null
            }));

            return {
                tool_name: toolName,
                result: {
                    articles: results,
                    count: results.length,
                    query: toolInput.query
                }
            };
        }

        case 'escalate_to_human': {
            return {
                tool_name: toolName,
                result: {
                    escalated: true,
                    message: 'I\'d recommend reaching out to the practice directly. You can call during business hours or use the scheduling link to book a consultation.',
                    reason: toolInput.reason
                }
            };
        }

        default:
            // [SEC-04] Unknown tools are silently rejected — never execute
            logger.warn('[WidgetAgent] Rejected unknown tool call', { toolName });
            return {
                tool_name: toolName,
                result: { error: 'This action is not available.' }
            };
    }
}

// ── Tool Loop ────────────────────────────────────────────────

async function runToolLoop(messages, systemPrompt, orgId, model, onChunk) {
    let iteration = 0;
    let currentMessages = [...messages];
    let finalText = '';
    let allToolCalls = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    while (iteration < MAX_TOOL_ITERATIONS) {
        iteration++;
        const startTime = Date.now();
        let response;

        try {
            // On iterations after tool use, try streaming the final response
            const isFollowUp = iteration > 1 && onChunk;

            if (isFollowUp) {
                // Stream the final response after tool use
                const stream = await withTimeout(
                    () => anthropic.messages.stream({
                        model,
                        max_tokens: model === HAIKU_MODEL ? 1024 : 2048,
                        system: systemPrompt,
                        tools: WIDGET_TOOLS,
                        messages: currentMessages
                    }),
                    30000
                );

                const chunks = [];
                for await (const event of stream) {
                    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                        chunks.push(event.delta.text);
                        onChunk(event.delta.text);
                    }
                }

                const finalMessage = await stream.finalMessage();
                response = finalMessage;
            } else {
                response = await withTimeout(
                    () => anthropic.messages.create({
                        model,
                        max_tokens: model === HAIKU_MODEL ? 1024 : 2048,
                        system: systemPrompt,
                        tools: WIDGET_TOOLS,
                        messages: currentMessages
                    }),
                    30000
                );
            }
        } catch (error) {
            logger.error('[WidgetAgent] LLM call failed', {
                model,
                duration: Date.now() - startTime,
                error: error.message
            });
            throw error;
        }

        totalInputTokens += response.usage?.input_tokens || 0;
        totalOutputTokens += response.usage?.output_tokens || 0;

        // Extract text
        const textBlocks = response.content.filter(b => b.type === 'text');
        if (textBlocks.length > 0) {
            finalText = textBlocks.map(b => b.text).join('\n');
        }

        // Check for tool use
        const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
        if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
            break;
        }

        // Execute tools
        const toolResults = [];
        for (const toolUse of toolUseBlocks) {
            const toolResult = await executeTool(toolUse.name, toolUse.input, orgId);
            allToolCalls.push({
                tool: toolUse.name,
                input: toolUse.input,
                result: toolResult.result
            });
            toolResults.push({
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: JSON.stringify(toolResult.result)
            });
        }

        currentMessages.push({ role: 'assistant', content: response.content });
        currentMessages.push({ role: 'user', content: toolResults });
    }

    return {
        text: finalText,
        toolCalls: allToolCalls,
        iterations: iteration,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens
    };
}

// ── Cost Estimation ──────────────────────────────────────────

function estimateCost(inputTokens, outputTokens, model) {
    // Pricing per 1M tokens (approximate, as of 2025)
    const pricing = {
        [HAIKU_MODEL]: { input: 0.80, output: 4.00 },
        [SONNET_MODEL]: { input: 3.00, output: 15.00 }
    };
    const rates = pricing[model] || pricing[SONNET_MODEL];
    return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

// ── Usage Tracking ───────────────────────────────────────────

async function checkAndUpdateUsage(widgetId, limits, estimatedCost) {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    const { data: widget } = await supabase
        .from('chat_widgets')
        .select('usage_stats, limits')
        .eq('id', widgetId)
        .single();

    const stats = widget?.usage_stats || {};
    const widgetLimits = widget?.limits || limits;

    // Reset daily spend if new day
    const dailySpend = stats.daily_spend_date === today
        ? (stats.daily_llm_spend || 0) + estimatedCost
        : estimatedCost;

    // Reset monthly count if new month
    const monthlyMessages = stats.current_month === currentMonth
        ? (stats.monthly_messages || 0) + 1
        : 1;

    // Check daily spend cap [SEC-09]
    const dailyCap = widgetLimits.daily_llm_spend_cap || 5.00;
    const dailyCapExceeded = dailySpend > dailyCap;

    // Check monthly ceiling
    const monthlyCap = widgetLimits.max_messages_per_month || 10000;
    const monthlyPercentage = (monthlyMessages / monthlyCap) * 100;
    const ceilingWarning = monthlyPercentage >= 80;
    const ceilingReached = monthlyPercentage >= 100;

    // Update usage stats
    await supabase
        .from('chat_widgets')
        .update({
            usage_stats: {
                current_month: currentMonth,
                monthly_messages: monthlyMessages,
                daily_llm_spend: dailySpend,
                daily_spend_date: today
            }
        })
        .eq('id', widgetId);

    return {
        dailyCapExceeded,
        ceilingWarning,
        ceilingReached,
        monthlyPercentage,
        forceHaiku: dailyCapExceeded || ceilingReached
    };
}

// ── Main Entry Point ─────────────────────────────────────────

/**
 * Process a visitor message through the widget agent.
 *
 * @param {object} params
 * @param {string} params.widgetId - Widget UUID
 * @param {string} params.sessionId - Session UUID
 * @param {string} params.message - Visitor's message (raw)
 * @param {object} params.widgetConfig - Widget configuration row
 * @returns {object} { response, model, toolCalls, blocked, degraded, cost }
 */
async function processMessage({ widgetId, sessionId, message, widgetConfig, onChunk }) {
    const orgId = widgetConfig.org_id;

    // Step 1: Message length check [SEC-14]
    if (message.length > MAX_MESSAGE_LENGTH) {
        return {
            response: 'Your message is too long. Please keep messages under 2000 characters.',
            model: null,
            toolCalls: [],
            blocked: true,
            degraded: false,
            cost: 0
        };
    }

    // Step 2: Guardrail screening [SEC-07]
    const screenResult = await guardrailEnforcement.screenMessage(message, orgId, {
        conversationId: sessionId
    });

    if (screenResult.blocked) {
        return {
            response: screenResult.responseMessage || 'I\'m not able to process that request. How else can I help you?',
            model: null,
            toolCalls: [],
            blocked: true,
            degraded: false,
            cost: 0
        };
    }

    // Step 3: PII redaction [R-01]
    const { redactedMessage, redactionCount } = piiRedaction.redactAndLog(message, widgetId);

    // Step 4: Store visitor message (PII-redacted)
    const { data: seqData } = await supabase.rpc('next_support_message_seq', {
        p_conversation_id: sessionId
    });
    const userSeq = seqData || 1;

    await supabase
        .from('support_messages')
        .insert({
            conversation_id: sessionId,
            seq: userSeq,
            role: 'user',
            content: redactedMessage,
            metadata: { redaction_count: redactionCount, source: 'widget' }
        });

    // Step 5: Extend session expiry (sliding window)
    await supabase.rpc('extend_widget_session', { p_session_id: sessionId });

    // Step 6: Check usage limits
    const usageCheck = await checkAndUpdateUsage(widgetId, widgetConfig.limits || {}, 0);

    // Step 7: Select model (Haiku vs Sonnet routing)
    const turnCount = Math.floor(userSeq / 2);
    const complexity = classifyComplexity(redactedMessage, turnCount);
    let model = complexity === 'complex' ? SONNET_MODEL : HAIKU_MODEL;

    // Force Haiku if daily cap exceeded or monthly ceiling reached
    if (usageCheck.forceHaiku) {
        model = HAIKU_MODEL;
    }

    // Step 8: Build context
    const systemPrompt = buildWidgetSystemPrompt(widgetConfig);

    // Get conversation history
    const { data: history } = await supabase
        .from('support_messages')
        .select('role, content')
        .eq('conversation_id', sessionId)
        .order('seq', { ascending: true });

    let messages = (history || []).map(m => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content
    }));

    // Summarize if conversation is long
    messages = summarizeHistory(messages);

    // Step 9: Run tool loop
    const { text, toolCalls, iterations, inputTokens, outputTokens } = await runToolLoop(
        messages, systemPrompt, orgId, model, onChunk
    );

    // Step 10: Filter output [SEC-08]
    const filteredResponse = filterOutput(text);

    // Step 11: Estimate and track cost
    const cost = estimateCost(inputTokens, outputTokens, model);
    await checkAndUpdateUsage(widgetId, widgetConfig.limits || {}, cost);

    // Step 12: Store assistant message (already filtered)
    const { data: assistantSeq } = await supabase.rpc('next_support_message_seq', {
        p_conversation_id: sessionId
    });

    await supabase
        .from('support_messages')
        .insert({
            conversation_id: sessionId,
            seq: assistantSeq || (userSeq + 1),
            role: 'assistant',
            content: filteredResponse,
            tool_calls: toolCalls,
            metadata: {
                model,
                iterations,
                input_tokens: inputTokens,
                output_tokens: outputTokens,
                estimated_cost: cost,
                source: 'widget',
                degraded: usageCheck.forceHaiku && complexity === 'complex'
            }
        });

    return {
        response: filteredResponse,
        model,
        toolCalls,
        blocked: false,
        degraded: usageCheck.forceHaiku && complexity === 'complex',
        cost
    };
}

module.exports = {
    processMessage,
    // Exported for testing
    classifyComplexity,
    filterOutput,
    summarizeHistory,
    buildWidgetSystemPrompt
};
