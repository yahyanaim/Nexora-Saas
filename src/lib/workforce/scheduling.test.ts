import { describe, it, expect, beforeEach } from "vitest"
import { closeChecklist, dependencyIssues, scheduleTemplate, shiftedDates, taskSpan, templateFromProject, wouldCreateCycle } from "./scheduling"
import { closeProjectApi, createTaskApi, deleteTaskApi, listProjectsApi, listTasksApi, reopenProjectApi, updateTaskApi } from "@/lib/api/work-projects-api"
import { createProjectFromTemplateApi, listTemplatesApi, saveProjectAsTemplateApi } from "@/lib/api/project-templates-api"
import { BudgetType, Priority, TaskStatus, WorkProjectStatus, type WorkProject, type WorkTask } from "@/types/work-projects"

const task = (o: Partial<WorkTask>): WorkTask => ({
  id: "t", workspaceId: "ws", projectId: "p", title: "T", status: TaskStatus.TODO, priority: Priority.MEDIUM, estimatedHours: 16, order: 0, subtasks: [], createdAt: "", updatedAt: "", ...o,
})

describe("task spans and dragging (PLN-2)", () => {
  it("derives the start from the due date and estimate", () => {
    expect(taskSpan({ dueDate: "2026-03-10", estimatedHours: 16 }, "2026-01-01")).toEqual({ start: "2026-03-09", end: "2026-03-10" })
    expect(taskSpan({ estimatedHours: 24 }, "2026-01-01")).toEqual({ start: "2026-01-01", end: "2026-01-03" })
    expect(taskSpan({ startDate: "2026-02-01", dueDate: "2026-02-05", estimatedHours: 1 }, "2026-01-01")).toEqual({ start: "2026-02-01", end: "2026-02-05" })
  })
  it("moves both dates and keeps the length", () => {
    expect(shiftedDates({ startDate: "2026-02-01", dueDate: "2026-02-05", estimatedHours: 8 }, "2026-01-01", 3)).toEqual({ startDate: "2026-02-04", dueDate: "2026-02-08" })
  })
})

describe("dependencies (PRJ-6)", () => {
  it("detects loops", () => {
    const tasks = [{ id: "a", dependsOn: [] }, { id: "b", dependsOn: ["a"] }, { id: "c", dependsOn: ["b"] }]
    expect(wouldCreateCycle(tasks, "a", "c")).toBe(true)
    expect(wouldCreateCycle(tasks, "c", "a")).toBe(false)
    expect(wouldCreateCycle(tasks, "a", "a")).toBe(true)
  })
  it("flags late, overlapping and waiting predecessors", () => {
    const late = task({ id: "a", dueDate: "2026-03-01" })
    const overlap = task({ id: "b", dueDate: "2026-03-20" })
    const fine = task({ id: "c", dueDate: "2026-03-12" })
    const done = task({ id: "d", dueDate: "2026-02-01", status: TaskStatus.DONE })
    const t = task({ id: "x", startDate: "2026-03-15", dueDate: "2026-03-25", dependsOn: ["a", "b", "c", "d"] })
    expect(dependencyIssues(t, [late, overlap, fine, done, t], "2026-01-01", "2026-03-10").map((i) => [i.predecessor.id, i.kind])).toEqual([["a", "late"], ["b", "overlaps"], ["c", "waiting"]])
    expect(dependencyIssues({ ...t, status: TaskStatus.DONE }, [late], "2026-01-01", "2026-03-10")).toEqual([])
  })
})

