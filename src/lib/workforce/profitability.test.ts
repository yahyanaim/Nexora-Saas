import { describe, it, expect, beforeEach } from "vitest"
import { projectProfit, unbilledExpenses } from "./profitability"
import {
  deleteExpenseApi,
  listExpensesApi,
  reimburseExpenseApi,
  reviewExpenseApi,
  submitExpenseApi,
} from "@/lib/api/expenses-api"
import {
  createInvoiceFromHoursApi,
  deleteInvoiceDraftApi,
  updateInvoiceDraftApi,
} from "@/lib/api/work-billing-api"
import { listProjectsApi } from "@/lib/api/work-projects-api"
import { BudgetType, Priority, TaskStatus, WorkProjectStatus, type WorkProject, type WorkTask } from "@/types/work-projects"
import { TimeEntryStatus, type TimeEntry } from "@/types/work-billing"
import { ExpenseCategory, ExpenseStatus, type Expense } from "@/types/work-costs"
import { ClientStatus, EmployeeStatus, EmploymentType, WorkRole, type Client, type Employee } from "@/types/workforce"

const employee: Employee = {
  id: "e1", workspaceId: "ws", name: "E", email: "e@x.example", jobTitle: "Dev", role: WorkRole.EMPLOYEE,
  employmentType: EmploymentType.FULL_TIME, status: EmployeeStatus.ACTIVE, hireDate: "2020-01-01",
  hourlyCost: 40, billableRate: 100, weeklyCapacity: 40, skills: [], createdAt: "", updatedAt: "",
}
const client: Client = {
  id: "c1", workspaceId: "ws", name: "C", email: "c@x.example", status: ClientStatus.ACTIVE,
  paymentTermsDays: 30, contacts: [], createdAt: "", updatedAt: "",
}
const project = (budgetType: BudgetType, budgetAmount?: number): WorkProject => ({
  id: "p", workspaceId: "ws", code: "P", name: "P", clientId: "c1", memberIds: ["e1"], status: WorkProjectStatus.ACTIVE,
  priority: Priority.MEDIUM, startDate: "2026-01-01", budgetType, budgetAmount, createdAt: "", updatedAt: "",
})
const entry = (o: Partial<TimeEntry>): TimeEntry => ({
  id: Math.random().toString(36), workspaceId: "ws", employeeId: "e1", projectId: "p", date: "2026-03-02",
  hours: 10, billable: true, status: TimeEntryStatus.APPROVED, createdAt: "", updatedAt: "", ...o,
})
const expense = (o: Partial<Expense>): Expense => ({
  id: Math.random().toString(36), workspaceId: "ws", employeeId: "e1", projectId: "p", date: "2026-03-02",
  category: ExpenseCategory.TRAVEL, description: "x", amount: 100, billable: false, status: ExpenseStatus.APPROVED,
  createdAt: "", updatedAt: "", ...o,
})
const task = (o: Partial<WorkTask>): WorkTask => ({
  id: Math.random().toString(36), workspaceId: "ws", projectId: "p", title: "t", status: TaskStatus.TODO,
  priority: Priority.MEDIUM, estimatedHours: 10, order: 0, subtasks: [], createdAt: "", updatedAt: "", ...o,
})
const data = (o: Partial<Parameters<typeof projectProfit>[1]> = {}) => ({
  entries: [], tasks: [], expenses: [], employees: [employee], clients: [client], ...o,
})

