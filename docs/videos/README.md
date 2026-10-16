# Nexora tutorial videos

## Objective

One short tutorial per module, so that each person in a customer company learns **their own job in Nexora** in about 30 seconds, without training or a manual:

- **For whom:** one role per video: the employee, the manager, the accountant, the administrator, the sales person, the client, or the Nexora team. The video is recorded signed in as a demo person with that role, so the menu, the buttons and the numbers are exactly what that role sees.
- **What they learn:** one real task from start to finish ("log your hours", "approve your team's hours", "invoice approved hours"…), shown on the real Nexora screens with real clicks and typing, ending on Nexora's confirmation.
- **Where they are used:** onboarding of a new customer, the help page, the documentation, sales demos and social posts.

## Format of every video

| Part | Length | Content |
| :--- | :--- | :--- |
| Title card | 2 s | Module number, **"For <role>"**, module name, the task |
| Who and why | 2–3 s | "Managers: here's how to…": the role and the goal |
| Steps | 18–22 s | 3 or 4 numbered steps. A badge at the top shows the current step, the spotlight shows where to look, the cursor clicks and types |
| Result | 2–3 s | Nexora's confirmation (a toast, a new status, a figure that changed) |
| End card | 2 s | The next module and who it is for |

Rules: about 65 words of narration; one task only; every step is something the viewer does, not a feature list; the last step ends on a visible result; captions are always on (also as `.srt`).

## Production plan

1. **Pick the task** for the module's role (table below) and check it in the demo: which person signs in, which page, which clicks, what confirms it.
2. **Write the script** in `docs/videos/NN-slug.md`: one line per step, with what happens on screen.
3. **Describe the scenes** in `scripts/videos/modules.mjs`: the sign-in, the narration lines, the steps, the clicks and the typing.
4. **Render** with `node scripts/videos/make-video.mjs NN`: the narration is synthesised, the demo app is recorded, captions are burned in (see `scripts/videos/README.md`).
5. **Review** the frames: each spotlight on the right thing, the result visible, no caption hiding the action, at most 30 seconds. Fix and render again.
6. **Publish**: commit the script and scenes, and send the MP4 and SRT.

## The 40 tutorials

Demo sign-ins: administrator = *Instant Demo Preview*; manager = karim@atlas.example; employee = lina@atlas.example; accountant = yassine@atlas.example; sales = emma@atlas.example; client = claire@orbit.example; Nexora team = *Platform console demo*.

| # | Module | For | Task taught | Status |
| :--- | :--- | :--- | :--- | :--- |
| 01 | My work | Employees | Start your day and log your hours | ✅ [script](01-my-work.md) |
| 02 | Team | Managers | Check your team and approve their hours | ✅ [script](02-team.md) |
| 03 | Workspace settings | Administrators | Set up your company: identity, currency and VAT | Planned |
| 04 | Employees | Administrators | Add an employee and their cost per hour | Planned |
| 05 | Project planning | Managers | Plan tasks and dependencies on the Gantt chart | Planned |
| 06 | Org chart & documents | Administrators | Keep contracts and permits up to date | Planned |
| 07 | Clients | Managers | Add a client with contacts and payment terms | Planned |
| 08 | Projects & tasks | Managers | Create a project and assign its tasks | Planned |
| 09 | Time | Employees | Track your hours with the timer | Planned |
| 10 | Invoicing | Accountants | Invoice the approved hours | Planned |
| 11 | Quotes (devis) | Accountants | Send a quote and turn it into an invoice | Planned |
| 12 | Client portal | Clients | Follow your project and approve a milestone | Planned |
| 13 | KPIs & search | Managers | Compare your team with its targets | Planned |
| 14 | Overheads & custom fields | Administrators | Add running costs and custom fields | Planned |
| 15 | Performance reviews | Employees and managers | Complete a review, from self-rating to goals | Planned |
| 16 | Work inbox | Everyone | Handle everything waiting for you | Planned |
| 17 | Recurring invoices | Accountants | Schedule a monthly retainer invoice | Planned |
| 18 | Receivables | Accountants | Chase overdue invoices with reminders | Planned |
| 19 | Moroccan compliance | Accountants | Send an e-invoice and prepare the VAT return | Planned |
| 20 | Suppliers & bills | Accountants | Enter, approve and pay a supplier bill | Planned |
| 21 | Expenses & profitability | Employees | Submit an expense with its receipt | Planned |
| 22 | Planning | Employees | Request a day off and see it approved | Planned |
| 23 | Analytics | Administrators | Read revenue and margin, and ask Victor | Planned |
| 24 | Deals pipeline | Sales | Move a deal from lead to signature | Planned |
| 25 | Revenue forecast | Administrators | See the income expected each month | Planned |
| 26 | Mobile app | Employees | Log time from your phone | Planned |
| 27 | Client satisfaction | Managers | Read your clients' ratings | Planned |
| 28 | Bank import | Accountants | Match a bank statement to invoices | Planned |
| 29 | Revenue recognition | Accountants | Close the month on fixed-price projects | Planned |
| 30 | Phase budgets & change orders | Managers | Add a change order to a project phase | Planned |
| 31 | Resource planning | Managers | Book people on the coming weeks | Planned |
| 32 | Reports | Accountants | Export a report to Excel or PDF | Planned |
| 33 | Team access | Administrators | Give an employee a login | Planned |
| 34 | My subscription | Administrators | Manage your Nexora plan | Planned |
| 35 | Help & support | Administrators | Ask the Nexora team for help | Planned |
| 36 | Console home & metrics | Nexora team | Read MRR, churn and what needs attention | Planned |
| 37 | Console customers | Nexora team | Start a trial and follow a customer | Planned |
| 38 | Console billing | Nexora team | Bill a customer and record the payment | Planned |
| 39 | Console support desk | Nexora team | Answer a support request | Planned |
| 40 | Console health & incidents | Nexora team | Open an incident and tell customers | Planned |
