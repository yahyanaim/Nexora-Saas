import type { Client, ClientInput } from "@/types/workforce"
import type { ClientFieldChange, ClientHistoryEntry, ClientHistoryKind } from "@/types/work-crm"
import { createCollection, reassignReference } from "@/lib/workforce/demo-store"
import { seedClients } from "@/lib/workforce/demo-seed"
import { assertClientIds, cleanId } from "@/lib/workforce/tax-ids"
import { cleanTags } from "@/lib/workforce/client-figures"
import { getAuditActor, recordAudit } from "@/lib/workforce/audit"
import { binDaysLeft, diffClient, mergeClientValues, type MergePicks } from "@/lib/workforce/client-history"

/**
 * Clients a workspace works for and bills. Backed by the browser demo store
 * for now; replace the bodies with apiClient calls once the backend exists.
 */
const clients = createCollection<Client>("clients", "cli", seedClients)
const history = createCollection<ClientHistoryEntry>("client-history", "chg", seedHistory)

/** A few earlier changes on a demo client, so its History tab isn't empty (CRM step 9). */
function seedHistory(workspaceId: string): ClientHistoryEntry[] {
  if (workspaceId !== "ws_atlas") return []
  const at = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()
  const row = (id: string, days: number, actorId: string, actorName: string, changes: ClientFieldChange[]): ClientHistoryEntry => ({
    id, workspaceId, clientId: "cli_helio", kind: "updated", changes, actorId, actorName, createdAt: at(days), updatedAt: at(days),
  })
  return [
    row("chg_seed_3", 4, "emp_emma", "Emma Rossi", [{ field: "tags", before: "Key account", after: "Key account, Casablanca" }]),
    row("chg_seed_2", 18, "emp_yassine", "Yassine Alaoui", [{ field: "paymentTermsDays", before: "30", after: "45" }, { field: "taxId", after: "15238740" }]),
    row("chg_seed_1", 35, "emp_sara", "Sara Bennani", [{ field: "accountManagerId", before: "emp_emma", after: "emp_sara" }, { field: "contact", before: "Rachid Amrani · IT manager · rachid@helio.example", after: "Rachid Amrani · Head of IT · rachid@helio.example" }]),
  ]
}

/** Clients in use; deleted ones wait in the bin (CRM step 9). */
export async function listClientsApi(workspaceId: string): Promise<Client[]> {
  sweepBin(workspaceId)
  return clients.list(workspaceId).filter((c) => !c.deletedAt)
}

/** Ids of the clients in the bin, so their deals and follow-ups stay out of sight until restored. */
export function deletedClientIds(workspaceId: string): Set<string> {
  return new Set(clients.list(workspaceId).filter((c) => c.deletedAt).map((c) => c.id))
}

function log(workspaceId: string, clientId: string, kind: ClientHistoryKind, changes: ClientFieldChange[] = [], note?: string) {
  const actor = getAuditActor()
  history.create(workspaceId, { clientId, kind, changes, actorId: actor.id, actorName: actor.name, note })
}

