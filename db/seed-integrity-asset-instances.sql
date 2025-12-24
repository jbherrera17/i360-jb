-- ============================================================
-- INSIGHT 360 - INTEGRITY ASSET INSTANCES (Example Data)
-- Concrete examples for the 7 Integrity asset types
-- Run AFTER: seed-integrity-asset-types.sql
-- ============================================================

-- ============================================================
-- 1. BRIGHT LINES (Example)
-- Non-negotiable ethical boundaries
-- ============================================================
INSERT INTO context_assets (
    id, user_id, asset_type, name, description,
    content_json, content_text, visibility, tags
) VALUES (
    'ca000000-0000-0000-0002-000000000001',
    NULL,
    'bright_lines',
    'Bright Lines - Example Template',
    'Example bright lines document showing non-negotiable ethical boundaries',
    '{
        "organization_name": "[Your Organization]",
        "last_reviewed": "2024-12-01",
        "bright_lines": [
            {
                "id": "BL-001",
                "name": "No Deceptive AI Outputs",
                "description": "AI-generated content must never be presented as human-created without disclosure. We do not use AI to deceive customers, partners, or the public.",
                "category": "customer_treatment",
                "test_question": "If a customer learned this content was AI-generated, would they feel deceived?",
                "violation_examples": [
                    "Publishing AI-written testimonials as customer quotes",
                    "Using AI to impersonate specific individuals",
                    "Generating fake reviews or endorsements"
                ],
                "enforcement_mechanism": "All AI content requires disclosure tag. Violations result in immediate removal and review.",
                "escalation_path": "Content creator -> Content lead -> Ethics committee",
                "date_established": "2024-01-01"
            },
            {
                "id": "BL-002",
                "name": "Customer Data Privacy",
                "description": "Customer data is never sold, shared with third parties for marketing, or used for purposes beyond what customers explicitly consented to.",
                "category": "data_privacy",
                "test_question": "Would customers be surprised or concerned if they knew how we were using their data?",
                "violation_examples": [
                    "Sharing customer lists with partners without consent",
                    "Using customer data to train AI models without disclosure",
                    "Retaining data beyond stated retention periods"
                ],
                "enforcement_mechanism": "Quarterly data audits, automated compliance checks, DPO review of new features.",
                "escalation_path": "Team lead -> DPO -> Legal -> CEO",
                "date_established": "2024-01-01"
            },
            {
                "id": "BL-003",
                "name": "No High-Pressure Sales",
                "description": "We never use artificial urgency, misleading scarcity, or manipulation tactics to close deals. Customers always have time to make informed decisions.",
                "category": "customer_treatment",
                "test_question": "Would this tactic make us uncomfortable if our competitors used it on us?",
                "violation_examples": [
                    "Fake countdown timers",
                    "Claiming limited availability when supply is ample",
                    "Pressuring customers to decide before they are ready"
                ],
                "enforcement_mechanism": "Sales call reviews, customer feedback monitoring, deal review process.",
                "escalation_path": "Sales manager -> Revenue lead -> CEO",
                "date_established": "2024-01-01"
            },
            {
                "id": "BL-004",
                "name": "Financial Integrity",
                "description": "All financial reporting is accurate and complete. We never manipulate metrics, revenue recognition, or financial statements.",
                "category": "financial_integrity",
                "test_question": "Would an auditor or investor be comfortable with this treatment?",
                "violation_examples": [
                    "Recognizing revenue before it is earned",
                    "Hiding expenses or liabilities",
                    "Manipulating metrics to hit targets"
                ],
                "enforcement_mechanism": "Monthly financial review, external audit, whistleblower hotline.",
                "escalation_path": "Controller -> CFO -> Board audit committee",
                "date_established": "2024-01-01"
            },
            {
                "id": "BL-005",
                "name": "Employee Psychological Safety",
                "description": "Retaliation against employees who raise concerns is never tolerated. Dissent is protected. Mistakes are learning opportunities, not punishment triggers.",
                "category": "employee_welfare",
                "test_question": "Would an employee feel safe raising this concern to leadership?",
                "violation_examples": [
                    "Punishing employees for escalating issues",
                    "Creating hostile environment for dissenters",
                    "Blaming individuals for systemic failures"
                ],
                "enforcement_mechanism": "Anonymous feedback channels, exit interview analysis, engagement surveys.",
                "escalation_path": "HR -> CHRO -> CEO -> Board",
                "date_established": "2024-01-01"
            }
        ],
        "review_cadence": "Quarterly review, annual comprehensive audit",
        "governance_owner": "Ethics Committee (CEO, CHRO, CLO)"
    }'::jsonb,
    'BRIGHT LINES - NON-NEGOTIABLE BOUNDARIES

