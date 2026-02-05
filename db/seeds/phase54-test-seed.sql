-- ============================================
-- Phase 54 Test Seed Data
-- Multi-Tenant Hierarchy for Automated Testing
-- ============================================
--
-- This seed creates a complete test hierarchy:
--
-- Synergi (Platform - already exists)
-- ├── Acme Corp (Business tier org)
-- │   ├── Marketing Dept
-- │   └── Sales Dept
-- ├── TechStartup (Starter tier org)
-- └── Creative Agency (Agency tier)
--     ├── Client: LocalBakery
--     ├── Client: FitnessGym
--     └── Client: LawFirm
--
-- ============================================

-- ============================================
-- 1. TEST USERS
-- ============================================

-- Platform admin (Synergi)
INSERT INTO users (id, email, display_name, role, created_at)
VALUES
    ('test-platform-admin-001', 'platform.admin@synergi.test', 'Platform Admin', 'admin', NOW()),
    ('test-acme-owner-001', 'owner@acme.test', 'Acme Owner', 'user', NOW()),
    ('test-acme-member-001', 'member@acme.test', 'Acme Member', 'user', NOW()),
    ('test-startup-owner-001', 'owner@startup.test', 'Startup Owner', 'user', NOW()),
    ('test-agency-owner-001', 'owner@agency.test', 'Agency Owner', 'user', NOW()),
    ('test-agency-member-001', 'member@agency.test', 'Agency Member', 'user', NOW())
ON CONFLICT (id) DO NOTHING;

