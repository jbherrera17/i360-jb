/**
 * INSIGHT 360 - Prompt Transformation API Routes
 * Version: 1.0.0
 *
 * Transforms system prompts into structured outputs:
 *   - Claude Skills (Markdown)
 *   - Context Assets (Voice DNA, ICP, Business Profile)
 *   - Insight 360 Agents
 *
 * Endpoints:
 *   - POST /api/prompts/analyze     - Analyze prompt and detect type
 *   - POST /api/prompts/transform   - Transform prompt to target format
 *   - GET  /api/prompts/templates   - Get transformation templates
 *   - POST /api/prompts/preview     - Preview transformation without saving
 */

const express = require('express');
const { randomUUID: uuidv4 } = require('crypto');
const { getVerifiedOrgId } = require('../utils/orgScope');
const { getDefaultModel } = require('../services/llmRegistry');

/**
 * Prompts Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
module.exports = function(supabase) {
    const router = express.Router();
    const createModuleAccessMiddleware = require('../middleware/moduleAccess');
    const { requireModule } = createModuleAccessMiddleware(supabase);

    // Module gating — prompt transformer is accessed from chat.html (Higgins module, all tiers)
    router.use(requireModule('higgins'));

    // ============================================================================
    // CONSTANTS & TEMPLATES
    // ============================================================================

    const PROMPT_TYPES = {
        skill: {
            name: 'Claude Skill',
            description: 'Reusable workflow with triggers and instructions',
            indicators: [
                'step-by-step', 'workflow', 'process', 'procedure',
                'when the user', 'instructions', 'generate', 'create'
            ]
        },
        voice_dna: {
            name: 'Voice DNA',
            description: 'Brand voice, tone, and writing style guidelines',
            indicators: [
                'voice', 'tone', 'personality', 'style', 'sound like',
                'never say', 'always use', 'writing', 'communicate'
            ]
        },
        icp: {
            name: 'Ideal Customer Profile',
            description: 'Target audience segments and personas',
            indicators: [
                'audience', 'customer', 'user', 'segment', 'persona',
                'pain points', 'goals', 'challenges', 'demographics'
            ]
        },
        business_profile: {
            name: 'Business Profile',
            description: 'Company positioning, offerings, and messaging',
            indicators: [
                'company', 'business', 'product', 'service', 'offering',
                'value proposition', 'differentiation', 'positioning'
            ]
        },
        agent: {
            name: 'Insight 360 Agent',
            description: 'AI agent with role, capabilities, and behavior rules',
            indicators: [
                'you are', 'your role', 'agent', 'assistant', 'advisor',
                'help the user', 'respond to', 'behavior'
            ]
        }
    };

    const TRANSFORMATION_TEMPLATES = {
        skill: {
            frontmatter: `---
name: {{name}}
description: {{description}}
{{#if allowedTools}}allowed-tools: {{allowedTools}}{{/if}}
---`,
            body: `# {{displayName}}

## Overview
{{overview}}

## When to Use This Skill
{{triggers}}

## Instructions
{{instructions}}

## Examples
{{examples}}

## Best Practices
{{bestPractices}}

## Version History
- v1.0.0 ({{date}}): Transformed from system prompt`
        },
        voice_dna: {
            schema: {
                core_identity: { who_you_are: '', what_you_do: '', your_angle: '' },
                personality: { traits: [], energy: '' },
                tone: { primary_tone: '', secondary_tone: '', how_formal: 5 },
                communication_style: {
                    sentence_length: 'mixed',
                    paragraph_style: 'mixed',
                    uses_questions: true,
                    uses_lists: true,
                    thought_progression: ''
                },
                signature_phrases: {
                    opener_phrases: [],
                    transition_phrases: [],
                    emphasis_phrases: [],
                    closer_phrases: []
                },
                voice_boundaries: {
                    never_sounds_like: [],
                    never_uses_phrases: [],
                    avoids_topics: []
                },
                emotional_range: {
                    primary_emotions: [],
                    how_you_show_enthusiasm: '',
                    how_you_show_frustration: '',
                    how_you_build_trust: ''
                },
                examples: {}
            }
        },
        icp: {
            schema: {
                profile_overview: { name: '', one_line_description: '', why_they_follow_you: '' },
                demographics: { job_titles: [], industries: [], experience_level: '', business_stage: '', location: '' },
                psychographics: {
                    values: { list: [] },
                    frustrations: { list: [] },
                    fears: { list: [] },
                    aspirations: { list: [] }
                },
                current_state: { what_theyve_tried: [], why_it_hasnt_worked: [], current_pain: '' },
                desired_state: { dream_outcome: '', what_success_looks_like: '', how_theyd_feel: '' },
                language: {
                    how_they_describe_their_problem: [],
                    phrases_they_use: [],
                    words_that_resonate: [],
                    words_that_turn_them_off: []
                },
                objections: { common_objections: [], what_they_need_to_believe: [], what_convinces_them: [] },
                behavior: { where_they_hang_out: [], how_they_learn: [], content_preferences: '', decision_making_style: '' }
            }
        },
        business_profile: {
            schema: {
                overview: { business_name: '', what_you_do: '', who_you_serve: '', primary_transformation: '' },
                positioning: { unique_angle: '', what_makes_you_different: [], your_philosophy: '', your_methodology: '' },
                offerings: { free_offerings: [], paid_offerings: [] },
                content_focus: { main_topics: [], subtopics: [], topics_you_avoid: [] },
                brand_voice_in_business_context: { how_you_mention_offerings: '', cta_style: '', sales_philosophy: '' },
                social_proof: { credentials: [], results_achieved: [], notable_clients_or_features: [] },
                links: { website: '', newsletter: '', social_profiles: {}, product_pages: {} }
            }
        },
        agent: {
            schema: {
                name: '',
                slug: '',
                icon: '🤖',
                description: '',
                category: 'strategy',
                is_active: true,
                system_prompt: '',
                model: 'claude-sonnet-4-5-20250929',
                temperature: 0.7,
                max_tokens: 4096,
                skill_id: null,
                required_context_types: [],
                optional_context_types: [],
                tags: [],
                metadata: {}
            }
        }
    };

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    /**
     * Analyze prompt content to detect type
     */
    function analyzePromptType(prompt) {
        const lowerPrompt = prompt.toLowerCase();
        const scores = {};

        for (const [type, config] of Object.entries(PROMPT_TYPES)) {
            let score = 0;
            for (const indicator of config.indicators) {
                if (lowerPrompt.includes(indicator)) {
                    score++;
                }
            }
            scores[type] = score;
        }

        // Sort by score descending
        const sorted = Object.entries(scores)
            .sort((a, b) => b[1] - a[1])
            .map(([type, score]) => ({
                type,
                score,
                confidence: score > 3 ? 'high' : score > 1 ? 'medium' : 'low',
                ...PROMPT_TYPES[type]
            }));

        return {
            primary: sorted[0],
            secondary: sorted[1],
            all: sorted
        };
    }

    /**
     * Generate skill name from content
     */
    function generateSkillName(prompt, hint = '') {
        if (hint) {
            return hint.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        }

        // Extract key action words
        const actionWords = prompt.match(/\b(generate|create|write|analyze|review|process|build|format|convert|transform)\b/gi) || [];
        const targetWords = prompt.match(/\b(email|report|document|code|article|content|message|response|summary)\b/gi) || [];

        if (actionWords.length && targetWords.length) {
            return `${actionWords[0]}-${targetWords[0]}`.toLowerCase();
        }

        // Fallback to generic name
        return `custom-skill-${Date.now().toString(36)}`;
    }

    /**
     * Build transformation system prompt
     */
    function buildTransformationPrompt(targetType, template) {
        const basePrompt = `You are an expert prompt engineer and system architect for AI assistants.

Your task is to transform a raw system prompt into a structured ${PROMPT_TYPES[targetType].name} format.

## CRITICAL RULES:
1. Output ONLY valid JSON - no markdown code blocks, no commentary
2. Preserve the original intent and functionality completely
3. Extract and structure all relevant information
4. Use empty strings "" or empty arrays [] for missing data - NEVER invent or assume
5. Be specific and actionable, not generic

`;

        switch (targetType) {
            case 'skill':
                return basePrompt + `## OUTPUT FORMAT (Claude Skill)

Return a JSON object with these exact fields:
{
  "name": "lowercase-with-hyphens (max 64 chars)",
  "display_name": "Human Readable Name",
  "description": "WHAT it does + WHEN to use it (max 200 chars)",
  "overview": "1-2 paragraph explanation of value",
  "triggers": ["trigger phrase 1", "trigger phrase 2"],
  "instructions": "# Step-by-step instructions in markdown\\n\\n1. First step...\\n2. Second step...",
  "examples": [
    { "input": "Example user request", "output": "Example response" }
  ],
  "best_practices": ["Do this", "Don't do that"],
  "allowed_tools": null or ["Read", "Write", "Bash"] if restricted,
  "required_context_types": [],
  "optional_context_types": []
}`;

            case 'voice_dna':
                return basePrompt + `## OUTPUT FORMAT (Voice DNA)

Return a JSON object matching this exact schema:
${JSON.stringify(TRANSFORMATION_TEMPLATES.voice_dna.schema, null, 2)}

Extract personality traits, tone, boundaries, and signature phrases from the prompt.`;

            case 'icp':
                return basePrompt + `## OUTPUT FORMAT (Ideal Customer Profile)

Return a JSON object matching this exact schema:
${JSON.stringify(TRANSFORMATION_TEMPLATES.icp.schema, null, 2)}

Extract target audience details, pain points, goals, and behavioral patterns.`;

            case 'business_profile':
                return basePrompt + `## OUTPUT FORMAT (Business Profile)

Return a JSON object matching this exact schema:
${JSON.stringify(TRANSFORMATION_TEMPLATES.business_profile.schema, null, 2)}

Extract business positioning, offerings, and messaging guidelines.`;

            case 'agent':
                return basePrompt + `## OUTPUT FORMAT (Insight 360 Agent)

Return a JSON object with these exact fields:
{
  "name": "Agent Display Name",
  "slug": "lowercase-hyphenated",
  "icon": "single emoji representing the agent",
  "description": "1-2 sentence description of agent purpose",
  "category": "strategy|operations|creative|technical|support",
  "system_prompt": "The cleaned/optimized system prompt",
  "temperature": 0.7,
  "required_context_types": ["context types needed"],
  "optional_context_types": ["context types that help"],
  "tags": ["relevant", "tags"]
}

Clean up the system prompt: remove redundancy, improve clarity, but preserve all functionality.`;

            default:
                return basePrompt;
        }
    }

    // ============================================================================
    // ENDPOINTS
    // ============================================================================

    /**
     * POST /api/prompts/analyze
     * Analyze a prompt and detect its type
     */
    router.post('/analyze', async (req, res) => {
        try {
            const { prompt } = req.body;

            if (!prompt || prompt.length < 20) {
                return res.status(400).json({
                    success: false,
                    error: 'Prompt must be at least 20 characters'
                });
            }

            const analysis = analyzePromptType(prompt);

            res.json({
                success: true,
                data: {
                    detected_type: analysis.primary.type,
                    confidence: analysis.primary.confidence,
                    reasoning: `Found ${analysis.primary.score} matching indicators for ${analysis.primary.name}`,
                    recommendations: analysis.all.filter(t => t.score > 0).map(t => ({
                        type: t.type,
                        name: t.name,
                        confidence: t.confidence,
                        description: t.description
                    })),
                    prompt_length: prompt.length,
                    word_count: prompt.split(/\s+/).length
                }
            });

        } catch (error) {
            console.error('Error analyzing prompt:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/prompts/transform
     * Transform a prompt into the target format
     */
    router.post('/transform', async (req, res) => {
        try {
            const {
                prompt,
                target_type = 'auto',
                name_hint,
                save = false,
                destination
            } = req.body;

            if (!prompt || prompt.length < 20) {
                return res.status(400).json({
                    success: false,
                    error: 'Prompt must be at least 20 characters'
                });
            }

            // Determine target type
            let finalTargetType = target_type;
            if (target_type === 'auto') {
                const analysis = analyzePromptType(prompt);
                finalTargetType = analysis.primary.type;
            }

            if (!PROMPT_TYPES[finalTargetType]) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid target_type: ${target_type}. Valid types: ${Object.keys(PROMPT_TYPES).join(', ')}`
                });
            }

            // Check for Anthropic API key
            if (!process.env.ANTHROPIC_API_KEY) {
                return res.status(500).json({
                    success: false,
                    error: 'Anthropic API key not configured'
                });
            }

            // Build transformation prompt
            const systemPrompt = buildTransformationPrompt(finalTargetType);

            // Call Anthropic API
            const Anthropic = require('@anthropic-ai/sdk');
            const anthropic = new Anthropic();

            const transformModel = getDefaultModel('anthropic') || 'claude-sonnet-4-5-20250929';
            const startTime = Date.now();
            const response = await anthropic.messages.create({
                model: transformModel,
                max_tokens: 4096,
                system: systemPrompt,
                messages: [{
                    role: 'user',
                    content: `Transform this system prompt:\n\n${prompt}`
                }]
            });
            const duration = Date.now() - startTime;

            const responseText = response.content[0]?.text || '';

            // Parse JSON response
            let transformed;
            try {
                let jsonText = responseText.trim();
                if (jsonText.startsWith('```')) {
                    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
                }
                transformed = JSON.parse(jsonText);
            } catch (parseError) {
                console.error('Failed to parse transformation response:', parseError);
                console.error('Raw AI response (first 500 chars):', responseText.substring(0, 500));
                return res.status(500).json({
                    success: false,
                    error: 'AI returned invalid JSON. Please try again.'
                });
            }

            // Post-process based on type
            const userId = req.userId || req.user?.id || null;
            let savedRecord = null;
            let defaultVisibility = 'private'; // Default to private (fail-safe)

            if (save) {
                // Require authentication for saving
                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required to save transformations. Please log in.'
                    });
                }

                // Require org context for tenant isolation
                const orgId = getVerifiedOrgId(req);
                if (!orgId) {
                    return res.status(403).json({
                        success: false,
                        error: 'Organization context required to save transformations.'
                    });
                }

                // Get user's default visibility from business role
                try {
                    const { data: userPerms } = await supabase
                        .from('user_effective_permissions')
                        .select('default_visibility')
                        .eq('user_id', userId)
                        .single();

                    if (userPerms?.default_visibility) {
                        defaultVisibility = userPerms.default_visibility;
                    }
                } catch (permErr) {
                    console.log('Using default visibility (team):', permErr.message);
                }

                // Helper to make name unique if duplicate exists
                const makeUniqueName = (baseName) => {
                    const timestamp = Date.now().toString(36);
                    return `${baseName}-${timestamp}`;
                };

                switch (finalTargetType) {
                    case 'skill':
                        // Save to skills table
                        let skillName = transformed.name || generateSkillName(prompt, name_hint);
                        const skillData = {
                            id: uuidv4(),
                            org_id: orgId,
                            user_id: userId,
                            name: skillName,
                            display_name: transformed.display_name,
                            description: transformed.description,
                            instructions: transformed.instructions,
                            output_format: null,
                            required_context_types: transformed.required_context_types || [],
                            optional_context_types: transformed.optional_context_types || [],
                            trigger_phrases: transformed.triggers || [],
                            examples: transformed.examples || [],
                            tags: ['transformed', 'from-prompt'],
                            version: '1.0.0',
                            status: 'draft',
                            visibility: defaultVisibility,
                            created_by: userId
                        };

                        let { data: skillRecord, error: skillError } = await supabase
                            .from('skills')
                            .insert(skillData)
                            .select()
                            .single();

                        // Handle duplicate name - add timestamp suffix
                        if (skillError && skillError.code === '23505') {
                            skillData.name = makeUniqueName(skillName);
                            skillData.id = uuidv4();
                            const retry = await supabase
                                .from('skills')
                                .insert(skillData)
                                .select()
                                .single();
                            skillRecord = retry.data;
                            skillError = retry.error;
                        }

                        if (skillError) throw skillError;
                        savedRecord = skillRecord;
                        break;

                    case 'agent':
                        // Save to agents table
                        // Map visibility to is_public (public=true, team/private=false)
                        const isPublic = defaultVisibility === 'public';
                        let agentName = transformed.name;
                        let agentSlug = transformed.slug;
                        const agentData = {
                            id: uuidv4(),
                            org_id: orgId,
                            user_id: userId,
                            name: agentName,
                            slug: agentSlug,
                            icon: transformed.icon || '🤖',
                            description: transformed.description,
                            category: transformed.category || 'strategy',
                            system_prompt: transformed.system_prompt,
                            model: transformModel,
                            temperature: transformed.temperature || 0.7,
                            max_tokens: 4096,
                            is_active: true,
                            is_public: isPublic,
                            required_context_types: transformed.required_context_types || [],
                            optional_context_types: transformed.optional_context_types || [],
                            tags: transformed.tags || ['transformed']
                        };

                        let { data: agentRecord, error: agentError } = await supabase
                            .from('agents')
                            .insert(agentData)
                            .select()
                            .single();

                        // Handle duplicate name/slug - add timestamp suffix
                        if (agentError && agentError.code === '23505') {
                            const suffix = Date.now().toString(36);
                            agentData.name = `${agentName}-${suffix}`;
                            agentData.slug = `${agentSlug}-${suffix}`;
                            agentData.id = uuidv4();
                            const retry = await supabase
                                .from('agents')
                                .insert(agentData)
                                .select()
                                .single();
                            agentRecord = retry.data;
                            agentError = retry.error;
                        }

                        if (agentError) throw agentError;
                        savedRecord = agentRecord;
                        break;

                    case 'voice_dna':
                    case 'icp':
                    case 'business_profile':
                        // Save to context_assets table
                        const assetType = finalTargetType === 'voice_dna' ? 'voice_dna' :
                                         finalTargetType === 'icp' ? 'icp' : 'custom_processes';

                        const assetData = {
                            id: uuidv4(),
                            org_id: orgId,
                            user_id: userId,
                            asset_type: assetType,
                            name: name_hint || `${PROMPT_TYPES[finalTargetType].name} - ${new Date().toLocaleDateString()}`,
                            description: `Transformed from system prompt`,
                            content_json: transformed,
                            content_text: JSON.stringify(transformed),
                            tags: ['transformed', 'from-prompt'],
                            visibility: defaultVisibility,
                            version: 1,
                            is_current: true,
                            usage_count: 0,
                            created_by: userId
                        };

                        const { data: assetRecord, error: assetError } = await supabase
                            .from('context_assets')
                            .insert(assetData)
                            .select()
                            .single();

                        if (assetError) throw assetError;
                        savedRecord = assetRecord;
                        break;
                }
            }

            // Build response
            const result = {
                success: true,
                data: {
                    target_type: finalTargetType,
                    transformed,
                    metadata: {
                        original_length: prompt.length,
                        transformation_time_ms: duration,
                        tokens_used: {
                            input: response.usage?.input_tokens || 0,
                            output: response.usage?.output_tokens || 0
                        }
                    }
                }
            };

            if (savedRecord) {
                result.data.saved = {
                    id: savedRecord.id,
                    table: finalTargetType === 'skill' ? 'skills' :
                           finalTargetType === 'agent' ? 'agents' : 'context_assets',
                    name: savedRecord.name || savedRecord.display_name
                };
            }

            // Generate file content for skills
            if (finalTargetType === 'skill') {
                const date = new Date().toISOString().split('T')[0];
                result.data.skill_markdown = `---
name: ${transformed.name}
description: ${transformed.description}
${transformed.allowed_tools ? `allowed-tools: ${transformed.allowed_tools.join(', ')}` : ''}
---

# ${transformed.display_name}

## Overview
${transformed.overview}

## When to Use This Skill
${(transformed.triggers || []).map(t => `- ${t}`).join('\n')}

## Instructions
${transformed.instructions}

## Examples
${(transformed.examples || []).map((e, i) => `### Example ${i + 1}\n\n**Input:** ${e.input}\n\n**Output:** ${e.output}`).join('\n\n')}

## Best Practices
${(transformed.best_practices || []).map(bp => `- ${bp}`).join('\n')}

## Version History
- v1.0.0 (${date}): Transformed from system prompt
`;
            }

            res.json(result);

        } catch (error) {
            console.error('Error transforming prompt:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/prompts/preview
     * Preview transformation without saving
     */
    // Preview is handled by calling /transform with save=false from the frontend.
    // The previous /preview endpoint used invalid router.handle() — removed.

    /**
     * POST /api/prompts/save
     * Save pre-transformed (and user-edited) data directly — no LLM call.
     * Used by TransformAssetModal step 2 to persist edited form data.
     */
    router.post('/save', async (req, res) => {
        try {
            const { target_type, data: editedData, source_prompt } = req.body;
            const userId = req.userId || req.user?.id || null;
            const orgId = getVerifiedOrgId(req);

            if (!userId) {
                return res.status(401).json({ success: false, error: 'Authentication required.' });
            }
            if (!orgId) {
                return res.status(403).json({ success: false, error: 'Organization context required.' });
            }
            if (!target_type || !editedData) {
                return res.status(400).json({ success: false, error: 'target_type and data are required.' });
            }
            if (!PROMPT_TYPES[target_type]) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid target_type: ${target_type}. Valid: ${Object.keys(PROMPT_TYPES).join(', ')}`
                });
            }
            if (!editedData.name || !editedData.name.trim()) {
                return res.status(400).json({ success: false, error: 'Name is required.' });
            }

            // Get user's default visibility
            let defaultVisibility = 'private';
            try {
                const { data: userPerms } = await supabase
                    .from('user_effective_permissions')
                    .select('default_visibility')
                    .eq('user_id', userId)
                    .single();
                if (userPerms?.default_visibility) defaultVisibility = userPerms.default_visibility;
            } catch (permErr) {
                // Use private default
            }

            const makeUniqueName = (baseName) => `${baseName}-${Date.now().toString(36)}`;
            let savedRecord = null;

            switch (target_type) {
                case 'skill': {
                    let skillName = editedData.name.trim();
                    const skillData = {
                        id: uuidv4(),
                        org_id: orgId,
                        user_id: userId,
                        name: skillName,
                        display_name: editedData.display_name || skillName,
                        description: editedData.description || '',
                        instructions: editedData.instructions || '',
                        output_format: null,
                        required_context_types: editedData.required_context_types || [],
                        optional_context_types: editedData.optional_context_types || [],
                        trigger_phrases: editedData.triggers || [],
                        examples: editedData.examples || [],
                        tags: ['transformed', 'from-prompt'],
                        version: '1.0.0',
                        status: 'draft',
                        visibility: defaultVisibility,
                        created_by: userId
                    };

                    let { data: record, error } = await supabase
                        .from('skills').insert(skillData).select().single();
                    if (error && error.code === '23505') {
                        skillData.name = makeUniqueName(skillName);
                        skillData.id = uuidv4();
                        const retry = await supabase.from('skills').insert(skillData).select().single();
                        record = retry.data;
                        error = retry.error;
                    }
                    if (error) throw error;
                    savedRecord = record;
                    break;
                }

                case 'agent': {
                    const visibility = editedData.visibility || defaultVisibility;
                    const isPublic = visibility === 'public';
                    let agentName = editedData.name.trim();
                    let agentSlug = agentName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                    const agentModel = editedData.llm_model || getDefaultModel('anthropic') || 'claude-sonnet-4-5-20250929';

                    const agentData = {
                        id: uuidv4(),
                        org_id: orgId,
                        user_id: userId,
                        name: agentName,
                        slug: agentSlug,
                        icon: editedData.icon || '🤖',
                        description: editedData.description || '',
                        category: editedData.category || 'strategy',
                        system_prompt: editedData.system_prompt || '',
                        model: agentModel,
                        temperature: editedData.temperature || 0.7,
                        max_tokens: editedData.max_tokens || 4096,
                        is_active: true,
                        is_public: isPublic,
                        required_context_types: editedData.required_context_types || [],
                        optional_context_types: editedData.optional_context_types || [],
                        tags: editedData.tags || ['transformed']
                    };

                    let { data: record, error } = await supabase
                        .from('agents').insert(agentData).select().single();
                    if (error && error.code === '23505') {
                        const suffix = Date.now().toString(36);
                        agentData.name = `${agentName}-${suffix}`;
                        agentData.slug = `${agentSlug}-${suffix}`;
                        agentData.id = uuidv4();
                        const retry = await supabase.from('agents').insert(agentData).select().single();
                        record = retry.data;
                        error = retry.error;
                    }
                    if (error) throw error;
                    savedRecord = record;
                    break;
                }

                case 'voice_dna':
                case 'icp':
                case 'business_profile': {
                    const assetType = target_type === 'voice_dna' ? 'voice_dna' :
                                     target_type === 'icp' ? 'icp' : 'custom_processes';
                    const { name, ...contentData } = editedData;

                    const assetData = {
                        id: uuidv4(),
                        org_id: orgId,
                        user_id: userId,
                        asset_type: assetType,
                        name: name.trim(),
                        description: `Transformed from system prompt`,
                        content_json: contentData,
                        content_text: JSON.stringify(contentData),
                        tags: ['transformed', 'from-prompt'],
                        visibility: defaultVisibility,
                        version: 1,
                        is_current: true,
                        usage_count: 0,
                        created_by: userId
                    };

                    const { data: record, error } = await supabase
                        .from('context_assets').insert(assetData).select().single();
                    if (error) throw error;
                    savedRecord = record;
                    break;
                }
            }

            res.status(201).json({
                success: true,
                data: {
                    saved: {
                        id: savedRecord.id,
                        table: target_type === 'skill' ? 'skills' :
                               target_type === 'agent' ? 'agents' : 'context_assets',
                        name: savedRecord.name || savedRecord.display_name
                    }
                }
            });

        } catch (error) {
            console.error('Error saving transformed asset:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/prompts/templates
     * Get available transformation templates
     */
    router.get('/templates', (req, res) => {
        const templates = Object.entries(PROMPT_TYPES).map(([key, value]) => ({
            type: key,
            ...value,
            schema: TRANSFORMATION_TEMPLATES[key]?.schema || null
        }));

        res.json({
            success: true,
            data: templates
        });
    });

    /**
     * POST /api/prompts/batch
     * Transform multiple prompts
     */
    router.post('/batch', async (req, res) => {
        try {
            const { prompts, target_type = 'auto', save = false } = req.body;

            if (!Array.isArray(prompts) || prompts.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'prompts must be a non-empty array'
                });
            }

            if (prompts.length > 10) {
                return res.status(400).json({
                    success: false,
                    error: 'Maximum 10 prompts per batch'
                });
            }

            const results = [];
            for (const promptData of prompts) {
                const prompt = typeof promptData === 'string' ? promptData : promptData.prompt;
                const hint = typeof promptData === 'object' ? promptData.name_hint : null;

                try {
                    // Reuse transform logic
                    const mockReq = {
                        body: { prompt, target_type, name_hint: hint, save },
                        user: req.user
                    };
                    const mockRes = {
                        json: (data) => results.push({ success: true, ...data }),
                        status: () => ({
                            json: (data) => results.push({ success: false, ...data })
                        })
                    };

                    // We'll do inline transformation here for batch
                    const analysis = analyzePromptType(prompt);
                    results.push({
                        success: true,
                        detected_type: analysis.primary.type,
                        confidence: analysis.primary.confidence,
                        prompt_preview: prompt.substring(0, 100) + '...'
                    });
                } catch (err) {
                    results.push({
                        success: false,
                        error: err.message,
                        prompt_preview: prompt.substring(0, 50) + '...'
                    });
                }
            }

            res.json({
                success: true,
                data: {
                    total: prompts.length,
                    successful: results.filter(r => r.success).length,
                    failed: results.filter(r => !r.success).length,
                    results
                }
            });

        } catch (error) {
            console.error('Error in batch transformation:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/prompts/history
     * Get transformation history
     */
    router.get('/history', async (req, res) => {
        try {
            const { limit = 20, offset = 0 } = req.query;
            const orgId = getVerifiedOrgId(req);

            if (!orgId) {
                return res.status(403).json({
                    success: false,
                    error: 'Organization context required'
                });
            }

            // Get recently transformed items from multiple tables (org-scoped)
            const [skills, agents, assets] = await Promise.all([
                supabase
                    .from('skills')
                    .select('id, name, display_name, created_at, status')
                    .eq('org_id', orgId)
                    .contains('tags', ['transformed'])
                    .order('created_at', { ascending: false })
                    .limit(parseInt(limit)),
                supabase
                    .from('agents')
                    .select('id, name, icon, created_at, is_active')
                    .eq('org_id', orgId)
                    .not('metadata->source', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(parseInt(limit)),
                supabase
                    .from('context_assets')
                    .select('id, name, asset_type, created_at')
                    .eq('org_id', orgId)
                    .contains('tags', ['transformed'])
                    .order('created_at', { ascending: false })
                    .limit(parseInt(limit))
            ]);

            const history = [
                ...(skills.data || []).map(s => ({ ...s, type: 'skill' })),
                ...(agents.data || []).map(a => ({ ...a, type: 'agent' })),
                ...(assets.data || []).map(a => ({ ...a, type: a.asset_type }))
            ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
             .slice(0, parseInt(limit));

            res.json({
                success: true,
                data: history,
                count: history.length
            });

        } catch (error) {
            console.error('Error getting transformation history:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
