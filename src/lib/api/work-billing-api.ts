import {
  ClientInvoiceStatus,
  TimeEntryStatus,
  type ClientInvoice,
  type InvoiceLine,
  type TimeEntry,
} from "@/types/work-billing"
import { BudgetType } from "@/types/work-projects"
import { createCollection, createId } from "@/lib/workforce/demo-store"
import { seedClientInvoices, seedTimeEntries } from "@/lib/workforce/billing-seed"
import { addDays, buildInvoiceLines, nextInvoiceNumber, roundHours, unbilledEntries } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { listProjectsApi } from "./work-projects-api"
import { listEmployeesApi } from "./employees-api"
import { listClientsApi } from "./clients-api"
import { DEMO_WORKSPACES } from "@/lib/workforce/demo-seed"
import { unbilledExpenses } from "@/lib/workforce/profitability"
import { listExpensesApi, releaseInvoiceExpenses, setExpensesInvoice } from "./expenses-api"
import { recordAudit } from "@/lib/workforce/audit"

/**
 * Timesheets, approvals and client invoices. Backed by the browser demo store
 * for now; replace the bodies with apiClient calls once the backend exists.
 */
const entries = createCollection<TimeEntry>("time-entries", "te", seedTimeEntries)
const invoices = createCollection<ClientInvoice>("client-invoices", "inv", seedClientInvoices)

const EDITABLE = [TimeEntryStatus.DRAFT, TimeEntryStatus.REJECTED]
const MAX_HOURS_PER_DAY = 24

// ---------- Time entries ----------

export async function listTimeEntriesApi(
  workspaceId: string,
  filter: { employeeId?: string; from?: string; to?: string; status?: TimeEntryStatus } = {}
): Promise<TimeEntry[]> {
  return entries
    .list(workspaceId)
    .filter(
      (e) =>
        (!filter.employeeId || e.employeeId === filter.employeeId) &&
        (!filter.from || e.date >= filter.from) &&
        (!filter.to || e.date <= filter.to) &&
        (!filter.status || e.status === filter.status)
    )
    .sort((a, b) => a.date.localeCompare(b.date))
}

export interface TimesheetCell {
  employeeId: string
  projectId: string
  taskId?: string
  date: string
  hours: number
}

/**
 * Sets the hours of one timesheet cell (one employee, project, task and day).
 * 0 clears it. Only draft or rejected hours can change; a rejected entry goes
 * back to draft once edited.
 */
export async function setTimesheetCellApi(workspaceId: string, cell: TimesheetCell): Promise<TimeEntry | null> {
  if (!Number.isFinite(cell.hours) || cell.hours < 0) throw new Error("Hours must be zero or more")
  const hours = roundHours(cell.hours)

  const all = entries.list(workspaceId)
  const existing = all.find(
    (e) =>
      e.employeeId === cell.employeeId &&
      e.projectId === cell.projectId &&
      (e.taskId ?? "") === (cell.taskId ?? "") &&
      e.date === cell.date
  )
  if (existing && !EDITABLE.includes(existing.status)) {
    throw new Error("Submitted or approved hours can't be changed")
  }

  const otherHours = all
    .filter((e) => e.employeeId === cell.employeeId && e.date === cell.date && e.id !== existing?.id)
    .reduce((sum, e) => sum + e.hours, 0)
  if (otherHours + hours > MAX_HOURS_PER_DAY) throw new Error("More than 24 hours in one day")

  if (hours === 0) {
    if (existing) entries.remove(workspaceId, existing.id)
    return null
  }

  if (existing) {
    return entries.update(workspaceId, existing.id, { hours, status: TimeEntryStatus.DRAFT, rejectionReason: undefined })
  }

  const project = (await listProjectsApi(workspaceId)).find((p) => p.id === cell.projectId)
  if (!project) throw new Error("Project not found")
  if (!project.memberIds.includes(cell.employeeId)) throw new Error("Only the project team can log time on it")

  return entries.create(workspaceId, {
    employeeId: cell.employeeId,
    projectId: cell.projectId,
    taskId: cell.taskId,
    date: cell.date,
    hours,
    billable: project.budgetType !== BudgetType.NON_BILLABLE,
    status: TimeEntryStatus.DRAFT,
  })
}

/** Removes a whole timesheet row (draft or rejected hours only) for the given days. */
export async function clearTimesheetRowApi(
  workspaceId: string,
  row: { employeeId: string; projectId: string; taskId?: string; dates: string[] }
) {
  for (const e of entries.list(workspaceId)) {
    if (
      e.employeeId === row.employeeId &&
      e.projectId === row.projectId &&
      (e.taskId ?? "") === (row.taskId ?? "") &&
      row.dates.includes(e.date)
    ) {
      if (!EDITABLE.includes(e.status)) throw new Error("Submitted or approved hours can't be changed")
      entries.remove(workspaceId, e.id)
    }
  }
}

