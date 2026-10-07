import { describe, it, expect, beforeEach } from "vitest"
import { assertChangeOrder, changeTotals, withChanges, nextChangeNumber, phaseBudgets, revisedBudget, unallocatedBudget } from "./phase-budgets"
import { budgetUsage } from "./profitability"
import { decideChangeOrderApi, deleteChangeOrderApi, listChangeOrdersApi, saveChangeOrderApi, sendChangeOrderApi } from "@/lib/api/change-orders-api"
import { EmployeeStatus, EmploymentType, WorkRole, type Employee } from "@/types/workforce"
import { BudgetType, ChangeOrderStatus, Priority, TaskStatus, WorkProjectStatus, type ChangeOrder, type Milestone, type WorkProject, type WorkTask } from "@/types/work-projects"
import { TimeEntryStatus, type TimeEntry } from "@/types/work-billing"

const emp: Employee = {
  id: "e1", workspaceId: "ws", name: "Rania", email: "r@x.ma", jobTitle: "Dev", role: WorkRole.EMPLOYEE, employmentType: EmploymentType.FULL_TIME,
  status: EmployeeStatus.ACTIVE, hireDate: "2025-01-01", hourlyCost: 200, billableRate: 800, weeklyCapacity: 40, skills: [], createdAt: "", updatedAt: "",
}
const project: WorkProject = {
  id: "p", workspaceId: "ws", code: "ABC-01", name: "Site", memberIds: [], status: WorkProjectStatus.ACTIVE, priority: Priority.MEDIUM,
  startDate: "2026-01-01", budgetType: BudgetType.FIXED, budgetAmount: 100000, createdAt: "", updatedAt: "",
}
const ms = (id: string, over: Partial<Milestone> = {}): Milestone => ({ id, workspaceId: "ws", projectId: "p", title: id, dueDate: "2026-12-01", requiresApproval: false, createdAt: "", updatedAt: "", ...over })
const task = (id: string, milestoneId?: string): WorkTask => ({ id, workspaceId: "ws", projectId: "p", milestoneId, title: id, status: TaskStatus.TODO, priority: Priority.MEDIUM, estimatedHours: 0, order: 0, subtasks: [], createdAt: "", updatedAt: "" })
const entry = (taskId: string | undefined, hours: number, over: Partial<TimeEntry> = {}): TimeEntry => ({ id: `t${Math.random()}`, workspaceId: "ws", employeeId: "e1", projectId: "p", taskId, date: "2026-10-01", hours, billable: true, status: TimeEntryStatus.APPROVED, createdAt: "", updatedAt: "", ...over } as TimeEntry)
const co = (over: Partial<ChangeOrder>): ChangeOrder => ({ id: "c", workspaceId: "ws", projectId: "p", number: "CO-1", title: "More", amount: 10000, hours: 10, status: ChangeOrderStatus.APPROVED, createdAt: "", updatedAt: "", ...over })