Organization: [Your Organization]
Last Reviewed: December 2024

1. NO DECEPTIVE AI OUTPUTS
AI content must never be presented as human-created without disclosure.
Test: If a customer learned this was AI-generated, would they feel deceived?
Violations: Fake testimonials, AI impersonation, fake reviews

2. CUSTOMER DATA PRIVACY
Customer data never sold or used beyond explicit consent.
Test: Would customers be surprised by how we use their data?
Violations: Sharing lists without consent, training AI without disclosure

3. NO HIGH-PRESSURE SALES
No artificial urgency, misleading scarcity, or manipulation.
Test: Would we be uncomfortable if competitors used this on us?
Violations: Fake timers, false scarcity, pressure tactics

4. FINANCIAL INTEGRITY
All reporting accurate and complete. No metric manipulation.
Test: Would an auditor be comfortable with this treatment?
Violations: Early revenue recognition, hidden expenses

5. EMPLOYEE PSYCHOLOGICAL SAFETY
No retaliation for raising concerns. Dissent protected.
Test: Would an employee feel safe raising this concern?
Violations: Punishing escalation, hostile environment for dissenters

Review: Quarterly with annual comprehensive audit
Owner: Ethics Committee (CEO, CHRO, CLO)',
    'public',
    ARRAY['template', 'integrity', 'ethics', 'governance', 'bright-lines']
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================================
-- 2. VALUES MAP (Example)
-- Stated vs stress values analysis
-- ============================================================
INSERT INTO context_assets (
    id, user_id, asset_type, name, description,
    content_json, content_text, visibility, tags
) VALUES (
    'ca000000-0000-0000-0002-000000000002',
    NULL,
    'values_map',
    'Values Map - Example Template',
    'Example values map showing stated values vs behavior under stress',
    '{
        "organization_name": "[Your Organization]",
        "assessment_date": "2024-12-01",
        "values": [
            {
                "value_name": "Customer First",
                "stated_definition": "We prioritize customer success above all else. Happy customers drive our business.",
                "normal_behaviors": [
                    "Respond to support requests within 4 hours",
                    "Proactively reach out when we notice issues",
                    "Refund without question when we fall short"
                ],
                "stress_behaviors": [
                    "Support response times slip to 24+ hours",
                    "Focus shifts to new sales over existing customers",
                    "Refund requests get more scrutiny and pushback"
                ],
                "alignment_score": 4,
                "gap_description": "Under quota pressure, existing customer needs sometimes take back seat to new revenue",
                "improvement_actions": [
                    "Add customer health to compensation metrics",
                    "Create customer escalation fast-track during busy periods"
                ]
            },
            {
                "value_name": "Transparency",
                "stated_definition": "We share information openly internally and externally. No surprises.",
                "normal_behaviors": [
                    "All-hands with full financial updates",
                    "Roadmap shared publicly with customers",
                    "Mistakes acknowledged openly in retrospectives"
                ],
                "stress_behaviors": [
                    "Information gets held at leadership level longer",
                    "Bad news gets softened or delayed",
                    "Roadmap commitments become vague"
                ],
                "alignment_score": 3,
                "gap_description": "During uncertain periods, information flow slows significantly. Team feels out of loop.",
                "improvement_actions": [
                    "Commit to weekly updates regardless of news quality",
                    "Create safe channels for anonymous concerns"
                ]
            },
            {
                "value_name": "Ownership",
                "stated_definition": "We take responsibility for outcomes, not just activities. No finger-pointing.",
                "normal_behaviors": [
                    "Teams own metrics end-to-end",
                    "Post-mortems focus on systems, not individuals",
                    "People volunteer for hard problems"
                ],
                "stress_behaviors": [
                    "Blame shifts between teams",
                    "CYA documentation increases",
                    "People avoid high-risk projects"
                ],
                "alignment_score": 3,
                "gap_description": "When things go wrong under pressure, ownership breaks down. Teams protect themselves.",
                "improvement_actions": [
                    "Celebrate failed experiments to reinforce safety",
                    "Leadership publicly models owning mistakes"
                ]
            }
        ],
        "pressure_indicators": [
            "End of quarter/year revenue push",
            "Funding rounds or investor meetings",
            "Major product launches",
            "Customer escalations from key accounts",
            "Team capacity below 80% due to departures"
        ],
        "overall_drift_score": 3.3
    }'::jsonb,
    'VALUES MAP - STATED VS STRESS BEHAVIORS

