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
 * - Agent Framework (Phase 3)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const agentsRoutes = require('./routes/agents');
const injectionRoutes = require('./routes/injection');
const conversationsRoutes = require('./routes/conversations');
const parthenonRoutes = require('./routes/parthenon');
const s2eRoutes = require('./routes/s2e');
const actionsRoutes = require('./routes/actions');
const skillsRoutes = require('./routes/skills');
const briefingRoutes = require('./routes/briefing');
const promptsRoutes = require('./routes/prompts');
const align120Routes = require('./routes/align120');
const strategy120Routes = require('./routes/strategy120');
const authRoutes = require('./routes/auth');
const schedulerService = require('./services/schedulerService');

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
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            mediaSrc: ["'self'", "blob:"],
            connectSrc: [
                "'self'",
                "https://api.anthropic.com",
                "https://api.openai.com",
                "https://*.supabase.co",
                "https://unpkg.com",
                "https://api.mindstudio.ai"
            ],
            frameSrc: [
                "'self'",
                "https://app.mindstudio.ai",
                "https://*.mindstudio.ai"
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
        
        // Register Supabase-dependent routes HERE (after Supabase is initialized)
        app.use('/api/agents', agentsRoutes(supabase));
        app.use('/api/injection', injectionRoutes(supabase));
        app.use('/api/conversations', conversationsRoutes);
        app.use('/api/parthenon', parthenonRoutes(supabase));
        app.use('/api/s2e', s2eRoutes(supabase));
        app.use('/api/actions', actionsRoutes(supabase));
        app.use('/api/skills', skillsRoutes(supabase));
        app.use('/api/briefing', briefingRoutes(supabase));
        app.use('/api/prompts', promptsRoutes(supabase));
        app.use('/api/align120', align120Routes(supabase));
        app.use('/api/strategy120', strategy120Routes(supabase));
        app.use('/api/auth', authRoutes(supabase));
        console.log('  ✅ Agent routes registered');
        console.log('  ✅ Auth routes registered');
        console.log('  ✅ Conversations routes registered');
        console.log('  ✅ Parthenon routes registered');
        console.log('  ✅ S2E (Strategy-to-Execution) routes registered');
        console.log('  ✅ Actions routes registered');
        console.log('  ✅ Skills routes registered');
        console.log('  ✅ Briefing routes registered');
        console.log('  ✅ Prompts (Transformer) routes registered');
        console.log('  ✅ Align 120 routes registered');
        console.log('  ✅ Strategy 120 routes registered');

        // Initialize briefing scheduler
        schedulerService.initializeScheduler()
            .then(() => console.log('  ✅ Briefing scheduler initialized'))
            .catch(err => console.error('  ⚠️ Briefing scheduler failed:', err.message));
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

// Documentation routes (for help system)
const docsRoutes = require('./routes/docs');
app.use('/api/docs', docsRoutes);

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

// Parthenon (organizational structure) page (Phase 3.5)
app.get('/parthenon', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/parthenon.html'));
});

// Actions page (Phase 4)
app.get('/actions', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/actions.html'));
});

// Skills page (Phase 5)
app.get('/skills', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/skills.html'));
});

// Briefing page (Phase 6)
app.get('/briefing', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/briefing.html'));
});

// Align 120 page (Phase 7)
app.get('/align120', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/align120.html'));
});

// Strategy 120 page (Phase 8)
app.get('/strategy120', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/strategy120.html'));
});

// Login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

// ============================================
// ERROR HANDLERS (registered after services init)
// ============================================

function registerErrorHandlers() {
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
}

// ============================================
// SERVER STARTUP
// ============================================

function startServer() {
    // Display banner
    console.log('\n========================================');
    console.log('         INSIGHT 360 v2.11');
    console.log('      Values-Based AI Ecosystem');
    console.log('   Parthenon + Actions Framework');
    console.log('========================================\n');
    
    // Initialize all services (including Supabase-dependent routes)
    initializeServices();
    
    // Register error handlers AFTER all routes are set up
    registerErrorHandlers();
    
    // Start listening
    app.listen(PORT, () => {
        console.log(`🌐 Server running at http://localhost:${PORT}`);
        console.log(`📊 Dashboard: http://localhost:${PORT}/`);
        console.log(`💬 Chat: http://localhost:${PORT}/chat.html`);
        console.log(`📦 Context: http://localhost:${PORT}/context`);
        console.log(`🏛️  Parthenon: http://localhost:${PORT}/parthenon`);
        console.log(`⚡ Actions: http://localhost:${PORT}/actions`);
        console.log(`🧭 Align 120: http://localhost:${PORT}/align120`);
        console.log(`📊 Strategy 120: http://localhost:${PORT}/strategy120`);
        console.log(`🤖 Agents API: http://localhost:${PORT}/api/agents`);
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
