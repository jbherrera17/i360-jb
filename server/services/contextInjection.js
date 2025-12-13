/**
 * INSIGHT 360 - Context Injection Service
 * Version: 2.4.0
 * 
 * Assembles context for agents at runtime based on mappings and injection rules.
 * Handles token budgets, conditional injection, and priority ordering.
 */

// Token estimation constants
const CHARS_PER_TOKEN = 4;

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
    
    // Check regex trigger
    if (mapping.trigger_regex) {
        try {
            const regex = new RegExp(mapping.trigger_regex, 'i');
            if (regex.test(userQuery)) return true;
        } catch (e) {
            console.warn('Invalid trigger regex:', mapping.trigger_regex);
        }
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
