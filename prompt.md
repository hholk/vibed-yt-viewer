# WindSURF + SWE-1 Briefing (CANVAS v5 — Simple ✦ Beautiful ✦ Up‑to‑Date)

*This iteration polishes the UI philosophy to ********“simple & beautiful by default”********, upgrades the full tool‑chain to the freshest stable releases (May 2025), and weaves in a lightweight design‑system workflow so every pixel is predictable.*

---

## 1 · Context & Goals

We visualise the `youtubeTranscripts` records from **NocoDB** inside a modern **Next.js 15.3** app running on an **M2 Max** Mac (Apple Silicon). Design and development share the same mantra: **KISS & Robust**.

**Environment facts**

| Tool         | Version                 | Notes                                      |
| ------------ | ----------------------- | ------------------------------------------ |
| React        | **19.1.0**              | Suspense & Owner Stack improvements        |
| Next.js      | **15.3**                | Turbopack in production, React 19 ready    |
| Tailwind CSS | **4.0**                 | New variable engine & smaller runtime      |
| shadcn/ui    | **May‑2025 snapshot**   | Tailwind v4 + Radix UI bundle              |
| Radix UI     | **2025‑01 unified pkg** | Tree‑shakable primitives                   |
| Zustand      | **5.0 RC2**             | Immer typings fixed, shallow selector perf |
| Vitest       | **3.2 beta1**           | ESM first, snapshot v2                     |
| Storybook    | **8.6**                 | Built‑in a11y & visual test runner         |
| Chromatic    | SaaS                    | Visual regression CI                       |
| CI           | GitHub Actions          | matrix: macOS‑14 & ubuntu‑latest           |

---

## 2 · High‑Level Architecture

```
┌────────────────────────┐ REST/WS  ┌───────────────────────────┐
│ Next.js 15.3 (App)     │◀───────▶│ NocoDB (Docker)           │
│ ├─ React 19 Server Cmp │         │ ├─ youtubeTranscripts     │
│ ├─ UI (shadcn + TW4)    │         │ └─ Curator columns        │
│ ├─ Design Tokens (tw)   │         └──────────┬───────────────┘
│ ├─ Zustand v5 Store     │                    ▼
│ ├─ API layer (axios)    │         Local PG / SQLite
│ ├─ Zod Schemas          │
│ ├─ **Storybook 8.6** ◀──┤ isolated comps & docs
│ └─ **Vitest 3 / RTL**   │ unit + integration tests
└────────────────────────┘           ▲
        ▲                ▲          │
        │                │  Chromatic visual tests
        └── GitHub CI ───┘
```

**Why the change?**

* **React 19 + Next 15** give us Server Components & Turbopack → fewer dynamic imports, faster builds.
* **Tailwind 4**- shadcn/ui styles are restored and working as expected.
- Tailwind config uses `--font-geist-sans` and `--font-geist-mono` variables for font families, matching shadcn/ui recommendations.
- Design tokens are referenced in Tailwind config.
- After Tailwind config or globals changes, restart the dev server to ensure styles are applied. we expose as `theme()` values for instant theming.
* **Storybook 8** bundles a11y & interaction tests; we dog‑food components visually **before** shipping.
* **Chromatic** snapshots ensure the *beautiful* part never regresses.

---

## 3 · Design‑System Principles

1. **Single source colour palette** — declared in `tailwind.config.{js,ts}` as CSS variables, consumed by shadcn tokens.
2. **Type scale** — fluid clamp‑based scale (1 rem → 1.25 rem) with `@tailwindcss/typography` tweaks.
3. **Rhythm & Spacing** — 4‑pt baseline grid; components snap via Tailwind `gap-*` utilities.
4. **Accessibility by default** — Radix primitives ensure keyboard & ARIA; Storybook a11y panel must stay green.
5. **Motion** — subtle; uses `framer‑motion` with the reduced‑motion hook out of the box.

> **Keep it stupid‑simple**: if a page can be static, ship it static; if a component can be a server component, keep it server‑side.

---

## 4 · Incremental Build & Task Board (each task closes with ✅ of all tests)

