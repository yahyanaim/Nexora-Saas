"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ListSkeleton } from "@/components/ui/empty-state"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, DownloadIcon, Landmark, Scale, Warning } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { useConsoleActor } from "@/hooks/platform/use-platform-console"
import { useBillingMutations, useReconciliations, useSettlements } from "@/hooks/platform/use-platform-billing"
import { consoleCan } from "@/lib/platform/console-roles"
import { addDays, isoOf } from "@/lib/platform/billing"
import { exportToCsv } from "@/lib/utils/export-data"
import { cn } from "@/lib/utils"
import { ConsoleCapability as C } from "@/types/platform-console"
import { Panel, useBillingFormat } from "./billing-shared"

/**
 * PAY-09: the daily comparison of invoices, payments and the card provider's
 * settlements. The billing jobs run it every morning for the day before;
 * finance can run it for any day and export the differences.
 */
export default function ConsoleReconciliationPage() {
  const t = useTranslations()
  const { money, date } = useBillingFormat()
  const actor = useConsoleActor()
  const { data: runs = [], isLoading } = useReconciliations()
  const { data: settlements = [] } = useSettlements()
  const m = useBillingMutations()
  const today = isoOf(new Date())
  const [day, setDay] = useState(addDays(today, -1))
  const canRun = consoleCan(actor?.role, C.CREDIT_NOTES)
  const last = runs[0]
  const month = today.slice(0, 7)
  const thisMonth = settlements.filter((s) => s.date.startsWith(month))

  const cards: MetricCardItem[] = [
    { key: "last", title: t("recLastRun"), value: last ? date(last.day) : "—", footer: { icon: Scale, text: last ? t("recBy", { name: last.by }) : t("recNever") } },
    { key: "diff", title: t("recDifferences"), value: last ? last.differences.length : "—", valueClassName: last?.differences.length ? "text-destructive" : last ? "text-success" : undefined, footer: { icon: last?.differences.length ? Warning : CheckCircle, text: last?.differences.length ? t("recToCheck") : t("recAllMatch") } },
    { key: "settled", title: t("recSettledMonth"), value: money(thisMonth.reduce((s, x) => s + x.net, 0)), footer: { icon: Landmark, text: t("recFees", { amount: money(thisMonth.reduce((s, x) => s + x.fee, 0)) }) } },
    { key: "waiting", title: t("trQueue"), value: last ? last.waiting : "—", footer: { icon: Landmark, text: t("recWaitingHint") } },
  ]

  const exportDiffs = () => {
    if (!last) return
    exportToCsv(
      last.differences.map((d) => ({ kind: t(`recKind_${d.kind}`), ref: d.ref, company: d.customerName ?? "", date: d.date ?? "", expected: d.expected, actual: d.actual, gap: Math.round((d.actual - d.expected) * 100) / 100 })),
      `nexora-reconciliation-${last.day}`,
      [
        { key: "kind", label: t("recKind") }, { key: "ref", label: t("trReference") }, { key: "company", label: t("pfCompany") }, { key: "date", label: t("biDate") },
        { key: "expected", label: t("recExpected") }, { key: "actual", label: t("recActual") }, { key: "gap", label: t("recGap") },
      ],
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={canRun ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1"><Label htmlFor="rec-day" className="text-xs">{t("recDay")}</Label><Input id="rec-day" type="date" max={today} value={day} onChange={(e) => setDay(e.target.value)} className="w-40" /></div>
            <Button onClick={() => m.reconcile.mutate(day)} disabled={m.reconcile.isPending || !day}><Scale className="size-4" />{t("recRun")}</Button>
          </div>
        ) : undefined}
      />
      <MetricCardGrid cards={cards} />

      <Panel
        title={last ? t("recResultOf", { date: date(last.day) }) : t("recResult")}
        hint={last ? t("recChecked", { invoices: last.checked.invoices, payments: last.checked.payments, settlements: last.checked.settlements }) : t("recNever")}
        actions={last && last.differences.length > 0 ? <Button variant="outline" size="sm" onClick={exportDiffs}><DownloadIcon className="size-4" />CSV</Button> : undefined}
      >
        {isLoading ? <ListSkeleton /> : !last ? <p className="text-sm text-muted-foreground">{t("recNever")}</p> : last.differences.length === 0 ? (
          <p className="flex items-center gap-2 rounded-2xl bg-success-soft p-3 text-sm text-success-foreground"><CheckCircle className="size-4" />{t("recClean")}</p>
        ) : (
          <TableContainer>
            <Table className="min-w-[44rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("recKind")}</TableHead>
                  <TableHead>{t("trReference")}</TableHead>
                  <TableHead>{t("biDate")}</TableHead>
                  <TableHead className="text-end">{t("recExpected")}</TableHead>
                  <TableHead className="text-end">{t("recActual")}</TableHead>
                  <TableHead className="text-end">{t("recGap")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {last.differences.map((d, i) => (
                  <TableRow key={`${d.kind}-${d.ref}-${i}`}>
                    <TableCell><Badge variant="outline" className="border-transparent bg-danger-soft text-destructive">{t(`recKind_${d.kind}`)}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{d.ref}{d.customerName && <span className="ms-2 font-sans text-muted-foreground">{d.customerName}</span>}</TableCell>
                    <TableCell className="text-sm">{d.date ? date(d.date) : "—"}</TableCell>
                    <TableCell className="text-end tabular-nums">{money(d.expected)}</TableCell>
                    <TableCell className="text-end tabular-nums">{money(d.actual)}</TableCell>
                    <TableCell className="text-end font-medium tabular-nums text-destructive">{money(Math.round((d.actual - d.expected) * 100) / 100)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{t("recRules")}</p>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <Panel title={t("recSettlements")} hint={t("recSettlementsHint")}>
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("biDate")}</TableHead>
                  <TableHead>{t("trReference")}</TableHead>
                  <TableHead className="text-end">{t("recGross")}</TableHead>
                  <TableHead className="text-end">{t("recFee")}</TableHead>
                  <TableHead className="text-end">{t("recNet")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.slice(0, 12).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap text-sm">{date(s.date)}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{s.reference}</TableCell>
                    <TableCell className={cn("text-end tabular-nums", s.gross < 0 && "text-destructive")}>{money(s.gross)}</TableCell>
                    <TableCell className="text-end tabular-nums text-muted-foreground">{money(s.fee)}</TableCell>
                    <TableCell className="text-end font-medium tabular-nums">{money(s.net)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {canRun && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-border p-3 text-xs text-muted-foreground">
              <span>{t("recDemoHint")}</span>
              <Button size="sm" variant="outline" onClick={() => m.simulateGap.mutate()}>{t("recSimulateGap")}</Button>
            </div>
          )}
        </Panel>
        <Panel title={t("recHistory")} hint={t("recHistoryHint")}>
          {runs.length === 0 ? <p className="text-sm text-muted-foreground">{t("recNever")}</p> : (
            <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
              {runs.slice(0, 10).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <span className="font-medium">{date(r.day)}</span>
                  <span className="flex-1 text-xs text-muted-foreground">{t("recBy", { name: r.by })} · {date(r.createdAt)}</span>
                  <Badge variant="outline" className={cn("border-transparent", r.differences.length ? "bg-danger-soft text-destructive" : "bg-success-soft text-success-foreground")}>
                    {r.differences.length ? t("recNDiff", { n: r.differences.length }) : t("recNoDiff")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
