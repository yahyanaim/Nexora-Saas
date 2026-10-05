import { describe, it, expect, beforeEach } from "vitest"
import {
  clientOutstanding,
  contractStatus,
  creditStatus,
  dueSchedules,
  findDuplicateClients,
  nextRunAfter,
  normalizeCompanyName,
  periodLabel,
  reminderDue,
} from "./client-relations"
import { listRecurringApi, runDueRecurringApi, runRecurringApi, saveRecurringApi } from "@/lib/api/recurring-invoices-api"
import { listClientInvoicesApi, sendReminderApi } from "@/lib/api/work-billing-api"
import { saveContractApi } from "@/lib/api/crm-api"
import { ClientInvoiceStatus, InvoiceKind, type ClientInvoice } from "@/types/work-billing"
import { ContractType, RecurringFrequency, type RecurringInvoice } from "@/types/work-crm"
import { ClientStatus, type Client } from "@/types/workforce"

const client = (o: Partial<Client>): Client => ({
  id: "c", workspaceId: "ws", name: "C", email: "c@x.example", status: ClientStatus.ACTIVE, paymentTermsDays: 30, contacts: [], createdAt: "", updatedAt: "", ...o,
})
const invoice = (o: Partial<ClientInvoice>): ClientInvoice => ({
  id: "i1", workspaceId: "ws", number: "INV-1", clientId: "c1", currency: "EUR", issueDate: "2026-01-01", dueDate: "2026-01-31",
  status: ClientInvoiceStatus.SENT, taxRate: 0, lines: [{ id: "l", description: "x", quantity: 1, unitPrice: 1000, timeEntryIds: [] }], createdAt: "", updatedAt: "", ...o,
})

describe("duplicate clients (CRM-5)", () => {
  const existing = [
    client({ id: "a", name: "Orbit Logistics", ice: "001234567000089" }),
    client({ id: "b", name: "Helio", legalName: "Hélio Énergie SARL", taxId: "IF 12345" }),
  ]
  it("ignores case, accents, punctuation and legal forms", () => {
    expect(normalizeCompanyName("  ORBIT-Logistics, S.A.R.L ")).toBe("orbit logistics s a r l")
    expect(normalizeCompanyName("Orbit Logistics SARL")).toBe("orbit logistics")
    expect(findDuplicateClients(existing, { name: "orbit logistics sarl" }).map((d) => d.client.id)).toEqual(["a"])
    expect(findDuplicateClients(existing, { name: "Helio Energie" })[0]?.reasons).toEqual(["name"])
  })
  it("matches ICE and tax ID, and skips the client being edited", () => {
    expect(findDuplicateClients(existing, { name: "New", ice: "001234567000089" })[0]?.reasons).toEqual(["ice"])
    expect(findDuplicateClients(existing, { name: "New", taxId: "if12345" })[0]?.reasons).toEqual(["taxId"])
    expect(findDuplicateClients(existing, { name: "Orbit Logistics" }, "a")).toEqual([])
    expect(findDuplicateClients(existing, { name: "Or" })).toEqual([])
  })
})

describe("contracts (CRM-4)", () => {
  it("derives upcoming, active, renewal due and ended", () => {
    const today = "2026-06-15"
    expect(contractStatus({ startDate: "2026-07-01" }, today)).toBe("upcoming")
    expect(contractStatus({ startDate: "2026-01-01" }, today)).toBe("active")
    expect(contractStatus({ startDate: "2026-01-01", renewalDate: "2026-07-10" }, today)).toBe("renewal_due")
    expect(contractStatus({ startDate: "2026-01-01", endDate: "2026-07-01" }, today)).toBe("renewal_due")
    expect(contractStatus({ startDate: "2026-01-01", endDate: "2026-06-01" }, today)).toBe("ended")
  })
  it("refuses an end before the start", async () => {
    localStorage.clear()
    await expect(saveContractApi("ws_x", { clientId: "c", title: "T", type: ContractType.RETAINER, startDate: "2026-02-01", endDate: "2026-01-01", currency: "EUR" })).rejects.toThrow(/before the start/)
  })
})

describe("credit limit (CRM-8)", () => {
  it("adds open balances and warns above the limit", () => {
    const all = [invoice({}), invoice({ id: "i2", payments: [{ id: "p", date: "2026-02-01", amount: 400, method: "bank_transfer" as never }] }), invoice({ id: "i3", status: ClientInvoiceStatus.PAID })]
    expect(clientOutstanding("c1", all)).toBe(1600)
    expect(creditStatus({ creditLimit: 2000 }, 1600).over).toBe(false)
    expect(creditStatus({ creditLimit: 2000 }, 1600, 500).over).toBe(true)
    expect(creditStatus({}, 1600).limit).toBeUndefined()
  })
})

