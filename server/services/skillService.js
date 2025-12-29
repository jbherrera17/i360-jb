/**
 * INSIGHT 360 - Skill Service
 * Version: 1.0.0
 *
 * Provides skill-related utilities for agent execution:
 *   - Skill retrieval and caching
 *   - System prompt building from skills
 *   - Context requirement validation
 *   - Skill-based execution recording
 */

const { randomUUID: uuidv4 } = require('crypto');

/**
 * Get skill by ID with optional caching
 * @param {string} skillId - Skill UUID
 * @param {object} supabase - Supabase client
 * @returns {Promise<object|null>} Skill data or null
 */
async function getSkill(skillId, supabase) {
    if (!skillId) return null;

    const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('id', skillId)
        .eq('status', 'active')
        .single();

    if (error) {
        console.error('Error fetching skill:', error);
        return null;
    }

    return data;
}

/**
 * Get skill for an agent (with version handling)
 * @param {object} agent - Agent object with skill_id and skill_version
 * @param {object} supabase - Supabase client
 * @returns {Promise<object|null>} Skill data or null
 */
async function getSkillForAgent(agent, supabase) {
    if (!agent?.skill_id) return null;

    const skill = await getSkill(agent.skill_id, supabase);
    if (!skill) return null;

    // If agent has a pinned version and auto_update is false,
    // we could fetch that specific version's content
    // For now, we use the current skill content
    return {
        ...skill,
        agent_skill_version: agent.skill_version,
        is_current_version: agent.skill_version === skill.version || agent.auto_update_skill
    };
}

/**
 * Build system prompt from skill
 * Combines skill instructions with output format
 * @param {object} skill - Skill object
 * @returns {string} Formatted system prompt
 */
function buildSkillPrompt(skill) {
    if (!skill?.instructions) {
        return '';
    }

    let prompt = skill.instructions;

    // Add output format if specified
    if (skill.output_format) {
        prompt += `\n\n# Expected Output Format\n\n${skill.output_format}`;
    }

    // Add examples if available (few-shot learning)
    if (skill.examples && skill.examples.length > 0) {
        prompt += '\n\n# Examples\n\n';
        skill.examples.forEach((example, index) => {
            prompt += `## Example ${index + 1}\n\n`;
            prompt += `**Input:** ${example.input}\n\n`;
            prompt += `**Output:**\n${example.output}\n\n`;
        });
    }

    return prompt;
}

/**
 * Validate that an agent has all required context types mapped
 * @param {object} agent - Agent object with skill_id
 * @param {object} supabase - Supabase client
 * @returns {Promise<object>} Validation result { valid, missing_types, error }
 */
async function validateSkillContext(agent, supabase) {
    if (!agent?.skill_id) {
        return { valid: true };
    }

    // Get skill with context requirements
    const skill = await getSkill(agent.skill_id, supabase);
    if (!skill) {
        return { valid: true }; // No skill found, skip validation
    }

    const requiredTypes = skill.required_context_types || [];
    if (requiredTypes.length === 0) {
        return { valid: true };
    }

    // Get agent's context mappings with asset types
    const { data: mappings, error } = await supabase
        .from('agent_context_mappings')
        .select(`
            id,
            is_active,
            context_assets (
                id,
                asset_type
            )
        `)
        .eq('agent_id', agent.id)
        .eq('is_active', true);

    if (error) {
        console.error('Error fetching context mappings:', error);
        return {
            valid: false,
            error: 'Failed to validate context requirements'
        };
    }

    // Extract mapped asset types
    const mappedTypes = new Set(
        (mappings || [])
            .map(m => m.context_assets?.asset_type)
            .filter(Boolean)
    );

    // Find missing required types
    const missingTypes = requiredTypes.filter(type => !mappedTypes.has(type));

    if (missingTypes.length > 0) {
        return {
            valid: false,
            missing_types: missingTypes,
            skill_name: skill.display_name,
            error: `Skill "${skill.display_name}" requires context types: ${missingTypes.join(', ')}`
        };
    }

    return { valid: true };
}

/**
 * Get suggested context assets for a skill's requirements
 * @param {string} skillId - Skill UUID
 * @param {object} supabase - Supabase client
 * @returns {Promise<object>} Suggested assets by type
 */
async function getSuggestedContextAssets(skillId, supabase) {
    const skill = await getSkill(skillId, supabase);
    if (!skill) {
        return { required: {}, optional: {} };
    }

    const allTypes = [
        ...(skill.required_context_types || []),
        ...(skill.optional_context_types || [])
    ];

    if (allTypes.length === 0) {
        return { required: {}, optional: {} };
    }

    // Get available assets for these types
    const { data: assets, error } = await supabase
        .from('context_assets')
        .select('id, name, asset_type, description, usage_count')
        .in('asset_type', allTypes)
        .eq('is_current', true)
        .order('usage_count', { ascending: false });

    if (error) {
        console.error('Error fetching context assets:', error);
        return { required: {}, optional: {} };
    }

    // Group assets by type
    const assetsByType = {};
    (assets || []).forEach(asset => {
        if (!assetsByType[asset.asset_type]) {
            assetsByType[asset.asset_type] = [];
        }
        assetsByType[asset.asset_type].push(asset);
    });

    // Separate required vs optional
    const required = {};
    const optional = {};

    (skill.required_context_types || []).forEach(type => {
        required[type] = assetsByType[type] || [];
    });

    (skill.optional_context_types || []).forEach(type => {
        optional[type] = assetsByType[type] || [];
    });

    return { required, optional, skill };
}

/**
 * Record a skill execution
 * @param {object} params - Execution parameters
 * @param {object} supabase - Supabase client
 * @returns {Promise<object>} Created execution record
 */
