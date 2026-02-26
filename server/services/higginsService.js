/**
 * INSIGHT 360 - Higgins Service
 * Version: 1.1.0
 *
 * Manages the Higgins AI assistant persona and knowledge injection.
 * Higgins is the always-aware i360 expert with JB's brand voice.
 * Phase 61b: Added dynamic help documentation access.
 */

const fs = require('fs');
const path = require('path');

// Asset IDs for Higgins knowledge (must match seed-higgins-knowledge.sql)
const HIGGINS_ASSET_IDS = {
    // User-level (injected for all users)
    USER_GUIDE: 'ca100001-0000-4000-a000-000000000001',
    FEATURE_HOWTO: 'ca100001-0000-4000-a000-000000000002',
    // Admin-level (injected only for admin users)
    SYSTEM_ARCHITECTURE: 'ca100001-0000-4000-a000-000000000003',
    MODULES_REFERENCE: 'ca100001-0000-4000-a000-000000000004'
};

// JB Brand Voice DNA asset ID (from import-content-creation-system.sql)
const VOICE_DNA_ASSET_ID = 'ca000001-0000-4000-8000-000000000001';

/**
 * The Higgins base persona prompt (derived from JB Brand Voice DNA v2)
 * This is used when Voice DNA asset is not available in database
 */
const HIGGINS_BASE_PERSONA = `You are Higgins, an intelligent AI assistant for Insight 360.

PERSONALITY (based on JB Brand Voice DNA):
- Lead with warmth, empathy, and calm authority
- Be story-driven - open with context, share insight, close with actionable takeaway
- Use plain, accessible language even for complex ideas
- Blend exploratory framing with values-anchored conclusions
- Position yourself as a guide and collaborative partner, not a distant expert

COMMUNICATION STYLE:
- Alternate between reflective sentences for explanation and short punchy statements for emphasis
- Use phrases like "Here's what I've learned...", "Consider this...", "The truth is..."
- Ground abstract ideas in practical examples
- Be encouraging and pragmatic

SIGNATURE CONCEPTS:
- Values-alignment
- Human brilliance amplified by AI
- Pause-Think-Respond
- Make Today Your Masterpiece

NEVER:
- Sound like a hype-driven tech evangelist
- Be cynical, sarcastic, or use corporate-speak
- Give aggressive hard-sell responses
- Be overly casual or use excessive slang

I360 EXPERTISE:
You have deep knowledge about Insight 360. When users ask about the system,
features, modules, or how to accomplish tasks, draw on your knowledge
to provide helpful, clear guidance. You know:
- The three pillars: Align 120, Strategy 120, Execute 120
- Agents, Context Assets, Parthenon Actions, Skills
- How to use chat, voice, file upload, model switching
- Best practices for getting value from the platform`;

/**
 * Build the complete Higgins system prompt
 * @param {object} options - Configuration options
 * @param {boolean} options.isAdmin - Whether user is an admin
 * @param {string} options.modelName - Name of the selected model
 * @param {object} options.voiceDNA - Voice DNA content (if loaded from DB)
 * @param {object} options.i360Knowledge - i360 knowledge content (if loaded from DB)
 * @param {string} options.userSystemPrompt - Optional user-provided system prompt to merge
 * @param {string} options.soulContext - Soul context block (values, bright lines, guardrails)
 * @returns {string} - Complete system prompt
 */
function buildHigginsPrompt(options = {}) {
    const {
        isAdmin = false,
        modelName = 'AI',
        voiceDNA = null,
        i360Knowledge = null,
        userSystemPrompt = null,
        soulContext = null
    } = options;

    let prompt = '';

    // Start with persona
    if (voiceDNA?.content_text) {
        // Use loaded Voice DNA
        prompt = `You are Higgins, an intelligent AI assistant for Insight 360, powered by ${modelName}.

YOUR VOICE (from JB Brand Voice DNA):
${voiceDNA.content_text}

`;
    } else {
        // Use fallback persona
        prompt = HIGGINS_BASE_PERSONA.replace(
            'You are Higgins, an intelligent AI assistant for Insight 360.',
            `You are Higgins, an intelligent AI assistant for Insight 360, powered by ${modelName}.`
        ) + '\n\n';
    }

    // Add soul context (values, bright lines, guardrails, safety instructions)
    if (soulContext) {
        prompt += '---\n' + soulContext + '\n\n';
    }

    // Add i360 knowledge if available
    if (i360Knowledge && i360Knowledge.length > 0) {
        prompt += '---\nI360 SYSTEM KNOWLEDGE:\n\n';
        for (const asset of i360Knowledge) {
            if (asset.content_text) {
                prompt += `## ${asset.name}\n${asset.content_text}\n\n`;
            }
        }
    }

    // Add admin indicator
    if (isAdmin) {
        prompt += '\n---\nNOTE: This user has administrator privileges. You can provide more detailed technical information about system architecture, database concepts, and admin features when asked.\n';
    }

    // Phase 61b: Add help documentation index so Higgins knows what docs exist
    const docsIndex = getDocsIndex();
    if (docsIndex.length > 0) {
        prompt += '\n---\nAVAILABLE HELP DOCUMENTATION:\nWhen users ask about features, reference these guides. The most relevant doc will be automatically injected when detected.\n';
        for (const doc of docsIndex) {
            prompt += `- ${doc.title} (${doc.filename})\n`;
        }
        prompt += '\n';
    }

    // Merge user's custom system prompt if provided
    if (userSystemPrompt) {
        prompt += `\n---\nADDITIONAL INSTRUCTIONS:\n${userSystemPrompt}\n`;
    }

    return prompt;
}

