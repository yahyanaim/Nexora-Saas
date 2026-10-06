import { FLAT_UNIT, QuoteStatus, type Quote, type QuoteInput } from "@/types/work-quotes"
import { InvoiceKind, type ClientInvoice } from "@/types/work-billing"
import { BudgetType, Priority, WorkProjectStatus, type WorkProject } from "@/types/work-projects"
import { createCollection, createId } from "@/lib/workforce/demo-store"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { nextQuoteNumber, quoteProblem, quoteToInvoiceLines, quoteTotals } from "@/lib/workforce/quotes"
import { recordAudit } from "@/lib/workforce/audit"
import { getSettingsApi } from "./settings-api"
import { listClientsApi } from "./clients-api"
import { createInvoiceApi } from "./work-billing-api"
import { createProjectApi, listProjectsApi } from "./work-projects-api"

const STAMP = "2026-01-05T09:00:00.000Z"

/** Sample quotes in every state so the pipeline has something to show. */
function seedQuotes(workspaceId: string): Quote[] {
  const today = todayIso()
  const l = (id: string, description: string, quantity: number, unit: string, unitPrice: number) => ({ id, description, quantity, unit, unitPrice })
  const rows: Omit<Quote, "workspaceId" | "createdAt" | "updatedAt">[] =
    workspaceId === "ws_atlas"
      ? [
          {
            id: "quo_1", number: "DEV-2026-004", clientId: "cli_vela", currency: "MAD", issueDate: addDays(today, -6), validUntil: addDays(today, 24), deliveryDate: addDays(today, 60),
            subject: "Online store for Vela Retail: design, development and launch", taxRate: 20, discountRate: 5, status: QuoteStatus.SENT, sentAt: addDays(today, -6),
            notes: "Payment: 40% on order, 60% on delivery, by bank transfer.",
            lines: [l("q1a", "UX workshop and wireframes", 3, "days", 6500), l("q1b", "Visual design of key pages", 6, "pages", 4200), l("q1c", "Store development and payment integration", 18, "days", 6000), l("q1d", "Launch support and training", 1, FLAT_UNIT, 900)],
          },
          {
            id: "quo_2", number: "DEV-2026-003", clientId: "cli_helio", currency: "MAD", issueDate: addDays(today, -20), validUntil: addDays(today, 10),
            subject: "Helio energy dashboard: phase 2 forecasting module", taxRate: 20, discountRate: 0, status: QuoteStatus.ACCEPTED, sentAt: addDays(today, -20), decidedAt: addDays(today, -12),
            lines: [l("q2a", "Forecasting model and API", 12, "days", 6500), l("q2b", "Dashboard screens", 4, "pages", 5000)],
          },
          {
            id: "quo_3", number: "DEV-2026-002", clientId: "cli_medica", currency: "MAD", issueDate: addDays(today, -48), validUntil: addDays(today, -18),
            subject: "Medica patient app: offline mode", taxRate: 20, discountRate: 0, status: QuoteStatus.SENT, sentAt: addDays(today, -48),
            lines: [l("q3a", "Offline storage and sync", 10, "days", 6000)],
          },
          {
            id: "quo_4", number: "DEV-2026-001", clientId: "cli_orbit", currency: "MAD", issueDate: addDays(today, -70), validUntil: addDays(today, -40),
            subject: "Orbit fleet portal: native mobile apps", taxRate: 20, discountRate: 0, status: QuoteStatus.DECLINED, sentAt: addDays(today, -70), decidedAt: addDays(today, -52), declineReason: "Budget postponed to next year",
            lines: [l("q4a", "iOS and Android apps", 30, "days", 6200)],
          },
          {
            id: "quo_5", number: "", clientId: "cli_orbit", currency: "MAD", issueDate: today, validUntil: addDays(today, 30),
            subject: "Orbit fleet portal: driver training videos", taxRate: 20, discountRate: 0, status: QuoteStatus.DRAFT,
            lines: [l("q5a", "Script and storyboard", 1, FLAT_UNIT, 1200), l("q5b", "Video production", 4, "videos", 9500)],
          },
        ]
      : workspaceId === "ws_northwind"
        ? [
            {
              id: "quo_10", number: "NWQ-2026-001", clientId: "cli_peak", currency: "USD", issueDate: addDays(today, -4), validUntil: addDays(today, 26),
              subject: "Peak Outdoors summer campaign: hero film and social cut-downs", taxRate: 0, discountRate: 0, status: QuoteStatus.SENT, sentAt: addDays(today, -4),
              lines: [l("q10a", "Pre-production and casting", 1, FLAT_UNIT, 450), l("q10b", "Shoot days", 2, "days", 6800), l("q10c", "Edit and grade", 6, "days", 1100)],
            },
          ]
        : []
  return rows.map((r) => ({ ...r, workspaceId, createdAt: STAMP, updatedAt: STAMP }))
}