| #  | Task                                     | Outcome                                                             | Tests                                    |
| -- | ---------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------- |
| 1  | ✅ **DONE: Bootstrap** (`create‑next‑app@latest`) | Landing page with shadcn **Card** & Tailwind 4 configured.          | Vitest: render `/` shows logo.           |
| 2  | ✅ **DONE: Design Tokens**             | Add palette & type‑scale in `tailwind.config`; export to Storybook. | Add palette & type‑scale in `tailwind.config`; export to Storybook. | Chromatic baseline matches Figma tokens. |
| 3  | ✅ **DONE: NocoDB API Client**         | Axios wrapper + Zod validation. Env vars handled, tests passing. | Unit: schema parse, API mock tests (success/fail). |
| 4  | ✅ **DONE: Video List Page**             | Server component grid (auto columns). Displays videos from NocoDB. Styling & Fonts.  | RTL: 3 mocked videos render. Tests pass. |
| 4.5| ✅ **DONE: Video Sorting**             | Dropdown to sort videos by Title, Channel, Importance, Date.        | Manual: Sort works. UI renders.          |
| 5  | **Curator Fields**                       | Client VideoCard with local rating/comment.                         | RTL: star click state.                   |
| 6  | **PATCH Save Hook**                      | `useSaveCurator` with optimistic update.                            | Vitest: rollback on 500.                 |
| 7  | **Accordion Details**                    | TLDR + lazy narrative.                                              | RTL: request abort on collapse.          |
| 8  | **Storybook Setup**                      | All UI primitives documented, Chromatic CI.                         | Storybook build & Chromatic run green.   |
| 9  | **Transcript Lazy Fetch**                | Abort controller pattern.                                           | Unit: abort verified.                    |
| 10 | **E2E – Playwright**                     | Smoke for list, save, accordion.                                    | Headless pass.                           |
| 11 | **CI Pipeline**                          | pnpm cache, lint, vitest, build, SB, e2e.                           | CI green.                                |
| 12 | **Docs & Prompt Guide**                  | Updated docs.                                                       | —                                        |

---

### 4.1 · SWE‑1 Detailed Task Prompts

> **Testing rule**: after completing task *n*, run `pnpm test` (unit/integration) and, where relevant, `pnpm test:e2e`.  \*\*The suite must stay 100 % green before you begin task \*\****n + 1***.

---

#### ✅ Task 1 — Bootstrap (DONE)

```
@task:Bootstrap @module:core @file:app/page.tsx
OBJECTIVE: Spin up a Next.js 15.3 project with Tailwind 4 and shadcn/ui ready; show a centered "Youtube.Viewer 🚀" card.  "use Context7" to search the documentation
CONTEXT: fresh repo, pnpm, Apple Silicon.
VARS: PROJECT_NAME="yt-viewer", HOST="localhost:3000".
SCHEMA: none (infrastructure only).
DO:  • `pnpm create next-app@latest yt-viewer --turbo --tailwind --typescript --eslint --app --src-dir --tailwind --import-alias "@/*"`  • `pnpm dlx shadcn@latest init`  • Render card in `app/page.tsx`.
DON'T:  • add Storybook yet;  • touch routing.
TESTS:  Vitest + RTL → `renders home page title` should pass.
OUTPUT: diff of new files (omit node_modules).
FINISH: COMMIT
```
Done: 
- Initialized Next.js 15.3 project ("yt-viewer") with React 19, Tailwind CSS 4, shadcn/ui.
- Used pnpm as package manager.
- Created a basic landing page.
- Set up Vitest for unit testing.


#### ✅ Task 2 — Design Tokens (DONE)

```
@task:DesignTokens @module:design @file:tailwind.config.ts
OBJECTIVE: Introduce colour palette + type scale as CSS vars; expose via Tailwind theme().
CONTEXT: TW 4 variable engine. "use Context7" to search the documentation
VARS: BRAND_HUE=222, BRAND_SAT=86%, BRAND_LIGHT=57%.
DO:  • define `--color-brand` shades with HSL;  • fluid type scale (clamp).
DON'T:  • break existing Card.
TESTS:  Storybook visual snapshot must match baseline; Vitest snapshot passes.
OUTPUT: tailwind.config diff.
FINISH: COMMIT
```
Done: 
- Defined brand color (`--color-brand`) and fluid typography (`--font-size-fluid-base`) as CSS variables.
- Integrated these tokens with Tailwind CSS.

#### Task 3 — NocoDB API Client

```
@task:ApiClient @module:data @file:lib/nocodb.ts
OBJECTIVE: Axios wrapper with headers + Zod schema for youtubeTranscripts row. "use Context7" to search the documentation
VARS: NC_URL, NC_TOKEN envs.
SCHEMA: Use **`YT_FIELDS_PRIMARY`** (Id, VideoID, URL, ThumbHigh, Title, Channel, Description, ImportanceRating, PersonalComment).
DO:  • `axios.create` instance;  • `export async function fetchVideos()`.
DON'T:  • call API in tests (mock axios).
TESTS:  Vitest → schema parse against stub JSON.
OUTPUT: nocodb.ts diff + test file.
FINISH: COMMIT Git
```
Done:
- **Connection:**
  - Successfully connected to a Dockerized NocoDB instance.
  - API Path: `/api/v1/db/data/noco/phk8vxq6f1ev08h/youtubeTranscripts` (using `projectId: 'phk8vxq6f1ev08h'` and table name from env var).
