import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Briefcase,
  Building,
  Clock,
  FileText,
  FolderKanban,
  Handshake,
  IdCard,
  Receipt,
  SquareCheck,
  User,
  UserPlus,
} from "@/components/ui/carbon/icons"

/*
 * Nexus, Nexora's identity (DS-07): things that connect. Nodes joined by thin
 * lines are the one motif, used for the shell pattern, progress, empty states
 * and loading. Identity hues are for wayfinding; status keeps its own tones.
 */

export type NexusHue = "blue" | "violet" | "green" | "teal" | "orange" | "slate" | "area"

const HUE_SOLID: Record<NexusHue, string> = {
  blue: "bg-nx-blue",
  violet: "bg-nx-violet",
  green: "bg-nx-green",
  teal: "bg-nx-teal",
  orange: "bg-nx-orange",
  slate: "bg-nx-slate",
  area: "bg-area",
}

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

/** The kinds of record that carry a tile: the same colour and icon everywhere. */
export type ObjectKind =
  | "project"
  | "task"
  | "client"
  | "contact"
  | "lead"
  | "deal"
  | "invoice"
  | "quote"
  | "employee"
  | "time"
  | "supplier"

type IconType = React.ComponentType<{ className?: string }>

export const OBJECT_KINDS: Record<ObjectKind, { hue: NexusHue; icon: IconType }> = {
  project: { hue: "blue", icon: FolderKanban },
  task: { hue: "blue", icon: SquareCheck },
  client: { hue: "violet", icon: Building },
  contact: { hue: "violet", icon: User },
  lead: { hue: "orange", icon: UserPlus },
  deal: { hue: "orange", icon: Handshake },
  invoice: { hue: "green", icon: Receipt },
  quote: { hue: "teal", icon: FileText },
  employee: { hue: "orange", icon: IdCard },
  time: { hue: "teal", icon: Clock },
  supplier: { hue: "slate", icon: Briefcase },
}

const TILE_SIZE = {
  xs: "size-5 rounded-[5px] [&_svg]:size-3",
  sm: "size-7 rounded-lg [&_svg]:size-4",
  md: "size-9 rounded-[10px] [&_svg]:size-[18px]",
  lg: "size-12 rounded-xl [&_svg]:size-6",
}

/** A coloured square with a white icon that says what kind of record this is. */
export function ObjectTile({ kind, size = "sm", className }: { kind: ObjectKind; size?: keyof typeof TILE_SIZE; className?: string }) {
  const { hue, icon: Icon } = OBJECT_KINDS[kind]
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]",
        HUE_SOLID[hue],
        TILE_SIZE[size],
        className
      )}
    >
      <Icon />
    </span>
  )
}

export type NodeStep = { label: React.ReactNode; state: "done" | "current" | "todo" | "stopped"; hint?: React.ReactNode }

/**
 * Steps drawn as nodes joined by a line: done nodes are filled, the current
 * one has a ring, the rest are hollow. A stopped step (cancelled, refused) is red.
 */
export function NodeProgress({ steps, className, label }: { steps: NodeStep[]; className?: string; label?: string }) {
  return (
    <ol aria-label={label} className={cn("flex w-full items-start", className)}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1
        const reached = step.state === "done" || step.state === "current"
        const nextReached = !last && (steps[i + 1]!.state === "done" || steps[i + 1]!.state === "current")
        return (
          <li
            key={i}
            aria-current={step.state === "current" ? "step" : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center text-center"
          >
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-[7px] h-0.5 start-[calc(50%+9px)] end-[calc(-50%+9px)] rounded-full",
                  nextReached ? "bg-primary" : "bg-border"
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 flex size-4 items-center justify-center rounded-full border-2",
                step.state === "done" && "border-primary bg-primary",
                step.state === "current" && "border-primary bg-card ring-4 ring-primary/20",
                step.state === "todo" && "border-border-strong bg-card",
                step.state === "stopped" && "border-destructive bg-destructive"
              )}
            >
              {step.state === "current" && <span className="size-1.5 rounded-full bg-primary" />}
            </span>
            <span
              className={cn(
                "mt-2 max-w-28 px-1 text-xs leading-tight",
                reached ? "font-medium text-foreground" : step.state === "stopped" ? "font-medium text-danger-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
              <span className="sr-only">
                {" "}
                ({step.state})
              </span>
            </span>
            {step.hint && <span className="mt-0.5 text-[11px] text-muted-foreground">{step.hint}</span>}
          </li>
        )
      })}
    </ol>
  )
}

/** The Nexora mark drawn as three connecting nodes; animated while something loads. */
export function NexusMark({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden focusable="false" className={cn("size-10 text-primary", className)}>
      <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M12 36 L12 12 L36 36 L36 12" className={animated ? "nx-draw" : undefined} pathLength={1} />
      </g>
      <g fill="currentColor">
        <circle cx="12" cy="36" r="4" className={animated ? "nx-pulse [animation-delay:0ms]" : undefined} />
        <circle cx="12" cy="12" r="4" className={animated ? "nx-pulse [animation-delay:150ms]" : undefined} />
        <circle cx="36" cy="36" r="4" className={animated ? "nx-pulse [animation-delay:300ms]" : undefined} />
        <circle cx="36" cy="12" r="4" className={animated ? "nx-pulse [animation-delay:450ms]" : undefined} />
      </g>
    </svg>
  )
}
