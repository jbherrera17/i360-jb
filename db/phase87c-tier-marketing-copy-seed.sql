-- ============================================
-- Phase 87c: Tier Marketing Copy — PLACEHOLDERS (REQ-003)
-- ============================================
-- Sets initial values for the marketing-copy columns added in Phase 87.
-- These are intentionally placeholders — JB revises via the admin UI
-- (admin-tier-setup.html marketing-copy editors) once it ships.
--
-- The placeholders are derived from the strategist's tier definitions
-- so the public pricing page renders something coherent if the sync
-- runs before final copy is authored.
--
-- Run AFTER: phase87b-tier-module-seed.sql
-- Run BEFORE: phase87d-reactivate-modules.sql
--
-- Source: REQ-003-tier-config-overhaul.md (Decision #5: placeholders)
-- ============================================

BEGIN;

-- ============================================
-- STARTER ($49/mo)
-- ============================================
UPDATE subscription_tiers
SET
    tagline = 'For individuals and small teams testing AI-augmented work',
    target_customer = 'Solo consultants, small professional teams, and values-driven micro-businesses ready to use AI for content, research, and basic agent workflows — without committing to a strategy platform.',
    feature_highlights = '[
        "Multi-LLM chat (Haiku default, Sonnet available)",
        "Up to 5 custom AI agents",
        "Context Assets library (25 assets)",
        "Parthenon action templates",
        "Basic Integrity Dashboard",
        "Up to 3 team members"
    ]'::jsonb,
    cta_label = 'Start free trial',
    cta_url = 'https://app.synergi.ai/signup?tier=starter',
    is_featured = FALSE,
    updated_at = NOW()
WHERE id = 'starter';


-- ============================================
-- BUSINESS ($249/mo) — featured tier
-- ============================================
UPDATE subscription_tiers
SET
    tagline = 'For growing teams ready to embed AI into strategy and execution',
    target_customer = 'Teams of 6 to 50 people — or departments inside mid-size companies — that want to move beyond AI-as-a-chat-tool and into AI-as-a-strategy-partner. Includes the full Insight 360 strategy pipeline plus the modules that compound across a team.',
    feature_highlights = '[
        "Full Insight 360 strategy pipeline (Align120 → Strategy120 → Execute120)",
        "Research Studio with deep web research",
        "Soul Configuration with SCU Ethics Framework",
        "Workflow automation (15 workflows)",
        "Thought Leadership content engine",
        "Native integrations (Notion, Slack, Google)",
        "Up to 10 team members, 25 agents"
    ]'::jsonb,
    cta_label = 'Start free trial',
    cta_url = 'https://app.synergi.ai/signup?tier=business',
    is_featured = TRUE,
    updated_at = NOW()
WHERE id = 'business';


-- ============================================
-- ENTERPRISE ($799/mo)
-- ============================================
UPDATE subscription_tiers
SET
    tagline = 'For large organizations that need governance, compliance, and scale',
    target_customer = 'Organizations of 50 to 100+ employees, regulated industries, or any team where ethical governance, audit trails, and advanced security are non-negotiable. Department-level Soul Configuration and full bright-line tracking included.',
    feature_highlights = '[
        "Everything in Business, at scale",
        "SSO (SAML/OIDC) and audit logs",
        "Department-level Soul Configuration with hierarchy",
        "Values Alignment Audit and Strategy Governance",
        "Advanced Integrity Dashboard with ethical lens scoring",
        "Priority support (4-hour SLA)",
        "Up to 100 members, 100 agents"
    ]'::jsonb,
    cta_label = 'Book a demo',
    cta_url = 'https://app.synergi.ai/contact?tier=enterprise',
    is_featured = FALSE,
    updated_at = NOW()
WHERE id = 'enterprise';


-- ============================================
-- AGENCY ($999/mo)
-- ============================================
UPDATE subscription_tiers
SET
    tagline = 'For agencies and consultancies serving multiple clients',
    target_customer = 'Consulting firms, marketing agencies, fractional executive practices, and boutique advisories. Deliver Insight 360 capabilities under your own brand without clients seeing the platform name. Manage up to 100 client organizations from a single console.',
    feature_highlights = '[
        "Everything in Enterprise, plus client delivery",
        "Full white-label (your branding, your domain)",
        "Client Portal with per-client access controls",
        "Manage up to 100 client organizations",
        "Cross-client analytics and benchmarking",
        "Per-client Soul Configuration inheritance",
        "50 internal agency members, 200 agents shared across clients"
    ]'::jsonb,
    cta_label = 'Book a demo',
    cta_url = 'https://app.synergi.ai/contact?tier=agency',
    is_featured = FALSE,
    updated_at = NOW()
WHERE id = 'agency';


-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
    v_missing INT;
BEGIN
    SELECT count(*) INTO v_missing
    FROM subscription_tiers
    WHERE id IN ('starter','business','enterprise','agency')
      AND (tagline IS NULL OR target_customer IS NULL OR cta_label IS NULL OR cta_url IS NULL);

    IF v_missing > 0 THEN
        RAISE EXCEPTION 'Marketing copy missing on % public tier(s). ROLLING BACK.', v_missing;
    END IF;

    -- Confirm exactly one tier is featured (Business)
    SELECT count(*) INTO v_missing
    FROM subscription_tiers
    WHERE is_featured = TRUE AND id IN ('starter','business','enterprise','agency');

    IF v_missing <> 1 THEN
        RAISE EXCEPTION 'Expected exactly 1 featured tier, found %. ROLLING BACK.', v_missing;
    END IF;

    RAISE NOTICE 'Marketing copy seeded for 4 public tiers; Business marked as featured.';
END $$;

COMMIT;


-- ============================================
-- POST-MIGRATION REVIEW QUERY
-- ============================================
-- SELECT id, name, tagline, jsonb_array_length(feature_highlights) AS bullet_count, cta_label, is_featured
-- FROM subscription_tiers
-- WHERE id IN ('starter','business','enterprise','agency')
-- ORDER BY display_order;
