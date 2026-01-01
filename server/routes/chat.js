/**
 * Chat Routes - Insight 360
 * Multi-LLM chat endpoints (Claude + OpenAI)
 * Version: 2.2.0 - Added root POST endpoint for agent-based chat
 */

const express = require('express');
const router = express.Router();

// Import LLM services
const anthropic = require('../services/anthropic');
const openai = require('../services/openai');

// Initialize services with API keys
if (process.env.ANTHROPIC_API_KEY) {
    anthropic.initialize(process.env.ANTHROPIC_API_KEY);
}
if (process.env.OPENAI_API_KEY && openai.initialize) {
    openai.initialize(process.env.OPENAI_API_KEY);
}

// Model configurations for frontend with capability flags
const CLAUDE_MODELS = [
    { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', tier: 'premium', vision: true, pdf: true },
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', tier: 'default', vision: true, pdf: true },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', tier: 'fast', vision: true, pdf: true },
    { id: 'claude-opus-4-1-20250805', name: 'Claude Opus 4.1', tier: 'premium', vision: true, pdf: true },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', tier: 'premium', vision: true, pdf: true },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', tier: 'standard', vision: true, pdf: true }
];

const OPENAI_MODELS = [
    // GPT-5.2 Family (Latest - December 2025)
    { id: 'gpt-5.2', name: 'GPT-5.2 Thinking', tier: 'flagship', vision: true, reasoning: true, imageGen: true },
    { id: 'gpt-5.2-chat-latest', name: 'GPT-5.2 Instant', tier: 'flagship', vision: true, imageGen: true },
    { id: 'gpt-5.2-pro', name: 'GPT-5.2 Pro', tier: 'premium', vision: true, reasoning: true, imageGen: true },
    // GPT-4o Family
    { id: 'gpt-4o', name: 'GPT-4o', tier: 'standard', vision: true, audio: true, imageGen: true },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tier: 'efficient', vision: true, imageGen: true },
    // O-Series Reasoning
    { id: 'o1', name: 'o1', tier: 'reasoning', vision: true, reasoning: true },
    { id: 'o1-mini', name: 'o1-mini', tier: 'reasoning', reasoning: true },
    // Legacy
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', tier: 'legacy', vision: true, imageGen: true }
];

// Image generation models (separate from chat models)
const IMAGE_MODELS = [
    { id: 'gpt-image-1.5', name: 'GPT Image 1.5', tier: 'flagship', sizes: ['1024x1024', '1024x1792', '1792x1024'] },
    { id: 'dall-e-3', name: 'DALL-E 3', tier: 'premium', sizes: ['1024x1024', '1024x1792', '1792x1024'] },
    { id: 'dall-e-2', name: 'DALL-E 2', tier: 'standard', sizes: ['256x256', '512x512', '1024x1024'] }
];

/**
 * Determine provider from model ID
 */
function getProvider(modelId) {
    if (!modelId) return 'anthropic';
    if (modelId.startsWith('claude')) return 'anthropic';
    if (modelId.startsWith('gpt') || modelId.startsWith('o1') || modelId.startsWith('dall-e')) return 'openai';
    return 'anthropic'; // Default
}

/**
 * Extract text and multimodal content from a message
 * Handles both string content and array content (multimodal)
 */
function extractMessageContent(message) {
    const content = message.content;

    // Simple string content
    if (typeof content === 'string') {
        return { text: content, images: [], documents: [] };
    }

    // Array content (multimodal)
    if (Array.isArray(content)) {
        const result = { text: '', images: [], documents: [] };

        for (const block of content) {
            if (block.type === 'text') {
                result.text += (result.text ? '\n' : '') + block.text;
            } else if (block.type === 'image' && block.source) {
                result.images.push({
                    mediaType: block.source.media_type,
                    data: block.source.data
                });
            } else if (block.type === 'document' && block.source) {
                result.documents.push({
                    mediaType: block.source.media_type,
                    data: block.source.data
                });
            }
        }

        return result;
    }

    return { text: String(content), images: [], documents: [] };
}

/**
 * Normalize history messages - convert multimodal to text for history
 * (keeps things simpler for conversation continuity)
 */
function normalizeHistoryMessages(messages) {
    return messages.map(msg => {
        if (typeof msg.content === 'string') {
            return msg;
        }
        // For array content, extract just the text
        if (Array.isArray(msg.content)) {
            const text = msg.content
                .filter(block => block.type === 'text')
                .map(block => block.text)
                .join('\n');
            return { ...msg, content: text || '[Multimodal content]' };
        }
        return msg;
    });
}

