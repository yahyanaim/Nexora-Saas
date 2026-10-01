# Remediation Plan — fixes for `docs/AUDIT_2026-10.md`

Plan only, no code yet. The work is split into 6 phases, ordered by risk. Each phase should be one commit (or one small PR) and must pass `npm run typecheck && npm run lint && npm test && npm run i18n:check` before it's pushed.

**Phase 0 — setup:** run `npm ci` and record baseline lint/test results so later regressions stand out.

---

## Phase 1 — Critical security and correctness (audit #1, #2, #3)

### 1.1 Wire up the passcode lock (#1)
- `src/contexts/auth-provider.tsx`: add `isPasscodeLocked: Boolean(user?.isPasscodeLocked)` to the context `value`.
- `src/store/auth/lock-screen-store.ts`: call `lock()` on logout and on `SESSION_EXPIRED_EVENT`, so an unlock doesn't carry over to the next session.
- Test: add a case in `auth-provider.test.tsx` that sets `isPasscodeLocked` on the user and checks that the flag reaches the context. Add a render test that `DashboardLayout` shows `<LockScreen>` when the user is locked and not unlocked.

### 1.2 One demo-mode switch with a hard production guard (#2)
- Make `isDemoMode()` (`src/lib/auth/demo-mode.ts`) the **only** place that reads `NEXT_PUBLIC_DEMO_MODE`. Return `false` when `NODE_ENV === "production"`, unless `NEXT_PUBLIC_ALLOW_DEMO_BUILD === "true"` is set for a deliberate public demo deploy.
- Replace the ~75 direct `process.env.NEXT_PUBLIC_DEMO_MODE` reads in `src/lib/api/*.ts` (audit-logs, auth, developer, files, gdpr, invoices, overview, projects, reports, roles, team, transactions, usage-metering, users) and `src/lib/myapi/token-storage.ts` with `isDemoMode()`. Add an ESLint `no-restricted-syntax` rule that bans `process.env.NEXT_PUBLIC_DEMO_MODE` outside `demo-mode.ts` and `env.ts`.
- Build guard: in `next.config.mjs` and `scripts/prebuild.js`, fail when `NODE_ENV=production`, `DEMO_MODE=true` and `ALLOW_DEMO_BUILD` is not set. This covers Vercel, Fly and Docker. Add `NEXT_PUBLIC_ALLOW_DEMO_BUILD` to `env.ts` and `.env.example`.
- `loginApi` (`auth-apis.ts` ~L69): drop the `|| DEMO_ADMIN_USER` fallback. Only the listed demo emails can log in, and only when the backend is unreachable (not on 401 or 400 responses).
- Tests: extend `auth-apis.test.ts` to cover these cases: a wrong password with demo on and the backend returning 401 must throw; any login in production mode must throw.

### 1.3 Narrow `isBackendUnreachable` (#3)
- `src/lib/myapi/client.ts`: treat as "unreachable" only (a) Axios errors with no response, or code `ERR_NETWORK`/`ECONNREFUSED`/`ECONNABORTED`, and (b) status 502, 503 or 504. Remove 404, and return `false` for non-Axios errors.
- Update `client.test.ts`. Re-run the api tests, since some may depend on the old 404 behavior.

---

## Phase 2 — Edge guard and auth flow (#4, #6, #11)
- `src/proxy.ts`:
  - Read the locale from `routing.locales` (`src/i18n/routing`) instead of `/[a-z]{2}/`, and fall back to the default locale for unknown prefixes.
  - Add `?next=<pathname>` to the `/auth` redirect.
  - Optional: if `JWT_SECRET` is available on the server, verify the token signature and expiry with `jose`, which runs at the edge. Otherwise keep the presence-only check and document that every page loads its data through authenticated API calls.
- `auth-provider.tsx` L112, L113, L157: replace `pathname.includes(...)` with segment checks (`pathname === "/auth" || pathname.startsWith("/auth/")`). After login, honor `?next` only if it's a same-origin relative path starting with `/`, to avoid an open redirect.
- `client.ts` refresh interceptor:
  - Match auth routes exactly against the request path instead of with `includes`.
  - Keep one shared `refreshPromise` until it settles, and clear it in a microtask after waiters have attached, so a 401 that arrives just after the refresh finishes doesn't start a second refresh.
- Tests: add `src/proxy.test.ts` cases for an unknown locale, `?next`, and the root path. Add interceptor tests for concurrent 401s, so exactly one `/auth/refresh` call happens.

