"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertTriangle, Check, X } from "@/components/ui/carbon/icons"

/*
 * Nexus (DS-07): things that connect. Nodes joined by thin lines draw the page
 * header background and the progress of a record through its steps.
 */

/**
 * The node-and-line pattern. Decorative only: it tiles behind content in the
 * current text colour, so the caller sets the colour and opacity.
 */
export function NexusPattern({ className, fade = "end" }: { className?: string; fade?: "end" | "radial" | "none" }) {
  const id = React.useId().replace(/:/g, "")
  const mask =
    fade === "end"
      ? "linear-gradient(to var(--nx-fade-to, left), black 0%, rgb(0 0 0 / 0.5) 35%, transparent 75%)"
      : fade === "radial"
        ? "radial-gradient(ellipse at center, black 0%, rgb(0 0 0 / 0.4) 45%, transparent 75%)"
        : undefined
  return (
    <svg
      aria-hidden
      focusable="false"
      className={cn("pointer-events-none absolute inset-0 size-full [--nx-fade-to:left] rtl:[--nx-fade-to:right]", className)}
      style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
    >
      <defs>
        <pattern id={`nx-${id}`} width="72" height="72" patternUnits="userSpaceOnUse">
          <g stroke="currentColor" strokeWidth="1" fill="none" strokeOpacity="0.55">
            <path d="M0 0 L44 24 L72 0 M44 24 L20 52 L0 72 M20 52 L72 72 M44 24 L72 72" />
          </g>
          <g fill="currentColor">
            <circle cx="0" cy="0" r="2.5" />
            <circle cx="72" cy="0" r="2.5" />
            <circle cx="0" cy="72" r="2.5" />
            <circle cx="72" cy="72" r="2.5" />
            <circle cx="44" cy="24" r="3" />
            <circle cx="20" cy="52" r="2" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#nx-${id})`} />
    </svg>
  )
}

type IconType = React.ComponentType<{ className?: string }>

/**
 * One step of a record's way. `done` steps are filled, `current` is the step the
 * record waits for, `late` is a current step past its date, `stopped` ends the
 * way (cancelled, declined, expired) and `todo` is still ahead.
 */
export type NodeStep = {
  label: React.ReactNode
  state: "done" | "current" | "late" | "todo" | "stopped"
  /** Short date under the label */
  date?: React.ReactNode
  /** Icon inside the node; done shows a check and stopped a cross unless given */
  icon?: IconType
  /** One short line under the date, e.g. "12 days late" or "MAD 35,000 of 58,680" */
  hint?: React.ReactNode
  /** Shown on hover and keyboard focus: who did it and when */
  detail?: React.ReactNode
  /** How far the line leading to this step is filled, 0–1 (default: 1 done, 0.5 current, 0 todo) */
  reach?: number
}

const NODE: Record<NodeStep["state"], string> = {
  done: "border-primary bg-primary text-primary-foreground",
  current: "border-primary bg-card text-primary ring-4 ring-primary/15",
  late: "border-warning bg-warning-soft text-warning-foreground ring-4 ring-warning/20",
  todo: "border-dashed border-border-strong bg-card text-muted-foreground",
  stopped: "border-destructive bg-destructive text-destructive-foreground",
}

const LABEL: Record<NodeStep["state"], string> = {
  done: "font-medium text-foreground",
  current: "font-semibold text-foreground",
  late: "font-semibold text-warning-foreground",
  todo: "text-muted-foreground",
  stopped: "font-semibold text-danger-foreground",
}

function defaultReach(step: NodeStep) {
  if (step.reach !== undefined) return Math.max(0, Math.min(1, step.reach))
  if (step.state === "done" || step.state === "stopped") return 1
  if (step.state === "current" || step.state === "late") return 0.5
  return 0
}

/**
 * A record's way through its steps as nodes on a line: each node carries an
 * icon, its date and a hint; the line fills up to where the record is, and
 * part of the way for a partial step (a part payment). Hover or focus a node
 * for who did it and when.
 */
export function NodeProgress({
  steps,
  className,
  label,
  stateLabels,
  compact,
}: {
  steps: NodeStep[]
  className?: string
  label?: string
  /** Small nodes and labels for a table cell; the date and hint move into the hover detail */
  compact?: boolean
  /** Screen-reader words for each state, e.g. { done: "done", current: "current step" } */
  stateLabels?: Partial<Record<NodeStep["state"], string>>
}) {
  return (
    <ol aria-label={label} className={cn("flex w-full items-start", className)}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1
        const next = steps[i + 1]
        const reach = next ? defaultReach(next) : 0
        const Icon = step.icon ?? (step.state === "done" ? Check : step.state === "stopped" ? X : step.state === "late" ? AlertTriangle : undefined)
        // compact: what doesn't fit under the node goes into its hover detail
        const parts = compact ? [step.date, step.hint, step.detail].filter(Boolean) : [step.detail].filter(Boolean)
        const hasDetail = parts.length > 0
        const detail = parts.map((x, j) => <React.Fragment key={j}>{j > 0 && "\n"}{x}</React.Fragment>)
        const node = (
          <span
            className={cn(
              "relative z-10 flex shrink-0 items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              compact ? "size-5" : "size-7",
              NODE[step.state]
            )}
            tabIndex={hasDetail ? 0 : undefined}
          >
            {step.state === "current" && !compact && <span aria-hidden className="nx-halo absolute inset-[-6px] rounded-full border border-primary/40" />}
            {Icon ? <Icon className={compact ? "size-3" : "size-3.5"} /> : <span aria-hidden className="size-1.5 rounded-full bg-current" />}
          </span>
        )
        return (
          <li
            key={i}
            aria-current={step.state === "current" || step.state === "late" ? "step" : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center text-center"
          >
            {!last && (
              <span aria-hidden className={cn("absolute overflow-hidden rounded-full bg-border", compact ? "top-[9px] h-[2px] start-[calc(50%+13px)] end-[calc(-50%+13px)]" : "top-[13px] h-[3px] start-[calc(50%+18px)] end-[calc(-50%+18px)]")}>
                <span
                  className={cn(
                    "nx-fill block h-full rounded-full ltr:origin-left rtl:origin-right",
                    next?.state === "late" ? "bg-warning" : next?.state === "stopped" ? "bg-destructive" : "bg-primary"
                  )}
                  style={{ width: `${reach * 100}%`, animationDelay: `${i * 120}ms` }}
                />
              </span>
            )}
            {hasDetail ? (
              <Tooltip>
                <TooltipTrigger asChild>{node}</TooltipTrigger>
                <TooltipContent className="w-max max-w-64 whitespace-pre-line rounded-lg text-start text-xs leading-relaxed">{detail}</TooltipContent>
              </Tooltip>
            ) : (
              node
            )}
            <span className={cn("px-1 leading-tight", compact ? "mt-1 max-w-24 text-[11px]" : "mt-2 max-w-32 text-xs", LABEL[step.state])}>
              {step.label}
              {stateLabels?.[step.state] && <span className="sr-only">{` (${stateLabels[step.state]})`}</span>}
              {compact && step.hint && <span className="sr-only">{" · "}{step.hint}</span>}
            </span>
            {!compact && step.date && <span className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">{step.date}</span>}
            {!compact && step.hint && (
              <span
                className={cn(
                  "mt-1 max-w-32 rounded-full px-1.5 py-px text-[11px] font-medium leading-tight",
                  step.state === "late" ? "bg-warning-soft text-warning-foreground" : step.state === "stopped" ? "bg-danger-soft text-danger-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {step.hint}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
