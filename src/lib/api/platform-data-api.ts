import { createCollection, deleteWorkspaceData, exportWorkspaceData } from "@/lib/workforce/demo-store"
import { consoleCan } from "@/lib/platform/console-roles"
import { addDaysIso, isoDay } from "@/lib/platform/customer-lifecycle"
import { recordAudit } from "@/lib/workforce/audit"
import { ConsoleCapability as C, ConsoleRole } from "@/types/platform-console"
import type { ConsoleAuditEvent } from "@/types/platform-console"
import type { DataRequest, RetentionPolicy } from "@/types/platform-data"
import { PLATFORM_WS, audit, auditCustomer, type ConsoleActor } from "./platform-console-api"
import { customersCollection } from "./platform-customers-api"
import { listCreditNotesApi, listInvoicesApi, listPaymentsApi } from "./platform-billing-api"
import { loadTenantModules } from "./tenant-modules"

/**
 * Customer data requests (AUD-04, AUD-05) and retention (AUD-06), on demo
 * data. An export is delivered within 7 days with every record of the
 * company's workspace; a deletion is prepared by one team member and approved
 * by a platform owner with the authenticator code, and leaves only the
 * invoices the law requires Nexora to keep.
 */

const EXPORT_DAYS = 7
const DELETION_DAYS = 30
const ERR_FORBIDDEN = "Your console role does not allow this"
const now = () => new Date().toISOString()
const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()
type Person = { name: string; email: string }

const seedRequests = (): DataRequest[] => {
  const base = { workspaceId: PLATFORM_WS, createdAt: now(), updatedAt: now() }
  return [
    {
      ...base, id: "dr_northwind_export", number: "DR-2026-0003", kind: "export", customerId: "cus_northwind", customerName: "Northwind Studio",
      requestedBy: { name: "Sarah Chen", email: "sarah.chen@techcorp.com" }, receivedAt: ago(2), dueOn: addDaysIso(isoDay(new Date(ago(2))), EXPORT_DAYS), status: "received",
      history: [{ at: ago(2), by: "Sarah Chen", text: "Export of the company's data asked from My subscription" }],
    },
    {
      ...base, id: "dr_fes_deletion", number: "DR-2026-0002", kind: "deletion", customerId: "cus_fes", customerName: "Fès Audit & Associés",
      requestedBy: { name: "Driss Kettani", email: "d.kettani@fesaudit.ma" }, receivedAt: ago(6), dueOn: addDaysIso(isoDay(new Date(ago(6))), DELETION_DAYS), status: "prepared",
      reason: "We closed the firm's account in August", preparedBy: "Nadia Berrada",
      history: [
        { at: ago(6), by: "Driss Kettani", text: "Deletion of the account asked by e-mail" },
        { at: ago(1), by: "Nadia Berrada", text: "Prepared: subscription cancelled on 2026-08-15, nothing owed" },
      ],
    },
    {
      ...base, id: "dr_tanger_export", number: "DR-2026-0001", kind: "export", customerId: "cus_tanger", customerName: "Tanger Logistics Conseil",
      requestedBy: { name: "Karim Benali", email: "k.benali@tlc.ma" }, receivedAt: ago(40), dueOn: addDaysIso(isoDay(new Date(ago(40))), EXPORT_DAYS), status: "fulfilled",
      records: 1_284, availableUntil: isoDay(new Date(ago(31))), downloads: 1,
      history: [
        { at: ago(40), by: "Karim Benali", text: "Export of the company's data asked from My subscription" },
        { at: ago(38), by: "Sophia Vance", text: "Export ready: 1,284 records" },
        { at: ago(37), by: "Karim Benali", text: "Export downloaded" },
      ],
    },
  ]
}
const seedRetention = (): RetentionPolicy[] => [{ id: "retention", workspaceId: PLATFORM_WS, auditYears: 5, invoiceYears: 10, exportDays: EXPORT_DAYS, createdAt: now(), updatedAt: now() }]

const requests = createCollection<DataRequest>("platform-data-requests", "dr", seedRequests)
const retention = createCollection<RetentionPolicy>("platform-retention", "ret", seedRetention)

