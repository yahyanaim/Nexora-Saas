import type { JsPDFWithAutoTable } from "@/types/pdf"
import type { Client, Workspace } from "@/types/workforce"
import type { ClientInvoice } from "@/types/work-billing"
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
  locale?: string
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
  doc.text(workspace.name, margin + 16, y + 1)

  doc.setFontSize(20)
  doc.text(labels.invoice.toUpperCase(), pageWidth - margin, y, { align: "right" })
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...muted)
  doc.text(invoice.number, pageWidth - margin, y + 6, { align: "right" })

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
  const clientLines = [client?.address, client?.email, client?.taxId].filter(Boolean) as string[]
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
    [`${labels.tax} (${invoice.taxRate}%)`, money(totals.tax), false],
    [labels.total, money(totals.total), true],
  ]
  rows.forEach(([k, v, strong], i) => {
    const rowY = y + i * 7
    doc.setFont("helvetica", strong ? "bold" : "normal")
    doc.setFontSize(strong ? 11 : 9)
    doc.setTextColor(...(strong ? navy : muted))
    doc.text(k, pageWidth - margin - 60, rowY)
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

  doc.save(`${invoice.number}${displayStatus(invoice) === "void" ? "-void" : ""}.pdf`)
}