## Phase 3 — Browser hardening (#5, #7, #8, #9)
- **CSP:** build a nonce-based CSP in `proxy.ts` (the pattern in the Next 16 docs under `node_modules/next/dist/docs/`) and remove the static header from `next.config.mjs`.
  - Remove `'unsafe-eval'` outside dev.
  - Limit `connect-src` to `'self'`, the origin of `NEXT_PUBLIC_API_URL` and its `wss:` equivalent, with localhost only in dev.
  - Test in the browser with Playwright (Chromium is preinstalled) that no CSP violations appear on `/auth` and `/dashboard/overview`.
- **`file-dialog.tsx:187`:** replace the `onError` + `innerHTML` code with a `videoError` state and a JSX fallback.
- **localStorage:**
  - Stop storing the `passcode` flag (`passcode-dialog.tsx:85`), because the server value from 1.1 is the source of truth.
  - Parse the stored team data (`team-apis.ts`) with a Zod schema and fall back to the seed data if it's invalid.
  - Prefix and namespace the keys.
- **Upgrade-required storm:** in `auth-provider.tsx`, ignore repeat events within about 3 s. Use a sonner toast `id` to dedupe, and skip `router.push` when already on `/dashboard/plans`.

## Phase 4 — Performance and code quality (#10, #12, #13)
- `auth-provider.tsx`: memoize `baseUser` with `useMemo(() => mapAuthUserToUser(myAccount), [myAccount])`, wrap `value` in `useMemo`, and wrap `refetchUser` in `useCallback`.
- Logging: add a `src/lib/logger.ts` that does nothing in production except for errors. Log once in the axios interceptor, and remove the ~50 per-function `console.error` calls in `src/lib/api/*`.
- Cleanup:
  - Delete `src/store/auth/auth-store.ts` (only referenced by itself) after a final grep.
  - Delete `src/hooks/.gitkeep`.
  - Delete `scratch/` and add it to `.gitignore`.
  - Rename the package to `nexora-saas` and replace the "Volix" comments.

## Phase 5 — Dependencies and tooling (#14, #15, audit tooling)
- Run `npm audit fix` (brace-expansion, fast-uri, ip-address), then re-run the tests.
- Move `shadcn` and `@types/canvas-confetti` to devDependencies. Align `eslint-config-next` with the installed `next` minor version.
- Find unused packages with `npx knip` or `depcheck`. Pick one virtualization library (`@tanstack/react-virtual`) and remove `react-window` if nothing still needs it. Review `three` types, `sass` and `jspdf` usage. Merging Carbon and Radix is a larger decision — record it as a follow-up, don't do it in this pass.
- `tsconfig.json`: remove `"baseUrl": "."` (keep `paths`, which TS 5+ resolves relative to the tsconfig).
- #15: add a section to `docs/FRONTEND_AND_API_ARCHITECTURE.md` on cookie and CORS needs: SameSite=None; Secure; CORS `credentials: true` on the API domain. Optionally add a `rewrites()` proxy for `/api/*` → `API_BACKEND_URL`, so cookies stay first-party. If you adopt the proxy, the 410 catch-all route must go.

## Phase 6 — Tests and CI (#16)
- Add tests listed in the phases above, plus smoke render tests for `DashboardLayout`, `LockScreen` and one data-table page.
- Add a GitHub Actions workflow: `npm ci` → typecheck → lint → test → i18n:check → `npm audit --omit=dev --audit-level=high`, and a build run with `NODE_ENV=production NEXT_PUBLIC_DEMO_MODE=true` that is **expected to fail**, to protect the guard from 1.2.

---

## Open decisions for you
1. Should a public demo deployment still be possible? (This decides whether `ALLOW_DEMO_BUILD` exists, or demo mode is dev-only.)
2. Verify the JWT at the edge (needs `JWT_SECRET` shared with the frontend), or keep the presence-only check?
3. Same-origin `/api` rewrite proxy, or direct cross-site API calls?

## Verification (end-to-end)
- Run all checks above, then `npm run build` with production env vars.
- Manual check with Playwright on `npm run dev`:
  - With a locked user, the lock screen shows.
  - A bogus `token` cookie still can't load data.
  - `/zz/dashboard` → `/en/auth?next=...`.
  - The console shows no CSP violations.
  - Demo login with a wrong password fails while the backend is up.
