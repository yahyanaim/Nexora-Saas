"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ListSkeleton } from "@/components/ui/empty-state"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, FileSpreadsheet, FileText } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { Link } from "@/i18n/navigation"
import { useConsoleCustomers } from "@/hooks/platform/use-platform-console"
import { useNxInvoices } from "@/hooks/platform/use-platform-billing"
import { useMetricsExportAudit, useNexoraIdentity } from "@/hooks/platform/use-platform-config"
import { AGE_BUCKETS, headline, monthlyTable, overdueAging, trialConversion, type MonthRow } from "@/lib/platform/metrics"
import { exportToCsv } from "@/lib/utils/export-data"
import { downloadXlsx } from "@/lib/utils/xlsx"
import { cn } from "@/lib/utils"
import { Panel, useBillingFormat } from "./billing-shared"

const MOVES = ["new", "expansion", "contraction", "churn", "reactivation"] as const
const RANGES = [3, 6, 12] as const

// recharts loads in its own bundle after the page shows (PERF-01), like the companies' Analytics
const ChartPlaceholder = () => <div className="h-96 animate-pulse rounded-xl border border-border bg-card" aria-hidden />
const MrrTrendChart = dynamic(() => import("./metrics-charts").then((m) => m.MrrTrendChart), { ssr: false, loading: ChartPlaceholder })
const MrrBridgeChart = dynamic(() => import("./metrics-charts").then((m) => m.MrrBridgeChart), { ssr: false, loading: ChartPlaceholder })

/** One headline figure with its definition and period always visible (MET-06). */
function Kpi({ label, value, change, definition }: { label: string; value: string; change?: { text: string; good: boolean | null }; definition: string }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-panel">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {change && <p className={cn("text-xs font-medium", change.good === null ? "text-muted-foreground" : change.good ? "text-success-foreground" : "text-destructive")}>{change.text}</p>}
      <p className="mt-auto pt-3 text-xs text-muted-foreground">{definition}</p>
    </div>
  )
}

