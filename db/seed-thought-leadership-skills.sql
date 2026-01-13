-- ============================================================
-- INSIGHT 360 - THOUGHT LEADERSHIP SKILLS
-- Skills for weekly content creation pipeline
-- Version: 1.0 | January 2026
-- Run AFTER: phase5-skills-schema.sql, phase24-thought-leadership-schema.sql
-- ============================================================

-- ============================================================
-- SKILL 1: WEEKLY ARTICLE PACKAGE
-- Complete content package generation
-- ============================================================
INSERT INTO skills (
    id, user_id, name, display_name, description, icon, color,
    category, suite, tags, instructions, output_format,
    required_context_types, optional_context_types, context_token_budget,
    trigger_phrases, conversation_starters, examples, templates,
    version, visibility, status, is_featured
)
VALUES (
    '50000001-0000-4000-a000-000000000401',
    NULL,
    'weekly-article-package',
    'Weekly Article Package',
    'Generates a complete weekly content package: article in 3 formats, AI-optimized version, and 5 LinkedIn posts.',
    'package',
    '#8b5cf6',
    'content',
    'execute',
    ARRAY['thought-leadership', 'content-creation', 'linkedin', 'article'],
    '# Weekly Article Package Skill

You are a thought leadership content generator. When activated, you produce a complete weekly content package consisting of:

1. **Human-Readable Article** in three lengths
2. **AI-Optimized Article** with semantic structure
3. **5 LinkedIn Posts** following the daily theme framework

## REQUIRED CONTEXT

Before generating, ensure you have:
- **Voice DNA**: The author authentic voice profile
- **Topic/Theme**: What the article is about
- **Pillar**: Which content pillar this supports
- **Hashtag Strategy**: Relevant hashtags for the pillar

## ARTICLE GENERATION

### Format Options:

**LONG (2000+ words)**
- Comprehensive treatment
- 5-7 major sections
- Deep examples and evidence
- Suitable for flagship content

**MEDIUM (1000-1500 words)**
- Standard weekly article
- 3-4 major sections
- 1-2 detailed examples
- Best for LinkedIn articles and Substack

**SHORT (500-800 words)**
- Focused single insight
- 2-3 sections
- One punchy example
- Good for quick reads

### Article Structure:
1. **Hook** - Pattern interrupt opening
2. **Context** - Why this matters now
3. **Thesis** - Your clear position
4. **Body Sections** - Supporting arguments with evidence
5. **Practical Application** - What readers can do
6. **Reflection/Close** - Memorable ending

### Writing Standards:
- 2-3 sentence paragraphs maximum
- Bold key phrases sparingly
- Use specific details over generic claims
- Include author voice markers from Voice DNA
- No corporate buzzwords
- Sound human, not AI-generated

## AI-OPTIMIZED VERSION

Transform the article for AI search visibility:

### YAML Front Matter:
```yaml
title: "Article Title"
subtitle: "Compelling subtitle"
author: "Author Name"
date: "YYYY-MM-DD"
pillar: "Content Pillar Name"
topics: ["topic1", "topic2", "topic3"]
key_claim: "One sentence core argument"
target_audience: ["audience1", "audience2"]
```

### Structural Requirements:
- Each paragraph self-contained (can be cited independently)
- Section headers as clear questions
- Key claims in first sentence of each section
- Explicit topic sentences
- Semantic HTML-style markers (## for H2, ### for H3)

## LINKEDIN POST SERIES

Generate 5 posts following daily themes:

### Monday - Insight Launch
- Hook with counterintuitive take
- Introduce week''s big idea
- 150-200 words

### Tuesday - Problem Spotlight
- Relatable scenario
- Diagnose the pain point
- 150-200 words

### Wednesday - Framework Reveal
- Practical how-to
- Numbered steps or principles
- 200-250 words

### Thursday - Story/Example
- Specific narrative
- Concrete details
- 175-225 words

### Friday - Call to Reflect
- Summarize the journey
- Reflective question
- 100-150 words

### Post Standards:
- First line must stop scroll (under 10 words)
- Short paragraphs with white space
- End with engagement question
- 3-5 hashtags at end
- Use author voice consistently

## OUTPUT FORMAT

Deliver as structured markdown with clear section headers:
1. # Long Article
2. # Medium Article
3. # Short Article
4. # AI-Optimized Article
5. # LinkedIn Posts (all 5)',
    'Markdown with structured sections: Long Article, Medium Article, Short Article, AI-Optimized Article, LinkedIn Posts (5)',
    ARRAY['voice_dna'],
    ARRAY['icp', 'content_pillars', 'positioning_framework'],
    12000,
    ARRAY['weekly package', 'article package', 'write weekly content', 'generate content package'],
    ARRAY[
        'Let''s create your weekly thought leadership package',
        'What topic should this week''s content cover?',
        'Ready to generate a complete content package?'
    ],
    '[
        {
            "input": "Write about the importance of human judgment in AI adoption",
            "output": "Generated: Long Article (2300 words), Medium Article (1200 words), Short Article (650 words), AI-Optimized version, 5 LinkedIn posts on the Judgment Gap theme"
        }
    ]'::jsonb,
    '[
        {
            "name": "Article Hook Templates",
            "content": "1. The Contrarian: \"Everyone says X. They''re wrong.\"\n2. The Question: \"What if the problem isn''t X, but Y?\"\n3. The Story: \"Last week, I watched a client...\"\n4. The Prediction: \"In five years, X won''t exist.\"\n5. The Confession: \"I used to believe X. Then...\""
        },
        {
            "name": "LinkedIn Hook Templates",
            "content": "1. Hot take: [bold claim]\n2. Unpopular opinion: [contrarian view]\n3. The biggest mistake I see: [common error]\n4. Stop doing X. Start doing Y.\n5. [Number] years in [field]. Here''s what I learned:"
        }
    ]'::jsonb,
    '1.0.0',
    'public',
    'active',
    true
)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    instructions = EXCLUDED.instructions,
    output_format = EXCLUDED.output_format,
    required_context_types = EXCLUDED.required_context_types,
    optional_context_types = EXCLUDED.optional_context_types,
    trigger_phrases = EXCLUDED.trigger_phrases,
    conversation_starters = EXCLUDED.conversation_starters,
    examples = EXCLUDED.examples,
    templates = EXCLUDED.templates;