describe("recurring schedule rules (BIL-14)", () => {
  it("moves one period forward and clamps month ends", () => {
    expect(nextRunAfter("2026-01-31", RecurringFrequency.MONTHLY)).toBe("2026-02-28")
    expect(nextRunAfter("2026-11-15", RecurringFrequency.QUARTERLY)).toBe("2027-02-15")
    expect(nextRunAfter("2028-02-29", RecurringFrequency.YEARLY)).toBe("2029-02-28")
    expect(periodLabel("2026-11-15", RecurringFrequency.QUARTERLY)).toBe("Q4 2026")
    expect(periodLabel("2026-11-15", RecurringFrequency.MONTHLY)).toBe("2026-11")
  })
  it("lists active, unfinished schedules that are due", () => {
    const s = (o: Partial<RecurringInvoice>) => ({ id: "r", active: true, nextRunDate: "2026-06-01", ...o }) as RecurringInvoice
    expect(dueSchedules([s({}), s({ id: "p", active: false }), s({ id: "f", nextRunDate: "2026-07-01" }), s({ id: "e", endDate: "2026-05-01" })], "2026-06-10").map((x) => x.id)).toEqual(["r"])
  })
})

describe("overdue reminders (BIL-15)", () => {
  const settings = { enabled: true, days: [3, 15, 30] as [number, number, number] }
  it("goes up one level at a time, in order, even when very late", () => {
    const inv = invoice({})
    expect(reminderDue(inv, [inv], "2026-02-02", settings)).toBeNull()
    expect(reminderDue(inv, [inv], "2026-02-03", settings)).toBe(1)
    expect(reminderDue(invoice({ reminders: [{ invoiceId: "i1", level: 1, to: "", at: "" }] }), [inv], "2026-02-10", settings)).toBeNull()
    expect(reminderDue(inv, [inv], "2026-03-15", settings)).toBe(1)
    expect(reminderDue(invoice({ reminders: [{ invoiceId: "i1", level: 1, to: "", at: "" }] }), [inv], "2026-03-15", settings)).toBe(2)
    expect(reminderDue(invoice({ reminders: [1, 2, 3].map((level) => ({ invoiceId: "i1", level: level as 1 | 2 | 3, to: "", at: "" })) }), [inv], "2026-03-15", settings)).toBeNull()
  })
  it("skips paid invoices, credit notes, opted-out clients and switched-off settings", () => {
    const paid = invoice({ status: ClientInvoiceStatus.PAID })
    expect(reminderDue(paid, [paid], "2026-03-15", settings)).toBeNull()
    const cn = invoice({ kind: InvoiceKind.CREDIT_NOTE })
    expect(reminderDue(cn, [cn], "2026-03-15", settings)).toBeNull()
    const inv = invoice({})
    expect(reminderDue(inv, [inv], "2026-03-15", settings, { remindersOff: true })).toBeNull()
    expect(reminderDue(inv, [inv], "2026-03-15", { ...settings, enabled: false })).toBeNull()
  })
})

describe("recurring and reminder APIs", () => {
  beforeEach(() => localStorage.clear())

  it("drafts a due schedule once, moves it on and refuses paused ones", async () => {
    const ws = "ws_atlas"
    const before = (await listClientInvoicesApi(ws)).length
    const count = await runDueRecurringApi(ws)
    expect(count).toBe(1)
    const invoices = await listClientInvoicesApi(ws)
    expect(invoices.length).toBe(before + 1)
    const draft = invoices.find((i) => i.recurringId === "rec_1")!
    expect(draft.status).toBe(ClientInvoiceStatus.DRAFT)
    expect(draft.lines).toHaveLength(2)
    expect(await runDueRecurringApi(ws)).toBe(0)
    const s = (await listRecurringApi(ws)).find((x) => x.id === "rec_1")!
    expect(s.invoiceIds).toEqual([draft.id])
    await saveRecurringApi(ws, { ...s, active: false }, s.id)
    await expect(runRecurringApi(ws, s.id)).rejects.toThrow(/paused/)
  })

  it("logs each reminder level once", async () => {
    const ws = "ws_atlas"
    const open = (await listClientInvoicesApi(ws)).find((i) => i.status === ClientInvoiceStatus.SENT || i.status === ClientInvoiceStatus.ISSUED)!
    const sent = await sendReminderApi(ws, open.id, 1)
    expect(sent.reminders?.[0]?.level).toBe(1)
    await expect(sendReminderApi(ws, open.id, 1)).rejects.toThrow(/already/)
  })
})
