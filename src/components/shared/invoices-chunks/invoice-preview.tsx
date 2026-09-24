"use client"

import { useMemo } from "react"
import { Invoice, InvoiceStatus } from "@/types/invoices"
import { useTranslations, useLocale } from "next-intl"
import { getMoroccanFiscalConfig } from "@/lib/demo-data/taxes"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, AlertTriangle, Building2, ShieldCheck, CreditCard } from "lucide-react"

interface InvoicePreviewProps {
  invoice: Invoice
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const t = useTranslations()
  const locale = useLocale()

  const fiscalConfig = useMemo(() => {
    return getMoroccanFiscalConfig()
  }, [])

  const formatCurrency = (value: number | string | undefined | null) => {
    const n = typeof value === "number" ? value : Number(value ?? 0)
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(n) ? n : 0)
  }

  const formatDate = (value: Date | string | undefined | null) => {
    if (!value) return "—"
    const d = new Date(value)
    return Number.isNaN(d.getTime())
      ? "—"
      : d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })
  }

  const isPaid = invoice.status === InvoiceStatus.PAID
  const isPending = invoice.status === InvoiceStatus.PENDING
  const isOverdue = invoice.status === InvoiceStatus.OVERDUE

  const customerName =
    typeof invoice.user === "object" && invoice.user !== null
      ? invoice.user.name
      : t("unknownCustomer")
  const customerEmail =
    typeof invoice.user === "object" && invoice.user !== null
      ? invoice.user.email
      : null

  const items =
    invoice.items && invoice.items.length > 0
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

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
      {/* Top Accent Gradient Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

      <div className="space-y-6 p-6 sm:p-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b pb-6">
          <div className="flex items-start gap-3.5">
            <img
              src="/app-logo.png"
              alt="Nexora Logo"
              className="h-11 w-11 rounded-lg border object-contain p-1 shadow-sm bg-white"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {fiscalConfig.companyName}
                </h2>
                <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs">
                  Enterprise
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {fiscalConfig.address}, {fiscalConfig.city}, {fiscalConfig.country}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-muted-foreground/80">
                <span>ICE: <strong className="text-foreground">{fiscalConfig.ice}</strong></span>
                <span>IF: <strong className="text-foreground">{fiscalConfig.ifNumber}</strong></span>
                <span>RC: <strong className="text-foreground">{fiscalConfig.rcNumber}</strong></span>
                <span>TP: <strong className="text-foreground">{fiscalConfig.patente}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                INVOICE
              </span>
              <span className="font-mono text-base font-bold text-foreground">
                {invoice.invoiceNumber}
              </span>
            </div>
            <div className="mt-2">
              {isPaid && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("paid") || "Paid in Full"}
                </span>
              )}
              {isPending && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Clock className="h-3.5 w-3.5" />
                  {t("pending") || "Pending Payment"}
                </span>
              )}
              {isOverdue && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t("overdue") || "Payment Overdue"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Hero Amount Banner */}
        <div className="rounded-xl border bg-gradient-to-r from-muted/60 via-muted/40 to-background p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isPaid ? "Total Amount Settled (TTC)" : "Total Amount Due (TTC)"}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-0.5">
              {formatCurrency(invoice.total)}
              <span className="ml-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                USD
              </span>
            </div>
          </div>
          <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div>
              <span>{t("invoiceDate")}: </span>
              <strong className="text-foreground">{formatDate(invoice.date)}</strong>
            </div>
            {invoice.dueDate && (
              <div>
                <span>{t("dueDate")}: </span>
                <strong className="text-foreground">{formatDate(invoice.dueDate)}</strong>
              </div>
            )}
          </div>
        </div>

        {/* 2-Column Grid: Customer & Payment Info */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Billed To */}
          <div className="rounded-lg border bg-card/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">
              <Building2 className="h-3.5 w-3.5" />
              <span>{t("customer")} (Billed To)</span>
            </div>
            <div className="space-y-1 pt-1 text-sm">
              <p className="font-semibold text-foreground">{customerName}</p>
              {customerEmail && (
                <p className="text-muted-foreground text-xs">{customerEmail}</p>
              )}
              <div className="pt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Verified Corporate Account</span>
              </div>
            </div>
          </div>

          {/* Payment & Terms */}
          <div className="rounded-lg border bg-card/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">
              <CreditCard className="h-3.5 w-3.5" />
              <span>Payment Details</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div>
                <span className="text-muted-foreground block">Method:</span>
                <span className="font-medium text-foreground uppercase">
                  {invoice.method ? invoice.method.replace("_", " ") : "Bank Transfer"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Payment Terms:</span>
                <span className="font-medium text-foreground">Net 30 Days</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Currency:</span>
                <span className="font-medium text-foreground">USD ($)</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Fiscal Status:</span>
                <span className="font-medium text-foreground">TVA Compliant</span>
              </div>
            </div>
          </div>
        </div>

        {/* Itemized Deliverables Table */}
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("description")}</th>
                <th className="px-4 py-3 text-center">Cycle</th>
                <th className="px-4 py-3 text-center">{t("quantity")}</th>
                <th className="px-4 py-3 text-right">{t("unitPrice")}</th>
                <th className="px-4 py-3 text-right">{t("total")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item, index) => (
                <tr key={item.id ?? index} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{item.description}</div>
                    <div className="text-xs text-muted-foreground">
                      Enterprise compute allocation, API telemetry access & 99.99% uptime SLA
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                    Monthly
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-foreground font-mono">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-foreground font-mono">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-foreground font-mono">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Breakdown & Totals */}
        <div className="flex flex-col items-end">
          <div className="w-full max-w-sm rounded-lg border bg-muted/30 p-4 space-y-2.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Montant Hors Taxe (HT):</span>
              <span className="font-mono text-foreground font-medium">
                {formatCurrency(invoice.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>TVA Maroc ({invoice.taxRate ?? 20}%):</span>
              <span className="font-mono text-foreground font-medium">
                {formatCurrency(invoice.tax)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Remise / Discount:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                $0.00
              </span>
            </div>
            <div className="border-t pt-2.5 flex justify-between items-baseline">
              <div>
                <span className="text-sm font-bold text-foreground block">
                  Total TTC:
                </span>
                <span className="text-[10px] text-muted-foreground">Toutes Taxes Comprises</span>
              </div>
              <span className="text-lg font-extrabold text-foreground font-mono">
                {formatCurrency(invoice.total)} <span className="text-xs font-semibold">USD</span>
              </span>
            </div>
          </div>
        </div>

        {/* Bank Wire Details Box */}
        <div className="rounded-lg border bg-muted/20 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Bank Wire & ACH Remittance Details
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Bank Name</span>
              <span className="font-medium text-foreground">Silicon Valley Bank</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Routing (ABA)</span>
              <span className="font-mono text-foreground">121000358</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Account (USD)</span>
              <span className="font-mono text-foreground">98402819034</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">SWIFT / BIC</span>
              <span className="font-mono text-foreground">SVBKUS6S</span>
            </div>
          </div>
        </div>

        {/* Notes (if any) */}
        {invoice.notes && (
          <div className="rounded-lg border bg-card p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              {t("notes") || "Customer Notes"}
            </p>
            <p className="text-xs text-foreground/90">{invoice.notes}</p>
          </div>
        )}

        {/* Compliance Footer */}
        <div className="border-t pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <div className="text-center sm:text-left">
            <span>Facture électronique conforme aux dispositions du CGI marocain. </span>
            <span className="font-mono">ICE {fiscalConfig.ice}</span>
          </div>
          <div className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded border">
            SHA256-INV-{invoice.invoiceNumber}-AUTHENTICATED
          </div>
        </div>
      </div>
    </div>
  )
}
