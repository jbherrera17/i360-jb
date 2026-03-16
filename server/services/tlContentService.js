/**
 * INSIGHT 360 - Thought Leadership Content Service
 * Version: 1.0.0
 *
 * Implements the Content Creation System workflow for the TL module.
 * Handles editorial context resolution, prompt building with format-specific
 * structure templates, hashtag strategy, and quality gates.
 *
 * Replaces inline prompt construction in thought-leadership.js generate/package.
 */

// Supabase client — lazily initialized from env vars (same pattern as agentService.js).
// resolveEditorialContext also accepts an optional supabase param for route injection.
let _supabase = null;
function getSupabase() {
    if (!_supabase) {
        const { createClient } = require('@supabase/supabase-js');
        _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    }
    return _supabase;
}

// ============================================================================
// FORMAT-SPECIFIC ARTICLE STRUCTURE TEMPLATES
// ============================================================================

const ARTICLE_STRUCTURES = {
    long: {
        label: 'Long-form (2,000+ words)',
        wordTarget: '2,000+',
        sections: [
            { name: 'Opening Story/Hook', words: '200-300', guidance: 'Open with a vivid personal story or memory that connects to the article theme. Establish emotional resonance and context.' },
            { name: 'The Problem/Context', words: '300-400', guidance: 'Frame the challenge or gap. Why does this matter now? Ground in real-world evidence.' },
            { name: 'Core Framework/Argument', words: '600-800', guidance: 'Present the main thesis with 3 key supporting points. Each point gets its own subsection with evidence and examples.' },
            { name: 'Application/Implementation', words: '300-400', guidance: 'Translate the framework into actionable steps. Be specific and concrete — no vague advice.' },
            { name: 'Examples/Evidence', words: '200-300', guidance: 'Real-world examples, case studies, or data that validate the framework. Specific names, numbers, outcomes.' },
            { name: 'Implications/Call to Reflection', words: '200-300', guidance: 'What does this mean for the reader\'s organization? Provoke deeper thinking.' },
            { name: 'Closing Insight', words: '100-150', guidance: 'Concise moral or takeaway. End with the closing signature.' }
        ]
    },
    medium: {
        label: 'Medium (1,000-1,500 words)',
        wordTarget: '1,000-1,500',
        sections: [
            { name: 'Opening Hook', words: '100-150', guidance: 'Start with a question, bold claim, or brief anecdote that earns the reader\'s attention.' },
            { name: 'The Challenge', words: '200-250', guidance: 'Define the problem your audience faces. Use their language.' },
            { name: 'The Framework/Solution', words: '400-500', guidance: 'Present your approach with 2-3 clear points. Frameworks, models, or step-by-step methods.' },
            { name: 'Practical Application', words: '200-300', guidance: 'Show how to implement. Concrete, specific, actionable.' },
            { name: 'Key Takeaway', words: '100-150', guidance: 'One clear principle the reader walks away with. End with closing signature.' }
        ]
    },
    short: {
        label: 'Short (500-800 words)',
        wordTarget: '500-800',
        sections: [
            { name: 'Hook', words: '50-75', guidance: 'One powerful sentence or question that stops the reader.' },
            { name: 'Core Insight', words: '250-350', guidance: 'The single big idea, developed with one strong example or framework.' },
            { name: 'Application', words: '150-200', guidance: 'What to do with this insight. Practical and immediate.' },
            { name: 'Closing Punch', words: '50-75', guidance: 'A sharp, memorable close. End with closing signature.' }
        ]
    }
};

// ============================================================================
// LINKEDIN DAILY THEME TEMPLATES
// ============================================================================

