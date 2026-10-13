# Cahier des charges — status of every requirement

*Checked on 13 Oct 2026 against `Nexora_Platform_Console_Cahier_des_Charges.pdf` (version 1.0, 7 Oct 2026): same 184 identifiers as `documentation/cahier-des-charges-platform-console.md`. Status of the code after Lot A9b.*

| Mark | Meaning |
|---|---|
| ✅ Done | Works in the console today (demo data), with tests where it holds a rule |
| ✅ Done · server part in B1/B2/B3 | The rule works; the real server must also enforce it, store it or send the e-mail (Lot B, `plan-lot-b-server.md`) |
| ✅ Done · accountant to confirm | Built as decided; the accountant confirms in writing |
| 🟡 Planned A10 | Small front-end work still to do |
| 🔵 Planned B2/B3 | Needs the real server, payment provider or infrastructure |
| 🟣 External | Done by an outside party |
| ⚪ Later | The cahier puts it after the first release |

## Summary

| Status | Count |
|---|---|
| ✅ Done | 155 |
| 🔵 Planned B3 | 9 |
| ✅ Tracked | 7 |
| 🟡 Planned A10 | 3 |
| 🔵 Planned B2 | 3 |
| 🔵 Planned B2/B3 | 2 |
| 🟣 External (B3) | 1 |
| ⚪ Later | 1 |

## Every requirement, decision and objective

