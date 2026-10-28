import { beforeEach, describe, expect, it } from "vitest"
import { addRepeat, isArchived, nextDates, taskBinDaysLeft } from "./task-repeat"
import { createTaskApi, deleteTaskApi, listDeletedTasksApi, listTasksApi, moveTaskApi, purgeTaskApi, restoreTaskApi, updateTaskApi } from "@/lib/api/work-projects-api"
import { Priority, TaskStatus } from "@/types/work-projects"

describe("project extras: repeat, bin, archive", () => {
  beforeEach(() => localStorage.clear())

  it("moves dates by days, weeks and months, keeping month ends", () => {
    expect(addRepeat("2026-03-30", { every: "day", interval: 3 })).toBe("2026-04-02")
    expect(addRepeat("2026-03-30", { every: "week", interval: 2 })).toBe("2026-04-13")
    expect(addRepeat("2026-01-31", { every: "month", interval: 1 })).toBe("2026-02-28")
    expect(addRepeat("2026-11-15", { every: "month", interval: 3 })).toBe("2027-02-15")
  })

  it("gives the next dates, never already late, and stops after the end", () => {
    const repeat = { every: "week" as const, interval: 1 }
    expect(nextDates({ repeat, dueDate: "2026-03-06", startDate: "2026-03-04" }, "2026-03-05")).toEqual({ dueDate: "2026-03-13", startDate: "2026-03-11" })
    expect(nextDates({ repeat, dueDate: "2026-03-06" }, "2026-03-25")).toEqual({ dueDate: "2026-03-27" })
    expect(nextDates({ repeat }, "2026-03-05")).toEqual({ dueDate: "2026-03-12" })
    expect(nextDates({ repeat: { ...repeat, until: "2026-03-10" }, dueDate: "2026-03-06" }, "2026-03-05")).toBeNull()
  })

  it("archives tasks done more than 30 days ago", () => {
    expect(isArchived({ status: TaskStatus.DONE, completedAt: "2026-01-01T10:00:00Z" }, "2026-03-01")).toBe(true)
    expect(isArchived({ status: TaskStatus.DONE, completedAt: "2026-02-20T10:00:00Z" }, "2026-03-01")).toBe(false)
    expect(isArchived({ status: TaskStatus.TODO, completedAt: undefined }, "2026-03-01")).toBe(false)
    expect(taskBinDaysLeft("2026-03-01T00:00:00Z", new Date("2026-03-11T00:00:00Z"))).toBe(20)
  })

  const base = { projectId: "prj_orbit", title: "Weekly client report", priority: Priority.MEDIUM, status: TaskStatus.TODO, estimatedHours: 2, subtasks: [{ id: "s", title: "Send", done: true }] }

  it("creates the next task once when a repeating task is done", async () => {
    const t = await createTaskApi("ws_atlas", { ...base, dueDate: "2099-01-09", repeat: { every: "week", interval: 1 } })
    await expect(updateTaskApi("ws_atlas", t.id, { repeat: { every: "week", interval: 20 } })).rejects.toThrow(/1 to 12/)
    const done = await moveTaskApi("ws_atlas", t.id, TaskStatus.DONE)
    expect(done.nextTaskId).toBeTruthy()
    const all = await listTasksApi("ws_atlas", "prj_orbit")
    const next = all.find((x) => x.id === done.nextTaskId)!
    expect(next).toMatchObject({ title: "Weekly client report", status: TaskStatus.TODO, dueDate: "2099-01-16", repeat: { every: "week", interval: 1 } })
    expect(next.subtasks[0]!.done).toBe(false)
    expect(next.number).toBeGreaterThan(t.number!)
    // reopening and finishing again doesn't make another one
    await moveTaskApi("ws_atlas", t.id, TaskStatus.TODO)
    await updateTaskApi("ws_atlas", t.id, { status: TaskStatus.DONE })
    expect((await listTasksApi("ws_atlas", "prj_orbit")).filter((x) => x.title === "Weekly client report")).toHaveLength(2)
  })

  it("keeps deleted tasks to restore, or removes them for good", async () => {
    const t = await createTaskApi("ws_atlas", base)
    await deleteTaskApi("ws_atlas", t.id)
    expect((await listTasksApi("ws_atlas", "prj_orbit")).some((x) => x.id === t.id)).toBe(false)
    expect((await listDeletedTasksApi("ws_atlas", "prj_orbit")).map((x) => x.id)).toEqual([t.id])
    await restoreTaskApi("ws_atlas", t.id)
    expect((await listTasksApi("ws_atlas", "prj_orbit")).some((x) => x.id === t.id)).toBe(true)
    await expect(restoreTaskApi("ws_atlas", t.id)).rejects.toThrow(/not in the deleted/)
    await deleteTaskApi("ws_atlas", t.id)
    await purgeTaskApi("ws_atlas", t.id)
    expect(await listDeletedTasksApi("ws_atlas", "prj_orbit")).toEqual([])
  })
})
