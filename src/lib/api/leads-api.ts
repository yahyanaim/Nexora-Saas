import { listClientsApi, updateClientApi } from "./clients-api"
import { saveDealApi } from "./deals-api"
import { recordAudit } from "@/lib/workforce/audit"
import { todayIso } from "@/lib/workforce/project-metrics"
import { ClientStatus, type Client } from "@/types/workforce"
import type { Deal, DealInput } from "@/types/work-sales"

async function leadOf(workspaceId: string, id: string): Promise<Client> {
  const client = (await listClientsApi(workspaceId)).find((c) => c.id === id)
  if (!client) throw new Error("This client no longer exists")
  if (client.status !== ClientStatus.LEAD) throw new Error("Only a lead can be converted or dropped")
  return client
}

/**
 * Turns a lead into a client (CRM step 6), with the deal that comes with it
 * when one is given. The deal is saved first, so a bad deal leaves the lead as it was.
 */
export async function convertLeadApi(workspaceId: string, id: string, deal?: Omit<DealInput, "clientId">): Promise<{ client: Client; deal?: Deal }> {
  const lead = await leadOf(workspaceId, id)
  const savedDeal = deal ? await saveDealApi(workspaceId, { ...deal, clientId: id }) : undefined
  const client = await updateClientApi(workspaceId, id, { status: ClientStatus.ACTIVE, convertedAt: todayIso(), lostReason: undefined })
  recordAudit(workspaceId, { action: "Lead converted", actionKey: "lead.converted", category: "Billing", target: lead.name })
  return { client, deal: savedDeal }
}

/** Drops a lead: archived with the reason, so it counts in the conversion rate. */
export async function dropLeadApi(workspaceId: string, id: string, reason: string): Promise<Client> {
  const lead = await leadOf(workspaceId, id)
  if (!reason.trim()) throw new Error("Say why the lead was dropped")
  const client = await updateClientApi(workspaceId, id, { status: ClientStatus.ARCHIVED, lostReason: reason.trim() })
  recordAudit(workspaceId, { action: "Lead dropped", actionKey: "lead.dropped", category: "Billing", target: lead.name })
  return client
}