| ID | Requirement | Status | Note |
|---|---|---|---|
| OBJ-1 | Every paying customer is invoiced correctly and on time | ✅ Tracked | Renewals invoiced on their date, no numbering gap (tested) |
| OBJ-2 | Overdue payments are recovered quickly | ✅ Tracked | Dunning and recovery figures on Transactions |
| OBJ-3 | No operator reaches customer business data without approval | ✅ Tracked | Company data only through approved support sessions (B3 adds database roles) |
| OBJ-4 | Every console action is traceable | ✅ Tracked | Every action in the audit trail (scenario row 13 tested) |
| OBJ-5 | The team sees revenue and churn without spreadsheets | ✅ Tracked | Metrics reconcile with invoices (tested) |
| OBJ-6 | Incidents are detected before customers report them | ✅ Tracked | Monitoring opens incident drafts (B2 feeds real monitoring) |
| OBJ-7 | The console is usable by every team member | ✅ Tracked | axe check on every console page in CI |
| CUS-01 | The Customers list shows name, city, country, plan, billing period, status, people used against the plan… | ✅ Done |  |
| CUS-02 | Filters by plan, status, country and billing period; search by name, ICE or administrator e-mail | ✅ Done |  |
| CUS-03 | Summary cards: MRR and ARR before VAT, paying customers, trials, people using Nexora, overdue amount | ✅ Done |  |
| CUS-04 | A customer account page shows identity (legal name, ICE, IF, address), administrator, plan, seats,… | ✅ Done |  |
| CUS-05 | An operator (Owner, Admin or Sales) can create a trial for a new company with its administrator's e-mail;… | ✅ Done |  |
| CUS-06 | A trial ends on its end date; the customer chooses a plan or the workspace becomes read-only | ✅ Done · server part in B2 | In-app notices and templates work; B2 sends the e-mails |
| CUS-07 | Status changes follow the lifecycle of Figure 2; any other transition is refused | ✅ Done |  |
| CUS-08 | Suspension records a reason and an expiry, makes the workspace read-only and notifies the customer… | ✅ Done · server part in B2 | In-app notices and templates work; B2 sends the e-mails |
| CUS-09 | Cancellation takes effect at the end of the paid period unless a refund is approved | ✅ Done | At period end, or immediately with a refund (Cancel now) |
| CUS-10 | Internal notes on a customer are visible to the team only and are audited | ✅ Done |  |
| CUS-11 | A health indicator combines payment status, seat usage, last sign-in and open support requests | ✅ Done |  |
| CUS-12 | Demonstration workspaces are flagged and can be opened by the team; real customer workspaces cannot be… | ✅ Done |  |
| PLA-01 | Three plans: Starter (5 people), Business (25 people), Enterprise (unlimited), monthly price before VAT,… | ✅ Done |  |
| PLA-02 | Each plan lists its included features; the same list appears in each customer's My subscription page | ✅ Done |  |
| PLA-03 | A price change creates a new plan version with an effective date; earlier versions stay attached to… | ✅ Done |  |
| PLA-04 | The owner chooses, per price change, whether existing customers move at their next renewal or keep the old… | ✅ Done |  |
| PLA-05 | Only a platform owner can create or change a plan, with a second factor | ✅ Done |  |
| PLA-06 | Each plan shows how many customers use it and its MRR | ✅ Done |  |
| PLA-07 | A plan can be retired for new sales while existing subscriptions continue | ✅ Done |  |
| PLA-08 | Discounts are explicit (percentage or amount, duration, reason) and visible on invoices | ✅ Done |  |
| SUB-01 | Each subscription shows plan, version, billing period, start, next renewal, seats used and included,… | ✅ Done |  |
| SUB-02 | An upgrade takes effect immediately with a prorated charge for the rest of the period (BR-05) | ✅ Done |  |
| SUB-03 | A downgrade takes effect at the next renewal | ✅ Done |  |
| SUB-04 | A downgrade to a plan with fewer seats than the people in place is refused, as in the customer page | ✅ Done |  |
| SUB-05 | A change from monthly to yearly billing starts a new yearly period with credit for the unused monthly days | ✅ Done |  |
| SUB-06 | Renewal creates the invoice on the renewal date and attempts collection | ✅ Done |  |
| SUB-07 | Cancellation at period end and immediate cancellation with refund are both available; the second needs… | ✅ Done |  |
| SUB-08 | Every subscription change is shown in a history with who, when, from and to | ✅ Done |  |
| SUB-09 | Seat usage at 100% notifies the customer administrator and shows on the customer page | ✅ Done · server part in B2 | In-app notices and templates work; B2 sends the e-mails |
| SUB-10 | Operators can apply a temporary seat or feature extension with an expiry and a reason | ✅ Done |  |
| INV-01 | Invoices are numbered sequentially per year without gaps, at issue | ✅ Done · server part in B1 | Gap-free numbering works; B1 moves it to a database sequence |
| INV-02 | An invoice shows Nexora's legal identity (name, ICE, IF, RC, Patente, CNSS, address, bank details) and the… | ✅ Done |  |
| INV-03 | Lines show plan, period, seats, discounts and prorations, with VAT per rate and totals before and after VAT | ✅ Done |  |
| INV-04 | An issued invoice is never edited or deleted; corrections are made by credit note | ✅ Done |  |
| INV-05 | Invoices are generated as PDF and as the electronic invoice file (UBL 2.1) and sent to the customer… | ✅ Done · server part in B2 | PDF and UBL 2.1 for every invoice; B2 e-mails them to the administrator |
| INV-06 | E-invoice status per invoice: to send, sent, accepted with reference, rejected with reason | ✅ Done · server part in B2 | Status per invoice shown; B2 sends to the DGI |
| INV-07 | Invoices appear in the customer's My subscription page with download | ✅ Done |  |
| INV-08 | Due date follows the payment terms (immediate for card, 15 days for transfer, decision D-04) | ✅ Done | Card on issue, transfer 15 days, 30 days for Enterprise by contract (Lot A9b) |
| INV-09 | Finance can export invoices and credit notes for a period to the accountant (CSV, Excel, PDF) | ✅ Done |  |
| INV-10 | A pro-forma can be produced for customers who pay by transfer before activation | ✅ Done | Pro-forma PF-YYYY-NNNN (Lot A8) |
| PAY-01 | Each transaction shows date, customer, invoice, method (card, transfer), amount, status and provider reference | ✅ Done · server part in B2 | Ledger and daily reconciliation work; B2 connects the real payment provider and its settlements |
| PAY-02 | Card payments are collected through the payment provider; card data never reaches Nexora's servers | 🔵 Planned B2/B3 | Card payments through the provider, tokens only (B2), webhooks and data scan (B3) |
| PAY-03 | Bank transfers are matched to invoices by reference and amount; unmatched receipts wait in a queue | ✅ Done |  |
| PAY-04 | A failed payment starts the dunning schedule of BR-08 and sets the customer to "payment overdue" | ✅ Done | Failed card payments and unpaid transfers (from their due date) start dunning; one pause per invoice, up to 15 days (Lot A9b) |
| PAY-05 | Each reminder is recorded on the customer page with its date and channel | ✅ Done · server part in B2 | In-app notices and templates work; B2 sends the e-mails |
| PAY-06 | A successful payment during dunning stops the schedule and restores "active" | ✅ Done |  |
| PAY-07 | Refunds create a credit note and a refund transaction; above 1,000 MAD VAT included they need a second… | ✅ Done |  |
| PAY-08 | Chargebacks are recorded with their reason and reopen the invoice | ✅ Done |  |
| PAY-09 | Daily reconciliation compares invoices, payments and provider settlements and lists differences | ✅ Done · server part in B2 | Ledger and daily reconciliation work; B2 connects the real payment provider and its settlements |
| TAX-01 | VAT rates are configured with effective dates; the standard rate for Nexora's services is 20% | ✅ Done |  |
| TAX-02 | The VAT treatment of a customer depends on its country and status; non-Moroccan customers follow the rule… | ✅ Done · accountant to confirm | Foreign customers invoiced as exported services (D-05), to be confirmed by the accountant |
| TAX-03 | A VAT summary per month or quarter lists collected VAT on payments received, consistent with the… | ✅ Done |  |
| TAX-04 | Withholding or exemptions are recorded with their legal reference | ✅ Done | Exemption reference (CGI art. 92) printed on exported-service invoices and pro-formas |
| USR-01 | The directory shows name, e-mail, company, role in the company, status, two-factor status and last sign-in | ✅ Done |  |
| USR-02 | Search by name, e-mail or company | ✅ Done |  |
| USR-03 | Support can trigger a password-reset e-mail but never sees or sets a password | ✅ Done · server part in B2 | In-app notices and templates work; B2 sends the e-mails |
| USR-04 | A person can be suspended with a reason and an optional expiry; their sessions are revoked at once | ✅ Done · server part in B1 | Works in the console; B1 enforces it on every server endpoint |
| USR-05 | Suspending a company administrator requires that another administrator exists or that the company is… | ✅ Done |  |
| USR-06 | Suspensions and lifts are audited and visible on the person's and the company's page | ✅ Done |  |
| USR-07 | The Reports page and its content-report data are removed | ✅ Done |  |
| USR-08 | Directory exports are limited to platform owners and are audited | ✅ Done |  |
| STF-01 | The Staff page lists Nexora team members only, with console role, two-factor status and last sign-in | ✅ Done |  |
| STF-02 | Inviting a team member requires a platform owner; the invitation expires after 72 hours | ✅ Done |  |
| STF-03 | Two-factor authentication is set up before the first console page opens | ✅ Done |  |
| STF-04 | Console roles follow Table 23; custom roles are not allowed in the first release | ✅ Done |  |
| STF-05 | The Sessions page shows each team session (device, location, start, last activity) with revocation | ✅ Done |  |
| STF-06 | Console sessions expire after 30 minutes of inactivity and 12 hours in total | ✅ Done · server part in B1 | Works in the console; B1 enforces it on every server endpoint |
| STF-07 | Removing a team member revokes sessions, pending approvals and support sessions the same day | ✅ Done | Console sessions, support sessions, pending refunds and prepared deletions end or go back the same moment (Lot A9b) |
| STF-08 | An optional IP allow-list restricts console access | 🔵 Planned B3 | Optional IP allow-list (D-08) |
| SUP-01 | Customers raise support requests from inside Nexora; each has a category, priority, status and conversation | ✅ Done |  |
| SUP-02 | The queue shows open requests by priority and age, with assignment to an agent | ✅ Done |  |
| SUP-03 | An agent requests a support session with reason, scope (read-only by default) and duration (default 60… | ✅ Done · server part in B2 | In-app notices and templates work; B2 sends the e-mails |
| SUP-04 | The customer administrator approves or refuses; without approval no session opens | ✅ Done |  |
| SUP-05 | During a session a banner tells the customer's users that Nexora support has access, and until when | ✅ Done |  |
| SUP-06 | Sessions end at their expiry, when the customer revokes them, or when the agent closes them | ✅ Done |  |
| SUP-07 | Every page the agent opens and every action during a session is written to both the console audit trail… | ✅ Done |  |
| SUP-08 | A write-scoped session (to fix data on request) needs the customer's explicit approval of write scope and… | ✅ Done |  |
| SUP-09 | An emergency session for a security incident requires two team members and is reported to the customer… | 🔵 Planned B3 | Emergency session: two team members, report within 24 h (D-09) |
| SUP-10 | Response-time targets per priority are shown and breaches highlighted | ✅ Done |  |
| INC-01 | A health page shows the state of the API, database, background jobs, file storage, e-mail and payment provider | ✅ Done · server part in B2 | Pages and rules work on demo figures; B2 feeds them from real monitoring and backups |
| INC-02 | Error rates and response times are shown per service and per tenant, without tenant business data | ✅ Done · server part in B2 | Pages and rules work on demo figures; B2 feeds them from real monitoring and backups |
| INC-03 | An incident has a severity, start, affected services and customers, timeline, resolution and post-mortem | ✅ Done |  |
| INC-04 | Customers affected by an incident receive a notice, and a status message appears in their Nexora | ✅ Done · server part in B2 | In-app notices and templates work; B2 sends the e-mails |
| INC-05 | System issues detected by monitoring open an incident draft automatically | ✅ Done · server part in B2 | Pages and rules work on demo figures; B2 feeds them from real monitoring and backups |
| INC-06 | Backups and restore tests are listed with date and result | ✅ Done · server part in B2 | Pages and rules work on demo figures; B2 feeds them from real monitoring and backups |
| INC-07 | Scheduled maintenance is announced to customers at least 48 hours ahead | ✅ Done · server part in B2 | In-app notices and templates work; B2 sends the e-mails |
| AUD-01 | Every state-changing console action writes an event with actor, role, action, target, before, after, time,… | ✅ Done |  |
| AUD-02 | Events are append-only; no role can edit or delete them | ✅ Done · server part in B3 | Append-only in the console; B3 locks the audit table at database level |
| AUD-03 | The audit trail can be filtered by actor, customer, action and period, and exported by platform owners | ✅ Done |  |
| AUD-04 | Customer data-export requests are recorded, fulfilled with the tenant export within 7 days and logged | ✅ Done |  |
| AUD-05 | Account-deletion requests delete the tenant's data after the retention period required for invoices, with… | ✅ Done · server part in B3 | Deletion with two people, invoices kept 10 years; B3 runs the real deletion job |
| AUD-06 | Audit events are kept for at least 5 years | ✅ Done · server part in B1 | Retention ≥ 5 years set and tested; B1 runs the purge job |
| AUD-07 | Sensitive reads (directory export, audit export) are themselves audited | ✅ Done |  |
| MET-01 | MRR, ARR, paying customers, average revenue per customer and seat usage, with month-over-month change | ✅ Done |  |
| MET-02 | MRR movement: new, expansion, contraction, churn and reactivation per month | ✅ Done |  |
| MET-03 | Customer churn and revenue churn per month | ✅ Done |  |
| MET-04 | Trial conversion rate and median days to convert | ✅ Done |  |
| MET-05 | Overdue amount by age (not yet due, 1–30, 31–60, over 60 days) | ✅ Done |  |
| MET-06 | Every metric shows its definition and the period it covers | ✅ Done |  |
| MET-07 | Reports export to CSV, Excel and PDF | ✅ Done |  |
| CFG-01 | Announcements to all customers or a segment (plan, country) with start and end dates | ✅ Done |  |
| CFG-02 | Feature flags per plan or per customer for gradual releases | ✅ Done |  |
| CFG-03 | E-mail templates for billing, trial and support notices, in the nine languages of Nexora | ✅ Done · server part in B2 | In-app notices and templates work; B2 sends the e-mails |
| CFG-04 | Nexora's legal identity and bank details used on invoices are edited in one place by a platform owner | ✅ Done |  |
| CFG-05 | Demonstration workspaces can be reset to their initial data | ✅ Done |  |
| CFG-06 | Configuration changes are audited | ✅ Done |  |
| BR-01 | Seats used = active plus invited accounts in the customer's workspaces | ✅ Done |  |
| BR-02 | A plan's price is read from the plan version attached to the subscription, never from the current price list | ✅ Done |  |
| BR-03 | Invoices are numbered NX-YYYY-NNNNN at issue, sequentially per calendar year | ✅ Done · server part in B1 | Gap-free numbering works; B1 moves it to a database sequence |
| BR-04 | Issued invoices are immutable; corrections use credit notes referencing the original | ✅ Done |  |
| BR-05 | Upgrades are prorated by day; downgrades apply at renewal; a downgrade below seats used is refused | ✅ Done |  |
| BR-06 | VAT is computed per line at the rate in force on the invoice date and rounded per rate | ✅ Done |  |
| BR-07 | VAT is due on payments received (payment regime, the usual one for services); to be confirmed in writing… | ✅ Done · accountant to confirm | VAT on payments received; written confirmation from the accountant (D-11) |
| BR-08 | Dunning after a failed payment: reminders on days 0, 3 and 7, card retries on days 1, 3 and 7; read-only… | ✅ Done |  |
| BR-09 | A trial lasts 14 days (proposed, D-02) and converts only on an explicit plan choice | ✅ Done |  |
| BR-10 | Refunds above 1,000 MAD VAT included need a second team member's approval | ✅ Done |  |
| BR-11 | Support sessions last 60 minutes by default and 24 hours at most, read-only unless write scope is approved | ✅ Done |  |
| BR-12 | No console role reads tenant business tables; support sessions read them through the tenant's own permissions | ✅ Done · server part in B3 | No console screen reads company data outside an approved session; B3 adds the database roles (SEC-02) |
| BR-13 | Invoice records are kept 10 years after the financial year, even when a customer's data is deleted | ✅ Done · server part in B3 | Deletion with two people, invoices kept 10 years; B3 runs the real deletion job |
| BR-14 | Audit events are append-only and kept at least 5 years | ✅ Done · server part in B3 | Append-only in the console; B3 locks the audit table at database level |
| BR-15 | Amounts are stored in MAD with two decimals; no currency conversion in the first release | ✅ Done |  |
| UX-01 | A permanent strip shows the signed-in team member, their role and the environment (production or staging) | ✅ Done |  |
| UX-02 | Every action that changes money, access or status opens a confirmation stating its effect and the customer | ✅ Done |  |
| UX-03 | Actions that need a second factor or a second person say so before the user starts them | ✅ Done |  |
| UX-04 | Amounts always show the currency and whether they include VAT | ✅ Done |  |
| UX-05 | Every table has search, filters, sorting, pagination and export where the role allows | ✅ Done |  |
| UX-06 | The customer account page links to every record about that customer in one place | ✅ Done |  |
| UX-07 | Empty, loading and error states exist on every screen | ✅ Done |  |
| UX-08 | Keyboard users can reach every control; a "Skip to content" link is the first stop | ✅ Done |  |
| UX-09 | Dates show in the team member's time zone with the customer's time zone on hover | ✅ Done |  |
| UX-10 | A visible banner marks any page opened inside a support session | ✅ Done |  |
| SEC-01 | Console endpoints require a platform staff token and enforce Table 23 on the server | ✅ Done · server part in B1 | Works in the console; B1 enforces it on every server endpoint |
| SEC-02 | The operator database role cannot read tenant business tables | 🔵 Planned B3 | Server and database security (roles, short-lived support credentials, rate limits, secret store) |
| SEC-03 | Two-factor authentication is mandatory for every team member | ✅ Done · server part in B1 | Works in the console; B1 enforces it on every server endpoint |
| SEC-04 | Sensitive actions require a fresh second factor (less than 5 minutes old) | ✅ Done · server part in B1 | Works in the console; B1 enforces it on every server endpoint |
| SEC-05 | Two-person approval for refunds above the limit and for data deletion | ✅ Done · server part in B1 | Works in the console; B1 enforces it on every server endpoint |
| SEC-06 | Console sessions: 30 minutes idle, 12 hours absolute, revocable | ✅ Done · server part in B1 | Works in the console; B1 enforces it on every server endpoint |
| SEC-07 | Payment card data never reaches Nexora; only provider tokens are stored | 🔵 Planned B2/B3 | Card payments through the provider, tokens only (B2), webhooks and data scan (B3) |
| SEC-08 | Payment webhooks are signature-verified and idempotent | 🔵 Planned B3 | Signed, idempotent payment webhooks |
| SEC-09 | All console actions are audited; audit events are append-only | ✅ Done · server part in B3 | Append-only in the console; B3 locks the audit table at database level |
| SEC-10 | Support sessions use short-lived tenant-scoped credentials that expire with the session | 🔵 Planned B3 | Server and database security (roles, short-lived support credentials, rate limits, secret store) |
| SEC-11 | Rate limiting on console sign-in and on sensitive endpoints | 🔵 Planned B3 | Server and database security (roles, short-lived support credentials, rate limits, secret store) |
| SEC-12 | Secrets (provider keys, signing keys) are held in a secret store and rotated yearly | 🔵 Planned B3 | Server and database security (roles, short-lived support credentials, rate limits, secret store) |
| SEC-13 | Console activity from a new device or country alerts the owner | ✅ Done · server part in B3 | Owner's bell shows new-device sign-ins; B3 also e-mails the owner |
| SEC-14 | Exports are watermarked with the requester and time | ✅ Done · server part in B3 | Exports carry who and when; B3 adds the server-side watermark |
| SEC-15 | Penetration test of the console before the first paying customer | 🟣 External (B3) | Penetration test by an outside firm before the first paying customer |
| NFR-01 | Accessibility: WCAG 2.2 AA, no critical or serious finding | ✅ Done |  |
| NFR-02 | Speed: console pages under 500 KB of JavaScript | 🟡 Planned A10 | 62 pages at 500–607 KB; the CI fails above 610 KB until the shared shell is split |
| NFR-03 | Speed: list and account page under 500 ms (p95) with 1,000 customers | 🔵 Planned B2 | Load test with 1,000 customers |
| NFR-04 | Reliability: jobs and webhooks idempotent | ✅ Done |  |
| NFR-05 | Correctness: invoice totals recompute to the cent | ✅ Done |  |
| NFR-06 | Languages: console in nine languages | ✅ Done |  |
| NFR-07 | Availability: 99.5% monthly, maintenance announced | 🔵 Planned B2 | Real availability monitoring, daily backups and monthly restore test |
| NFR-08 | Recovery: daily backups, monthly restore test, RPO under 24 h | 🔵 Planned B2 | Real availability monitoring, daily backups and monthly restore test |
| A11Y-01 | Table headers have visible text, not only a hidden label | ✅ Done |  |
| A11Y-02 | Project tabs and console tabs use proper tab roles with arrow-key navigation | ✅ Done |  |
| A11Y-03 | The automated check runs on every console page in continuous integration and blocks critical and serious… | ✅ Done |  |
| A11Y-04 | The "Skip to content" link and heading order rules apply to every console page | ✅ Done |  |
| A11Y-05 | Icon-only buttons in the console have accessible names | ✅ Done |  |
| PERF-01 | The chart library on the Overview page and on console metrics loads only when a chart is shown | 🟡 Planned A10 | Charts already load only when shown; Overview still above 500 KB |
| PERF-02 | A JavaScript budget per page is enforced in the build (500 KB compressed) | 🟡 Planned A10 | 62 pages at 500–607 KB; the CI fails above 610 KB until the shared shell is split |
| PERF-03 | New images use WebP or AVIF with explicit sizes | ✅ Done |  |
| PERF-04 | The documentation copy step stays in the build and start scripts | ✅ Done |  |
| D-01 | How are payments collected? | ✅ Done · server part in B2 | Transfer is the default in the console and in My subscription (Lot A9b); a payment link for card customers until the provider is signed (B2) |
| D-02 | How long is the trial? | ✅ Done · server part in B1 | 14 days, one 7-day extension, read-only at the end, suspended after 7 days read-only (Lot A9b); purge after 30 days is a B1 job |
| D-03 | Which dunning schedule? | ✅ Done | Schedule done; transfers start dunning at the due date; pause once per invoice, up to 15 days, with a reason (Lot A9b) |
| D-04 | Payment terms for bank transfer? | ✅ Done | 15 days for transfers, 30 days for Enterprise by contract (Lot A9b) |
| D-05 | VAT for customers outside Morocco? | ✅ Done · accountant to confirm | Exported service without Moroccan VAT, legal reference printed |
| D-06 | Refund limit without a second approval? | ✅ Done | 1,000 MAD VAT included, second approval above |
| D-07 | How long are records kept? | ✅ Done · server part in B1 | Every period shown on Data requests (Lot A9b); purge jobs in B1 |
| D-08 | IP allow-list for the console? | 🔵 Planned B3 | IP allow-list, off at launch |
| D-09 | Emergency support sessions? | 🔵 Planned B3 | Emergency sessions (SUP-09) |
| D-10 | Dedicated database for Enterprise customers? | ⚪ Later | Dedicated database for Enterprise, on request after the first release |
| D-11 | VAT due on payment or on invoice? | ✅ Done · accountant to confirm | VAT on payments received |

Risks RSK-01 to RSK-10 are covered by the mitigations above (database roles, idempotent jobs, sequences, two-factor, D-05, notices before dunning, transfer by default, e-invoice file built apart from submission, response targets, phased delivery).
