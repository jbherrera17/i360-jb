/**
 * INSIGHT 360 - Digest Source Service
 * Version: 1.0.0
 *
 * Manages content sources (RSS, websites, documents, newsletters)
 * for the AI Digest system. Handles CRUD, fetching, and health tracking.
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID: uuidv4 } = require('crypto');
const crypto = require('crypto');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Lazy-loaded fetchers
let rssFetcher = null;
let websiteFetcher = null;
let documentFetcher = null;
let newsletterFetcher = null;

function getRssFetcher() {
    if (!rssFetcher) rssFetcher = require('./digestFetchers/rssFetcher');
    return rssFetcher;
}
function getWebsiteFetcher() {
    if (!websiteFetcher) websiteFetcher = require('./digestFetchers/websiteFetcher');
    return websiteFetcher;
}
function getDocumentFetcher() {
    if (!documentFetcher) documentFetcher = require('./digestFetchers/documentFetcher');
    return documentFetcher;
}
function getNewsletterFetcher() {
    if (!newsletterFetcher) newsletterFetcher = require('./digestFetchers/newsletterFetcher');
    return newsletterFetcher;
}

// ============================================================================
// SOURCE CRUD
// ============================================================================

/**
 * Create a new content source
 */
async function createSource(orgId, userId, sourceData) {
    const { name, source_type, config, fetch_schedule, tags, default_context_asset_ids, default_agent_id } = sourceData;

    if (!name || !source_type) {
        throw new Error('Name and source_type are required');
    }

    const validTypes = ['rss', 'website', 'document', 'newsletter', 'manual'];
    if (!validTypes.includes(source_type)) {
        throw new Error(`Invalid source_type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate type-specific config
    validateSourceConfig(source_type, config || {});

    const { data, error } = await supabase
        .from('digest_sources')
        .insert({
            org_id: orgId,
            user_id: userId,
            name,
            source_type,
            config: config || {},
            fetch_schedule: fetch_schedule || getDefaultSchedule(source_type),
            tags: tags || [],
            default_context_asset_ids: default_context_asset_ids || [],
            default_agent_id: default_agent_id || null
        })
        .select()
        .single();

    if (error) throw new Error(`Failed to create source: ${error.message}`);
    return data;
}

/**
 * List sources for an organization
 */
async function listSources(orgId, filters = {}) {
    let query = supabase
        .from('digest_sources')
        .select('*, agent:agents(id, name, icon)')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

    if (filters.source_type) {
        query = query.eq('source_type', filters.source_type);
    }
    if (filters.is_enabled !== undefined) {
        query = query.eq('is_enabled', filters.is_enabled);
    }
    if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list sources: ${error.message}`);
    return data || [];
}

/**
 * Get a single source by ID
 */
async function getSource(orgId, sourceId) {
    const { data, error } = await supabase
        .from('digest_sources')
        .select('*, agent:agents(id, name, icon)')
        .eq('id', sourceId)
        .eq('org_id', orgId)
        .single();

    if (error) throw new Error(`Source not found: ${error.message}`);
    return data;
}

/**
 * Update a source
 */
async function updateSource(orgId, sourceId, updates) {
    const allowed = ['name', 'config', 'fetch_schedule', 'is_enabled', 'tags', 'default_context_asset_ids', 'default_agent_id'];
    const filtered = {};
    for (const key of allowed) {
        if (updates[key] !== undefined) filtered[key] = updates[key];
    }

    if (filtered.config) {
        // Get existing source to validate config against type
        const existing = await getSource(orgId, sourceId);
        validateSourceConfig(existing.source_type, filtered.config);
    }

    const { data, error } = await supabase
        .from('digest_sources')
        .update(filtered)
        .eq('id', sourceId)
        .eq('org_id', orgId)
        .select()
        .single();

    if (error) throw new Error(`Failed to update source: ${error.message}`);
    return data;
}

/**
 * Delete a source and all its items
 */
async function deleteSource(orgId, sourceId) {
    const { error } = await supabase
        .from('digest_sources')
        .delete()
        .eq('id', sourceId)
        .eq('org_id', orgId);

    if (error) throw new Error(`Failed to delete source: ${error.message}`);
    return { success: true };
}

// ============================================================================
// FETCHING
// ============================================================================

/**
 * Fetch new items from a source
 */
async function fetchSource(sourceId) {
    const { data: source, error } = await supabase
        .from('digest_sources')
        .select('*')
        .eq('id', sourceId)
        .single();

    if (error || !source) throw new Error('Source not found');

    console.log(`[DigestSource] Fetching source: ${source.name} (${source.source_type})`);
    const startTime = Date.now();

    try {
        let items = [];

        switch (source.source_type) {
            case 'rss':
                items = await getRssFetcher().fetch(source);
                break;
            case 'website':
                items = await getWebsiteFetcher().fetch(source);
                break;
            case 'document':
                // Documents are uploaded, not fetched — skip
                items = [];
                break;
            case 'newsletter':
                // Newsletters are pasted manually — skip auto-fetch
                items = [];
                break;
            case 'manual':
                items = [];
                break;
            default:
                throw new Error(`Unknown source type: ${source.source_type}`);
        }

        // Deduplicate and store items
        const stored = await storeItems(source, items);

        // Update source status
        await supabase
            .from('digest_sources')
            .update({
                last_fetch_at: new Date().toISOString(),
                last_fetch_status: 'success',
                last_fetch_error: null
            })
            .eq('id', sourceId);

        const duration = Date.now() - startTime;
        console.log(`[DigestSource] Fetched ${stored.new} new items from ${source.name} in ${duration}ms (${stored.duplicates} duplicates skipped)`);

        return { source_id: sourceId, new_items: stored.new, duplicates: stored.duplicates, duration_ms: duration };

    } catch (fetchError) {
        console.error(`[DigestSource] Fetch failed for ${source.name}:`, fetchError.message);

        await supabase
            .from('digest_sources')
            .update({
                last_fetch_at: new Date().toISOString(),
                last_fetch_status: 'failed',
                last_fetch_error: fetchError.message
            })
            .eq('id', sourceId);

        throw fetchError;
    }
}

/**
 * Store fetched items with deduplication
 */
async function storeItems(source, items) {
    let newCount = 0;
    let duplicates = 0;

    for (const item of items) {
        const contentHash = crypto.createHash('sha256')
            .update(item.raw_content || item.title || '')
            .digest('hex');

        const externalId = item.external_id || item.url || contentHash;

        // Check for duplicates
        const { data: existing } = await supabase
            .from('digest_source_items')
            .select('id')
            .eq('source_id', source.id)
            .eq('external_id', externalId)
            .maybeSingle();

        if (existing) {
            duplicates++;
            continue;
        }

        const wordCount = (item.raw_content || '').split(/\s+/).filter(Boolean).length;

        const { error: insertError } = await supabase
            .from('digest_source_items')
            .insert({
                source_id: source.id,
                org_id: source.org_id,
                external_id: externalId,
                title: item.title,
                url: item.url,
                author: item.author,
                published_at: item.published_at || new Date().toISOString(),
                raw_content: item.raw_content,
                content_hash: contentHash,
                metadata: {
                    word_count: wordCount,
                    categories: item.categories || [],
                    ...(item.metadata || {})
                },
                processing_status: 'pending',
                file_path: item.file_path || null,
                file_size: item.file_size || null,
                mime_type: item.mime_type || null
            });

        if (insertError) {
            console.error(`[DigestSource] Failed to insert item: ${insertError.message}`);
        } else {
            newCount++;
        }
    }

    return { new: newCount, duplicates };
}

// ============================================================================
// ITEMS
// ============================================================================

/**
 * List items from a source or all sources in an org
 */
async function listItems(orgId, options = {}) {
    const { source_id, status, limit = 50, offset = 0 } = options;

    let query = supabase
        .from('digest_source_items')
        .select('*, source:digest_sources(id, name, source_type, icon:config->>icon)')
        .eq('org_id', orgId)
        .order('published_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (source_id) query = query.eq('source_id', source_id);
    if (status) query = query.eq('processing_status', status);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to list items: ${error.message}`);
    return data || [];
}

/**
 * Get a single item by ID
 */
async function getItem(orgId, itemId) {
    const { data, error } = await supabase
        .from('digest_source_items')
        .select('*, source:digest_sources(id, name, source_type)')
        .eq('id', itemId)
        .eq('org_id', orgId)
        .single();

    if (error) throw new Error(`Item not found: ${error.message}`);
    return data;
}

/**
 * Add a manual item (paste content directly)
 */
async function addManualItem(orgId, sourceId, itemData) {
    const { title, content, url, author } = itemData;

    if (!title || !content) {
        throw new Error('Title and content are required');
    }

    const contentHash = crypto.createHash('sha256').update(content).digest('hex');
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    const { data, error } = await supabase
        .from('digest_source_items')
        .insert({
            source_id: sourceId,
            org_id: orgId,
            external_id: contentHash,
            title,
            url: url || null,
            author: author || null,
            published_at: new Date().toISOString(),
            raw_content: content,
            content_hash: contentHash,
            metadata: { word_count: wordCount },
            processing_status: 'pending'
        })
        .select()
        .single();

    if (error) throw new Error(`Failed to add item: ${error.message}`);
    return data;
}

// ============================================================================
// HEALTH
// ============================================================================

/**
 * Get health overview for all sources in an org
 */
async function getSourceHealth(orgId) {
    const { data: sources, error } = await supabase
        .from('digest_sources')
        .select('id, name, source_type, is_enabled, health_score, fetch_count, error_count, last_fetch_at, last_fetch_status, last_fetch_error')
        .eq('org_id', orgId)
        .order('name');

    if (error) throw new Error(`Failed to get health: ${error.message}`);

    const total = sources.length;
    const enabled = sources.filter(s => s.is_enabled).length;
    const healthy = sources.filter(s => s.health_score >= 0.7).length;
    const degraded = sources.filter(s => s.health_score >= 0.3 && s.health_score < 0.7).length;
    const failing = sources.filter(s => s.health_score < 0.3).length;

    return {
        summary: { total, enabled, healthy, degraded, failing },
        sources
    };
}

// ============================================================================
// HELPERS
// ============================================================================

function validateSourceConfig(sourceType, config) {
    switch (sourceType) {
        case 'rss':
            if (!config.url) throw new Error('RSS sources require a url in config');
            try { new URL(config.url); } catch { throw new Error('Invalid URL in config'); }
            break;
        case 'website':
            if (!config.url) throw new Error('Website sources require a url in config');
            try { new URL(config.url); } catch { throw new Error('Invalid URL in config'); }
            break;
        case 'document':
        case 'newsletter':
        case 'manual':
            // No required config fields
            break;
    }
}

function getDefaultSchedule(sourceType) {
    switch (sourceType) {
        case 'rss': return '0 */4 * * *';       // Every 4 hours
        case 'website': return '0 */12 * * *';   // Every 12 hours
        default: return null;                     // No schedule for uploads/manual
    }
}

module.exports = {
    createSource,
    listSources,
    getSource,
    updateSource,
    deleteSource,
    fetchSource,
    listItems,
    getItem,
    addManualItem,
    getSourceHealth
};
