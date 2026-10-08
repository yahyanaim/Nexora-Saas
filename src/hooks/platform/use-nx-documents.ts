"use client"

import { useLocale, useTranslations } from "next-intl"
import { toast } from "@/lib/utils/toast"
import { listCreditNotesApi, listInvoicesApi, listPaymentsApi } from "@/lib/api/platform-billing-api"
import { listCustomersApi } from "@/lib/api/platform-customers-api"
import { sellerSnapshot } from "@/lib/api/platform-config-api"
import { downloadText, nxUblXml } from "@/lib/platform/nx-ubl"
import type { NxCreditNote, NxInvoice } from "@/types/platform-billing"

/**
 * Downloads of Nexora's invoices and credit notes (INV-05, INV-07): PDF, print
 * and the UBL 2.1 file. Used by the console and by each company's My
 * subscription page, so both give the same document.
 */
export function useNxDocuments() {
  const locale = useLocale()
  const t = useTranslations()
  const context = async (customerId: string) => {
    const [customers, payments] = await Promise.all([listCustomersApi(), listPaymentsApi()])
    return { customer: customers.find((c) => c.id === customerId), payments, fallback: sellerSnapshot() }
  }
  const guard = async (fn: () => Promise<void>) => {
    try {
      await fn()
    } catch {
      toast.error(t("nxPdfFailed"))
    }
  }
  return {
    invoicePdf: (inv: NxInvoice, print = false) =>
      guard(async () => {
        const { customer, payments, fallback } = await context(inv.customerId)
        const pdf = await import("@/lib/pdf/nexora-invoice-pdf")
        const ctx = { customer, seller: inv.seller ?? fallback, locale, payments: payments.filter((p) => p.invoiceId === inv.id) }
        await (print ? pdf.printNxInvoicePdf(inv, ctx) : pdf.downloadNxInvoicePdf(inv, ctx))
      }),
    creditNotePdf: (note: NxCreditNote) =>
      guard(async () => {
        const { customer, fallback } = await context(note.customerId)
        const invoice = (await listInvoicesApi()).find((i) => i.id === note.invoiceId)
        const pdf = await import("@/lib/pdf/nexora-invoice-pdf")
        await pdf.downloadNxCreditNotePdf(note, { customer, seller: invoice?.seller ?? fallback, locale, invoice })
      }),
    invoiceXml: (inv: NxInvoice) =>
      guard(async () => {
        const { customer, fallback } = await context(inv.customerId)
        downloadText(nxUblXml({ kind: "invoice", invoice: inv }, inv.seller ?? fallback, customer), `${inv.number}.xml`)
      }),
    creditNoteXml: (note: NxCreditNote) =>
      guard(async () => {
        const { customer, fallback } = await context(note.customerId)
        const invoice = (await listInvoicesApi()).find((i) => i.id === note.invoiceId)
        downloadText(nxUblXml({ kind: "credit", note, invoice }, invoice?.seller ?? fallback, customer), `${note.number}.xml`)
      }),
    /** Every credit note of an invoice, for the panels. */
    creditNotesOf: async (invoiceId: string) => (await listCreditNotesApi()).filter((n) => n.invoiceId === invoiceId),
  }
}
