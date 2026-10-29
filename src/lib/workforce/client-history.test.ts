import { describe, it, expect, beforeEach } from "vitest"
import { binDaysLeft, diffClient, mergeClientValues, mergeConflicts } from "./client-history"
import { listAudit } from "./audit"
import {
  createClientApi,
  deleteClientApi,
  listClientHistoryApi,
  listClientsApi,
  listDeletedClientsApi,
  mergeClientsApi,
  purgeClientApi,
  restoreClientApi,
  updateClientApi,
} from "@/lib/api/clients-api"
import { listDealsApi } from "@/lib/api/deals-api"
import { listFollowUpsApi } from "@/lib/api/crm-api"
import { listProjectsApi } from "@/lib/api/work-projects-api"
import { ClientStatus, type Client } from "@/types/workforce"

const client = (o: Partial<Client> = {}): Client => ({
  id: "c1", workspaceId: "ws", name: "Acme", email: "a@acme.example", status: ClientStatus.ACTIVE,
  paymentTermsDays: 30, contacts: [], createdAt: "", updatedAt: "", ...o,
})

describe("client safety (CRM step 9)", () => {
  beforeEach(() => localStorage.clear())

  it("lists what changed field by field, contacts and custom fields one by one", () => {
    const before = client({ phone: "1", tags: ["A"], contacts: [{ id: "k1", name: "Ann", email: "ann@x.example", isPrimary: true }, { id: "k2", name: "Bo", email: "bo@x.example", isPrimary: false }], customFields: { f1: "x" } })
    const after = client({ phone: "2", tags: ["A", "B"], notes: "", contacts: [{ id: "k1", name: "Ann", email: "ann@x.example", position: "CEO", isPrimary: true }, { id: "k3", name: "Cy", email: "cy@x.example", isPrimary: false }], customFields: { f1: "y" } })
    const changes = diffClient(before, after)
    expect(changes).toContainEqual({ field: "phone", before: "1", after: "2" })
    expect(changes).toContainEqual({ field: "tags", before: "A", after: "A, B" })
    expect(changes).toContainEqual({ field: "contact", before: "Ann · ann@x.example", after: "Ann · CEO · ann@x.example" })
    expect(changes).toContainEqual({ field: "contact", after: "Cy · cy@x.example" })
    expect(changes).toContainEqual({ field: "contact", before: "Bo · bo@x.example" })
    expect(changes).toContainEqual({ field: "custom:f1", before: "x", after: "y" })
    // "" and missing are the same
    expect(changes.some((c) => c.field === "notes")).toBe(false)
  })

  it("records creation and each saved change with who made it", async () => {
    const c = await createClientApi("ws_x", { name: "Acme", email: "a@acme.example", status: ClientStatus.LEAD, paymentTermsDays: 30, contacts: [] })
    await updateClientApi("ws_x", c.id, { paymentTermsDays: 45 })
    await updateClientApi("ws_x", c.id, { paymentTermsDays: 45 })
    const h = await listClientHistoryApi("ws_x", c.id)
    expect(h.map((e) => e.kind)).toEqual(["updated", "created"])
    expect(h[0]!.changes).toEqual([{ field: "paymentTermsDays", before: "30", after: "45" }])
    expect(h[0]!.actorName).toBeTruthy()
  })

  it("moves a deleted client to the bin and brings it back with its deals and follow-ups", async () => {
    const vela = (await listClientsApi("ws_atlas")).find((c) => c.id === "cli_vela")!
    expect((await listDealsApi("ws_atlas")).some((d) => d.clientId === vela.id)).toBe(true)
    await deleteClientApi("ws_atlas", vela.id)
    expect((await listClientsApi("ws_atlas")).some((c) => c.id === vela.id)).toBe(false)
    expect((await listDeletedClientsApi("ws_atlas")).map((c) => c.id)).toEqual([vela.id])
    expect((await listDealsApi("ws_atlas")).some((d) => d.clientId === vela.id)).toBe(false)
    expect((await listDealsApi("ws_atlas", { withDeleted: true })).some((d) => d.clientId === vela.id)).toBe(true)
    await expect(deleteClientApi("ws_atlas", vela.id)).rejects.toThrow(/no longer exists/)

    await restoreClientApi("ws_atlas", vela.id)
    expect((await listClientsApi("ws_atlas")).find((c) => c.id === vela.id)?.deletedAt).toBeUndefined()
    expect((await listDealsApi("ws_atlas")).some((d) => d.clientId === vela.id)).toBe(true)
    expect((await listClientHistoryApi("ws_atlas", vela.id)).map((e) => e.kind)).toEqual(["restored", "deleted"])
    expect(listAudit("ws_atlas").map((a) => a.actionKey)).toEqual(["client.restored", "client.deleted"])
    await expect(restoreClientApi("ws_atlas", vela.id)).rejects.toThrow(/not in the deleted/)
  })

  it("removes a client for good with its deals and follow-ups", async () => {
    await deleteClientApi("ws_atlas", "cli_vela")
    await purgeClientApi("ws_atlas", "cli_vela")
    expect(await listDeletedClientsApi("ws_atlas")).toEqual([])
    expect((await listDealsApi("ws_atlas", { withDeleted: true })).some((d) => d.clientId === "cli_vela")).toBe(false)
    expect((await listFollowUpsApi("ws_atlas", { withDeleted: true })).some((f) => f.clientId === "cli_vela")).toBe(false)
  })

  it("counts the days left in the bin", () => {
    const now = new Date("2026-03-31T12:00:00Z")
    expect(binDaysLeft("2026-03-31T08:00:00Z", now)).toBe(30)
    expect(binDaysLeft("2026-03-21T08:00:00Z", now)).toBe(20)
    expect(binDaysLeft("2026-02-01T08:00:00Z", now)).toBe(0)
  })

  it("merges values: chosen ones, blanks filled, tags joined, contacts added once", () => {
    const keep = client({ phone: "1", website: undefined, tags: ["A"], contacts: [{ id: "k1", name: "Ann", email: "ann@x.example", isPrimary: true }] })
    const other = client({ id: "c2", name: "ACME sarl", phone: "2", website: "https://acme.example", tags: ["B", "A"], contacts: [{ id: "k2", name: "ann", email: "ANN@x.example", isPrimary: true }, { id: "k3", name: "Cy", email: "cy@x.example", isPrimary: false }] })
    expect(mergeConflicts(keep, other)).toEqual(["name", "phone"])
    const v = mergeClientValues(keep, other, { phone: "other" })
    expect(v.phone).toBe("2")
    expect(v.name).toBeUndefined()
    expect(v.website).toBe("https://acme.example")
    expect(v.tags).toEqual(["A", "B"])
    expect(v.contacts!.map((c) => [c.id, c.isPrimary])).toEqual([["k1", true], ["k3", false]])
  })

  it("merges two clients and moves everything linked to the other one", async () => {
    const before = await listProjectsApi("ws_atlas")
    const medicaProjects = before.filter((p) => p.clientId === "cli_medica").length
    expect(medicaProjects).toBeGreaterThan(0)
    await expect(mergeClientsApi("ws_atlas", "cli_helio", "cli_helio")).rejects.toThrow(/two different/)
    const { saveReportApi, listSavedReportsApi } = await import("@/lib/api/saved-reports-api")
    const report = await saveReportApi("ws_atlas", { name: "Medica hours", reportId: "hours", filters: { preset: "month", clientId: "cli_medica" }, ownerId: "u1", ownerName: "Admin" })
    const merged = await mergeClientsApi("ws_atlas", "cli_helio", "cli_medica", { name: "keep" })
    expect(merged.name).toBe("Helio Energy")
    expect(merged.contacts.map((c) => c.name)).toEqual(["Rachid Amrani", "Sofia Conti"])
    expect(merged.contacts.filter((c) => c.isPrimary)).toHaveLength(1)
    expect((await listClientsApi("ws_atlas")).some((c) => c.id === "cli_medica")).toBe(false)
    const after = await listProjectsApi("ws_atlas")
    expect(after.filter((p) => p.clientId === "cli_medica")).toHaveLength(0)
    expect(after.filter((p) => p.clientId === "cli_helio").length).toBe(before.filter((p) => p.clientId === "cli_helio").length + medicaProjects)
    expect((await listDealsApi("ws_atlas")).some((d) => d.clientId === "cli_medica")).toBe(false)
    // A4.4: a saved report filtered on the other client now follows the kept one
    expect((await listSavedReportsApi("ws_atlas", { id: "u1" })).find((r) => r.id === report.id)?.filters.clientId).toBe("cli_helio")
    const [entry] = await listClientHistoryApi("ws_atlas", "cli_helio")
    expect(entry!.kind).toBe("merged")
    expect(entry!.note).toBe("Medica Health")
  })
})
