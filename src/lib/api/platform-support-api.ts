import { createCollection } from "@/lib/workforce/demo-store"
import { recordAudit } from "@/lib/workforce/audit"
import { consoleCan } from "@/lib/platform/console-roles"
import { SESSION_MAX_MINUTES, isSessionActive, sessionLive } from "@/lib/platform/support-rules"
import { ConsoleCapability as C, ConsoleRole } from "@/types/platform-console"
import type { SupportCategory, SupportPriority, SupportRequest, SupportSession, SupportStatus } from "@/types/platform-support"
import { PLATFORM_WS, audit, auditCustomer, type ConsoleActor } from "./platform-console-api"
import { customersCollection } from "./platform-customers-api"

/**
 * Support requests and support sessions (cahier des charges §5.9, Lot A4), on
 * demo data. A session is the only path from the console to a customer's
 * business data: requested by an agent, approved by the customer
 * administrator, limited in time, visible to the customer and recorded in
 * both audit trails.
 */

type Person = { name: string; email: string }

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()
const stamp = () => {
  const now = new Date().toISOString()
  return { workspaceId: PLATFORM_WS, createdAt: now, updatedAt: now }
}
const msg = (id: string, side: "customer" | "nexora", author: string, text: string, minutes: number) => ({ id, side, author, text, at: ago(minutes) })

const seedRequests = (): SupportRequest[] => [
  {
    ...stamp(), id: "sr_41", number: "SR-0041", customerId: "cus_atlas", customerName: "Atlas Consulting", requesterName: "Alex Morgan", requesterEmail: "alex.morgan@company.io",
    subject: "The VAT return total differs from my accountant's figure", category: "data", priority: "high", status: "open", assigneeId: "stf_liam", assigneeName: "Liam O'Connor",
    messages: [
      msg("m1", "customer", "Alex Morgan", "For September, Nexora shows 48,200 MAD of VAT to pay; our accountant finds 47,600 MAD. Can you check?", 300),
      msg("m2", "nexora", "Liam O'Connor", "Thanks Alex. To compare line by line I need to look at your VAT return. I've sent a 60-minute read-only access request; please approve it in Help & support.", 240),
    ],
    firstResponseAt: ago(240), createdAt: ago(300), updatedAt: ago(240),
  },
  {
    ...stamp(), id: "sr_42", number: "SR-0042", customerId: "cus_marrakech", customerName: "Marrakech Digital", requesterName: "Nadia El Fassi", requesterEmail: "nadia@marrakechdigital.ma",
    subject: "Our card was declined: can we pay by bank transfer?", category: "billing", priority: "normal", status: "waiting_customer", assigneeId: "stf_nadia", assigneeName: "Nadia Berrada",
    messages: [
      msg("m3", "customer", "Nadia El Fassi", "Our company card was refused this month. Can we pay the invoice by transfer instead?", 60 * 26),
      msg("m4", "nexora", "Nadia Berrada", "Yes: transfer the amount to our RIB with the invoice number as reference and it will be matched automatically. Shall we switch you to transfer for the next months?", 60 * 20),
    ],
    firstResponseAt: ago(60 * 20), createdAt: ago(60 * 26), updatedAt: ago(60 * 20),
  },
  {
    ...stamp(), id: "sr_43", number: "SR-0043", customerId: "cus_tanger", customerName: "Tanger Logistics Conseil", requesterName: "Youssef Berrada", requesterEmail: "y.berrada@tlc.ma",
    subject: "How do I add a second administrator?", category: "question", priority: "low", status: "resolved", assigneeId: "stf_liam", assigneeName: "Liam O'Connor",
    messages: [
      msg("m5", "customer", "Youssef Berrada", "I would like my finance manager to be administrator too.", 60 * 70),
      msg("m6", "nexora", "Liam O'Connor", "In System → Team access, open her line and choose the Admin role. Done!", 60 * 68),
    ],
    firstResponseAt: ago(60 * 68), createdAt: ago(60 * 70), updatedAt: ago(60 * 60),
  },
  {
    ...stamp(), id: "sr_44", number: "SR-0044", customerId: "cus_atlas", customerName: "Atlas Consulting", requesterName: "Karim Haddad", requesterEmail: "karim@atlas.example",
    subject: "The October timesheet export stops at 50%", category: "bug", priority: "urgent", status: "open",
    messages: [msg("m7", "customer", "Karim Haddad", "The Excel export of October's timesheets never finishes. We need it for payroll today.", 360)],
    createdAt: ago(360), updatedAt: ago(360),
  },
]

