# Integrity Metrics Asset Acquisition System

**Architecture Specification for Insight 360**
**Version:** 1.0
**Date:** December 2025

---

## Executive Summary

This document specifies the architecture for acquiring, storing, and operationalizing Integrity Metrics Framework data within Insight 360. The system transforms abstract integrity concepts into measurable, trackable context assets that power AI agents for governance, risk assessment, and values alignment.

---

## System Overview

### Design Principles

1. **Progressive Disclosure** — Start with essential metrics, expand as organizational maturity grows
2. **Dual Storage** — Structured JSON for computation, plain text for LLM injection
3. **Temporal Tracking** — All metrics are time-series by design
4. **Counterfactual Anchoring** — Connect prevention to industry baselines
5. **Composability** — Individual metrics aggregate into Integrity Yield

---

## Asset Type Architecture

### New Context Asset Types (7 Types)

These extend Insight 360's existing 18 asset types with integrity-specific categories:

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRITY ASSET HIERARCHY                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │ FOUNDATION LAYER │    │  MEASUREMENT     │                   │
│  ├──────────────────┤    │     LAYER        │                   │
│  │ • Bright Lines   │    ├──────────────────┤                   │
│  │ • Values Map     │    │ • Intervention   │                   │
│  │                  │    │   Metrics        │                   │
│  └────────┬─────────┘    │ • Trust Velocity │                   │
│           │              │   Metrics        │                   │
│           │              │ • Alignment      │                   │
│           │              │   Audit Data     │                   │
│           │              └────────┬─────────┘                   │
│           │                       │                              │
│           └───────────┬───────────┘                              │
│                       ▼                                          │
│           ┌──────────────────────┐                               │
│           │   COMPARISON LAYER   │                               │
│           ├──────────────────────┤                               │
│           │ • Industry Baselines │                               │
│           │ • Close Call Log     │                               │
│           └──────────┬───────────┘                               │
│                      │                                           │
│                      ▼                                           │
│           ┌──────────────────────┐                               │
│           │   COMPOSITE LAYER    │                               │
│           ├──────────────────────┤                               │
│           │ • Integrity Yield    │                               │
│           │   (Calculated)       │                               │
│           └──────────────────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Asset Type Definitions

### 1. Bright Lines (`bright_lines`)

**Purpose:** Define organizational non-negotiables — the ethical boundaries that cannot be crossed regardless of circumstances.

```sql
INSERT INTO context_asset_types (type_key, display_name, description, icon, sort_order, json_schema) VALUES
('bright_lines', 'Bright Lines', 'Non-negotiable ethical boundaries and values that cannot be crossed', '🚫', 75,
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
}'::jsonb);
```

**Acquisition Questions:**
1. What would you never do, even if it meant losing the business?
2. What customer treatment is unacceptable regardless of revenue impact?
3. What data practices are off-limits, even if competitors do them?
4. What would cause you to fire someone immediately, no warnings?
5. What would you refuse to automate, no matter the efficiency gain?

---

### 2. Values Map (`values_map`)

**Purpose:** Document stated values AND stress values — what the organization claims vs. what it does under pressure.

```sql
INSERT INTO context_asset_types (type_key, display_name, description, icon, sort_order, json_schema) VALUES
('values_map', 'Values Map', 'Stated values vs. stress values — how values manifest under normal and pressure conditions', '🗺️', 76,
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
            "description": "How this value shows up under pressure (quarter-end, crisis, resource constraints)"
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
      "description": "What triggers 'stress mode' in your organization?"
    },
    "overall_drift_score": {
      "type": "number",
      "description": "Average of all value alignment scores"
    }
  },
  "required": ["organization_name", "values"]
}'::jsonb);
```

**Acquisition Questions:**
1. What are your 3-5 core values as stated?
2. For each value: What does it look like when things are calm?
3. For each value: What happens to this value during quarter-end pushes?
4. For each value: What happens during a crisis or resource crunch?
5. Where's the biggest gap between what you say and what you do?

