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
    <Card className={cn("p-5 h-full flex flex-col justify-between hover:border-primary/40 transition-all duration-200", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </span>
        {Icon && (
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="size-4" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        {isLoading ? (
          <div className="h-7 w-20 bg-muted/60 animate-pulse rounded-md" />
        ) : (
          <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
            {value}
          </span>
        )}
        {trend && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full border",
              trendType === "up" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
              trendType === "down" && "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
              trendType === "neutral" && "bg-muted text-muted-foreground border-border"
            )}
          >
            {trend}
          </span>
        )}
      </div>
    </Card>
  )
}
