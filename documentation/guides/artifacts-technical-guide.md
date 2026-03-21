# Artifacts Technical Guide

**For:** Developers
**Last Updated:** 2026-03-20

---

## Architecture Overview

The Artifact System provides persistent storage for deliverables produced by agents, skills, workflows, and manual uploads.

### Data Model

**artifact_bundles** (parent container):
- Tracks source (agent_execution, workflow_run, skill_output, chat, manual_upload, api)
- Classification: tags[], visibility (private/team/org), status
- Versioning: version number, is_current flag, previous_version_id chain
- Generation metadata: model_used, tokens_used, skill_used

**artifact_parts** (child content pieces):
- Dual content: content_text (inline) + file_path (Supabase Storage for binary)
- Types: markdown, html, json, code, image, pdf, spreadsheet, audio, video, csv, text
- Ordered via sort_order within bundle

### Storage

- Supabase Storage bucket: `artifacts`
- Path convention: `{org_id}/{user_id}/{bundle_id}/{part_id}/{filename}`
- Signed URLs for downloads (1-hour expiry)

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/artifacts` | List bundles (paginated, filterable) |
| GET | `/api/artifacts/my-recent` | User's recent artifacts |
| GET | `/api/artifacts/:id` | Bundle with all parts |
| POST | `/api/artifacts` | Create bundle with inline parts |
| PATCH | `/api/artifacts/:id` | Update metadata |
| DELETE | `/api/artifacts/:id` | Delete bundle + parts + storage |
| POST | `/api/artifacts/:id/parts` | Add text part |
| POST | `/api/artifacts/:id/parts/upload` | Upload binary file (multer, 50MB) |
| GET | `/api/artifacts/:id/parts/:partId/download` | Signed download URL |
| POST | `/api/artifacts/:id/version` | Create new version |

All routes require `requireOrgContext` + `requireModule('artifacts')`.

---

## Service Layer

`server/services/artifactService.js` — factory function `createArtifactService(supabase)`:

- `createBundle()` — create bundle + inline parts in one call
- `uploadPart()` — upload binary to Storage + create part row
- `getRecentForUser()` — for Execute 120 card
- `getBundleWithParts()` — full bundle detail
- `listBundles()` — paginated list with filters
- `updateBundle()` — metadata updates only
- `createVersion()` — clone bundle + parts, increment version
- `deleteBundle()` — cascade delete + Storage cleanup
- `getPartDownloadUrl()` — signed URL generation

---

## Security

- RLS on both tables: owner full access, org/team visibility for reads
- Service role bypass for server-side operations
- `scopeToOrg()` applied on all queries via `requireOrgContext` middleware
- File uploads validated via multer (50MB limit)
- Signed URLs for downloads (never expose raw Storage paths)

---

## Database Schema

See `db/phase85-artifact-system.sql` for:
- Table definitions
- Indexes (org_id, user+current, source, agent, dept, GIN tags, bundle+order)
- RLS policies
- Module registration + role access
- user_favorites entity_type constraint update
