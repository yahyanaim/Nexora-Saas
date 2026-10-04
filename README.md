# Nexora ERP — ERP for service companies

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-398%20passing-brightgreen?style=flat&logo=vitest)](https://vitest.dev/)
[![Languages](https://img.shields.io/badge/Languages-9%20incl.%20Arabic-0f62fe?style=flat)](#languages)

**Nexora** is an ERP for service companies — agencies, consultancies, design and video studios, IT services and engineering offices. It follows the whole chain of the business in one place:

**people → clients → projects → hours → invoices → cash → profit**

It replaces the timesheet spreadsheet, the separate invoicing tool, the HR file, the "who owes us money" list and the end-of-month profitability workbook.

> **Current version (v3.0):** the complete front end, running on demo data stored in the browser. Every screen, rule and calculation works; shared multi-user data arrives with the server version (Phase 7).

📘 **Documentation:** open [`documentation/doc.html`](documentation/doc.html) (English) or [`documentation/doc-ar.html`](documentation/doc-ar.html) (العربية) — user manual, role guides, every module step by step, business rules, diagrams, developer & integration guide and roadmap.

---

## Modules

| Area | What you can do |
| :--- | :--- |
| **Workspace settings** | Company identity (ICE, tax ID, trade register), base currency, fiscal year, invoice number format, departments, holidays, leave types, expense categories, labels, approval rules, period lock, data export |
| **Employees** | Roles, departments, managers, statuses (starting → inactive), working days, weekly capacity, dated rate history, cost visibility by permission |
| **Clients** | Legal details, billing address, currency, invoice language, payment terms, contacts, client rate cards, archive |
| **Projects & tasks** | Hourly, fixed-price, retainer and internal projects; board, list, milestones, team; labels, subtasks, comments with @mentions, activity history; automatic health with override; budget alerts at 80% / 100%; saved filters |
| **Time** | Weekly timesheet, timer, quick log, copy last week, 15-minute rounding, submit → approve / send back, reopening, rates frozen at approval |
| **Invoicing** | From approved hours (grouped by person, task or day), fixed share, milestone, retainer, deposit and free invoices; gapless numbering at issue; several tax rates, withholding, currencies; partial payments; credit notes; PDF; CSV exports |
| **Receivables** | Open balances by lateness (not due, 1–30, 31–60, 61–90, 90+ days) |
| **Expenses & profitability** | Expenses with receipts and approval, re-billing to clients; margin and budget use per project |
| **Planning** | Timeline, calendar, workload against capacity, leave requests and approval |
| **Analytics** | Revenue earned, gross margin, utilization, cash collected; revenue over time vs a comparison period; revenue by client; revenue bridge; clients at risk; team capacity; top projects; PDF / CSV report; the **Victor** assistant |

Platform pages from the original starter (users, plans, subscriptions, files, developer keys, audit logs, sessions) are still available.

---

## Key business rules

- **Rate choice:** person on the client's rate card → job title on the rate card → client rate → employee rate on the date of the work.
- **Rate freeze:** approval stores the bill and cost rate on each hour; later rate changes never alter approved or invoiced work.
- **Invoice numbers** are given at issue, gapless per fiscal year; drafts have no number; issued invoices are corrected with credit notes, never deleted.
- **Period lock:** nothing on or before the lock date can be changed.
- **No self-approval** of hours, leave or expenses.
- **Fixed prices** can never be over-billed; **deposits** are deducted automatically on the next final invoice.

---

## Quick start

Requirements: Node.js 20+, npm 10+.

```bash
git clone https://github.com/yahyanaim/Nexora-Saas.git
cd Nexora-Saas
npm install
cp .env.example .env.local
```

Set in `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_DEMO_MODE=true
```

```bash
npm run dev
```

Open http://localhost:3000 and click **Instant Demo Preview**. Two demo companies are included (Atlas Consulting and Northwind Studio) with a year of hours, invoices and payments; switch between them with the workspace switcher in the top bar.

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server (demo mode is refused on purpose) |
| `npx vitest run` | Unit tests (398) |
| `npx tsc --noEmit` | Type check |
| `npm run lint` | Lint |
| `node scripts/check-i18n-sync.mjs` | Check all language files are complete |
| `npm run e2e` | Playwright end-to-end tests (see `playwright.config.ts`) |

**Troubleshooting:** a page shows 404 or looks old after a pull → stop the server, `rm -rf .next`, start again and hard-refresh. Numbers look strange → clear the browser's `nexora:` Local Storage keys.

---

## Architecture

```
src/
├── app/[locale]/dashboard/   Routes (one folder per page)
├── components/
│   ├── shared/*-chunks/      Pages: tables, side panels, forms
│   └── ui/                   Design system components
├── hooks/workforce/          React Query hooks per module
├── lib/
│   ├── api/*-api.ts          Data access — the seam to the future backend
│   └── workforce/            Pure business rules (billing, rates, approvals, planning, KPIs, analytics)
├── messages/*.json           Texts in 9 languages
├── store/                    Current workspace (Zustand)
└── types/                    Shared types
```

- **Business rules are pure and tested** — no React, browser or database inside `src/lib/workforce`, so the server will reuse exactly the same rules.
- **API functions are the only data access.** Today they use a per-workspace browser store (`nexora:<collection>:<workspace>`); in Phase 7 each one becomes a call to the server and the screens do not change.
- Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, TanStack Query, Zustand, next-intl, Recharts, jsPDF, Vitest, Playwright.

## Languages

English, Français, Deutsch, Español, العربية (right to left), اردو, हिन्दी, Русский, 中文.

## Quality

Every pull request runs: type check, lint, translation sync, 398 unit tests, production build, Playwright end-to-end tests, dependency audit, and a guard that blocks demo mode in production builds.

---

## Roadmap

| Phase | Scope | Status |
| :--- | :--- | :--- |
| 0–3 | Fixes, settings, HR, CRM, projects, time, billing, receivables | ✅ Done |
| Analytics | Analytics on ERP data, reports, assistant | ✅ Done |
| 4 | Manager and employee dashboards, standard reports, Excel export, mobile tables | Next |
| 5 | Org chart, leave balances, documents and contracts, CSV import, client portal, Gantt, quotes, recurring invoices, reminders | Planned |
| 6 | Goals and KPIs, reviews, overhead costs, scheduled reports, branding, custom fields, global search | Planned |
| 7 | Server version: database, secure sign-in and permissions, files, email, backups | Planned |

---

**Author:** Yahia Naim · [github.com/yahyanaim](https://github.com/yahyanaim)
