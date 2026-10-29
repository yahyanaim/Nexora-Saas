# Nexora: plan to fix the audit findings, update the API contract and secure the platform

_October 2026. Plan only: nothing here is implemented yet. Based on `docs/AUDIT.md` (finding numbers S-, G-, C-) and `docs/API_CONTRACT.md`. The security part follows OWASP Top 10 (2025) and current practice for authentication, sessions and files._

## Overview

| Part | What | Size | When |
|---|---|---|---|
| **A** | Front-end fixes, in 4 small PRs | A1–A2 about 1–2 days each; A3–A4 smaller | Before the backend starts (A1, A2), then alongside it (A3, A4) |
| **B** | API contract update (`API_CONTRACT.md`) | One documentation PR | ✅ Done: contract v2, 362 of 362 API functions mapped, guard test `api-contract.test.ts` |
| **C** | Security plan for the backend, by OWASP area | Written into the contract (B) and built with each backend phase | During the backend |
| **D** | Decisions | 8 decisions, made 28 October 2026 | Done |

Order: **A1 ✅ → B ✅ → A2 → cahier des charges v2.1 (from `docs/CDC_BACKEND_GAP_REPORT_2026-10.md`) → backend phase 0 with C → A3 / A4**. B was moved before A2 (29 October) because it is what the backend team needs; A2 only touches the front end. A1 also translated the confirm dialogs' Cancel/Confirm buttons (found while building it).

Each PR follows the usual routine: tests, `tsc`, lint, build, browser check with screenshots, docs and README row, then a PR that waits for your "merge it".

---

## Part A: front-end fixes

### PR A1: connections between features (the 2 high findings first)

| # | Finding | Change | Done when |
|---|---|---|---|
| A1.1 | **G-01** project delete | `deleteProjectApi` first checks the project's history: time entries, client invoices, quotes, expenses, change orders, supplier bills. If any exist, it refuses with *"This project has hours or invoices. Close it instead, so its history stays."* (new code `err_projectHasHistory`, 9 languages). The delete dialog says why and offers **Close project**. When the delete is allowed, it also removes the project's pages, task comments, attachments, activity and saved task views. Client requests linked to the project are unlinked, not deleted. An audit entry *Project deleted* is written. | Test: *Orbit* (92 hours) is refused, nothing changes. Test: an empty project is deleted with all its children. Browser: dialog shows the reason. |
| A1.2 | **G-02** landing page | New `homePathFor(user)` in `lib/permissions/routes.ts`: the first page the role can open, in this order: overview → my-work → timesheets → projects. Nexora staff go to `/dashboard/console`, client contacts to the portal. Used by `resolveAfterLoginPath` when there is no `?next=`, by `/dashboard`, and by the **Back to my dashboard** button on the "No access" screen. | Test per role (admin, manager, accountant, employee, client, Nexora staff). Browser: Lina lands on My work. |
| A1.3 | **G-03** old links | `/billing`, `/billing/success` and `/subscriptions` go to `/dashboard/subscription` (the company's own subscription). The Nexora team keeps reaching the console list from its menu. | Browser: Lina and the admin open `/billing` and see their own subscription. |
| A1.4 | **G-04** task mentions | The bell gets a **"mentioned in a task"** item: comments from the last 14 days whose `mentionIds` contain the person, excluding their own comments. It links to the project with `?task=`. The texts are added in 9 languages. A helper `listMentionsForApi(ws, employeeId, since)` keeps the bell from loading every comment. | Test in `inbox.test.ts`. Browser: Karim is mentioned on a task and sees it in the bell. |
| A1.5 | **G-05** company export | Add `client-files`, `client-requests`, `cycle-store`, `project-pages`, `task-views` and `table-views` to `tenant-modules.ts`. A guard test reads every `src/lib/api/*.ts` that calls `createCollection` and fails unless the module is listed or marked as platform-only. | Guard test passes. An export of *Atlas* contains the 6 collections. |

### PR A2: security in the browser, audit log, accessibility

| # | Finding | Change | Done when |
|---|---|---|---|
| A2.1 | **S-01** web addresses | Move `isWebUrl` to `lib/utils/url.ts`. Use it in the client form (website), the contact form (LinkedIn) and the CSV/Excel import: a bad address is shown as a yellow cell with the reason, under the new code `err_badUrl`. Add a `safeHref()` used wherever a stored address becomes a link (client page, details panel, contact sections, contacts page), so old bad data cannot become a link. | Tests: `javascript:`, `data:` and `ftp:` are refused; `https://…` is accepted; import flags the cell. |
| A2.2 | **S-04** audit log | New audit entries, with their labels in 9 languages: `settings.data_exported`, `settings.data_deleted`, `client.file_added`, `client.file_removed`, `project.deleted`, `task.deleted`, `task.restored`, `task.purged`, `template.saved`, `template.deleted`. | Test per action. The audit log page shows them. |
| A2.3 | **C-03** Settings labels | The `Field` helper in `settings-page.tsx` links its label to its input (`useId` + `htmlFor`/`id`). Add the 21 main company pages to the axe job in CI next to the console pages (`npm run a11y:erp`). | axe: 0 blocking findings on the 21 pages, locally and in CI. |
| A2.4 | **S-05** idle lock | Decision D3: after **30 min** without a click, key press or scroll in any tab (**15 min** on the console), the passcode lock screen shows when a passcode is set, otherwise the user is signed out with a message. `lib/auth/idle.ts` + `useIdleLock`. | Tests for both outcomes and both limits. The server applies the same limits (Part C). |

### PR A3: clean-up (alongside the backend)

| # | Finding | Change |
|---|---|---|
| A3.1 | **C-01** unused code | Remove the unused exports listed by the scan (old demo-data helpers, unused hooks, utils, types, 2 PDF helpers, unused UI-kit parts). Keep whatever decision D6 keeps. |
| A3.2 | **C-01** unused texts | A script lists the about 460 unused texts. Remove them from the 9 files after a manual check of the texts built dynamically. |
| A3.3 | **S-09** dev dependencies | `npm audit fix`, then the full check suite. |
| A3.4 | **C-04** texts | Move the hard-coded English into the 9 language files: auth pages and their toasts ("Welcome back!", "Continue"), register messages, developer cards, UI-kit screen-reader labels, and the dashboard's 404 and error pages (which should also link to `/dashboard`, the person's home). The password minimum follows decision D5. |
| A3.5 | **C-06** logging | The 19 direct `console.*` calls go through `logger`. |

