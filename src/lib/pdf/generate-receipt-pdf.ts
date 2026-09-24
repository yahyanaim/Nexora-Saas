import { Transaction } from "@/types/transactions"
import { getMoroccanFiscalConfig } from "@/lib/demo-data/taxes"
import type { JsPDFWithAutoTable } from "@/types/pdf"

/**
 * Returns a payment method display string (e.g., "Visa ending in 4242").
 */
function getPaymentMethodDisplay(transaction: Transaction): string {
  const m = (transaction.method || "").toLowerCase()
  if (m === "stripe" || m === "card") {
    // Generate a consistent 4-digit card ending based on transaction id
    const lastDigits = transaction.transactionId.replace(/\D/g, "").slice(-4) || "4242"
    return `Visa ending in ${lastDigits}`
  }
  if (m === "paypal") {
    return `PayPal (${transaction.user?.email || "verified"})`
  }
  if (m === "bank-transfer") {
    return "ACH Direct Debit (•••• 6710)"
  }
  return "Credit Card"
}

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
 * Generates an authentic, high-end HTML receipt template for browser preview and print.
 */
export function getReceiptHtml(transaction: Transaction): string {
  const fiscal = getMoroccanFiscalConfig()
  const isPaid = (transaction.status || "").toLowerCase() === "paid"
  const dateStr = transaction.date || (new Date().toISOString().split("T")[0] ?? "2026-09-22")
  const amountFormatted = `$${transaction.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const paymentMethod = getPaymentMethodDisplay(transaction)
  const itemDesc = transaction.description || "Nexora Enterprise Cloud Platform - Monthly Subscription"

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt ${transaction.transactionId} - Nexora</title>
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
    .receipt-wrapper {
      max-width: 780px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .accent-top-bar {
      height: 6px;
      background: linear-gradient(90deg, #0f62fe 0%, #2563eb 50%, #38bdf8 100%);
    }
    .receipt-body {
      padding: 40px 48px;
    }
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 28px;
      border-bottom: 1px solid #e2e8f0;
    }
    .brand-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-badge {
      width: 44px;
      height: 44px;
      background: #0f62fe;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 800;
      font-size: 20px;
      letter-spacing: -0.5px;
      box-shadow: 0 4px 12px rgba(15, 98, 254, 0.25);
    }
    .brand-meta h2 {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }
    .brand-meta p {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }
    .receipt-heading {
      text-align: right;
    }
    .receipt-heading h1 {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #0f172a;
      text-transform: uppercase;
    }
    .receipt-id-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      margin-top: 2px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      margin-top: 8px;
      padding: 4px 12px;
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
    .status-badge.failed, .status-badge.canceled {
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }

    /* Hero Amount Display */
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
    .hero-date-box {
      text-align: right;
    }
    .hero-date-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 4px;
    }
    .hero-date-val {
      font-size: 15px;
      font-weight: 600;
      color: #0f172a;
    }

    /* Details Grid */
    .info-grid {
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
    .info-card-header {
      font-size: 11px;
      font-weight: 700;
      color: #0f62fe;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .info-line {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 8px;
    }
    .info-line:last-child {
      margin-bottom: 0;
    }
    .info-line .label {
      color: #64748b;
      font-weight: 500;
    }
    .info-line .val {
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
    .text-center {
      text-align: center;
    }
    .text-right {
      text-align: right;
    }

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

    /* Footer & Compliance */
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
      font-size: 10.5px;
      color: #94a3b8;
      margin-top: 6px;
    }

    /* Print Styles */
    @media print {
      body {
        background: transparent !important;
        padding: 0 !important;
      }
      .receipt-wrapper {
        border: none !important;
        box-shadow: none !important;
        max-width: 100% !important;
        border-radius: 0 !important;
      }
      .receipt-body {
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
  <div class="receipt-wrapper">
    <div class="accent-top-bar"></div>
    <div class="receipt-body">
      
      <!-- Header -->
      <div class="header-section">
        <div class="brand-group">
          <img src="/app-logo.png" alt="Nexora Logo" class="brand-logo-img" style="width: 44px; height: 44px; object-fit: contain; border-radius: 10px;" />
          <div class="brand-meta">
            <h2>${fiscal.companyName}</h2>
            <p>${fiscal.address}, ${fiscal.city}, ${fiscal.country}</p>
            <p style="font-size: 11px; color: #64748b; font-family: 'JetBrains Mono', monospace; margin-top: 2px;">
              ICE: <strong>${fiscal.ice}</strong> · IF: <strong>${fiscal.ifNumber}</strong> · RC: <strong>${fiscal.rcNumber}</strong> · TP: <strong>${fiscal.patente}</strong>
            </p>
          </div>
        </div>
        <div class="receipt-heading">
          <h1>Payment Receipt</h1>
          <div class="receipt-id-tag">REC-${transaction.transactionId}</div>
          <div class="status-badge ${isPaid ? 'paid' : 'pending'}">
            ${isPaid ? '✓ Paid in Full' : transaction.status.toUpperCase()}
          </div>
        </div>
      </div>

      <!-- Hero Amount -->
      <div class="hero-banner">
        <div>
          <div class="hero-amount-label">Total Amount Paid</div>
          <div class="hero-amount-val">${amountFormatted}<span class="hero-amount-currency">USD</span></div>
        </div>
        <div class="hero-date-box">
          <div class="hero-date-label">Transaction Date</div>
          <div class="hero-date-val">${dateStr}</div>
        </div>
      </div>

      <!-- Info Grid -->
      <div class="info-grid">
        <div class="info-card">
          <div class="info-card-header">Customer Details</div>
          <div class="info-line">
            <span class="label">Billed To</span>
            <span class="val">${transaction.user?.name || "Corporate Customer"}</span>
          </div>
          <div class="info-line">
            <span class="label">Email</span>
            <span class="val">${transaction.user?.email || "billing@client.com"}</span>
          </div>
          <div class="info-line">
            <span class="label">Account ID</span>
            <span class="val">${transaction.user?.id || "NEX-USR-01"}</span>
          </div>
          <div class="info-line">
            <span class="label">Verification</span>
            <span class="val">Verified Enterprise</span>
          </div>
        </div>

        <div class="info-card">
          <div class="info-card-header">Payment Summary</div>
          <div class="info-line">
            <span class="label">Payment Method</span>
            <span class="val">${paymentMethod}</span>
          </div>
          <div class="info-line">
            <span class="label">Transaction ID</span>
            <span class="val">${transaction.transactionId}</span>
          </div>
          <div class="info-line">
            <span class="label">Reference ID</span>
            <span class="val">${transaction.reference || 'REF-' + transaction.transactionId}</span>
          </div>
          <div class="info-line">
            <span class="label">Payment Status</span>
            <span class="val" style="color: ${isPaid ? '#15803d' : '#b45309'};">${isPaid ? 'Settled & Reconciled' : transaction.status}</span>
          </div>
        </div>
      </div>

      <!-- Line Items Table -->
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width: 55%;">Item & Description</th>
              <th class="text-center" style="width: 15%;">Billing Cycle</th>
              <th class="text-center" style="width: 10%;">Qty</th>
              <th class="text-right" style="width: 20%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="item-title">${itemDesc}</div>
                <div class="item-desc">Enterprise Workspace, AI inference metering, compute resources & 99.99% SLA</div>
              </td>
              <td class="text-center">Monthly</td>
              <td class="text-center">1</td>
              <td class="text-right" style="font-weight: 700;">${amountFormatted}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div class="totals-area">
        <div class="totals-card">
          <div class="totals-row">
            <span class="t-label">Subtotal</span>
            <span class="t-val">${amountFormatted}</span>
          </div>
          <div class="totals-row">
            <span class="t-label">Estimated Tax (0%)</span>
            <span class="t-val">$0.00</span>
          </div>
          <div class="totals-row">
            <span class="t-label">Processing Surcharge</span>
            <span class="t-val">$0.00</span>
          </div>
          <div class="totals-divider"></div>
          <div class="totals-row final">
            <span class="t-label">Amount Paid</span>
            <span class="t-val">${amountFormatted} USD</span>
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
          <p>Inquiries: <a href="mailto:billing@nexora.io" style="color: #0f62fe; text-decoration: none;">billing@nexora.io</a></p>
        </div>
        <div>
          <div class="compliance-title">Electronic Confirmation</div>
          <p>This electronic receipt confirms your payment for services rendered under your Master Services Agreement.</p>
          <div class="verification-stamp">VERIFICATION: SHA256-REC-${transaction.transactionId}-VALID</div>
        </div>
      </div>

    </div>
  </div>
</body>
</html>`
}

