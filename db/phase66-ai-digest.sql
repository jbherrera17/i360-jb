-- ============================================================================
-- INSIGHT 360 - Phase 66: AI Digest
-- Context-aware content aggregation and intelligent summarization
-- ============================================================================

-- ============================================================================
-- CONTENT SOURCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS digest_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'website', 'document', 'newsletter', 'manual')),
    config JSONB NOT NULL DEFAULT '{}',
    -- RSS: {url, max_items}
    -- Website: {url, selectors: {title, content, date}, follow_links}
    -- Document: {file_path, mime_type, file_size}
    -- Newsletter: {email_hint}
    -- Manual: {}
    fetch_schedule TEXT DEFAULT '0 */6 * * *',
    is_enabled BOOLEAN DEFAULT true,
    last_fetch_at TIMESTAMPTZ,
    last_fetch_status TEXT CHECK (last_fetch_status IN ('success', 'partial', 'failed', 'pending')),
    last_fetch_error TEXT,
    fetch_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    health_score REAL DEFAULT 1.0,
    tags TEXT[] DEFAULT '{}',
    -- Context enrichment defaults
    default_context_asset_ids UUID[] DEFAULT '{}',
    default_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SOURCE ITEMS (ingested content)
-- ============================================================================

CREATE TABLE IF NOT EXISTS digest_source_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES digest_sources(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    external_id TEXT,
    title TEXT,
    url TEXT,
    author TEXT,
    published_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    raw_content TEXT,
    content_hash TEXT,
    metadata JSONB DEFAULT '{}',
    -- {word_count, language, images[], categories[], original_html}
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
    file_path TEXT,
    file_size INTEGER,
    mime_type TEXT,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_id, external_id)
);

-- ============================================================================
-- AI SUMMARIES (structured extraction output)
-- ============================================================================

CREATE TABLE IF NOT EXISTS digest_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    item_id UUID REFERENCES digest_source_items(id) ON DELETE CASCADE,
    item_ids UUID[] DEFAULT '{}',
    summary_type TEXT NOT NULL CHECK (summary_type IN ('headline', 'brief', 'detailed')),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    key_points JSONB DEFAULT '[]',
    entities JSONB DEFAULT '[]',
    sentiment JSONB DEFAULT '{}',
    topics TEXT[] DEFAULT '{}',
    source_attribution JSONB DEFAULT '[]',
    -- Context enrichment results
    context_analysis JSONB DEFAULT '{}',
    -- {relevance_score, opportunities[], threats[], alignment_notes, icp_fit}
    context_asset_ids UUID[] DEFAULT '{}',
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    processing_mode TEXT DEFAULT 'ai_summary' CHECK (processing_mode IN ('agent', 'ai_summary', 'raw')),
    model_used TEXT,
    tokens_used INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DIGEST CONFIGURATIONS (user preferences)
-- ============================================================================

CREATE TABLE IF NOT EXISTS digest_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT DEFAULT 'Default Digest',
    source_ids UUID[] DEFAULT '{}',
    summary_depth TEXT DEFAULT 'brief' CHECK (summary_depth IN ('headline', 'brief', 'detailed')),
    topics_of_interest TEXT[] DEFAULT '{}',
    schedule TEXT,
    is_enabled BOOLEAN DEFAULT true,
    max_items_per_digest INTEGER DEFAULT 20,
    group_related BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- ============================================================================
-- DIGEST SECTIONS (configurable sections within a digest)
-- ============================================================================

CREATE TABLE IF NOT EXISTS digest_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES digest_configs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'file-text',
    source_ids UUID[] DEFAULT '{}',
    -- Processing mode
    processing_mode TEXT DEFAULT 'ai_summary' CHECK (processing_mode IN ('agent', 'ai_summary', 'raw')),
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    context_asset_ids UUID[] DEFAULT '{}',
    enrichment_prompt TEXT,
    -- Display settings
    max_items INTEGER DEFAULT 10,
    summary_depth TEXT DEFAULT 'brief' CHECK (summary_depth IN ('headline', 'brief', 'detailed')),
    sort_order INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(config_id, slug)
);

-- ============================================================================
-- GENERATED DIGESTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES digest_configs(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed', 'partial')),
    content JSONB DEFAULT '{}',
    -- {sections: [{name, icon, items: [{title, summary, key_points, context_analysis, source_url}]}]}
    summary_ids UUID[] DEFAULT '{}',
    total_items_processed INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    generation_started_at TIMESTAMPTZ,
    generation_completed_at TIMESTAMPTZ,
    error_message TEXT,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(config_id, date)
);

-- ============================================================================
-- ANALYTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS digest_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    sources_active INTEGER DEFAULT 0,
    sources_healthy INTEGER DEFAULT 0,
    items_fetched INTEGER DEFAULT 0,
    items_processed INTEGER DEFAULT 0,
    summaries_generated INTEGER DEFAULT 0,
    digests_generated INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    search_queries INTEGER DEFAULT 0,
    popular_topics JSONB DEFAULT '[]',
    popular_entities JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, date)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Sources
