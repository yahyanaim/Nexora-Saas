import { createCollection } from "@/lib/workforce/demo-store"
import { consoleCan } from "@/lib/platform/console-roles"
import { NEXORA_CUSTOMERS, type NexoraPlanId } from "@/lib/platform/nexora-catalog"
import { consoleUsers } from "@/lib/platform/console-data"
import { TRIAL_DAYS, TRIAL_EXTENSION_DAYS, addDaysIso, canTransition, isoDay, periodEnd } from "@/lib/platform/customer-lifecycle"
import { ConsoleCapability as C, ConsoleRole } from "@/types/platform-console"
import type { CustomerAccount, LifecycleStatus, UserSuspension } from "@/types/platform-customers"
import { PLATFORM_WS, audit, type ConsoleActor } from "./platform-console-api"

/**
 * Customers and their lifecycle (cahier des charges §5.1, §5.7, Lot A2), on
 * demo data kept under the platform key. The server applies the same rules.
 */

const seedCustomers = (ws: string): CustomerAccount[] => {
  const now = new Date().toISOString()
  return NEXORA_CUSTOMERS.map((c) => ({
    id: c.id, workspaceId: ws, demoWorkspaceId: c.workspaceId, name: c.name, city: c.city, country: c.country, ice: c.ice,
    plan: c.plan, billing: c.billing, seatsUsed: c.seatsUsed, since: c.since, trialEndsOn: c.trialEndsOn, admin: c.admin,
    status: (c.status === "past_due" ? "payment_overdue" : c.status) as LifecycleStatus,
    readOnly: c.status === "cancelled",
    notes: c.id === "cus_marrakech"
      ? [{ id: "note_1", text: "Card declined twice; the finance manager asked to switch to bank transfer next month.", author: "Nadia Berrada", at: new Date(Date.now() - 2 * 86_400_000).toISOString() }]
      : [],
    createdAt: now, updatedAt: now,
  }))
}

const seedUserSuspensions = (ws: string): UserSuspension[] => {
  const now = new Date().toISOString()
  return [{
    id: "usp_1", workspaceId: ws, userId: "usr-cus_fes-1", name: "Ali Raji", email: "spam.bot@mailinator.com", customerId: "cus_fes", company: "Fès Audit & Associés",
    reason: "Automated sign-ups from a disposable address", by: "Liam O'Connor", at: new Date(Date.now() - 20 * 86_400_000).toISOString(), createdAt: now, updatedAt: now,
  }]
}

const customerStore = createCollection<CustomerAccount>("platform-customers", "cus", seedCustomers)
const userSuspensionStore = createCollection<UserSuspension>("platform-user-suspensions", "usp", seedUserSuspensions)
/** Shared with the billing service, which moves customers through payment overdue and back. */
export const customersCollection = customerStore

const ERR_FORBIDDEN = "Your console role does not allow this"
const ERR_TRANSITION = "This status change is not allowed"
const need = (actor: ConsoleActor, cap: C) => {
  if (!consoleCan(actor.role, cap)) throw new Error(ERR_FORBIDDEN)
}
const get = (id: string) => {
  const c = customerStore.get(PLATFORM_WS, id)
  if (!c || c.status === "deleted") throw new Error("This customer no longer exists")
  return c
}
const move = (c: CustomerAccount, to: LifecycleStatus) => {
  if (!canTransition(c.status, to)) throw new Error(ERR_TRANSITION)
}

export async function listCustomersApi(): Promise<CustomerAccount[]> {
  return customerStore.list(PLATFORM_WS).filter((c) => c.status !== "deleted")
}

export async function getCustomerApi(id: string): Promise<CustomerAccount | null> {
  return customerStore.get(PLATFORM_WS, id) ?? null
}