describe("closing checklist and templates", () => {
  const project = { id: "p", startDate: "2026-01-01", dueDate: "2026-01-31", budgetType: BudgetType.HOURLY, description: "d" } as WorkProject
  it("counts what is still open", () => {
    const list = closeChecklist({ project, tasks: [task({}), task({ id: "t2", status: TaskStatus.DONE })], milestones: [], entries: [], invoices: [], billable: true })
    expect(list.find((i) => i.key === "tasksDone")?.open).toBe(1)
    expect(list.map((i) => i.key)).toContain("hoursInvoiced")
    expect(closeChecklist({ project, tasks: [], milestones: [], entries: [], invoices: [], billable: false }).map((i) => i.key)).not.toContain("hoursInvoiced")
  })
  it("turns dates into offsets and back", () => {
    const tpl = templateFromProject(project, [task({ id: "a", startDate: "2026-01-03", dueDate: "2026-01-05" }), task({ id: "b", dueDate: "2026-01-10", dependsOn: ["a", "zz"] })], [], "Tpl")
    expect(tpl.durationDays).toBe(30)
    expect(tpl.tasks[0]).toMatchObject({ startOffset: 2, dueOffset: 4 })
    expect(tpl.tasks[1]?.dependsOn).toEqual(["a"])
    const plan = scheduleTemplate(tpl, "2026-06-01")
    expect(plan.tasks[0]).toMatchObject({ startDate: "2026-06-03", dueDate: "2026-06-05" })
    expect(plan.dueDate).toBe("2026-07-01")
  })
})

describe("project APIs for planning", () => {
  beforeEach(() => localStorage.clear())
  const WS = "ws_atlas"

  it("refuses dependency loops and other projects' tasks, and cleans up on delete", async () => {
    await expect(updateTaskApi(WS, "tsk_1", { dependsOn: ["tsk_6"] })).rejects.toThrow(/loop/)
    const other = (await listTasksApi(WS)).find((t) => t.projectId !== "prj_orbit")!
    await expect(updateTaskApi(WS, "tsk_7", { dependsOn: [other.id] })).rejects.toThrow(/same project/)
    await expect(createTaskApi(WS, { projectId: "prj_orbit", title: "X", status: TaskStatus.TODO, priority: Priority.LOW, estimatedHours: 1, subtasks: [], startDate: "2026-05-02", dueDate: "2026-05-01" })).rejects.toThrow(/start date/)
    await deleteTaskApi(WS, "tsk_4")
    expect((await listTasksApi(WS)).find((t) => t.id === "tsk_7")?.dependsOn).toEqual([])
  })

  it("closes with a snapshot, refuses a second close, and reopens", async () => {
    const snap = { revenue: 100, laborCost: 40, expenses: 10, profit: 50, margin: 0.5, hours: 3, currency: "EUR" }
    const closed = await closeProjectApi(WS, "prj_helio", snap)
    expect(closed.status).toBe(WorkProjectStatus.COMPLETED)
    expect(closed.closeSnapshot?.profit).toBe(50)
    await expect(closeProjectApi(WS, "prj_helio", snap)).rejects.toThrow(/already closed/)
    const reopened = await reopenProjectApi(WS, "prj_helio")
    expect(reopened.status).toBe(WorkProjectStatus.ACTIVE)
    expect(reopened.closedAt).toBeUndefined()
  })

  it("creates a project from a template with linked tasks", async () => {
    const tpl = (await listTemplatesApi(WS))[0]!
    const base = (await listProjectsApi(WS)).find((p) => p.id === "prj_orbit")!
    const created = await createProjectFromTemplateApi(WS, tpl.id, { ...base, code: "NEW-01", name: "From template", startDate: "2026-11-02", dueDate: undefined, closedAt: undefined, closeSnapshot: undefined })
    expect(created.dueDate).toBe("2026-12-21")
    const tasks = await listTasksApi(WS, created.id)
    expect(tasks).toHaveLength(tpl.tasks.length)
    const qa = tasks.find((t) => t.title === "QA and launch")!
    expect(qa.dependsOn).toHaveLength(2)
    const saved = await saveProjectAsTemplateApi(WS, created.id, "Copy")
    expect(saved.tasks).toHaveLength(tpl.tasks.length)
    await expect(saveProjectAsTemplateApi(WS, created.id, "copy")).rejects.toThrow(/already exists/)
  })
})
