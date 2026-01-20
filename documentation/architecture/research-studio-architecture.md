# Research Studio - Architecture Document

**Version:** 1.0.0
**Module:** Research Studio (Phase 6)
**Last Updated:** 2026-01-20

---

## Overview

The Research Studio is a NotebookLM-style feature for Insight 360 that enables users to:
- Upload and manage document sources (PDF, DOCX, TXT, MD, CSV, URLs)
- Chat with AI against their sources with citations
- Generate various outputs (reports, flashcards, audio, etc.)

This document provides a comprehensive technical overview of the architecture, data models, and integration patterns.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           RESEARCH STUDIO                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────────┐    ┌─────────────────────┐    │
│  │   FRONTEND   │    │    BACKEND API    │    │    DATA LAYER       │    │
│  │              │    │                    │    │                     │    │
│  │ research-    │───▶│ researchStudio.js │───▶│ PostgreSQL (Supabase)│   │
│  │ studio.html  │    │ (Express Routes)  │    │                     │    │
│  │              │◀───│                    │◀───│ • research_studios  │    │
│  │ research-    │    ├──────────────────┤    │ • studio_sources    │    │
│  │ studio.js    │    │                    │    │ • source_chunks     │    │
│  │              │    │ SERVICES:          │    │ • studio_messages   │    │
│  └──────────────┘    │ • researchStudio   │    │ • studio_outputs    │    │
│                      │ • sourceProcessor  │    │                     │    │
│                      │ • studioOutput     │    │ Supabase Storage:   │    │
│                      │                    │    │ • studio-sources    │    │
│                      └──────────────────┘    │ • studio-outputs    │    │
│                              │                └─────────────────────┘    │
│                              │                                            │
│                              ▼                                            │
│                      ┌──────────────────┐                                │
│                      │   EXTERNAL APIs   │                                │
│                      │                    │                                │
│                      │ • Anthropic Claude │                                │
│                      │ • OpenAI (TTS)     │                                │
│                      └──────────────────┘                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Tables

#### `research_studios`
Main table for research workspaces.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner (FK to users) |
| title | TEXT | Studio name |
| description | TEXT | Optional description |
| settings | JSONB | User preferences |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last modification |

#### `studio_sources`
Documents and content sources.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| studio_id | UUID | Parent studio (FK) |
| title | TEXT | Source title |
| source_type | TEXT | 'pdf', 'docx', 'url', 'text', 'markdown', 'csv' |
| content | TEXT | Extracted text content |
| file_path | TEXT | Supabase Storage path |
| file_size | INTEGER | Original file size |
| original_filename | TEXT | Original upload name |
| url | TEXT | Source URL (for url type) |
| metadata | JSONB | Additional info |
| is_selected | BOOLEAN | Include in context |
| processing_status | TEXT | 'pending', 'processing', 'complete', 'error' |
| created_at | TIMESTAMPTZ | Upload timestamp |

#### `source_chunks`
Chunked content for retrieval.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| source_id | UUID | Parent source (FK) |
| chunk_index | INTEGER | Position in source |
| content | TEXT | Chunk text |
| token_count | INTEGER | Estimated tokens |
| metadata | JSONB | Position info |

#### `studio_conversations`
Chat conversation containers.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| studio_id | UUID | Parent studio (FK) |
| title | TEXT | Conversation title |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last activity |

#### `studio_messages`
Chat messages with citations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | Parent conversation (FK) |
| role | TEXT | 'user' or 'assistant' |
| content | TEXT | Message text |
| citations | JSONB | Source references |
| model_used | TEXT | LLM model ID |
| created_at | TIMESTAMPTZ | Message time |

#### `studio_outputs`
Generated content outputs.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| studio_id | UUID | Parent studio (FK) |
| output_type | TEXT | 'report', 'flashcards', 'quiz', etc. |
| title | TEXT | Output title |
| content | JSONB | Structured content |
| file_path | TEXT | For audio files |
| model_used | TEXT | LLM model ID |
| generation_params | JSONB | Options used |
| status | TEXT | 'pending', 'generating', 'complete', 'error' |
| created_at | TIMESTAMPTZ | Generation time |

