# YT-Viewer Project Setup Guide

This guide will help you set up the YT-Viewer project from scratch.

## Prerequisites

- Node.js (v18 or later recommended)
- pnpm (package manager)
- Docker (for NocoDB)
- Git

### VS Code Dev Container (optional)
If you use VS Code, install the Dev Containers extension and run **Reopen in Container**. The container provides Node.js 20, pnpm, and installs dependencies automatically.


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
NC_URL=http://localhost:8080 # nocodb
NC_TOKEN=your_nocodb_token_here
NOCODB_PROJECT_ID=phk8vxq6f1ev08h
# Required opaque table id for v2 endpoints
NOCODB_TABLE_ID=m1lyoeqptp7fq5z
# Optional diagnostic slug
# NOCODB_TABLE_NAME=youtubeTranscripts
```
#NC_URL=http://nocodb:8080



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

## 6. Run the Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3030`

## 7. Running Tests

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

## 8. Building for Production

```bash
# Build the application
pnpm build

# Start the production server
pnpm start
```

## 9. Additional Configuration

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
- `src/features/videos/components/` - Video-specific client components
- `src/features/videos/api/` - NocoDB client, cache, and domain-specific helpers
- `src/shared/` - Shared UI primitives, hooks, and utilities
- `public/` - Static assets

## License

[Specify your license here]
