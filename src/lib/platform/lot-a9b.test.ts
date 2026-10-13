import { beforeEach, describe, expect, it } from "vitest"
import { addDays, dueDate, dunningActionsUpTo, dunningClock, dunningDate, termsFor } from "./billing"
import { RETENTION, trialDataDeletedOn, trialSuspendsOn } from "./customer-lifecycle"
import {
  changeBillingApi,
  customerStartSubscriptionApi,
  issueCreditNoteApi,
  listDunningApi,
  listInvoicesApi,
  listRefundsApi,
  pauseDunningApi,
  runBillingJobsApi,
  setPaymentTermsApi,
  startSubscriptionApi,
} from "@/lib/api/platform-billing-api"
import { customersCollection, expireTrials, getCustomerApi, liftCustomerSuspensionApi } from "@/lib/api/platform-customers-api"
import { listDataRequestsApi } from "@/lib/api/platform-data-api"
import { listSupportSessionsApi } from "@/lib/api/platform-support-api"
import { PLATFORM_WS, listAuditApi, removeStaffApi, type ConsoleActor } from "@/lib/api/platform-console-api"
import { ConsoleRole as R } from "@/types/platform-console"

const sophia: ConsoleActor = { id: "stf_sophia", name: "Sophia Vance", role: R.OWNER }
const nadia: ConsoleActor = { id: "stf_nadia", name: "Nadia Berrada", role: R.FINANCE }
const liam: ConsoleActor = { id: "stf_liam", name: "Liam O'Connor", role: R.SUPPORT }

beforeEach(() => localStorage.clear())

describe("ended trials (D-02)", () => {
  it("are read-only for 7 days, then suspended; data kept 30 days more", async () => {
    expect(trialSuspendsOn("2026-10-01")).toBe("2026-10-09")
    expect(trialDataDeletedOn("2026-10-01")).toBe("2026-11-08")
    customersCollection.update(PLATFORM_WS, "cus_atlas", { status: "trial", trialEndsOn: "2026-10-01", readOnly: false })
    expireTrials("2026-10-08")
    expect(await getCustomerApi("cus_atlas")).toMatchObject({ status: "trial", readOnly: true })
    expireTrials("2026-10-09")
    const c = (await getCustomerApi("cus_atlas"))!
    expect(c).toMatchObject({ status: "suspended", readOnly: true, suspension: { trialEnded: true, previous: "trial" } })
    expect((await listAuditApi()).some((e) => e.action === "customer.trial_suspended")).toBe(true)
    await expect(liftCustomerSuspensionApi(sophia, "cus_atlas")).rejects.toThrow(/Choose a plan/)
  })

  it("open again when a plan is chosen, by the team or the company", async () => {
    customersCollection.update(PLATFORM_WS, "cus_lyon", { status: "trial", trialEndsOn: "2026-09-01", readOnly: false })
    expireTrials("2026-10-13")
    const person = { name: "Claire Martin", email: "claire@lyon.fr" }
    const { invoice } = await customerStartSubscriptionApi(person, "cus_lyon", { plan: "starter", billing: "monthly", method: "transfer" }, "2026-10-13")
    expect(await getCustomerApi("cus_lyon")).toMatchObject({ status: "active", readOnly: false, convertedOn: "2026-10-13" })
    expect((await getCustomerApi("cus_lyon"))!.suspension).toBeUndefined()
    expect(invoice).toMatchObject({ method: "transfer", status: "issued", dueDate: "2026-10-28" })
    expect((await listAuditApi()).find((e) => e.action === "subscription.started")).toMatchObject({ actorRole: "customer", actorName: "Claire Martin" })
  })
})

describe("transfer terms (D-04, INV-08)", () => {
  it("are 15 days, or 30 under an Enterprise contract", async () => {
    expect(dueDate("2026-10-13", "card")).toBe("2026-10-13")
    expect(dueDate("2026-10-13", "transfer")).toBe("2026-10-28")
    expect(dueDate("2026-10-13", "transfer", 30)).toBe("2026-11-12")
    expect(termsFor({ plan: "business", paymentTermsDays: 30 })).toBe(15)
    await expect(setPaymentTermsApi(sophia, "cus_atlas", 30)).rejects.toThrow(/Enterprise/)
    await startSubscriptionApi(sophia, "cus_lyon", { plan: "enterprise", billing: "monthly", method: "transfer" }, "2026-10-13")
    await expect(setPaymentTermsApi(liam, "cus_lyon", 30)).rejects.toThrow(/does not allow/)
    await setPaymentTermsApi(nadia, "cus_lyon", 30)
    const { invoice } = await changeBillingApi({ actor: nadia }, "cus_lyon", "yearly", "2026-10-20")
    expect(invoice!.dueDate).toBe("2026-11-19")
    // the demo Enterprise customer pays by transfer at 30 days
    expect((await listInvoicesApi()).filter((i) => i.customerId === "cus_bina").every((i) => i.dueDate === addDays(i.date, 30))).toBe(true)
  })
})

