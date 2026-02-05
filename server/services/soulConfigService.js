/**
 * INSIGHT 360 - Soul Configuration Service
 * Version: 1.0.0
 * Phase: 54 - Human Values Definition System
 *
 * Manages soul configurations with hierarchical inheritance:
 * Platform → Organization → Department/Client → Agent
 *
 * Provides CRUD operations, inheritance resolution, version tracking,
 * and soul.md markdown generation.
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * Scope hierarchy for inheritance (lower index = higher precedence for overrides)
 */
const SCOPE_HIERARCHY = ['agent', 'client', 'department', 'organization', 'platform'];

/**
 * Default platform soul configuration (fallback values)
 */
const DEFAULT_PLATFORM_SOUL = {
    identity: {
        name: 'Higgins',
        role: 'Chief of Staff AI',
        archetype: 'Trusted Butler',
        temperament: 'professional'
    },
    values: [],
    bright_lines: [],
    guardrails: {},
    voice: {
        tone: ['professional', 'helpful', 'concise'],
        avoid: ['jargon', 'buzzwords'],
        personality_temperature: 0.5
    },
    domain: {},
    stakeholders: [],
    escalation: {},
    methodology: {}
};

/**
 * Get soul configuration by ID
 * @param {string} configId - Soul configuration UUID
 * @returns {object} - Soul configuration
 */
async function getSoulConfig(configId) {
    const { data, error } = await supabase
        .from('soul_configurations')
        .select('*')
        .eq('id', configId)
        .single();

    if (error) throw error;
    if (!data) throw new Error('Soul configuration not found');

    return data;
}

/**
 * Get active soul configuration for a scope
 * @param {string} scopeType - platform/organization/department/client/agent
 * @param {object} scopeIds - { orgId, departmentId, clientId, agentId }
 * @returns {object|null} - Soul configuration or null
 */
