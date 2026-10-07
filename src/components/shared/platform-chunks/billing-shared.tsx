"use client"

import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { formatMad } from "@/lib/platform/nexora-catalog"
import { cn } from "@/lib/utils"
import type { NxInvoiceStatus } from "@/types/platform-billing"

/** UX-04: amounts always show the currency; dates in the reader's locale. */
export function useBillingFormat() {
  const locale = useLocale()
  return {
    money: (n: number) => formatMad(n, locale === "ar" ? "ar-MA" : "fr-MA"),
    date: (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso.slice(0, 10)}T00:00:00`)),
  }
}

const INVOICE_CLASS: Record<NxInvoiceStatus, string> = {
  issued: "bg-info-soft text-info-foreground",
  paid: "bg-success-soft text-success-foreground",
  partly_paid: "bg-warning-soft text-warning-foreground",
  overdue: "bg-danger-soft text-destructive",
  credited: "bg-muted text-muted-foreground",
}

export function InvoiceStatusBadge({ status }: { status: NxInvoiceStatus }) {
  const t = useTranslations()
  return <Badge variant="outline" className={cn("border-transparent", INVOICE_CLASS[status])}>{t(`biInv_${status}`)}</Badge>
}

/** A section card with a title, used by every billing page. */
export function Panel({ title, hint, actions, children }: { title: string; hint?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}
