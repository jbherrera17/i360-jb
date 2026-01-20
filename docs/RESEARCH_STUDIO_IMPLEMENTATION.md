# Research Studio - Implementation & Testing Guide

## Overview

The Research Studio module is a NotebookLM-style feature for Insight 360 that enables users to:
- Upload and manage document sources (PDF, DOCX, TXT, MD, CSV, URLs)
- Chat with AI against their sources with citations
- Generate various outputs (reports, flashcards, audio, etc.)

---

## 1. Database Setup

### Step 1: Create the Schema

Run the SQL migration against your Supabase database:

```bash
# Option A: Using Supabase CLI
supabase db push

# Option B: Using psql directly
psql $DATABASE_URL < db/phase6-research-studio-schema.sql

# Option C: Using Supabase Dashboard
# 1. Go to SQL Editor in Supabase Dashboard
# 2. Paste contents of db/phase6-research-studio-schema.sql
# 3. Click "Run"
```

### Step 2: Verify Tables Created

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%studio%' OR table_name LIKE 'source_chunks';

-- Expected output:
-- research_studios
-- studio_sources
-- source_chunks
-- studio_conversations
-- studio_messages
-- studio_outputs
-- studio_notes
```

### Step 3: Create Storage Buckets

```bash
# Using Supabase CLI or Dashboard, create these buckets:
# 1. studio-sources (for uploaded files)
# 2. studio-outputs (for generated audio/files)

# Or run this SQL in Supabase:
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
    ('studio-sources', 'studio-sources', false, 52428800),
    ('studio-outputs', 'studio-outputs', false, 104857600)
ON CONFLICT (id) DO NOTHING;
```

### Step 4: Seed Data (Optional)

No seed data is required. The system creates default conversations automatically when a studio is created.

For testing, you can create a sample studio:

```sql
-- Create a test studio
INSERT INTO research_studios (id, title, description)
VALUES (
    'test-studio-001',
    'Test Research Studio',
    'Sample studio for testing'
);

-- Create a test source
INSERT INTO studio_sources (studio_id, title, source_type, content, is_selected, processing_status)
VALUES (
    'test-studio-001',
    'Sample Document',
    'text',
    'This is sample content for testing the Research Studio. It contains information about AI systems, machine learning, and natural language processing. The document discusses various approaches to building intelligent systems.',
    true,
    'complete'
);
```

---

## 2. Environment Configuration

Add these to your `.env` file (if not already present):

```env
# Required - Already configured for Insight 360
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
ANTHROPIC_API_KEY=your_anthropic_key

# Optional - For OpenAI model support
OPENAI_API_KEY=your_openai_key
```

---

## 3. Install Dependencies

The Research Studio uses these packages (already in package.json for Insight 360):

```bash
# Verify these are installed:
npm ls mammoth pdf-parse @supabase/supabase-js @anthropic-ai/sdk

# If jsdom or readability are missing (for URL scraping):
npm install jsdom @mozilla/readability
```

---

## 4. Start the Server

```bash
cd insight-360
npm run dev  # Development with auto-reload
# or
npm start    # Production
```

Verify the routes are registered:
```
✅ Research Studio routes registered (Phase 6)
```

---

## 5. Automated Test Plan

### Unit Tests

Create `__tests__/unit/services/researchStudioService.test.js`:

```javascript
const {
    createStudio,
    addSource,
    assembleSourceContext,
    splitIntoChunks
} = require('../../../server/services/researchStudioService');

describe('Research Studio Service', () => {
    describe('splitIntoChunks', () => {
        test('should split content into chunks of target size', () => {
            const content = 'Paragraph one.\n\nParagraph two.\n\nParagraph three.';
            const chunks = splitIntoChunks(content, 10);
            expect(chunks.length).toBeGreaterThan(0);
            expect(chunks[0]).toHaveProperty('content');
            expect(chunks[0]).toHaveProperty('token_count');
        });
    });

    describe('calculateRelevanceScore', () => {
        // Import the function
        test('should return higher score for matching keywords', () => {
            const content = 'Machine learning is a subset of artificial intelligence';
            const query = 'what is machine learning';
            // Score should be > 50 for relevant content
        });
    });
});
```

### Integration Tests

Create `__tests__/integration/routes/researchStudio.test.js`:

```javascript
const request = require('supertest');
const app = require('../../../server/index');

