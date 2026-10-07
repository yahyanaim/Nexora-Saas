import { createCollection } from "@/lib/workforce/demo-store"
import { consoleCan } from "@/lib/platform/console-roles"
import { MAINTENANCE_LEAD_HOURS, SERVICES, SERVICE_NAME, closeProblem, draftSeverity, isOpenIncident, leadHours, noticesFor, stateFrom } from "@/lib/platform/ops-rules"
import { ConsoleCapability as C } from "@/types/platform-console"
import type { BackupRun, Incident, IncidentSeverity, IncidentStatus, MaintenanceStatus, PlatformNotice, ServiceHealth, ServiceId, TenantErrorStat } from "@/types/platform-ops"
import { PLATFORM_WS, audit, type ConsoleActor } from "./platform-console-api"
import { customersCollection } from "./platform-customers-api"

/**
 * Platform health, incidents, planned maintenance and backups (cahier des
 * charges §5.10, Lot A5), on demo data. In production the tiles come from
 * monitoring; here an engineer can simulate an outage to see the flow.
 */

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()
const at = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString()
const stamp = () => {
  const now = new Date().toISOString()
  return { workspaceId: PLATFORM_WS, createdAt: now, updatedAt: now }
}

const MEASURES: Record<ServiceId, { errorRate: number; p95Ms: number; since: number }> = {
  api: { errorRate: 0.3, p95Ms: 210, since: 60 * 24 * 9 },
  database: { errorRate: 0.1, p95Ms: 35, since: 60 * 24 * 30 },
  jobs: { errorRate: 0.5, p95Ms: 480, since: 60 * 24 * 12 },
  storage: { errorRate: 0.2, p95Ms: 160, since: 60 * 24 * 21 },
  email: { errorRate: 3.1, p95Ms: 950, since: 40 },
  payments: { errorRate: 0.4, p95Ms: 620, since: 60 * 24 * 9 },
}

const seedHealth = (): ServiceHealth[] =>
  SERVICES.map((service) => {
    const m = MEASURES[service]
    return { ...stamp(), id: `svc_${service}`, service, state: stateFrom(m.errorRate, m.p95Ms), errorRate: m.errorRate, p95Ms: m.p95Ms, checkedAt: ago(1), since: ago(m.since) }
  })

const line = (id: string, minutes: number, by: string, text: string, status?: Incident["status"]) => ({ id, at: ago(minutes), by, text, status })