const LINKEDIN_TEMPLATES = {
    monday: {
        theme: 'Insight Launch',
        psychology: 'Authority + curiosity',
        formula: `[Bold declarative statement from article's core thesis]

[2-3 sentences expanding on why this matters]

[Transition: "I explore this in depth in my latest article."]

[CTA: "Link in comments" or direct prompt]`,
        guidance: 'Lead with the counterintuitive or most surprising insight from the article. Make the reader stop scrolling.'
    },
    tuesday: {
        theme: 'Problem Spotlight',
        psychology: 'Empathy + recognition',
        formula: `[Question or "Have you noticed..." opening]

[Description of the problem your audience faces]

[Why it's getting worse / stakes]

[Transition to solution in article]`,
        guidance: 'Name the pain point your audience feels but can\'t articulate. Use their language from the ICP profiles.'
    },
    wednesday: {
        theme: 'Framework Reveal',
        psychology: 'Value + practicality',
        formula: `[Framework name or numbered list hook]

[Key components or steps - bulleted]

[Why this framework works]

[Where to learn more]`,
        guidance: 'Share one actionable framework or model from the article. Use numbered lists or bullets. Make it immediately useful.'
    },
    thursday: {
        theme: 'Story/Example',
        psychology: 'Connection + proof',
        formula: `[Personal story hook or "A client recently..."]

[What happened - the challenge]

[The turning point or insight]

[The outcome or lesson]

[Connection to article]`,
        guidance: 'Share a real story — personal experience or client example. Make it concrete with specific details.'
    },
    friday: {
        theme: 'Call to Reflect',
        psychology: 'Engagement + action',
        formula: `[Philosophical question related to article theme]

[Brief context or provocation]

[Invitation to reflect and read]

[Weekend thought prompt]`,
        guidance: 'End the week with meaning. Ask a question that lingers over the weekend. Connect to the article\'s deeper theme.'
    }
};

// ============================================================================
// BRAND HASHTAG ROTATION
// ============================================================================

const BRAND_HASHTAG_ROTATION = {
    monday: ['#SynergiAI', '#ValuesFirstAI'],
    tuesday: ['#AlignedIntelligence'],
    wednesday: ['#SynergiAI'],
    thursday: ['#IntegrityByDesign'],
    friday: ['#ValuesFirstAI', '#SynergiAI']
};

const QUARTERLY_HASHTAGS = {
    'Human-Aligned Intelligence': ['#HumanFirst', '#HumanAICollaboration', '#AIEthics'],
    'Ethical Architecture': ['#AIGovernance', '#EthicalAI', '#IntegrityMatters'],
    'Values as Strategy': ['#StrategicAI', '#BusinessStrategy', '#AILeadership'],
    'Sustainable Growth': ['#SustainableBusiness', '#PurposeDriven', '#FutureOfAI']
};

const MONTHLY_HASHTAGS = {
    1: ['#HumanFirst', '#AIPhilosophy', '#HumanBrilliance'],
    2: ['#AIEthics', '#ValuesAlignment', '#AIGovernance'],
    3: ['#HumanAICollaboration', '#TeamAI', '#FutureOfWork'],
    4: ['#OrganizationalIntegrity', '#AIEthics', '#BusinessRisk'],
    5: ['#BusinessIntegrity', '#IntegrityMatters', '#TrustBuilding'],
    6: ['#AIGovernance', '#EthicalAI', '#AIGuardrails'],
    7: ['#LeadershipDevelopment', '#PersonalGrowth', '#Leadership'],
    8: ['#StrategicAI', '#BusinessStrategy', '#CompetitiveAdvantage'],
    9: ['#AIEcosystem', '#ConnectedIntelligence', '#SystemsThinking'],
    10: ['#BusinessMetrics', '#SustainableBusiness', '#PurposeDriven'],
    11: ['#SustainableBusiness', '#LongTermThinking', '#ResponsibleGrowth'],
    12: ['#FutureOfAI', '#AILeadership', '#ThoughtLeadership']
};

// ============================================================================
// EDITORIAL CONTEXT RESOLUTION
// ============================================================================

