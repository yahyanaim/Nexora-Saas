"use client"

import { useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { AlertTriangle, Clock, DownloadIcon, Receipt } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useClients } from "@/hooks/workforce/use-workforce"
import { useClientInvoices } from "@/hooks/workforce/use-work-billing"
import { AGING_BUCKETS, receivablesAging, type AgingBucket } from "@/lib/workforce/billing"
import { exportToCsv } from "@/lib/utils/export-data"
import { formatMoney } from "../workforce-chunks/workforce-labels"

const BUCKET_LABEL: Record<AgingBucket, string> = {
  current: "agingCurrent",
  d1_30: "aging1to30",
  d31_60: "aging31to60",
  d61_90: "aging61to90",
  d90_plus: "aging90plus",
}

/** Open balances per client by how long they are past due (BIL-15), in the base currency. */
export default function ReceivablesPage() {
  const t = useTranslations()
  const locale = useLocale()
  const workspace = useCurrentWorkspace()
  const { data: invoices = [], isLoading } = useClientInvoices()
  const { data: clients = [] } = useClients()
  const money = (n: number) => formatMoney(n, workspace.currency, locale)

  const rows = useMemo(
    () =>
      [...receivablesAging(invoices).entries()]
        .map(([clientId, row]) => ({ clientId, name: clients.find((c) => c.id === clientId)?.name ?? "—", ...row }))
        .sort((a, b) => b.total - a.total),
    [invoices, clients]
  )
  const totals = AGING_BUCKETS.reduce(
    (acc, b) => ({ ...acc, [b]: rows.reduce((s, r) => s + r[b], 0) }),
    {} as Record<AgingBucket, number>
  )
  const grand = rows.reduce((s, r) => s + r.total, 0)
  const overdue = grand - totals.current

  const cards: MetricCardItem[] = [
    { key: "open", title: t("openReceivables"), value: money(grand), valueClassName: "text-primary", footer: { icon: Receipt, text: t("clientsWithBalance", { count: rows.length }) } },
    { key: "current", title: t("agingCurrent"), value: money(totals.current), footer: { icon: Clock, text: t("notYetDue") } },
    { key: "overdue", title: t("overdue"), value: money(overdue), valueClassName: overdue > 0 ? "text-warning-foreground" : undefined, footer: { icon: AlertTriangle, text: t("pastDueDate") } },
    { key: "late", title: t("aging90plus"), value: money(totals.d90_plus), valueClassName: totals.d90_plus > 0 ? "text-destructive" : undefined, footer: { icon: AlertTriangle, text: t("followUpNow") } },
  ]

  const exportRows = () =>
    exportToCsv(
      rows.map((r) => ({ client: r.name, invoices: r.count, ...Object.fromEntries(AGING_BUCKETS.map((b) => [b, r[b]])), total: r.total })),
      "receivables-aging",
      [
        { key: "client", label: t("client") },
        { key: "invoices", label: t("invoices") },
        ...AGING_BUCKETS.map((b) => ({ key: b, label: t(BUCKET_LABEL[b]) })),
        { key: "total", label: t("total") },
      ]
    )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={
          <Button variant="outline" onClick={exportRows} disabled={rows.length === 0}>
            <DownloadIcon className="size-4" />
            {t("exportCsv")}
          </Button>
        }
      />
      <MetricCardGrid cards={cards} isLoading={isLoading} />
      <section className="overflow-x-auto rounded-3xl border border-border bg-card shadow-panel">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-start font-medium">{t("client")}</th>
              {AGING_BUCKETS.map((b) => (
                <th key={b} className="px-4 py-3 text-end font-medium">{t(BUCKET_LABEL[b])}</th>
              ))}
              <th className="px-4 py-3 text-end font-medium">{t("total")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={AGING_BUCKETS.length + 2} className="px-4 py-12 text-center text-muted-foreground">{t("noOpenReceivables")}</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.clientId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium">{r.name}</span>
                    <span className="block text-xs text-muted-foreground">{t("invoiceCount", { count: r.count })}</span>
                  </td>
                  {AGING_BUCKETS.map((b) => (
                    <td key={b} className={`px-4 py-3 text-end tabular-nums ${r[b] === 0 ? "text-muted-foreground" : b === "d90_plus" ? "text-destructive font-medium" : ""}`}>
                      {r[b] === 0 ? "—" : money(r[b])}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-end font-semibold tabular-nums">{money(r.total)}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-border font-semibold">
                <td className="px-4 py-3">{t("total")}</td>
                {AGING_BUCKETS.map((b) => (
                  <td key={b} className="px-4 py-3 text-end tabular-nums">{money(totals[b])}</td>
                ))}
                <td className="px-4 py-3 text-end tabular-nums">{money(grand)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </section>
    </div>
  )
}
