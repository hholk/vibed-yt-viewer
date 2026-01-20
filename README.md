# YouTube Video Viewer

A modern, responsive web application for browsing, searching, and interacting with a collection of YouTube videos. Built with Next.js 15 (App Router), TypeScript, Tailwind CSS, and shadcn/ui components. The application connects to a NocoDB backend for data storage and management.

## 🚀 Features

- **Advanced Search**: Powerful macOS Finder-like search with tag-based interface that searches across the entire database
  - Search across multiple fields simultaneously (Title, Description, Tags, Persons, Companies, etc.)
  - Tag-based search interface similar to macOS Finder
  - Category-based filtering with visual icons
  - Real-time search across the complete video database
- **Code Optimization**: The NocoDB client has been extensively refactored to eliminate code duplication and improve maintainability:
  - **Schema Preprocessing**: Created reusable preprocessing utilities (`preprocessors` object) to reduce schema definition code by ~70%
  - **API Function Consolidation**: Unified duplicate fetch functions into a single `fetchSingleVideo` function with consistent behavior
  - **Error Handling**: Implemented reusable error handling utilities for consistent logging and debugging
  - **Filter Logic**: Simplified video filtering using configuration-driven approach with generic utilities
  - **Cache Management**: Fixed cache duplication issues and improved cache key consistency
  - All optimizations maintain backward compatibility while significantly improving code quality and performance
- **Downloads**: Download video or audio files in selectable qualities (default 720p) directly from the video cards
- **Saved Playlist View**: Toggle to a YouTube “Saved” playlist view with cached metadata (up to 5 GB cap)

## 🔍 Advanced Search System

The application features a powerful search system inspired by macOS Finder that allows users to search across the entire video database using a tag-based interface.

### Features

- **Database-Wide Search**: Unlike the previous client-side filtering, the new search queries the entire database directly
- **Tag-Based Interface**: Every search term becomes a visual tag that can be easily managed
- **Category-Based Filtering**: Search within specific categories like Title, Description, Tags, Persons, Companies, etc.
- **Real-Time Results**: Search results update as you type or modify search tags
- **Visual Category Indicators**: Each category has a distinctive icon for easy recognition

### Search Categories

The search system supports the following categories:

- 📝 **Title**: Video titles
- 📄 **Description**: Video descriptions
- 📺 **Channel**: Channel names
- 🎤 **Speaker**: Speaker names
- 🎭 **Genre**: Video genres
- 🏷️ **Topic**: Main topics
- # **Hashtag**: Video hashtags
- 👤 **Person**: People mentioned
- 🏢 **Company**: Companies mentioned
- 📊 **Indicator**: Key indicators
- 📈 **Trend**: Trends discussed
- 💰 **Asset**: Investable assets
- 🏛️ **Institution**: Institutions mentioned
- 📅 **Event**: Events and fairs
- 🔗 **DOI**: Digital Object Identifiers
- 📚 **Source**: Primary sources
- ⚙️ **Technical**: Technical terms
- 📊 **Ticker**: Stock ticker symbols

### Usage

1. **Basic Search**: Type in the search box and press Enter to add a search tag
2. **Category Selection**: Click the tag icon to select specific categories to search in
3. **Multiple Tags**: Add multiple search terms as separate tags
4. **Tag Management**: Click the X on any tag to remove it
5. **Clear All**: Use the "Clear all" button to remove all search tags

### Technical Implementation

- **API Endpoint**: `/api/search` handles all search requests
- **Database Query**: Uses NocoDB's filtering capabilities to search across all records
- **Performance**: Optimized to handle large datasets with efficient pagination
- **Caching**: Results are cached to improve performance for repeated searches

### Example Searches

- Search for "machine learning" in titles and descriptions
- Find videos mentioning "John Doe" as a person
- Look for content tagged with "#artificial-intelligence"
- Search for videos from "TechCrunch" channel
- Find videos discussing "quantum computing" as a technical term

The search system provides a modern, intuitive interface that makes finding specific content in large video collections effortless.
## Architecture Overview

The app uses Next.js 15 with the App Router and React Server Components. Data comes from a NocoDB backend accessed via an Axios-based client. Zod is used for robust schema validation and data transformation, including parsing comma-separated strings from NocoDB into individual tags. Tailwind CSS and shadcn/ui provide the UI layer. See the project structure below for folder layout.


