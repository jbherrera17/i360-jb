# Higgins Soul v3 Specification

**Version:** 3.0
**Phase:** 54 - Human Values Definition System
**Date:** February 2026
**Status:** Specification

---

## Overview

Higgins Soul v3 is the unified human values definition system for Insight 360. It provides a hierarchical configuration framework for defining organizational values, ethical boundaries, AI personas, and behavioral guidelines.

### Key Features

1. **Hierarchical Inheritance** - Platform → Organization → Department/Client → Agent
2. **SCU Ethics Framework Integration** - Six ethical lenses for decision-making
3. **DIGM Ethics Layer** - Fifth layer added to Disciplined Intelligence Governance Model
4. **Values Alignment Audit** - Compare stated vs. discovered organizational values
5. **Soul.md Generation** - Export human-readable configuration files
6. **Version Control** - Full audit trail with rollback capability

---

## Architecture

### Configuration Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLATFORM (Synergi AI)                        │
│  Immutable: Platform Bright Lines, Security, SCU Lenses         │
│  Managed by: Platform Admins                                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ inherits + overrides
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ORGANIZATION                                  │
│  Customizable: Values, Guardrails, Domain, Voice, Bright Lines  │
│  Managed by: Org Admins (Super Admin, System Admin)             │
└───────────────────────────┬─────────────────────────────────────┘
                            │ inherits + overrides
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              DEPARTMENT / AGENCY CLIENT                          │
│  Customizable: Value emphasis, Stakeholders, Escalation         │
│  Managed by: Department Admin / Client Admin                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ inherits
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT INSTANCE                                │
│  Final computed soul = Platform + Org + Dept + Agent overrides  │
│  Affects: Workflows, Chats, Actions                             │
└─────────────────────────────────────────────────────────────────┘
```

### What Can Be Modified at Each Level

| Level | Can Modify | Cannot Modify |
|-------|-----------|---------------|
| **Platform** | Platform Bright Lines, Security, DIGM defaults, SCU lenses | — (owns everything) |
| **Organization** | Org Bright Lines, Guardrails, Values, Voice, Domain | Platform Bright Lines, Security |
| **Department/Client** | Value emphasis, Stakeholders, Escalation contacts | Org Bright Lines, Platform Bright Lines |
| **Agent** | Persona tweaks, Voice adjustments | All Bright Lines, Core values |

---

## Soul Configuration Structure

### Primary Sections

#### 1. Identity

```json
{
  "name": "Higgins",
  "role": "Chief of Staff AI",
  "archetype": "Trusted Butler",
  "temperament": 0.5,
  "description": "AI assistant configured for organizational excellence"
}
```

#### 2. Values

```json
[
  {
    "name": "Integrity",
    "meaning": "Doing the right thing even when no one is watching",
    "why_matters": "Foundation of trust in all relationships",
    "priority": "high",
    "non_negotiable": true,
    "behaviors": [
      "Speak truth even when difficult",
      "Acknowledge mistakes promptly",
      "Follow through on commitments"
    ],
    "stress_behaviors": [
      "Maintain ethical standards under pressure",
      "Escalate rather than compromise values"
    ]
  }
]
```

#### 3. Bright Lines

```json
[
  {
    "name": "Human Safety First",
    "description": "Never provide information that could directly enable physical harm",
    "level": "platform",
    "rationale": "Fundamental to responsible AI",
    "test_question": "Would we cross this line to save the company?",
    "violations": [
      "Providing weapon-making instructions",
      "Enabling harmful activities"
    ]
  }
]
```

#### 4. Guardrails

```json
{
  "communication": [
    "Always acknowledge uncertainty",
    "Never claim human-level understanding"
  ],
  "decision": [
    "Escalate decisions over $10,000",
    "Require human approval for personnel matters"
  ],
  "scope": [
    "Cannot make commitments on behalf of organization",
    "Cannot access systems outside authorized scope"
  ],
  "emotional": [
    "Show empathy but maintain professional boundaries",
    "Escalate signs of distress immediately"
  ]
}
```

#### 5. Voice

```json
{
  "tone": ["professional", "helpful", "concise"],
  "use_words": ["consider", "recommend", "suggest"],
  "avoid": ["jargon", "buzzwords", "absolutely"],
  "personality_temperature": 0.5,
  "sample_phrases": [
    "I'd suggest considering...",
    "Based on the available information..."
  ]
}
```

#### 6. Domain

```json
{
  "industry": "technology",
  "key_terms": [
    {"term": "SaaS", "definition": "Software as a Service"},
    {"term": "ARR", "definition": "Annual Recurring Revenue"}
  ],
  "products": [
    {"name": "Platform X", "description": "Core product offering"}
  ],
  "audiences": ["Enterprise", "SMB"],
  "competitors": ["CompetitorA", "CompetitorB"],
  "challenges": "Market saturation, rapid technology changes"
}
```

#### 7. Stakeholders

```json
[
  {
    "name": "Executive Team",
    "role": "Leadership",
    "needs": ["Strategic insights", "Risk assessment"],
    "communication_style": "Concise, data-driven"
  }
]
```

#### 8. Escalation

```json
{
  "decision_matrix": {
    "financial_over_10k": "human",
    "personnel": "human",
    "strategic": "advisory",
    "operational": "autonomous"
  },
  "contacts": [
    {"role": "CEO", "name": "Jane Doe", "email": "jane@example.com"}
  ]
}
```

---

## SCU Ethics Framework

### Six Ethical Lenses

| Lens | Key Question | Focus |
|------|--------------|-------|
| **Rights** | Does this respect moral rights? | Dignity, autonomy, privacy, consent |
| **Justice** | Is this fair to all parties? | Equal treatment, proportionality |
| **Utilitarian** | What's the net benefit? | Greatest good for most stakeholders |
| **Common Good** | How does this affect community? | Social systems, shared welfare |
| **Virtue** | Does this reflect integrity? | Character, what role models would do |
| **Care Ethics** | How does this affect relationships? | Empathy, dependency, trust |

### Five-Step Decision Framework

1. **Identify Ethical Issues** - What values are in tension? Who is affected?
2. **Get the Facts** - What do we know? What don't we know?
3. **Evaluate Alternatives** - Apply all six lenses
4. **Choose & Test** - Reversibility, publicity, golden rule tests
5. **Implement & Reflect** - Execute and learn

### Stakes-Based Application

| Stakes Level | Application | Human Review |
|-------------|-------------|--------------|
| **Low** | Basic value awareness | Not required |
| **Medium** | Values consideration, stakeholder awareness | Recommended |
| **High** | Full SCU framework, all six lenses | Required |
| **Critical** | Full framework + mandatory human escalation | Required |

---

## DIGM Enhancement

### Five-Layer Model

```
Identity → Cognitive → Ethics → Voice → Adaptation
```

| Layer | Purpose | Soul Config Integration |
|-------|---------|------------------------|
| **Identity** | Who the AI is | identity, methodology |
| **Cognitive** | How it thinks | domain, escalation |
| **Ethics** | How it decides | values, bright_lines, guardrails |
| **Voice** | How it communicates | voice, stakeholders |
| **Adaptation** | How it adjusts | Real-time context |

---

## Values Alignment Audit

### Purpose

Compares stated organizational values (from Soul Configuration) against discovered values (from Align 120 assessments) to identify drift.

### Process

1. Run Align 120 Module 2 assessment
2. Module outputs `discovered_values` to `business_fundamentals`
3. Soul Configuration stores `stated_values`
4. Alignment Audit compares both sets
5. Generates drift score and recommendations

### Metrics

- **Overall Alignment Score** (0-100)
- **Per-Value Alignment** (aligned/moderate/significant/critical/not_found)
- **Drift Severity** (none/low/moderate/high/critical)
- **Non-Negotiable Compliance** (pass/fail per value)

---

## API Endpoints

### Soul Configuration CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/soul-config` | List configurations |
| GET | `/api/soul-config/:id` | Get configuration |
| GET | `/api/soul-config/resolve/:orgId` | Resolve inherited config |
| POST | `/api/soul-config` | Create configuration |
| PUT | `/api/soul-config/:id` | Update configuration |
| POST | `/api/soul-config/:id/publish` | Publish draft |
| DELETE | `/api/soul-config/:id` | Deactivate configuration |

