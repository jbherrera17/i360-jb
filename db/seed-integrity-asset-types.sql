-- ============================================================
-- INSIGHT 360 - INTEGRITY METRICS ASSET TYPES
-- 7 New Asset Types for Integrity Framework Integration
-- Run this AFTER phase3-schema.sql and seed-asset-types.sql
-- ============================================================

-- ============================================================
-- FOUNDATION LAYER (2 Types)
-- ============================================================

INSERT INTO context_asset_types (type_key, display_name, description, icon, sort_order, json_schema) VALUES

-- 1. Bright Lines
('bright_lines', 'Bright Lines', 'Non-negotiable ethical boundaries and values that cannot be crossed', 'ban', 75,
'{
  "type": "object",
  "properties": {
    "organization_name": {"type": "string"},
    "last_reviewed": {"type": "string", "format": "date"},
    "bright_lines": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "name": {"type": "string"},
          "description": {"type": "string"},
          "category": {
            "type": "string",
            "enum": ["customer_treatment", "data_privacy", "financial_integrity", "employee_welfare", "environmental", "legal_compliance", "other"]
          },
          "test_question": {"type": "string"},
          "violation_examples": {"type": "array", "items": {"type": "string"}},
          "enforcement_mechanism": {"type": "string"},
          "escalation_path": {"type": "string"},
          "date_established": {"type": "string", "format": "date"}
        },
        "required": ["id", "name", "description", "category", "test_question"]
      }
    },
    "review_cadence": {"type": "string"},
    "governance_owner": {"type": "string"}
  },
  "required": ["organization_name", "bright_lines"]
}'::jsonb),

-- 2. Values Map
('values_map', 'Values Map', 'Stated values vs. stress values - how values manifest under normal and pressure conditions', 'map', 76,
'{
  "type": "object",
  "properties": {
    "organization_name": {"type": "string"},
    "assessment_date": {"type": "string", "format": "date"},
    "values": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "value_name": {"type": "string"},
          "stated_definition": {"type": "string"},
          "normal_behaviors": {
            "type": "array",
            "items": {"type": "string"},
            "description": "How this value shows up in day-to-day operations"
          },
          "stress_behaviors": {
            "type": "array",
            "items": {"type": "string"},
            "description": "How this value shows up under pressure"
          },
          "alignment_score": {
            "type": "integer",
            "minimum": 1,
            "maximum": 5,
            "description": "1=Misaligned, 3=Partially aligned, 5=Fully aligned"
          },
          "gap_description": {"type": "string"},
          "improvement_actions": {"type": "array", "items": {"type": "string"}}
        },
        "required": ["value_name", "stated_definition", "normal_behaviors", "stress_behaviors", "alignment_score"]
      }
    },
    "pressure_indicators": {
      "type": "array",
      "items": {"type": "string"},
      "description": "What triggers stress mode in your organization?"
    },
    "overall_drift_score": {
      "type": "number",
      "description": "Average of all value alignment scores"
    }
  },
  "required": ["organization_name", "values"]
}'::jsonb)

ON CONFLICT (type_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    json_schema = EXCLUDED.json_schema;

-- ============================================================
-- MEASUREMENT LAYER (3 Types)
-- ============================================================

INSERT INTO context_asset_types (type_key, display_name, description, icon, sort_order, json_schema) VALUES

-- 3. Intervention Metrics
('intervention_metrics', 'Intervention Metrics', 'Measures of human oversight effectiveness in AI/automated systems', 'zap', 210,
'{
  "type": "object",
  "properties": {
    "period": {"type": "string", "description": "e.g., Q4 2025, December 2025"},
    "period_start": {"type": "string", "format": "date"},
    "period_end": {"type": "string", "format": "date"},
    "veto_metrics": {
      "type": "object",
      "properties": {
        "ai_decisions_reviewed": {"type": "integer"},
        "decisions_overridden": {"type": "integer"},
        "veto_rate_percent": {"type": "number"},
        "veto_reasons": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "reason": {"type": "string"},
              "count": {"type": "integer"}
            }
          }
        }
      }
    },
    "escalation_metrics": {
      "type": "object",
      "properties": {
        "total_automated_decisions": {"type": "integer"},
        "escalations_triggered": {"type": "integer"},
        "escalation_rate_percent": {"type": "number"},
        "avg_escalations_per_day": {"type": "number"},
        "escalation_triggers": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "trigger_type": {"type": "string"},
              "count": {"type": "integer"}
            }
          }
        }
      }
    },
    "pause_to_proceed": {
      "type": "object",
      "properties": {
        "decisions_requiring_review": {"type": "integer"},
        "auto_approved_decisions": {"type": "integer"},
        "deliberation_rate_percent": {"type": "number"},
        "ratio_display": {"type": "string", "description": "e.g., 1:5.67"}
      }
    },
    "trend_vs_prior_period": {
      "type": "object",
      "properties": {
        "veto_rate_change": {"type": "number"},
        "escalation_rate_change": {"type": "number"},
        "deliberation_rate_change": {"type": "number"}
      }
    },
    "notes": {"type": "string"}
  },
  "required": ["period", "period_start", "period_end"]
}'::jsonb),

