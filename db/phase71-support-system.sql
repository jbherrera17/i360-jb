-- ============================================================================
-- INSIGHT 360 - Phase 71: Customer Support Agent System
-- Core foundation: tables, functions, RLS, indexes, seeds
-- ============================================================================

-- ============================================================================
-- SUPPORT CONVERSATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS support_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_name TEXT,
    customer_email TEXT,
    customer_metadata JSONB DEFAULT '{}',
    subject TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'waiting', 'escalated', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    intent TEXT,
    sentiment TEXT DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative', 'frustrated')),
    csat_score INTEGER CHECK (csat_score IS NULL OR (csat_score >= 1 AND csat_score <= 5)),
    csat_comment TEXT,
    idempotency_key TEXT,
    channel TEXT DEFAULT 'widget' CHECK (channel IN ('widget', 'api', 'slack', 'email')),
    escalated_at TIMESTAMPTZ,
    escalation_reason TEXT,
    resolved_at TIMESTAMPTZ,
    resolution_summary TEXT,
    message_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, idempotency_key)
);

-- ============================================================================
-- SUPPORT MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
    seq INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    tool_calls JSONB DEFAULT '[]',
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, seq)
);

-- ============================================================================
-- SUPPORT ACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS support_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('refund', 'tier_change', 'escalation', 'knowledge_lookup', 'customer_lookup')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'executed', 'failed', 'expired')),
    idempotency_key TEXT,
    params JSONB DEFAULT '{}',
    result JSONB DEFAULT '{}',
    reason TEXT,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(idempotency_key)
);

-- ============================================================================
-- STRIPE CONNECTIONS (per-org)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stripe_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    stripe_account_id TEXT,
    encrypted_api_key TEXT,
    webhook_secret TEXT,
    is_enabled BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SLACK CONNECTIONS (per-org)
-- ============================================================================

CREATE TABLE IF NOT EXISTS slack_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    workspace_id TEXT,
    workspace_name TEXT,
    encrypted_bot_token TEXT,
    default_channel_id TEXT,
    is_enabled BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- WIDGET CONFIGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS widget_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    is_enabled BOOLEAN DEFAULT true,
    theme JSONB DEFAULT '{
        "primaryColor": "#6366f1",
        "fontFamily": "Inter, sans-serif",
        "borderRadius": "12px",
        "position": "bottom-right"
    }',
    welcome_message TEXT DEFAULT 'Hi! How can I help you today?',
    avatar_url TEXT,
    voice TEXT DEFAULT 'professional',
    proactive_triggers JSONB DEFAULT '[]',
    pre_chat_fields JSONB DEFAULT '[
        {"name": "name", "label": "Your name", "type": "text", "required": true},
        {"name": "email", "label": "Email", "type": "email", "required": true}
    ]',
    allowed_domains TEXT[] DEFAULT '{}',
    business_hours JSONB DEFAULT '{}',
    offline_message TEXT DEFAULT 'We are currently offline. Please leave a message and we will get back to you.',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Atomic sequence generation for support messages (FM-F003)
