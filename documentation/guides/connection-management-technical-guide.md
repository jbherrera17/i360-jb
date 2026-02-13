# Connection Management Technical Guide

**For:** Insight 360 Developers
**Last Updated:** Wednesday, February 12, 2026
**Phase:** 40 - Connection Management Infrastructure

---

## Overview

The Connection Management system provides infrastructure for linking organizational entities (departments, roles, responsibilities, OKRs) to AI capabilities (agents, skills, workflows, actions). This enables role-based access control and intelligent tool recommendations.

---

## Architecture

### Database Schema (Phase 40)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONNECTION MANAGEMENT TABLES                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  skill_roles              - Role-level access to skills              │
│  skill_tags               - Tag-based skill matching                 │
│  skill_okr_mappings       - Skills to OKRs connection                │
│  responsibility_agents    - Agents recommended per responsibility    │
│  responsibility_skills    - Skills recommended per responsibility    │
│  responsibility_workflows - Workflows recommended per responsibility │
│  user_ai_assignments      - Individual user overrides                │
│                                                                      │
│  VIEWS:                                                              │
│  user_full_capabilities   - Aggregated user access                   │
│  okr_supporting_capabilities - OKR-to-capability mapping             │
│  responsibility_ai_recommendations - AI recommendations view         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Table Definitions

#### skill_roles
```sql
CREATE TABLE skill_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    role_level TEXT NOT NULL REFERENCES business_role_levels(id),
    permission TEXT NOT NULL DEFAULT 'execute'
        CHECK (permission IN ('view', 'execute')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(skill_id, role_level)
);
```

#### skill_okr_mappings
```sql
CREATE TABLE skill_okr_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    okr_id UUID NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,
    contribution_type TEXT NOT NULL DEFAULT 'supports'
        CHECK (contribution_type IN ('supports', 'measures', 'drives')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(skill_id, okr_id)
);
```

#### responsibility_agents
```sql
CREATE TABLE responsibility_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    responsibility_id UUID NOT NULL REFERENCES responsibilities(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    recommendation_strength TEXT DEFAULT 'suggested'
        CHECK (recommendation_strength IN ('required', 'recommended', 'suggested')),
    use_case_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(responsibility_id, agent_id)
);
```

#### user_ai_assignments
```sql
CREATE TABLE user_ai_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL
        CHECK (entity_type IN ('agent', 'skill', 'workflow', 'action')),
    entity_id UUID NOT NULL,
    assignment_type TEXT NOT NULL DEFAULT 'granted'
        CHECK (assignment_type IN ('granted', 'revoked', 'featured')),
    assigned_by UUID REFERENCES users(id),
    reason TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, entity_type, entity_id)
);
```

---

## API Routes

### Base Path: `/api/connections`

#### User Capabilities
```
GET /api/connections/capabilities
Returns: All AI capabilities accessible to the current user

Response:
{
  "success": true,
  "data": [
    {
      "entity_type": "agent",
      "entity_id": "uuid",
      "entity_name": "Strategy Advisor",
      "access_source": "role",
      "is_featured": true
    }
  ]
}
```

#### Responsibility AI Mappings
```
GET /api/connections/responsibilities/:id/ai
Returns: All AI recommendations for a responsibility

POST /api/connections/responsibilities/:id/agents
Body: { agent_id, recommendation_strength, use_case_note }

POST /api/connections/responsibilities/:id/skills
Body: { skill_id, recommendation_strength, use_case_note }

POST /api/connections/responsibilities/:id/workflows
Body: { workflow_id, recommendation_strength, use_case_note }

DELETE /api/connections/responsibilities/:id/agents/:agentId
DELETE /api/connections/responsibilities/:id/skills/:skillId
DELETE /api/connections/responsibilities/:id/workflows/:workflowId
```

#### Skill OKR Mappings
```
GET /api/connections/skills/:id/okrs
Returns: OKRs mapped to a skill

POST /api/connections/skills/:id/okrs
Body: { okr_id, contribution_type }

DELETE /api/connections/skills/:skillId/okrs/:okrId
```

#### OKR Capabilities
```
GET /api/connections/okrs/:id/capabilities
Returns: All capabilities supporting an OKR
```

#### User Assignments (Admin)
```
GET /api/connections/users/:id/assignments
Returns: Individual overrides for a user

POST /api/connections/users/:id/assignments
Body: { entity_type, entity_id, assignment_type, reason, expires_at }

DELETE /api/connections/users/:userId/assignments/:assignmentId
```

---

## Views

### user_full_capabilities

Aggregates all access paths for a user:

1. Role-level access (via business_role on users table)
2. Department access (via department_id and junction tables)
3. Tag-based matching (via responsibility_tags → entity_tags)
4. Responsibility recommendations
5. Individual assignments (grants/revokes)

```sql
SELECT * FROM user_full_capabilities WHERE user_id = 'user-uuid';
```

### okr_supporting_capabilities

Combines action_okrs, workflow_okr_mappings (if exists), and skill_okr_mappings:

```sql
SELECT * FROM okr_supporting_capabilities WHERE okr_id = 'okr-uuid';
```

---

## Frontend Pages

