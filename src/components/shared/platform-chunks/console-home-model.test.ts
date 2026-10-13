import { beforeEach, describe, expect, it } from "vitest"
import { attentionList, homeFigures, revenueBy } from "./console-home-model"
import { headline, monthlyTable, overdueAging, trialConversion } from "@/lib/platform/metrics"
import { accountMrr } from "@/lib/platform/customer-lifecycle"
import { listInvoicesApi } from "@/lib/api/platform-billing-api"
import { listCustomersApi } from "@/lib/api/platform-customers-api"
import type { CustomerAccount } from "@/types/platform-customers"
import type { SupportRequest } from "@/types/platform-support"

beforeEach(() => localStorage.clear())
const today = new Date().toISOString().slice(0, 10)

describe("console home tiles", () => {
  it("show the Metrics page's own figures, with no other formula", async () => {
    const [invoices, accounts] = await Promise.all([listInvoicesApi(), listCustomersApi()])
    const f = homeFigures(invoices, accounts, today, 12, "previous")
    const rows = monthlyTable(invoices, accounts, today, 12)
    const head = headline(rows, accounts)
    expect(f.mrr).toBe(head.mrr)
    expect(f.arr).toBe(head.arr)
    expect(f.window.map((r) => r.mrr)).toEqual(rows.map((r) => r.mrr))
    expect(f.churn).toBe(rows[rows.length - 1]!.customerChurn)
    expect(f.trials).toEqual(trialConversion(accounts))
    expect(f.owed).toBe(overdueAging(invoices, today).total)
    expect(f.overdue).toBeLessThanOrEqual(f.owed)
  })

  it("compare with the previous period, the same month last year, or nothing", async () => {
    const [invoices, accounts] = await Promise.all([listInvoicesApi(), listCustomersApi()])
    const prev = homeFigures(invoices, accounts, today, 3, "previous")
    const year = homeFigures(invoices, accounts, today, 3, "lastYear")
    const none = homeFigures(invoices, accounts, today, 3, "none")
    expect(prev.window).toHaveLength(3)
    const long = monthlyTable(invoices, accounts, today, 15)
    expect(prev.reference!.month).toBe(long[long.length - 4]!.month)
    expect(year.reference!.month).toBe(long[long.length - 13]!.month)
    expect(none.reference).toBeUndefined()
    expect(none.mrrChange).toBeNull()
    if (prev.reference!.mrr) expect(prev.mrrChange).toBeCloseTo((prev.mrr - prev.reference!.mrr) / prev.reference!.mrr, 10)
  })
})

describe("revenue by plan and by country", () => {
  it("adds up the Customers page's MRR per group, biggest first", async () => {
    const accounts = await listCustomersApi()
    const plans = revenueBy(accounts, "plan")
    const total = accounts.reduce((s, a) => s + accountMrr(a), 0)
    expect(plans.reduce((s, g) => s + g.mrr, 0)).toBeCloseTo(total, 2)
    expect(plans.map((g) => g.mrr)).toEqual([...plans.map((g) => g.mrr)].sort((a, b) => b - a))
    const countries = revenueBy(accounts, "country")
    expect(countries.find((g) => g.key === "MA")!.customers).toBe(accounts.filter((a) => a.country === "MA" && accountMrr(a) > 0).length)
  })
})

describe("needs your attention", () => {
  const acc = (id: string, patch: Partial<CustomerAccount>) => ({ id, name: id, status: "active", ...patch }) as CustomerAccount
  const req = (id: string, patch: Partial<SupportRequest>) =>
    ({ id, number: `SR-${id}`, customerName: "Atlas", subject: "Export stops", priority: "urgent", status: "open", createdAt: "2026-10-01T00:00:00Z", ...patch }) as SupportRequest

  it("lists overdue customers, trials ending within 7 days and urgent open requests, each with its page", () => {
    const items = attentionList(
      [
        acc("late", { status: "payment_overdue" }),
        acc("soon", { status: "trial", trialEndsOn: "2026-10-16" }),
        acc("later", { status: "trial", trialEndsOn: "2026-10-30" }),
        acc("ended", { status: "trial", trialEndsOn: "2026-10-10" }),
        acc("fine", {}),
      ],
      [req("1", {}), req("2", { priority: "high" }), req("3", { status: "resolved" }), req("4", { status: "waiting_customer" })],
      "2026-10-13"
    )
    expect(items.map((i) => `${i.kind}:${i.id}`)).toEqual(["overdue:late", "trial:soon", "support:1", "support:4"])
    expect(items[0]!.href).toBe("/dashboard/platform/late")
    expect(items[1]).toMatchObject({ days: 3, href: "/dashboard/platform/soon" })
    expect(items[2]!.href).toBe("/dashboard/support-desk?request=1")
  })

  it("is empty when nothing needs anyone", () => {
    expect(attentionList([acc("fine", {})], [], "2026-10-13")).toEqual([])
  })
})
