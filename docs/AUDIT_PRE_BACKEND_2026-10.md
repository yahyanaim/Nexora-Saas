# Nexora ERP — Code review and audit before the backend (October 2026)

_Supersedes `docs/AUDIT_2026-10.md` and `docs/CODE_REVIEW_AND_AUDIT.md`._

## Scope and method

- Whole front end at `main` (611 TypeScript files, about 76,000 lines), with the focus on what the backend (Phase 7) will take over: business rules, permissions, money, data and identity.
- Checks run: `tsc --noEmit`, `eslint` (zero warnings), `vitest` (**69 files, 492 tests, all passing**), `npm audit --omit=dev`, i18n sync, and targeted browser tests with Playwright (demo admin and the employee Lina).
- Every finding below was checked in the code. The ones marked **(verified)** were also reproduced in the browser or with a script.

## Summary

The codebase is in good shape for a front end: strict types (no `any`), clean lint, a clear seam for the backend, and the business logic is in pure, tested functions. Most findings from the previous audit are fixed.

The main risks are in **what the front end claims to enforce but doesn't**: pages open by URL whatever the role, approval rules aren't checked where the data changes, and money uses floating point. These must be fixed in the shared logic **before** it is reused on the server, or the backend will inherit them.

| Severity | Count |
| :--- | :--- |
| Critical | 2 |
| High | 4 |
| Medium | 8 |
| Low | 4 |

---

## Critical

### C1. Any page opens by URL, whatever the role (verified)
The menu hides pages the role can't use (`use-dashboard-nav.tsx` filters by `permission`), but no route or page checks the permission. Signed in as **Lina (Employee)**, typing these URLs shows:

- `/dashboard/profitability`: every project's revenue, labour cost, profit and margin.
- `/dashboard/settings`: the company settings, editable.
- `/dashboard/client-invoices` and `/dashboard/employees`: the full lists.

`profitability-page.tsx`, `receivables-page.tsx` and `settings-page.tsx` contain no `can()` check at all. The page header is blank because the page isn't in the person's menu, which is a visible symptom.

**Fix (front end, now):** one guard in the dashboard layout that maps each route to the permission already declared in the nav, and shows a "no access" page (and later a 403 from the server). Add a Playwright test per role that opens every route.
**Backend:** every endpoint checks the permission from the session. The front-end guard is only for usability.

### C2. Approval rules are not enforced where the data changes
- **Self-approval.** The documentation says "nobody can approve their own hours, leave or expenses – the system refuses it". `assertNotSelfApproval` exists in `lib/workforce/approvals.ts` but **nothing calls it**. `approveTimeEntriesApi`, `rejectTimeEntriesApi`, `reviewExpenseApi` and `decideLeaveApi` don't even receive the approver. Only the screens hide the button (and the inbox filters out your own items).
- **Approver not recorded.** Approved hours, expenses and leave keep `approvedAt` but no `approvedBy`, so there is no proof of who approved.
- **Approval modes are ignored.** Settings → Approvals lets the admin pick *no approval*, *one step* or *two steps above an amount*, per subject. No code reads these rules (`TWO_STEP` and `secondStepAbove` appear only in the settings page and the seed), so the setting has no effect.

**Fix:** put the rules in one pure function, e.g. `approvalDecision(rule, request, approver)`, that returns *allowed / needs second step / refused (own request)*. Call it from every approve and decide function with the approver, and store `approvedBy` (and `secondApprovedBy`). The server then reuses the same function.

---

## High

### H1. Money is calculated in floating point, with the rounding copied in 6 files (verified)
`roundMoney` / `round` / `r2` = `Math.round(n * 100) / 100` appears in `billing.ts`, `analytics.ts`, `invoice-builders.ts`, `profitability.ts`, `quotes.ts` and `reports.ts`. Floating point gives `round(1.005) = 1.00` instead of `1.01` (checked with Node). VAT and totals can then be off by a cent between the screen, the PDF and the reports. Moroccan VAT returns and client disputes are sensitive to cents.

**Fix:** one `money.ts` module that rounds half-up on scaled integers, used everywhere. On the server, store amounts as integer minor units (cents) or `NUMERIC(14,2)`, never `float`.

### H2. Who is acting comes from the caller, not from a session
- `submitSelfReviewApi`, `submitManagerReviewApi`, `acknowledgeReviewApi` and `deleteReviewApi` take a `viewer` argument, and `listSavedReportsApi` / `deleteSavedReportApi` take a `viewerId`. Most other functions (approvals, invoices, settings) take no actor at all.
- The audit log's actor is a module-level variable set from the browser (`setAuditActor`). Entries are stored in the browser, capped at 500, and can be edited or removed by anyone with DevTools. `ipAddress` is "—".

This is acceptable for a demo but **must not be copied to the server**. **Backend:** the actor always comes from the authenticated session; the API never accepts `viewer` or `approverId` from the request body. The audit log is written by the server only, append-only, with IP and user agent.

### H3. Sensitive fields are sent to everyone and only hidden on screen
`useEmployees()` returns every employee with `hourlyCost`, `billableRate` and `rateHistory` to any signed-in user; profiles hide them when the role can't see costs. The same applies to invoices and project profit, which are computed in the browser from full data.

**Backend:** shape each response per role (no cost fields without `costs:read`). Compute profit, KPIs and reports on the server, and send only the result the role may see.

### H4. Saving can fail silently
`writeCollection` (`lib/workforce/demo-store.ts`) catches storage errors (quota full, private mode) and does nothing. The comment says "keep working in memory", but there is no in-memory copy, so the change is lost. The caller still shows a success toast.

**Fix (demo):** rethrow a clear error so the mutation shows a failure. **Backend:** this disappears, but the same principle applies: never show success before the server confirms.

---