describe("transfer dunning and its pause (D-03, PAY-04)", () => {
  it("counts days from the due date, without card retries, and moves later by a pause", () => {
    expect(dunningActionsUpTo(7, "transfer").map((a) => a.kind)).toEqual(["reminder", "reminder", "reminder"])
    const pause = { from: "2026-10-30", until: "2026-11-09" }
    expect(dunningClock("2026-10-28", "2026-10-30", pause)).toBe(2)
    expect(dunningClock("2026-10-28", "2026-11-06", pause)).toBe(2)
    expect(dunningClock("2026-10-28", "2026-11-12", pause)).toBe(5)
    expect(dunningDate("2026-10-28", 0, pause)).toBe("2026-10-28")
    expect(dunningDate("2026-10-28", 3, pause)).toBe("2026-11-10")
  })

  it("makes an unpaid transfer overdue at its due date and lets the team pause once", async () => {
    const { invoice } = await startSubscriptionApi(sophia, "cus_lyon", { plan: "business", billing: "monthly", method: "transfer" }, "2026-10-13")
    await runBillingJobsApi(sophia, "2026-10-28")
    expect((await listInvoicesApi()).find((i) => i.id === invoice.id)!.status).toBe("issued") // due today: not late yet
    await runBillingJobsApi(sophia, "2026-10-29")
    expect((await listInvoicesApi()).find((i) => i.id === invoice.id)).toMatchObject({ status: "overdue", failedOn: "2026-10-28" })
    expect((await getCustomerApi("cus_lyon"))!.status).toBe("payment_overdue")
    const runs = () => listDunningApi().then((l) => l.filter((d) => d.invoiceId === invoice.id))
    expect((await runs()).map((d) => `${d.day}_${d.kind}`)).toEqual(["0_reminder"])

    await expect(pauseDunningApi(liam, invoice.id, { days: 10, reason: "Purchase order in signature" })).rejects.toThrow(/does not allow/)
    await expect(pauseDunningApi(nadia, invoice.id, { days: 16, reason: "Purchase order in signature" })).rejects.toThrow(/1 to 15/)
    await expect(pauseDunningApi(nadia, invoice.id, { days: 10, reason: "PO" })).rejects.toThrow(/reason/)
    await pauseDunningApi(nadia, invoice.id, { days: 10, reason: "Purchase order in signature" }, "2026-10-30")
    await expect(pauseDunningApi(nadia, invoice.id, { days: 5, reason: "Again, please" }, "2026-10-31")).rejects.toThrow(/already paused once/)

    await runBillingJobsApi(sophia, "2026-11-06")
    expect((await runs()).map((d) => d.day)).toEqual([0])
    await runBillingJobsApi(sophia, "2026-11-12")
    expect((await runs()).find((d) => d.day === 3)).toMatchObject({ kind: "reminder", date: "2026-11-10" })
    expect((await listAuditApi()).some((e) => e.action === "invoice.dunning_paused")).toBe(true)
  })
})

describe("removing a team member (STF-07)", () => {
  it("ends their support sessions and the approvals waiting on what they asked for", async () => {
    const paid = (await listInvoicesApi()).find((i) => i.customerId === "cus_atlas" && i.status === "paid" && i.total >= 1200)!
    const { refund } = await issueCreditNoteApi(nadia, paid.id, { amount: 1000, reason: "Goodwill after the outage", refund: true })
    expect(refund!.status).toBe("awaiting_approval")
    expect((await listDataRequestsApi()).find((r) => r.preparedBy === "Nadia Berrada")?.status).toBe("prepared")

    expect(await removeStaffApi(sophia, "stf_nadia")).toMatchObject({ refunds: 1, deletions: 1 })
    expect((await listRefundsApi()).find((r) => r.id === refund!.id)).toMatchObject({ status: "cancelled", cancelledReason: "Nadia Berrada left the team" })
    const fes = (await listDataRequestsApi()).find((r) => r.customerId === "cus_fes" && r.kind === "deletion")!
    expect(fes.status).toBe("received")
    expect(fes.preparedBy).toBeUndefined()

    const live = (await listSupportSessionsApi()).filter((s) => s.agentId === "stf_liam" && ["requested", "approved"].includes(s.status))
    expect(live.length).toBeGreaterThan(0)
    expect((await removeStaffApi(sophia, "stf_liam")).supportSessions).toBe(live.length)
    const after = await listSupportSessionsApi()
    for (const s of live) expect(after.find((x) => x.id === s.id)).toMatchObject({ status: "ended", endedBy: "Sophia Vance" })
  })
})

describe("retention periods (D-07)", () => {
  it("states every period of the policy", () => {
    expect(RETENTION).toEqual({ sessionsYears: 1, supportYears: 3, deletedDataDays: 30 })
  })
})