#### `studio_notes`
User notes and annotations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| studio_id | UUID | Parent studio (FK) |
| source_id | UUID | Optional source link |
| content | TEXT | Note content |
| position | JSONB | Location info |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last edit |

---

## Backend Services

### `researchStudioService.js`

Core business logic for CRUD operations and context assembly.

**Key Functions:**
- `createStudio(data)` - Create new research studio
- `getStudio(id)` - Get studio with sources
- `listStudios(userId)` - List user's studios
- `addSource(studioId, sourceData)` - Add source to studio
- `assembleSourceContext(studioId, query)` - Build context for AI
- `calculateRelevanceScore(content, query)` - Score chunk relevance

**Context Assembly Algorithm:**
1. Fetch all selected sources
2. Split content into chunks (~500 tokens each)
3. Score chunks by relevance to query
4. Sort and select top chunks within token budget
5. Include source metadata for citation

### `sourceProcessor.js`

File processing and storage integration.

**Supported Formats:**
| Format | Library | Notes |
|--------|---------|-------|
| PDF | pdf-parse | Text extraction |
| DOCX | mammoth | HTML/text conversion |
| TXT/MD | Native | Direct text |
| CSV | Native | Parsed to text |
| URL | jsdom + readability | Web scraping |

**Processing Pipeline:**
1. Validate file type and size
2. Upload original to Supabase Storage
3. Extract text content
4. Split into chunks
5. Store chunks with metadata
6. Update source status

### `studioOutputService.js`

Dedicated service for all output generation.

**Output Types:**
| Type | Description | Schema |
|------|-------------|--------|
| report | Comprehensive analysis | title, executive_summary, sections, conclusions |
| summary | Brief overview | title, overview, key_points, takeaways |
| flashcards | Q&A study cards | cards[{question, answer, difficulty}] |
| quiz | Multiple choice | questions[{question, options, correct_answer}] |
| mindmap | Concept hierarchy | central_topic, branches[{topic, subtopics}] |
| slides | Presentation outline | slides[{title, bullet_points, notes}] |
| table | Structured data | columns, rows, notes |
| briefing | Executive brief | situation, insights, risks, recommendations |
| infographic | Visual data | stats, sections, chart_data |
| audio | Podcast script | script, segments, voice_instructions |

**Quiz Scoring:**
```javascript
scoreQuiz(quiz, answers) → {
    score: number,
    percentage: number,
    passed: boolean,
    results: [{question_id, is_correct, explanation}],
    summary: {by_topic: {...}, by_difficulty: {...}}
}
```

---

## API Endpoints

### Studios
```
GET    /api/research-studios              List all studios
POST   /api/research-studios              Create studio
GET    /api/research-studios/:id          Get studio details
PUT    /api/research-studios/:id          Update studio
DELETE /api/research-studios/:id          Delete studio
```

### Sources
```
POST   /api/research-studios/:id/sources              Add source
GET    /api/research-studios/:id/sources/:sid         Get source
PATCH  /api/research-studios/:id/sources/:sid         Toggle selection
DELETE /api/research-studios/:id/sources/:sid         Delete source
GET    /api/research-studios/:id/sources/:sid/download Download URL
```

### Chat
```
GET    /api/research-studios/:id/suggested-questions  AI questions
POST   /api/research-studios/:id/chat                 Chat (SSE)
GET    /api/research-studios/:id/conversations        List conversations
GET    /api/research-studios/:id/conversations/:cid/messages Get messages
```

### Outputs
```
POST   /api/research-studios/:id/outputs/:type       Generate output
POST   /api/research-studios/:id/outputs/:oid/score  Score quiz
GET    /api/research-studios/:id/outputs             List outputs
GET    /api/research-studios/:id/outputs/:oid        Get output
DELETE /api/research-studios/:id/outputs/:oid        Delete output
```

---

## Frontend Architecture

