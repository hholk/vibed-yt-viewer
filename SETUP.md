# YT-Viewer Project Setup Guide

This guide will help you set up the YT-Viewer project from scratch.

## Prerequisites

- Node.js (v18 or later recommended)
- pnpm (package manager)
- Docker (for NocoDB)
- Git

## 1. Clone the Repository

```bash
git clone <repository-url> yt-viewer
cd yt-viewer
```

## 2. Install Dependencies

```bash
pnpm install
```

## 3. Set Up Environment Variables

Create a `.env.local` file in the project root with the following content:

```env
# NocoDB Configuration
NEXT_PUBLIC_NC_URL=http://localhost:8080 //nocodb
NC_TOKEN=your_nocodb_token_here
NEXT_PUBLIC_NOCODB_TABLE_NAME=youtubeTranscripts
NEXT_PUBLIC_NOCODB_PROJECT_ID=phk8vxq6f1ev08h
```
//NEXT_PUBLIC_NC_URL=http://nocodb:8080



## 4. Set Up NocoDB with Docker

Run the following command to start NocoDB in a Docker container:

```bash
docker run -d \
  --name nocodb \
  -p 8080:8080 \
  -e NC_AUTH_JWT_SECRET=your_jwt_secret_here \
  -e NC_MINIMAL_DB=true \
  -e NC_DB="postgres://user:password@host:port/dbname" \
  nocodb/nocodb:latest
```

## 5. Database Setup

1. Access NocoDB at `http://localhost:8080`
2. Create a new project
3. Create a table named `youtubeTranscripts` with the following columns:
   - `Id` (Number, Primary Key)
   - `Title` (Single Line Text)
   - `PersonalComment` (Long Text)
   - `ImportanceRating` (Number)
   - `ThumbHigh` (Attachment)
   - `Sentiment` (Number)
   - `CreatedAt` (DateTime)
   - `UpdatedAt` (DateTime)
   - `PublishedAt` (DateTime)
   - `ActionableAdvice` (Long Text)
   - `TLDR` (Long Text)
   - `MainSummary` (Long Text)
   - `KeyNumbersData` (Long Text)
   - `KeyExamples` (Long Text)
   - `DetailedNarrativeFlow` (Long Text)
   - `MemorableQuotes` (Long Text)
   - `MemorableTakeaways` (Long Text)

## 6. Project ID Setup

In `src/lib/nocodb.ts`, ensure the `projectId` is set correctly:

```typescript
const projectId = 'phk8vxq6f1ev08h'; // Update if your project ID is different
```

## 7. Run the Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3030`

## 8. Running Tests

```bash
# Run tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Generate test coverage
pnpm coverage
```

## 9. Building for Production

```bash
# Build the application
pnpm build

# Start the production server
pnpm start
```

## 10. Additional Configuration

- The project uses Tailwind CSS v4 with custom theming
- shadcn/ui components are used for the UI
- React 19 with Next.js 15.3.2
- TypeScript for type safety
- Vitest for testing

## Troubleshooting

1. **Environment Variables Not Loading**
   - Ensure `.env.local` is in the project root
   - Restart the development server after making changes

2. **NocoDB Connection Issues**
   - Verify NocoDB is running and accessible at the URL specified in `.env.local`
   - Check the NocoDB logs for any errors

3. **Test Failures**
   - Make sure all dependencies are installed
   - Check that the test environment is properly configured

## Project Structure

- `src/app/` - Next.js app router pages and layouts
- `src/components/` - Reusable React components
- `src/lib/` - Utility functions and API clients
- `public/` - Static assets

## License

[Specify your license here]
