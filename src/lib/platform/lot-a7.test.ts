import { beforeEach, describe, expect, it } from "vitest"
import { reconcile } from "./reconciliation"
import {
  listInvoicesApi,
  listPaymentsApi,
  listReconciliationsApi,
  listSettlementsApi,
  recordChargebackApi,
  runBillingJobsApi,
  runReconciliationApi,
  simulateSettlementGapApi,
  listRefundsApi,
  cancelNowApi,
} from "@/lib/api/platform-billing-api"
import { customersCollection, listCustomersApi, listDirectoryApi } from "@/lib/api/platform-customers-api"
import { PLATFORM_WS, enableTwoFactorApi, findStaffByEmailApi, listAuditApi, recordDirectoryExportApi, type ConsoleActor } from "@/lib/api/platform-console-api"
import { checkSeatsFullApi } from "@/lib/api/platform-seats-api"
import { noticesForWorkspaceApi } from "@/lib/api/platform-ops-api"
import {
  approveDeletionApi,
  downloadExportApi,
  fulfilExportApi,
  getRetentionApi,
  listDataRequestsApi,
  prepareDeletionApi,
  purgeableEvents,
  requestDataExportApi,
  requestDeletionApi,
  retainedUntil,
  updateRetentionApi,
} from "@/lib/api/platform-data-api"
import { listAccountsApi } from "@/lib/api/access-api"
import { listAudit } from "@/lib/workforce/audit"
import { isWorkspaceDeleted } from "@/lib/workforce/demo-store"
import { ConsoleRole as R } from "@/types/platform-console"

const sophia: ConsoleActor = { id: "stf_sophia", name: "Sophia Vance", role: R.OWNER }
const nadia: ConsoleActor = { id: "stf_nadia", name: "Nadia Berrada", role: R.FINANCE }
const liam: ConsoleActor = { id: "stf_liam", name: "Liam O'Connor", role: R.SUPPORT }
const alex = { name: "Alex Morgan", email: "alex.morgan@company.io" }
const sarah = { name: "Sarah Chen", email: "sarah.chen@techcorp.com" }
const yesterday = () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

beforeEach(() => localStorage.clear())

describe("chargebacks and reconciliation (PAY-08, PAY-09)", () => {
  it("lists zero differences on the demo data", async () => {
    const run = await runReconciliationApi(nadia, yesterday())
    expect(run.differences).toEqual([])
    expect(run.checked.settlements).toBeGreaterThan(0)
    expect(run.waiting).toBe(1) // the unmatched transfer is counted, not a difference
  })

  it("records a chargeback with its reason and puts the invoice back to unpaid", async () => {
    const pay = (await listPaymentsApi()).find((p) => p.customerId === "cus_atlas" && p.method === "card" && p.status === "succeeded")!
    await expect(recordChargebackApi(liam, pay.id, { reason: "Fraud claim" })).rejects.toThrow(/does not allow/)
    const back = await recordChargebackApi(nadia, pay.id, { reason: "Card holder disputes the charge" })
    expect(back).toMatchObject({ status: "chargeback", amount: -pay.amount, reason: "Card holder disputes the charge" })
    const inv = (await listInvoicesApi()).find((i) => i.id === pay.invoiceId)!
    expect(inv.status).toBe("overdue")
    expect(inv.paid).toBe(0)
    expect((await listCustomersApi()).find((c) => c.id === "cus_atlas")!.status).toBe("payment_overdue")
    await expect(recordChargebackApi(nadia, pay.id, { reason: "again" })).rejects.toThrow(/already/)
    // the provider took the money back the same day: still no difference, today or for the day before
    expect((await runReconciliationApi(nadia, new Date().toISOString().slice(0, 10))).differences).toEqual([])
    expect((await runReconciliationApi(nadia, yesterday())).differences).toEqual([])
    expect((await listAuditApi()).some((e) => e.action === "payment.chargeback")).toBe(true)
  })

  it("lists a settlement that differs from the day's card payments, and the billing jobs run the check daily", async () => {
    const s = await simulateSettlementGapApi(nadia, 100)
    const run = await runReconciliationApi(nadia, yesterday())
    expect(run.differences).toEqual([expect.objectContaining({ kind: "settlement_amount", ref: s.reference, expected: s.gross + 100, actual: s.gross })])
    const jobs = await runBillingJobsApi(sophia)
    expect(jobs.differences).toBe(1)
    expect((await listReconciliationsApi())[0]!.by).toBe("Billing jobs")
  })

  it("finds an invoice whose payments do not add up, and a refund with no money out", () => {
    const inv = { id: "i1", number: "NX-1", customerName: "A", date: "2026-01-01", paid: 100 } as never
    const refund = { status: "done", creditNoteNumber: "AV-1", customerName: "A", amount: 50 } as never
    const r = reconcile({ invoices: [inv], payments: [], settlements: [], refunds: [refund], day: "2026-12-31" })
    expect(r.differences.map((d) => d.kind).sort()).toEqual(["invoice_payments", "refund_no_payment"])
  })
})

