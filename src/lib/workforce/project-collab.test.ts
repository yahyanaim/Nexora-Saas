import { describe, it, expect, beforeEach } from "vitest"
import { addTaskCommentApi, findMentions, listTaskActivityApi, listTaskCommentsApi } from "@/lib/api/task-collab-api"
import { createTaskApi, getProjectApi, moveTaskApi, setHealthOverrideApi, updateTaskApi } from "@/lib/api/work-projects-api"
import { budgetUsage } from "./profitability"
import { projectHealth } from "./project-metrics"
import { BudgetType, Priority, ProjectHealth, TaskStatus, WorkProjectStatus, type WorkProject } from "@/types/work-projects"
import { TimeEntryStatus, type TimeEntry } from "@/types/work-billing"
import { EmployeeStatus, EmploymentType, WorkRole, type Employee } from "@/types/workforce"

const WS = "ws_atlas"
beforeEach(() => localStorage.clear())

describe("mentions", () => {
  const people = [{ id: "a", name: "Lina Moreau" }, { id: "b", name: "Omar Idrissi" }, { id: "c", name: "Omar Benali" }]
  it("finds full names, and first names only when unique", () => {
    expect(findMentions("Thanks @Lina, can @Omar Idrissi review?", people).sort()).toEqual(["a", "b"])
    expect(findMentions("@Omar please", people)).toEqual([])
    expect(findMentions("email lina@x.com", people)).toEqual([])
  })
})

describe("task comments and history", () => {
  it("stores comments with mentions and logs status, assignee and due changes", async () => {
    const task = await createTaskApi(WS, { projectId: "prj_orbit", title: "Spec", status: TaskStatus.TODO, priority: Priority.LOW, estimatedHours: 2, subtasks: [] })
    await updateTaskApi(WS, task.id, { assigneeId: "emp_lina", dueDate: "2030-01-10" })
    await moveTaskApi(WS, task.id, TaskStatus.IN_PROGRESS)
    const kinds = (await listTaskActivityApi(WS, task.id)).map((a) => a.kind).sort()
    expect(kinds).toEqual(["assignee", "created", "due", "status"])

    await addTaskCommentApi(WS, task.id, "Ready for @Lina Moreau", [{ id: "emp_lina", name: "Lina Moreau" }])
    const [comment] = await listTaskCommentsApi(WS, task.id)
    expect(comment!.mentionIds).toEqual(["emp_lina"])
    await expect(addTaskCommentApi(WS, task.id, "  ", [])).rejects.toThrow()
  })
})

describe("health override (PRJ-10)", () => {
  it("needs a reason, wins over the automatic status, and can be cleared", async () => {
    await expect(setHealthOverrideApi(WS, "prj_orbit", { health: ProjectHealth.ON_TRACK, reason: " " })).rejects.toThrow(/why/)
    await setHealthOverrideApi(WS, "prj_orbit", { health: ProjectHealth.ON_TRACK, reason: "Client moved the deadline" })
    const project = (await getProjectApi(WS, "prj_orbit"))!
    expect(projectHealth(project, [])).toBe(ProjectHealth.ON_TRACK)
    expect(project.healthOverride?.reason).toBe("Client moved the deadline")
    const cleared = await setHealthOverrideApi(WS, "prj_orbit", null)
    expect(cleared.healthOverride).toBeUndefined()
  })
})

describe("budget usage (PRJ-11)", () => {
  const employee: Employee = {
    id: "e1", workspaceId: "ws", name: "E", email: "e@x.example", jobTitle: "Dev", role: WorkRole.EMPLOYEE,
    employmentType: EmploymentType.FULL_TIME, status: EmployeeStatus.ACTIVE, hireDate: "2020-01-01",
    hourlyCost: 50, billableRate: 100, weeklyCapacity: 40, skills: [], createdAt: "", updatedAt: "",
  }
  const project = (o: Partial<WorkProject>): WorkProject => ({
    id: "p", workspaceId: "ws", code: "P", name: "P", memberIds: ["e1"], status: WorkProjectStatus.ACTIVE,
    priority: Priority.MEDIUM, startDate: "2026-01-01", budgetType: BudgetType.HOURLY, budgetAmount: 1000, createdAt: "", updatedAt: "", ...o,
  })
  const entry = (hours: number): TimeEntry => ({
    id: String(hours), workspaceId: "ws", employeeId: "e1", projectId: "p", date: "2026-02-02", hours, billable: true,
    status: TimeEntryStatus.APPROVED, createdAt: "", updatedAt: "",
  })
  const data = (entries: TimeEntry[]) => ({ entries, expenses: [], employees: [employee], clients: [] })

  it("warns at 80% and flags over 100%", () => {
    expect(budgetUsage(project({}), data([entry(5)])).alert).toBe("none")
    expect(budgetUsage(project({}), data([entry(8)]))).toMatchObject({ percent: 80, alert: "warning" })
    expect(budgetUsage(project({}), data([entry(11)])).alert).toBe("over")
    // Fixed price compares cost: 10 h × 50 = 500 of 1000
    expect(budgetUsage(project({ budgetType: BudgetType.FIXED }), data([entry(10)])).percent).toBe(50)
    expect(budgetUsage(project({ budgetType: BudgetType.NON_BILLABLE }), data([entry(10)])).percent).toBeNull()
  })
})
