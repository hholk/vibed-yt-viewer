# Project Status

## Done
- Personal Note upload working reliably (updateVideo, NocoDB v2)
- "Neu Transkribieren" button fixed (clears DetailedNarrativeFlow, updateVideo, NocoDB v2)
- Delete Video action working (deleteVideo, NocoDB v2)
- **Search Tag Parsing Refactor**
  - **File:** `src/lib/nocodb.ts`
  - **Change:** Updated Zod schemas to use the `stringToLinkedRecordArrayPreprocessor` for various fields, ensuring that comma-separated strings from NocoDB are correctly parsed into individual tags.
  - **Affected Fields:** `Tags`, `Categories`, `Products`, `Speakers`, `Locations`, `Events`.
  - **Testing:** Fixed failing tests in `src/lib/nocodb.test.ts` by properly mocking all required environment variables for the `getNocoDBConfig` function.

- **Local Development Environment Setup**
  - Repository cloned to `/Users/henrikholkenbrink/yt-viewer/vibed-yt-viewer`
  - Dependencies installed with `pnpm`
  - `.env` configured:
    - `NC_URL=http://localhost:8080`
    - `NC_TOKEN=9eUdCOkB9_2RbIIecQwvIFOC_XBn1iAsrYVgu7VS`
    - `NOCODB_PROJECT_ID=phk8vxq6f1ev08h`
    - `NOCODB_TABLE_ID=youtubeTranscripts`
  - NocoDB dashboard: [http://127.0.0.1:8080/dashboard/#/nc/phk8vxq6f1ev08h/m1lyoeqptp7fq5z](http://127.0.0.1:8080/dashboard/#/nc/phk8vxq6f1ev08h/m1lyoeqptp7fq5z)
  - Development server running at [http://localhost:3030](http://localhost:3030)

- **NocoDB Config Refactor**
  - Refactored NocoDB config to only use `NC_URL`, `NC_TOKEN`, `NOCODB_TABLE_ID`, `NOCODB_PROJECT_ID`.
  - Removed all legacy environment variable support from code and tests.

- **NocoDB API v2 tableId Refactor**
  - Refactor NocoDB integration to use table ID (NOCODB_TABLE_ID) for all API v2 requests, removing table name usage. Updated env, code, and docs accordingly. Strict required env vars: NC_URL, NC_TOKEN, NOCODB_PROJECT_ID, NOCODB_TABLE_ID.

- **NocoDB Tag Search Filter Fix**
  - **File:** `src/lib/nocodb.ts`
  - **Function:** `fetchVideos`
  - **Change:** Corrected `where` clause construction for `tagSearchQuery` by removing an extra closing parenthesis in each `(Hashtags,ilike,%word%)` condition. Previously it built `(Hashtags,ilike,%word%))`, which caused NocoDB to reject the filter and return no rows.
  - **Why it mattered:** The malformed filter resulted in empty lists, making it seem like data could not be displayed from NocoDB.
  - **Auth & Endpoint:** Using NocoDB v2 endpoint `/api/v2/tables/{tableId}/records` with `xc-token` header.
  - **Environment:**
    - `NC_URL=http://localhost:8080`
    - `NC_TOKEN=9eUdCOkB9_2RbIIecQwvIFOC_XBn1iAsrYVgu7VS`
    - `NOCODB_PROJECT_ID=phk8vxq6f1ev08h`
    - `NOCODB_TABLE_ID=m1lyoeqptp7fq5z`

- **5-Star Rating & Personal Comments**

  - Added interactive 5-star rating component for the `ImportanceRating` field
  - Implemented editable text area for `PersonalComment` with save functionality
  - Added auto-save functionality for both rating and comment fields
  - Created a reusable `StarRating` component with hover and click feedback
  - Updated NocoDB client with `updateVideo` function to save changes
  - Added loading states and error handling for a better user experience
  - Updated documentation in README.md with new features

- Markdown rendering for video detail page fields: Actionable Advice, TLDR, Main Summary, Key Numbers Data, Key Examples, Detailed Narrative Flow, Memorable Quotes, Memorable Takeaways (via react-markdown in [videoId]/page.tsx)

* **Fix NocoDB `Sentiment` field parsing (Error 1 & 4):**
  - **File:** `src/lib/nocodb.ts`
  - **Change:** Updated `videoSchema` for `Sentiment` from `z.string()` to `z.number()`.
  - **Reason:** To resolve Zod parsing error "Sentiment: Expected string, received number" as NocoDB returns this field as a number.

- **Bootstrap Project (`create-next-app@latest` v15.3)**
  - Framework: Next.js 15.3
  - UI: React 19, Tailwind CSS 4, shadcn/ui
  - Package Manager: pnpm
  - Initial page: Centered card with 'Youtube.Viewer '.
  - Vitest setup: Basic render test for `/`.
- **Design Tokens**
  - Brand color: CSS variable `--color-brand: hsl(0, 0%, 20%)` (dark grey) in `src/app/globals.css`.
  - Fluid typography: CSS variable `--font-size-fluid-base` in `src/app/globals.css`.
  - Integrated with Tailwind CSS in `tailwind.config.ts` and `src/app/globals.css`.
- **NocoDB API Client (`src/lib/nocodb.ts`) & Schema Refinement**
- **Video List Page (`src/app/page.tsx`, `src/lib/nocodb.ts`, styling files) & Theming**
  - **Data Fetching & Display:**
    - Implemented a Next.js Server Component (`src/app/page.tsx`) to display all videos from NocoDB.
    - `fetchVideos` in `src/lib/nocodb.ts` updated to handle NocoDB pagination, ensuring all videos are loaded.
    - `nocodbResponseSchema` updated for pagination (`pageInfo`).
    - Videos displayed in a responsive grid with `next/image` for thumbnails (domain `i.ytimg.com` whitelisted in `next.config.mjs`).
    - Includes error handling and empty state messages.
  - **Styling & Theming:**
    - **Fonts:** Integrated IBM Plex font family using `next/font/google` and CSS variables (`src/app/layout.tsx`, `tailwind.config.ts`):
      - Default: `IBM_Plex_Sans` (via `--font-ibm-plex-sans`).
      - Page Title: `IBM_Plex_Mono` (via `font-mono` class, using `--font-ibm-plex-mono`).
      - Long Text: `IBM_Plex_Serif` available (via `font-serif` class, using `--font-ibm-plex-serif`).
    - **Dark Theme:** Implemented a Material Design-inspired dark theme globally:
      - Activated via `dark` class on `<html>` tag (`src/app/layout.tsx`).
      - Custom color palette defined in `src/app/globals.css` for `.dark` theme.
  - **Testing:**
    - Existing tests for video list functionality (`src/app/video-list-page.test.tsx` - now conceptually for `src/app/page.tsx`) remain relevant for data fetching and rendering logic.
    - Linting & Types (previous task): Resolved TypeScript errors, updated mock data, and configured `tsconfig.json` for `vitest/globals`.
  - Axios instance configured for NocoDB v1 API (path: `/api/v1/db/data/noco/<projectId>/<tableName>`).
  - Refined `VideoSchema` and `NocoDBResponseSchema` (Zod) for robust API response validation:
    - `ThumbHigh` field transformed from NocoDB attachment array to a direct image URL string (or `null`).
    - Optional text fields (`Channel`, `Description`, `PersonalComment`) and `ImportanceRating` now default to `null` if not present in API response, resolving test inconsistencies.
  - `fetchVideos` function to get and validate video records, dynamically reading environment variables (`NC_URL`, `NC_TOKEN`, `NOCODB_TABLE_ID`).
  - Vitest tests (`src/lib/nocodb.test.ts`): All tests passing. Comprehensive mocking of Axios for various scenarios (success, API errors, invalid data structure, missing env vars). Tests confirm correct parsing of refined schema, including optional fields.
  - Local NocoDB connection settings for development/testing: `NC_URL=http://nocodb:8080` (Docker network hostname), `projectId='phk8vxq6f1ev08h'` (hardcoded in `nocodb.ts`), `NC_TOKEN=<user_provided_token>`, `NOCODB_TABLE_ID=youtubeTranscripts` (user to set these in `.env.local`).
- **NocoDB API Client (`src/lib/nocodb.ts`) String-to-Array Parsing Fix:**
  - Resolved Zod parsing errors where NocoDB API returned newline-separated strings for fields expected as arrays in `fetchVideoByVideoId`.
  - Introduced `stringToArrayOrNullPreprocessor`: Converts newline-separated strings to `string[]`, trims values, and handles empty/null inputs. Applied to fields like `MemorableQuotes`, `MemorableTakeaways`, `Hashtags`, `KeyExamples`, `InvestableAssets`, `PrimarySources`, `TechnicalTerms`.
  - Introduced `stringToLinkedRecordArrayPreprocessor`: Converts newline-separated strings to `LinkedRecordItemSchema[]` (objects like `{ Title: '...', name: '...' }`). Applied to fields like `Indicators`, `Trends`, `Persons`, `Companies`, `Institutions`.
  - These preprocessors are now used in `videoSchema` in `src/lib/nocodb.ts`, ensuring robust data parsing.
- **NocoDB API Client (`src/lib/nocodb.ts`) Datetime Parsing Fix:**
  - Resolved 'Invalid datetime' errors for `CreatedAt`, `UpdatedAt`, and `PublishedAt` fields.
  - Changed Zod schema in `videoSchema` from `z.string().datetime({ offset: true })` to `z.coerce.date()` to correctly parse ISO 8601 date strings (e.g., `"2024-07-26T00:25:42.000Z"`).
- **Video Sorting (Task 4.5)**
  - Implemented video sorting functionality on the main video list page (`src/app/page.tsx`).
  - **NocoDB API (`src/lib/nocodb.ts`):** `fetchVideos` function now accepts an optional `sort` string (e.g., `Title`, `-ImportanceRating`) and passes it as a query parameter to the NocoDB API.
  - **Sort Dropdown (`src/components/sort-dropdown.tsx`):** Created a client component using shadcn/ui `Select`.
    - Options include sorting by Title (A-Z, Z-A), Channel (A-Z, Z-A), Importance (High-Low, Low-High), Date Added (Newest/Oldest - `CreatedAt`), and Date Updated (Newest/Oldest - `UpdatedAt`).
    - Default sort: Date Added, Newest First (`-CreatedAt`).
    - Updates URL query parameter (`?sort=...`) on selection change using `next/navigation` (`useRouter`, `useSearchParams`).
  - **Page Integration (`src/app/page.tsx`):** Reads the `sort` query parameter from `searchParams` and passes it to `fetchVideos`. Renders the `SortDropdown` component in the top-right corner.
  - **Dependencies:** Added `Select` component from shadcn/ui.
- **NocoDB `ThumbHigh` Parsing Fix (`src/lib/nocodb.ts`)**:
  - Resolved Zod parsing error: `ThumbHigh: Expected string, received array`.
  - Modified the `ThumbHigh` field definition within `videoSchema` to use `z.preprocess()`.
  - This ensures the incoming array of NocoDB attachment objects is transformed to a single URL string (or `null`) _before_ Zod validation, aligning the schema with the actual data structure and processing needs.
  - Added `.describe()` to `videoSchema` and `videoListItemSchema` for clearer debugging.
- **Video Detail Page & Navigation (Task 4.7)**
  - **Page Structure (`src/app/video/[videoId]/page.tsx`):**
    - Server component fetches the current video's full details using `fetchVideoByVideoId`.
    - Fetches a sorted list of all videos (ID, VideoID, Title, Channel, Importance, CreatedAt, UpdatedAt) using `fetchAllVideos` and a `navVideoSchema` for navigation purposes.
    - Passes fetched data to `VideoDetailClientView`.
  - **Client View (`src/components/video-detail-client-view.tsx`):**
    - Renders detailed video information in a structured layout.
    - Implements "Previous" and "Next" navigation buttons.
    - Enables keyboard navigation (ArrowLeft for previous, ArrowRight for next).
    - Handles UI states for first/last video in the navigation sequence.
  - **Data Fetching (`src/lib/nocodb.ts`):**
    - `fetchVideoByVideoId(id: number)`: Retrieves a single video by its numeric ID.
    - `fetchAllVideos`: Enhanced to accept a `fields` parameter to limit columns fetched from NocoDB, used by `navVideoSchema`.
  - **Schema & Types:**
    - `navVideoSchema`: Defined in `page.tsx` for fetching minimal data required for navigation links.
    - `NavVideo` type in `VideoDetailClientView`: Adjusted to allow nullable fields (Title, Channel, etc.) to align with `navVideoSchema` and actual data, resolving type errors.
    - `videoSchema` in `nocodb.ts`: Corrected types for fields like `KeyNumbersData`, `KeyExamples` from array to string based on actual data content.
- **Video Detail View & Schema Enhancement (Task 4.8)**
  - \*\*Schema Update (`src/lib/nocodb.ts` - `videoSchema`):
    - Added new fields: `KeyNumbersData` (string), `KeyExamples` (string), `BookMediaRecommendations` (array of string), `RelatedURLs` (array of string/URL), `VideoGenre` (string), `Persons` (array of linked records), `InvestableAssets` (array of string), `TickerSymbol` (string), `Institutions` (array of linked records), `EventsFairs` (array of linked records), `DOIs` (array of string), `PrimarySources` (array of string), `Sentiment` (string), `SentimentReason` (string), `TechnicalTerms` (array of string).
    - Re-added `Companies` (array of linked records).
    - All new fields are optional and nullable.
  - \*\*Video Detail Page Implementation (`src/app/video/[videoId]/page.tsx`):
    - Implemented as a Next.js Server Component.
    - Features a "Back to Home" button with `ArrowLeft` icon.
    - Video `Title` displayed as `<h1>`, `VideoID` shown underneath.
    - Video attributes displayed in collapsible sections using HTML `<details>` and `<summary>` elements.
    - Default collapsed fields: `FullTranscript` (as 'Transcript'), `VideoID` (section), `CreatedAt`, `UpdatedAt`, `PublishedAt`, `Prompt`.
    - `RelatedURLs` are rendered as a list of clickable links.
    - `ThumbHigh` is displayed as an image; `URL` as a clickable link.
    - Uses `notFound()` for missing videos and generates dynamic page metadata.
    - Resolved TypeScript lint errors using type assertions (`key as string`).
- **Video Detail Page UI & Data Fetching (Task 4.8 & User Feedback)**:
  - Reordered fields in `src/app/video/[videoId]/page.tsx` based on user specification.
  - Modified `DetailItem` component to always display the field label; empty/null values show 'N/A'.
  - Most detail items start collapsed except key fields like ThumbHigh, URL, Actionable Advice, TLDR, and MainSummary.
  - Added an on-page note stating that `KeyNumbersData` and `KeyExamples` are not displayed as they are not in `videoSchema`.
  - **Fixed Data Fetching**: Resolved Next.js 'sync-dynamic-apis' error by `awaiting params` before use in `VideoDetailPage` and `generateMetadata`.
  - **Fixed Lint Error**: Imported `Metadata` type from 'next' in `page.tsx` to resolve `Cannot find name 'Metadata'`.

## In Progress

- Currently none.

## To Do

- **Curator Fields** (Task 5)
  - Develop a client-side `VideoCard` component.
  - Allow local rating and commenting on videos.
  - Tests: RTL test for star click state changes.
- **PATCH Save Hook** (Task 6)
  - Create `useSaveCurator` custom hook.
  - Implement optimistic updates for saving curator fields.
  - Tests: Vitest test for rollback on 500 error.
- **Accordion Details** (Task 7)
  - Display TLDR and lazy-loaded narrative in an accordion within the `VideoCard`.
  - Implement request abortion on accordion collapse.
  - Tests: RTL test to verify request abort on collapse.
- **Storybook Setup** (Task 8)
  - Document all UI primitives in Storybook.
  - Integrate Chromatic for CI visual regression testing.
  - Tests: Storybook build and Chromatic run should be green.
- **Transcript Lazy Fetch** (Task 9)
  - Implement abort controller pattern for fetching transcripts.
  - Tests: Unit test to verify abortion logic.
- **E2E – Playwright** (Task 10)
  - Write end-to-end tests for core user flows (list, save, accordion interaction).
  - Tests: Headless pass for all E2E tests.
- **CI Pipeline** (Task 11)
  - Configure GitHub Actions workflow.
  - Include steps for pnpm caching, linting, Vitest, project build, Storybook build, and E2E tests.
  - Tests: CI pipeline should run green.
- **Docs & Prompt Guide** (Task 12)
  - Ensure all documentation is up-to-date.

## Refactoring Plan (Meta Standards)

- [x] 1. Extract render helper functions from `video-detail-client-view.tsx` into `src/components/render-utils.tsx`.
- [x] 2. Replace duplicated caching logic in `src/lib/nocodb.ts` with generic functions in `src/lib/cache.ts`.
- [x] 3. Simplify filter option collection in `video-list-client.tsx` using a configuration-driven approach.
- [x] 4. Update existing files to use new helpers without changing functionality.
- [x] 5. Run and pass tests using `pnpm test`.
- [x] 6. Extract numeric ID resolution into shared `resolveNumericId` helper.
- [x] 7. Create `createRequestError` to centralize axios error handling.
- [x] 8. Refactor `updateVideo` and `deleteVideo` to use these helpers.
- [x] 9. Consolidate video filtering logic using a unified configuration.
- [x] 10. Run `pnpm test` to ensure refactor maintains behavior.

## Current Refactor Tasks

- [x] 1. Create helper to extract titles from linked record arrays and refactor `FILTER_GETTERS` in `video-list-client.tsx`.
- [x] 2. Replace `isClient` logic in `sort-dropdown.tsx` with the existing `useMounted` hook.
- [x] 3. Remove unused files `src/dummy.test.ts` and `prompt_task4_done.md`.
- [x] 4. Run `npm test` to ensure all tests pass after refactor.
>>>>>>> 9702fd413fb578c1aa36778a4818d419517bf670