/** Recurring revenue, its movements, churn, trial conversion and money owed (MET-01 to MET-07). */
export default function ConsoleMetricsPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { money } = useBillingFormat()
  const { data: invoices = [], isLoading: l1 } = useNxInvoices()
  const { data: accounts = [], isLoading: l2 } = useConsoleCustomers()
  const { data: identity } = useNexoraIdentity()
  const auditExport = useMetricsExportAudit()
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const [range, setRange] = useState<(typeof RANGES)[number]>(12)
  const rows = useMemo(() => monthlyTable(invoices, accounts, today, range), [invoices, accounts, today, range])
  const compactMoney = (n: number, opts?: { compact?: boolean }) =>
    opts?.compact ? `${new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n)} MAD` : money(n)
  const head = useMemo(() => headline(rows, accounts), [rows, accounts])
  const trials = useMemo(() => trialConversion(accounts), [accounts])
  const aging = useMemo(() => overdueAging(invoices, today), [invoices, today])
  const isLoading = l1 || l2

  const pct = (v: number | null, digits = 1) => (v === null ? t("metNoData") : new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: digits }).format(v))
  const signed = (v: number) => (v > 0 ? `+${money(v)}` : v < 0 ? `−${money(-v)}` : money(0))
  const monthLabel = (m: string) => new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(new Date(`${m}-01T00:00:00`))
  const period = rows.length ? `${monthLabel(rows[0]!.month)} – ${monthLabel(rows[rows.length - 1]!.month)}` : ""
  const change = (v: number | null, kind: "pct" | "count") =>
    v === null ? { text: t("metNoPrev"), good: null } : { text: t("metVsLastMonth", { change: kind === "pct" ? (v > 0 ? "+" : "") + pct(v) : (v > 0 ? `+${v}` : String(v)) }), good: v === 0 ? null : v > 0 }

  // exports share the monthly table (MET-07)
  const columns = [
    { key: "month", label: t("metMonth") },
    { key: "mrr", label: t("metMrr") },
    { key: "paying", label: t("metPaying") },
    ...MOVES.map((m) => ({ key: m, label: t(`metMove_${m}`) })),
    { key: "change", label: t("metChange") },
    { key: "customerChurn", label: t("metCustomerChurn") },
    { key: "revenueChurn", label: t("metRevenueChurn") },
  ]
  const raw = (r: MonthRow) => ({ month: r.month, mrr: r.mrr, paying: r.paying, ...r.movements, change: r.change, customerChurn: r.customerChurn === null ? "" : Math.round(r.customerChurn * 10000) / 100, revenueChurn: r.revenueChurn === null ? "" : Math.round(r.revenueChurn * 10000) / 100 })
  const fileBase = `nexora-metrics-${today}`
  const exportCsv = () => {
    exportToCsv(rows.map(raw), fileBase, columns.map((c) => ({ key: c.key as keyof ReturnType<typeof raw>, label: c.label })))
    auditExport("CSV", period)
  }
  const exportXlsx = () => {
    downloadXlsx({ name: t("metTitle"), columns: columns.map((c) => ({ label: c.label, width: c.key === "month" ? 12 : 16 })), rows: rows.map((r) => Object.values(raw(r))) }, fileBase)
    auditExport("Excel", period)
  }
  const exportPdf = async () => {
    const [{ getPdfTranslator }, { renderTableReport }, { documentBrand }] = await Promise.all([import("@/lib/pdf/pdf-i18n"), import("@/lib/pdf/report-template"), import("@/lib/pdf/pdf-kit")])
    const { t: pt, locale: pl } = await getPdfTranslator(locale)
    const pMoney = (n: number) => new Intl.NumberFormat(pl, { style: "currency", currency: "MAD", maximumFractionDigits: 2 }).format(n)
    const pPct = (v: number | null) => (v === null ? "—" : new Intl.NumberFormat(pl, { style: "percent", maximumFractionDigits: 1 }).format(v))
    const pMonth = (m: string) => new Intl.DateTimeFormat(pl, { month: "short", year: "numeric" }).format(new Date(`${m}-01T00:00:00`))
    await renderTableReport({
      brand: documentBrand(undefined),
      logo: null,
      title: pt("metTitle"),
      description: pt("pageDescMetrics"),
      company: identity?.legalName ?? "Nexora",
      companyLine: identity ? `${identity.city} · ICE ${identity.ice}` : undefined,
      generatedOn: `${pt("pdfGeneratedOn")} ${new Intl.DateTimeFormat(pl, { dateStyle: "long", timeStyle: "short" }).format(new Date())}`,
      chips: [[pt("repPeriod"), `${pMonth(rows[0]!.month)} - ${pMonth(rows[rows.length - 1]!.month)}`]],
      tiles: [
        { label: pt("metMrr"), value: pMoney(head.mrr) },
        { label: pt("metArr"), value: pMoney(head.arr) },
        { label: pt("metPaying"), value: String(head.paying) },
        { label: pt("metArpa"), value: pMoney(head.arpa) },
      ],
      columns: columns.map((c) => ({ label: pt(c.key === "month" ? "metMonth" : c.key === "mrr" ? "metMrr" : c.key === "paying" ? "metPaying" : c.key === "change" ? "metChange" : c.key === "customerChurn" ? "metCustomerChurn" : c.key === "revenueChurn" ? "metRevenueChurn" : `metMove_${c.key}`), align: c.key === "month" ? "left" : "right" })),
      rows: rows.map((r) => [pMonth(r.month), pMoney(r.mrr), String(r.paying), ...MOVES.map((m) => pMoney(r.movements[m])), pMoney(r.change), pPct(r.customerChurn), pPct(r.revenueChurn)]),
      emptyText: pt("repEmpty"),
      footer: { left: pt("pdfConfidential"), legal: identity ? `${identity.legalName} · RC ${identity.rc} · IF ${identity.taxId}` : undefined, pageLabel: (page, total) => pt("pdfPageOf", { page, total }) },
      filename: `${fileBase}.pdf`,
    })
    auditExport("PDF", period)
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportXlsx} disabled={!rows.length}><FileSpreadsheet className="size-4" />{t("metExcel")}</Button>
            <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="size-4" />{t("metCsv")}</Button>
            <Button variant="outline" onClick={() => void exportPdf()} disabled={!rows.length}><FileText className="size-4" />{t("metPdf")}</Button>
          </div>
        }
      />
      {isLoading ? <ListSkeleton /> : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi label={t("metMrr")} value={money(head.mrr)} change={change(head.mrrChange, "pct")} definition={t("metDefMrr")} />
            <Kpi label={t("metArr")} value={money(head.arr)} definition={t("metDefArr")} />
            <Kpi label={t("metPaying")} value={String(head.paying)} change={change(head.payingChange, "count")} definition={t("metDefPaying")} />
            <Kpi label={t("metArpa")} value={money(head.arpa)} change={change(head.arpaChange, "pct")} definition={t("metDefArpa")} />
            <Kpi label={t("metSeats")} value={pct(head.seatUsage, 0)} definition={t("metDefSeats", { used: head.seatsUsed, included: head.seatsIncluded })} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t("metMrrOverTimeHint", { period })}</p>
            <div className="flex rounded-full border border-border bg-card p-1 text-sm" role="group" aria-label={t("repPeriod")}>
              {RANGES.map((r) => (
                <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)} className={cn("rounded-full px-3 py-1", range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {t("metLastMonths", { n: r })}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            <div className="xl:col-span-3"><MrrTrendChart rows={rows} money={compactMoney} rangeLabel={t("metLastMonths", { n: range })} /></div>
            <div className="xl:col-span-2"><MrrBridgeChart rows={rows} money={compactMoney} rangeLabel={t("metLastMonths", { n: range })} /></div>
          </div>

          <Panel title={t("metMovements")} hint={t("metMovementsHint")}>
            <TableContainer>
              <Table className="min-w-[66rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("metMonth")}</TableHead>
                    <TableHead className="text-end">{t("metMrr")}</TableHead>
                    {MOVES.map((m) => <TableHead key={m} className="text-end">{t(`metMove_${m}`)}</TableHead>)}
                    <TableHead className="text-end">{t("metChange")}</TableHead>
                    <TableHead className="text-end">{t("metCustomerChurn")}</TableHead>
                    <TableHead className="text-end">{t("metRevenueChurn")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...rows].reverse().map((r) => (
                    <TableRow key={r.month}>
                      <TableCell className="font-medium capitalize">{monthLabel(r.month)}</TableCell>
                      <TableCell className="text-end tabular-nums">{money(r.mrr)}</TableCell>
                      {MOVES.map((m) => <TableCell key={m} className={cn("text-end tabular-nums", r.movements[m] === 0 && "text-muted-foreground")}>{r.movements[m] === 0 ? "—" : signed(r.movements[m])}</TableCell>)}
                      <TableCell className="text-end font-medium tabular-nums">{signed(r.change)}</TableCell>
                      <TableCell className="text-end tabular-nums">{pct(r.customerChurn)}</TableCell>
                      <TableCell className="text-end tabular-nums">{pct(r.revenueChurn)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Panel>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel title={t("metTrials")} hint={t("metTrialsHint")}>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div><dt className="text-xs text-muted-foreground">{t("metConversion")}</dt><dd className="text-2xl font-semibold tabular-nums">{pct(trials.rate, 0)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">{t("metMedianDays")}</dt><dd className="text-2xl font-semibold tabular-nums">{trials.medianDays === null ? "—" : t("incDays", { n: trials.medianDays })}</dd></div>
                <div><dt className="text-xs text-muted-foreground">{t("metTrialsRunning")}</dt><dd className="text-2xl font-semibold tabular-nums">{trials.running}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">{t("metDefConversion", { converted: trials.converted, lost: trials.lost })}</p>
            </Panel>
            <Panel title={t("metOwed")} hint={t("metOwedHint", { total: money(aging.total) })} actions={<Button size="sm" variant="outline" asChild><Link href="/dashboard/transactions">{t("metOpenTransactions")}</Link></Button>}>
              <ul className="space-y-2">
                {AGE_BUCKETS.map((b) => {
                  const v = aging.buckets[b]
                  return (
                    <li key={b} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
                      <span>{t(`metAge_${b}`)}</span>
                      <span className="h-2 rounded-full bg-muted" aria-hidden><span className={cn("block h-2 rounded-full", b === "not_due" ? "bg-primary" : b === "d1_30" ? "bg-warning" : "bg-destructive")} style={{ width: `${aging.total ? (v.amount / aging.total) * 100 : 0}%` }} /></span>
                      <span className="text-end tabular-nums">{money(v.amount)}<span className="block text-xs text-muted-foreground">{t("metInvoices", { n: v.count })}</span></span>
                    </li>
                  )
                })}
              </ul>
            </Panel>
          </div>
          <p className="text-xs text-muted-foreground">{t("metSources")}</p>
        </>
      )}
    </div>
  )
}
