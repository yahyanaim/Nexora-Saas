/**
 * The 40 module videos: one tutorial of about 30 seconds per module.
 *
 * Each video is for one role in the company (`actor`) and teaches one task
 * (`task`), signed in as that person in the demo. A module with `scenes` can
 * be rendered; the others are the plan (see docs/videos/README.md).
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
  { n: 3, slug: "workspace-settings", name: "Workspace settings", actor: "administrators", task: "Set up your company: identity, currency and VAT" },
  { n: 4, slug: "employees", name: "Employees", actor: "administrators", task: "Add an employee and their cost per hour" },
  { n: 5, slug: "project-planning", name: "Project planning", actor: "managers", task: "Plan tasks and dependencies on the Gantt chart" },
  { n: 6, slug: "org-chart-documents", name: "Org chart & documents", actor: "administrators", task: "Keep contracts and permits up to date" },
  { n: 7, slug: "clients", name: "Clients", actor: "managers", task: "Add a client with contacts and payment terms" },
  { n: 8, slug: "projects-tasks", name: "Projects & tasks", actor: "managers", task: "Create a project and assign its tasks" },
  { n: 9, slug: "time", name: "Time", actor: "employees", task: "Track your hours with the timer" },
  { n: 10, slug: "invoicing", name: "Invoicing", actor: "accountants", task: "Invoice the approved hours" },
  { n: 11, slug: "quotes", name: "Quotes (devis)", actor: "accountants", task: "Send a quote and turn it into an invoice" },
  { n: 12, slug: "client-portal", name: "Client portal", actor: "clients", task: "Follow your project and approve a milestone" },
  { n: 13, slug: "kpis-search", name: "KPIs & search", actor: "managers", task: "Compare your team with its targets" },
  { n: 14, slug: "overheads-custom-fields", name: "Overheads & custom fields", actor: "administrators", task: "Add running costs and custom fields" },
  { n: 15, slug: "performance-reviews", name: "Performance reviews", actor: "employees and managers", task: "Complete a review, from self-rating to goals" },
  { n: 16, slug: "work-inbox", name: "Work inbox", actor: "everyone", task: "Handle everything waiting for you" },
  { n: 17, slug: "recurring-invoices", name: "Recurring invoices", actor: "accountants", task: "Schedule a monthly retainer invoice" },
  { n: 18, slug: "receivables", name: "Receivables", actor: "accountants", task: "Chase overdue invoices with reminders" },
  { n: 19, slug: "moroccan-compliance", name: "Moroccan compliance", actor: "accountants", task: "Send an e-invoice and prepare the VAT return" },
  { n: 20, slug: "suppliers-bills", name: "Suppliers & bills", actor: "accountants", task: "Enter, approve and pay a supplier bill" },
  { n: 21, slug: "expenses-profitability", name: "Expenses & profitability", actor: "employees", task: "Submit an expense with its receipt" },
  { n: 22, slug: "planning", name: "Planning", actor: "employees", task: "Request a day off and see it approved" },
  { n: 23, slug: "analytics", name: "Analytics", actor: "administrators", task: "Read revenue and margin, and ask Victor" },
  { n: 24, slug: "deals-pipeline", name: "Deals pipeline", actor: "sales", task: "Move a deal from lead to signature" },
  { n: 25, slug: "revenue-forecast", name: "Revenue forecast", actor: "administrators", task: "See the income expected each month" },
  { n: 26, slug: "mobile-app", name: "Mobile app", actor: "employees", task: "Log time from your phone" },
  { n: 27, slug: "client-satisfaction", name: "Client satisfaction", actor: "managers", task: "Read your clients' ratings" },
  { n: 28, slug: "bank-import", name: "Bank import", actor: "accountants", task: "Match a bank statement to invoices" },
  { n: 29, slug: "revenue-recognition", name: "Revenue recognition", actor: "accountants", task: "Close the month on fixed-price projects" },
  { n: 30, slug: "phase-budgets-change-orders", name: "Phase budgets & change orders", actor: "managers", task: "Add a change order to a project phase" },
  { n: 31, slug: "resource-planning", name: "Resource planning", actor: "managers", task: "Book people on the coming weeks" },
  { n: 32, slug: "reports", name: "Reports", actor: "accountants", task: "Export a report to Excel or PDF" },
  { n: 33, slug: "team-access", name: "Team access", actor: "administrators", task: "Give an employee a login" },
  { n: 34, slug: "my-subscription", name: "My subscription", actor: "administrators", task: "Manage your Nexora plan" },
  { n: 35, slug: "help-support", name: "Help & support", actor: "administrators", task: "Ask the Nexora team for help" },
  { n: 36, slug: "console-home", name: "Console home & metrics", actor: "the Nexora team", task: "Read MRR, churn and what needs attention" },
  { n: 37, slug: "console-customers", name: "Console customers", actor: "the Nexora team", task: "Start a trial and follow a customer" },
  { n: 38, slug: "console-billing", name: "Console billing", actor: "the Nexora team", task: "Bill a customer and record the payment" },
  { n: 39, slug: "console-support", name: "Console support desk", actor: "the Nexora team", task: "Answer a support request" },
  { n: 40, slug: "console-health", name: "Console health & incidents", actor: "the Nexora team", task: "Open an incident and tell customers" },
]
