import { createCollection } from "@/lib/workforce/demo-store"
import { canManageStaff, canRevokeSessions, consoleCan } from "@/lib/platform/console-roles"
import { INVITE_LIFETIME_MS, inviteExpired, sessionState } from "@/lib/platform/session-policy"
import {
  ConsoleCapability,
  ConsoleRole,
  type ConsoleAuditAction,
  type ConsoleAuditEvent,
  type PlatformStaff,
  type StaffSession,
} from "@/types/platform-console"

/**
 * The Nexora team, its console sessions and the console audit trail (Lot A1).
 * Demo data kept in the browser under one platform key, never in a customer's
 * workspace. The server will enforce the same rules (SEC-01).
 */
export const PLATFORM_WS = "nexora-platform"

const ago = (minutes: number, now = new Date()) => new Date(now.getTime() - minutes * 60 * 1000).toISOString()

const seedStaff = (ws: string): PlatformStaff[] => {
  const now = new Date().toISOString()
  const base = { workspaceId: ws, createdAt: now, updatedAt: now }
  return [
    { ...base, id: "stf_sophia", name: "Sophia Vance", email: "sophia.v@nexora.io", role: ConsoleRole.OWNER, status: "active", twoFactor: true, avatar: "/avatars/sophia-vance.jpg", lastSignInAt: ago(5) },
    { ...base, id: "stf_liam", name: "Liam O'Connor", email: "liam@nexora.io", role: ConsoleRole.SUPPORT, status: "active", twoFactor: true, avatar: "/avatars/liam-oconnor.jpg", lastSignInAt: ago(90) },
    { ...base, id: "stf_amine", name: "Amine Lahlou", email: "amine@nexora.io", role: ConsoleRole.ENGINEERING, status: "active", twoFactor: true, avatar: "/avatars/david-kim.jpg", lastSignInAt: ago(60 * 20) },
    { ...base, id: "stf_nadia", name: "Nadia Berrada", email: "nadia@nexora.io", role: ConsoleRole.FINANCE, status: "active", twoFactor: true, lastSignInAt: ago(60 * 26) },
    { ...base, id: "stf_yassine", name: "Yassine Amrani", email: "yassine@nexora.io", role: ConsoleRole.SALES, status: "active", twoFactor: false, lastSignInAt: ago(60 * 24 * 3) },
    { ...base, id: "stf_imane", name: "Imane Chraibi", email: "imane@nexora.io", role: ConsoleRole.ADMIN, status: "invited", twoFactor: false, invitedBy: "Sophia Vance", inviteExpiresAt: new Date(Date.now() + 40 * 60 * 60 * 1000).toISOString() },
  ]
}

const seedSessions = (ws: string): StaffSession[] => {
  const now = new Date().toISOString()
  const s = (id: string, staffId: string, device: string, location: string, ip: string, started: number, last: number, revoked?: { at: number; by: string }): StaffSession => ({
    id, workspaceId: ws, staffId, device, location, ip, startedAt: ago(started), lastActivityAt: ago(last),
    ...(revoked ? { revokedAt: ago(revoked.at), revokedBy: revoked.by } : {}), createdAt: now, updatedAt: now,
  })
  return [
    s("ses_1", "stf_sophia", "Chrome · macOS", "Casablanca, MA", "105.66.12.40", 50, 1),
    s("ses_2", "stf_liam", "Edge · Windows", "Rabat, MA", "41.248.3.17", 120, 12),
    s("ses_3", "stf_amine", "Firefox · Ubuntu", "Casablanca, MA", "105.66.12.41", 60 * 3, 60 * 2),
    s("ses_4", "stf_nadia", "Safari · iPhone", "Marrakech, MA", "196.200.4.9", 60 * 14, 60 * 13),
    s("ses_5", "stf_yassine", "Chrome · Android", "Lyon, FR", "92.184.10.2", 60 * 30, 60 * 29, { at: 60 * 28, by: "Sophia Vance" }),
  ]
}

