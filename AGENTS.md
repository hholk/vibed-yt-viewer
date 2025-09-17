# Repository Guidelines

## Project Structure & Module Organization
- `src/app` holds Next.js App Router routes and server components; SSR logic lives close to route entries.
- `src/components`, `src/hooks`, and `src/lib` contain reusable UI, hooks, and data utilities; co-locate supporting mocks in `src/__mocks__`.
- `src/types` centralizes shared TypeScript types, while Tailwind styles resolve through `tailwind.config.ts` and `components.json`.
- Static assets reside in `public/`; automation and maintenance helpers (e.g., `scripts/remove-comments.ts`) live under `scripts/`.

## Build, Test, and Development Commands
- `pnpm dev` boots the Next.js dev server on port 3030 with Turbopack.
- `pnpm build` produces the production bundle; follow with `pnpm start` to serve the optimized build.
- `pnpm lint` runs the ESLint config in `eslint.config.mjs`; resolve warnings before opening a PR.
- `pnpm test`, `pnpm test:watch`, and `pnpm test:ui` execute Vitest suites; `pnpm coverage` writes reports to `coverage/`.

## Coding Style & Naming Conventions
- TypeScript is mandatory; favor `async/await` and explicit return types for exported functions.
- Follow ESLint and Tailwind class ordering; auto-fix with `pnpm lint --fix` when practical.
- React components use `PascalCase` filenames (e.g., `StarRating.tsx`), shared utilities prefer `kebab-case` (e.g., `video-card.tsx`); keep tests adjacent as `*.test.ts[x]`.
- Enforce 2-space indentation, single quotes in JSX attributes, and `clsx`/`class-variance-authority` for dynamic class logic.

## Testing Guidelines
- Vitest with React Testing Library powers unit and integration tests; the shared setup lives in `src/setupTests.ts`.
- Name tests after the module under test (e.g., `video-card.test.tsx`) and cover error-paths for NocoDB requests in `src/lib`.
- Extend coverage when introducing components with conditional rendering; snapshot tests should stay localized to visual helpers.

## Commit & Pull Request Guidelines
- Follow Conventional Commit prefixes (`feat:`, `fix:`, `docs:`, `chore:`) as seen in recent history (e.g., `docs: add .env.example template file`).
- Scope commits narrowly and describe user-facing impact in the body when behavior changes.
- PRs must link the tracking issue, summarize changes, list manual QA steps, and attach UI screenshots for visual tweaks.

## Environment & Data Access
- Copy `.env.example` (or values in `README.md`/`SETUP.md`) into `.env.local`; keep API tokens out of commits.
- Use `load-env.cjs` when scripting to ensure local variables are loaded, and verify NocoDB connectivity before shipping data features.
