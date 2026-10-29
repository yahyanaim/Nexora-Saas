# Backend cahier des charges v2.0: gap report and v2.1 change list

_29 October 2026. Compares **"Nexora ERP — Cahier des charges, Server, Data and Security Platform", version 2.0 of 16 October 2026** (84 pages, 305 requirements) with the front end as it is today on `main`, the API contract v2 (`docs/API_CONTRACT.md`) and the decisions D1–D8 (`docs/PLAN_FIXES_API_SECURITY_2026-10.md`). This is a report only: the cahier des charges is updated to v2.1 in a later step, after the front-end fixes A2._

## 1. Summary

The cahier des charges is **strong and stays the backbone of the backend**: modular monolith, PostgreSQL with six schemas and row-level security, three sign-in realms, composite tenant keys, gap-free numbering, frozen rows, append-only audit, outbox, jobs on PostgreSQL, OWASP mapping, a reference scenario and a delivery plan. None of that needs to change.

Its baseline is the front end **at Lot A11 (16 October)**. Since then, 13 front-end steps added features it does not know about, and the API work added rules it does not have. The table below gives the size of what v2.1 must add or settle.

| Part | What | Count |
|---|---|---|
| A | Features built after the baseline, missing from the data model and the requirements | 24 features in 2 modules (12 CRM, 12 work), 14 new tables and about 25 new columns, 25 new requirements (REL-11 to REL-22, WRK-12 to WRK-22, IAM-18, NTF-07), 5 jobs, 5 state machines |
| B | Places where the cahier des charges and the API contract v2 / decisions D1–D8 disagree | 12 decisions to settle |
| C | Things the cahier des charges requires that the **front end** does not do yet | 8 front-end items |
| D | Facts in the cahier des charges that are out of date | 6 corrections |
| E | Effect on the delivery plan | about +3 weeks (24 → 27, 34 with contingency) |

## 2. What stays as it is

These sections match what was built and decided, and need no change in v2.1: §1.3 design principles, §5 architecture, §6 database rules, §9 tenancy (three barriers), §10 authorization model, §12 time/approvals/sales/purchases (except §B7 and §C1 below), §13.1 finance, §14 console, §15 transactions and critical flows, §16 audit trails, §17 jobs design, §18 security, §19 retention, §20 tests and the reference scenario, §21 migration rules.

## 3. Part A: features built after the baseline

Each line names the front-end source (the reference behaviour, with its tests), what the database needs (§7 of the cahier des charges) and the proposed requirement for v2.1, written in the cahier des charges' own style.

### A1. Clients, CRM and portal (module `relations`, §7.4 and §11.3)

