import { beforeEach, describe, expect, it } from "vitest"
import { closeCycleApi, deleteCycleApi, listCyclesApi, saveCycleApi } from "./cycles-api"
import { listTasksApi, moveTaskApi, updateTaskApi } from "./work-projects-api"
import { assertCycle, burndown, cycleCapacity, cycleProgress, cycleState, nextCycleDates } from "@/lib/workforce/cycles"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { Priority, TaskStatus, type WorkTask } from "@/types/work-projects"
import { LeaveStatus, LeaveType, type LeaveRequest } from "@/types/work-planning"
import type { Employee } from "@/types/workforce"

const WS = "ws_atlas"
const today = todayIso()

describe("cycles API (P4)", () => {
  beforeEach(() => localStorage.clear())

  it("numbers cycles and refuses overlaps and cycles longer than 4 weeks", async () => {
    expect((await listCyclesApi(WS, "prj_orbit")).map((c) => c.number)).toEqual([1, 2, 3])
    await expect(saveCycleApi(WS, { projectId: "prj_orbit", name: "Overlap", startDate: addDays(today, 20), endDate: addDays(today, 30) })).rejects.toThrow(/overlap/)
    await expect(saveCycleApi(WS, { projectId: "prj_orbit", name: "Long", startDate: addDays(today, 30), endDate: addDays(today, 60) })).rejects.toThrow(/4 weeks/)
    const c = await saveCycleApi(WS, { projectId: "prj_orbit", name: " Cycle 4 ", startDate: addDays(today, 22), endDate: addDays(today, 35) })
    expect(c).toMatchObject({ number: 4, name: "Cycle 4" })
    await expect(saveCycleApi(WS, { projectId: "prj_orbit", name: "x", startDate: addDays(today, -20), endDate: addDays(today, -8) }, "cyc_orbit_1")).rejects.toThrow(/closed/)
  })

  it("only puts tasks in open cycles of their own project", async () => {
    await expect(updateTaskApi(WS, "tsk_7", { cycleId: "cyc_orbit_1" })).rejects.toThrow(/closed/)
    await expect(updateTaskApi(WS, "tsk_10", { cycleId: "cyc_orbit_2" })).rejects.toThrow(/not found/)
    expect((await updateTaskApi(WS, "tsk_7", { cycleId: "cyc_orbit_2" })).cycleId).toBe("cyc_orbit_2")
  })

  it("closes a cycle and moves unfinished tasks to the next one", async () => {
    await moveTaskApi(WS, "tsk_5", TaskStatus.DONE)
    const { cycle, next } = await closeCycleApi(WS, "cyc_orbit_2", "next")
    expect(next?.id).toBe("cyc_orbit_3")
    expect(cycle.summary).toMatchObject({ doneTasks: 1, carriedTasks: 2, carriedTo: "next", doneHours: 8 })
    const tasks = await listTasksApi(WS, "prj_orbit")
    expect(tasks.filter((t) => t.cycleId === "cyc_orbit_3").map((t) => t.id).sort()).toEqual(["tsk_3", "tsk_4", "tsk_6"])
    expect(tasks.find((t) => t.id === "tsk_5")?.cycleId).toBe("cyc_orbit_2")
    await expect(closeCycleApi(WS, "cyc_orbit_2", "next")).rejects.toThrow(/closed/)
  })

  it("makes the next cycle when there is none, or sends work back to the backlog", async () => {
    await deleteCycleApi(WS, "cyc_orbit_3")
    expect((await listTasksApi(WS, "prj_orbit")).find((t) => t.id === "tsk_6")?.cycleId).toBeUndefined()
    const { next } = await closeCycleApi(WS, "cyc_orbit_2", "next")
    expect(next).toMatchObject({ number: 3, name: "Cycle 3", startDate: addDays(today, 8), endDate: addDays(today, 21) })
    localStorage.clear()
    const back = await closeCycleApi(WS, "cyc_orbit_2", "backlog")
    expect(back.next).toBeUndefined()
    expect((await listTasksApi(WS, "prj_orbit")).filter((t) => t.cycleId === "cyc_orbit_2").map((t) => t.id)).toEqual([])
  })
})

describe("cycle rules (P4)", () => {
  const task = (id: string, over: Partial<WorkTask> = {}): WorkTask =>
    ({ id, workspaceId: "ws", projectId: "p", title: id, status: TaskStatus.TODO, priority: Priority.MEDIUM, estimatedHours: 10, subtasks: [], order: 0, createdAt: "", updatedAt: "", ...over }) as WorkTask
  const c = { startDate: "2026-10-19", endDate: "2026-10-23" }

  it("knows where a cycle stands and where the next one goes", () => {
    expect(cycleState(c, "2026-10-18")).toBe("upcoming")
    expect(cycleState(c, "2026-10-23")).toBe("active")
    expect(cycleState(c, "2026-10-24")).toBe("ended")
    expect(cycleState({ ...c, closedAt: "x" }, "2026-10-20")).toBe("closed")
    expect(nextCycleDates([c], "2026-10-21")).toEqual({ startDate: "2026-10-24", endDate: "2026-10-28" })
    expect(nextCycleDates([], "2026-10-21")).toEqual({ startDate: "2026-10-21", endDate: "2026-11-03" })
    expect(() => assertCycle({ name: "", ...c }, [])).toThrow(/name/)
    expect(() => assertCycle({ name: "x", startDate: "2026-10-23", endDate: "2026-10-19" }, [])).toThrow(/before/)
  })

  it("draws the burn-down from the hours committed to what is left each day", () => {
    const tasks = [task("a", { status: TaskStatus.DONE, completedAt: "2026-10-20T10:00:00Z" }), task("b"), task("c", { estimatedHours: 0 })]
    expect(burndown(c, tasks, "2026-10-21")).toEqual([
      { date: "2026-10-19", ideal: 21, remaining: 21 },
      { date: "2026-10-20", ideal: 15.8, remaining: 11 },
      { date: "2026-10-21", ideal: 10.5, remaining: 11 },
      { date: "2026-10-22", ideal: 5.3, remaining: null },
      { date: "2026-10-23", ideal: 0, remaining: null },
    ])
    expect(cycleProgress(tasks)).toEqual({ committedHours: 21, doneHours: 10, totalTasks: 3, doneTasks: 1, percent: 48 })
  })

  it("takes holidays and leave out of each person's capacity", () => {
    const lina = { id: "lina", weeklyCapacity: 40, workingDays: [1, 2, 3, 4, 5] } as Employee
    const leave = [
      { id: "l1", employeeId: "lina", type: LeaveType.VACATION, status: LeaveStatus.APPROVED, startDate: "2026-10-21", endDate: "2026-10-21" },
      { id: "l2", employeeId: "lina", type: LeaveType.VACATION, status: LeaveStatus.APPROVED, startDate: "2026-10-22", endDate: "2026-10-22", halfDay: true },
    ] as LeaveRequest[]
    const [cap] = cycleCapacity(c, [lina], [task("a", { assigneeId: "lina", estimatedHours: 30 }), task("b", { assigneeId: "lina", status: TaskStatus.DONE })], leave, ["2026-10-19"])
    expect(cap).toEqual({ employeeId: "lina", days: 2.5, leaveDays: 1.5, capacityHours: 20, committedHours: 30, load: 150 })
  })
})