async function getSoulConfigByScope(scopeType, scopeIds = {}) {
    let query = supabase
        .from('soul_configurations')
        .select('*')
        .eq('scope_type', scopeType)
        .eq('is_active', true)
        .eq('is_draft', false);

    // Add scope-specific filters
    if (scopeType === 'organization' && scopeIds.orgId) {
        query = query.eq('org_id', scopeIds.orgId);
    } else if (scopeType === 'department' && scopeIds.departmentId) {
        query = query.eq('department_id', scopeIds.departmentId);
    } else if (scopeType === 'client' && scopeIds.clientId) {
        query = query.eq('client_id', scopeIds.clientId);
    } else if (scopeType === 'agent' && scopeIds.agentId) {
        query = query.eq('agent_id', scopeIds.agentId);
    } else if (scopeType === 'platform') {
        query = query.is('org_id', null);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data || null;
}

/**
 * Resolve the complete soul configuration with inheritance
 * Merges configurations from platform → organization → department/client → agent
 *
 * @param {object} scopeIds - { orgId, departmentId, clientId, agentId }
 * @returns {object} - Merged soul configuration
 */
async function resolveInheritedSoulConfig(scopeIds = {}) {
    const configs = [];

    // Collect configurations at each level (in hierarchy order)
    // Platform level
    const platformConfig = await getSoulConfigByScope('platform', {});
    if (platformConfig) configs.push(platformConfig);

    // Organization level
    if (scopeIds.orgId) {
        const orgConfig = await getSoulConfigByScope('organization', { orgId: scopeIds.orgId });
        if (orgConfig) configs.push(orgConfig);
    }

    // Department level
    if (scopeIds.departmentId) {
        const deptConfig = await getSoulConfigByScope('department', { departmentId: scopeIds.departmentId });
        if (deptConfig) configs.push(deptConfig);
    }

    // Client level
    if (scopeIds.clientId) {
        const clientConfig = await getSoulConfigByScope('client', { clientId: scopeIds.clientId });
        if (clientConfig) configs.push(clientConfig);
    }

    // Agent level
    if (scopeIds.agentId) {
        const agentConfig = await getSoulConfigByScope('agent', { agentId: scopeIds.agentId });
        if (agentConfig) configs.push(agentConfig);
    }

    // If no configs found, use defaults
    if (configs.length === 0) {
        return {
            resolved: true,
            sources: ['default'],
            config: DEFAULT_PLATFORM_SOUL
        };
    }

    // Merge configurations (later configs override earlier ones)
    const merged = mergeConfigurations(configs);

    return {
        resolved: true,
        sources: configs.map(c => ({ id: c.id, scope_type: c.scope_type })),
        config: merged
    };
}

/**
 * Merge multiple soul configurations with smart merging
 * Arrays: concatenate and dedupe by key
 * Objects: deep merge (later values override)
 * Primitives: later values override
 *
 * @param {array} configs - Array of soul configurations (ordered from platform to specific)
 * @returns {object} - Merged configuration
 */
function mergeConfigurations(configs) {
    const result = {
        identity: {},
        values: [],
        bright_lines: [],
        guardrails: {},
        voice: {},
        domain: {},
        stakeholders: [],
        escalation: {},
        methodology: {}
    };

    for (const config of configs) {
        // Merge identity (object - deep merge)
        if (config.identity) {
            result.identity = deepMerge(result.identity, config.identity);
        }

        // Merge values (array - concatenate, dedupe by name)
        if (config.values && Array.isArray(config.values)) {
            result.values = mergeArraysByKey(result.values, config.values, 'name');
        }

        // Merge bright_lines (array - concatenate, dedupe by name)
        // Platform bright lines cannot be overridden
        if (config.bright_lines && Array.isArray(config.bright_lines)) {
            const platformLines = result.bright_lines.filter(bl => bl.level === 'platform');
            const otherLines = mergeArraysByKey(
                result.bright_lines.filter(bl => bl.level !== 'platform'),
                config.bright_lines.filter(bl => bl.level !== 'platform'),
                'name'
            );
            result.bright_lines = [...platformLines, ...otherLines];

            // Add new platform lines (if any)
            const newPlatformLines = config.bright_lines.filter(
                bl => bl.level === 'platform' && !platformLines.some(p => p.name === bl.name)
            );
            result.bright_lines.push(...newPlatformLines);
        }

        // Merge guardrails (object - deep merge)
        if (config.guardrails) {
            result.guardrails = deepMerge(result.guardrails, config.guardrails);
        }

        // Merge voice (object - deep merge)
        if (config.voice) {
            result.voice = deepMerge(result.voice, config.voice);
        }

        // Merge domain (object - deep merge)
        if (config.domain) {
            result.domain = deepMerge(result.domain, config.domain);
        }

        // Merge stakeholders (array - concatenate, dedupe by name)
        if (config.stakeholders && Array.isArray(config.stakeholders)) {
            result.stakeholders = mergeArraysByKey(result.stakeholders, config.stakeholders, 'name');
        }

        // Merge escalation (object - deep merge)
        if (config.escalation) {
            result.escalation = deepMerge(result.escalation, config.escalation);
        }

        // Merge methodology (object - deep merge)
        if (config.methodology) {
            result.methodology = deepMerge(result.methodology, config.methodology);
        }
    }

    return result;
}

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = deepMerge(result[key] || {}, source[key]);
            } else if (Array.isArray(source[key])) {
                result[key] = [...(result[key] || []), ...source[key]];
            } else {
                result[key] = source[key];
            }
        }
    }

    return result;
}

/**
 * Merge arrays by key (dedupe by key value)
 */
function mergeArraysByKey(arr1, arr2, key) {
    const map = new Map();

    for (const item of arr1) {
        if (item[key]) {
            map.set(item[key], item);
        }
    }

    for (const item of arr2) {
        if (item[key]) {
            // Later items override earlier ones
            map.set(item[key], { ...map.get(item[key]), ...item });
        }
    }

    return Array.from(map.values());
}

/**
 * Create a new soul configuration
 * @param {object} configData - Soul configuration data
 * @param {string} createdBy - User ID who created it
 * @returns {object} - Created configuration
 */