| # | Feature (front-end step) | Front-end source | Database (§7.4) | Proposed requirement | Pri. | Acceptance criterion |
|---|---|---|---|---|---|---|
| A1.1 | Leads and their lifecycle (CRM 1, 6) | `leads.ts`, `leads-api.ts` | `clients`: status `lead`, `lead_source`, `tags text[]`, `converted_at`, `lost_reason` | **REL-11** A lead becomes a client by *convert* (optionally with a first deal) or is *dropped* with a reason; the lead source is kept for conversion figures | M | Dropping without a reason returns `REASON_REQUIRED`; converting sets `converted_at` once |
| A1.2 | Contacts with several e-mails, phones and LinkedIn (CRM 6) | `contacts.ts`, `contact-edit.tsx` | `client_contacts`: `other_emails text[]`, `other_phones text[]`, `linkedin`, `role` | **REL-12** A contact may hold several e-mails and phones; `linkedin` accepts http/https only; one primary contact per client | S | A `javascript:` LinkedIn returns `err_badUrl`; a second primary is refused |
| A1.3 | Follow-ups (CRM 5) | `follow-ups.ts`, `crm-api.ts` | **new** `client_follow_ups` (client, title, due date, owner, contact, deal, status, note, done at and by) | **REL-13** Follow-ups have an owner, a due date and a status (to do, in progress, done); done stamps who and when; due and late follow-ups reach their owner's inbox | M | A follow-up due today appears once in the owner's inbox at 08:00 local time |
| A1.4 | Configurable sales stages (CRM 8) | `deals.ts`, `pipeline-stages-dialog.tsx` | **new** `pipeline_stages` (key, name, probability, position) + `stale_days` in `company_settings` | **REL-14** A workspace has up to 10 open stages plus won and lost, each with a chance %; removing a stage moves its deals to a chosen stage **in the same transaction** | M | Removing a stage that holds 3 deals leaves 0 deals on an unknown stage |
| A1.5 | Days in stage, stale deals, won deal → project (CRM 8) | `deals.ts`, `deals-api.ts` | `deals`: `stage_since`, `contact_id`, `project_id` | **REL-15** The server sets `stage_since` on every stage change; a deal is stale after `stale_days`; a won deal creates **one** project | S | A second "create project" returns `DEAL_HAS_PROJECT`; a lost deal returns `DEAL_NOT_WON` |
| A1.6 | Client change history (CRM 9) | `client-history.ts` | **new** `client_history` (append-only: kind, field, before, after, actor) | **REL-16** Every change to a client writes one history row per changed field (contacts and custom fields one by one); rows are never updated | M | Renaming a client and changing its manager writes 2 rows; an `UPDATE` on the table fails |
| A1.7 | Deleted-clients bin (CRM 9) | `clients-api.ts` (`deleteClientApi`, `restoreClientApi`, `purgeClientApi`) | `clients`: `deleted_at`, `deleted_by` | **REL-17** Deleting a client without invoices moves it to a bin for 30 days with its contacts, deals and follow-ups; it can be restored, purged, or is purged by a job; a client with invoices can only be archived | M | A purged client is gone with its files; one with an invoice returns `CLIENT_HAS_INVOICES` |
| A1.8 | Merging duplicate clients (CRM 9) | `mergeClientsApi`, `MERGE_FIELDS` | — | **REL-18** Two clients merge in **one transaction**: values chosen field by field, every linked record moves, the other client is removed, history and audit record it | M | After merging, no row of any table references the removed client |
| A1.9 | Client files (CRM 10) | `client-files-api.ts` | `file_links` + `category` (contract, proposal, brief, invoice, other) | **REL-19** Files attach to a client with a category, follow §13.3, and move with a merge | S | A file of another workspace cannot be attached (composite key) |
| A1.10 | @mentions in client notes (CRM 10) | `findMentions`, `addClientNoteApi` | `client_notes`: `mention_ids uuid[]` | **REL-20** The server resolves mentions to employees (never the author) and creates a notice for each | S | Mentioning Karim creates one notice for him and none for the author |
| A1.11 | Import from CSV or Excel (CRM 7) | `crm-import.ts`, `crm-import-api.ts` | **new** `import_runs` (kind, file hash, rows, created, updated, errors, actor) | **REL-21** Clients, contacts and deals can be imported; the server re-validates every row, upserts on ICE or e-mail, reports per row, and needs `clients:import`; exports need `clients:export` | M | An import of 500 clients with 3 bad rows creates 497 and lists the 3 with their codes |
| A1.12 | Lists shared with the team (CRM 10, every table) | `table-views-api.ts` | **new** `table_views` (list, name, state `jsonb`, owner, shared) | **REL-22** A member can share a saved list view with the workspace; only its owner or an administrator removes it | S | A shared view is visible to every member; deleting another's view returns 403 |

### A2. Projects, tasks and planning (module `work`, §7.5 and §11.4)

