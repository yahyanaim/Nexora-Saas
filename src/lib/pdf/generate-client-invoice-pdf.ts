import type { JsPDFWithAutoTable } from "@/types/pdf"
import type { Client, Workspace } from "@/types/workforce"
import { InvoiceKind, type ClientInvoice } from "@/types/work-billing"
import type { CompanySettings } from "@/types/work-settings"
import { displayStatus, invoiceTotals } from "@/lib/workforce/billing"

/** Labels printed on the PDF, passed in already translated. */
export interface InvoicePdfLabels {
  invoice: string
  billTo: string
  issueDate: string
  dueDate: string
  status: string
  description: string
  quantity: string
  rate: string
  amount: string
  subtotal: string
  tax: string
  total: string
  notes: string
  paymentTerms: string
  creditNote: string
  draft: string
  withholding: string
  paid: string
  balanceDue: string
}

async function loadLogo(): Promise<HTMLImageElement | null> {
  if (typeof window === "undefined") return null
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = "/app-logo.png"
  })
}

/**
 * Builds and downloads a client invoice as an A4 PDF, in the same style as
 * the app's other PDF exports (blue accent bar, logo, line table, totals).
 */
export async function downloadClientInvoicePdf(
  invoice: ClientInvoice,
  client: Client | undefined,
  workspace: Workspace,
  labels: InvoicePdfLabels,
  statusLabel: string,
  locale?: string,
  /** Legal identity printed under the company name (spec 12.3: ICE, tax ID, trade register) */
  company?: CompanySettings,
  /** What the client still owes, after payments and credit notes */
  balance?: number
) {
  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 16
  const blue: [number, number, number] = [37, 99, 235]
  const navy: [number, number, number] = [15, 23, 42]
  const muted: [number, number, number] = [100, 116, 139]
  const money = (n: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: invoice.currency }).format(n)
  const date = (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${iso}T00:00:00`))

  doc.setFillColor(...blue)
  doc.rect(0, 0, pageWidth, 4, "F")

  let y = 20
  const logo = await loadLogo()
  if (logo) {
    try {
      doc.addImage(logo, "PNG", margin, y - 6, 12, 12)
    } catch {
      // A broken logo shouldn't stop the export
    }
  }
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(...navy)
  doc.text(company?.legalName ?? workspace.name, margin + 16, y + 1)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(...muted)
  const identity = [
    [company?.address, company?.city, company?.country].filter(Boolean).join(", "),
    [company?.ice && `ICE ${company.ice}`, company?.taxId && `IF ${company.taxId}`, company?.tradeRegister && `RC ${company.tradeRegister}`].filter(Boolean).join(" · "),
  ].filter(Boolean)
  identity.forEach((line, i) => doc.text(line, margin + 16, y + 5.5 + i * 3.6))

  const isCredit = invoice.kind === InvoiceKind.CREDIT_NOTE
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.setTextColor(...navy)
  doc.text((isCredit ? labels.creditNote : labels.invoice).toUpperCase(), pageWidth - margin, y, { align: "right" })
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...muted)
  doc.text(invoice.number || labels.draft, pageWidth - margin, y + 6, { align: "right" })

  // Bill to + dates
  y += 22
  doc.setFontSize(8)
  doc.setTextColor(...muted)
  doc.text(labels.billTo.toUpperCase(), margin, y)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...navy)
  doc.text(client?.name ?? "—", margin, y + 6)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...muted)
  const clientLines = [
    client?.legalName,
    client?.billingAddress ?? client?.address,
    client?.email,
    [client?.ice && `ICE ${client.ice}`, client?.taxId].filter(Boolean).join(" · "),
  ].filter(Boolean) as string[]
  clientLines.forEach((line, i) => doc.text(line, margin, y + 11 + i * 4.5))

  const meta: [string, string][] = [
    [labels.issueDate, date(invoice.issueDate)],
    [labels.dueDate, date(invoice.dueDate)],
    [labels.status, statusLabel],
  ]
  meta.forEach(([k, v], i) => {
    const rowY = y + i * 6
    doc.setFontSize(8)
    doc.setTextColor(...muted)
    doc.text(k, pageWidth - margin - 40, rowY)
    doc.setFontSize(9)
    doc.setTextColor(...navy)
    doc.text(v, pageWidth - margin, rowY, { align: "right" })
  })

  y += Math.max(26, 11 + clientLines.length * 4.5 + 6)

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "grid",
    head: [[labels.description, labels.quantity, labels.rate, labels.amount]],
    body: invoice.lines.map((l) => [
      l.description,
      l.timeEntryIds.length ? `${l.quantity} h` : String(l.quantity),
      money(l.unitPrice),
      money(l.quantity * l.unitPrice),
    ]),
    headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 9, textColor: navy },
    columnStyles: {
      1: { halign: "right", cellWidth: 22 },
      2: { halign: "right", cellWidth: 30 },
      3: { halign: "right", cellWidth: 32, fontStyle: "bold" },
    },
    styles: { lineColor: [226, 232, 240], lineWidth: 0.3, cellPadding: 3 },
  })

  y = ((doc as unknown as JsPDFWithAutoTable).lastAutoTable?.finalY ?? y) + 8
  const totals = invoiceTotals(invoice)
  const rows: [string, string, boolean][] = [
    [labels.subtotal, money(totals.subtotal), false],
    ...totals.taxes.map((tx): [string, string, boolean] => [`${labels.tax} ${tx.rate}% (${money(tx.base)})`, money(tx.amount), false]),
    ...(totals.withholding ? [[`${labels.withholding} (${invoice.withholdingRate}%)`, `−${money(totals.withholding)}`, false] as [string, string, boolean]] : []),
    [labels.total, money(totals.total), true],
    ...(totals.paid ? [[labels.paid, `−${money(totals.paid)}`, false] as [string, string, boolean]] : []),
    ...(balance !== undefined && !isCredit && balance !== totals.total ? [[labels.balanceDue, money(balance), true] as [string, string, boolean]] : []),
  ]
  rows.forEach(([k, v, strong], i) => {
    const rowY = y + i * 7
    doc.setFont("helvetica", strong ? "bold" : "normal")
    doc.setFontSize(strong ? 11 : 9)
    doc.setTextColor(...(strong ? navy : muted))
    doc.text(k, pageWidth - margin - 75, rowY)
    doc.setTextColor(...navy)
    doc.text(v, pageWidth - margin, rowY, { align: "right" })
  })

  y += rows.length * 7 + 8
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...muted)
  if (client) doc.text(`${labels.paymentTerms}: ${client.paymentTermsDays}`, margin, y)
  if (invoice.notes) {
    doc.setFont("helvetica", "bold")
    doc.text(labels.notes, margin, y + 8)
    doc.setFont("helvetica", "normal")
    doc.text(doc.splitTextToSize(invoice.notes, pageWidth - margin * 2), margin, y + 13)
  }

  if (invoice.exchangeRate && company && invoice.currency !== company.baseCurrency) {
    doc.setFontSize(8)
    doc.setTextColor(...muted)
    doc.text(
      `1 ${invoice.currency} = ${invoice.exchangeRate} ${company.baseCurrency}${invoice.exchangeRateDate ? ` (${date(invoice.exchangeRateDate)})` : ""}`,
      margin,
      doc.internal.pageSize.getHeight() - 12
    )
  }

  doc.save(`${invoice.number || "draft"}${displayStatus(invoice) === "void" ? "-cancelled" : ""}.pdf`)
}
