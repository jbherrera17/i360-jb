# Research Studio - Technical Guide

**Version:** 1.0.0
**Last Updated:** 2026-01-20

---

## Overview

This technical guide covers the implementation details, API reference, and customization options for the Research Studio module.

---

## Architecture Summary

```
Frontend                    Backend                      Database
────────                    ───────                      ────────
research-studio.html   →    researchStudio.js (routes)   PostgreSQL (Supabase)
research-studio.js     →    researchStudioService.js     Supabase Storage
                       →    sourceProcessor.js
                       →    studioOutputService.js
                       →    audioService.js
                             ↓
                       Anthropic Claude (Chat/Gen)
                       OpenAI (TTS Audio)
```

---

## Database Schema

### Core Tables

```sql
-- Research Studios (Workspaces)
CREATE TABLE research_studios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sources (Documents)
CREATE TABLE studio_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID REFERENCES research_studios(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('pdf','docx','url','text','markdown','csv')),
    content TEXT,
    file_path TEXT,
    file_size INTEGER,
    original_filename TEXT,
    url TEXT,
    metadata JSONB DEFAULT '{}',
    is_selected BOOLEAN DEFAULT true,
    processing_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source Chunks (For retrieval)
CREATE TABLE source_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES studio_sources(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    metadata JSONB DEFAULT '{}'
);

-- Conversations
CREATE TABLE studio_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID REFERENCES research_studios(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE studio_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES studio_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]',
    model_used TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outputs
CREATE TABLE studio_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID REFERENCES research_studios(id) ON DELETE CASCADE,
    output_type TEXT NOT NULL,
    title TEXT,
    content JSONB NOT NULL,
    file_path TEXT,
    model_used TEXT,
    generation_params JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

```sql
CREATE INDEX idx_studio_sources_studio ON studio_sources(studio_id);
CREATE INDEX idx_source_chunks_source ON source_chunks(source_id);
CREATE INDEX idx_studio_messages_conversation ON studio_messages(conversation_id);
CREATE INDEX idx_studio_outputs_studio ON studio_outputs(studio_id);
CREATE INDEX idx_studio_sources_status ON studio_sources(processing_status);
```

---

## API Reference

### Studios

#### List Studios
```
GET /api/research-studios
```
Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "My Research",
      "description": "...",
      "source_count": 5,
      "created_at": "2026-01-20T..."
    }
  ]
}
```

#### Create Studio
```
POST /api/research-studios
```
Body:
```json
{
  "title": "New Studio",
  "description": "Optional description"
}
```

#### Get Studio
```
GET /api/research-studios/:id
```
Returns studio with sources and outputs.

