"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { ListSkeleton } from "@/components/ui/empty-state"
import { CalendarRange, ChartLineData, Funnel, ShieldCheck } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { useClientInvoices } from "@/hooks/workforce/use-work-billing"
import { useRecurringInvoices } from "@/hooks/workforce/use-crm"
import { useBookings } from "@/hooks/workforce/use-bookings"
import { useEmployees } from "@/hooks/workforce/use-workforce"
import { useDeals } from "@/hooks/workforce/use-deals"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { todayIso } from "@/lib/workforce/project-metrics"
import { FORECAST_SOURCES, forecastMonths, forecastTotals, revenueForecast, type ForecastMonth, type ForecastSource } from "@/lib/workforce/revenue-forecast"
import { cn } from "@/lib/utils"

const HORIZONS = [3, 6, 12] as const

/** Categorical slots in fixed order, most certain source first. */
const SERIES: Record<ForecastSource, string> = {
  invoiced: "bg-series-1",
  recurring: "bg-series-2",
  booked: "bg-series-3",
  pipeline: "bg-series-4",
}

/** Income expected each month from invoices, recurring billing, booked work and weighted deals (Phase 6g.3). */
export default function ForecastPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { currency } = useCurrentWorkspace()
  const invoices = useClientInvoices()
  const recurring = useRecurringInvoices()
  const bookings = useBookings()
  const employees = useEmployees()
  const deals = useDeals()
  const { data: settings } = useWorkspaceSettings()
  const isLoading = [invoices, recurring, bookings, employees, deals].some((q) => q.isLoading)

  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(6)
  const [hover, setHover] = useState<string | null>(null)
  const today = todayIso()
  const months = useMemo(() => forecastMonths(today, horizon), [today, horizon])
  const holidays = useMemo(() => (settings?.holidays ?? []).map((h) => h.date), [settings])

  const rows = useMemo(
    () =>
      revenueForecast(
        { invoices: invoices.data ?? [], recurring: recurring.data ?? [], bookings: bookings.data ?? [], employees: employees.data ?? [], deals: deals.data ?? [], holidays },
        today,
        months
      ),
    [invoices.data, recurring.data, bookings.data, employees.data, deals.data, holidays, today, months]
  )
  const totals = forecastTotals(rows)
  const next3 = forecastTotals(rows.slice(0, 3))
  const max = Math.max(1, ...rows.map((r) => r.total))

  const money = (n: number) => formatMoney(n, currency, locale)
  const compact = (n: number) => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n)
  const monthLabel = (m: string, style: "short" | "long" = "short") => new Intl.DateTimeFormat(locale, { month: style, year: style === "long" ? "numeric" : "2-digit" }).format(new Date(`${m}-01T00:00:00`))

  const cards: MetricCardItem[] = [
    { key: "next3", title: t("fcNext3"), value: money(next3.total), valueClassName: "text-primary", footer: { icon: CalendarRange, text: t("fcNext3Hint") } },
    { key: "total", title: t("fcHorizonTotal", { months: horizon }), value: money(totals.total), footer: { icon: ChartLineData, text: t("fcHorizonHint") } },
    { key: "secured", title: t("fcSecured"), value: totals.securedShare === null ? "—" : `${totals.securedShare}%`, valueClassName: "text-success", footer: { icon: ShieldCheck, text: t("fcSecuredHint", { amount: money(totals.secured) }) } },
    { key: "pipeline", title: t("fcPipeline"), value: money(totals.pipeline), footer: { icon: Funnel, text: t("fcPipelineHint") } },
  ]

  const tooltip = (r: ForecastMonth) => (
    <div className="pointer-events-none absolute bottom-full start-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-xl border border-border bg-popover p-3 text-xs shadow-lg rtl:translate-x-1/2">
      <p className="mb-1.5 font-semibold text-foreground">{monthLabel(r.month, "long")}</p>
      {FORECAST_SOURCES.map((s) => (
        <p key={s} className="flex items-center justify-between gap-3 text-muted-foreground">
          <span className="flex items-center gap-1.5 whitespace-nowrap"><span className={cn("size-2 rounded-sm", SERIES[s])} />{t(`fcSource_${s}`)}</span>
          <span className="tabular-nums text-foreground">{money(r[s])}</span>
        </p>
      ))}
      <p className="mt-1.5 flex justify-between border-t border-border pt-1.5 font-medium text-foreground"><span>{t("total")}</span><span className="tabular-nums">{money(r.total)}</span></p>
    </div>
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{t("fcByMonth")}</h2>
            <p className="text-sm text-muted-foreground">{t("fcByMonthHint", { currency })}</p>
          </div>
          <div className="flex gap-1 rounded-full border border-border p-1">
            {HORIZONS.map((h) => (
              <Button key={h} size="sm" variant={h === horizon ? "default" : "ghost"} className="rounded-full" onClick={() => setHorizon(h)}>{t("fcMonths", { months: h })}</Button>
            ))}
          </div>
        </div>
        <div className="mb-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {FORECAST_SOURCES.map((s) => <span key={s} className="flex items-center gap-1.5"><span className={cn("size-3 rounded-sm", SERIES[s])} />{t(`fcSource_${s}`)}</span>)}
        </div>

        {isLoading ? (
          <ListSkeleton />
        ) : (
          <>
            <div className="relative flex h-64 items-end gap-2 border-b border-border px-1 sm:gap-4" role="img" aria-label={t("fcByMonth")}>
              {rows.map((r) => (
                <div
                  key={r.month}
                  className="relative flex h-full flex-1 flex-col items-center justify-end"
                  onMouseEnter={() => setHover(r.month)}
                  onMouseLeave={() => setHover(null)}
                >
                  {hover === r.month && tooltip(r)}
                  <span className="mb-1 text-[11px] font-medium tabular-nums text-muted-foreground">{r.total ? compact(r.total) : ""}</span>
                  {/* Stack from the baseline, most certain at the bottom; 2px gaps between segments */}
                  <div className={cn("flex w-full max-w-14 flex-col-reverse gap-0.5 transition-opacity", hover && hover !== r.month && "opacity-60")} style={{ height: `${(r.total / max) * 85}%` }}>
                    {FORECAST_SOURCES.filter((s) => r[s] > 0).map((s, i, arr) => (
                      <div key={s} className={cn(SERIES[s], i === arr.length - 1 && "rounded-t", "min-h-px")} style={{ flexGrow: r[s] }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-1 pt-2 sm:gap-4">
              {rows.map((r) => <span key={r.month} className="flex-1 text-center text-xs text-muted-foreground">{monthLabel(r.month)}</span>)}
            </div>

            <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[40rem] text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="sticky start-0 bg-muted/40 px-3 py-2 text-start font-medium">{t("fcSource")}</th>
                    {rows.map((r) => <th key={r.month} className="px-3 py-2 text-end font-medium">{monthLabel(r.month)}</th>)}
                    <th className="px-3 py-2 text-end font-medium">{t("total")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {FORECAST_SOURCES.map((s) => (
                    <tr key={s}>
                      <td className="sticky start-0 bg-card px-3 py-2">
                        <span className="flex items-center gap-2"><span className={cn("size-2.5 rounded-sm", SERIES[s])} />{t(`fcSource_${s}`)}</span>
                        <span className="block text-xs text-muted-foreground">{t(`fcSourceHint_${s}`)}</span>
                      </td>
                      {rows.map((r) => <td key={r.month} className="px-3 py-2 text-end tabular-nums">{r[s] ? compact(r[s]) : "—"}</td>)}
                      <td className="px-3 py-2 text-end font-medium tabular-nums">{compact(totals[s])}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30 font-semibold">
                    <td className="sticky start-0 bg-muted/30 px-3 py-2">{t("total")}</td>
                    {rows.map((r) => <td key={r.month} className="px-3 py-2 text-end tabular-nums">{compact(r.total)}</td>)}
                    <td className="px-3 py-2 text-end tabular-nums">{compact(totals.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