async function createSoulConfig(configData, createdBy) {
    const {
        scope_type,
        org_id,
        department_id,
        client_id,
        agent_id,
        identity,
        values,
        bright_lines,
        guardrails,
        voice,
        domain,
        stakeholders,
        escalation,
        methodology,
        is_draft = true
    } = configData;

    // Calculate completeness score
    const completeness = calculateCompletenessScore({
        identity, values, bright_lines, guardrails, voice, domain
    });

    const { data, error } = await supabase
        .from('soul_configurations')
        .insert({
            scope_type,
            org_id,
            department_id,
            client_id,
            agent_id,
            identity: identity || {},
            values: values || [],
            bright_lines: bright_lines || [],
            guardrails: guardrails || {},
            voice: voice || {},
            domain: domain || {},
            stakeholders: stakeholders || [],
            escalation: escalation || {},
            methodology: methodology || {},
            is_draft,
            is_active: !is_draft,
            completeness_score: completeness,
            created_by: createdBy,
            version: 1
        })
        .select()
        .single();

    if (error) throw error;

    // Create initial version record
    await createVersionRecord(data.id, data, 'Initial creation', createdBy);

    return data;
}

/**
 * Update a soul configuration
 * @param {string} configId - Configuration ID
 * @param {object} updates - Fields to update
 * @param {string} updatedBy - User ID who updated it
 * @param {string} changeReason - Reason for the change
 * @returns {object} - Updated configuration
 */
async function updateSoulConfig(configId, updates, updatedBy, changeReason = '') {
    // Get current config
    const current = await getSoulConfig(configId);

    // Calculate completeness if content fields changed
    const contentFields = ['identity', 'values', 'bright_lines', 'guardrails', 'voice', 'domain'];
    const hasContentChanges = contentFields.some(f => updates[f] !== undefined);

    const updateData = {
        ...updates,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
    };

    if (hasContentChanges) {
        updateData.completeness_score = calculateCompletenessScore({
            identity: updates.identity ?? current.identity,
            values: updates.values ?? current.values,
            bright_lines: updates.bright_lines ?? current.bright_lines,
            guardrails: updates.guardrails ?? current.guardrails,
            voice: updates.voice ?? current.voice,
            domain: updates.domain ?? current.domain
        });
    }

    const { data, error } = await supabase
        .from('soul_configurations')
        .update(updateData)
        .eq('id', configId)
        .select()
        .single();

    if (error) throw error;

    // Create version record if content changed
    if (hasContentChanges) {
        const changedSections = contentFields.filter(f => updates[f] !== undefined);
        await createVersionRecord(data.id, data, changeReason || 'Updated configuration', updatedBy, changedSections);
    }

    return data;
}

/**
 * Publish a draft soul configuration (make it active)
 * @param {string} configId - Configuration ID
 * @param {string} publishedBy - User ID who published it
 * @returns {object} - Published configuration
 */
async function publishSoulConfig(configId, publishedBy) {
    // Deactivate any existing active config at the same scope
    const current = await getSoulConfig(configId);

    // Build scope filter for finding existing active config
    const scopeFilter = { scope_type: current.scope_type };
    if (current.org_id) scopeFilter.org_id = current.org_id;
    if (current.department_id) scopeFilter.department_id = current.department_id;
    if (current.client_id) scopeFilter.client_id = current.client_id;
    if (current.agent_id) scopeFilter.agent_id = current.agent_id;

    // Deactivate existing active configs at this scope
    await supabase
        .from('soul_configurations')
        .update({ is_active: false })
        .match(scopeFilter)
        .eq('is_active', true)
        .neq('id', configId);

    // Publish this config
    const { data, error } = await supabase
        .from('soul_configurations')
        .update({
            is_draft: false,
            is_active: true,
            published_at: new Date().toISOString(),
            published_by: publishedBy,
            version: current.version + 1
        })
        .eq('id', configId)
        .select()
        .single();

    if (error) throw error;

    // Sync to related systems
    await syncSoulConfigToRelatedSystems(data);

    return data;
}

/**
 * Create a version record for audit trail
 */
async function createVersionRecord(configId, config, changeSummary, changedBy, changedSections = []) {
    const snapshot = {
        identity: config.identity,
        values: config.values,
        bright_lines: config.bright_lines,
        guardrails: config.guardrails,
        voice: config.voice,
        domain: config.domain,
        stakeholders: config.stakeholders,
        escalation: config.escalation,
        methodology: config.methodology
    };

    const { error } = await supabase
        .from('soul_config_versions')
        .insert({
            soul_config_id: configId,
            version: config.version,
            config_snapshot: snapshot,
            soul_md_snapshot: config.soul_md_content,
            change_summary: changeSummary,
            changed_sections: changedSections,
            changed_by: changedBy
        });

    if (error) console.error('Failed to create version record:', error);
}