#### Update Studio
```
PUT /api/research-studios/:id
```
Body:
```json
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

#### Delete Studio
```
DELETE /api/research-studios/:id
```

### Sources

#### Add Source (File)
```
POST /api/research-studios/:id/sources
Content-Type: multipart/form-data
```
Form fields:
- `file`: File upload
- `title`: Optional custom title

#### Add Source (URL)
```
POST /api/research-studios/:id/sources
Content-Type: application/json
```
Body:
```json
{
  "url": "https://example.com/article",
  "title": "Optional title"
}
```

#### Add Source (Text)
```
POST /api/research-studios/:id/sources
Content-Type: application/json
```
Body:
```json
{
  "text": "Content to add...",
  "title": "Note Title"
}
```

#### Toggle Source Selection
```
PATCH /api/research-studios/:id/sources/:sourceId
```
Body:
```json
{
  "is_selected": true
}
```

#### Delete Source
```
DELETE /api/research-studios/:id/sources/:sourceId
```

#### Get Download URL
```
GET /api/research-studios/:id/sources/:sourceId/download
```

### Chat

#### Send Message (SSE)
```
POST /api/research-studios/:id/chat
```
Body:
```json
{
  "message": "What are the key findings?",
  "conversation_id": "optional-uuid"
}
```
Response: Server-Sent Events stream

#### Get Suggested Questions
```
GET /api/research-studios/:id/suggested-questions
```
Response:
```json
{
  "success": true,
  "data": {
    "questions": [
      "What are the main themes?",
      "Summarize the key points"
    ]
  }
}
```

### Outputs

#### Generate Output
```
POST /api/research-studios/:id/outputs/:type
```
Types: `report`, `summary`, `flashcards`, `quiz`, `mindmap`, `slides`, `table`, `briefing`, `infographic`, `audio`

Body:
```json
{
  "title": "Optional custom title",
  "options": {
    "count": 10,
    "voice": "nova"
  }
}
```

#### Score Quiz
```
POST /api/research-studios/:id/outputs/:outputId/score
```
Body:
```json
{
  "answers": {
    "1": "B",
    "2": "A",
    "3": "C"
  }
}
```
Response:
```json
{
  "success": true,
  "data": {
    "score": 80,
    "percentage": 80,
    "passed": true,
    "correct_count": 8,
    "total_questions": 10,
    "results": [...]
  }
}
```

#### List Outputs
```
GET /api/research-studios/:id/outputs
```

#### Get Output
```
GET /api/research-studios/:id/outputs/:outputId
```

#### Delete Output
```
DELETE /api/research-studios/:id/outputs/:outputId
```

---

## Service Functions

### researchStudioService.js

```javascript
// Studio CRUD
createStudio(data)
getStudio(id)
listStudios(userId)
updateStudio(id, data)
deleteStudio(id)

// Source management
addSource(studioId, sourceData)
updateSource(sourceId, data)
deleteSource(sourceId)

// Context assembly
assembleSourceContext(studioId, query)
calculateRelevanceScore(content, query)

// Conversations
createConversation(studioId, title)
addMessage(conversationId, role, content, citations)
getMessages(conversationId)

// Outputs
createOutput(studioId, outputData)
getOutput(outputId)
getOutputs(studioId)
deleteOutput(outputId)
```

### sourceProcessor.js

```javascript
// File processing
processSourceFile(file, studioId)
processTextSource(text, studioId, title)
processUrlSource(url, studioId)

// Storage
uploadFile(buffer, path, contentType)
getDownloadUrl(path)
deleteFile(path)

// Text extraction
extractTextFromPdf(buffer)
extractTextFromDocx(buffer)
extractTextFromUrl(url)
```

### studioOutputService.js

```javascript
// Generation
generateOutput(studioId, type, context, options)
saveOutput(studioId, data)

// Quiz scoring
scoreQuiz(quiz, answers)

// Flashcard utilities
getFlashcardsForStudy(output, shuffle)
filterFlashcardsByDifficulty(output, difficulty)
```

### audioService.js

```javascript
// TTS generation
generateSpeech(text, options)
generateLongSpeech(text, options)
generateStudioAudio(studioId, script, options)

// Storage
getAudioUrl(filePath)
deleteAudio(filePath)

