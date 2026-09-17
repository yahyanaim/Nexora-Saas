"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
 * Enterprise Metric Card Grid adhering to IBM Carbon Design standards.
 * Provides uniform typography, monospace tabular figures, badge chips,
 * and automated skeleton loading states.
 */
export function MetricCardGrid({
  cards,
  isLoading = false,
  skeletonCount = 4,
  columnsClassName = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  className,
}: MetricCardGridProps) {
  if (isLoading) {
    return (
      <div className={cn("grid gap-4 w-full", columnsClassName, className)}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Card key={i} className="animate-pulse h-full flex flex-col justify-between">
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
    <div className={cn("grid gap-4 w-full", columnsClassName, className)}>
      {cards.map((card) => {
        const BadgeIcon = card.badge?.icon
        const FooterIcon = card.footer?.icon

        return (
          <Card
            key={card.key}
            className="flex flex-col justify-between border-border/80 transition-shadow hover:shadow-xs"
          >
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {card.title}
                </CardDescription>
                {card.badge && (
                  <Badge
                    variant={card.badge.variant || "outline"}
                    className={cn("text-xs font-normal", card.badge.className)}
                  >
                    {BadgeIcon && <BadgeIcon className="size-3.5" />}
                    {card.badge.label}
                  </Badge>
                )}
              </div>
              <CardTitle
                className={cn(
                  "text-2xl font-bold font-mono tracking-tight pt-1",
                  card.valueClassName
                )}
              >
                {card.value}
              </CardTitle>
            </CardHeader>
            {card.footer && (
              <CardFooter
                className={cn(
                  "px-5 py-3 pt-0 text-xs text-muted-foreground border-t-0 mt-auto flex items-center gap-1.5",
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
