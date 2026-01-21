-- Phase 6: Research Studio Schema
-- NotebookLM-style research and content synthesis module
-- Created: 2025-01-19

-- =====================================================
-- RESEARCH STUDIOS (Core notebook/workspace)
-- =====================================================
CREATE TABLE IF NOT EXISTS research_studios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{
        "default_model": "claude-sonnet-4-20250514",
        "chunk_size": 500,
        "citation_style": "numbered"
    }',
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_research_studio_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER research_studios_updated_at
    BEFORE UPDATE ON research_studios
    FOR EACH ROW
    EXECUTE FUNCTION update_research_studio_timestamp();

-- =====================================================
-- STUDIO SOURCES (Documents/URLs/Text)
-- =====================================================
CREATE TABLE IF NOT EXISTS studio_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES research_studios(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'docx', 'txt', 'markdown', 'url', 'text', 'csv')),
    content TEXT, -- Extracted text content
    file_path TEXT, -- Supabase Storage path for original file
    file_name TEXT, -- Original filename
    file_size INTEGER, -- Size in bytes
    mime_type TEXT,
    url TEXT, -- For URL sources
    metadata JSONB DEFAULT '{}', -- page_count, word_count, author, etc.
    is_selected BOOLEAN DEFAULT true, -- Include in queries
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'complete', 'error')),
    processing_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER studio_sources_updated_at
    BEFORE UPDATE ON studio_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_research_studio_timestamp();

-- =====================================================
-- SOURCE CHUNKS (For retrieval/context assembly)
-- =====================================================
CREATE TABLE IF NOT EXISTS source_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES studio_sources(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    metadata JSONB DEFAULT '{}', -- page_number, section_heading, start_char, end_char
    -- NOTE: embedding column removed - requires pgvector extension
    -- To enable semantic search in the future, run: CREATE EXTENSION IF NOT EXISTS vector;
    -- Then add: embedding VECTOR(1536)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STUDIO CONVERSATIONS (Chat threads)
-- =====================================================
CREATE TABLE IF NOT EXISTS studio_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES research_studios(id) ON DELETE CASCADE,
    title TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER studio_conversations_updated_at
    BEFORE UPDATE ON studio_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_research_studio_timestamp();

-- =====================================================
-- STUDIO MESSAGES (Chat messages with citations)
-- =====================================================
CREATE TABLE IF NOT EXISTS studio_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES studio_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]', -- [{source_id, chunk_id, quote, page_number}]
    model_used TEXT,
    token_count INTEGER,
    latency_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STUDIO OUTPUTS (Generated content)
-- =====================================================
CREATE TABLE IF NOT EXISTS studio_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES research_studios(id) ON DELETE CASCADE,
    output_type TEXT NOT NULL CHECK (output_type IN (
        'report', 'summary', 'audio', 'flashcards', 'quiz',
        'mindmap', 'infographic', 'slides', 'table', 'briefing'
    )),
    title TEXT,
    content JSONB NOT NULL, -- Structured output data
    file_path TEXT, -- For audio/binary outputs in Supabase Storage
    file_size INTEGER,
    mime_type TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'complete', 'error')),
    error_message TEXT,
    model_used TEXT,
    generation_params JSONB DEFAULT '{}', -- Voice, style, length preferences
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER studio_outputs_updated_at
    BEFORE UPDATE ON studio_outputs
    FOR EACH ROW
    EXECUTE FUNCTION update_research_studio_timestamp();

-- =====================================================
-- STUDIO NOTES (User notes/annotations)
-- =====================================================
CREATE TABLE IF NOT EXISTS studio_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES research_studios(id) ON DELETE CASCADE,
    source_id UUID REFERENCES studio_sources(id) ON DELETE SET NULL,
    title TEXT,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER studio_notes_updated_at
    BEFORE UPDATE ON studio_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_research_studio_timestamp();

-- =====================================================
-- INDEXES
-- =====================================================

-- Research Studios
CREATE INDEX IF NOT EXISTS idx_research_studios_user ON research_studios(user_id);
CREATE INDEX IF NOT EXISTS idx_research_studios_created ON research_studios(created_at DESC);

