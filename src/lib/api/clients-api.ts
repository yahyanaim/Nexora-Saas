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

export async function createClientApi(workspaceId: string, input: ClientInput): Promise<Client> {
  return clients.create(workspaceId, normalizeContacts(input))
}

export async function updateClientApi(
  workspaceId: string,
  id: string,
  input: Partial<ClientInput>
): Promise<Client> {
  return clients.update(workspaceId, id, input.contacts ? normalizeContacts(input) : input)
}

export async function deleteClientApi(workspaceId: string, id: string): Promise<void> {
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
