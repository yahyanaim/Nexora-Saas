# Nexora Projects compared with Plane

Plane (github.com/makeplane/plane, plane.so) is an open-source **project management** tool, so it maps to Nexora's **Projects** module (tasks, milestones, Gantt, workload) rather than to the whole ERP.

Sources, read on 2026-10-20:
- **Community edition:** the code on `main`, meaning the data models in `apps/api/plane/db/models` and the screens in `apps/web/components`.
- **Paid editions (marked "paid"):** taken from what is publicly known about Plane. Its website and docs could not be opened from this environment, so check these rows against plane.so/pricing.

> **Licence:** Plane is AGPL-3.0. Take ideas only and never copy its code, or we would have to publish Nexora's source.

Legend: ✅ done · 🟡 partly · ❌ missing · 🔒 needs the server

## 1. Work items (Plane) and tasks (Nexora)

| Plane | Nexora | Status | Notes |
|---|---|---|---|
| Title, rich-text description with images | Title, plain-text description | 🟡 | Missing: formatting and images. |
| Status, priority (urgent → none), start and target date | Status, priority (low → urgent), start and due date | ✅ | |
| **Several assignees** | One assignee | 🟡 | |
| Labels | Labels | ✅ | |
| Estimates in points or categories | Estimated hours | ✅ | Hours are better for an ERP: they drive cost, billing and workload. |
| **Sub-work items** (real child tasks with their own status and assignee) | Subtasks as a checklist | 🟡 | A checklist is fine for small steps. Child tasks would be needed for bigger work. |
| **Relations**: blocked by, duplicate, relates to, start before, finish before | `dependsOn` (blocked by) | 🟡 | Missing: duplicate, relates to, and the date relations. |
| **Task number** (e.g. WEB-42) | Project code only | ❌ | Easy to add, and useful in comments and e-mails. |
| Attachments and links on a task | — | ❌ | |
| Comments with @mentions, reactions | Comments with @mentions | ✅ | Reactions: optional. |
| **Activity**: every field change (who, from, to) | Task activity (status, assignee, due, estimate, title, labels) | ✅ | |
| **Subscribers** (watch a task to get its notifications) | Notifications to the assignee and mentioned people | 🟡 | |
| Drafts, archive, soft delete with restore | Delete | ❌ | |
| Description version history | — | ❌ | Low priority. |

## 2. Workflow and states

| Plane | Nexora | Status | Notes |
|---|---|---|---|
| **States per project**, named and coloured by the team, in 5 groups (backlog, unstarted, started, completed, cancelled) plus triage | 4 fixed statuses: to do, in progress, review, done | 🟡 | Each team can't use its own steps, e.g. "Waiting for client". |
| **Automations**: auto-archive closed items after N months, auto-close items untouched for N months | — | ❌ | |
| Workflows and approvals on state changes (paid) | Milestone approval by the client or a manager | 🟡 | |

## 3. Layouts and views

| Plane | Nexora | Status |
|---|---|---|
| List | Task list | ✅ |
| Kanban | Task board | ✅ |
| **Spreadsheet** (edit cells inline) | — | ❌ |
| **Calendar** of tasks | Planning calendar (leave, projects), not tasks | 🟡 |
| Gantt | Project Gantt and a timeline across projects | ✅ |
| Group by and sub-group by (state, priority, assignee, label, cycle, module), sort, fields to show | Task filters | 🟡 |
| Saved views, shared with the team or private, favourites | Saved views | 🟡 |
| Workspace views (tasks across all projects) | My work / Today | 🟡 |

## 4. Planning

