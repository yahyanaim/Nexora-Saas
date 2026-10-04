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
        <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" />
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