const seedIncidents = (): Incident[] => [
  {
    ...stamp(), id: "inc_6", number: "INC-0006", kind: "incident", title: "E-mail delivery is slow", severity: "sev3", status: "draft",
    services: ["email"], customerIds: [], startedAt: ago(40), source: "monitoring", createdBy: "Monitoring",
    timeline: [line("t61", 40, "Monitoring", "E-mail error rate above 2% for 10 minutes (3.1%). Draft opened automatically.", "draft")],
  },
  {
    ...stamp(), id: "inc_5", number: "INC-0005", kind: "incident", title: "Card payments time out", severity: "sev2", status: "resolved",
    services: ["payments"], customerIds: ["cus_atlas", "cus_marrakech"], startedAt: ago(60 * 24 * 9 + 47), resolvedAt: ago(60 * 24 * 9), source: "monitoring", createdBy: "Amine Lahlou",
    notice: "Card payments may fail for a few minutes. Nothing is charged twice; we retry automatically.", notifiedAt: ago(60 * 24 * 9 + 40),
    resolution: "The payment provider replaced a faulty gateway node; retries collected every failed payment.",
    postmortem: "Cause: one gateway node of the provider dropped connections. Detection took 6 minutes. Actions: alert after 3 minutes instead of 10, and a second provider route for retries (owner: Amine, due next month).",
    timeline: [
      line("t51", 60 * 24 * 9 + 47, "Monitoring", "Payment error rate 24%.", "investigating"),
      line("t52", 60 * 24 * 9 + 40, "Amine Lahlou", "The provider confirms a gateway problem. Affected customers informed.", "identified"),
      line("t53", 60 * 24 * 9 + 10, "Amine Lahlou", "Gateway replaced, error rate back to 0.4%.", "monitoring"),
      line("t54", 60 * 24 * 9, "Amine Lahlou", "Every failed payment was retried and collected.", "resolved"),
    ],
  },
  {
    ...stamp(), id: "inc_4", number: "INC-0004", kind: "incident", title: "PDF exports take more than 10 seconds", severity: "sev4", status: "resolved",
    services: ["jobs"], customerIds: ["cus_bina"], startedAt: ago(60 * 24 * 20 + 90), resolvedAt: ago(60 * 24 * 20), source: "manual", createdBy: "Liam O'Connor",
    resolution: "A report with 4,000 lines blocked the queue; large exports now run in their own queue.",
    timeline: [line("t41", 60 * 24 * 20 + 90, "Liam O'Connor", "Dar Al Bina reports slow PDF exports.", "investigating"), line("t42", 60 * 24 * 20, "Amine Lahlou", "Large exports moved to their own queue.", "resolved")],
  },
  {
    ...stamp(), id: "mnt_2", number: "MNT-0002", kind: "maintenance", title: "Database upgrade", severity: "sev3", status: "scheduled",
    services: ["database", "api"], customerIds: [], startedAt: at(60 * 24 * 5), plannedStart: at(60 * 24 * 5), plannedEnd: at(60 * 24 * 5 + 45), source: "manual", createdBy: "Amine Lahlou",
    notice: "Nexora will be read-only for up to 45 minutes during a planned database upgrade.", notifiedAt: ago(60 * 24),
    timeline: [line("t21", 60 * 24, "Amine Lahlou", "Maintenance planned and announced to every customer.", "scheduled")],
  },
  {
    ...stamp(), id: "mnt_1", number: "MNT-0001", kind: "maintenance", title: "File storage migration", severity: "sev4", status: "completed",
    services: ["storage"], customerIds: [], startedAt: ago(60 * 24 * 30), plannedStart: ago(60 * 24 * 30), plannedEnd: ago(60 * 24 * 30 - 60), resolvedAt: ago(60 * 24 * 30 - 50), source: "manual", createdBy: "Amine Lahlou",
    notice: "File uploads will pause for up to one hour.", notifiedAt: ago(60 * 24 * 33),
    timeline: [line("t11", 60 * 24 * 33, "Amine Lahlou", "Announced.", "scheduled"), line("t12", 60 * 24 * 30 - 50, "Amine Lahlou", "Migration finished in 50 minutes.", "completed")],
  },
]

const seedBackups = (): BackupRun[] => {
  const runs: BackupRun[] = []
  for (let d = 0; d < 7; d++) {
    runs.push({ ...stamp(), id: `bk_${d}`, kind: "backup", at: ago(60 * 24 * d + 60 * 3), result: d === 5 ? "failed" : "ok", sizeGb: 41.2 - d * 0.2, minutes: 18 + (d % 3), by: "Scheduler", ...(d === 5 ? { note: "Storage quota reached; retried at 04:10 and succeeded." } : {}) })
  }
  runs.push({ ...stamp(), id: "rt_2", kind: "restore_test", at: ago(60 * 24 * 12), result: "ok", sizeGb: 40.1, minutes: 52, by: "Amine Lahlou", note: "Restored to a test server; 25 checks passed." })
  runs.push({ ...stamp(), id: "rt_1", kind: "restore_test", at: ago(60 * 24 * 42), result: "ok", sizeGb: 38.7, minutes: 49, by: "Amine Lahlou", note: "Restored to a test server; 25 checks passed." })
  return runs
}

const health = createCollection<ServiceHealth>("platform-health", "svc", seedHealth)
const incidents = createCollection<Incident>("platform-incidents", "inc", seedIncidents)
const backups = createCollection<BackupRun>("platform-backups", "bk", seedBackups)

