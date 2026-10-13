"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ListSkeleton } from "@/components/ui/empty-state"
import { AlertTriangle, CalendarClock, ChartLine, Headset } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { KpiTile } from "@/components/shared/kpi-tile"
import { FilterPill } from "@/components/shared/overview-chunks/filter-pill"
import { Link } from "@/i18n/navigation"
import { useConsoleCustomers } from "@/hooks/platform/use-platform-console"
import { useNxInvoices } from "@/hooks/platform/use-platform-billing"
import { useSupportRequests } from "@/hooks/platform/use-platform-support"
import { sparkline } from "@/lib/ui/sparkline"
import { planById } from "@/lib/platform/nexora-catalog"
import { HOME_COMPARES, HOME_RANGES, attentionList, homeFigures, revenueBy, type AttentionItem, type HomeCompare, type HomeRange } from "./console-home-model"
import { Panel, useBillingFormat } from "./billing-shared"

// recharts loads in its own bundle after the page shows (PERF-01), as on the companies' Overview
const ChartPlaceholder = () => <div className="h-80 animate-pulse rounded-xl border border-border bg-card" aria-hidden />
const MrrTrendChart = dynamic(() => import("./metrics-charts").then((m) => m.MrrTrendChart), { ssr: false, loading: ChartPlaceholder })
const RevenueByChart = dynamic(() => import("./console-home-charts").then((m) => m.RevenueByChart), { ssr: false, loading: ChartPlaceholder })

const COMPARE_LABEL: Record<HomeCompare, string> = { previous: "comparePrevious", lastYear: "compareLastYear", none: "compareNone" }

/**
 * The Nexora team's home: recurring revenue and its health over a period,
 * where it comes from, and what needs someone today. Every figure comes from
 * the metric functions of the Metrics page.
 */
