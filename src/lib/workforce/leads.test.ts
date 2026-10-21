import { beforeEach, describe, expect, it } from "vitest"
import { allContacts, contactEmails, contactPhones, isLostLead, leadStats } from "./leads"
import { convertLeadApi, dropLeadApi } from "@/lib/api/leads-api"
import { listClientsApi } from "@/lib/api/clients-api"
import { listDealsApi } from "@/lib/api/deals-api"
import { ClientStatus, LeadSource, type Client } from "@/types/workforce"
import { DealStage } from "@/types/work-sales"

const TODAY = "2026-10-21"
const cl = (id: string, over: Partial<Client> = {}): Client => ({ id, workspaceId: "ws", name: id, email: `${id}@x.c`, status: ClientStatus.LEAD, paymentTermsDays: 30, contacts: [], createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", ...over })

describe("leads and contacts (CRM step 6)", () => {
  beforeEach(() => localStorage.clear())

  it("counts open and new leads, the conversion rate and the sources", () => {
    const clients = [
      cl("a", { leadSource: LeadSource.WEBSITE, createdAt: "2026-10-10T00:00:00Z" }),
      cl("b", { leadSource: LeadSource.WEBSITE }),
      cl("c", { leadSource: LeadSource.EVENT }),
      cl("d"),
      cl("won", { status: ClientStatus.ACTIVE, convertedAt: "2026-09-01" }),
      cl("old-won", { status: ClientStatus.ACTIVE, convertedAt: "2026-01-01" }),
      cl("lost", { status: ClientStatus.ARCHIVED, lostReason: "No budget", updatedAt: "2026-10-01T00:00:00Z" }),
      cl("archived-client", { status: ClientStatus.ARCHIVED }),
    ]
    expect(isLostLead(clients[6]!)).toBe(true)
    expect(isLostLead(clients[7]!)).toBe(false)
    expect(leadStats(clients, TODAY)).toEqual({
      open: 4,
      newRecently: 1,
      converted: 1,
      lost: 1,
      conversionRate: 50,
      bySource: [{ source: LeadSource.WEBSITE, count: 2 }, { source: LeadSource.EVENT, count: 1 }, { source: "unknown", count: 1 }],
    })
    expect(leadStats([], TODAY).conversionRate).toBeNull()
  })

  it("lists every contact with its client, main contacts first", () => {
    const rows = allContacts([
      cl("Zeta", { contacts: [{ id: "1", name: "Ali", email: "a@z.c", isPrimary: false }, { id: "2", name: "Zoe", email: "z@z.c", isPrimary: true }] }),
      cl("Alpha", { contacts: [{ id: "3", name: "Bob", email: "b@a.c", isPrimary: true }] }),
    ])
    expect(rows.map((r) => `${r.client.name}:${r.contact.name}`)).toEqual(["Alpha:Bob", "Zeta:Zoe", "Zeta:Ali"])
    const c = { id: "x", name: "X", email: "x@a.c", phone: "+1 2", otherEmails: [" x@a.c", "y@a.c", ""], otherPhones: ["+1 3"], isPrimary: true }
    expect(contactEmails(c)).toEqual(["x@a.c", "y@a.c"])
    expect(contactPhones(c)).toEqual(["+1 2", "+1 3"])
  })

  it("converts a demo lead with its first deal, and drops another with a reason", async () => {
    const ws = "ws_atlas"
    const { client, deal } = await convertLeadApi(ws, "cli_nova", { title: "Booking app", amount: 300000, stage: DealStage.QUALIFIED, expectedClose: "2026-12-01", contactId: "con_7" })
    expect(client).toMatchObject({ status: ClientStatus.ACTIVE })
    expect(client.convertedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(deal).toMatchObject({ clientId: "cli_nova", contactId: "con_7", title: "Booking app" })
    expect((await listDealsApi(ws)).some((d) => d.id === deal!.id)).toBe(true)
    await expect(convertLeadApi(ws, "cli_nova")).rejects.toThrow("Only a lead")

    await expect(dropLeadApi(ws, "cli_atlasm", "  ")).rejects.toThrow("Say why")
    const dropped = await dropLeadApi(ws, "cli_atlasm", " Chose a competitor ")
    expect(dropped).toMatchObject({ status: ClientStatus.ARCHIVED, lostReason: "Chose a competitor" })
    await expect(dropLeadApi(ws, "cli_gone", "x")).rejects.toThrow("no longer exists")
    expect(isLostLead((await listClientsApi(ws)).find((c) => c.id === "cli_atlasm")!)).toBe(true)
  })

  it("leaves the lead as it was when the deal is not valid", async () => {
    const ws = "ws_atlas"
    await expect(convertLeadApi(ws, "cli_vela", { title: " ", amount: 1, stage: DealStage.QUALIFIED, expectedClose: "2026-12-01" })).rejects.toThrow()
    expect((await listClientsApi(ws)).find((c) => c.id === "cli_vela")!.status).toBe(ClientStatus.LEAD)
  })
})
