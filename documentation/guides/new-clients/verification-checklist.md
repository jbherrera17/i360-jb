# Post-Setup Verification Checklist

Use this checklist to verify a new Insight 360 deployment is working correctly.

---

## Quick Health Check

```bash
# Start the server
npm run dev

# In another terminal, check API health
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "services": {
    "claude": true,
    "gpt": true,
    "perplexity": true,
    "search": true,
    "database": true
  }
}
```

---

## Database Verification

Run in Supabase SQL Editor:

```sql
-- Check all required tables exist and have data
SELECT 'departments' as table_name, COUNT(*) as count FROM departments
UNION ALL SELECT 'agents', COUNT(*) FROM agents
UNION ALL SELECT 'workflows', COUNT(*) FROM workflows
UNION ALL SELECT 'workflow_steps', COUNT(*) FROM workflow_steps
UNION ALL SELECT 'context_asset_types', COUNT(*) FROM context_asset_types
UNION ALL SELECT 'bsc_perspectives', COUNT(*) FROM bsc_perspectives
UNION ALL SELECT 'department_agents', COUNT(*) FROM department_agents;
```

### Expected Minimum Counts

| Table | Minimum Count |
|-------|---------------|
| departments | 6 |
| agents | 15 |
| workflows | 5 |
| workflow_steps | 20 |
| context_asset_types | 18 |
| bsc_perspectives | 4 |
| department_agents | 10 |

---

## Page-by-Page Verification

### Authentication

| Check | URL | Expected Result |
|-------|-----|-----------------|
| Login page loads | `/login` | See login/signup form |
| Can create account | `/login` (signup) | Account created, redirected |
| Can login | `/login` | Login successful, see dashboard |
| Logout works | Click logout | Redirected to login |

### Dashboard

| Check | URL | Expected Result |
|-------|-----|-----------------|
| Dashboard loads | `/` | See main dashboard with widgets |
| Onboarding widget | `/` | See "Getting Started" if new user |
| Navigation works | Sidebar links | All pages accessible |

### Execute 120

| Check | URL | Expected Result |
|-------|-----|-----------------|
| Page loads | `/execute120` | See department tabs |
| Departments visible | `/execute120` | 6 department tabs |
| Agents load | Click department | See featured agents |
| Workflows visible | Click department | See department workflows |
| Can run workflow | Click "Run" | Workflow wizard opens |

### Strategy 120

| Check | URL | Expected Result |
|-------|-----|-----------------|
| Page loads | `/strategy120` | Strategy dashboard |
| Can access modules | Click modules | Module content loads |

### Align 120

| Check | URL | Expected Result |
|-------|-----|-----------------|
| Page loads | `/align120` | Company profile view |
| Modules accessible | Click modules | Module content loads |

### Chat

| Check | URL | Expected Result |
|-------|-----|-----------------|
| Chat loads | `/chat.html` | Chat interface |
| Agent selector works | Dropdown | See list of agents |
| Can send message | Type and send | AI responds |

### Context Assets

| Check | URL | Expected Result |
|-------|-----|-----------------|
| Page loads | `/context` | Context manager |
| Asset types visible | | 18 asset type cards |
| Can create asset | Click type | Creation form works |

### Parthenon

| Check | URL | Expected Result |
|-------|-----|-----------------|
| Page loads | `/parthenon` | Org structure view |
| Departments visible | | 6 departments |

### Profile

| Check | URL | Expected Result |
|-------|-----|-----------------|
| Page loads | `/profile` | Profile settings |
| Can update name | Edit and save | Name updated |
| Department dropdown | | Shows 6 departments |

---

## API Endpoint Verification

```bash
# Authentication
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Agents
curl http://localhost:3000/api/agents

# Departments
curl http://localhost:3000/api/execute120/departments

# Workflows
curl http://localhost:3000/api/execute120/workflows

# Context Asset Types
curl http://localhost:3000/api/context/types

# Health
curl http://localhost:3000/api/health
```

---

## Onboarding Flow Verification

1. Clear localStorage: `localStorage.clear()` in browser console
2. Login as new user or existing user
3. Verify onboarding wizard appears
4. Complete each step:
   - [ ] Welcome screen shows
   - [ ] Profile step - can enter name, select department
   - [ ] Feature tour - cards are clickable
   - [ ] Workflow step - shows available workflows
   - [ ] Complete screen - shows success message
5. Verify wizard doesn't appear on next login

---

## AI Integration Tests

### Claude (Anthropic)

1. Go to Chat
2. Select any agent
3. Send a message
4. Verify response from Claude

### GPT (OpenAI)

1. Check if GPT model option appears in chat
2. If voice enabled, test audio features

### Search (Brave/Tavily/Serper)

1. Ask agent a question requiring current information
2. Verify search results are incorporated

---

## Error Conditions to Test

| Scenario | Expected Behavior |
|----------|-------------------|
| Invalid login | Error message shown |
| API timeout | Graceful error handling |
| Missing required field | Validation message |
| Session expired | Redirect to login |

---

## Performance Checks

| Metric | Target |
|--------|--------|
| Initial page load | < 3 seconds |
| API response | < 2 seconds |
| AI response start | < 5 seconds |

---

## Final Sign-Off

| Item | Verified | Notes |
|------|----------|-------|
| All pages load | [ ] | |
| Authentication works | [ ] | |
| Database populated | [ ] | |
| AI integrations work | [ ] | |
| Onboarding complete | [ ] | |
| Error handling works | [ ] | |

**Verified By:** _______________
**Date:** _______________
**Client:** _______________
