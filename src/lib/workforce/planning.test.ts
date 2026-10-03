import { describe, it, expect, beforeEach } from "vitest"
import {
  datesBetween,
  leaveDays,
  loadPercent,
  plannedHours,
  rangesOverlap,
  vacationBalance,
  weeklyCapacity,
  workingDays,
} from "./planning"
import { cancelLeaveApi, decideLeaveApi, listLeaveApi, requestLeaveApi } from "@/lib/api/leave-api"
import { LeaveStatus, LeaveType, type LeaveRequest } from "@/types/work-planning"
import { Priority, TaskStatus, type WorkTask } from "@/types/work-projects"
import { EmployeeStatus, EmploymentType, WorkRole, type Employee } from "@/types/workforce"

const leaveReq = (o: Partial<LeaveRequest>): LeaveRequest => ({
  id: Math.random().toString(36), workspaceId: "ws", employeeId: "e1", type: LeaveType.VACATION,
  startDate: "2026-03-02", endDate: "2026-03-06", status: LeaveStatus.APPROVED, createdAt: "", updatedAt: "", ...o,
})

const task = (o: Partial<WorkTask>): WorkTask => ({
  id: Math.random().toString(36), workspaceId: "ws", projectId: "p", title: "t", status: TaskStatus.TODO,
  priority: Priority.MEDIUM, assigneeId: "e1", estimatedHours: 10, order: 0, subtasks: [], createdAt: "", updatedAt: "", ...o,
})

const employee: Employee = {
  id: "e1", workspaceId: "ws", name: "E", email: "e@x.example", jobTitle: "Dev", role: WorkRole.EMPLOYEE,
  employmentType: EmploymentType.FULL_TIME, status: EmployeeStatus.ACTIVE, hireDate: "2020-01-01",
  hourlyCost: 10, billableRate: 50, weeklyCapacity: 40, skills: [], createdAt: "", updatedAt: "",
}

describe("dates", () => {
  it("lists inclusive ranges and skips weekends for working days", () => {
    expect(datesBetween("2026-03-06", "2026-03-09")).toEqual(["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09"])
    expect(workingDays("2026-03-06", "2026-03-09")).toEqual(["2026-03-06", "2026-03-09"])
  })

  it("detects overlapping ranges, touching ends included", () => {
    expect(rangesOverlap("2026-03-01", "2026-03-05", "2026-03-05", "2026-03-09")).toBe(true)
    expect(rangesOverlap("2026-03-01", "2026-03-04", "2026-03-05", "2026-03-09")).toBe(false)
  })
})

describe("leave", () => {
  it("counts only approved working days", () => {
    const list = [leaveReq({}), leaveReq({ startDate: "2026-03-09", endDate: "2026-03-09", status: LeaveStatus.PENDING })]
    expect(leaveDays(list, "e1").size).toBe(5)
    expect(leaveDays(list, "e1", "2026-03-04", "2026-03-31").size).toBe(3)
  })

  it("computes the vacation balance per year, pending included", () => {
    const list = [
      leaveReq({}),
      leaveReq({ startDate: "2026-04-06", endDate: "2026-04-07", status: LeaveStatus.PENDING }),
      leaveReq({ type: LeaveType.SICK, startDate: "2026-05-04", endDate: "2026-05-04" }),
      leaveReq({ startDate: "2025-12-29", endDate: "2026-01-02" }), // only Thu 1 and Fri 2 Jan count for 2026
    ]
    expect(vacationBalance(list, "e1", 2026)).toEqual({ allowance: 25, used: 7, pending: 2, remaining: 16 })
  })
})

describe("workload", () => {
  it("removes leave from weekly capacity", () => {
    expect(weeklyCapacity(employee, [], "2026-03-02")).toBe(40)
    expect(weeklyCapacity(employee, [leaveReq({ startDate: "2026-03-05", endDate: "2026-03-06" })], "2026-03-02")).toBe(24)
  })

  it("spreads open work over the working days until its due date", () => {
    // Monday to Friday next week: 10 h over 10 working days from this Monday
    const tasks = [task({ dueDate: "2026-03-13" })]
    expect(plannedHours(tasks, "e1", "2026-03-02", "2026-03-02")).toBe(5)
    expect(plannedHours(tasks, "e1", "2026-03-09", "2026-03-02")).toBe(5)
  })

  it("puts overdue work on today and ignores done, unassigned or undated tasks", () => {
    const tasks = [
      task({ dueDate: "2026-02-20", estimatedHours: 6 }),
      task({ dueDate: "2026-03-13", status: TaskStatus.DONE }),
      task({ dueDate: "2026-03-13", assigneeId: "e2" }),
      task({ dueDate: undefined }),
    ]
    expect(plannedHours(tasks, "e1", "2026-03-02", "2026-03-03")).toBe(6)
  })

  it("expresses load as a percentage of capacity", () => {
    expect(loadPercent(30, 40)).toBe(75)
    expect(loadPercent(0, 0)).toBe(0)
    expect(loadPercent(5, 0)).toBe(Infinity)
  })
})

describe("leave API", () => {
  beforeEach(() => localStorage.clear())
  const base = { employeeId: "emp_lina", type: LeaveType.VACATION, startDate: "2030-06-03", endDate: "2030-06-07" }

  it("creates pending requests and refuses bad ranges and overlaps", async () => {
    const created = await requestLeaveApi("ws_atlas", base)
    expect(created.status).toBe(LeaveStatus.PENDING)
    await expect(requestLeaveApi("ws_atlas", { ...base, startDate: "2030-06-06", endDate: "2030-06-10" })).rejects.toThrow(/overlaps/)
    await expect(requestLeaveApi("ws_atlas", { ...base, startDate: "2030-06-10", endDate: "2030-06-09" })).rejects.toThrow(/before/)
    await expect(requestLeaveApi("ws_atlas", { ...base, startDate: "2030-06-08", endDate: "2030-06-09" })).rejects.toThrow(/working day/)
  })

  it("approves, declines with a reason, and cancels only future leave", async () => {
    const a = await requestLeaveApi("ws_atlas", base)
    await expect(decideLeaveApi("ws_atlas", a.id, false)).rejects.toThrow(/reason/)
    expect((await decideLeaveApi("ws_atlas", a.id, true)).status).toBe(LeaveStatus.APPROVED)
    await expect(decideLeaveApi("ws_atlas", a.id, true)).rejects.toThrow(/pending/)
    await expect(cancelLeaveApi("ws_atlas", a.id, "2030-06-04")).rejects.toThrow(/started/)
    expect((await cancelLeaveApi("ws_atlas", a.id, "2030-06-01")).status).toBe(LeaveStatus.CANCELLED)
    // A cancelled request frees the dates again
    await expect(requestLeaveApi("ws_atlas", base)).resolves.toBeTruthy()
    expect((await listLeaveApi("ws_atlas")).length).toBeGreaterThan(2)
  })
})