| # | Feature (front-end step) | Front-end source | Database (§7.5) | Proposed requirement | Pri. | Acceptance criterion |
|---|---|---|---|---|---|---|
| A2.1 | Task keys `CODE#N` (P1) | `nextTaskNumber` in `task-extras.ts` | `tasks.number`; counter per project (in `ops.document_sequences`, series `task:<project>`) | **WRK-12** Each task gets the next number of its project, never reused even after deletion | M | Two tasks created at the same instant get different numbers |
| A2.2 | Several people and watchers (P1) | `task-extras.ts` (`isOnTask`) | **new** `task_assignees`, `task_watchers` | **WRK-13** A task has one main assignee, collaborators and watchers, all project members | S | Adding a non-member returns `NOT_PROJECT_MEMBER` |
| A2.3 | Links, attachments, task relations (P1) | `task-extras.ts`, `task-collab-api.ts` | **new** `task_links`, `task_relations` (waits for, duplicate of, related); attachments in `file_links` | **WRK-14** Links accept http/https only; relations are read from both sides; attachments follow §13.3 | S | A relation shows on both tasks; a `data:` link is refused |
| A2.4 | Own task states per project (P2) | `task-states.ts` | **new** `project_task_states` (name, group, position); `tasks.state_id` | **WRK-15** A project names its states inside the fixed groups (to do, in progress, review, done, cancelled); progress counts the groups; cancelled tasks are closed and leave progress | M | Renaming a state keeps every task's group; deleting a used state moves its tasks |
| A2.5 | Saved task views (P2) | `task-views-api.ts` | **new** `task_views` (project, owner, shared, tab, filters, grouping) | **WRK-16** Views are personal or shared with the project team | S | A shared view is visible to members only |
| A2.6 | Client requests (P3) | `client-requests.ts`, `client-requests-api.ts` | **new** `client_requests` (number, client, project, kind, urgent, status, snoozed until, reason, duplicate of, task, change order, decided at and by) | **WRK-17** A portal contact or the team logs a request; the team accepts it (creates a task, or a draft change order when out of scope, in **one transaction**), snoozes, marks duplicate, rejects with a reason, or reopens | M | Accepting creates exactly one task; the portal sees only its own client's requests |
| A2.7 | Cycles / sprints (P4) | `cycles.ts`, `cycles-api.ts` | **new** `cycles` (project, number, name, start, end, goal, closed at and by, summary); `tasks.cycle_id`; exclusion constraint per project | **WRK-18** Cycles are optional per project, last 1 day to 4 weeks and never overlap; closing moves unfinished tasks to the next cycle or the backlog and freezes a summary | S | An overlapping cycle fails at the database; a closed cycle's summary never changes |
| A2.8 | Repeating tasks (Project extras) | `task-repeat.ts` | `tasks.repeat jsonb`, `tasks.next_task_id` (unique) | **WRK-19** When a repeating task is done, the next one is created **exactly once**, dates moved on and checklist unticked | S | Marking it done twice creates one next task |
| A2.9 | Task bin and archive (Project extras) | `work-projects-api.ts` | `tasks.deleted_at`, `deleted_by` | **WRK-20** Deleted tasks wait 30 days in the project's bin (restore, purge, job); tasks done more than 30 days ago are hidden unless asked | S | A task purged by the job loses its comments and files |
| A2.10 | Project pages and meeting notes (P5) | `project-pages.ts`, `project-pages-api.ts` | **new** `project_pages` (kind page or meeting, title, body, meeting date, attendees, pinned, updated by) | **WRK-21** Pages belong to a project; an action item becomes a task given to the person mentioned, and the line links to it, **in one transaction** | S | Converting the same line twice creates one task |
| A2.11 | Deleting a project with history (audit A1, D8) | `projectHistoryApi`, `deleteProjectApi` | — | **WRK-22** A project with hours, invoices, quotes, expenses, bills, change orders or feedback cannot be deleted (it is closed instead); deleting an empty project removes its tasks, pages, views and bookings in one transaction | M | Deleting *Orbit* returns `PROJECT_HAS_HISTORY` and changes nothing |
| A2.12 | @mentions in task comments (audit A1) | `findMentions`, `listMentionsForApi` | `task_comments.mention_ids` (already listed) | Extend **WRK-05**: each mention creates a notice | S | Covered by NTF-07 |

