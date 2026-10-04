import { describe, it, expect, beforeEach } from "vitest"
import { createCreditNoteApi, createInvoiceApi, createInvoiceFromHoursApi, issueInvoiceApi, listClientInvoicesApi, listTimeEntriesApi, setTimesheetCellApi, submitTimesheetApi, approveTimeEntriesApi } from "@/lib/api/work-billing-api"
import { createProjectApi, listProjectsApi } from "@/lib/api/work-projects-api"
import { billedAgainstBudget, openAdvances } from "./invoice-builders"
import { buildInvoiceLines, invoiceTotals, unbilledEntries } from "./billing"
import { InvoiceKind, TimeEntryStatus, type TimeEntry } from "@/types/work-billing"
import { BudgetType, Priority, WorkProjectStatus } from "@/types/work-projects"

const WS = "ws_atlas"
beforeEach(() => localStorage.clear())

describe("fixed price and milestones (BIL-3, BIL-18)", () => {
  it("bills shares of the price, tracks the billed share, and never exceeds the price", async () => {
    const inv = await createInvoiceApi(WS, { kind: InvoiceKind.FIXED, clientId: "cli_orbit", projectId: "prj_orbit", percent: 30, taxRate: 20 })
    expect(invoiceTotals(inv).subtotal).toBe(14400) // 30% of 48,000
    await issueInvoiceApi(WS, inv.id)
    const orbit = (await listProjectsApi(WS)).find((p) => p.id === "prj_orbit")!
    expect(billedAgainstBudget(orbit, await listClientInvoicesApi(WS))).toMatchObject({ billed: 14400, percent: 30, remaining: 33600 })
    await expect(createInvoiceApi(WS, { kind: InvoiceKind.FIXED, clientId: "cli_orbit", projectId: "prj_orbit", percent: 80, taxRate: 20 })).rejects.toThrow(/more than the project price/)
    const ms = await createInvoiceApi(WS, { kind: InvoiceKind.MILESTONE, clientId: "cli_orbit", projectId: "prj_orbit", milestoneId: "ms_orbit_beta", amount: 12000, taxRate: 20 })
    expect(ms.lines[0]!.description).toContain("Beta release")
    // A credit note gives the share back
    await createCreditNoteApi(WS, inv.id, { releaseHours: false })
    expect(billedAgainstBudget(orbit, await listClientInvoicesApi(WS)).billed).toBe(0)
  })

  it("refuses projects of another client and hourly projects", async () => {
    await expect(createInvoiceApi(WS, { kind: InvoiceKind.FIXED, clientId: "cli_helio", projectId: "prj_orbit", percent: 10, taxRate: 20 })).rejects.toThrow(/project of this client/)
    await expect(createInvoiceApi(WS, { kind: InvoiceKind.FIXED, clientId: "cli_helio", projectId: "prj_helio", percent: 10, taxRate: 20 })).rejects.toThrow(/fixed-price/)
  })
})

describe("retainer (section 6.5)", () => {
  it("bills the monthly amount in full plus hours beyond the included ones", async () => {
    const project = await createProjectApi(WS, {
      code: "RET-01", name: "Support retainer", clientId: "cli_helio", memberIds: ["emp_lina"], status: WorkProjectStatus.ACTIVE,
      priority: Priority.MEDIUM, startDate: "2030-01-01", budgetType: BudgetType.RETAINER,
      retainer: { monthlyAmount: 3000, includedHours: 10, overageRate: 150 },
    })
    const days = ["2030-03-04", "2030-03-05", "2030-03-06"]
    for (const d of days) await setTimesheetCellApi(WS, { employeeId: "emp_lina", projectId: project.id, date: d, hours: 4 })
    await submitTimesheetApi(WS, "emp_lina", "2030-03-04", "2030-03-10")
    await approveTimeEntriesApi(WS, (await listTimeEntriesApi(WS, { from: "2030-03-04", to: "2030-03-06" })).map((e) => e.id))
    const inv = await createInvoiceApi(WS, { kind: InvoiceKind.RETAINER, clientId: "cli_helio", projectId: project.id, month: "2030-03", taxRate: 20 })
    expect(inv.lines.map((l) => [l.quantity, l.unitPrice])).toEqual([[1, 3000], [2, 150]])
    expect(invoiceTotals(inv).subtotal).toBe(3300)
    // The month's hours are now on the invoice, and the month can't be billed twice
    expect((await listTimeEntriesApi(WS, { from: "2030-03-04", to: "2030-03-06" })).every((e) => e.invoiceId === inv.id)).toBe(true)
    await expect(createInvoiceApi(WS, { kind: InvoiceKind.RETAINER, clientId: "cli_helio", projectId: project.id, month: "2030-03", taxRate: 20 })).rejects.toThrow(/already invoiced/)
  })
})

describe("advances (section 6.5)", () => {
  it("deducts an issued advance on the final invoice and reverses its tax in proportion", async () => {
    const adv = await createInvoiceApi(WS, { kind: InvoiceKind.ADVANCE, clientId: "cli_helio", amount: 1000, taxRate: 20 })
    await issueInvoiceApi(WS, adv.id)
    expect(openAdvances("cli_helio", await listClientInvoicesApi(WS))).toHaveLength(1)
    const hours = unbilledEntries(await listTimeEntriesApi(WS), await listProjectsApi(WS), "cli_helio")
    const final = await createInvoiceFromHoursApi(WS, { clientId: "cli_helio", entryIds: hours.map((e) => e.id), taxRate: 20, deductAdvances: true })
    const deduction = final.lines.find((l) => l.advanceInvoiceId === adv.id)!
    expect(deduction.quantity * deduction.unitPrice).toBe(-1000)
    const plain = invoiceTotals({ ...final, lines: final.lines.filter((l) => !l.advanceInvoiceId) })
    expect(plain.total - invoiceTotals(final).total).toBe(1200) // 1,000 + 200 tax reversed
    expect(openAdvances("cli_helio", await listClientInvoicesApi(WS))).toHaveLength(0)
  })
})

describe("grouping hours (BIL-4)", () => {
  const entry = (o: Partial<TimeEntry>): TimeEntry => ({
    id: Math.random().toString(36), workspaceId: "ws", employeeId: "a", projectId: "p", date: "2030-01-01", hours: 2,
    billable: true, status: TimeEntryStatus.APPROVED, billRate: 100, createdAt: "", updatedAt: "", ...o,
  })
  const rows = [entry({ taskId: "t1" }), entry({ taskId: "t1", employeeId: "b", date: "2030-01-02" }), entry({ taskId: "t2", date: "2030-01-02" })]
  const project = { id: "p", code: "P", name: "Proj" } as never
  const people = [{ id: "a", name: "Ana" }, { id: "b", name: "Bo" }] as never

  it("groups by person, task or day", () => {
    let n = 0
    const id = () => String(++n)
    expect(buildInvoiceLines(rows, [project], people, undefined, id, "person").map((l) => l.quantity)).toEqual([4, 2])
    expect(buildInvoiceLines(rows, [project], people, undefined, id, "task", [{ id: "t1", title: "Design" }, { id: "t2", title: "Build" }]).map((l) => l.description)).toEqual(["P · Proj — Design", "P · Proj — Build"])
    expect(buildInvoiceLines(rows, [project], people, undefined, id, "day").map((l) => l.quantity)).toEqual([2, 4])
  })
})
