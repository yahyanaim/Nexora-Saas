import { describe, it, expect, beforeEach } from "vitest"
import {
  createProjectApi,
  createTaskApi,
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
  TaskStatus,
  WorkProjectStatus,
  type WorkProjectInput,
  type WorkTaskInput,
} from "@/types/work-projects"

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
