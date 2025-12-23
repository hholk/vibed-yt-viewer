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

## Continuous Integration & Quality Checks
- PRs must pass the repository CI (install, lint, type-check, tests, build). Configure required checks in the protection rules for `main`.
- CI should cache node_modules/pnpm store and test/build artifacts where appropriate.
- Run `pnpm lint --max-warnings=0` and `pnpm test` locally before pushing.

## Pull Request Checklist
Before requesting review, ensure the PR includes:
- A linked issue or short description of why the change is needed.
- Screenshots or short screencast for UI changes.
- Local verification steps and commands in the PR description (e.g. `pnpm dev`, `pnpm ensure:video <id>`).
- Passing CI (lint, types, tests, build).
- Small, focussed commits with Conventional Commit messages.
- Updated or added tests for new behavior where applicable.

## Branching & Release Guidelines
- Branch names: `feat/<scope>/<short-desc>`, `fix/<scope>/<short-desc>`, `chore/<task>`.
- Keep `main` protected: require PRs, reviews, and green CI before merge.
- Releases: tag `main` with semver tags or use a release automation (e.g. GitHub Releases or semantic-release) agreed by the team.

## Security & Secrets
- Never commit secrets or private keys. Use `.env.local` locally and repository secrets for CI.
- Store runtime credentials in the hosting provider's secret store (Vercel, Netlify, etc.).
- If you find a security issue, report it privately to the repository owners or through the organisation's security process.

## Accessibility & Internationalization
- Follow a11y best-practices: semantic HTML, keyboard navigable components, meaningful alt text and aria attributes when needed.
- Run Lighthouse or axe in CI for critical pages where applicable.
- Keep copy and UI flexible for translations; prefer ICU/format-based plurals and date/number formatting when adding i18n.

## Local Development Tips
- Install dependencies: `pnpm install`.
- Start dev server: `pnpm dev` (Next.js on port 3030 by default).
- Use `load-env.cjs` when running ad-hoc scripts that need environment variables outside of Next's runtime.
- Use `pnpm ensure:video <videoId> [rating] [comment]` to exercise the NocoDB end-to-end pipeline during development.
- If NocoDB is not available locally, mock the client in `src/__mocks__/` and prefer contract tests for the API integration.

## Testing & Debugging
- Unit & integration: `pnpm test`, watch: `pnpm test:watch`, UI runner: `pnpm test:ui`.
- Run a single test file: `pnpm test -- src/path/to/file.test.tsx`.
- Keep tests fast and deterministic; avoid external network calls in unit tests—mock HTTP clients and NocoDB responses.

## Dependency Management
- Prefer `pnpm` for deps. Use `pnpm up` to update dependencies and open a PR for non-trivial upgrades.
- Consider Dependabot or a similar bot for automated dependency PRs; review and test each upgrade in a dedicated branch.

## Troubleshooting
- If builds fail in CI but pass locally, ensure Node/pnpm versions match the CI image and clear local caches (`pnpm store prune`).
- For flakey tests, isolate the suite and add deterministic fixtures. Reset global mocks in `src/setupTests.ts` as the canonical location.

## Contacts & Ownership
- Add a `CODEOWNERS` file in `.github/` for areas of the codebase that require specific reviewers.
- For repo-level questions, tag the maintainers listed in the PR template or the team assigned in the organisation.