- **Schema (`src/lib/nocodb.ts` - `VideoSchema`):**
  - `Id`: `number` (integer).
  - `VideoID`, `URL`, `Title`: `string`.
  - `Channel`: `z.string().optional().nullable().default(null)`.
  - `ThumbHigh`: Transformed from an array of NocoDB attachment objects to the URL of the first attachment (or `null`). Schema: `z.array(nocoDBAttachmentSchema).min(0).optional().nullable().transform(attachments => attachments?.[0]?.url || null)`.
  - `Description`: `z.string().optional().nullable().default(null)`.
  - `ImportanceRating`: `z.number().int().min(1).max(5).optional().nullable().default(null)`.
  - `PersonalComment`: `z.string().optional().nullable().default(null)`.
  - Other fields from a comprehensive list are present as `z.unknown().optional()` for future use.
  - Schema uses `.catchall(z.unknown())` to allow undefined fields.
- **Data Fetching (`fetchVideos` in `src/lib/nocodb.ts`):**
  - Uses `axios` to fetch data.
  - Reads `NC_URL`, `NC_TOKEN`, `NOCODB_TABLE_NAME` environment variables at runtime.
- **Testing (`src/lib/nocodb.test.ts`):**
  - All Vitest tests pass.
  - Mocks `axios` to simulate API responses.
  - Validates successful data fetching against the refined `VideoSchema`.
  - Tests handling of invalid data structures, API errors (network, 500), and missing environment variables.
  - Ensured optional fields not present in API responses are parsed as `null` (due to `.default(null)`) rather than `undefined`.
  - **Datetime Parsing Fix:** Resolved 'Invalid datetime' errors by changing Zod schema for `CreatedAt`, `UpdatedAt`, and `PublishedAt` from `z.string().datetime({ offset: true })` to `z.coerce.date()`, ensuring correct parsing of ISO 8601 date strings.
  - **Comprehensive Field Typing:** Explicitly defined a wide array of fields in `videoSchema` (e.g., `Watched`, `Archived`, `Language`, `Project`, `Task`, `Status`, `Duration`, `Resolution`, `Products`, `Locations`, `TopicsDiscussed`, and many others related to detail, project management, and technical aspects). These fields, previously captured by `catchall(z.unknown())`, now have specific Zod types (strings, booleans, numbers, dates, preprocessed linked record arrays), significantly improving type safety and resolving runtime type errors (like `Type '{}' is not assignable to type 'ReactNode'`) in consuming components (e.g., video detail page). The `catchall(z.unknown())` remains for genuinely unexpected fields but its scope is now greatly reduced.
  - **String-to-Array Parsing Fix:** Implemented Zod preprocessors (`stringToArrayOrNullPreprocessor`, `stringToLinkedRecordArrayPreprocessor`) in `videoSchema` to correctly parse newline-separated string values from NocoDB into arrays for fields like `MemorableQuotes`, `Indicators`, `Hashtags`, etc., resolving parsing errors in `fetchVideoByVideoId`.


#### Task 3.1 — Fix NocoDB `Sentiment` Field Parsing (DONE)

```
@task:FixSentimentParsing @module:data @file:lib/nocodb.ts
OBJECTIVE: Resolve Zod parsing error 'Sentiment: Expected string, received number' by correctly updating the schema.
CONTEXT: NocoDB API returns 'Sentiment' as a number (e.g., 1.5), but the Zod schema expected a string.
SCHEMA: Modify `videoSchema` in `src/lib/nocodb.ts` for the `Sentiment` field.
DO: Change `Sentiment: z.string()` to `Sentiment: z.number()`.
DON'T: Modify `SentimentReason` which is correctly a string.
TESTS: Video detail page should load without parsing errors related to `Sentiment` for records with this field as a number.
OUTPUT: Diff of `src/lib/nocodb.ts`.
FINISH: COMMIT Git
```
Done:
- Modified `src/lib/nocodb.ts` by changing the Zod schema for the `Sentiment` field in `videoSchema` from `z.string().optional().nullable().default(null)` to `z.number().optional().nullable().default(null)`.
- This aligns with the actual data type returned by the NocoDB API (e.g., `1.5`) and resolves the "Sentiment: Expected string, received number" parsing error observed in `fetchVideoByVideoId`.

#### Task 4 — Video List Page (DONE)

