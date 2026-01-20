# Codebase Report: YouTube Video Viewer - Comprehensive Architecture Analysis
Generated: 2025-01-17

## Executive Summary

**YouTube Video Viewer** is a sophisticated Next.js 15 application for browsing, searching, and managing YouTube video content with offline PWA capabilities. Built with TypeScript, it features a modern tech stack including React 19, Tailwind CSS v4, shadcn/ui components, and NocoDB v2 backend integration. The application includes advanced search, offline functionality with IndexedDB, text-to-speech integration, and comprehensive testing infrastructure.

---

## 1. Project Type and Tech Stack

### Core Framework & Language
- **Framework**: Next.js 15.3.2 with App Router (React Server Components)
- **Runtime**: Turbopack (Next.js's fast bundler)
- **Language**: TypeScript 5.4.5 (strict mode enabled)
- **React**: Version 19.0.0 (latest)
- **Package Manager**: pnpm

### Frontend Libraries
- **UI Components**: 
  - shadcn/ui (Radix UI primitives)
  - `@radix-ui/react-select`, `@radix-ui/react-slot`
  - `class-variance-authority` (CVA for component variants)
  - `lucide-react` (icon library)
- **Styling**: 
  - Tailwind CSS v4
  - `tailwind-merge`, `clsx` (class name utilities)
  - Custom dark theme with IBM Plex fonts
- **Data Fetching**: 
  - SWR 2.3.3 (stale-while-revalidate)
  - Axios 1.9.0 (HTTP client)
- **Markdown**: 
  - `react-markdown` with `remark-gfm` (GitHub Flavored Markdown)

### Backend & Database
- **Backend**: NocoDB v2 REST API
- **Schema Validation**: Zod 3.24.4
- **Offline Storage**: IndexedDB via `idb` library (8.0.3)

### Testing Stack
- **Test Runner**: Vitest 3.1.3
- **Component Testing**: React Testing Library
  - `@testing-library/react` 16.0.0
  - `@testing-library/jest-dom` 6.4.8
  - `@testing-library/user-event` 14.6.1
- **E2E Testing**: Playwright 1.52.0
- **Test Environment**: jsdom 26.1.0
- **Mocking**: `fake-indexeddb` 6.2.5

### Development Tools
- **Linting**: ESLint 9 with Next.js config
- **Build Tool**: Turbopack (enabled via `--turbopack` flag)
- **Path Aliases**: `@/*` → `./src/*`, `@/features/*`, `@/shared/*`

---

## 2. Build, Test, Lint, and Dev Commands

### Development Commands
```bash
# Start development server (Turbopack enabled, port 3030)
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Type checking (implicit via Next.js)
pnpm tsc --noEmit
```

### Testing Commands
```bash
# Run all tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with Vitest UI
pnpm test:ui

# Generate coverage report
pnpm coverage
```

### Linting
```bash
# Run ESLint
pnpm lint

# Auto-fix linting issues
pnpm lint --fix
```

### Utility Scripts
```bash
# Ensure video state (NocoDB testing script)
pnpm ensure:video <id> [rating] [comment]
```

---

## 3. High-Level Architecture

### Architecture Pattern
The application follows a **feature-based architecture** with clear separation between:
- **Server Components** (data fetching, SEO)
- **Client Components** (interactivity, browser APIs)
- **API Routes** (server-side endpoints)
- **Feature modules** (domain-specific code)

### Directory Structure

```
yt-viewer/
├── src/
│   ├── app/                          # Next.js 15 App Router
│   │   ├── (main)/                   # Main application routes
│   │   │   ├── page.tsx              # Home page (Server Component)
│   │   │   ├── layout.tsx            # Root layout with fonts
│   │   │   ├── globals.css           # Global styles & theme
│   │   │   ├── video/[videoId]/      # Dynamic video detail routes
│   │   │   ├── settings/             # Offline/PWA settings page
│   │   │   └── login/                # Authentication page
│   │   │
│   │   ├── api/                      # API Routes (server-side)
│   │   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── videos/               # Video CRUD endpoints
│   │   │   ├── offline/sync/         # Offline sync endpoint
│   │   │   ├── search/               # Advanced search endpoint
│   │   │   ├── tts/                  # Text-to-Speech proxy
│   │   │   └── [videoId]/            # Video-specific operations
│   │   │       ├── details/          # Video detail endpoint
│   │   │       └── export/           # Video export endpoint
│   │   │
│   │   ├── api-docs/                 # API documentation
│   │   ├── admin/                    # Admin dashboard
│   │   └── .well-known/              # Security & metadata
│   │
│   ├── features/                     # Feature modules (domain-driven)
│   │   ├── videos/                   # Video domain
│   │   │   ├── api/                  # NocoDB client layer
│   │   │   │   ├── nocodb.ts         # Main export (barrel file)
│   │   │   │   ├── video-service.ts  # Fetch operations (444 lines)
│   │   │   │   ├── mutations.ts      # Update/delete operations (245 lines)
│   │   │   │   ├── schemas.ts        # Zod validation schemas (401 lines)
│   │   │   │   ├── config.ts         # Environment configuration
│   │   │   │   ├── cache.ts          # In-memory cache (5min TTL)
│   │   │   │   ├── http-client.ts    # Axios wrapper
│   │   │   │   ├── record-utils.ts   # Record ID resolution
│   │   │   │   ├── table-metadata.ts # Table metadata caching
│   │   │   │   ├── errors.ts         # Custom error classes
│   │   │   │   └── *.test.ts         # Unit tests
│   │   │   │
│   │   │   ├── components/           # Video UI components
│   │   │   │   ├── video-card.tsx    # Video thumbnail card
│   │   │   │   ├── video-list-client.tsx
│   │   │   │   ├── sort-dropdown.tsx # Sorting controls
│   │   │   │   ├── StarRating.tsx    # Interactive rating component
│   │   │   │   └── *.test.tsx        # Component tests
│   │   │   │
│   │   │   └── server/               # Server-side utilities
│   │   │       └── load-home-page-data.ts
│   │   │
│   │   └── offline/                  # Offline/PWA feature
│   │       ├── db/                   # IndexedDB layer
│   │       │   ├── schema.ts         # DB schema definition
│   │       │   └── client.ts         # CRUD operations
│   │       ├── hooks/                # React hooks
│   │       │   ├── use-offline-mode.ts    # Main offline hook
│   │       │   ├── use-offline-stats.ts   # Cache statistics
│   │       │   └── use-honeypot-logs.ts   # Security logging
│   │       ├── offline-search.ts    # Client-side search
│   │       ├── offline-mode.ts       # Offline utilities
│   │       ├── schemas.ts            # Offline data schemas
│   │       └── *.test.ts             # Feature tests
│   │
│   ├── shared/                       # Shared utilities
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── textarea.tsx
│   │   │   │   ├── switch.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── alert.tsx
│   │   │   │   └── skeleton.tsx
│   │   │   ├── search-component.tsx  # Advanced search UI
│   │   │   ├── search-autocomplete.tsx
│   │   │   ├── offline-indicator.tsx # PWA status indicator
│   │   │   ├── pwa-install-prompt.tsx
│   │   │   ├── service-worker-registration.tsx
│   │   │   ├── safe-react-markdown.tsx
│   │   │   ├── markdown-table.tsx
│   │   │   ├── error-boundary.tsx
│   │   │   └── video-card-skeleton.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── use-text-to-speech.ts # TTS integration hook
│   │   │   └── use-mounted.ts
│   │   │
│   │   └── utils/
│   │       ├── cn.ts                 # Class name merger
│   │       ├── logger.ts             # Client-side logging
│   │       └── server-logger.ts      # Server-side logging
│   │
│   ├── types/                        # Global type definitions
│   │   ├── next.d.ts
│   │   └── next-image.d.ts
│   │
│   ├── __mocks__/                    # Test mocks
│   │   └── next/
│   │       └── image.ts              # Next.js Image mock
│   │
│   └── setupTests.ts                 # Vitest setup file
│
├── public/                           # Static assets
│   ├── sw.js                         # Service Worker (PWA)
│   ├── manifest.json                 # PWA manifest
│   ├── idb.min.js                    # IndexedDB polyfill for SW
│   └── [svg icons]
│
├── scripts/                          # Utility scripts
│   └── load-env.cjs                  # ENV loader for scripts
│
├── Documentation Files:
│   ├── README.md                     # User-facing documentation
│   ├── AGENTS.md                     # Agent guidelines (German, comprehensive)
│   ├── architecture.md               # Architecture documentation
│   ├── SETUP.md                      # Setup guide
│   ├── TTS_README.md                 # TTS documentation
│   └── agent.md                      # Additional agent docs
│
├── Configuration Files:
│   ├── package.json                  # Dependencies & scripts
│   ├── next.config.ts                # Next.js configuration
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── tailwind.config.js            # Tailwind CSS configuration
│   ├── vitest.config.ts              # Vitest configuration
│   ├── eslint.config.mjs             # ESLint configuration
│   ├── postcss.config.mjs            # PostCSS configuration
│   └── .env.example                  # Environment variables template
│
└── .gitignore                        # Git ignore rules
```

### Key Architectural Patterns

#### 1. **Feature-Based Organization**
- Each major feature (videos, offline) has its own directory
- Features contain their own API layer, components, hooks, and tests
- Promotes code locality and maintainability

#### 2. **Client-Server Split (Critical for Offline/PWA)**
**Important**: IndexedDB is browser-only, creating a necessary split:

- **Server-side** (`/api/offline/sync`):
  - Fetches videos from NocoDB
  - Filters fields (no transcripts for size)
  - Executes mutations
  - **No IndexedDB access** (would crash)

- **Client-side** (`use-offline-mode.ts`):
  - Stores videos in IndexedDB
  - Manages mutation queue
  - Handles sync workflow

#### 3. **Layered Data Access**
```
UI Components
    ↓
API Routes (optional proxy)
    ↓
NocoDB Client Layer (fetchVideos, updateVideo, etc.)
    ↓
HTTP Client (Axios wrapper)
    ↓
Cache Layer (5min TTL, in-memory)
    ↓
NocoDB v2 REST API
```

#### 4. **Schema-Driven Validation**
- All NocoDB responses validated with Zod
- Preprocessors normalize inconsistent NocoDB data
- Three main schemas:
  - `videoSchema`: Full record (detail page)
  - `videoListItemSchema`: Minimal fields (grid view)
  - `videoOfflineCacheItemSchema`: Offline cache (no transcripts)

#### 5. **Component Architecture**
- **Server Components** (default): Data fetching, static rendering
- **Client Components** (`'use client'`): Interactivity, browser APIs
- Clear boundary: Server fetches → Client renders

---

## 4. Key Features & Implementation Patterns

### 4.1 Advanced Search System
**Location**: `src/shared/components/search-component.tsx`

**Features**:
- macOS Finder-like tag-based search interface
- Database-wide search (not just client-side filtering)
- 17 searchable categories (Title, Description, Hashtags, Persons, Companies, etc.)
- Visual category indicators with icons
- Real-time search with tag management

**Implementation**:
- API endpoint: `/api/search`
- NocoDB filtering with `where` clause
- Example: `(Hashtags,ilike,%word1%)~and(Hashtags,ilike,%word2%)`

### 4.2 Offline/PWA Functionality
**Location**: `src/features/offline/`

**Architecture**:
- **IndexedDB Storage**: Up to 200 videos (35MB target, 40MB max)
- **Service Worker**: Network-first for API, cache-first for static assets
- **Sync Strategy**:
  1. Cache sync: Fetch 200 latest videos → Store in IndexedDB
  2. Mutation sync: Queue offline changes → Batch sync to NocoDB

**Critical Lessons** (from AGENTS.md):
1. Always `clearAllCache()` before offline sync fetches
2. Use `videoListItemSchema`, not `videoOfflineSchema`
3. Sort by `-CreatedAt`, not `-PublishedAt`
4. Use explicit field lists (not all fields exist in NocoDB)

**Storage Schema**:
```typescript
interface OfflineDBSchema {
  videos: {
    key: number;           // Video.Id
    value: VideoOffline;   // Without transcripts
    indexes: { 'by-videoId', 'by-publishedAt', 'by-createdAt' };
  };
  pendingMutations: {
    key: string;           // UUID
    value: PendingMutation;
    indexes: { 'by-timestamp', 'by-videoId' };
  };
  metadata: {
    key: string;           // 'offlineModeEnabled', 'lastSync'
    value: unknown;
  };
}
```

### 4.3 NocoDB Integration
**Location**: `src/features/videos/api/`

**Key Functions**:
- `fetchVideos(options)`: Paginated list with sorting, filtering
- `fetchAllVideos(options)`: All pages (with caching)
- `fetchVideoByVideoId(videoId)`: Single record by YouTube ID
- `updateVideo(id, data)`: Update with fallback strategies
- `deleteVideo(id)`: Delete with fallback strategies

**Update/Delete Fallback Strategy**:
1. Try v2 `rowId` endpoint
2. Fallback to numeric `Id` endpoint
3. Fallback to bulk filter endpoint
4. Handle missing fields gracefully

**Preprocessors** (normalize NocoDB data):
- `stringToArrayOrNull`: Newline-separated strings → arrays
- `stringToLinkedRecordArray`: Comma-separated → linked records
- `emptyObjectToNull`: `{}` → `null`
- `extractUrlFromArray`: Attachment arrays → URL strings
- `parseSentiment`: Number parsing for sentiment field

### 4.4 Text-to-Speech (TTS)
**Location**: `src/shared/hooks/use-text-to-speech.ts`

**Architecture**:
- **TTS Server**: CosyVoice 3 (separate repo, `~/CosyVoice/`)
- **Proxy**: `/api/tts` (Next.js API route)
- **Hook**: Client-side TTS state management

**Features**:
- Prefetch-ahead buffering (2 segments)
- Automatic language detection (German/English)
- Text chunking (2 sentences, max 600 chars)
- Markdown stripping
- Server-side audio caching (hash-based)

**Startup**: `./tts-app.sh start` (manages both services)

### 4.5 Authentication
**Location**: `src/middleware.ts`

**Implementation**:
- Simple cookie-based auth (`yt-viewer-auth`)
- Middleware protection for all routes except:
  - `/login`
  - `/api/auth/*`
  - `/api/offline/*` (for Service Worker)
  - Static assets

**Environment Variable**: `APP_PASSWORD` (default: `yt-viewer-1234`)

---

## 5. Existing Documentation

### Primary Documentation Files

1. **README.md** (460 lines)
   - User-facing feature documentation
   - Setup instructions
   - NocoDB configuration guide
   - Testing instructions
   - Project structure overview
   - Markdown table rendering docs
   - Dark theme & font documentation

2. **AGENTS.md** (823 lines, German)
   - Comprehensive agent guidelines
   - Architecture decisions (client-server split)
   - Offline/PWA troubleshooting
   - NocoDB integration details
   - Development workflow
   - Testing patterns
   - Deployment guide
   - Commit guidelines

3. **architecture.md** (252 lines)
   - System overview
   - Data flow diagrams (Mermaid)
   - Key modules documentation
   - NocoDB API endpoints
   - Validation & preprocessing
   - TTS architecture
   - Future improvements

4. **SETUP.md** (151 lines)
   - Prerequisites
   - Step-by-step setup
   - Docker NocoDB setup
   - Database schema
   - Running tests/building

5. **TTS_README.md**
   - TTS server setup
   - API documentation
   - Configuration options

### No Cursor/Copilot Rules Found
- No `.cursorrules`, `.copilot*`, or similar files detected
- Project relies on AGENTS.md for AI agent guidelines

---

## 6. Important Configuration Files

### 6.1 Environment Variables (.env.example)

**Required Variables**:
```bash
# NocoDB Configuration
NC_URL=http://localhost:8080
NC_TOKEN=your_nocodb_token_here
NOCODB_PROJECT_ID=your_project_id_here
NOCODB_TABLE_ID=your_table_id_here

# Application Settings
NEXT_PUBLIC_APP_NAME="Vibed YT Viewer"
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Password Protection
APP_PASSWORD=yt-viewer-1234

# Optional: TTS Server
# NEXT_PUBLIC_TTS_API_URL=http://127.0.0.1:50000
```

### 6.2 Next.js Configuration (next.config.ts)

**Key Settings**:
- Remote image patterns: `i.ytimg.com` (YouTube thumbnails)
- Environment variable passthrough for NocoDB config
- Default port: 3030 (via `pnpm dev` script)

### 6.3 TypeScript Configuration (tsconfig.json)

**Key Settings**:
- Strict mode enabled
- Path aliases: `@/*`, `@/features/*`, `@/shared/*`
- Target: ES5
- Module resolution: Node
- Incremental compilation: enabled

### 6.4 Tailwind Configuration (tailwind.config.js)

**Theme Extensions**:
- Custom colors: `brand` (HSL variables)
- Custom font size: `fluid-base`
- Font families:
  - `sans`: IBM Plex Sans
  - `serif`: IBM Plex Serif
  - `mono`: IBM Plex Mono

**Content Paths**:
- `./src/app/**/*.{js,ts,jsx,tsx,mdx}`
- `./src/features/**/*.{js,ts,jsx,tsx,mdx}`
- `./src/shared/**/*.{js,ts,jsx,tsx,mdx}`

### 6.5 Vitest Configuration (vitest.config.ts)

**Key Settings**:
- Environment: `jsdom` (browser simulation)
- Globals enabled (no imports needed for `describe`, `it`, `expect`)
- Setup file: `./src/setupTests.ts`
- Path aliases (matches TypeScript)
- Next.js Image mocking
- UI mode support: `pnpm test:ui`

### 6.6 ESLint Configuration (eslint.config.mjs)

**Extends**:
- `next/core-web-vitals`
- `next/typescript`

### 6.7 Middleware Configuration (src/middleware.ts)

**Matcher**:
- All routes except static assets
- Blocks `/_next/server/` requests

**Protected Routes**:
- Requires `yt-viewer-auth=authenticated` cookie
- Exceptions: `/login`, `/api/auth`, `/api/offline`, static assets

---

## 7. Testing Infrastructure

### Test Coverage by Module

**Video API Layer**:
- `nocodb.test.ts` (114 lines)
- `errors.test.ts` (19 lines)
- `navigation-search.test.ts` (54 lines)

**Video Components**:
- `video-card.test.tsx`
- `StarRating.test.tsx`

**Offline Feature**:
- `offline-mode.test.ts`
- `use-offline-mode.test.tsx`
- `client.test.ts` (IndexedDB operations)

**Shared Components**:
- `search-component.test.tsx`
- `use-mounted.test.tsx`

**Utilities**:
- `cn.test.ts` (class name merger)

**Server-Side**:
- `load-home-page-data.test.ts`

**Security**:
- `honeypot-annoyance.test.ts`

### Testing Patterns

**Unit Tests** (Vitest):
```typescript
import { describe, it, expect } from 'vitest';

describe('fetchVideos', () => {
  it('should fetch videos from NocoDB', async () => {
    const result = await fetchVideos({ limit: 10 });
    expect(result.videos).toHaveLength(10);
  });
});
```

**Component Tests** (React Testing Library):
```typescript
import { render, screen } from '@testing-library/react';

it('renders video title', () => {
  render(<VideoCard video={mockVideo} />);
  expect(screen.getByText('Test Video')).toBeInTheDocument();
});
```

---

## 8. Critical Implementation Details

### 8.1 Cache Management (src/features/videos/api/cache.ts)

**Implementation**:
- In-memory Map-based cache
- 5-minute TTL
- Cache key includes: sort, limit, page, fields, query

**Critical Issue**:
- Cache can contain stale empty results
- Solution: `clearAllCache()` before critical fetches

### 8.2 Field Selection Strategy

**Problem**: Not all fields exist in NocoDB
**Solution**:
1. Use explicit field lists
2. Handle 404 "FIELD_NOT_FOUND" errors
3. NocoDB auto-removes missing fields
4. Retry without missing fields

### 8.3 Service Worker (public/sw.js)

**Cache Strategy**:
- **API routes**: Network-first (offline fallback message)
- **Static assets**: Cache-first (prefixed on install)
- **Images**: Separate cache bucket

**Cache Versions**:
- `yt-viewer-static-v21`
- `yt-viewer-api-v21`
- `yt-viewer-images-v21`

**Update Strategy**:
- `skipWaiting()` for immediate activation
- Old cache cleanup on activate

### 8.4 Error Handling

**Custom Error Classes**:
- `NocoDBRequestError`: Axios errors with status/data
- `NocoDBValidationError`: Zod validation errors

**Logging**:
- `logDevEvent()` for server-side logging
- Client-side logger in `src/shared/utils/logger.ts`

---

## 9. Styling & Theming

### Dark Theme
- Default enabled (`<html class="dark">`)
- Material Design-inspired
- CSS variables for colors
- Background: `~#121212`
- Surface: `~#1E1E1E`

### Typography
- **IBM Plex Sans**: Body text
- **IBM Plex Mono**: Headings, code
- **IBM Plex Serif**: Long-form content

### Component Styling
- Tailwind utility classes
- CVA (class-variance-authority) for variants
- `cn()` utility for class merging
- Consistent spacing, colors, shadows

---

## 10. Code Conventions

### Naming Conventions
- **Files**: 
  - Components: PascalCase (`VideoCard.tsx`)
  - Utilities: kebab-case (`video-utils.ts`)
  - Tests: `*.test.ts` or `*.test.tsx`
- **Directories**: kebab-case (`video-service.ts`)
- **Variables/Functions**: camelCase (`fetchVideos`)
- **Types/Interfaces**: PascalCase (`VideoListItem`)

### Import Patterns
- Absolute imports with `@/` alias
- Grouped imports:
  1. React/Next.js
  2. Third-party libraries
  3. Internal imports
  4. Type imports (if separate)

### Component Patterns
**Server Component** (default):
```typescript
export default async function VideoPage({ params }) {
  const video = await fetchVideoByVideoId(params.videoId);
  return <VideoDetailPageContent video={video} />;
}
```

**Client Component**:
```typescript
'use client';

import { useState } from 'react';

export function InteractiveComponent() {
  const [state, setState] = useState();
  // ...
}
```

---

## 11. Development Workflow

### Initial Setup
```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with NocoDB credentials

# 3. Start NocoDB (Docker)
docker run -d --name nocodb -p 8080:8080 nocodb/nocodb:latest

# 4. Start development server
pnpm dev
# → http://localhost:3030
```

### Common Development Tasks

**Add a new video field**:
1. Update `videoSchema` in `src/features/videos/api/schemas.ts`
2. Add field to `fields` array in `src/app/api/videos/route.ts`
3. Update `VideoOfflineCacheItem` if needed for offline
4. Add UI rendering in video detail page

**Create a new component**:
```bash
# Use shadcn/ui CLI for primitives
npx shadcn-ui@latest add [component-name]

# Or create manually in appropriate feature directory
```

**Run tests while developing**:
```bash
pnpm test:watch
```

**Build for production**:
```bash
pnpm build
pnpm start
```

---

## 12. Deployment Considerations

### Environment Variables (Production)
```bash
NC_URL=https://your-nocodb-instance.com
NC_TOKEN=production-token
NOCODB_PROJECT_ID=...
NOCODB_TABLE_ID=...
APP_PASSWORD=strong-unique-password
```

### Vercel Deployment
```bash
vercel deploy --prod
```

### Service Worker Deployment
- Users may need hard-refresh (Cmd+Shift+R)
- Cache versioning in `sw.js`
- `skipWaiting()` for immediate updates

---

## 13. Known Issues & Troubleshooting

### Common Issues

**"indexedDB is not defined"**:
- Cause: Server-side code accessing IndexedDB
- Solution: Only client-side code can use IndexedDB

**Sync returns 0 videos**:
- Cause: Stale empty cache
- Solution: Call `clearAllCache()` before fetch

**NocoDB field not found errors**:
- Cause: Field doesn't exist in table
- Solution: Remove from `fields` array or create in NocoDB

**Slow Cloudflare Tunnel**:
- Solution: `maxDuration = 120` in API route, 2min client timeout

### Debugging Commands

```bash
# Check NocoDB connectivity
curl "http://localhost:8080/api/v2/tables/YOUR_TABLE_ID/records?limit=1" \
  -H "xc-token: YOUR_TOKEN"

# View IndexedDB in DevTools
# Application → Storage → IndexedDB → yt-viewer-offline

# Clear IndexedDB
indexedDB.deleteDatabase('yt-viewer-offline')

# Clear Next.js cache
rm -rf .next
pnpm store prune
```

---

## 14. Security Features

### Authentication
- Cookie-based auth (`yt-viewer-auth`)
- Middleware protection
- Password configurable via `APP_PASSWORD`

### Honeypot Logging
- Logs suspicious requests
- Stored in IndexedDB
- Hook: `use-honeypot-logs.ts`

### Static Asset Blocking
- Middleware blocks `/_next/server/` requests
- Prevents ENOENT log spam

---

## 15. Performance Optimizations

### Data Fetching
- Field selection (minimize payload)
- Pagination (default: 35 items)
- In-memory caching (5min TTL)
- Server Components (streaming SSR)

### Offline Performance
- IndexedDB (async, non-blocking)
- Prefetch-ahead for TTS
- Service Worker caching
- Max 200 videos (35MB target)

### Build Performance
- Turbopack (fast dev builds)
- Incremental TypeScript compilation
- ESLint cache

---

## 16. Future Enhancements (Documented)

- E2E tests with Playwright for update/delete flows
- Storybook for UI primitives
- Expanded caching strategies (stale-while-revalidate)
- TTS voice selection UI
- Enhanced offline search (full-text indexing)

---

## 17. Quick Reference for Claude Code Instances

### Essential Files to Understand First
1. `src/features/videos/api/schemas.ts` - Data structure
2. `src/features/videos/api/nocodb.ts` - API client exports
3. `src/features/videos/api/video-service.ts` - Core fetch logic
4. `src/app/api/videos/route.ts` - API route pattern
5. `src/features/offline/hooks/use-offline-mode.ts` - Offline sync
6. `src/middleware.ts` - Auth & routing

### Key Patterns to Follow
- **Data Fetching**: Use `fetchVideos()` with `videoListItemSchema`
- **Mutations**: Use `updateVideo()` / `deleteVideo()`
- **Validation**: Always use Zod schemas
- **Error Handling**: Wrap in try/catch, log with `logDevEvent()`
- **Caching**: Be aware of stale cache issue

### Commands to Run
```bash
pnpm dev          # Start dev server
pnpm test         # Run tests
pnpm lint         # Lint code
pnpm build        # Production build
```

### Environment Setup
1. Copy `.env.example` to `.env.local`
2. Set NocoDB credentials
3. Run `pnpm install`
4. Run `pnpm dev`

### Testing New Features
1. Write unit test in `*.test.ts`
2. Write component test in `*.test.tsx`
3. Run `pnpm test:watch`
4. Update AGENTS.md if architecture changes

---

## Summary

This is a **well-architected Next.js 15 application** with:
- Modern tech stack (React 19, TypeScript, Tailwind v4)
- Strong separation of concerns (features, shared, app)
- Comprehensive offline/PWA support
- Robust data layer (NocoDB + Zod validation)
- Good test coverage (Vitest + RTL)
- Detailed documentation (AGENTS.md, architecture.md)

**Key architectural insight**: The client-server split for offline functionality is critical—IndexedDB is browser-only, so API routes cannot access it directly.

**Best practices to follow**:
1. Use feature-based organization
2. Validate all data with Zod
3. Use Server Components by default
4. Clear cache before critical fetches
5. Follow the existing patterns in nocodb.ts
