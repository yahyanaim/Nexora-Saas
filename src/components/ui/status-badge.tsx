import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type BadgeToneConfig = {
  label: string
  className: string
}

type StatusBadgeProps<T extends string> = {
  value: T
  config: Record<T, BadgeToneConfig>
  className?: string
}

export function StatusBadge<T extends string>({
  value,
  config,
  className,
}: StatusBadgeProps<T>) {
  const item = config[value]
  if (!item) return <Badge variant="outline">{value}</Badge>

  return (
    <Badge variant="outline" className={cn(item.className, className)}>
      {item.label}
    </Badge>
  )
}
