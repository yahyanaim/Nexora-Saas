"use client"

import { useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { AlertTriangle, Clock, DownloadIcon, Receipt } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useClients } from "@/hooks/workforce/use-workforce"
import { useClientInvoices } from "@/hooks/workforce/use-work-billing"
import { AGING_BUCKETS, receivablesAging, type AgingBucket } from "@/lib/workforce/billing"
import { exportToCsv } from "@/lib/utils/export-data"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { PaymentReminders } from "./payment-reminders"

const BUCKET_LABEL: Record<AgingBucket, string> = {
  current: "agingCurrent",
  d1_30: "aging1to30",
  d31_60: "aging31to60",
  d61_90: "aging61to90",
  d90_plus: "aging90plus",
}

/** Open balances per client by how long they are past due (BIL-16), and overdue reminders (BIL-15). */
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
      {/* Phones: one card per client with its balance by age */}
      <section className="space-y-2 md:hidden">
        {isLoading ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState icon={Receipt} title={t("noOpenReceivables")} />
        ) : (
          <>
            {rows.map((r) => (
              <div key={r.clientId} className="rounded-2xl border border-border bg-card p-4 shadow-panel">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{t("invoiceCount", { count: r.count })}</p>
                  </div>
                  <span className="font-semibold tabular-nums">{money(r.total)}</span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-sm">
                  {AGING_BUCKETS.filter((b) => r[b] !== 0).map((b) => (
                    <div key={b} className="min-w-0">
                      <dt className="truncate text-xs text-muted-foreground">{t(BUCKET_LABEL[b])}</dt>
                      <dd className={`tabular-nums ${b === "d90_plus" ? "font-medium text-destructive" : ""}`}>{money(r[b])}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm font-semibold">
              <span>{t("total")}</span>
              <span className="tabular-nums">{money(grand)}</span>
            </div>
          </>
        )}
      </section>
      <section className="hidden overflow-x-auto rounded-3xl border border-border bg-card shadow-panel md:block">
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
            {isLoading ? (
              <tr>
                <td colSpan={AGING_BUCKETS.length + 2} className="p-4"><ListSkeleton rows={3} /></td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={AGING_BUCKETS.length + 2} className="p-4"><EmptyState icon={Receipt} title={t("noOpenReceivables")} className="border-0" /></td>
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
      <PaymentReminders invoices={invoices} clients={clients} />
    </div>
  )
}
