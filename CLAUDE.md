# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**yt-viewer** is a Next.js 15 application for browsing, searching, and managing YouTube videos with NocoDB backend integration and PWA/offline capabilities.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5.4, Tailwind CSS v4, shadcn/ui, Vitest

## Development Commands

```bash
# Development
pnpm dev          # Start dev server (Turbopack, port 3030)
pnpm build        # Production build

# Testing
pnpm test         # Run all tests
pnpm test:watch   # Watch mode
pnpm test <pattern>           # Run tests matching pattern
pnpm test path/to/file.test.ts # Run specific test file

# Code Quality
pnpm lint         # ESLint
```

## Architecture

### Directory Structure

```
src/
├── app/              # Next.js App Router (Server Components)
│   ├── api/          # API routes
│   └── (routes)/     # Page routes
├── features/         # Domain modules
│   ├── videos/       # Video browsing/search
│   └── offline/      # PWA/offline functionality
└── shared/           # Reusable components, hooks, utils
    ├── api/          # API layer (NocoDB client)
    ├── components/   # Shared UI components
    └── lib/          # Utilities
```

### Client-Server Split (Critical)

**IndexedDB is browser-only** - Server code cannot access it.

- **API routes / Server Components:** Fetch from NocoDB only
- **Client Components:** Can access both NocoDB and IndexedDB
- Never try to access IndexedDB from server-side code

This pattern is fundamental to the offline feature architecture.

### NocoDB Integration

Location: `src/shared/api/nocodb/`

**Three Zod schemas:**
1. `videoSchema` - Full video details (use for detail views)
2. `videoListItemSchema` - List view items (lighter, use for lists)
3. `videoOfflineCacheItemSchema` - Offline cache items

**Smart preprocessing:** Data from NocoDB goes through preprocessors before Zod validation to handle missing fields and type coercion.

**Cache:** NocoDB client has a 5-minute in-memory cache. Watch for stale empty results.

### Offline/PWA Feature

**Cache strategy:**
- Targets ~200 videos (35MB target, 40MB max)
- Service Worker: network-first for API, cache-first for static assets

**IndexedDB stores** (`src/features/offline/db/`):
- `videos` - Cached video data
- `pendingMutations` - Offline changes queued for sync
- `metadata` - Sync state and timestamps

**Sync flow:**
1. User action offline → Mutation queued in IndexedDB
2. Browser goes online → Batch sync via `/api/offline/sync`
3. Server applies mutations to NocoDB

## Key Documentation

- `AGENTS.md` - Detailed agent guidelines (German, 823 lines)
- `architecture.md` - Architecture documentation
- `SETUP.md` - Environment setup
- `README.md` - User-facing documentation

## Testing

- **14 test files** covering API, components, and offline features
- Framework: Vitest + React Testing Library
- E2E: Playwright (configured)

Run tests before committing changes.

## Common Gotchas

1. **IndexedDB on server:** Will fail - keep in client components only
2. **Stale NocoDB cache:** 5-minute cache can return empty results if NocoDB was temporarily unavailable
3. **Offline mutations:** Always queue locally, sync via API - don't write directly to NocoDB from offline mode
