import type { Client, ClientInput } from "@/types/workforce"
import { createCollection } from "@/lib/workforce/demo-store"
import { seedClients } from "@/lib/workforce/demo-seed"

/**
 * Clients a workspace works for and bills. Backed by the browser demo store
 * for now; replace the bodies with apiClient calls once the backend exists.
 */
const clients = createCollection<Client>("clients", "cli", seedClients)

export async function listClientsApi(workspaceId: string): Promise<Client[]> {
  return clients.list(workspaceId)
}

const ICE = /^\d{15}$/

function validate(input: Partial<ClientInput>) {
  if (input.ice && !ICE.test(input.ice)) throw new Error("The ICE must have exactly 15 digits")
  const card = input.rateCard ?? []
  if (card.some((r) => !(r.rate >= 0) || (!r.employeeId && !r.jobTitle?.trim()))) {
    throw new Error("Each rate card line needs a person or a job title, and a rate")
  }
  const keys = card.map((r) => r.employeeId ?? `title:${r.jobTitle!.trim().toLowerCase()}`)
  if (new Set(keys).size !== keys.length) throw new Error("The rate card has the same person or job title twice")
}

export async function createClientApi(workspaceId: string, input: ClientInput): Promise<Client> {
  validate(input)
  return clients.create(workspaceId, normalizeContacts(input))
}

export async function updateClientApi(
  workspaceId: string,
  id: string,
  input: Partial<ClientInput>
): Promise<Client> {
  validate(input)
  return clients.update(workspaceId, id, input.contacts ? normalizeContacts(input) : input)
}

/** A client with invoices is archived instead (CRM-6, BR-8). */
export async function deleteClientApi(workspaceId: string, id: string): Promise<void> {
  const { listClientInvoicesApi } = await import("./work-billing-api")
  if ((await listClientInvoicesApi(workspaceId)).some((inv) => inv.clientId === id)) {
    throw new Error("This client has invoices, so it can only be archived")
  }
  clients.remove(workspaceId, id)
}

/** Exactly one primary contact whenever a client has contacts. */
function normalizeContacts<T extends Partial<ClientInput>>(input: T): T {
  const contacts = input.contacts
  if (!contacts?.length) return input
  const primaryIndex = Math.max(0, contacts.findIndex((c) => c.isPrimary))
  return {
    ...input,
    contacts: contacts.map((c, i) => ({ ...c, isPrimary: i === primaryIndex })),
  }
}
