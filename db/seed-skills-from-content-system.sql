-- ============================================
-- Insight 360 - Skills Import from Content Creation System
-- Version: 1.0.0
-- Date: January 2026
-- Description: Imports core skills from Content Creation System
-- ============================================

-- ============================================
-- SKILL 1: AI Article Formatter
-- ============================================
INSERT INTO skills (
    id,
    user_id,
    name,
    display_name,
    description,
    icon,
    color,
    category,
    suite,
    tags,
    instructions,
    output_format,
    required_context_types,
    optional_context_types,
    context_token_budget,
    trigger_phrases,
    conversation_starters,
    examples,
    templates,
    version,
    visibility,
    status,
    is_featured,
    is_workflow_skill,
    produces_context_type
) VALUES (
    'a1b2c3d4-0002-4000-8000-000000000001',
    NULL,
    'ai-article-formatter',
    'AI Article Formatter',
    'Formats articles for AI-optimized retrieval using structured metadata, semantic sections, and self-contained content blocks. Use when writing articles, formatting content for knowledge base, organizing long-form content.',
    'file-text',
    '#3b82f6',
    'content',
    'execute',
    ARRAY['article', 'formatting', 'ai-optimization', 'knowledge-base', 'content-structure', 'metadata'],
    E'# AI-Optimized Article Formatter

Structures articles to maximize AI retrieval accuracy, semantic understanding, and context preservation.

## When to Use This Skill

Activate when:
- Writing new articles for knowledge base
- Reformatting existing content for better AI retrieval
- User says "format this article", "optimize for AI", or "structure this content"
- Creating content that will be referenced by AI systems
- Organizing long-form content into searchable sections

## Core Principles

1. **Self-contained chunks**: Each section/paragraph should make sense independently
2. **Rich metadata**: Front matter that enables filtering and context
3. **Semantic clarity**: Clear headings that signal content type
4. **Explicit definitions**: Define terms inline for isolated retrieval
5. **Hierarchical structure**: Logical H1 > H2 > H3 > H4 progression

## Article Formatting Process

### Step 1: Add Front Matter Metadata

Every article MUST start with YAML front matter:

```yaml
---
title: "Descriptive Article Title"
date: YYYY-MM-DD
tags: [primary-topic, secondary-topic, content-type]
audience: target-audience-segment
topic: main-subject-area
content_type: article|guide|framework|case-study|template
status: draft|published|archived
summary: "One-sentence description of what this article covers"
keywords: [searchable, terms, concepts, phrases]
funnel_stage: awareness|consideration|decision
---
```

### Step 2: Structure with Semantic Sections

Use consistent section headers that signal content type:

```markdown
# Article Title (H1 - only one)

## Overview
[2-3 sentences: What this article covers and who it''s for]

## The Problem
[Self-contained description of the pain point or challenge]

## Why This Matters
[Context, stakes, impact - standalone explanation]

## The Solution/Framework
[Your approach, methodology, or system]

## Implementation
[Step-by-step actionable guidance]

## Real Examples
[Concrete cases with context, numbers, outcomes]

## Key Takeaways
- **Takeaway 1**: Full explanation with rationale
- **Takeaway 2**: Complete thought with context
```

### Step 3: Write Self-Contained Paragraphs

Each paragraph must include enough context to stand alone.

**Formula**: Context + Concept + Evidence/Rationale + Application

### Step 4: Define Key Terms Inline

Use parenthetical definitions for specialized terms:

```markdown
We use a **tripwire offer** (low-cost product under $50 designed to convert
leads to customers) to reduce purchase resistance.
```

### Step 5: Add Context Markers

```markdown
**Best for**: Online course creators with 1,000+ email subscribers
**When to use**: During launch phase or re-engagement campaigns
**Expected outcome**: 15-20% conversion rate
```

### Step 6: Structure Lists for Maximum Value

Make each list item independently useful with full context.

### Step 7: Add Examples with Full Context

Every example needs:
- **Situation**: Who, what, when
- **Approach**: What they did and why
- **Results**: Concrete outcomes with numbers
- **Lesson**: What this teaches

## Quality Checklist

Before finalizing, verify:

**Structure**:
- [ ] Front matter includes all relevant metadata
- [ ] Only one H1 (title)
- [ ] Logical heading hierarchy (no skipped levels)
- [ ] Semantic section names

**Content**:
- [ ] Each paragraph is self-contained
- [ ] Key terms defined inline on first use
- [ ] Examples include full context and results
- [ ] Lists are descriptive, not just keywords

**AI Optimization**:
- [ ] No ambiguous references ("this", "it", "above")
- [ ] Context markers added
- [ ] Related content is linked
- [ ] Version/update date is current',
    E'## Output Format

The skill produces a formatted article with:
- YAML front matter with metadata
- Semantic section structure
- Self-contained paragraphs
- Inline definitions
- Context markers
- Version history',
    ARRAY[]::TEXT[],
    ARRAY['voice_dna', 'brand_guidelines', 'icp']::TEXT[],
    8000,
    ARRAY['format article', 'optimize for ai', 'structure content', 'article formatter', 'knowledge base format'],
    ARRAY['Help me format this article for AI optimization', 'Structure this content for the knowledge base', 'Optimize this article for retrieval'],
    '[]'::JSONB,
    '[]'::JSONB,
    '1.0.0',
    'public',
    'active',
    true,
    true,
    NULL
)
ON CONFLICT (user_id, name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    instructions = EXCLUDED.instructions,
    updated_at = NOW();

-- ============================================
-- SKILL 2: Weekly Article Package
-- ============================================
INSERT INTO skills (
    id,
    user_id,
    name,
    display_name,
    description,
    icon,
    color,
    category,
    suite,
    tags,
    instructions,
    output_format,
    required_context_types,
    optional_context_types,
    context_token_budget,
    trigger_phrases,
    conversation_starters,
    examples,
    templates,
    version,
    visibility,
    status,
    is_featured,
    is_workflow_skill
) VALUES (
    'a1b2c3d4-0003-4000-8000-000000000001',
    NULL,
    'weekly-article-package',
    'Weekly Article Package',
    'Produces complete weekly content packages including article in two formats (human-readable and AI-optimized) plus 5 LinkedIn posts for promotion.',
    'package',
    '#10b981',
    'content',
    'execute',
    ARRAY['article', 'linkedin', 'content-package', 'social-media', 'thought-leadership'],
    E'# Weekly Article Package Generator

Produces complete content packages for editorial calendar. Each package includes the article in two formats plus 5 daily LinkedIn posts to promote it.

## When to Use This Skill

Activate when:
- User has written or wants to write an article
- User asks for "LinkedIn posts for this article"
- User mentions "weekly package" or "content package"
- User is preparing weekly content for publication
- User wants to promote an article across the week

## Package Components

| Component | Purpose | Format |
|-----------|---------|--------|
| **Article (Human-Readable)** | Blog/website publication | Markdown with narrative flow |
| **Article (AI-Optimized)** | Knowledge base, LLM retrieval | Structured per ai-article-formatter skill |
| **5 LinkedIn Posts** | Daily promotion (Mon-Fri) | Platform-optimized with hashtags |

## Workflow

### Step 1: Load Context (REQUIRED)

Before generating any content, load:
1. **Voice DNA** - Brand voice and tone guidelines
2. **Brand Guidelines** - Colors, typography, visual identity
3. **Editorial Calendar** - Context for the article

### Step 2: Identify Article Context

Determine:
- **Quarterly Pillar** or theme
- **Series** (if applicable)
- **Format** (Long-form 2,000+, Medium 1,000-1,500, Short 500-800)

### Step 3: Generate Human-Readable Article

**Long-form (2,000+ words):**
```
Opening Story/Hook (200-300 words)
The Problem/Context (300-400 words)
Core Framework/Argument (600-800 words)
Application/Implementation (300-400 words)
Examples/Evidence (200-300 words)
Implications/Call to Reflection (200-300 words)
Closing Insight (100-150 words)
```

**Medium (1,000-1,500 words):**
```
Opening Hook (100-150 words)
The Challenge (200-250 words)
The Framework/Solution (400-500 words)
Practical Application (200-300 words)
Key Takeaway (100-150 words)
```

**Short (500-800 words):**
```
Hook (50-75 words)
Core Insight (250-350 words)
Application (150-200 words)
Closing Punch (50-75 words)
```

### Step 4: Generate AI-Optimized Version

Apply the **ai-article-formatter** skill to create a structured version.

### Step 5: Generate 5 LinkedIn Posts

Create one post for each weekday:

| Day | Theme | Approach |
|-----|-------|----------|
| **Monday** | Insight Launch | Lead with the core insight |
| **Tuesday** | Problem Spotlight | Highlight the pain point |
| **Wednesday** | Framework Reveal | Share a key framework |
| **Thursday** | Story/Example | Personal story or case study |
| **Friday** | Call to Reflect | Philosophical question |

**LinkedIn Post Structure:**
```
[Hook - 1-2 sentences]

[Body - 3-5 sentences]

[Bridge to article]

[Call to action]

---

[Hashtags - 3-5 max]
```

**Character Guidelines:**
- Total post: 1,300 characters maximum
- Hook: Under 150 characters
- Hashtags: 3-5 per post

## Output Format

```markdown
# Weekly Package: [Article Title]
**Week [#] | [Month] [Year] | [Theme]**

---

## Article (Human-Readable)
[Full article]

---

## Article (AI-Optimized)
[Structured version with front matter]

---

## LinkedIn Posts

### Monday: Insight Launch
[Post content]
#Hashtag1 #Hashtag2 #Hashtag3

### Tuesday: Problem Spotlight
[Post content]

### Wednesday: Framework Reveal
[Post content]

### Thursday: Story/Example
[Post content]

### Friday: Call to Reflect
[Post content]

---

## Publishing Checklist
- [ ] Article published
- [ ] AI-optimized version saved
- [ ] All 5 posts scheduled
```',
    E'Delivers complete weekly package with article in two formats and 5 LinkedIn posts.',
    ARRAY['voice_dna']::TEXT[],
    ARRAY['brand_guidelines', 'icp', 'editorial_calendar']::TEXT[],
    12000,
    ARRAY['weekly package', 'article package', 'linkedin posts for article', 'content package', 'promote article'],
    ARRAY['Create a weekly content package for this article', 'Generate LinkedIn posts to promote this article', 'Build a full weekly package'],
    '[]'::JSONB,
    '[]'::JSONB,
    '1.0.0',
    'public',
    'active',
    true,
    true
)
ON CONFLICT (user_id, name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    instructions = EXCLUDED.instructions,
    updated_at = NOW();

-- ============================================
-- SKILL 3: DOCX Creator
-- ============================================
INSERT INTO skills (
    id,
    user_id,
    name,
    display_name,
    description,
    icon,
    color,
    category,
    suite,
    tags,
    instructions,
    output_format,
    required_context_types,
    optional_context_types,
    context_token_budget,
    trigger_phrases,
    conversation_starters,
    version,
    visibility,
    status,
    is_featured,
    is_workflow_skill
) VALUES (
    'a1b2c3d4-0004-4000-8000-000000000001',
    NULL,
    'docx-creator',
    'Document Creator (DOCX)',
    'Comprehensive document creation, editing, and analysis with support for tracked changes, comments, formatting preservation, and text extraction.',
    'file-text',
    '#2563eb',
    'workflow',
    'execute',
    ARRAY['document', 'docx', 'word', 'tracked-changes', 'editing', 'formatting'],
    E'# DOCX Creation, Editing, and Analysis

A user may ask you to create, edit, or analyze the contents of a .docx file. A .docx file is essentially a ZIP archive containing XML files and other resources.

## Workflow Decision Tree

### Reading/Analyzing Content
Use text extraction or raw XML access

### Creating New Document
Use document creation workflow with docx-js library

### Editing Existing Document
- **Your own document + simple changes**: Basic OOXML editing
- **Someone else''s document**: Redlining workflow (recommended)
- **Legal, academic, business, or government docs**: Redlining workflow (required)

## Reading and Analyzing Content

### Text Extraction
Convert document to markdown using pandoc:
```bash
pandoc --track-changes=all path-to-file.docx -o output.md
```

### Raw XML Access
For comments, complex formatting, document structure, embedded media, and metadata.

#### Key File Structures
* `word/document.xml` - Main document contents
* `word/comments.xml` - Comments
* `word/media/` - Embedded images and media files
* Tracked changes use `<w:ins>` (insertions) and `<w:del>` (deletions) tags

## Creating a New Word Document

Use docx-js library for document creation:
1. Create a JavaScript/TypeScript file using Document, Paragraph, TextRun components
2. Export as .docx using Packer.toBuffer()

## Editing an Existing Document

Use the Document library (Python) for OOXML manipulation:
1. Unpack: `python ooxml/scripts/unpack.py <file> <output_dir>`
2. Create and run Python script using Document library
3. Pack: `python ooxml/scripts/pack.py <input_dir> <file>`

## Redlining Workflow

For tracked changes in professional documents:

1. **Get markdown representation**:
   ```bash
   pandoc --track-changes=all path-to-file.docx -o current.md
   ```

2. **Identify and group changes**: Organize into batches of 3-10 changes

3. **Implement changes**: Use Document library with tracked change patterns

4. **Pack the document**: Convert back to .docx

5. **Final verification**: Verify all changes applied correctly

## Converting Documents to Images

```bash
soffice --headless --convert-to pdf document.docx
pdftoppm -jpeg -r 150 document.pdf page
```',
    E'Creates or edits Microsoft Word documents (.docx) with proper formatting, tracked changes, and professional structure.',
    ARRAY[]::TEXT[],
    ARRAY['brand_guidelines', 'voice_dna']::TEXT[],
    4000,
    ARRAY['create document', 'word document', 'docx', 'edit document', 'tracked changes'],
    ARRAY['Create a Word document', 'Help me edit this DOCX file', 'Add tracked changes to this document'],
    '1.0.0',
    'public',
    'active',
    true,
    true
)
ON CONFLICT (user_id, name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    instructions = EXCLUDED.instructions,
    updated_at = NOW();

-- ============================================
-- SKILL 4: PPTX Creator
-- ============================================
INSERT INTO skills (
    id,
    user_id,
    name,
    display_name,
    description,
    icon,
    color,
    category,
    suite,
    tags,
    instructions,
    output_format,
    required_context_types,
    optional_context_types,
    context_token_budget,
    trigger_phrases,
    conversation_starters,
    version,
    visibility,
    status,
    is_featured,
    is_workflow_skill
) VALUES (
    'a1b2c3d4-0005-4000-8000-000000000001',
    NULL,
    'pptx-creator',
    'Presentation Creator (PPTX)',
    'Presentation creation, editing, and analysis. Create new presentations, modify content, work with layouts, add speaker notes.',
    'presentation',
    '#f59e0b',
    'workflow',
    'execute',
    ARRAY['presentation', 'pptx', 'powerpoint', 'slides', 'deck'],
    E'# PPTX Creation, Editing, and Analysis

Create, edit, or analyze PowerPoint presentations (.pptx files).

## Design Principles

**CRITICAL**: Before creating any presentation:
1. **Consider the subject matter**: What tone, industry, or mood?
2. **Check for branding**: Company brand colors and identity
3. **Match palette to content**: Select colors that reflect the subject
4. **State your approach**: Explain design choices before writing code

**Requirements**:
- Use web-safe fonts: Arial, Helvetica, Times New Roman, Georgia, Verdana, Tahoma
- Create clear visual hierarchy
- Ensure readability: strong contrast, appropriate text size
- Be consistent across slides

## Color Palette Options

1. **Classic Blue**: Deep navy (#1C2833), slate (#2E4053), silver (#AAB7B8)
2. **Teal & Coral**: Teal (#5EA8A7), coral (#FE4447), white
3. **Warm Blush**: Mauve (#A49393), blush (#EED6D3), rose (#E8B4B8)
4. **Black & Gold**: Gold (#BF9A4A), black (#000000), cream
5. **Sage & Terracotta**: Sage (#87A96B), terracotta (#E07A5F), charcoal

## Layout Tips

**For slides with charts or tables:**
- **Two-column layout (PREFERRED)**: Header spanning full width, then two columns
- **Full-slide layout**: Let featured content take entire slide
- **NEVER vertically stack**: Don''t place charts below text in single column

## Creating New Presentations

### Without Template (html2pptx workflow):
1. Create HTML file for each slide with proper dimensions (720pt × 405pt for 16:9)
2. Convert HTML to PowerPoint using html2pptx.js
3. Visual validation: Generate thumbnails and inspect for issues

### With Template:
1. Extract template text and create thumbnail grid
2. Analyze template and save inventory
3. Create presentation outline based on template inventory
4. Duplicate/reorder slides using rearrange.py
5. Extract text using inventory.py
6. Generate replacement text and save to JSON
7. Apply replacements using replace.py

## Editing Existing Presentations

1. Unpack: `python ooxml/scripts/unpack.py <file> <output_dir>`
2. Edit XML files (primarily ppt/slides/slide{N}.xml)
3. Validate after each edit
4. Pack: `python ooxml/scripts/pack.py <input_dir> <file>`

## Creating Thumbnail Grids

```bash
python scripts/thumbnail.py template.pptx [output_prefix]
```

Features:
- Creates thumbnails.jpg (or multiple for large decks)
- Default: 5 columns, max 30 slides per grid
- Slides are zero-indexed',
    E'Creates or edits PowerPoint presentations (.pptx) with professional design, layouts, and formatting.',
    ARRAY[]::TEXT[],
    ARRAY['brand_guidelines', 'voice_dna']::TEXT[],
    4000,
    ARRAY['create presentation', 'powerpoint', 'pptx', 'slides', 'deck', 'make presentation'],
    ARRAY['Create a PowerPoint presentation', 'Help me design a slide deck', 'Edit this presentation'],
    '1.0.0',
    'public',
    'active',
    true,
    true
)
ON CONFLICT (user_id, name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    instructions = EXCLUDED.instructions,
    updated_at = NOW();

-- ============================================
-- SKILL 5: Research & Analysis (Perplexity)
-- ============================================
INSERT INTO skills (
    id,
    user_id,
    name,
    display_name,
    description,
    icon,
    color,
    category,
    suite,
    tags,
    instructions,
    output_format,
    required_context_types,
    optional_context_types,
    context_token_budget,
    trigger_phrases,
    conversation_starters,
    version,
    visibility,
    status,
    is_featured,
    is_workflow_skill,
    research_enabled,
    research_provider
) VALUES (
    'a1b2c3d4-0006-4000-8000-000000000001',
    NULL,
    'deep-research',
    'Deep Research',
    'Conducts comprehensive research using web search to gather current information, analyze trends, and compile insights with citations.',
    'search',
    '#6366f1',
    'research',
    'execute',
    ARRAY['research', 'analysis', 'trends', 'market-research', 'competitive-analysis'],
    E'# Deep Research Skill

Conducts comprehensive research using web search capabilities to gather current, accurate information.

## When to Use This Skill

Activate when:
- User needs current market data or trends
- Competitive analysis is required
- Topic requires up-to-date information
- User asks for research on a subject
- Content needs to be grounded in current facts

## Research Process

### Step 1: Clarify Research Scope
- What specific questions need answering?
- What time range is relevant (last month, year, 5 years)?
- What sources are most credible for this topic?
- What format should the output take?

### Step 2: Conduct Systematic Search
- Start with broad queries to understand the landscape
- Narrow down to specific sub-topics
- Look for primary sources when possible
- Cross-reference multiple sources

### Step 3: Synthesize Findings
- Organize information by theme or question
- Note areas of consensus and disagreement
- Identify gaps in available information
- Highlight most credible/authoritative sources

### Step 4: Structure Output

```markdown
# Research Report: [Topic]

## Executive Summary
[2-3 paragraphs summarizing key findings]

## Key Findings

### Finding 1: [Title]
[Detailed explanation with citations]

### Finding 2: [Title]
[Detailed explanation with citations]

## Data & Statistics
- Statistic 1 [Source, Date]
- Statistic 2 [Source, Date]

## Expert Perspectives
[Quotes or viewpoints from authorities]

## Trends & Implications
[What the research suggests for the future]

## Sources
1. [Full citation]
2. [Full citation]

## Research Methodology
[How the research was conducted]
```

## Quality Standards

- All claims must be attributed to sources
- Distinguish between facts and interpretations
- Note the date of information
- Flag any conflicting information
- Be transparent about limitations',
    E'Produces structured research reports with citations, analysis, and actionable insights.',
    ARRAY[]::TEXT[],
    ARRAY['icp', 'company_description']::TEXT[],
    6000,
    ARRAY['research', 'analyze', 'find out about', 'what are the trends', 'competitive analysis', 'market research'],
    ARRAY['Research the current state of [topic]', 'Analyze the competitive landscape for [industry]', 'Find the latest trends in [area]'],
    '1.0.0',
    'public',
    'active',
    true,
    true,
    true,
    'perplexity'
)
ON CONFLICT (user_id, name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    instructions = EXCLUDED.instructions,
    research_enabled = true,
    research_provider = 'perplexity',
    updated_at = NOW();

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    skill_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO skill_count FROM skills WHERE user_id IS NULL;

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'SKILLS IMPORT COMPLETE';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'System Skills Imported: %', skill_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Skills:';
    RAISE NOTICE '  1. brand-guidelines-generator - Create brand guidelines context';
    RAISE NOTICE '  2. ai-article-formatter - Format articles for AI retrieval';
    RAISE NOTICE '  3. weekly-article-package - Full weekly content package';
    RAISE NOTICE '  4. docx-creator - Word document creation/editing';
    RAISE NOTICE '  5. pptx-creator - PowerPoint presentation creation';
    RAISE NOTICE '  6. deep-research - Web research with Perplexity';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
