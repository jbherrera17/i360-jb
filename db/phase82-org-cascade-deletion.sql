-- ============================================================================
-- Phase 82: Organization Cascade Deletion
-- ============================================================================
-- Changes SET NULL foreign keys to CASCADE so org deletion cleanly removes
-- all dependent data. Also adds CASCADE to tables that had no cascade action.
--
-- Tables affected (SET NULL -> CASCADE):
--   agents, skills, workflows, actions, conversations, context_assets,
--   okrs, align120_sessions, company_profiles, briefings
--
-- Tables affected (no action -> CASCADE):
--   user_integrations, crm_entity_mapping, crm_activities, workflow_executions
--
-- Created: March 19, 2026

-- ============================================
-- 1. CHANGE SET NULL TO CASCADE
-- ============================================

-- agents: org_id ON DELETE SET NULL -> CASCADE
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_org_id_fkey;
ALTER TABLE agents ADD CONSTRAINT agents_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- skills: org_id ON DELETE SET NULL -> CASCADE
ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_org_id_fkey;
ALTER TABLE skills ADD CONSTRAINT skills_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- workflows: org_id ON DELETE SET NULL -> CASCADE
ALTER TABLE workflows DROP CONSTRAINT IF EXISTS workflows_org_id_fkey;
ALTER TABLE workflows ADD CONSTRAINT workflows_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- actions: org_id ON DELETE SET NULL -> CASCADE
ALTER TABLE actions DROP CONSTRAINT IF EXISTS actions_org_id_fkey;
ALTER TABLE actions ADD CONSTRAINT actions_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- conversations: org_id ON DELETE SET NULL -> CASCADE
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_org_id_fkey;
ALTER TABLE conversations ADD CONSTRAINT conversations_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- context_assets: org_id ON DELETE SET NULL -> CASCADE
ALTER TABLE context_assets DROP CONSTRAINT IF EXISTS context_assets_org_id_fkey;
ALTER TABLE context_assets ADD CONSTRAINT context_assets_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- okrs: org_id ON DELETE SET NULL -> CASCADE
ALTER TABLE okrs DROP CONSTRAINT IF EXISTS okrs_org_id_fkey;
ALTER TABLE okrs ADD CONSTRAINT okrs_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- align120_sessions: org_id ON DELETE SET NULL -> CASCADE
ALTER TABLE align120_sessions DROP CONSTRAINT IF EXISTS align120_sessions_org_id_fkey;
ALTER TABLE align120_sessions ADD CONSTRAINT align120_sessions_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- company_profiles: org_id ON DELETE SET NULL -> CASCADE
ALTER TABLE company_profiles DROP CONSTRAINT IF EXISTS company_profiles_org_id_fkey;
ALTER TABLE company_profiles ADD CONSTRAINT company_profiles_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- briefings: org_id ON DELETE SET NULL -> CASCADE
ALTER TABLE briefings DROP CONSTRAINT IF EXISTS briefings_org_id_fkey;
ALTER TABLE briefings ADD CONSTRAINT briefings_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- ============================================
-- 2. ADD CASCADE WHERE MISSING
-- ============================================

-- user_integrations: org_id had no cascade action
ALTER TABLE user_integrations DROP CONSTRAINT IF EXISTS user_integrations_org_id_fkey;
ALTER TABLE user_integrations ADD CONSTRAINT user_integrations_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- crm_entity_mapping: org_id had no cascade action
ALTER TABLE crm_entity_mapping DROP CONSTRAINT IF EXISTS crm_entity_mapping_org_id_fkey;
ALTER TABLE crm_entity_mapping ADD CONSTRAINT crm_entity_mapping_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- crm_activities: org_id had no cascade action
ALTER TABLE crm_activities DROP CONSTRAINT IF EXISTS crm_activities_org_id_fkey;
ALTER TABLE crm_activities ADD CONSTRAINT crm_activities_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- workflow_executions: org_id had no cascade action
ALTER TABLE workflow_executions DROP CONSTRAINT IF EXISTS workflow_executions_org_id_fkey;
ALTER TABLE workflow_executions ADD CONSTRAINT workflow_executions_org_id_fkey
    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
