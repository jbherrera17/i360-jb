-- Phase 57: Remove Prompt Transformer module
-- The Prompt Transformer page has been removed (superseded by chat artifact system).
-- This cleans up the platform_modules entry so it no longer appears in navigation.

-- Remove any org-level module access overrides
DELETE FROM org_module_access WHERE module_id = 'prompts';

-- Remove any role-level module access
DELETE FROM role_module_access WHERE module_id = 'prompts';

-- Remove the module definition
DELETE FROM platform_modules WHERE id = 'prompts';