CREATE INDEX IF NOT EXISTS idx_digest_sources_org ON digest_sources(org_id);
CREATE INDEX IF NOT EXISTS idx_digest_sources_enabled ON digest_sources(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_digest_sources_type ON digest_sources(org_id, source_type);

-- Source items
CREATE INDEX IF NOT EXISTS idx_digest_items_source ON digest_source_items(source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_digest_items_org ON digest_source_items(org_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_digest_items_status ON digest_source_items(source_id, processing_status);
CREATE INDEX IF NOT EXISTS idx_digest_items_hash ON digest_source_items(content_hash);
CREATE INDEX IF NOT EXISTS idx_digest_items_search ON digest_source_items USING GIN(search_vector);

-- Summaries
CREATE INDEX IF NOT EXISTS idx_digest_summaries_item ON digest_summaries(item_id);
CREATE INDEX IF NOT EXISTS idx_digest_summaries_org ON digest_summaries(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_digest_summaries_search ON digest_summaries USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_digest_summaries_topics ON digest_summaries USING GIN(topics);

-- Configs
CREATE INDEX IF NOT EXISTS idx_digest_configs_user ON digest_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_digest_configs_org ON digest_configs(org_id);

-- Digests
CREATE INDEX IF NOT EXISTS idx_digests_config ON digests(config_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_digests_user ON digests(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_digests_search ON digests USING GIN(search_vector);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_digest_analytics_org ON digest_analytics(org_id, date DESC);

-- ============================================================================
-- FULL-TEXT SEARCH TRIGGERS
-- ============================================================================

-- Auto-update search vector for source items
CREATE OR REPLACE FUNCTION digest_items_search_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.author, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(LEFT(NEW.raw_content, 10000), '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_digest_items_search
    BEFORE INSERT OR UPDATE OF title, raw_content, author
    ON digest_source_items
    FOR EACH ROW
    EXECUTE FUNCTION digest_items_search_update();

-- Auto-update search vector for summaries
CREATE OR REPLACE FUNCTION digest_summaries_search_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.topics, ' '), '')), 'A');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_digest_summaries_search
    BEFORE INSERT OR UPDATE OF title, summary, topics
    ON digest_summaries
    FOR EACH ROW
    EXECUTE FUNCTION digest_summaries_search_update();

-- Auto-update search vector for digests (from content JSON)
CREATE OR REPLACE FUNCTION digests_search_update() RETURNS TRIGGER AS $$
DECLARE
    section_text TEXT := '';
    section JSONB;
BEGIN
    IF NEW.content IS NOT NULL AND NEW.content->'sections' IS NOT NULL THEN
        FOR section IN SELECT jsonb_array_elements(NEW.content->'sections')
        LOOP
            section_text := section_text || ' ' || COALESCE(section->>'name', '') || ' ' || COALESCE(section->>'summary', '');
        END LOOP;
    END IF;
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(LEFT(section_text, 10000), '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_digests_search
    BEFORE INSERT OR UPDATE OF content
    ON digests
    FOR EACH ROW
    EXECUTE FUNCTION digests_search_update();

-- ============================================================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION digest_update_timestamp() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_digest_sources_updated
    BEFORE UPDATE ON digest_sources
    FOR EACH ROW EXECUTE FUNCTION digest_update_timestamp();

CREATE OR REPLACE TRIGGER trg_digest_configs_updated
    BEFORE UPDATE ON digest_configs
    FOR EACH ROW EXECUTE FUNCTION digest_update_timestamp();

CREATE OR REPLACE TRIGGER trg_digest_sections_updated
    BEFORE UPDATE ON digest_sections
    FOR EACH ROW EXECUTE FUNCTION digest_update_timestamp();

-- ============================================================================
-- FULL-TEXT SEARCH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION digest_search(
    p_org_id UUID,
    p_query TEXT,
    p_source_ids UUID[] DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_topics TEXT[] DEFAULT NULL,
    p_content_type TEXT DEFAULT 'all',
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    content_type TEXT,
    title TEXT,
    snippet TEXT,
    source_name TEXT,
    published_at TIMESTAMPTZ,
    relevance REAL,
    topics TEXT[],
    url TEXT
) AS $$
DECLARE
    tsquery_val TSQUERY;
BEGIN
    tsquery_val := plainto_tsquery('english', p_query);

    RETURN QUERY
    -- Search source items
    SELECT
        si.id,
        'item'::TEXT AS content_type,
        si.title,
        ts_headline('english', COALESCE(LEFT(si.raw_content, 2000), ''), tsquery_val,
            'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') AS snippet,
        ds.name AS source_name,
        si.published_at,
        ts_rank_cd(si.search_vector, tsquery_val) AS relevance,
        '{}'::TEXT[] AS topics,
        si.url
    FROM digest_source_items si
    JOIN digest_sources ds ON ds.id = si.source_id
    WHERE si.org_id = p_org_id
      AND si.search_vector @@ tsquery_val
      AND (p_content_type = 'all' OR p_content_type = 'items')
      AND (p_source_ids IS NULL OR si.source_id = ANY(p_source_ids))
      AND (p_date_from IS NULL OR si.published_at >= p_date_from)
      AND (p_date_to IS NULL OR si.published_at <= p_date_to + INTERVAL '1 day')

    UNION ALL

    -- Search summaries
    SELECT
        s.id,
        'summary'::TEXT AS content_type,
        s.title,
        ts_headline('english', COALESCE(LEFT(s.summary, 2000), ''), tsquery_val,
            'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') AS snippet,
        NULL::TEXT AS source_name,
        s.created_at AS published_at,
        ts_rank_cd(s.search_vector, tsquery_val) AS relevance,
        s.topics,
        NULL::TEXT AS url
    FROM digest_summaries s
    WHERE s.org_id = p_org_id
      AND s.search_vector @@ tsquery_val
      AND (p_content_type = 'all' OR p_content_type = 'summaries')
      AND (p_topics IS NULL OR s.topics && p_topics)
      AND (p_date_from IS NULL OR s.created_at >= p_date_from)
      AND (p_date_to IS NULL OR s.created_at <= p_date_to + INTERVAL '1 day')

    ORDER BY relevance DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SOURCE HEALTH UPDATE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_source_health() RETURNS TRIGGER AS $$
BEGIN
    -- Rolling health score: weighted average of recent fetches
    -- health_score = success_rate over last 20 fetches (approximated)
    IF NEW.last_fetch_status = 'success' THEN
        NEW.health_score := LEAST(1.0, OLD.health_score * 0.9 + 0.1);
    ELSIF NEW.last_fetch_status = 'failed' THEN
        NEW.health_score := GREATEST(0.0, OLD.health_score * 0.9);
        NEW.error_count := OLD.error_count + 1;
    END IF;
    NEW.fetch_count := OLD.fetch_count + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_source_health
    BEFORE UPDATE OF last_fetch_status ON digest_sources
    FOR EACH ROW
    WHEN (NEW.last_fetch_status IS DISTINCT FROM OLD.last_fetch_status)
    EXECUTE FUNCTION update_source_health();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE digest_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_source_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_analytics ENABLE ROW LEVEL SECURITY;

-- Sources: org members can view, creators can modify
CREATE POLICY digest_sources_select ON digest_sources FOR SELECT
    USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY digest_sources_insert ON digest_sources FOR INSERT
    WITH CHECK (user_id = auth.uid());
CREATE POLICY digest_sources_update ON digest_sources FOR UPDATE
    USING (user_id = auth.uid());
CREATE POLICY digest_sources_delete ON digest_sources FOR DELETE
    USING (user_id = auth.uid());

-- Items: org members can view
CREATE POLICY digest_items_select ON digest_source_items FOR SELECT
    USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

-- Summaries: org members can view
CREATE POLICY digest_summaries_select ON digest_summaries FOR SELECT
    USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

-- Configs: users own their configs
CREATE POLICY digest_configs_all ON digest_configs FOR ALL
    USING (user_id = auth.uid());

-- Sections: through config ownership
CREATE POLICY digest_sections_all ON digest_sections FOR ALL
    USING (config_id IN (SELECT id FROM digest_configs WHERE user_id = auth.uid()));

-- Digests: users own their digests
CREATE POLICY digests_all ON digests FOR ALL
    USING (user_id = auth.uid());

-- Analytics: org members can view
CREATE POLICY digest_analytics_select ON digest_analytics FOR SELECT
    USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

-- ============================================================================
-- MODULE REGISTRATION
-- ============================================================================

INSERT INTO platform_modules (id, name, description, icon, route_path, nav_group, min_tier, display_order)
VALUES
    ('ai_digest', 'AI Digest', 'Intelligent content digests from RSS, websites, documents, and newsletters', 'rss', '/digest.html', 'create', 'business', 62),
    ('ai_digest_admin', 'Digest Administration', 'Monitor and manage digest sources and analytics', 'shield-check', '/admin-digest.html', 'admin', 'enterprise', 95)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- GRANT SERVICE KEY ACCESS (bypasses RLS for server-side operations)
-- ============================================================================

GRANT ALL ON digest_sources TO service_role;
GRANT ALL ON digest_source_items TO service_role;
GRANT ALL ON digest_summaries TO service_role;
GRANT ALL ON digest_configs TO service_role;
GRANT ALL ON digest_sections TO service_role;
GRANT ALL ON digests TO service_role;
GRANT ALL ON digest_analytics TO service_role;
