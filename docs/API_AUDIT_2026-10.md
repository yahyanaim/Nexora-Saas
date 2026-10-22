# Nexora: API audit, front end → backend (October 2026)

This document lists **every API the front end needs** so the backend can be connected. It is built from the front-end code as it is today (`src/lib/api/*`, `src/hooks/*`, `src/types/*`).

**Out of scope (on purpose):**
- How the backend is built. It has its own cahier des charges.
- The database model.
- Security design.
- External services: payment provider, DGI e-invoicing, e-mail, file storage provider, SMS.

Where the front end touches one of these, this document only names the endpoint the front end calls.

---

## 1. Summary

| | Count |
|---|---|
| API files in the front end | 81 (62 modules + 19 test files) |
| Exported API functions | 453 (a few are small helpers) |
| Demo data collections (each becomes a backend resource) | 61 |
| Modules already calling real backend URLs | 20 |
| … of which **still used** by a screen | 8 (auth, profile, files, audit log, developer keys, data export, usage, plan check) |
| … of which **dead code** (template leftovers, no screen uses them) | 12 |
| Modules that run **only on demo data** today (no URL yet) | 40+, covering the whole ERP, CRM, portal and platform console |
| Business rules the front end enforces today that the server must enforce | ~380 messages, 395 error codes already defined |
| Endpoints proposed in this document | about 300 |

**In one sentence:** the login part is wired. Everything the product actually does (people, clients, projects, time, invoices, quotes, purchases, portal, console) talks only to `localStorage`. Each of those modules needs its endpoints, and the rules now coded in the browser must move to the server.

### How the front end will switch to the backend

Every API helper already follows the same pattern:

```ts
try { return (await apiClient.get(url)).data }
catch (e) { if (shouldUseDemoFallback(e)) return demoData(); throw e }
```

The demo-only modules skip the `try` part. Connecting one means:
1. Add the HTTP call in the helper (same name, same return type).
2. Keep the demo path behind `shouldUseDemoFallback`.

Screens and hooks do not change. That is why matching the paths and payload shapes below matters.

---

## 2. Conventions the backend must follow

These come from what the client code already does or expects.

| Topic | What the front end expects |
|---|---|
| **Base URL** | `NEXT_PUBLIC_API_URL` (e.g. `https://api.nexora.ma/api`). All paths below are relative to it. Suggest versioning as `/v1/...` inside it. |
| **Format** | JSON, `camelCase` field names, the exact shapes in `src/types/*.ts`. These type files **are the contract**. |
| **Dates** | Calendar dates `yyyy-mm-dd` (due dates, leave, timesheet days). Moments as ISO-8601 UTC timestamps (`createdAt`, `sentAt`, `approvedAt`). The front end converts to the company time zone. |
| **Money** | Numbers in major units with 2 decimals (e.g. `1234.5`). Rounding is shared in `src/lib/workforce/money.ts`. The server must round the same way (half-up to 2 decimals per line, then totals). Currency is ISO-4217 (`MAD`, `EUR`). |
| **Auth** | HttpOnly, Secure session cookies (`withCredentials: true`). No token in JS. A `401` triggers **one** `POST /auth/refresh`, then a replay. If the refresh fails, the session ends. `/auth/login`, `/auth/register`, `/auth/refresh` and `/auth/me` never trigger a refresh. |
| **Plan gate** | `403 { "code": "upgrade_required" }` opens the upgrade prompt. |
| **Errors** | `4xx { "code": "err_…", "message": "…", "details"?: {...} }`. The `code` must be one of the keys in `src/lib/errors/error-catalog.ts` (395 keys, e.g. `err_periodLocked`, `err_dealNotFound`). The UI translates the code into 9 languages; `message` is a readable English fallback. Validation errors may add `details.field`. |
| **Timeouts** | The client gives up after 20 s and shows a friendly message. Long jobs (exports, imports) must answer at once with a job id. |
| **Workspace scope** | Every ERP function takes `workspaceId` today. Proposed path prefix: **`/workspaces/:wid/…`**, written as `{ws}` in the tables. The server must check that the session belongs to that workspace. |
| **Who acts** | Many functions receive `approver`, `actor`, `viewer` or `by` from the screen (see the pre-backend audit, H2). On the server these come **from the session only**. The parameters disappear from the request bodies. |
| **Lists** | v1: list endpoints return an **array** of the whole workspace's records, because screens filter and sort in the browser. Heavy lists (§9.2) must also accept filters and pagination: `?page=&pageSize=&sortBy=&sortOrder=&search=`, answering `{ data, total }` (`ServerTableParams` in `src/types/tables.ts`). |
| **Concurrency** | Send back `updatedAt` on every write. Writes may include it (`If-Unmodified-Since` or a body `updatedAt`); a stale write gets `409 { code: "err_conflict" }` (**new code**: add it to the catalog and its 9 translations). This matters for the board (task moves), settings and invoices. |
| **Retries** | `POST`s that create money (issue an invoice, record a payment, refund, credit note) should accept an `Idempotency-Key` header so a double click or a retry creates one record. |
| **Deletes** | `204` with no body. Business rules may refuse with `409` + code (e.g. `err_thisClientHasInvoicesSoIt`). |
| **Sensitive fields** | Cost rates, salaries and margins must be **left out of the response** for roles that may not see them, not just hidden on screen (pre-backend audit, H3). The rights table is in `src/lib/permissions/can.ts`. |

---

## 3. What is wired today

### 3.1 Live and used: keep these paths