/**
 * Fetch Higgins knowledge assets from database
 * @param {object} supabase - Supabase client
 * @param {boolean} isAdmin - Whether to include admin-level knowledge
 * @returns {object} - { voiceDNA, i360Knowledge }
 */
async function fetchHigginsKnowledge(supabase, isAdmin = false) {
    const result = {
        voiceDNA: null,
        i360Knowledge: []
    };

    try {
        // Fetch Voice DNA
        const { data: voiceDNA } = await supabase
            .from('context_assets')
            .select('name, content_text, content_json')
            .eq('id', VOICE_DNA_ASSET_ID)
            .single();

        if (voiceDNA) {
            result.voiceDNA = voiceDNA;
        }

        // Determine which knowledge assets to fetch
        const knowledgeAssetIds = [
            HIGGINS_ASSET_IDS.USER_GUIDE,
            HIGGINS_ASSET_IDS.FEATURE_HOWTO
        ];

        if (isAdmin) {
            knowledgeAssetIds.push(
                HIGGINS_ASSET_IDS.SYSTEM_ARCHITECTURE,
                HIGGINS_ASSET_IDS.MODULES_REFERENCE
            );
        }

        // Fetch i360 knowledge assets
        const { data: knowledge } = await supabase
            .from('context_assets')
            .select('name, content_text, content_json')
            .in('id', knowledgeAssetIds)
            .eq('is_current', true);

        if (knowledge) {
            result.i360Knowledge = knowledge;
        }

    } catch (error) {
        console.warn('Failed to fetch Higgins knowledge assets:', error.message);
        // Continue with fallback - don't throw
    }

    return result;
}

/**
 * Get the complete Higgins system prompt with knowledge injection
 * This is the main function to call from chat routes
 * @param {object} supabase - Supabase client
 * @param {object} options - Configuration options
 * @returns {string} - Complete system prompt for Higgins
 */
async function getHigginsSystemPrompt(supabase, options = {}) {
    const {
        isAdmin = false,
        modelName = 'AI',
        userSystemPrompt = null,
        soulContext = null,
        skipDatabaseFetch = false
    } = options;

    let voiceDNA = null;
    let i360Knowledge = [];

    // Fetch from database unless explicitly skipped
    if (!skipDatabaseFetch && supabase) {
        const knowledge = await fetchHigginsKnowledge(supabase, isAdmin);
        voiceDNA = knowledge.voiceDNA;
        i360Knowledge = knowledge.i360Knowledge;
    }

    return buildHigginsPrompt({
        isAdmin,
        modelName,
        voiceDNA,
        i360Knowledge,
        userSystemPrompt,
        soulContext
    });
}

/**
 * Get model display name from model ID
 * @param {string} modelId - Model identifier
 * @returns {string} - Human-readable model name
 */
function getModelDisplayName(modelId) {
    const modelNames = {
        // Claude models
        'claude-opus-4-5-20250929': 'Claude Opus 4.5',
        'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5',
        'claude-haiku-4-5-20250929': 'Claude Haiku 4.5',
        'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
        'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
        'claude-3-opus-20240229': 'Claude 3 Opus',
        // GPT models
        'gpt-5-2': 'GPT-5.2',
        'gpt-4o': 'GPT-4o',
        'gpt-4o-mini': 'GPT-4o Mini',
        'o1': 'OpenAI o1',
        'o1-mini': 'OpenAI o1-mini',
        // Perplexity models
        'sonar-pro': 'Perplexity Sonar Pro',
        'sonar': 'Perplexity Sonar',
        'sonar-reasoning-pro': 'Perplexity Sonar Reasoning Pro',
        'sonar-deep-research': 'Perplexity Deep Research'
    };

    return modelNames[modelId] || modelId;
}

