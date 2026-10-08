import { createCollection, resetWorkspaceData } from "@/lib/workforce/demo-store"
import { FEATURE_FLAGS, announcementFor, flagOn, validIce, validRib, type FeatureFlagKey } from "@/lib/platform/config-rules"
import type { NexoraPlanId } from "@/lib/platform/nexora-catalog"
import { ConsoleRole } from "@/types/platform-console"
import type { Announcement, FeatureFlag, NexoraIdentity, SellerSnapshot } from "@/types/platform-config"
import { PLATFORM_WS, audit, type ConsoleActor } from "./platform-console-api"
import { customersCollection } from "./platform-customers-api"

/**
 * Console configuration (cahier des charges §5.13, Lot A5): Nexora's identity
 * on its invoices, announcements, feature flags and demo resets. Every change
 * is in the console audit trail (CFG-06).
 */

const stamp = () => {
  const now = new Date().toISOString()
  return { workspaceId: PLATFORM_WS, createdAt: now, updatedAt: now }
}
const isoToday = () => new Date().toISOString().slice(0, 10)
const plusDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)

const seedIdentity = (): NexoraIdentity[] => [{
  ...stamp(), id: "identity", legalName: "Nexora Technologies SARL AU", address: "Casablanca Finance City, Tour CFC, 14e étage", city: "Casablanca", country: "Maroc",
  ice: "002847192000084", taxId: "40182934", rc: "Casablanca 148291", patente: "34192084", cnss: "8912345", email: "billing@nexora.io", phone: "+212 522 00 00 00",
  bankName: "Attijariwafa bank", rib: "007780000123456789012345", swift: "BCMAMAMC", updatedBy: "Sophia Vance",
}]

const seedAnnouncements = (): Announcement[] => [
  {
    ...stamp(), id: "ann_1", title: "New: bank statement import", message: "Import your bank's CSV statement in Finance → Bank import and Nexora matches it to your open invoices.",
    plans: ["business", "enterprise"], countries: ["MA"], from: plusDays(-3), to: plusDays(11), createdBy: "Yassine Amrani",
  },
  {
    ...stamp(), id: "ann_0", title: "Webinar: closing the year in Nexora", message: "Join us on 15 January for a 45-minute walkthrough of the year-end close.",
    plans: [], countries: [], from: "2026-01-05", to: "2026-01-15", createdBy: "Liam O'Connor",
  },
]

const seedFlags = (): FeatureFlag[] => [
  { ...stamp(), id: "ff_victor_assistant", key: "victor_assistant", enabled: true, plans: ["business", "enterprise"], customerIds: [], updatedBy: "Amine Lahlou" },
]

const identity = createCollection<NexoraIdentity>("platform-identity", "id", seedIdentity)
const announcements = createCollection<Announcement>("platform-announcements", "ann", seedAnnouncements)
const flags = createCollection<FeatureFlag>("platform-flags", "ff", seedFlags)

const ERR_FORBIDDEN = "Your console role does not allow this"
const needOwner = (a: ConsoleActor) => {
  if (a.role !== ConsoleRole.OWNER) throw new Error(ERR_FORBIDDEN)
}
const needAdmin = (a: ConsoleActor) => {
  if (a.role !== ConsoleRole.OWNER && a.role !== ConsoleRole.ADMIN) throw new Error(ERR_FORBIDDEN)
}
const customerOf = (workspaceId: string) => customersCollection.list(PLATFORM_WS).find((c) => c.demoWorkspaceId === workspaceId) ?? null

/* ---------- identity (CFG-04) ---------- */

export const getIdentityApi = async () => identity.list(PLATFORM_WS)[0]!

/** What a new invoice prints about Nexora; issued invoices keep their own copy. */
export function sellerSnapshot(): SellerSnapshot {
  const i = identity.list(PLATFORM_WS)[0]!
  return { legalName: i.legalName, address: i.address, city: i.city, country: i.country, ice: i.ice, taxId: i.taxId, rc: i.rc, patente: i.patente ?? "", cnss: i.cnss ?? "", email: i.email, phone: i.phone, bankName: i.bankName, rib: i.rib, swift: i.swift }
}

export type IdentityInput = Omit<NexoraIdentity, "id" | "workspaceId" | "createdAt" | "updatedAt" | "updatedBy">

