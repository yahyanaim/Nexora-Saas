import { ExpenseCategory, ExpenseStatus, type Expense, type ExpenseInput } from "@/types/work-costs"
import { assertPeriodOpen, getSettingsApi } from "./settings-api"
import { createCollection } from "@/lib/workforce/demo-store"
import { addDays, weekStart } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { listProjectsApi } from "./work-projects-api"
import { recordAudit } from "@/lib/workforce/audit"
import { AUTO_APPROVER, approvalDecision, approverRef, assertNotSelfApproval, stepsRequired, type Approver } from "@/lib/workforce/approvals"
import { ApprovalSubject } from "@/types/work-settings"
import { roundMoney } from "@/lib/workforce/money"

const STAMP = "2026-01-05T09:00:00.000Z"

function seedExpenses(workspaceId: string): Expense[] {
  const monday = weekStart(todayIso())
  const rows: Omit<Expense, "workspaceId" | "createdAt" | "updatedAt">[] =
    workspaceId === "ws_atlas"
      ? [
          { id: "ex_1", employeeId: "emp_karim", projectId: "prj_helio", date: addDays(monday, -16), category: ExpenseCategory.TRAVEL, description: "Train to Casablanca for the site visit", amount: 180, billable: true, receiptName: "train-ticket.pdf", status: ExpenseStatus.REIMBURSED },
          { id: "ex_2", employeeId: "emp_lina", projectId: "prj_helio", date: addDays(monday, -9), category: ExpenseCategory.SOFTWARE, description: "Charting library licence", amount: 420, billable: true, receiptName: "licence-invoice.pdf", status: ExpenseStatus.APPROVED },
          { id: "ex_3", employeeId: "emp_omar", projectId: "prj_orbit", date: addDays(monday, -6), category: ExpenseCategory.HARDWARE, description: "GPS tracker test units", amount: 650, billable: false, receiptName: "trackers.jpg", status: ExpenseStatus.APPROVED },
          { id: "ex_4", employeeId: "emp_julia", projectId: "prj_orbit", date: addDays(monday, -2), category: ExpenseCategory.MEALS, description: "Workshop lunch with Orbit team", amount: 95, billable: false, status: ExpenseStatus.SUBMITTED },
          { id: "ex_5", employeeId: "emp_emma", date: addDays(monday, -1), category: ExpenseCategory.TRAVEL, description: "Taxi to client pitch", amount: 38, billable: false, receiptName: "taxi.png", status: ExpenseStatus.SUBMITTED },
        ]
      : workspaceId === "ws_northwind"
        ? [{ id: "ex_10", employeeId: "emp_chloe", projectId: "prj_lumen", date: addDays(monday, -8), category: ExpenseCategory.SUBCONTRACTOR, description: "Drone operator for the shoot", amount: 900, billable: true, receiptName: "drone-invoice.pdf", status: ExpenseStatus.APPROVED }]
        : []
  return rows.map((r) => ({ ...r, workspaceId, createdAt: STAMP, updatedAt: STAMP }))
}

/**
 * Expenses. Backed by the browser demo store for now; replace the bodies
 * with apiClient calls (and a receipt upload) once the backend exists.
 */
const expenses = createCollection<Expense>("expenses", "ex", seedExpenses)

export const MAX_EXPENSE = 100_000

export async function listExpensesApi(workspaceId: string): Promise<Expense[]> {
  return expenses.list(workspaceId).sort((a, b) => b.date.localeCompare(a.date))
}

export async function submitExpenseApi(workspaceId: string, input: ExpenseInput): Promise<Expense> {
  if (!(input.amount > 0) || input.amount > MAX_EXPENSE) throw new Error("Enter an amount above zero")
  if (input.date > todayIso()) throw new Error("Expenses can't be in the future")
  await assertPeriodOpen(workspaceId, input.date)
  if (!input.description.trim()) throw new Error("Describe the expense")
  if (input.projectId) {
    const project = (await listProjectsApi(workspaceId)).find((p) => p.id === input.projectId)
    if (!project) throw new Error("Project not found")
    if (!project.memberIds.includes(input.employeeId)) throw new Error("Only the project team can add expenses to it")
  }
  const settings = await getSettingsApi(workspaceId)
  if (!settings.expenseCategories.some((c) => c.category === input.category && c.enabled)) {
    throw new Error("This category is turned off in the workspace settings")
  }
  if (input.amount > settings.receiptRequiredAbove && !input.receiptName) {
    throw new Error(`Attach a receipt for expenses above ${settings.receiptRequiredAbove}`)
  }
  // Workspaces that don't approve expenses approve them on submission (PLT-8)
  const auto = stepsRequired(settings.approvals, ApprovalSubject.EXPENSE, input.amount) === 0
  return expenses.create(workspaceId, {
    ...input,
    description: input.description.trim(),
    amount: roundMoney(input.amount),
    // Only project expenses can be re-billed
    billable: input.billable && !!input.projectId,
    status: auto ? ExpenseStatus.APPROVED : ExpenseStatus.SUBMITTED,
    approvedBy: auto ? AUTO_APPROVER : undefined,
  })
}

