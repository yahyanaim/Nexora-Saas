import type { Client, Workspace } from "@/types/workforce"
import { ClientInvoiceStatus, InvoiceKind, type ClientInvoice, type ClientInvoiceDisplayStatus } from "@/types/work-billing"
import type { WorkProject } from "@/types/work-projects"
import type { CompanySettings } from "@/types/work-settings"
import { displayStatus, invoiceTotals } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { companyLines, hexToRgb, legalLine, loadLogo, type Tone } from "./pdf-kit"
import { renderInvoiceDocument, type InvoiceDocument } from "./invoice-template"
import { getPdfTranslator } from "./pdf-i18n"

const STATUS: Record<ClientInvoiceDisplayStatus, { key: string; tone: Tone }> = {
  [ClientInvoiceStatus.DRAFT]: { key: "draft", tone: "neutral" },
  [ClientInvoiceStatus.ISSUED]: { key: "issued", tone: "info" },
  [ClientInvoiceStatus.SENT]: { key: "sent", tone: "info" },
  [ClientInvoiceStatus.PAID]: { key: "paid", tone: "success" },
  [ClientInvoiceStatus.VOID]: { key: "cancelled", tone: "danger" },
  overdue: { key: "overdue", tone: "danger" },
  partially_paid: { key: "partiallyPaid", tone: "warning" },
  credited: { key: "credited", tone: "neutral" },
}

export interface ClientInvoicePdfInput {
  invoice: ClientInvoice
  /** Every invoice of the workspace: credit notes and their originals */
  allInvoices?: ClientInvoice[]
  client?: Client
  workspace: Workspace
  /** Legal identity, contact and bank details (spec 12.3) */
  company?: CompanySettings
  projects?: WorkProject[]
  /** What the client still owes, after payments and credit notes */
  balance?: number
  locale: string
}

