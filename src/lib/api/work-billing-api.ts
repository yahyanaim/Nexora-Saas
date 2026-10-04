import {
  ClientInvoiceStatus,
  InvoiceKind,
  PaymentMethod,
  TimeEntryStatus,
  type Payment,
  type ClientInvoice,
  type InvoiceLine,
  type TimeEntry,
} from "@/types/work-billing"
import { BudgetType, WorkProjectStatus, type WorkProject } from "@/types/work-projects"
import { createCollection, createId } from "@/lib/workforce/demo-store"
import { seedClientInvoices, seedTimeEntries } from "@/lib/workforce/billing-seed"
import {
  addDays,
  buildInvoiceLines,
  fiscalYearOf,
  formatInvoiceNumber,
  hourlyRate,
  invoiceBalance,
  type InvoiceGrouping,
  nextSequence,
  quarterHours,
  unbilledEntries,
} from "@/lib/workforce/billing"
import { assertPeriodOpen, getSettingsApi } from "./settings-api"
import { rateOn } from "@/lib/workforce/rates"
import { todayIso } from "@/lib/workforce/project-metrics"
import { listMilestonesApi, listProjectsApi, listTasksApi } from "./work-projects-api"
import { advanceDeductions, advanceLine, billedAgainstBudget, fixedPriceLine, milestoneLine, openAdvances, retainerLines } from "@/lib/workforce/invoice-builders"
import { listEmployeesApi } from "./employees-api"
import { listClientsApi } from "./clients-api"
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
  await assertPeriodOpen(workspaceId, cell.date)
  const hours = quarterHours(cell.hours)
  if (cell.hours > 0 && hours === 0) throw new Error("The smallest step is 15 minutes (0.25 h)")

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
  assertOpen(project)
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

/** Closed and cancelled projects accept no new hours (TIM-4, BR-10). */
function assertOpen(project: WorkProject) {
  if (project.status === WorkProjectStatus.COMPLETED || project.status === WorkProjectStatus.CANCELLED) {
    throw new Error("This project is closed, so it no longer accepts hours")
  }
}

/** Adds hours to today's (or a given day's) cell, used by the timer and quick entry. */
export async function addHoursApi(workspaceId: string, cell: TimesheetCell): Promise<TimeEntry | null> {
  const existing = entries
    .list(workspaceId)
    .find((e) => e.employeeId === cell.employeeId && e.projectId === cell.projectId && (e.taskId ?? "") === (cell.taskId ?? "") && e.date === cell.date)
  return setTimesheetCellApi(workspaceId, { ...cell, hours: (existing?.hours ?? 0) + cell.hours })
}

/**
 * Copies last week's rows and hours into empty cells of this week as drafts
 * (TIM-13). Cells already filled, and closed projects, are skipped.
 */
