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

## NocoDB (v2) – Canonical Client Rules

- Required env vars (IDs, not names):
  - `NC_URL` (e.g. `http://localhost:8080`)
  - `NC_TOKEN` (API token)
  - `NOCODB_PROJECT_ID` (e.g. `phk8vxq6f1ev08h`)
  - `NOCODB_TABLE_ID` (e.g. `m1lyoeqptp7fq5z`)
- Optional but recommended:
  - `NOCODB_TABLE_NAME` (e.g. `youtubeTranscripts`) so the v1 fallback has a deterministic slug.

- Endpoints primarily used in this workspace (`src/features/videos/api/nocodb.ts`):
  - List/query: `GET {NC_URL}/api/v2/tables/{tableId}/records`
  - Update: `PATCH {NC_URL}/api/v2/tables/{tableId}/records/{rowIdOrId}` with fallback to `PATCH {NC_URL}/api/v1/db/data/v1/{projectId}/{tableName}/{Id}` when the v2 route declines the request
  - Delete: `DELETE {NC_URL}/api/v2/tables/{tableId}/records/{rowIdOrId}` with fallback to `DELETE {NC_URL}/api/v1/db/data/v1/{projectId}/{tableName}/{Id}`

- Headers:
  - `xc-token: <NC_TOKEN>`
  - `Content-Type: application/json`

- Filtering examples:
  - Tag search: `(Hashtags,ilike,%word1%)~and(Hashtags,ilike,%word2%)`
  - Fetch by VideoID: `(VideoID,eq,<videoId>)`

- Validation and parsing: Use Zod schemas (`videoSchema`, `videoListItemSchema`). Preprocessors normalize newline/comma separated strings and linked-record arrays. Dates use `z.coerce.date()`.

## Coding Conventions

- TypeScript strictness is encouraged. Add explicit types where helpful for DX.
- Keep imports at the top of files; do not add imports mid-file.
- For new schemas or fields:
  - Update both `videoSchema` and `videoListItemSchema` if needed.
  - Add comments explaining field formats for beginners.
  - Add tests for parsing and edge cases.

- Error handling: Use `NocoDBRequestError` and `NocoDBValidationError`. When catching Axios errors, log `status`, `statusText`, and a compact `data` snapshot. Prefer actionable messages.

- Caching: Use `getFromCache`, `setInCache`, and `deleteFromCache` in `src/features/videos/api/cache.ts` where appropriate (e.g., single-record fetches). Invalidate/update cache after successful PATCH/DELETE.

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