---

### 3. Intervention Metrics (`intervention_metrics`)

**Purpose:** Track the "moral friction" checkpoints — evidence that human judgment is being exercised in automated systems.

```sql
INSERT INTO context_asset_types (type_key, display_name, description, icon, sort_order, json_schema) VALUES
('intervention_metrics', 'Intervention Metrics', 'Measures of human oversight effectiveness in AI/automated systems', '⚡', 210,
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
}'::jsonb);
```

**Acquisition Questions:**
1. How many AI-influenced decisions were reviewed by humans this period?
2. How many of those were overridden or modified? Why?
3. What triggers an automated process to escalate to a human?
4. How many escalations happened this period?
5. What percentage of decisions get human review vs. auto-approved?

---

### 4. Trust Velocity Metrics (`trust_velocity_metrics`)

**Purpose:** Track whether trust is compounding (strengthening relationships) or spreading distrust (eroding relationships).

```sql
INSERT INTO context_asset_types (type_key, display_name, description, icon, sort_order, json_schema) VALUES
('trust_velocity_metrics', 'Trust Velocity Metrics', 'Measures of trust accumulation vs. erosion in stakeholder relationships', '📈', 220,
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
}'::jsonb);
```

**Acquisition Questions:**
1. What's the average customer tenure? Is it increasing or decreasing?
2. When customers have a bad experience, what percentage stay?
3. What percentage of referrals come from customers of 2+ years?
4. What's the retention rate for employees in judgment-heavy roles vs. overall?
5. Overall, is trust compounding, stable, or eroding?

---

### 5. Close Call Log (`close_call_log`)

**Purpose:** Document near-misses — the crises that didn't happen because someone intervened.

```sql
INSERT INTO context_asset_types (type_key, display_name, description, icon, sort_order, json_schema) VALUES
('close_call_log', 'Close Call Log', 'Documented incidents where potential integrity breaches were prevented before causing harm', '🛡️', 230,
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
        "interpretation": {"type": "string", "description": "Increase may indicate better detection, not worse performance"}
      }
    }
  },
  "required": ["log_period", "close_calls"]
}'::jsonb);
```

**Acquisition Process:**
- Weekly team check-in: "What almost went wrong this week?"
- Format: "I stopped [X] from happening because [Y]"
- Document in shared channel or spreadsheet
- Aggregate monthly into this asset

---

### 6. Industry Baseline (`industry_baseline`)

**Purpose:** Benchmark against industry incidents to quantify "what could have been."

```sql
INSERT INTO context_asset_types (type_key, display_name, description, icon, sort_order, json_schema) VALUES
('industry_baseline', 'Industry Baseline', 'Industry incident database for counterfactual comparison and cost avoidance calculation', '📊', 240,
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
            "description": "S=we have controls, C=our values prevent, L=haven't faced trigger"
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
}'::jsonb);
```

**Acquisition Process:**
- Quarterly scan of industry news and trade publications
- Track regulatory actions, lawsuits, settlements, PR crises
- Calculate incident rates per category
- Estimate avoided costs based on industry averages

---

### 7. Integrity Yield (`integrity_yield`)

**Purpose:** The composite score for executive dashboards — a single number representing overall integrity posture.

```sql
INSERT INTO context_asset_types (type_key, display_name, description, icon, sort_order, json_schema) VALUES
('integrity_yield', 'Integrity Yield', 'Composite integrity score for stakeholder visibility and trend tracking', '🎯', 250,
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
}'::jsonb);
```

---

## Asset Acquisition Workflow

### Phase 1: Foundation (Week 1-2)