| Area | Method + path | Used by |
|---|---|---|
| Login | `POST /auth/login` → `AuthResponse` (`mfaRequired` + `mfaToken` when 2FA is on) | Sign-in |
| | `POST /auth/register`, `POST /auth/logout`, `POST /auth/refresh` | Sign-up, sign-out, client interceptor |
| | `GET /auth/me` → `AuthUser` | Session guard on every page |
| | `POST /auth/verify-request`, `POST /auth/verify` | E-mail verification |
| | `POST /auth/password-reset-request`, `POST /auth/password-reset-verify` → `{ resetToken }`, `POST /auth/password-reset` | Forgot password |
| | `POST /auth/invite-accept` | Accept a team invitation |
| | `POST /auth/2fa/setup` · `/enable` · `/disable` · `/verify` | Two-factor |
| | `POST /auth/passcode-verify` → `{ valid }` | Lock screen |
| | `POST /auth/socket-token` | Realtime connection |
| Profile | `GET /profile`, `PUT /profile`, `PUT /profile/password`, `DELETE /profile` | My profile |
| Files | `GET /files` (table params), `GET /files/:id`, `POST /files/upload` (multipart), `PATCH /files/:id`, `DELETE /files/:id`, `GET /files/:id/download` → `{ url }`, `GET /files/summary` | Files page |
| Audit | `GET /audit-logs?workspaceId=` | Audit log page |
| Developer | `GET/POST /developer/api-keys`, `DELETE /developer/api-keys/:id`, `GET/POST /developer/webhooks` | Developer page |
| Personal data | `POST /gdpr/export`, `GET /gdpr/export/:id`, `POST /gdpr/delete-account`, `POST /gdpr/cancel-deletion` | Profile → privacy |
| Plan | `GET /billing/subscription` | `plan-guard`, feature flags |
| | `GET /billing/usage`, `GET /billing/usage/check?resource=` | Usage meter |

**What `/auth/me` must return:** the screens rely on these `AuthUser` fields (`src/types/auth.ts`):
- `id`, `name`, `email`, `role`, `avatar`
- `workspaceId` + `employeeId` (employee account)
- `clientId` + `portalContactId` (client portal)
- `platformOperator` (Nexora staff)
- `permissions[]` (from the work role)
- `isPasscodeLocked`

The front end decides the menu, the role guard and portal confinement from these fields alone.

### 3.2 Dead: not needed, to be removed from the front end

These helpers come from the starter template. Their screens were rebuilt on the platform modules (§7), and no page calls them anymore:

