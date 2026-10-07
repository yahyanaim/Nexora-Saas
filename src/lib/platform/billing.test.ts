import { beforeEach, describe, expect, it } from "vitest"
import { DUNNING, addDays, dunningActionsUpTo, dunningStage, invoiceTotals, matchTransfer, nextNumber, periodFrom, proration, versionOn } from "./billing"
import { accountMrr, accountsSummary } from "./customer-lifecycle"
import {
  approveRefundApi,
  changePlanApi,
  createPlanVersionApi,
  issueCreditNoteApi,
  listDunningApi,
  listInvoicesApi,
  listPaymentsApi,
  recordTransferApi,
  runBillingJobsApi,
  startSubscriptionApi,
  vatByMonth,
} from "@/lib/api/platform-billing-api"
import { createTrialApi, customersCollection, getCustomerApi, listCustomersApi } from "@/lib/api/platform-customers-api"
import { PLATFORM_WS, listAuditApi, type ConsoleActor } from "@/lib/api/platform-console-api"
import { ConsoleRole as R } from "@/types/platform-console"

const owner: ConsoleActor = { id: "stf_sophia", name: "Sophia Vance", role: R.OWNER }
const finance: ConsoleActor = { id: "stf_nadia", name: "Nadia Berrada", role: R.FINANCE }
const sales: ConsoleActor = { id: "stf_yassine", name: "Yassine Amrani", role: R.SALES }

describe("billing rules", () => {
  it("computes VAT per rate and totals to the cent (BR-06)", () => {
    const t = invoiceTotals([
      { label: "a", quantity: 1, unitPrice: 2016.13, vatRate: 20 },
      { label: "b", quantity: 2, unitPrice: 100, vatRate: 0 },
    ])
    expect(t).toMatchObject({ subtotal: 2216.13, vat: 403.23, total: 2619.36 })
  })

  it("numbers sequentially per year without gaps (BR-03)", () => {
    expect(nextNumber("NX", 2026, [])).toBe("NX-2026-00001")
    expect(nextNumber("NX", 2026, ["NX-2026-00041", "NX-2025-00099", "AV-2026-00007"])).toBe("NX-2026-00042")
    expect(nextNumber("NX", 2027, ["NX-2026-00041"])).toBe("NX-2027-00001")
    expect(nextNumber("AV", 2026, ["AV-2026-00007"])).toBe("AV-2026-00008")
  })

  it("prorates upgrades by day and gives nothing back on downgrades (§6.4)", () => {
    const p = periodFrom("2026-10-10", "monthly")
    expect(p).toEqual({ start: "2026-10-10", end: "2026-11-09", next: "2026-11-10" })
    expect(proration(1490, 3990, p.start, p.end, "2026-10-16")).toEqual({ amount: 2016.13, days: 31, remaining: 25 })
    expect(proration(3990, 1490, p.start, p.end, "2026-10-16").amount).toBe(0)
  })

  it("follows the dunning schedule (BR-08)", () => {
    expect(dunningStage(13)).toBe("reminders")
    expect(dunningStage(DUNNING.readOnly)).toBe("read_only")
    expect(dunningStage(30)).toBe("suspended")
    expect(dunningStage(45)).toBe("cancel_proposed")
    expect(dunningActionsUpTo(3).map((a) => `${a.day}${a.kind[0]}`)).toEqual(["0r", "1r", "3r", "3r"])
  })

  it("matches transfers by invoice number and amount (PAY-03) and reads the price in force (BR-02)", () => {
    const open = [{ id: "a", number: "NX-2026-00012", balance: 1788 }, { id: "b", number: "NX-2026-00013", balance: 588 }]
    expect(matchTransfer({ reference: "vir nx-2026-00012 souss", amount: 1788 }, open)?.id).toBe("a")
    expect(matchTransfer({ reference: "NX-2026-00012", amount: 1000 }, open)).toBeNull()
    expect(matchTransfer({ reference: "VIREMENT AVRIL", amount: 588 }, open)).toBeNull()
    const v = [{ plan: "business", monthly: 1490, effectiveFrom: "2024-01-01" }, { plan: "business", monthly: 1690, effectiveFrom: "2027-01-01" }]
    expect(versionOn(v, "business", "2026-12-31")?.monthly).toBe(1490)
    expect(versionOn(v, "business", "2027-01-01")?.monthly).toBe(1690)
  })
})