const seedSessions = (): SupportSession[] => [
  {
    ...stamp(), id: "ss_1", requestId: "sr_41", requestNumber: "SR-0041", customerId: "cus_atlas", customerName: "Atlas Consulting", tenantWorkspaceId: "ws_atlas",
    agentId: "stf_liam", agentName: "Liam O'Connor", reason: "Compare the September VAT return with the accountant's figure (SR-0041)", scope: "read", minutes: 60,
    status: "requested", requestedAt: ago(240), pagesViewed: 0,
  },
  {
    ...stamp(), id: "ss_0", customerId: "cus_atlas", customerName: "Atlas Consulting", tenantWorkspaceId: "ws_atlas",
    agentId: "stf_amine", agentName: "Amine Lahlou", reason: "Check why an invoice PDF did not open", scope: "read", minutes: 60,
    status: "ended", requestedAt: ago(60 * 74), decidedBy: "Alex Morgan", decidedAt: ago(60 * 73), startsAt: ago(60 * 73), endsAt: ago(60 * 72), endedAt: ago(60 * 72 + 20), endedBy: "Amine Lahlou", pagesViewed: 4,
  },
]

const requests = createCollection<SupportRequest>("platform-support-requests", "sr", seedRequests)
const sessions = createCollection<SupportSession>("platform-support-sessions", "ss", seedSessions)

const ERR_FORBIDDEN = "Your console role does not allow this"
/** Roles that answer support requests. */
export const canHandleSupport = (role: ConsoleRole | undefined) => role === ConsoleRole.OWNER || role === ConsoleRole.ADMIN || role === ConsoleRole.SUPPORT || role === ConsoleRole.ENGINEERING
const needAgent = (a: ConsoleActor) => {
  if (!canHandleSupport(a.role)) throw new Error(ERR_FORBIDDEN)
}
const getRequest = (id: string) => {
  const r = requests.get(PLATFORM_WS, id)
  if (!r) throw new Error("This support request no longer exists")
  return r
}
const getSession = (id: string) => {
  const s = sessions.get(PLATFORM_WS, id)
  if (!s) throw new Error("This support session no longer exists")
  return s
}
/** The customer whose demo workspace this is. */
export function customerOfWorkspace(workspaceId: string) {
  return customersCollection.list(PLATFORM_WS).find((c) => c.demoWorkspaceId === workspaceId) ?? null
}
/** Writes the same event to the customer's own ERP audit log (SUP-07). */
function tenantAudit(s: Pick<SupportSession, "tenantWorkspaceId">, action: string, key: string, target: string, by: Person, extra: { before?: unknown; after?: unknown } = {}) {
  if (!s.tenantWorkspaceId) return
  recordAudit(s.tenantWorkspaceId, { action, actionKey: key, category: "Security", target, actor: { id: by.email, name: by.name, email: by.email }, ...extra })
}

/* ---------- reads ---------- */

export const listSupportRequestsApi = async () => [...requests.list(PLATFORM_WS)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
export const listSupportSessionsApi = async () => [...sessions.list(PLATFORM_WS)].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))

/** What a customer company sees: its own requests and sessions only. */
export async function listCompanySupportApi(workspaceId: string) {
  const c = customerOfWorkspace(workspaceId)
  if (!c) return { customer: null, requests: [] as SupportRequest[], sessions: [] as SupportSession[] }
  return {
    customer: { id: c.id, name: c.name },
    requests: (await listSupportRequestsApi()).filter((r) => r.customerId === c.id),
    sessions: (await listSupportSessionsApi()).filter((s) => s.customerId === c.id),
  }
}

/** The session open on a workspace right now, if any (SUP-05 banner). */
export async function activeSessionForWorkspaceApi(workspaceId: string): Promise<SupportSession | null> {
  return sessions.list(PLATFORM_WS).find((s) => s.tenantWorkspaceId === workspaceId && isSessionActive(s)) ?? null
}

/* ---------- requests (SUP-01, SUP-02, SUP-10) ---------- */