Organization: [Your Organization]
Assessment Date: December 2024
Overall Drift Score: 3.3/5

CUSTOMER FIRST (Score: 4/5)
Stated: We prioritize customer success above all else.

Normal Behaviors:
- Respond to support within 4 hours
- Proactive outreach on issues
- Refund without question

Under Stress:
- Response times slip to 24+ hours
- Focus shifts to new sales
- Refund scrutiny increases

Gap: Quota pressure deprioritizes existing customers
Actions: Add customer health to comp, create escalation fast-track

TRANSPARENCY (Score: 3/5)
Stated: We share information openly. No surprises.

Normal Behaviors:
- All-hands with full financials
- Public roadmap
- Open retrospectives

Under Stress:
- Information held at leadership level
- Bad news softened/delayed
- Roadmap commitments vague

Gap: Information flow slows during uncertainty
Actions: Weekly updates regardless of news, anonymous channels

OWNERSHIP (Score: 3/5)
Stated: We take responsibility for outcomes, not activities.

Normal Behaviors:
- Teams own metrics end-to-end
- Post-mortems focus on systems
- People volunteer for hard problems

Under Stress:
- Blame shifts between teams
- CYA documentation increases
- People avoid high-risk projects

Gap: Ownership breaks down when things go wrong
Actions: Celebrate failed experiments, leadership models mistakes

PRESSURE INDICATORS:
- End of quarter revenue push
- Funding rounds
- Major product launches
- Key account escalations
- Team capacity below 80%',
    'public',
    ARRAY['template', 'integrity', 'values', 'culture', 'assessment']
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================================
-- 3. INTERVENTION METRICS (Example)
-- Human oversight effectiveness
-- ============================================================
INSERT INTO context_assets (
    id, user_id, asset_type, name, description,
    content_json, content_text, visibility, tags
) VALUES (
    'ca000000-0000-0000-0002-000000000003',
    NULL,
    'intervention_metrics',
    'Intervention Metrics - Example Template',
    'Example metrics for human oversight of AI systems',
    '{
        "period": "Q4 2024",
        "period_start": "2024-10-01",
        "period_end": "2024-12-31",
        "veto_metrics": {
            "ai_decisions_reviewed": 1250,
            "decisions_overridden": 45,
            "veto_rate_percent": 3.6,
            "veto_reasons": [
                {"reason": "Tone inappropriate for audience", "count": 18},
                {"reason": "Factual inaccuracy", "count": 12},
                {"reason": "Off-brand messaging", "count": 8},
                {"reason": "Compliance concern", "count": 5},
                {"reason": "Other", "count": 2}
            ]
        },
        "escalation_metrics": {
            "total_automated_decisions": 5000,
            "escalations_triggered": 312,
            "escalation_rate_percent": 6.2,
            "avg_escalations_per_day": 3.4,
            "escalation_triggers": [
                {"trigger_type": "Confidence below threshold", "count": 145},
                {"trigger_type": "Sensitive topic detected", "count": 89},
                {"trigger_type": "Customer tier escalation", "count": 45},
                {"trigger_type": "Manual review requested", "count": 33}
            ]
        },
        "pause_to_proceed": {
            "decisions_requiring_review": 312,
            "auto_approved_decisions": 4688,
            "deliberation_rate_percent": 6.2,
            "ratio_display": "1:15"
        },
        "trend_vs_prior_period": {
            "veto_rate_change": -0.8,
            "escalation_rate_change": 1.2,
            "deliberation_rate_change": 0.5
        },
        "notes": "Veto rate decreased, suggesting AI quality improving. Escalation rate increased due to new sensitive topic detection - this is expected and healthy as we expand coverage."
    }'::jsonb,
    'INTERVENTION METRICS - Q4 2024

