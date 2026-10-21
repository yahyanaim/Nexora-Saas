# Nexora CRM compared with Twenty

Twenty (github.com/twentyhq/twenty) calls itself the #1 open-source CRM. This file lists what Twenty does, whether Nexora's CRM already does it, and what is worth adding.

Read on 2026-10-20 from Twenty's `main` branch:
- the user guide in `packages/twenty-docs/user-guide`
- the standard objects in `packages/twenty-server/src/modules`

Nexora's state is the one after CRM step 4 (#112).

> **Licence:** Twenty is AGPL-3.0. Take ideas only and never copy its code: AGPL code inside Nexora would force us to publish Nexora's source.

Legend: ✅ done · 🟡 partly · ❌ missing · 🔒 needs the server (waits for its specifications)

## 1. Records (data model)

| Twenty | Nexora | Status | Notes |
|---|---|---|---|
| **Companies**: name, domain, LinkedIn, annual revenue, address, account owner | **Clients**: name, legal name, ICE, tax ID, address, website, industry, account manager, currency, payment terms, credit limit, rate card, tags, lead source, status | ✅ | Nexora goes further on billing. Missing: LinkedIn, company size, annual revenue. |
| **People** as a record of their own: several e-mails and phones, LinkedIn, job title, city, photo, linked to one company | Contacts live inside the client: one e-mail, one phone, position, role, main contact | 🟡 | Planned in **CRM step 6** (Contacts page). |
| **Opportunities**: amount, close date, stage, probability, owner, point of contact, company | **Deals**: amount, stage, probability, expected close, owner, linked quote, lost reason | ✅ | Missing: point of contact on the deal, stages the company can edit, time spent in each stage. |
| **Tasks** with status (to do, in progress, done), due date, assignee, linked to **several** records | **Follow-ups** (data ready since step 1): title, due date, owner, contact, done or not. Project tasks are separate. | 🟡 | The UI is **CRM step 5**. Twenty's three statuses and its links to a deal or contact are worth copying. |
| **Notes**: rich text, linked to several records | Client notes (note, call, meeting), plain text | 🟡 | Missing: formatting and @mentions on client notes (projects already have mentions). |
| **Attachments** on any record | Files page and contract documents | 🟡 | No "Files" tab on the client page. |
| **Timeline**: automatic history of every change (who changed which field, from what to what) | Client activity (notes, invoices, payments, events) and the global audit log | 🟡 | Field-by-field changes are not shown on the client page. |
| **Custom objects and fields** created from Settings | Fixed fields | ❌ | Heavy work. A lighter "custom fields on clients" could come later. |
| Soft delete with **restore** | Archive (status). Delete is final. | 🟡 | A "Deleted clients" list with restore would be safer. |
| **Merge duplicates** | Duplicate warning when creating a client | 🟡 | Missing: merging two clients into one. |

## 2. Lists, views and pages

| Twenty | Nexora | Status | Notes |
|---|---|---|---|
| Table view with columns to show, hide and reorder | DataTable with column visibility | ✅ | |
| **Saved views** shared with the team or kept private, favourites | Saved views (`savedViewsKey`) | 🟡 | Missing: sharing a view with the team, favourite views. |
| **Kanban** with drag and drop and a total per column (count, sum, average) | Deals board with drag and drop, count and amount per stage | ✅ | Missing: choosing the total (sum, average…), weighted total per stage. |
| **Calendar view** of any dated record | Planning calendar (leave, projects) | 🟡 | Follow-ups on a calendar would fit **step 5**. |
| Filters with operators (contains, before/after, is empty…), **advanced AND/OR groups**, filters on related records | Search, facet filters, status pills | 🟡 | Missing: AND/OR groups, "is empty", relative dates. |
| **Group by** in tables | — | ❌ | e.g. clients by account manager. |
| **Edit cells inline** in the table | Edit in a side form | ❌ | Useful for tags, status and owner. |
| Record page with tabs and widgets, layout editable by admins | Client page with fixed tabs (step 4) and a details panel (step 3) | ✅ / ❌ | Tabs: done. A layout editor is not worth it for an ERP. |
| **Cmd+K** command menu | Command palette that searches clients, projects, invoices… | ✅ | |
| Side panel to open a record without leaving the list | Details panel (step 3) | ✅ | |

## 3. Import and export

