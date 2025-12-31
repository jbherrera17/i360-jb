# Insight 360 Blueprint v2.23

**Version:** 2.23
**Date:** December 31, 2025
**Status:** Phase 7 | Align 120 - AI Transformation Framework & Company Profile

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.23

### Three-Lane AI Transformation Framework

Phase 7 introduces a comprehensive AI transformation methodology delivered through three interconnected modules:

| Lane | Module | Purpose | Output |
|------|--------|---------|--------|
| **Foundation** | Align 120 | Assess readiness & build foundation | Company Profile |
| **Direction** | Strategy 120 | Define AI strategy & roadmap | AI Strategy Blueprint |
| **Action** | Execute 120 | Implement & optimize | Implementation Playbook |

### Align 120 Module

A 5-step guided assessment wizard that generates a comprehensive Company Profile:

| Module | Focus | Key Outputs |
|--------|-------|-------------|
| **Module 1** | AI Audit & Assessment | Current state analysis, maturity score |
| **Module 2** | Business Fundamentals | Goals alignment, success metrics |
| **Module 3** | Team UpSkilling | Capability gaps, training roadmap |
| **Module 4** | Brand Alignment | Voice DNA, values integration |
| **Module 5** | Corporate Alignment | Culture fit, governance framework |

### Company Profile System

Persistent storage of organizational assessment data for use across all Insight 360 modules:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPANY PROFILE ARCHITECTURE                      │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    align120_sessions                          │   │
│  │  - id, session_name, status                                  │   │
│  │  - current_step (1-5), progress_percentage                   │   │
│  │  - module_data (JSONB per module)                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    company_profiles                           │   │
│  │  - organization_name, industry, size                         │   │
│  │  - ai_maturity_score (1-5)                                   │   │
│  │  - profile_data (JSONB - full assessment)                    │   │
│  │  - source_session_id → align120_sessions                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Used By: Strategy, Governance, Agents            │   │
│  │  - S2E Module references company context                      │   │
│  │  - Agents access profile for personalized responses          │   │
│  │  - Company Dashboard displays Align 120 outputs              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Specialized Align 120 Agents

Five dedicated AI agents guide users through each assessment module:

| Agent | Role | Expertise |
|-------|------|-----------|
| **AI Auditor** | Module 1 | Technology assessment, maturity evaluation |
| **Business Analyst** | Module 2 | Strategic goal alignment, metrics definition |
| **Learning Designer** | Module 3 | Skill gap analysis, training program design |
| **Brand Strategist** | Module 4 | Voice DNA extraction, values articulation |
| **Transformation Architect** | Module 5 | Culture assessment, change management |

---

## Technical Implementation

### Session-Based Progress Tracking

```javascript
// Session states
const SESSION_STATUS = {
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    ARCHIVED: 'archived'
};

// Module completion triggers
const saveModuleProgress = async (sessionId, moduleNumber, data) => {
    // Update module_data JSONB
    // Calculate progress_percentage
    // Advance current_step if module complete
};
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/align120/sessions` | GET | List all sessions |
| `/api/align120/sessions` | POST | Create new session |
| `/api/align120/sessions/:id` | GET | Get session details |
| `/api/align120/sessions/:id` | PUT | Update session progress |
| `/api/align120/sessions/:id/complete` | POST | Finalize and generate profile |
| `/api/align120/company-profiles` | GET | List generated profiles |
| `/api/align120/company-profiles/current` | GET | Get active profile |

### Database Schema

