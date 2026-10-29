import { describe, it, expect, beforeEach } from "vitest"
import {
  createProjectApi,
  createTaskApi,
  deleteTaskApi,
  deleteMilestoneApi,
  deleteProjectApi,
  hasProjectHistory,
  listMilestonesApi,
  listProjectsApi,
  listTasksApi,
  moveTaskApi,
  projectHistoryApi,
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
import { deleteTaskViewApi, listTaskViewsApi, saveTaskViewApi, setTaskViewSharedApi } from "./task-views-api"
import { addTaskAttachmentApi, addTaskCommentApi, listTaskAttachmentsApi, listTaskCommentsApi, removeTaskAttachmentApi } from "./task-collab-api"
import { listProjectPagesApi, saveProjectPageApi } from "./project-pages-api"

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

  it("refuses to delete a project with hours or invoices, and changes nothing (D8)", async () => {
    const history = await projectHistoryApi(WS, "prj_orbit")
    expect(history.hours).toBeGreaterThan(0)
    expect(history.invoices).toBeGreaterThan(0)
    const tasksBefore = (await listTasksApi(WS, "prj_orbit")).length
    await expect(deleteProjectApi(WS, "prj_orbit")).rejects.toThrow(/history/)
    expect((await listProjectsApi(WS)).some((p) => p.id === "prj_orbit")).toBe(true)
    expect(await listTasksApi(WS, "prj_orbit")).toHaveLength(tasksBefore)
  })

  it("deletes a project without history with everything that only exists for it", async () => {
    const project = await createProjectApi(WS, projectInput)
    expect(hasProjectHistory(await projectHistoryApi(WS, project.id))).toBe(false)
    const task = await createTaskApi(WS, taskInput({ projectId: project.id }))
    await addTaskCommentApi(WS, task.id, "Ping @Lina Moreau", [{ id: "emp_lina", name: "Lina Moreau" }])
    await saveProjectPageApi(WS, { projectId: project.id, kind: "page", title: "Notes", body: "" })
    await deleteProjectApi(WS, project.id)
    expect((await listProjectsApi(WS)).some((p) => p.id === project.id)).toBe(false)
    expect(await listTasksApi(WS, project.id)).toEqual([])
    expect(await listMilestonesApi(WS, project.id)).toEqual([])
    expect(await listTaskCommentsApi(WS, task.id)).toEqual([])
    expect(await listProjectPagesApi(WS, project.id)).toEqual([])
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
    // tsk_4 sits in Orbit's own "Waiting for client" status, a column of its own (P2)
    await moveTaskApi(WS, "tsk_6", TaskStatus.IN_PROGRESS, 0)
    const column = (await listTasksApi(WS, "prj_orbit")).filter((t) => t.status === TaskStatus.IN_PROGRESS && t.stateId !== "st_orbit_waiting")
    expect(column.map((t) => t.id)).toEqual(["tsk_6", "tsk_3"])
    expect(column.map((t) => t.order)).toEqual([0, 1])
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

describe("project statuses API (P2)", () => {
  beforeEach(() => localStorage.clear())
  const get = async (id: string) => (await listTasksApi(WS, "prj_orbit")).find((t) => t.id === id)!

  it("moves a task into the project's own status and keeps its group", async () => {
    const moved = await moveTaskApi(WS, "tsk_6", "st_orbit_waiting", 0)
    expect(moved).toMatchObject({ status: TaskStatus.IN_PROGRESS, stateId: "st_orbit_waiting", order: 0 })
    expect((await get("tsk_4")).order).toBe(1)
    // a group alone lands in its first status
    expect(await moveTaskApi(WS, "tsk_6", TaskStatus.DONE)).toMatchObject({ status: TaskStatus.DONE, stateId: TaskStatus.DONE })
    await expect(moveTaskApi(WS, "tsk_6", "nope")).rejects.toThrow(/isn't part/)
  })

  it("sets the group from the status on create and update", async () => {
    const created = await createTaskApi(WS, taskInput({ stateId: "st_orbit_waiting" }))
    expect(created.status).toBe(TaskStatus.IN_PROGRESS)
    const updated = await updateTaskApi(WS, created.id, { status: TaskStatus.REVIEW })
    expect(updated).toMatchObject({ status: TaskStatus.REVIEW, stateId: TaskStatus.REVIEW })
    const cancelled = await updateTaskApi(WS, created.id, { stateId: TaskStatus.CANCELLED })
    expect(cancelled.status).toBe(TaskStatus.CANCELLED)
  })

  it("checks a project's statuses and lets tasks of a removed one fall back", async () => {
    await expect(updateProjectApi(WS, "prj_orbit", { taskStates: [{ id: "todo", group: TaskStatus.TODO }] })).rejects.toThrow(/at least one/)
    const saved = await updateProjectApi(WS, "prj_orbit", {
      taskStates: [
        { id: "todo", group: TaskStatus.TODO },
        { id: "in_progress", name: " Doing ", group: TaskStatus.IN_PROGRESS },
        { id: "review", group: TaskStatus.REVIEW },
        { id: "done", group: TaskStatus.DONE },
        { id: "cancelled", group: TaskStatus.CANCELLED },
      ],
    })
    expect(saved.taskStates?.[1]).toEqual({ id: "in_progress", name: "Doing", group: TaskStatus.IN_PROGRESS })
    // tsk_4 was in "Waiting for client": it now shows in the group's first status
    const moved = await moveTaskApi(WS, "tsk_6", "in_progress")
    expect(moved.stateId).toBe("in_progress")
  })
})

describe("saved task views (P2)", () => {
  beforeEach(() => localStorage.clear())
  const sara = { id: "usr_sara", name: "Sara" }
  const base = { projectId: "prj_orbit", shared: false, tab: "list" as const, filters: { assigneeId: "__all__", labelId: "__all__", priority: "urgent" } }

  it("shows your own views and the shared ones", async () => {
    await saveTaskViewApi(WS, { ...base, name: "Mine" }, sara)
    await saveTaskViewApi(WS, { ...base, name: "Hidden" }, { id: "usr_other", name: "Other" })
    expect((await listTaskViewsApi(WS, "prj_orbit", sara.id)).map((v) => v.name)).toEqual(["Mine", "Lina's work by priority"])
    expect(await listTaskViewsApi(WS, "prj_helio", sara.id)).toEqual([])
  })

  it("replaces your view of the same name and refuses a shared name", async () => {
    await saveTaskViewApi(WS, { ...base, name: "Urgent" }, sara)
    const again = await saveTaskViewApi(WS, { ...base, name: " urgent ", tab: "calendar" }, sara)
    expect((await listTaskViewsApi(WS, "prj_orbit", sara.id)).filter((v) => v.ownerId === sara.id)).toEqual([again])
    await expect(saveTaskViewApi(WS, { ...base, name: "Lina's work by priority" }, sara)).rejects.toThrow(/shared view/)
    await expect(saveTaskViewApi(WS, { ...base, name: "  " }, sara)).rejects.toThrow(/name/)
  })

  it("lets only the owner share, and a manager remove a shared view", async () => {
    const v = await saveTaskViewApi(WS, { ...base, name: "Mine" }, sara)
    await expect(setTaskViewSharedApi(WS, v.id, true, "usr_other")).rejects.toThrow(/Only/)
    expect((await setTaskViewSharedApi(WS, v.id, true, sara.id)).shared).toBe(true)
    await expect(deleteTaskViewApi(WS, "view_orbit_lina", sara.id, false)).rejects.toThrow(/Only/)
    await deleteTaskViewApi(WS, "view_orbit_lina", sara.id, true)
    expect((await listTaskViewsApi(WS, "prj_orbit", sara.id)).map((v) => v.name)).toEqual(["Mine"])
  })
})

describe("listTasksApi filters (backend prep)", () => {
  beforeEach(() => localStorage.clear())

  it("narrows by person, status and due dates like the server will", async () => {
    const all = await listTasksApi(WS)
    const someone = all.find((t) => t.assigneeId)!.assigneeId!
    const mine = await listTasksApi(WS, undefined, { personId: someone })
    expect(mine.length).toBeGreaterThan(0)
    expect(mine.every((t) => t.assigneeId === someone || t.collaboratorIds?.includes(someone) || t.watcherIds?.includes(someone))).toBe(true)
    const done = await listTasksApi(WS, "prj_orbit", { status: TaskStatus.DONE })
    expect(done.every((t) => t.status === TaskStatus.DONE && t.projectId === "prj_orbit")).toBe(true)
    const dated = all.filter((t) => t.dueDate).map((t) => t.dueDate!).sort()
    const mid = dated[Math.floor(dated.length / 2)]!
    const later = await listTasksApi(WS, undefined, { dueFrom: mid })
    expect(later.every((t) => !!t.dueDate && t.dueDate >= mid)).toBe(true)
    expect(later.length).toBeLessThan(all.length)
  })
})