const nextNumber = () => {
  const year = new Date().getFullYear()
  const last = requests.list(PLATFORM_WS).map((r) => r.number).filter((n) => n.startsWith(`DR-${year}-`)).map((n) => Number(n.slice(-4))).sort((a, b) => b - a)[0] ?? 0
  return `DR-${year}-${String(last + 1).padStart(4, "0")}`
}
const get = (id: string) => {
  const r = requests.get(PLATFORM_WS, id)
  if (!r) throw new Error("This request no longer exists")
  return r
}
const customer = (id: string) => {
  const c = customersCollection.get(PLATFORM_WS, id)
  if (!c || c.status === "deleted") throw new Error("This customer no longer exists")
  return c
}
const step = (r: DataRequest, by: string, text: string) => [...r.history, { at: now(), by, text }]
/** The company's own audit log gets the same step (its administrator sees what Nexora did with its data). */
const companyLog = (customerId: string, action: string, actionKey: string, target: string, who: Person) => {
  const ws = customersCollection.get(PLATFORM_WS, customerId)?.demoWorkspaceId
  if (ws) recordAudit(ws, { action, actionKey, category: "Security", target, actor: { id: who.email, name: who.name, email: who.email } })
}
const staffPerson = (a: ConsoleActor): Person => ({ name: a.name, email: `${a.id}@nexora.io` })

export const listDataRequestsApi = async () => [...requests.list(PLATFORM_WS)].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
export const getRetentionApi = async () => retention.list(PLATFORM_WS)[0]!

/* ---------- the company asks (My subscription) ---------- */

export async function requestDataExportApi(person: Person, customerId: string) {
  const c = customer(customerId)
  if (requests.list(PLATFORM_WS).some((r) => r.customerId === customerId && r.kind === "export" && r.status === "received")) throw new Error("An export is already being prepared")
  const r = requests.create(PLATFORM_WS, {
    number: nextNumber(), kind: "export", customerId, customerName: c.name, requestedBy: person, receivedAt: now(), dueOn: addDaysIso(isoDay(new Date()), EXPORT_DAYS), status: "received",
    history: [{ at: now(), by: person.name, text: "Export of the company's data asked from My subscription" }],
  })
  auditCustomer(person, customerId, "data.export_requested", `${r.number} · ${c.name}`, { targetType: "data" })
  companyLog(customerId, "Data export requested", "data.export_requested", r.number, person)
  return r
}

export async function requestDeletionApi(person: Person, customerId: string, reason: string) {
  const c = customer(customerId)
  if (reason.trim().length < 5) throw new Error("Say why you want the account deleted")
  if (requests.list(PLATFORM_WS).some((r) => r.customerId === customerId && r.kind === "deletion" && (r.status === "received" || r.status === "prepared"))) throw new Error("A deletion request is already open")
  const r = requests.create(PLATFORM_WS, {
    number: nextNumber(), kind: "deletion", customerId, customerName: c.name, requestedBy: person, receivedAt: now(), dueOn: addDaysIso(isoDay(new Date()), DELETION_DAYS), status: "received", reason: reason.trim(),
    history: [{ at: now(), by: person.name, text: `Deletion of the account asked: ${reason.trim()}` }],
  })
  auditCustomer(person, customerId, "data.deletion_requested", `${r.number} · ${c.name}`, { targetType: "data", after: reason.trim() })
  companyLog(customerId, "Account deletion requested", "data.deletion_requested", r.number, person)
  return r
}

/* ---------- the team handles it (Data requests) ---------- */

/** What the tenant export contains: the company's identity, every workspace record, and its Nexora invoices. */
async function buildExport(customerId: string) {
  const c = customersCollection.get(PLATFORM_WS, customerId)!
  await loadTenantModules()
  const workspace = c.demoWorkspaceId ? exportWorkspaceData(c.demoWorkspaceId) : {}
  const [invoices, creditNotes, payments] = await Promise.all([listInvoicesApi(), listCreditNotesApi(), listPaymentsApi()])
  const nexora = {
    invoices: invoices.filter((i) => i.customerId === customerId),
    creditNotes: creditNotes.filter((n) => n.customerId === customerId),
    payments: payments.filter((p) => p.customerId === customerId),
  }
  const { notes: _internal, ...company } = c
  void _internal
  const records = Object.values(workspace).reduce((s, list) => s + list.length, 0) + nexora.invoices.length + nexora.creditNotes.length + nexora.payments.length
  return { content: { exportedAt: now(), format: "nexora-tenant-export/1", company, workspace, nexora }, records }
}

