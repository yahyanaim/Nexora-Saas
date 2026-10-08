import { beforeEach, describe, expect, it } from "vitest"
import { accountsSummary } from "./customer-lifecycle"
import { churnRates, headline, invoiceMonthly, lastMonths, monthlyTable, movements, overdueAging, referenceDay, trialConversion } from "./metrics"
import { listInvoicesApi } from "@/lib/api/platform-billing-api"
import { listCustomersApi } from "@/lib/api/platform-customers-api"
import type { NxInvoice } from "@/types/platform-billing"
import type { CustomerAccount } from "@/types/platform-customers"

const inv = (p: Partial<NxInvoice>): NxInvoice => ({
  id: "i", workspaceId: "w", number: "NX", customerId: "c", customerName: "C", kind: "subscription", date: "2026-01-01", dueDate: "2026-01-01",
  periodFrom: "2026-01-01", periodTo: "2026-01-31", lines: [], subtotal: 1490, vat: 298, total: 1788, paid: 1788, credited: 0, status: "paid",
  einvoice: "accepted", createdAt: "", updatedAt: "", ...p,
})

describe("metric formulas", () => {
  it("counts a yearly invoice for a twelfth and measures each month on its last day (§6.2)", () => {
    expect(invoiceMonthly(inv({ subtotal: 14900, periodFrom: "2026-01-01", periodTo: "2026-12-31" }))).toBe(1241.67)
    expect(invoiceMonthly(inv({ kind: "proration" }))).toBe(0)
    expect(lastMonths("2026-10-07", 3)).toEqual(["2026-08", "2026-09", "2026-10"])
    expect(referenceDay("2026-09", "2026-10-07")).toBe("2026-09-30")
    expect(referenceDay("2026-10", "2026-10-07")).toBe("2026-10-07")
  })

  it("splits the MRR change into movements that add up (MET-02) and gives churn rates (MET-03)", () => {
    const prev = new Map([["a", 490], ["b", 1490], ["c", 490]])
    const cur = new Map([["a", 1490], ["b", 490], ["d", 490], ["e", 490]])
    const m = movements(prev, cur, new Set(["e"]))
    expect(m).toEqual({ new: 490, expansion: 1000, contraction: -1000, churn: -490, reactivation: 490 })
    const sum = m.new + m.expansion + m.contraction + m.churn + m.reactivation
    expect(sum).toBe(2960 - 2470)
    expect(churnRates(prev, cur)).toEqual({ customer: 1 / 3, revenue: 1490 / 2470 })
    expect(churnRates(new Map(), cur)).toEqual({ customer: null, revenue: null })
  })

  it("ages what is still owed (MET-05)", () => {
    const list = [
      inv({ id: "1", dueDate: "2026-10-20", paid: 0 }),
      inv({ id: "2", dueDate: "2026-09-20", paid: 1000 }),
      inv({ id: "3", dueDate: "2026-08-01", paid: 0, credited: 288 }),
      inv({ id: "4", dueDate: "2026-06-01", paid: 0 }),
      inv({ id: "5", dueDate: "2026-06-01" }),
    ]
    const a = overdueAging(list, "2026-10-07")
    expect(a.buckets).toEqual({ not_due: { amount: 1788, count: 1 }, d1_30: { amount: 788, count: 1 }, d31_60: { amount: 0, count: 0 }, over_60: { amount: 3288, count: 2 } })
    expect(a.total).toBe(1788 + 788 + 1500 + 1788)
  })

  it("measures trial conversion on ended trials (MET-04)", () => {
    const acc = (p: Partial<CustomerAccount>) => ({ id: "x", status: "active", ...p }) as CustomerAccount
    const r = trialConversion([
      acc({ trialStartedOn: "2026-01-01", convertedOn: "2026-01-11" }),
      acc({ trialStartedOn: "2026-01-01", convertedOn: "2026-01-15" }),
      acc({ trialStartedOn: "2026-02-01", status: "cancelled" }),
      acc({ trialStartedOn: "2026-10-01", status: "trial" }),
      acc({}),
    ])
    expect(r).toEqual({ converted: 2, lost: 1, running: 1, rate: 2 / 3, medianDays: 12 })
  })
})

describe("metrics on the demo data", () => {
  beforeEach(() => localStorage.clear())

  it("reconciles with invoices and the Customers page (exit gate of phase 4)", async () => {
    const today = new Date().toISOString().slice(0, 10)
    const invoices = await listInvoicesApi()
    const accounts = await listCustomersApi()
    const rows = monthlyTable(invoices, accounts, today, 6)
    expect(rows).toHaveLength(6)
    // the current month is the Customers page MRR
    expect(rows[5]!.mrr).toBe(accountsSummary(accounts).mrr)
    // every month: movements add up to the change
    for (const r of rows) {
      const m = r.movements
      expect(Math.round((m.new + m.expansion + m.contraction + m.churn + m.reactivation) * 100) / 100).toBe(r.change)
    }
    // Atlas's upgrade and Fès's cancellation are in the window
    expect(rows.some((r) => r.movements.expansion === 1000)).toBe(true)
    expect(rows.some((r) => r.movements.churn === -490)).toBe(true)
    // the overdue total equals the unpaid invoices
    const unpaid = invoices.reduce((s, i) => s + Math.max(0, i.total - i.paid - i.credited), 0)
    expect(overdueAging(invoices, today).total).toBe(Math.round(unpaid * 100) / 100)
    const h = headline(rows, accounts)
    expect(h.arr).toBe(Math.round(h.mrr * 12 * 100) / 100)
    expect(trialConversion(accounts)).toMatchObject({ converted: 5, lost: 1, medianDays: 12 })
  })
})