### A3. Cross-cutting additions

| # | Area | Addition for v2.1 |
|---|---|---|
| A3.1 | Notifications (§13.4) | **NTF-07** (S → proposed M, see B12): the list of notice kinds the inbox needs, from the API contract §5.6: approvals, invoices overdue, documents expiring, tasks late and watched, low ratings, follow-ups due, client-note and task mentions, client requests waiting, stale deals, quotes expiring, supplier bills due, action items from meeting pages |
| A3.2 | Jobs (§17.2) | `bins.purge` (daily: clients and tasks deleted more than 30 days ago), `followups.due` (daily, 08:00 local), `deals.stale`, `quotes.expiring`, `bills.due` (daily) |
| A3.3 | Audit (§16.2) | Add: client deleted / restored / purged / merged, client file added / removed, CRM import run, project deleted, task deleted / restored / purged, shared view created / removed, pipeline stages changed |
| A3.4 | State machines (Annex B) | Add: follow-up (to do ↔ in progress → done → to do), client request (new → accepted / rejected / duplicate / snoozed; any → reopened), cycle (upcoming → running → ended → closed), client (lead → active → archived; any → deleted → restored or purged), task (state changes inside its group mapping; deleted → restored or purged) |
| A3.5 | Permissions (§3.3, §10) | Add to Table 7: `clients:import`, `clients:export`, `projects:delete` (already in the front end's catalogue) |
| A3.6 | Identity (§7.1, §8) | **IAM-18** (C) The lock screen: a member may set a numeric passcode (hashed like a password, rate-limited, `POST /auth/passcode-verify`). It exists in the front end and is missing from the cahier des charges |
| A3.7 | Workspace (§11.1) | `GET /me/workspaces` (front end since backend prep) returns each workspace's plan, feature keys and seats from `platform.workspace_access` (WSP-09, WSP-10) |

## 4. Part B: decisions to settle between the cahier des charges and the API contract v2

The cahier des charges was approved on 16 October; decisions D1–D8 were made on 28 October. Where they disagree, one side must change. The recommendation is given for each item; your choice is recorded in v2.1 §1.2.

> **Decision, 29 October 2026:** all twelve recommendations B1–B12 below are **approved as written**. They are recorded in v2.1 §1.2 and applied in the sections listed in §8.

| # | Topic | Cahier des charges v2.0 | API contract v2 / D1–D8 | Recommendation |
|---|---|---|---|---|
| B1 | Session limits | Members 12 h idle / 30 days; portal 2 h / 7 days; staff 30 min / 12 h (Table 6) | Members 30 min / 12 h; staff 15 min / 8 h (D3) | **D3 for members and staff, keep the portal values.** The lock screen (A3.6) keeps short idle limits convenient. Update Table 6 and IAM-07. |
| B2 | Who must use 2FA | Staff and workspace owners; a workspace may require it for all (IAM-05) | Also admins and accountants (D2) | **D2**: admins and accountants can move money and export data. Update IAM-05. |
| B3 | Password length | 10 characters (IAM-03) | 12 characters (D5) | **12** (NIST 2025). Update IAM-03 and its test ("an 11-character password is refused"). |
| B4 | Routes, hosts and cookies | Three realms: `/app`, `/portal`, `/platform`; cookies `nx_m`, `nx_p`, `nx_s`; console on its own host (ARC-07, ARC-09, Table 6) | One origin, `/v1`, `{ws}` = `/workspaces/:wid` (§2) | **The cahier des charges' realms win, merged with the contract:** `/app/v1/workspaces/:wid/…` and `/portal/v1/…` on the app's domain (D1 holds), `/platform/v1/…` on the console host. The workspace in the path is accepted only after the membership check (TEN-01). Update the contract §2. |
| B5 | Error code format | `UPPER_SNAKE` codes (`INVALID_ICE`, `SEAT_LIMIT`, `STEP_UP_REQUIRED`, `CONFLICT_STALE_VERSION`…) while ARC-08 says they must match the front end's catalogue | The catalogue's `err_…` keys (432, translated into 9 languages) | **The catalogue is the single source.** v2.1 adds Annex F mapping every code it names to its `err_…` key (e.g. `SEAT_LIMIT` → `err_seatsFull`, `CONFLICT_STALE_VERSION` → `err_conflict`, `PLAN_FEATURE` → `upgrade_required`, `PROJECT_HAS_HISTORY` → `err_projectHasHistory`), and the missing keys (`err_stepUpRequired`, `err_lastOwner`, `err_workspaceReadOnly`, `err_idempotencyMismatch`, `err_internal`…) are added to the catalogue with their translations. |
| B6 | Money on the wire | Stored as `bigint` centimes (DAT-05) | JSON in major units with 2 decimals (§2) | **Both, at different layers:** storage in centimes, JSON in major units converted at the HTTP adapter by `packages/core/money` (half-up to the centime), with a property test both ways. The front end stays unchanged. Write it in DAT-05 and the contract §2. |
| B7 | When a quote gets its number | At creation (SAL-01) | At sending (front end, contract §5.5) | **At sending**, like invoices at issue: drafts stay unnumbered, so deleted drafts leave no holes. Update SAL-01 and Annex B. |
| B8 | Upload limits | 25 MB by default; PDF, images, Office, CSV, XML (DOC-02) | Per kind: 20 MB client and task files, 10 MB documents and receipts, 2 MB logo and avatar; SVG and HTML refused (D7) | **D7 limits plus the cahier des charges' type list**; XML only for the server's own UBL files. Update DOC-02. |
| B9 | API keys and webhooks | Out of scope: public-API phase (§2.3) | The front end has a Developer page with keys and webhooks; the contract §12 has rules for them | **Keep them out of v1:** hide the Developer page in production (front end, A3) and mark the contract §12 webhook row "public-API phase". |
| B10 | Portal sign-in | Single-use e-mail link, no password, no 2FA (IAM-12) | Same `/auth/login` decides the realm (§4.1); the demo signs portal contacts in with a password | **The e-mail link** (IAM-12). The front end needs a "send me a sign-in link" screen (C6) and the contract §4.1 a `POST /portal/v1/auth/link` + `GET …/auth/callback`. |
| B11 | Workspace of a request | From the session's active membership (TEN-01, IAM-11) | In the path (`{ws}`) | **Compatible:** keep it in the path for clarity; the server checks it against an active membership and refuses otherwise (403 + audit). Write it this way in TEN-01. |
| B12 | Priority of notices | NTF-05 is Should | The contract §5.6 replaces the bell's 15 lists with one feed | **Must:** without the feed, every page loads 15 full lists (audit M3, §9.2). Raise NTF-05 / NTF-07 to M. |

## 5. Part C: what the cahier des charges requires and the front end does not do yet

These are front-end tasks, found by reading the cahier des charges against the code. They should be planned with A2–A4 or with the backend phase that needs them.

| # | Requirement | Gap in the front end | Pri. | When |
|---|---|---|---|---|
| C1 | SAL-02, SAL-06, SAL-26: quotes and invoices go through the approval rule | Settings lets you set an approval rule for quotes and invoices (`ApprovalSubject.QUOTE`, `INVOICE`), but **nothing applies it**: quotes and invoices have no "pending approval" status and no approver | M | Before phase B1d |
| C2 | §7.2 `approval_rules`: subject *bill* | Supplier bills are reviewed, but "bill" is not an approval subject in Settings (one or two steps, threshold) | S | With C1 |
| C3 | IAM-06: fresh second factor for sensitive actions | No step-up screen (`STEP_UP_REQUIRED`) before changing the company bank details, exporting all data, deleting the workspace, transferring ownership | M | Phase B1b |
| C4 | TRX-04: idempotency key | The API helpers send no `Idempotency-Key` on commands that create a number, money or a file | M | Phase B1d |
| C5 | DAT-11, TRX-06: optimistic locking | Updates don't send the record's `version`; the `err_conflict` message exists but no screen reloads the record | M | Phase B1c |
| C6 | IAM-12: portal sign-in by e-mail link | The sign-in page has no "send me a link" path for client contacts | M | Phase B1e |
| C7 | §8.2 point 5: sessions | No "my devices" list in the profile, and no way for an administrator to sign a member out | S | Phase B1b |
| C8 | IAM-14, AUZ-11: owner rules | No "transfer ownership" action; demoting the last owner has no clear message | S | Phase B1b |

## 6. Part D: facts to correct in the cahier des charges

| # | Where | Says | Now |
|---|---|---|---|
| D1 | §1.1 | 56 API modules expose 314 functions | 56 modules, **362** functions, all mapped in the contract (`api-contract.test.ts`) |
| D2 | §1.1 | 105 test files, about 670 tests | **133** files, **832** tests |
| D3 | Table 9 | About 200 error keys | **432** error keys in 9 languages |
| D4 | Table 9 | The reused rule files | Add `client-history.ts`, `client-filters.ts`, `follow-ups.ts`, `leads.ts`, `crm-import.ts`, `contacts.ts`, `deals.ts`, `task-states.ts`, `task-extras.ts`, `task-repeat.ts`, `task-grouping.ts`, `cycles.ts`, `client-requests.ts`, `project-pages.ts`, `inbox.ts` |
| D5 | Annex C | Traceability to the pre-backend audit and Lot B | Add the full audit (`AUDIT.md`: G-01…G-10, S-01…S-09) and the API contract v2 |
| D6 | Baseline (cover page) | Front end at Lot A11 | Front end after audit fixes A1 and contract v2 (29 October 2026) |

## 7. Part E: effect on the delivery plan (§21.2)

| Phase | v2.0 | Added work | v2.1 |
|---|---|---|---|
| B1b Identity | 2 weeks | Passcode, step-up flows, admin session revoke | 2 |
| B1c Settings, people, relations, work, time | 4 weeks | A1 (12 CRM features) and A2 (12 work features) | **6** |
| B1e Analytics, inbox, files, notifications, portal | 3 weeks | Notice catalogue, mentions, portal e-mail link | **4** |
| Others | 15 weeks | — | 15 |
| **Total** | **24 (30 with 25%)** | | **27 (about 34 with 25%)** |

## 8. Next step: writing v2.1

v2.1 keeps the same structure, style and identifiers, and touches:

| Section | Change |
|---|---|
| Cover, §1.1, §1.2, Table 9, Annex C, Annex E | Baseline, counts, decisions D1–D8 and B1–B12, new rule files, traceability, version history |
| §3.3 Table 7 | Three permissions (A3.5) |
| §7.1, §7.4, §7.5, §7.10 | 14 new tables and about 25 columns (Part A) |
| §8 Table 6, IAM-03, IAM-05, IAM-07, IAM-12, new IAM-18 | B1, B2, B3, B10, A3.6 |
| §11.3, §11.4 | REL-11 to REL-22, WRK-12 to WRK-22 |
| §12.3, §13.3, §13.4 | SAL-01 (B7), DOC-02 (B8), NTF-05/07 (B12, A3.1) |
| §16.2, §17.2, Annex B | Audit events, 5 jobs, 5 state machines (A3) |
| §21.2, Annex D | New plan and requirement counts |
| New Annex F | Error codes → catalogue keys (B5) |

**Order:** A2 (front-end fixes) → ~~your choices on B1–B12~~ approved 29 October → cahier des charges v2.1 → backend phase B1a.