-- Platform admin record
INSERT INTO platform_admins (user_id, role, granted_by, created_at)
VALUES ('test-platform-admin-001', 'super_admin', 'test-platform-admin-001', NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. SUBSCRIPTION TIERS (if not exist)
-- ============================================

INSERT INTO subscription_tiers (id, name, slug, max_members, max_clients, max_agents, max_workflows, features, is_active, sort_order)
VALUES
    ('tier-starter-001', 'Starter', 'starter', 3, 0, 5, 3,
     '{"basic_modules": true, "sso": false, "white_label": false, "priority_support": false}'::jsonb,
     true, 1),
    ('tier-business-001', 'Business', 'business', 10, 0, 25, 15,
     '{"basic_modules": true, "align120": true, "research_studio": true, "thought_leadership": true, "sso": false, "white_label": false}'::jsonb,
     true, 2),
    ('tier-enterprise-001', 'Enterprise', 'enterprise', 100, 0, 100, 50,
     '{"basic_modules": true, "align120": true, "research_studio": true, "thought_leadership": true, "sso": true, "priority_support": true, "white_label": false}'::jsonb,
     true, 3),
    ('tier-agency-001', 'Agency', 'agency', 50, 100, 200, 100,
     '{"basic_modules": true, "align120": true, "research_studio": true, "thought_leadership": true, "sso": true, "priority_support": true, "white_label": true, "client_portal": true}'::jsonb,
     true, 4)
ON CONFLICT (id) DO UPDATE SET
    features = EXCLUDED.features,
    max_members = EXCLUDED.max_members,
    max_clients = EXCLUDED.max_clients,
    max_agents = EXCLUDED.max_agents;

-- ============================================
-- 3. ORGANIZATIONS
-- ============================================

-- Acme Corp (Business tier)
INSERT INTO organizations (id, name, slug, org_type, subscription_tier, settings, created_by, created_at)
VALUES (
    'test-org-acme-001',
    'Acme Corporation',
    'acme-corp',
    'standard',
    'tier-business-001',
    '{"industry": "Manufacturing", "size": "mid-market"}'::jsonb,
    'test-acme-owner-001',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- TechStartup (Starter tier)
INSERT INTO organizations (id, name, slug, org_type, subscription_tier, settings, created_by, created_at)
VALUES (
    'test-org-startup-001',
    'TechStartup Inc',
    'tech-startup',
    'standard',
    'tier-starter-001',
    '{"industry": "Technology", "size": "startup"}'::jsonb,
    'test-startup-owner-001',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Creative Agency (Agency tier)
INSERT INTO organizations (id, name, slug, org_type, subscription_tier, settings, created_by, created_at)
VALUES (
    'test-org-agency-001',
    'Creative Agency Partners',
    'creative-agency',
    'agency',
    'tier-agency-001',
    '{"industry": "Marketing", "size": "agency", "white_label_enabled": true}'::jsonb,
    'test-agency-owner-001',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. ORGANIZATION MEMBERS
-- ============================================

INSERT INTO organization_members (org_id, user_id, role, business_role, status, created_at)
VALUES
    -- Acme Corp members
    ('test-org-acme-001', 'test-acme-owner-001', 'owner', 'executive', 'active', NOW()),
    ('test-org-acme-001', 'test-acme-member-001', 'member', 'manager', 'active', NOW()),
    -- TechStartup members
    ('test-org-startup-001', 'test-startup-owner-001', 'owner', 'founder', 'active', NOW()),
    -- Creative Agency members
    ('test-org-agency-001', 'test-agency-owner-001', 'owner', 'executive', 'active', NOW()),
    ('test-org-agency-001', 'test-agency-member-001', 'member', 'account_manager', 'active', NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. DEPARTMENTS (for Acme Corp)
-- ============================================

INSERT INTO departments (id, org_id, name, slug, description, created_at)
VALUES
    ('test-dept-marketing-001', 'test-org-acme-001', 'Marketing', 'marketing', 'Brand and demand generation', NOW()),
    ('test-dept-sales-001', 'test-org-acme-001', 'Sales', 'sales', 'Revenue and client relationships', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. CLIENTS (for Creative Agency)
-- ============================================

INSERT INTO clients (id, org_id, name, slug, industry, status, created_at)
VALUES
    ('test-client-bakery-001', 'test-org-agency-001', 'LocalBakery', 'local-bakery', 'Food & Beverage', 'active', NOW()),
    ('test-client-gym-001', 'test-org-agency-001', 'FitnessGym', 'fitness-gym', 'Health & Fitness', 'active', NOW()),
    ('test-client-law-001', 'test-org-agency-001', 'LawFirm Associates', 'law-firm', 'Legal Services', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. TEST AGENTS
-- ============================================

INSERT INTO agents (id, name, description, system_prompt, model, is_system, is_active, user_id, org_id, category, created_at)
VALUES
    -- Acme agents
    ('test-agent-acme-001', 'Acme Assistant', 'General assistant for Acme Corp', 'You are Acme helpful assistant.', 'claude-sonnet-4-20250514', false, true, 'test-acme-owner-001', 'test-org-acme-001', 'general', NOW()),
    -- TechStartup agents
    ('test-agent-startup-001', 'Startup Helper', 'Startup assistant', 'You help the startup.', 'claude-sonnet-4-20250514', false, true, 'test-startup-owner-001', 'test-org-startup-001', 'general', NOW()),
    -- Agency agents
    ('test-agent-agency-001', 'Agency Brand Voice', 'Agency brand assistant', 'You represent the agency.', 'claude-sonnet-4-20250514', false, true, 'test-agency-owner-001', 'test-org-agency-001', 'general', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 8. PLATFORM MODULES (if not exist)
-- ============================================

INSERT INTO platform_modules (id, name, slug, description, min_tier, min_business_role, is_active, sort_order)
VALUES
    ('module-chat-001', 'Chat', 'chat', 'AI Chat interface', 'starter', NULL, true, 1),
    ('module-agents-001', 'Agents', 'agents', 'Agent management', 'starter', NULL, true, 2),
    ('module-context-001', 'Context', 'context', 'Context asset management', 'starter', NULL, true, 3),
    ('module-align120-001', 'Align 120', 'align_120', 'Values alignment workshop', 'business', 'manager', true, 10),
    ('module-research-001', 'Research Studio', 'research_studio', 'Deep research capabilities', 'business', NULL, true, 11),
    ('module-thought-001', 'Thought Leadership', 'thought_leadership', 'Content creation studio', 'business', NULL, true, 12),
    ('module-soul-config-001', 'Soul Configuration', 'soul_configuration', 'Values and ethics configuration', 'business', 'executive', true, 20),
    ('module-integrity-001', 'Integrity Metrics', 'integrity_metrics', 'Ethics monitoring dashboard', 'business', 'manager', true, 21),
    ('module-client-portal-001', 'Client Portal', 'client_portal', 'Agency client management', 'agency', 'account_manager', true, 30),
    ('module-white-label-001', 'White Label', 'white_label', 'Custom branding', 'agency', 'executive', true, 31)
ON CONFLICT (id) DO UPDATE SET
    min_tier = EXCLUDED.min_tier,
    min_business_role = EXCLUDED.min_business_role;

-- ============================================
-- 9. SOUL CONFIGURATIONS
-- ============================================

-- Platform soul config (already exists from schema, but ensure it's there)
INSERT INTO soul_configurations (
    id,
    scope_type,
    identity,
    values,
    bright_lines,
    guardrails,
    voice,
    is_draft,
    is_active,
    completeness_score,
    created_by,
    created_at
)
VALUES (
    'test-soul-platform-001',
    'platform',
    '{
        "name": "Higgins",
        "role": "Chief of Staff AI",
        "archetype": "Trusted Butler",
        "temperament": "professional"
    }'::jsonb,
    '[
        {"name": "Integrity", "meaning": "Doing what is right even when no one is watching", "priority": 1, "non_negotiable": true},
        {"name": "Transparency", "meaning": "Being open about reasoning and limitations", "priority": 2, "non_negotiable": true},
        {"name": "Privacy", "meaning": "Protecting sensitive information", "priority": 3, "non_negotiable": true}
    ]'::jsonb,
    '[
        {"name": "Human Safety First", "description": "Never provide information designed to facilitate harm to humans", "level": "platform", "test_question": "Could this cause physical or psychological harm?"},
        {"name": "No Deception", "description": "Always identify as AI when asked", "level": "platform", "test_question": "Am I being fully honest about my nature?"},
        {"name": "Privacy Protection", "description": "Never store or transmit sensitive data outside approved systems", "level": "platform", "test_question": "Am I handling personal data appropriately?"}
    ]'::jsonb,
    '{
        "communication": ["Avoid jargon", "Match user communication style", "Ask for clarification when uncertain"],
        "decision": ["Recommend human review for significant decisions", "Present multiple options"],
        "scope": ["Stay within role boundaries", "Escalate requests exceeding capabilities"],
        "emotional": ["Recognize signs of distress", "Maintain supportive tone"]
    }'::jsonb,
    '{
        "tone": ["professional", "helpful", "concise"],
        "avoid": ["jargon", "buzzwords"],
        "personality_temperature": 0.5
    }'::jsonb,
    false,
    true,
    85,
    'test-platform-admin-001',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Acme Corp soul config (organization level)
INSERT INTO soul_configurations (
    id,
    scope_type,
    org_id,
    identity,
    values,
    bright_lines,
    guardrails,
    voice,
    domain,
    is_draft,
    is_active,
    completeness_score,
    created_by,
    created_at
)
VALUES (
    'test-soul-acme-001',
    'organization',
    'test-org-acme-001',
    '{
        "name": "Ace",
        "role": "Acme Strategic Partner",
        "archetype": "Trusted Advisor",
        "temperament": "warm_professional"
    }'::jsonb,
    '[
        {"name": "Quality First", "meaning": "Never compromise on product quality", "priority": 1, "non_negotiable": true, "behaviors": ["Verify specifications before commitment", "Report quality concerns immediately"]},
        {"name": "Customer Success", "meaning": "Our success is measured by customer outcomes", "priority": 2, "non_negotiable": false, "behaviors": ["Follow up on deliveries", "Proactive issue resolution"]},
        {"name": "Innovation", "meaning": "Continuously improve our processes and products", "priority": 3, "non_negotiable": false, "behaviors": ["Suggest efficiency improvements", "Track industry trends"]}
    ]'::jsonb,
    '[
        {"name": "No Competitor Sharing", "description": "Never share proprietary information with competitors", "level": "organization", "test_question": "Would this benefit a competitor?"},
        {"name": "Regulatory Compliance", "description": "Always comply with manufacturing regulations", "level": "organization", "test_question": "Is this action compliant with regulations?"}
    ]'::jsonb,
    '{
        "communication": ["Use manufacturing terminology appropriately", "Be direct with timelines"],
        "decision": ["Consult engineering for technical decisions", "Document material changes"]
    }'::jsonb,
    '{
        "tone": ["professional", "precise", "reliable"],
        "avoid": ["marketing speak", "vague commitments"],
        "personality_temperature": 0.4,
        "sample_phrases": ["Let me verify those specifications.", "Quality is our top priority."]
    }'::jsonb,
    '{
        "industry": "Manufacturing",
        "key_terms": [
            {"term": "SKU", "definition": "Stock Keeping Unit"},
            {"term": "Lead Time", "definition": "Time from order to delivery"},
            {"term": "MOQ", "definition": "Minimum Order Quantity"}
        ],
        "products": ["Industrial Components", "Custom Machinery", "Replacement Parts"]
    }'::jsonb,
    false,
    true,
    78,
    'test-acme-owner-001',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Creative Agency soul config (organization level)