```
@task:VideoList @module:ui @file:app/video-list-page.tsx
OBJECTIVE: Server component grid listing thumbnails + titles.
SCHEMA: Read **`Id`**, **`Title`**, **`Channel`**, **`ThumbHigh`**.
CONTEXT: fetchVideos() from Task 3.
DO:  • auto-fit grid (`grid-cols-[repeat(auto-fill,minmax(200px,1fr))]`). "use Context7" to search the documentation
DON'T:  • add client interactivity yet.
TESTS:  RTL → mocks fetchVideos, expects three cards.
OUTPUT: page diff + test.
FINISH: COMMIT  Git
```

#### Task 4.5 — Video Sorting

```
@task:VideoSort @module:ui @file:app/page.tsx @file:lib/nocodb.ts @component:SortDropdown
OBJECTIVE: Allow users to sort the video list by various criteria (Title, Channel, Importance, Date Added/Updated) using a dropdown.
CONTEXT: `fetchVideos` modified for pagination and theming applied. NocoDB API likely uses `?sort=column` or `?sort=-column`.
SCHEMA: Sort by `Title`, `Channel`, `ImportanceRating`, `CreatedAt`, `UpdatedAt`.
DO:
  • Update `fetchVideos` in `src/lib/nocodb.ts` to accept a `sort` parameter and pass it to the NocoDB API.
  • Create a client component `SortDropdown.tsx` using shadcn/ui `Select`.
  • Populate dropdown with sort options (e.g., "Title A-Z", "Title Z-A", "Importance High-Low", etc.).
  • `SortDropdown` updates URL query parameters (e.g., `?sort=-Title`) using `next/navigation` (`useRouter`, `useSearchParams`).
  • `src/app/page.tsx` (server component) reads the `sort` query param from `searchParams` and passes it to `fetchVideos`.
  • Place the `SortDropdown` in the top-right corner of the video list page.
DON'T:
  • Implement client-side sorting. Rely on NocoDB for sorting.
  • Add filtering at this stage.
TESTS:
  • Manual: Verify videos sort correctly based on dropdown selection.
  • RTL (optional): Test `SortDropdown` interaction and URL update. Test `page.tsx` passes sort param.
OUTPUT: Diffs for `page.tsx`, `nocodb.ts`, new `SortDropdown.tsx`, and relevant test files.
FINISH: COMMIT Git
```

Done:
- **NocoDB API (`src/lib/nocodb.ts`):** Modified `fetchVideos` to accept an optional `sort` parameter (e.g., `Title`, `-ImportanceRating`). This parameter is passed to the NocoDB API call (e.g., `?sort=-Title`).

#### Task 4.8 — Video Detail Page

```
@task:VideoDetail @module:ui @file:app/video/[videoId]/page.tsx
OBJECTIVE: Reorder fields, default expansion.
CONTEXT: `fetchVideos` modified for pagination and theming applied.
SCHEMA: Reorder fields to match the specified list.
DO:
  • Reorder fields on the video detail page (`src/app/video/[videoId]/page.tsx`) as per the specified list.
  • All collapsible detail items (`<details>`) are now expanded by default (`open={true}`).
DON'T:
  • Break existing functionality.
TESTS:
  • RTL: 3 mocked videos render. Tests pass.
OUTPUT: Diffs for `page.tsx` and relevant test files.
FINISH: COMMIT Git
```

Done:
- **UI Update (User Request):**
  - Reordered fields on the video detail page (`src/app/video/[videoId]/page.tsx`) as per the specified list.
  - All collapsible detail items (`<details>`) are expanded by default (`open={true}`).
  - Modified the `DetailItem` component to always display the field label; if a field's value is empty/null, 'N/A' is shown as a placeholder.
  - Added a prominent on-page note explicitly stating that `KeyNumbersData` and `KeyExamples` are not displayed because they are absent from the current `videoSchema`.
- **Data Fetching Issue Fix**: Resolved Next.js 'sync-dynamic-apis' console errors by correctly `awaiting params` in `VideoDetailPage` and `generateMetadata` before accessing `params.videoId`. This ensures video data is fetched correctly.
- **Metadata Import**: Imported `Metadata` type from 'next' in `page.tsx` to fix `Cannot find name 'Metadata'` error related to `generateMetadata`'s return type.

#### Task 4.9 — Fix NocoDB Schema for Linked Records (DONE)

