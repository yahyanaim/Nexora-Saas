import { describe, it, expect, beforeEach } from "vitest"
import {
  issueInvoiceApi,
  approveTimeEntriesApi,
  createInvoiceFromHoursApi,
  deleteInvoiceDraftApi,
  listClientInvoicesApi,
  listTimeEntriesApi,
  markInvoicePaidApi,
  markInvoiceSentApi,
  rejectTimeEntriesApi,
  setTimesheetCellApi,
  submitTimesheetApi,
  updateInvoiceDraftApi,
  voidInvoiceApi,
} from "./work-billing-api"
import { listProjectsApi } from "./work-projects-api"
import { ClientInvoiceStatus, TimeEntryStatus } from "@/types/work-billing"
import { unbilledEntries } from "@/lib/workforce/billing"

const WS = "ws_atlas"
const DAY = "2030-01-07" // a Monday far from the seeded weeks

describe("timesheets", () => {
  beforeEach(() => localStorage.clear())

  it("creates, updates and clears a cell", async () => {
    const created = await setTimesheetCellApi(WS, { employeeId: "emp_lina", projectId: "prj_orbit", date: DAY, hours: 3 })
    expect(created).toMatchObject({ hours: 3, status: TimeEntryStatus.DRAFT, billable: true })
    const updated = await setTimesheetCellApi(WS, { employeeId: "emp_lina", projectId: "prj_orbit", date: DAY, hours: 5 })
    expect(updated?.id).toBe(created?.id)
    await setTimesheetCellApi(WS, { employeeId: "emp_lina", projectId: "prj_orbit", date: DAY, hours: 0 })
    expect(await listTimeEntriesApi(WS, { employeeId: "emp_lina", from: DAY, to: DAY })).toEqual([])
  })

  it("marks hours on non-billable projects as not billable", async () => {
    // The sample internal project is completed; reopen it so it accepts hours
    const { updateProjectApi } = await import("./work-projects-api")
    const { WorkProjectStatus } = await import("@/types/work-projects")
    await updateProjectApi(WS, "prj_site", { status: WorkProjectStatus.ACTIVE })
    const e = await setTimesheetCellApi(WS, { employeeId: "emp_julia", projectId: "prj_site", date: DAY, hours: 2 })
    expect(e?.billable).toBe(false)
  })

  it("refuses people outside the team and more than 24 hours a day", async () => {
    await expect(setTimesheetCellApi(WS, { employeeId: "emp_yassine", projectId: "prj_orbit", date: DAY, hours: 1 })).rejects.toThrow(/team/)
    await setTimesheetCellApi(WS, { employeeId: "emp_lina", projectId: "prj_orbit", date: DAY, hours: 20 })
    await expect(setTimesheetCellApi(WS, { employeeId: "emp_lina", projectId: "prj_helio", date: DAY, hours: 5 })).rejects.toThrow(/24/)
  })

  it("locks submitted hours, and reopens them when rejected", async () => {
    const e = (await setTimesheetCellApi(WS, { employeeId: "emp_lina", projectId: "prj_orbit", date: DAY, hours: 3 }))!
    await submitTimesheetApi(WS, "emp_lina", DAY, DAY)
    await expect(setTimesheetCellApi(WS, { employeeId: "emp_lina", projectId: "prj_orbit", date: DAY, hours: 4 })).rejects.toThrow(/can't be changed/)

    await expect(rejectTimeEntriesApi(WS, { isAdmin: true }, [e.id], " ")).rejects.toThrow(/reason/)
    await rejectTimeEntriesApi(WS, { isAdmin: true }, [e.id], "Wrong project")
    const fixed = await setTimesheetCellApi(WS, { employeeId: "emp_lina", projectId: "prj_orbit", date: DAY, hours: 4 })
    expect(fixed).toMatchObject({ status: TimeEntryStatus.DRAFT, rejectionReason: undefined })
  })

  it("only reviews submitted hours", async () => {
    const e = (await setTimesheetCellApi(WS, { employeeId: "emp_lina", projectId: "prj_orbit", date: DAY, hours: 3 }))!
    await expect(approveTimeEntriesApi(WS, { isAdmin: true }, [e.id])).rejects.toThrow(/submitted/)
    await submitTimesheetApi(WS, "emp_lina", DAY, DAY)
    expect(await approveTimeEntriesApi(WS, { isAdmin: true }, [e.id])).toBe(1)
  })
})

describe("client invoices", () => {
  beforeEach(() => localStorage.clear())

  async function unbilledHelio() {
    return unbilledEntries(await listTimeEntriesApi(WS), await listProjectsApi(WS), "cli_helio")
  }

  it("refuses to issue an invoice to a Moroccan company without its ICE", async () => {
    const { updateClientApi } = await import("./clients-api")
    await updateClientApi(WS, "cli_helio", { ice: undefined })
    const invoice = await createInvoiceFromHoursApi(WS, { clientId: "cli_helio", entryIds: (await unbilledHelio()).map((e) => e.id), taxRate: 20, issueDate: "2030-02-01" })
    await expect(issueInvoiceApi(WS, invoice.id)).rejects.toThrow(/client's ICE/)
    await updateClientApi(WS, "cli_helio", { ice: "001 523 874 000 062" })
    expect((await issueInvoiceApi(WS, invoice.id)).number).toBe("INV-2030-001")
  })

  it("seeds a paid invoice and leaves approved Helio hours to bill", async () => {
    const invoices = await listClientInvoicesApi(WS)
    expect(invoices.some((i) => i.status === ClientInvoiceStatus.PAID)).toBe(true)
    expect((await unbilledHelio()).length).toBeGreaterThan(0)
  })

  it("drafts an invoice from hours, numbers it when issued and marks the hours invoiced", async () => {
    const hours = await unbilledHelio()
    const invoice = await createInvoiceFromHoursApi(WS, { clientId: "cli_helio", entryIds: hours.map((e) => e.id), taxRate: 20, issueDate: "2030-02-01" })
    // Drafts have no number yet, so deleting one never leaves a gap (BR-12)
    expect(invoice.number).toBe("")
    expect((await issueInvoiceApi(WS, invoice.id)).number).toBe("INV-2030-001")
    expect(invoice.dueDate).toBe("2030-03-18") // Helio pays at 45 days
    expect(invoice.lines.flatMap((l) => l.timeEntryIds).sort()).toEqual(hours.map((e) => e.id).sort())
    expect(await unbilledHelio()).toEqual([])
    await expect(createInvoiceFromHoursApi(WS, { clientId: "cli_helio", entryIds: [hours[0]!.id], taxRate: 20 })).rejects.toThrow(/no longer available/)
  })

  it("frees the hours when a draft is deleted or a sent invoice cancelled", async () => {
    const hours = await unbilledHelio()
    const draft = await createInvoiceFromHoursApi(WS, { clientId: "cli_helio", entryIds: hours.map((e) => e.id), taxRate: 0 })
    await deleteInvoiceDraftApi(WS, draft.id)
    expect((await unbilledHelio()).length).toBe(hours.length)

    const sent = await createInvoiceFromHoursApi(WS, { clientId: "cli_helio", entryIds: hours.map((e) => e.id), taxRate: 0 })
    await markInvoiceSentApi(WS, sent.id)
    await expect(deleteInvoiceDraftApi(WS, sent.id)).rejects.toThrow(/cancel/)
    await voidInvoiceApi(WS, sent.id)
    expect((await unbilledHelio()).length).toBe(hours.length)
  })

  it("follows draft → sent → paid and locks after sending", async () => {
    const hours = await unbilledHelio()
    const inv = await createInvoiceFromHoursApi(WS, { clientId: "cli_helio", entryIds: hours.map((e) => e.id), taxRate: 20 })
    await expect(markInvoicePaidApi(WS, inv.id)).rejects.toThrow(/issued/)
    await markInvoiceSentApi(WS, inv.id)
    await expect(updateInvoiceDraftApi(WS, inv.id, { taxRate: 10 })).rejects.toThrow(/draft/)
    const paid = await markInvoicePaidApi(WS, inv.id)
    expect(paid.paidAt).toBeTruthy()
  })

  it("keeps the hours of lines billed from time", async () => {
    const hours = await unbilledHelio()
    const inv = await createInvoiceFromHoursApi(WS, { clientId: "cli_helio", entryIds: hours.map((e) => e.id), taxRate: 20 })
    const changed = inv.lines.map((l, i) => (i === 0 ? { ...l, quantity: l.quantity + 1 } : l))
    await expect(updateInvoiceDraftApi(WS, inv.id, { lines: changed })).rejects.toThrow(/hours/)
    const withManual = [...inv.lines, { id: "m1", description: "Hosting", quantity: 1, unitPrice: 50, timeEntryIds: [] }]
    expect((await updateInvoiceDraftApi(WS, inv.id, { lines: withManual })).lines).toHaveLength(inv.lines.length + 1)
  })
})
