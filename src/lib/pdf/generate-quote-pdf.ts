import type { Client, Workspace } from "@/types/workforce"
import type { CompanySettings } from "@/types/work-settings"
import { FLAT_UNIT, QuoteStatus, type Quote, type QuoteDisplayStatus } from "@/types/work-quotes"
import { lineTotal, quoteDisplayStatus, quoteTotals } from "@/lib/workforce/quotes"
import { todayIso } from "@/lib/workforce/project-metrics"
import { companyLines, hexToRgb, legalLine, loadLogo, type Tone } from "./pdf-kit"
import { getPdfTranslator } from "./pdf-i18n"
import { renderClassicDocument, type ClassicDocument } from "./classic-template"
import { renderInvoiceDocument, type InvoiceDocument } from "./invoice-template"

type T = (key: string, values?: Record<string, string | number>) => string

export const QUOTE_STATUS: Record<QuoteDisplayStatus, { key: string; tone: Tone }> = {
  [QuoteStatus.DRAFT]: { key: "draft", tone: "neutral" },
  [QuoteStatus.SENT]: { key: "quoteSent", tone: "info" },
  [QuoteStatus.ACCEPTED]: { key: "quoteAccepted", tone: "success" },
  [QuoteStatus.DECLINED]: { key: "quoteDeclined", tone: "danger" },
  expired: { key: "quoteExpired", tone: "warning" },
  invoiced: { key: "quoteInvoiced", tone: "success" },
}