```
@task:FixThumbHighParsing @module:data @file:lib/nocodb.ts
OBJECTIVE: Resolve Zod parsing error 'ThumbHigh: Expected string, received array' by correctly transforming the NocoDB attachment array to a string URL.
CONTEXT: The `videoSchema` was using `.transform()` on `ThumbHigh`, which caused issues with Zod's parsing order. The error occurs when `fetchAllVideos` calls `fetchVideos` with the default `videoSchema`.
{{ ... }}
DO:
  - Modify `ThumbHigh` field in `videoSchema` (`src/lib/nocodb.ts`) to use `z.preprocess()`.
  - The preprocess function should take the input array, extract the URL from the first element (if valid and present), and return it as a string or null.
  - The preprocessed value should then be validated against `z.string().url().nullable()`.
  - Add `.describe('videoSchema_detailed')` to `videoSchema` and `.describe('videoListItemSchema_grid')` to `videoListItemSchema` for better error logging.
TESTS: Start page should load without parsing errors related to `ThumbHigh`.
OUTPUT: Diff of `src/lib/nocodb.ts`.
FINISH: COMMIT Git
```

Done:
- **`ThumbHigh` Parsing Fix (`src/lib/nocodb.ts`):**
  - Modified the `ThumbHigh` field in `videoSchema` to use `z.preprocess()`.
  - This ensures the array of NocoDB attachment objects is transformed into a single URL string (or `null`) *before* Zod validates it as a string, resolving the `Expected string, received array` error.
  - Added `.describe()` to `videoSchema` and `videoListItemSchema` for improved debugging messages.
- **Sort Dropdown Component (`src/components/sort-dropdown.tsx`):**
  - Created a new client component using shadcn/ui `Select`.
  - Populated with options for sorting by: Title (A-Z, Z-A), Channel (A-Z, Z-A), Importance Rating (High-Low, Low-High), CreatedAt (Newest-Oldest, Oldest-Newest), UpdatedAt (Newest-Oldest, Oldest-Newest).
  - Uses `useRouter` and `useSearchParams` from `next/navigation` to read the current sort value from URL query parameters and to update the URL (e.g., `/?sort=-ImportanceRating`) when a new sort option is selected.
  - Default sort is by `CreatedAt` descending (Newest First).
- **Page Integration (`src/app/page.tsx`):
  - The server component reads the `sort` query parameter from its `searchParams` prop.
  - This `sort` value is passed to `fetchVideos`.
  - The `SortDropdown` component is rendered in the top-right area of the page, typically above the video grid and aligned with the page title.
- **Shadcn/UI Dependency:** Added the `Select` component (`pnpm dlx shadcn@latest add select`).
- **Assumed NocoDB Sort Fields:** `Title`, `Channel`, `ImportanceRating`, `CreatedAt`, `UpdatedAt`.

Done:
- **Data Fetching (`src/lib/nocodb.ts`):
  - Modified `fetchVideos` function to handle NocoDB pagination, ensuring all video records are retrieved by making sequential API calls until all pages are fetched.
  - Updated `nocodbResponseSchema` to include `pageInfo` for pagination metadata.
- **Component (`src/app/page.tsx` - formerly `video-list-page.tsx`):
  - The main page now serves as the video list page.
  - Displays all videos fetched from NocoDB in a responsive grid (`grid-cols-[repeat(auto-fill,minmax(200px,1fr))]`).
  - Uses `next/image` for optimized thumbnail display, with `next.config.mjs` configured for `i.ytimg.com`.
  - Includes error handling for API failures and an empty state message.
- **Styling and Theming:**
  - **Fonts:** Integrated IBM Plex font family:
    - `IBM_Plex_Sans` as the default body font.
    - `IBM_Plex_Mono` for the main page title (`<h1>Video Collection</h1>`).
    - `IBM_Plex_Serif` available for long-form text (configured in Tailwind).
    - Fonts loaded via `next/font/google` in `src/app/layout.tsx` using CSS variables.
    - Tailwind CSS (`tailwind.config.ts`) updated to use these font variables.
  - **Dark Theme:** Implemented a Material Design-inspired dark theme:
    - Activated by adding the `dark` class to the `<html>` tag in `src/app/layout.tsx`.
    - Custom dark theme color palette defined in `src/app/globals.css` under the `.dark` selector, adjusting background, surface, text, and brand colors.
    - The `text-brand` color for the page title is now light on dark backgrounds.
- **Testing (`src/app/video-list-page.test.tsx` - conceptual, as page is now `src/app/page.tsx` and tests might need path updates):
  - Existing tests for the video list functionality (mocking `fetchVideos`, verifying rendering of items, errors, and empty states) are still relevant, though test file paths/descriptions might need updates if they specifically refer to `video-list-page`.
- **Build Configuration (`tsconfig.json`):**
  - Added `"vitest/globals"` to `compilerOptions.types` to resolve TypeScript errors related to the `vi` namespace in tests.
  

#### Task 5 — Curator Fields

