import { beforeEach, describe, expect, it } from "vitest"
import { clientFigures, cleanTags, tagsInUse, type ClientRecords } from "./client-figures"
import { clientOutstanding } from "./client-relations"
import { listClientsApi, updateClientApi } from "@/lib/api/clients-api"
import { deleteFollowUpApi, listFollowUpsApi, saveFollowUpApi, setFollowUpDoneApi } from "@/lib/api/crm-api"
import { ClientInvoiceStatus, InvoiceKind, type ClientInvoice } from "@/types/work-billing"
import { ClientNoteKind, ContractType, type ClientContract, type ClientFollowUp, type ClientNote } from "@/types/work-crm"
import type { SatisfactionResponse } from "@/types/work-feedback"
import { WorkProjectStatus, type WorkProject } from "@/types/work-projects"
import { DealStage, type Deal } from "@/types/work-sales"
import { ClientStatus, ContactRole, LeadSource, type Client } from "@/types/workforce"

const TODAY = "2026-10-16"
const client = (o: Partial<Client> = {}): Client => ({ id: "c1", workspaceId: "ws", name: "C", email: "c@x.example", status: ClientStatus.ACTIVE, paymentTermsDays: 30, contacts: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "", ...o })
const invoice = (o: Partial<ClientInvoice>): ClientInvoice => ({
  id: "i", workspaceId: "ws", number: "F-1", clientId: "c1", currency: "MAD", issueDate: "2026-09-01", dueDate: "2026-10-01",
  status: ClientInvoiceStatus.SENT, lines: [{ id: "l", description: "Work", quantity: 1, unitPrice: 1000, timeEntryIds: [] }], taxRate: 20, createdAt: "", updatedAt: "", ...o,
}) as ClientInvoice
const project = (id: string, status: WorkProjectStatus, clientId = "c1") => ({ id, clientId, status }) as WorkProject
const deal = (id: string, stage: DealStage, amount: number) => ({ id, clientId: "c1", stage, amount, expectedClose: TODAY }) as Deal
const note = (date: string): ClientNote => ({ id: `n${date}`, workspaceId: "ws", clientId: "c1", kind: ClientNoteKind.CALL, date, text: "Call", createdAt: "", updatedAt: "" })
const followUp = (id: string, dueDate: string, doneAt?: string): ClientFollowUp => ({ id, workspaceId: "ws", clientId: "c1", title: id, dueDate, doneAt, createdAt: "", updatedAt: "" })
const answer = (rating: number, answeredAt: string, comment?: string) => ({ id: answeredAt, clientId: "c1", projectId: "p", rating, nps: rating * 2, comment, respondentName: "Sofia", answeredAt }) as SatisfactionResponse
const empty: ClientRecords = { invoices: [], projects: [], deals: [], notes: [], followUps: [], contracts: [], responses: [] }

describe("a client's CRM figures", () => {
  it("count projects by status and open deals only", () => {
    const f = clientFigures(client(), {
      ...empty,
      projects: [project("a", WorkProjectStatus.ACTIVE), project("b", WorkProjectStatus.PLANNING), project("c", WorkProjectStatus.COMPLETED), project("d", WorkProjectStatus.CANCELLED), project("x", WorkProjectStatus.ACTIVE, "other")],
      deals: [deal("d1", DealStage.PROPOSAL, 10000), deal("d2", DealStage.LEAD, 5000), deal("d3", DealStage.WON, 99999)],
    }, TODAY)
    expect(f.projects).toEqual({ total: 4, inProgress: 2, completed: 1, cancelled: 1 })
    expect(f.openDeals.count).toBe(2)
    expect(f.openDeals.amount).toBe(15000)
    expect(f.openDeals.weighted).toBeGreaterThan(0)
    expect(f.openDeals.weighted).toBeLessThan(15000)
  })

  it("bill this year before VAT, credit notes deducted, drafts and other years left out", () => {
    const invoices = [
      invoice({ id: "a", issueDate: "2026-02-01", status: ClientInvoiceStatus.PAID }),
      invoice({ id: "b", issueDate: "2026-09-01" }),
      invoice({ id: "cn", issueDate: "2026-09-10", kind: InvoiceKind.CREDIT_NOTE, creditNoteFor: "b", lines: [{ id: "l", description: "Credit", quantity: 1, unitPrice: -200, timeEntryIds: [] }] }),
      invoice({ id: "d", issueDate: "2026-10-01", status: ClientInvoiceStatus.DRAFT }),
      invoice({ id: "old", issueDate: "2025-12-20", status: ClientInvoiceStatus.PAID }),
      invoice({ id: "usd", issueDate: "2026-03-01", currency: "USD", exchangeRate: 10, status: ClientInvoiceStatus.PAID, lines: [{ id: "l", description: "Work", quantity: 1, unitPrice: 100, timeEntryIds: [] }] }),
    ]
    const f = clientFigures(client(), { ...empty, invoices }, TODAY)
    expect(f.billedThisYear).toBe(1000 + 1000 - 200 + 1000)
    // the balance is the existing rule's, and the late part is what is past its due date
    expect(f.outstanding).toBe(clientOutstanding("c1", invoices))
    expect(f.overdue).toBe(f.outstanding)
    expect(f.oldestLateDays).toBe(15)
  })

  it("take the last meeting, call or note and the earliest follow-up still to do", () => {
    const f = clientFigures(client(), {
      ...empty,
      notes: [note("2026-09-01"), note("2026-10-10"), note("2026-11-01")],
      followUps: [followUp("later", "2026-10-20"), followUp("done", "2026-10-01", "2026-10-01T10:00:00Z"), followUp("late", "2026-10-14"), followUp("soon", "2026-10-17")],
    }, TODAY)
    expect(f.lastContact).toBe("2026-10-10")
    expect(f.nextFollowUp?.id).toBe("late")
    expect(f.lateFollowUps).toBe(1)
  })

  it("average the satisfaction answers and keep the latest comment", () => {
    const f = clientFigures(client(), { ...empty, responses: [answer(5, "2026-08-01", "Great"), answer(4, "2026-10-01", "Very good team")] }, TODAY)
    expect(f.satisfaction.average).toBe(4.5)
    expect(f.satisfaction.count).toBe(2)
    expect(f.satisfaction.latest).toMatchObject({ rating: 4, comment: "Very good team" })
  })
})