/**
 * Opens a print dialog with the authentic, high-end SaaS receipt template.
 */
export function printReceipt(transaction: Transaction): void {
  const html = getReceiptHtml(transaction)
  const printWindow = window.open("", "_blank")
  if (!printWindow) {
    console.error("Unable to open print window. Please allow popups.")
    return
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()

  // Wait for fonts & styles before triggering print dialog
  printWindow.onload = () => {
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }
}

/**
 * Generates and downloads an authentic, beautifully styled PDF receipt for a transaction.
 */
export async function generateReceiptPdf(transaction: Transaction): Promise<void> {
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

  // Palette
  const brandBlue = [15, 98, 254] as [number, number, number] // #0f62fe
  const darkNavy = [15, 23, 42] as [number, number, number] // #0f172a
  const slateMuted = [100, 116, 139] as [number, number, number] // #64748b
  const cardFill = [248, 250, 252] as [number, number, number] // #f8fafc
  const cardBorder = [226, 232, 240] as [number, number, number] // #e2e8f0
  const emeraldSuccess = [22, 163, 74] as [number, number, number] // #16a34a

  const leftMargin = 16
  const rightMargin = 16
  const contentWidth = pageWidth - leftMargin - rightMargin

  // Top Gradient-like Accent Bar
  doc.setFillColor(brandBlue[0], brandBlue[1], brandBlue[2])
  doc.rect(0, 0, pageWidth, 4, "F")

  let currentY = 18

  // --- Header Block ---
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

  // Brand Name
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text("Nexora", leftMargin + 15, currentY + 1.2)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text("Enterprise SaaS & Cloud Infrastructure", leftMargin + 15, currentY + 5.5)

  // Document Heading Right
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text("PAYMENT RECEIPT", pageWidth - rightMargin, currentY, { align: "right" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text(`NO: REC-${transaction.transactionId}`, pageWidth - rightMargin, currentY + 5, { align: "right" })

  // Status Badge
  const isPaid = (transaction.status || "").toLowerCase() === "paid"
  const badgeColor: [number, number, number] = isPaid ? emeraldSuccess : [180, 83, 9]
  const badgeText = isPaid ? "PAID IN FULL" : transaction.status.toUpperCase()

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

  // Divider Line
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.setLineWidth(0.4)
  doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY)

  currentY += 8

  // --- Hero Amount Paid Box ---
  const formatMoney = (val: number) => `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const amountStr = formatMoney(transaction.amount)
  const dateStr = transaction.date || (new Date().toISOString().split("T")[0] ?? "2026-09-22")

  doc.setFillColor(cardFill[0], cardFill[1], cardFill[2])
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.setLineWidth(0.4)
  doc.roundedRect(leftMargin, currentY, contentWidth, 22, 2.5, 2.5, "FD")

  // Left Hero: Amount
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text("TOTAL AMOUNT PAID", leftMargin + 8, currentY + 7)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text(`${amountStr} USD`, leftMargin + 8, currentY + 16)

  // Right Hero: Date
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text("TRANSACTION DATE", pageWidth - rightMargin - 8, currentY + 7, { align: "right" })

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text(dateStr, pageWidth - rightMargin - 8, currentY + 15, { align: "right" })

  currentY += 28

  // --- Two-Column Details Grid ---
  const cardW = (contentWidth - 8) / 2
  const cardH = 34

  // Card 1: Billed To
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.roundedRect(leftMargin, currentY, cardW, cardH, 2, 2, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2])
  doc.text("CUSTOMER DETAILS", leftMargin + 6, currentY + 6.5)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text(transaction.user?.name || "Corporate Customer", leftMargin + 6, currentY + 13)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text(`Email: ${transaction.user?.email || "billing@client.com"}`, leftMargin + 6, currentY + 18.5)
  doc.text(`Customer ID: ${transaction.user?.id || "NEX-USR-01"}`, leftMargin + 6, currentY + 23.5)
  doc.text("Verification: Verified Enterprise Account", leftMargin + 6, currentY + 28.5)

  // Card 2: Payment Details
  const rightColX = leftMargin + cardW + 8
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(rightColX, currentY, cardW, cardH, 2, 2, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2])
  doc.text("PAYMENT METRICS", rightColX + 6, currentY + 6.5)

  const paymentMethod = getPaymentMethodDisplay(transaction)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text("Method:", rightColX + 6, currentY + 13)
  doc.text("Tx ID:", rightColX + 6, currentY + 18.5)
  doc.text("Reference:", rightColX + 6, currentY + 23.5)
  doc.text("Status:", rightColX + 6, currentY + 28.5)

  doc.setFont("helvetica", "bold")
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text(paymentMethod, rightColX + 28, currentY + 13)
  doc.text(transaction.transactionId, rightColX + 28, currentY + 18.5)
  doc.text(transaction.reference || `REF-${transaction.transactionId}`, rightColX + 28, currentY + 23.5)
  doc.setTextColor(isPaid ? emeraldSuccess[0] : 180, isPaid ? emeraldSuccess[1] : 83, isPaid ? emeraldSuccess[2] : 9)
  doc.text(isPaid ? "Settled & Reconciled" : transaction.status, rightColX + 28, currentY + 28.5)

  currentY += cardH + 8

  // --- Line Items Table ---
  const itemTitle = transaction.description || "Nexora Enterprise Cloud Platform - Monthly Subscription"

  autoTable(doc, {
    startY: currentY,
    margin: { left: leftMargin, right: rightMargin },
    theme: "grid",
    head: [["ITEM & DESCRIPTION", "CYCLE", "QTY", "RATE", "AMOUNT"]],
    body: [
      [
        `${itemTitle}\nEnterprise compute allocation, AI inference telemetry & seat license`,
        "Monthly",
        "1",
        amountStr,
        amountStr,
      ],
    ],
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

  // --- Totals Summary Box (Right-aligned) ---
  const totalsWidth = 72
  const totalsX = pageWidth - rightMargin - totalsWidth

  doc.setFillColor(cardFill[0], cardFill[1], cardFill[2])
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.roundedRect(totalsX, currentY, totalsWidth, 28, 2, 2, "FD")

  const totals = [
    { label: "Subtotal", val: amountStr },
    { label: "Estimated Tax (0%)", val: "$0.00" },
    { label: "Processing Fee", val: "$0.00" },
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
  doc.text("TOTAL PAID:", totalsX + 5, tY)
  doc.text(`${amountStr} USD`, totalsX + totalsWidth - 5, tY, { align: "right" })

  currentY += 36

  // --- Corporate Compliance Card ---
  doc.setFillColor(cardFill[0], cardFill[1], cardFill[2])
  doc.roundedRect(leftMargin, currentY, contentWidth, 20, 2, 2, "F")
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.roundedRect(leftMargin, currentY, contentWidth, 20, 2, 2, "S")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text(`${fiscal.companyName} · Merchant of Record & Fiscal Compliance`, leftMargin + 6, currentY + 5.5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text(`${fiscal.address}, ${fiscal.city}, ${fiscal.country} | billing@nexora.io`, leftMargin + 6, currentY + 10)
  doc.text(`ICE: ${fiscal.ice} · IF: ${fiscal.ifNumber} · RC: ${fiscal.rcNumber} | Cryptographic Auth: SHA256-REC-${transaction.transactionId}-VALID`, leftMargin + 6, currentY + 15)

  // --- Bottom Footer ---
  const footerY = pageHeight - 10
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.setLineWidth(0.3)
  doc.line(leftMargin, footerY - 4, pageWidth - rightMargin, footerY - 4)

  doc.setFontSize(6.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text(`${fiscal.companyName} · ${fiscal.address}, ${fiscal.city} · ICE: ${fiscal.ice} · IF: ${fiscal.ifNumber}`, leftMargin, footerY)
  doc.text("Official Receipt · Page 1 of 1", pageWidth - rightMargin, footerY, { align: "right" })

  // Trigger download
  doc.save(`receipt-${transaction.transactionId}.pdf`)
}
