/**
 * Chat Routes - Insight 360
 * Multi-LLM chat endpoints (Claude + OpenAI + Perplexity + Gemini)
 * Version: 2.5.0 - Added Google Gemini support
 */

const express = require('express');
const router = express.Router();
const { validateBody, chatMessageSchema, chatStreamSchema } = require('../middleware/validate');

// Import LLM services
const anthropic = require('../services/anthropic');
const openai = require('../services/openai');
const perplexity = require('../services/perplexity');
const gemini = require('../services/gemini');
const llmRegistry = require('../services/llmRegistry');

// Import Higgins service for persona and knowledge injection
const higginsService = require('../services/higginsService');

// Import Open Brain for context retrieval
const openBrain = require('../services/openBrainService');

// Import guardrail enforcement for pre-screening and soul context
const guardrailEnforcement = require('../services/guardrailEnforcementService');

// Initialize services with error handling to prevent crashes
if (process.env.ANTHROPIC_API_KEY) {
    anthropic.initialize(process.env.ANTHROPIC_API_KEY);
}
if (process.env.OPENAI_API_KEY && openai.initialize) {
    try {
        openai.initialize(process.env.OPENAI_API_KEY);
    } catch (error) {
        console.error('⚠️  OpenAI initialization failed in chat route:', error.message);
    }
}
if (process.env.PERPLEXITY_API_KEY) {
    try {
        perplexity.initialize(process.env.PERPLEXITY_API_KEY);
    } catch (error) {
        console.error('⚠️  Perplexity initialization failed in chat route:', error.message);
    }
}
if (process.env.GOOGLE_API_KEY) {
    try {
        gemini.initialize(process.env.GOOGLE_API_KEY);
    } catch (error) {
        console.error('⚠️  Gemini initialization failed in chat route:', error.message);
    }
}

// Use centralized registry for provider detection
const { getProvider } = llmRegistry;
const DEFAULT_CHAT_MODEL = llmRegistry.getDefaultModel('anthropic');

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
    const apiKeys = {
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        perplexity: !!process.env.PERPLEXITY_API_KEY,
        google: !!process.env.GOOGLE_API_KEY
    };

    const available = llmRegistry.getAvailableModels(apiKeys);

    res.json({
        success: true,
        models: available,
        default: llmRegistry.getDefaultModel('anthropic')
    });
});

/**
 * GET /api/chat/models/all
 * Returns all chat models as a flat list (for agent configuration dropdowns)
 */
router.get('/models/all', (_req, res) => {
    const apiKeys = {
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        perplexity: !!process.env.PERPLEXITY_API_KEY,
        google: !!process.env.GOOGLE_API_KEY
    };

    const models = llmRegistry.getAllChatModels(apiKeys);

    res.json({
        success: true,
        models,
        default: llmRegistry.getDefaultModel('anthropic')
    });
});

/**
 * POST /api/chat
 * Primary chat endpoint - supports both direct LLM chat and agent-based chat
 *
 * For agent chat: { message, agent_id, context? }
 * For direct chat: { message, model?, systemPrompt? }
 */