-- ============================================================
-- SKILL 2: AI ARTICLE FORMATTER
-- Transform articles for AI optimization
-- ============================================================
INSERT INTO skills (
    id, user_id, name, display_name, description, icon, color,
    category, suite, tags, instructions, output_format,
    required_context_types, optional_context_types, context_token_budget,
    trigger_phrases, conversation_starters, examples, templates,
    version, visibility, status, is_featured
)
VALUES (
    '50000001-0000-4000-a000-000000000402',
    NULL,
    'ai-article-formatter',
    'AI Article Formatter',
    'Transforms existing articles into AI-optimized format with YAML front matter and semantic structure.',
    'wand-2',
    '#3b82f6',
    'content',
    'execute',
    ARRAY['thought-leadership', 'ai-optimization', 'seo'],
    '# AI Article Formatter Skill

You are an AI optimization specialist. Transform human-written articles into a format that maximizes visibility in AI search results and LLM training data.

## PURPOSE

When an article is optimized for AI:
1. It''s more likely to be cited by AI assistants
2. Key claims are more accurately attributed
3. The author builds AI-era thought leadership presence
4. Information is easier for AI to extract and cite

## OPTIMIZATION PROCESS

### Step 1: Add YAML Front Matter

```yaml
---
title: "Clear, Descriptive Title"
subtitle: "Expands on the title with key value proposition"
author: "Full Author Name"
author_credentials: "Title, Company - brief expertise marker"
date: "YYYY-MM-DD"
last_updated: "YYYY-MM-DD"
pillar: "Content Pillar Category"
topics:
  - primary_topic
  - secondary_topic
  - tertiary_topic
key_claim: "The single most important argument in one sentence"
target_audience:
  - "Audience segment 1"
  - "Audience segment 2"
related_concepts:
  - concept1
  - concept2
article_type: "thought_leadership | how_to | case_study | analysis"
reading_time: "X minutes"
---
```

### Step 2: Restructure Content

**Section Headers as Questions**
Transform: "The Problem with AI Adoption"
Into: "## Why Do Most AI Adoption Efforts Fail?"

**Self-Contained Paragraphs**
Each paragraph should:
- Start with a topic sentence containing the key claim
- Include supporting evidence in the middle
- End with implications or applications
- Be quotable on its own without losing meaning

**Explicit Semantic Markers**
- Use ## for major sections (H2)
- Use ### for subsections (H3)
- Use > for key quotes or principles
- Use **bold** for crucial terms
- Use bullet lists for enumerable items

### Step 3: Enhance Citability

**Key Claims Pattern**
```
[Topic sentence with claim]
[Supporting evidence/example]
[Why this matters/what to do about it]
```

**Author Attribution**
Include author perspective markers:
- "According to [Author], ..."
- "[Author] argues that..."
- "As [Author] explains, ..."

### Step 4: Add Section Summaries

At the end of each major section, add:
```
**Section Summary:** [One sentence capturing the key point]
```

### Step 5: Create Structured Conclusion

```
## Key Takeaways

1. **[Point 1]**: Brief explanation
2. **[Point 2]**: Brief explanation
3. **[Point 3]**: Brief explanation

## About the Author

[Author Name] is [credentials]. Their work focuses on [key themes].
Connect with them on [platforms].
```

## OUTPUT REQUIREMENTS

- Maintain the original voice and content
- Preserve all examples and stories
- Keep paragraph length similar
- Add structure without padding
- Ensure every section is independently valuable

## WHAT NOT TO DO

- Don''t change the author''s arguments
- Don''t add information not in the original
- Don''t make the tone more "AI-like"
- Don''t over-optimize with repetitive keywords
- Don''t lose the human, conversational quality',
    'Markdown with YAML front matter, semantic structure, self-contained paragraphs, and citability enhancements',
    ARRAY[]::TEXT[],
    ARRAY['voice_dna'],
    4000,
    ARRAY['ai optimize', 'format for ai', 'optimize article', 'ai format'],
    ARRAY[
        'Paste your article and I''ll optimize it for AI visibility',
        'Want to make your content more discoverable by AI?',
        'Let''s transform your article for the AI search era'
    ],
    '[
        {
            "input": "Here is my article about leadership... [article text]",
            "output": "Transformed article with YAML front matter, restructured sections with question headers, self-contained paragraphs, and citability enhancements"
        }
    ]'::jsonb,
    '[
        {
            "name": "YAML Front Matter Template",
            "content": "---\ntitle: \"\"\nsubtitle: \"\"\nauthor: \"\"\ndate: \"\"\npillar: \"\"\ntopics: []\nkey_claim: \"\"\ntarget_audience: []\n---"
        }
    ]'::jsonb,
    '1.0.0',
    'public',
    'active',
    true
)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    instructions = EXCLUDED.instructions,
    output_format = EXCLUDED.output_format,
    trigger_phrases = EXCLUDED.trigger_phrases,
    conversation_starters = EXCLUDED.conversation_starters;