/**
 * Resolve full editorial hierarchy for a calendar entry.
 * Returns: annual theme, quarterly pillar, monthly theme, series, cornerstone info.
 *
 * @param {string} calendarEntryId - UUID of the content_calendar_entries row
 * @param {string} userId - UUID of the user
 * @returns {object|null} Editorial context or null if not resolvable
 */
async function resolveEditorialContext(calendarEntryId, userId, supabaseClient) {
    if (!calendarEntryId) return null;
    const supabase = supabaseClient || getSupabase();

    // Get the calendar entry with its editorial fields
    const { data: entry, error: entryErr } = await supabase
        .from('content_calendar_entries')
        .select(`
            id, title, scheduled_date, week_number, year,
            article_format, series_name, is_cornerstone, cornerstone_number,
            week_position_in_month, quarterly_pillar, monthly_topic,
            editorial_calendar_id, cornerstone_article_id,
            article_markdown
        `)
        .eq('id', calendarEntryId)
        .eq('user_id', userId)
        .single();

    if (entryErr || !entry) return null;

    // Get the editorial calendar for hierarchy data
    let editorialCalendar = null;
    if (entry.editorial_calendar_id) {
        const { data: cal } = await supabase
            .from('editorial_calendars')
            .select('annual_theme, quarterly_pillars, monthly_themes, foundation_articles, publishing_schedule')
            .eq('id', entry.editorial_calendar_id)
            .single();
        editorialCalendar = cal;
    }

    // Resolve the quarterly pillar details
    let pillarDetails = null;
    if (editorialCalendar?.quarterly_pillars && entry.quarterly_pillar) {
        pillarDetails = editorialCalendar.quarterly_pillars.find(
            p => p.name === entry.quarterly_pillar
        );
    }

    // Resolve the monthly theme details
    let monthlyDetails = null;
    if (editorialCalendar?.monthly_themes && entry.scheduled_date) {
        const month = new Date(entry.scheduled_date).getMonth() + 1;
        monthlyDetails = editorialCalendar.monthly_themes.find(m => m.month === month);
    }

    // Resolve the cornerstone article (for series extensions)
    let cornerstoneArticle = null;
    if (entry.cornerstone_article_id) {
        const { data: cornerstone } = await supabase
            .from('content_calendar_entries')
            .select('id, title, article_markdown')
            .eq('id', entry.cornerstone_article_id)
            .single();
        cornerstoneArticle = cornerstone;
    } else if (!entry.is_cornerstone && entry.week_position_in_month > 1) {
        // Find the cornerstone for this month (week_position_in_month = 1, same monthly_topic)
        const { data: cornerstone } = await supabase
            .from('content_calendar_entries')
            .select('id, title, article_markdown')
            .eq('user_id', userId)
            .eq('monthly_topic', entry.monthly_topic)
            .eq('year', entry.year)
            .eq('is_cornerstone', true)
            .single();
        cornerstoneArticle = cornerstone;
    }

    // Resolve foundation article info
    let foundationInfo = null;
    if (editorialCalendar?.foundation_articles && entry.cornerstone_number) {
        foundationInfo = editorialCalendar.foundation_articles.find(
            f => f.number === entry.cornerstone_number
        );
    }

    // Determine month for hashtag resolution
    const month = entry.scheduled_date ? new Date(entry.scheduled_date).getMonth() + 1 : null;

    return {
        // Entry metadata
        entry_id: entry.id,
        title: entry.title,
        week_number: entry.week_number,
        year: entry.year,
        scheduled_date: entry.scheduled_date,
        article_format: entry.article_format || 'medium',
        series_name: entry.series_name,

        // Hierarchy
        annual_theme: editorialCalendar?.annual_theme || null,
        quarterly_pillar: entry.quarterly_pillar,
        pillar_theme: pillarDetails?.theme || null,
        pillar_quarter: pillarDetails?.q || null,
        monthly_theme: entry.monthly_topic,
        monthly_subtitle: monthlyDetails?.subtitle || null,

        // Cornerstone / series
        is_cornerstone: entry.is_cornerstone,
        cornerstone_number: entry.cornerstone_number,
        week_position_in_month: entry.week_position_in_month,
        cornerstone_title: cornerstoneArticle?.title || null,
        cornerstone_content: cornerstoneArticle?.article_markdown || null,
        foundation_role: foundationInfo?.role || null,

        // Publishing
        publishing_schedule: editorialCalendar?.publishing_schedule || null,

        // Hashtags
        quarterly_hashtags: QUARTERLY_HASHTAGS[entry.quarterly_pillar] || [],
        monthly_hashtags: month ? (MONTHLY_HASHTAGS[month] || []) : []
    };
}

