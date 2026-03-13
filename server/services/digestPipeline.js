/**
 * INSIGHT 360 - Digest Summarization Pipeline
 * Version: 1.0.0
 *
 * Context-aware content processing pipeline that:
 * 1. Extracts structured data from source items (entities, sentiment, topics)
 * 2. Applies context assets for organizational lens (ICP, brand, strategy)
 * 3. Optionally routes through existing agents for specialized analysis
 * 4. Generates digests with multi-document summarization
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID: uuidv4 } = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const { executeAgent } = require('./agentService');
const { assembleContext } = require('./contextInjection');
const llmRegistry = require('./llmRegistry');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Model selection by summary depth
const DEPTH_MODELS = {
    headline: 'claude-haiku-4-5-20251001',
    brief: 'claude-sonnet-4-6',
    detailed: 'claude-sonnet-4-6'
};

// ============================================================================
// SINGLE ITEM SUMMARIZATION
// ============================================================================

/**
 * Process a single source item through the pipeline
 * @param {object} item - digest_source_items row
 * @param {object} options - {depth, context_asset_ids, agent_id, processing_mode, enrichment_prompt, org_id}
 * @returns {object} - digest_summaries row data
 */
async function summarizeItem(item, options = {}) {
    const {
        depth = 'brief',
        context_asset_ids = [],
        agent_id = null,
        processing_mode = 'ai_summary',
        enrichment_prompt = null,
        org_id
    } = options;

    const startTime = Date.now();

    // Mark item as processing
    await supabase
        .from('digest_source_items')
        .update({ processing_status: 'processing' })
        .eq('id', item.id);

    try {
        let result;

        if (processing_mode === 'agent' && agent_id) {
            result = await processWithAgent(item, agent_id, context_asset_ids, enrichment_prompt);
        } else if (processing_mode === 'raw') {
            result = processRaw(item);
        } else {
            result = await processWithAI(item, depth, context_asset_ids, enrichment_prompt, org_id);
        }

        // Store summary — suppress URL for blocked items
        const isBlocked = result.bright_line_blocked === true;
        const { data: summary, error } = await supabase
            .from('digest_summaries')
            .insert({
                org_id: org_id || item.org_id,
                item_id: item.id,
                summary_type: depth,
                title: result.title,
                summary: result.summary,
                key_points: result.key_points || [],
                entities: result.entities || [],
                sentiment: result.sentiment || {},
                topics: result.topics || [],
                source_attribution: isBlocked ? [] : [{
                    source_name: item.source?.name || 'Unknown',
                    url: item.url,
                    title: item.title
                }],
                context_analysis: result.context_analysis || {},
                context_asset_ids,
                agent_id,
                processing_mode: isBlocked ? 'blocked' : processing_mode,
                model_used: result.model_used || null,
                tokens_used: result.tokens_used || 0,
                processing_time_ms: Date.now() - startTime
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to store summary: ${error.message}`);

        // Mark item as completed
        await supabase
            .from('digest_source_items')
            .update({ processing_status: 'completed' })
            .eq('id', item.id);

        return summary;

    } catch (err) {
        await supabase
            .from('digest_source_items')
            .update({ processing_status: 'failed' })
            .eq('id', item.id);
        throw err;
    }
}

/**
 * Process item using direct AI summarization with optional context enrichment
 */
async function processWithAI(item, depth, contextAssetIds, enrichmentPrompt, orgId) {
    const contentText = (item.raw_content || '').substring(0, 15000);
    const model = DEPTH_MODELS[depth] || DEPTH_MODELS.brief;

    // Build context block if assets are provided
    let contextBlock = '';
    if (contextAssetIds && contextAssetIds.length > 0 && orgId) {
        contextBlock = await buildContextBlock(contextAssetIds, orgId);
    }

    const systemPrompt = buildSystemPrompt(depth, contextBlock, enrichmentPrompt);

    const response = await anthropic.messages.create({
        model,
        max_tokens: depth === 'headline' ? 500 : depth === 'brief' ? 1500 : 3000,
        system: systemPrompt,
        messages: [{
            role: 'user',
            content: `Analyze the following content:\n\nTitle: ${item.title || 'Untitled'}\nAuthor: ${item.author || 'Unknown'}\nSource URL: ${item.url || 'N/A'}\nPublished: ${item.published_at || 'N/A'}\n\n---\n\n${contentText}`
        }]
    });

    const responseText = response.content[0]?.text || '';

    // Parse structured JSON from response
    const parsed = parseStructuredResponse(responseText, item.title, depth);

    return {
        ...parsed,
        model_used: model,
        tokens_used: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
    };
}

/**
 * Process item through an existing agent
 */
async function processWithAgent(item, agentId, contextAssetIds, enrichmentPrompt) {
    const contentText = (item.raw_content || '').substring(0, 12000);

    const prompt = enrichmentPrompt
        ? `${enrichmentPrompt}\n\n---\n\nContent to analyze:\n\nTitle: ${item.title}\n\n${contentText}`
        : `Analyze the following content and provide a structured summary with key points, entities, topics, and sentiment.\n\nTitle: ${item.title}\n\n${contentText}`;

    const result = await executeAgent(agentId, {
        userMessage: prompt,
        contextAssetIds: contextAssetIds || []
    });

    // Guardrail blocked the request — return structured blocked marker
    if (result.guardrail?.blocked) {
        return {
            title: item.title || 'Untitled',
            summary: null,
            bright_line_blocked: true,
            bright_line_name: result.guardrail.brightLine || 'Organizational policy',
            bright_line_category: result.guardrail.category || 'bright_line',
            key_points: [],
            entities: [],
            sentiment: {},
            topics: [],
            context_analysis: {
                blocked: true,
                bright_line: result.guardrail.brightLine,
                category: result.guardrail.category
            },
            model_used: 'guardrail',
            tokens_used: 0
        };
    }

    const responseText = result.response || result.content || '';

    return {
        title: item.title || 'Untitled',
        summary: responseText,
        key_points: [],
        entities: [],
        sentiment: {},
        topics: [],
        context_analysis: { processed_by_agent: agentId },
        model_used: result.model || 'agent',
        tokens_used: result.tokensUsed || 0
    };
}

/**
 * Raw mode - pass through content without AI processing
 */
function processRaw(item) {
    return {
        title: item.title || 'Untitled',
        summary: (item.raw_content || '').substring(0, 5000),
        key_points: [],
        entities: [],
        sentiment: {},
        topics: [],
        context_analysis: {},
        model_used: null,
        tokens_used: 0
    };
}

// ============================================================================
// DIGEST GENERATION
// ============================================================================

/**
 * Generate a complete digest from a config
 * @param {string} configId - digest_configs ID
 * @param {object} callbacks - {onSectionStart, onSectionComplete, onItemProcessed}
 * @returns {object} - Generated digest
 */
async function generateDigest(configId, callbacks = {}) {
    // Load config with sections
    const { data: config, error: configError } = await supabase
        .from('digest_configs')
        .select('*, sections:digest_sections(*)')
        .eq('id', configId)
        .single();

    if (configError || !config) throw new Error('Digest config not found');

    const today = new Date().toISOString().split('T')[0];

    // Upsert digest record — replace any existing digest for today
    const { data: digest, error: digestError } = await supabase
        .from('digests')
        .upsert({
            config_id: configId,
            org_id: config.org_id,
            user_id: config.user_id,
            date: today,
            status: 'generating',
            content: null,
            total_items_processed: 0,
            total_tokens_used: 0,
            generation_started_at: new Date().toISOString(),
            generation_completed_at: null
        }, { onConflict: 'config_id,date' })
        .select()
        .single();

    if (digestError) throw new Error(`Failed to create digest: ${digestError.message}`);

    const sections = (config.sections || [])
        .filter(s => s.is_enabled)
        .sort((a, b) => a.sort_order - b.sort_order);

    const digestContent = { sections: [] };
    let totalTokens = 0;
    let totalItems = 0;
    const summaryIds = [];

    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (callbacks.onSectionStart) {
            callbacks.onSectionStart({ name: section.name, index: i, total: sections.length });
        }

        try {
            const sectionResult = await processSection(section, config);
            digestContent.sections.push(sectionResult);
            totalTokens += sectionResult.tokens_used || 0;
            totalItems += sectionResult.items?.length || 0;
            summaryIds.push(...(sectionResult.summary_ids || []));

            if (callbacks.onSectionComplete) {
                callbacks.onSectionComplete({ section: sectionResult, index: i, total: sections.length });
            }
        } catch (sectionError) {
            console.error(`[DigestPipeline] Section ${section.name} failed:`, sectionError.message);
            digestContent.sections.push({
                name: section.name,
                icon: section.icon,
                status: 'failed',
                error: sectionError.message,
                items: []
            });
        }
    }

    // Update digest with results
    const status = digestContent.sections.every(s => s.status === 'completed') ? 'completed'
        : digestContent.sections.some(s => s.status === 'completed') ? 'partial'
        : 'failed';

    const { data: finalDigest } = await supabase
        .from('digests')
        .update({
            status,
            content: digestContent,
            summary_ids: summaryIds,
            total_items_processed: totalItems,
            total_tokens_used: totalTokens,
            generation_completed_at: new Date().toISOString()
        })
        .eq('id', digest.id)
        .select()
        .single();

    return finalDigest || digest;
}

/**
 * Process a single digest section
 */
async function processSection(section, config) {
    // Get unprocessed items from this section's sources
    const sourceIds = section.source_ids && section.source_ids.length > 0
        ? section.source_ids
        : config.source_ids || [];

    if (sourceIds.length === 0) {
        return {
            name: section.name,
            icon: section.icon,
            status: 'completed',
            items: [],
            tokens_used: 0,
            summary_ids: [],
            message: 'No sources configured'
        };
    }

    // Fetch recent items from sources
    const { data: items, error } = await supabase
        .from('digest_source_items')
        .select('*, source:digest_sources(id, name, source_type)')
        .in('source_id', sourceIds)
        .in('processing_status', ['pending', 'completed'])
        .order('published_at', { ascending: false })
        .limit(section.max_items || config.max_items_per_digest || 20);

    if (error || !items || items.length === 0) {
        return {
            name: section.name,
            icon: section.icon,
            status: 'completed',
            items: [],
            tokens_used: 0,
            summary_ids: [],
            message: 'No items found'
        };
    }

    // Determine processing settings
    const depth = section.summary_depth || config.summary_depth || 'brief';
    const processingMode = section.processing_mode || 'ai_summary';
    const contextAssetIds = section.context_asset_ids && section.context_asset_ids.length > 0
        ? section.context_asset_ids
        : [];
    const agentId = section.agent_id || null;
    const enrichmentPrompt = section.enrichment_prompt || null;

    // Process each item
    const processedItems = [];
    const sectionSummaryIds = [];
    let sectionTokens = 0;

    for (const item of items) {
        if (item.processing_status === 'completed') {
            // Item already has a summary — fetch it
            const { data: existingSummary } = await supabase
                .from('digest_summaries')
                .select('*')
                .eq('item_id', item.id)
                .eq('summary_type', depth)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (existingSummary) {
                processedItems.push(formatSummaryForDigest(existingSummary, item));
                sectionSummaryIds.push(existingSummary.id);
                continue;
            }
        }

        try {
            const summary = await summarizeItem(item, {
                depth,
                context_asset_ids: contextAssetIds,
                agent_id: agentId,
                processing_mode: processingMode,
                enrichment_prompt: enrichmentPrompt,
                org_id: config.org_id
            });

            processedItems.push(formatSummaryForDigest(summary, item));
            sectionSummaryIds.push(summary.id);
            sectionTokens += summary.tokens_used || 0;
        } catch (itemError) {
            console.error(`[DigestPipeline] Item ${item.id} failed:`, itemError.message);
        }
    }

    return {
        name: section.name,
        icon: section.icon,
        status: 'completed',
        items: processedItems,
        tokens_used: sectionTokens,
        summary_ids: sectionSummaryIds
    };
}

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Full-text search across digest content
 */
async function searchDigest(orgId, query, filters = {}) {
    const { data, error } = await supabase.rpc('digest_search', {
        p_org_id: orgId,
        p_query: query,
        p_source_ids: filters.source_ids || null,
        p_date_from: filters.date_from || null,
        p_date_to: filters.date_to || null,
        p_topics: filters.topics || null,
        p_content_type: filters.content_type || 'all',
        p_limit: filters.limit || 20,
        p_offset: filters.offset || 0
    });

    if (error) throw new Error(`Search failed: ${error.message}`);
    return data || [];
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build context block from context asset IDs
 */
async function buildContextBlock(contextAssetIds, orgId) {
    if (!contextAssetIds || contextAssetIds.length === 0) return '';

    const { data: assets, error } = await supabase
        .from('context_assets')
        .select('name, type, content')
        .in('id', contextAssetIds);

    if (error || !assets || assets.length === 0) return '';

    let block = '\n\n## ORGANIZATIONAL CONTEXT (Apply this lens when analyzing)\n\n';
    for (const asset of assets) {
        block += `### ${asset.name} (${asset.type})\n${asset.content}\n\n`;
    }
    return block;
}

/**
 * Build system prompt based on depth and context
 */
function buildSystemPrompt(depth, contextBlock, enrichmentPrompt) {
    let prompt = `You are an intelligent content analyst for a business intelligence digest system. `;

    if (depth === 'headline') {
        prompt += `Provide a very concise analysis. `;
    } else if (depth === 'brief') {
        prompt += `Provide a focused analysis with key takeaways. `;
    } else {
        prompt += `Provide a comprehensive, detailed analysis. `;
    }

    prompt += `\n\nRespond with valid JSON in this exact format:
{
  "title": "Concise, informative title",
  "summary": "The summary text (${depth === 'headline' ? '1-2 sentences' : depth === 'brief' ? '3-5 sentences' : 'comprehensive paragraph'})",
  "key_points": ["Key point 1", "Key point 2", "Key point 3"],
  "entities": [{"name": "Entity Name", "type": "person|org|product|topic", "salience": 0.8}],
  "sentiment": {"score": 0.0, "label": "positive|neutral|negative", "confidence": 0.9},
  "topics": ["topic1", "topic2"]`;

    if (contextBlock) {
        prompt += `,
  "context_analysis": {
    "relevance_score": 0.8,
    "opportunities": ["Opportunity based on your context"],
    "threats": ["Threat or risk based on your context"],
    "alignment_notes": "How this content relates to your organizational context",
    "action_items": ["Suggested action based on context"]
  }`;
    }

    prompt += `\n}\n\nIMPORTANT: Return ONLY valid JSON. No markdown formatting, no code fences.`;

    if (contextBlock) {
        prompt += contextBlock;
    }

    if (enrichmentPrompt) {
        prompt += `\n\n## ADDITIONAL ANALYSIS INSTRUCTIONS\n${enrichmentPrompt}`;
    }

    return prompt;
}

/**
 * Parse structured JSON response from LLM
 */
function parseStructuredResponse(responseText, fallbackTitle, depth) {
    try {
        // Try to extract JSON from the response
        let jsonStr = responseText.trim();

        // Remove markdown code fences if present
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(jsonStr);
        return {
            title: parsed.title || fallbackTitle || 'Untitled',
            summary: parsed.summary || responseText,
            key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
            entities: Array.isArray(parsed.entities) ? parsed.entities : [],
            sentiment: parsed.sentiment || {},
            topics: Array.isArray(parsed.topics) ? parsed.topics : [],
            context_analysis: parsed.context_analysis || {}
        };
    } catch {
        // If JSON parsing fails, use the raw text as summary
        return {
            title: fallbackTitle || 'Untitled',
            summary: responseText,
            key_points: [],
            entities: [],
            sentiment: {},
            topics: [],
            context_analysis: {}
        };
    }
}

/**
 * Format a summary for inclusion in a digest's content JSON
 */
function formatSummaryForDigest(summary, item) {
    // Detect old cached summaries that contain the agent refusal text (pre-bright-line-fix)
    const REFUSAL_PATTERN = /I cannot assist with that request|conflicts with a core organizational principle/i;
    const isRefusalText = typeof summary.summary === 'string' && REFUSAL_PATTERN.test(summary.summary);

    const isBlocked = summary.processing_mode === 'blocked' ||
                      summary.context_analysis?.blocked === true ||
                      isRefusalText;
    return {
        id: summary.id,
        title: summary.title,
        summary: summary.summary,
        key_points: summary.key_points || [],
        entities: summary.entities || [],
        sentiment: summary.sentiment || {},
        topics: summary.topics || [],
        context_analysis: summary.context_analysis || {},
        // Suppress link and identifying info for blocked items
        source_url: isBlocked ? null : item.url,
        source_title: item.source?.name || 'Unknown Source',
        published_at: item.published_at,
        author: item.author,
        // Blocked item metadata for UI
        bright_line_blocked: isBlocked || undefined,
        bright_line_name: isBlocked ? (summary.context_analysis?.bright_line || 'Organizational policy') : undefined,
        bright_line_category: isBlocked ? (summary.context_analysis?.category || 'bright_line') : undefined
    };
}

module.exports = {
    summarizeItem,
    generateDigest,
    searchDigest,
    buildContextBlock
};
