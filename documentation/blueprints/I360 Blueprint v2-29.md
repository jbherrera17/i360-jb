# Insight 360 Blueprint v2.29

**Version:** 2.29
**Date:** January 4, 2026
**Status:** Phase 11 | User Onboarding & New Client Setup System

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.29

### Phase 11: User Onboarding & New Client Setup System

Phase 11 delivers a comprehensive user onboarding experience and new client deployment system. This phase ensures new users can quickly get started with Insight 360 while providing administrators with a complete toolkit for deploying the system for new clients.

---

### Onboarding Architecture

The onboarding system uses a modal wizard pattern that guides new users through initial setup while remaining dismissible and resumable.

```
┌─────────────────────────────────────────────────────────────┐
│                    Onboarding Flow                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     │
│  │ Welcome │ → │ Profile │ → │  Tour   │ → │Workflow │     │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘     │
│       │             │             │             │           │
│       ▼             ▼             ▼             ▼           │
│  Intro to I360  Name/Avatar  Key Features  First Run       │
│                 Department   Interactive                    │
│                              Cards                          │
│                                                              │
│                         ┌─────────┐                         │
│                         │Complete │                         │
│                         └─────────┘                         │
│                              │                              │
│                              ▼                              │
│                    Ready to use I360                        │
└─────────────────────────────────────────────────────────────┘
```

---

### New Database Schema

#### Onboarding State Table

Tracks each user's onboarding progress with step-by-step completion.

```sql
CREATE TABLE onboarding_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'not_started' CHECK (status IN (
        'not_started', 'in_progress', 'completed', 'skipped'
    )),
    current_step INTEGER DEFAULT 0,
    completed_steps TEXT[] DEFAULT '{}',
    profile_completed BOOLEAN DEFAULT false,
    tour_completed BOOLEAN DEFAULT false,
    first_workflow_completed BOOLEAN DEFAULT false,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);
```

#### User Profile Extensions

Extended user table for profile customization.

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);
```

---

### New Pages

#### Profile Page (`/profile`)

Full-page profile settings with:

| Section | Features |
|---------|----------|
| **Profile Info** | Display name, email (read-only), role display |
| **Avatar** | Emoji picker with preview |
| **Department** | Dropdown to select primary department |
| **Preferences** | Dark mode toggle |
| **Onboarding** | Progress tracker, restart option |

#### Workflow Execution Page (`/workflow-run.html`)

Dedicated page for running multi-step workflows:

| Feature | Description |
|---------|-------------|
| **URL Pattern** | `/workflow-run.html?id={workflowId}&execution={executionId}` |
| **Left Sidebar** | Step list with completion status |
| **Main Content** | Current step form, chat, or review |
| **Progress Saving** | Auto-save on step completion |
| **Step Types** | user_input, agent_chat, review, output |

---

### Onboarding Modal Wizard

The wizard component (`public/js/onboarding-wizard.js`) provides:

| Feature | Implementation |
|---------|----------------|
| **5-Step Flow** | Welcome → Profile → Tour → Workflow → Complete |
| **Progress Bar** | Visual step indicator with percentage |
| **Resume Support** | Picks up from last completed step |
| **Skip Option** | Users can skip and complete later |
| **API Integration** | Syncs state with backend on each step |

#### Step Details

| Step | Type | Content |
|------|------|---------|
| **Welcome** | Info | Introduction to Insight 360, key benefits |
| **Profile** | Form | Name input, avatar picker, department dropdown |
| **Tour** | Cards | Interactive feature cards (Agents, Workflows, Context) |
| **Workflow** | Action | List of starter workflows, "Try One" CTA |
| **Complete** | Success | Celebration, quick action buttons |

---

### New API Routes

#### Onboarding Routes (`/api/onboarding`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/state` | GET | Get user's current onboarding state |
| `/state` | PUT | Update onboarding progress |
| `/complete` | POST | Mark onboarding as fully complete |
| `/skip` | POST | Skip onboarding entirely |
| `/dismiss` | POST | Dismiss for now, resume later |
| `/reset` | POST | Restart onboarding from beginning |

#### Profile Routes (`/api/auth`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/profile` | GET | Get full profile with department |
| `/profile` | PUT | Update own profile (name, avatar, department) |

---

### New Client Setup System

Complete documentation and tooling for deploying Insight 360 to new clients.

#### Documentation Created