```
@task:CuratorFields @module:ui @file:components/VideoCard.tsx
OBJECTIVE: Client component with ⭐ rating (0‑5, .5 step) + textarea comment; local optimistic state (no API). "use Context7" to search the documentation
VARS: Rating type union.
SCHEMA: Manipulate **`ImportanceRating`** and **`PersonalComment`** fields only.
DO:  • use shadcn Stars;  • debounce comment 300 ms.
DON'T:  • persist yet;  • break SSR (guard with `useMounted`).
TESTS:  RTL → click ★ updates aria-valuenow; textarea input appears.
OUTPUT: VideoCard diff + tests.
HINT: Guard any shadcn/Radix component with **`useMounted()`** to prevent hydration mismatch (see Section 7).
FINISH: COMMIT  Git
```

#### Task 6 — PATCH Save Hook

```
@task:SaveHook @module:data @file:hooks/useSaveCurator.ts
OBJECTIVE: Send PATCH to NocoDB with optimistic update & rollback.
SCHEMA: Update **`ImportanceRating`** and **`PersonalComment`** columns.
CONTEXT: uses axios instance from Task 3. "use Context7" to search the documentation
DO:  • debounce 500 ms for comments;  • separate mutation keys for rating/comment.
DON'T:  • use global fetch; stick to axios.
TESTS:  Vitest → mock 500 error → state rolls back; resolves true on 200.
OUTPUT: hook diff + test.
FINISH: COMMIT  Git
```

#### Task 7 — Accordion Details

```
@task:Accordion @module:ui @file:components/VideoAccordion.tsx
OBJECTIVE: TLDR always open; Narrative & Details sections collapsible via shadcn Accordion; abort fetch on collapse. "use Context7" to search the documentation
SCHEMA: Display **`TLDR`**, **`MainSummary`**, **`DetailedNarrativeFlow`**, plus grouped metadata from other schema sections.
DO:  • `useAbortController` per section;  • keyboard‑accessible.
DON'T:  • SSR‑mismatch (guard dynamic parts).
TESTS:  RTL → expand calls fetch; collapse triggers abort spy.
OUTPUT: accordion diff + tests.
HINT: Ensure Radix portals are wrapped by **`useMounted()`** and a Jest hydration test is added, per Section 7.
FINISH: COMMIT  Git
```

#### Task 8 — Storybook Setup

```
@task:Storybook @module:tooling @file:.storybook/
OBJECTIVE: Add Storybook 8.6, auto‑docs & a11y; document VideoCard & Accordion. "use Context7" to search the documentation
DO:  • configure with Tailwind preset;  • deploy Chromatic in CI.
DON'T:  • add non‑deterministic stories.
TESTS:  `pnpm sb build` exits 0; Chromatic run passes.
OUTPUT: config diffs.
FINISH: COMMIT  Git
```

#### Task 9 — Transcript Lazy Fetch

```
@task:Transcript @module:data @file:hooks/useTranscript.ts
OBJECTIVE: Fetch full Transcript on demand with abort support. "use Context7" to search the documentation
SCHEMA: Access **`Transcript`** field only.
DO:  • return { data, isLoading, error, retry } ;  • cancel on unmount.
DON'T:  • fetch when accordion closed.
TESTS:  Vitest → unmount before resolve triggers abort.
OUTPUT: hook diff + test.
FINISH: COMMIT  
```

#### Task 10 — E2E – Playwright

```
@task:E2E @module:e2e @file:tests/e2e.spec.ts
OBJECTIVE: End‑to‑end smoke: list renders, rating saves, accordion toggles. "use Context7" to search the documentation
DO:  • use Playwright test runner;  • stub network.
DON'T:  • rely on live NocoDB.
TESTS:  `pnpm test:e2e` green in CI.
OUTPUT: spec diff + fixtures.
FINISH: COMMIT  Git
```

#### Task 11 — CI Pipeline

```
@task:CI @module:ci @file:.github/workflows/ci.yml
OBJECTIVE: GitHub Actions workflow: setup PNPM cache, lint, vitest, Storybook build, Playwright. "use Context7" to search the documentation
DO:  • macOS‑14 + ubuntu matrix;  • save Chromatic build URL.
DON'T:  • push artefacts > 50 MB.
TESTS:  workflow completes on PR.
OUTPUT: ci.yml diff.
HINT: Incorporate the macOS OpenSSL install step and enforce ESLint **`no-floating-promises`** with `--max-warnings 0`, as listed in Section 7.
FINISH: COMMIT  Git
```

#### Task 12 — Docs & Prompt Guide

```
@task:Docs @module:docs @file:docs/prompt-guide.md
OBJECTIVE: Capture SWE‑1 prompt etiquette + examples from tasks 1‑11. "use Context7" to search the documentation
DO:  • use markdown headings and code blocks.
DON'T:  • expose API tokens or secrets.
TESTS:  markdown‑lint passes.
OUTPUT: new markdown file.
FINISH: COMMIT  Git
```