/** Sends an employee's draft and rejected hours of a period for approval. */
export async function submitTimesheetApi(
  workspaceId: string,
  employeeId: string,
  from: string,
  to: string
): Promise<number> {
  const toSubmit = entries
    .list(workspaceId)
    .filter((e) => e.employeeId === employeeId && e.date >= from && e.date <= to && EDITABLE.includes(e.status))
  if (toSubmit.length === 0) throw new Error("No hours to submit")
  for (const e of toSubmit) {
    entries.update(workspaceId, e.id, { status: TimeEntryStatus.SUBMITTED, rejectionReason: undefined })
  }
  return toSubmit.length
}

export async function approveTimeEntriesApi(workspaceId: string, ids: string[]): Promise<number> {
  return review(workspaceId, ids, { status: TimeEntryStatus.APPROVED, rejectionReason: undefined })
}

export async function rejectTimeEntriesApi(workspaceId: string, ids: string[], reason: string): Promise<number> {
  if (!reason.trim()) throw new Error("Give a reason so the employee knows what to fix")
  return review(workspaceId, ids, { status: TimeEntryStatus.REJECTED, rejectionReason: reason.trim() })
}

function review(workspaceId: string, ids: string[], patch: Partial<TimeEntry>) {
  let count = 0
  for (const id of ids) {
    const e = entries.get(workspaceId, id)
    if (!e || e.status !== TimeEntryStatus.SUBMITTED) continue
    entries.update(workspaceId, id, patch)
    count++
  }
  if (count === 0) throw new Error("Only submitted hours can be reviewed")
  const approved = patch.status === TimeEntryStatus.APPROVED
  recordAudit(workspaceId, {
    action: approved ? "Hours approved" : "Hours rejected",
    actionKey: approved ? "time.approved" : "time.rejected",
    category: "Approvals",
    target: `${count} time ${count === 1 ? "entry" : "entries"}`,
    after: patch.rejectionReason,
  })
  return count
}

// ---------- Client invoices ----------

export async function listClientInvoicesApi(workspaceId: string): Promise<ClientInvoice[]> {
  return invoices.list(workspaceId).sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.number.localeCompare(a.number))
}

/**
 * Drafts an invoice for a client from approved, unbilled hours (one line per
 * project and person) and marks those hours as invoiced.
 */
export async function createInvoiceFromHoursApi(
  workspaceId: string,
  input: { clientId: string; entryIds: string[]; expenseIds?: string[]; issueDate?: string; taxRate: number; notes?: string }
): Promise<ClientInvoice> {
  if (input.taxRate < 0 || input.taxRate > 100) throw new Error("Tax must be between 0 and 100%")
  const [projects, employees, clients] = await Promise.all([
    listProjectsApi(workspaceId),
    listEmployeesApi(workspaceId),
    listClientsApi(workspaceId),
  ])
  const client = clients.find((c) => c.id === input.clientId)
  if (!client) throw new Error("Client not found")

  const billable = unbilledEntries(entries.list(workspaceId), projects, client.id)
  const selected = billable.filter((e) => input.entryIds.includes(e.id))
  const expenseIds = input.expenseIds ?? []
  const rebill = unbilledExpenses(await listExpensesApi(workspaceId), projects, client.id).filter((x) =>
    expenseIds.includes(x.id)
  )
  if (input.entryIds.length === 0 && expenseIds.length === 0) throw new Error("Select at least one block of approved hours")
  if (selected.length !== input.entryIds.length) throw new Error("Some hours are no longer available to invoice")
  if (rebill.length !== expenseIds.length) throw new Error("Some expenses are no longer available to invoice")

  const issueDate = input.issueDate ?? todayIso()
  const invoice = invoices.create(workspaceId, {
    number: nextInvoiceNumber(invoices.list(workspaceId).map((i) => i.number), Number(issueDate.slice(0, 4))),
    clientId: client.id,
    currency: DEMO_WORKSPACES.find((w) => w.id === workspaceId)?.currency ?? "EUR",
    issueDate,
    dueDate: addDays(issueDate, client.paymentTermsDays),
    status: ClientInvoiceStatus.DRAFT,
    lines: [
      ...buildInvoiceLines(selected, projects, employees, client, () => createId("ln")),
      ...rebill.map((x) => ({
        id: createId("ln"),
        description: `${projects.find((p) => p.id === x.projectId)?.code ?? ""} · ${x.description}`,
        quantity: 1,
        unitPrice: x.amount,
        projectId: x.projectId,
        timeEntryIds: [],
        expenseIds: [x.id],
      })),
    ],
    taxRate: input.taxRate,
    notes: input.notes || undefined,
  })
  for (const e of selected) entries.update(workspaceId, e.id, { invoiceId: invoice.id })
  setExpensesInvoice(workspaceId, rebill.map((x) => x.id), invoice.id)
  return invoice
}

