/**
 * INSIGHT 360 - Research Studio API Routes
 * Version: 1.0.0
 *
 * NotebookLM-style research and content synthesis endpoints.
 *
 * Endpoints:
 *   - Studios CRUD (5 endpoints)
 *   - Sources Management (5 endpoints)
 *   - Chat (3 endpoints)
 *   - Outputs (5 endpoints)
 */

const express = require('express');
const multer = require('multer');
const { randomUUID: uuidv4 } = require('crypto');

// Services
const studioService = require('../services/researchStudioService');
const sourceProcessor = require('../services/sourceProcessor');
const outputService = require('../services/studioOutputService');
const llmRegistry = require('../services/llmRegistry');

// LLM clients - initialized once, not per-request
const Anthropic = require('@anthropic-ai/sdk');
const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

let openaiClient = null;
function getOpenAI() {
    if (!openaiClient) {
        const OpenAI = require('openai');
        openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openaiClient;
}

let perplexityClient = null;
function getPerplexity() {
    if (!perplexityClient) {
        const OpenAI = require('openai');
        perplexityClient = new OpenAI({
            apiKey: process.env.PERPLEXITY_API_KEY,
            baseURL: 'https://api.perplexity.ai'
        });
    }
    return perplexityClient;
}

let geminiInstance = null;
function getGemini() {
    if (!geminiInstance) {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        geminiInstance = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    }
    return geminiInstance;
}

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max
    }
});

