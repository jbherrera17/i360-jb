/**
 * Chat Routes - Phase 2 Fixed
 * 
 * Complete multi-LLM chat API with:
 * - All Claude and GPT models
 * - Streaming responses
 * - Web search integration
 * - Vision/image analysis
 * - Document processing
 * - Voice input/output
 * - Conversation persistence
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');

// Services
const anthropicService = require('../services/anthropic');
const openaiService = require('../services/openai');
const searchService = require('../services/search');
const voiceService = require('../services/voice');
const fileProcessor = require('../utils/fileProcessor');

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// Helper to determine provider from model
function getProvider(model) {
    if (!model) return 'anthropic';
    const m = model.toLowerCase();
    if (m.includes('claude')) return 'anthropic';
    if (m.includes('gpt') || m.includes('o3') || m.includes('o4')) return 'openai';
    return 'anthropic';
}

// Helper to get service for provider
function getService(provider) {
    return provider === 'openai' ? openaiService : anthropicService;
}

/**
 * GET /api/chat/models
 * Get all available models
 */
router.get('/models', (req, res) => {
    const models = {
        anthropic: anthropicService.isAvailable() ? anthropicService.getModels() : [],
        openai: openaiService.isAvailable() ? openaiService.getModels() : []
    };
    
    // Flatten and sort by tier
    const allModels = [...models.anthropic, ...models.openai];
    
    // Group by provider and tier
    const grouped = {
        anthropic: {
            opus: allModels.filter(m => m.provider === 'anthropic' && m.tier === 'opus'),
            sonnet: allModels.filter(m => m.provider === 'anthropic' && m.tier === 'sonnet'),
            haiku: allModels.filter(m => m.provider === 'anthropic' && m.tier === 'haiku')
        },
        openai: {
            flagship: allModels.filter(m => m.provider === 'openai' && m.tier === 'flagship'),
            efficient: allModels.filter(m => m.provider === 'openai' && m.tier === 'efficient'),
            reasoning: allModels.filter(m => m.provider === 'openai' && m.tier === 'reasoning'),
            audio: allModels.filter(m => m.provider === 'openai' && m.tier === 'audio'),
            fast: allModels.filter(m => m.provider === 'openai' && m.tier === 'fast'),
            legacy: allModels.filter(m => m.provider === 'openai' && m.tier === 'legacy')
        }
    };
    
    res.json({
        success: true,
        data: {
            all: allModels,
            grouped,
            defaults: {
                anthropic: 'claude-sonnet-4-5-20250929',
                openai: 'gpt-4o'
            },
            searchEnabled: searchService.isAvailable(),
            voiceEnabled: voiceService.isAvailable()
        }
    });
});

/**
 * POST /api/chat/message
 * Send a message and get a response (non-streaming)
 */
router.post('/message', upload.array('files', 5), async (req, res) => {
    try {
        const {
            message,
            model,
            systemPrompt,
            history = [],
            enableSearch = false
        } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }
        
        // Parse history if it's a string
        const parsedHistory = typeof history === 'string' ? JSON.parse(history) : history;
        
        // Process uploaded files
        const images = [];
        let documentContext = '';
        
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    const processed = await fileProcessor.processFile(file);
                    
                    if (processed.type === 'image') {
                        images.push({
                            data: processed.data,
                            mediaType: processed.mediaType
                        });
                    } else if (processed.type === 'document') {
                        documentContext += `\n\n[Document: ${processed.filename}]\n${processed.text}`;
                    }
                } catch (err) {
                    console.error('File processing error:', err);
                }
            }
        }
        
        // Combine message with document context
        const fullMessage = documentContext 
            ? `${message}\n\n---\nAttached Documents:${documentContext}`
            : message;
        
        // Determine provider and service
        const provider = getProvider(model);
        const service = getService(provider);
        
        if (!service.isAvailable()) {
            return res.status(503).json({
                success: false,
                error: `${provider} service not available`
            });
        }
        
        // Get response
        const response = await service.chat({
            message: fullMessage,
            model,
            systemPrompt: systemPrompt || getDefaultSystemPrompt(),
            history: parsedHistory,
            images,
            enableSearch: enableSearch === 'true' || enableSearch === true
        });
        
        res.json({
            success: true,
            data: {
                content: response.content,
                model: response.model,
                modelName: response.modelName,
                provider,
                usage: response.usage
            }
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
 * Send a message and stream the response
 */
router.post('/stream', upload.array('files', 5), async (req, res) => {
    try {
        const {
            message,
            model,
            systemPrompt,
            history = [],
            enableSearch = false
        } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                error: 'Message is required'
            });
        }
        
        // Parse history
        const parsedHistory = typeof history === 'string' ? JSON.parse(history) : history;
        
        // Process files
        const images = [];
        let documentContext = '';
        
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    const processed = await fileProcessor.processFile(file);
                    if (processed.type === 'image') {
                        images.push({
                            data: processed.data,
                            mediaType: processed.mediaType
                        });
                    } else if (processed.type === 'document') {
                        documentContext += `\n\n[Document: ${processed.filename}]\n${processed.text}`;
                    }
                } catch (err) {
                    console.error('File processing error:', err);
                }
            }
        }
        
        const fullMessage = documentContext 
            ? `${message}\n\n---\nAttached Documents:${documentContext}`
            : message;
        
        // Set up SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        
        const provider = getProvider(model);
        const service = getService(provider);
        
        if (!service.isAvailable()) {
            res.write(`data: ${JSON.stringify({ type: 'error', error: `${provider} service not available` })}\n\n`);
            res.end();
            return;
        }
        
        // Stream response
        const stream = service.streamChat({
            message: fullMessage,
            model,
            systemPrompt: systemPrompt || getDefaultSystemPrompt(),
            history: parsedHistory,
            images,
            enableSearch: enableSearch === 'true' || enableSearch === true
        });
        
        for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        
        res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
        res.end();
        
    } catch (error) {
        console.error('Stream error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        res.end();
    }
});

