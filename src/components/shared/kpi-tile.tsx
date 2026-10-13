"use client"

import { Information } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"

/** Eight bars of relative height (0–100), drawn under the hover colour of the theme. */
export function MiniBarSparkline({ heights, className }: { heights: number[]; className?: string }) {
  return (
    <div className={cn("flex items-end gap-1 h-8 shrink-0", className)} aria-hidden>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{ height: `${Math.max(15, h)}%` }}
          className="w-1.5 rounded-full bg-muted-foreground/25 dark:bg-muted-foreground/35 transition-all hover:bg-primary"
        />
      ))}
    </div>
  )
}

export interface KpiTileProps {
  title: string
  value: string
  /** Short period label in the corner, e.g. "90d" or "12M" */
  period?: string
  /** Signed change like "+6.6%", or "—" when there is nothing to compare; omitted to hide the pill */
  change?: string
  isPositive?: boolean
  /** Heights 0–100 for the mini bar chart; omitted when the figure has no history */
  sparkline?: number[]
  description: string
  /** The bold lead of the note, e.g. "Note:" */
  noteLabel?: string
  note?: string
  isLoading?: boolean
  className?: string
}

/**
 * One headline figure as the companies' Analytics draws it: title and period,
 * the value with its change pill and a mini bar chart, what it means, and a
 * note that explains the number. Shared by the ERP Overview and the console.
 */
export function KpiTile({ title, value, period, change, isPositive = true, sparkline, description, noteLabel, note, isLoading, className }: KpiTileProps) {
  return (
    <div
      aria-busy={isLoading}
      className={cn("flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 shadow-2xs transition-all hover:shadow-xs", className)}
    >
      <div>
        <div className="flex items-center justify-between gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 truncate">
            <Information className="size-3.5 shrink-0 text-muted-foreground/70" />
            <span className="truncate font-medium">{title}</span>
          </div>
          {period && <span className="text-xs tabular-nums text-muted-foreground/70 shrink-0">{period}</span>}
        </div>

        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</div>
            {change !== undefined && (
              <div
                className={cn(
                  "inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold",
                  change === "—"
                    ? "bg-muted text-muted-foreground"
                    : isPositive
                      ? "bg-success-soft text-success-foreground"
                      : "bg-danger-soft text-danger-foreground"
                )}
              >
                {change}
              </div>
            )}
          </div>
          {sparkline && sparkline.length > 0 && <MiniBarSparkline heights={sparkline} />}
        </div>

        <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{description}</p>
      </div>

      {note && (
        <div className="mt-3 border-t border-border/40 pt-2 text-xs leading-relaxed text-muted-foreground">
          {noteLabel && <span className="font-semibold text-foreground">{noteLabel} </span>}
          {note}
        </div>
      )}
    </div>
  )
}
