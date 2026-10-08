import { beforeEach, describe, expect, it } from "vitest"
import { customerHealth, seatLimit, accountMrr } from "./customer-lifecycle"
import { nxUblXml } from "./nx-ubl"
import { planById } from "./nexora-catalog"
import { listCustomersApi, updateCustomerApi } from "@/lib/api/platform-customers-api"
import {
  cancelNowApi,
  changeBillingApi,
  changeMethodApi,
  customerChangePlanApi,
  listCreditNotesApi,
  listInvoicesApi,
  listSubscriptionsApi,
  runBillingJobsApi,
  setDiscountApi,
  setExtensionApi,
  updatePlanContentApi,
} from "@/lib/api/platform-billing-api"
import { sellerSnapshot } from "@/lib/api/platform-config-api"
import { listAuditApi, type ConsoleActor } from "@/lib/api/platform-console-api"
import { listAudit } from "@/lib/workforce/audit"
import { ConsoleRole as R } from "@/types/platform-console"

const sophia: ConsoleActor = { id: "stf_sophia", name: "Sophia Vance", role: R.OWNER }
const nadia: ConsoleActor = { id: "stf_nadia", name: "Nadia Berrada", role: R.FINANCE }
const liam: ConsoleActor = { id: "stf_liam", name: "Liam O'Connor", role: R.SUPPORT }
const alex = { name: "Alex Morgan", email: "alex.morgan@company.io" }
const byId = async (id: string) => (await listCustomersApi()).find((c) => c.id === id)!
const subOf = async (id: string) => (await listSubscriptionsApi()).find((s) => s.customerId === id)!

describe("customer rules", () => {
  it("scores health from payment, seats, sign-in and support (CUS-11)", () => {
    const c = { status: "active", plan: "starter", seatsUsed: 2 } as const
    const now = new Date("2026-10-08T00:00:00Z")
    expect(customerHealth(c, { lastSignInAt: "2026-10-07T00:00:00Z", openRequests: 0, urgentRequests: 0 }, now)).toEqual({ level: "good", reasons: [] })
    expect(customerHealth({ ...c, seatsUsed: 5 }, { lastSignInAt: "2026-10-07T00:00:00Z", openRequests: 1, urgentRequests: 0 }, now).level).toBe("watch")
    expect(customerHealth({ ...c, status: "payment_overdue" }, { lastSignInAt: "2026-10-07T00:00:00Z", openRequests: 0, urgentRequests: 0 }, now)).toEqual({ level: "at_risk", reasons: ["payment_overdue"] })
    expect(customerHealth(c, { openRequests: 0, urgentRequests: 0 }, now).reasons).toEqual(["inactive"])
  })

  it("counts extra seats until their last day and takes discounts off the MRR (SUB-10, PLA-08)", () => {
    const c = { plan: "starter" as const, extraSeats: 3, extraSeatsUntil: "2026-10-31" }
    expect(seatLimit(c, "2026-10-31")).toBe(8)
    expect(seatLimit(c, "2026-11-01")).toBe(5)
    expect(accountMrr({ plan: "business", billing: "monthly", status: "active", mrrDiscount: 149 })).toBe(1341)
  })
})