// Utilities
splitTextForTTS(text)
estimateDuration(text)
getAvailableVoices()
isAvailable()
```

---

## Output Schemas

### Report
```json
{
  "title": "Report Title",
  "executive_summary": "Summary text...",
  "key_findings": [
    { "finding": "Finding 1", "source_refs": ["Source 1"] }
  ],
  "sections": [
    {
      "heading": "Section Title",
      "content": "Section content...",
      "subsections": [...]
    }
  ],
  "conclusions": ["Conclusion 1", "Conclusion 2"]
}
```

### Flashcards
```json
{
  "title": "Flashcard Set",
  "cards": [
    {
      "id": 1,
      "question": "What is...?",
      "answer": "The answer is...",
      "difficulty": "medium",
      "topic": "Topic",
      "source_hint": "From Source 1"
    }
  ]
}
```

### Quiz
```json
{
  "title": "Knowledge Quiz",
  "passing_score": 70,
  "questions": [
    {
      "id": 1,
      "question": "What is...?",
      "options": [
        { "label": "A", "text": "Option A" },
        { "label": "B", "text": "Option B" }
      ],
      "correct_answer": "B",
      "explanation": "B is correct because...",
      "difficulty": "medium",
      "topic": "Topic"
    }
  ],
  "scoring": {
    "correct_points": 10,
    "total_possible": 100
  }
}
```

### Mind Map
```json
{
  "title": "Mind Map",
  "central_topic": "Main Topic",
  "branches": [
    {
      "id": 1,
      "topic": "Branch 1",
      "color": "#3b82f6",
      "subtopics": [
        {
          "id": 11,
          "topic": "Subtopic",
          "details": ["Detail 1", "Detail 2"]
        }
      ]
    }
  ]
}
```

### Audio
```json
{
  "title": "Audio Overview",
  "duration_estimate": "5 minutes",
  "script": "Full script text...",
  "segments": [
    {
      "name": "Introduction",
      "duration": "30 seconds",
      "text": "Opening text..."
    }
  ],
  "has_audio": true,
  "audio": {
    "file_path": "studio-id/audio_xyz.mp3",
    "signed_url": "https://...",
    "voice_used": "nova"
  }
}
```

---

## Configuration

### Environment Variables

```env
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
ANTHROPIC_API_KEY=your-anthropic-key

# Optional (for audio)
OPENAI_API_KEY=your-openai-key
```

### Storage Buckets

Create in Supabase Dashboard:

1. `studio-sources`
   - Max file size: 52428800 (50MB)
   - Public: false

2. `studio-outputs`
   - Max file size: 104857600 (100MB)
   - Public: false

### Chunking Configuration

In `researchStudioService.js`:
```javascript
const CHUNK_CONFIG = {
    targetSize: 500,    // Target tokens per chunk
    overlap: 50,        // Token overlap between chunks
    maxContextTokens: 100000  // Max tokens for context assembly
};
```

---

## Extending Output Types

### Adding a New Output Type

1. Add configuration to `OUTPUT_CONFIGS` in `studioOutputService.js`:

```javascript
newtype: {
    name: 'New Type',
    description: 'Description',
    maxTokens: 4096,
    systemPrompt: 'System prompt...',
    instruction: 'Generation instruction...',
    format: 'JSON format specification...'
}
```

2. Add rendering function in `research-studio.js`:

```javascript
function renderNewType(content) {
    // Return HTML string
}
```

3. Add to switch statement in `showOutputPreview()`:

```javascript
case 'newtype':
    html = renderNewType(content);
    break;
```

4. Add CSS styles to `research-studio.html`

5. Add button to Studio panel HTML

---

## Troubleshooting

### Source Processing Failures

Check:
- File size within limits
- File type supported
- Supabase Storage permissions
- PDF has extractable text (not scanned images)

### Chat Not Responding

Check:
- `ANTHROPIC_API_KEY` configured
- Sources selected (is_selected = true)
- Source status is 'complete'
- Network connectivity

### Audio Generation Fails

Check:
- `OPENAI_API_KEY` configured
- Script length within limits
- Supabase Storage bucket exists
- Network connectivity

### Performance Issues

Consider:
- Reduce selected sources
- Increase chunk size
- Add caching for context assembly
- Use smaller model for suggestions

---

## Security Considerations

1. **Row Level Security**: All tables have RLS enabled
2. **Input Validation**: File types and sizes validated
3. **URL Sanitization**: URLs checked before fetching
4. **Content Escaping**: All user content escaped in frontend
5. **Signed URLs**: Storage access via time-limited signed URLs
6. **Token Limits**: Context assembly respects token budgets

---

## Related Documentation

- [Architecture Document](../architecture/research-studio-architecture.md)
- [Implementation Guide](../../docs/RESEARCH_STUDIO_IMPLEMENTATION.md)
- [User Guide](./research-studio-user-guide.md)