/** CUS-05: a 14-day trial for a new company; its administrator gets an invitation. */
export async function createTrialApi(actor: ConsoleActor, input: { name: string; city: string; country: string; ice?: string; plan: NexoraPlanId; adminName: string; adminEmail: string }): Promise<CustomerAccount> {
  need(actor, C.CREATE_TRIAL)
  const email = input.adminEmail.trim().toLowerCase()
  if (!input.name.trim() || !input.adminName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter the company, the administrator and a valid e-mail")
  if (input.ice && !/^\d{15}$/.test(input.ice.trim())) throw new Error("The ICE has 15 digits")
  const all = customerStore.list(PLATFORM_WS)
  if (all.some((c) => c.status !== "deleted" && (c.name.toLowerCase() === input.name.trim().toLowerCase() || c.admin.email.toLowerCase() === email))) {
    throw new Error("This company or administrator is already a customer")
  }
  const today = isoDay(new Date())
  const created = customerStore.create(PLATFORM_WS, {
    name: input.name.trim(), city: input.city.trim(), country: input.country, ice: input.ice?.trim() || undefined, plan: input.plan, billing: "monthly",
    seatsUsed: 1, status: "trial", readOnly: false, since: today, trialEndsOn: addDaysIso(today, TRIAL_DAYS),
    admin: { name: input.adminName.trim(), email }, notes: [],
  })
  audit(actor, "customer.trial_created", "customer", created.name, { after: `trial · ${TRIAL_DAYS} days`, customerId: created.id })
  return created
}

/** D-02: once, by 7 days. */
export async function extendTrialApi(actor: ConsoleActor, id: string): Promise<CustomerAccount> {
  need(actor, C.CREATE_TRIAL)
  const c = get(id)
  if (c.status !== "trial" || !c.trialEndsOn) throw new Error("Only a trial can be extended")
  if (c.trialExtended) throw new Error("This trial was already extended once")
  const updated = customerStore.update(PLATFORM_WS, id, { trialEndsOn: addDaysIso(c.trialEndsOn, TRIAL_EXTENSION_DAYS), trialExtended: true })
  audit(actor, "customer.trial_extended", "customer", c.name, { before: c.trialEndsOn, after: updated.trialEndsOn, customerId: id })
  return updated
}

/** A plan chosen during the trial, or a payment received: the customer becomes active. */
export async function activateCustomerApi(actor: ConsoleActor, id: string): Promise<CustomerAccount> {
  need(actor, C.CHANGE_STATUS)
  const c = get(id)
  move(c, "active")
  if (c.status === "suspended") throw new Error("Lift the suspension instead")
  const updated = customerStore.update(PLATFORM_WS, id, { status: "active", readOnly: false, trialEndsOn: undefined, cancelsOn: undefined, since: c.status === "trial" ? isoDay(new Date()) : c.since })
  audit(actor, c.status === "cancelled" ? "customer.reactivated" : "customer.status_changed", "customer", c.name, { before: c.status, after: "active", customerId: id })
  return updated
}

/** CUS-08: needs a reason; the workspace becomes read-only and the administrator is told. */
export async function suspendCustomerApi(actor: ConsoleActor, id: string, input: { reason: string; until?: string }): Promise<CustomerAccount> {
  need(actor, C.SUSPEND)
  const c = get(id)
  move(c, "suspended")
  if (input.reason.trim().length < 5) throw new Error("Give the reason for the suspension")
  if (input.until && input.until <= isoDay(new Date())) throw new Error("The end date must be in the future")
  const updated = customerStore.update(PLATFORM_WS, id, {
    status: "suspended", readOnly: true,
    suspension: { reason: input.reason.trim(), until: input.until || undefined, previous: c.status, by: actor.name, at: new Date().toISOString() },
  })
  audit(actor, "customer.suspended", "customer", c.name, { before: c.status, after: `suspended · ${input.reason.trim()}`, customerId: id })
  return updated
}

export async function liftCustomerSuspensionApi(actor: ConsoleActor, id: string): Promise<CustomerAccount> {
  need(actor, C.SUSPEND)
  const c = get(id)
  if (c.status !== "suspended" || !c.suspension) throw new Error("This customer is not suspended")
  const back = c.suspension.previous
  const updated = customerStore.update(PLATFORM_WS, id, { status: back, readOnly: false, suspension: undefined })
  audit(actor, "customer.suspension_lifted", "customer", c.name, { before: "suspended", after: back, customerId: id })
  return updated
}

/** CUS-09: access continues until the end of the paid period. */
export async function cancelCustomerApi(actor: ConsoleActor, id: string): Promise<CustomerAccount> {
  need(actor, C.CHANGE_STATUS)
  const c = get(id)
  move(c, "cancelled")
  if (c.status === "trial" || c.status === "suspended") {
    const updated = customerStore.update(PLATFORM_WS, id, { status: "cancelled", readOnly: true, suspension: undefined })
    audit(actor, "customer.cancelled", "customer", c.name, { before: c.status, after: "cancelled", customerId: id })
    return updated
  }
  if (c.cancelsOn) throw new Error("A cancellation is already planned")
  const updated = customerStore.update(PLATFORM_WS, id, { cancelsOn: periodEnd(c) })
  audit(actor, "customer.cancelled", "customer", c.name, { before: c.status, after: `cancelled on ${updated.cancelsOn}`, customerId: id })
  return updated
}

export async function undoCancellationApi(actor: ConsoleActor, id: string): Promise<CustomerAccount> {
  need(actor, C.CHANGE_STATUS)
  const c = get(id)
  if (!c.cancelsOn) throw new Error("No cancellation is planned")
  const updated = customerStore.update(PLATFORM_WS, id, { cancelsOn: undefined })
  audit(actor, "customer.cancellation_undone", "customer", c.name, { before: `cancelled on ${c.cancelsOn}`, after: c.status, customerId: id })
  return updated
}

/** CUS-10: visible to the Nexora team only. */
export async function addCustomerNoteApi(actor: ConsoleActor, id: string, text: string): Promise<CustomerAccount> {
  if (actor.role === ConsoleRole.READ_ONLY) throw new Error(ERR_FORBIDDEN)
  const c = get(id)
  if (!text.trim()) throw new Error("Write the note first")
  const note = { id: `note_${Date.now()}`, text: text.trim(), author: actor.name, at: new Date().toISOString() }
  const updated = customerStore.update(PLATFORM_WS, id, { notes: [note, ...c.notes] })
  audit(actor, "customer.note_added", "customer", c.name, { customerId: id })
  return updated
}

/* ---------- Platform user directory (§5.7) ---------- */

export interface DirectoryUser {
  id: string
  name: string
  email: string
  customerId: string
  company: string
  /** Role in the company */
  companyRole: "owner" | "member"
  status: "active" | "suspended" | "inactive"
  twoFactor: boolean
  lastSignInAt?: string
  suspension?: UserSuspension
}

/** USR-01: account fields only, never business data. */
export async function listDirectoryApi(): Promise<DirectoryUser[]> {
  const customers = customerStore.list(PLATFORM_WS)
  const suspensions = userSuspensionStore.list(PLATFORM_WS).filter((s) => !s.liftedAt)
  return consoleUsers()
    .filter((u) => u.orgId && u.orgId !== "nexora")
    .map((u, i) => {
      const customer = customers.find((c) => c.id === u.orgId)
      const suspension = suspensions.find((s) => s.userId === u.id)
      const companyGone = !customer || customer.status === "cancelled" || customer.status === "deleted"
      return {
        id: u.id, name: u.name, email: u.email ?? "", customerId: u.orgId!, company: customer?.name ?? String(u.adminTag ?? ""),
        companyRole: u.teamRole === "owner" ? "owner" : "member",
        status: suspension ? "suspended" : companyGone ? "inactive" : "active",
        twoFactor: i % 3 !== 2, lastSignInAt: u.lastSeen, suspension,
      } satisfies DirectoryUser
    })
}

const canHelpUsers = (role: ConsoleRole) => role === ConsoleRole.OWNER || role === ConsoleRole.ADMIN || role === ConsoleRole.SUPPORT

/** USR-03: an e-mail with a reset link; nobody in the console sees or sets a password. */
export async function sendPasswordResetApi(actor: ConsoleActor, user: Pick<DirectoryUser, "id" | "name" | "email" | "customerId">): Promise<void> {
  if (!canHelpUsers(actor.role)) throw new Error(ERR_FORBIDDEN)
  audit(actor, "user.password_reset", "user", `${user.name} · ${user.email}`, { customerId: user.customerId })
}

/** USR-04, USR-05: reason required; a company never loses its only administrator. */
export async function suspendUserApi(actor: ConsoleActor, user: DirectoryUser, input: { reason: string; until?: string }): Promise<UserSuspension> {
  need(actor, C.SUSPEND)
  if (user.status === "suspended") throw new Error("This person is already suspended")
  if (input.reason.trim().length < 5) throw new Error("Give the reason for the suspension")
  if (input.until && input.until <= isoDay(new Date())) throw new Error("The end date must be in the future")
  if (user.companyRole === "owner") {
    const customer = customerStore.get(PLATFORM_WS, user.customerId)
    const otherAdmins = (await listDirectoryApi()).filter((u) => u.customerId === user.customerId && u.companyRole === "owner" && u.id !== user.id && u.status === "active")
    if (customer?.status !== "suspended" && otherAdmins.length === 0) throw new Error("The company would have no administrator; suspend the company instead")
  }
  const created = userSuspensionStore.create(PLATFORM_WS, {
    userId: user.id, name: user.name, email: user.email, customerId: user.customerId, company: user.company,
    reason: input.reason.trim(), until: input.until || undefined, by: actor.name, at: new Date().toISOString(),
  })
  audit(actor, "user.suspended", "user", `${user.name} · ${user.company}`, { after: input.reason.trim(), customerId: user.customerId })
  return created
}

export async function liftUserSuspensionApi(actor: ConsoleActor, suspensionId: string): Promise<void> {
  need(actor, C.SUSPEND)
  const s = userSuspensionStore.get(PLATFORM_WS, suspensionId)
  if (!s || s.liftedAt) throw new Error("This suspension has already been lifted")
  userSuspensionStore.update(PLATFORM_WS, suspensionId, { liftedAt: new Date().toISOString(), liftedBy: actor.name })
  audit(actor, "user.suspension_lifted", "user", `${s.name} · ${s.company}`, { before: "suspended", after: "active", customerId: s.customerId })
}

export async function listUserSuspensionsApi(): Promise<UserSuspension[]> {
  return userSuspensionStore.list(PLATFORM_WS).filter((s) => !s.liftedAt)
}