// ============================================================================
// PROMPT BUILDING
// ============================================================================

/**
 * Build the article generation prompt with full editorial context and
 * format-specific structure templates.
 *
 * @param {object} params
 * @param {string} params.topic - Article topic/title
 * @param {string} params.format - 'long', 'medium', or 'short'
 * @param {object|null} params.editorialContext - From resolveEditorialContext()
 * @param {object|null} params.profile - TL profile (core_thesis, atomic_claim)
 * @param {string|null} params.researchFindings - Research data
 * @param {string|null} params.additionalContext - Extra context from user
 * @returns {string} Complete prompt for the Article Writer agent
 */
function buildArticlePrompt({ topic, format = 'medium', editorialContext, profile, researchFindings, additionalContext }) {
    const structure = ARTICLE_STRUCTURES[format] || ARTICLE_STRUCTURES.medium;

    // Build the structure template
    const structureTemplate = structure.sections.map((s, i) =>
        `${i + 1}. **${s.name}** (${s.words} words)\n   ${s.guidance}`
    ).join('\n');

    let prompt = `Write a thought leadership article following this precise specification:

**Topic:** ${topic}
**Format:** ${structure.label}
**Target Length:** ${structure.wordTarget} words`;

    // Editorial hierarchy context
    if (editorialContext) {
        prompt += `

## Editorial Calendar Context
**Annual Theme:** ${editorialContext.annual_theme || 'N/A'}
**Quarterly Pillar:** ${editorialContext.quarterly_pillar || 'N/A'}${editorialContext.pillar_theme ? ` — "${editorialContext.pillar_theme}"` : ''}
**Monthly Theme:** ${editorialContext.monthly_theme || 'N/A'}${editorialContext.monthly_subtitle ? ` — "${editorialContext.monthly_subtitle}"` : ''}
**Series:** ${editorialContext.series_name || 'N/A'}
**Week ${editorialContext.week_number || '?'} of ${editorialContext.year || '2026'}** (Position ${editorialContext.week_position_in_month || '?'} of 4 in month)`;

        if (editorialContext.is_cornerstone) {
            prompt += `
**Role:** This is a FOUNDATION ARTICLE (Cornerstone #${editorialContext.cornerstone_number})${editorialContext.foundation_role ? ` — ${editorialContext.foundation_role}` : ''}
Foundation articles set the philosophical anchor for the month's series. Write with authority and scope — the next 3 articles will extend from this one.`;
        } else if (editorialContext.week_position_in_month === 2) {
            prompt += `
**Role:** EXTENSION 1 — First expansion of the cornerstone article
**Cornerstone:** "${editorialContext.cornerstone_title || 'N/A'}"
Build directly on the cornerstone's thesis. Go deeper on one specific aspect.`;
        } else if (editorialContext.week_position_in_month === 3) {
            prompt += `
**Role:** EXTENSION 2 — Second expansion of the cornerstone article
**Cornerstone:** "${editorialContext.cornerstone_title || 'N/A'}"
Explore a different angle or application of the cornerstone's thesis.`;
        } else if (editorialContext.week_position_in_month === 4) {
            prompt += `
**Role:** PRACTICAL GUIDE — Month's closing article
**Cornerstone:** "${editorialContext.cornerstone_title || 'N/A'}"
Translate the month's themes into actionable steps. This is the "how-to" article.`;
        }

        // Include cornerstone content for series extensions
        if (editorialContext.cornerstone_content && !editorialContext.is_cornerstone) {
            // Truncate to ~2000 chars to manage token budget
            const truncated = editorialContext.cornerstone_content.length > 2000
                ? editorialContext.cornerstone_content.substring(0, 2000) + '\n\n[...truncated for context...]'
                : editorialContext.cornerstone_content;
            prompt += `

## Cornerstone Article Reference
The following is the foundation article this piece extends from. Reference its themes, build on its arguments, and link back to its core ideas:

---
${truncated}
---`;
        }
    }

    // Profile context
    if (profile?.core_thesis) {
        prompt += `\n\n**Core Thesis:** ${profile.core_thesis}`;
    }
    if (profile?.atomic_claim) {
        prompt += `\n**Atomic Claim:** ${profile.atomic_claim}`;
    }

    // Research findings
    if (researchFindings) {
        prompt += `\n\n## Research Findings\n${researchFindings}`;
    }

    // Additional context
    if (additionalContext) {
        prompt += `\n\n## Additional Context\n${additionalContext}`;
    }

    // Structure template
    prompt += `

## Required Article Structure

Follow this structure precisely. Each section has a target word count — stay within range:

${structureTemplate}

## Voice & Style Requirements

Your Voice DNA profile is injected in the system context — follow it precisely:
- Open with a story or vivid memory to establish context
- Follow with insight framed as a guiding principle
- Close sections with a concise moral or actionable takeaway
- Alternate long reflective sentences with short punchy statements
- Use signature concepts: Values-alignment, Human brilliance amplified by AI, Truth versus belief
- Use the rhetorical toolkit: personal storytelling, rhetorical questions, direct address
- NEVER sound like a hype-driven tech evangelist or corporate bureaucrat
- End with the closing signature: "Make today your masterpiece."

Write the complete article now.`;

    return prompt;
}