const ERR_FORBIDDEN = "Your console role does not allow this"
const need = (a: ConsoleActor) => {
  if (!consoleCan(a.role, C.INCIDENTS)) throw new Error(ERR_FORBIDDEN)
}
const getIncident = (id: string) => {
  const i = incidents.get(PLATFORM_WS, id)
  if (!i) throw new Error("This incident no longer exists")
  return i
}
const nextNumber = (prefix: "INC" | "MNT") =>
  `${prefix}-${String(incidents.list(PLATFORM_WS).filter((i) => i.number.startsWith(prefix)).reduce((m, i) => Math.max(m, Number(i.number.slice(4)) || 0), 0) + 1).padStart(4, "0")}`
const entry = (by: string, text: string, status?: Incident["status"]) => ({ id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), by, text, status })
const customersLabel = (ids: string[]) => (ids.length === 0 ? "all customers" : `${ids.length} customer(s)`)

/* ---------- reads ---------- */

export const listHealthApi = async () => SERVICES.map((s) => health.list(PLATFORM_WS).find((h) => h.service === s)!).filter(Boolean)
export const listIncidentsApi = async () => [...incidents.list(PLATFORM_WS)].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
export const listBackupsApi = async () => [...backups.list(PLATFORM_WS)].sort((a, b) => b.at.localeCompare(a.at))

/** INC-02: per tenant, by name and identifier only. */
const TRAFFIC: Record<string, [number, number, number]> = {
  cus_atlas: [48_200, 96, 240], cus_northwind: [9_800, 12, 310], cus_bina: [121_500, 305, 280], cus_marrakech: [22_300, 41, 260],
  cus_tanger: [30_100, 27, 230], cus_agadir: [1_900, 1, 190], cus_lyon: [3_400, 18, 650],
}
export async function listTenantErrorsApi(): Promise<TenantErrorStat[]> {
  return customersCollection.list(PLATFORM_WS)
    .filter((c) => c.status !== "cancelled" && c.status !== "deleted")
    .map((c) => {
      const [requests, errors, p95Ms] = TRAFFIC[c.id] ?? [500, 0, 220]
      return { customerId: c.id, customerName: c.name, requests, errors, p95Ms }
    })
    .sort((a, b) => b.errors / b.requests - a.errors / a.requests)
}

/** INC-04, INC-07: the notices shown inside a company's Nexora. */
export async function noticesForWorkspaceApi(workspaceId: string): Promise<PlatformNotice[]> {
  const c = customersCollection.list(PLATFORM_WS).find((x) => x.demoWorkspaceId === workspaceId)
  if (!c) return []
  return noticesFor(incidents.list(PLATFORM_WS), c.id)
}

/* ---------- health (INC-01, INC-05) ---------- */

/** Demo only: what monitoring would see. A failing service opens an incident draft (INC-05). */
export async function simulateOutageApi(actor: ConsoleActor, service: ServiceId, state: "degraded" | "down") {
  need(actor)
  const tile = health.list(PLATFORM_WS).find((h) => h.service === service)!
  const measures = state === "down" ? { errorRate: 64, p95Ms: 8_000 } : { errorRate: 4.5, p95Ms: 1_900 }
  health.update(PLATFORM_WS, tile.id, { state, ...measures, checkedAt: new Date().toISOString(), since: new Date().toISOString() })
  audit(actor, "health.outage_simulated", "health", `${SERVICE_NAME[service]} · ${state}`, { before: tile.state, after: state })
  const open = incidents.list(PLATFORM_WS).find((i) => isOpenIncident(i) && i.services.includes(service))
  if (open) {
    return incidents.update(PLATFORM_WS, open.id, { timeline: [...open.timeline, entry("Monitoring", `${SERVICE_NAME[service]}: ${state}, error rate ${measures.errorRate}%.`)] })
  }
  return incidents.create(PLATFORM_WS, {
    number: nextNumber("INC"), kind: "incident", title: `${SERVICE_NAME[service]} ${state === "down" ? "unavailable" : "degraded"}`, severity: draftSeverity(service, state),
    status: "draft", services: [service], customerIds: [], startedAt: new Date().toISOString(), source: "monitoring", createdBy: "Monitoring",
    timeline: [entry("Monitoring", `Health check failed: error rate ${measures.errorRate}%, response time ${measures.p95Ms} ms. Draft opened automatically.`, "draft")],
  })
}