### Version Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/soul-config/:id/versions` | Get version history |
| POST | `/api/soul-config/:id/rollback` | Rollback to version |

### Soul.md Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/soul-config/:id/export` | Generate soul.md |
| POST | `/api/soul-config/import` | Import from markdown |
| GET | `/api/soul-config/:id/preview` | Preview without saving |

### Ethical Framework

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/soul-config/ethical-lenses` | Get SCU lenses |
| POST | `/api/soul-config/detect-stakes` | Detect stakes level |
| POST | `/api/soul-config/ethical-context` | Assemble context |
| POST | `/api/soul-config/analyze-decision` | Analyze through lenses |
| POST | `/api/soul-config/ethical-evaluation` | Log evaluation |

### Values Alignment

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/soul-config/values-alignment/audit` | Run audit |
| GET | `/api/soul-config/values-alignment/history/:orgId` | Get history |
| GET | `/api/soul-config/values-alignment/trend/:orgId` | Get trend |
| GET | `/api/soul-config/values-alignment/radar/:orgId` | Get chart data |

### Integrity Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/soul-config/integrity-metrics/:orgId` | Get metrics |
| GET | `/api/soul-config/bright-line-incidents/:orgId` | Get incidents |
| POST | `/api/soul-config/bright-line-incident` | Report incident |
| PUT | `/api/soul-config/bright-line-incident/:id/resolve` | Resolve incident |