/** SUP-01: raised from inside the company's Nexora. */
export async function createSupportRequestApi(by: Person, workspaceId: string, input: { subject: string; category: SupportCategory; priority: SupportPriority; text: string }) {
  const c = customerOfWorkspace(workspaceId)
  if (!c) throw new Error("This workspace is not linked to a Nexora customer")
  if (input.subject.trim().length < 5 || input.text.trim().length < 5) throw new Error("Describe the problem in a few words")
  const number = `SR-${String(requests.list(PLATFORM_WS).reduce((m, r) => Math.max(m, Number(r.number.slice(3)) || 0), 0) + 1).padStart(4, "0")}`
  const now = new Date().toISOString()
  const created = requests.create(PLATFORM_WS, {
    number, customerId: c.id, customerName: c.name, requesterName: by.name, requesterEmail: by.email, subject: input.subject.trim(), category: input.category,
    priority: input.priority, status: "open", messages: [{ id: `m_${Date.now()}`, side: "customer", author: by.name, text: input.text.trim(), at: now }],
  })
  auditCustomer(by, c.id, "support.request_created", `${number} · ${created.subject}`, { after: input.priority })
  return created
}

export async function customerReplyApi(by: Person, requestId: string, text: string) {
  const r = getRequest(requestId)
  if (!text.trim()) throw new Error("Write the message first")
  return requests.update(PLATFORM_WS, r.id, {
    messages: [...r.messages, { id: `m_${Date.now()}`, side: "customer", author: by.name, text: text.trim(), at: new Date().toISOString() }],
    status: r.status === "closed" ? "closed" : "open",
  })
}

export async function agentReplyApi(actor: ConsoleActor, requestId: string, input: { text: string; waitForCustomer: boolean }) {
  needAgent(actor)
  const r = getRequest(requestId)
  if (!input.text.trim()) throw new Error("Write the message first")
  const now = new Date().toISOString()
  const updated = requests.update(PLATFORM_WS, r.id, {
    messages: [...r.messages, { id: `m_${Date.now()}`, side: "nexora", author: actor.name, text: input.text.trim(), at: now }],
    firstResponseAt: r.firstResponseAt ?? now,
    status: input.waitForCustomer ? "waiting_customer" : r.status,
    assigneeId: r.assigneeId ?? actor.id, assigneeName: r.assigneeName ?? actor.name,
  })
  audit(actor, "support.replied", "support", `${r.number} · ${r.customerName}`, { customerId: r.customerId })
  return updated
}

/** SUP-02: assign to a team member. */
export async function assignSupportApi(actor: ConsoleActor, requestId: string, staff: { id: string; name: string }) {
  needAgent(actor)
  const r = getRequest(requestId)
  const updated = requests.update(PLATFORM_WS, r.id, { assigneeId: staff.id, assigneeName: staff.name })
  audit(actor, "support.assigned", "support", `${r.number} · ${r.customerName}`, { before: r.assigneeName, after: staff.name, customerId: r.customerId })
  return updated
}

export async function setSupportStatusApi(actor: ConsoleActor, requestId: string, status: SupportStatus) {
  needAgent(actor)
  const r = getRequest(requestId)
  const updated = requests.update(PLATFORM_WS, r.id, { status })
  audit(actor, "support.status_changed", "support", `${r.number} · ${r.customerName}`, { before: r.status, after: status, customerId: r.customerId })
  return updated
}

/* ---------- sessions (SUP-03 to SUP-09) ---------- */

/** SUP-03: reason, scope (read-only by default) and duration (60 minutes by default, 24 hours at most). */
export async function requestSessionApi(actor: ConsoleActor, input: { customerId: string; requestId?: string; reason: string; scope: "read" | "write"; minutes: number }) {
  if (!consoleCan(actor.role, C.SUPPORT_SESSION)) throw new Error(ERR_FORBIDDEN)
  const c = customersCollection.get(PLATFORM_WS, input.customerId)
  if (!c || c.status === "deleted") throw new Error("This customer no longer exists")
  if (input.reason.trim().length < 10) throw new Error("Explain why you need access")
  if (!(input.minutes >= 15 && input.minutes <= SESSION_MAX_MINUTES)) throw new Error("A session lasts between 15 minutes and 24 hours")
  const open = sessions.list(PLATFORM_WS).find((s) => s.customerId === c.id && s.agentId === actor.id && ["waiting_approval", "waiting_owner", "active"].includes(sessionLive(s)))
  if (open) throw new Error("You already have an open session request for this customer")
  const req = input.requestId ? getRequest(input.requestId) : undefined
  const created = sessions.create(PLATFORM_WS, {
    requestId: req?.id, requestNumber: req?.number, customerId: c.id, customerName: c.name, tenantWorkspaceId: c.demoWorkspaceId,
    agentId: actor.id, agentName: actor.name, reason: input.reason.trim(), scope: input.scope, minutes: Math.round(input.minutes),
    status: "requested", requestedAt: new Date().toISOString(), pagesViewed: 0,
  })
  audit(actor, "support.session_requested", "support", `${c.name} · ${input.scope} · ${created.minutes} min`, { after: created.reason, customerId: c.id })
  tenantAudit(created, "Nexora support asked for access", "support.session_requested", `${actor.name} · ${input.scope} · ${created.minutes} min`, { name: actor.name, email: `${actor.id}@nexora.io` })
  return created
}

