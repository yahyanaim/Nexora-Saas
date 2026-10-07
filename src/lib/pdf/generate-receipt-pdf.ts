import { TransactionStatus, type Transaction } from "@/types/transactions"
import type { Tone } from "./pdf-kit"
import { renderInvoiceDocument, type InvoiceDocument } from "./invoice-template"
import { getPdfTranslator } from "./pdf-i18n"
import { platformSeller, printPdf } from "./platform-docs"

const STATUS: Record<TransactionStatus, { key: string; tone: Tone }> = {
  [TransactionStatus.PAID]: { key: "paid", tone: "success" },
  [TransactionStatus.PENDING]: { key: "pending", tone: "warning" },
  [TransactionStatus.FAILED]: { key: "failed", tone: "danger" },
  [TransactionStatus.REFUNDED]: { key: "refunded", tone: "info" },
  [TransactionStatus.CANCELED]: { key: "cancelled", tone: "danger" },
}

/** Payment receipt of a platform transaction (Billing → Transactions) in the shared layout. */
export async function buildReceiptDocument(tx: Transaction, locale = "en"): Promise<InvoiceDocument> {
  const { t, locale: loc } = await getPdfTranslator(locale)
  const platform = await platformSeller()
  const money = (n: number) => new Intl.NumberFormat(loc, { style: "currency", currency: "MAD" }).format(n)
  const date = (iso: string) => new Intl.DateTimeFormat(loc, { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso.length === 10 ? `${iso}T00:00:00` : iso))
  const status = STATUS[tx.status] ?? STATUS[TransactionStatus.PENDING]
  const method = String(tx.method ?? "").replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  const description = tx.description || t("pdfSubscription")
  return {
    ...platform,
    title: t("pdfReceipt"),
    number: `REC-${tx.transactionId}`,
    status: { label: t(status.key), tone: status.tone },
    stamp: tx.status === TransactionStatus.PAID ? { text: t("paid"), tone: "success" } : tx.status === TransactionStatus.REFUNDED ? { text: t("refunded"), tone: "info" } : undefined,
    buyer: { label: t("pdfReceivedFrom"), name: tx.user?.name ?? "—", lines: [tx.user?.email, tx.user?.id && `${t("pdfCustomerId")} ${tx.user.id}`].filter(Boolean) as string[] },
    meta: [
      [t("date"), date(tx.date || tx.createdAt)],
      [t("paymentMethod"), method],
      [t("pdfTransaction"), tx.transactionId],
      [t("pdfReference"), tx.reference || "—"],
    ],
    highlight: { label: tx.status === TransactionStatus.PAID ? t("pdfAmountPaid") : t("amount"), value: money(tx.amount), note: date(tx.date || tx.createdAt) },
    columns: { item: t("description"), quantity: t("quantity"), unitPrice: t("pdfUnitPrice"), amount: t("amount") },
    items: [{ title: description, quantity: "1", unitPrice: money(tx.amount), amount: money(tx.amount) }],
    totals: [{ label: t("total"), value: money(tx.amount), strong: true }],
    smallPrint: [t("pdfReceiptNote")],
    footer: { note: t("pdfThankYou"), legal: platform.legal, pageLabel: (page, total) => t("pdfPageOf", { page, total }) },
    filename: `receipt-${tx.transactionId}.pdf`,
  }
}

export async function generateReceiptPdf(tx: Transaction, locale?: string): Promise<void> {
  await renderInvoiceDocument(await buildReceiptDocument(tx, locale))
}

export async function printReceipt(tx: Transaction, locale?: string): Promise<void> {
  printPdf(await renderInvoiceDocument(await buildReceiptDocument(tx, locale), { save: false }))
}