describe("reference scenario (§13.2, Table 34): Souss Ingénierie", () => {
  beforeEach(() => localStorage.clear())

  it("reproduces every amount to the cent", async () => {
    // 1. Sales creates the trial
    const trial = await createTrialApi(sales, { name: "Souss Ingénierie", city: "Agadir", country: "MA", plan: "business", adminName: "Amal Souiri", adminEmail: "amal@souss.ma" })
    expect(trial.status).toBe("trial")

    // 2. 10 Oct: Business, monthly, by card → 1,490 + 298 = 1,788 paid; MRR +1,490
    const start = await startSubscriptionApi(owner, trial.id, { plan: "business", billing: "monthly", method: "card" }, "2026-10-10")
    expect(start.invoice).toMatchObject({ subtotal: 1490, vat: 298, total: 1788, status: "paid" })
    expect(accountMrr((await getCustomerApi(trial.id))!)).toBe(1490)

    // 3. 12 Oct: 18 of 25 seats used
    customersCollection.update(PLATFORM_WS, trial.id, { seatsUsed: 18 })

    // 4. 16 Oct: upgrade to Enterprise → 2,500 × 25/31 = 2,016.13 + 403.23 = 2,419.36; MRR 3,990
    const up = await changePlanApi(owner, trial.id, "enterprise", "2026-10-16")
    expect(up.invoice).toMatchObject({ kind: "proration", subtotal: 2016.13, vat: 403.23, total: 2419.36, status: "paid" })
    expect(accountMrr((await getCustomerApi(trial.id))!)).toBe(3990)

    // 5. 10 Nov: renewal 3,990 + 798 = 4,788, card declined → payment overdue; MRR at risk 3,990
    await runBillingJobsApi(owner, "2026-11-10", "declined")
    const renewal = (await listInvoicesApi()).find((i) => i.customerId === trial.id && i.date === "2026-11-10")!
    expect(renewal).toMatchObject({ subtotal: 3990, vat: 798, total: 4788, status: "overdue", failedOn: "2026-11-10" })
    expect((await getCustomerApi(trial.id))!.status).toBe("payment_overdue")
    expect(accountsSummary((await listCustomersApi()).filter((c) => c.id === trial.id)).atRisk).toBe(3990)

    // 6. 13 Nov: dunning day 3 → second reminder and a declined retry; status unchanged
    await runBillingJobsApi(owner, "2026-11-13", "declined")
    const runs = (await listDunningApi()).filter((d) => d.invoiceId === renewal.id)
    expect(runs.filter((d) => d.kind === "reminder").map((d) => d.day).sort()).toEqual([0, 3])
    expect(runs.filter((d) => d.kind === "retry").every((d) => d.result === "declined")).toBe(true)
    await runBillingJobsApi(owner, "2026-11-13", "declined")
    expect((await listDunningApi()).filter((d) => d.invoiceId === renewal.id)).toHaveLength(runs.length) // idempotent (NFR-04)
    expect((await getCustomerApi(trial.id))!.status).toBe("payment_overdue")

    // 7. 15 Nov: bank transfer of 4,788 with the invoice reference → matched, active, dunning stopped
    const t = await recordTransferApi(finance, { amount: 4788, reference: `VIR ${renewal.number} SOUSS`, payer: "Souss Ingénierie", date: "2026-11-15" })
    expect(t.matched).toBe(true)
    expect((await getCustomerApi(trial.id))!.status).toBe("active")
    await runBillingJobsApi(owner, "2026-11-20", "declined")
    expect((await listDunningApi()).filter((d) => d.invoiceId === renewal.id)).toHaveLength(runs.length)

    // 9. 20 Nov: goodwill credit 1,000 + 200 → refund of 1,200 after Finance and the Owner's approval
    const credit = await issueCreditNoteApi(finance, renewal.id, { amount: 1000, reason: "Goodwill after the outage", refund: true }, "2026-11-20")
    expect(credit.creditNote).toMatchObject({ subtotal: 1000, vat: 200, total: 1200 })
    expect(credit.refund?.status).toBe("awaiting_approval")
    await expect(approveRefundApi(finance, credit.refund!.id)).rejects.toThrow(/Another team member/)
    expect((await approveRefundApi(owner, credit.refund!.id, "2026-11-20")).status).toBe("done")
    expect((await listPaymentsApi()).some((p) => p.amount === -1200 && p.status === "refunded")).toBe(true)

    // 10. 1 Dec: the customer contributes 3,990 MRR and 47,880 ARR
    const c = (await getCustomerApi(trial.id))!
    expect(accountMrr(c)).toBe(3990)
    expect(accountMrr(c) * 12).toBe(47880)

    // 13. every action is in the audit trail, and 2026 numbering has no gap (INV-01)
    expect((await listAuditApi()).filter((e) => e.customerId === trial.id).length).toBeGreaterThanOrEqual(6)
    const nums = (await listInvoicesApi()).map((i) => i.number).filter((n) => n.startsWith("NX-2026-")).map((n) => Number(n.slice(8))).sort((a, b) => a - b)
    expect(nums).toEqual(nums.map((_, i) => i + 1))
  })
})

