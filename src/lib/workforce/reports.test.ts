import { describe, expect, it } from "vitest"
import { REPORT_IDS, buildReport, type ReportData } from "./reports"
import { seedClients, seedDepartments, seedEmployees } from "./demo-seed"
import { seedProjects, seedTasks } from "./project-seed"
import { seedClientInvoices, seedTimeEntries } from "./billing-seed"
import { ExpenseCategory, ExpenseStatus } from "@/types/work-costs"
import { todayIso } from "./project-metrics"
import { addDays } from "./billing"

const WS = "ws_atlas"
const today = todayIso()
const data: ReportData = {
  entries: seedTimeEntries(WS),
  invoices: seedClientInvoices(WS),
  projects: seedProjects(WS),
  clients: seedClients(WS),
  employees: seedEmployees(WS),
  departments: seedDepartments(WS),
  expenses: [{ id: "x1", workspaceId: WS, employeeId: "emp_lina", projectId: "prj_helio", date: addDays(today, -10), category: ExpenseCategory.SOFTWARE, description: "=cmd", amount: 100, billable: true, status: ExpenseStatus.APPROVED, createdAt: "", updatedAt: "" }],
  tasks: seedTasks(WS),
  leave: [],
}
const year = { from: addDays(today, -364), to: today }

describe("standard reports (RPT-4)", () => {
  it("builds every report with columns, rows and totals", () => {
    for (const id of REPORT_IDS) {
      const r = buildReport(id, data, year, { canSeeCosts: true, today })
      expect(r.columns.length).toBeGreaterThan(3)
      expect(r.rows.length).toBeGreaterThan(0)
    }
  })

  it("filters by client, project, employee and department", () => {
    const orbit = buildReport("timesheet", data, { ...year, clientId: "cli_orbit" }, { canSeeCosts: true, today })
    expect(orbit.rows.every((r) => r.client === "Orbit Logistics")).toBe(true)
    const lina = buildReport("timesheet", data, { ...year, employeeId: "emp_lina" }, { canSeeCosts: true, today })
    expect(lina.rows.every((r) => r.employee === "Lina Moreau")).toBe(true)
    const design = buildReport("billable", data, { ...year, departmentId: "dep_design" }, { canSeeCosts: true, today })
    expect(design.rows.map((r) => r.employee).sort()).toEqual(["Amina Tazi", "Julia Schmidt"])
    const helio = buildReport("invoices", data, { ...year, projectId: "prj_helio" }, { canSeeCosts: true, today })
    expect(helio.rows.every((r) => r.client === "Helio Energy")).toBe(true)
  })

  it("totals match the rows and ratios are recomputed, not summed", () => {
    const r = buildReport("profitability", data, year, { canSeeCosts: true, today })
    const revenue = r.rows.reduce((s, x) => s + Number(x.revenue), 0)
    expect(Math.round(Number(r.totals.revenue))).toBe(Math.round(revenue))
    expect(Number(r.totals.margin)).toBeLessThan(100)
  })

  it("unbilled work only lists approved, unbilled hourly hours", () => {
    const r = buildReport("unbilled", data, year, { canSeeCosts: true, today })
    expect(r.rows.every((x) => String(x.project).startsWith("HEL"))).toBe(true)
  })
})

describe("cost visibility (RPT-8)", () => {
  it("removes cost, profit and margin for people without the permission", () => {
    for (const id of ["timesheet", "billable", "profitability"] as const) {
      const full = buildReport(id, data, year, { canSeeCosts: true, today })
      const limited = buildReport(id, data, year, { canSeeCosts: false, today })
      expect(full.columns.some((c) => c.sensitive)).toBe(true)
      expect(limited.columns.some((c) => c.sensitive)).toBe(false)
      for (const key of ["cost", "laborCost", "profit", "margin"]) {
        expect(limited.rows.every((r) => !(key in r))).toBe(true)
        expect(key in limited.totals).toBe(false)
      }
    }
  })
})
