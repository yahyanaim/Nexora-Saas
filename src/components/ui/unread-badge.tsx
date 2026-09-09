"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface UnreadBadgeProps {
  count: number
  muted?: boolean
}

export function UnreadBadge({ count, muted }: UnreadBadgeProps) {
  if (count <= 0) return null
  return (
    <Badge
      className={cn(
        "flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border-0 bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary",
        muted ? "bg-muted text-muted-foreground" : "bg-primary"
      )}
    >
      {count > 99 ? "99+" : count}
    </Badge>
  )
}
