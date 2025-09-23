# Agent Guide

This document describes how the automation/agent (Cascade) and contributors work on this repository. It consolidates conventions, NocoDB usage, testing, and documentation update rules so changes remain robust and consistent.

## Goals

- Keep the codebase robust, performant, and beginner-friendly.
- Use the latest stable boilerplate and library versions when adjusting code.
- Prefer refactoring over duplication.
- Ensure documentation is updated after every task.

## Context7 Usage

- Always use the latest, compatible, stable versions of referenced libraries and patterns.
- Prefer robust & performant solutions.
- Add explanatory comments in code for beginners (especially around complex logic and schemas).

##	•	Required env vars (IDs, not names):
	•	NC_URL (e.g. http://localhost:8080)
	•	NC_TOKEN (API token)
	•	NOCODB_PROJECT_ID (e.g. phk8vxq6f1ev08h)
	•	NOCODB_TABLE_ID (e.g. m1lyoeqptp7fq5z)
	•	Optional but recommended (for v1 fallback):
	•	NOCODB_TABLE_SLUG (e.g. youtubeTranscripts) — use the slug, not the display name, so v1 routes are deterministic.

⸻

Endpoints used in this workspace (src/features/videos/api/nocodb.ts)
	•	List / query (v2):
GET {NC_URL}/api/v2/tables/{tableId}/records
Common query params: limit, offset, fields, sort, where (URL-encode!).
	•	**Update (v2 - filter-based, most reliable):**
PATCH {NC_URL}/api/v2/tables/{tableId}/records
Body: { Id: <recordId>, field1: value1, ... }
**Note:** Uses filter-based approach - puts Record-ID in request body instead of URL path. More reliable than rowId-based updates.
	•	Update (v2 rowId fallback):
PATCH {NC_URL}/api/v2/tables/{tableId}/records/{rowId}
⚠️ rowId here is the NocoDB internal Row ID, not your Id column. If you only know your domain PK (e.g. Id or VideoID), first resolve the record to get its rowId, then PATCH.
	•	Update (v1 fallback):
PATCH {NC_URL}/api/v1/db/data/v1/{projectIdOrSlug}/{tableSlug}/{rowId}
Notes:
	•	Path segment requires rowId, not your Id column value.
	•	This is why NOCODB_TABLE_SLUG is recommended.
	•	Delete (v2 primary):
DELETE {NC_URL}/api/v2/tables/{tableId}/records/{rowId}
	•	Delete (v1 fallback):
DELETE {NC_URL}/api/v1/db/data/v1/{projectIdOrSlug}/{tableSlug}/{rowId}

**Simplified Update Pattern (Recommended):**
	1.	GET /api/v2/tables/{tableId}/records?where=(VideoID,eq,<videoId>)&fields=Id&limit=1
	2.	Use returned Id for the v2 PATCH with Id in request body: PATCH /api/v2/tables/{tableId}/records body: { Id: <id>, field: value }“I have Id/VideoID, not rowId”:
	1.	GET /api/v2/tables/{tableId}/records?where=(VideoID,eq,<videoId>)&limit=1&fields=Id,RowId,...
	2.	Use returned RowId for the v2 PATCH/DELETE.

⸻

Headers
	•	xc-token: <NC_TOKEN>
	•	Content-Type: application/json (for write operations)

⸻

Filtering examples
	•	Tag intersection (case-insensitive contains):
where=(Hashtags,ilike,%word1%)~and(Hashtags,ilike,%word2%)
	•	Fetch by VideoID (exact):
where=(VideoID,eq,<videoId>)
	•	Tips: URL-encode the whole where string; prefer fields=... to trim payloads; use sort=UpdatedAt,desc when you expect recent changes.

⸻

Validation & parsing

Use Zod schemas (videoSchema, videoListItemSchema).
Preprocessors normalize:
	•	newline/comma-separated strings → arrays
	•	linked-record arrays → stable shapes

Dates: z.coerce.date().

⸻

Coding Conventions
	•	TypeScript strictness encouraged; add explicit types when it improves DX.
	•	Keep imports at the top; never inject imports mid-file.
	•	For new schemas/fields:
	•	Update both videoSchema and videoListItemSchema if applicable.
	•	Comment field formats for newcomers.
	•	Add tests for parsing and edge cases.

⸻

Error handling
	•	Throw NocoDBRequestError and NocoDBValidationError.
	•	When catching Axios errors, log:
	•	status, statusText
	•	compact data snapshot (avoid huge payloads)
	•	Prefer actionable messages (include endpoint, tableId, and whether you attempted v1 fallback).
	•	**Debugging Tips:**
	•	Reduced log noise by 80% - only essential retry and error information shown
	•	Metadata endpoint failures (404) indicate table ID or project ID issues
	•	

⸻

Caching

Use getFromCache, setInCache, deleteFromCache in src/features/videos/api/cache.ts.
	•	Good fits: single-record fetches keyed by stable selectors (e.g., VideoID).
	•	After successful PATCH/DELETE, invalidate or update the affected keys.

## Contribution Workflow

- Branch from `main` and follow conventional commit messages.
- Run locally:
  - `pnpm install`
  - `pnpm dev` (app at http://localhost:3030)
  - Ensure `.env.local` contains the required NocoDB variables (IDs).
  - Use `pnpm ensure:video <videoId> [rating] [comment]` if you need to assert an update loop against the configured NocoDB instance.

- Tests:
  - `pnpm test` for unit tests.
  - Prefer writing tests for schema adjustments and client changes.

- Linting:
  - `pnpm lint` and fix all warnings/errors.

- Documentation update rule (mandatory):
  - After every task, update `README.md`, `status.md`, and `prompt.md`.
  - Summarize your changes in `status.md` with Done/In Progress/To Do. Include important variables and endpoint settings in Done.

## Reviewing PRs

- Verify NocoDB env variables are not hard-coded beyond `.env.example`.
- Check that endpoints use IDs (tableId/projectId) and `xc-token` header.
- Spot check Zod validation and preprocessor use.
- Confirm docs were updated.

## Quick Reference

- Core client: `src/features/videos/api/nocodb.ts`
- Schemas: `videoSchema`, `videoListItemSchema`
- Update field parsing if NocoDB returns different formats than expected.
- Use `fields` param in list views to reduce payload.