-- Studio Sources
CREATE INDEX IF NOT EXISTS idx_studio_sources_studio ON studio_sources(studio_id);
CREATE INDEX IF NOT EXISTS idx_studio_sources_type ON studio_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_studio_sources_selected ON studio_sources(studio_id, is_selected) WHERE is_selected = true;

-- Source Chunks
CREATE INDEX IF NOT EXISTS idx_source_chunks_source ON source_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_source_chunks_source_index ON source_chunks(source_id, chunk_index);

-- Conversations
CREATE INDEX IF NOT EXISTS idx_studio_conversations_studio ON studio_conversations(studio_id);
CREATE INDEX IF NOT EXISTS idx_studio_conversations_active ON studio_conversations(studio_id) WHERE is_active = true;

-- Messages
CREATE INDEX IF NOT EXISTS idx_studio_messages_conversation ON studio_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_studio_messages_created ON studio_messages(conversation_id, created_at);

-- Outputs
CREATE INDEX IF NOT EXISTS idx_studio_outputs_studio ON studio_outputs(studio_id);
CREATE INDEX IF NOT EXISTS idx_studio_outputs_type ON studio_outputs(studio_id, output_type);
CREATE INDEX IF NOT EXISTS idx_studio_outputs_status ON studio_outputs(status) WHERE status != 'complete';

-- Notes
CREATE INDEX IF NOT EXISTS idx_studio_notes_studio ON studio_notes(studio_id);
CREATE INDEX IF NOT EXISTS idx_studio_notes_source ON studio_notes(source_id) WHERE source_id IS NOT NULL;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE research_studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_notes ENABLE ROW LEVEL SECURITY;

-- Research Studios policies
CREATE POLICY research_studios_select ON research_studios
    FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY research_studios_insert ON research_studios
    FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY research_studios_update ON research_studios
    FOR UPDATE USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY research_studios_delete ON research_studios
    FOR DELETE USING (user_id = auth.uid() OR user_id IS NULL);

-- Studio Sources policies (inherit from studio ownership)
CREATE POLICY studio_sources_select ON studio_sources
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM research_studios
            WHERE id = studio_sources.studio_id
            AND (user_id = auth.uid() OR user_id IS NULL)
        )
    );

CREATE POLICY studio_sources_insert ON studio_sources
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM research_studios
            WHERE id = studio_sources.studio_id
            AND (user_id = auth.uid() OR user_id IS NULL)
        )
    );

CREATE POLICY studio_sources_update ON studio_sources
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM research_studios
            WHERE id = studio_sources.studio_id
            AND (user_id = auth.uid() OR user_id IS NULL)
        )
    );

CREATE POLICY studio_sources_delete ON studio_sources
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM research_studios
            WHERE id = studio_sources.studio_id
            AND (user_id = auth.uid() OR user_id IS NULL)
        )
    );

-- Source Chunks policies (inherit from source ownership)
CREATE POLICY source_chunks_select ON source_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM studio_sources ss
            JOIN research_studios rs ON rs.id = ss.studio_id
            WHERE ss.id = source_chunks.source_id
            AND (rs.user_id = auth.uid() OR rs.user_id IS NULL)
        )
    );

CREATE POLICY source_chunks_insert ON source_chunks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM studio_sources ss
            JOIN research_studios rs ON rs.id = ss.studio_id
            WHERE ss.id = source_chunks.source_id
            AND (rs.user_id = auth.uid() OR rs.user_id IS NULL)
        )
    );

CREATE POLICY source_chunks_delete ON source_chunks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM studio_sources ss
            JOIN research_studios rs ON rs.id = ss.studio_id
            WHERE ss.id = source_chunks.source_id
            AND (rs.user_id = auth.uid() OR rs.user_id IS NULL)
        )
    );

-- Conversations policies
CREATE POLICY studio_conversations_select ON studio_conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM research_studios
            WHERE id = studio_conversations.studio_id
            AND (user_id = auth.uid() OR user_id IS NULL)
        )
    );

CREATE POLICY studio_conversations_insert ON studio_conversations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM research_studios
            WHERE id = studio_conversations.studio_id
            AND (user_id = auth.uid() OR user_id IS NULL)
        )
    );

