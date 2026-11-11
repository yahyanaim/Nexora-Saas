/**
 * The 40 module videos: one tutorial of about 30 seconds per module.
 *
 * Each video is for one role in the company (`actor`) and teaches one task
 * (`task`), signed in as a demo person with that role (`person`, `login`),
 * starting on `path`. `steps` (3 or 4, "badge title: what happens") and
 * `result` (the confirmation the video ends on) are the plan; `check` lists
 * what to verify in the demo before recording. A module with `scenes` can be
 * rendered; for the others, the scenes are written from the plan
 * (see docs/videos/README.md).
 *
 * Each scene is one narration line (`say`) and what happens on screen while
 * it is spoken (`run`). Targets are found by their visible text:
 *   "box:Hours this week"  the card or panel around that text
 *   "text:Overdue"         the element showing that text
 *   "css:<selector>"       the first visible element matching the selector
 * `v.step(1, "Check your week")` shows the step at the top of the screen.
 * `v.until("word")` waits until the narrator reaches that word.
 * `warm` lists the other pages the video opens, loaded once before recording.
 */

/** @typedef {{ say: string, run?: (v: any) => Promise<void> }} Scene */

/** Today in the demo, as the timesheet labels its cells (YYYY-MM-DD). */
const today = () => new Date().toLocaleDateString("en-CA")

