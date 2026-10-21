import { createClientApi, listClientsApi, updateClientApi } from "./clients-api"
import { listDealsApi, saveDealApi } from "./deals-api"
import { listEmployeesApi } from "./employees-api"
import { recordAudit } from "@/lib/workforce/audit"
import { withContact } from "@/lib/workforce/contacts"
import { checkRows, clientFields, contactFields, dealFields, hasErrors, type ImportContext, type ImportKind, type ImportRow } from "@/lib/workforce/crm-import"
import { ClientStatus, type ClientContact, type ClientInput } from "@/types/workforce"
import { DealStage, type DealInput } from "@/types/work-sales"

export interface ImportResult {
  created: number
  updated: number
  /** Rows not saved: errors found again on save, or a rule refused them */
  failed: { line: number; message: string }[]
}

export async function importContextApi(workspaceId: string): Promise<ImportContext> {
  const [clients, employees, deals] = await Promise.all([listClientsApi(workspaceId), listEmployeesApi(workspaceId), listDealsApi(workspaceId)])
  return { clients, employees, deals }
}

/**
 * Saves the rows of an import (CRM step 7), one by one so one bad row never
 * stops the others. Rows are checked again against the current data first;
 * rows that still have a problem are reported, not saved.
 */
export async function importCrmApi(workspaceId: string, kind: ImportKind, rows: Pick<ImportRow, "line" | "values">[]): Promise<ImportResult> {
  let ctx = await importContextApi(workspaceId)
  const checked = checkRows(rows, kind, ctx)
  const result: ImportResult = { created: 0, updated: 0, failed: [] }

  for (const first of checked) {
    if (hasErrors(first)) {
      result.failed.push({ line: first.line, message: "This row still has errors" })
      continue
    }
    // checked again on its own against what earlier rows saved (a client added above, the same deal twice…)
    const row = checkRows([first], kind, ctx)[0]!
    if (hasErrors(row)) {
      result.failed.push({ line: row.line, message: "This row still has errors" })
      continue
    }
    try {
      if (kind === "clients") await saveClientRow(workspaceId, row, ctx)
      else if (kind === "contacts") await saveContactRow(workspaceId, row, ctx)
      else await saveDealRow(workspaceId, row, ctx)
      if (row.action === "update") result.updated++
      else result.created++
      ctx = await importContextApi(workspaceId)
    } catch (err) {
      result.failed.push({ line: row.line, message: err instanceof Error ? err.message : String(err) })
    }
  }

  if (result.created || result.updated) {
    recordAudit(workspaceId, { action: "Data imported", actionKey: "crm.import", category: "Billing", target: `${kind}: ${result.created} added, ${result.updated} updated` })
  }
  return result
}

async function saveClientRow(workspaceId: string, row: ImportRow, ctx: ImportContext) {
  const fields = clientFields(row, ctx) as Partial<ClientInput>
  const v = row.values
  const mainContact: ClientContact | undefined = v.contactName && v.contactEmail ? { id: "", name: v.contactName, email: v.contactEmail.toLowerCase(), phone: v.contactPhone || undefined, position: v.contactPosition || undefined, isPrimary: true } : undefined
  if (row.action === "update" && row.target) {
    const current = ctx.clients.find((c) => c.id === row.target)!
    const known = mainContact && current.contacts.some((c) => c.email.toLowerCase() === mainContact.email)
    await updateClientApi(workspaceId, row.target, { ...fields, ...(mainContact && !known ? { contacts: withContact(current.contacts, { ...mainContact, isPrimary: current.contacts.length === 0 }) } : {}) })
    return
  }
  await createClientApi(workspaceId, {
    status: ClientStatus.ACTIVE,
    paymentTermsDays: 30,
    email: "",
    ...fields,
    name: fields.name ?? "",
    contacts: mainContact ? withContact([], mainContact) : [],
  } as ClientInput)
}

async function saveContactRow(workspaceId: string, row: ImportRow, ctx: ImportContext) {
  const client = ctx.clients.find((c) => c.id === row.clientId)!
  const f = contactFields(row)
  const current = row.target ? client.contacts.find((c) => c.id === row.target) : undefined
  const contact: ClientContact = current
    ? { ...current, name: f.name || current.name, phone: f.phone ?? current.phone, position: f.position ?? current.position, role: f.role ?? current.role, linkedin: f.linkedin ?? current.linkedin, isPrimary: f.isPrimary ?? current.isPrimary }
    : { id: "", name: f.name, email: f.email, phone: f.phone, position: f.position, role: f.role, linkedin: f.linkedin, isPrimary: f.isPrimary ?? client.contacts.length === 0 }
  await updateClientApi(workspaceId, client.id, { contacts: withContact(client.contacts, contact) })
}

async function saveDealRow(workspaceId: string, row: ImportRow, ctx: ImportContext) {
  const f = dealFields(row, ctx)
  const current = row.target ? ctx.deals.find((d) => d.id === row.target) : undefined
  const input: DealInput = current
    ? {
        title: current.title,
        clientId: current.clientId,
        amount: f.amount,
        expectedClose: f.expectedClose,
        stage: f.stage ?? current.stage,
        probability: f.probability ?? current.probability,
        ownerId: f.ownerId ?? current.ownerId,
        contactId: f.contactId ?? current.contactId,
        quoteId: current.quoteId,
        lostReason: current.lostReason ?? (f.stage === DealStage.LOST ? "Imported" : undefined),
        note: f.note ?? current.note,
      }
    : { title: f.title, clientId: row.clientId!, amount: f.amount, expectedClose: f.expectedClose, stage: f.stage ?? DealStage.LEAD, probability: f.probability, ownerId: f.ownerId, contactId: f.contactId, note: f.note, lostReason: f.stage === DealStage.LOST ? "Imported" : undefined }
  await saveDealApi(workspaceId, input, current?.id)
}
