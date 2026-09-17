"use client"

import * as React from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
  type CardProps,
} from "@/components/ui/card"
import { StatCard, type StatCardProps } from "@/components/ui/stat-card"
import { cn } from "@/lib/utils"

export function Tile({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card p-4 md:p-6 text-card-foreground shadow-xs transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function ClickableTile({
  className,
  children,
  onClick,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border/60 bg-card p-4 md:p-6 text-card-foreground shadow-xs transition-all hover:border-border hover:bg-card/80 hover:shadow-md cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
  StatCard,
}
export type { CardProps, StatCardProps }