| Twenty | Nexora | Status | Notes |
|---|---|---|---|
| Import CSV / XLSX / XLS with a template, **column mapping**, errors fixed in the screen, update existing records (upsert on e-mail or domain), relations (company → people → deals) | — | ❌ | **CRM step 7**. Take the mapping step, editable error rows and upsert from Twenty. |
| Export the current view (visible columns only) | Export selected rows to CSV, Excel/PDF in the shared table | ✅ | |
| Import and export rights per role | `CLIENTS_*` rights | 🟡 | Add separate "Import" and "Export" rights. |

## 4. E-mail, calendar, campaigns 🔒

| Twenty | Nexora | Status |
|---|---|---|
| Connect Gmail / Outlook / IMAP-SMTP; e-mails show on the client and the contact; who can see them (subject only, everything…) | `mailto:` links, bulk BCC e-mail | ❌ 🔒 |
| Calendar sync (Google, Microsoft, CalDAV), meetings on the record | — | ❌ 🔒 |
| Contacts created automatically from e-mails, matched to the company by domain | — | ❌ 🔒 |
| Send e-mail from the CRM with a chosen mailbox | — | ❌ 🔒 |
| **E-mail campaigns** to a list, with your own domain, unsubscribe, bounces | — | ❌ 🔒 |

All of these need the backend (OAuth, mail sync, sending domain), so they wait for the server specifications.

## 5. Automation, AI, dashboards

| Twenty | Nexora | Status | Notes |
|---|---|---|---|
| **Workflows**: triggers (record created, updated or deleted, manual, scheduled, webhook) → actions (create/update/search records, send e-mail, HTTP, code, branches, loops), versions, run history | Built-in automations: overdue reminders, recurring invoices, budget alerts, contract expiry | 🟡 🔒 | A simple rule builder ("when a deal is won → create a project / follow-up") could come later. A full builder needs the server. |
| Ready-made automations: stale deals, tasks due, closed-won | Late follow-ups and deals past their close date in health and the deals tiles | 🟡 | Add an alert for a deal unchanged for N days. |
| **AI agents** and chat on CRM data | — | ❌ 🔒 | |
| **Dashboards** built by users (bar, pie, line, KPI widgets) | Fixed pages: Overview, KPIs, Analytics, Forecast, Reports | 🟡 | Nexora's fixed pages cover the usual needs. A user-built dashboard is optional. |

## 6. Access, settings, platform

| Twenty | Nexora | Status |
|---|---|---|
| Roles with rights per record type, per field and per action | Roles and permissions, money hidden without `invoices:read` | 🟡 🔒 (enforced in the UI only until the server exists) |
| SSO (SAML / OIDC) | — | ❌ 🔒 |
| Public API (REST and GraphQL), webhooks | Webhooks screen in Developer; the API is the backend | 🟡 🔒 |
| Several workspaces, invite members | Workspace switcher, team, invitations | ✅ |
| 20+ languages | 9 languages including Arabic (RTL) | ✅ |

## 7. What Nexora has and Twenty doesn't

Invoices, quotes and credit notes (with PDF and UBL), payments and receivables, recurring invoices and reminders, contracts with renewal, **client health score**, **satisfaction / NPS** from the client portal, client portal, time tracking and billing from hours, projects and profitability per client, rate cards, credit limit.

Nexora is a CRM inside an ERP, so it should not become a copy of Twenty. The useful ideas are the **sales tools** below.

## 8. Recommendation

**Fold into the planned steps (no new steps):**
1. **Step 5, follow-ups**:
   - Twenty-style tasks: to do / in progress / done, assignee, link to a client **and** a deal or contact
   - a calendar view
   - "My work" list and bell (as planned)
2. **Step 6, contacts and leads**:
   - contacts as records of their own: several e-mails and phones, LinkedIn, job title
   - the point of contact on each deal
   - lead conversion as planned
3. **Step 7, import**:
   - CSV and XLSX
   - downloadable template
   - column mapping
   - errors fixed in the screen
   - update existing records on e-mail or ICE (upsert)
   - separate import and export rights

**Possible next steps (front end only, after step 7):**
- **Step 8, pipeline+**:
  - weighted total per stage on the board
  - time in stage and an alert for stale deals
  - stages each company can edit
  - a "won → create project" button
- **Step 9, safety**:
  - field-by-field history on the client page
  - deleted clients that can be restored
  - merge two duplicate clients
- **Step 10, lists+**:
  - inline cell editing (tags, status, owner)
  - group by
  - AND/OR filters
  - views shared with the team
  - a Files tab on the client
  - rich-text notes with @mentions

**Wait for the server specifications:** e-mail and calendar sync, sending from the CRM, campaigns, workflow builder, AI, SSO, public API.

**Not recommended:** custom objects and the record-page layout editor. They cost a lot, and an ERP with fixed accounting rules gains little from them.
