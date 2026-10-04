import type { Client, Employee } from "@/types/workforce"
import { BudgetType, type WorkProject, type WorkTask } from "@/types/work-projects"
import { ClientInvoiceStatus, TimeEntryStatus, type ClientInvoice, type TimeEntry } from "@/types/work-billing"
import { ExpenseStatus, type Expense, type ProjectProfit } from "@/types/work-costs"
import { entryBillRate, entryCostRate } from "./billing"
import { taskProgress } from "./project-metrics"

const SPENT = [ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED]

function round(n: number) {
  return Math.round(n * 100) / 100
}

/**
 * Revenue, cost and profit of one project so far.
 * - Hourly projects earn approved billable hours × rate.
 * - Fixed-price projects earn the price in proportion to progress.
 * - Retainer projects earn what has been invoiced for them.
 * - Non-billable projects earn nothing.
 * Billable expenses are re-billed, so they add to revenue as well as cost.
 */
export function projectProfit(
  project: WorkProject,
  data: { entries: TimeEntry[]; tasks: WorkTask[]; expenses: Expense[]; employees: Employee[]; clients: Client[]; invoices?: ClientInvoice[] }
): ProjectProfit {
  const client = data.clients.find((c) => c.id === project.clientId)
  const entries = data.entries.filter((e) => e.projectId === project.id && e.status !== TimeEntryStatus.REJECTED)
  const expenses = data.expenses.filter((x) => x.projectId === project.id && SPENT.includes(x.status))
  const employee = (id: string) => data.employees.find((e) => e.id === id)

  let revenue = 0
  if (project.budgetType === BudgetType.HOURLY) {
    revenue = entries
      .filter((e) => e.status === TimeEntryStatus.APPROVED && e.billable)
      .reduce((sum, e) => sum + e.hours * entryBillRate(e, employee(e.employeeId), client), 0)
  } else if (project.budgetType === BudgetType.FIXED && project.budgetAmount) {
    revenue = (project.budgetAmount * taskProgress(data.tasks.filter((t) => t.projectId === project.id))) / 100
  } else if (project.budgetType === BudgetType.RETAINER) {
    revenue = (data.invoices ?? [])
      .filter((i) => i.status !== ClientInvoiceStatus.DRAFT && i.status !== ClientInvoiceStatus.VOID)
      .flatMap((i) => i.lines.filter((l) => l.projectId === project.id && !l.expenseIds?.length && !l.advanceInvoiceId))
      .reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
  }
  if (project.budgetType !== BudgetType.NON_BILLABLE) {
    revenue += expenses.filter((x) => x.billable).reduce((sum, x) => sum + x.amount, 0)
  }

  const laborCost = entries.reduce((sum, e) => sum + e.hours * entryCostRate(e, employee(e.employeeId)), 0)
  const expenseTotal = expenses.reduce((sum, x) => sum + x.amount, 0)
  const profit = revenue - laborCost - expenseTotal

  return {
    projectId: project.id,
    revenue: round(revenue),
    laborCost: round(laborCost),
    hours: round(entries.reduce((sum, e) => sum + e.hours, 0)),
    expenses: round(expenseTotal),
    profit: round(profit),
    margin: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : null,
  }
}

/** Approved billable expenses not yet re-billed, for a client's projects. */
export function unbilledExpenses(expenses: Expense[], projects: WorkProject[], clientId: string) {
  const ids = new Set(
    projects.filter((p) => p.clientId === clientId && p.budgetType !== BudgetType.NON_BILLABLE).map((p) => p.id)
  )
  return expenses.filter(
    (x) => x.billable && !x.invoiceId && SPENT.includes(x.status) && x.projectId && ids.has(x.projectId)
  )
}

export type BudgetAlert = "none" | "warning" | "over"

/**
 * How much of a project's budget is used (PRJ-11). Hourly projects compare
 * the value of logged billable hours with the cap; fixed-price projects
 * compare labor cost plus expenses with the price. Alerts at 80% and 100%.
 */
export function budgetUsage(
  project: WorkProject,
  data: { entries: TimeEntry[]; expenses: Expense[]; employees: Employee[]; clients: Client[] }
): { used: number; budget: number; percent: number | null; alert: BudgetAlert } {
  const budget = project.budgetAmount ?? 0
  if (project.budgetType === BudgetType.NON_BILLABLE || budget <= 0) return { used: 0, budget, percent: null, alert: "none" }
  const client = data.clients.find((c) => c.id === project.clientId)
  const entries = data.entries.filter((e) => e.projectId === project.id && e.status !== TimeEntryStatus.REJECTED)
  const person = (id: string) => data.employees.find((e) => e.id === id)
  let used = 0
  if (project.budgetType === BudgetType.HOURLY) {
    used = entries.filter((e) => e.billable).reduce((sum, e) => sum + e.hours * entryBillRate(e, person(e.employeeId), client), 0)
  } else {
    const labor = entries.reduce((sum, e) => sum + e.hours * entryCostRate(e, person(e.employeeId)), 0)
    const spent = data.expenses.filter((x) => x.projectId === project.id && SPENT.includes(x.status)).reduce((s, x) => s + x.amount, 0)
    used = labor + spent
  }
  const percent = Math.round((used / budget) * 100)
  return { used: round(used), budget, percent, alert: percent >= 100 ? "over" : percent >= 80 ? "warning" : "none" }
}