```
┌────────────────────────────────────────────────────────────────┐
│                    FOUNDATION ACQUISITION                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: Bright Lines Workshop                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Facilitated session with leadership (2 hours)         │   │
│  │ • Answer the 5 acquisition questions                    │   │
│  │ • Document 5-10 non-negotiable boundaries              │   │
│  │ • Assign enforcement mechanisms                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ▼                                      │
│  Step 2: Values Map Assessment                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Review stated values (from existing core_values asset) │   │
│  │ • Interview 3-5 team members on "stress behaviors"      │   │
│  │ • Score alignment for each value (1-5)                  │   │
│  │ • Identify top 2 gaps for improvement                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Phase 2: Measurement Setup (Week 3-4)

```
┌────────────────────────────────────────────────────────────────┐
│                    MEASUREMENT ACQUISITION                      │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 3: Identify AI Touchpoints                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Map all AI-influenced decision points in operations   │   │
│  │ • Identify existing escalation triggers                 │   │
│  │ • Document current human review rates                   │   │
│  │ • Establish baseline intervention metrics               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ▼                                      │
│  Step 4: Trust Velocity Baseline                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Pull customer tenure data from CRM                    │   │
│  │ • Identify service failure incidents (past 12 months)   │   │
│  │ • Calculate retention post-failure                      │   │
│  │ • Segment referrals by customer tenure                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ▼                                      │
│  Step 5: Close Call Log Initialization                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Create shared documentation channel/spreadsheet       │   │
│  │ • Train team on "I stopped X because Y" format         │   │
│  │ • Retroactively document known near-misses             │   │
│  │ • Set weekly review cadence                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Phase 3: Benchmarking (Week 5-6)

```
┌────────────────────────────────────────────────────────────────┐
│                    BENCHMARK ACQUISITION                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 6: Industry Baseline Research                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Scan industry news for integrity incidents            │   │
│  │ • Research regulatory actions in your sector            │   │
│  │ • Document 5-10 comparable incidents with costs        │   │
│  │ • Calculate incident rates and averages                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ▼                                      │
│  Step 7: "We Don't Have That Problem" Inventory                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • List common industry problems you've avoided          │   │
│  │ • Attribute each to: Systemic / Cultural / Luck        │   │
│  │ • Calculate Protection Confidence score                │   │
│  │ • Flag "Luck" items as vulnerabilities                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Phase 4: Composite Calculation (Week 7)

```
┌────────────────────────────────────────────────────────────────┐
│                    INTEGRITY YIELD CALCULATION                  │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Inputs Required:                                               │
│  • Trust Velocity Metrics (normalized 0-100)                    │
│  • Intervention Metrics (normalized 0-100)                      │
│  • Front Page Pass Rate + Pressure Variance                     │
│  • Compliance Cost Avoidance / Integrity Investment             │
│                                                                 │
│  Formula:                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Integrity Yield =                                        │   │
│  │   (Trust Velocity × 0.30) +                              │   │
│  │   (Intervention Effectiveness × 0.25) +                  │   │
│  │   (Alignment Audit Pass Rate × 0.25) +                   │   │
│  │   (Counterfactual Value × 0.20)                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Interpretation:                                                │
│  • 80-100: Strong integrity posture                             │
│  • 60-79: Adequate with improvement opportunities               │
│  • 40-59: Significant gaps; prioritize alignment work           │
│  • Below 40: Critical attention needed                          │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Agent Integration

### New Integrity Agents

These agents consume the integrity assets:

#### 1. Integrity Auditor Agent

```json
{
  "name": "Integrity Auditor",
  "description": "Performs Front Page Test on sampled decisions and calculates Values Drift Score",
  "system_prompt": "You are an integrity auditor...",
  "context_mappings": [
    {"asset_type": "bright_lines", "injection_mode": "always"},
    {"asset_type": "values_map", "injection_mode": "always"},
    {"asset_type": "core_values", "injection_mode": "always"}
  ],
  "category": "governance"
}
```

#### 2. Risk Sentinel Agent

```json
{
  "name": "Risk Sentinel",
  "description": "Monitors leading indicators and alerts on integrity drift signals",
  "system_prompt": "You are a risk monitoring agent...",
  "context_mappings": [
    {"asset_type": "intervention_metrics", "injection_mode": "always"},
    {"asset_type": "trust_velocity_metrics", "injection_mode": "always"},
    {"asset_type": "close_call_log", "injection_mode": "always"}
  ],
  "category": "governance"
}
```