describe("projectProfit", () => {
  it("earns approved billable hours on hourly projects and costs every logged hour", () => {
    const r = projectProfit(project(BudgetType.HOURLY), data({
      entries: [entry({}), entry({ status: TimeEntryStatus.SUBMITTED }), entry({ status: TimeEntryStatus.REJECTED })],
    }))
    expect(r).toMatchObject({ revenue: 1000, laborCost: 800, hours: 20, expenses: 0, profit: 200, margin: 20 })
  })

  it("earns a fixed price in proportion to progress", () => {
    const r = projectProfit(project(BudgetType.FIXED, 10000), data({
      tasks: [task({ status: TaskStatus.DONE }), task({})],
      entries: [entry({ hours: 50 })],
    }))
    expect(r).toMatchObject({ revenue: 5000, laborCost: 2000, profit: 3000, margin: 60 })
  })

  it("counts spent expenses as cost and re-billed ones as revenue too", () => {
    const r = projectProfit(project(BudgetType.HOURLY), data({
      expenses: [
        expense({ amount: 100 }),
        expense({ amount: 50, billable: true, status: ExpenseStatus.REIMBURSED }),
        expense({ amount: 999, status: ExpenseStatus.SUBMITTED }),
      ],
    }))
    expect(r).toMatchObject({ revenue: 50, expenses: 150, profit: -100, margin: -200 })
  })

  it("has no margin without revenue", () => {
    expect(projectProfit(project(BudgetType.NON_BILLABLE), data({ entries: [entry({})] })).margin).toBeNull()
  })

  it("lists approved, billable, unbilled expenses of the client's projects", () => {
    const ok = expense({ id: "ok", billable: true })
    const list = [ok, expense({ billable: true, invoiceId: "inv" }), expense({ billable: true, status: ExpenseStatus.SUBMITTED }), expense({})]
    expect(unbilledExpenses(list, [project(BudgetType.HOURLY)], "c1").map((x) => x.id)).toEqual(["ok"])
  })
})

describe("expenses API", () => {
  beforeEach(() => localStorage.clear())
  const base = { employeeId: "emp_lina", projectId: "prj_helio", date: "2026-01-10", category: ExpenseCategory.SOFTWARE, description: "Font licence", amount: 60, billable: true }

  it("validates amount, date, description and team", async () => {
    await expect(submitExpenseApi("ws_atlas", { ...base, amount: 0 })).rejects.toThrow(/amount/)
    await expect(submitExpenseApi("ws_atlas", { ...base, date: "2999-01-01" })).rejects.toThrow(/future/)
    await expect(submitExpenseApi("ws_atlas", { ...base, description: " " })).rejects.toThrow(/Describe/)
    await expect(submitExpenseApi("ws_atlas", { ...base, employeeId: "emp_yassine" })).rejects.toThrow(/team/)
    const general = await submitExpenseApi("ws_atlas", { ...base, projectId: undefined })
    expect(general.billable).toBe(false)
  })

  it("follows submitted → approved → reimbursed, with a reason to reject", async () => {
    const x = await submitExpenseApi("ws_atlas", base)
    await expect(reimburseExpenseApi("ws_atlas", x.id)).rejects.toThrow(/approved/)
    await expect(reviewExpenseApi("ws_atlas", x.id, false)).rejects.toThrow(/reason/)
    await reviewExpenseApi("ws_atlas", x.id, true)
    await expect(deleteExpenseApi("ws_atlas", x.id)).rejects.toThrow(/can't be deleted/)
    expect((await reimburseExpenseApi("ws_atlas", x.id)).status).toBe(ExpenseStatus.REIMBURSED)
  })

  it("re-bills expenses on an invoice and frees them when the draft is deleted", async () => {
    const projects = await listProjectsApi("ws_atlas")
    const before = unbilledExpenses(await listExpensesApi("ws_atlas"), projects, "cli_helio")
    expect(before.map((x) => x.id)).toContain("ex_2")
    const invoice = await createInvoiceFromHoursApi("ws_atlas", { clientId: "cli_helio", entryIds: [], expenseIds: ["ex_2"], taxRate: 0 })
    expect(invoice.lines).toEqual([expect.objectContaining({ unitPrice: 420, expenseIds: ["ex_2"] })])
    expect(unbilledExpenses(await listExpensesApi("ws_atlas"), projects, "cli_helio").map((x) => x.id)).not.toContain("ex_2")
    await expect(updateInvoiceDraftApi("ws_atlas", invoice.id, { lines: [] })).rejects.toThrow(/can't change/)
    await deleteInvoiceDraftApi("ws_atlas", invoice.id)
    expect(unbilledExpenses(await listExpensesApi("ws_atlas"), projects, "cli_helio").map((x) => x.id)).toContain("ex_2")
  })
})