Period: October 1 - December 31, 2024

VETO METRICS
AI Decisions Reviewed: 1,250
Decisions Overridden: 45
Veto Rate: 3.6%

Veto Reasons:
- Tone inappropriate: 18
- Factual inaccuracy: 12
- Off-brand messaging: 8
- Compliance concern: 5
- Other: 2

ESCALATION METRICS
Total Automated Decisions: 5,000
Escalations Triggered: 312
Escalation Rate: 6.2%
Avg Escalations/Day: 3.4

Triggers:
- Confidence below threshold: 145
- Sensitive topic detected: 89
- Customer tier escalation: 45
- Manual review requested: 33

PAUSE-TO-PROCEED RATIO
Decisions Requiring Review: 312
Auto-Approved: 4,688
Deliberation Rate: 6.2%
Ratio: 1:15

TRENDS VS PRIOR PERIOD
Veto Rate: -0.8% (improving)
Escalation Rate: +1.2% (expected - new detection)
Deliberation Rate: +0.5%

NOTES: Veto rate decreased, suggesting AI quality improving. Escalation rate increased due to new sensitive topic detection - this is expected and healthy.',
    'public',
    ARRAY['template', 'integrity', 'metrics', 'ai-oversight', 'governance']
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================================
-- 4. TRUST VELOCITY METRICS (Example)
-- Trust compounding vs erosion
-- ============================================================
INSERT INTO context_assets (
    id, user_id, asset_type, name, description,
    content_json, content_text, visibility, tags
) VALUES (
    'ca000000-0000-0000-0002-000000000004',
    NULL,
    'trust_velocity_metrics',
    'Trust Velocity Metrics - Example Template',
    'Example metrics for measuring trust accumulation vs erosion',
    '{
        "period": "Q4 2024",
        "period_start": "2024-10-01",
        "period_end": "2024-12-31",
        "relationship_longevity": {
            "total_active_customers": 847,
            "avg_tenure_months": 28.5,
            "prior_period_avg_tenure": 26.2,
            "rli_velocity_percent": 8.8
        },
        "forgiveness_rate": {
            "customers_experiencing_failure": 45,
            "customers_retained_post_failure": 41,
            "forgiveness_rate_percent": 91.1,
            "failure_types": [
                {"type": "Service outage", "count": 18, "retention_rate": 94.4},
                {"type": "Billing error", "count": 12, "retention_rate": 91.7},
                {"type": "Support failure", "count": 10, "retention_rate": 90.0},
                {"type": "Feature removal", "count": 5, "retention_rate": 80.0}
            ]
        },
        "referral_from_tenure": {
            "total_referrals": 67,
            "referrals_from_2plus_years": 52,
            "rft_rate_percent": 77.6,
            "rft_share_percent": 78.0
        },
        "employee_values_retention": {
            "judgment_role_employees_start": 45,
            "judgment_role_departures": 3,
            "evr_percent": 93.3,
            "overall_retention_percent": 88.0,
            "evr_delta": 5.3
        },
        "trust_trajectory": "compounding",
        "notes": "Strong quarter. Forgiveness rate remained high despite Q4 pressures. RFT indicates long-tenured customers are actively advocating. EVR positive delta suggests values-aligned employees staying at higher rates than average."
    }'::jsonb,
    'TRUST VELOCITY METRICS - Q4 2024

Period: October 1 - December 31, 2024
Trust Trajectory: COMPOUNDING

RELATIONSHIP LONGEVITY
Active Customers: 847
Avg Tenure: 28.5 months (up from 26.2)
RLI Velocity: +8.8% (trust compounding)

FORGIVENESS RATE
Customers Experiencing Failure: 45
Retained Post-Failure: 41
Forgiveness Rate: 91.1%

By Failure Type:
- Service outage: 94.4% retained
- Billing error: 91.7% retained
- Support failure: 90.0% retained
- Feature removal: 80.0% retained

