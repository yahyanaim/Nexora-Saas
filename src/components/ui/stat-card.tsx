"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

export interface StatCardProps {
  label: string
  value: React.ReactNode
  isLoading?: boolean
  trend?: string
  trendType?: "up" | "down" | "neutral"
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}

export function StatCard({
  label,
  value,
  isLoading = false,
  trend,
  trendType = "neutral",
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("p-5 h-full flex flex-col justify-between rounded-2xl", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-muted-foreground truncate">
          {label}
        </span>
        {Icon && (
          <div className="size-9 rounded-full bg-info-soft text-info-foreground flex items-center justify-center shrink-0">
            <Icon className="size-4" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        {isLoading ? (
          <div className="h-7 w-20 bg-muted/60 animate-pulse rounded-md" />
        ) : (
          <span className="text-[28px] leading-9 font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </span>
        )}
        {trend && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              trendType === "up" && "bg-success-soft text-success-foreground",
              trendType === "down" && "bg-danger-soft text-danger-foreground",
              trendType === "neutral" && "bg-muted text-muted-foreground"
            )}
          >
            {trend}
          </span>
        )}
      </div>
    </Card>
  )
}