export async function restoreServiceApi(actor: ConsoleActor, service: ServiceId) {
  need(actor)
  const tile = health.list(PLATFORM_WS).find((h) => h.service === service)!
  const m = MEASURES[service]
  const errorRate = service === "email" ? 0.6 : m.errorRate
  const updated = health.update(PLATFORM_WS, tile.id, { state: stateFrom(errorRate, Math.min(m.p95Ms, 900)), errorRate, p95Ms: Math.min(m.p95Ms, 900), checkedAt: new Date().toISOString(), since: new Date().toISOString() })
  audit(actor, "health.service_restored", "health", SERVICE_NAME[service], { before: tile.state, after: updated.state })
  const open = incidents.list(PLATFORM_WS).find((i) => isOpenIncident(i) && i.services.includes(service))
  if (open) incidents.update(PLATFORM_WS, open.id, { timeline: [...open.timeline, entry("Monitoring", `${SERVICE_NAME[service]} back to normal.`)] })
  return updated
}

/* ---------- incidents (INC-03, INC-04) ---------- */

export async function createIncidentApi(actor: ConsoleActor, input: { title: string; severity: IncidentSeverity; services: ServiceId[]; customerIds: string[]; text: string }) {
  need(actor)
  if (input.title.trim().length < 5) throw new Error("Give the incident a title")
  if (input.services.length === 0) throw new Error("Choose at least one affected service")
  const created = incidents.create(PLATFORM_WS, {
    number: nextNumber("INC"), kind: "incident", title: input.title.trim(), severity: input.severity, status: "investigating", services: input.services,
    customerIds: input.customerIds, startedAt: new Date().toISOString(), source: "manual", createdBy: actor.name,
    timeline: [entry(actor.name, input.text.trim() || "Incident opened.", "investigating")],
  })
  audit(actor, "incident.created", "incident", `${created.number} · ${created.title}`, { after: `${input.severity} · ${input.services.join(", ")} · ${customersLabel(input.customerIds)}` })
  return created
}

/** A timeline update, optionally moving the status forward; confirming a draft starts the investigation. */
export async function updateIncidentApi(actor: ConsoleActor, id: string, input: { text: string; status?: IncidentStatus; severity?: IncidentSeverity; customerIds?: string[] }) {
  need(actor)
  const i = getIncident(id)
  if (i.kind !== "incident" || i.status === "resolved") throw new Error("This incident is already resolved")
  if (input.status === "resolved") throw new Error("Resolve the incident with its resolution")
  if (!input.text.trim()) throw new Error("Write the update first")
  const status = input.status ?? (i.status === "draft" ? "investigating" : i.status)
  const updated = incidents.update(PLATFORM_WS, id, {
    status, severity: input.severity ?? i.severity, customerIds: input.customerIds ?? i.customerIds,
    timeline: [...i.timeline, entry(actor.name, input.text.trim(), status)],
  })
  audit(actor, "incident.updated", "incident", `${i.number} · ${i.title}`, { before: i.status, after: status })
  return updated
}

/** INC-04: the notice affected customers read; shown in their Nexora until resolution. */
export async function notifyIncidentApi(actor: ConsoleActor, id: string, notice: string) {
  need(actor)
  const i = getIncident(id)
  if (i.kind !== "incident" || i.status === "resolved") throw new Error("This incident is already resolved")
  if (notice.trim().length < 10) throw new Error("Write the message customers will read")
  const status = i.status === "draft" ? "investigating" : i.status
  const updated = incidents.update(PLATFORM_WS, id, {
    notice: notice.trim(), notifiedAt: new Date().toISOString(), status,
    timeline: [...i.timeline, entry(actor.name, `Customers informed (${customersLabel(i.customerIds)}).`, status)],
  })
  audit(actor, "incident.notified", "incident", `${i.number} · ${i.title}`, { after: `${customersLabel(i.customerIds)} · ${notice.trim()}` })
  return updated
}

