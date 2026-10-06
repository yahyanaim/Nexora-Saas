import { describe, it, expect, beforeEach } from "vitest"
import {
  approveTimeEntriesApi,
  copyPreviousWeekApi,
  listTimeEntriesApi,
  reopenTimeEntriesApi,
  setTimesheetCellApi,
  submitTimesheetApi,
} from "@/lib/api/work-billing-api"
import { getTimerApi, startTimerApi, stopTimerApi, timerHours } from "@/lib/api/timer-api"
import { changeRateApi } from "@/lib/api/employees-api"
import { updateProjectApi } from "@/lib/api/work-projects-api"
import { entryDisplayStatus, quarterHours } from "./billing"
import { TimeEntryStatus } from "@/types/work-billing"
import { WorkProjectStatus } from "@/types/work-projects"

const WS = "ws_atlas"
// Helio: Lina is on the team, hourly project
const cell = (date: string, hours: number) => ({ employeeId: "emp_lina", projectId: "prj_helio", date, hours })

beforeEach(() => localStorage.clear())

describe("timesheet rules", () => {
  it("moves in 15-minute steps (TIM-1)", async () => {
    expect(quarterHours(1.1)).toBe(1)
    expect(quarterHours(1.13)).toBe(1.25)
    const e = await setTimesheetCellApi(WS, cell("2030-01-07", 2.4))
    expect(e!.hours).toBe(2.5)
    await expect(setTimesheetCellApi(WS, cell("2030-01-08", 0.1))).rejects.toThrow(/15 minutes/)
  })

  it("refuses hours on a closed project (TIM-4)", async () => {
    await updateProjectApi(WS, "prj_helio", { status: WorkProjectStatus.COMPLETED })
    await expect(setTimesheetCellApi(WS, cell("2030-01-07", 2))).rejects.toThrow(/closed/)
  })

  it("snapshots rates at approval so later raises don't change them (TIM-9, BR-4)", async () => {
    const e = await setTimesheetCellApi(WS, cell("2030-01-07", 3))
    await submitTimesheetApi(WS, "emp_lina", "2030-01-07", "2030-01-13")
    await approveTimeEntriesApi(WS, { isAdmin: true }, [e!.id])
    await changeRateApi(WS, "emp_lina", { effectiveFrom: "2029-01-01", hourlyCost: 99, billableRate: 999 })
    const [saved] = await listTimeEntriesApi(WS, { employeeId: "emp_lina", from: "2030-01-07", to: "2030-01-07" })
    expect(saved!.costRate).toBe(550)
    expect(saved!.billRate).toBeGreaterThan(0)
    expect(saved!.billRate).not.toBe(999)
  })

  it("reopens approved, uninvoiced hours with a reason (TIM-7)", async () => {
    const e = await setTimesheetCellApi(WS, cell("2030-01-07", 3))
    await submitTimesheetApi(WS, "emp_lina", "2030-01-07", "2030-01-13")
    await approveTimeEntriesApi(WS, { isAdmin: true }, [e!.id])
    await expect(reopenTimeEntriesApi(WS, [e!.id], " ")).rejects.toThrow(/why/)
    expect(await reopenTimeEntriesApi(WS, [e!.id], "Wrong project")).toBe(1)
    const [saved] = await listTimeEntriesApi(WS, { employeeId: "emp_lina", from: "2030-01-07", to: "2030-01-07" })
    expect(saved!.status).toBe(TimeEntryStatus.DRAFT)
    expect(saved!.billRate).toBeUndefined()
    expect(entryDisplayStatus({ ...saved!, invoiceId: "inv" })).toBe("invoiced")
  })

  it("copies last week into empty cells (TIM-13)", async () => {
    await setTimesheetCellApi(WS, cell("2030-01-07", 3))
    await setTimesheetCellApi(WS, cell("2030-01-08", 2))
    await setTimesheetCellApi(WS, cell("2030-01-15", 1))
    expect(await copyPreviousWeekApi(WS, "emp_lina", "2030-01-14")).toBe(1)
    const week = await listTimeEntriesApi(WS, { employeeId: "emp_lina", from: "2030-01-14", to: "2030-01-20" })
    expect(week.map((e) => [e.date, e.hours])).toEqual([["2030-01-14", 3], ["2030-01-15", 1]])
  })
})

describe("timer (TIM-2)", () => {
  it("rounds up to the next quarter hour and logs on stop", async () => {
    expect(timerHours("2030-01-07T09:00:00.000Z", new Date("2030-01-07T09:01:00.000Z"))).toBe(0.25)
    expect(timerHours("2030-01-07T09:00:00.000Z", new Date("2030-01-07T10:20:00.000Z"))).toBe(1.5)
    await startTimerApi(WS, { employeeId: "emp_lina", projectId: "prj_helio" }, new Date("2030-01-07T09:00:00"))
    expect(await getTimerApi(WS, "emp_lina")).not.toBeNull()
    const entry = await stopTimerApi(WS, "emp_lina", new Date("2030-01-07T10:40:00"))
    expect(entry!.hours).toBe(1.75)
    expect(await getTimerApi(WS, "emp_lina")).toBeNull()
  })

  it("keeps one timer per person: starting another logs the first", async () => {
    await startTimerApi(WS, { employeeId: "emp_lina", projectId: "prj_helio" }, new Date("2030-01-07T09:00:00"))
    await startTimerApi(WS, { employeeId: "emp_lina", projectId: "prj_orbit" }, new Date("2030-01-07T10:00:00"))
    const logged = await listTimeEntriesApi(WS, { employeeId: "emp_lina", from: "2030-01-07", to: "2030-01-07" })
    expect(logged.map((e) => [e.projectId, e.hours])).toEqual([["prj_helio", 1]])
    expect((await getTimerApi(WS, "emp_lina"))!.projectId).toBe("prj_orbit")
  })
})
