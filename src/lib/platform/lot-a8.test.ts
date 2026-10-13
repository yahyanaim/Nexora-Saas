import { beforeEach, describe, expect, it } from "vitest"
import { buildConsoleInbox, isNewDevice, type ConsoleInboxInput } from "./console-inbox"
import { createProFormaApi, listInvoicesApi, listPaymentsApi, listProFormasApi, recordChargebackApi, runBillingJobsApi } from "@/lib/api/platform-billing-api"
import { customersCollection, expireTrials, listCustomersApi } from "@/lib/api/platform-customers-api"
import { NEXORA_LOGO, nexoraLogoSrc, updateIdentityLogoApi } from "@/lib/api/platform-config-api"
import { noticesForWorkspaceApi } from "@/lib/api/platform-ops-api"
import { PLATFORM_WS, listAuditApi, listSessionsApi, listStaffApi, type ConsoleActor } from "@/lib/api/platform-console-api"
import { ConsoleRole as R } from "@/types/platform-console"

const sophia: ConsoleActor = { id: "stf_sophia", name: "Sophia Vance", role: R.OWNER }
const nadia: ConsoleActor = { id: "stf_nadia", name: "Nadia Berrada", role: R.FINANCE }
const yassine: ConsoleActor = { id: "stf_yassine", name: "Yassine Amrani", role: R.SALES }
const amine: ConsoleActor = { id: "stf_amine", name: "Amine Lahlou", role: R.ENGINEERING }
const liam: ConsoleActor = { id: "stf_liam", name: "Liam O'Connor", role: R.SUPPORT }

beforeEach(() => localStorage.clear())

const base = (me: ConsoleActor): ConsoleInboxInput => ({
  me, staff: [], sessions: [], support: [], refunds: [], requests: [], invoices: [], payments: [], reconciliations: [], health: [], incidents: [], customers: [], today: "2026-10-08",
})

describe("the team's bell (§11.2)", () => {
  it("shows each alert to the roles that act on it, never their own approvals", () => {
    const d = {
      support: [{ id: "s1", number: "SR-1", customerName: "Atlas", subject: "Cannot invoice", status: "open", priority: "urgent", messages: [] }],
      refunds: [{ id: "r1", status: "awaiting_approval", requestedBy: "Nadia Berrada", amount: 1200 }],
      requests: [{ id: "d1", kind: "deletion", status: "prepared", preparedBy: "Nadia Berrada", customerName: "Fès" }],
      invoices: [{ id: "i1", status: "overdue", total: 1788, paid: 0, credited: 0 }],
      health: [{ service: "api", state: "down" }],
      customers: [{ id: "c1", name: "Agadir", status: "trial", trialEndsOn: "2026-10-10" }],
    } as unknown as Partial<ConsoleInboxInput>
    const kinds = (me: ConsoleActor) => buildConsoleInbox({ ...base(me), ...d }).map((i) => i.title).sort()
    expect(kinds(sophia)).toEqual(["cinDeletion", "cinHealth", "cinOverdue", "cinRefunds", "cinTrial", "cinUrgent"].sort())
    expect(kinds(nadia)).toEqual(["cinOverdue"]) // her own refund and deletion are not hers to approve
    expect(kinds(liam)).toEqual(["cinUrgent"])
    expect(kinds(amine)).toEqual(["cinHealth"])
    expect(kinds(yassine)).toEqual(["cinTrial"])
  })

  it("alerts the owner about a sign-in from a new device or country (SEC-13)", async () => {
    const sessions = await listSessionsApi()
    const liamNew = sessions.find((s) => s.id === "ses_6")!
    expect(isNewDevice(liamNew, sessions)).toBe(true)
    expect(isNewDevice(sessions.find((s) => s.id === "ses_1")!, sessions)).toBe(false)
    const items = buildConsoleInbox({ ...base(sophia), sessions, staff: await listStaffApi() })
    expect(items.filter((i) => i.title === "cinDevice").map((i) => i.values.name)).toEqual(["Liam O'Connor"])
    expect(buildConsoleInbox({ ...base(nadia), sessions }).some((i) => i.title === "cinDevice")).toBe(false)
  })
})

