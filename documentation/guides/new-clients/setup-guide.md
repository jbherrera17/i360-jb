# Insight 360 - New Client Setup Guide

This guide walks through the complete setup process for deploying Insight 360 for a new client/company.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Configuration](#2-environment-configuration)
3. [Database Setup](#3-database-setup)
4. [Company Configuration](#4-company-configuration)
5. [Seed Data Installation](#5-seed-data-installation)
6. [User Setup](#6-user-setup)
7. [Verification Checklist](#7-verification-checklist)
8. [Post-Setup Tasks](#8-post-setup-tasks)

---

## 1. Prerequisites

### Required Accounts

| Service | Purpose | Sign Up |
|---------|---------|---------|
| **Supabase** | Database & Authentication | https://supabase.com |
| **Anthropic** | Claude AI (primary LLM) | https://console.anthropic.com |
| **OpenAI** | GPT & Voice capabilities | https://platform.openai.com |

### Optional Services

| Service | Purpose | Sign Up |
|---------|---------|---------|
| Perplexity | Sonar search-enhanced AI | https://perplexity.ai |
| Brave Search | Web search API | https://brave.com/search/api |
| Tavily | Alternative search API | https://tavily.com |
| Serper | Alternative search API | https://serper.dev |

### System Requirements

- Node.js 18+
- npm or yarn
- Git
- Access to Supabase SQL Editor

---

## 2. Environment Configuration

### Create Environment File

Copy the example environment file and configure:

```bash
cp .env.example .env
```

### Required Variables

```env
# Server
PORT=3000
NODE_ENV=production

# Supabase (from your Supabase project settings)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# AI Providers (required)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# AI Providers (optional)
PERPLEXITY_API_KEY=pplx-...
GOOGLE_API_KEY=...

# Search Provider (at least one required)
BRAVE_SEARCH_API_KEY=...
# OR
TAVILY_API_KEY=tvly-...
# OR
SERPER_API_KEY=...

# CORS (comma-separated allowed origins)
ALLOWED_ORIGINS=https://client-domain.com
```

---

## 3. Database Setup

### Supabase Project Setup

1. Create a new Supabase project at https://app.supabase.com
2. Note your project URL and API keys from Settings > API
3. Open the SQL Editor

### Run Schema Scripts (In Order)

Execute these SQL files in the Supabase SQL Editor in the following order:

| Order | File | Description |
|-------|------|-------------|
| 1 | `db/schema.sql` | Core tables (users, agents, conversations) |
| 2 | `db/phase3-schema.sql` | Context assets system |
| 3 | `db/phase3.5-schema.sql` | Parthenon (departments, roles, OKRs) |
| 4 | `db/phase4-schema.sql` | Actions framework |
| 5 | `db/phase5-s2e-schema.sql` | Strategy-to-Execution engine |
| 6 | `db/phase5.1-skills-schema.sql` | Skills system |
| 7 | `db/phase6-briefing-schema.sql` | Briefing system |
| 8 | `db/phase7-align120-schema.sql` | Align 120 company profile |
| 9 | `db/phase8-strategy120-schema.sql` | Strategy 120 portfolio |
| 10 | `db/phase10-execute120.sql` | Execute 120 workflows |
| 11 | `db/phase11-onboarding.sql` | User onboarding system |

**Important:** Run each file completely before moving to the next.

---

## 4. Company Configuration

After database setup, configure the client's company information.

### Company Profile (Align 120)

Run in SQL Editor:

```sql
INSERT INTO company_profiles (
    name,
    industry,
    industry_segment,
    company_size,
    employee_count,
    founding_year,
    headquarters,
    status,
    is_current
) VALUES (
    'Client Company Name',           -- Replace with actual name
    'Technology',                     -- Industry category
    'Enterprise Software',            -- Specific segment
    'medium',                         -- startup/small/medium/enterprise
    150,                              -- Employee count
    2015,                             -- Year founded
    'San Francisco, CA',              -- HQ location
    'active',
    true
);
```

### Strategic Foundations

```sql
INSERT INTO strategic_foundations (
    vision,
    mission,
    core_values,
    planning_period,
    period_start,
    period_end,
    status,
    is_current
) VALUES (
    'To be the leading provider of...',           -- Vision statement
    'We help companies achieve...',               -- Mission statement
    ARRAY['Integrity', 'Innovation', 'Excellence', 'Customer Focus'],  -- Core values
    '2025-2027',                                  -- Planning period name
    '2025-01-01',                                 -- Start date
    '2027-12-31',                                 -- End date
    'active',
    true
);
```

---

## 5. Seed Data Installation

### Run Consolidated Seed Script

Execute the master seed script to populate all default data:

```bash
# From project root
psql -h your-supabase-host -U postgres -d postgres -f db/seeds/master-seed.sql
```

Or run in Supabase SQL Editor: `db/seeds/master-seed.sql`

### What Gets Installed

| Category | Count | Description |
|----------|-------|-------------|
| Departments | 6 | Sales, Marketing, Operations, Finance, HR, Executive |
| Context Asset Types | 18 | Standard asset categories |
| Default Agents | 15+ | Align, Strategy, and Execute agents |
| Workflows | 5 | Campaign Builder, Proposal Builder, SOP Creator, etc. |
| Action Templates | 6 | Ready-to-use action configurations |
| BSC Perspectives | 4 | Financial, Customer, Internal, Learning |

### Individual Seed Files (Alternative)

If you prefer to run seeds individually:

```sql
-- 1. Departments
\i db/seed-departments.sql

-- 2. Context Asset Types
\i db/seed-asset-types.sql

-- 3. Agents
\i db/seed-agents.sql

-- 4. Workflows
\i db/seed-workflows.sql

-- 5. Department-Agent Mappings
\i db/seed-department-agents.sql
```

---

## 6. User Setup

### Create Admin User

1. Start the application:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:3000/login

3. Click "Sign Up" and create the first admin account

4. In Supabase SQL Editor, promote to admin:
   ```sql
   UPDATE users
   SET role = 'admin'
   WHERE email = 'admin@client-domain.com';
   ```

### Configure Supabase Auth

In Supabase Dashboard > Authentication > Settings:

1. **Site URL**: Set to client's domain
2. **Redirect URLs**: Add allowed callback URLs
3. **Email Templates**: Customize with client branding
4. **Disable email confirmation** (for testing only):
   - Auth > Settings > Email Auth > Confirm email = OFF

---

## 7. Verification Checklist

After setup, verify each component works:

### API Health Check

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","services":{...}}
```

### Component Verification

| Component | Test URL | Expected |
|-----------|----------|----------|
| Dashboard | `/` | Dashboard loads with widgets |
| Login | `/login` | Auth form works |
| Agents | `/api/agents` | JSON list of agents |
| Departments | `/api/execute120/departments` | 6 departments |
| Chat | `/chat.html` | Chat interface loads |
| Execute 120 | `/execute120` | Department tabs visible |
| Strategy 120 | `/strategy120` | Strategy dashboard loads |
| Align 120 | `/align120` | Company profile visible |

### Database Verification

Run in SQL Editor:

```sql
-- Check table counts
SELECT 'departments' as table_name, COUNT(*) as count FROM departments
UNION ALL
SELECT 'agents', COUNT(*) FROM agents
UNION ALL
SELECT 'workflows', COUNT(*) FROM workflows
UNION ALL
SELECT 'context_asset_types', COUNT(*) FROM context_asset_types
UNION ALL
SELECT 'users', COUNT(*) FROM users;
```

Expected minimum counts:
- departments: 6
- agents: 10+
- workflows: 5
- context_asset_types: 18

---

## 8. Post-Setup Tasks

### Client Onboarding

1. **First Login**: New users see onboarding wizard
2. **Profile Setup**: Name, avatar, department selection
3. **Feature Tour**: Introduction to key features
4. **First Workflow**: Guided workflow execution

### Content Population

Help client populate their context:

1. **Company Description** - Who they are, mission, history
2. **Products/Services** - Offerings, features, benefits
3. **Voice DNA** - Brand voice, tone, style rules
4. **ICP** - Ideal Customer Profile
5. **Core Values** - Guiding principles
6. **Competitors** - Competitive landscape

### Strategic Setup (Optional)

For full Strategy 120 functionality:

1. Create Strategic Themes (2-4 focus areas)
2. Set up Balanced Scorecard objectives
3. Create company and department OKRs
4. Map initiatives to strategic themes

### Customization Options

| Feature | Location | Purpose |
|---------|----------|---------|
| Branding | `public/css/styles.css` | Colors, fonts |
| Logo | `public/assets/` | Company logo |
| Agents | Database or `/agents` | Custom AI agents |
| Workflows | Database or admin | Custom workflows |

---

## Quick Reference

### Common Commands

```bash
# Start development server
npm run dev

# Start production server
npm start

# Run tests
npm test

# Check lint
npm run lint
```

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | System health check |
| `/api/auth/login` | POST | User authentication |
| `/api/agents` | GET | List all agents |
| `/api/execute120/departments` | GET | List departments |
| `/api/onboarding/state` | GET | User onboarding status |

### Support Resources

- **Setup Issues**: Check `docs/SETUP.md`
- **API Documentation**: `documentation/api/`
- **User Guides**: `documentation/guides/`

---

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

**Database connection failed:**
- Verify SUPABASE_URL and keys in `.env`
- Check Supabase project is active

**No agents appearing:**
- Run seed-agents.sql
- Check agents table has is_active = true

**Departments not loading:**
- Run seed-departments.sql
- Verify /api/execute120/departments returns data

---

*Last Updated: January 2026*
*Version: 2.11*