/** AUD-04: the team prepares the export; the company downloads it for 7 days. */
export async function fulfilExportApi(actor: ConsoleActor, id: string) {
  if (!consoleCan(actor.role, C.CHANGE_STATUS)) throw new Error(ERR_FORBIDDEN)
  const r = get(id)
  if (r.kind !== "export" || r.status !== "received") throw new Error("This request is not waiting for an export")
  const { records } = await buildExport(r.customerId)
  const updated = requests.update(PLATFORM_WS, id, { status: "fulfilled", records, availableUntil: addDaysIso(isoDay(new Date()), EXPORT_DAYS), downloads: 0, history: step(r, actor.name, `Export ready: ${records} records`) })
  audit(actor, "data.export_fulfilled", "data", `${r.number} · ${r.customerName}`, { after: `${records} records`, customerId: r.customerId })
  companyLog(r.customerId, "Data export ready", "data.export_fulfilled", r.number, staffPerson(actor))
  return updated
}

/**
 * AUD-07: downloading the export is a sensitive read, recorded in both audit
 * trails. The company's administrator downloads it; the team may check it.
 */
export async function downloadExportApi(by: { actor: ConsoleActor } | { person: Person }, id: string) {
  const r = get(id)
  if (r.kind !== "export" || r.status !== "fulfilled") throw new Error("This export is not ready")
  if (r.availableUntil && r.availableUntil < isoDay(new Date())) throw new Error("This export has expired; ask for a new one")
  if ("actor" in by && !consoleCan(by.actor.role, C.CHANGE_STATUS)) throw new Error(ERR_FORBIDDEN)
  const { content } = await buildExport(r.customerId)
  const who = "actor" in by ? by.actor.name : by.person.name
  requests.update(PLATFORM_WS, id, { downloads: (r.downloads ?? 0) + 1, history: step(r, who, "Export downloaded") })
  if ("actor" in by) audit(by.actor, "data.export_downloaded", "data", `${r.number} · ${r.customerName}`, { customerId: r.customerId })
  else auditCustomer(by.person, r.customerId, "data.export_downloaded", `${r.number} · ${r.customerName}`, { targetType: "data" })
  companyLog(r.customerId, "Data export downloaded", "data.export_downloaded", r.number, "actor" in by ? staffPerson(by.actor) : by.person)
  return { filename: `${r.number}-${r.customerName.replace(/[^\w]+/g, "-").toLowerCase()}.json`, json: JSON.stringify(content, null, 2) }
}

/** The year after which an invoice may be destroyed: 10 years after the end of the year it was issued. */
export function retainedUntil(lastInvoiceDate: string | undefined, years: number) {
  const year = Number((lastInvoiceDate ?? isoDay(new Date())).slice(0, 4))
  return `${year + years}-12-31`
}

/** AUD-05, step 1: a team member checks the account can be deleted (cancelled, nothing owed). */
export async function prepareDeletionApi(actor: ConsoleActor, id: string) {
  if (!consoleCan(actor.role, C.CHANGE_SUBSCRIPTION)) throw new Error(ERR_FORBIDDEN)
  const r = get(id)
  if (r.kind !== "deletion" || r.status !== "received") throw new Error("This request is not waiting to be prepared")
  const c = customer(r.customerId)
  if (c.status !== "cancelled") throw new Error("Cancel the subscription before deleting the account")
  const owed = (await listInvoicesApi()).filter((i) => i.customerId === c.id && i.status !== "paid" && i.status !== "credited")
  if (owed.length) throw new Error(`The company still owes ${owed.length} invoice(s): settle or credit them first`)
  const updated = requests.update(PLATFORM_WS, id, { status: "prepared", preparedBy: actor.name, history: step(r, actor.name, "Prepared: subscription cancelled, nothing owed") })
  audit(actor, "data.deletion_prepared", "data", `${r.number} · ${r.customerName}`, { customerId: r.customerId })
  return updated
}

/**
 * AUD-05, step 2: a platform owner other than the one who prepared it
 * approves with the authenticator code. The company's workspace and logins
 * are deleted; its name and tax identifiers stay only on the invoices, credit
 * notes and payments the law requires Nexora to keep.
 */