/** A client's history, newest first. */
export async function listClientHistoryApi(workspaceId: string, clientId: string): Promise<ClientHistoryEntry[]> {
  return history
    .list(workspaceId)
    .filter((h) => h.clientId === clientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

async function validate(workspaceId: string, input: Partial<ClientInput>) {
  const { getSettingsApi } = await import("./settings-api")
  const { company } = await getSettingsApi(workspaceId)
  assertClientIds(input, company.country)
  const card = input.rateCard ?? []
  if (card.some((r) => !(r.rate >= 0) || (!r.employeeId && !r.jobTitle?.trim()))) {
    throw new Error("Each rate card line needs a person or a job title, and a rate")
  }
  const keys = card.map((r) => r.employeeId ?? `title:${r.jobTitle!.trim().toLowerCase()}`)
  if (new Set(keys).size !== keys.length) throw new Error("The rate card has the same person or job title twice")
}

export async function createClientApi(workspaceId: string, input: ClientInput): Promise<Client> {
  input = withCleanIds(input)
  await validate(workspaceId, input)
  const created = clients.create(workspaceId, normalizeContacts(input))
  log(workspaceId, created.id, "created")
  return created
}

export async function updateClientApi(
  workspaceId: string,
  id: string,
  input: Partial<ClientInput>
): Promise<Client> {
  input = withCleanIds(input)
  await validate(workspaceId, input)
  const before = clients.get(workspaceId, id)
  const updated = clients.update(workspaceId, id, input.contacts ? normalizeContacts(input) : input)
  const changes = before ? diffClient(before, updated) : []
  if (changes.length) log(workspaceId, id, "updated", changes)
  return updated
}

/**
 * Moves a client to the bin for BIN_DAYS days (CRM step 9); its contacts,
 * deals and follow-ups come back with it. A client with invoices is archived
 * instead (CRM-6, BR-8).
 */
export async function deleteClientApi(workspaceId: string, id: string): Promise<void> {
  const client = clients.get(workspaceId, id)
  if (!client || client.deletedAt) throw new Error("This client no longer exists")
  const { listClientInvoicesApi } = await import("./work-billing-api")
  if ((await listClientInvoicesApi(workspaceId)).some((inv) => inv.clientId === id)) {
    throw new Error("This client has invoices, so it can only be archived")
  }
  clients.update(workspaceId, id, { deletedAt: new Date().toISOString(), deletedBy: getAuditActor().name })
  log(workspaceId, id, "deleted")
  recordAudit(workspaceId, { action: "Client deleted", actionKey: "client.deleted", category: "Team", target: client.name })
}

/** The clients in the bin, most recently deleted first. */
export async function listDeletedClientsApi(workspaceId: string): Promise<Client[]> {
  sweepBin(workspaceId)
  return clients
    .list(workspaceId)
    .filter((c) => c.deletedAt)
    .sort((a, b) => b.deletedAt!.localeCompare(a.deletedAt!))
}

/** Brings a deleted client back with everything linked to it. */
export async function restoreClientApi(workspaceId: string, id: string): Promise<Client> {
  const client = clients.get(workspaceId, id)
  if (!client?.deletedAt) throw new Error("This client is not in the deleted clients")
  const restored = clients.update(workspaceId, id, { deletedAt: undefined, deletedBy: undefined })
  log(workspaceId, id, "restored")
  recordAudit(workspaceId, { action: "Client restored", actionKey: "client.restored", category: "Team", target: client.name })
  return restored
}

/** Removes a deleted client for good, with its deals, follow-ups and history. */
export async function purgeClientApi(workspaceId: string, id: string): Promise<void> {
  const client = clients.get(workspaceId, id)
  if (!client?.deletedAt) throw new Error("This client is not in the deleted clients")
  await purge(workspaceId, client)
}

async function purge(workspaceId: string, client: Client) {
  const [{ listDealsApi, deleteDealApi }, { listFollowUpsApi, deleteFollowUpApi }] = await Promise.all([import("./deals-api"), import("./crm-api")])
  for (const d of await listDealsApi(workspaceId, { withDeleted: true })) if (d.clientId === client.id) await deleteDealApi(workspaceId, d.id)
  for (const f of await listFollowUpsApi(workspaceId, { withDeleted: true })) if (f.clientId === client.id) await deleteFollowUpApi(workspaceId, f.id)
  for (const h of history.list(workspaceId)) if (h.clientId === client.id) history.remove(workspaceId, h.id)
  clients.remove(workspaceId, client.id)
  recordAudit(workspaceId, { action: "Client removed for good", actionKey: "client.purged", category: "Team", target: client.name })
}

/** Clients deleted more than BIN_DAYS days ago leave the bin for good. */
function sweepBin(workspaceId: string) {
  for (const c of clients.list(workspaceId)) if (c.deletedAt && binDaysLeft(c.deletedAt) === 0) void purge(workspaceId, c)
}

/**
 * Merges `otherId` into `keepId` (CRM step 9): the kept client takes the
 * chosen values and the other's contacts and tags, and every deal, quote,
 * invoice, project, follow-up, contract, note and request moves to it. The
 * other client is then removed; the merge stays in the kept client's history.
 */
export async function mergeClientsApi(workspaceId: string, keepId: string, otherId: string, picks: MergePicks = {}): Promise<Client> {
  if (keepId === otherId) throw new Error("Choose two different clients")
  const keep = clients.get(workspaceId, keepId)
  const other = clients.get(workspaceId, otherId)
  if (!keep || keep.deletedAt || !other || other.deletedAt) throw new Error("This client no longer exists")
  // load every collection that points at clients, so their records move too
  await Promise.all([
    import("./deals-api"), import("./crm-api"), import("./work-projects-api"), import("./work-billing-api"), import("./quotes-api"),
    import("./recurring-invoices-api"), import("./satisfaction-api"), import("./client-requests-api"), import("./portal-api"), import("./change-orders-api"),
  ])
  const values = mergeClientValues(keep, other, picks)
  const merged = clients.update(workspaceId, keepId, normalizeContacts(values as Partial<ClientInput>))
  const moved = reassignReference(workspaceId, "clientId", otherId, keepId, ["clients", "audit"])
  clients.remove(workspaceId, otherId)
  log(workspaceId, keepId, "merged", diffClient(keep, merged), other.name)
  recordAudit(workspaceId, { action: "Clients merged", actionKey: "client.merged", category: "Team", target: keep.name, before: other.name, after: `${moved} records moved` })
  return merged
}

/** Exactly one primary contact whenever a client has contacts. */
/** Drops the spaces and dots people type in the ICE. */
/** Clean identifiers, and tags trimmed without duplicates (CRM step 1). */
function withCleanIds<T extends Partial<ClientInput>>(input: T): T {
  const ids = "ice" in input ? { ...input, ice: cleanId(input.ice) } : input
  return ids.tags ? { ...ids, tags: cleanTags(ids.tags) } : ids
}

function normalizeContacts<T extends Partial<ClientInput>>(input: T): T {
  const contacts = input.contacts
  if (!contacts?.length) return input
  const primaryIndex = Math.max(0, contacts.findIndex((c) => c.isPrimary))
  return {
    ...input,
    contacts: contacts.map((c, i) => ({ ...c, isPrimary: i === primaryIndex })),
  }
}
