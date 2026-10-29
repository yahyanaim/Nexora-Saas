# Nexora: latest audit

_This is the only audit file. Each new audit, code review or report **replaces** this file, and its screenshots replace the ones in `docs/screenshots/`. Older versions stay in the git history._

**Last update:** 29 October 2026, after the audit fixes A1–A4. **Scope:** the whole front end on `main` (security in the browser, connections between features, code quality, accessibility, tests). The API contract the server follows is `docs/API_CONTRACT.md`.

## 1. Summary

The October full audit found **2 high, 9 medium and 12 low** items. All the front-end items are now fixed (A1–A4). What is left belongs to the server and is written into the API contract and the backend cahier des charges.

| Area | Grade | In one line |
|---|---|---|
| Browser security | 🟢 Good | Nonce CSP, strict headers, safe redirects, http/https-only web addresses, protected exports, idle lock. |
| Server security (to build) | 🟡 Specified | CSRF, files, 2FA, sessions, plan limits: decided (D1–D8) and in the API contract; built with the backend. |
| Connections between features | 🟢 Good | Project delete, landing page, old links, mentions, export, search, bell and merge are all connected. |
| Code quality | 🟢 Good | Lint clean with 0 warnings, no unused texts, unused code and packages removed, logging through `logger`. |
| Accessibility | 🟢 Good | axe: 0 critical or serious findings on 23 console pages and 21 company pages, in CI. |
| Tests | 🟢 Good | 143 files, 869 tests; money screens (invoice, payment, credit note) and PDF snapshots now covered. |

## 2. Status of every finding

| # | Level | Finding | Status |
|---|---|---|---|
| G-01 | High | A project with hours and invoices could be deleted | ✅ A1: refused with `err_projectHasHistory`, "Close project" offered |
| G-02 | High | Employees landed on "No access" after signing in | ✅ A1: each role goes to the first page it can open |
| G-03 | Medium | Old `/billing` links went to a Nexora-only page | ✅ A1 |
| G-04 | Medium | Task @mentions never reached the bell | ✅ A1 |
| G-05 | Medium | Company export missed 6 collections | ✅ A1, with a guard test |
| G-06 | Medium | Plan limits not enforced | ⏳ Server: `403 upgrade_required`, `409 err_seatsFull` (decision D4, contract) |
| G-07 | Low | Ctrl+K did not cover every record | ✅ A4: 9 more kinds |
| G-08 | Low | Some events never reached the bell | ✅ A4: stale deals, expiring quotes, bills due, meeting action items |
| G-09 | Low | Functions with no screen | ✅ A4: delete template, personal data (export and deletion). Notification preferences come with server notifications (D6) |
| G-10 | Low | Client merge missed bank matches and saved reports | ✅ A4 |
| S-01 | Medium | Web-address fields accepted any scheme | ✅ A2: http/https only, `err_badUrl` |
| S-02 | Medium | No CSRF approach | ⏳ Server: same origin, `SameSite=Lax`, `X-XSRF-TOKEN`, `Origin` check (D1) |
| S-03 | Medium | File uploads had no allow-list | ⏳ Server: one upload contract, type allow-list, size limits (D7), scan, signed links |
| S-04 | Medium | Sensitive actions missing from the audit log | ✅ A2: 10 new audit entries |
| S-05 | Low | No idle lock or sign-out | ✅ A2: 30 min (company), 15 min (console) (D3) |
| S-06 | Low | Two 2FA mechanisms, the real one not wired | ⏳ Server: TOTP + recovery codes, required for staff, owners, admins, accountants (D2) |
| S-07 | Low | Revoked sessions not pushed to the browser | ⏳ Server: socket event; `useAuthSocket` kept for it |
| S-08 | Info | Demo mode must stay off in production | ✅ Blocked in production builds by a CI check |
| S-09 | Info | Dev dependency vulnerabilities | ✅ A3: `npm audit fix` |
| C-01 | Medium | Unused code and texts | ✅ A3: 47 files, ~85 exports, 3 packages, 454 texts removed |
| C-02 | Low | Large files | ⏳ Split while wiring each module to the server |
| C-03 | Low | Settings labels not linked; CI axe only on console | ✅ A2 |
| C-04 | Low | Hard-coded English | ✅ A3, plus A4: form messages in the app's own words (no "string" in Arabic) |
| C-05 | Low | Few screen and PDF tests | ✅ A4 |
| C-06 | Low | Direct `console.*` calls | ✅ A3 |
| — | — | Unknown address answered 200 | ✅ A4: real 404 in the address's language |
| H2, H3 | — | Who acts comes from the session; sensitive fields hidden by role | ⏳ Server by design |

## 3. What the server must still do

S-02, S-03, S-06, S-07, G-06, H2, H3, and C-02 while wiring. Each one has its decision (D1–D8), its contract section in `docs/API_CONTRACT.md`, and its requirement in the backend cahier des charges v2.1 (`docs/CAHIER_DES_CHARGES.md` in `yahyanaim/Nexora-Backend`, Annex C maps every finding).

## 4. Screenshots

The latest screenshots are in `docs/screenshots/` (from A4):

| File | Shows |
|---|---|
| `1-404-ar.jpg` | Unknown address: real 404, in Arabic |
| `2-search-contact.jpg`, `3-search-pages.jpg` | Ctrl+K finds contacts and project pages |
| `4-pages-tab.jpg` | A page result opens the project's Pages tab |
| `5-template-delete.jpg` | Deleting a project template |
| `6-personal-data.jpg` | Profile: your personal data, deletion scheduled |
| `7-zod-ar.jpg` | Form messages in Arabic, in the app's wording |
| `8-bell-action-item.jpg` | Bell: a meeting action item that mentions you |
