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
- None. All critical video actions (Personal Note upload, "Neu Transkribieren", Delete Video) are now robust, performant, and fully functional with NocoDB v2 API.

## User Rules & Implementation
- All fixes use context7 for latest, stable, robust, and performant code.
- Comments are added for beginners.
- Boilerplate code is always up to date.
- After every task, prompt.md, readme.md, and status.md are updated.
- Video note upload, re-transcribe, and delete actions are fixed and robust with NocoDB v2 API.

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