REFERRAL FROM TENURE (RFT)
Total Referrals: 67
From 2+ Year Customers: 52
RFT Rate: 77.6%
RFT Share: 78% of all referrals

EMPLOYEE VALUES RETENTION (EVR)
Judgment Role Employees: 45
Departures: 3
EVR: 93.3%
Overall Retention: 88.0%
EVR Delta: +5.3% (positive = values-aligned staying)

NOTES: Strong quarter. Forgiveness rate high despite Q4 pressures. Long-tenured customers actively advocating. Values-aligned employees staying at higher rates.',
    'public',
    ARRAY['template', 'integrity', 'metrics', 'trust', 'retention']
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================================
-- 5. CLOSE CALL LOG (Example)
-- Near-miss documentation
-- ============================================================
INSERT INTO context_assets (
    id, user_id, asset_type, name, description,
    content_json, content_text, visibility, tags
) VALUES (
    'ca000000-0000-0000-0002-000000000005',
    NULL,
    'close_call_log',
    'Close Call Log - Example Template',
    'Example log of near-miss incidents prevented',
    '{
        "log_period": "Q4 2024",
        "total_close_calls": 7,
        "close_calls": [
            {
                "id": "CC-2024-001",
                "date": "2024-10-15",
                "category": "customer_impact",
                "severity": "severe",
                "what_almost_happened": "AI-generated email to 5,000 customers contained pricing that was 40% below actual rates due to hallucinated discount.",
                "how_it_was_caught": "QA reviewer flagged unusual pricing during pre-send review. Escalated to pricing team.",
                "who_intervened": "Sarah Chen (Content QA)",
                "system_or_process_involved": "Email campaign generation AI",
                "root_cause": "AI training data included outdated promotional pricing. No validation against current price list.",
                "corrective_action_taken": "Added price validation checkpoint. AI now cross-references current price database before including any pricing.",
                "estimated_impact_avoided": {
                    "financial": "$180,000 in underpriced commitments",
                    "reputational": "Customer confusion and trust damage",
                    "legal": "Potential obligation to honor incorrect pricing"
                },
                "lessons_learned": "Always validate AI outputs against source-of-truth databases for critical data like pricing."
            },
            {
                "id": "CC-2024-002",
                "date": "2024-11-03",
                "category": "compliance",
                "severity": "moderate",
                "what_almost_happened": "Sales deck for regulated industry client included claims that would have violated advertising standards.",
                "how_it_was_caught": "Account executive recognized claims were too strong during final review before client meeting.",
                "who_intervened": "Marcus Johnson (Enterprise AE)",
                "system_or_process_involved": "Sales deck generation AI",
                "root_cause": "AI optimized for persuasive language without compliance guardrails for regulated industries.",
                "corrective_action_taken": "Added industry-specific compliance rules to AI system. Flagged account automatically triggers compliance review.",
                "estimated_impact_avoided": {
                    "financial": "$50,000 potential regulatory fine",
                    "reputational": "Loss of credibility with compliance-conscious prospect",
                    "legal": "Regulatory investigation risk"
                },
                "lessons_learned": "Industry context must inform AI guardrails. Generic content rules insufficient for regulated sectors."
            },
            {
                "id": "CC-2024-003",
                "date": "2024-11-22",
                "category": "data_privacy",
                "severity": "severe",
                "what_almost_happened": "Customer case study draft included specific revenue figures that customer had shared in confidence.",
                "how_it_was_caught": "Customer success manager caught during approval workflow - knew those numbers were confidential.",
                "who_intervened": "Lisa Park (CSM)",
                "system_or_process_involved": "Case study content generation AI",
                "root_cause": "AI had access to full customer notes without classification of what was public vs confidential.",
                "corrective_action_taken": "Implemented data classification tagging. AI now blocked from accessing content tagged as confidential.",
                "estimated_impact_avoided": {
                    "financial": "Potential contract termination",
                    "reputational": "Breach of trust with key customer",
                    "legal": "NDA violation"
                },
                "lessons_learned": "Data classification is prerequisite for safe AI access to customer information."
            }
        ],
        "summary_by_category": [
            {"category": "customer_impact", "count": 2},
            {"category": "compliance", "count": 2},
            {"category": "data_privacy", "count": 2},
            {"category": "reputation", "count": 1}
        ],
        "trend_vs_prior": {
            "count_change": 2,
            "interpretation": "Increase reflects better detection (new escalation triggers) rather than more incidents. Close calls are being caught earlier in process."
        }
    }'::jsonb,
    'CLOSE CALL LOG - Q4 2024

