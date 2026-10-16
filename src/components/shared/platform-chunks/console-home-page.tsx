"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ListSkeleton } from "@/components/ui/empty-state"
import { AlertTriangle, CalendarClock, ChartLine, Download, FileText, Headset, Information } from "@/components/ui/carbon/icons"
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
import { useBillingFormat } from "./billing-shared"
import { SaveReportMenu } from "./save-report-menu"
import { useMetricsExportAudit, useNexoraIdentity } from "@/hooks/platform/use-platform-config"
import { exportToCsv } from "@/lib/utils/export-data"
import { RevenueByChart } from "./console-home-charts"

// recharts loads in its own bundle after the page shows (PERF-01), as on the companies' Overview
const ChartPlaceholder = () => <div className="h-80 animate-pulse rounded-xl border border-border/70 bg-card" aria-hidden />
const MrrTrendChart = dynamic(() => import("./metrics-charts").then((m) => m.MrrTrendChart), { ssr: false, loading: ChartPlaceholder })

const COMPARE_LABEL: Record<HomeCompare, string> = { previous: "comparePrevious", lastYear: "compareLastYear", none: "compareNone" }

/**
 * The Nexora team's home: recurring revenue and its health over a period,
 * where it comes from, and what needs someone today. Every figure comes from
 * the metric functions of the Metrics page.
 */