describe("directory export, seats full and two-factor (USR-08, AUD-07, SUB-09, STF-03)", () => {
  it("lets only owners export the directory, and records the export", async () => {
    await expect(recordDirectoryExportApi(nadia, 10)).rejects.toThrow(/does not allow/)
    await recordDirectoryExportApi(sophia, 10)
    expect((await listAuditApi()).find((e) => e.action === "directory.exported")).toMatchObject({ actorName: "Sophia Vance", targetLabel: "10 people" })
  })

  it("notifies the administrator once per period when every seat is used", async () => {
    const accounts = await listAccountsApi("ws_atlas")
    const used = accounts.length
    expect(used).toBeGreaterThan(0)
    customersCollection.update(PLATFORM_WS, "cus_atlas", { extraSeats: -(25 - used), extraSeatsUntil: "2099-01-01" })
    const first = await checkSeatsFullApi()
    expect(first.map((c) => c.id)).toContain("cus_atlas")
    expect(await checkSeatsFullApi()).toEqual([])
    const notices = await noticesForWorkspaceApi("ws_atlas")
    expect(notices.find((n) => n.kind === "seats")).toMatchObject({ used, limit: used })
  })

  it("turns two-factor on with the authenticator code before the console opens", async () => {
    const yassine = (await findStaffByEmailApi("yassine@nexora.io"))!
    expect(yassine.twoFactor).toBe(false)
    await expect(enableTwoFactorApi(yassine.id, "12ab")).rejects.toThrow(/6-digit/)
    expect((await enableTwoFactorApi(yassine.id, "482913")).twoFactor).toBe(true)
    expect((await listAuditApi()).some((e) => e.action === "staff.two_factor_enabled" && e.actorName === "Yassine Amrani")).toBe(true)
  })
})

