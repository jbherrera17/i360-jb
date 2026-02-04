# Insight 360 Database Migration Order

Run these SQL files in the Supabase SQL Editor in the order listed below.
Each section must complete before moving to the next.

## Foundation

1. `schema.sql` — Core tables (users, agents, conversations, messages)
2. `seed.sql` — Starter agents and base data
3. `phase3-schema.sql` — Context assets
4. `phase3.5-schema.sql` — Context extensions
5. `phase4-schema.sql` — Actions framework
6. `phase4.1-action-parthenon.sql` — Parthenon governance
7. `phase4.2-integrity-fixes.sql`
8. `phase4.5-model-override.sql`
9. `phase5-skills-schema.sql` — Skills
10. `phase5-s2e-schema.sql` — Strategy-to-Execution
11. `phase5.1-s2e-schedule-schema.sql`

## Modules & Features

12. `phase6-briefing-schema.sql`
13. `phase6-research-studio-schema.sql`
14. `phase7-company-profile-schema.sql`
15. `phase7-align120-fix.sql`
16. `phase8-strategy120-schema.sql`
17. `phase10-execute120.sql`
18. `phase11-onboarding.sql`
19. `phase13-business-roles.sql`
20. `phase13-department-strategy.sql`
21. `phase13-governance.sql`
22. `phase13-integrity.sql`
23. `phase14-agent-starters.sql`
24. `phase17-align120-module-results.sql`
25. `phase18-workflow-enhancements.sql`
26. `phase18-align120-category-fix.sql`
27. `phase19-department-filters.sql`
28. `phase19-visibility-defaults.sql`
29. `phase19-agent-lineage.sql`
30. `phase19-fix-rls-service-role.sql`
31. `phase19-align120-integration-schema.sql`
32. `phase19-align120-integration-schema-simple.sql`
33. `phase20-fix-align120-rls.sql`
34. `phase21-add-assessment-category.sql`
35. `phase22-title-management.sql`
36. `phase24-thought-leadership-schema.sql`
37. `phase25-model-availability-schema.sql`
38. `phase26-asset-types-category.sql`
39. `phase27-security-fixes.sql`
40. `phase28-add-align120-completed.sql`

## Platform v3 & SynergiNexus

41. `phase3.0-synerginexus-schema.sql`
42. `phase3.0-seed-tags.sql`
43. `phase3.0-seed-digm-governance.sql`
44. `v3.0-combined-init.sql`

## Enterprise & Multi-Tenancy

45. `phase32-execute120-strategy-integration.sql`
46. `phase36-tl-enhancements-schema.sql`
47. `phase37-execute120-personalization.sql`
48. `phase39-agency-foundation.sql`
49. `phase39-rls-org-aware.sql`
50. `phase39-fix-rls-recursion.sql`
51. `phase39-fix-user-fk.sql`
52. `phase40-connection-management.sql`
53. `phase40-client-profile-constraint.sql`
54. `phase41-agency-customization.sql`
55. `phase42-client-users.sql`
56. `phase43-agency-analytics.sql`
57. `phase44-enterprise-multitenancy.sql`
58. `phase45-resource-access.sql`
59. `phase46-module-resource-org.sql`
60. `phase47-user-status.sql`
61. `phase48-integrations.sql`
62. `phase49-integration-addon-pricing.sql`
63. `phase50-role-based-resources.sql`
64. `phase52-platform-tier.sql`
65. `phase53-navigation-restructure.sql`

## RLS & Security Fixes (run after all schemas)

64. `phase3.1-fix-departments-rls.sql`
65. `phase3.2-fix-all-rls-bugs.sql`
66. `fix-rls-production-bugs.sql`
67. `fix-security-definer-views.sql`
68. `migration-security-fixes.sql`
69. `migration-users-rls-fix.sql`
70. `migration-users-rls-fix-v2.sql`
71. `migration-user-roles.sql`
72. `migration-schema-sync.sql`
73. `migration-sync-users.sql`
74. `migration-system-agents.sql`

## Seed Data (run after all schemas and fixes)

75. `seed-departments.sql`
76. `seed-parthenon-roles.sql`
77. `seed-parthenon-processes.sql`
78. `seed-parthenon-okrs.sql`
79. `seed-agent-suites.sql`
80. `seed-align120-agents.sql`
81. `seed-strategy120-agents-part1.sql`
82. `seed-strategy120-agents-part2.sql`
83. `seed-strategy120-context-mappings.sql`
84. `seed-department-agents.sql`
85. `seed-integrity-agents.sql`
86. `seed-integrity-agents-v2.sql`
87. `seed-integrity-asset-instances.sql`
88. `seed-integrity-asset-types.sql`
89. `seed-asset-types.sql`
90. `seed-core-company-assets.sql`
91. `seed-execute120-departments.sql`
92. `seed-hr-executive-okrs.sql`
93. `seed-skills-from-content-system.sql`
94. `seed-skill-brand-guidelines-generator.sql`
95. `seed-thought-leadership-action.sql`
96. `seed-thought-leadership-agents.sql`
97. `seed-thought-leadership-skills.sql`
98. `seed-thought-leadership-workflow.sql`
99. `seed-thought-leadership-calendar-q2-q4.sql`
100. `seed-thought-leadership-profile.sql`
101. `seed-tl-niche-discovery-workflow.sql`
102. `seed-tl-weekly-pipeline-workflow.sql`
103. `seed-higgins-knowledge.sql`
104. `import-content-creation-system.sql`
105. `import-content-creation-system-v2.sql`

## Utility (run only if needed)

- `cleanup-duplicate-agents.sql` — Remove duplicate agents
- `fix-agent-categories.sql` — Fix agent category assignments
- `fix-align120-agent-categories.sql` — Fix Align120 categories
- `verify-strategy120-agents.sql` — Verify Strategy120 agent setup