describe("client health", () => {
  const recent = [note("2026-10-01")]
  it("is good with nothing to worry about, and none for leads and archived clients", () => {
    expect(clientFigures(client(), { ...empty, notes: recent }, TODAY).health).toEqual({ level: "good", reasons: [] })
    expect(clientFigures(client({ status: ClientStatus.LEAD }), empty, TODAY).health).toBeNull()
    expect(clientFigures(client({ status: ClientStatus.ARCHIVED }), empty, TODAY).health).toBeNull()
  })

  it("watches late payments, quiet clients, renewals and late follow-ups", () => {
    const contract = { id: "k", clientId: "c1", title: "Framework", type: ContractType.TIME_MATERIALS, startDate: "2025-01-01", renewalDate: "2026-10-30", currency: "MAD" } as ClientContract
    const f = clientFigures(client(), {
      ...empty,
      invoices: [invoice({ dueDate: "2026-10-06" })],
      contracts: [contract],
      followUps: [followUp("late", "2026-10-10")],
    }, TODAY)
    expect(f.health).toEqual({ level: "watch", reasons: ["late_payment", "quiet", "renewal_due", "late_follow_up"] })
  })

  it("puts a client at risk when an invoice is over 30 days late, the credit limit is passed or satisfaction is low", () => {
    expect(clientFigures(client(), { ...empty, notes: recent, invoices: [invoice({ dueDate: "2026-09-10" })] }, TODAY).health).toEqual({ level: "at_risk", reasons: ["very_late_payment"] })
    expect(clientFigures(client({ creditLimit: 500 }), { ...empty, notes: recent, invoices: [invoice({ dueDate: "2026-11-01" })] }, TODAY).health).toEqual({ level: "at_risk", reasons: ["over_credit_limit"] })
    expect(clientFigures(client(), { ...empty, notes: recent, responses: [answer(2, "2026-10-01")] }, TODAY).health?.reasons).toEqual(["low_satisfaction"])
  })
})

describe("tags", () => {
  it("are trimmed, without duplicates whatever the case, at most 10", () => {
    expect(cleanTags(["  VIP ", "vip", "Public  sector", "", "x".repeat(40)])).toEqual(["VIP", "Public sector", "x".repeat(30)])
    expect(cleanTags(Array.from({ length: 15 }, (_, i) => `T${i}`))).toHaveLength(10)
  })
  it("in use are listed most used first", () => {
    expect(tagsInUse([{ tags: ["B", "A"] }, { tags: ["A"] }, {}])).toEqual(["A", "B"])
  })
})

describe("demo clients and follow-ups", () => {
  beforeEach(() => localStorage.clear())

  it("have tags, a lead source and contact roles", async () => {
    const clients = await listClientsApi("ws_atlas")
    const orbit = clients.find((c) => c.id === "cli_orbit")!
    expect(orbit.tags).toEqual(["Key account", "Europe"])
    expect(orbit.leadSource).toBe(LeadSource.REFERRAL)
    expect(orbit.contacts.map((c) => c.role)).toEqual([ContactRole.DECISION_MAKER, ContactRole.FINANCE])
    // used twice each; equal counts sort by name
    expect(tagsInUse(clients).slice(0, 3)).toEqual(["Casablanca", "Healthcare", "Key account"])
  })

  it("save tags cleaned", async () => {
    const saved = await updateClientApi("ws_atlas", "cli_vela", { tags: [" Retail ", "retail", "Q1"] })
    expect(saved.tags).toEqual(["Retail", "Q1"])
  })

  it("follow-ups are planned, done, reopened and deleted", async () => {
    expect((await listFollowUpsApi("ws_atlas")).length).toBeGreaterThan(0)
    await expect(saveFollowUpApi("ws_atlas", { clientId: "cli_vela", title: "  ", dueDate: TODAY })).rejects.toThrow("Say what needs to be done")
    await expect(saveFollowUpApi("ws_atlas", { clientId: "cli_vela", title: "Call", dueDate: "soon" })).rejects.toThrow("Pick a date")
    const fu = await saveFollowUpApi("ws_atlas", { clientId: "cli_vela", title: "  Call Tom ", dueDate: TODAY, ownerId: "emp_emma", note: "  " })
    expect(fu).toMatchObject({ title: "Call Tom", note: undefined })
    const done = await setFollowUpDoneApi("ws_atlas", fu.id, true, "emp_emma")
    expect(done.doneBy).toBe("emp_emma")
    await expect(saveFollowUpApi("ws_atlas", { clientId: "cli_vela", title: "Changed", dueDate: TODAY }, fu.id)).rejects.toThrow("already done")
    expect((await setFollowUpDoneApi("ws_atlas", fu.id, false)).doneAt).toBeUndefined()
    await deleteFollowUpApi("ws_atlas", fu.id)
    await expect(setFollowUpDoneApi("ws_atlas", fu.id, true)).rejects.toThrow("no longer exists")
  })
})
