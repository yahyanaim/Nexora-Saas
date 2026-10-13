"use client"

import { useTranslations } from "next-intl"
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Information } from "@/components/ui/carbon/icons"

/**
 * Recurring revenue today by plan or by country, on the console home. One
 * measure per chart, so one colour (the MRR line's); values are written at
 * the end of each bar and the tooltip adds the number of customers.
 */

type Row = { key: string; label: string; mrr: number; customers: number }

export function RevenueByChart({ title, hint, rows, money }: { title: string; hint: string; rows: Row[]; money: (n: number, opts?: { compact?: boolean }) => string }) {
  const t = useTranslations()
  const total = rows.reduce((s, r) => s + r.mrr, 0)
  const height = Math.max(160, rows.length * 44 + 24)
  return (
    <div className="flex h-full flex-col rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Information className="size-3.5 text-muted-foreground/70" />
          <span className="font-medium">{title}</span>
        </div>
        <span className="text-xs font-semibold text-primary tabular-nums">{money(total)}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t("chNoRevenue")}</p>
      ) : (
        <div className="mt-3 w-full" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 72, left: 4, bottom: 4 }} barCategoryGap={10}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/40" />
              <XAxis type="number" hide domain={[0, "dataMax"]} />
              <YAxis type="category" dataKey="label" width={96} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <Tooltip
                cursor={{ className: "fill-muted/40" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0]?.payload as Row
                  return (
                    <div className="rounded-lg border border-border/80 bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="font-semibold text-foreground">{p.label}</p>
                      <p className="mt-1 tabular-nums text-foreground">MRR: {money(p.mrr)}</p>
                      <p className="tabular-nums text-muted-foreground">{t("chCustomers", { n: p.customers })} · {total ? Math.round((p.mrr / total) * 100) : 0}%</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="mrr" fill="#0284c7" radius={[0, 4, 4, 0]} maxBarSize={22}>
                <LabelList dataKey="mrr" position="right" className="fill-foreground" fontSize={11} formatter={(v) => money(Number(v), { compact: true })} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