#### 3. Counterfactual Analyst Agent

```json
{
  "name": "Counterfactual Analyst",
  "description": "Calculates ROI on integrity investments and compliance cost avoidance",
  "system_prompt": "You are a financial analyst specializing in risk quantification...",
  "context_mappings": [
    {"asset_type": "industry_baseline", "injection_mode": "always"},
    {"asset_type": "close_call_log", "injection_mode": "always"}
  ],
  "category": "analysis"
}
```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA FLOW OVERVIEW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ACQUISITION                    STORAGE                 CONSUMPTION  │
│  ───────────                    ───────                 ───────────  │
│                                                                      │
│  ┌──────────┐                ┌─────────────┐         ┌────────────┐ │
│  │ Workshop │───────────────▶│ bright_lines│────────▶│ Integrity  │ │
│  │ Sessions │                │             │         │ Auditor    │ │
│  └──────────┘                └─────────────┘         │ Agent      │ │
│                                                       └────────────┘ │
│  ┌──────────┐                ┌─────────────┐         ┌────────────┐ │
│  │ Team     │───────────────▶│ values_map  │────────▶│ All Agents │ │
│  │Interviews│                │             │         │ (context)  │ │
│  └──────────┘                └─────────────┘         └────────────┘ │
│                                                                      │
│  ┌──────────┐                ┌─────────────┐         ┌────────────┐ │
│  │ System   │───────────────▶│intervention_│────────▶│ Risk       │ │
│  │ Logs     │                │   metrics   │         │ Sentinel   │ │
│  └──────────┘                └─────────────┘         └────────────┘ │
│                                                                      │
│  ┌──────────┐                ┌─────────────┐         ┌────────────┐ │
│  │ CRM      │───────────────▶│trust_velocity│───────▶│ Integrity  │ │
│  │ Data     │                │   _metrics  │         │ Yield      │ │
│  └──────────┘                └─────────────┘         │ Calculator │ │
│                                                       └────────────┘ │
│  ┌──────────┐                ┌─────────────┐         ┌────────────┐ │
│  │ Team     │───────────────▶│ close_call  │────────▶│Counterfact.│ │
│  │ Reports  │                │    _log     │         │ Analyst    │ │
│  └──────────┘                └─────────────┘         └────────────┘ │
│                                                                      │
│  ┌──────────┐                ┌─────────────┐                        │
│  │ Industry │───────────────▶│  industry   │                        │
│  │ Research │                │  _baseline  │                        │
│  └──────────┘                └─────────────┘                        │
│                                                                      │
│                              ┌─────────────┐         ┌────────────┐ │
│                              │ integrity   │────────▶│ Executive  │ │
│                              │   _yield    │         │ Dashboard  │ │
│                              │ (calculated)│         └────────────┘ │
│                              └─────────────┘                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

### Database

- [ ] Run new asset types SQL (7 types)
- [ ] Create indexes for new types
- [ ] Test version history for time-series data

### Backend

- [ ] Add integrity asset type validation
- [ ] Create Integrity Yield calculation service
- [ ] Add leading indicator alert endpoints

### Frontend

- [ ] Create Integrity Dashboard page
- [ ] Add acquisition wizard UI
- [ ] Build trend visualization components

### Agents

- [ ] Create Integrity Auditor agent
- [ ] Create Risk Sentinel agent
- [ ] Create Counterfactual Analyst agent
- [ ] Map context assets to agents

---

## Next Steps

1. **Review** this architecture with stakeholders
2. **Prioritize** which asset types to implement first
3. **Schedule** foundation workshops (Bright Lines + Values Map)
4. **Configure** data collection for intervention and trust metrics
5. **Build** the Integrity Dashboard UI

---

*This architecture transforms invisible integrity into measurable competitive advantage.*