-- 4. Trust Velocity Metrics
('trust_velocity_metrics', 'Trust Velocity Metrics', 'Measures of trust accumulation vs. erosion in stakeholder relationships', 'trending-up', 220,
'{
  "type": "object",
  "properties": {
    "period": {"type": "string"},
    "period_start": {"type": "string", "format": "date"},
    "period_end": {"type": "string", "format": "date"},
    "relationship_longevity": {
      "type": "object",
      "properties": {
        "total_active_customers": {"type": "integer"},
        "avg_tenure_months": {"type": "number"},
        "prior_period_avg_tenure": {"type": "number"},
        "rli_velocity_percent": {"type": "number", "description": "Positive = trust compounding"}
      }
    },
    "forgiveness_rate": {
      "type": "object",
      "properties": {
        "customers_experiencing_failure": {"type": "integer"},
        "customers_retained_post_failure": {"type": "integer"},
        "forgiveness_rate_percent": {"type": "number"},
        "failure_types": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "type": {"type": "string"},
              "count": {"type": "integer"},
              "retention_rate": {"type": "number"}
            }
          }
        }
      }
    },
    "referral_from_tenure": {
      "type": "object",
      "properties": {
        "total_referrals": {"type": "integer"},
        "referrals_from_2plus_years": {"type": "integer"},
        "rft_rate_percent": {"type": "number"},
        "rft_share_percent": {"type": "number", "description": "% of all referrals from long-tenured"}
      }
    },
    "employee_values_retention": {
      "type": "object",
      "properties": {
        "judgment_role_employees_start": {"type": "integer"},
        "judgment_role_departures": {"type": "integer"},
        "evr_percent": {"type": "number"},
        "overall_retention_percent": {"type": "number"},
        "evr_delta": {"type": "number", "description": "EVR - Overall. Negative = warning sign"}
      }
    },
    "trust_trajectory": {
      "type": "string",
      "enum": ["compounding", "stable", "eroding"],
      "description": "Overall assessment based on metrics"
    },
    "notes": {"type": "string"}
  },
  "required": ["period", "period_start", "period_end"]
}'::jsonb),

-- 5. Close Call Log
('close_call_log', 'Close Call Log', 'Documented incidents where potential integrity breaches were prevented before causing harm', 'shield', 230,
'{
  "type": "object",
  "properties": {
    "log_period": {"type": "string"},
    "total_close_calls": {"type": "integer"},
    "close_calls": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "date": {"type": "string", "format": "date"},
          "category": {
            "type": "string",
            "enum": ["customer_impact", "data_privacy", "compliance", "reputation", "financial", "employee_welfare", "other"]
          },
          "severity": {
            "type": "string",
            "enum": ["minor", "moderate", "severe", "critical"]
          },
          "what_almost_happened": {"type": "string"},
          "how_it_was_caught": {"type": "string"},
          "who_intervened": {"type": "string"},
          "system_or_process_involved": {"type": "string"},
          "root_cause": {"type": "string"},
          "corrective_action_taken": {"type": "string"},
          "estimated_impact_avoided": {
            "type": "object",
            "properties": {
              "financial": {"type": "string"},
              "reputational": {"type": "string"},
              "legal": {"type": "string"}
            }
          },
          "lessons_learned": {"type": "string"}
        },
        "required": ["id", "date", "category", "severity", "what_almost_happened", "how_it_was_caught"]
      }
    },
    "summary_by_category": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "category": {"type": "string"},
          "count": {"type": "integer"}
        }
      }
    },
    "trend_vs_prior": {
      "type": "object",
      "properties": {
        "count_change": {"type": "integer"},
        "interpretation": {"type": "string"}
      }
    }
  },
  "required": ["log_period", "close_calls"]
}'::jsonb)

ON CONFLICT (type_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    json_schema = EXCLUDED.json_schema;

-- ============================================================
-- COMPARISON & COMPOSITE LAYER (2 Types)
-- ============================================================

INSERT INTO context_asset_types (type_key, display_name, description, icon, sort_order, json_schema) VALUES

-- 6. Industry Baseline
('industry_baseline', 'Industry Baseline', 'Industry incident database for counterfactual comparison and cost avoidance calculation', 'bar-chart-2', 240,
'{
  "type": "object",
  "properties": {
    "industry": {"type": "string"},
    "baseline_period": {"type": "string"},
    "last_updated": {"type": "string", "format": "date"},
    "estimated_companies_in_segment": {"type": "integer"},
    "incident_categories": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "category": {
            "type": "string",
            "enum": ["regulatory_action", "lawsuit", "settlement", "pr_crisis", "data_breach", "other"]
          },
          "incidents_observed": {"type": "integer"},
          "incident_rate_percent": {"type": "number"},
          "avg_cost": {"type": "number"},
          "severity_distribution": {
            "type": "object",
            "properties": {
              "minor_under_50k": {"type": "integer"},
              "moderate_50k_500k": {"type": "integer"},
              "severe_over_500k": {"type": "integer"}
            }
          },
          "notable_examples": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "company": {"type": "string"},
                "incident": {"type": "string"},
                "outcome": {"type": "string"},
                "cost": {"type": "string"},
                "date": {"type": "string"}
              }
            }
          }
        }
      }
    },
    "we_dont_have_that_problem": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "issue": {"type": "string"},
          "industry_prevalence": {"type": "string"},
          "our_status": {"type": "string"},
          "attribution": {
            "type": "string",
            "enum": ["systemic", "cultural", "luck"],
            "description": "S=we have controls, C=our values prevent, L=have not faced trigger"
          }
        }
      }
    },
    "protection_confidence_percent": {"type": "number"},
    "compliance_cost_avoidance": {
      "type": "object",
      "properties": {
        "calculation_method": {"type": "string"},
        "years_operating": {"type": "integer"},
        "estimated_avoided_by_category": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "category": {"type": "string"},
              "avg_cost": {"type": "number"},
              "rate_percent": {"type": "number"},
              "avoided_amount": {"type": "number"}
            }
          }
        },
        "total_estimated_avoided": {"type": "number"}
      }
    },
    "sources": {"type": "array", "items": {"type": "string"}}
  },
  "required": ["industry", "baseline_period", "incident_categories"]
}'::jsonb),

