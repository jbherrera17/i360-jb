/**
 * Supabase Client - Insight 360
 * Client-side Supabase initialization
 */

// Supabase configuration (will be populated from environment)
const SUPABASE_URL = window.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';

let supabase = null;

// Initialize Supabase client
function initSupabase() {
    if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized');
        return true;
    }
    console.log('Supabase not configured - using local API');
    return false;
}

// Export for use in other modules
window.getSupabase = function() {
    return supabase;
};

// Initialize on load
document.addEventListener('DOMContentLoaded', initSupabase);