-- ============================================================
-- SKILL 3: NOTION CALENDAR SYNC
-- Sync content with Notion calendar
-- ============================================================
INSERT INTO skills (
    id, user_id, name, display_name, description, icon, color,
    category, suite, tags, instructions, output_format,
    required_context_types, optional_context_types, context_token_budget,
    trigger_phrases, conversation_starters, examples, templates,
    version, visibility, status, is_featured
)
VALUES (
    '50000001-0000-4000-a000-000000000403',
    NULL,
    'notion-calendar-sync',
    'Notion Calendar Sync',
    'Manages synchronization between generated content and the Notion Content Calendar.',
    'calendar',
    '#10b981',
    'workflow',
    'execute',
    ARRAY['notion', 'calendar', 'sync', 'content-management'],
    '# Notion Calendar Sync Skill

You help manage the synchronization between Insight 360 content generation and the Notion Content Calendar database.

## CAPABILITIES

### 1. Query Calendar
- List upcoming entries by date range
- Filter by pillar, status, or event type
- Find entries needing content generation

### 2. Create Entries
- Add new content calendar entries
- Set properties: date, pillar, status, publishing targets
- Schedule future content

### 3. Update Entries
- Change status as content progresses
- Add generated content to entry pages
- Mark publishing targets complete

### 4. Sync Content
- Push generated articles to Notion pages
- Format content with proper Notion blocks
- Maintain version history

## PROPERTY MAPPING

Local Field → Notion Property:
- title → Name (title)
- scheduled_date → Date (date)
- pillar → Pillar (select)
- event_type → Event Type (select)
- status → Status (select)
- goal → Goal (rich_text)
- monthly_topic → Monthly Topic (rich_text)
- week_number → Week (number)
- publish_substack → Substack (checkbox)
- publish_x → X (checkbox)
- publish_li_page → LI Page (checkbox)
- publish_li_personal → LI-JBH (checkbox)
- publish_website → Website (checkbox)

## WORKFLOW INTEGRATION

### Pre-Generation
1. Query calendar for scheduled entry
2. Verify pillar and topic information
3. Check for existing drafts

### Post-Generation
1. Update entry status to "drafting" or "review"
2. Append generated content to page
3. Add content under appropriate toggles

### Publishing
1. Mark publishing targets as complete
2. Update status to "published"
3. Add published URLs if available

## STATUS PROGRESSION

planned → researching → drafting → review → ready → published

## COMMANDS

When user requests:
- "Show this week''s calendar" → Query entries for current week
- "Create entry for [topic]" → Create new calendar entry
- "Update status to [status]" → Update entry status
- "Sync content to Notion" → Push content to Notion page
- "What''s scheduled for [date]" → Query specific date',
    'JSON responses with Notion page data, or formatted calendar views',
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    2000,
    ARRAY['sync to notion', 'update calendar', 'schedule content', 'notion calendar'],
    ARRAY[
        'What content is scheduled for this week?',
        'Let''s add a new entry to the content calendar',
        'Show me content that needs writing'
    ],
    '[]'::jsonb,
    '[]'::jsonb,
    '1.0.0',
    'public',
    'active',
    false
)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    instructions = EXCLUDED.instructions;