describe("customers, invoices and subscriptions", () => {
  beforeEach(() => localStorage.clear())

  it("edits a company's identity, audited, and needs the ICE for Moroccan customers (CUS-04)", async () => {
    const atlas = await byId("cus_atlas")
    const input = { name: atlas.name, city: atlas.city, country: atlas.country, ice: atlas.ice, taxId: "40218765", rc: "Casablanca 412873", address: "12 rue Nouvelle", phone: atlas.phone, adminName: atlas.admin.name, adminEmail: atlas.admin.email }
    await expect(updateCustomerApi(liam, atlas.id, input)).rejects.toThrow(/does not allow/)
    await expect(updateCustomerApi(sophia, atlas.id, { ...input, ice: "" })).rejects.toThrow(/ICE/)
    const updated = await updateCustomerApi(sophia, atlas.id, input)
    expect(updated.address).toBe("12 rue Nouvelle")
    expect((await listAuditApi()).some((e) => e.action === "customer.updated" && e.after?.includes("12 rue Nouvelle"))).toBe(true)
  })

  it("shows the company's own Team access seats in the console (SUB-01)", async () => {
    const atlas = await byId("cus_atlas")
    expect(atlas.seatsUsed).toBeGreaterThan(0)
    expect(atlas.seatsUsed).not.toBe(12) // the stored figure is replaced by the accounts count
  })

  it("writes a UBL 2.1 file with both parties' identifiers (INV-05)", async () => {
    const inv = (await listInvoicesApi()).find((i) => i.customerId === "cus_atlas")!
    const xml = nxUblXml({ kind: "invoice", invoice: inv }, inv.seller ?? sellerSnapshot(), await byId("cus_atlas"))
    expect(xml).toContain("<cbc:UBLVersionID>2.1</cbc:UBLVersionID>")
    expect(xml).toContain(`<cbc:ID>${inv.number}</cbc:ID>`)
    expect(xml).toContain('schemeID="ICE">002847192000084')
    expect(xml).toContain('schemeID="ICE">002873641000058')
    expect(xml).toContain(`<cbc:PayableAmount currencyID="MAD">${inv.total.toFixed(2)}</cbc:PayableAmount>`)
  })

  it("edits plan content and retires a plan for new sales only (PLA-02, PLA-07)", async () => {
    await expect(updatePlanContentApi(nadia, "starter", { description: "x", seats: 5, features: ["a"], retired: false })).rejects.toThrow(/does not allow/)
    await updatePlanContentApi(sophia, "starter", { description: "Small teams", seats: 6, features: ["Up to 6 people", "Projects"], retired: true })
    expect(planById("starter")).toMatchObject({ seats: 6, retired: true, features: ["Up to 6 people", "Projects"] })
    await expect(customerChangePlanApi(alex, "cus_atlas", "starter")).rejects.toThrow(/no longer sold/)
    await updatePlanContentApi(sophia, "starter", { description: "Small teams", seats: 5, features: ["Up to 5 people"], retired: false })
  })

  it("moves monthly to yearly with credit for unused days, and changes the payment method (SUB-05)", async () => {
    const before = await subOf("cus_atlas")
    const r = await changeBillingApi({ actor: sophia }, "cus_atlas", "yearly")
    expect(r.subscription.billing).toBe("yearly")
    expect(r.invoice!.lines.some((l) => l.label.startsWith("Credit for unused monthly days") && l.unitPrice < 0)).toBe(true)
    expect(r.invoice!.lines[0]!.unitPrice).toBe(14900)
    expect(before.billing).toBe("monthly")
    const back = await changeBillingApi({ actor: sophia }, "cus_atlas", "monthly")
    expect(back.subscription.scheduledBilling).toBe("monthly")
    const m = await changeMethodApi({ person: alex }, "cus_atlas", "transfer")
    expect(m.method).toBe("transfer")
    expect(listAudit("ws_atlas").some((e) => e.actionKey === "subscription.changed" && String(e.details).includes("transfer"))).toBe(true)
  })

  it("prints a discount line on the next invoices and grants temporary seats (PLA-08, SUB-10)", async () => {
    await setDiscountApi(sophia, "cus_marrakech", { kind: "percent", value: 10, invoices: 1, reason: "Loyalty" })
    expect((await byId("cus_marrakech")).mrrDiscount).toBe(149)
    const sub = await subOf("cus_marrakech")
    // run the renewal of the next period
    const day = new Date(new Date(`${sub.periodEnd}T00:00:00Z`).getTime() + 2 * 86_400_000).toISOString().slice(0, 10)
    await runBillingJobsApi(sophia, day)
    const renewal = (await listInvoicesApi()).find((i) => i.customerId === "cus_marrakech" && i.periodFrom > sub.periodEnd)!
    expect(renewal.lines.find((l) => l.label.startsWith("Discount 10% · Loyalty"))?.unitPrice).toBe(-149)
    expect((await subOf("cus_marrakech")).discount).toBeUndefined()
    await setExtensionApi(sophia, "cus_marrakech", { seats: 5, until: "2099-01-01", reason: "Seasonal staff" })
    expect(seatLimit(await byId("cus_marrakech"))).toBe(30)
  })

  it("cancels today with a credit note for the unused days (SUB-07)", async () => {
    await expect(cancelNowApi(liam, "cus_tanger", { reason: "Company closed", refund: true })).rejects.toThrow(/does not allow/)
    const r = await cancelNowApi(nadia, "cus_tanger", { reason: "Company closed", refund: true })
    expect(r.creditNote?.reason).toMatch(/unused days/)
    expect((await byId("cus_tanger")).status).toBe("cancelled")
    expect((await listCreditNotesApi()).some((n) => n.customerId === "cus_tanger")).toBe(true)
  })

  it("lets the company administrator upgrade from My subscription with the console's rules (INV-07, SUB-02)", async () => {
    const r = await customerChangePlanApi(alex, "cus_atlas", "enterprise")
    expect(r.invoice?.kind).toBe("proration")
    expect((await byId("cus_atlas")).plan).toBe("enterprise")
    expect((await listAuditApi()).some((e) => e.actorRole === "customer" && e.action === "subscription.changed")).toBe(true)
  })
})