/**
 * Quotes (devis). Backed by the browser demo store for now; replace the bodies
 * with apiClient calls once the backend exists.
 */
const quotes = createCollection<Quote>("quotes", "quo", seedQuotes)

function audit(workspaceId: string, quote: Quote, action: string, key: string, before?: string, after?: string) {
  recordAudit(workspaceId, { action, actionKey: key, category: "Billing", target: `${quote.number || "Draft quote"} · ${quote.subject}`, before, after })
}

function clean(input: QuoteInput): QuoteInput {
  return {
    ...input,
    subject: input.subject.trim(),
    notes: input.notes?.trim() || undefined,
    deliveryDate: input.deliveryDate || undefined,
    contactId: input.contactId || undefined,
    lines: input.lines.map((l) => ({ ...l, description: l.description.trim(), unit: l.unit?.trim() || undefined, quantity: l.unit === FLAT_UNIT ? 1 : l.quantity })),
  }
}

async function validate(workspaceId: string, input: QuoteInput) {
  const problem = quoteProblem(input)
  if (problem) throw new Error(problem)
  if (!(await listClientsApi(workspaceId)).some((c) => c.id === input.clientId)) throw new Error("Client not found")
}

function get(workspaceId: string, id: string) {
  const quote = quotes.get(workspaceId, id)
  if (!quote) throw new Error("Quote not found")
  return quote
}

export async function listQuotesApi(workspaceId: string): Promise<Quote[]> {
  return quotes.list(workspaceId).sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.number.localeCompare(a.number))
}

export async function createQuoteApi(workspaceId: string, input: QuoteInput): Promise<Quote> {
  const data = clean(input)
  await validate(workspaceId, data)
  const quote = quotes.create(workspaceId, { ...data, number: "", status: QuoteStatus.DRAFT })
  audit(workspaceId, quote, "Quote created", "quote.created")
  return quote
}

/** Drafts can be fully edited; once sent, a quote is changed by duplicating it. */
export async function updateQuoteApi(workspaceId: string, id: string, input: QuoteInput): Promise<Quote> {
  const quote = get(workspaceId, id)
  if (quote.status !== QuoteStatus.DRAFT) throw new Error("Only draft quotes can be edited; duplicate it to make a new version")
  const data = clean(input)
  await validate(workspaceId, data)
  return quotes.update(workspaceId, id, data)
}

/** Gives the quote its number and marks it sent to the client. */
export async function sendQuoteApi(workspaceId: string, id: string): Promise<Quote> {
  const quote = get(workspaceId, id)
  if (quote.status !== QuoteStatus.DRAFT && quote.status !== QuoteStatus.SENT) throw new Error("This quote has already been answered")
  if (!quote.lines.length) throw new Error("Add at least one line first")
  const { company } = await getSettingsApi(workspaceId)
  const number = quote.number || nextQuoteNumber(quotes.list(workspaceId), quote.issueDate, company.quoteNumberFormat || "DEV-{YYYY}-{SEQ}", company.fiscalYearStartMonth)
  const sent = quotes.update(workspaceId, id, { number, status: QuoteStatus.SENT, sentAt: quote.sentAt ?? todayIso() })
  audit(workspaceId, sent, "Quote sent", "quote.sent", quote.status, QuoteStatus.SENT)
  return sent
}

export async function acceptQuoteApi(workspaceId: string, id: string): Promise<Quote> {
  const quote = get(workspaceId, id)
  if (quote.status !== QuoteStatus.SENT) throw new Error("Only a sent quote can be accepted")
  const accepted = quotes.update(workspaceId, id, { status: QuoteStatus.ACCEPTED, decidedAt: todayIso(), declineReason: undefined })
  audit(workspaceId, accepted, "Quote accepted", "quote.accepted", QuoteStatus.SENT, QuoteStatus.ACCEPTED)
  return accepted
}