**Status (A3 done):** 47 unused files (20 of them the unused Carbon UI kit), about 85 unused exports in the files that stay, and 3 unused packages (`@carbon/react`, `embla-carousel-react`, `canvas-confetti`) removed; kept for the backend: `useAuthSocket` (S-07), `useUsage` (G-06), `useTerminateSession` (my devices, C7), `useNotificationSettings` (D6). 454 unused texts removed and `npm run i18n:unused` keeps it at zero in CI. Dev-tool vulnerabilities 20 → 3 low (inside the `shadcn` CLI, where npm's only fix is a downgrade); production 0. Auth pages, developer page, error and 404 pages, UI-kit screen-reader words and Zod's own messages follow the reader's language; any unknown address now shows the translated 404 (`[...rest]` routes). Passwords: 12 characters, no forced character mix (`lib/auth/password.ts`). `console.*` is blocked by lint outside `logger`. Found and fixed on the way: forgot-password and reset-password reported success on any server error and always showed the demo helpers; they now do so only in demo mode. The error pages no longer show the error message and stack trace in production.

### PR A4: smaller gaps (alongside the backend)

| # | Finding | Change |
|---|---|---|
| A4.1 | **G-07** search | Ctrl+K also finds contacts, leads, deals, suppliers, supplier bills, expenses, project pages, follow-ups and requests. Each kind is loaded only when the palette opens. |
| A4.2 | **G-08** bell | New items: deals gone stale (for their owner), quotes expiring within 3 days, supplier bills due within 7 days, action items given to someone from a meeting page. |
| A4.3 | **G-09** functions without a screen | A **Delete template** button on project templates. Personal data export and account deletion, and notification preferences, depend on decision D6. |
| A4.4 | **G-10** client merge | The merge also loads `bank-import-api` and `saved-reports-api`, so their records move too. |
| A4.5 | **C-05** tests | Screen tests for issuing an invoice, recording a payment and creating a credit note. One PDF snapshot test per document type. |

**Status (A4 done):** Ctrl+K also finds leads, contacts, deals, follow-ups, project pages, client requests, suppliers, supplier bills and expenses, each for the roles allowed to see it (expenses: one's own unless one approves them). The bell adds deals that stopped moving (their owner), sent quotes expiring within 3 days, approved supplier bills due within 7 days, and meeting action items that @mention the person. Project templates can be deleted from the new-project form. Profile → *Your personal data*: download one's own data and delete the account after 14 days (cancellable), per D6; notification preferences stay for later (D6). A client merge also moves bank-import matches and the client filter of saved reports and views. Screen tests for issuing an invoice, recording a payment and making a credit note, and one content snapshot per document type (client invoice modern and classic, credit note, draft, quote classic and modern, Nexora invoice, credit note and pro-forma, subscription invoice). Follow-ups from A3: Zod messages use the app's own wording in the 9 languages (no "string"/"number" left), and unknown addresses get a real 404 status from the proxy, in the visitor's language (`lib/routing/app-routes.ts`, kept equal to the pages by a test).

Left for the backend (no front-end PR): **S-02, S-03, S-06, S-07, G-06, C-02**. They are covered in Parts B and C.

---

## Part B: API contract update (`docs/API_CONTRACT.md`)

The contract was written in PR #121. **Everything built after it is missing:** CRM 8, 9 and 10, Project extras and P5. The audit also adds new rules. One documentation PR, organised by the contract's own sections.

### B1. §2 Conventions: new rows

| Topic | What to write |
|---|---|
| **CSRF** (S-02) | The method from decision D1. Recommended: same origin through `API_PROXY_TARGET`, cookies `SameSite=Lax`, plus a double-submit token. The server sets a readable `XSRF-TOKEN` cookie, and the app sends it back as an `X-XSRF-TOKEN` header on every `POST/PUT/PATCH/DELETE` (axios does this with `xsrfCookieName`/`xsrfHeaderName`). Missing or wrong → `403 { code: "err_csrf" }`. |
| **CORS** | Only when the API is on another domain: an exact list of allowed origins, `credentials: true`, never `*`. |
| **Cookies** | Names, flags (`HttpOnly; Secure; SameSite=Lax; Path=/`), lifetimes from decision D3. |
| **Rate limits** | `429 { code: "err_tooManyRequests" }` with a `Retry-After` header (new code, 9 languages). Limits are in C8. |
| **Request id** | Every response has an `X-Request-Id`. The app shows it in the error toast so support can find the log. |
| **Web addresses** | `website`, `linkedin`, task links and webhook URLs: http/https only, otherwise `400 err_badUrl`. |
| **Versioning** | Paths under `/v1`. |
| **New error codes** | `err_projectHasHistory`, `err_badUrl`, `err_csrf`, `err_tooManyRequests`, `err_seatsFull`, `err_fileType`, `err_fileTooBig`, `err_fileInfected`, `err_passwordTooShort`, `err_passwordBreached`, `err_twoFactorRequired`, `err_twoFactorInvalid`. Each is added to `error-catalog.ts` with 9 translations in the same PR. |

### B2. §4.1 Identity: sign-in, 2FA, sessions

| Method + path | Notes |
|---|---|
| `POST /auth/login` | When 2FA is on: `200 { twoFactorRequired: true, challengeId }`, and no session yet. |
| `POST /auth/2fa/verify` | `{ challengeId, code }` (code from the app or a recovery code) → session. |
| `POST /auth/2fa/setup` | → `{ otpauthUrl }` (shown as a QR code). The secret is never returned again. |
| `POST /auth/2fa/enable` | `{ code }` → `{ recoveryCodes: string[10] }`, shown once. |
| `POST /auth/2fa/disable` | `{ password, code }`. Not allowed for roles that must use 2FA (decision D2). |
| `POST /auth/2fa/recovery-codes` | Makes new codes; the old ones stop working. |
| `GET /me/sessions`, `DELETE /me/sessions/:id`, `DELETE /me/sessions` (all others) | The person's own devices. A password change ends every other session. |
| Password rules | Length from decision D5, checked against known breached passwords → `err_passwordTooShort` / `err_passwordBreached`. Reset links work once and last 30 minutes. The same answer is given whether the e-mail exists or not. |
| Socket | `session.revoked` closes the tab's session at once (S-07). |

### B3. §9.3 Files: one upload contract (S-03)

| Item | What to write |
|---|---|
| Upload | `POST {ws}/uploads` (multipart: `file`, `kind`) → `{ id, name, size, type, scan: "pending" \| "clean" \| "infected" }` |
| Kinds and limits | Table per kind: task attachment, client file, employee document, expense receipt, company logo, avatar. Each has its allowed types and maximum size (decision D7). |
| Download | `GET {ws}/files/:id` → `302` to a signed link that lasts 5 minutes, with `Content-Disposition: attachment`, from a separate download domain. A file waiting for the scan or found infected cannot be downloaded. |
| Delete | `DELETE {ws}/files/:id` → `204`. It is written in the audit log. |
| Records | `TaskAttachment`, `ClientFile`, `EmployeeDocument`, expense receipts and the company logo keep a `fileId` instead of `dataUrl` or a bare file name. |
| Errors | `err_fileType`, `err_fileTooBig`, `err_fileInfected`, `err_storageFull`. |

### B4. §5.2 CRM: what CRM 8, 9 and 10 added

| Method + path | Replaces |
|---|---|
| `PUT {ws}/settings/pipeline` `{ stages, staleDays, moves }` | `savePipelineApi`, `updatePipelineApi`. Deals of a removed stage are moved in the same transaction. |
| Deal fields `stageSince`, stale flag | `deals.ts` (the server sets `stageSince` when the stage changes) |
| `POST {ws}/deals/:id/project` | `createProjectFromDealApi` |
| `GET {ws}/clients/:id/history` | `listClientHistoryApi`. The server writes one line per changed field on every update. |
| `DELETE {ws}/clients/:id` (soft), `GET {ws}/clients?deleted=true`, `POST {ws}/clients/:id/restore`, `DELETE {ws}/clients/:id?purge=true` | `deleteClientApi`, `listDeletedClientsApi`, `restoreClientApi`, `purgeClientApi`. A daily job purges after 30 days (add to §8). |
| `POST {ws}/clients/:id/merge` `{ otherId, picks }` | `mergeClientsApi`. One transaction moves every linked record. |
| `GET / POST / DELETE {ws}/table-views?list=` | `table-views-api.ts` (views shared with the team) |
| `GET / POST {ws}/clients/:id/files`, `PATCH / DELETE {ws}/client-files/:id` | `client-files-api.ts`, using B3 for the file itself |
| Note `mentionIds` | The server finds the @mentions and creates notifications (B7) |

### B5. §5.3 Projects: what Project extras and P5 added

| Method + path | Replaces |
|---|---|
| `DELETE {ws}/projects/:id` | Now refuses with `409 err_projectHasHistory` and lists what it deletes (A1.1) |
| Task `repeat { every, interval, until }`, `nextTaskId` | When a repeating task is marked done, the server creates the next one exactly once (idempotent) |
| `DELETE {ws}/tasks/:id` (soft), `GET {ws}/tasks?deleted=true&projectId=`, `POST {ws}/tasks/:id/restore`, `DELETE {ws}/tasks/:id?purge=true` | Task bin; a daily job purges after 30 days (add to §8) |
| `?archived=true` on tasks | Tasks done more than 30 days ago are hidden by default |
| `GET / POST {ws}/projects/:id/pages`, `PATCH / DELETE {ws}/project-pages/:id` | `project-pages-api.ts` (wiki and meeting notes; maximum length) |
| `POST {ws}/project-pages/:id/actions` `{ line }` | Turns an action item into a task and links the line to it |
| Comment `mentionIds` | Notifications (B7) |

### B6. §4.3 and §7.4 Plans and seats (G-06)

| Item | What to write |
|---|---|
| Plan features | A fixed list of feature keys (e.g. `einvoice`, `suppliers`, `deals`, `forecast`, `multi_workspace`, `sso`), mapped to each plan (decision D4). |
| `GET /me/workspaces` | Each workspace also returns `plan`, `features[]`, `seats { used, limit }`. The menu hides what the plan doesn't include. |
| Refusal | `403 { code: "upgrade_required", feature }` (the app already opens the upgrade prompt). |
| Seats | Granting access past the limit → `409 err_seatsFull`. |

### B7. §5.6 Notifications: event list

`GET {ws}/notifications` returns typed events. The full list is: today's bell items, plus `task.mention`, `deal.stale`, `quote.expiring`, `supplier_bill.due` and `page.action_assigned` (G-04, G-08). Later, on the socket: `notification.created`, `session.revoked`.

### B8. §5.6 and §7.3 Audit events (S-04, C7)

A complete list of the actions the server must log, with `actionKey`, actor, target and before/after. It contains the A2.2 keys, sign-ins (success and failure), refused permissions, exports, imports, deletes, settings changes, money writes and support access. The audit table is append-only.

### B9. §8 Jobs, §9.5 checklist, §11 appendix

- Add jobs: purge the client bin and the task bin after 30 days, and run the file scan queue.
- Update the §9.5 checklist.
- Add the new modules to the §11 appendix: `table-views-api`, `client-files-api`, `project-pages-api`, `me-api`.

---

## Part C: security plan for the backend (OWASP Top 10, 2025)

Each item says what to build, how to check it, and which backend phase (§10 of the contract) it belongs to.

### C1. Access control and company isolation (OWASP A01, the most common failure)

| What | How to check | Phase |
|---|---|---|
| Every request resolves **session → user → membership of `{ws}`**. The workspace in the path is never trusted alone. Every query is filtered by that workspace id. | Automated cross-company suite: every endpoint is called with another company's ids and must answer `404`. | 0 |
| A second wall in the database: PostgreSQL row-level security on `workspace_id`. | Test with a session variable set to the wrong company. | 0 |
| Deny by default: one rights table generated from `can.ts` and `routes.ts`, the same on both sides. | Test per role and endpoint. | 0–1 |
| Rules per record: an employee edits only their own timesheets and expenses; no self-approval (H2); a client contact sees only their own client in the portal. | Tests from `approvals.ts` and the portal tests. | 4–6 |
| Rules per field (H3): cost rates, salaries and margins are **left out of the response** for roles that may not see them. | Snapshot test of responses per role. | 1 |
| Nexora staff: 4-eyes rules from `console-roles.ts`; entering a company only through a support session that has consent, a time limit and an audit trail. | Tests from `platform-support-api`. | 8 |

### C2. Authentication (A07)

| What | Detail |
|---|---|
| Password storage | Argon2id (64 MB memory, 3 passes); never stored or logged in clear. |
| Password rules | NIST 2025: minimum length (D5, 12 recommended), no forced mixes, breached-password check, no forced periodic change. |
| Brute force | 10 attempts per 15 minutes per IP **and** per account, then growing delays; alert on many failures. |
| 2FA | TOTP plus 10 recovery codes. Required for Nexora staff and company owners/admins (D2), optional for others. |
| Sessions | Server-side store (e.g. Redis), new session id on sign-in and on privilege change, idle and absolute timeouts (D3), refresh-token rotation with reuse detection, every other session ended on password change, "my devices" list. |
| E-mails | Verification and reset links are single-use and short-lived; the same answer whether the e-mail exists or not. |

### C3. CSRF, CORS and cookies (A01/A05)

Same origin through `API_PROXY_TARGET` (this removes CORS and third-party-cookie problems), plus `SameSite=Lax`, plus the `X-XSRF-TOKEN` double-submit and an `Origin` check on every write. If the API stays on another domain: exact allowed origins and `credentials: true`.

### C4. Input validation and injection (A03)

- One validation schema per endpoint, built from the types in `src/types/*.ts` (the contract), with length limits on every text field.
- Parameterised queries or an ORM only; no SQL built from strings.
- Web addresses http/https only. Formatted text is stored as text and rendered safely, as the app already does.
- CSV/Excel import parsed on the server with row and size limits. Exports neutralise `= + - @` like the front end does.
- PDFs and e-invoice XML built on the server with escaping, matching the existing tested front-end code.

### C5. Files (S-03)

- Check the real file type from its content, not its extension. SVG and HTML are refused.
- Virus scan (e.g. ClamAV) before the file can be downloaded.
- Private storage bucket and 5-minute signed links from a separate domain.
- Images (logos, avatars) are re-encoded and their EXIF data removed.
- Quotas per plan (`err_storageFull`).

### C6. Sensitive data and encryption (A02)

- TLS 1.2 or higher (1.3 preferred); HSTS is already sent.
- Database disks and backups encrypted.
- Extra field encryption for bank details (RIB/IBAN), national ID (CIN) and salaries.
- Secrets in a secrets manager, rotated every 90 days, a different set per environment.
- Moroccan law 09-08: CNDP declaration, a list of the personal data kept and why, the right to access and delete (D6).

### C7. Logging, monitoring, audit (A09)

- Log sign-ins (success and failure), refused permissions, exports, imports, deletes, settings changes, money writes and support access (list in B8).
- The audit table is append-only (optionally each row carries the hash of the previous one). Retention follows the existing rules.
- Central logs with the request id, and no passwords, tokens or full personal data in them.
- Alerts on: many failed sign-ins, an export by an unusual user, a spike of cross-company `404`s, a burst of `429`s.

### C8. Rate limits and abuse

| Kind | Limit (to confirm) |
|---|---|
| Sign-in, password reset, 2FA | 10 per 15 min per IP and per account |
| Normal API use | 1,000 per 15 min per user |
| Exports, imports, full company export | 10 per hour per company |
| Uploads | 60 per hour per user, plus the plan quota |
| Nexora console | 300 per 15 min per staff member |

### C9. Configuration and supply chain (A05, A06, A08)

- `npm audit` already runs in CI for the front end; do the same for the backend.
- Renovate or Dependabot, lockfiles, GitHub Actions pinned to a commit, an SBOM for each release.
- Security headers on the API as well.
- Errors never show stack traces (`{ code, message }` only).
- The production check that blocks demo mode stays, and `ALLOW_DEMO_BUILD` is never set in production.

### C10. Server-side request forgery (A10)

The **webhooks** (developer page) and the DGI e-invoice calls make the server contact other hosts:
- Webhook URLs are https only and private or internal IP ranges are refused, checked again after DNS resolution.
- Short timeouts, no following of redirects, and signed payloads (HMAC).
- The DGI hosts come from a fixed allow-list.

### C11. Business rules and integrity (A04)

- `Idempotency-Key` on every write that creates money.
- Gapless numbering inside a transaction.
- The period lock checked on the server.
- Optimistic concurrency (`409 err_conflict`, already handled by the app).
- Approval rules checked on the server.
- One-transaction merges and deletes.

### C12. Security testing

| When | What |
|---|---|
| Every PR | Unit tests of the rights, the cross-company suite, dependency scan |
| Every deploy to staging | OWASP ZAP baseline scan |
| Before launch | An external penetration test (company isolation, sign-in, files, money) |
| Every quarter | Review of this plan, access rights, secrets rotation |

---

## Part D: decisions (made 28 October 2026)

You asked for the best choices for Nexora, so these are now the decisions. Parts B and C follow them.

| # | Question | Decision | Why |
|---|---|---|---|
| D1 | Where the API lives | **Same origin**: the API sits behind `API_PROXY_TARGET`, cookies are `SameSite=Lax`, plus the `X-XSRF-TOKEN` double-submit and an `Origin` check | No CORS, no third-party-cookie problems in browsers, and two layers against CSRF |
| D2 | Who must use 2FA | **Required** for Nexora staff, company owners and admins, and accountants (they see the money). **Optional** for everyone else. Method: TOTP app plus 10 recovery codes; passkeys (WebAuthn) later | These roles can move money, export data or enter other companies |
| D3 | Session timeouts | Nexora console: **15 min** idle, **8 h** maximum. Company users: **30 min** idle (the passcode lock screen shows first if a passcode is set), **12 h** maximum | Short for staff who can reach every company; workable for a full working day in the ERP |
| D4 | What each plan includes | Feature keys from the existing plan texts. **Starter**: projects, time, approvals, quotes, invoices, portal. **Business** adds: DGI e-invoice, VAT return and journal, suppliers and bills, resource planning, deals and forecast. **Enterprise** adds: several workspaces, single sign-on, audit export | Matches what is already sold on the plans page |
| D5 | Password length | **12 characters minimum**, any characters, checked against breached passwords, no forced periodic change (NIST 2025) | Current guidance; the app's 10 moves to 12 in A3.4 |
| D6 | Personal data rights and notification preferences | **Keep** personal data export and account deletion (law 09-08, CNDP). Notification preferences come **later**, with the server notifications | Legal requirement in Morocco |
| D7 | File size limits | Documents and receipts **10 MB**, client and task files **20 MB**, logo and avatar **2 MB**; total storage per plan | Enough for scans and contracts; blocks abuse |
| D8 | Deleting a project with history | **Refuse**, and offer **Close project** (same rule as employees) | Hours and invoices must never point at a missing project |
