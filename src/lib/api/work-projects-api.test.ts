import { describe, it, expect, beforeEach } from "vitest"
import {
  createProjectApi,
  createTaskApi,
  deleteTaskApi,
  deleteMilestoneApi,
  deleteProjectApi,
  listMilestonesApi,
  listProjectsApi,
  listTasksApi,
  moveTaskApi,
  updateProjectApi,
  updateTaskApi,
} from "./work-projects-api"
import {
  BudgetType,
  Priority,
  TaskRelationType,
  TaskStatus,
  WorkProjectStatus,
  type WorkProjectInput,
  type WorkTaskInput,
} from "@/types/work-projects"
import { addTaskAttachmentApi, listTaskAttachmentsApi, removeTaskAttachmentApi } from "./task-collab-api"

const WS = "ws_atlas"

const projectInput: WorkProjectInput = {
  code: "NEW-01",
  name: "New project",
  memberIds: ["emp_lina"],
  managerId: "emp_karim",
  status: WorkProjectStatus.ACTIVE,
  priority: Priority.MEDIUM,
  startDate: "2026-01-01",
  dueDate: "2026-02-01",
  budgetType: BudgetType.HOURLY,
}

const taskInput = (overrides: Partial<WorkTaskInput> = {}): WorkTaskInput => ({
  projectId: "prj_orbit",
  title: "Task",
  status: TaskStatus.TODO,
  priority: Priority.MEDIUM,
  estimatedHours: 2,
  subtasks: [],
  ...overrides,
})

describe("work projects API", () => {
  beforeEach(() => localStorage.clear())

  it("adds the manager to the team", async () => {
    const created = await createProjectApi(WS, projectInput)
    expect(created.memberIds).toEqual(["emp_karim", "emp_lina"])
  })

  it("rejects a duplicate code and a due date before the start", async () => {
    await expect(createProjectApi(WS, { ...projectInput, code: "orb-01" })).rejects.toThrow(/code/)
    await expect(createProjectApi(WS, { ...projectInput, dueDate: "2025-12-01" })).rejects.toThrow(/due date/)
  })

  it("deletes a project with its tasks and milestones", async () => {
    await deleteProjectApi(WS, "prj_orbit")
    expect((await listProjectsApi(WS)).some((p) => p.id === "prj_orbit")).toBe(false)
    expect(await listTasksApi(WS, "prj_orbit")).toEqual([])
    expect(await listMilestonesApi(WS, "prj_orbit")).toEqual([])
  })

  it("only assigns tasks to team members", async () => {
    await expect(createTaskApi(WS, taskInput({ assigneeId: "emp_yassine" }))).rejects.toThrow(/team/)
    await expect(createTaskApi(WS, taskInput({ assigneeId: "emp_lina" }))).resolves.toBeTruthy()
  })

  it("unassigns tasks of people removed from the team", async () => {
    await updateProjectApi(WS, "prj_orbit", { memberIds: ["emp_karim", "emp_lina", "emp_julia", "emp_noah"] })
    const tasks = await listTasksApi(WS, "prj_orbit")
    expect(tasks.find((t) => t.id === "tsk_3")?.assigneeId).toBeUndefined()
    expect(tasks.find((t) => t.id === "tsk_4")?.assigneeId).toBe("emp_lina")
  })

  it("moves a task to a position and renumbers the column", async () => {
    await moveTaskApi(WS, "tsk_6", TaskStatus.IN_PROGRESS, 0)
    const column = (await listTasksApi(WS, "prj_orbit")).filter((t) => t.status === TaskStatus.IN_PROGRESS)
    expect(column.map((t) => t.id)).toEqual(["tsk_6", "tsk_3", "tsk_4"])
    expect(column.map((t) => t.order)).toEqual([0, 1, 2])
  })

  it("stamps completedAt when a task is done and clears it when reopened", async () => {
    const done = await moveTaskApi(WS, "tsk_6", TaskStatus.DONE)
    expect(done.completedAt).toBeTruthy()
    const reopened = await updateTaskApi(WS, "tsk_6", { status: TaskStatus.TODO })
    expect(reopened.completedAt).toBeUndefined()
  })

  it("keeps tasks when their milestone is deleted", async () => {
    await deleteMilestoneApi(WS, "ms_orbit_beta")
    const task = (await listTasksApi(WS, "prj_orbit")).find((t) => t.id === "tsk_3")
    expect(task).toBeTruthy()
    expect(task?.milestoneId).toBeUndefined()
  })
})

