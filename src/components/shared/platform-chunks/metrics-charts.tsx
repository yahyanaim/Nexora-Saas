"use client"

import { useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Information } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import type { MonthRow } from "@/lib/platform/metrics"

/**
 * MRR charts in the same style as the companies' Analytics (Revenue growth
 * and Revenue bridge): a line for recurring revenue with the paying customers
 * in the tooltip, and a waterfall from the first MRR to the last.
 */

type Props = { rows: MonthRow[]; money: (n: number, opts?: { compact?: boolean }) => string; rangeLabel: string }

export function MrrTrendChart({ rows, money, rangeLabel }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const month = (m: string) => new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit" }).format(new Date(`${m}-01T00:00:00`))
  const data = rows.map((r) => ({ label: month(r.month), mrr: r.mrr, paying: r.paying, change: r.change }))
  const first = rows[0]
  const last = rows[rows.length - 1]
  const diff = first && last ? last.mrr - first.mrr : 0
  const pct = first?.mrr ? diff / first.mrr : null
  const max = Math.max(1, ...rows.map((r) => r.mrr))
  const best = [...rows].sort((a, b) => b.change - a.change)[0]
  const worst = [...rows].sort((a, b) => a.change - b.change)[0]

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      <div>
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Information className="size-3.5 text-muted-foreground/70" />
            <span className="font-medium">{t("metMrrGrowth")}</span>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{rangeLabel}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{money(last?.mrr ?? 0)}</span>
          {first && (
            <span className={cn("text-xs font-medium", diff >= 0 ? "text-success-foreground" : "text-danger-foreground")}>
              {t("metSinceStart", { amount: `${diff >= 0 ? "+" : "−"}${money(Math.abs(diff))}`, pct: pct === null ? "—" : `${pct >= 0 ? "+" : ""}${Math.round(pct * 1000) / 10}%`, month: month(first.month) })}
            </span>
          )}
          <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline-block">({t("metArrRunRate", { amount: money((last?.mrr ?? 0) * 12, { compact: true }) })})</span>
        </div>
      </div>

      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <YAxis width={72} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" domain={[0, Math.ceil((max * 1.15) / 1000) * 1000]} tickFormatter={(v) => money(Number(v), { compact: true }).replace(/\s/g, "\u00a0")} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const p = payload[0]?.payload as (typeof data)[number]
                return (
                  <div className="rounded-lg border border-border/80 bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="font-semibold text-foreground">{label}</p>
                    <div className="mt-1 space-y-1">
                      <p className="font-medium text-primary tabular-nums">MRR: {money(p.mrr)}</p>
                      <p className="text-muted-foreground tabular-nums">{t("metPaying")}: {p.paying}</p>
                      <p className={cn("tabular-nums", p.change >= 0 ? "text-success-foreground" : "text-danger-foreground")}>{t("metChange")}: {p.change >= 0 ? "+" : "−"}{money(Math.abs(p.change))}</p>
                    </div>
                  </div>
                )
              }}
            />
            <Line type="monotone" dataKey="mrr" stroke="#0284c7" strokeWidth={2} dot={{ r: 3, fill: "#0284c7" }} activeDot={{ r: 5, fill: "#0284c7" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#0284c7]" />
          <span className="font-medium text-foreground">MRR ({rangeLabel})</span>
        </div>
        <span className="tabular-nums">{t("metPayingNow", { n: last?.paying ?? 0 })}</span>
      </div>

      {best && worst && (
        <div className="mt-3 rounded-lg border border-border/40 bg-muted/30 p-2.5 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{t("anExecutiveGuidance")} </span>
          {t("metGuidance", { best: month(best.month), bestAmount: money(best.change), worst: month(worst.month), worstAmount: money(worst.change) })}
        </div>
      )}
    </div>
  )
}

const STEPS = ["new", "expansion", "reactivation", "contraction", "churn"] as const

export function MrrBridgeChart({ rows, money, rangeLabel }: Props) {
  const t = useTranslations()
  const { steps, start, end } = useMemo(() => {
    // the first row's movements happened before the window opens: start from its MRR
    const window = rows.slice(1)
    const start = rows[0]?.mrr ?? 0
    const sums = STEPS.map((k) => ({ key: k, value: window.reduce((s, r) => s + r.movements[k], 0) }))
    const end = rows[rows.length - 1]?.mrr ?? 0
    // running total before each step, computed without mutation
    const before = sums.map((_, i) => start + sums.slice(0, i).reduce((acc, x) => acc + x.value, 0))
    const top = Math.max(start, end, ...sums.map((_, i) => start + sums.slice(0, i + 1).reduce((s, x) => s + Math.max(0, x.value), 0)))
    const scale = (v: number) => (top ? (v / top) * 100 : 0)
    const steps = [
      { key: "start", label: t("metBridgeStart"), value: start, bottom: 0, height: scale(start), kind: "anchor" as const },
      ...sums.map((s, i) => {
        const from = before[i]!
        const to = from + s.value
        return { key: s.key, label: t(`metMove_${s.key}`), value: s.value, bottom: scale(Math.min(from, to)), height: Math.max(s.value === 0 ? 0 : 1.5, scale(Math.abs(s.value))), kind: s.value > 0 ? ("up" as const) : s.value < 0 ? ("down" as const) : ("flat" as const) }
      }),
      { key: "end", label: t("metBridgeEnd"), value: end, bottom: 0, height: scale(end), kind: "anchor" as const },
    ]
    return { steps, start, end }
  }, [rows, t])

  return (
    <div className="flex h-full flex-col rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Information className="size-3.5 text-muted-foreground/70" />
          <span className="font-medium">{t("metBridge")}</span>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{rangeLabel}</span>
      </div>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{end - start >= 0 ? "+" : "−"}{money(Math.abs(end - start))}</p>
      <p className="text-xs text-muted-foreground">{t("metBridgeHint")}</p>
      <div className="mt-4 grid min-h-56 flex-1 grid-cols-7 gap-1.5" role="img" aria-label={steps.map((s) => `${s.label} ${money(s.value)}`).join(", ")}>
        {steps.map((s) => (
          <div key={s.key} className="group flex min-w-0 flex-col items-center gap-1.5">
            <span className={cn("text-xs font-semibold tabular-nums", s.kind === "up" && "text-success-foreground", s.kind === "down" && "text-danger-foreground")}>
              {s.kind === "anchor" ? money(s.value, { compact: true }) : s.value === 0 ? "—" : `${s.value > 0 ? "+" : "−"}${money(Math.abs(s.value), { compact: true })}`}
            </span>
            <div className="relative min-h-40 w-full flex-1 rounded-md bg-muted/30 transition-colors group-hover:bg-muted/50" title={`${s.label}: ${money(s.value)}`}>
              <div className="absolute inset-1">
                <div
                  style={{ bottom: `${s.bottom}%`, height: `${s.height}%` }}
                  className={cn("absolute inset-x-0 rounded-md transition-all duration-300", s.kind === "anchor" && "rounded-b-none bg-primary", s.kind === "up" && "bg-success", s.kind === "down" && "bg-destructive", s.kind === "flat" && "bg-border")}
                />
              </div>
            </div>
            <span className="flex h-8 w-full items-start justify-center text-center text-[11px] leading-tight font-medium break-words text-foreground [hyphens:auto]">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
