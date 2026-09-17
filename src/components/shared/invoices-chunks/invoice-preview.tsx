"use client"

import { Invoice } from "@/types/invoices"
import { useTranslations, useLocale } from "next-intl"

interface InvoicePreviewProps {
  invoice: Invoice
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const t = useTranslations()
  const locale = useLocale()

  const formatCurrency = (value: number | string | undefined | null) => {
    const n = typeof value === "number" ? value : Number(value ?? 0)
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD", // swap for invoice.currency if/when you add one
    }).format(Number.isFinite(n) ? n : 0)
  }

  const formatDate = (value: Date | string | undefined | null) => {
    if (!value) return "—"
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(locale)
  }

  // user may or may not be populated depending on the API call that fetched this invoice
  const customerName =
    typeof invoice.user === "object" && invoice.user !== null
      ? invoice.user.name
      : t("unknownCustomer")
  const customerEmail =
    typeof invoice.user === "object" && invoice.user !== null
      ? invoice.user.email
      : null

  return (
    <div className="space-y-6 p-3 py-0">
      {/* Invoice Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{invoice.invoiceNumber}</h2>
          <p className="text-sm text-muted-foreground">
            {t("invoiceDate")}: {formatDate(invoice.date)}
          </p>
          {invoice.dueDate && (
            <p className="text-sm text-muted-foreground">
              {t("dueDate")}: {formatDate(invoice.dueDate)}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{t("yourCompany")}</p>
          <p className="text-sm text-muted-foreground">company@example.com</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="rounded-md border bg-background p-3">
        <p className="text-sm font-medium">{t("customer")}</p>
        <p className="text-base font-semibold">{customerName}</p>
        {customerEmail && (
          <p className="text-sm text-muted-foreground">{customerEmail}</p>
        )}
      </div>

      {/* Items Table */}
      <div className="rounded-md border bg-background">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium">
                {t("description")}
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium">
                {t("quantity")}
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium">
                {t("unitPrice")}
              </th>
              <th className="px-4 py-2 text-right text-sm font-medium">
                {t("total")}
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.length > 0 ? (
              invoice.items.map((item, index) => (
                <tr
                  key={item.id ?? (item as { _id?: string })._id ?? index}
                  className="border-b last:border-0"
                >
                  <td className="px-4 py-2 text-sm">{item.description}</td>
                  <td className="px-4 py-2 text-right text-sm">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-2 text-right text-sm">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-medium">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-sm text-muted-foreground"
                >
                  {t("noItems")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex flex-col items-end space-y-2 px-2">
        <div className="flex w-full justify-between text-sm">
          <span className="text-muted-foreground">{t("subtotal")}</span>
          <span>{formatCurrency(invoice.subtotal)}</span>
        </div>
        <div className="flex w-full justify-between text-sm">
          <span className="text-muted-foreground">{t("tax")}</span>
          <span>{formatCurrency(invoice.tax)}</span>
        </div>
        <div className="flex w-full justify-between border-t pt-2 text-lg font-bold">
          <span>{t("total")}</span>
          <span>{formatCurrency(invoice.total)}</span>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">{t("notes")}</p>
          <p className="text-sm text-muted-foreground">{invoice.notes}</p>
        </div>
      )}
    </div>
  )
}
