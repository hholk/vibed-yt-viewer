# Tasks for Junior Dev

Goal: improve maintainability, security, and performance without changing core features. Work top to bottom.

Notes: keep changes small, add tests if you touch logic, and update docs only if behavior changes.

Tasks (priority order):

- [ ] P0 Security: Remove secret exposure in `next.config.ts`. Do: delete the `env` block so `NC_URL`, `NC_TOKEN`, `NOCODB_*` never reach the client; ensure server-only code still reads `process.env`. Done when: `next.config.ts` has no secret env export and app still fetches videos. Test: `pnpm dev` and verify no NC_* values appear in `window.__NEXT_DATA__`.
- [ ] P0 Security: Guard offline mutations in `src/app/api/offline/sync/route.ts`. Do: require valid `yt-viewer-auth` cookie for `action === 'mutations'` (keep `cache` open if needed for SW), return 401 on missing/invalid cookie. Done when: unauthenticated mutation request fails, authenticated request succeeds. Test: run two POSTs with and without cookie.
- [ ] P0 Security: Harden login in `src/app/api/auth/login/route.ts`. Do: remove default `APP_PASSWORD` fallback, enforce env-only password, use constant-time compare (Node `crypto.timingSafeEqual`), and add basic in-memory rate limiting by IP (e.g. 5 tries/10 min). Done when: missing env rejects logins, timing compare used, and rate limit blocks repeated failures. Test: attempt multiple bad logins and verify 429 response.
- [ ] P1 Security: Validate PATCH payload in `src/app/api/videos/[videoId]/route.ts`. Do: add a Zod schema that whitelists allowed fields for updates and strips or rejects unknown keys; return 400 with details on invalid input. Done when: only allowed fields are sent to `updateVideo`. Test: send a PATCH with invalid field and confirm 400.
- [ ] P1 Performance: Clamp and validate pagination inputs in `src/app/api/videos/route.ts` and `src/app/api/search/route.ts`. Do: add a shared helper that enforces numeric, min/max limits (e.g. limit 1..100, offset 0..5000) and default values; reuse across routes. Done when: invalid inputs are normalized and do not cause heavy queries. Test: try `limit=9999` and confirm response limit is capped.
- [ ] P1 Maintainability: Centralize field lists used for NocoDB requests. Do: create `src/features/videos/api/fields.ts` and export `VIDEO_LIST_FIELDS`, `VIDEO_OFFLINE_FIELDS`, `VIDEO_SEARCH_FIELDS`; update routes to import instead of duplicating arrays. Done when: only one source of truth for field lists. Test: `pnpm lint`.
- [ ] P2 Performance: Add request timeouts in `src/features/videos/api/http-client.ts`. Do: set a default axios timeout (e.g. 15s) and surface a clear error message on timeout in `toRequestError`. Done when: hung NocoDB calls fail fast with a helpful error. Test: point `NC_URL` to a blackhole and confirm timeout behavior.
- [ ] P2 Maintainability: Remove the unused `package-lock.json` so pnpm is the single source of truth. Do: delete `package-lock.json` and note this in a short comment in `README.md` if needed. Done when: only `pnpm-lock.yaml` remains. Test: `pnpm install` works.