### Three-Panel Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                     Header: Title + Actions                      │
├──────────────┬──────────────────────────────┬───────────────────┤
│   SOURCES    │           CHAT               │      STUDIO       │
│   (280px)    │         (flex: 1)            │     (300px)       │
│              │                              │                   │
│ ☑ source1    │  User: What is...?           │ [Audio] [Report]  │
│ ☑ source2    │                              │ [Cards] [Quiz]    │
│              │  AI: Based on [1]...         │ [Map] [Info]      │
│              │                              │ [Slides] [Table]  │
│              │  Citations:                  │                   │
│              │  [1] source1, "quote..."     │ Generated:        │
│              │                              │ - Report (Jan 20) │
│ [Add Source] │  [Type question...]          │ - Quiz (Jan 20)   │
└──────────────┴──────────────────────────────┴───────────────────┘
```

### State Management

```javascript
// Global state
let currentStudio = null;      // Active studio object
let currentSources = [];       // Loaded sources
let currentOutputs = [];       // Generated outputs
let currentQuiz = null;        // For quiz interactions
let quizAnswers = {};          // User quiz answers
let currentFlashcardIndex = 0; // Flashcard navigation
```

### Key UI Components

1. **Source List** - Checkbox selection, type icons, delete
2. **Chat Interface** - Messages, citations, follow-up questions
3. **Output Buttons** - 8 output type generators
4. **Output Preview** - Type-specific rendering
5. **Interactive Quiz** - Form submission, scoring, feedback
6. **Flashcard Viewer** - Flip animation, navigation

---

## Integration Points

### Modal Service
- Connected via `modal-service/loader.js`
- Uses `ModalService.content()` for help fallback
- Output modals use custom implementation for flexibility

### Help Registry
- Registered at `/research-studio` path
- Links to `/api/docs/research-studio-user-guide.md`
- Info button in header triggers `openHelp()`

### Navigation Panel
- Added to "Tools" group in `navigation.js`
- Icon: `book-open-text`
- Label: "Research Studio"

### Supabase Storage
- Bucket: `studio-sources` (50MB limit)
- Bucket: `studio-outputs` (100MB limit, for audio)
- Signed URLs for downloads

---

## Security Considerations

### Row Level Security (RLS)
- All tables have RLS enabled
- Policies restrict access to owner's data
- Service role bypasses for server operations

### Input Validation
- File type whitelist
- Size limits enforced
- URL sanitization
- Content escaping in frontend

### API Security
- Protected routes require authentication
- Rate limiting on generation endpoints
- Token budget prevents context overflow

---

## Performance Optimizations

### Chunking Strategy
- Target: ~500 tokens per chunk
- Paragraph boundary detection
- Overlap for context continuity

### Relevance Scoring
- Keyword extraction from query
- TF-IDF inspired scoring
- Top-K selection within budget

### Streaming
- SSE for chat responses
- Progressive token delivery
- Cancelable requests

---

## Future Enhancements

### Planned
- [ ] Vector embeddings for semantic search
- [ ] Audio generation with OpenAI TTS
- [ ] PDF/DOCX export for outputs
- [ ] Collaborative studios (multi-user)
- [ ] Agent integration (studios as context)

### Potential
- [ ] Version history for sources
- [ ] Annotation system
- [ ] Custom output templates
- [ ] Batch processing

---

## File Reference

| Path | Purpose |
|------|---------|
| `db/phase6-research-studio-schema.sql` | Database schema |
| `server/routes/researchStudio.js` | API endpoints |
| `server/services/researchStudioService.js` | Core business logic |
| `server/services/sourceProcessor.js` | File processing |
| `server/services/studioOutputService.js` | Output generation |
| `public/research-studio.html` | Main UI |
| `public/js/research-studio.js` | Frontend logic |
| `docs/RESEARCH_STUDIO_IMPLEMENTATION.md` | Setup guide |

---

## Changelog

### v1.0.0 (2026-01-20)
- Initial implementation
- Phase 1: Foundation (CRUD, sources, storage)
- Phase 2: Chat with citations
- Phase 3: Text outputs (reports, flashcards, quiz, mindmap)
