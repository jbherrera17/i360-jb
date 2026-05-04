/**
 * Thought Leadership — Content Generation.
 *
 * Module-access gating is applied by the coordinator (see ./index.js).
 */

const express = require('express');
const { TL_AGENTS } = require('./_shared');
const { executeAgent } = require('../../services/agentService');
const tlContentService = require('../../services/tlContentService');
const tlImageService = require('../../services/tlImageService');

module.exports = function (supabase) {
    const router = express.Router();

    // ============================================================================
    // CONTENT GENERATION ENDPOINTS
    // ============================================================================

    /**
     * POST /api/thought-leadership/generate/research
     * Research a topic using AI Visibility Researcher (with web search)
     */
    router.post('/generate/research', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const { topic, focus_areas, industry } = req.body;

            if (!topic) {
                return res.status(400).json({ error: 'Topic is required' });
            }

            const prompt = `Research this thought leadership topic:

**Topic:** ${topic}
${industry ? `**Industry:** ${industry}` : ''}
${focus_areas ? `**Focus Areas:** ${focus_areas.join(', ')}` : ''}

Research requirements:
1. Current state and recent developments (last 6 months)
2. Key statistics and data points with sources
3. Expert perspectives and notable quotes
4. Case studies or real-world examples
5. Common misconceptions to address
6. Practical applications and implications
7. Contrarian viewpoints or debates in the field

Focus on credible sources. Include citations where possible.
Format as structured markdown with clear sections.`;

            const startTime = Date.now();
            const result = await executeAgent(TL_AGENTS.VISIBILITY_RESEARCHER, {
                userMessage: prompt,
                userId: userId,
                conversationHistory: []
            });

            const duration_ms = Date.now() - startTime;

            res.json({
                success: true,
                research: result.response,
                metadata: {
                    topic,
                    execution_id: result.execution_id,
                    model: result.model,
                    tokens_used: result.usage?.total_tokens,
                    duration_ms
                }
            });
        } catch (err) {
            console.error('Error researching topic:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/generate/article
     * Generate an article (calls TL Article Writer agent)
     */
    router.post('/generate/article', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const {
                topic,
                pillar_id,
                format = 'medium',
                calendar_entry_id,
                additional_context,
                research_findings,
                generate_image = true,
                image_style = null,
                image_model = null
            } = req.body;

            if (!topic) {
                return res.status(400).json({ error: 'Topic is required' });
            }

            // Get pillar info if provided
            let pillarInfo = null;
            if (pillar_id) {
                const { data: pillar } = await supabase
                    .from('content_pillars')
                    .select('*')
                    .eq('id', pillar_id)
                    .single();
                pillarInfo = pillar;
            }

            // Get user's TL profile for thesis/claim context + image preferences
            const { data: profile } = await supabase
                .from('thought_leadership_profiles')
                .select('core_thesis, atomic_claim, positioning_framework, preferred_image_model, preferred_image_style')
                .eq('user_id', userId)
                .single();

            // Build the prompt for the Article Writer
            const formatSpecs = {
                long: '2000+ words, comprehensive treatment with 5-7 major sections',
                medium: '1000-1500 words, standard article with 3-4 major sections',
                short: '500-800 words, focused single insight with 2-3 sections'
            };

            const prompt = `Write a thought leadership article:

**Topic:** ${topic}
**Format:** ${format} (${formatSpecs[format] || formatSpecs.medium})
${pillarInfo ? `**Content Pillar:** ${pillarInfo.name}
**Pillar Description:** ${pillarInfo.description || 'N/A'}
**Hashtags:** ${(pillarInfo.hashtags || []).join(', ') || 'N/A'}` : ''}
${profile?.core_thesis ? `**Core Thesis:** ${profile.core_thesis}` : ''}
${profile?.atomic_claim ? `**Atomic Claim:** ${profile.atomic_claim}` : ''}
${research_findings ? `**Research Findings:**
${research_findings}` : ''}
${additional_context ? `**Additional Context:**
${additional_context}` : ''}

Write the complete article now. Your Voice DNA profile is provided in the agent context — follow it precisely:
- Use the sentence architecture patterns (open with story, follow with principle, close with takeaway)
- Match the rhythm variations (long reflective sentences alternating with short punchy statements)
- Use the signature concepts and transitional habits from the linguistic fingerprint
- Apply the rhetorical toolkit (personal storytelling, rhetorical questions, direct address)
- Respect the voice boundaries — NEVER sound like a hype-driven tech evangelist or corporate bureaucrat
- End with the closing signature: "Make today your masterpiece."

Article structure:
- A hook opening with a personal story or vivid memory
- Clear thesis statement anchored in values
- Supporting sections with evidence and lived examples
- Specific, concrete examples (not hypothetical)
- Actionable takeaways grounded in practical wisdom
- Reflective close with a call to think, not just act`;

            // Execute the TL Article Writer agent
            const startTime = Date.now();
            const result = await executeAgent(TL_AGENTS.ARTICLE_WRITER, {
                userMessage: prompt,
                userId: userId,
                conversationHistory: []
            });

            const duration_ms = Date.now() - startTime;

            // Optionally save to outputs table
            let savedOutput = null;
            if (calendar_entry_id) {
                const { data: output } = await supabase
                    .from('thought_leadership_outputs')
                    .insert({
                        user_id: userId,
                        calendar_entry_id,
                        output_type: 'article_human',
                        title: topic,
                        content: result.response,
                        content_format: 'markdown',
                        model_used: result.model || 'claude-sonnet',
                        tokens_used: result.usage?.total_tokens,
                        generation_time_ms: duration_ms,
                        is_current: true
                    })
                    .select()
                    .single();
                savedOutput = output;

                // Update calendar entry with article content
                await supabase
                    .from('content_calendar_entries')
                    .update({
                        article_markdown: result.response,
                        status: 'drafting'
                    })
                    .eq('id', calendar_entry_id);
            }

            // Generate header image automatically (unless opted out)
            let imageResult = null;
            let imageError = null;
            if (generate_image && result.response) {
                const resolvedStyle = image_style || profile?.preferred_image_style || 'professional';
                const resolvedModel = image_model || profile?.preferred_image_model || 'gpt-image-1.5';

                console.log(`[TL Article] Generating ${resolvedStyle} header image with ${resolvedModel}`);
                try {
                    imageResult = await tlImageService.generateArticleImage(result.response, {
                        style: resolvedStyle,
                        model: resolvedModel,
                        topic,
                        pillar: pillarInfo?.name,
                        thesis: profile?.core_thesis,
                        calendarEntryId: calendar_entry_id,
                        userId
                    });
                } catch (imgErr) {
                    console.error('[TL Article] Image generation failed:', imgErr);
                    imageError = {
                        message: imgErr.message,
                        recoverable: true,
                        hint: 'You can retry image generation separately via the image generation panel'
                    };
                }
            }

            res.json({
                success: true,
                article: result.response,
                image: imageResult ? {
                    url: imageResult.url,
                    prompt: imageResult.prompt,
                    revisedPrompt: imageResult.revisedPrompt,
                    style: imageResult.style,
                    styleName: imageResult.styleName,
                    model: imageResult.model,
                    generationTimeMs: imageResult.generationTimeMs
                } : null,
                image_error: imageError,
                metadata: {
                    topic,
                    format,
                    pillar: pillarInfo?.name,
                    execution_id: result.execution_id,
                    model: result.model,
                    tokens_used: result.usage?.total_tokens,
                    duration_ms: Date.now() - startTime,
                    saved_output_id: savedOutput?.id,
                    image_generated: !!imageResult,
                    image_model: imageResult?.model || null
                }
            });
        } catch (err) {
            console.error('Error generating article:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/generate/linkedin
     * Generate LinkedIn posts (calls TL LinkedIn Generator agent)
     */
    router.post('/generate/linkedin', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const {
                article_content,
                calendar_entry_id,
                pillar_id
            } = req.body;

            if (!article_content) {
                return res.status(400).json({ error: 'Article content is required' });
            }

            // Get pillar hashtags if provided
            let pillarHashtags = [];
            if (pillar_id) {
                const { data: pillar } = await supabase
                    .from('content_pillars')
                    .select('hashtags, name')
                    .eq('id', pillar_id)
                    .single();
                pillarHashtags = pillar?.hashtags || [];
            }

            // Build prompt for LinkedIn Generator
            const prompt = `Generate 5 LinkedIn posts for this article:

**Article:**
${article_content}

**Daily Theme Framework:**
- **Monday (Insight Launch)**: Lead with the counterintuitive insight from the article
- **Tuesday (Problem Spotlight)**: Highlight the pain point addressed
- **Wednesday (Framework Reveal)**: Share the practical how-to
- **Thursday (Story/Example)**: Make it concrete with a narrative from the article
- **Friday (Call to Reflect)**: End the week with meaning and reflection

**For each post:**
- Hook line under 10 words that stops the scroll
- 150-250 words total
- End with an engagement question
- Include 3-5 hashtags

${pillarHashtags.length > 0 ? `**Pillar hashtags to use:**
${pillarHashtags.join(', ')}` : ''}

Generate all 5 posts now in JSON format:
{
  "posts": [
    {"day": "monday", "theme": "insight_launch", "content": "...", "hashtags": [...]},
    ...
  ]
}`;

            // Execute the TL LinkedIn Generator agent
            const startTime = Date.now();
            const result = await executeAgent(TL_AGENTS.LINKEDIN_GENERATOR, {
                userMessage: prompt,
                userId: userId,
                conversationHistory: []
            });

            const duration_ms = Date.now() - startTime;

            // Try to parse JSON from response
            let linkedinPosts = [];
            try {
                const jsonMatch = result.response.match(/\{[\s\S]*"posts"[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    linkedinPosts = parsed.posts || [];
                }
            } catch (parseErr) {
                console.warn('Could not parse LinkedIn posts as JSON, returning raw response');
            }

            // Save to outputs and calendar if entry provided
            let savedOutput = null;
            if (calendar_entry_id) {
                const { data: output } = await supabase
                    .from('thought_leadership_outputs')
                    .insert({
                        user_id: userId,
                        calendar_entry_id,
                        output_type: 'linkedin_series',
                        title: 'Weekly LinkedIn Series',
                        content: result.response,
                        content_format: linkedinPosts.length > 0 ? 'json' : 'markdown',
                        model_used: result.model || 'claude-sonnet',
                        tokens_used: result.usage?.total_tokens,
                        generation_time_ms: duration_ms,
                        is_current: true
                    })
                    .select()
                    .single();
                savedOutput = output;

                // Update calendar entry with LinkedIn posts
                await supabase
                    .from('content_calendar_entries')
                    .update({
                        linkedin_posts: linkedinPosts.length > 0 ? linkedinPosts : [{ raw: result.response }]
                    })
                    .eq('id', calendar_entry_id);
            }

            res.json({
                success: true,
                posts: linkedinPosts.length > 0 ? linkedinPosts : null,
                raw_response: linkedinPosts.length === 0 ? result.response : undefined,
                metadata: {
                    post_count: linkedinPosts.length || 'unparsed',
                    execution_id: result.execution_id,
                    model: result.model,
                    tokens_used: result.usage?.total_tokens,
                    duration_ms,
                    saved_output_id: savedOutput?.id
                }
            });
        } catch (err) {
            console.error('Error generating LinkedIn posts:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/thought-leadership/calendar/db
     * Get calendar entries from the database (Phase 75 editorial calendar).
     * Query params: year, status (comma-separated)
     */
    router.get('/calendar/db', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) return res.status(401).json({ error: 'User ID required' });

            const year = parseInt(req.query.year) || new Date().getFullYear();
            const statusFilter = req.query.status ? req.query.status.split(',') : null;

            let query = supabase
                .from('content_calendar_entries')
                .select('id, title, scheduled_date, week_number, year, article_format, series_name, quarterly_pillar, monthly_topic, is_cornerstone, week_position_in_month, status, editorial_calendar_id')
                .eq('user_id', userId)
                .eq('year', year)
                .order('week_number', { ascending: true });

            if (statusFilter) {
                query = query.in('status', statusFilter);
            }

            const { data, error } = await query;
            if (error) throw error;

            res.json({ data: data || [] });
        } catch (err) {
            console.error('Error fetching DB calendar entries:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/thought-leadership/editorial-context/:calendar_entry_id
     * Resolve full editorial hierarchy for a calendar entry.
     */
    router.get('/editorial-context/:calendar_entry_id', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) return res.status(401).json({ error: 'User ID required' });

            const context = await tlContentService.resolveEditorialContext(
                req.params.calendar_entry_id, userId, supabase
            );

            if (!context) {
                return res.status(404).json({ error: 'Calendar entry not found or not accessible' });
            }

            // Don't return cornerstone_content in this lightweight endpoint
            const { cornerstone_content, ...safeContext } = context;
            safeContext.has_cornerstone_content = !!cornerstone_content;

            res.json({ data: safeContext });
        } catch (err) {
            console.error('Error resolving editorial context:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/quality-check
     * Run quality gates on existing content.
     */
    router.post('/quality-check', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) return res.status(401).json({ error: 'User ID required' });

            const { article_content, format = 'medium', ai_optimized_content, linkedin_posts, calendar_entry_id } = req.body;

            if (!article_content) {
                return res.status(400).json({ error: 'article_content is required' });
            }

            let editorialContext = null;
            if (calendar_entry_id) {
                editorialContext = await tlContentService.resolveEditorialContext(calendar_entry_id, userId, supabase);
            }

            const result = tlContentService.runQualityGates({
                articleContent: article_content,
                format,
                aiOptimizedContent: ai_optimized_content,
                linkedinPosts: linkedin_posts,
                editorialContext
            });

            res.json({ data: result });
        } catch (err) {
            console.error('Error running quality check:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/thought-leadership/generation-options
     * Returns available LLM models and context assets for the generation settings UI.
     */
    router.get('/generation-options', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) return res.status(401).json({ error: 'User ID required' });
            const orgId = req.headers['x-org-id'] || req.orgId;

            // Get available models from registry
            const llmRegistry = require('../services/llmRegistry');
            const availableModels = llmRegistry.getAvailableModels({
                anthropic: process.env.ANTHROPIC_API_KEY,
                openai: process.env.OPENAI_API_KEY,
                perplexity: process.env.PERPLEXITY_API_KEY,
                google: process.env.GOOGLE_API_KEY
            });

            // Flatten models into a single list with provider labels
            const models = [];
            if (availableModels.anthropic) {
                availableModels.anthropic.forEach(m => models.push({ ...m, provider: 'anthropic', providerName: 'Claude' }));
            }
            if (availableModels.openai) {
                availableModels.openai.filter(m => !m.imageGen).forEach(m => models.push({ ...m, provider: 'openai', providerName: 'OpenAI' }));
            }
            if (availableModels.google) {
                availableModels.google.forEach(m => models.push({ ...m, provider: 'google', providerName: 'Gemini' }));
            }

            // Get context assets scoped to this user's org (exclude templates)
            const userOrgId = req.headers['x-org-id'] || req.orgId;

            const assetQuery = (type) => {
                let q = supabase
                    .from('context_assets')
                    .select('id, name, asset_type, description')
                    .eq('asset_type', type)
                    .eq('is_current', true)
                    .eq('is_template', false);
                if (userOrgId) q = q.eq('org_id', userOrgId);
                return q.order('name');
            };

            const { data: voiceDna } = await assetQuery('voice_dna');
            const { data: icps } = await assetQuery('icp');
            const { data: bizProfiles } = await assetQuery('why_we_win');

            // Get user's saved preferences
            const { data: profile } = await supabase
                .from('thought_leadership_profiles')
                .select('preferred_llm_provider, preferred_llm_model, preferred_voice_dna_id, preferred_icp_id, preferred_business_profile_id')
                .eq('user_id', userId)
                .single();

            // Get current agent defaults for reference
            const { data: agentConfig } = await supabase
                .from('agents')
                .select('llm_provider, llm_model')
                .eq('id', TL_AGENTS.ARTICLE_WRITER)
                .single();

            res.json({
                models,
                context_assets: {
                    voice_dna: voiceDna || [],
                    icp: icps || [],
                    business_profile: bizProfiles || []
                },
                saved_preferences: profile ? {
                    llm_provider: profile.preferred_llm_provider,
                    llm_model: profile.preferred_llm_model,
                    voice_dna_id: profile.preferred_voice_dna_id,
                    icp_id: profile.preferred_icp_id,
                    business_profile_id: profile.preferred_business_profile_id
                } : null,
                agent_defaults: {
                    llm_provider: agentConfig?.llm_provider || 'anthropic',
                    llm_model: agentConfig?.llm_model || 'claude-sonnet-4-5-20250929'
                }
            });
        } catch (err) {
            console.error('Error fetching generation options:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * PUT /api/thought-leadership/generation-preferences
     * Save user's preferred generation settings.
     */
    router.put('/generation-preferences', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) return res.status(401).json({ error: 'User ID required' });

            const { llm_provider, llm_model, voice_dna_id, icp_id, business_profile_id } = req.body;

            const updates = { updated_at: new Date().toISOString() };
            if (llm_provider !== undefined) updates.preferred_llm_provider = llm_provider;
            if (llm_model !== undefined) updates.preferred_llm_model = llm_model;
            if (voice_dna_id !== undefined) updates.preferred_voice_dna_id = voice_dna_id;
            if (icp_id !== undefined) updates.preferred_icp_id = icp_id;
            if (business_profile_id !== undefined) updates.preferred_business_profile_id = business_profile_id;

            const { data, error } = await supabase
                .from('thought_leadership_profiles')
                .update(updates)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            res.json({ success: true, data });
        } catch (err) {
            console.error('Error saving generation preferences:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/generate/package
     * Generate complete weekly package (article + AI-optimized + LinkedIn posts)
     * Phase 76: Rewritten to use Content Creation System workflow via tlContentService.
     */
    router.post('/generate/package', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User ID required' });
            }

            const {
                topic,
                pillar_id,
                calendar_entry_id,
                format = 'medium',
                research_findings,
                additional_context,
                generate_image = true,
                image_style = null,
                image_model = null,
                // Phase 76b: Generation preferences (per-request override)
                llm_provider = null,
                llm_model = null,
                voice_dna_id = null,
                icp_id = null,
                business_profile_id = null
            } = req.body;

            if (!topic) {
                return res.status(400).json({ error: 'Topic is required' });
            }

            const packageStartTime = Date.now();
            const results = {
                article: null,
                article_ai: null,
                linkedin_posts: null,
                header_image: null,
                errors: []
            };

            // ── PHASE 76: Resolve editorial context from calendar ──
            let editorialContext = null;
            let resolvedFormat = format;
            if (calendar_entry_id) {
                editorialContext = await tlContentService.resolveEditorialContext(calendar_entry_id, userId, supabase);
                if (editorialContext?.article_format) {
                    resolvedFormat = editorialContext.article_format;
                }
            }

            // Get pillar info (fallback for non-calendar requests)
            let pillarInfo = null;
            if (pillar_id) {
                const { data: pillar } = await supabase
                    .from('content_pillars')
                    .select('*')
                    .eq('id', pillar_id)
                    .single();
                pillarInfo = pillar;
            }

            // Get user's TL profile (including image + generation preferences)
            const { data: profile } = await supabase
                .from('thought_leadership_profiles')
                .select('core_thesis, atomic_claim, preferred_image_model, preferred_image_style, preferred_llm_provider, preferred_llm_model, preferred_voice_dna_id, preferred_icp_id, preferred_business_profile_id')
                .eq('user_id', userId)
                .single();

            // ── Phase 76b: Resolve LLM model (request → saved preference → agent default) ──
            const resolvedLlmProvider = llm_provider || profile?.preferred_llm_provider || null;
            const resolvedLlmModel = llm_model || profile?.preferred_llm_model || null;

            // Build includeOnDemand list from selected context assets
            const contextOverrides = [];
            const resolvedVoiceDna = voice_dna_id || profile?.preferred_voice_dna_id || null;
            const resolvedIcp = icp_id || profile?.preferred_icp_id || null;
            const resolvedBizProfile = business_profile_id || profile?.preferred_business_profile_id || null;
            if (resolvedVoiceDna) contextOverrides.push(resolvedVoiceDna);
            if (resolvedIcp) contextOverrides.push(resolvedIcp);
            if (resolvedBizProfile) contextOverrides.push(resolvedBizProfile);

            // Create execution options with model override
            const agentOptions = {
                userId,
                conversationHistory: [],
                ...(resolvedLlmProvider && { modelOverride: { provider: resolvedLlmProvider, model: resolvedLlmModel } }),
                ...(contextOverrides.length > 0 && { includeOnDemand: contextOverrides })
            };

            // ── STEP 1: Generate Article (Phase 76 — Content Creation System workflow) ──
            console.log(`[TL Package] Step 1: Generating article for topic "${topic}" (format: ${resolvedFormat})`);
            try {
                const articlePrompt = tlContentService.buildArticlePrompt({
                    topic,
                    format: resolvedFormat,
                    editorialContext,
                    profile,
                    researchFindings: research_findings,
                    additionalContext: additional_context
                });

                const articleResult = await executeAgent(TL_AGENTS.ARTICLE_WRITER, {
                    ...agentOptions,
                    userMessage: articlePrompt
                });

                results.article = {
                    content: articleResult.response,
                    execution_id: articleResult.execution_id,
                    tokens_used: articleResult.usage?.total_tokens
                };
            } catch (articleErr) {
                console.error('[TL Package] Article generation failed:', articleErr);
                results.errors.push({ step: 'article', error: articleErr.message });
            }

            // ── STEP 2: Generate AI-Optimized Version ──
            if (results.article) {
                console.log('[TL Package] Step 2: Generating AI-optimized version');
                try {
                    const aiOptimizePrompt = tlContentService.buildAiOptimizedPrompt(
                        results.article.content, editorialContext, topic
                    );

                    const aiResult = await executeAgent(TL_AGENTS.ARTICLE_WRITER, {
                        ...agentOptions,
                        userMessage: aiOptimizePrompt
                    });

                    // Ensure YAML front matter is present (construct programmatically)
                    const aiContentWithYaml = tlContentService.ensureYamlFrontMatter(
                        aiResult.response,
                        { topic, editorialContext, articleContent: results.article?.content }
                    );

                    results.article_ai = {
                        content: aiContentWithYaml,
                        execution_id: aiResult.execution_id,
                        tokens_used: aiResult.usage?.total_tokens
                    };
                } catch (aiErr) {
                    console.error('[TL Package] AI optimization failed:', aiErr);
                    results.errors.push({ step: 'article_ai', error: aiErr.message });
                }
            }

            // ── STEP 3: Generate LinkedIn Posts (Phase 76 — per-day templates + hashtag rotation) ──
            if (results.article) {
                console.log('[TL Package] Step 3: Generating LinkedIn posts');
                try {
                    const linkedinPrompt = tlContentService.buildLinkedInPrompt(
                        results.article.content, editorialContext
                    );

                    const linkedinResult = await executeAgent(TL_AGENTS.LINKEDIN_GENERATOR, {
                        ...agentOptions,
                        userMessage: linkedinPrompt
                    });

                    // Parse JSON from response
                    let posts = [];
                    try {
                        const jsonMatch = linkedinResult.response.match(/\{[\s\S]*"posts"[\s\S]*\}/);
                        if (jsonMatch) {
                            posts = JSON.parse(jsonMatch[0]).posts || [];
                        }
                    } catch (parseErr) {
                        console.warn('[TL Package] Could not parse LinkedIn posts as JSON');
                    }

                    results.linkedin_posts = {
                        posts: posts,
                        raw: posts.length === 0 ? linkedinResult.response : undefined,
                        execution_id: linkedinResult.execution_id,
                        tokens_used: linkedinResult.usage?.total_tokens
                    };
                } catch (linkedinErr) {
                    console.error('[TL Package] LinkedIn generation failed:', linkedinErr);
                    results.errors.push({ step: 'linkedin', error: linkedinErr.message });
                }
            }

            // ── STEP 4: Generate Header Image ──
            if (results.article && generate_image) {
                const resolvedStyle = image_style || profile?.preferred_image_style || 'professional';
                const resolvedModel = image_model || profile?.preferred_image_model || 'gpt-image-1.5';
                console.log(`[TL Package] Step 4: Generating ${resolvedStyle} header image with ${resolvedModel}`);
                try {
                    const imageResult = await tlImageService.generateArticleImage(results.article.content, {
                        style: resolvedStyle,
                        model: resolvedModel,
                        topic,
                        pillar: editorialContext?.quarterly_pillar || pillarInfo?.name,
                        thesis: profile?.core_thesis,
                        calendarEntryId: calendar_entry_id,
                        userId
                    });

                    results.header_image = {
                        url: imageResult.url,
                        prompt: imageResult.prompt,
                        revisedPrompt: imageResult.revisedPrompt,
                        style: imageResult.style,
                        styleName: imageResult.styleName,
                        model: imageResult.model,
                        generationTimeMs: imageResult.generationTimeMs
                    };
                } catch (imageErr) {
                    console.error('[TL Package] Image generation failed:', imageErr);
                    results.errors.push({
                        step: 'image',
                        error: imageErr.message,
                        recoverable: true,
                        hint: 'You can retry image generation separately via the image generation panel'
                    });
                }
            }

            const totalDuration = Date.now() - packageStartTime;

            // ── STEP 5: Quality Gates (Phase 76) ──
            let qualityChecklist = null;
            try {
                qualityChecklist = tlContentService.runQualityGates({
                    articleContent: results.article?.content,
                    format: resolvedFormat,
                    aiOptimizedContent: results.article_ai?.content,
                    linkedinPosts: results.linkedin_posts?.posts,
                    editorialContext
                });
            } catch (qErr) {
                console.warn('[TL Package] Quality gate check failed:', qErr.message);
            }

            // Save outputs if calendar_entry_id provided
            const savedOutputs = [];
            if (calendar_entry_id) {
                // Save article
                if (results.article) {
                    const { data } = await supabase
                        .from('thought_leadership_outputs')
                        .insert({
                            user_id: userId,
                            calendar_entry_id,
                            output_type: 'article_human',
                            title: topic,
                            content: results.article.content,
                            content_format: 'markdown',
                            is_current: true
                        })
                        .select('id')
                        .single();
                    if (data) savedOutputs.push({ type: 'article_human', id: data.id });
                }

                // Save AI article
                if (results.article_ai) {
                    const { data } = await supabase
                        .from('thought_leadership_outputs')
                        .insert({
                            user_id: userId,
                            calendar_entry_id,
                            output_type: 'article_ai',
                            title: `${topic} (AI-Optimized)`,
                            content: results.article_ai.content,
                            content_format: 'markdown',
                            is_current: true
                        })
                        .select('id')
                        .single();
                    if (data) savedOutputs.push({ type: 'article_ai', id: data.id });
                }

                // Save LinkedIn posts
                if (results.linkedin_posts) {
                    const { data } = await supabase
                        .from('thought_leadership_outputs')
                        .insert({
                            user_id: userId,
                            calendar_entry_id,
                            output_type: 'linkedin_series',
                            title: 'Weekly LinkedIn Series',
                            content: JSON.stringify(results.linkedin_posts.posts || results.linkedin_posts.raw),
                            content_format: 'json',
                            is_current: true
                        })
                        .select('id')
                        .single();
                    if (data) savedOutputs.push({ type: 'linkedin_series', id: data.id });
                }

                // Update calendar entry
                await supabase
                    .from('content_calendar_entries')
                    .update({
                        article_markdown: results.article?.content,
                        article_ai_optimized: results.article_ai?.content,
                        linkedin_posts: results.linkedin_posts?.posts || [],
                        status: 'review'
                    })
                    .eq('id', calendar_entry_id);
            }

            const totalSteps = generate_image ? 4 : 3;
            const hasErrors = results.errors.length > 0;
            const hasCriticalError = results.errors.some(e => e.step === 'article');
            console.log(`[TL Package] Complete in ${totalDuration}ms with ${results.errors.length} errors`);

            // Build editorial context summary (exclude cornerstone_content from response)
            let editorialSummary = null;
            if (editorialContext) {
                const { cornerstone_content, ...summary } = editorialContext;
                summary.has_cornerstone_content = !!cornerstone_content;
                editorialSummary = summary;
            }

            res.json({
                success: !hasCriticalError,
                partial: hasErrors && !hasCriticalError,
                package: {
                    article: results.article?.content,
                    article_ai_optimized: results.article_ai?.content,
                    linkedin_posts: results.linkedin_posts?.posts || null,
                    linkedin_raw: results.linkedin_posts?.raw,
                    header_image: results.header_image || null
                },
                editorial_context: editorialSummary,
                quality_checklist: qualityChecklist,
                metadata: {
                    topic,
                    format: resolvedFormat,
                    pillar: editorialContext?.quarterly_pillar || pillarInfo?.name,
                    image_style: generate_image ? (image_style || profile?.preferred_image_style || 'professional') : null,
                    image_model: generate_image ? (image_model || profile?.preferred_image_model || 'gpt-image-1.5') : null,
                    total_duration_ms: totalDuration,
                    steps_completed: totalSteps - results.errors.length,
                    steps_total: totalSteps,
                    saved_outputs: savedOutputs
                },
                errors: hasErrors ? results.errors : undefined
            });
        } catch (err) {
            console.error('Error generating package:', err);
            res.status(500).json({ error: err.message });
        }
    });


    return router;
};