/**
 * Build the AI-optimized version prompt with full YAML front matter spec.
 *
 * @param {string} articleContent - The human-readable article
 * @param {object|null} editorialContext - From resolveEditorialContext()
 * @param {string} topic - Article topic
 * @returns {string} Prompt for AI optimization
 */
function buildAiOptimizedPrompt(articleContent, editorialContext, topic) {
    const frontMatterFields = [
        'title', 'author: "JB Henderson"', 'date',
        editorialContext ? `pillar: "${editorialContext.quarterly_pillar}"` : null,
        editorialContext ? `monthly_theme: "${editorialContext.monthly_theme}"` : null,
        editorialContext ? `series: "${editorialContext.series_name}"` : null,
        'topics: []', 'key_claim: ""',
        'target_audience: "SME leaders navigating AI adoption"',
        editorialContext?.cornerstone_title ? `cornerstone_ref: "${editorialContext.cornerstone_title}"` : null,
        'content_type: "thought_leadership"',
        'funnel_stage: "awareness"',
        'keywords: []',
        'summary: ""'
    ].filter(Boolean).join('\n  ');

    return `Transform this article into an AI-optimized version for maximum visibility in AI search results and knowledge base retrieval.

## Source Article
${articleContent}

## Required YAML Front Matter
\`\`\`yaml
---
${frontMatterFields}
---
\`\`\`

## Transformation Rules
1. **Self-contained paragraphs** — Each paragraph should be independently meaningful when extracted by an LLM. No dangling references like "As mentioned above."
2. **Inline term definitions** — When using domain-specific terms, define them in context: "Values drift (the gradual divergence between stated organizational values and AI system behavior) represents..."
3. **Context markers** — Add markers before key sections: "Best for: [audience]", "When to use: [scenario]", "Expected outcome: [result]"
4. **Section headers as questions** — Rewrite headers as questions readers would ask: "How do values prevent organizational drift?"
5. **Cross-links** — Reference related content: "See also: [cornerstone article title]" and "Related: [other series articles]"
6. **Author attribution** — Include "According to JB Henderson..." or "Henderson argues that..." at least 3 times for AI citation.
7. **Section summaries** — End each major section with a bold one-sentence summary.
8. **Structured lists** — Convert narrative lists to bulleted/numbered format for LLM extraction.

Output the complete AI-optimized article with YAML front matter.`;
}

