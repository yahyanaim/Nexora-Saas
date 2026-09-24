import { Invoice, InvoiceStatus } from "@/types/invoices"
import { getMoroccanFiscalConfig } from "@/lib/demo-data/taxes"
import type { JsPDFWithAutoTable } from "@/types/pdf"

/**
 * Loads the Nexora app logo as an HTMLImageElement for canvas / jsPDF embedding.
 */
async function loadLogoImage(): Promise<HTMLImageElement | null> {
  if (typeof window === "undefined") return null
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = "/app-logo.png"
  })
}

/**
 * Generates an authentic, enterprise-grade HTML invoice for preview and printing.
 */
export function getInvoiceHtml(invoice: Invoice): string {
  const fiscal = getMoroccanFiscalConfig()
  const isPaid = invoice.status === InvoiceStatus.PAID
  const isPending = invoice.status === InvoiceStatus.PENDING
  const isOverdue = invoice.status === InvoiceStatus.OVERDUE
  const isCancelled = invoice.status === InvoiceStatus.CANCELLED

  const statusLabel = isPaid
    ? "✓ Paid in Full"
    : isPending
    ? "Pending Payment"
    : isOverdue
    ? "Payment Overdue"
    : isCancelled
    ? "Cancelled"
    : invoice.status.toUpperCase()

  const statusClass = isPaid ? "paid" : isPending ? "pending" : "overdue"

  const formatMoney = (val: number) =>
    `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const invoiceDate = invoice.date ? new Date(invoice.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Sep 22, 2026"
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Net 30 Days"

  const itemsRows = (invoice.items && invoice.items.length > 0
    ? invoice.items
    : [
        {
          id: "item-default",
          description: "Nexora Enterprise Cloud Platform - Platform & Seat Allocation",
          quantity: 1,
          unitPrice: invoice.subtotal || invoice.total,
          total: invoice.subtotal || invoice.total,
        },
      ]
  )
    .map(
      (item) => `
      <tr>
        <td>
          <div class="item-title">${item.description}</div>
          <div class="item-desc">Enterprise compute allocation, API telemetry access & 99.99% uptime SLA</div>
        </td>
        <td class="text-center">Monthly</td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-right">${formatMoney(item.unitPrice)}</td>
        <td class="text-right font-bold">${formatMoney(item.quantity * item.unitPrice)}</td>
      </tr>
    `
    )
    .join("")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber} - Nexora</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      line-height: 1.5;
      padding: 40px 20px;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .invoice-wrapper {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .accent-bar {
      height: 6px;
      background: linear-gradient(90deg, #0f62fe 0%, #2563eb 50%, #38bdf8 100%);
    }
    .invoice-body {
      padding: 44px 52px;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 28px;
      border-bottom: 1px solid #e2e8f0;
    }
    .brand-side {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .logo-img {
      width: 48px;
      height: 48px;
      object-fit: contain;
      border-radius: 10px;
    }
    .brand-side h2 {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }
    .brand-side p {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }
    .invoice-meta {
      text-align: right;
    }
    .invoice-meta h1 {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .invoice-number {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 700;
      color: #64748b;
      margin-top: 2px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      margin-top: 8px;
      padding: 4px 14px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-badge.paid {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .status-badge.pending {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
    }
    .status-badge.overdue {
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }

    /* Hero Amount */
    .hero-banner {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px 28px;
      margin: 28px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .hero-amount-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 4px;
    }
    .hero-amount-val {
      font-size: 36px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -1px;
      line-height: 1;
    }
    .hero-amount-currency {
      font-size: 14px;
      font-weight: 600;
      color: #64748b;
      margin-left: 6px;
    }
    .hero-meta-col {
      text-align: right;
    }
    .hero-date-row {
      font-size: 13px;
      margin-bottom: 4px;
    }
    .hero-date-row span.label {
      color: #64748b;
      font-weight: 500;
      margin-right: 8px;
    }
    .hero-date-row span.val {
      color: #0f172a;
      font-weight: 700;
    }

    /* Cards Grid */
    .cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }
    .info-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
    }
    .info-card-title {
      font-size: 11px;
      font-weight: 700;
      color: #0f62fe;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 12px;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 8px;
    }
    .info-item:last-child {
      margin-bottom: 0;
    }
    .info-item .label {
      color: #64748b;
      font-weight: 500;
    }
    .info-item .val {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }

    /* Table */
    .table-container {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 24px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      background: #f8fafc;
      padding: 12px 18px;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      border-bottom: 1px solid #e2e8f0;
    }
    td {
      padding: 16px 18px;
      font-size: 13px;
      color: #0f172a;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .item-title {
      font-weight: 700;
      color: #0f172a;
      font-size: 13.5px;
      margin-bottom: 3px;
    }
    .item-desc {
      font-size: 12px;
      color: #64748b;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }

    /* Totals */
    .totals-area {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 32px;
    }
    .totals-card {
      width: 320px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 22px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 8px;
    }
    .totals-row .t-label {
      color: #64748b;
      font-weight: 500;
    }
    .totals-row .t-val {
      color: #0f172a;
      font-weight: 600;
    }
    .totals-divider {
      height: 1px;
      background: #cbd5e1;
      margin: 10px 0;
    }
    .totals-row.final {
      margin-bottom: 0;
      font-size: 15px;
    }
    .totals-row.final .t-label {
      font-weight: 800;
      color: #0f172a;
    }
    .totals-row.final .t-val {
      font-weight: 800;
      color: #0f62fe;
    }

    /* Wire / Bank Details */
    .wire-details-box {
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      padding: 18px 24px;
      margin-bottom: 28px;
      font-size: 12px;
    }
    .wire-title {
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .wire-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .wire-item .w-label {
      color: #64748b;
      font-size: 11px;
    }
    .wire-item .w-val {
      color: #0f172a;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Compliance & Footer */
    .compliance-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 24px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      font-size: 11.5px;
      color: #64748b;
    }
    .compliance-title {
      font-size: 11.5px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .verification-stamp {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #94a3b8;
      margin-top: 6px;
    }

    /* Print Styles */
    @media print {
      body {
        background: transparent !important;
        padding: 0 !important;
      }
      .invoice-wrapper {
        border: none !important;
        box-shadow: none !important;
        max-width: 100% !important;
        border-radius: 0 !important;
      }
      .invoice-body {
        padding: 24px 32px !important;
      }
      @page {
        size: A4 portrait;
        margin: 12mm;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <div class="accent-bar"></div>
    <div class="invoice-body">
      
      <!-- Header -->
      <div class="header-row">
        <div class="brand-side">
          <img src="/app-logo.png" alt="Nexora Logo" class="logo-img" />
          <div>
            <h2>${fiscal.companyName}</h2>
            <p>${fiscal.address}, ${fiscal.city}, ${fiscal.country}</p>
            <p style="font-size: 11px; color: #64748b; font-family: 'JetBrains Mono', monospace; margin-top: 3px;">
              ICE: <strong>${fiscal.ice}</strong> · IF: <strong>${fiscal.ifNumber}</strong> · RC: <strong>${fiscal.rcNumber}</strong> · TP: <strong>${fiscal.patente}</strong>
            </p>
          </div>
        </div>
        <div class="invoice-meta">
          <h1>INVOICE</h1>
          <div class="invoice-number">${invoice.invoiceNumber}</div>
          <div class="status-badge ${statusClass}">${statusLabel}</div>
        </div>
      </div>

      <!-- Hero Total -->
      <div class="hero-banner">
        <div>
          <div class="hero-amount-label">Total Amount Due / Paid</div>
          <div class="hero-amount-val">${formatMoney(invoice.total)}<span class="hero-amount-currency">USD</span></div>
        </div>
        <div class="hero-meta-col">
          <div class="hero-date-row">
            <span class="label">Invoice Date:</span>
            <span class="val">${invoiceDate}</span>
          </div>
          <div class="hero-date-row">
            <span class="label">Payment Terms:</span>
            <span class="val">${dueDate}</span>
          </div>
        </div>
      </div>

      <!-- Cards Grid -->
      <div class="cards-grid">
        <div class="info-card">
          <div class="info-card-title">Billed To (Customer)</div>
          <div class="info-item">
            <span class="label">Customer Name</span>
            <span class="val">${invoice.user.name}</span>
          </div>
          <div class="info-item">
            <span class="label">Email Address</span>
            <span class="val">${invoice.user.email}</span>
          </div>
          <div class="info-item">
            <span class="label">Customer ID</span>
            <span class="val">${invoice.user.id}</span>
          </div>
          <div class="info-item">
            <span class="label">Account Status</span>
            <span class="val">Verified Enterprise Client</span>
          </div>
        </div>

        <div class="info-card">
          <div class="info-card-title">Payment & Reference</div>
          <div class="info-item">
            <span class="label">Payment Method</span>
            <span class="val">${invoice.method ? invoice.method.toUpperCase().replace('_', ' ') : 'STRIPE'}</span>
          </div>
          <div class="info-item">
            <span class="label">Invoice Number</span>
            <span class="val">${invoice.invoiceNumber}</span>
          </div>
          <div class="info-item">
            <span class="label">Billing Currency</span>
            <span class="val">USD ($)</span>
          </div>
          <div class="info-item">
            <span class="label">Status</span>
            <span class="val" style="color: ${isPaid ? '#15803d' : '#b45309'};">${isPaid ? 'Settled in Full' : 'Pending Remittance'}</span>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width: 50%;">Item & Description</th>
              <th class="text-center" style="width: 15%;">Cycle</th>
              <th class="text-center" style="width: 10%;">Qty</th>
              <th class="text-right" style="width: 12%;">Unit Rate</th>
              <th class="text-right" style="width: 13%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div class="totals-area">
        <div class="totals-card">
          <div class="totals-row">
            <span class="t-label">Subtotal (Montant HT)</span>
            <span class="t-val">${formatMoney(invoice.subtotal)}</span>
          </div>
          <div class="totals-row">
            <span class="t-label">TVA Maroc (${invoice.taxRate}%)</span>
            <span class="t-val">${formatMoney(invoice.tax)}</span>
          </div>
          <div class="totals-row">
            <span class="t-label">Discount Applied</span>
            <span class="t-val">$0.00</span>
          </div>
          <div class="totals-divider"></div>
          <div class="totals-row final">
            <span class="t-label">Total Due (Montant TTC)</span>
            <span class="t-val">${formatMoney(invoice.total)} USD</span>
          </div>
        </div>
      </div>

      <!-- Bank Transfer Wire Remittance -->
      <div class="wire-details-box">
        <div class="wire-title">Bank Wire & ACH Direct Remittance</div>
        <div class="wire-grid">
          <div class="wire-item">
            <div class="w-label">Bank Name</div>
            <div class="w-val">Silicon Valley Bank</div>
          </div>
          <div class="wire-item">
            <div class="w-label">Routing (ABA)</div>
            <div class="w-val">121000358</div>
          </div>
          <div class="wire-item">
            <div class="w-label">Account (USD)</div>
            <div class="w-val">98402819034</div>
          </div>
          <div class="wire-item">
            <div class="w-label">SWIFT / BIC</div>
            <div class="w-val">SVBKUS6S</div>
          </div>
        </div>
      </div>

      <!-- Compliance & Issuer Info -->
      <div class="compliance-footer">
        <div>
          <div class="compliance-title">Merchant of Record & Fiscal Compliance</div>
          <p><strong>${fiscal.companyName}</strong></p>
          <p>${fiscal.address} · ${fiscal.city}, ${fiscal.country}</p>
          <p>ICE: ${fiscal.ice} · IF: ${fiscal.ifNumber} · RC: ${fiscal.rcNumber} · TP: ${fiscal.patente}</p>
          <p>Facture électronique certifiée conforme aux exigences fiscales et comptables marocaines.</p>
        </div>
        <div>
          <div class="compliance-title">Terms & Conditions</div>
          <p>Payment due within 30 days of invoice date. All platform services are provided under the Nexora SaaS Master Services Agreement.</p>
          <div class="verification-stamp">VERIFICATION: SHA256-INV-${invoice.invoiceNumber}-AUTHENTICATED</div>
        </div>
      </div>

    </div>
  </div>
</body>
</html>`
}

