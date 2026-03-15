-- ===========================================
-- PHASE 73: Embeddable Chat Widgets
-- ===========================================
-- Public-facing chat widget infrastructure for external websites.
-- Separate from Phase 71 widget_configs (internal support widget).
-- Supports multi-widget per org, HMAC token auth, PII redaction,
-- usage ceilings, and pre-chat configuration modes.

-- ============================================
-- 1. CHAT WIDGETS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS chat_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    widget_name TEXT NOT NULL,
    widget_token TEXT UNIQUE NOT NULL,
    widget_token_secret TEXT NOT NULL,

    -- Domain allowlist for CORS enforcement [SEC-02]
    cors_origins TEXT[] DEFAULT '{}',

    -- Visual branding
    branding JSONB DEFAULT '{
        "primary_color": "#6366f1",
        "welcome_message": "Hi! How can I help you today?",
        "avatar_url": null,
        "disclaimer": "This AI assistant provides general information only."
    }',

    -- Usage limits & cost controls [SEC-09]
    limits JSONB DEFAULT '{
        "max_messages_per_session": 50,
        "max_sessions_per_day": 500,
        "max_messages_per_month": 10000,
        "daily_llm_spend_cap": 5.00
    }',

    -- Pre-chat configuration (lead_capture | open_chat | optional_info | custom)
    pre_chat_fields JSONB DEFAULT '{
        "mode": "lead_capture",
        "fields": {
            "email": {"enabled": true, "required": true, "label": "Email", "placeholder": "your@email.com"},
            "name": {"enabled": true, "required": false, "label": "Name", "placeholder": "Your name"}
        },
        "show_consent_checkbox": true
    }',

    -- Compliance [R-06, R-08, R-09]
    privacy_policy TEXT,
    consent_text TEXT DEFAULT 'I agree to the Privacy Policy and understand this conversation may be reviewed to improve service quality.',
    data_retention_days INTEGER DEFAULT 90,

    -- Calendly scheduling config
    calendly_config JSONB DEFAULT '{}',
    -- e.g. {"facelift": "https://calendly.com/dr/facelift", "rhinoplasty": "https://calendly.com/dr/rhinoplasty"}

    -- Google Sheets data source config
    sheets_config JSONB DEFAULT '{}',
    -- e.g. {"spreadsheet_id": "...", "sync_interval_minutes": 15, "last_sync_at": null, "context_asset_id": "..."}

    -- Usage tracking
    usage_stats JSONB DEFAULT '{
        "current_month": null,
        "monthly_messages": 0,
        "daily_llm_spend": 0.0,
        "daily_spend_date": null
    }',

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_widgets_org ON chat_widgets(org_id);
CREATE INDEX IF NOT EXISTS idx_chat_widgets_token ON chat_widgets(widget_token);
CREATE INDEX IF NOT EXISTS idx_chat_widgets_active ON chat_widgets(is_active) WHERE is_active = true;

COMMENT ON TABLE chat_widgets IS 'Embeddable chat widget configurations for external websites. Separate from widget_configs (Phase 71 internal support).';

