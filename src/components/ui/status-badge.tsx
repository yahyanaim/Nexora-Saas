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
  const itemClassName = item?.className ?? "bg-muted text-muted-foreground"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium whitespace-nowrap capitalize select-none",
        itemClassName,
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  )
}