INSERT INTO soul_configurations (
    id,
    scope_type,
    org_id,
    identity,
    values,
    bright_lines,
    guardrails,
    voice,
    domain,
    is_draft,
    is_active,
    completeness_score,
    created_by,
    created_at
)
VALUES (
    'test-soul-agency-001',
    'organization',
    'test-org-agency-001',
    '{
        "name": "Creative Assistant",
        "role": "Agency Brand Partner",
        "archetype": "Creative Director",
        "temperament": "energetic_professional"
    }'::jsonb,
    '[
        {"name": "Creative Excellence", "meaning": "Deliver work that inspires and converts", "priority": 1, "non_negotiable": true},
        {"name": "Client Partnership", "meaning": "Treat client goals as our own", "priority": 2, "non_negotiable": true},
        {"name": "Brand Integrity", "meaning": "Protect and enhance brand identities", "priority": 3, "non_negotiable": false}
    ]'::jsonb,
    '[
        {"name": "Client Confidentiality", "description": "Never share client work or strategies between clients", "level": "organization", "test_question": "Would sharing this compromise client trust?"},
        {"name": "No Plagiarism", "description": "All work must be original or properly licensed", "level": "organization", "test_question": "Is this original or properly attributed?"}
    ]'::jsonb,
    '{
        "communication": ["Speak in brand voice for each client", "Maintain creative enthusiasm"],
        "decision": ["Get creative director approval for major campaigns"]
    }'::jsonb,
    '{
        "tone": ["creative", "strategic", "client-focused"],
        "avoid": ["cliches", "overused phrases"],
        "personality_temperature": 0.7
    }'::jsonb,
    '{
        "industry": "Marketing & Advertising",
        "key_terms": [
            {"term": "CTA", "definition": "Call to Action"},
            {"term": "Brand Guidelines", "definition": "Rules for brand representation"}
        ]
    }'::jsonb,
    false,
    true,
    72,
    'test-agency-owner-001',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- LocalBakery client soul config
