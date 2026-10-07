import { beforeEach, describe, expect, it } from "vitest"
import { RESPONSE_TARGET_HOURS, responseBreached, responseDue, sessionLive } from "./support-rules"
import {
  activeSessionForWorkspaceApi,
  agentReplyApi,
  createSupportRequestApi,
  decideSessionApi,
  endSessionApi,
  listCompanySupportApi,
  listSupportRequestsApi,
  ownerApproveSessionApi,
  recordSessionPageApi,
  requestSessionApi,
} from "@/lib/api/platform-support-api"
import { listAuditApi, type ConsoleActor } from "@/lib/api/platform-console-api"
import { listAudit } from "@/lib/workforce/audit"
import { ConsoleRole as R } from "@/types/platform-console"

const liam: ConsoleActor = { id: "stf_liam", name: "Liam O'Connor", role: R.SUPPORT }
const owner: ConsoleActor = { id: "stf_sophia", name: "Sophia Vance", role: R.OWNER }
const finance: ConsoleActor = { id: "stf_nadia", name: "Nadia Berrada", role: R.FINANCE }
const alex = { name: "Alex Morgan", email: "alex.morgan@company.io" }

describe("support rules", () => {
  it("sets response targets and flags breaches (SUP-10)", () => {
    expect(RESPONSE_TARGET_HOURS.urgent).toBe(4)
    const r = { createdAt: "2026-10-08T08:00:00.000Z", priority: "urgent" as const, status: "open" as const }
    expect(responseDue(r)).toBe("2026-10-08T12:00:00.000Z")
    expect(responseBreached(r, new Date("2026-10-08T11:00:00Z"))).toBe(false)
    expect(responseBreached(r, new Date("2026-10-08T13:00:00Z"))).toBe(true)
    expect(responseBreached({ ...r, firstResponseAt: "2026-10-08T10:00:00.000Z" }, new Date("2026-10-09T00:00:00Z"))).toBe(false)
  })

  it("ends sessions at expiry and waits for an owner on write scope (SUP-06, SUP-08)", () => {
    expect(sessionLive({ status: "approved", scope: "read", endsAt: "2026-10-08T10:00:00Z" }, new Date("2026-10-08T09:00:00Z"))).toBe("active")
    expect(sessionLive({ status: "approved", scope: "read", endsAt: "2026-10-08T10:00:00Z" }, new Date("2026-10-08T10:00:00Z"))).toBe("expired")
    expect(sessionLive({ status: "approved", scope: "write" })).toBe("waiting_owner")
    expect(sessionLive({ status: "requested", scope: "read" })).toBe("waiting_approval")
  })
})

describe("support requests and sessions", () => {
  beforeEach(() => localStorage.clear())

  it("lets a company raise a request and Nexora answer it (SUP-01, SUP-02)", async () => {
    const r = await createSupportRequestApi(alex, "ws_atlas", { subject: "Cannot add a client", category: "bug", priority: "normal", text: "The save button stays grey." })
    expect(r).toMatchObject({ number: "SR-0045", customerId: "cus_atlas", status: "open" })
    await expect(agentReplyApi(finance, r.id, { text: "x", waitForCustomer: false })).rejects.toThrow(/does not allow/)
    const answered = await agentReplyApi(liam, r.id, { text: "Fixed on our side, please retry.", waitForCustomer: true })
    expect(answered).toMatchObject({ status: "waiting_customer", assigneeName: "Liam O'Connor" })
    expect(answered.firstResponseAt).toBeTruthy()
    expect((await listCompanySupportApi("ws_atlas")).requests.some((x) => x.id === r.id)).toBe(true)
    expect((await listCompanySupportApi("ws_northwind")).requests.some((x) => x.id === r.id)).toBe(false)
  })

  it("opens access only after the customer approves, then records each page in both trails (SUP-03 to SUP-07)", async () => {
    await expect(requestSessionApi(finance, { customerId: "cus_northwind", reason: "Look at the dashboard", scope: "read", minutes: 60 })).rejects.toThrow(/does not allow/)
    await expect(requestSessionApi(liam, { customerId: "cus_northwind", reason: "short", scope: "read", minutes: 60 })).rejects.toThrow(/why/)
    await expect(requestSessionApi(liam, { customerId: "cus_northwind", reason: "Check the invoice template", scope: "read", minutes: 2000 })).rejects.toThrow(/24 hours/)
    const s = await requestSessionApi(liam, { customerId: "cus_northwind", reason: "Check the invoice template", scope: "read", minutes: 60 })
    expect(await activeSessionForWorkspaceApi("ws_northwind")).toBeNull()
    expect(await recordSessionPageApi(liam, s.id, "/dashboard/invoices")).toBeNull()

    const approved = await decideSessionApi({ name: "Sarah Chen", email: "sarah.chen@techcorp.com" }, s.id, true)
    expect(approved.endsAt).toBeTruthy()
    expect((await activeSessionForWorkspaceApi("ws_northwind"))?.id).toBe(s.id)
    await expect(decideSessionApi({ name: "Sarah Chen", email: "s@x" }, s.id, true)).rejects.toThrow(/already answered/)

    await recordSessionPageApi(liam, s.id, "/dashboard/client-invoices")
    expect((await listAuditApi()).some((e) => e.action === "support.page_viewed" && e.targetLabel.includes("/dashboard/client-invoices"))).toBe(true)
    expect(listAudit("ws_northwind").some((e) => e.actionKey === "support.page_viewed" && e.actor.name === "Liam O'Connor")).toBe(true)

    await endSessionApi({ customer: { name: "Sarah Chen", email: "sarah.chen@techcorp.com" } }, s.id)
    expect(await activeSessionForWorkspaceApi("ws_northwind")).toBeNull()
    await expect(endSessionApi({ actor: liam }, s.id)).rejects.toThrow(/already ended/)
  })

  it("needs a second owner for write access and refuses a second open request (SUP-08)", async () => {
    const s = await requestSessionApi(owner, { customerId: "cus_tanger", reason: "Fix a wrong opening balance at the customer's request", scope: "write", minutes: 30 })
    await expect(requestSessionApi(owner, { customerId: "cus_tanger", reason: "Another reason for access", scope: "read", minutes: 30 })).rejects.toThrow(/already have an open/)
    await decideSessionApi({ name: "Youssef Berrada", email: "y.berrada@tlc.ma" }, s.id, true)
    expect((await listCompanySupportApi("ws_tanger")).customer).toBeNull()
    await expect(ownerApproveSessionApi(owner, s.id)).rejects.toThrow(/Another platform owner/)
    await expect(ownerApproveSessionApi(liam, s.id)).rejects.toThrow(/does not allow/)
  })

  it("seeds a pending access request for Atlas and an unanswered urgent request", async () => {
    const atlas = await listCompanySupportApi("ws_atlas")
    expect(atlas.sessions.some((s) => s.status === "requested")).toBe(true)
    const urgent = (await listSupportRequestsApi()).find((r) => r.number === "SR-0044")!
    expect(responseBreached(urgent)).toBe(true)
  })
})