## 📦 Prerequisites

- Node.js 18.0.0 or later
- pnpm (recommended) or npm/yarn
- NocoDB instance (or compatible REST API)
### VS Code Development Container
If you use VS Code, the repository includes a preconfigured **dev container**. Install the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension and run **"Dev Containers: Reopen in Container"**. The container provides Node.js 20 and pnpm, and automatically installs recommended extensions (ESLint, Playwright).


## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/yt-viewer.git
   cd yt-viewer
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file (or `.env`) in the project root with the following variables (all are required):
   ```env
   # NocoDB connection (v2 API)
   NC_URL=http://localhost:8080
   NC_TOKEN=your_nocodb_token
   NOCODB_PROJECT_ID=your_project_id          # e.g. phk8vxq6f1ev08h
   NOCODB_TABLE_ID=your_table_id              # e.g. m1lyoeqptp7fq5z (opaque v2 id)
   # Optional: human-readable slug for diagnostics/logging
   # NOCODB_TABLE_NAME=youtubeTranscripts

   # YouTube Saved playlist (required for the Saved toggle)
   YOUTUBE_SAVED_PLAYLIST_ID=your_playlist_id
   ```
   > **Note for beginners:** The client now follows the official NocoDB v2 guidance (see the "Tables API" documentation and the StackOverflow discussion on PATCHing rows via `_rowId`). Provide the opaque `NOCODB_TABLE_ID` from the v2 UI/API and ensure `_rowId` support is enabled in your table. `NOCODB_TABLE_NAME` is optional and used only for diagnostics. All requests authenticate via the `xc-token` header.

4. **Start the development server**
   ```bash
   pnpm dev
   ```