/** SUP-04: only the customer administrator approves or refuses; the clock starts at approval. */
export async function decideSessionApi(by: Person, sessionId: string, approve: boolean) {
  const s = getSession(sessionId)
  if (s.status !== "requested") throw new Error("This access request was already answered")
  const now = new Date()
  const starts = s.scope === "read" || s.ownerApprovedBy
  const updated = sessions.update(PLATFORM_WS, s.id, approve
    ? { status: "approved", decidedBy: by.name, decidedAt: now.toISOString(), ...(starts ? { startsAt: now.toISOString(), endsAt: new Date(now.getTime() + s.minutes * 60_000).toISOString() } : {}) }
    : { status: "refused", decidedBy: by.name, decidedAt: now.toISOString() })
  auditCustomer(by, s.customerId, approve ? "support.session_approved" : "support.session_refused", `${s.agentName} · ${s.scope} · ${s.minutes} min`)
  tenantAudit(s, approve ? "Support access approved" : "Support access refused", approve ? "support.session_approved" : "support.session_refused", `${s.agentName} · ${s.minutes} min`, by)
  return updated
}

/** SUP-08: write access also needs a platform owner, who is not the agent. */
export async function ownerApproveSessionApi(actor: ConsoleActor, sessionId: string) {
  if (actor.role !== ConsoleRole.OWNER) throw new Error(ERR_FORBIDDEN)
  const s = getSession(sessionId)
  if (s.scope !== "write" || s.ownerApprovedBy) throw new Error("This session does not wait for an owner")
  if (s.agentId === actor.id) throw new Error("Another platform owner must approve your own write session")
  const now = new Date()
  const updated = sessions.update(PLATFORM_WS, s.id, {
    ownerApprovedBy: actor.name,
    ...(s.status === "approved" ? { startsAt: now.toISOString(), endsAt: new Date(now.getTime() + s.minutes * 60_000).toISOString() } : {}),
  })
  audit(actor, "support.session_approved", "support", `${s.customerName} · write · ${s.agentName}`, { customerId: s.customerId })
  return updated
}

/** SUP-06: the agent closes, or the customer revokes; either ends access at once. */
export async function endSessionApi(by: { actor?: ConsoleActor; customer?: Person }, sessionId: string) {
  const s = getSession(sessionId)
  if (!["waiting_approval", "waiting_owner", "active"].includes(sessionLive(s))) throw new Error("This session has already ended")
  if (by.actor && by.actor.id !== s.agentId && by.actor.role !== ConsoleRole.OWNER && by.actor.role !== ConsoleRole.ADMIN) throw new Error(ERR_FORBIDDEN)
  const who = by.actor?.name ?? by.customer?.name ?? "—"
  const updated = sessions.update(PLATFORM_WS, s.id, { status: by.customer ? "revoked" : "ended", endedAt: new Date().toISOString(), endedBy: who })
  if (by.actor) audit(by.actor, "support.session_ended", "support", `${s.customerName} · ${s.agentName}`, { after: `${s.pagesViewed} pages`, customerId: s.customerId })
  if (by.customer) auditCustomer(by.customer, s.customerId, "support.session_ended", `${s.agentName} · revoked`)
  tenantAudit(s, by.customer ? "Support access revoked" : "Support session closed", "support.session_ended", s.agentName, by.customer ?? { name: who, email: "support@nexora.io" })
  return updated
}

/** SUP-07: each page the agent opens is written to both trails. */
export async function recordSessionPageApi(actor: ConsoleActor, sessionId: string, path: string) {
  const s = getSession(sessionId)
  if (!isSessionActive(s) || s.agentId !== actor.id) return null
  const updated = sessions.update(PLATFORM_WS, s.id, { pagesViewed: s.pagesViewed + 1 })
  audit(actor, "support.page_viewed", "support", `${s.customerName} · ${path}`, { customerId: s.customerId })
  tenantAudit(s, "Nexora support viewed a page", "support.page_viewed", path, { name: actor.name, email: `${actor.id}@nexora.io` })
  return updated
}
