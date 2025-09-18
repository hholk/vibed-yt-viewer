# Repository Guidelines

## Project Structure & Module Organization
Source lives under `src/`; keep route logic in `src/app` alongside server components. Domain code for videos sits in `src/features/videos` with `api/` for the NocoDB client and `components/` for UI pieces. Shared utilities, hooks, and design primitives belong in `src/shared`, and ambient types stay in `src/types`. Place test doubles under `src/__mocks__`, keep scripts in `scripts/`, and follow existing patterns when colocating tests (`*.test.tsx`) with their targets.

## Build, Test, and Development Commands
- `pnpm dev`: start the Next.js dev server (port 3030, Turbopack).
- `pnpm build` → `pnpm start`: produce and serve the production bundle.
- `pnpm lint [--fix]`: run ESLint and optionally auto-format.
- `pnpm test`, `pnpm test:watch`, `pnpm test:ui`: execute Vitest suites; use `pnpm coverage` for reports in `coverage/`.
- `pnpm ensure:video <videoId> [rating] [comment]`: exercise the NocoDB pipeline end to end.

## Coding Style & Naming Conventions
TypeScript with `async/await` is the default. Enforce 2-space indentation, single quotes in JSX attributes, and Tailwind class order. React components use `PascalCase` filenames (e.g., `StarRating.tsx`); shared utilities prefer kebab-case (`video-card.tsx`). Use `clsx` or `class-variance-authority` for dynamic class logic, and keep exports typed explicitly. Run `pnpm lint --fix` before submitting changes.

## Testing Guidelines
Vitest with React Testing Library powers unit and integration tests. Mirror the module name in test filenames (`video-card.test.tsx`) and cover NocoDB error branches in `src/features/videos/api`. Extend coverage when adding conditional UI flows, and keep snapshot tests scoped to visual helpers. Reset mocks in `src/setupTests.ts` rather than inside individual suites.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`) and keep scopes small. PRs must link their tracking issue, summarize behavior changes, list manual QA steps (commands or screenshots), and include UI captures for visual tweaks. Ensure the branch is linted, tests pass, and the relevant `pnpm ensure:video` checks succeed before requesting review.

## Environment & Configuration Tips
Copy `.env.example` into `.env.local` and avoid committing secrets. Set `NOCODB_TABLE_ID` to the opaque v2 table id (see NocoDB docs: *Tables API → Retrieve Table*). The client now relies exclusively on the v2 row endpoints described in StackOverflow’s "How do I PATCH a NocoDB row with v2 IDs?" thread, so `_rowId` support must be enabled in your table. `NOCODB_TABLE_NAME` is optional and only used for logging/diagnostics. Use `load-env.cjs` when running scripts outside the Next.js runtime, and verify NocoDB connectivity before shipping data changes.
