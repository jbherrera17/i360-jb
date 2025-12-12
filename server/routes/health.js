/**
 * Health Check Routes - Insight 360
 * Returns system status for dashboard
 * Version: 2.3.0
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/health
 * Returns system health status
 */
router.get('/', async (req, res) => {
    const services = {
        anthropic: false,
        openai: false,
        voice: false,
        search: false,
        supabase: false
    };
    
    // Check Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
        services.anthropic = true;
    }
    
    // Check OpenAI
    if (process.env.OPENAI_API_KEY) {
        services.openai = true;
        services.voice = true; // Voice uses OpenAI
    }
    
    // Check Search (Brave, Tavily, or Serper)
    if (process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_API_KEY || process.env.TAVILY_API_KEY || process.env.SERPER_API_KEY) {
        services.search = true;
    }
    
    // Check Supabase
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        services.supabase = true;
        
        // Optional: Actually test the connection
        if (req.supabase) {
            try {
                const { error } = await req.supabase.from('conversations').select('id').limit(1);
                services.supabase = !error;
            } catch (e) {
                // If query fails, still mark as configured
                services.supabase = true;
            }
        }
    }
    
    // Calculate overall status
    const activeCount = Object.values(services).filter(Boolean).length;
    const totalCount = Object.keys(services).length;
    
    res.json({
        success: true,
        status: activeCount === totalCount ? 'operational' : activeCount > 0 ? 'partial' : 'error',
        services: services,
        timestamp: new Date().toISOString(),
        version: '2.3.0'
    });
});

/**
 * GET /api/health/ping
 * Simple ping endpoint
 */
router.get('/ping', (req, res) => {
    res.json({ success: true, message: 'pong', timestamp: new Date().toISOString() });
});

module.exports = router;