const seedAudit = (ws: string): ConsoleAuditEvent[] => {
  const now = new Date().toISOString()
  const e = (id: string, minutes: number, actorId: string, actorName: string, actorRole: ConsoleRole, action: ConsoleAuditAction, targetType: ConsoleAuditEvent["targetType"], targetLabel: string, extra: Partial<ConsoleAuditEvent> = {}): ConsoleAuditEvent => ({
    id, workspaceId: ws, actorId, actorName, actorRole, action, targetType, targetLabel, ip: "105.66.12.40", sessionId: "ses_1", at: ago(minutes), createdAt: now, updatedAt: now, ...extra,
  })
  return [
    e("aud_1", 60 * 28, "stf_sophia", "Sophia Vance", ConsoleRole.OWNER, "session.revoked", "session", "Yassine Amrani · Chrome · Android", { before: "active", after: "revoked" }),
    e("aud_2", 60 * 32, "stf_sophia", "Sophia Vance", ConsoleRole.OWNER, "staff.invited", "staff", "Imane Chraibi", { after: ConsoleRole.ADMIN }),
    e("aud_3", 60 * 50, "stf_nadia", "Nadia Berrada", ConsoleRole.FINANCE, "invoice.credit_note", "invoice", "NX-2026-00041 · Souss Ingénierie", { after: "AV-2026-00003", ip: "196.200.4.9", sessionId: "ses_4" }),
    e("aud_4", 60 * 72, "stf_sophia", "Sophia Vance", ConsoleRole.OWNER, "staff.role_changed", "staff", "Yassine Amrani", { before: ConsoleRole.READ_ONLY, after: ConsoleRole.SALES }),
    e("aud_5", 60 * 96, "stf_yassine", "Yassine Amrani", ConsoleRole.SALES, "customer.trial_created", "customer", "Atlas Digital", { after: "trial · 14 days", ip: "41.248.9.30", sessionId: "ses_0" }),
  ]
}

const staffStore = createCollection<PlatformStaff>("platform-staff", "stf", seedStaff)
const sessionStore = createCollection<StaffSession>("platform-sessions", "ses", seedSessions)
const auditStore = createCollection<ConsoleAuditEvent>("platform-audit", "aud", seedAudit)

/** The team member acting, resolved from the signed-in account's e-mail. */
export interface ConsoleActor {
  id: string
  name: string
  role: ConsoleRole
  sessionId?: string
}

const ERR_FORBIDDEN = "Your console role does not allow this"

/** Writes one audit event (AUD-01). Events are only ever appended. */
export function audit(actor: ConsoleActor, action: ConsoleAuditAction, targetType: ConsoleAuditEvent["targetType"], targetLabel: string, extra: Partial<Pick<ConsoleAuditEvent, "before" | "after" | "customerId">> = {}) {
  return auditStore.create(PLATFORM_WS, {
    actorId: actor.id, actorName: actor.name, actorRole: actor.role, action, targetType, targetLabel,
    ip: "105.66.12.40", sessionId: actor.sessionId ?? "ses_1", at: new Date().toISOString(), ...extra,
  })
}

export async function listStaffApi(): Promise<PlatformStaff[]> {
  return staffStore.list(PLATFORM_WS).filter((s) => s.status !== "removed")
}

export async function findStaffByEmailApi(email: string | undefined): Promise<PlatformStaff | null> {
  if (!email) return null
  return staffStore.list(PLATFORM_WS).find((s) => s.email.toLowerCase() === email.toLowerCase() && s.status === "active") ?? null
}

const owners = () => staffStore.list(PLATFORM_WS).filter((s) => s.role === ConsoleRole.OWNER && s.status === "active")