describe("phase budgets and change orders (Phase 6g.4)", () => {
  beforeEach(() => localStorage.clear())

  it("adds approved changes to the project budget only", () => {
    const orders = [co({}), co({ id: "s", status: ChangeOrderStatus.SENT, amount: 5000 }), co({ id: "r", status: ChangeOrderStatus.REJECTED }), co({ id: "o", projectId: "other" })]
    expect(changeTotals(orders, "p")).toEqual({ amount: 10000, hours: 10, pendingAmount: 5000, pendingCount: 1 })
    expect(revisedBudget(project, orders)).toBe(110000)
    expect(withChanges(project, orders).budgetAmount).toBe(110000)
    expect(withChanges({ ...project, budgetAmount: undefined }, orders).budgetAmount).toBeUndefined()
    expect(budgetUsage(project, { entries: [], expenses: [], employees: [], clients: [], changeOrders: orders }).budget).toBe(110000)
  })

  it("compares each phase with its budget plus its changes", () => {
    const rows = phaseBudgets(project, {
      milestones: [ms("design", { budgetHours: 40, budgetAmount: 10000 }), ms("build", { budgetHours: 100 })],
      tasks: [task("t1", "design"), task("t2", "build"), task("t3")],
      entries: [entry("t1", 45), entry("t2", 20), entry("t3", 2), entry("t1", 5, { status: TimeEntryStatus.REJECTED })],
      employees: [emp],
      clients: [],
      changeOrders: [co({ milestoneId: "design", amount: 2000, hours: 8 })],
    })
    // Fixed price: amounts are costs (200/h)
    expect(rows[0]).toMatchObject({ budgetHours: 48, budgetAmount: 12000, changeAmount: 2000, hours: 45, amount: 9000, percent: 75, alert: "none" })
    // No amount budget: hours decide
    expect(rows[1]).toMatchObject({ budgetHours: 100, hours: 20, percent: 20 })
    expect(rows[2]).toMatchObject({ milestone: null, hours: 2, percent: null })
    const hourly = phaseBudgets({ ...project, budgetType: BudgetType.HOURLY }, { milestones: [ms("design", { budgetAmount: 30000 })], tasks: [task("t1", "design")], entries: [entry("t1", 40)], employees: [emp], clients: [], changeOrders: [] })
    expect(hourly[0]).toMatchObject({ amount: 32000, percent: 107, alert: "over" })
    // Expenses and supplier bills count in their phase on cost budgets
    const withCosts = phaseBudgets(project, {
      milestones: [ms("design", { budgetAmount: 10000 })], tasks: [task("t1", "design")], entries: [entry("t1", 10)], employees: [emp], clients: [], changeOrders: [],
      expenses: [{ id: "x", projectId: "p", milestoneId: "design", amount: 500, status: "approved" } as never, { id: "y", projectId: "p", amount: 300, status: "approved" } as never, { id: "z", projectId: "p", milestoneId: "design", amount: 999, status: "submitted" } as never],
      bills: [{ id: "b", projectId: "p", milestoneId: "design", status: "approved", lines: [{ id: "l", description: "Dev", quantity: 1, unitPrice: 1000 }], taxRate: 20, payments: [] } as never],
    })
    expect(withCosts[0]).toMatchObject({ amount: 3500, costs: 1500, percent: 35 })
    expect(withCosts[1]).toMatchObject({ milestone: null, amount: 300, costs: 300 })
    expect(unallocatedBudget(project, [ms("a", { budgetAmount: 60000 }), ms("b", { budgetAmount: 25000 })])).toBe(15000)
  })

  it("checks and numbers change orders", () => {
    expect(() => assertChangeOrder({ projectId: "p", title: " ", amount: 1, hours: 0 })).toThrow("Describe the change")
    expect(() => assertChangeOrder({ projectId: "p", title: "X", amount: 0, hours: 0 })).toThrow("must change")
    expect(() => assertChangeOrder({ projectId: "p", title: "Less", amount: -5000, hours: -4 })).not.toThrow()
    expect(nextChangeNumber("ORB-01", [co({}), co({})])).toBe("CO-ORB-01-03")
  })

  it("follows draft → sent → approved, and locks decided changes", async () => {
    const ws = "ws_atlas"
    const created = await saveChangeOrderApi(ws, { projectId: "prj_orbit", title: "Export to Excel", amount: 12000, hours: 10 })
    expect(created).toMatchObject({ number: "CO-ORB-01-03", status: ChangeOrderStatus.DRAFT })
    await expect(decideChangeOrderApi(ws, created.id, true, "Sara")).rejects.toThrow("Send the change")
    await sendChangeOrderApi(ws, created.id)
    const edited = await saveChangeOrderApi(ws, { projectId: "prj_orbit", title: "Export to Excel", amount: 15000, hours: 10 }, created.id)
    expect(edited.status).toBe(ChangeOrderStatus.DRAFT)
    await sendChangeOrderApi(ws, created.id)
    await expect(decideChangeOrderApi(ws, created.id, false, "Sara")).rejects.toThrow("Say why")
    const ok = await decideChangeOrderApi(ws, created.id, true, "Sara")
    expect(ok).toMatchObject({ status: ChangeOrderStatus.APPROVED, decidedBy: "Sara" })
    await expect(saveChangeOrderApi(ws, { projectId: "prj_orbit", title: "X", amount: 1, hours: 0 }, created.id)).rejects.toThrow("decided")
    await expect(deleteChangeOrderApi(ws, "co_orb_2")).rejects.toThrow("Only a draft")
    expect((await listChangeOrdersApi(ws, "prj_orbit")).length).toBe(3)
  })
})