/**
 * Approves or rejects a submitted expense (EXP-3) under the workspace rules
 * (BR-3, PLT-8): never your own; above the two-step amount the first approval
 * is recorded and a second, different person completes it.
 */
export async function reviewExpenseApi(workspaceId: string, approver: Approver, id: string, approved: boolean, reason?: string) {
  const expense = expenses.get(workspaceId, id)
  if (!expense) throw new Error("Expense not found")
  if (expense.status !== ExpenseStatus.SUBMITTED) throw new Error("Only submitted expenses can be reviewed")
  assertNotSelfApproval(approver.employeeId, expense.employeeId)
  if (!approved && !reason?.trim()) throw new Error("Give a reason when rejecting")
  if (approved) {
    const { approvals } = await getSettingsApi(workspaceId)
    const outcome = approvalDecision({ rules: approvals, subject: ApprovalSubject.EXPENSE, amount: expense.amount, submitterId: expense.employeeId, approver, firstApprovedBy: expense.firstApprovedBy })
    if (outcome === "first_step") {
      recordAudit(workspaceId, { action: "Expense approved (first step)", actionKey: "expense.first_approval", category: "Approvals", target: `${expense.description} (${expense.amount})` })
      return expenses.update(workspaceId, id, { firstApprovedBy: approverRef(approver) })
    }
  }
  recordAudit(workspaceId, {
    action: approved ? "Expense approved" : "Expense rejected",
    actionKey: approved ? "expense.approved" : "expense.rejected",
    category: "Approvals",
    target: `${expense.description} (${expense.amount})`,
    before: expense.status,
    after: approved ? ExpenseStatus.APPROVED : `${ExpenseStatus.REJECTED}: ${reason!.trim()}`,
  })
  return expenses.update(workspaceId, id, {
    status: approved ? ExpenseStatus.APPROVED : ExpenseStatus.REJECTED,
    rejectionReason: approved ? undefined : reason!.trim(),
    approvedBy: approved ? approverRef(approver) : undefined,
    firstApprovedBy: approved ? expense.firstApprovedBy : undefined,
  })
}

export async function reimburseExpenseApi(workspaceId: string, id: string) {
  const expense = expenses.get(workspaceId, id)
  if (!expense) throw new Error("Expense not found")
  if (expense.status !== ExpenseStatus.APPROVED) throw new Error("Only approved expenses can be reimbursed")
  return expenses.update(workspaceId, id, { status: ExpenseStatus.REIMBURSED })
}

export async function deleteExpenseApi(workspaceId: string, id: string) {
  const expense = expenses.get(workspaceId, id)
  if (!expense) return
  if (expense.status !== ExpenseStatus.SUBMITTED && expense.status !== ExpenseStatus.REJECTED) {
    throw new Error("Approved expenses can't be deleted")
  }
  expenses.remove(workspaceId, id)
}

/** Marks expenses as re-billed on an invoice (or frees them with undefined). */
export function setExpensesInvoice(workspaceId: string, ids: string[], invoiceId: string | undefined) {
  for (const id of ids) {
    if (expenses.get(workspaceId, id)) expenses.update(workspaceId, id, { invoiceId })
  }
}

/** Frees every expense billed on an invoice. */
/** Frees an invoice's re-billed expenses (all, or only the given ones). */
export function releaseInvoiceExpenses(workspaceId: string, invoiceId: string, only?: string[]) {
  for (const x of expenses.list(workspaceId).filter((e) => e.invoiceId === invoiceId && (!only || only.includes(e.id)))) {
    expenses.update(workspaceId, x.id, { invoiceId: undefined })
  }
}
