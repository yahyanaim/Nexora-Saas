import {
  ClientInvoiceStatus,
  TimeEntryStatus,
  type ClientInvoice,
  type TimeEntry,
} from "@/types/work-billing"
import { addDays, buildInvoiceLines, weekStart } from "./billing"
import { todayIso } from "./project-metrics"
import { seedEmployees, seedClients, DEMO_WORKSPACES } from "./demo-seed"
import { seedProjects } from "./project-seed"

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
      createdAt: STAMP,
      updatedAt: STAMP,
    })
    for (const entry of billed) entry.invoiceId = invoiceId
  }

  return { entries, invoices }
}

export function seedTimeEntries(workspaceId: string): TimeEntry[] {
  return build(workspaceId).entries
}

export function seedClientInvoices(workspaceId: string): ClientInvoice[] {
  return build(workspaceId).invoices
}
