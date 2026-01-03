/**
 * INSIGHT 360 - Context Injection Service
 * Version: 2.4.0
 * 
 * Assembles context for agents at runtime based on mappings and injection rules.
 * Handles token budgets, conditional injection, and priority ordering.
 */

// Token estimation constants
const CHARS_PER_TOKEN = 4;

// Maximum input length for regex testing (prevents DoS on long inputs)
const MAX_REGEX_INPUT_LENGTH = 10000;

/**
 * Check if a regex pattern is potentially vulnerable to ReDoS
 * Detects common catastrophic backtracking patterns
 */
function isReDoSVulnerable(pattern) {
    // Patterns that can cause catastrophic backtracking:
    // 1. Nested quantifiers: (a+)+ or (a*)*
    // 2. Overlapping alternations: (a|a)+
    // 3. Adjacent quantifiers on same char class: \d+\d+

    const dangerousPatterns = [
        /\([^)]*[+*][^)]*\)[+*]/,           // Nested quantifiers: (a+)+, (a*)*
        /\([^)]*\|[^)]*\)[+*]/,             // Alternation with quantifier: (a|b)+
        /([+*])\s*\1/,                       // Adjacent same quantifiers
        /\[[^\]]*\][+*]\[[^\]]*\][+*]/,     // Adjacent quantified char classes
        /\.{2,}[+*]/,                        // Multiple dots with quantifier
        /\(\?[^)]*[+*][^)]*\)[+*]/,         // Non-capturing group with nested quantifier
    ];

    for (const dangerous of dangerousPatterns) {
        if (dangerous.test(pattern)) {
            return true;
        }
    }

    return false;
}

/**
 * Safely test a regex pattern against input with validation and length limits
 * Returns true if matches, false if no match or regex is unsafe
 */
function safeRegexTest(pattern, input) {
    // Validate pattern isn't potentially vulnerable
    if (isReDoSVulnerable(pattern)) {
        console.warn('Potentially unsafe regex pattern rejected:', pattern);
        return false;
    }

    // Limit input length to prevent DoS
    const safeInput = input.length > MAX_REGEX_INPUT_LENGTH
        ? input.substring(0, MAX_REGEX_INPUT_LENGTH)
        : input;

    try {
        const regex = new RegExp(pattern, 'i');
        return regex.test(safeInput);
    } catch (e) {
        console.warn('Invalid regex pattern:', pattern, e.message);
        return false;
    }
}

/**
 * Estimate token count for a string
 */
function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Check if content should be injected based on conditional rules
 */
function shouldInjectConditional(mapping, userQuery) {
    if (!userQuery) return false;
    
    const queryLower = userQuery.toLowerCase();
    
    // Check keyword triggers
    if (mapping.trigger_keywords && mapping.trigger_keywords.length > 0) {
        const hasKeyword = mapping.trigger_keywords.some(keyword => 
            queryLower.includes(keyword.toLowerCase())
        );
        if (hasKeyword) return true;
    }
    
    // Check regex trigger (with ReDoS protection)
    if (mapping.trigger_regex) {
        if (safeRegexTest(mapping.trigger_regex, userQuery)) return true;
    }
    
    return false;
}

/**
 * Format an asset for injection into context
 */
function formatAsset(asset, options = {}) {
    const { format = 'markdown', includeMetadata = true } = options;
    
    let content = '';
    
    if (asset.content_text) {
        content = asset.content_text;
    } else if (asset.content_json) {
        content = JSON.stringify(asset.content_json, null, 2);
    }
    
    if (!content) return '';
    
    if (format === 'markdown') {
        const header = includeMetadata 
            ? `## ${asset.name}\n*Type: ${asset.asset_type} | Version: ${asset.version}*\n\n`
            : `## ${asset.name}\n\n`;
        return header + content;
    } else if (format === 'xml') {
        return `<context type="${asset.asset_type}" name="${asset.name}">\n${content}\n</context>`;
    } else {
        return content;
    }
}

/**
 * Truncate content to fit within token budget
 */