export async function inviteStaffApi(actor: ConsoleActor, input: { name: string; email: string; role: ConsoleRole }): Promise<PlatformStaff> {
  // STF-02: inviting needs a platform owner; admins may invite non-owners ("staff only")
  if (!canManageStaff(actor.role, input.role, input.role)) throw new Error(ERR_FORBIDDEN)
  const email = input.email.trim().toLowerCase()
  if (!input.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a name and a valid e-mail")
  const existing = staffStore.list(PLATFORM_WS).find((s) => s.email.toLowerCase() === email && s.status !== "removed")
  if (existing) throw new Error("This e-mail is already in the team")
  const created = staffStore.create(PLATFORM_WS, {
    name: input.name.trim(), email, role: input.role, status: "invited", twoFactor: false, invitedBy: actor.name,
    inviteExpiresAt: new Date(Date.now() + INVITE_LIFETIME_MS).toISOString(),
  })
  audit(actor, "staff.invited", "staff", created.name, { after: input.role })
  return created
}

export async function resendInviteApi(actor: ConsoleActor, id: string): Promise<PlatformStaff> {
  const target = staffStore.get(PLATFORM_WS, id)
  if (!target || target.status !== "invited") throw new Error("This invitation no longer exists")
  if (!canManageStaff(actor.role, target.role)) throw new Error(ERR_FORBIDDEN)
  const updated = staffStore.update(PLATFORM_WS, id, { inviteExpiresAt: new Date(Date.now() + INVITE_LIFETIME_MS).toISOString() })
  audit(actor, "staff.invite_resent", "staff", target.name)
  return updated
}

/** Demo only: what the invited person does when they open the link (STF-02, STF-03). */
export async function acceptInviteApi(id: string): Promise<PlatformStaff> {
  const target = staffStore.get(PLATFORM_WS, id)
  if (!target || target.status !== "invited") throw new Error("This invitation no longer exists")
  if (inviteExpired(target)) throw new Error("This invitation has expired")
  return staffStore.update(PLATFORM_WS, id, { status: "active", twoFactor: true, inviteExpiresAt: undefined, lastSignInAt: new Date().toISOString() })
}

export async function changeStaffRoleApi(actor: ConsoleActor, id: string, role: ConsoleRole): Promise<PlatformStaff> {
  const target = staffStore.get(PLATFORM_WS, id)
  if (!target || target.status === "removed") throw new Error("This team member no longer exists")
  if (!canManageStaff(actor.role, target.role, role)) throw new Error(ERR_FORBIDDEN)
  if (target.role === role) return target
  if (target.role === ConsoleRole.OWNER && owners().length <= 1) throw new Error("The team must keep at least one platform owner")
  const updated = staffStore.update(PLATFORM_WS, id, { role })
  audit(actor, "staff.role_changed", "staff", target.name, { before: target.role, after: role })
  return updated
}

/** STF-07: removing a member ends their sessions the same moment. */
export async function removeStaffApi(actor: ConsoleActor, id: string): Promise<void> {
  const target = staffStore.get(PLATFORM_WS, id)
  if (!target || target.status === "removed") throw new Error("This team member no longer exists")
  if (target.id === actor.id) throw new Error("You cannot remove yourself")
  if (!canManageStaff(actor.role, target.role)) throw new Error(ERR_FORBIDDEN)
  if (target.role === ConsoleRole.OWNER && owners().length <= 1) throw new Error("The team must keep at least one platform owner")
  staffStore.update(PLATFORM_WS, id, { status: "removed", inviteExpiresAt: undefined })
  const now = new Date().toISOString()
  for (const s of sessionStore.list(PLATFORM_WS)) {
    if (s.staffId === id && !s.revokedAt) sessionStore.update(PLATFORM_WS, s.id, { revokedAt: now, revokedBy: actor.name })
  }
  audit(actor, "staff.removed", "staff", target.name, { before: target.role, after: "removed" })
}

export async function listSessionsApi(): Promise<StaffSession[]> {
  return [...sessionStore.list(PLATFORM_WS)].sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
}

export async function revokeSessionApi(actor: ConsoleActor, id: string): Promise<StaffSession> {
  const target = sessionStore.get(PLATFORM_WS, id)
  if (!target) throw new Error("This session no longer exists")
  if (target.staffId !== actor.id && !canRevokeSessions(actor.role)) throw new Error(ERR_FORBIDDEN)
  if (sessionState(target) !== "active") throw new Error("This session has already ended")
  const updated = sessionStore.update(PLATFORM_WS, id, { revokedAt: new Date().toISOString(), revokedBy: actor.name })
  const who = staffStore.get(PLATFORM_WS, target.staffId)?.name ?? "—"
  audit(actor, "session.revoked", "session", `${who} · ${target.device}`, { before: "active", after: "revoked" })
  return updated
}

export async function listAuditApi(): Promise<ConsoleAuditEvent[]> {
  return [...auditStore.list(PLATFORM_WS)].sort((a, b) => b.at.localeCompare(a.at))
}

/** AUD-03, AUD-07: owners only, and the export itself is recorded. */
export async function recordAuditExportApi(actor: ConsoleActor, rows: number): Promise<void> {
  if (!consoleCan(actor.role, ConsoleCapability.EXPORT_AUDIT)) throw new Error(ERR_FORBIDDEN)
  audit(actor, "audit.exported", "audit", `${rows} events`)
}