describe("company notices and trial end (Table 28, CUS-06)", () => {
  it("makes a trial read-only after its end date, once", async () => {
    customersCollection.update(PLATFORM_WS, "cus_atlas", { status: "trial", trialEndsOn: "2026-10-01", readOnly: false })
    expect(expireTrials("2026-10-08").map((c) => c.id)).toEqual(["cus_atlas"])
    expect(expireTrials("2026-10-08")).toEqual([])
    expect((await listCustomersApi()).find((c) => c.id === "cus_atlas")!.readOnly).toBe(true)
  })

  it("tells the company its trial ends soon", async () => {
    const inTwo = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10)
    customersCollection.update(PLATFORM_WS, "cus_atlas", { status: "trial", trialEndsOn: inTwo, readOnly: false })
    expect((await noticesForWorkspaceApi("ws_atlas")).find((n) => n.kind === "trial_ending")).toMatchObject({ days: 2 })
  })

  it("tells the company a payment failed, with the day it becomes read-only", async () => {
    const pay = (await listPaymentsApi()).find((p) => p.customerId === "cus_atlas" && p.method === "card" && p.status === "succeeded")!
    await recordChargebackApi(nadia, pay.id, { reason: "Disputed" })
    const n = (await noticesForWorkspaceApi("ws_atlas")).find((x) => x.kind === "payment_failed")!
    expect(n).toMatchObject({ number: pay.invoiceNumber, amount: pay.amount, warning: false })
    expect(n.readOnlyOn).toBe(new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10))
  })

  it("runs the trial check in the daily billing jobs", async () => {
    customersCollection.update(PLATFORM_WS, "cus_lyon", { trialEndsOn: "2020-01-01", readOnly: false })
    await runBillingJobsApi(sophia)
    expect(customersCollection.get(PLATFORM_WS, "cus_lyon")!.readOnly).toBe(true)
  })
})

describe("pro-forma and logo (INV-10, CFG-04)", () => {
  it("prepares a pro-forma with its own PF number and no invoice number", async () => {
    const before = (await listInvoicesApi()).length
    await expect(createProFormaApi(amine, "cus_lyon", { plan: "business", billing: "yearly" })).rejects.toThrow(/does not allow/)
    const a = await createProFormaApi(yassine, "cus_lyon", { plan: "business", billing: "yearly" }, "2026-10-08")
    const b = await createProFormaApi(nadia, "cus_lyon", { plan: "starter", billing: "monthly" }, "2026-10-08")
    expect([a.number, b.number]).toEqual(["PF-2026-0001", "PF-2026-0002"])
    expect(a).toMatchObject({ subtotal: 14900, vat: 0, total: 14900, validUntil: "2026-11-07" }) // Lyon is in France: exported service
    expect((await listInvoicesApi()).length).toBe(before)
    expect((await listProFormasApi()).length).toBe(2)
    expect((await listAuditApi()).some((e) => e.action === "invoice.proforma")).toBe(true)
  })

  it("prints Nexora's logo, or the owner's own, on every document", async () => {
    expect(nexoraLogoSrc()).toBe(NEXORA_LOGO)
    await expect(updateIdentityLogoApi(nadia, "data:image/png;base64,AAAA")).rejects.toThrow(/does not allow/)
    await expect(updateIdentityLogoApi(sophia, "data:image/gif;base64,AAAA")).rejects.toThrow(/PNG or JPEG/)
    await updateIdentityLogoApi(sophia, "data:image/png;base64,AAAA")
    expect(nexoraLogoSrc()).toBe("data:image/png;base64,AAAA")
    await updateIdentityLogoApi(sophia, null)
    expect(nexoraLogoSrc()).toBe(NEXORA_LOGO)
  })
})
