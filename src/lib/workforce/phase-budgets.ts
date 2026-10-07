import type { Client, Employee } from "@/types/workforce"
import { BudgetType, ChangeOrderStatus, type ChangeOrder, type ChangeOrderInput, type Milestone, type WorkProject, type WorkTask } from "@/types/work-projects"
import { TimeEntryStatus, type TimeEntry } from "@/types/work-billing"
import { entryBillRate, entryCostRate } from "./billing"
import { roundMoney } from "./money"

/**
 * Phase budgets and change orders (Phase 6g.4). A phase is a milestone: the
 * hours logged on its tasks are compared with the hours and amount planned for
 * it. Amounts follow the project's budget: billable value for hourly projects,
 * cost for the others (as in budgetUsage). Approved change orders add to the
 * phase they belong to and to the project budget.
 */

export type PhaseAlert = "none" | "warning" | "over"

export interface PhaseBudgetRow {
  /** null for work on tasks without a milestone */
  milestone: Milestone | null
  budgetHours: number
  budgetAmount: number
  /** Part of the budgets above that comes from approved change orders */
  changeHours: number
  changeAmount: number
  hours: number
  amount: number
  /** Share of the amount budget used, or of the hours when there is no amount */
  percent: number | null
  alert: PhaseAlert
}

export const approvedChanges = (orders: ChangeOrder[], projectId: string) =>
  orders.filter((o) => o.projectId === projectId && o.status === ChangeOrderStatus.APPROVED)

/** Sum of approved change orders for a project. */
export function changeTotals(orders: ChangeOrder[], projectId: string) {
  const approved = approvedChanges(orders, projectId)
  const pending = orders.filter((o) => o.projectId === projectId && (o.status === ChangeOrderStatus.SENT || o.status === ChangeOrderStatus.DRAFT))
  return {
    amount: roundMoney(approved.reduce((s, o) => s + o.amount, 0)),
    hours: approved.reduce((s, o) => s + o.hours, 0),
    pendingAmount: roundMoney(pending.reduce((s, o) => s + o.amount, 0)),
    pendingCount: pending.length,
  }
}

/** The project budget after approved change orders. */
export const revisedBudget = (project: Pick<WorkProject, "id" | "budgetAmount">, orders: ChangeOrder[]) =>
  roundMoney((project.budgetAmount ?? 0) + changeTotals(orders, project.id).amount)

const alertFor = (percent: number | null): PhaseAlert => (percent === null ? "none" : percent >= 100 ? "over" : percent >= 80 ? "warning" : "none")

export function phaseBudgets(
  project: WorkProject,
  data: { milestones: Milestone[]; tasks: WorkTask[]; entries: TimeEntry[]; employees: Employee[]; clients: Client[]; changeOrders: ChangeOrder[] }
): PhaseBudgetRow[] {
  const client = data.clients.find((c) => c.id === project.clientId)
  const person = (id: string) => data.employees.find((e) => e.id === id)
  const phaseOfTask = new Map(data.tasks.filter((t) => t.projectId === project.id).map((t) => [t.id, t.milestoneId]))
  const phases = data.milestones.filter((m) => m.projectId === project.id)
  const changes = approvedChanges(data.changeOrders, project.id)
  const entries = data.entries.filter((e) => e.projectId === project.id && e.status !== TimeEntryStatus.REJECTED)
  const hourly = project.budgetType === BudgetType.HOURLY

  const actual = (milestoneId: string | undefined) => {
    const rows = entries.filter((e) => (e.taskId ? phaseOfTask.get(e.taskId) : undefined) === milestoneId)
    const hours = rows.reduce((s, e) => s + e.hours, 0)
    const amount = hourly
      ? rows.filter((e) => e.billable).reduce((s, e) => s + e.hours * entryBillRate(e, person(e.employeeId), client), 0)
      : rows.reduce((s, e) => s + e.hours * entryCostRate(e, person(e.employeeId)), 0)
    return { hours: Math.round(hours * 100) / 100, amount: roundMoney(amount) }
  }

  const row = (milestone: Milestone | null): PhaseBudgetRow => {
    const mine = changes.filter((o) => (o.milestoneId ?? null) === (milestone?.id ?? null))
    const changeHours = mine.reduce((s, o) => s + o.hours, 0)
    const changeAmount = roundMoney(mine.reduce((s, o) => s + o.amount, 0))
    const budgetHours = (milestone?.budgetHours ?? 0) + changeHours
    const budgetAmount = roundMoney((milestone?.budgetAmount ?? 0) + changeAmount)
    const { hours, amount } = actual(milestone?.id)
    const percent = budgetAmount > 0 ? Math.round((amount / budgetAmount) * 100) : budgetHours > 0 ? Math.round((hours / budgetHours) * 100) : null
    return { milestone, budgetHours, budgetAmount, changeHours, changeAmount, hours, amount, percent, alert: alertFor(percent) }
  }

  const rows = phases.map(row)
  const loose = row(null)
  // Work outside any phase only shows when there is some
  if (loose.hours > 0 || loose.budgetAmount !== 0 || loose.budgetHours !== 0) rows.push(loose)
  return rows
}

/** Budget planned in phases against the project budget: what is left to give out. */
export function unallocatedBudget(project: WorkProject, milestones: Milestone[]) {
  const planned = milestones.filter((m) => m.projectId === project.id).reduce((s, m) => s + (m.budgetAmount ?? 0), 0)
  // Approved changes add to their phase and to the project alike, so they leave this gap unchanged
  return roundMoney((project.budgetAmount ?? 0) - planned)
}

/** Throws the first problem with a change order. */
export function assertChangeOrder(input: ChangeOrderInput) {
  if (!input.title?.trim()) throw new Error("Describe the change")
  if (!Number.isFinite(input.amount) || !Number.isFinite(input.hours)) throw new Error("Enter the price and hours of the change")
  if (input.amount === 0 && input.hours === 0) throw new Error("A change must change the price or the hours")
}

/** Next change order number for a project: CO-ORB-01-03. */
export function nextChangeNumber(projectCode: string, existing: ChangeOrder[]) {
  return `CO-${projectCode}-${String(existing.length + 1).padStart(2, "0")}`
}