Total Close Calls: 7
Trend vs Prior: +2 (better detection, not more incidents)

CLOSE CALL #1 - October 15, 2024
Category: Customer Impact | Severity: SEVERE
What Almost Happened: AI email to 5,000 customers had 40% underpriced offerings
Caught By: Sarah Chen (QA) during pre-send review
Root Cause: AI training included outdated promotional pricing
Impact Avoided: $180K financial, customer trust, potential legal obligation
Action: Added price validation checkpoint against current database
Lesson: Validate AI against source-of-truth for critical data

CLOSE CALL #2 - November 3, 2024
Category: Compliance | Severity: MODERATE
What Almost Happened: Sales deck for regulated client had non-compliant claims
Caught By: Marcus Johnson (AE) during final review
Root Cause: AI lacked industry-specific compliance guardrails
Impact Avoided: $50K potential fine, prospect credibility, regulatory risk
Action: Added industry-specific rules, auto-flag for compliance review
Lesson: Industry context must inform AI guardrails

CLOSE CALL #3 - November 22, 2024
Category: Data Privacy | Severity: SEVERE
What Almost Happened: Case study included confidential customer revenue figures
Caught By: Lisa Park (CSM) during approval workflow
Root Cause: AI accessed unclassified customer notes
Impact Avoided: Contract termination, trust breach, NDA violation
Action: Implemented data classification, blocked confidential access
Lesson: Data classification prerequisite for safe AI access

SUMMARY BY CATEGORY
- Customer Impact: 2
- Compliance: 2
- Data Privacy: 2
- Reputation: 1',
    'public',
    ARRAY['template', 'integrity', 'close-calls', 'risk', 'learning']
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================================
-- 6. INDUSTRY BASELINE (Example)
-- Counterfactual comparison data
-- ============================================================
INSERT INTO context_assets (
    id, user_id, asset_type, name, description,
    content_json, content_text, visibility, tags
) VALUES (
    'ca000000-0000-0000-0002-000000000006',
    NULL,
    'industry_baseline',
    'Industry Baseline - Example Template',
    'Example industry incident database for counterfactual analysis',
    '{
        "industry": "B2B SaaS / Technology",
        "baseline_period": "2020-2024",
        "last_updated": "2024-12-01",
        "estimated_companies_in_segment": 5000,
        "incident_categories": [
            {
                "category": "data_breach",
                "incidents_observed": 245,
                "incident_rate_percent": 4.9,
                "avg_cost": 425000,
                "severity_distribution": {
                    "minor_under_50k": 98,
                    "moderate_50k_500k": 112,
                    "severe_over_500k": 35
                },
                "notable_examples": [
                    {"company": "CompetitorA", "incident": "Customer database exposed", "outcome": "GDPR fine + class action", "cost": "$2.1M", "date": "2023-06"},
                    {"company": "IndustryPlayer", "incident": "API key leak", "outcome": "Data exfiltration of 50K records", "cost": "$890K", "date": "2024-02"}
                ]
            },
            {
                "category": "regulatory_action",
                "incidents_observed": 156,
                "incident_rate_percent": 3.1,
                "avg_cost": 185000,
                "severity_distribution": {
                    "minor_under_50k": 89,
                    "moderate_50k_500k": 52,
                    "severe_over_500k": 15
                },
                "notable_examples": [
                    {"company": "MarketLeader", "incident": "Deceptive pricing practices", "outcome": "FTC consent decree", "cost": "$1.5M", "date": "2023-11"}
                ]
            },
            {
                "category": "pr_crisis",
                "incidents_observed": 312,
                "incident_rate_percent": 6.2,
                "avg_cost": 275000,
                "severity_distribution": {
                    "minor_under_50k": 178,
                    "moderate_50k_500k": 98,
                    "severe_over_500k": 36
                },
                "notable_examples": [
                    {"company": "TechStartup", "incident": "AI bias in hiring tool", "outcome": "Customer exodus, leadership change", "cost": "$4.2M", "date": "2024-03"}
                ]
            }
        ],
        "we_dont_have_that_problem": [
            {"issue": "Customer data breaches", "industry_prevalence": "4.9%", "our_status": "0 incidents in 5 years", "attribution": "systemic"},
            {"issue": "Regulatory fines", "industry_prevalence": "3.1%", "our_status": "0 incidents", "attribution": "cultural"},
            {"issue": "Major PR crises", "industry_prevalence": "6.2%", "our_status": "0 incidents", "attribution": "cultural"},
            {"issue": "Employee discrimination claims", "industry_prevalence": "2.3%", "our_status": "0 claims", "attribution": "luck"}
        ],
        "protection_confidence_percent": 75,
        "compliance_cost_avoidance": {
            "calculation_method": "Industry Rate x Avg Cost x Years Operating",
            "years_operating": 5,
            "estimated_avoided_by_category": [
                {"category": "Data breach", "avg_cost": 425000, "rate_percent": 4.9, "avoided_amount": 104125},
                {"category": "Regulatory action", "avg_cost": 185000, "rate_percent": 3.1, "avoided_amount": 28675},
                {"category": "PR crisis", "avg_cost": 275000, "rate_percent": 6.2, "avoided_amount": 85250}
            ],
            "total_estimated_avoided": 218050
        },
        "sources": [
            "IBM Cost of a Data Breach Report 2024",
            "Ponemon Institute Industry Benchmarks",
            "Industry news and public filings analysis"
        ]
    }'::jsonb,
    'INDUSTRY BASELINE - B2B SaaS / Technology