## Medium

| # | Finding | Recommendation |
| :--- | :--- | :--- |
| M1 | **Error messages are English only.** The API and logic layers throw 206 hard-coded English messages, and toasts show them as-is in all 9 languages (Arabic, Chinese…). | Throw error **codes** (e.g. `PERIOD_LOCKED`) with values, and translate them in the UI. The server returns the same codes. |
| M2 | **Dates use the browser's time zone.** `todayIso()` uses local time and ignores the company `timeZone` setting, so "overdue", "today" and period locks can differ by a day between a user in Casablanca and one travelling. | Use one `companyToday(timeZone)`. On the server, store timestamps in UTC and work out business days in the company time zone. |
| M3 | **Everything is loaded and computed in the browser.** Every page loads full collections; the top-bar inbox subscribes to 8 collections on **every** page and recomputes on each render (no memo); KPIs, analytics and reports scan every time entry. | For now, memoize the inbox. Backend: paginated lists, filtered queries, server-side aggregates for KPIs, reports and the inbox (one `GET /inbox`). |
| M4 | **No concurrency control.** Records have `updatedAt` but no version check, and invoice numbering is "gapless" only because one browser does it. | Backend: issue numbers in a transaction with a per-workspace sequence row locked `FOR UPDATE`; optimistic locking (`version` or `If-Match`) on updates. |
| M5 | **Leftover SaaS-starter code.** About 3,500 lines of platform demo data (`src/lib/demo-data/`) and pages (users, staffs, banned users, transactions, taxes, developer, support reports) sit next to the ERP. | Move platform-operator pages behind one module or remove them; it reduces bundle size and confusion before the API contract is written. |
| M6 | **Large components.** `settings-page.tsx` (627 lines), `client-form.tsx` (583), `quotes-page.tsx` (524), `invoice-sheet.tsx` (510), `timesheet-page.tsx` (491). | Split by section (each settings tab and form section in its own file) when they are next changed. |
| M7 | **Short demo IDs.** `createId` keeps 8 hex characters (32 bits); there is about a 1% chance of a collision around 9,000 records in one collection, which time entries can reach. | Use the full UUID in the demo; the server generates UUIDs. |
| M8 | **One dependency vulnerability.** `npm audit` reports 1 high (`source-map-js`), with a fix available. | `npm audit fix`; add `npm audit --omit=dev` to CI. |

## Low

- **L1.** 19 `as unknown as` casts and 4 `react-hooks/exhaustive-deps` disables. Each should carry a comment or be removed.
- **L2.** Tests are strong on business logic (27 test files in `lib/workforce`, 15 in `lib/api`), but there are only 2 component tests and no end-to-end test of role access. Add role-based Playwright tests (they would have caught C1).
- **L3.** On the Leave page, employees still see the "off today" and "off this week" counts for the whole company. These are counts only, not names; decide whether that is wanted.
- **L4.** A page opened outside the person's menu shows an empty header (a symptom of C1).

---

## Status of the previous audit (October 2026)

| # | Previous finding | Status |
| :--- | :--- | :--- |
| 1 | Passcode lock never rendered | ✅ Fixed (`auth-provider.tsx` sets `isPasscodeLocked`) |
| 2 | Demo-mode checks bypassing the guard; any login accepted | ✅ Fixed (all go through `isDemoMode()`; only known demo users) |
| 3 | `isBackendUnreachable` too broad | ✅ Fixed (no response, or 502/503/504 only) |
| 4 | Locale regex in the edge guard | ✅ Fixed (known locales only) |
| 5 | Weak CSP | ✅ Fixed (per-request nonce in `proxy.ts`, with a test) |
| 6 | `isAuthRoute` with `includes` | ✅ Fixed (exact path set) |
| 7 | `innerHTML` in the file dialog | ✅ Fixed (test asserts no `<script`) |
| 11 | `pathname.includes("/auth")` | ✅ Fixed |
| 13 | Package name and scratch files | ✅ Fixed (`nexora-saas`) |
| 14 | Dependency bloat | ⏳ Open (two UI kits remain), merged into M5 |
| 16 | Few tests | ⏳ Improved (12 → 69 files, 492 tests); see L2 |

---

## What is good

- **The backend seam is clean.** 159 API functions in 39 modules are the only callers of storage; pages never touch it. Switching to HTTP changes these files, not the pages.
- **Business logic is pure and tested.** 29 files and about 3,800 lines in `lib/workforce` (billing, approvals, leave balances, reviews, KPIs, inbox, scheduling) with no React or storage, so they can run unchanged in a Node backend.
- **Type and lint hygiene.** No `any`, zero lint warnings, few lint disables.
- **Security basics.** Nonce-based CSP, strict headers, HttpOnly cookie design, CSV-injection protection, escaped PDFs, demo mode refused in production builds.
- **i18n.** 9 locales kept in sync by a script, RTL support.

---

## Recommended order before and during the backend

**Before the backend (front end, short):**
1. **C1:** route guard from the nav permissions, plus role-access Playwright tests.
2. **C2:** `approvalDecision()` used by every approve and decide function, with `approvedBy` stored.
3. **H1:** one `money.ts` with exact rounding; replace the 6 copies.
4. **H4** and **M1:** fail loudly on save errors; switch thrown messages to error codes.

These four change shared logic the server will reuse, so fixing them first avoids fixing them twice.

**Backend design rules (Phase 7):**
- Identity, permissions and the audit log are server-only (H2).
- Responses are shaped per role (H3).
- Money is stored as integers or NUMERIC (H1).
- Invoice numbering is transactional, and updates use optimistic locking (M4).
- Timestamps are UTC and business dates use the company time zone (M2).
- Lists are paginated and aggregates are computed on the server (M3).
- Errors are returned as codes (M1).