/** Edits a draft: tax, notes, dates, and manual lines (lines from hours keep their hours). */
export async function updateInvoiceDraftApi(
  workspaceId: string,
  id: string,
  input: Partial<Pick<ClientInvoice, "taxRate" | "notes" | "issueDate" | "dueDate" | "lines">>
): Promise<ClientInvoice> {
  const invoice = invoices.get(workspaceId, id)
  if (!invoice) throw new Error("Invoice not found")
  if (invoice.status !== ClientInvoiceStatus.DRAFT) throw new Error("Only draft invoices can be edited")
  if (input.lines) assertLinesKeepHours(invoice.lines, input.lines)
  if ((input.dueDate ?? invoice.dueDate) < (input.issueDate ?? invoice.issueDate)) {
    throw new Error("The due date can't be before the issue date")
  }
  return invoices.update(workspaceId, id, input)
}

function assertLinesKeepHours(before: InvoiceLine[], after: InvoiceLine[]) {
  for (const line of before.filter((l) => l.timeEntryIds.length > 0 || l.expenseIds?.length)) {
    const kept = after.find((l) => l.id === line.id)
    if (
      !kept ||
      kept.quantity !== line.quantity ||
      kept.unitPrice !== line.unitPrice ||
      kept.timeEntryIds.join() !== line.timeEntryIds.join() ||
      (kept.expenseIds ?? []).join() !== (line.expenseIds ?? []).join()
    ) {
      throw new Error("Lines billed from hours or expenses can't change; remove the invoice to re-bill them")
    }
  }
}

export async function markInvoiceSentApi(workspaceId: string, id: string) {
  const invoice = await transition(workspaceId, id, [ClientInvoiceStatus.DRAFT], {
    status: ClientInvoiceStatus.SENT,
    sentAt: new Date().toISOString(),
  })
  auditInvoice(workspaceId, invoice, "Invoice sent", "invoice.sent", "draft")
  return invoice
}

export async function markInvoicePaidApi(workspaceId: string, id: string) {
  const invoice = await transition(workspaceId, id, [ClientInvoiceStatus.SENT], {
    status: ClientInvoiceStatus.PAID,
    paidAt: new Date().toISOString(),
  })
  auditInvoice(workspaceId, invoice, "Invoice paid", "invoice.paid", "sent")
  return invoice
}

function auditInvoice(workspaceId: string, invoice: ClientInvoice, action: string, actionKey: string, before: string) {
  recordAudit(workspaceId, { action, actionKey, category: "Billing", target: `Invoice ${invoice.number}`, before, after: invoice.status })
}

/** Cancels a sent invoice; its hours become available to invoice again. */
export async function voidInvoiceApi(workspaceId: string, id: string) {
  const invoice = await transition(workspaceId, id, [ClientInvoiceStatus.SENT], { status: ClientInvoiceStatus.VOID })
  releaseHours(workspaceId, invoice.id)
  auditInvoice(workspaceId, invoice, "Invoice voided", "invoice.voided", "sent")
  return invoice
}

/** Deletes a draft; its hours become available to invoice again. */
export async function deleteInvoiceDraftApi(workspaceId: string, id: string) {
  const invoice = invoices.get(workspaceId, id)
  if (!invoice) return
  if (invoice.status !== ClientInvoiceStatus.DRAFT) throw new Error("Only drafts can be deleted; void a sent invoice instead")
  releaseHours(workspaceId, id)
  invoices.remove(workspaceId, id)
}

async function transition(
  workspaceId: string,
  id: string,
  from: ClientInvoiceStatus[],
  patch: Partial<ClientInvoice>
) {
  const invoice = invoices.get(workspaceId, id)
  if (!invoice) throw new Error("Invoice not found")
  if (!from.includes(invoice.status)) throw new Error("This invoice can't move to that status")
  if (patch.status === ClientInvoiceStatus.SENT && invoice.lines.length === 0) throw new Error("Add at least one line first")
  return invoices.update(workspaceId, id, patch)
}

function releaseHours(workspaceId: string, invoiceId: string) {
  for (const e of entries.list(workspaceId).filter((x) => x.invoiceId === invoiceId)) {
    entries.update(workspaceId, e.id, { invoiceId: undefined })
  }
  releaseInvoiceExpenses(workspaceId, invoiceId)
}