describe("richer tasks API (P1)", () => {
  beforeEach(() => localStorage.clear())

  it("numbers new tasks after the highest in the project", async () => {
    const before = await listTasksApi(WS, "prj_orbit")
    const max = Math.max(...before.map((t) => t.number ?? 0))
    expect(max).toBeGreaterThan(0)
    const created = await createTaskApi(WS, taskInput())
    expect(created.number).toBe(max + 1)
  })

  it("keeps collaborators on the team and drops the main assignee from them", async () => {
    await expect(createTaskApi(WS, taskInput({ assigneeId: "emp_lina", collaboratorIds: ["emp_yassine"] }))).rejects.toThrow(/team/)
    const created = await createTaskApi(WS, taskInput({ assigneeId: "emp_lina", collaboratorIds: ["emp_lina", "emp_omar", "emp_omar"] }))
    expect(created.collaboratorIds).toEqual(["emp_omar"])
  })

  it("checks links and relations", async () => {
    await expect(updateTaskApi(WS, "tsk_6", { links: [{ id: "l1", url: "javascript:alert(1)" }] })).rejects.toThrow(/http/)
    await expect(updateTaskApi(WS, "tsk_6", { relations: [{ type: TaskRelationType.RELATES, taskId: "tsk_6" }] })).rejects.toThrow(/itself/)
    await expect(updateTaskApi(WS, "tsk_6", { relations: [{ type: TaskRelationType.RELATES, taskId: "tsk_nope" }] })).rejects.toThrow(/not found/)
    const saved = await updateTaskApi(WS, "tsk_6", { links: [{ id: "l1", url: " https://figma.com/x ", title: " Mockup " }], relations: [{ type: TaskRelationType.DUPLICATE, taskId: "tsk_4" }] })
    expect(saved.links).toEqual([{ id: "l1", url: "https://figma.com/x", title: "Mockup" }])
    expect(saved.relations).toEqual([{ type: TaskRelationType.DUPLICATE, taskId: "tsk_4" }])
  })

  it("removes relations to a deleted task", async () => {
    await updateTaskApi(WS, "tsk_6", { relations: [{ type: TaskRelationType.RELATES, taskId: "tsk_4" }] })
    await deleteTaskApi(WS, "tsk_4")
    expect((await listTasksApi(WS, "prj_orbit")).find((t) => t.id === "tsk_6")?.relations ?? []).toEqual([])
  })

  it("limits attachments by size and count", async () => {
    const file = { name: "brief.txt", type: "text/plain", size: 10, dataUrl: "data:text/plain;base64,aGk=" }
    await expect(addTaskAttachmentApi(WS, "tsk_6", { ...file, size: 600 * 1024 })).rejects.toThrow(/500 KB/)
    await expect(addTaskAttachmentApi(WS, "tsk_6", { ...file, dataUrl: "nope" })).rejects.toThrow(/read/)
    for (let i = 0; i < 10; i++) await addTaskAttachmentApi(WS, "tsk_6", file)
    await expect(addTaskAttachmentApi(WS, "tsk_6", file)).rejects.toThrow(/10 files/)
    const list = await listTaskAttachmentsApi(WS, "tsk_6")
    expect(list).toHaveLength(10)
    await removeTaskAttachmentApi(WS, list[0]!.id)
    expect(await listTaskAttachmentsApi(WS, "tsk_6")).toHaveLength(9)
  })
})