export async function copyPreviousWeekApi(workspaceId: string, employeeId: string, monday: string): Promise<number> {
  const lastMonday = addDays(monday, -7)
  const lastSunday = addDays(monday, -1)
  const source = entries.list(workspaceId).filter((e) => e.employeeId === employeeId && e.date >= lastMonday && e.date <= lastSunday)
  if (source.length === 0) throw new Error("Nothing was logged last week")
  let copied = 0
  for (const e of source) {
    const date = addDays(e.date, 7)
    const taken = entries
      .list(workspaceId)
      .some((x) => x.employeeId === employeeId && x.projectId === e.projectId && (x.taskId ?? "") === (e.taskId ?? "") && x.date === date)
    if (taken) continue
    try {
      await setTimesheetCellApi(workspaceId, { employeeId, projectId: e.projectId, taskId: e.taskId, date, hours: e.hours })
      copied++
    } catch {
      // Closed projects or full days are skipped rather than failing the copy
    }
  }
  if (copied === 0) throw new Error("This week already has those rows filled in")
  return copied
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

/** Approves submitted hours and freezes the rates they bill and cost at (TIM-9). */
export async function approveTimeEntriesApi(workspaceId: string, ids: string[]): Promise<number> {
  const [projects, employees, clients] = await Promise.all([listProjectsApi(workspaceId), listEmployeesApi(workspaceId), listClientsApi(workspaceId)])
  const approvedAt = new Date().toISOString()
  return review(workspaceId, ids, { status: TimeEntryStatus.APPROVED, rejectionReason: undefined, approvedAt }, (entry) => {
    const employee = employees.find((e) => e.id === entry.employeeId)
    const client = clients.find((c) => c.id === projects.find((p) => p.id === entry.projectId)?.clientId)
    return {
      billRate: hourlyRate(employee, client, entry.date),
      costRate: employee ? rateOn(employee, entry.date).hourlyCost : 0,
    }
  })
}

/**
 * Sends approved hours back to draft (TIM-7). Only before they're invoiced;
 * a reason is required and the reopening is logged.
 */
export async function reopenTimeEntriesApi(workspaceId: string, ids: string[], reason: string): Promise<number> {
  if (!reason.trim()) throw new Error("Say why the hours are reopened")
  let count = 0
  for (const id of ids) {
    const e = entries.get(workspaceId, id)
    if (!e || e.status !== TimeEntryStatus.APPROVED) continue
    if (e.invoiceId) throw new Error("Invoiced hours can't be reopened; issue a credit note instead")
    entries.update(workspaceId, id, { status: TimeEntryStatus.DRAFT, billRate: undefined, costRate: undefined, approvedAt: undefined })
    count++
  }
  if (count === 0) throw new Error("Only approved hours can be reopened")
  recordAudit(workspaceId, { action: "Hours reopened", actionKey: "time.reopened", category: "Approvals", target: `${count} time ${count === 1 ? "entry" : "entries"}`, after: reason.trim() })
  return count
}

export async function rejectTimeEntriesApi(workspaceId: string, ids: string[], reason: string): Promise<number> {
  if (!reason.trim()) throw new Error("Give a reason so the employee knows what to fix")
  return review(workspaceId, ids, { status: TimeEntryStatus.REJECTED, rejectionReason: reason.trim() })
}

function review(workspaceId: string, ids: string[], patch: Partial<TimeEntry>, perEntry?: (e: TimeEntry) => Partial<TimeEntry>) {
  let count = 0
  for (const id of ids) {
    const e = entries.get(workspaceId, id)
    if (!e || e.status !== TimeEntryStatus.SUBMITTED) continue
    entries.update(workspaceId, id, { ...patch, ...perEntry?.(e) })
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
  input: {
    clientId: string
    entryIds: string[]
    expenseIds?: string[]
    issueDate?: string
    taxRate: number
    notes?: string
    groupBy?: InvoiceGrouping
    /** Subtract the client's open advances as negative lines (section 6.5) */
    deductAdvances?: boolean
  }
): Promise<ClientInvoice> {
  if (input.taxRate < 0 || input.taxRate > 100) throw new Error("Tax must be between 0 and 100%")
  const issueDate = input.issueDate ?? todayIso()
  await assertPeriodOpen(workspaceId, issueDate)
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

  const { company } = await getSettingsApi(workspaceId)
  const invoice = invoices.create(workspaceId, {
    // Drafts get their number when issued, so the sequence has no gaps (BR-12)
    number: "",
    kind: InvoiceKind.HOURS,
    clientId: client.id,
    currency: client.currency ?? company.baseCurrency,
    issueDate,
    dueDate: addDays(issueDate, client.paymentTermsDays),
    status: ClientInvoiceStatus.DRAFT,
    lines: [
      ...buildInvoiceLines(selected, projects, employees, client, () => createId("ln"), input.groupBy, await listTasksApi(workspaceId)),
      ...rebill.map((x) => ({
        id: createId("ln"),
        description: `${projects.find((p) => p.id === x.projectId)?.code ?? ""} · ${x.description}`,
        quantity: 1,
        unitPrice: x.amount,
        projectId: x.projectId,
        timeEntryIds: [],
        expenseIds: [x.id],
      })),
      ...(input.deductAdvances ? advanceDeductions(openAdvances(client.id, invoices.list(workspaceId)), () => createId("ln")) : []),
    ],
    taxRate: input.taxRate,
    notes: input.notes || undefined,
  })
  for (const e of selected) entries.update(workspaceId, e.id, { invoiceId: invoice.id })
  setExpensesInvoice(workspaceId, rebill.map((x) => x.id), invoice.id)
  return invoice
}

export type NewInvoiceInput = {
  clientId: string
  issueDate?: string
  taxRate: number
  notes?: string
  subject?: string
  quoteId?: string
  deductAdvances?: boolean
} & (
  | { kind: InvoiceKind.FIXED; projectId: string; percent: number }
  | { kind: InvoiceKind.MILESTONE; projectId: string; milestoneId: string; amount: number }
  | { kind: InvoiceKind.RETAINER; projectId: string; month: string }
  | { kind: InvoiceKind.ADVANCE; projectId?: string; amount: number; label?: string }
  | { kind: InvoiceKind.FREE; lines?: InvoiceLine[] }
)

/**
 * Drafts an invoice that isn't built from hours (BIL-3): a share of a fixed
 * price, a milestone, a month of a retainer, a deposit, or free-form lines.
 */
export async function createInvoiceApi(workspaceId: string, input: NewInvoiceInput): Promise<ClientInvoice> {
  if (input.taxRate < 0 || input.taxRate > 100) throw new Error("Tax must be between 0 and 100%")
  const issueDate = input.issueDate ?? todayIso()
  await assertPeriodOpen(workspaceId, issueDate)
  const [projects, clients, { company }] = await Promise.all([listProjectsApi(workspaceId), listClientsApi(workspaceId), getSettingsApi(workspaceId)])
  const client = clients.find((c) => c.id === input.clientId)
  if (!client) throw new Error("Client not found")
  const all = invoices.list(workspaceId)
  const newId = () => createId("ln")
  const projectOf = (id?: string) => {
    const project = projects.find((p) => p.id === id)
    if (id && (!project || project.clientId !== client.id)) throw new Error("Pick a project of this client")
    return project
  }

  let lines: InvoiceLine[] = []
  let coveredEntries: TimeEntry[] = []
  switch (input.kind) {
    case InvoiceKind.FIXED: {
      const project = projectOf(input.projectId)!
      lines = [fixedPriceLine(project, input.percent, newId(), billedAgainstBudget(project, all).billed)]
      break
    }
    case InvoiceKind.MILESTONE: {
      const project = projectOf(input.projectId)!
      const milestone = (await listMilestonesApi(workspaceId, project.id)).find((m) => m.id === input.milestoneId)
      if (!milestone) throw new Error("Milestone not found")
      lines = [milestoneLine(project, milestone, input.amount, newId(), billedAgainstBudget(project, all).billed)]
      break
    }
    case InvoiceKind.RETAINER: {
      const project = projectOf(input.projectId)!
      if (!/^\d{4}-\d{2}$/.test(input.month)) throw new Error("Pick the month to bill")
      const billedMonth = all.some(
        (i) => i.kind === InvoiceKind.RETAINER && i.status !== ClientInvoiceStatus.VOID && i.lines.some((l) => l.projectId === project.id && l.description.includes(input.month))
      )
      if (billedMonth) throw new Error("This month of the retainer is already invoiced")
      // Approved hours of that month not yet on an invoice
      coveredEntries = entries
        .list(workspaceId)
        .filter((e) => e.projectId === project.id && e.date.startsWith(input.month) && e.status === TimeEntryStatus.APPROVED && !e.invoiceId)
      lines = retainerLines(project, coveredEntries, input.month, newId)
      break
    }
    case InvoiceKind.ADVANCE: {
      const project = projectOf(input.projectId)
      lines = [advanceLine(input.amount, input.label?.trim() || `Advance${project ? ` · ${project.code} ${project.name}` : ""}`, newId(), project?.id)]
      break
    }
    case InvoiceKind.FREE:
      lines = input.lines ?? []
      break
  }
  if (input.deductAdvances && input.kind !== InvoiceKind.ADVANCE) {
    lines = [...lines, ...advanceDeductions(openAdvances(client.id, all), newId)]
  }

  const invoice = invoices.create(workspaceId, {
    number: "",
    kind: input.kind,
    clientId: client.id,
    currency: client.currency ?? company.baseCurrency,
    issueDate,
    dueDate: input.kind === InvoiceKind.ADVANCE ? issueDate : addDays(issueDate, client.paymentTermsDays),
    status: ClientInvoiceStatus.DRAFT,
    lines,
    taxRate: input.taxRate,
    notes: input.notes || undefined,
    subject: input.subject || undefined,
    quoteId: input.quoteId,
  })
  for (const e of coveredEntries) entries.update(workspaceId, e.id, { invoiceId: invoice.id })
  return invoice
}

/** Edits a draft: tax, notes, dates, and manual lines (lines from hours keep their hours). */
export async function updateInvoiceDraftApi(
  workspaceId: string,
  id: string,
  input: Partial<Pick<ClientInvoice, "taxRate" | "notes" | "issueDate" | "dueDate" | "lines" | "withholdingRate" | "currency" | "exchangeRate" | "exchangeRateDate">>
): Promise<ClientInvoice> {
  const invoice = invoices.get(workspaceId, id)
  if (!invoice) throw new Error("Invoice not found")
  if (invoice.status !== ClientInvoiceStatus.DRAFT) throw new Error("Only draft invoices can be edited")
  if (input.issueDate) await assertPeriodOpen(workspaceId, input.issueDate)
  if (input.withholdingRate !== undefined && (input.withholdingRate < 0 || input.withholdingRate > 100)) throw new Error("Withholding must be between 0 and 100%")
  if (input.exchangeRate !== undefined && !(input.exchangeRate > 0)) throw new Error("The exchange rate must be above zero")
  if (input.lines?.some((l) => l.taxRate !== undefined && (l.taxRate < 0 || l.taxRate > 100))) throw new Error("Tax must be between 0 and 100%")
  // Exchange rates keep 6 decimals (section 6.5)
  if (input.exchangeRate !== undefined) input = { ...input, exchangeRate: Math.round(input.exchangeRate * 1e6) / 1e6 }
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

/**
 * Issues a draft (BIL-5, BIL-8): gives it the next gapless number for its
 * fiscal year in the workspace format and locks it. Foreign-currency
 * invoices need their exchange rate first (BIL-7).
 */
export async function issueInvoiceApi(workspaceId: string, id: string): Promise<ClientInvoice> {
  const invoice = invoices.get(workspaceId, id)
  if (!invoice) throw new Error("Invoice not found")
  if (invoice.status !== ClientInvoiceStatus.DRAFT) throw new Error("Only drafts can be issued")
  if (invoice.lines.length === 0) throw new Error("Add at least one line first")
  await assertPeriodOpen(workspaceId, invoice.issueDate)
  const { company } = await getSettingsApi(workspaceId)
  if (invoice.currency !== company.baseCurrency && !(invoice.exchangeRate && invoice.exchangeRate > 0)) {
    throw new Error(`Enter the exchange rate from ${invoice.currency} to ${company.baseCurrency}`)
  }
  const fiscalYear = fiscalYearOf(invoice.issueDate, company.fiscalYearStartMonth)
  const isCredit = invoice.kind === InvoiceKind.CREDIT_NOTE
  const seq = nextSequence(invoices.list(workspaceId), fiscalYear, isCredit ? "credit" : "invoice", company.fiscalYearStartMonth)
  const format = isCredit ? creditFormat(company.invoiceNumberFormat) : company.invoiceNumberFormat
  const issued = invoices.update(workspaceId, id, {
    number: formatInvoiceNumber(format, fiscalYear, seq),
    fiscalYear,
    status: ClientInvoiceStatus.ISSUED,
    issuedAt: new Date().toISOString(),
    exchangeRate: invoice.currency === company.baseCurrency ? undefined : invoice.exchangeRate,
  })
  auditInvoice(workspaceId, issued, isCredit ? "Credit note issued" : "Invoice issued", "invoice.issued", "draft")
  return issued
}

/** Credit notes number in their own series, e.g. CN-2026-001. */
function creditFormat(invoiceFormat: string) {
  const tail = invoiceFormat.slice(invoiceFormat.indexOf("{"))
  return `CN-${tail}`
}

/** Records sending: issues a draft first, then logs the delivery to the client (BIL-11). */
export async function markInvoiceSentApi(workspaceId: string, id: string) {
  let invoice = invoices.get(workspaceId, id)
  if (!invoice) throw new Error("Invoice not found")
  if (invoice.status === ClientInvoiceStatus.DRAFT) invoice = await issueInvoiceApi(workspaceId, id)
  if (invoice.status !== ClientInvoiceStatus.ISSUED && invoice.status !== ClientInvoiceStatus.SENT) {
    throw new Error("This invoice can't be sent")
  }
  const client = (await listClientsApi(workspaceId)).find((c) => c.id === invoice!.clientId)
  const contact = client?.contacts.find((c) => c.isPrimary)?.email ?? client?.email ?? ""
  const now = new Date().toISOString()
  const sent = invoices.update(workspaceId, id, {
    status: ClientInvoiceStatus.SENT,
    sentAt: invoice.sentAt ?? now,
    deliveries: [...(invoice.deliveries ?? []), { to: contact, at: now }],
  })
  auditInvoice(workspaceId, sent, "Invoice sent", "invoice.sent", invoice.status)
  return sent
}

/**
 * Records a payment (BIL-12); partial payments are allowed. The invoice is
 * paid once nothing is left to pay.
 */
export async function recordPaymentApi(workspaceId: string, id: string, payment: Omit<Payment, "id">): Promise<ClientInvoice> {
  const invoice = invoices.get(workspaceId, id)
  if (!invoice) throw new Error("Invoice not found")
  if (invoice.status !== ClientInvoiceStatus.ISSUED && invoice.status !== ClientInvoiceStatus.SENT) {
    throw new Error("Payments can only be recorded on issued invoices")
  }
  if (invoice.kind === InvoiceKind.CREDIT_NOTE) throw new Error("Credit notes don't take payments")
  const balance = invoiceBalance(invoice, invoices.list(workspaceId))
  const amount = Math.round(payment.amount * 100) / 100
  if (!(amount > 0)) throw new Error("Enter an amount above zero")
  if (amount > balance + 0.001) throw new Error(`Only ${balance} is left to pay`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payment.date)) throw new Error("Pick the payment date")
  const payments = [...(invoice.payments ?? []), { ...payment, amount, reference: payment.reference?.trim() || undefined, id: createId("pay") }]
  const settled = Math.abs(balance - amount) < 0.005
  const updated = invoices.update(workspaceId, id, {
    payments,
    ...(settled ? { status: ClientInvoiceStatus.PAID, paidAt: `${payment.date}T12:00:00.000Z` } : {}),
  })
  recordAudit(workspaceId, {
    action: settled ? "Invoice paid" : "Payment recorded",
    actionKey: settled ? "invoice.paid" : "invoice.payment",
    category: "Billing",
    target: `Invoice ${invoice.number}`,
    after: `${amount} ${invoice.currency} (${payment.method})`,
  })
  return updated
}

/** Marks an invoice fully paid today by recording its remaining balance. */
export async function markInvoicePaidApi(workspaceId: string, id: string) {
  const invoice = invoices.get(workspaceId, id)
  if (!invoice) throw new Error("Invoice not found")
  return recordPaymentApi(workspaceId, id, {
    date: todayIso(),
    amount: invoiceBalance(invoice, invoices.list(workspaceId)),
    method: PaymentMethod.BANK_TRANSFER,
  })
}

function auditInvoice(workspaceId: string, invoice: ClientInvoice, action: string, actionKey: string, before: string) {
  recordAudit(workspaceId, { action, actionKey, category: "Billing", target: `Invoice ${invoice.number}`, before, after: invoice.status })
}

/**
 * Cancels an issued invoice that has no payments. The number stays used and
 * the invoice stays visible as cancelled (BR-12); its hours become billable again.
 */
export async function voidInvoiceApi(workspaceId: string, id: string) {
  const current = invoices.get(workspaceId, id)
  if (current?.payments?.length) throw new Error("This invoice has payments; issue a credit note instead")
  const invoice = await transition(workspaceId, id, [ClientInvoiceStatus.ISSUED, ClientInvoiceStatus.SENT], { status: ClientInvoiceStatus.VOID })
  releaseHours(workspaceId, invoice.id)
  auditInvoice(workspaceId, invoice, "Invoice cancelled", "invoice.voided", current!.status)
  return invoice
}

/**
 * Credit note for some or all lines of an issued invoice (BIL-10). With
 * `releaseHours`, the hours and expenses of credited lines become unbilled
 * again so they can be re-invoiced. The original invoice stays as it was.
 */
export async function createCreditNoteApi(
  workspaceId: string,
  invoiceId: string,
  input: { lineIds?: string[]; releaseHours: boolean; reason?: string }
): Promise<ClientInvoice> {
  const original = invoices.get(workspaceId, invoiceId)
  if (!original) throw new Error("Invoice not found")
  if (original.kind === InvoiceKind.CREDIT_NOTE) throw new Error("A credit note can't be credited")
  if (![ClientInvoiceStatus.ISSUED, ClientInvoiceStatus.SENT, ClientInvoiceStatus.PAID].includes(original.status)) {
    throw new Error("Only issued invoices can be credited")
  }
  const lines = original.lines.filter((l) => !input.lineIds || input.lineIds.includes(l.id))
  if (lines.length === 0) throw new Error("Pick at least one line to credit")
  const alreadyCredited = new Set(
    invoices
      .list(workspaceId)
      .filter((x) => x.creditNoteFor === invoiceId && x.status !== ClientInvoiceStatus.VOID)
      .flatMap((x) => x.lines.map((l) => l.id.replace(/^cn-/, "")))
  )
  if (lines.some((l) => alreadyCredited.has(l.id))) throw new Error("Some of these lines were already credited")
  const today = todayIso()
  await assertPeriodOpen(workspaceId, today)
  const draft = invoices.create(workspaceId, {
    number: "",
    kind: InvoiceKind.CREDIT_NOTE,
    creditNoteFor: original.id,
    clientId: original.clientId,
    currency: original.currency,
    exchangeRate: original.exchangeRate,
    exchangeRateDate: original.exchangeRateDate,
    issueDate: today,
    dueDate: today,
    status: ClientInvoiceStatus.DRAFT,
    // Same lines with a negative quantity; ids remember which line they credit
    lines: lines.map((l) => ({ ...l, id: `cn-${l.id}`, quantity: -l.quantity, timeEntryIds: [], expenseIds: [] })),
    taxRate: original.taxRate,
    withholdingRate: original.withholdingRate,
    notes: input.reason?.trim() || `Credit note for ${original.number}`,
  })
  const issued = await issueInvoiceApi(workspaceId, draft.id)
  if (input.releaseHours) {
    const entryIds = new Set(lines.flatMap((l) => l.timeEntryIds))
    for (const e of entries.list(workspaceId).filter((x) => x.invoiceId === invoiceId && entryIds.has(x.id))) {
      entries.update(workspaceId, e.id, { invoiceId: undefined })
    }
    const expenseIds = lines.flatMap((l) => l.expenseIds ?? [])
    if (expenseIds.length) releaseInvoiceExpenses(workspaceId, invoiceId, expenseIds)
  }
  return issued
}

/** Deletes a draft; its hours become available to invoice again. Issued invoices are never deleted (BR-5). */
export async function deleteInvoiceDraftApi(workspaceId: string, id: string) {
  const invoice = invoices.get(workspaceId, id)
  if (!invoice) return
  if (invoice.status !== ClientInvoiceStatus.DRAFT) throw new Error("Only drafts can be deleted; cancel an issued invoice instead")
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
