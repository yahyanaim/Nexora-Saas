import type { Client, Employee } from "@/types/workforce"
import { BudgetType, type WorkProject } from "@/types/work-projects"
import {
  ClientInvoiceStatus,
  TimeEntryStatus,
  type ClientInvoice,
  type ClientInvoiceDisplayStatus,
  type InvoiceLine,
  type TimeEntry,
} from "@/types/work-billing"
import { todayIso } from "./project-metrics"
import { rateOn } from "./rates"

// ---------- Dates ----------

function parseIso(iso: string) {
  return new Date(`${iso}T00:00:00`)
}

export function addDays(iso: string, days: number) {
  const d = parseIso(iso)
  d.setDate(d.getDate() + days)
  return todayIso(d)
}

/** Monday of the week containing `iso`. */
export function weekStart(iso: string) {
  const day = parseIso(iso).getDay() // 0 = Sunday
  return addDays(iso, day === 0 ? -6 : 1 - day)
}

/** The seven dates (Monday → Sunday) of the week starting on `monday`. */
export function weekDays(monday: string) {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

// ---------- Rates ----------

/**
 * Hourly price for an entry: the client's agreed rate, else the employee's
 * billable rate in force on the entry's date (BR-4).
 */
export function hourlyRate(employee: Employee | undefined, client: Client | undefined, date?: string) {
  if (client?.hourlyRate !== undefined) return client.hourlyRate
  if (!employee) return 0
  return date ? rateOn(employee, date).billableRate : employee.billableRate
}

/**
 * Approved, billable hours not yet invoiced, for hourly projects of a client.
 * Fixed-price and non-billable projects are invoiced another way (or not at all).
 */
export function unbilledEntries(entries: TimeEntry[], projects: WorkProject[], clientId?: string) {
  const hourlyProjects = new Map(
    projects
      .filter((p) => p.budgetType === BudgetType.HOURLY && p.clientId && (!clientId || p.clientId === clientId))
      .map((p) => [p.id, p])
  )
  return entries.filter(
    (e) => e.status === TimeEntryStatus.APPROVED && e.billable && !e.invoiceId && hourlyProjects.has(e.projectId)
  )
}

/** Value of unbilled hours per client id. */
export function unbilledValueByClient(
  entries: TimeEntry[],
  projects: WorkProject[],
  employees: Employee[],
  clients: Client[]
) {
  const totals = new Map<string, { hours: number; amount: number }>()
  for (const entry of unbilledEntries(entries, projects)) {
    const project = projects.find((p) => p.id === entry.projectId)!
    const client = clients.find((c) => c.id === project.clientId)
    const employee = employees.find((e) => e.id === entry.employeeId)
    const current = totals.get(project.clientId!) ?? { hours: 0, amount: 0 }
    current.hours += entry.hours
    current.amount += entry.hours * hourlyRate(employee, client, entry.date)
    totals.set(project.clientId!, current)
  }
  return totals
}

// ---------- Invoices ----------

/**
 * One invoice line per project and person, e.g. "ORB-01 · Lina Moreau",
 * with the hours as quantity and their rate as unit price.
 */
export function buildInvoiceLines(
  entries: TimeEntry[],
  projects: WorkProject[],
  employees: Employee[],
  client: Client | undefined,
  createLineId: () => string
): InvoiceLine[] {
  const groups = new Map<string, TimeEntry[]>()
  for (const entry of entries) {
    // A rate change inside the period starts a new line at the new price
    const employee = employees.find((e) => e.id === entry.employeeId)
    const key = `${entry.projectId}:${entry.employeeId}:${hourlyRate(employee, client, entry.date)}`
    groups.set(key, [...(groups.get(key) ?? []), entry])
  }
  return [...groups.values()].map((group) => {
    const first = group[0]!
    const project = projects.find((p) => p.id === first.projectId)
    const employee = employees.find((e) => e.id === first.employeeId)
    return {
      id: createLineId(),
      description: `${project ? `${project.code} · ${project.name}` : "Project"} — ${employee?.name ?? "Team member"}`,
      quantity: roundHours(group.reduce((sum, e) => sum + e.hours, 0)),
      unitPrice: hourlyRate(employee, client, first.date),
      projectId: first.projectId,
      timeEntryIds: group.map((e) => e.id),
    }
  })
}

export function roundHours(hours: number) {
  return Math.round(hours * 100) / 100
}

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100
}

export function invoiceTotals(invoice: Pick<ClientInvoice, "lines" | "taxRate">) {
  const subtotal = roundMoney(invoice.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0))
  const tax = roundMoney((subtotal * invoice.taxRate) / 100)
  return { subtotal, tax, total: roundMoney(subtotal + tax) }
}

/** Next number in the INV-<year>-<nnn> series for that year. */
export function nextInvoiceNumber(existing: string[], year: number) {
  const prefix = `INV-${year}-`
  const highest = existing
    .filter((n) => n.startsWith(prefix))
    .map((n) => Number(n.slice(prefix.length)))
    .filter(Number.isFinite)
    .reduce((max, n) => Math.max(max, n), 0)
  return `${prefix}${String(highest + 1).padStart(3, "0")}`
}

export function displayStatus(invoice: ClientInvoice, today = todayIso()): ClientInvoiceDisplayStatus {
  if (invoice.status === ClientInvoiceStatus.SENT && invoice.dueDate < today) return "overdue"
  return invoice.status
}