5. **Open your browser**
   Visit [http://localhost:3030](http://localhost:3030) to see the application in action.

## Environment Setup

The application expects a running NocoDB instance and the environment variables above. Create a `.env.local` file with content similar to:
```env
NC_URL=http://localhost:8080
NC_TOKEN=your_nocodb_token
NOCODB_PROJECT_ID=phk8vxq6f1ev08h
NOCODB_TABLE_ID=m1lyoeqptp7fq5z
# Optional diagnostic slug
# NOCODB_TABLE_NAME=youtubeTranscripts
# YouTube Saved playlist
YOUTUBE_SAVED_PLAYLIST_ID=your_playlist_id
```

If you do not have NocoDB running locally you can start one with Docker:
```bash
docker run -d --name nocodb -p 8080:8080 nocodb/nocodb:latest
```

## 🧪 Running Tests

Run the full test suite:
```bash
pnpm test
```

Run tests in watch mode:
```bash
pnpm test:watch
```

Run tests with coverage:
```bash
pnpm test:coverage
```

## Development Workflow

1. Run `pnpm dev` to start the local server with hot reload.
2. Use `pnpm lint` and `pnpm test:watch` while coding.
3. Commit your changes and open a pull request when ready.
4. Review the contributor guide in [AGENTS.md](AGENTS.md) before opening or reviewing a PR.

## Common Commands

| Command | Description |
| ------- | ----------- |
| `pnpm dev` | Start the development server on port 3030 |
| `pnpm lint` | Run ESLint checks |
| `pnpm test` | Execute the test suite |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm coverage` | Generate coverage report |
| `pnpm build` | Build for production |
| `pnpm start` | Start the production server |

## 🏗️ Project Structure

```
yt-viewer/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── (main)/             # Main application routes
│   │   │   ├── page.tsx        # Home page
│   │   │   └── video/          # Video-related routes
│   │   │       └── [videoId]/  # Dynamic route for individual videos
│   │   │           ├── page.tsx
│   │   │           └── VideoDetailPageContent.tsx
│   │   ├── globals.css         # Global styles
│   │   └── layout.tsx          # Root layout
│   ├── components/             # Reusable UI components
│   │   ├── StarRating.tsx      # Interactive star rating component
│   │   ├── SortDropdown.tsx    # Video sorting controls
│   │   ├── VideoCard.tsx       # Video thumbnail card
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/
│   │   ├── nocodb.ts         # NocoDB API client
│   │   └── utils.ts           # Utility functions
│   └── types/                 # TypeScript type definitions
├── public/                    # Static assets
├── .env.example              # Example environment variables
├── next.config.js            # Next.js configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── package.json              # Project dependencies and scripts
```

## 🔧 NocoDB Configuration

The application is designed to work with a NocoDB instance with the following requirements:

### Required Table: `youtubeTranscripts`

**Key Fields**:
- `Id` (AutoNumber) - Unique identifier
- `VideoID` (String) - YouTube video ID
- `Title` (String) - Video title
- `ThumbHigh` (Attachment) - Video thumbnail URL
- `Channel` (String) - Channel name
- `ImportanceRating` (Number) - User rating (1-5)
- `PersonalComment` (LongText) - User's personal notes
- `CreatedAt` (DateTime) - Record creation date
- `UpdatedAt` (DateTime) - Last update date
- `PublishedAt` (DateTime) - Video publication date
- `FullTranscript` (LongText) - Full video transcript
- `TLDR` (LongText) - Brief summary
- `MainSummary` (LongText) - Detailed summary
- `ActionableAdvice` (LongText) - Actionable insights
- `MemorableQuotes` (JSON) - Array of notable quotes
- `MemorableTakeaways` (JSON) - Key takeaways

## 📝 Code Style

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with recommended rules
- **Imports**: Absolute imports with `@/` prefix

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework for Production
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - Beautifully designed components
- [NocoDB](https://www.nocodb.com/) - Open Source Airtable Alternative
- [Lucide Icons](https://lucide.dev/) - Beautiful & consistent icons

The project features a dedicated page for viewing detailed information about a specific video, accessible by navigating from the video list page (e.g., `/video/[videoId]` URLs).

**Location:** `src/app/video/[videoId]/page.tsx` (Server Component)

### Features
- **Comprehensive Video Information:** Displays extensive details about the video. The page is server-rendered for optimal performance.
- **Expandable Sections:** Video attributes are presented in expandable sections (`<details>`/`<summary>` elements) for a clean and organized UI. All sections are expanded by default, but users can collapse them to hide details.
  - The order of fields displayed follows a specific user-defined sequence, including `ThumbHigh`, `URL`, `ActionableAdvice`, `TLDR`, `MainSummary`, `DetailedNarrativeFlow`, various lists like `MemorableQuotes`, `Persons`, `Hashtags`, and metadata like `Channel`, `Description`, `Transcript`, and timestamps.
- **Rich Content Display:**
  - `Title` is the main heading, with `VideoID` displayed underneath.
  - `ThumbHigh` (thumbnail) is shown as an image.
  - **5-Star Rating**: The `ImportanceRating` field is displayed as an interactive 5-star rating component. Click on the stars to set the rating, which is automatically saved to the database.
  - **Personal Comments**: The `PersonalComment` field is displayed as an editable text area. Click the 'Edit' button to add or modify your comments, then click 'Save' to store them in the database.
  - `URL` (video link) is a clickable link.
  - `RelatedURLs` are displayed as a list of clickable links.
  - Arrays of linked records (e.g., `Persons`, `Companies`) or strings (e.g., `MemorableQuotes`, `Hashtags`) are shown as bulleted lists.
- **Back Navigation:** A prominent "Back to Home" link allows easy return to the main video list.
- **Dynamic Metadata:** Page title and description are dynamically generated based on the video content.
- **Error Handling:** Gracefully handles cases where a video is not found using Next.js's `notFound()` mechanism.

### Schema Integration
The page displays numerous fields from the `videoSchema` (defined in `src/features/videos/api/nocodb.ts`), including recently added fields like `KeyNumbersData`, `KeyExamples`, `BookMediaRecommendations`, `VideoGenre`, `Persons`, `Companies`, `InvestableAssets`, `TickerSymbol`, `Institutions`, `EventsFairs`, `DOIs`, `PrimarySources`, `Sentiment`, `SentimentReason`, and `TechnicalTerms`.

### Technical Details
- The page is implemented as a Next.js Server Component (`src/app/video/[videoId]/page.tsx`).
- It directly fetches the required video data using `fetchVideoByVideoId` from `src/features/videos/api/nocodb.ts`.
- Styling is achieved using Tailwind CSS, consistent with the project's dark theme.

## 📊 Markdown Table Rendering

The application features a robust markdown table rendering system that automatically detects and beautifully renders markdown tables within video content.

### How It Works

1. **Table Detection**: The `SafeReactMarkdown` component automatically detects markdown tables by looking for:
   - Lines containing `|` characters with proper table formatting
   - Separator rows with dashes and colons for alignment

2. **Content Splitting**: When a table is detected, the content is intelligently split into:
   - Content before the table
   - The table itself
   - Content after the table

3. **Dual Rendering**: Each section is rendered separately:
   - Regular markdown content uses React Markdown with GFM support
   - Tables are rendered using a custom `MarkdownTable` component

### Components Involved

- **`SafeReactMarkdown`** (`src/shared/components/safe-react-markdown.tsx`): Main component that handles table detection and content splitting
- **`MarkdownTable`** (`src/shared/components/markdown-table.tsx`): Custom component for rendering tables with Tailwind CSS styling

### Features

- ✅ **Automatic Detection**: Tables are detected and rendered without user intervention
- ✅ **Responsive Design**: Tables are horizontally scrollable on mobile devices
- ✅ **Dark Theme**: Tables match the application's dark theme with proper contrast
- ✅ **Mixed Content**: Supports tables mixed with other markdown content
- ✅ **Error Handling**: Gracefully handles malformed tables

### Example Usage

Tables in video descriptions are automatically rendered:

```markdown
| Feature | Description | Impact |
|---------|-------------|--------|
| AI Agents | Autonomous software | High |
| Quantum Computing | Revolutionary tech | Medium |
| Blockchain | Distributed ledger | Low |
```

This renders as a beautiful, responsive HTML table with proper styling and hover effects.

### Technical Implementation

The table detection uses regex patterns to identify table structures and extract them for separate rendering. The implementation prioritizes reliability and performance while maintaining the existing markdown rendering capabilities.

The project features a custom dark theme and specific typography to enhance user experience.

### Dark Theme
- A Material Design-inspired dark theme is implemented globally.
- It's activated by default by adding the `dark` class to the `<html>` tag in `src/app/layout.tsx`.
- The color palette is defined using CSS variables in `src/app/globals.css` under the `.dark` selector, controlling background, surface, text, and component colors.
- Key colors include a dark gray background (`~#121212`), slightly lighter card/surface colors (`~#1E1E1E`), and light text for readability.
- The brand color (`text-brand`) is adjusted for visibility on dark backgrounds.

### Custom Fonts
- The **IBM Plex** font family is used throughout the application:
  - **IBM Plex Sans**: Serves as the default body font.
  - **IBM Plex Mono**: Used for the main page title ("Video Collection").
  - **IBM Plex Serif**: Configured and available for use in long-form text content via the `font-serif` Tailwind utility class.
- Fonts are loaded efficiently using `next/font/google` in `src/app/layout.tsx` and exposed via CSS variables.
- Tailwind CSS (`tailwind.config.ts`) is configured to use these font variables, making utility classes like `font-sans`, `font-mono`, and `font-serif` available.

## Troubleshooting

*   **NocoDB Zod Parsing Errors:**
    *   If you encounter Zod parsing errors related to NocoDB data types, ensure the schemas in `src/features/videos/api/nocodb.ts` match the actual data structure returned by your NocoDB API. For example, the `Sentiment` field was initially expected as a string but returned as a number, requiring a schema update from `z.string()` to `z.number()`.

---

## NocoDB API Usage

The runtime talks to NocoDB via the v2 REST API (table id–based URLs). Single-row mutations follow the `_rowId` guidance outlined in the NocoDB docs and StackOverflow (“How do I PATCH a NocoDB row with v2 IDs?”). All requests authenticate via the `xc-token` header.

- Required env vars (IDs, not names):
  - `NC_URL` – Base URL of NocoDB, e.g. `http://localhost:8080`
  - `NC_TOKEN` – API token with access to the project/table
  - `NOCODB_PROJECT_ID` – Project (base) ID, e.g. `phk8vxq6f1ev08h`
  - `NOCODB_TABLE_ID` – Opaque v2 table id, e.g. `m1lyoeqptp7fq5z`
  - `NOCODB_TABLE_NAME` – Optional slug for diagnostics/logging

### Endpoints we use

- Metadata discovery: `GET {NC_URL}/api/v2/meta/projects/{projectId}/tables`
- Table details: `GET {NC_URL}/api/v2/tables/{tableId}`
- List and query records: `GET {NC_URL}/api/v2/tables/{tableId}/records`
- **Single-row updates**: `PATCH {NC_URL}/api/v2/tables/{tableId}/records` with `Id` in request body (filter-based, most reliable)
- Single-row deletions: `DELETE {NC_URL}/api/v2/tables/{tableId}/records/{rowId}` (pref) → `/records/{numericId}` (fallback)

Headers:

```http
xc-token: <NC_TOKEN>
Content-Type: application/json
```

### Filtering (where)

We use `where` to filter by fields, e.g. tag search over `Hashtags`:

```text
(Hashtags,ilike,%word1%)~and(Hashtags,ilike,%word2%)
```

See `fetchVideos({ tagSearchQuery: 'word1 word2' })` which builds the filter as shown. This was fixed to avoid an extra `)` that could cause empty results.

### Pagination and fields

- `limit` and `offset` are supported and handled by `fetchVideos`.
- Use `fields=Title,Channel,ThumbHigh,...` to minimize payload. We provide an optional `fields` argument and validate responses with Zod.

### Client functions

The public NocoDB client entry point is `src/features/videos/api/nocodb.ts`; it
re-exports the functions implemented across the modular files in the same
folder and exposes:

- `fetchVideos(options)` – list videos with pagination, sort, optional `fields`, and optional `tagSearchQuery`.
- `fetchAllVideos(options)` – pull the complete dataset using paginated v2 requests and cache the result.
- `fetchVideoByVideoId(videoId)` – load a single record by the `VideoID` column.
- `updateVideo(recordIdOrVideoId, data)` – mutate a record (v2 rowId → v2 numeric path → v2 bulk filter).
- `deleteVideo(recordIdOrVideoId)` – delete a record (same sequence as `updateVideo`).

All functions:
- Read config with `getNocoDBConfig()` from env vars.
- Validate responses with Zod (`videoSchema`/`videoListItemSchema`).
- Use preprocessors to convert NocoDB’s mixed types (e.g., newline- or comma-separated strings) into structured arrays.

### Example usage

```ts
import { fetchVideos, fetchVideoByVideoId, updateVideo, deleteVideo } from '@/features/videos/api/nocodb';

// 1) List videos with sorting and tag filter
const { videos, pageInfo } = await fetchVideos({
  sort: '-CreatedAt',
  tagSearchQuery: 'ai finance',
  fields: ['Id', 'Title', 'Channel', 'ThumbHigh', 'Hashtags']
});

// 2) Load a single video by its YouTube VideoID
const video = await fetchVideoByVideoId('dQw4w9WgXcQ');

// 3) Update rating (accepts numeric Id or VideoID)
await updateVideo('dQw4w9WgXcQ', { ImportanceRating: 5 });

// 4) Delete by numeric Id
await deleteVideo(123);
```

Beginner tip: `updateVideo`/`deleteVideo` accept either the numeric `Id` or the `VideoID`. If you pass a string that isn’t an integer, we first resolve it to the numeric `Id` using `fetchVideoByVideoId`.

### Schema validation and preprocessors

We use Zod to strictly validate and normalize the data:

- `videoSchema` – Full record for the detail page.
- `videoListItemSchema` – Minimal record for the grid.

Preprocessors in `src/features/videos/api/schemas.ts` handle common NocoDB formats:

- `stringToArrayOrNullPreprocessor` – converts newline-separated strings to `string[]` and handles empty objects.
- `stringToLinkedRecordArrayPreprocessor` – converts comma-separated text or mixed inputs into arrays of linked-record-like objects (with `Title` / `name`).
- `emptyObjectToNull` – normalizes `{}` to `null` when appropriate.
- `ThumbHigh` – transformed to a single URL string for rendering.
- Date fields – parsed with `z.coerce.date()` for robust ISO handling.

Troubleshooting: If validation fails, we log the offending response and raise a `NocoDBValidationError` with precise Zod issues. Adjust the schema to match your actual NocoDB column formats.