/**
 * Triggers a browser print dialog with the clean, professional invoice template.
 */
export function printInvoice(invoice: Invoice): void {
  const html = getInvoiceHtml(invoice)
  const printWindow = window.open("", "_blank")
  if (!printWindow) {
    console.error("Unable to open print window. Please allow popups.")
    return
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()

  printWindow.onload = () => {
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }
}

/**
 * Generates and downloads a clean, professional PDF invoice matching the high-end template.
 */
export async function generateInvoicePdf(invoice: Invoice): Promise<void> {
  const fiscal = getMoroccanFiscalConfig()
  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Colors
  const brandBlue = [15, 98, 254] as [number, number, number]
  const darkNavy = [15, 23, 42] as [number, number, number]
  const slateMuted = [100, 116, 139] as [number, number, number]
  const cardFill = [248, 250, 252] as [number, number, number]
  const cardBorder = [226, 232, 240] as [number, number, number]
  const emeraldSuccess = [22, 163, 74] as [number, number, number]

  const leftMargin = 16
  const rightMargin = 16
  const contentWidth = pageWidth - leftMargin - rightMargin

  // Top Accent Bar
  doc.setFillColor(brandBlue[0], brandBlue[1], brandBlue[2])
  doc.rect(0, 0, pageWidth, 4, "F")

  let currentY = 18

  // Logo & Brand Header
  const logo = await loadLogoImage()
  if (logo) {
    try {
      doc.addImage(logo, "PNG", leftMargin, currentY - 5, 12, 12)
    } catch {
      doc.setFillColor(brandBlue[0], brandBlue[1], brandBlue[2])
      doc.roundedRect(leftMargin, currentY - 5, 11, 11, 2, 2, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(13)
      doc.text("N", leftMargin + 3.6, currentY + 2.6)
    }
  } else {
    doc.setFillColor(brandBlue[0], brandBlue[1], brandBlue[2])
    doc.roundedRect(leftMargin, currentY - 5, 11, 11, 2, 2, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.text("N", leftMargin + 3.6, currentY + 2.6)
  }

  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text(fiscal.companyName, leftMargin + 16, currentY + 0.5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text(`${fiscal.address}, ${fiscal.city} · ICE: ${fiscal.ice}`, leftMargin + 16, currentY + 4.5)
  doc.text(`IF: ${fiscal.ifNumber} · RC: ${fiscal.rcNumber} · TP: ${fiscal.patente}`, leftMargin + 16, currentY + 8)

  // Document Title Right
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text("INVOICE", pageWidth - rightMargin, currentY, { align: "right" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text(`NO: ${invoice.invoiceNumber}`, pageWidth - rightMargin, currentY + 5, { align: "right" })

  // Status Badge
  const isPaid = invoice.status === InvoiceStatus.PAID
  const badgeColor: [number, number, number] = isPaid ? emeraldSuccess : [180, 83, 9]
  const badgeText = isPaid ? "PAID IN FULL" : invoice.status.toUpperCase()

  const badgeW = 28
  const badgeH = 6.5
  const badgeX = pageWidth - rightMargin - badgeW
  const badgeY = currentY + 7.5

  doc.setFillColor(isPaid ? 220 : 254, isPaid ? 252 : 243, isPaid ? 231 : 199)
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, "F")
  doc.setDrawColor(badgeColor[0], badgeColor[1], badgeColor[2])
  doc.setLineWidth(0.3)
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, "S")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2])
  doc.text(badgeText, badgeX + badgeW / 2, badgeY + 4.5, { align: "center" })

  currentY += 21

  // Divider
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.setLineWidth(0.4)
  doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY)

  currentY += 8

  // Hero Amount Due Box
  const formatMoney = (val: number) => `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const totalStr = formatMoney(invoice.total)
  const invoiceDateStr = invoice.date ? new Date(invoice.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Sep 22, 2026"
  const dueDateStr = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Net 30 Days"

  doc.setFillColor(cardFill[0], cardFill[1], cardFill[2])
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.setLineWidth(0.4)
  doc.roundedRect(leftMargin, currentY, contentWidth, 22, 2.5, 2.5, "FD")

  // Amount
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text("TOTAL AMOUNT DUE / PAID", leftMargin + 8, currentY + 7)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text(`${totalStr} USD`, leftMargin + 8, currentY + 16)

  // Date & Terms Right
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text(`Issue Date: ${invoiceDateStr}`, pageWidth - rightMargin - 8, currentY + 8, { align: "right" })
  doc.setFont("helvetica", "bold")
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text(`Payment Due: ${dueDateStr}`, pageWidth - rightMargin - 8, currentY + 15, { align: "right" })

  currentY += 28

  // Two-Column Grid: Customer & Remittance
  const cardW = (contentWidth - 8) / 2
  const cardH = 34

  // Billed To
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.roundedRect(leftMargin, currentY, cardW, cardH, 2, 2, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2])
  doc.text("BILLED TO (CUSTOMER)", leftMargin + 6, currentY + 6.5)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text(invoice.user?.name || "Corporate Customer", leftMargin + 6, currentY + 13)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text(`Email: ${invoice.user?.email || "billing@client.com"}`, leftMargin + 6, currentY + 18.5)
  doc.text(`Customer ID: ${invoice.user?.id || "NEX-USR-01"}`, leftMargin + 6, currentY + 23.5)
  doc.text("Account Tier: Enterprise SaaS Plan", leftMargin + 6, currentY + 28.5)

  // Payment Details
  const rightColX = leftMargin + cardW + 8
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(rightColX, currentY, cardW, cardH, 2, 2, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2])
  doc.text("PAYMENT METRICS & TERMS", rightColX + 6, currentY + 6.5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text("Method:", rightColX + 6, currentY + 13)
  doc.text("Invoice No:", rightColX + 6, currentY + 18.5)
  doc.text("Currency:", rightColX + 6, currentY + 23.5)
  doc.text("Status:", rightColX + 6, currentY + 28.5)

  doc.setFont("helvetica", "bold")
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text(invoice.method ? invoice.method.toUpperCase().replace('_', ' ') : 'STRIPE', rightColX + 28, currentY + 13)
  doc.text(invoice.invoiceNumber, rightColX + 28, currentY + 18.5)
  doc.text("USD ($)", rightColX + 28, currentY + 23.5)
  doc.setTextColor(isPaid ? emeraldSuccess[0] : 180, isPaid ? emeraldSuccess[1] : 83, isPaid ? emeraldSuccess[2] : 9)
  doc.text(isPaid ? "Settled in Full" : "Pending Remittance", rightColX + 28, currentY + 28.5)

  currentY += cardH + 8

  // Itemized Table
  const tableBody = (invoice.items && invoice.items.length > 0
    ? invoice.items
    : [
        {
          id: "item-default",
          description: "Nexora Enterprise Cloud Platform - Platform & Seat Allocation",
          quantity: 1,
          unitPrice: invoice.subtotal || invoice.total,
          total: invoice.subtotal || invoice.total,
        },
      ]
  ).map((item) => [
    `${item.description}\nEnterprise compute minutes, API telemetry & 99.99% SLA`,
    "Monthly",
    String(item.quantity),
    formatMoney(item.unitPrice),
    formatMoney(item.quantity * item.unitPrice),
  ])

  autoTable(doc, {
    startY: currentY,
    margin: { left: leftMargin, right: rightMargin },
    theme: "grid",
    head: [["ITEM & DESCRIPTION", "CYCLE", "QTY", "RATE", "AMOUNT"]],
    body: tableBody,
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
      cellPadding: 3.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [15, 23, 42],
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.54 },
      1: { cellWidth: contentWidth * 0.16, halign: "center" },
      2: { cellWidth: contentWidth * 0.08, halign: "center" },
      3: { cellWidth: contentWidth * 0.11, halign: "right" },
      4: { cellWidth: contentWidth * 0.11, halign: "right", fontStyle: "bold" },
    },
    styles: {
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
    },
  })

  const docWithTable = doc as unknown as JsPDFWithAutoTable
  currentY = (docWithTable.lastAutoTable?.finalY ?? currentY) + 6

  // Totals Box (Right-aligned)
  const totalsWidth = 72
  const totalsX = pageWidth - rightMargin - totalsWidth

  doc.setFillColor(cardFill[0], cardFill[1], cardFill[2])
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.roundedRect(totalsX, currentY, totalsWidth, 28, 2, 2, "FD")

  const totals = [
    { label: "Subtotal (Montant HT)", val: formatMoney(invoice.subtotal) },
    { label: `TVA Maroc (${invoice.taxRate}%)`, val: formatMoney(invoice.tax) },
    { label: "Discounts", val: "$0.00" },
  ]

  let tY = currentY + 5.5
  totals.forEach((row) => {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
    doc.text(row.label, totalsX + 5, tY)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
    doc.text(row.val, totalsX + totalsWidth - 5, tY, { align: "right" })
    tY += 5
  })

  // Final Total Highlight Line
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.line(totalsX + 5, tY - 1, totalsX + totalsWidth - 5, tY - 1)
  tY += 3.5

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2])
  doc.text("TOTAL TTC:", totalsX + 5, tY)
  doc.text(`${totalStr} USD`, totalsX + totalsWidth - 5, tY, { align: "right" })

  currentY += 34

  // Bank Wire Details Card
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(leftMargin, currentY, contentWidth, 18, 2, 2, "F")
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.roundedRect(leftMargin, currentY, contentWidth, 18, 2, 2, "S")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text("Bank Wire Remittance: Silicon Valley Commercial Bank | Routing: 121000358 | Account: 98402819034", leftMargin + 6, currentY + 6.5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text(`SWIFT/BIC: SVBKUS6S · Beneficiary: Nexora Cloud Platforms, Inc. · Remittance Reference: ${invoice.invoiceNumber}`, leftMargin + 6, currentY + 12.5)

  currentY += 24

  // Footer & Compliance
  const footerY = pageHeight - 10
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.setLineWidth(0.3)
  doc.line(leftMargin, footerY - 4, pageWidth - rightMargin, footerY - 4)

  doc.setFontSize(6.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text(`${fiscal.companyName} · ${fiscal.address}, ${fiscal.city} · ICE: ${fiscal.ice} · IF: ${fiscal.ifNumber} · billing@nexora.io`, leftMargin, footerY)
  doc.text("Page 1 of 1", pageWidth - rightMargin, footerY, { align: "right" })

  // Trigger download
  doc.save(`invoice-${invoice.invoiceNumber}.pdf`)
}
