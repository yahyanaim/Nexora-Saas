import type { CustomerAccount } from "@/types/platform-customers"
import type { NxCreditNote, NxInvoice, NxPayment } from "@/types/platform-billing"
import type { SellerSnapshot } from "@/types/platform-config"
import { clean, DEFAULT_BRAND, loadLogo } from "./pdf-kit"
import { renderInvoiceDocument, type InvoiceDocument } from "./invoice-template"
import { getPdfTranslator } from "./pdf-i18n"
import { printPdf } from "./platform-docs"

/**
 * Nexora's own invoices and credit notes to its customers (INV-02, INV-05):
 * both parties' legal identifiers, lines with VAT per rate, payments received
 * and Nexora's bank details. The seller is the identity the invoice was issued
 * with (CFG-04), never today's.
 */

type Ctx = { customer?: CustomerAccount; seller: SellerSnapshot; locale: string }

async function base(ctx: Ctx) {
  const { t, locale } = await getPdfTranslator(ctx.locale)
  const money = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "MAD" }).format(n)
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${iso.slice(0, 10)}T00:00:00`))
  const s = ctx.seller
  const c = ctx.customer
  const seller = {
    name: s.legalName,
    lines: [
      [s.address, s.city, s.country].filter(Boolean).join(", "),
      [`ICE ${s.ice}`, `IF ${s.taxId}`, `RC ${s.rc}`].join("  ·  "),
      [s.patente && `TP ${s.patente}`, s.cnss && `CNSS ${s.cnss}`].filter(Boolean).join("  ·  "),
    ].filter(Boolean),
  }
  const buyerLines = c
    ? [
        [c.address, c.city, c.country].filter(Boolean).join(", "),
        c.ice ? `ICE ${c.ice}` : "",
        [c.taxId && `IF ${c.taxId}`, c.rc && `RC ${c.rc}`].filter(Boolean).join("  ·  "),
        `${c.admin.name} · ${c.admin.email}`,
      ].filter(Boolean)
    : []
  const legal = clean(`${s.legalName}  ·  ${s.address}, ${s.city}  ·  ICE ${s.ice}  ·  IF ${s.taxId}  ·  RC ${s.rc}`)
  return { t, money, date, seller, buyerLines, legal, logo: await loadLogo("/app-logo.png") }
}

/** VAT per rate, then the total, from the lines (INV-03). */
function vatRows(lines: NxInvoice["lines"], money: (n: number) => string, vatLabel: string) {
  const byRate = new Map<number, number>()
  for (const l of lines) byRate.set(l.vatRate, (byRate.get(l.vatRate) ?? 0) + Math.round(l.quantity * l.unitPrice * l.vatRate) / 100)
  return [...byRate.entries()].map(([rate, amount]) => ({ label: `${vatLabel} ${rate}%`, value: money(amount) }))
}

export async function buildNxInvoiceDocument(inv: NxInvoice, ctx: Ctx & { payments: NxPayment[] }): Promise<InvoiceDocument> {
  const { t, money, date, seller, buyerLines, legal, logo } = await base(ctx)
  const balance = Math.round((inv.total - inv.paid - inv.credited) * 100) / 100
  const paid = inv.status === "paid"
  const credited = inv.status === "credited"
  const method = ctx.payments.find((p) => p.status === "succeeded")?.method ?? (inv.dueDate > inv.date ? "transfer" : "card")
  const exported = inv.lines.every((l) => l.vatRate === 0)
  return {
    brand: DEFAULT_BRAND,
    logo,
    title: t("invoice"),
    number: inv.number,
    status: { label: t(paid ? "paid" : credited ? "credited" : balance > 0 && inv.dueDate < new Date().toISOString().slice(0, 10) ? "overdue" : "pending"), tone: paid ? "success" : credited ? "neutral" : "warning" },
    stamp: paid ? { text: t("paid"), tone: "success" } : credited ? { text: t("credited"), tone: "neutral" } : undefined,
    seller,
    buyer: { label: t("billTo"), name: ctx.customer?.name ?? inv.customerName, lines: buyerLines.length ? buyerLines : [inv.customerIce ? `ICE ${inv.customerIce}` : ""].filter(Boolean) },
    meta: [
      [t("issueDate"), date(inv.date)],
      [t("dueDate"), date(inv.dueDate)],
      [t("paymentMethod"), t(method === "card" ? "subCard" : "subTransfer")],
      [t("currency"), "MAD"],
    ],
    highlight: paid
      ? { label: t("pdfAmountPaid"), value: money(inv.total) }
      : { label: t("pdfAmountDue"), value: money(Math.max(0, balance)), note: `${t("dueDate")} ${date(inv.dueDate)}` },
    columns: { item: t("description"), quantity: t("quantity"), unitPrice: t("pdfUnitPrice"), tax: t("pdfVat"), amount: t("amount") },
    items: inv.lines.map((l) => ({ title: l.label, quantity: String(l.quantity), unitPrice: money(l.unitPrice), tax: `${l.vatRate}%`, amount: money(l.quantity * l.unitPrice) })),
    totals: [
      { label: t("subtotal"), value: money(inv.subtotal) },
      ...vatRows(inv.lines, money, t("pdfVat")),
      { label: t("total"), value: money(inv.total), strong: true },
      ...(inv.paid ? [{ label: t("paid"), value: `−${money(inv.paid)}` }] : []),
      ...(inv.credited ? [{ label: t("credited"), value: `−${money(inv.credited)}` }] : []),
    ],
    due: paid || credited || balance <= 0 ? undefined : { label: t("balanceDue"), value: money(balance) },
    tables: ctx.payments.some((p) => p.status === "succeeded")
      ? [{
          title: t("pdfPaymentsReceived"),
          head: [t("date"), t("paymentMethod"), t("pdfReference"), t("amount")],
          rows: ctx.payments.filter((p) => p.status === "succeeded").map((p) => [date(p.date), t(p.method === "card" ? "subCard" : "subTransfer"), p.reference, money(p.amount)]),
          alignRight: [3],
        }]
      : undefined,
    payment: balance > 0 && !credited
      ? { title: t("pdfPaymentDetails"), rows: [[t("pdfBank"), ctx.seller.bankName], ["RIB", ctx.seller.rib], ["SWIFT", ctx.seller.swift], [t("pdfReference"), inv.number]] }
      : undefined,
    smallPrint: exported ? [t("nxExportedVat")] : undefined,
    footer: { note: t("pdfThankYou"), legal, pageLabel: (page, total) => t("pdfPageOf", { page, total }) },
    filename: `${inv.number}.pdf`,
  }
}

export async function buildNxCreditNoteDocument(note: NxCreditNote, ctx: Ctx & { invoice?: NxInvoice }): Promise<InvoiceDocument> {
  const { t, money, date, seller, buyerLines, legal, logo } = await base(ctx)
  const lines = [{ label: note.reason, quantity: 1, unitPrice: note.subtotal, vatRate: note.subtotal ? Math.round((note.vat / note.subtotal) * 100) : 0 }]
  return {
    brand: DEFAULT_BRAND,
    logo,
    title: t("creditNote"),
    number: note.number,
    seller,
    buyer: { label: t("billTo"), name: ctx.customer?.name ?? note.customerName, lines: buyerLines },
    meta: [
      [t("issueDate"), date(note.date)],
      [t("pdfCorrects"), ctx.invoice ? `${note.invoiceNumber} · ${date(ctx.invoice.date)}` : note.invoiceNumber],
      [t("currency"), "MAD"],
    ],
    highlight: { label: t("credited"), value: money(note.total) },
    columns: { item: t("description"), quantity: t("quantity"), unitPrice: t("pdfUnitPrice"), tax: t("pdfVat"), amount: t("amount") },
    items: lines.map((l) => ({ title: l.label, detail: t("pdfCreditFor", { number: note.invoiceNumber }), quantity: "1", unitPrice: money(l.unitPrice), tax: `${l.vatRate}%`, amount: money(l.unitPrice) })),
    totals: [{ label: t("subtotal"), value: money(note.subtotal) }, { label: t("pdfVat"), value: money(note.vat) }, { label: t("total"), value: money(note.total), strong: true }],
    footer: { legal, pageLabel: (page, total) => t("pdfPageOf", { page, total }) },
    filename: `${note.number}.pdf`,
  }
}

export async function downloadNxInvoicePdf(inv: NxInvoice, ctx: Ctx & { payments: NxPayment[] }) {
  await renderInvoiceDocument(await buildNxInvoiceDocument(inv, ctx))
}
export async function printNxInvoicePdf(inv: NxInvoice, ctx: Ctx & { payments: NxPayment[] }) {
  printPdf(await renderInvoiceDocument(await buildNxInvoiceDocument(inv, ctx), { save: false }))
}
export async function downloadNxCreditNotePdf(note: NxCreditNote, ctx: Ctx & { invoice?: NxInvoice }) {
  await renderInvoiceDocument(await buildNxCreditNoteDocument(note, ctx))
}
