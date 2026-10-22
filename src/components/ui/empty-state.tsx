import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

type IconType = React.ComponentType<{ className?: string }>

/** The one "nothing here yet" block used by every list (UX-11): icon, title, hint and an optional action. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon?: IconType
  title: React.ReactNode
  hint?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10 text-center",
        className
      )}
    >
      {Icon && (
        // Nexus line drawing: the icon is the hub, three nodes connect to it
        <span aria-hidden className="relative mb-2 flex h-16 w-24 items-center justify-center text-area">
          <svg viewBox="0 0 96 64" className="absolute inset-0 size-full" fill="none">
            <g stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.25" strokeDasharray="3 3">
              <path d="M48 32 L12 14 M48 32 L86 18 M48 32 L78 56" />
            </g>
            <g fill="currentColor">
              <circle cx="12" cy="14" r="3.5" fillOpacity="0.45" />
              <circle cx="86" cy="18" r="2.5" fillOpacity="0.35" />
              <circle cx="78" cy="56" r="3" fillOpacity="0.5" />
            </g>
          </svg>
          <span className="relative flex size-11 items-center justify-center rounded-2xl bg-area-soft text-area-foreground ring-4 ring-card">
            <Icon className="size-5" />
          </span>
        </span>
      )}
      <p className="font-medium text-foreground">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** Loading placeholder for card lists and tables: a few rows of grey bars. */
export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border p-4">
          <Skeleton className="h-4 w-1/2 rounded-full bg-muted" />
          <Skeleton className="mt-3 h-3 w-3/4 rounded-full bg-muted" />
        </div>
      ))}
    </div>
  )
}