CREATE POLICY studio_conversations_update ON studio_conversations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM research_studios
            WHERE id = studio_conversations.studio_id
            AND (user_id = auth.uid() OR user_id IS NULL)
        )
    );

CREATE POLICY studio_conversations_delete ON studio_conversations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM research_studios
            WHERE id = studio_conversations.studio_id
            AND (user_id = auth.uid() OR user_id IS NULL)
        )
    );

-- Messages policies
CREATE POLICY studio_messages_select ON studio_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM studio_conversations sc
            JOIN research_studios rs ON rs.id = sc.studio_id
            WHERE sc.id = studio_messages.conversation_id
            AND (rs.user_id = auth.uid() OR rs.user_id IS NULL)
        )
    );

CREATE POLICY studio_messages_insert ON studio_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM studio_conversations sc
            JOIN research_studios rs ON rs.id = sc.studio_id
            WHERE sc.id = studio_messages.conversation_id
            AND (rs.user_id = auth.uid() OR rs.user_id IS NULL)
        )
    );

CREATE POLICY studio_messages_delete ON studio_messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM studio_conversations sc
            JOIN research_studios rs ON rs.id = sc.studio_id
            WHERE sc.id = studio_messages.conversation_id
            AND (rs.user_id = auth.uid() OR rs.user_id IS NULL)
        )
    );

-- Outputs policies
CREATE POLICY studio_outputs_select ON studio_outputs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM research_studios
            WHERE id = studio_outputs.studio_id
            AND (user_id = auth.uid() OR user_id IS NULL)
        )
    );

CREATE POLICY studio_outputs_insert ON studio_outputs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM research_studios
            WHERE id = studio_outputs.studio_id
            AND (user_id = auth.uid() OR user_id IS NULL)
        )
    );

CREATE POLICY studio_outputs_update ON studio_outputs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM research_studios
            WHERE id = studio_outputs.studio_id
            AND (user_id = auth.uid() OR user_id IS NULL)
        )
    );

CREATE POLICY studio_outputs_delete ON studio_outputs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM research_studios
            WHERE id = studio_outputs.studio_id
            AND (user_id = auth.uid() OR user_id IS NULL)
        )
    );

-- Notes policies
CREATE POLICY studio_notes_select ON studio_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM research_studios
            WHERE id = studio_notes.studio_id
            AND (user_id = auth.uid() OR user_id IS NULL)
        )
    );

CREATE POLICY studio_notes_insert ON studio_notes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM research_studios
            WHERE id = studio_notes.studio_id
            AND (user_id = auth.uid() OR user_id IS NULL)
        )
    );

CREATE POLICY studio_notes_update ON studio_notes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM research_studios
            WHERE id = studio_notes.studio_id
            AND (user_id = auth.uid() OR user_id IS NULL)
        )
    );

CREATE POLICY studio_notes_delete ON studio_notes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM research_studios
            WHERE id = studio_notes.studio_id
            AND (user_id = auth.uid() OR user_id IS NULL)
        )
    );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE research_studios IS 'NotebookLM-style research workspaces for document analysis and content generation';
COMMENT ON TABLE studio_sources IS 'Documents, URLs, and text sources uploaded to research studios';
COMMENT ON TABLE source_chunks IS 'Chunked content from sources for retrieval and context assembly';
COMMENT ON TABLE studio_conversations IS 'Chat conversation threads within research studios';
COMMENT ON TABLE studio_messages IS 'Individual messages in studio conversations with citation support';
COMMENT ON TABLE studio_outputs IS 'Generated content outputs (reports, audio, flashcards, etc.)';
COMMENT ON TABLE studio_notes IS 'User notes and annotations within research studios';

COMMENT ON COLUMN studio_sources.is_selected IS 'Toggle to include/exclude source from AI queries';
-- COMMENT ON COLUMN source_chunks.embedding IS 'Vector embedding for semantic search (1536 dim for OpenAI ada-002)';
COMMENT ON COLUMN studio_messages.citations IS 'JSON array of source citations [{source_id, chunk_id, quote, page_number}]';
COMMENT ON COLUMN studio_outputs.content IS 'Structured JSON content specific to output type';