---

## Database Schema

### Tables

- `soul_configurations` - Master configuration records
- `soul_config_versions` - Audit trail for changes
- `ethical_lenses` - SCU framework lens definitions
- `ethical_lens_mappings` - Lens-to-value associations
- `ethical_evaluations` - Decision audit log
- `values_alignment_audits` - Alignment audit results
- `bright_line_incidents` - Violation/near-miss tracking

### Key Relationships

```
soul_configurations
├── soul_config_versions (1:N)
├── ethical_evaluations (1:N)
├── values_alignment_audits (1:N)
└── bright_line_incidents (1:N)

ethical_lenses
└── ethical_lens_mappings (1:N)
    └── soul_configurations.values (via value_name)
```

---

## User Interfaces

### Soul Configuration Wizard (`/soul-wizard.html`)

7-step guided wizard:
1. Organization Profile
2. Core Values
3. Bright Lines
4. Guardrails
5. Voice & Persona
6. Domain Knowledge
7. Review & Generate

### Soul Configuration Management (`/soul-configuration.html`)

Tabs:
- Overview (hierarchy visualization)
- Values (view/edit)
- Bright Lines (view/edit)
- Voice (view/edit)
- History (version control)
- Soul.md (preview/export)

### Integration Points

- **Integrity Dashboard** - Soul-based metrics, values alignment
- **SynergiNexus** - Ethical Lenses tab
- **Strategy Governance** - Vision/mission from soul config

---

## Best Practices

### Creating Soul Configuration

1. Start with the wizard for guided setup
2. Import existing data from Strategic Foundations or Align 120
3. Define at least 3-5 core values with behaviors
4. Add organization-specific bright lines beyond platform defaults
5. Review completeness score (aim for 80%+)
6. Test with sample queries before publishing

### Maintaining Soul Configuration

1. Review quarterly or after major organizational changes
2. Compare against Align 120 discovered values
3. Update stakeholders and escalation contacts
4. Version control all changes with clear summaries
5. Monitor integrity metrics on dashboard

### Using Ethics Framework

1. Stakes detection happens automatically in chat
2. For high-stakes decisions, apply all six lenses
3. Document significant evaluations for audit trail
4. Escalate when human review is flagged
5. Learn from outcomes to improve future decisions

---

## Migration from Higgins Soul v2

### Breaking Changes

- Soul configuration now stored in database (not just markdown)
- Strategic Foundations references soul_config_id
- Context assets auto-generated from soul config

### Migration Steps

1. Run `phase54-soul-configuration.sql` migration
2. Use Soul Wizard to create new configuration
3. Import existing soul.md content if available
4. Update Strategic Foundations reference
5. Verify context assets generated correctly

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v3.0 | Feb 2026 | SCU Framework, database storage, hierarchy |
| v2.0 | Jan 2026 | Documentation format, expanded sections |
| v1.0 | Dec 2025 | Initial specification |
