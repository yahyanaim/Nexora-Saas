# Nexora ERP: the ERP for service companies

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-426%20passing-brightgreen?style=flat&logo=vitest)](https://vitest.dev/)
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

> **Current version (v3.2):** the complete front end, running on demo data stored in the browser. Every screen, rule and calculation works. Shared multi-user data comes with the server version (Phase 7).

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
| **Workspace settings** | Company identity (ICE, tax ID, trade register), base currency, fiscal year, invoice number format, departments, holidays, leave types, expense categories, labels, approval rules, period lock, data export |
| **Employees** | Roles, departments, managers, statuses (starting → inactive), working days, weekly capacity, rate history with effective dates, cost figures hidden from people without permission |
| **Org chart & documents** | Reporting tree from each person's manager (search, department filter, away badges). Register of contracts, IDs, permits, certificates and medical checks with expiry statuses and alerts on the Team dashboard |
| **Clients** | Legal details, billing address, currency, invoice language, payment terms, contacts, client rate cards, archive |
| **Projects & tasks** | Hourly, fixed-price, retainer and internal projects. Board, list, milestones and team views. Labels, subtasks, comments with @mentions, activity history. Automatic health with manual override. Budget alerts at 80% and 100%. Saved filters |
| **Time** | Weekly timesheet, timer, quick log, copy last week, 15-minute rounding, submit → approve or send back, reopening. Rates are frozen at approval |
| **Invoicing** | Invoices from approved hours (grouped by person, task or day), fixed-price share, milestone, retainer, deposit and free-form invoices. Gapless numbering at issue. Several tax rates, withholding tax, multiple currencies, partial payments, credit notes, PDF and CSV |
| **Receivables** | Open balances by days overdue: not due, 1–30, 31–60, 61–90 and 90+ days |
| **Expenses & profitability** | Expenses with receipts and approval, re-billing to clients. Margin and budget use per project |
| **Planning** | Timeline, calendar, workload against capacity, leave requests and approval, leave balances per type with half-days, carry-over and pro-rating for new hires |
| **Analytics** | Revenue earned, gross margin, utilization and cash collected. Revenue over time against a comparison period, revenue by client, revenue bridge, clients at risk, team capacity and top projects. PDF and CSV report, and the **Victor** assistant |
| **Reports** | 7 standard reports: timesheet detail, utilization, unbilled hours, invoices, receivables aging, expenses and project profitability. Filter by period, client, project, employee and department. Export to **Excel (.xlsx), CSV and PDF**. Cost columns are hidden from people without permission |

The platform pages from the original starter are still available: users, plans, subscriptions, files, developer keys, audit logs and sessions.

---

## Roles and permissions

Each person has a work role. The role grants a set of permissions, and the menu, buttons and columns follow those permissions.

| Role | Main permissions | Typical use |
| :--- | :--- | :--- |
| **Admin** | everything (`*`) | Owner, IT |
| **Manager** | employees (read/update), clients, projects, files, `time:track`, `time:approve`, `analytics:view` | Project and team leads |
| **Accountant** | employees (read), clients, invoices, transactions, `analytics:view`, `costs:read` | Finance |
| **Employee** | projects (read), files, `time:track` | Everyone who logs time |
| **Client** | projects (read), invoices (read) | Client portal (Phase 5) |

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
| `npm test` | Unit tests (Vitest, 426 tests) |
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
- 426 unit tests
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
| 5 (rest) | CSV import, templates, client portal, Gantt, quotes, recurring invoices, payment reminders | Planned |
| 6 | Goals and KPIs, reviews, overhead costs, scheduled reports, branding, custom fields, global search | Planned |
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