export async function updateIdentityApi(actor: ConsoleActor, input: IdentityInput) {
  needOwner(actor)
  if (!input.legalName.trim() || !input.address.trim()) throw new Error("Enter the legal name and the address")
  if (!validIce(input.ice)) throw new Error("The ICE has 15 digits")
  if (!validRib(input.rib)) throw new Error("The RIB has 24 digits")
  const before = identity.list(PLATFORM_WS)[0]!
  const clean = { ...input, rib: input.rib.replace(/\s/g, ""), ice: input.ice.trim() }
  const changed = (Object.keys(clean) as (keyof IdentityInput)[]).filter((k) => String(clean[k] ?? "") !== String(before[k] ?? ""))
  if (changed.length === 0) return before
  const updated = identity.update(PLATFORM_WS, before.id, { ...clean, updatedBy: actor.name })
  audit(actor, "config.identity_changed", "config", "Nexora identity", { before: changed.map((k) => `${k}: ${before[k]}`).join(" · "), after: changed.map((k) => `${k}: ${clean[k]}`).join(" · ") })
  return updated
}

/* ---------- announcements (CFG-01) ---------- */

export const listAnnouncementsApi = async () => [...announcements.list(PLATFORM_WS)].sort((a, b) => b.from.localeCompare(a.from))

export async function createAnnouncementApi(actor: ConsoleActor, input: { title: string; message: string; plans: NexoraPlanId[]; countries: string[]; from: string; to: string }) {
  needAdmin(actor)
  if (input.title.trim().length < 3 || input.message.trim().length < 10) throw new Error("Write a title and a message")
  if (!input.from || !input.to || input.to < input.from) throw new Error("The end must be after the start")
  const created = announcements.create(PLATFORM_WS, { ...input, title: input.title.trim(), message: input.message.trim(), createdBy: actor.name })
  const segment = [input.plans.length ? input.plans.join("/") : "all plans", input.countries.length ? input.countries.join("/") : "all countries"].join(" · ")
  audit(actor, "config.announcement_created", "config", created.title, { after: `${segment} · ${input.from} → ${input.to}` })
  return created
}

export async function endAnnouncementApi(actor: ConsoleActor, id: string) {
  needAdmin(actor)
  const a = announcements.get(PLATFORM_WS, id)
  if (!a || a.endedAt) throw new Error("This announcement is already over")
  const updated = announcements.update(PLATFORM_WS, id, { endedAt: new Date().toISOString() })
  audit(actor, "config.announcement_ended", "config", a.title)
  return updated
}

/** The announcements a company sees today (CFG-01). */
export function announcementsForWorkspace(workspaceId: string, today = isoToday()) {
  const c = customerOf(workspaceId)
  if (!c) return []
  return announcements.list(PLATFORM_WS).filter((a) => announcementFor(a, c, today))
}

/* ---------- feature flags (CFG-02) ---------- */

export async function listFlagsApi(): Promise<FeatureFlag[]> {
  const stored = flags.list(PLATFORM_WS)
  return FEATURE_FLAGS.map((f) => stored.find((s) => s.key === f.key) ?? { ...stamp(), id: `ff_${f.key}`, key: f.key, enabled: false, plans: [], customerIds: [], updatedBy: "—" })
}

export async function updateFlagApi(actor: ConsoleActor, key: FeatureFlagKey, input: { enabled: boolean; plans: NexoraPlanId[]; customerIds: string[] }) {
  needAdmin(actor)
  if (!FEATURE_FLAGS.some((f) => f.key === key)) throw new Error("This feature flag does not exist")
  const current = flags.list(PLATFORM_WS).find((f) => f.key === key)
  const describe = (f: Pick<FeatureFlag, "enabled" | "plans" | "customerIds"> | undefined) =>
    !f || !f.enabled ? "off" : f.plans.length === 0 && f.customerIds.length === 0 ? "everyone" : [...f.plans, ...f.customerIds].join(", ")
  const updated = current
    ? flags.update(PLATFORM_WS, current.id, { ...input, updatedBy: actor.name })
    : flags.create(PLATFORM_WS, { key, ...input, updatedBy: actor.name })
  audit(actor, "config.flag_changed", "config", key, { before: describe(current), after: describe(updated) })
  return updated
}

/** Whether a feature is on for the company whose workspace this is. */
export async function flagOnForWorkspaceApi(key: FeatureFlagKey, workspaceId: string) {
  const flag = flags.list(PLATFORM_WS).find((f) => f.key === key)
  const c = customerOf(workspaceId)
  return flagOn(flag, c ? { id: c.id, plan: c.plan } : null)
}

/* ---------- demo workspaces (CFG-05) ---------- */

export async function resetDemoWorkspaceApi(actor: ConsoleActor, customerId: string) {
  needAdmin(actor)
  const c = customersCollection.get(PLATFORM_WS, customerId)
  if (!c?.demoWorkspaceId) throw new Error("This customer has no demo workspace")
  const cleared = resetWorkspaceData(c.demoWorkspaceId)
  audit(actor, "config.demo_reset", "config", `${c.name} · ${c.demoWorkspaceId}`, { after: `${cleared} lists reset`, customerId: c.id })
  return cleared
}
