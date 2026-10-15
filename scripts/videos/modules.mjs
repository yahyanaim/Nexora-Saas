/**
 * The 40 module videos: about 30 seconds each, one module per video.
 *
 * A module with `scenes` can be rendered; the others are the plan.
 * Each scene is one narration line (`say`) and what happens on screen while
 * it is spoken (`run`). Targets are found by their visible text:
 *   "box:Hours this week"  the card or panel around that text
 *   "text:Overdue"         the element showing that text
 * `v.until("word")` waits until the narrator reaches that word.
 * `warm` lists the other pages the video opens, loaded once before recording.
 */

/** @typedef {{ say: string, run?: (v: any) => Promise<void> }} Scene */

export const MODULES = [
  {
    n: 1,
    slug: "my-work",
    name: "My work",
    tagline: "The employee's home page",
    // Signs in as an employee, so the menu and the page are what Lina sees
    login: "lina@atlas.example",
    path: "/dashboard/my-work",
    warm: ["/dashboard/timesheets"],
    /** @type {Scene[]} */
    scenes: [
      {
        say: "This is My work: the first page every employee sees in Nexora.",
        run: async (v) => {
          await v.wait(2200)
          await v.hideCard()
          await v.spot("box:Hello, Lina")
        },
      },
      {
        say: "Four cards sum up your week: hours logged, tasks to focus on, vacation left, and hours awaiting approval.",
        run: async (v) => {
          await v.spot("box:Hours this week")
          await v.until("tasks")
          await v.spot("box:Tasks to focus on")
          await v.until("vacation")
          await v.spot("box:Vacation left")
          await v.until("awaiting")
          await v.spot("box:Awaiting approval")
        },
      },
      {
        say: "My day lists your tasks by urgency, overdue first.",
        run: async (v) => {
          await v.clearSpot()
          await v.scrollTo("box:My day")
          await v.spot("box:My day")
          await v.until("overdue")
          await v.spot("text:Overdue")
        },
      },
      {
        say: "My week shows each day's hours against the dashed target line.",
        run: async (v) => {
          await v.spot("box:My week")
        },
      },
      {
        say: "Below, anything sent back to fix, and your upcoming leave.",
        run: async (v) => {
          await v.clearSpot()
          await v.scrollTo("box:Sent back to fix")
          await v.spot("box:Sent back to fix")
          await v.until("upcoming")
          await v.spot("box:Upcoming leave")
        },
      },
      {
        say: "Then one click on Log time, and you're in your timesheet.",
        run: async (v) => {
          await v.clearSpot()
          await v.scrollTo("box:Hello, Lina")
          await v.click("text:Log time")
          await v.waitForHeading("Timesheets")
          await v.hideCursor()
          await v.wait(1000)
        },
      },
    ],
  },
  {
    n: 2,
    slug: "team",
    name: "Team",
    tagline: "The manager's home page",
    // Karim Haddad, Engineering Manager: sees his team, never invoices or costs
    login: "karim@atlas.example",
    path: "/dashboard/team",
    warm: ["/dashboard/time-approvals"],
    /** @type {Scene[]} */
    scenes: [
      {
        say: "This is Team: the home page for every manager in Nexora.",
        run: async (v) => {
          await v.wait(2200)
          await v.hideCard()
          await v.spot("box:Projects at risk, budgets, team workload and approvals waiting.")
        },
      },
      {
        say: "Four cards show what needs you: projects at risk, approvals, team load, and budget alerts.",
        run: async (v) => {
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
        say: "Each project at risk shows its budget used and the late tasks behind it.",
        run: async (v) => {
          await v.clearSpot()
          await v.scrollTo("box:All projects")
          await v.spot("box:All projects")
          await v.until("late tasks")
          await v.spot("box:Caused by")
        },
      },
      {
        say: "Workload compares each person's planned hours with their capacity.",
        run: async (v) => {
          await v.clearSpot()
          await v.scrollTo("box:Team workload this week")
          await v.spot("box:Team workload this week")
        },
      },
      {
        say: "Beside it: approvals waiting, and documents about to expire.",
        run: async (v) => {
          await v.spot("box:Hours to approve")
          await v.until("documents")
          await v.spot("box:Work permit")
        },
      },
      {
        say: "One click on Hours to approve opens your team's timesheets.",
        run: async (v) => {
          await v.clearSpot()
          await v.scrollTo("box:Hours to approve")
          await v.click("text:Hours to approve")
          await v.waitForHeading("Time approvals")
          await v.hideCursor()
          await v.wait(1000)
        },
      },
    ],
  },
  { n: 3, slug: "workspace-settings", name: "Workspace settings", tagline: "Company identity, taxes and rules" },
  { n: 4, slug: "employees", name: "Employees", tagline: "People, rates and real cost per hour" },
  { n: 5, slug: "project-planning", name: "Project planning", tagline: "Dependencies, Gantt and project close" },
  { n: 6, slug: "org-chart-documents", name: "Org chart & documents", tagline: "Reporting lines and expiring papers" },
  { n: 7, slug: "clients", name: "Clients", tagline: "Contacts, contracts and activity" },
  { n: 8, slug: "projects-tasks", name: "Projects & tasks", tagline: "Boards, budgets and health" },
  { n: 9, slug: "time", name: "Time", tagline: "Timesheets, timer and approvals" },
  { n: 10, slug: "invoicing", name: "Invoicing", tagline: "From approved hours to a branded PDF" },
  { n: 11, slug: "quotes", name: "Quotes (devis)", tagline: "From quote to invoice in one click" },
  { n: 12, slug: "client-portal", name: "Client portal", tagline: "What your clients see" },
  { n: 13, slug: "kpis-search", name: "KPIs & search", tagline: "Targets, scores and Ctrl+K" },
  { n: 14, slug: "overheads-custom-fields", name: "Overheads & custom fields", tagline: "The real cost of an hour" },
  { n: 15, slug: "performance-reviews", name: "Performance reviews", tagline: "Self-rating, feedback and goals" },
  { n: 16, slug: "work-inbox", name: "Work inbox", tagline: "Everything waiting for you" },
  { n: 17, slug: "recurring-invoices", name: "Recurring invoices", tagline: "Retainers on autopilot, with a human check" },
  { n: 18, slug: "receivables", name: "Receivables", tagline: "Who owes what, and reminders" },
  { n: 19, slug: "moroccan-compliance", name: "Moroccan compliance", tagline: "ICE, e-invoices, VAT and journal" },
  { n: 20, slug: "suppliers-bills", name: "Suppliers & bills", tagline: "Bills, approvals and payments" },
  { n: 21, slug: "expenses-profitability", name: "Expenses & profitability", tagline: "Receipts, re-billing and margin" },
  { n: 22, slug: "planning", name: "Planning", tagline: "Timeline, calendar, workload and leave" },
  { n: 23, slug: "analytics", name: "Analytics", tagline: "Revenue, margin and Victor" },
  { n: 24, slug: "deals-pipeline", name: "Deals pipeline", tagline: "From lead to signature" },
  { n: 25, slug: "revenue-forecast", name: "Revenue forecast", tagline: "Income expected, month by month" },
  { n: 26, slug: "mobile-app", name: "Mobile app", tagline: "Nexora on your phone" },
  { n: 27, slug: "client-satisfaction", name: "Client satisfaction", tagline: "Stars, NPS and alerts" },
  { n: 28, slug: "bank-import", name: "Bank import", tagline: "Statements matched to invoices" },
  { n: 29, slug: "revenue-recognition", name: "Revenue recognition", tagline: "Fixed-price revenue as work progresses" },
  { n: 30, slug: "phase-budgets-change-orders", name: "Phase budgets & change orders", tagline: "Budgets per milestone" },
  { n: 31, slug: "resource-planning", name: "Resource planning", tagline: "Bookings and 12-week capacity" },
  { n: 32, slug: "reports", name: "Reports", tagline: "12 reports to Excel, CSV and PDF" },
  { n: 33, slug: "team-access", name: "Team access", tagline: "Logins, roles and seats" },
  { n: 34, slug: "my-subscription", name: "My subscription", tagline: "Your Nexora plan and invoices" },
  { n: 35, slug: "help-support", name: "Help & support", tagline: "Requests and support access" },
  { n: 36, slug: "console-home", name: "Console home & metrics", tagline: "MRR, churn and what needs attention" },
  { n: 37, slug: "console-customers", name: "Console customers", tagline: "Lifecycle, trials and suspensions" },
  { n: 38, slug: "console-billing", name: "Console billing", tagline: "Plans, subscriptions and NX invoices" },
  { n: 39, slug: "console-support", name: "Console support desk", tagline: "Tickets, targets and sessions" },
  { n: 40, slug: "console-health", name: "Console health & incidents", tagline: "Services, backups and notices" },
]
