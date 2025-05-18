This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## NocoDB API Client

This project includes a client to fetch data from a NocoDB instance, specifically designed to retrieve video records from a table named `youtubeTranscripts` (configurable).

### Features
- **Video Rating**: Rate videos on a 5-star scale with an interactive star rating component.
- **Personal Notes**: Add and edit personal comments for each video with a rich text editor.
- **Auto-save**: Changes to ratings and comments are automatically saved to the database.
- **Video Records**: Fetches video records using Axios from a NocoDB v1 API endpoint (e.g., `/api/v1/db/data/noco/<projectId>/<tableName>`).
- **Data Validation**: Validates API responses using Zod schemas (`VideoSchema` in `src/lib/nocodb.ts`) to ensure data integrity.
  - The schema correctly handles various field types. For fields like `ThumbHigh` (which NocoDB returns as an array of attachment objects), it uses `z.preprocess` to transform the input into a usable format (e.g., a single URL string or `null`).
  - Includes robust preprocessing for fields where NocoDB might return newline-separated strings instead of arrays (e.g., `MemorableQuotes`, `Indicators`, `Hashtags`), converting them to the expected array format (e.g., `string[]` or `LinkedRecordItemSchema[]`) before final validation. This ensures robustness against variations in API data structures for multi-value fields.
  - Optional fields are defined to default to `null` if not provided by the API.
- **Configuration**: Configured via environment variables for NocoDB URL, API token, and table name.

### Environment Variables

To connect to your NocoDB instance, create a `.env.local` file in the project root with the following variables:

```env
NEXT_PUBLIC_NC_URL=http://your-nocodb-instance-url
NC_TOKEN=your-nocodb-api-token
NEXT_PUBLIC_NOCODB_TABLE_NAME=your_table_name # Optional, defaults to 'youtubeTranscripts'
```

- `NEXT_PUBLIC_NC_URL`: The base URL of your NocoDB instance (e.g., `http://localhost:8080`).
- `NC_TOKEN`: Your NocoDB API token. This is kept server-side.
- `NEXT_PUBLIC_NOCODB_TABLE_NAME`: The name of the table to fetch records from. Defaults to `youtubeTranscripts` if not set.

**Important:** Restart your development server (`pnpm dev`) after creating or modifying `.env.local` for the changes to take effect.

### Testing

The NocoDB client includes unit tests using Vitest. These tests mock Axios responses to verify:
- Successful data fetching and parsing.
- Correct Zod schema validation.
- Handling of API errors and invalid data structures.
- Graceful error handling for missing environment variables.

To run the tests:

```bash
pnpm test src/lib/nocodb.test.ts
```

Or run all tests:

```bash
pnpm test
```

## Video List Page

The project includes a server component to display a list of videos fetched from the NocoDB instance.

**Location:** `src/app/video-list-page.tsx`

### Features
- **Server-Side Rendering:** Implemented as a Next.js Server Component for optimal performance and SEO.
- **Data Fetching:** Uses the `fetchVideos` function from `src/lib/nocodb.ts` to retrieve video data.
- **Responsive Grid Layout:** Displays videos in a responsive grid that adapts to different screen sizes (using Tailwind CSS: `grid-cols-[repeat(auto-fill,minmax(200px,1fr))]`).
- **Optimized Images:** Leverages `next/image` for optimized loading and display of video thumbnails.
- **Error Handling:** Includes basic error handling to display a message if the API call fails.
- **Empty State:** Shows a user-friendly message if no videos are found.

### Testing
The Video List Page is tested using Vitest and React Testing Library. Tests are located in `src/app/video-list-page.test.tsx` and cover:
- Correct rendering of video items when data is successfully fetched.
- Display of an error message when `fetchVideos` simulates a failure.
- Display of a "no videos" message when `fetchVideos` returns an empty list.
- Correct rendering of video thumbnails and titles.

To run tests specific to this page:
```bash
pnpm test src/app/video-list-page.test.tsx
```

## Video Detail Page

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
The page displays numerous fields from the `videoSchema` (defined in `src/lib/nocodb.ts`), including recently added fields like `KeyNumbersData`, `KeyExamples`, `BookMediaRecommendations`, `VideoGenre`, `Persons`, `Companies`, `InvestableAssets`, `TickerSymbol`, `Institutions`, `EventsFairs`, `DOIs`, `PrimarySources`, `Sentiment`, `SentimentReason`, and `TechnicalTerms`.

### Technical Details
- The page is implemented as a Next.js Server Component (`src/app/video/[videoId]/page.tsx`).
- It directly fetches the required video data using `fetchVideoByVideoId` from `src/lib/nocodb.ts`.
- Styling is achieved using Tailwind CSS, consistent with the project's dark theme.

## Theming and Fonts

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
    *   If you encounter Zod parsing errors related to NocoDB data types, ensure the schemas in `src/lib/nocodb.ts` match the actual data structure returned by your NocoDB API. For example, the `Sentiment` field was initially expected as a string but returned as a number, requiring a schema update from `z.string()` to `z.number()`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