-- ============================================================
-- SKILL FILES: Supporting documentation
-- ============================================================

-- Hashtag Taxonomy
INSERT INTO skill_files (
    id, skill_id, filename, file_type, content, description, sort_order
)
VALUES (
    '5f000001-0000-4000-a000-000000000401',
    '50000001-0000-4000-a000-000000000401',
    'hashtag-taxonomy.md',
    'documentation',
    '# Hashtag Taxonomy for Thought Leadership

## Core Strategy
- Maximum 8-12 hashtags per post
- Mix topic, audience, and branded tags
- Avoid oversaturated hashtags (>1M posts)
- Include 1-2 niche tags for discovery

## Hashtag Categories

### Topic Hashtags (3-4 per post)
Industry/domain specific:
- #AIAdoption
- #DigitalTransformation
- #ThoughtLeadership
- #FutureOfWork
- #AIStrategy
- #LeadershipDevelopment

### Audience Hashtags (2-3 per post)
Target readers:
- #CEOs
- #Founders
- #BusinessOwners
- #SmallBusiness
- #Consultants
- #Coaches

### Branded Hashtags (1-2 per post)
Author-specific:
- #[AuthorName]Insights
- #[CompanyName]

### Engagement Hashtags (1-2 per post)
Platform-aware:
- #LinkedInCreators
- #ContentStrategy
- #PersonalBranding

## Pillar-Specific Recommendations

### Values-Driven Leadership
- #ValuesBasedLeadership
- #EthicalAI
- #PurposeDriven
- #ResponsibleAI

### AI Strategy
- #AIStrategy
- #AITransformation
- #AIForBusiness
- #AIImplementation

### Human-AI Collaboration
- #HumanAI
- #AugmentedIntelligence
- #HumanInTheLoop
- #AIPartnership

### Future of Work
- #FutureOfWork
- #WorkplaceInnovation
- #RemoteWork
- #HybridWork

## Hashtag Research

Check engagement levels:
- Low competition: <10K posts (good for niche)
- Medium: 10K-100K posts (sweet spot)
- High: 100K-1M posts (use selectively)
- Oversaturated: >1M posts (avoid unless very relevant)',
    'Guide for selecting and organizing hashtags by pillar and category',
    1
)
ON CONFLICT (id) DO UPDATE SET
    content = EXCLUDED.content,
    description = EXCLUDED.description;

