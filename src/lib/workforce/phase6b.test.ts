import { describe, it, expect } from "vitest"
import { cleanCustomValues, customFieldErrors, fieldsFor, validateFieldDefs } from "./custom-fields"
import { monthlyOverhead, overheadRate } from "./overhead"
import { projectProfit } from "./profitability"
import { updateCustomFieldsApi, updateOverheadsApi } from "@/lib/api/settings-api"
import { EmployeeStatus, type Employee } from "@/types/workforce"
import { BudgetType, type WorkProject } from "@/types/work-projects"
import { TimeEntryStatus, type TimeEntry } from "@/types/work-billing"
import type { CustomFieldDef } from "@/types/work-settings"

const person = (o: Partial<Employee>) => ({ id: "e1", hourlyCost: 50, billableRate: 100, weeklyCapacity: 40, status: EmployeeStatus.ACTIVE, ...o }) as Employee

describe("Overheads", () => {
  const items = [{ id: "a", name: "Rent", monthlyAmount: 6000 }, { id: "b", name: "Software", monthlyAmount: 934 }]
  it("spreads monthly overhead over the team's capacity", () => {
    expect(monthlyOverhead(items)).toBe(6934)
    // 2 people × 40 h × 52/12 = 346.67 h
    expect(overheadRate(items, [person({}), person({ id: "e2" }), person({ id: "e3", status: EmployeeStatus.INACTIVE })])).toBe(20)
    expect(overheadRate([], [person({})])).toBe(0)
    expect(overheadRate(items, [])).toBe(0)
  })
  it("adds overhead per logged hour to project cost", () => {
    const project = { id: "p", budgetType: BudgetType.NON_BILLABLE, clientId: undefined } as unknown as WorkProject
    const entries = [{ id: "t", projectId: "p", employeeId: "e1", hours: 10, billable: true, status: TimeEntryStatus.APPROVED, date: "2026-10-01" }] as TimeEntry[]
    const base = { entries, tasks: [], expenses: [], employees: [person({})], clients: [] }
    const without = projectProfit(project, base)
    const withOh = projectProfit(project, { ...base, overheadRate: 20 })
    expect(without.overhead).toBe(0)
    expect(withOh.overhead).toBe(200)
    expect(withOh.profit).toBe(without.profit - 200)
  })
  it("refuses unnamed or negative lines", async () => {
    await expect(updateOverheadsApi("ws_atlas", [{ id: "x", name: "", monthlyAmount: 10 }])).rejects.toThrow(/name/)
    await expect(updateOverheadsApi("ws_atlas", [{ id: "x", name: "Rent", monthlyAmount: -1 }])).rejects.toThrow(/negative/)
    const s = await updateOverheadsApi("ws_atlas", [{ id: "x", name: " Rent ", monthlyAmount: 5000 }, { id: "y", name: "", monthlyAmount: 0 }])
    expect(s.overheads).toEqual([{ id: "x", name: "Rent", monthlyAmount: 5000 }])
  })
})

describe("Custom fields", () => {
  const defs: CustomFieldDef[] = [
    { id: "po", entity: "client", label: "PO number", type: "text", required: true },
    { id: "size", entity: "client", label: "Employees", type: "number" },
    { id: "tier", entity: "client", label: "Tier", type: "select", options: ["Gold", "Silver"] },
    { id: "kick", entity: "project", label: "Kick-off", type: "date" },
  ]
  it("filters by entity and checks values", () => {
    expect(fieldsFor(defs, "client").map((d) => d.id)).toEqual(["po", "size", "tier"])
    expect(customFieldErrors(fieldsFor(defs, "client"), { size: "abc", tier: "Bronze" })).toEqual({ po: "required", size: "number", tier: "option" })
    expect(customFieldErrors(fieldsFor(defs, "client"), { po: "A-1", size: "12", tier: "Gold" })).toEqual({})
    expect(customFieldErrors(fieldsFor(defs, "project"), { kick: "01/02/2026" })).toEqual({ kick: "date" })
  })
  it("cleans empty and unknown values", () => {
    expect(cleanCustomValues(fieldsFor(defs, "client"), { po: " A-1 ", size: "", gone: "x" })).toEqual({ po: "A-1" })
    expect(cleanCustomValues(fieldsFor(defs, "client"), { size: "" })).toBeUndefined()
  })
  it("validates definitions", async () => {
    expect(() => validateFieldDefs([{ id: "a", entity: "client", label: " ", type: "text" }])).toThrow(/name/)
    expect(() => validateFieldDefs([{ id: "a", entity: "client", label: "Tier", type: "select", options: ["Gold"] }])).toThrow(/two choices/)
    expect(() => validateFieldDefs([defs[0]!, { ...defs[0]!, id: "b", label: "po number" }])).toThrow(/Two fields/)
    const s = await updateCustomFieldsApi("ws_atlas", [{ id: "t", entity: "client", label: " Tier ", type: "select", options: ["Gold", " ", "Silver "] }])
    expect(s.customFields).toEqual([{ id: "t", entity: "client", label: "Tier", type: "select", options: ["Gold", "Silver"] }])
  })
})