| Plane | Nexora | Status | Notes |
|---|---|---|---|
| **Cycles** (sprints): dates, progress, **burn-down chart**, move unfinished items to the next cycle | — | ❌ | Useful for teams that work in 1–2 week sprints. |
| **Modules**: group of items with lead, members, status, dates, progress | **Milestones**: due date, budget hours and amount, revenue share, client approval | ✅ | Nexora's milestones are richer because they drive billing. |
| Epics, initiatives (paid) | Projects with phases, portfolio on the projects page | 🟡 | Not needed for now. |
| Teamspaces (paid) | Workspaces, team | 🟡 | |
| Workload, capacity | Workload, resourcing, leave, holidays | ✅ | Nexora goes further. |
| Templates, recurring work items (paid) | Project templates | 🟡 | Missing: recurring tasks (e.g. "monthly report"). |

## 5. Intake, documents, home

| Plane | Nexora | Status | Notes |
|---|---|---|---|
| **Intake**: requests from outside (form, e-mail) wait in a queue; **accept, reject, snooze, mark as duplicate** | — | ❌ | Strong idea for Nexora (see §8). |
| **Pages / Wiki**: rich-text documents per project, AI help, text turned into tasks | Files and documents | ❌ | |
| Home page with widgets, recent items, stickies | Overview, Today, My work | ✅ | Stickies: optional. |
| Command menu and keyboard shortcuts (Power K) | Command palette | 🟡 | Missing: shortcuts such as C to create, / to search. |
| Notifications inbox | Bell and notification centre | ✅ | |

## 6. Data in and out, connections

| Plane | Nexora | Status |
|---|---|---|
| Import from Jira, Linear, Asana, GitHub, CSV | — | ❌ (CSV could come with CRM step 7) |
| Export CSV / Excel | Export CSV / Excel / PDF | ✅ |
| GitHub, GitLab, Slack integrations | — | ❌ 🔒 |
| Webhooks, API tokens | Webhooks screen in Developer | 🟡 🔒 |
| Publish a project publicly (comments, votes) | **Client portal** (progress, approvals, satisfaction) | ✅ — Nexora's portal is better for clients. |
| AI (paid) | — | ❌ 🔒 |

## 7. What Nexora has and Plane doesn't

Clients and billing, project budgets (fixed, hourly, retainer), time tracking with approval, invoices from hours, change orders, profitability and margin per project, project close with snapshot, expenses, health score with override, leave and holidays in workload, milestone approval by the client.

Plane's time tracking, customers and workflows exist only in its paid editions. In Nexora they are core.

## 8. Recommendation

Nexora is an ERP for service companies, so take Plane's **daily task-management comfort**. Keep Nexora's own money side.

**Proposed Projects steps (front end only, each as its own PR, after the CRM steps or between them, your choice):**

1. **P1, richer tasks**
   - task numbers (WEB-42), several assignees, watchers
   - attachments and links
   - relations: blocks, duplicate, relates to
   - rich-text description
2. **P2, own statuses and better views**
   - each project defines its statuses in groups (to do / started / done / cancelled), e.g. "Waiting for client"
   - spreadsheet view with inline editing
   - calendar of tasks
   - group by and sub-group by
   - views shared with the team
3. **P3, Requests (intake) from the client portal**
   - the client sends a request from the portal, and the team accepts, rejects, snoozes or marks it as duplicate
   - accepted, it becomes a task
   - if it is outside the scope, one click creates a **change order** to bill it
   - Nexora is the right place for this because it links clients, scope and billing
4. **P4, Cycles (optional per project)**
   - 1–2 week sprints with burn-down
   - move unfinished tasks to the next sprint
   - capacity taken from workload and leave
5. **P5, Project pages**
   - project wiki and meeting notes in rich text
   - turn a line into a task

**Small additions:** auto-archive done tasks after N months, recurring tasks, keyboard shortcuts, restore deleted tasks.

**Wait for the server:** GitHub/Slack integrations, request intake by e-mail, AI, importing from Jira/Asana.

**Not recommended:** estimate points (hours are better for billing), epics and initiatives (milestones and phases are enough), public boards (the client portal already does this).

**My order:** P1 → P2 → P3. P3 (requests → change orders) is where Nexora can be better than Plane. P4 and P5 only if your teams ask for sprints or a wiki.
