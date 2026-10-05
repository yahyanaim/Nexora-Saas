import { createCollection } from "@/lib/workforce/demo-store"
import { recordAudit } from "@/lib/workforce/audit"
import { DEFAULT_PORTAL_INACTIVITY_DAYS, awaitingClient, canSignIn } from "@/lib/workforce/portal"
import { PortalAccessStatus, type PortalAccess } from "@/types/work-portal"
import type { Milestone } from "@/types/work-projects"
import { listClientsApi } from "./clients-api"
import { getSettingsApi } from "./settings-api"
import { listMilestonesApi, listProjectsApi, listTasksApi, updateMilestoneApi } from "./work-projects-api"

const STAMP = "2026-01-05T09:00:00.000Z"

function seedAccess(workspaceId: string): PortalAccess[] {
  const now = new Date()
  const ago = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString()
  const rows: Omit<PortalAccess, "workspaceId" | "createdAt" | "updatedAt">[] =
    workspaceId === "ws_atlas"
      ? [
          { id: "pa_1", clientId: "cli_orbit", contactId: "con_1", name: "Claire Petit", email: "claire@orbit.example", status: PortalAccessStatus.ACTIVE, invitedAt: ago(60), lastSeenAt: ago(2) },
          { id: "pa_2", clientId: "cli_helio", contactId: "con_3", name: "Rachid Amrani", email: "rachid@helio.example", status: PortalAccessStatus.INVITED, invitedAt: ago(5) },
          { id: "pa_3", clientId: "cli_medica", contactId: "con_4", name: "Sofia Conti", email: "sofia@medica.example", status: PortalAccessStatus.ACTIVE, invitedAt: ago(200), lastSeenAt: ago(120) },
        ]
      : workspaceId === "ws_northwind"
        ? [{ id: "pa_10", clientId: "cli_lumen", contactId: "con_6", name: "Grace Lee", email: "grace@lumen.example", status: PortalAccessStatus.ACTIVE, invitedAt: ago(30), lastSeenAt: ago(1) }]
        : []
  return rows.map((r) => ({ ...r, workspaceId, createdAt: STAMP, updatedAt: STAMP }))
}

/**
 * Client portal logins (CRM-9, CRM-12) and the client's milestone decisions
 * (CRM-10, PRJ-8). Browser demo store for now; the server must enforce that a
 * portal user only ever reads its own client's records.
 */
const access = createCollection<PortalAccess>("portal-access", "pa", seedAccess)

export async function listPortalAccessApi(workspaceId: string): Promise<PortalAccess[]> {
  return access.list(workspaceId)
}

export async function portalInactivityDays(workspaceId: string) {
  return (await getSettingsApi(workspaceId)).portalInactivityDays ?? DEFAULT_PORTAL_INACTIVITY_DAYS
}

/** Invites (or re-invites) a client contact; a new invitation restarts the inactivity clock. */
export async function invitePortalContactApi(workspaceId: string, clientId: string, contactId: string): Promise<PortalAccess> {
  const client = (await listClientsApi(workspaceId)).find((c) => c.id === clientId)
  const contact = client?.contacts.find((c) => c.id === contactId)
  if (!client || !contact) throw new Error("Contact not found")
  if (client.status === "archived") throw new Error("Archived clients can't use the portal")
  const email = contact.email.toLowerCase()
  const taken = access.list(workspaceId).find((a) => a.email === email && a.contactId !== contactId && a.status !== PortalAccessStatus.REVOKED)
  if (taken) throw new Error("Another contact already uses this email in the portal")
  const existing = access.list(workspaceId).find((a) => a.contactId === contactId)
  const now = new Date().toISOString()
  const saved = existing
    ? access.update(workspaceId, existing.id, { status: PortalAccessStatus.INVITED, invitedAt: now, lastSeenAt: undefined, email, name: contact.name })
    : access.create(workspaceId, { clientId, contactId, name: contact.name, email, status: PortalAccessStatus.INVITED, invitedAt: now })
  recordAudit(workspaceId, { action: existing ? "Portal invitation resent" : "Portal access given", actionKey: "portal.invite", category: "Team", target: `${contact.name} (${client.name})` })
  return saved
}

export async function revokePortalAccessApi(workspaceId: string, id: string): Promise<PortalAccess> {
  const row = access.get(workspaceId, id)
  if (!row) throw new Error("Access not found")
  recordAudit(workspaceId, { action: "Portal access revoked", actionKey: "portal.revoke", category: "Team", target: row.name })
  return access.update(workspaceId, id, { status: PortalAccessStatus.REVOKED })
}

/** Sign-in for a client contact: invited logins become active, expired or revoked ones are refused. */
export async function findPortalAccountForSignInApi(email: string, workspaceIds: string[]) {
  const key = email.toLowerCase()
  for (const ws of workspaceIds) {
    const row = access.list(ws).find((a) => a.email === key && a.status !== PortalAccessStatus.REVOKED)
    if (!row) continue
    if (!canSignIn(row, new Date(), await portalInactivityDays(ws))) return undefined
    const client = (await listClientsApi(ws)).find((c) => c.id === row.clientId)
    if (!client || client.status === "archived") return undefined
    const updated = access.update(ws, row.id, { status: PortalAccessStatus.ACTIVE, lastSeenAt: new Date().toISOString() })
    return { workspaceId: ws, access: updated, client }
  }
  return undefined
}

/**
 * The client approves a finished milestone, or asks for changes with a
 * required comment (CRM-10, PRJ-8). Only milestones of the client's own
 * projects, waiting for its sign-off, can be decided.
 */
export async function decideMilestoneApi(
  workspaceId: string,
  clientId: string,
  milestoneId: string,
  decision: { approved: boolean; comment?: string; by: string }
): Promise<Milestone> {
  const milestone = (await listMilestonesApi(workspaceId)).find((m) => m.id === milestoneId)
  const project = milestone && (await listProjectsApi(workspaceId)).find((p) => p.id === milestone.projectId)
  if (!milestone || !project || project.clientId !== clientId) throw new Error("Milestone not found")
  if (!awaitingClient(milestone, await listTasksApi(workspaceId, project.id))) throw new Error("This milestone isn't waiting for your approval")
  const comment = decision.comment?.trim()
  if (!decision.approved && !comment) throw new Error("Tell the team what should change")
  const now = new Date().toISOString()
  const saved = await updateMilestoneApi(workspaceId, milestoneId, {
    approvedAt: decision.approved ? now : undefined,
    rejectedAt: decision.approved ? undefined : now,
    decisionComment: comment || undefined,
    decidedBy: decision.by,
  } as Partial<Milestone>)
  recordAudit(workspaceId, {
    action: decision.approved ? "Milestone approved by client" : "Client asked for changes",
    actionKey: decision.approved ? "portal.milestone_approved" : "portal.milestone_rejected",
    category: "Approvals",
    target: `${project.code} · ${milestone.title}`,
  })
  return saved
}