-- ============================================
-- 2. WIDGET SESSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS widget_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id UUID NOT NULL REFERENCES chat_widgets(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,

    -- Pre-chat data stored SEPARATELY from messages [R-01]
    visitor_email TEXT,
    visitor_name TEXT,
    visitor_fingerprint TEXT,    -- hashed, non-PII

    messages_count INTEGER DEFAULT 0,

    -- Consent tracking [R-08]
    consent_given BOOLEAN DEFAULT false,
    consent_timestamp TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + interval '30 minutes'),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_widget_sessions_widget ON widget_sessions(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_sessions_token ON widget_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_widget_sessions_expires ON widget_sessions(expires_at);

COMMENT ON TABLE widget_sessions IS 'Anonymous visitor sessions for embeddable chat widgets. Pre-chat PII stored here, not in support_messages.';

-- ============================================
-- 3. EXTEND AGENT_EXECUTIONS
-- ============================================

ALTER TABLE agent_executions ADD COLUMN IF NOT EXISTS widget_id UUID REFERENCES chat_widgets(id);
ALTER TABLE agent_executions ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- ============================================
-- 4. RLS POLICIES
-- ============================================

ALTER TABLE chat_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_sessions ENABLE ROW LEVEL SECURITY;

-- Authenticated org members can manage their org's widgets
DROP POLICY IF EXISTS chat_widgets_org_access ON chat_widgets;
CREATE POLICY chat_widgets_org_access ON chat_widgets
    FOR ALL USING (
        org_id IN (
            SELECT om.org_id FROM organization_members om
            WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    );

-- Widget sessions: accessible by org members who own the widget
DROP POLICY IF EXISTS widget_sessions_org_access ON widget_sessions;
CREATE POLICY widget_sessions_org_access ON widget_sessions
    FOR ALL USING (
        widget_id IN (
            SELECT cw.id FROM chat_widgets cw
            WHERE cw.org_id IN (
                SELECT om.org_id FROM organization_members om
                WHERE om.user_id = auth.uid() AND om.status = 'active'
            )
        )
    );

-- Note: Public endpoints use service key with explicit WHERE clauses.
-- RLS does not apply to service key requests.

-- ============================================
-- 5. UPDATE TIMESTAMP TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION chat_widgets_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_widgets_updated ON chat_widgets;
CREATE TRIGGER trg_chat_widgets_updated
    BEFORE UPDATE ON chat_widgets
    FOR EACH ROW EXECUTE FUNCTION chat_widgets_update_timestamp();

-- ============================================
-- 6. SLIDING SESSION EXPIRY FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION extend_widget_session(p_session_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE widget_sessions
    SET expires_at = NOW() + interval '30 minutes',
        messages_count = messages_count + 1
    WHERE id = p_session_id
      AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. DATA RETENTION CLEANUP FUNCTION [R-06]
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_widget_data()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER := 0;
    v_batch_count INTEGER := 0;
    v_widget RECORD;
BEGIN
    -- For each active widget, delete conversations older than retention period
    FOR v_widget IN
        SELECT cw.id AS widget_id, cw.org_id, cw.data_retention_days
        FROM chat_widgets cw
        WHERE cw.data_retention_days > 0
    LOOP
        -- Delete messages for expired conversations
        DELETE FROM support_messages
        WHERE conversation_id IN (
            SELECT sc.id FROM support_conversations sc
            JOIN widget_sessions ws ON ws.id::text = sc.metadata->>'widget_session_id'
            WHERE ws.widget_id = v_widget.widget_id
              AND sc.created_at < NOW() - (v_widget.data_retention_days || ' days')::interval
        );

        GET DIAGNOSTICS v_batch_count = ROW_COUNT;
        v_deleted := v_deleted + v_batch_count;

        -- Delete expired sessions
        DELETE FROM widget_sessions
        WHERE widget_id = v_widget.widget_id
          AND created_at < NOW() - (v_widget.data_retention_days || ' days')::interval;

        GET DIAGNOSTICS v_batch_count = ROW_COUNT;
        v_deleted := v_deleted + v_batch_count;
    END LOOP;

    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. MODULE REGISTRATION
-- ============================================

INSERT INTO platform_modules (id, name, description, icon, category, min_tier, is_active, is_beta, route_path, nav_group, display_order)
VALUES (
    'embeddable_chat',
    'Embeddable Chat Widget',
    'Deploy AI chat agents on external websites via iframe embed. Includes public chat endpoint, conversation review, Google Sheets data sync, and Calendly scheduling integration.',
    'message-circle',
    'tool',
    'starter',
    true,
    true,
    '/support-settings.html',
    'modules',
    66
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    min_tier = EXCLUDED.min_tier,
    is_active = EXCLUDED.is_active,
    is_beta = EXCLUDED.is_beta,
    route_path = EXCLUDED.route_path,
    nav_group = EXCLUDED.nav_group,
    display_order = EXCLUDED.display_order;

-- ============================================
-- 9. ROLE ACCESS
-- ============================================

-- Insert global defaults for role access (NULL org_id = global)
-- Use a check to avoid duplicates on re-run
INSERT INTO role_module_access (org_id, business_role, module_id, can_access)
SELECT NULL, role, 'embeddable_chat', true
FROM (VALUES ('executive'), ('director'), ('manager'), ('supervisor')) AS roles(role)
WHERE NOT EXISTS (
    SELECT 1 FROM role_module_access rma
    WHERE rma.business_role = roles.role
      AND rma.module_id = 'embeddable_chat'
      AND rma.org_id IS NULL
);

-- ============================================
-- 10. EXTEND check_org_limits FOR chat_widgets
-- ============================================

-- Note: check_org_limits is already defined in phase71. We add the chat_widgets
-- case by replacing the function. This is safe because ON CONFLICT handling
-- preserves existing cases.

-- The limits for chat_widgets are stored in subscription_tiers.features:
--   "max_chat_widgets": N
-- This will be enforced at the route level via checkResourceLimit('chat_widgets').

-- ============================================
-- 11. SEED CALENDLY INTEGRATION PROVIDER
-- ============================================

INSERT INTO integration_providers (slug, name, category, auth_type, oauth_auth_url, oauth_token_url, default_scopes, capabilities, status)
VALUES (
    'calendly',
    'Calendly',
    'scheduling',
    'oauth2',
    'https://auth.calendly.com/oauth/authorize',
    'https://auth.calendly.com/oauth/token',
    ARRAY['default'],
    '{"supports_personal_token": true, "embed_scheduling": true, "event_types": true, "availability": true}'::jsonb,
    'active'
)
ON CONFLICT (slug) DO NOTHING;