INSERT INTO soul_configurations (
    id,
    scope_type,
    org_id,
    client_id,
    identity,
    values,
    voice,
    domain,
    is_draft,
    is_active,
    completeness_score,
    created_by,
    created_at
)
VALUES (
    'test-soul-bakery-001',
    'client',
    'test-org-agency-001',
    'test-client-bakery-001',
    '{
        "name": "Baker Bot",
        "role": "LocalBakery Brand Voice",
        "archetype": "Friendly Neighbor"
    }'::jsonb,
    '[
        {"name": "Freshness", "meaning": "Everything made fresh daily", "priority": 1},
        {"name": "Community", "meaning": "We are part of the neighborhood", "priority": 2}
    ]'::jsonb,
    '{
        "tone": ["warm", "homey", "welcoming"],
        "avoid": ["corporate speak", "technical terms"],
        "personality_temperature": 0.8,
        "sample_phrases": ["Fresh from our ovens to your table!", "Made with love, just like grandma used to."]
    }'::jsonb,
    '{
        "industry": "Food & Beverage",
        "products": ["Artisan Breads", "Pastries", "Custom Cakes", "Seasonal Treats"]
    }'::jsonb,
    false,
    true,
    55,
    'test-agency-owner-001',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Agent-level soul config for Acme agent
INSERT INTO soul_configurations (
    id,
    scope_type,
    org_id,
    agent_id,
    identity,
    voice,
    is_draft,
    is_active,
    completeness_score,
    created_by,
    created_at
)
VALUES (
    'test-soul-agent-001',
    'agent',
    'test-org-acme-001',
    'test-agent-acme-001',
    '{
        "name": "Ace",
        "role": "Manufacturing Support Specialist",
        "archetype": "Technical Expert"
    }'::jsonb,
    '{
        "tone": ["technical", "efficient", "helpful"],
        "personality_temperature": 0.3
    }'::jsonb,
    false,
    true,
    35,
    'test-acme-owner-001',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 10. ETHICAL EVALUATIONS (Sample Data)
-- ============================================