-- 7. Integrity Yield (Composite Score)
('integrity_yield', 'Integrity Yield', 'Composite integrity score for stakeholder visibility and trend tracking', 'target', 250,
'{
  "type": "object",
  "properties": {
    "period": {"type": "string"},
    "calculation_date": {"type": "string", "format": "date"},
    "composite_score": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    },
    "interpretation": {
      "type": "string",
      "enum": ["strong", "adequate", "gaps", "critical"],
      "description": "80-100=Strong, 60-79=Adequate, 40-59=Gaps, <40=Critical"
    },
    "components": {
      "type": "object",
      "properties": {
        "trust_velocity": {
          "type": "object",
          "properties": {
            "score": {"type": "number", "minimum": 0, "maximum": 100},
            "weight": {"type": "number", "default": 0.30},
            "weighted_contribution": {"type": "number"}
          }
        },
        "intervention_effectiveness": {
          "type": "object",
          "properties": {
            "score": {"type": "number", "minimum": 0, "maximum": 100},
            "weight": {"type": "number", "default": 0.25},
            "weighted_contribution": {"type": "number"}
          }
        },
        "alignment_audit": {
          "type": "object",
          "properties": {
            "score": {"type": "number", "minimum": 0, "maximum": 100},
            "weight": {"type": "number", "default": 0.25},
            "weighted_contribution": {"type": "number"},
            "front_page_pass_rate": {"type": "number"},
            "pressure_variance": {"type": "number"}
          }
        },
        "counterfactual_value": {
          "type": "object",
          "properties": {
            "score": {"type": "number", "minimum": 0, "maximum": 100},
            "weight": {"type": "number", "default": 0.20},
            "weighted_contribution": {"type": "number"},
            "roi_ratio": {"type": "number"}
          }
        }
      }
    },
    "trend": {
      "type": "object",
      "properties": {
        "prior_period_score": {"type": "number"},
        "change": {"type": "number"},
        "direction": {"type": "string", "enum": ["improving", "stable", "declining"]}
      }
    },
    "leading_indicators": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "indicator": {"type": "string"},
          "status": {"type": "string", "enum": ["green", "yellow", "red"]},
          "note": {"type": "string"}
        }
      }
    },
    "action_items": {
      "type": "array",
      "items": {"type": "string"}
    }
  },
  "required": ["period", "calculation_date", "composite_score", "interpretation", "components"]
}'::jsonb)

ON CONFLICT (type_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    json_schema = EXCLUDED.json_schema;

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
DECLARE
    integrity_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO integrity_count
    FROM context_asset_types
    WHERE type_key IN (
        'bright_lines',
        'values_map',
        'intervention_metrics',
        'trust_velocity_metrics',
        'close_call_log',
        'industry_baseline',
        'integrity_yield'
    ) AND is_active = true;

    SELECT COUNT(*) INTO total_count FROM context_asset_types WHERE is_active = true;

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'INTEGRITY ASSET TYPES SEEDED SUCCESSFULLY';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Integrity types added: %', integrity_count;
    RAISE NOTICE 'Total active types: %', total_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Foundation Layer:';
    RAISE NOTICE '  - bright_lines (Non-negotiable boundaries)';
    RAISE NOTICE '  - values_map (Stated vs. stress values)';
    RAISE NOTICE '';
    RAISE NOTICE 'Measurement Layer:';
    RAISE NOTICE '  - intervention_metrics (Human oversight effectiveness)';
    RAISE NOTICE '  - trust_velocity_metrics (Trust compounding vs. erosion)';
    RAISE NOTICE '  - close_call_log (Near-miss documentation)';
    RAISE NOTICE '';
    RAISE NOTICE 'Comparison & Composite Layer:';
    RAISE NOTICE '  - industry_baseline (Counterfactual benchmarks)';
    RAISE NOTICE '  - integrity_yield (Composite score)';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;