Period: 2020-2024 | Companies in Segment: ~5,000

INCIDENT CATEGORY: DATA BREACH
Industry Rate: 4.9% | Average Cost: $425,000
Notable: CompetitorA - $2.1M (GDPR + class action)
Our Status: 0 incidents in 5 years (SYSTEMIC protection)

INCIDENT CATEGORY: REGULATORY ACTION
Industry Rate: 3.1% | Average Cost: $185,000
Notable: MarketLeader - $1.5M (FTC deceptive pricing)
Our Status: 0 incidents (CULTURAL protection)

INCIDENT CATEGORY: PR CRISIS
Industry Rate: 6.2% | Average Cost: $275,000
Notable: TechStartup - $4.2M (AI bias scandal)
Our Status: 0 incidents (CULTURAL protection)

WE DONT HAVE THAT PROBLEM ANALYSIS
- Data breaches: Systemic protection (controls)
- Regulatory fines: Cultural protection (values)
- PR crises: Cultural protection (values)
- Discrimination claims: LUCK (not tested)

Protection Confidence: 75% (3 of 4 protected intentionally)

COMPLIANCE COST AVOIDANCE (5 years)
- Data breach avoided: $104,125
- Regulatory avoided: $28,675
- PR crisis avoided: $85,250
TOTAL ESTIMATED AVOIDED: $218,050

Sources: IBM Data Breach Report, Ponemon Institute, Industry analysis',
    'public',
    ARRAY['template', 'integrity', 'baseline', 'counterfactual', 'risk']
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================================
-- 7. INTEGRITY YIELD (Example)
-- Composite score
-- ============================================================
INSERT INTO context_assets (
    id, user_id, asset_type, name, description,
    content_json, content_text, visibility, tags
) VALUES (
    'ca000000-0000-0000-0002-000000000007',
    NULL,
    'integrity_yield',
    'Integrity Yield - Example Template',
    'Example composite integrity score for stakeholder visibility',
    '{
        "period": "Q4 2024",
        "calculation_date": "2024-12-15",
        "composite_score": 78,
        "interpretation": "adequate",
        "components": {
            "trust_velocity": {
                "score": 85,
                "weight": 0.30,
                "weighted_contribution": 25.5
            },
            "intervention_effectiveness": {
                "score": 82,
                "weight": 0.25,
                "weighted_contribution": 20.5
            },
            "alignment_audit": {
                "score": 68,
                "weight": 0.25,
                "weighted_contribution": 17.0,
                "front_page_pass_rate": 94,
                "pressure_variance": 15
            },
            "counterfactual_value": {
                "score": 75,
                "weight": 0.20,
                "weighted_contribution": 15.0,
                "roi_ratio": 3.2
            }
        },
        "trend": {
            "prior_period_score": 74,
            "change": 4,
            "direction": "improving"
        },
        "leading_indicators": [
            {"indicator": "Escalation frequency", "status": "green", "note": "Stable at 6.2%"},
            {"indicator": "Values drift score", "status": "yellow", "note": "Slight decline under Q4 pressure"},
            {"indicator": "Close call frequency", "status": "green", "note": "Detection improving"},
            {"indicator": "EVR delta", "status": "green", "note": "+5.3% positive"},
            {"indicator": "Front page pass rate", "status": "green", "note": "94% passing"}
        ],
        "action_items": [
            "Address values drift under pressure - review Q4 decisions for patterns",
            "Continue close call documentation - detection is working",
            "Prepare integrity report for board Q1 meeting"
        ]
    }'::jsonb,
    'INTEGRITY YIELD - Q4 2024