INSERT INTO ethical_evaluations (
    id,
    org_id,
    agent_id,
    user_id,
    soul_config_id,
    decision_summary,
    decision_type,
    stakes_level,
    step_1_issues,
    step_3_lens_analysis,
    automated,
    requires_human_review,
    created_at
)
VALUES (
    'test-eval-001',
    'test-org-acme-001',
    'test-agent-acme-001',
    'test-acme-member-001',
    'test-soul-acme-001',
    'Customer requested expedited shipping that would require overtime, impacting work-life balance',
    'recommendation',
    'medium',
    '{"ethical_issues": ["work-life balance vs customer satisfaction"], "stakeholders": ["employees", "customer", "company"]}'::jsonb,
    '{"utilitarian": {"score": 7, "notes": "Benefits outweigh costs short-term"}, "care_ethics": {"score": 5, "notes": "Employee wellbeing is a concern"}}'::jsonb,
    true,
    false,
    NOW() - INTERVAL '2 days'
),
(
    'test-eval-002',
    'test-org-acme-001',
    'test-agent-acme-001',
    'test-acme-owner-001',
    'test-soul-acme-001',
    'Legal team asking for advice on employee termination process',
    'recommendation',
    'high',
    '{"ethical_issues": ["employee rights", "fairness", "legal compliance"], "stakeholders": ["employee", "company", "remaining team"]}'::jsonb,
    '{"rights": {"score": 8, "notes": "Must respect employee rights"}, "justice": {"score": 9, "notes": "Fair process required"}}'::jsonb,
    true,
    true,
    NOW() - INTERVAL '1 day'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 11. BRIGHT LINE INCIDENTS (Sample Data)
-- ============================================

INSERT INTO bright_line_incidents (
    id,
    org_id,
    soul_config_id,
    bright_line_name,
    bright_line_level,
    incident_type,
    severity,
    description,
    conversation_id,
    agent_id,
    reported_by,
    status,
    created_at
)
VALUES (
    'test-incident-001',
    'test-org-acme-001',
    'test-soul-acme-001',
    'No Competitor Sharing',
    'organization',
    'near_miss',
    'medium',
    'Agent almost shared product roadmap details with unverified party. Caught before disclosure.',
    NULL,
    'test-agent-acme-001',
    'test-acme-member-001',
    'resolved',
    NOW() - INTERVAL '5 days'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 12. VALUES ALIGNMENT AUDIT (Sample)
-- ============================================

INSERT INTO values_alignment_audits (
    id,
    org_id,
    soul_config_id,
    audit_date,
    stated_values,
    discovered_values,
    alignment_scores,
    overall_score,
    drift_detected,
    drift_details,
    recommendations,
    audited_by,
    audit_method,
    created_at
)
VALUES (
    'test-audit-001',
    'test-org-acme-001',
    'test-soul-acme-001',
    CURRENT_DATE - 7,
    '[{"name": "Quality First", "priority": 1}, {"name": "Customer Success", "priority": 2}]'::jsonb,
    '[{"name": "Quality", "evidence_count": 45}, {"name": "Efficiency", "evidence_count": 38}, {"name": "Customer Focus", "evidence_count": 25}]'::jsonb,
    '{"Quality First": {"stated": 1, "discovered": 1, "score": 95}, "Customer Success": {"stated": 2, "discovered": 3, "score": 78}}'::jsonb,
    86.5,
    false,
    '{"missing_values": [], "conflicting_values": [], "gaps": ["Customer Success could be emphasized more in daily interactions"]}'::jsonb,
    '[{"issue": "Customer Success slightly under-emphasized", "recommendation": "Add more customer-focused prompts", "priority": "low"}]'::jsonb,
    'test-acme-owner-001',
    'automated',
    NOW() - INTERVAL '7 days'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify test data was inserted
SELECT 'Users' as entity, COUNT(*) as count FROM users WHERE id LIKE 'test-%';
SELECT 'Organizations' as entity, COUNT(*) as count FROM organizations WHERE id LIKE 'test-%';
SELECT 'Departments' as entity, COUNT(*) as count FROM departments WHERE id LIKE 'test-%';
SELECT 'Clients' as entity, COUNT(*) as count FROM clients WHERE id LIKE 'test-%';
SELECT 'Agents' as entity, COUNT(*) as count FROM agents WHERE id LIKE 'test-%';
SELECT 'Soul Configs' as entity, COUNT(*) as count FROM soul_configurations WHERE id LIKE 'test-%';
SELECT 'Ethical Evaluations' as entity, COUNT(*) as count FROM ethical_evaluations WHERE id LIKE 'test-%';
SELECT 'Bright Line Incidents' as entity, COUNT(*) as count FROM bright_line_incidents WHERE id LIKE 'test-%';
SELECT 'Values Audits' as entity, COUNT(*) as count FROM values_alignment_audits WHERE id LIKE 'test-%';