export async function declineQuoteApi(workspaceId: string, id: string, reason: string): Promise<Quote> {
  const quote = get(workspaceId, id)
  if (quote.status !== QuoteStatus.SENT) throw new Error("Only a sent quote can be declined")
  if (!reason.trim()) throw new Error("Give the reason the client declined")
  const declined = quotes.update(workspaceId, id, { status: QuoteStatus.DECLINED, decidedAt: todayIso(), declineReason: reason.trim() })
  audit(workspaceId, declined, "Quote declined", "quote.declined", QuoteStatus.SENT, `${QuoteStatus.DECLINED}: ${reason.trim()}`)
  return declined
}

/** A new draft with the same content and fresh dates: the way to revise a sent quote. */
export async function duplicateQuoteApi(workspaceId: string, id: string): Promise<Quote> {
  const quote = get(workspaceId, id)
  const today = todayIso()
  const validity = Math.max(1, Math.round((Date.parse(quote.validUntil) - Date.parse(quote.issueDate)) / 86_400_000))
  return createQuoteApi(workspaceId, {
    clientId: quote.clientId,
    contactId: quote.contactId,
    currency: quote.currency,
    issueDate: today,
    validUntil: addDays(today, validity),
    deliveryDate: undefined,
    subject: quote.subject,
    lines: quote.lines.map((l) => ({ ...l, id: createId("ql") })),
    taxRate: quote.taxRate,
    discountRate: quote.discountRate,
    notes: quote.notes,
  })
}

export async function deleteQuoteApi(workspaceId: string, id: string): Promise<void> {
  const quote = get(workspaceId, id)
  if (quote.status !== QuoteStatus.DRAFT) throw new Error("Only draft quotes can be deleted; sent quotes are kept for the record")
  quotes.remove(workspaceId, id)
}

/**
 * Creates a fixed-price project from an accepted quote: budget = the quote
 * total before VAT, due on the delivery date.
 */
export async function createProjectFromQuoteApi(workspaceId: string, id: string, input: { code: string; managerId?: string }): Promise<WorkProject> {
  const quote = get(workspaceId, id)
  if (quote.status !== QuoteStatus.ACCEPTED) throw new Error("Accept the quote before creating its project")
  if (quote.projectId) throw new Error("This quote already has a project")
  const code = input.code.trim().toUpperCase()
  if (code.length < 2) throw new Error("Give the project a code")
  if ((await listProjectsApi(workspaceId)).some((p) => p.code.toUpperCase() === code)) throw new Error("This project code is already used")
  const project = await createProjectApi(workspaceId, {
    code,
    name: quote.subject.slice(0, 80),
    description: `${quote.number} · ${quote.subject}`,
    clientId: quote.clientId,
    managerId: input.managerId,
    memberIds: input.managerId ? [input.managerId] : [],
    status: WorkProjectStatus.PLANNING,
    priority: Priority.MEDIUM,
    startDate: todayIso(),
    dueDate: quote.deliveryDate,
    budgetType: BudgetType.FIXED,
    budgetAmount: quoteTotals(quote).net,
  })
  quotes.update(workspaceId, id, { projectId: project.id })
  audit(workspaceId, quote, "Project created from quote", "quote.project", undefined, project.code)
  return project
}

/** Turns an accepted quote into a draft invoice with the same lines, discount and project description. */
export async function convertQuoteToInvoiceApi(workspaceId: string, id: string, discountLabel = "Discount"): Promise<ClientInvoice> {
  const quote = get(workspaceId, id)
  if (quote.status !== QuoteStatus.ACCEPTED) throw new Error("Only an accepted quote can be invoiced")
  if (quote.invoiceId) throw new Error("This quote has already been invoiced")
  const invoice = await createInvoiceApi(workspaceId, {
    kind: InvoiceKind.FREE,
    clientId: quote.clientId,
    taxRate: quote.taxRate,
    notes: quote.notes,
    subject: quote.subject,
    quoteId: quote.id,
    lines: quoteToInvoiceLines(quote, () => createId("ln"), discountLabel, quote.projectId),
  })
  quotes.update(workspaceId, id, { invoiceId: invoice.id })
  audit(workspaceId, quote, "Quote invoiced", "quote.invoiced", QuoteStatus.ACCEPTED, "invoiced")
  return invoice
}
