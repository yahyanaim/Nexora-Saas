"use client"

import { useTranslations } from "next-intl"
import { Information } from "@/components/ui/carbon/icons"

/**
 * Recurring revenue today by plan or by country, on the console home, drawn
 * like the companies' "Revenue by client" card: a share bar in the fixed
 * segment colours, a legend with each share, then one line per group.
 */

type Row = { key: string; label: string; mrr: number; customers: number }

/** The companies' segment colours, in the same fixed order (sales-breakdown-card) */
const SEGMENT_COLORS = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"]

export function RevenueByChart({ title, hint, rows, money }: { title: string; hint: string; rows: Row[]; money: (n: number) => string }) {
  const t = useTranslations()
  const total = rows.reduce((s, r) => s + r.mrr, 0)
  const shown = rows.slice(0, SEGMENT_COLORS.length).map((r, i) => ({ ...r, share: total ? (r.mrr / total) * 100 : 0, color: SEGMENT_COLORS[i]! }))
  const others = rows.slice(SEGMENT_COLORS.length)
  const othersMrr = others.reduce((s, r) => s + r.mrr, 0)
  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      <div>
        <div className="flex items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Information className="size-3.5 text-muted-foreground/70" />
            <span className="font-medium">{title}</span>
          </div>
          <span className="text-xs font-semibold text-primary tabular-nums">{money(total)}</span>
        </div>

        {shown.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{t("chNoRevenue")}</p>
        ) : (
          <>
            <div className="mb-3 space-y-2">
              <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-muted/40" role="img" aria-label={shown.map((s) => `${s.label} ${Math.round(s.share)}%`).join(", ")}>
                {shown.map((s) => (
                  <div key={s.key} title={`${s.label} · ${Math.round(s.share)}%`} style={{ width: `${s.share}%`, backgroundColor: s.color }} className="h-full first:rounded-s-full last:rounded-e-full" />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {shown.map((s) => (
                  <span key={s.key} className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-foreground/90">{s.label}</span>
                    <span className="tabular-nums">{Math.round(s.share)}%</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="divide-y divide-border/40 text-xs">
              {shown.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-3 py-2 transition-colors hover:bg-muted/20">
                  <span className="truncate font-normal text-foreground/90">{s.label}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-muted-foreground">{t("chCustomers", { n: s.customers })}</span>
                    <span className="font-medium text-foreground tabular-nums">{money(s.mrr)}</span>
                  </span>
                </div>
              ))}
              {othersMrr > 0 && (
                <div className="flex items-center justify-between gap-3 py-2">
                  <span className="truncate text-foreground/90">{t("chOthers")}</span>
                  <span className="font-medium text-foreground tabular-nums">{money(othersMrr)}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-4 border-t border-border/40 pt-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">{t("anOperationalNote")} </span>
        {hint}
      </div>
    </div>
  )
}