/**
 * POST /api/chat/voice/transcribe
 * Transcribe audio to text
 */
router.post('/voice/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Audio file is required'
            });
        }
        
        if (!voiceService.isAvailable()) {
            return res.status(503).json({
                success: false,
                error: 'Voice service not available'
            });
        }
        
        const { model = 'gpt-4o-transcribe', language } = req.body;
        
        // Create a file-like object for the API
        const audioFile = new File([req.file.buffer], req.file.originalname, {
            type: req.file.mimetype
        });
        
        const result = await voiceService.transcribe(audioFile, {
            model,
            language
        });
        
        res.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('Transcription error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/chat/voice/speak
 * Convert text to speech
 */
router.post('/voice/speak', async (req, res) => {
    try {
        const {
            text,
            model = 'gpt-4o-mini-tts',
            voice = 'nova',
            speed = 1.0,
            instructions
        } = req.body;
        
        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'Text is required'
            });
        }
        
        if (!voiceService.isAvailable()) {
            return res.status(503).json({
                success: false,
                error: 'Voice service not available'
            });
        }
        
        const result = await voiceService.speak(text, {
            model,
            voice,
            speed: parseFloat(speed),
            instructions
        });
        
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('X-Model', result.model);
        res.setHeader('X-Voice', result.voice);
        res.send(result.audio);
        
    } catch (error) {
        console.error('TTS error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/chat/voice/options
 * Get available voice options
 */
router.get('/voice/options', (req, res) => {
    res.json({
        success: true,
        data: {
            sttModels: voiceService.getSTTModels(),
            ttsModels: voiceService.getTTSModels(),
            voices: voiceService.getVoices(),
            available: voiceService.isAvailable()
        }
    });
});

/**
 * GET /api/chat/conversations
 * Get conversation history (requires Supabase)
 */
router.get('/conversations', async (req, res) => {
    const supabase = req.supabase;
    const userId = req.userId;
    
    if (!supabase || !userId) {
        return res.json({
            success: true,
            data: { conversations: [] },
            message: 'Authentication required for conversation history'
        });
    }
    
    try {
        const { data, error } = await supabase
            .from('conversations')
            .select('id, title, model, created_at, updated_at')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        res.json({
            success: true,
            data: { conversations: data || [] }
        });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/chat/conversations
 * Create a new conversation
 */
router.post('/conversations', async (req, res) => {
    const supabase = req.supabase;
    const userId = req.userId;
    
    if (!supabase || !userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    
    try {
        const { title, model } = req.body;
        
        const { data, error } = await supabase
            .from('conversations')
            .insert({
                user_id: userId,
                title: title || 'New Conversation',
                model: model || 'claude-sonnet-4-5-20250929'
            })
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            data: { conversation: data }
        });
    } catch (error) {
        console.error('Create conversation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/chat/conversations/:id/messages
 * Get messages for a conversation
 */
router.get('/conversations/:id/messages', async (req, res) => {
    const supabase = req.supabase;
    const userId = req.userId;
    
    if (!supabase || !userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    
    try {
        const { id } = req.params;
        
        // Verify ownership
        const { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', id)
            .eq('user_id', userId)
            .single();
        
        if (!conv) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }
        
        // Get messages
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', id)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        res.json({
            success: true,
            data: { messages: messages || [] }
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/chat/conversations/:id/messages
 * Add a message to a conversation
 */
router.post('/conversations/:id/messages', async (req, res) => {
    const supabase = req.supabase;
    const userId = req.userId;
    
    if (!supabase || !userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    
    try {
        const { id } = req.params;
        const { role, content, model, tokensUsed } = req.body;
        
        // Verify ownership
        const { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', id)
            .eq('user_id', userId)
            .single();
        
        if (!conv) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }
        
        // Insert message
        const { data: message, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: id,
                role,
                content,
                model,
                tokens_used: tokensUsed || 0
            })
            .select()
            .single();
        
        if (error) throw error;
        
        // Update conversation timestamp
        await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', id);
        
        res.json({
            success: true,
            data: { message }
        });
    } catch (error) {
        console.error('Add message error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/chat/conversations/:id
 * Delete a conversation
 */
router.delete('/conversations/:id', async (req, res) => {
    const supabase = req.supabase;
    const userId = req.userId;
    
    if (!supabase || !userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    
    try {
        const { id } = req.params;
        
        // Delete messages first
        await supabase
            .from('messages')
            .delete()
            .eq('conversation_id', id);
        
        // Delete conversation
        const { error } = await supabase
            .from('conversations')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'Conversation deleted'
        });
    } catch (error) {
        console.error('Delete conversation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Default system prompt
 */
function getDefaultSystemPrompt() {
    return `You are a helpful AI assistant in the Insight 360 command center.
You have access to web search when needed for current information.
You can analyze images and process documents when provided.
Be concise, accurate, and helpful. Format responses clearly using markdown when appropriate.
If you're uncertain about something, say so.`;
}

module.exports = router;