/** INC-03: closing needs a resolution, and a post-mortem for severities 1 and 2. */
export async function resolveIncidentApi(actor: ConsoleActor, id: string, input: { resolution: string; postmortem?: string }) {
  need(actor)
  const i = getIncident(id)
  if (i.kind !== "incident" || i.status === "resolved") throw new Error("This incident is already resolved")
  const problem = closeProblem(i, input)
  if (problem === "resolution") throw new Error("Describe how the incident was resolved")
  if (problem === "postmortem") throw new Error("A severity 1 or 2 incident needs a post-mortem")
  const updated = incidents.update(PLATFORM_WS, id, {
    status: "resolved", resolvedAt: new Date().toISOString(), resolution: input.resolution.trim(), postmortem: input.postmortem?.trim() || undefined,
    timeline: [...i.timeline, entry(actor.name, input.resolution.trim(), "resolved")],
  })
  audit(actor, "incident.resolved", "incident", `${i.number} · ${i.title}`, { before: i.status, after: "resolved" })
  return updated
}

/* ---------- maintenance (INC-07) ---------- */

export async function scheduleMaintenanceApi(actor: ConsoleActor, input: { title: string; services: ServiceId[]; customerIds: string[]; plannedStart: string; plannedEnd: string; notice: string }) {
  need(actor)
  if (input.title.trim().length < 5) throw new Error("Give the maintenance a title")
  if (input.services.length === 0) throw new Error("Choose at least one affected service")
  if (leadHours(input.plannedStart) < MAINTENANCE_LEAD_HOURS) throw new Error("A maintenance is announced at least 48 hours ahead")
  if (!(new Date(input.plannedEnd).getTime() > new Date(input.plannedStart).getTime())) throw new Error("The end must be after the start")
  if (input.notice.trim().length < 10) throw new Error("Write the message customers will read")
  const created = incidents.create(PLATFORM_WS, {
    number: nextNumber("MNT"), kind: "maintenance", title: input.title.trim(), severity: "sev3", status: "scheduled", services: input.services, customerIds: input.customerIds,
    startedAt: input.plannedStart, plannedStart: input.plannedStart, plannedEnd: input.plannedEnd, notice: input.notice.trim(), notifiedAt: new Date().toISOString(),
    source: "manual", createdBy: actor.name, timeline: [entry(actor.name, `Planned and announced to ${customersLabel(input.customerIds)}.`, "scheduled")],
  })
  audit(actor, "maintenance.scheduled", "incident", `${created.number} · ${created.title}`, { after: `${input.plannedStart} → ${input.plannedEnd} · ${customersLabel(input.customerIds)}` })
  return created
}

export async function updateMaintenanceApi(actor: ConsoleActor, id: string, status: Exclude<MaintenanceStatus, "scheduled">, text: string) {
  need(actor)
  const i = getIncident(id)
  if (i.kind !== "maintenance" || i.status === "completed" || i.status === "cancelled") throw new Error("This maintenance is already finished")
  const updated = incidents.update(PLATFORM_WS, id, {
    status, ...(status === "completed" || status === "cancelled" ? { resolvedAt: new Date().toISOString() } : {}),
    timeline: [...i.timeline, entry(actor.name, text.trim() || status, status)],
  })
  audit(actor, "maintenance.updated", "incident", `${i.number} · ${i.title}`, { before: i.status, after: status })
  return updated
}

/* ---------- backups (INC-06) ---------- */

export async function runRestoreTestApi(actor: ConsoleActor) {
  need(actor)
  const last = (await listBackupsApi()).find((b) => b.kind === "backup" && b.result === "ok")
  const created = backups.create(PLATFORM_WS, { kind: "restore_test", at: new Date().toISOString(), result: "ok", sizeGb: last?.sizeGb ?? 40, minutes: 51, by: actor.name, note: "Restored to a test server; 25 checks passed." })
  audit(actor, "backup.restore_tested", "backup", `Restore test · ${created.sizeGb.toFixed(1)} GB`, { after: "ok" })
  return created
}
