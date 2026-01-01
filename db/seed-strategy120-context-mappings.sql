-- ============================================================================
-- INSIGHT 360 - Strategy 120 Agent Context Mappings
-- Version: 1.0.0
-- Phase: 8 (Strategy 120 Module)
--
-- Maps context assets to Strategy 120 agents for automatic injection.
-- Run after: seed-strategy120-agents-part1.sql, seed-strategy120-agents-part2.sql
-- ============================================================================

-- ============================================================================
-- CONTEXT ASSET TYPE CATEGORIES FOR STRATEGY 120
-- ============================================================================
-- Strategic assets: strategic_foundation, vision_mission, core_values
-- BSC assets: bsc_objectives, strategic_themes, strategy_map
-- OKR assets: okr_hierarchy, okr_progress, key_results
-- Financial assets: financial_metrics, budget_data, roi_models
-- Market assets: market_intelligence, competitive_analysis, industry_trends
-- Operational assets: process_metrics, quality_data, efficiency_scores
-- HR assets: skills_inventory, engagement_data, capacity_planning

-- ============================================================================
-- FUNCTION: Setup Strategy 120 Agent Mappings
-- ============================================================================
-- This function creates context mappings for all Strategy 120 agents
-- Run after context assets have been populated

CREATE OR REPLACE FUNCTION setup_strategy120_agent_mappings()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_mapping_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Setting up Strategy 120 agent context mappings...';

    -- ========================================================================
    -- ORCHESTRATION AGENTS (321-323) - Need broad strategic context
    -- ========================================================================

    -- Strategy 120 Orchestrator (321) - needs everything
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000321'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['strategy', 'strategic', 'orchestrate', 'coordinate']
    FROM context_assets
    WHERE asset_type IN ('strategic_foundation', 'vision_mission', 'bsc_objectives', 'okr_hierarchy')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;
    GET DIAGNOSTICS v_mapping_count = ROW_COUNT;
    RAISE NOTICE '  - Strategy 120 Orchestrator: % mappings', v_mapping_count;

    -- Strategic Context Assembler (322) - pulls Align 120 outputs
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000322'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['context', 'align', 'alignment', 'gather']
    FROM context_assets
    WHERE asset_type IN ('strategic_foundation', 'core_values', 'stakeholder_map', 'swot_analysis')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;
    GET DIAGNOSTICS v_mapping_count = ROW_COUNT;
    RAISE NOTICE '  - Strategic Context Assembler: % mappings', v_mapping_count;

    -- Strategy Document Generator (323) - needs all strategy artifacts
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000323'::uuid,
        id,
        'conditional',
        90,
        false,
        ARRAY['document', 'report', 'generate', 'export', 'summary']
    FROM context_assets
    WHERE asset_type IN ('strategic_foundation', 'strategy_map', 'bsc_objectives', 'strategic_themes')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- ========================================================================
    -- PLANNING AGENTS (301-304) - Need BSC and OKR context
    -- ========================================================================

    -- Strategy Map Designer (301)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000301'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['strategy map', 'cause-effect', 'perspective', 'linkage']
    FROM context_assets
    WHERE asset_type IN ('bsc_objectives', 'strategic_themes', 'vision_mission')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;
    GET DIAGNOSTICS v_mapping_count = ROW_COUNT;
    RAISE NOTICE '  - Strategy Map Designer: % mappings', v_mapping_count;

    -- Strategic Theme Synthesizer (302)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000302'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['theme', 'synthesize', 'priorities', 'focus area']
    FROM context_assets
    WHERE asset_type IN ('swot_analysis', 'stakeholder_map', 'competitive_analysis')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- BSC-OKR Cascade Validator (303)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000303'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['cascade', 'alignment', 'validate', 'okr', 'bsc']
    FROM context_assets
    WHERE asset_type IN ('bsc_objectives', 'okr_hierarchy', 'okr_progress')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Leading/Lagging Indicator Classifier (304)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000304'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['indicator', 'leading', 'lagging', 'measure', 'kpi']
    FROM context_assets
    WHERE asset_type IN ('key_results', 'financial_metrics', 'operational_metrics')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- ========================================================================
    -- FINANCIAL PERSPECTIVE AGENTS (331-334) - Need financial context
    -- ========================================================================

    -- Revenue OKR Generator (331)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000331'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['revenue', 'growth', 'sales', 'income']
    FROM context_assets
    WHERE asset_type IN ('financial_metrics', 'revenue_data', 'sales_pipeline')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Profitability Tracker (332)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000332'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['profit', 'margin', 'cost', 'expense']
    FROM context_assets
    WHERE asset_type IN ('financial_metrics', 'cost_data', 'margin_analysis')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Cash Flow Optimizer (333)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000333'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['cash', 'liquidity', 'working capital', 'cash flow']
    FROM context_assets
    WHERE asset_type IN ('financial_metrics', 'cash_flow_data', 'budget_data')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- ROI Measurement Agent (334)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000334'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['roi', 'return', 'investment', 'payback']
    FROM context_assets
    WHERE asset_type IN ('roi_models', 'investment_data', 'financial_metrics')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- ========================================================================
    -- CUSTOMER PERSPECTIVE AGENTS (335-338) - Need customer context
    -- ========================================================================

    -- Customer Satisfaction Analyzer (335)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000335'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['satisfaction', 'nps', 'csat', 'feedback']
    FROM context_assets
    WHERE asset_type IN ('customer_metrics', 'nps_data', 'feedback_analysis')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Retention OKR Generator (336)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000336'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['retention', 'churn', 'loyalty', 'renewal']
    FROM context_assets
    WHERE asset_type IN ('customer_metrics', 'retention_data', 'churn_analysis')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Market Share Tracker (337)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000337'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['market share', 'competitive', 'positioning', 'market']
    FROM context_assets
    WHERE asset_type IN ('market_intelligence', 'competitive_analysis', 'market_data')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Customer Lifetime Value Agent (338)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000338'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['clv', 'lifetime value', 'customer value', 'ltv']
    FROM context_assets
    WHERE asset_type IN ('customer_metrics', 'revenue_data', 'customer_segments')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- ========================================================================
    -- PROCESS PERSPECTIVE AGENTS (339-342) - Need operational context
    -- ========================================================================

    -- Process Efficiency Analyzer (339)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000339'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['efficiency', 'bottleneck', 'throughput', 'process']
    FROM context_assets
    WHERE asset_type IN ('process_metrics', 'operational_metrics', 'efficiency_data')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Quality OKR Generator (340)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000340'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['quality', 'defect', 'error rate', 'accuracy']
    FROM context_assets
    WHERE asset_type IN ('quality_data', 'defect_metrics', 'process_metrics')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Cycle Time Optimizer (341)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000341'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['cycle time', 'lead time', 'duration', 'speed']
    FROM context_assets
    WHERE asset_type IN ('process_metrics', 'timing_data', 'sla_metrics')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Operational Excellence Agent (342)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000342'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['excellence', 'best practice', 'benchmark', 'optimization']
    FROM context_assets
    WHERE asset_type IN ('industry_baseline', 'benchmark_data', 'best_practices')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- ========================================================================
    -- LEARNING & GROWTH AGENTS (343-346) - Need HR/capability context
    -- ========================================================================

    -- Skills Gap OKR Analyzer (343)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000343'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['skills', 'capability', 'gap', 'competency']
    FROM context_assets
    WHERE asset_type IN ('skills_inventory', 'capability_map', 'training_data')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- AI Upskilling OKR Generator (344)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000344'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['ai', 'upskill', 'training', 'learning']
    FROM context_assets
    WHERE asset_type IN ('ai_readiness', 'training_data', 'skills_inventory')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Culture & Engagement Tracker (345)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000345'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['culture', 'engagement', 'employee', 'satisfaction']
    FROM context_assets
    WHERE asset_type IN ('engagement_data', 'culture_metrics', 'employee_surveys')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Innovation Capacity Agent (346)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000346'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['innovation', 'ideas', 'r&d', 'new product']
    FROM context_assets
    WHERE asset_type IN ('innovation_metrics', 'idea_pipeline', 'r_and_d_data')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- ========================================================================
    -- INVESTMENT PLANNING AGENTS (305-308) - Need financial/resource context
    -- ========================================================================

    -- Business Case Builder (305)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000305'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['business case', 'roi', 'investment', 'proposal']
    FROM context_assets
    WHERE asset_type IN ('financial_metrics', 'roi_models', 'budget_data')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Scenario Modeler (306)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000306'::uuid,
        id,
        'conditional',
        90,
        false,
        ARRAY['scenario', 'what-if', 'model', 'projection']
    FROM context_assets
    WHERE asset_type IN ('financial_metrics', 'market_intelligence', 'risk_assessment')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Resource Planner (307)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000307'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['resource', 'capacity', 'headcount', 'budget']
    FROM context_assets
    WHERE asset_type IN ('capacity_planning', 'budget_data', 'headcount_data')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Dependency Mapper (308)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000308'::uuid,
        id,
        'conditional',
        80,
        false,
        ARRAY['dependency', 'prerequisite', 'sequence', 'blocking']
    FROM context_assets
    WHERE asset_type IN ('project_data', 'initiative_map', 'dependency_data')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- ========================================================================
    -- INTELLIGENCE AGENTS (309-312) - Need market/competitive context
    -- ========================================================================

    -- Market Intelligence Scout (309)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000309'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['market', 'trend', 'opportunity', 'intelligence']
    FROM context_assets
    WHERE asset_type IN ('market_intelligence', 'industry_trends', 'opportunity_map')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Technology Radar Analyst (310)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000310'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['technology', 'ai', 'emerging', 'tech']
    FROM context_assets
    WHERE asset_type IN ('technology_radar', 'ai_trends', 'tech_assessment')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Regulatory Monitor (311)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000311'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['regulation', 'compliance', 'legal', 'policy']
    FROM context_assets
    WHERE asset_type IN ('regulatory_data', 'compliance_requirements', 'policy_changes')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Best Practice Researcher (312)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000312'::uuid,
        id,
        'conditional',
        80,
        false,
        ARRAY['best practice', 'benchmark', 'case study', 'example']
    FROM context_assets
    WHERE asset_type IN ('best_practices', 'case_studies', 'industry_baseline')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- ========================================================================
    -- DECISION SUPPORT AGENTS (313-316) - Need broad strategic context
    -- ========================================================================

    -- Decision Framer (313)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000313'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['decision', 'option', 'criteria', 'choose']
    FROM context_assets
    WHERE asset_type IN ('strategic_foundation', 'core_values', 'decision_framework')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Risk-Benefit Analyzer (314)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000314'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['risk', 'benefit', 'tradeoff', 'analysis']
    FROM context_assets
    WHERE asset_type IN ('risk_assessment', 'financial_metrics', 'impact_analysis')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Assumption Tester (315)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000315'::uuid,
        id,
        'conditional',
        90,
        false,
        ARRAY['assumption', 'challenge', 'validate', 'test']
    FROM context_assets
    WHERE asset_type IN ('market_intelligence', 'historical_data', 'competitive_analysis')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Second Opinion Generator (316)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000316'::uuid,
        id,
        'conditional',
        80,
        false,
        ARRAY['alternative', 'perspective', 'opinion', 'view']
    FROM context_assets
    WHERE asset_type IN ('strategic_foundation', 'stakeholder_map', 'core_values')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- ========================================================================
    -- GOVERNANCE AGENTS (317-320) - Need strategy health context
    -- ========================================================================

    -- Strategy Health Monitor (317)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000317'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['health', 'status', 'monitor', 'check']
    FROM context_assets
    WHERE asset_type IN ('okr_progress', 'bsc_objectives', 'health_metrics')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Drift Detector (318)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000318'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['drift', 'deviation', 'variance', 'off-track']
    FROM context_assets
    WHERE asset_type IN ('strategic_foundation', 'okr_progress', 'baseline_metrics')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Quarterly Review Facilitator (319)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000319'::uuid,
        id,
        'always',
        100,
        true,
        ARRAY['review', 'quarterly', 'qbr', 'meeting']
    FROM context_assets
    WHERE asset_type IN ('okr_progress', 'bsc_objectives', 'financial_metrics', 'decision_log')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    -- Strategy Communicator (320)
    INSERT INTO agent_context_mappings (agent_id, asset_id, injection_mode, priority, is_required, trigger_keywords)
    SELECT
        'a0000000-0000-0000-0000-000000000320'::uuid,
        id,
        'conditional',
        80,
        false,
        ARRAY['communicate', 'message', 'stakeholder', 'update']
    FROM context_assets
    WHERE asset_type IN ('strategic_foundation', 'stakeholder_map', 'strategic_themes')
    AND is_current = true
    ON CONFLICT (agent_id, asset_id) DO UPDATE SET
        injection_mode = EXCLUDED.injection_mode,
        priority = EXCLUDED.priority;

    RAISE NOTICE 'Strategy 120 agent context mappings setup complete!';
