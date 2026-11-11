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

Each tutorial is recorded as one demo person of Atlas Consulting (or Nexora), so the menu and the numbers are that role's:

| Role | Demo person | Sign-in |
| :--- | :--- | :--- |
| Employee | Lina Moreau, Senior Developer | lina@atlas.example |
| Manager | Karim Haddad, Engineering Manager | karim@atlas.example |
| Accountant | Yassine Alaoui, Accountant | yassine@atlas.example |
| Administrator | Sara Bennani, Managing Director | sara@atlas.example |
| Sales | Emma Rossi, Account Executive | emma@atlas.example |
| Client | Claire Petit, contact at Orbit | claire@orbit.example |
| Nexora team | Sophia Vance | *Platform console demo* |

Where it fits, the videos tell one story: Lina logs and submits her hours (01), Karim approves them (02), Yassine invoices them (10), chases the payment (18) and matches the bank statement (28).

The steps below are the step badges; the full steps, the page each video starts on and what to check are in [`scripts/videos/modules.mjs`](../../scripts/videos/modules.mjs).

| # | Module | For | Person | Task taught | Steps | Ends on | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 01 | My work | Employees | Lina Moreau | Start your day and log your hours | 1. Check your week 2. Pick your task 3. Log your hours 4. Submit your week | Nexora confirms “10 entries submitted for approval” | ✅ [script](01-my-work.md) |
| 02 | Team | Managers | Karim Haddad | Check your team and approve their hours | 1. Read the cards 2. See what's late 3. Open approvals 4. Approve the week | Nexora confirms “10 entries approved”; hours to review drop from 95 h to 55 h | ✅ [script](02-team.md) |
| 03 | Workspace settings | Administrators | Sara Bennani | Set up your company: identity, currency and VAT | 1. Open Settings 2. Fill in the IDs 3. Pick currency and VAT 4. Save | Settings saved; the company identity appears on invoices | Planned |
| 04 | Employees | Administrators | Sara Bennani | Add an employee and their cost per hour | 1. New employee 2. Set the week 3. Enter the salary 4. Save | The new person in the list, with a cost per hour that includes CNSS, AMO and training tax | Planned |
| 05 | Project planning | Managers | Karim Haddad | Plan tasks and dependencies on the Gantt chart | 1. Open a project 2. Link two tasks 3. Move a task 4. Check the plan | Dates shift on the Gantt chart and a late predecessor is flagged | Planned |
| 06 | Org chart & documents | Administrators | Sara Bennani | Keep contracts and permits up to date | 1. Read the org chart 2. Open Documents 3. Find what expired 4. Renew it | The document is valid again and its alert leaves the Team page | Planned |
| 07 | Clients | Managers | Karim Haddad | Add a client with contacts and payment terms | 1. New client 2. Set the terms 3. Add a contact 4. Save | The client profile with its activity timeline | Planned |
| 08 | Projects & tasks | Managers | Karim Haddad | Create a project and assign its tasks | 1. New project 2. Add tasks 3. Use the board 4. Watch health | The new project card with its health and budget used | Planned |
| 09 | Time | Employees | Lina Moreau | Track your hours with the timer | 1. Pick the work 2. Start the timer 3. Stop it 4. Check the cell | Today's cell shows the timed hours | Planned |
| 10 | Invoicing | Accountants | Yassine Alaoui | Invoice the approved hours | 1. New invoice 2. Group the lines 3. Issue it 4. Download the PDF | A numbered invoice and its branded PDF | Planned |
| 11 | Quotes (devis) | Accountants | Yassine Alaoui | Send a quote and turn it into an invoice | 1. New quote 2. Send it 3. Mark it accepted 4. Convert it | A draft invoice created from the quote | Planned |
| 12 | Client portal | Clients | Claire Petit | Follow your project and approve a milestone | 1. Sign in 2. Follow progress 3. Approve a finished milestone, or ask for changes with a comment 4. Download an invoice | The milestone shows as approved and a short satisfaction survey appears | Planned |
| 13 | KPIs & search | Managers | Karim Haddad | Compare your team with its targets | 1. Open KPIs 2. Read the colours 3. Search 4. Open a result | The page found by search opens | Planned |
| 14 | Overheads & custom fields | Administrators | Sara Bennani | Add running costs and custom fields | 1. Add running costs 2. See the overhead rate 3. Add a custom field 4. Check the client form | Every logged hour carries the overhead, and the new field shows on client forms | Planned |
| 15 | Performance reviews | Employees | Lina Moreau | Rate yourself in your review | 1. Open your review 2. Rate yourself 3. Write a short summary 4. Submit | The review moves to the manager's turn | Planned |
| 16 | Work inbox | Everyone | Karim Haddad | Handle everything waiting for you | 1. Open the bell 2. Read the list 3. Open an item 4. Dismiss what is done | The item is handled and the bell count goes down | Planned |
| 17 | Recurring invoices | Accountants | Yassine Alaoui | Schedule a monthly retainer invoice | 1. New schedule 2. Set the rhythm 3. Save 4. Review the draft, then issue it | A draft ready for review; nothing is issued without a person | Planned |
| 18 | Receivables | Accountants | Yassine Alaoui | Chase overdue invoices with reminders | 1. Read the aging 2. Open an overdue client 3. Check the reminder 4. Send it | The reminder is recorded in the log | Planned |
| 19 | Moroccan compliance | Accountants | Yassine Alaoui | Send an e-invoice and prepare the VAT return | 1. Open an issued invoice 2. Create the e-invoice 3. Mark it sent (simulated until the server exists) 4. Open the VAT return for the period | The e-invoice status is Sent and the VAT due is shown, with the credit carried forward | Planned |
| 20 | Suppliers & bills | Accountants | Yassine Alaoui | Approve and pay a supplier bill | 1. Open a bill entered by a colleague 2. Check it 3. Approve it (never a bill you entered) 4. Record the payment | The bill is paid and its cost is added to the project | Planned |
| 21 | Expenses & profitability | Employees | Lina Moreau | Submit an expense with its receipt | 1. New expense 2. Pick category and project, re-billable to the client or not 3. Add the receipt photo 4. Submit | The expense is submitted for approval | Planned |
| 22 | Planning | Employees | Lina Moreau | Request a day off | 1. New request 2. Pick the dates (half-days allowed) 3. Check your balance 4. Submit | The request is pending and the balance shows it | Planned |
| 23 | Analytics | Administrators | Sara Bennani | Read revenue and margin, and ask Victor | 1. Read the tiles 2. Change the period and the comparison 3. See revenue by client and clients at risk 4. Ask Victor a question | Victor's answer on screen | Planned |
| 24 | Deals pipeline | Sales | Emma Rossi | Move a deal from lead to signature | 1. New deal 2. Drag it 3. Mark it won (a lost deal needs a reason) 4. Read the forecast | The weighted forecast and the win rate update | Planned |
| 25 | Revenue forecast | Administrators | Sara Bennani | See the income expected each month | 1. Pick a horizon 2. Read the stacked chart 3. Hover a month for its detail 4. See the secured share | The month's expected income and its secured share | Planned |
| 26 | Mobile app | Employees | Lina Moreau | Log time from your phone | 1. Open Today on the phone 2. Start the timer, or log time quickly 3. See today's hours against the daily target 4. Snap a receipt | Today's hours updated on the phone | Planned |
| 27 | Client satisfaction | Managers | Karim Haddad | Read your clients' ratings | 1. Find satisfaction on KPIs 2. Open a project's answers 3. Read a client's comment 4. See a low rating (2 stars or less) in your inbox | A low rating shown in the inbox | Planned |
| 28 | Bank import | Accountants | Yassine Alaoui | Match a bank statement to invoices | 1. Upload the bank's CSV statement 2. Review the matches 3. Split or ignore what doesn't match 4. Record the payments | The matched invoices are marked paid, never twice | Planned |
| 29 | Revenue recognition | Accountants | Yassine Alaoui | Close the month on fixed-price projects | 1. Open the revenue recognition report 2. Compare earned and billed, month by month 3. Read work in progress and billed in advance 4. Export the month-end journal entry (3424 / 4491) | The month-end entry is ready to export | Planned |
| 30 | Phase budgets & change orders | Managers | Karim Haddad | Add a change order to a project phase | 1. Open a project's milestones 2. New change order 3. Send it, then approve it 4. See the phase budget grow | The change order (CO-<code>-01) is approved and the phase budget increases | Planned |
| 31 | Resource planning | Managers | Karim Haddad | Book people on the coming weeks | 1. Read 12 weeks of capacity, leave and holidays taken out 2. Book a person on a project, confirmed or tentative 3. Spot over-booked people and open roles 4. Give an open role to a person | The booking appears and over-booking is highlighted | Planned |
| 32 | Reports | Accountants | Yassine Alaoui | Export a report to Excel or PDF | 1. Pick a report 2. Filter it 3. Export to Excel, CSV or PDF 4. Save the view and share it | The file is downloaded and the saved report appears | Planned |
| 33 | Team access | Administrators | Sara Bennani | Give an employee a login | 1. Open Access 2. Pick an employee without a login 3. Give access 4. Set the role | The invitation is sent and the seats counter goes up | Planned |
| 34 | My subscription | Administrators | Sara Bennani | Manage your Nexora plan | 1. Read the plan 2. Switch between monthly and yearly 3. Change plan (never below the seats in use) 4. Download a Nexora invoice | The plan is updated | Planned |
| 35 | Help & support | Administrators | Sara Bennani | Ask the Nexora team for help | 1. New request 2. Follow the conversation 3. Approve Nexora's access 4. End the access when done | A banner shows on every page while Nexora's access is open | Planned |
| 36 | Console home & metrics | The Nexora team | Sophia Vance | Read MRR, churn and what needs attention | 1. Read the tiles 2. Change the period and the comparison 3. Read the charts 4. Open an item from Needs your attention | The item's page opens | Planned |
| 37 | Console customers | The Nexora team | Sophia Vance | Start a trial and follow a customer | 1. Start a trial 2. Open the account 3. Add an internal note 4. Extend the trial once | The customer shows as Trial with its new end date | Planned |
| 38 | Console billing | The Nexora team | Sophia Vance | Bill a customer and record the payment | 1. Open an NX invoice 2. Download the PDF and the e-invoice 3. Record the bank transfer, matched by number and amount 4. Check the reconciliation | The invoice is paid and the reconciliation shows no difference | Planned |
| 39 | Console support desk | The Nexora team | Sophia Vance | Answer a support request | 1. Pick a request and assign it 2. Answer before the target (4, 8, 24 or 72 hours) 3. Ask for support access, with a reason 4. Close the request | The request's status changes and it is not flagged late | Planned |
| 40 | Console health & incidents | The Nexora team | Sophia Vance | Open an incident and tell customers | 1. Read the six service tiles 2. Open an incident 3. Publish the customer notice 4. Resolve it, with a post-mortem for severity 1 and 2 | Customers see the notice until the incident is resolved | Planned |

## To check or build before recording

- **26 Mobile app:** the video tool needs a phone-size screen shown in a phone frame (not built yet).
- **36–40 Console:** the console has its own menu; check where the step badge sits.
- **12 Client portal:** which page a client lands on after signing in.
- **20 Suppliers & bills:** a demo bill entered by someone other than Yassine, so he can approve it.
- **24 Deals pipeline:** Emma's role opens the Deals page.
- **28 Bank import:** a CSV bank statement to upload while recording.
- **35 Help & support:** an access request from Nexora waiting for the company's approval.
- **15 Performance reviews** shows the employee's self-rating only; the manager's part needs a second person and could be an extra video.
