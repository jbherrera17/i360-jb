# Insight 360 Database Migration Order

> Auto-generated from `db/*.sql`. Regenerate with:
> `node db/_generate-migration-order.mjs`

Run the sections in order. For a greenfield install, execute each
section top-to-bottom. For an existing instance, apply only the
migrations not yet run — Supabase tracks completed schema in your
project.

## 1. Foundation

Core schema and starter data. Required before any phase migration.

- `schema.sql` — Insight 360 Database Schema
- `seed.sql` — Insight 360 Seed Data

## 2. Phase Migrations

Feature schemas in numeric order. Within a single phase, files are run alphabetically (e.g. `phase87` before `phase87b`).

- `phase3-schema.sql` — Insight 360 - Phase 3: Context Assets Schema
- `phase3.0-seed-digm-governance.sql` — Insight 360 - Phase 3.0: Seed DIGM & Governance
- `phase3.0-seed-tags.sql` — Insight 360 - Phase 3.0: Seed Tags & Roles
- `phase3.0-synerginexus-schema.sql` — Insight 360 - Phase 3.0: SynergiNexus Schema
- `phase3.1-fix-departments-rls.sql` — Insight 360 - Phase 3.1: Fix Departments RLS
- `phase3.2-fix-all-rls-bugs.sql` — Insight 360 - Phase 3.2: Fix All RLS Production Bugs
- `phase3.5-schema.sql` — Insight 360 - Phase 3.5: Parthenon Schema
- `phase4-schema.sql` — Insight 360 - Phase 4: Actions Framework Schema
- `phase4.1-action-parthenon.sql` — Insight 360 - Phase 4.1: Action-Parthenon Integration
- `phase4.2-integrity-fixes.sql` — Insight 360 - Phase 4.2: Integrity System Fixes
- `phase4.5-model-override.sql` — Phase 4.5: Model Override & Conversation Tracking
- `phase5-s2e-schema.sql` — Insight 360 - Phase 5: Strategy-to-Execution Engine (S2E)
- `phase5-skills-schema.sql` — Insight 360 - Phase 5: Skills Framework Schema
- `phase5.1-s2e-schedule-schema.sql` — INSIGHT 360 - S2E Schedule Configuration Schema
- `phase6-briefing-schema.sql` — PHASE 6: DAILY BRIEFING & WORKFLOWS
- `phase6-research-studio-schema.sql` — Phase 6: Research Studio Schema
- `phase7-align120-fix.sql` — Insight 360 - Align 120 Schema Fix
- `phase7-company-profile-schema.sql` — Insight 360 - Phase 7: Company Profile & Align 120 Outputs
- `phase8-strategy120-schema.sql` — INSIGHT 360 - Phase 8: Strategy 120 Extended Schema
- `phase10-execute120.sql` — Insight 360 - Phase 10: Execute 120
- `phase11-onboarding.sql` — Insight 360 - Phase 11: Onboarding System
- `phase13-business-roles.sql` — PHASE 13: BUSINESS ROLES SCHEMA
- `phase13-department-strategy.sql` — PHASE 13: DEPARTMENT STRATEGY SCHEMA
- `phase13-governance.sql` — PHASE 13: GOVERNANCE SCHEMA
- `phase13-integrity.sql` — PHASE 13: INTEGRITY TRACKING SCHEMA
- `phase14-agent-starters.sql` — Insight 360 - Phase 14: Agent Conversation Starters & Introduction
- `phase17-align120-module-results.sql` — Insight 360 - Phase 17: Align 120 Module Results
- `phase18-align120-category-fix.sql` — INSIGHT 360 - Phase 18: Align 120 Agent Category Fix
- `phase18-workflow-enhancements.sql` — Insight 360 - Phase 18: Enhanced Workflow System
- `phase19-agent-lineage.sql` — Phase 19: Agent Lineage Tracking
- `phase19-align120-integration-schema-simple.sql` — INSIGHT 360 - Phase 19: Align 120 Integration Schema (SIMPLE)
- `phase19-align120-integration-schema.sql` — INSIGHT 360 - Phase 19: Align 120 Integration Schema
- `phase19-department-filters.sql` — Insight 360 - Phase 19: Department Filter Support
- `phase19-fix-rls-service-role.sql` — Phase 19: Fix RLS Policies for Service Role Access
- `phase19-visibility-defaults.sql` — Insight 360 - Phase 19: Default Visibility Settings
- `phase20-fix-align120-rls.sql` — Insight 360 - Phase 20: Fix Align 120 Sessions RLS
- `phase21-add-assessment-category.sql` — Insight 360 - Phase 21: Add Assessment Category
- `phase22-title-management.sql` — Insight 360 - Phase 22: Title Management
- `phase24-thought-leadership-schema.sql` — Insight 360 - Phase 24: Thought Leadership Schema
- `phase25-model-availability-schema.sql` — Phase 25: Model Availability Check Schema
- `phase26-asset-types-category.sql` — Insight 360 - Phase 26: Add Category to Asset Types
- `phase27-security-fixes.sql` — INSIGHT 360 - Phase 27: Complete Security Fixes
- `phase28-add-align120-completed.sql` — Insight 360 - Phase 28: Add align120_completed and final report columns
- `phase32-execute120-strategy-integration.sql` — INSIGHT 360 - Phase 32: Execute 120 Strategy Integration Schema
- `phase36-tl-enhancements-schema.sql`
- `phase37-execute120-personalization.sql` — Phase 37: Execute120 User Profile Personalization
- `phase39-agency-foundation.sql` — Phase 39: Agency Foundation - Multi-Tenant Architecture
- `phase39-fix-rls-recursion.sql` — Phase 39 Fix: RLS Policy Recursion Fix
- `phase39-fix-user-fk.sql` — Phase 39: Fix User Foreign Key References
- `phase39-rls-org-aware.sql` — Phase 39: Organization-Aware RLS Policies
- `phase40-client-profile-constraint.sql` — Phase 40: 1:1 Client-Profile Enforcement
- `phase40-connection-management.sql` — Phase 40: Connection Management Infrastructure
- `phase41-agency-customization.sql` — Phase 41: Agency-Level Customization
- `phase42-client-users.sql` — Phase 42: Client Self-Service Portal
- `phase43-agency-analytics.sql` — Phase 43: Agency Analytics & Reporting
- `phase44-enterprise-multitenancy.sql` — Phase 44: Enterprise Multi-Tenancy Enhancement
- `phase45-resource-access.sql` — PHASE 45: RESOURCE ACCESS CONTROL
- `phase46-module-resource-org.sql` — PHASE 46: MODULE MANAGEMENT & RESOURCE ORG
- `phase47-user-status.sql` — Phase 47: User Account Status Management
- `phase48-integrations.sql` — Phase 48: Integration Framework
- `phase49-integration-addon-pricing.sql` — PHASE 49: Integration Addon Pricing Per Tier
- `phase50-role-based-resources.sql` — PHASE 50: ROLE-BASED RESOURCE ASSIGNMENT
- `phase52-platform-tier.sql` — PHASE 52: PLATFORM TIER (UNLIMITED RESOURCES)
- `phase53-navigation-restructure.sql` — PHASE 53: NAVIGATION RESTRUCTURE
- `phase54-soul-configuration.sql` — Phase 54: Soul Configuration & Human Values System
- `phase54m-fix-search-paths-rls.sql` — Phase 54m: Database Security Hardening - Function Search Paths & RLS Policies
- `phase55-agency-tier-split.sql` — Phase 55: Agency Tier Split + Soft Limit Infrastructure
- `phase56-branding-expansion.sql` — Phase 56: Branding Expansion
- `phase57-agent-introductions.sql` — Phase 57: Agent Introductions & Conversation Starters
- `phase57-module-addon-pricing.sql` — PHASE 57: Module Add-on Pricing
- `phase57-remove-prompt-transformer.sql` — Phase 57: Remove Prompt Transformer module
- `phase57b-delete-legacy-agency-tier.sql` — PHASE 57b: Delete Legacy 'agency' Tier
- `phase58-invite-system.sql` — PHASE 58: Email Invitation System
- `phase59-guardrail-enforcement.sql` — Phase 59: Guardrail & Bright Line Enforcement System
- `phase59c-cleanup-orphan-departments.sql` — Phase 59c: Clean up orphan departments with NULL org_id
- `phase59d-fix-check-org-limits.sql` — Phase 59d: Fix check_org_limits column name mismatch
- `phase59d-fix-departments-org-fk.sql` — Phase 59d: Fix departments.org_id FK to CASCADE on org deletion
- `phase59d-rename-consultant-to-member.sql` — Phase 59d: Rename 'consultant' role to 'member' in organization_members
- `phase59e-context-template-flag.sql` — Phase 59e: Add is_template flag to context_assets
- `phase60-easy-start.sql` — Phase 60: Easy Start Module Registration
- `phase60-social-media-publishing.sql` — Phase 60: Social Media Publishing via Postiz Integration
- `phase60b-social-media-pricing.sql` — Phase 60b: Social Media Publishing - Pricing & Usage Limits
- `phase61-execute120-personal-command-center.sql` — Phase 61: Execute 120 Personal Command Center
- `phase61b-execute120-enhancements.sql` — Phase 61b: Execute 120 Enhancements
- `phase61c-workflow-execution-name.sql` — Phase 61c: Add name column to workflow_executions
- `phase62-open-brain-module.sql` — PHASE 62: OPEN BRAIN MODULE
- `phase63-mcp-integration.sql` — PHASE 63: MCP INTEGRATION SYSTEM
- `phase64-conversation-enhancements.sql` — Phase 64: Conversation Panel Enhancements
- `phase64-integrity-dashboard.sql` — Phase 64: Integrity Dashboard Overhaul
- `phase65-test-data-reset.sql` — Phase 65: Test Data Reset Function
- `phase66-ai-digest.sql` — INSIGHT 360 - Phase 66: AI Digest
- `phase67-digest-discovery.sql` — INSIGHT 360 - Phase 67: Digest Source Discovery Sessions
- `phase67-unified-runtime-backbone.sql` — Insight 360 - Phase 67: Unified Runtime Backbone Flags
- `phase68-tags-org-scoping.sql` — Phase 68: Tags Organization Scoping
- `phase69-tier-nav-consistency.sql` — Phase 69: Tier-Nav Consistency
- `phase70-role-change-audit.sql` — Phase 70: Role Change Audit Table
- `phase70b-business-role-per-org.sql` — Phase 70b: Move business_role to organization_members (per-org instead of per-user)
- `phase71-support-system.sql` — INSIGHT 360 - Phase 71: Customer Support Agent System
- `phase72-tl-publishing.sql` — PHASE 72: Thought Leadership Publishing Pipeline
- `phase73-embeddable-chat-widgets.sql` — PHASE 73: Embeddable Chat Widgets
- `phase75-editorial-calendar.sql` — PHASE 75: Editorial Calendar Schema + 2026 Seed Data
- `phase76-tl-content-workflow.sql` — PHASE 76: TL Content Creation Workflow
- `phase76b-tl-generation-preferences.sql` — PHASE 76b: TL Generation Preferences
- `phase81-infrastructure-integrity.sql` — Phase 81: Infrastructure Integrity Remediation
- `phase82-org-cascade-deletion.sql` — Phase 82: Organization Cascade Deletion
- `phase83-skillsync.sql` — Insight 360 - Phase 83: SkillSync Schema
- `phase85-artifact-system.sql` — Phase 85: Artifact System
- `phase86-mvp-module-cuts.sql` — Phase 86: MVP Module Cuts
- `phase87-tier-module-matrix.sql` — Phase 87: Tier Configuration Overhaul (REQ-003)
- `phase87b-tier-module-seed.sql` — Phase 87b: Tier Module Matrix Backfill + Pricing Update (REQ-003)
- `phase87c-tier-marketing-copy-seed.sql` — Phase 87c: Tier Marketing Copy — PLACEHOLDERS (REQ-003)
- `phase87d-reactivate-modules.sql` — Phase 87d: Reactivate Phase 86 Deactivated Modules (REQ-003)
- `phase88-org-config-overrides.sql` — Phase 88: Per-Org Configuration Overrides (REQ-003)
- `req-002a-nav-label-rename.sql` — REQ-002a Step 6: Rename platform_modules nav labels for the Chat Support System.
- `v3.0-combined-init.sql` — Insight 360 - v3.0 Combined Initialization

