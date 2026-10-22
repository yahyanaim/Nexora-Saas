import { describe, expect, it } from "vitest"
import { invoiceWay, leaveWay, milestoneWay, quoteWay } from "./record-steps"
import { ClientInvoiceStatus, PaymentMethod, type ClientInvoice } from "@/types/work-billing"
import { QuoteStatus, type Quote } from "@/types/work-quotes"
import { TaskStatus, type Milestone, type WorkTask } from "@/types/work-projects"
import { LeaveStatus, LeaveType, type LeaveRequest } from "@/types/work-planning"

const TODAY = "2026-10-22"

const invoice = (over: Partial<ClientInvoice> = {}): ClientInvoice =>
  ({
    id: "i1",
    workspaceId: "w",
    number: "INV-1",
    clientId: "c",
    currency: "MAD",
    issueDate: "2026-10-01",
    dueDate: "2026-10-31",
    status: ClientInvoiceStatus.DRAFT,
    lines: [{ id: "l", description: "Work", quantity: 10, unitPrice: 100, timeEntryIds: [] }],
    taxRate: 0,
    createdAt: "2026-09-30T09:00:00Z",
    updatedAt: "2026-10-01T09:00:00Z",
    ...over,
  }) as ClientInvoice

const states = (steps: { state: string }[]) => steps.map((s) => s.state)

describe("invoiceWay", () => {
  it("waits on the draft itself while it is a draft", () => {
    expect(states(invoiceWay(invoice(), TODAY))).toEqual(["current", "todo", "todo", "todo"])
  })

  it("waits on sending once issued, and on payment once sent", () => {
    expect(states(invoiceWay(invoice({ status: ClientInvoiceStatus.ISSUED }), TODAY))).toEqual(["done", "done", "current", "todo"])
    const sent = invoiceWay(invoice({ status: ClientInvoiceStatus.SENT, sentAt: "2026-10-02" }), TODAY)
    expect(states(sent)).toEqual(["done", "done", "done", "current"])
    expect(sent[2]!.at).toBe("2026-10-02")
  })

  it("fills the line to paid with the share already paid", () => {
    const steps = invoiceWay(invoice({ status: ClientInvoiceStatus.SENT, payments: [{ id: "p", date: "2026-10-10", amount: 600, method: PaymentMethod.BANK_TRANSFER }] }), TODAY)
    expect(steps[3]).toMatchObject({ key: "paid", paid: 600, total: 1000, reach: 0.6 })
  })

  it("marks the waiting step late with the days past due", () => {
    const steps = invoiceWay(invoice({ status: ClientInvoiceStatus.SENT, dueDate: "2026-10-10" }), TODAY)
    expect(steps[3]).toMatchObject({ state: "late", lateDays: 12 })
  })

  it("is all done when paid and stops in red when cancelled", () => {
    expect(states(invoiceWay(invoice({ status: ClientInvoiceStatus.PAID, paidAt: "2026-10-12" }), TODAY))).toEqual(["done", "done", "done", "done"])
    const voided = invoiceWay(invoice({ status: ClientInvoiceStatus.VOID }), TODAY)
    expect(voided.map((s) => s.key)).toEqual(["draft", "issued", "cancelled"])
    expect(voided[2]!.state).toBe("stopped")
  })
})

const quote = (over: Partial<Quote> = {}): Quote =>
  ({ id: "q", workspaceId: "w", issueDate: "2026-10-01", validUntil: "2026-10-31", status: QuoteStatus.SENT, sentAt: "2026-10-02", createdAt: "2026-09-30", ...over }) as Quote

describe("quoteWay", () => {
  it("waits on the answer with the days left", () => {
    const steps = quoteWay(quote(), QuoteStatus.SENT, TODAY)
    expect(states(steps)).toEqual(["done", "done", "current", "todo"])
    expect(steps[2]!.daysLeft).toBe(9)
  })

  it("stops on declined or expired", () => {
    expect(quoteWay(quote({ decidedAt: "2026-10-05" }), QuoteStatus.DECLINED, TODAY).at(-1)).toMatchObject({ key: "declined", state: "stopped", at: "2026-10-05" })
    expect(quoteWay(quote(), "expired", TODAY).at(-1)).toMatchObject({ key: "expired", state: "stopped" })
  })

  it("waits on the invoice once accepted, then is done", () => {
    expect(states(quoteWay(quote(), QuoteStatus.ACCEPTED, TODAY))).toEqual(["done", "done", "done", "current"])
    expect(states(quoteWay(quote(), "invoiced", TODAY))).toEqual(["done", "done", "done", "done"])
  })
})

describe("milestoneWay", () => {
  const ms = (id: string, dueDate: string, over: Partial<Milestone> = {}) => ({ id, projectId: "p", title: id, dueDate, requiresApproval: false, ...over }) as Milestone
  const task = (milestoneId: string, status: TaskStatus) => ({ id: milestoneId + status, milestoneId, status }) as WorkTask

  it("orders by date: done, late, then the next one current and the rest ahead", () => {
    const steps = milestoneWay(
      [ms("c", "2026-12-01"), ms("a", "2026-09-01"), ms("b", "2026-10-15"), ms("d", "2027-01-10")],
      [task("a", TaskStatus.DONE), task("b", TaskStatus.TODO)],
      TODAY
    )
    expect(steps.map((s) => s.key)).toEqual(["a", "b", "c", "d"])
    expect(states(steps)).toEqual(["done", "late", "todo", "todo"])
    expect(steps[1]!.lateDays).toBe(7)
  })

  it("makes the first upcoming milestone current and flags one waiting on the client", () => {
    const upcoming = milestoneWay([ms("a", "2026-11-01"), ms("b", "2026-12-01")], [], TODAY)
    expect(states(upcoming)).toEqual(["current", "todo"])
    expect(upcoming[0]!.daysLeft).toBe(10)
    const waiting = milestoneWay([ms("a", "2026-11-01", { requiresApproval: true })], [task("a", TaskStatus.DONE)], TODAY)
    expect(waiting[0]).toMatchObject({ state: "current", awaitingClient: true })
  })
})

describe("leaveWay", () => {
  const req = (over: Partial<LeaveRequest> = {}) =>
    ({ id: "l", employeeId: "e", type: LeaveType.VACATION, startDate: "2026-11-02", endDate: "2026-11-06", status: LeaveStatus.PENDING, createdAt: "2026-10-20", updatedAt: "2026-10-21", ...over }) as LeaveRequest

  it("waits on one approval, or on the first of two", () => {
    expect(states(leaveWay(req(), 1))).toEqual(["done", "current"])
    expect(states(leaveWay(req(), 2))).toEqual(["done", "current", "todo"])
    expect(states(leaveWay(req({ firstApprovedBy: "m" }), 2))).toEqual(["done", "done", "current"])
  })

  it("ends done when approved and stopped when declined", () => {
    expect(states(leaveWay(req({ status: LeaveStatus.APPROVED }), 1))).toEqual(["done", "done"])
    expect(leaveWay(req({ status: LeaveStatus.REJECTED }), 1).at(-1)).toMatchObject({ key: "rejected", state: "stopped" })
  })
})
