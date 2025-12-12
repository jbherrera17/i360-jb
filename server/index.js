/**
 * Insight 360 Server - v2.1.2
 * Values-Based AI Ecosystem
 * 
 * Features:
 * - Multi-LLM support (Anthropic Claude, OpenAI GPT)
 * - Voice input/output (Speech-to-Text, Text-to-Speech)
 * - Web search integration (Brave, Tavily, Serper)
 * - File/image processing
 * - Streaming responses
 * - Conversation persistence (Supabase)
 * - System health monitoring
 * - Context Assets management (Phase 3)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');

// ============================================
// INITIALIZE EXPRESS APP
// ============================================

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// ============================================
// SECURITY MIDDLEWARE
// ============================================

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],  // <-- ADD THIS LINE
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            mediaSrc: ["'self'", "blob:"],
            connectSrc: [
                "'self'", 
                "https://api.anthropic.com", 
                "https://api.openai.com",
                "https://*.supabase.co",
                "https://unpkg.com"
            ]
        }
    }
}));

// ============================================
// COMPRESSION & CORS
// ============================================

app.use(compression());

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));

// ============================================
// BODY PARSING
// ============================================

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// STATIC FILES
// ============================================

app.use(express.static(path.join(__dirname, '../public')));

// ============================================
// REQUEST LOGGING (Development)
// ============================================

if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        const timestamp = new Date().toISOString();
        console.log(`${timestamp} ${req.method} ${req.path}`);
        next();
    });
}

// ============================================
// SUPABASE CLIENT
// ============================================

let supabase = null;
let supabaseConfigured = false;

function initializeSupabase() {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        try {
            const { createClient } = require('@supabase/supabase-js');
            supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
                {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    }
                }
            );
            supabaseConfigured = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize Supabase:', error.message);
            return false;
        }
    }
    return false;
}

// Attach Supabase to requests
app.use((req, res, next) => {
    req.supabase = supabase;
    next();
});

// ============================================
// SERVICES INITIALIZATION
// ============================================

// Service status tracking
const serviceStatus = {
    anthropic: false,
    openai: false,
    search: false,
    voice: false,
    supabase: false
};

// Initialize services
function initializeServices() {
    console.log('\n🚀 Initializing Insight 360 Services...\n');

    // Initialize Anthropic (Claude)
    if (process.env.ANTHROPIC_API_KEY) {
        try {
            const anthropicService = require('./services/anthropic');
            if (typeof anthropicService.initialize === 'function') {
                anthropicService.initialize(process.env.ANTHROPIC_API_KEY);
            }
            serviceStatus.anthropic = true;
            console.log('  ✅ Claude (Anthropic) - Ready');
        } catch (error) {
            console.log('  ❌ Claude (Anthropic) - Failed:', error.message);
        }
    } else {
        console.log('  ⚪ Claude (Anthropic) - No API key');
    }

    // Initialize OpenAI (GPT)
    if (process.env.OPENAI_API_KEY) {
        try {
            const openaiService = require('./services/openai');
            if (typeof openaiService.initialize === 'function') {
                openaiService.initialize(process.env.OPENAI_API_KEY);
            }
            serviceStatus.openai = true;
            serviceStatus.voice = true; // Voice uses OpenAI
            console.log('  ✅ GPT (OpenAI) - Ready');
            console.log('  ✅ Voice (OpenAI Audio) - Ready');
        } catch (error) {
            console.log('  ❌ GPT (OpenAI) - Failed:', error.message);
        }
    } else {
        console.log('  ⚪ GPT (OpenAI) - No API key');
    }

    // Initialize Web Search
    const searchApiKey = process.env.BRAVE_SEARCH_API_KEY || 
                         process.env.TAVILY_API_KEY || 
                         process.env.SERPER_API_KEY;
    if (searchApiKey) {
        try {
            const searchService = require('./services/search');
            if (typeof searchService.initialize === 'function') {
                searchService.initialize({
                    braveApiKey: process.env.BRAVE_SEARCH_API_KEY,
                    tavilyApiKey: process.env.TAVILY_API_KEY,
                    serperApiKey: process.env.SERPER_API_KEY
                });
            }
            serviceStatus.search = true;
            const provider = process.env.BRAVE_SEARCH_API_KEY ? 'Brave' :
                            process.env.TAVILY_API_KEY ? 'Tavily' : 'Serper';
            console.log(`  ✅ Web Search (${provider}) - Ready`);
        } catch (error) {
            console.log('  ❌ Web Search - Failed:', error.message);
        }
    } else {
        console.log('  ⚪ Web Search - No API key');
    }

    // Initialize Supabase
    if (initializeSupabase()) {
        serviceStatus.supabase = true;
        console.log('  ✅ Supabase (Database) - Ready');
    } else {
        console.log('  ⚪ Supabase - Not configured');
    }

    console.log('\n----------------------------------------\n');
}

// ============================================
// AUTHENTICATION MIDDLEWARE (Optional)
// ============================================

// Try to load auth middleware if it exists
try {
    const { authenticate, rateLimit } = require('./middleware/auth');
    
    // Apply authentication to API routes
    app.use('/api', authenticate);
    
    // Rate limiting for chat endpoints
    app.use('/api/chat', rateLimit({
        windowMs: 60000, // 1 minute
        max: 30, // 30 requests per minute
        message: 'Too many chat requests. Please wait a moment.'
    }));
    
    console.log('🔐 Authentication middleware loaded\n');
} catch (error) {
    // Auth middleware not available, continue without it
    console.log('ℹ️  Auth middleware not loaded (optional)\n');
}

// ============================================
// API ROUTES
// ============================================

// Health check route
const healthRoutes = require('./routes/health');
app.use('/api/health', healthRoutes);

// Chat routes (multi-LLM, streaming, voice, search)
const chatRoutes = require('./routes/chat');
app.use('/api/chat', chatRoutes);

// Context Assets routes (Phase 3)
try {
    const contextRoutes = require('./routes/context');
    app.use('/api/context', contextRoutes);
    console.log('📦 Context Assets routes loaded');
} catch (error) {
    console.log('ℹ️  Context routes not yet available:', error.message);
}

// Conversation routes (if separate file exists)
try {
    const conversationRoutes = require('./routes/conversations');
    app.use('/api/conversations', conversationRoutes);
} catch (error) {
    // Conversations handled by chat routes
}

// Agent routes (Phase 3 - placeholder)
try {
    const agentRoutes = require('./routes/agents');
    app.use('/api/agents', agentRoutes);
} catch (error) {
    // Agents not yet implemented
}

// Briefing routes (Phase 4 - placeholder)
try {
    const briefingRoutes = require('./routes/briefing');
    app.use('/api/briefing', briefingRoutes);
} catch (error) {
    // Briefings not yet implemented
}

// ============================================
// FRONTEND ROUTES
// ============================================

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve chat.html
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/chat.html'));
});

// Serve other pages
app.get('/agents', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/agents.html'));
});

app.get('/briefing', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/briefing.html'));
});

// Context management page (Phase 3)
app.get('/context', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/context.html'));
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ 
            success: false, 
            error: 'API endpoint not found' 
        });
    } else {
        // Serve index.html for unknown routes (SPA support)
        res.sendFile(path.join(__dirname, '../public/index.html'));
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message;
    
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// ============================================
// SERVER STARTUP
// ============================================

function startServer() {
    // Display banner
    console.log('\n========================================');
    console.log('         INSIGHT 360 v2.1.2');
    console.log('      Values-Based AI Ecosystem');
    console.log('========================================\n');
    
    // Initialize all services
    initializeServices();
    
    // Start listening
    app.listen(PORT, () => {
        console.log(`🌐 Server running at http://localhost:${PORT}`);
        console.log(`📊 Dashboard: http://localhost:${PORT}/`);
        console.log(`💬 Chat: http://localhost:${PORT}/chat.html`);
        console.log(`📦 Context: http://localhost:${PORT}/context`);
        console.log('\n========================================\n');
    });
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n👋 SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n👋 SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer();

// Export for testing
module.exports = app;