```sql
-- Session tracking
CREATE TABLE align120_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'in_progress',
    current_step INT DEFAULT 1,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    module_1_data JSONB,
    module_2_data JSONB,
    module_3_data JSONB,
    module_4_data JSONB,
    module_5_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated profiles
CREATE TABLE company_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    company_size VARCHAR(50),
    ai_maturity_score INT CHECK (ai_maturity_score BETWEEN 1 AND 5),
    profile_data JSONB NOT NULL,
    source_session_id UUID REFERENCES align120_sessions(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## User Interface

### 5-Module Wizard Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  ALIGN 120 - AI TRANSFORMATION FOUNDATION                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Progress: ████████░░░░░░░░░░░░ 40%  [Module 2 of 5]               │
│                                                                      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                      │
│  │  ✓   │→│  ●   │→│  ○   │→│  ○   │→│  ○   │                      │
│  │ AI   │ │ Biz  │ │ Team │ │Brand │ │ Corp │                      │
│  │Audit │ │Fund. │ │ Up   │ │Align │ │Align │                      │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                      │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  MODULE 2: BUSINESS FUNDAMENTALS                               │  │
│  │                                                                 │  │
│  │  What are your primary business goals for the next 12 months? │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │                                                         │  │  │
│  │  │  [User response area / Agent conversation]             │  │  │
│  │  │                                                         │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                                 │  │
│  │  [← Back]                              [Save & Continue →]     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Session Management

- **New Session** — Start fresh assessment
- **Resume Session** — Continue from last saved step
- **View Profile** — See generated Company Profile
- **Export** — Download profile as JSON/PDF

---

## File Changes

### New Files

| File | Description |
|------|-------------|
| `public/align120.html` | 5-module wizard UI |
| `server/routes/align120.js` | API endpoints for sessions and profiles |
| `db/phase7-company-profile-schema.sql` | Database schema |
| `db/seed-align120-agents.sql` | 5 specialized agents |
| `db/migration-schema-sync.sql` | Schema sync migration |
| `documentation/guides/align120-user-guide.md` | Comprehensive user guide |
| `documentation/strategy-120-execute-120-agent-architecture.md` | Future lanes architecture |

### Modified Files

| File | Changes |
|------|---------|
| `server/index.js` | Registered `/api/align120` routes |
| `server/routes/docs.js` | Fixed DOCS_DIR path, added align120 to whitelist |
| `public/js/navigation.js` | Added Align 120 nav item |
| `public/js/help-registry.js` | Added align120 help entry |
| `documentation/guides/company-user-guide.md` | Added Align 120 connection section |
| `documentation/guides/strategy-user-guide.md` | Added Align 120 reference |
| `public/index.html` | Minor cleanup |

---

## Integration Points

### Company Dashboard

The Company Dashboard now displays Align 120 outputs:
- AI Maturity Score (from Module 1)
- Team Readiness (from Module 3)
- Corporate Alignment (from Module 5)
- Session completion status

### Strategy Module (S2E)

S2E can reference Company Profile data:
- Vision/Mission alignment validation
- Strategic theme suggestions based on AI maturity
- OKR recommendations from business goals

### Agents

All agents can access Company Profile context:
- Personalized recommendations
- Industry-specific guidance
- Organization-aware responses

---

## Configuration

### Environment Variables

```bash
# Existing - no changes required
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...
```

### Database Setup

```bash
# Run schema creation
psql -f db/phase7-company-profile-schema.sql

# Seed agents
psql -f db/seed-align120-agents.sql

# Or run migrations if using existing DB
psql -f db/migration-schema-sync.sql
```

---

## Next Steps

- [ ] Build Strategy 120 module (AI Strategy Blueprint generation)
- [ ] Build Execute 120 module (Implementation Playbook)
- [ ] Add PDF export for Company Profile
- [ ] Integrate profile data into agent system prompts
- [ ] Add profile comparison (before/after assessments)

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| v2.23 | Dec 31, 2025 | Align 120 module, Company Profile system, 5 assessment agents |
| v2.22 | Dec 30, 2025 | OpenAI SDK v6.x, GPT-5.2 support, model capabilities UI |
| v2.21 | Dec 30, 2025 | Chat UX enhancements, file upload, rotating messages |
| v2.20 | Dec 29, 2025 | Help modal system, user guides, three-panel layout |