router.post('/', validateBody(chatMessageSchema), async (req, res) => {
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
        const selectedModel = model || DEFAULT_CHAT_MODEL;
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
        } else if (provider === 'perplexity') {
            response = await perplexity.chat({
                message,
                model: selectedModel,
                systemPrompt: fullSystemPrompt,
                history: []
            });
        } else if (provider === 'google') {
            response = await gemini.chat({
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
            citations: response.citations || null,
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
 * Automatically injects Higgins persona with JB Brand Voice DNA
 */
router.post('/message', validateBody(chatStreamSchema), async (req, res) => {
    try {
        const { messages, model = DEFAULT_CHAT_MODEL, systemPrompt, skipHiggins = false } = req.body;

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

        // ── Guardrail Enforcement: Pre-screen ──
        const orgId = req.orgId || null;
        if (orgId && text) {
            const screenResult = await guardrailEnforcement.screenMessage(text, orgId, {
                userId: req.user?.id
            });

            if (screenResult.blocked) {
                return res.json({
                    success: true,
                    response: screenResult.responseMessage,
                    model,
                    provider: 'guardrail',
                    guardrail: {
                        blocked: true,
                        category: screenResult.category,
                        severity: screenResult.severity,
                        brightLine: screenResult.brightLine
                    }
                });
            }
        }

        // ── Guardrail Enforcement: Build soul context ──
        let soulContext = null;
        if (orgId) {
            try {
                soulContext = await guardrailEnforcement.buildSoulContextBlock(orgId, text);
            } catch (e) {
                console.warn('Failed to build soul context for chat message:', e.message);
            }
        }

        // Build Higgins-enhanced system prompt (unless explicitly skipped)
        let finalSystemPrompt = systemPrompt;
        if (!skipHiggins) {
            try {
                const modelName = higginsService.getModelDisplayName(model);
                const supabase = req.supabase || null;
                const isAdmin = req.user?.role === 'admin' || false;

                finalSystemPrompt = await higginsService.getHigginsSystemPrompt(supabase, {
                    isAdmin,
                    modelName,
                    userSystemPrompt: systemPrompt,
                    soulContext,
                    skipDatabaseFetch: !supabase
                });
            } catch (higginsError) {
                console.warn('Higgins prompt injection failed, using fallback:', higginsError.message);
                const modelName = higginsService.getModelDisplayName(model);
                finalSystemPrompt = higginsService.buildHigginsPrompt({
                    modelName,
                    userSystemPrompt: systemPrompt,
                    soulContext
                });
            }
        } else if (soulContext) {
            finalSystemPrompt = soulContext + '\n\n' + (finalSystemPrompt || '');
        }

        // Phase 61b: Inject relevant help documentation for help-seeking queries
        if (!skipHiggins) {
            const helpDocContent = higginsService.findRelevantHelpDoc(text);
            if (helpDocContent) {
                finalSystemPrompt += helpDocContent;
            }
        }

        // Open Brain: inject relevant thoughts based on the user's message
        if (!skipHiggins && openBrain.isConfigured() && text) {
            try {
                const obResult = await openBrain.searchThoughts(text, { limit: 5, threshold: 0.6 });
                const obText = obResult?.content?.[0]?.text;
                if (obText && !obText.startsWith('Found 0')) {
                    finalSystemPrompt += '\n---\nRELEVANT CONTEXT FROM OPEN BRAIN:\n' + obText + '\n';
                }
            } catch (obError) {
                console.warn('[OpenBrain] Context fetch failed (non-blocking):', obError.message);
            }
        }

        let response;

        if (provider === 'anthropic') {
            response = await anthropic.chat({
                message: text,
                model,
                systemPrompt: finalSystemPrompt,
                history: normalizedHistory,
                images: allMedia
            });
        } else if (provider === 'openai') {
            response = await openai.chat({
                message: text,
                model,
                systemPrompt: finalSystemPrompt,
                history: normalizedHistory,
                images: allMedia
            });
        } else if (provider === 'perplexity') {
            response = await perplexity.chat({
                message: text,
                model,
                systemPrompt: finalSystemPrompt,
                history: normalizedHistory
            });
        } else if (provider === 'google') {
            response = await gemini.chat({
                message: text,
                model,
                systemPrompt: finalSystemPrompt,
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
            citations: response.citations || null,
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
 * Automatically injects Higgins persona with JB Brand Voice DNA
 */
router.post('/stream', validateBody(chatStreamSchema), async (req, res) => {
    try {
        const { messages, model = DEFAULT_CHAT_MODEL, systemPrompt, skipHiggins = false } = req.body;

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

        // ── Guardrail Enforcement: Pre-screen ──
        const orgId = req.orgId || null;
        if (orgId && text) {
            const screenResult = await guardrailEnforcement.screenMessage(text, orgId, {
                userId: req.user?.id
            });

            if (screenResult.blocked) {
                // Set up SSE and immediately send guardrail block
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache, no-transform');
                res.setHeader('Connection', 'keep-alive');
                res.setHeader('X-Accel-Buffering', 'no');
                res.flushHeaders();

                res.write(`data: ${JSON.stringify({
                    type: 'guardrail_blocked',
                    category: screenResult.category,
                    brightLine: screenResult.brightLine,
                    message: screenResult.responseMessage,
                    severity: screenResult.severity
                })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
                return;
            }
        }

        // ── Guardrail Enforcement: Build soul context ──
        let soulContext = null;
        if (orgId) {
            try {
                soulContext = await guardrailEnforcement.buildSoulContextBlock(orgId, text);
            } catch (e) {
                console.warn('Failed to build soul context for chat stream:', e.message);
            }
        }

        // Build Higgins-enhanced system prompt (unless explicitly skipped)
        let finalSystemPrompt = systemPrompt;
        if (!skipHiggins) {
            try {
                const modelName = higginsService.getModelDisplayName(model);
                // Check if we have supabase access for knowledge injection
                const supabase = req.supabase || null;
                // TODO: Get isAdmin from user context when auth is fully implemented
                const isAdmin = req.user?.role === 'admin' || false;

                finalSystemPrompt = await higginsService.getHigginsSystemPrompt(supabase, {
                    isAdmin,
                    modelName,
                    userSystemPrompt: systemPrompt,
                    soulContext,
                    skipDatabaseFetch: !supabase
                });
            } catch (higginsError) {
                console.warn('Higgins prompt injection failed, using fallback:', higginsError.message);
                // Fall back to base persona without database knowledge
                const modelName = higginsService.getModelDisplayName(model);
                finalSystemPrompt = higginsService.buildHigginsPrompt({
                    modelName,
                    userSystemPrompt: systemPrompt,
                    soulContext
                });
            }
        } else if (soulContext) {
            // Even if Higgins is skipped, still inject soul context
            finalSystemPrompt = soulContext + '\n\n' + (finalSystemPrompt || '');
        }

        // Phase 61b: Inject relevant help documentation for help-seeking queries
        if (!skipHiggins) {
            const helpDocContent = higginsService.findRelevantHelpDoc(text);
            if (helpDocContent) {
                finalSystemPrompt += helpDocContent;
            }
        }

        // Open Brain: inject relevant thoughts based on the user's message
        if (!skipHiggins && openBrain.isConfigured() && text) {
            try {
                const obResult = await openBrain.searchThoughts(text, { limit: 5, threshold: 0.6 });
                const obText = obResult?.content?.[0]?.text;
                if (obText && !obText.startsWith('Found 0')) {
                    finalSystemPrompt += '\n---\nRELEVANT CONTEXT FROM OPEN BRAIN:\n' + obText + '\n';
                }
            } catch (obError) {
                console.warn('[OpenBrain] Context fetch failed (non-blocking):', obError.message);
            }
        }

        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        // Flush headers immediately to establish SSE connection
        res.flushHeaders();

        // Track client disconnect to stop wasting LLM tokens
        let clientDisconnected = false;
        req.on('close', () => {
            clientDisconnected = true;
        });

        // Stream timeout - prevent hung connections (2 minutes max)
        const streamTimeout = setTimeout(() => {
            if (!res.writableEnded) {
                res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream timeout' })}\n\n`);
                res.end();
            }
        }, 120000);

        let stream;

        if (provider === 'anthropic') {
            stream = anthropic.streamChat({
                message: text,
                model,
                systemPrompt: finalSystemPrompt,
                history: normalizedHistory,
                images: allMedia
            });
        } else if (provider === 'openai') {
            // Check if OpenAI has streamChat
            if (openai.streamChat) {
                stream = openai.streamChat({
                    message: text,
                    model,
                    systemPrompt: finalSystemPrompt,
                    history: normalizedHistory,
                    images: allMedia
                });
            } else if (openai.stream) {
                stream = openai.stream({
                    message: text,
                    model,
                    systemPrompt: finalSystemPrompt,
                    history: normalizedHistory,
                    images: allMedia
                });
            } else {
                throw new Error('OpenAI streaming not available');
            }
        } else if (provider === 'perplexity') {
            stream = perplexity.streamChat({
                message: text,
                model,
                systemPrompt: finalSystemPrompt,
                history: normalizedHistory
            });
        } else if (provider === 'google') {
            stream = gemini.streamChat({
                message: text,
                model,
                systemPrompt: finalSystemPrompt,
                history: normalizedHistory,
                images: allMedia
            });
        } else {
            throw new Error(`Unknown provider: ${provider}`);
        }

        // Stream the response
        for await (const chunk of stream) {
            // Stop streaming if client disconnected (saves LLM tokens)
            if (clientDisconnected) {
                console.warn('Client disconnected during stream, aborting');
                break;
            }
            if (chunk.type === 'text') {
                res.write(`data: ${JSON.stringify({ type: 'content', text: chunk.content })}\n\n`);
            } else if (chunk.type === 'content') {
                res.write(`data: ${JSON.stringify({ type: 'content', text: chunk.text || chunk.content })}\n\n`);
            } else if (chunk.type === 'done') {
                res.write(`data: ${JSON.stringify({ type: 'done', usage: chunk.usage })}\n\n`);
            } else if (chunk.type === 'error') {
                res.write(`data: ${JSON.stringify({ type: 'error', error: chunk.error })}\n\n`);
            } else if (chunk.type === 'citations') {
                res.write(`data: ${JSON.stringify({ type: 'citations', citations: chunk.citations })}\n\n`);
            } else if (chunk.type === 'search_start' || chunk.type === 'search_query' || chunk.type === 'search_complete') {
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }
        }

        clearTimeout(streamTimeout);
        if (!clientDisconnected) {
            res.write('data: [DONE]\n\n');
            res.end();
        }
        
    } catch (error) {
        clearTimeout(streamTimeout);
        console.error('Stream error:', error);

        // If headers already sent, send error as SSE
        if (res.headersSent) {
            if (!res.writableEnded) {
                res.write(`data: ${JSON.stringify({ type: 'error', error: process.env.NODE_ENV === 'production' ? 'Stream error occurred' : error.message })}\n\n`);
                res.end();
            }
        } else {
            res.status(500).json({
                success: false,
                error: process.env.NODE_ENV === 'production' ? 'Stream error occurred' : error.message
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
            model = DEFAULT_CHAT_MODEL,
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
        } else if (provider === 'perplexity') {
            // Perplexity has built-in search, so use it directly
            response = await perplexity.chat({
                message: text,
                model,
                systemPrompt: augmentedSystemPrompt,
                history: normalizedHistory
            });
            // Perplexity returns its own citations
            if (response.citations) {
                searchResults = response.citations;
            }
        } else if (provider === 'google') {
            response = await gemini.chat({
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
            citations: response.citations || null,
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
 * POST /api/chat/image/generate
 * Generate an image using OpenAI's image models
 */
router.post('/image/generate', async (req, res) => {
    try {
        const { prompt, model = 'gpt-image-1.5', size = '1792x1024', quality = 'standard', style = 'vivid' } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }

        if (!openai.isAvailable()) {
            return res.status(503).json({
                success: false,
                error: 'OpenAI service not available. Check API key configuration.'
            });
        }

        console.log(`[Image Generation] Generating image with ${model}: "${prompt.substring(0, 50)}..."`);

        const result = await openai.generateImage(prompt, {
            model,
            size,
            quality,
            style
        });

        res.json({
            success: true,
            images: result.images,
            model: result.model,
            modelName: result.modelName,
            prompt: prompt
        });

    } catch (error) {
        console.error('Image generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/chat/image/models
 * Get available image generation models
 */
router.get('/image/models', (req, res) => {
    if (!openai.isAvailable()) {
        return res.json({
            success: true,
            models: [],
            available: false
        });
    }

    const models = openai.getImageModels();
    res.json({
        success: true,
        models,
        available: true,
        default: 'gpt-image-1.5'
    });
});

// ============================================
// VOICE ENDPOINTS
// ============================================

const multer = require('multer');
const voiceService = require('../services/voice');

// Initialize voice service
if (process.env.OPENAI_API_KEY) {
    voiceService.initialize();
}

// Configure multer for audio uploads (memory storage, 10MB limit)
const audioUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

/**
 * POST /api/chat/voice/transcribe
 * Transcribe audio to text using OpenAI STT
 */
router.post('/voice/transcribe', audioUpload.single('audio'), async (req, res) => {
    try {
        if (!voiceService.isAvailable()) {
            return res.status(503).json({
                success: false,
                error: 'Voice service not available - OpenAI API key required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No audio file provided. Send as multipart/form-data with field name "audio"'
            });
        }

        const model = req.body.model || 'gpt-4o-transcribe';

        const result = await voiceService.transcribe(req.file.buffer, {
            model,
            filename: req.file.originalname || 'audio.webm',
            mimeType: req.file.mimetype || 'audio/webm'
        });

        res.json({
            success: true,
            text: result.text,
            model: result.model,
            modelName: result.modelName
        });
    } catch (error) {
        console.error('Voice transcription error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/chat/voice/tts
 * Convert text to speech using OpenAI TTS
 */
router.post('/voice/tts', async (req, res) => {
    try {
        if (!voiceService.isAvailable()) {
            return res.status(503).json({
                success: false,
                error: 'Voice service not available'
            });
        }

        const { text, voice = 'nova', speed = 1.0, model = 'gpt-4o-mini-tts', instructions = null } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Text is required'
            });
        }

        // Limit text length to prevent abuse
        const maxLen = 4096;
        const trimmedText = text.length > maxLen ? text.substring(0, maxLen) : text;

        const result = await voiceService.speak(trimmedText, {
            model,
            voice,
            speed: Math.max(0.25, Math.min(4.0, speed)),
            instructions
        });

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': result.audio.length,
            'X-Voice': result.voice,
            'X-Model': result.model
        });
        res.send(result.audio);
    } catch (error) {
        console.error('Voice TTS error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/chat/voice/voices
 * Get available voices and models
 */
router.get('/voice/voices', (req, res) => {
    res.json({
        success: true,
        available: voiceService.isAvailable(),
        voices: voiceService.getVoices(),
        models: {
            stt: voiceService.getSTTModels(),
            tts: voiceService.getTTSModels()
        }
    });
});

/**
 * GET /api/chat/voice/config
 * Get voice configuration for the chat frontend
 * Returns admin-configured defaults and enabled status
 */
router.get('/voice/config', async (req, res) => {
    try {
        // Try to load platform config for voice settings
        let voiceConfig = {
            stt_enabled: true,
            tts_enabled: true,
            default_stt_model: 'gpt-4o-transcribe',
            default_tts_model: 'gpt-4o-mini-tts',
            default_voice: 'nova',
            default_speed: 1.0,
            max_duration: 120,
            tts_instructions: ''
        };

        // Check if supabase is available and load config
        const supabase = req.app?.locals?.supabase;
        if (supabase) {
            const { data } = await supabase
                .from('platform_config')
                .select('feature_flags')
                .limit(1)
                .single();

            if (data?.feature_flags?.voice) {
                voiceConfig = { ...voiceConfig, ...data.feature_flags.voice };
            }
        }

        res.json({
            success: true,
            available: voiceService.isAvailable(),
            config: voiceConfig
        });
    } catch (error) {
        // Return defaults on error
        res.json({
            success: true,
            available: voiceService.isAvailable(),
            config: {
                stt_enabled: true,
                tts_enabled: true,
                default_stt_model: 'gpt-4o-transcribe',
                default_tts_model: 'gpt-4o-mini-tts',
                default_voice: 'nova',
                default_speed: 1.0,
                max_duration: 120,
                tts_instructions: ''
            }
        });
    }
});

module.exports = router;
