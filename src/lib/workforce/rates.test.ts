import { describe, it, expect, beforeEach } from "vitest"
import { rateOn, withRateChange } from "./rates"
import { employeeWorkDays, hoursPerDay, weeklyCapacity } from "./planning"
import { changeRateApi, createEmployeeApi, listEmployeesApi, updateEmployeeApi } from "@/lib/api/employees-api"
import { EmployeeStatus, EmploymentType, WorkRole } from "@/types/workforce"

const history = [
  { effectiveFrom: "2025-01-01", hourlyCost: 300, billableRate: 800 },
  { effectiveFrom: "2026-11-01", hourlyCost: 350, billableRate: 850 },
]

describe("rateOn", () => {
  it("returns the rate in force on each date (BR-4)", () => {
    const e = { hourlyCost: 350, billableRate: 850, rateHistory: history }
    expect(rateOn(e, "2026-10-15")).toEqual({ hourlyCost: 300, billableRate: 800 })
    expect(rateOn(e, "2026-11-01")).toEqual({ hourlyCost: 350, billableRate: 850 })
    expect(rateOn(e, "2024-06-01")).toEqual({ hourlyCost: 300, billableRate: 800 })
    expect(rateOn({ hourlyCost: 1, billableRate: 2 }, "2026-01-01")).toEqual({ hourlyCost: 1, billableRate: 2 })
  })

  it("replaces a change on the same date and keeps order", () => {
    const next = withRateChange(history, { effectiveFrom: "2025-01-01", hourlyCost: 310, billableRate: 810 })
    expect(next.map((c) => c.hourlyCost)).toEqual([310, 350])
  })
})

describe("rate changes", () => {
  const WS = "ws_rates"
  beforeEach(() => localStorage.clear())
  const input = {
    name: "Rania", email: "rania@x.example", jobTitle: "Consultant", role: WorkRole.EMPLOYEE,
    employmentType: EmploymentType.FULL_TIME, status: EmployeeStatus.ACTIVE, hireDate: "2025-01-01",
    hourlyCost: 300, billableRate: 800, weeklyCapacity: 40, skills: [],
  }

  it("future raises leave today's rates and past work alone", async () => {
    const e = await createEmployeeApi(WS, input)
    const raised = await changeRateApi(WS, e.id, { effectiveFrom: "2026-11-01", hourlyCost: 350, billableRate: 850 }, "2026-10-04")
    expect(raised.hourlyCost).toBe(300)
    expect(rateOn(raised, "2026-11-02").hourlyCost).toBe(350)
    await expect(changeRateApi(WS, e.id, { effectiveFrom: "2024-01-01", hourlyCost: 1, billableRate: 1 })).rejects.toThrow(/hire date/)
  })

  it("editing rates on the profile records a change instead of rewriting history", async () => {
    const e = await createEmployeeApi(WS, input)
    await updateEmployeeApi(WS, e.id, { hourlyCost: 320 })
    const [saved] = await listEmployeesApi(WS)
    expect(saved!.rateHistory).toHaveLength(2)
    expect(rateOn(saved!, "2025-06-01").hourlyCost).toBe(300)
    expect(saved!.hourlyCost).toBe(320)
  })
})

describe("working days and holidays (HR-4)", () => {
  const partTimer = { id: "p", weeklyCapacity: 24, workingDays: [1, 2, 3] }

  it("counts only the person's weekdays, minus holidays", () => {
    // Week of Monday 2 March 2026
    expect(employeeWorkDays(partTimer, "2026-03-02", "2026-03-08")).toEqual(["2026-03-02", "2026-03-03", "2026-03-04"])
    expect(employeeWorkDays({}, "2026-03-02", "2026-03-08", ["2026-03-04"])).toHaveLength(4)
    expect(hoursPerDay(partTimer)).toBe(8)
  })

  it("lowers weekly capacity on a public holiday", () => {
    const full = { ...partTimer, workingDays: undefined, weeklyCapacity: 40 } as never
    expect(weeklyCapacity(full, [], "2026-03-02")).toBe(40)
    expect(weeklyCapacity(full, [], "2026-03-02", ["2026-03-03"])).toBe(32)
  })
})
