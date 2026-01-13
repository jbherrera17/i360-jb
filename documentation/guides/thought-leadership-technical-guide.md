# Thought Leadership System Technical Guide

## Overview

The Thought Leadership (TL) module in Insight 360 (Phase 24) provides a comprehensive content creation system for building authority through consistent, AI-assisted content generation. It integrates specialized AI agents, workflow automation, and Notion calendar sync.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                THOUGHT LEADERSHIP MODULE (Phase 24)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │    Frontend      │  │    API Layer     │  │   Database Layer     │  │
│  │                  │  │                  │  │                      │  │
│  │ thought-         │──│ /api/thought-    │──│ thought_leadership_  │  │
│  │ leadership.html  │  │ leadership/*     │  │   profiles           │  │
│  │                  │  │                  │  │ content_pillars      │  │
│  │ workflow-run     │  │                  │  │ ai_visibility_       │  │
│  │ .html (TL flows) │  │                  │  │   research           │  │
│  │                  │  │                  │  │ content_calendar_    │  │
│  │                  │  │                  │  │   entries            │  │
│  │                  │  │                  │  │ thought_leadership_  │  │
│  │                  │  │                  │  │   outputs            │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                       TL AGENTS (5)                                 ││
│  │  Strategy Architect | Visibility Researcher | Pillar Designer |    ││
│  │  Article Writer | LinkedIn Generator                                ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                    INTEGRATIONS                                     ││
│  │  Workflows | Notion Sync | Context Assets | Skills                 ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### Content Generation Flow

```
                    ┌─────────────────────┐
                    │   Topic Selection   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    Research Phase   │
                    │ (Visibility Agent)  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Article Generation │
                    │  (Article Writer)   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                                 ▼
        ┌───────────┐                    ┌───────────┐
        │Human-Style│                    │AI-Optimized│
        │  Article  │                    │  Article   │
        └─────┬─────┘                    └─────┬─────┘
              │                                │
              └────────────────┬───────────────┘
                               │
                    ┌──────────▼──────────┐
                    │ LinkedIn Generation │
                    │ (LinkedIn Generator)│
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  5 Daily Posts      │
                    │  Mon-Fri Sequence   │
                    └───────────────────────
```

## Database Schema

### Core Tables

#### thought_leadership_profiles
User's TL configuration and thesis.

```sql
CREATE TABLE thought_leadership_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Positioning
    core_thesis TEXT,              -- Main argument/position
    atomic_claim TEXT,             -- Single-sentence claim
    positioning_framework JSONB,   -- Full positioning structure

    -- Integration
    notion_database_id TEXT,       -- Notion content calendar ID
    default_publish_targets TEXT[] DEFAULT ARRAY['linkedin', 'website'],
    weekly_publish_day TEXT DEFAULT 'monday',

    -- Status
    status TEXT DEFAULT 'setup'
        CHECK (status IN ('setup', 'active', 'paused')),
    setup_completed BOOLEAN DEFAULT false,
    setup_step INTEGER DEFAULT 0,
    setup_data JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);
```

#### content_pillars
User's content pillar definitions.

```sql
CREATE TABLE content_pillars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES thought_leadership_profiles(id) ON DELETE CASCADE,

    -- Identity
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'bookmark',
    color TEXT DEFAULT '#3b82f6',

    -- Content Planning
    quarterly_focus TEXT[] DEFAULT '{}',
    monthly_themes JSONB DEFAULT '{}',
    key_topics TEXT[] DEFAULT '{}',
    hashtags TEXT[] DEFAULT '{}',
    sample_titles TEXT[] DEFAULT '{}',

    -- Notion Integration
    notion_pillar_value TEXT,

    -- Management
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### ai_visibility_research
AI visibility check results.

```sql
CREATE TABLE ai_visibility_research (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES thought_leadership_profiles(id) ON DELETE CASCADE,

    -- Research Type
    research_type TEXT NOT NULL
        CHECK (research_type IN ('personal', 'competitor', 'topic', 'industry')),
    subject_name TEXT NOT NULL,

    -- Results
    visibility_score INTEGER,
    key_findings TEXT[] DEFAULT '{}',
    topics_found TEXT[] DEFAULT '{}',
    recommended_actions TEXT[] DEFAULT '{}',

    -- Raw Data
    prompts_used TEXT[] DEFAULT '{}',
    raw_responses JSONB DEFAULT '{}',
    research_source TEXT DEFAULT 'perplexity',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### content_calendar_entries
Content calendar with Notion sync.

```sql
CREATE TABLE content_calendar_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES thought_leadership_profiles(id) ON DELETE CASCADE,

    -- Content Identity
    title TEXT NOT NULL,
    pillar TEXT,
    topic TEXT,

    -- Scheduling
    scheduled_date DATE NOT NULL,
    publish_time TIME,

    -- Status
    status TEXT DEFAULT 'idea'
        CHECK (status IN ('idea', 'researching', 'drafting', 'review', 'ready', 'published')),

    -- Content Storage
    article_markdown TEXT,
    article_ai_optimized TEXT,
    linkedin_posts JSONB DEFAULT '[]',

    -- Notion Sync
    notion_page_id TEXT,
    notion_url TEXT,
    notion_last_edited TIMESTAMP WITH TIME ZONE,
    sync_status TEXT DEFAULT 'local_only'
        CHECK (sync_status IN ('local_only', 'pending', 'synced', 'conflict')),
    last_synced_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### thought_leadership_outputs
Generated content versions.

```sql
CREATE TABLE thought_leadership_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calendar_entry_id UUID REFERENCES content_calendar_entries(id) ON DELETE CASCADE,

    -- Output Type
    output_type TEXT NOT NULL
        CHECK (output_type IN (
            'article_human', 'article_ai',
            'linkedin_insight', 'linkedin_problem', 'linkedin_framework',
            'linkedin_story', 'linkedin_reflection', 'linkedin_series'
        )),

    -- Content
    title TEXT,
    content TEXT NOT NULL,
    content_format TEXT DEFAULT 'markdown'
        CHECK (content_format IN ('markdown', 'html', 'json')),

    -- For LinkedIn posts
    post_day TEXT,
    post_theme TEXT,

    -- Generation Metadata
    model_used TEXT,
    tokens_used INTEGER,
    generation_time_ms INTEGER,
    context_assets_used UUID[] DEFAULT '{}',
    skill_used UUID,

    -- Versioning
    version INTEGER DEFAULT 1,
    is_current BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## TL Agents

### Agent IDs

```javascript
const TL_AGENTS = {
    STRATEGY_ARCHITECT: 'a0000001-0000-4000-a000-000000000301',
    VISIBILITY_RESEARCHER: 'a0000001-0000-4000-a000-000000000302',
    PILLAR_DESIGNER: 'a0000001-0000-4000-a000-000000000303',
    ARTICLE_WRITER: 'a0000001-0000-4000-a000-000000000304',
    LINKEDIN_GENERATOR: 'a0000001-0000-4000-a000-000000000305'
};
```

### Agent Capabilities

| Agent | Purpose | Model | Tools |
|-------|---------|-------|-------|
| **TL Strategy Architect** | Positioning and niche discovery | claude-3-5-sonnet | Context injection |
| **AI Visibility Researcher** | AI search visibility analysis | claude-3-5-sonnet | Web search (Perplexity) |
| **Content Pillar Designer** | Pillar structure and themes | claude-3-5-sonnet | Context injection |
| **TL Article Writer** | Long-form article generation | claude-3-5-sonnet | Voice DNA context |
| **TL LinkedIn Generator** | Social post generation | claude-3-5-sonnet | Article context |

## API Endpoints

### Base URL: `/api/thought-leadership`

#### Profile Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get user's TL profile |
| POST | `/profile` | Create/update TL profile |
| PUT | `/profile/setup-step` | Update setup progress |
| GET | `/profile/status` | Get profile and setup status |

#### Content Pillars

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pillars` | List all pillars |
| POST | `/pillars` | Create new pillar |
| PUT | `/pillars/:id` | Update pillar |
| DELETE | `/pillars/:id` | Soft delete pillar |

#### AI Visibility

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/visibility/research` | Create visibility research |
| GET | `/visibility/history` | Get research history |
| GET | `/visibility/latest` | Get latest scores |

#### Content Calendar

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/calendar` | Get calendar entries (Notion or local) |
| POST | `/calendar` | Create calendar entry |
| PUT | `/calendar/:id` | Update calendar entry |
| DELETE | `/calendar/:id` | Delete calendar entry |
| POST | `/calendar/:id/sync` | Sync single entry with Notion |
| POST | `/calendar/sync-all` | Sync all pending entries |

#### Content Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate/research` | Research a topic |
| POST | `/generate/article` | Generate article |
| POST | `/generate/linkedin` | Generate LinkedIn posts |
| POST | `/generate/package` | Generate complete weekly package |

#### Outputs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/outputs` | Get generated outputs |
| POST | `/outputs` | Save generated output |

### Request/Response Examples

#### Generate Article

```javascript
// POST /api/thought-leadership/generate/article
{
    "topic": "Why AI-Native Companies Will Dominate",
    "pillar_id": "uuid...",
    "format": "medium",
    "calendar_entry_id": "uuid...",
    "research_findings": "Recent data shows..."
}

// Response
{
    "success": true,
    "article": "# Why AI-Native Companies Will Dominate\n\n...",
    "metadata": {
        "topic": "Why AI-Native Companies Will Dominate",
        "format": "medium",
        "pillar": "AI Strategy",
        "execution_id": "uuid...",
        "model": "claude-3-5-sonnet-20241022",
        "tokens_used": 2500,
        "duration_ms": 8500,
        "saved_output_id": "uuid..."
    }
}
```

#### Generate LinkedIn Posts

```javascript
// POST /api/thought-leadership/generate/linkedin
{
    "article_content": "# Article Title\n\n...",
    "calendar_entry_id": "uuid...",
    "pillar_id": "uuid..."
}

// Response
{
    "success": true,
    "posts": [
        {
            "day": "monday",
            "theme": "insight_launch",
            "content": "Most businesses treat AI as a tool...",
            "hashtags": ["#AI", "#Leadership", "#Strategy"]
        },
        // ... 4 more posts
    ],
    "metadata": {
        "post_count": 5,
        "execution_id": "uuid...",
        "tokens_used": 1800,
        "duration_ms": 5200
    }
}
```

#### Generate Complete Package

```javascript
// POST /api/thought-leadership/generate/package
{
    "topic": "The Future of Values-Based AI",
    "pillar_id": "uuid...",
    "calendar_entry_id": "uuid...",
    "format": "long",
    "research_findings": "Recent developments..."
}

// Response
{
    "success": true,
    "package": {
        "article": "# The Future of Values-Based AI\n\n...",
        "article_ai_optimized": "---\ntitle: The Future...\n---\n\n...",
        "linkedin_posts": [
            { "day": "monday", "theme": "insight_launch", "content": "..." },
            // ... 4 more
        ]
    },
    "metadata": {
        "topic": "The Future of Values-Based AI",
        "format": "long",
        "pillar": "AI Ethics",
        "total_duration_ms": 25000,
        "steps_completed": 3,
        "saved_outputs": [
            { "type": "article_human", "id": "uuid..." },
            { "type": "article_ai", "id": "uuid..." },
            { "type": "linkedin_series", "id": "uuid..." }
        ]
    }
}
```

## Notion Integration

### Configuration

Set environment variables:
```
NOTION_API_KEY=secret_xxx
NOTION_CONTENT_CALENDAR_DB=database_id
```

### Sync Status Values

| Status | Description |
|--------|-------------|
| `local_only` | Entry exists only locally, no Notion sync |
| `pending` | Entry modified locally, sync needed |
| `synced` | Entry in sync with Notion |
| `conflict` | Local and Notion versions differ |

### Sync Flow

```
Local Entry Created
       │
       ▼
[sync_to_notion: true?]──No──► local_only
       │
      Yes
       │
       ▼
Create in Notion
       │
       ▼
Store notion_page_id
       │
       ▼
Status: synced
```

## Workflows

### Niche Discovery Workflow (12 Steps)

1. Expertise inventory
2. Unique angle identification
3. Competitive landscape analysis
4. ICP deep-dive
5. Pain point mapping
6. Thesis drafting
7. Atomic claim formulation
8. Pillar proposal
9. Content format preferences
10. Visibility baseline
11. Goal setting
12. Strategy document generation

### Weekly Pipeline Workflow (8 Steps)

1. Topic selection from pillars
2. Research phase
3. Outline creation
4. Article draft
5. AI optimization
6. LinkedIn generation
7. Review and editing
8. Scheduling

## Frontend Integration

### Key JavaScript Functions

```javascript
// Initialize TL page
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    loadPillars();
    renderCalendar();
});

// Load profile
async function loadProfile() {
    const result = await fetchAPI('/profile');
    profile = result.data;
    // Update UI
}

// Generate content
async function generateArticle(topic, pillarId) {
    const result = await fetch('/api/thought-leadership/generate/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, pillar_id: pillarId })
    });
    return result.json();
}

// Sync calendar
async function syncCalendar() {
    await fetchAPI('/calendar/sync-all', { method: 'POST' });
    loadCalendarEntries();
}
```

## Security

### Row Level Security (RLS)

All TL tables have RLS enabled:

```sql
-- Users can only see their own profiles
CREATE POLICY "Users can view own TL profile" ON thought_leadership_profiles
    FOR SELECT USING (user_id = auth.uid());

-- Users can only modify their own data
CREATE POLICY "Users can modify own pillars" ON content_pillars
    FOR ALL USING (user_id = auth.uid());
```

### Data Privacy

- Content outputs are user-scoped
- Notion sync uses user's own API credentials
- No cross-user data access

## Performance Considerations

- **Streaming**: Article generation supports streaming for real-time feedback
- **Caching**: Profile and pillar data cached on frontend
- **Batch Generation**: Package endpoint generates all content in sequence
- **Token Budgets**: LLM calls respect configured token limits

## Migration & Setup

### Run Database Migrations

```bash
# Apply Phase 24 schema
psql $DATABASE_URL -f db/phase24-thought-leadership-schema.sql

# Seed TL agents
psql $DATABASE_URL -f db/seed-thought-leadership-agents.sql

# Seed workflows
psql $DATABASE_URL -f db/seed-tl-niche-discovery-workflow.sql
psql $DATABASE_URL -f db/seed-tl-weekly-pipeline-workflow.sql

# Seed skills
psql $DATABASE_URL -f db/seed-thought-leadership-skills.sql
```

### Verify Installation

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'thought_leadership%' OR table_name LIKE 'content_%';

-- Verify agents
SELECT name, model FROM agents WHERE name LIKE 'TL%';

-- Check workflows
SELECT name, suite FROM workflows WHERE suite = 'thought-leadership';
```

## Monitoring

### Key Metrics

- Content generation success rate
- Average generation time per content type
- Notion sync success rate
- Token usage per generation

### Logging

```javascript
console.log(`[TL Package] Step 1: Generating article for topic "${topic}"`);
console.log(`[TL Package] Complete in ${totalDuration}ms with ${results.errors.length} errors`);
```
