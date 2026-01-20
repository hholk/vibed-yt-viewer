---
date: 2025-01-17T10:30:00Z
session_name: yt-viewer-init
branch: main
status: active
---

# Work Stream: yt-viewer-init

## Ledger
**Updated:** 2025-01-17T10:30:00Z
**Goal:** Create CLAUDE.md documentation for the yt-viewer project
**Branch:** main
**Test:** pnpm test

### Now
[->] Creating CLAUDE.md from exploration findings

### This Session
- [x] Codebase exploration completed via scout agent
- [x] Architecture patterns documented
- [x] Handoff/ledger structure initialized

### Next
- [ ] Complete CLAUDE.md creation
- [ ] Verify all commands work

### Decisions
- Documentation structure: CLAUDE.md for operational guidance, AGENTS.md (existing German docs) for detailed agent patterns
- No separate ledger file - using handoff embedded ledger

### Workflow State
pattern: documentation
phase: 1
total_phases: 2
retries: 0
max_retries: 3

#### Resolved
- goal: "Create comprehensive project documentation for AI agents"
- resource_allocation: balanced

#### Unknowns
- (none identified)

#### Last Failure
(none)

---

## Context

### Project Overview
**yt-viewer** is a Next.js 15 web application for browsing, searching, and managing YouTube video content with NocoDB backend integration and PWA/offline capabilities.

### Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.4
- **UI:** React 19, Tailwind CSS v4, shadcn/ui
- **Testing:** Vitest, React Testing Library, Playwright (E2E)
- **Database:** NocoDB (external), IndexedDB (browser/offline)
- **Package Manager:** pnpm

### Architecture

**Feature-Based Structure:**
```
src/
├── app/              # Next.js App Router (Server Components)
├── features/         # Domain modules (videos, offline)
│   ├── videos/       # Video browsing/search
│   └── offline/      # PWA/offline functionality
└── shared/           # Reusable components, hooks, utils
```

**Critical Architectural Pattern: Client-Server Split**
- IndexedDB is browser-only → Server code CANNOT access it
- API routes fetch from NocoDB, client code stores in IndexedDB
- This separation is crucial for offline functionality

### NocoDB Integration

**Three Zod Schemas** (in `src/shared/api/nocodb/`):
1. `videoSchema` - Full video details
2. `videoListItemSchema` - List view (lighter)
3. `videoOfflineCacheItemSchema` - Offline cache items

**Smart Preprocessors:**
- Normalize NocoDB data before Zod validation
- Handle missing fields, type coercion
- Watch for stale data (5-minute in-memory cache)

### Offline/PWA Feature

**Cache Strategy:**
- Targets 200 videos (~35MB, max 40MB)
- Service Worker: network-first for API, cache-first for static
- IndexedDB stores: videos, pendingMutations, metadata

**Sync Flow:**
1. Queue offline changes locally
2. Batch sync to NocoDB when online
3. Conflict resolution via timestamp

### Development Commands

```bash
pnpm dev          # Dev server (Turbopack, port 3030)
pnpm build        # Production build
pnpm test         # Run all tests
pnpm test:watch   # Watch mode
pnpm lint         # ESLint
```

**Single Test:**
```bash
pnpm test <pattern>           # Vitest pattern match
pnpm test path/to/file.test.ts # Specific file
```

### Key Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | User-facing documentation (460 lines) |
| `AGENTS.md` | Agent guidelines (823 lines, German) |
| `architecture.md` | Architecture details (252 lines) |
| `SETUP.md` | Setup guide (151 lines) |

### Important Gotchas

1. **IndexedDB on server:** Never try to access IndexedDB from API routes or Server Components
2. **Stale cache:** NocoDB client has 5-minute cache - watch for empty cached results
3. **Offline mutations:** Queue mutations via IndexedDB, sync via `/api/offline/sync`

### Testing

- **14 test files** covering API, components, offline features
- Run tests before committing: `pnpm test`
- E2E tests configured with Playwright

### Current Git State

Branch: `main`
Modified files:
- `package.json`, `pnpm-lock.yaml` (dependency changes)
- `public/sw.js` (service worker updates)
- `src/features/offline/*` (offline mode refactoring)
- Various API and client files

Deleted files (offline refactoring):
- `src/features/offline/cache-manager-client.ts`
- `src/features/offline/cache-manager.ts`
- `src/features/offline/mutations-queue.ts`
- `src/features/offline/sync-manager.ts`

### TODO Items

1. Complete CLAUDE.md with operational commands
2. Consider running tests to verify current state
3. Clean up deleted file references if any remain