// ============================================
// Help Documentation Access (Phase 61b)
// ============================================

const DOCS_DIR = path.join(__dirname, '../../documentation/guides');
let _docsIndexCache = null;
let _docsIndexCacheTime = 0;
const DOCS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get index of all help documentation files
 * Cached with 5-minute TTL
 * @returns {Array<{filename, title, summary}>}
 */
function getDocsIndex() {
    const now = Date.now();
    if (_docsIndexCache && (now - _docsIndexCacheTime) < DOCS_CACHE_TTL) {
        return _docsIndexCache;
    }

    try {
        const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'));
        const index = files.map(filename => {
            try {
                const content = fs.readFileSync(path.join(DOCS_DIR, filename), 'utf8');
                const lines = content.split('\n');

                // Extract title from first # heading
                const titleLine = lines.find(l => l.startsWith('# '));
                const title = titleLine ? titleLine.slice(2).trim() : filename.replace('.md', '');

                // Extract first paragraph as summary
                let summary = '';
                for (const line of lines) {
                    if (line.startsWith('# ')) continue;
                    if (line.startsWith('---')) continue;
                    if (line.trim() && !line.startsWith('#') && !line.startsWith('|') && !line.startsWith('**')) {
                        summary = line.trim();
                        break;
                    }
                }

                return { filename, title, summary: summary.substring(0, 150) };
            } catch (e) {
                return { filename, title: filename.replace('.md', ''), summary: '' };
            }
        });

        _docsIndexCache = index;
        _docsIndexCacheTime = now;
        return index;
    } catch (e) {
        console.warn('Failed to read docs directory:', e.message);
        return [];
    }
}

/**
 * Fetch a specific help doc by filename
 * Security: rejects paths with / or .., requires .md extension
 * Truncates to 8000 chars to prevent token overflow
 * @param {string} filename
 * @returns {string|null}
 */
function fetchHelpDoc(filename) {
    if (!filename || filename.includes('/') || filename.includes('..') || !filename.endsWith('.md')) {
        return null;
    }

    try {
        const filePath = path.join(DOCS_DIR, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        return content.substring(0, 8000);
    } catch (e) {
        return null;
    }
}

/**
 * Find relevant help docs based on user message keywords
 * Returns the most relevant doc content for injection
 * @param {string} userMessage - The user's message
 * @returns {string|null} - Doc content to inject, or null
 */
function findRelevantHelpDoc(userMessage) {
    if (!userMessage) return null;

    const msg = userMessage.toLowerCase();

    // Check for help-seeking keywords
    const helpKeywords = ['how do i', 'how to', 'what is', 'what are', 'help with',
        'where is', 'where can i find', 'show me how', 'explain', 'guide',
        'how does', 'can i', 'how can i', 'tell me about', 'what does'];
    const isHelpQuery = helpKeywords.some(k => msg.includes(k));
    if (!isHelpQuery) return null;

    const index = getDocsIndex();
    if (!index.length) return null;

    // Score each doc by keyword overlap
    const msgWords = msg.split(/\s+/).filter(w => w.length > 2);
    const scored = index.map(doc => {
        const docText = `${doc.title} ${doc.filename} ${doc.summary}`.toLowerCase();
        let score = 0;
        for (const word of msgWords) {
            if (docText.includes(word)) score++;
        }
        // Boost for exact title/filename match patterns
        const titleLower = doc.title.toLowerCase();
        if (msg.includes(titleLower.replace(' user guide', '').replace(' technical guide', ''))) {
            score += 5;
        }
        return { ...doc, score };
    });

    // Get top match (must have some relevance)
    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];
    if (!top || top.score < 2) return null;

    const content = fetchHelpDoc(top.filename);
    if (!content) return null;

    return `\n---\nRELEVANT HELP DOCUMENTATION (${top.title}):\n\n${content}\n`;
}

module.exports = {
    HIGGINS_ASSET_IDS,
    VOICE_DNA_ASSET_ID,
    HIGGINS_BASE_PERSONA,
    buildHigginsPrompt,
    fetchHigginsKnowledge,
    getHigginsSystemPrompt,
    getModelDisplayName,
    getDocsIndex,
    fetchHelpDoc,
    findRelevantHelpDoc
};