COMPOSITE SCORE: 78/100 (Adequate)
Trend: +4 points (Improving)

COMPONENT BREAKDOWN

Trust Velocity (30% weight)
Score: 85 | Contribution: 25.5
Status: Strong - relationships compounding

Intervention Effectiveness (25% weight)
Score: 82 | Contribution: 20.5
Status: Good - human oversight working

Alignment Audit (25% weight)
Score: 68 | Contribution: 17.0
Front Page Pass Rate: 94%
Pressure Variance: 15%
Status: Watch - some drift under pressure

Counterfactual Value (20% weight)
Score: 75 | Contribution: 15.0
Integrity ROI: 3.2x
Status: Good - investment justified

LEADING INDICATORS
- Escalation frequency: GREEN (stable at 6.2%)
- Values drift score: YELLOW (slight decline under Q4 pressure)
- Close call frequency: GREEN (detection improving)
- EVR delta: GREEN (+5.3% positive)
- Front page pass rate: GREEN (94% passing)

ACTION ITEMS
1. Address values drift under pressure - review Q4 decisions
2. Continue close call documentation - detection working
3. Prepare integrity report for Q1 board meeting

INTERPRETATION: 78 = Adequate (60-79 range)
Organization has solid integrity foundation with room for improvement.
Primary concern: values alignment under pressure.',
    'public',
    ARRAY['template', 'integrity', 'composite-score', 'dashboard', 'governance']
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================================
-- NOW SETUP AGENT MAPPINGS
-- Connect integrity agents to these assets
-- ============================================================

-- Call the function to set up mappings (defined in seed-integrity-agents-v2.sql)
SELECT setup_integrity_agent_mappings();

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
DECLARE
    asset_count INTEGER;
    mapping_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO asset_count
    FROM context_assets
    WHERE id::text LIKE 'ca000000-0000-0000-0002-%'
    AND is_current = true;

    SELECT COUNT(*) INTO mapping_count
    FROM agent_context_mappings
    WHERE agent_id IN (
        'a0000000-0000-0000-0000-000000000101',
        'a0000000-0000-0000-0000-000000000102',
        'a0000000-0000-0000-0000-000000000103'
    );

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'INTEGRITY ASSET INSTANCES SEEDED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Integrity assets created: %', asset_count;
    RAISE NOTICE 'Agent-asset mappings created: %', mapping_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Assets Created:';
    RAISE NOTICE '  1. Bright Lines (non-negotiable boundaries)';
    RAISE NOTICE '  2. Values Map (stated vs stress behaviors)';
    RAISE NOTICE '  3. Intervention Metrics (human oversight)';
    RAISE NOTICE '  4. Trust Velocity Metrics (trust compounding)';
    RAISE NOTICE '  5. Close Call Log (near-misses)';
    RAISE NOTICE '  6. Industry Baseline (counterfactual data)';
    RAISE NOTICE '  7. Integrity Yield (composite score)';
    RAISE NOTICE '';
    RAISE NOTICE 'These are example templates. Users should';
    RAISE NOTICE 'customize with their organization data.';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'INTEGRITY SYSTEM READY';
    RAISE NOTICE 'Dashboard should now show data.';
    RAISE NOTICE '==============================================';
END $$;
