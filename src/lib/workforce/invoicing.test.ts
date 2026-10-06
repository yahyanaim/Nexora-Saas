import { describe, it, expect, beforeEach } from "vitest"
import { displayStatus, fiscalYearOf, formatInvoiceNumber, invoiceTotals, nextSequence, toBase } from "./billing"
import {
  createInvoiceFromHoursApi,
  issueInvoiceApi,
  listTimeEntriesApi,
  recordPaymentApi,
  setTimesheetCellApi,
  updateInvoiceDraftApi,
  voidInvoiceApi,
} from "@/lib/api/work-billing-api"
import { listProjectsApi } from "@/lib/api/work-projects-api"
import { updatePeriodLockApi } from "@/lib/api/settings-api"
import { unbilledEntries } from "./billing"
import { ClientInvoiceStatus, InvoiceKind, PaymentMethod, type ClientInvoice } from "@/types/work-billing"

describe("totals (section 6.5)", () => {
  it("taxes each rate on the sum of its lines, then withholds", () => {
    const t = invoiceTotals({
      taxRate: 20,
      withholdingRate: 10,
      lines: [
        { id: "a", description: "", quantity: 1, unitPrice: 1000.005, timeEntryIds: [] },
        { id: "b", description: "", quantity: 2, unitPrice: 50, timeEntryIds: [], taxRate: 10 },
        { id: "c", description: "", quantity: 1, unitPrice: 200, timeEntryIds: [], taxRate: 0 },
      ],
    })
    expect(t.subtotal).toBe(1300.01)
    expect(t.taxes).toEqual([
      { rate: 20, base: 1000.01, amount: 200 },
      { rate: 10, base: 100, amount: 10 },
      { rate: 0, base: 200, amount: 0 },
    ])
    expect(t.tax).toBe(210)
    expect(t.withholding).toBe(151)
    expect(t.total).toBe(1359.01)
  })

  it("converts to the base currency with the stored rate", () => {
    expect(toBase(100, { exchangeRate: 10.823456 })).toBe(1082.35)
    expect(toBase(100, {})).toBe(100)
  })
})

describe("numbering (BR-12)", () => {
  it("restarts each fiscal year and never reuses cancelled numbers", () => {
    expect(fiscalYearOf("2026-06-30", 7)).toBe(2025)
    expect(fiscalYearOf("2026-07-01", 7)).toBe(2026)
    const issued = (number: string, status = ClientInvoiceStatus.ISSUED) =>
      ({ number, status, fiscalYear: 2026, issueDate: "2026-02-01" }) as Pick<ClientInvoice, "number" | "status" | "fiscalYear" | "issueDate" | "kind">
    expect(nextSequence([issued("INV-2026-001"), issued("INV-2026-002", ClientInvoiceStatus.VOID)], 2026)).toBe(3)
    expect(nextSequence([issued("INV-2026-004")], 2027)).toBe(1)
    expect(nextSequence([{ ...issued("CN-2026-001"), kind: InvoiceKind.CREDIT_NOTE }], 2026)).toBe(1)
    expect(formatInvoiceNumber("FAC/{YYYY}/{SEQ}", 2026, 7)).toBe("FAC/2026/007")
  })
})

describe("payments and status", () => {
  const WS = "ws_atlas"
  beforeEach(() => localStorage.clear())

  async function issuedHelioInvoice() {
    const hours = unbilledEntries(await listTimeEntriesApi(WS), await listProjectsApi(WS), "cli_helio")
    const draft = await createInvoiceFromHoursApi(WS, { clientId: "cli_helio", entryIds: hours.map((e) => e.id), taxRate: 20, issueDate: "2030-02-01" })
    return issueInvoiceApi(WS, draft.id)
  }

  it("takes partial payments, refuses overpayment, then marks paid (BIL-12)", async () => {
    const inv = await issuedHelioInvoice()
    const { total } = invoiceTotals(inv)
    const part = await recordPaymentApi(WS, inv.id, { date: "2030-02-10", amount: 100, method: PaymentMethod.CASH })
    expect(displayStatus(part, "2030-02-11")).toBe("partially_paid")
    await expect(recordPaymentApi(WS, inv.id, { date: "2030-02-11", amount: total, method: PaymentMethod.CASH })).rejects.toThrow(/left to pay/)
    const paid = await recordPaymentApi(WS, inv.id, { date: "2030-02-12", amount: total - 100, method: PaymentMethod.BANK_TRANSFER, reference: "VIR-88" })
    expect(paid.status).toBe(ClientInvoiceStatus.PAID)
    await expect(voidInvoiceApi(WS, inv.id)).rejects.toThrow()
  })

  it("can't cancel an invoice that has payments", async () => {
    const inv = await issuedHelioInvoice()
    await recordPaymentApi(WS, inv.id, { date: "2030-02-10", amount: 10, method: PaymentMethod.CASH })
    await expect(voidInvoiceApi(WS, inv.id)).rejects.toThrow(/credit note/)
  })

  it("needs an exchange rate to issue in another currency (BIL-7)", async () => {
    const hours = unbilledEntries(await listTimeEntriesApi(WS), await listProjectsApi(WS), "cli_helio")
    const draft = await createInvoiceFromHoursApi(WS, { clientId: "cli_helio", entryIds: hours.map((e) => e.id), taxRate: 20, issueDate: "2030-02-01" })
    await updateInvoiceDraftApi(WS, draft.id, { currency: "EUR" } as never)
    await expect(issueInvoiceApi(WS, draft.id)).rejects.toThrow(/exchange rate/)
    await updateInvoiceDraftApi(WS, draft.id, { exchangeRate: 10.8323456789, exchangeRateDate: "2030-02-01" })
    const issued = await issueInvoiceApi(WS, draft.id)
    expect(issued.exchangeRate).toBe(10.832346)
  })
})

describe("period lock (BR-7)", () => {
  const WS = "ws_atlas"
  beforeEach(() => localStorage.clear())

  it("blocks hours and invoices dated inside the locked period", async () => {
    await updatePeriodLockApi(WS, "2030-01-31")
    await expect(setTimesheetCellApi(WS, { employeeId: "emp_lina", projectId: "prj_helio", date: "2030-01-15", hours: 1 })).rejects.toThrow(/locked/)
    await expect(createInvoiceFromHoursApi(WS, { clientId: "cli_helio", entryIds: ["x"], taxRate: 20, issueDate: "2030-01-20" })).rejects.toThrow(/locked/)
    await updatePeriodLockApi(WS, null)
    await expect(setTimesheetCellApi(WS, { employeeId: "emp_lina", projectId: "prj_helio", date: "2030-01-15", hours: 1 })).resolves.toBeTruthy()
  })
})
