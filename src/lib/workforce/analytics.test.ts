import { describe, expect, it } from "vitest"
import { analyticsWindows, bucketsOf, change, computeAnalytics, cumulative, sparkline } from "./analytics"
import { seedClientInvoices, seedTimeEntries } from "./billing-seed"
import { seedClients, seedEmployees } from "./demo-seed"
import { seedProjects } from "./project-seed"
import { invoiceTotals } from "./billing"
import { ClientInvoiceStatus, InvoiceKind } from "@/types/work-billing"

const WS = "ws_atlas"
const data = () => ({
  entries: seedTimeEntries(WS),
  invoices: seedClientInvoices(WS),
  projects: seedProjects(WS),
  clients: seedClients(WS),
  employees: seedEmployees(WS),
  expenses: [],
  leave: [],
})

describe("windows and buckets", () => {
  it("compares with the period just before, or the same one a year earlier", () => {
    const w = analyticsWindows("30d", "previous", "2026-10-04")
    expect(w.current).toEqual({ from: "2026-09-05", to: "2026-10-04" })
    expect(w.previous).toEqual({ from: "2026-08-06", to: "2026-09-04" })
    expect(analyticsWindows("7d", "lastYear", "2026-10-04").previous.to).toBe("2025-10-05")
    expect(analyticsWindows("ytd", "none", "2026-10-04")).toMatchObject({ bucket: "month", showComparison: false })
  })

  it("cuts months on calendar boundaries", () => {
    const slots = bucketsOf({ from: "2026-01-15", to: "2026-03-10" }, "month")
    expect(slots.map((s) => [s.from, s.to])).toEqual([
      ["2026-01-15", "2026-01-31"],
      ["2026-02-01", "2026-02-28"],
      ["2026-03-01", "2026-03-10"],
    ])
  })

  it("measures change as percent or points", () => {
    expect(change(120, 100)).toBe(20)
    expect(change(40, 50, "points")).toBe(-10)
    expect(change(5, 0)).toBeNull()
    expect(sparkline([1, 1, 2, 2], 2)).toEqual([50, 100])
    expect(cumulative([1, 2, 3])).toEqual([1, 3, 6])
  })
})

describe("computeAnalytics on the demo year", () => {
  const a = computeAnalytics(data(), "1y", "previous", {}, "2026-10-04")

  it("earns revenue from approved billable hours and splits it by client", () => {
    expect(a.current.revenue).toBeGreaterThan(100000)
    expect(a.clients[0]?.name).toBe("Orbit Logistics")
    const sum = a.clients.reduce((s, c) => s + c.revenue, 0)
    expect(Math.round(sum)).toBe(Math.round(a.current.revenue))
    expect(a.series).toHaveLength(13)
  })

  it("prices hours the same way the invoices did", () => {
    // Every history invoice bills hours at the rates the analytics use
    const billed = data().invoices.filter((i) => i.kind === InvoiceKind.HOURS && i.issueDate >= "2026-01-01" && i.issueDate < "2026-10-01")
    const invoiced = billed.reduce((s, i) => s + invoiceTotals(i).subtotal, 0)
    const ytd = computeAnalytics(data(), "ytd", "none", {}, "2026-08-31")
    expect(Math.abs(ytd.current.revenue - invoiced) / invoiced).toBeLessThan(0.25)
  })

  it("keeps the bridge balanced", () => {
    const [start, growth, added, decline, lost, end] = a.bridge.map((s) => s.amount) as number[]
    expect(Math.round(start! + growth! + added! - decline! - lost!)).toBe(Math.round(end!))
  })

  it("flags overdue clients and reports receivables", () => {
    expect(a.receivables.overdue).toBeGreaterThan(0)
    expect(a.risks.find((r) => r.clientId === "cli_medica")).toMatchObject({ reason: "overdue", level: "high" })
    expect(a.current.utilization).toBeGreaterThan(20)
    expect(a.current.margin).toBeGreaterThan(0)
  })

  it("filters by client", () => {
    const orbit = computeAnalytics(data(), "1y", "previous", { clientId: "cli_orbit" }, "2026-10-04")
    expect(orbit.clients.map((c) => c.clientId)).toEqual(["cli_orbit"])
    expect(orbit.current.collected).toBe(
      Math.round(
        data()
          .invoices.filter((i) => i.clientId === "cli_orbit" && i.status === ClientInvoiceStatus.PAID)
          .flatMap((i) => i.payments ?? [])
          .filter((p) => p.date >= "2025-10-05")
          .reduce((s, p) => s + p.amount, 0) * 100
      ) / 100
    )
  })
})