-- LinkedIn Post Specifications
INSERT INTO skill_files (
    id, skill_id, filename, file_type, content, description, sort_order
)
VALUES (
    '5f000001-0000-4000-a000-000000000402',
    '50000001-0000-4000-a000-000000000401',
    'linkedin-post-specs.md',
    'documentation',
    '# LinkedIn Post Specifications

## Platform Constraints
- Character limit: 3,000 characters
- Optimal length: 1,200-1,500 characters
- First 210 characters show before "see more"
- Images: 1200x1200 or 1200x627 optimal
- Video: Up to 10 minutes

## Hook Formulas (First Line)

### The Contrarian
"Everyone says [common belief]. Here''s why they''re wrong."

### The Confession
"I used to [common mistake]. Then I discovered..."

### The Question
"What if [conventional wisdom] is actually holding you back?"

### The Bold Claim
"[Provocative statement that challenges assumptions]"

### The Story Start
"Last Tuesday, I watched a CEO [specific action]..."

### The Number
"[Number] years in [field]. One lesson changed everything."

## Body Structure

### White Space
- 1-2 sentences per "paragraph"
- Line breaks between ideas
- No walls of text

### Formatting
- Use bold **sparingly** for emphasis
- Numbered lists for frameworks
- Bullet points for examples
- Avoid all caps

### Voice
- First person for personal stories
- Second person ("you") for advice
- Conversational, not formal
- Sound like speaking, not writing

## Call to Action (CTA) Options

### Engagement CTAs
- "What''s your experience with this?"
- "Drop a [emoji] if this resonates"
- "What would you add to this list?"
- "Agree or disagree? I want to hear your take"

### Soft CTAs
- "Follow for more on [topic]"
- "Save this for later"
- "Share with someone who needs this"

### Hard CTAs (use sparingly)
- "Link in comments"
- "DM me for [offer]"
- "Join our newsletter"

## Posting Best Practices

### Timing
- Optimal: Tuesday-Thursday, 8-10am local
- Avoid: Weekends, Monday morning, Friday afternoon
- Consider audience time zones

### Engagement
- Reply to comments within first hour
- Ask follow-up questions
- Thank people for sharing

### Frequency
- 1 post/day maximum
- 3-5 posts/week recommended
- Quality over quantity always

## Daily Theme Quick Reference

| Day | Theme | Purpose | Length |
|-----|-------|---------|--------|
| Mon | Insight Launch | Introduce idea | 150-200 |
| Tue | Problem Spotlight | Show pain | 150-200 |
| Wed | Framework Reveal | Give how-to | 200-250 |
| Thu | Story/Example | Make concrete | 175-225 |
| Fri | Call to Reflect | End with meaning | 100-150 |',
    'Detailed specifications for LinkedIn post creation including hooks, structure, and CTAs',
    2
)
ON CONFLICT (id) DO UPDATE SET
    content = EXCLUDED.content,
    description = EXCLUDED.description;

-- ============================================================
-- LINK SKILLS TO AGENTS
-- ============================================================

-- Link weekly-article-package skill to TL Article Writer
UPDATE agents
SET skill_id = '50000001-0000-4000-a000-000000000401'
WHERE id = 'a0000001-0000-4000-a000-000000000304';

-- Link weekly-article-package skill to TL LinkedIn Generator
UPDATE agents
SET skill_id = '50000001-0000-4000-a000-000000000401'
WHERE id = 'a0000001-0000-4000-a000-000000000305';

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT id, name, display_name, category FROM skills
WHERE category = 'content' OR category = 'workflow'
ORDER BY display_name;