describe("data requests and retention (AUD-04 to AUD-07)", () => {
  it("delivers a data export within 7 days, logged on both sides, and the download is audited", async () => {
    const r = await requestDataExportApi(alex, "cus_atlas")
    expect(r.dueOn).toBe(new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10))
    await expect(requestDataExportApi(alex, "cus_atlas")).rejects.toThrow(/already/)
    await expect(fulfilExportApi(nadia, r.id)).rejects.toThrow(/does not allow/)
    const done = await fulfilExportApi(sophia, r.id)
    expect(done.status).toBe("fulfilled")
    expect(done.records).toBeGreaterThan(50)
    const file = await downloadExportApi({ person: alex }, r.id)
    const json = JSON.parse(file.json)
    expect(json.workspace["work-access"] ?? json.workspace[Object.keys(json.workspace)[0]!]).toBeTruthy()
    expect(json.nexora.invoices.length).toBeGreaterThan(0)
    expect(json.company.notes).toBeUndefined() // the team's internal notes are not the company's data
    const events = (await listAuditApi()).map((e) => e.action)
    expect(events).toEqual(expect.arrayContaining(["data.export_requested", "data.export_fulfilled", "data.export_downloaded"]))
    expect(listAudit("ws_atlas").filter((e) => e.actionKey.startsWith("data.")).length).toBe(3)
  })

  it("deletes a cancelled company with two people, keeping only the invoices the law requires", async () => {
    await cancelNowApi(sophia, "cus_northwind", { reason: "Leaving Nexora", refund: false })
    const r = await requestDeletionApi(sarah, "cus_northwind", "We stopped using Nexora")
    await expect(approveDeletionApi(sophia, r.id)).rejects.toThrow(/not waiting for approval/)
    await prepareDeletionApi(sophia, r.id)
    await expect(approveDeletionApi(sophia, r.id)).rejects.toThrow(/Another team member/)
    await expect(approveDeletionApi(nadia, r.id)).rejects.toThrow(/does not allow/)
    // the seeded deletion was prepared by Nadia, so Sophia may approve it; here a second owner would.
    const second: ConsoleActor = { id: "stf_owner2", name: "Omar Idrissi", role: R.OWNER }
    const before = (await listInvoicesApi()).filter((i) => i.customerId === "cus_northwind").length
    const done = await approveDeletionApi(second, r.id)
    expect(done).toMatchObject({ status: "deleted", keptInvoices: before })
    expect(done.deletedRecords).toBeGreaterThan(0)
    expect(isWorkspaceDeleted("ws_northwind")).toBe(true)
    expect(await listAccountsApi("ws_northwind")).toEqual([])
    expect((await listCustomersApi()).some((c) => c.id === "cus_northwind")).toBe(false)
    expect((await listDirectoryApi()).some((u) => u.customerId === "cus_northwind")).toBe(false)
    const kept = (await listInvoicesApi()).filter((i) => i.customerId === "cus_northwind")
    expect(kept.length).toBe(before)
    expect(kept[0]!.customerName).toBe("Northwind Studio")
    const stored = customersCollection.get(PLATFORM_WS, "cus_northwind")!
    expect(stored.admin).toEqual({ name: "Deleted", email: "" })
    expect(stored.notes).toEqual([])
  })

  it("approves the seeded Fès deletion as the owner, prepared by finance", async () => {
    const r = (await listDataRequestsApi()).find((x) => x.customerId === "cus_fes")!
    expect(r.preparedBy).toBe("Nadia Berrada")
    const done = await approveDeletionApi(sophia, r.id)
    expect(done.retainedUntil).toMatch(/^2036-12-31$/)
  })

  it("keeps audit events at least 5 years (AUD-06)", async () => {
    expect((await getRetentionApi()).auditYears).toBe(5)
    await expect(updateRetentionApi(sophia, { auditYears: 3 })).rejects.toThrow(/between 5 and 30/)
    await expect(updateRetentionApi(nadia, { auditYears: 7 })).rejects.toThrow(/does not allow/)
    expect((await updateRetentionApi(sophia, { auditYears: 7 })).auditYears).toBe(7)
    const now = new Date("2026-10-08T00:00:00Z")
    const events = [{ id: "old", at: "2019-01-01T00:00:00Z" }, { id: "recent", at: "2022-06-01T00:00:00Z" }]
    expect(purgeableEvents(events, 5, now).map((e) => e.id)).toEqual(["old"])
    expect(purgeableEvents(events, 3, now).map((e) => e.id)).toEqual(["old"]) // never less than 5 years
    expect(retainedUntil("2026-08-01", 10)).toBe("2036-12-31")
  })

  it("keeps refunds consistent after a cancel-now refund", async () => {
    await cancelNowApi(nadia, "cus_tanger", { reason: "Company closed", refund: true })
    expect((await listRefundsApi()).some((r) => r.customerId === "cus_tanger")).toBe(true)
    const run = await runReconciliationApi(nadia, new Date().toISOString().slice(0, 10))
    expect(run.differences).toEqual([])
    expect((await listSettlementsApi()).length).toBeGreaterThan(0)
  })
})