---

## 5 · Data Schema

| Group         | Columns                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| **Primary**   | `Id`, `VideoID`, `URL`                                                                               |
| **Media**     | `ThumbHigh`                                                                                          |
| **Metadata**  | `Title`, `Channel`, `Description`, `Created time`                                                    |
| **Content**   | `Transcript`, `TLDR`, `MainSummary`, `DetailedNarrativeFlow`                                         |
| **Entities**  | `Persons`, `Companies`, `Institutions`, `Speaker`                                                    |
| **Finance**   | `InvestableAssets`, `Indicators`, `Trends`, `Hashtags`, `$Ticker`, `Events/Fairs`                    |
| **Analysis**  | `Sentiment`, `SentimentReason`, `KeyExamples`, `MemorableTakeaways`, `KeyNumbersData`                |
| **Knowledge** | `PrimarySources`, `MemorableQuotes`, `TechnicalTerms`, `DOIs`, `Book-/Media-Recommendations`, `URLs` |
| **Taxonomy**  | `VideoGenre`, `MainTopic`                                                                            |
| **User**      | `ImportanceRating`, `PersonalComment`                                                                |

---

## 6 · Global Constants

```ts
export const NOCODB_API_URL   = process.env.NOCODB_API_URL;
export const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN;
```

Field lists stay unchanged; Tailwind variables now come from the design tokens.

---

## 7 · Known Issues & Work‑arounds

| Issue                        | Quick Work‑around                                                             |
| ---------------------------- | ----------------------------------------------------------------------------- |
| **shadcn Radix hydration**   | Guard client comps with `useMounted()`; prefer server comps elsewhere.        |
| **Zustand v5 typing quirks** | Follow migration guide; update hooks once 5.0 stable lands.                   |
| **OpenSSL on M2**            | `brew install openssl@3 && export LDFLAGS="$(brew --prefix openssl@3)/lib" …` |
| **Forgotten await in RSC**   | ESLint `@typescript-eslint/no-floating-promises` set to **error**.            |

### 7.1 · Preventive Implementation Checklist

* **Radix portal hydration**

  * Provide shared **`useMounted()`** util (client‑only effect).
  * Wrap every Radix or shadcn portal component: `if (!mounted) return null;`.
  * Add Jest hydration test to CI that server‑renders then hydrates a dialog; fail on warning.

* **Zustand v5 typing pain**

  * Use **`createStore()`** helper; mutate state only inside producer functions (`set((s)=>…)`).
  * Enable `exactOptionalPropertyTypes` in `tsconfig.json`.
  * Add `tsd` type‑level tests; CI fails if inference regresses.

* **Mac M2 OpenSSL**

  * CI step (macOS): `brew install openssl@3`.
  * Export `LDFLAGS` + `CPPFLAGS` from Homebrew prefix **before** `pnpm install`.
  * Cache compiled native modules across CI runs to cut minutes.

* **Forgotten await in RSC**

  * ESLint rule **`@typescript-eslint/no-floating-promises: 'error'`** in `.eslintrc.cjs`.
  * Permit intentional fire‑and‑forget via `void asyncFn()`.
  * Run ESLint in CI with `--max-warnings 0`.

> These checklist items are enforced by the **CI workflow** (Task 11). Failing any guard blocks the PR.

---

## 8 · References

