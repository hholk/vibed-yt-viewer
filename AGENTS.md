# YouTube Video Viewer - Agent Guidelines

> Umfassende Dokumentation für KI-Agents und Entwickler. Zuletzt aktualisiert: 2025-12-27

## 📋 Inhaltsverzeichnis

1. [Projekt-Übersicht](#projekt-übersicht)
2. [Architektur](#architektur)
3. [Offline/PWA Feature](#offlinepwa-feature)
4. [NocoDB Integration](#nocodb-integration)
5. [Development Workflow](#development-workflow)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Projekt-Übersicht

**YouTube Video Viewer** ist eine Next.js 15 Web-App zur Verwaltung und Analyse von YouTube-Videos mit:
- Video-Metadaten Management (Ratings, Notizen, Tags)
- Offline-PWA-Funktionalität (neueste 200 Videos cached)
- Text-to-Speech Integration (CosyVoice 3)
- NocoDB v2 Backend
- Mobile-optimierte UI mit Tailwind CSS

### Tech Stack
- **Framework**: Next.js 15 (App Router, React Server Components, Turbopack)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS + IBM Plex Fonts
- **Database**: NocoDB v2 (REST API)
- **Package Manager**: pnpm
- **Testing**: Vitest + React Testing Library
- **Offline Storage**: IndexedDB (via idb library)

### Key Features
1. Video List mit Pagination, Suche, Filtern
2. Detail-Ansicht mit Transkripten, Notizen, Ratings
3. Offline-Modus (200 Videos ohne Transkripte, max 40 MB)
4. Text-to-Speech für Transkripte
5. Export-Funktionalität
6. Cloudflare Tunnel Support für remote NocoDB

---

## Architektur

### Verzeichnisstruktur

```
yt-viewer/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API Routes
│   │   │   ├── auth/                 # Simple Cookie-Auth
│   │   │   ├── offline/sync/         # Offline Sync Endpoint
│   │   │   ├── videos/               # Video CRUD
│   │   │   └── tts/                  # TTS Proxy
│   │   ├── video/[videoId]/          # Video Detail Page
│   │   ├── settings/                 # Offline Settings
│   │   └── login/                    # Login Page
│   │
│   ├── features/
│   │   ├── videos/                   # Video Domain
│   │   │   ├── api/                  # NocoDB Client
│   │   │   │   ├── nocodb.ts         # Main export
│   │   │   │   ├── video-service.ts  # Fetch logic
│   │   │   │   ├── mutations.ts      # Update/Delete
│   │   │   │   ├── cache.ts          # In-Memory Cache
│   │   │   │   ├── config.ts         # NocoDB Config
│   │   │   │   └── schemas.ts        # Zod Schemas
│   │   │   └── components/           # Video UI
│   │   │
│   │   └── offline/                  # Offline/PWA Feature
│   │       ├── db/                   # IndexedDB
│   │       │   ├── schema.ts         # DB Schema
│   │       │   └── client.ts         # CRUD Ops
│   │       ├── hooks/                # React Hooks
│   │       │   ├── use-offline-mode.ts
│   │       │   └── use-offline-stats.ts
│   │       ├── cache-manager.ts      # Server-side (unused)
│   │       ├── sync-manager.ts       # Server-side (unused)
│   │       ├── offline-search.ts     # Client-side Search
│   │       └── schemas.ts            # VideoOffline Schema
│   │
│   ├── shared/
│   │   ├── components/               # Reusable UI
│   │   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── offline-indicator.tsx
│   │   │   └── search-component.tsx
│   │   ├── hooks/
│   │   │   └── use-text-to-speech.ts
│   │   └── utils/
│   │
│   └── types/                        # Global Types
│
├── public/
│   ├── sw.js                         # Service Worker
│   ├── manifest.json                 # PWA Manifest
│   └── idb.min.js                    # IndexedDB for SW
│
├── scripts/
│   └── load-env.cjs                  # ENV Loader for Scripts
│
└── .env.local                        # Environment Variables
```

### Datenfluss

#### Online-Modus (Standard)
```
Browser → Next.js API Route → NocoDB v2 REST API
   ↓
Cache (5min TTL)
   ↓
React Components
```

#### Offline-Modus (PWA)
```
1. Sync:
   Browser → /api/offline/sync → NocoDB → 200 Videos
                                            ↓
                                      IndexedDB

2. Offline Read:
   Browser → IndexedDB → React Components

3. Offline Write:
   Browser → IndexedDB (pendingMutations) → Later: /api/offline/sync → NocoDB
```

---

## Offline/PWA Feature

### Übersicht
Das Offline-Feature ermöglicht das Cachen der neuesten 200 Videos (ohne Transkripte) in IndexedDB für Offline-Zugriff. Implementiert als Progressive Web App (PWA) mit Service Worker.

### Architektur-Entscheidungen

#### Client-Server Split
**WICHTIG**: Die Sync-Logik ist aufgeteilt:

1. **Server-seitig** (`/api/offline/sync`):
   - Fetcht Videos von NocoDB
   - Filtert Felder (keine Transkripte)
   - Führt Mutations aus
   - **Kein** IndexedDB-Zugriff (nur Browser!)

2. **Client-seitig** (`use-offline-mode.ts`):
   - Speichert Videos in IndexedDB
   - Verwaltet Mutations-Queue
   - Handhabt Sync-Workflow

#### Warum diese Aufteilung?
- IndexedDB ist **nur im Browser** verfügbar
- Next.js API Routes laufen **server-side** (Node.js)
- Versuch, IndexedDB server-side zu nutzen → `ReferenceError: indexedDB is not defined`

### Key Files

#### 1. IndexedDB Schema
**Location**: `src/features/offline/db/schema.ts`

```typescript
interface OfflineDBSchema {
  videos: {
    key: number;           // Video.Id
    value: VideoOffline;   // Video ohne Transkripte
    indexes: {
      'by-videoId': string;
      'by-publishedAt': Date;
    };
  };
  pendingMutations: {
    key: string;           // UUID
    value: PendingMutation;
    indexes: {
      'by-timestamp': number;
    };
  };
  metadata: {
    key: string;           // 'offlineModeEnabled', 'lastSync'
    value: unknown;
  };
}

const STORAGE_LIMITS = {
  MAX_SIZE_MB: 40,
  TARGET_SIZE_MB: 35,
  MAX_VIDEOS: 200,
};
```

#### 2. Sync API Endpoint
**Location**: `src/app/api/offline/sync/route.ts`

```typescript
export async function POST(request: Request) {
  const { action, mutations } = await request.json();

  if (action === 'cache') {
    // CRITICAL: Clear cache before fetching!
    clearAllCache(); // Verhindert stale empty results

    // Use EXACT params as /api/videos
    const result = await fetchVideos({
      sort: '-CreatedAt',  // NOT -PublishedAt!
      limit: 200,
      page: 1,
      fields: [...],       // Specific fields list
      schema: videoListItemSchema,
    });

    return { videos, timestamp, totalAvailable };
  }

  if (action === 'mutations') {
    // Execute pending mutations on NocoDB
    for (const mutation of mutations) {
      if (mutation.type === 'UPDATE') {
        await updateVideo(mutation.videoId, mutation.data);
      }
    }
    return { synced, errors };
  }
}
```

**WICHTIGE Lessons Learned**:
1. **Cache-Clear**: Immer `clearAllCache()` vor Fetch aufrufen, sonst werden alte leere Results gecacht
2. **Richtiges Schema**: `videoListItemSchema` verwenden, nicht `videoOfflineSchema`
3. **Sort Parameter**: `-CreatedAt` funktioniert, `-PublishedAt` führte zu 0 Results
4. **Fields List**: Explizite Liste statt `getOfflineFields()` (manche Felder existieren nicht in NocoDB)

#### 3. Client-Side Sync
**Location**: `src/features/offline/hooks/use-offline-mode.ts`

```typescript
async function syncCache() {
  // 1. Fetch from API
  const response = await fetch('/api/offline/sync', {
    method: 'POST',
    body: JSON.stringify({ action: 'cache' }),
    signal: controller.signal, // 2min timeout
  });

  const { videos, timestamp } = await response.json();

  // 2. Store in IndexedDB
  await clearAllVideos();
  await putVideos(videos);

  // 3. Update metadata
  await setMetadata('lastSync', timestamp);
  await setMetadata('totalCacheSize', cacheSize);
}

async function syncMutations() {
  const mutations = await getAllPendingMutations();

  // Send to server
  const response = await fetch('/api/offline/sync', {
    method: 'POST',
    body: JSON.stringify({ action: 'mutations', mutations }),
  });

  // Remove synced mutations
  for (const mutation of mutations) {
    if (!failed) await deletePendingMutation(mutation.id);
  }
}
```

#### 4. Service Worker
**Location**: `public/sw.js`

```javascript
// Network-First Strategy for API
async function handleAPIRequest(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Fallback: Return offline message
    return new Response(JSON.stringify({
      success: false,
      error: 'Offline - use settings to enable offline mode'
    }));
  }
}

// Cache-First for Static Assets
async function handleStaticRequest(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
}
```

### Settings UI
**Location**: `src/app/settings/SettingsPageClient.tsx`

Features:
- Offline Mode Toggle
- Sync Now Button (mit detailliertem Feedback)
- Cache Statistics (Videos cached, Size, Last Sync)
- Clear Cache Button
- Connection Status Indicator

### Auth Middleware Bypass
**Location**: `src/middleware.ts`

```typescript
export function middleware(request: NextRequest) {
  // Allow offline sync without auth (for Service Worker)
  if (request.nextUrl.pathname.startsWith('/api/offline')) {
    return NextResponse.next();
  }
  // ... rest of auth logic
}
```

### Offline Search
**Location**: `src/features/offline/offline-search.ts`

```typescript
export async function searchOfflineVideos(options: SearchOptions) {
  const videos = await getAllVideos();

  // Filter by search terms
  const filtered = videos.filter(video => {
    return searchTerms.every(term => matchesInCategories(video, term, categories));
  });

  // Sort by relevance
  filtered.sort((a, b) => calculateRelevanceScore(b, searchTerms) - calculateRelevanceScore(a, searchTerms));

  return { videos: filtered.slice(offset, offset + limit), total: filtered.length };
}
```

### Troubleshooting Common Issues

#### Issue: "indexedDB is not defined"
**Ursache**: Server-side Code versucht auf IndexedDB zuzugreifen
**Lösung**: Nur client-side Code darf IndexedDB nutzen. API Routes nur Daten zurückgeben, Client speichert.

#### Issue: Sync gibt 0 Videos zurück
**Ursachen**:
1. Cache enthält stale empty results → `clearAllCache()` aufrufen
2. Falsches Schema (z.B. `videoOfflineSchema` statt `videoListItemSchema`)
3. Falscher sort parameter
4. Fields die in NocoDB nicht existieren

**Lösung**: Exakt gleiche Parameter wie `/api/videos` verwenden (die funktioniert!)

#### Issue: Slow Cloudflare Tunnel
**Lösung**:
- `maxDuration = 120` in API route
- Client-side timeout: 2 Minuten
- Nur 200 Videos statt alle laden

---

## NocoDB Integration

### Configuration
**Location**: `.env.local`

```bash
NC_URL=http://localhost:8080
NC_TOKEN=your-api-token-here
NOCODB_PROJECT_ID=phk8vxq6f1ev08h
NOCODB_TABLE_ID=m1lyoeqptp7fq5z
NOCODB_TABLE_NAME=youtubeTranscripts
```

### API Client
**Location**: `src/features/videos/api/nocodb.ts`

Re-exports from:
- `video-service.ts` - Fetch operations
- `mutations.ts` - Update/Delete operations
- `schemas.ts` - Zod validation
- `config.ts` - Environment config

### Important Functions

#### fetchVideos (paginated)
```typescript
const { videos, pageInfo } = await fetchVideos({
  sort: '-CreatedAt',
  limit: 35,
  page: 1,
  fields: ['Id', 'Title', ...],
  schema: videoListItemSchema,
});
```

#### fetchAllVideos (all pages)
```typescript
const allVideos = await fetchAllVideos({
  sort: '-PublishedAt',
  schema: videoSchema,
});
```

#### updateVideo
```typescript
await updateVideo(videoId, {
  ImportanceRating: 5,
  PersonalComment: 'Great content!',
  Watched: true,
});
```

### Caching Strategy
**Location**: `src/features/videos/api/cache.ts`

```typescript
const globalCache = new Map<string, CacheEntry>();
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// WICHTIG: Cache kann stale empty results enthalten!
// Lösung: clearAllCache() vor wichtigen Fetches
```

### Field Handling
Manche Felder existieren nicht in NocoDB. Bei 404 mit "FIELD_NOT_FOUND":
1. NocoDB entfernt missing fields automatisch
2. Retry ohne die fehlenden fields
3. Falls alle fields fehlen → empty result

**Best Practice**: Explizite field liste statt "*" verwenden.

---

## Development Workflow

### Initial Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your NocoDB credentials

# 3. Start dev server
pnpm dev
# → http://localhost:3030

# 4. (Optional) Start TTS server
./tts-app.sh start-tts
# → http://127.0.0.1:50000
```

### Common Commands

```bash
# Development
pnpm dev              # Next.js dev server (port 3030)
pnpm build            # Production build
pnpm start            # Production server
pnpm lint             # ESLint
pnpm lint --fix       # Auto-fix linting issues

# Testing
pnpm test             # Run all tests
pnpm test:watch       # Watch mode
pnpm test:ui          # Vitest UI
pnpm coverage         # Coverage report

# Utilities
pnpm ensure:video <id> [rating] [comment]  # Test NocoDB pipeline
./tts-app.sh start    # Start TTS + Next.js
./tts-app.sh logs tts # View TTS logs
```

### Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes (except JSX attributes)
- **Components**: PascalCase filenames (`VideoCard.tsx`)
- **Utilities**: kebab-case (`video-utils.ts`)
- **Imports**: Absolute paths mit `@/` alias
- **Types**: Explicit exports, prefer `type` over `interface` for data shapes

### Component Patterns

#### Server Components (Default)
```typescript
// src/app/video/[videoId]/page.tsx
export default async function VideoPage({ params }) {
  const video = await fetchVideoByVideoId(params.videoId);
  return <VideoDetailPageContent video={video} />;
}
```

#### Client Components (when needed)
```typescript
'use client';

import { useState } from 'react';

export function InteractiveComponent() {
  const [state, setState] = useState();
  // ...
}
```

**Use Client Components for**:
- useState, useEffect, event handlers
- Browser APIs (localStorage, IndexedDB)
- Interactive UI (modals, dropdowns)

**Keep Server Components for**:
- Data fetching
- Static rendering
- SEO-optimized pages

---

## Testing

### Test Structure

```
src/features/videos/
├── api/
│   ├── video-service.ts
│   └── video-service.test.ts      # Unit tests
└── components/
    ├── video-card.tsx
    └── video-card.test.tsx         # Component tests
```

### Unit Tests (Vitest)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { fetchVideos } from './video-service';

describe('fetchVideos', () => {
  it('should fetch videos from NocoDB', async () => {
    const result = await fetchVideos({ limit: 10 });
    expect(result.videos).toHaveLength(10);
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));
    await expect(fetchVideos({})).rejects.toThrow();
  });
});
```

### Component Tests (React Testing Library)

```typescript
import { render, screen } from '@testing-library/react';
import { VideoCard } from './video-card';

it('renders video title', () => {
  render(<VideoCard video={mockVideo} />);
  expect(screen.getByText('Test Video')).toBeInTheDocument();
});
```

### E2E Testing Checklist

- [ ] Video List loads and displays correctly
- [ ] Video Detail page shows all data
- [ ] Search functionality works
- [ ] Ratings can be updated
- [ ] Offline mode toggle works
- [ ] Sync caches videos
- [ ] TTS playback functions

---

## Deployment

### Environment Variables (Production)

```bash
# NocoDB
NC_URL=https://your-nocodb-instance.com
NC_TOKEN=production-token
NOCODB_PROJECT_ID=...
NOCODB_TABLE_ID=...

# Auth (Simple Cookie)
# Set in middleware: yt-viewer-auth=authenticated

# TTS (Optional)
TTS_API_URL=http://127.0.0.1:50000  # If running locally
```

### Build & Deploy

```bash
# 1. Build production bundle
pnpm build

# 2. Test production build locally
pnpm start

# 3. Deploy (example: Vercel)
vercel deploy --prod

# 4. Verify deployment
curl https://your-app.vercel.app/api/videos?limit=1
```

### Service Worker Deployment

**WICHTIG**: Service Worker cached statische Assets. Nach Deployment:

1. Users müssen ggf. Hard-Reload machen (Cmd+Shift+R)
2. SW update strategy: `skipWaiting` in `sw.js`
3. Cache-Namen versionieren (`yt-viewer-static-v2`)

---

## Troubleshooting

### NocoDB Connection Issues

```bash
# 1. Test NocoDB connectivity
curl "http://localhost:8080/api/v2/tables/YOUR_TABLE_ID/records?limit=1" \
  -H "xc-token: YOUR_TOKEN"

# 2. Check environment variables
node scripts/load-env.cjs

# 3. Check logs
tail -f /tmp/nextjs-app.log
```

### IndexedDB Issues

```javascript
// Open DevTools → Application → Storage → IndexedDB
// Check:
// - yt-viewer-offline database exists
// - videos store has data
// - metadata.offlineModeEnabled = true

// Clear IndexedDB
indexedDB.deleteDatabase('yt-viewer-offline');
```

### Build Failures

```bash
# Clear caches
rm -rf .next
pnpm store prune

# Check TypeScript
pnpm tsc --noEmit

# Check linting
pnpm lint --max-warnings=0

# Rebuild
pnpm build
```

### Service Worker Not Updating

```bash
# 1. Unregister old SW
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});

# 2. Hard reload (Cmd+Shift+R)

# 3. Check SW version
curl http://localhost:3030/sw.js | grep "CACHE_VERSION"
```

---

## Architecture Decisions

### Why Next.js 15 App Router?
- Server Components für SEO
- Streaming SSR
- Built-in API Routes
- Turbopack für schnellere Builds

### Why IndexedDB instead of LocalStorage?
- 40 MB+ Storage (LocalStorage: ~5-10 MB)
- Structured data mit Indexes
- Async API (non-blocking)
- Service Worker Kompatibilität

### Why Client-Server Split for Offline?
- IndexedDB nur im Browser
- API Routes laufen server-side (Node.js)
- Klare Trennung: Server fetcht, Client speichert

### Why In-Memory Cache (5min TTL)?
- Reduziert NocoDB Requests
- Schnellere Page Loads
- Trade-off: Stale data möglich (→ clearAllCache bei kritischen Ops)

### Why videoListItemSchema for Offline?
- Enthält alle benötigten Felder
- Wird bereits von `/api/videos` verwendet (bewährt)
- `videoOfflineSchema` hatte Schema-Validierung Probleme

---

## Key Code Locations

### Critical Files (Do Not Break!)

1. **`src/features/videos/api/video-service.ts`**
   - Core NocoDB fetch logic
   - Used by ALL video operations
   - Caching, retry logic, error handling

2. **`src/app/api/offline/sync/route.ts`**
   - Offline sync endpoint
   - Must use same params as `/api/videos`
   - CRITICAL: `clearAllCache()` before fetch

3. **`src/features/offline/hooks/use-offline-mode.ts`**
   - Client-side sync orchestration
   - IndexedDB operations
   - Mutations queue management

4. **`public/sw.js`**
   - Service Worker
   - Caching strategies
   - Offline fallbacks

5. **`src/middleware.ts`**
   - Auth logic
   - `/api/offline` bypass
   - Cookie validation

### Feature Ownership

| Feature | Location | Owner |
|---------|----------|-------|
| Video List | `src/app/page.tsx` | Core |
| Video Detail | `src/app/video/[videoId]/` | Core |
| Offline Sync | `src/features/offline/` | PWA |
| NocoDB Client | `src/features/videos/api/` | Backend |
| TTS | `src/shared/hooks/use-text-to-speech.ts` | Audio |
| Search | `src/shared/components/search-component.tsx` | Search |

---

## Commit Guidelines

### Conventional Commits

```bash
feat(offline): add sync now button to settings
fix(nocodb): clear cache before offline sync
docs(agents): update offline architecture section
chore(deps): upgrade next to 15.3.2
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `chore`: Maintenance
- `refactor`: Code restructure
- `test`: Test updates
- `perf`: Performance improvement

### PR Checklist

- [ ] Tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Screenshots for UI changes
- [ ] Updated AGENTS.md if architecture changed
- [ ] Tested manually in dev mode

---

## Contact & Support

- **Repository**: [GitHub Link]
- **Documentation**: This file (AGENTS.md)
- **Architecture Diagrams**: `architecture.md`
- **TTS Setup**: `TTS_README.md`

**For Agents**: When unsure, read existing code patterns. Follow the principle: *"Make it work like `/api/videos` - that one is proven to work!"*

---

## Changelog

### 2025-12-27
- Implemented complete Offline/PWA feature
- Fixed NocoDB sync issues (cache clearing, correct schema)
- Added IndexedDB-based offline storage
- Documented client-server split architecture
- Created comprehensive troubleshooting guide

### Previous
- Initial app structure
- NocoDB v2 integration
- TTS integration with CosyVoice 3
- Video CRUD operations
- Search functionality