### my-capabilities.html

**Purpose:** User dashboard showing accessible AI tools

**API Calls:**
- `GET /api/connections/capabilities`

**Key Elements:**
- Summary cards (counts by type)
- Filterable capability grid
- Access source indicators

### admin-responsibilities.html

**Purpose:** List and manage responsibilities

**API Calls:**
- `GET /api/synerginexus/responsibilities`

**Key Elements:**
- Searchable responsibility list
- AI mapping count badges
- Links to AI configuration

### admin-responsibility-ai.html

**Purpose:** Configure AI recommendations for a responsibility

**API Calls:**
- `GET /api/synerginexus/responsibilities/:id`
- `GET /api/connections/responsibilities/:id/ai`
- `POST /api/connections/responsibilities/:id/{agents|skills|workflows}`
- `DELETE /api/connections/responsibilities/:id/{agents|skills|workflows}/:entityId`
- `GET /api/agents`, `GET /api/skills`, `GET /api/workflows`

**Key Elements:**
- Three sections: Agents, Skills, Workflows
- Add modal with strength selection
- Use case note input

### admin-department-ai.html

**Purpose:** Configure department-level AI settings

**API Calls:**
- `GET /api/departments/:id`
- `GET /api/departments/:id/agents`
- `GET /api/workflows?department_id=:id`
- `GET /api/skills?department_id=:id`
- `GET /api/departments/:id/quick-prompts`
- Various POST/DELETE for each entity type

**Key Elements:**
- Tabbed interface (Agents, Workflows, Skills, Prompts)
- Featured agent toggle
- Quick prompt editor

### admin-okr-capabilities.html

**Purpose:** View and manage capabilities supporting an OKR

**API Calls:**
- `GET /api/strategy120/okrs/:id`
- `GET /api/connections/okrs/:id/capabilities`
- `GET /api/skills`
- `POST /api/connections/skills/:id/okrs`

**Key Elements:**
- OKR header with key results
- Capability sections by type
- Add skill modal

### client-comparison.html

**Purpose:** Cross-client comparison for agencies

**API Calls:**
- `GET /api/clients?org_id=:orgId`
- Client stats (placeholder for now)

**Key Elements:**
- Summary statistics
- Comparison table
- Progress/health indicators
- Chart placeholders

---

## Route File

**Location:** `server/routes/connections.js`

```javascript
module.exports = function(supabase) {
    const router = express.Router();

    // My capabilities
    router.get('/capabilities', async (req, res) => {...});

    // Responsibility AI mappings
    router.get('/responsibilities/:id/ai', async (req, res) => {...});
    router.post('/responsibilities/:id/agents', async (req, res) => {...});
    // ... etc

    return router;
};
```

---

## Testing

### Unit Tests

Test files should cover:
- Route handlers for each endpoint
- View query accuracy
- Edge cases (no mappings, overlapping access)

### Integration Tests

```javascript
describe('Connection Management', () => {
    it('should return user capabilities from all sources', async () => {
        const res = await request(app)
            .get('/api/connections/capabilities')
            .set('Authorization', `Bearer ${testToken}`);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toContainEqual(
            expect.objectContaining({ entity_type: 'agent' })
        );
    });
});
```

---

## Migration Notes

### Running Phase 40 Schema

```sql
-- In Supabase SQL Editor
-- Run db/phase40-connection-management.sql

-- Verify tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%responsibility%' OR table_name LIKE '%skill_%';

-- Verify views created
SELECT viewname FROM pg_views WHERE schemaname = 'public'
AND viewname IN ('user_full_capabilities', 'okr_supporting_capabilities');
```

### Dependencies

Phase 40 depends on:
- Phase 3 (responsibilities, tags)
- Phase 4 (actions, action_okrs)
- Phase 24 (skills)
- Phase 32 (workflow_okr_mappings - optional)
- Phase 37 (workflow_roles)

---

## Security Considerations

### RLS Policies

All new tables include Row Level Security:

```sql
-- Example: responsibility_agents
ALTER TABLE responsibility_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view responsibility agents"
ON responsibility_agents FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage responsibility agents"
ON responsibility_agents FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'superadmin')
    )
);
```

### API Authorization

Routes check authentication and authorization:

```javascript
router.post('/responsibilities/:id/agents', async (req, res) => {
    // Verify user is authenticated
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Verify admin permissions (optional)
    // ...
});
```

---

## Performance Considerations

### View Optimization

The `user_full_capabilities` view uses UNION ALL for efficiency:

```sql
-- Each access path is a separate subquery
-- UNION ALL avoids deduplication overhead
-- Final GROUP BY aggregates access sources
```

### Caching Strategy

Consider caching for:
- User capabilities (invalidate on role/department change)
- OKR capabilities (invalidate on mapping change)

---

## Troubleshooting

### Common Issues

**"No capabilities shown"**
- Check user has role assigned
- Verify department membership
- Check responsibility assignments

**"View returns no data"**
- Verify prerequisite tables exist
- Check RLS policies allow access
- Confirm junction table records exist

**"API returns 500"**
- Check Supabase connection
- Verify table/view names match
- Review server logs for details
