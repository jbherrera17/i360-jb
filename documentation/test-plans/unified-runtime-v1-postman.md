# Unified Runtime Backbone v1 - Postman UAT Guide

## Files
- Collection: `documentation/test-plans/unified-runtime-v1.postman_collection.json`

## Import
1. Open Postman.
2. Import the collection JSON.

## Required Variables
Set these collection variables before running:
- `baseUrl` (example: `http://localhost:3000`)
- `accessToken` (Bearer token)
- `orgId`

Optional but useful:
- `userId`
- `departmentId`

## Run Order
1. Run folder `00 Setup & Discovery` first.
2. Then run folders `01` through `06` in order.

The setup folder auto-captures IDs for:
- `agentId`
- `actionId`
- `skillId`
- `workflowId`
- `execute120WorkflowId`
- runtime flag IDs (including `runtime.kill_switch.actions`)

## Notes
- Workflow and Execute120 step requests assume step numbers are valid for the selected workflows. If needed, adjust `workflowStepNumber` / `execute120StepNumber`.
- The workflow step tests allow explicit unsupported responses (`unsupported_in_v1`) as acceptable for v1 control-flow steps.
- `06 Governance, Flags, Isolation` toggles `runtime.kill_switch.actions` ON and then OFF. Run this folder only in staging/test environments.