* **React 19.1 Release Notes** – [https://react.dev/blog/2025/01/10/react‑19.1](https://react.dev/blog/2025/01/10/react‑19.1)
* **Next.js 15.3 Announcement** – [https://nextjs.org/blog/next‑15‑3](https://nextjs.org/blog/next‑15‑3)
* **Tailwind CSS 4.0** – [https://tailwindcss.com/blog/tailwindcss‑v4](https://tailwindcss.com/blog/tailwindcss‑v4)
* **shadcn/ui May‑2025 Changelog** – [https://ui.shadcn.com/changelog/2025‑05](https://ui.shadcn.com/changelog/2025‑05)
* **Radix UI Unified Package** – [https://www.radix‑ui.com/docs/primitives/overview/release‑2025‑01](https://www.radix‑ui.com/docs/primitives/overview/release‑2025‑01)
* **Zustand 5 Migration Guide** – [https://github.com/pmndrs/zustand/releases/tag/v5.0.0‑rc.2](https://github.com/pmndrs/zustand/releases/tag/v5.0.0‑rc.2)
* **Vitest 3.2 Beta** – [https://vitest.dev/blog/v3.2](https://vitest.dev/blog/v3.2)
* **Storybook 8.6** – [https://storybook.js.org/blog/storybook‑8.6](https://storybook.js.org/blog/storybook‑8.6)
* **Chromatic** – [https://www.chromatic.com/docs/visual‑testing](https://www.chromatic.com/docs/visual‑testing)

---

## 9 · MCP Usage Guide: context7, memory, perplexity-ask, sequential-thinking

This section explains how to use the four key MCPs in this project. All commands and configuration are up-to-date as of May 2025. Each MCP is documented with robust, beginner-friendly explanations, boilerplate, and usage patterns.

### MCP Overview
- **context7**: Provides up-to-date documentation and code search for libraries, APIs, and tools. Use it to fetch the latest stable usage, config, and code snippets for any dependency or protocol.
- **memory**: Manages persistent, queryable memory for agents and applications. Use it to store, retrieve, and update structured or conversational knowledge.
- **perplexity-ask**: Enables real-time, web-wide research and conversational AI via the Perplexity API. Use it for research, Q&A, and summarization tasks.
- **sequential-thinking**: Supports advanced, stepwise reasoning, planning, and hypothesis testing in agentic workflows.

### 9.1 · context7 Usage

**Prompting for Documentation or Boilerplate:**
```txt
Create a script to delete the rows where the city is "" given PostgreSQL credentials. use context7
```

**Fetching Latest Next.js Boilerplate:**
```txt
Create a basic Next.js project with app router. use context7
```

**VS Code MCP Server Configuration:**
```json
{
  "servers": {
    "Context7": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

**Install Context7 MCP via CLI:**
```bash
npx -y @smithery/cli install @upstash/context7-mcp --client claude
```

**Install Dev Dependencies (if using Bun):**
```bash
bun i
```

**Build Project (if using Bun):**
```bash
bun run build
```

### 9.2 · memory Usage

**Node.js MCP Server Integration:**
```js
const { MCPServer } = require('@modelcontextprotocol/server');
const { MemoryBankMCPPlugin } = require('memory-bank-mcp');

const mcpServer = new MCPServer({ port: 3000 });
mcpServer.registerPlugin(new MemoryBankMCPPlugin({ memoryBankPath: '/path/to/memory-bank' }));
mcpServer.start().then(() => {
  console.log('MCP server with Memory Bank integration started on port 3000');
});
```

**Start Memory Bank MCP in Architect Mode:**
```bash
memory-bank-mcp --mode architect
```

**Python Client Setup Example:**
```bash
uv init mcp-client
cd mcp-client
uv venv
source .venv/bin/activate
uv add mcp anthropic python-dotenv
rm hello.py
# Create your client.py and implement logic
```

### 9.3 · perplexity-ask Usage

**Python: Filtered Research Call**
```python
import requests
payload = {
  "model": "sonar-pro",
  "messages": [
    {"role": "system", "content": "Be concise."},
    {"role": "user", "content": "What is the capital of France?"}
  ],
  "search_after_date_filter": "3/1/2025",
  "search_before_date_filter": "3/5/2025",
  "search_recency_filter": "month"
}
response = requests.post(url, headers=headers, json=payload)
print(response.json())
```

**cURL: Chat Completion Call**
```bash
curl \
  --request POST "https://api.perplexity.ai/chat/completions" \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{ "model": "sonar-pro", "messages": [ {"role": "system", "content": "You are an expert on current events."}, {"role": "user", "content": "Show me tech news published this week."} ], "search_after_date_filter": "3/1/2025", "search_before_date_filter": "3/5/2025" }'
```

> **Note:** Replace `YOUR_API_KEY` with your actual Perplexity API key. Models like `sonar-pro` and `sonar-deep-research` are available (see Perplexity docs for rate limits and tier info).

### 9.4 · sequential-thinking Usage

Sequential-thinking MCP enables stepwise, chain-of-thought reasoning for agents. Example usage in agentic workflows:
- Use for multi-step planning, hypothesis testing, and reasoning chains.
- Supports branching, revision, and verification of reasoning steps.

**Example Prompt:**
```txt
Break down the problem into stepwise thoughts. Use sequential-thinking to reason through each step and verify the solution.
```

### 9.5 · MCP Usage Checklist
- [ ] Use context7 to fetch the latest, stable, and compatible usage for any library, API, or protocol.
- [ ] Use memory MCP to persist, retrieve, and update structured or conversational knowledge.
- [ ] Use perplexity-ask for real-time research, Q&A, and summarization via the Perplexity API.
- [ ] Use sequential-thinking for stepwise, multi-part reasoning, planning, and verification.
- [ ] Always reference the latest boilerplate and config from context7.
- [ ] Add comments for beginners and document any custom logic.
- [ ] Update this section if MCP usage patterns change.

---

*End of Briefing v5 – now with explicit references.*
