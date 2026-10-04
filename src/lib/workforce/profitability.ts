import type { Client, Employee } from "@/types/workforce"
import { BudgetType, type WorkProject, type WorkTask } from "@/types/work-projects"
import { TimeEntryStatus, type TimeEntry } from "@/types/work-billing"
import { ExpenseStatus, type Expense, type ProjectProfit } from "@/types/work-costs"
import { hourlyRate } from "./billing"
import { taskProgress } from "./project-metrics"
import { rateOn } from "./rates"

const SPENT = [ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED]

function round(n: number) {
  return Math.round(n * 100) / 100
}

/**
 * Revenue, cost and profit of one project so far.
 * - Hourly projects earn approved billable hours × rate.
 * - Fixed-price projects earn the price in proportion to progress.
 * - Non-billable projects earn nothing.
 * Billable expenses are re-billed, so they add to revenue as well as cost.
 */
export function projectProfit(
  project: WorkProject,
  data: { entries: TimeEntry[]; tasks: WorkTask[]; expenses: Expense[]; employees: Employee[]; clients: Client[] }
): ProjectProfit {
  const client = data.clients.find((c) => c.id === project.clientId)
  const entries = data.entries.filter((e) => e.projectId === project.id && e.status !== TimeEntryStatus.REJECTED)
  const expenses = data.expenses.filter((x) => x.projectId === project.id && SPENT.includes(x.status))
  const employee = (id: string) => data.employees.find((e) => e.id === id)

  let revenue = 0
  if (project.budgetType === BudgetType.HOURLY) {
    revenue = entries
      .filter((e) => e.status === TimeEntryStatus.APPROVED && e.billable)
      .reduce((sum, e) => sum + e.hours * hourlyRate(employee(e.employeeId), client, e.date), 0)
  } else if (project.budgetType === BudgetType.FIXED && project.budgetAmount) {
    revenue = (project.budgetAmount * taskProgress(data.tasks.filter((t) => t.projectId === project.id))) / 100
  }
  if (project.budgetType !== BudgetType.NON_BILLABLE) {
    revenue += expenses.filter((x) => x.billable).reduce((sum, x) => sum + x.amount, 0)
  }

  const laborCost = entries.reduce((sum, e) => {
    const person = employee(e.employeeId)
    return sum + e.hours * (person ? rateOn(person, e.date).hourlyCost : 0)
  }, 0)
  const expenseTotal = expenses.reduce((sum, x) => sum + x.amount, 0)
  const profit = revenue - laborCost - expenseTotal

  return {
    projectId: project.id,
    revenue: round(revenue),
    laborCost: round(laborCost),
    hours: round(entries.reduce((sum, e) => sum + e.hours, 0)),
    expenses: round(expenseTotal),
    profit: round(profit),
    margin: revenue > 0 ? Math.round((profit / revenue) * 100) : null,
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