/**
 * GET /api/chat/models
 * Returns available models grouped by provider
 */
router.get('/models', (_req, res) => {
    const models = {
        anthropic: CLAUDE_MODELS,
        openai: OPENAI_MODELS
    };

    // Filter out providers without API keys
    const available = {};
    if (process.env.ANTHROPIC_API_KEY) {
        available.anthropic = models.anthropic;
    }
    if (process.env.OPENAI_API_KEY) {
        available.openai = models.openai;
        available.imageModels = IMAGE_MODELS;
    }

    res.json({
        success: true,
        models: available,
        default: 'claude-sonnet-4-5-20250929'
    });
});

/**
 * POST /api/chat
 * Primary chat endpoint - supports both direct LLM chat and agent-based chat
 *
 * For agent chat: { message, agent_id, context? }
 * For direct chat: { message, model?, systemPrompt? }
 */
router.post('/', async (req, res) => {
    try {
        const { message, agent_id, context, model, systemPrompt } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        // Agent-based chat
        if (agent_id) {
            try {
                const { executeAgent } = require('../services/agentService');

                const result = await executeAgent(agent_id, {
                    userMessage: message,
                    conversationHistory: [],
                    includeOnDemand: []
                });

                return res.json({
                    success: true,
                    response: result.response,
                    model: result.model,
                    provider: result.provider,
                    usage: result.usage
                });
            } catch (agentError) {
                console.error('Agent execution error:', agentError);
                return res.status(500).json({
                    success: false,
                    error: agentError.message || 'Agent execution failed'
                });
            }
        }

        // Direct LLM chat (no agent)
        const selectedModel = model || 'claude-sonnet-4-5-20250929';
        const provider = getProvider(selectedModel);

        // Build system prompt with optional context
        let fullSystemPrompt = systemPrompt || '';
        if (context) {
            fullSystemPrompt += (fullSystemPrompt ? '\n\n' : '') + '# Context\n\n' + context;
        }

        let response;

        if (provider === 'anthropic') {
            response = await anthropic.chat({
                message,
                model: selectedModel,
                systemPrompt: fullSystemPrompt,
                history: []
            });
        } else if (provider === 'openai') {
            response = await openai.chat({
                message,
                model: selectedModel,
                systemPrompt: fullSystemPrompt,
                history: []
            });
        } else {
            throw new Error(`Unknown provider: ${provider}`);
        }

        res.json({
            success: true,
            response: response.content,
            model: response.model,
            provider,
            usage: response.usage
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/chat/message
 * Send a message and get a response (non-streaming, supports multimodal)
 */
router.post('/message', async (req, res) => {
    try {
        const { messages, model = 'claude-sonnet-4-5-20250929', systemPrompt } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Messages array is required'
            });
        }

        const provider = getProvider(model);

        // Get the last user message and previous messages as history
        const lastMessage = messages[messages.length - 1];
        const history = messages.slice(0, -1);

        // Extract content from the last message (handles multimodal)
        const { text, images, documents } = extractMessageContent(lastMessage);
        const allMedia = [...images, ...documents];
        const normalizedHistory = normalizeHistoryMessages(history);

        let response;

        if (provider === 'anthropic') {
            response = await anthropic.chat({
                message: text,
                model,
                systemPrompt,
                history: normalizedHistory,
                images: allMedia
            });
        } else if (provider === 'openai') {
            response = await openai.chat({
                message: text,
                model,
                systemPrompt,
                history: normalizedHistory,
                images: allMedia
            });
        } else {
            throw new Error(`Unknown provider: ${provider}`);
        }

        res.json({
            success: true,
            response: response.content,
            model: response.model,
            provider,
            usage: response.usage
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/chat/stream
 * Send a message and stream the response (supports multimodal content)
 */
router.post('/stream', async (req, res) => {
    try {
        const { messages, model = 'claude-sonnet-4-5-20250929', systemPrompt } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Messages array is required'
            });
        }

        const provider = getProvider(model);

        // Get the last user message and previous messages as history
        const lastMessage = messages[messages.length - 1];
        const history = messages.slice(0, -1);

        // Extract content from the last message (handles multimodal)
        const { text, images, documents } = extractMessageContent(lastMessage);

        // Combine images and documents for vision-capable models
        const allMedia = [...images, ...documents];

        // Normalize history (convert multimodal to text-only for simplicity)
        const normalizedHistory = normalizeHistoryMessages(history);

        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        let stream;

        if (provider === 'anthropic') {
            stream = anthropic.streamChat({
                message: text,
                model,
                systemPrompt,
                history: normalizedHistory,
                images: allMedia
            });
        } else if (provider === 'openai') {
            // Check if OpenAI has streamChat
            if (openai.streamChat) {
                stream = openai.streamChat({
                    message: text,
                    model,
                    systemPrompt,
                    history: normalizedHistory,
                    images: allMedia
                });
            } else if (openai.stream) {
                stream = openai.stream({
                    message: text,
                    model,
                    systemPrompt,
                    history: normalizedHistory,
                    images: allMedia
                });
            } else {
                throw new Error('OpenAI streaming not available');
            }
        } else {
            throw new Error(`Unknown provider: ${provider}`);
        }

        // Stream the response
        for await (const chunk of stream) {
            if (chunk.type === 'text') {
                res.write(`data: ${JSON.stringify({ type: 'content', text: chunk.content })}\n\n`);
            } else if (chunk.type === 'content') {
                res.write(`data: ${JSON.stringify({ type: 'content', text: chunk.text || chunk.content })}\n\n`);
            } else if (chunk.type === 'done') {
                res.write(`data: ${JSON.stringify({ type: 'done', usage: chunk.usage })}\n\n`);
            } else if (chunk.type === 'error') {
                res.write(`data: ${JSON.stringify({ type: 'error', error: chunk.error })}\n\n`);
            } else if (chunk.type === 'search_start' || chunk.type === 'search_query' || chunk.type === 'search_complete') {
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }
        }
        
        res.write('data: [DONE]\n\n');
        res.end();
        
    } catch (error) {
        console.error('Stream error:', error);
        
        // If headers already sent, send error as SSE
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
            res.end();
        } else {
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    }
});

/**
 * POST /api/chat/with-search
 * Chat with web search integration (supports multimodal content)
 */
router.post('/with-search', async (req, res) => {
    try {
        const {
            messages,
            model = 'claude-sonnet-4-5-20250929',
            systemPrompt,
            searchQuery
        } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Messages array is required'
            });
        }

        let searchResults = null;

        // Perform search if query provided
        if (searchQuery) {
            try {
                const search = require('../services/search');
                searchResults = await search.search(searchQuery);
            } catch (searchError) {
                console.warn('Search failed:', searchError.message);
            }
        }

        // Augment system prompt with search results
        let augmentedSystemPrompt = systemPrompt || '';
        if (searchResults && Array.isArray(searchResults) && searchResults.length > 0) {
            augmentedSystemPrompt += `\n\nWeb Search Results for "${searchQuery}":\n`;
            searchResults.forEach((result, i) => {
                augmentedSystemPrompt += `\n[${i + 1}] ${result.title}\n${result.snippet}\nSource: ${result.url}\n`;
            });
        }

        const provider = getProvider(model);

        // Get the last user message and previous messages as history
        const lastMessage = messages[messages.length - 1];
        const history = messages.slice(0, -1);

        // Extract content from the last message (handles multimodal)
        const { text, images, documents } = extractMessageContent(lastMessage);
        const allMedia = [...images, ...documents];
        const normalizedHistory = normalizeHistoryMessages(history);

        let response;

        if (provider === 'anthropic') {
            response = await anthropic.chat({
                message: text,
                model,
                systemPrompt: augmentedSystemPrompt,
                history: normalizedHistory,
                images: allMedia
            });
        } else if (provider === 'openai') {
            response = await openai.chat({
                message: text,
                model,
                systemPrompt: augmentedSystemPrompt,
                history: normalizedHistory,
                images: allMedia
            });
        } else {
            throw new Error(`Unknown provider: ${provider}`);
        }
        
        res.json({
            success: true,
            response: response.content,
            model: response.model,
            provider,
            searchResults: searchResults || null,
            usage: response.usage
        });
        
    } catch (error) {
        console.error('Chat with search error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/chat/voice/transcribe
 * Transcribe audio to text
 */
router.post('/voice/transcribe', async (req, res) => {
    try {
        // This would use OpenAI's Whisper API
        // For now, return a placeholder
        res.json({
            success: false,
            error: 'Voice transcription not yet implemented'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