function truncateContent(content, maxTokens, strategy = 'end') {
    const currentTokens = estimateTokens(content);
    
    if (currentTokens <= maxTokens) return content;
    
    const charLimit = maxTokens * CHARS_PER_TOKEN;
    
    switch (strategy) {
        case 'start':
            return '...' + content.slice(-charLimit);
        case 'middle':
            const halfLimit = Math.floor(charLimit / 2);
            return content.slice(0, halfLimit) + '\n...\n' + content.slice(-halfLimit);
        case 'end':
        default:
            return content.slice(0, charLimit) + '...';
    }
}

/**
 * Assemble context for an agent based on mappings
 * @param {string} agentId - Agent UUID
 * @param {object} options - Assembly options
 * @param {object} supabase - Supabase client
 * @returns {object} - Assembled context and metadata
 */
async function assembleContext(agentId, options = {}, supabase) {
    const {
        userQuery = '',
        maxTokens = 8000,
        format = 'markdown',
        returnDetails = false,
        includeOnDemand = []
    } = options;
    
    try {
        // Get active mappings with assets
        const { data: mappings, error: mappingsError } = await supabase
            .from('agent_context_mappings')
            .select(`
                *,
                context_assets (
                    id, name, asset_type, description,
                    content_json, content_text, version, usage_count
                )
            `)
            .eq('agent_id', agentId)
            .eq('is_active', true)
            .order('priority', { ascending: false });
        
        if (mappingsError) throw mappingsError;
        if (!mappings || mappings.length === 0) {
            return returnDetails 
                ? { context: '', assets: [], totalTokens: 0 }
                : '';
        }
        
        const includedAssets = [];
        const contextParts = [];
        let totalTokens = 0;
        
        for (const mapping of mappings) {
            const asset = mapping.context_assets;
            if (!asset) continue;
            
            // Check injection mode
            let shouldInclude = false;
            
            switch (mapping.injection_mode) {
                case 'always':
                    shouldInclude = true;
                    break;
                case 'on_demand':
                    shouldInclude = includeOnDemand.includes(asset.id);
                    break;
                case 'conditional':
                    shouldInclude = shouldInjectConditional(mapping, userQuery);
                    break;
            }
            
            if (!shouldInclude) continue;
            
            let content = formatAsset(asset, { format });
            
            if (mapping.max_tokens) {
                content = truncateContent(content, mapping.max_tokens);
            }
            
            const assetTokens = estimateTokens(content);
            
            if (totalTokens + assetTokens > maxTokens) {
                const remainingBudget = maxTokens - totalTokens;
                if (remainingBudget > 100) {
                    content = truncateContent(content, remainingBudget);
                    const truncatedTokens = estimateTokens(content);
                    contextParts.push(content);
                    totalTokens += truncatedTokens;
                    includedAssets.push({
                        id: asset.id,
                        name: asset.name,
                        type: asset.asset_type,
                        tokens: truncatedTokens,
                        truncated: true
                    });
                }
                break;
            }
            
            contextParts.push(content);
            totalTokens += assetTokens;
            includedAssets.push({
                id: asset.id,
                name: asset.name,
                type: asset.asset_type,
                tokens: assetTokens,
                truncated: false
            });
        }
        
        const assembledContext = contextParts.join('\n\n---\n\n');
        
        if (returnDetails) {
            return {
                context: assembledContext,
                assets: includedAssets,
                totalTokens,
                tokenBudget: maxTokens,
                format
            };
        }
        
        return assembledContext;
        
    } catch (error) {
        console.error('Error assembling context:', error);
        throw error;
    }
}

/**
 * Get available context assets for an agent
 */
async function getAvailableContext(agentId, supabase) {
    try {
        const { data: mappings, error } = await supabase
            .from('agent_context_mappings')
            .select(`
                id,
                injection_mode,
                priority,
                context_assets (
                    id, name, asset_type, description,
                    content_text, version
                )
            `)
            .eq('agent_id', agentId)
            .eq('is_active', true)
            .order('priority', { ascending: false });
        
        if (error) throw error;
        
        return mappings.map(m => ({
            mapping_id: m.id,
            injection_mode: m.injection_mode,
            priority: m.priority,
            asset: m.context_assets ? {
                ...m.context_assets,
                estimated_tokens: estimateTokens(m.context_assets.content_text || '')
            } : null
        })).filter(m => m.asset);
        
    } catch (error) {
        console.error('Error getting available context:', error);
        throw error;
    }
}

module.exports = {
    assembleContext,
    getAvailableContext,
    estimateTokens,
    formatAsset,
    truncateContent
};
