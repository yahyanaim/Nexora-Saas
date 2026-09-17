import { cn } from "@/lib/utils"

export type BadgeToneConfig = {
  label: string
  className?: string
  type?: string
}

export interface StatusBadgeProps<T extends string = string> {
  value: T
  config?: Record<T, BadgeToneConfig>
  className?: string
}

export function StatusBadge<T extends string = string>({
  value,
  config,
  className,
}: StatusBadgeProps<T>) {
  const item = config?.[value]
  const label = item?.label ?? String(value)
  const itemClassName = item?.className ?? "bg-muted/60 text-muted-foreground border-border"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize select-none",
        itemClassName,
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  )
}