/**
 * Build the LinkedIn posts prompt with per-day templates and hashtag strategy.
 *
 * @param {string} articleContent - The article to promote
 * @param {object|null} editorialContext - From resolveEditorialContext()
 * @returns {string} Prompt for LinkedIn Generator
 */
function buildLinkedInPrompt(articleContent, editorialContext) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    // Build per-day specifications
    const daySpecs = days.map(day => {
        const template = LINKEDIN_TEMPLATES[day];
        const brandTags = BRAND_HASHTAG_ROTATION[day];
        const themeTags = editorialContext?.monthly_hashtags || [];
        const quarterTags = editorialContext?.quarterly_hashtags || [];

        // Pick 2-3 theme hashtags (prefer monthly, fall back to quarterly)
        const availableThemeTags = [...new Set([...themeTags, ...quarterTags])];

        return `### ${day.charAt(0).toUpperCase() + day.slice(1)}: ${template.theme}
**Psychology:** ${template.psychology}
**Guidance:** ${template.guidance}
**Template:**
\`\`\`
${template.formula}
\`\`\`
**Brand hashtags for this day:** ${brandTags.join(' ')}
**Theme hashtags to choose from:** ${availableThemeTags.join(', ') || 'Use topic-relevant hashtags'}`;
    }).join('\n\n');

    return `Generate 5 LinkedIn posts for this article — one for each weekday (Monday through Friday).

## Article
${articleContent}

${editorialContext ? `## Editorial Context
**Quarterly Pillar:** ${editorialContext.quarterly_pillar || 'N/A'}
**Monthly Theme:** ${editorialContext.monthly_theme || 'N/A'}
**Series:** ${editorialContext.series_name || 'N/A'}` : ''}

## CRITICAL RULES
- Each post MUST be under 1,300 characters (optimal: 800-1,000)
- Hook line MUST be under 150 characters
- Include exactly 3-5 hashtags per post (brand + theme)
- NO duplicate-meaning hashtags in the same post (e.g., don't use both #AIEthics and #EthicalAI)
- Place hashtags after a separator line (---)
- Never use generic hashtags: #AI, #Technology, #Business, #Success
- Never use off-brand hashtags: #Hustle, #Grind, #Disruption, #GameChanger

## Daily Specifications

${daySpecs}

## Output Format

Return ONLY valid JSON in this exact structure:
{
  "posts": [
    {
      "day": "monday",
      "theme": "insight_launch",
      "content": "Full post text including separator and hashtags",
      "hashtags": ["#Tag1", "#Tag2", "#Tag3"],
      "char_count": 850
    },
    ...for all 5 days
  ]
}`;
}

// ============================================================================
// YAML FRONT MATTER CONSTRUCTION
// ============================================================================

/**
 * Construct YAML front matter programmatically and prepend to AI-optimized content.
 * This ensures front matter is always present and correct — never relying on LLM
 * to produce valid YAML (which fails ~50% of the time).
 *
 * @param {string} aiContent - The LLM-generated AI-optimized article
 * @param {object} params
 * @param {string} params.topic - Article title
 * @param {object|null} params.editorialContext - From resolveEditorialContext()
 * @param {string|null} params.articleContent - Original human-readable article (for keyword extraction)
 * @returns {string} AI-optimized content with guaranteed YAML front matter
 */