END;
$$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Shows mapping counts per agent after running the function

CREATE OR REPLACE VIEW strategy120_mapping_summary AS
SELECT
    a.id,
    a.name as agent_name,
    a.category,
    COUNT(acm.id) as mapping_count,
    STRING_AGG(DISTINCT acm.injection_mode, ', ') as injection_modes
FROM agents a
LEFT JOIN agent_context_mappings acm ON a.id = acm.agent_id
WHERE a.suite = 'strategy'
GROUP BY a.id, a.name, a.category
ORDER BY
    CASE a.category
        WHEN 'orchestration' THEN 1
        WHEN 'platform' THEN 2
        WHEN 'planning' THEN 3
        WHEN 'financial_perspective' THEN 4
        WHEN 'customer_perspective' THEN 5
        WHEN 'process_perspective' THEN 6
        WHEN 'learning_perspective' THEN 7
        WHEN 'investment' THEN 8
        WHEN 'intelligence' THEN 9
        WHEN 'decision_support' THEN 10
        WHEN 'governance' THEN 11
    END,
    a.id;

-- ============================================================================
-- USAGE NOTES
-- ============================================================================
-- 1. First ensure context_assets table has relevant assets seeded
-- 2. Run the setup function: SELECT setup_strategy120_agent_mappings();
-- 3. Verify with: SELECT * FROM strategy120_mapping_summary;
--
-- Injection modes:
--   'always'      - Inject on every agent invocation
--   'conditional' - Inject when trigger_keywords match user query
--   'on_demand'   - Only inject when explicitly requested
-- ============================================================================

COMMENT ON FUNCTION setup_strategy120_agent_mappings() IS
'Creates context mappings for all 35 Strategy 120 agents based on their roles and BSC perspectives';

COMMENT ON VIEW strategy120_mapping_summary IS
'Summary view showing context mapping counts per Strategy 120 agent';
