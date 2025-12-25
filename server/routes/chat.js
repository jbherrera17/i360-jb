/**
 * Chat Routes - Insight 360
 * Multi-LLM chat endpoints (Claude + OpenAI)
 * Version: 2.1.1 - Fixed to match service interfaces
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

// Model configurations for frontend
const CLAUDE_MODELS = [
    { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', tier: 'premium' },
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', tier: 'default' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', tier: 'fast' },
    { id: 'claude-opus-4-1-20250805', name: 'Claude Opus 4.1', tier: 'premium' },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', tier: 'premium' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', tier: 'standard' }
];

const OPENAI_MODELS = [
    { id: 'gpt-4.1', name: 'GPT-4.1', tier: 'flagship' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', tier: 'efficient' },
    { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', tier: 'fast' },
    { id: 'gpt-4o', name: 'GPT-4o', tier: 'default' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tier: 'efficient' },
    { id: 'o3', name: 'o3', tier: 'reasoning' },
    { id: 'o4-mini', name: 'o4-mini', tier: 'reasoning' },
    { id: 'o3-mini', name: 'o3-mini', tier: 'reasoning' }
];

/**
 * Determine provider from model ID
 */
function getProvider(modelId) {
    if (!modelId) return 'anthropic';
    if (modelId.startsWith('claude')) return 'anthropic';
    if (modelId.startsWith('gpt') || modelId.startsWith('o3') || modelId.startsWith('o4')) return 'openai';
    return 'anthropic'; // Default
}

/**
 * GET /api/chat/models
 * Returns available models grouped by provider
 */
router.get('/models', (req, res) => {
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
    }
    
    res.json({
        success: true,
        models: available,
        default: 'claude-sonnet-4-5-20250929'
    });
});

/**
 * POST /api/chat/message
 * Send a message and get a response (non-streaming)
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
        
        let response;
        
        if (provider === 'anthropic') {
            response = await anthropic.chat({
                message: lastMessage.content,
                model,
                systemPrompt,
                history
            });
        } else if (provider === 'openai') {
            response = await openai.chat({
                message: lastMessage.content,
                model,
                systemPrompt,
                history
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
 * Send a message and stream the response
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
        
        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        
        let stream;
        
        if (provider === 'anthropic') {
            stream = anthropic.streamChat({
                message: lastMessage.content,
                model,
                systemPrompt,
                history
            });
        } else if (provider === 'openai') {
            // Check if OpenAI has streamChat
            if (openai.streamChat) {
                stream = openai.streamChat({
                    message: lastMessage.content,
                    model,
                    systemPrompt,
                    history
                });
            } else if (openai.stream) {
                stream = openai.stream({
                    message: lastMessage.content,
                    model,
                    systemPrompt,
                    history
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
 * Chat with web search integration
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
        
        let response;
        
        if (provider === 'anthropic') {
            response = await anthropic.chat({
                message: lastMessage.content,
                model,
                systemPrompt: augmentedSystemPrompt,
                history
            });
        } else if (provider === 'openai') {
            response = await openai.chat({
                message: lastMessage.content,
                model,
                systemPrompt: augmentedSystemPrompt,
                history
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