CREATE OR REPLACE FUNCTION next_support_message_seq(p_conversation_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_next_seq INTEGER;
BEGIN
    SELECT COALESCE(MAX(seq), 0) + 1 INTO v_next_seq
    FROM support_messages
    WHERE conversation_id = p_conversation_id;

    RETURN v_next_seq;
END;
$$ LANGUAGE plpgsql;

-- TTL sweep for expired pending actions (FM-F010)
CREATE OR REPLACE FUNCTION sweep_expired_support_actions()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE support_actions
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending'
      AND expires_at IS NOT NULL
      AND expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION support_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER trg_support_conversations_updated
    BEFORE UPDATE ON support_conversations
    FOR EACH ROW EXECUTE FUNCTION support_update_timestamp();

CREATE TRIGGER trg_support_actions_updated
    BEFORE UPDATE ON support_actions
    FOR EACH ROW EXECUTE FUNCTION support_update_timestamp();

CREATE TRIGGER trg_stripe_connections_updated
    BEFORE UPDATE ON stripe_connections
    FOR EACH ROW EXECUTE FUNCTION support_update_timestamp();

CREATE TRIGGER trg_slack_connections_updated
    BEFORE UPDATE ON slack_connections
    FOR EACH ROW EXECUTE FUNCTION support_update_timestamp();

CREATE TRIGGER trg_widget_configs_updated
    BEFORE UPDATE ON widget_configs
    FOR EACH ROW EXECUTE FUNCTION support_update_timestamp();

-- ============================================================================
-- EXTEND check_org_limits FOR support_conversations
-- ============================================================================

DROP FUNCTION IF EXISTS check_org_limits(UUID, TEXT);

CREATE OR REPLACE FUNCTION check_org_limits(
    p_org_id UUID,
    p_resource_type TEXT
)
RETURNS TABLE (
    current_count INTEGER,
    max_allowed INTEGER,
    within_limits BOOLEAN,
    usage_percent NUMERIC(5,2)
) AS $$
DECLARE
    v_tier TEXT;
    v_limits RECORD;
    v_count INTEGER;
    v_max INTEGER;
BEGIN
    -- Get org tier
    SELECT subscription_tier INTO v_tier FROM organizations WHERE id = p_org_id;
    IF v_tier IS NULL THEN v_tier := 'starter'; END IF;

    -- Get tier limits
    SELECT * INTO v_limits FROM subscription_tiers WHERE id = v_tier;

    -- Get current count and max based on resource type
    CASE p_resource_type
        WHEN 'members' THEN
            SELECT COUNT(*) INTO v_count FROM organization_members WHERE org_id = p_org_id AND status = 'active';
            v_max := v_limits.max_members;
        WHEN 'clients' THEN
            SELECT COUNT(*) INTO v_count FROM clients WHERE org_id = p_org_id AND status != 'archived';
            v_max := v_limits.max_clients;
        WHEN 'agents' THEN
            SELECT COUNT(*) INTO v_count FROM agents WHERE org_id = p_org_id;
            v_max := v_limits.max_agents;
        WHEN 'workflows' THEN
            SELECT COUNT(*) INTO v_count FROM workflows WHERE org_id = p_org_id;
            v_max := v_limits.max_workflows;
        WHEN 'skills' THEN
            SELECT COUNT(*) INTO v_count FROM skills WHERE org_id = p_org_id;
            v_max := v_limits.max_skills;
        WHEN 'context_assets' THEN
            SELECT COUNT(*) INTO v_count FROM context_assets WHERE org_id = p_org_id;
            v_max := v_limits.max_context_assets;
        WHEN 'research_studios' THEN
            SELECT COUNT(*) INTO v_count FROM research_studios WHERE org_id = p_org_id;
            v_max := v_limits.max_research_studios;
        WHEN 'support_conversations' THEN
            SELECT COUNT(*) INTO v_count FROM support_conversations WHERE org_id = p_org_id AND status IN ('open', 'waiting', 'escalated');
            v_max := COALESCE((v_limits.features->>'max_support_conversations')::INTEGER, -1);
        ELSE
            v_count := 0;
            v_max := 0;
    END CASE;

    -- Return results: -1 means unlimited (always within limits, 0% usage)
    RETURN QUERY SELECT
        v_count,
        v_max,
        CASE WHEN v_max = -1 THEN TRUE ELSE v_count < v_max END,
        CASE
            WHEN v_max = -1 THEN 0.00
            WHEN v_max > 0 THEN ROUND((v_count::NUMERIC / v_max) * 100, 2)
            ELSE 0.00
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_org_limits(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION next_support_message_seq(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sweep_expired_support_actions() TO authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_configs ENABLE ROW LEVEL SECURITY;

-- Support conversations: org members can access
CREATE POLICY support_conversations_org_access ON support_conversations
    FOR ALL USING (
        org_id IN (
            SELECT om.org_id FROM organization_members om
            WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    );

-- Support messages: via conversation org membership
CREATE POLICY support_messages_org_access ON support_messages
    FOR ALL USING (
        conversation_id IN (
            SELECT sc.id FROM support_conversations sc
            WHERE sc.org_id IN (
                SELECT om.org_id FROM organization_members om
                WHERE om.user_id = auth.uid() AND om.status = 'active'
            )
        )
    );

-- Support actions: org members can access
CREATE POLICY support_actions_org_access ON support_actions
    FOR ALL USING (
        org_id IN (
            SELECT om.org_id FROM organization_members om
            WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    );

-- Stripe connections: org members
CREATE POLICY stripe_connections_org_access ON stripe_connections
    FOR ALL USING (
        org_id IN (
            SELECT om.org_id FROM organization_members om
            WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    );

-- Slack connections: org members
CREATE POLICY slack_connections_org_access ON slack_connections
    FOR ALL USING (
        org_id IN (
            SELECT om.org_id FROM organization_members om
            WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    );

-- Widget configs: org members
CREATE POLICY widget_configs_org_access ON widget_configs
    FOR ALL USING (
        org_id IN (
            SELECT om.org_id FROM organization_members om
            WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    );

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_support_conversations_org_id ON support_conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON support_conversations(status);
CREATE INDEX IF NOT EXISTS idx_support_conversations_org_status ON support_conversations(org_id, status);
CREATE INDEX IF NOT EXISTS idx_support_conversations_created ON support_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_conversations_idempotency ON support_conversations(org_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_messages_conversation ON support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_conv_seq ON support_messages(conversation_id, seq);

CREATE INDEX IF NOT EXISTS idx_support_actions_conversation ON support_actions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_actions_org ON support_actions(org_id);
CREATE INDEX IF NOT EXISTS idx_support_actions_status ON support_actions(status);
CREATE INDEX IF NOT EXISTS idx_support_actions_expires ON support_actions(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_support_actions_idempotency ON support_actions(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ============================================================================
-- SEED: Module Registration
-- ============================================================================

INSERT INTO platform_modules (id, name, description, icon, category, min_tier, is_active, is_beta, route_path, nav_group, display_order)
VALUES (
    'support_ai',
    'Customer Support AI',
    'AI-powered customer support agent with automated refunds, escalation, and tier management',
    'headset',
    'tool',
    NULL,
    true,
    true,
    '/support-dashboard.html',
    'modules',
    65
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_beta = EXCLUDED.is_beta,
    route_path = EXCLUDED.route_path,
    nav_group = EXCLUDED.nav_group,
    display_order = EXCLUDED.display_order;

-- ============================================================================
-- SEED: Support Policies (as processes)
-- ============================================================================

-- Refund Policy
INSERT INTO processes (user_id, department_id, name, description, type, status, version, icon, tags, steps, inputs, outputs)
SELECT
    NULL,
    d.id,
    'Support: Refund Policy',
    'Automated refund evaluation policy for customer support agent',
    'policy',
    'active',
    '1.0',
    'receipt-refund',
    ARRAY['support', 'refund', 'policy', 'automated'],
    '[
        {
            "order": 1,
            "title": "Eligibility Check",
            "description": "Verify refund eligibility based on purchase date and amount",
            "rules": [
                "Refunds under $50: auto-approve if within 30 days",
                "Refunds $50-$200: auto-approve if within 14 days, flag for review if 15-30 days",
                "Refunds over $200: always require human approval",
                "Maximum 3 refunds per customer in 90 days",
                "Subscription refunds: pro-rate remaining days"
            ]
        },
        {
            "order": 2,
            "title": "Processing",
            "description": "Execute the refund through payment provider",
            "rules": [
                "Process through original payment method",
                "Send confirmation email to customer",
                "Log refund in action audit trail"
            ]
        }
    ]'::JSONB,
    '{"amount": "number", "days_since_purchase": "number", "prior_refunds_90d": "number", "reason": "string"}'::JSONB,
    '{"decision": "string", "rationale": "string", "rules_checked": "array"}'::JSONB
FROM departments d
WHERE d.name = 'Operations'
  AND d.org_id = '57234ef8-5a4d-40e7-aec3-ca02e44db9ce'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Escalation Policy
INSERT INTO processes (user_id, department_id, name, description, type, status, version, icon, tags, steps, inputs, outputs)
SELECT
    NULL,
    d.id,
    'Support: Escalation Policy',
    'Rules for escalating customer conversations to human agents',
    'policy',
    'active',
    '1.0',
    'alert-triangle',
    ARRAY['support', 'escalation', 'policy', 'automated'],
    '[
        {
            "order": 1,
            "title": "Auto-Escalation Triggers",
            "description": "Conditions that trigger automatic escalation",
            "rules": [
                "Customer sentiment drops to frustrated",
                "3+ failed resolution attempts in single conversation",
                "Customer explicitly requests human agent",
                "Legal or compliance related inquiry detected",
                "Security incident or data breach mentioned",
                "VIP customer flag on account"
            ]
        },
        {
            "order": 2,
            "title": "SLA Targets",
            "description": "Response time targets after escalation",
            "rules": [
                "Urgent: human response within 15 minutes",
                "High: human response within 1 hour",
                "Normal: human response within 4 hours",
                "Low: human response within 24 hours"
            ]
        }
    ]'::JSONB,
    '{"sentiment": "string", "intent": "string", "failed_attempts": "number", "customer_tier": "string"}'::JSONB,
    '{"should_escalate": "boolean", "trigger": "string", "sla_minutes": "number"}'::JSONB
FROM departments d
WHERE d.name = 'Operations'
  AND d.org_id = '57234ef8-5a4d-40e7-aec3-ca02e44db9ce'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Tier Change Policy
INSERT INTO processes (user_id, department_id, name, description, type, status, version, icon, tags, steps, inputs, outputs)
SELECT
    NULL,
    d.id,
    'Support: Tier Change Policy',
    'Rules for processing subscription tier changes',
    'policy',
    'active',
    '1.0',
    'layers',
    ARRAY['support', 'tier-change', 'policy', 'automated'],
    '[
        {
            "order": 1,
            "title": "Upgrade Rules",
            "description": "Rules for processing tier upgrades",
            "rules": [
                "Upgrades: auto-approve, immediate effect",
                "Pro-rate billing difference",
                "Send upgrade confirmation with new features list"
            ]
        },
        {
            "order": 2,
            "title": "Downgrade Rules",
            "description": "Rules for processing tier downgrades",
            "rules": [
                "Downgrades: require minimum 30 days on current tier",
                "Check for feature dependencies before downgrading",
                "Downgrade takes effect at end of billing cycle",
                "Warn about features that will be lost"
            ]
        }
    ]'::JSONB,
    '{"current_tier": "string", "requested_tier": "string", "days_on_current_tier": "number"}'::JSONB,
    '{"decision": "string", "rationale": "string", "requires_human_approval": "boolean"}'::JSONB
FROM departments d
WHERE d.name = 'Operations'
  AND d.org_id = '57234ef8-5a4d-40e7-aec3-ca02e44db9ce'
LIMIT 1
ON CONFLICT DO NOTHING;
