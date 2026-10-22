"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface MetricCardItem {
  key: string
  title: string
  value: string | number
  valueClassName?: string
  badge?: {
    label: string
    icon?: React.ComponentType<{ className?: string }>
    variant?: "default" | "secondary" | "destructive" | "outline"
    className?: string
  }
  footer?: {
    icon?: React.ComponentType<{ className?: string }>
    text: string
    className?: string
  }
}

export interface MetricCardGridProps {
  cards: MetricCardItem[]
  isLoading?: boolean
  skeletonCount?: number
  columnsClassName?: string
  className?: string
}

/**
 * Metric tile grid: grey label above a large value (tabular figures), a
 * soft status pill,
 * and automated skeleton loading states.
 */
export function MetricCardGrid({
  cards,
  isLoading = false,
  skeletonCount = 4,
  columnsClassName = "grid-cols-2 lg:grid-cols-4",
  className,
}: MetricCardGridProps) {
  if (isLoading) {
    return (
      <div className={cn("grid gap-3 sm:gap-4 w-full", columnsClassName, className)}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Card key={i} className="animate-pulse h-full flex flex-col justify-between rounded-2xl">
            <CardHeader className="p-5 pb-3">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="mt-2 h-8 w-16 rounded bg-muted" />
            </CardHeader>
            <CardFooter className="px-5 py-3 pt-0 border-t-0 mt-auto">
              <div className="h-3 w-32 rounded bg-muted" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("grid gap-3 sm:gap-4 w-full", columnsClassName, className)}>
      {cards.map((card) => {
        const BadgeIcon = card.badge?.icon
        const FooterIcon = card.footer?.icon

        return (
          <Card
            key={card.key}
            className="flex flex-col justify-between rounded-2xl"
          >
            <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardDescription className="text-[13px] font-medium leading-snug text-muted-foreground">
                  {card.title}
                </CardDescription>
                {card.badge && (
                  <Badge
                    variant={card.badge.variant || "outline"}
                    className={cn("shrink-0 text-xs max-sm:hidden", card.badge.className)}
                  >
                    {BadgeIcon && <BadgeIcon className="size-3.5" />}
                    {card.badge.label}
                  </Badge>
                )}
              </div>
              {/* a value, not a heading: keeps the page's heading order clean */}
              <p
                className={cn(
                  "text-2xl sm:text-[28px] sm:leading-9 font-semibold tracking-tight tabular-nums pt-1",
                  card.valueClassName
                )}
              >
                {card.value}
              </p>
            </CardHeader>
            {card.footer && (
              <CardFooter
                className={cn(
                  "px-4 pb-4 pt-0 sm:px-5 sm:pb-5 text-xs text-muted-foreground border-t-0 mt-auto flex items-center gap-1.5",
                  card.footer.className
                )}
              >
                {FooterIcon && <FooterIcon className="size-3.5 shrink-0" />}
                <span className="truncate">{card.footer.text}</span>
              </CardFooter>
            )}
          </Card>
        )
      })}
    </div>
  )
}
