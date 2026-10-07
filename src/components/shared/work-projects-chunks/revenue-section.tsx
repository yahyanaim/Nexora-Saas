"use client"

import { useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { todayIso } from "@/lib/workforce/project-metrics"
import { methodOf, milestoneShares, recognitionSchedule, recognises } from "@/lib/workforce/revenue-recognition"
import { cn } from "@/lib/utils"
import type { ClientInvoice, TimeEntry } from "@/types/work-billing"
import { RECOGNITION_METHODS, type ChangeOrder, type Milestone, type RecognitionMethod, type WorkProject, type WorkTask } from "@/types/work-projects"

interface Props {
  project: WorkProject
  milestones: Milestone[]
  tasks: WorkTask[]
  entries: TimeEntry[]
  invoices: ClientInvoice[]
  changeOrders: ChangeOrder[]
  currency: string
  canEdit: boolean
  onSetMethod: (method: RecognitionMethod) => void
}

/** Revenue earned on a fixed price, month by month, against what was billed (Phase 6g.5). */
export function RevenueSection({ project, milestones, tasks, entries, invoices, changeOrders, currency, canEdit, onSetMethod }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const today = todayIso()
  const rows = useMemo(
    () => recognitionSchedule(project, { milestones, tasks, entries, invoices, changeOrders }, today),
    [project, milestones, tasks, entries, invoices, changeOrders, today]
  )
  if (!recognises(project)) return null

  const money = (n: number) => formatMoney(n, currency, locale)
  const now = rows[rows.length - 1]
  const method = methodOf(project)
  const monthLabel = (m: string) => new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(new Date(`${m}-01T00:00:00`))
  const shares = milestoneShares(project, milestones)
  const noShares = method === "milestones" && milestones.filter((m) => m.projectId === project.id).every((m) => !m.revenueShare)

  const cards = now
    ? [
        { key: "pct", label: t("recPercent"), value: `${now.percent}%` },
        { key: "earned", label: t("recEarned"), value: money(now.earned), hint: t("recOfPrice", { price: money(now.price) }) },
        { key: "billed", label: t("recBilled"), value: money(now.billed) },
        now.wip > 0
          ? { key: "gap", label: t("recWip"), value: money(now.wip), hint: t("recWipHint"), tone: "text-warning-foreground" }
          : { key: "gap", label: t("recDeferred"), value: money(now.deferred), hint: t("recDeferredHint"), tone: now.deferred > 0 ? "text-info-foreground" : undefined },
      ]
    : []

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{t("recTitle")}</h3>
          <p className="max-w-2xl text-xs text-muted-foreground">{t("recHint")}</p>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("recMethod")}</Label>
          {canEdit ? (
            <Select value={method} onValueChange={(v) => onSetMethod(v as RecognitionMethod)}>
              <SelectTrigger className="h-9 w-56 bg-card" aria-label={t("recMethod")}><SelectValue>{t(`repVal_rec_${method}`)}</SelectValue></SelectTrigger>
              <SelectContent>{RECOGNITION_METHODS.map((m) => <SelectItem key={m} value={m}>{t(`repVal_rec_${m}`)}</SelectItem>)}</SelectContent>
            </Select>
          ) : (
            <span className="text-sm">{t(`repVal_rec_${method}`)}</span>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t(`recMethodHint_${method}`)}</p>
      {noShares && shares.size > 0 && <p className="text-xs text-muted-foreground">{t("recEqualShares", { pct: Math.round(100 / shares.size) })}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.key} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={cn("mt-1 text-lg font-semibold tabular-nums", c.tone)}>{c.value}</p>
            {c.hint && <p className="text-xs text-muted-foreground">{c.hint}</p>}
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start font-medium">{t("recMonth")}</th>
              <th className="w-40 px-3 py-2 text-start font-medium">{t("recPercent")}</th>
              <th className="px-3 py-2 text-end font-medium">{t("recEarnedInMonth")}</th>
              <th className="px-3 py-2 text-end font-medium">{t("recBilledInMonth")}</th>
              <th className="px-3 py-2 text-end font-medium">{t("recWip")}</th>
              <th className="px-3 py-2 text-end font-medium">{t("recDeferred")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[...rows].reverse().map((r) => (
              <tr key={r.month}>
                <td className="px-3 py-2">{monthLabel(r.month)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Progress value={r.percent} aria-label={t("recPercent")} className="h-2 flex-1" />
                    <span className="w-12 text-end text-xs tabular-nums">{r.percent}%</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-end tabular-nums">{r.earnedInMonth ? money(r.earnedInMonth) : "—"}</td>
                <td className="px-3 py-2 text-end tabular-nums">{r.billedInMonth ? money(r.billedInMonth) : "—"}</td>
                <td className={cn("px-3 py-2 text-end tabular-nums", r.wip > 0 && "text-warning-foreground")}>{r.wip ? money(r.wip) : "—"}</td>
                <td className={cn("px-3 py-2 text-end tabular-nums", r.deferred > 0 && "text-info-foreground")}>{r.deferred ? money(r.deferred) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
