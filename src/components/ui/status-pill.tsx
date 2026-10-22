import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Nexora's status language: one tone per meaning, drawn from the design
 * system's soft surfaces. A pill is a soft lozenge with a leading dot; the
 * same tones colour board columns, gantt bars and calendar chips.
 */
export type Tone = "neutral" | "primary" | "success" | "warning" | "danger"

export const TONE_SOFT: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-info-soft text-info-foreground",
  success: "bg-success-soft text-success-foreground",
  warning: "bg-warning-soft text-warning-foreground",
  danger: "bg-danger-soft text-danger-foreground",
}

/** Strong colour of a tone: dots, bars, column accents. */
export const TONE_SOLID: Record<Tone, string> = {
  neutral: "bg-muted-foreground/50",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
}

/** The same strong colour as a border, for accents on chips and columns. */
export const TONE_BORDER: Record<Tone, string> = {
  neutral: "border-muted-foreground/40",
  primary: "border-primary",
  success: "border-success",
  warning: "border-warning",
  danger: "border-destructive",
}

export function StatusPill({ tone, children, className, icon }: { tone: Tone; children: React.ReactNode; className?: string; icon?: React.ReactNode }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", TONE_SOFT[tone], className)}>
      {icon ?? <span className={cn("size-1.5 shrink-0 rounded-full", TONE_SOLID[tone])} aria-hidden />}
      <span className="truncate">{children}</span>
    </span>
  )
}