export const MODULES = [
  {
    n: 1,
    slug: "my-work",
    name: "My work",
    actor: "employees",
    task: "Start your day and log your hours",
    person: "Lina Moreau, Senior Developer",
    steps: [
      "Check your week: the cards show hours still to log, tasks and vacation left",
      "Pick your task: My day lists tasks by urgency, overdue first",
      "Log your hours: Log time, then type today's hours on the task",
      "Submit your week: it goes to Karim, the manager",
    ],
    result: "Nexora confirms “10 entries submitted for approval”",
    // Lina Moreau, Senior Developer: an employee account, so the menu is hers
    login: "lina@atlas.example",
    path: "/dashboard/my-work",
    warm: ["/dashboard/timesheets"],
    /** @type {Scene[]} */
    scenes: [
      {
        say: "Employees: here's how to start your day in Nexora and log your hours.",
        run: async (v) => {
          await v.wait(2200)
          await v.hideCard()
          await v.spot("box:Hello, Lina")
        },
      },
      {
        say: "Step one: open My work. The cards show the hours still to log, your tasks, and your vacation left.",
        run: async (v) => {
          await v.step(1, "Check your week")
          await v.until("hours")
          await v.spot("box:Hours this week")
          await v.until("tasks")
          await v.spot("box:Tasks to focus on")
          await v.until("vacation")
          await v.spot("box:Vacation left")
        },
      },
      {
        say: "Step two: My day lists your tasks by urgency, overdue first.",
        run: async (v) => {
          await v.step(2, "Pick your task")
          await v.clearSpot()
          await v.scrollTo("box:My day")
          await v.spot("box:My day")
          await v.until("overdue")
          await v.spot("text:Overdue")
        },
      },
      {
        say: "Step three: click Log time, then type today's hours on your task.",
        run: async (v) => {
          await v.step(3, "Log your hours")
          await v.clearSpot()
          await v.scrollTo("box:Hello, Lina")
          await v.click("text:Log time")
          await v.waitForHeading("Timesheets")
          const cell = `css:input[aria-label^="Hours for Helio energy dashboard · Production charts on ${today()}"]`
          await v.spot(cell)
          await v.type(cell, "6")
        },
      },
      {
        say: "Step four: submit your week, and Karim, your manager, gets it to approve.",
        run: async (v) => {
          await v.step(4, "Submit your week")
          await v.clearSpot()
          await v.click("text:Submit week")
          await v.wait(700)
          await v.hideCursor()
          // Nexora confirms with a toast: "10 entries submitted for approval"
          await v.spot("css:[data-sonner-toast]")
        },
      },
    ],
  },
  {
    n: 2,
    slug: "team",
    name: "Team",
    actor: "managers",
    task: "Check your team and approve their hours",
    person: "Karim Haddad, Engineering Manager",
    steps: [
      "Read the cards: projects at risk, approvals, team load, budget alerts",
      "See what's late: the project at risk and the late task behind it",
      "Open approvals: Hours to approve",
      "Approve the week: Lina's 40 h",
    ],
    result: "Nexora confirms “10 entries approved”; hours to review drop from 95 h to 55 h",
    // Karim Haddad, Engineering Manager: sees his team, never invoices or costs
    login: "karim@atlas.example",
    path: "/dashboard/team",
    warm: ["/dashboard/time-approvals"],
    /** @type {Scene[]} */
    scenes: [
      {
        say: "Managers: here's how to check on your team and approve their hours in Nexora.",
        run: async (v) => {
          await v.wait(2200)
          await v.hideCard()
          await v.spot("box:Projects at risk, budgets, team workload and approvals waiting.")
        },
      },
      {
        say: "Step one: open Team. The cards show projects at risk, approvals waiting, team load, and budget alerts.",
        run: async (v) => {
          await v.step(1, "Read the cards")
          await v.until("projects")
          await v.spot("box:Projects needing attention")
          await v.until("approvals")
          await v.spot("box:Approvals waiting")
          await v.until("team load")
          await v.spot("box:Team load this week")
          await v.until("budget")
          await v.spot("box:Budget alerts")
        },
      },
      {
        say: "Step two: each project at risk shows its budget used and the late task behind it.",
        run: async (v) => {
          await v.step(2, "See what's late")
          await v.clearSpot()
          await v.scrollTo("box:All projects")
          await v.spot("box:All projects")
          await v.until("late task")
          await v.spot("box:Caused by")
        },
      },
      {
        say: "Step three: click Hours to approve.",
        run: async (v) => {
          await v.step(3, "Open approvals")
          await v.clearSpot()
          await v.scrollTo("box:Hours to approve")
          await v.click("text:Hours to approve")
          await v.waitForHeading("Time approvals")
        },
      },
      {
        say: "Step four: check Lina's week, then click Approve. Her hours are locked and ready to invoice.",
        run: async (v) => {
          await v.step(4, "Approve the week")
          await v.spot("box:Lina Moreau")
          await v.until("click")
          await v.click("text:Approve")
          await v.wait(500)
          await v.hideCursor()
          await v.spot("css:[data-sonner-toast]")
        },
      },
    ],
  },
  // ---- Planned: scenes to write, following the steps below ----------------
  {
    n: 3,
    slug: "workspace-settings",
    name: "Workspace settings",
    actor: "administrators",
    task: "Set up your company: identity, currency and VAT",
    person: "Sara Bennani, Managing Director",
    login: "sara@atlas.example",
    path: "/dashboard/settings",
    steps: [
      "Open Settings: the company identity",
      "Fill in the IDs: ICE, IF and RC, checked for Moroccan formats",
      "Pick currency and VAT: MAD, VAT due on payment or on invoicing",
      "Save: the identity is printed on every invoice",
    ],
    result: "Settings saved; the company identity appears on invoices",
  },
  {
    n: 4,
    slug: "employees",
    name: "Employees",
    actor: "administrators",
    task: "Add an employee and their cost per hour",
    person: "Sara Bennani, Managing Director",
    login: "sara@atlas.example",
    path: "/dashboard/employees",
    steps: [
      "New employee: name, job title, role and manager",
      "Set the week: working days and weekly capacity",
      "Enter the salary: gross salary and CNSS registration",
      "Save: Nexora works out the real cost per hour",
    ],
    result: "The new person in the list, with a cost per hour that includes CNSS, AMO and training tax",
  },
  {
    n: 5,
    slug: "project-planning",
    name: "Project planning",
    actor: "managers",
    task: "Plan tasks and dependencies on the Gantt chart",
    person: "Karim Haddad, Engineering Manager",
    login: "karim@atlas.example",
    path: "/dashboard/projects",
    steps: [
      "Open a project: the Gantt tab",
      "Link two tasks: a finish-to-start dependency",
      "Move a task: drag it to new dates",
      "Check the plan: late predecessors are flagged",
    ],
    result: "Dates shift on the Gantt chart and a late predecessor is flagged",
  },
  {
    n: 6,
    slug: "org-chart-documents",
    name: "Org chart & documents",
    actor: "administrators",
    task: "Keep contracts and permits up to date",
    person: "Sara Bennani, Managing Director",
    login: "sara@atlas.example",
    path: "/dashboard/org-chart",
    warm: ["/dashboard/documents"],
    steps: [
      "Read the org chart: who reports to whom",
      "Open Documents: contracts, permits, medical checks",
      "Find what expired: Omar's work permit",
      "Renew it: a new document with its expiry date",
    ],
    result: "The document is valid again and its alert leaves the Team page",
  },
  {
    n: 7,
    slug: "clients",
    name: "Clients",
    actor: "managers",
    task: "Add a client with contacts and payment terms",
    person: "Karim Haddad, Engineering Manager",
    login: "karim@atlas.example",
    path: "/dashboard/clients",
    steps: [
      "New client: legal name, ICE and tax ID",
      "Set the terms: currency, payment terms, invoice language",
      "Add a contact: name, email and phone",
      "Save: a duplicate name or ICE is flagged",
    ],
    result: "The client profile with its activity timeline",
  },
  {
    n: 8,
    slug: "projects-tasks",
    name: "Projects & tasks",
    actor: "managers",
    task: "Create a project and assign its tasks",
    person: "Karim Haddad, Engineering Manager",
    login: "karim@atlas.example",
    path: "/dashboard/projects",
    steps: [
      "New project: client, type (hourly, fixed price, retainer) and budget",
      "Add tasks: assignee and due date",
      "Use the board: drag a task to In progress",
      "Watch health: budget alerts at 80% and 100%",
    ],
    result: "The new project card with its health and budget used",
  },
  {
    n: 9,
    slug: "time",
    name: "Time",
    actor: "employees",
    task: "Track your hours with the timer",
    person: "Lina Moreau, Senior Developer",
    login: "lina@atlas.example",
    path: "/dashboard/timesheets",
    steps: [
      "Pick the work: project and task in the timer",
      "Start the timer",
      "Stop it: the time is rounded to 15 minutes",
      "Check the cell: the hours land on today",
    ],
    result: "Today's cell shows the timed hours",
  },
  {
    n: 10,
    slug: "invoicing",
    name: "Invoicing",
    actor: "accountants",
    task: "Invoice the approved hours",
    person: "Yassine Alaoui, Accountant",
    login: "yassine@atlas.example",
    path: "/dashboard/client-invoices",
    steps: [
      "New invoice: from approved hours (Lina's week, approved in video 02)",
      "Group the lines: by person, task or day",
      "Issue it: the number is given now, with no gaps",
      "Download the PDF: logo, VAT per rate, bank details",
    ],
    result: "A numbered invoice and its branded PDF",
  },
  {
    n: 11,
    slug: "quotes",
    name: "Quotes (devis)",
    actor: "accountants",
    task: "Send a quote and turn it into an invoice",
    person: "Yassine Alaoui, Accountant",
    login: "yassine@atlas.example",
    path: "/dashboard/quotes",
    steps: [
      "New quote: lines, units, discount before VAT",
      "Send it: numbered DEV-YYYY-NNN",
      "Mark it accepted",
      "Convert it: a draft invoice and a fixed-price project",
    ],
    result: "A draft invoice created from the quote",
  },
  {
    n: 12,
    slug: "client-portal",
    name: "Client portal",
    actor: "clients",
    task: "Follow your project and approve a milestone",
    person: "Claire Petit, contact at Orbit (client)",
    login: "claire@orbit.example",
    path: "/dashboard/portal",
    steps: [
      "Sign in: only Orbit's projects are shown",
      "Follow progress: milestones and percent done",
      "Approve a finished milestone, or ask for changes with a comment",
      "Download an invoice",
    ],
    result: "The milestone shows as approved and a short satisfaction survey appears",
    check: ["Which page a client lands on after signing in"],
  },
  {
    n: 13,
    slug: "kpis-search",
    name: "KPIs & search",
    actor: "managers",
    task: "Compare your team with its targets",
    person: "Karim Haddad, Engineering Manager",
    login: "karim@atlas.example",
    path: "/dashboard/kpis",
    steps: [
      "Open KPIs: utilization, on-time tasks, estimate accuracy, revenue",
      "Read the colours: green, amber or red against company targets",
      "Search: Ctrl+K finds people, clients, projects and invoices",
      "Open a result",
    ],
    result: "The page found by search opens",
  },
  {
    n: 14,
    slug: "overheads-custom-fields",
    name: "Overheads & custom fields",
    actor: "administrators",
    task: "Add running costs and custom fields",
    person: "Sara Bennani, Managing Director",
    login: "sara@atlas.example",
    path: "/dashboard/settings",
    steps: [
      "Add running costs: rent, software, admin salaries",
      "See the overhead rate: total ÷ team capacity, per hour",
      "Add a custom field: a choice field on clients",
      "Check the client form: the field is there",
    ],
    result: "Every logged hour carries the overhead, and the new field shows on client forms",
  },
  {
    n: 15,
    slug: "performance-reviews",
    name: "Performance reviews",
    actor: "employees",
    task: "Rate yourself in your review",
    person: "Lina Moreau, Senior Developer",
    login: "lina@atlas.example",
    path: "/dashboard/reviews",
    steps: [
      "Open your review: H2 2026",
      "Rate yourself: five criteria from 1 to 5",
      "Write a short summary",
      "Submit: it goes to Karim, your reviewer",
    ],
    result: "The review moves to the manager's turn",
    // The manager's part (ratings, feedback, goals) needs a second person: a possible extra video
  },
  {
    n: 16,
    slug: "work-inbox",
    name: "Work inbox",
    actor: "everyone",
    task: "Handle everything waiting for you",
    person: "Karim Haddad, Engineering Manager",
    login: "karim@atlas.example",
    path: "/dashboard/team",
    steps: [
      "Open the bell: what is waiting for you",
      "Read the list: approvals, expiring documents, late tasks",
      "Open an item: it goes to the page where it is handled",
      "Dismiss what is done",
    ],
    result: "The item is handled and the bell count goes down",
  },
  {
    n: 17,
    slug: "recurring-invoices",
    name: "Recurring invoices",
    actor: "accountants",
    task: "Schedule a monthly retainer invoice",
    person: "Yassine Alaoui, Accountant",
    login: "yassine@atlas.example",
    path: "/dashboard/recurring-invoices",
    steps: [
      "New schedule: client, amount and lines",
      "Set the rhythm: monthly, quarterly or yearly",
      "Save: Nexora drafts each invoice on time",
      "Review the draft, then issue it",
    ],
    result: "A draft ready for review; nothing is issued without a person",
  },
  {
    n: 18,
    slug: "receivables",
    name: "Receivables",
    actor: "accountants",
    task: "Chase overdue invoices with reminders",
    person: "Yassine Alaoui, Accountant",
    login: "yassine@atlas.example",
    path: "/dashboard/receivables",
    steps: [
      "Read the aging: not due, 1–30, 31–60, 61–90, 90+ days",
      "Open an overdue client",
      "Check the reminder: its level and message",
      "Send it",
    ],
    result: "The reminder is recorded in the log",
  },
  {
    n: 19,
    slug: "moroccan-compliance",
    name: "Moroccan compliance",
    actor: "accountants",
    task: "Send an e-invoice and prepare the VAT return",
    person: "Yassine Alaoui, Accountant",
    login: "yassine@atlas.example",
    path: "/dashboard/client-invoices",
    warm: ["/dashboard/reports"],
    steps: [
      "Open an issued invoice",
      "Create the e-invoice: the DGI file (UBL 2.1)",
      "Mark it sent (simulated until the server exists)",
      "Open the VAT return for the period",
    ],
    result: "The e-invoice status is Sent and the VAT due is shown, with the credit carried forward",
  },
  {
    n: 20,
    slug: "suppliers-bills",
    name: "Suppliers & bills",
    actor: "accountants",
    task: "Approve and pay a supplier bill",
    person: "Yassine Alaoui, Accountant",
    login: "yassine@atlas.example",
    path: "/dashboard/supplier-bills",
    steps: [
      "Open a bill entered by a colleague",
      "Check it: VAT per line and project",
      "Approve it (never a bill you entered)",
      "Record the payment",
    ],
    result: "The bill is paid and its cost is added to the project",
    check: ["The demo has a bill entered by someone other than Yassine"],
  },
  {
    n: 21,
    slug: "expenses-profitability",
    name: "Expenses & profitability",
    actor: "employees",
    task: "Submit an expense with its receipt",
    person: "Lina Moreau, Senior Developer",
    login: "lina@atlas.example",
    path: "/dashboard/expenses",
    steps: [
      "New expense: amount with VAT included",
      "Pick category and project, re-billable to the client or not",
      "Add the receipt photo",
      "Submit",
    ],
    result: "The expense is submitted for approval",
  },
  {
    n: 22,
    slug: "planning",
    name: "Planning",
    actor: "employees",
    task: "Request a day off",
    person: "Lina Moreau, Senior Developer",
    login: "lina@atlas.example",
    path: "/dashboard/leave",
    steps: [
      "New request: the leave type",
      "Pick the dates (half-days allowed)",
      "Check your balance",
      "Submit",
    ],
    result: "The request is pending and the balance shows it",
  },
  {
    n: 23,
    slug: "analytics",
    name: "Analytics",
    actor: "administrators",
    task: "Read revenue and margin, and ask Victor",
    person: "Sara Bennani, Managing Director",
    login: "sara@atlas.example",
    path: "/dashboard/overview",
    steps: [
      "Read the tiles: revenue earned, gross margin, utilization, cash collected",
      "Change the period and the comparison",
      "See revenue by client and clients at risk",
      "Ask Victor a question",
    ],
    result: "Victor's answer on screen",
  },
  {
    n: 24,
    slug: "deals-pipeline",
    name: "Deals pipeline",
    actor: "sales",
    task: "Move a deal from lead to signature",
    person: "Emma Rossi, Account Executive",
    login: "emma@atlas.example",
    path: "/dashboard/deals",
    steps: [
      "New deal: client, value, chance of winning",
      "Drag it: Proposal, then Negotiation",
      "Mark it won (a lost deal needs a reason)",
      "Read the forecast: weighted value and win rate",
    ],
    result: "The weighted forecast and the win rate update",
    check: ["Emma's role opens the Deals page"],
  },
  {
    n: 25,
    slug: "revenue-forecast",
    name: "Revenue forecast",
    actor: "administrators",
    task: "See the income expected each month",
    person: "Sara Bennani, Managing Director",
    login: "sara@atlas.example",
    path: "/dashboard/forecast",
    steps: [
      "Pick a horizon: 3, 6 or 12 months",
      "Read the stacked chart: invoices owed, recurring, bookings, weighted deals",
      "Hover a month for its detail",
      "See the secured share",
    ],
    result: "The month's expected income and its secured share",
  },
  {
    n: 26,
    slug: "mobile-app",
    name: "Mobile app",
    actor: "employees",
    task: "Log time from your phone",
    person: "Lina Moreau, Senior Developer",
    login: "lina@atlas.example",
    path: "/dashboard/today",
    steps: [
      "Open Today on the phone",
      "Start the timer, or log time quickly",
      "See today's hours against the daily target",
      "Snap a receipt",
    ],
    result: "Today's hours updated on the phone",
    check: ["The video tool needs a phone-size screen in a phone frame (not built yet)"],
  },
  {
    n: 27,
    slug: "client-satisfaction",
    name: "Client satisfaction",
    actor: "managers",
    task: "Read your clients' ratings",
    person: "Karim Haddad, Engineering Manager",
    login: "karim@atlas.example",
    path: "/dashboard/kpis",
    steps: [
      "Find satisfaction on KPIs: average stars and NPS",
      "Open a project's answers",
      "Read a client's comment",
      "See a low rating (2 stars or less) in your inbox",
    ],
    result: "A low rating shown in the inbox",
  },
  {
    n: 28,
    slug: "bank-import",
    name: "Bank import",
    actor: "accountants",
    task: "Match a bank statement to invoices",
    person: "Yassine Alaoui, Accountant",
    login: "yassine@atlas.example",
    path: "/dashboard/bank-import",
    steps: [
      "Upload the bank's CSV statement",
      "Review the matches: invoice number, amount, client",
      "Split or ignore what doesn't match",
      "Record the payments",
    ],
    result: "The matched invoices are marked paid, never twice",
    check: ["A CSV statement file to upload while recording"],
  },
  {
    n: 29,
    slug: "revenue-recognition",
    name: "Revenue recognition",
    actor: "accountants",
    task: "Close the month on fixed-price projects",
    person: "Yassine Alaoui, Accountant",
    login: "yassine@atlas.example",
    path: "/dashboard/reports",
    steps: [
      "Open the revenue recognition report",
      "Compare earned and billed, month by month",
      "Read work in progress and billed in advance",
      "Export the month-end journal entry (3424 / 4491)",
    ],
    result: "The month-end entry is ready to export",
  },
  {
    n: 30,
    slug: "phase-budgets-change-orders",
    name: "Phase budgets & change orders",
    actor: "managers",
    task: "Add a change order to a project phase",
    person: "Karim Haddad, Engineering Manager",
    login: "karim@atlas.example",
    path: "/dashboard/projects",
    steps: [
      "Open a project's milestones: budget used against planned",
      "New change order: hours and amount",
      "Send it, then approve it",
      "See the phase budget grow",
    ],
    result: "The change order (CO-<code>-01) is approved and the phase budget increases",
  },
  {
    n: 31,
    slug: "resource-planning",
    name: "Resource planning",
    actor: "managers",
    task: "Book people on the coming weeks",
    person: "Karim Haddad, Engineering Manager",
    login: "karim@atlas.example",
    path: "/dashboard/resourcing",
    steps: [
      "Read 12 weeks of capacity, leave and holidays taken out",
      "Book a person on a project, confirmed or tentative",
      "Spot over-booked people and open roles",
      "Give an open role to a person",
    ],
    result: "The booking appears and over-booking is highlighted",
  },
  {
    n: 32,
    slug: "reports",
    name: "Reports",
    actor: "accountants",
    task: "Export a report to Excel or PDF",
    person: "Yassine Alaoui, Accountant",
    login: "yassine@atlas.example",
    path: "/dashboard/reports",
    steps: [
      "Pick a report: project profitability",
      "Filter it: period, client, project",
      "Export to Excel, CSV or PDF",
      "Save the view and share it",
    ],
    result: "The file is downloaded and the saved report appears",
  },
  {
    n: 33,
    slug: "team-access",
    name: "Team access",
    actor: "administrators",
    task: "Give an employee a login",
    person: "Sara Bennani, Managing Director",
    login: "sara@atlas.example",
    path: "/dashboard/access",
    steps: [
      "Open Access: who can sign in",
      "Pick an employee without a login",
      "Give access: an invitation, and one seat used",
      "Set the role",
    ],
    result: "The invitation is sent and the seats counter goes up",
  },
  {
    n: 34,
    slug: "my-subscription",
    name: "My subscription",
    actor: "administrators",
    task: "Manage your Nexora plan",
    person: "Sara Bennani, Managing Director",
    login: "sara@atlas.example",
    path: "/dashboard/subscription",
    steps: [
      "Read the plan: renewal date and seats used",
      "Switch between monthly and yearly",
      "Change plan (never below the seats in use)",
      "Download a Nexora invoice",
    ],
    result: "The plan is updated",
  },
  {
    n: 35,
    slug: "help-support",
    name: "Help & support",
    actor: "administrators",
    task: "Ask the Nexora team for help",
    person: "Sara Bennani, Managing Director",
    login: "sara@atlas.example",
    path: "/dashboard/help",
    steps: [
      "New request: subject and message",
      "Follow the conversation",
      "Approve Nexora's access: read-only, 60 minutes by default",
      "End the access when done",
    ],
    result: "A banner shows on every page while Nexora's access is open",
    check: ["The demo has an access request waiting for the company's approval"],
  },
  {
    n: 36,
    slug: "console-home",
    name: "Console home & metrics",
    actor: "the Nexora team",
    task: "Read MRR, churn and what needs attention",
    person: "Sophia Vance, Nexora team",
    login: "console",
    path: "/dashboard/console",
    steps: [
      "Read the tiles: MRR, ARR, churn, trial conversion, money owed",
      "Change the period and the comparison",
      "Read the charts: MRR trend, revenue by plan and by country",
      "Open an item from Needs your attention",
    ],
    result: "The item's page opens",
    check: ["Where the step badge sits with the console's own menu"],
  },
  {
    n: 37,
    slug: "console-customers",
    name: "Console customers",
    actor: "the Nexora team",
    task: "Start a trial and follow a customer",
    person: "Sophia Vance, Nexora team",
    login: "console",
    path: "/dashboard/platform",
    steps: [
      "Start a trial: 14 days",
      "Open the account: plan, seats, health score",
      "Add an internal note",
      "Extend the trial once",
    ],
    result: "The customer shows as Trial with its new end date",
    check: ["Where the step badge sits with the console's own menu"],
  },
  {
    n: 38,
    slug: "console-billing",
    name: "Console billing",
    actor: "the Nexora team",
    task: "Bill a customer and record the payment",
    person: "Sophia Vance, Nexora team",
    login: "console",
    path: "/dashboard/invoices",
    steps: [
      "Open an NX invoice: VAT 20%",
      "Download the PDF and the e-invoice",
      "Record the bank transfer, matched by number and amount",
      "Check the reconciliation",
    ],
    result: "The invoice is paid and the reconciliation shows no difference",
    check: ["Where the step badge sits with the console's own menu"],
  },
  {
    n: 39,
    slug: "console-support",
    name: "Console support desk",
    actor: "the Nexora team",
    task: "Answer a support request",
    person: "Sophia Vance, Nexora team",
    login: "console",
    path: "/dashboard/support-desk",
    steps: [
      "Pick a request and assign it",
      "Answer before the target (4, 8, 24 or 72 hours)",
      "Ask for support access, with a reason",
      "Close the request",
    ],
    result: "The request's status changes and it is not flagged late",
    check: ["Where the step badge sits with the console's own menu"],
  },
  {
    n: 40,
    slug: "console-health",
    name: "Console health & incidents",
    actor: "the Nexora team",
    task: "Open an incident and tell customers",
    person: "Sophia Vance, Nexora team",
    login: "console",
    path: "/dashboard/health",
    warm: ["/dashboard/incidents"],
    steps: [
      "Read the six service tiles",
      "Open an incident: severity, services, customers",
      "Publish the customer notice",
      "Resolve it, with a post-mortem for severity 1 and 2",
    ],
    result: "Customers see the notice until the incident is resolved",
    check: ["Where the step badge sits with the console's own menu"],
  },
]
