import {
  ClientInvoiceStatus,
  InvoiceKind,
  PaymentMethod,
  TimeEntryStatus,
  type ClientInvoice,
  type TimeEntry,
} from "@/types/work-billing"
import { addDays, buildInvoiceLines, fiscalYearOf, invoiceTotals, weekStart } from "./billing"
import { todayIso } from "./project-metrics"
import { seedEmployees, seedClients, DEMO_WORKSPACES } from "./demo-seed"
import { seedProjects } from "./project-seed"
import { BudgetType } from "@/types/work-projects"

/** Who logs time where, and roughly how many hours per working day. */
const ASSIGNMENTS: Record<string, { employeeId: string; projectId: string; taskId?: string; hours: number }[]> = {
  ws_atlas: [
    { employeeId: "emp_lina", projectId: "prj_helio", taskId: "tsk_9", hours: 4 },
    { employeeId: "emp_lina", projectId: "prj_orbit", taskId: "tsk_4", hours: 4 },
    { employeeId: "emp_amina", projectId: "prj_helio", taskId: "tsk_10", hours: 3 },
    { employeeId: "emp_omar", projectId: "prj_orbit", taskId: "tsk_3", hours: 6 },
    { employeeId: "emp_karim", projectId: "prj_helio", hours: 2 },
  ],
  ws_northwind: [{ employeeId: "emp_chloe", projectId: "prj_lumen", taskId: "tsk_21", hours: 6 }],
}

const STAMP = "2026-01-05T09:00:00.000Z"

/**
 * The past year on finished projects, as offsets in days from today. It
 * stops before the recent weeks above, so the two never overlap.
 */
const HISTORY: Record<string, { employeeId: string; projectId: string; from: number; to: number; hours: number; billable?: boolean }[]> = {
  ws_atlas: [
    { employeeId: "emp_karim", projectId: "prj_kappa", from: -365, to: -190, hours: 3 },
    { employeeId: "emp_lina", projectId: "prj_kappa", from: -365, to: -190, hours: 4 },
    { employeeId: "emp_omar", projectId: "prj_kappa", from: -365, to: -190, hours: 5.5 },
    { employeeId: "emp_karim", projectId: "prj_orbit_mvp", from: -270, to: -50, hours: 2 },
    { employeeId: "emp_lina", projectId: "prj_orbit_mvp", from: -270, to: -50, hours: 4 },
    { employeeId: "emp_omar", projectId: "prj_orbit_mvp", from: -189, to: -50, hours: 6 },
    { employeeId: "emp_julia", projectId: "prj_orbit_mvp", from: -270, to: -100, hours: 3 },
    { employeeId: "emp_noah", projectId: "prj_orbit_mvp", from: -240, to: -50, hours: 4.5 },
    { employeeId: "emp_julia", projectId: "prj_medica_disc", from: -150, to: -45, hours: 4 },
    { employeeId: "emp_amina", projectId: "prj_medica_disc", from: -150, to: -45, hours: 3 },
    { employeeId: "emp_karim", projectId: "prj_helio_audit", from: -120, to: -45, hours: 2 },
    { employeeId: "emp_amina", projectId: "prj_helio_audit", from: -120, to: -45, hours: 2 },
    // The current projects started before the recent weeks too
    { employeeId: "emp_lina", projectId: "prj_orbit", from: -45, to: -1, hours: 4 },
    { employeeId: "emp_omar", projectId: "prj_orbit", from: -45, to: -1, hours: 6 },
    { employeeId: "emp_noah", projectId: "prj_orbit", from: -45, to: -1, hours: 4 },
    { employeeId: "emp_julia", projectId: "prj_orbit", from: -40, to: -1, hours: 2.5 },
    { employeeId: "emp_lina", projectId: "prj_helio", from: -60, to: -1, hours: 3 },
    { employeeId: "emp_karim", projectId: "prj_helio", from: -60, to: -1, hours: 2 },
    { employeeId: "emp_amina", projectId: "prj_helio", from: -44, to: -1, hours: 2.5 },
    { employeeId: "emp_julia", projectId: "prj_site", from: -120, to: -25, hours: 1, billable: false },
    { employeeId: "emp_emma", projectId: "prj_site", from: -120, to: -25, hours: 2.5, billable: false },
  ],
  ws_northwind: [
    { employeeId: "emp_mateo", projectId: "prj_lumen_brand", from: -300, to: -40, hours: 3 },
    { employeeId: "emp_chloe", projectId: "prj_lumen_brand", from: -300, to: -40, hours: 5 },
    { employeeId: "emp_chloe", projectId: "prj_lumen", from: -20, to: -1, hours: 5 },
  ],
}

