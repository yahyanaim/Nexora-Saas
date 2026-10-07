# Nexora ERP: the ERP for service companies

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-442%20passing-brightgreen?style=flat&logo=vitest)](https://vitest.dev/)
[![Languages](https://img.shields.io/badge/Languages-9%20incl.%20Arabic-0f62fe?style=flat)](#languages)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat)](LICENSE)

**Nexora** is an ERP for service companies: agencies, consultancies, design and video studios, IT services and engineering offices. It follows the whole chain of the business in one place:

**people → clients → projects → hours → invoices → cash → profit**

It replaces several separate tools:
- the timesheet spreadsheet
- the separate invoicing tool
- the HR file
- the "who owes us money" list
- the end-of-month profitability workbook

> **Current version (v3.4):** the complete front end, running on demo data stored in the browser. Every screen, rule and calculation works. Shared multi-user data comes with the server version (Phase 7).

📘 **Full documentation:** open [`documentation/doc.html`](documentation/doc.html) (English) or [`documentation/doc-ar.html`](documentation/doc-ar.html) (العربية). It covers:
- the user manual and role guides
- every module, step by step
- business rules and how figures are calculated
- the analysis and design pack (17 diagrams and specifications)
- the developer guide.

---

## Table of contents

1. [Who it is for](#who-it-is-for)
2. [Modules](#modules)
3. [Roles and permissions](#roles-and-permissions)
4. [Key business rules](#key-business-rules)
5. [Quick start](#quick-start)
6. [Environment variables](#environment-variables)
7. [Commands](#commands)
8. [Project structure](#project-structure)
9. [How the code works](#how-the-code-works)
10. [Adding a feature](#adding-a-feature)
11. [Translations](#languages)
12. [Quality and CI](#quality-and-ci)
13. [Troubleshooting](#troubleshooting)
14. [Roadmap](#roadmap)
15. [Contributing](#contributing)
16. [License](#license)

---

## Who it is for

| Reader | Start with |
| :--- | :--- |
| **Business owner / buyer** | [Modules](#modules), [Key business rules](#key-business-rules), then the *Director guide* in the documentation |
| **Team member, manager, accountant** | The role guides (sections 06–09) in `documentation/doc.html` |
| **Developer / integrator** | [Quick start](#quick-start), [How the code works](#how-the-code-works), then the developer guide (G1–G15) in the documentation |

---

## Modules

| Area | What you can do |
| :--- | :--- |
| **My work** | An employee's home page: today's tasks (overdue → due today → due soon → in progress), hours logged this week against expected hours, leave balance, hours sent back, upcoming leave |
| **Team** | A manager's home page: projects needing attention and the tasks causing it, team workload, pending approvals (hours, leave, expenses), budget usage, last-updated time and refresh |
| **Workspace settings** | Company identity (ICE, IF, RC, Patente, CNSS, checked for Moroccan formats), base currency (MAD by default for a Moroccan company; changing the country follows its currency), VAT due on payment or on invoicing and monthly or quarterly returns, accounting account numbers (CGNC defaults), fiscal year, invoice number format, departments, holidays, leave types, expense categories, labels, approval rules, period lock, data export |
| **Employees** | Roles, departments, managers, statuses (starting → inactive), working days, weekly capacity, rate history with effective dates, cost figures hidden from people without permission. Real cost per hour from the gross salary with Moroccan employer contributions (CNSS, AMO, training tax); CIN and CNSS registration for payroll |
| **Project planning** | Task start dates and finish-to-start dependencies (loops refused, late predecessors flagged); a Gantt tab with dependency arrows, milestones and drag to reschedule; closing a project with a checklist and a frozen profit snapshot (reopen possible); project templates saved from a project and used to start new ones |
| **Org chart & documents** | Reporting tree from each person's manager (search, department filter, away badges). Register of contracts, IDs, permits, certificates and medical checks with expiry statuses and alerts on the Team dashboard |
| **Clients** | Legal details, billing address, currency, invoice language, payment terms, contacts, client rate cards, archive. Duplicate warning on name, ICE and tax ID; credit limit with open balance; contracts (time and materials, fixed price, retainer) with renewal warnings; activity timeline of projects, quotes, invoices, payments, contracts, notes, meetings and calls |
| **Projects & tasks** | Hourly, fixed-price, retainer and internal projects. Board, list, milestones and team views. Labels, subtasks, comments with @mentions, activity history. Automatic health with manual override. Budget alerts at 80% and 100%. Saved filters |
| **Time** | Weekly timesheet, timer, quick log, copy last week, 15-minute rounding, submit → approve or send back, reopening. Rates are frozen at approval |
| **Invoicing** | Invoices from approved hours (grouped by person, task or day), fixed-price share, milestone, retainer, deposit and free-form invoices. Gapless numbering at issue. Several tax rates, withholding tax, multiple currencies, partial payments, credit notes. Professional branded PDF (logo, colour, bank details, VAT per rate, payments, stamps, legal footer) and CSV |
| **Quotes (devis)** | Draft → sent (numbered DEV-YYYY-NNN) → accepted / declined / expired; lines with units and flat rates, discount before VAT, validity and delivery dates; one click to a draft invoice and a fixed-price project; duplicate to revise; Classic (French / Moroccan devis) or Modern PDF |
| **Client portal** | Each client contact can get a login (invite, resend, revoke; unused logins expire after 90 days). The client sees only its own projects with progress and milestones, approves finished milestones or asks for changes with a comment, and downloads its invoices and quotes; staff can preview any client's portal |
| **KPIs and search** | A KPI page compares each person's utilization, on-time tasks, estimate accuracy and revenue with company targets (green / amber / red); admins set the targets and who may see individual figures (self, manager chain or everyone). Ctrl+K searches people, clients, projects, tasks, invoices and quotes, filtered by role. Reports can be saved with their filters and shared with everyone or a role |
| **Overheads and custom fields** | Monthly running costs (rent, software, admin salaries) become an overhead rate per hour (total ÷ team monthly capacity) that every logged hour carries, so project profit and the close snapshot show the real cost. Admins add text, number, date or choice fields (optionally required) to clients, projects and employees; they appear on the forms and profiles |
| **Performance reviews** | HR starts a cycle (e.g. H2 2026) for chosen people; each person's manager is the reviewer. The employee rates five criteria from 1 to 5 with a summary, the reviewer rates them next to the self-rating, writes feedback and goals, and the period's KPIs are frozen; the employee then acknowledges. Only the employee, the reviewer, managers above and admins see a review |
| **Work inbox** | The bell lists what is waiting for the signed-in person: reviews, timesheets, leave and expenses to approve (never their own), overdue invoices, expiring documents and late tasks; each item opens the page where it is handled. Read and dismissed items are remembered per person and workspace |
| **Recurring invoices** | Monthly, quarterly or yearly schedules (retainers, licences, support) that draft the invoice for review; nothing is issued without a person |
| **Receivables** | Open balances by days overdue: not due, 1–30, 31–60, 61–90 and 90+ days. Overdue reminders in 3 levels (default 3, 15 and 30 days late) with an editable message, a switch per client and a log of what was sent |
| **Moroccan compliance** | Invoices can't be issued without the company's ICE and IF or a Moroccan business client's ICE. Each issued invoice has a DGI e-invoice file (UBL 2.1 XML) and a status (to send, sent, accepted, rejected; sending is simulated until the server exists); an invoice sent to the DGI is corrected only by a credit note. VAT return per month or quarter with VAT credit carried forward, and an accounting journal (VT, HA, BQ, CA, OD) on the Moroccan chart of accounts, exported to CSV |
| **Suppliers & bills** | Suppliers with ICE, IF, payment terms and 24-digit RIB. Supplier bills with VAT per line, approval by someone other than the person who entered them, partial payments and overdue tracking; approved bills add their cost to projects, their VAT to deductible VAT and post to the purchases journal |
| **Expenses & profitability** | Expenses with receipts, VAT included and approval, re-billing to clients. Margin and budget use per project, including supplier bills |
| **Planning** | Timeline, calendar, workload against capacity, leave requests and approval, leave balances per type with half-days, carry-over and pro-rating for new hires |
| **Analytics** | Revenue earned, gross margin, utilization and cash collected. Revenue over time against a comparison period, revenue by client, revenue bridge, clients at risk, team capacity and top projects. PDF and CSV report, and the **Victor** assistant |
| **Deals pipeline** | Sales followed from lead to signature on a board (lead, qualified, proposal, negotiation); drag between stages; weighted forecast by chance of winning, win rate, overdue deals; lost deals need a reason; link to the client, owner and quote |
| **Revenue forecast** | Income expected each month (3, 6 or 12 months, before VAT) from invoices still owed, recurring invoices, confirmed bookings × billable rate (except projects already billed by a recurring invoice) and weighted deals; secured share; stacked chart with hover detail and a table |
| **Nexora admin (platform console)** | Seen only by the Nexora team, in its own menu: Customers (companies using Nexora, plan, status, seats, MRR/ARR, invoices, open workspace), Plans (Starter 490 / Business 1 490 / Enterprise 3 990 MAD a month), users, staff, banned accounts, subscriptions, invoices and payments in MAD with 20% VAT, taxes, reports, system issues, roles and sessions |
| **Nexora team console (Lot A1)** | Own menu in four tabs (Customers, Billing, Operations, Team & security), with ERP menus only while viewing a demo workspace behind a "Back to the console" banner; Seven fixed console roles (owner, admin, support, finance, engineering, sales, read-only) with a read-only permission table; Staff limited to the Nexora team (72-hour invitations, two-factor status, role changes and removal confirmed with an authenticator code); team sessions with 30-minute idle and 12-hour limits and revocation; append-only console audit trail with owner-only export; who / role / environment strip on every console page |
| **Console customers (Lot A2)** | Customer lifecycle (trial → active → payment overdue → suspended → cancelled) with allowed transitions only; account page with identity, plan, seats, invoices, internal notes and per-company console history; 14-day trials created by Sales and extendable once; suspensions with reason (read-only workspace + banner for the company), cancellation at period end with undo; users directory (account fields only) with password reset e-mails and suspensions that never leave a company without an administrator; Suspensions page; content Reports page retired |
| **Console billing (Lot A3)** | Plan price versions (owner + code, keep or move at renewal); subscriptions with prorated upgrades and downgrades at renewal (refused below seats in use); NX-YYYY-NNNNN invoices without gaps, VAT per rate, AV credit notes and refunds (second approval above 1,000 MAD); idempotent daily billing jobs (renewals, card collection, reminders days 0/3/7, read-only day 14, suspension day 30); bank transfers matched by invoice number and amount or queued; VAT collected on payments; the cahier des charges reference scenario runs as a test |
| **Console support (Lot A4)** | Help & support page for every company user (requests with conversation; administrators approve, refuse or end Nexora's access); Support desk (assign, answer, status, first-answer targets 4/8/24/72 h with late flag); Support access: sessions with a reason, read-only by default, 60 minutes by default and 24 hours at most, clock from the company's approval, a second owner for write access, a banner on every page of the company while open, and each page the agent views written to both the console audit trail and the company's audit log |
| **Mobile app (PWA)** | Installable on phones (manifest, icons, install card, iPhone steps); Today screen with the timer, today's hours against the daily target and latest entries; home-screen shortcuts (start timer, log time, new expense); receipt photo from the camera kept as a small JPEG; offline page; admins and managers with no projects see the team's day (hours, who logged, running timers, approvals waiting) |
| **Client satisfaction** | Portal survey after each approved milestone and finished project (1–5 stars, 0–10 recommendation, comment); answers on the project, the client profile and the KPI page (average and NPS); ratings of 2 stars or less reach the project manager's inbox |
| **Bank import** | Import the bank's CSV statement (any separator, Moroccan date and amount formats), automatic matching of incoming transfers to open invoices (invoice number, exact amount, client name, due date), split or ignore, payments recorded as bank transfers, never twice |
| **Revenue recognition** | Fixed-price revenue earned as the work progresses (hours logged, tasks done or milestones reached), month by month against billing; work in progress and revenue billed in advance; report and month-end journal entry (3424 / 4491) |
| **Phase budgets and change orders** | Budget hours and amount per milestone with used vs planned and alerts; change orders (draft → sent → approved/declined) that add to the phase and project budget (and to the fixed price billed); numbered CO-<code>-01, audit trail; approved expenses and supplier bills can be linked to a phase and count in its amount |
| **Resource planning** | Book people or open roles on projects by week (confirmed or tentative); 12-week capacity forecast per person with leave and public holidays taken out; over-booked people and open roles highlighted; assign a role to a person later |
| **Accessibility & speed** | Screen-reader names on icon buttons and table headers, clean heading order, Skip to content link, axe-checked main pages; background images in WebP; `documentation/` copied to `public/documentation` on every build and dev start (`scripts/sync-docs.mjs`) |
| **Reports** | 12 standard reports: timesheet detail, utilization, unbilled hours, invoices, receivables aging, expenses, project profitability, VAT return, VAT detail, accounting journal, payroll inputs and revenue recognition (days, leave by type, hours, overtime, expenses to repay, salary and employer contributions). Filter by period, client, project, employee and department. Export to **Excel (.xlsx), CSV and PDF**. Cost columns are hidden from people without permission |

| **Team access** | Every login belongs to an employee: give access, resend the invitation, remove access, change the role (the role sets the permissions). Each account uses a seat of the plan; at least one admin always remains |
| **My subscription** | The company's own Nexora plan, renewal date, seats used, payment method, monthly/yearly switch, upgrade/downgrade (never below the seats in use) and Nexora invoices as PDF |

**Platform console.** The pages from the original starter that manage Nexora itself (all users, staff, banned users, plans, subscriptions, transactions, invoices, taxes, reports, system issues, roles, sessions) are shown only to the Nexora platform team (`platformOperator`). Company users never see them in the menu, and a typed URL shows a "Reserved for the Nexora platform team" screen (`src/lib/permissions/platform.ts`). Employee accounts only see their own workspace, and pages their role does not include show "You don't have access".

---

## Roles and permissions

Each person has a work role. The role grants a set of permissions, and the menu, buttons and columns follow those permissions.

| Role | Main permissions | What they see and do |
| :--- | :--- | :--- |
| **Admin** | everything (`*`) | All pages, settings, overheads, custom fields, KPI targets, review cycles, costs and margins. Never approves their own items |
| **Manager** | employees (read/update), clients, projects, files, `time:track`, `time:approve`, `analytics:view` | Projects, clients, employees and documents; the whole team's timesheets, leave and expenses with approval; Team dashboard, KPIs, reports; reviews their reports. No invoices, costs or settings |
| **Accountant** | employees (read), clients, invoices, transactions, `analytics:view`, `costs:read`, `time:track` | Quotes, invoices, e-invoices, receivables, recurring invoices, suppliers and supplier bills (approve and pay bills entered by others), VAT return, journal, payroll inputs, profitability, reports; their own timesheet, leave, expenses and reviews |
| **Employee** | projects (read), files, `time:track` | My work, their own timesheet, leave, expenses, reviews and KPIs, the projects they work on. Never colleagues' records, rates, invoices or approvals |
| **Client** | projects (read), invoices (read) | The client portal only: their projects and milestones, invoices and quotes |

Without `time:approve`, Timesheets, Expenses and Leave show only the person's own records (the employee picker is locked). The full page-by-page matrix is in chapter 04 of `documentation/doc.html`.

Defined in `src/types/workforce.ts` (`WORK_ROLE_PERMISSIONS`) and checked with `can(user, AdminPermissionsPlatform.X)`.

> ⚠️ These checks only control what the interface shows. Real enforcement belongs on the server (Phase 7).

---

## Key business rules

- **Which rate is used:** the first match in this order:
  1. the person on the client's rate card
  2. the job title on the rate card
  3. the client's rate
  4. the employee's rate on the date of the work.
- **Rates frozen at approval:** approval stores the bill rate and cost rate on each hour. Later rate changes never alter approved or invoiced work.
- **Invoice numbers** are given when the invoice is issued, with no gaps within a fiscal year. Drafts have no number. An issued invoice is corrected with a credit note, never deleted.
- **Period lock:** nothing dated on or before the lock date can be changed.
- **No self-approval** of hours, leave or expenses.
- **Fixed prices** can never be over-billed. **Deposits** are deducted automatically from the next final invoice.
- **Formula neutralization:** every CSV and Excel export escapes values starting with `= + - @` so a spreadsheet cannot run them as formulas.

---

## Quick start

Requirements: **Node.js 20+** and **npm 10+**.

```bash
git clone https://github.com/yahyanaim/Nexora-Saas.git
cd Nexora-Saas
npm install
cp .env.example .env.local
```

In `.env.local`, turn on demo mode:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_DEMO_MODE=true
```

```bash
npm run dev
```

Open http://localhost:3000 and click **Instant Demo Preview**.

Two demo companies are included, **Atlas Consulting** and **Northwind Studio**, each with a year of hours, invoices and payments. Switch between them with the workspace switcher in the top bar.

On **My work**, use the *Viewing as* selector to see the page as any employee.

---

## Environment variables

| Variable | Example | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public URL of the app |
| `NEXT_PUBLIC_APP_NAME` | `Nexora` | Name shown in titles |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `en` | Default language |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | Backend API used by the browser |
| `API_BACKEND_URL` | `http://localhost:4000` | Backend URL used by the server side |
| `JWT_SECRET` | 32+ random characters | Token signing (server version) |
| `NEXT_PUBLIC_DEMO_MODE` | `true` / `false` | Use browser demo data when the backend is unreachable. **Never `true` in production** |
| `NEXT_PUBLIC_ALLOW_DEMO_BUILD` | `false` | Explicitly allow a production build with demo mode (for public demos only) |

Variables are validated with Zod at startup. A production build with demo mode on is refused unless `NEXT_PUBLIC_ALLOW_DEMO_BUILD=true`.

---

## Commands

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Development server (Turbopack) |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests (Vitest, 492 tests) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint, zero warnings allowed |
| `npm run format` | Prettier |
| `npm run i18n:check` | Check that all 9 language files have the same keys |
| `npm run e2e` | Playwright end-to-end tests (see `playwright.config.ts`) |

---

## Project structure

```
src/
├── app/[locale]/dashboard/     Routes – one folder per page, each page.tsx is a thin wrapper
├── components/
│   ├── shared/
│   │   ├── work-*-chunks/      ERP pages: billing, costs, dashboard, planning, projects, reports, settings
│   │   ├── workforce-chunks/   Employees and clients
│   │   ├── navigation/         Menu definition (use-dashboard-nav.tsx)
│   │   └── page-header.tsx     Page hero: breadcrumb, title, description, actions
│   └── ui/                     Design system: button, select, dialog, sheet, dropdown, popover, table…
├── hooks/workforce/            React Query hooks per module (use-work-billing, use-leave…)
├── lib/
│   ├── api/                    Data access – the only layer that knows where data lives
│   ├── workforce/              Pure business rules + their tests
│   │   ├── billing.ts, rates.ts, approvals.ts, time-rules.ts, invoice-builders.ts
│   │   ├── planning.ts, profitability.ts, project-metrics.ts, kpis.ts
│   │   ├── analytics.ts, dashboards.ts, reports.ts
│   │   └── demo-store.ts, *-seed.ts   Browser store and demo data
│   └── utils/                  export-data (CSV), xlsx (Excel writer), sanitize, dates
├── messages/*.json             Texts in 9 languages
├── store/                      Current workspace (Zustand)
└── types/                      Shared types, roles and permissions
documentation/                  User manual and developer guide (HTML, EN + AR)
e2e/                            Playwright tests
scripts/                        prebuild guard, i18n sync check
```

---

## How the code works

Nexora is built in four layers. Each layer only talks to the one directly below it:

```
Page (components/shared/*-chunks)
   ↓ uses
Hook (hooks/workforce)          React Query: caching, loading states, invalidation
   ↓ calls
API function (lib/api)          Today: browser store · Phase 7: HTTP call to the server
   ↓ uses
Business rules (lib/workforce)  Pure functions, no React, no browser, fully tested
```

- **Business rules are pure.** For example, `billing.ts` decides the invoice lines and `rates.ts` picks the rate. They have no React or browser code inside, so the future server can import exactly the same files.
- **API functions are the seam.** Today they read and write a per-workspace store in Local Storage, under keys like `nexora:<collection>:<workspace>`. In Phase 7 each function becomes an HTTP call and the screens do not change.
- **Menus are portalled.** `Select`, `DropdownMenu` and `Popover` render in `<body>` and are positioned next to their trigger, so they are never clipped by cards. Use these components instead of building your own popups.
- **Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, TanStack Query, Zustand, next-intl, Recharts, jsPDF, Vitest and Playwright.

> **Next.js 16 note:** this version has breaking changes compared with older Next.js. Read the guides in `node_modules/next/dist/docs/` before changing routing or rendering code (see `AGENTS.md`).

---

## Adding a feature

The short version is below. The full walkthrough is in section **G6** of the documentation.

1. **Types:** add them in `src/types/`.
2. **Rules:** write pure functions in `src/lib/workforce/<module>.ts` with a `<module>.test.ts` next to them.
3. **Data:** add the API functions in `src/lib/api/` using `createCollection`.
4. **Hooks:** add `useX` / `useCreateX` in `src/hooks/workforce/`.
5. **Page and route:**
   - add the page under `components/shared/work-<module>-chunks/`
   - add a route in `app/[locale]/dashboard/<module>/page.tsx`
   - add a menu entry, with its permission, in `use-dashboard-nav.tsx`.
6. **Texts:** add every new key to all 9 `src/messages/*.json` files, then run `npm run i18n:check`.
7. **Checks:** run `npm run typecheck && npm run lint && npm test`.

---

## Languages

English, Français, Deutsch, Español, العربية (right to left), اردو, हिन्दी, Русский and 中文.

All texts live in `src/messages/<locale>.json`. A missing key in any language fails CI.

---

## Quality and CI

Every pull request runs the following checks (`.github/workflows/ci.yml`):

- type check, lint and translation sync
- 442 unit tests
- production build
- Playwright end-to-end tests
- dependency audit
- a guard that blocks demo mode in production builds

Security already in place:
- HttpOnly cookie sessions
- strict security headers (HSTS, frame-ancestors, COOP)
- sanitized chart CSS
- escaped PDF text
- formula-safe exports

---

## Troubleshooting

| Problem | Fix |
| :--- | :--- |
| A page shows 404 or looks old after `git pull` | Stop the server, run `rm -rf .next`, start it again and hard-refresh the browser |
| Numbers look strange or old | Clear the browser's `nexora:` Local Storage keys (DevTools → Application) |
| "Can't reach the server" in the console | Expected in demo mode: the backend is offline and demo data is used |
| `npm run build` refuses to build | Demo mode is on. Set `NEXT_PUBLIC_DEMO_MODE=false` for production builds |
| `i18n:check` fails | A key exists in `en.json` but not in another language. Add it to all 9 files |

---

## Roadmap

| Phase | Scope | Status |
| :--- | :--- | :--- |
| 0–3 | Fixes, settings, HR, CRM, projects, time, billing, receivables | ✅ Done |
| Analytics | Analytics on ERP data, PDF/CSV report, assistant | ✅ Done |
| 4 | My work and Team dashboards, standard reports, Excel/CSV/PDF export, freshness indicator, phone cards and empty/loading states on every list | ✅ Done |
| 5a | Org chart, documents and contracts with expiry alerts, leave balances with half-days and carry-over | ✅ Done |
| 5b–5d | Quotes, recurring invoices, payment reminders, client contracts, client portal, task dependencies, Gantt, project close, templates | ✅ Done |
| 5 (rest) | CSV import | Planned |
| 6a | KPI targets with traffic lights and per-KPI visibility, search across all records (Ctrl+K), saved and shared reports | ✅ Done |
| 6b | Overhead costs spread over logged hours in project profit; custom fields on clients, projects and employees | ✅ Done |
| 6c | Performance reviews: cycles, self-assessment, reviewer assessment with goals, frozen KPIs, acknowledgement | ✅ Done |
| 6d | Links between modules: owner's employee profile, reviewer picker, work inbox in the bell, reviews on My work and profiles, overhead in the profitability report, history-safe employee deletion, custom fields in search | ✅ Done |
| 6e | Moroccan compliance: ICE/IF/Patente/CNSS, DGI e-invoice file (UBL 2.1) and status, VAT on payments and VAT return, CGNC accounting journal | ✅ Done |
| — | MAD as the default currency for Moroccan companies across the app | ✅ Done |
| 6f | Purchases and payroll: suppliers, supplier bills (VAT, project costs, purchases journal), real cost from the gross salary, monthly payroll inputs | ✅ Done |
| 6g | Forward planning: resource bookings and capacity forecast (✅ 6g.1), deals pipeline (✅ 6g.2), revenue forecast (✅ 6g.3), phase budgets and change orders (✅ 6g.4) | ✅ Done |
| 6 (rest) | Scheduled reports (need email from the server) | Planned |
| 7 | Server version: database, secure sign-in, permissions enforced on the server, files, email, backups | Planned |

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for:
- the branch and commit workflow
- code conventions
- the checklist every pull request must pass.

---

## License

Nexora is **proprietary software**. Copyright © 2026 Yahia Naim, all rights reserved.

- You may run it for evaluation for 30 days.
- Any production or commercial use needs a written licence agreement.

The full terms are in [`LICENSE`](LICENSE). The open-source components Nexora is built on keep their own licenses, listed in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

---

**Author:** Yahia Naim · [github.com/yahyanaim](https://github.com/yahyanaim)
