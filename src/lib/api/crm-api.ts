import { addDays } from "@/lib/workforce/billing"
import { createCollection } from "@/lib/workforce/demo-store"
import { todayIso } from "@/lib/workforce/project-metrics"
import { recordAudit } from "@/lib/workforce/audit"
import {
  ClientNoteKind,
  ContractType,
  type ClientContract,
  type ClientNote,
  type ContractInput,
} from "@/types/work-crm"

const STAMP = "2026-01-01T00:00:00.000Z"

function seedContracts(workspaceId: string): ClientContract[] {
  const t = todayIso()
  const rows: Omit<ClientContract, "workspaceId" | "createdAt" | "updatedAt">[] =
    workspaceId === "ws_atlas"
      ? [
          { id: "ctr_1", clientId: "cli_orbit", title: "Fleet portal: fixed-price agreement", type: ContractType.FIXED_PRICE, startDate: addDays(t, -45), endDate: addDays(t, 30), value: 480000, currency: "MAD", fileName: "orbit-portal-signed.pdf" },
          { id: "ctr_2", clientId: "cli_helio", title: "Framework agreement, time and materials", type: ContractType.TIME_MATERIALS, startDate: addDays(t, -300), renewalDate: addDays(t, 18), currency: "MAD", fileName: "helio-framework-2025.pdf", notes: "Renegotiate rates before renewal." },
          { id: "ctr_3", clientId: "cli_kappa", title: "Support retainer", type: ContractType.RETAINER, startDate: addDays(t, -400), endDate: addDays(t, -35), value: 25000, currency: "MAD" },
        ]
      : workspaceId === "ws_northwind"
        ? [{ id: "ctr_10", clientId: "cli_lumen", title: "Content retainer", type: ContractType.RETAINER, startDate: addDays(t, -120), renewalDate: addDays(t, 60), value: 6000, currency: "USD" }]
        : []
  return rows.map((r) => ({ ...r, workspaceId, createdAt: STAMP, updatedAt: STAMP }))
}

function seedNotes(workspaceId: string): ClientNote[] {
  const t = todayIso()
  const rows: Omit<ClientNote, "workspaceId" | "createdAt" | "updatedAt">[] =
    workspaceId === "ws_atlas"
      ? [
          { id: "cn_1", clientId: "cli_orbit", kind: ClientNoteKind.MEETING, date: addDays(t, -3), text: "Steering meeting: driver app moved to next quarter, portal launch confirmed.", authorId: "emp_karim" },
          { id: "cn_2", clientId: "cli_helio", kind: ClientNoteKind.CALL, date: addDays(t, -9), text: "Finance asked for invoices to show the purchase order number.", authorId: "emp_sara" },
          { id: "cn_3", clientId: "cli_vela", kind: ClientNoteKind.NOTE, date: addDays(t, -6), text: "Interested in a store redesign; quote sent.", authorId: "emp_emma" },
        ]
      : []
  return rows.map((r) => ({ ...r, workspaceId, createdAt: STAMP, updatedAt: STAMP }))
}

/**
 * Client contracts and notes (CRM-4, CRM-7). Backed by the browser demo store
 * for now; replace the bodies with apiClient calls once the backend exists.
 */
const contracts = createCollection<ClientContract>("client-contracts", "ctr", seedContracts)
const notes = createCollection<ClientNote>("client-notes", "cn", seedNotes)

export async function listContractsApi(workspaceId: string): Promise<ClientContract[]> {
  return contracts.list(workspaceId)
}

function validateContract(input: ContractInput) {
  if (!input.title.trim()) throw new Error("Give the contract a title")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) throw new Error("Pick a start date")
  if (input.endDate && input.endDate < input.startDate) throw new Error("The end date is before the start date")
  if (input.value !== undefined && !(input.value >= 0)) throw new Error("The value can't be negative")
}

export async function saveContractApi(workspaceId: string, input: ContractInput, id?: string): Promise<ClientContract> {
  validateContract(input)
  const clean = { ...input, title: input.title.trim() }
  const saved = id ? contracts.update(workspaceId, id, clean) : contracts.create(workspaceId, clean)
  recordAudit(workspaceId, { action: id ? "Contract updated" : "Contract added", actionKey: "client.contract", category: "Billing", target: saved.title })
  return saved
}

export async function deleteContractApi(workspaceId: string, id: string) {
  contracts.remove(workspaceId, id)
}

export async function listClientNotesApi(workspaceId: string): Promise<ClientNote[]> {
  return notes.list(workspaceId)
}

export async function addClientNoteApi(
  workspaceId: string,
  input: Pick<ClientNote, "clientId" | "kind" | "date" | "text" | "authorId">
): Promise<ClientNote> {
  if (!input.text.trim()) throw new Error("Write something first")
  return notes.create(workspaceId, { ...input, text: input.text.trim() })
}

export async function deleteClientNoteApi(workspaceId: string, id: string) {
  notes.remove(workspaceId, id)
}