/**
 * Research Studio Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
module.exports = function(supabase) {
    const router = express.Router();

    // Inject shared Supabase client into services
    studioService.setSupabase(supabase);
    sourceProcessor.setSupabase(supabase);
    outputService.setSupabase(supabase);

    // Initialize storage bucket on startup
    sourceProcessor.initializeStorage().catch(err => {
        console.error('Failed to initialize storage:', err);
    });

    // Phase 44: Module access middleware for Research Studio
    // Checks if user's tier and role allow access to this module
    router.use(async (req, res, next) => {
        try {
            const userId = req.userId || req.userId;
            const orgId = req.headers['x-org-id'];

            // Skip check if no user context (will fail auth later anyway)
            if (!userId) {
                return next();
            }

            // Check module access using database function
            const { data: canAccess, error } = await supabase
                .rpc('can_access_module', {
                    p_user_id: userId,
                    p_module_id: 'research_studio',
                    p_org_id: orgId || null
                });

            if (error) {
                console.error('Module access check error:', error);
                // Don't block on database errors
                return next();
            }

            if (canAccess === false) {
                return res.status(403).json({
                    success: false,
                    error: 'Research Studio requires a Business tier or higher subscription',
                    module: 'research_studio',
                    upgrade_required: true
                });
            }

            next();
        } catch (err) {
            console.error('Module access middleware error:', err);
            next(); // Don't block on errors
        }
    });

    // ============================================================================
    // STUDIOS CRUD ENDPOINTS
    // ============================================================================

    /**
     * GET /api/research-studios
     * List all research studios for the user
     */
    router.get('/', async (req, res) => {
        try {
            const userId = req.userId || null;
            const { includeArchived, limit, offset } = req.query;

            const result = await studioService.listStudios(userId, {
                includeArchived: includeArchived === 'true',
                limit: parseInt(limit) || 50,
                offset: parseInt(offset) || 0
            });

            res.json({
                success: true,
                data: result.studios,
                pagination: {
                    total: result.total,
                    limit: parseInt(limit) || 50,
                    offset: parseInt(offset) || 0
                }
            });
        } catch (error) {
            console.error('Error listing studios:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/research-studios
     * Create a new research studio
     */
    router.post('/', async (req, res) => {
        try {
            const userId = req.userId || null;
            const { title, description, settings } = req.body;

            if (!title || typeof title !== 'string' || title.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Title is required'
                });
            }

            const studio = await studioService.createStudio(
                { title: title.trim(), description, settings },
                userId
            );

            res.status(201).json({
                success: true,
                data: studio
            });
        } catch (error) {
            console.error('Error creating studio:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/research-studios/:id
     * Get a research studio with sources and outputs
     */
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.userId || null;

            const studio = await studioService.getStudio(id, userId);

            res.json({
                success: true,
                data: studio
            });
        } catch (error) {
            console.error('Error getting studio:', error);
            const status = error.message === 'Studio not found' ? 404 : 500;
            res.status(status).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/research-studios/:id
     * Update a research studio
     */
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { title, description, settings, is_archived } = req.body;

            const studio = await studioService.updateStudio(id, {
                title,
                description,
                settings,
                is_archived
            });

            res.json({
                success: true,
                data: studio
            });
        } catch (error) {
            console.error('Error updating studio:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/research-studios/:id
     * Delete a research studio and all related data
     */
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            await studioService.deleteStudio(id);

            res.json({
                success: true,
                message: 'Studio deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting studio:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // SOURCES MANAGEMENT ENDPOINTS
    // ============================================================================

    /**
     * POST /api/research-studios/:id/sources
     * Upload a source file or add URL/text source
     */
    router.post('/:id/sources', upload.single('file'), async (req, res) => {
        try {
            const { id: studioId } = req.params;
            const { url, text, title } = req.body;

            let sourceData;

            if (req.file) {
                // File upload
                const validation = sourceProcessor.validateFile(req.file);
                if (!validation.valid) {
                    return res.status(400).json({
                        success: false,
                        error: validation.errors.join(', ')
                    });
                }

                sourceData = await sourceProcessor.processSourceFile(req.file, studioId);
            } else if (url) {
                // URL source
                sourceData = await sourceProcessor.processUrlSource(url, studioId);
            } else if (text) {
                // Text source
                sourceData = sourceProcessor.processTextSource(text, title);
            } else {
                return res.status(400).json({
                    success: false,
                    error: 'No source provided. Upload a file, provide a URL, or submit text.'
                });
            }

            // Add to database
            const source = await studioService.addSource(studioId, sourceData);

            res.status(201).json({
                success: true,
                data: source
            });
        } catch (error) {
            console.error('Error adding source:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/research-studios/:id/sources/:sourceId
     * Get a specific source with its chunks
     */
    router.get('/:id/sources/:sourceId', async (req, res) => {
        try {
            const { sourceId } = req.params;

            const source = await studioService.getSource(sourceId);

            res.json({
                success: true,
                data: source
            });
        } catch (error) {
            console.error('Error getting source:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PATCH /api/research-studios/:id/sources/:sourceId
     * Toggle source selection or update title
     */
    router.patch('/:id/sources/:sourceId', async (req, res) => {
        try {
            const { sourceId } = req.params;
            const { is_selected, title, content } = req.body;

            let source;

            if (is_selected !== undefined) {
                source = await studioService.toggleSourceSelection(sourceId, is_selected);
            }

            if (title !== undefined || content !== undefined) {
                source = await studioService.updateSource(sourceId, { title, content });
            }

            res.json({
                success: true,
                data: source
            });
        } catch (error) {
            console.error('Error updating source:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/research-studios/:id/sources/:sourceId
     * Delete a source
     */
    router.delete('/:id/sources/:sourceId', async (req, res) => {
        try {
            const { sourceId } = req.params;

            await studioService.deleteSource(sourceId);

            res.json({
                success: true,
                message: 'Source deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting source:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/research-studios/:id/sources/:sourceId/download
     * Get download URL for original source file
     */
    router.get('/:id/sources/:sourceId/download', async (req, res) => {
        try {
            const { sourceId } = req.params;

            const source = await studioService.getSource(sourceId);

            if (!source.file_path) {
                return res.status(400).json({
                    success: false,
                    error: 'Source has no downloadable file'
                });
            }

            const downloadUrl = await sourceProcessor.getDownloadUrl(source.file_path);

            res.json({
                success: true,
                data: {
                    url: downloadUrl,
                    filename: source.file_name,
                    expires_in: 3600
                }
            });
        } catch (error) {
            console.error('Error getting download URL:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // CHAT ENDPOINTS
    // ============================================================================

    /**
     * GET /api/research-studios/:id/suggested-questions
     * Generate suggested questions based on sources
     */
    router.get('/:id/suggested-questions', async (req, res) => {
        try {
            const { id: studioId } = req.params;
            const { count = 5 } = req.query;

            // Get source context
            const context = await studioService.assembleSourceContext(studioId, null, 50000);

            if (context.sourceCount === 0) {
                return res.json({
                    success: true,
                    data: {
                        questions: [
                            'What are the main themes across these sources?',
                            'Summarize the key findings',
                            'What questions do these sources answer?'
                        ]
                    }
                });
            }

            // Generate suggested questions using LLM
            const response = await anthropicClient.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1024,
                system: 'You are a research assistant. Generate insightful questions that a researcher might ask about the provided sources. Focus on questions that reveal key insights, connections, and implications.',
                messages: [{
                    role: 'user',
                    content: `Based on these sources, generate ${count} thoughtful questions a researcher might ask. Return ONLY a JSON array of question strings, no other text.

SOURCES:
${context.context.substring(0, 30000)}

Return format: ["Question 1?", "Question 2?", ...]`
                }]
            });

            let questions;
            try {
                const jsonMatch = response.content[0].text.match(/\[[\s\S]*\]/);
                questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
            } catch (e) {
                questions = [
                    'What are the main themes across these sources?',
                    'What are the key findings?',
                    'How do these sources relate to each other?'
                ];
            }

            res.json({
                success: true,
                data: { questions }
            });
        } catch (error) {
            console.error('Error generating suggested questions:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/research-studios/:id/chat
     * Send a message and get AI response (SSE streaming)
     */
    router.post('/:id/chat', async (req, res) => {
        const { id: studioId } = req.params;
        const { message, model, conversationId } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }

        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        try {
            // Get or create conversation
            let conversation;
            if (conversationId) {
                const { data } = await supabase
                    .from('studio_conversations')
                    .select('*')
                    .eq('id', conversationId)
                    .single();
                conversation = data;
            }

            if (!conversation) {
                conversation = await studioService.getActiveConversation(studioId);
            }

            // Save user message
            await studioService.addMessage(conversation.id, {
                role: 'user',
                content: message
            });

            // Assemble context from sources
            const context = await studioService.assembleSourceContext(studioId, message);

            // Send context info
            res.write(`data: ${JSON.stringify({
                type: 'context',
                sourceCount: context.sourceCount,
                chunkCount: context.chunkCount,
                tokenCount: context.totalTokens,
                sources: context.sources
            })}\n\n`);

            // Build system prompt with source context
            const systemPrompt = buildSystemPrompt(context);

            // Get chat history (limit to last 10 for context window management)
            // Note: The user message was already saved above, so history includes it
            const history = await studioService.getMessages(conversation.id, 10);

            // Convert to message format and ensure proper alternation for Anthropic API
            // Anthropic requires messages to alternate between user and assistant roles
            let messages = history.slice(-10).map(m => ({
                role: m.role,
                content: m.content
            }));

            // Ensure message alternation - merge consecutive same-role messages
            messages = ensureMessageAlternation(messages);

            // Stream response from LLM
            const startTime = Date.now();
            let fullResponse = '';

            // Use the appropriate LLM service based on model using llmRegistry
            const selectedModel = model || 'claude-sonnet-4-20250514';
            const provider = llmRegistry.getProvider(selectedModel);

            if (provider === 'anthropic') {
                // Use Anthropic
                const stream = anthropicClient.messages.stream({
                    model: selectedModel,
                    max_tokens: 8192,
                    system: systemPrompt,
                    messages: messages
                });

                for await (const event of stream) {
                    if (event.type === 'content_block_delta' && event.delta.text) {
                        const chunk = event.delta.text;
                        fullResponse += chunk;

                        res.write(`data: ${JSON.stringify({
                            type: 'chunk',
                            content: chunk
                        })}\n\n`);
                    }
                }
            } else if (provider === 'openai') {
                // Use OpenAI
                const stream = await getOpenAI().chat.completions.create({
                    model: selectedModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...messages
                    ],
                    max_tokens: 8192,
                    stream: true
                });

                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        fullResponse += content;

                        res.write(`data: ${JSON.stringify({
                            type: 'chunk',
                            content
                        })}\n\n`);
                    }
                }
            } else if (provider === 'perplexity') {
                // Use Perplexity (OpenAI-compatible API)
                const stream = await getPerplexity().chat.completions.create({
                    model: selectedModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...messages
                    ],
                    max_tokens: 8192,
                    stream: true
                });

                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        fullResponse += content;

                        res.write(`data: ${JSON.stringify({
                            type: 'chunk',
                            content
                        })}\n\n`);
                    }
                }
            } else if (provider === 'google') {
                // Use Google Gemini
                const geminiModel = getGemini().getGenerativeModel({ model: selectedModel });

                // Convert messages to Gemini format
                const geminiHistory = messages.slice(0, -1).map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }));

                const chat = geminiModel.startChat({
                    history: geminiHistory,
                    systemInstruction: systemPrompt
                });

                const result = await chat.sendMessageStream(message);

                for await (const chunk of result.stream) {
                    const content = chunk.text();
                    if (content) {
                        fullResponse += content;

                        res.write(`data: ${JSON.stringify({
                            type: 'chunk',
                            content
                        })}\n\n`);
                    }
                }
            } else {
                // Fallback to Claude for unknown providers
                const stream = anthropicClient.messages.stream({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 8192,
                    system: systemPrompt,
                    messages: messages
                });

                for await (const event of stream) {
                    if (event.type === 'content_block_delta' && event.delta.text) {
                        const chunk = event.delta.text;
                        fullResponse += chunk;

                        res.write(`data: ${JSON.stringify({
                            type: 'chunk',
                            content: chunk
                        })}\n\n`);
                    }
                }
            }

            // Extract citations from response with quotes
            const citations = extractCitationsWithQuotes(fullResponse, context.chunks, context.context);

            // Calculate latency
            const latencyMs = Date.now() - startTime;

            // Save assistant message
            const assistantMessage = await studioService.addMessage(conversation.id, {
                role: 'assistant',
                content: fullResponse,
                citations,
                model_used: selectedModel,
                latency_ms: latencyMs
            });

            // Generate follow-up questions
            const followUpQuestions = generateFollowUpQuestions(message, fullResponse);

            // Send completion event
            res.write(`data: ${JSON.stringify({
                type: 'done',
                messageId: assistantMessage.id,
                conversationId: conversation.id,
                citations,
                followUpQuestions,
                latencyMs
            })}\n\n`);

            res.end();

        } catch (error) {
            console.error('Chat error:', error);
            res.write(`data: ${JSON.stringify({
                type: 'error',
                error: error.message
            })}\n\n`);
            res.end();
        }
    });

    /**
     * GET /api/research-studios/:id/conversations
     * Get chat conversations for a studio with previews
     */
    router.get('/:id/conversations', async (req, res) => {
        try {
            const { id: studioId } = req.params;

            const conversations = await studioService.listConversations(studioId);

            res.json({
                success: true,
                data: conversations
            });
        } catch (error) {
            console.error('Error getting conversations:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/research-studios/:id/conversations
     * Create a new conversation
     */
    router.post('/:id/conversations', async (req, res) => {
        try {
            const { id: studioId } = req.params;
            const { title } = req.body;

            const conversation = await studioService.createConversation(studioId, title);

            res.status(201).json({
                success: true,
                data: conversation
            });
        } catch (error) {
            console.error('Error creating conversation:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * PUT /api/research-studios/:id/conversations/:conversationId
     * Update conversation (e.g., switch to it or rename)
     */
    router.put('/:id/conversations/:conversationId', async (req, res) => {
        try {
            const { id: studioId, conversationId } = req.params;
            const { title, is_active } = req.body;

            let conversation;

            if (is_active === true) {
                // Switch to this conversation
                conversation = await studioService.switchConversation(studioId, conversationId);
            } else if (title !== undefined) {
                // Update title
                conversation = await studioService.updateConversationTitle(conversationId, title);
            }

            res.json({
                success: true,
                data: conversation
            });
        } catch (error) {
            console.error('Error updating conversation:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/research-studios/:id/conversations/:conversationId
     * Delete a conversation
     */
    router.delete('/:id/conversations/:conversationId', async (req, res) => {
        try {
            const { conversationId } = req.params;

            await studioService.deleteConversation(conversationId);

            res.json({
                success: true,
                message: 'Conversation deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting conversation:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/research-studios/:id/conversations/:conversationId/messages
     * Get messages for a conversation
     */
    router.get('/:id/conversations/:conversationId/messages', async (req, res) => {
        try {
            const { conversationId } = req.params;
            const { limit } = req.query;

            const messages = await studioService.getMessages(
                conversationId,
                parseInt(limit) || 100
            );

            res.json({
                success: true,
                data: messages
            });
        } catch (error) {
            console.error('Error getting messages:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // ============================================================================
    // OUTPUTS ENDPOINTS
    // ============================================================================

    /**
     * POST /api/research-studios/:id/outputs/:type
     * Generate a studio output
     */
    router.post('/:id/outputs/:type', async (req, res) => {
        try {
            const { id: studioId, type: outputType } = req.params;
            const { title, model, options = {} } = req.body;

            const validTypes = Object.keys(outputService.OUTPUT_CONFIGS);

            if (!validTypes.includes(outputType)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid output type. Valid types: ${validTypes.join(', ')}`
                });
            }

            // Get source context
            const context = await studioService.assembleSourceContext(studioId);

            if (context.sourceCount === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No sources available. Add and select sources before generating outputs.'
                });
            }

            // Generate output using dedicated service
            const output = await outputService.generateOutput(
                studioId,
                outputType,
                context,
                { title, model, ...options }
            );

            res.status(201).json({
                success: true,
                data: output
            });
        } catch (error) {
            console.error('Error generating output:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/research-studios/:id/outputs/:outputId/score
     * Score a quiz submission
     */
    router.post('/:id/outputs/:outputId/score', async (req, res) => {
        try {
            const { outputId } = req.params;
            const { answers } = req.body;

            if (!answers || typeof answers !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'Answers object is required'
                });
            }

            // Get the quiz output
            const output = await studioService.getOutput(outputId);

            if (output.output_type !== 'quiz') {
                return res.status(400).json({
                    success: false,
                    error: 'Output is not a quiz'
                });
            }

            // Score the quiz
            const results = outputService.scoreQuiz(output.content, answers);

            res.json({
                success: true,
                data: results
            });
        } catch (error) {
            console.error('Error scoring quiz:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/research-studios/:id/outputs
     * List outputs for a studio
     */
    router.get('/:id/outputs', async (req, res) => {
        try {
            const { id: studioId } = req.params;
            const { type } = req.query;

            const outputs = await studioService.listOutputs(studioId, type);

            res.json({
                success: true,
                data: outputs
            });
        } catch (error) {
            console.error('Error listing outputs:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/research-studios/:id/outputs/:outputId
     * Get a specific output
     */
    router.get('/:id/outputs/:outputId', async (req, res) => {
        try {
            const { outputId } = req.params;

            const output = await studioService.getOutput(outputId);

            res.json({
                success: true,
                data: output
            });
        } catch (error) {
            console.error('Error getting output:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * DELETE /api/research-studios/:id/outputs/:outputId
     * Delete an output
     */
    router.delete('/:id/outputs/:outputId', async (req, res) => {
        try {
            const { outputId } = req.params;

            await studioService.deleteOutput(outputId);

            res.json({
                success: true,
                message: 'Output deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting output:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build system prompt with source context
 * @param {object} context - Assembled context
 * @returns {string} - System prompt
 */
function buildSystemPrompt(context) {
    const sourceList = context.sources.map((s, i) => `  ${i + 1}. ${s.title} (${s.type})`).join('\n');

    return `You are a helpful research assistant analyzing documents in a Research Studio. Your role is to provide accurate, well-cited answers based on the provided sources.

AVAILABLE SOURCES:
${sourceList}

SOURCE CONTENT:
${context.context}

---

INSTRUCTIONS:
1. Answer questions based ONLY on the information in the provided sources
2. ALWAYS cite your sources using [Source N] notation when referencing specific information
3. Include multiple citations when information appears in multiple sources
4. If information is not found in any source, clearly state: "I couldn't find information about this in the provided sources."
5. Be thorough but concise - prioritize accuracy over length
6. When summarizing, identify themes and patterns across sources
7. For factual claims, always include at least one citation

CITATION RULES:
- Use [Source 1], [Source 2], etc. inline with the text
- Place citations immediately after the relevant statement
- Multiple citations for the same claim: [Source 1][Source 3]
- When quoting directly, use quotation marks with citation

EXAMPLE:
"The project saw a 40% increase in efficiency [Source 2], which aligned with the initial projections [Source 1]."`;
}

/**
 * Extract citations from response with supporting quotes
 * @param {string} response - AI response
 * @param {object[]} chunks - Source chunks used
 * @param {string} contextText - Full context text for quote extraction
 * @returns {object[]} - Extracted citations with quotes
 */
function extractCitationsWithQuotes(response, chunks, contextText) {
    const citations = [];
    const citationPattern = /\[Source (\d+)\]/g;
    const seenSources = new Set();
    let match;

    while ((match = citationPattern.exec(response)) !== null) {
        const sourceIndex = parseInt(match[1]) - 1;
        if (sourceIndex >= 0 && sourceIndex < chunks.length) {
            const chunk = chunks[sourceIndex];
            const sourceKey = `${chunk.sourceId}-${sourceIndex}`;

            if (!seenSources.has(sourceKey)) {
                seenSources.add(sourceKey);

                // Extract a relevant quote from the source
                const quote = extractRelevantQuote(chunk.content || '', response, match.index);

                citations.push({
                    source_id: chunk.sourceId,
                    chunk_id: chunk.chunkId,
                    source_title: chunk.sourceTitle,
                    source_index: sourceIndex + 1,
                    quote: quote,
                    position: match.index
                });
            }
        }
    }

    // Sort by position in response
    citations.sort((a, b) => a.position - b.position);

    // Dedupe by source_id, keeping first occurrence
    const uniqueCitations = [];
    const seenIds = new Set();
    for (const citation of citations) {
        if (!seenIds.has(citation.source_id)) {
            seenIds.add(citation.source_id);
            uniqueCitations.push(citation);
        }
    }

    return uniqueCitations;
}

/**
 * Extract a relevant quote from source content
 * @param {string} sourceContent - Full source content
 * @param {string} response - AI response text
 * @param {number} citationPosition - Position of citation in response
 * @returns {string} - Relevant quote (truncated if needed)
 */
function extractRelevantQuote(sourceContent, response, citationPosition) {
    if (!sourceContent) return '';

    // Get the sentence before the citation for context
    const beforeCitation = response.substring(Math.max(0, citationPosition - 200), citationPosition);
    const sentences = beforeCitation.split(/[.!?]+/);
    const relevantSentence = sentences[sentences.length - 1] || '';

    // Extract key terms from the relevant sentence
    const keyTerms = relevantSentence
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 4);

    if (keyTerms.length === 0) {
        // Return first 150 chars of source
        return sourceContent.substring(0, 150).trim() + (sourceContent.length > 150 ? '...' : '');
    }

    // Find the best matching section in source
    const sourceSentences = sourceContent.split(/[.!?]+/);
    let bestMatch = { score: 0, sentence: '' };

    for (const sentence of sourceSentences) {
        const sentenceLower = sentence.toLowerCase();
        let score = 0;
        for (const term of keyTerms) {
            if (sentenceLower.includes(term)) {
                score++;
            }
        }
        if (score > bestMatch.score) {
            bestMatch = { score, sentence: sentence.trim() };
        }
    }

    if (bestMatch.score > 0 && bestMatch.sentence) {
        const quote = bestMatch.sentence.substring(0, 200);
        return quote + (bestMatch.sentence.length > 200 ? '...' : '');
    }

    // Fallback to first 150 chars
    return sourceContent.substring(0, 150).trim() + (sourceContent.length > 150 ? '...' : '');
}

/**
 * Generate follow-up questions based on conversation
 * @param {string} userMessage - User's question
 * @param {string} response - AI response
 * @returns {string[]} - Follow-up questions
 */
function generateFollowUpQuestions(userMessage, response) {
    const questions = [];

    // Extract topics from response for follow-ups
    const topics = extractTopics(response);

    if (topics.length > 0) {
        // Generate questions based on extracted topics
        const templates = [
            'Can you elaborate on {topic}?',
            'What are the implications of {topic}?',
            'How does {topic} relate to the main findings?',
            'Are there any contrasting views on {topic}?',
            'What evidence supports {topic}?'
        ];

        for (let i = 0; i < Math.min(3, topics.length); i++) {
            const template = templates[i % templates.length];
            questions.push(template.replace('{topic}', topics[i]));
        }
    }

    // Add generic follow-ups if needed
    if (questions.length < 3) {
        const genericFollowUps = [
            'Can you provide more specific examples?',
            'What are the key takeaways from this?',
            'Are there any limitations to consider?'
        ];
        questions.push(...genericFollowUps.slice(0, 3 - questions.length));
    }

    return questions.slice(0, 3);
}

/**
 * Extract key topics from text
 * @param {string} text - Text to analyze
 * @returns {string[]} - Extracted topics
 */
function extractTopics(text) {
    // Simple topic extraction based on noun phrases and key terms
    const topics = [];

    // Look for quoted terms
    const quoteMatches = text.match(/"([^"]+)"/g);
    if (quoteMatches) {
        topics.push(...quoteMatches.slice(0, 2).map(q => q.replace(/"/g, '')));
    }

    // Look for capitalized phrases (proper nouns, titles)
    const capitalMatches = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g);
    if (capitalMatches) {
        topics.push(...capitalMatches.slice(0, 2));
    }

    // Look for key indicator phrases
    const indicators = ['focuses on', 'highlights', 'emphasizes', 'discusses', 'examines', 'addresses'];
    for (const indicator of indicators) {
        const regex = new RegExp(`${indicator}\\s+([^.]+)`, 'i');
        const match = text.match(regex);
        if (match && match[1]) {
            const topic = match[1].trim().split(',')[0].substring(0, 50);
            if (topic.length > 5) {
                topics.push(topic);
            }
        }
    }

    // Dedupe and limit
    return [...new Set(topics)].slice(0, 5);
}

/**
 * Legacy citation extraction (kept for compatibility)
 * @param {string} response - AI response
 * @param {object[]} chunks - Source chunks used
 * @returns {object[]} - Extracted citations
 */
function extractCitations(response, chunks) {
    return extractCitationsWithQuotes(response, chunks, '');
}

// Note: Output generation moved to studioOutputService.js

/**
 * Ensure message alternation for Anthropic API compatibility
 * Merges consecutive same-role messages and ensures user/assistant alternation
 * @param {object[]} messages - Array of {role, content} messages
 * @returns {object[]} - Messages with proper alternation
 */
function ensureMessageAlternation(messages) {
    if (!messages || messages.length === 0) {
        return [];
    }

    const result = [];
    let lastRole = null;

    for (const msg of messages) {
        // Skip empty messages
        if (!msg.content || msg.content.trim() === '') {
            continue;
        }

        if (msg.role === lastRole) {
            // Merge consecutive same-role messages
            if (result.length > 0) {
                result[result.length - 1].content += '\n\n' + msg.content;
            }
        } else {
            result.push({ role: msg.role, content: msg.content });
            lastRole = msg.role;
        }
    }

    // Ensure the conversation starts with a user message (required by Anthropic)
    if (result.length > 0 && result[0].role === 'assistant') {
        // Prepend a placeholder user message if first message is from assistant
        result.unshift({ role: 'user', content: '(continuing conversation)' });
    }

    // Ensure the conversation ends with a user message for the API call
    if (result.length > 0 && result[result.length - 1].role === 'assistant') {
        // This shouldn't happen in normal flow, but handle it
        result.push({ role: 'user', content: '(please continue)' });
    }

    return result;
}