/** Maps a client invoice or credit note to the shared invoice layout (no file is saved). */
export async function buildClientInvoiceDocument(input: ClientInvoicePdfInput): Promise<InvoiceDocument> {
  const { invoice, client, workspace, company } = input
  const { t, locale } = await getPdfTranslator(input.locale)
  const money = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency: invoice.currency }).format(n)
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${iso}T00:00:00`))
  const hours = (n: number) => `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n)} h`

  const isCredit = invoice.kind === InvoiceKind.CREDIT_NOTE
  const status = displayStatus(invoice, todayIso(), input.allInvoices ?? [])
  const totals = invoiceTotals(invoice)
  const balance = input.balance ?? totals.total - totals.paid
  const isDraft = invoice.status === ClientInvoiceStatus.DRAFT
  const original = isCredit ? input.allInvoices?.find((x) => x.id === invoice.creditNoteFor) : undefined
  const sellerName = company?.tradeName || company?.legalName || workspace.name

  const meta: [string, string][] = [
    [t("issueDate"), date(invoice.issueDate)],
    ...(!isCredit ? ([[t("dueDate"), date(invoice.dueDate)]] as [string, string][]) : []),
    ...(client && !isCredit ? ([[t("pdfTerms"), t("pdfNetDays", { days: client.paymentTermsDays })]] as [string, string][]) : []),
    [t("currency"), invoice.currency],
    ...(original ? ([[t("pdfCorrects"), original.number]] as [string, string][]) : []),
  ]

  const highlight = isCredit
    ? { label: t("creditNote"), value: money(totals.total), note: original ? t("pdfCreditFor", { number: original.number }) : undefined }
    : status === ClientInvoiceStatus.PAID
      ? { label: t("pdfAmountPaid"), value: money(totals.total), note: invoice.paidAt ? `${t("paid")} ${date(invoice.paidAt.slice(0, 10))}` : undefined }
      : { label: t("pdfAmountDue"), value: money(balance), note: `${t("dueDate")} ${date(invoice.dueDate)}` }

  const projectOf = (id?: string) => input.projects?.find((p) => p.id === id)
  const items: InvoiceDocument["items"] = invoice.lines.map((l) => {
    const project = projectOf(l.projectId)
    const detail = [project && !l.description.includes(project.code) ? `${project.code} · ${project.name}` : undefined, l.timeEntryIds.length ? t("pdfTimeEntries", { count: l.timeEntryIds.length }) : undefined]
      .filter(Boolean)
      .join("  ·  ")
    return {
      title: l.description,
      detail: detail || undefined,
      quantity: l.timeEntryIds.length ? hours(l.quantity) : new Intl.NumberFormat(locale).format(l.quantity),
      unitPrice: money(l.unitPrice),
      tax: `${l.taxRate ?? invoice.taxRate}%`,
      amount: money(l.quantity * l.unitPrice),
    }
  })

  const rows: InvoiceDocument["totals"] = [
    { label: t("subtotal"), value: money(totals.subtotal) },
    ...totals.taxes.map((tx) => ({ label: `${t("pdfVat")} ${tx.rate}%  (${t("pdfOn")} ${money(tx.base)})`, value: money(tx.amount) })),
    ...(totals.withholding ? [{ label: `${t("withholding")} ${invoice.withholdingRate}%`, value: `-${money(totals.withholding)}` }] : []),
    { label: t("total"), value: money(totals.total), strong: true },
    ...(totals.paid ? [{ label: t("paid"), value: `-${money(totals.paid)}` }] : []),
  ]
  const credited = !isCredit ? Math.max(0, totals.total - totals.paid - balance) : 0
  if (credited > 0.005) rows.push({ label: t("credited"), value: `-${money(credited)}` })

  const bank: [string, string][] = [
    ...(company?.bankName ? ([[t("pdfBank"), company.bankName]] as [string, string][]) : []),
    ...(company?.bankAccount ? ([[t("pdfAccount"), company.bankAccount]] as [string, string][]) : []),
    ...(company?.bankSwift ? ([["SWIFT / BIC", company.bankSwift]] as [string, string][]) : []),
  ]

  return {
    brand: hexToRgb(company?.brandColor),
    logo: await loadLogo(company?.logoDataUrl),
    title: isCredit ? t("creditNote") : t("invoice"),
    number: invoice.number || t("draft"),
    status: { label: t(STATUS[status].key), tone: STATUS[status].tone },
    stamp: isDraft
      ? { text: t("draft"), tone: "neutral" }
      : invoice.status === ClientInvoiceStatus.VOID
        ? { text: t("cancelled"), tone: "danger" }
        : status === ClientInvoiceStatus.PAID
          ? { text: t("paid"), tone: "success" }
          : undefined,
    seller: { name: sellerName, lines: companyLines(company) },
    buyer: {
      label: t("billTo"),
      name: client?.name ?? "—",
      lines: [
        client?.legalName && client.legalName !== client.name ? client.legalName : undefined,
        client?.billingAddress ?? client?.address,
        client?.email,
        [client?.ice && `ICE ${client.ice}`, client?.taxId && `IF ${client.taxId}`].filter(Boolean).join("  ·  "),
      ].filter(Boolean) as string[],
    },
    meta,
    highlight,
    columns: { item: t("description"), quantity: t("quantity"), unitPrice: t("pdfUnitPrice"), tax: t("pdfVat"), amount: t("amount") },
    items,
    totals: rows,
    due: !isCredit && status !== ClientInvoiceStatus.PAID && invoice.status !== ClientInvoiceStatus.VOID ? { label: t("balanceDue"), value: money(balance) } : undefined,
    tables: [
      {
        title: t("pdfPaymentsReceived"),
        head: [t("date"), t("paymentMethod"), t("pdfReference"), t("amount")],
        rows: (invoice.payments ?? []).map((p) => [date(p.date), t(`method_${p.method}`), p.reference ?? "—", money(p.amount)]),
        alignRight: [3],
      },
    ],
    payment:
      bank.length && !isCredit
        ? { title: t("pdfPaymentDetails"), rows: [...bank, [t("pdfReference"), invoice.number || t("draft")]] }
        : undefined,
    notes: invoice.notes ? { title: t("notes"), text: invoice.notes } : undefined,
    smallPrint: [
      ...(invoice.exchangeRate && company && invoice.currency !== company.baseCurrency
        ? [`${t("pdfExchangeRate")}: 1 ${invoice.currency} = ${invoice.exchangeRate} ${company.baseCurrency}${invoice.exchangeRateDate ? ` (${date(invoice.exchangeRateDate)})` : ""}`]
        : []),
    ],
    footer: {
      note: company?.invoiceFooter,
      legal: legalLine(company, workspace.name),
      pageLabel: (page, total) => t("pdfPageOf", { page, total }),
    },
    filename: `${invoice.number || "draft"}${invoice.status === ClientInvoiceStatus.VOID ? "-cancelled" : ""}.pdf`,
  }
}

/** Builds and downloads a client invoice or credit note as a branded A4 PDF. */
export async function downloadClientInvoicePdf(input: ClientInvoicePdfInput) {
  await renderInvoiceDocument(await buildClientInvoiceDocument(input))
}
