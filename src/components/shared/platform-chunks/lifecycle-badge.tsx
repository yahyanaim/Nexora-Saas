"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { LifecycleStatus } from "@/types/platform-customers"

export const LIFECYCLE: LifecycleStatus[] = ["trial", "active", "payment_overdue", "suspended", "cancelled"]

const CLASS: Record<LifecycleStatus, string> = {
  active: "bg-success-soft text-success-foreground",
  trial: "bg-info-soft text-info-foreground",
  payment_overdue: "bg-warning-soft text-warning-foreground",
  suspended: "bg-danger-soft text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  deleted: "bg-muted text-muted-foreground",
}

export function LifecycleBadge({ status }: { status: LifecycleStatus }) {
  const t = useTranslations()
  return <Badge variant="outline" className={cn("border-transparent", CLASS[status])}>{t(`lcStatus_${status}`)}</Badge>
}