## 3. Migrations & Fixes

Schema corrections and security fixes. Run after phase migrations.

- `fix-rls-production-bugs.sql` — Insight 360 - Fix RLS Production Bugs
- `fix-security-definer-views.sql` — Migration: Fix SECURITY DEFINER views and enable RLS on exposed tables
- `migration-schema-sync.sql` — Insight 360 - Schema Sync Migration
- `migration-security-fixes.sql` — Insight 360 - Security Migration: View & RLS Fixes
- `migration-sync-users.sql` — Insight 360 - Sync Users Migration
- `migration-system-agents.sql` — INSIGHT 360 - System Agent Protection Migration
- `migration-user-roles.sql` — INSIGHT 360 - User Roles Migration
- `migration-users-rls-fix-v2.sql` — Insight 360 - Users Table RLS Policy Fix v2
- `migration-users-rls-fix.sql` — Insight 360 - Users Table RLS Policy Fix

## 4. Seed Data

Reference data and content imports. Run after schema is fully built.

- `import-content-creation-system-v2.sql` — Insight 360 - Import Content Creation System Assets v2
- `import-content-creation-system.sql` — Insight 360 - Import Content Creation System Assets
- `seed-agent-suites.sql` — Seed Agent Suite Assignments
- `seed-align120-agents.sql` — INSIGHT 360 - ALIGN 120 AGENTS
- `seed-asset-types.sql` — INSIGHT 360 - PHASE 3: SEED CONTEXT ASSET TYPES
- `seed-core-company-assets.sql` — INSIGHT 360 - CORE COMPANY ASSETS (Template Data)
- `seed-department-agents.sql` — INSIGHT 360 - DEPARTMENT-FOCUSED AGENTS
- `seed-departments.sql` — Seed Departments for Execute 120
- `seed-execute120-departments.sql` — Execute120 Department Personalization Seed Data
- `seed-higgins-knowledge.sql` — INSIGHT 360 - HIGGINS KNOWLEDGE BASE
- `seed-hr-executive-okrs.sql` — Insight 360 - Seed: HR & Executive OKRs
- `seed-integrity-agents-v2.sql` — INSIGHT 360 - INTEGRITY AGENTS (v2)
- `seed-integrity-agents.sql` — INSIGHT 360 - INTEGRITY AGENTS
- `seed-integrity-asset-instances.sql` — INSIGHT 360 - INTEGRITY ASSET INSTANCES (Example Data)
- `seed-integrity-asset-types.sql` — INSIGHT 360 - INTEGRITY METRICS ASSET TYPES
- `seed-parthenon-okrs.sql` — Insight 360 - Seed: Parthenon OKRs
- `seed-parthenon-processes.sql` — Insight 360 - Seed: Parthenon Processes
- `seed-parthenon-roles.sql` — Insight 360 - Seed: Parthenon Roles
- `seed-skill-brand-guidelines-generator.sql` — Insight 360 - Skill: Brand Guidelines Generator
- `seed-skills-from-content-system.sql` — Insight 360 - Skills Import from Content Creation System
- `seed-strategy120-agents-part1.sql` — INSIGHT 360 - Strategy 120 Agent Seed Data (Part 1)
- `seed-strategy120-agents-part2.sql` — INSIGHT 360 - Strategy 120 Agent Seed Data (Part 2)
- `seed-strategy120-context-mappings.sql` — INSIGHT 360 - Strategy 120 Agent Context Mappings
- `seed-thought-leadership-action.sql` — INSIGHT 360 - THOUGHT LEADERSHIP ACTION
- `seed-thought-leadership-agents.sql` — INSIGHT 360 - THOUGHT LEADERSHIP AGENTS
- `seed-thought-leadership-calendar-q2-q4.sql` — INSIGHT 360 - THOUGHT LEADERSHIP CALENDAR Q2-Q4 2026
- `seed-thought-leadership-profile.sql` — INSIGHT 360 - THOUGHT LEADERSHIP PROFILE SEED DATA
- `seed-thought-leadership-skills.sql` — INSIGHT 360 - THOUGHT LEADERSHIP SKILLS
- `seed-thought-leadership-workflow.sql` — Insight 360 - Thought Leadership Workflow Template
- `seed-tl-niche-discovery-workflow.sql` — Insight 360 - TL Niche Discovery Workflow
- `seed-tl-weekly-pipeline-workflow.sql` — Insight 360 - TL Weekly Pipeline Workflow
- `seed-voice-dna.sql` — SEED: Voice DNA Context Asset + Agent Mapping

## 5. Utilities (run only when needed)

Cleanup, verification, and one-off repair scripts. Not part of the standard install path.

- `cleanup-duplicate-agents.sql` — INSIGHT 360 - Duplicate Agent Cleanup Script
- `fix-agent-categories.sql` — Fix invalid agent categories
- `fix-align120-agent-categories.sql` — FIX: Align 120 Agent Categories
- `verify-strategy120-agents.sql` — INSIGHT 360 - Strategy 120 Agent Verification Script

_162 files indexed._
