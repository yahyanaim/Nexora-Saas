import { describe, it, expect, beforeEach } from "vitest"
import { DEFAULT_KPI_SETTINGS, canSeeIndividual, kpiLight } from "./kpis"
import { deleteSavedReportApi, listSavedReportsApi, saveReportApi } from "@/lib/api/saved-reports-api"
import { updateKpiSettingsApi, getSettingsApi } from "@/lib/api/settings-api"
import { WorkRole } from "@/types/workforce"

describe("KPI targets and visibility", () => {
  it("colours a value against its target", () => {
    expect(kpiLight(80, 75)).toBe("green")
    expect(kpiLight(62, 75)).toBe("amber")
    expect(kpiLight(40, 75)).toBe("red")
    expect(kpiLight(null, 75)).toBe("none")
  })
  const team = [{ id: "boss" }, { id: "lead", managerId: "boss" }, { id: "dev", managerId: "lead" }, { id: "other" }]
  it("follows the visibility rule", () => {
    const s = DEFAULT_KPI_SETTINGS
    expect(canSeeIndividual("utilization", { employeeId: "dev", isAdmin: false }, "dev", team, s)).toBe(true)
    expect(canSeeIndividual("utilization", { employeeId: "boss", isAdmin: false }, "dev", team, s)).toBe(true)
    expect(canSeeIndividual("utilization", { employeeId: "other", isAdmin: false }, "dev", team, s)).toBe(false)
    expect(canSeeIndividual("utilization", { isAdmin: true }, "dev", team, s)).toBe(true)
    const self = { ...s, visibility: { ...s.visibility, utilization: "self" as const } }
    expect(canSeeIndividual("utilization", { employeeId: "boss", isAdmin: false }, "dev", team, self)).toBe(false)
    const all = { ...s, visibility: { ...s.visibility, revenue: "everyone" as const } }
    expect(canSeeIndividual("revenue", { employeeId: "other", isAdmin: false }, "dev", team, all)).toBe(true)
  })
})

describe("settings and saved reports APIs", () => {
  beforeEach(() => localStorage.clear())
  it("validates and stores KPI settings", async () => {
    await expect(updateKpiSettingsApi("ws_atlas", { ...DEFAULT_KPI_SETTINGS, targets: { ...DEFAULT_KPI_SETTINGS.targets, onTime: -1 } })).rejects.toThrow(/negative/)
    await updateKpiSettingsApi("ws_atlas", { ...DEFAULT_KPI_SETTINGS, targets: { ...DEFAULT_KPI_SETTINGS.targets, utilization: 70 } })
    expect((await getSettingsApi("ws_atlas")).kpi?.targets.utilization).toBe(70)
  })
  it("shares saved reports by role and lets only the owner delete", async () => {
    const base = { reportId: "utilization", filters: { preset: "thisMonth" }, ownerName: "A" }
    const mine = await saveReportApi("ws_atlas", { ...base, name: "Mine", ownerId: "u1" })
    await saveReportApi("ws_atlas", { ...base, name: "For managers", ownerId: "u1", sharedWith: WorkRole.MANAGER })
    await expect(saveReportApi("ws_atlas", { ...base, name: "mine", ownerId: "u1" })).rejects.toThrow(/already/)
    expect((await listSavedReportsApi("ws_atlas", { id: "u2", role: WorkRole.MANAGER })).map((r) => r.name)).toEqual(["For managers"])
    expect((await listSavedReportsApi("ws_atlas", { id: "u3", role: WorkRole.EMPLOYEE }))).toHaveLength(0)
    await expect(deleteSavedReportApi("ws_atlas", mine.id, "u2")).rejects.toThrow(/Only/)
    await deleteSavedReportApi("ws_atlas", mine.id, "u1")
    expect(await listSavedReportsApi("ws_atlas", { id: "u1" })).toHaveLength(1)
  })
})