describe("billing safeguards", () => {
  beforeEach(() => localStorage.clear())

  it("refuses downgrades below the seats in use and schedules others for renewal (SUB-03, SUB-04)", async () => {
    await expect(changePlanApi(owner, "cus_bina", "business")).rejects.toThrow(/Free 23 seats/)
    const r = await changePlanApi(owner, "cus_atlas", "starter").catch((e: Error) => e)
    expect(String(r)).toMatch(/Free 7 seats/)
    customersCollection.update(PLATFORM_WS, "cus_atlas", { seatsUsed: 4 })
    const d = await changePlanApi(owner, "cus_atlas", "starter")
    expect(d.subscription.scheduledPlan).toBe("starter")
    expect(d.invoice).toBeNull()
  })

  it("lets only owners change prices, as a new version (PLA-03, PLA-05)", async () => {
    await expect(createPlanVersionApi(finance, { plan: "business", monthly: 1690, effectiveFrom: "2027-01-01", existing: "keep" }, "2026-10-08")).rejects.toThrow(/does not allow/)
    const v = await createPlanVersionApi(owner, { plan: "business", monthly: 1690, effectiveFrom: "2027-01-01", existing: "keep" }, "2026-10-08")
    expect(v).toMatchObject({ monthly: 1690, effectiveFrom: "2027-01-01" })
    await expect(createPlanVersionApi(owner, { plan: "business", monthly: 1590, effectiveFrom: "2026-01-01", existing: "keep" }, "2026-10-08")).rejects.toThrow(/today or later/)
  })

  it("queues unknown transfers, limits credit notes and sums VAT on payments (TAX-03)", async () => {
    const q = await recordTransferApi(finance, { amount: 100, reference: "UNKNOWN", payer: "?", date: "2026-10-08" })
    expect(q.matched).toBe(false)
    const inv = (await listInvoicesApi()).find((i) => i.status === "paid" && i.customerId === "cus_atlas")!
    await expect(issueCreditNoteApi(finance, inv.id, { amount: inv.subtotal + 1, reason: "Too much", refund: false })).rejects.toThrow(/cannot exceed/)
    const small = await issueCreditNoteApi(finance, inv.id, { amount: 100, reason: "Small goodwill", refund: true })
    expect(small.refund?.status).toBe("done")
    const months = vatByMonth(await listPaymentsApi(), await listInvoicesApi())
    expect(months.length).toBeGreaterThan(0)
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01")
  })
})
