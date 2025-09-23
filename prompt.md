# Project Prompt: YouTube Video Viewer

This document outlines the core requirements and preferences for the development of the YouTube Video Viewer application.

## Core Objective

Develop a modern, performant, and user-friendly web application for browsing, searching, and managing a personal collection of YouTube videos stored in a NocoDB backend.

## Key Technical Guidelines

- **Framework:** Use Next.js with the App Router. Prioritize Server Components for performance.
- **Styling:** Use Tailwind CSS and shadcn/ui for a clean, modern, and accessible UI.
- **Data Fetching:** Use Axios for communication with the NocoDB API.
- **Data Integrity:** Use Zod for strict schema validation and data transformation of API responses.
- **Code Quality:** Write clean, readable, and well-documented TypeScript code. Add comments for complex logic to help beginners understand the codebase.
- **Testing:** Use Vitest and React Testing Library to write meaningful tests for components and utility functions.

## Outstanding Issues
- None. All critical video actions are now robust with NocoDB v2 API. Recent improvements include simplified "Update-by-key" pattern that eliminates rowId complexity and provides cleaner debugging output.

## User Rules & Implementation
- All fixes use context7 for latest, stable, robust, and performant code.
- Comments are added for beginners.
- Boilerplate code is always up to date.
- After every task, `prompt.md`, `README.md`, and `status.md` are updated.
- NocoDB v2 usage: endpoints `/api/v2/tables/{tableId}/records` with `xc-token` authentication; required env vars: `NC_URL`, `NC_TOKEN`, `NOCODB_PROJECT_ID`, `NOCODB_TABLE_ID`.
- **Code Optimization**: The NocoDB client has been extensively refactored to eliminate code duplication and improve maintainability:
  - **Schema Preprocessing**: Created reusable preprocessing utilities (`preprocessors` object) to reduce schema definition code by ~70%
  - **API Function Consolidation**: Unified duplicate fetch functions into a single `fetchSingleVideo` function with consistent behavior
  - **Error Handling**: Implemented reusable error handling utilities for consistent logging and debugging
  - **Filter Logic**: Simplified video filtering using configuration-driven approach with generic utilities
  - **Cache Management**: Fixed cache duplication issues and improved cache key consistency
  - All optimizations maintain backward compatibility while significantly improving code quality and performance

---

## NocoDB v2 – Canonical Usage

- Required environment variables (IDs, not names):
  - `NC_URL` (e.g. `http://localhost:8080`)
  - `NC_TOKEN` (API token)
  - `NOCODB_PROJECT_ID` (e.g. `phk8vxq6f1ev08h`)
  - `NOCODB_TABLE_ID` (e.g. `m1lyoeqptp7fq5z`)
  - `NOCODB_TABLE_NAME` (slug, required so stars/notes can fall back to the v1 route)

- Endpoints:
  - List/query: `GET {NC_URL}/api/v2/tables/{tableId}/records`
  - **Update**: `PATCH {NC_URL}/api/v2/tables/{tableId}/records` with `Id` in request body (filter-based, most reliable)
  - Delete: `DELETE {NC_URL}/api/v2/tables/{tableId}/records/{rowId}` (pref) → `/records/{numericId}` (fallback)

- Headers:
  - `xc-token: <NC_TOKEN>`
  - `Content-Type: application/json`

- Filtering examples:
  - Tag search: `(Hashtags,ilike,%word1%)~and(Hashtags,ilike,%word2%)`
  - Detail fetch by VideoID: `(VideoID,eq,<videoId>)`

- Validation & parsing: Always validate responses with Zod. Use preprocessors to normalize NocoDB formats (newline lists, linked records, empty objects). Dates use `z.coerce.date()`.

## Contributor Checklist

- Confirm env vars exist: `NC_URL`, `NC_TOKEN`, `NOCODB_PROJECT_ID`, `NOCODB_TABLE_ID`.
- Prefer `fields=` selection for list/grid views to reduce payload.
- When adding fields to schemas, update both `videoSchema` and `videoListItemSchema` intentionally. Add comments for beginners.
- Update documentation after changes: `README.md`, `status.md`, `prompt.md`.
- Write/adjust tests for schema and client functions when changing parsing logic.


## Development Rules & Preferences

- **Refactor over Add:** When possible, refactor existing code to be more robust and performant rather than adding new, redundant code.
- **Use Latest Versions:** Always prefer the latest stable versions of libraries, frameworks, and boilerplate code (e.g., `context7`).
- **Documentation:** After every major task, update the following files:
    - `README.md`: Keep the main project documentation up-to-date with new features and architectural changes.
    - `status.md`: Maintain a running log of completed tasks, work in progress, and future to-dos. Include important variables and settings in the 'Done' items.
    - `prompt.md`: Review and update this file to reflect the current project state and goals.
- **NocoDB API:** Use NocoDB API v2, ensuring all requests use the required `tableId` and `projectId`.
- **Robots/Crawling:** During development, all crawlers are disallowed via `public/robots.txt` with `User-agent: *` and `Disallow: /`. Update when SEO is desired.
 - **Detail View Export:** Provide a subtle top-center button to export the current video as `Title-VideoID.md` with YAML frontmatter and content sections (summaries, lists, description, transcript).
