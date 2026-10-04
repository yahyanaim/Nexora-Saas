import { InvoiceStatus, type Invoice } from "@/types/invoices"
import type { Tone } from "./pdf-kit"
import { renderInvoiceDocument, type InvoiceDocument } from "./invoice-template"
import { getPdfTranslator } from "./pdf-i18n"
import { platformSeller, printPdf } from "./platform-docs"

const STATUS: Record<InvoiceStatus, { key: string; tone: Tone }> = {
  [InvoiceStatus.DRAFT]: { key: "draft", tone: "neutral" },
  [InvoiceStatus.PENDING]: { key: "pending", tone: "warning" },
  [InvoiceStatus.PAID]: { key: "paid", tone: "success" },
  [InvoiceStatus.OVERDUE]: { key: "overdue", tone: "danger" },
  [InvoiceStatus.CANCELLED]: { key: "cancelled", tone: "danger" },
}

/** Subscription invoice of the platform (Billing → Invoices) in the shared invoice layout. */
export async function buildSubscriptionInvoiceDocument(invoice: Invoice, locale = "en"): Promise<InvoiceDocument> {
  const { t, locale: loc } = await getPdfTranslator(locale)
  const platform = await platformSeller()
  const money = (n: number) => new Intl.NumberFormat(loc, { style: "currency", currency: "USD" }).format(n)
  const date = (iso: string) => new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso.length === 10 ? `${iso}T00:00:00` : iso))
  const status = STATUS[invoice.status] ?? STATUS[InvoiceStatus.PENDING]
  const isPaid = invoice.status === InvoiceStatus.PAID
  const method = (invoice.method ?? "stripe").replace(/[_-]/g, " ")
  return {
    ...platform,
    title: t("invoice"),
    number: invoice.invoiceNumber,
    status: { label: t(status.key), tone: status.tone },
    stamp: isPaid ? { text: t("paid"), tone: "success" } : invoice.status === InvoiceStatus.CANCELLED ? { text: t("cancelled"), tone: "danger" } : invoice.status === InvoiceStatus.DRAFT ? { text: t("draft"), tone: "neutral" } : undefined,
    buyer: { label: t("billTo"), name: invoice.user?.name ?? "—", lines: [invoice.user?.email, invoice.user?.id && `${t("pdfCustomerId")} ${invoice.user.id}`].filter(Boolean) as string[] },
    meta: [
      [t("issueDate"), date(invoice.date)],
      ...(invoice.dueDate ? ([[t("dueDate"), date(invoice.dueDate)]] as [string, string][]) : []),
      [t("paymentMethod"), method.replace(/\b\w/g, (c) => c.toUpperCase())],
      [t("currency"), "USD"],
    ],
    highlight: isPaid
      ? { label: t("pdfAmountPaid"), value: money(invoice.total), note: invoice.paidAt ? `${t("paid")} ${date(invoice.paidAt)}` : undefined }
      : { label: t("pdfAmountDue"), value: money(invoice.total), note: invoice.dueDate ? `${t("dueDate")} ${date(invoice.dueDate)}` : undefined },
    columns: { item: t("description"), quantity: t("quantity"), unitPrice: t("pdfUnitPrice"), amount: t("amount") },
    items: invoice.items.map((item) => ({ title: item.description, quantity: String(item.quantity), unitPrice: money(item.unitPrice), amount: money(item.quantity * item.unitPrice) })),
    totals: [
      { label: t("subtotal"), value: money(invoice.subtotal) },
      { label: `${t("pdfVat")} ${invoice.taxRate}%`, value: money(invoice.tax) },
      { label: t("total"), value: money(invoice.total), strong: true },
    ],
    due: isPaid || invoice.status === InvoiceStatus.CANCELLED ? undefined : { label: t("balanceDue"), value: money(invoice.total) },
    notes: invoice.notes ? { title: t("notes"), text: invoice.notes } : undefined,
    footer: { note: t("pdfThankYou"), legal: platform.legal, pageLabel: (page, total) => t("pdfPageOf", { page, total }) },
    filename: `${invoice.invoiceNumber}.pdf`,
  }
}

export async function generateInvoicePdf(invoice: Invoice, locale?: string): Promise<void> {
  await renderInvoiceDocument(await buildSubscriptionInvoiceDocument(invoice, locale))
}

export async function printInvoice(invoice: Invoice, locale?: string): Promise<void> {
  printPdf(await renderInvoiceDocument(await buildSubscriptionInvoiceDocument(invoice, locale), { save: false }))
}