| Document | Purpose |
|----------|---------|
| `setup-guide.md` | Master setup guide with step-by-step instructions |
| `env-template.md` | Complete environment variable template |
| `verification-checklist.md` | Post-setup verification checklist |
| `client-onboarding-steps.md` | Client onboarding process (7-10 days) |

#### Master Seed Script

Consolidated seed script (`db/seeds/master-seed.sql`) that installs:

| Category | Count | Description |
|----------|-------|-------------|
| Departments | 6 | Sales, Marketing, Operations, Finance, HR, Executive |
| Context Asset Types | 18 | Standard asset categories |
| BSC Perspectives | 4 | Financial, Customer, Internal, Learning |
| Agents | 15 | Align, Strategy, and Execute agents |
| Workflows | 5 | Starter workflows per department |
| Dept-Agent Mappings | 10+ | Featured agents per department |

---

### Navigation Update

Execute 120 added to primary navigation items in sidebar for easy access.

```javascript
// navigation.js - Primary items now include Execute 120
primaryItems: [
    { href: '/', icon: 'layout-dashboard', label: 'Dashboard' },
    { href: '/execute120', icon: 'rocket', label: 'Execute 120' },
    { href: '/chat.html', icon: 'message-circle', label: 'Chat' },
    // ...
]
```

---

### Dashboard Updates

Onboarding progress widget added to main dashboard:

| State | Display |
|-------|---------|
| Not started | "Welcome! Let's get started" with start button |
| In progress | Checklist with completion status |
| Completed | Hidden or celebration banner |

---

### Files Changed

#### New Files

| File | Purpose |
|------|---------|
| `db/phase11-onboarding.sql` | Onboarding state schema |
| `db/seed-departments.sql` | Department seed data |
| `db/seeds/master-seed.sql` | Consolidated seed script |
| `server/routes/onboarding.js` | Onboarding API routes |
| `public/profile.html` | Profile settings page |
| `public/workflow-run.html` | Workflow execution page |
| `public/js/onboarding-wizard.js` | Modal wizard component |
| `documentation/guides/New Clients/*.md` | Setup documentation (4 files) |
| `documentation/guides/*-user-guide.md` | User guides (3 files) |

#### Modified Files

| File | Changes |
|------|---------|
| `server/index.js` | Register onboarding routes |
| `server/routes/auth.js` | Add profile update endpoints |
| `public/index.html` | Add onboarding widget, include wizard script |
| `public/login.html` | Trigger onboarding after login |
| `public/js/navigation.js` | Add Execute 120 to primary nav |
| `public/js/help-registry.js` | Add help for new pages |

---

### User Guides Created

| Guide | Purpose |
|-------|---------|
| `execute120-user-guide.md` | How to use Execute 120 and workflows |
| `profile-user-guide.md` | Profile settings and preferences |
| `workflow-user-guide.md` | Running workflows step-by-step |

---

### Production Readiness Score

**Updated Score: 6.5/10** (improved from 6.0/10)

| Area | Previous | Current | Change |
|------|----------|---------|--------|
| Architecture | 7.5/10 | 7.5/10 | - |
| Security | 7/10 | 7/10 | - |
| Error Handling | 7/10 | 7/10 | - |
| Database | 7/10 | 7.5/10 | +0.5 |
| Testing | 0/10 | 0/10 | - |
| Observability | 1.5/10 | 1.5/10 | - |
| Documentation | 6/10 | 8/10 | +2.0 |
| User Experience | 5/10 | 7/10 | +2.0 |

*Note: New "User Experience" category added to track onboarding, navigation, and usability improvements.*

---

### Next Steps (Phase 12)

- [ ] Add workflow templates for all departments
- [ ] Implement workflow step validation
- [ ] Create agent customization UI
- [ ] Add structured logging with Winston/Pino
- [ ] Implement user notification system
- [ ] Add workflow analytics and usage tracking

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.29 | Jan 4, 2026 | User onboarding wizard, profile page, new client setup system |
| v2.28 | Jan 3, 2026 | Execute 120 schema, 16 agents, 5 system workflows |
| v2.27 | Jan 2, 2026 | Security fixes, RLS policy fix, user management |
| v2.26 | Jan 2, 2026 | Navigation redesign, UI consistency |
| v2.25 | Jan 1, 2026 | Help system & documentation hub |
| v2.24 | Jan 1, 2026 | User management & RBAC |
| v2.23 | Dec 31, 2025 | Strategy 120 enhancements |