const quarter = (n: number) => Math.round(n * 4) / 4

/** Approved, invoiced hours for the past year, and the monthly invoices that billed them. */
function buildHistory(workspaceId: string, before: string) {
  const today = todayIso()
  const employees = seedEmployees(workspaceId)
  const projects = seedProjects(workspaceId)
  const clients = seedClients(workspaceId)
  const entries: TimeEntry[] = []
  for (const [index, a] of (HISTORY[workspaceId] ?? []).entries()) {
    const person = employees.find((e) => e.id === a.employeeId)
    const days = person?.workingDays ?? [1, 2, 3, 4, 5]
    const span = a.to - a.from
    for (let offset = a.from; offset <= a.to; offset++) {
      const date = addDays(today, offset)
      if (date >= before || (person?.hireDate && date < person.hireDate)) continue
      if (!days.includes(new Date(`${date}T00:00:00`).getDay())) continue
      // Busier as the year goes on, with a little day-to-day noise
      const ramp = 0.8 + 0.3 * ((offset - a.from) / Math.max(1, span))
      const noise = (((offset * 7 + index * 3) % 5) - 2) * 0.25
      const hours = Math.max(0.5, quarter(a.hours * ramp + noise))
      entries.push({
        id: `te_h_${a.employeeId}_${a.projectId}_${date}`,
        workspaceId,
        employeeId: a.employeeId,
        projectId: a.projectId,
        date,
        hours,
        billable: a.billable ?? true,
        status: TimeEntryStatus.APPROVED,
        approvedAt: `${date}T18:00:00.000Z`,
        createdAt: STAMP,
        updatedAt: STAMP,
      })
    }
  }

  // One invoice per client and month, issued on the 1st of the next month
  const groups = new Map<string, TimeEntry[]>()
  for (const e of entries) {
    if (!e.billable) continue
    const project = projects.find((p) => p.id === e.projectId)
    // Only hourly work is invoiced from hours; fixed-price projects bill shares of the price
    const clientId = project?.budgetType === BudgetType.HOURLY ? project.clientId : undefined
    if (!clientId) continue
    const key = `${clientId}|${e.date.slice(0, 7)}`
    groups.set(key, [...(groups.get(key) ?? []), e])
  }
  const invoices: ClientInvoice[] = []
  if (groups.size === 0) return { entries, invoices }
  const currency = DEMO_WORKSPACES.find((w) => w.id === workspaceId)?.currency ?? "EUR"
  for (const [key, billed] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const [clientId, month] = key.split("|") as [string, string]
    const [y, m] = month.split("-").map(Number) as [number, number]
    const issueDate = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`
    if (issueDate > today) continue
    const client = clients.find((c) => c.id === clientId)
    const id = `inv_h_${clientId}_${month}`
    let line = 0
    const invoice: ClientInvoice = {
      id,
      workspaceId,
      number: "",
      clientId,
      currency,
      issueDate,
      dueDate: addDays(issueDate, client?.paymentTermsDays ?? 30),
      status: ClientInvoiceStatus.SENT,
      lines: buildInvoiceLines(billed, projects, employees, client, () => `ln_${id}_${++line}`),
      taxRate: 20,
      sentAt: `${issueDate}T09:00:00.000Z`,
      kind: InvoiceKind.HOURS,
      issuedAt: `${issueDate}T09:00:00.000Z`,
      fiscalYear: fiscalYearOf(issueDate),
      createdAt: STAMP,
      updatedAt: STAMP,
    }
    for (const e of billed) e.invoiceId = id
    invoices.push(invoice)
  }

  // The fixed-price project billed its first 30% at kick-off
  const fleet = projects.find((p) => p.id === "prj_orbit")
  if (fleet?.budgetAmount && workspaceId === "ws_atlas") {
    const issueDate = addDays(today, -40)
    const orbit = clients.find((c) => c.id === "cli_orbit")
    invoices.push({
      id: "inv_h_orbit_fixed_1",
      workspaceId,
      number: "",
      clientId: "cli_orbit",
      currency,
      issueDate,
      dueDate: addDays(issueDate, orbit?.paymentTermsDays ?? 30),
      status: ClientInvoiceStatus.SENT,
      lines: [{ id: "ln_orbit_fixed_1", description: `${fleet.code} · ${fleet.name} — 30% of the fixed price`, quantity: 1, unitPrice: Math.round(fleet.budgetAmount * 0.3), projectId: fleet.id, timeEntryIds: [], budgetLine: true }],
      taxRate: 20,
      sentAt: `${issueDate}T09:00:00.000Z`,
      kind: InvoiceKind.FIXED,
      issuedAt: `${issueDate}T09:00:00.000Z`,
      fiscalYear: fiscalYearOf(issueDate),
      createdAt: STAMP,
      updatedAt: STAMP,
    })
  }

  // Older invoices were paid, a few days either side of the due date. The
  // latest ones are still open, so receivables and the aging have content.
  const latest = new Map<string, string[]>()
  for (const inv of [...invoices].sort((a, b) => b.issueDate.localeCompare(a.issueDate))) {
    latest.set(inv.clientId, [...(latest.get(inv.clientId) ?? []), inv.id])
  }
  for (const [n, inv] of invoices.entries()) {
    const rank = latest.get(inv.clientId)!.indexOf(inv.id)
    const total = invoiceTotals(inv).total
    const open = (inv.clientId === "cli_medica" && rank <= 1) || ((inv.clientId === "cli_orbit" || inv.clientId === "cli_helio") && rank === 0 && inv.kind === InvoiceKind.HOURS)
    if (open) {
      // Medica paid half of its latest invoice
      if (inv.clientId === "cli_medica" && rank === 0) {
        inv.payments = [{ id: `pay_${inv.id}`, date: addDays(inv.issueDate, 20), amount: Math.round(total / 2), method: PaymentMethod.BANK_TRANSFER, reference: `VIR-${inv.issueDate.slice(0, 7)}` }]
      }
      continue
    }
    const paidOn = addDays(inv.dueDate, ((n * 5) % 15) - 9)
    const date = paidOn > today ? today : paidOn
    inv.status = ClientInvoiceStatus.PAID
    inv.paidAt = `${date}T09:00:00.000Z`
    inv.payments = [{ id: `pay_${inv.id}`, date, amount: total, method: n % 4 === 0 ? PaymentMethod.CHEQUE : PaymentMethod.BANK_TRANSFER, reference: `VIR-${inv.issueDate.slice(0, 7)}-${n + 1}` }]
  }
  return { entries, invoices }
}

/** Numbers issued invoices in date order, gapless within each fiscal year (BR-12). */
function numberInvoices(invoices: ClientInvoice[]) {
  const seq = new Map<number, number>()
  for (const inv of [...invoices].sort((a, b) => a.issueDate.localeCompare(b.issueDate) || a.id.localeCompare(b.id))) {
    const year = inv.fiscalYear ?? fiscalYearOf(inv.issueDate)
    const next = (seq.get(year) ?? 0) + 1
    seq.set(year, next)
    inv.number = `INV-${year}-${String(next).padStart(3, "0")}`
  }
  return invoices
}

/**
 * Three past weeks plus this one: the oldest is approved and invoiced, the
 * next approved but unbilled, last week submitted, this week a draft.
 */
function build(workspaceId: string) {
  const thisMonday = weekStart(todayIso())
  const weeks: { monday: string; status: TimeEntryStatus }[] = [
    { monday: addDays(thisMonday, -21), status: TimeEntryStatus.APPROVED },
    { monday: addDays(thisMonday, -14), status: TimeEntryStatus.APPROVED },
    { monday: addDays(thisMonday, -7), status: TimeEntryStatus.SUBMITTED },
    { monday: thisMonday, status: TimeEntryStatus.DRAFT },
  ]
  const today = todayIso()
  const entries: TimeEntry[] = []
  for (const [weekIndex, week] of weeks.entries()) {
    for (const a of ASSIGNMENTS[workspaceId] ?? []) {
      for (let day = 0; day < 5; day++) {
        const date = addDays(week.monday, day)
        if (date > today) continue
        // Small day-to-day variation keeps the demo believable
        const hours = Math.max(1, a.hours + ((day + weekIndex) % 3) - 1)
        entries.push({
          id: `te_${a.employeeId}_${a.projectId}_${date}`,
          workspaceId,
          employeeId: a.employeeId,
          projectId: a.projectId,
          taskId: a.taskId,
          date,
          hours,
          billable: true,
          status: week.status,
          createdAt: STAMP,
          updatedAt: STAMP,
        })
      }
    }
  }

  // The oldest week of Helio hours was invoiced and paid
  const invoices: ClientInvoice[] = []
  if (workspaceId === "ws_atlas") {
    const oldest = weeks[0]!.monday
    const billed = entries.filter((e) => e.projectId === "prj_helio" && e.date < addDays(oldest, 7))
    const client = seedClients(workspaceId).find((c) => c.id === "cli_helio")
    let line = 0
    const issueDate = addDays(oldest, 7)
    const invoiceId = "inv_seed_1"
    invoices.push({
      id: invoiceId,
      workspaceId,
      number: `INV-${issueDate.slice(0, 4)}-001`,
      clientId: "cli_helio",
      currency: DEMO_WORKSPACES.find((w) => w.id === workspaceId)!.currency,
      issueDate,
      dueDate: addDays(issueDate, client?.paymentTermsDays ?? 30),
      status: ClientInvoiceStatus.PAID,
      lines: buildInvoiceLines(billed, seedProjects(workspaceId), seedEmployees(workspaceId), client, () => `ln_seed_${++line}`),
      taxRate: 20,
      sentAt: `${issueDate}T09:00:00.000Z`,
      paidAt: `${addDays(issueDate, 12)}T09:00:00.000Z`,
      kind: InvoiceKind.HOURS,
      issuedAt: `${issueDate}T09:00:00.000Z`,
      fiscalYear: Number(issueDate.slice(0, 4)),
      createdAt: STAMP,
      updatedAt: STAMP,
    })
    for (const entry of billed) entry.invoiceId = invoiceId
    // Record the payment that settled it, so payment history and "paid in 30 days" add up
    const seeded = invoices[0]!
    seeded.payments = [{ id: "pay_seed_1", date: addDays(issueDate, 12), amount: invoiceTotals(seeded).total, method: PaymentMethod.BANK_TRANSFER, reference: "VIR-2026-0412" }]
  }

  const history = buildHistory(workspaceId, weeks[0]!.monday)
  return { entries: [...history.entries, ...entries], invoices: numberInvoices([...history.invoices, ...invoices]) }
}

export function seedTimeEntries(workspaceId: string): TimeEntry[] {
  return build(workspaceId).entries
}

export function seedClientInvoices(workspaceId: string): ClientInvoice[] {
  return build(workspaceId).invoices
}
