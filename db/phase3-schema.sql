-- ============================================
-- Insight 360 - Phase 3: Context Assets Schema
-- Version: 2.2
-- Date: December 2025
-- ============================================

-- Context Asset Types (enum table for predefined types)
CREATE TABLE IF NOT EXISTS context_asset_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_key TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    json_schema JSONB,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Context Assets (main knowledge storage)
CREATE TABLE IF NOT EXISTS context_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Classification
    asset_type TEXT NOT NULL REFERENCES context_asset_types(type_key),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Content (dual storage for flexibility)
    content_json JSONB NOT NULL DEFAULT '{}',
    content_text TEXT,
    
    -- Versioning
    version INTEGER DEFAULT 1,
    is_current BOOLEAN DEFAULT true,
    previous_version_id UUID REFERENCES context_assets(id),
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public')),
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Context Asset Versions (audit trail)
CREATE TABLE IF NOT EXISTS context_asset_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES context_assets(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content_json JSONB NOT NULL,
    content_text TEXT,
    change_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Agent-Context Mappings (junction table)
CREATE TABLE IF NOT EXISTS agent_context_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES context_assets(id) ON DELETE CASCADE,
    injection_mode TEXT DEFAULT 'always' CHECK (injection_mode IN ('always', 'on_demand', 'conditional')),
    priority INTEGER DEFAULT 0,
    max_tokens INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, asset_id)
);

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_context_assets_type ON context_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_context_assets_user ON context_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_context_assets_current ON context_assets(is_current);
CREATE INDEX IF NOT EXISTS idx_context_assets_tags ON context_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_context_asset_versions_asset ON context_asset_versions(asset_id);
CREATE INDEX IF NOT EXISTS idx_agent_context_agent ON agent_context_mappings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_context_asset ON agent_context_mappings(asset_id);

-- ============================================
-- Triggers for Auto-Update
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for context_assets
DROP TRIGGER IF EXISTS update_context_assets_updated_at ON context_assets;
CREATE TRIGGER update_context_assets_updated_at
    BEFORE UPDATE ON context_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE context_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_asset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_context_mappings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own assets
CREATE POLICY "Users can view own assets" ON context_assets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assets" ON context_assets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assets" ON context_assets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets" ON context_assets
    FOR DELETE USING (auth.uid() = user_id);

-- Policy: Users can see versions of their own assets
CREATE POLICY "Users can view own asset versions" ON context_asset_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM context_assets 
            WHERE context_assets.id = context_asset_versions.asset_id 
            AND context_assets.user_id = auth.uid()
        )
    );

-- Policy: Users can manage mappings for their own agents
CREATE POLICY "Users can view own mappings" ON agent_context_mappings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_context_mappings.agent_id 
            AND agents.user_id = auth.uid()
        )
    );

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE context_asset_types IS 'Predefined types of context assets (VoiceDNA, ICP, Products, etc.)';
COMMENT ON TABLE context_assets IS 'User-created context assets for AI agent consumption';
COMMENT ON TABLE context_asset_versions IS 'Version history for context assets';
COMMENT ON TABLE agent_context_mappings IS 'Maps which context assets are available to which agents';

COMMENT ON COLUMN context_assets.content_json IS 'Structured JSON content following type-specific schema';
COMMENT ON COLUMN context_assets.content_text IS 'Plain text version for search and direct injection';
COMMENT ON COLUMN agent_context_mappings.injection_mode IS 'always=every call, on_demand=when requested, conditional=keyword triggered';
