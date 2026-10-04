import { describe, expect, it } from "vitest"
import { myDay, teamOverview, vacationAllowance } from "./dashboards"
import { seedClients, seedEmployees } from "./demo-seed"
import { seedProjects, seedTasks } from "./project-seed"
import { seedTimeEntries } from "./billing-seed"
import { TaskStatus, WorkProjectStatus } from "@/types/work-projects"
import { TimeEntryStatus } from "@/types/work-billing"
import { LeaveStatus, LeaveType } from "@/types/work-planning"
import { todayIso } from "./project-metrics"
import { ProjectHealth } from "@/types/work-projects"
import { addDays, weekStart } from "./billing"

const WS = "ws_atlas"
const today = todayIso()
const employees = seedEmployees(WS)
const lina = employees.find((e) => e.id === "emp_lina")!

describe("myDay (employee dashboard)", () => {
  it("lists overdue tasks first, then today, soon and in progress", () => {
    const base = { workspaceId: WS, projectId: "prj_orbit", priority: "medium", estimatedHours: 4, order: 0, subtasks: [], createdAt: "", updatedAt: "" } as never
    const tasks = [
      { ...(base as object), id: "a", title: "Later", status: TaskStatus.IN_PROGRESS, assigneeId: "emp_lina" },
      { ...(base as object), id: "b", title: "Today", status: TaskStatus.TODO, assigneeId: "emp_lina", dueDate: today },
      { ...(base as object), id: "c", title: "Late", status: TaskStatus.TODO, assigneeId: "emp_lina", dueDate: addDays(today, -2) },
      { ...(base as object), id: "d", title: "Done", status: TaskStatus.DONE, assigneeId: "emp_lina", dueDate: addDays(today, -2) },
      { ...(base as object), id: "e", title: "Someone else", status: TaskStatus.TODO, assigneeId: "emp_omar", dueDate: today },
    ] as never
    const d = myDay(lina, { tasks, entries: [], leave: [] }, today)
    expect(d.tasks.map((t) => t.task.id)).toEqual(["c", "b", "a"])
    expect(d.tasks[0]!.reason).toBe("overdue")
  })

  it("compares logged hours with expected hours, net of leave", () => {
    const monday = weekStart(today)
    const entries = [{ id: "x", workspaceId: WS, employeeId: "emp_lina", projectId: "prj_orbit", date: monday, hours: 6, billable: true, status: TimeEntryStatus.DRAFT, createdAt: "", updatedAt: "" }] as never
    const leave = [{ id: "l", workspaceId: WS, employeeId: "emp_lina", type: LeaveType.VACATION, startDate: addDays(monday, 1), endDate: addDays(monday, 1), status: LeaveStatus.APPROVED, createdAt: "", updatedAt: "" }]
    const d = myDay(lina, { tasks: [], entries, leave }, monday)
    expect(d.loggedThisWeek).toBe(6)
    expect(d.expectedThisWeek).toBe(32) // 5 days x 8 h minus one day of leave
    expect(d.leave.used).toBe(1)
  })

  it("uses the vacation allowance from settings", () => {
    expect(vacationAllowance([{ type: LeaveType.VACATION, enabled: true, yearlyDays: 22 }])).toBe(22)
    expect(vacationAllowance([{ type: LeaveType.VACATION, enabled: false, yearlyDays: 22 }])).toBeUndefined()
  })
})

describe("teamOverview (manager dashboard)", () => {
  const data = {
    projects: seedProjects(WS),
    tasks: seedTasks(WS),
    entries: seedTimeEntries(WS),
    employees,
    clients: seedClients(WS),
    expenses: [],
    leave: [],
  }

  it("flags late or at-risk projects with the tasks causing it", () => {
    const o = teamOverview(data)
    for (const a of o.attention) {
      expect([ProjectHealth.LATE, ProjectHealth.AT_RISK].includes(a.health) || a.budget.alert !== "none").toBe(true)
      if (a.health === ProjectHealth.AT_RISK && a.causes.length) expect(a.causes.every((t) => t.dueDate! < today)).toBe(true)
    }
    expect(o.attention.every((a) => a.project.status !== WorkProjectStatus.COMPLETED)).toBe(true)
  })

  it("counts approvals waiting and sorts workload by load", () => {
    const o = teamOverview(data)
    expect(o.approvals.hours).toBeGreaterThan(0)
    expect(o.workload.map((w) => w.load)).toEqual([...o.workload.map((w) => w.load)].sort((a, b) => b - a))
  })

  it("can be scoped to one manager's people and projects", () => {
    const o = teamOverview(data, { employeeIds: ["emp_lina"], projectIds: ["prj_helio"] })
    expect(o.workload.map((w) => w.employee.id)).toEqual(["emp_lina"])
    expect(o.budgets.every((b) => b.project.id === "prj_helio")).toBe(true)
  })
})
