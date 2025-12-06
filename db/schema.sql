-- ============================================
-- Insight 360 Database Schema
-- Version 2.1 | November 2025
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- Authenticated users of the system
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- AGENTS TABLE
-- AI agents available in the system
-- ============================================
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'custom', -- 'mindstudio' / 'custom' / 'llm'
    config JSONB DEFAULT '{}', -- prompts, model, settings
    mindstudio_workflow_id TEXT,
    icon TEXT DEFAULT 'bot',
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false, -- shared with all users
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user's agents
CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_active ON agents(is_active);

-- ============================================
-- CONVERSATIONS TABLE
-- Chat conversation threads
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'New Conversation',
    model TEXT DEFAULT 'claude-sonnet-4-5-20250929',
    system_prompt TEXT,
    metadata JSONB DEFAULT '{}',
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for conversation queries
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(is_archived);

-- ============================================
-- MESSAGES TABLE
-- Individual messages within conversations
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user' / 'assistant' / 'system'
    content TEXT NOT NULL,
    model TEXT, -- LLM that generated response (if assistant)
    tokens_used INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}', -- attachments, search results, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for message retrieval
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- ============================================
-- TOPICS TABLE
-- Topics of interest for daily monitoring
-- ============================================
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    sources TEXT[] DEFAULT '{}',
    frequency TEXT DEFAULT 'daily', -- 'daily' / 'weekly' / 'realtime'
    is_active BOOLEAN DEFAULT true,
    last_checked TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user's topics
CREATE INDEX IF NOT EXISTS idx_topics_user ON topics(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_active ON topics(is_active);

-- ============================================
-- BRIEFINGS TABLE
-- Generated daily briefings
-- ============================================
CREATE TABLE IF NOT EXISTS briefings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    content JSONB NOT NULL, -- structured briefing content
    topics_covered UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Index for briefing retrieval
CREATE INDEX IF NOT EXISTS idx_briefings_user_date ON briefings(user_id, date DESC);

-- ============================================
-- EMAIL_RULES TABLE
-- Email triage rules and configurations
-- ============================================
CREATE TABLE IF NOT EXISTS email_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    conditions JSONB NOT NULL, -- matching conditions
    actions JSONB NOT NULL, -- actions to take
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for rule processing
CREATE INDEX IF NOT EXISTS idx_email_rules_user ON email_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_email_rules_priority ON email_rules(priority);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- Automatically update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Users can only access their own data
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_rules ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Agents table policies
CREATE POLICY "Users can view own agents" ON agents
    FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create own agents" ON agents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agents" ON agents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own agents" ON agents
    FOR DELETE USING (auth.uid() = user_id);

-- Conversations table policies
CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON conversations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON conversations
    FOR DELETE USING (auth.uid() = user_id);

-- Messages table policies (via conversation ownership)
CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM conversations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in own conversations" ON messages
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT id FROM conversations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own messages" ON messages
    FOR DELETE USING (
        conversation_id IN (
            SELECT id FROM conversations WHERE user_id = auth.uid()
        )
    );

-- Topics table policies
CREATE POLICY "Users can manage own topics" ON topics
    FOR ALL USING (auth.uid() = user_id);

-- Briefings table policies
CREATE POLICY "Users can view own briefings" ON briefings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own briefings" ON briefings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Email rules table policies
CREATE POLICY "Users can manage own email rules" ON email_rules
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- SERVICE ROLE BYPASS
-- For server-side operations without auth
-- ============================================
-- Note: When using service role key, RLS is bypassed
-- This allows the server to perform operations on behalf of users

-- ============================================
-- USEFUL VIEWS
-- ============================================

-- Recent conversations with message count
CREATE OR REPLACE VIEW conversation_summaries AS
SELECT 
    c.id,
    c.user_id,
    c.title,
    c.model,
    c.created_at,
    c.updated_at,
    COUNT(m.id) as message_count,
    MAX(m.created_at) as last_message_at
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
WHERE c.is_archived = false
GROUP BY c.id
ORDER BY c.updated_at DESC;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE users IS 'Authenticated users of the Insight 360 system';
COMMENT ON TABLE agents IS 'AI agents including custom prompts and MindStudio workflows';
COMMENT ON TABLE conversations IS 'Chat conversation threads';
COMMENT ON TABLE messages IS 'Individual messages within conversations';
COMMENT ON TABLE topics IS 'Topics of interest for daily monitoring and briefings';
COMMENT ON TABLE briefings IS 'Generated daily intelligence briefings';
COMMENT ON TABLE email_rules IS 'Email triage rules and automation configurations';
