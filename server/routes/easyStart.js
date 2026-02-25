/**
 * Easy Start Routes - Insight 360
 * Conversational onboarding with Claude tool use for resource creation.
 * Version: 1.0.0
 */

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const easyStartService = require('../services/easyStartService');
const higginsService = require('../services/higginsService');
const logger = require('../services/logger');

// Initialize Anthropic client
let anthropicClient = null;
if (process.env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const EASY_START_MODEL = 'claude-sonnet-4-5-20250929';

module.exports = function (supabase) {
    const router = express.Router();

    // Conditionally import guardrail enforcement
    let guardrailEnforcement = null;
    try {
        guardrailEnforcement = require('../services/guardrailEnforcementService');
    } catch (e) {
        console.warn('Easy Start: Guardrail enforcement not available');
    }

    /**
     * POST /api/easy-start/stream
     * Main streaming endpoint with tool-use loop
     */
    router.post('/stream', async (req, res) => {
        if (!anthropicClient) {
            return res.status(503).json({
                success: false,
                error: 'Anthropic API not configured'
            });
        }

        const { messages = [] } = req.body;
        const orgId = req.headers['x-org-id'] || req.body.org_id;
        const userId = req.userId || null;
        const isAdmin = req.isAdmin || false;
        const supabaseClient = req.supabase || supabase;

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        // Track client disconnect
        let clientDisconnected = false;
        req.on('close', () => { clientDisconnected = true; });

        // Safety timeout (3 minutes for tool-use loops)
        const timeout = setTimeout(() => {
            if (!clientDisconnected) {
                sendSSE(res, { type: 'error', error: 'Request timed out' });
                sendSSE(res, '[DONE]');
                res.end();
            }
        }, 180000);

        try {
            // Guardrail pre-screen on the last user message
            if (guardrailEnforcement && orgId && messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                const messageText = typeof lastMessage.content === 'string'
                    ? lastMessage.content
                    : lastMessage.content?.map(b => b.text || '').join(' ') || '';

                const screenResult = await guardrailEnforcement.screenMessage(messageText, orgId, { userId });
                if (screenResult && screenResult.blocked) {
                    sendSSE(res, {
                        type: 'guardrail_blocked',
                        category: screenResult.category,
                        message: screenResult.message
                    });
                    sendSSE(res, '[DONE]');
                    clearTimeout(timeout);
                    return res.end();
                }
            }

            // Build soul context
            let soulContext = null;
            if (guardrailEnforcement && orgId) {
                try {
                    const lastText = messages.length > 0
                        ? (typeof messages[messages.length - 1].content === 'string'
                            ? messages[messages.length - 1].content
                            : '')
                        : '';
                    soulContext = await guardrailEnforcement.buildSoulContextBlock(orgId, lastText);
                } catch (e) {
                    // Non-fatal
                }
            }

            // Build system prompt
            const systemPrompt = await easyStartService.buildEasyStartSystemPrompt(supabaseClient, {
                isAdmin,
                modelName: higginsService.getModelDisplayName(EASY_START_MODEL),
                soulContext
            });

            // Tool-use loop context
            const toolContext = { supabase: supabaseClient, orgId, userId };
            let currentMessages = [...messages];
            let continueLoop = true;
            let loopCount = 0;
            const MAX_LOOPS = 8; // Safety limit

            while (continueLoop && !clientDisconnected && loopCount < MAX_LOOPS) {
                loopCount++;

                const stream = await anthropicClient.messages.stream({
                    model: EASY_START_MODEL,
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages: currentMessages,
                    tools: easyStartService.EASY_START_TOOLS
                });

                let toolUseBlocks = [];
                let currentToolUse = null;
                let assistantContentBlocks = [];
                let stopReason = null;

                for await (const event of stream) {
                    if (clientDisconnected) break;

                    if (event.type === 'content_block_start') {
                        if (event.content_block.type === 'text') {
                            assistantContentBlocks.push({
                                type: 'text',
                                text: ''
                            });
                        } else if (event.content_block.type === 'tool_use') {
                            currentToolUse = {
                                id: event.content_block.id,
                                name: event.content_block.name,
                                inputJson: ''
                            };
                            assistantContentBlocks.push({
                                type: 'tool_use',
                                id: event.content_block.id,
                                name: event.content_block.name,
                                input: {}
                            });
                            // Signal frontend that creation is starting
                            sendSSE(res, {
                                type: 'tool_start',
                                tool: event.content_block.name
                            });
                        }
                    } else if (event.type === 'content_block_delta') {
                        if (event.delta.type === 'text_delta') {
                            // Stream text to frontend
                            const lastBlock = assistantContentBlocks[assistantContentBlocks.length - 1];
                            if (lastBlock?.type === 'text') {
                                lastBlock.text += event.delta.text;
                            }
                            sendSSE(res, {
                                type: 'content',
                                text: event.delta.text
                            });
                        } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
                            currentToolUse.inputJson += event.delta.partial_json;
                        }
                    } else if (event.type === 'content_block_stop') {
                        if (currentToolUse) {
                            // Parse and execute the tool
                            try {
                                const toolInput = JSON.parse(currentToolUse.inputJson);
                                // Update the content block with parsed input
                                const toolBlock = assistantContentBlocks.find(
                                    b => b.type === 'tool_use' && b.id === currentToolUse.id
                                );
                                if (toolBlock) toolBlock.input = toolInput;

                                // Execute the tool call
                                const result = await easyStartService.executeToolCall(
                                    currentToolUse.name,
                                    toolInput,
                                    toolContext
                                );

                                // Store for tool_result message
                                toolUseBlocks.push({
                                    id: currentToolUse.id,
                                    name: currentToolUse.name,
                                    result
                                });

                                // Stream creation card to frontend
                                sendSSE(res, {
                                    type: 'resource_created',
                                    tool: currentToolUse.name,
                                    success: result.success,
                                    data: result.data || null,
                                    error: result.error || null
                                });
                            } catch (parseError) {
                                logger.error('Easy Start - Failed to parse tool input', {
                                    error: parseError.message,
                                    tool: currentToolUse.name
                                });
                                toolUseBlocks.push({
                                    id: currentToolUse.id,
                                    name: currentToolUse.name,
                                    result: { success: false, error: 'Failed to parse tool parameters' }
                                });
                            }
                            currentToolUse = null;
                        }
                    } else if (event.type === 'message_delta') {
                        stopReason = event.delta.stop_reason;
                    }
                }

                // Decide whether to continue
                if (stopReason === 'tool_use' && toolUseBlocks.length > 0) {
                    // Build tool result messages
                    const toolResultContent = toolUseBlocks.map(tb => ({
                        type: 'tool_result',
                        tool_use_id: tb.id,
                        content: tb.result.success
                            ? JSON.stringify({ success: true, ...tb.result.data })
                            : JSON.stringify({ success: false, error: tb.result.error })
                    }));

                    currentMessages = [
                        ...currentMessages,
                        { role: 'assistant', content: assistantContentBlocks },
                        { role: 'user', content: toolResultContent }
                    ];

                    // Reset for next loop
                    toolUseBlocks = [];
                    continueLoop = true;
                } else {
                    continueLoop = false;
                }
            }

            if (loopCount >= MAX_LOOPS) {
                sendSSE(res, {
                    type: 'content',
                    text: '\n\nI\'ve created several tools for you. You can find them all in Execute 120!'
                });
            }

            sendSSE(res, '[DONE]');
        } catch (error) {
            logger.error('Easy Start stream error', { error: error.message });
            if (!clientDisconnected) {
                sendSSE(res, { type: 'error', error: error.message });
                sendSSE(res, '[DONE]');
            }
        } finally {
            clearTimeout(timeout);
            if (!clientDisconnected) {
                res.end();
            }
        }
    });

    /**
     * GET /api/easy-start/departments
     * List active departments for context
     */
    router.get('/departments', async (req, res) => {
        try {
            const supabaseClient = req.supabase || supabase;
            const orgId = req.headers['x-org-id'];

            let query = supabaseClient
                .from('departments')
                .select('id, name, description, icon')
                .eq('is_active', true)
                .order('sort_order');

            if (orgId) {
                query = query.eq('org_id', orgId);
            }

            const { data, error } = await query;
            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            console.error('Easy Start - Error fetching departments:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};

/**
 * Send an SSE event to the client
 */
function sendSSE(res, data) {
    if (typeof data === 'string') {
        res.write(`data: ${data}\n\n`);
    } else {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
}