`/users*`, `/sessions*`, `/roles*`, `/report-contents*`, `/report-system-issues*`, `/transactions*`, `/invoices*` (the template's SaaS invoices, not client invoices), `/subscriptions*`, `/overview/*`, `/team/*`, `/billing/checkout`, `/billing/portal`.

**The backend should not build these.** A front-end clean-up PR can delete the files.

### 3.3 Called but outside this scope

- **Profile photo upload** goes straight from the browser to Cloudinary (`upload-apis.ts`). When the storage provider is chosen, it should become a signed upload or `POST /uploads`.
- **Payment checkout** is pending the provider choice.

---

## 4. Identity, workspaces and settings

### 4.1 Identity and workspaces (new)

| Method + path | Replaces | Notes |
|---|---|---|
| `GET /me/workspaces` | `DEMO_WORKSPACES` in `workspace-store.ts` | Companies the user can open: `Workspace[]` (id, name, currency, country, plan). The switcher reads this. |
| `POST /auth/login` (same endpoint) | `findAccountForSignInApi`, `findPortalAccountForSignInApi` | The server decides whether the e-mail is an owner, an employee account, a portal contact or Nexora staff, and returns the matching `AuthUser`. Both demo helpers disappear. |

### 4.2 Workspace settings (`settings-api.ts`, types in `work-settings.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/settings` | `getSettingsApi` (seeds defaults on first read) |
| `PUT {ws}/settings/company` | `updateCompanyApi` (identity, ICE/IF/RC, bank, logo, document style) |
| `PUT {ws}/settings/approvals` | `updateApprovalsApi` (1 or 2 steps per subject and amount) |
| `PUT {ws}/settings/lists` | `updateListsApi` (leave types, expense categories, task labels…) |
| `PUT {ws}/settings/reminders` | `updateRemindersApi` |
| `PUT {ws}/settings/kpi` | `updateKpiSettingsApi` |
| `PUT {ws}/settings/owner-employee` | `updateOwnerEmployeeApi` |
| `PUT {ws}/settings/overheads` | `updateOverheadsApi` |
| `PUT {ws}/settings/accounts` | `updateAccountsApi` (accounting accounts) |
| `PUT {ws}/settings/custom-fields` | `updateCustomFieldsApi` |
| `PUT {ws}/settings/period-lock` `{ lockedThrough }` | `updatePeriodLockApi`. **Every dated write must check it** (`assertPeriodOpen` → `err_periodLocked`). |
| `PUT {ws}/settings/holidays` | `updateHolidaysApi` |
| `GET/POST {ws}/departments`, `PATCH/DELETE {ws}/departments/:id` | `list/create/rename/deleteDepartmentApi` (delete refused while employees are in it) |
| `GET {ws}/modules` | `loadTenantModules` (modules on for the plan) |

### 4.3 The company's Nexora subscription (`workspace-subscription-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/subscription` | `getWorkspaceSubscriptionApi` |
| `GET {ws}/subscription/invoices` | `listSubscriptionInvoicesApi` (Nexora's invoices to the company; PDF built in the browser) |
| `POST {ws}/subscription/change-plan` `{ planId, cycle }` | `changeWorkspacePlanApi` (refuse when seats in use exceed the plan) |

---

## 5. ERP endpoints by domain

The rules listed under each table are what the browser checks today. The server must check them too, because the screens can be bypassed.

### 5.1 People / HR

**Employees** (`employees-api.ts`, `Employee` in `workforce.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/employees` | `listEmployeesApi` |
| `POST {ws}/employees` | `createEmployeeApi` |
| `PATCH {ws}/employees/:id` | `updateEmployeeApi` |
| `POST {ws}/employees/:id/rates` `{ rate, cost, effectiveFrom }` | `changeRateApi` (effective-dated; old entries keep their rate snapshot) |
| `DELETE {ws}/employees/:id` | `deleteEmployeeApi` (refused when the person has logged time, expenses or reviews; set them to Former employee instead) |

**Accounts and access** (`access-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/accounts` | `listAccountsApi` |
| `POST {ws}/accounts` `{ employeeId }` | `inviteEmployeeApi` (sends the invitation e-mail) |
| `PATCH {ws}/accounts/:employeeId` `{ enabled?, role? }` | `setAccountEnabledApi`, `changeAccessRoleApi`. Must keep at least one admin. |

**Employee documents** (`documents-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET/POST {ws}/documents`, `PUT/DELETE {ws}/documents/:id` | `list/create/update/deleteDocumentApi`. The file goes through the upload endpoint; expiry reminders run on the server (§8). |

**Leave** (`leave-api.ts`, `work-planning.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/leave` | `listLeaveApi` |
| `POST {ws}/leave` | `requestLeaveApi` (no overlap, at least one working day, half day on one date, leave type turned on). Balances are only shown today, not enforced; the cahier des charges decides whether going negative is allowed. |
| `POST {ws}/leave/:id/decision` `{ approved, note? }` | `decideLeaveApi`. One or two steps per the approval rules; no self-approval; the second approver must differ (`firstApprovedBy`). |
| `POST {ws}/leave/:id/cancel` | `cancelLeaveApi` (only pending, or approved and not started) |

**Reviews** (`reviews-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/reviews` | `listReviewsApi` (each person sees only their own and their reports') |
| `POST {ws}/reviews/cycles` | `startReviewCycleApi` |
| `POST {ws}/reviews/:id/self` | `submitSelfReviewApi` |
| `POST {ws}/reviews/:id/manager` | `submitManagerReviewApi` |
| `POST {ws}/reviews/:id/acknowledge` | `acknowledgeReviewApi` |
| `DELETE {ws}/reviews/:id` | `deleteReviewApi` |
| `POST {ws}/reviews/reassign` `{ fromReviewerId, toReviewerId? }` | `reassignOpenReviewsApi` (when a manager leaves) |

**Resource bookings** (`resource-bookings-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET/POST {ws}/bookings`, `PUT/DELETE {ws}/bookings/:id` | `list/save/deleteBookingApi` |
| `POST {ws}/bookings/:id/assign` `{ employeeId }` | `assignBookingApi` |

The org chart, workload, timeline and calendar are **computed in the browser** from employees, leave, tasks and bookings. They need no endpoint of their own.

### 5.2 CRM

**Clients, leads and contacts** (`clients-api.ts`, `leads-api.ts`, `Client` in `workforce.ts`; leads are clients with `status: "lead"`; contacts live inside the client as `contacts[]`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/clients` | `listClientsApi` (clients and leads; filter `?status=`) |
| `POST {ws}/clients` | `createClientApi`. The screen warns about likely duplicates with `findDuplicateClients` (`client-relations.ts`: name, ICE, e-mail); the server should run the same check and refuse a second client with the same ICE. |
| `PATCH {ws}/clients/:id` | `updateClientApi` (also saves `contacts[]`, rate card, custom fields, archive flag) |
| `DELETE {ws}/clients/:id` | `deleteClientApi` (refused when the client has invoices, `err_thisClientHasInvoicesSoIt`; archive instead) |
| `POST {ws}/clients/:id/convert` `{ deal? }` | `convertLeadApi` (lead → client, optional deal) |
| `POST {ws}/clients/:id/drop` `{ reason }` | `dropLeadApi` |

**Contracts, notes, follow-ups** (`crm-api.ts`, `work-crm.ts`)

| Method + path | Replaces |
|---|---|
| `GET/POST {ws}/contracts`, `PUT/DELETE {ws}/contracts/:id` | `list/save/deleteContractApi` |
| `GET/POST {ws}/client-notes`, `DELETE {ws}/client-notes/:id` | `listClientNotesApi`, `addClientNoteApi` (author from the session), `deleteClientNoteApi` |
| `GET/POST {ws}/follow-ups`, `PUT/DELETE {ws}/follow-ups/:id` | `list/save/deleteFollowUpApi` |
| `POST {ws}/follow-ups/:id/done` `{ done }` | `setFollowUpDoneApi` |

**Deals** (`deals-api.ts`, `work-sales.ts`)

| Method + path | Replaces |
|---|---|
| `GET/POST {ws}/deals`, `PUT/DELETE {ws}/deals/:id` | `list/save/deleteDealApi` |
| `POST {ws}/deals/:id/move` `{ stage, lostReason? }` | `moveDealApi` (lost needs a reason) |

**Import** (`crm-import-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/import/context` | `importContextApi` (existing e-mails and ICE, for matching) |
| `POST {ws}/import/:kind` `{ rows }` → `{ created, updated, errors[] }` | `importCrmApi` (`kind` = clients, contacts or deals; upsert on e-mail or ICE; separate import right). Parsing and column mapping stay in the browser; the server re-validates every row. |

**Client satisfaction** (`satisfaction-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/satisfaction`, `POST {ws}/satisfaction` | `listSatisfactionApi`, `submitSatisfactionApi` (also posted from the portal, §6) |

### 5.3 Projects

**Projects** (`work-projects-api.ts`, `work-projects.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/projects`, `GET {ws}/projects/:id` | `listProjectsApi`, `getProjectApi` |
| `POST {ws}/projects` | `createProjectApi` (code unique per workspace) |
| `PATCH {ws}/projects/:id` | `updateProjectApi` (budget type, phases, own task states `states[]`, cycles on/off) |
| `POST {ws}/projects/:id/close` `{ snapshot }` | `closeProjectApi`. The server should **compute** the close snapshot (hours, revenue, margin) itself rather than trust the one sent. |
| `POST {ws}/projects/:id/reopen` | `reopenProjectApi` |
| `PUT {ws}/projects/:id/health-override` `{ health, reason }` / `DELETE` | `setHealthOverrideApi` |
| `DELETE {ws}/projects/:id` | `deleteProjectApi`. **Gap:** today it deletes the project with its tasks, milestones and cycles even when hours or invoices point to it. The server should refuse then (`409`) and suggest closing instead. |

**Tasks** (`work-projects-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/tasks?projectId=` | `listTasksApi` |
| `POST {ws}/tasks` | `createTaskApi`. The server assigns the per-project number (`ORB-01#7`); checks state, cycle, milestone, assignees and relations. |
| `PATCH {ws}/tasks/:id` | `updateTaskApi` (also writes the activity entries, see `recordTaskChanges`) |
| `POST {ws}/tasks/:id/move` `{ target, index? }` | `moveTaskApi` (board drag: new state and position; needs the `409` conflict check) |
| `DELETE {ws}/tasks/:id` | `deleteTaskApi` |

**Milestones**

| Method + path | Replaces |
|---|---|
| `GET {ws}/milestones?projectId=`, `POST`, `PATCH/DELETE {ws}/milestones/:id` | `list/create/update/deleteMilestoneApi` |
| `POST {ws}/milestones/:id/approval` `{ approved }` | `setMilestoneApprovalApi` (staff side; the client side is in §6) |

**Task collaboration** (`task-collab-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/tasks/:id/comments`, `POST` `{ body }`, `DELETE {ws}/comments/:id` | `list/add/deleteTaskCommentApi`. The server parses `@mentions` and notifies those people. |
| `GET {ws}/tasks/:id/attachments`, `POST` (multipart), `DELETE {ws}/attachments/:id` | `list/add/removeTaskAttachmentApi`. Today the file is a `dataUrl` stored in the record; on the server, use real file storage. |
| `GET {ws}/tasks/:id/activity` | `listTaskActivityApi` (written by the server on every task change) |

**Saved task views** (`task-views-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/projects/:pid/views` | `listTaskViewsApi` (mine and shared ones) |
| `POST {ws}/projects/:pid/views` | `saveTaskViewApi` |
| `PATCH {ws}/views/:id` `{ shared }` | `setTaskViewSharedApi` |
| `DELETE {ws}/views/:id` | `deleteTaskViewApi` (owner, or a manager) |

**Cycles** (`cycles-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/cycles?projectId=`, `POST`, `PUT/DELETE {ws}/cycles/:id` | `list/save/deleteCycleApi` (1 day to 4 weeks, no overlap) |
| `POST {ws}/cycles/:id/close` `{ carryTo: "next" \| "backlog" }` | `closeCycleApi` (moves unfinished tasks, creates the next cycle if needed, keeps a summary) |

**Templates** (`project-templates-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/project-templates`, `DELETE {ws}/project-templates/:id` | `listTemplatesApi`, `deleteTemplateApi` |
| `POST {ws}/projects/:id/save-as-template` `{ name }` | `saveProjectAsTemplateApi` |
| `POST {ws}/project-templates/:id/create-project` | `createProjectFromTemplateApi` |

**Change orders** (`change-orders-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/change-orders?projectId=`, `POST`, `PUT/DELETE {ws}/change-orders/:id` | `list/save/deleteChangeOrderApi` |
| `POST {ws}/change-orders/:id/send` | `sendChangeOrderApi` (the client sees it in the portal) |
| `POST {ws}/change-orders/:id/decision` `{ approved, reason? }` | `decideChangeOrderApi` (staff recording a decision; the client side is in §6) |

**Client requests** (`client-requests-api.ts`, `work-requests.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/requests?clientId=` | `listClientRequestsApi` |
| `POST {ws}/requests` | `createClientRequestApi` (by staff on behalf of a client) |
| `POST {ws}/requests/:id/accept` | `acceptClientRequestApi` (creates the task, or a change order when out of scope) |
| `POST {ws}/requests/:id/reject` `{ reason }` · `/snooze` `{ until }` · `/duplicate` `{ taskId }` · `/reopen` | `reject/snooze/markRequestDuplicate/reopenClientRequestApi` |

### 5.4 Time

**Timesheets and approvals** (`work-billing-api.ts`, `TimeEntry` in `work-billing.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/time-entries?employeeId=&from=&to=&status=` | `listTimeEntriesApi`. **Today the hook loads all entries of the workspace; this must become filtered** (§9.2). |
| `PUT {ws}/timesheet/cell` `{ employeeId, projectId, taskId?, date, hours, note? }` | `setTimesheetCellApi` (15-minute steps, ≤ 24 h/day, not in a locked period, not on invoiced entries) |
| `POST {ws}/timesheet/add-hours` | `addHoursApi` (quick entry: adds to the cell) |
| `POST {ws}/timesheet/copy-week` `{ employeeId, monday }` | `copyPreviousWeekApi` |
| `POST {ws}/timesheet/clear-row` | `clearTimesheetRowApi` |
| `POST {ws}/timesheet/submit` `{ employeeId, from, to }` | `submitTimesheetApi` |
| `POST {ws}/time-entries/approve` `{ ids }` | `approveTimeEntriesApi` (approval rules; no self-approval) |
| `POST {ws}/time-entries/reject` `{ ids, reason }` | `rejectTimeEntriesApi` |
| `POST {ws}/time-entries/reopen` `{ ids, reason }` | `reopenTimeEntriesApi` (not when invoiced) |

**Timers** (`timer-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/timers` | `listRunningTimersApi` (team view) |
| `GET {ws}/timers/:employeeId` | `getTimerApi` |
| `POST {ws}/timers/start` `{ projectId, taskId?, note? }` | `startTimerApi` (one running timer per person: starting a new one stops the old one and saves its time; use the server clock) |
| `POST {ws}/timers/stop` → the created entry | `stopTimerApi` |
| `DELETE {ws}/timers/:employeeId` | `discardTimerApi` |

### 5.5 Sales and billing

**Quotes** (`quotes-api.ts`, `work-quotes.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/quotes`, `POST`, `PUT/DELETE {ws}/quotes/:id` | `list/create/update/deleteQuoteApi` (only drafts can be edited or deleted) |
| `POST {ws}/quotes/:id/send` | `sendQuoteApi` (gives the number at send time, using the company's `quoteNumberFormat`, default `DEV-{YYYY}-{SEQ}`, and fiscal-year start month) |
| `POST {ws}/quotes/:id/accept` · `/decline` `{ reason }` | `accept/declineQuoteApi` |
| `POST {ws}/quotes/:id/duplicate` | `duplicateQuoteApi` |
| `POST {ws}/quotes/:id/create-project` `{ code, managerId? }` | `createProjectFromQuoteApi` |
| `POST {ws}/quotes/:id/convert-to-invoice` | `convertQuoteToInvoiceApi` |

**Client invoices** (`work-billing-api.ts`, `ClientInvoice` in `work-billing.ts`). **This is the most rule-heavy area.**

| Method + path | Replaces |
|---|---|
| `GET {ws}/client-invoices` | `listClientInvoicesApi` |
| `POST {ws}/client-invoices/from-hours` `{ clientId, entryIds, expenseIds?, issueDate?, … }` | `createInvoiceFromHoursApi` (locks the entries and expenses to the invoice) |
| `POST {ws}/client-invoices` | `createInvoiceApi` (fixed, milestone, retainer, advance or free invoice) |
| `PATCH {ws}/client-invoices/:id` | `updateInvoiceDraftApi` (draft only) |
| `DELETE {ws}/client-invoices/:id` | `deleteInvoiceDraftApi` (draft only; frees hours and expenses) |
| `POST {ws}/client-invoices/:id/issue` | `issueInvoiceApi`. **Gives the legal number at issue** (gapless per fiscal year, using the company's `invoiceNumberFormat` and fiscal-year start month), checks the period lock and company tax IDs, then locks the invoice. |
| `POST {ws}/client-invoices/:id/sent` | `markInvoiceSentApi` |
| `POST {ws}/client-invoices/:id/reminders` `{ level: 1\|2\|3 }` | `sendReminderApi` (manual; the automatic ones run on the server, §8) |
| `POST {ws}/client-invoices/:id/payments` `{ date, amount, method, reference? }` | `recordPaymentApi` (issued or sent invoices only, not on credit notes, amount > 0 and ≤ balance; sets paid when settled) |
| `POST {ws}/client-invoices/:id/paid` | `markInvoicePaidApi` |
| `POST {ws}/client-invoices/:id/void` | `voidInvoiceApi` (issued or sent, no payments, not sent to the DGI; frees hours and expenses) |
| `POST {ws}/client-invoices/:id/credit-notes` `{ lineIds?, releaseHours, reason? }` | `createCreditNoteApi` (own number series) |
| `GET {ws}/client-invoices/:id/e-invoice` → UBL XML | `getEInvoiceXmlApi` (built in the browser today; the legal XML should come from the server) |
| `POST {ws}/client-invoices/:id/e-invoice/send` · `GET …/e-invoice/status` | `sendEInvoiceApi`, `checkEInvoiceStatusApi` (the DGI connection itself is external and out of scope) |

Invoice and quote **PDFs are built in the browser** (`src/lib/pdf/*`) from the invoice and the company settings, so no PDF endpoint is required. If PDFs are e-mailed or archived later, the server will need the same layout.

**Recurring invoices** (`recurring-invoices-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET/POST {ws}/recurring-invoices`, `PUT/DELETE {ws}/recurring-invoices/:id` | `list/save/deleteRecurringApi` |
| `POST {ws}/recurring-invoices/:id/active` `{ active }` | `setRecurringActiveApi` |
| `POST {ws}/recurring-invoices/:id/run` | `runRecurringApi` (create the next invoice now) |
| *(server job)* | `runDueRecurringApi`. **Today the browser runs it when the CRM hook loads; it must become a daily server job** (§8). |

**Expenses** (`expenses-api.ts`, `work-costs.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/expenses` | `listExpensesApi` |
| `POST {ws}/expenses` | `submitExpenseApi` (receipt through the upload endpoint) |
| `POST {ws}/expenses/:id/review` `{ approved, reason? }` | `reviewExpenseApi` (1 or 2 steps by amount) |
| `POST {ws}/expenses/:id/reimburse` | `reimburseExpenseApi` |
| `DELETE {ws}/expenses/:id` | `deleteExpenseApi` |
| *(inside invoice endpoints)* | `setExpensesInvoice`, `releaseInvoiceExpenses` are **internal**: the invoice endpoints do them. Not public. |

**Suppliers and supplier bills** (`suppliers-api.ts`, `supplier-bills-api.ts`, `work-purchases.ts`)

| Method + path | Replaces |
|---|---|
| `GET/POST {ws}/suppliers`, `PATCH/DELETE {ws}/suppliers/:id` | `list/create/update/deleteSupplierApi` |
| `GET/POST {ws}/supplier-bills`, `PUT/DELETE {ws}/supplier-bills/:id` | `list/create/update/deleteSupplierBillApi` (submitter from the session) |
| `POST {ws}/supplier-bills/:id/review` `{ approved, reason? }` | `reviewSupplierBillApi` |
| `POST {ws}/supplier-bills/:id/payments` | `paySupplierBillApi` |

**Bank import** (`bank-import-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/bank/lines` | `listBankLinesApi` |
| `GET {ws}/bank/mapping?headers=` · `PUT {ws}/bank/mapping` | `get/saveBankMappingApi` (remembered column mapping per bank layout) |
| `POST {ws}/bank/import` `{ fileName, decisions[] }` | `confirmBankImportApi` (each decision records a payment on an invoice or ignores the line). CSV parsing and matching suggestions stay in the browser. |
| *(not needed)* | `sampleStatementApi` is a demo helper only. |

**Saved reports** (`saved-reports-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET/POST {ws}/saved-reports`, `DELETE {ws}/saved-reports/:id` | `listSavedReportsApi` (mine + shared by role), `saveReportApi`, `deleteSavedReportApi` |

Analytics, KPIs, profitability, receivables ageing, forecast and standard reports are **computed in the browser** from the lists above. v1 needs no endpoint for them (but see §9.2 on volume).

### 5.6 Notifications and audit (company side)

| Method + path | Replaces | Why |
|---|---|---|
| `GET {ws}/notifications` → `{ id, kind, title, link, at, read }[]` | the bell (`work-notification-center.tsx`) | **Today the bell downloads 13 full lists** (employees, reviews, time, leave, expenses, invoices, documents, tasks, feedback, projects, follow-ups, requests…) on every page just to count what's waiting. A server feed is needed. |
| `POST {ws}/notifications/read` `{ ids }` | — | Read state is not stored today. |
| `GET {ws}/audit-logs` | `getAuditLogsApi` + `listAudit` (local) | The server writes the audit trail on every change. The front-end `recordAudit` calls disappear. |
| `GET {ws}/announcements` | `announcementsForWorkspace` | Nexora notices shown as banners |
| `GET {ws}/notices` | `noticesForWorkspaceApi` | Incident and maintenance banners |
| `GET {ws}/flags/:key` (or within `/modules`) | `flagOnForWorkspaceApi` | Feature flags per workspace |

### 5.7 Company ↔ Nexora support and data

| Method + path | Replaces |
|---|---|
| `GET {ws}/support/requests`, `POST {ws}/support/requests` | `listCompanySupportApi`, `createSupportRequestApi` |
| `POST {ws}/support/requests/:id/replies` `{ text }` | `customerReplyApi` |
| `GET {ws}/support/session` | `activeSessionForWorkspaceApi` (is a Nexora agent connected?) |
| `POST {ws}/support/sessions/:id/decision` `{ approve }` · `/end` | `decideSessionApi`, `endSessionApi` (customer side) |
| `POST {ws}/data/export` · `POST {ws}/data/deletion` `{ reason }` | `requestDataExportApi`, `requestDeletionApi` (company side; `data-export-api.ts` too) |
| `GET {ws}/data/exports/:id/download` | `downloadExportApi` |

---

## 6. Client portal

A portal contact is signed in with `clientId` and `portalContactId`. Every portal endpoint must be **confined to that client**: the server ignores any `clientId` sent by the browser.

**Staff side** (`portal-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET {ws}/portal-access` | `listPortalAccessApi` (with last-seen date for the inactivity warning) |
| `POST {ws}/portal-access` `{ clientId, contactId }` | `invitePortalContactApi` (sends the invitation) |
| `DELETE {ws}/portal-access/:id` | `revokePortalAccessApi` |

**Client side** (`/portal/...`, session = portal contact)

| Method + path | Used by |
|---|---|
| `GET /portal/overview` | Portal home: their projects with progress, milestones, open invoices, quotes, change orders, requests |
| `GET /portal/projects/:id` | Project page in the portal (tasks marked client-visible, milestones) |
| `GET /portal/invoices`, `GET /portal/quotes` | Their documents (PDF built in the browser) |
| `POST /portal/milestones/:id/decision` `{ approved, comment? }` | `decideMilestoneApi` |
| `POST /portal/change-orders/:id/decision` `{ approved, reason? }` | `decideChangeOrderForClientApi` |
| `GET /portal/requests`, `POST /portal/requests` | `listClientRequestsApi(clientId)`, `createClientRequestApi` (`by` from the session) |
| `POST /portal/satisfaction` | `submitSatisfactionApi` |

---

## 7. Platform console (Nexora staff)

Signed in with `platformOperator: true` and a console role (`owner`, `admin`, `support`, `finance`, `engineering`, `sales`, `read_only`; rights table in `src/lib/platform/console-roles.ts`). Every console endpoint checks the role (`err_consoleForbidden`) and writes the console audit (`audit()` / `auditCustomer()` today).

### 7.1 Customers and users (`platform-customers-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET /platform/customers`, `GET /platform/customers/:id` | `listCustomersApi`, `getCustomerApi` |
| `POST /platform/customers/trials` | `createTrialApi` (creates the workspace and the admin invitation) |
| `POST /platform/customers/:id/extend-trial` · `/activate` · `/suspend` `{ reason, until? }` · `/lift-suspension` · `/cancel` · `/undo-cancel` | `extendTrial/activateCustomer/suspendCustomer/liftCustomerSuspension/cancelCustomer/undoCancellationApi` |
| `PATCH /platform/customers/:id` | `updateCustomerApi` |
| `POST /platform/customers/:id/notes` | `addCustomerNoteApi` |
| `GET /platform/directory` | `listDirectoryApi` (all users of all customers) |
| `POST /platform/directory/:userId/password-reset` | `sendPasswordResetApi` |
| `POST /platform/directory/:userId/suspend` · `DELETE /platform/user-suspensions/:id` · `GET /platform/user-suspensions` | `suspendUserApi`, `liftUserSuspensionApi`, `listUserSuspensionsApi` |
| `POST /platform/customers/:id/reset-demo` | `resetDemoWorkspaceApi` |

### 7.2 Nexora billing (`platform-billing-api.ts`, 772 lines: the biggest module)

| Method + path | Replaces |
|---|---|
| `GET /platform/plan-versions`, `POST` | `listPlanVersionsApi`, `createPlanVersionApi` (keep or move existing customers) |
| `GET /platform/subscriptions` | `listSubscriptionsApi` |
| `POST /platform/customers/:id/subscription` | `startSubscriptionApi` |
| `POST /platform/customers/:id/subscription/plan` · `/billing` · `/method` · `/payment-terms` | `changePlanApi`, `changeBillingApi`, `changeMethodApi`, `setPaymentTermsApi` |
| `PUT/DELETE /platform/customers/:id/discount` | `setDiscountApi`, `removeDiscountApi` |
| `PUT/DELETE /platform/customers/:id/seat-extension` | `setExtensionApi`, `removeExtensionApi` |
| `POST /platform/customers/:id/cancel-now` `{ reason, refund }` | `cancelNowApi` |
| `GET /platform/invoices`, `/credit-notes`, `/payments`, `/refunds`, `/dunning`, `/tax-rates`, `/pro-formas`, `/settlements`, `/reconciliations` | the 9 `list…Api` |
| `POST /platform/payments/transfers` · `POST /platform/payments/:id/assign` `{ invoiceId }` · `POST /platform/payments/:id/chargeback` | `recordTransferApi`, `assignTransferApi`, `recordChargebackApi` |
| `POST /platform/invoices/:id/credit-notes` · `POST /platform/refunds/:id/approve` | `issueCreditNoteApi`, `approveRefundApi` (approver ≠ requester) |
| `POST /platform/invoices/:id/dunning-pause` `{ days, reason }` | `pauseDunningApi` |
| `POST /platform/customers/:id/pro-formas` | `createProFormaApi` |
| *(server jobs)* | `runBillingJobsApi`, `runReconciliationApi`. **Today a console page runs them in the browser; they must become scheduled jobs** (§8). `simulateSettlementGapApi` is demo only. |

**Customer-initiated billing** (from the company's "My subscription"): `customerStartSubscriptionApi` and `customerChangePlanApi` map to `POST {ws}/subscription/start` and `POST {ws}/subscription/change-plan` (§4.3).

### 7.3 Staff, sessions, audit (`platform-console-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET /platform/staff`, `POST /platform/staff/invites`, `POST /platform/staff/:id/resend` | `listStaffApi`, `inviteStaffApi`, `resendInviteApi` |
| `POST /platform/staff/invites/:id/accept` | `acceptInviteApi` |
| `PATCH /platform/staff/:id` `{ role }` · `DELETE /platform/staff/:id` | `changeStaffRoleApi`, `removeStaffApi` (keep one owner; can't remove yourself) |
| `GET /platform/sessions`, `DELETE /platform/sessions/:id` | `listSessionsApi`, `revokeSessionApi` |
| `GET /platform/audit` | `listAuditApi` |
| `POST /platform/staff/me/2fa` `{ code }` | `enableTwoFactorApi` (console requires 2FA before anything shows) |
| `POST /platform/exports/directory` · `/exports/audit` `{ rows }` | `recordDirectoryExportApi`, `recordAuditExportApi` (log who exported what) |

### 7.4 Configuration, plans, operations

| Method + path | Replaces |
|---|---|
| `GET/PUT /platform/identity`, `PUT /platform/identity/logo` | `getIdentityApi`, `updateIdentityApi`, `updateIdentityLogoApi` |
| `GET/POST /platform/announcements`, `POST /platform/announcements/:id/end` | `listAnnouncementsApi`, `createAnnouncementApi`, `endAnnouncementApi` |
| `GET /platform/flags`, `PUT /platform/flags/:key` | `listFlagsApi`, `updateFlagApi` |
| `GET /platform/plan-content`, `PUT /platform/plan-content/:plan` | `listPlanContentApi`, `updatePlanContentApi` |
| `GET /platform/health`, `GET /platform/tenant-errors` | `listHealthApi`, `listTenantErrorsApi` |
| `GET/POST /platform/incidents`, `PATCH /platform/incidents/:id`, `POST …/notify`, `POST …/resolve` | `listIncidents/createIncident/updateIncident/notifyIncident/resolveIncidentApi` |
| `POST /platform/maintenance`, `PATCH /platform/maintenance/:id` | `scheduleMaintenanceApi`, `updateMaintenanceApi` |
| `GET /platform/backups`, `POST /platform/backups/restore-test` | `listBackupsApi`, `runRestoreTestApi` |
| *(demo only)* | `simulateOutageApi`, `restoreServiceApi` |

### 7.5 Support desk and support access (`platform-support-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET /platform/support/requests` | `listSupportRequestsApi` |
| `POST /platform/support/requests/:id/replies` `{ text, waitForCustomer }` | `agentReplyApi` |
| `POST …/assign` `{ staffId }` · `PATCH …` `{ status }` | `assignSupportApi`, `setSupportStatusApi` |
| `GET /platform/support/sessions`, `POST /platform/support/sessions` `{ customerId, requestId?, reason, scope }` | `listSupportSessionsApi`, `requestSessionApi` (needs the customer's approval; write scope also needs the owner) |
| `POST /platform/support/sessions/:id/owner-approve` · `/end` · `/pages` `{ path }` | `ownerApproveSessionApi`, `endSessionApi`, `recordSessionPageApi` (every page an agent opens is logged) |

### 7.6 Data requests and retention (`platform-data-api.ts`)

| Method + path | Replaces |
|---|---|
| `GET /platform/data-requests` | `listDataRequestsApi` |
| `POST /platform/data-requests/:id/fulfil` · `/prepare-deletion` · `/approve-deletion` · `/refuse` `{ reason }` | `fulfilExport/prepareDeletion/approveDeletion/refuseDataRequestApi` (4-eyes: approver ≠ preparer) |
| `GET/PUT /platform/retention` | `getRetentionApi`, `updateRetentionApi` (audit purge then runs as a job) |

---

## 8. Jobs the server must run (no endpoint; today run in the browser or not at all)

| Job | Today | Must become |
|---|---|---|
| Create due recurring invoices | `runDueRecurringApi` when the CRM hook loads | Daily job |
| Overdue reminders (levels 1–3) | Manual button + computed on screen | Daily job, following `settings.reminders` |
| Nexora billing: renewals, dunning, suspensions | `runBillingJobsApi` from a console page | Daily job |
| Payment reconciliation | `runReconciliationApi` from a console page | Daily job |
| Trial expiry | `expireTrials` (pure function, not scheduled) | Daily job |
| Seats-full warning | `checkSeatsFullApi` on console load | Daily job + on seat change |
| Document and contract expiry reminders | Computed in the bell | Daily job → notification |
| Portal inactivity | Computed on screen | Daily job → notification |
| Audit retention purge | `purgeableEvents` (pure function) | Monthly job |
| Leave carry-over at year end | Computed when balances are read | Yearly job or computed on read on the server |

---

## 9. Gaps and risks found in the front end

### 9.1 Rules that live only in the browser

The server must re-implement all of these. The front-end code and its tests are the reference.

| Rule | Where it is today |
|---|---|
| Legal invoice and quote numbering (gapless, per year, given at issue or send) | `work-billing-api.ts`, `quotes-api.ts` |
| Period lock on every dated write | `assertPeriodOpen` in `settings-api.ts` |
| Approval rules (1 or 2 steps, amounts, no self-approval, different second approver) | `src/lib/workforce/approvals.ts` |
| Money rounding, taxes, withholding, discounts, currency | `src/lib/workforce/money.ts`, `billing.ts` |
| Effective-dated rates and rate snapshots on time entries | `employees-api.ts`, `work-billing-api.ts` |
| Leave balances, half days, holidays, overlaps | `src/lib/workforce/leave-balances.ts`, `leave-api.ts` |
| Task states per project, cycles, numbering, relations | `task-states.ts`, `cycles.ts`, `work-projects-api.ts` |
| Who may see cost and margin | `src/lib/permissions/can.ts`, `src/lib/workforce/access.ts` |
| Route rights per role | `src/lib/permissions/routes.ts` |
| Duplicate detection (clients, contacts) | `src/lib/workforce/client-relations.ts` |
| Console role rights and 4-eyes rules | `src/lib/platform/console-roles.ts` |

### 9.2 Volume: lists that will not scale as "load everything"

| List | Problem | Ask |
|---|---|---|
| Time entries | Every person × day × project, loaded whole | Filters `employeeId`, `from`, `to`, `status`, `projectId`, `invoiced` (the helper already sends some) |
| Tasks, task activity, comments | Loaded per workspace | `?projectId=` required for tasks; paginate activity |
| Client invoices, payments | Grow forever | `?status=&clientId=&from=&to=` + pagination |
| Audit logs (company and console) | Grow forever | Pagination is required |
| Notifications | 13 lists per page load | Server feed (§5.6) |
| Analytics and KPIs | Computed from all time entries and invoices | v1 OK up to roughly 10k entries; then aggregate endpoints (`GET {ws}/analytics?from=&to=`) |

### 9.3 Files

Files have no real home yet:

| Record | Today |
|---|---|
| Task attachments | The whole file is kept as a `dataUrl` inside the record (`work-projects.ts`) |
| Company logo (and Nexora's logo) | `logoDataUrl` inside the settings |
| Employee documents | Only `fileName` is kept; the file itself is not stored (the type says "stored by the backend later") |
| Expense receipts | Only `receiptName` is kept, same as above |
| Profile photo | Sent straight to Cloudinary from the browser (§3.3) |

One **upload endpoint** covers all of them: `POST {ws}/uploads` (multipart) → `{ id, url, name, size, type }`. The records then keep the file id. The browser allows up to 100 MB today (`upload-apis.ts`); the backend should set a lower limit per kind (e.g. 10 MB for receipts and documents) and the front end will follow it.

### 9.4 Realtime

The socket is only used today for the "new login" alert (`socket-provider.tsx`, token from `/auth/socket-token`). These would be nice later, not needed for v1:
- `notification.created`
- `task.updated` (board shared by several people)
- `timer.changed`

### 9.5 Things to clean in the front end when wiring (small PRs)

1. Delete the dead template modules (§3.2) and their hooks.
2. Drop the actor, approver, viewer and by parameters from the API helpers once the server reads the session.
3. Replace `DEMO_WORKSPACES` with `GET /me/workspaces`.
4. Move the bell to `GET {ws}/notifications`.
5. Stop calling the job functions (§8) from hooks.
6. Add filters to `useTimeEntries` and `useTasks`.

---

## 10. Suggested order to connect

Each phase is useful on its own and can go live module by module, because the demo fallback keeps the rest working.

| Phase | Endpoints | Why first |
|---|---|---|
| **0. Foundations** | `/auth/*` (exists), `/auth/me` with the identity fields, `/me/workspaces`, error format, uploads | Everything depends on who is signed in and in which company |
| **1. Company setup** | settings, departments, employees, accounts and access, modules | Every other module reads them |
| **2. CRM** | clients, leads, contacts, contracts, notes, follow-ups, deals, import | Sales start here; little money logic |
| **3. Projects** | projects, tasks, milestones, collaboration, views, cycles, templates, requests, change orders | Daily work |
| **4. Time** | timesheets, approvals, timers, leave | Feeds billing |
| **5. Money** | quotes, client invoices (issue, payments, credit notes, reminders), recurring, expenses, suppliers, supplier bills, bank import | Most rules; needs the period lock and numbering |
| **6. Portal** | staff-side access + `/portal/*` | Needs projects and invoices |
| **7. Feeds** | notifications, audit, announcements and notices, saved reports, reviews, bookings, satisfaction | Comfort |
| **8. Console** | customers, billing, staff, config, ops, support, data requests + the jobs | Nexora's own operations |

---

## 11. Appendix: front-end file → section

| File | Section |
|---|---|
| `auth-apis.ts`, `profile-api.ts`, `gdpr-apis.ts`, `files-api.ts`, `developer-apis.ts`, `usage-metering.ts`, `billing-apis.ts`, `audit-logs-api.ts` | §3.1 |
| `users-apis.ts`, `sessions-apis.ts`, `roles-apis.ts`, `reports-apis.ts`, `transactions-api.ts`, `invoices-api.ts`, `subscriptions-api.ts`, `overview-apis.ts`, `team-apis.ts`, `plans-apis.ts` | §3.2 (dead) |
| `upload-apis.ts` | §3.3, §9.3 |
| `settings-api.ts`, `tenant-modules.ts`, `workspace-subscription-api.ts` | §4 |
| `employees-api.ts`, `access-api.ts`, `documents-api.ts`, `leave-api.ts`, `reviews-api.ts`, `resource-bookings-api.ts` | §5.1 |
| `clients-api.ts`, `leads-api.ts`, `crm-api.ts`, `deals-api.ts`, `crm-import-api.ts`, `satisfaction-api.ts` | §5.2 |
| `work-projects-api.ts`, `task-collab-api.ts`, `task-views-api.ts`, `cycles-api.ts`, `cycle-store.ts`, `project-templates-api.ts`, `change-orders-api.ts`, `client-requests-api.ts` | §5.3 |
| `work-billing-api.ts` (time part), `timer-api.ts` | §5.4 |
| `quotes-api.ts`, `work-billing-api.ts` (invoice part), `recurring-invoices-api.ts`, `expenses-api.ts`, `suppliers-api.ts`, `supplier-bills-api.ts`, `bank-import-api.ts`, `saved-reports-api.ts` | §5.5 |
| `platform-config-api.ts` (workspace part), `platform-ops-api.ts` (notices) | §5.6 |
| `platform-support-api.ts` (company part), `platform-data-api.ts` (company part), `data-export-api.ts` | §5.7 |
| `portal-api.ts` | §6 |
| `platform-customers-api.ts`, `platform-billing-api.ts`, `platform-console-api.ts`, `platform-config-api.ts`, `platform-plans-api.ts`, `platform-ops-api.ts`, `platform-support-api.ts`, `platform-data-api.ts`, `platform-seats-api.ts` | §7 |