export async function approveDeletionApi(actor: ConsoleActor, id: string) {
  if (!consoleCan(actor.role, C.DELETE_CUSTOMER)) throw new Error(ERR_FORBIDDEN)
  const r = get(id)
  if (r.kind !== "deletion" || r.status !== "prepared") throw new Error("This request is not waiting for approval")
  if (r.preparedBy === actor.name) throw new Error("Another team member must approve this deletion")
  const c = customer(r.customerId)
  if (c.status !== "cancelled") throw new Error("Cancel the subscription before deleting the account")
  await loadTenantModules()
  const deletedRecords = c.demoWorkspaceId ? Object.values(exportWorkspaceData(c.demoWorkspaceId)).reduce((s, l) => s + l.length, 0) : 0
  if (c.demoWorkspaceId) deleteWorkspaceData(c.demoWorkspaceId)
  const invoices = (await listInvoicesApi()).filter((i) => i.customerId === c.id)
  const policy = await getRetentionApi()
  const until = retainedUntil(invoices.map((i) => i.date).sort().at(-1), policy.invoiceYears)
  // what the invoices need stays: legal name, address and tax identifiers; people and notes go
  customersCollection.update(PLATFORM_WS, c.id, {
    status: "deleted", readOnly: true, notes: [], phone: undefined, seatsUsed: 0, seatsFullNotice: undefined,
    admin: { name: "Deleted", email: "" }, demoWorkspaceId: undefined, suspension: undefined,
  })
  const updated = requests.update(PLATFORM_WS, id, {
    status: "deleted", deletedRecords, keptInvoices: invoices.length, retainedUntil: until,
    history: step(r, actor.name, `Deleted ${deletedRecords} records; ${invoices.length} invoices kept until ${until}`),
  })
  audit(actor, "data.deletion_approved", "data", `${r.number} · ${r.customerName}`, { before: `${deletedRecords} records`, after: `deleted · ${invoices.length} invoices kept until ${until}`, customerId: r.customerId })
  return updated
}

export async function refuseDataRequestApi(actor: ConsoleActor, id: string, reason: string) {
  if (!consoleCan(actor.role, C.CHANGE_STATUS)) throw new Error(ERR_FORBIDDEN)
  const r = get(id)
  if (r.status !== "received" && r.status !== "prepared") throw new Error("This request is already closed")
  if (reason.trim().length < 5) throw new Error("Give the reason, the company will read it")
  const updated = requests.update(PLATFORM_WS, id, { status: "refused", refusedReason: reason.trim(), history: step(r, actor.name, `Refused: ${reason.trim()}`) })
  audit(actor, "data.request_refused", "data", `${r.number} · ${r.customerName}`, { after: reason.trim(), customerId: r.customerId })
  companyLog(r.customerId, "Data request refused", "data.request_refused", r.number, staffPerson(actor))
  return updated
}

/* ---------- retention (AUD-06) ---------- */

/** AUD-06: only the platform owner changes it, never below 5 years for audit events or 10 for invoices. */
export async function updateRetentionApi(actor: ConsoleActor, input: { auditYears: number }) {
  if (actor.role !== ConsoleRole.OWNER) throw new Error(ERR_FORBIDDEN)
  if (!Number.isInteger(input.auditYears) || input.auditYears < 5 || input.auditYears > 30) throw new Error("Audit events are kept between 5 and 30 years")
  const before = await getRetentionApi()
  const updated = retention.update(PLATFORM_WS, before.id, { auditYears: input.auditYears, updatedBy: actor.name })
  audit(actor, "config.retention_changed", "config", "Audit retention", { before: `${before.auditYears} years`, after: `${input.auditYears} years` })
  return updated
}

/** AUD-06: the events a purge job may remove: none younger than the retention period. */
export function purgeableEvents(events: Pick<ConsoleAuditEvent, "id" | "at">[], years: number, today = new Date()) {
  const limit = new Date(today)
  limit.setUTCFullYear(limit.getUTCFullYear() - Math.max(5, years))
  return events.filter((e) => new Date(e.at) < limit)
}

/** AUD-04: requests past their due date, for the warning on the page. */
export const isLate = (r: DataRequest, today = isoDay(new Date())) => (r.status === "received" || r.status === "prepared") && r.dueOn < today