describe('Research Studio API', () => {
    let studioId;

    describe('POST /api/research-studios', () => {
        test('should create a new studio', async () => {
            const res = await request(app)
                .post('/api/research-studios')
                .send({ title: 'Test Studio', description: 'Test description' });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('id');
            studioId = res.body.data.id;
        });
    });

    describe('GET /api/research-studios', () => {
        test('should list studios', async () => {
            const res = await request(app).get('/api/research-studios');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('POST /api/research-studios/:id/sources', () => {
        test('should add text source', async () => {
            const res = await request(app)
                .post(`/api/research-studios/${studioId}/sources`)
                .send({
                    text: 'Sample content for testing',
                    title: 'Test Source'
                });

            expect(res.status).toBe(201);
            expect(res.body.data.source_type).toBe('text');
        });
    });

    describe('GET /api/research-studios/:id/suggested-questions', () => {
        test('should return suggested questions', async () => {
            const res = await request(app)
                .get(`/api/research-studios/${studioId}/suggested-questions`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('questions');
        });
    });
});
```

### Run Tests

```bash
npm test -- --testPathPattern=researchStudio
```

---

## 6. Manual Test Plan

### Test Case 1: Studio CRUD Operations

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/research-studio` | See studio list page |
| 2 | Click "New Studio" | Modal appears |
| 3 | Enter title "My Research" | Title field populated |
| 4 | Click "Create Studio" | Studio created, redirected to studio view |
| 5 | Edit title in header | Title updates on blur |
| 6 | Click "All Studios" | Return to list, see new studio |

### Test Case 2: Source Upload

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create/open a studio | Studio view loads |
| 2 | Click "Add source" | Modal with 3 tabs appears |
| 3 | Upload a PDF file | File processes, appears in source list |
| 4 | Add URL source | URL content extracted, appears in list |
| 5 | Add text source | Text saved, appears in list |
| 6 | Toggle source checkbox | Selection updates |
| 7 | Delete a source | Source removed from list |

### Test Case 3: Chat with Citations

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select at least one source | Context info shows "1 source selected" |
| 2 | Type "What is the main topic?" | Send button enabled |
| 3 | Press Enter or click Send | User message appears, typing indicator shows |
| 4 | Wait for response | Response streams in with [Source N] citations |
| 5 | Observe citations section | Source titles with quotes appear below message |
| 6 | Click inline [1] badge | Corresponding source highlights in left panel |
| 7 | Click suggested follow-up | Question fills input, sends |

### Test Case 4: Output Generation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | With sources selected, click "Report" | Button shows "Generating..." |
| 2 | Wait for completion | Report appears in "Generated Outputs" section |
| 3 | Click the output | Preview modal shows report content |
| 4 | Generate "Flashcards" | Flashcard output with Q&A pairs |
| 5 | Generate "Quiz" | Quiz with multiple choice questions |

### Test Case 5: Error Handling

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try to chat with no sources selected | Alert: "Please select at least one source" |
| 2 | Upload unsupported file type | Error message about supported types |
| 3 | Generate output with no sources | Alert about needing sources |

---

## 7. API Endpoint Reference

### Studios
- `GET /api/research-studios` - List all studios
- `POST /api/research-studios` - Create studio
- `GET /api/research-studios/:id` - Get studio details
- `PUT /api/research-studios/:id` - Update studio
- `DELETE /api/research-studios/:id` - Delete studio

### Sources
- `POST /api/research-studios/:id/sources` - Add source (file/URL/text)
- `GET /api/research-studios/:id/sources/:sid` - Get source details
- `PATCH /api/research-studios/:id/sources/:sid` - Toggle selection
- `DELETE /api/research-studios/:id/sources/:sid` - Delete source
- `GET /api/research-studios/:id/sources/:sid/download` - Get download URL

### Chat
- `GET /api/research-studios/:id/suggested-questions` - Get AI-suggested questions
- `POST /api/research-studios/:id/chat` - Send message (SSE streaming)
- `GET /api/research-studios/:id/conversations` - List conversations
- `GET /api/research-studios/:id/conversations/:cid/messages` - Get messages

### Outputs
- `POST /api/research-studios/:id/outputs/:type` - Generate output
- `GET /api/research-studios/:id/outputs` - List outputs
- `GET /api/research-studios/:id/outputs/:oid` - Get output
- `DELETE /api/research-studios/:id/outputs/:oid` - Delete output

---

## 8. Troubleshooting

### Common Issues

**Routes not registered:**
- Check server console for error messages
- Verify `researchStudioRoutes` import in `server/index.js`

**Database errors:**
- Ensure schema migration ran successfully
- Check RLS policies if using Supabase auth

**File upload fails:**
- Verify storage buckets exist
- Check file size limits (50MB for sources)
- Ensure MIME type is supported

**Chat not streaming:**
- Check ANTHROPIC_API_KEY is set
- Verify SSE headers aren't being compressed (check compression middleware)

**Citations not appearing:**
- Ensure sources are selected (is_selected = true)
- Check that sources have processing_status = 'complete'

**Audio generation fails:**
- Ensure OPENAI_API_KEY is configured
- Check that the studio-outputs storage bucket exists
- Verify script is not too long (max 25,000 characters)

---

## 9. Files Reference

### Backend
| File | Purpose |
|------|---------|
| `db/phase6-research-studio-schema.sql` | Database schema |
| `server/routes/researchStudio.js` | API endpoints |
| `server/services/researchStudioService.js` | Core business logic |
| `server/services/sourceProcessor.js` | File processing |
| `server/services/studioOutputService.js` | Output generation |
| `server/services/audioService.js` | OpenAI TTS integration |

### Frontend
| File | Purpose |
|------|---------|
| `public/research-studio.html` | Main UI page |
| `public/js/research-studio.js` | Frontend logic |

### Documentation
| File | Purpose |
|------|---------|
| `documentation/architecture/research-studio-architecture.md` | Architecture overview |
| `documentation/guides/research-studio-user-guide.md` | User guide |
| `documentation/guides/research-studio-technical-guide.md` | Technical guide |

---

## 10. Implementation Phases Summary

### Phase 1: Foundation (Complete)
- Database schema with 7 tables
- CRUD operations for studios and sources
- File processing (PDF, DOCX, TXT, MD, CSV)
- Supabase Storage integration
- Basic three-panel UI

### Phase 2: Chat with Citations (Complete)
- Source-grounded chat with SSE streaming
- Citation extraction with source quotes
- Inline citation badges with source highlighting
- Suggested questions endpoint
- Follow-up question generation

### Phase 3: Text Outputs (Complete)
- Dedicated studioOutputService.js
- Reports & summaries with sections
- Flashcards with flip interaction
- Interactive quiz with scoring
- Mind map structure
- Data tables
- Executive briefings

### Phase 4: Advanced Outputs (Complete)
- Audio overview with OpenAI TTS
- Infographic structure
- Slide deck outlines

### Phase 5: Polish & Integration (Complete)
- Modal service integration
- Help registry connection
- Navigation panel integration
- Info button with help modal
- User and technical guides
- Architecture documentation
