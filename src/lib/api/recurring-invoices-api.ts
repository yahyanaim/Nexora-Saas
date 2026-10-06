import { createCollection } from "@/lib/workforce/demo-store"
import { todayIso } from "@/lib/workforce/project-metrics"
import { recordAudit } from "@/lib/workforce/audit"
import { dueSchedules, nextRunAfter, periodLabel, scheduleFinished } from "@/lib/workforce/client-relations"
import { InvoiceKind, type ClientInvoice } from "@/types/work-billing"
import { RecurringFrequency, type RecurringInput, type RecurringInvoice } from "@/types/work-crm"
import { createInvoiceApi } from "./work-billing-api"

const STAMP = "2026-01-01T00:00:00.000Z"

function seedRecurring(workspaceId: string): RecurringInvoice[] {
  const t = todayIso()
  const firstOfMonth = `${t.slice(0, 7)}-01`
  const rows: Omit<RecurringInvoice, "workspaceId" | "createdAt" | "updatedAt">[] =
    workspaceId === "ws_atlas"
      ? [
          {
            id: "rec_1", clientId: "cli_helio", projectId: "prj_helio", title: "Dashboard hosting and support", frequency: RecurringFrequency.MONTHLY,
            startDate: "2026-01-01", nextRunDate: firstOfMonth, taxRate: 20, active: true, invoiceIds: [],
            lines: [{ id: "rl1", description: "Hosting and monitoring", quantity: 1, unit: "month", unitPrice: 4500 }, { id: "rl2", description: "Support hours included", quantity: 8, unit: "h", unitPrice: 950 }],
          },
          {
            id: "rec_2", clientId: "cli_orbit", title: "Portal licence", frequency: RecurringFrequency.YEARLY,
            startDate: "2026-03-01", nextRunDate: "2027-03-01", taxRate: 20, active: true, invoiceIds: [],
            lines: [{ id: "rl3", description: "Annual portal licence", quantity: 1, unit: "year", unitPrice: 36000 }],
          },
        ]
      : workspaceId === "ws_northwind"
        ? [
            {
              id: "rec_10", clientId: "cli_lumen", title: "Content retainer", frequency: RecurringFrequency.MONTHLY,
              startDate: "2026-06-01", nextRunDate: firstOfMonth, taxRate: 0, active: true, invoiceIds: [],
              lines: [{ id: "rl10", description: "Monthly social content package", quantity: 1, unit: "month", unitPrice: 6000 }],
            },
          ]
        : []
  return rows.map((r) => ({ ...r, workspaceId, createdAt: STAMP, updatedAt: STAMP }))
}

/**
 * Recurring invoices (BIL-14). Each run drafts an invoice for review; nothing
 * is issued without a person. Browser demo store for now.
 */
const schedules = createCollection<RecurringInvoice>("recurring-invoices", "rec", seedRecurring)

export async function listRecurringApi(workspaceId: string): Promise<RecurringInvoice[]> {
  return schedules.list(workspaceId)
}

function validate(input: RecurringInput) {
  if (!input.title.trim()) throw new Error("Give the schedule a name")
  if (!input.clientId) throw new Error("Pick a client")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) throw new Error("Pick a start date")
  if (input.endDate && input.endDate < input.startDate) throw new Error("The end date is before the start date")
  if (input.taxRate < 0 || input.taxRate > 100) throw new Error("Tax must be between 0 and 100%")
  if (!input.lines.length || input.lines.some((l) => !l.description.trim() || !(l.quantity > 0) || !(l.unitPrice >= 0))) {
    throw new Error("Each line needs a description, a quantity and a price")
  }
}

export async function saveRecurringApi(workspaceId: string, input: RecurringInput, id?: string): Promise<RecurringInvoice> {
  validate(input)
  const clean = { ...input, title: input.title.trim() }
  if (id) {
    const current = schedules.get(workspaceId, id)
    if (!current) throw new Error("Schedule not found")
    // A new start date resets the next run only when nothing was drafted yet
    const nextRunDate = current.invoiceIds.length ? current.nextRunDate : clean.startDate
    return schedules.update(workspaceId, id, { ...clean, nextRunDate })
  }
  const saved = schedules.create(workspaceId, { ...clean, nextRunDate: clean.startDate, invoiceIds: [] })
  recordAudit(workspaceId, { action: "Recurring invoice created", actionKey: "invoice.recurring", category: "Billing", target: saved.title })
  return saved
}

export async function setRecurringActiveApi(workspaceId: string, id: string, active: boolean) {
  return schedules.update(workspaceId, id, { active })
}

export async function deleteRecurringApi(workspaceId: string, id: string) {
  schedules.remove(workspaceId, id)
}

/** Drafts this period's invoice and moves the schedule to the next period. */
export async function runRecurringApi(workspaceId: string, id: string): Promise<ClientInvoice> {
  const s = schedules.get(workspaceId, id)
  if (!s) throw new Error("Schedule not found")
  if (!s.active) throw new Error("This schedule is paused")
  if (scheduleFinished(s)) throw new Error("This schedule has ended")
  const period = periodLabel(s.nextRunDate, s.frequency)
  const invoice = await createInvoiceApi(workspaceId, {
    kind: InvoiceKind.FREE,
    clientId: s.clientId,
    issueDate: s.nextRunDate > todayIso() ? todayIso() : s.nextRunDate,
    taxRate: s.taxRate,
    notes: s.notes,
    subject: `${s.title} · ${period}`,
    recurringId: s.id,
    lines: s.lines.map((l, i) => ({
      id: `${s.id}-${period}-${i}`,
      description: `${l.description} · ${period}`,
      quantity: l.quantity,
      unit: l.unit,
      unitPrice: l.unitPrice,
      projectId: s.projectId,
      timeEntryIds: [],
    })),
  })
  schedules.update(workspaceId, id, { nextRunDate: nextRunAfter(s.nextRunDate, s.frequency), invoiceIds: [...s.invoiceIds, invoice.id] })
  recordAudit(workspaceId, { action: "Recurring invoice drafted", actionKey: "invoice.recurring_run", category: "Billing", target: `${s.title} · ${period}` })
  return invoice
}

/** Drafts every schedule that is due today or earlier (one period each). */
export async function runDueRecurringApi(workspaceId: string, today = todayIso()): Promise<number> {
  const due = dueSchedules(schedules.list(workspaceId), today)
  for (const s of due) await runRecurringApi(workspaceId, s.id)
  return due.length
}
