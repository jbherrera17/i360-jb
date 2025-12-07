/**
 * Health Check Route
 * Insight 360 - System Status API
 * 
 * Returns availability status of all services
 */

const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
    const status = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            anthropic: false,
            openai: false,
            search: false,
            supabase: false,
            voice: false
        }
    };

    // Check Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
        status.services.anthropic = true;
    }

    // Check OpenAI
    if (process.env.OPENAI_API_KEY) {
        status.services.openai = true;
    }

    // Check Web Search (any of the three)
    if (process.env.BRAVE_SEARCH_API_KEY || 
        process.env.TAVILY_API_KEY || 
        process.env.SERPER_API_KEY) {
        status.services.search = true;
    }

    // Check Supabase
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        status.services.supabase = true;
    }

    // Voice uses OpenAI, so it's available if OpenAI is
    if (process.env.OPENAI_API_KEY) {
        status.services.voice = true;
    }

    // Determine overall status
    const activeServices = Object.values(status.services).filter(Boolean).length;
    const totalServices = Object.keys(status.services).length;
    
    if (activeServices === totalServices) {
        status.status = 'all_operational';
    } else if (activeServices > 0) {
        status.status = 'partial';
    } else {
        status.status = 'no_services';
    }

    res.json(status);
});

module.exports = router;