/** Formatting helpers shared by quotes and invoices in the PDF language. */
export function docFormat(locale: string, currency: string) {
  return {
    money: (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2 }).format(n),
    num: (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n),
    date: (iso: string) => new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${iso.slice(0, 10)}T00:00:00`)),
  }
}

/** Client number printed on documents: the id without its prefix. */
export const clientNumber = (client?: Client) => (client ? client.id.replace(/^cli_/, "").toUpperCase() : "-")

/** "On behalf of" panel: the company issuing the document. */
export function sellerRows(t: T, company: CompanySettings | undefined, fallbackName: string): [string, string][] {
  return [
    [t("docName"), company?.legalName || fallbackName],
    [t("docIce"), company?.ice ?? ""],
    [t("docIf"), company?.taxId ?? ""],
    [t("address"), [company?.address, company?.city].filter(Boolean).join(", ")],
    [t("phone"), company?.phone ?? ""],
    [t("docEmail"), company?.email ?? ""],
  ]
}

/** "Addressed to" panel: the contact person, the client company and its details. */
export function buyerRows(t: T, client: Client | undefined, contactId?: string): [string, string][] {
  const contact = client?.contacts.find((c) => c.id === contactId) ?? client?.contacts.find((c) => c.isPrimary)
  return [
    [t("docContact"), contact ? [contact.name, contact.position].filter(Boolean).join(", ") : "-"],
    [t("docCompany"), client?.legalName || client?.name || "-"],
    [t("docIce"), client?.ice ?? ""],
    [t("address"), client?.billingAddress ?? client?.address ?? ""],
    [t("phone"), contact?.phone ?? client?.phone ?? ""],
    [t("docEmail"), contact?.email ?? client?.email ?? ""],
  ].filter(([label, value]) => value || label === t("docContact") || label === t("docCompany")) as [string, string][]
}

export function bankRows(t: T, company: CompanySettings | undefined, conditions?: string): [string, string][] {
  return [
    [t("docPaymentConditions"), conditions ?? ""],
    [t("pdfBank"), company?.bankName ?? ""],
    [t("docRib"), company?.bankAccount ?? ""],
    ["SWIFT", company?.bankSwift ?? ""],
  ]
}

export interface QuotePdfInput {
  quote: Quote
  client?: Client
  workspace: Workspace
  company?: CompanySettings
  locale: string
}

export async function buildClassicQuote(input: QuotePdfInput): Promise<ClassicDocument> {
  const { quote, client, company, workspace } = input
  const { t, locale } = await getPdfTranslator(input.locale)
  const f = docFormat(locale, quote.currency)
  const totals = quoteTotals(quote)
  const status = quoteDisplayStatus(quote, todayIso())
  const cur = quote.currency
  const rates = [...new Set(totals.taxes.map((x) => x.rate))]
  return {
    brand: hexToRgb(company?.brandColor),
    logo: await loadLogo(company?.logoDataUrl),
    companyName: company?.tradeName || company?.legalName || workspace.name,
    title: t("quote"),
    status: status === QuoteStatus.DRAFT || status === QuoteStatus.SENT ? undefined : { label: t(QUOTE_STATUS[status].key), tone: QUOTE_STATUS[status].tone },
    stamp: quote.status === QuoteStatus.DRAFT ? { text: t("draft"), tone: "neutral" } : quote.status === QuoteStatus.DECLINED ? { text: t("quoteDeclined"), tone: "danger" } : undefined,
    refs: [
      [t("docClientNo"), clientNumber(client)],
      [t("docQuoteDate"), f.date(quote.issueDate)],
      [t("docQuoteNo"), quote.number || t("draft")],
      [t("docExpires"), f.date(quote.validUntil)],
      ...(quote.deliveryDate ? ([[t("docDeliveryDate"), f.date(quote.deliveryDate)]] as [string, string][]) : []),
    ],
    from: { heading: t("docOnBehalfOf"), rows: sellerRows(t, company, workspace.name) },
    to: { heading: t("docAddressedTo"), rows: buyerRows(t, client, quote.contactId) },
    subject: { heading: t("docProjectDescription"), text: quote.subject },
    columns: { description: t("docTask"), unitPrice: t("docUnitPriceExcl", { currency: cur }), quantity: t("docQtyUnit"), total: t("docTotalExcl", { currency: cur }) },
    items: quote.lines.map((l) => ({
      description: l.description,
      unitPrice: f.num(l.unitPrice),
      quantity: l.unit === FLAT_UNIT ? t("docFlat") : f.num(l.quantity),
      unit: l.unit === FLAT_UNIT ? "-" : l.unit || "-",
      total: f.num(lineTotal(l)),
    })),
    notes: { heading: t("docNotes"), rows: bankRows(t, company, quote.notes) },
    totals: [
      { label: t("docSubtotal", { currency: cur }), value: f.money(totals.subtotal) },
      { label: t("docDiscount"), value: quote.discountRate ? `${f.num(quote.discountRate)} % (-${f.money(totals.discount)})` : "-" },
      { label: t("docVatRate"), value: rates.map((r) => `${f.num(r)} %`).join(" / ") || "-" },
      { label: t("docVatTotal", { currency: cur }), value: f.money(totals.tax) },
      { label: t("docTotalIncl", { currency: cur }), value: f.money(totals.total), strong: true },
    ],
    net: { label: t("docNetToPay", { currency: cur }), value: f.money(totals.total) },
    signature: { label: t("docSignature"), hint: t("docSignatureHint") },
    legal: [company?.ice && `ICE: ${company.ice}`, company?.tradeRegister && `RC: ${company.tradeRegister}`, company?.taxId && `IF: ${company.taxId}`].filter(Boolean).join(" | ") || legalLine(company, workspace.name),
    terms: company?.invoiceFooter,
    pageLabel: (page, total) => t("pdfPageOf", { page, total }),
    filename: `${quote.number || "quote-draft"}.pdf`,
  }
}

export async function buildModernQuote(input: QuotePdfInput): Promise<InvoiceDocument> {
  const { quote, client, company, workspace } = input
  const { t, locale } = await getPdfTranslator(input.locale)
  const f = docFormat(locale, quote.currency)
  const totals = quoteTotals(quote)
  const status = quoteDisplayStatus(quote, todayIso())
  return {
    brand: hexToRgb(company?.brandColor),
    logo: await loadLogo(company?.logoDataUrl),
    title: t("quote"),
    number: quote.number || t("draft"),
    status: { label: t(QUOTE_STATUS[status].key), tone: QUOTE_STATUS[status].tone },
    stamp: quote.status === QuoteStatus.DRAFT ? { text: t("draft"), tone: "neutral" } : undefined,
    seller: { name: company?.tradeName || company?.legalName || workspace.name, lines: companyLines(company) },
    buyer: { label: t("docAddressedTo"), name: client?.name ?? "-", lines: buyerRows(t, client, quote.contactId).slice(0, 1).map(([, v]) => v).concat([client?.billingAddress ?? client?.address ?? "", client?.ice ? `ICE ${client.ice}` : ""]).filter(Boolean) },
    meta: [
      [t("docQuoteDate"), f.date(quote.issueDate)],
      [t("docExpires"), f.date(quote.validUntil)],
      ...(quote.deliveryDate ? ([[t("docDeliveryDate"), f.date(quote.deliveryDate)]] as [string, string][]) : []),
      [t("currency"), quote.currency],
    ],
    highlight: { label: t("docTotalIncl", { currency: quote.currency }), value: f.money(totals.total), note: `${t("docExpires")} ${f.date(quote.validUntil)}` },
    columns: { item: t("description"), quantity: t("docQtyUnit"), unitPrice: t("pdfUnitPrice"), tax: t("pdfVat"), amount: t("amount") },
    items: quote.lines.map((l) => ({
      title: l.description,
      quantity: l.unit === FLAT_UNIT ? t("docFlat") : `${f.num(l.quantity)}${l.unit ? ` ${l.unit}` : ""}`,
      unitPrice: f.money(l.unitPrice),
      tax: `${l.taxRate ?? quote.taxRate}%`,
      amount: f.money(lineTotal(l)),
    })),
    totals: [
      { label: t("subtotal"), value: f.money(totals.subtotal) },
      ...(totals.discount ? [{ label: `${t("docDiscount")} ${f.num(quote.discountRate)}%`, value: `-${f.money(totals.discount)}` }] : []),
      ...totals.taxes.map((x) => ({ label: `${t("pdfVat")} ${x.rate}%  (${t("pdfOn")} ${f.money(x.base)})`, value: f.money(x.amount) })),
      { label: t("total"), value: f.money(totals.total), strong: true },
    ],
    notes: { title: t("docProjectDescription"), text: [quote.subject, quote.notes].filter(Boolean).join("\n\n") },
    payment: company?.bankAccount ? { title: t("pdfPaymentDetails"), rows: bankRows(t, company).filter(([, v]) => v).slice(1) } : undefined,
    smallPrint: [t("docSignatureHint")],
    footer: { note: company?.invoiceFooter, legal: legalLine(company, workspace.name), pageLabel: (page, total) => t("pdfPageOf", { page, total }) },
    filename: `${quote.number || "quote-draft"}.pdf`,
  }
}

/** Downloads a quote in the workspace's document style (classic by default). */
export async function downloadQuotePdf(input: QuotePdfInput) {
  if (input.company?.documentStyle === "modern") await renderInvoiceDocument(await buildModernQuote(input))
  else await renderClassicDocument(await buildClassicQuote(input))
}
