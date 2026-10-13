# Lot B — the real server, in three phases

*Plan only, not started. Written 8 Oct 2026 after Lot A8. The console and the ERP already run every rule of the cahier des charges in the browser (demo data); Lot B moves those rules to a server without changing the screens.*

The front end calls the API modules in `src/lib/api/*`. Each module keeps its function names and signatures; Lot B replaces their bodies with HTTP calls to the server, one module at a time, behind the `NEXT_PUBLIC_DEMO_MODE` switch. The rules already written as pure functions (`src/lib/platform/*`: billing, reconciliation, inbox, lifecycle, metrics) are reused by the server as they are, with their tests.

## Phase B1 — Backend (data and API)

| # | Work | Requirements it closes |
|---|---|---|
| 1 | PostgreSQL schema for the console (customers, staff, sessions, plans and price versions, subscriptions, invoices, credit notes, payments, settlements, refunds, dunning, pro-formas, support, incidents, configuration, data requests, audit) and for the companies' workspaces, with migrations and the demo data as seed | BR-15, NFR-05 |
| 2 | Operator API (`/platform/...`, Table 27) mirroring the API modules; same error messages, so the error catalogue keeps working | §10 |
| 3 | Real sign-in, sessions (30 min idle, 12 h), TOTP two-factor checked on the server, step-up codes | STF-03, STF-04, SEC-03, SEC-04 |
| 4 | The permission matrix (`console-roles.ts`) enforced on every endpoint; the same table drives the screens | SEC-01 |
| 5 | Gap-free numbering (NX, AV, PF, DR) with database sequences per year | INV-01, BR-03 |
| 6 | Scheduled jobs: billing (renewals, dunning, trial end, seats check), daily reconciliation, retention purge (ended trials after 30 days, sessions, support, audit) | SUB-06, PAY-04, PAY-09, CUS-06, SUB-09, AUD-06, D-02, D-07 |
| 7 | Files: generated PDFs and UBL files kept with each invoice; tenant exports stored 7 days | INV-05, AUD-04 |
| 8 | Contract tests: every API module runs its current unit tests against the server | — |

**Exit gate:** the reference scenario (§13.2) passes against the server; the demo switch can be turned off.

## Phase B2 — Operations (money, messages, running the service)

| # | Work | Requirements it closes |
|---|---|---|
| 1 | Card payments through the provider (CMI or another), tokens only; transfer statements imported from the bank | PAY-01, PAY-02, PAY-03 |
| 2 | Provider settlements read from the provider instead of the demo stand-in | PAY-09 |
| 3 | E-mails sent for real from the nine-language templates: trial ending, invoice with PDF and XML, payment failed, read-only warning, suspension, support, incidents and maintenance (Table 28), and the team alerts of §11.2 | CUS-06, INV-05, PAY-04, PAY-05, CUS-08, SUP-03, INC-04, INC-07 |
| 4 | DGI e-invoice sending and status | INV-06 |
| 5 | Monitoring feeding the Health page; incident drafts from real checks | INC-01, INC-02, INC-05 |
| 6 | Daily backups, monthly restore test recorded on the Health page | NFR-08, INC-06 |
| 7 | Staging and production environments, deploys, 99.5% availability target with alerts | NFR-07 |
| 8 | Load test: 1,000 customers, list and account page under 500 ms (p95) | NFR-03 |

**Exit gate:** a real customer can start a trial, pay by card and by transfer, and receive every e-mail; restore test passed.

## Phase B3 — Security

| # | Work | Requirements it closes |
|---|---|---|
| 1 | Database roles: the operator role cannot read the companies' business tables | SEC-02 |
| 2 | Audit table append-only at database level (no update or delete, even for admins) | AUD-02, SEC-09, BR-14 |
| 3 | Support sessions with short-lived credentials limited to one workspace, ending with the session | SEC-10, SUP-05 |
| 4 | Payment webhooks signed and idempotent; no card data stored | SEC-07, SEC-08 |
| 5 | Rate limits on console sign-in and sensitive endpoints | SEC-11 |
| 6 | Secrets in a secret store, rotated yearly | SEC-12 |
| 7 | New-device and new-country alerts sent by e-mail to the owner (the bell already shows them) | SEC-13 |
| 8 | Optional IP allow-list for the console | STF-08 |
| 9 | Server-side watermark on exports; strict content security policy | SEC-14 |
| 10 | Real deletion job for AUD-05 requests (the workspace data, keeping invoices 10 years) | AUD-05, BR-13 |
| 11 | Penetration test by an outside firm, findings fixed before the first paying customer | SEC-15 |
| 12 | Support access only after the company's consent in its own workspace, recorded on both sides | SUP-09, D-09 |

**Exit gate:** the release criteria of §13.3 are met: permission and separation suites pass, no open high finding in the penetration test.

## Still in the front end before Lot B

- ~~A9~~ done (Lot A9): sorting and pagination (UX-05), time zones (UX-09), property test of invoice totals (NFR-05), reference scenario rows 1–13.
- ~~A9b~~ done (Lot A9b): transfer by default (D-01), ended trials suspended after 7 read-only days (D-02), transfer dunning from the due date with one pause (D-03, PAY-04), 30-day Enterprise terms (D-04, INV-08), retention periods shown (D-07), off-boarding ends support sessions and pending approvals (STF-07). Status of every requirement: `documentation/cahier-status.md`.
- ~~A10~~ done (Lot A10): every page under 500 KB of JavaScript, heaviest 419 KB; the build fails above 500 KB (NFR-02, PERF-01, PERF-02). The front end of the cahier des charges is complete; what remains is Lot B and the outside penetration test.