export default function ConsoleHomePage() {
  const t = useTranslations()
  const locale = useLocale()
  const { money } = useBillingFormat()
  const { data: invoices = [], isLoading: l1 } = useNxInvoices()
  const { data: accounts = [], isLoading: l2 } = useConsoleCustomers()
  const { data: requests = [] } = useSupportRequests()
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const [range, setRange] = useState<HomeRange>(12)
  const [compare, setCompare] = useState<HomeCompare>("previous")
  const f = useMemo(() => homeFigures(invoices, accounts, today, range, compare), [invoices, accounts, today, range, compare])
  const attention = useMemo(() => attentionList(accounts, requests, today), [accounts, requests, today])
  const byPlan = useMemo(() => revenueBy(accounts, "plan").map((g) => ({ ...g, label: planById(g.key as Parameters<typeof planById>[0]).name })), [accounts])
  const regions = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale])
  const byCountry = useMemo(() => revenueBy(accounts, "country").map((g) => ({ ...g, label: regions.of(g.key) ?? g.key })), [accounts, regions])

  const compactMoney = (n: number, opts?: { compact?: boolean }) =>
    opts?.compact ? `${new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n)} MAD` : money(n)
  const pct = (v: number | null, digits = 1) => (v === null ? "—" : new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: digits }).format(v))
  const signedPct = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v * 1000) / 10).toLocaleString(locale)}%`)
  const signedPts = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v * 10) / 10).toLocaleString(locale)} pts`)
  const compared = compare !== "none"
  const period = t("chPeriodShort", { n: range })
  const monthLabel = (m: string) => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(`${m}-01T00:00:00`))
  const refLabel = f.reference ? monthLabel(f.reference.month) : ""
  const isLoading = l1 || l2

  return (
    <div className="w-full space-y-5 p-4 md:p-6">
      <PageHeader
        actions={<Button variant="outline" size="sm" asChild><Link href="/dashboard/metrics"><ChartLine className="text-muted-foreground" />{t("chAllMetrics")}</Link></Button>}
      >
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill label={t("chLastMonths", { n: range })} value={range} width="w-44" onChange={setRange} options={HOME_RANGES.map((r) => ({ value: r, label: t("chLastMonths", { n: r }) }))} />
          <FilterPill label={t(COMPARE_LABEL[compare])} value={compare} onChange={setCompare} options={HOME_COMPARES.map((c) => ({ value: c, label: t(COMPARE_LABEL[c]) }))} />
        </div>
      </PageHeader>

      {isLoading ? <ListSkeleton /> : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6 [&>*:nth-child(-n+3)]:lg:col-span-2 [&>*:nth-child(n+4)]:lg:col-span-3">
            <KpiTile
              title={t("metMrr")}
              value={money(f.mrr)}
              period={period}
              change={compared ? signedPct(f.mrrChange) : "—"}
              isPositive={(f.mrrChange ?? 0) >= 0}
              sparkline={sparkline(f.window.map((r) => r.mrr))}
              description={t("metDefMrr")}
              noteLabel={t("anOperationalNote")}
              note={compared && f.reference ? t("chNoteMrr", { paying: f.paying, ref: refLabel, before: money(f.reference.mrr) }) : t("chNoteMrrNoCompare", { paying: f.paying })}
            />
            <KpiTile
              title={t("metArr")}
              value={money(f.arr)}
              period={period}
              change={compared ? signedPct(f.mrrChange) : "—"}
              isPositive={(f.mrrChange ?? 0) >= 0}
              sparkline={sparkline(f.window.map((r) => r.mrr * 12))}
              description={t("metDefArr")}
              noteLabel={t("anOperationalNote")}
              note={t("chNoteArr", { arpa: money(f.paying ? f.mrr / f.paying : 0) })}
            />
            <KpiTile
              title={t("metCustomerChurn")}
              value={pct(f.churn)}
              period={period}
              change={compared ? signedPts(f.churnChange) : "—"}
              isPositive={(f.churnChange ?? 0) <= 0}
              sparkline={sparkline(f.window.map((r) => (r.customerChurn ?? 0) * 100))}
              description={t("chDefChurn")}
              noteLabel={t("anOperationalNote")}
              note={t("chNoteChurn", { month: f.window.length ? monthLabel(f.window[f.window.length - 1]!.month) : "—" })}
            />
            <KpiTile
              title={t("chConversion")}
              value={pct(f.trials.rate, 0)}
              period={t("chAllTime")}
              description={t("chDefConversion")}
              noteLabel={t("anOperationalNote")}
              note={t("chNoteTrials", { converted: f.trials.converted, lost: f.trials.lost, n: f.trials.running })}
            />
            <KpiTile
              title={t("chOwed")}
              value={money(f.owed)}
              period={t("chToday")}
              description={t("chDefOwed")}
              noteLabel={t("anOperationalNote")}
              note={t("chNoteOwed", { overdue: money(f.overdue), n: f.overdueInvoices })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-8"><MrrTrendChart rows={f.window} money={compactMoney} rangeLabel={t("chLastMonths", { n: range })} /></div>
            <div className="xl:col-span-4"><Attention items={attention} /></div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RevenueByChart title={t("chByPlan")} hint={t("chByHint")} rows={byPlan} money={compactMoney} />
            <RevenueByChart title={t("chByCountry")} hint={t("chByHint")} rows={byCountry} money={compactMoney} />
          </div>
        </>
      )}
    </div>
  )
}

const ICON = { overdue: AlertTriangle, trial: CalendarClock, support: Headset } as const
const TONE = { overdue: "bg-danger-soft text-destructive", trial: "bg-warning-soft text-warning-foreground", support: "bg-info-soft text-info-foreground" } as const

function Attention({ items }: { items: AttentionItem[] }) {
  const t = useTranslations()
  const text = (i: AttentionItem) =>
    i.kind === "overdue" ? t("chAttOverdue") : i.kind === "trial" ? t("chAttTrial", { days: i.days }) : t("chAttSupport", { number: i.number, subject: i.subject })
  return (
    <Panel title={t("chAttention")} hint={t("chAttentionHint")}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("chAttentionEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((i) => {
            const Icon = ICON[i.kind]
            return (
              <li key={`${i.kind}-${i.id}`}>
                <Link href={i.href} className="flex items-start gap-3 rounded-2xl border border-border p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full ${TONE[i.kind]}`}><Icon className="size-4" aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{i.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{text(i)}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