function ensureYamlFrontMatter(aiContent, { topic, editorialContext, articleContent }) {
    if (!aiContent) return aiContent;

    // Strip any existing YAML front matter (LLM may have produced partial/malformed)
    let cleanContent = aiContent
        .replace(/^```yaml\s*\n?---[\s\S]*?---\s*\n?```\s*\n?/m, '')
        .replace(/^---\s*\n[\s\S]*?\n---\s*\n?/m, '')
        .trim();

    // Extract a summary from the first paragraph of the clean content
    const firstPara = cleanContent.replace(/^#[^\n]*\n+/, '').split(/\n\n/)[0] || '';
    const summary = firstPara.replace(/\*\*/g, '').replace(/[#*_`]/g, '').substring(0, 200).trim();

    // Build front matter from known data
    const date = editorialContext?.scheduled_date || new Date().toISOString().split('T')[0];
    const pillar = editorialContext?.quarterly_pillar || '';
    const monthlyTheme = editorialContext?.monthly_theme || '';
    const series = editorialContext?.series_name || '';
    const cornerstone = editorialContext?.cornerstone_title || '';

    // Extract topics from article content (simple keyword extraction)
    let topics = [];
    if (articleContent) {
        const words = articleContent.toLowerCase().match(/\b[a-z]{5,}\b/g) || [];
        const freq = {};
        words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
        topics = Object.entries(freq)
            .filter(([w, c]) => c >= 3 && !['their', 'about', 'would', 'could', 'should', 'which', 'there', 'these', 'those', 'other', 'being', 'every', 'after', 'before', 'between', 'through', 'while', 'where', 'still', 'never', 'always'].includes(w))
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([w]) => w);
    }

    const yaml = `---
title: "${topic.replace(/"/g, '\\"')}"
author: "JB Henderson"
date: "${date}"
pillar: "${pillar}"
monthly_theme: "${monthlyTheme}"
series: "${series}"
topics: [${topics.map(t => `"${t}"`).join(', ')}]
key_claim: "${summary.substring(0, 150).replace(/"/g, '\\"')}"
target_audience: "SME leaders navigating AI adoption"
${cornerstone ? `cornerstone_ref: "${cornerstone.replace(/"/g, '\\"')}"` : ''}
content_type: "thought_leadership"
funnel_stage: "awareness"
---`;

    return yaml + '\n\n' + cleanContent;
}

// ============================================================================
// QUALITY GATES
// ============================================================================

/**
 * Run quality gates on generated content.
 *
 * @param {object} params
 * @param {string} params.articleContent - Generated article
 * @param {string} params.format - 'long', 'medium', 'short'
 * @param {string|null} params.aiOptimizedContent - AI-optimized version
 * @param {Array|null} params.linkedinPosts - Array of post objects
 * @param {object|null} params.editorialContext - Editorial context
 * @returns {object} Quality checklist with pass/fail per gate
 */
function runQualityGates({ articleContent, format, aiOptimizedContent, linkedinPosts, editorialContext }) {
    const checklist = {};
    const structure = ARTICLE_STRUCTURES[format] || ARTICLE_STRUCTURES.medium;

    // 1. Format length check
    if (articleContent) {
        const wordCount = articleContent.split(/\s+/).length;
        const targets = {
            long: { min: 1800, max: 2500 },
            medium: { min: 900, max: 1700 },
            short: { min: 400, max: 900 }
        };
        const target = targets[format] || targets.medium;
        checklist.format_length = {
            pass: wordCount >= target.min && wordCount <= target.max,
            detail: `${wordCount} words (target: ${structure.wordTarget})`,
            word_count: wordCount
        };
    }

    // 2. Voice pattern indicators
    if (articleContent) {
        const voiceIndicators = {
            closing_signature: /make today your masterpiece/i.test(articleContent),
            personal_story: /I remember|I recall|years ago|When I was|A moment that/i.test(articleContent),
            rhetorical_question: /\?.*\n/g.test(articleContent),
            direct_address: /\byou\b/i.test(articleContent),
            signature_concepts: /values?.alignment|human brilliance|truth versus belief|pause.*think.*respond/i.test(articleContent)
        };
        const passCount = Object.values(voiceIndicators).filter(Boolean).length;
        checklist.voice_patterns = {
            pass: passCount >= 3,
            detail: `${passCount}/5 voice indicators present`,
            indicators: voiceIndicators
        };
    }

    // 3. Cornerstone link check (for series extensions)
    if (editorialContext && !editorialContext.is_cornerstone && editorialContext.week_position_in_month > 1) {
        if (articleContent && editorialContext.cornerstone_title) {
            checklist.cornerstone_link = {
                pass: editorialContext.cornerstone_content != null,
                detail: editorialContext.cornerstone_content
                    ? `Cornerstone "${editorialContext.cornerstone_title}" was included in context`
                    : `Cornerstone "${editorialContext.cornerstone_title}" content not yet available — article generated without series context`
            };
        }
    } else {
        checklist.cornerstone_link = { pass: true, detail: 'N/A — this is a cornerstone or standalone article' };
    }

    // 4. AI-optimized version checks
    if (aiOptimizedContent) {
        const hasYamlFrontMatter = /^---[\s\S]*?---/.test(aiOptimizedContent);
        const hasAuthorAttribution = (aiOptimizedContent.match(/Henderson|JB Henderson/gi) || []).length >= 2;
        checklist.ai_optimization = {
            pass: hasYamlFrontMatter && hasAuthorAttribution,
            detail: `YAML front matter: ${hasYamlFrontMatter ? 'yes' : 'MISSING'}, Author attributions: ${hasAuthorAttribution ? '2+' : 'insufficient'}`,
            yaml_present: hasYamlFrontMatter,
            author_attributions: hasAuthorAttribution
        };
    }

    // 5. LinkedIn character limits
    if (linkedinPosts && Array.isArray(linkedinPosts) && linkedinPosts.length > 0) {
        const charResults = linkedinPosts.map(post => {
            const content = post.content || '';
            const charCount = content.length;
            return {
                day: post.day,
                char_count: charCount,
                within_limit: charCount <= 1300,
                hashtag_count: (post.hashtags || []).length
            };
        });
        const allWithinLimit = charResults.every(r => r.within_limit);
        const allHaveHashtags = charResults.every(r => r.hashtag_count >= 3 && r.hashtag_count <= 5);
        checklist.linkedin_char_limits = {
            pass: allWithinLimit,
            detail: allWithinLimit ? 'All posts within 1,300 char limit' : 'One or more posts exceed 1,300 characters',
            posts: charResults
        };
        checklist.hashtag_compliance = {
            pass: allHaveHashtags,
            detail: allHaveHashtags ? 'All posts have 3-5 hashtags' : 'One or more posts have incorrect hashtag count',
            posts: charResults
        };
    }

    // 6. Actionable insights check
    if (articleContent) {
        const actionableIndicators = /step \d|how to|action|implement|start by|try this|here.s what|checklist|framework/gi;
        const matches = articleContent.match(actionableIndicators) || [];
        checklist.actionable_insights = {
            pass: matches.length >= 2,
            detail: `${matches.length} actionable indicators found`
        };
    }

    // Overall pass/fail
    const gates = Object.values(checklist);
    const passCount = gates.filter(g => g.pass).length;
    const totalGates = gates.length;

    return {
        overall: passCount === totalGates ? 'PASS' : 'PARTIAL',
        score: `${passCount}/${totalGates}`,
        gates: checklist
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    // Constants (for testing and route access)
    ARTICLE_STRUCTURES,
    LINKEDIN_TEMPLATES,
    BRAND_HASHTAG_ROTATION,
    QUARTERLY_HASHTAGS,
    MONTHLY_HASHTAGS,

    // Core functions
    resolveEditorialContext,
    buildArticlePrompt,
    buildAiOptimizedPrompt,
    buildLinkedInPrompt,
    ensureYamlFrontMatter,
    runQualityGates
};
