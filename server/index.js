/**
 * Insight 360 - Express Server
 * Phase 2.1 - With authentication and conversation persistence
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "https://api.anthropic.com", "https://api.openai.com", "https://*.supabase.co"],
            mediaSrc: ["'self'", "blob:"]
        }
    }
}));

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// ============================================
// SUPABASE CLIENT
// ============================================

let supabase = null;
const supabaseConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

if (supabaseConfigured) {
    supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}

// Attach Supabase to requests
app.use((req, res, next) => {
    req.supabase = supabase;
    next();
});

// ============================================
// AUTH MIDDLEWARE
// ============================================

const { authenticate, rateLimit } = require('./middleware/auth');

// Apply authentication to all routes
app.use(authenticate);

// Rate limiting for chat endpoints
app.use('/api/chat', rateLimit({ 
    windowMs: 60000, 
    max: 30,
    message: 'Too many chat requests. Please wait a moment.'
}));

// ============================================
// SERVICE STATUS
// ============================================

const services = {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    search: !!(process.env.BRAVE_SEARCH_API_KEY || process.env.TAVILY_API_KEY || process.env.SERPER_API_KEY),
    voice: !!process.env.OPENAI_API_KEY,
    supabase: supabaseConfigured
};

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '2.1.0',
        timestamp: new Date().toISOString(),
        services
    });
});

// Chat routes
const chatRoutes = require('./routes/chat');
app.use('/api/chat', chatRoutes);

// Conversation CRUD routes
app.get('/api/conversations', async (req, res) => {
    if (!supabase) {
        return res.json({ success: true, data: [] });
    }
    
    try {
        const userId = req.userId || req.headers['x-user-id'];
        if (!userId) {
            return res.json({ success: true, data: [] });
        }
        
        const { data, error } = await supabase
            .from('conversations')
            .select('id, title, model, created_at, updated_at')
            .eq('user_id', userId)
            .eq('is_archived', false)
            .order('updated_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Failed to fetch conversations:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/conversations', async (req, res) => {
    if (!supabase) {
        return res.json({ success: true, data: { id: crypto.randomUUID() } });
    }
    
    try {
        const userId = req.userId || req.headers['x-user-id'];
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
        res.json({ success: true, data });
    } catch (error) {
        console.error('Failed to create conversation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.patch('/api/conversations/:id', async (req, res) => {
    if (!supabase) {
        return res.json({ success: true });
    }
    
    try {
        const userId = req.userId || req.headers['x-user-id'];
        const { id } = req.params;
        const updates = req.body;
        
        const { data, error } = await supabase
            .from('conversations')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Failed to update conversation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/conversations/:id', async (req, res) => {
    if (!supabase) {
        return res.json({ success: true });
    }
    
    try {
        const userId = req.userId || req.headers['x-user-id'];
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
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to delete conversation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Message routes
app.get('/api/conversations/:id/messages', async (req, res) => {
    if (!supabase) {
        return res.json({ success: true, data: [] });
    }
    
    try {
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', id)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Failed to fetch messages:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/conversations/:id/messages', async (req, res) => {
    if (!supabase) {
        return res.json({ success: true, data: { id: crypto.randomUUID() } });
    }
    
    try {
        const { id } = req.params;
        const { role, content, model, tokens_used } = req.body;
        
        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: id,
                role,
                content,
                model,
                tokens_used: tokens_used || 0
            })
            .select()
            .single();
        
        if (error) throw error;
        
        // Update conversation timestamp
        await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', id);
        
        res.json({ success: true, data });
    } catch (error) {
        console.error('Failed to save message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Agents routes (basic for Phase 3)
app.get('/api/agents', async (req, res) => {
    if (!supabase) {
        return res.json({ success: true, data: [] });
    }
    
    try {
        const userId = req.userId || req.headers['x-user-id'];
        
        const { data, error } = await supabase
            .from('agents')
            .select('*')
            .or(`user_id.eq.${userId},is_public.eq.true`)
            .eq('is_active', true)
            .order('name');
        
        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('Failed to fetch agents:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// CATCH-ALL FOR SPA
// ============================================

app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`
═══════════════════════════════════════════════════════════
               INSIGHT 360 - Phase 2.1
═══════════════════════════════════════════════════════════

  Server running at http://localhost:${PORT}

  Services:
    • Anthropic Claude: ${services.anthropic ? '✓ Ready' : '✗ Not configured'}
    • OpenAI GPT:       ${services.openai ? '✓ Ready' : '✗ Not configured'}
    • Web Search:       ${services.search ? '✓ Ready' : '✗ Not configured'}
    • Voice:            ${services.voice ? '✓ Ready' : '✗ Not configured'}
    • Supabase:         ${services.supabase ? '✓ Ready' : '✗ Not configured'}

═══════════════════════════════════════════════════════════
`);
});

module.exports = app;