/**
 * Get version history for a soul configuration
 * @param {string} configId - Configuration ID
 * @returns {array} - Version history
 */
async function getVersionHistory(configId) {
    const { data, error } = await supabase
        .from('soul_config_versions')
        .select('*')
        .eq('soul_config_id', configId)
        .order('version', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Rollback to a previous version
 * @param {string} configId - Configuration ID
 * @param {number} targetVersion - Version to rollback to
 * @param {string} rolledBackBy - User ID performing rollback
 * @returns {object} - Rolled back configuration
 */
async function rollbackToVersion(configId, targetVersion, rolledBackBy) {
    // Get target version
    const { data: versionRecord, error: versionError } = await supabase
        .from('soul_config_versions')
        .select('*')
        .eq('soul_config_id', configId)
        .eq('version', targetVersion)
        .single();

    if (versionError) throw versionError;
    if (!versionRecord) throw new Error(`Version ${targetVersion} not found`);

    // Apply the snapshot
    const snapshot = versionRecord.config_snapshot;

    return await updateSoulConfig(
        configId,
        {
            ...snapshot,
            soul_md_content: versionRecord.soul_md_snapshot
        },
        rolledBackBy,
        `Rolled back to version ${targetVersion}`
    );
}

/**
 * Calculate completeness score (0-100)
 */
function calculateCompletenessScore(config) {
    const weights = {
        identity: 15,
        values: 25,
        bright_lines: 15,
        guardrails: 15,
        voice: 15,
        domain: 15
    };

    let score = 0;

    // Identity completeness
    if (config.identity) {
        const identityFields = ['name', 'role', 'archetype'];
        const filledIdentity = identityFields.filter(f => config.identity[f]).length;
        score += (filledIdentity / identityFields.length) * weights.identity;
    }

    // Values completeness (need at least 3 values with behaviors)
    if (config.values && Array.isArray(config.values)) {
        const validValues = config.values.filter(v => v.name && v.meaning);
        const withBehaviors = validValues.filter(v => v.behaviors && v.behaviors.length > 0);
        const valueScore = Math.min(1, validValues.length / 3) * 0.5 +
                          Math.min(1, withBehaviors.length / 3) * 0.5;
        score += valueScore * weights.values;
    }

    // Bright lines completeness (need at least 2 org bright lines)
    if (config.bright_lines && Array.isArray(config.bright_lines)) {
        const orgLines = config.bright_lines.filter(bl => bl.level !== 'platform');
        const validLines = orgLines.filter(bl => bl.name && bl.description);
        score += Math.min(1, validLines.length / 2) * weights.bright_lines;
    }

    // Guardrails completeness
    if (config.guardrails) {
        const categories = ['communication', 'decision', 'scope', 'emotional'];
        const filledCategories = categories.filter(c =>
            config.guardrails[c] &&
            Array.isArray(config.guardrails[c]) &&
            config.guardrails[c].length > 0
        ).length;
        score += (filledCategories / categories.length) * weights.guardrails;
    }

    // Voice completeness
    if (config.voice) {
        const voiceFields = ['tone', 'avoid', 'personality_temperature'];
        const filledVoice = voiceFields.filter(f => {
            if (f === 'personality_temperature') return config.voice[f] !== undefined;
            return config.voice[f] && Array.isArray(config.voice[f]) && config.voice[f].length > 0;
        }).length;
        score += (filledVoice / voiceFields.length) * weights.voice;
    }

    // Domain completeness
    if (config.domain) {
        const domainFields = ['industry', 'products', 'key_terms'];
        const filledDomain = domainFields.filter(f => {
            const val = config.domain[f];
            if (Array.isArray(val)) return val.length > 0;
            return !!val;
        }).length;
        score += (filledDomain / domainFields.length) * weights.domain;
    }

    return Math.round(score);
}

/**
 * Generate soul.md markdown content from configuration
 * @param {string} configId - Configuration ID
 * @returns {string} - Soul.md markdown content
 */
async function generateSoulMd(configId) {
    const config = await getSoulConfig(configId);

    // Get organization name if applicable
    let orgName = 'Organization';
    if (config.org_id) {
        const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', config.org_id)
            .single();
        if (org) orgName = org.name;
    }

    const md = [];

    // Header
    md.push(`# ${orgName} — Soul Configuration File`);
    md.push(`## AI Assistant Configuration for Insight 360 Platform`);
    md.push('');
    md.push(`**Version:** ${config.version}`);
    md.push(`**Generated:** ${new Date().toISOString().split('T')[0]}`);
    md.push(`**Organization:** ${orgName}`);
    md.push(`**Platform:** Insight 360 by Synergi AI`);
    md.push(`**Completeness Score:** ${config.completeness_score}%`);
    md.push('');
    md.push('---');
    md.push('');

    // Section 1: Identity
    md.push('## 1. IDENTITY');
    md.push('');
    if (config.identity) {
        if (config.identity.name) md.push(`**Name:** ${config.identity.name}`);
        if (config.identity.role) md.push(`**Role:** ${config.identity.role}`);
        if (config.identity.archetype) md.push(`**Archetype:** ${config.identity.archetype}`);
        if (config.identity.temperament) md.push(`**Temperament:** ${config.identity.temperament}`);
        if (config.identity.description) {
            md.push('');
            md.push(config.identity.description);
        }
    }
    md.push('');

    // Section 2: Core Values
    md.push('## 2. CORE VALUES');
    md.push('');
    if (config.values && config.values.length > 0) {
        for (const value of config.values) {
            md.push(`### ${value.name}${value.priority ? ` (Priority: ${value.priority})` : ''}`);
            if (value.meaning) md.push(`**Meaning:** ${value.meaning}`);
            if (value.why_matters) md.push(`**Why It Matters:** ${value.why_matters}`);
            if (value.behaviors && value.behaviors.length > 0) {
                md.push('**Observable Behaviors:**');
                for (const behavior of value.behaviors) {
                    md.push(`- ${behavior}`);
                }
            }
            if (value.stress_behaviors && value.stress_behaviors.length > 0) {
                md.push('**Under Stress:**');
                for (const behavior of value.stress_behaviors) {
                    md.push(`- ${behavior}`);
                }
            }
            if (value.non_negotiable) md.push('**Non-Negotiable:** Yes');
            md.push('');
        }
    } else {
        md.push('*No core values defined.*');
        md.push('');
    }

    // Section 3: Bright Lines
    md.push('## 3. BRIGHT LINES (Non-Negotiables)');
    md.push('');

    // Platform bright lines
    const platformLines = (config.bright_lines || []).filter(bl => bl.level === 'platform');
    if (platformLines.length > 0) {
        md.push('### 3.1 Platform-Level Bright Lines (Immutable)');
        md.push('');
        for (const line of platformLines) {
            md.push(`**${line.name}**`);
            if (line.description) md.push(line.description);
            if (line.test_question) md.push(`> Test: "${line.test_question}"`);
            md.push('');
        }
    }

    // Organization bright lines
    const orgLines = (config.bright_lines || []).filter(bl => bl.level !== 'platform');
    if (orgLines.length > 0) {
        md.push('### 3.2 Organization-Level Bright Lines');
        md.push('');
        for (const line of orgLines) {
            md.push(`**${line.name}**`);
            if (line.description) md.push(line.description);
            if (line.rationale) md.push(`*Rationale:* ${line.rationale}`);
            if (line.test_question) md.push(`> Test: "${line.test_question}"`);
            if (line.violations && line.violations.length > 0) {
                md.push('Examples of violations:');
                for (const v of line.violations) {
                    md.push(`- ${v}`);
                }
            }
            md.push('');
        }
    }

    // Section 4: Guardrails
    md.push('## 4. GUARDRAILS');
    md.push('');
    if (config.guardrails) {
        for (const [category, rules] of Object.entries(config.guardrails)) {
            if (rules && rules.length > 0) {
                md.push(`### 4.${Object.keys(config.guardrails).indexOf(category) + 1} ${category.charAt(0).toUpperCase() + category.slice(1)} Guardrails`);
                md.push('');
                for (const rule of rules) {
                    if (typeof rule === 'string') {
                        md.push(`- ${rule}`);
                    } else if (rule.rule) {
                        md.push(`- **${rule.rule}**`);
                        if (rule.exception) md.push(`  - Exception: ${rule.exception}`);
                        if (rule.enforcement) md.push(`  - Enforcement: ${rule.enforcement}`);
                    }
                }
                md.push('');
            }
        }
    }

    // Section 5: Voice & Brand
    md.push('## 5. VOICE & BRAND');
    md.push('');
    if (config.voice) {
        if (config.voice.tone && config.voice.tone.length > 0) {
            md.push(`**Tone:** ${config.voice.tone.join(', ')}`);
        }
        if (config.voice.personality_temperature !== undefined) {
            const tempDesc = config.voice.personality_temperature < 0.3 ? 'Formal' :
                           config.voice.personality_temperature < 0.7 ? 'Balanced' : 'Casual';
            md.push(`**Personality:** ${tempDesc} (${config.voice.personality_temperature})`);
        }
        if (config.voice.use_words && config.voice.use_words.length > 0) {
            md.push(`**Words to Use:** ${config.voice.use_words.join(', ')}`);
        }
        if (config.voice.avoid && config.voice.avoid.length > 0) {
            md.push(`**Words to Avoid:** ${config.voice.avoid.join(', ')}`);
        }
        if (config.voice.sample_phrases && config.voice.sample_phrases.length > 0) {
            md.push('**Sample Phrases:**');
            for (const phrase of config.voice.sample_phrases) {
                md.push(`- "${phrase}"`);
            }
        }
    }
    md.push('');

    // Section 6: Domain Knowledge
    md.push('## 6. DOMAIN KNOWLEDGE');
    md.push('');
    if (config.domain) {
        if (config.domain.industry) md.push(`**Industry:** ${config.domain.industry}`);
        if (config.domain.key_terms && config.domain.key_terms.length > 0) {
            md.push('**Key Terms:**');
            for (const term of config.domain.key_terms) {
                if (typeof term === 'string') {
                    md.push(`- ${term}`);
                } else if (term.term) {
                    md.push(`- **${term.term}:** ${term.definition || ''}`);
                }
            }
        }
        if (config.domain.products && config.domain.products.length > 0) {
            md.push('**Products/Services:**');
            for (const product of config.domain.products) {
                if (typeof product === 'string') {
                    md.push(`- ${product}`);
                } else if (product.name) {
                    md.push(`- **${product.name}:** ${product.description || ''}`);
                }
            }
        }
        if (config.domain.competitors && config.domain.competitors.length > 0) {
            md.push(`**Competitive Landscape:** ${config.domain.competitors.join(', ')}`);
        }
    }
    md.push('');

    // Section 7: Stakeholders
    md.push('## 7. KEY STAKEHOLDERS');
    md.push('');
    if (config.stakeholders && config.stakeholders.length > 0) {
        for (const stakeholder of config.stakeholders) {
            md.push(`### ${stakeholder.name || stakeholder.role || 'Stakeholder'}`);
            if (stakeholder.description) md.push(stakeholder.description);
            if (stakeholder.needs && stakeholder.needs.length > 0) {
                md.push('**Needs:**');
                for (const need of stakeholder.needs) {
                    md.push(`- ${need}`);
                }
            }
            if (stakeholder.communication_style) md.push(`**Communication Style:** ${stakeholder.communication_style}`);
            md.push('');
        }
    } else {
        md.push('*No stakeholders defined.*');
        md.push('');
    }

    // Section 8: Escalation
    md.push('## 8. ESCALATION FRAMEWORK');
    md.push('');
    if (config.escalation) {
        if (config.escalation.decision_matrix) {
            md.push('### Decision Matrix');
            md.push('');
            md.push('| Decision Type | AI Authority | Human Review Required |');
            md.push('|---------------|--------------|----------------------|');
            for (const [type, authority] of Object.entries(config.escalation.decision_matrix)) {
                const humanReview = authority === 'human' ? 'Yes' : authority === 'advisory' ? 'Recommended' : 'No';
                md.push(`| ${type} | ${authority} | ${humanReview} |`);
            }
            md.push('');
        }
        if (config.escalation.contacts && config.escalation.contacts.length > 0) {
            md.push('### Escalation Contacts');
            md.push('');
            for (const contact of config.escalation.contacts) {
                md.push(`- **${contact.role || 'Contact'}:** ${contact.name || ''} ${contact.email ? `(${contact.email})` : ''}`);
            }
            md.push('');
        }
    }

    // Footer
    md.push('---');
    md.push('');
    md.push(`*Generated by Insight 360 Soul Configuration System on ${new Date().toISOString()}*`);

    const content = md.join('\n');

    // Save the generated markdown
    await supabase
        .from('soul_configurations')
        .update({
            soul_md_content: content,
            soul_md_version: config.soul_md_version + 1
        })
        .eq('id', configId);

    return content;
}

/**
 * Import soul configuration from soul.md markdown
 * @param {string} markdown - Soul.md content
 * @param {object} scopeInfo - { scope_type, org_id, etc. }
 * @param {string} importedBy - User ID
 * @returns {object} - Imported configuration
 */
async function importFromSoulMd(markdown, scopeInfo, importedBy) {
    // Parse markdown into structured config
    const config = parseSoulMd(markdown);

    // Create the configuration
    return await createSoulConfig({
        ...scopeInfo,
        ...config,
        is_draft: true
    }, importedBy);
}

/**
 * Parse soul.md markdown into configuration object
 * (Basic parser - can be enhanced)
 */
function parseSoulMd(markdown) {
    const config = {
        identity: {},
        values: [],
        bright_lines: [],
        guardrails: {},
        voice: {},
        domain: {},
        stakeholders: [],
        escalation: {}
    };

    // Parse identity section
    const identityMatch = markdown.match(/## 1\. IDENTITY([\s\S]*?)(?=## \d|$)/);
    if (identityMatch) {
        const section = identityMatch[1];
        const nameMatch = section.match(/\*\*Name:\*\* (.+)/);
        const roleMatch = section.match(/\*\*Role:\*\* (.+)/);
        const archetypeMatch = section.match(/\*\*Archetype:\*\* (.+)/);

        if (nameMatch) config.identity.name = nameMatch[1].trim();
        if (roleMatch) config.identity.role = roleMatch[1].trim();
        if (archetypeMatch) config.identity.archetype = archetypeMatch[1].trim();
    }

    // Parse values section
    const valuesMatch = markdown.match(/## 2\. CORE VALUES([\s\S]*?)(?=## \d|$)/);
    if (valuesMatch) {
        const section = valuesMatch[1];
        const valueBlocks = section.split(/### /).filter(b => b.trim());

        for (const block of valueBlocks) {
            const lines = block.split('\n');
            const nameMatch = lines[0].match(/^([^(]+)/);
            if (!nameMatch) continue;

            const value = {
                name: nameMatch[1].trim(),
                behaviors: []
            };

            const meaningMatch = block.match(/\*\*Meaning:\*\* (.+)/);
            if (meaningMatch) value.meaning = meaningMatch[1].trim();

            const behaviorsMatch = block.match(/\*\*Observable Behaviors:\*\*([\s\S]*?)(?=\*\*|$)/);
            if (behaviorsMatch) {
                const behaviors = behaviorsMatch[1].match(/- (.+)/g);
                if (behaviors) {
                    value.behaviors = behaviors.map(b => b.replace(/^- /, '').trim());
                }
            }

            if (value.name && value.name !== 'No core values defined.') {
                config.values.push(value);
            }
        }
    }

    // Parse voice section
    const voiceMatch = markdown.match(/## 5\. VOICE & BRAND([\s\S]*?)(?=## \d|$)/);
    if (voiceMatch) {
        const section = voiceMatch[1];
        const toneMatch = section.match(/\*\*Tone:\*\* (.+)/);
        const avoidMatch = section.match(/\*\*Words to Avoid:\*\* (.+)/);

        if (toneMatch) config.voice.tone = toneMatch[1].split(',').map(t => t.trim());
        if (avoidMatch) config.voice.avoid = avoidMatch[1].split(',').map(t => t.trim());
    }

    return config;
}

/**
 * Sync soul configuration to related systems
 * - Strategic Foundations
 * - Context Assets
 */
async function syncSoulConfigToRelatedSystems(config) {
    if (!config.org_id) return;

    try {
        // Sync to strategic_foundations if org-level
        if (config.scope_type === 'organization') {
            const { data: existingFoundation } = await supabase
                .from('strategic_foundations')
                .select('id')
                .eq('org_id', config.org_id)
                .single();

            if (existingFoundation) {
                // Update soul_config_id reference
                await supabase
                    .from('strategic_foundations')
                    .update({ soul_config_id: config.id })
                    .eq('id', existingFoundation.id);
            }
        }

        // Sync bright lines to context_assets
        if (config.bright_lines && config.bright_lines.length > 0) {
            // Check if bright_lines asset type exists
            const { data: assetType } = await supabase
                .from('context_asset_types')
                .select('id')
                .eq('type_key', 'bright_lines')
                .single();

            if (assetType) {
                const brightLinesContent = {
                    source: 'soul_configuration',
                    soul_config_id: config.id,
                    bright_lines: config.bright_lines
                };

                // Upsert bright_lines context asset
                await supabase
                    .from('context_assets')
                    .upsert({
                        org_id: config.org_id,
                        asset_type: 'bright_lines',
                        name: 'Organization Bright Lines',
                        description: 'Non-negotiable boundaries from Soul Configuration',
                        content_json: brightLinesContent,
                        is_active: true
                    }, {
                        onConflict: 'org_id,asset_type,name'
                    });
            }
        }

        // Sync values to context_assets
        if (config.values && config.values.length > 0) {
            const { data: valuesAssetType } = await supabase
                .from('context_asset_types')
                .select('id')
                .eq('type_key', 'values_map')
                .single();

            if (valuesAssetType) {
                const valuesContent = {
                    source: 'soul_configuration',
                    soul_config_id: config.id,
                    values: config.values
                };

                await supabase
                    .from('context_assets')
                    .upsert({
                        org_id: config.org_id,
                        asset_type: 'values_map',
                        name: 'Organization Values',
                        description: 'Core values from Soul Configuration',
                        content_json: valuesContent,
                        is_active: true
                    }, {
                        onConflict: 'org_id,asset_type,name'
                    });
            }
        }
    } catch (error) {
        console.error('Error syncing soul config to related systems:', error);
    }
}

/**
 * List soul configurations with filtering
 * @param {object} filters - { scope_type, org_id, is_draft, is_active }
 * @returns {array} - Soul configurations
 */
async function listSoulConfigs(filters = {}) {
    let query = supabase
        .from('soul_configurations')
        .select('*')
        .order('created_at', { ascending: false });

    if (filters.scope_type) query = query.eq('scope_type', filters.scope_type);
    if (filters.org_id) query = query.eq('org_id', filters.org_id);
    if (filters.is_draft !== undefined) query = query.eq('is_draft', filters.is_draft);
    if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active);

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
}

/**
 * Delete a soul configuration (soft delete via deactivation)
 * @param {string} configId - Configuration ID
 * @returns {boolean} - Success
 */
async function deleteSoulConfig(configId) {
    const { error } = await supabase
        .from('soul_configurations')
        .update({ is_active: false, is_draft: true })
        .eq('id', configId);

    if (error) throw error;
    return true;
}

/**
 * Clone a soul configuration to a new scope
 * @param {string} sourceConfigId - Source configuration ID
 * @param {object} targetScope - { scope_type, org_id, etc. }
 * @param {string} clonedBy - User ID
 * @returns {object} - Cloned configuration
 */
async function cloneSoulConfig(sourceConfigId, targetScope, clonedBy) {
    const source = await getSoulConfig(sourceConfigId);

    return await createSoulConfig({
        ...targetScope,
        identity: source.identity,
        values: source.values,
        bright_lines: source.bright_lines,
        guardrails: source.guardrails,
        voice: source.voice,
        domain: source.domain,
        stakeholders: source.stakeholders,
        escalation: source.escalation,
        methodology: source.methodology,
        is_draft: true
    }, clonedBy);
}

module.exports = {
    getSoulConfig,
    getSoulConfigByScope,
    resolveInheritedSoulConfig,
    createSoulConfig,
    updateSoulConfig,
    publishSoulConfig,
    deleteSoulConfig,
    cloneSoulConfig,
    listSoulConfigs,
    getVersionHistory,
    rollbackToVersion,
    generateSoulMd,
    importFromSoulMd,
    calculateCompletenessScore,
    mergeConfigurations,
    syncSoulConfigToRelatedSystems
};