async function recordSkillExecution(params, supabase) {
    const {
        skill_id,
        skill_version,
        agent_id,
        user_id,
        input_message,
        output_content,
        context_assets_used = [],
        context_tokens_used = 0,
        model_used,
        total_tokens = 0,
        duration_ms = 0,
        status = 'completed',
        error_message = null
    } = params;

    const { data, error } = await supabase
        .from('skill_executions')
        .insert({
            id: uuidv4(),
            skill_id,
            skill_version,
            agent_id,
            user_id,
            input_message,
            output_content,
            context_assets_used,
            context_tokens_used,
            model_used,
            total_tokens,
            duration_ms,
            status,
            error_message
        })
        .select()
        .single();

    if (error) {
        console.error('Error recording skill execution:', error);
        return null;
    }

    // Update skill usage count
    if (skill_id && status === 'completed') {
        await supabase.rpc('increment_skill_usage', { skill_uuid: skill_id }).catch(() => {
            // Fallback if RPC doesn't exist
            supabase
                .from('skills')
                .update({
                    usage_count: supabase.sql`usage_count + 1`,
                    last_used_at: new Date().toISOString()
                })
                .eq('id', skill_id)
                .then(() => {});
        });
    }

    return data;
}

/**
 * Check if agent uses a skill
 * @param {object} agent - Agent object
 * @returns {boolean} True if agent has a skill attached
 */
function isSkillPoweredAgent(agent) {
    return !!(agent?.skill_id);
}

/**
 * Get effective system prompt for an agent
 * If agent has skill, returns skill prompt; otherwise returns agent's system_prompt
 * @param {object} agent - Agent object
 * @param {object} supabase - Supabase client
 * @returns {Promise<string>} System prompt
 */
async function getEffectiveSystemPrompt(agent, supabase) {
    if (!agent) {
        return '';
    }

    // If agent has a skill, use skill instructions
    if (agent.skill_id) {
        const skill = await getSkillForAgent(agent, supabase);
        if (skill) {
            return buildSkillPrompt(skill);
        }
    }

    // Fall back to agent's own system prompt
    return agent.system_prompt || '';
}

/**
 * Parse SKILL.md content into structured data
 * @param {string} content - Raw SKILL.md content
 * @returns {object} Parsed skill data
 */
function parseSkillMarkdown(content) {
    if (!content) {
        return null;
    }

    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
        return null;
    }

    // Parse frontmatter
    const frontmatter = {};
    frontmatterMatch[1].split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();

            // Handle arrays
            if (value.startsWith('[') && value.endsWith(']')) {
                try {
                    value = JSON.parse(value.replace(/'/g, '"'));
                } catch {
                    value = [];
                }
            }
            // Handle quoted strings
            else if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            // Handle numbers
            else if (!isNaN(value) && value !== '') {
                value = Number(value);
            }

            frontmatter[key] = value;
        }
    });

    // Extract body
    const body = content.slice(frontmatterMatch[0].length).trim();

    // Extract sections
    const sections = {};
    const sectionRegex = /## ([^\n]+)\n\n([\s\S]*?)(?=\n## |$)/g;
    let match;

    while ((match = sectionRegex.exec(body)) !== null) {
        const sectionName = match[1].trim().toLowerCase().replace(/\s+/g, '_');
        sections[sectionName] = match[2].trim();
    }

    return {
        frontmatter,
        sections,
        raw_body: body
    };
}

/**
 * Generate SKILL.md content from skill data
 * @param {object} skill - Skill object
 * @returns {string} Formatted SKILL.md content
 */
function generateSkillMarkdown(skill) {
    if (!skill) {
        return '';
    }

    const requiredContext = skill.required_context_types || [];
    const optionalContext = skill.optional_context_types || [];
    const triggers = skill.trigger_phrases || [];
    const starters = skill.conversation_starters || [];
    const examples = skill.examples || [];

    let markdown = `---
name: ${skill.name}
description: "${(skill.description || '').replace(/"/g, '\\"')}"
version: ${skill.version || '1.0.0'}
category: ${skill.category || 'custom'}
suite: ${skill.suite || 'execute'}
required_context: [${requiredContext.map(t => `"${t}"`).join(', ')}]
optional_context: [${optionalContext.map(t => `"${t}"`).join(', ')}]
context_token_budget: ${skill.context_token_budget || 8000}
---

# ${skill.display_name || skill.name}

${skill.description || ''}

## Instructions

${skill.instructions || ''}
`;

    if (skill.output_format) {
        markdown += `\n## Output Format\n\n${skill.output_format}\n`;
    }

    if (triggers.length > 0) {
        markdown += `\n## Trigger Phrases\n\n${triggers.map(t => `- "${t}"`).join('\n')}\n`;
    }

    if (starters.length > 0) {
        markdown += `\n## Conversation Starters\n\n${starters.map(s => `- ${s}`).join('\n')}\n`;
    }

    if (examples.length > 0) {
        markdown += '\n## Examples\n\n';
        examples.forEach((ex, i) => {
            markdown += `### Example ${i + 1}\n\n`;
            markdown += `**Input:** ${ex.input}\n\n`;
            markdown += `**Output:**\n${ex.output}\n\n`;
        });
    }

    return markdown;
}

module.exports = {
    getSkill,
    getSkillForAgent,
    buildSkillPrompt,
    validateSkillContext,
    getSuggestedContextAssets,
    recordSkillExecution,
    isSkillPoweredAgent,
    getEffectiveSystemPrompt,
    parseSkillMarkdown,
    generateSkillMarkdown
};