export default function ConsoleHomePage() {
  const t = useTranslations()
  const locale = useLocale()
  // tiles and charts without cents, as on the companies' Analytics
  const { wholeMoney: money } = useBillingFormat()
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

  const pct = (v: number | null, digits = 1) => (v === null ? "—" : new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: digits }).format(v))
  const signedPct = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v * 1000) / 10).toLocaleString(locale)}%`)
  const signedPts = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v * 10) / 10).toLocaleString(locale)} pts`)
  const compared = compare !== "none"
  const period = t("chPeriodShort", { n: range })
  const monthLabel = (m: string) => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(`${m}-01T00:00:00`))
  const refLabel = f.reference ? monthLabel(f.reference.month) : ""
  const isLoading = l1 || l2
  const { data: identity } = useNexoraIdentity()
  const auditExport = useMetricsExportAudit()

  // "Save as report" (A11 step 5): the four figures and the months of the period, with the comparison when chosen
  const periodText = f.window.length ? `${monthLabel(f.window[0]!.month)} – ${monthLabel(f.window[f.window.length - 1]!.month)}` : ""
  const fileBase = `nexora-console-home-${today}`
  const reportColumns = [
    { key: "month", label: t("metMonth") },
    { key: "mrr", label: t("metMrr") },
    ...(compared ? [{ key: "previous", label: `${t("metMrr")} · ${t(COMPARE_LABEL[compare])}` }] : []),
    { key: "paying", label: t("metPaying") },
    { key: "change", label: t("metChange") },
    { key: "customerChurn", label: t("metCustomerChurn") },
  ]
  const reportRow = (i: number) => {
    const r = f.window[i]!
    return { month: r.month, mrr: r.mrr, ...(compared ? { previous: f.previous?.[i]?.mrr ?? "" } : {}), paying: r.paying, change: r.change, customerChurn: r.customerChurn === null ? "" : Math.round(r.customerChurn * 10000) / 100 }
  }
  const exportCsv = () => {
    exportToCsv(f.window.map((_, i) => reportRow(i)), fileBase, reportColumns.map((c) => ({ key: c.key as keyof ReturnType<typeof reportRow>, label: c.label })))
    auditExport("CSV", periodText, "Console home")
  }
  const exportPdf = async () => {
    const [{ getPdfTranslator }, { renderTableReport }, { documentBrand, loadLogo }, { nexoraLogoSrc }] = await Promise.all([import("@/lib/pdf/pdf-i18n"), import("@/lib/pdf/report-template"), import("@/lib/pdf/pdf-kit"), import("@/lib/api/platform-config-api")])
    const { t: pt, locale: pl } = await getPdfTranslator(locale)
    const pMoney = (n: number) => new Intl.NumberFormat(pl, { style: "currency", currency: "MAD", maximumFractionDigits: 0 }).format(n)
    const pPct = (v: number | null, digits = 1) => (v === null ? "—" : new Intl.NumberFormat(pl, { style: "percent", maximumFractionDigits: digits }).format(v))
    const pMonth = (m: string) => new Intl.DateTimeFormat(pl, { month: "short", year: "numeric" }).format(new Date(`${m}-01T00:00:00`))
    await renderTableReport({
      brand: documentBrand(undefined),
      logo: await loadLogo(nexoraLogoSrc()),
      title: pt("consoleHomeNav"),
      description: pt("pageDescConsoleHome"),
      company: identity?.legalName ?? "Nexora",
      companyLine: identity ? `${identity.city} · ICE ${identity.ice}` : undefined,
      generatedOn: `${pt("pdfGeneratedOn")} ${new Intl.DateTimeFormat(pl, { dateStyle: "long", timeStyle: "short" }).format(new Date())}`,
      chips: [[pt("repPeriod"), f.window.length ? `${pMonth(f.window[0]!.month)} - ${pMonth(f.window[f.window.length - 1]!.month)}` : "—"], [pt("chCompare"), pt(COMPARE_LABEL[compare])]],
      tiles: [
        { label: pt("metMrr"), value: pMoney(f.mrr) },
        { label: pt("metCustomerChurn"), value: pPct(f.churn) },
        { label: pt("chConversion"), value: pPct(f.trials.rate, 0) },
        { label: pt("chOwed"), value: pMoney(f.owed) },
      ],
      columns: [
        { label: pt("metMonth"), align: "left" },
        { label: pt("metMrr"), align: "right" },
        ...(compared ? [{ label: `${pt("metMrr")} · ${pt(COMPARE_LABEL[compare])}`, align: "right" as const }] : []),
        { label: pt("metPaying"), align: "right" },
        { label: pt("metChange"), align: "right" },
        { label: pt("metCustomerChurn"), align: "right" },
      ],
      rows: f.window.map((r, i) => [pMonth(r.month), pMoney(r.mrr), ...(compared ? [f.previous?.[i] ? pMoney(f.previous[i]!.mrr) : "—"] : []), String(r.paying), pMoney(r.change), pPct(r.customerChurn)]),
      emptyText: pt("repEmpty"),
      footer: { left: pt("pdfConfidential"), legal: identity ? `${identity.legalName} · RC ${identity.rc} · IF ${identity.taxId}` : undefined, pageLabel: (page, total) => pt("pdfPageOf", { page, total }) },
      filename: `${fileBase}.pdf`,
    })
    auditExport("PDF", periodText, "Console home")
  }

  return (
    <div className="w-full space-y-5 p-4 md:p-6">
      <PageHeader
        actions={
          <>
            <Button variant="outline" size="sm" asChild><Link href="/dashboard/metrics"><ChartLine className="text-muted-foreground" />{t("chAllMetrics")}</Link></Button>
            <SaveReportMenu
              disabled={isLoading || !f.window.length}
              options={[
                { icon: Download, title: t("anDownloadPdf"), hint: t("crPdfHint"), onClick: () => void exportPdf() },
                { icon: FileText, title: t("exportCsv"), hint: t("anCsvHint"), onClick: exportCsv },
              ]}
            />
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill label={t("chLastMonths", { n: range })} value={range} width="w-44" onChange={setRange} options={HOME_RANGES.map((r) => ({ value: r, label: t("chLastMonths", { n: r }) }))} />
          <FilterPill label={t(COMPARE_LABEL[compare])} value={compare} onChange={setCompare} options={HOME_COMPARES.map((c) => ({ value: c, label: t(COMPARE_LABEL[c]) }))} />
        </div>
      </PageHeader>

      {isLoading ? <ListSkeleton /> : (
        <>
          {/* four tiles in one row, as on the companies' Analytics; ARR is the chart's run-rate */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="xl:col-span-8"><MrrTrendChart rows={f.window} previous={f.previous} compareLabel={t(COMPARE_LABEL[compare])} money={money} rangeLabel={t("chLastMonths", { n: range })} guidance={(best, worst) => t("chGuidance", { best, worst })} /></div>
            <div className="xl:col-span-4"><Attention items={attention} /></div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RevenueByChart title={t("chByPlan")} hint={t("chByHint")} rows={byPlan} money={money} />
            <RevenueByChart title={t("chByCountry")} hint={t("chByHint")} rows={byCountry} money={money} />
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
    <section className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-2xs" aria-labelledby="console-attention">
      <div>
        <div className="flex items-center justify-between gap-2 pb-2">
          <h2 id="console-attention" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Information className="size-3.5 text-muted-foreground/70" />
            {t("chAttention")}
          </h2>
          <span className="text-xs font-semibold text-primary tabular-nums">{items.length}</span>
        </div>
        {items.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{t("chAttentionEmpty")}</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {items.map((i) => {
              const Icon = ICON[i.kind]
              return (
                <li key={`${i.kind}-${i.id}`}>
                  <Link href={i.href} className="flex items-center gap-3 rounded-md py-2.5 transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className={`grid size-7 shrink-0 place-items-center rounded-full ${TONE[i.kind]}`}><Icon className="size-3.5" aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-foreground">{i.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{text(i)}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className="mt-4 border-t border-border/40 pt-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">{t("anOperationalNote")} </span>
        {t("chAttentionHint")}
      </div>
    </section>
  )
}
